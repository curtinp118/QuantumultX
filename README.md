# Quantumult X 配置库

Quantumult X 公开配置，主配置位于 [`profile/QX_Config.conf`](profile/QX_Config.conf)。
> 脚本统一在 [curtinp118/Scripthub](https://github.com/curtinp118/Scripthub) 管理，本仓库通过 `.conf` 文件远程引用。

## 📱 配置预览

| 策略列表 | 策略列表 |
| :---: | :---: |
| <img src="https://cdn.jsdelivr.net/gh/curtinp118/QuantumultX@main/icons/home1.jpeg" width="360" /> | <img src="https://cdn.jsdelivr.net/gh/curtinp118/QuantumultX@main/icons/home2.jpeg" width="360" /> |





## 🚀 快速开始

### 1. 导入配置

在 Quantumult X 中：

1. 点击「配置」
2. 选择「下载」或「从文件导入」
3. 复制以下地址：
   ```
   https://raw.githubusercontent.com/curtinp118/QuantumultX/refs/heads/main/profile/QX_Config.conf
   ```
   CDN配置链接：
   ```
   https://cdn.jsdelivr.net/gh/curtinp118/QuantumultX@main/profile/QX_Config.conf
   ```
### 2. 配置订阅

编辑 `[server_remote]` 部分添加你的机场订阅链接。

如需订阅服务，可参考上方「机场推荐」，建议先试用再按需购买。

### 3. MITM 证书

Google 重定向及部分远程重写需要 MITM 证书：

1. 在 Quantumult X 中开启 MITM
2. 安装并信任证书
3. 按需配置对应的 hostname

公开配置仅保留证书占位符，请勿上传本地生成的 `passphrase` 与 `p12`。

## ✨ 主要特性
- **内置公益订阅**：内置公益多地区节点订阅 长期维护更新
### 🔧 完整配置

- **智能分流**：国内直连、国外代理、流媒体、社交等智能分类
- **地区策略**：香港、台湾、日本、新加坡、美国、韩国、英国节点自动优选
- **策略优选**：支持手动选择、延迟测试、美国节点目标地址哈希
- **DNS**：使用阿里 DNS 与腾讯 DNS 的 DoH 服务，支持优先尝试 DoH3
- **IPv6 控制**：默认禁用 AAAA 解析，降低双栈环境下的分流偏差
- **网络兼容**：预设 DNS 排除域名、UDP 白名单及私有地址绕行规则

### 📋 规则集成

- **国内直连**：Apple、微信、国内媒体、ChinaMax 与常用金融服务
- **国际服务**：Google、Microsoft、PayPal、Telegram、X、数字货币服务等独立策略
- **流媒体与游戏**：Netflix、YouTube、Spotify、Steam、Epic、Sony、Nintendo
- **广告拦截**：AWAvenue 与 Advertising 规则统一交由 `Ads` 策略处理

### 🔄 重写规则

- BoxJS
- YouTube 字幕
- YouTube 去广告
- Spotify 增强

### 🧰 手动检测

- 流媒体解锁查询
- GeoIP 与网络信息查询
- 节点纯净度、IP 质量及阻断检测

## 📜 脚本列表

所有脚本统一在 [Scripthub](https://github.com/curtinp118/Scripthub) 管理，支持 QX / Loon / Surge 三端。

### 签到类

| 脚本 | 功能 | 使用方法 |
|------|------|----------|
| `new-api.js` | NewAPI 中转站通用签到 | 先抓包保存 `/api/user/self` 的 Cookie，支持多站点多账户 |
| `v2ex.js` | V2EX 每日签到 | 访问 V2EX 个人主页保存 Cookie |
| `glados.js` | GLaDOS / Railgun 签到 + 积分兑换 | 访问控制台抓包保存 Cookie，支持多域名多账户 |
| `cd-rail.js` | 成都地铁签到 | 打开成都地铁 App 签到页面保存请求头 |
| `cmcc.js` | 中国移动签到 | 打开移动 App 签到页面保存 Cookie |
| `nodeseek.js` | NodeSeek 论坛签到 | 访问 NodeSeek 个人页面保存请求头 |

### 解锁类

| 脚本 | 功能 | 说明 |
|------|------|------|
| `buding.js` | 布丁锁屏解锁 | 需要 MITM |
| `caiyun.js` | 彩云天气解锁 | 需要 MITM |
| `nicegram.js` | Nicegram 解锁 | 需要 MITM |
| `dreamface.js` | DreamFace 解锁 | 需要 MITM |
| `notability.js` | Notability 解锁 | 需要 MITM |
| `dandanvip.js` | 蛋蛋不语 VIP | 需要 MITM |



## 🌐 策略说明

| 策略 | 用途 | 节点选择 |
|------|------|----------|
| `Global` | 国际流量兜底 | `proxy`、七个地区优选、`Other`、`direct` |
| `Apple` | 港区 App Store 与 Apple 商店接口 | 香港优选、直连、Global |
| `AI` | AI 与 Apple Intelligence | 美国目标哈希、美国/新加坡/日本/香港、`Global`、`Other` |
| `Google` | Google 服务 | 新加坡/美国/日本/香港、`AI`、`Global` |
| `Microsoft` | Microsoft 服务 | 美国/新加坡/香港/日本/台湾/韩国、`Global` |
| `YouTube` | YouTube | 香港/台湾/日本/新加坡/美国/韩国、`Global` |
| `X` | Twitter/X | `Global`、美国/新加坡/日本/香港/台湾/韩国 |
| `Telegram` | Telegram | 新加坡/香港/美国/日本/台湾、`Global` |
| `PayPal` | PayPal | 美国/英国、`Global`、直连及其他地区优选 |
| `Netflix` | Netflix | 新加坡/日本/香港/台湾/美国/英国/韩国、`Global` |
| `Spotify` | Spotify | 新加坡/美国/香港/日本、`Global` |
| `Media` | 全球流媒体 | 七个地区优选、`Global`、直连 |
| `Game` | 游戏平台 | 香港/新加坡/日本/美国、`Global`、直连 |
| `Crypto` | 币安、OKX 及其他数字货币服务 | 美国/新加坡/英国/香港/日本、`Global`、`Other` |
| `HK/TW/JP/SG/US/KR/UK Fast` | 地区节点自动优选 | 按节点名称正则匹配并定期测速 |
| `US Dest-hash` | 美国节点会话保持 | 按目标地址稳定选择美国节点 |
| `Other` | 其他可用节点 | 排除地区、套餐、流量与客服类节点名称 |
| `Ads` | 广告规则 | 拒绝或直连 |

## 🔐 隐私与安全

本仓库中的 `QX_Config.conf` 为公开配置：
- ✅ 所有规则和脚本链接都是公开的
- ✅ 节点地址、订阅 URL 和 MITM 证书均使用注释占位符
- ✅ 个人订阅 Token、节点密码、Cookie 与请求头仅保存在本地
- ✅ 主配置不绑定设备 ID，也不包含自动签到任务

## 🤝 特别鸣谢


- [iOS 规则脚本库 - blackmatrix7](https://github.com/blackmatrix7/ios_rule_script)
- [资源解析与脚本 - KOP-XIAO](https://github.com/KOP-XIAO/QuantumultX)
- [广告规则 - AWAvenue](https://github.com/TG-Twilight/AWAvenue-Ads-Rule)
- [YouTube 重写 - ZenmoFeiShi/Qx](https://github.com/ZenmoFeiShi/Qx)
- [Spotify 重写 - app2smile/rules](https://github.com/app2smile/rules)

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

本项目采用 MIT License 开源许可证。详见 [LICENSE](LICENSE) 文件。

## ⚠️ 免责声明

本仓库提供的配置和脚本仅供学习参考使用，用户需自行承担使用本配置的一切后果。

---

**最后更新**: 2026-09-05
