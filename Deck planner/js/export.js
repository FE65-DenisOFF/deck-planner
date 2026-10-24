// EXPORT to PDF + print summary.
// The canvas is no longer "tainted" because the scheme now comes from browser memory,
// but we still guard toDataURL with a clear fallback message just in case.

function exportPlanToPDF() {
    var btn = document.getElementById('btnExportPDF');
    var originalText = btn.textContent;
    btn.textContent = '... Генерация...';
    btn.disabled = true;

    try {
        var imgData;
        try {
            imgData = canvas.toDataURL('image/png');
        } catch (taintErr) {
            // Scheme was loaded straight from a disk file (cross-origin) - browser blocks export.
            btn.textContent = originalText;
            btn.disabled = false;
            var msg = 'Браузер запрещает экспорт: схема загружена как файл с диска.\n\n' +
                'Нажмите «1. Загрузить схему» и выберите тот же файл ещё раз — ' +
                'программа запомнит его в памяти, и после этого экспорт в PDF заработает.';
            if (typeof showToast === 'function') showToast('Экспорт заблокирован браузером — см. подсказку', 'err');
            alert(msg);
            return;
        }

        var jsPDFCtor = window.jspdf && window.jspdf.jsPDF;
        if (!jsPDFCtor) { alert('Библиотека PDF не загружена (нет интернета при первом открытии?).'); btn.textContent = originalText; btn.disabled = false; return; }

        var pdf = new jsPDFCtor('landscape', 'mm', 'a4');
        var pageWidth = pdf.internal.pageSize.getWidth();
        var pageHeight = pdf.internal.pageSize.getHeight();

        var imgAspect = canvas.width / canvas.height;
        var pdfImgW = pageWidth - 20;
        var pdfImgH = pdfImgW / imgAspect;
        if (pdfImgH > pageHeight - 30) {
            pdfImgH = pageHeight - 30;
            pdfImgW = pdfImgH * imgAspect;
        }

        pdf.addImage(imgData, 'PNG', (pageWidth - pdfImgW) / 2, (pageHeight - pdfImgH) / 2, pdfImgW, pdfImgH);
        pdf.save('DeckPlan_SCF_' + new Date().toISOString().slice(0, 10) + '.pdf');

        if (typeof showToast === 'function') showToast('PDF сохранён', 'ok');
    } catch (error) {
        console.error('PDF Export Error:', error);
        alert('Ошибка экспорта PDF: ' + error.message);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

function printSummary() {
    var tableHtml = generateTableHTML();
    document.getElementById('printArea').innerHTML =
        '<div class="print-header">' +
        '<h2>SCF Enterprise — Сводка по палубному грузу</h2>' +
        '<p>Дата: ' + new Date().toLocaleDateString() + ' | Всего: ' + containers.length +
        ' | Вес: ' + containers.reduce(function (s, c) { return s + c.weight; }, 0).toFixed(1) +
        ' т | Дубликаты: ' + containers.filter(function (c) { return c.isDuplicate; }).length +
        ' | Нарушения IMDG: ' + violations.length + '</p>' +
        '</div>' +
        tableHtml.replace(/summary-table/g, 'print-table') +
        '<div class="print-footer">Сформировано автоматически.</div>';
    window.print();
}

function generateTableHTML() {
    var groups = {};
    containers.forEach(function (c) {
        var key = c.type + '__' + (c.destination || 'Без назначения');
        if (!groups[key]) groups[key] = { type: c.type, dest: c.destination || 'Без назначения', count: 0, dims: c.length + '×' + c.width + '×' + c.height, haz: 0, ref: 0, dup: 0, totalWeight: 0 };
        groups[key].count++;
        groups[key].totalWeight += c.weight;
        if (c.isHazardous) groups[key].haz++;
        if (c.isReefer) groups[key].ref++;
        if (c.isDuplicate) groups[key].dup++;
    });
    var html = '<table class="summary-table"><thead><tr><th>Тип ГЕ</th><th>Назначение</th><th style="text-align:center;">Кол-во</th><th style="text-align:center;">Вес (т)</th><th>Размеры (Д×Ш×В)</th><th>IMDG / REF / DUP</th></tr></thead><tbody>';
    Object.values(groups).forEach(function (g) {
        var badges = '';
        if (g.haz > 0) badges += '<span style="color:var(--danger);font-weight:bold;">' + g.haz + ' шт HAZ</span> ';
        if (g.ref > 0) badges += '<span style="color:var(--warning);font-weight:bold;">' + g.ref + ' шт REF</span> ';
        if (g.dup > 0) badges += '<span style="color:var(--danger);font-weight:bold;">' + g.dup + ' шт DUP</span>';
        html += '<tr><td><b>' + g.type + '</b></td><td>' + g.dest + '</td><td style="text-align:center;"><b>' + g.count + '</b></td><td style="text-align:center;">' + g.totalWeight.toFixed(1) + '</td><td>' + g.dims + ' м</td><td>' + (badges || '-') + '</td></tr>';
    });
    html += '</tbody></table>';
    return html;
}