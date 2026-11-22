/**
 * Letter-size invoice PDF download from the open #order-invoice-sheet modal.
 * Uses jsPDF + autoTable (not html2canvas) so typical orders fit on one page.
 */

function invoiceDownloadFilename() {
    const raw = (document.getElementById('inv-number') && document.getElementById('inv-number').textContent) || 'invoice';
    const safe = String(raw).trim().replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    return (safe || 'invoice') + '.pdf';
}

function invoiceSheetText(el) {
    return el ? String(el.textContent || '').replace(/\s+/g, ' ').trim() : '';
}

function invoiceSheetLines(el) {
    if (!el) return [];
    const paras = el.querySelectorAll('p');
    if (paras.length) {
        return Array.from(paras).map(function (p) {
            return String(p.textContent || '').replace(/\s+/g, ' ').trim();
        }).filter(Boolean);
    }
    const text = String(el.textContent || '').trim();
    if (!text || text === '—') return [];
    return text.split(/\n+/).map(function (line) {
        return line.replace(/\s+/g, ' ').trim();
    }).filter(Boolean);
}

function collectInvoiceSheetData() {
    const sheet = document.getElementById('order-invoice-sheet');
    if (!sheet) return null;

    const title = invoiceSheetText(document.getElementById('inv-title')) || 'INVOICE';
    const number = invoiceSheetText(document.getElementById('inv-number')) || '—';
    const date = invoiceSheetText(document.getElementById('inv-date')) || '—';
    const statusEl = document.getElementById('inv-status');
    const status = invoiceSheetText(statusEl);
    const statusVisible = !!(statusEl && !statusEl.classList.contains('hidden') && status && status !== '—');

    const bannerEl = document.getElementById('inv-updated-banner');
    const updatedBanner = (bannerEl && !bannerEl.classList.contains('hidden'))
        ? invoiceSheetText(bannerEl)
        : '';

    const items = [];
    const rows = sheet.querySelectorAll('#inv-items-body tr');
    rows.forEach(function (tr) {
        const cells = tr.querySelectorAll('td');
        if (!cells.length) return;
        if (cells.length === 1 || (cells[0] && cells[0].hasAttribute('colspan'))) {
            const label = invoiceSheetText(cells[0]);
            if (label && !/^no line items$/i.test(label)) {
                items.push({ section: label });
            }
            return;
        }
        items.push({
            qty: invoiceSheetText(cells[0]),
            description: invoiceSheetText(cells[1]),
            unit: invoiceSheetText(cells[2]),
            total: invoiceSheetText(cells[3])
        });
    });

    const creditRow = document.getElementById('inv-credit-row');
    const creditVisible = !!(creditRow && !creditRow.classList.contains('hidden'));

    return {
        title: title,
        number: number,
        date: date,
        status: statusVisible ? status : '',
        updatedBanner: updatedBanner,
        billTo: invoiceSheetLines(document.getElementById('inv-bill-to')),
        shipTo: invoiceSheetLines(document.getElementById('inv-ship-to')),
        items: items,
        notes: invoiceSheetText(document.getElementById('inv-notes')).replace(/^—$/, ''),
        subtotal: invoiceSheetText(document.getElementById('inv-subtotal')) || '$0.00',
        shipping: invoiceSheetText(document.getElementById('inv-shipping')) || '$0.00',
        credit: creditVisible ? invoiceSheetText(document.getElementById('inv-credit')) : '',
        total: invoiceSheetText(document.getElementById('inv-total')) || '$0.00'
    };
}

