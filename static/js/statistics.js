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

/**
 * 加载统计数据
 */
function loadStatistics(page) {
    if (page) statCurrentPage = page;

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

    fetch('/statistics/list?' + params.toString())
        .then(r => r.json())
        .then(data => {
            renderStatSummary(data.summary);
            renderStatTable(data.records);
            renderStatPagination(data.total, data.page, data.total_pages);
            renderStatCharts(data.summary);
        })
        .catch(err => {
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
            <td><span class="stat-id">${r.id || '-'}</span></td>
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

    // 响应时间趋势 - 折线图
    const trendCtx = document.getElementById('statChartTrend');
    if (chartTrend) chartTrend.destroy();
    const trendData = summary.trend_data || [];

    chartTrend = new Chart(trendCtx, {
        type: 'line',
        data: {
            labels: trendData.map(d => d.time ? d.time.split(' ')[1] || d.time : ''),
            datasets: [{
                label: '响应时间(ms)',
                data: trendData.map(d => d.value),
                borderColor: '#0d6efd',
                backgroundColor: 'rgba(13,110,253,0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 2,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { font: { size: 10 } } },
                x: { ticks: { font: { size: 9 }, maxRotation: 0 } }
            }
        }
    });
}

/**
 * 重置筛选条件
 */
function resetStatFilters() {
    document.getElementById('statFilterProject').value = '';
    document.getElementById('statFilterModule').value = '';
    document.getElementById('statFilterMethod').value = '';
    document.getElementById('statFilterStatus').value = '';
    document.getElementById('statFilterAssertion').value = '';
    document.getElementById('statFilterKeyword').value = '';
    // 重置为默认最近一周
    setDefaultStatDateRange();
    // 重置模块下拉框选项
    loadStatFilterModules('');
    statCurrentPage = 1;
    loadStatistics();
}

/**
 * 项目筛选变化时，联动更新模块下拉框
 */
function onStatFilterProjectChange() {
    const projectName = document.getElementById('statFilterProject').value;
    loadStatFilterModules(projectName);
    // 切换项目后自动搜索
    loadStatistics();
}

/**
 * 加载模块筛选下拉框选项
 * @param {string} projectName - 项目名称，为空则显示所有模块
 */
function loadStatFilterModules(projectName) {
    const moduleSelect = document.getElementById('statFilterModule');
    moduleSelect.innerHTML = '<option value="">全部模块</option>';

    fetch('/projects/list')
    .then(response => response.json())
    .then(projectsData => {
        if (projectName && projectsData[projectName]) {
            // 显示该项目的模块
            const modules = projectsData[projectName].modules || {};
            for (const modName of Object.keys(modules)) {
                const option = document.createElement('option');
                option.value = modName;
                option.textContent = modName;
                moduleSelect.appendChild(option);
            }
        } else {
            // 显示所有项目的所有模块
            for (const [pName, pData] of Object.entries(projectsData)) {
                const modules = pData.modules || {};
                for (const modName of Object.keys(modules)) {
                    const option = document.createElement('option');
                    option.value = modName;
                    option.textContent = pName + ' / ' + modName;
                    moduleSelect.appendChild(option);
                }
            }
        }
    })
    .catch(error => {
        console.error('加载模块列表失败:', error);
    });
}

/**
 * 加载项目筛选下拉框选项
 */
function loadStatFilterProjects() {
    const projectSelect = document.getElementById('statFilterProject');
    projectSelect.innerHTML = '<option value="">全部项目</option>';

    fetch('/projects/list')
    .then(response => response.json())
    .then(projectsData => {
        for (const projectName of Object.keys(projectsData)) {
            const option = document.createElement('option');
            option.value = projectName;
            option.textContent = projectName;
            projectSelect.appendChild(option);
        }
    })
    .catch(error => {
        console.error('加载项目列表失败:', error);
    });
}

/**
 * 设置默认日期范围为最近一周
 */
function setDefaultStatDateRange() {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    document.getElementById('statFilterDateStart').value = start.toISOString().slice(0, 10);
    document.getElementById('statFilterDateEnd').value = end.toISOString().slice(0, 10);
}

/**
 * 切换实际请求的展开/折叠
 */
function toggleStatRequest() {
    const content = document.getElementById('statDetailRequestContent');
    const icon = document.getElementById('statRequestToggleIcon');
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
 * 查看统计详情
 */
function showStatDetail(recordId) {
    // 重置折叠状态
    const content = document.getElementById('statDetailRequestContent');
    const icon = document.getElementById('statRequestToggleIcon');
    const header = icon ? icon.closest('[aria-expanded]') : null;
    if (content) content.style.display = 'none';
    if (icon) { icon.classList.remove('bi-chevron-down'); icon.classList.add('bi-chevron-right'); }
    if (header) header.setAttribute('aria-expanded', 'false');
    fetch('/statistics/detail/' + recordId)
        .then(r => r.json())
        .then(data => {
            const methodColors = {
                'GET': 'text-success', 'POST': 'text-primary', 'PUT': 'text-warning',
                'DELETE': 'text-danger', 'PATCH': 'text-info'
            };
            document.getElementById('statDetailMethod').innerHTML = `<span class="${methodColors[data.method] || ''}">${data.method || '-'}</span>`;

            let statusClass = 'text-muted';
            if (data.status_code) {
                if (data.status_code >= 200 && data.status_code < 300) statusClass = 'text-success';
                else if (data.status_code >= 400 && data.status_code < 500) statusClass = 'text-warning';
                else if (data.status_code >= 500) statusClass = 'text-danger';
            }
            document.getElementById('statDetailStatus').innerHTML = `<span class="${statusClass}">${data.status_code || '-'}</span>`;
            document.getElementById('statDetailTime').textContent = data.response_time != null ? data.response_time + 'ms' : '-';
            document.getElementById('statDetailAssertion').innerHTML = data.assertion_passed 
                ? '<span class="text-success">通过</span>' 
                : '<span class="text-danger">失败</span>';
            document.getElementById('statDetailUrl').textContent = data.url || '-';

            // 使用全局formatContent函数
            document.getElementById('statDetailReqHeaders').textContent = formatContent(data.request_headers);
            document.getElementById('statDetailReqBody').textContent = formatContent(data.request_body, '无请求体');
            document.getElementById('statDetailResHeaders').textContent = formatContent(data.response_headers);
            document.getElementById('statDetailResBody').textContent = formatContent(data.response_body);
            
            // 渲染断言结果表格
            renderAssertionDetails(data.assertion_results || []);

            new bootstrap.Modal(document.getElementById('statDetailModal')).show();
        })
        .catch(err => {
            console.error('获取统计详情失败:', err);
            showToast('错误', '获取详情失败', 'danger');
        });
}

/**
 * 清空统计数据
 */
function clearStatistics() {
    if (!confirm('确定要清空所有统计数据吗？此操作不可恢复！')) return;

    fetch('/statistics/clear', { method: 'POST' })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showToast('成功', '统计数据已清空', 'success');
                loadStatistics();
            } else {
                showToast('错误', data.message || '清空失败', 'danger');
            }
        })
        .catch(err => {
            console.error('清空统计数据失败:', err);
            showToast('错误', '清空失败', 'danger');
        });
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
        keyword: document.getElementById('statFilterKeyword').value
    });

    // 直接使用window.location下载Excel文件
    const url = '/statistics/export?' + params.toString();
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('成功', '正在导出统计数据...', 'success');
}

