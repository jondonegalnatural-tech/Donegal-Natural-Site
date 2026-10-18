// Internal portal — company base price sheet and bulk percent adjustments.
// PRODUCT_CATALOG_ALL stays global because other portal code reads it.
// ================== COMPANY BASE PRICE SHEET ==================
let basePriceSheetEditMode = false;
let basePriceSheetShowDiscontinued = false;
var PRODUCT_CATALOG_ALL = []; // active + discontinued — Base Price Sheet only

function toggleBasePriceSheetEdit() {
    basePriceSheetEditMode = !basePriceSheetEditMode;
    const editBtn = document.getElementById('bps-edit-btn');
    const saveBtn = document.getElementById('bps-save-btn');
    const bulkBar = document.getElementById('bps-bulk-bar');
    if (editBtn) editBtn.textContent = basePriceSheetEditMode ? 'Cancel' : 'Edit';
    if (saveBtn) {
        if (basePriceSheetEditMode) saveBtn.classList.remove('hidden');
        else saveBtn.classList.add('hidden');
    }
    if (bulkBar) {
        if (basePriceSheetEditMode) bulkBar.classList.remove('hidden');
        else bulkBar.classList.add('hidden');
    }
    renderBasePriceSheet();
}

function formatBpsEditedAt(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit'
        });
    } catch {
        return '—';
    }
}

function onBpsShowDiscontinuedChange() {
    const cb = document.getElementById('bps-show-discontinued');
    basePriceSheetShowDiscontinued = !!(cb && cb.checked);
    renderBasePriceSheet();
}

function bpsSelectAll(checked) {
    document.querySelectorAll('#base-price-sheet-list .bps-check').forEach(cb => {
        cb.checked = !!checked;
    });
    document.querySelectorAll('#base-price-sheet-list .bps-check-all').forEach(cb => {
        cb.checked = !!checked;
    });
    updateBpsSelectedCount();
}

function updateBpsSelectedCount() {
    const count = document.querySelectorAll('#base-price-sheet-list .bps-check:checked').length;
    const el = document.getElementById('bps-selected-count');
    if (el) el.textContent = count + ' selected';
}

function getBpsSelectedIds() {
    return Array.from(document.querySelectorAll('#base-price-sheet-list .bps-check:checked'))
        .map(cb => cb.getAttribute('data-id'))
        .filter(Boolean);
}

async function removePriceSheetKeys(tableName, productNames) {
    if (!productNames || !productNames.length) return;
    const nameSet = new Set(productNames);
    const { data, error } = await supabaseClient
        .from(tableName)
        .select('id, prices');
    if (error) throw error;
    if (!data || !data.length) return;

    for (const row of data) {
        const prices = row.prices && typeof row.prices === 'object' ? { ...row.prices } : {};
        let changed = false;
        nameSet.forEach(name => {
            if (Object.prototype.hasOwnProperty.call(prices, name)) {
                delete prices[name];
                changed = true;
            }
        });
        if (!changed) continue;
        const { error: updErr } = await supabaseClient
            .from(tableName)
            .update({ prices: prices, updated_at: new Date().toISOString() })
            .eq('id', row.id);
        if (updErr) throw updErr;
    }
}

async function markSelectedProductsOutOfStock() {
    const ids = Array.from(document.querySelectorAll('#base-price-sheet-list .bps-check:checked'))
        .map(cb => cb.getAttribute('data-id'))
        .filter(Boolean);
    if (!ids.length) {
        alert('Select at least one product.');
        return;
    }
    const names = ids.map(id => {
        const row = document.querySelector('#base-price-sheet-list tr.bps-row[data-id="' + id + '"]');
        return row ? (row.getAttribute('data-name') || '') : '';
    }).filter(Boolean);
    if (!names.length) {
        alert('Could not read product names.');
        return;
    }
    if (!confirm('Mark ' + names.length + ' product(s) Out of Stock?\n\nInventory will be set to 0. The item stays on the price sheet.')) {
        return;
    }
    try {
        for (const name of names) {
            if (typeof upsertInventoryQuantity === 'function') {
                await upsertInventoryQuantity(name, 0);
            }
            if (typeof inventory === 'object') inventory[name] = 0;
        }
        alert(names.length + ' product(s) marked Out of Stock.');
        if (typeof showCurrentInventory === 'function') showCurrentInventory();
        if (typeof renderBasePriceSheet === 'function') renderBasePriceSheet();
    } catch (err) {
        console.error('markSelectedProductsOutOfStock error:', err);
        alert('Could not mark Out of Stock.\n' + (err.message || ''));
    }
}

async function discontinueSelectedProducts() {
    const ids = getBpsSelectedIds();
    if (!ids.length) {
        alert('Select at least one product.');
        return;
    }
    if (!confirm('Discontinue ' + ids.length + ' product(s) COMPANY-WIDE?\n\n' +
        'This overrides salesman Hide and removes the item from EVERY salesman and EVERY store.\n' +
        'Company Base keeps the row under Show discontinued.\n' +
        'To hide for one salesman only, use that salesman’s sheet Hide button.\n' +
        'Reactivate later with Show discontinued.')) {
        return;
    }

    try {
        const nowIso = new Date().toISOString();
        const { error } = await supabaseClient
            .from('products')
            .update({ active: false, updated_at: nowIso })
            .in('id', ids);
        if (error) throw error;

        // Update local catalogs
        (PRODUCT_CATALOG_ALL || []).forEach(p => {
            if (ids.includes(p.id)) {
                p.active = false;
                p.updatedAt = nowIso;
            }
        });
        PRODUCT_CATALOG = (PRODUCT_CATALOG_ALL || []).filter(p => p.active !== false);

        renderBasePriceSheet();
        alert(ids.length + ' product(s) discontinued.');
    } catch (err) {
        console.error('discontinueSelectedProducts error:', err);
        alert('Could not discontinue.\n' + (err.message || ''));
    }
}

async function reactivateSelectedProducts() {
    const ids = getBpsSelectedIds();
    if (!ids.length) {
        alert('Select at least one product.');
        return;
    }
    if (!confirm('Reactivate ' + ids.length + ' product(s)?\n\nThey will appear again in wholesale and salesman catalogs.')) {
        return;
    }

    try {
        const nowIso = new Date().toISOString();
        const { error } = await supabaseClient
            .from('products')
            .update({ active: true, updated_at: nowIso })
            .in('id', ids);
        if (error) throw error;

        (PRODUCT_CATALOG_ALL || []).forEach(p => {
            if (ids.includes(p.id)) {
                p.active = true;
                p.updatedAt = nowIso;
            }
        });
        PRODUCT_CATALOG = (PRODUCT_CATALOG_ALL || []).filter(p => p.active !== false);

        renderBasePriceSheet();
        alert(ids.length + ' product(s) reactivated.');
    } catch (err) {
        console.error('reactivateSelectedProducts error:', err);
        alert('Could not reactivate.\n' + (err.message || ''));
    }
}

