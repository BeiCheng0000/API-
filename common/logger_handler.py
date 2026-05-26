"""
日志处理模块
使用loguru库实现日志功能
"""

import os
import sys
from pathlib import Path
from loguru import logger
import yaml

# 项目根目录
BASE_DIR = Path(__file__).parent.parent

# 日志目录
LOG_DIR = os.path.join(BASE_DIR, "logs")

# 确保日志目录存在
os.makedirs(LOG_DIR, exist_ok=True)

# 从配置文件读取日志配置
def _load_log_config():
    """从配置文件加载日志配置"""
    config_path = os.path.join(BASE_DIR, "config", "config.yaml")
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            config_data = yaml.safe_load(f) or {}
        log_config = config_data.get("log", {})
        return {
            "level": log_config.get("level", "INFO"),
            "rotation": log_config.get("rotation", "10 MB"),
            "retention": log_config.get("retention", "30 days"),
            "encoding": log_config.get("encoding", "utf-8"),
            "format": log_config.get("format", "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>")
        }
    except Exception:
        # 如果读取配置失败，返回默认配置
        return {
            "level": "INFO",
            "rotation": "10 MB",
            "retention": "30 days",
            "encoding": "utf-8",
            "format": "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
        }

# 加载日志配置
log_config = _load_log_config()
log_level = log_config["level"]
log_rotation = log_config["rotation"]
log_retention = log_config["retention"]
log_encoding = log_config["encoding"]
log_format = log_config["format"]

# 移除默认处理器
logger.remove()

# 添加控制台日志处理器（使用stderr，避免Waitress缓冲stdout）
logger.add(
    sys.stderr,
    format=log_format,
    level=log_level,
    colorize=True,
)

# 添加文件日志处理器 - 所有日志
logger.add(
    os.path.join(LOG_DIR, "app_{time:YYYY-MM-DD}.log"),
    format=log_format,
    level="DEBUG",
    rotation=log_rotation,
    retention=log_retention,
    encoding=log_encoding,
)

# 添加文件日志处理器 - 错误日志
logger.add(
    os.path.join(LOG_DIR, "error_{time:YYYY-MM-DD}.log"),
    format=log_format,
    level="ERROR",
    rotation=log_rotation,
    retention=log_retention,
    encoding=log_encoding,
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