/**
 * 格式化内容显示
 */
function formatContent(value, fallback) {
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

/**
 * 渲染断言结果详情
 */
function renderAssertionDetails(assertionResults) {
    const tbody = document.getElementById('statDetailAssertionTableBody');
    if (!assertionResults || assertionResults.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">无断言结果</td></tr>';
        return;
    }

    tbody.innerHTML = assertionResults.map(result => {
        // 断言类型标签
        let typeLabel = '-';
        if (result.type === 'status_code') {
            typeLabel = '状态码';
        } else if (result.type === 'data') {
            typeLabel = '数据字段';
        } else {
            typeLabel = result.type || '-';
        }
        
        // 字段名称
        const fieldLabel = result.field || '-';
        
        // 期望值和实际值
        const expectedValue = formatContent(result.expected, '-');
        const actualValue = formatContent(result.actual, '-');
        
        // 结果标签
        const resultBadge = result.passed 
            ? '<span class="badge bg-success">通过</span>' 
            : '<span class="badge bg-danger">失败</span>';
        
        return `<tr>
            <td>${typeLabel}</td>
            <td>${fieldLabel}</td>
            <td><pre class="mb-0" style="white-space: pre-wrap; font-size: 0.8rem;">${expectedValue}</pre></td>
            <td><pre class="mb-0" style="white-space: pre-wrap; font-size: 0.8rem;">${actualValue}</pre></td>
            <td>${resultBadge}</td>
        </tr>`;
    }).join('');
}

// 关键词搜索支持回车 + 默认日期范围
document.addEventListener('DOMContentLoaded', function() {
    // 设置默认日期范围为最近一周
    setDefaultStatDateRange();

    // 加载项目筛选下拉框
    loadStatFilterProjects();
    // 加载模块筛选下拉框（全部项目）
    loadStatFilterModules('');

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
