# API自动化测试平台 - Web应用使用说明

## 概述

API自动化测试平台新增了可视浏览器操作功能，允许用户通过Web界面管理API测试用例、调试接口和设置定时任务。

## 功能特性

1. **API列表管理**：查看和管理所有API测试用例
2. **新增测试接口**：通过Web界面添加新的API测试用例到测试数据
3. **接口调试**：单独调试接口，查看响应结果
4. **定时任务**：设置定时任务，自动执行指定的接口测试

## 安装依赖

```bash
pip install -r requirements.txt
```

## 启动Web应用

**重要提示**：请使用以下方式启动Web应用，不要使用Pytest运行web_app.py

### 方法1：使用启动脚本（推荐）

```bash
python run_web_app.py
```

### 方法2：直接运行web_app.py

```bash
python web_app.py
```

### 在PyCharm中运行

1. 右键点击 `run_web_app.py` 文件
2. 选择 "Run 'run_web_app'"

启动后，在浏览器中访问：http://localhost:5000

### 注意事项

- 不要使用Pytest运行web_app.py，因为它是一个Flask应用程序，不是测试文件
- 如果您在PyCharm中直接运行web_app.py，请确保运行方式是"Run"而不是"Run pytest in..."

## 功能使用指南

### 1. API列表管理

- 在首页左侧可以看到所有API测试用例，按API名称分组显示
- 每个API下可以有多个测试用例
- 点击API名称可以展开/折叠该API下的所有测试用例

### 2. 新增测试接口

1. 滚动到页面下方的"添加API"区域
2. 填写以下信息：
   - API名称：例如 "login"
   - 用例名称：例如 "正常登录"
   - URL：例如 "/user/login"
   - 请求方法：选择 GET、POST、PUT 或 DELETE
   - 请求头：JSON格式的请求头，例如 `{"Content-Type": "application/json"}`
   - 请求数据：JSON格式的请求数据，例如 `{"username": "testuser", "password": "123456"}`
   - 期望结果：JSON格式的期望结果，例如 `{"status_code": 200, "code": 0, "message": "登录成功"}`
3. 点击"添加API"按钮

### 3. 接口调试

1. 从API列表中选择要调试的接口，点击"调试"按钮
2. 接口信息会自动填充到"API调试"区域
3. 可以根据需要修改接口信息
4. 在"断言配置"区域添加断言：
   - 点击"添加断言"按钮添加新的断言项
   - 选择断言类型（状态码或响应数据）
   - 输入字段名（仅响应数据类型需要）
   - 输入期望值
   - 点击删除按钮移除不需要的断言项
   - 最多可以添加10个断言项
5. 点击"发送请求"按钮
6. 查看响应结果，包括：
   - 响应时间
   - 状态码
   - 响应数据
   - 断言结果（如果添加了断言）

**断言说明**：
- 系统会自动将实际响应结果与期望值进行比较
- 支持的断言类型：
  - 状态码断言：验证HTTP状态码是否符合预期
  - 响应数据断言：验证响应数据中的字段值是否符合预期
- 断言结果会以表格形式显示，包括类型、字段、期望值、实际值和结果
- 支持的断言数量：最多10个

### 4. 定时任务

1. 从API列表中选择要设置定时的接口，点击"定时"按钮
2. 在弹出的对话框中填写Cron表达式，例如：
   - `0 0 * * *`：每天午夜执行
   - `0 9 * * 1-5`：工作日上午9点执行
   - `0 */2 * * *`：每2小时执行一次
3. 点击"添加"按钮
4. 在"定时任务"区域可以查看所有已设置的定时任务
5. 点击"删除"按钮可以删除定时任务

### 5. 执行测试

1. 从API列表中选择要执行的接口，点击"执行"按钮
2. 系统会执行该接口测试，并显示执行结果

### 6. 删除接口

1. 从API列表中选择要删除的接口，点击"删除"按钮
2. 确认删除操作

## Cron表达式说明

Cron表达式由5个字段组成，分别表示：分、时、日、月、周

```
* * * * *
│ │ │ │ │
│ │ │ │ └─ 星期几 (0-6, 0表示周日)
│ │ │ └─── 月份 (1-12)
│ │ └───── 日期 (1-31)
│ └─────── 小时 (0-23)
└───────── 分钟 (0-59)
```

常用示例：
- `0 0 * * *`：每天午夜执行
- `0 9 * * 1-5`：工作日上午9点执行
- `0 */2 * * *`：每2小时执行一次
- `0 0 1 * *`：每月1号午夜执行
- `0 12 * * 0`：每周日中午12点执行

## API 端点文档

Web 应用提供以下 REST API 端点：

### 页面路由

| 路由 | 方法 | 说明 |
|------|------|------|
| `/` | GET | 主页面 |
| `/projects` | GET | 项目管理页面 |
| `/statistics` | GET | 统计面板页面 |

