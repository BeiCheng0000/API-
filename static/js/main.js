
/**
 * API自动化测试平台 - 前端脚本
 */

/**
 * 切换页面
 * @param {string} pageName - 页面名称 (projects, scheduler, debug)
 * @param {HTMLElement} menuItem - 被点击的菜单项元素
 */
function switchPage(pageName, menuItem) {
    console.log('[页面切换] 切换到页面:', pageName);

    // 隐藏所有页面
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.remove('active');
    });

    // 显示目标页面
    const targetPage = document.getElementById('page-' + pageName);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // 更新侧边栏菜单的active状态
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    if (menuItem) {
        menuItem.classList.add('active');
    } else {
        // 如果没有传入menuItem，根据pageName查找对应的菜单项
        const menuItemEl = document.querySelector(`.menu-item[data-page="${pageName}"]`);
        if (menuItemEl) {
            menuItemEl.classList.add('active');
        }
    }

    // 更新URL锚点，不触发页面滚动
    history.replaceState(null, '', '#' + pageName);

    // 更新面包屑
    const breadcrumbCurrent = document.getElementById('breadcrumbCurrent');
    const pageNames = {
        'projects': 'API项目',
        'scheduler': '定时任务',
        'debug': '接口调试',
        'statistics': '数据统计'
    };
    if (breadcrumbCurrent && pageNames[pageName]) {
        breadcrumbCurrent.textContent = pageNames[pageName];
    }

    // 控制顶部操作按钮和统计卡片的显示/隐藏
    const topNavbarActions = document.getElementById('topNavbarActions');
    const topStatCards = document.getElementById('topStatCards');
    if (pageName === 'statistics') {
        // 数据统计页面隐藏顶部的操作按钮和统计卡片
        if (topNavbarActions) topNavbarActions.style.display = 'none';
        if (topStatCards) topStatCards.style.display = 'none';
    } else {
        if (topNavbarActions) topNavbarActions.style.display = '';
        if (topStatCards) topStatCards.style.display = '';
    }

    // 切换到API项目页面时加载项目列表（使用缓存，避免重复请求）
    if (pageName === 'projects' && typeof loadProjectsList === 'function') {
        loadProjectsList();
    }

    // 切换到定时任务页面时加载项目树（使用缓存，避免重复请求）
    if (pageName === 'scheduler' && typeof loadSchedulerProjectTree === 'function') {
        loadSchedulerProjectTree();
    }

    // 切换到数据统计页面时自动加载数据
    if (pageName === 'statistics') {
        console.log('[页面切换] 检测到数据统计页面, loadStatistics函数是否存在:', typeof loadStatistics);
        if (typeof loadStatistics === 'function') {
            // 设置默认日期范围（如果日期为空）
            const dateStart = document.getElementById('statFilterDateStart');
            const dateEnd = document.getElementById('statFilterDateEnd');
            if (dateStart && dateEnd && (!dateStart.value || !dateEnd.value)) {
                if (typeof setDefaultStatDateRange === 'function') {
                    setDefaultStatDateRange();
                }
            }
            console.log('[页面切换] 调用 loadStatistics()');
            loadStatistics();
        } else {
            console.error('[页面切换] loadStatistics 函数未定义!');
        }
    }
}

/**
 * 切换侧边栏显示/隐藏
 */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    if (sidebar) {
        sidebar.classList.toggle('show');
    }
    if (mainContent) {
        mainContent.classList.toggle('sidebar-show');
    }
}

// 域名链接点击计数器
let domainLinkClickCount = 0;
let domainLinkClickTimer = null;

/**
 * 处理域名链接按钮点击事件
 * 点击三次后执行获取域名链接并发送邮件
 */
function handleDomainLinkClick() {
    domainLinkClickCount++;
    
    // 清除之前的定时器
    if (domainLinkClickTimer) {
        clearTimeout(domainLinkClickTimer);
    }
    
    // 如果点击次数达到3次，执行获取域名链接并发送邮件
    if (domainLinkClickCount >= 3) {
        domainLinkClickCount = 0;
        fetchDomainLinksAndSendEmail();
        return;
    }
    
    // 显示提示信息
    const remainingClicks = 3 - domainLinkClickCount;
    showToast('提示', `再点击 ${remainingClicks} 次将获取最新域名并发送邮件`);
    
    // 5秒后重置点击计数器
    domainLinkClickTimer = setTimeout(() => {
        domainLinkClickCount = 0;
    }, 5000);
}

/**
 * 获取域名链接并发送邮件
 */
function fetchDomainLinksAndSendEmail() {
    showToast('提示', '正在获取域名链接...');
    
    fetch('/domain/fetch-and-send')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('成功', data.message || '域名链接已获取并发送邮件');
            } else {
                showToast('错误', data.message || '获取域名链接失败');
            }
        })
        .catch(error => {
            console.error('获取域名链接失败:', error);
            showToast('错误', '获取域名链接失败: ' + error.message);
        });
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 加载顶部统计数据
    loadTopStats();

    // 加载定时任务列表
    loadSchedulerList();

    // 检查是否有Flash消息
    checkFlashMessages();

    // 根据URL锚点切换到对应页面
    const hash = window.location.hash.substring(1); // 去掉#
    const validPages = ['projects', 'scheduler', 'debug', 'statistics'];
    if (hash && validPages.includes(hash)) {
        switchPage(hash);
    } else {
        // 没有锚点时，检查当前活动页面是否需要加载数据
        const activePage = document.querySelector('.page-content.active');
        if (activePage && activePage.id === 'page-statistics') {
            if (typeof loadStatistics === 'function') {
                loadStatistics();
            }
        }
    }
});

// 监听浏览器前进/后退按钮
window.addEventListener('hashchange', function() {
    const hash = window.location.hash.substring(1); // 去掉#
    const validPages = ['projects', 'scheduler', 'debug', 'statistics'];
    if (hash && validPages.includes(hash)) {
        switchPage(hash);
    }
});

/**
 * 加载项目的环境配置并渲染到模块列表区域
 * @param {string} projectName - 项目名称
 */
