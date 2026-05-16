"""
Excel文件处理模块
提供Excel文件的读写操作
"""

import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill
import pandas as pd

from common.logger_handler import logger

# 项目根目录
BASE_DIR = Path(__file__).parent.parent

# 数据目录
DATA_DIR = os.path.join(BASE_DIR, "data")


class ExcelHandler:
    """Excel文件处理类"""
    
    def __init__(self, file_path: Optional[str] = None):
        """
        初始化Excel处理器
        
        Args:
            file_path: Excel文件路径，如果为None，则只提供静态方法
        """
        self.file_path = file_path
        if file_path and not os.path.isabs(file_path):
            self.file_path = os.path.join(DATA_DIR, file_path)
    
    def read(self, sheet_name: Union[str, int] = 0, header: bool = True) -> List[Dict[str, Any]]:
        """
        读取Excel文件
        
        Args:
            sheet_name: 工作表名称或索引，默认为第一个工作表
            header: 是否包含标题行，默认为True
        
        Returns:
            Excel数据，字典列表形式
        """
        if not self.file_path:
            logger.error("未指定Excel文件路径")
            return []
        
        try:
            # 使用pandas读取Excel
            df = pd.read_excel(self.file_path, sheet_name=sheet_name, header=0 if header else None)
            
            # 转换为字典列表
            data = df.to_dict("records")
            
            logger.info(f"成功读取Excel文件: {self.file_path}, 工作表: {sheet_name}")
            return data
        except FileNotFoundError:
            logger.error(f"Excel文件不存在: {self.file_path}")
            return []
        except Exception as e:
            logger.error(f"读取Excel文件失败: {e}")
            return []
    
    def write(self, data: List[Dict[str, Any]], sheet_name: str = "Sheet1", 
              mode: str = "w", index: bool = False) -> bool:
        """
        写入Excel文件
        
        Args:
            data: 要写入的数据，字典列表形式
            sheet_name: 工作表名称
            mode: 写入模式，'w'为覆盖，'a'为追加
            index: 是否写入索引
        
        Returns:
            是否写入成功
        """
        if not self.file_path:
            logger.error("未指定Excel文件路径")
            return False
        
        try:
            # 确保目录存在
            os.makedirs(os.path.dirname(self.file_path), exist_ok=True)
            
            # 使用pandas写入Excel
            df = pd.DataFrame(data)
            
            if mode == "w" or not os.path.exists(self.file_path):
                # 新建或覆盖模式
                df.to_excel(self.file_path, sheet_name=sheet_name, index=index)
            else:
                # 追加模式
                with pd.ExcelWriter(self.file_path, mode="a", engine="openpyxl", if_sheet_exists="overlay") as writer:
                    # 获取现有数据
                    existing_df = pd.read_excel(self.file_path, sheet_name=sheet_name)
                    # 合并数据
                    combined_df = pd.concat([existing_df, df], ignore_index=True)
                    # 写入合并后的数据
                    combined_df.to_excel(writer, sheet_name=sheet_name, index=index)
            
            logger.info(f"成功写入Excel文件: {self.file_path}, 工作表: {sheet_name}")
            return True
        except Exception as e:
            logger.error(f"写入Excel文件失败: {e}")
            return False
    
    @staticmethod
    def read_excel(file_path: str, sheet_name: Union[str, int] = 0, header: bool = True) -> List[Dict[str, Any]]:
        """
        静态方法：读取Excel文件
        
        Args:
            file_path: Excel文件路径
            sheet_name: 工作表名称或索引，默认为第一个工作表
            header: 是否包含标题行，默认为True
        
        Returns:
            Excel数据，字典列表形式
        """
        handler = ExcelHandler(file_path)
        return handler.read(sheet_name, header)
    
    @staticmethod
    def write_excel(file_path: str, data: List[Dict[str, Any]], sheet_name: str = "Sheet1", 
                   mode: str = "w", index: bool = False) -> bool:
        """
        静态方法：写入Excel文件
        
        Args:
            file_path: Excel文件路径
            data: 要写入的数据，字典列表形式
            sheet_name: 工作表名称
            mode: 写入模式，'w'为覆盖，'a'为追加
            index: 是否写入索引
        
        Returns:
            是否写入成功
        """
        handler = ExcelHandler(file_path)
        return handler.write(data, sheet_name, mode, index)


__all__ = ["ExcelHandler"]
