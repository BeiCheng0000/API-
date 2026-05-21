
// 手机端页面交互逻辑

// 安全地显示模态框（清理残留backdrop）
function safeShowModal(modalElement) {
    // 先清理所有残留的modal-backdrop
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    // 恢复body样式
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');

    // 显示新的模态框
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}

// 安全地隐藏模态框（清理残留backdrop）
function safeHideModal() {
    const modalElement = document.getElementById('commonModal');
    if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
            modal.hide();
        }
    }
    // 延迟清理残留backdrop
    setTimeout(() => {
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
    }, 300);
}

// 页面切换
function switchPage(pageName, element) {
    // 隐藏所有页面
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.remove('active');
    });

    // 显示目标页面
    const targetPage = document.getElementById(`page-${pageName}`);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // 更新导航栏激活状态
    if (element) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        element.classList.add('active');
    }

    // 切换到定时任务页面时重新加载筛选器和列表
    if (pageName === 'scheduler') {
        loadSchedulerFilter();
    }

    // 关闭移动端导航菜单
    const navbarCollapse = document.getElementById('navbarNav');
    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
        const bsCollapse = new bootstrap.Collapse(navbarCollapse, {toggle: true});
    }
}

// 切换项目模块展开/收起
function toggleProjectModules(element) {
    const projectCard = element.closest('.project-card');
    const modulesDiv = projectCard.querySelector('.project-modules');
    const toggleIcon = projectCard.querySelector('.project-toggle-icon');

    if (modulesDiv) {
        const bsCollapse = new bootstrap.Collapse(modulesDiv, {
            toggle: true
        });

        // 切换图标方向
        if (toggleIcon) {
            toggleIcon.classList.toggle('bi-chevron-down');
            toggleIcon.classList.toggle('bi-chevron-up');
        }
    }
}