function loadProjectEnv(projectName) {
    fetch(`/projects/${encodeURIComponent(projectName)}/env/list`)
        .then(response => response.json())
        .then(data => {
            if (!data.success) return;

            const envBar = document.getElementById('projectEnvBar');
            if (!envBar) return;

            // 显示环境栏
            envBar.style.display = '';

            let html = '<div class="d-flex align-items-center gap-2 flex-wrap">';
            html += '<i class="bi bi-globe2 text-muted"></i>';
            html += '<span class="text-muted small">环境:</span>';

            if (data.env_list.length === 0) {
                html += '<span class="text-muted small">暂无环境配置</span>';
            } else {
                const safeProjName = escapeHtml(projectName);
                html += '<select class="form-select form-select-sm" style="width:auto;min-width:90px;" onchange="switchProjectEnv(\'' + safeProjName + '\', this.value); loadProjectEnv(\'' + safeProjName + '\')">';
                data.env_list.forEach(env => {
                    const selected = env.name === data.current_env ? ' selected' : '';
                    html += '<option value="' + escapeHtml(env.name) + '"' + selected + '>' + escapeHtml(env.name) + '</option>';
                });
                html += '</select>';
                if (data.base_url) {
                    html += '<small class="text-muted" style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + escapeHtml(data.base_url) + '">' + escapeHtml(data.base_url) + '</small>';
                }
            }

            html += '<button type="button" class="btn btn-sm btn-outline-primary" onclick="showProjectEnvModal(\'' + escapeHtml(projectName) + '\')" title="管理环境"><i class="bi bi-gear"></i></button>';
            html += '<button type="button" class="btn btn-sm btn-outline-secondary" onclick="showProjectVarModal(\'' + escapeHtml(projectName) + '\')" title="管理变量"><i class="bi bi-braces"></i> 变量</button>';
            html += '</div>';
            envBar.innerHTML = html;
        })
        .catch(err => {
            console.error('加载项目环境配置失败:', err);
        });
}

/**
 * 切换项目环境
 * @param {string} projectName - 项目名称
 * @param {string} envName - 环境名称
 */
function switchProjectEnv(projectName, envName) {
    if (!envName) return;

    const formData = new FormData();
    formData.append('env_name', envName);

    fetch(`/projects/${encodeURIComponent(projectName)}/env/switch`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('成功', data.message, 'success');
            // 刷新环境栏
            if (typeof loadProjectEnv === 'function') {
                loadProjectEnv(projectName);
            }
        } else {
            showToast('错误', data.error, 'danger');
        }
        // 刷新项目树
        if (typeof loadProjectsList === 'function') {
            loadProjectsList();
        }
    })
    .catch(err => {
        showToast('错误', '切换环境失败: ' + err.message, 'danger');
        if (typeof loadProjectsList === 'function') {
            loadProjectsList();
        }
    });
}

/**
 * 显示项目环境管理模态框
 * @param {string} projectName - 项目名称
 */
function showProjectEnvModal(projectName) {
    document.getElementById('envModalProjectName').value = projectName;
    document.getElementById('envNameInput').value = '';
    document.getElementById('envBaseUrlInput').value = '';

    // 加载当前项目的环境列表
    loadEnvModalList(projectName);

    const modal = new bootstrap.Modal(document.getElementById('projectEnvModal'));
    modal.show();
}

/**
 * 加载环境管理模态框中的环境列表
 * @param {string} projectName - 项目名称
 */
function loadEnvModalList(projectName) {
    fetch(`/projects/${encodeURIComponent(projectName)}/env/list`)
        .then(response => response.json())
        .then(data => {
            if (!data.success) return;

            const tbody = document.getElementById('envModalTableBody');
            if (!tbody) return;

            // 填充顶部环境切换下拉框
            const envSwitchSelect = document.getElementById('envSwitchSelect');
            const envSwitchBaseUrl = document.getElementById('envSwitchBaseUrl');
            if (envSwitchSelect) {
                envSwitchSelect.innerHTML = '';
                if (data.env_list.length === 0) {
                    envSwitchSelect.innerHTML = '<option value="">暂无环境</option>';
                } else {
                    data.env_list.forEach(env => {
                        const opt = document.createElement('option');
                        opt.value = env.name;
                        opt.textContent = env.name;
                        if (env.name === data.current_env) {
                            opt.selected = true;
                        }
                        envSwitchSelect.appendChild(opt);
                    });
                }
                // 显示当前环境的 base_url
                if (envSwitchBaseUrl) {
                    const currentEnv = data.env_list.find(e => e.name === data.current_env);
                    envSwitchBaseUrl.textContent = currentEnv ? currentEnv.base_url : '-';
                }
            }

            if (data.env_list.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">暂无环境配置，请添加</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            const safeProjName = escapeHtml(projectName);
            data.env_list.forEach(env => {
                const isCurrent = env.name === data.current_env;
                const safeEnvName = escapeHtml(env.name);
                const safeBaseUrl = escapeHtml(env.base_url);
                const row = document.createElement('tr');
                let actionsHtml = '';
                if (!isCurrent) {
                    actionsHtml += '<button class="btn btn-sm btn-outline-primary me-1 env-switch-btn" data-project="' + safeProjName + '" data-env="' + safeEnvName + '">切换</button>';
                }
                actionsHtml += '<button class="btn btn-sm btn-outline-danger env-delete-btn" data-project="' + safeProjName + '" data-env="' + safeEnvName + '">删除</button>';
                row.innerHTML = '<td>' + safeEnvName + (isCurrent ? ' <span class="badge bg-success">当前</span>' : '') + '</td>' +
                    '<td><small>' + safeBaseUrl + '</small></td>' +
                    '<td>' + actionsHtml + '</td>';
                tbody.appendChild(row);
            });

            // 绑定切换和删除按钮事件
            tbody.querySelectorAll('.env-switch-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const pName = this.dataset.project;
                    const eName = this.dataset.env;
                    switchProjectEnv(pName, eName);
                    setTimeout(() => loadEnvModalList(pName), 300);
                });
            });
            tbody.querySelectorAll('.env-delete-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const pName = this.dataset.project;
                    const eName = this.dataset.env;
                    deleteProjectEnv(pName, eName);
                });
            });
        })
        .catch(err => {
            console.error('加载环境列表失败:', err);
        });
}

/**
 * 环境切换下拉框变更事件
 * @param {string} envName - 选中的环境名称
 */
function onEnvSwitchChange(envName) {
    if (!envName) return;
    const projectName = document.getElementById('envModalProjectName').value;
    if (!projectName) return;

    // 更新 base_url 显示
    const envSwitchSelect = document.getElementById('envSwitchSelect');
    const envSwitchBaseUrl = document.getElementById('envSwitchBaseUrl');

    switchProjectEnv(projectName, envName);
    setTimeout(() => loadEnvModalList(projectName), 300);
}

/**
 * 保存项目环境
 */
