/**
 * API自动化测试平台 - 项目管理脚本
 */

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 加载定时任务列表
    loadSchedulerList();

    // 加载项目列表
    loadProjectsList();

    // 检查是否有Flash消息
    checkFlashMessages();
});

/**
 * 加载项目列表
 */
function loadProjectsList() {
    fetch('/projects/list')
        .then(response => {
            if (!response.ok) {
                throw new Error('网络响应异常');
            }
            return response.json();
        })
        .then(projectsData => {
            const projectsList = document.getElementById('projectsList');
            projectsList.innerHTML = '';

            // 验证数据格式
            if (!projectsData || typeof projectsData !== 'object') {
                throw new Error('服务器返回的数据格式不正确');
            }

            if (Object.keys(projectsData).length === 0) {
                projectsList.innerHTML = `
                    <div class="text-center text-muted py-4">
                        <p>暂无项目</p>
                        <button type="button" class="btn btn-sm btn-primary" onclick="showAddProjectModal()">
                            <i class="bi bi-plus-circle"></i> 添加第一个项目
                        </button>
                    </div>
                `;
                return;
            }

            for (const [projectName, projectData] of Object.entries(projectsData)) {
                if (!projectData || typeof projectData !== 'object') {
                    console.warn(`项目 ${projectName} 的数据格式不正确，跳过`);
                    continue;
                }

                const projectCard = document.createElement('div');
                projectCard.className = 'card mb-3';
                projectCard.innerHTML = `
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">${projectName}</h6>
                        <div>
                            <button type="button" class="btn btn-sm btn-outline-primary" onclick="showAddModuleModal('${projectName}')">
                                <i class="bi bi-plus"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-danger" onclick="deleteProject('${projectName}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="card-body p-2">
                        <p class="card-text small text-muted">${projectData.description || '暂无描述'}</p>
                        <p class="card-text small"><strong>${projectData.modules ? Object.keys(projectData.modules).length : 0}</strong> 个模块</p>
                    </div>
                `;
                projectsList.appendChild(projectCard);
            }
        })
        .catch(error => {
            console.error('加载项目列表失败:', error);
            showToast('错误', '加载项目列表失败: ' + error.message, 'danger');

            // 显示错误提示
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
 * 显示添加项目模态框
 */
function showAddProjectModal() {
    const modal = new bootstrap.Modal(document.getElementById('addProjectModal'));
    document.getElementById('addProjectForm').reset();
    modal.show();
}

/**
 * 添加项目
 */
function addProject() {
    const projectName = document.getElementById('projectName').value.trim();
    const projectDesc = document.getElementById('projectDesc').value.trim();

    if (!projectName) {
        showToast('错误', '项目名称不能为空', 'danger');
        return;
    }

    const formData = new FormData();
    formData.append('project_name', projectName);
    formData.append('project_desc', projectDesc);

    fetch('/projects/add', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showToast('成功', result.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('addProjectModal')).hide();
            loadProjectsList();
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

    fetch(`/projects/delete/${projectName}`)
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showToast('成功', result.message, 'success');
            loadProjectsList();
        } else {
            showToast('错误', result.error, 'danger');
        }
    })
    .catch(error => {
        showToast('错误', '删除项目失败: ' + error.message, 'danger');
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

    fetch(`/projects/${projectName}/modules/add`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showToast('成功', result.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('addModuleModal')).hide();
            loadModulesList(projectName);
        } else {
            showToast('错误', result.error, 'danger');
        }
    })
    .catch(error => {
        showToast('错误', '添加模块失败: ' + error.message, 'danger');
    });
}

/**
 * 加载模块列表
 * @param {string} projectName - 项目名称
 */
function loadModulesList(projectName) {
    fetch(`/projects/list`)
    .then(response => response.json())
    .then(projectsData => {
        const modulesList = document.getElementById('modulesList');
        modulesList.innerHTML = '';

        if (!projectsData[projectName]) {
            modulesList.innerHTML = '<p class="text-muted text-center">项目不存在</p>';
            return;
        }

        const projectData = projectsData[projectName];
        const modulesHtml = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5>${projectName}</h5>
                <button type="button" class="btn btn-primary btn-sm" onclick="showAddApiModal('${projectName}')">
                    <i class="bi bi-plus-circle"></i> 添加接口
                </button>
            </div>
            <div class="accordion" id="modulesAccordion">
        `;

        if (Object.keys(projectData.modules).length === 0) {
            modulesHtml += `
                <div class="text-center text-muted py-4">
                    <p>暂无模块</p>
                    <button type="button" class="btn btn-sm btn-primary" onclick="showAddModuleModal('${projectName}')">
                        <i class="bi bi-plus-circle"></i> 添加第一个模块
                    </button>
                </div>
            `;
        } else {
            for (const [moduleName, moduleData] of Object.entries(projectData.modules)) {
                modulesHtml += `
                    <div class="accordion-item">
                        <h2 class="accordion-header" id="heading${moduleName}">
                            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
                                    data-bs-target="#collapse${moduleName}" aria-expanded="false"
                                    aria-controls="collapse${moduleName}">
                                ${moduleName} (${moduleData.apis.length}个接口)
                            </button>
                        </h2>
                        <div id="collapse${moduleName}" class="accordion-collapse collapse"
                             aria-labelledby="heading${moduleName}" data-bs-parent="#modulesAccordion">
                            <div class="accordion-body">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <h6 class="mb-0">${moduleData.description || '暂无描述'}</h6>
                                    <div>
                                        <button type="button" class="btn btn-sm btn-outline-primary" onclick="showAddApiModal('${projectName}', '${moduleName}')">
                                            <i class="bi bi-plus"></i>
                                        </button>
                                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="deleteModule('${projectName}', '${moduleName}')">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="mt-2">
                `;

                if (moduleData.apis.length === 0) {
                    modulesHtml += `
                        <p class="text-muted text-center mb-2">暂无接口</p>
                        <button type="button" class="btn btn-sm btn-primary" onclick="showAddApiModal('${projectName}', '${moduleName}')">
                            <i class="bi bi-plus-circle"></i> 添加第一个接口
                        </button>
                    `;
                } else {
                    for (let i = 0; i < moduleData.apis.length; i++) {
                        const api = moduleData.apis[i];
                        modulesHtml += `
                            <div class="card mb-2">
                                <div class="card-body">
                                    <h6 class="card-title">${api.case_name}</h6>
                                    <p class="card-text">
                                        <small class="text-muted">
                                            ${api.method} ${api.url}
                                        </small>
                                    </p>
                                    <div class="btn-group btn-group-sm">
                                        <button type="button" class="btn btn-primary"
                                                onclick="debugApi('${projectName}', ${i})">
                                            <i class="bi bi-bug"></i> 调试
                                        </button>
                                        <button type="button" class="btn btn-secondary"
                                                onclick="editApi('${projectName}', ${i})">
                                            <i class="bi bi-pencil"></i> 编辑
                                        </button>
                                        <button type="button" class="btn btn-success"
                                                onclick="executeTest('${projectName}', ${i})">
                                            <i class="bi bi-play-fill"></i> 执行
                                        </button>
                                        <button type="button" class="btn btn-info"
                                                onclick="showSchedulerModal('${projectName}', ${i})">
                                            <i class="bi bi-clock"></i> 定时
                                        </button>
                                        <button type="button" class="btn btn-danger"
                                                onclick="deleteApi('${projectName}', '${moduleName}', ${i})">
                                            <i class="bi bi-trash"></i> 删除
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }
                }

                modulesHtml += `
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
        }

        modulesHtml += `
            </div>
        `;

        modulesList.innerHTML = modulesHtml;
    })
    .catch(error => {
        console.error('加载模块列表失败:', error);
        showToast('错误', '加载模块列表失败: ' + error.message, 'danger');
    });
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
    document.getElementById('apiModuleName').value = moduleName;
    modal.show();
}

/**
 * 添加接口
 */
function addApi() {
    const projectName = document.getElementById('apiProjectName').value;
    const moduleName = document.getElementById('apiModuleName').value;
    const caseName = document.getElementById('apiCaseName').value.trim();
    const method = document.getElementById('apiMethod').value;
    const url = document.getElementById('apiUrl').value.trim();
    const headers = document.getElementById('apiHeaders').value.trim();
    const data = document.getElementById('apiData').value.trim();

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

    fetch(`/projects/${projectName}/modules/${moduleName}/apis/add`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showToast('成功', result.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('addApiModal')).hide();
            loadModulesList(projectName);
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

    fetch(`/projects/${projectName}/modules/delete/${moduleName}`)
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showToast('成功', result.message, 'success');
            loadModulesList(projectName);
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
function deleteApi(projectName, moduleName, apiIndex) {
    if (!confirm('确定要删除这个接口吗？')) {
        return;
    }

    fetch(`/projects/${projectName}/modules/${moduleName}/apis/delete/${apiIndex}`)
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showToast('成功', result.message, 'success');
            loadModulesList(projectName);
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
function loadSchedulerList() {
    fetch('/scheduler/list')
        .then(response => response.json())
        .then(jobs => {
            const schedulerTableBody = document.getElementById('schedulerTableBody');
            schedulerTableBody.innerHTML = '';

            if (jobs.length === 0) {
                schedulerTableBody.innerHTML = '<tr><td colspan="4" class="text-center">暂无定时任务</td></tr>';
                return;
            }

            jobs.forEach(job => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${job.name}</td>
                    <td>${job.next_run_time || '未知'}</td>
                    <td>${job.trigger}</td>
                    <td>
                        <button type="button" class="btn btn-sm btn-danger" onclick="deleteScheduler('${job.id}')">
                            <i class="bi bi-trash"></i> 删除
                        </button>
                    </td>
                `;
                schedulerTableBody.appendChild(row);
            });
        })
        .catch(error => {
            console.error('加载定时任务列表失败:', error);
        });
}

