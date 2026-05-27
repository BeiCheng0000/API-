/**
 * API自动化测试平台 - 项目管理脚本
 */

// 定时任务页面选中的项目/模块
let _schedulerSelectedProject = '';
let _schedulerSelectedModule = '';

/**
 * 获取定时任务列表数据（从后端接口直接获取最新数据）
 * @param {boolean} forceRefresh - 是否强制刷新（保留参数以保持兼容性）
 * @returns {Promise<Array>} 定时任务列表数据
 */
function fetchSchedulerList(forceRefresh = false) {
    console.log('[fetchSchedulerList] 开始请求定时任务列表, forceRefresh:', forceRefresh);
    // 发起新请求，直接从后端接口获取最新数据
    return fetch('/scheduler/list')
        .then(response => {
            console.log('[fetchSchedulerList] 接口响应状态:', response.status);
            if (!response.ok) throw new Error('网络响应异常');
            return response.json();
        })
        .then(data => {
            console.log('[fetchSchedulerList] 接口返回的数据:', data);
            return data;
        });
}

// ========== 项目数据缓存机制 ==========
// 缓存项目列表数据，避免短时间内重复请求 /projects/list
let _projectsListCache = null;       // 缓存的数据
let _projectsListCacheTime = 0;      // 缓存时间戳
let _projectsListFetchPromise = null; // 正在进行的请求Promise（用于去重）
const _PROJECTS_LIST_CACHE_TTL = 3000; // 缓存有效期（毫秒）

/**
 * 获取项目列表数据（带缓存和请求去重）
 * 短时间内多次调用只会发一次实际请求，所有调用共享同一份数据
 * @param {boolean} forceRefresh - 是否强制刷新（跳过缓存读取，但仍复用进行中的请求）
 * @returns {Promise<Object>} 项目列表数据
 */
function fetchProjectsList(forceRefresh = false) {
    // 如果有正在进行的请求，直接复用该Promise（请求去重，无论是否forceRefresh）
    if (_projectsListFetchPromise) {
        return _projectsListFetchPromise;
    }

    // 如果缓存有效且非强制刷新，直接返回缓存数据
    if (!forceRefresh && _projectsListCache && (Date.now() - _projectsListCacheTime < _PROJECTS_LIST_CACHE_TTL)) {
        return Promise.resolve(_projectsListCache);
    }

    // 发起新请求
    _projectsListFetchPromise = fetch('/projects/list')
        .then(response => {
            if (!response.ok) throw new Error('网络响应异常');
            return response.json();
        })
        .then(data => {
            _projectsListCache = data;
            _projectsListCacheTime = Date.now();
            _projectsListFetchPromise = null; // 请求完成，清除进行中标记
            return data;
        })
        .catch(error => {
            _projectsListFetchPromise = null; // 请求失败，也要清除进行中标记
            throw error;
        });

    return _projectsListFetchPromise;
}

/**
 * 清除项目列表缓存（在增删改操作后调用，下次请求会重新获取）
 */
function invalidateProjectsListCache() {
    _projectsListCache = null;
    _projectsListCacheTime = 0;
    // 注意：不清除 _projectsListFetchPromise，避免打断正在进行的请求
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 加载项目列表（loadProjectsList内部会触发请求，loadSchedulerProjectTree复用同一请求）
    loadProjectsList();

    // 加载定时任务页面项目树（会复用loadProjectsList的请求，不会重复发请求）
    loadSchedulerProjectTree();

    // 检查是否有Flash消息
    checkFlashMessages();
});

/**
 * 加载项目列表
 */
// 当前选中的项目和模块
let _selectedProject = '';
let _selectedModule = '';

// 记录展开状态
let _expandedProjects = new Set();

/**
 * 展开/折叠项目
 * @param {HTMLElement} projectEl - 项目树元素
 */
function toggleProject(projectEl) {
    const projectName = projectEl.dataset.project;
    const isExpanded = projectEl.classList.contains('expanded');

    if (isExpanded) {
        projectEl.classList.remove('expanded');
        _expandedProjects.delete(projectName);
    } else {
        projectEl.classList.add('expanded');
        _expandedProjects.add(projectName);
    }
}

/**
 * 加载项目列表（树形结构）
 */
