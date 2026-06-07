let globalReportData = null;
let currentGeneratedSql = "";
let currentSummary = "";
let currentConfidence = "";
let currentReason = "";
let currentOriginalQuery = ""; // Store the exact query typed by user
let currentPage = 1;
let globalTotalCount = 0;
const PAGE_SIZE = 10;

// --- Role Management State ---
let currentUserRole = null;
let currentSelectedReviewId = null;

function loginAs(role) {
    const btnClass = role === 'Lab Admin' ? '.lab-admin-btn' : '.lims-admin-btn';
    const btn = document.querySelector(btnClass);
    
    if (btn) {
        const origContent = btn.innerHTML;
        btn.innerHTML = '<div class="spinner-ring" style="width:16px;height:16px;border-color:rgba(15,75,143,0.2);border-top-color:#0f4b8f;display:inline-block;vertical-align:middle;margin-right:6px;"></div> Opening...';
        btn.style.pointerEvents = 'none';
        
        setTimeout(() => {
            btn.innerHTML = origContent;
            btn.style.pointerEvents = 'auto';
            proceedLogin(role);
        }, 800);
    } else {
        proceedLogin(role);
    }
}

function proceedLogin(role) {
    currentUserRole = role;
    const loginModal = document.getElementById('loginModal');
    loginModal.style.opacity = '0';
    setTimeout(() => {
        loginModal.style.display = 'none';
        loginModal.style.opacity = '1';
        
        document.getElementById('currentUserDisplay').innerText = role;
        document.getElementById('headerActions').style.display = 'flex';
        
        // Fade in main app wrapper
        const wrapper = document.querySelector('.app-wrapper');
        wrapper.style.animation = 'none';
        wrapper.offsetHeight; // trigger reflow
        wrapper.style.animation = 'fadeUp 0.5s ease-out';
        
        if (role === 'Lab Admin') {
            document.querySelector('.main-col').style.display = 'block';
            document.getElementById('limsAdminBody').style.display = 'none';
            document.getElementById('reportStatusBtn').style.display = 'block';
            document.getElementById('chatFabBtn').style.display = 'inline-flex';
            document.getElementById('registerSampleBtnHeader').style.display = 'flex';
            document.querySelector('.app-title').innerText = 'AI REPORT GENERATOR';
        } else if (role === 'Lims Admin') {
            document.querySelector('.main-col').style.display = 'none';
            const rightCol = document.getElementById('rightCol');
            if(rightCol) rightCol.style.display = 'none';
            document.getElementById('limsAdminBody').style.display = 'flex';
            document.getElementById('reportStatusBtn').style.display = 'none';
            document.getElementById('chatFabBtn').style.display = 'none';
            document.getElementById('registerSampleBtnHeader').style.display = 'none';
            document.querySelector('.app-title').innerText = 'REPORT REVIEWER';
            fetchPendingReviews();
        }
    }, 300);
}

function logout() {
    resetToGenerate();
    currentUserRole = null;
    const wrapper = document.querySelector('.app-wrapper');
    wrapper.style.opacity = '0';
    setTimeout(() => {
        wrapper.style.opacity = '1';
        
        const loginModal = document.getElementById('loginModal');
        loginModal.style.display = 'flex';
        loginModal.style.animation = 'none';
        loginModal.offsetHeight; // trigger reflow
        loginModal.style.animation = 'fadeIn 0.3s ease';
        
        wrapper.classList.remove('rejected-theme');
        document.getElementById('headerActions').style.display = 'none';
        
        const rightCol = document.getElementById('rightCol');
        if(rightCol) rightCol.style.display = 'none';
    }, 300);
}

function resetToGenerate() {
    document.getElementById('newReportBtnContainer').style.display = 'none';
    document.getElementById('askAiContainer').style.display = 'block';
    
    document.querySelector('.app-wrapper').classList.remove('rejected-theme');
    
    const vrDetails = document.getElementById('viewReportDetails');
    if(vrDetails) vrDetails.style.display = 'none';

    if (currentUserRole === 'Lab Admin') {
        const sch = document.getElementById('registerSampleBtnHeader');
        if (sch) sch.style.display = 'flex';
        const chatFab = document.getElementById('chatFabBtn');
        if (chatFab) chatFab.style.display = 'inline-flex';
        
        const appTitle = document.querySelector('.app-title');
        if (appTitle) appTitle.innerText = 'AI REPORT GENERATOR';
        const reportStatusBtn = document.getElementById('reportStatusBtn');
        if (reportStatusBtn) reportStatusBtn.style.display = 'block';
    }
    const scs = document.getElementById('sampleCreationSection');
    if (scs) scs.style.display = 'none';
    
    document.getElementById('promptInput').value = '';
    document.getElementById('statusMessage').style.display = 'none';
    document.getElementById('dataGrid').style.display = 'none';
    const dash = document.getElementById('dashboardSection');
    if (dash) dash.style.display = 'none';
    document.getElementById('resultsHeader').style.display = 'none';
    const rightCol = document.getElementById('rightCol');
    if (rightCol) rightCol.style.display = 'none';
    
    globalReportData = null;
    currentGeneratedSql = "";
    currentSummary = "";
    currentOriginalQuery = "";
}

const REASONING_STEPS = [
    'Understanding your request',
    'Identifying relevant tables',
    'Applying filters and conditions',
    'Generating optimized SQL',
    'Validating query safety',
    'Fetching results'
];

