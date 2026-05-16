"""
日志处理模块
使用loguru库实现日志功能
"""

import os
import sys
from pathlib import Path
from loguru import logger

# 项目根目录
BASE_DIR = Path(__file__).parent.parent

# 日志目录
LOG_DIR = os.path.join(BASE_DIR, "logs")

# 确保日志目录存在
os.makedirs(LOG_DIR, exist_ok=True)

# 移除默认处理器
logger.remove()

# 添加控制台日志处理器
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="INFO",
    colorize=True,
)

# 添加文件日志处理器 - 所有日志
logger.add(
    os.path.join(LOG_DIR, "app_{time:YYYY-MM-DD}.log"),
    format="<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="DEBUG",
    rotation="10 MB",
    retention="30 days",
    encoding="utf-8",
)

# 添加文件日志处理器 - 错误日志
logger.add(
    os.path.join(LOG_DIR, "error_{time:YYYY-MM-DD}.log"),
    format="<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="ERROR",
    rotation="10 MB",
    retention="30 days",
    encoding="utf-8",
)


def get_logger(name=None):
    """
    获取日志记录器
    
    Args:
        name: 日志记录器名称，默认为调用模块的名称
    
    Returns:
        日志记录器对象
    """
    if name:
        return logger.bind(name=name)
    return logger


# 导出logger对象
__all__ = ["logger", "get_logger"]
