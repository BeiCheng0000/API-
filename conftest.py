"""
pytest配置文件
定义pytest的钩子和fixture
"""

import os
import pytest
import allure

from api.base_api import BaseAPI
from common.config_handler import config, env_config
from common.logger_handler import logger
from utils.tools import DataUtils, JsonUtils, FileUtils, AssertUtils, StringUtils


@pytest.fixture(scope="session", autouse=True)
def setup_env():
    """
    测试环境初始化
    在所有测试开始前执行
    """
    logger.info("========== 开始执行测试 ==========")
    logger.info(f"当前测试环境: {env_config.current_env}")
    logger.info(f"环境base_url: {env_config.get_base_url()}")
    
    # 确保必要的目录存在
    os.makedirs("reports/allure-results", exist_ok=True)
    os.makedirs("logs", exist_ok=True)
    
    yield
    
    logger.info("========== 测试执行结束 ==========")


@pytest.fixture(scope="function")
def api_client():
    """
    API客户端fixture
    为每个测试函数提供一个API客户端实例
    """
    client = BaseAPI()
    yield client
    client.close()


@pytest.fixture(scope="function")
def test_data(request):
    """
    测试数据fixture
    从测试用例中获取测试数据
    """
    return getattr(request.function, "test_data", None)


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """
    pytest钩子：捕获测试结果
    用于在allure报告中添加测试结果信息
    """
    outcome = yield
    report = outcome.get_result()
    
    # 获取测试函数的docstring
    test_docstring = item.function.__doc__
    if test_docstring:
        allure.dynamic.description(test_docstring)
    
    # 添加测试步骤到allure报告
    if report.when == "call":
        if report.passed:
            allure.step("测试通过")
        elif report.failed:
            allure.step("测试失败")
            # 添加失败截图或日志（如果有）
            if hasattr(item, "obj"):
                # 这里可以添加失败时的截图或日志
                pass
        elif report.skipped:
            allure.step("测试跳过")


# 添加pytest命令行选项
def pytest_addoption(parser):
    """
    添加自定义命令行选项
    """
    parser.addoption(
        "--env", 
        action="store", 
        default="dev", 
        help="测试环境: dev, test, staging, prod"
    )
    parser.addoption(
        "--level", 
        action="store", 
        default="all", 
        help="测试级别: smoke, regression, all"
    )


# 根据命令行选项收集测试用例
def pytest_collection_modifyitems(config, items):
    """
    根据命令行选项过滤测试用例
    """
    level = config.getoption("--level")
    
    if level == "all":
        return
    
    selected_items = []
    deselected_items = []
    
    for item in items:
        if level in item.keywords:
            selected_items.append(item)
        else:
            deselected_items.append(item)
    
    if deselected_items:
        config.hook.pytest_deselected(items=deselected_items)
        items[:] = selected_items
