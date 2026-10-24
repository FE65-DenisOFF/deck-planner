// RENDERING
function hexLuminance(hex) {
    if (!hex || hex.charAt(0) !== '#') return 1;
    var h = hex.slice(1); if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var r = parseInt(h.substr(0,2),16), g = parseInt(h.substr(2,2),16), b = parseInt(h.substr(4,2),16);
    if (isNaN(r)) return 1;
    return (0.2126*r + 0.7152*g + 0.0722*b) / 255;
}
function getDestColor(dest) {
    var d = (dest || '').toUpperCase();
    for (var i = 0; i < DEST_PALETTE.length; i++) {
        var keys = DEST_PALETTE[i].keys;
        for (var k = 0; k < keys.length; k++) {
            if (keys[k] && d.indexOf(String(keys[k]).toUpperCase()) !== -1) return DEST_PALETTE[i].color;
        }
    }
    return DEST_FALLBACK_COLOR;
}
function textOnColor(fillHex) { return hexLuminance(fillHex) < 0.30 ? '#ffffff' : '#000000'; }
function outlineColorFor(fillHex) { return hexLuminance(fillHex) < 0.45 ? '#ffffff' : '#000000'; }

// Extract "PREFIX" + "number" from a manifest string like "SARF 008" / "ERAU 0011".
function splitPrefix(src) {
    var m = String(src || '').match(/^(SARF|VFH|SEIC|OHS|KAA|ERAU|CSL|SAW|MOOU)\s*/i);
    if (!m) return null;
    return {
        pfx: m[1].toUpperCase(),
        num: String(src).replace(/^(SARF|VFH|SEIC|OHS|KAA|ERAU|CSL|SAW|MOOU)\s*/i, '').trim()
    };
}