function saveProjectEnv() {
    const projectName = document.getElementById('envModalProjectName').value;
    const envName = document.getElementById('envNameInput').value.trim();
    const baseUrl = document.getElementById('envBaseUrlInput').value.trim();

    if (!envName) {
        showToast('错误', '环境名称不能为空', 'danger');
        return;
    }
    if (!baseUrl) {
        showToast('错误', '环境域名不能为空', 'danger');
        return;
    }

    const formData = new FormData();
    formData.append('env_name', envName);
    formData.append('base_url', baseUrl);

    fetch(`/projects/${encodeURIComponent(projectName)}/env/save`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('成功', data.message, 'success');
            document.getElementById('envNameInput').value = '';
            document.getElementById('envBaseUrlInput').value = '';
            loadEnvModalList(projectName);
            loadProjectEnv(projectName);
        } else {
            showToast('错误', data.error, 'danger');
        }
    })
    .catch(err => {
        showToast('错误', '保存环境失败: ' + err.message, 'danger');
    });
}

/**
 * 删除项目环境
 * @param {string} projectName - 项目名称
 * @param {string} envName - 环境名称
 */
function deleteProjectEnv(projectName, envName) {
    if (!confirm(`确定要删除环境"${envName}"吗？`)) return;

    const formData = new FormData();
    formData.append('env_name', envName);

    fetch(`/projects/${encodeURIComponent(projectName)}/env/delete/${encodeURIComponent(envName)}`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('成功', data.message, 'success');
            loadEnvModalList(projectName);
            loadProjectEnv(projectName);
        } else {
            showToast('错误', data.error, 'danger');
        }
    })
    .catch(err => {
        showToast('错误', '删除环境失败: ' + err.message, 'danger');
    });
}



/**
 * 显示项目变量管理模态框
 * @param {string} projectName - 项目名称
 */
function showProjectVarModal(projectName) {
    document.getElementById('varModalProjectName').value = projectName;
    document.getElementById('varKeyInput').value = '';
    document.getElementById('varValueInput').value = '';
    loadVarModalList(projectName);
    const modal = new bootstrap.Modal(document.getElementById('projectVarModal'));
    modal.show();
}

/**
 * 加载变量管理模态框中的变量列表
 * @param {string} projectName - 项目名称
 */
function loadVarModalList(projectName) {
    fetch(`/projects/${encodeURIComponent(projectName)}/variables/list`)
        .then(response => response.json())
        .then(data => {
            if (!data.success) return;

            const tbody = document.getElementById('varModalTableBody');
            if (!tbody) return;

            if (data.variables.length === 0) {
                tbody.innerHTML = '<div class="text-center text-muted small py-3"><i class="bi bi-inbox me-1"></i>暂无变量，请在下方添加</div>';
                return;
            }

            tbody.innerHTML = '';
            const safeProjName = escapeHtml(projectName);
            data.variables.forEach(v => {
                const safeKey = escapeHtml(v.key);
                const safeVal = escapeHtml(v.value);
                const displayVal = safeVal.length > 30 ? safeVal.substring(0, 30) + '...' : safeVal;

                const item = document.createElement('div');
                item.className = 'd-flex align-items-center justify-content-between border rounded px-3 py-2';
                item.innerHTML =
                    '<button class="btn btn-sm btn-outline-warning me-2 var-edit-btn" data-project="' + safeProjName + '" data-key="' + safeKey + '" data-value="' + safeVal + '" title="编辑"><i class="bi bi-pencil"></i></button>' +
                    '<div class="flex-grow-1 d-flex align-items-center overflow-hidden">' +
                        '<code class="text-nowrap me-2" style="font-size:0.85rem;">{' + safeKey + '}</code>' +
                        '<span class="text-muted mx-1">=</span>' +
                        '<small class="text-truncate" title="' + safeVal + '" style="max-width:220px;">' + displayVal + '</small>' +
                    '</div>' +
                    '<button class="btn btn-sm btn-outline-danger ms-2 var-delete-btn" data-project="' + safeProjName + '" data-key="' + safeKey + '" title="删除"><i class="bi bi-trash"></i></button>';
                tbody.appendChild(item);
            });

            // 绑定编辑按钮事件
            tbody.querySelectorAll('.var-edit-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const vKey = this.dataset.key;
                    const vVal = this.dataset.value;
                    document.getElementById('varKeyInput').value = vKey;
                    document.getElementById('varValueInput').value = vVal;
                });
            });

            // 绑定删除按钮事件
            tbody.querySelectorAll('.var-delete-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const pName = this.dataset.project;
                    const vKey = this.dataset.key;
                    deleteProjectVar(pName, vKey);
                });
            });
        })
        .catch(err => {
            console.error('加载变量列表失败:', err);
        });
}

/**
 * 保存项目变量
 */
function saveProjectVar() {
    const projectName = document.getElementById('varModalProjectName').value;
    const varKey = document.getElementById('varKeyInput').value.trim();
    const varValue = document.getElementById('varValueInput').value.trim();

    if (!varKey) {
        showToast('错误', '变量名不能为空', 'danger');
        return;
    }

    const formData = new FormData();
    formData.append('var_key', varKey);
    formData.append('var_value', varValue);

    fetch(`/projects/${encodeURIComponent(projectName)}/variables/save`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('成功', data.message, 'success');
            document.getElementById('varKeyInput').value = '';
            document.getElementById('varValueInput').value = '';
            loadVarModalList(projectName);
        } else {
            showToast('错误', data.error, 'danger');
        }
    })
    .catch(err => {
        showToast('错误', '保存变量失败: ' + err.message, 'danger');
    });
}

/**
 * 删除项目变量
 * @param {string} projectName - 项目名称
 * @param {string} varKey - 变量名
 */
function deleteProjectVar(projectName, varKey) {
    if (!confirm('确定要删除变量"' + varKey + '"吗？')) return;

    const formData = new FormData();
    formData.append('var_key', varKey);

    fetch(`/projects/${encodeURIComponent(projectName)}/variables/delete/${encodeURIComponent(varKey)}`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('成功', data.message, 'success');
            loadVarModalList(projectName);
        } else {
            showToast('错误', data.error, 'danger');
        }
    })
    .catch(err => {
        showToast('错误', '删除变量失败: ' + err.message, 'danger');
    });
}

/**
 * 请求缓存
 */
const requestCache = new Map();

/**
 * 带缓存的fetch请求
 * @param {string} url - 请求URL
 * @param {Object} options - 请求选项
 * @param {number} cacheTime - 缓存时间（毫秒）
 * @returns {Promise} - Promise对象
 */
