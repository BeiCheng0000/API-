# 接口自动化测试平台

## 项目简介

这是一个基于 Python 的接口自动化测试平台，提供 **命令行测试执行** 和 **可视化 Web 管理界面** 两种使用方式。采用 requests + pytest + allure + yaml/excel + Flask + Jenkins + Git 技术栈。

### 核心特性

- 🔧 **API 接口封装**：基于 requests 的 HTTP 请求封装，支持多环境切换
- 📊 **Web 可视化管理**：通过浏览器管理测试用例、调试接口、查看统计
- ⏰ **定时任务调度**：支持 Cron 表达式的定时自动执行，任务持久化
- 📋 **数据驱动测试**：支持 YAML / Excel 两种测试数据格式
- 📈 **Allure 测试报告**：自动生成美观的测试报告
- 🔄 **CI/CD 集成**：提供 Jenkinsfile，开箱即用的持续集成配置
- 🗄️ **数据库支持**：可选的 MySQL / MongoDB 数据库操作封装

## 技术栈

| 类别 | 技术 | 说明 |
|------|------|------|
| 编程语言 | Python 3.8+ | 推荐 3.9 或 3.10 |
| HTTP 请求 | requests | 请求封装与 Session 管理 |
| 测试框架 | pytest | 测试执行与 fixture 管理 |
| 测试报告 | allure-pytest | 生成 Allure 报告 |
| 数据格式 | PyYAML / openpyxl | YAML / Excel 测试数据 |
| Web 后端 | Flask | Web 管理界面 |
| WSGI 服务器 | waitress | 生产模式部署 |
| 定时任务 | APScheduler | Cron 定时调度 |
| 日志 | loguru | 结构化日志记录 |
| 持续集成 | Jenkins | CI/CD 流水线 |
| 版本控制 | Git | 代码版本管理 |

## 项目结构

```
api_automation_platform/
├── api/                        # API 接口封装
│   ├── __init__.py
│   └── base_api.py             # 基础 API 封装类
├── common/                     # 公共模块
│   ├── __init__.py
│   ├── config_handler.py       # 配置文件处理（支持多级键）
│   ├── db_handler.py           # 数据库操作（MySQL / MongoDB）
│   ├── excel_handler.py        # Excel 文件读写
│   ├── logger_handler.py       # 日志处理（loguru）
│   ├── request_handler.py      # HTTP 请求封装（Session 复用）
│   └── yaml_handler.py         # YAML 文件读写
├── config/                     # 配置文件
│   ├── config.yaml             # 主配置文件
│   └── env.yaml                # 多环境配置（dev/test/staging/prod）
├── data/                       # 测试数据
│   ├── test_data.yaml          # YAML 格式测试数据
│   ├── projects.yaml           # 项目配置数据
│   ├── scheduler_jobs.json     # 定时任务持久化数据
│   └── statistics.json         # 测试统计数据
├── static/                     # 静态资源
│   ├── css/style.css           # 样式表
│   └── js/                     # JavaScript
│       ├── main.js             # 主逻辑
│       ├── projects.js         # 项目管理
│       └── statistics.js       # 统计图表
├── templates/                  # HTML 模板
│   ├── index.html              # 主页面
│   └── edit_modal.html         # 编辑弹窗
├── testcases/                  # 测试用例
│   ├── __init__.py
│   └── test_user_api.py        # 用户 API 测试用例
├── utils/                      # 工具类
│   ├── __init__.py
│   └── tools.py                # 通用工具（数据/JSON/文件/断言/字符串）
├── conftest.py                 # pytest 配置与 fixture
├── pytest.ini                  # pytest 配置文件
├── web_app.py                  # Web 应用主程序（Flask）
├── run_web_app.py              # Web 应用启动入口
├── run_tests.py                # 测试执行入口
├── Jenkinsfile                 # Jenkins CI/CD 流水线
├── requirements.txt            # Python 依赖包
└── .gitignore                  # Git 忽略规则
```

## 快速开始

### 1. 环境准备

**前置要求：**

