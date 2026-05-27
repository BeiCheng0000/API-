import requests

from bs4 import BeautifulSoup

import sys


# 登录网站并获取页面内容

def fetch_info_from_website(login_url, info_url, credentials, tunnel_name):
    with requests.Session() as session:
        try:
            # 获取登录页面以抓取csrf token
            login_page = session.get(login_url)
            login_page.raise_for_status()  # 检查请求是否成功
            login_page_soup = BeautifulSoup(login_page.text, 'html.parser')
            # 提取csrf token
            csrf_token = login_page_soup.find('input', {'name': 'csrf_token'})['value']
            credentials['csrf_token'] = csrf_token
            # 登录
            login_response = session.post(login_url, data=credentials)
            # 检查是否登录成功
            if login_response.status_code != 200 or login_response.url == login_url:
                print("登录失败，请检查您的凭据。")
                return []
            else:
                print("登录成功。")
                pass

            # 获取信息页面
            response = session.get(info_url)
            response.raise_for_status()

            # 解析页面
            soup = BeautifulSoup(response.text, 'html.parser')
            table = soup.find('table')

            if not table:
                print("未找到隧道列表，请检查对应设备的cpolar服务和网络连接。")
                return []

            links = []  # 用于存储找到的链接
            for row in table.find_all('tr')[1:]:  # 跳过表头
                cells = row.find_all('td')
                if len(cells) > 1:
                    tunnel = cells[0].get_text().strip()
                    url_cell = row.find('a', href=True)  # 直接在行中查找<a>标签
                    if tunnel == tunnel_name and url_cell:
                        links.append(url_cell['href'])  # 添加匹配的链接
                        # print(f"找到隧道 {tunnel} 的链接: {url_cell['href']}")
            return links

        except requests.RequestException as e:
            print(f"请求异常: {e}")
        except Exception as e:
            print(f"发生错误: {e}")


if __name__ == '__main__':
    login_url = "https://dashboard.cpolar.com/login"
    info_url = "https://dashboard.cpolar.com/status"
    credentials = {
        'login': '941433717@qq.com',
        'password': 'k941433717',
    }

    # 检查是否有命令行参数传入

    if len(sys.argv) > 1:
        tunnel_name = sys.argv[1]  # 第一个命令行参数作为隧道名称
    else:
        tunnel_name = 'api自动化平台'
        if not tunnel_name:
            print("隧道名称不能为空。")
            sys.exit(1)

    links = fetch_info_from_website(login_url, info_url, credentials, tunnel_name)
    if links:
        print(links)
    else:
        print(f"没有找到名为 {tunnel_name} 的隧道链接。")