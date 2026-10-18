// Internal portal — salesman detail and price-sheet editor.
// Shared state (salesmen, allCustomers, PRODUCT_CATALOG, supabaseClient)
// stays global in internal-portal.js.
function showSalesmanDetail(salesmanId = null) {
    const modal = document.getElementById('salesman-modal');
    if (!modal) {
        console.error('ERROR: salesman-modal not found in HTML');
        return;
    }

    // Prefer the salesman that was clicked; fall back to first if needed
    let salesman = null;
    if (salesmanId != null) {
        salesman = salesmen.find(s => String(s.id) === String(salesmanId));
    }
    if (!salesman && salesmen.length > 0) {
        salesman = salesmen[0];
    }
    if (!salesman) {
        console.error('No salesman data available');
        return;
    }

    // Remember which salesman is open so save can target the right row
    modal.dataset.salesmanId = salesman.id || '';

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };
    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value;
    };

    const displayName = salesman.name
        || [salesman.firstName, salesman.lastName].filter(Boolean).join(' ')
        || 'Salesman';

    setText('modal-salesman-name', displayName);
    setText('modal-territory', salesman.territory || 'N/A');
    const lastLoginWrap = document.getElementById('modal-last-login-wrap');
    const isJackermanSalesman = (salesman.email || '').toLowerCase().trim() === 'jackerman@donegalnatural.com';
    if (lastLoginWrap) lastLoginWrap.classList.toggle('hidden', isJackermanSalesman);
    const resetPasswordBtn = document.getElementById('modal-reset-password-btn');
    if (resetPasswordBtn) resetPasswordBtn.classList.toggle('hidden', isJackermanSalesman);
    if (!isJackermanSalesman) {
        setText(
            'modal-last-login',
            salesman.lastLoginAt ? new Date(salesman.lastLoginAt).toLocaleString() : 'Never'
        );
    }
    setText('modal-commission', (salesman.commission != null ? salesman.commission : 8) + '%');
    setText('modal-market-commission', (salesman.marketCommission != null ? salesman.marketCommission : 3) + '%');

    const totals = typeof getSalesmanOrderTotals === 'function'
        ? getSalesmanOrderTotals(salesman)
        : { yearly: 0, monthly: 0 };
    setText('modal-yearly-sales', '$' + Math.round(totals.yearly).toLocaleString());
    setText('modal-monthly-sales', '$' + Math.round(totals.monthly).toLocaleString());
    setText('modal-quotes', salesman.quotesSubmitted || 0);
        // Initial pricing sheet status + actions
    const sheetStatusEl = document.getElementById('modal-price-sheet-status');
    const sheetCustomersEl = document.getElementById('modal-price-sheet-customers');
    const viewSheetBtn = document.getElementById('modal-view-price-sheet-btn');
    const resetSheetBtn = document.getElementById('modal-reset-price-sheet-btn');

    const statusRaw = (salesman.priceSheetStatus || '').toLowerCase();
    let statusLabel = 'Not submitted';
    if (statusRaw === 'approved') statusLabel = 'Approved';
    else if (statusRaw === 'pending' || statusRaw === 'submitted') statusLabel = 'Pending review';
    else if (statusRaw === 'required') statusLabel = 'Required (not yet approved)';
    if (sheetStatusEl) sheetStatusEl.textContent = statusLabel;

    if (viewSheetBtn) viewSheetBtn.classList.add('hidden');
    if (resetSheetBtn) resetSheetBtn.classList.add('hidden');
    if (sheetCustomersEl) sheetCustomersEl.textContent = '';

    if (statusRaw === 'approved') {
        if (viewSheetBtn) viewSheetBtn.classList.remove('hidden');
        if (resetSheetBtn) resetSheetBtn.classList.remove('hidden');
        // Count customers unlocked under this salesman
        const email = (salesman.email || '').toLowerCase().trim();
        if (email && sheetCustomersEl) {
            (async () => {
                try {
                    const { count, error } = await supabaseClient
                        .from('customers')
                        .select('id', { count: 'exact', head: true })
                        .eq('salesman_email', email)
                        .not('pricing_approved_at', 'is', null);
                    if (!error && sheetCustomersEl) {
                        sheetCustomersEl.textContent = (count || 0) + ' customer(s) currently have pricing unlocked under this salesman.';
                    }
                } catch (e) {
                    console.warn('price sheet customer count:', e);
                }
            })();
        }
    }
    setValue('modal-notes', salesman.notes || '');
    loadSalesmanCardCustomers(salesman.email);

    modal.style.display = 'flex';
    modal.classList.remove('hidden');
}