// ── Helpers ───────────────────────────────────────────────────
function delay(ms)               { return new Promise(r => setTimeout(r, ms)); }
function randomBetween(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function markStep(i) {
    // Sidebar steps
    const sItems = document.querySelectorAll('#reasoningList .reasoning-step');
    if (sItems[i]) sItems[i].classList.add('visible');
    // Overlay steps
    const oItems = document.querySelectorAll('#overlayStepsList .overlay-step');
    if (oItems[i]) oItems[i].classList.add('visible');

    // ── Progress bar ──────────────────────────────────────────
    const totalSteps  = REASONING_STEPS.length;          // 6
    const pct         = Math.round(((i + 1) / totalSteps) * 100);
    const fillEl      = document.getElementById('procProgressFill');
    const pctEl       = document.getElementById('procProgressPct');
    if (fillEl) fillEl.style.width = pct + '%';
    if (pctEl)  pctEl.textContent  = pct + '%';
}

async function markStepAfter(i, ms) { await delay(ms); markStep(i); }
// ──────────────────────────────────────────────────────────────

async function generateReport() {
    const promptValue   = document.getElementById('promptInput').value.trim();
    const btn           = document.getElementById('generateBtn');
    const btnText       = document.getElementById('btnText');
    const spinner       = document.getElementById('btnSpinner');
    const statusMsg     = document.getElementById('statusMessage');
    const resultsHeader = document.getElementById('resultsHeader');
    const dataGrid      = document.getElementById('dataGrid');

    if (!promptValue) {
        showStatus('Please describe the report parameters before generating.', 'error');
        return;
    }

    const wordCount = promptValue.split(/\s+/).length;
    if (wordCount > 100 || promptValue.length > 1000) {
        showStatus(`Query too large. Words: ${wordCount}/100. Characters: ${promptValue.length}/1000.`, 'error');
        return;
    }

    // UI reset
    btn.disabled            = true;
    btnText.innerText       = 'Synthesizing…';
    spinner.style.display   = 'block';
    statusMsg.style.display      = 'none';
    resultsHeader.style.display  = 'none';
    dataGrid.style.display       = 'none';

    if(document.getElementById('dashboardSection')) {
        dashboardLoaded = false;
        document.getElementById('viewTableBtn').classList.add('active');
        document.getElementById('viewChartBtn').classList.remove('active');
        document.getElementById('dashboardSection').style.display = 'none';
    }

    // ── Show glow + centered overlay ─────────────────────────
    startProcessingUI();
    const startTime = Date.now();

    try {
        // Steps 1-3: organic random delays
        await markStepAfter(0, randomBetween(480, 900));
        await markStepAfter(1, randomBetween(320, 680));
        await markStepAfter(2, randomBetween(220, 500));

        // Step 4: REAL — /ai/sql/generate
        const sqlResp = await fetch('/ai/sql/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: promptValue })
        });
        if (!sqlResp.ok) {
            let errMsg = `HTTP ${sqlResp.status} on SQL generation`;
            try {
                const errData = await sqlResp.json();
                if (errData && errData.error) {
                    errMsg = errData.error;
                }
            } catch (e) {}
            throw new Error(errMsg);
        }
        const step1 = await sqlResp.json();
        markStep(3); // ✔ Generating optimized SQL

        // Step 5: validation happened server-side in step 4
        await delay(randomBetween(160, 340));
        markStep(4); // ✔ Validating query safety

        let initialSql = step1.sql.replace(/;+$/, '').trim();
        initialSql = initialSql.replace(/LIMIT\s+\d+/gi, '').trim(); 
        initialSql = initialSql.replace(/OFFSET\s+\d+/gi, '').trim();
        initialSql += ` LIMIT ${PAGE_SIZE + 1} OFFSET 0;`;

        // Step 6: REAL — /ai/sql/execute (0 AI calls)
        const execResp = await fetch('/ai/sql/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt:     promptValue,
                sql:        initialSql,
                summary:    step1.summary    || '',
                confidence: step1.confidence || 'medium',
                reason:     step1.reason     || ''
            })
        });
        if (!execResp.ok) {
            let errMsg = `HTTP ${execResp.status} on execution`;
            try {
                const errData = await execResp.json();
                if (errData && errData.error) {
                    errMsg = errData.error;
                }
            } catch (e) {}
            throw new Error(errMsg);
        }
        const result = await execResp.json();
        markStep(5); // ✔ Fetching results

        currentGeneratedSql = step1.sql;
        currentSummary = step1.summary;
        currentConfidence = step1.confidence;
        currentReason = step1.reason;
        currentOriginalQuery = promptValue;
        currentPage = 1;

        // Fetch total count
        let baseSql = step1.sql.replace(/;+$/, '').trim();
        baseSql = baseSql.replace(/LIMIT\s+\d+/gi, '').trim(); 
        baseSql = baseSql.replace(/OFFSET\s+\d+/gi, '').trim();
        const countSql = `SELECT COUNT(*) AS total_count FROM (${baseSql}) AS temp_count;`;
        
        globalTotalCount = 0;
        try {
            const countResp = await fetch('/ai/sql/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt:     promptValue,
                    sql:        countSql,
                    summary:    step1.summary    || '',
                    confidence: step1.confidence || 'medium',
                    reason:     step1.reason     || ''
                })
            });
            if (countResp.ok) {
                const countResult = await countResp.json();
                if (countResult.data && countResult.data.length > 0) {
                    const row = countResult.data[0];
                    const countKey = Object.keys(row).find(k => k.toLowerCase().includes('count'));
                    if (countKey) {
                        globalTotalCount = parseInt(row[countKey], 10) || 0;
                    }
                }
            }
        } catch (e) {
            console.error("Failed to fetch total count:", e);
        }

        const latency = ((Date.now() - startTime) / 1000).toFixed(1) + 's';

        // Brief pause so user sees all steps before transition
        await delay(500);

        // ── Hide overlay, populate panel ──────────────────────
        stopProcessingUI();
        populateAiPanel(
            step1.sql,
            result.summary,
            result.confidence,
            result.reason,
            latency,
            result.model
        );

        // For the first page, use the lookahead approach
        const parsedData = Array.isArray(result.data) ? result.data : [];
        let hasNextPage = false;
        let dataToRender = parsedData;
        if (parsedData.length > PAGE_SIZE) {
            hasNextPage = true;
            dataToRender = parsedData.slice(0, PAGE_SIZE); // Keep only 10
        }

        if (dataToRender.length > 0) {
            globalReportData = dataToRender;
            buildTable(dataToRender);
            updatePaginationUI(hasNextPage);
            resultsHeader.style.display = 'flex';
            dataGrid.style.display      = 'block';
        } else {
            showStatus('Query executed successfully, but returned 0 rows.', 'info');
        }

    } catch (err) {
        console.error('Error:', err);
        showStatus(`Error: ${err.message}`, 'error');
        stopProcessingUI();
        const panel = document.getElementById('rightCol');
        if (panel) panel.style.display = 'none';
    } finally {
        btn.disabled          = false;
        btnText.innerText     = 'Generate Report';
        spinner.style.display = 'none';
    }
}

// ── Processing UI helpers ─────────────────────────────────────

function startProcessingUI() {
    const chatFabBtn = document.getElementById('chatFabBtn');
    if (chatFabBtn) chatFabBtn.classList.add('disabled');

    // Show glow borders
    document.getElementById('borderGlow').classList.add('active');

    // Reset progress bar
    const fillEl = document.getElementById('procProgressFill');
    const pctEl  = document.getElementById('procProgressPct');
    if (fillEl) fillEl.style.width = '0%';
    if (pctEl)  pctEl.textContent  = '0%';

    // Build overlay steps
    const overlay = document.getElementById('procOverlay');
    const list    = document.getElementById('overlayStepsList');
    list.innerHTML = '';
    REASONING_STEPS.forEach(step => {
        const li   = document.createElement('li');
        li.className = 'overlay-step';
        li.innerHTML = `<span class="overlay-step-icon">&#10003;</span>${step}`;
        list.appendChild(li);
    });
    overlay.classList.add('active');

    // Build sidebar steps
    const aiPanel   = document.getElementById('rightCol');
    const reasonSec = document.getElementById('reasoningSection');
    const resultSec = document.getElementById('resultsSection');
    const sList     = document.getElementById('reasoningList');
    sList.innerHTML = '';
    REASONING_STEPS.forEach(step => {
        const li = document.createElement('li');
        li.className = 'reasoning-step';
        li.innerHTML = `<span class="step-check">&#10003;</span>${step}`;
        sList.appendChild(li);
    });
    aiPanel.style.display   = 'block';
    reasonSec.style.display = 'block';
    if (resultSec) resultSec.style.display = 'none';
}

function stopProcessingUI() {
    const chatFabBtn = document.getElementById('chatFabBtn');
    if (chatFabBtn) chatFabBtn.classList.remove('disabled');

    document.getElementById('borderGlow').classList.remove('active');
    document.getElementById('procOverlay').classList.remove('active');
    document.getElementById('reasoningSection').style.display = 'none';

    // Reset progress bar to 0 after overlay fades out
    setTimeout(() => {
        const fillEl = document.getElementById('procProgressFill');
        const pctEl  = document.getElementById('procProgressPct');
        if (fillEl) fillEl.style.width = '0%';
        if (pctEl)  pctEl.textContent  = '0%';
    }, 400);
}

// ── Populate AI results panel ─────────────────────────────────