/**
 * 显示定时任务模态框
 * @param {string} apiName - API名称
 * @param {number} caseIndex - 用例索引
 */
function showSchedulerModal(apiName, caseIndex) {
    document.getElementById('schedulerApiName').value = apiName;
    document.getElementById('schedulerCaseIndex').value = caseIndex;

    const schedulerModal = new bootstrap.Modal(document.getElementById('schedulerModal'));
    schedulerModal.show();
}

/**
 * 添加定时任务
 */
function addScheduler() {
    const apiName = document.getElementById('schedulerApiName').value;
    const caseIndex = document.getElementById('schedulerCaseIndex').value;
    const cronExpression = document.getElementById('cronExpression').value;

    if (!cronExpression) {
        showToast('错误', '请输入Cron表达式', 'danger');
        return;
    }

    // 创建表单数据
    const formData = new FormData();
    formData.append('api_name', apiName);
    formData.append('case_index', caseIndex);
    formData.append('cron_expression', cronExpression);

    // 发送请求
    fetch('/scheduler/add', {
        method: 'POST',
        body: formData
    })
    .then(response => response.text())
    .then(result => {
        // 关闭模态框
        const schedulerModal = bootstrap.Modal.getInstance(document.getElementById('schedulerModal'));
        schedulerModal.hide();

        // 刷新定时任务列表
        loadSchedulerList();

        // 刷新页面以显示Flash消息
        window.location.reload();
    })
    .catch(error => {
        showToast('错误', '添加定时任务失败: ' + error.message, 'danger');
    });
}

