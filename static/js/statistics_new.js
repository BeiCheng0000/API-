/**
 * API自动化测试平台 - 数据统计模块
 */

// 当前分页状态
let statCurrentPage = 1;
let statPageSize = 10;

// Chart.js 实例
let chartStatus = null;
let chartMethod = null;
let chartTrend = null;

// 防抖计时器
let statLoadTimer = null;
// 当前正在加载的请求
let statLoadingAbortController = null;

/**
 * 加载统计数据（带防抖）
 */
function loadStatistics(page) {
    if (page) statCurrentPage = page;
    console.log('[统计数据] 开始加载统计数据, page=', statCurrentPage);

    // 取消之前的防抖计时器
    if (statLoadTimer) {
        clearTimeout(statLoadTimer);
    }

    // 取消之前正在进行的请求
    if (statLoadingAbortController) {
        statLoadingAbortController.abort();
    }

    // 使用防抖，300ms内只执行一次
    statLoadTimer = setTimeout(function() {
        _doLoadStatistics();
    }, 300);
}

/**
 * 实际执行加载统计数据
 */
function _doLoadStatistics() {
    // 创建新的AbortController
    statLoadingAbortController = new AbortController();

    const params = new URLSearchParams({
        project: document.getElementById('statFilterProject').value,
        module: document.getElementById('statFilterModule').value,
        method: document.getElementById('statFilterMethod').value,
        status: document.getElementById('statFilterStatus').value,
        assertion: document.getElementById('statFilterAssertion').value,
        date_start: document.getElementById('statFilterDateStart').value,
        date_end: document.getElementById('statFilterDateEnd').value,
        keyword: document.getElementById('statFilterKeyword').value,
        page: statCurrentPage,
        page_size: statPageSize
    });

    const url = '/statistics/list?' + params.toString();
    console.log('[统计数据] 请求URL:', url);

    fetch(url, { signal: statLoadingAbortController.signal })
        .then(r => {
            console.log('[统计数据] 响应状态:', r.status);
            return r.json();
        })
        .then(data => {
            console.log('[统计数据] 获取到数据:', data.records ? data.records.length : 0, '条记录');
            console.log('[统计数据] 数据来源:', data.data_source || '未知');
            renderStatSummary(data.summary);
            renderStatTable(data.records);
            renderStatPagination(data.total, data.page, data.total_pages);
            renderStatCharts(data.summary);
        })
        .catch(err => {
            if (err.name === 'AbortError') {
                console.log('[统计数据] 请求被取消');
                return;
            }
            console.error('加载统计数据失败:', err);
            showToast('错误', '加载统计数据失败', 'danger');
        });
}

/**
 * 渲染统计概览
 */
function renderStatSummary(summary) {
    if (!summary) return;

    document.getElementById('statTotalCount').textContent = summary.total_count || 0;
    document.getElementById('statSuccessCount').textContent = summary.success_count || 0;
    document.getElementById('statFailCount').textContent = summary.fail_count || 0;
    document.getElementById('statAvgTime').textContent = (summary.avg_time || 0) + 'ms';
    document.getElementById('statMinTime').textContent = summary.min_time ? summary.min_time + 'ms' : '-';
    document.getElementById('statMaxTime').textContent = summary.max_time ? summary.max_time + 'ms' : '-';
    document.getElementById('statAssertionRate').textContent = (summary.assertion_rate || 0) + '%';
}

/**
 * 渲染统计表格
 */
