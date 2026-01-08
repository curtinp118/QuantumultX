# Quantumult X 个人配置库

为 Quantumult X 提供优化配置、分流规则和实用脚本的个人仓库。提供开箱即用的配置方案，同时支持灵活的自定义修改。

## 📋 项目结构

- **[profile/](profile/)** - 核心配置文件
  - `QX_Config.conf` - 完整的 Quantumult X 配置模板，包含通用设置、DNS 配置和策略组定义
  
- **[scripts/](scripts/)** - 实用脚本集合
  - 各类应用辅助脚本，如广告拦截、功能增强等

- **[rewrite/](rewrite/)** - 重写规则目录
    - 各类应用的重写规则文件
- **[rules/](rules/)** - 分流规则目录
    - 各类分流规则文件

## 🚀 快速开始

### 1. 导入配置文件

**方式一：URL 导入（推荐）**
- 在 Quantumult X 中打开设置 → 配置文件
- 点击「下载」
- 粘贴配置文件的 Raw 链接或本地路径 [长按复制连接](https://raw.githubusercontent.com/curtinp118/QuantumultX/refs/heads/main/profile/QX_Config.conf)
- 确认下载并应用

**方式二：手动导入**
- 复制 [profile/QX_Config.conf](profile/QX_Config.conf) 的完整内容
- 在 Quantumult X 中粘贴至相应配置栏
- 保存并应用

### 2. 配置订阅地址

编辑导入的配置文件，根据需要修改或添加：
- 节点订阅地址
- 分流规则订阅
- 重写规则订阅


## ⚠️ 重要声明

- 本仓库包含的部分脚本用于修改应用响应数据，**仅供个人学习和测试使用**
- 使用这些脚本可能违反相关应用的服务条款，**使用者需自行承担所有法律责任**
- 不建议在生产环境或关键账户上使用这些脚本
- 作者不对使用本仓库资源所产生的任何后果负责


## 🤝 使用建议

- 定期检查配置文件和脚本的更新
- 根据实际网络环境调整 DNS 服务器和节点选择
- 谨慎启用修改响应的脚本，避免影响账户安全
- 在更新前备份现有配置

## 📄 许可证

本项目采用 [GNU General Public License v3.0](LICENSE) 许可证。详见 [LICENSE](LICENSE) 文件。

---

**最后更新：2026年1月8日**
