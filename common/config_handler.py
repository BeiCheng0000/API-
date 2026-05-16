"""
配置文件处理模块
支持YAML格式的配置文件读取和解析
"""

import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml

from common.logger_handler import logger

# 项目根目录
BASE_DIR = Path(__file__).parent.parent

# 配置文件目录
CONFIG_DIR = os.path.join(BASE_DIR, "config")


class ConfigHandler:
    """配置文件处理类"""
    
    def __init__(self, config_file: str = "config.yaml"):
        """
        初始化配置处理器
        
        Args:
            config_file: 配置文件名，默认为config.yaml
        """
        self.config_file = os.path.join(CONFIG_DIR, config_file)
        self._config = None
        self._load_config()
    
    def _load_config(self) -> None:
        """加载配置文件"""
        try:
            with open(self.config_file, "r", encoding="utf-8") as f:
                self._config = yaml.safe_load(f)
            logger.info(f"成功加载配置文件: {self.config_file}")
        except FileNotFoundError:
            logger.error(f"配置文件不存在: {self.config_file}")
            raise
        except yaml.YAMLError as e:
            logger.error(f"配置文件解析失败: {e}")
            raise
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        获取配置项
        
        Args:
            key: 配置项键，支持点号分隔的多级键，如 "log.level"
            default: 默认值，当配置项不存在时返回
        
        Returns:
            配置项的值
        """
        if not self._config:
            return default
        
        keys = key.split(".")
        value = self._config
        
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default
        
        return value
    
    def get_all(self) -> Dict[str, Any]:
        """
        获取所有配置
        
        Returns:
            所有配置项的字典
        """
        return self._config.copy() if self._config else {}
    
    def reload(self) -> None:
        """重新加载配置文件"""
        self._load_config()


class EnvConfigHandler(ConfigHandler):
    """环境配置处理类"""
    
    def __init__(self, env_file: str = "env.yaml"):
        """
        初始化环境配置处理器
        
        Args:
            env_file: 环境配置文件名，默认为env.yaml
        """
        super().__init__(env_file)
        self.config_handler = ConfigHandler()
        self.current_env = self.config_handler.get("env.current", "dev")
    
    def set_current_env(self, env: str) -> bool:
        """
        切换当前环境，并持久化到config.yaml

        Args:
            env: 环境名称

        Returns:
            是否切换成功
        """
        if not self.get(env):
            logger.warning(f"环境不存在: {env}")
            return False

        self.current_env = env
        try:
            config_path = os.path.join(CONFIG_DIR, "config.yaml")
            with open(config_path, "r", encoding="utf-8") as f:
                config_data = yaml.safe_load(f)
            if config_data is None:
                config_data = {}
            if "env" not in config_data:
                config_data["env"] = {}
            config_data["env"]["current"] = env
            with open(config_path, "w", encoding="utf-8") as f:
                yaml.dump(config_data, f, allow_unicode=True, default_flow_style=False)
            logger.info(f"环境已切换为: {env}")
            return True
        except Exception as e:
            logger.error(f"切换环境失败: {e}")
            return False

    def get_env_list(self) -> List[Dict[str, str]]:
        """
        获取所有环境列表

        Returns:
            环境列表，每项包含 name 和 base_url
        """
        env_list = []
        if not self._config:
            return env_list
        for env_name, env_data in self._config.items():
            if isinstance(env_data, dict):
                env_list.append({
                    "name": env_name,
                    "base_url": env_data.get("base_url", "")
                })
        return env_list

    def get_env_config(self, env: Optional[str] = None) -> Dict[str, Any]:
        """
        获取指定环境的配置
        
        Args:
            env: 环境名称，默认为当前环境
        
        Returns:
            环境配置的字典
        """
        if env is None:
            env = self.current_env
        
        return self.get(env, {})
    
    def get_base_url(self, env: Optional[str] = None) -> str:
        """
        获取指定环境的base_url
        
        Args:
            env: 环境名称，默认为当前环境
        
        Returns:
            环境的base_url
        """
        env_config = self.get_env_config(env)
        return env_config.get("base_url", "")
    
    def get_timeout(self, env: Optional[str] = None) -> int:
        """
        获取指定环境的超时时间
        
        Args:
            env: 环境名称，默认为当前环境
        
        Returns:
            环境的超时时间
        """
        env_config = self.get_env_config(env)
        return env_config.get("timeout", 30)
    
    def get_headers(self, env: Optional[str] = None) -> Dict[str, str]:
        """
        获取指定环境的请求头
        
        Args:
            env: 环境名称，默认为当前环境
        
        Returns:
            环境的请求头
        """
        env_config = self.get_env_config(env)
        return env_config.get("headers", {})


# 创建全局配置实例
config = ConfigHandler()
env_config = EnvConfigHandler()

__all__ = ["ConfigHandler", "EnvConfigHandler", "config", "env_config"]
