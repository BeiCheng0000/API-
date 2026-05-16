"""
YAML文件处理模块
提供YAML文件的读写操作
"""

import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import yaml

from common.logger_handler import logger

# 项目根目录
BASE_DIR = Path(__file__).parent.parent

# 数据目录
DATA_DIR = os.path.join(BASE_DIR, "data")


class YamlHandler:
    """YAML文件处理类"""
    
    def __init__(self, file_path: Optional[str] = None):
        """
        初始化YAML处理器
        
        Args:
            file_path: YAML文件路径，如果为None，则只提供静态方法
        """
        self.file_path = file_path
        if file_path and not os.path.isabs(file_path):
            self.file_path = os.path.join(DATA_DIR, file_path)
    
    def read(self) -> Union[Dict[str, Any], List[Any], None]:
        """
        读取YAML文件
        
        Returns:
            YAML文件内容，字典或列表
        """
        if not self.file_path:
            logger.error("未指定YAML文件路径")
            return None
        
        try:
            with open(self.file_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
            logger.info(f"成功读取YAML文件: {self.file_path}")
            return data
        except FileNotFoundError:
            logger.error(f"YAML文件不存在: {self.file_path}")
            return None
        except yaml.YAMLError as e:
            logger.error(f"YAML文件解析失败: {e}")
            return None
    
    def write(self, data: Union[Dict[str, Any], List[Any]]) -> bool:
        """
        写入YAML文件
        
        Args:
            data: 要写入的数据，字典或列表
        
        Returns:
            是否写入成功
        """
        if not self.file_path:
            logger.error("未指定YAML文件路径")
            return False
        
        # 确保目录存在
        os.makedirs(os.path.dirname(self.file_path), exist_ok=True)
        
        try:
            with open(self.file_path, "w", encoding="utf-8") as f:
                yaml.dump(data, f, allow_unicode=True, sort_keys=False)
            logger.info(f"成功写入YAML文件: {self.file_path}")
            return True
        except Exception as e:
            logger.error(f"写入YAML文件失败: {e}")
            return False
    
    @staticmethod
    def read_yaml(file_path: str) -> Union[Dict[str, Any], List[Any], None]:
        """
        静态方法：读取YAML文件
        
        Args:
            file_path: YAML文件路径
        
        Returns:
            YAML文件内容，字典或列表
        """
        handler = YamlHandler(file_path)
        return handler.read()
    
    @staticmethod
    def write_yaml(file_path: str, data: Union[Dict[str, Any], List[Any]]) -> bool:
        """
        静态方法：写入YAML文件
        
        Args:
            file_path: YAML文件路径
            data: 要写入的数据，字典或列表
        
        Returns:
            是否写入成功
        """
        handler = YamlHandler(file_path)
        return handler.write(data)


__all__ = ["YamlHandler"]
