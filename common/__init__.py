"""
公共模块

提供接口自动化测试平台的通用功能，包括：
- config_handler: 配置文件读取（支持多级键、多环境）
- request_handler: HTTP 请求封装（Session 复用、自动拼接 URL）
- yaml_handler: YAML 文件读写
- excel_handler: Excel 文件读写（基于 pandas）
- db_handler: 数据库操作（MySQL / MongoDB，可选）
- logger_handler: 日志处理（loguru，控制台 + 文件双输出）

使用示例::

    from common import config, env_config, logger, RequestHandler

    # 读取配置
    base_url = env_config.get_base_url()

    # 发送请求
    handler = RequestHandler()
    response = handler.get("/user/info")
"""

from common.config_handler import ConfigHandler, EnvConfigHandler, config, env_config
from common.db_handler import DBHandler, MySQLHandler, MongoDBHandler
from common.excel_handler import ExcelHandler
from common.logger_handler import logger, get_logger
from common.request_handler import RequestHandler
from common.yaml_handler import YamlHandler

__all__ = [
    "ConfigHandler", "EnvConfigHandler", "config", "env_config",
    "DBHandler", "MySQLHandler", "MongoDBHandler",
    "ExcelHandler",
    "logger", "get_logger",
    "RequestHandler",
    "YamlHandler"
]
