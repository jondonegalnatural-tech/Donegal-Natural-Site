// Internal portal — vendors, purchases, and vendor orders.
let vendorsLoadedAt = 0;

async function loadVendors() {
    showTableLoading('vendors-list', 'Loading vendors…');
    try {
        // Fetch vendors, purchases, and items in parallel
        const [vendorsRes, purchasesRes, itemsRes] = await Promise.all([
            supabaseClient.from('vendors').select('*').order('name'),
            supabaseClient.from('vendor_purchases').select('*').order('created_at', { ascending: false }),
            supabaseClient.from('vendor_purchase_items').select('*')
        ]);

        if (vendorsRes.error) throw vendorsRes.error;
        if (purchasesRes.error) throw purchasesRes.error;
        if (itemsRes.error) throw itemsRes.error;

        const vendorRows = vendorsRes.data;
        const purchaseRows = purchasesRes.data;
        const itemRows = itemsRes.data;

        // 4. Nest them into the exact shape the existing UI expects
        vendors = (vendorRows || []).map(v => {
            const purchases = (purchaseRows || [])
                .filter(p => p.vendor_id === v.id)
                .map(p => {
                    const items = (itemRows || [])
                        .filter(i => i.purchase_id === p.id)
                        .map(i => ({
                            productName: i.product_name,
                            quantity: i.quantity,
                            unitCost: Number(i.unit_cost),
                            lineTotal: Number(i.line_total)
                        }));

                    return {
                        id: p.id,
                        date: p.date,
                        description: p.description,
                        products: '',
                        items: items,
                        quantity: p.quantity,
                        amount: Number(p.amount),
                        notes: p.notes,
                        status: p.status,
                        createdAt: p.created_at,
                        receivedAt: p.received_at,
                        rejectedAt: p.rejected_at
                    };
                });

            return {
                id: v.id,
                name: v.name,
                contact: v.contact,
                phone: v.phone,
                email: v.email,
                notes: v.notes,
                categories: v.categories || [],
                products: v.products || [],
                active: v.active !== false,
                purchases: purchases,
                createdAt: v.created_at
            };
        });

        console.log('Vendors loaded from Supabase:', vendors.length);
        vendorsLoadedAt = Date.now();
    } catch (err) {
        console.error('loadVendors error:', err);
        vendors = [];
    }
}

function saveVendors() {
    // localStorage writes removed – data now lives in Supabase
    if (typeof updateDashboardVendors === 'function') updateDashboardVendors();
}

function renderVendors() {
    const list = document.getElementById('vendors-list');
    if (!list) return;

    list.innerHTML = '';

    if (!vendors || vendors.length === 0) {
        list.innerHTML = `
            <div class="col-span-full text-center py-16">
                <i class="fas fa-truck text-6xl text-[#d4b78f] mb-4"></i>
                <p class="text-[#6B4423]">No vendors added yet.</p>
            </div>
        `;
        return;
    }

    vendors.forEach(vendor => {
        const isActive = vendor.active !== false;

        const card = document.createElement('div');
        card.className = 'bg-white border-2 border-[#6B4423] rounded-2xl p-6 cursor-pointer hover:shadow-lg transition';
        card.onclick = () => showVendorDetail(vendor.id);

        card.innerHTML = `
            <div class="flex items-start justify-between mb-4">
                <div>
                    <h3 class="text-xl font-bold brand-green ${isActive ? '' : 'line-through text-gray-400'}">${escapeHtml(vendor.name)}</h3>
                    <p class="text-sm text-[#6B4423]">${escapeHtml(vendor.contact || '')}</p>
                </div>
                <span class="px-3 py-1 text-xs font-semibold rounded-full ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">
                    ${isActive ? 'Active' : 'Inactive'}
                </span>
            </div>
            <div class="space-y-1 text-sm text-[#6B4423]">
                <p><i class="fas fa-phone w-5"></i> ${escapeHtml(vendor.phone || '—')}</p>
                <p><i class="fas fa-envelope w-5"></i> ${escapeHtml(vendor.email || '—')}</p>
            </div>
        `;

        list.appendChild(card);
    });
}

function hideAddVendorModal() {
    const modal = document.getElementById('add-vendor-modal');
    if (modal) modal.classList.add('hidden');
}

let tempSelectedProducts = [];