/**
 * 删除定时任务
 * @param {string} jobId - 任务ID
 */
function deleteScheduler(jobId) {
    if (confirm('确定要删除这个定时任务吗？')) {
        window.location.href = `/scheduler/delete/${jobId}`;
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
 * @param {string} apiName - API名称
 * @param {number} caseIndex - 用例索引
 */
function editApi(apiName, caseIndex) {
    // 从服务器获取API数据
    fetch(`/api/edit/${apiName}/${caseIndex}`)
        .then(response => response.json())
        .then(apiData => {
            if (apiData.error) {
                showToast('错误', apiData.error, 'danger');
                return;
            }

            // 填充编辑表单
            document.getElementById('editApiName').value = apiData.api_name;
            document.getElementById('editCaseIndex').value = apiData.case_index;
            document.getElementById('editCaseName').value = apiData.case_name;
            document.getElementById('editUrl').value = apiData.url;
            document.getElementById('editMethod').value = apiData.method;
            document.getElementById('editHeaders').value = JSON.stringify(apiData.headers || {}, null, 2);
            document.getElementById('editData').value = JSON.stringify(apiData.data || {}, null, 2);

            // 设置断言
            setEditAssertions(apiData.expected || {}, 'editAssertionContainer');

            // 显示编辑模态框
            const editModal = new bootstrap.Modal(document.getElementById('editApiModal'));
            editModal.show();
        })
        .catch(error => {
            showToast('错误', '获取API数据失败: ' + error.message, 'danger');
        });
}

/**
 * 执行测试
 * @param {string} apiName - API名称
 * @param {number} caseIndex - 用例索引
 */
function executeTest(apiName, caseIndex) {
    fetch(`/test/execute/${apiName}/${caseIndex}`)
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                showToast('成功', '测试执行成功', 'success');
            } else {
                showToast('失败', '测试执行失败: ' + (result.error || '未知错误'), 'danger');
            }
        })
        .catch(error => {
            showToast('错误', '请求失败: ' + error.message, 'danger');
        });
}

