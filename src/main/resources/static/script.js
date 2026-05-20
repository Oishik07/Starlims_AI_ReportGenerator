let globalReportData = null;
let currentGeneratedSql = "";
let currentSummary = "";
let currentConfidence = "";
let currentReason = "";
let currentPage = 1;
let globalTotalCount = 0;
const PAGE_SIZE = 10;

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
        const panel = document.getElementById('aiPanel');
        if (panel) panel.style.display = 'none';
    } finally {
        btn.disabled          = false;
        btnText.innerText     = 'Generate Report';
        spinner.style.display = 'none';
    }
}

// ── Processing UI helpers ─────────────────────────────────────

function startProcessingUI() {
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
    const aiPanel   = document.getElementById('aiPanel');
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