function fetchWithCache(url, options = {}, cacheTime = 30000) {
    const cacheKey = url + JSON.stringify(options);
    const cached = requestCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < cacheTime) {
        return Promise.resolve(cached.data);
    }

    return fetch(url, options)
        .then(response => response.json())
        .then(data => {
            // 存入缓存
            requestCache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });
            return data;
        });
}

/**
 * 加载顶部统计数据（项目数、模块数、接口数、定时任务数）
 */
function loadTopStats() {
    fetchWithCache('/api/top_stats', {}, 30000)  // 缓存30秒
        .then(data => {
            const statProjects = document.getElementById('statProjects');
            const statModules = document.getElementById('statModules');
            const statApis = document.getElementById('statApis');
            const statSchedulers = document.getElementById('statSchedulers');
            
            if (statProjects) statProjects.textContent = data.project_count || 0;
            if (statModules) statModules.textContent = data.module_count || 0;
            // 使用直接从数据库查询的接口数量，确保准确性
            if (statApis) statApis.textContent = data.direct_api_count || data.api_count || 0;
            if (statSchedulers) statSchedulers.textContent = data.scheduler_count || 0;
        })
        .catch(err => {
            console.error('加载顶部统计数据失败:', err);
        });
}

/**
 * 调试API
 * @param {string} apiName - API名称
 * @param {number} caseIndex - 用例索引
 */
function debugApi(projectName, moduleName, caseIndex) {
    // 兼容旧的2参数调用方式: debugApi(apiName, caseIndex)
    if (arguments.length === 2 && typeof moduleName === 'number') {
        caseIndex = moduleName;
        moduleName = undefined;
    }

    // 模式1：从项目列表点击调试，填充表单数据并跳转到调试页
    if (projectName && caseIndex !== undefined) {
        fetchProjectsList()
            .then(projectsData => {
                let apiData = null;
                let foundProjectName = '';
                let foundModuleName = '';

                // 如果指定了模块名，直接定位
                if (projectsData[projectName] && projectsData[projectName].modules && moduleName) {
                    const modData = projectsData[projectName].modules[moduleName];
                    if (modData && modData.apis && modData.apis[caseIndex]) {
                        apiData = modData.apis[caseIndex];
                        foundProjectName = projectName;
                        foundModuleName = moduleName;
                    }
                }

                // 未指定模块名时，遍历查找
                if (!apiData) {
                    for (const [projName, projData] of Object.entries(projectsData)) {
                        if (projData.modules) {
                            for (const [modName, modData] of Object.entries(projData.modules)) {
                                if (modData.apis && modData.apis[caseIndex] && projName === projectName) {
                                    apiData = modData.apis[caseIndex];
                                    foundProjectName = projName;
                                    foundModuleName = modName;
                                    break;
                                }
                            }
                        }
                        if (apiData) break;
                    }
                }

                if (apiData && typeof fillDebugForm === 'function') {
                    fillDebugForm(apiData, foundProjectName, foundModuleName);
                } else if (apiData) {
                    document.getElementById('apiUrl').value = apiData.url || '';
                    document.getElementById('apiMethod').value = apiData.method || 'GET';
                    setHeadersData('debug', apiData.headers || {});
                    setBodyData('debug', apiData.data || {});
                    if (document.getElementById('debugProjectName')) document.getElementById('debugProjectName').value = foundProjectName || '';
                    if (document.getElementById('debugModuleName')) document.getElementById('debugModuleName').value = foundModuleName || '';
                    if (document.getElementById('debugCaseName')) document.getElementById('debugCaseName').value = apiData.case_name || apiData.name || '';
                    switchPage('debug', document.querySelector('[data-page="debug"]'));
                } else {
                    showToast('错误', '未找到接口数据', 'danger');
                }
            })
            .catch(error => {
                showToast('错误', '获取API数据失败: ' + error.message, 'danger');
            });
        return; // 填充模式，不执行发送
    }

    // 模式2：直接发送调试请求
    const apiUrl = document.getElementById('apiUrl').value;
    const apiMethod = document.getElementById('apiMethod').value;

    // 验证必填字段
    if (!apiUrl) {
        showToast('错误', '请输入URL', 'danger');
        return;
    }

    // 解析数据
    let headers = {};
    let data = {};

    try {
        const headersStr = getHeadersData('debug');
        if (headersStr) headers = JSON.parse(headersStr);
    } catch (e) {
        showToast('错误', '请求头JSON格式错误: ' + e.message, 'danger');
        return;
    }

    try {
        const dataStr = getBodyData('debug');
        if (dataStr) {
            try {
                data = JSON.parse(dataStr);
            } catch (e) {
                // 如果不是有效JSON，将原始文本作为字符串值
                data = dataStr;
            }
        }
    } catch (e) {
        // 忽略获取数据时的错误
    }

    // 获取断言
    const expected = getAssertions();

    // 发送请求
    fetch('/api/debug', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            url: apiUrl,
            method: apiMethod,
            headers: headers,
            data: data,
            expected: expected,
            project: document.getElementById('debugProjectName') ? document.getElementById('debugProjectName').value : '',
            module: document.getElementById('debugModuleName') ? document.getElementById('debugModuleName').value : '',
            case_name: document.getElementById('debugCaseName') ? document.getElementById('debugCaseName').value : '',
            source: '调试'
        })
    })
    .then(response => response.json())
    .then(result => {
        // 显示响应结果
        const debugResult = document.getElementById('debugResult');
        const responseTime = document.getElementById('responseTime');
        const statusCode = document.getElementById('statusCode');
        const debugResponseHeaders = document.getElementById('debugResponseHeaders');
        const debugResponseBody = document.getElementById('debugResponseBody');
        const assertionResult = document.getElementById('assertionResult');
        const assertionSummary = document.getElementById('assertionSummary');
        const assertionTableBody = document.getElementById('assertionTableBody');

        debugResult.style.display = 'block';

        if (result.success) {
            responseTime.innerHTML = '<span class="badge bg-info">响应时间: ' + result.response_time + 'ms</span>';
            statusCode.innerHTML = '<span class="badge bg-success">状态码: ' + result.status_code + '</span>';
            // 显示响应头和响应体
            if (debugResponseHeaders) {
                debugResponseHeaders.textContent = formatRequestContent(result.headers);
            }
            if (debugResponseBody) {
                debugResponseBody.textContent = formatRequestContent(result.data);
            }
            
            // 显示断言结果
            if (result.assertion_results && result.assertion_results.length > 0) {
                assertionResult.style.display = 'block';
                
                // 显示断言摘要
                if (result.assertion_passed) {
                    assertionSummary.innerHTML = '<span class="badge bg-success">所有断言通过</span>';
                } else {
                    assertionSummary.innerHTML = '<span class="badge bg-danger">部分断言失败</span>';
                }
                
                // 显示断言详情
                assertionTableBody.innerHTML = '';
                result.assertion_results.forEach(assertion => {
                    const row = document.createElement('tr');
                    
                    let typeText = '';
                    let fieldText = '-';
                    
                    if (assertion.type === 'status_code') {
                        typeText = '状态码';
                    } else if (assertion.type === 'data') {
                        typeText = '响应数据';
                        fieldText = assertion.field;
                    }
                    
                    const resultClass = assertion.passed === true ? 'success' : 'danger';
                    const resultText = assertion.passed === true ? '通过' : '失败';
                    
                    row.innerHTML = `
                        <td>${typeText}</td>
                        <td>${fieldText}</td>
                        <td>${JSON.stringify(assertion.expected)}</td>
                        <td>${JSON.stringify(assertion.actual)}</td>
                        <td><span class="badge bg-${resultClass}">${resultText}</span></td>
                    `;
                    
                    assertionTableBody.appendChild(row);
                });
            } else {
                assertionResult.style.display = 'none';
            }
        } else {
            responseTime.innerHTML = '';
            statusCode.innerHTML = '<span class="badge bg-danger">请求失败</span>';
            if (debugResponseHeaders) debugResponseHeaders.textContent = '-';
            if (debugResponseBody) debugResponseBody.textContent = '错误: ' + result.error;
            assertionResult.style.display = 'none';
        }
    })
    .catch(error => {
        showToast('错误', '请求失败: ' + error.message, 'danger');
    });
}