function draw() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!deckImage) {
        ctx.fillStyle = '#666'; ctx.font = '20px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('⚙️ Загрузите схему для начала работы', canvas.width / 2, canvas.height / 2);
        return;
    }

    var fitScale = Math.min(canvas.width / deckImage.width, canvas.height / deckImage.height) * 0.9;
    var imgW = deckImage.width * fitScale, imgH = deckImage.height * fitScale;
    var imgX = (canvas.width - imgW) / 2, imgY = (canvas.height - imgH) / 2;
    lastImgDraw = { x: imgX, y: imgY, scale: fitScale };

    if (!state.calibrated) {
        ctx.drawImage(deckImage, imgX, imgY, imgW, imgH);
        ctx.fillStyle = '#ff0000'; ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        var drawMarker = function (pt, label) {
            if (!pt) return;
            var x = imgX + pt.imgX * fitScale, y = imgY + pt.imgY * fitScale;
            ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.fillText(label, x, y); ctx.fillStyle = '#ff0000';
        };
        drawMarker(state.points.minX, '1'); drawMarker(state.points.maxX, '2');
        drawMarker(state.points.maxY, '3'); drawMarker(state.points.minY, '4');
        return;
    }

    var deckZoneScreenX = state.panX + DECK_COORDS.minX * state.ppm;
    var deckZoneScreenY = state.panY - DECK_COORDS.maxY * state.ppm;
    var deckZoneScreenW = DECK_W * state.ppm, deckZoneScreenH = DECK_H * state.ppm;

    var p = state.points;
    var srcW = p.maxX.imgX - p.minX.imgX, srcH = p.minY.imgY - p.maxY.imgY;
    var scaleToScreen = deckZoneScreenW / srcW;
    var drawImgX = deckZoneScreenX - p.minX.imgX * scaleToScreen;
    var drawImgY = deckZoneScreenY - p.maxY.imgY * scaleToScreen;
    var drawImgW = deckImage.width * scaleToScreen, drawImgH = deckImage.height * scaleToScreen;
    ctx.drawImage(deckImage, drawImgX, drawImgY, drawImgW, drawImgH);

    ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)'; ctx.lineWidth = 2;
    ctx.strokeRect(deckZoneScreenX, deckZoneScreenY, deckZoneScreenW, deckZoneScreenH);

    placedContainers.forEach(function (c) {
        var sp = toScreen(c.x, c.y + c.width);
        var w = c.length * state.ppm, h = c.width * state.ppm;
        var planned = !!c.isPlanned;

        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(sp.x + 2, sp.y + 2, w, h);

        if (planned) {
            ctx.fillStyle = PLANNED_COLOR; ctx.fillRect(sp.x, sp.y, w, h);
            ctx.save();
            ctx.beginPath(); ctx.rect(sp.x, sp.y, w, h); ctx.clip();
            ctx.strokeStyle = 'rgba(255,255,255,0.30)'; ctx.lineWidth = 1;
            for (var dd = -h; dd < w; dd += 8) { ctx.beginPath(); ctx.moveTo(sp.x + dd, sp.y + h); ctx.lineTo(sp.x + dd + h, sp.y); ctx.stroke(); }
            ctx.restore();
            ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1; ctx.setLineDash([5, 4]);
            ctx.strokeRect(sp.x + 0.5, sp.y + 0.5, w - 1, h - 1); ctx.setLineDash([]);
        } else {
            var color = c.customColor || getDestColor(c.destination);
            ctx.fillStyle = color; ctx.fillRect(sp.x, sp.y, w, h);
            ctx.strokeStyle = outlineColorFor(color); ctx.lineWidth = 1;
            ctx.strokeRect(sp.x + 0.5, sp.y + 0.5, w - 1, h - 1);
            if (c.isReefer && w > 8 && h > 8) {
                ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 1;
                ctx.strokeRect(sp.x + 2.5, sp.y + 2.5, w - 5, h - 5);
            }
            if (c.isManual && w > 8 && h > 8) {
                ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
                ctx.strokeRect(sp.x + 2.5, sp.y + 2.5, w - 5, h - 5); ctx.setLineDash([]); ctx.restore();
            }
        }

        if (c._hl && (Date.now() - c._hl) < 3000) {
            ctx.save(); ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 3; ctx.setLineDash([7, 4]);
            ctx.strokeRect(sp.x - 1.5, sp.y - 1.5, w + 3, h + 3);
            ctx.setLineDash([]); ctx.restore();
        }

        if (w > 20 && h > 15) {
            var padding = 4, maxW = w - padding * 2;
            var d = c.display || DEFAULT_DISPLAY;
            var fontSize = (c.customFontSize !== null) ? c.customFontSize : Math.max(6, Math.min(maxW / 4.5, h / 4.5));
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            var fillForText = planned ? '#1b2530' : (c.customColor || getDestColor(c.destination));
            var textColor = c.isDuplicate ? '#ef4444' : (planned ? '#f1f5f9' : textOnColor(fillForText));
            ctx.fillStyle = textColor; ctx.font = 'bold ' + fontSize + 'px sans-serif';

            var lines = [];
            if (!planned) {
                if (d.seq && c.seq) lines.push((c.isManual ? '✋ ' : '') + '№' + c.seq);
                if (d.id) {
                    // prefix/number, with fallback to the raw manifest string when not stored
                    var pfx = c.prefix || '', num = c.num || '';
                    if (!pfx || !num) {
                        var sp2 = splitPrefix(c.rawId || c.id || '');
                        if (sp2) { pfx = sp2.pfx; num = sp2.num; }
                    }
                    var idText = '';
                    if (pfx && num) idText = prefixOn(pfx) ? (pfx + ' ' + num) : num;
                    else idText = c.id || '';
                    if (idText) {
                        var cur = '';
                        for (var i = 0; i < idText.length; i++) {
                            var ch = idText[i], test = cur + ch;
                            if (ctx.measureText(test).width > maxW && cur.length > 0) { lines.push(cur); cur = ch; } else cur = test;
                        }
                        if (cur) lines.push(cur);
                    }
                }
            } else {
                if (d.id) lines.push('◌ ' + (c.id || 'ПЛАН'));
            }
            if (d.weight && c.weight) lines.push(c.weight.toFixed(1) + ' т');
            if (d.imdg && c.isHazardous && c.imdgClass) lines.push('IMDG ' + c.imdgClass);
            if (d.temp && c.isReefer && c.temp) lines.push('⚡' + c.temp);

            if (lines.length) {
                var lh = fontSize * 1.15, total = lines.length * lh;
                var startY = sp.y + h / 2 - (total / 2) + (lh / 2);
                ctx.fillStyle = textColor; ctx.font = 'bold ' + fontSize + 'px sans-serif';
                lines.forEach(function (line, idx) { ctx.fillText(line, sp.x + w / 2, startY + idx * lh); });
            }
        }
    });

    if (placementMode && placementGhost) {
        var g = placementGhost;
        var ev = (typeof evaluateGhostAt === 'function') ? evaluateGhostAt(g.x, g.y) : { ok: true };
        var gp = toScreen(g.x, g.y + g.width);
        var gw = g.length * state.ppm, gh = g.width * state.ppm;
        ctx.save();
        ctx.fillStyle = ev.ok ? 'rgba(34,197,94,0.30)' : 'rgba(239,68,68,0.35)';
        ctx.fillRect(gp.x, gp.y, gw, gh);
        ctx.strokeStyle = ev.ok ? '#22c55e' : '#ef4444'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
        ctx.strokeRect(gp.x, gp.y, gw, gh); ctx.setLineDash([]);
        if (!ev.ok && gw > 50) {
            ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(ev.reason, gp.x + gw / 2, gp.y + gh / 2);
        }
        ctx.restore();
    }

    violations.forEach(function (v) {
        var c1 = v.container1, c2 = v.container2;
        var p1 = toScreen(c1.x + c1.length / 2, c1.y + c1.width / 2);
        var p2 = toScreen(c2.x + c2.length / 2, c2.y + c2.width / 2);
        ctx.save();
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); ctx.setLineDash([]);
        var midX = (p1.x + p2.x) / 2, midY = (p1.y + p2.y) / 2;
        var label = v.code + ' (' + v.requiredDistance.toFixed(1) + 'м)';
        ctx.font = 'bold 11px sans-serif';
        var tw = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(239,68,68,0.95)'; ctx.fillRect(midX - tw / 2 - 4, midY - 8, tw + 8, 16);
        ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label, midX, midY); ctx.restore();
    });
}

function toScreen(deckX, deckY) { return { x: state.panX + deckX * state.ppm, y: state.panY - deckY * state.ppm }; }
function toDeck(screenX, screenY) { return { x: (screenX - state.panX) / state.ppm, y: (state.panY - screenY) / state.ppm }; }

function findContainerAt(x, y) {
    for (var i = placedContainers.length - 1; i >= 0; i--) {
        var c = placedContainers[i];
        if (x >= c.x && x <= c.x + c.length && y >= c.y && y <= c.y + c.width) return c;
    }
    return null;
}