// Internal portal — inventory load, edit, receive, and stock status.
// inventoryLoadedAt stays global in internal-portal.js.
// inventory and INVENTORY_CATEGORY_ORDER are global because other portal code reads them.
// ================== INVENTORY ==================
function addNewProductCategory() {
    const raw = prompt('New category name:');
    if (raw === null) return;
    const cat = raw.trim();
    if (!cat) return;
    const list = document.getElementById('new-product-category-list');
    if (list && !Array.from(list.options).some(o => o.value === cat)) {
        const opt = document.createElement('option');
        opt.value = cat;
        list.appendChild(opt);
    }
    document.querySelectorAll('#new-product-rows .new-product-row').forEach(function (row) {
        renderNewProductCategoryBoxes(row);
        const cb = Array.from(row.querySelectorAll('[data-np-cat-cb]')).find(function (el) {
            return el.value === cat;
        });
        if (cb) cb.checked = true;
        fillNewProductSubcategorySelect(row);
    });
}

function knownAddProductCategories() {
    const set = {};
    (typeof PRODUCT_CATALOG !== 'undefined' ? PRODUCT_CATALOG : []).forEach(function (p) {
        String((p && p.category) || '').split(',').forEach(function (c) {
            c = String(c || '').trim();
            if (c) set[c] = true;
        });
    });
    const list = document.getElementById('new-product-category-list');
    if (list) {
        Array.from(list.options || []).forEach(function (o) {
            const c = String(o.value || '').trim();
            if (c) set[c] = true;
        });
    }
    return Object.keys(set).sort();
}

function knownAddProductSubcategories(cats) {
    const want = (cats || []).map(function (c) { return String(c).toLowerCase(); });
    const set = {};
    (typeof PRODUCT_CATALOG !== 'undefined' ? PRODUCT_CATALOG : []).forEach(function (p) {
        if (!p || !p.subCategory) return;
        const pc = String(p.category || '').split(',').map(function (c) {
            return c.trim().toLowerCase();
        });
        if (want.length && !want.some(function (c) { return pc.indexOf(c) !== -1; })) return;
        set[p.subCategory] = true;
    });
    return Object.keys(set).sort();
}

function selectedNewProductCategories(row) {
    return Array.from(row.querySelectorAll('[data-np-cat-cb]:checked')).map(function (cb) {
        return String(cb.value || '').trim();
    }).filter(Boolean);
}

function renderNewProductCategoryBoxes(row) {
    const box = row.querySelector('[data-np-categories]');
    if (!box) return;
    const kept = selectedNewProductCategories(row);
    box.innerHTML = knownAddProductCategories().map(function (cat) {
        const on = kept.indexOf(cat) !== -1 ? ' checked' : '';
        return '<label class="flex items-center gap-2 text-xs text-[#6B4423] cursor-pointer">' +
            '<input type="checkbox" class="accent-[#1E4D2B]" data-np-cat-cb value="' + escapeHtml(cat) + '"' + on + '>' +
            escapeHtml(cat) + '</label>';
    }).join('');
    box.querySelectorAll('[data-np-cat-cb]').forEach(function (cb) {
        cb.addEventListener('change', function () { fillNewProductSubcategorySelect(row); });
    });
    fillNewProductSubcategorySelect(row);
}

function fillNewProductSubcategorySelect(row) {
    const sel = row.querySelector('[data-np-subcategory]');
    if (!sel) return;
    const prev = sel.value;
    const cats = selectedNewProductCategories(row);
    const subs = knownAddProductSubcategories(cats);
    sel.innerHTML = '<option value="">Sub-category</option>' +
        subs.map(function (s) {
            return '<option value="' + escapeHtml(s) + '">' + escapeHtml(s) + '</option>';
        }).join('');
    if (prev && subs.indexOf(prev) !== -1) sel.value = prev;
}

function addNewProductRow() {
    const wrap = document.getElementById('new-product-rows');
    if (!wrap) return;
    const row = document.createElement('div');
    row.className = 'new-product-row border-2 border-[#d4b78f] rounded-xl p-3 space-y-2';
    row.innerHTML =
        '<div class="flex items-center justify-between">' +
            '<p class="text-xs font-semibold text-[#6B4423]">Item</p>' +
            '<button type="button" class="np-remove text-xs font-semibold text-red-700 hover:underline">Remove</button>' +
        '</div>' +
        '<input type="text" data-np-name required class="w-full border-2 border-[#6B4423] rounded-xl px-3 py-2" placeholder="Product name *">' +
        '<p class="text-xs font-semibold text-[#6B4423]">Categories (pick one or more) *</p>' +
        '<div data-np-categories class="grid grid-cols-2 md:grid-cols-3 gap-1 border-2 border-[#d4b78f] rounded-xl p-2 max-h-36 overflow-y-auto"></div>' +
        '<select data-np-subcategory class="w-full border-2 border-[#6B4423] rounded-xl px-3 py-2">' +
            '<option value="">Sub-category</option>' +
        '</select>' +
        '<div class="grid grid-cols-2 gap-3">' +
            '<input type="text" data-np-casesize class="w-full border-2 border-[#6B4423] rounded-xl px-3 py-2" placeholder="Case size">' +
            '<input type="number" data-np-price step="0.01" min="0" required class="w-full border-2 border-[#6B4423] rounded-xl px-3 py-2" placeholder="Unit price $ *">' +
        '</div>';
    row.querySelector('.np-remove').addEventListener('click', function () {
        removeNewProductRow(row);
    });
    wrap.appendChild(row);
    renderNewProductCategoryBoxes(row);
    refreshNewProductRowState();
    row.querySelector('[data-np-name]')?.focus();
}

function removeNewProductRow(row) {
    const wrap = document.getElementById('new-product-rows');
    if (!wrap || !row) return;
    if (wrap.querySelectorAll('.new-product-row').length <= 1) return;
    row.remove();
    refreshNewProductRowState();
}

function refreshNewProductRowState() {
    const rows = document.querySelectorAll('#new-product-rows .new-product-row');
    rows.forEach(function (row, i) {
        const label = row.querySelector('p');
        if (label) label.textContent = 'Item ' + (i + 1);
        const btn = row.querySelector('.np-remove');
        if (btn) btn.classList.toggle('hidden', rows.length === 1);
    });
}

function resetNewProductRows() {
    const wrap = document.getElementById('new-product-rows');
    if (!wrap) return;
    wrap.innerHTML = '';
    addNewProductRow();
}

function collectNewProductRows() {
    const rows = Array.from(document.querySelectorAll('#new-product-rows .new-product-row'));
    return rows.map(function (row, i) {
        return {
            index: i + 1,
            name: String(row.querySelector('[data-np-name]')?.value || '').trim(),
            category: selectedNewProductCategories(row).join(', '),
            subCategory: String(row.querySelector('[data-np-subcategory]')?.value || '').trim(),
            caseSize: String(row.querySelector('[data-np-casesize]')?.value || '').trim(),
            unitPrice: parseFloat(row.querySelector('[data-np-price]')?.value)
        };
    }).filter(function (item) {
        return item.name || item.category || item.caseSize || !isNaN(item.unitPrice);
    });
}

function addNewProductCategoryFromSheet() {
    const raw = prompt('New category name:');
    if (raw === null) return;
    const cat = raw.trim();
    if (!cat) return;

    openAddProductModal();

    const list = document.getElementById('new-product-category-list');
    if (list && !Array.from(list.options).some(o => o.value === cat)) {
        const opt = document.createElement('option');
        opt.value = cat;
        list.appendChild(opt);
    }
    const input = document.getElementById('new-product-category');
    if (input) input.value = cat;
}

function toggleNewProductSalesmanLimit() {
    const on = document.getElementById('new-product-limit-salesman')?.checked === true;
    const sel = document.getElementById('new-product-salesman');
    const hint = document.getElementById('new-product-salesman-hint');
    if (sel) sel.classList.toggle('hidden', !on);
    if (hint) hint.classList.toggle('hidden', !on);
}

function populateNewProductSalesmanSelect() {
    const sel = document.getElementById('new-product-salesman');
    if (!sel) return;
    const active = (salesmen || []).filter(s => s.active !== false && (s.email || '').trim());
    sel.innerHTML = active.map(s => {
        const email = (s.email || '').toLowerCase().trim();
        const name = s.name || [s.firstName, s.lastName].filter(Boolean).join(' ') || email;
        return `<option value="${email}">${name} — ${email}</option>`;
    }).join('');
}



function isSkippedAddProductStore(customer) {
    const email = String((customer && customer.email) || '').toLowerCase().trim();
    return email === 'jackerman@donegalnatural.com';
}