// executeTest 函数已移至 projects.js，使用三参数版本（projectName, moduleName, apiId）

/**
 * 删除API
 * @param {string} apiName - API名称
 * @param {number} caseIndex - 用例索引
 */
function deleteApi(apiName, caseIndex) {
    if (confirm('确定要删除这个API吗？')) {
        window.location.href = `/api/delete/${apiName}/${caseIndex}`;
    }
}

/**
 * 添加API
 */
function addApi() {
    const apiName = document.getElementById('apiName').value;
    const caseName = document.getElementById('caseName').value;
    const addApiUrl = document.getElementById('addApiUrl').value;
    const addApiMethod = document.getElementById('addApiMethod').value;
    const addApiHeaders = document.getElementById('addApiHeaders').value;
    const addApiData = document.getElementById('addApiData').value;

    // 验证必填字段
    if (!apiName || !caseName || !addApiUrl) {
        showToast('错误', '请填写所有必填字段', 'danger');
        return;
    }

    // 解析JSON数据
    let headers = {};
    let data = {};

    try {
        if (addApiHeaders) {
            headers = JSON.parse(addApiHeaders);
        }
    } catch (e) {
        showToast('错误', '请求头JSON格式错误: ' + e.message, 'danger');
        return;
    }

    try {
        if (addApiData) {
            try {
                data = JSON.parse(addApiData);
            } catch (e) {
                // 如果不是有效JSON，将原始文本作为字符串值
                data = addApiData;
            }
        }
    } catch (e) {
        // 忽略获取数据时的错误
    }

    // 获取断言数据
    const expected = getAssertions('addAssertionContainer');

    // 创建表单数据
    const formData = new FormData();
    formData.append('api_name', apiName);
    formData.append('case_name', caseName);
    formData.append('url', addApiUrl);
    formData.append('method', addApiMethod);
    formData.append('headers', JSON.stringify(headers));
    formData.append('data', JSON.stringify(data));
    formData.append('expected', JSON.stringify(expected));

    // 发送请求
    fetch('/api/add', {
        method: 'POST',
        body: formData
    })
    .then(response => response.text())
    .then(result => {
        // 刷新页面
        window.location.reload();
    })
    .catch(error => {
        showToast('错误', '添加API失败: ' + error.message, 'danger');
    });
}

/**
 * 加载定时任务列表
 */
/**
 * 加载定时任务列表（兼容性入口，刷新当前选中模块或项目树）
 */
function loadSchedulerList() {
    // 刷新项目树（更新任务计数）
    if (typeof loadSchedulerProjectTree === 'function') {
        loadSchedulerProjectTree();
    }
    // 如果有选中模块，刷新该模块的任务列表
    if (typeof _schedulerSelectedProject !== 'undefined' && typeof _schedulerSelectedModule !== 'undefined'
        && _schedulerSelectedProject && _schedulerSelectedModule) {
        if (typeof loadSchedulerJobsByModule === 'function') {
            loadSchedulerJobsByModule(_schedulerSelectedProject, _schedulerSelectedModule);
        }
    }
}

/**
 * 显示添加定时任务模态框
 * @param {string} projectName - 项目名称
 * @param {string} moduleName - 模块名称
 * @param {number} caseIndex - 用例索引
 */
function showSchedulerModal(projectName, moduleName, caseIndex) {
    // 重置为添加模式
    document.getElementById('schedulerJobId').value = '';
    document.getElementById('schedulerProjectName').value = projectName;
    document.getElementById('schedulerModuleName').value = moduleName;
    document.getElementById('schedulerCaseIndex').value = caseIndex;
    document.getElementById('cronExpression').value = '';
    document.getElementById('schedulerModalTitle').innerHTML = '<i class="bi bi-clock me-2"></i>添加定时任务';
    document.getElementById('schedulerSubmitBtn').innerHTML = '<i class="bi bi-check-lg me-1"></i>确定';

    const schedulerModal = new bootstrap.Modal(document.getElementById('schedulerModal'));
    schedulerModal.show();
}

/**
 * 编辑定时任务 - 打开模态框并填充当前数据
 * @param {string} jobId - 任务ID
 * @param {string} projectName - 项目名称
 * @param {string} moduleName - 模块名称
 * @param {number} caseIndex - 用例索引
 * @param {string} cronExpression - 当前Cron表达式
 */
