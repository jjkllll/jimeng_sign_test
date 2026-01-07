const crypto = require('crypto');

class Signer {
    constructor(config) {
        this.region = config.region || "cn-north-1";
        this.service = config.service || "cv";
        this.schema = config.schema || "https";
        this.host = config.host || "visual.volcengineapi.com";
        this.path = config.path || "/";
        this.ak = config.ak;
        this.sk = config.sk;
        this.securityToken = config.securityToken;
    }

    hashSHA256(content) {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    hmacSHA256(key, content) {
        return crypto.createHmac('sha256', key).update(content).digest();
    }

    getISOTime(date) {
        // Format: YYYYMMDD'T'HHmmss'Z'
        return date.toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';
    }

    signStringEncoder(source) {
        if (source === null) return null;
        return encodeURIComponent(source)
            .replace(/!/g, '%21')
            .replace(/'/g, '%27')
            .replace(/\(/g, '%28')
            .replace(/\)/g, '%29')
            .replace(/\*/g, '%2A');
    }

    async genSigningSecretKeyV4(secretKey, date, region, service) {
        const kDate = this.hmacSHA256(secretKey, date);
        const kRegion = this.hmacSHA256(kDate, region);
        const kService = this.hmacSHA256(kRegion, service);
        return this.hmacSHA256(kService, "request");
    }

    async sign(method, queryList, body, date, action, version, contentType) {
        if (!body) body = '';
        // If body is an object and not a buffer/string, stringify it
        if (typeof body === 'object' && !Buffer.isBuffer(body)) {
            body = JSON.stringify(body);
        }
        
        const xContentSha256 = this.hashSHA256(body);
        const xDate = this.getISOTime(date);
        const shortXDate = xDate.substring(0, 8);
        
        // Default content type if not provided
        if (!contentType) {
            contentType = "application/x-www-form-urlencoded";
        }

        const headers = {
            'host': this.host,
            'x-date': xDate,
            'x-content-sha256': xContentSha256,
            'content-type': contentType
        };

        // Sorted Query
        const realQueryList = { ...queryList };
        if (action) realQueryList['Action'] = action;
        if (version) realQueryList['Version'] = version;
        
        const sortedKeys = Object.keys(realQueryList).sort();
        let querySB = '';
        for (const key of sortedKeys) {
            querySB += `${this.signStringEncoder(key)}=${this.signStringEncoder(realQueryList[key])}&`;
        }
        if (querySB.length > 0) querySB = querySB.slice(0, -1);

        // Canonical Headers
        // Sorted by lower-case key
        const signHeaderKeys = ['content-type', 'host', 'x-content-sha256', 'x-date']; 
        const sortedSignHeaderKeys = signHeaderKeys.sort();
        
        let canonicalHeaders = '';
        let signedHeadersStr = '';
        
        for (const key of sortedSignHeaderKeys) {
            canonicalHeaders += `${key}:${headers[key]}\n`;
            signedHeadersStr += `${key};`;
        }
        signedHeadersStr = signedHeadersStr.slice(0, -1);

        const canonicalRequest = [
            method,
            this.path,
            querySB,
            canonicalHeaders, 
            signedHeadersStr,
            xContentSha256
        ].join('\n');

        // console.log('Canonical Request:\n', canonicalRequest);

        const hashCanonicalRequest = this.hashSHA256(canonicalRequest);
        const credentialScope = `${shortXDate}/${this.region}/${this.service}/request`;
        const stringToSign = [
            "HMAC-SHA256",
            xDate,
            credentialScope,
            hashCanonicalRequest
        ].join('\n');

        const signKey = await this.genSigningSecretKeyV4(this.sk, shortXDate, this.region, this.service);
        const signature = this.hmacSHA256(signKey, stringToSign).toString('hex');

        const resultHeaders = {
            'Host': this.host,
            'X-Date': xDate,
            'X-Content-Sha256': xContentSha256,
            'Content-Type': contentType,
            'Authorization': `HMAC-SHA256 Credential=${this.ak}/${credentialScope}, SignedHeaders=${signedHeadersStr}, Signature=${signature}`
        };

        if (this.securityToken) {
            resultHeaders['X-Security-Token'] = this.securityToken;
        }

        return {
            url: `${this.schema}://${this.host}${this.path}?${querySB}`,
            headers: resultHeaders,
            body: body // Return the processed body string
        };
    }
}

module.exports = Signer;