function getSalesmanAssignedProducts(email) {
    const want = String(email || '').toLowerCase().trim();
    const salesman = (salesmen || []).find(function (s) {
        return String(s.email || '').toLowerCase().trim() === want;
    });
    if (!salesman) return [];
    if (Array.isArray(salesman.assigned_products)) return salesman.assigned_products.slice();
    if (typeof salesman.assigned_products === 'string') {
        try {
            const parsed = JSON.parse(salesman.assigned_products);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }
    return [];
}

function mergeStoreOnlyPriceExtras(incomingPrices, existingPrices, salesmanEmail) {
    const next = Object.assign({}, incomingPrices || {});
    const assigned = getSalesmanAssignedProducts(salesmanEmail);
    if (!assigned.length || !existingPrices || typeof existingPrices !== 'object') return next;
    assigned.forEach(function (name) {
        if (!name || Object.prototype.hasOwnProperty.call(next, name)) return;
        if (existingPrices[name] == null || existingPrices[name] === '') return;
        next[name] = existingPrices[name];
    });
    return next;
}

function toggleNewProductStoreLimit() {
    const on = document.getElementById('new-product-limit-store')?.checked === true;
    const sel = document.getElementById('new-product-store');
    const hint = document.getElementById('new-product-store-hint');
    if (sel) sel.classList.toggle('hidden', !on);
    if (hint) hint.classList.toggle('hidden', !on);
    if (on) {
        const salesCb = document.getElementById('new-product-limit-salesman');
        if (salesCb && !salesCb.checked) {
            salesCb.checked = true;
            toggleNewProductSalesmanLimit();
        }
        populateNewProductStoreSelect();
    }
}

function getNewProductSelectedStoreIds() {
    return Array.from(document.getElementById('new-product-store')?.selectedOptions || [])
        .map(function (o) { return String(o.value || '').trim(); })
        .filter(Boolean);
}

function populateNewProductStoreSelect() {
    const sel = document.getElementById('new-product-store');
    if (!sel) return;
    const emails = Array.from(document.getElementById('new-product-salesman')?.selectedOptions || [])
        .map(function (o) { return String(o.value || '').toLowerCase().trim(); })
        .filter(Boolean);
    const previous = {};
    Array.from(sel.selectedOptions || []).forEach(function (o) {
        previous[String(o.value)] = true;
    });
    const rows = (allCustomers || []).filter(function (c) {
        if (!c || !c.id) return false;
        if (isSkippedAddProductStore(c)) return false;
        const salesman = String(c.salesmanEmail || c.salesman_email || '').toLowerCase().trim();
        return emails.length > 0 && emails.indexOf(salesman) !== -1;
    }).sort(function (a, b) {
        const la = String(a.company || a.name || '').toLowerCase();
        const lb = String(b.company || b.name || '').toLowerCase();
        return la.localeCompare(lb);
    });
    if (!emails.length) {
        sel.innerHTML = '<option value="" disabled>Select a salesman first</option>';
        return;
    }
    if (!rows.length) {
        sel.innerHTML = '<option value="" disabled>No stores assigned to that salesman</option>';
        return;
    }
    sel.innerHTML = rows.map(function (c) {
        const label = (c.company || c.name || 'Store') + (c.name && c.company ? (' — ' + c.name) : '');
        return '<option value="' + escapeHtml(String(c.id)) + '"' +
            (previous[String(c.id)] ? ' selected' : '') + '>' +
            escapeHtml(label) + '</option>';
    }).join('');
}

async function assignProductToStores(productName, storeIds, unitPrice) {
    const price = Number(unitPrice);
    if (!productName || !Array.isArray(storeIds) || !storeIds.length || isNaN(price) || price < 0) return;
    if (!Array.isArray(allCustomers) || !allCustomers.length) {
        if (typeof loadCustomers === 'function') await loadCustomers();
    }
    for (let i = 0; i < storeIds.length; i++) {
        const id = String(storeIds[i]);
        const customer = (allCustomers || []).find(function (c) { return String(c.id) === id; });
        if (!customer) continue;
        const salesmanEmail = String(customer.salesmanEmail || customer.salesman_email || '').toLowerCase().trim();
        const { data: existing, error } = await supabaseClient
            .from('customer_price_sheets')
            .select('prices, display_names, salesman_email')
            .eq('customer_id', id)
            .maybeSingle();
        if (error) throw error;
        let prices = {};
        let displayNames = (existing && existing.display_names && typeof existing.display_names === 'object')
            ? existing.display_names
            : {};
        if (existing && existing.prices && typeof existing.prices === 'object' && Object.keys(existing.prices).length) {
            prices = Object.assign({}, existing.prices);
        } else if (salesmanEmail) {
            const { data: salesSheet, error: salesErr } = await supabaseClient
                .from('salesman_price_sheets')
                .select('prices, display_names, hidden_prices')
                .eq('salesman_email', salesmanEmail)
                .maybeSingle();
            if (salesErr) throw salesErr;
            if (salesSheet && salesSheet.prices && typeof salesSheet.prices === 'object') {
                prices = Object.assign({}, salesSheet.prices);
                Object.keys(salesSheet.hidden_prices || {}).forEach(function (name) {
                    delete prices[name];
                });
            }
            if (!Object.keys(displayNames).length && salesSheet && salesSheet.display_names && typeof salesSheet.display_names === 'object') {
                displayNames = salesSheet.display_names;
            }
        }
        prices[productName] = price;
        const payload = {
            customer_id: id,
            salesman_email: salesmanEmail || (existing && existing.salesman_email) || null,
            prices: prices,
            updated_at: new Date().toISOString()
        };
        if (displayNames && typeof displayNames === 'object') {
            payload.display_names = displayNames;
        }
        const { error: upErr } = await supabaseClient
            .from('customer_price_sheets')
            .upsert(payload, { onConflict: 'customer_id' });
        if (upErr) throw upErr;
    }
}
function openAddProductModal() {
    const modal = document.getElementById('add-product-modal');
    if (!modal) return;

    // Clear form
    const ids = [
        'new-product-marketnote',
        'new-product-priceasof'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    resetNewProductRows();
    const marketCb = document.getElementById('new-product-ismarket');
    if (marketCb) marketCb.checked = false;
    toggleAddProductMarketFields();

    // Populate category datalist from existing catalog
    const list = document.getElementById('new-product-category-list');
    if (list && typeof PRODUCT_CATALOG !== 'undefined') {
        const cats = [...new Set(PRODUCT_CATALOG.map(p => p.category).filter(Boolean))].sort();
        list.innerHTML = cats.map(c => `<option value="${c}">`).join('');
    }

    // Default "Price As Of"
    const asOf = document.getElementById('new-product-priceasof');
    if (asOf && !asOf.value) {
        const now = new Date();
        asOf.value = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    }

    const limitCb = document.getElementById('new-product-limit-salesman');
    if (limitCb) limitCb.checked = false;
    const storeCb = document.getElementById('new-product-limit-store');
    if (storeCb) storeCb.checked = false;
    populateNewProductSalesmanSelect();
    toggleNewProductSalesmanLimit();
    if (!Array.isArray(allCustomers) || !allCustomers.length) {
        if (typeof loadCustomers === 'function') loadCustomers();
    }
    toggleNewProductStoreLimit();

    modal.classList.remove('hidden');
    document.getElementById('new-product-name')?.focus();
}

function hideAddProductModal() {
    const modal = document.getElementById('add-product-modal');
    if (modal) modal.classList.add('hidden');
}

function toggleAddProductMarketFields() {
    const cb = document.getElementById('new-product-ismarket');
    const wrap = document.getElementById('new-product-market-note-wrap');
    if (!wrap) return;
    if (cb && cb.checked) {
        wrap.classList.remove('hidden');
    } else {
        wrap.classList.add('hidden');
    }
}

async function saveNewProduct(event) {
    event.preventDefault();

    const items = collectNewProductRows();
    if (!items.length) {
        alert('Add at least one product.');
        return;
    }

    const limitTo = document.getElementById('new-product-limit-salesman')?.checked === true;
    const limitStores = document.getElementById('new-product-limit-store')?.checked === true;
    const selectedEmails = (limitTo || limitStores)
        ? Array.from(document.getElementById('new-product-salesman')?.selectedOptions || [])
            .map(function (o) { return (o.value || '').toLowerCase().trim(); })
            .filter(Boolean)
        : [];
    const selectedStoreIds = (limitStores && typeof getNewProductSelectedStoreIds === 'function')
        ? getNewProductSelectedStoreIds()
        : [];

    if ((limitTo || limitStores) && selectedEmails.length === 0) {
        alert('Select at least one salesman, or uncheck Assign to specific store(s).');
        return;
    }
    if (limitStores && selectedStoreIds.length === 0) {
        alert('Select at least one store, or uncheck Assign to specific store(s).');
        return;
    }

    const seen = {};
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.name) {
            alert('Item ' + item.index + ': product name is required.');
            return;
        }
        if (!item.category) {
            alert('Item ' + item.index + ': category is required.');
            return;
        }
        if (isNaN(item.unitPrice) || item.unitPrice < 0) {
            alert('Item ' + item.index + ': enter a valid unit price (0 or higher).');
            return;
        }
        const key = item.name.toLowerCase();
        if (seen[key]) {
            alert('Item ' + item.index + ': "' + item.name + '" is listed twice in this batch.');
            return;
        }
        seen[key] = true;
        const alreadyInCatalog = PRODUCT_CATALOG.some(function (p) { return p.name === item.name; });
        if (alreadyInCatalog && !limitStores) {
            alert('Item ' + item.index + ': "' + item.name + '" already exists in the catalog.');
            return;
        }
    }

    const isMarket = document.getElementById('new-product-ismarket')?.checked === true;
    const marketNote = (document.getElementById('new-product-marketnote')?.value || '').trim();
    const priceAsOf = (document.getElementById('new-product-priceasof')?.value || '').trim();

    let sheetEmails = selectedEmails.slice();
    if (limitStores && !sheetEmails.length) {
        sheetEmails = selectedStoreIds.map(function (id) {
            const cust = (allCustomers || []).find(function (c) { return String(c.id) === String(id); });
            return String((cust && (cust.salesmanEmail || cust.salesman_email)) || '').toLowerCase().trim();
        }).filter(Boolean);
    }

    try {
        if (!Array.isArray(salesmen) || salesmen.length === 0) {
            if (typeof loadSalesmen === 'function') await loadSalesmen();
        }

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const { data: existing, error: checkErr } = await supabaseClient
                .from('products')
                .select('id, name')
                .eq('name', item.name)
                .maybeSingle();
            if (checkErr) throw checkErr;

            const alreadySaved = !!existing;
            if (alreadySaved && !limitStores) {
                alert('"' + item.name + '" already exists in the database.\nThe items before it were saved.');
                return;
            }

            if (!alreadySaved) {
                const { error: prodErr } = await supabaseClient
                    .from('products')
                    .insert({
                        name: item.name,
                        category: item.category,
                        sub_category: item.subCategory || null,
                        case_size: item.caseSize || null,
                        unit_price: item.unitPrice,
                        is_market_price: isMarket,
                        active: true
                    });
                if (prodErr) throw prodErr;

                if (!PRODUCT_CATALOG.some(function (p) { return p.name === item.name; })) {
                    PRODUCT_CATALOG.push({
                        name: item.name,
                        category: item.category,
                        subCategory: item.subCategory || null,
                        caseSize: item.caseSize || null,
                        unitPrice: item.unitPrice,
                        isMarketPrice: isMarket,
                        marketPriceNote: isMarket ? (marketNote || null) : null,
                        landedCost: null,
                        grossProfit: null,
                        priceAsOf: priceAsOf || null
                    });
                }

                if (typeof upsertInventoryQuantity === 'function' && inventory[item.name] === undefined) {
                    inventory[item.name] = 0;
                    await upsertInventoryQuantity(item.name, 0);
                }
            }

            if (!limitStores && typeof applyRecommendedPriceToSalesmen === 'function') {
                await applyRecommendedPriceToSalesmen(item.name, item.unitPrice, sheetEmails);
            }
            if (sheetEmails.length && typeof assignProductToSalesmen === 'function') {
                await assignProductToSalesmen(item.name, sheetEmails);
            }
            if (selectedStoreIds.length && typeof assignProductToStores === 'function') {
                await assignProductToStores(item.name, selectedStoreIds, item.unitPrice);
            }
        }

        if (typeof logAdminActivity === 'function') {
            logAdminActivity({
                action: 'add',
                entityType: 'product',
                entityLabel: items.map(function (it) { return it.name; }).join(', '),
                summary: selectedStoreIds.length
                    ? ('Store-only · ' + selectedStoreIds.length + ' store(s)')
                    : 'Company assortment',
                details: { storeCount: selectedStoreIds.length, salesmanEmails: sheetEmails }
            });
        }
        hideAddProductModal();
        if (typeof loadProductCatalog === 'function') await loadProductCatalog();
        if (typeof renderBasePriceSheet === 'function') renderBasePriceSheet();
        if (typeof showCurrentInventory === 'function') showCurrentInventory();
        if (typeof updatePriceProposalsBadge === 'function') updatePriceProposalsBadge();

        alert(
            'Saved ' + items.length + ' product' + (items.length === 1 ? '' : 's') + '.\n' +
            'They are in the products table so they can later join the company assortment.\n' +
            (selectedStoreIds.length
                ? ('Visible only to ' + selectedStoreIds.length + ' selected store(s).\nYou can assign the same name to more stores later from Add Product.')
                : 'Recommended prices were written to the matching salesman sheets.')
        );
    } catch (err) {
        console.error('saveNewProduct error:', err);
        if (typeof logAdminActivity === 'function') {
            logAdminActivity({
                action: 'add',
                entityType: 'product',
                result: 'failed',
                error: err.message || String(err)
            });
        }
        const code = err?.code || '';
        const msg = (err.message || '').toLowerCase();
        if (code === '23505' || msg.includes('duplicate') || msg.includes('unique') || msg.includes('conflict')) {
            alert('A product with that name already exists in the database.\nUse a different product name.');
        } else {
            alert('Could not save product.\n' + (err.message || ''));
        }
    }
}