- Python 3.8 或更高版本（推荐 3.9 / 3.10）
- pip 包管理器
- Git
- Allure 命令行工具（可选，用于生成测试报告）

**安装 Allure 命令行工具：**

```bash
# Windows（使用 Scoop）
scoop install allure

# macOS（使用 Homebrew）
brew install allure

# Linux
sudo apt-add-repository ppa:qameta/allure
sudo apt-get update
sudo apt-get install allure
```

### 2. 安装项目

```bash
# 克隆项目
git clone <your-repo-url>
cd api_automation_platform

# 创建虚拟环境（推荐）
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 安装依赖包
pip install -r requirements.txt
```

### 3. 配置项目

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置文件
# 1. 修改 config/config.yaml 中的环境、日志等配置
# 2. 修改 config/env.yaml 中各环境的 base_url 和认证信息
# 3. 修改 .env 中的敏感信息（数据库密码、API Token 等）
```

> ⚠️ **重要**：默认环境配置为 `dev`（开发环境），请勿直接使用 `prod` 环境运行测试。

### 4. 执行测试

```bash
# 方式一：使用启动脚本（推荐）
python run_tests.py

# 方式二：使用 pytest 命令
pytest

# 指定环境执行
python run_tests.py --env test

# 指定测试级别
python run_tests.py --level smoke

# 并行执行
python run_tests.py --parallel --workers 4

# 生成并打开 Allure 报告
python run_tests.py --report --open
```

### 5. 启动 Web 应用

```bash
# 生产模式（推荐，使用 Waitress 服务器）
python run_web_app.py

# 开发模式（支持热重载）
python run_web_app.py --dev

# 自定义端口和地址
python run_web_app.py --port 8080 --host 127.0.0.1
```

启动后访问：http://localhost:5000

> 📖 详细的 Web 应用使用说明请参考 [WEB_APP_README.md](WEB_APP_README.md)

## 配置说明

### 主配置文件（config/config.yaml）

```yaml
# 当前测试环境：dev / test / staging / prod
env:
  current: dev

# 日志配置
log:
  level: INFO           # 日志级别
  rotation: "10 MB"     # 单个日志文件大小
  retention: "30 days"  # 日志保留时间

# 数据库配置（可选，需要安装 PyMySQL 或 pymongo）
database:
  mysql:
    host: localhost
    port: 3306
    user: root
    password: ""         # ⚠️ 建议使用环境变量
    database: test_db
  mongodb:
    host: localhost
    port: 27017

# 邮件配置（可选，用于测试报告通知）
email:
  smtp_server: smtp.example.com
  smtp_port: 587
  sender: test@example.com
  password: ""           # ⚠️ 建议使用环境变量
```

### 环境配置文件（config/env.yaml）

每个环境包含以下配置项：

| 字段 | 说明 | 示例 |
|------|------|------|
| `base_url` | 接口基础 URL | `https://api.example.com` |
| `timeout` | 请求超时时间（秒） | `30` |
| `headers` | 默认请求头 | `Content-Type: application/json` |
| `auth.type` | 认证类型 | `bearer` / `basic` / `none` |
| `auth.token` | 认证令牌 | ⚠️ 建议使用环境变量 |

### 环境变量（.env）

通过 `.env` 文件管理敏感信息，避免将密码和 Token 提交到代码仓库：

```bash
# 数据库密码
DB_PASSWORD=your_db_password

# API 认证 Token
API_TOKEN=your_api_token

# 邮件密码
EMAIL_PASSWORD=your_email_password

# Flask Secret Key（Web 应用）
FLASK_SECRET_KEY=your_random_secret_key
```

## Web 应用功能

Web 管理界面提供以下功能：

| 功能 | 说明 |
|------|------|
| API 列表管理 | 查看、编辑、删除所有 API 测试用例 |
| 新增测试接口 | 通过表单添加新的 API 测试用例 |
| 接口调试 | 单独调试接口，查看响应结果和断言 |
| 定时任务 | 设置 Cron 定时任务，自动执行测试（支持持久化） |
| 执行测试 | 一键执行单个或批量测试用例 |
| 统计面板 | 查看测试执行历史和统计数据 |
| 项目管理 | 多项目测试用例分组管理 |

