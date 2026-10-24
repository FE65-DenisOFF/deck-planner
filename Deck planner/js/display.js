// DISPLAY OPTIONS: per-container data lines + global prefix toggles.
var displayMenu = document.getElementById('displayMenu');
var displayBody = document.getElementById('displayBody');
var displayTarget = null;
var lastCtxPos = { x: 0, y: 0 };

function copyObj(o) { var r = {}; for (var k in o) r[k] = o[k]; return r; }
function copyDisplay(src) { src = src || DEFAULT_DISPLAY; return { seq: !!src.seq, id: !!src.id, weight: !!src.weight, imdg: !!src.imdg, temp: !!src.temp }; }
function normDisplay(c) { if (c && (typeof c.display !== 'object' || !c.display)) c.display = copyDisplay(DEFAULT_DISPLAY); return c ? c.display : null; }
function persistDeck() { if (typeof saveManualToStorage === 'function') saveManualToStorage(); if (typeof autosaveDeck === 'function') autosaveDeck(); }

document.addEventListener('contextmenu', function (e) { lastCtxPos = { x: e.clientX, y: e.clientY }; closeDisplayMenu(); });

function openDisplayMenu() {
    if (!contextTarget) return;
    displayTarget = contextTarget;
    normDisplay(displayTarget);
    syncDisplayChecks();
    displayMenu.classList.add('active');
    placeMenuAt(displayMenu, lastCtxPos.x, lastCtxPos.y);
}
function closeDisplayMenu() { displayMenu.classList.remove('active'); }
function syncDisplayChecks() {
    var d = displayTarget ? displayTarget.display : DEFAULT_DISPLAY;
    displayBody.querySelectorAll('input[data-d]').forEach(function (inp) { inp.checked = !!d[inp.getAttribute('data-d')]; });
}

// keep any floating menu inside the viewport
function placeMenuAt(menu, x, y) {
    var mw = menu.offsetWidth, mh = menu.offsetHeight;
    if (x + mw > window.innerWidth - 8) x = window.innerWidth - mw - 8;
    if (y + mh > window.innerHeight - 8) y = window.innerHeight - mh - 8;
    if (x < 8) x = 8;
    if (y < 8) y = 8;
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
}

displayBody.addEventListener('change', function (e) {
    var inp = e.target; var key = inp.getAttribute && inp.getAttribute('data-d');
    if (!key || !displayTarget) return;
    normDisplay(displayTarget); displayTarget.display[key] = inp.checked;
    draw(); persistDeck();
});
document.getElementById('dispClose').onclick = closeDisplayMenu;
document.getElementById('dispReset').onclick = function () {
    if (!displayTarget) return;
    displayTarget.display = copyDisplay(DEFAULT_DISPLAY);
    syncDisplayChecks(); draw(); persistDeck();
};
document.getElementById('dispApplyAll').onclick = function () {
    if (!displayTarget) return;
    normDisplay(displayTarget);
    var src = copyDisplay(displayTarget.display);
    containers.forEach(function (c) { c.display = copyDisplay(src); });
    placedContainers.forEach(function (c) { c.display = copyDisplay(src); });
    draw(); persistDeck();
    if (typeof showToast === 'function') showToast('Отображение применено ко всем контейнерам', 'ok');
};

// ---- global prefix display menu ----
var prefixMenu = document.getElementById('prefixMenu');
var prefixBody = document.getElementById('prefixBody');

function loadPrefixDisplay() { var r = null; try { r = localStorage.getItem('prefixDisplay'); } catch (e) {} if (r) { try { return JSON.parse(r); } catch (e) {} } return null; }
prefixDisplay = loadPrefixDisplay() || copyObj(DEFAULT_PREFIX_DISPLAY);

function buildPrefixBody() {
    prefixBody.innerHTML = '';
    PREFIX_LIST.forEach(function (pfx) {
        var lab = document.createElement('label'); lab.className = 'display-check';
        var inp = document.createElement('input'); inp.type = 'checkbox'; inp.setAttribute('data-p', pfx); inp.checked = prefixOn(pfx);
        lab.appendChild(inp); lab.appendChild(document.createTextNode(' ' + pfx));
        prefixBody.appendChild(lab);
    });
}
prefixBody.addEventListener('change', function (e) {
    var inp = e.target; var pfx = inp.getAttribute && inp.getAttribute('data-p'); if (!pfx) return;
    if (!prefixDisplay) prefixDisplay = {};
    prefixDisplay[pfx] = inp.checked;
    try { localStorage.setItem('prefixDisplay', JSON.stringify(prefixDisplay)); } catch (err) {}
    draw();
});
function openPrefixMenu() {
    closeDisplayMenu();
    buildPrefixBody();
    prefixMenu.classList.add('active'); // make visible so we can measure it
    var b = document.getElementById('btnPrefix');
    var r = b ? b.getBoundingClientRect() : null;
    placeMenuAt(prefixMenu, r ? r.left : 10, r ? (r.bottom + 6) : 10);
}
function closePrefixMenu() { prefixMenu.classList.remove('active'); }
document.getElementById('prefixClose').onclick = closePrefixMenu;

document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeDisplayMenu(); closePrefixMenu(); } });
document.addEventListener('mousedown', function (e) {
    if (displayMenu && !displayMenu.contains(e.target)) closeDisplayMenu();
    if (prefixMenu && !prefixMenu.contains(e.target) && !(e.target.closest && e.target.closest('#btnPrefix'))) closePrefixMenu();
});