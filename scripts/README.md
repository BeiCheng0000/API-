
# 数据库初始化脚本使用说明

## 概述

本目录包含数据库初始化脚本 `init_database.py`，用于创建MySQL数据库、表结构，并将 `data` 目录中的数据导入到数据库中。

## 功能

1. **创建数据库**：自动创建配置文件中指定的MySQL数据库
2. **创建表结构**：创建以下表：
   - `projects` - 项目表
   - `modules` - 模块表
   - `apis` - API表
   - `environments` - 环境表
   - `variables` - 变量表
   - `scheduler_jobs` - 定时任务表
   - `test_statistics` - 测试统计表
   - `assertion_results` - 断言结果表

3. **导入数据**：从 `data` 目录导入以下数据：
   - `projects.yaml` - 项目、模块、API、环境和变量数据
   - `scheduler_jobs.json` - 定时任务数据
   - `statistics.json` - 测试统计数据

## 使用方法

### 前置条件

1. 确保已安装MySQL数据库
2. 确保已安装Python依赖包：
   ```bash
   pip install pymysql
   ```

### 配置数据库连接

在 `config/config.yaml` 文件中配置MySQL数据库连接信息：

```yaml
database:
  mysql:
    host: localhost
    port: 3306
    user: root
    password: your_password
    database: test_db
    charset: utf8mb4
```

### 运行初始化脚本

在项目根目录下执行：

```bash
python scripts/init_database.py
```

或者在scripts目录下执行：

```bash
cd scripts
python init_database.py
```

### 脚本执行流程

1. 创建数据库（如果不存在）
2. 连接到数据库
3. 创建所有必要的表
4. 导入项目数据
5. 导入定时任务数据
6. 导入测试统计数据
7. 关闭数据库连接

## 注意事项

1. 脚本会自动处理已存在的数据，使用 `ON DUPLICATE KEY UPDATE` 语句避免重复插入
2. 所有表使用 `utf8mb4` 字符集，支持存储emoji等特殊字符
3. 外键约束设置为级联删除（ON DELETE CASCADE），删除父表记录时会自动删除相关子表记录
4. 执行脚本前请确保数据库连接信息正确
5. 建议在测试环境先运行脚本，确认无误后再在生产环境执行

## 表结构说明

### projects（项目表）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INT | 项目ID（主键） |
| name | VARCHAR(255) | 项目名称（唯一） |
| description | TEXT | 项目描述 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### modules（模块表）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INT | 模块ID（主键） |
| project_id | INT | 项目ID（外键） |
| name | VARCHAR(255) | 模块名称 |
| description | TEXT | 模块描述 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### apis（API表）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INT | API ID（主键） |
| module_id | INT | 模块ID（外键） |
| case_name | VARCHAR(255) | 用例名称 |
| url | TEXT | API URL |
| method | VARCHAR(10) | HTTP方法 |
| headers | JSON | 请求头 |
| data | JSON | 请求数据 |
| expected | JSON | 期望结果 |
| extractions | JSON | 数据提取规则 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### environments（环境表）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INT | 环境ID（主键） |
| project_id | INT | 项目ID（外键） |
| name | VARCHAR(255) | 环境名称 |
| base_url | TEXT | 基础URL |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### variables（变量表）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INT | 变量ID（主键） |
| project_id | INT | 项目ID（外键） |
| name | VARCHAR(255) | 变量名 |
| value | TEXT | 变量值 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### scheduler_jobs（定时任务表）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | VARCHAR(255) | 任务ID（主键） |
| name | VARCHAR(255) | 任务名称 |
| project_name | VARCHAR(255) | 项目名称 |
| module_name | VARCHAR(255) | 模块名称 |
| case_index | INT | 用例索引 |
| cron_expression | VARCHAR(100) | Cron表达式 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### test_statistics（测试统计表）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INT | 统计ID（主键） |
| method | VARCHAR(10) | HTTP方法 |
| url | TEXT | 请求URL |
| status_code | INT | 响应状态码 |
| response_time | FLOAT | 响应时间(ms) |
| assertion_passed | BOOLEAN | 断言是否通过 |
| assertion_count | INT | 断言总数 |
| assertion_passed_count | INT | 通过的断言数 |
| source | VARCHAR(50) | 来源(手动/定时) |
| project | VARCHAR(255) | 项目名称 |
| module | VARCHAR(255) | 模块名称 |
| case_name | VARCHAR(255) | 用例名称 |
| request_headers | JSON | 请求头 |
| request_body | JSON | 请求体 |
| response_headers | JSON | 响应头 |
| response_body | JSON | 响应体 |
| created_at | TIMESTAMP | 创建时间 |

### assertion_results（断言结果表）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INT | 断言结果ID（主键） |
| statistic_id | INT | 统计ID（外键） |
| type | VARCHAR(50) | 断言类型 |
| field | VARCHAR(255) | 字段名 |
| expected | TEXT | 期望值 |
| actual | TEXT | 实际值 |
| passed | BOOLEAN | 是否通过 |
| created_at | TIMESTAMP | 创建时间 |

## 常见问题

### Q: 脚本执行失败，提示连接数据库失败？

A: 请检查 `config/config.yaml` 中的数据库配置是否正确，包括主机地址、端口、用户名和密码。

### Q: 如何重新初始化数据库？

A: 可以先手动删除数据库，然后重新运行初始化脚本：
```sql
DROP DATABASE IF EXISTS test_db;
```

### Q: 脚本会覆盖已存在的数据吗？

A: 不会。脚本使用 `ON DUPLICATE KEY UPDATE` 语句，如果数据已存在则更新，不会删除或覆盖其他数据。

## 技术支持

如有问题，请联系开发团队或提交Issue。
