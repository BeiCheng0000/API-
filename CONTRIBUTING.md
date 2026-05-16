# 贡献指南

感谢你对 API 自动化测试平台的关注！欢迎提交 Issue 和 Pull Request 来帮助改进项目。

## 快速开始

1. Fork 本仓库
2. 克隆你 Fork 的仓库到本地
```bash
git clone https://github.com/<your-username>/api_automation_platform.git
cd api_automation_platform
```
3. 创建虚拟环境并安装依赖
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```
4. 创建功能分支
```bash
git checkout -b feature/your-feature
```

## 开发流程

### 分支命名规范

| 分支类型 | 命名格式 | 示例 |
|----------|----------|------|
| 新功能 | `feature/<描述>` | `feature/add-user-api` |
| Bug 修复 | `fix/<描述>` | `fix/login-timeout-error` |
| 文档更新 | `docs/<描述>` | `docs/update-readme` |
| 重构 | `refactor/<描述>` | `refactor/request-handler` |
| 性能优化 | `perf/<描述>` | `perf/optimize-db-query` |

### 提交信息规范

请使用以下前缀开头：

| 前缀 | 说明 | 示例 |
|------|------|------|
| `feat:` | 新功能 | `feat: 添加用户注册 API 测试` |
| `fix:` | 修复 Bug | `fix: 修复定时任务恢复失败的问题` |
| `docs:` | 文档更新 | `docs: 更新 API 端点文档` |
| `style:` | 代码格式（不影响逻辑） | `style: 统一缩进为4空格` |
| `refactor:` | 代码重构 | `refactor: 提取公共断言方法` |
| `test:` | 测试相关 | `test: 添加配置处理模块单元测试` |
| `chore:` | 构建/工具变更 | `chore: 升级 pytest 到 7.4.3` |

### 代码规范

1. **Python 风格**：遵循 [PEP 8](https://pep8.org/) 编码规范
2. **类型注解**：所有函数参数和返回值应添加类型注解
3. **Docstring**：所有类和公共方法必须包含 docstring，格式如下：
   ```python
   def function_name(param1: str, param2: int = 0) -> bool:
       """
       函数简述

       Args:
           param1: 参数1说明
           param2: 参数2说明，默认为0

       Returns:
           返回值说明

       Raises:
           ValueError: 异常说明
       """
   ```
4. **日志记录**：使用 `from common.logger_handler import logger`，不要使用 `print()`
5. **异常处理**：不要使用裸 `except`，应指定具体的异常类型
6. **导入顺序**：标准库 → 第三方库 → 本地模块，各组之间空一行

### 项目结构约定

- `api/` — API 接口封装，每个业务模块一个文件
- `common/` — 公共模块，与业务无关的通用功能
- `config/` — 配置文件，不包含敏感信息
- `data/` — 测试数据文件
- `testcases/` — pytest 测试用例
- `utils/` — 工具类，提供静态方法
- `static/` — 前端静态资源
- `templates/` — HTML 模板

### 敏感信息处理

- ⚠️ 不要在代码中硬编码密码、Token 等敏感信息
- 使用 `.env` 文件管理敏感配置（已加入 `.gitignore`）
- 配置文件中的密码字段留空，通过环境变量注入

## 提交 Pull Request

1. 确保代码通过所有现有测试
2. 确保新增功能有对应的测试
3. 更新相关文档（README、docstring 等）
4. 填写 PR 模板，描述变更内容和原因
5. 等待代码审查

## 报告 Issue

- 使用 GitHub Issues 提交问题
- 请包含以下信息：
  - 问题描述
  - 复现步骤
  - 期望行为
  - 实际行为
  - 环境信息（Python 版本、操作系统等）
  - 相关日志

## 许可证

通过向本项目贡献代码，你同意你的贡献将在与项目相同的许可证下发布。