> 📖 详细使用说明请参考 [WEB_APP_README.md](WEB_APP_README.md)

## 测试数据

支持两种格式的测试数据：

### YAML 格式（推荐）

编辑 `data/test_data.yaml`，支持以下占位符自动替换：

| 占位符 | 说明 | 替换示例 |
|--------|------|----------|
| `${timestamp}` | 当前时间戳 | `1631234567` |
| `${random_string}` | 随机字符串 | `aB3xY9mK2p` |
| `${random_number}` | 随机数字 | `42` |
| `${random_phone}` | 随机手机号 | `13812345678` |
| `${random_email}` | 随机邮箱 | `aB3xY9mK@example.com` |

### Excel 格式

需要手动创建 `.xlsx` 文件，详见 [data/README.md](data/README.md)。

## Jenkins 集成

项目提供了开箱即用的 `Jenkinsfile`，包含以下流水线阶段：

1. **检出代码** — 从 Git 仓库拉取代码
2. **安装依赖** — 安装 Python 依赖包
3. **执行测试** — 运行自动化测试
4. **生成报告** — 生成 Allure 测试报告

**使用步骤：**

1. 安装 Jenkins 并安装 [Allure Jenkins Plugin](https://plugins.jenkins.io/allure-jenkins-plugin/)
2. 创建 Pipeline 任务，配置 SCM 指向你的 Git 仓库
3. 修改 `Jenkinsfile` 中的以下配置：
   - `PYTHON_HOME`：Python 安装路径
   - Git 仓库 URL
   - 邮件通知地址
4. 运行流水线

## 测试标记

项目预定义了以下 pytest 标记，可在测试用例中使用：

| 标记 | 说明 | 使用示例 |
|------|------|----------|
| `smoke` | 冒烟测试 | `@pytest.mark.smoke` |
| `regression` | 回归测试 | `@pytest.mark.regression` |
| `api` | 接口测试 | `@pytest.mark.api` |
| `critical` | 关键测试 | `@pytest.mark.critical` |
| `high` | 高优先级 | `@pytest.mark.high` |
| `medium` | 中优先级 | `@pytest.mark.medium` |
| `low` | 低优先级 | `@pytest.mark.low` |

```bash
# 只运行冒烟测试
python run_tests.py --level smoke

# 使用 pytest 标记
pytest -m smoke
pytest -m "critical or high"
```

## 常见问题

### Q: 启动 Web 应用时端口被占用怎么办？

```bash
# 指定其他端口
python run_web_app.py --port 8080

# Windows 查看端口占用
netstat -ano | findstr :5000

# macOS/Linux 查看端口占用
lsof -i :5000
```

### Q: 安装依赖时出错怎么办？

```bash
# 升级 pip
python -m pip install --upgrade pip

# 使用国内镜像源
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### Q: Allure 报告生成失败？

确保已安装 Allure 命令行工具：
```bash
allure --version
```

### Q: 定时任务在 Web 应用重启后还会执行吗？

是的，定时任务会持久化到 `data/scheduler_jobs.json`，Web 应用重启后自动恢复。

### Q: 如何添加新的测试用例？

1. 在 `data/test_data.yaml` 中添加测试数据
2. 或通过 Web 界面"添加 API"功能添加
3. 在 `testcases/` 目录下编写 pytest 测试函数

## 贡献指南

欢迎贡献代码！请遵循以下流程：

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 提交更改：`git commit -m "feat: 添加新功能"`
4. 推送分支：`git push origin feature/your-feature`
5. 创建 Pull Request

**提交信息规范：**

| 前缀 | 说明 |
|------|------|
| `feat:` | 新功能 |
| `fix:` | 修复 Bug |
| `docs:` | 文档更新 |
| `style:` | 代码格式调整 |
| `refactor:` | 代码重构 |
| `test:` | 测试相关 |
| `chore:` | 构建/工具变更 |

## 许可证

本项目仅供学习和内部使用。如需商业使用，请联系项目维护者。
