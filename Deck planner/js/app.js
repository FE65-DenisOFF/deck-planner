// AUTO-LOAD scheme + calibration + deck state (autosave) from browser memory.
var SCHEME_KEY = 'deckSchemeDataURL';

function storageGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
function storageSet(key, value) { try { localStorage.setItem(key, value); return true; } catch (e) { return false; } }

function showToast(message, type) {
    try {
        var colors = { ok: '#22c55e', warn: '#f59e0b', err: '#ef4444', info: '#3b82f6' };
        var t = document.createElement('div'); t.textContent = message;
        t.style.cssText = 'position:fixed; left:50%; bottom:28px; transform:translateX(-50%) translateY(18px); opacity:0; z-index:3000; pointer-events:none; max-width:80vw; padding:11px 18px; border-radius:10px; font-size:0.86rem; line-height:1.35; color:#fff; background:rgba(13,17,23,0.96); border:1px solid ' + (colors[type] || colors.info) + '; box-shadow:0 10px 30px rgba(0,0,0,0.55); backdrop-filter:blur(6px); transition:opacity .35s ease, transform .35s ease; text-align:center;';
        document.body.appendChild(t);
        requestAnimationFrame(function () { requestAnimationFrame(function () { t.style.opacity = '1'; t.style.transform = 'translateX(-50%) translateY(0)'; }); });
        setTimeout(function () { t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(18px)'; setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 400); }, 3600);
    } catch (e) {}
}

function loadSchemeFromDataURL(dataURL, fromMemory) {
    var img = new Image();
    img.onload = function () { deckImage = img; afterSchemeLoaded(fromMemory); };
    img.onerror = function () { showToast('Не удалось прочитать сохранённую схему — загрузите файл заново', 'warn'); };
    img.src = dataURL;
}
function afterSchemeLoaded(fromMemory) {
    var saved = null, raw = storageGet('deckCalibrationPoints');
    if (raw) { try { saved = JSON.parse(raw); } catch (e) { saved = null; } }
    if (!saved && (typeof DECK_CALIBRATION !== 'undefined') && DECK_CALIBRATION) saved = DECK_CALIBRATION;
    if (saved && saved.minX && saved.maxX && saved.maxY && saved.minY) {
        state.points = saved; applySavedCalibration();
        if (fromMemory) showToast('Схема и калибровка загружены из памяти', 'ok');
    } else {
        state.calibrated = false; state.step = 0; state.points = {}; restoreHud(); resetView();
        if (fromMemory) showToast('Схема загружена — откалибруйте один раз', 'info');
    }
}

window.addEventListener('DOMContentLoaded', function () {
    canvas = document.getElementById('deckCanvas'); ctx = canvas.getContext('2d'); wrap = document.getElementById('deckView');
    var hud = document.getElementById('calibrationHud'); if (hud) hud.classList.remove('visible'); canvas.classList.remove('calibrating');
    resizeCanvas(); setupEvents();
    document.getElementById('sidebarToggleBtn').addEventListener('click', toggleSidebar);
    var cm = document.getElementById('contextMenu'); cm.addEventListener('mousedown', function (e) { e.stopPropagation(); }); cm.addEventListener('click', function (e) { e.stopPropagation(); });
    var em = document.getElementById('emptyContextMenu'); if (em) { em.addEventListener('mousedown', function (e) { e.stopPropagation(); }); em.addEventListener('click', function (e) { e.stopPropagation(); }); }

    // Restore the whole deck (manifest + placement) from autosave; fall back to legacy manual-only.
    var autoLoaded = (typeof loadDeckAutosave === 'function') ? loadDeckAutosave() : false;
    if (!autoLoaded && typeof loadManualFromStorage === 'function') loadManualFromStorage();
    updateStats(); renderList();

    var savedScheme = storageGet(SCHEME_KEY);
    if (savedScheme) loadSchemeFromDataURL(savedScheme, true); else draw();
});

document.getElementById('deckImageInput').addEventListener('change', function (e) {
    var file = e.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function (evt) {
        var dataURL = evt.target.result; var remembered = storageSet(SCHEME_KEY, dataURL);
        deckImage = new Image();
        deckImage.onload = function () {
            state.calibrated = false; state.step = 0; state.points = {}; restoreHud(); resetView();
            if (remembered) showToast('Схема сохранена в память — больше загружать не придётся', 'ok');
            else showToast('Схема не поместилась в память: экспорт PDF может не работать', 'warn');
        };
        deckImage.src = dataURL;
    };
    reader.readAsDataURL(file);
});