function editScheduler(jobId, projectName, moduleName, caseIndex, cronExpression) {
    // 设置为编辑模式
    document.getElementById('schedulerJobId').value = jobId;
    document.getElementById('schedulerProjectName').value = projectName;
    document.getElementById('schedulerModuleName').value = moduleName;
    document.getElementById('schedulerCaseIndex').value = caseIndex;
    document.getElementById('cronExpression').value = cronExpression;
    document.getElementById('schedulerModalTitle').innerHTML = '<i class="bi bi-pencil me-2"></i>编辑定时任务';
    document.getElementById('schedulerSubmitBtn').innerHTML = '<i class="bi bi-check-lg me-1"></i>保存';

    const schedulerModal = new bootstrap.Modal(document.getElementById('schedulerModal'));
    schedulerModal.show();
}

/**
 * 提交定时任务（根据模式自动判断添加或更新）
 */
function submitScheduler() {
    const jobId = document.getElementById('schedulerJobId').value;
    if (jobId) {
        updateScheduler();
    } else {
        addScheduler();
    }
}

/**
 * 添加定时任务
 */
function addScheduler() {
    const projectName = document.getElementById('schedulerProjectName').value;
    const moduleName = document.getElementById('schedulerModuleName').value;
    const caseIndex = document.getElementById('schedulerCaseIndex').value;
    const cronExpression = document.getElementById('cronExpression').value;

    if (!cronExpression) {
        showToast('错误', '请输入Cron表达式', 'danger');
        return;
    }

    // 校验Cron表达式格式（必须是5个字段：分 时 日 月 周）
    const cronFields = cronExpression.trim().split(/\s+/);
    if (cronFields.length !== 5) {
        showToast('错误', 'Cron表达式格式错误：需要5个字段（分 时 日 月 周），如：0 * * * *', 'danger');
        return;
    }

    // 创建表单数据
    const formData = new FormData();
    formData.append('project_name', projectName);
    formData.append('module_name', moduleName);
    formData.append('case_index', caseIndex);
    formData.append('cron_expression', cronExpression);

    // 发送请求
    fetch('/scheduler/add', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        return response.json().then(data => {
            if (response.ok) {
                return data;
            } else {
                throw new Error(data.message || '服务器返回错误: ' + response.status);
            }
        });
    })
    .then(result => {
        // 关闭模态框
        const schedulerModal = bootstrap.Modal.getInstance(document.getElementById('schedulerModal'));
        schedulerModal.hide();

        // 刷新定时任务列表
        loadSchedulerList();

        showToast('成功', result.message || '定时任务添加成功', 'success');
    })
    .catch(error => {
        showToast('错误', '添加定时任务失败: ' + error.message, 'danger');
    });
}

/**
 * 更新定时任务
 */
function updateScheduler() {
    const jobId = document.getElementById('schedulerJobId').value;
    const projectName = document.getElementById('schedulerProjectName').value;
    const moduleName = document.getElementById('schedulerModuleName').value;
    const caseIndex = document.getElementById('schedulerCaseIndex').value;
    const cronExpression = document.getElementById('cronExpression').value;

    if (!cronExpression) {
        showToast('错误', '请输入Cron表达式', 'danger');
        return;
    }

    // 校验Cron表达式格式（必须是5个字段：分 时 日 月 周）
    const cronFields = cronExpression.trim().split(/\s+/);
    if (cronFields.length !== 5) {
        showToast('错误', 'Cron表达式格式错误：需要5个字段（分 时 日 月 周），如：0 * * * *', 'danger');
        return;
    }

    // 创建表单数据
    const formData = new FormData();
    formData.append('job_id', jobId);
    formData.append('project_name', projectName);
    formData.append('module_name', moduleName);
    formData.append('case_index', caseIndex);
    formData.append('cron_expression', cronExpression);

    // 发送请求
    fetch('/scheduler/update', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        return response.json().then(data => {
            if (response.ok) {
                return data;
            } else {
                throw new Error(data.message || '服务器返回错误: ' + response.status);
            }
        });
    })
    .then(result => {
        // 关闭模态框
        const schedulerModal = bootstrap.Modal.getInstance(document.getElementById('schedulerModal'));
        schedulerModal.hide();

        // 刷新定时任务列表
        loadSchedulerList();

        showToast('成功', result.message || '定时任务更新成功', 'success');
    })
    .catch(error => {
        showToast('错误', '更新定时任务失败: ' + error.message, 'danger');
    });
}

/**
 * 删除定时任务
 * @param {string} jobId - 任务ID
 */
function deleteScheduler(jobId) {
    if (confirm('确定要删除这个定时任务吗？')) {
        fetch(`/scheduler/delete/${jobId}`)
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                showToast('成功', result.message || '定时任务删除成功', 'success');
                loadSchedulerList();
                if (typeof loadTopStats === 'function') loadTopStats();
            } else {
                showToast('错误', result.error || '删除失败', 'danger');
            }
        })
        .catch(error => {
            showToast('错误', '删除定时任务失败: ' + error.message, 'danger');
        });
    }
}

/**
 * 获取API数据
 * @param {string} apiName - API名称
 * @param {number} caseIndex - 用例索引
 * @returns {Object|null} API数据
 */
function getApiData(apiName, caseIndex) {
    // 从API列表中获取对应的API数据
    const apiAccordion = document.getElementById('apiAccordion');
    const apiItems = apiAccordion.querySelectorAll('.accordion-item');

    for (let i = 0; i < apiItems.length; i++) {
        const apiItem = apiItems[i];
        const button = apiItem.querySelector('.accordion-button');

        if (button.textContent.includes(apiName)) {
            const collapse = apiItem.querySelector('.accordion-collapse');
            const cards = collapse.querySelectorAll('.card');

            if (caseIndex < cards.length) {
                const card = cards[caseIndex];
                const title = card.querySelector('.card-title').textContent;
                const text = card.querySelector('.card-text').textContent;

                // 解析URL和方法
                const match = text.match(/(GET|POST|PUT|DELETE)\s+(.+)/);
                if (match) {
                    return {
                        case_name: title,
                        method: match[1],
                        url: match[2].trim(),
                        headers: {},
                        data: {}
                    };
                }
            }
        }
    }

    return null;
}

/**
 * 添加断言项
 * @param {string} containerId - 断言容器ID
 * @param {string} type - 断言类型 (status_code 或 data)
 * @param {string} field - 字段名
 * @param {string} expected - 期望值
 */