function loadProjectsList(forceRefresh = false) {
    if (forceRefresh) {
        invalidateProjectsListCache();
    }
    fetchProjectsList(forceRefresh)
        .then(projectsData => {
            const projectsList = document.getElementById('projectsList');
            projectsList.innerHTML = '';

            if (!projectsData || typeof projectsData !== 'object') {
                throw new Error('服务器返回的数据格式不正确');
            }

            if (Object.keys(projectsData).length === 0) {
                projectsList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon"><i class="bi bi-folder2-open"></i></div>
                        <div class="empty-state-title">暂无项目</div>
                        <div class="empty-state-desc">点击上方按钮添加第一个项目</div>
                        <button type="button" class="btn btn-primary btn-sm mt-2" onclick="showAddProjectModal()"><i class="bi bi-plus-lg me-1"></i>添加项目</button>
                    </div>
                `;
                clearApisPanel();
                return;
            }

            for (const [projectName, projectData] of Object.entries(projectsData)) {
                if (!projectData || typeof projectData !== 'object') continue;

                const modules = projectData.modules || {};
                const moduleCount = Object.keys(modules).length;
                const safeName = escapeHtml(projectName);
                const safeDesc = escapeHtml(projectData.description || '');
                const alertEnabled = projectData.alert_enabled || '0';
                const alertEmail = escapeHtml(projectData.alert_email || '');
                const isExpanded = _expandedProjects.has(projectName);

                // 构建子内容HTML
                let childrenHtml = '';

                if (moduleCount > 0) {
                    for (const [modName, modData] of Object.entries(modules)) {
                        const safeModName = escapeHtml(modName);
                        const safeModDesc = escapeHtml(modData.description || '');
                        const apiCount = modData.apis ? modData.apis.length : 0;
                        const isActive = (projectName === _selectedProject && modName === _selectedModule) ? ' active' : '';
                        childrenHtml += `
                            <div class="tree-module${isActive}" data-project="${safeName}" data-module="${safeModName}" onclick="event.stopPropagation(); selectModule('${safeName}', '${safeModName}')">
                                <div class="tree-module-icon"><i class="bi bi-collection-fill"></i></div>
                                <div class="tree-module-info">
                                    <div class="tree-module-name">${safeModName}</div>
                                    <div class="tree-module-stat">${apiCount} 个接口</div>
                                </div>
                                <div class="tree-module-actions">
                                    <button class="btn btn-icon btn-icon-sm btn-soft-success" data-project="${safeName}" data-module="${safeModName}" onclick="event.stopPropagation(); runModuleTests(this.dataset.project, this.dataset.module)" title="运行全部"><i class="bi bi-play-fill"></i></button>
                                    <button class="btn btn-icon btn-icon-sm btn-soft-primary" data-project="${safeName}" data-module="${safeModName}" onclick="event.stopPropagation(); showAddApiModal(this.dataset.project, this.dataset.module)" title="添加接口"><i class="bi bi-plus-lg"></i></button>
                                    <button class="btn btn-icon btn-icon-sm btn-soft-warning" data-project="${safeName}" data-module="${safeModName}" data-desc="${safeModDesc}" onclick="event.stopPropagation(); showEditModuleModal(this.dataset.project, this.dataset.module, this.dataset.desc)" title="编辑模块"><i class="bi bi-pencil"></i></button>
                                    ${apiCount > 0 ? '<button class="btn btn-icon btn-icon-sm btn-soft-danger" disabled title="请先删除所有接口"><i class="bi bi-trash3"></i></button>' : '<button class="btn btn-icon btn-icon-sm btn-soft-danger" data-project="' + safeName + '" data-module="' + safeModName + '" onclick="event.stopPropagation(); deleteModule(this.dataset.project, this.dataset.module)" title="删除模块"><i class="bi bi-trash3"></i></button>'}
                                </div>
                            </div>
                        `;
                    }
                } else {
                    childrenHtml += `
                        <div class="tree-empty-hint">
                            <span>暂无模块</span>
                            <button type="button" class="btn btn-sm btn-link py-0" onclick="event.stopPropagation(); showAddModuleModal('${safeName}')"><i class="bi bi-plus-lg"></i>添加</button>
                        </div>
                    `;
                }

                const projectEl = document.createElement('div');
                projectEl.className = 'tree-project' + (isExpanded ? ' expanded' : '');
                projectEl.setAttribute('data-project', projectName);
                projectEl.innerHTML = `
                    <div class="tree-project-row" onclick="toggleProject(this.parentElement)">
                        <div class="tree-toggle"><i class="bi bi-chevron-right"></i></div>
                        <div class="tree-project-icon"><i class="bi bi-folder-fill"></i></div>
                        <div class="tree-project-info">
                            <div class="tree-project-name">${safeName}</div>
                        </div>
                        <div class="tree-project-actions">
                            <button class="btn btn-icon btn-icon-sm btn-soft-warning" data-project="${safeName}" data-desc="${safeDesc}" data-alert-enabled="${alertEnabled}" data-alert-email="${alertEmail}" onclick="event.stopPropagation(); showEditProjectModal(this.dataset.project, this.dataset.desc, this.dataset.alertEnabled, this.dataset.alertEmail)" title="编辑项目"><i class="bi bi-pencil"></i></button>
                            <button class="btn btn-icon btn-icon-sm btn-soft-primary" data-project="${safeName}" onclick="event.stopPropagation(); showAddModuleModal(this.dataset.project)" title="添加模块"><i class="bi bi-plus-lg"></i></button>
                            <button class="btn btn-icon btn-icon-sm btn-soft-info" data-project="${safeName}" onclick="event.stopPropagation(); showProjectEnvModal(this.dataset.project)" title="环境配置"><i class="bi bi-globe2"></i></button>
                            <button class="btn btn-icon btn-icon-sm btn-soft-secondary" data-project="${safeName}" onclick="event.stopPropagation(); showProjectVarModal(this.dataset.project)" title="变量管理"><i class="bi bi-braces"></i></button>
                            ${moduleCount > 0 ? '<button class="btn btn-icon btn-icon-sm btn-soft-danger" disabled title="请先删除所有模块"><i class="bi bi-trash3"></i></button>' : '<button class="btn btn-icon btn-icon-sm btn-soft-danger" data-project="' + safeName + '" onclick="event.stopPropagation(); deleteProject(this.dataset.project)" title="删除项目"><i class="bi bi-trash3"></i></button>'}
                        </div>
                    </div>
                    <div class="tree-project-children" id="projectChildren-${safeName.replaceAll(' ', '_')}">
                        ${childrenHtml}
                    </div>
                `;
                projectsList.appendChild(projectEl);
            }

            // 如果没有选中的项目和模块，默认选中第一个项目和第一个模块
            if (!_selectedProject || !_selectedModule) {
                const firstProject = Object.keys(projectsData)[0];
                if (firstProject) {
                    const firstModules = projectsData[firstProject].modules || {};
                    const firstModule = Object.keys(firstModules)[0];
                    if (firstModule) {
                        // 展开第一个项目
                        _expandedProjects.add(firstProject);
                        const firstProjectEl = projectsList.querySelector(`.tree-project[data-project="${firstProject}"]`);
                        if (firstProjectEl) firstProjectEl.classList.add('expanded');
                        // 选中第一个模块
                        selectModule(firstProject, firstModule);
                    }
                }
            } else {
                // 恢复之前选中的项目展开状态
                if (_expandedProjects.size === 0) {
                    _expandedProjects.add(_selectedProject);
                    const selectedProjectEl = projectsList.querySelector(`.tree-project[data-project="${_selectedProject}"]`);
                    if (selectedProjectEl) selectedProjectEl.classList.add('expanded');
                }
            }

        })
        .catch(error => {
            console.error('加载项目列表失败:', error);
            showToast('错误', '加载项目列表失败: ' + error.message, 'danger');
            const projectsList = document.getElementById('projectsList');
            if (projectsList) {
                projectsList.innerHTML = `
                    <div class="text-center text-danger py-4">
                        <p>加载项目列表失败</p>
                        <button type="button" class="btn btn-sm btn-primary" onclick="loadProjectsList()">
                            <i class="bi bi-arrow-clockwise"></i> 重试
                        </button>
                    </div>
                `;
            }
        });
}

/**
 * 清空接口面板
 */
function clearApisPanel() {
    const apisList = document.getElementById('apisList');
    if (apisList) {
        apisList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="bi bi-cursor-fill"></i></div>
                <div class="empty-state-title">请选择模块</div>
                <div class="empty-state-desc">展开项目并选择一个模块查看接口</div>
            </div>
        `;
    }
    const apiPanelActions = document.getElementById('apiPanelActions');
    if (apiPanelActions) apiPanelActions.style.display = 'none';
}

/**
 * 刷新项目列表并保持选中状态
 * @param {string} activeProject - 当前选中的项目名称
 */
function refreshProjectsList(activeProject) {
    if (activeProject) _selectedProject = activeProject;
    loadProjectsList(true);
}

/**
 * 显示添加项目模态框
 */
function showAddProjectModal() {
    const modal = new bootstrap.Modal(document.getElementById('addProjectModal'));
    document.getElementById('addProjectForm').reset();
    // 默认不启用报警，隐藏邮箱输入框
    document.getElementById('projectAlertEnabled').checked = false;
    document.getElementById('projectAlertEmailGroup').style.display = 'none';
    modal.show();
}

// 邮箱报警开关联动效果
document.getElementById('projectAlertEnabled').addEventListener('change', function() {
    const emailGroup = document.getElementById('projectAlertEmailGroup');
    emailGroup.style.display = this.checked ? 'block' : 'none';
});

document.getElementById('editProjectAlertEnabled').addEventListener('change', function() {
    const emailGroup = document.getElementById('editProjectAlertEmailGroup');
    emailGroup.style.display = this.checked ? 'block' : 'none';
});

/**
 * 添加项目
 */
function addProject() {
    const projectName = document.getElementById('projectName').value.trim();
    const projectDesc = document.getElementById('projectDesc').value.trim();
    const alertEnabled = document.getElementById('projectAlertEnabled').checked ? 1 : 0;
    const alertEmail = document.getElementById('projectAlertEmail').value.trim();

    if (!projectName) {
        showToast('错误', '项目名称不能为空', 'danger');
        return;
    }

    // 如果启用报警，必须填写邮箱
    if (alertEnabled && !alertEmail) {
        showToast('错误', '启用报警时必须填写报警邮箱', 'danger');
        return;
    }

    // 验证邮箱格式和数量
    if (alertEmail) {
        const emailList = alertEmail.split(',').map(e => e.trim()).filter(e => e);
        if (emailList.length > 20) {
            showToast('错误', `报警邮箱最多20个，当前${emailList.length}个`, 'danger');
            return;
        }
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        for (const email of emailList) {
            if (!emailPattern.test(email)) {
                showToast('错误', `邮箱格式不正确: ${email}`, 'danger');
                return;
            }
        }
    }

    const formData = new FormData();
    formData.append('project_name', projectName);
    formData.append('project_desc', projectDesc);
    formData.append('alert_enabled', alertEnabled);
    formData.append('alert_email', alertEmail);

    fetch('/projects/add', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showToast('成功', result.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('addProjectModal')).hide();
            loadProjectsList(true);
            if (typeof loadTopStats === 'function') loadTopStats();
        } else {
            showToast('错误', result.error, 'danger');
        }
    })
    .catch(error => {
        showToast('错误', '添加项目失败: ' + error.message, 'danger');
    });
}

/**
 * 删除项目
 * @param {string} projectName - 项目名称
 */
function deleteProject(projectName) {
    if (!confirm(`确定要删除项目"${projectName}"吗？此操作不可恢复。`)) {
        return;
    }

    fetch(`/projects/delete/${projectName}`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showToast('成功', result.message, 'success');
            loadProjectsList(true);
            if (typeof loadTopStats === 'function') loadTopStats();
        } else {
            showToast('错误', result.error, 'danger');
        }
    })
    .catch(error => {
        showToast('错误', '删除项目失败: ' + error.message, 'danger');
    });
}

/**
 * 显示编辑项目模态框
 * @param {string} projectName - 项目名称
 * @param {string} projectDesc - 项目描述
 * @param {string} alertEnabled - 是否启用报警
 * @param {string} alertEmail - 报警邮箱
 */
function showEditProjectModal(projectName, projectDesc, alertEnabled, alertEmail) {
    document.getElementById('editProjectOldName').value = projectName;
    document.getElementById('editProjectName').value = projectName;
    document.getElementById('editProjectDesc').value = projectDesc;
    document.getElementById('editProjectAlertEnabled').checked = alertEnabled === '1';
    document.getElementById('editProjectAlertEmail').value = alertEmail || '';
    // 根据报警开关显示/隐藏邮箱输入框
    document.getElementById('editProjectAlertEmailGroup').style.display = alertEnabled === '1' ? 'block' : 'none';
    const modal = new bootstrap.Modal(document.getElementById('editProjectModal'));
    modal.show();
}

/**
 * 更新项目
 */
function updateProject() {
    const oldName = document.getElementById('editProjectOldName').value;
    const projectName = document.getElementById('editProjectName').value.trim();
    const projectDesc = document.getElementById('editProjectDesc').value.trim();
    const alertEnabled = document.getElementById('editProjectAlertEnabled').checked ? 1 : 0;
    const alertEmail = document.getElementById('editProjectAlertEmail').value.trim();

    if (!projectName) {
        showToast('错误', '项目名称不能为空', 'danger');
        return;
    }

    // 如果启用报警，必须填写邮箱
    if (alertEnabled && !alertEmail) {
        showToast('错误', '启用报警时必须填写报警邮箱', 'danger');
        return;
    }

    // 验证邮箱格式和数量
    if (alertEmail) {
        const emailList = alertEmail.split(',').map(e => e.trim()).filter(e => e);
        if (emailList.length > 20) {
            showToast('错误', `报警邮箱最多20个，当前${emailList.length}个`, 'danger');
            return;
        }
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        for (const email of emailList) {
            if (!emailPattern.test(email)) {
                showToast('错误', `邮箱格式不正确: ${email}`, 'danger');
                return;
            }
        }
    }

    const formData = new FormData();
    formData.append('old_name', oldName);
    formData.append('project_name', projectName);
    formData.append('project_desc', projectDesc);
    formData.append('alert_enabled', alertEnabled);
    formData.append('alert_email', alertEmail);

    fetch('/projects/update', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showToast('成功', result.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('editProjectModal')).hide();
            loadProjectsList(true);
            if (typeof loadTopStats === 'function') loadTopStats();
        } else {
            showToast('错误', result.error, 'danger');
        }
    })
    .catch(error => {
        showToast('错误', '更新项目失败: ' + error.message, 'danger');
    });
}

/**
 * 显示编辑模块模态框
 * @param {string} projectName - 项目名称
 * @param {string} moduleName - 模块名称
 * @param {string} moduleDesc - 模块描述
 */
