"""
API 接口封装模块

提供通用的 API 请求封装，基于 requests 库。
所有业务 API 类应继承 BaseAPI，自动获得以下能力：
- 自动拼接 base_url（根据当前环境配置）
- Session 复用（减少 TCP 连接开销）
- 统一的响应处理（自动解析 JSON）
- 请求日志记录

使用示例::

    from api import BaseAPI

    class UserAPI(BaseAPI):
        def login(self, username, password):
            return self.post("/user/login", json={"username": username, "password": password})

        def get_info(self, user_id):
            return self.get(f"/user/{user_id}")

    # 在测试中使用
    user_api = UserAPI()
    result = user_api.login("testuser", "123456")
    user_api.close()
"""

from api.base_api import BaseAPI

__all__ = ["BaseAPI"]