/**
 * 调试API
 * @param {string} apiName - API名称
 * @param {number} caseIndex - 用例索引
 */
function debugApi(apiName, caseIndex) {
    // 如果提供了apiName和caseIndex，则从API列表中获取数据
    if (apiName && caseIndex !== undefined) {
        // 从服务器获取完整的API数据
        fetch('/api/list')
            .then(response => response.json())
            .then(testData => {
                if (testData[apiName] && testData[apiName][caseIndex]) {
                    const apiData = testData[apiName][caseIndex];

                    // 填充调试表单
                    document.getElementById('apiUrl').value = apiData.url;
                    document.getElementById('apiMethod').value = apiData.method;
                    document.getElementById('apiHeaders').value = JSON.stringify(apiData.headers || {}, null, 2);
                    document.getElementById('apiData').value = JSON.stringify(apiData.data || {}, null, 2);

                    // 设置断言
                    setAssertions(apiData.expected || {}, 'assertionContainer');

                    // 滚动到调试区域
                    document.getElementById('api-debug').scrollIntoView({ behavior: 'smooth' });
                }
            })
            .catch(error => {
                showToast('错误', '获取API数据失败: ' + error.message, 'danger');
            });
    }

    // 获取表单数据
    const apiUrl = document.getElementById('apiUrl').value;
    const apiMethod = document.getElementById('apiMethod').value;
    const apiHeaders = document.getElementById('apiHeaders').value;
    const apiData = document.getElementById('apiData').value;

    // 验证必填字段
    if (!apiUrl) {
        showToast('错误', '请输入URL', 'danger');
        return;
    }

    // 解析JSON数据
    let headers = {};
    let data = {};

    try {
        if (apiHeaders) {
            headers = JSON.parse(apiHeaders);
        }
        if (apiData) {
            data = JSON.parse(apiData);
        }
    } catch (e) {
        showToast('错误', 'JSON格式错误: ' + e.message, 'danger');
        return;
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
            expected: expected
        })
    })
    .then(response => response.json())
    .then(result => {
        // 显示响应结果
        const debugResult = document.getElementById('debugResult');
        const responseTime = document.getElementById('responseTime');
        const statusCode = document.getElementById('statusCode');
        const responseData = document.getElementById('responseData');
        const assertionResult = document.getElementById('assertionResult');
        const assertionSummary = document.getElementById('assertionSummary');
        const assertionTableBody = document.getElementById('assertionTableBody');

        debugResult.style.display = 'block';

        if (result.success) {
            responseTime.innerHTML = '<span class="badge bg-info">响应时间: ' + result.response_time + 'ms</span>';
            statusCode.innerHTML = '<span class="badge bg-success">状态码: ' + result.status_code + '</span>';
            responseData.textContent = JSON.stringify(result.data, null, 2);

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
            responseData.textContent = '错误: ' + result.error;
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
