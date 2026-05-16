"""
数据库操作模块
提供MySQL和MongoDB的数据库操作
"""

from typing import Any, Dict, List, Optional, Union

from common.config_handler import config
from common.logger_handler import logger


class DBHandler:
    """数据库处理基类"""
    
    def __init__(self):
        """初始化数据库处理器"""
        pass
    
    def connect(self):
        """连接数据库"""
        raise NotImplementedError("子类必须实现此方法")
    
    def close(self):
        """关闭数据库连接"""
        raise NotImplementedError("子类必须实现此方法")
    
    def execute(self, sql: str, params: Optional[Dict[str, Any]] = None) -> Any:
        """
        执行SQL语句
        
        Args:
            sql: SQL语句
            params: SQL参数
        
        Returns:
            执行结果
        """
        raise NotImplementedError("子类必须实现此方法")
    
    def query(self, sql: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        查询数据
        
        Args:
            sql: SQL语句
            params: SQL参数
        
        Returns:
            查询结果列表
        """
        raise NotImplementedError("子类必须实现此方法")


class MySQLHandler(DBHandler):
    """MySQL数据库处理类"""
    
    def __init__(self, db_config: Optional[Dict[str, Any]] = None):
        """
        初始化MySQL处理器
        
        Args:
            db_config: 数据库配置，如果为None，则从配置文件中读取
        """
        super().__init__()
        self.db_config = db_config or config.get("database.mysql", {})
        self.connection = None
        self.cursor = None
    
    def connect(self):
        """连接MySQL数据库"""
        try:
            import pymysql
            self.connection = pymysql.connect(
                host=self.db_config.get("host", "localhost"),
                port=self.db_config.get("port", 3306),
                user=self.db_config.get("user", "root"),
                password=self.db_config.get("password", ""),
                database=self.db_config.get("database", "test_db"),
                charset=self.db_config.get("charset", "utf8mb4"),
                cursorclass=pymysql.cursors.DictCursor
            )
            self.cursor = self.connection.cursor()
            logger.info(f"成功连接MySQL数据库: {self.db_config.get('host', 'localhost')}")
        except ImportError:
            logger.error("未安装pymysql库，请先安装: pip install pymysql")
            raise
        except Exception as e:
            logger.error(f"连接MySQL数据库失败: {e}")
            raise
    
    def close(self):
        """关闭MySQL数据库连接"""
        if self.cursor:
            self.cursor.close()
        if self.connection:
            self.connection.close()
        logger.info("已关闭MySQL数据库连接")
    
    def execute(self, sql: str, params: Optional[Dict[str, Any]] = None) -> int:
        """
        执行SQL语句
        
        Args:
            sql: SQL语句
            params: SQL参数
        
        Returns:
            受影响的行数
        """
        if not self.connection:
            self.connect()
        
        try:
            logger.debug(f"执行SQL: {sql}, 参数: {params}")
            self.cursor.execute(sql, params or ())
            self.connection.commit()
            return self.cursor.rowcount
        except Exception as e:
            self.connection.rollback()
            logger.error(f"执行SQL失败: {e}")
            raise
    
    def query(self, sql: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        查询数据
        
        Args:
            sql: SQL语句
            params: SQL参数
        
        Returns:
            查询结果列表
        """
        if not self.connection:
            self.connect()
        
        try:
            logger.debug(f"查询SQL: {sql}, 参数: {params}")
            self.cursor.execute(sql, params or ())
            return self.cursor.fetchall()
        except Exception as e:
            logger.error(f"查询数据失败: {e}")
            raise


class MongoDBHandler(DBHandler):
    """MongoDB数据库处理类"""
    
    def __init__(self, db_config: Optional[Dict[str, Any]] = None):
        """
        初始化MongoDB处理器
        
        Args:
            db_config: 数据库配置，如果为None，则从配置文件中读取
        """
        super().__init__()
        self.db_config = db_config or config.get("database.mongodb", {})
        self.client = None
        self.database = None
    
    def connect(self):
        """连接MongoDB数据库"""
        try:
            import pymongo
            
            # 构建连接URI
            user = self.db_config.get("user", "")
            password = self.db_config.get("password", "")
            host = self.db_config.get("host", "localhost")
            port = self.db_config.get("port", 27017)
            
            if user and password:
                uri = f"mongodb://{user}:{password}@{host}:{port}/"
            else:
                uri = f"mongodb://{host}:{port}/"
            
            self.client = pymongo.MongoClient(uri)
            self.database = self.client[self.db_config.get("database", "test_db")]
            logger.info(f"成功连接MongoDB数据库: {host}:{port}")
        except ImportError:
            logger.error("未安装pymongo库，请先安装: pip install pymongo")
            raise
        except Exception as e:
            logger.error(f"连接MongoDB数据库失败: {e}")
            raise
    
    def close(self):
        """关闭MongoDB数据库连接"""
        if self.client:
            self.client.close()
        logger.info("已关闭MongoDB数据库连接")
    
    def execute(self, collection: str, operation: str, data: Dict[str, Any], 
               filter_query: Optional[Dict[str, Any]] = None) -> Any:
        """
        执行数据库操作
        
        Args:
            collection: 集合名称
            operation: 操作类型，如insert, update, delete
            data: 操作数据
            filter_query: 过滤条件，用于update和delete操作
        
        Returns:
            操作结果
        """
        if not self.database:
            self.connect()
        
        try:
            coll = self.database[collection]
            
            if operation == "insert":
                result = coll.insert_one(data)
                logger.debug(f"插入数据到集合 {collection}: {data}")
                return result.inserted_id
            elif operation == "update":
                result = coll.update_one(filter_query or {}, {"$set": data})
                logger.debug(f"更新集合 {collection} 中的数据: {filter_query}, 更新内容: {data}")
                return result.modified_count
            elif operation == "delete":
                result = coll.delete_one(filter_query or {})
                logger.debug(f"从集合 {collection} 中删除数据: {filter_query}")
                return result.deleted_count
            else:
                logger.error(f"不支持的操作类型: {operation}")
                raise ValueError(f"不支持的操作类型: {operation}")
        except Exception as e:
            logger.error(f"执行数据库操作失败: {e}")
            raise
    
    def query(self, collection: str, filter_query: Optional[Dict[str, Any]] = None, 
              limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        查询数据
        
        Args:
            collection: 集合名称
            filter_query: 查询条件
            limit: 返回结果数量限制
        
        Returns:
            查询结果列表
        """
        if not self.database:
            self.connect()
        
        try:
            coll = self.database[collection]
            logger.debug(f"查询集合 {collection} 中的数据: {filter_query}")
            
            if limit:
                return list(coll.find(filter_query or {}).limit(limit))
            return list(coll.find(filter_query or {}))
        except Exception as e:
            logger.error(f"查询数据失败: {e}")
            raise


__all__ = ["DBHandler", "MySQLHandler", "MongoDBHandler"]
