// UI: sidebar, events, summary, context menus, stats
function updateStats() {
    var onDeck = placedContainers;
    document.getElementById('stat-count').textContent = onDeck.length;
    document.getElementById('stat-weight').textContent = onDeck.reduce(function (s, c) { return s + (c.weight || 0); }, 0).toFixed(1);
    document.getElementById('stat-imdg').textContent = onDeck.filter(function (c) { return c.isHazardous; }).length;
    document.getElementById('stat-ref').textContent = onDeck.filter(function (c) { return c.isReefer; }).length;
    document.getElementById('stat-dup').textContent = onDeck.filter(function (c) { return c.isDuplicate; }).length;
}

function toggleSidebar() {
    var sidebar = document.getElementById('sidebar'), btn = document.getElementById('sidebarToggleBtn');
    sidebar.classList.toggle('collapsed'); btn.classList.toggle('sidebar-open');
    if (sidebar.classList.contains('collapsed')) { btn.textContent = '▶'; btn.title = 'Развернуть сводку'; }
    else { btn.textContent = '◀'; btn.title = 'Свернуть сводку'; }
    setTimeout(function () { resizeCanvas(); if (state.calibrated) resetView(); }, 320);
}
function resizeCanvas() { if (!wrap || !canvas) return; canvas.width = wrap.clientWidth; canvas.height = wrap.clientHeight; draw(); }
function resetView() { if (!canvas || !wrap) return; state.panX = canvas.width / 2; state.panY = canvas.height / 2; draw(); }
function zoomIn() { state.ppm *= 1.25; draw(); }
function zoomOut() { state.ppm /= 1.25; draw(); }

