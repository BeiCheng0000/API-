from common.db_handler import MySQLHandler
from common.logger_handler import logger
from functools import wraps
import time


def clear_project_cache():
    """Clear project related cache - use lazy import to avoid circular import"""
    logger.info("Clearing project cache")
    # Lazy import to avoid circular import
    from web_app import projects_cache, stats_cache, scheduler_cache
    projects_cache.clear()
    stats_cache.clear()
    scheduler_cache.clear()


def bypass_cache(func):
    """
    Decorator: bypass cache mechanism, get latest data directly from database
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        # Clear related cache
        clear_project_cache()
        # Execute original function
        return func(*args, **kwargs)
    return wrapper


def _get_projects_directly():
    """
    Get project data directly from database, without cache
    """
    try:
        # Clear cache before getting data to ensure we get the latest data
        clear_project_cache()

        db_handler = MySQLHandler()
        db_handler.connect()

        result = {}

        # 1. Use JOIN query to get all projects, modules and API data at once
        query = """
        SELECT
            p.id as project_id, p.name as project_name, p.description as project_desc, p.current_env as project_current_env,
            m.id as module_id, m.name as module_name, m.description as module_desc,
            a.id as api_id, a.case_name, a.url, a.method, a.headers, a.data, a.expected, a.extractions
        FROM projects p
        LEFT JOIN modules m ON p.id = m.project_id
        LEFT JOIN apis a ON m.id = a.module_id
        ORDER BY p.id, m.id, a.id
        """

        all_data = db_handler.query(query)

        # Organize data by project
        projects_dict = {}
        for row in all_data:
            project_id = row['project_id']
            project_name = row['project_name']

            if project_id not in projects_dict:
                projects_dict[project_id] = {
                    'name': project_name,
                    'description': row['project_desc'] or '',
                    'current_env': row['project_current_env'] or '',
                    'modules': {},
                    'envs': {},
                    'variables': {}
                }

            # Process module data
            module_id = row['module_id']
            if module_id and module_id not in projects_dict[project_id]['modules']:
                projects_dict[project_id]['modules'][row['module_name']] = {
                    'description': row['module_desc'] or '',
                    'apis': []
                }

            # Process API data
            api_id = row['api_id']
            if api_id:
                api_item = {
                    'case_name': row['case_name'] or '',
                    'url': row['url'] or '',
                    'method': row['method'] or 'GET',
                    'headers': row['headers'] if isinstance(row['headers'], dict) else {},
                    'data': row['data'] if isinstance(row['data'], (dict, str)) else {},
                    'expected': row['expected'] if isinstance(row['expected'], dict) else {},
                    'extractions': row['extractions'] if isinstance(row['extractions'], dict) else {},
                }
                projects_dict[project_id]['modules'][row['module_name']]['apis'].append(api_item)

        # 2. Get environment configuration
        envs_query = "SELECT project_id, name, base_url FROM environments ORDER BY project_id, id"
        envs_data = db_handler.query(envs_query)

        for row in envs_data:
            project_id = row['project_id']
            if project_id in projects_dict:
                if 'envs' not in projects_dict[project_id]:
                    projects_dict[project_id]['envs'] = {}
                projects_dict[project_id]['envs'][row['name']] = {'base_url': row.get('base_url', '') or ''}

        # 3. Get variables
        vars_query = "SELECT project_id, name, value FROM variables ORDER BY project_id, id"
        vars_data = db_handler.query(vars_query)

        for row in vars_data:
            project_id = row['project_id']
            if project_id in projects_dict:
                if 'variables' not in projects_dict[project_id]:
                    projects_dict[project_id]['variables'] = {}
                projects_dict[project_id]['variables'][row['name']] = row.get('value', '') or ''

        # 4. Convert to final format
        for project_id, project_data in projects_dict.items():
            project_name = project_data['name']
            result[project_name] = {
                'description': project_data['description'],
                'modules': project_data['modules'],
                'envs': project_data['envs'],
                'current_env': project_data['current_env'],
                'variables': project_data['variables']
            }

        return result

    except Exception as e:
        logger.error(f"Failed to read project data directly from database: {e}")
        return {}
