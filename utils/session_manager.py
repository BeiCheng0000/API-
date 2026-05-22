
"""
会话管理模块
提供独立的HTTP会话管理，避免定时任务之间相互影响
"""

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from common.logger_handler import logger
from functools import wraps
import time
import threading

class SessionManager:
    """会话管理器，为每个定时任务提供独立的HTTP会话"""

    def __init__(self):
        self._sessions = {}
        self._lock = threading.Lock()

    def get_session(self, task_id=None):
        """
        获取一个HTTP会话

        Args:
            task_id: 任务ID，用于区分不同任务的会话

        Returns:
            requests.Session: HTTP会话对象
        """
        if task_id is None:
            task_id = "default"

        with self._lock:
            if task_id not in self._sessions:
                # 创建新会话
                session = self._create_session()
                self._sessions[task_id] = {
                    'session': session,
                    'last_used': time.time()
                }
                logger.debug(f"为任务 {task_id} 创建新会话")
            else:
                # 更新最后使用时间
                self._sessions[task_id]['last_used'] = time.time()

            return self._sessions[task_id]['session']

    def _create_session(self):
        """创建新的HTTP会话"""
        # 配置重试策略
        retry_strategy = Retry(
            total=2,
            backoff_factor=0.5,
            status_forcelist=[429, 500, 502, 503, 504]
        )

        # 配置连接池
        adapter = HTTPAdapter(
            max_retries=retry_strategy,
            pool_connections=5,
            pool_maxsize=20,
            pool_block=False
        )

        # 创建HTTP会话并配置连接池
        session = requests.Session()
        session.mount("http://", adapter)
        session.mount("https://", adapter)

        return session

    def cleanup_expired_sessions(self, max_age=3600):
        """
        清理过期会话

        Args:
            max_age: 会话最大存活时间（秒），默认1小时
        """
        current_time = time.time()
        expired_sessions = []

        with self._lock:
            for task_id, session_info in self._sessions.items():
                if current_time - session_info['last_used'] > max_age:
                    expired_sessions.append(task_id)

            for task_id in expired_sessions:
                self._sessions[task_id]['session'].close()
                del self._sessions[task_id]
                logger.debug(f"清理过期会话: {task_id}")

    def close_all(self):
        """关闭所有会话"""
        with self._lock:
            for task_id, session_info in self._sessions.items():
                session_info['session'].close()
            self._sessions.clear()
            logger.debug("已关闭所有会话")

# 创建全局会话管理器实例
session_manager = SessionManager()

def with_session(task_id=None):
    """
    装饰器：为函数提供独立的HTTP会话

    Args:
        task_id: 任务ID，用于区分不同任务的会话
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # 获取独立会话
            session = session_manager.get_session(task_id)

            # 将会话传入函数
            kwargs['session'] = session
            return func(*args, **kwargs)
        return wrapper
    return decorator
