def save_statistics_data(data, db_handler, STATISTICS_FILE, logger, json, os):
    """
    保存统计数据（优先保存到数据库）

    Args:
        data: 统计数据列表
        db_handler: 数据库处理器
        STATISTICS_FILE: 统计文件路径
        logger: 日志记录器
        json: json模块
        os: os模块

    Returns:
        bool: 保存是否成功
    """
    try:
        # 优先保存到数据库
        if db_handler:
            for record in data:
                # 插入测试统计记录
                db_handler.execute(
                    """INSERT INTO test_statistics
                    (method, url, status_code, response_time, assertion_passed, assertion_count,
                    assertion_passed_count, source, project, module, case_name, request_headers,
                    request_body, response_headers, response_body)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    (
                        record.get('method', ''),
                        record.get('url', ''),
                        record.get('status_code'),
                        record.get('response_time'),
                        record.get('assertion_passed'),
                        record.get('assertion_count', 0),
                        record.get('assertion_passed_count', 0),
                        record.get('source', ''),
                        record.get('project', ''),
                        record.get('module', ''),
                        record.get('case_name', ''),
                        json.dumps(record.get('request_headers', {}), ensure_ascii=False),
                        json.dumps(record.get('request_body'), ensure_ascii=False),
                        json.dumps(record.get('response_headers', {}), ensure_ascii=False),
                        json.dumps(record.get('response_body'), ensure_ascii=False)
                    )
                )

                # 获取刚插入的统计ID
                statistic_id = db_handler.query(
                    "SELECT id FROM test_statistics ORDER BY id DESC LIMIT 1"
                )[0]['id']

                # 插入断言结果
                for assertion in record.get('assertion_results', []):
                    db_handler.execute(
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
            logger.info(f"统计数据已保存到数据库，共 {len(data)} 条记录")
            return True

        # 如果数据库不可用，保存到文件
        os.makedirs(os.path.dirname(STATISTICS_FILE), exist_ok=True)
        with open(STATISTICS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logger.info(f"统计数据已保存到文件: {STATISTICS_FILE}")
        return True

    except Exception as e:
        import traceback
        logger.error(f"保存统计数据时发生异常: {str(e)}")
        logger.error(f"异常堆栈: {traceback.format_exc()}")
        return False
