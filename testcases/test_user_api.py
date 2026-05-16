
"""
用户API测试用例
使用test_data.yaml中的测试数据进行数据驱动测试
"""

import pytest
import allure
from api.base_api import BaseAPI
from common.yaml_handler import YamlHandler
from common.logger_handler import logger
from utils.tools import AssertUtils, JsonUtils


@allure.feature("用户管理")  # 使用allure标注功能为用户管理
@allure.story("用户登录")    # 使用allure标注故事为用户登录
class TestUserLogin:
    """用户登录测试类"""  # 类文档字符串，说明这是一个用户登录测试类

    # 读取登录测试数据，从Yaml文件中获取Tablet部分的测试数据
    login_data = YamlHandler.read_yaml("test_data.yaml").get("Tablet", [])

    @pytest.mark.parametrize("case_data", login_data)  # 参数化测试，使用login_data作为测试数据
    def test_login(self, api_client, case_data):
        """
        测试用户登录

        Args:
            api_client: API客户端fixture，用于发送HTTP请求
            case_data: 测试用例数据，包含URL、方法、请求头、请求数据和期望结果
        """
        with allure.step(f"执行测试用例: {case_data['case_name']}"):  # allure步骤：执行测试用例
            # 获取请求数据，从测试用例数据中提取URL、方法、请求头、数据和期望结果
            url = case_data.get("url")
            method = case_data.get("method")
            headers = case_data.get("headers", {})
            data = case_data.get("data", {})
            expected = case_data.get("expected", {})

            logger.info(f"请求URL: {url}")  # 记录请求URL
            logger.info(f"请求方法: {method}")  # 记录请求方法
            logger.info(f"请求头: {headers}")  # 记录请求头
            logger.info(f"请求数据: {data}")  # 记录请求数据
            logger.info(f"期望结果: {expected}")  # 记录期望结果

        with allure.step("发送请求"):  # allure步骤：发送请求
            # 根据请求方法发送请求，支持GET、POST、PUT、DELETE方法
            if method.upper() == "GET":
                response = api_client.get(url, params=data, headers=headers)
            elif method.upper() == "POST":
                response = api_client.post(url, json=data, headers=headers)
            elif method.upper() == "PUT":
                response = api_client.put(url, json=data, headers=headers)
            elif method.upper() == "DELETE":
                response = api_client.delete(url, headers=headers)
            else:
                raise ValueError(f"不支持的请求方法: {method}")  # 如果请求方法不支持，抛出异常

            logger.info(f"响应状态码: {response['status_code']}")  # 记录响应状态码
            logger.info(f"响应数据: {response['data']}")  # 记录响应数据

        with allure.step("断言响应结果"):  # allure步骤：断言响应结果
            # 断言状态码，检查响应状态码是否与期望的状态码一致
            if "status_code" in expected:
                AssertUtils.assert_equals(
                    response['status_code'],
                    expected['status_code'],
                    f"状态码断言失败"
                )

            # 动态断言响应数据中的字段
            # 从expected[data]中读取断言数据
            if "data" in expected:
                for key, expected_value in expected["data"].items():
                    # 使用JSONPath获取响应数据中对应字段的值
                    actual_value = JsonUtils.get_value(response['data'], f"$.{key}")
                    AssertUtils.assert_equals(
                        actual_value,
                        expected_value,
                        f"{key}断言失败: 期望 {expected_value}, 实际 {actual_value}"
                    )


@allure.feature("用户管理")
@allure.story("用户注册")
class TestUserRegister:
    """用户注册测试类"""

    #