function populateVendorCategorySelect() {
    const select = document.getElementById('new-vendor-categories');
    if (!select || typeof PRODUCT_CATALOG === 'undefined') return;

    const categories = [...new Set(PRODUCT_CATALOG.map(p => p.category))].sort();
    select.innerHTML = categories.map(cat =>
        `<option value="${cat}">${cat}</option>`
    ).join('');
}

function showAddVendorModal() {
    const modal = document.getElementById('add-vendor-modal');
    if (!modal) {
        alert('Add Vendor modal not found in HTML.');
        return;
    }

    // Clear fields
    const nameEl = document.getElementById('new-vendor-name');
    const contactEl = document.getElementById('new-vendor-contact');
    const phoneEl = document.getElementById('new-vendor-phone');
    const emailEl = document.getElementById('new-vendor-email');
    const notesEl = document.getElementById('new-vendor-notes');

    if (nameEl) nameEl.value = '';
    if (contactEl) contactEl.value = '';
    if (phoneEl) phoneEl.value = '';
    if (emailEl) emailEl.value = '';
    if (notesEl) notesEl.value = '';

    // Reset categories + products
    tempSelectedProducts = [];
    updateProductCountDisplay();
    

    modal.classList.remove('hidden');
    if (nameEl) nameEl.focus();
}

function updateProductCountDisplay() {
    const el = document.getElementById('new-vendor-product-count');
    if (el) {
        const count = tempSelectedProducts.length;
        el.textContent = count === 1 ? '1 product selected' : `${count} products selected`;
    }
}