function setupEvents() {
    canvas.addEventListener('mousedown', function (e) {
        if (placementMode) { e.preventDefault(); e.stopPropagation(); doPlacementClick(e); return; }
        if (!state.calibrated && deckImage && state.step < 4) {
            e.preventDefault(); e.stopPropagation();
            var rect = canvas.getBoundingClientRect();
            var imgPx = (e.clientX - rect.left - lastImgDraw.x) / lastImgDraw.scale;
            var imgPy = (e.clientY - rect.top - lastImgDraw.y) / lastImgDraw.scale;
            if (state.step === 0) state.points.minX = { imgX: imgPx, imgY: imgPy };
            else if (state.step === 1) state.points.maxX = { imgX: imgPx, imgY: imgPy };
            else if (state.step === 2) state.points.maxY = { imgX: imgPx, imgY: imgPy };
            else if (state.step === 3) state.points.minY = { imgX: imgPx, imgY: imgPy };
            state.step++; updateHud(); draw();
            if (state.step >= 4) setTimeout(finishCalibration, 500);
            return;
        }
        if (state.calibrated) {
            isDragging = true;
            var coords = toDeck(e.clientX - wrap.getBoundingClientRect().left, e.clientY - wrap.getBoundingClientRect().top);
            draggedContainer = findContainerAt(coords.x, coords.y);
            if (draggedContainer) { dragOffset.x = coords.x - draggedContainer.x; dragOffset.y = coords.y - draggedContainer.y; canvas.classList.add('grabbing'); }
            else { isPanning = true; dragOffset.x = e.clientX - state.panX; dragOffset.y = e.clientY - state.panY; canvas.style.cursor = 'grabbing'; }
        }
    });

    window.addEventListener('mousemove', function (e) {
        if (placementMode) {
            var rr = canvas.getBoundingClientRect();
            var dd = toDeck(e.clientX - rr.left, e.clientY - rr.top);
            document.getElementById('coordX').textContent = dd.x.toFixed(1);
            document.getElementById('coordY').textContent = dd.y.toFixed(1);
            var t = placementTemplate;
            placementGhost.x = dd.x - t.length / 2; placementGhost.y = dd.y - t.width / 2;
            draw(); return;
        }
        if (!isDragging) {
            if (state.calibrated) { var r = canvas.getBoundingClientRect(); var d = toDeck(e.clientX - r.left, e.clientY - r.top); document.getElementById('coordX').textContent = d.x.toFixed(1); document.getElementById('coordY').textContent = d.y.toFixed(1); }
            return;
        }
        var r2 = canvas.getBoundingClientRect();
        var mx = e.clientX - r2.left, my = e.clientY - r2.top, d2 = toDeck(mx, my);
        document.getElementById('coordX').textContent = d2.x.toFixed(1); document.getElementById('coordY').textContent = d2.y.toFixed(1);
        if (draggedContainer) {
            var targetX = d2.x - dragOffset.x, targetY = d2.y - dragOffset.y;
            var bMinX = DECK_COORDS.minX - 5, bMaxX = DECK_COORDS.maxX + 5, bMinY = DECK_COORDS.minY - 5, bMaxY = DECK_COORDS.maxY + 5;
            targetX = Math.max(bMinX, Math.min(bMaxX - draggedContainer.length, targetX));
            targetY = Math.max(bMinY, Math.min(bMaxY - draggedContainer.width, targetY));
            var canMoveX = true, canMoveY = true;
            for (var i = 0; i < placedContainers.length; i++) {
                var o = placedContainers[i]; if (o === draggedContainer) continue;
                if (targetX < o.x + o.length && targetX + draggedContainer.length > o.x && draggedContainer.y < o.y + o.width && draggedContainer.y + draggedContainer.width > o.y) canMoveX = false;
                if (draggedContainer.x < o.x + o.length && draggedContainer.x + draggedContainer.length > o.x && targetY < o.y + o.width && targetY + draggedContainer.width > o.y) canMoveY = false;
            }
            if (canMoveX) draggedContainer.x = targetX;
            if (canMoveY) draggedContainer.y = targetY;
            draw();
        } else if (isPanning) { state.panX = e.clientX - dragOffset.x; state.panY = e.clientY - dragOffset.y; draw(); }
    });

    window.addEventListener('mouseup', function () {
        if (isDragging) {
            var moved = !!draggedContainer;
            if (draggedContainer && draggedContainer.isManual && typeof saveManualToStorage === 'function') saveManualToStorage();
            isDragging = false; isPanning = false; draggedContainer = null;
            canvas.classList.remove('grabbing'); canvas.style.cursor = state.calibrated ? 'grab' : 'default';
            if (state.calibrated) {
                checkAllSegregationViolations(); updateStats(); renderList();
                if (moved && typeof autosaveDeck === 'function') autosaveDeck();
            }
        }
    });

    wrap.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        if (!state.calibrated) { if (typeof showToast === 'function') showToast('Сначала загрузите схему и откалибруйте палубу', 'info'); return; }
        if (placementMode) { exitPlacement(); return; }
        var r = canvas.getBoundingClientRect(); var d = toDeck(e.clientX - r.left, e.clientY - r.top);
        var cont = findContainerAt(d.x, d.y);
        if (cont) { if (typeof closeEmptyMenu === 'function') closeEmptyMenu(); showContextMenu(e, cont); }
        else {
            closeContextMenu();
            if (typeof showEmptyMenu === 'function') showEmptyMenu(e, d);
            else if (typeof showToast === 'function') showToast('Модуль «+ Контейнер» не загрузился — откройте консоль (F12)', 'err');
        }
    });

    document.addEventListener('mousedown', function (e) {
        var m = document.getElementById('contextMenu');
        if (!m.contains(e.target) && e.button !== 2) closeContextMenu();
        if (typeof closeEmptyMenu === 'function') { var em = document.getElementById('emptyContextMenu'); if (em && !em.contains(e.target) && e.button !== 2) closeEmptyMenu(); }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            if (typeof isStatesModalOpen === 'function' && isStatesModalOpen()) { closeStatesModal(); return; }
            if (typeof isManualModalOpen === 'function' && isManualModalOpen()) { closeManualModal(); return; }
            if (placementMode) { exitPlacement(); return; }
            closeContextMenu(); if (typeof closeEmptyMenu === 'function') closeEmptyMenu();
        }
    });

    wrap.addEventListener('wheel', function (e) {
        if (!state.calibrated) return;
        e.preventDefault();
        var rect = canvas.getBoundingClientRect();
        var mx = e.clientX - rect.left, my = e.clientY - rect.top;
        var wheel = e.deltaY < 0 ? 1 : -1, zoomFactor = Math.exp(wheel * 0.1);
        var worldX = (mx - state.panX) / state.ppm, worldY = (state.panY - my) / state.ppm;
        state.ppm = Math.max(0.1, Math.min(100, state.ppm * zoomFactor));
        state.panX = mx - worldX * state.ppm; state.panY = my + worldY * state.ppm;
        draw();
    }, { passive: false });
}