// 项目搜索过滤
function filterProjects(searchTerm) {
    const projectCards = document.querySelectorAll('.project-card');
    searchTerm = searchTerm.toLowerCase();

    projectCards.forEach(card => {
        const projectName = card.dataset.project.toLowerCase();
        if (projectName.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// 显示添加项目模态框
function showAddProjectModal() {
    const modalTitle = document.getElementById('commonModalTitle');
    const modalBody = document.getElementById('commonModalBody');
    const modalConfirm = document.getElementById('commonModalConfirm');

    modalTitle.textContent = '添加项目';
    modalBody.innerHTML = `
        <form id="addProjectForm">
            <div class="mb-3">
                <label class="form-label">项目名称</label>
                <input type="text" class="form-control" id="projectName" required>
            </div>
            <div class="mb-3">
                <label class="form-label">项目描述</label>
                <textarea class="form-control" id="projectDesc" rows="3"></textarea>
            </div>
        </form>
    `;

    modalConfirm.onclick = async () => {
        const projectName = document.getElementById('projectName').value.trim();
        const projectDesc = document.getElementById('projectDesc').value.trim();

        if (!projectName) {
            showToast('错误', '项目名称不能为空');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('project_name', projectName);
            formData.append('project_desc', projectDesc);

            const response = await fetch('/projects/add', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                showToast('成功', '项目添加成功');
                location.reload();
            } else {
                showToast('错误', result.error || '添加项目失败');
            }
        } catch (error) {
            showToast('错误', '添加项目失败: ' + error.message);
        }
    };

    safeShowModal(document.getElementById('commonModal'));
}

// 显示编辑项目模态框
function showEditProjectModal(projectName, description) {
    const modalTitle = document.getElementById('commonModalTitle');
    const modalBody = document.getElementById('commonModalBody');
    const modalConfirm = document.getElementById('commonModalConfirm');

    modalTitle.textContent = '编辑项目';
    modalBody.innerHTML = `
        <form id="editProjectForm">
            <div class="mb-3">
                <label class="form-label">项目名称</label>
                <input type="text" class="form-control" id="projectName" value="${projectName}" readonly>
            </div>
            <div class="mb-3">
                <label class="form-label">项目描述</label>
                <textarea class="form-control" id="projectDesc" rows="3">${description || ''}</textarea>
            </div>
        </form>
    `;

    modalConfirm.onclick = async () => {
        const projectDesc = document.getElementById('projectDesc').value.trim();

        try {
            const formData = new FormData();
            formData.append('project_name', projectName);
            formData.append('project_desc', projectDesc);

            const response = await fetch('/projects/update', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                showToast('成功', '项目更新成功');
                location.reload();
            } else {
                showToast('错误', result.error || '更新项目失败');
            }
        } catch (error) {
            showToast('错误', '更新项目失败: ' + error.message);
        }
    };

    safeShowModal(document.getElementById('commonModal'));
}

// 显示添加模块模态框
function showAddModuleModal(projectName) {
    const modalTitle = document.getElementById('commonModalTitle');
    const modalBody = document.getElementById('commonModalBody');
    const modalConfirm = document.getElementById('commonModalConfirm');

    modalTitle.textContent = '添加模块';
    modalBody.innerHTML = `
        <form id="addModuleForm">
            <div class="mb-3">
                <label class="form-label">模块名称</label>
                <input type="text" class="form-control" id="moduleName" required>
            </div>
            <div class="mb-3">
                <label class="form-label">模块描述</label>
                <textarea class="form-control" id="moduleDesc" rows="3"></textarea>
            </div>
        </form>
    `;

    modalConfirm.onclick = async () => {
        const moduleName = document.getElementById('moduleName').value.trim();
        const moduleDesc = document.getElementById('moduleDesc').value.trim();

        if (!moduleName) {
            showToast('错误', '模块名称不能为空');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('module_name', moduleName);
            formData.append('module_desc', moduleDesc);

            const response = await fetch(`/projects/${encodeURIComponent(projectName)}/modules/add`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                showToast('成功', '模块添加成功');
                location.reload();
            } else {
                showToast('错误', result.error || '添加模块失败');
            }
        } catch (error) {
            showToast('错误', '添加模块失败: ' + error.message);
        }
    };

    safeShowModal(document.getElementById('commonModal'));
}

// 显示项目环境配置模态框
function showProjectEnvModal(projectName) {
    const modalTitle = document.getElementById('commonModalTitle');
    const modalBody = document.getElementById('commonModalBody');
    const modalConfirm = document.getElementById('commonModalConfirm');

    modalTitle.textContent = '环境配置';
    modalBody.innerHTML = `
        <form id="envForm">
            <div class="mb-3">
                <label class="form-label">环境名称</label>
                <input type="text" class="form-control" id="envName" required>
            </div>
            <div class="mb-3">
                <label class="form-label">环境域名</label>
                <input type="url" class="form-control" id="baseUrl" required>
            </div>
        </form>
    `;

    modalConfirm.onclick = async () => {
        const envName = document.getElementById('envName').value.trim();
        const baseUrl = document.getElementById('baseUrl').value.trim();

        if (!envName || !baseUrl) {
            showToast('错误', '环境名称和域名不能为空');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('env_name', envName);
            formData.append('base_url', baseUrl);

            const response = await fetch(`/projects/${encodeURIComponent(projectName)}/env/save`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                showToast('成功', '环境保存成功');
            } else {
                showToast('错误', result.error || '保存环境失败');
            }
        } catch (error) {
            showToast('错误', '保存环境失败: ' + error.message);
        }
    };

    safeShowModal(document.getElementById('commonModal'));
}

// 显示项目变量管理模态框
function showProjectVarModal(projectName) {
    const modalTitle = document.getElementById('commonModalTitle');
    const modalBody = document.getElementById('commonModalBody');
    const modalConfirm = document.getElementById('commonModalConfirm');

    modalTitle.textContent = '变量管理';
    modalBody.innerHTML = `
        <form id="varForm">
            <div class="mb-3">
                <label class="form-label">变量名</label>
                <input type="text" class="form-control" id="varKey" required>
            </div>
            <div class="mb-3">
                <label class="form-label">变量值</label>
                <input type="text" class="form-control" id="varValue" required>
            </div>
        </form>
    `;

    modalConfirm.onclick = async () => {
        const varKey = document.getElementById('varKey').value.trim();
        const varValue = document.getElementById('varValue').value.trim();

        if (!varKey || !varValue) {
            showToast('错误', '变量名和变量值不能为空');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('var_key', varKey);
            formData.append('var_value', varValue);

            const response = await fetch(`/projects/${encodeURIComponent(projectName)}/variables/save`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                showToast('成功', '变量保存成功');
            } else {
                showToast('错误', result.error || '保存变量失败');
            }
        } catch (error) {
            showToast('错误', '保存变量失败: ' + error.message);
        }
    };

    safeShowModal(document.getElementById('commonModal'));
}

// 删除项目
function deleteProject(projectName) {
    const modalTitle = document.getElementById('commonModalTitle');
    const modalBody = document.getElementById('commonModalBody');
    const modalConfirm = document.getElementById('commonModalConfirm');

    modalTitle.textContent = '确认删除';
    modalBody.innerHTML = `<p>确定要删除项目 "${projectName}" 吗？此操作不可恢复。</p>`;

    modalConfirm.onclick = async () => {
        try {
            const response = await fetch(`/projects/delete/${encodeURIComponent(projectName)}`, {
                method: 'POST'
            });

            const result = await response.json();

            if (result.success) {
                showToast('成功', '项目删除成功');
                location.reload();
            } else {
                showToast('错误', result.error || '删除项目失败');
            }
        } catch (error) {
            showToast('错误', '删除项目失败: ' + error.message);
        }
    };

    safeShowModal(document.getElementById('commonModal'));
}

// 显示提示消息
function showToast(title, message) {
    const toastTitle = document.getElementById('toastTitle');
    const toastBody = document.getElementById('toastBody');
    const toast = new bootstrap.Toast(document.getElementById('toast'));

    toastTitle.textContent = title;
    toastBody.textContent = message;

    toast.show();
}

// 选择模块
async function selectModule(projectName, moduleName) {
    try {
        // 加载模块下的接口列表
        const response = await fetch(`/projects/${encodeURIComponent(projectName)}/modules/${encodeURIComponent(moduleName)}/apis`);
        const data = await response.json();

        if (data.success && data.apis) {
            // 显示接口列表模态框
            showApiListModal(projectName, moduleName, data.apis);
        } else {
            showToast('错误', data.error || '加载接口列表失败');
        }
    } catch (error) {
        console.error('加载接口列表失败:', error);
        showToast('错误', '加载接口列表失败: ' + error.message);
    }
}

// 显示接口列表模态框
function showApiListModal(projectName, moduleName, apis) {
    const modalTitle = document.getElementById('commonModalTitle');
    const modalBody = document.getElementById('commonModalBody');
    const modalConfirm = document.getElementById('commonModalConfirm');

    modalTitle.textContent = `${projectName} / ${moduleName}`;

    if (apis.length === 0) {
        modalBody.innerHTML = `
            <div class="text-center py-4">
                <i class="bi bi-inbox text-muted" style="font-size: 3rem;"></i>
                <p class="text-muted mt-3">暂无接口</p>
            </div>
        `;
    } else {
        modalBody.innerHTML = `
            <button class="btn btn-success w-100 mb-3" onclick="runModuleTests('${projectName}', '${moduleName}')">
                <i class="bi bi-play-fill me-1"></i>运行所有接口
            </button>
            <div class="api-list">
                ${apis.map(api => `
                    <div class="card api-item mb-2" onclick="showApiDetail('${projectName}', '${moduleName}', ${api.id})">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="card-title mb-1">${api.case_name || '未命名'}</h6>
                                    <small class="text-muted">${api.method} ${api.url}</small>
                                </div>
                                <span class="badge bg-${getMethodBadgeColor(api.method)}">${api.method}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // 隐藏确认按钮
    modalConfirm.style.display = 'none';

    safeShowModal(document.getElementById('commonModal'));
}

// 获取请求方法对应的徽章颜色
function getMethodBadgeColor(method) {
    const colors = {
        'GET': 'success',
        'POST': 'primary',
        'PUT': 'warning',
        'DELETE': 'danger'
    };
    return colors[method] || 'secondary';
}

// 显示接口详情
async function showApiDetail(projectName, moduleName, apiId) {
    try {
        const response = await fetch(`/projects/${encodeURIComponent(projectName)}/modules/${encodeURIComponent(moduleName)}/apis/get/${apiId}`);
        const data = await response.json();

        if (data) {
            const modalTitle = document.getElementById('commonModalTitle');
            const modalBody = document.getElementById('commonModalBody');
            const modalConfirm = document.getElementById('commonModalConfirm');

            modalTitle.textContent = data.case_name || '接口详情';

            modalBody.innerHTML = `
                <div class="api-detail">
                    <div class="mb-3">
                        <label class="form-label text-muted small">请求方法</label>
                        <div><span class="badge bg-${getMethodBadgeColor(data.method)}">${data.method}</span></div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label text-muted small">URL</label>
                        <div class="p-2 bg-light rounded"><small>${data.url || '-'}</small></div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label text-muted small">请求头</label>
                        <pre class="p-2 bg-light rounded mb-0"><code>${JSON.stringify(data.headers || {}, null, 2)}</code></pre>
                    </div>
                    <div class="mb-3">
                        <label class="form-label text-muted small">请求体</label>
                        <pre class="p-2 bg-light rounded mb-0"><code>${JSON.stringify(data.data || {}, null, 2)}</code></pre>
                    </div>
                    ${data.expected && Object.keys(data.expected).length > 0 ? `
                    <div class="mb-3">
                        <label class="form-label text-muted small">断言</label>
                        <pre class="p-2 bg-light rounded mb-0"><code>${JSON.stringify(data.expected || {}, null, 2)}</code></pre>
                    </div>
                    ` : ''}
                    ${data.extractions && Object.keys(data.extractions).length > 0 ? `
                    <div class="mb-3">
                        <label class="form-label text-muted small">提取</label>
                        <pre class="p-2 bg-light rounded mb-0"><code>${JSON.stringify(data.extractions || {}, null, 2)}</code></pre>
                    </div>
                    ` : ''}
                </div>
            `;

            // 显示执行按钮
            modalConfirm.style.display = 'block';
            modalConfirm.textContent = '执行接口';
            modalConfirm.onclick = async () => {
                await executeApiTest(projectName, moduleName, apiId);
            };

            safeShowModal(document.getElementById('commonModal'));
        }
    } catch (error) {
        console.error('加载接口详情失败:', error);
        showToast('错误', '加载接口详情失败: ' + error.message);
    }
}

// 执行接口测试
async function executeApiTest(projectName, moduleName, apiId) {
    try {
        const response = await fetch(`/test/execute/${encodeURIComponent(projectName)}/${encodeURIComponent(moduleName)}/${apiId}`);
        const result = await response.json();

        if (result.success) {
            showToast('成功', '接口执行成功');
            showTestResult(result);
        } else {
            showToast('错误', result.error || '接口执行失败');
            if (result.error) {
                showTestResult(result);
            }
        }
    } catch (error) {
        console.error('执行接口测试失败:', error);
        showToast('错误', '执行接口测试失败: ' + error.message);
    }
}

// 显示测试结果
function showTestResult(result) {
    const modalTitle = document.getElementById('commonModalTitle');
    const modalBody = document.getElementById('commonModalBody');
    const modalConfirm = document.getElementById('commonModalConfirm');

    modalTitle.textContent = '测试结果';

    const statusClass = result.status_code >= 200 && result.status_code < 300 ? 'success' : 'danger';

    modalBody.innerHTML = `
        <div class="test-result">
            <div class="mb-3">
                <label class="form-label text-muted small">状态码</label>
                <div><span class="badge bg-${statusClass}">${result.status_code || '-'}</span></div>
            </div>
            <div class="mb-3">
                <label class="form-label text-muted small">响应时间</label>
                <div>${result.response_time || 0}ms</div>
            </div>
            ${result.assertion_results && result.assertion_results.length > 0 ? `
            <div class="mb-3">
                <label class="form-label text-muted small">断言结果</label>
                <div class="assertion-results">
                    ${result.assertion_results.map(assertion => `
                        <div class="d-flex align-items-center mb-2">
                            <i class="bi bi-${assertion.passed ? 'check-circle-fill text-success' : 'x-circle-fill text-danger'} me-2"></i>
                            <span class="small">${assertion.type}: ${assertion.passed ? '通过' : '失败'}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            <div class="mb-3">
                <label class="form-label text-muted small">响应体</label>
                <pre class="p-2 bg-light rounded mb-0"><code>${JSON.stringify(result.data || {}, null, 2)}</code></pre>
            </div>
        </div>
    `;

    // 隐藏确认按钮
    modalConfirm.style.display = 'none';

    safeShowModal(document.getElementById('commonModal'));
}

// 运行模块测试
async function runModuleTests(projectName, moduleName) {
    const modalTitle = document.getElementById('commonModalTitle');
    const modalBody = document.getElementById('commonModalBody');
    const modalConfirm = document.getElementById('commonModalConfirm');

    modalTitle.textContent = `${projectName} / ${moduleName} - 运行中`;
    modalBody.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary mb-3" role="status">
                <span class="visually-hidden">运行中...</span>
            </div>
            <p class="text-muted">正在执行模块下所有接口...</p>
            <div class="progress mb-2">
                <div class="progress-bar" id="runProgressBar" role="progressbar" style="width: 0%">0%</div>
            </div>
            <small class="text-muted" id="runProgressText">准备中...</small>
        </div>
    `;
    modalConfirm.style.display = 'none';

    safeShowModal(document.getElementById('commonModal'));

    try {
        // 先获取模块下所有接口列表
        const listResponse = await fetch(`/projects/${encodeURIComponent(projectName)}/modules/${encodeURIComponent(moduleName)}/apis`);
        const listData = await listResponse.json();

        if (!listData.success || !listData.apis || listData.apis.length === 0) {
            modalBody.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-exclamation-circle text-warning" style="font-size: 3rem;"></i>
                    <p class="text-muted mt-3">没有可执行的接口</p>
                </div>
            `;
            return;
        }

        const apis = listData.apis;
        const total = apis.length;
        let passed = 0;
        let failed = 0;
        const results = [];

        // 逐个执行接口
        for (let i = 0; i < apis.length; i++) {
            const api = apis[i];
            const progress = Math.round(((i + 1) / total) * 100);

            // 更新进度
            document.getElementById('runProgressBar').style.width = `${progress}%`;
            document.getElementById('runProgressBar').textContent = `${progress}%`;
            document.getElementById('runProgressText').textContent = `正在执行: ${api.case_name} (${i + 1}/${total})`;

            try {
                const response = await fetch(`/test/execute/${encodeURIComponent(projectName)}/${encodeURIComponent(moduleName)}/${api.id}`);
                const result = await response.json();

                if (result.success) {
                    passed++;
                } else {
                    failed++;
                }

                results.push({
                    case_name: api.case_name,
                    success: result.success,
                    status_code: result.status_code,
                    response_time: result.response_time,
                    assertion_passed: result.assertion_passed,
                    assertion_results: result.assertion_results
                });
            } catch (error) {
                failed++;
                results.push({
                    case_name: api.case_name,
                    success: false,
                    error: error.message
                });
            }
        }

        // 显示结果
        showModuleTestResult({
            total: total,
            passed: passed,
            failed: failed,
            results: results
        });

    } catch (error) {
        console.error('运行模块测试失败:', error);
        showToast('错误', '运行模块测试失败: ' + error.message);
    }
}

// 显示模块测试结果
function showModuleTestResult(result) {
    const modalTitle = document.getElementById('commonModalTitle');
    const modalBody = document.getElementById('commonModalBody');
    const modalConfirm = document.getElementById('commonModalConfirm');

    modalTitle.textContent = '模块测试结果';

    modalBody.innerHTML = `
        <div class="module-test-result">
            <div class="row mb-3">
                <div class="col-6">
                    <div class="card bg-light">
                        <div class="card-body text-center">
                            <div class="text-muted small">总数</div>
                            <div class="h4 mb-0">${result.total || 0}</div>
                        </div>
                    </div>
                </div>
                <div class="col-6">
                    <div class="card bg-success text-white">
                        <div class="card-body text-center">
                            <div class="small">成功</div>
                            <div class="h4 mb-0">${result.passed || 0}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row mb-3">
                <div class="col-6">
                    <div class="card bg-danger text-white">
                        <div class="card-body text-center">
                            <div class="small">失败</div>
                            <div class="h4 mb-0">${result.failed || 0}</div>
                        </div>
                    </div>
                </div>
                <div class="col-6">
                    <div class="card bg-info text-white">
                        <div class="card-body text-center">
                            <div class="small">通过率</div>
                            <div class="h4 mb-0">${result.total ? Math.round((result.passed / result.total) * 100) : 0}%</div>
                        </div>
                    </div>
                </div>
            </div>
            ${result.results && result.results.length > 0 ? `
            <div class="test-results-list">
                <h6 class="mb-2">测试详情</h6>
                ${result.results.map((test, index) => `
                    <div class="card mb-2 ${test.success ? 'border-success' : 'border-danger'}">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="card-title mb-1 small">${test.case_name || '未命名'}</h6>
                                    <small class="text-muted">${test.status_code} - ${test.response_time || 0}ms</small>
                                </div>
                                <i class="bi bi-${test.success ? 'check-circle-fill text-success' : 'x-circle-fill text-danger'}"></i>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            ` : ''}
        </div>
    `;

    // 隐藏确认按钮
    modalConfirm.style.display = 'none';

    safeShowModal(document.getElementById('commonModal'));
}

// 显示添加接口模态框
function showAddApiModal(projectName, moduleName) {
    const modalTitle = document.getElementById('commonModalTitle');
    const modalBody = document.getElementById('commonModalBody');
    const modalConfirm = document.getElementById('commonModalConfirm');

    modalTitle.textContent = '添加接口';
    modalBody.innerHTML = `
        <form id="addApiForm">
            <div class="mb-3">
                <label class="form-label">接口名称</label>
                <input type="text" class="form-control" id="apiName" required>
            </div>
            <div class="mb-3">
                <label class="form-label">请求方法</label>
                <select class="form-select" id="apiMethod">
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                </select>
            </div>
            <div class="mb-3">
                <label class="form-label">URL</label>
                <input type="url" class="form-control" id="apiUrl" required>
            </div>
            <div class="mb-3">
                <label class="form-label">请求头 (JSON)</label>
                <textarea class="form-control" id="apiHeaders" rows="3">{}</textarea>
            </div>
            <div class="mb-3">
                <label class="form-label">请求体 (JSON)</label>
                <textarea class="form-control" id="apiData" rows="3">{}</textarea>
            </div>
        </form>
    `;

    // 显示确认按钮
    modalConfirm.style.display = 'block';

    modalConfirm.onclick = async () => {
        const caseName = document.getElementById('apiName').value.trim();
        const method = document.getElementById('apiMethod').value;
        const url = document.getElementById('apiUrl').value.trim();
        const headers = document.getElementById('apiHeaders').value;
        const data = document.getElementById('apiData').value;

        if (!caseName || !url) {
            showToast('错误', '接口名称和URL不能为空');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('case_name', caseName);
            formData.append('method', method);
            formData.append('url', url);
            formData.append('headers', headers);
            formData.append('data', data);
            formData.append('expected', '{}');
            formData.append('extractions', '{}');

            const response = await fetch(`/projects/${encodeURIComponent(projectName)}/modules/${encodeURIComponent(moduleName)}/apis/add`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                showToast('成功', '接口添加成功');
                // 重新加载接口列表
                selectModule(projectName, moduleName);
            } else {
                showToast('错误', result.error || '添加接口失败');
            }
        } catch (error) {
            showToast('错误', '添加接口失败: ' + error.message);
        }
    };

    safeShowModal(document.getElementById('commonModal'));
}

// ========== 定时任务相关功能 ==========

// 定时任务筛选器：项目切换时联动模块列表（使用数据库数据）
async function onSchedulerProjectChange() {
    const project = document.getElementById('schedulerFilterProject').value;
    const moduleFilter = document.getElementById('schedulerFilterModule');

    // 清空模块筛选器
    moduleFilter.innerHTML = '<option value="">所有模块</option>';

    if (project && _dbProjectsData) {
        const modules = getDbModuleNames(_dbProjectsData, project);
        modules.forEach(mod => {
            const option = document.createElement('option');
            option.value = mod;
            option.textContent = mod;
            moduleFilter.appendChild(option);
        });
        // 默认选中第一个模块
        if (modules.length > 0) {
            moduleFilter.value = modules[0];
        }
    }

    // 刷新定时任务列表
    loadSchedulerJobs();
}

// 加载定时任务筛选器（使用数据库项目/模块数据）
async function loadSchedulerFilter() {
    const projectFilter = document.getElementById('schedulerFilterProject');

    // 确保数据库项目数据已加载
    const projectsData = await loadDbProjectsData();
    const projects = getDbProjectNames(projectsData);

    // 清空并重新填充项目筛选器
    projectFilter.innerHTML = '<option value="">所有项目</option>';

    if (projects.length > 0) {
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project;
            option.textContent = project;
            projectFilter.appendChild(option);
        });
        // 默认选中第一个项目
        projectFilter.value = projects[0];

        // 联动加载模块列表
        await onSchedulerProjectChange();
    } else {
        // 没有项目时直接加载列表
        loadSchedulerJobs();
    }
}

// 加载定时任务列表（支持筛选）
async function loadSchedulerJobs() {
    try {
        const response = await fetch('/scheduler/list');
        const data = await response.json();

        const schedulerList = document.getElementById('schedulerList');
        const schedulerCount = document.getElementById('schedulerCount');
        const filterProject = document.getElementById('schedulerFilterProject').value;
        const filterModule = document.getElementById('schedulerFilterModule').value;

        if (Array.isArray(data)) {
            // 根据筛选条件过滤
            let filtered = data;
            if (filterProject) {
                filtered = filtered.filter(j => j.project_name === filterProject);
            }
            if (filterModule) {
                filtered = filtered.filter(j => j.module_name === filterModule);
            }

            schedulerCount.textContent = filtered.length;

            if (filtered.length === 0) {
                schedulerList.innerHTML = `
                    <div class="text-center py-5">
                        <i class="bi bi-clock-history text-muted" style="font-size: 3rem;"></i>
                        <p class="text-muted mt-3">暂无定时任务</p>
                    </div>
                `;
            } else {
                schedulerList.innerHTML = filtered.map(job => {
                    const nameParts = (job.name || '').split(' - ');
                    const pathPart = nameParts[0] || '';
                    const caseName = nameParts[1] || '未命名';
                    const cronDisplay = formatCronExpression(job.cron_expression);

                    return `
                    <div class="card scheduler-card mb-3" data-job-id="${job.id}">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <div class="flex-grow-1">
                                    <h6 class="card-title mb-1">${caseName}</h6>
                                    <small class="text-muted"><i class="bi bi-folder2 me-1"></i>${pathPart}</small>
                                </div>
                            </div>
                            <div class="scheduler-meta mb-2">
                                <div class="d-flex align-items-center mb-1">
                                    <i class="bi bi-clock-history me-1 text-info"></i>
                                    <code class="cron-code">${job.cron_expression || '未知'}</code>
                                    <span class="cron-desc">${cronDisplay}</span>
                                </div>
                                <small class="text-muted"><i class="bi bi-calendar-event me-1"></i>下次执行: ${job.next_run_time || '未计划'}</small>
                            </div>
                            <div class="d-flex gap-2">
                                <button class="btn btn-sm btn-outline-primary flex-fill" onclick="showEditSchedulerModal('${job.id}', '${job.project_name || ''}', '${job.module_name || ''}', ${job.api_id || 0}, '${job.cron_expression || ''}')">
                                    <i class="bi bi-pencil me-1"></i>编辑
                                </button>
                                <button class="btn btn-sm btn-outline-danger flex-fill" onclick="deleteSchedulerJob('${job.id}')">
                                    <i class="bi bi-trash me-1"></i>删除
                                </button>
                            </div>
                        </div>
                    </div>
                    `;
                }).join('');
            }
        }
    } catch (error) {
        console.error('加载定时任务失败:', error);
        document.getElementById('schedulerList').innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-exclamation-circle text-danger" style="font-size: 3rem;"></i>
                <p class="text-muted mt-3">加载定时任务失败</p>
            </div>
        `;
    }
}

// 格式化cron表达式为可读文本（与网页端 projects.js 保持一致）
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
    // 每月指定日期时间
    if (day !== '*' && minute !== '*' && hour !== '*' && month === '*' && weekday === '*') {
        return `每月${day}日 ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
    }

    return cronExpr;
}

// 显示编辑定时任务模态框
function showEditSchedulerModal(jobId, projectName, moduleName, apiId, cronExpression) {
    const modalTitle = document.getElementById('commonModalTitle');
    const modalBody = document.getElementById('commonModalBody');
    const modalConfirm = document.getElementById('commonModalConfirm');

    modalTitle.textContent = '编辑定时任务';
    modalBody.innerHTML = `
        <form id="editSchedulerForm">
            <div class="mb-3">
                <label class="form-label">项目</label>
                <input type="text" class="form-control" value="${projectName}" readonly>
            </div>
            <div class="mb-3">
                <label class="form-label">模块</label>
                <input type="text" class="form-control" value="${moduleName}" readonly>
            </div>
            <div class="mb-3">
                <label class="form-label">Cron 表达式</label>
                <input type="text" class="form-control" id="editCronExpr" value="${cronExpression}" placeholder="分 时 日 月 周，如: 0 * * * *">
                <div class="form-text">格式：分 时 日 月 周（如：0 */2 * * * 表示每2小时执行）</div>
            </div>
            <div class="mb-3">
                <label class="form-label">常用表达式</label>
                <div class="d-flex flex-wrap gap-2">
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="document.getElementById('editCronExpr').value='*/5 * * * *'">每5分钟</button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="document.getElementById('editCronExpr').value='0 * * * *'">每小时</button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="document.getElementById('editCronExpr').value='0 */2 * * *'">每2小时</button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="document.getElementById('editCronExpr').value='0 8 * * *'">每天8点</button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="document.getElementById('editCronExpr').value='0 9 * * 1-5'">工作日9点</button>
                </div>
            </div>
        </form>
    `;

    modalConfirm.style.display = 'block';
    modalConfirm.textContent = '保存';
    modalConfirm.onclick = async () => {
        const newCronExpr = document.getElementById('editCronExpr').value.trim();

        if (!newCronExpr) {
            showToast('错误', 'Cron表达式不能为空');
            return;
        }

        const cronFields = newCronExpr.split(/\s+/);
        if (cronFields.length !== 5) {
            showToast('错误', 'Cron表达式格式错误：需要5个字段（分 时 日 月 周）');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('job_id', jobId);
            formData.append('project_name', projectName);
            formData.append('module_name', moduleName);
            formData.append('case_index', apiId);
            formData.append('cron_expression', newCronExpr);

            const response = await fetch('/scheduler/update', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                showToast('成功', '定时任务更新成功');
                safeHideModal();
                loadSchedulerJobs();
                loadSchedulerCount();
                loadStatistics();
            } else {
                showToast('错误', result.message || '更新定时任务失败');
            }
        } catch (error) {
            showToast('错误', '更新定时任务失败: ' + error.message);
        }
    };

    safeShowModal(document.getElementById('commonModal'));
}

// 删除定时任务
function deleteSchedulerJob(jobId) {
    const modalTitle = document.getElementById('commonModalTitle');
    const modalBody = document.getElementById('commonModalBody');
    const modalConfirm = document.getElementById('commonModalConfirm');

    modalTitle.textContent = '确认删除';
    modalBody.innerHTML = `<p>确定要删除该定时任务吗？此操作不可恢复。</p>`;

    modalConfirm.style.display = 'block';
    modalConfirm.textContent = '删除';
    modalConfirm.className = 'btn btn-danger';

    modalConfirm.onclick = async () => {
        try {
            const response = await fetch(`/scheduler/delete/${encodeURIComponent(jobId)}`);
            const result = await response.json();

            if (result.success) {
                showToast('成功', '定时任务删除成功');
                safeHideModal();
                loadSchedulerJobs();
                loadSchedulerCount();
                loadStatistics();
            } else {
                showToast('错误', result.error || '删除定时任务失败');
            }
        } catch (error) {
            showToast('错误', '删除定时任务失败: ' + error.message);
        }
    };

    safeShowModal(document.getElementById('commonModal'));
}

// 全局项目/模块数据缓存（来自数据库 projects/modules 表）
let _dbProjectsData = null;

/**
 * 从数据库加载项目/模块数据（/projects/list 接口，基于 projects 和 modules 表）
 * 缓存到 _dbProjectsData，供统计页面和定时任务页面的筛选器共用
 */
async function loadDbProjectsData() {
    if (_dbProjectsData) return _dbProjectsData;
    try {
        const response = await fetch('/projects/list');
        const data = await response.json();
        _dbProjectsData = data;
        return data;
    } catch (error) {
        console.error('加载数据库项目列表失败:', error);
        return {};
    }
}

/**
 * 清除项目/模块数据缓存（在增删改操作后调用）
 */
function invalidateDbProjectsCache() {
    _dbProjectsData = null;
}

/**
 * 从缓存数据中获取项目名称列表
 */
function getDbProjectNames(data) {
    return data ? Object.keys(data) : [];
}

/**
 * 从缓存数据中获取指定项目的模块名称列表
 */
function getDbModuleNames(data, projectName) {
    if (!data || !data[projectName]) return [];
    return Object.keys(data[projectName].modules || {});
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async function() {
    // 先加载数据库项目/模块数据
    const projectsData = await loadDbProjectsData();

    // 初始化日期筛选器（默认今天）
    initDateFilter();

    // 加载统计数据
    loadStatistics();

    // 填充统计页面的项目筛选器
    fillStatisticsProjectFilter(projectsData);

    // 加载定时任务筛选器（会自动加载列表，默认选中第一个项目和模块）
    loadSchedulerFilter();

    // 监听统计页面项目筛选器变化
    document.getElementById('filterProject').addEventListener('change', async function() {
        const project = this.value;
        const moduleFilter = document.getElementById('filterModule');

        // 清空模块筛选器
        moduleFilter.innerHTML = '<option value="">所有模块</option>';

        if (project) {
            const modules = getDbModuleNames(_dbProjectsData, project);
            modules.forEach(mod => {
                const option = document.createElement('option');
                option.value = mod;
                option.textContent = mod;
                moduleFilter.appendChild(option);
            });
        }

        // 重新加载统计数据
        loadStatistics();
    });
});

// 填充统计页面的项目筛选器
function fillStatisticsProjectFilter(projectsData) {
    const projectFilter = document.getElementById('filterProject');
    if (!projectFilter) return;

    const projects = getDbProjectNames(projectsData);
    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project;
        option.textContent = project;
        projectFilter.appendChild(option);
    });
}

// 加载统计数据
async function loadStatistics() {
    try {
        // 加载统计列表（重置到第1页）
        _statCurrentPage = 1;
        await loadStatisticsList(1);
    } catch (error) {
        console.error('加载统计数据失败:', error);
    }
}

// URL搜索防抖
let _filterUrlTimer = null;
function debounceFilterUrl() {
    clearTimeout(_filterUrlTimer);
    _filterUrlTimer = setTimeout(() => {
        loadStatistics();
    }, 500);
}

// 统计列表分页状态
let _statCurrentPage = 1;
let _statTotalPages = 1;
let _statTotalRecords = 0;
const _statPageSize = 15;

// 初始化日期筛选器（默认今天）
function initDateFilter() {
    const today = new Date().toISOString().split('T')[0];
    const dateStart = document.getElementById('filterDateStart');
    const dateEnd = document.getElementById('filterDateEnd');
    if (dateStart && !dateStart.value) dateStart.value = today;
    if (dateEnd && !dateEnd.value) dateEnd.value = today;
}

// 加载统计列表（支持分页）
async function loadStatisticsList(page) {
    if (page === undefined) page = _statCurrentPage;
    page = Math.max(1, page);

    try {
        const project = document.getElementById('filterProject').value;
        const module = document.getElementById('filterModule').value;
        const dateStart = document.getElementById('filterDateStart').value;
        const dateEnd = document.getElementById('filterDateEnd').value;
        const status = document.getElementById('filterStatus').value;
        const assertion = document.getElementById('filterAssertion').value;
        const keyword = document.getElementById('filterUrl').value.trim();

        let url = `/statistics/list?page=${page}&page_size=${_statPageSize}`;
        if (project) url += `&project=${encodeURIComponent(project)}`;
        if (module) url += `&module=${encodeURIComponent(module)}`;
        if (dateStart) url += `&date_start=${encodeURIComponent(dateStart)}`;
        if (dateEnd) url += `&date_end=${encodeURIComponent(dateEnd)}`;
        if (status) url += `&status=${encodeURIComponent(status)}`;
        if (assertion) url += `&assertion=${encodeURIComponent(assertion)}`;
        if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;

        const response = await fetch(url);
        const data = await response.json();

        const statisticsList = document.getElementById('statisticsList');
        const paginationEl = document.getElementById('statPagination');

        // 更新分页状态
        _statCurrentPage = data.page || page;
        _statTotalPages = data.total_pages || 1;
        _statTotalRecords = data.total || 0;

        if (data.records && data.records.length > 0) {
            statisticsList.innerHTML = data.records.map(record => {
                const statusClass = record.status_code >= 200 && record.status_code < 300 ? 'bg-success' : 'bg-danger';
                const methodClass = {'GET': 'bg-success', 'POST': 'bg-primary', 'PUT': 'bg-warning', 'DELETE': 'bg-danger'}[record.method] || 'bg-secondary';
                const assertionIcon = record.assertion_passed ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger';
                const assertionText = record.assertion_passed ? '通过' : '失败';

                return `
                <div class="card stat-record-card mb-2" onclick="showStatDetail(${record.id})">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-1">
                            <h6 class="stat-record-name mb-0 me-2">${record.case_name || '未命名'}</h6>
                            <span class="badge ${methodClass} stat-method-badge me-1">${record.method || '-'}</span>
                            <span class="stat-source-badge stat-source-${(record.source || '调试') === '调试' ? 'debug' : (record.source || '调试') === '执行' ? 'execute' : 'schedule'}">${record.source || '调试'}</span>
                        </div>
                        <div class="stat-record-meta">
                            <span class="badge ${statusClass} stat-status-badge">${record.status_code || '-'}</span>
                            <span class="stat-record-item"><i class="bi bi-speedometer2 me-1"></i>${record.response_time != null ? record.response_time + 'ms' : '-'}</span>
                            <span class="stat-record-item"><i class="bi ${assertionIcon} me-1"></i>${assertionText}</span>
                            <span class="stat-record-item"><i class="bi bi-clock me-1"></i>${record.timestamp || '-'}</span>
                        </div>
                    </div>
                </div>
                `;
            }).join('');

            // 渲染分页控件
            renderStatPagination();
        } else {
            statisticsList.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-bar-chart-line text-muted" style="font-size: 3rem;"></i>
                    <p class="text-muted mt-3">暂无统计数据</p>
                </div>
            `;
            _statTotalPages = 0;
            renderStatPagination();
        }
    } catch (error) {
        console.error('加载统计列表失败:', error);
    }
}

// 渲染统计列表分页控件
function renderStatPagination() {
    const paginationEl = document.getElementById('statPagination');
    const prevBtn = document.getElementById('statPrevBtn');
    const nextBtn = document.getElementById('statNextBtn');
    const pageInfo = document.getElementById('statPageInfo');

    if (!paginationEl) return;

    // 更新页码信息
    pageInfo.textContent = `${_statCurrentPage} / ${_statTotalPages}`;

    if (_statTotalPages <= 1) {
        paginationEl.style.display = 'none';
        return;
    }

    paginationEl.style.display = 'flex';

    // 上一页按钮状态
    prevBtn.disabled = _statCurrentPage <= 1;

    // 下一页按钮状态
    nextBtn.disabled = _statCurrentPage >= _statTotalPages;
}

// 显示统计详情（与网页端一致）
async function showStatDetail(recordId) {
    const modalTitle = document.getElementById('commonModalTitle');
    const modalBody = document.getElementById('commonModalBody');
    const modalConfirm = document.getElementById('commonModalConfirm');

    modalTitle.textContent = '加载中...';
    modalBody.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">加载中...</span>
            </div>
        </div>
    `;
    modalConfirm.style.display = 'none';

    safeShowModal(document.getElementById('commonModal'));

    try {
        const response = await fetch(`/statistics/detail?id=${recordId}`);
        const data = await response.json();

        if (data.success && data.detail) {
            const d = data.detail;
            const statusClass = d.status_code >= 200 && d.status_code < 300 ? 'bg-success' : 'bg-danger';
            const methodClass = {'GET': 'bg-success', 'POST': 'bg-primary', 'PUT': 'bg-warning', 'DELETE': 'bg-danger'}[d.method] || 'bg-secondary';
            const assertionIcon = d.assertion_passed ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger';
            const assertionText = d.assertion_passed ? '通过' : '失败';

            // 格式化JSON
            function formatJson(val) {
                if (val === null || val === undefined || val === '') return '-';
                if (typeof val === 'object') {
                    try { return JSON.stringify(val, null, 2); } catch { return String(val); }
                }
                if (typeof val === 'string') {
                    try { return JSON.stringify(JSON.parse(val), null, 2); } catch { return val; }
                }
                return String(val);
            }

            modalTitle.textContent = d.case_name || '接口详情';

            let assertionHtml = '';
            const assertionResults = d.assertion_results || [];
            if (assertionResults.length > 0) {
                assertionHtml = `
                    <div class="mb-3">
                        <label class="form-label text-muted small">断言详情</label>
                        <div class="table-responsive">
                            <table class="table table-sm table-bordered mb-0">
                                <thead class="table-light"><tr><th>类型</th><th>字段</th><th>期望</th><th>实际</th><th>结果</th></tr></thead>
                                <tbody>
                                    ${assertionResults.map(a => {
                                        const passed = a.passed !== false;
                                        return `<tr>
                                            <td><small>${a.type || '-'}</small></td>
                                            <td><small>${a.field || '-'}</small></td>
                                            <td><small>${a.expected != null ? a.expected : '-'}</small></td>
                                            <td><small>${a.actual != null ? a.actual : '-'}</small></td>
                                            <td><span class="badge ${passed ? 'bg-success' : 'bg-danger'}">${passed ? '通过' : '失败'}</span></td>
                                        </tr>`;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }

            modalBody.innerHTML = `
                <div class="stat-detail">
                    <!-- 基本信息 -->
                    <div class="mb-3">
                        <div class="d-flex flex-wrap gap-2 align-items-center mb-2">
                            <span class="badge ${methodClass}">${d.method || '-'}</span>
                            <span class="badge ${statusClass}">${d.status_code || '-'}</span>
                            <span class="stat-detail-item"><i class="bi bi-speedometer2 me-1"></i>${d.response_time != null ? d.response_time + 'ms' : '-'}</span>
                            <span class="stat-detail-item"><i class="bi ${assertionIcon} me-1"></i>${assertionText}</span>
                        </div>
                        <div class="p-2 bg-light rounded mb-1">
                            <small class="text-muted">URL</small>
                            <div class="small text-break">${d.url || '-'}</div>
                        </div>
                        <div class="d-flex justify-content-between">
                            <small class="text-muted"><i class="bi bi-folder2 me-1"></i>${d.project || '-'} / ${d.module || '-'}</small>
                            <small class="text-muted"><i class="bi bi-clock me-1"></i>${d.timestamp || '-'}</small>
                        </div>
                    </div>

                    <!-- 请求头 -->
                    <div class="mb-3">
                        <label class="form-label text-muted small">请求头</label>
                        <pre class="stat-detail-pre">${formatJson(d.request_headers)}</pre>
                    </div>

                    <!-- 请求体 -->
                    <div class="mb-3">
                        <label class="form-label text-muted small">请求体</label>
                        <pre class="stat-detail-pre">${formatJson(d.request_body)}</pre>
                    </div>

                    <!-- 断言 -->
                    <div class="mb-3">
                        <label class="form-label text-muted small">断言结果</label>
                        <div><span class="badge ${d.assertion_passed ? 'bg-success' : 'bg-danger'}"><i class="bi ${d.assertion_passed ? 'bi-check-circle-fill' : 'bi-x-circle-fill'} me-1"></i>${assertionText}</span></div>
                    </div>

                    ${assertionHtml}

                    <!-- 响应头 -->
                    <div class="mb-3">
                        <label class="form-label text-muted small">响应头</label>
                        <pre class="stat-detail-pre">${formatJson(d.response_headers)}</pre>
                    </div>

                    <!-- 响应体 -->
                    <div class="mb-3">
                        <label class="form-label text-muted small">响应体</label>
                        <pre class="stat-detail-pre">${formatJson(d.response_body)}</pre>
                    </div>

                    ${d.error ? `
                    <div class="mb-3">
                        <label class="form-label text-muted small">错误信息</label>
                        <div class="alert alert-danger mb-0 small">${d.error}</div>
                    </div>
                    ` : ''}
                </div>
            `;
        } else {
            modalBody.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-exclamation-circle text-danger" style="font-size: 2rem;"></i>
                    <p class="text-muted mt-2">获取详情失败</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('获取统计详情失败:', error);
        modalBody.innerHTML = `
            <div class="text-center py-4">
                <i class="bi bi-exclamation-circle text-danger" style="font-size: 2rem;"></i>
                <p class="text-muted mt-2">获取详情失败: ${error.message}</p>
            </div>
        `;
    }
}

// 加载定时任务数量
async function loadSchedulerCount() {
    try {
        const response = await fetch('/scheduler/list');
        const data = await response.json();

        if (Array.isArray(data)) {
            document.getElementById('statSchedulers').textContent = data.length;
        }
    } catch (error) {
        console.error('加载定时任务数量失败:', error);
    }
}