function renderStatTable(records) {
    const tbody = document.getElementById('statisticsTableBody');
    if (!records || records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12"><div class="stat-empty-state"><div class="stat-empty-icon"><i class="bi bi-inbox"></i></div><div class="stat-empty-title">暂无数据</div><div class="stat-empty-desc">执行测试后数据将自动展示在这里</div></div></td></tr>';
        return;
    }

    tbody.innerHTML = records.map((r, i) => {
        // 方法标签
        const methodClass = 'stat-method-' + (r.method || 'GET');

        // 状态码
        let statusGroup = 'none';
        if (r.status_code) {
            if (r.status_code >= 200 && r.status_code < 300) statusGroup = '2xx';
            else if (r.status_code >= 400 && r.status_code < 500) statusGroup = '4xx';
            else if (r.status_code >= 500) statusGroup = '5xx';
        }
        const statusClass = 'stat-status-' + statusGroup;

        // 响应时间
        let timeClass = 'stat-time-fast';
        let timePercent = 10;
        if (r.response_time != null) {
            if (r.response_time > 1000) { timeClass = 'stat-time-very-slow'; timePercent = 100; }
            else if (r.response_time > 500) { timeClass = 'stat-time-slow'; timePercent = 70; }
            else if (r.response_time > 200) { timeClass = 'stat-time-normal'; timePercent = 40; }
            else { timePercent = Math.max(10, r.response_time / 200 * 30); }
        }

        // 断言标签
        const assertionClass = r.assertion_passed ? 'stat-assertion-pass' : 'stat-assertion-fail';
        const assertionIcon = r.assertion_passed ? 'bi-check-circle-fill' : 'bi-x-circle-fill';
        const assertionText = r.assertion_passed ? '通过' : '失败';


        // URL截断显示
        const urlDisplay = r.url && r.url.length > 50 ? r.url.substring(0, 50) + '...' : (r.url || '-');

        // 时间戳拆分
        let tsDate = '', tsTime = '';
        if (r.timestamp) {
            const parts = r.timestamp.split(' ');
            tsDate = parts[0] || '';
            tsTime = parts[1] || '';
        }

        return `<tr>
            <td><span class="stat-id">${i + 1}</span></td>
            <td><span class="stat-tag stat-tag-project" title="${escapeHtml(r.project || '')}"><i class="bi bi-folder2-open"></i> ${escapeHtml(r.project || '-')}</span></td>
            <td><span class="stat-tag stat-tag-module" title="${escapeHtml(r.module || '')}"><i class="bi bi-collection"></i> ${escapeHtml(r.module || '-')}</span></td>
            <td><span class="stat-tag stat-tag-case" title="${escapeHtml(r.case_name || '')}"><i class="bi bi-plug"></i> ${escapeHtml(r.case_name || '-')}</span></td>
            <td><span class="stat-source-badge stat-source-${(r.source || '调试') === '调试' ? 'debug' : (r.source || '调试') === '执行' ? 'execute' : 'schedule'}">${escapeHtml(r.source || '调试')}</span></td>
            <td><span class="stat-method ${methodClass}">${r.method || '-'}</span></td>
            <td><span class="stat-url" title="${escapeHtml(r.url || '')}">${escapeHtml(urlDisplay)}</span></td>
            <td><span class="stat-status ${statusClass}"><span class="stat-status-dot"></span>${r.status_code || '-'}</span></td>
            <td><span class="${timeClass}"><span class="stat-time"><span class="stat-time-bar"><span class="stat-time-bar-fill" style="width:${timePercent}%"></span></span>${r.response_time != null ? r.response_time + 'ms' : '-'}</span></span></td>
            <td><span class="stat-assertion ${assertionClass}"><i class="bi ${assertionIcon}"></i> ${assertionText}</span></td>
            <td><span class="stat-timestamp"><span class="stat-timestamp-date">${tsDate}</span> <span class="stat-timestamp-time">${tsTime}</span></span></td>
            <td><button class="stat-action-btn" onclick="showStatDetail(${r.id})" title="查看详情"><i class="bi bi-eye"></i></button></td>
        </tr>`;
    }).join('');
}

/**
 * 渲染分页
 */
function renderStatPagination(total, currentPage, totalPages) {
    document.getElementById('statPaginationInfo').textContent = `共 ${total} 条记录`;

    const paginationEl = document.getElementById('statPagination');
    if (totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }

    let html = '';
    // 上一页
    html += `<button class="btn btn-sm btn-outline-secondary" ${currentPage <= 1 ? 'disabled' : ''} onclick="loadStatistics(${currentPage - 1})"><i class="bi bi-chevron-left"></i> 上一页</button>`;

    // 页码
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-outline-secondary'}" onclick="loadStatistics(${i})">${i}</button>`;
    }

    // 下一页
    html += `<button class="btn btn-sm btn-outline-secondary" ${currentPage >= totalPages ? 'disabled' : ''} onclick="loadStatistics(${currentPage + 1})">下一页 <i class="bi bi-chevron-right"></i></button>`;

    paginationEl.innerHTML = html;
}

/**
 * 切换每页条数
 */
function changeStatPageSize() {
    statPageSize = parseInt(document.getElementById('statPageSize').value);
    statCurrentPage = 1;
    loadStatistics();
}

