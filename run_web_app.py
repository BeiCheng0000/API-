
"""
启动Web应用（生产模式，使用Waitress WSGI服务器）
"""

import sys
import os

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 导入Web应用
from web_app import app

if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='API自动化测试平台')
    parser.add_argument('--port', type=int, default=5000, help='服务端口（默认5000）')
    parser.add_argument('--host', type=str, default='0.0.0.0', help='监听地址（默认0.0.0.0）')
    parser.add_argument('--dev', action='store_true', help='开发模式（使用Flask开发服务器）')
    args = parser.parse_args()

    print("正在启动API自动化测试平台Web应用...")
    print(f"请在浏览器中访问: http://localhost:{args.port}")
    print("=" * 50)

    if args.dev:
        # 开发模式：使用Flask内置服务器（支持热重载）
        print("[开发模式] 使用Flask开发服务器")
        app.run(debug=True, host=args.host, port=args.port)
    else:
        # 生产模式：使用Waitress WSGI服务器
        try:
            from waitress import serve
            print(f"[生产模式] 使用Waitress WSGI服务器")
            print(f"监听地址: {args.host}:{args.port}")
            serve(app, host=args.host, port=args.port, threads=4,
                  _quiet=False,
                  expose_tracebacks=True,
                  channel_request_lookahead=10,
                  asyncore_use_poll=True)
        except ImportError:
            print("警告: waitress未安装，回退到Flask开发服务器")
            print("建议执行: pip install waitress")
            app.run(debug=False, host=args.host, port=args.port)
