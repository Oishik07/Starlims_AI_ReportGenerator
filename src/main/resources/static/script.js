let globalReportData = null;

async function generateReport() {
    const promptValue = document.getElementById('promptInput').value.trim();
    const btn = document.getElementById('generateBtn');
    const btnText = document.getElementById('btnText');
    const spinner = document.getElementById('btnSpinner');
    const statusMsg = document.getElementById('statusMessage');

    // UI Panels
    const resultsHeader = document.getElementById('resultsHeader');
    const dataGrid = document.getElementById('dataGrid');

    if (!promptValue) {
        showStatus('Please describe the report parameters before generating.', 'error');
        return;
    }

    // Limit checks
    const wordCount = promptValue.split(/\s+/).length;
    if (wordCount > 100 || promptValue.length > 1000) {
        showStatus(`Query too large. Words: ${wordCount}/100. Characters: ${promptValue.length}/1000.`, 'error');
        return;
    }

    // --- Loading State ---
    btn.disabled = true;
    btnText.innerText = "Synthesizing...";
    spinner.style.display = "block";

    statusMsg.style.display = "none";
    resultsHeader.style.display = "none";
    dataGrid.style.display = "none";

    try {
        // --- Execute Request ---
        const response = await fetch('/ai/generateReport', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: promptValue })
        });

        if (!response.ok) {
            throw new Error(`Connection Error: HTTP ${response.status}`);
        }

        // --- Robust Parsing ---
        const rawJson = await response.text();
        let parsedData = [];

        try {
            parsedData = JSON.parse(rawJson);
        } catch(e) {
            throw new Error("The backend returned an invalid data format.");
        }

        console.log("Database Backend Response:", parsedData);

        // FIX: Extract Array if backend wrapped it in an Object map
        if (parsedData && !Array.isArray(parsedData)) {
            for (let key in parsedData) {
                if (Array.isArray(parsedData[key])) {
                    parsedData = parsedData[key];
                    break;
                }
            }
        }

        // --- Render Data ---
        if (Array.isArray(parsedData) && parsedData.length > 0) {
            globalReportData = parsedData; // Save to global for Excel
            buildTable(parsedData);

            // Soft animated reveal
            resultsHeader.style.display = "flex";
            dataGrid.style.display = "block";
        } else {
            showStatus('The AI engine executed the query successfully, but returned 0 rows.', 'info');
        }

    } catch (error) {
        console.error('System Error:', error);
        showStatus(`Execution Failed: ${error.message} (Is the backend running?)`, 'error');
    } finally {
        // --- Restore UI ---
        btn.disabled = false;
        btnText.innerText = "Generate Report";
        spinner.style.display = "none";
    }
}

// Builds the horizontal Excel-style Starlims HTML table
function buildTable(dataArray) {
    const tableHead = document.getElementById('dataHead');
    const tableBody = document.getElementById('dataBody');
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';

    // Dynamically find all columns across all rows
    let columns = new Set();
    dataArray.forEach(row => {
        if(row && typeof row === 'object') {
            Object.keys(row).forEach(key => columns.add(key));
        }
    });
    const colArray = Array.from(columns);

    // Build Table Header (Thead)
    const trHead = document.createElement('tr');
    colArray.forEach(headerText => {
        const th = document.createElement('th');
        th.innerText = headerText.replace(/_/g, ' '); // Clean snake_case visually
        trHead.appendChild(th);
    });
    tableHead.appendChild(trHead);

    // Build Table Body (Tbody)
    dataArray.forEach(row => {
        const trBody = document.createElement('tr');

        colArray.forEach(colName => {
            const td = document.createElement('td');
            let cellValue = row[colName];

            // Fallback for missing or null columns
            if (cellValue === undefined || cellValue === null) {
                cellValue = '';
            }

            // Handle nested objects
            if (typeof cellValue === 'object') {
                cellValue = JSON.stringify(cellValue);
            }

            // Truncation logic with hover tooltip
            const span = document.createElement('span');
            span.className = 'lims-data-cell';
            span.title = String(cellValue); // Hover to view full text
            span.innerText = String(cellValue);

            td.appendChild(span);
            trBody.appendChild(td);
        });

        tableBody.appendChild(trBody);
    });
}

function showStatus(message, type) {
    const statusBox = document.getElementById('statusMessage');
    statusBox.innerText = message;
    statusBox.style.display = 'block';
    if(type === 'error') {
        statusBox.style.backgroundColor = '#ffebe6';
        statusBox.style.color = '#bf2600';
        statusBox.style.border = '1px solid #ffbdad';
    } else {
        statusBox.style.backgroundColor = '#e6fcff';
        statusBox.style.color = '#0065ff';
        statusBox.style.border = '1px solid #b3d4ff';
    }
}

function exportToExcel() {
    if (!globalReportData || globalReportData.length === 0) return;

    // Flatten data to pure strings so Excel formatting works
    const flatData = globalReportData.map(row => {
        let cleanRow = {};
        for (const [key, value] of Object.entries(row)) {
            if (typeof value === 'object' && value !== null) {
                cleanRow[key] = JSON.stringify(value, null, 2);
            } else {
                cleanRow[key] = value;
            }
        }
        return cleanRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(flatData);

    // --- ADDED: Make the first row (headings) bold ---
    // The range of the sheet tells us how many columns there are
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for(let C = range.s.c; C <= range.e.c; ++C) {
        // Find the cell object for the first row (R:0 is the header)
        const address = XLSX.utils.encode_cell({c:C, r:0});
        if(!worksheet[address]) continue;

        // Add bold style
        // Note: Full styling requires the SheetJS Pro version or xlsx-js-style module,
        // but this raw object injection often works for basic bolding in modern Excel.
        worksheet[address].s = {
            font: { bold: true }
        };
    }
    // --------------------------------------------------

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "LIMS Report");

    const colWidths = Object.keys(flatData[0] || {}).map(() => ({ wch: 25 }));
    worksheet['!cols'] = colWidths;

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `STARLIMS_Generated_Report_${dateStr}.xlsx`);
}