function renderList() {
    var list = document.getElementById('cargoList'); list.innerHTML = '';
    var manual = placedContainers.filter(function (c) { return c.isManual; });
    if (containers.length === 0 && manual.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Загрузите файл Excel</div>'; return;
    }

    if (violations.length > 0) {
        var vt = document.createElement('div'); vt.className = 'summary-section-title'; vt.style.color = '#ef4444';
        vt.textContent = '⚠️ Нарушения IMDG: ' + violations.length; list.appendChild(vt);
        violations.slice(0, 5).forEach(function (v) {
            var div = document.createElement('div');
            div.style.cssText = 'font-size:0.72rem; padding:5px; margin-bottom:4px; background:rgba(239,68,68,0.15); border-left:3px solid #ef4444;';
            div.innerHTML = '<div style="color:#ef4444; font-weight:bold;">' + v.container1.id + ' (IMDG ' + v.container1.imdgClass + ') ↔ ' + v.container2.id + ' (IMDG ' + v.container2.imdgClass + ')</div>' +
                '<div style="color:#c9d1d9; margin-top:2px;">Код: <b>' + v.code + '</b> | Требуется: <b>' + v.requiredDistance.toFixed(2) + ' м</b> | Факт: <b>' + v.actualDistance.toFixed(2) + ' м</b></div>';
            list.appendChild(div);
        });
        if (violations.length > 5) { var more = document.createElement('div'); more.style.cssText = 'font-size:0.72rem; padding:4px; color:#8b949e; text-align:center;'; more.textContent = '... и ещё ' + (violations.length - 5) + ' нарушений'; list.appendChild(more); }
    }

    var t1 = document.createElement('div'); t1.className = 'summary-section-title'; t1.textContent = '📊 Статистика палубы'; list.appendChild(t1);
    var totalWeight = placedContainers.reduce(function (s, c) { return s + (c.weight || 0); }, 0);
    var st = document.createElement('table'); st.className = 'summary-table';
    st.innerHTML =
        '<tr><td>В манифесте</td><td style="text-align:center;">' + containers.length + '</td></tr>' +
        '<tr><td>На палубе</td><td style="text-align:center;">' + placedContainers.length + '</td></tr>' +
        '<tr><td>Добавлено вручную</td><td style="text-align:center; color:var(--info);">' + manual.length + '</td></tr>' +
        '<tr><td>Общий вес на палубе</td><td style="text-align:center;">' + totalWeight.toFixed(1) + ' т</td></tr>' +
        '<tr><td>IMDG на палубе</td><td style="text-align:center; color:var(--danger);">' + placedContainers.filter(function (c) { return c.isHazardous; }).length + '</td></tr>' +
        '<tr><td>Реф на палубе</td><td style="text-align:center; color:var(--warning);">' + placedContainers.filter(function (c) { return c.isReefer; }).length + '</td></tr>' +
        '<tr><td>Дубликаты</td><td style="text-align:center; color:var(--danger);">' + placedContainers.filter(function (c) { return c.isDuplicate; }).length + '</td></tr>' +
        '<tr><td>Нарушения IMDG</td><td style="text-align:center; color:var(--danger); font-weight:bold;">' + violations.length + '</td></tr>';
    list.appendChild(st);

    if (containers.length > 0) {
        var t4 = document.createElement('div'); t4.className = 'summary-section-title'; t4.textContent = '🧭 По направлениям'; list.appendChild(t4);
        var byDest = {};
        containers.forEach(function (c) { var d = c.destination || 'Не указано'; if (!byDest[d]) byDest[d] = []; byDest[d].push(c); });
        Object.keys(byDest).sort().forEach(function (dest) {
            var items = byDest[dest];
            var dw = items.reduce(function (s, c) { return s + c.weight; }, 0);
            var dt = document.createElement('table'); dt.className = 'summary-table';
            dt.innerHTML = '<tr><th colspan="4" style="background:#1a2332; color:var(--info);">' + dest + ' (' + items.length + ' ед., ' + dw.toFixed(1) + ' т)</th></tr><tr><th>№</th><th>ID</th><th>Тип</th><th>Вес</th></tr>';
            items.sort(function (a, b) { return a.seq - b.seq; }).forEach(function (c) {
                var tr = document.createElement('tr'); tr.style.cursor = 'pointer';
                var special = (c.isHazardous ? '⚠️' : '') + (c.isReefer ? '⚡' : '');
                var idStyle = c.isDuplicate ? 'color:var(--danger); font-weight:bold;' : '';
                tr.innerHTML = '<td>' + c.seq + special + '</td><td style="' + idStyle + '" title="' + c.id + '">' + c.id.substring(0, 10) + '</td><td>' + c.type + '</td><td style="text-align:center;">' + c.weight.toFixed(1) + '</td>';
                tr.onclick = function () { var pp = toScreen(c.x + c.length / 2, c.y + c.width / 2); state.panX = canvas.width / 2 - pp.x + state.panX; state.panY = canvas.height / 2 - pp.y + state.panY; draw(); };
                dt.appendChild(tr);
            });
            list.appendChild(dt);
        });
    }

    if (manual.length > 0) {
        var tm = document.createElement('div'); tm.className = 'summary-section-title'; tm.style.color = 'var(--info)'; tm.textContent = '➕ Добавленные вручную (' + manual.length + ')'; list.appendChild(tm);
        var mt = document.createElement('table'); mt.className = 'summary-table';
        mt.innerHTML = '<tr><th>ID</th><th>Размер</th><th>Вес</th><th>IMDG/REF</th></tr>';
        manual.forEach(function (c) {
            var tr = document.createElement('tr'); tr.style.cursor = 'pointer';
            var tags = '✋ ' + (c.isHazardous ? '⚠️' : '') + (c.isReefer ? '⚡' : '') + (c.isPlanned ? '◌' : '');
            tr.innerHTML = '<td style="color:var(--info); font-weight:bold;" title="' + (c.destination || '') + '">' + c.id + '</td><td>' + c.length.toFixed(2) + '×' + c.width.toFixed(2) + '</td><td style="text-align:center;">' + c.weight.toFixed(1) + '</td><td>' + tags + '</td>';
            tr.onclick = function () { var pp = toScreen(c.x + c.length / 2, c.y + c.width / 2); state.panX = canvas.width / 2 - pp.x + state.panX; state.panY = canvas.height / 2 - pp.y + state.panY; draw(); };
            mt.appendChild(tr);
        });
        list.appendChild(mt);
    }
}

