"""
工具类模块

提供接口自动化测试平台的通用工具函数，包括：
- DataUtils: 随机数据生成（字符串、数字、手机号、邮箱、时间）
- JsonUtils: JSON 数据提取（基于 JSONPath）
- FileUtils: 文件操作（目录创建、文件大小）
- AssertUtils: 断言工具（相等、包含、大于、小于等）
- StringUtils: 字符串判断（空值检查）

使用示例::

    from utils import DataUtils, JsonUtils, AssertUtils

    # 生成随机数据
    phone = DataUtils.get_random_phone()

    # 提取 JSON 数据
    value = JsonUtils.get_value(response, "$.data.user.name")

    # 断言
    AssertUtils.assert_equals(status_code, 200)
"""

from utils.tools import DataUtils, JsonUtils, FileUtils, AssertUtils, StringUtils

__all__ = ["DataUtils", "JsonUtils", "FileUtils", "AssertUtils", "StringUtils"]
