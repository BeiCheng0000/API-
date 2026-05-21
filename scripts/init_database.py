
"""
数据库初始化脚本
用于创建数据库、表结构，并将data目录中的数据导入到MySQL数据库中
"""

import json
import sys
import yaml
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from common.db_handler import MySQLHandler
from common.logger_handler import logger


def _safe_json_value(value, ensure_ascii=False):
    """
    安全地将值序列化为 JSON 字符串。

    对于字典/列表：直接 json.dumps
    对于字符串：尝试解析为 JSON，成功则原样序列化；失败则包装为 {"_raw": 原始文本}
    对于 None/空值：返回 '{}'

    Args:
        value: 要序列化的值
        ensure_ascii: 是否转义非 ASCII 字符

    Returns:
        str: 合法的 JSON 字符串
    """
    if value is None or value == '':
        return '{}'
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=ensure_ascii)
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, (dict, list)):
                return json.dumps(parsed, ensure_ascii=ensure_ascii)
            return json.dumps({'_raw': value}, ensure_ascii=ensure_ascii)
        except (json.JSONDecodeError, ValueError):
            return json.dumps({'_raw': value}, ensure_ascii=ensure_ascii)
    return json.dumps({'_raw': str(value)}, ensure_ascii=ensure_ascii)


class DatabaseInitializer:
    """数据库初始化类"""

    def __init__(self):
        """初始化数据库初始化器"""
        self.db_handler = MySQLHandler()
        self.project_root = Path(__file__).parent.parent
        self.data_dir = self.project_root / "data"

    def create_database(self):
        """创建数据库"""
        try:
            # 先连接到MySQL服务器（不指定数据库）
            import pymysql
            db_config = self.db_handler.db_config
            connection = pymysql.connect(
                host=db_config.get("host", "localhost"),
                port=db_config.get("port", 3306),
                user=db_config.get("user", "root"),
                password=db_config.get("password", ""),
                charset=db_config.get("charset", "utf8mb4")
            )
            cursor = connection.cursor()

            # 创建数据库
            db_name = db_config.get("database", "test_db")
            try:
                cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
                connection.commit()
                logger.info(f"数据库 {db_name} 创建成功")
            except pymysql.err.OperationalError as e:
                if e.args[0] == 1044:  # 权限不足错误
                    logger.warning(f"当前用户没有创建数据库的权限，尝试使用现有数据库 {db_name}")
                    # 尝试连接到现有数据库
                    try:
                        test_connection = pymysql.connect(
                            host=db_config.get("host", "localhost"),
                            port=db_config.get("port", 3306),
                            user=db_config.get("user", "root"),
                            password=db_config.get("password", ""),
                            database=db_name,
                            charset=db_config.get("charset", "utf8mb4")
                        )
                        test_connection.close()
                        logger.info(f"数据库 {db_name} 已存在，可以继续操作")
                    except Exception:
                        logger.error(f"数据库 {db_name} 不存在且无创建权限，请联系管理员创建数据库")
                        raise
                else:
                    raise

            cursor.close()
            connection.close()
        except Exception as e:
            logger.error(f"创建数据库失败: {e}")
            raise

    def create_tables(self):
        """创建所有需要的表"""
        self.create_projects_table()
        self.create_modules_table()
        self.create_apis_table()
        self.create_environments_table()
        self.create_variables_table()
        self.create_scheduler_jobs_table()
        self.create_test_statistics_table()
        self.create_assertion_results_table()
        self.ensure_statistics_indexes()
        logger.info("所有表创建成功")

    def ensure_statistics_indexes(self):
        """确保test_statistics表有所有必要的索引（兼容已有数据库，缺失则添加）"""
        try:
            existing = self.db_handler.query("SHOW INDEX FROM test_statistics")
            existing_indexes = set(r['Key_name'] for r in existing)
            needed_indexes = {
                'idx_method': 'ALTER TABLE test_statistics ADD INDEX idx_method (method)',
                'idx_status_code': 'ALTER TABLE test_statistics ADD INDEX idx_status_code (status_code)',
                'idx_assertion_passed': 'ALTER TABLE test_statistics ADD INDEX idx_assertion_passed (assertion_passed)',
                'idx_timestamp': 'ALTER TABLE test_statistics ADD INDEX idx_timestamp (timestamp)',
            }
            for idx_name, sql in needed_indexes.items():
                if idx_name not in existing_indexes:
                    try:
                        self.db_handler.execute(sql)
                        logger.info(f"添加索引 {idx_name} 成功")
                    except Exception as e:
                        logger.warning(f"添加索引 {idx_name} 失败（可能已存在）: {e}")
        except Exception as e:
            logger.warning(f"检查/添加索引时出错: {e}")

    def create_projects_table(self):
        """创建项目表"""
        sql = """
        CREATE TABLE IF NOT EXISTS `projects` (
            `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '项目ID',
            `name` VARCHAR(255) NOT NULL UNIQUE COMMENT '项目名称',
            `description` TEXT COMMENT '项目描述',
            `current_env` VARCHAR(255) DEFAULT '' COMMENT '当前激活的环境名称',
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
            INDEX `idx_name` (`name`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目表'
        """
        self.db_handler.execute(sql)
        # 兼容已有数据库，添加current_env字段
        try:
            self.db_handler.execute("ALTER TABLE projects ADD COLUMN `current_env` VARCHAR(255) DEFAULT '' COMMENT '当前激活的环境名称'")
        except Exception:
            pass  # 字段已存在
        logger.info("项目表创建成功")

    def create_modules_table(self):
        """创建模块表"""
        sql = """
        CREATE TABLE IF NOT EXISTS `modules` (
            `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '模块ID',
            `project_id` INT NOT NULL COMMENT '项目ID',
            `name` VARCHAR(255) NOT NULL COMMENT '模块名称',
            `description` TEXT COMMENT '模块描述',
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
            FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
            UNIQUE KEY `uk_project_module` (`project_id`, `name`),
            INDEX `idx_project_id` (`project_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模块表'
        """
        self.db_handler.execute(sql)
        logger.info("模块表创建成功")

    def create_apis_table(self):
        """创建API表"""
        sql = """
        CREATE TABLE IF NOT EXISTS `apis` (
            `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'API ID',
            `module_id` INT NOT NULL COMMENT '模块ID',
            `case_name` VARCHAR(255) NOT NULL COMMENT '用例名称',
            `url` TEXT NOT NULL COMMENT 'API URL',
            `method` VARCHAR(10) NOT NULL COMMENT 'HTTP方法',
            `headers` JSON COMMENT '请求头',
            `data` TEXT COMMENT '请求数据',
            `expected` JSON COMMENT '期望结果',
            `extractions` JSON COMMENT '数据提取规则',
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
            FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON DELETE CASCADE,
            INDEX `idx_module_id` (`module_id`),
            INDEX `idx_case_name` (`case_name`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API表'
        """
        self.db_handler.execute(sql)
        logger.info("API表创建成功")

    def create_environments_table(self):
        """创建环境表"""
        sql = """
        CREATE TABLE IF NOT EXISTS `environments` (
            `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '环境ID',
            `project_id` INT NOT NULL COMMENT '项目ID',
            `name` VARCHAR(255) NOT NULL COMMENT '环境名称',
            `base_url` TEXT NOT NULL COMMENT '基础URL',
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
            FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
            UNIQUE KEY `uk_project_env` (`project_id`, `name`),
            INDEX `idx_project_id` (`project_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='环境表'
        """
        self.db_handler.execute(sql)
        logger.info("环境表创建成功")

    def create_variables_table(self):
        """创建变量表"""
        sql = """
        CREATE TABLE IF NOT EXISTS `variables` (
            `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '变量ID',
            `project_id` INT NOT NULL COMMENT '项目ID',
            `name` VARCHAR(255) NOT NULL COMMENT '变量名',
            `value` TEXT COMMENT '变量值',
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
            FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
            UNIQUE KEY `uk_project_var` (`project_id`, `name`),
            INDEX `idx_project_id` (`project_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='变量表'
        """
        self.db_handler.execute(sql)
        logger.info("变量表创建成功")

    def create_scheduler_jobs_table(self):
        """创建定时任务表"""
        sql = """
        CREATE TABLE IF NOT EXISTS `scheduler_jobs` (
            `id` VARCHAR(255) PRIMARY KEY COMMENT '任务ID',
            `name` VARCHAR(255) NOT NULL COMMENT '任务名称',
            `project_name` VARCHAR(255) NOT NULL COMMENT '项目名称',
            `module_name` VARCHAR(255) NOT NULL COMMENT '模块名称',
            `case_index` INT NOT NULL COMMENT '用例索引',
            `cron_expression` VARCHAR(100) NOT NULL COMMENT 'Cron表达式',
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
            INDEX `idx_project` (`project_name`),
            INDEX `idx_module` (`module_name`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='定时任务表'
        """
        self.db_handler.execute(sql)
        logger.info("定时任务表创建成功")

    def create_test_statistics_table(self):
        """创建测试统计表"""
        sql = """
        CREATE TABLE IF NOT EXISTS `test_statistics` (
            `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '统计ID',
            `method` VARCHAR(10) NOT NULL COMMENT 'HTTP方法',
            `url` TEXT NOT NULL COMMENT '请求URL',
            `status_code` INT COMMENT '响应状态码',
            `response_time` FLOAT COMMENT '响应时间(ms)',
            `assertion_passed` BOOLEAN COMMENT '断言是否通过',
            `assertion_count` INT COMMENT '断言总数',
            `assertion_passed_count` INT COMMENT '通过的断言数',
            `source` VARCHAR(50) COMMENT '来源(手动/定时)',
            `project` VARCHAR(255) COMMENT '项目名称',
            `module` VARCHAR(255) COMMENT '模块名称',
            `case_name` VARCHAR(255) COMMENT '用例名称',
            `request_headers` JSON COMMENT '请求头',
            `request_body` TEXT COMMENT '请求体',
            `response_headers` JSON COMMENT '响应头',
            `response_body` TEXT COMMENT '响应体',
            `timestamp` VARCHAR(30) COMMENT '记录时间戳(前端展示用)',
            `error` TEXT COMMENT '错误信息',
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
            INDEX `idx_project` (`project`),
            INDEX `idx_module` (`module`),
            INDEX `idx_case_name` (`case_name`),
            INDEX `idx_created_at` (`created_at`),
            INDEX `idx_method` (`method`),
            INDEX `idx_status_code` (`status_code`),
            INDEX `idx_assertion_passed` (`assertion_passed`),
            INDEX `idx_timestamp` (`timestamp`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='测试统计表'
        """
        self.db_handler.execute(sql)
        logger.info("测试统计表创建成功")

    def create_assertion_results_table(self):
        """创建断言结果表"""
        sql = """
        CREATE TABLE IF NOT EXISTS `assertion_results` (
            `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '断言结果ID',
            `statistic_id` INT NOT NULL COMMENT '统计ID',
            `type` VARCHAR(50) NOT NULL COMMENT '断言类型',
            `field` VARCHAR(255) COMMENT '字段名',
            `expected` TEXT COMMENT '期望值',
            `actual` TEXT COMMENT '实际值',
            `passed` BOOLEAN COMMENT '是否通过',
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
            FOREIGN KEY (`statistic_id`) REFERENCES `test_statistics`(`id`) ON DELETE CASCADE,
            INDEX `idx_statistic_id` (`statistic_id`),
            INDEX `idx_type` (`type`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='断言结果表'
        """
        self.db_handler.execute(sql)
        logger.info("断言结果表创建成功")

    def import_projects_data(self):
        """导入项目数据"""
        projects_file = self.data_dir / "projects.yaml"
        if not projects_file.exists():
            logger.warning(f"项目文件不存在: {projects_file}")
            return

        with open(projects_file, 'r', encoding='utf-8') as f:
            projects_data = yaml.safe_load(f)

        for project_name, project_info in projects_data.items():
            # 插入项目
            self.db_handler.execute(
                "INSERT INTO projects (name, description) VALUES (%s, %s) "
                "ON DUPLICATE KEY UPDATE description = VALUES(description)",
                (project_name, project_info.get('description', ''))
            )

            # 获取项目ID
            project_id = self.db_handler.query(
                "SELECT id FROM projects WHERE name = %s",
                (project_name,)
            )[0]['id']

            # 导入环境
            for env_name, env_info in project_info.get('envs', {}).items():
                self.db_handler.execute(
                    "INSERT INTO environments (project_id, name, base_url) VALUES (%s, %s, %s) "
                    "ON DUPLICATE KEY UPDATE base_url = VALUES(base_url)",
                    (project_id, env_name, env_info.get('base_url', ''))
                )

            # 导入变量
            for var_name, var_value in project_info.get('variables', {}).items():
                self.db_handler.execute(
                    "INSERT INTO variables (project_id, name, value) VALUES (%s, %s, %s) "
                    "ON DUPLICATE KEY UPDATE value = VALUES(value)",
                    (project_id, var_name, var_value)
                )

            # 导入模块和API
            for module_name, module_info in project_info.get('modules', {}).items():
                # 插入模块
                self.db_handler.execute(
                    "INSERT INTO modules (project_id, name, description) VALUES (%s, %s, %s) "
                    "ON DUPLICATE KEY UPDATE description = VALUES(description)",
                    (project_id, module_name, module_info.get('description', ''))
                )

                # 获取模块ID
                module_id = self.db_handler.query(
                    "SELECT id FROM modules WHERE project_id = %s AND name = %s",
                    (project_id, module_name)
                )[0]['id']

                # 导入API
                for api_info in module_info.get('apis', []):
                    self.db_handler.execute(
                        """INSERT INTO apis 
                        (module_id, case_name, url, method, headers, data, expected, extractions)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        ON DUPLICATE KEY UPDATE 
                        url = VALUES(url), method = VALUES(method), headers = VALUES(headers),
                        data = VALUES(data), expected = VALUES(expected), extractions = VALUES(extractions)""",
                        (
                            module_id,
                            api_info.get('case_name', ''),
                            api_info.get('url', ''),
                            api_info.get('method', ''),
                            json.dumps(api_info.get('headers', {}), ensure_ascii=False),
                            _safe_json_value(api_info.get('data', {}), ensure_ascii=False),
                            json.dumps(api_info.get('expected', {}), ensure_ascii=False),
                            json.dumps(api_info.get('extractions', {}), ensure_ascii=False)
                        )
                    )

        logger.info("项目数据导入成功")

    def import_scheduler_jobs_data(self):
        """导入定时任务数据"""
        jobs_file = self.data_dir / "scheduler_jobs.json"
        if not jobs_file.exists():
            logger.warning(f"定时任务文件不存在: {jobs_file}")
            return

        with open(jobs_file, 'r', encoding='utf-8') as f:
            jobs_data = json.load(f)

        for job in jobs_data:
            self.db_handler.execute(
                """INSERT INTO scheduler_jobs 
                (id, name, project_name, module_name, case_index, cron_expression)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE 
                name = VALUES(name), cron_expression = VALUES(cron_expression)""",
                (
                    job.get('id', ''),
                    job.get('name', ''),
                    job.get('project_name', ''),
                    job.get('module_name', ''),
                    job.get('case_index', 0),
                    job.get('cron_expression', '')
                )
            )

        logger.info("定时任务数据导入成功")

    def import_statistics_data(self):
        """导入测试统计数据"""
        stats_file = self.data_dir / "statistics.json"
        if not stats_file.exists():
            logger.warning(f"统计数据文件不存在: {stats_file}")
            return

        # 读取统计数据，增加 JSON 解析容错处理
        try:
            with open(stats_file, 'r', encoding='utf-8') as f:
                stats_data = json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"统计数据文件 JSON 格式错误: {e}，尝试修复...")
            try:
                with open(stats_file, 'r', encoding='utf-8') as f:
                    content = f.read().strip()
                if content.startswith('[') and not content.endswith(']'):
                    # 逐个尝试截断位置，从最后一个 } 往前找，直到找到合法的 JSON
                    fixed_data = None
                    search_pos = content.rfind('}')
                    while search_pos > 0 and fixed_data is None:
                        try:
                            candidate = content[:search_pos + 1] + ']'
                            fixed_data = json.loads(candidate)
                        except json.JSONDecodeError:
                            # 往前找上一个 }
                            search_pos = content.rfind('}', 0, search_pos)
                            continue
                    if fixed_data is not None:
                        stats_data = fixed_data
                        logger.info(f"JSON 修复成功，恢复了 {len(stats_data)} 条记录")
                        with open(stats_file, 'w', encoding='utf-8') as f:
                            json.dump(stats_data, f, ensure_ascii=False, indent=2)
                        logger.info("已将修复后的数据回写到文件")
                    else:
                        logger.error("无法修复 JSON 文件（找不到合法截断点），跳过统计数据导入")
                        return
                else:
                    logger.error(f"无法修复 JSON 文件，跳过统计数据导入: {e}")
                    return
            except Exception as fix_err:
                logger.error(f"修复 JSON 文件失败: {fix_err}，跳过统计数据导入")
                return

        if not isinstance(stats_data, list):
            logger.warning(f"统计数据格式异常（期望列表，实际为 {type(stats_data).__name__}），跳过导入")
            return

        for stat in stats_data:
            if not isinstance(stat, dict):
                continue
            # 插入测试统计
            self.db_handler.execute(
                """INSERT INTO test_statistics 
                (method, url, status_code, response_time, assertion_passed, assertion_count,
                assertion_passed_count, source, project, module, case_name, request_headers,
                request_body, response_headers, response_body, timestamp, error)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (
                    stat.get('method', ''),
                    stat.get('url', ''),
                    stat.get('status_code'),
                    stat.get('response_time'),
                    stat.get('assertion_passed'),
                    stat.get('assertion_count', 0),
                    stat.get('assertion_passed_count', 0),
                    stat.get('source', ''),
                    stat.get('project', ''),
                    stat.get('module', ''),
                    stat.get('case_name', ''),
                    json.dumps(stat.get('request_headers', {}), ensure_ascii=False),
                    _safe_json_value(stat.get('request_body'), ensure_ascii=False),
                    json.dumps(stat.get('response_headers', {}), ensure_ascii=False),
                    _safe_json_value(stat.get('response_body'), ensure_ascii=False),
                    stat.get('timestamp', '') or '',
                    stat.get('error', '') or ''
                )
            )

            # 获取统计ID
            statistic_id = self.db_handler.query(
                "SELECT id FROM test_statistics ORDER BY id DESC LIMIT 1"
            )[0]['id']

            # 插入断言结果
            for assertion in stat.get('assertion_results', []):
                self.db_handler.execute(
                    """INSERT INTO assertion_results 
                    (statistic_id, type, field, expected, actual, passed)
                    VALUES (%s, %s, %s, %s, %s, %s)""",
                    (
                        statistic_id,
                        assertion.get('type', ''),
                        assertion.get('field', ''),
                        str(assertion.get('expected', '')),
                        str(assertion.get('actual', '')),
                        assertion.get('passed', False)
                    )
                )

        logger.info(f"测试统计数据导入成功，共 {len(stats_data)} 条记录")

    def migrate_add_timestamp_and_error_columns(self):
        """数据库迁移：为 test_statistics 表添加 timestamp 和 error 字段（兼容已有数据库）"""
        try:
            # 检查 timestamp 列是否已存在
            columns = self.db_handler.query(
                "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'test_statistics'"
            )
            column_names = [col['COLUMN_NAME'] for col in columns] if columns else []

            if 'timestamp' not in column_names:
                self.db_handler.execute(
                    "ALTER TABLE test_statistics ADD COLUMN `timestamp` VARCHAR(30) COMMENT '记录时间戳(前端展示用)' AFTER `response_body`"
                )
                logger.info("已添加 timestamp 字段到 test_statistics 表")
            else:
                logger.info("timestamp 字段已存在，跳过迁移")

            if 'error' not in column_names:
                self.db_handler.execute(
                    "ALTER TABLE test_statistics ADD COLUMN `error` TEXT COMMENT '错误信息' AFTER `timestamp`"
                )
                logger.info("已添加 error 字段到 test_statistics 表")
            else:
                logger.info("error 字段已存在，跳过迁移")

            # 将已有记录的 created_at 值同步到 timestamp 字段
            # 注意：SQL中的%需要转义为%%，因为Python的execute会把%当作格式化占位符
            self.db_handler.execute(
                "UPDATE test_statistics SET timestamp = DATE_FORMAT(created_at, '%%Y-%%m-%%d %%H:%%i:%%s') WHERE timestamp IS NULL OR timestamp = ''"
            )
            logger.info("已将已有记录的 created_at 同步到 timestamp 字段")

        except Exception as e:
            logger.warning(f"数据库迁移（添加 timestamp/error 字段）失败: {e}，如果是新数据库则无需迁移")

    def run(self):
        """执行完整的数据库初始化流程"""
        try:
            logger.info("开始数据库初始化...")

            # 创建数据库
            self.create_database()

            # 连接到数据库
            self.db_handler.connect()

            # 创建表
            self.create_tables()

            # 数据库迁移：为已有表添加新字段
            self.migrate_add_timestamp_and_error_columns()

            # 导入数据
            self.import_projects_data()
            self.import_scheduler_jobs_data()
            self.import_statistics_data()

            logger.info("数据库初始化完成！")

        except Exception as e:
            logger.error(f"数据库初始化失败: {e}")
            raise
        finally:
            self.db_handler.close()


if __name__ == "__main__":
    initializer = DatabaseInitializer()
    initializer.run()