function showEditModuleModal(projectName, moduleName, moduleDesc) {
    document.getElementById('editModuleProjectName').value = projectName;
    document.getElementById('editModuleOldName').value = moduleName;
    document.getElementById('editModuleName').value = moduleName;
    document.getElementById('editModuleDesc').value = moduleDesc;
    const modal = new bootstrap.Modal(document.getElementById('editModuleModal'));
    modal.show();
}

/**
 * 更新模块
 */
function updateModule() {
    const projectName = document.getElementById('editModuleProjectName').value;
    const oldName = document.getElementById('editModuleOldName').value;
    const moduleName = document.getElementById('editModuleName').value.trim();
    const moduleDesc = document.getElementById('editModuleDesc').value.trim();

    if (!moduleName) {
        showToast('错误', '模块名称不能为空', 'danger');
        return;
    }

    const formData = new FormData();
    formData.append('old_name', oldName);
    formData.append('module_name', moduleName);
    formData.append('module_desc', moduleDesc);

    fetch(`/projects/${projectName}/modules/update`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showToast('成功', result.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('editModuleModal')).hide();
            loadProjectsList(true);
            if (typeof loadTopStats === 'function') loadTopStats();
        } else {
            showToast('错误', result.error, 'danger');
        }
    })
    .catch(error => {
        showToast('错误', '更新模块失败: ' + error.message, 'danger');
    });
}

/**
 * 显示添加模块模态框
 * @param {string} projectName - 项目名称
 */
function showAddModuleModal(projectName) {
    const modal = new bootstrap.Modal(document.getElementById('addModuleModal'));
    document.getElementById('addModuleForm').reset();
    document.getElementById('moduleProjectName').value = projectName;
    modal.show();
}

/**
 * 添加模块
 */
function addModule() {
    const projectName = document.getElementById('moduleProjectName').value;
    const moduleName = document.getElementById('moduleName').value.trim();
    const moduleDesc = document.getElementById('moduleDesc').value.trim();

    if (!projectName) {
        showToast('错误', '项目名称不能为空', 'danger');
        return;
    }

    if (!moduleName) {
        showToast('错误', '模块名称不能为空', 'danger');
        return;
    }

    const formData = new FormData();
    formData.append('project_name', projectName);
    formData.append('module_name', moduleName);
    formData.append('module_desc', moduleDesc);

    console.log(`准备添加模块: 项目=${projectName}, 模块=${moduleName}, 描述=${moduleDesc}`);

    fetch(`/projects/${projectName}/modules/add`, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        console.log(`收到响应: status=${response.status}, ok=${response.ok}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(result => {
        console.log(`解析JSON结果:`, result);
        if (result.success) {
            showToast('成功', result.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('addModuleModal')).hide();
            loadProjectsList();
            if (typeof loadTopStats === 'function') loadTopStats();
        } else {
            showToast('错误', result.error, 'danger');
        }
    })
    .catch(error => {
        console.error('添加模块失败:', error);
        showToast('错误', '添加模块失败: ' + error.message, 'danger');
    });
}

/**
 * HTML转义函数，防止XSS和特殊字符导致的问题
 * @param {string} str - 需要转义的字符串
 * @returns {string} 转义后的字符串
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * 搜索过滤项目
 * @param {string} keyword - 搜索关键词
 */
function filterProjects(keyword) {
    const projects = document.querySelectorAll('.tree-project');
    const lowerKeyword = keyword.toLowerCase().trim();
    projects.forEach(project => {
        const projectName = project.dataset.project || '';
        if (!lowerKeyword || projectName.toLowerCase().includes(lowerKeyword)) {
            project.style.display = '';
            // 如果有搜索关键词，自动展开匹配的项目
            if (lowerKeyword) {
                project.classList.add('expanded');
                _expandedProjects.add(projectName);
            }
        } else {
            project.style.display = 'none';
        }
    });
}

/**
 * 选择项目（展开项目树）
 * @param {string} projectName - 项目名称
 */
function selectProject(projectName) {
    _selectedProject = projectName;
    _selectedModule = '';

    // 展开项目
    const projectEl = document.querySelector(`.tree-project[data-project="${projectName}"]`);
    if (projectEl && !projectEl.classList.contains('expanded')) {
        projectEl.classList.add('expanded');
        _expandedProjects.add(projectName);
    }

    // 清空接口面板
    clearApisPanel();
}

/**
 * 选择模块
 * @param {string} projectName - 项目名称
 * @param {string} moduleName - 模块名称
 */
function selectModule(projectName, moduleName) {
    _selectedProject = projectName;
    _selectedModule = moduleName;

    // 高亮选中的模块
    document.querySelectorAll('.tree-module').forEach(item => {
        item.classList.remove('active');
    });
    const selectedModule = document.querySelector(`.tree-module[data-project="${projectName}"][data-module="${moduleName}"]`);
    if (selectedModule) {
        selectedModule.classList.add('active');
    }

    // 显示接口面板操作按钮
    const apiPanelActions = document.getElementById('apiPanelActions');
    if (apiPanelActions) {
        apiPanelActions.style.display = '';
        const btnRunAll = document.getElementById('btnRunAllFromPanel');
        if (btnRunAll) {
            btnRunAll.onclick = function() { runModuleTests(projectName, moduleName); };
        }
        const btnAddApi = document.getElementById('btnAddApiFromPanel');
        if (btnAddApi) {
            btnAddApi.onclick = function() { showAddApiModal(projectName, moduleName); };
        }
    }

    // 加载接口列表
    loadApisList(projectName, moduleName);

    // 加载环境栏
    if (typeof loadProjectEnv === 'function') {
        loadProjectEnv(projectName);
    }
}

/**
 * 加载接口列表
 * @param {string} projectName - 项目名称
 * @param {string} moduleName - 模块名称
 */
function loadApisList(projectName, moduleName) {
    fetchProjectsList()
    .then(projectsData => {
        const apisList = document.getElementById('apisList');
        if (!apisList) return;

        if (!projectsData[projectName] || !projectsData[projectName].modules[moduleName]) {
            apisList.innerHTML = '<p class="text-muted text-center">模块不存在</p>';
            return;
        }

        const moduleData = projectsData[projectName].modules[moduleName];
        const safeProjectName = escapeHtml(projectName);
        const safeModuleName = escapeHtml(moduleName);
        const apis = moduleData.apis || [];

        let apisHtml = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="mb-0"><i class="bi bi-collection-fill text-primary me-2"></i>${safeModuleName}</h5>
                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-sm btn-success" data-project="${safeProjectName}" data-module="${safeModuleName}" onclick="runModuleTests(this.dataset.project, this.dataset.module)" title="运行全部"><i class="bi bi-play-fill me-1"></i>运行全部</button>
                    <button type="button" class="btn btn-sm btn-primary" data-project="${safeProjectName}" data-module="${safeModuleName}" onclick="showAddApiModal(this.dataset.project, this.dataset.module)" title="添加接口"><i class="bi bi-plus-lg me-1"></i>添加接口</button>
                </div>
            </div>
        `;

        if (apis.length === 0) {
            apisHtml += `
                <div class="empty-state">
                    <div class="empty-state-icon"><i class="bi bi-plug"></i></div>
                    <div class="empty-state-title">暂无接口</div>
                    <div class="empty-state-desc">点击上方按钮添加第一个接口</div>
                </div>
            `;
        } else {
            apisHtml += '<div class="api-list">';
            for (let i = 0; i < apis.length; i++) {
                const api = apis[i];
                const apiId = api.id;  // 使用数据库ID
                const safeMethod = escapeHtml(api.method);
                const safeCaseName = escapeHtml(api.case_name);
                const safeUrl = escapeHtml(api.url);
                apisHtml += `
                    <div class="api-card method-card-${safeMethod}">
                        <div class="api-info">
                            <span class="method-badge method-${safeMethod}">${safeMethod}</span>
                            <div>
                                <div class="api-card-name">${safeCaseName}</div>
                                <div class="api-url">${safeUrl}</div>
                            </div>
                        </div>
                        <div class="api-actions">
                            <button type="button" class="btn btn-icon btn-icon-sm btn-soft-primary" data-project="${safeProjectName}" data-module="${safeModuleName}" data-id="${apiId}" onclick="debugApi(this.dataset.project, this.dataset.module, this.dataset.id)" title="调试"><i class="bi bi-bug"></i></button>
                            <button type="button" class="btn btn-icon btn-icon-sm btn-soft-warning" data-project="${safeProjectName}" data-module="${safeModuleName}" data-id="${apiId}" onclick="editApi(this.dataset.project, this.dataset.module, this.dataset.id)" title="编辑"><i class="bi bi-pencil"></i></button>
                            <button type="button" class="btn btn-icon btn-icon-sm btn-soft-success" data-project="${safeProjectName}" data-module="${safeModuleName}" data-id="${apiId}" onclick="executeTest(this.dataset.project, this.dataset.module, this.dataset.id)" title="执行"><i class="bi bi-play-fill"></i></button>
                            <button type="button" class="btn btn-icon btn-icon-sm btn-soft-primary" data-project="${safeProjectName}" data-module="${safeModuleName}" data-id="${apiId}" onclick="showSchedulerModal(this.dataset.project, this.dataset.module, this.dataset.id)" title="定时任务"><i class="bi bi-clock"></i></button>
                            <button type="button" class="btn btn-icon btn-icon-sm btn-soft-danger" data-project="${safeProjectName}" data-module="${safeModuleName}" data-id="${apiId}" onclick="deleteApi(this.dataset.project, this.dataset.module, this.dataset.id)" title="删除"><i class="bi bi-trash3"></i></button>
                        </div>
                    </div>
                `;
            }
            apisHtml += '</div>';
        }

        apisList.innerHTML = apisHtml;
    })
    .catch(error => {
        console.error('加载接口列表失败:', error);
        showToast('错误', '加载接口列表失败: ' + error.message, 'danger');
    });
}


