import requests
import json
from common.logger_handler import logger
import sys

# 登录并获取token
def login_and_get_token(base_url, credentials):
    """登录并获取token"""
    try:
        # 使用API登录方式
        login_url = f"{base_url}/api/v1/user/login"
        logger.info(f"发送登录请求到: {login_url}")

        # 准备登录数据
        login_data = {
            "email": credentials.get("username"),
            "password": credentials.get("password")
        }
        logger.info(f"登录凭据: {login_data}")

        # 发送登录请求
        response = requests.post(login_url, json=login_data)
        logger.info(f"登录响应状态码: {response.status_code}")

        response.raise_for_status()

        # 解析响应
        result = response.json()
        logger.info(f"登录响应内容: {json.dumps(result, indent=2, ensure_ascii=False)}")

        # 提取token
        if result.get("code") in [0, 20000] and "data" in result and "token" in result["data"]:
            token = result["data"]["token"]
            logger.info("登录成功，获取到token")
            return token
        else:
            error_msg = result.get('message', result.get('msg', '未知错误'))
            logger.error(f"登录失败: {error_msg}")
            logger.error(f"完整响应: {result}")
            return None

    except requests.RequestException as e:
        logger.error(f"登录请求异常: {e}")
        if hasattr(e, 'response') and e.response is not None:
            logger.error(f"响应内容: {e.response.text}")
        return None
    except Exception as e:
        logger.error(f"登录过程中发生错误: {e}")
        return None

# 获取隧道列表
def get_tunnel_list(base_url, token, tunnel_name):
    """获取隧道列表，查找指定名称的隧道并返回其ID和状态"""
    try:
        # 获取隧道列表
        tunnels_url = f"{base_url}/api/v1/tunnels"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(tunnels_url, headers=headers)
        response.raise_for_status()

        # 解析响应
        result = response.json()
        logger.info(f"获取隧道列表响应: {json.dumps(result, indent=2, ensure_ascii=False)}")
        if result.get("code") not in [0, 20000] or "data" not in result or "items" not in result["data"]:
            logger.error("获取隧道列表失败")
            logger.error(f"响应内容: {result}")
            return None, None

        tunnels = result["data"]["items"]
        # 查找指定名称的隧道
        for tunnel in tunnels:
            if tunnel.get("name") == tunnel_name:
                status = tunnel.get("status", "")
                tunnel_id = tunnel.get("id", "")
                logger.info(f"找到隧道 {tunnel_name}，状态: {status}，ID: {tunnel_id}")
                return tunnel_id, status

        logger.error(f"未找到名为 {tunnel_name} 的隧道")
        return None, None

    except requests.RequestException as e:
        logger.error(f"获取隧道列表请求异常: {e}")
        return None, None
    except Exception as e:
        logger.error(f"获取隧道列表过程中发生错误: {e}")
        return None, None

# 启动隧道
def start_tunnel(base_url, token, tunnel_id):
    """启动指定ID的隧道"""
    try:
        # 启动隧道
        start_url = f"{base_url}/api/v1/tunnels/{tunnel_id}/start"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.post(start_url, headers=headers)
        response.raise_for_status()

        # 解析响应
        result = response.json()
        if result.get("code") == 20000:
            logger.info(f"隧道启动成功: {tunnel_id}")
            return True
        else:
            logger.error(f"隧道启动失败: {result.get('msg', '未知错误')}")
            return False

    except requests.RequestException as e:
        logger.error(f"启动隧道请求异常: {e}")
        return False
    except Exception as e:
        logger.error(f"启动隧道过程中发生错误: {e}")
        return False