async function deleteSelectedProductsPermanently() {
    const ids = getBpsSelectedIds();
    if (!ids.length) {
        alert('Select at least one product.');
        return;
    }

    const names = ids.map(id => {
        const p = (PRODUCT_CATALOG_ALL || []).find(x => x.id === id);
        return p ? p.name : id;
    });

    if (!confirm('PERMANENTLY delete ' + ids.length + ' product(s)?\n\n' +
        names.slice(0, 8).join('\n') +
        (names.length > 8 ? '\n… and ' + (names.length - 8) + ' more' : '') +
        '\n\nThis removes them from the products table and strips them from all salesman and customer price sheets.\nThis cannot be undone.')) {
        return;
    }
    if (!confirm('Final confirmation: really delete these products permanently?')) {
        return;
    }

    try {
        // 1. Strip from price sheets first
        await removePriceSheetKeys('salesman_price_sheets', names);
        await removePriceSheetKeys('customer_price_sheets', names);

        // 2. Optional inventory cleanup (best-effort)
        try {
            for (const name of names) {
                await supabaseClient.from('inventory').delete().eq('product_name', name);
            }
        } catch (invErr) {
            console.warn('inventory cleanup skipped:', invErr);
        }

        // 3. Hard delete products
        const { error } = await supabaseClient
            .from('products')
            .delete()
            .in('id', ids);
        if (error) throw error;

        // 4. Update local catalogs
        PRODUCT_CATALOG_ALL = (PRODUCT_CATALOG_ALL || []).filter(p => !ids.includes(p.id));
        PRODUCT_CATALOG = (PRODUCT_CATALOG || []).filter(p => !ids.includes(p.id));

        renderBasePriceSheet();
        alert(ids.length + ' product(s) permanently deleted.');
    } catch (err) {
        console.error('deleteSelectedProductsPermanently error:', err);
        alert('Could not delete.\n' + (err.message || ''));
    }
}

