// DECK STATES: named save slots (browser) + .json export/import + autosave.
var STATES_KEY = 'deckStates';
var AUTOSAVE_KEY = 'deckAutosave';

function stGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function stSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
function stParse(k) { var r = stGet(k); if (!r) return null; try { return JSON.parse(r); } catch (e) { return null; } }

function genId() { return 'st_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7); }

function timeAgo(iso) {
    var t = new Date(iso).getTime(); if (isNaN(t)) return '';
    var s = Math.floor((Date.now() - t) / 1000);
    if (s < 45) return 'только что';
    if (s < 90) return 'минуту назад';
    var m = Math.floor(s / 60); if (m < 60) return m + ' мин назад';
    var h = Math.floor(m / 60); if (h < 24) return h + ' ч назад';
    var d = Math.floor(h / 24); if (d < 7) return d + ' дн назад';
    return new Date(iso).toLocaleDateString();
}

function metricsOf(placed) {
    var n = placed.length, w = 0, im = 0, rf = 0, pl = 0, mn = 0;
    placed.forEach(function (c) {
        w += (c.weight || 0);
        if (c.isHazardous) im++;
        if (c.isReefer) rf++;
        if (c.isPlanned) pl++;
        if (c.isManual) mn++;
    });
    return { n: n, w: w, im: im, rf: rf, pl: pl, mn: mn };
}
function metricsLine(m) {
    return '📦 ' + m.n + '   ⚖ ' + m.w.toFixed(1) + ' т' +
        (m.im ? '   ⚠ ' + m.im : '') + (m.rf ? '   ⚡ ' + m.rf : '') +
        (m.pl ? '   ◌ ' + m.pl : '') + (m.mn ? '   ✋ ' + m.mn : '');
}

function pickPlaced(c) {
    return {
        seq: c.seq, id: c.id, rawId: c.rawId, type: c.type, description: c.description,
        length: c.length, width: c.width, height: c.height, weight: c.weight,
        destination: c.destination, priority: c.priority,
        isHazardous: !!c.isHazardous, imdgClass: c.imdgClass, isReefer: !!c.isReefer, temp: c.temp,
        rotated: !!c.rotated, x: c.x, y: c.y, customFontSize: c.customFontSize,
        isDuplicate: !!c.isDuplicate, isManual: !!c.isManual, isPlanned: !!c.isPlanned, customColor: c.customColor,
        display: c.display || null, prefix: c.prefix || '', num: c.num || null
    };
}
function pickManifest(c) {
    return {
        seq: c.seq, id: c.id, rawId: c.rawId, type: c.type, description: c.description,
        length: c.length, width: c.width, height: c.height, weight: c.weight,
        destination: c.destination, priority: c.priority,
        isHazardous: !!c.isHazardous, imdgClass: c.imdgClass, isReefer: !!c.isReefer, temp: c.temp,
        rotated: !!c.rotated, x: c.x, y: c.y, customFontSize: c.customFontSize, isDuplicate: !!c.isDuplicate,
        display: c.display || null, prefix: c.prefix || '', num: c.num || null
    };
}

function getStates() { var o = stParse(STATES_KEY); return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {}; }
function setStates(o) { stSet(STATES_KEY, JSON.stringify(o)); }

function autosaveDeck() {
    var payload = {
        savedAt: new Date().toISOString(),
        containers: containers.map(pickManifest),
        placed: placedContainers.map(pickPlaced)
    };
    stSet(AUTOSAVE_KEY, JSON.stringify(payload));
}
function loadDeckAutosave() {
    var o = stParse(AUTOSAVE_KEY);
    if (!o || !Array.isArray(o.placed)) return false;
    containers = Array.isArray(o.containers) ? o.containers : [];
    placedContainers = o.placed;
    return true;
}

function applyStateObj(o, label) {
    if (!o || !Array.isArray(o.placed)) {
        if (typeof showToast === 'function') showToast('Файл повреждён или не является состоянием палубы', 'err');
        return false;
    }
    containers = Array.isArray(o.containers) ? o.containers : [];
    placedContainers = o.placed;
    if (typeof checkAllSegregationViolations === 'function') checkAllSegregationViolations();
    if (typeof updateStats === 'function') updateStats();
    if (typeof renderList === 'function') renderList();
    if (typeof draw === 'function') draw();
    autosaveDeck();
    if (typeof showToast === 'function') showToast('Загружено: ' + (label || 'состояние'), 'ok');
    return true;
}

function saveCurrentAsSlot(name) {
    var nm = (name || '').trim() || ('Состояние от ' + new Date().toLocaleString());
    var id = genId();
    var states = getStates();
    states[id] = {
        id: id, name: nm, savedAt: new Date().toISOString(),
        containers: containers.map(pickManifest),
        placed: placedContainers.map(pickPlaced)
    };
    setStates(states);
    renderStatesList();
    if (typeof showToast === 'function') showToast('Сохранено: ' + nm, 'ok');
    return id;
}
function loadSlot(id) {
    var states = getStates(); var s = states[id]; if (!s) return;
    if (applyStateObj(s, s.name)) closeStatesModal();
}
function renameSlot(id, newName) {
    var states = getStates(); if (!states[id]) return;
    var nm = (newName || '').trim(); if (!nm) return;
    states[id].name = nm; setStates(states); renderStatesList();
}
function deleteSlot(id) {
    var states = getStates(); if (!states[id]) return;
    delete states[id]; setStates(states); renderStatesList();
    if (typeof showToast === 'function') showToast('Слот удалён', 'warn');
}

function sanitizeName(s) { return String(s || 'deck-state').replace(/[^a-zа-яё0-9_\-]+/gi, '_').slice(0, 40) || 'deck-state'; }
function downloadJSON(obj, filename) {
    var blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
function exportSlotToFile(id) {
    var states = getStates(); var s = states[id]; if (!s) return;
    downloadJSON({ version: 1, name: s.name, savedAt: s.savedAt, containers: s.containers, placed: s.placed },
        sanitizeName(s.name) + '_' + new Date().toISOString().slice(0, 10) + '.json');
    if (typeof showToast === 'function') showToast('Состояние сохранено в файл', 'ok');
}
function exportAutosaveToFile() {
    var o = stParse(AUTOSAVE_KEY); if (!o) { if (typeof showToast === 'function') showToast('Нет автосохранения', 'warn'); return; }
    downloadJSON({ version: 1, name: 'autosave', savedAt: o.savedAt || new Date().toISOString(), containers: o.containers || [], placed: o.placed || [] },
        'deck-autosave_' + new Date().toISOString().slice(0, 10) + '.json');
    if (typeof showToast === 'function') showToast('Автосохранение выгружено в файл', 'ok');
}
function exportCurrentToFile() {
    downloadJSON({ version: 1, name: 'current', savedAt: new Date().toISOString(), containers: containers.map(pickManifest), placed: placedContainers.map(pickPlaced) },
        'deck-current_' + new Date().toISOString().slice(0, 10) + '.json');
    if (typeof showToast === 'function') showToast('Текущая палуба сохранена в файл', 'ok');
}
function importFromFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (evt) {
        try {
            var o = JSON.parse(evt.target.result);
            if (applyStateObj(o, o.name || file.name)) closeStatesModal();
        } catch (e) {
            if (typeof showToast === 'function') showToast('Не удалось прочитать файл: ' + e.message, 'err');
        }
    };
    reader.readAsText(file);
}

var statesModal = document.getElementById('statesModal');
var statesList = document.getElementById('statesList');
var statesClose = document.getElementById('statesClose');
var btnNewSave = document.getElementById('btnNewSave');
var btnImportFile = document.getElementById('btnImportFile');
var statesImportInput = document.getElementById('statesImportInput');
var saveNameRow = document.getElementById('saveNameRow');
var saveNameInput = document.getElementById('saveNameInput');
var saveNameOk = document.getElementById('saveNameOk');
var saveNameCancel = document.getElementById('saveNameCancel');
var autosaveInfo = document.getElementById('autosaveInfo');

function defaultSlotName() { return 'Состояние от ' + new Date().toLocaleString(); }

function openStatesModal() {
    if (!state.calibrated) { if (typeof showToast === 'function') showToast('Сначала загрузите схему и откалибруйте палубу', 'info'); return; }
    hideSaveNameRow();
    renderStatesList();
    statesModal.classList.add('visible');
}
function closeStatesModal() { statesModal.classList.remove('visible'); }
function isStatesModalOpen() { return statesModal.classList.contains('visible'); }

function showSaveNameRow() {
    saveNameInput.value = defaultSlotName();
    saveNameRow.classList.remove('hidden');
    setTimeout(function () { saveNameInput.focus(); saveNameInput.select(); }, 30);
}
function hideSaveNameRow() { saveNameRow.classList.add('hidden'); }
function commitSaveName() {
    saveCurrentAsSlot(saveNameInput.value);
    hideSaveNameRow();
}

function renderStatesList() {
    var auto = stParse(AUTOSAVE_KEY);
    if (auto && Array.isArray(auto.placed) && auto.placed.length) {
        var am = metricsOf(auto.placed);
        autosaveInfo.classList.remove('hidden');
        autosaveInfo.innerHTML =
            '<div class="auto-head"><span class="pulse-dot"></span> Автосохранение <span class="auto-when">' + timeAgo(auto.savedAt) + '</span></div>' +
            '<div class="auto-metrics">' + metricsLine(am) + '</div>' +
            '<div class="auto-actions"><button class="mini-btn" id="autoExport">📥 В файл</button></div>';
        document.getElementById('autoExport').onclick = exportAutosaveToFile;
    } else {
        autosaveInfo.classList.add('hidden');
        autosaveInfo.innerHTML = '';
    }

    var states = getStates();
    var ids = Object.keys(states).sort(function (a, b) {
        return new Date(states[b].savedAt).getTime() - new Date(states[a].savedAt).getTime();
    });

    statesList.innerHTML = '';
    if (!ids.length) {
        statesList.innerHTML =
            '<div class="states-empty">' +
            '<div class="states-empty-ico">🗂</div>' +
            '<div class="states-empty-txt">Сохранённых состояний пока нет.</div>' +
            '<div class="states-empty-sub">Нажмите «💾 Сохранить текущее», чтобы создать первое — и возвращаться к нему в любой момент.</div>' +
            '</div>';
        return;
    }

    ids.forEach(function (id) {
        var s = states[id];
        var m = metricsOf(s.placed || []);
        var card = document.createElement('div');
        card.className = 'state-card';
        card.dataset.id = id;
        card.innerHTML =
            '<div class="state-top">' +
              '<div class="state-name" data-role="name">' + escapeHtml(s.name) + '</div>' +
              '<input class="state-name-input hidden" data-role="input" type="text" value="' + escapeAttr(s.name) + '">' +
            '</div>' +
            '<div class="state-metrics">' + metricsLine(m) + '</div>' +
            '<div class="state-when">сохранено ' + timeAgo(s.savedAt) + '</div>' +
            '<div class="state-actions" data-role="actions">' +
              '<button class="mini-btn primary" data-act="load">Загрузить</button>' +
              '<button class="mini-btn" data-act="rename">✏️</button>' +
              '<button class="mini-btn" data-act="export">📥</button>' +
              '<button class="mini-btn danger" data-act="del">🗑</button>' +
            '</div>' +
            '<div class="state-confirm hidden" data-role="confirm">' +
              '<span>Удалить слот?</span>' +
              '<button class="mini-btn danger" data-act="del-yes">Да, удалить</button>' +
              '<button class="mini-btn" data-act="del-no">Отмена</button>' +
            '</div>';
        statesList.appendChild(card);

        card.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-act]'); if (!btn) return;
            var act = btn.getAttribute('data-act');
            var nameEl = card.querySelector('[data-role="name"]');
            var inputEl = card.querySelector('[data-role="input"]');
            var actionsEl = card.querySelector('[data-role="actions"]');
            var confirmEl = card.querySelector('[data-role="confirm"]');
            if (act === 'load') loadSlot(id);
            else if (act === 'export') exportSlotToFile(id);
            else if (act === 'rename') {
                nameEl.classList.add('hidden'); inputEl.classList.remove('hidden');
                actionsEl.classList.add('hidden');
                setTimeout(function () { inputEl.focus(); inputEl.select(); }, 20);
                var commit = function () { renameSlot(id, inputEl.value); };
                inputEl.onkeydown = function (ev) { if (ev.key === 'Enter') commit(); if (ev.key === 'Escape') renderStatesList(); };
                inputEl.onblur = commit;
            }
            else if (act === 'del') { actionsEl.classList.add('hidden'); confirmEl.classList.remove('hidden'); }
            else if (act === 'del-yes') deleteSlot(id);
            else if (act === 'del-no') renderStatesList();
        });
    });
}

function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
function escapeAttr(s) { return String(s == null ? '' : s).replace(/"/g, '&quot;'); }

if (statesClose) statesClose.onclick = closeStatesModal;
if (btnNewSave) btnNewSave.onclick = showSaveNameRow;
if (btnImportFile) btnImportFile.onclick = function () { statesImportInput.click(); };
if (statesImportInput) statesImportInput.onchange = function (e) { var f = e.target.files[0]; importFromFile(f); statesImportInput.value = ''; };
if (saveNameOk) saveNameOk.onclick = commitSaveName;
if (saveNameCancel) saveNameCancel.onclick = hideSaveNameRow;
if (saveNameInput) saveNameInput.onkeydown = function (e) { if (e.key === 'Enter') commitSaveName(); if (e.key === 'Escape') hideSaveNameRow(); };
if (statesModal) statesModal.addEventListener('mousedown', function (e) { if (e.target === statesModal) closeStatesModal(); });