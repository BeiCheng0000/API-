# 更新日志

本项目的重要变更记录。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.0.0] - 2024-01-01

### 新增

- 基于 requests + pytest + allure 的接口自动化测试框架
- YAML / Excel 数据驱动测试支持
- 多环境配置（dev / test / staging / prod）
- Web 可视化管理界面（Flask）
  - API 列表管理与 CRUD 操作
  - 接口调试功能（支持断言）
  - 定时任务调度（APScheduler + Cron）
  - 测试执行与结果查看
  - 项目管理功能
  - 统计面板
- 定时任务持久化（重启后自动恢复）
- MySQL / MongoDB 数据库操作封装
- Allure 测试报告集成
- Jenkins CI/CD 流水线（Jenkinsfile）
- 日志系统（loguru，支持文件轮转）
- 通用工具类（数据生成、JSONPath、断言、文件操作）
- 测试数据占位符自动替换（timestamp / random_string / random_phone 等）

### 安全

- 默认环境配置为 dev，防止误操作生产环境
- 敏感信息建议通过 .env 环境变量管理
- .gitignore 排除日志、报告、数据库文件和敏感配置