function openProductChooser() {
    // Pre-fill the temporary list from what is already selected
    // (tempSelectedProducts is already the source of truth)

    // Populate category filter
    const catSelect = document.getElementById('chooser-category');
    if (catSelect && typeof PRODUCT_CATALOG !== 'undefined') {
        const categories = [...new Set(PRODUCT_CATALOG.map(p => p.category))].sort();
        catSelect.innerHTML = '<option value="all">All Categories</option>' +
            categories.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    // Clear search
    const searchEl = document.getElementById('chooser-search');
    if (searchEl) searchEl.value = '';

    renderProductChooserList();

    const modal = document.getElementById('product-chooser-modal');
    if (modal) modal.classList.remove('hidden');
}

function hideProductChooser() {
    const modal = document.getElementById('product-chooser-modal');
    if (modal) modal.classList.add('hidden');
}

function renderProductChooserList() {
    const list = document.getElementById('chooser-product-list');
    if (!list || typeof PRODUCT_CATALOG === 'undefined') return;

    const search = (document.getElementById('chooser-search')?.value || '').toLowerCase();
    const category = document.getElementById('chooser-category')?.value || 'all';

    let products = PRODUCT_CATALOG.slice();

    if (category !== 'all') {
        products = products.filter(p => p.category === category);
    }
    if (search) {
        products = products.filter(p =>
            p.name.toLowerCase().includes(search) ||
            (p.subCategory || '').toLowerCase().includes(search)
        );
    }

    if (products.length === 0) {
        list.innerHTML = '<p class="text-[#6B4423] text-sm p-2">No products match.</p>';
        return;
    }

    list.innerHTML = products.map(p => {
        const checked = tempSelectedProducts.includes(p.name) ? 'checked' : '';
        return `
            <label class="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-[#f8f4eb] cursor-pointer">
                <input type="checkbox" value="${p.name.replace(/"/g, '&quot;')}" ${checked}
                       onchange="toggleChooserProduct(this)">
                <span class="text-sm">${escapeHtml(p.name)}</span>
            </label>
        `;
    }).join('');

    updateChooserSelectedCount();
}

function toggleChooserProduct(checkbox) {
    const name = checkbox.value;
    if (checkbox.checked) {
        if (!tempSelectedProducts.includes(name)) {
            tempSelectedProducts.push(name);
        }
    } else {
        tempSelectedProducts = tempSelectedProducts.filter(n => n !== name);
    }
    updateChooserSelectedCount();
}

function toggleChooserSelectAll() {
    const selectAll = document.getElementById('chooser-select-all');
    const checkboxes = document.querySelectorAll('#chooser-product-list input[type="checkbox"]');

    checkboxes.forEach(cb => {
        cb.checked = selectAll.checked;
        const name = cb.value;
        if (selectAll.checked) {
            if (!tempSelectedProducts.includes(name)) tempSelectedProducts.push(name);
        } else {
            tempSelectedProducts = tempSelectedProducts.filter(n => n !== name);
        }
    });
    updateChooserSelectedCount();
}

function updateChooserSelectedCount() {
    const el = document.getElementById('chooser-selected-count');
    if (el) {
        const count = tempSelectedProducts.length;
        el.textContent = count === 1 ? '1 product selected' : `${count} products selected`;
    }
}

function confirmProductChooser() {
    updateProductCountDisplay();
    hideProductChooser();
}

async function saveNewVendor(event) {
    event.preventDefault();

    const name = (document.getElementById('new-vendor-name')?.value || '').trim();
    if (!name) {
        alert('Vendor name is required.');
        return;
    }

    if (!tempSelectedProducts || tempSelectedProducts.length === 0) {
        alert('Please select at least one product for this vendor.');
        return;
    }

    const contact = (document.getElementById('new-vendor-contact')?.value || '').trim();
    const phone = (document.getElementById('new-vendor-phone')?.value || '').trim();
    const email = (document.getElementById('new-vendor-email')?.value || '').trim();
    const notes = (document.getElementById('new-vendor-notes')?.value || '').trim();

    try {
        const { data, error } = await supabaseClient
            .from('vendors')
            .insert({
                name: name,
                contact: contact || null,
                phone: phone || null,
                email: email || null,
                notes: notes || null,
                categories: [],
                products: [...tempSelectedProducts],
                active: true
            })
            .select()
            .single();

        if (error) throw error;

        // Refresh from Supabase
        await loadVendors();
        renderVendors();
        hideAddVendorModal();

        if (typeof updateDashboardVendors === 'function') {
            updateDashboardVendors();
        }

        alert('Vendor added: ' + name + '\nProducts: ' + tempSelectedProducts.length);
    } catch (err) {
        console.error('saveNewVendor error:', err);
        alert('Could not save vendor.\n' + (err.message || ''));
    }
}

async function loadVendorPurchases(vendorId) {
    try {
        const { data, error } = await supabaseClient
            .from('vendor_purchases')
            .select('id, vendor_id, date, description, quantity, amount, notes, status, created_at')
            .eq('vendor_id', vendorId)
            .order('date', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('loadVendorPurchases error:', err);
        return [];
    }
}

async function showVendorDetail(vendorId) {
    if (vendorId == null || vendorId === '') {
        console.error('showVendorDetail: no vendorId');
        return;
    }

    let vendor = null;

    // Always load full row from Supabase so contact/phone/email are present
    try {
        const { data, error } = await supabaseClient
            .from('vendors')
            .select('id, name, contact, phone, email, notes, categories, products, active, created_at, updated_at')
            .eq('id', vendorId)
            .maybeSingle();

        if (error) throw error;

        if (data) {
            vendor = {
                id: data.id,
                name: data.name || '',
                contact: data.contact || '',
                phone: data.phone || '',
                email: data.email || '',
                notes: data.notes || '',
                categories: data.categories || [],
                products: data.products || [],
                active: data.active !== false,
                purchases: []
            };

            // Keep in-memory list in sync
            const idx = (vendors || []).findIndex(v => String(v.id) === String(vendorId));
            if (idx >= 0) {
                vendors[idx] = { ...vendors[idx], ...vendor };
            }
        }
    } catch (err) {
        console.error('showVendorDetail fetch error:', err);
    }

    // Fallback to memory only if fetch failed
    if (!vendor) {
        vendor = (vendors || []).find(v => String(v.id) === String(vendorId)) || null;
    }

    if (!vendor) {
        alert('Vendor not found.');
        return;
    }

    window.currentVendorId = vendor.id;

    const modal = document.getElementById('vendor-modal');
    if (!modal) {
        console.error('vendor-modal not found in HTML');
        return;
    }

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (!el) {
            console.warn('Missing modal element:', id);
            return;
        }
        el.textContent = value;
    };

    setText('vendor-modal-name', vendor.name || 'Vendor');
    setText('vendor-modal-contact', vendor.contact || 'No contact listed');
    setText('vendor-modal-phone', vendor.phone || 'N/A');
    setText('vendor-modal-email', vendor.email || 'N/A');
    setText('vendor-modal-notes', vendor.notes || 'None');

    const isActive = vendor.active !== false;
    const statusArea = document.getElementById('vendor-status-area');
    if (statusArea) {
        statusArea.innerHTML = isActive
            ? `<span class="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700 mr-2">Active</span>
               <button type="button" onclick="toggleVendorStatus()" class="px-3 py-1 text-xs border border-red-400 text-red-600 rounded-lg hover:bg-red-50">Mark Inactive</button>`
            : `<span class="px-3 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-600 mr-2">Inactive</span>
               <button type="button" onclick="toggleVendorStatus()" class="px-3 py-1 text-xs border border-green-600 text-green-700 rounded-lg hover:bg-green-50">Mark Active</button>`;
    }

    const historyContainer = document.getElementById('vendor-modal-recent-orders')
        || modal.querySelector('.bg-\\[\\#f8f4eb\\]');

    if (historyContainer) {
        historyContainer.innerHTML = `
            <p class="text-sm text-[#6B4423] font-semibold mb-3">Recent Orders (last 5)</p>
            <p class="text-sm text-[#6B4423]">Loading…</p>
        `;
    }

    modal.style.display = '';
    modal.classList.remove('hidden');

    const purchases = typeof loadVendorPurchases === 'function'
        ? await loadVendorPurchases(vendor.id)
        : [];
    vendor.purchases = purchases;

    if (historyContainer) {
        if (!purchases.length) {
            historyContainer.innerHTML = `
                <p class="text-sm text-[#6B4423] font-semibold mb-3">Recent Orders (last 5)</p>
                <p class="text-sm text-[#6B4423]">No orders yet.</p>
            `;
        } else {
            const rows = purchases.slice(0, 5).map(p => {
                const dateObj = new Date(p.date || p.created_at || 0);
                const formattedDate = isNaN(dateObj.getTime())
                    ? '—'
                    : dateObj.toLocaleDateString();
                const amount = parseFloat(p.amount) || 0;
                const label = p.description || 'Order';
                return `
                    <div class="flex justify-between items-center text-sm border-b border-[#d4b78f] pb-2 gap-2">
                        <span class="whitespace-nowrap">${formattedDate}</span>
                        <span class="truncate flex-1 text-center">${label}</span>
                        <span class="font-bold brand-green whitespace-nowrap">$${amount.toFixed(2)}</span>
                    </div>
                `;
            }).join('');

            historyContainer.innerHTML = `
                <p class="text-sm text-[#6B4423] font-semibold mb-3">Recent Orders (last 5)</p>
                <div class="space-y-2">${rows}</div>
            `;
        }
    }
}

async function toggleVendorStatus() {
    const vendor = vendors.find(v => v.id === window.currentVendorId);
    if (!vendor) {
        alert('Vendor not found');
        return;
    }

    const newActive = vendor.active === false ? true : false;

    try {
        const { error } = await supabaseClient
            .from('vendors')
            .update({ active: newActive })
            .eq('id', vendor.id);

        if (error) throw error;

        await loadVendors();
        renderVendors();
        showVendorDetail(vendor.id);

        if (typeof updateDashboardVendors === 'function') {
            updateDashboardVendors();
        }
    } catch (err) {
        console.error('toggleVendorStatus error:', err);
        alert('Could not update vendor status.\n' + (err.message || ''));
    }
}

function hideVendorModal() {
    const modal = document.getElementById('vendor-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.style.display = '';
}

function editVendor() {
    const vendor = vendors.find(v => v.id === window.currentVendorId);
    if (!vendor) return;

    // Fill the edit form
    document.getElementById('edit-vendor-name').value = vendor.name || '';
    document.getElementById('edit-vendor-contact').value = vendor.contact || '';
    document.getElementById('edit-vendor-phone').value = vendor.phone || '';
    document.getElementById('edit-vendor-email').value = vendor.email || '';
    document.getElementById('edit-vendor-notes').value = vendor.notes || '';

    // Hide the detail modal and show the edit modal
    hideVendorModal();
    document.getElementById('edit-vendor-modal').classList.remove('hidden');
}

function hideEditVendorModal() {
    document.getElementById('edit-vendor-modal').classList.add('hidden');
}

async function saveEditedVendor(event) {
    event.preventDefault();

    const vendor = vendors.find(v => v.id === window.currentVendorId);
    if (!vendor) return;

    const name = document.getElementById('edit-vendor-name').value.trim();
    const contact = document.getElementById('edit-vendor-contact').value.trim();
    const phone = document.getElementById('edit-vendor-phone').value.trim();
    const email = document.getElementById('edit-vendor-email').value.trim();
    const notes = document.getElementById('edit-vendor-notes').value.trim();

    if (!name) {
        alert('Vendor name is required.');
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('vendors')
            .update({
                name: name,
                contact: contact || null,
                phone: phone || null,
                email: email || null,
                notes: notes || null
            })
            .eq('id', vendor.id);

        if (error) throw error;

        await loadVendors();
        renderVendors();
        hideEditVendorModal();
        showVendorDetail(vendor.id);

        if (typeof updateDashboardVendors === 'function') {
            updateDashboardVendors();
        }
    } catch (err) {
        console.error('saveEditedVendor error:', err);
        alert('Could not update vendor.\n' + (err.message || ''));
    }
}

function startVendorOrder() {
    const vendor = vendors.find(v => v.id === window.currentVendorId);
    if (!vendor) return;

    // Use the products that were assigned to this vendor
    let productNames = Array.isArray(vendor.products) ? vendor.products : [];

    // If the vendor has no products assigned, fall back to the full catalog
    // (you can change this later if you prefer a strict empty state)
    if (productNames.length === 0) {
        productNames = PRODUCT_CATALOG.map(p => p.name);
    }

    // Build the working list for the order grid
    window.currentOrderProducts = productNames.map(name => {
        const catalogItem = PRODUCT_CATALOG.find(p => p.name === name);

        // Try to get a real unit cost from productCosts if it exists
        let unitCost = 1.00; // sensible default
        if (typeof productCosts !== 'undefined' && Array.isArray(productCosts)) {
            const costRecord = productCosts.find(c => c.productName === name);
            if (costRecord && costRecord.unitCost != null) {
                unitCost = Number(costRecord.unitCost);
            }
        } else if (catalogItem && catalogItem.unitPrice != null) {
            // fallback to catalog selling price if no cost exists yet
            unitCost = Number(catalogItem.unitPrice);
        }

        return {
            name: name,
            caseSize: catalogItem ? catalogItem.caseSize : '',
            unitCost: unitCost,
            quantity: 0
        };
    });

    // Set vendor name in the modal
    const nameEl = document.getElementById('vendor-order-vendor-name');
    if (nameEl) nameEl.textContent = vendor.name;

    // Build the grid
    renderVendorOrderGrid();

    // Show the modal
    const modal = document.getElementById('vendor-order-modal');
    if (modal) modal.classList.remove('hidden');
}

function renderVendorOrderGrid() {
    const tbody = document.getElementById('vendor-order-grid');
    if (!tbody || !window.currentOrderProducts) return;

    tbody.innerHTML = '';

    window.currentOrderProducts.forEach((product, index) => {
        const lineTotal = (product.unitCost * product.quantity).toFixed(2);

        const row = document.createElement('tr');
        row.className = 'border-b border-[#d4b78f]';

        row.innerHTML = `
            <td class="p-3">${escapeHtml(product.name)}</td>
            <td class="p-3 text-center">$${product.unitCost.toFixed(2)}</td>
            <td class="p-3 text-center">
                <input type="number" min="0" value="${product.quantity}"
                       class="w-20 border-2 border-[#6B4423] rounded-lg px-2 py-1 text-center"
                       onchange="updateOrderQuantity(${index}, this.value)">
            </td>
            <td class="p-3 text-right font-semibold" id="line-total-${index}">$${lineTotal}</td>
        `;

        tbody.appendChild(row);
    });

    updateOrderGrandTotal();
}

function updateOrderQuantity(index, value) {
    const qty = parseInt(value) || 0;
    window.currentOrderProducts[index].quantity = qty;

    const lineTotal = (window.currentOrderProducts[index].unitCost * qty).toFixed(2);
    const lineEl = document.getElementById(`line-total-${index}`);
    if (lineEl) lineEl.textContent = `$${lineTotal}`;

    updateOrderGrandTotal();
}

function updateOrderGrandTotal() {
    let total = 0;
    window.currentOrderProducts.forEach(p => {
        total += p.unitCost * p.quantity;
    });

    const totalEl = document.getElementById('vendor-order-total');
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
}

function hideVendorOrderModal() {
    document.getElementById('vendor-order-modal').classList.add('hidden');
}

async function submitVendorOrder() {
    const vendor = vendors.find(v => v.id === window.currentVendorId);
    if (!vendor || !window.currentOrderProducts) return;

    // Only keep products that have a quantity > 0
    const orderedItems = window.currentOrderProducts.filter(p => p.quantity > 0);

    if (orderedItems.length === 0) {
        alert('Please enter a quantity for at least one product.');
        return;
    }

    // Calculate totals and build items
    let totalAmount = 0;
    const items = [];

    orderedItems.forEach(item => {
        const lineTotal = item.unitCost * item.quantity;
        totalAmount += lineTotal;

        items.push({
            product_name: item.name,
            quantity: item.quantity,
            unit_cost: item.unitCost,
            line_total: lineTotal
        });
    });

    try {
        // 1. Insert the purchase header
        const { data: purchase, error: pErr } = await supabaseClient
            .from('vendor_purchases')
            .insert({
                vendor_id: vendor.id,
                date: new Date().toISOString().split('T')[0],
                description: `Order – ${orderedItems.length} product(s)`,
                quantity: orderedItems.reduce((sum, i) => sum + i.quantity, 0),
                amount: totalAmount,
                notes: 'Submitted via Create Order grid',
                status: 'pending'
            })
            .select()
            .single();

        if (pErr) throw pErr;

        // 2. Insert the line items
        const itemsPayload = items.map(i => ({
            purchase_id: purchase.id,
            product_name: i.product_name,
            quantity: i.quantity,
            unit_cost: i.unit_cost,
            line_total: i.line_total
        }));

        const { error: iErr } = await supabaseClient
            .from('vendor_purchase_items')
            .insert(itemsPayload);

        if (iErr) throw iErr;

        // 3. Refresh from Supabase so the nested shape is up to date
        await loadVendors();

        hideVendorOrderModal();
        hideVendorModal();

        // Re-open the vendor detail so the new purchase is visible
        showVendorDetail(vendor.id);

        alert(`Order submitted!\n\nTotal: $${totalAmount.toFixed(2)}\n\nThis has been added to the vendor’s Purchase History and will appear in Receive Purchase Orders.`);
    } catch (err) {
        console.error('submitVendorOrder error:', err);
        alert('Could not submit order.\n' + (err.message || ''));
    }
}

async function showVendorsSection() {
    showSection('vendors');
    if (isDataFresh(vendorsLoadedAt) && vendors) {
        if (typeof renderVendors === 'function') renderVendors();
    } else {
        await loadVendors();
        if (typeof renderVendors === 'function') renderVendors();
    }
    if (typeof updateDashboardVendors === 'function') {
        updateDashboardVendors();
    }
}

window.loadVendors = loadVendors;
window.saveVendors = saveVendors;
window.renderVendors = renderVendors;
window.hideAddVendorModal = hideAddVendorModal;
window.populateVendorCategorySelect = populateVendorCategorySelect;
window.showAddVendorModal = showAddVendorModal;
window.updateProductCountDisplay = updateProductCountDisplay;
window.openProductChooser = openProductChooser;
window.hideProductChooser = hideProductChooser;
window.renderProductChooserList = renderProductChooserList;
window.toggleChooserProduct = toggleChooserProduct;
window.toggleChooserSelectAll = toggleChooserSelectAll;
window.updateChooserSelectedCount = updateChooserSelectedCount;
window.confirmProductChooser = confirmProductChooser;
window.saveNewVendor = saveNewVendor;
window.loadVendorPurchases = loadVendorPurchases;
window.showVendorDetail = showVendorDetail;
window.toggleVendorStatus = toggleVendorStatus;
window.hideVendorModal = hideVendorModal;
window.editVendor = editVendor;
window.hideEditVendorModal = hideEditVendorModal;
window.saveEditedVendor = saveEditedVendor;
window.startVendorOrder = startVendorOrder;
window.renderVendorOrderGrid = renderVendorOrderGrid;
window.updateOrderQuantity = updateOrderQuantity;
window.updateOrderGrandTotal = updateOrderGrandTotal;
window.hideVendorOrderModal = hideVendorOrderModal;
window.submitVendorOrder = submitVendorOrder;
window.showVendorsSection = showVendorsSection;
