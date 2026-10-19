// Salesman portal — place order, packaging, and out-of-stock labels.
let currentPlaceOrderCustomer = null;

let placeOrderItems = [];

function openWalkInPlaceOrder() {
    if (!canPlaceOpenOrder()) {
        alert('Open orders are placed from the Internal portal only.');
        return;
    }
    currentPlaceOrderCustomer = { id: null, walkIn: true, name: '' };
    placeOrderItems = [];
    const nameEl = document.getElementById('place-order-customer-name');
    if (nameEl) nameEl.textContent = 'Walk-in / open order';
    const shipEl = document.getElementById('place-order-shipping');
    const shipWrap = document.getElementById('place-order-shipping-wrap');
    if (shipWrap) shipWrap.classList.add('hidden');
    const walk = document.getElementById('place-order-walkin-fields');
    if (walk) walk.classList.remove('hidden');
    ['po-walkin-name','po-walkin-company','po-walkin-email','po-walkin-phone','po-walkin-street','po-walkin-city','po-walkin-state','po-walkin-zip','po-walkin-commission'].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const totalEl = document.getElementById('place-order-total');
    if (totalEl) totalEl.textContent = '$0.00';
    const list = document.getElementById('place-order-items-list');
    if (list) list.innerHTML = '';
    const modal = document.getElementById('place-order-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
}

function placeOrderDraftKey(customer) {
    const seat = (typeof getOperatingSalesmanEmail === 'function')
        ? String(getOperatingSalesmanEmail() || '').toLowerCase().trim()
        : '';
    const id = customer && customer.id ? String(customer.id) : '';
    if (!seat || !id) return '';
    return 'salesmanPlaceOrderDraft_' + seat + '_' + id;
}

function persistPlaceOrderDraft() {
    const customer = (currentPlaceOrderCustomer && typeof currentPlaceOrderCustomer === 'object')
        ? currentPlaceOrderCustomer
        : null;
    const key = placeOrderDraftKey(customer);
    if (!key) return;
    const notes = (document.getElementById('place-order-notes')?.value || '').trim();
    if (!placeOrderItems.length && !notes) {
        try { localStorage.removeItem(key); } catch (e) {}
        return;
    }
    const payload = {
        customerId: String(customer.id),
        notes: notes,
        items: (placeOrderItems || []).map(function (item) {
            return {
                name: item.name,
                displayName: item.displayName || '',
                quantity: item.quantity || 1,
                caseSize: item.caseSize || '',
                unitPrice: item.unitPrice,
                displayPrice: item.displayPrice || '',
                isMarketPrice: !!item.isMarketPrice
            };
        })
    };
    try { localStorage.setItem(key, JSON.stringify(payload)); } catch (e) {}
}

function loadPlaceOrderDraft(customer) {
    const key = placeOrderDraftKey(customer);
    if (!key) return null;
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || !Array.isArray(data.items)) return null;
        return data;
    } catch (e) {
        return null;
    }
}

function clearPlaceOrderDraft(customer) {
    const key = placeOrderDraftKey(customer);
    if (!key) return;
    try { localStorage.removeItem(key); } catch (e) {}
}

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
    const row = lookupTftppPackaging(item.name || item.product);
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

function togglePlaceOrderPackaging(index, field, on) {
    if (!placeOrderItems[index]) return;
    placeOrderItems[index][field] = !!on;
    if (typeof persistPlaceOrderDraft === 'function') persistPlaceOrderDraft();
}

async function placeOrderForCustomer(customerName) {
    const walk = document.getElementById('place-order-walkin-fields');
    if (walk) walk.classList.add('hidden');
    const shipWrap = document.getElementById('place-order-shipping-wrap');
    if (shipWrap) shipWrap.classList.remove('hidden');
    // Prefer full customer object when available so shipping/email work
    let customerObj = null;
    if (typeof customerName === 'object' && customerName) {
        customerObj = customerName;
        currentPlaceOrderCustomer = customerName;
    } else {
        const nameStr = String(customerName || '').trim();
        currentPlaceOrderCustomer = nameStr;
        const pool = []
            .concat(window._salesmanCustomers || [])
            .concat((typeof myCustomers !== 'undefined' && Array.isArray(myCustomers)) ? myCustomers : [])
            .concat((typeof allCustomers !== 'undefined' && Array.isArray(allCustomers)) ? allCustomers : []);
        customerObj = pool.find(c =>
            (c.name || '').trim().toLowerCase() === nameStr.toLowerCase()
        ) || null;
        if (customerObj) currentPlaceOrderCustomer = customerObj;
    }

    placeOrderItems = [];
    window._placeOrderBrianPrices = {};
    const draft = loadPlaceOrderDraft(customerObj || currentPlaceOrderCustomer);
    const priceCustomer = (typeof currentPlaceOrderCustomer === 'object' && currentPlaceOrderCustomer)
        ? currentPlaceOrderCustomer
        : customerObj;
    if (priceCustomer && typeof loadBrianPlaceOrderPrices === 'function') {
       await loadBrianPlaceOrderPrices(priceCustomer);
    }
    if (typeof searchPlaceOrderProducts === 'function') searchPlaceOrderProducts();

    const displayName = (typeof currentPlaceOrderCustomer === 'object' && currentPlaceOrderCustomer)
        ? (currentPlaceOrderCustomer.name || customerName || '')
        : String(customerName || '');

    const nameEl = document.getElementById("place-order-customer-name");
    if (nameEl) nameEl.textContent = displayName;

    const shipEl = document.getElementById("place-order-shipping");
    if (shipEl) {
        const c = (typeof currentPlaceOrderCustomer === 'object' && currentPlaceOrderCustomer)
            ? currentPlaceOrderCustomer
            : customerObj;
        shipEl.textContent = (
            c?.shipping_address ||
            c?.shippingAddress ||
            ''
        ).trim() || 'No shipping address on file';
    }

    const totalEl = document.getElementById("place-order-total");
    if (totalEl) totalEl.textContent = '$0.00';

    if (typeof searchPlaceOrderProducts === 'function') searchPlaceOrderProducts();

    const notesEl = document.getElementById("place-order-notes");
    if (notesEl) notesEl.value = (draft && draft.notes) ? draft.notes : "";
    if (draft && draft.items && draft.items.length) {
        placeOrderItems = draft.items.map(function (item) {
            return {
                name: item.name,
                displayName: item.displayName || item.name,
                quantity: item.quantity || 1,
                caseSize: item.caseSize || '',
                unitPrice: item.unitPrice,
                displayPrice: item.displayPrice || '',
                isMarketPrice: !!item.isMarketPrice
            };
        });
    }

    renderPlaceOrderItems();

    const modal = document.getElementById("place-order-modal");
    if (modal) modal.classList.remove("hidden");
}

window.addEventListener('pagehide', function () {
    if (typeof persistPlaceOrderDraft === 'function') persistPlaceOrderDraft();
});

