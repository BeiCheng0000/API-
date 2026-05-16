# 系统架构说明

## 整体架构

```
┌─────────────────────────────────────────────────────┐
│                    用户入口                          │
├────────────────────┬────────────────────────────────┤
│   命令行（CLI）     │      Web 浏览器               │
│   run_tests.py     │      http://localhost:5000     │
└────────┬───────────┴──────────────┬─────────────────┘
         │                          │
         ▼                          ▼
┌────────────────┐    ┌─────────────────────────────┐
│   pytest 框架   │    │     Flask Web 应用           │
│   + conftest   │    │     web_app.py               │
│   + fixtures   │    │     + APScheduler 定时任务    │
└───────┬────────┘    └──────────────┬──────────────┘
        │                            │
        ▼                            ▼
┌─────────────────────────────────────────────────────┐
│                  公共模块层（common）                 │
├──────────┬──────────┬──────────┬───────────────────┤
│ request  │ config   │ yaml     │ excel             │
│ handler  │ handler  │ handler  │ handler           │
├──────────┴──────────┴──────────┴───────────────────┤
│              logger_handler（loguru）                │
└───────────────────────┬────────────────────────────┘
                        │
         ┌──────────────┼──────────────┐
         ▼              ▼              ▼
┌─────────────┐ ┌──────────────┐ ┌──────────────┐
│  API 层      │ │  数据层       │ │  工具层       │
│  base_api   │ │  YAML/Excel  │ │  tools.py    │
│  封装       │ │  JSON/DB     │ │  数据生成     │
└──────┬──────┘ └──────────────┘ └──────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│         目标 API 服务                │
│  (dev/test/staging/prod)            │
└─────────────────────────────────────┘
```

## 模块依赖关系

```
testcases/          ← 测试用例（依赖 conftest 和 api）
  └── conftest.py   ← pytest fixture（依赖 api 和 utils）
        └── api/    ← API 封装（依赖 common）
              └── common/  ← 公共模块（无外部依赖）
                    └── utils/  ← 工具类（依赖 common.logger）

web_app.py          ← Web 应用（依赖 api 和 common）
  └── api/          ← API 封装
  └── common/       ← 公共模块
```

## 核心模块说明

### 1. common/ — 公共模块

| 模块 | 职责 | 关键类/函数 |
|------|------|------------|
| `config_handler.py` | 配置文件读取，支持多级键（如 `env.current`） | `ConfigHandler`, `EnvConfigHandler` |
| `request_handler.py` | HTTP 请求封装，Session 复用，自动拼接 base_url | `RequestHandler` |
| `yaml_handler.py` | YAML 文件读写 | `YamlHandler` |
| `excel_handler.py` | Excel 文件读写（基于 pandas） | `ExcelHandler` |
| `db_handler.py` | MySQL / MongoDB 数据库操作 | `MySQLHandler`, `MongoDBHandler` |
| `logger_handler.py` | 日志处理（loguru），控制台 + 文件双输出 | `logger`, `get_logger()` |

### 2. api/ — API 封装层

| 模块 | 职责 |
|------|------|
| `base_api.py` | 基础 API 类，封装 GET/POST/PUT/DELETE，统一响应处理 |

**使用方式**：继承 `BaseAPI` 创建业务 API 类

```python
from api.base_api import BaseAPI

class UserAPI(BaseAPI):
    def login(self, username, password):
        return self.post("/user/login", json={"username": username, "password": password})

    def get_info(self, user_id):
        return self.get(f"/user/{user_id}")
```

### 3. utils/ — 工具层

| 类 | 职责 | 常用方法 |
|----|------|----------|
| `DataUtils` | 随机数据生成 | `get_random_string()`, `get_random_phone()`, `get_random_email()` |
| `JsonUtils` | JSON 数据提取（JSONPath） | `get_value()`, `get_values()` |
| `FileUtils` | 文件操作 | `ensure_dir()`, `get_file_size()` |
| `AssertUtils` | 断言工具 | `assert_equals()`, `assert_contains()`, `assert_true()` |
| `StringUtils` | 字符串判断 | `is_empty()`, `is_not_empty()` |

### 4. web_app.py — Web 应用

Flask 应用，提供以下核心功能：

- **测试数据管理**：读写 `data/test_data.yaml`
- **接口调试**：通过全局 HTTP Session 发送请求
- **定时任务**：APScheduler + CronTrigger，持久化到 `data/scheduler_jobs.json`
- **统计数据**：记录到 `data/statistics.json`
- **项目管理**：配置存储在 `data/projects.yaml`

### 5. conftest.py — pytest 配置

| Fixture | 作用域 | 说明 |
|---------|--------|------|
| `setup_env` | session | 测试环境初始化，打印环境信息 |
| `api_client` | function | 提供已初始化的 `BaseAPI` 实例 |
| `test_data` | function | 获取测试函数关联的测试数据 |

**命令行选项**：
- `--env`：指定测试环境（dev/test/staging/prod）
- `--level`：指定测试级别（smoke/regression/all）

## 数据流

### 测试执行流程

```
1. 读取 config/config.yaml → 获取当前环境
2. 读取 config/env.yaml → 获取 base_url、timeout、headers
3. 读取 data/test_data.yaml → 获取测试数据
4. 替换占位符（${timestamp} 等）
5. 通过 RequestHandler 发送 HTTP 请求
6. 收集响应 → 断言验证
7. 生成 Allure 报告
```

### Web 应用数据流

```
1. 用户操作 → Flask 路由
2. 路由处理 → 读取/写入数据文件（YAML/JSON）
3. 接口调试 → 全局 HTTP Session → 目标 API
4. 定时任务 → APScheduler → CronTrigger → 执行测试
5. 任务持久化 → scheduler_jobs.json（启动时恢复）
```

## 配置加载顺序

1. `config/config.yaml` — 主配置（环境、日志、数据库、邮件）
2. `config/env.yaml` — 环境配置（base_url、timeout、headers、auth）
3. `.env` — 环境变量（敏感信息，优先级最高）

## 扩展指南

### 添加新的 API 测试模块

1. 在 `api/` 下创建新的 API 类，继承 `BaseAPI`
2. 在 `data/test_data.yaml` 中添加测试数据
3. 在 `testcases/` 下创建测试文件，使用 `api_client` fixture

### 添加新的数据源

1. 在 `common/` 下创建新的 handler 类
2. 实现 `read()` 和 `write()` 方法
3. 在 `conftest.py` 中注册 fixture

### 添加 Web 应用功能

1. 在 `web_app.py` 中添加路由
2. 在 `templates/` 中添加或修改 HTML 模板
3. 在 `static/js/` 中添加前端逻辑
4. 更新 `WEB_APP_README.md` 中的 API 端点文档
