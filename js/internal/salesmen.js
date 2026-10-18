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
