function generateInvoiceNumber() {
    // DN-XXXXX — 5 chars, skip ambiguous 0/O/1/I
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return 'DN-' + code;
}

function displayInvoiceNumber(order) {
    return order?.invoice_number || order?.invoiceNumber || order?.id || '—';
}

function orderHasUpdateNote(order) {
    return /ORDER UPDATED/i.test(String((order && (order.notes || order.changeLog)) || ''));
}

function markInvoiceUpdatedState(order) {
    const titleEl = document.getElementById('inv-title');
    const bannerEl = document.getElementById('inv-updated-banner');
    const updated = orderHasUpdateNote(order);
    if (titleEl) titleEl.textContent = updated ? 'UPDATED INVOICE' : 'INVOICE';
    if (bannerEl) {
        if (updated) {
            const match = String(order.notes || '').match(/Edited:\s*(.+)/i);
            bannerEl.textContent = match
                ? ('THIS ORDER HAS BEEN UPDATED  ·  ' + match[1].trim())
                : 'THIS ORDER HAS BEEN UPDATED';
            bannerEl.classList.remove('hidden');
        } else {
            bannerEl.classList.add('hidden');
        }
    }
}

function fmtMoney(n) {
    const v = Number(n);
    if (Number.isNaN(v)) return '—';
    return '$' + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString();
    } catch {
        return iso;
    }
}

window.generateInvoiceNumber = generateInvoiceNumber;
window.displayInvoiceNumber = displayInvoiceNumber;
window.orderHasUpdateNote = orderHasUpdateNote;
window.markInvoiceUpdatedState = markInvoiceUpdatedState;
window.fmtMoney = fmtMoney;
window.fmtDate = fmtDate;

function showTableLoading(containerId, message) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `<p class="text-center text-[#6B4423] py-10"><i class="fas fa-spinner fa-spin mr-2"></i>${message || 'Loading…'}</p>`;
}
window.showTableLoading = showTableLoading;