// Preferred main category order
var INVENTORY_CATEGORY_ORDER = [
    'Bully Sticks',
    'Jerky',
    'Ears',
    'Cow Cheeks',
    'Ox Tails',
    'Rabbit',
    'Duck and Goose',
    'Beef',
    'Buffalo',
    'Deer (Venison)',
    'Elk',
    'Chicken and Turkey',
    'Feet',
    'Horns',
    'Hooves',
    'Braided',
    'Large Meaty Femur/Bone/Knuckles',
    'Pressed Bones',
    'Twisty Q’s and Natural Munchy Sticks',
    'Supreme Hide Chips',
    'Retrievers',
    'Packaged Items'
];

// Load inventory from localStorage (or start empty)
var inventory = {};
async function loadInventory() {
    try {
        const { data, error } = await supabaseClient
            .from('inventory')
            .select('product_name, quantity');

        if (error) throw error;

        // Build the same object shape the rest of the code expects
        inventory = {};
        (data || []).forEach(row => {
            inventory[row.product_name] = Number(row.quantity) || 0;
        });

        // Ensure every catalog product has an entry (default 0)
        if (typeof PRODUCT_CATALOG !== 'undefined') {
            PRODUCT_CATALOG.forEach(product => {
                if (inventory[product.name] === undefined) {
                    inventory[product.name] = 0;
                }
            });
        }

        console.log('Inventory loaded from Supabase:', Object.keys(inventory).length);
        inventoryLoadedAt = Date.now();
    } catch (err) {
        console.error('loadInventory error:', err);
        inventory = {};
    }
}

async function upsertInventoryQuantity(productName, quantity) {
    try {
        // Prefer UPDATE (works under most RLS policies)
        const { data, error: updateError } = await supabaseClient
            .from('inventory')
            .update({
                quantity: quantity,
                updated_at: new Date().toISOString()
            })
            .eq('product_name', productName)
            .select('product_name');

        if (updateError) throw updateError;

        // If a row was updated, we're done
        if (data && data.length > 0) return;

        // No existing row — try insert (may still be blocked by RLS)
        const { error: insertError } = await supabaseClient
            .from('inventory')
            .insert({
                product_name: productName,
                quantity: quantity,
                updated_at: new Date().toISOString()
            });

        if (insertError) {
            // Soft-fail so shipping still succeeds
            console.warn('Could not insert inventory row for', productName, insertError.message);
        }
    } catch (err) {
        console.error('upsertInventoryQuantity error:', err);
        throw err;
    }
}

function saveInventory() {
    // localStorage writes removed – data now lives in Supabase
}

async function showInventorySection() {
    showSection('inventory');
    if (isDataFresh(inventoryLoadedAt) && inventory && Object.keys(inventory).length > 0) {
        showCurrentInventory();
    } else {
        await loadInventory();
        showCurrentInventory();
    }
}

// Make sure every product in the catalog has an inventory entry
function ensureInventoryInitialized() {
    if (typeof PRODUCT_CATALOG === 'undefined') return;

    PRODUCT_CATALOG.forEach(product => {
        if (inventory[product.name] === undefined) {
            inventory[product.name] = 0;
        }
    });
    saveInventory();
}

function showCurrentInventory() {
    ensureInventoryInitialized();

    const container = document.getElementById('inventory-content');
    if (!container) return;

    container.innerHTML = `
        <div class="bg-white border-2 border-[#6B4423] rounded-2xl p-6">
            <div class="flex items-center justify-between mb-6">
                <h2 class="text-xl font-bold brand-green">Current Inventory</h2>
                <input type="text" id="inventory-search" placeholder="Search products..."
                       class="border-2 border-[#6B4423] rounded-xl px-4 py-2 text-sm w-64"
                       oninput="renderCurrentInventoryList()">
            </div>
            <div id="inventory-list" class="space-y-8">
                <!-- Filled by renderCurrentInventoryList -->
            </div>
        </div>
    `;

    renderCurrentInventoryList();
}