/**
 * 加载模块列表（兼容性入口）
 * @param {string} projectName - 项目名称
 */
function loadModulesList(projectName) {
    selectProject(projectName);
}

/**
 * 显示添加接口模态框
 * @param {string} projectName - 项目名称
 * @param {string} moduleName - 模块名称
 */
function showAddApiModal(projectName, moduleName = '') {
    const modal = new bootstrap.Modal(document.getElementById('addApiModal'));
    document.getElementById('addApiForm').reset();
    document.getElementById('apiProjectName').value = projectName;

    // 动态加载模块下拉列表
    const moduleSelect = document.getElementById('addApiModuleName');
    moduleSelect.innerHTML = '<option value="">请选择模块</option>';

    fetchProjectsList()
        .then(projectsData => {
            if (projectsData[projectName] && projectsData[projectName].modules) {
                const modules = projectsData[projectName].modules;
                for (const modName of Object.keys(modules)) {
                    const option = document.createElement('option');
                    option.value = modName;
                    option.textContent = modName;
                    if (modName === moduleName) {
                        option.selected = true;
                    }
                    moduleSelect.appendChild(option);
                }
            }
        })
        .catch(error => {
            console.error('加载模块列表失败:', error);
        });

    // 清空并初始化请求头表格，添加默认行
    setKvTableData('addHeadersTable', false, {'Content-Type': 'application/json'});

    // 清空并初始化请求体表格
    setKvTableData('addBodyTable', true, {});

    // 重置为表格模式
    switchBodyMode('add', 'table');

    // 清空JSON输入框
    const addDataJson = document.getElementById('addApiDataJson');
    if (addDataJson) addDataJson.value = '';

    // 初始化断言配置，默认添加状态码200断言
    setEditAssertions({status_code: 200, data: {}}, 'addAssertionContainer');
    
    // 初始化提取配置
    setEditExtractions({}, 'addExtractionContainer');

    modal.show();
}

/**
 * 添加接口
 */
function addApi() {
    const projectName = document.getElementById('apiProjectName').value;
    const moduleName = document.getElementById('addApiModuleName').value;
    const caseName = document.getElementById('addApiCaseName').value.trim();
    const method = document.getElementById('addApiMethod').value;
    const url = document.getElementById('addApiUrl').value.trim();
    const headers = getHeadersData('add');
    const data = getBodyData('add');

    if (!projectName) {
        showToast('错误', '项目名称不能为空', 'danger');
        return;
    }

    if (!moduleName) {
        showToast('错误', '模块名称不能为空', 'danger');
        return;
    }

    if (!caseName || !url) {
        showToast('错误', '请填写所有必填字段', 'danger');
        return;
    }

    const formData = new FormData();
    formData.append('project_name', projectName);
    formData.append('module_name', moduleName);
    formData.append('case_name', caseName);
    formData.append('url', url);
    formData.append('method', method);
    formData.append('headers', headers);
    formData.append('data', data);
    formData.append('expected', JSON.stringify(getEditAssertions('addAssertionContainer')));
    formData.append('extractions', JSON.stringify(getEditExtractions('addExtractionContainer')));

    fetch(`/projects/${projectName}/modules/${moduleName}/apis/add`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showToast('成功', result.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('addApiModal')).hide();
            // 刷新项目列表以显示更新的模块信息
            loadProjectsList();
            // 刷新当前模块的接口列表
            loadApisList(projectName, moduleName);
            if (typeof loadTopStats === 'function') loadTopStats();
        } else {
            showToast('错误', result.error, 'danger');
        }
    })
    .catch(error => {
        showToast('错误', '添加接口失败: ' + error.message, 'danger');
    });
}

/**
 * 删除模块
 * @param {string} projectName - 项目名称
 * @param {string} moduleName - 模块名称
 */
function deleteModule(projectName, moduleName) {
    if (!confirm(`确定要删除模块"${moduleName}"吗？此操作不可恢复。`)) {
        return;
    }

    fetch(`/projects/${projectName}/modules/delete/${moduleName}`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showToast('成功', result.message, 'success');
            loadProjectsList();
            if (typeof loadTopStats === 'function') loadTopStats();
        } else {
            showToast('错误', result.error, 'danger');
        }
    })
    .catch(error => {
        showToast('错误', '删除模块失败: ' + error.message, 'danger');
    });
}

/**
 * 删除接口
 * @param {string} projectName - 项目名称
 * @param {string} moduleName - 模块名称
 * @param {number} apiIndex - 接口索引
 */
function deleteApi(projectName, moduleName, apiId) {
    if (!confirm('确定要删除这个接口吗？')) {
        return;
    }

    fetch(`/projects/${projectName}/modules/${moduleName}/apis/delete/${apiId}`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showToast('成功', result.message, 'success');
            loadProjectsList();
            // 刷新当前模块的接口列表
            loadApisList(projectName, moduleName);
            if (typeof loadTopStats === 'function') loadTopStats();
        } else {
            showToast('错误', result.error, 'danger');
        }
    })
    .catch(error => {
        showToast('错误', '删除接口失败: ' + error.message, 'danger');
    });
}

/**
 * 加载定时任务列表
 */
/**
 * 加载定时任务页面的项目树
 */