function addAssertion(containerId = 'assertionContainer', type = 'data', field = '', expected = '') {
    const assertionContainer = document.getElementById(containerId);
    const assertionCount = assertionContainer.children.length;
    
    if (assertionCount >= 10) {
        showToast('警告', '最多只能添加10个断言', 'warning');
        return;
    }
    
    const assertionItem = document.createElement('div');
    assertionItem.className = 'row mb-2 assertion-item';
    assertionItem.innerHTML = `
        <div class="col-md-3">
            <select class="form-select form-select-sm assertion-type" onchange="updateAssertionFieldPlaceholder(this)">
                <option value="status_code" ${type === 'status_code' ? 'selected' : ''}>状态码</option>
                <option value="data" ${type === 'data' ? 'selected' : ''}>响应数据</option>
            </select>
        </div>
        <div class="col-md-4">
            <input type="text" class="form-control form-control-sm assertion-field" placeholder="字段名" value="${field}" ${type === 'status_code' ? 'disabled' : ''}>
        </div>
        <div class="col-md-4">
            <input type="text" class="form-control form-control-sm assertion-expected" placeholder="期望值" value="${expected}">
        </div>
        <div class="col-md-1">
            <button type="button" class="btn btn-sm btn-outline-danger w-100" onclick="removeAssertion(this)">
                <i class="bi bi-trash"></i>
            </button>
        </div>
    `;
    
    assertionContainer.appendChild(assertionItem);
}

/**
 * 移除断言项
 * @param {HTMLElement} button - 删除按钮元素
 */
function removeAssertion(button) {
    const assertionItem = button.closest('.assertion-item');
    if (assertionItem) {
        assertionItem.remove();
    }
}

/**
 * 更新断言字段名的占位符
 * @param {HTMLElement} select - 选择框元素
 */
function updateAssertionFieldPlaceholder(select) {
    const fieldInput = select.closest('.assertion-item').querySelector('.assertion-field');
    if (select.value === 'status_code') {
        fieldInput.value = '';
        fieldInput.disabled = true;
        fieldInput.placeholder = '状态码无需字段名';
    } else {
        fieldInput.disabled = false;
        fieldInput.placeholder = '字段名';
    }
}

/**
 * 获取所有断言
 * @param {string} containerId - 断言容器ID
 * @returns {Object} 断言对象
 */
function getAssertions(containerId = 'assertionContainer') {
    const assertionContainer = document.getElementById(containerId);
    const assertionItems = assertionContainer.querySelectorAll('.assertion-item');
    
    const assertions = {
        status_code: null,
        data: {}
    };
    
    assertionItems.forEach(item => {
        const type = item.querySelector('.assertion-type').value;
        const field = item.querySelector('.assertion-field').value;
        const expected = item.querySelector('.assertion-expected').value;
        
        if (type === 'status_code') {
            assertions.status_code = parseInt(expected) || null;
        } else if (type === 'data' && field && expected) {
            // 尝试解析期望值为JSON
            try {
                assertions.data[field] = JSON.parse(expected);
            } catch (e) {
                assertions.data[field] = expected;
            }
        }
    });
    
    return assertions;
}

/**
 * 设置断言
 * @param {Object} assertions - 断言对象
 * @param {string} containerId - 断言容器ID
 */
function setAssertions(assertions, containerId = 'assertionContainer') {
    const assertionContainer = document.getElementById(containerId);
    assertionContainer.innerHTML = '';
    
    if (assertions.status_code !== undefined && assertions.status_code !== null) {
        addAssertion(containerId, 'status_code', '', assertions.status_code);
    }
    
    if (assertions.data) {
        for (const [field, expected] of Object.entries(assertions.data)) {
            addAssertion(containerId, 'data', field, typeof expected === 'object' ? JSON.stringify(expected) : expected);
        }
    }
}

// editApi 函数已移至 projects.js，使用三参数版本（projectName, moduleName, apiId）


/**
 * 保存编辑的API
 */
function saveEditApi() {
    const projectName = document.getElementById('editApiName').value;
    const moduleName = document.getElementById('editModuleName').value;
    const apiIndex = document.getElementById('editCaseIndex').value;
    const caseName = document.getElementById('editCaseName').value;
    const url = document.getElementById('editUrl').value;
    const method = document.getElementById('editMethod').value;
    const headers = getHeadersData('edit');
    const data = getBodyData('edit');
    
    // 获取断言
    const expected = getEditAssertions();
    
    // 获取提取配置
    const extractions = getEditExtractions();
    
    // 创建表单数据
    const formData = new FormData();
    formData.append('case_name', caseName);
    formData.append('url', url);
    formData.append('method', method);
    formData.append('headers', headers);
    formData.append('data', data);
    formData.append('expected', JSON.stringify(expected));
    formData.append('extractions', JSON.stringify(extractions));
    
    // 发送请求到projects路由
    fetch(`/projects/${projectName}/modules/${moduleName}/apis/update/${apiIndex}`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showToast('成功', result.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('editApiModal')).hide();
            // 刷新项目列表和当前模块的接口列表
            if (typeof loadProjectsList === 'function') loadProjectsList();
            if (typeof loadApisList === 'function') loadApisList(projectName, moduleName);
            if (typeof loadTopStats === 'function') loadTopStats();
        } else {
            showToast('错误', result.error, 'danger');
        }
    })
    .catch(error => {
        showToast('错误', '保存API失败: ' + error.message, 'danger');
    });
}

/**
 * 添加编辑断言项
 * @param {string} containerId - 断言容器ID
 * @param {string} type - 断言类型 (status_code 或 data)
 * @param {string} field - 字段名
 * @param {string} expected - 期望值
 */
function addEditAssertion(containerId = 'editAssertionContainer', type = 'data', field = '', expected = '') {
    const assertionContainer = document.getElementById(containerId);
    const assertionCount = assertionContainer.children.length;
    
    if (assertionCount >= 10) {
        showToast('警告', '最多只能添加10个断言', 'warning');
        return;
    }
    
    const assertionItem = document.createElement('div');
    assertionItem.className = 'row mb-2 assertion-item';
    assertionItem.innerHTML = `
        <div class="col-md-3">
            <select class="form-select form-select-sm assertion-type" onchange="updateEditAssertionFieldPlaceholder(this)">
                <option value="status_code" ${type === 'status_code' ? 'selected' : ''}>状态码</option>
                <option value="data" ${type === 'data' ? 'selected' : ''}>响应数据</option>
            </select>
        </div>
        <div class="col-md-4">
            <input type="text" class="form-control form-control-sm assertion-field" placeholder="字段名" value="${field}" ${type === 'status_code' ? 'disabled' : ''}>
        </div>
        <div class="col-md-4">
            <input type="text" class="form-control form-control-sm assertion-expected" placeholder="期望值" value="${expected}">
        </div>
        <div class="col-md-1">
            <button type="button" class="btn btn-sm btn-outline-danger w-100" onclick="removeEditAssertion(this)">
                <i class="bi bi-trash"></i>
            </button>
        </div>
    `;
    
    assertionContainer.appendChild(assertionItem);
}