function hidePlaceOrderModal(opts) {
    if (!(opts && opts.discard)) persistPlaceOrderDraft();
    const modal = document.getElementById("place-order-modal");
    if (modal) {
        modal.classList.add("hidden");
        modal.style.display = '';
    }
    currentPlaceOrderCustomer = null;
    placeOrderItems = [];
}

async function loadPlaceOrderPhotos() {
    if (window._placeOrderPhotosLoaded) return;
    window._placeOrderPhotos = [];
    try {
        const { data, error } = await supabaseClient
            .from('product_images')
            .select('family_key, linked_family_key, scope, variant_name, is_card_hero, sort_order, storage_path')
            .order('sort_order', { ascending: true });
        if (error) throw error;
        window._placeOrderPhotos = data || [];
        window._placeOrderPhotosLoaded = true;
    } catch (err) {
        console.warn('loadPlaceOrderPhotos:', err);
    }
}

function placeOrderPhotoUrl(name) {
    const product = String(name || '')
        .replace(/^\d+\s*pack,\s*/i, '')
        .replace(/^\d+(?:-\d+)?\s*["”]?\s*/i, '')
        .replace(/\bcollagen\b/ig, 'corium');
    const slug = product.toLowerCase()
        .replace(/[“”"]/g, '')
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48);
    const key = product.toLowerCase().replace(/[“”"]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
    const rows = window._placeOrderPhotos || [];
    const hit = rows.find(function (row) {
        return (row.family_key === slug || row.linked_family_key === slug) && row.is_card_hero;
    }) || rows.find(function (row) {
        return row.family_key === slug || row.linked_family_key === slug;
    }) || rows.find(function (row) {
        const variant = String(row.variant_name || '').toLowerCase().replace(/[“”"]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
        return variant && variant === key;
    });
    const path = hit && hit.storage_path;
    if (path && path !== 'COMING_SOON' && String(path).indexOf('COMING_SOON/') !== 0 && /\.(jpe?g|png|webp|gif)$/i.test(path)) {
        try {
            const pub = supabaseClient.storage.from('product-photos').getPublicUrl(path);
            if (pub && pub.data && pub.data.publicUrl) return pub.data.publicUrl;
        } catch (err) {}
    }
    const rules = [
        { match: /green line|monster/i, file: 'Green Line Bully Stick (Full picture).jpg' },
        { match: /bully cane/i, file: 'Bully Canes .jpg' },
        { match: /braided bully/i, file: 'Braided Bully (Full Picture).jpg' },
        { match: /euro bully/i, file: 'Euro Bully Stick 6 in. .jpg' },
        { match: /corium|collagen/i, file: 'Beef Wrapped Corium Sticks (Full Product).jpg' },
        { match: /lung flip|buffalo bite/i, file: 'Beef Lung Flips (Full Product).jpg' },
        { match: /lamb lung/i, file: 'Lamb Lung (Full Product).jpg' },
        { match: /elky training/i, file: 'Jerky Squares Full Product shot.jpg' },
        { match: /elky/i, file: 'Elky Sticks  (Full Shot).jpg' },
        { match: /jerky/i, file: 'Turkey Jerky (Full Shot).jpg' }
    ];
    const raw = product;
    const rule = rules.find(function (item) { return item.match.test(raw); });
    return rule ? ('media/' + rule.file) : '';
}

function searchPlaceOrderProducts() {
    const searchEl = document.getElementById("place-order-product-search");
    const resultsEl = document.getElementById("place-order-product-results");
    if (!searchEl || !resultsEl) return;

    if (!window._placeOrderPhotosLoaded) loadPlaceOrderPhotos().then(searchPlaceOrderProducts);
    const term = (searchEl.value || "").toLowerCase().trim();
    const sheetMap = window._placeOrderBrianPrices || {};
    const sheetNames = Object.keys(sheetMap);
    if (!sheetNames.length) {
        const emptyMsg = currentPlaceOrderCustomer
            ? 'No products on this pricing sheet.'
            : 'Choose a customer first to see that salesman\'s items.';
        resultsEl.innerHTML = '<p class="p-3 text-sm text-[#6B4423]">' + emptyMsg + '</p>';
        resultsEl.classList.remove("hidden");
        return;
    }

    const hideCase = typeof isBrianAssignedCustomer === 'function'
        && isBrianAssignedCustomer(currentPlaceOrderCustomer);

    const brianCustomer = isBrianSeatCustomer(currentPlaceOrderCustomer);
    const rows = [];
    sheetNames.forEach(function (name) {
        // Brian place-order search is the loaded sheet only — never the full catalog.
        if (brianCustomer && !isBrianPlaceOrderProductAllowed(name)) return;
        const nick = (typeof salesmanDisplayName === 'function')
            ? salesmanDisplayName(name) : name;
        const hay = (name + ' ' + nick).toLowerCase();
        if (term && hay.indexOf(term) === -1) return;
        const catalog = (typeof PRODUCT_CATALOG !== 'undefined')
            ? PRODUCT_CATALOG.find(function (p) { return p && p.name === name; })
            : null;
        const packCats = (typeof brianPackCategories === 'function')
            ? (brianPackCategories(nick) || brianPackCategories(name))
            : null;
        let category = (packCats && packCats[0]) || (catalog && catalog.category) || '';
        const n = String(nick || name || '').toLowerCase();
        if (!category) {
            if (n.indexOf('bully') !== -1 || n.indexOf('thin green') !== -1) category = 'Bully Sticks';
            else if (n.indexOf('jerky') !== -1 || n.indexOf('elky') !== -1) category = 'Jerky';
            else if (n.indexOf('ear') !== -1) category = 'Ears';
            else if (n.indexOf('lung') !== -1 || n.indexOf('trachea') !== -1) category = 'Beef';
            else category = 'Other';
        }
        rows.push({
            name: name,
            nick: nick,
            category: category,
            caseSize: (catalog && catalog.caseSize) || '',
            unitPrice: Number(sheetMap[name])
        });
    });
    rows.sort(function (a, b) {
        const ca = String(a.category || 'Other').localeCompare(String(b.category || 'Other'));
        if (ca) return ca;
        return String(a.nick || a.name).localeCompare(String(b.nick || b.name));
    });

    if (!rows.length) {
        resultsEl.innerHTML = '<p class="p-3 text-sm text-[#6B4423]">No products found.</p>';
        resultsEl.classList.remove("hidden");
        return;
    }

    let lastCat = '';
    resultsEl.innerHTML = rows.map(function (p, idx) {
        const oos = typeof isSalesmanOos === 'function' && isSalesmanOos(p.name);
        const oosText = oos ? (salesmanOosLabel(p.name) || 'Out of stock') : '';
        const price = isFinite(p.unitPrice) ? ('$' + p.unitPrice.toFixed(2) + ' each') : '';
        const safeName = encodeURIComponent(p.name);
        const cat = p.category || 'Other';
        const header = (cat !== lastCat)
            ? '<div class="px-3 py-2 bg-[#1E4D2B] text-[#d4b78f] text-sm font-bold sticky top-0">' + escapeHtml(cat) + '</div>'
            : '';
        lastCat = cat;
        return header + (
            '<div class="px-3 py-2 border-b border-[#d4b78f] flex items-center gap-3">' +
            (placeOrderPhotoUrl(p.nick || p.name)
                ? '<img src="' + placeOrderPhotoUrl(p.nick || p.name) + '" alt="" loading="lazy" decoding="async" style="width:56px;height:56px;object-fit:contain;border-radius:8px;background:#f8f4eb;flex:0 0 auto;">'
                : '<div style="width:56px;height:56px;border-radius:8px;background:#e7e2d8;flex:0 0 auto;"></div>') +
            '<div class="flex-1 min-w-0">' +
            '<p class="text-sm font-semibold brand-green">' + escapeHtml(p.nick) + '</p>' +
            (hideCase || !p.caseSize ? '' : ('<p class="text-xs text-[#6B4423]">' + escapeHtml(p.caseSize) + '</p>')) +
            (oos ? ('<p class="text-xs font-semibold text-red-700">' + escapeHtml(oosText) + '</p>') : '') +
            '</div>' +
            '<p class="text-sm font-semibold brand-green whitespace-nowrap">' + escapeHtml(price) + '</p>' +
            '<input type="number" min="1" value="1" class="w-16 border-2 border-[#6B4423] rounded-lg px-2 py-1 text-sm" id="po-grid-qty-' + idx + '">' +
            '<button type="button" class="px-3 py-1 text-xs font-semibold rounded-lg bg-[#1E4D2B] text-[#d4b78f]" ' +
            'onclick="addProductToPlaceOrderQty(decodeURIComponent(\'' + safeName + '\'), (document.getElementById(\'po-grid-qty-' + idx + '\')||{}).value)">' +
            (oos ? 'Add OOS' : 'Add') + '</button>' +
            '</div>'
        );
    }).join('');
    resultsEl.classList.remove("hidden");
}

function addProductToPlaceOrderQty(name, rawQty) {
    const qty = Math.max(1, parseInt(rawQty, 10) || 1);
    if (typeof addProductToPlaceOrder !== 'function') return;
    addProductToPlaceOrder(name);
    const last = placeOrderItems && placeOrderItems.find(function (i) { return i.name === name; });
    if (last && qty > 1) {
        last.quantity = (last.quantity || 1) + (qty - 1);
        if (typeof renderPlaceOrderItems === 'function') renderPlaceOrderItems();
    }
}

var salesmanOosMap = {};

function isSalesmanOos(name) {
    var row = salesmanOosMap[name];
    return !!(row && row.is_out_of_stock);
}

function formatOosDisplayDate(value) {
    var raw = String(value || '').slice(0, 10);
    var parts = raw.split('-');
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return raw;
    return parts[1] + '/' + parts[2] + '/' + String(parts[0]).slice(-2);
}

function salesmanOosLabel(name) {
    var row = salesmanOosMap[name];
    if (!row || !row.is_out_of_stock) return '';
    var eta = row.estimated_back_at ? String(row.estimated_back_at).slice(0, 10) : '';
    return eta ? ('Out of Stock: Expected in stock date ' + formatOosDisplayDate(eta)) : 'Out of Stock';
}

async function loadSalesmanOutOfStock() {
    salesmanOosMap = {};
    try {
        var { data, error } = await supabaseClient
            .from('product_stock_status')
            .select('product_name, is_out_of_stock, estimated_back_at')
            .eq('is_out_of_stock', true);
        if (error) throw error;
        (data || []).forEach(function (row) {
            salesmanOosMap[row.product_name] = row;
        });
    } catch (err) {
        console.warn('loadSalesmanOutOfStock:', err);
    }
}

const BRIAN_SEAT_EMAIL = 'donegaldogtreats@gmail.com';

function getOperatingSalesmanEmail() {
    try {
        const user = JSON.parse(localStorage.getItem('currentUser') || 'null') || {};
        const viewAs = String(user.viewAsSalesmanEmail || localStorage.getItem('viewAsSalesmanEmail') || '').toLowerCase().trim();
        if (viewAs) return viewAs;
        return String(user.email || '').toLowerCase().trim();
    } catch (e) {
        return '';
    }
}

function getOperatingSalesmanName() {
    try {
        const user = JSON.parse(localStorage.getItem('currentUser') || 'null') || {};
        const viewAs = String(user.viewAsSalesmanEmail || localStorage.getItem('viewAsSalesmanEmail') || '').toLowerCase().trim();
        const viewAsName = String(user.viewAsSalesmanName || localStorage.getItem('viewAsSalesmanName') || '').trim();
        if (viewAs && viewAsName) return viewAsName;
        if (viewAs === BRIAN_SEAT_EMAIL) return 'Brian Frohne';
        if (viewAs) return viewAsName || viewAs;
        return user.fullName || user.name || 'Salesman';
    } catch (e) {
        return 'Salesman';
    }
}

function isBrianAssignedCustomer(customer) {
    const email = String((customer && (customer.salesman_email || customer.salesmanEmail)) || '').toLowerCase().trim();
    const seat = getOperatingSalesmanEmail() || BRIAN_SEAT_EMAIL;
    return !!email && email === seat;
}

function isBrianSeatCustomer(customer) {
    const email = String((customer && (customer.salesman_email || customer.salesmanEmail)) || '').toLowerCase().trim();
    return email === BRIAN_SEAT_EMAIL;
}

function normalizeSheetProductName(name) {
    if (typeof normalizeProductName === 'function') return normalizeProductName(name);
    return String(name || '')
        .toLowerCase()
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/,/g, '')
        .replace(/\bcrunch\b/g, 'crunchy')
        .replace(/\bbunny\b/g, 'rabbit')
        .replace(/\b10-pack of /g, '10-pack ')
        .replace(/\s+/g, ' ')
        .trim();
}

function rememberBrianPlaceOrderAllowList(prices) {
    const keys = Object.keys(prices || {});
    window._brianPlaceOrderAllowedNames = new Set(keys.map(normalizeSheetProductName));
}

function clearBrianPlaceOrderAllowList() {
    window._brianPlaceOrderAllowedNames = null;
}

function isBrianPlaceOrderProductAllowed(name) {
    if (!isBrianSeatCustomer(currentPlaceOrderCustomer)) return true;
    const allowed = window._brianPlaceOrderAllowedNames;
    if (!allowed) return false;
    return allowed.has(normalizeSheetProductName(name));
}

function sheetNameForPlaceOrder(productName) {
    const sheetMap = window._placeOrderBrianPrices || {};
    if (!productName) return '';
    if (Object.prototype.hasOwnProperty.call(sheetMap, productName)) return productName;
    const want = normalizeSheetProductName(productName);
    return Object.keys(sheetMap).find(function (key) {
        return normalizeSheetProductName(key) === want;
    }) || '';
}

function salesmanDisplayName(catalogName) {
    const map = window._placeOrderDisplayNames || {};
    if (!catalogName) return '';
    let nick = String((map && map[catalogName]) || '').replace(/\s+/g, ' ').trim();
    if (!nick && map && typeof normalizeProductName === 'function') {
        const want = normalizeProductName(catalogName);
        Object.keys(map).some(function (key) {
            if (normalizeProductName(key) !== want) return false;
            nick = String(map[key] || '').replace(/\s+/g, ' ').trim();
            return !!nick;
        });
    }
    return nick || catalogName || '';
}

function orderLineDisplayName(item) {
    const nick = String((item && item.displayName) || '').replace(/\s+/g, ' ').trim();
    if (nick) return nick;
    const catalog = (item && (item.product || item.name)) || '';
    return salesmanDisplayName(catalog) || catalog || 'Item';
}

function resolvePlaceOrderPrice(product) {
    const name = product && product.name;
    const map = window._placeOrderBrianPrices;
    if (name && map && typeof map === 'object') {
        const raw = map[name];
        if (raw != null && raw !== '') {
            const n = Number(raw);
            if (!isNaN(n)) {
                return {
                    unitPrice: n,
                    isMarketPrice: !!(product && product.isMarketPrice),
                    displayPrice: '$' + n.toFixed(2)
                };
            }
        }
    }
    if (product && product.isMarketPrice) {
        return { unitPrice: null, isMarketPrice: true, displayPrice: 'Market Price' };
    }
    return {
        unitPrice: Number(product && product.unitPrice),
        isMarketPrice: false,
        displayPrice: '$' + Number(product && product.unitPrice).toFixed(2)
    };
}

async function loadBrianPlaceOrderPrices(customer) {
    window._placeOrderBrianPrices = {};
    window._placeOrderDisplayNames = {};
    window._placeOrderHiddenPrices = {};
    clearBrianPlaceOrderAllowList();
    if (!customer || !customer.id) return;
    const salesmanEmail = String((customer.salesman_email || customer.salesmanEmail || getOperatingSalesmanEmail()) || '').toLowerCase().trim();
    if (!salesmanEmail) return;

    const brianCustomer = isBrianSeatCustomer(customer);
    let salesmanPrices = {};
    let assigned = [];
    let sheetLoaded = false;
    try {
        const { data: nickRow, error: sheetError } = await supabaseClient
            .from('salesman_price_sheets')
            .select('prices, display_names, hidden_prices')
            .eq('salesman_email', salesmanEmail)
            .maybeSingle();
        if (sheetError) throw sheetError;
        sheetLoaded = true;
        if (nickRow && nickRow.display_names && typeof nickRow.display_names === 'object') {
            window._placeOrderDisplayNames = nickRow.display_names;
        }
        window._placeOrderHiddenPrices = (nickRow && nickRow.hidden_prices && typeof nickRow.hidden_prices === 'object')
            ? nickRow.hidden_prices
            : {};
        if (nickRow && nickRow.prices && typeof nickRow.prices === 'object') {
            salesmanPrices = nickRow.prices;
        }
    } catch (err) {
        console.warn('place order display_names:', err);
    }

    if (brianCustomer && !sheetLoaded) {
        window._placeOrderBrianPrices = {};
        clearBrianPlaceOrderAllowList();
        return;
    }

    try {
        const { data: salesmanRow } = await supabaseClient
            .from('salesmen')
            .select('assigned_products')
            .eq('email', salesmanEmail)
            .maybeSingle();
        if (Array.isArray(salesmanRow && salesmanRow.assigned_products)) {
            assigned = salesmanRow.assigned_products;
        } else if (salesmanRow && typeof salesmanRow.assigned_products === 'string') {
            try { assigned = JSON.parse(salesmanRow.assigned_products); } catch (e) { assigned = []; }
        }
    } catch (err) {
        console.warn('place order assigned_products:', err);
    }

    const prices = Object.assign({}, salesmanPrices);
    try {
        const { data: custSheet } = await supabaseClient
            .from('customer_price_sheets')
            .select('prices')
            .eq('customer_id', customer.id)
            .maybeSingle();
        if (custSheet && custSheet.prices && typeof custSheet.prices === 'object') {
            Object.keys(prices).forEach(function (name) {
                if (custSheet.prices[name] != null && custSheet.prices[name] !== '') {
                    prices[name] = custSheet.prices[name];
                }
            });
            // Brian's customers cannot gain products that are not already sheet keys.
            if (!brianCustomer) {
                assigned.forEach(function (name) {
                    if (!name || Object.prototype.hasOwnProperty.call(prices, name)) return;
                    if (custSheet.prices[name] == null || custSheet.prices[name] === '') return;
                    prices[name] = custSheet.prices[name];
                });
            }
        }
    } catch (err) {
        console.warn('loadBrianPlaceOrderPrices customer:', err);
    }

    if (brianCustomer) {
        const hidden = window._placeOrderHiddenPrices || {};
        Object.keys(prices).forEach(function (name) {
            const want = normalizeSheetProductName(name);
            const hit = Object.keys(hidden).some(function (key) {
                return normalizeSheetProductName(key) === want;
            });
            if (hit) delete prices[name];
        });
    } else {
        Object.keys(window._placeOrderHiddenPrices || {}).forEach(function (name) {
            delete prices[name];
        });
    }
    window._placeOrderBrianPrices = prices;
    if (brianCustomer) rememberBrianPlaceOrderAllowList(prices);
}

function addProductToPlaceOrder(productName) {
    if (isBrianSeatCustomer(currentPlaceOrderCustomer)) {
        if (!isBrianPlaceOrderProductAllowed(productName)) {
            alert('This item is not on your pricing sheet and cannot be ordered.');
            return;
        }
        productName = sheetNameForPlaceOrder(productName);
    }
    const sheetMap = window._placeOrderBrianPrices || {};
    if (!productName || !Object.prototype.hasOwnProperty.call(sheetMap, productName)) return;
    const catalogProduct = (typeof PRODUCT_CATALOG !== 'undefined')
        ? PRODUCT_CATALOG.find(function (p) { return p.name === productName; })
        : null;
    if (!catalogProduct && (sheetMap[productName] == null || sheetMap[productName] === '')) return;
    const product = catalogProduct || {
        name: productName,
        caseSize: '',
        unitPrice: Number(sheetMap[productName]),
        isMarketPrice: false
    };
    const existing = placeOrderItems.find(i => i.name === productName);
    if (existing) {
        existing.quantity += 1;
    } else {
        const priced = resolvePlaceOrderPrice(product);
        const line = {
            name: product.name,
            displayName: salesmanDisplayName(product.name),
            quantity: 1,
            caseSize: product.caseSize || "",
            unitPrice: priced.unitPrice,
            isMarketPrice: priced.isMarketPrice,
            displayPrice: priced.displayPrice
        };
        applyCustomerPackagingToItem(line, currentPlaceOrderCustomer);
        placeOrderItems.push(line);
    }

    renderPlaceOrderItems();
    if (typeof searchPlaceOrderProducts === 'function') searchPlaceOrderProducts();
}

function renderPlaceOrderItems(skipFocus) {
    const container = document.getElementById("place-order-items-list");
    if (!container) return;

    if (placeOrderItems.length === 0) {
        container.innerHTML = `<p class="text-sm text-[#6B4423]">No products added yet.</p>`;
        const totalElEmpty = document.getElementById("place-order-total");
        if (totalElEmpty) totalElEmpty.textContent = '$0.00';
        if (typeof persistPlaceOrderDraft === 'function') persistPlaceOrderDraft();
        return;
    }

    const canEditPrice = (typeof canPlaceOpenOrder === 'function' && canPlaceOpenOrder())
        || !!(currentPlaceOrderCustomer && currentPlaceOrderCustomer.walkIn);

    function placeOrderItemCategory(item) {
        const catalog = (typeof PRODUCT_CATALOG !== 'undefined')
            ? PRODUCT_CATALOG.find(function (p) { return p && p.name === item.name; })
            : null;
        const raw = catalog && catalog.category ? String(catalog.category) : '';
        const first = raw.split(',')[0].trim();
        if (first) return first;
        const n = String(item.name || '').toLowerCase();
        if (n.indexOf('bully') !== -1) return 'Bully Sticks';
        if (n.indexOf('jerky') !== -1 || n.indexOf('elky') !== -1) return 'Jerky';
        if (n.indexOf('ear') !== -1) return 'Ears';
        return 'Other';
    }
    const grouped = {};
    placeOrderItems.forEach(function (item, index) {
        const cat = placeOrderItemCategory(item);
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(index);
    });
    container.innerHTML = Object.keys(grouped).sort().map(function (cat) {
        const header = '<p class="text-xs font-bold text-[#d4b78f] bg-[#1E4D2B] rounded-lg px-2 py-1 mt-2 mb-1">' +
            escapeHtml(cat) + '</p>';
        const rows = grouped[cat].map(function (index) {
        const item = placeOrderItems[index];
        const priceVal = (item.unitPrice != null && item.unitPrice !== '')
            ? Number(item.unitPrice).toFixed(2)
            : '';
        const priceField = canEditPrice
            ? (`<label class="text-xs text-[#6B4423]">$</label>` +
               `<input type="number" step="0.01" min="0"` +
               ` value="${priceVal}" placeholder="0.00"` +
               ` class="place-order-price w-20 border-2 border-[#6B4423] rounded-lg px-2 py-1 text-sm text-center"` +
               ` onchange="updatePlaceOrderPrice(${index}, this.value)">`)
            : '';
        const hideCase = typeof isBrianAssignedCustomer === 'function'
            && isBrianAssignedCustomer(currentPlaceOrderCustomer);
        const qtyN = Number(item.quantity) || 0;
        const unitN = Number(item.unitPrice);
        const lineTotal = isFinite(unitN) ? (unitN * qtyN) : 0;
        const unitText = isFinite(unitN) ? ('$' + unitN.toFixed(2) + ' each') : escapeHtml(item.displayPrice || '');
        const lineText = isFinite(unitN) ? ('$' + lineTotal.toFixed(2)) : '';
        const sub = canEditPrice
            ? (hideCase ? '' : escapeHtml(item.caseSize || ''))
            : ((hideCase || !item.caseSize) ? unitText : (escapeHtml(item.caseSize || '') + ' · ' + unitText));
        return `
        <div class="py-2 border-b border-[#d4b78f]">
            <div class="flex justify-between items-start gap-2">
                <p class="text-sm font-semibold brand-green pr-2">${escapeHtml(item.displayName || salesmanDisplayName(item.name))}</p>
                <button type="button" onclick="removePlaceOrderItem(${index})"
                        class="text-red-600 text-sm px-1 py-0 hover:bg-red-50 rounded shrink-0">Remove</button>
            </div>
            <p class="text-xs text-[#6B4423]">${sub}</p>
            ${packagingNoteText(item) ? ('<p class="text-[11px] font-semibold text-[#6B4423] mt-1">' + escapeHtml(packagingNoteText(item)) + '</p>') : ''}
            ${(typeof isTftppCustomer === 'function' && isTftppCustomer(currentPlaceOrderCustomer)) ? (
                '<label class="text-[11px] text-[#6B4423] mr-2"><input type="checkbox" class="accent-[#1E4D2B]" ' +
                (item.needsUpcLabel ? 'checked ' : '') +
                'onchange="togglePlaceOrderPackaging(' + index + ', \'needsUpcLabel\', this.checked)"> UPC + Label</label>' +
                '<label class="text-[11px] text-[#6B4423]"><input type="checkbox" class="accent-[#1E4D2B]" ' +
                (item.needsCigarTag ? 'checked ' : '') +
                'onchange="togglePlaceOrderPackaging(' + index + ', \'needsCigarTag\', this.checked)"> Cigar Tag</label>'
            ) : ''}
            <div class="flex items-center justify-between gap-2 mt-2">
                <div class="flex items-center gap-2">
                    ${priceField}
                    <label class="text-xs text-[#6B4423]">Units</label>
                    <input type="number"
                           min="1"
                           value="${item.quantity}"
                           class="place-order-qty w-16 border-2 border-[#6B4423] rounded-lg px-2 py-1 text-sm text-center"
                           onchange="updatePlaceOrderQty(${index}, this.value)">
                </div>
                <span class="text-sm font-bold brand-green whitespace-nowrap">${lineText}</span>
            </div>
        </div>`;
        }).join('');
        return header + rows;
    }).join('');

    let total = 0;
    placeOrderItems.forEach((item) => {
        if (item.isMarketPrice && (item.unitPrice == null || item.unitPrice === '')) return;
        const unit = parseFloat(item.unitPrice) || 0;
        const qty = parseInt(item.quantity, 10) || 0;
        total += unit * qty;
    });
    const totalEl = document.getElementById("place-order-total");
    if (totalEl) totalEl.textContent = '$' + total.toFixed(2);

    if (!skipFocus) {
        const qtyInputs = container.querySelectorAll('input.place-order-qty');
        if (qtyInputs.length) {
            const last = qtyInputs[qtyInputs.length - 1];
            last.focus();
            last.select();
        }
    }

    if (typeof persistPlaceOrderDraft === 'function') persistPlaceOrderDraft();
}

function updatePlaceOrderQty(index, value) {
    const qty = parseInt(value, 10);
    if (isNaN(qty) || qty < 1) return;
    if (placeOrderItems[index]) {
        placeOrderItems[index].quantity = qty;
        renderPlaceOrderItems();
    }
}

function updatePlaceOrderPrice(index, value) {
    const item = placeOrderItems[index];
    if (!item) return;
    const raw = String(value || '').trim();
    if (raw === '') {
        item.unitPrice = null;
        item.displayPrice = item.isMarketPrice ? 'Market Price' : '$0.00';
    } else {
        const n = parseFloat(raw);
        if (isNaN(n) || n < 0) return;
        item.unitPrice = n;
        item.displayPrice = '$' + n.toFixed(2);
    }
    renderPlaceOrderItems(true);
}

function removePlaceOrderItem(index) {
    placeOrderItems.splice(index, 1);
    renderPlaceOrderItems();
}

async function notifyMarshallProforma(order) {
    try {
        const res = await fetch(SUPABASE_URL + '/functions/v1/send-pro-forma-email', {
            method: 'POST',
            headers: await getEdgeFunctionHeaders(),
            body: JSON.stringify({
                skipMarshall: !!(order && order.skipMarshall),
                orderId: order.orderId || order.id,
                customerName: order.customerName || order.customer_name || '',
                companyName: order.companyName || order.customer_company || '',
                customerEmail: order.customerEmail || order.customer_email || '',
                salesmanName: order.salesmanName || order.salesman_name || '',
                items: order.items || [],
                notes: order.notes || '',
                shippingCost: order.shippingCost ?? order.shipping_cost ?? 0,
                credit: order.credit ?? 0,
                submittedAt: order.submittedAt || order.submitted_at || new Date().toISOString(),
                source: order.source || 'wholesale',
                commissionRate: order.commissionRate || order.salesman_commission_percent || null,
                customerPhone: order.customerPhone || order.customer_phone || '',
                billingAddress: order.billingAddress || order.billing_address || '',
                shippingAddress: order.shippingAddress || order.shipping_address || '',
                isRevision: !!(order.isRevision || orderHasUpdateNote(order)),
                changeLog: order.changeLog || '',
                editedAt: order.editedAt || '',
                previousSubtotal: order.previousSubtotal,
                updatedSubtotal: order.updatedSubtotal,
                subjectPrefix: (order.isRevision || orderHasUpdateNote(order)) ? 'UPDATED ' : ''
            })
        });
        if (!res.ok) {
            const text = await res.text();
            console.error('Pro forma email failed:', res.status, text);
        }
    } catch (err) {
        console.error('Pro forma email error:', err);
    }
}

function hidePlaceOrderConfirmModal() {
    document.getElementById('place-order-confirm-dynamic')?.remove();
}

function isJonathanActing() {
    try {
        const u = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (String(u.email || '').toLowerCase() === 'jackerman@donegalnatural.com') return true;
    } catch (e) {}
    if (window.originalAdminUser && String(originalAdminUser.email || '').toLowerCase() === 'jackerman@donegalnatural.com') return true;
    return false;
}

function openPlaceOrderConfirmModal() {
    const wrap = document.getElementById('po-skip-marshall-wrap');
    if (wrap) wrap.classList.toggle('hidden', !isJonathanActing());
    if (!placeOrderItems || placeOrderItems.length === 0) {
        alert('Please add at least one product to the order.');
        return;
    }

    const nameFromField =
        (document.getElementById('place-order-customer-name')?.textContent || '').trim() ||
        (document.getElementById('place-order-customer')?.value || '').trim() ||
        (typeof currentPlaceOrderCustomer === 'string' ? currentPlaceOrderCustomer : '') ||
        (currentPlaceOrderCustomer && currentPlaceOrderCustomer.name) ||
        '';

    if (!nameFromField) {
        alert('No customer selected.');
        return;
    }

    const customerObj = (currentPlaceOrderCustomer && typeof currentPlaceOrderCustomer === 'object')
        ? currentPlaceOrderCustomer
        : null;

    const isWalkIn = !!(customerObj && customerObj.walkIn);
    if (isWalkIn && !canPlaceOpenOrder()) {
        alert('Open orders are placed from the Internal portal only.');
        return;
    }
    const walkInName = (document.getElementById('po-walkin-name')?.value || '').trim();
    const walkInStreet = (document.getElementById('po-walkin-street')?.value || '').trim();
    const walkInCity = (document.getElementById('po-walkin-city')?.value || '').trim();
    const walkInState = (document.getElementById('po-walkin-state')?.value || '').trim().toUpperCase();
    const walkInZip = (document.getElementById('po-walkin-zip')?.value || '').trim();
    const walkInAddress = [
        walkInStreet,
        [[walkInCity, walkInState].filter(Boolean).join(', '), walkInZip].filter(Boolean).join(' ')
    ].filter(Boolean).join('\n');
    const confirmName = (isWalkIn && walkInName) ? walkInName : nameFromField;
    const shipText = (
        isWalkIn
            ? walkInAddress
            : (customerObj?.shipping_address || customerObj?.shippingAddress || '')
    ).trim() || 'No shipping address on file';

    let pricedTotal = 0;
    let hasMarket = false;
    let rows = '';
    const sheetOrder = ['Bully Sticks', 'Jerky', 'Ears', 'Cow Cheeks', 'Ox Tails', 'Rabbit', 'Duck and Goose', 'Beef', 'Lamb', 'Buffalo', 'Chicken', 'Braided', 'Pressed Bones', 'Retrievers', "Twisty Q's and Natural Munchy Sticks", "Binkey's", 'Other'];
    const grouped = {};
    placeOrderItems.forEach(function (item) {
        const key = item.product || item.name || orderLineDisplayName(item);
        const cats = (typeof brianPackCategories === 'function' && brianPackCategories(key)) || [];
        const cat = cats[0] || 'Other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
    });
    Object.keys(grouped).sort(function (a, b) {
        const ia = sheetOrder.indexOf(a);
        const ib = sheetOrder.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    }).forEach(function (cat) {
        rows += `<p style="margin:10px 0 6px;font-size:12px;font-weight:800;letter-spacing:0.04em;color:#6B4423;">${escapeHtml(cat)}</p>`;
        grouped[cat].forEach(function (item) {
            const qty = item.quantity || 1;
            const isMarket = !!item.isMarketPrice;
            let lineLabel = item.displayPrice || '—';
            if (isMarket && (item.unitPrice == null || item.unitPrice === '')) {
                hasMarket = true;
                lineLabel = 'Market';
            } else {
                const unit = parseFloat(item.unitPrice) || 0;
                const line = unit * qty;
                pricedTotal += line;
                lineLabel = '$' + line.toFixed(2);
            }
            const unitText = (isMarket && (item.unitPrice == null || item.unitPrice === ''))
                ? 'Market'
                : ('$' + (parseFloat(item.unitPrice) || 0).toFixed(2) + ' ea');
            rows += `
            <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border-bottom:1px solid #f0e6d6;padding-bottom:8px;margin-bottom:8px;">
                <div style="min-width:0;flex:1;">
                    <p style="font-weight:600;color:#1E4D2B;margin:0;">${escapeHtml(orderLineDisplayName(item))}</p>
                    <p style="font-size:12px;color:#6B4423;margin:2px 0 0;">Qty ${qty}${item.caseSize ? ' · ' + escapeHtml(item.caseSize) : ''} · ${unitText}</p>
                    ${packagingNoteText(item) ? ('<p style="font-size:11px;font-weight:700;color:#6B4423;margin:2px 0 0;">' + escapeHtml(packagingNoteText(item)) + '</p>') : ''}
                </div>
                <p style="font-weight:600;color:#1E4D2B;margin:0;white-space:nowrap;">${lineLabel}</p>
            </div>
        `;
        });
    });

    document.getElementById('place-order-confirm-dynamic')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'place-order-confirm-dynamic';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;padding:16px;';
    overlay.innerHTML = `
        <div style="background:#fff;border:2px solid #6B4423;border-radius:16px;width:100%;max-width:32rem;max-height:90vh;overflow:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #d4b78f;">
                <h2 style="margin:0;font-size:1.25rem;font-weight:700;color:#1E4D2B;">Confirm Order</h2>
                <button type="button" onclick="hidePlaceOrderConfirmModal()" style="border:none;background:none;font-size:1.5rem;color:#6B4423;cursor:pointer;">&times;</button>
            </div>
            <div style="padding:16px 20px;">
                <p style="font-size:11px;font-weight:700;color:#6B4423;text-transform:uppercase;margin:0 0 4px;">Customer</p>
                <p style="margin:0 0 12px;color:#1E4D2B;font-weight:600;">${escapeHtml(confirmName)}</p>
                <p style="font-size:11px;font-weight:700;color:#6B4423;text-transform:uppercase;margin:0 0 4px;">Shipping Address</p>
                <p style="margin:0 0 16px;color:#1E4D2B;white-space:pre-line;">${escapeHtml(shipText)}</p>
                <p style="font-size:11px;font-weight:700;color:#6B4423;text-transform:uppercase;margin:0 0 8px;">Items</p>
                <div style="margin-bottom:16px;">${rows}</div>
                <div style="display:flex;justify-content:space-between;background:#f8f4eb;border-radius:12px;padding:12px 16px;">
                    <span style="font-weight:600;color:#6B4423;">Order Total</span>
                    <span style="font-size:1.25rem;font-weight:700;color:#1E4D2B;">$${pricedTotal.toFixed(2)}</span>
                </div>
                ${hasMarket ? '<p style="font-size:12px;color:#c2410c;margin:8px 0 0;">Some items are market price and are not included in this total.</p>' : ''}
            </div>
            <div style="display:flex;gap:12px;padding:16px 20px;border-top:1px solid #d4b78f;">
                <button type="button" onclick="hidePlaceOrderConfirmModal()"
                    style="flex:1;padding:10px 16px;border:2px solid #6B4423;background:#fff;color:#6B4423;border-radius:12px;font-weight:600;cursor:pointer;">Go Back</button>
                <button type="button" onclick="confirmAndSubmitPlaceOrder()"
                    style="flex:1;padding:10px 16px;border:none;background:#1E4D2B;color:#d4b78f;border-radius:12px;font-weight:600;cursor:pointer;">Confirm &amp; Submit</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function confirmAndSubmitPlaceOrder() {
    if (window._placeOrderSubmitting) return;
    const seat = (typeof getOperatingSalesmanEmail === 'function' ? getOperatingSalesmanEmail() : '') || '';
    const user = (typeof getCurrentUser === 'function' ? getCurrentUser() : null) || {};
    const email = String(user.email || '').toLowerCase().trim();
    const isBrian = seat === 'donegaldogtreats@gmail.com' || email === 'donegaldogtreats@gmail.com';
    if (isBrian && !confirm('Did we attach payment information for this customer?\n\nYes submits the order. Cancel goes back.')) {
        return;
    }
    hidePlaceOrderConfirmModal();
    if (typeof submitPlaceOrder === 'function') {
        await submitPlaceOrder();
    }
}

async function submitPlaceOrder() {
    if (window._placeOrderSubmitting) return;
    window._placeOrderSubmitting = true;
    try {
        const nameFromField =
            (document.getElementById("place-order-customer-name")?.textContent || "").trim() ||
            (document.getElementById("place-order-customer")?.value || "").trim() ||
            (typeof currentPlaceOrderCustomer === "string" ? currentPlaceOrderCustomer : "") ||
            (currentPlaceOrderCustomer && currentPlaceOrderCustomer.name) ||
            "";

        if (!nameFromField) {
            alert("No customer selected.");
            return;
        }

        if (!placeOrderItems || placeOrderItems.length === 0) {
            alert("Please add at least one product to the order.");
            return;
        }

        const user = getCurrentUser() || currentUser;
        if (!user) {
            alert("You must be logged in.");
            return;
        }

        const notesEl = document.getElementById("place-order-notes");
        const notes = notesEl ? notesEl.value.trim() : "";
        const paymentOnFile = !!(document.getElementById('po-payment-on-file') && document.getElementById('po-payment-on-file').checked);
        if (!paymentOnFile) {
            alert('Check Yes before submitting. Call the warehouse with the full payment details. Do not type the number here.');
            return;
        }

        const customerObj = (currentPlaceOrderCustomer && typeof currentPlaceOrderCustomer === "object")
            ? currentPlaceOrderCustomer
            : null;
        const isWalkIn = !!(customerObj && customerObj.walkIn);
        const walkInName = (document.getElementById('po-walkin-name')?.value || '').trim();
        const walkInCompany = (document.getElementById('po-walkin-company')?.value || '').trim();
        const walkInEmail = (document.getElementById('po-walkin-email')?.value || '').trim();
        const walkInPhone = (document.getElementById('po-walkin-phone')?.value || '').trim();
        const walkInStreet = (document.getElementById('po-walkin-street')?.value || '').trim();
        const walkInCity = (document.getElementById('po-walkin-city')?.value || '').trim();
        const walkInState = (document.getElementById('po-walkin-state')?.value || '').trim().toUpperCase();
        const walkInZip = (document.getElementById('po-walkin-zip')?.value || '').trim();
        const walkInAddress = [walkInStreet, [walkInCity, walkInState].filter(Boolean).join(', '), walkInZip].filter(Boolean).join(' ');
        const walkInCommissionRaw = (document.getElementById('po-walkin-commission')?.value || '').trim();
        let walkInCommission = null;
        if (walkInCommissionRaw !== '') {
            walkInCommission = parseFloat(walkInCommissionRaw);
            if (isNaN(walkInCommission) || walkInCommission < 0 || walkInCommission > 100) {
                alert('Commission must be between 0 and 100, or blank.');
                return;
            }
        }
        if (isWalkIn && !walkInName) {
            alert('Enter a customer name for this open order.');
            return;
        }

        const invoiceNumber = generateInvoiceNumber();

        const payload = {
            customer_id: isWalkIn ? null : (customerObj?.id || null),
            customer_name: isWalkIn ? walkInName : nameFromField,
            customer_email: isWalkIn ? (walkInEmail.toLowerCase() || null) : ((customerObj?.email || "").toLowerCase().trim() || null),
            customer_company: isWalkIn ? (walkInCompany || null) : (customerObj?.company || null),
            salesman_email: (typeof getOperatingSalesmanEmail === 'function' ? getOperatingSalesmanEmail() : (user.email || "")).toLowerCase().trim(),
            salesman_name: (typeof getOperatingSalesmanName === 'function' ? getOperatingSalesmanName() : null) || user.fullName || user.name || "Salesman",
            status: "submitted",
            source: "salesman",
            items: placeOrderItems.map(item => ({
                product: item.name,
                displayName: item.displayName || salesmanDisplayName(item.name),
                category: ((typeof brianPackCategories === 'function' && brianPackCategories(item.name || item.product)) || [])[0] || 'Other',
                quantity: item.quantity || 1,
                caseSize: item.caseSize || "",
                unitPrice: item.unitPrice != null ? item.unitPrice : null,
                displayPrice: item.displayPrice || "",
                isMarketPrice: !!item.isMarketPrice,
                itemNumber: item.itemNumber || '',
                skuCode: item.skuCode || '',
                needsUpcLabel: !!item.needsUpcLabel,
                needsCigarTag: !!item.needsCigarTag
            })),
            notes: (notes || "Submitted via Salesman Portal") +
                (isWalkIn && walkInPhone ? ("\nPhone: " + walkInPhone) : "") +
                (isWalkIn && walkInAddress ? ("\nAddress: " + walkInAddress) : ""),
            shipping_cost: 0,
            submitted_at: new Date().toISOString(),
            invoice_number: invoiceNumber,
            salesman_commission_percent: isWalkIn
                ? walkInCommission
                : ((customerObj && customerObj.salesman_commission_percent != null && customerObj.salesman_commission_percent !== '')
                    ? Number(customerObj.salesman_commission_percent)
                    : null)
        };
        if (String(payload.salesman_email || '').toLowerCase().trim() !== 'jackerman@donegalnatural.com') {
            payload.portal_commission_rate = 5;
        }

        const { data, error } = await supabaseClient
            .from("orders")
            .insert([payload])
            .select('id, invoice_number')
            .single();

        if (error) throw error;

        const shortId = data?.invoice_number || invoiceNumber || data?.id;

        await notifyMarshallProforma({
            skipMarshall: !!(isJonathanActing() && document.getElementById('po-skip-marshall')?.checked),
            orderId: shortId,
            paymentOnFile: paymentOnFile,
            paymentLast4: '',
            customerName: payload.customer_name,
            companyName: payload.customer_company,
            customerEmail: payload.customer_email,
            salesmanName: payload.salesman_name,
            customerPhone: (currentPlaceOrderCustomer && currentPlaceOrderCustomer.phone) || '',
            billingAddress: (currentPlaceOrderCustomer && (currentPlaceOrderCustomer.billing_address || currentPlaceOrderCustomer.billingAddress)) || '',
            shippingAddress: (currentPlaceOrderCustomer && (currentPlaceOrderCustomer.shipping_address || currentPlaceOrderCustomer.shippingAddress)) || '',
            items: payload.items,
            notes: payload.notes,
            shippingCost: payload.shipping_cost || 0,
            credit: 0,
            submittedAt: payload.submitted_at,
            source: payload.source,
            commissionRate: payload.salesman_commission_percent || null
        });

        clearPlaceOrderDraft(currentPlaceOrderCustomer);
        hidePlaceOrderModal({ discard: true });
        alert("Order submitted successfully for " + nameFromField + ".");

        if (typeof renderMyOrders === "function") {
            renderMyOrders();
        }
    } catch (err) {
        console.error(err);
        alert("Could not submit order.\n" + (err.message || ""));
    } finally {
        window._placeOrderSubmitting = false;
    }
}

window.openWalkInPlaceOrder = openWalkInPlaceOrder;
window.placeOrderDraftKey = placeOrderDraftKey;
window.persistPlaceOrderDraft = persistPlaceOrderDraft;
window.loadPlaceOrderDraft = loadPlaceOrderDraft;
window.clearPlaceOrderDraft = clearPlaceOrderDraft;
window.packagingNameKey = packagingNameKey;
window.isTftppCustomer = isTftppCustomer;
window.lookupTftppPackaging = lookupTftppPackaging;
window.applyCustomerPackagingToItem = applyCustomerPackagingToItem;
window.packagingNoteText = packagingNoteText;
window.togglePlaceOrderPackaging = togglePlaceOrderPackaging;
window.placeOrderForCustomer = placeOrderForCustomer;
window.hidePlaceOrderModal = hidePlaceOrderModal;
window.loadPlaceOrderPhotos = loadPlaceOrderPhotos;
window.placeOrderPhotoUrl = placeOrderPhotoUrl;
window.searchPlaceOrderProducts = searchPlaceOrderProducts;
window.addProductToPlaceOrderQty = addProductToPlaceOrderQty;
window.isSalesmanOos = isSalesmanOos;
window.formatOosDisplayDate = formatOosDisplayDate;
window.salesmanOosLabel = salesmanOosLabel;
window.loadSalesmanOutOfStock = loadSalesmanOutOfStock;
window.getOperatingSalesmanEmail = getOperatingSalesmanEmail;
window.getOperatingSalesmanName = getOperatingSalesmanName;
window.isBrianAssignedCustomer = isBrianAssignedCustomer;
window.salesmanDisplayName = salesmanDisplayName;
window.orderLineDisplayName = orderLineDisplayName;
window.resolvePlaceOrderPrice = resolvePlaceOrderPrice;
window.loadBrianPlaceOrderPrices = loadBrianPlaceOrderPrices;
window.addProductToPlaceOrder = addProductToPlaceOrder;
window.renderPlaceOrderItems = renderPlaceOrderItems;
window.updatePlaceOrderQty = updatePlaceOrderQty;
window.updatePlaceOrderPrice = updatePlaceOrderPrice;
window.removePlaceOrderItem = removePlaceOrderItem;
window.notifyMarshallProforma = notifyMarshallProforma;
window.hidePlaceOrderConfirmModal = hidePlaceOrderConfirmModal;
window.isJonathanActing = isJonathanActing;
window.openPlaceOrderConfirmModal = openPlaceOrderConfirmModal;
window.confirmAndSubmitPlaceOrder = confirmAndSubmitPlaceOrder;
window.submitPlaceOrder = submitPlaceOrder;