function showContextMenu(e, cont) {
    contextTarget = cont;
    var m = document.getElementById('contextMenu');
    document.getElementById('ctxHeader').textContent = (cont.isManual ? '✋ ' : '№') + cont.seq + ' ' + cont.id;
    var b = '';
    if (cont.isHazardous) b += '<span style="color:var(--danger);font-weight:bold;">IMDG ' + cont.imdgClass + '</span> ';
    if (cont.isReefer) b += '<span style="color:var(--warning);font-weight:bold;">REF ' + cont.temp + '</span> ';
    if (cont.isDuplicate) b += '<span style="color:var(--danger);font-weight:bold;">ДУБЛИКАТ</span>';
    if (cont.isManual) b += '<span style="color:var(--info);font-weight:bold;">РУЧНОЙ</span>';
    if (cont.isPlanned) b += '<span style="color:var(--text);font-weight:bold;">ПЛАН</span>';
    document.getElementById('ctxBody').innerHTML = '<div class="context-row"><span class="context-label">Тип:</span><span class="context-value">' + cont.type + '</span></div><div class="context-row"><span class="context-label">Назначение:</span><span class="context-value">' + (cont.destination || '-') + '</span></div><div class="context-row"><span class="context-label">Размеры:</span><span class="context-value">' + cont.length.toFixed(2) + '×' + cont.width.toFixed(2) + '×' + cont.height.toFixed(2) + ' м</span></div><div class="context-row"><span class="context-label">Вес:</span><span class="context-value">' + cont.weight.toFixed(1) + ' т</span></div><div style="margin-top:6px;">' + b + '</div>';
    var eb = document.getElementById('ctxEdit'); if (eb) { if (cont.isManual) eb.classList.remove('hidden'); else eb.classList.add('hidden'); }
    m.style.left = e.clientX + 'px'; m.style.top = e.clientY + 'px'; m.classList.add('active');
    setTimeout(function () { var r = m.getBoundingClientRect(); if (r.right > window.innerWidth) m.style.left = (e.clientX - r.width) + 'px'; if (r.bottom > window.innerHeight) m.style.top = (e.clientY - r.height) + 'px'; }, 0);
}
function closeContextMenu() { document.getElementById('contextMenu').classList.remove('active'); contextTarget = null; }