/**
 * 跳转到指定页
 */
function jumpStatPage() {
    const input = document.getElementById('statJumpPage');
    const page = parseInt(input.value);
    if (isNaN(page) || page < 1) {
        showToast('提示', '请输入有效的页码', 'warning');
        return;
    }
    loadStatistics(page);
    input.value = '';
}

/**
 * 渲染图表
 */
function renderStatCharts(summary) {
    if (!summary) return;

    // 状态码分布 - 饼图
    const statusCtx = document.getElementById('statChartStatus');
    if (chartStatus) chartStatus.destroy();
    const statusDist = summary.status_dist || {};
    const statusLabels = Object.keys(statusDist);
    const statusValues = Object.values(statusDist);
    const statusColors = { '2xx': '#198754', '3xx': '#0dcaf0', '4xx': '#ffc107', '5xx': '#dc3545' };

    chartStatus = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: statusLabels.length ? statusLabels : ['暂无数据'],
            datasets: [{
                data: statusValues.length ? statusValues : [1],
                backgroundColor: statusLabels.length ? statusLabels.map(l => statusColors[l] || '#6c757d') : ['#dee2e6'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } }
            },
            cutout: '60%'
        }
    });

    // 请求方法分布 - 柱状图
    const methodCtx = document.getElementById('statChartMethod');
    if (chartMethod) chartMethod.destroy();
    const methodDist = summary.method_dist || {};
    const methodLabels = Object.keys(methodDist);
    const methodValues = Object.values(methodDist);
    const methodColors = { 'GET': '#198754', 'POST': '#0d6efd', 'PUT': '#ffc107', 'DELETE': '#dc3545', 'PATCH': '#0dcaf0' };

    chartMethod = new Chart(methodCtx, {
        type: 'bar',
        data: {
            labels: methodLabels.length ? methodLabels : ['暂无数据'],
            datasets: [{
                data: methodValues.length ? methodValues : [0],
                backgroundColor: methodLabels.length ? methodLabels.map(l => methodColors[l] || '#6c757d') : ['#dee2e6'],
                borderWidth: 0,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } } },
                x: { ticks: { font: { size: 10 } } }
            }
        }
    });

    // 响应时间趋势图 - 折线图
    const trendCtx = document.getElementById('statChartTrend');
    if (chartTrend) chartTrend.destroy();
    const trendData = summary.trend_data || [];
    const trendLabels = trendData.map(d => {
        // 只显示时分秒
        const t = d.time || '';
        const parts = t.split(' ');
        return parts.length > 1 ? parts[1] : t;
    });
    const trendValues = trendData.map(d => d.value);

    // 计算平均响应时间作为参考线
    const avgValue = trendValues.length > 0 ? Math.round(trendValues.reduce((a, b) => a + b, 0) / trendValues.length) : 0;

    chartTrend = new Chart(trendCtx, {
        type: 'line',
        data: {
            labels: trendLabels.length ? trendLabels : ['暂无数据'],
            datasets: [
                {
                    label: '响应时间(ms)',
                    data: trendValues.length ? trendValues : [0],
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 3,
                    pointBackgroundColor: '#0d6efd',
                    fill: true
                },
                {
                    label: `平均: ${avgValue}ms`,
                    data: trendLabels.length ? Array(trendLabels.length).fill(avgValue) : [0],
                    borderColor: '#ffc107',
                    borderWidth: 1.5,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            return ctx.dataset.label + ': ' + ctx.parsed.y + 'ms';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: '响应时间(ms)', font: { size: 10 } },
                    ticks: { font: { size: 10 } }
                },
                x: {
                    title: { display: true, text: '时间', font: { size: 10 } },
                    ticks: { font: { size: 9 }, maxRotation: 45 }
                }
            }
        }
    });
}

/**
 * 显示统计详情
 */
function showStatDetail(id) {
    fetch(`/statistics/detail?id=${id}`)
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                renderStatDetail(data.detail);
                const modalEl = document.getElementById('statDetailModal');
                if (modalEl) {
                    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
                    modal.show();
                }
            } else {
                showToast('错误', data.message || data.error || '获取详情失败', 'danger');
            }
        })
        .catch(err => {
            console.error('获取统计详情失败:', err);
            showToast('错误', '获取统计详情失败', 'danger');
        });
}

/**
 * 渲染统计详情
 */