async function loadSalesmanCardCustomers(salesmanEmail) {
    const box = document.getElementById('modal-salesman-customers');
    if (!box) return;
    const email = (salesmanEmail || '').toLowerCase().trim();
    if (!email) {
        box.innerHTML = '<p class="text-xs text-[#6B4423]">No salesman email on file.</p>';
        return;
    }
    let list = [];
    try {
        const { data, error } = await supabaseClient
            .from('customers')
            .select('id, name, company, email, salesman_email')
            .eq('salesman_email', email)
            .order('name', { ascending: true });
        if (error) throw error;
        list = data || [];
    } catch (err) {
        console.error('loadSalesmanCardCustomers:', err);
        box.innerHTML = '<p class="text-xs text-red-700">Could not load customers.</p>';
        return;
    }
    if (!list.length) {
        box.innerHTML = '<p class="text-xs text-[#6B4423]">No customers assigned.</p>';
        return;
    }
    box.innerHTML = list.map(function (c) {
        const id = String(c.id || '').replace(/'/g, '');
        return (
            '<button type="button" onclick="openCustomerFromSalesmanCard(\'' + id + '\')" ' +
            'class="w-full text-left p-3 border border-[#d4b78f] rounded-xl hover:bg-[#f8f4eb]">' +
            '<p class="font-semibold brand-green truncate">' + escapeHtml(c.name || '—') + '</p>' +
            '<p class="text-xs text-[#6B4423] truncate">' + escapeHtml(c.company || c.email || '') + '</p>' +
            '</button>'
        );
    }).join('');
}

function openCustomerFromSalesmanCard(customerId) {
    const customer = (allCustomers || []).find(function (c) {
        return String(c.id) === String(customerId);
    });
    if (!customer) {
        alert('Customer not found.');
        return;
    }
    showCustomerDetail(customer.name);
}

function openCustomerPriceVsBaseFromModal() {
    const modal = document.getElementById('customer-modal');
    const id = modal && modal.dataset ? modal.dataset.customerId : '';
    if (!id) {
        alert('Missing customer id.');
        return;
    }
    openReportsCustomerPriceSheet(id);
}

/**
 * Shared categorized price-sheet table for the #salesman-price-sheet-modal.
 * Mirrors exportPriceSheetPdf grouping:
 *   - PRODUCT_CATALOG category order (first-seen)
 *   - alphabetical within category
 *   - unmatched products under "Other"
 * Columns: Product | Case Size | Unit Price
 * @param {Object} prices  { productName: number }
 * @param {HTMLElement} listEl
 * @returns {number} number of products rendered
 */

function salesmanSheetDisplayName(catalogName) {
    const map = window._spsDisplayNames || {};
    const nick = String((map && map[catalogName]) || '').replace(/\s+/g, ' ').trim();
    return nick || catalogName || '';
}

function collectSalesmanDisplayNames() {
    const next = Object.assign({}, window._spsDisplayNames || {});
    document.querySelectorAll('#price-sheet-modal-list input.sps-name').forEach(function (inp) {
        let catalog = inp.getAttribute('data-name') || '';
        try { catalog = decodeURIComponent(catalog); } catch (err) {}
        if (!catalog) return;
        const nick = String(inp.value || '').replace(/\s+/g, ' ').trim();
        if (!nick || nick === catalog) {
            delete next[catalog];
            return;
        }
        next[catalog] = nick;
    });
    return next;
}

function orderLineDisplayName(item) {
    const nick = String((item && item.displayName) || '').replace(/\s+/g, ' ').trim();
    if (nick) return nick;
    return (item && (item.product || item.name)) || '—';
}

function normalizeSalesmanSheetName(name) {
    return String(name || '')
        .toLowerCase()
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/,/g, '')
        .replace(/\./g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function salesmanSheetNameMatches(a, b) {
    return normalizeSalesmanSheetName(a) === normalizeSalesmanSheetName(b);
}

function isSalesmanSheetHidden(name) {
    const hidden = window._spsHiddenPrices || {};
    if (!name) return false;
    if (Object.prototype.hasOwnProperty.call(hidden, name)) return true;
    return Object.keys(hidden).some(function (key) {
        return salesmanSheetNameMatches(key, name);
    });
}

function toggleSalesmanSheetHideSelectAll(master) {
    const on = !!(master && master.checked);
    document.querySelectorAll('.sps-hide-cb').forEach(function (cb) { cb.checked = on; });
}

function hideSalesmanSheetItemCore(catalogName) {
    if (!catalogName || !window._spsSheet) return false;
    if (!window._spsHiddenPrices || typeof window._spsHiddenPrices !== 'object') {
        window._spsHiddenPrices = {};
    }
    const raw = window._spsSheet.prices ? window._spsSheet.prices[catalogName] : null;
    const n = Number(raw);
    window._spsHiddenPrices[catalogName] = isNaN(n) ? raw : n;
    if (window._spsSheet.prices) delete window._spsSheet.prices[catalogName];
    if (window._spsExport && window._spsExport.prices) delete window._spsExport.prices[catalogName];
    return true;
}

async function hideSelectedSalesmanSheetItems() {
    const names = Array.from(document.querySelectorAll('.sps-hide-cb:checked')).map(function (cb) {
        try { return decodeURIComponent(cb.value || ''); } catch (e) { return cb.value || ''; }
    }).filter(Boolean);
    if (!names.length) {
        alert('Select at least one item to hide.');
        return;
    }
    if (!confirm('Hide ' + names.length + ' item(s) from THIS salesman only?\n\n' +
        'Other salesmen keep these items.\n' +
        'Assigned stores for this salesman will lose them after Save & Push.\n' +
        'Company Base is unchanged.')) return;
    if (window._spsEditing && typeof collectSalesmanPriceSheetInputs === 'function') {
        window._spsSheet.prices = collectSalesmanPriceSheetInputs();
    }
    let hidden = 0;
    names.forEach(function (name) {
        if (hideSalesmanSheetItemCore(name)) hidden += 1;
    });
    if (typeof logAdminActivity === 'function') {
        logAdminActivity({
            action: 'hide',
            entityType: 'product',
            entityLabel: names.slice(0, 8).join(', ') + (names.length > 8 ? '…' : ''),
            summary: 'Hid ' + hidden + ' item(s) from ' + ((window._spsSheet && window._spsSheet.name) || 'salesman sheet')
        });
    }
    const listEl = document.getElementById('price-sheet-modal-list');
    if (typeof renderCategorizedPriceSheetTable === 'function') {
        renderCategorizedPriceSheetTable(window._spsSheet.prices || {}, listEl);
    }
    if (typeof renderSalesmanHiddenMenu === 'function') renderSalesmanHiddenMenu();
    if (typeof saveSalesmanPriceSheetAndPush === 'function') {
        await saveSalesmanPriceSheetAndPush({ silent: true });
    }
    alert('Hid ' + hidden + ' item(s) from this salesman only.');
}

function hideSalesmanSheetItem(catalogName) {
    if (!catalogName || !window._spsSheet) return;
    const hideLabel = (typeof salesmanSheetDisplayName === 'function')
        ? salesmanSheetDisplayName(catalogName)
        : catalogName;
    if (!confirm('Hide "' + hideLabel + '" from THIS salesman only?\n\n' +
        'Other salesmen keep the item.\n' +
        'Assigned stores for this salesman will lose it after Save & Push.\n' +
        'Company Base is unchanged.\n' +
        'Use Discontinue on the Company Base sheet to hide it from every salesman.')) return;
    if (window._spsEditing && typeof collectSalesmanPriceSheetInputs === 'function') {
        window._spsSheet.prices = collectSalesmanPriceSheetInputs();
    }
    hideSalesmanSheetItemCore(catalogName);
    if (typeof logAdminActivity === 'function') {
        logAdminActivity({
            action: 'hide',
            entityType: 'product',
            entityLabel: catalogName,
            summary: 'Hidden from ' + ((window._spsSheet && window._spsSheet.name) || 'salesman sheet')
        });
    }
    const listEl = document.getElementById('price-sheet-modal-list');
    renderCategorizedPriceSheetTable(window._spsSheet.prices || {}, listEl);
    if (typeof saveSalesmanPriceSheetAndPush === 'function') {
        saveSalesmanPriceSheetAndPush({ silent: true });
    }
}

function unhideSalesmanSheetItem(catalogName) {
    if (!catalogName || !window._spsSheet) return;
    const showLabel = (typeof salesmanSheetDisplayName === 'function')
        ? salesmanSheetDisplayName(catalogName)
        : catalogName;
    if (!confirm('Unhide "' + showLabel + '" and put it back on assigned store cards?')) return;
    const hidden = window._spsHiddenPrices || {};
    const raw = hidden[catalogName];
    const n = Number(raw);
    if (!window._spsSheet.prices || typeof window._spsSheet.prices !== 'object') {
        window._spsSheet.prices = {};
    }
    if (!isNaN(n)) {
        window._spsSheet.prices[catalogName] = n;
    } else if (typeof PRODUCT_CATALOG !== 'undefined') {
        const catalog = PRODUCT_CATALOG.find(function (p) { return p && p.name === catalogName; });
        if (catalog && catalog.unitPrice != null && !isNaN(Number(catalog.unitPrice))) {
            window._spsSheet.prices[catalogName] = Number(catalog.unitPrice);
        }
    }
    restoreSalesmanHiddenItem(catalogName);
    if (typeof logAdminActivity === 'function') {
        logAdminActivity({
            action: 'unhide',
            entityType: 'product',
            entityLabel: catalogName,
            summary: 'Shown again on ' + ((window._spsSheet && window._spsSheet.name) || 'salesman sheet')
        });
    }
    const listEl = document.getElementById('price-sheet-modal-list');
    renderCategorizedPriceSheetTable(window._spsSheet.prices || {}, listEl);
    if (typeof renderSalesmanHiddenMenu === 'function') renderSalesmanHiddenMenu();
    if (typeof saveSalesmanPriceSheetAndPush === 'function') {
        saveSalesmanPriceSheetAndPush({ silent: true });
    }
}

function openSalesmanHiddenModal() {
    const modal = document.getElementById('sps-hidden-modal');
    if (!modal) return;
    if (typeof renderSalesmanHiddenMenu === 'function') renderSalesmanHiddenMenu();
    modal.classList.remove('hidden');
}

function hideSalesmanHiddenModal() {
    const modal = document.getElementById('sps-hidden-modal');
    if (!modal) return;
    modal.classList.add('hidden');
}

function renderSalesmanHiddenMenu() {
    const btn = document.getElementById('sps-hidden-btn');
    const list = document.getElementById('sps-hidden-modal-list');
    const names = Object.keys(window._spsHiddenPrices || {}).sort();
    const count = names.length;
    if (btn) {
        btn.textContent = 'Hidden (' + count + ')';
        if (count) {
            btn.className = 'px-5 py-2 rounded-xl font-semibold bg-[#1E4D2B] text-[#d4b78f]';
        } else {
            btn.className = 'px-5 py-2 border-2 border-[#6B4423] rounded-xl hover:bg-[#f8f4eb] font-semibold';
        }
    }
    if (!list) return;
    if (!count) {
        list.innerHTML = '<p class="text-sm text-[#6B4423]">No hidden items.</p>';
        return;
    }
    list.innerHTML = names.map(function (name) {
        const raw = window._spsHiddenPrices[name];
        const n = Number(raw);
        const priceText = isNaN(n) ? '' : (' · $' + n.toFixed(2));
        return '<label class="flex items-start gap-3 py-2 border-b border-[#e8d9b8] cursor-pointer">' +
            '<input type="checkbox" class="sps-hidden-cb mt-1 accent-[#1E4D2B]" value="' +
            encodeURIComponent(name) + '">' +
            '<span class="text-sm min-w-0 flex-1">' + escapeHtml(salesmanSheetDisplayName(name)) +
            '<span class="block text-xs text-[#6B4423]">Catalog: ' + escapeHtml(name) + priceText + '</span></span>' +
            '</label>';
    }).join('');
}

function toggleSalesmanHiddenSelectAll() {
    const boxes = Array.from(document.querySelectorAll('.sps-hidden-cb'));
    if (!boxes.length) return;
    const allOn = boxes.every(function (cb) { return cb.checked; });
    boxes.forEach(function (cb) { cb.checked = !allOn; });
}

function restoreSalesmanHiddenItem(catalogName) {
    if (!catalogName || !window._spsSheet) return false;
    const hidden = window._spsHiddenPrices || {};
    if (!Object.prototype.hasOwnProperty.call(hidden, catalogName)) return false;
    const raw = hidden[catalogName];
    const n = Number(raw);
    if (!window._spsSheet.prices || typeof window._spsSheet.prices !== 'object') {
        window._spsSheet.prices = {};
    }
    if (!isNaN(n)) {
        window._spsSheet.prices[catalogName] = n;
    } else if (typeof PRODUCT_CATALOG !== 'undefined') {
        const catalog = PRODUCT_CATALOG.find(function (p) { return p && p.name === catalogName; });
        if (catalog && catalog.unitPrice != null && !isNaN(Number(catalog.unitPrice))) {
            window._spsSheet.prices[catalogName] = Number(catalog.unitPrice);
        }
    }
    delete hidden[catalogName];
    window._spsHiddenPrices = hidden;
    return true;
}

async function unhideSelectedSalesmanSheetItems() {
    const names = Array.from(document.querySelectorAll('.sps-hidden-cb:checked')).map(function (cb) {
        try { return decodeURIComponent(cb.value || ''); } catch (e) { return cb.value || ''; }
    }).filter(Boolean);
    if (!names.length) {
        alert('Select at least one hidden item.');
        return;
    }
    if (!confirm('Unhide ' + names.length + ' item(s) and put them back on assigned store cards?')) return;
    let restored = 0;
    names.forEach(function (name) {
        if (restoreSalesmanHiddenItem(name)) restored += 1;
    });
    if (typeof logAdminActivity === 'function') {
        logAdminActivity({
            action: 'unhide',
            entityType: 'product',
            entityLabel: names.slice(0, 8).join(', ') + (names.length > 8 ? '…' : ''),
            summary: 'Unhid ' + restored + ' item(s) on ' + ((window._spsSheet && window._spsSheet.name) || 'salesman sheet')
        });
    }
    const listEl = document.getElementById('price-sheet-modal-list');
    if (typeof renderCategorizedPriceSheetTable === 'function') {
        renderCategorizedPriceSheetTable(window._spsSheet.prices || {}, listEl);
    }
    if (typeof renderSalesmanHiddenMenu === 'function') renderSalesmanHiddenMenu();
    if (typeof saveSalesmanPriceSheetAndPush === 'function') {
        await saveSalesmanPriceSheetAndPush({ silent: true });
    }
    alert('Unhid ' + restored + ' item(s).');
}

function renderCategorizedPriceSheetTable(prices, listEl) {
    if (!listEl) return 0;
    const source = (prices && typeof prices === 'object') ? prices : {};

    const catalogByName = {};
    if (typeof PRODUCT_CATALOG !== 'undefined') {
        PRODUCT_CATALOG.forEach(function (p) {
            if (p && p.name) catalogByName[p.name] = p;
        });
    }

    const nameSet = {};
    Object.keys(source).forEach(function (name) {
        if (name) nameSet[name] = true;
    });

    const grouped = {};
    const unmatched = [];

    Object.keys(nameSet).forEach(function (name) {
        if (isSalesmanSheetHidden(name)) return;
        const catalog = catalogByName[name];
        const raw = source[name];
        const fromSheet = raw != null && raw !== '' && !isNaN(Number(raw));
        const fromCatalog = catalog && catalog.unitPrice != null && catalog.unitPrice !== '' && !isNaN(Number(catalog.unitPrice));
        const price = fromSheet ? Number(raw) : (fromCatalog ? Number(catalog.unitPrice) : NaN);
        if (!name) return;
        if (isNaN(price) && !window._spsEditing) return;
        const row = {
            name: name,
            caseSize: catalog ? (catalog.caseSize || '') : '',
            price: price,
            priceAsOf: catalog ? (catalog.priceAsOf || '—') : '—'
        };
        const cats = priceSheetDisplayCategories(name, catalog);
        if (cats.length) {
            cats.forEach(function (cat) {
                if (!grouped[cat]) grouped[cat] = [];
                grouped[cat].push(row);
            });
        } else {
            unmatched.push(row);
        }
    });

    function adminSheetItemKey(name) {
        const raw = String(name || '').toLowerCase().replace(/[“”"]/g, '');
        const pack = parseInt(raw, 10) || 0;
        const lengthMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:”|"|')/);
        const length = lengthMatch ? Number(lengthMatch[1]) : 0;
        let style = 'zzz';
        if (/euro/.test(raw)) style = 'euro';
        else if (/braided/.test(raw)) style = 'braided';
        else if (/cane/.test(raw)) style = 'cane';
        else if (/super thick/.test(raw)) style = 'super thick';
        else if (/thin/.test(raw)) style = 'thin';
        else if (/regular/.test(raw)) style = 'regular';
        else if (/monster/.test(raw)) style = 'monster';
        else if (/natural/.test(raw)) style = 'natural';
        else if (/vanilla/.test(raw)) style = 'vanilla';
        else if (/honey/.test(raw)) style = 'honey';
        else if (/phat/.test(raw)) style = 'phat';
        return style + ' ' + String(length).padStart(4, '0') + ' ' + String(pack).padStart(4, '0') + ' ' + raw;
    }
    Object.keys(grouped).forEach(function (cat) {
        grouped[cat].sort(function (a, b) {
            return adminSheetItemKey(a.name).localeCompare(adminSheetItemKey(b.name));
        });
    });
    unmatched.sort(function (a, b) {
        return adminSheetItemKey(a.name).localeCompare(adminSheetItemKey(b.name));
    });

    const categories = Object.keys(grouped).sort();
    if (unmatched.length) categories.push('Other');

    let total = 0;
    categories.forEach(function (cat) {
        total += (cat === 'Other' ? unmatched : (grouped[cat] || [])).length;
    });

    if (total === 0) {
        listEl.innerHTML = '<p class="text-sm text-[#6B4423]">Price sheet is empty.</p>';
        return 0;
    }

    const editing = !!window._spsEditing;
    let html = '';

    categories.forEach(function (cat) {
        const rows = cat === 'Other' ? unmatched : grouped[cat];
        if (!rows || !rows.length) return;

        html += `
            <div>
                <h3 class="text-base font-bold brand-green mb-2 border-b border-[#d4b78f] pb-1">${escapeHtml(cat)}</h3>
                <div class="overflow-x-auto border border-[#d4b78f] rounded-xl mb-4">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="bg-[#1E4D2B] text-[#d4b78f]">
                                <th class="p-2.5 text-left">Product</th>
                                <th class="p-2.5 text-left w-28">Case Size</th>
                                <th class="p-2.5 text-right w-28">Unit Price</th>
                                <th class="p-2.5 text-center w-28">As Of</th>
                                ${editing ? '<th class="p-2.5 text-center w-28"><input type="checkbox" class="accent-[#d4b78f] mr-1 align-middle" onchange="toggleSalesmanSheetHideSelectAll(this)"> Hide</th>' : ''}
                            </tr>
                        </thead>
                        <tbody>
        `;

        rows.forEach(function (row, i) {
            const bg = i % 2 ? 'bg-[#f8f4eb]' : 'bg-white';
            const nameAttr = String(row.name || '').replace(/"/g, '&quot;');
            const nameKey = encodeURIComponent(row.name || '');
            const hasPrice = !isNaN(Number(row.price));
            const priceCell = editing
                ? ('<input type="number" step="0.01" min="0" class="sps-price w-24 border-2 border-[#6B4423] rounded-lg px-2 py-1 text-right" data-name="' +
                    nameAttr + '" value="' + (hasPrice ? Number(row.price).toFixed(2) : '') + '">')
                : ('<span class="font-semibold">' + (hasPrice ? ('$' + Number(row.price).toFixed(2)) : '—') + '</span>');
            const nick = salesmanSheetDisplayName(row.name);
            const nameCell = editing
                ? ('<input type="text" class="sps-name w-full border-2 border-[#6B4423] rounded-lg px-2 py-1" data-name="' +
                    nameKey + '" value="' + escapeHtml(nick) + '">' +
                    '<p class="text-[10px] text-[#6B4423] mt-0.5">Catalog: ' + escapeHtml(row.name) + '</p>')
                : (escapeHtml(nick) + (nick !== row.name
                    ? ('<p class="text-[10px] text-[#6B4423] mt-0.5">Catalog: ' + escapeHtml(row.name) + '</p>')
                    : ''));
            html += `
                <tr class="border-t border-[#e8d9b8] ${bg}">
                    <td class="p-2.5">${nameCell}</td>
                    <td class="p-2.5 text-[#6B4423]">${escapeHtml(row.caseSize || '—')}</td>
                    <td class="p-2.5 text-right">${priceCell}</td>
                    <td class="p-2.5 text-center text-xs text-[#6B4423]">${escapeHtml(row.priceAsOf || '—')}</td>
                    ${editing ? ('<td class="p-2.5 text-center whitespace-nowrap"><input type="checkbox" class="sps-hide-cb accent-[#1E4D2B] mr-2 align-middle" value="' + encodeURIComponent(row.name) + '"><button type="button" class="px-2 py-1 text-xs font-semibold rounded-lg bg-[#1E4D2B] text-[#d4b78f]" data-name="' + encodeURIComponent(row.name) + '" onclick="hideSalesmanSheetItem(decodeURIComponent(this.getAttribute(\'data-name\')))">Hide</button></td>') : ''}
                </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });

    listEl.innerHTML = html;
    if (typeof renderSalesmanHiddenMenu === 'function') renderSalesmanHiddenMenu();
    if (typeof filterInternalSalesmanPriceSheetList === 'function') filterInternalSalesmanPriceSheetList();
    return total;
}

function filterInternalSalesmanPriceSheetList() {
    const q = String((document.getElementById('sps-sheet-search') || {}).value || '')
        .toLowerCase().trim();
    const list = document.getElementById('price-sheet-modal-list');
    if (!list) return;
    list.querySelectorAll('tbody tr').forEach(function (tr) {
        let hay = String(tr.textContent || '');
        tr.querySelectorAll('input, textarea, select').forEach(function (el) {
            hay += ' ' + String(el.value || '');
        });
        tr.querySelectorAll('[data-name]').forEach(function (el) {
            try {
                hay += ' ' + decodeURIComponent(el.getAttribute('data-name') || '');
            } catch (e) {
                hay += ' ' + String(el.getAttribute('data-name') || '');
            }
        });
        const hit = !q || hay.toLowerCase().indexOf(q) !== -1;
        tr.style.display = hit ? '' : 'none';
    });
    list.querySelectorAll(':scope > div').forEach(function (wrap) {
        const rows = wrap.querySelectorAll('tbody tr');
        if (!rows.length) return;
        let any = false;
        rows.forEach(function (tr) {
            if (tr.style.display !== 'none') any = true;
        });
        wrap.style.display = any || !q ? '' : 'none';
    });

    list.querySelectorAll(':scope > div').forEach(function (wrap) {
        const rows = wrap.querySelectorAll('tbody tr');
        if (!rows.length) return;
        let any = false;
        rows.forEach(function (tr) {
            if (tr.style.display !== 'none') any = true;
        });
        wrap.style.display = any || !q ? '' : 'none';
    });
}

async function openSalesmanPriceSheetModal() {
    const searchEl = document.getElementById('sps-sheet-search');
    if (searchEl) searchEl.value = '';
    window._spsCanEdit = true;
    window._spsEditing = false;
    window._spsSheet = null;
    if (typeof setSalesmanPriceSheetEditMode === 'function') setSalesmanPriceSheetEditMode(false);
    const detailModal = document.getElementById('salesman-modal');
    const salesmanId = detailModal?.dataset?.salesmanId;
    const salesman = salesmanId
        ? salesmen.find(s => String(s.id) === String(salesmanId))
        : null;

    if (!salesman || !(salesman.email || '').trim()) {
        alert('No salesman email on file — cannot load price sheet.');
        return;
    }

    const email = salesman.email.toLowerCase().trim();
    const titleEl = document.getElementById('price-sheet-modal-title');
    const subEl = document.getElementById('price-sheet-modal-subtitle');
    const listEl = document.getElementById('price-sheet-modal-list');
    const modal = document.getElementById('salesman-price-sheet-modal');

    if (titleEl) titleEl.textContent = 'Initial Pricing Sheet';
    if (subEl) subEl.textContent = (salesman.name || email) + ' · ' + email;
    if (listEl) listEl.innerHTML = '<p class="text-sm text-[#6B4423]"><i class="fas fa-spinner fa-spin mr-2"></i>Loading…</p>';
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }

    try {
        const { data, error } = await supabaseClient
            .from('salesman_price_sheets')
            .select('id, prices, display_names, hidden_prices, updated_at, salesman_name')
            .eq('salesman_email', email)
            .maybeSingle();

        if (error) throw error;

        if (!data || !data.prices || typeof data.prices !== 'object') {
            if (listEl) listEl.innerHTML = '<p class="text-sm text-[#6B4423]">No price sheet found for this salesman.</p>';
            return;
        }

        window._spsDisplayNames = (data.display_names && typeof data.display_names === 'object')
            ? data.display_names
            : {};
        window._spsHiddenPrices = (data.hidden_prices && typeof data.hidden_prices === 'object')
            ? data.hidden_prices
            : {};
        window._spsSheet = {
            id: data.id,
            email: email,
            name: salesman.name || data.salesman_name || email,
            prices: data.prices
        };
        window._spsExport = {
            title: salesman.name || data.salesman_name || email,
            subtitle: email,
            prices: data.prices
        };
        window._spsCanEdit = true;
        window._spsEditing = false;
        if (typeof setSalesmanPriceSheetEditMode === 'function') setSalesmanPriceSheetEditMode(false);
        const count = renderCategorizedPriceSheetTable(data.prices, listEl);

        if (subEl) {
            const updated = data.updated_at ? new Date(data.updated_at).toLocaleString() : '';
            subEl.textContent = (salesman.name || email) + ' · ' + count + ' products'
                + (updated ? ' · Updated ' + updated : '');
        }
    } catch (err) {
        console.error('openSalesmanPriceSheetModal error:', err);
        if (listEl) listEl.innerHTML = `<p class="text-sm text-red-600">Could not load price sheet.<br>${err.message || ''}</p>`;
    }
}

function hideSalesmanPriceSheetModal() {
    const modal = document.getElementById('salesman-price-sheet-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.style.display = 'none';
    window._spsEditing = false;
    window._spsCanEdit = false;
    window._spsSheet = null;
    window._spsExport = null;
    window._spsDisplayNames = {};
    window._spsHiddenPrices = {};
    if (typeof setSalesmanPriceSheetEditMode === 'function') setSalesmanPriceSheetEditMode(false);
}

function setSalesmanPriceSheetEditMode(on) {
    const editBtn = document.getElementById('sps-edit-btn');
    const saveBtn = document.getElementById('sps-save-btn');
    const hint = document.getElementById('sps-edit-hint');
    const canEdit = !!window._spsCanEdit && !!window._spsSheet;
    if (editBtn) {
        editBtn.classList.toggle('hidden', !canEdit);
        editBtn.textContent = on ? 'Cancel Edit' : 'Edit';
    }
    if (saveBtn) saveBtn.classList.toggle('hidden', !(canEdit && on));
    const saveSheetBtn = document.getElementById('sps-save-sheet-btn');
    if (saveSheetBtn) saveSheetBtn.classList.toggle('hidden', !(canEdit && on));
    if (hint) hint.classList.toggle('hidden', !(canEdit && on));
    const hideSel = document.getElementById('sps-hide-selected-btn');
    if (hideSel) hideSel.classList.toggle('hidden', !(canEdit && on));
}

function toggleSalesmanPriceSheetEdit() {
    if (!window._spsCanEdit || !window._spsSheet) return;
    window._spsEditing = !window._spsEditing;
    setSalesmanPriceSheetEditMode(window._spsEditing);
    const listEl = document.getElementById('price-sheet-modal-list');
    renderCategorizedPriceSheetTable(window._spsSheet.prices || {}, listEl);
}

function collectSalesmanPriceSheetInputs() {
    const next = Object.assign({}, (window._spsSheet && window._spsSheet.prices) || {});
    document.querySelectorAll('#price-sheet-modal-list input.sps-price').forEach(function (inp) {
        const name = inp.getAttribute('data-name');
        if (!name) return;
        const raw = String(inp.value || '').trim();
        if (raw === '') return;
        const n = Number(raw);
        if (isNaN(n) || n < 0) return;
        next[name] = Math.round(n * 100) / 100;
    });
    Object.keys(next).forEach(function (name) {
        if (isSalesmanSheetHidden(name)) delete next[name];
    });
    const sheetEmail = String((window._spsSheet && window._spsSheet.email) || '').toLowerCase().trim();
    if (sheetEmail === 'donegaldogtreats@gmail.com') {
        Object.keys(next).forEach(function (name) {
            const n = String(name || '').toLowerCase();
            if (n.indexOf('elky') === -1 || n.indexOf('training') === -1) return;
            if (n.indexOf('6oz') !== -1 || n.indexOf('10oz') !== -1) delete next[name];
        });
        const required = [
            { name: '6” Thin Green Line Bully Sticks (Bulk)', price: 0.59 },
            { name: '12” Thin Green Line Bully Sticks (Bulk)', price: 1.21 },
            { name: '40 Pack, 6" Thin Green Line Bully Sticks', price: 20 },
            { name: '20 Pack, 12" Thin Green Line Bully Sticks', price: 20 },
            { name: '25 Pack, 6" Regular Bully Sticks', price: 56.25 },
            { name: '20 Pack, 12" Regular Bully Sticks', price: 90 },
            { name: '20 Pack, 6" Braided Bully Sticks', price: 80 },
            { name: '10 Pack, 12" Braided Bully Sticks', price: 80 },
            { name: '20 Pack, 12" Thick Euro Bullies', price: 110 },
            { name: '25 Pack, 6" Thick Euro Bullies', price: 68.75 },
            { name: '50 Pack, Elky Jerky Treats', price: 39.5 },
            { name: '50 Pack, Turkey Jerky Treats', price: 37 },
            { name: '50 Pack, Chicken Jerky Treats', price: 36 },
            { name: '50 Pack, Beef Jerky Treats', price: 29 },
            { name: '50 Pack, Venison and Sweet Potato Jerky Treats', price: 39.5 },
            { name: '50 Pack, Sexy Chicken Feets', price: 25 },
            { name: '12" Beef Trachea, bagged (15/bag)', price: 35 },
            { name: '6" Beef Trachea, bagged (25/bag)', price: 27.5 }
        ];
        function norm(s) {
            return String(s || '').toLowerCase()
                .replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
                .replace(/\s+/g, ' ').trim();
        }
        required.forEach(function (row) {
            const want = norm(row.name);
            const hit = Object.keys(next).find(function (k) { return norm(k) === want; });
            if (hit) {
                if (next[hit] == null || next[hit] === '') next[hit] = row.price;
                return;
            }
            next[row.name] = row.price;
        });
    }
    return next;
}

function isJakePetSupplyCustomer(customer) {
    const email = String((customer && customer.email) || '').toLowerCase().trim();
    const company = String((customer && (customer.company || customer.name)) || '').toLowerCase();
    if (email === 'jakespurchaseorders@gmail.com') return true;
    if (company.indexOf('jake') !== -1 && company.indexOf('pet') !== -1) return true;
    return false;
}

function applyJakeElkyTrainingPrices(prices) {
    const next = Object.assign({}, prices || {});
    next['8oz. Bags of USA Elky Training Treats'] = 6.15;
    next['12oz. Bags of USA Elky Training Treats'] = 8.15;
    return next;
}

async function applyNewSalesmanPriceSheetToCustomer(customer, newSalesmanEmail) {
    const dest = String(newSalesmanEmail || '').toLowerCase().trim();
    if (!customer || !customer.id) return { ok: false, reason: 'Missing customer' };
    if (typeof shouldSkipSalesmanPricePush === 'function' && shouldSkipSalesmanPricePush(customer)) {
        return { ok: true, skipped: true };
    }
    if (!dest) {
        const { error: delErr } = await supabaseClient
            .from('customer_price_sheets')
            .delete()
            .eq('customer_id', customer.id);
        if (delErr) return { ok: false, reason: delErr.message };
        return { ok: true, cleared: true };
    }
    const { data: sheet, error } = await supabaseClient
        .from('salesman_price_sheets')
        .select('prices, hidden_prices, display_names')
        .eq('salesman_email', dest)
        .maybeSingle();
    if (error) return { ok: false, reason: error.message };
    if (!sheet || !sheet.prices || !Object.keys(sheet.prices).length) {
        return { ok: false, reason: 'No price sheet for ' + dest };
    }
    let prices = Object.assign({}, sheet.prices);
    Object.keys(sheet.hidden_prices || {}).forEach(function (name) {
        delete prices[name];
    });
    if (dest === 'donegaldogtreats@gmail.com' && typeof isJakePetSupplyCustomer === 'function' && isJakePetSupplyCustomer(customer) && typeof applyJakeElkyTrainingPrices === 'function') {
        prices = applyJakeElkyTrainingPrices(prices);
    }
    const { data: prevSheet } = await supabaseClient
        .from('customer_price_sheets')
        .select('prices')
        .eq('customer_id', customer.id)
        .maybeSingle();
    prices = mergeStoreOnlyPriceExtras(prices, prevSheet && prevSheet.prices, dest);
    const { error: upErr } = await supabaseClient
        .from('customer_price_sheets')
        .upsert({
            customer_id: customer.id,
            salesman_email: dest,
            prices: prices,
            display_names: (sheet.display_names && typeof sheet.display_names === 'object') ? sheet.display_names : {},
            updated_at: new Date().toISOString()
        }, { onConflict: 'customer_id' });
    if (upErr) {
        if (typeof logAdminActivity === 'function') {
            logAdminActivity({
                action: 'assign',
                entityType: 'customer',
                entityLabel: (customer && (customer.company || customer.name)) || '',
                summary: 'Reassign to ' + dest,
                result: 'failed',
                error: upErr.message
            });
        }
        return { ok: false, reason: upErr.message };
    }
    if (typeof logAdminActivity === 'function') {
        logAdminActivity({
            action: 'assign',
            entityType: 'customer',
            entityLabel: (customer && (customer.company || customer.name)) || '',
            summary: 'Reassigned to ' + dest
        });
    }
    return { ok: true };
}


function shouldSkipSalesmanPricePush(customer) {
    const email = String((customer && customer.email) || '').toLowerCase().trim();
    const company = String((customer && customer.company) || '').toLowerCase();
    const name = String((customer && customer.name) || '').toLowerCase();
    if (email === 'jackerman@donegalnatural.com') return true;
    if (company.indexOf('admin test store') !== -1) return true;
    if (name.indexOf('admin test store') !== -1) return true;
    if (customer && (customer.special_pricing === true || customer.specialPricing === true)) return true;
    return false;
}



function getOpenSalesmanSheetForExport() {
    if (window._spsEditing && typeof collectSalesmanPriceSheetInputs === 'function' && window._spsSheet) {
        return {
            title: window._spsSheet.name || window._spsSheet.email || 'Salesman',
            subtitle: window._spsSheet.email || '',
            prices: collectSalesmanPriceSheetInputs()
        };
    }
    if (window._spsExport && window._spsExport.prices && typeof window._spsExport.prices === 'object') {
        return window._spsExport;
    }
    if (window._spsSheet && window._spsSheet.prices && typeof window._spsSheet.prices === 'object') {
        return {
            title: window._spsSheet.name || window._spsSheet.email || 'Salesman',
            subtitle: window._spsSheet.email || '',
            prices: window._spsSheet.prices
        };
    }
    return null;
}

function salesmanSheetFileSlug(name) {
    const slug = String(name || 'Salesman')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    return slug || 'Salesman';
}

function brianPackCategories(name) {
    const key = String(name || '').toLowerCase().replace(/[“”"]/g, '').replace(/\s+/g, ' ').trim();
    const map = {
        "40 pack, 6\" thin bully stick": ["Bully Sticks"],
        "20 pack, 12\" thin bully stick": ["Bully Sticks"],
        "20 pack, 12\" regular bully sticks": ["Bully Sticks"],
        "25 pack, 6\" regular bully sticks": ["Bully Sticks"],
        "25 pack, 6\" monster green line bully stick": ["Bully Sticks"],
        "20 pack, 12\" monster green line bully stick": ["Bully Sticks"],
        "24-28\" bully cane": ["Bully Sticks"],
        "32-36\" bully cane": ["Bully Sticks"],
        "20 pack, 6\" braided bully sticks": ["Bully Sticks"],
        "10 pack, 12\" braided bully sticks": ["Bully Sticks"],
        "20 pack, 12\" thick euro bullies": ["Bully Sticks"],
        "25 pack, 6\" thick euro bullies": ["Bully Sticks"],
        "50 pack, usa beef jerky treats": ["Jerky"],
        "50 pack, usa turkey jerky treats": ["Jerky"],
        "50 pack, usa chicken jerky treats": ["Jerky"],
        "50 pack, usa elky jerky treats": ["Jerky"],
        "50 pack, usa venison and sweet potato jerky treats": ["Jerky"],
        "8oz bags of usa elky training treats": ["Jerky"],
        "12oz bags of usa elky training treats": ["Jerky"],
        "10 pack, large turkey jerky stuffed buffalo bone": ["Jerky"],
        "10 pack, large elky jerky stuffed buffalo bone": ["Jerky"],
        "10 pack, large venison jerky stuffed buffalo bone": ["Jerky"],
        "10 pack, large peanut butter stuffed buffalo bone": ["Jerky", "Buffalo"],
        "25 pack, natural cow ears": ["Ears"],
        "25 pack, natural vanilla cow ear": ["Ears"],
        "25 pack, honey smoked cow ear": ["Ears"],
        "5 pack, hairy beef ears": ["Ears"],
        "10 pack, hairy beef ears": ["Ears"],
        "50 pack, regular magna buffalo ears": ["Ears"],
        "50 pack, honey smoked magna buffalo ears": ["Ears"],
        "polish pig ears": ["Ears"],
        "10 pack, fuzzy bunny ears": ["Ears", "Rabbit"],
        "25 pack, fuzzy bunny ears": ["Ears", "Rabbit"],
        "20 pack, 5-6\" natural rollio rolled cow cheek": ["Cow Cheeks"],
        "10 pack, 10-12\" natural rollio rolled cow cheek": ["Cow Cheeks"],
        "20 pack, 5\" rollio rolled cow cheek": ["Cow Cheeks"],
        "10 pack, 10\" rollio rolled cow cheek": ["Cow Cheeks"],
        "20 pack, 5\" vanilla rollio rolled cow cheek": ["Cow Cheeks"],
        "10 pack, 10\" vanilla rollio rolled cow cheek": ["Cow Cheeks"],
        "20 pack, 5\" honey smoked rollio rolled cow cheek": ["Cow Cheeks"],
        "10 pack, 10\" honey smoked rollio rolled cow cheek": ["Cow Cheeks"],
        "10 pack, 5-6\" phat rollio rolled cow cheek": ["Cow Cheeks"],
        "10 pack, 5-6\" phat vanilla rollio rolled cow cheek": ["Cow Cheeks"],
        "10 pack, 5-6\" phat honey smoked rollio rolled cow cheek": ["Cow Cheeks"],
        "5 pack, 10-12\" phat rollio rolled cow cheek": ["Cow Cheeks"],
        "5 pack, 10-12\" phat vanilla rollio rolled cow cheek": ["Cow Cheeks"],
        "5 pack, 10-12\" phat honey smoked rollio rolled cow cheek": ["Cow Cheeks"],
        "5 pack, 10-12\" bully basted phat rollio": ["Cow Cheeks"],
        "10 pack, 5-6\" peanut butter stuffed rollio": ["Cow Cheeks"],
        "5 pack, 10-12\" peanut butter stuffed rollio": ["Cow Cheeks"],
        "50 pack, 5-6\" cheek slabs": ["Cow Cheeks"],
        "50 pack, 5-6\" vanilla cheek slabs": ["Cow Cheeks"],
        "25 pack, 12\" cheek slabs": ["Cow Cheeks"],
        "25 pack, 12\" vanilla cheek slabs": ["Cow Cheeks"],
        "8oz bags of chunky cow cheeks": ["Cow Cheeks"],
        "8oz bags of vanilla chunky cow cheeks": ["Cow Cheeks"],
        "8oz bags of honey smoked chunky cow cheeks": ["Cow Cheeks"],
        "16oz bags of chunky cow cheeks": ["Cow Cheeks"],
        "16oz bags of vanilla chunky cow cheeks": ["Cow Cheeks"],
        "16oz bags of honey smoked chunky cow cheeks": ["Cow Cheeks"],
        "25 pack, 6\" magna natural ox tails": ["Ox Tails"],
        "10 pack, 12\" magna natural ox tails": ["Ox Tails"],
        "10 pack, fuzzy bunny feet": ["Rabbit"],
        "25 pack, fuzzy bunny feet": ["Rabbit"],
        "10 pack, crunchy duck necks": ["Duck and Goose"],
        "25 pack, crunchy duck necks": ["Duck and Goose"],
        "5 pack, handsome crunchy duck heads": ["Duck and Goose"],
        "10 pack, handsome crunchy duck heads": ["Duck and Goose"],
        "20 pack, handsome crunchy duck heads": ["Duck and Goose"],
        "10 pack, sexy euro duck feet": ["Duck and Goose"],
        "25 pack, sexy euro duck feet": ["Duck and Goose"],
        "10 pack, crunchy goose necks": ["Duck and Goose"],
        "10 pack, super meaty beef tendons": ["Beef"],
        "50 pack, 6\" paddywack": ["Beef"],
        "20 pack, 12\" paddywack": ["Beef"],
        "25 pack, 6\" beef collagen sticks": ["Beef"],
        "20 pack, 12\" beef collagen sticks": ["Beef"],
        "20 pack, 6\" beef wrapped corium sticks": ["Beef"],
        "10 pack, 12\" beef wrapped corium sticks": ["Beef"],
        "20 pack, regular cow hooves": ["Beef"],
        "20 pack, smoked cow hooves": ["Beef"],
        "25 pack, 6\" beef trachea": ["Beef"],
        "15 pack, 12\" beef trachea": ["Beef"],
        "8oz bags of beef trachea pieces": ["Beef"],
        "16oz bags of beef trachea pieces": ["Beef"],
        "20 pack, 6\" braided esophagus": ["Beef"],
        "10 pack, 12\" braided esophagus": ["Beef"],
        "14-16\" jumbo meaty femur knuckle bone": ["Beef"],
        "8oz usa beef lung flips": ["Beef"],
        "16oz usa beef lung flips": ["Beef"],
        "50 pack, usa lamb ears": ["Lamb"],
        "8oz bag of usa lamb lung": ["Lamb"],
        "16oz bag of usa lamb lung": ["Lamb"],
        "20 pack, small buffalo horns": ["Buffalo"],
        "10 pack, medium buffalo horns": ["Buffalo"],
        "5 pack, large buffalo horns": ["Buffalo"],
        "50 pack, small meaty buffalo knuckle": ["Buffalo"],
        "10 pack, regular large meaty buffalo bone": ["Buffalo"],
        "8oz bags of buffalo bites (lung)": ["Buffalo"],
        "16oz bags of buffalo bites (lung)": ["Buffalo"],
        "50 pack, sexy euro chicken feet": ["Chicken"],
        "50 pack, vanilla flavored white euro chicken feet": ["Chicken"],
        "5-7\" supreme usa hide braided donuts": ["Braided"],
        "5-7\" vanilla supreme braided donuts": ["Braided"],
        "8-9\" supreme usa hide braided donuts": ["Braided"],
        "8-9\" vanilla supreme braided donuts": ["Braided"],
        "10-11\" supreme usa hide braided donuts": ["Braided"],
        "10-11\" vanilla supreme braided donuts": ["Braided"],
        "50 pack, 4\" supreme pressed bone": ["Pressed Bones"],
        "20 pack, 6\" supreme pressed bone": ["Pressed Bones"],
        "10 pack, 8\" supreme pressed bone": ["Pressed Bones"],
        "5 pack, 10\" supreme pressed bone": ["Pressed Bones"],
        "5 pack, 12\" supreme pressed bone": ["Pressed Bones"],
        "10 pack, 6\" supreme pressed ring": ["Pressed Bones"],
        "20 pack, 10\" x 20mm supreme pressed stick": ["Pressed Bones"],
        "20 pack, 6-9\" vanilla flavored magna retrievers": ["Retrievers"],
        "10 pack, 10-11\" x 30mm vanilla supreme retrievers": ["Retrievers"],
        "20 pack, 6/9\" white supreme retriever": ["Retrievers"],
        "10 pack, 10/11\" x 30mm white supreme retriever": ["Retrievers"],
        "100 pack, 5\" x 4/6mm white twisty (100/inner)": ["Twisty Q's and Natural Munchy Sticks"],
        "100 pack, 5\" x 9/10mm white twisty (50/inner)": ["Twisty Q's and Natural Munchy Sticks"],
        "50 pack, 10\" x 9/10mm white twisty": ["Twisty Q's and Natural Munchy Sticks"],
        "20 pack, 10\" white twisty-q": ["Twisty Q's and Natural Munchy Sticks"],
        "20 pack, 10\" vanilla twisty-q": ["Twisty Q's and Natural Munchy Sticks"],
        "10 pack, 12\" x 20mm natural munchy sticks": ["Twisty Q's and Natural Munchy Sticks"],
        "100 pack, 5\" 10mm natural munchy sticks": ["Twisty Q's and Natural Munchy Sticks"],
        "8oz bags of white binkey's": ["Binkey's"],
        "8oz bags of peanut butter binkey's": ["Binkey's"],
        "8oz bags of vanilla binkey's": ["Binkey's"],
        "16oz bags of white binkey's": ["Binkey's"],
        "16oz bags of peanut butter binkey's": ["Binkey's"],
        "16oz bags of vanilla binkey's": ["Binkey's"],
    };
    if (map[key]) return map[key];
    if (/euro bull|bully stick|bully cane|braided bully|monster/.test(key)) return ['Bully Sticks'];
    if (/peanut butter stuffed buffalo|stuffed buffalo bone/.test(key)) return ['Jerky', 'Buffalo'];
    if (/jerky|elky training/.test(key)) return ['Jerky'];
    if (/bunny ear/.test(key)) return ['Ears', 'Rabbit'];
    if (/bunny feet/.test(key)) return ['Rabbit'];
    if (/cow ear|buffalo ear|hairy beef ear|pig ear/.test(key)) return ['Ears'];
    if (/rollio|cheek slab|chunky/.test(key)) return ['Cow Cheeks'];
    if (/ox tail/.test(key)) return ['Ox Tails'];
    if (/duck|goose/.test(key)) return ['Duck and Goose'];
    if (/lamb/.test(key)) return ['Lamb'];
    if (/buffalo horn|buffalo knuckle|buffalo bone|buffalo bite/.test(key)) return ['Buffalo'];
    if (/chicken feet/.test(key)) return ['Chicken'];
    if (/donut/.test(key)) return ['Braided'];
    if (/pressed/.test(key)) return ['Pressed Bones'];
    if (/retriever/.test(key)) return ['Retrievers'];
    if (/twisty|munchy/.test(key)) return ["Twisty Q's and Natural Munchy Sticks"];
    if (/binkey/.test(key)) return ["Binkey's"];
    if (/tendon|paddywack|collagen|corium|hoove|trachea|esophagus|femur|lung flip/.test(key)) return ['Beef'];
    return null;
}

function priceSheetDisplayCategories(name, catalog) {
    const n = String(name || '').toLowerCase();
    const base = (catalog && catalog.category) ? String(catalog.category) : '';
    const cats = [];
    function add(cat) {
        String(cat || '').split(',').forEach(function (c) {
            c = c.trim();
            if (!c) return;
            if (cats.indexOf(c) === -1) cats.push(c);
        });
    }
    const mapped = (typeof brianPackCategories === 'function') ? brianPackCategories(name) : null;
    if (mapped && mapped.length) {
        mapped.forEach(add);
        return cats;
    }
    const isRabbit = /rabbit|bunny/i.test(n);
    const isPack = /\d+-pack|\bpack\b|packaged/i.test(n) || /packaged/i.test(base);
    const isDualLung = !/lamb/i.test(n) && (
        /beef\s*lung/i.test(n) ||
        /buffalo\s*lung/i.test(n) ||
        /lung\s*flips/i.test(n) ||
        /lung\s*bites/i.test(n)
    );
    if (isDualLung) {
        add('Beef');
        add('Packaged Items');
        add(base);
        return cats;
    }
    if (isRabbit && isPack) {
        add('Rabbit');
        add(base && /pack/i.test(base) ? base : 'Packaged Items');
    } else if (isRabbit && /ear/i.test(n)) {
        add('Ears');
        add('Rabbit');
    } else if (isRabbit && /feet|foot/i.test(n)) {
        add('Feet');
        add('Rabbit');
    } else if (isRabbit) {
        add('Rabbit');
        add(base);
    } else {
        add(base);
    }
    return cats;
}

function priceSheetDisplayCategory(name, catalog) {
    const cats = priceSheetDisplayCategories(name, catalog);
    if (cats.length) return cats[0];
    return (catalog && catalog.category) ? catalog.category : '';
}

function priceSheetCategorySortIndex(cat) {
    const name = String(cat || '');
    if (typeof INVENTORY_CATEGORY_ORDER !== 'undefined') {
        const i = INVENTORY_CATEGORY_ORDER.indexOf(name);
        if (i >= 0) return i;
    }
    return 900;
}

function buildSalesmanSheetExportRows(prices) {
    const source = (prices && typeof prices === 'object') ? prices : {};
    const catalogByName = {};
    if (typeof PRODUCT_CATALOG !== 'undefined') {
        PRODUCT_CATALOG.forEach(function (p) {
            if (p && p.name) catalogByName[p.name] = p;
        });
    }
    const rows = [];
    Object.keys(source).forEach(function (name) {
        if (isSalesmanSheetHidden(name)) return;
        const catalog = catalogByName[name] || {};
        const raw = source[name];
        const n = Number(raw);
        const cats = priceSheetDisplayCategories(name, catalog);
        const list = cats.length ? cats : [catalog.category || 'Other'];
        list.forEach(function (cat) {
            rows.push({
                Category: cat || 'Other',
                'Sub Category': catalog.subCategory || '',
                Product: salesmanSheetDisplayName(name),
                'Case Size': catalog.caseSize || '',
                'Unit Price': isNaN(n) ? '' : n,
                'Market Price': catalog.isMarketPrice ? 'Yes' : 'No'
            });
        });
    });
    rows.sort(function (a, b) {
        const order = priceSheetCategorySortIndex(a.Category) - priceSheetCategorySortIndex(b.Category);
        if (order !== 0) return order;
        const cat = String(a.Category || '').localeCompare(String(b.Category || ''));
        if (cat !== 0) return cat;
        return String(a.Product || '').localeCompare(String(b.Product || ''));
    });
    return rows;
}

function groupSalesmanSheetRowsByCategory(rows) {
    const grouped = {};
    (rows || []).forEach(function (row) {
        const cat = row.Category || 'Other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(row);
    });
    const known = (typeof INVENTORY_CATEGORY_ORDER !== 'undefined') ? INVENTORY_CATEGORY_ORDER.slice() : [];
    const extra = Object.keys(grouped).filter(function (cat) {
        return known.indexOf(cat) === -1;
    }).sort();
    const categories = known.concat(extra).filter(function (cat) {
        return grouped[cat] && grouped[cat].length;
    });
    function exportSheetItemKey(name) {
        const raw = String(name || '').toLowerCase().replace(/[“”"]/g, '');
        const pack = parseInt(raw, 10) || 0;
        const lengthMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:”|"|')/);
        const length = lengthMatch ? Number(lengthMatch[1]) : 0;
        let family = 'zzz';
        if (/euro/.test(raw)) family = 'euro';
        else if (/braided bully/.test(raw)) family = 'braided bully';
        else if (/cane/.test(raw)) family = 'cane';
        else if (/monster/.test(raw)) family = 'green line 3 monster';
    else if (/regular/.test(raw) && /bully/.test(raw)) family = 'green line 2 regular';
    else if (/thin/.test(raw) && /bully/.test(raw)) family = 'green line 1 thin';
    else if (/bully stick/.test(raw)) family = 'green line';
        else if (/elky training/.test(raw)) family = 'training';
        else if (/stuffed buffalo/.test(raw)) family = 'stuffed bone';
        else if (/jerky/.test(raw)) family = 'jerky';
        else if (/hairy beef ear/.test(raw)) family = 'hairy ear';
        else if (/buffalo ear/.test(raw)) family = 'buffalo ear';
        else if (/bunny ear|rabbit ear/.test(raw)) family = 'rabbit ear';
        else if (/pig ear/.test(raw)) family = 'pig ear';
        else if (/cow ear/.test(raw)) family = 'cow ear';
        else if (/peanut butter stuffed .*rollio|peanut butter stuffed rollio/.test(raw)) family = 'pb rollio';
        else if (/phat/.test(raw)) family = 'phat rollio';
        else if (/natural .*rollio|natural rollio/.test(raw)) family = 'natural rollio';
        else if (/rollio/.test(raw)) family = 'rollio';
        else if (/cheek slab/.test(raw)) family = 'cheek slab';
        else if (/chunky/.test(raw)) family = 'chunky';
        else if (/ox tail/.test(raw)) family = 'ox tail';
        else if (/bunny feet|rabbit feet/.test(raw)) family = 'rabbit feet';
        else if (/duck neck/.test(raw)) family = 'duck neck';
        else if (/goose/.test(raw)) family = 'goose';
        else if (/duck head/.test(raw)) family = 'duck head';
        else if (/duck feet/.test(raw)) family = 'duck feet';
        else if (/trachea piece/.test(raw)) family = 'trachea piece';
        else if (/trachea/.test(raw)) family = 'trachea';
        else if (/tendon/.test(raw)) family = 'tendon';
        else if (/paddywack/.test(raw)) family = 'paddywack';
        else if (/collagen/.test(raw)) family = 'collagen';
        else if (/corium/.test(raw)) family = 'corium';
        else if (/hoove/.test(raw)) family = 'hoof';
        else if (/esophagus/.test(raw)) family = 'esophagus';
        else if (/femur/.test(raw)) family = 'femur';
        else if (/lamb ear/.test(raw)) family = 'lamb ear';
        else if (/lamb lung/.test(raw)) family = 'lamb lung';
        else if (/lung/.test(raw)) family = 'lung';
        else if (/buffalo horn/.test(raw)) family = 'buffalo horn';
        else if (/buffalo knuckle|buffalo bone/.test(raw)) family = 'buffalo bone';
        else if (/buffalo bite/.test(raw)) family = 'buffalo bite';
        else if (/chicken feet/.test(raw)) family = 'chicken feet';
        else if (/donut/.test(raw)) family = 'donut';
        else if (/pressed ring/.test(raw)) family = 'pressed ring';
        else if (/pressed stick/.test(raw)) family = 'pressed stick';
        else if (/pressed/.test(raw)) family = 'pressed bone';
        else if (/retriever/.test(raw)) family = 'retriever';
        else if (/twisty-q|twisty q/.test(raw)) family = 'twisty q';
        else if (/twisty/.test(raw)) family = 'twisty';
        else if (/munchy/.test(raw)) family = 'munchy';
        else if (/binkey/.test(raw)) family = 'binkey';
        let flavor = 'm';
        if (/honey/.test(raw)) flavor = 'honey';
        else if (/vanilla/.test(raw)) flavor = 'vanilla';
        else if (/peanut/.test(raw)) flavor = 'peanut';
        else if (/natural/.test(raw)) flavor = 'natural';
        return family + ' ' + flavor + ' ' + String(length).padStart(4, '0') + ' ' + String(pack).padStart(4, '0') + ' ' + raw;
    }
    categories.forEach(function (cat) {
        grouped[cat].sort(function (a, b) {
            return exportSheetItemKey(a.Product).localeCompare(exportSheetItemKey(b.Product));
        });
    });
    return { grouped: grouped, categories: categories };
}

function printOpenSalesmanPriceSheet() {
    const sheet = getOpenSalesmanSheetForExport();
    if (!sheet || !sheet.prices || !Object.keys(sheet.prices).length) {
        alert('No price sheet is loaded.');
        return;
    }
    const rows = buildSalesmanSheetExportRows(sheet.prices);
    const packed = groupSalesmanSheetRowsByCategory(rows);
    const today = new Date().toLocaleDateString();
    const title = sheet.title || 'Salesman Price Sheet';
    let body = '';
    packed.categories.forEach(function (cat) {
        body += '<h2 style="margin:18px 0 6px;font-size:15px;color:#1E4D2B;border-bottom:1px solid #1E4D2B;padding-bottom:3px;">' +
            escapeHtml(cat) + '</h2>';
        body += '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:10px;">' +
            '<thead><tr style="background:#1E4D2B;color:#d4b78f;">' +
            '<th style="padding:6px 8px;text-align:left;border:1px solid #999;">Product</th>' +
            '<th style="padding:6px 8px;text-align:left;border:1px solid #999;width:90px;">Case Size</th>' +
            '<th style="padding:6px 8px;text-align:right;border:1px solid #999;width:90px;">Unit Price</th>' +
            '</tr></thead><tbody>';
        packed.grouped[cat].forEach(function (row) {
            const price = row['Unit Price'] === '' ? '—' : ('$' + Number(row['Unit Price']).toFixed(2));
            const market = row['Market Price'] === 'Yes' ? ' (Market)' : '';
            body += '<tr>' +
                '<td style="padding:5px 8px;border:1px solid #ccc;">' + escapeHtml(row.Product) + market + '</td>' +
                '<td style="padding:5px 8px;border:1px solid #ccc;">' + escapeHtml(row['Case Size'] || '—') + '</td>' +
                '<td style="padding:5px 8px;border:1px solid #ccc;text-align:right;font-weight:600;">' + price + '</td>' +
                '</tr>';
        });
        body += '</tbody></table>';
    });
    const html = '<!DOCTYPE html><html><head><title>' + escapeHtml(title) + ' – Donegal Natural</title>' +
        '<style>' +
        'body{font-family:Arial,sans-serif;margin:24px;color:#222;}' +
        '.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;gap:16px;}' +
        '.brand{display:flex;align-items:center;gap:12px;}' +
        '.brand img{height:52px;width:auto;}' +
        '.company{font-size:20px;font-weight:bold;color:#1E4D2B;}' +
        '.title{font-size:18px;font-weight:bold;text-align:right;color:#1E4D2B;}' +
        '.meta{font-size:12px;margin-top:4px;color:#555;}' +
        'hr{border:none;border-top:2px solid #1E4D2B;margin:12px 0;}' +
        '.footer{margin-top:28px;text-align:center;font-size:11px;color:#666;}' +
        '@media print{body{margin:12px;}}' +
        '</style></head><body>' +
        '<div class="header">' +
        '<div class="brand"><img src="media/logo.png" alt="Donegal Natural">' +
        '<div><div class="company">Donegal Natural Dog Treats</div>' +
        '<div class="meta">258 W Front St · Marietta, PA 17547</div>' +
        '<div class="meta">(800) 223-0017</div></div></div>' +
        '<div class="title">' + escapeHtml(title.toUpperCase()) +
        '<div class="meta">Printed: ' + escapeHtml(today) + '</div>' +
        '<div class="meta">' + rows.length + ' products</div></div></div>' +
        '<hr>' + body +
        '<div class="footer">Donegal Natural Dog Treats — ' + escapeHtml(title) + '</div></body></html>';
    const win = window.open('', '_blank', 'noopener,width=1100,height=900');
    if (!win) {
        alert('Please allow pop-ups to print the price sheet.');
        return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(function () { win.print(); }, 350);
}

function brianExcelSku(name) {
    const key = String(name || '').toLowerCase().replace(/[“”"]/g, '').replace(/\s+/g, ' ').trim();
    const map = {
        '40 pack, 6 thin bully stick': 'PZSK6',
        '20 pack, 12 thin bully stick': 'PZSK12',
        '25 pack, 6 regular bully sticks': 'GRPZ6',
        '20 pack, 12 regular bully sticks': 'GRPZ12',
        '25 pack, 6 monster green line bully stick': 'GRSUP6',
        '20 pack, 12 monster green line bully stick': 'GRSUP12',
        '20 pack, 6 braided bully sticks': '16925-22043',
        '10 pack, 12 braided bully sticks': '16925-22055',
        '25 pack, 6 thick euro bullies': '6EUR',
        '20 pack, 12 thick euro bullies': '12EUR',
        '10 pack, hairy beef ears': 'HBE',
        '10 pack, super meaty beef tendons': 'SMBT',
        '25 pack, fuzzy bunny ears': 'FRE',
        '20 pack, handsome crunchy duck heads': 'DHD',
        '10 pack, 10 rollio rolled cow cheek': 'ROLL',
        '10 pack, 10 vanilla rollio rolled cow cheek': 'ROLLV',
        '10 pack, 10 honey smoked rollio rolled cow cheek': 'ROLLHS',
        '20 pack, 5 rollio rolled cow cheek': '5ROLL',
        '20 pack, 5 vanilla rollio rolled cow cheek': '5ROLLV',
        '20 pack, 5 honey smoked rollio rolled cow cheek': '5ROLLH',
        '20 pack, 5-6 natural rollio rolled cow cheek': 'NROLL5',
        '10 pack, 10-12 natural rollio rolled cow cheek': 'NROLL10',
        '10 pack, 5-6 phat rollio rolled cow cheek': 'PH5',
        '5 pack, 10-12 phat rollio rolled cow cheek': 'PH10',
        '10 pack, 5-6 phat honey smoked rollio rolled cow cheek': 'PH5HS',
        '5 pack, 10-12 phat honey smoked rollio rolled cow cheek': 'PH10HS',
        '10 pack, 5-6 phat vanilla rollio rolled cow cheek': 'PH5V',
        '5 pack, 10-12 phat vanilla rollio rolled cow cheek': 'PH10V',
        '10 pack, 5-6 peanut butter stuffed rollio': 'NPBROLL5',
        '5 pack, 10-12 peanut butter stuffed rollio': 'NPBROLL10',
        '25 pack, 6 magna natural ox tails': 'MNOX6',
        '10 pack, 12 magna natural ox tails': 'MNOX12',
        '50 pack, usa venison and sweet potato jerky treats': 'VSP',
        '50 pack, usa elky jerky treats': '16925-00006',
        '50 pack, usa turkey jerky treats': '16925-02222',
        '50 pack, usa chicken jerky treats': '16925-01225',
        '20 pack, small buffalo horns': 'BUFFSM',
        '10 pack, medium buffalo horns': 'BUFFM',
        '5 pack, large buffalo horns': 'BUFFL',
        '25 pack, 6 beef trachea': '16925-20407',
        '15 pack, 12 beef trachea': '16925-20414',
        '25 pack, natural cow ears': 'COWNAT',
        '50 pack, regular magna buffalo ears': 'MBUFF',
        '10 pack, 10/11 x 30mm white supreme retriever': 'SUP10RTR',
        '8oz bags of buffalo bites (lung)': '8LUNG',
        '16oz bags of buffalo bites (lung)': '16LUNG',
        '8oz bags of usa elky training treats': 'TT8',
        '12oz bags of usa elky training treats': 'TT12'
    };
    return map[key] || '';
}

function exportOpenSalesmanPriceSheetExcel() {
    const sheet = getOpenSalesmanSheetForExport();
    if (!sheet || !sheet.prices || !Object.keys(sheet.prices).length) {
        alert('No price sheet is loaded.');
        return;
    }
    if (typeof XLSX === 'undefined') {
        alert('Excel library not loaded.');
        return;
    }
    const rows = buildSalesmanSheetExportRows(sheet.prices);
    const packed = groupSalesmanSheetRowsByCategory(rows);
    const title = sheet.title || 'Salesman Price Sheet';
    const stamp = new Date().toISOString().slice(0, 10);
    const aoa = [
        ['Donegal Natural Dog Treats'],
        ['258 W Front St · Marietta, PA 17547'],
        ['(800) 223-0017'],
        [title],
        ['Price sheet as of ' + stamp],
        []
    ];
    packed.categories.forEach(function (cat) {
        aoa.push([cat]);
        aoa.push(['Product', 'SKU', 'Case Size', 'Unit Price']);
        packed.grouped[cat].forEach(function (row) {
            const price = row['Unit Price'] === '' ? '' : Number(row['Unit Price']);
            const market = row['Market Price'] === 'Yes' ? ' (Market)' : '';
            aoa.push([
                (row.Product || '') + market,
                brianExcelSku(row.Product),
                row['Case Size'] || '',
                price
            ]);
        });
        aoa.push([]);
    });
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 56 }, { wch: 16 }, { wch: 16 }, { wch: 14 }];
    Object.keys(ws).forEach(function (ref) {
        if (ref.charAt(0) === '!') return;
        if (XLSX.utils.decode_cell(ref).c !== 3) return;
        if (typeof ws[ref].v !== 'number') return;
        ws[ref].t = 'n';
        ws[ref].z = '"$"#,##0.00';
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Price Sheet');
    XLSX.writeFile(wb, salesmanSheetFileSlug(title) + '_Price_Sheet_' + stamp + '.xlsx');
}

function loadSheetLogoDataUrl() {
    return new Promise(function (resolve) {
        const img = new Image();
        img.onload = function () {
            try {
                const size = 96;
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#1E4D2B';
                ctx.fillRect(0, 0, size, size);
                ctx.drawImage(img, 0, 0, size, size);
                resolve(canvas.toDataURL('image/jpeg', 0.55));
            } catch (e) {
                resolve('');
            }
        };
        img.onerror = function () { resolve(''); };
        img.src = 'media/logo.png';
    });
}

async function exportOpenSalesmanPriceSheetPdf() {
    const sheet = getOpenSalesmanSheetForExport();
    if (!sheet || !sheet.prices || !Object.keys(sheet.prices).length) {
        alert('No price sheet is loaded.');
        return;
    }
    const jsPdfCtor = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : window.jsPDF;
    if (!jsPdfCtor) {
        alert('PDF library not loaded. Hard-refresh and try again.');
        return;
    }
    const rows = buildSalesmanSheetExportRows(sheet.prices);
    const packed = groupSalesmanSheetRowsByCategory(rows);
    const title = sheet.title || 'Salesman Price Sheet';
    const stamp = new Date().toLocaleDateString();
    const doc = new jsPdfCtor({ unit: 'pt', format: 'letter', compress: true });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const green = [30, 77, 43];
    const gold = [212, 183, 143];
    const cream = [248, 244, 235];
    const brown = [107, 68, 35];

    function drawPageChrome() {
        doc.setFillColor(green[0], green[1], green[2]);
        doc.rect(0, 0, pageWidth, 78, 'F');
        const left = 28;
        doc.setTextColor(gold[0], gold[1], gold[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('Donegal Natural Dog Treats', left, 32);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('258 W Front St  ·  Marietta, PA 17547  ·  (800) 223-0017', left, 48);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(String(title).toUpperCase(), pageWidth - 28, 32, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('As of ' + stamp, pageWidth - 28, 48, { align: 'right' });
        doc.setFillColor(gold[0], gold[1], gold[2]);
        doc.rect(0, 78, pageWidth, 6, 'F');
        doc.setFillColor(green[0], green[1], green[2]);
        doc.rect(0, pageHeight - 32, pageWidth, 32, 'F');
        doc.setTextColor(gold[0], gold[1], gold[2]);
        doc.setFontSize(8);
        doc.text(
            'Donegal Natural Dog Treats  ·  ' + title + '  ·  Page ' + doc.internal.getCurrentPageInfo().pageNumber,
            pageWidth / 2,
            pageHeight - 14,
            { align: 'center' }
        );
    }

    drawPageChrome();
    let cursorY = 100;
    packed.categories.forEach(function (cat) {
        const body = packed.grouped[cat].map(function (row) {
            const price = row['Unit Price'] === '' ? '—' : ('$' + Number(row['Unit Price']).toFixed(2));
            const market = row['Market Price'] === 'Yes' ? ' (Market)' : '';
            return [String(row.Product || '') + market, String(row['Case Size'] || '—'), price];
        });
        if (cursorY > pageHeight - 120) {
            doc.addPage();
            cursorY = 100;
        }
        doc.setFillColor(green[0], green[1], green[2]);
        doc.roundedRect(28, cursorY, pageWidth - 56, 22, 3, 3, 'F');
        doc.setTextColor(gold[0], gold[1], gold[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(String(cat), 40, cursorY + 15);
        cursorY += 26;
        doc.autoTable({
            startY: cursorY,
            head: [['Product', 'Case Size', 'Unit Price']],
            body: body,
            theme: 'grid',
            styles: {
                font: 'helvetica',
                fontSize: 9,
                textColor: [40, 28, 16],
                lineColor: [212, 183, 143],
                lineWidth: 0.4,
                cellPadding: 5
            },
            headStyles: {
                fillColor: brown,
                textColor: gold,
                fontStyle: 'bold'
            },
            alternateRowStyles: { fillColor: cream },
            columnStyles: {
                0: { cellWidth: 340 },
                1: { cellWidth: 90 },
                2: { cellWidth: 86, halign: 'right', fontStyle: 'bold', textColor: green }
            },
            margin: { left: 28, right: 28, top: 100, bottom: 44 },
            didDrawPage: function () {
                drawPageChrome();
            }
        });
        cursorY = doc.lastAutoTable.finalY + 16;
    });

    const fileStamp = new Date().toISOString().slice(0, 10);
    doc.save(salesmanSheetFileSlug(title) + '_Price_Sheet_' + fileStamp + '.pdf');
}

async function saveSalesmanPriceSheetOnly() {
    if (!window._spsSheet || !window._spsSheet.id || !window._spsSheet.email) {
        alert('No salesman sheet is loaded.');
        return;
    }
    let prices = collectSalesmanPriceSheetInputs();
    if (!Object.keys(prices).length) {
        alert('No prices to save.');
        return;
    }

    // Permanent guard for Brian — strip known bad/duplicate keys before saving or pushing
    const emailCheck = String(window._spsSheet.email || '').toLowerCase().trim();
    if (emailCheck === 'donegaldogtreats@gmail.com') {
        const cleaned = {};
        Object.keys(prices).forEach(function (key) {
            if (/bagged|Sexy Chicken Feets|Thin Green Line Bully Sticks$/i.test(key)) return;
            if (key === '20 Pack, 12" Thick Euro Bullies' || key === '25 Pack, 6" Thick Euro Bullies') return;
            if (key === '20 Pack, 12" Regular Bully Sticks' || key === '25 Pack, 6" Regular Bully Sticks') return;
            cleaned[key] = prices[key];
        });
        prices = cleaned;
    }
    const names = (typeof collectSalesmanDisplayNames === 'function')
        ? collectSalesmanDisplayNames()
        : (window._spsDisplayNames || {});
    const email = String(window._spsSheet.email || '').toLowerCase().trim();
    const salesmanName = window._spsSheet.name || email;
    const saveBtn = document.getElementById('sps-save-sheet-btn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving…';
    }
    try {
        const nowIso = new Date().toISOString();
        const { error } = await supabaseClient
            .from('salesman_price_sheets')
            .update({
                prices: prices,
                display_names: names,
                hidden_prices: (window._spsHiddenPrices && Object.keys(window._spsHiddenPrices).length)
                    ? window._spsHiddenPrices
                    : ((window._spsSheet && window._spsSheet.hidden_prices) || {}),
                salesman_name: salesmanName,
                updated_at: nowIso
            })
            .eq('id', window._spsSheet.id);
        if (error) throw error;
        window._spsSheet.prices = prices;
        window._spsDisplayNames = names;
        if (typeof logAdminActivity === 'function') {
            logAdminActivity({
                action: 'save',
                entityType: 'salesman_sheet',
                entityLabel: salesmanName,
                summary: 'Saved sheet only (no store push)',
                details: { productCount: Object.keys(prices).length }
            });
        }
        alert(
            'Saved ' + salesmanName + '\'s sheet.\n\n' +
            'Customers with approved pricing will see these prices and names on their next page load.\n' +
            'Save & Push is optional — it only stamps a copy onto customer sheets.'
        );
    } catch (err) {
        console.error('saveSalesmanPriceSheetOnly:', err);
        alert('Could not save the sheet.\n' + (err.message || ''));
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
        }
    }
}

async function saveSalesmanPriceSheetAndPush(opts) {
    alert('Save & Push has been removed.\n\nEdit the salesman sheet and click Save.\nCustomers with approved pricing see the live sheet on their next page load.');
    return;
}

window.showSalesmanDetail = showSalesmanDetail;
window.loadSalesmanCardCustomers = loadSalesmanCardCustomers;
window.openCustomerFromSalesmanCard = openCustomerFromSalesmanCard;
window.openCustomerPriceVsBaseFromModal = openCustomerPriceVsBaseFromModal;
window.salesmanSheetDisplayName = salesmanSheetDisplayName;
window.collectSalesmanDisplayNames = collectSalesmanDisplayNames;
window.orderLineDisplayName = orderLineDisplayName;
window.normalizeSalesmanSheetName = normalizeSalesmanSheetName;
window.salesmanSheetNameMatches = salesmanSheetNameMatches;
window.isSalesmanSheetHidden = isSalesmanSheetHidden;
window.toggleSalesmanSheetHideSelectAll = toggleSalesmanSheetHideSelectAll;
window.hideSalesmanSheetItemCore = hideSalesmanSheetItemCore;
window.hideSelectedSalesmanSheetItems = hideSelectedSalesmanSheetItems;
window.hideSalesmanSheetItem = hideSalesmanSheetItem;
window.unhideSalesmanSheetItem = unhideSalesmanSheetItem;
window.openSalesmanHiddenModal = openSalesmanHiddenModal;
window.hideSalesmanHiddenModal = hideSalesmanHiddenModal;
window.renderSalesmanHiddenMenu = renderSalesmanHiddenMenu;
window.toggleSalesmanHiddenSelectAll = toggleSalesmanHiddenSelectAll;
window.restoreSalesmanHiddenItem = restoreSalesmanHiddenItem;
window.unhideSelectedSalesmanSheetItems = unhideSelectedSalesmanSheetItems;
window.renderCategorizedPriceSheetTable = renderCategorizedPriceSheetTable;
window.filterInternalSalesmanPriceSheetList = filterInternalSalesmanPriceSheetList;
window.openSalesmanPriceSheetModal = openSalesmanPriceSheetModal;
window.hideSalesmanPriceSheetModal = hideSalesmanPriceSheetModal;
window.setSalesmanPriceSheetEditMode = setSalesmanPriceSheetEditMode;
window.toggleSalesmanPriceSheetEdit = toggleSalesmanPriceSheetEdit;
window.collectSalesmanPriceSheetInputs = collectSalesmanPriceSheetInputs;
window.isJakePetSupplyCustomer = isJakePetSupplyCustomer;
window.applyJakeElkyTrainingPrices = applyJakeElkyTrainingPrices;
window.applyNewSalesmanPriceSheetToCustomer = applyNewSalesmanPriceSheetToCustomer;
window.shouldSkipSalesmanPricePush = shouldSkipSalesmanPricePush;
window.getOpenSalesmanSheetForExport = getOpenSalesmanSheetForExport;
window.salesmanSheetFileSlug = salesmanSheetFileSlug;
window.brianPackCategories = brianPackCategories;
window.priceSheetDisplayCategories = priceSheetDisplayCategories;
window.priceSheetDisplayCategory = priceSheetDisplayCategory;
window.priceSheetCategorySortIndex = priceSheetCategorySortIndex;
window.buildSalesmanSheetExportRows = buildSalesmanSheetExportRows;
window.groupSalesmanSheetRowsByCategory = groupSalesmanSheetRowsByCategory;
window.printOpenSalesmanPriceSheet = printOpenSalesmanPriceSheet;
window.brianExcelSku = brianExcelSku;
window.exportOpenSalesmanPriceSheetExcel = exportOpenSalesmanPriceSheetExcel;
window.loadSheetLogoDataUrl = loadSheetLogoDataUrl;
window.exportOpenSalesmanPriceSheetPdf = exportOpenSalesmanPriceSheetPdf;
window.saveSalesmanPriceSheetOnly = saveSalesmanPriceSheetOnly;
window.saveSalesmanPriceSheetAndPush = saveSalesmanPriceSheetAndPush;

// Salesman edit, reset, and build-price-sheet tools.
async function resetSalesmanPriceSheet() {
    const detailModal = document.getElementById('salesman-modal');
    const salesmanId = detailModal?.dataset?.salesmanId;
    const salesman = salesmanId
        ? salesmen.find(s => String(s.id) === String(salesmanId))
        : null;

    if (!salesman || !(salesman.email || '').trim()) {
        alert('No salesman email on file — cannot reset price sheet.');
        return;
    }

    const email = salesman.email.toLowerCase().trim();
    const name = salesman.name || email;

    const ok = confirm(
        'RESET initial pricing sheet for ' + name + '?\n\n' +
        'This will:\n' +
        '• Delete their approved price sheet\n' +
        '• Set their price sheet status back to Required\n' +
        '• Clear pricing approval on all customers assigned to them (they will not see prices until the salesman re-approves)\n\n' +
        'The salesman must submit a new initial sheet and you must approve it again.'
    );
    if (!ok) return;

    const ok2 = confirm('Are you sure? This cannot be undone.');
    if (!ok2) return;

    try {
        // 1. Delete price sheet row(s)
        const { error: delErr } = await supabaseClient
            .from('salesman_price_sheets')
            .delete()
            .eq('salesman_email', email);
        if (delErr) throw delErr;

        // 2. Set salesman status back to required
        const { error: statusErr } = await supabaseClient
            .from('salesmen')
            .update({ price_sheet_status: 'required' })
            .eq('id', salesmanId);
        if (statusErr) throw statusErr;

        // 3. Re-lock customers assigned to this salesman
        const { error: custErr } = await supabaseClient
            .from('customers')
            .update({ pricing_approved_at: null })
            .eq('salesman_email', email);
        if (custErr) throw custErr;

        // Update local cache
        salesman.priceSheetStatus = 'required';

        alert('Price sheet reset for ' + name + '.\nCustomers under this salesman are locked again until pricing is re-approved.');

        hideSalesmanPriceSheetModal();
        if (typeof showSalesmanDetail === 'function') {
            showSalesmanDetail(salesmanId);
        }
        if (typeof renderSalesmen === 'function') {
            renderSalesmen();
        }
    } catch (err) {
        console.error('resetSalesmanPriceSheet error:', err);
        alert('Could not reset price sheet.\n' + (err.message || ''));
    }
}

async function hideSalesmanModal() {
    const modal = document.getElementById('salesman-modal');
    if (!modal) return;

    // Optional: still allow quick notes save from the detail modal
    const salesmanId = modal.dataset.salesmanId;
    const notesEl = document.getElementById('modal-notes');
    const notes = notesEl ? notesEl.value.trim() : '';

    if (salesmanId && notesEl) {
        const salesman = salesmen.find(s => String(s.id) === String(salesmanId));
        if (salesman) salesman.notes = notes;

        try {
            const { error } = await supabaseClient
                .from('salesmen')
                .update({ notes: notes || null })
                .eq('id', salesmanId);
            if (error) throw error;
        } catch (err) {
            console.error(err);
            // Non-blocking — still close the modal
        }
    }

    modal.style.display = 'none';
    modal.classList.add('hidden');
}

function hideEditSalesmanModal() {
    const modal = document.getElementById('edit-salesman-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.style.display = 'none';
}

function showEditSalesmanModal() {
    const detailModal = document.getElementById('salesman-modal');
    const salesmanId = detailModal?.dataset?.salesmanId;
    if (!salesmanId) {
        alert('No salesman selected.');
        return;
    }

    const salesman = salesmen.find(s => String(s.id) === String(salesmanId));
    if (!salesman) {
        alert('Could not load salesman for editing.');
        return;
    }

    // Hide detail modal
    if (detailModal) {
        detailModal.classList.add('hidden');
        detailModal.style.display = 'none';
    }

    const modal = document.getElementById('edit-salesman-modal');
    if (!modal) return;

    modal.dataset.salesmanId = salesman.id || '';

    document.getElementById('edit-salesman-first-name').value = salesman.firstName || '';
    document.getElementById('edit-salesman-last-name').value = salesman.lastName || '';
    document.getElementById('edit-salesman-email').value = salesman.email || '';
    document.getElementById('edit-salesman-territory').value = salesman.territory || '';
    document.getElementById('edit-salesman-active').checked = salesman.active !== false;
    document.getElementById('edit-salesman-commission').value =
        salesman.commission != null ? salesman.commission : 8;
    document.getElementById('edit-salesman-market-commission').value =
        salesman.marketCommission != null ? salesman.marketCommission : 3;
    document.getElementById('edit-salesman-notes').value = salesman.notes || '';

    // Parse existing mailing address into structured fields
    const parts = (typeof parseAddressBlock === 'function')
        ? parseAddressBlock(salesman.mailingAddress || '')
        : { street: '', apt: '', city: '', state: '', zip: '' };

    document.getElementById('edit-salesman-mail-street').value = parts.street || '';
    document.getElementById('edit-salesman-mail-apt').value = parts.apt || '';
    document.getElementById('edit-salesman-mail-city').value = parts.city || '';
    document.getElementById('edit-salesman-mail-state').value = parts.state || '';
    document.getElementById('edit-salesman-mail-zip').value = parts.zip || '';
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

async function toggleSalesmanActive(salesmanId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') {
            event.stopImmediatePropagation();
        }
    }

    const salesman = (salesmen || []).find(s => String(s.id) === String(salesmanId));
    if (!salesman) {
        alert('Salesman not found.');
        return;
    }

    const currentlyActive = salesman.active !== false;
    const newActive = !currentlyActive;
    const name = salesman.name
        || [salesman.firstName, salesman.lastName].filter(Boolean).join(' ')
        || 'this salesman';

    const action = newActive ? 'enable' : 'disable';
    if (!confirm(`${action === 'enable' ? 'Enable' : 'Disable'} ${name}?`)) {
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('salesmen')
            .update({ active: newActive })
            .eq('id', salesmanId);

        if (error) throw error;

        salesman.active = newActive;
        if (typeof renderSalesmen === 'function') await renderSalesmen();
        if (typeof updateDashboardSalesmen === 'function') updateDashboardSalesmen();
    } catch (err) {
        console.error('toggleSalesmanActive error:', err);
        alert('Could not update salesman status.\n' + (err.message || ''));
    }
}

async function saveEditedSalesman(event) {
    event.preventDefault();

    const modal = document.getElementById('edit-salesman-modal');
    const salesmanId = modal?.dataset?.salesmanId;
    if (!salesmanId) {
        alert('Could not find salesman id. Please close and open again.');
        return;
    }

    const firstName = (document.getElementById('edit-salesman-first-name')?.value || '').trim();
    const lastName = (document.getElementById('edit-salesman-last-name')?.value || '').trim();
    const email = (document.getElementById('edit-salesman-email')?.value || '').trim().toLowerCase();
    const territory = (document.getElementById('edit-salesman-territory')?.value || '').trim();
    const active = document.getElementById('edit-salesman-active')?.checked !== false;
    const commission = parseFloat(document.getElementById('edit-salesman-commission')?.value);
    const marketCommission = parseFloat(document.getElementById('edit-salesman-market-commission')?.value);
    const notes = (document.getElementById('edit-salesman-notes')?.value || '').trim();

    const mailStreet = (document.getElementById('edit-salesman-mail-street')?.value || '').trim();
    const mailApt = (document.getElementById('edit-salesman-mail-apt')?.value || '').trim();
    const mailCity = (document.getElementById('edit-salesman-mail-city')?.value || '').trim();
    const mailState = (document.getElementById('edit-salesman-mail-state')?.value || '').trim();
    const mailZip = (document.getElementById('edit-salesman-mail-zip')?.value || '').trim();
    const mailingAddress = (typeof buildAddressFromParts === 'function')
        ? buildAddressFromParts(mailStreet, mailApt, mailCity, mailState, mailZip)
        : [mailStreet, mailApt, [mailCity, mailState, mailZip].filter(Boolean).join(', ')].filter(Boolean).join('\n');

    if (!firstName || !lastName || !territory) {
        alert('First Name, Last Name, and Territory are required.');
        return;
    }
    if (isNaN(commission) || commission < 0) {
        alert('Please enter a valid Standard Commission %.');
        return;
    }
    if (isNaN(marketCommission) || marketCommission < 0) {
        alert('Please enter a valid Market Price Commission %.');
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('salesmen')
            .update({
                first_name: firstName,
                last_name: lastName,
                email: email || null,
                territory: territory,
                active: active,
                commission: commission,
                market_commission: marketCommission,
                notes: notes || null,
                mailing_address: mailingAddress || null
            })
            .eq('id', salesmanId);

        if (error) throw error;

        hideEditSalesmanModal();

        if (typeof renderSalesmen === 'function') await renderSalesmen();
        if (typeof updateDashboardSalesmen === 'function') updateDashboardSalesmen();

        // Re-open detail so the user sees the updated values
        if (typeof showSalesmanDetail === 'function') {
            showSalesmanDetail(salesmanId);
        }

        alert('Salesman updated.');
    } catch (err) {
        console.error(err);
        alert('Could not update salesman.\n' + (err.message || ''));
    }
}


var _bpsDraft = {
    id: null,
    name: 'Untitled sheet',
    prices: {},
    display_names: {},
    categories: {},
    case_sizes: {},
    hidden: {}
};
var _bpsSource = {
    prices: {},
    display_names: {},
    categories: {},
    case_sizes: {},
    hidden: {}
};
var _spsPendingDraft = null;

function hideBuildPriceSheetModal() {
    document.getElementById('build-price-sheet-modal')?.classList.add('hidden');
}

function resetBuildPriceSheetDraft() {
    _bpsDraft = {
        id: null,
        name: 'Untitled sheet',
        prices: {},
        display_names: {},
        categories: {},
        case_sizes: {},
        hidden: {}
    };
    const nameEl = document.getElementById('bps-draft-name');
    if (nameEl) nameEl.value = 'Untitled sheet';
    const sel = document.getElementById('bps-draft-select');
    if (sel) sel.value = '';
    renderBuildPriceSheetDraft();
}

function setBuildPriceSheetWorkVisible(on) {
    document.getElementById('bps-empty-state')?.classList.toggle('hidden', !!on);
    document.getElementById('bps-create-wrap')?.classList.toggle('hidden', !on);
    document.getElementById('bps-sheet-wrap')?.classList.toggle('hidden', !on);
}

async function openBuildPriceSheetModal() {
    const modal = document.getElementById('build-price-sheet-modal');
    if (!modal) {
        alert('Build Price Sheet modal is missing from internal-portal.html');
        return;
    }
    resetBuildPriceSheetDraft();
    await fillBuildPriceSheetSalesmen();
    await fillBuildPriceSheetDraftSelect();
    fillBuildPriceSheetCategoryOptions();
    setBuildPriceSheetWorkVisible(false);
    modal.classList.remove('hidden');
}

async function loadSalesmanSheetIntoBuilder(email) {
    email = String(email || '').trim();
    if (!email) {
        setBuildPriceSheetWorkVisible(false);
        resetBuildPriceSheetDraft();
        return;
    }
    const isCompany = email === '__company__';
    if (!isCompany) email = email.toLowerCase();
    if (typeof supabaseClient === 'undefined') {
        alert('Stay on internal-portal.html.');
        return;
    }
    const existingKeys = Object.keys(_bpsDraft.prices || {});
    if (existingKeys.length && !confirm('Replace this draft with the selected sheet?\n\nUnsaved draft lines will be dropped. Live sheets are not changed until Save to this sheet.')) {
        return;
    }
    if (isCompany) {
        const prices = {};
        const categories = {};
        const case_sizes = {};
        (typeof PRODUCT_CATALOG !== 'undefined' ? PRODUCT_CATALOG : []).forEach(function (p) {
            if (!p || !p.name) return;
            if (typeof isTestProductName === 'function' && isTestProductName(p.name)) return;
            prices[p.name] = Number(p.unitPrice);
            if (p.category) categories[p.name] = p.category;
            if (p.caseSize) case_sizes[p.name] = p.caseSize;
        });
        _bpsSource.prices = prices;
        _bpsSource.display_names = {};
        _bpsSource.categories = categories;
        _bpsSource.case_sizes = case_sizes;
        _bpsSource.hidden = {};
        const nameEl = document.getElementById('bps-draft-name');
        if (nameEl && (!nameEl.value || nameEl.value === 'Untitled sheet')) {
            nameEl.value = 'Company Base draft';
            _bpsDraft.name = nameEl.value;
        }
        const title = document.getElementById('bps-sheet-title');
        if (title) title.textContent = 'Company Base Sheet';
        document.getElementById('bps-also-catalog-wrap')?.classList.add('hidden');
        document.getElementById('bps-apply-wrap')?.classList.add('hidden');
        setBuildPriceSheetWorkVisible(true);
        fillBuildPriceSheetCategoryOptions();
        updateBuildPriceSheetApplyLabel();
        renderBuildPriceSheetSource();
        renderBuildPriceSheetDraft();
        return;
    }
    const { data: sheet, error } = await supabaseClient
        .from('salesman_price_sheets')
        .select('prices, display_names, hidden_prices, salesman_name')
        .eq('salesman_email', email)
        .maybeSingle();
    if (error) {
        alert(error.message);
        return;
    }
    if (!sheet || !sheet.prices) {
        alert('No live sheet found for ' + email + '.');
        return;
    }
    const hidden = (sheet.hidden_prices && typeof sheet.hidden_prices === 'object') ? sheet.hidden_prices : {};
    const prices = {};
    const display_names = {};
    const categories = {};
    const case_sizes = {};
    const hiddenMap = {};
    Object.keys(sheet.prices).forEach(function (name) {
        prices[name] = Number(sheet.prices[name]);
        if (Object.prototype.hasOwnProperty.call(hidden, name)) hiddenMap[name] = true;
        if (sheet.display_names && sheet.display_names[name]) {
            display_names[name] = sheet.display_names[name];
        }
        const catalog = (typeof PRODUCT_CATALOG !== 'undefined')
            ? PRODUCT_CATALOG.find(function (p) { return p && p.name === name; })
            : null;
        if (catalog && catalog.category) categories[name] = catalog.category;
        if (catalog && catalog.caseSize) case_sizes[name] = catalog.caseSize;
        if (!catalog) categories[name] = categories[name] || 'Special';
    });
    Object.keys(hidden).forEach(function (name) {
        hiddenMap[name] = true;
        if (!Object.prototype.hasOwnProperty.call(prices, name) && sheet.prices && sheet.prices[name] != null) {
            prices[name] = Number(sheet.prices[name]);
        }
    });
    const salesmanRow = (salesmen || []).find(function (s) {
        return String(s.email || s.salesman_email || '').toLowerCase() === email;
    });
    const extras = salesmanRow && Array.isArray(salesmanRow.assignedProducts || salesmanRow.assigned_products)
        ? (salesmanRow.assignedProducts || salesmanRow.assigned_products)
        : [];
    extras.forEach(function (name) {
        if (!name || Object.prototype.hasOwnProperty.call(prices, name)) return;
        const catalog = (PRODUCT_CATALOG || []).find(function (p) { return p && p.name === name; });
        prices[name] = catalog ? Number(catalog.unitPrice) : 0;
        categories[name] = (catalog && catalog.category) || 'Special';
        if (catalog && catalog.caseSize) case_sizes[name] = catalog.caseSize;
    });
    _bpsSource.prices = prices;
    _bpsSource.display_names = display_names;
    _bpsSource.categories = categories;
    _bpsSource.case_sizes = case_sizes;
    _bpsSource.hidden = hiddenMap;
    const nameEl = document.getElementById('bps-draft-name');
    if (nameEl && (!nameEl.value || nameEl.value === 'Untitled sheet')) {
        nameEl.value = (sheet.salesman_name || email) + ' draft';
        _bpsDraft.name = nameEl.value;
    }
    const title = document.getElementById('bps-sheet-title');
    if (title) title.textContent = (sheet.salesman_name || email) + ' — all items';
    document.getElementById('bps-also-catalog-wrap')?.classList.remove('hidden');
    await fillBuildPriceSheetApplyCustomers(email);
    setBuildPriceSheetWorkVisible(true);
    fillBuildPriceSheetCategoryOptions();
    updateBuildPriceSheetApplyLabel();
    renderBuildPriceSheetSource();
    renderBuildPriceSheetDraft();
}

function updateBuildPriceSheetApplyLabel() {
    const name = String(document.getElementById('bps-draft-name')?.value || '').trim() || 'draft';
    const title = document.getElementById('bps-draft-title');
    if (title) title.textContent = 'Draft — ' + name;
}

function applyCheckedItemsToNamedDraft() {
    const boxes = document.querySelectorAll('#bps-source-list [data-bps-apply-name]:checked');
    if (!boxes.length) {
        alert('Check items on the current salesman sheet first.');
        return;
    }
    let added = 0;
    boxes.forEach(function (cb) {
        const name = decodeURIComponent(cb.getAttribute('data-bps-apply-name') || '');
        if (!name || !Object.prototype.hasOwnProperty.call(_bpsSource.prices, name)) return;
        if (Object.prototype.hasOwnProperty.call(_bpsDraft.prices, name)) return;
        _bpsDraft.prices[name] = Number(_bpsSource.prices[name]);
        if (_bpsSource.display_names[name]) _bpsDraft.display_names[name] = _bpsSource.display_names[name];
        if (_bpsSource.categories[name]) _bpsDraft.categories[name] = _bpsSource.categories[name];
        if (_bpsSource.case_sizes[name]) _bpsDraft.case_sizes[name] = _bpsSource.case_sizes[name];
        added += 1;
    });
    updateBuildPriceSheetApplyLabel();
    renderBuildPriceSheetDraft();
    alert('Added ' + added + ' item(s) to "' + (document.getElementById('bps-draft-name')?.value || 'draft') + '". Click Save custom sales sheet when finished.');
}

async function fillBuildPriceSheetApplyCustomers(salesmanEmail) {
    const wrap = document.getElementById('bps-apply-wrap');
    if (!wrap) return;
    if (!salesmanEmail) {
        wrap.classList.add('hidden');
        return;
    }
    wrap.classList.remove('hidden');
    updateBuildPriceSheetApplyLabel();
}

async function _removedBrianCustomerApply() {
    const wrap = document.getElementById('bps-apply-wrap');
    const sel = document.getElementById('bps-apply-customer');
    if (!wrap) return;
    if (!sel) {
        wrap.classList.remove('hidden');
        updateBuildPriceSheetApplyLabel();
        return;
    }
    const isBrian = false;
    if (!isBrian) {
        wrap.classList.remove('hidden');
        updateBuildPriceSheetApplyLabel();
        return;
    }
    if ((!allCustomers || !allCustomers.length) && typeof loadCustomers === 'function') {
        await loadCustomers();
    }
    const stores = (allCustomers || []).filter(function (c) {
        const email = String(c.email || '').toLowerCase();
        const company = String(c.company || '').toLowerCase();
        if (email === 'jackerman@donegalnatural.com') return false;
        if (company.indexOf('admin test store') !== -1) return false;
        return String(c.salesmanEmail || '').toLowerCase() === 'donegaldogtreats@gmail.com';
    }).sort(function (a, b) {
        return String(a.company || a.name || '').localeCompare(String(b.company || b.name || ''));
    });
    sel.innerHTML = '<option value="">Customer…</option>' +
        '<option value="__all__">All Brian stores</option>' +
        stores.map(function (c) {
            const label = (c.company || c.name || c.email || c.id);
            return '<option value="' + escapeHtml(c.id) + '">' + escapeHtml(label) + '</option>';
        }).join('');
    wrap.classList.remove('hidden');
}

async function applyCheckedBuildItemsToCustomer() {
    const target = String(document.getElementById('bps-apply-customer')?.value || '');
    if (!target) {
        alert('Pick a customer (or All Brian stores).');
        return;
    }
    const boxes = document.querySelectorAll('#bps-draft-list [data-bps-apply-name]:checked');
    if (!boxes.length) {
        alert('Check one or more items first.');
        return;
    }
    const names = [];
    boxes.forEach(function (cb) {
        const name = decodeURIComponent(cb.getAttribute('data-bps-apply-name') || '');
        if (!name) return;
        if (_bpsDraft.hidden && _bpsDraft.hidden[name]) return;
        names.push(name);
    });
    if (!names.length) {
        alert('Checked items were hidden on Brian’s sheet and were not added.');
        return;
    }
    if (typeof supabaseClient === 'undefined') {
        alert('Stay on internal-portal.html.');
        return;
    }
    let stores = (allCustomers || []).filter(function (c) {
        const email = String(c.email || '').toLowerCase();
        const company = String(c.company || '').toLowerCase();
        if (email === 'jackerman@donegalnatural.com') return false;
        if (company.indexOf('admin test store') !== -1) return false;
        return String(c.salesmanEmail || '').toLowerCase() === 'donegaldogtreats@gmail.com';
    });
    if (target !== '__all__') {
        stores = stores.filter(function (c) { return String(c.id) === target; });
    }
    if (!stores.length) {
        alert('No matching Brian store.');
        return;
    }
    if (!confirm('Add ' + names.length + ' item(s) to ' + stores.length + ' customer sheet(s)?\n\nExisting customer prices will not change. Hidden items are skipped. Brian’s salesman sheet is not pushed.')) {
        return;
    }
    let updated = 0;
    let added = 0;
    for (let i = 0; i < stores.length; i++) {
        const c = stores[i];
        const { data: sheet, error } = await supabaseClient
            .from('customer_price_sheets')
            .select('id, prices')
            .eq('customer_id', c.id)
            .maybeSingle();
        if (error) {
            alert(error.message);
            return;
        }
        const prices = Object.assign({}, (sheet && sheet.prices) || {});
        let storeAdded = 0;
        names.forEach(function (name) {
            if (Object.prototype.hasOwnProperty.call(prices, name)) return;
            prices[name] = Number(_bpsDraft.prices[name]);
            storeAdded += 1;
        });
        if (!storeAdded) continue;
        const payload = {
            customer_id: c.id,
            salesman_email: 'donegaldogtreats@gmail.com',
            prices: prices,
            updated_at: new Date().toISOString()
        };
        if (sheet && sheet.id) {
            const { error: upErr } = await supabaseClient
                .from('customer_price_sheets')
                .update({ prices: prices, updated_at: payload.updated_at })
                .eq('id', sheet.id);
            if (upErr) { alert(upErr.message); return; }
        } else {
            const { error: insErr } = await supabaseClient
                .from('customer_price_sheets')
                .insert(payload);
            if (insErr) { alert(insErr.message); return; }
        }
        updated += 1;
        added += storeAdded;
    }
    alert('Updated ' + updated + ' customer sheet(s). Added ' + added + ' new price key(s). Existing customer prices kept.');
}

async function fillBuildPriceSheetSalesmen() {
    const sel = document.getElementById('bps-assign-salesman');
    if (!sel) return;
    if ((!salesmen || !salesmen.length) && typeof loadSalesmen === 'function') {
        await loadSalesmen();
    }
    sel.innerHTML = '<option value="">Pick a sheet…</option>' +
        '<option value="__company__">Company Base Sheet</option>' +
        (salesmen || []).map(function (s) {
            const email = String(s.email || s.salesman_email || '').toLowerCase();
            const name = s.name || [s.firstName, s.lastName].filter(Boolean).join(' ') || email;
            return '<option value="' + escapeHtml(email) + '">' + escapeHtml(name + ' (' + email + ')') + '</option>';
        }).join('');
}

async function fillBuildPriceSheetDraftSelect() {
    const sel = document.getElementById('bps-draft-select');
    if (!sel || typeof supabaseClient === 'undefined') return;
    const { data, error } = await supabaseClient
        .from('salesman_price_sheet_drafts')
        .select('id, name, updated_at')
        .order('updated_at', { ascending: false });
    if (error) {
        console.warn('drafts list', error);
        return;
    }
    sel.innerHTML = '<option value="">New draft</option>' +
        (data || []).map(function (row) {
            return '<option value="' + escapeHtml(row.id) + '">' + escapeHtml(row.name || 'Untitled') + '</option>';
        }).join('');
}

async function loadBuildPriceSheetDraft(id) {
    if (!id) {
        resetBuildPriceSheetDraft();
        renderBuildPriceSheetCatalog();
        return;
    }
    const { data, error } = await supabaseClient
        .from('salesman_price_sheet_drafts')
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (error || !data) {
        alert((error && error.message) || 'Draft not found');
        return;
    }
    _bpsDraft = {
        id: data.id,
        name: data.name || 'Untitled sheet',
        prices: Object.assign({}, data.prices || {}),
        display_names: Object.assign({}, data.display_names || {}),
        categories: Object.assign({}, data.categories || {}),
        case_sizes: Object.assign({}, data.case_sizes || {})
    };
    const nameEl = document.getElementById('bps-draft-name');
    if (nameEl) nameEl.value = _bpsDraft.name;
    renderBuildPriceSheetCatalog();
    renderBuildPriceSheetDraft();
}

function fillBuildPriceSheetCategoryOptions() {
    const list = document.getElementById('bps-category-options');
    if (!list) return;
    const cats = (typeof knownAddProductCategories === 'function')
        ? knownAddProductCategories()
        : [];
    list.innerHTML = cats.map(function (c) {
        return '<option value="' + escapeHtml(c) + '">';
    }).join('');
}

function bpsItemCategories(raw) {
    return String(raw || '')
        .split(',')
        .map(function (c) { return String(c || '').trim(); })
        .filter(Boolean);
}

function renderBuildPriceSheetCatalog() {
    const box = document.getElementById('bps-catalog-list');
    if (!box) return;
    const term = String(document.getElementById('bps-catalog-search')?.value || '').toLowerCase().trim();
    const rows = (typeof PRODUCT_CATALOG !== 'undefined' ? PRODUCT_CATALOG : []).filter(function (p) {
        if (!p || !p.name) return false;
        if (typeof isTestProductName === 'function' && isTestProductName(p.name)) return false;
        if (Object.prototype.hasOwnProperty.call(_bpsDraft.prices, p.name)) return false;
        if (!term) return true;
        return String(p.name).toLowerCase().indexOf(term) !== -1 ||
            String(p.category || '').toLowerCase().indexOf(term) !== -1;
    });
    const groups = {};
    rows.forEach(function (p) {
        const cats = bpsItemCategories(p.category);
        (cats.length ? cats : ['Other']).forEach(function (cat) {
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(p);
        });
    });
    const headers = Object.keys(groups).sort();
    box.innerHTML = headers.map(function (cat) {
        const items = groups[cat].map(function (p) {
            const price = (p.unitPrice != null && p.unitPrice !== '') ? ('$' + Number(p.unitPrice).toFixed(2)) : '—';
            return '<label class="flex items-start gap-2 text-sm py-1 border-b border-[#e8d9b8]">' +
                '<input type="checkbox" class="accent-[#1E4D2B] mt-1" data-bps-cat-name="' + encodeURIComponent(p.name) + '">' +
                '<span><span class="font-semibold brand-green">' + escapeHtml(p.name) + '</span>' +
                '<span class="block text-xs text-[#6B4423]">' +
                (p.caseSize ? escapeHtml(p.caseSize) + ' · ' : '') + escapeHtml(price) + '</span></span></label>';
        }).join('');
        return '<p class="text-xs font-bold brand-green uppercase tracking-wide mt-3 mb-1">' + escapeHtml(cat) + '</p>' + items;
    }).join('') || '<p class="text-sm text-[#6B4423]">No catalog items match.</p>';
}

function toggleBuildPriceSheetCat(btn) {
    const body = btn && btn.nextElementSibling;
    if (!body) return;
    const open = body.classList.toggle('hidden');
    const caret = btn.querySelector('[data-bps-caret]');
    if (caret) caret.textContent = open ? '▸' : '▾';
}

function renderBuildPriceSheetSource() {
    const box = document.getElementById('bps-source-list');
    const countEl = document.getElementById('bps-source-count');
    if (!box) return;
    const term = String(document.getElementById('bps-sheet-search')?.value || '').toLowerCase().trim();
    const names = Object.keys(_bpsSource.prices || {}).filter(function (name) {
        if (!term) return true;
        const nick = String((_bpsSource.display_names && _bpsSource.display_names[name]) || '').toLowerCase();
        return String(name).toLowerCase().indexOf(term) !== -1 ||
            nick.indexOf(term) !== -1 ||
            String(_bpsSource.categories[name] || '').toLowerCase().indexOf(term) !== -1;
    }).sort();
    if (countEl) countEl.textContent = names.length + ' item' + (names.length === 1 ? '' : 's');
    if (!names.length) {
        box.innerHTML = '<p class="text-sm text-[#6B4423]">No source items.</p>';
        return;
    }
    const groups = {};
    names.forEach(function (name) {
        const raw = _bpsSource.categories[name] || 'Other';
        const cats = (typeof bpsItemCategories === 'function') ? bpsItemCategories(raw) : [raw];
        (cats.length ? cats : ['Other']).forEach(function (cat) {
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(name);
        });
    });
    box.innerHTML = Object.keys(groups).sort().map(function (cat) {
        const items = groups[cat].map(function (name) {
            const price = Number(_bpsSource.prices[name]);
            const hiddenBadge = (_bpsSource.hidden && _bpsSource.hidden[name])
                ? '<span class="ml-2 text-xs font-bold bg-red-100 text-red-800 px-1.5 py-0.5 rounded">Hidden</span>'
                : '';
            const nick = (_bpsSource.display_names && _bpsSource.display_names[name]) || '';
            const title = nick && nick !== name ? nick : name;
            const sub = nick && nick !== name
                ? '<span class="block text-xs text-[#8a7a68]">' + escapeHtml(name) + '</span>'
                : '';
            return '<label class="flex items-start gap-2 bg-white border border-[#6B4423] rounded-xl px-3 py-2 mb-2">' +
                '<input type="checkbox" class="accent-[#1E4D2B] mt-1" data-bps-apply-name="' + encodeURIComponent(name) + '">' +
                '<span><span class="text-sm font-semibold brand-green">' + escapeHtml(title) + hiddenBadge +
                '</span>' + sub +
                '<span class="block text-xs text-[#6B4423]">$' +
                (isFinite(price) ? price.toFixed(2) : '0.00') + '</span></span></label>';
        }).join('');
        const open = !!term;
        return '<button type="button" class="w-full text-left text-xs font-bold brand-green uppercase tracking-wide mt-3 mb-1" onclick="toggleBuildPriceSheetCat(this)">' +
            '<span data-bps-caret>' + (open ? '▾' : '▸') + '</span> ' + escapeHtml(cat) +
            ' (' + groups[cat].length + ')</button>' +
            '<div class="' + (open ? '' : 'hidden') + '">' + items + '</div>';
    }).join('');
}

function renderBuildPriceSheetDraft() {
    const box = document.getElementById('bps-draft-list');
    const countEl = document.getElementById('bps-draft-count');
    const names = Object.keys(_bpsDraft.prices || {}).sort();
    if (countEl) countEl.textContent = names.length + ' item' + (names.length === 1 ? '' : 's');
    if (!box) return;
    if (!names.length) {
        box.innerHTML = '<p class="text-sm text-[#6B4423]">No items in this draft yet.</p>';
        return;
    }
    const groups = {};
    names.forEach(function (name) {
        const catalog = (PRODUCT_CATALOG || []).find(function (p) { return p && p.name === name; });
        const raw = _bpsDraft.categories[name] || (catalog && catalog.category) || 'Other';
        const cats = bpsItemCategories(raw);
        (cats.length ? cats : ['Other']).forEach(function (cat) {
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(name);
        });
    });
    box.innerHTML = Object.keys(groups).sort().map(function (cat) {
        const items = groups[cat].map(function (name) {
            const price = Number(_bpsDraft.prices[name]);
            const cs = _bpsDraft.case_sizes[name] || '';
            const hiddenBadge = (_bpsDraft.hidden && _bpsDraft.hidden[name])
                ? '<span class="ml-2 text-xs font-bold bg-red-100 text-red-800 px-1.5 py-0.5 rounded">Hidden</span>'
                : '';
            const catalogHit = (PRODUCT_CATALOG || []).some(function (p) { return p && p.name === name; });
            const specialBadge = !catalogHit
                ? '<span class="ml-2 text-xs font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">Special</span>'
                : '';
            const applyBox = document.getElementById('bps-apply-wrap') &&
                !document.getElementById('bps-apply-wrap').classList.contains('hidden')
                ? '<input type="checkbox" class="accent-[#1E4D2B] mt-1" data-bps-apply-name="' + encodeURIComponent(name) + '">'
                : '';
            return '<div class="bg-white border border-[#6B4423] rounded-xl px-3 py-2 mb-2">' +
                '<div class="flex justify-between gap-2">' +
                '<p class="text-sm font-semibold brand-green flex items-start gap-2">' + applyBox +
                '<span>' + escapeHtml(name) + hiddenBadge + specialBadge + '</span></p>' +
                '<button type="button" class="text-red-700 text-xs" onclick="removeBuildPriceSheetItem(\'' +
                encodeURIComponent(name) + '\')">Remove</button></div>' +
                '<p class="text-xs text-[#6B4423]">' + (cs ? escapeHtml(cs) : '') + '</p>' +
                '<label class="text-xs text-[#6B4423]">$ <input type="number" step="0.01" min="0" value="' +
                (isFinite(price) ? price.toFixed(2) : '') +
                '" class="w-24 border-2 border-[#6B4423] rounded-lg px-2 py-1 text-sm" onchange="updateBuildPriceSheetPrice(\'' +
                encodeURIComponent(name) + '\', this.value)"></label></div>';
        }).join('');
        return '<button type="button" class="w-full text-left text-xs font-bold brand-green uppercase tracking-wide mt-3 mb-1" onclick="toggleBuildPriceSheetCat(this)">' +
            '<span data-bps-caret>▸</span> ' + escapeHtml(cat) +
            ' (' + groups[cat].length + ')</button>' +
            '<div class="hidden">' + items + '</div>';
    }).join('');
}

function bulkAddBuildPriceSheetItems() {
    const boxes = document.querySelectorAll('#bps-catalog-list [data-bps-cat-name]:checked');
    if (!boxes.length) {
        alert('Check one or more company products first.');
        return;
    }
    boxes.forEach(function (cb) {
        const name = decodeURIComponent(cb.getAttribute('data-bps-cat-name') || '');
        const p = (PRODUCT_CATALOG || []).find(function (row) { return row && row.name === name; });
        if (!name || !p) return;
        _bpsDraft.prices[name] = Number(p.unitPrice);
        if (p.category) _bpsDraft.categories[name] = p.category;
        if (p.caseSize) _bpsDraft.case_sizes[name] = p.caseSize;
    });
    renderBuildPriceSheetCatalog();
    renderBuildPriceSheetDraft();
}

async function addCustomBuildPriceSheetItem() {
    const name = String(document.getElementById('bps-new-name')?.value || '').trim();
    const category = String(document.getElementById('bps-new-category')?.value || '').trim() || 'Other';
    const caseSize = String(document.getElementById('bps-new-case')?.value || '').trim();
    const price = parseFloat(document.getElementById('bps-new-price')?.value || '');
    if (!name) {
        alert('Product name is required.');
        return;
    }
    if (isNaN(price) || price < 0) {
        alert('Enter a valid price.');
        return;
    }
    if (typeof supabaseClient === 'undefined') {
        alert('Stay on internal-portal.html.');
        return;
    }
    const selectedSheet = String(document.getElementById('bps-assign-salesman')?.value || '');
    const alsoCompany = selectedSheet === '__company__' ||
        document.getElementById('bps-also-catalog')?.checked === true;
    const existing = await supabaseClient.from('products').select('id').eq('name', name).maybeSingle();
    if (existing.error) {
        alert(existing.error.message);
        return;
    }
    const inDraft = Object.prototype.hasOwnProperty.call(_bpsDraft.prices, name);
    if (existing.data || inDraft) {
        if (!confirm('"' + name + '" already exists.\n\nOverwrite price / category / case size on this sheet' + (alsoCompany ? ' and the company sheet' : '') + '?')) {
            return;
        }
        if (alsoCompany && existing.data) {
            const updated = await supabaseClient.from('products').update({
                category: category,
                case_size: caseSize || null,
                unit_price: price,
                active: true,
                updated_at: new Date().toISOString()
            }).eq('name', name);
            if (updated.error) {
                alert(updated.error.message);
                return;
            }
            const catRow = (typeof PRODUCT_CATALOG !== 'undefined')
                ? PRODUCT_CATALOG.find(function (p) { return p && p.name === name; })
                : null;
            if (catRow) {
                catRow.category = category;
                catRow.caseSize = caseSize;
                catRow.unitPrice = price;
            }
        }
    } else if (alsoCompany) {
        const inserted = await supabaseClient.from('products').insert({
            name: name,
            category: category,
            case_size: caseSize || null,
            unit_price: price,
            is_market_price: false,
            active: true
        });
        if (inserted.error) {
            alert(inserted.error.message);
            return;
        }
        if (typeof PRODUCT_CATALOG !== 'undefined') {
            PRODUCT_CATALOG.push({
                name: name,
                category: category,
                caseSize: caseSize,
                unitPrice: price,
                isMarketPrice: false
            });
        }
    }
    _bpsDraft.prices[name] = price;
    _bpsDraft.categories[name] = category;
    if (caseSize) _bpsDraft.case_sizes[name] = caseSize;
    document.getElementById('bps-new-name').value = '';
    document.getElementById('bps-new-price').value = '';
    fillBuildPriceSheetCategoryOptions();
    renderBuildPriceSheetCatalog();
    renderBuildPriceSheetDraft();
    alert(existing.data || inDraft
        ? 'Overwrote the company sheet and this draft line only. Other salesmen and stores were not changed.'
        : 'Created on the Company Base Price Sheet and added to this draft only. Other salesmen and stores were not changed.');
}

function removeBuildPriceSheetItem(encoded) {
    const name = decodeURIComponent(encoded || '');
    delete _bpsDraft.prices[name];
    delete _bpsDraft.display_names[name];
    delete _bpsDraft.categories[name];
    delete _bpsDraft.case_sizes[name];
    renderBuildPriceSheetCatalog();
    renderBuildPriceSheetDraft();
}

function updateBuildPriceSheetPrice(encoded, raw) {
    const name = decodeURIComponent(encoded || '');
    const n = parseFloat(raw);
    if (!name || isNaN(n) || n < 0) return;
    _bpsDraft.prices[name] = n;
}

async function saveBuildPriceSheetDraft() {
    if (typeof supabaseClient === 'undefined') {
        alert('Stay on internal-portal.html.');
        return;
    }
    const name = String(document.getElementById('bps-draft-name')?.value || '').trim() || 'Untitled sheet';
    _bpsDraft.name = name;
    const payload = {
        name: name,
        prices: _bpsDraft.prices,
        display_names: _bpsDraft.display_names,
        categories: _bpsDraft.categories,
        case_sizes: _bpsDraft.case_sizes,
        updated_at: new Date().toISOString()
    };
    try {
        const u = JSON.parse(localStorage.getItem('currentUser') || '{}');
        payload.created_by = String(u.email || '').toLowerCase();
    } catch (e) {}
    if (_bpsDraft.id) {
        const { error } = await supabaseClient
            .from('salesman_price_sheet_drafts')
            .update(payload)
            .eq('id', _bpsDraft.id);
        if (error) { alert(error.message); return; }
    } else {
        const { data, error } = await supabaseClient
            .from('salesman_price_sheet_drafts')
            .insert(payload)
            .select('id')
            .maybeSingle();
        if (error) { alert(error.message); return; }
        _bpsDraft.id = data && data.id;
    }
    await fillBuildPriceSheetDraftSelect();
    const sel = document.getElementById('bps-draft-select');
    if (sel && _bpsDraft.id) sel.value = _bpsDraft.id;
    alert('Draft saved. Live salesman sheets were not changed.');
}

async function assignBuildPriceSheetDraft() {
    const email = String(document.getElementById('bps-assign-salesman')?.value || '').toLowerCase().trim();
    if (!email || email === '__company__') {
        alert('Pick a salesman to save this onto. Company Base is edited with Create item + the company checkbox.');
        return;
    }
    const keys = Object.keys(_bpsDraft.prices || {});
    if (!keys.length) {
        alert('Add items to the draft first.');
        return;
    }
    if (!confirm('Merge ' + keys.length + ' draft item(s) onto ' + email + '?\n\nExisting prices, nicknames, and hidden items will not change.\nStores will not be pushed.')) {
        return;
    }
    await saveBuildPriceSheetDraft();
    const { data: sheet, error } = await supabaseClient
        .from('salesman_price_sheets')
        .select('id, prices, display_names, hidden_prices, salesman_name')
        .eq('salesman_email', email)
        .maybeSingle();
    if (error) { alert(error.message); return; }
    const salesman = (salesmen || []).find(function (s) {
        return String(s.email || s.salesman_email || '').toLowerCase() === email;
    });
    const salesmanName = (salesman && (salesman.name || [salesman.firstName, salesman.lastName].filter(Boolean).join(' '))) || (sheet && sheet.salesman_name) || email;
    const prices = Object.assign({}, (sheet && sheet.prices) || {});
    const names = Object.assign({}, (sheet && sheet.display_names) || {});
    const hidden = (sheet && sheet.hidden_prices) ? sheet.hidden_prices : {};
    let added = 0;
    keys.forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(prices, key)) return;
        if (_bpsDraft.hidden && _bpsDraft.hidden[key]) return;
        prices[key] = Number(_bpsDraft.prices[key]);
        if (_bpsDraft.display_names[key]) names[key] = _bpsDraft.display_names[key];
        added += 1;
    });
    if (sheet && sheet.id) {
        const { error: upErr } = await supabaseClient
            .from('salesman_price_sheets')
            .update({
                prices: prices,
                display_names: names,
                hidden_prices: hidden,
                updated_at: new Date().toISOString()
            })
            .eq('id', sheet.id);
        if (upErr) { alert(upErr.message); return; }
    } else {
        const { error: insErr } = await supabaseClient
            .from('salesman_price_sheets')
            .insert({
                salesman_email: email,
                salesman_name: salesmanName,
                prices: prices,
                display_names: names,
                hidden_prices: {}
            });
        if (insErr) { alert(insErr.message); return; }
    }
    if (_bpsDraft.id) {
        await supabaseClient
            .from('salesman_price_sheet_drafts')
            .update({
                assigned_to_email: email,
                assigned_at: new Date().toISOString()
            })
            .eq('id', _bpsDraft.id);
    }
    alert('Assigned to ' + email + '. Added ' + added + ' new key(s). Existing prices / hidden items / nicknames kept. Stores not pushed.');
}

function showAddSalesmanModal() {
    const modal = document.getElementById('add-salesman-modal');
    if (!modal) {
        alert('Add Salesman modal not found.');
        return;
    }

    const nameEl = document.getElementById('new-salesman-name');
    const territoryEl = document.getElementById('new-salesman-territory');
    const commissionEl = document.getElementById('new-salesman-commission');
    const activeEl = document.getElementById('new-salesman-active');

    if (nameEl) nameEl.value = '';
    if (territoryEl) territoryEl.value = '';
    if (commissionEl) commissionEl.value = '8';
    if (activeEl) activeEl.checked = true;

    modal.classList.remove('hidden');
    if (nameEl) nameEl.focus();
}

function hideAddSalesmanModal() {
    const modal = document.getElementById('add-salesman-modal');
    if (modal) modal.classList.add('hidden');
}

async function addNewSalesman(e) {
    e.preventDefault();

    const btn = e.submitter || document.getElementById('add-salesman-submit-btn');
    if (btn && btn.dataset.busy === '1') return;
    if (btn) {
        btn.dataset.busy = '1';
        btn.disabled = true;
        btn.textContent = 'Saving…';
    }

    const firstName = document.getElementById('new-first-name').value.trim();
    const lastName = document.getElementById('new-last-name').value.trim();
    const territory = document.getElementById('new-territory').value.trim();
    const commission = parseFloat(document.getElementById('new-commission').value) || 8;
    const marketCommission = parseFloat(document.getElementById('new-market-commission').value) || 3;
    const email = (document.getElementById('new-salesman-email')?.value || "").trim().toLowerCase();

    const mailStreet = (document.getElementById('new-salesman-mail-street')?.value || '').trim();
    const mailApt = (document.getElementById('new-salesman-mail-apt')?.value || '').trim();
    const mailCity = (document.getElementById('new-salesman-mail-city')?.value || '').trim();
    const mailState = (document.getElementById('new-salesman-mail-state')?.value || '').trim();
    const mailZip = (document.getElementById('new-salesman-mail-zip')?.value || '').trim();
    const mailingAddress = (typeof buildAddressFromParts === 'function')
        ? buildAddressFromParts(mailStreet, mailApt, mailCity, mailState, mailZip)
        : [mailStreet, mailApt, [mailCity, mailState, mailZip].filter(Boolean).join(', ')].filter(Boolean).join('\n');

    const unlock = () => {
        if (btn) {
            btn.dataset.busy = '0';
            btn.disabled = false;
            btn.textContent = 'Add Salesman';
        }
    };

    if (!firstName || !lastName || !territory) {
        unlock();
        alert("Please fill in First Name, Last Name, and Territory.");
        return;
    }
    if (!email || !email.includes('@')) {
        unlock();
        alert("A valid email is required so the salesman can log in and receive credentials.");
        return;
    }

    const fullName = firstName + ' ' + lastName;

    try {
        await assertSalesmanEmailAvailable(email);

        const fnUrl = SUPABASE_URL + '/functions/v1/create-salesman-user';
        const fnRes = await fetch(fnUrl, {
            method: 'POST',
            headers: await getEdgeFunctionHeaders(),
            body: JSON.stringify({
                email: email,
                full_name: fullName,
                territory: territory
            })
        });

        const fnText = await fnRes.text();
        let fnData = null;
        try {
            fnData = JSON.parse(fnText);
        } catch (e) {
            fnData = { error: fnText || 'Empty response' };
        }

        if (!fnRes.ok || (fnData && fnData.error)) {
            throw new Error(
                (fnData && fnData.error) ? fnData.error : ('Function HTTP ' + fnRes.status)
            );
        }

        const row = {
            first_name: firstName,
            last_name: lastName,
            email: email,
            territory: territory,
            commission: commission,
            market_commission: marketCommission,
            price_sheet_status: 'required',
            yearly_sales: 0,
            monthly_sales: 0,
            active: true,
            mailing_address: mailingAddress || null
        };

        let { data, error } = await supabaseClient
            .from('salesmen')
            .upsert(row, { onConflict: 'email' })
            .select()
            .single();

        if (error && (error.code === '23505' || error.status === 409 || /duplicate|already exists|409/i.test(error.message || ''))) {
            const updated = await supabaseClient
                .from('salesmen')
                .update({
                    first_name: firstName,
                    last_name: lastName,
                    territory: territory,
                    commission: commission,
                    market_commission: marketCommission,
                    mailing_address: mailingAddress || null,
                    active: true
                })
                .ilike('email', email)
                .select()
                .single();
            data = updated.data;
            error = updated.error;
        }

        if (error) {
            console.error(error);
            throw new Error("Login was created, but saving the salesman row failed.\n" + error.message);
        }

        const emailOk = fnData && fnData.email_sent === true;
        const emailFailReason = (fnData && fnData.email_error) ? String(fnData.email_error) : '';
        const returnedTemp = (fnData && fnData.temp_password) ? String(fnData.temp_password) : '';

        alert(
            'Salesman ' + firstName + ' ' + lastName + ' has been added.\n' +
            'Login account created.\n\n' +
            (emailOk
                ? 'Credentials email was sent to the salesman.\nThey must change the password on first login.'
                : ('Credentials email was NOT sent.\n' +
                   (emailFailReason ? ('Reason: ' + emailFailReason + '\n') : '') +
                   (returnedTemp
                       ? ('Temporary password (give to salesman):\n' + returnedTemp)
                       : 'Please check the Edge Function logs.')))
        );
        hideAddSalesmanModal();
        document.getElementById('add-salesman-form').reset();

        if (typeof renderSalesmen === 'function') renderSalesmen();
        if (typeof updateDashboardSalesmen === 'function') updateDashboardSalesmen();

    } catch (err) {
        console.error(err);
        alert("Could not add salesman.\n\n" + (err.message || String(err)));
    } finally {
        unlock();
    }
}

function saveNewSalesman(event) {
    event.preventDefault();

    const name = (document.getElementById('new-salesman-name')?.value || '').trim();
    const territory = (document.getElementById('new-salesman-territory')?.value || '').trim();
    const commission = parseFloat(document.getElementById('new-salesman-commission')?.value);
    const active = document.getElementById('new-salesman-active')?.checked !== false;

    if (!name) {
        alert('Name is required.');
        return;
    }
    if (!territory) {
        alert('Territory is required.');
        return;
    }
    if (isNaN(commission) || commission < 0) {
        alert('Please enter a valid commission %.');
        return;
    }

    if (typeof salesmen === 'undefined' || !Array.isArray(salesmen)) {
        salesmen = JSON.parse(localStorage.getItem('salesmen') || '[]');
    }

    const newSalesman = {
        id: Date.now(),
        name: name,
        territory: territory,
        commission: commission,
        yearlySales: 0,
        monthlySales: 0,
        active: active,
        createdAt: new Date().toISOString()
    };

    salesmen.unshift(newSalesman);
    saveSalesmen();
    hideAddSalesmanModal();

    if (typeof renderSalesmen === 'function') renderSalesmen();
    if (typeof updateDashboardSalesmen === 'function') updateDashboardSalesmen();

    alert('Salesman added: ' + newSalesman.name);
}

window.resetSalesmanPriceSheet = resetSalesmanPriceSheet;
window.hideSalesmanModal = hideSalesmanModal;
window.hideEditSalesmanModal = hideEditSalesmanModal;
window.showEditSalesmanModal = showEditSalesmanModal;
window.toggleSalesmanActive = toggleSalesmanActive;
window.saveEditedSalesman = saveEditedSalesman;
window.hideBuildPriceSheetModal = hideBuildPriceSheetModal;
window.resetBuildPriceSheetDraft = resetBuildPriceSheetDraft;
window.setBuildPriceSheetWorkVisible = setBuildPriceSheetWorkVisible;
window.openBuildPriceSheetModal = openBuildPriceSheetModal;
window.loadSalesmanSheetIntoBuilder = loadSalesmanSheetIntoBuilder;
window.updateBuildPriceSheetApplyLabel = updateBuildPriceSheetApplyLabel;
window.applyCheckedItemsToNamedDraft = applyCheckedItemsToNamedDraft;
window.fillBuildPriceSheetApplyCustomers = fillBuildPriceSheetApplyCustomers;
window._removedBrianCustomerApply = _removedBrianCustomerApply;
window.applyCheckedBuildItemsToCustomer = applyCheckedBuildItemsToCustomer;
window.fillBuildPriceSheetSalesmen = fillBuildPriceSheetSalesmen;
window.fillBuildPriceSheetDraftSelect = fillBuildPriceSheetDraftSelect;
window.loadBuildPriceSheetDraft = loadBuildPriceSheetDraft;
window.fillBuildPriceSheetCategoryOptions = fillBuildPriceSheetCategoryOptions;
window.bpsItemCategories = bpsItemCategories;
window.renderBuildPriceSheetCatalog = renderBuildPriceSheetCatalog;
window.toggleBuildPriceSheetCat = toggleBuildPriceSheetCat;
window.renderBuildPriceSheetSource = renderBuildPriceSheetSource;
window.renderBuildPriceSheetDraft = renderBuildPriceSheetDraft;
window.bulkAddBuildPriceSheetItems = bulkAddBuildPriceSheetItems;
window.addCustomBuildPriceSheetItem = addCustomBuildPriceSheetItem;
window.removeBuildPriceSheetItem = removeBuildPriceSheetItem;
window.updateBuildPriceSheetPrice = updateBuildPriceSheetPrice;
window.saveBuildPriceSheetDraft = saveBuildPriceSheetDraft;
window.assignBuildPriceSheetDraft = assignBuildPriceSheetDraft;
window.showAddSalesmanModal = showAddSalesmanModal;
window.hideAddSalesmanModal = hideAddSalesmanModal;
window.addNewSalesman = addNewSalesman;
window.saveNewSalesman = saveNewSalesman;

// Salesman list, password reset, and order invoice modal.
// ================== SALESMEN ==================
// --- Salesmen Helpers ---

function saveSalesmen() {
    // localStorage writes removed – salesmen live in Supabase
}

function addTestSalesman() {
    const firstNames = ['Brian', 'Sarah', 'Mike', 'Jessica', 'David'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Davis'];
    const territories = ['Florida', 'Northeast', 'Midwest', 'Southeast', 'West Coast'];

    const newSalesman = {
        id: Date.now(),
        name: firstNames[Math.floor(Math.random() * firstNames.length)] + ' ' +
              lastNames[Math.floor(Math.random() * lastNames.length)],
        territory: territories[Math.floor(Math.random() * territories.length)],
        commission: 8,
        yearlySales: Math.floor(Math.random() * 200000) + 100000,
        monthlySales: Math.floor(Math.random() * 30000) + 15000,
        active: true
    };

    salesmen.push(newSalesman);
    saveSalesmen();

    alert('Test salesman added: ' + newSalesman.name);
    // Optional: refresh the section if you have a render function
    if (typeof renderSalesmen === 'function') {
        renderSalesmen();
    }
}

function getSalesmanOrderTotals(salesman) {
    const fullName = (
        salesman.name ||
        [salesman.firstName, salesman.lastName].filter(Boolean).join(' ') ||
        ''
    ).trim().toLowerCase();
    const email = (salesman.email || '').trim().toLowerCase();

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let yearly = 0;
    let monthly = 0;

    (allOrders || []).forEach(order => {
        if (typeof isTestStoreOrder === 'function' && isTestStoreOrder(order)) return;
        const orderName = (
            order.salesman ||
            order.salesman_name ||
            order.salesmanName ||
            ''
        ).trim().toLowerCase();
        const orderEmail = (
            order.salesmanEmail ||
            order.salesman_email ||
            ''
        ).trim().toLowerCase();

        const nameMatch = fullName && orderName && orderName === fullName;
        const emailMatch = email && orderEmail && orderEmail === email;
        if (!nameMatch && !emailMatch) return;

        const orderDate = new Date(
            order.submittedAt || order.submitted_at || order.created_at || order.date || 0
        );
        if (isNaN(orderDate.getTime())) return;

        let orderTotal = 0;
        (order.items || []).forEach(item => {
            const qty = parseInt(item.quantity, 10) || 0;
            const unit = typeof getOrderItemUnitPrice === 'function'
                ? getOrderItemUnitPrice(item)
                : (parseFloat(item.unitPrice) || 0);
            orderTotal += qty * unit;
        });

        if (orderDate >= startOfYear) yearly += orderTotal;
        if (orderDate >= startOfMonth) monthly += orderTotal;
    });

    return { yearly, monthly };
}

let currentSalesmanOrdersId = null;

function hideSalesmanOrdersModal() {
    const modal = document.getElementById('salesman-orders-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.style.display = 'none';
}

function openSalesmanOrdersModal() {
    const detailModal = document.getElementById('salesman-modal');
    const salesmanId = detailModal?.dataset?.salesmanId;
    const salesman = salesmanId
        ? salesmen.find(s => String(s.id) === String(salesmanId))
        : null;

    if (!salesman) {
        alert('No salesman selected.');
        return;
    }

    currentSalesmanOrdersId = salesman.id;

    const titleEl = document.getElementById('salesman-orders-title');
    const displayName = salesman.name
        || [salesman.firstName, salesman.lastName].filter(Boolean).join(' ')
        || 'Salesman';
    if (titleEl) titleEl.textContent = `Orders — ${displayName}`;

    const fill = () => {
        renderSalesmanOrdersList(salesman);
        const modal = document.getElementById('salesman-orders-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
        }
    };

    if (typeof loadOrders === 'function' && (!allOrders || allOrders.length === 0)) {
        loadOrders().then(fill);
    } else {
        fill();
    }
}

// hideSalesmanModal lives in js/internal/salesmen.js (the version that saves notes).


async function deleteSalesman() {
    const modal = document.getElementById('salesman-modal');
    const salesmanId = modal?.dataset?.salesmanId;
    if (!salesmanId) {
        alert('Could not find salesman id.');
        return;
    }

    const salesman = (salesmen || []).find(s => String(s.id) === String(salesmanId));
    if (!salesman) {
        alert('Salesman not found.');
        return;
    }

    const displayName = salesman.name
        || [salesman.firstName, salesman.lastName].filter(Boolean).join(' ')
        || 'this salesman';
    const email = (salesman.email || '').toLowerCase().trim();

    if (!email) {
        alert('This salesman has no email on file. Cannot safely delete.');
        return;
    }

    // Confirm 1
    if (!confirm(
        'PERMANENTLY delete ' + displayName + '?\n\n' +
        'This will:\n' +
        '• Remove their login (Auth + profile)\n' +
        '• Delete their salesmen record and price sheet\n' +
        '• Unassign every customer currently under them (prices re-lock until a new salesman approves)\n\n' +
        'Orders and customer records are NEVER deleted.\n\n' +
        'This cannot be undone.'
    )) {
        return;
    }

    // Confirm 2 — type the exact email
    const typed = prompt(
        'Type the salesman email exactly to confirm permanent delete:\n\n' + email
    );
    if (typed === null) return;
    if (typed.toLowerCase().trim() !== email) {
        alert('Email did not match. Delete cancelled.');
        return;
    }

    try {
        // 1. Unassign customers + re-lock pricing (Option A)
        const { error: custErr } = await supabaseClient
            .from('customers')
            .update({
                salesman_email: null,
                assigned_at: null,
                pricing_approved_at: null,
                pricing_approved_by: null
            })
            .eq('salesman_email', email);
        if (custErr) throw custErr;

        // 2. Delete price sheet(s)
        const { error: sheetErr } = await supabaseClient
            .from('salesman_price_sheets')
            .delete()
            .eq('salesman_email', email);
        if (sheetErr) throw sheetErr;

        // 3. Delete salesmen row
        const { error: salesErr } = await supabaseClient
            .from('salesmen')
            .delete()
            .eq('id', salesmanId);
        if (salesErr) throw salesErr;

        // 4. Auth + profiles cleanup via Edge Function (Step 3)
        try {
            const fnUrl = SUPABASE_URL + '/functions/v1/delete-salesman-user';
            const fnRes = await fetch(fnUrl, {
                method: 'POST',
                headers: await getEdgeFunctionHeaders(),
                body: JSON.stringify({ email: email })
            });
            const fnText = await fnRes.text();
            let fnData = null;
            try { fnData = JSON.parse(fnText); } catch (e) { fnData = { error: fnText }; }
            if (!fnRes.ok || (fnData && fnData.error)) {
                console.warn('Auth cleanup warning:', fnData?.error || fnRes.status);
                // Non-blocking — tables are already cleaned
            }
        } catch (fnErr) {
            console.warn('delete-salesman-user call failed (tables already cleaned):', fnErr);
        }

        hideSalesmanModal();
        if (typeof renderSalesmen === 'function') await renderSalesmen();
        if (typeof updateDashboardSalesmen === 'function') updateDashboardSalesmen();
        alert(displayName + ' has been permanently deleted.\nCustomers under them are now unassigned and prices are locked.');
    } catch (err) {
        console.error('deleteSalesman error:', err);
        alert('Could not delete salesman.\n' + (err.message || ''));
    }
}

async function resetSalesmanPassword() {
    const modal = document.getElementById('salesman-modal');
    const salesmanId = modal?.dataset?.salesmanId;
    if (!salesmanId) {
        alert('Could not find salesman id.');
        return;
    }

    const salesman = (salesmen || []).find(s => String(s.id) === String(salesmanId));
    if (!salesman) {
        alert('Salesman not found.');
        return;
    }

    const displayName = salesman.name
        || [salesman.firstName, salesman.lastName].filter(Boolean).join(' ')
        || 'this salesman';
    const email = (salesman.email || '').toLowerCase().trim();
    const fullName = salesman.name
        || [salesman.firstName, salesman.lastName].filter(Boolean).join(' ')
        || email;
    const territory = salesman.territory || '';

    if (!email || !email.includes('@')) {
        alert('This salesman has no email on file. Cannot reset the password.');
        return;
    }
    if (email === 'jackerman@donegalnatural.com') {
        alert('This login is also the admin account. Reset it from Forgot password on the login page instead.');
        return;
    }

    if (!confirm(
        'Reset login password for ' + displayName + ' (' + email + ')?\n\n' +
        'This emails a new temporary password from noreply@ and forces a password change on next login.\n' +
        'Their current password will stop working immediately.'
    )) {
        return;
    }

    const btn = document.getElementById('modal-reset-password-btn');
    if (btn && btn.dataset.busy === '1') return;
    if (btn) {
        btn.dataset.busy = '1';
        btn.disabled = true;
    }

    try {
        const fnUrl = SUPABASE_URL + '/functions/v1/create-salesman-user';
        const fnRes = await fetch(fnUrl, {
            method: 'POST',
            headers: await getEdgeFunctionHeaders(),
            body: JSON.stringify({
                email: email,
                full_name: fullName,
                territory: territory
            })
        });

        const fnText = await fnRes.text();
        let fnData = null;
        try {
            fnData = JSON.parse(fnText);
        } catch (e) {
            fnData = { error: fnText || 'Empty response' };
        }

        if (!fnRes.ok || (fnData && fnData.error)) {
            throw new Error(
                (fnData && fnData.error) ? fnData.error : ('Function HTTP ' + fnRes.status)
            );
        }

        const emailOk = fnData && fnData.email_sent === true;
        const emailFailReason = (fnData && fnData.email_error) ? String(fnData.email_error) : '';
        const returnedTemp = (fnData && fnData.temp_password) ? String(fnData.temp_password) : '';

        alert(
            'Password reset for ' + displayName + '.\n' +
            'Login: ' + email + '\n\n' +
            (emailOk
                ? 'Credentials email was sent from noreply@.\nThey must change the password on first login.'
                : ('Credentials email was NOT sent.\n' +
                   (emailFailReason ? ('Reason: ' + emailFailReason + '\n') : '') +
                   (returnedTemp
                       ? ('Temporary password (give to salesman):\n' + returnedTemp)
                       : 'Please check the Edge Function logs.')))
        );
    } catch (err) {
        console.error('resetSalesmanPassword error:', err);
        alert('Could not reset salesman password.\n\n' + (err.message || String(err)));
    } finally {
        if (btn) {
            btn.dataset.busy = '0';
            btn.disabled = false;
        }
    }
}

function renderSalesmanOrdersList(salesman) {
    const container = document.getElementById('salesman-orders-list');
    if (!container) return;

    const fullName = (
        salesman.name ||
        [salesman.firstName, salesman.lastName].filter(Boolean).join(' ') ||
        ''
    ).trim().toLowerCase();
    const email = (salesman.email || '').trim().toLowerCase();

    const matched = (allOrders || []).filter(order => {
        const orderName = (
            order.salesman ||
            order.salesman_name ||
            order.salesmanName ||
            ''
        ).trim().toLowerCase();
        const orderEmail = (
            order.salesmanEmail ||
            order.salesman_email ||
            ''
        ).trim().toLowerCase();
        return (fullName && orderName === fullName) || (email && orderEmail === email);
    }).sort((a, b) => {
        const da = new Date(a.submittedAt || a.submitted_at || a.date || 0);
        const db = new Date(b.submittedAt || b.submitted_at || b.date || 0);
        return db - da;
    });

    if (matched.length === 0) {
        container.innerHTML = '<p class="text-sm text-[#6B4423]">No orders for this salesman yet.</p>';
        return;
    }

    // Group by calendar year → month (January starts each year)
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const byYear = {};

    matched.forEach(order => {
        const d = new Date(order.submittedAt || order.submitted_at || order.date || 0);
        if (isNaN(d.getTime())) return;
        const y = d.getFullYear();
        const m = d.getMonth(); // 0 = January
        if (!byYear[y]) byYear[y] = {};
        if (!byYear[y][m]) byYear[y][m] = [];
        byYear[y][m].push(order);
    });

    const years = Object.keys(byYear).map(Number).sort((a, b) => b - a); // newest year first

    let html = '';
    years.forEach(year => {
        const months = Object.keys(byYear[year]).map(Number).sort((a, b) => b - a); // newest month first
        let yearOrderCount = 0;
        let yearTotal = 0;

        months.forEach(m => {
            (byYear[year][m] || []).forEach(order => {
                yearOrderCount += 1;
                (order.items || []).forEach(item => {
                    const qty = parseInt(item.quantity, 10) || 0;
                    const unit = typeof getOrderItemUnitPrice === 'function'
                        ? getOrderItemUnitPrice(item)
                        : (parseFloat(item.unitPrice) || 0);
                    yearTotal += qty * unit;
                });
            });
        });

        html += `
            <div class="mb-5">
                <div class="flex items-center justify-between mb-2 pb-1 border-b-2 border-[#1E4D2B]">
                    <h4 class="text-base font-bold brand-green">${year}</h4>
                    <span class="text-xs text-[#6B4423]">${yearOrderCount} order${yearOrderCount !== 1 ? 's' : ''} · $${yearTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
        `;

        months.forEach(m => {
            const ordersInMonth = byYear[year][m] || [];
            let monthTotal = 0;
            ordersInMonth.forEach(order => {
                (order.items || []).forEach(item => {
                    const qty = parseInt(item.quantity, 10) || 0;
                    const unit = typeof getOrderItemUnitPrice === 'function'
                        ? getOrderItemUnitPrice(item)
                        : (parseFloat(item.unitPrice) || 0);
                    monthTotal += qty * unit;
                });
            });

            html += `
                <div class="mb-3">
                    <div class="flex items-center justify-between mb-1.5">
                        <p class="text-sm font-semibold text-[#6B4423]">${monthNames[m]}</p>
                        <span class="text-xs text-[#6B4423]">${ordersInMonth.length} · $${monthTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div class="space-y-2">
            `;

            ordersInMonth.forEach(order => {
                const id = order.id || order.order_id || '';
                const shortId = String(id).length > 8 ? String(id).slice(0, 8) : id;
                const customer = order.customer || order.customer_name || '—';
                const status = order.status || '—';
                const date = new Date(order.submittedAt || order.submitted_at || order.date || 0);
                const dateText = isNaN(date.getTime()) ? '—' : date.toLocaleDateString();

                let total = 0;
                (order.items || []).forEach(item => {
                    const qty = parseInt(item.quantity, 10) || 0;
                    const unit = typeof getOrderItemUnitPrice === 'function'
                        ? getOrderItemUnitPrice(item)
                        : (parseFloat(item.unitPrice) || 0);
                    total += qty * unit;
                });

                const safeId = String(id).replace(/'/g, "\\'");

                html += `
                    <button type="button"
                            onclick="openSalesmanOrderInvoice('${safeId}')"
                            class="w-full text-left bg-[#f8f4eb] border border-[#d4b78f] rounded-xl px-4 py-3 hover:bg-[#f0e6d9] transition">
                        <div class="flex justify-between gap-2">
                            <span class="font-semibold brand-green">#${shortId}</span>
                            <span class="text-sm text-[#6B4423]">${dateText}</span>
                        </div>
                        <div class="flex justify-between gap-2 mt-1 text-sm">
                            <span class="truncate">${customer}</span>
                            <span class="font-semibold whitespace-nowrap">$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <p class="text-xs text-[#6B4423] mt-1">${status}</p>
                    </button>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        html += `</div>`;
    });

    container.innerHTML = html;
}

function hideOrderInvoiceModal() {
    const modal = document.getElementById('order-invoice-modal');
    if (!modal) return;
    modal.classList.add('hidden');
}

function printOrderInvoice() {
    const modal = document.getElementById('order-invoice-modal');
    if (!modal || modal.classList.contains('hidden')) {
        alert('Open an invoice first.');
        return;
    }
    window.print();
}

function invoiceDownloadFilename() {
    const raw = (document.getElementById('inv-number') && document.getElementById('inv-number').textContent) || 'invoice';
    const safe = String(raw).trim().replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    return (safe || 'invoice') + '.pdf';
}

async function downloadOrderInvoice() {
    const modal = document.getElementById('order-invoice-modal');
    const sheet = document.getElementById('order-invoice-sheet');
    if (!modal || modal.classList.contains('hidden') || !sheet) {
        alert('Open an invoice first.');
        return;
    }
    const jsPdfCtor = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : window.jsPDF;
    if (typeof html2canvas !== 'function' || !jsPdfCtor) {
        alert('PDF library not loaded. Hard-refresh and try again.');
        return;
    }
    const btn = document.getElementById('inv-download-btn');
    if (btn && btn.getAttribute('data-busy') === '1') return;
    const prevLabel = btn ? btn.textContent : 'Download';
    if (btn) {
        btn.setAttribute('data-busy', '1');
        btn.disabled = true;
        btn.textContent = 'Downloading…';
    }

    const hidden = [];
    sheet.querySelectorAll('.invoice-no-print').forEach(function (el) {
        hidden.push({ el: el, display: el.style.display });
        el.style.display = 'none';
    });
    const prevMax = sheet.style.maxHeight;
    const prevOverflow = sheet.style.overflow;
    sheet.style.maxHeight = 'none';
    sheet.style.overflow = 'visible';

    try {
        const canvas = await html2canvas(sheet, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const doc = new jsPdfCtor({ unit: 'pt', format: 'letter', compress: true });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 28;
        const imgWidth = pageWidth - (margin * 2);
        const imgHeight = canvas.height * (imgWidth / canvas.width);
        const pageDrawHeight = pageHeight - (margin * 2);
        let heightLeft = imgHeight;
        let position = margin;
        doc.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
        heightLeft -= pageDrawHeight;
        while (heightLeft > 0) {
            position = heightLeft - imgHeight + margin;
            doc.addPage();
            doc.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
            heightLeft -= pageDrawHeight;
        }
        doc.save(invoiceDownloadFilename());
    } catch (err) {
        console.error('downloadOrderInvoice', err);
        alert('Could not download the invoice. Try Print and choose Save as PDF.');
    } finally {
        hidden.forEach(function (item) { item.el.style.display = item.display; });
        sheet.style.maxHeight = prevMax;
        sheet.style.overflow = prevOverflow;
        if (btn) {
            btn.removeAttribute('data-busy');
            btn.disabled = false;
            btn.textContent = prevLabel || 'Download';
        }
    }
}

function openOrderInvoiceModal(orderId) {
    const order = (allOrders || []).find(o => String(o.id) === String(orderId));
    if (!order) {
        alert('Order not found.');
        return;
    }

        // Prefer live customer record for addresses (email first, then name)
    const customerName = (order.customer || order.customer_name || '').trim().toLowerCase();
    const customerEmail = (order.customerEmail || order.customer_email || '').trim().toLowerCase();
    const customerId = order.customerId || order.customer_id || '';
    const customer = (allCustomers || []).find(c => customerId && String(c.id) === String(customerId))
        || (allCustomers || []).find(c => {
            const cEmail = (c.email || '').trim().toLowerCase();
            const cName = (c.name || '').trim().toLowerCase();
            if (customerEmail && cEmail && customerEmail === cEmail) return true;
            if (customerName && cName && cName === customerName) return true;
            return false;
        }) || null;

    // Invoice number + date
    const invNum = document.getElementById('inv-number');
    if (invNum) invNum.textContent = String(displayInvoiceNumber(order));
    if (typeof markInvoiceUpdatedState === 'function') markInvoiceUpdatedState(order);

    const invDate = document.getElementById('inv-date');
    if (invDate) {
        const d = new Date(order.submittedAt || order.submitted_at || order.date || 0);
        invDate.textContent = isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
    }

    // UPS tracking (framework — link opens UPS.com)
    const trackNum = (order.trackingNumber || order.tracking_number || '').trim();
    const invStatusEl = document.getElementById('inv-status');
    let trackBadge = document.getElementById('inv-tracking-badge');
    if (!trackBadge && invStatusEl && invStatusEl.parentElement) {
        trackBadge = document.createElement('div');
        trackBadge.id = 'inv-tracking-badge';
        trackBadge.className = 'mt-2 text-sm';
        invStatusEl.parentElement.appendChild(trackBadge);
    }
    if (trackBadge) {
        if (trackNum) {
            const safeText = escapeHtml(trackNum);
            const safeCarrier = escapeHtml(order.carrier || 'UPS');
            trackBadge.innerHTML = `
                <span class="text-[#6B4423]">${safeCarrier} Tracking:</span>
                <a href="https://www.ups.com/track?tracknum=${encodeURIComponent(trackNum)}"
                   target="_blank" rel="noopener"
                   class="ml-1 font-mono font-semibold text-[#1E4D2B] underline hover:text-[#254a2f]">
                    ${safeText}
                </a>`;
        } else {
            trackBadge.innerHTML = '';
        }
    }

    // BILL TO
    const billEl = document.getElementById('inv-bill-to');
    if (billEl) {
        const lines = [];
        const billName = String(order.customer || order.customer_name || '').trim();
        const billCo = String(order.customerCompany || order.customer_company || (customer && customer.company) || '').trim();
        if (billName) lines.push(billName);
        if (billCo && billCo.toLowerCase() !== billName.toLowerCase()) lines.push(billCo);
        const billPhone = (customer && customer.phone) || order.customerPhone || order.customer_phone || '';
        if (billPhone) {
            lines.push(typeof formatPhoneDisplay === 'function' ? formatPhoneDisplay(billPhone) : billPhone);
        } else if (order.customerEmail || order.customer_email) {
            lines.push(order.customerEmail || order.customer_email);
        }
        const billing = (customer && (customer.billingAddress || customer.billing_address))
            || (customer && (customer.shippingAddress || customer.shipping_address))
            || '';
        if (billing) lines.push(billing);
        billEl.innerHTML = lines.length
            ? lines.map(l => `<p>${escapeHtml(l)}</p>`).join('')
            : '—';
    }

    // SHIP TO
    const shipEl = document.getElementById('inv-ship-to');
    if (shipEl) {
        const lines = [];
        const shipName = String(order.customer || order.customer_name || '').trim();
        const shipCo = String(order.customerCompany || order.customer_company || (customer && customer.company) || '').trim();
        if (shipName) lines.push(shipName);
        if (shipCo && shipCo.toLowerCase() !== shipName.toLowerCase()) lines.push(shipCo);
        const shipping = (customer && (customer.shippingAddress || customer.shipping_address))
            || (customer && (customer.billingAddress || customer.billing_address))
            || '';
        if (shipping) lines.push(shipping);
        shipEl.innerHTML = lines.length
            ? lines.map(l => `<p>${escapeHtml(l)}</p>`).join('')
            : '—';
    }

    // Line items (original order + any fulfilled back-order items)
    const tbody = document.getElementById('inv-items-body');
    let subtotal = 0;

    if (tbody) {
        // Ensure back orders are loaded
        if ((!allBackOrders || allBackOrders.length === 0) && typeof loadBackOrders === 'function') {
            // fire-and-forget; we still render with whatever is already in memory
            loadBackOrders();
        }

        const items = order.items || [];
        let rowsHtml = '';

        if (items.length) {
            rowsHtml += items.map(item => {
                const qty = parseInt(item.quantity, 10) || 0;
                const unit = typeof getOrderItemUnitPrice === 'function'
                    ? getOrderItemUnitPrice(item)
                    : (parseFloat(item.unitPrice) || 0);
                const hasPrice = unit > 0;
                const lineTotal = qty * unit;
                if (hasPrice) subtotal += lineTotal;

                const desc = escapeHtml([
                    orderLineDisplayName(item),
                    item.caseSize ? `· ${item.caseSize}` : ''
                ].filter(Boolean).join(' '));

                const unitText = hasPrice
                    ? ('$' + unit.toFixed(2))
                    : (item.isMarketPrice ? 'Market' : '—');
                const marketNote = item.isMarketPrice
                    ? '<div class="text-[11px] text-[#c56134] mt-1">Market price. Final invoice may be adjusted to current market cost at shipment.</div>'
                    : '';
                const totalText = hasPrice
                    ? ('$' + lineTotal.toFixed(2))
                    : '—';

                return `
                    <tr class="border-t border-[#d4b78f]">
                        <td class="p-3 text-left font-semibold">${qty}</td>
                        <td class="p-3 text-left">${desc}${marketNote}</td>
                        <td class="p-3 text-right">${unitText}</td>
                        <td class="p-3 text-right font-semibold">${totalText}</td>
                    </tr>`;
            }).join('');
        }

        // Append fulfilled back-order items for this original order
        const fulfilledBOs = (allBackOrders || []).filter(b =>
            (b.status || '').toLowerCase() === 'fulfilled' &&
            (String(b.original_order_id) === String(order.id) ||
             String(b.invoice_number) === String(order.id))
        );

        if (fulfilledBOs.length > 0) {
            rowsHtml += `
                <tr class="bg-[#f0f7f0]">
                    <td colspan="4" class="p-2 text-center text-xs font-semibold text-green-800 uppercase tracking-wide">
                        — Back Order Fulfillment —
                    </td>
                </tr>`;

            rowsHtml += fulfilledBOs.map(b => {
                const qty = parseInt(b.quantity, 10) || 0;
                const unit = b.unit_price != null ? Number(b.unit_price) : 0;
                const hasPrice = unit > 0;
                const lineTotal = qty * unit;
                if (hasPrice) subtotal += lineTotal;

                const desc = [
                    escapeHtml(b.product_name || '—'),
                    b.case_size ? `· ${escapeHtml(b.case_size)}` : '',
                    '<span class="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-green-100 text-green-800">BO Fulfilled</span>'
                ].filter(Boolean).join(' ');

                const unitText = hasPrice ? ('$' + unit.toFixed(2)) : escapeHtml(b.display_price || '—');
                const totalText = hasPrice ? ('$' + lineTotal.toFixed(2)) : '—';

                return `
                    <tr class="border-t border-[#c8e0c8] bg-[#f8fbf8]">
                        <td class="p-3 text-left font-semibold">${qty}</td>
                        <td class="p-3 text-left">${desc}</td>
                        <td class="p-3 text-right">${unitText}</td>
                        <td class="p-3 text-right font-semibold">${totalText}</td>
                    </tr>`;
            }).join('');
        }

        if (!rowsHtml) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="p-4 text-center text-[#6B4423]">No line items</td>
                </tr>`;
        } else {
            tbody.innerHTML = rowsHtml;
        }
    }

// Notes — hide system default text
    const notesEl = document.getElementById('inv-notes');
    if (notesEl) {
        const raw = (order.notes || '').trim();
        const isSystem =
            !raw ||
            /^(created via add order|submitted via salesman portal)$/i.test(raw);
        notesEl.textContent = isSystem ? '' : raw;
    }

// Totals (+ credit only if > 0 after ship)
    const shipping = Number(order.shippingCost != null ? order.shippingCost : 0) || 0;
    const credit = Number(order.credit != null ? order.credit : 0) || 0;
    const total = Math.max(0, subtotal + shipping - credit);

    const subEl = document.getElementById('inv-subtotal');
    const shipCostEl = document.getElementById('inv-shipping');
    const creditRow = document.getElementById('inv-credit-row');
    const creditEl = document.getElementById('inv-credit');
    const totEl = document.getElementById('inv-total');

    if (subEl) subEl.textContent = '$' + subtotal.toFixed(2);
    if (shipCostEl) shipCostEl.textContent = '$' + shipping.toFixed(2);

    if (creditRow && creditEl) {
        if (credit > 0) {
            creditRow.classList.remove('hidden');
            creditEl.textContent = '−$' + credit.toFixed(2);
        } else {
            creditRow.classList.add('hidden');
        }
    }

    if (totEl) totEl.textContent = '$' + total.toFixed(2);

    // Ensure customers are available for addresses on next open if missing
    if ((!allCustomers || allCustomers.length === 0) && typeof loadCustomers === 'function') {
        loadCustomers();
    }

    const editBtn = document.getElementById('inv-edit-order-btn');
    if (editBtn) {
        const st = String(order.status || 'submitted').toLowerCase();
        const canEdit = st === 'submitted' || st === 'pending' || st === '' || st === 'received' || st === 'processing';
        if (canEdit) {
            editBtn.classList.remove('hidden');
            editBtn.setAttribute('data-order-id', String(order.id));
        } else {
            editBtn.classList.add('hidden');
            editBtn.removeAttribute('data-order-id');
        }
    }

    const modal = document.getElementById('order-invoice-modal');
    if (modal) modal.classList.remove('hidden');
}

function openSalesmanOrderInvoice(orderId) {
    // Always open the read-only invoice — never the editable Ship modal
    if (typeof openOrderInvoiceModal === 'function') {
        openOrderInvoiceModal(orderId);
        return;
    }
    if (typeof showOrderDetails === 'function') {
        showOrderDetails(orderId);
        return;
    }
    alert('Order invoice view is not available yet for #' + orderId);
}

async function loadSalesmen() {
    try {
        const { data, error } = await supabaseClient
            .from('salesmen')
.select('id, first_name, last_name, email, territory, commission, market_commission, price_sheet_status, yearly_sales, monthly_sales, active, notes, mailing_address, assigned_products, last_login_at')
            .order('last_name', { ascending: true });

        if (error) throw error;

        salesmen = (data || []).map(s => ({
            id: s.id,
            firstName: s.first_name,
            lastName: s.last_name,
            name: [s.first_name, s.last_name].filter(Boolean).join(' '),
            email: s.email,
            territory: s.territory || '',
            commission: s.commission != null ? Number(s.commission) : 8,
            marketCommission: s.market_commission != null ? Number(s.market_commission) : 3,
            priceSheetStatus: s.price_sheet_status,
            yearlySales: Number(s.yearly_sales) || 0,
            monthlySales: Number(s.monthly_sales) || 0,
            active: s.active !== false,
            notes: s.notes || '',
            mailingAddress: s.mailing_address || '',
            assigned_products: Array.isArray(s.assigned_products) ? s.assigned_products : [],
            lastLoginAt: s.last_login_at || null,
        }));
    } catch (err) {
        console.error('loadSalesmen error:', err);
        salesmen = [];
    }
}


async function renderSalesmen() {
    const list = document.getElementById('salesmen-list');
    if (!list) return;

    if (typeof loadSalesmen === 'function') {
        await loadSalesmen();
    }

    list.innerHTML = '';

    if (!salesmen || salesmen.length === 0) {
        list.innerHTML = `
            <div class="col-span-full text-center py-16">
                <i class="fas fa-users text-6xl text-[#d4b78f] mb-4"></i>
                <p class="text-[#6B4423]">No salesmen added yet.</p>
            </div>
        `;
        return;
    }

    salesmen.forEach(s => {
        const isActive = s.active !== false;
        const totals = getSalesmanOrderTotals(s);
        const monthly = '$' + Math.round(totals.monthly).toLocaleString();
        const yearly = '$' + Math.round(totals.yearly).toLocaleString();

        const card = document.createElement('div');
        card.className = 'bg-white border-2 border-[#6B4423] rounded-2xl p-6 cursor-pointer hover:shadow-lg transition';
        card.onclick = () => showSalesmanDetail(s.id);

        card.innerHTML = `
            <div class="flex items-start justify-between gap-3 mb-4">
                <div class="flex items-center gap-4 min-w-0">
                    <div class="w-14 h-14 bg-[#1E4D2B] rounded-full flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-user text-[#d4b78f] text-2xl"></i>
                    </div>
                    <div class="min-w-0">
                        <h3 class="text-xl font-bold brand-green truncate">${escapeHtml(s.name || [s.firstName, s.lastName].filter(Boolean).join(' ') || 'Unnamed')}</h3>
                        <p class="text-sm text-[#6B4423]">Territory: <strong>${escapeHtml(s.territory || '—')}</strong></p>
                        ${(s.email || '').toLowerCase().trim() === 'jackerman@donegalnatural.com'
                            ? ''
                            : `<p class="text-xs text-[#6B4423] mt-1">Last login: ${
                                s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleString() : 'Never'
                            }</p>`}
                    </div>
                    </div>
                </div>
                <button type="button"
                        title="${isActive ? 'Click to disable' : 'Click to enable'}"
                        onclick="toggleSalesmanActive('${s.id}', event)"
                        class="px-3 py-1 text-xs font-semibold rounded-full flex-shrink-0 cursor-pointer transition
                               ${isActive
                                   ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                   : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}">
                    ${isActive ? 'Active' : 'Inactive'}
                </button>
            </div>
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <p class="text-[#6B4423] text-xs">Yearly Sales</p>
                    <p class="font-semibold brand-green">${yearly}</p>
                </div>
                <div class="text-right">
                    <p class="text-[#6B4423] text-xs">This Month</p>
                    <p class="font-semibold brand-green">${monthly}</p>
                </div>
                <div>
                    <p class="text-[#6B4423] text-xs">Commission</p>
                    <p class="font-semibold brand-green">${s.commission != null ? s.commission + '%' : '—'}</p>
                </div>
            </div>
        `;

        list.appendChild(card);
    });
}

window.saveSalesmen = saveSalesmen;
window.addTestSalesman = addTestSalesman;
window.getSalesmanOrderTotals = getSalesmanOrderTotals;
window.hideSalesmanOrdersModal = hideSalesmanOrdersModal;
window.openSalesmanOrdersModal = openSalesmanOrdersModal;
window.deleteSalesman = deleteSalesman;
window.resetSalesmanPassword = resetSalesmanPassword;
window.renderSalesmanOrdersList = renderSalesmanOrdersList;
window.hideOrderInvoiceModal = hideOrderInvoiceModal;
window.printOrderInvoice = printOrderInvoice;
window.invoiceDownloadFilename = invoiceDownloadFilename;
window.downloadOrderInvoice = downloadOrderInvoice;
window.openOrderInvoiceModal = openOrderInvoiceModal;
window.openSalesmanOrderInvoice = openSalesmanOrderInvoice;
window.loadSalesmen = loadSalesmen;
window.renderSalesmen = renderSalesmen;

function goToSalesmanView() {
    try {
        const original = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (original) {
            localStorage.setItem('originalAdminUser', JSON.stringify(original));
        }

        localStorage.setItem('currentUser', JSON.stringify({
            id: original?.id || null,
            username: 'jackerman@donegalnatural.com',
            fullName: 'Jonathan (Sales View)',
            name: 'Jonathan (Sales View)',
            role: 'salesman',
            email: 'jackerman@donegalnatural.com',
            mustChangePassword: false,
            loginTime: new Date().toISOString(),
            supabase: true,
            isViewAs: true
        }));
    } catch (e) {
        console.error('goToSalesmanView error:', e);
    }
    window.location.href = 'salesman-portal.html';
}

async function goToOperateAsSalesman(displayName, fallbackEmail) {
    try {
        const original = JSON.parse(localStorage.getItem('currentUser') || 'null');
        const adminEmail = String((original && (original.email || original.username)) || '').toLowerCase().trim();
        if (adminEmail !== 'jackerman@donegalnatural.com') {
            alert('Only Jonathan can operate as a salesman.');
            return;
        }
        if ((!salesmen || !salesmen.length) && typeof loadSalesmen === 'function') {
            await loadSalesmen();
        }
        const hintName = String(displayName || '').toLowerCase();
        const hintEmail = String(fallbackEmail || '').toLowerCase().trim();
        const seat = (salesmen || []).find(function (s) {
            const name = String(s.name || [s.firstName, s.lastName].filter(Boolean).join(' ') || '').toLowerCase();
            const email = String(s.email || '').toLowerCase().trim();
            return (hintName && name.indexOf(hintName) !== -1) || (hintEmail && email === hintEmail);
        });
        const seatEmail = String((seat && seat.email) || fallbackEmail || '').toLowerCase().trim();
        const seatLabel = (seat && (seat.name || [seat.firstName, seat.lastName].filter(Boolean).join(' '))) || displayName;
        if (!seatEmail) {
            alert('Could not find a salesman seat for ' + displayName + '. Add them in Salesmen first.');
            return;
        }
        if (original) {
            localStorage.setItem('originalAdminUser', JSON.stringify(original));
        }
        localStorage.setItem('viewAsSalesmanEmail', seatEmail);
        localStorage.setItem('viewAsSalesmanName', seatLabel);
        localStorage.setItem('currentUser', JSON.stringify({
            id: original && original.id ? original.id : null,
            username: seatEmail,
            fullName: 'Jonathan (Operating as ' + seatLabel + ')',
            name: 'Jonathan (Operating as ' + seatLabel + ')',
            role: 'salesman',
            email: seatEmail,
            viewAsSalesmanEmail: seatEmail,
            viewAsSalesmanName: seatLabel,
            mustChangePassword: false,
            loginTime: new Date().toISOString(),
            supabase: true,
            isViewAs: true
        }));
    } catch (e) {
        console.error('goToOperateAsSalesman error:', e);
        alert('Could not open that salesman view.');
        return;
    }
    window.location.href = 'salesman-portal.html';
}

function goToBrianSalesmanView() {
    goToOperateAsSalesman('Brian', 'donegaldogtreats@gmail.com');
}

function goToMarshallSalesmanView() {
    goToOperateAsSalesman('Marshall', 'marshallg@comcast.net');
}

function goToCustomerView() {
    try {
        const original = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (original) {
            localStorage.setItem('originalAdminUser', JSON.stringify(original));
        }

        localStorage.setItem('currentUser', JSON.stringify({
            id: original?.id || null,
            username: 'jackerman@donegalnatural.com',
            fullName: 'Jonathan (Customer View)',
            name: 'Jonathan (Customer View)',
            role: 'customer',
            email: 'jackerman@donegalnatural.com',
            company: 'Donegal Admin Test Store',
            mustChangePassword: false,
            loginTime: new Date().toISOString(),
            supabase: true,
            isViewAs: true
        }));
    } catch (e) {
        console.error('goToCustomerView error:', e);
    }
    window.location.href = 'wholesale-portal.html';
}

window.goToSalesmanView = goToSalesmanView;
window.goToOperateAsSalesman = goToOperateAsSalesman;
window.goToBrianSalesmanView = goToBrianSalesmanView;
window.goToMarshallSalesmanView = goToMarshallSalesmanView;
window.goToCustomerView = goToCustomerView;
