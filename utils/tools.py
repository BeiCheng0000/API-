"""
通用工具类
提供常用的工具函数
"""

import os
import random
import string
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union

import jsonpath

from common.logger_handler import logger


class DataUtils:
    """数据处理工具类"""
    
    @staticmethod
    def get_random_string(length: int = 10) -> str:
        """
        生成随机字符串
        
        Args:
            length: 字符串长度
        
        Returns:
            随机字符串
        """
        return ''.join(random.choices(string.ascii_letters + string.digits, k=length))
    
    @staticmethod
    def get_random_number(min_val: int = 0, max_val: int = 100) -> int:
        """
        生成随机数字
        
        Args:
            min_val: 最小值
            max_val: 最大值
        
        Returns:
            随机数字
        """
        return random.randint(min_val, max_val)
    
    @staticmethod
    def get_random_phone() -> str:
        """
        生成随机手机号
        
        Returns:
            随机手机号
        """
        prefixes = ['130', '131', '132', '133', '134', '135', '136', '137', '138', '139',
                   '145', '147', '149', '150', '151', '152', '153', '155', '156', '157',
                   '158', '159', '165', '166', '167', '170', '171', '172', '173', '175',
                   '176', '177', '178', '180', '181', '182', '183', '184', '185', '186',
                   '187', '188', '189', '191', '198', '199']
        prefix = random.choice(prefixes)
        suffix = ''.join(random.choices(string.digits, k=8))
        return f"{prefix}{suffix}"
    
    @staticmethod
    def get_random_email(domain: str = "example.com") -> str:
        """
        生成随机邮箱
        
        Args:
            domain: 邮箱域名
        
        Returns:
            随机邮箱
        """
        username = DataUtils.get_random_string(8)
        return f"{username}@{domain}"
    
    @staticmethod
    def get_current_time(format_str: str = "%Y-%m-%d %H:%M:%S") -> str:
        """
        获取当前时间
        
        Args:
            format_str: 时间格式
        
        Returns:
            格式化的当前时间字符串
        """
        return datetime.now().strftime(format_str)
    
    @staticmethod
    def get_future_time(days: int = 1, format_str: str = "%Y-%m-%d %H:%M:%S") -> str:
        """
        获取未来时间
        
        Args:
            days: 未来天数
            format_str: 时间格式
        
        Returns:
            格式化的未来时间字符串
        """
        return (datetime.now() + timedelta(days=days)).strftime(format_str)
    
    @staticmethod
    def get_past_time(days: int = 1, format_str: str = "%Y-%m-%d %H:%M:%S") -> str:
        """
        获取过去时间
        
        Args:
            days: 过去天数
            format_str: 时间格式
        
        Returns:
            格式化的过去时间字符串
        """
        return (datetime.now() - timedelta(days=days)).strftime(format_str)


class JsonUtils:
    """JSON数据处理工具类"""
    
    @staticmethod
    def get_value(data: Union[Dict[str, Any], List[Any]], path: str, default: Any = None) -> Any:
        """
        使用JSONPath获取JSON数据中的值
        
        Args:
            data: JSON数据
            path: JSONPath表达式
            default: 默认值
        
        Returns:
            匹配的值，如果没有匹配则返回默认值
        """
        try:
            result = jsonpath.jsonpath(data, path)
            if result:
                return result[0]
            return default
        except Exception as e:
            logger.error(f"使用JSONPath获取值失败: {e}")
            return default
    
    @staticmethod
    def get_values(data: Union[Dict[str, Any], List[Any]], path: str) -> List[Any]:
        """
        使用JSONPath获取JSON数据中的多个值
        
        Args:
            data: JSON数据
            path: JSONPath表达式
        
        Returns:
            匹配的值列表
        """
        try:
            result = jsonpath.jsonpath(data, path)
            return result if result else []
        except Exception as e:
            logger.error(f"使用JSONPath获取值失败: {e}")
            return []