### 测试数据 API

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/test-data` | GET | 获取所有测试数据 |
| `/api/test-data/<project>` | GET | 获取指定项目的测试数据 |
| `/api/add-case` | POST | 添加测试用例 |
| `/api/update-case` | POST | 更新测试用例 |
| `/api/delete-case` | POST | 删除测试用例 |

### 接口调试 API

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/debug` | POST | 调试接口（发送请求并返回响应） |
| `/api/execute/<project>/<module>/<index>` | POST | 执行指定测试用例 |

### 定时任务 API

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/scheduler/jobs` | GET | 获取所有定时任务 |
| `/api/scheduler/add` | POST | 添加定时任务 |
| `/api/scheduler/delete/<job_id>` | POST | 删除定时任务 |

### 项目管理 API

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/projects` | GET | 获取所有项目 |
| `/api/projects` | POST | 创建项目 |
| `/api/projects/<name>` | PUT | 更新项目 |
| `/api/projects/<name>` | DELETE | 删除项目 |

### 统计 API

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/statistics` | GET | 获取统计数据 |
| `/api/statistics/summary` | GET | 获取统计摘要 |

> 💡 所有 API 均返回 JSON 格式数据。POST 请求的参数通过请求体（JSON）传递。

### API 请求/响应示例

#### 添加测试用例

```bash
POST /api/add
Content-Type: application/json
```

**请求体：**
```json
{
  "project": "默认项目",
  "module": "login",
  "case_name": "正常登录",
  "url": "/user/login",
  "method": "POST",
  "headers": {"Content-Type": "application/json"},
  "data": {"username": "testuser", "password": "123456"},
  "expected": {"status_code": 200, "code": 0, "message": "登录成功"}
}
```

**成功响应（200）：**
```json
{"success": true, "message": "添加成功"}
```

**失败响应（400）：**
```json
{"success": false, "message": "用例名称不能为空"}
```

#### 调试接口

```bash
POST /api/debug
Content-Type: application/json
```

**请求体：**
```json
{
  "url": "/user/login",
  "method": "POST",
  "headers": {"Content-Type": "application/json"},
  "data": {"username": "testuser", "password": "123456"},
  "assertions": [
    {"type": "status_code", "expected": "200"},
    {"type": "response", "field": "code", "expected": "0"}
  ]
}
```

**成功响应（200）：**
```json
{
  "success": true,
  "status_code": 200,
  "response_time": 156.3,
  "response_data": {"code": 0, "message": "登录成功", "data": {...}},
  "assertion_results": [
    {"type": "status_code", "expected": "200", "actual": "200", "passed": true},
    {"type": "response", "field": "code", "expected": "0", "actual": 0, "passed": true}
  ]
}
```

#### 添加定时任务

```bash
POST /scheduler/add
Content-Type: application/json
```

**请求体：**
```json
{
  "project": "默认项目",
  "module": "login",
  "case_index": 0,
  "cron_expression": "0 9 * * 1-5"
}
```

**成功响应（200）：**
```json
{"success": true, "message": "定时任务添加成功", "job_id": "abc123"}
```

#### 获取统计数据

```bash
GET /statistics/list?project=默认项目&page=1&page_size=20
```

**成功响应（200）：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "project": "默认项目",
      "module": "login",
      "case_name": "正常登录",
      "method": "POST",
      "status_code": 200,
      "response_time": 156.3,
      "assertion_passed": true,
      "created_at": "2024-01-15 10:30:00"
    }
  ],
  "total": 100,
  "page": 1,
  "page_size": 20
}
```

### 通用错误响应

| HTTP状态码 | 含义 | 示例 |
|-----------|------|------|
| 200 | 请求成功 | `{"success": true, ...}` |
| 400 | 请求参数错误 | `{"success": false, "message": "参数不能为空"}` |
| 404 | 资源不存在 | `{"success": false, "message": "项目不存在"}` |
| 500 | 服务器内部错误 | `{"success": false, "message": "内部错误"}` |

## 数据文件说明

| 文件 | 说明 | 自动创建 |
|------|------|----------|
| `data/test_data.yaml` | 测试用例数据 | 是 |
| `data/projects.yaml` | 项目配置数据 | 是 |
| `data/scheduler_jobs.json` | 定时任务持久化数据 | 是 |
| `data/statistics.json` | 测试执行统计数据 | 是 |

## 注意事项

1. 确保在启动 Web 应用前已安装所有依赖
2. Web 应用默认监听 5000 端口，如果端口被占用，请使用命令行参数修改：
   ```bash
   python run_web_app.py --port 8080
   ```
3. 定时任务会持久化到 `data/scheduler_jobs.json`，Web 应用重启后会自动恢复已保存的定时任务
4. 测试数据保存在 `data/test_data.yaml` 文件中，可以直接编辑该文件
5. 请求头和请求数据必须是有效的 JSON 格式
6. 生产环境建议修改 `web_app.py` 中的 `secret_key`，或通过环境变量 `FLASK_SECRET_KEY` 设置

## 技术栈

- 后端：Flask（开发模式）/ Waitress（生产模式）
- 前端：HTML5, Bootstrap 5, JavaScript
- 定时任务：APScheduler（支持持久化）
- 数据存储：YAML / JSON 文件