function rotateContainer() {
    if (!contextTarget) return;
    var c = contextTarget, oldL = c.length, oldW = c.width, oldRot = c.rotated;
    c.length = oldW; c.width = oldL; c.rotated = !oldRot;
    if (!isValidPosition(c, c.x, c.y)) { c.length = oldL; c.width = oldW; c.rotated = oldRot; alert('Нельзя повернуть: выходит за границы или пересекается.'); }
    else { closeContextMenu(); checkAllSegregationViolations(); updateStats(); renderList(); draw(); if (c.isManual && typeof saveManualToStorage === 'function') saveManualToStorage(); if (typeof autosaveDeck === 'function') autosaveDeck(); }
}
function increaseContainerFont() { if (!contextTarget) return; contextTarget.customFontSize = (contextTarget.customFontSize === null) ? 10 : Math.min(24, contextTarget.customFontSize + 2); draw(); if (typeof autosaveDeck === 'function') autosaveDeck(); }
function decreaseContainerFont() { if (!contextTarget) return; contextTarget.customFontSize = (contextTarget.customFontSize === null) ? 10 : Math.max(6, contextTarget.customFontSize - 2); draw(); if (typeof autosaveDeck === 'function') autosaveDeck(); }
function resetContainerFont() { if (!contextTarget) return; contextTarget.customFontSize = null; draw(); if (typeof autosaveDeck === 'function') autosaveDeck(); }
function deleteSelected() {
    if (!contextTarget) return;
    var wasManual = !!contextTarget.isManual;
    if (!wasManual) { if (!confirm('Это контейнер из манифеста. Удалить его с палубы?')) return; }
    placedContainers = placedContainers.filter(function (c) { return c !== contextTarget; });
    closeContextMenu(); checkAllSegregationViolations(); updateStats(); renderList(); draw();
    if (wasManual && typeof saveManualToStorage === 'function') saveManualToStorage();
    if (typeof autosaveDeck === 'function') autosaveDeck();
}