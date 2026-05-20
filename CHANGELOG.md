# 更新日志

本项目的重要变更记录。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.3.0] - 2025-05-20

### 新增

- 统计数据备份与恢复功能
- 统计数据导出（JSON格式）
- 环境管理 API（切换、保存、删除环境配置）
- 变量管理 API（增删改查、批量保存）
- 模块级批量执行测试
- 数据库自动迁移（timestamp、error 字段）
- 统计面板增强（项目/模块维度统计）

### 改进

- db_handler.py 重构：提取 `_create_connection()` 方法，消除4处重复代码
- web_app.py 添加文件结构导航文档
- config.yaml 添加详细注释，移除硬编码密码
- env.yaml 生产环境地址替换为占位符，防止泄露
- WEB_APP_README.md 添加 API 请求/响应示例和错误码说明
- CHANGELOG.md 更新为真实版本记录

### 安全

- config.yaml 默认环境从 prod 修正为 dev
- 移除 MySQL 密码硬编码（'123456' → 环境变量）
- 生产环境 base_url 替换为占位符

---

## [1.2.0] - 2025-03-15

### 新增

- 项目管理功能（多项目分组管理）
- 模块管理（项目下的模块增删改查）
- API 管理（模块下的接口增删改查）
- 定时任务更新 API
- 断言结果持久化到数据库

### 改进

- 定时任务持久化从 JSON 文件迁移到数据库
- 统计数据从 JSON 文件迁移到数据库
- 接口调试支持自定义断言配置
- Web 界面优化（Bootstrap 5 样式升级）

---

## [1.1.0] - 2024-09-10

### 新增

- 统计面板（测试执行历史和趋势图）
- 接口调试断言功能（状态码断言 + 响应数据断言）
- 全局 HTTP Session 复用（减少 TCP 连接开销）
- Waitress 生产模式部署支持

### 改进

- Web 应用启动入口独立为 run_web_app.py
- 日志系统优化（控制台 + 文件双输出）
- 定时任务 Cron 表达式解析增强

---

## [1.0.0] - 2024-06-01

### 新增

- 基于 requests + pytest + allure 的接口自动化测试框架
- YAML / Excel 数据驱动测试支持
- 多环境配置（dev / test / staging / prod）
- Web 可视化管理界面（Flask）
  - API 列表管理与 CRUD 操作
  - 接口调试功能（支持断言）
  - 定时任务调度（APScheduler + Cron）
  - 测试执行与结果查看
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
