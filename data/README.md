# 测试数据目录说明

## 目录结构

| 文件 | 格式 | 说明 | 是否自动创建 |
|------|------|------|-------------|
| `test_data.yaml` | YAML | 测试用例数据（推荐格式） | 是 |
| `projects.yaml` | YAML | 项目配置数据 | 是 |
| `scheduler_jobs.json` | JSON | 定时任务持久化数据 | 是 |
| `statistics.json` | JSON | 测试执行统计数据 | 是 |
| `test_data.xlsx` | Excel | Excel 格式测试数据 | 否（需手动创建） |

> ⚠️ `.xlsx` 文件已被 `.gitignore` 排除，不会提交到代码仓库。如需使用 Excel 格式，请参考下方说明手动创建。

## Excel测试数据文件创建说明

### 工作表结构

Excel测试数据文件应包含以下工作表：

1. **用户登录测试数据** (Sheet名称: login)
   - case_name: 测试用例名称
   - url: 接口URL
   - method: 请求方法(GET/POST/PUT/DELETE)
   - headers: 请求头(JSON格式)
   - data: 请求数据(JSON格式)
   - expected_status_code: 期望状态码
   - expected_code: 期望业务码
   - expected_message: 期望消息

2. **用户注册测试数据** (Sheet名称: register)
   - 同上结构

3. **获取用户信息测试数据** (Sheet名称: get_user_info)
   - 同上结构

### 示例数据

| case_name | url | method | headers | data | expected_status_code | expected_code | expected_message |
|-----------|-----|--------|---------|------|---------------------|---------------|------------------|
| 正常登录 | /user/login | POST | {"Content-Type": "application/json"} | {"username": "testuser", "password": "123456"} | 200 | 0 | 登录成功 |
| 用户名不存在 | /user/login | POST | {"Content-Type": "application/json"} | {"username": "nonexistent", "password": "123456"} | 200 | 1001 | 用户名或密码错误 |

### 创建Excel文件

可以使用以下方法创建Excel测试数据文件：

1. 使用Microsoft Excel或WPS表格手动创建
2. 使用Python脚本创建（示例代码见下方）
3. 使用在线Excel工具创建

### Python脚本创建Excel文件示例

```python
import pandas as pd

# 创建登录测试数据
login_data = [
    {
        "case_name": "正常登录",
        "url": "/user/login",
        "method": "POST",
        "headers": '{"Content-Type": "application/json"}',
        "data": '{"username": "testuser", "password": "123456"}',
        "expected_status_code": 200,
        "expected_code": 0,
        "expected_message": "登录成功"
    },
    {
        "case_name": "用户名不存在",
        "url": "/user/login",
        "method": "POST",
        "headers": '{"Content-Type": "application/json"}',
        "data": '{"username": "nonexistent", "password": "123456"}',
        "expected_status_code": 200,
        "expected_code": 1001,
        "expected_message": "用户名或密码错误"
    }
]

# 创建DataFrame
df_login = pd.DataFrame(login_data)

# 创建ExcelWriter对象
with pd.ExcelWriter("test_data.xlsx", engine="openpyxl") as writer:
    df_login.to_excel(writer, sheet_name="login", index=False)

print("Excel文件创建成功！")
```

## 数据替换规则

在测试数据中可以使用以下占位符，测试执行时会自动替换：

- `${timestamp}`: 当前时间戳
- `${random_string}`: 随机字符串
- `${random_number}`: 随机数字
- `${random_phone}`: 随机手机号
- `${random_email}`: 随机邮箱

例如：
```
username: "testuser_${timestamp}"
```

在测试执行时会被替换为：
```
username: "testuser_1631234567"
```