function openBasePriceSheetModal() {
    const modal = document.getElementById('base-price-sheet-modal');
    if (!modal) return;
    const searchEl = document.getElementById('base-price-sheet-search');
    if (searchEl) searchEl.value = '';
    basePriceSheetEditMode = false;
    basePriceSheetShowDiscontinued = false;
    const editBtn = document.getElementById('bps-edit-btn');
    const saveBtn = document.getElementById('bps-save-btn');
    const bulkBar = document.getElementById('bps-bulk-bar');
    const showDisc = document.getElementById('bps-show-discontinued');
    if (editBtn) editBtn.textContent = 'Edit';
    if (saveBtn) saveBtn.classList.add('hidden');
    if (bulkBar) bulkBar.classList.add('hidden');
    if (showDisc) showDisc.checked = false;
    renderBasePriceSheet();
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

function hideBasePriceSheetModal() {
    const modal = document.getElementById('base-price-sheet-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.style.display = 'none';
}

function renderBasePriceSheet() {
    const listEl = document.getElementById('base-price-sheet-list');
    const subEl = document.getElementById('base-price-sheet-subtitle');
    if (!listEl) return;

    const source = (PRODUCT_CATALOG_ALL && PRODUCT_CATALOG_ALL.length)
        ? PRODUCT_CATALOG_ALL
        : (PRODUCT_CATALOG || []);

    if (!source.length) {
        listEl.innerHTML = '<p class="text-sm text-[#6B4423]">Product catalog not loaded.</p>';
        if (subEl) subEl.textContent = 'No products';
        return;
    }

    const search = (document.getElementById('base-price-sheet-search')?.value || '').toLowerCase().trim();
    const showDisc = basePriceSheetShowDiscontinued;

    const filtered = source.filter(p => {
        const isActive = p.active !== false;
        if (!showDisc && !isActive) return false;
        if (!search) return true;
        return (p.name || '').toLowerCase().includes(search) ||
               (p.category || '').toLowerCase().includes(search) ||
               (p.subCategory || '').toLowerCase().includes(search) ||
               (p.caseSize || '').toLowerCase().includes(search);
    });

    const activeCount = filtered.filter(p => p.active !== false).length;
    const discCount = filtered.filter(p => p.active === false).length;

    if (subEl) {
        let text = filtered.length + ' product' + (filtered.length !== 1 ? 's' : '');
        if (showDisc && discCount > 0) text += ' (' + discCount + ' discontinued)';
        if (search) text += ' matching "' + search + '"';
        else text += ' · base unit prices';
        subEl.textContent = text;
    }

    if (filtered.length === 0) {
        listEl.innerHTML = '<p class="text-sm text-[#6B4423]">No products match your search.</p>';
        updateBpsSelectedCount();
        return;
    }

    const grouped = {};
    filtered.forEach(p => {
        const cat = p.category || 'Other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(p);
    });

    const categories = Object.keys(grouped).sort();
    let html = '';

    categories.forEach(cat => {
        const products = grouped[cat];
        const checkHeader = basePriceSheetEditMode
            ? `<th class="p-2.5 text-center w-10"><input type="checkbox" class="bps-check-all w-4 h-4" onchange="bpsSelectAll(this.checked)" title="Select all in this category"></th>`
            : '';

        html += `
            <div>
                <h3 class="text-base font-bold brand-green mb-2 border-b border-[#d4b78f] pb-1">${cat}</h3>
                <div class="overflow-x-auto border border-[#d4b78f] rounded-xl mb-4">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="bg-[#1E4D2B] text-[#d4b78f]">
                                ${checkHeader}
                                <th class="p-2.5 text-left">Product</th>
                                <th class="p-2.5 text-left w-28">Case Size</th>
                                <th class="p-2.5 text-right w-28">Unit Price</th>
                                <th class="p-2.5 text-center w-40">Last Edited</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        products.forEach((p, i) => {
            const isDisc = p.active === false;
            const bg = isDisc ? 'bg-orange-50' : (i % 2 ? 'bg-[#f8f4eb]' : 'bg-white');
            const priceText = p.unitPrice != null
                ? ('$' + Number(p.unitPrice).toFixed(2))
                : '—';
            const marketBadge = p.isMarketPrice
                ? ' <span class="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-orange-100 text-orange-800">Market</span>'
                : '';
            const discBadge = isDisc
                ? ' <span class="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-gray-200 text-gray-700">Discontinued</span>'
                : '';
            const nameVal = (p.name || '').replace(/"/g, '&quot;');
            const caseVal = (p.caseSize || '').replace(/"/g, '&quot;');
            const priceVal = p.unitPrice != null ? Number(p.unitPrice).toFixed(2) : '';
            const editedText = formatBpsEditedAt(p.updatedAt);

            const nameCell = basePriceSheetEditMode
                ? `<input type="text" class="bps-name border border-[#d4b78f] rounded-lg px-2 py-1 w-full text-sm" value="${nameVal}">`
                : `<span class="${isDisc ? 'line-through text-gray-500' : ''}">${p.name || '—'}</span>${marketBadge}${discBadge}`;
            const caseCell = basePriceSheetEditMode
                ? `<input type="text" class="bps-case border border-[#d4b78f] rounded-lg px-2 py-1 w-28 text-sm" value="${caseVal}">`
                : `<span class="${isDisc ? 'text-gray-500' : ''}">${p.caseSize || '—'}</span>`;
            const priceCell = basePriceSheetEditMode
                ? `<input type="number" step="0.01" min="0" class="bps-price border border-[#d4b78f] rounded-lg px-2 py-1 w-24 text-sm text-right" value="${priceVal}">`
                : `<span class="font-semibold ${isDisc ? 'text-gray-500' : ''}">${priceText}</span>`;

            const checkCell = basePriceSheetEditMode
                ? `<td class="p-2.5 text-center"><input type="checkbox" class="bps-check w-4 h-4" data-id="${p.id || ''}" onchange="updateBpsSelectedCount()"></td>`
                : '';

            html += `
                <tr class="border-t border-[#e8d9b8] ${bg} bps-row"
                    data-id="${p.id || ''}"
                    data-name="${(p.name || '').replace(/"/g, '&quot;')}"
                    data-active="${isDisc ? 'false' : 'true'}">
                    ${checkCell}
                    <td class="p-2.5">${nameCell}</td>
                    <td class="p-2.5">${caseCell}</td>
                    <td class="p-2.5 text-right">${priceCell}</td>
                    <td class="p-2.5 text-center text-xs text-[#6B4423]">${editedText}</td>
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
    updateBpsSelectedCount();
}

async function renamePriceSheetKeys(tableName, oldName, newName) {
    const { data, error } = await supabaseClient
        .from(tableName)
        .select('id, prices');
    if (error) throw error;
    if (!data || !data.length) return;

    for (const row of data) {
        const prices = row.prices && typeof row.prices === 'object' ? { ...row.prices } : {};
        if (!Object.prototype.hasOwnProperty.call(prices, oldName)) continue;
        if (oldName !== newName) {
            prices[newName] = prices[oldName];
            delete prices[oldName];
        }
        const { error: updErr } = await supabaseClient
            .from(tableName)
            .update({ prices: prices, updated_at: new Date().toISOString() })
            .eq('id', row.id);
        if (updErr) throw updErr;
    }
}

async function applyRecommendedPriceToSalesmen(productName, recommendedPrice, onlyEmails) {
    let query = supabaseClient
        .from('salesman_price_sheets')
        .select('id, prices, salesman_email');
    if (Array.isArray(onlyEmails) && onlyEmails.length) {
        query = query.in('salesman_email', onlyEmails);
    }
    const { data, error } = await query;
    if (error) throw error;

    let count = 0;
    const have = new Set((data || []).map(r => (r.salesman_email || '').toLowerCase().trim()));

    for (const row of (data || [])) {
        const prices = row.prices && typeof row.prices === 'object' ? { ...row.prices } : {};
        prices[productName] = recommendedPrice;
        const { error: updErr } = await supabaseClient
            .from('salesman_price_sheets')
            .update({ prices: prices, updated_at: new Date().toISOString() })
            .eq('id', row.id);
        if (updErr) throw updErr;
        count += 1;
    }

    if (Array.isArray(onlyEmails)) {
        for (const email of onlyEmails) {
            if (have.has(email)) continue;
            const salesman = (salesmen || []).find(s => (s.email || '').toLowerCase().trim() === email);
            const { error: insErr } = await supabaseClient
                .from('salesman_price_sheets')
                .insert({
                    salesman_email: email,
                    salesman_name: salesman ? (salesman.name || email) : email,
                    prices: { [productName]: recommendedPrice }
                });
            if (insErr) throw insErr;
            count += 1;
        }
    }
    return count;
}

async function assignProductToSalesmen(productName, emails) {
    for (const email of emails) {
        const { data, error } = await supabaseClient
            .from('salesmen')
            .select('id, assigned_products')
            .eq('email', email)
            .maybeSingle();
        if (error) throw error;
        if (!data) continue;
        let list = [];
        if (Array.isArray(data.assigned_products)) list = data.assigned_products.slice();
        else if (typeof data.assigned_products === 'string') {
            try { list = JSON.parse(data.assigned_products); } catch (e) { list = []; }
        }
        if (!list.includes(productName)) list.push(productName);
        const { error: updErr } = await supabaseClient
            .from('salesmen')
            .update({ assigned_products: list, updated_at: new Date().toISOString() })
            .eq('id', data.id);
        if (updErr) throw updErr;
    }
}

async function saveBasePriceSheetEdits() {
    const rows = document.querySelectorAll('#base-price-sheet-list tr.bps-row');
    if (!rows.length) return;

    const updates = [];
    const usedNames = new Set();

    rows.forEach(row => {
        const id = row.getAttribute('data-id') || '';
        const oldName = row.getAttribute('data-name') || '';
        const nameEl = row.querySelector('.bps-name');
        const caseEl = row.querySelector('.bps-case');
        const priceEl = row.querySelector('.bps-price');
        if (!id || !caseEl || !priceEl) return;

        const newName = (nameEl ? nameEl.value : oldName).trim();
        const caseSize = (caseEl.value || '').trim();
        const unitPrice = parseFloat(priceEl.value);
        if (!newName) return;
        if (Number.isNaN(unitPrice) || unitPrice < 0) return;

        const nameKey = newName.toLowerCase();
        if (usedNames.has(nameKey)) {
            updates.push({ conflict: newName });
            return;
        }
        usedNames.add(nameKey);

        const item = (PRODUCT_CATALOG || []).find(p => p.id === id || p.name === oldName);
        const oldCase = item ? (item.caseSize || '') : '';
        const oldPrice = item && item.unitPrice != null ? Number(item.unitPrice) : null;
        const nameChanged = newName !== oldName;
        const caseChanged = caseSize !== oldCase;
        const priceChanged = oldPrice !== unitPrice;
        if (!nameChanged && !caseChanged && !priceChanged) return;

        updates.push({
            id,
            oldName,
            newName,
            caseSize,
            unitPrice,
            nameChanged,
            priceChanged
        });
    });

    if (updates.some(u => u.conflict)) {
        alert('Two products cannot have the same name.');
        return;
    }
    if (updates.length === 0) {
        alert('No changes to save.');
        return;
    }

    const otherNames = (PRODUCT_CATALOG || [])
        .filter(p => !updates.some(u => u.id === p.id))
        .map(p => (p.name || '').toLowerCase());
    const dup = updates.find(u => otherNames.includes(u.newName.toLowerCase()));
    if (dup) {
        alert('A product named "' + dup.newName + '" already exists.');
        return;
    }

    const saveBtn = document.getElementById('bps-save-btn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving…';
    }

    try {
        const nowIso = new Date().toISOString();
        let sheetsTouched = 0;

        for (const u of updates) {
            const payload = {
                name: u.newName,
                case_size: u.caseSize || null,
                unit_price: u.unitPrice,
                updated_at: nowIso
            };
            const { error } = await supabaseClient
                .from('products')
                .update(payload)
                .eq('id', u.id);
            if (error) throw error;

            if (u.nameChanged) {
                await renamePriceSheetKeys('salesman_price_sheets', u.oldName, u.newName);
                await renamePriceSheetKeys('customer_price_sheets', u.oldName, u.newName);
                try {
                    await supabaseClient
                        .from('inventory')
                        .update({ product_name: u.newName })
                        .eq('product_name', u.oldName);
                } catch (invErr) {
                    console.warn('inventory rename skipped:', invErr);
                }
            }

            if (u.priceChanged) {
                sheetsTouched += await applyRecommendedPriceToSalesmen(u.newName, u.unitPrice);
            }

            const item = (PRODUCT_CATALOG || []).find(p => p.id === u.id || p.name === u.oldName);
            if (item) {
                item.name = u.newName;
                item.caseSize = u.caseSize;
                item.unitPrice = u.unitPrice;
                item.updatedAt = nowIso;
                item.priceAsOf = formatBpsEditedAt(nowIso);
            }
        }

        basePriceSheetEditMode = false;
        const editBtn = document.getElementById('bps-edit-btn');
        if (editBtn) editBtn.textContent = 'Edit';
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
            saveBtn.classList.add('hidden');
        }
        renderBasePriceSheet();

        if (typeof logAdminActivity === 'function') {
            logAdminActivity({
                action: 'edit',
                entityType: 'base_sheet',
                entityLabel: 'Company Base Price Sheet',
                summary: 'Saved ' + updates.length + ' product(s)'
            });
        }
        const nameCount = updates.filter(u => u.nameChanged).length;
        const priceCount = updates.filter(u => u.priceChanged).length;
        alert(
            'Saved ' + updates.length + ' product(s).' +
            (nameCount ? '\nRenamed ' + nameCount + ' product(s) on salesman and customer sheets.' : '') +
            (priceCount ? '\nRecommended price written to salesman sheets.' : '')
        );
    } catch (err) {
        console.error('saveBasePriceSheetEdits error:', err);
        if (typeof logAdminActivity === 'function') {
            logAdminActivity({
                action: 'edit',
                entityType: 'base_sheet',
                entityLabel: 'Company Base Price Sheet',
                result: 'failed',
                error: err.message || String(err)
            });
        }
        alert('Could not save.\n' + (err.message || ''));
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
        }
    }
}