function renderStatDetail(detail) {
    // 辅助函数：安全设置元素文本
    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    // 辅助函数：安全设置格式化文本（支持对象和字符串）
    function setFormattedText(id, value) {
        const el = document.getElementById(id);
        if (!el) return;
        if (value === null || value === undefined || value === '') {
            el.textContent = '-';
        } else if (typeof value === 'object') {
            // 对象类型直接序列化
            try {
                el.textContent = JSON.stringify(value, null, 2);
            } catch {
                el.textContent = String(value);
            }
        } else if (typeof value === 'string') {
            // 字符串类型：尝试格式化JSON，失败则原样显示
            try {
                el.textContent = JSON.stringify(JSON.parse(value), null, 2);
            } catch {
                el.textContent = value;
            }
        } else {
            el.textContent = String(value);
        }
    }

    // 基本信息
    setText('statDetailMethod', detail.method || '-');
    setText('statDetailUrl', detail.url || '-');
    setText('statDetailStatus', detail.status_code || '-');
    setText('statDetailTime', detail.response_time != null ? detail.response_time + 'ms' : '-');

    // 断言结果概览
    const assertionPassed = detail.assertion_passed;
    const assertionEl = document.getElementById('statDetailAssertion');
    if (assertionEl) {
        assertionEl.className = assertionPassed ? 'stat-assertion stat-assertion-pass' : 'stat-assertion stat-assertion-fail';
        assertionEl.innerHTML = `<i class="bi ${assertionPassed ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}"></i> ${assertionPassed ? '通过' : '失败'}`;
    }

    // 请求头和请求体
    setFormattedText('statDetailReqHeaders', detail.request_headers);
    setFormattedText('statDetailReqBody', detail.request_body);

    // 断言结果表格
    const assertionTableBody = document.getElementById('statDetailAssertionTableBody');
    if (assertionTableBody) {
        const assertionResults = detail.assertion_results || [];
        if (assertionResults.length > 0) {
            assertionTableBody.innerHTML = assertionResults.map(a => {
                const passed = a.passed === true;
                return `<tr>
                    <td>${a.type || '-'}</td>
                    <td>${a.field || '-'}</td>
                    <td>${a.expected != null ? a.expected : '-'}</td>
                    <td>${a.actual != null ? a.actual : '-'}</td>
                    <td><span class="badge ${passed ? 'bg-success' : 'bg-danger'}">${passed ? '通过' : '失败'}</span></td>
                </tr>`;
            }).join('');
        } else {
            const passed = detail.assertion_passed;
            assertionTableBody.innerHTML = `<tr><td colspan="5" class="text-center"><span class="badge ${passed ? 'bg-success' : 'bg-danger'}">${passed ? '通过' : '失败'}</span></td></tr>`;
        }
    }

    // 响应头和响应体
    setFormattedText('statDetailResHeaders', detail.response_headers);
    setFormattedText('statDetailResBody', detail.response_body);
}

/**
 * 切换统计详情中实际请求的展开/折叠
 */
function toggleStatRequest() {
    const content = document.getElementById('statDetailRequestContent');
    const icon = document.getElementById('statRequestToggleIcon');
    const header = icon ? icon.closest('[aria-expanded]') : null;
    if (!content || !icon) return;
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.classList.remove('bi-chevron-right');
        icon.classList.add('bi-chevron-down');
        if (header) header.setAttribute('aria-expanded', 'true');
    } else {
        content.style.display = 'none';
        icon.classList.remove('bi-chevron-down');
        icon.classList.add('bi-chevron-right');
        if (header) header.setAttribute('aria-expanded', 'false');
    }
}

/**
 * 导出统计数据（导出当前筛选的数据为Excel表格）
 */
