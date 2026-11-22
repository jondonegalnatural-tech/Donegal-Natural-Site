/**
 * Shared customer packaging helpers (That Fish That Pet Place item # / UPC / cigar tags).
 * Used by place-order, invoice modals, and PDF download.
 */

function packagingNameKey(name) {
    return String(name || '')
        .toLowerCase()
        .replace(/[“”"']/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function isTftppCustomer(customer) {
    const blob = [
        customer && customer.company,
        customer && customer.name,
        customer && customer.customer_company
    ].join(' ').toLowerCase();
    return blob.indexOf('that fish that pet') !== -1;
}

const TFTPP_PACKAGING = {
    'super meaty beef tendons (bulk)': { itemNumber: '299669', sku: 'SMBT', upcCode: '016925578821', upc: false, cigar: false },
    'super meaty beef tendons': { itemNumber: '299669', sku: 'SMBT', upcCode: '016925578821', upc: false, cigar: false },
    'crunchy duck feet': { itemNumber: '299670', sku: 'CDF', upcCode: '016925123885', upc: false, cigar: false },
    'phat honey smoked rollio cheek chew 10-12in': { itemNumber: '299671', sku: 'PH10HS', upcCode: '016925120006', upc: true, cigar: false },
    '10-12 phat honey smoked rollio (bulk)': { itemNumber: '299671', sku: 'PH10HS', upcCode: '016925120006', upc: true, cigar: false },
    'peanut butter stuffed rollio cheek chew 10-12in': { itemNumber: '299672', sku: 'NPBROLL10', upcCode: '016925632226', upc: true, cigar: false },
    '10-12 peanut butter rollio (bulk)': { itemNumber: '299672', sku: 'NPBROLL10', upcCode: '016925632226', upc: true, cigar: false },
    'crunchy chicken feet': { itemNumber: '299673', sku: 'CFT', upcCode: '016925170025', upc: false, cigar: false },
    'jumbo meaty femur bone 14-16in': { itemNumber: '299674', sku: '', upcCode: '001692527274', upc: false, cigar: false },
    '14-16 jumbo meaty femur': { itemNumber: '299674', sku: '', upcCode: '001692527274', upc: false, cigar: false },
    'beef lung 16oz. bag': { itemNumber: '299676', sku: '16LUNG', upcCode: '016925450165', upc: true, cigar: false },
    '16oz. bag of beef lung': { itemNumber: '299676', sku: '16LUNG', upcCode: '016925450165', upc: true, cigar: false },
    'honey smoked buffalo ear': { itemNumber: '299677', sku: 'MHBUFF', upcCode: '016925741119', upc: false, cigar: false },
    'lamb ear': { itemNumber: '299678', sku: 'LAMB', upcCode: '', upc: false, cigar: false },
    '32-36 bully cane': { itemNumber: '302291', sku: 'GRC36', upcCode: '', upc: false, cigar: true },
    'bully cane 32-36in': { itemNumber: '302291', sku: 'GRC36', upcCode: '', upc: false, cigar: true },
    '6 regular green line bully sticks (bulk)': { itemNumber: '302667', sku: 'GRPZ6', upcCode: '016925026674', upc: false, cigar: true },
    'green line bully stick 6in': { itemNumber: '302667', sku: 'GRPZ6', upcCode: '016925026674', upc: false, cigar: true },
    '12 regular green line bully sticks (bulk)': { itemNumber: '302684', sku: 'GRPZ12', upcCode: '016925026841', upc: false, cigar: true },
    'green line bully stick 12in': { itemNumber: '302684', sku: 'GRPZ12', upcCode: '016925026841', upc: false, cigar: true },
    '6 thick green line bully sticks (bulk)': { itemNumber: '302685', sku: 'grth6', upcCode: '016925026858', upc: false, cigar: true },
    'thick green line bully stick 6in': { itemNumber: '302685', sku: 'grth6', upcCode: '016925026858', upc: false, cigar: true },
    '12 thick green line bully sticks (bulk)': { itemNumber: '302686', sku: 'grth12', upcCode: '016925026865', upc: false, cigar: true },
    'thick green line bully stick 12in': { itemNumber: '302686', sku: 'grth12', upcCode: '016925026865', upc: false, cigar: true },
    '10-12 regular rollio (bulk)': { itemNumber: '302687', sku: 'ROLL', upcCode: '016925026872', upc: true, cigar: false },
    'rollio rolled cow cheek 10in': { itemNumber: '302687', sku: 'ROLL', upcCode: '016925026872', upc: true, cigar: false },
    '10-12 honey smoked rollio (bulk)': { itemNumber: '302688', sku: 'ROLLHS', upcCode: '016925026889', upc: true, cigar: false },
    'honey smoked rollio rolled cow cheek 10in': { itemNumber: '302688', sku: 'ROLLHS', upcCode: '016925026889', upc: true, cigar: false },
    '5-6 regular rollio (bulk)': { itemNumber: '302689', sku: '5ROLL', upcCode: '016925026896', upc: true, cigar: false },
    'rollio rolled cow cheek 5in': { itemNumber: '302689', sku: '5ROLL', upcCode: '016925026896', upc: true, cigar: false },
    '5-6 honey smoked rollio (bulk)': { itemNumber: '302690', sku: '5ROLLH', upcCode: '016925026902', upc: true, cigar: false },
    'honey smoked rollio rolled cow cheek 5in': { itemNumber: '302690', sku: '5ROLLH', upcCode: '016925026902', upc: true, cigar: false },
    '5-6 phat rollio (bulk)': { itemNumber: '302691', sku: 'PH5', upcCode: '016925026919', upc: true, cigar: false },
    'phat rollio 5-6in': { itemNumber: '302691', sku: 'PH5', upcCode: '016925026919', upc: true, cigar: false },
    '10-12 phat rollio (bulk)': { itemNumber: '302692', sku: 'PH10', upcCode: '016925026926', upc: true, cigar: false },
    'phat rollio 10-12in': { itemNumber: '302692', sku: 'PH10', upcCode: '016925026926', upc: true, cigar: false },
    '12 beef wrapped corium (bulk)': { itemNumber: '302694', sku: '', upcCode: '016925026940', upc: false, cigar: true },
    'beef wrapped corium 12in': { itemNumber: '302694', sku: '', upcCode: '016925026940', upc: false, cigar: true },
    '6 beef wrapped corium (bulk)': { itemNumber: '302695', sku: '', upcCode: '016925026957', upc: false, cigar: true },
    'beef wrapped corium 6in': { itemNumber: '302695', sku: '', upcCode: '016925026957', upc: false, cigar: true },
    '6 corium sticks (bulk)': { itemNumber: '302696', sku: '', upcCode: '', upc: false, cigar: true },
    'corium stick 6in': { itemNumber: '302696', sku: '', upcCode: '', upc: false, cigar: true },
    '12 corium sticks (bulk)': { itemNumber: '302697', sku: '', upcCode: '', upc: false, cigar: true },
    'corium stick 12in': { itemNumber: '302697', sku: '', upcCode: '', upc: false, cigar: true },
    'usa elky jerky treats (bulk)': { itemNumber: '302699', sku: 'ELKD', upcCode: '', upc: false, cigar: false },
    'elky jerky treats': { itemNumber: '302699', sku: 'ELKD', upcCode: '', upc: false, cigar: false },
    'usa turkey jerky treats (bulk)': { itemNumber: '302704', sku: 'TURKD', upcCode: '', upc: false, cigar: false },
    'turkey jerky treats': { itemNumber: '302704', sku: 'TURKD', upcCode: '', upc: false, cigar: false },
    '10-13 beef trachea': { itemNumber: '302705', sku: 'TRACH10', upcCode: '016925027053', upc: true, cigar: false },
    'beef trachea 10-13in': { itemNumber: '302705', sku: 'TRACH10', upcCode: '016925027053', upc: true, cigar: false },
    '5-6 beef trachea': { itemNumber: '302709', sku: 'TRACH5', upcCode: '016925027091', upc: true, cigar: false },
    'beef trachea 5-6in': { itemNumber: '302709', sku: 'TRACH5', upcCode: '016925027091', upc: true, cigar: false },
    'white ox tails 12in': { itemNumber: '302710', sku: 'OX12', upcCode: '', upc: false, cigar: true },
    '12 white ox tails': { itemNumber: '302710', sku: 'OX12', upcCode: '', upc: false, cigar: true }
};

function lookupTftppPackaging(productName) {
    const key = packagingNameKey(productName);
    if (TFTPP_PACKAGING[key]) return TFTPP_PACKAGING[key];
    const names = Object.keys(TFTPP_PACKAGING);
    for (let i = 0; i < names.length; i++) {
        if (key.indexOf(names[i]) !== -1 || names[i].indexOf(key) !== -1) return TFTPP_PACKAGING[names[i]];
    }
    return null;
}

function applyCustomerPackagingToItem(item, customer) {
    if (!item) return item;
    if (item.itemNumber || item.upcCode || item.needsUpcLabel || item.needsCigarTag) return item;
    if (!isTftppCustomer(customer)) return item;
    const row = lookupTftppPackaging(item.name || item.product || item.displayName);
    if (!row) return item;
    item.itemNumber = row.itemNumber || '';
    item.skuCode = row.sku || '';
    item.upcCode = row.upcCode || '';
    item.needsUpcLabel = !!row.upc;
    item.needsCigarTag = !!row.cigar;
    return item;
}

function packagingNoteText(item) {
    const bits = [];
    if (item.itemNumber) bits.push('#' + item.itemNumber);
    if (item.skuCode) bits.push(item.skuCode);
    if (item.upcCode) bits.push('UPC ' + item.upcCode);
    if (item.needsUpcLabel) bits.push('UPC + Label');
    if (item.needsCigarTag) bits.push('Cigar Tag');
    return bits.join(' · ');
}


function invoicePackagingCustomerFromOrder(order, customer) {
    const o = order || {};
    const c = customer || {};
    return {
        name: c.name || o.customer || o.customer_name || '',
        company: c.company || o.customerCompany || o.customer_company || c.name || '',
        customer_company: c.customer_company || o.customer_company || o.customerCompany || ''
    };
}

function enrichInvoiceLineItem(item, order, customer) {
    const line = Object.assign({}, item || {});
    applyCustomerPackagingToItem(line, invoicePackagingCustomerFromOrder(order, customer));
    return line;
}

function invoiceLineDescriptionHtml(item, extras) {
    extras = extras || {};
    const name = typeof orderLineDisplayName === 'function'
        ? orderLineDisplayName(item)
        : ((item && (item.displayName || item.product || item.name)) || '—');
    const caseSize = item && item.caseSize ? (' · ' + item.caseSize) : '';
    const note = packagingNoteText(item);
    const market = extras.marketNoteHtml || '';
    let html = (typeof escapeHtml === 'function' ? escapeHtml(name + caseSize) : (name + caseSize));
    if (note) {
        const safe = typeof escapeHtml === 'function' ? escapeHtml(note) : note;
        html += '<div class="invoice-packaging-note text-[11px] font-semibold text-[#6B4423] mt-0.5">' + safe + '</div>';
    }
    if (market) html += market;
    return html;
}

function invoiceLineDescriptionText(item) {
    const name = typeof orderLineDisplayName === 'function'
        ? orderLineDisplayName(item)
        : ((item && (item.displayName || item.product || item.name)) || '—');
    const caseSize = item && item.caseSize ? (' · ' + item.caseSize) : '';
    const note = packagingNoteText(item);
    return note ? (name + caseSize + '\n' + note) : (name + caseSize);
}

window.packagingNameKey = packagingNameKey;
window.isTftppCustomer = isTftppCustomer;
window.lookupTftppPackaging = lookupTftppPackaging;
window.applyCustomerPackagingToItem = applyCustomerPackagingToItem;
window.packagingNoteText = packagingNoteText;
window.invoicePackagingCustomerFromOrder = invoicePackagingCustomerFromOrder;
window.enrichInvoiceLineItem = enrichInvoiceLineItem;
window.invoiceLineDescriptionHtml = invoiceLineDescriptionHtml;
window.invoiceLineDescriptionText = invoiceLineDescriptionText;
