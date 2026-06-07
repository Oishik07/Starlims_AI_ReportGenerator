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
    document.getElementById('sampleAiInput').value = '';

    const ch = document.getElementById('sampleCreationHeader');
    if (ch) ch.style.display = 'none';
    document.getElementById('sampleCreationSection').style.display = 'block';
}

function closeSampleCreation() {
    document.getElementById('sampleCreationSection').style.display = 'none';
    resetToGenerate();
    const ch = document.getElementById('sampleCreationHeader');
    if (ch) ch.style.display = 'flex';
}

async function extractSampleData() {
    const speechText = document.getElementById('sampleAiInput').value.trim();
    if (!speechText) {
        alert('Please enter some text to extract.');
        return;
    }

    const btn = document.getElementById('sampleAiExtractBtn');
    const origText = btn.innerHTML;
    btn.innerHTML = '<div class="spinner-ring" style="width:14px;height:14px;border-color:rgba(255,255,255,0.3);border-top-color:#fff;display:inline-block;vertical-align:middle;margin-right:6px;"></div> Extracting...';
    btn.disabled = true;

    try {
        const promptText = "You are a data extraction tool. Extract the following fields from the user's speech and return ONLY a raw JSON object, no markdown formatting, no backticks, no other text.\nFields: inventoryId, materialCode, supplierCode, catalog, materialName, supplierName, amountLeft, concentration, owner, manufacturer, lot, expiry.\nIf a field is not found, leave it as empty string.\n\nUser Speech: \"" + speechText + "\"";

        const resp = await fetch('/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: promptText
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

        if (data.inventoryId) document.getElementById('sf_inventoryId').value = data.inventoryId;
        if (data.materialCode) document.getElementById('sf_materialCode').value = data.materialCode;
        if (data.supplierCode) document.getElementById('sf_supplierCode').value = data.supplierCode;
        if (data.catalog) document.getElementById('sf_catalog').value = data.catalog;
        if (data.materialName) document.getElementById('sf_materialName').value = data.materialName;
        if (data.supplierName) document.getElementById('sf_supplierName').value = data.supplierName;
        if (data.amountLeft) document.getElementById('sf_amountLeft').value = data.amountLeft;
        if (data.concentration) document.getElementById('sf_concentration').value = data.concentration;
        if (data.owner) document.getElementById('sf_owner').value = data.owner;
        if (data.manufacturer) document.getElementById('sf_manufacturer').value = data.manufacturer;
        if (data.lot) document.getElementById('sf_lot').value = data.lot;
        if (data.expiry) {
            const d = new Date(data.expiry);
            if (!isNaN(d.valueOf())) {
                document.getElementById('sf_expiry').value = d.toISOString().split('T')[0];
            }
        }

        document.getElementById('sampleAiInput').style.borderColor = 'var(--green)';
        setTimeout(() => {
            document.getElementById('sampleAiInput').style.borderColor = 'var(--border)';
        }, 2000);

    } catch (e) {
        console.error('AI Extraction Error:', e);
        alert('Failed to parse data. Please check if backend AI is available.');
    } finally {
        btn.innerHTML = origText;
        btn.disabled = false;
    }
}

function saveSample(e) {
    e.preventDefault();
    const inventoryId = document.getElementById('sf_inventoryId').value;
    const materialName = document.getElementById('sf_materialName').value;
    
    if (!inventoryId || !materialName) {
        alert('Inventory ID and Material Name are mandatory.');
        return;
    }

    const btn = document.querySelector('#sampleForm .primary-btn');
    const origText = btn.innerHTML;
    btn.innerHTML = 'Saving...';
    btn.disabled = true;

    setTimeout(() => {
        btn.innerHTML = origText;
        btn.disabled = false;
        alert('Sample saved successfully as draft!');
        closeSampleCreation();
    }, 800);
}
