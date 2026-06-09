"""
邮件发送工具类
用于发送报警邮件
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from typing import List, Optional
from common.logger_handler import logger
from common.config_handler import config


class EmailHandler:
    """邮件发送处理器"""

    def __init__(self):
        """初始化邮件发送器"""
        self.smtp_server = config.get('email.smtp_server', '')
        self.smtp_port = int(config.get('email.smtp_port', 587))
        self.sender = config.get('email.sender', '')
        # 优先从环境变量读取密码，如果没有则从配置文件读取
        import os
        env_password = os.environ.get('EMAIL_PASSWORD')
        self.password = env_password or config.get('email.password', '')
        self.sender_name = config.get('project.name', 'API自动化测试平台')

        # 日志记录配置信息（敏感信息脱敏）
        logger.info(f"[邮件配置] smtp_server={self.smtp_server}, smtp_port={self.smtp_port}, sender={self.sender}, password={'已配置' if self.password else '未配置'}")

        # 检查配置是否完整
        if not all([self.smtp_server, self.sender, self.password]):
            logger.warning("邮件配置不完整，无法发送邮件")

    def send_email(
        self,
        to_emails: List[str],
        subject: str,
        content: str,
        content_type: str = 'html'
    ) -> bool:
        """
        发送邮件

        Args:
            to_emails: 收件人邮箱列表
            subject: 邮件主题
            content: 邮件内容
            content_type: 内容类型，'html' 或 'plain'

        Returns:
            bool: 是否发送成功
        """
        # 检查配置
        if not all([self.smtp_server, self.sender, self.password]):
            logger.error("邮件配置不完整，无法发送邮件")
            return False

        if not to_emails:
            logger.error("收件人邮箱为空")
            return False

        try:
            # 创建邮件对象
            msg = MIMEMultipart()
            msg['From'] = formataddr((self.sender_name, self.sender))
            msg['To'] = ', '.join(to_emails)
            msg['Subject'] = subject

            # 添加邮件内容
            if content_type == 'html':
                msg.attach(MIMEText(content, 'html', 'utf-8'))
            else:
                msg.attach(MIMEText(content, 'plain', 'utf-8'))

            # 连接SMTP服务器并发送邮件
            # QQ邮箱使用SSL加密连接（端口465）
            logger.info(f"[邮件发送] 开始连接SMTP服务器: {self.smtp_server}:{self.smtp_port}")

            # 创建SMTP_SSL连接，设置超时时间
            server = smtplib.SMTP_SSL(self.smtp_server, self.smtp_port, timeout=30)
            logger.info("[邮件发送] SMTP连接成功，开始登录")
            server.login(self.sender, self.password)
            logger.info("[邮件发送] 登录成功，开始发送邮件")
            server.sendmail(self.sender, to_emails, msg.as_string())
            logger.info("[邮件发送] 邮件发送完成")
            server.quit()

            logger.info(f"邮件发送成功: {subject} -> {to_emails}")
            return True

        except Exception as e:
            logger.error(f"邮件发送失败: {e}", exc_info=True)
            return False

    def send_alert_email(
        self,
        to_email,
        project_name: str,
        module_name: str,
        case_name: str,
        result: dict
    ) -> bool:
        """
        发送报警邮件

        Args:
            to_email: 收件人邮箱，支持单个邮箱字符串或邮箱列表
            project_name: 项目名称
            module_name: 模块名称
            case_name: 用例名称
            result: 测试结果

        Returns:
            bool: 是否发送成功
        """
        # 统一处理为邮箱列表
        if isinstance(to_email, str):
            to_emails = [e.strip() for e in to_email.split(',') if e.strip()]
        else:
            to_emails = list(to_email)
        # 构建邮件主题
        subject = f"[报警] {project_name}/{module_name} - {case_name} 断言失败"

        # 构建邮件内容
        content = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; }}
                .container {{ max-width: 800px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #f44336; color: white; padding: 15px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f9f9f9; }}
                .info {{ margin-bottom: 15px; }}
                .label {{ font-weight: bold; }}
                .assertion-failed {{ color: #f44336; }}
                .assertion-passed {{ color: #4caf50; }}
                table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>⚠️ 接口测试断言失败报警</h2>
                </div>
                <div class="content">
                    <div class="info">
                        <span class="label">项目：</span>{project_name}
                    </div>
                    <div class="info">
                        <span class="label">模块：</span>{module_name}
                    </div>
                    <div class="info">
                        <span class="label">用例：</span>{case_name}
                    </div>
                    <div class="info">
                        <span class="label">请求方法：</span>{result.get('request_method', 'N/A')}
                    </div>
                    <div class="info">
                        <span class="label">请求URL：</span>{result.get('request_url', 'N/A')}
                    </div>
                    <div class="info">
                        <span class="label">响应状态码：</span>{result.get('status_code', 'N/A')}
                    </div>
                    <div class="info">
                        <span class="label">响应时间：</span>{result.get('response_time', 'N/A')} ms
                    </div>

                    <h3>断言结果：</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>类型</th>
                                <th>字段</th>
                                <th>期望值</th>
                                <th>实际值</th>
                                <th>结果</th>
                            </tr>
                        </thead>
                        <tbody>
        """

        # 添加断言结果
        for assertion in result.get('assertion_results', []):
            passed = assertion.get('passed', False)
            result_class = 'assertion-passed' if passed else 'assertion-failed'
            result_text = '通过' if passed else '失败'

            content += f"""
                            <tr class="{result_class}">
                                <td>{assertion.get('type', 'N/A')}</td>
                                <td>{assertion.get('field', '-')}</td>
                                <td>{assertion.get('expected', 'N/A')}</td>
                                <td>{assertion.get('actual', 'N/A')}</td>
                                <td>{result_text}</td>
                            </tr>
            """

        content += """
                        </tbody>
                    </table>

                    <p style="margin-top: 20px; color: #666; font-size: 12px;">
                        此邮件由API自动化测试平台自动发送，请勿回复。
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

        return self.send_email(to_emails, subject, content, 'html')


# 创建全局邮件发送器实例
email_handler = EmailHandler()
