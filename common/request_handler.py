"""
请求处理模块
基于requests库封装HTTP请求方法
"""

import json
import time
from typing import Any, Dict, Optional, Union

import requests

from common.config_handler import env_config
from common.logger_handler import logger


class RequestHandler:
    """请求处理类"""
    
    def __init__(self, env: Optional[str] = None):
        """
        初始化请求处理器
        
        Args:
            env: 环境名称，默认为配置文件中的当前环境
        """
        self.env = env or env_config.current_env
        self.base_url = env_config.get_base_url(self.env)
        self.timeout = env_config.get_timeout(self.env)
        self.headers = env_config.get_headers(self.env)
        self.session = requests.Session()
        
        # 更新session的headers
        if self.headers:
            self.session.headers.update(self.headers)
    
    def request(self, method: str, url: str, **kwargs) -> requests.Response:
        """
        发送HTTP请求
        
        Args:
            method: HTTP方法，如GET, POST, PUT, DELETE等
            url: 请求URL
            **kwargs: 其他请求参数，如params, data, json, headers等
        
        Returns:
            响应对象
        """
        # 如果URL不是完整的URL，则拼接base_url
        if not url.startswith("http"):
            url = f"{self.base_url}{url}"
        
        # 设置默认超时时间
        if "timeout" not in kwargs:
            kwargs["timeout"] = self.timeout
        
        # 记录请求信息
        logger.info(f"发送{method}请求: {url}")
        if "params" in kwargs:
            logger.debug(f"请求参数: {kwargs['params']}")
        if "data" in kwargs:
            logger.debug(f"请求数据: {kwargs['data']}")
        if "json" in kwargs:
            logger.debug(f"请求数据(JSON): {kwargs['json']}")
        
        try:
            # 发送请求
            response = self.session.request(method, url, **kwargs)
            
            # 记录响应信息
            logger.info(f"响应状态码: {response.status_code}")
            try:
                logger.debug(f"响应内容: {response.text}")
            except Exception:
                logger.debug("响应内容无法解析")
            
            return response
        except requests.exceptions.Timeout:
            logger.error(f"请求超时: {url}")
            raise
        except requests.exceptions.ConnectionError:
            logger.error(f"连接错误: {url}")
            raise
        except requests.exceptions.RequestException as e:
            logger.error(f"请求异常: {e}")
            raise
    
    def get(self, url: str, params: Optional[Dict[str, Any]] = None, **kwargs) -> requests.Response:
        """
        发送GET请求
        
        Args:
            url: 请求URL
            params: URL参数
            **kwargs: 其他请求参数
        
        Returns:
            响应对象
        """
        return self.request("GET", url, params=params, **kwargs)
    
    def post(self, url: str, data: Optional[Union[Dict[str, Any], str]] = None, 
             json: Optional[Dict[str, Any]] = None, **kwargs) -> requests.Response:
        """
        发送POST请求
        
        Args:
            url: 请求URL
            data: 表单数据
            json: JSON数据
            **kwargs: 其他请求参数
        
        Returns:
            响应对象
        """
        return self.request("POST", url, data=data, json=json, **kwargs)
    
    def put(self, url: str, data: Optional[Union[Dict[str, Any], str]] = None, 
            json: Optional[Dict[str, Any]] = None, **kwargs) -> requests.Response:
        """
        发送PUT请求
        
        Args:
            url: 请求URL
            data: 表单数据
            json: JSON数据
            **kwargs: 其他请求参数
        
        Returns:
            响应对象
        """
        return self.request("PUT", url, data=data, json=json, **kwargs)
    
    def delete(self, url: str, **kwargs) -> requests.Response:
        """
        发送DELETE请求
        
        Args:
            url: 请求URL
            **kwargs: 其他请求参数
        
        Returns:
            响应对象
        """
        return self.request("DELETE", url, **kwargs)
    
    def close(self) -> None:
        """关闭session"""
        self.session.close()


__all__ = ["RequestHandler"]
