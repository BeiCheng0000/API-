
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

// 发送调试请求
async function sendDebugRequest() {
    const method = document.getElementById('debugMethod').value;
    const url = document.getElementById('debugUrl').value;
    const headers = document.getElementById('debugHeaders').value;
    const data = document.getElementById('debugData').value;

    if (!url) {
        alert('请输入URL');
        return;
    }

    try {
        // 解析JSON数据
        const headersObj = headers ? JSON.parse(headers) : {};
        const dataObj = data ? JSON.parse(data) : {};

        // 显示加载状态
        const submitBtn = document.querySelector('#debugForm button[type="button"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>发送中...';

        // 发送请求
        const response = await fetch('/api/debug', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                method: method,
                url: url,
                headers: headersObj,
                data: dataObj
            })
        });

        const result = await response.json();

        // 显示结果
        const resultDiv = document.getElementById('debugResult');
        const statusCode = document.getElementById('debugStatusCode');
        const responseTime = document.getElementById('debugResponseTime');
        const responseBody = document.getElementById('debugResponseBody');

        resultDiv.style.display = 'block';
        statusCode.textContent = result.status_code;
        statusCode.className = 'badge ' + (result.status_code >= 200 && result.status_code < 300 ? 'bg-success' : 'bg-danger');
        responseTime.textContent = result.response_time || 0;
        responseBody.textContent = JSON.stringify(result.data, null, 2);

        // 恢复按钮状态
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;

    } catch (error) {
        alert('请求失败: ' + error.message);

        // 恢复按钮状态
        const submitBtn = document.querySelector('#debugForm button[type="button"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-play-fill me-1"></i>发送请求';
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 加载统计数据
    loadStatistics();

    // 加载项目筛选器
    loadProjectFilter();

    // 监听项目筛选器变化
    document.getElementById('filterProject').addEventListener('change', async function() {
        const project = this.value;
        const moduleFilter = document.getElementById('filterModule');

        // 清空模块筛选器
        moduleFilter.innerHTML = '<option value="">所有模块</option>';

        if (project) {
            // 加载该项目的模块列表
            try {
                const response = await fetch(`/statistics/modules?project=${encodeURIComponent(project)}`);
                const data = await response.json();

                if (data.modules && data.modules.length > 0) {
                    data.modules.forEach(module => {
                        const option = document.createElement('option');
                        option.value = module;
                        option.textContent = module;
                        moduleFilter.appendChild(option);
                    });
                }
            } catch (error) {
                console.error('加载模块列表失败:', error);
            }
        }

        // 重新加载统计数据
        loadStatistics();
    });
});

// 加载项目筛选器
async function loadProjectFilter() {
    try {
        const response = await fetch('/statistics/projects');
        const data = await response.json();

        const projectFilter = document.getElementById('filterProject');

        if (data.projects && data.projects.length > 0) {
            data.projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project;
                option.textContent = project;
                projectFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('加载项目列表失败:', error);
    }
}

// 加载统计数据
async function loadStatistics() {
    try {
        const response = await fetch('/api/top_stats');
        const data = await response.json();

        if (data.module_count !== undefined) {
            document.getElementById('statModules').textContent = data.module_count;
        }
        if (data.api_count !== undefined) {
            document.getElementById('statApis').textContent = data.api_count;
        }
        if (data.scheduler_count !== undefined) {
            document.getElementById('statSchedulers').textContent = data.scheduler_count;
        }

        // 加载统计列表
        await loadStatisticsList();
    } catch (error) {
        console.error('加载统计数据失败:', error);
    }
}

// 加载统计列表
async function loadStatisticsList() {
    try {
        const project = document.getElementById('filterProject').value;
        const module = document.getElementById('filterModule').value;

        let url = '/statistics/list?page=1&page_size=10';
        if (project) url += `&project=${encodeURIComponent(project)}`;
        if (module) url += `&module=${encodeURIComponent(module)}`;

        const response = await fetch(url);
        const data = await response.json();

        const statisticsList = document.getElementById('statisticsList');

        if (data.records && data.records.length > 0) {
            statisticsList.innerHTML = data.records.map(record => `
                <div class="card mb-3">
                    <div class="card-body">
                        <h6 class="card-title mb-2">${record.case_name || '未命名'}</h6>
                        <div class="mb-2">
                            <small class="text-muted">项目: ${record.project || '-'}</small><br>
                            <small class="text-muted">模块: ${record.module || '-'}</small>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="badge ${record.status_code >= 200 && record.status_code < 300 ? 'bg-success' : 'bg-danger'}">
                                ${record.status_code || '-'}
                            </span>
                            <small class="text-muted">${record.response_time || 0}ms</small>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            statisticsList.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-bar-chart-line text-muted" style="font-size: 3rem;"></i>
                    <p class="text-muted mt-3">暂无统计数据</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('加载统计列表失败:', error);
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