function loadSchedulerProjectTree() {
    fetchProjectsList()
    .then(projectsData => {
        const container = document.getElementById('schedulerProjectsList');
        if (!container) return;

        let html = '';
        for (const [projectName, projectData] of Object.entries(projectsData)) {
            const safeName = escapeHtml(projectName);
            const modules = projectData.modules || {};
            const moduleEntries = Object.entries(modules);
            html += `
            <div class="tree-project" data-project="${safeName}">
                <div class="tree-project-row" onclick="toggleSchedulerProject(this.parentElement)">
                    <div class="tree-toggle"><i class="bi bi-chevron-right"></i></div>
                    <div class="tree-project-icon"><i class="bi bi-folder-fill"></i></div>
                    <div class="tree-project-info">
                        <div class="tree-project-name">${safeName}</div>
                    </div>
                </div>
                <div class="tree-project-children" id="schedulerProjectChildren-${safeName.replace(/ /g, '_')}">
                    ${moduleEntries.length === 0 ? '<div class="tree-empty-hint"><span>暂无模块</span></div>' : ''}
                    ${moduleEntries.map(([moduleName, moduleData]) => {
                        const safeModName = escapeHtml(moduleName);
                        return `
                        <div class="tree-module" data-project="${safeName}" data-module="${safeModName}" onclick="selectSchedulerModule('${safeName}', '${safeModName}')">
                            <div class="tree-module-icon"><i class="bi bi-collection-fill"></i></div>
                            <div class="tree-module-info">
                                <div class="tree-module-name">${safeModName}</div>
                                <div class="tree-module-stat">加载中...</div>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>`;
        }

        if (!html) {
            html = `<div class="empty-state">
                <div class="empty-state-icon"><i class="bi bi-folder2-open"></i></div>
                <div class="empty-state-title">暂无项目</div>
            </div>`;
        }
        container.innerHTML = html;

        // 恢复之前选中模块的高亮状态，或默认选中第一个项目和第一个模块
        if (_schedulerSelectedProject && _schedulerSelectedModule) {
            const selectedModule = container.querySelector(`.tree-module[data-project="${_schedulerSelectedProject}"][data-module="${_schedulerSelectedModule}"]`);
            if (selectedModule) {
                selectedModule.classList.add('active');
            } else {
                // 之前选中的模块不存在了，重置并默认选中第一个
                _schedulerSelectedProject = '';
                _schedulerSelectedModule = '';
            }
        }

        // 如果没有选中的项目和模块，默认选中第一个项目和第一个模块
        console.log('[loadSchedulerProjectTree] 检查选中状态:', _schedulerSelectedProject, _schedulerSelectedModule);
        if (!_schedulerSelectedProject || !_schedulerSelectedModule) {
            console.log('[loadSchedulerProjectTree] 没有选中的项目和模块，准备选中第一个');
            const firstProject = Object.keys(projectsData)[0];
            console.log('[loadSchedulerProjectTree] 第一个项目:', firstProject);
            if (firstProject) {
                const firstModules = projectsData[firstProject].modules || {};
                const firstModule = Object.keys(firstModules)[0];
                console.log('[loadSchedulerProjectTree] 第一个模块:', firstModule);
                if (firstModule) {
                    // 展开第一个项目
                    const firstProjectEl = container.querySelector(`.tree-project[data-project="${firstProject}"]`);
                    if (firstProjectEl) firstProjectEl.classList.add('expanded');
                    // 选中第一个模块
                    console.log('[loadSchedulerProjectTree] 准备调用 selectSchedulerModule');
                    selectSchedulerModule(firstProject, firstModule);
                }
            }
        } else {
            console.log('[loadSchedulerProjectTree] 已有选中的项目和模块:', _schedulerSelectedProject, _schedulerSelectedModule);
            // 确保选中的项目展开
            const selectedProjectEl = container.querySelector(`.tree-project[data-project="${_schedulerSelectedProject}"]`);
            if (selectedProjectEl) selectedProjectEl.classList.add('expanded');
            // 加载选中模块的定时任务列表
            console.log('[loadSchedulerProjectTree] 准备调用 loadSchedulerJobsByModule 加载选中模块的定时任务');
            loadSchedulerJobsByModule(_schedulerSelectedProject, _schedulerSelectedModule);
        }

        // 加载定时任务列表，更新任务计数
        console.log('[loadSchedulerProjectTree] 开始加载定时任务列表，更新任务计数');
        fetchSchedulerList()
        .then(jobs => {
            console.log('[loadSchedulerProjectTree] 定时任务列表数据:', jobs);
            // 统计每个项目/模块的定时任务数
            const jobCountMap = {};
            jobs.forEach(job => {
                const key = job.project_name + '/' + job.module_name;
                jobCountMap[key] = (jobCountMap[key] || 0) + 1;
            });
            console.log('[loadSchedulerProjectTree] 任务计数:', jobCountMap);

            // 更新每个模块的任务计数
            document.querySelectorAll('#schedulerProjectsList .tree-module').forEach(moduleEl => {
                const projectName = moduleEl.dataset.project;
                const moduleName = moduleEl.dataset.module;
                const jobKey = projectName + '/' + moduleName;
                const jobCount = jobCountMap[jobKey] || 0;
                const statEl = moduleEl.querySelector('.tree-module-stat');
                if (statEl) {
                    statEl.textContent = `${jobCount} 个定时任务`;
                }
            });
        })
        .catch(error => {
            console.error('加载定时任务计数失败:', error);
        });
    })
    .catch(error => {
        console.error('加载定时任务项目树失败:', error);
    });
}

/**
 * 展开/折叠定时任务页面的项目
 */
function toggleSchedulerProject(projectEl) {
    projectEl.classList.toggle('expanded');
}

/**
 * 选择定时任务页面的模块，加载对应的定时任务列表
 */
function selectSchedulerModule(projectName, moduleName) {
    console.log('[selectSchedulerModule] 选中模块:', projectName, moduleName);
    _schedulerSelectedProject = projectName;
    _schedulerSelectedModule = moduleName;

    // 高亮选中的模块
    document.querySelectorAll('#schedulerProjectsList .tree-module').forEach(item => {
        item.classList.remove('active');
    });
    const selectedModule = document.querySelector(`#schedulerProjectsList .tree-module[data-project="${projectName}"][data-module="${moduleName}"]`);
    if (selectedModule) selectedModule.classList.add('active');

    // 加载该模块的定时任务（强制刷新，获取最新数据）
    console.log('[selectSchedulerModule] 准备调用 loadSchedulerJobsByModule');
    loadSchedulerJobsByModule(projectName, moduleName);
}

function refreshCurrentModuleScheduler() {
    console.log('[refreshCurrentModuleScheduler] 开始刷新当前模块的定时任务');
    if (!_schedulerSelectedProject || !_schedulerSelectedModule) {
        console.warn('[refreshCurrentModuleScheduler] 没有选中的项目和模块');
        return;
    }
    // 强制刷新，获取最新数据
    loadSchedulerJobsByModule(_schedulerSelectedProject, _schedulerSelectedModule);
}

/**
 * 按模块加载定时任务列表
 */
/**
 * 格式化Cron表达式为中文可读文本
 * @param {string} cronExpr - Cron表达式（5字段：分 时 日 月 周）
 * @returns {string} 可读化文本
 */
function formatCronExpression(cronExpr) {
    if (!cronExpr) return '未知';
    const parts = cronExpr.trim().split(/\s+/);
    if (parts.length !== 5) return cronExpr;

    const [minute, hour, day, month, weekday] = parts;

    // 每N分钟
    if (minute.startsWith('*/') && hour === '*' && day === '*' && month === '*' && weekday === '*') {
        return `每${minute.slice(2)}分钟`;
    }
    // 每分钟
    if (minute === '*' && hour === '*' && day === '*' && month === '*' && weekday === '*') {
        return '每分钟';
    }
    // 每N小时
    if (hour.startsWith('*/') && minute === '0' && day === '*' && month === '*' && weekday === '*') {
        return `每${hour.slice(2)}小时`;
    }
    // 每小时
    if (minute === '0' && hour === '*' && day === '*' && month === '*' && weekday === '*') {
        return '每小时';
    }
    // 每天固定时间
    if (minute !== '*' && hour !== '*' && day === '*' && month === '*' && weekday === '*') {
        return `每天 ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
    }
    // 每周几固定时间
    if (weekday !== '*' && minute !== '*' && hour !== '*' && day === '*' && month === '*') {
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const dayNames = weekday.split(',').map(d => weekdays[parseInt(d)] || '周' + d).join('、');
        return `${dayNames} ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
    }
    // 工作日
    if (weekday === '1-5' && minute !== '*' && hour !== '*' && day === '*' && month === '*') {
        return `工作日 ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
    }
    // 指定日期时间
    if (day !== '*' && minute !== '*' && hour !== '*' && month === '*' && weekday === '*') {
        return `每月${day}日 ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
    }

    return cronExpr;
}

function loadSchedulerJobsByModule(projectName, moduleName) {
    console.log('[loadSchedulerJobsByModule] 开始加载定时任务:', projectName, moduleName);
    fetchSchedulerList(true)  // 强制刷新，获取最新数据
    .then(jobs => {
        console.log('[loadSchedulerJobsByModule] 接口返回的数据:', jobs);
        const filtered = jobs.filter(j => j.project_name === projectName && j.module_name === moduleName);
        console.log('[loadSchedulerJobsByModule] 过滤后的数据:', filtered);
        const container = document.getElementById('schedulerJobsList');
        if (!container) return;

        const safeProjectName = escapeHtml(projectName);
        const safeModuleName = escapeHtml(moduleName);

        let html = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="mb-0"><i class="bi bi-collection-fill text-primary me-2"></i>${safeModuleName}</h5>
                <button class="btn btn-sm btn-outline-primary" onclick="refreshCurrentModuleScheduler()" title="刷新任务列表">
                    <i class="bi bi-arrow-clockwise"></i> 刷新
                </button>
            </div>
        `;

        if (filtered.length === 0) {
            html += `<div class="empty-state">
                <div class="empty-state-icon"><i class="bi bi-clock-history"></i></div>
                <div class="empty-state-title">暂无定时任务</div>
                <div class="empty-state-desc">该模块下还没有配置定时任务</div>
            </div>`;
        } else {
            html += '<div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead class="table-light"><tr><th style="width:50px;">序号</th><th>任务名称</th><th>下次执行时间</th><th>Cron表达式</th><th style="width:200px;">操作</th></tr></thead><tbody>';
            filtered.forEach((job, index) => {
                console.log('[loadSchedulerJobsByModule] 处理任务:', job.name, 'next_run_time:', job.next_run_time);
                // 格式化下次执行时间
                let nextRunTimeDisplay = '未知';
                if (job.next_run_time) {
                    nextRunTimeDisplay = job.next_run_time;
                }
                console.log('[loadSchedulerJobsByModule] 显示的下次执行时间:', nextRunTimeDisplay);

                html += `<tr>
                    <td class="text-center text-muted">${index + 1}</td>
                    <td>${escapeHtml(job.name)}</td>
                    <td>${nextRunTimeDisplay}</td>
                    <td><code>${escapeHtml(job.cron_expression || job.trigger)}</code><br><small class="text-muted">${formatCronExpression(job.cron_expression || job.trigger)}</small></td>
                    <td>
                        <button class="btn btn-sm btn-outline-secondary me-1" onclick="moveScheduler('${job.id}','up')" title="上移" ${index === 0 ? 'disabled' : ''}><i class="bi bi-arrow-up"></i></button>
                        <button class="btn btn-sm btn-outline-secondary me-1" onclick="moveScheduler('${job.id}','down')" title="下移" ${index === filtered.length - 1 ? 'disabled' : ''}><i class="bi bi-arrow-down"></i></button>
                        <button class="btn btn-sm btn-warning me-1" onclick="editScheduler('${job.id}','${escapeHtml(job.project_name)}','${escapeHtml(job.module_name)}',${job.api_id},'${escapeHtml(job.cron_expression)}')" title="编辑"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="deleteScheduler('${job.id}')" title="删除"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>`;
            });
            html += '</tbody></table></div>';
        }
        console.log('[loadSchedulerJobsByModule] 准备设置HTML内容');
        container.innerHTML = html;
        console.log('[loadSchedulerJobsByModule] HTML内容已设置');
    })
    .catch(error => {
        console.error('加载定时任务列表失败:', error);
    });
}

/**
 * 搜索过滤定时任务页面的项目树
 */
function filterSchedulerProjects(keyword) {
    const items = document.querySelectorAll('#schedulerProjectsList .tree-project');
    keyword = keyword.toLowerCase().trim();
    items.forEach(item => {
        const name = item.querySelector('.tree-project-name').textContent.toLowerCase();
        if (!keyword || name.includes(keyword)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

/**
 * 加载定时任务列表（兼容性入口，刷新当前选中模块或项目树）
 */
function loadSchedulerList() {
    // 刷新项目树（更新任务计数）
    loadSchedulerProjectTree();
    // 如果有选中模块，刷新该模块的任务列表
    if (_schedulerSelectedProject && _schedulerSelectedModule) {
        loadSchedulerJobsByModule(_schedulerSelectedProject, _schedulerSelectedModule);
    }
}

/**
 * 显示添加定时任务模态框
 * @param {string} projectName - 项目名称
 * @param {string} moduleName - 模块名称
 * @param {number} caseIndex - 用例索引
 */
function showSchedulerModal(projectName, moduleName, apiId) {
    // 重置为添加模式
    document.getElementById('schedulerJobId').value = '';
    document.getElementById('schedulerProjectName').value = projectName;
    document.getElementById('schedulerModuleName').value = moduleName;
    document.getElementById('schedulerCaseIndex').value = apiId;
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
 * @param {number} apiId - 接口ID
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
    formData.append('api_id', caseIndex);
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
        if (typeof loadTopStats === 'function') loadTopStats();

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
    formData.append('api_id', caseIndex);
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
        if (typeof loadTopStats === 'function') loadTopStats();

        showToast('成功', result.message || '定时任务更新成功', 'success');
    })
    .catch(error => {
        showToast('错误', '更新定时任务失败: ' + error.message, 'danger');
    });
}

/**
 * 移动定时任务排序（上移/下移）
 * @param {string} jobId - 任务ID
 * @param {string} direction - 移动方向 'up' 或 'down'
 */
function moveScheduler(jobId, direction) {
    const formData = new FormData();
    formData.append('job_id', jobId);
    formData.append('direction', direction);
    fetch('/scheduler/move', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            loadSchedulerList();
        } else {
            showToast('错误', result.message || '移动失败', 'danger');
        }
    })
    .catch(error => {
        showToast('错误', '移动失败: ' + error.message, 'danger');
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
function addApiAssertion(containerId = 'apiAssertionContainer', type = 'data', field = '', expected = '') {
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
            <select class="form-select form-select-sm assertion-type" onchange="updateApiAssertionFieldPlaceholder(this)">
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
            <button type="button" class="btn btn-sm btn-outline-danger w-100" onclick="removeApiAssertion(this)">
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
function removeApiAssertion(button) {
    const assertionItem = button.closest('.assertion-item');
    if (assertionItem) {
        assertionItem.remove();
    }
}

/**
 * 更新断言字段名的占位符
 * @param {HTMLElement} select - 选择框元素
 */
function updateApiAssertionFieldPlaceholder(select) {
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
function getApiAssertions(containerId = 'apiAssertionContainer') {
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
function setApiAssertions(assertions, containerId = 'apiAssertionContainer') {
    const assertionContainer = document.getElementById(containerId);
    assertionContainer.innerHTML = '';

    if (assertions.status_code !== undefined && assertions.status_code !== null) {
        addApiAssertion(containerId, 'status_code', '', assertions.status_code);
    }

    if (assertions.data) {
        for (const [field, expected] of Object.entries(assertions.data)) {
            addApiAssertion(containerId, 'data', field, typeof expected === 'object' ? JSON.stringify(expected) : expected);
        }
    }
}

/**
 * 编辑API
 * @param {string} projectName - 项目名称
 * @param {string} moduleName - 模块名称
 * @param {number} apiId - 接口ID（数据库ID）
 */
function editApi(projectName, moduleName, apiId) {
    // 从服务器获取API数据
    fetch(`/projects/${projectName}/modules/${moduleName}/apis/get/${apiId}`)
        .then(response => response.json())
        .then(apiData => {
            if (apiData.error) {
                showToast('错误', apiData.error, 'danger');
                return;
            }

            // 填充编辑表单
            document.getElementById('editApiName').value = apiData.project_name;
            document.getElementById('editCaseIndex').value = apiData.api_index;
            document.getElementById('editCaseName').value = apiData.case_name;
            document.getElementById('editUrl').value = apiData.url;
            document.getElementById('editMethod').value = apiData.method;

            // 保存模块名到隐藏字段
            let moduleNameInput = document.getElementById('editModuleName');
            if (!moduleNameInput) {
                moduleNameInput = document.createElement('input');
                moduleNameInput.type = 'hidden';
                moduleNameInput.id = 'editModuleName';
                document.getElementById('editApiForm').appendChild(moduleNameInput);
            }
            moduleNameInput.value = apiData.module_name;

            // 使用统一接口设置请求头和请求体
            setHeadersData('edit', apiData.headers || {});
            setBodyData('edit', apiData.data || {});
            // 只有当data是字典时才切换到表格模式，字符串时setBodyData会自动切换到JSON模式
            if (typeof apiData.data !== 'string') {
                switchBodyMode('edit', 'table');
            }

            // 设置断言
            setEditAssertions(apiData.expected || {}, 'editAssertionContainer');
            
            // 设置提取配置
            setEditExtractions(apiData.extractions || {}, 'editExtractionContainer');

            // 显示编辑模态框
            const editModal = new bootstrap.Modal(document.getElementById('editApiModal'));
            editModal.show();
        })
        .catch(error => {
            showToast('错误', '获取API数据失败: ' + error.message, 'danger');
        });
}

/**
 * 运行模块下全部测试
 * @param {string} projectName - 项目名称
 * @param {string} moduleName - 模块名称
 */
function runModuleTests(projectName, moduleName) {
    const encodedProjectName = encodeURIComponent(projectName);
    const encodedModuleName = encodeURIComponent(moduleName);

    // 显示加载状态的模态框
    const modal = new bootstrap.Modal(document.getElementById('runAllResultModal'));
    document.getElementById('runAllTotal').textContent = '...';
    document.getElementById('runAllPassed').textContent = '-';
    document.getElementById('runAllFailed').textContent = '-';
    document.getElementById('runAllProgressBar').style.width = '0%';
    document.getElementById('runAllResultTableBody').innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3"><div class="spinner-border spinner-border-sm me-2"></div>正在执行测试...</td></tr>';
    modal.show();

    fetch(`/test/execute_module/${encodedProjectName}/${encodedModuleName}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const total = data.total;
                const passed = data.passed;
                const failed = data.failed;

                // 更新汇总信息
                document.getElementById('runAllTotal').textContent = total;
                document.getElementById('runAllPassed').textContent = passed;
                document.getElementById('runAllFailed').textContent = failed;

                // 更新进度条
                const passRate = total > 0 ? (passed / total * 100) : 0;
                const progressBar = document.getElementById('runAllProgressBar');
                progressBar.style.width = passRate + '%';
                progressBar.className = failed > 0 ? 'progress-bar bg-warning' : 'progress-bar bg-success';

                // 渲染结果列表
                const tbody = document.getElementById('runAllResultTableBody');
                tbody.innerHTML = '';
                data.results.forEach((r, i) => {
                    const row = document.createElement('tr');
                    const statusBadge = r.success
                        ? '<span class="badge bg-success">通过</span>'
                        : '<span class="badge bg-danger">失败</span>';
                    const statusCode = r.status_code || '-';
                    const statusCodeClass = statusCode >= 200 && statusCode < 300 ? 'text-success' : 'text-danger';
                    const responseTime = r.response_time ? r.response_time + 'ms' : '-';
                    row.innerHTML = `
                        <td>${i + 1}</td>
                        <td>${escapeHtml(r.case_name || '接口' + (i + 1))}</td>
                        <td><span class="${statusCodeClass} fw-bold">${statusCode}</span></td>
                        <td>${responseTime}</td>
                        <td>${statusBadge}</td>
                    `;
                    tbody.appendChild(row);
                });
            } else {
                document.getElementById('runAllTotal').textContent = '0';
                document.getElementById('runAllPassed').textContent = '0';
                document.getElementById('runAllFailed').textContent = '0';
                document.getElementById('runAllResultTableBody').innerHTML = `<tr><td colspan="5" class="text-center text-danger">${escapeHtml(data.error || '执行失败')}</td></tr>`;
            }
        })
        .catch(error => {
            document.getElementById('runAllTotal').textContent = '0';
            document.getElementById('runAllPassed').textContent = '0';
            document.getElementById('runAllFailed').textContent = '0';
            document.getElementById('runAllResultTableBody').innerHTML = `<tr><td colspan="5" class="text-center text-danger">请求失败: ${escapeHtml(error.message)}</td></tr>`;
        });
}

/**
 * 执行测试
 * @param {string} apiName - API名称
 * @param {number} caseIndex - 用例索引
 */
function executeTest(projectName, moduleName, apiId) {
    // 对模块名称进行URL编码，处理中文等特殊字符
    const encodedModuleName = encodeURIComponent(moduleName);
    const encodedProjectName = encodeURIComponent(projectName);

    fetch(`/test/execute/${encodedProjectName}/${encodedModuleName}/${apiId}`)
        .then(response => {
            console.log('[DEBUG] HTTP status:', response.status);
            return response.text().then(text => {
                console.log('[DEBUG] Raw response:', text);
                try {
                    return JSON.parse(text);
                } catch(e) {
                    console.error('[DEBUG] JSON parse error:', e);
                    return {success: false, error: '响应解析失败: ' + text.substring(0, 500)};
                }
            });
        })
        .then(result => {
            console.log('[DEBUG] Parsed result:', JSON.stringify(result).substring(0, 1000));
            if (result.success) {
                showToast('成功', '测试执行成功', 'success');
                // 显示测试结果详情
                showTestResult(result);
            } else {
                console.error('测试执行失败详情:', result.error, result.traceback);
                const errMsg = result.traceback ? result.error + '\n' + result.traceback : (result.error || '未知错误');
                console.error('完整错误:', errMsg);
                showToast('失败', '测试执行失败: ' + (result.error || '未知错误'), 'danger');
            }
        })
        .catch(error => {
            showToast('错误', '请求失败: ' + error.message, 'danger');
        });
}

/**
 * 显示测试结果详情
 * @param {Object} result - 测试结果对象
 */
function showTestResult(result) {
    // 重置实际请求折叠状态
    resetRequestCollapse('testRequest');

    // 显示实际请求信息
    const requestMethodEl = document.getElementById('testRequestMethod');
    if (requestMethodEl) {
        const methodColors = {
            'GET': 'success',
            'POST': 'primary',
            'PUT': 'warning',
            'DELETE': 'danger',
            'PATCH': 'info'
        };
        const methodColor = methodColors[result.request_method] || 'secondary';
        requestMethodEl.innerHTML = `<span class="badge bg-${methodColor}">${result.request_method || 'GET'}</span>`;
    }

    const requestUrlEl = document.getElementById('testRequestUrl');
    if (requestUrlEl) {
        requestUrlEl.textContent = result.request_url || '-';
    }

    const requestHeadersEl = document.getElementById('testRequestHeaders');
    if (requestHeadersEl) {
        requestHeadersEl.textContent = JSON.stringify(result.request_headers || {}, null, 2);
    }

    const requestBodyEl = document.getElementById('testRequestBody');
    if (requestBodyEl) {
        requestBodyEl.textContent = formatRequestContent(result.request_body, '无请求体');
    }

    // 显示状态码
    const statusCodeEl = document.getElementById('testStatusCode');
    if (statusCodeEl) {
        const statusClass = result.status_code >= 200 && result.status_code < 300 ? 'text-success' : 'text-danger';
        statusCodeEl.innerHTML = `<span class="${statusClass}">${result.status_code}</span>`;
    }

    // 显示响应耗时
    const responseTimeEl = document.getElementById('testResponseTime');
    if (responseTimeEl) {
        responseTimeEl.textContent = result.response_time + 'ms';
    }

    // 显示断言结果
    const assertionSummaryEl = document.getElementById('testAssertionSummary');
    const assertionTableBody = document.getElementById('testAssertionTableBody');

    if (result.assertion_results && result.assertion_results.length > 0) {
        // 显示断言摘要
        if (assertionSummaryEl) {
            if (result.assertion_passed) {
                assertionSummaryEl.innerHTML = '<span class="badge bg-success">所有断言通过</span>';
            } else {
                assertionSummaryEl.innerHTML = '<span class="badge bg-danger">部分断言失败</span>';
            }
        }

        // 显示断言详情
        if (assertionTableBody) {
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
        }
    } else {
        if (assertionSummaryEl) {
            assertionSummaryEl.innerHTML = '<span class="badge bg-secondary">无断言</span>';
        }
        if (assertionTableBody) {
            assertionTableBody.innerHTML = '<tr><td colspan="5" class="text-center">无断言</td></tr>';
        }
    }

    // 显示响应头
    const headersEl = document.getElementById('testHeaders');
    if (headersEl) {
        headersEl.textContent = formatRequestContent(result.headers);
    }

    // 显示响应体
    const bodyEl = document.getElementById('testBody');
    if (bodyEl) {
        bodyEl.textContent = formatRequestContent(result.data);
    }

    // 显示模态框
    const testResultModal = new bootstrap.Modal(document.getElementById('testResultModal'));
    testResultModal.show();
}

/**
 * 填充调试表单并切换到调试页面
 * @param {Object} apiData - API数据对象
 */
function fillDebugForm(apiData, projectName, moduleName) {
    document.getElementById('apiUrl').value = apiData.url || '';
    document.getElementById('apiMethod').value = apiData.method || 'GET';
    setHeadersData('debug', apiData.headers || {});
    setBodyData('debug', apiData.data || {});

    // 保存项目名、模块名和接口名称到隐藏字段，用于调试时记录统计
    document.getElementById('debugProjectName').value = projectName || '';
    document.getElementById('debugModuleName').value = moduleName || '';
    document.getElementById('debugCaseName').value = apiData.case_name || apiData.name || '';

    // 设置断言
    if (typeof setAssertions === 'function') {
        setAssertions(apiData.expected || {}, 'assertionContainer');
    }

    // 切换到调试页面并滚动到调试区域
    switchPage('debug', document.querySelector('[data-page="debug"]'));
    setTimeout(() => {
        const debugEl = document.getElementById('api-debug');
        if (debugEl) debugEl.scrollIntoView({ behavior: 'smooth' });
    }, 300);
}

/**
 * 调试API
 * @param {string} projectName - 项目名称
 * @param {string} moduleName - 模块名称
 * @param {number} apiId - 接口ID（数据库ID）
 */
function debugApi(projectName, moduleName, apiId) {
    // 兼容旧的2参数调用方式
    if (arguments.length === 2 && typeof moduleName === 'number') {
        apiId = moduleName;
        moduleName = undefined;
    }

    // 模式1：从项目列表点击调试，填充表单数据并跳转到调试页
    if (projectName && apiId !== undefined) {
        // 从服务器获取API数据
        fetch(`/projects/${projectName}/modules/${moduleName}/apis/get/${apiId}`)
            .then(response => response.json())
            .then(apiData => {
                if (apiData.error) {
                    showToast('错误', apiData.error, 'danger');
                    return;
                }

                if (apiData) {
                    fillDebugForm(apiData, projectName, moduleName);
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
            project: document.getElementById('debugProjectName').value,
            module: document.getElementById('debugModuleName').value,
            case_name: document.getElementById('debugCaseName').value,
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
            // 重置实际请求折叠状态
            resetRequestCollapse('debugRequest');

            // 显示实际请求信息
            const debugRequestMethodEl = document.getElementById('debugRequestMethod');
            const debugRequestUrlEl = document.getElementById('debugRequestUrl');
            const debugRequestHeadersEl = document.getElementById('debugRequestHeaders');
            const debugRequestBodyEl = document.getElementById('debugRequestBody');

            if (debugRequestMethodEl) {
                const methodColors = {
                    'GET': 'success',
                    'POST': 'primary',
                    'PUT': 'warning',
                    'DELETE': 'danger',
                    'PATCH': 'info'
                };
                const methodColor = methodColors[result.request_method] || 'secondary';
                debugRequestMethodEl.innerHTML = `<span class="badge bg-${methodColor}">${result.request_method || 'GET'}</span>`;
            }
            if (debugRequestUrlEl) {
                debugRequestUrlEl.textContent = result.request_url || '-';
            }
            if (debugRequestHeadersEl) {
                debugRequestHeadersEl.textContent = JSON.stringify(result.request_headers || {}, null, 2);
            }
            if (debugRequestBodyEl) {
                debugRequestBodyEl.textContent = formatRequestContent(result.request_body, '无请求体');
            }

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

                    const resultClass = assertion.passed ? 'success' : 'danger';
                    const resultText = assertion.passed ? '通过' : '失败';

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

/* ===== 键值对表格通用函数 ===== */

/**
 * 添加键值对表格行
 * @param {string} tableId - 表格ID
 * @param {boolean} hasType - 是否有类型选择列
 * @param {string} key - 初始key值
 * @param {string} value - 初始value值
 * @param {string} type - 初始类型值(string/number/boolean)
 */
function addKvRow(tableId, hasType = false, key = '', value = '', type = 'string') {
    const tbody = document.getElementById(tableId).querySelector('tbody');
    const row = document.createElement('tr');

    let typeCell = '';
    if (hasType) {
        typeCell = `
            <td>
                <select class="form-select type-select" onchange="onTypeChange(this)">
                    <option value="string" ${type === 'string' ? 'selected' : ''}>String</option>
                    <option value="number" ${type === 'number' ? 'selected' : ''}>Number</option>
                    <option value="boolean" ${type === 'boolean' ? 'selected' : ''}>Boolean</option>
                    <option value="file" ${type === 'file' ? 'selected' : ''}>File</option>
                </select>
            </td>
        `;
    }

    row.innerHTML = `
        <td><input type="text" class="form-control" placeholder="Key" value="${escapeHtml(key)}"></td>
        ${typeCell}
        <td><input type="text" class="form-control" placeholder="Value" value="${escapeHtml(value)}"></td>
        <td style="text-align: center;"><button type="button" class="btn-remove-row" onclick="removeKvRow(this)" title="删除"><i class="bi bi-x-lg"></i></button></td>
    `;

    tbody.appendChild(row);
}

/**
 * 删除键值对表格行
 * @param {HTMLElement} btn - 删除按钮
 */
function removeKvRow(btn) {
    const row = btn.closest('tr');
    row.remove();
}

/**
 * 类型切换时更新placeholder
 * @param {HTMLElement} select - 类型选择器
 */
function onTypeChange(select) {
    const valueInput = select.closest('tr').querySelector('td:nth-last-child(2) input');
    const type = select.value;
    switch (type) {
        case 'number':
            valueInput.placeholder = 'Number (e.g. 123, 3.14)';
            break;
        case 'boolean':
            valueInput.placeholder = 'Boolean (true/false)';
            break;
        case 'file':
            valueInput.placeholder = 'File path or content';
            break;
        default:
            valueInput.placeholder = 'Value';
    }
}

/**
 * 从键值对表格获取数据，返回对象
 * @param {string} tableId - 表格ID
 * @param {boolean} hasType - 是否有类型列
 * @returns {Object} 键值对对象
 */
function getKvTableData(tableId, hasType = false) {
    const tbody = document.getElementById(tableId).querySelector('tbody');
    const rows = tbody.querySelectorAll('tr');
    const result = {};

    rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        const key = inputs[0].value.trim();
        if (!key) return;

        if (hasType) {
            const typeSelect = row.querySelector('.type-select');
            const type = typeSelect ? typeSelect.value : 'string';
            let value = inputs[1].value.trim();

            // 根据类型转换值
            switch (type) {
                case 'number':
                    value = value === '' ? 0 : Number(value);
                    break;
                case 'boolean':
                    value = value.toLowerCase() === 'true';
                    break;
                default:
                    break;
            }
            result[key] = value;
        } else {
            result[key] = inputs[1].value.trim();
        }
    });

    return result;
}

/**
 * 将对象数据填充到键值对表格
 * @param {string} tableId - 表格ID
 * @param {boolean} hasType - 是否有类型列
 * @param {Object} data - 键值对数据
 */
function setKvTableData(tableId, hasType, data) {
    const tbody = document.getElementById(tableId).querySelector('tbody');
    tbody.innerHTML = '';

    if (!data || typeof data !== 'object') return;

    for (const [key, value] of Object.entries(data)) {
        let type = 'string';
        let strValue = String(value);

        if (hasType) {
            if (typeof value === 'number') type = 'number';
            else if (typeof value === 'boolean') type = 'boolean';
        }

        addKvRow(tableId, hasType, key, strValue, type);
    }
}

/**
 * 切换请求体编辑模式（新增/编辑模态框）
 * @param {string} prefix - 前缀 ('add' 或 'edit')
 * @param {string} mode - 模式 ('table' 或 'json')
 */
function switchBodyMode(prefix, mode) {
    const tableMode = document.getElementById(prefix + 'BodyTableMode');
    const jsonMode = document.getElementById(prefix + 'BodyJsonMode');
    const switchBtns = tableMode.parentElement.querySelectorAll('.editor-mode-switch .mode-btn');

    if (mode === 'table') {
        tableMode.style.display = '';
        jsonMode.style.display = 'none';
        switchBtns[0].classList.add('active');
        switchBtns[1].classList.remove('active');
    } else {
        // 切换到JSON模式时，将表格数据同步到JSON文本框
        const tableId = prefix + 'BodyTable';
        const hasType = true;
        const data = getKvTableData(tableId, hasType);
        const jsonTextarea = document.getElementById(prefix + 'DataJson') || document.getElementById(prefix + 'ApiDataJson');
        if (jsonTextarea && Object.keys(data).length > 0) {
            jsonTextarea.value = JSON.stringify(data, null, 2);
        }
        tableMode.style.display = 'none';
        jsonMode.style.display = '';
        switchBtns[0].classList.remove('active');
        switchBtns[1].classList.add('active');
    }
}

/**
 * 切换调试页面Headers编辑模式
 * @param {string} mode - 模式 ('table' 或 'json')
 */
function switchDebugHeaderMode(mode) {
    const tableMode = document.getElementById('debugHeadersTableMode');
    const jsonMode = document.getElementById('debugHeadersJsonMode');
    const switchBtns = document.querySelector('#debugHeaders .editor-mode-switch').querySelectorAll('.mode-btn');

    if (mode === 'table') {
        tableMode.style.display = '';
        jsonMode.style.display = 'none';
        switchBtns[0].classList.add('active');
        switchBtns[1].classList.remove('active');
    } else {
        // 切换到JSON模式时，将表格数据同步到JSON文本框
        const data = getKvTableData('debugHeadersTable', false);
        const jsonTextarea = document.getElementById('apiHeaders');
        if (jsonTextarea && Object.keys(data).length > 0) {
            jsonTextarea.value = JSON.stringify(data, null, 2);
        }
        tableMode.style.display = 'none';
        jsonMode.style.display = '';
        switchBtns[0].classList.remove('active');
        switchBtns[1].classList.add('active');
    }
}

/**
 * 切换调试页面Body编辑模式
 * @param {string} mode - 模式 ('table' 或 'json')
 */
function switchDebugBodyMode(mode) {
    const tableMode = document.getElementById('debugBodyTableMode');
    const jsonMode = document.getElementById('debugBodyJsonMode');
    const switchBtns = document.querySelector('#debugBody .editor-mode-switch').querySelectorAll('.mode-btn');

    if (mode === 'table') {
        tableMode.style.display = '';
        jsonMode.style.display = 'none';
        switchBtns[0].classList.add('active');
        switchBtns[1].classList.remove('active');
    } else {
        // 切换到JSON模式时，将表格数据同步到JSON文本框
        const data = getKvTableData('debugBodyTable', true);
        const jsonTextarea = document.getElementById('apiData');
        if (jsonTextarea && Object.keys(data).length > 0) {
            jsonTextarea.value = JSON.stringify(data, null, 2);
        }
        tableMode.style.display = 'none';
        jsonMode.style.display = '';
        switchBtns[0].classList.remove('active');
        switchBtns[1].classList.add('active');
    }
}

/**
 * 获取请求头数据（统一接口）
 * @param {string} prefix - 前缀 ('add', 'edit', 'debug')
 * @returns {string} JSON字符串
 */
function getHeadersData(prefix) {
    if (prefix === 'debug') {
        const tableMode = document.getElementById('debugHeadersTableMode');
        if (tableMode && tableMode.style.display !== 'none') {
            return JSON.stringify(getKvTableData('debugHeadersTable', false));
        }
        return document.getElementById('apiHeaders').value.trim();
    }
    // add/edit 模态框始终使用表格
    return JSON.stringify(getKvTableData(prefix + 'HeadersTable', false));
}

/**
 * 设置请求头数据（统一接口）
 * @param {string} prefix - 前缀 ('add', 'edit', 'debug')
 * @param {Object} data - 请求头对象
 */
function setHeadersData(prefix, data) {
    if (prefix === 'debug') {
        setKvTableData('debugHeadersTable', false, data);
        // 同时更新JSON文本框
        document.getElementById('apiHeaders').value = JSON.stringify(data, null, 2);
    } else {
        setKvTableData(prefix + 'HeadersTable', false, data);
    }
}

/**
 * 获取请求体数据（统一接口）
 * @param {string} prefix - 前缀 ('add', 'edit', 'debug')
 * @returns {string} JSON字符串
 */
function getBodyData(prefix) {
    let tableModeId, jsonTextareaId, tableId;

    if (prefix === 'debug') {
        tableModeId = 'debugBodyTableMode';
        jsonTextareaId = 'apiData';
        tableId = 'debugBodyTable';
    } else {
        tableModeId = prefix + 'BodyTableMode';
        jsonTextareaId = prefix + 'DataJson';
        tableId = prefix + 'BodyTable';
    }

    const tableMode = document.getElementById(tableModeId);
    if (tableMode && tableMode.style.display !== 'none') {
        return JSON.stringify(getKvTableData(tableId, true));
    }

    const jsonTextarea = document.getElementById(jsonTextareaId);
    return jsonTextarea ? jsonTextarea.value.trim() : '{}';
}

/**
 * 设置请求体数据（统一接口）
 * @param {string} prefix - 前缀 ('add', 'edit', 'debug')
 * @param {Object} data - 请求体对象
 */
function setBodyData(prefix, data) {
    let tableId, jsonTextareaId;

    if (prefix === 'debug') {
        tableId = 'debugBodyTable';
        jsonTextareaId = 'apiData';
    } else {
        tableId = prefix + 'BodyTable';
        jsonTextareaId = prefix + 'DataJson';
    }

    const jsonTextarea = document.getElementById(jsonTextareaId);

    // 如果data是字符串（纯文本请求体），直接设置到JSON文本框并切换到JSON模式
    if (typeof data === 'string') {
        // 清空表格
        setKvTableData(tableId, true, {});
        if (jsonTextarea) {
            jsonTextarea.value = data;
        }
        // 切换到JSON模式
        switchBodyMode(prefix, 'json');
    } else {
        // 字典类型，正常填充表格和JSON文本框
        setKvTableData(tableId, true, data);
        if (jsonTextarea) {
            jsonTextarea.value = JSON.stringify(data, null, 2);
        }
    }
}


/**
 * 切换调试区域实际请求的展开/折叠
 */
function toggleDebugRequest() {
    const content = document.getElementById('debugRequestContent');
    const icon = document.getElementById('debugRequestToggleIcon');
    const header = icon.closest('[aria-expanded]');
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.classList.remove('bi-chevron-right');
        icon.classList.add('bi-chevron-down');
        header.setAttribute('aria-expanded', 'true');
    } else {
        content.style.display = 'none';
        icon.classList.remove('bi-chevron-down');
        icon.classList.add('bi-chevron-right');
        header.setAttribute('aria-expanded', 'false');
    }
}

/**
 * 切换测试结果模态框实际请求的展开/折叠
 */
function toggleTestRequest() {
    const content = document.getElementById('testRequestContent');
    const icon = document.getElementById('testRequestToggleIcon');
    const header = icon.closest('[aria-expanded]');
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.classList.remove('bi-chevron-right');
        icon.classList.add('bi-chevron-down');
        header.setAttribute('aria-expanded', 'true');
    } else {
        content.style.display = 'none';
        icon.classList.remove('bi-chevron-down');
        icon.classList.add('bi-chevron-right');
        header.setAttribute('aria-expanded', 'false');
    }
}

/**
 * 重置折叠状态（调试和测试结果）
 */
function resetRequestCollapse(prefix) {
    const content = document.getElementById(prefix + 'Content');
    const icon = document.getElementById(prefix + 'ToggleIcon');
    const header = icon ? icon.closest('[aria-expanded]') : null;
    if (content) content.style.display = 'none';
    if (icon) { icon.classList.remove('bi-chevron-down'); icon.classList.add('bi-chevron-right'); }
    if (header) header.setAttribute('aria-expanded', 'false');
}

/**
 * 格式化请求/响应内容显示
 * @param {*} value - 要格式化的值
 * @param {string} fallback - 空值时的回退文本
 * @returns {string} 格式化后的字符串
 */
function formatRequestContent(value, fallback) {
    if (value === null || value === undefined || value === '') return fallback || '-';
    if (typeof value === 'object') {
        if (Object.keys(value).length === 0) return fallback || '-';
        try { return JSON.stringify(value, null, 2); } catch(e) { return String(value); }
    }
    if (typeof value === 'string') {
        if (value.trim() === '') return fallback || '-';
        try { const parsed = JSON.parse(value); if (typeof parsed === 'object' && Object.keys(parsed).length === 0) return fallback || '-'; return JSON.stringify(parsed, null, 2); } catch(e) { return value; }
    }
    return String(value);
}