class FileUtils:
    """文件处理工具类"""
    
    @staticmethod
    def ensure_dir(dir_path: str) -> None:
        """
        确保目录存在
        
        Args:
            dir_path: 目录路径
        """
        os.makedirs(dir_path, exist_ok=True)
    
    @staticmethod
    def get_file_size(file_path: str, unit: str = "KB") -> float:
        """
        获取文件大小
        
        Args:
            file_path: 文件路径
            unit: 单位，可选: B, KB, MB, GB
        
        Returns:
            文件大小
        """
        if not os.path.exists(file_path):
            logger.error(f"文件不存在: {file_path}")
            return 0
        
        size_bytes = os.path.getsize(file_path)
        
        if unit == "B":
            return size_bytes
        elif unit == "KB":
            return size_bytes / 1024
        elif unit == "MB":
            return size_bytes / (1024 * 1024)
        elif unit == "GB":
            return size_bytes / (1024 * 1024 * 1024)
        else:
            logger.error(f"不支持的单位: {unit}")
            return 0


class AssertUtils:
    """断言工具类"""
    
    @staticmethod
    def assert_equals(actual: Any, expected: Any, message: str = "") -> None:
        """
        断言相等
        
        Args:
            actual: 实际值
            expected: 期望值
            message: 断言失败时的消息
        """
        assert actual == expected, message or f"断言失败: 期望 {expected}, 实际 {actual}"
    
    @staticmethod
    def assert_not_equals(actual: Any, expected: Any, message: str = "") -> None:
        """
        断言不相等
        
        Args:
            actual: 实际值
            expected: 期望值
            message: 断言失败时的消息
        """
        assert actual != expected, message or f"断言失败: 不期望 {expected}, 实际 {actual}"
    
    @staticmethod
    def assert_contains(actual: Any, expected: Any, message: str = "") -> None:
        """
        断言包含
        
        Args:
            actual: 实际值
            expected: 期望包含的值
            message: 断言失败时的消息
        """
        assert expected in actual, message or f"断言失败: {actual} 不包含 {expected}"
    
    @staticmethod
    def assert_not_contains(actual: Any, expected: Any, message: str = "") -> None:
        """
        断言不包含
        
        Args:
            actual: 实际值
            expected: 期望不包含的值
            message: 断言失败时的消息
        """
        assert expected not in actual, message or f"断言失败: {actual} 包含 {expected}"
    
    @staticmethod
    def assert_true(condition: bool, message: str = "") -> None:
        """
        断言为真
        
        Args:
            condition: 条件
            message: 断言失败时的消息
        """
        assert condition, message or "断言失败: 条件不为真"
    
    @staticmethod
    def assert_false(condition: bool, message: str = "") -> None:
        """
        断言为假
        
        Args:
            condition: 条件
            message: 断言失败时的消息
        """
        assert not condition, message or "断言失败: 条件不为假"
    
    @staticmethod
    def assert_greater(actual: Any, expected: Any, message: str = "") -> None:
        """
        断言大于
        
        Args:
            actual: 实际值
            expected: 期望值
            message: 断言失败时的消息
        """
        assert actual > expected, message or f"断言失败: {actual} 不大于 {expected}"
    
    @staticmethod
    def assert_less(actual: Any, expected: Any, message: str = "") -> None:
        """
        断言小于
        
        Args:
            actual: 实际值
            expected: 期望值
            message: 断言失败时的消息
        """
        assert actual < expected, message or f"断言失败: {actual} 不小于 {expected}"


class StringUtils:
    """字符串处理工具类"""
    
    @staticmethod
    def is_empty(s: str) -> bool:
        """
        判断字符串是否为空
        
        Args:
            s: 字符串
        
        Returns:
            是否为空
        """
        return not s or not s.strip()
    
    @staticmethod
    def is_not_empty(s: str) -> bool:
        """
        判断字符串是否不为空
        
        Args:
            s: 字符串
        
        Returns:
            是否不为空
        """
        return not StringUtils.is_empty(s)


__all__ = [
    "DataUtils", "JsonUtils", "FileUtils", "AssertUtils", "StringUtils"
]
