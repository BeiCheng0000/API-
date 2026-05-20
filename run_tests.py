"""
测试执行入口文件
用于执行测试用例和生成测试报告
"""

import os
import sys
import argparse
import subprocess
from pathlib import Path

# 添加项目根目录到Python路径
BASE_DIR = Path(__file__).parent
sys.path.insert(0, str(BASE_DIR))

# 在所有业务模块导入之前加载 .env 环境变量
from dotenv import load_dotenv
load_dotenv()

from common.logger_handler import logger
from common.config_handler import env_config


def run_tests(env=None, level=None, markers=None, verbose=False, parallel=False, workers=None):
    """
    执行测试用例
    
    Args:
        env: 测试环境
        level: 测试级别
        markers: pytest标记
        verbose: 是否显示详细输出
        parallel: 是否并行执行
        workers: 并行执行的工作进程数
    """
    # 构建pytest命令
    cmd = ["pytest"]

    # 添加忽略警告配置
    cmd.extend(["-W", "ignore::DeprecationWarning"])
    
    # 添加环境参数
    if env:
        cmd.extend(["--env", env])
    
    # 添加测试级别参数
    if level and level != "all":
        cmd.extend(["-m", level])
    
    # 添加标记参数
    if markers:
        cmd.extend(["-m", markers])
    
    # 添加详细输出参数
    if verbose:
        cmd.append("-v")
    else:
        cmd.append("-q")
    
    # 添加并行执行参数
    if parallel:
        cmd.extend(["-n", str(workers or "auto")])
    
    # 添加allure报告参数
    cmd.extend(["--alluredir=./reports/allure-results", "--clean-alluredir"])
    
    logger.info(f"执行测试命令: {' '.join(cmd)}")
    
    # 执行测试
    result = subprocess.run(cmd, cwd=BASE_DIR)
    
    # 返回执行结果
    return result.returncode


def generate_report():
    """生成allure测试报告"""
    # 确保报告目录存在
    os.makedirs("./reports/allure-report", exist_ok=True)
    
    # 生成allure报告
    cmd = ["allure", "generate", "./reports/allure-results", "-o", "./reports/allure-report", "--clean"]
    logger.info(f"生成测试报告命令: {' '.join(cmd)}")
    
    # 执行命令
    result = subprocess.run(cmd, cwd=BASE_DIR)
    
    # 返回执行结果
    return result.returncode


def open_report():
    """打开allure测试报告"""
    # 打开allure报告
    cmd = ["allure", "open", "./reports/allure-report"]
    logger.info(f"打开测试报告命令: {' '.join(cmd)}")
    
    # 执行命令
    result = subprocess.run(cmd, cwd=BASE_DIR)
    
    # 返回执行结果
    return result.returncode


def main():
    """主函数"""
    # 解析命令行参数
    parser = argparse.ArgumentParser(description="接口自动化测试平台")
    
    # 添加环境参数
    parser.add_argument("--env", type=str, default=env_config.current_env,
                       choices=["dev", "test", "staging", "prod"],
                       help="测试环境")
    
    # 添加测试级别参数
    parser.add_argument("--level", type=str, default="all",
                       choices=["all", "smoke", "regression"],
                       help="测试级别")
    
    # 添加标记参数
    parser.add_argument("--markers", type=str, default=None,
                       help="pytest标记")
    
    # 添加详细输出参数
    parser.add_argument("-v", "--verbose", action="store_true",
                       help="显示详细输出")
    
    # 添加并行执行参数
    parser.add_argument("-p", "--parallel", action="store_true",
                       help="并行执行测试")
    
    # 添加工作进程数参数
    parser.add_argument("--workers", type=int, default=None,
                       help="并行执行的工作进程数")
    
    # 添加生成报告参数
    parser.add_argument("--report", action="store_true",
                       help="生成测试报告")
    
    # 添加打开报告参数
    parser.add_argument("--open", action="store_true",
                       help="打开测试报告")
    
    # 解析参数
    args = parser.parse_args()
    
    # 执行测试
    result = run_tests(
        env=args.env,
        level=args.level,
        markers=args.markers,
        verbose=args.verbose,
        parallel=args.parallel,
        workers=args.workers
    )
    
    # 生成报告
    if args.report or args.open:
        generate_report()
    
    # 打开报告
    if args.open:
        open_report()
    
    # 返回执行结果
    return result


if __name__ == "__main__":
    sys.exit(main())