async function updateSalesmanSheetsFromMaster() {
    if (!confirm(
        'Update salesman sheets from the Master?\n\n' +
        'This writes current Master prices onto every salesman sheet for matching product names.\n' +
        'Customer specials / locked prices are NOT changed.\n\n' +
        'Continue?'
    )) return;

    const btn = document.getElementById('bps-update-salesmen-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Updating…'; }

    try {
        // Load Master prices
        const { data: products, error: pErr } = await supabaseClient
            .from('products')
            .select('name, unit_price')
            .eq('active', true);
        if (pErr) throw pErr;
        const master = {};
        (products || []).forEach(function (p) {
            if (p && p.name && p.unit_price != null) master[p.name] = Number(p.unit_price);
        });

        // Load all salesman sheets
        const { data: sheets, error: sErr } = await supabaseClient
            .from('salesman_price_sheets')
            .select('id, salesman_email, prices');
        if (sErr) throw sErr;

        let updated = 0;
        for (const sheet of (sheets || [])) {
            const prices = Object.assign({}, sheet.prices || {});
            let changed = false;
            Object.keys(prices).forEach(function (name) {
                if (master.hasOwnProperty(name) && Number(prices[name]) !== master[name]) {
                    prices[name] = master[name];
                    changed = true;
                }
            });
            if (!changed) continue;
            const { error } = await supabaseClient
                .from('salesman_price_sheets')
                .update({ prices: prices, updated_at: new Date().toISOString() })
                .eq('id', sheet.id);
            if (error) console.warn('Failed', sheet.salesman_email, error);
            else updated++;
        }

        alert('Updated ' + updated + ' salesman sheet(s) from the Master.\nCustomer specials were left unchanged.');
    } catch (err) {
        console.error(err);
        alert('Could not update salesman sheets.\n' + (err.message || ''));
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Update Salesman Sheets'; }
    }
}

// Call this whenever a brand-new product name is added on a salesman sheet
// so the Master catalog stays complete.
async function ensureProductOnMaster(name, price, category) {
    const cleanName = String(name || '').trim();
    if (!cleanName) return;
    const { data: existing } = await supabaseClient
        .from('products')
        .select('id')
        .eq('name', cleanName)
        .maybeSingle();
    if (existing) return; // already on Master
    await supabaseClient.from('products').insert({
        name: cleanName,
        category: category || 'Other',
        unit_price: price != null ? Number(price) : 0,
        active: true
    });
}


