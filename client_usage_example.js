const axios = require('axios');

// 1. 配置您的 AK/SK (实际使用中请勿硬编码，使用环境变量)
const AK = process.env.VOLC_AK || 'YOUR_AK_HERE';
const SK = process.env.VOLC_SK || 'YOUR_SK_HERE';
const SECURITY_TOKEN = process.env.VOLC_STS || ''; // 如果有 STS Token

// 2. 准备业务请求参数
const requestPayload = {
    req_key: "jimeng_t2i_v40",
    prompt: "一只可爱的卡通小猫",
    force_single: true
};

async function callJimengAPI() {
    try {
        console.log('1. 正在请求签名服务...');
        
        // 步骤 A: 请求本地签名服务
        const signResponse = await axios.post('http://localhost:3000/sign', {
            ak: AK,
            sk: SK,
            securityToken: SECURITY_TOKEN,
            action: 'CVSync2AsyncSubmitTask',
            version: '2022-08-31',
            body: requestPayload // 将业务 Body 传给签名服务以计算哈希
        });

        const { url, body, ...headers } = signResponse.data;

        console.log('2. 获取签名成功:');
        console.log('   URL:', url);
        console.log('   X-Date:', headers['X-Date']); // 重点检查这个
        console.log('   Authorization:', headers['Authorization']);

        if (!headers['X-Date']) {
            console.error('❌ 错误: 签名服务返回的 headers 中缺少 X-Date!');
            return;
        }

        // 步骤 B: 使用签名服务返回的 headers 和 body 调用火山引擎
        // ⚠️ 关键点：必须把 signResponse.data 中的 headers 全部带上，特别是 X-Date
        console.log('3. 正在调用火山引擎 API...');
        
        const apiResponse = await axios.post(url, body, {
            headers: {
                ...headers, // 包含 X-Date, Authorization, X-Content-Sha256 等
                'Content-Type': 'application/json' // 确保 Content-Type 一致
            }
        });

        console.log('✅ 调用成功!');
        console.log('Response:', JSON.stringify(apiResponse.data, null, 2));

    } catch (error) {
        if (error.response) {
            console.error('❌ 调用失败:', error.response.status, error.response.statusText);
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
            
            // 针对用户遇到的 "MissingRequestInfo" 错误进行分析
            if (error.response.data?.ResponseMetadata?.Error?.Code === 'MissingRequestInfo') {
                console.error('\n⚠️ 错误分析: "MissingRequestInfo" 通常表示请求头中缺少 X-Date 或 Date 字段。');
                console.error('请检查您的代码是否正确地将签名服务返回的所有 headers (特别是 X-Date) 添加到了请求中。');
            }
        } else {
            console.error('❌ 请求错误:', error.message);
        }
    }
}

// 检查是否填写了 AK/SK
if (AK === 'YOUR_AK_HERE') {
    console.error('请在代码中填写有效的 AK/SK，或者设置环境变量 VOLC_AK 和 VOLC_SK');
} else {
    callJimengAPI();
}
