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
        self._lock = __import__('threading').Lock()

    def _create_connection(self) -> None:
        """
        创建新的MySQL数据库连接和游标（内部方法）

        将 pymysql.connect() 统一提取到此方法，避免在多处重复连接参数配置。
        调用此方法前需确保已持有 self._lock（线程安全），或在不需加锁的场景下调用。

        Raises:
            ImportError: 未安装 pymysql 库
            Exception: 数据库连接失败
        """
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
        except ImportError:
            logger.error("未安装pymysql库，请先安装: pip install pymysql")
            raise
        except Exception as e:
            logger.error(f"连接MySQL数据库失败: {e}")
            raise

    def connect(self):
        """连接MySQL数据库（线程安全）"""
        with self._lock:
            self._create_connection()
            logger.info(f"成功连接MySQL数据库: {self.db_config.get('host', 'localhost')}")

    def close(self):
        """关闭MySQL数据库连接（线程安全）"""
        with self._lock:
            if self.cursor:
                self.cursor.close()
            if self.connection:
                self.connection.close()
            logger.info("已关闭MySQL数据库连接")

    def _ensure_connection(self):
        """确保数据库连接有效（线程安全，供外部调用）"""
        with self._lock:
            self._ensure_connection_unsafe()

    def execute(self, sql: str, params: Optional[Union[Dict[str, Any], tuple]] = None) -> int:
        """
        执行SQL语句（线程安全）

        Args:
            sql: SQL语句
            params: SQL参数，可以是字典或元组

        Returns:
            受影响的行数
        """
        with self._lock:
            self._ensure_connection_unsafe()

            try:
                logger.debug(f"执行SQL: {sql}, 参数: {params}")
                self.cursor.execute(sql, params or ())
                self.connection.commit()
                return self.cursor.rowcount
            except Exception as e:
                try:
                    self.connection.rollback()
                except Exception:
                    pass
                logger.error(f"执行SQL失败: {e}")
                # 执行失败时尝试重新连接，以便下次操作可以恢复
                try:
                    self._create_connection()
                except Exception:
                    pass
                raise

    def _ensure_connection_unsafe(self):
        """
        确保数据库连接有效（不加锁版本，供已加锁的方法内部调用）

        设计说明：
            此方法供已持有 self._lock 的方法（如 execute、query）内部调用，
            避免重复加锁导致死锁。外部调用请使用 _ensure_connection()。

        处理逻辑：
            1. 如果连接和游标存在，通过 ping() 测试连接有效性
            2. ping 失败或连接为空时，通过 _create_connection() 重新建立连接
        """
        try:
            if self.connection and self.cursor:
                self.connection.ping(reconnect=True)
                if not self.cursor or self.cursor.connection != self.connection:
                    self.cursor = self.connection.cursor()
        except Exception:
            # 连接失效或为空，重新连接
            try:
                self._create_connection()
                logger.info(f"重新连接MySQL数据库成功: {self.db_config.get('host', 'localhost')}")
            except Exception as e:
                logger.error(f"重新连接MySQL数据库失败: {e}")
                raise

    def query(self, sql: str, params: Optional[Union[Dict[str, Any], tuple]] = None) -> List[Dict[str, Any]]:
        """
        查询数据（线程安全）

        Args:
            sql: SQL语句
            params: SQL参数，可以是字典或元组

        Returns:
            查询结果列表
        """
        max_retries = 2
        last_error = None

        for attempt in range(max_retries):
            with self._lock:
                self._ensure_connection_unsafe()
                try:
                    logger.debug(f"查询SQL: {sql}, 参数: {params}")
                    self.cursor.execute(sql, params or ())
                    return self.cursor.fetchall()
                except Exception as e:
                    last_error = e
                    error_msg = str(e)
                    logger.warning(f"查询数据失败(第{attempt + 1}次): {e}")

                    # PyMemoryView_FromBuffer 错误是 pymysql 内部 bug，重建 cursor 可能解决
                    if 'PyMemoryView' in error_msg or 'buf must not be NULL' in error_msg:
                        try:
                            if self.connection:
                                self.cursor = self.connection.cursor()
                        except Exception:
                            pass
                        continue

                    # 其他错误：重新连接后重试
                    try:
                        self._create_connection()
                    except Exception:
                        pass

        logger.error(f"查询数据最终失败: {last_error}")
        raise last_error


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