function printBasePriceSheet() {
    if (typeof PRODUCT_CATALOG === 'undefined' || !PRODUCT_CATALOG.length) {
        alert('Product catalog not loaded.');
        return;
    }

    const search = (document.getElementById('base-price-sheet-search')?.value || '').toLowerCase().trim();
    const filtered = PRODUCT_CATALOG.filter(p => {
        if (!search) return true;
        return (p.name || '').toLowerCase().includes(search) ||
               (p.category || '').toLowerCase().includes(search) ||
               (p.subCategory || '').toLowerCase().includes(search);
    });

    const grouped = {};
    filtered.forEach(p => {
        const cat = p.category || 'Other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(p);
    });

    const categories = Object.keys(grouped).sort();
    const today = new Date().toLocaleDateString();

    let body = '';
    categories.forEach(cat => {
        body += `<h2 style="margin:18px 0 6px;font-size:15px;color:#1E4D2B;border-bottom:1px solid #1E4D2B;padding-bottom:3px;">${cat}</h2>`;
        body += `<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:10px;">
            <thead>
                <tr style="background:#1E4D2B;color:#d4b78f;">
                    <th style="padding:6px 8px;text-align:left;border:1px solid #999;">Product</th>
                    <th style="padding:6px 8px;text-align:left;border:1px solid #999;width:90px;">Case Size</th>
                    <th style="padding:6px 8px;text-align:right;border:1px solid #999;width:90px;">Unit Price</th>
                    <th style="padding:6px 8px;text-align:center;border:1px solid #999;width:90px;">As Of</th>
                </tr>
            </thead>
            <tbody>`;
        grouped[cat].forEach(p => {
            const price = p.unitPrice != null ? ('$' + Number(p.unitPrice).toFixed(2)) : '—';
            const market = p.isMarketPrice ? ' (Market)' : '';
            body += `<tr>
                <td style="padding:5px 8px;border:1px solid #ccc;">${p.name || '—'}${market}</td>
                <td style="padding:5px 8px;border:1px solid #ccc;">${p.caseSize || '—'}</td>
                <td style="padding:5px 8px;border:1px solid #ccc;text-align:right;font-weight:600;">${price}</td>
                <td style="padding:5px 8px;border:1px solid #ccc;text-align:center;">${p.priceAsOf || '—'}</td>
            </tr>`;
        });
        body += `</tbody></table>`;
    });

    const html = `<!DOCTYPE html>
<html>
<head>
    <title>Company Base Price Sheet – Donegal Natural</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 24px; color: #222; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
        .company { font-size: 20px; font-weight: bold; color: #1E4D2B; }
        .title { font-size: 18px; font-weight: bold; text-align: right; }
        .meta { font-size: 12px; margin-top: 4px; color: #555; }
        hr { border: none; border-top: 2px solid #1E4D2B; margin: 12px 0; }
        .footer { margin-top: 28px; text-align: center; font-size: 11px; color: #666; }
        @media print { body { margin: 12px; } }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="company">Donegal Natural Dog Treats</div>
            <div class="meta">258 W Front St · Marietta, PA 17547</div>
            <div class="meta">(800) 223-0017</div>
        </div>
        <div class="title">
            COMPANY BASE PRICE SHEET
            <div class="meta">Printed: ${today}</div>
            <div class="meta">${filtered.length} products</div>
        </div>
    </div>
    <hr>
    ${body}
    <div class="footer">Donegal Natural Dog Treats — Internal Use Only · Base prices as of catalog</div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) {
        alert('Please allow pop-ups to print the price sheet.');
        return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 350);
}

function exportBasePriceSheetExcel() {
    if (typeof PRODUCT_CATALOG === 'undefined' || !PRODUCT_CATALOG.length) {
        alert('Product catalog not loaded.');
        return;
    }
    if (typeof XLSX === 'undefined') {
        alert('Excel library not loaded.');
        return;
    }

    const rows = PRODUCT_CATALOG.map(p => ({
        Category: p.category || '',
        'Sub Category': p.subCategory || '',
        Product: p.name || '',
        'Case Size': p.caseSize || '',
        'Unit Price': p.unitPrice != null ? Number(p.unitPrice) : '',
        'Market Price': p.isMarketPrice ? 'Yes' : 'No',
        'Market Note': p.marketPriceNote || '',
        'Price As Of': p.priceAsOf || ''
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Base Price Sheet');
    XLSX.writeFile(wb, `Company_Base_Price_Sheet_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ================== BULK % ADJUSTMENTS ==================
let bulkPctSalesmanEmail = null;
let bulkPctSalesmanName = null;
let bulkPctCurrentPrices = {};   // product → current salesman price
let bulkPctCustomCustomerCounts = {}; // product → number of customers with different price

async function openBulkPercentAdjustModal() {
    const modal = document.getElementById('bulk-percent-adjust-modal');
    if (!modal) return;

    // Ensure salesmen are loaded
    if (!Array.isArray(salesmen) || salesmen.length === 0) {
        if (typeof loadSalesmen === 'function') await loadSalesmen();
    }

    const select = document.getElementById('bulk-pct-salesman');
    if (select) {
        const active = (salesmen || []).filter(s => s.active !== false && (s.email || '').trim());
        select.innerHTML = '<option value="">— Choose an active salesman —</option>' +
            active.map(s => {
                const name = s.name || [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email;
                const email = (s.email || '').toLowerCase().trim();
            return `<option value="${escapeHtml(email)}">${escapeHtml(name)}${s.territory ? ' — ' + escapeHtml(s.territory) : ''}</option>`;
            }).join('');
    }

    // Reset state
    bulkPctSalesmanEmail = null;
    bulkPctSalesmanName = null;
    bulkPctCurrentPrices = {};
    bulkPctCustomCustomerCounts = {};
    document.getElementById('bulk-pct-controls')?.classList.add('hidden');
    document.getElementById('bulk-pct-table-wrap')?.classList.add('hidden');
    const valEl = document.getElementById('bulk-pct-value');
    if (valEl) valEl.value = '0';
    const confirmBtn = document.getElementById('bulk-pct-confirm-btn');
    if (confirmBtn) confirmBtn.disabled = true;

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

function hideBulkPercentAdjustModal() {
    const modal = document.getElementById('bulk-percent-adjust-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.style.display = 'none';
}

async function onBulkPercentSalesmanChange() {
    const select = document.getElementById('bulk-pct-salesman');
    const email = (select?.value || '').toLowerCase().trim();
    if (!email) {
        document.getElementById('bulk-pct-controls')?.classList.add('hidden');
        document.getElementById('bulk-pct-table-wrap')?.classList.add('hidden');
        const confirmBtn = document.getElementById('bulk-pct-confirm-btn');
        if (confirmBtn) confirmBtn.disabled = true;
        return;
    }

    bulkPctSalesmanEmail = email;
    const salesman = (salesmen || []).find(s => (s.email || '').toLowerCase().trim() === email);
    bulkPctSalesmanName = salesman
        ? (salesman.name || [salesman.firstName, salesman.lastName].filter(Boolean).join(' ') || email)
        : email;

    const tbody = document.getElementById('bulk-pct-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-[#6B4423]"><i class="fas fa-spinner fa-spin mr-2"></i>Loading sheet…</td></tr>';
    document.getElementById('bulk-pct-controls')?.classList.remove('hidden');
    document.getElementById('bulk-pct-table-wrap')?.classList.remove('hidden');

    try {
        // Load salesman sheet
        const { data: sheet } = await supabaseClient
            .from('salesman_price_sheets')
            .select('prices')
            .eq('salesman_email', email)
            .maybeSingle();

        bulkPctCurrentPrices = (sheet && sheet.prices && typeof sheet.prices === 'object')
            ? { ...sheet.prices }
            : {};

        // Count customers who have a custom price different from this salesman’s sheet
        bulkPctCustomCustomerCounts = {};
        const { data: custSheets } = await supabaseClient
            .from('customer_price_sheets')
            .select('customer_id, prices')
            .eq('salesman_email', email);

        (custSheets || []).forEach(cs => {
            if (!cs.prices || typeof cs.prices !== 'object') return;
            Object.keys(cs.prices).forEach(prod => {
                const custPrice = Number(cs.prices[prod]);
                const salesPrice = bulkPctCurrentPrices[prod] != null
                    ? Number(bulkPctCurrentPrices[prod])
                    : null;
                if (salesPrice != null && !isNaN(custPrice) && Math.abs(custPrice - salesPrice) > 0.001) {
                    bulkPctCustomCustomerCounts[prod] = (bulkPctCustomCustomerCounts[prod] || 0) + 1;
                }
            });
        });

        renderBulkPercentTable();
        previewBulkPercentAdjust();
        if (typeof populateBulkPercentStoreSelect === 'function') populateBulkPercentStoreSelect();
        if (typeof updateBulkPercentApplyLabel === 'function') updateBulkPercentApplyLabel();
    } catch (err) {
        console.error('onBulkPercentSalesmanChange error:', err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-red-600">Could not load sheet.<br>${err.message || ''}</td></tr>`;
    }
}

function populateBulkPercentStoreSelect() {
    const sel = document.getElementById('bulk-pct-store');
    if (!sel) return;
    const email = String(bulkPctSalesmanEmail || '').toLowerCase().trim();
    const previous = String(sel.value || '');
    const rows = (allCustomers || []).filter(function (c) {
        if (!c || !c.id) return false;
        if (typeof isHiddenTestCustomer === 'function' && isHiddenTestCustomer(c)) return false;
        const salesman = String(c.salesmanEmail || c.salesman_email || '').toLowerCase().trim();
        return !!email && salesman === email;
    }).sort(function (a, b) {
        const la = String(a.company || a.name || '').toLowerCase();
        const lb = String(b.company || b.name || '').toLowerCase();
        return la.localeCompare(lb);
    });
    sel.innerHTML = '<option value="">— Salesman sheet only —</option>' + rows.map(function (c) {
        const label = (c.company || c.name || 'Store') + (c.name && c.company ? (' — ' + c.name) : '');
        return '<option value="' + escapeHtml(String(c.id)) + '"' +
            (String(c.id) === previous ? ' selected' : '') + '>' +
            escapeHtml(label) + '</option>';
    }).join('');
}

function updateBulkPercentApplyLabel() {
    const storeId = String(document.getElementById('bulk-pct-store')?.value || '');
    const label = storeId ? 'Apply to This Store' : 'Apply to Salesman Sheet';
    ['bulk-pct-confirm-btn', 'bulk-pct-confirm-btn-top'].forEach(function (id) {
        const btn = document.getElementById(id);
        if (btn && !btn.disabled) btn.textContent = label;
        else if (btn) btn.textContent = label;
    });
}

async function onBulkPercentStoreChange() {
    updateBulkPercentApplyLabel();
    const storeId = String(document.getElementById('bulk-pct-store')?.value || '');
    if (!storeId) {
        if (bulkPctSalesmanEmail && typeof onBulkPercentSalesmanChange === 'function') {
            return onBulkPercentSalesmanChange();
        }
        return;
    }
    try {
        const { data: custSheet } = await supabaseClient
            .from('customer_price_sheets')
            .select('prices')
            .eq('customer_id', storeId)
            .maybeSingle();
        if (custSheet && custSheet.prices && typeof custSheet.prices === 'object' && Object.keys(custSheet.prices).length) {
            bulkPctCurrentPrices = Object.assign({}, custSheet.prices);
        }
        renderBulkPercentTable();
        previewBulkPercentAdjust();
    } catch (err) {
        console.warn('onBulkPercentStoreChange:', err);
    }
}

function renderBulkPercentTable() {
    const tbody = document.getElementById('bulk-pct-tbody');
    if (!tbody) return;

    const sheet = bulkPctCurrentPrices && typeof bulkPctCurrentPrices === 'object'
        ? bulkPctCurrentPrices
        : {};
    const names = Object.keys(sheet).filter(function (name) {
        if (!name) return false;
        const n = Number(sheet[name]);
        if (isNaN(n)) return false;
        const catalogItem = (typeof PRODUCT_CATALOG !== 'undefined')
            ? PRODUCT_CATALOG.find(function (p) { return p.name === name; })
            : null;
        if (catalogItem && catalogItem.isMarketPrice) return false;
        return true;
    }).sort(function (a, b) { return a.localeCompare(b); });

    if (!names.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-[#6B4423]">No products on this salesman / store sheet.</td></tr>';
        return;
    }

    const products = names.map(function (name) {
        const catalogItem = (typeof PRODUCT_CATALOG !== 'undefined')
            ? PRODUCT_CATALOG.find(function (p) { return p.name === name; })
            : null;
        return {
            name: name,
            category: (catalogItem && catalogItem.category) || 'Other',
            caseSize: (catalogItem && catalogItem.caseSize) || '',
            unitPrice: catalogItem ? Number(catalogItem.unitPrice) || 0 : Number(sheet[name]) || 0
        };
    });

    const byCat = {};
    products.forEach(function (p) {
        const cat = p.category || 'Uncategorized';
        if (!byCat[cat]) byCat[cat] = [];
        byCat[cat].push(p);
    });

    const catNames = Object.keys(byCat).sort();
    let html = '';
    let rowIndex = 0;

    catNames.forEach(function (cat) {
        const list = byCat[cat];
        const safeCat = String(cat).replace(/"/g, '&quot;');
        html += `
            <tr class="bg-[#1E4D2B] text-[#d4b78f]" data-bulk-cat="${safeCat}">
                <td class="p-2 text-center">
                    <input type="checkbox" class="bulk-pct-cat-cb accent-[#d4b78f]"
                           data-cat="${safeCat}"
                           onchange="toggleBulkPercentCategory(this)">
                </td>
                <td class="p-2 font-bold" colspan="6">${escapeHtml(cat)} · ${list.length} item${list.length === 1 ? '' : 's'}</td>
            </tr>
        `;
        list.forEach(function (p) {
            const catalog = Number(p.unitPrice) || 0;
            const current = Number(sheet[p.name]);
            const delta = catalog > 0 ? ((current - catalog) / catalog * 100) : 0;
            const deltaText = (delta >= 0 ? '+' : '') + delta.toFixed(1) + '%';
            const deltaClass = Math.abs(delta) > 0.05
                ? (delta > 0 ? 'text-green-700' : 'text-red-700')
                : 'text-[#6B4423]';
            const alreadyAdjusted = Math.abs(current - catalog) > 0.001;
            const custCount = bulkPctCustomCustomerCounts[p.name] || 0;
            const safeName = p.name.replace(/"/g, '&quot;').replace(/'/g, "\\'");
            html += `
                <tr class="border-t border-[#e8d9b8] ${rowIndex % 2 ? 'bg-[#f8f4eb]' : 'bg-white'}"
                    data-product="${safeName}" data-cat="${safeCat}">
                    <td class="p-2 text-center">
                        <input type="checkbox" class="bulk-pct-cb accent-[#1E4D2B]"
                               data-product="${safeName}" data-cat="${safeCat}"
                               onchange="updateBulkPercentSelectedCount(); previewBulkPercentAdjust();">
                    </td>
                    <td class="p-2">
                        <span class="font-medium">${escapeHtml(p.name)}</span>
                        ${alreadyAdjusted ? '<span class="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-800">adjusted</span>' : ''}
                        ${p.caseSize ? `<span class="block text-xs text-[#6B4423]">${escapeHtml(p.caseSize)}</span>` : ''}
                    </td>
                    <td class="p-2 text-right">$${catalog.toFixed(2)}</td>
                    <td class="p-2 text-right font-semibold">$${current.toFixed(2)}</td>
                    <td class="p-2 text-right bulk-pct-delta ${deltaClass}">${deltaText}</td>
                    <td class="p-2 text-right font-semibold bulk-pct-new-price">—</td>
                    <td class="p-2 text-center">
                        ${custCount > 0
                            ? `<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">${custCount}</span>`
                            : '<span class="text-[#6B4423]">—</span>'}
                    </td>
                </tr>
            `;
            rowIndex++;
        });
    });

    tbody.innerHTML = html;
    updateBulkPercentSelectedCount();
}

function toggleBulkPercentSelectAll() {
    const master = document.getElementById('bulk-pct-select-all');
    const checked = master?.checked === true;
    document.querySelectorAll('.bulk-pct-cb').forEach(cb => { cb.checked = checked; });
    document.querySelectorAll('.bulk-pct-cat-cb').forEach(cb => { cb.checked = checked; });
    updateBulkPercentSelectedCount();
    previewBulkPercentAdjust();
}

function toggleBulkPercentCategory(master) {
    const cat = master.getAttribute('data-cat');
    const checked = master.checked === true;
    document.querySelectorAll('.bulk-pct-cb[data-cat="' + cat + '"]').forEach(cb => {
        cb.checked = checked;
    });
    updateBulkPercentSelectedCount();
    previewBulkPercentAdjust();
}

function updateBulkPercentSelectedCount() {
    const checked = document.querySelectorAll('.bulk-pct-cb:checked').length;
    const total = document.querySelectorAll('.bulk-pct-cb').length;
    const el = document.getElementById('bulk-pct-selected-count');
    if (el) el.textContent = checked > 0 ? `${checked} of ${total} selected` : '';
    ['bulk-pct-confirm-btn', 'bulk-pct-confirm-btn-top'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = total === 0;
    });
    if (typeof updateBulkPercentApplyLabel === 'function') updateBulkPercentApplyLabel();
}

function previewBulkPercentAdjust() {
    const pct = parseFloat(document.getElementById('bulk-pct-value')?.value) || 0;
    const factor = 1 + (pct / 100);

    document.querySelectorAll('#bulk-pct-tbody tr[data-product]').forEach(row => {
        const product = row.getAttribute('data-product');
        const cb = row.querySelector('.bulk-pct-cb');
        const newCell = row.querySelector('.bulk-pct-new-price');
        const deltaCell = row.querySelector('.bulk-pct-delta');
        if (!newCell) return;

        const catalogItem = (PRODUCT_CATALOG || []).find(p => p.name === product);
        const catalog = catalogItem ? Number(catalogItem.unitPrice) || 0 : 0;
        const current = bulkPctCurrentPrices[product] != null
            ? Number(bulkPctCurrentPrices[product])
            : catalog;

        if (!cb || !cb.checked || pct === 0) {
            newCell.textContent = '—';
            newCell.classList.remove('text-green-700', 'text-red-700');
            if (deltaCell) {
                const baseDelta = catalog > 0 ? ((current - catalog) / catalog * 100) : 0;
                deltaCell.textContent = (baseDelta >= 0 ? '+' : '') + baseDelta.toFixed(1) + '%';
                deltaCell.classList.remove('text-green-700', 'text-red-700');
                if (Math.abs(baseDelta) > 0.05) {
                    deltaCell.classList.add(baseDelta > 0 ? 'text-green-700' : 'text-red-700');
                }
            }
            return;
        }

        const newPrice = Math.round(current * factor * 100) / 100;
        newCell.textContent = '$' + newPrice.toFixed(2);
        newCell.classList.remove('text-green-700', 'text-red-700');
        if (newPrice > current) newCell.classList.add('text-green-700');
        else if (newPrice < current) newCell.classList.add('text-red-700');

        if (deltaCell) {
            const liveDelta = current > 0 ? ((newPrice - current) / current * 100) : pct;
            deltaCell.textContent = (liveDelta >= 0 ? '+' : '') + liveDelta.toFixed(1) + '%';
            deltaCell.classList.remove('text-green-700', 'text-red-700');
            if (liveDelta > 0.05) deltaCell.classList.add('text-green-700');
            else if (liveDelta < -0.05) deltaCell.classList.add('text-red-700');
        }
    });
}

async function confirmBulkPercentAdjust() {
    if (!bulkPctSalesmanEmail) {
        alert('Select a salesman first.');
        return;
    }

    const pct = parseFloat(document.getElementById('bulk-pct-value')?.value) || 0;
    if (pct === 0) {
        alert('Enter a non-zero percentage.');
        return;
    }

    let checked = Array.from(document.querySelectorAll('.bulk-pct-cb:checked'));
    if (!checked.length) {
        checked = Array.from(document.querySelectorAll('.bulk-pct-cb'));
    }
    if (!checked.length) {
        alert('No products on this sheet to adjust.');
        return;
    }

    const storeId = String(document.getElementById('bulk-pct-store')?.value || '');
    let store = storeId
        ? (allCustomers || []).find(function (c) { return String(c.id) === storeId; })
        : null;
    if (storeId && !store) {
        if (typeof loadCustomers === 'function') await loadCustomers();
        store = (allCustomers || []).find(function (c) { return String(c.id) === storeId; }) || null;
    }
    if (storeId && !store) {
        const { data: storeRow, error: storeErr } = await supabaseClient
            .from('customers')
            .select('id, name, company, email, salesman_email')
            .eq('id', storeId)
            .maybeSingle();
        if (storeErr) throw storeErr;
        store = storeRow || null;
    }
    if (storeId && !store) {
        alert('Could not load that store. Close Bulk % and open it again.');
        return;
    }

    const factor = 1 + (pct / 100);
    const updates = {};
    checked.forEach(function (cb) {
        const product = cb.getAttribute('data-product');
        if (!product) return;
        const catalogItem = (PRODUCT_CATALOG || []).find(function (p) { return p.name === product; });
        const catalog = catalogItem ? Number(catalogItem.unitPrice) || 0 : 0;
        const current = bulkPctCurrentPrices[product] != null
            ? Number(bulkPctCurrentPrices[product])
            : catalog;
        const newPrice = Math.round(current * factor * 100) / 100;
        updates[product] = newPrice;
    });

    const productCount = Object.keys(updates).length;
    const direction = pct > 0 ? 'increase' : 'decrease';
    const targetLabel = store
        ? ((store.company || store.name || 'store') + ' customer sheet')
        : (bulkPctSalesmanName + "'s salesman sheet");
    if (!confirm(
        'Apply ' + (pct > 0 ? '+' : '') + pct + '% ' + direction + ' to ' + productCount +
        ' product(s) on ' + targetLabel + '?\n\n' +
        (store
            ? 'Only this store’s customer price sheet will change.'
            : 'This writes only to the salesman sheet.\nCustomer sheets will not change.')
    )) return;

    ['bulk-pct-confirm-btn', 'bulk-pct-confirm-btn-top'].forEach(function (id) {
        const btn = document.getElementById(id);
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Saving…';
        }
    });

    try {
        if (store && store.id) {
            const { data: prevSheet, error: prevErr } = await supabaseClient
                .from('customer_price_sheets')
                .select('prices, display_names, salesman_email')
                .eq('customer_id', store.id)
                .maybeSingle();
            if (prevErr) throw prevErr;
            const nextPrices = Object.assign({}, (prevSheet && prevSheet.prices) || bulkPctCurrentPrices || {}, updates);
            const payload = {
                customer_id: store.id,
                salesman_email: bulkPctSalesmanEmail || (prevSheet && prevSheet.salesman_email) || null,
                prices: nextPrices,
                updated_at: new Date().toISOString()
            };
            if (prevSheet && prevSheet.display_names && typeof prevSheet.display_names === 'object') {
                payload.display_names = prevSheet.display_names;
            }
            const { error: custErr } = await supabaseClient
                .from('customer_price_sheets')
                .upsert(payload, { onConflict: 'customer_id' });
            if (custErr) throw custErr;
            if (typeof logAdminActivity === 'function') {
                logAdminActivity({
                    action: 'edit',
                    entityType: 'customer_sheet',
                    entityLabel: targetLabel,
                    summary: (pct > 0 ? '+' : '') + pct + '% on ' + productCount + ' item(s)'
                });
            }
            alert('Done. ' + productCount + ' product(s) updated on ' + targetLabel + '.');
            hideBulkPercentAdjustModal();
            return;
        }

        const { data: existing } = await supabaseClient
            .from('salesman_price_sheets')
            .select('id, prices')
            .eq('salesman_email', bulkPctSalesmanEmail)
            .maybeSingle();
        const merged = Object.assign({}, (existing && existing.prices) || {}, updates);
        if (existing) {
            const { error } = await supabaseClient
                .from('salesman_price_sheets')
                .update({
                    prices: merged,
                    salesman_name: bulkPctSalesmanName,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient
                .from('salesman_price_sheets')
                .insert({
                    salesman_email: bulkPctSalesmanEmail,
                    salesman_name: bulkPctSalesmanName,
                    prices: merged
                });
            if (error) throw error;
        }
        alert('Done. ' + productCount + ' product(s) updated on ' + bulkPctSalesmanName + "'s sheet.");
        hideBulkPercentAdjustModal();
    } catch (err) {
        console.error('confirmBulkPercentAdjust error:', err);
        alert('Could not save changes.\n' + (err.message || ''));
        ['bulk-pct-confirm-btn', 'bulk-pct-confirm-btn-top'].forEach(function (id) {
            const btn = document.getElementById(id);
            if (btn) {
                btn.disabled = false;
                btn.textContent = store ? 'Apply to This Store' : 'Apply to Salesman Sheet';
            }
        });
    }
}
// ================== END BULK % ADJUSTMENTS ==================

window.toggleBasePriceSheetEdit = toggleBasePriceSheetEdit;
window.formatBpsEditedAt = formatBpsEditedAt;
window.onBpsShowDiscontinuedChange = onBpsShowDiscontinuedChange;
window.bpsSelectAll = bpsSelectAll;
window.updateBpsSelectedCount = updateBpsSelectedCount;
window.getBpsSelectedIds = getBpsSelectedIds;
window.removePriceSheetKeys = removePriceSheetKeys;
window.markSelectedProductsOutOfStock = markSelectedProductsOutOfStock;
window.discontinueSelectedProducts = discontinueSelectedProducts;
window.reactivateSelectedProducts = reactivateSelectedProducts;
window.deleteSelectedProductsPermanently = deleteSelectedProductsPermanently;
window.openBasePriceSheetModal = openBasePriceSheetModal;
window.hideBasePriceSheetModal = hideBasePriceSheetModal;
window.renderBasePriceSheet = renderBasePriceSheet;
window.renamePriceSheetKeys = renamePriceSheetKeys;
window.applyRecommendedPriceToSalesmen = applyRecommendedPriceToSalesmen;
window.assignProductToSalesmen = assignProductToSalesmen;
window.saveBasePriceSheetEdits = saveBasePriceSheetEdits;
window.updateSalesmanSheetsFromMaster = updateSalesmanSheetsFromMaster;
window.ensureProductOnMaster = ensureProductOnMaster;
window.printBasePriceSheet = printBasePriceSheet;
window.exportBasePriceSheetExcel = exportBasePriceSheetExcel;
window.openBulkPercentAdjustModal = openBulkPercentAdjustModal;
window.hideBulkPercentAdjustModal = hideBulkPercentAdjustModal;
window.onBulkPercentSalesmanChange = onBulkPercentSalesmanChange;
window.populateBulkPercentStoreSelect = populateBulkPercentStoreSelect;
window.updateBulkPercentApplyLabel = updateBulkPercentApplyLabel;
window.onBulkPercentStoreChange = onBulkPercentStoreChange;
window.renderBulkPercentTable = renderBulkPercentTable;
window.toggleBulkPercentSelectAll = toggleBulkPercentSelectAll;
window.toggleBulkPercentCategory = toggleBulkPercentCategory;
window.updateBulkPercentSelectedCount = updateBulkPercentSelectedCount;
window.previewBulkPercentAdjust = previewBulkPercentAdjust;
window.confirmBulkPercentAdjust = confirmBulkPercentAdjust;