function populateAiPanel(sql, summary, confidence, reason, latency, modelName) {
    const resultSec = document.getElementById('resultsSection');
    const sqlEl     = document.getElementById('sqlDisplay');
    const summEl    = document.getElementById('sqlSummary');
    const badgeEl   = document.getElementById('confidenceBadge');
    const reasonEl  = document.getElementById('confidenceReason');
    const latEl     = document.getElementById('latencyValue');
    const modEl     = document.getElementById('modelValue');

    if (sqlEl)    sqlEl.innerText    = sql;
    if (summEl)   summEl.innerText   = summary || '';
    if (latEl)    latEl.innerText    = latency  || '—';
    if (modEl)    modEl.innerText    = modelName ? modelName.split('/').pop() : '—';

    // Confidence badge
    if (badgeEl) {
        const level = (confidence || 'medium').toLowerCase();
        const map   = { high: '🟢 High Confidence', medium: '🟡 Medium Confidence', low: '🔴 Low Confidence' };
        badgeEl.innerHTML = `<span class="conf-badge ${level}">${map[level] || '🟡 Medium Confidence'}</span>`;
    }
    if (reasonEl) reasonEl.innerText = reason || '';

    // Show/hide review button based on role
    const reviewSec = document.getElementById('reviewActionSection');
    if (reviewSec) {
        if (currentUserRole === 'Lab Admin') {
            reviewSec.style.display = 'block';
            const btn = document.getElementById('sendReviewBtn');
            btn.style.display = 'flex';
            btn.disabled = false;
            btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg><span>Send for review</span>`;
            document.getElementById('reviewSuccessMsg').style.display = 'none';
            const vStatus = document.getElementById('viewReportStatus');
            if(vStatus) vStatus.style.display = 'none';
        } else {
            reviewSec.style.display = 'none';
        }
    }

    if (resultSec) resultSec.style.display = 'block';
}

// ── Table builder ─────────────────────────────────────────────

function buildTable(dataArray) {
    const thead = document.getElementById('dataHead');
    const tbody = document.getElementById('dataBody');
    thead.innerHTML = '';
    tbody.innerHTML = '';

    const cols = Array.from(new Set(dataArray.flatMap(r => Object.keys(r || {}))));

    const trH = document.createElement('tr');
    cols.forEach(col => {
        const th = document.createElement('th');
        th.innerText = col.replace(/_/g, ' ');
        trH.appendChild(th);
    });
    thead.appendChild(trH);

    dataArray.forEach(row => {
        const tr = document.createElement('tr');
        cols.forEach(col => {
            const td = document.createElement('td');
            let val  = row[col];
            if (val === null || val === undefined) val = '';
            if (typeof val === 'object') val = JSON.stringify(val);
            const span = document.createElement('span');
            span.className = 'lims-data-cell';
            span.title     = String(val);
            span.innerText = String(val);
            td.appendChild(span);
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

// ── Status helper ─────────────────────────────────────────────

function showStatus(msg, type) {
    const el = document.getElementById('statusMessage');
    el.innerText = msg;
    el.style.display = 'block';
    if (type === 'error') {
        el.style.cssText += 'background:#fff0f0;color:#c0392b;border:1px solid #f5c6c6;';
    } else {
        el.style.cssText += 'background:#e8f4fd;color:#1565c0;border:1px solid #b3d4f0;';
    }
}

// ── Excel export ──────────────────────────────────────────────

function exportToExcel() {
    if (!globalReportData || !globalReportData.length) return;
    const flat = globalReportData.map(row => {
        const r = {};
        for (const [k, v] of Object.entries(row))
            r[k] = typeof v === 'object' && v ? JSON.stringify(v) : v;
        return r;
    });
    const ws = XLSX.utils.json_to_sheet(flat);
    ws['!cols'] = Object.keys(flat[0] || {}).map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'LIMS Report');
    XLSX.writeFile(wb, `STARLIMS_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ── Pagination Logic ──────────────────────────────────────────

async function nextPage() {
    currentPage++;
    await fetchPage();
}

async function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        await fetchPage();
    }
}

async function fetchPage() {
    const offset = (currentPage - 1) * PAGE_SIZE;
    
    // We strip trailing semicolons, and remove any existing LIMIT/OFFSET.
    // Then we append LIMIT 11 (PAGE_SIZE + 1) to look ahead for the next page!
    let modifiedSql = currentGeneratedSql.replace(/;+$/, '').trim();
    modifiedSql = modifiedSql.replace(/LIMIT\s+\d+/gi, '').trim(); 
    modifiedSql = modifiedSql.replace(/OFFSET\s+\d+/gi, '').trim();
    modifiedSql += ` LIMIT ${PAGE_SIZE + 1} OFFSET ${offset};`;

    const statusMsg = document.getElementById('statusMessage');
    statusMsg.style.display = 'none';

    try {
        const execResp = await fetch('/ai/sql/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: document.getElementById('promptInput').value.trim(),
                sql: modifiedSql,
                summary: currentSummary,
                confidence: currentConfidence,
                reason: currentReason
            })
        });

        if (!execResp.ok) {
            let errMsg = `HTTP ${execResp.status}`;
            try {
                const errData = await execResp.json();
                if (errData && errData.error) {
                    errMsg = errData.error;
                }
            } catch (e) {}
            throw new Error(errMsg);
        }
        const result = await execResp.json();
        const parsedData = Array.isArray(result.data) ? result.data : [];
        
        let hasNextPage = false;
        let dataToRender = parsedData;
        if (parsedData.length > PAGE_SIZE) {
            hasNextPage = true;
            dataToRender = parsedData.slice(0, PAGE_SIZE); // Keep only 10
        }
        
        if (dataToRender.length > 0) {
            globalReportData = dataToRender;
            buildTable(dataToRender);
            updatePaginationUI(hasNextPage);
        } else {
            showStatus('No more records found on the next page.', 'info');
            currentPage--; // Revert to previous page
            updatePaginationUI(false); // Disable next button
        }
    } catch (err) {
        showStatus('Error fetching page: ' + err.message, 'error');
        currentPage--;
    }
}

function updatePaginationUI(hasNextPage) {
    const pagContainer = document.getElementById('paginationControls');
    const pageIndicator = document.getElementById('pageIndicator');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    
    if (pagContainer) {
        pagContainer.style.display = 'flex';
        const totalPages = Math.max(1, Math.ceil(globalTotalCount / PAGE_SIZE));
        pageIndicator.innerText = `Page ${currentPage}/${totalPages}`;
        
        prevBtn.disabled = (currentPage === 1);
        nextBtn.disabled = !hasNextPage || (globalTotalCount > 0 && currentPage >= totalPages);
    }
}

// ── Dashboard & Charts ──────────────────────────────────────────

let dashboardLoaded = false;
let currentCharts = [];

function toggleView(view) {
    const tableBtn = document.getElementById('viewTableBtn');
    const chartBtn = document.getElementById('viewChartBtn');
    const dataGrid = document.getElementById('dataGrid');
    const dashboard = document.getElementById('dashboardSection');

    if (view === 'table') {
        tableBtn.classList.add('active');
        chartBtn.classList.remove('active');
        dataGrid.style.display = 'block';
        dashboard.style.display = 'none';
    } else {
        chartBtn.classList.add('active');
        tableBtn.classList.remove('active');
        dataGrid.style.display = 'none';
        dashboard.style.display = 'block';
        
        if (!dashboardLoaded) {
            renderDashboard();
        }
    }
}