function renderCurrentInventoryList() {
    const list = document.getElementById('inventory-list');
    const searchInput = document.getElementById('inventory-search');
    if (!list) return;

    const search = (searchInput?.value || '').toLowerCase();

    if (typeof PRODUCT_CATALOG === 'undefined') {
        list.innerHTML = '<p class="text-[#6B4423]">Product catalog not loaded.</p>';
        return;
    }

    // Group: category → subCategory → products
    const grouped = {};

    PRODUCT_CATALOG.forEach(product => {
        const name = product.name;
        const category = product.category || 'Other';
        const subCategory = product.subCategory || 'General';

        if (search &&
            !name.toLowerCase().includes(search) &&
            !category.toLowerCase().includes(search) &&
            !subCategory.toLowerCase().includes(search)) {
            return;
        }

        if (!grouped[category]) grouped[category] = {};
        if (!grouped[category][subCategory]) grouped[category][subCategory] = [];

        grouped[category][subCategory].push({
            name: name,
            qty: inventory[name] !== undefined ? inventory[name] : 0,
            caseSize: product.caseSize || '',
            unitPrice: product.unitPrice
        });
    });

    // Build ordered category list
    const orderedCategories = [];
    if (typeof INVENTORY_CATEGORY_ORDER !== 'undefined') {
        INVENTORY_CATEGORY_ORDER.forEach(cat => {
            if (grouped[cat]) orderedCategories.push(cat);
        });
    }
    Object.keys(grouped).forEach(cat => {
        if (!orderedCategories.includes(cat)) orderedCategories.push(cat);
    });

    if (orderedCategories.length === 0) {
        list.innerHTML = '<p class="text-[#6B4423]">No products found.</p>';
        return;
    }

    let html = '';

    orderedCategories.forEach(category => {
        const subCats = grouped[category];
        const subCatNames = Object.keys(subCats);

        html += `
            <div>
                <h3 class="text-xl font-bold brand-green mb-4">${category}</h3>
        `;

        subCatNames.forEach(subCat => {
            const products = subCats[subCat];

            html += `
                <div class="mb-5">
                    <h4 class="text-sm font-semibold text-[#6B4423] mb-2 uppercase tracking-wide">${subCat}</h4>
                    <div class="space-y-2">
            `;

            products.forEach(p => {
                const lowStock = p.qty > 0 && p.qty < 50;
                const priceText = p.unitPrice != null ? `$${Number(p.unitPrice).toFixed(2)}` : '—';
                const safeName = p.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');

                html += `
                    <div class="flex items-center justify-between bg-[#f8f4eb] border border-[#d4b78f] rounded-xl px-4 py-3">
                        <div class="pr-4">
                            <p class="font-medium">${p.name}</p>
                            <p class="text-xs text-[#6B4423] mt-0.5">
                                ${p.caseSize ? p.caseSize + ' · ' : ''}Unit Price: ${priceText}
                            </p>
                            ${lowStock ? '<p class="text-xs text-orange-600 mt-0.5">Low stock</p>' : ''}
                        </div>
                        <div class="text-right flex-shrink-0">
                            <input type="number"
                                   min="0"
                                   step="1"
                                   value="${p.qty}"
                                   data-product="${safeName}"
                                   class="inventory-qty-input w-20 text-center text-2xl font-bold brand-green bg-white border-2 border-[#6B4423] rounded-lg py-1"
                                   onkeydown="if(event.key==='Enter'){this.blur();}">
                            <p class="text-xs text-[#6B4423] mt-0.5">cases</p>
                        </div>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        html += `</div>`;
    });

    list.innerHTML = html;

    // Wire inline save
    list.querySelectorAll('.inventory-qty-input').forEach(input => {
        input.addEventListener('blur', async function () {
            const productName = this.getAttribute('data-product');
            const newQty = parseInt(this.value, 10);
            if (!productName || isNaN(newQty) || newQty < 0) {
                this.value = inventory[productName] !== undefined ? inventory[productName] : 0;
                return;
            }

            const previous = Number(inventory[productName]) || 0;
            if (newQty === previous) return;

            try {
                inventory[productName] = newQty;
                if (typeof upsertInventoryQuantity === 'function') {
                    await upsertInventoryQuantity(productName, newQty);
                }
                if (typeof updateDashboardLowStock === 'function') {
                    updateDashboardLowStock();
                }
            } catch (err) {
                console.error('Inline inventory save error:', err);
                alert('Could not save quantity.\n' + (err.message || ''));
                this.value = previous;
                inventory[productName] = previous;
            }
        });
    });
}

// Placeholder functions for later steps
function showInventoryReceiving() {
    const container = document.getElementById('inventory-content');
    if (!container) return;

    const pendingPurchases = [];
    const rejectedPurchases = [];

        if (typeof vendors !== 'undefined' && Array.isArray(vendors)) {
        vendors.forEach(vendor => {
            const purchases = vendor.purchases || [];
            purchases.forEach(p => {
                const entry = {
                    ...p,
                    vendorId: vendor.id,
                    vendorName: vendor.name
                };

                if (!p.status || p.status === 'pending') {
                    pendingPurchases.push(entry);
                } else if (p.status === 'rejected' || p.status === 'received') {
                    rejectedPurchases.push(entry);
                }
            });
        });
    }

    // Sort newest first
    const sortByDate = (a, b) => {
        const dateA = new Date(a.createdAt || a.date);
        const dateB = new Date(b.createdAt || b.date);
        return dateB - dateA;
    };
    pendingPurchases.sort(sortByDate);
    rejectedPurchases.sort(sortByDate);

    let html = `
        <div class="bg-white border-2 border-[#6B4423] rounded-2xl p-6">
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h2 class="text-xl font-bold brand-green">Receive Purchase Orders</h2>
                    <p class="text-sm text-[#6B4423]">Confirm cases received to update inventory</p>
                </div>
            </div>
    `;

    // ===== PENDING =====
    html += `<h3 class="font-semibold brand-green mb-3">Pending</h3>`;

    if (pendingPurchases.length === 0) {
        html += `
            <div class="text-center py-10 mb-8">
                <i class="fas fa-truck-loading text-5xl text-[#d4b78f] mb-4"></i>
                <p class="text-[#6B4423]">No pending purchase orders to receive.</p>
            </div>
        `;
    } else {
        html += `<div class="space-y-3 mb-10">`;
        pendingPurchases.forEach(p => {
            const dateStr = p.date || (p.createdAt ? p.createdAt.split('T')[0] : '—');
            const itemCount = p.items ? p.items.length : 0;
            html += `
                <div onclick="openReceivePurchaseModal('${p.id}', '${p.vendorId}')"
                     class="flex items-center justify-between bg-[#f8f4eb] border border-[#d4b78f] rounded-xl px-5 py-4 cursor-pointer hover:bg-[#f0e6d9] transition">
                    <div>
                        <p class="font-semibold brand-green">${p.vendorName}</p>
                        <p class="text-sm text-[#6B4423]">${p.description || 'Purchase Order'}</p>
                        <p class="text-xs text-[#6B4423] mt-1">${dateStr} · ${itemCount} product(s) · ${p.quantity || 0} cases</p>
                    </div>
                    <div class="text-right">
                        <p class="font-bold brand-green">$${(p.amount || 0).toFixed(2)}</p>
                        <span class="inline-block mt-1 px-2 py-0.5 text-xs font-semibold bg-orange-100 text-orange-700 rounded-full">Pending</span>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    }

    // ===== REJECTED / HISTORY =====
    html += `
        <h3 class="font-semibold brand-green mb-3 mt-4">Order History</h3>
    `;

    if (rejectedPurchases.length === 0) {
        html += `
            <p class="text-sm text-[#6B4423] mb-2">No order history yet.</p>
        `;
    } else {
        html += `<div class="space-y-3">`;
        rejectedPurchases.forEach(p => {
            const dateStr = p.date || (p.createdAt ? p.createdAt.split('T')[0] : '—');
            const itemCount = p.items ? p.items.length : 0;
            html += `
                <div class="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 opacity-80">
                    <div>
                        <p class="font-semibold text-gray-600">${p.vendorName}</p>
                        <p class="text-sm text-gray-500">${p.description || 'Purchase Order'}</p>
                        <p class="text-xs text-gray-400 mt-1">${dateStr} · ${itemCount} product(s) · ${p.quantity || 0} cases</p>
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-gray-500">$${(p.amount || 0).toFixed(2)}</p>
                        <span class="inline-block mt-1 px-2 py-0.5 text-xs font-semibold ${p.status === 'received' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} rounded-full">${p.status === 'received' ? 'Received' : 'Rejected'}</span>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    }

    html += `</div>`;
    container.innerHTML = html;

    // Refresh badge / dashboard counts
    if (typeof updatePendingPOIndicators === 'function') {
        updatePendingPOIndicators();
    }
}

let projectionUnitMode = 'cases'; // 'cases' or 'units'

function parseCaseSize(caseSize) {
    if (!caseSize) return null;
    const match = String(caseSize).match(/(\d[\d,]*)/);
    if (!match) return null;
    return parseInt(match[1].replace(/,/g, ''), 10) || null;
}

function setProjectionUnitMode(mode) {
    projectionUnitMode = mode;
    showInventoryProjections();
}

function formatProjectionValue(cases, unitsPerCase) {
    if (projectionUnitMode === 'units') {
        if (!unitsPerCase) return '—';
        return Math.round(cases * unitsPerCase);
    }
    return cases;
}

function showInventoryProjections() {
    const container = document.getElementById('inventory-content');
    if (!container) return;

    ensureInventoryInitialized();

    const LEAD_TIME_WEEKS = 12;
    const weeksBack = 12;

    const onOrder = {};
    if (typeof vendors !== 'undefined' && Array.isArray(vendors)) {
        vendors.forEach(vendor => {
            (vendor.purchases || []).forEach(p => {
                if (!p.status || p.status === 'pending') {
                    (p.items || []).forEach(item => {
                        const name = item.productName;
                        const qty = parseInt(item.quantity, 10) || 0;
                        if (!name || qty <= 0) return;
                        onOrder[name] = (onOrder[name] || 0) + qty;
                    });
                }
            });
        });
    }

    const now = new Date();
    const cutoff = new Date(now.getTime() - weeksBack * 7 * 24 * 60 * 60 * 1000);
    const soldMap = {};

    if (typeof allOrders !== 'undefined' && Array.isArray(allOrders)) {
        allOrders.forEach(order => {
            const status = (order.status || '').toLowerCase();
            if (!['received', 'processing', 'shipped', 'delivered'].includes(status)) return;

            const orderDate = new Date(order.submittedAt || order.date || 0);
            if (orderDate < cutoff) return;

            (order.items || []).forEach(item => {
                const name = item.product || item.productName || item.name;
                const qty = parseInt(item.quantity, 10) || 0;
                if (!name || qty <= 0) return;
                soldMap[name] = (soldMap[name] || 0) + qty;
            });
        });
    }

    const rows = [];

    if (typeof PRODUCT_CATALOG !== 'undefined') {
        PRODUCT_CATALOG.forEach(product => {
            const name = product.name;
            const onHand = inventory[name] !== undefined ? inventory[name] : 0;
            const ordered = onOrder[name] || 0;
            const unitsPerCase = parseCaseSize(product.caseSize);

            let sold = soldMap[name] || 0;
            if (sold === 0) {
                Object.keys(soldMap).forEach(key => {
                    if (key.toLowerCase().includes(name.toLowerCase()) ||
                        name.toLowerCase().includes(key.toLowerCase())) {
                        sold += soldMap[key];
                    }
                });
            }

            const avgWeekly = sold / weeksBack;
            const projectedNeed = avgWeekly * LEAD_TIME_WEEKS;
            const suggested = Math.max(0, Math.ceil(projectedNeed - onHand - ordered));

            rows.push({
                name: name,
                category: product.category || '',
                caseSize: product.caseSize || '',
                unitsPerCase: unitsPerCase,
                onHand: onHand,
                onOrder: ordered,
                avgWeekly: avgWeekly,
                projectedNeed: projectedNeed,
                suggested: suggested
            });
        });
    }

    rows.sort((a, b) => {
        if (b.suggested !== a.suggested) return b.suggested - a.suggested;
        return a.name.localeCompare(b.name);
    });

    const casesActive = projectionUnitMode === 'cases';
    const unitsActive = projectionUnitMode === 'units';

    let html = `
        <div class="bg-white border-2 border-[#6B4423] rounded-2xl p-6">
            <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h2 class="text-xl font-bold brand-green">Projections</h2>
                    <p class="text-sm text-[#6B4423]">
                        Last ${weeksBack} weeks of sales · ${LEAD_TIME_WEEKS}-week lead time
                    </p>
                </div>
                <div class="flex flex-wrap items-center gap-3">
                    <div class="flex rounded-xl overflow-hidden border-2 border-[#6B4423]">
                        <button onclick="setProjectionUnitMode('cases')"
                                class="px-4 py-2 text-sm font-semibold ${casesActive ? 'bg-[#1E4D2B] text-[#d4b78f]' : 'bg-white text-[#6B4423] hover:bg-[#f8f4eb]'}">
                            Cases
                        </button>
                        <button onclick="setProjectionUnitMode('units')"
                                class="px-4 py-2 text-sm font-semibold ${unitsActive ? 'bg-[#1E4D2B] text-[#d4b78f]' : 'bg-white text-[#6B4423] hover:bg-[#f8f4eb]'}">
                            Units
                        </button>
                    </div>
                    <input type="text" id="projection-search" placeholder="Search products..."
                           class="border-2 border-[#6B4423] rounded-xl px-4 py-2 text-sm w-56"
                           oninput="filterProjectionRows()">
                </div>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="bg-[#1E4D2B] text-[#d4b78f]">
                            <th class="p-3 text-left">Product</th>
                            <th class="p-3 text-center">On Hand</th>
                            <th class="p-3 text-center">On Order</th>
                            <th class="p-3 text-center">Avg Weekly</th>
                            <th class="p-3 text-center">Projected Need</th>
                            <th class="p-3 text-center">Suggested Order</th>
                        </tr>
                    </thead>
                    <tbody id="projection-table-body">
    `;

    if (rows.length === 0) {
        html += `
            <tr>
                <td colspan="6" class="p-8 text-center text-[#6B4423]">No product data available yet.</td>
            </tr>
        `;
    } else {
        rows.forEach(r => {
            const highlight = r.suggested > 0 ? 'bg-orange-50' : '';
            const suggestedClass = r.suggested > 0 ? 'font-bold text-orange-700' : 'text-[#6B4423]';

            const onHandVal = formatProjectionValue(r.onHand, r.unitsPerCase);
            const onOrderVal = formatProjectionValue(r.onOrder, r.unitsPerCase);
            const avgVal = projectionUnitMode === 'units' && r.unitsPerCase
                ? (r.avgWeekly * r.unitsPerCase).toFixed(0)
                : r.avgWeekly.toFixed(1);
            const needVal = formatProjectionValue(Math.ceil(r.projectedNeed), r.unitsPerCase);
            const suggestedVal = formatProjectionValue(r.suggested, r.unitsPerCase);

            html += `
                <tr class="border-b border-[#d4b78f] ${highlight}" data-name="${r.name.toLowerCase()}">
                    <td class="p-3">
                        <p class="font-medium">${r.name}</p>
                        <p class="text-xs text-[#6B4423]">${r.category}${r.caseSize ? ' · ' + r.caseSize : ''}</p>
                    </td>
                    <td class="p-3 text-center">${onHandVal}</td>
                    <td class="p-3 text-center">${onOrderVal}</td>
                    <td class="p-3 text-center">${avgVal}</td>
                    <td class="p-3 text-center">${needVal}</td>
                    <td class="p-3 text-center ${suggestedClass}">${suggestedVal}</td>
                </tr>
            `;
        });
    }

    html += `
                    </tbody>
                </table>
            </div>
            <p class="text-xs text-[#6B4423] mt-4">
                Toggle between Cases and Units above.
                Suggested Order = Projected Need − On Hand − On Order (minimum 0).
            </p>
        </div>
    `;

    container.innerHTML = html;
}

function filterProjectionRows() {
    const input = document.getElementById('projection-search');
    const search = (input?.value || '').toLowerCase();
    const rows = document.querySelectorAll('#projection-table-body tr[data-name]');

    rows.forEach(row => {
        const name = row.getAttribute('data-name') || '';
        row.style.display = !search || name.includes(search) ? '' : 'none';
    });
}

// Currently selected purchase for receiving
let currentReceivePurchase = null;

function openReceivePurchaseModal(purchaseId, vendorId) {
    const vendor = vendors.find(v => v.id === vendorId);
    if (!vendor) return;

    const purchase = (vendor.purchases || []).find(p => p.id === purchaseId);
    if (!purchase) return;

    currentReceivePurchase = {
        purchaseId: purchaseId,
        vendorId: vendorId,
        purchase: purchase,
        vendorName: vendor.name
    };

    // Subtitle
    const subtitle = document.getElementById('receive-modal-subtitle');
    if (subtitle) {
        subtitle.textContent = `${vendor.name} · ${purchase.date || ''} · $${(purchase.amount || 0).toFixed(2)}`;
    }

    // Build the editable list of items
    const list = document.getElementById('receive-items-list');
    if (!list) return;

    const items = purchase.items || [];

    if (items.length === 0) {
        list.innerHTML = '<p class="text-[#6B4423]">No structured line items on this purchase.</p>';
    } else {
        list.innerHTML = items.map((item, index) => `
            <div class="flex items-center justify-between bg-[#f8f4eb] border border-[#d4b78f] rounded-xl px-4 py-3">
                <div class="flex-1 pr-4">
                    <p class="font-medium">${escapeHtml(item.productName)}</p>
                    <p class="text-sm text-[#6B4423]">Ordered: ${item.quantity} cases · $${item.unitCost.toFixed(2)} each</p>
                </div>
                <div class="flex items-center gap-2">
                    <label class="text-sm text-[#6B4423]">Received:</label>
                    <input type="number" 
                           id="receive-qty-${index}" 
                           min="0" 
                           value="${item.quantity}"
                           class="w-20 border-2 border-[#6B4423] rounded-lg px-2 py-1 text-center font-semibold">
                </div>
            </div>
        `).join('');
    }

    // Show the modal
    const modal = document.getElementById('receive-purchase-modal');
    if (modal) modal.classList.remove('hidden');
}

function hideReceivePurchaseModal() {
    const modal = document.getElementById('receive-purchase-modal');
    if (modal) modal.classList.add('hidden');
    currentReceivePurchase = null;
}

function acceptFullOrder() {
    if (!currentReceivePurchase) return;

    const items = currentReceivePurchase.purchase.items || [];
    items.forEach((item, index) => {
        const input = document.getElementById(`receive-qty-${index}`);
        if (input) input.value = item.quantity;
    });

    // Immediately confirm
    confirmReceivedQuantities();
}

async function confirmReceivedQuantities() {
    if (!currentReceivePurchase) return;

    const { purchaseId, vendorId, purchase } = currentReceivePurchase;
    const vendor = vendors.find(v => v.id === vendorId);
    if (!vendor) return;

    const items = purchase.items || [];
    if (items.length === 0) {
        alert('This purchase has no line items to receive.');
        return;
    }

    // Make sure inventory is initialized
    ensureInventoryInitialized();

    // Update inventory with received quantities
    items.forEach((item, index) => {
        const input = document.getElementById(`receive-qty-${index}`);
        const receivedQty = parseInt(input?.value, 10) || 0;

        if (receivedQty > 0) {
            if (inventory[item.productName] === undefined) {
                inventory[item.productName] = 0;
            }
            inventory[item.productName] += receivedQty;
        }
    });

        // Write each updated product to Supabase
    try {
                for (const item of items) {
            const name = item.productName;
            if (name && inventory[name] !== undefined) {
                await upsertInventoryQuantity(name, inventory[name]);
            }
        }
    } catch (err) {
        console.error('Failed to save inventory to Supabase:', err);
        alert('Inventory updated in memory, but could not save to database.\n' + (err.message || ''));
    }

    // Mark the purchase as received in Supabase
try {
    const { error } = await supabaseClient
        .from('vendor_purchases')
        .update({
            status: 'received',
            received_at: new Date().toISOString()
        })
        .eq('id', purchaseId);

    if (error) throw error;
} catch (err) {
    console.error('confirmReceivedQuantities status update error:', err);
    alert('Inventory was updated, but the purchase status could not be saved.\n' + (err.message || ''));
}

    hideReceivePurchaseModal();

        if (typeof updatePendingPOIndicators === 'function') {
        updatePendingPOIndicators();
    }

    // Refresh the receiving list
    showInventoryReceiving();

    alert('Inventory updated successfully.');
}

async function rejectPurchaseOrder() {
    if (!currentReceivePurchase) return;

    const confirmed = confirm('Reject this purchase order?\n\nIt will be marked as rejected and will not update inventory.');
    if (!confirmed) return;

    const { purchaseId, vendorId } = currentReceivePurchase;
    const vendor = vendors.find(v => v.id === vendorId);
    if (!vendor) return;

    try {
    const { error } = await supabaseClient
        .from('vendor_purchases')
        .update({
            status: 'rejected',
            rejected_at: new Date().toISOString()
        })
        .eq('id', purchaseId);

    if (error) throw error;
} catch (err) {
    console.error('rejectPurchaseOrder error:', err);
    alert('Could not reject the purchase order.\n' + (err.message || ''));
    return;
}

    hideReceivePurchaseModal();

    if (typeof updatePendingPOIndicators === 'function') {
        updatePendingPOIndicators();
    }

    // Refresh the receiving list
    showInventoryReceiving();

    alert('Purchase order rejected.');
}

function getPendingPurchaseOrderCount() {
    let count = 0;

    if (typeof vendors !== 'undefined' && Array.isArray(vendors)) {
        vendors.forEach(vendor => {
            const purchases = vendor.purchases || [];
            purchases.forEach(p => {
                if (!p.status || p.status === 'pending') {
                    count++;
                }
            });
        });
    }

    return count;
}

async function updatePendingPOIndicators() {
    let count = 0;

    try {
        const { count: pendingCount, error } = await supabaseClient
            .from('vendor_purchases')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending');

        if (error) throw error;
        count = pendingCount || 0;
    } catch (err) {
        console.error('updatePendingPOIndicators error:', err);
        if (typeof getPendingPurchaseOrderCount === 'function') {
            count = getPendingPurchaseOrderCount();
        }
    }

    // Inventory / Stock & Receiving card
    const dashEl = document.getElementById('dash-pending-pos-count');
    if (dashEl) {
        dashEl.textContent = count;
    }

    // Badge on the Receive Purchase Orders button (if present)
    const badge = document.getElementById('pending-pos-badge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

function updateDashboardLowStock() {
    ensureInventoryInitialized();

    let lowStockCount = 0;

    Object.keys(inventory).forEach(name => {
        const qty = Number(inventory[name]) || 0;
        if (qty < 50) {
            lowStockCount++;
        }
    });

    const lowStockEl = document.getElementById('dash-low-stock-count');
    if (lowStockEl) {
        lowStockEl.textContent = lowStockCount;
    }

    // Also refresh pending PO count whenever we update this card
    if (typeof updatePendingPOIndicators === 'function') {
        updatePendingPOIndicators();
    }
}

//=======Inventory Helper Function===========\\
async function decreaseInventoryForOrder(order) {
    if (!order || !Array.isArray(order.items) || order.items.length === 0) return;

    // Ensure we have current inventory in memory
    if (typeof loadInventory === 'function' && Object.keys(inventory || {}).length === 0) {
        await loadInventory();
    }
    if (typeof ensureInventoryInitialized === 'function') {
        ensureInventoryInitialized();
    }

    try {
        for (const item of order.items) {
            const name = item.product || item.productName || item.name;
            const qty = parseInt(item.quantity, 10) || 0;
            if (!name || qty <= 0) continue;

            const current = Number(inventory[name]) || 0;
            const next = Math.max(0, current - qty);
            inventory[name] = next;

            if (typeof upsertInventoryQuantity === 'function') {
                await upsertInventoryQuantity(name, next);
            }
        }

        if (typeof updateDashboardLowStock === 'function') {
            updateDashboardLowStock();
        }
    } catch (err) {
        console.error('decreaseInventoryForOrder error:', err);
        alert('Order shipped, but inventory could not be updated.\n' + (err.message || ''));
    }
}


function getThisWeekTopProducts(limit = 5) {
    // Current week = Sunday → today
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - day);
    weekStart.setHours(0, 0, 0, 0);

    const soldMap = {};

    if (typeof allOrders !== 'undefined' && Array.isArray(allOrders)) {
        allOrders.forEach(order => {
            if (typeof isTestStoreOrder === 'function' && isTestStoreOrder(order)) return;
            const orderDate = new Date(order.submittedAt || order.date || 0);
            if (orderDate < weekStart) return;

            (order.items || []).forEach(item => {
                const name = item.product || item.productName || item.name;
                const qty = parseInt(item.quantity, 10) || 0;
                if (!name || qty <= 0) return;
                soldMap[name] = (soldMap[name] || 0) + qty;
            });
        });
    }

    return Object.entries(soldMap)
        .map(([name, qty]) => ({ name, qty }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, limit);
}

function updateDashboardSalesMatrix() {
    const container = document.getElementById('dash-matrix-top5');
    if (!container) return;

    const top = getThisWeekTopProducts(5);

    if (top.length === 0) {
        container.innerHTML = `
            <p class="text-sm text-[#6B4423]">No sales recorded this week yet.</p>
        `;
        return;
    }

    container.innerHTML = top.map((p, i) => `
        <div class="flex justify-between items-center bg-[#f8f4eb] rounded-xl px-3 py-2 text-sm">
            <span class="font-medium text-[#1E4D2B] truncate pr-2">${i + 1}. ${escapeHtml(p.name)}</span>
            <span class="font-bold brand-green whitespace-nowrap">${p.qty} units</span>
        </div>
    `).join('');
}

function goToSalesMatrix(event) {
    if (event) event.stopPropagation();

    showSection('financials');
    setTimeout(() => {
        if (typeof showFinancialsSub === 'function') {
            showFinancialsSub('sales');
        }
        setTimeout(() => {
            if (typeof renderWeeklyMatrix === 'function') {
                renderWeeklyMatrix();
            }
            const el = document.getElementById('weekly-matrix-section')
                || document.getElementById('weekly-matrix-container');
            if (!el) return;
            const navOffset = 90;
            const top = el.getBoundingClientRect().top + window.pageYOffset - navOffset;
            window.scrollTo({ top: top, behavior: 'smooth' });
        }, 80);
    }, 50);
}

window.addNewProductCategory = addNewProductCategory;
window.knownAddProductCategories = knownAddProductCategories;
window.knownAddProductSubcategories = knownAddProductSubcategories;
window.selectedNewProductCategories = selectedNewProductCategories;
window.renderNewProductCategoryBoxes = renderNewProductCategoryBoxes;
window.fillNewProductSubcategorySelect = fillNewProductSubcategorySelect;
window.addNewProductRow = addNewProductRow;
window.removeNewProductRow = removeNewProductRow;
window.refreshNewProductRowState = refreshNewProductRowState;
window.resetNewProductRows = resetNewProductRows;
window.collectNewProductRows = collectNewProductRows;
window.addNewProductCategoryFromSheet = addNewProductCategoryFromSheet;
window.toggleNewProductSalesmanLimit = toggleNewProductSalesmanLimit;
window.populateNewProductSalesmanSelect = populateNewProductSalesmanSelect;
window.isSkippedAddProductStore = isSkippedAddProductStore;
window.getSalesmanAssignedProducts = getSalesmanAssignedProducts;
window.mergeStoreOnlyPriceExtras = mergeStoreOnlyPriceExtras;
window.toggleNewProductStoreLimit = toggleNewProductStoreLimit;
window.getNewProductSelectedStoreIds = getNewProductSelectedStoreIds;
window.populateNewProductStoreSelect = populateNewProductStoreSelect;
window.assignProductToStores = assignProductToStores;
window.openAddProductModal = openAddProductModal;
window.hideAddProductModal = hideAddProductModal;
window.toggleAddProductMarketFields = toggleAddProductMarketFields;
window.saveNewProduct = saveNewProduct;
window.loadInventory = loadInventory;
window.upsertInventoryQuantity = upsertInventoryQuantity;
window.saveInventory = saveInventory;
window.showInventorySection = showInventorySection;
window.ensureInventoryInitialized = ensureInventoryInitialized;
window.showCurrentInventory = showCurrentInventory;
window.renderCurrentInventoryList = renderCurrentInventoryList;
window.showInventoryReceiving = showInventoryReceiving;
window.parseCaseSize = parseCaseSize;
window.setProjectionUnitMode = setProjectionUnitMode;
window.formatProjectionValue = formatProjectionValue;
window.showInventoryProjections = showInventoryProjections;
window.filterProjectionRows = filterProjectionRows;
window.openReceivePurchaseModal = openReceivePurchaseModal;
window.hideReceivePurchaseModal = hideReceivePurchaseModal;
window.acceptFullOrder = acceptFullOrder;
window.confirmReceivedQuantities = confirmReceivedQuantities;
window.rejectPurchaseOrder = rejectPurchaseOrder;
window.getPendingPurchaseOrderCount = getPendingPurchaseOrderCount;
window.updatePendingPOIndicators = updatePendingPOIndicators;
window.updateDashboardLowStock = updateDashboardLowStock;
window.decreaseInventoryForOrder = decreaseInventoryForOrder;
window.getThisWeekTopProducts = getThisWeekTopProducts;
window.updateDashboardSalesMatrix = updateDashboardSalesMatrix;
window.goToSalesMatrix = goToSalesMatrix;

let oosStatusMap = {};

let oosListTab = 'all';

function oosActor() {
    try {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        return user.email || user.fullName || user.name || 'Admin';
    } catch (e) {
        return 'Admin';
    }
}

function currentOosCount() {
    let n = 0;
    Object.keys(oosStatusMap || {}).forEach(function (name) {
        if (oosStatusMap[name] && oosStatusMap[name].is_out_of_stock === true) n += 1;
    });
    return n;
}

function updateOosCountBadge() {
    const n = currentOosCount();
    const badge = document.getElementById('oos-count-badge');
    if (badge) {
        badge.textContent = String(n);
        if (n) badge.classList.remove('hidden');
        else badge.classList.add('hidden');
        badge.title = n === 1
            ? '1 item currently out of stock'
            : n + ' items currently out of stock';
    }
    const tabCount = document.getElementById('oos-tab-count');
    if (tabCount) tabCount.textContent = String(n);
}

function setOosTabButtons() {
    const allBtn = document.getElementById('oos-tab-all');
    const curBtn = document.getElementById('oos-tab-current');
    const on = 'px-4 py-1.5 text-sm rounded-xl font-semibold bg-[#1E4D2B] text-[#d4b78f] border-2 border-[#1E4D2B]';
    const off = 'px-4 py-1.5 text-sm rounded-xl font-semibold border-2 border-[#6B4423] text-[#1E4D2B] hover:bg-[#f8f4eb]';
    if (allBtn) allBtn.className = oosListTab === 'all' ? on : off;
    if (curBtn) curBtn.className = oosListTab === 'current' ? on : off;
}

function setOosListTab(tab) {
    oosListTab = tab === 'current' ? 'current' : 'all';
    setOosTabButtons();
    renderOutOfStockList();
}

async function openOutOfStockModal(tab) {
    const modal = document.getElementById('out-of-stock-modal');
    if (!modal) return;
    oosListTab = tab === 'current' ? 'current' : 'all';
    const search = document.getElementById('oos-search');
    if (search) search.value = '';
    modal.classList.remove('hidden');
    await loadOutOfStockStatus();
    setOosTabButtons();
    renderOutOfStockList();
}

function hideOutOfStockModal() {
    const modal = document.getElementById('out-of-stock-modal');
    if (modal) modal.classList.add('hidden');
}

async function loadOutOfStockStatus() {
    oosStatusMap = {};
    try {
        const { data, error } = await supabaseClient
            .from('product_stock_status')
            .select('product_name, is_out_of_stock, estimated_back_at, oos_since');
        if (error) throw error;
        (data || []).forEach(row => {
            oosStatusMap[row.product_name] = row;
        });
    } catch (err) {
        console.error('loadOutOfStockStatus:', err);
        alert('Could not load stock status.\nRun the product_stock_status SQL in Supabase if that table is missing.\n' + (err.message || ''));
    }
    updateOosCountBadge();
}

function renderOutOfStockList() {
    const list = document.getElementById('oos-list');
    if (!list || typeof PRODUCT_CATALOG === 'undefined') return;
    const q = (document.getElementById('oos-search')?.value || '').trim().toLowerCase();
    const products = PRODUCT_CATALOG.filter(p => {
        if (p.isMarketPrice) return false;
        if (oosListTab === 'current') {
            const st = oosStatusMap[p.name] || {};
            if (st.is_out_of_stock !== true) return false;
        }
        if (!q) return true;
        return (p.name || '').toLowerCase().includes(q)
            || (p.category || '').toLowerCase().includes(q);
    });
    const byCat = {};
    products.forEach(p => {
        const cat = p.category || 'Uncategorized';
        if (!byCat[cat]) byCat[cat] = [];
        byCat[cat].push(p);
    });
    const cats = Object.keys(byCat).sort();
    if (!cats.length) {
        list.innerHTML = oosListTab === 'current'
            ? '<p class="text-sm text-[#6B4423] text-center py-8">No products are currently out of stock.</p>'
            : '<p class="text-sm text-[#6B4423] text-center py-8">No products match.</p>';
        return;
    }
    list.innerHTML = cats.map(cat => {
        const rows = byCat[cat].map(p => {
            const st = oosStatusMap[p.name] || {};
            const oos = st.is_out_of_stock === true;
            const dateVal = st.estimated_back_at ? String(st.estimated_back_at).slice(0, 10) : '';
            const since = st.oos_since ? new Date(st.oos_since).toLocaleDateString() : '';
            const safe = (p.name || '').replace(/"/g, '&quot;');
            return `
                <label class="flex flex-wrap items-center gap-3 p-2 rounded-xl border ${oos ? 'border-red-300 bg-red-50' : 'border-[#e8d9b8] bg-white'}">
                    <input type="checkbox" class="oos-cb accent-[#1E4D2B]" data-product="${safe}">
                    <span class="flex-1 min-w-[140px] text-sm font-medium ${oos ? 'text-red-800' : 'brand-green'}">${escapeHtml(p.name || '')}</span>
                    <span class="text-xs text-[#6B4423]">${escapeHtml(p.caseSize || '')}</span>
                    ${oos ? `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-200 text-red-800">OOS${since ? ' since ' + since : ''}</span>` : ''}
                    <input type="date" class="oos-date border border-[#d4b78f] rounded-lg px-2 py-1 text-xs"
                           data-product="${safe}" value="${dateVal}" title="Estimated back in stock">
                </label>
            `;
        }).join('');
        const safeCat = cat.replace(/"/g, '&quot;');
        return `
            <div class="border-2 border-[#6B4423] rounded-2xl overflow-hidden">
                <div class="flex items-center gap-2 px-3 py-2 bg-[#1E4D2B] text-[#d4b78f]">
                    <input type="checkbox" class="oos-cat-cb accent-[#d4b78f]" data-cat="${safeCat}"
                           onchange="toggleOosCategory(this)">
                    <span class="font-bold text-sm">${escapeHtml(cat)}</span>
                    <span class="text-xs ml-auto">${byCat[cat].length}</span>
                </div>
                <div class="p-2 space-y-2" data-oos-cat="${safeCat}">${rows}</div>
            </div>
        `;
    }).join('');
}

function toggleOosCategory(master) {
    const cat = master.getAttribute('data-cat');
    const wrap = document.querySelector('[data-oos-cat="' + cat + '"]');
    if (!wrap) return;
    wrap.querySelectorAll('.oos-cb').forEach(cb => { cb.checked = master.checked; });
}

function selectedOosNames() {
    return Array.from(document.querySelectorAll('.oos-cb:checked'))
        .map(cb => cb.getAttribute('data-product'))
        .filter(Boolean);
}

function oosDateFor(name) {
    const el = document.querySelector('.oos-date[data-product="' + name.replace(/"/g, '\\"') + '"]');
    if (el && el.value) return el.value;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
}

async function markSelectedOutOfStock() {
    const names = selectedOosNames();
    if (!names.length) {
        alert('Select at least one product.');
        return;
    }
    const who = oosActor();
    const now = new Date().toISOString();
    try {
        for (const name of names) {
            const eta = oosDateFor(name);
            const { error: stErr } = await supabaseClient
                .from('product_stock_status')
                .upsert({
                    product_name: name,
                    is_out_of_stock: true,
                    estimated_back_at: eta,
                    oos_since: now,
                    updated_at: now,
                    updated_by: who
                }, { onConflict: 'product_name' });
            if (stErr) throw stErr;
            const { error: evErr } = await supabaseClient
                .from('product_stock_events')
                .insert({
                    product_name: name,
                    event: 'out_of_stock',
                    estimated_back_at: eta,
                    created_by: who
                });
            if (evErr) throw evErr;
        }
        await loadOutOfStockStatus();
        renderOutOfStockList();
        if (typeof logAdminActivity === 'function') {
            logAdminActivity({
                action: 'oos',
                entityType: 'product',
                entityLabel: names.join(', '),
                summary: 'Marked out of stock'
            });
        }
        alert(names.length + ' product(s) marked Out of Stock.');
    } catch (err) {
        console.error(err);
        alert('Could not mark Out of Stock.\n' + (err.message || ''));
    }
}

async function markSelectedInStock() {
    const names = selectedOosNames();
    if (!names.length) {
        alert('Select at least one product.');
        return;
    }
    const who = oosActor();
    const now = new Date().toISOString();
    try {
        for (const name of names) {
            const { error: stErr } = await supabaseClient
                .from('product_stock_status')
                .upsert({
                    product_name: name,
                    is_out_of_stock: false,
                    estimated_back_at: null,
                    oos_since: null,
                    updated_at: now,
                    updated_by: who
                }, { onConflict: 'product_name' });
            if (stErr) throw stErr;
            const { error: evErr } = await supabaseClient
                .from('product_stock_events')
                .insert({
                    product_name: name,
                    event: 'back_in_stock',
                    estimated_back_at: null,
                    created_by: who
                });
            if (evErr) throw evErr;
        }
        await loadOutOfStockStatus();
        renderOutOfStockList();
        if (typeof logAdminActivity === 'function') {
            logAdminActivity({
                action: 'oos',
                entityType: 'product',
                entityLabel: names.join(', '),
                summary: 'Cleared out of stock'
            });
        }
        alert(names.length + ' product(s) marked In Stock.');
    } catch (err) {
        console.error(err);
        alert('Could not mark In Stock.\n' + (err.message || ''));
    }
}

function oosLocalTodayYmd() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
}

function oosYmdToLabel(ymd) {
    const parts = String(ymd || '').slice(0, 10).split('-');
    if (parts.length !== 3) return ymd || '—';
    return parts[1] + '/' + parts[2] + '/' + String(parts[0]).slice(-2);
}

function dueOosRows() {
    const today = oosLocalTodayYmd();
    const rows = [];
    Object.keys(oosStatusMap || {}).forEach(function (name) {
        const st = oosStatusMap[name] || {};
        if (st.is_out_of_stock !== true) return;
        const eta = String(st.estimated_back_at || '').slice(0, 10);
        if (!eta || eta > today) return;
        rows.push({ name: name, eta: eta });
    });
    rows.sort(function (a, b) {
        if (a.eta === b.eta) return a.name.localeCompare(b.name);
        return a.eta.localeCompare(b.eta);
    });
    return rows;
}

function updateOosDueBadge() {
    if (typeof updateOosCountBadge === 'function') updateOosCountBadge();
}

function renderOosDueList() {
    const list = document.getElementById('oos-due-list');
    if (!list) return;
    const rows = dueOosRows();
    const today = oosLocalTodayYmd();
    if (!rows.length) {
        list.innerHTML = '<p class="text-sm text-[#6B4423] text-center py-6">No expected-back dates are due.</p>';
        return;
    }
    list.innerHTML = rows.map(function (row) {
        const safe = String(row.name).replace(/"/g, '&quot;');
        const overdue = row.eta < today;
        return (
            '<div class="border-2 ' + (overdue ? 'border-red-300 bg-red-50' : 'border-[#d4b78f] bg-[#f8f4eb]') + ' rounded-xl p-3">' +
                '<div class="flex flex-wrap items-start justify-between gap-2 mb-2">' +
                    '<p class="font-semibold text-[#1E4D2B]">' + escapeHtml(row.name) + '</p>' +
                    '<span class="text-xs font-bold ' + (overdue ? 'text-red-800' : 'text-[#6B4423]') + '">' +
                        (overdue ? 'Overdue · ' : 'Due today · ') +
                        'expected ' + escapeHtml(oosYmdToLabel(row.eta)) +
                    '</span>' +
                '</div>' +
                '<div class="flex flex-wrap items-end gap-2">' +
                    '<label class="text-xs font-semibold text-[#6B4423]">New date' +
                        '<input type="date" class="oos-due-date block border-2 border-[#6B4423] rounded-xl px-3 py-1.5 text-sm mt-1"' +
                               ' data-product="' + safe + '" min="' + today + '" value="' + today + '">' +
                    '</label>' +
                    '<button type="button" onclick="extendOosDueItem(this.getAttribute(\'data-product\'))"' +
                            ' data-product="' + safe + '"' +
                            ' class="px-4 py-1.5 text-sm border-2 border-[#6B4423] rounded-xl hover:bg-white font-semibold text-[#1E4D2B]">' +
                        'Extend date' +
                    '</button>' +
                    '<button type="button" onclick="restockOosDueItem(this.getAttribute(\'data-product\'))"' +
                            ' data-product="' + safe + '"' +
                            ' class="px-4 py-1.5 text-sm bg-[#1E4D2B] text-[#d4b78f] rounded-xl font-semibold">' +
                        'Back in stock' +
                    '</button>' +
                '</div>' +
            '</div>'
        );
    }).join('');
}

function hideOosDueModal() {
    const modal = document.getElementById('oos-due-modal');
    if (modal) modal.classList.add('hidden');
}

function snoozeOosDueModal() {
    try { sessionStorage.setItem('oosDueSnooze', oosLocalTodayYmd()); } catch (e) {}
    hideOosDueModal();
}

function showOosDueModal() {
    const modal = document.getElementById('oos-due-modal');
    if (!modal) return;
    renderOosDueList();
    modal.classList.remove('hidden');
}

async function checkOosDueAlerts() {
    if (typeof loadOutOfStockStatus === 'function') {
        await loadOutOfStockStatus();
    }
    updateOosDueBadge();
    const rows = dueOosRows();
    if (!rows.length) {
        hideOosDueModal();
        return;
    }
    let snoozed = '';
    try { snoozed = sessionStorage.getItem('oosDueSnooze') || ''; } catch (e) {}
    if (snoozed === oosLocalTodayYmd()) return;
    showOosDueModal();
}

async function extendOosDueItem(name) {
    if (!name) return;
    const input = document.querySelector('.oos-due-date[data-product="' + name.replace(/"/g, '\\"') + '"]');
    const eta = input && input.value ? input.value : '';
    const today = oosLocalTodayYmd();
    if (!eta || eta < today) {
        alert('Pick a new expected-back date that is today or later.');
        return;
    }
    const who = oosActor();
    const now = new Date().toISOString();
    try {
        const { error: stErr } = await supabaseClient
            .from('product_stock_status')
            .upsert({
                product_name: name,
                is_out_of_stock: true,
                estimated_back_at: eta,
                updated_at: now,
                updated_by: who
            }, { onConflict: 'product_name' });
        if (stErr) throw stErr;
        const { error: evErr } = await supabaseClient
            .from('product_stock_events')
            .insert({
                product_name: name,
                event: 'date_extended',
                estimated_back_at: eta,
                created_by: who
            });
        if (evErr) throw evErr;
        if (typeof logAdminActivity === 'function') {
            logAdminActivity({
                action: 'oos',
                entityType: 'product',
                entityLabel: name,
                summary: 'Extended OOS date to ' + eta
            });
        }
        await loadOutOfStockStatus();
        updateOosDueBadge();
        if (dueOosRows().length) renderOosDueList();
        else hideOosDueModal();
        if (document.getElementById('out-of-stock-modal') &&
            !document.getElementById('out-of-stock-modal').classList.contains('hidden')) {
            renderOutOfStockList();
        }
    } catch (err) {
        console.error(err);
        alert('Could not extend the date.\n' + (err.message || ''));
    }
}

async function restockOosDueItem(name) {
    if (!name) return;
    const who = oosActor();
    const now = new Date().toISOString();
    try {
        const { error: stErr } = await supabaseClient
            .from('product_stock_status')
            .upsert({
                product_name: name,
                is_out_of_stock: false,
                estimated_back_at: null,
                oos_since: null,
                updated_at: now,
                updated_by: who
            }, { onConflict: 'product_name' });
        if (stErr) throw stErr;
        const { error: evErr } = await supabaseClient
            .from('product_stock_events')
            .insert({
                product_name: name,
                event: 'back_in_stock',
                estimated_back_at: null,
                created_by: who
            });
        if (evErr) throw evErr;
        if (typeof logAdminActivity === 'function') {
            logAdminActivity({
                action: 'oos',
                entityType: 'product',
                entityLabel: name,
                summary: 'Cleared out of stock from due alert'
            });
        }
        await loadOutOfStockStatus();
        updateOosDueBadge();
        if (dueOosRows().length) renderOosDueList();
        else hideOosDueModal();
        if (document.getElementById('out-of-stock-modal') &&
            !document.getElementById('out-of-stock-modal').classList.contains('hidden')) {
            renderOutOfStockList();
        }
    } catch (err) {
        console.error(err);
        alert('Could not mark in stock.\n' + (err.message || ''));
    }
}

window.oosActor = oosActor;
window.currentOosCount = currentOosCount;
window.updateOosCountBadge = updateOosCountBadge;
window.setOosTabButtons = setOosTabButtons;
window.setOosListTab = setOosListTab;
window.openOutOfStockModal = openOutOfStockModal;
window.hideOutOfStockModal = hideOutOfStockModal;
window.loadOutOfStockStatus = loadOutOfStockStatus;
window.renderOutOfStockList = renderOutOfStockList;
window.toggleOosCategory = toggleOosCategory;
window.selectedOosNames = selectedOosNames;
window.oosDateFor = oosDateFor;
window.markSelectedOutOfStock = markSelectedOutOfStock;
window.markSelectedInStock = markSelectedInStock;
window.oosLocalTodayYmd = oosLocalTodayYmd;
window.oosYmdToLabel = oosYmdToLabel;
window.dueOosRows = dueOosRows;
window.updateOosDueBadge = updateOosDueBadge;
window.renderOosDueList = renderOosDueList;
window.hideOosDueModal = hideOosDueModal;
window.snoozeOosDueModal = snoozeOosDueModal;
window.showOosDueModal = showOosDueModal;
window.checkOosDueAlerts = checkOosDueAlerts;
window.extendOosDueItem = extendOosDueItem;
window.restockOosDueItem = restockOosDueItem;
