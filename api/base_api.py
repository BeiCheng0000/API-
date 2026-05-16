"""
基础API封装模块
提供通用的API接口封装
"""

import json
from typing import Any, Dict, Optional, Union

from common.request_handler import RequestHandler
from common.logger_handler import logger


class BaseAPI:
    """基础API类"""
    
    def __init__(self, env: Optional[str] = None):
        """
        初始化API处理器
        
        Args:
            env: 环境名称，默认为配置文件中的当前环境
        """
        self.request = RequestHandler(env)
        self.env = env or self.request.env
        self.base_url = self.request.base_url
    
    def get(self, url: str, params: Optional[Dict[str, Any]] = None, 
            **kwargs) -> Dict[str, Any]:
        """
        发送GET请求
        
        Args:
            url: 请求URL
            params: URL参数
            **kwargs: 其他请求参数
        
        Returns:
            响应数据字典
        """
        response = self.request.get(url, params=params, **kwargs)
        return self._handle_response(response)
    
    def post(self, url: str, data: Optional[Union[Dict[str, Any], str]] = None, 
             json: Optional[Dict[str, Any]] = None, **kwargs) -> Dict[str, Any]:
        """
        发送POST请求
        
        Args:
            url: 请求URL
            data: 表单数据
            json: JSON数据
            **kwargs: 其他请求参数
        
        Returns:
            响应数据字典
        """
        response = self.request.post(url, data=data, json=json, **kwargs)
        return self._handle_response(response)
    
    def put(self, url: str, data: Optional[Union[Dict[str, Any], str]] = None, 
            json: Optional[Dict[str, Any]] = None, **kwargs) -> Dict[str, Any]:
        """
        发送PUT请求
        
        Args:
            url: 请求URL
            data: 表单数据
            json: JSON数据
            **kwargs: 其他请求参数
        
        Returns:
            响应数据字典
        """
        response = self.request.put(url, data=data, json=json, **kwargs)
        return self._handle_response(response)
    
    def delete(self, url: str, **kwargs) -> Dict[str, Any]:
        """
        发送DELETE请求
        
        Args:
            url: 请求URL
            **kwargs: 其他请求参数
        
        Returns:
            响应数据字典
        """
        response = self.request.delete(url, **kwargs)
        return self._handle_response(response)
    
    def _handle_response(self, response) -> Dict[str, Any]:
        """
        处理响应数据
        
        Args:
            response: 响应对象
        
        Returns:
            响应数据字典
        """
        try:
            result = {
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "data": response.json() if response.headers.get("content-type", "").startswith("application/json") else response.text
            }
            return result
        except Exception as e:
            logger.error(f"处理响应数据失败: {e}")
            return {
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "data": response.text
            }
    
    def close(self):
        """关闭请求会话"""
        self.request.close()


__all__ = ["BaseAPI"]