async function renderDashboard() {
    dashboardLoaded = true;
    const kpiContainer = document.getElementById('kpiContainer');
    const chartsContainer = document.getElementById('chartsContainer');
    
    kpiContainer.innerHTML = 'Loading dashboard data...';
    chartsContainer.innerHTML = '';
    
    // Reset chart filter UI
    const allBtn = document.getElementById('chartFilterAll');
    const barBtn = document.getElementById('chartFilterBar');
    const circBtn = document.getElementById('chartFilterCircular');
    if (allBtn) {
        allBtn.classList.add('active');
        if (barBtn) barBtn.classList.remove('active');
        if (circBtn) circBtn.classList.remove('active');
    }
    currentChartFilter = 'all';

    // Clear previous charts
    currentCharts.forEach(c => c.destroy());
    currentCharts = [];

    // Fetch up to 1000 rows for dashboard
    let dashSql = currentGeneratedSql.replace(/;+$/, '').trim();
    dashSql = dashSql.replace(/LIMIT\s+\d+/gi, '').trim(); 
    dashSql = dashSql.replace(/OFFSET\s+\d+/gi, '').trim();
    dashSql += ` LIMIT 1000 OFFSET 0;`;

    try {
        const execResp = await fetch('/ai/sql/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: document.getElementById('promptInput').value.trim(),
                sql: dashSql,
                summary: currentSummary,
                confidence: currentConfidence,
                reason: currentReason
            })
        });

        if (!execResp.ok) throw new Error('Failed to fetch dashboard data');
        const result = await execResp.json();
        const data = Array.isArray(result.data) ? result.data : [];
        
        kpiContainer.innerHTML = '';
        if (data.length === 0) {
            chartsContainer.innerHTML = '<p>No data available to generate charts.</p>';
            return;
        }

        // Analyze columns
        const keys = Object.keys(data[0]);
        const numericalCols = [];
        const categoricalCols = [];
        const dateCols = [];

        keys.forEach(k => {
            const lowerK = k.toLowerCase();
            if (lowerK === 'id' || lowerK.endsWith('_id') || lowerK.endsWith('id')) {
                return; // Skip ID columns completely so they don't appear in charts
            }

            let isNum = true;
            let isDate = false;
            for (let i = 0; i < Math.min(data.length, 10); i++) {
                if (data[i][k] !== null && data[i][k] !== '') {
                    if (isNaN(Number(data[i][k]))) isNum = false;
                    if (typeof data[i][k] === 'string' && (data[i][k].includes('-') || data[i][k].includes('/')) && !isNaN(Date.parse(data[i][k]))) isDate = true;
                }
            }
            if (isDate) { dateCols.push(k); }
            else if (isNum) { numericalCols.push(k); }
            else { categoricalCols.push(k); }
        });

        // 1. KPIs
        const totalRows = globalTotalCount > 0 ? globalTotalCount : data.length;
        addKpiCard(kpiContainer, 'Total Records', totalRows);
        
        numericalCols.forEach(numCol => {
            let sum = 0;
            data.forEach(row => sum += Number(row[numCol]) || 0);
            addKpiCard(kpiContainer, `Total ${numCol.replace(/_/g, ' ')}`, sum.toLocaleString(undefined, {maximumFractionDigits: 2}));
        });

        // 2. Charts
        let chartIndex = 0;

        // Intelligently find the top 10 most important categorical columns to chart.
        // We do this by calculating cardinality (unique values).
        // High cardinality (like UUIDs or notes) are bad for charts. We want columns with 1 < unique values < 30.
        const validCategoricalCols = categoricalCols.filter(catCol => {
            const uniqueValues = new Set();
            data.forEach(r => { if(r[catCol]) uniqueValues.add(r[catCol]); });
            return uniqueValues.size > 1 && uniqueValues.size < 30;
        });

        // Loop over the top 10 most meaningful categorical columns
        validCategoricalCols.slice(0, 10).forEach(catCol => {
            if (numericalCols.length > 0) {
                const numCol = numericalCols[0];
                const agg = {};
                data.forEach(r => {
                    const c = r[catCol] || 'Unknown';
                    agg[c] = (agg[c] || 0) + (Number(r[numCol]) || 0);
                });
                createChartCard(chartsContainer, chartIndex++, `Sum of ${numCol.replace(/_/g, ' ')} by ${catCol.replace(/_/g, ' ')}`, 'bar', Object.keys(agg), Object.values(agg));
            } else {
                const agg = {};
                data.forEach(r => {
                    const c = r[catCol] || 'Unknown';
                    agg[c] = (agg[c] || 0) + 1;
                });
                createChartCard(chartsContainer, chartIndex++, `Count by ${catCol.replace(/_/g, ' ')}`, 'doughnut', Object.keys(agg), Object.values(agg));
                createChartCard(chartsContainer, chartIndex++, `${catCol.replace(/_/g, ' ')} Bar Chart`, 'bar', Object.keys(agg), Object.values(agg));
            }
        });

        // Loop over date columns
        dateCols.slice(0, 2).forEach(dCol => {
            const agg = {};
            data.forEach(r => {
                let d = r[dCol];
                if (d) d = String(d).split('T')[0];
                else d = 'Unknown';
                if (d !== 'Unknown') {
                    agg[d] = (agg[d] || 0) + 1;
                }
            });
            const sortedDates = Object.keys(agg).sort();
            const sortedVals = sortedDates.map(d => agg[d]);
            if (sortedDates.length > 0) {
                createChartCard(chartsContainer, chartIndex++, `Records by ${dCol.replace(/_/g, ' ')}`, 'line', sortedDates, sortedVals);
            }
        });

        // Created vs Processed Time (if both exist)
        const createdCol = dateCols.find(c => c.toLowerCase().includes('create'));
        const processedCol = dateCols.find(c => c.toLowerCase().includes('process'));
        if (createdCol && processedCol) {
            let totalDiff = 0;
            let validRows = 0;
            data.forEach(r => {
                if (r[createdCol] && r[processedCol]) {
                    const d1 = new Date(r[createdCol]);
                    const d2 = new Date(r[processedCol]);
                    if (!isNaN(d1) && !isNaN(d2)) {
                        totalDiff += (d2 - d1) / (1000 * 60 * 60 * 24); // difference in days
                        validRows++;
                    }
                }
            });
            if (validRows > 0) {
                const avgDays = (totalDiff / validRows).toFixed(2);
                addKpiCard(kpiContainer, 'Avg Processing Time (Days)', avgDays);
            }
        }

        if (chartIndex === 0 && numericalCols.length > 0) {
            const labels = data.map((_, i) => `Record ${i+1}`);
            const vals = data.map(r => Number(r[numericalCols[0]]) || 0);
            createChartCard(chartsContainer, chartIndex++, `${numericalCols[0].replace(/_/g, ' ')} Values`, 'bar', labels.slice(0,20), vals.slice(0,20));
        }

    } catch(e) {
        console.error("Dashboard error", e);
        chartsContainer.innerHTML = '<p>Error generating dashboard.</p>';
    }
}

function addKpiCard(container, label, value) {
    const card = document.createElement('div');
    card.className = 'kpi-card';
    card.innerHTML = `<span class="kpi-label">${label}</span><span class="kpi-value">${value}</span>`;
    container.appendChild(card);
}

function createChartCard(container, index, title, type, labels, dataPoints) {
    const card = document.createElement('div');
    card.className = 'chart-card';
    card.setAttribute('data-chart-type', (type === 'pie' || type === 'doughnut') ? 'circular' : 'bar');
    card.innerHTML = `<h4 class="chart-title">${title}</h4><div class="chart-wrapper"><canvas id="dashChart_${index}"></canvas></div>`;
    container.appendChild(card);

    const ctx = document.getElementById(`dashChart_${index}`).getContext('2d');
    const bgColors = ['#0f4b8f', '#00c6ff', '#34a853', '#fbbc04', '#ea4335', '#8e44ad', '#e67e22', '#2ecc71', '#16a085', '#d35400', '#2980b9', '#f39c12'];
    
    // Cycle colors if more labels than colors
    const colors = labels.map((_, i) => bgColors[i % bgColors.length]);

    const chart = new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: title,
                data: dataPoints,
                backgroundColor: type === 'line' ? 'rgba(15, 75, 143, 0.1)' : colors,
                borderColor: type === 'line' ? '#0f4b8f' : (type === 'pie' || type === 'doughnut' ? '#fff' : colors),
                borderWidth: type === 'line' ? 3 : 1,
                fill: type === 'line',
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 2000,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: { display: type === 'pie' || type === 'doughnut', position: 'right', labels: { font: { family: "'Inter', sans-serif" } } },
                tooltip: { backgroundColor: 'rgba(15, 75, 143, 0.9)', titleFont: { family: "'Inter', sans-serif" }, bodyFont: { family: "'Inter', sans-serif" }, padding: 12, cornerRadius: 8 }
            },
            scales: type !== 'pie' && type !== 'doughnut' ? {
                x: { grid: { display: false }, ticks: { font: { family: "'Inter', sans-serif" } } },
                y: { grid: { borderDash: [5, 5], color: '#e8ecf4' }, ticks: { font: { family: "'Inter', sans-serif" } } }
            } : {}
        }
    });
    currentCharts.push(chart);
}