/**
 * 移除编辑断言项
 * @param {HTMLElement} button - 删除按钮元素
 */
function removeEditAssertion(button) {
    const assertionItem = button.closest('.assertion-item');
    if (assertionItem) {
        assertionItem.remove();
    }
}

/**
 * 添加编辑提取项
 * @param {string} containerId - 提取容器ID
 * @param {string} varName - 变量名
 * @param {string} path - 提取路径
 * @param {string} defaultValue - 默认值
 */
function addEditExtraction(containerId = 'editExtractionContainer', varName = '', path = '', defaultValue = '') {
    const extractionContainer = document.getElementById(containerId);
    const extractionCount = extractionContainer.children.length;

    if (extractionCount >= 10) {
        showToast('警告', '最多只能添加10个提取项', 'warning');
        return;
    }

    const extractionItem = document.createElement('div');
    extractionItem.className = 'row mb-2 extraction-item';
    extractionItem.innerHTML = `
        <div class="col-md-4">
            <input type="text" class="form-control form-control-sm extraction-varname" placeholder="变量名" value="${varName}">
        </div>
        <div class="col-md-4">
            <input type="text" class="form-control form-control-sm extraction-path" placeholder="提取路径 (如: data.user.id)" value="${path}">
        </div>
        <div class="col-md-3">
            <input type="text" class="form-control form-control-sm extraction-default" placeholder="默认值 (可选)" value="${defaultValue}">
        </div>
        <div class="col-md-1">
            <button type="button" class="btn btn-sm btn-outline-danger w-100" onclick="removeEditExtraction(this)">
                <i class="bi bi-trash"></i>
            </button>
        </div>
    `;

    extractionContainer.appendChild(extractionItem);
}

/**
 * 移除编辑提取项
 * @param {HTMLElement} button - 删除按钮元素
 */
function removeEditExtraction(button) {
    const extractionItem = button.closest('.extraction-item');
    if (extractionItem) {
        extractionItem.remove();
    }
}

/**
 * 设置编辑提取项
 * @param {Object} extractions - 提取对象
 * @param {string} containerId - 提取容器ID
 */
function setEditExtractions(extractions, containerId = 'editExtractionContainer') {
    const extractionContainer = document.getElementById(containerId);
    if (!extractionContainer) return;
    
    // 清空现有提取项
    extractionContainer.innerHTML = '';
    
    // 添加每个提取项
    for (const [varName, config] of Object.entries(extractions)) {
        if (config && typeof config === 'object' && 'path' in config) {
            addEditExtraction(
                containerId,
                varName,
                config.path || '',
                config.default || ''
            );
        }
    }
}

/**
 * 获取所有编辑提取项
 * @param {string} containerId - 提取容器ID
 * @returns {Object} 提取对象
 */
function getEditExtractions(containerId = 'editExtractionContainer') {
    const extractionContainer = document.getElementById(containerId);
    const extractionItems = extractionContainer.querySelectorAll('.extraction-item');
    const extractions = {};

    extractionItems.forEach(item => {
        const varName = item.querySelector('.extraction-varname').value.trim();
        const path = item.querySelector('.extraction-path').value.trim();
        const defaultValue = item.querySelector('.extraction-default').value;

        if (varName && path) {
            extractions[varName] = {
                path: path,
                default: defaultValue || null
            };
        }
    });

    return extractions;
}

/**
 * 更新编辑断言字段名的占位符
 * @param {HTMLElement} select - 选择框元素
 */
function updateEditAssertionFieldPlaceholder(select) {
    const fieldInput = select.closest('.assertion-item').querySelector('.assertion-field');
    if (select.value === 'status_code') {
        fieldInput.value = '';
        fieldInput.disabled = true;
        fieldInput.placeholder = '状态码无需字段名';
    } else {
        fieldInput.disabled = false;
        fieldInput.placeholder = '字段名';
    }
}

/**
 * 获取所有编辑断言
 * @param {string} containerId - 断言容器ID
 * @returns {Object} 断言对象
 */
function getEditAssertions(containerId = 'editAssertionContainer') {
    const assertionContainer = document.getElementById(containerId);
    const assertionItems = assertionContainer.querySelectorAll('.assertion-item');
    
    const assertions = {
        status_code: null,
        data: {}
    };
    
    assertionItems.forEach(item => {
        const type = item.querySelector('.assertion-type').value;
        const field = item.querySelector('.assertion-field').value;
        const expected = item.querySelector('.assertion-expected').value;
        
        if (type === 'status_code') {
            assertions.status_code = parseInt(expected) || null;
        } else if (type === 'data' && field && expected) {
            // 尝试解析期望值为JSON
            try {
                assertions.data[field] = JSON.parse(expected);
            } catch (e) {
                assertions.data[field] = expected;
            }
        }
    });
    
    return assertions;
}

/**
 * 设置编辑断言
 * @param {Object} assertions - 断言对象
 * @param {string} containerId - 断言容器ID
 */
function setEditAssertions(assertions, containerId = 'editAssertionContainer') {
    const assertionContainer = document.getElementById(containerId);
    assertionContainer.innerHTML = '';
    
    if (assertions.status_code !== undefined && assertions.status_code !== null) {
        addEditAssertion(containerId, 'status_code', '', assertions.status_code);
    }
    
    if (assertions.data) {
        for (const [field, expected] of Object.entries(assertions.data)) {
            addEditAssertion(containerId, 'data', field, typeof expected === 'object' ? JSON.stringify(expected) : expected);
        }
    }
}

/**
 * 显示Toast消息
 * @param {string} title - 标题
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型 (success, danger, warning, info)
 */
function showToast(title, message, type = 'info') {
    const toastTitle = document.getElementById('toastTitle');
    const toastBody = document.getElementById('toastBody');
    const messageToast = document.getElementById('messageToast');

    toastTitle.textContent = title;
    toastBody.textContent = message;

    // 设置Toast类型
    messageToast.className = 'toast';
    messageToast.classList.add('text-bg-' + type);

    // 显示Toast
    const toast = new bootstrap.Toast(messageToast);
    toast.show();
}

/**
 * 检查Flash消息
 */
function checkFlashMessages() {
    // 这里可以添加检查Flash消息的逻辑
    // 如果有Flash消息，则显示Toast
}