function exportStatistics() {
    // 获取当前筛选条件
    const params = new URLSearchParams({
        project: document.getElementById('statFilterProject').value,
        module: document.getElementById('statFilterModule').value,
        method: document.getElementById('statFilterMethod').value,
        status: document.getElementById('statFilterStatus').value,
        assertion: document.getElementById('statFilterAssertion').value,
        date_start: document.getElementById('statFilterDateStart').value,
        date_end: document.getElementById('statFilterDateEnd').value,
        keyword: document.getElementById('statFilterKeyword').value,
        export: '1'
    });

    // 创建下载链接
    const a = document.createElement('a');
    a.href = '/statistics/export?' + params.toString();
    a.download = `api_statistics_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

/**
 * 设置默认日期范围
 */
/**
 * 重置所有筛选条件为默认值
 */
function resetStatFilters() {
    // 重置项目筛选
    document.getElementById('statFilterProject').value = '';
    // 重置模块筛选
    document.getElementById('statFilterModule').value = '';
    // 重置请求方法
    document.getElementById('statFilterMethod').value = '';
    // 重置状态码
    document.getElementById('statFilterStatus').value = '';
    // 重置断言
    document.getElementById('statFilterAssertion').value = '';
    // 重置关键词
    document.getElementById('statFilterKeyword').value = '';
    // 重置日期范围为默认（最近一周）
    setDefaultStatDateRange();
    // 重新加载模块下拉框（全部项目）
    loadStatFilterModules('');
    // 重置分页
    statCurrentPage = 1;
    // 重新加载统计数据
    loadStatistics();
}

/**
 * 项目筛选变化事件（供HTML onclick调用）
 */
function onStatFilterProjectChange() {
    const project = document.getElementById('statFilterProject').value;
    loadStatFilterModules(project);
    statCurrentPage = 1;
    loadStatistics();
}

function setDefaultStatDateRange() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // 默认显示最近一周

    document.getElementById('statFilterDateStart').value = startDate.toISOString().slice(0, 10);
    document.getElementById('statFilterDateEnd').value = endDate.toISOString().slice(0, 10);
}

/**
 * 加载项目筛选下拉框
 */
function loadStatFilterProjects() {
    fetch('/statistics/projects')
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                const select = document.getElementById('statFilterProject');
                select.innerHTML = '<option value="">全部项目</option>';
                data.projects.forEach(p => {
                    select.innerHTML += `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`;
                });
            }
        })
        .catch(err => {
            console.error('加载项目列表失败:', err);
        });
}

/**
 * 加载模块筛选下拉框
 */
function loadStatFilterModules(project) {
    fetch(`/statistics/modules?project=${encodeURIComponent(project)}`)
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                const select = document.getElementById('statFilterModule');
                select.innerHTML = '<option value="">全部模块</option>';
                data.modules.forEach(m => {
                    select.innerHTML += `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`;
                });
            }
        })
        .catch(err => {
            console.error('加载模块列表失败:', err);
        });
}

/**
 * 项目筛选变化事件
 */
document.getElementById('statFilterProject')?.addEventListener('change', function() {
    const project = this.value;
    loadStatFilterModules(project);
    statCurrentPage = 1;
    loadStatistics();
});

/**
 * 模块筛选变化事件
 */
document.getElementById('statFilterModule')?.addEventListener('change', function() {
    statCurrentPage = 1;
    loadStatistics();
});

/**
 * 其他筛选条件变化事件
 */
document.getElementById('statFilterMethod')?.addEventListener('change', function() {
    statCurrentPage = 1;
    loadStatistics();
});

document.getElementById('statFilterStatus')?.addEventListener('change', function() {
    statCurrentPage = 1;
    loadStatistics();
});

document.getElementById('statFilterAssertion')?.addEventListener('change', function() {
    statCurrentPage = 1;
    loadStatistics();
});

document.getElementById('statFilterDateStart')?.addEventListener('change', function() {
    statCurrentPage = 1;
    loadStatistics();
});

document.getElementById('statFilterDateEnd')?.addEventListener('change', function() {
    statCurrentPage = 1;
    loadStatistics();
});

/**
 * HTML转义
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    console.log('[统计数据] DOMContentLoaded 事件触发，开始初始化统计数据页面');

    // 设置默认日期范围为最近一周
    setDefaultStatDateRange();

    // 加载项目筛选下拉框
    loadStatFilterProjects();
    // 加载模块筛选下拉框（全部项目）
    loadStatFilterModules('');

    // 注意：不在DOMContentLoaded中调用loadStatistics()，因为switchPage函数会自动调用
    // main.js中的DOMContentLoaded事件会根据URL锚点调用switchPage，switchPage会自动调用loadStatistics
    // 如果没有锚点且当前页面是数据统计页面，则由main.js中的逻辑处理

    const keywordInput = document.getElementById('statFilterKeyword');
    if (keywordInput) {
        keywordInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                statCurrentPage = 1;
                loadStatistics();
            }
        });
    }
});