let currentChartFilter = 'all';

function filterCharts(filterType) {
    currentChartFilter = filterType;
    
    const allBtn = document.getElementById('chartFilterAll');
    const barBtn = document.getElementById('chartFilterBar');
    const circBtn = document.getElementById('chartFilterCircular');
    
    if (allBtn) allBtn.classList.toggle('active', filterType === 'all');
    if (barBtn) barBtn.classList.toggle('active', filterType === 'bar');
    if (circBtn) circBtn.classList.toggle('active', filterType === 'circular');
    
    const cards = document.querySelectorAll('.chart-card');
    cards.forEach(card => {
        const type = card.getAttribute('data-chart-type');
        if (filterType === 'all') {
            card.style.display = 'block';
        } else if (filterType === 'bar') {
            card.style.display = (type === 'bar') ? 'block' : 'none';
        } else if (filterType === 'circular') {
            card.style.display = (type === 'circular') ? 'block' : 'none';
        }
    });
}

// ==========================================
// REVIEW WORKFLOW FUNCTIONS
// ==========================================

async function sendForReview() {
    if (!currentGeneratedSql || !globalReportData) {
        showStatus('No report data available to send for review.', 'error');
        return;
    }

    const btn = document.getElementById('sendReviewBtn');
    const successMsg = document.getElementById('reviewSuccessMsg');
    
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner-ring" style="width:16px;height:16px;display:inline-block;margin-right:8px;"></div> Sending...';

    try {
        const resp = await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userQuery: currentOriginalQuery || document.getElementById('promptInput').value.trim(),
                sql: currentGeneratedSql,
                summary: currentSummary,
                resultData: JSON.stringify(globalReportData)
            })
        });

        if (resp.ok) {
            btn.style.display = 'none';
            successMsg.style.display = 'flex';
        } else {
            throw new Error('Failed to send report for review.');
        }
    } catch (e) {
        console.error(e);
        showStatus(e.message, 'error');
        btn.disabled = false;
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg><span>Send for review</span>`;
    }
}

function openReportStatus() {
    document.getElementById('reportStatusModal').style.display = 'flex';
    fetchReportStatus();
}

function closeReportStatus() {
    document.getElementById('reportStatusModal').style.display = 'none';
}

async function fetchReportStatus() {
    const tbody = document.getElementById('reportStatusBody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>';
    
    try {
        const resp = await fetch('/api/reviews');
        if (resp.ok) {
            const data = await resp.json();
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: #64748b;">No reports found.</td></tr>';
                return;
            }
            
            // Store reports globally so we can access them when clicking View
            window._allReports = data;
            
            tbody.innerHTML = data.map(r => {
                const userQuery = r.userQuery || r.user_query || "";
                const createdAt = r.createdAt || r.created_at || "";
                const status = r.status || "";
                const updatedAt = r.updatedAt || r.updated_at || "";
                const statusUpper = status.toUpperCase();
                const statusLower = status.toLowerCase();
                return `
                <tr>
                    <td>#${r.id}</td>
                    <td title="${userQuery}" style="max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${userQuery}</td>
                    <td>${new Date(createdAt).toLocaleDateString()}</td>
                    <td>${statusUpper === 'PENDING' ? '-' : new Date(updatedAt || createdAt).toLocaleDateString()}</td>
                    <td><span class="status-badge ${statusLower}">${status}</span></td>
                    <td style="text-align:center;">
                        <button class="secondary-btn" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="openViewReport(${r.id})">View Report</button>
                    </td>
                </tr>
            `}).join('');
        }
    } catch (e) {
        console.error("fetchReportStatus error:", e);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: red;">Error loading status.</td></tr>';
    }
}

async function openViewReport(id) {
    const report = window._allReports.find(r => r.id === id);
    if (!report) return;
    
    closeReportStatus();
    
    // Hide ASK AI textbox and show Back to New Report button
    document.getElementById('askAiContainer').style.display = 'none';
    document.getElementById('newReportBtnContainer').style.display = 'block';
    
    const sch = document.getElementById('registerSampleBtnHeader');
    if (sch) sch.style.display = 'none';
    
    // Reset views
    document.getElementById('statusMessage').style.display = 'none';
    document.getElementById('resultsHeader').style.display = 'none';
    document.getElementById('dataGrid').style.display = 'none';
    if(document.getElementById('dashboardSection')) {
        dashboardLoaded = false;
        document.getElementById('viewTableBtn').classList.add('active');
        document.getElementById('viewChartBtn').classList.remove('active');
        document.getElementById('dashboardSection').style.display = 'none';
    }
    
    // Set global variables
    const generatedSql = report.generatedSql || report.generated_sql || "";
    const summary = report.summary || "";
    const userQuery = report.userQuery || report.user_query || "";
    const status = report.status || "";
    const createdAt = report.createdAt || report.created_at || "";
    const updatedAt = report.updatedAt || report.updated_at || "";
    const rejectionReason = report.rejectionReason || report.rejection_reason || "";
    
    currentGeneratedSql = generatedSql;
    currentSummary = summary;
    currentConfidence = "high";
    currentReason = "Loaded from history.";
    currentOriginalQuery = userQuery;
    currentPage = 1;
    
    // Show original query
    const vrDetails = document.getElementById('viewReportDetails');
    if(vrDetails) vrDetails.style.display = 'block';
    const vrQuery = document.getElementById('viewReportOriginalQuery');
    if(vrQuery) vrQuery.innerText = currentOriginalQuery;
    
    // Start processing UI to show we are loading
    startProcessingUI();
    const startTime = Date.now();
    
    try {
        // Organic loading effect
        await markStepAfter(0, 150);
        await markStepAfter(1, 150);
        await markStepAfter(2, 150);
        await markStepAfter(3, 150);
        await markStepAfter(4, 150);

        let initialSql = currentGeneratedSql.replace(/;+$/, '').trim();
        initialSql = initialSql.replace(/LIMIT\s+\d+/gi, '').trim(); 
        initialSql = initialSql.replace(/OFFSET\s+\d+/gi, '').trim();
        initialSql += ` LIMIT ${PAGE_SIZE + 1} OFFSET 0;`;

        // Execute query to get full pagination
        const execResp = await fetch('/ai/sql/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt:     currentOriginalQuery,
                sql:        initialSql,
                summary:    currentSummary,
                confidence: currentConfidence,
                reason:     currentReason
            })
        });
        
        if (!execResp.ok) throw new Error("Failed to load report data");
        const result = await execResp.json();
        markStep(5); // Fetching results complete

        // Fetch total count for pagination
        let baseSql = currentGeneratedSql.replace(/;+$/, '').trim();
        baseSql = baseSql.replace(/LIMIT\s+\d+/gi, '').trim(); 
        baseSql = baseSql.replace(/OFFSET\s+\d+/gi, '').trim();
        const countSql = `SELECT COUNT(*) AS total_count FROM (${baseSql}) AS temp_count;`;
        
        globalTotalCount = 0;
        try {
            const countResp = await fetch('/ai/sql/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt:     currentOriginalQuery,
                    sql:        countSql,
                    summary:    currentSummary,
                    confidence: currentConfidence,
                    reason:     currentReason
                })
            });
            if (countResp.ok) {
                const countResult = await countResp.json();
                if (countResult.data && countResult.data.length > 0) {
                    const row = countResult.data[0];
                    const countKey = Object.keys(row).find(k => k.toLowerCase().includes('count'));
                    if (countKey) {
                        globalTotalCount = parseInt(row[countKey], 10) || 0;
                    }
                }
            }
        } catch (e) {
            console.error("Failed to fetch total count:", e);
        }

        const latency = ((Date.now() - startTime) / 1000).toFixed(1) + 's';
        await delay(300); // Allow UI to settle

        stopProcessingUI();
        populateAiPanel(
            currentGeneratedSql,
            currentSummary,
            currentConfidence,
            currentReason,
            latency,
            "Cached Report"
        );

        // Update Review Section for View Mode
        const reviewSec = document.getElementById('reviewActionSection');
        if (reviewSec) {
            reviewSec.style.display = 'block';
            const btn = document.getElementById('sendReviewBtn');
            if (btn) btn.style.display = 'none';
            const succMsg = document.getElementById('reviewSuccessMsg');
            if (succMsg) succMsg.style.display = 'none';
            
            const statusDiv = document.getElementById('viewReportStatus');
            if (statusDiv) {
                statusDiv.style.display = 'flex';
                const badge = document.getElementById('viewReportBadge');
                if (badge) {
                    badge.className = `status-badge ${status.toLowerCase()}`;
                    badge.innerText = status;
                }
                const createdDateEl = document.getElementById('viewReportDate');
                if (createdDateEl) {
                    createdDateEl.innerText = new Date(createdAt).toLocaleDateString();
                }
                // Set update date
                const updateDateEl = document.getElementById('viewReportUpdateDate');
                if (status.toUpperCase() !== 'PENDING') {
                    if (updateDateEl) {
                        updateDateEl.style.display = 'block';
                        document.getElementById('viewReportUpdateDateValue').innerText = new Date(updatedAt || createdAt).toLocaleDateString();
                    }
                } else {
                    if (updateDateEl) updateDateEl.style.display = 'none';
                }
            }
        }

        if (status.toUpperCase() === 'REJECTED') {
            document.querySelector('.app-wrapper').classList.add('rejected-theme');
            const rejectReasonEl = document.getElementById('viewReportRejectReason');
            if (rejectReasonEl) {
                rejectReasonEl.style.display = 'block';
                document.getElementById('viewReportRejectReasonValue').innerText = rejectionReason || 'No reason provided';
            }
        } else {
            document.querySelector('.app-wrapper').classList.remove('rejected-theme');
            const rejectReasonEl = document.getElementById('viewReportRejectReason');
            if (rejectReasonEl) rejectReasonEl.style.display = 'none';
        }

        // Process data array and pagination
        const parsedData = Array.isArray(result.data) ? result.data : [];
        let hasNextPage = false;
        let dataToRender = parsedData;
        if (parsedData.length > PAGE_SIZE) {
            hasNextPage = true;
            dataToRender = parsedData.slice(0, PAGE_SIZE); 
        }

        if (dataToRender.length > 0) {
            globalReportData = dataToRender;
            buildTable(dataToRender);
            updatePaginationUI(hasNextPage);
            document.getElementById('resultsHeader').style.display = 'flex';
            document.getElementById('dataGrid').style.display = 'block';
        } else {
            showStatus('Query executed successfully, but returned 0 rows.', 'info');
        }

    } catch (err) {
        console.error('Error:', err);
        showStatus(`Error loading report: ${err.message}`, 'error');
        stopProcessingUI();
        const panel = document.getElementById('rightCol');
        if (panel) panel.style.display = 'none';
    }
}

// Lims Admin Functions
async function fetchPendingReviews() {
    const list = document.getElementById('pendingReviewsList');
    const compList = document.getElementById('completedReviewsList');
    list.innerHTML = '<p style="color: #64748b; text-align: center;">Loading queue...</p>';
    if (compList) compList.innerHTML = '<p style="color: #64748b; text-align: center;">Loading...</p>';
    document.getElementById('emptyDetailPanel').style.display = 'flex';
    document.getElementById('reviewDetailPanel').style.display = 'none';
    currentSelectedReviewId = null;

    try {
        const resp = await fetch('/api/reviews');
        if (resp.ok) {
            const data = await resp.json();
            console.log("Lims Admin Reviews Data:", data); // Log to dev console
            window._limsReports = data;
            
            const pendingData = data.filter(r => r.status && r.status.toUpperCase() === 'PENDING');
            const completedData = data.filter(r => !r.status || r.status.toUpperCase() !== 'PENDING');
            
            if (pendingData.length === 0) {
                list.innerHTML = '<div style="text-align:center; padding: 2rem; color: #64748b;">No pending reviews.</div>';
            } else {
                list.innerHTML = pendingData.map(r => {
                    const userQuery = r.userQuery || r.user_query || "";
                    const generatedSql = r.generatedSql || r.generated_sql || "";
                    const resultData = r.resultData || r.result_data || "[]";
                    const createdAt = r.createdAt || r.created_at || "";
                    return `
                    <div class="review-item" onclick="selectReview(${r.id})" id="review-item-${r.id}">
                        <div class="review-item-header">
                            <span class="review-item-title">Report #${r.id}</span>
                            <span class="review-item-date">${new Date(createdAt).toLocaleDateString()}</span>
                        </div>
                        <div class="review-item-query">${userQuery}</div>
                        <div style="display:none;" id="review-data-${r.id}" data-sql="${encodeURIComponent(generatedSql)}" data-query="${encodeURIComponent(userQuery)}" data-results="${encodeURIComponent(resultData)}"></div>
                    </div>
                `}).join('');
            }
            
            if (compList) {
                if (completedData.length === 0) {
                    compList.innerHTML = '<div style="text-align:center; padding: 2rem; color: #64748b;">No completed reviews.</div>';
                } else {
                    compList.innerHTML = completedData.map(r => {
                        const userQuery = r.userQuery || r.user_query || "";
                        const generatedSql = r.generatedSql || r.generated_sql || "";
                        const resultData = r.resultData || r.result_data || "[]";
                        const createdAt = r.createdAt || r.created_at || "";
                        const updatedAt = r.updatedAt || r.updated_at || "";
                        const status = r.status || "";
                        const statusLower = status.toLowerCase();
                        return `
                        <div class="review-item" onclick="selectReview(${r.id})" id="review-item-${r.id}">
                            <div class="review-item-header">
                                <span class="review-item-title">Report #${r.id}</span>
                            </div>
                            <div class="review-item-query">${userQuery}</div>
                            <div style="margin-top: 10px; display:flex; flex-direction:column; gap:6px;">
                                <div><span class="status-badge ${statusLower}">${status}</span></div>
                                <div style="font-size: 0.82rem; color: var(--text-muted);">Created on: ${new Date(createdAt).toLocaleDateString()}</div>
                                <div style="font-size: 0.82rem; color: var(--text-muted);">Reviewed on: ${new Date(updatedAt || createdAt).toLocaleDateString()}</div>
                            </div>
                            <div style="display:none;" id="review-data-${r.id}" data-sql="${encodeURIComponent(generatedSql)}" data-query="${encodeURIComponent(userQuery)}" data-results="${encodeURIComponent(resultData)}"></div>
                        </div>
                    `}).join('');
                }
            }
        }
    } catch (e) {
        console.error("fetchPendingReviews error:", e);
        list.innerHTML = '<p style="color: red;">Error loading reviews.</p>';
        if (compList) compList.innerHTML = '<p style="color: red;">Error loading reviews.</p>';
    }
}

function selectReview(id) {
    // UI selection
    document.querySelectorAll('.review-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`review-item-${id}`).classList.add('active');
    
    currentSelectedReviewId = id;
    
    // Get data
    const dataEl = document.getElementById(`review-data-${id}`);
    const query = decodeURIComponent(dataEl.getAttribute('data-query'));
    const sql = decodeURIComponent(dataEl.getAttribute('data-sql'));
    let results = [];
    try {
        results = JSON.parse(decodeURIComponent(dataEl.getAttribute('data-results')));
    } catch (e) { console.error("Failed to parse results JSON", e); }
    
    // Update badge and buttons if completed
    const report = window._limsReports ? window._limsReports.find(r => r.id === id) : null;
    const status = report && report.status ? report.status.toUpperCase() : "";
    if (report && status !== 'PENDING') {
        document.getElementById('rejectBtn').style.display = 'none';
        document.getElementById('approveBtn').style.display = 'none';
        document.getElementById('detailStatusBadge').className = `status-badge ${report.status.toLowerCase()}`;
        document.getElementById('detailStatusBadge').innerText = report.status;
    } else {
        document.getElementById('rejectBtn').style.display = 'inline-block';
        document.getElementById('approveBtn').style.display = 'inline-block';
        document.getElementById('detailStatusBadge').className = `status-badge pending`;
        document.getElementById('detailStatusBadge').innerText = 'PENDING';
    }
    
    // Populate details
    document.getElementById('detailUserQuery').innerText = query;
    document.getElementById('detailSql').innerText = sql;
    
    // Render mini table
    const thead = document.getElementById('detailDataHead');
    const tbody = document.getElementById('detailDataBody');
    thead.innerHTML = '';
    tbody.innerHTML = '';
    
    if (results && results.length > 0) {
        const cols = Object.keys(results[0]);
        thead.innerHTML = `<tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>`;
        
        results.slice(0, 50).forEach(row => {
            const tr = document.createElement('tr');
            cols.forEach(c => {
                const td = document.createElement('td');
                td.innerText = row[c] !== null && row[c] !== undefined ? row[c] : '';
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        if (results.length > 50) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="${cols.length}" style="text-align:center; font-style:italic; color:#64748b;">Showing first 50 rows of snapshot</td>`;
            tbody.appendChild(tr);
        }
    } else {
        tbody.innerHTML = '<tr><td style="text-align:center;">No data in snapshot.</td></tr>';
    }
    
    // Fetch total row count
    document.getElementById('detailRowCount').innerText = ' (Loading...)';
    let countSql = sql.replace(/;+$/, '').trim().replace(/LIMIT\s+\d+/gi, '').replace(/OFFSET\s+\d+/gi, '');
    countSql = `SELECT COUNT(*) AS total_count FROM (${countSql}) AS temp_count;`;
    fetch('/ai/sql/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query, sql: countSql, summary: '', confidence: 'high', reason: '' })
    }).then(r => r.json()).then(res => {
        if (res.data && res.data.length > 0) {
            const cKey = Object.keys(res.data[0]).find(k => k.toLowerCase().includes('count'));
            if (cKey) document.getElementById('detailRowCount').innerText = `(${res.data[0][cKey]} total rows)`;
        }
    }).catch(e => { document.getElementById('detailRowCount').innerText = ''; });
    
    // Switch panels
    document.getElementById('emptyDetailPanel').style.display = 'none';
    document.getElementById('reviewDetailPanel').style.display = 'flex';
}