function buildInvoicePdfFromData(data) {
    const jsPdfCtor = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : window.jsPDF;
    if (!jsPdfCtor) {
        throw new Error('PDF library not loaded');
    }

    const doc = new jsPdfCtor({ unit: 'pt', format: 'letter', compress: true });
    if (typeof doc.autoTable !== 'function') {
        throw new Error('PDF table plugin not loaded');
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 36;
    const contentWidth = pageWidth - (margin * 2);
    const green = [30, 77, 43];
    const gold = [212, 183, 143];
    const cream = [248, 244, 235];
    const brown = [107, 68, 35];
    const ink = [40, 28, 16];

    const itemCount = (data.items || []).filter(function (row) { return !row.section; }).length;
    const compact = itemCount > 14;
    const bodyFont = compact ? 8 : 9;
    const cellPad = compact ? 2.5 : 3.5;

    function drawHeader() {
        doc.setFillColor(green[0], green[1], green[2]);
        doc.rect(0, 0, pageWidth, 54, 'F');
        doc.setTextColor(gold[0], gold[1], gold[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Donegal Natural Dog Treats', margin, 24);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('258 W Front St  ·  Marietta, PA 17547  ·  (800) 223-0017', margin, 40);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(String(data.title || 'INVOICE'), pageWidth - margin, 28, { align: 'right' });
        doc.setFillColor(gold[0], gold[1], gold[2]);
        doc.rect(0, 54, pageWidth, 4, 'F');
    }

    function drawFooter() {
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setDrawColor(gold[0], gold[1], gold[2]);
            doc.setLineWidth(0.6);
            doc.line(margin, pageHeight - 28, pageWidth - margin, pageHeight - 28);
            doc.setTextColor(brown[0], brown[1], brown[2]);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.text(
                'Donegal Natural Dog Treats  ·  Terms: Net 10 days  ·  Page ' + i + ' of ' + pageCount,
                pageWidth / 2,
                pageHeight - 14,
                { align: 'center' }
            );
        }
    }

    drawHeader();
    let y = 72;

    if (data.updatedBanner) {
        doc.setFillColor(194, 65, 12);
        doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(String(data.updatedBanner), margin + 8, y + 12);
        y += 26;
    }

    // Invoice meta
    const metaBoxW = (contentWidth - 10) / 2;
    doc.setFillColor(green[0], green[1], green[2]);
    doc.roundedRect(margin, y, metaBoxW, 34, 3, 3, 'F');
    doc.roundedRect(margin + metaBoxW + 10, y, metaBoxW, 34, 3, 3, 'F');
    doc.setTextColor(gold[0], gold[1], gold[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('INVOICE NO.', margin + 10, y + 12);
    doc.text('DATE', margin + metaBoxW + 20, y + 12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(String(data.number || '—'), margin + 10, y + 26);
    doc.text(String(data.date || '—'), margin + metaBoxW + 20, y + 26);
    y += 44;

    if (data.status) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(brown[0], brown[1], brown[2]);
        doc.text('Status: ' + data.status, margin, y);
        y += 14;
    }

    // Bill To / Ship To
    const addrW = metaBoxW;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    function wrappedLineCount(lines) {
        const list = lines.length ? lines : ['—'];
        let count = 0;
        list.forEach(function (line) {
            count += doc.splitTextToSize(String(line), addrW - 16).length;
        });
        return Math.max(count, 1);
    }
    const addrBoxH = Math.max(
        48,
        26 + (Math.max(wrappedLineCount(data.billTo), wrappedLineCount(data.shipTo)) * 11)
    );

    function drawAddressBox(x, label, lines) {
        doc.setDrawColor(gold[0], gold[1], gold[2]);
        doc.setFillColor(green[0], green[1], green[2]);
        doc.roundedRect(x, y, addrW, 16, 2, 2, 'F');
        doc.setTextColor(gold[0], gold[1], gold[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(label, x + 8, y + 11);
        doc.setDrawColor(gold[0], gold[1], gold[2]);
        doc.setLineWidth(0.8);
        doc.roundedRect(x, y + 16, addrW, addrBoxH - 16, 2, 2, 'S');
        doc.setTextColor(ink[0], ink[1], ink[2]);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        const list = lines.length ? lines : ['—'];
        let ly = y + 30;
        list.forEach(function (line) {
            const wrapped = doc.splitTextToSize(String(line), addrW - 16);
            wrapped.forEach(function (wline) {
                doc.text(wline, x + 8, ly);
                ly += 11;
            });
        });
    }

    drawAddressBox(margin, 'BILL TO', data.billTo);
    drawAddressBox(margin + addrW + 10, 'SHIP TO', data.shipTo);
    y += addrBoxH + 14;

    const body = (data.items || []).map(function (row) {
        if (row.section) {
            return [{ content: String(row.section), colSpan: 4, styles: { halign: 'center', fontStyle: 'bold', fillColor: cream, textColor: green, fontSize: 8 } }];
        }
        return [String(row.qty || ''), String(row.description || ''), String(row.unit || ''), String(row.total || '')];
    });

    if (!body.length) {
        body.push(['—', 'No line items', '—', '—']);
    }

    doc.autoTable({
        startY: y,
        head: [['QTY', 'DESCRIPTION', 'UNIT COST', 'TOTAL']],
        body: body,
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: bodyFont,
            textColor: ink,
            lineColor: gold,
            lineWidth: 0.4,
            cellPadding: cellPad,
            valign: 'top'
        },
        headStyles: {
            fillColor: green,
            textColor: gold,
            fontStyle: 'bold',
            fontSize: bodyFont
        },
        columnStyles: {
            0: { cellWidth: 42, fontStyle: 'bold', halign: 'left' },
            1: { cellWidth: contentWidth - 42 - 72 - 72, halign: 'left' },
            2: { cellWidth: 72, halign: 'right' },
            3: { cellWidth: 72, halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: function (hook) {
            if (hook.section === 'head' && (hook.column.index === 2 || hook.column.index === 3)) {
                hook.cell.styles.halign = 'right';
            }
        },
        margin: { left: margin, right: margin, top: 72, bottom: 40 },
        didDrawPage: function (hookData) {
            if (hookData.pageNumber > 1) drawHeader();
        }
    });

    y = doc.lastAutoTable.finalY + 12;
    const notesW = contentWidth * 0.55;
    const totalsW = contentWidth - notesW - 12;
    const notesText = data.notes || '—';
    const notesLines = doc.splitTextToSize(notesText, notesW - 16);
    const notesH = Math.max(48, 22 + (notesLines.length * 10));

    if (y + Math.max(notesH, 70) > pageHeight - 40) {
        doc.addPage();
        drawHeader();
        y = 72;
    }

    doc.setFillColor(green[0], green[1], green[2]);
    doc.roundedRect(margin, y, notesW, 16, 2, 2, 'F');
    doc.setTextColor(gold[0], gold[1], gold[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('NOTES', margin + 8, y + 11);
    doc.setDrawColor(gold[0], gold[1], gold[2]);
    doc.roundedRect(margin, y + 16, notesW, notesH - 16, 2, 2, 'S');
    doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(notesLines, margin + 8, y + 30);

    const totalsX = margin + notesW + 12;
    let ty = y + 8;
    function totalRow(label, value, opts) {
        opts = opts || {};
        doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
        doc.setFontSize(opts.size || 9);
        doc.setTextColor(opts.color ? opts.color[0] : brown[0], opts.color ? opts.color[1] : brown[1], opts.color ? opts.color[2] : brown[2]);
        doc.text(label, totalsX, ty);
        doc.text(String(value), totalsX + totalsW, ty, { align: 'right' });
        ty += opts.gap || 14;
    }

    totalRow('SUBTOTAL', data.subtotal);
    totalRow('SHIPPING', data.shipping);
    if (data.credit) totalRow('CREDIT', data.credit, { color: [153, 27, 27] });
    doc.setDrawColor(gold[0], gold[1], gold[2]);
    doc.line(totalsX, ty - 4, totalsX + totalsW, ty - 4);
    ty += 6;
    totalRow('TOTAL', data.total, { bold: true, size: 12, color: green, gap: 16 });

    y = Math.max(y + notesH, ty) + 10;
    if (y > pageHeight - 40) {
        doc.addPage();
        drawHeader();
        y = 72;
    }

    doc.setTextColor(brown[0], brown[1], brown[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Terms of payment: 10 days', pageWidth / 2, y, { align: 'center' });
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    const thanks = doc.splitTextToSize(
        'Please allow 7 to 10 business days for your order to be shipped. It has been a pleasure doing business with you. Thank you.',
        contentWidth
    );
    doc.text(thanks, pageWidth / 2, y + 12, { align: 'center' });

    drawFooter();
    return doc;
}

async function downloadOrderInvoice() {
    if (typeof loadPdfLibs === 'function') {
        try { await loadPdfLibs(); } catch (e) {}
    }

    const modal = document.getElementById('order-invoice-modal');
    if (!modal || modal.classList.contains('hidden')) {
        alert('Open an invoice first.');
        return;
    }

    const data = collectInvoiceSheetData();
    if (!data) {
        alert('Open an invoice first.');
        return;
    }

    const btn = document.getElementById('inv-download-btn') || document.getElementById('sm-inv-download-btn');
    if (btn && btn.getAttribute('data-busy') === '1') return;
    const prevLabel = btn ? btn.textContent : 'Download';
    if (btn) {
        btn.setAttribute('data-busy', '1');
        btn.disabled = true;
        btn.textContent = 'Downloading…';
    }

    try {
        const doc = buildInvoicePdfFromData(data);
        doc.save(invoiceDownloadFilename());
    } catch (err) {
        console.error('downloadOrderInvoice', err);
        alert('Could not download the invoice. Try Print and choose Save as PDF.');
    } finally {
        if (btn) {
            btn.removeAttribute('data-busy');
            btn.disabled = false;
            btn.textContent = prevLabel || 'Download';
        }
    }
}

function setInvoiceStatusBadge(text) {
    const el = document.getElementById('inv-status');
    if (!el) return;
    const value = String(text || '').trim();
    if (!value || value === '—') {
        el.textContent = '';
        el.classList.add('hidden');
        return;
    }
    el.textContent = value;
    el.classList.remove('hidden');
}

window.invoiceDownloadFilename = invoiceDownloadFilename;
window.collectInvoiceSheetData = collectInvoiceSheetData;
window.buildInvoicePdfFromData = buildInvoicePdfFromData;
window.downloadOrderInvoice = downloadOrderInvoice;
window.setInvoiceStatusBadge = setInvoiceStatusBadge;
