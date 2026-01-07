const express = require('express');
const bodyParser = require('body-parser');
const Signer = require('./signer');

const axios = require('axios');

const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/sign', async (req, res) => {
    try {
        const {
            ak,
            sk,
            region = 'cn-north-1',
            service = 'cv',
            host = 'visual.volcengineapi.com',
            path = '/',
            method = 'POST',
            query = {},
            body = {},
            action = '',
            version = '',
            contentType = 'application/json',
            securityToken,
            sessionToken,
            st
        } = req.body;

        if (!ak || !sk) {
            return res.status(400).json({ error: 'AccessKey (ak) and SecretKey (sk) are required.' });
        }

        const signer = new Signer({
            region,
            service,
            host,
            path,
            ak,
            sk,
            securityToken: securityToken || sessionToken || st
        });

        // Use current date
        const date = new Date();

        const result = await signer.sign(
            method,
            query,
            body,
            date,
            action,
            version,
            contentType
        );

        res.json({
            ...result.headers,
            url: result.url,
            body: result.body // Return the body used for signing
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Diagnostic endpoint
app.post('/debug-invoke', async (req, res) => {
    const steps = [];
    try {
        const { ak, sk, securityToken, body, action, version } = req.body;
        
        // 1. Sign
        steps.push({ message: '开始计算签名...', type: 'info' });
        const signer = new Signer({
            ak, sk, securityToken,
            region: 'cn-north-1',
            service: 'cv',
            host: 'visual.volcengineapi.com'
        });

        const date = new Date();
        // Force application/json for this specific debug endpoint as it is for Jimeng API
        const contentType = 'application/json';
        const signResult = await signer.sign('POST', {}, body, date, action, version, contentType);
        
        steps.push({ 
            message: '签名计算完成', 
            type: 'info',
            detail: {
                url: signResult.url,
                headers: signResult.headers,
                bodyHash: signResult.headers['X-Content-Sha256']
            }
        });

        // 2. Invoke
        steps.push({ message: '正在发送请求到火山引擎...', type: 'info' });
        
        const response = await axios.post(signResult.url, signResult.body, {
            headers: {
                ...signResult.headers,
                'Content-Type': 'application/json'
            },
            transformRequest: [(data) => data], // Prevent re-serialization
            validateStatus: () => true // Resolve promise for all status codes
        });

        steps.push({
            message: `收到响应: ${response.status} ${response.statusText}`,
            type: response.status === 200 ? 'success' : 'error',
            detail: response.data
        });

        const isSuccess = response.status === 200 && response.data.code === 10000;
        
        res.json({
            success: isSuccess,
            steps,
            error: response.data?.ResponseMetadata?.Error
        });

    } catch (error) {
        steps.push({ message: `内部错误: ${error.message}`, type: 'error' });
        res.json({ success: false, steps });
    }
});

// Also support GET for simple testing if needed, but POST is better for passing AK/SK securely
app.get('/', (req, res) => {
    res.send('Jimeng AI Signer Service is running. Use POST /sign to get signature.');
});

app.listen(port, () => {
    console.log(`Jimeng AI Signer Service listening at http://localhost:${port}`);
});