async function approveCurrentReview() {
    if (!currentSelectedReviewId) return;
    
    const btn = document.getElementById('approveBtn');
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = 'Approving...';
    
    try {
        const resp = await fetch(`/api/reviews/${currentSelectedReviewId}/approve`, {
            method: 'POST'
        });
        
        if (resp.ok) {
            // Remove from list
            const item = document.getElementById(`review-item-${currentSelectedReviewId}`);
            if (item) item.remove();
            
            document.getElementById('emptyDetailPanel').style.display = 'flex';
            document.getElementById('reviewDetailPanel').style.display = 'none';
            
            // Check if queue empty
            fetchPendingReviews();
        } else {
            throw new Error('Approval failed');
        }
    } catch (e) {
        alert('Error approving report: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

function openRejectDialog() {
    if (!currentSelectedReviewId) return;
    document.getElementById('rejectReasonInput').value = '';
    document.getElementById('rejectModal').style.display = 'flex';
}

function closeRejectDialog() {
    document.getElementById('rejectModal').style.display = 'none';
}

async function submitRejectReview() {
    if (!currentSelectedReviewId) return;
    
    const reason = document.getElementById('rejectReasonInput').value.trim();
    if (!reason) {
        alert('Please provide a reason for rejection.');
        return;
    }
    
    const btn = document.querySelector('#rejectModal .primary-btn');
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = 'Submitting...';
    
    try {
        const resp = await fetch(`/api/reviews/${currentSelectedReviewId}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: reason })
        });
        
        if (resp.ok) {
            closeRejectDialog();
            
            // Remove from list
            const item = document.getElementById(`review-item-${currentSelectedReviewId}`);
            if (item) item.remove();
            
            document.getElementById('emptyDetailPanel').style.display = 'flex';
            document.getElementById('reviewDetailPanel').style.display = 'none';
            
            // Check if queue empty
            fetchPendingReviews();
        } else {
            throw new Error('Rejection failed');
        }
    } catch (e) {
        alert('Error rejecting report: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}



// --- Sample Creation Logic ---
function openSampleCreation() {
    document.getElementById('askAiContainer').style.display = 'none';
    const repBtn = document.getElementById('newReportBtnContainer');
    if (repBtn) repBtn.style.display = 'none';
    const vrDetails = document.getElementById('viewReportDetails');
    if (vrDetails) vrDetails.style.display = 'none';
    document.getElementById('statusMessage').style.display = 'none';
    document.getElementById('resultsHeader').style.display = 'none';
    document.getElementById('dataGrid').style.display = 'none';
    const dash = document.getElementById('dashboardSection');
    if (dash) dash.style.display = 'none';
    const rightCol = document.getElementById('rightCol');
    if (rightCol) rightCol.style.display = 'none';

    document.getElementById('sampleForm').reset();
    
    const ch = document.getElementById('registerSampleBtnHeader');
    if (ch) ch.style.display = 'none';
    const chatFab = document.getElementById('chatFabBtn');
    if (chatFab) chatFab.style.display = 'none';
    const successMsg = document.getElementById('saveSuccessMsg');
    if (successMsg) successMsg.style.display = 'none';

    // Show form action buttons
    const actions = document.getElementById('sampleFormActions');
    if (actions) actions.style.display = 'flex';

    // Reset and show mic ripples animation
    const ripples = document.getElementById('micRipples');
    if (ripples) ripples.style.display = 'block';

    // Change page title to Register Sample and hide Report Status button
    const appTitle = document.querySelector('.app-title');
    if (appTitle) appTitle.innerText = "Register Sample";
    const reportStatusBtn = document.getElementById('reportStatusBtn');
    if (reportStatusBtn) reportStatusBtn.style.display = 'none';

    document.getElementById('sampleCreationSection').style.display = 'block';
}

function closeSampleCreation() {
    document.getElementById('sampleCreationSection').style.display = 'none';
    resetToGenerate();
    const ch = document.getElementById('registerSampleBtnHeader');
    if (ch) ch.style.display = 'flex';
}

let recognition;
let isRecording = false;
let recordedText = "";

function toggleVoiceExtraction() {
    if (!('webkitSpeechRecognition' in window)) {
        alert("Your browser does not support Speech Recognition. Please use Chrome.");
        return;
    }
    
    // Hide success message and show form actions when starting voice extraction
    const successMsg = document.getElementById('saveSuccessMsg');
    if (successMsg) successMsg.style.display = 'none';
    const actions = document.getElementById('sampleFormActions');
    if (actions) actions.style.display = 'flex';
    
    const micBtn = document.getElementById('micBtn');
    const ripples = document.getElementById('micRipples');
    const statusText = document.getElementById('micStatusText');
    const micIcon = document.getElementById('micIcon');
    
    if (isRecording) {
        if (recognition) recognition.stop();
        return;
    }
    
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onstart = function() {
        isRecording = true;
        recordedText = "";
        ripples.style.display = 'block';
        micBtn.style.background = 'var(--red)';
        micBtn.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.6)';
        
        // Change to Pause icon
        const wrapper = document.getElementById('micIconWrapper');
        if(wrapper) {
            wrapper.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
        }

        statusText.innerHTML = "Listening... <span style='font-size:0.8rem;color:var(--sl-blue);cursor:pointer;' onclick='toggleVoiceExtraction()'>[Stop]</span>";
    };
    
    recognition.onresult = function(event) {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        recordedText += finalTranscript;
        
        // Show up to ~70 words
        let words = (recordedText + interimTranscript).trim().split(/\s+/);
        let displayStr = words.slice(-70).join(' ');
        if(words.length > 70) displayStr = "..." + displayStr;
        
        statusText.innerText = displayStr;
    };
    
    recognition.onend = function() {
        isRecording = false;
        ripples.style.display = 'none';
        micBtn.style.background = 'var(--sl-blue)';
        micBtn.style.boxShadow = '0 4px 15px rgba(15, 75, 143, 0.3)';
        
        // Restore Mic icon
        const wrapper = document.getElementById('micIconWrapper');
        if(wrapper) {
            wrapper.innerHTML = '<svg id="micIcon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>';
        }
        statusText.innerText = "Processing voice data...";
        if (recordedText.trim().length > 0) {
            extractSampleDataFromText(recordedText);
        } else {
            statusText.innerText = "No voice detected. Click to try again.";
        }
    };
    
    recognition.onerror = function(event) {
        isRecording = false;
        ripples.style.display = 'none';
        micBtn.style.background = 'var(--sl-blue)';
        statusText.innerText = "Error picking up voice. Try again.";
    };
    
    recognition.start();
}

async function extractSampleDataFromText(speechText) {
    if (!speechText) return;

    const statusText = document.getElementById('micStatusText');
    statusText.innerHTML = '<div class="spinner-ring" style="width:14px;height:14px;border-color:rgba(15,75,143,0.3);border-top-color:var(--sl-blue);display:inline-block;vertical-align:middle;margin-right:6px;"></div> Extracting fields via AI...';

    const micWrapper = document.getElementById('micIconWrapper');
    const originalMicHTML = micWrapper ? micWrapper.innerHTML : '';
    if (micWrapper) {
        micWrapper.innerHTML = `
            <style>
                @keyframes pulseAi { 0%, 100% { transform: scale(0.8); opacity: 0.6; } 50% { transform: scale(1.2); opacity: 1; } }
            </style>
            <div style="display:flex; gap:4px; align-items:center;">
                <div style="width:8px;height:8px;background:#00c6ff;border-radius:50%;animation:pulseAi 1.5s infinite;animation-delay:0s;box-shadow:0 0 8px #00c6ff;"></div>
                <div style="width:8px;height:8px;background:#fbc2eb;border-radius:50%;animation:pulseAi 1.5s infinite;animation-delay:0.3s;box-shadow:0 0 8px #fbc2eb;"></div>
                <div style="width:8px;height:8px;background:#a18cd1;border-radius:50%;animation:pulseAi 1.5s infinite;animation-delay:0.6s;box-shadow:0 0 8px #a18cd1;"></div>
            </div>
        `;
    }

    try {
        const resp = await fetch('/ai/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: speechText
        });

        if (!resp.ok) throw new Error('Failed to contact AI.');

        const textResp = await resp.text();
        let jsonStr = textResp.trim();
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
        } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/```/g, '').trim();
        }

        const data = JSON.parse(jsonStr);
        const fields = data.fields || data;

        if (fields.inventoryId) document.getElementById('sf_inventoryId').value = fields.inventoryId;
        if (fields.materialCode) document.getElementById('sf_materialCode').value = fields.materialCode;
        if (fields.supplierCode) document.getElementById('sf_supplierCode').value = fields.supplierCode;
        if (fields.catalog) document.getElementById('sf_catalog').value = fields.catalog;
        if (fields.materialName) document.getElementById('sf_materialName').value = fields.materialName;
        if (fields.supplierName) document.getElementById('sf_supplierName').value = fields.supplierName;
        if (fields.amountLeft) document.getElementById('sf_amountLeft').value = fields.amountLeft;
        if (fields.concentration) document.getElementById('sf_concentration').value = fields.concentration;
        if (fields.owner) document.getElementById('sf_owner').value = fields.owner;
        if (fields.manufacturer) document.getElementById('sf_manufacturer').value = fields.manufacturer;
        if (fields.lot) document.getElementById('sf_lot').value = fields.lot;
        if (fields.expiry) {
            const d = new Date(fields.expiry);
            if (!isNaN(d.valueOf())) {
                document.getElementById('sf_expiry').value = d.toISOString().split('T')[0];
            }
        }

        statusText.innerHTML = '<span style="color:var(--green)">✨ Success! Fields populated.</span>';
        if (micWrapper) micWrapper.innerHTML = originalMicHTML;
        setTimeout(() => {
            statusText.innerText = "Click the mic to speak the sample details...";
        }, 3000);

    } catch (e) {
        console.error('AI Extraction Error:', e);
        statusText.innerHTML = '<span style="color:var(--red)">Failed to extract data.</span>';
        if (micWrapper) micWrapper.innerHTML = originalMicHTML;
        setTimeout(() => {
            statusText.innerText = "Click the mic to speak the sample details...";
        }, 3000);
    }
}

function saveSample(e) {
    e.preventDefault();
    const inventoryId = document.getElementById('sf_inventoryId').value.trim();
    const materialName = document.getElementById('sf_materialName').value.trim();
    
    if (!inventoryId || !materialName) {
        let missing = [];
        if (!inventoryId) missing.push("Inventory ID");
        if (!materialName) missing.push("Material Name");
        const alertMsg = `${missing.join(" and ")} ${missing.length > 1 ? "are" : "is"} mandatory.`;
        
        alert(alertMsg);
        
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(alertMsg);
            window.speechSynthesis.speak(utterance);
        }
        return;
    }

    const btn = document.querySelector('#sampleForm .primary-btn');
    const origText = btn.innerHTML;
    btn.innerHTML = 'Saving...';
    btn.disabled = true;

    const successMsg = document.getElementById('saveSuccessMsg');
    if (successMsg) successMsg.style.display = 'none';

    setTimeout(() => {
        btn.innerHTML = origText;
        btn.disabled = false;
        if (successMsg) successMsg.style.display = 'flex';
        
        // Hide form actions after successful save until voice extraction restarts
        const actions = document.getElementById('sampleFormActions');
        if (actions) actions.style.display = 'none';
    }, 800);
}
