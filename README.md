### 1. 迁移文件
您只需要拷贝项目中的核心代码文件， 不需要 拷贝 node_modules 文件夹（它体积很大且需要在新环境中重新安装）。

需要拷贝的文件/文件夹：

- index.js (服务入口)
- signer.js (签名核心逻辑)
- package.json (项目配置与依赖列表)
- public/ (文件夹，包含诊断页面)
- client_usage_example.js (可选，客户端调用示例)

使用：
通过http发送post如下格式：{
    "ak": "您的AccessKey",
    "sk": "您的SecretKey",
    "securityToken": "您的SessionToken", // 可选
    "action": "CVSync2AsyncSubmitTask",   // 接口 Action
    "version": "2022-08-31",              // 接口 Version
    "body": {                             // 实际业务请求体
        "req_key": "jimeng_t2i_v40",
        "prompt": "一只可爱的猫咪...",
        "scale": 0.5
    }
}会返回{
    "Host": "visual.volcengineapi.com",
    "X-Date": "20260106T150252Z",
    "X-Content-Sha256": "63e02c401caf6dacdcf3a0bc4df67c1b05831718b669435102804905b6d9848a",
    "Content-Type": "application/json",
    "Authorization": "HMAC-SHA256 Credential=...",
    "X-Security-Token": "...", // 如果请求带了 token 则返回
    "url": "https://visual.volcengineapi.com/?Action=CVSync2AsyncSubmitTask&Version=2022-08-31"
}
这些必要信息，然后构建http请求就可以正确使用火山引擎api

### 2. 在新电脑上安装环境
1. 安装 Node.js ：确保新电脑上安装了 Node.js（建议版本 v14 以上）。
2. 安装依赖 ：
   打开终端（CMD 或 PowerShell），进入拷贝后的项目目录，运行以下命令：
   ```
   npm install
   ``` 该命令会自动根据 package.json 下载并安装所有必要的依赖库（express, axios, body-parser 等）。
### 3. 启动服务
依赖安装完成后，运行以下命令启动签名服务：

```
node index.js
```
看到输出 Jimeng AI Signer Service listening at http://localhost:3000 即表示服务已成功启动。

### 4. 验证与使用
- 诊断测试 ：打开浏览器访问 http://localhost:3000 ，使用界面验证您的 AK/SK。
- 业务调用 ：您的业务代码（如之前的 Python/Java/Node 客户端）只需要确保访问的地址是新电脑的 IP:3000 端口即可。
- 当前静态参数是即梦生图的api，如果要使用其他api请在index文件中的静态文件处修改，具体参数在火山引擎的api文件中查看