# 获取隧道公共URL
def get_tunnel_public_url(base_url, token, tunnel_name):
    """获取指定名称的隧道的公共URL"""
    try:
        # 获取隧道列表
        tunnels_url = f"{base_url}/api/v1/tunnels"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(tunnels_url, headers=headers)
        response.raise_for_status()

        # 解析响应
        result = response.json()
        logger.info(f"获取隧道列表响应: {json.dumps(result, indent=2, ensure_ascii=False)}")
        if result.get("code") not in [0, 20000] or "data" not in result or "items" not in result["data"]:
            logger.error("获取隧道列表失败")
            logger.error(f"响应内容: {result}")
            return None

        tunnels = result["data"]["items"]
        # 查找指定名称的隧道
        target_tunnel = None
        for tunnel in tunnels:
            if tunnel.get("name") == tunnel_name:
                target_tunnel = tunnel
                logger.info(f"找到隧道: {tunnel_name}")
                break

        if not target_tunnel:
            logger.error(f"未找到名为 {tunnel_name} 的隧道")
            return None

        status = target_tunnel.get("status", "")
        tunnel_id = target_tunnel.get("id", "")
        logger.info(f"处理隧道: {tunnel_name}, 状态: {status}, ID: {tunnel_id}")

        # 如果状态是active，获取公共URL
        if status == "active":
            public_urls = target_tunnel.get("publish_tunnels", [])
            if public_urls:
                # 优先选择HTTPS协议的URL
                https_url = None
                for url_info in public_urls:
                    logger.info(f"检查URL: {url_info.get('public_url', '')}, 协议: {url_info.get('proto', '')}")
                    if url_info.get("proto") == "https":
                        https_url = url_info.get("public_url", "")
                        logger.info(f"获取到HTTPS公共URL: {https_url}")
                        return https_url

                # 如果没有HTTPS，取第一个公共URL
                public_url = public_urls[0].get("public_url", "")
                logger.info(f"获取到公共URL: {public_url}")
                return public_url
            else:
                logger.error("隧道状态为active但没有公共URL")
                return None
        else:
            logger.error(f"隧道状态不为active: {status}")
            return None

    except requests.RequestException as e:
        logger.error(f"获取隧道公共URL请求异常: {e}")
        return None
    except Exception as e:
        logger.error(f"获取隧道公共URL过程中发生错误: {e}")
        return None

def fetch_tunnel_url(base_url, credentials, tunnel_name):
    """获取指定名称的隧道的公共URL"""
    # 登录获取token
    token = login_and_get_token(base_url, credentials)
    if not token:
        return None

    # 获取隧道列表
    tunnel_id, status = get_tunnel_list(base_url, token, tunnel_name)
    if tunnel_id is None:
        return None

    # 如果隧道状态不是active，则启动隧道
    if status != "active":
        # 使用已经获取的隧道ID启动隧道
        if tunnel_id:
            # 启动隧道
            if not start_tunnel(base_url, token, tunnel_id):
                return None

            # 等待一段时间让隧道启动
            import time
            time.sleep(10)  # 增加等待时间到10秒

            # 重新获取隧道状态
            tunnel_id_new, status_new = get_tunnel_list(base_url, token, tunnel_name)
            logger.info(f"重新获取隧道状态: {status_new}, ID: {tunnel_id_new}")

            # 如果状态变为active，获取公共URL
            if status_new == "active":
                # 使用隧道名称获取公共URL
                public_url = get_tunnel_public_url(base_url, token, tunnel_name)
                logger.info(f"获取到公共URL: {public_url}")
                return public_url
            else:
                logger.error(f"隧道启动后状态仍不为active: {status_new}")
                return None

    # 如果已经是active状态或启动成功后，直接获取公共URL
    return get_tunnel_public_url(base_url, token, tunnel_name)

def fetch_info_from_website(credentials, tunnel_name):
    """从网站获取域名信息（兼容web_app.py的调用）"""
    # 实际上我们不需要从网站获取信息，直接使用API获取隧道URL
    try:
        from common.config_handler import config
        base_url = config.get("domain.base_url", "http://localhost:9200")
    except ImportError:
        base_url = "http://localhost:9200"
    logger.info(f"使用API方式获取隧道 {tunnel_name} 的URL")

    # 处理credentials参数，兼容web_app.py和直接调用
    api_credentials = {
        "username": credentials.get('login') or credentials.get('username'),
        "password": credentials.get('password')
    }
    logger.info(f"API登录凭据: {api_credentials}")

    return fetch_tunnel_url(base_url, api_credentials, tunnel_name)


if __name__ == '__main__':
    # 尝试从配置文件中读取凭据和隧道名称
    try:
        from common.config_handler import config
        base_url = config.get("domain.base_url", "http://localhost:9200")
        credentials = {
            "username": config.get("domain.credentials.login", ""),
            "password": config.get("domain.credentials.password", "")
        }
        default_tunnel_name = config.get("domain.tunnel_name", "api自动化平台")
    except ImportError:
        base_url = "http://localhost:9200"
        default_tunnel_name = "api自动化平台"

    # 检查是否有命令行参数传入
    if len(sys.argv) > 1:
        tunnel_name = sys.argv[1]  # 第一个命令行参数作为隧道名称
    else:
        tunnel_name = default_tunnel_name
        if not tunnel_name:
            print("隧道名称不能为空。")
            sys.exit(1)

    # 获取隧道URL
    links = fetch_tunnel_url(base_url, credentials, tunnel_name)
    if links:
        print(f"获取到的链接: {links}")
        # 将结果保存到变量links中，供外部使用
        globals()['links'] = links
    else:
        print(f"无法获取名为 {tunnel_name} 的隧道链接。")