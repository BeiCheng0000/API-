from utils.cache_bypass_new import _get_projects_directly
from common.logger_handler import logger
from typing import Dict, Any


def get_projects() -> Dict[str, Any]:
    """
    Get project data from database (compatible with old format)
    Optimized: use JOIN query to reduce database queries
    Removed cache mechanism to always get the latest data

    Returns:
        Project data dictionary, format as {project_name: {description, modules, envs, current_env, variables}}
    """
    try:
        # Directly call _get_projects_directly to ensure we get the latest data
        return _get_projects_directly()
    except Exception as e:
        logger.error(f"Failed to read project data from database: {e}")
        return {}
