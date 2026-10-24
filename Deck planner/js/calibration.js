// CALIBRATION (persists to localStorage; enables all action buttons incl. states)
var calibrationHudOriginalHTML = document.getElementById('calibrationHud') ? document.getElementById('calibrationHud').innerHTML : '';
var CALIB_KEY = 'deckCalibrationPoints';

function storageGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
function storageSet(key, value) { try { localStorage.setItem(key, value); return true; } catch (e) { return false; } }

function updateHud() {
    ['step1', 'step2', 'step3', 'step4'].forEach(function (id, idx) {
        var el = document.getElementById(id); if (!el) return;
        el.className = 'calib-step';
        if (idx < state.step) el.classList.add('done');
        else if (idx === state.step) el.classList.add('active');
    });
}
function enableButtons() {
    document.getElementById('btnLoadExcel').disabled = false;
    document.getElementById('btnExportPDF').disabled = false;
    document.getElementById('btnPrintSummary').disabled = false;
    var ba = document.getElementById('btnAddManual'); if (ba) ba.disabled = false;
    var bs = document.getElementById('btnStates'); if (bs) bs.disabled = false;
}
function skipCalibration() {
    state.calibrated = true; canvas.classList.remove('calibrating');
    document.getElementById('calibrationHud').classList.remove('visible');
    enableButtons(); draw();
}
function restoreHud() {
    var hud = document.getElementById('calibrationHud');
    if (calibrationHudOriginalHTML) hud.innerHTML = calibrationHudOriginalHTML;
    hud.classList.add('visible'); canvas.classList.add('calibrating'); updateHud();
}
function applySavedCalibration() {
    var p = state.points; if (!p || !p.minX || !p.maxX || !p.maxY || !p.minY) return;
    var ppmX = (p.maxX.imgX - p.minX.imgX) / DECK_W, ppmY = (p.minY.imgY - p.maxY.imgY) / DECK_H;
    state.ppm = (ppmX + ppmY) / 2;
    var cx = (DECK_COORDS.minX + DECK_COORDS.maxX) / 2, cy = (DECK_COORDS.minY + DECK_COORDS.maxY) / 2;
    state.panX = canvas.width / 2 - cx * state.ppm; state.panY = canvas.height / 2 + cy * state.ppm;
    state.calibrated = true; canvas.classList.remove('calibrating');
    document.getElementById('calibrationHud').classList.remove('visible');
    enableButtons(); draw();
}
function finishCalibration() {
    var p = state.points;
    if (!p.minX || !p.maxX || !p.maxY || !p.minY) { alert('Ошибка калибровки'); return; }
    var ppmX = (p.maxX.imgX - p.minX.imgX) / DECK_W, ppmY = (p.minY.imgY - p.maxY.imgY) / DECK_H;
    state.ppm = (ppmX + ppmY) / 2;
    var cx = (DECK_COORDS.minX + DECK_COORDS.maxX) / 2, cy = (DECK_COORDS.minY + DECK_COORDS.maxY) / 2;
    state.panX = canvas.width / 2 - cx * state.ppm; state.panY = canvas.height / 2 + cy * state.ppm;
    state.calibrated = true; canvas.classList.remove('calibrating');
    document.getElementById('calibrationHud').classList.remove('visible');
    enableButtons(); draw();
    var ok = storageSet(CALIB_KEY, JSON.stringify(p));
    if (typeof showToast === 'function') showToast(ok ? 'Калибровка сохранена в память — больше не понадобится' : 'Калибровка выполнена', ok ? 'ok' : 'warn');
}