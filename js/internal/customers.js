// Internal portal — customer list, detail, add/edit, pricing, and map.
// Shared portal state (allCustomers, allOrders, salesmen, PRODUCT_CATALOG,
// supabaseClient, SUPABASE_URL, customersLoadedAt) stays global in internal-portal.js.
// ================== CUSTOMERS ==================
// --- Customers Helpers ---
async function loadCustomers() {
    showTableLoading('customer-list', 'Loading customers…');
    try {
        const { data, error } = await supabaseClient
            .from('customers')
            .select('id, name, company, email, phone, shipping_address, billing_address, notes, status, source, submitted_by, submitted_by_email, salesman_email, territory, monthly_amount, created_at, payment_method, payment_method_status, payment_method_details, password_changed, onboarding_complete, pricing_approved_at, pricing_approved_by, assigned_at, last_login_at, salesman_commission_percent, special_pricing, special_price_items')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error loading customers:", error);
            allCustomers = [];
        } else {
            allCustomers = (data || []).map(c => ({
                id: c.id,
                name: c.name,
                company: c.company,
                email: c.email,
                phone: c.phone,
                shippingAddress: c.shipping_address,
                billingAddress: c.billing_address,
                notes: c.notes,
                status: c.status,
                source: c.source,
                submittedBy: c.submitted_by,
                submittedByEmail: c.submitted_by_email,
                salesmanEmail: c.salesman_email,
                territory: c.territory || '',
                monthlyAmount: c.monthly_amount || '',
                balance: 0,
                created_at: c.created_at,
                payment_method: c.payment_method || null,
                payment_method_status: c.payment_method_status || null,
                payment_method_details: c.payment_method_details || null,
                password_changed: !!c.password_changed,
                onboarding_complete: !!c.onboarding_complete,
                pricingApprovedAt: c.pricing_approved_at || null,
                pricingApprovedBy: c.pricing_approved_by || null,
                assignedAt: c.assigned_at || null,
                lastLoginAt: c.last_login_at || null,
                salesmanCommissionPercent: c.salesman_commission_percent != null && c.salesman_commission_percent !== ''
                    ? Number(c.salesman_commission_percent)
                    : null,
                specialPricing: !!c.special_pricing,
                specialPriceItems: Array.isArray(c.special_price_items) ? c.special_price_items : [],
                lat: c.lat != null ? Number(c.lat) : null,
                lng: c.lng != null ? Number(c.lng) : null,
                placeId: c.place_id || null,
            }));
        }
    } catch (err) {
        console.error(err);
        allCustomers = [];
    }

    customersLoadedAt = Date.now();
    renderCustomers();
    if (typeof updateEstimatedSpendCard === 'function') updateEstimatedSpendCard();
}

function salesmanHasApprovedSheet(email) {
    const e = (email || '').toLowerCase().trim();
    if (!e) return false;
    const s = (salesmen || []).find(x => (x.email || '').toLowerCase().trim() === e);
    return !!(s && String(s.priceSheetStatus || '').toLowerCase() === 'approved');
}

let customerMassFilter = 'all'; // 'all' | 'active' | 'inactive' | 'test'

function isHiddenTestCustomer(customer) {
    const email = String((customer && customer.email) || '').toLowerCase().trim();
    const company = String((customer && customer.company) || '').toLowerCase();
    const name = String((customer && customer.name) || '').toLowerCase();
    if (email === 'jackerman@donegalnatural.com') return true;
    if (company.indexOf('admin test store') !== -1 || name.indexOf('admin test store') !== -1) return true;
    if (company.indexOf('brian test store') !== -1 || name.indexOf('brian test store') !== -1) return true;
    if (company.indexOf('test store') !== -1 || name.indexOf('test store') !== -1) return true;
    return false;
}

function isTestStoreOrder(order) {
    if (!order) return false;
    const mapped = {
        email: order.customerEmail || order.customer_email || '',
        company: order.customerCompany || order.customer_company || order.customer || '',
        name: order.customerName || order.customer_name || order.customer || ''
    };
    if (isHiddenTestCustomer(mapped)) return true;
    const id = order.customerId || order.customer_id;
    if (id && typeof allCustomers !== 'undefined' && Array.isArray(allCustomers)) {
        const row = allCustomers.find(function (c) { return String(c.id) === String(id); });
        if (row && isHiddenTestCustomer(row)) return true;
    }
    return false;
}

function setCustomerMassFilter(filter) {
    customerMassFilter = filter || 'all';
    renderCustomers();
}

let customerSalesmanFilter = '';

function setCustomerSalesmanFilter(email) {
    customerSalesmanFilter = String(email || '').toLowerCase().trim();
    renderCustomers();
}

function clearCustomerListFilters() {
    customerMassFilter = 'all';
    customerSalesmanFilter = '';
    renderCustomers();
}

function renderCustomers() {
    const container = document.getElementById('customer-list');
    if (!container) return;

    const searchTerm = (document.getElementById('customer-search')?.value || '').toLowerCase().trim();

    let filteredCustomers = allCustomers || [];
    if (searchTerm) {
        filteredCustomers = filteredCustomers.filter(c =>
            (c.name || '').toLowerCase().includes(searchTerm) ||
            (c.company && c.company.toLowerCase().includes(searchTerm))
        );
    }

    if (customerMassFilter === 'test') {
        filteredCustomers = filteredCustomers.filter(c => isHiddenTestCustomer(c));
    } else {
        filteredCustomers = filteredCustomers.filter(c => !isHiddenTestCustomer(c));
        if (customerMassFilter === 'active') {
            filteredCustomers = filteredCustomers.filter(c => isCustomerEnabled(c.status));
        } else if (customerMassFilter === 'inactive') {
            filteredCustomers = filteredCustomers.filter(c => !isCustomerEnabled(c.status));
        }
    }

    if (customerSalesmanFilter) {
        filteredCustomers = filteredCustomers.filter(c =>
            (c.salesmanEmail || '').toLowerCase().trim() === customerSalesmanFilter
        );
    }

    if ((!salesmen || salesmen.length === 0) && typeof loadSalesmen === 'function') {
        loadSalesmen().then(() => renderCustomers());
    }

    if (filteredCustomers.length === 0) {
        container.innerHTML = `
            <div class="col-span-full bg-[#f8f4eb] border-2 border-[#6B4423] rounded-2xl p-4 mb-4">
                <div class="flex gap-2">
                    <button type="button" onclick="setCustomerMassFilter('all')"
                            class="px-3 py-1 text-xs font-semibold rounded-full border-2 ${customerMassFilter === 'all' ? 'bg-[#1E4D2B] text-[#d4b78f] border-[#1E4D2B]' : 'border-[#6B4423] text-[#6B4423] hover:bg-white'}">
                        All
                    </button>
                    <button type="button" onclick="setCustomerMassFilter('active')"
                            class="px-3 py-1 text-xs font-semibold rounded-full border-2 ${customerMassFilter === 'active' ? 'bg-[#1E4D2B] text-[#d4b78f] border-[#1E4D2B]' : 'border-[#6B4423] text-[#6B4423] hover:bg-white'}">
                        Active
                    </button>
                    <button type="button" onclick="setCustomerMassFilter('inactive')"
                            class="px-3 py-1 text-xs font-semibold rounded-full border-2 ${customerMassFilter === 'inactive' ? 'bg-[#1E4D2B] text-[#d4b78f] border-[#1E4D2B]' : 'border-[#6B4423] text-[#6B4423] hover:bg-white'}">
                        Inactive
                    </button>
                    <button type="button" onclick="setCustomerMassFilter('test')"
                            class="px-3 py-1 text-xs font-semibold rounded-full border-2 ${customerMassFilter === 'test' ? 'bg-[#1E4D2B] text-[#d4b78f] border-[#1E4D2B]' : 'border-[#6B4423] text-[#6B4423] hover:bg-white'}">
                        Test Stores
                    </button>
                </div>
            </div>
            <div class="col-span-full text-center py-12">
                <i class="fas fa-users text-6xl text-[#d4b78f] mb-4"></i>
                <p class="text-[#6B4423]">${
                    customerMassFilter === 'active' ? 'No active customers.' :
                    customerMassFilter === 'inactive' ? 'No inactive customers.' :
                    customerMassFilter === 'test' ? 'No test stores.' :
                    'No customers found.'
                }</p>
                <button type="button" onclick="clearCustomerListFilters()"
                        class="mt-4 px-4 py-2 text-sm font-semibold rounded-xl bg-[#1E4D2B] text-[#d4b78f]">
                    Show all customers
                </button>
            </div>
        `;
        return;
    }

    const salesmanOptions = (salesmen || [])
        .filter(s => s.active !== false)
        .map(s => {
            const name = s.name || [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email || '';
            const email = (s.email || '').toLowerCase().trim();
            const selected = customerSalesmanFilter === email ? ' selected' : '';
            return `<option value="${escapeHtml(email)}"${selected}>${escapeHtml(name)}${s.territory ? ' — ' + escapeHtml(s.territory) : ''}</option>`;
        }).join('');

    let html = `
        <div class="col-span-full bg-[#f8f4eb] border-2 border-[#6B4423] rounded-2xl p-4 mb-4">
            <div class="flex flex-wrap items-center gap-3 mb-3">
                <label class="flex items-center gap-2 text-sm font-semibold text-[#1E4D2B] cursor-pointer">
                    <input type="checkbox" id="customer-select-all" onchange="toggleSelectAllCustomers(this)" class="w-4 h-4 accent-[#1E4D2B]">
                    Select all
                </label>
                <div class="flex gap-2">
                    <button type="button" onclick="setCustomerMassFilter('all')"
                            class="px-3 py-1 text-xs font-semibold rounded-full border-2 ${customerMassFilter === 'all' ? 'bg-[#1E4D2B] text-[#d4b78f] border-[#1E4D2B]' : 'border-[#6B4423] text-[#6B4423] hover:bg-white'}">
                        All
                    </button>
                    <button type="button" onclick="setCustomerMassFilter('active')"
                            class="px-3 py-1 text-xs font-semibold rounded-full border-2 ${customerMassFilter === 'active' ? 'bg-[#1E4D2B] text-[#d4b78f] border-[#1E4D2B]' : 'border-[#6B4423] text-[#6B4423] hover:bg-white'}">
                        Active
                    </button>
                    <button type="button" onclick="setCustomerMassFilter('inactive')"
                            class="px-3 py-1 text-xs font-semibold rounded-full border-2 ${customerMassFilter === 'inactive' ? 'bg-[#1E4D2B] text-[#d4b78f] border-[#1E4D2B]' : 'border-[#6B4423] text-[#6B4423] hover:bg-white'}">
                        Inactive
                    </button>
                    <button type="button" onclick="setCustomerMassFilter('test')"
                            class="px-3 py-1 text-xs font-semibold rounded-full border-2 ${customerMassFilter === 'test' ? 'bg-[#1E4D2B] text-[#d4b78f] border-[#1E4D2B]' : 'border-[#6B4423] text-[#6B4423] hover:bg-white'}">
                        Test Stores
                    </button>
                </div>
            </div>
            <div class="flex flex-wrap items-center gap-3">
                <select id="customer-salesman-filter"
                        onchange="setCustomerSalesmanFilter(this.value)"
                        class="border-2 border-[#6B4423] rounded-xl px-3 py-2 text-sm min-w-[200px]">
                    <option value="">All salesmen</option>
                    ${salesmanOptions}
                </select>
            </div>
        </div>
        <div class="col-span-full flex flex-wrap gap-3 mb-2">
            <button type="button" onclick="setAllCustomersActive(true)"
                    class="px-4 py-2 text-sm font-semibold rounded-xl bg-green-700 text-white hover:bg-green-800">
                Enable selected
            </button>
            <button type="button" onclick="setAllCustomersActive(false)"
                    class="px-4 py-2 text-sm font-semibold rounded-xl bg-red-700 text-white hover:bg-red-800">
                Disable selected
            </button>
        </div>
    `;

    filteredCustomers.forEach(customer => {
        const balanceClass = customer.balance > 0 ? 'text-red-600' : 'text-green-600';
        const isAchApproved =
            String(customer.payment_method || '').toLowerCase() === 'ach' &&
            String(customer.payment_method_status || '').toLowerCase() === 'approved';
        const safeId = String(customer.id || '').replace(/'/g, "\\'");
        const safeName = (customer.name || '').replace(/'/g, "\\'");

        html += `
            <div class="bg-white border-2 border-[#6B4423] rounded-2xl p-6 hover:shadow-lg transition relative">
                <div class="absolute top-3 left-3" onclick="event.stopPropagation()">
                    <input type="checkbox" class="customer-mass-checkbox w-4 h-4 accent-[#1E4D2B]"
                           value="${safeId}" onchange="updateMassAssignCount()">
                </div>
                <div onclick="showCustomerDetail('${safeName}')" class="cursor-pointer pl-6">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="text-xl font-bold brand-green">${escapeHtml(customer.name)}</h3>
                            <p class="text-sm text-[#6B4423]">${escapeHtml(customer.company || 'Individual')}</p>
                        </div>
                        <div class="flex flex-col items-end gap-1">
                            <button type="button"
                                    title="${isCustomerEnabled(customer.status) ? 'Click to disable' : 'Click to enable'}"
                                    onclick="toggleCustomerActive('${safeId}', event)"
                                    class="px-3 py-1 text-xs font-semibold rounded-full cursor-pointer transition
                                           ${isCustomerEnabled(customer.status)
                                               ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                               : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}">
                                ${isCustomerEnabled(customer.status) ? 'Active' : 'Inactive'}
                            </button>
                            ${!customer.password_changed
                                ? `<span class="px-2 py-0.5 text-xs font-bold rounded-full bg-orange-100 text-orange-800">Needs Password</span>`
                                : ''}
              
                            ${isAchApproved ? `<span class="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800">ACH Approved</span>` : ''}
                                                        ${!customer.pricingApprovedAt ? `
                                <button type="button"
                                        onclick="event.stopPropagation(); openSetCustomerPricing('${safeId}')"
                                        class="px-3 py-1 text-xs font-semibold rounded-full bg-[#1E4D2B] text-[#d4b78f] hover:bg-[#254a2f]">
                                    Set Pricing
                                </button>` : `
                                <span class="px-2 py-0.5 text-xs font-bold rounded-full bg-green-100 text-green-800">Pricing approved</span>`}
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p class="text-[#6B4423] text-xs">Territory</p>
                            <p class="font-semibold">${escapeHtml(customer.territory || 'N/A')}</p>
                        </div>
                        <div>
                            <p class="text-[#6B4423] text-xs">Est. monthly</p>
                            <p class="font-semibold">${escapeHtml(customer.monthlyAmount || 'Not set')}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-[#6B4423] text-xs">Balance Owed</p>
                            <p class="font-bold ${balanceClass}">$${(customer.balance || 0).toLocaleString()}</p>
                        </div>
                    </div>
                    ${customer.salesmanEmail
                        ? `<p class="text-xs text-[#6B4423] mt-2">Salesman: ${escapeHtml(customer.salesmanEmail)}</p>`
                        : `<p class="text-xs text-orange-600 mt-2">Unassigned</p>`}
                    <p class="text-xs text-[#6B4423] mt-1">Last login: ${
                        customer.lastLoginAt
                            ? new Date(customer.lastLoginAt).toLocaleString()
                            : 'Never'
                    }</p>
                    <p class="text-xs mt-1 ${formatCustomerPaymentLabel(customer) ? 'text-[#1E4D2B]' : 'text-orange-700'}">
                        Payment: ${escapeHtml(formatCustomerPaymentLabel(customer) || 'None on file')}
                    </p>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    updateMassAssignCount();
}

function toggleSelectAllCustomers(checkbox) {
    document.querySelectorAll('.customer-mass-checkbox').forEach(cb => {
        cb.checked = checkbox.checked;
    });
    updateMassAssignCount();
}

function updateMassAssignCount() {
    const n = document.querySelectorAll('.customer-mass-checkbox:checked').length;
    const el = document.getElementById('mass-assign-count');
    if (el) el.textContent = n > 0 ? n + ' selected' : '';
}

async function massAssignSelectedCustomers() {
    const checked = Array.from(document.querySelectorAll('.customer-mass-checkbox:checked'));
    if (checked.length === 0) {
        alert('Select at least one customer.');
        return;
    }

    const salesmanEmail = (document.getElementById('mass-assign-salesman')?.value || '').trim().toLowerCase();
    if (!salesmanEmail) {
        alert('Choose a salesman first.');
        return;
    }

    if ((!salesmen || salesmen.length === 0) && typeof loadSalesmen === 'function') {
        await loadSalesmen();
    }

    const salesman = (salesmen || []).find(s => (s.email || '').toLowerCase().trim() === salesmanEmail);
    const salesmanName = salesman
        ? (salesman.name || [salesman.firstName, salesman.lastName].filter(Boolean).join(' ') || salesmanEmail)
        : salesmanEmail;

    const hasSheet = salesmanHasApprovedSheet(salesmanEmail);
    const ids = checked.map(cb => cb.value).filter(Boolean);

    if (!confirm(
        `Assign ${ids.length} customer(s) to ${salesmanName}?\n\n` +
        (hasSheet
            ? 'This salesman has an approved price sheet — customers without pricing access will be unlocked immediately.'
            : 'This salesman does not yet have an approved price sheet — pricing will stay locked until approved.')
    )) return;

    const admin = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const approvedBy = admin.fullName || admin.name || admin.email || 'Admin';
    const now = new Date().toISOString();

    try {
        const { error: assignErr } = await supabaseClient
            .from('customers')
            .update({
                salesman_email: salesmanEmail,
                assigned_at: now,
                updated_at: now
            })
            .in('id', ids);

        if (assignErr) throw assignErr;

        for (let i = 0; i < ids.length; i++) {
            const row = (allCustomers || []).find(function (c) {
                return String(c.id) === String(ids[i]);
            });
            if (!row) continue;
            const moved = await applyNewSalesmanPriceSheetToCustomer(row, salesmanEmail);
            if (!moved.ok) {
                console.warn('Price sheet copy failed', row.company || row.name, moved.reason);
            }
        }

        if (hasSheet) {
            const needUnlock = (allCustomers || []).filter(c =>
                ids.includes(String(c.id)) && !c.pricingApprovedAt
            ).map(c => c.id);

            if (needUnlock.length > 0) {
                const { error: unlockErr } = await supabaseClient
                    .from('customers')
                    .update({
                        pricing_approved_at: now,
                        pricing_approved_by: approvedBy,
                        updated_at: now
                    })
                    .in('id', needUnlock);

                if (unlockErr) throw unlockErr;
                const unlockedRows = (allCustomers || []).filter(function (c) {
                    return needUnlock.indexOf(c.id) !== -1;
                });
                for (let i = 0; i < unlockedRows.length; i++) {
                    await notifyCustomerPricingReady(unlockedRows[i]);
                }
                for (let i = 0; i < needUnlock.length; i++) {
                    const row = (allCustomers || []).find(function (c) {
                        return String(c.id) === String(needUnlock[i]);
                    });
                    if (row && typeof notifyCustomerPricingReady === 'function') {
                        await notifyCustomerPricingReady(row);
                    }
                }
            }
        }

        await loadCustomers();
        alert(
            `Assigned ${ids.length} customer(s) to ${salesmanName}.` +
            (hasSheet ? '\nPricing unlocked for any that were still locked.' : '')
        );
    } catch (err) {
        console.error('massAssignSelectedCustomers error:', err);
        alert('Could not assign customers.\n' + (err.message || ''));
    }
}

function updateTotalOrdersBadge() {
    const badge = document.getElementById('orders-total-count');
    if (!badge) return;

    // Always show current total orders in the system
    const total = (typeof allOrders !== 'undefined' && Array.isArray(allOrders))
    ? allOrders.length
    : 0;

    badge.textContent = total;
}

function searchCustomers() {
    renderCustomers();
}

function addTestCustomer() {
    const newCustomer = {
        id: Date.now(),
        name: "Test Customer " + Math.floor(Math.random() * 1000),
        company: "Test Company LLC",
        email: "test" + Date.now() + "@example.com",
        phone: "555-0100",
        territory: "Pennsylvania",
        balance: Math.floor(Math.random() * 5000),
        status: "Active",
        address: "123 Test Street, Altoona, PA 16601",
        notes: "Added for testing purposes.",
        created_at: new Date().toISOString()
    };

    allCustomers.unshift(newCustomer);
    localStorage.setItem("customers", JSON.stringify(allCustomers));
    renderCustomers();
}

async function initAddCustomerPlaces() {
    const host = document.getElementById('new-customer-ship-places-host');
    const streetEl = document.getElementById('new-customer-ship-street');
    if (!host || !streetEl || host.dataset.bound === '1') return;
    if (!window.google || !google.maps || !google.maps.importLibrary) return;
    try {
        const placesLib = await google.maps.importLibrary('places');
        const PlaceAutocompleteElement = placesLib.PlaceAutocompleteElement;
        if (!PlaceAutocompleteElement) return;
        const widget = new PlaceAutocompleteElement({
            includedRegionCodes: ['us'],
            requestedLanguage: 'en'
        });
        widget.setAttribute('no-input-icon', '');
        widget.setAttribute('no-clear-button', '');
        widget.style.width = '100%';
        host.innerHTML = '';
        host.appendChild(widget);
        host.dataset.bound = '1';

        widget.addEventListener('gmp-select', async function (event) {
            const place = event.placePrediction && event.placePrediction.toPlace
                ? event.placePrediction.toPlace()
                : null;
            if (!place) return;
            await place.fetchFields({
                fields: ['formattedAddress', 'addressComponents', 'location', 'id']
            });
            const comps = place.addressComponents || [];
            function comp(type) {
                const row = comps.find(function (c) {
                    return (c.types || []).indexOf(type) !== -1;
                });
                return row ? (row.longText || row.shortText || '') : '';
            }
            const streetNum = comp('street_number');
            const route = comp('route');
            const street = [streetNum, route].filter(Boolean).join(' ') || (place.formattedAddress || '').split(',')[0];
            streetEl.value = street;
            widget.value = street;
            const cityEl = document.getElementById('new-customer-ship-city');
            const stateEl = document.getElementById('new-customer-ship-state');
            const zipEl = document.getElementById('new-customer-ship-zip');
            if (cityEl) cityEl.value = comp('locality') || comp('sublocality') || '';
            if (stateEl) stateEl.value = (comp('administrative_area_level_1') || '').slice(0, 2).toUpperCase();
            if (zipEl) zipEl.value = comp('postal_code') || '';
            const loc = place.location;
            const lat = loc ? (typeof loc.lat === 'function' ? loc.lat() : loc.lat) : '';
            const lng = loc ? (typeof loc.lng === 'function' ? loc.lng() : loc.lng) : '';
            const latEl = document.getElementById('new-customer-ship-lat');
            const lngEl = document.getElementById('new-customer-ship-lng');
            const placeEl = document.getElementById('new-customer-ship-place');
            if (latEl) latEl.value = lat || '';
            if (lngEl) lngEl.value = lng || '';
            if (placeEl) placeEl.value = place.id || '';
        });
        widget.addEventListener('input', function () {
            streetEl.value = widget.value || '';
        });
    } catch (err) {
        console.warn('Add Customer Places widget:', err);
    }
}

function showAddCustomerModal() {
    const modal = document.getElementById('add-customer-modal');
    if (!modal) {
        alert('Add Customer modal not found.');
        return;
    }

    const fields = [
        'new-customer-name',
        'new-customer-company',
        'new-customer-email',
        'new-customer-phone',
        'new-customer-territory',
        'new-customer-notes',
        'new-customer-ship-street',
        'new-customer-ship-apt',
        'new-customer-ship-city',
        'new-customer-ship-state',
        'new-customer-ship-zip',
        'new-customer-bill-street',
        'new-customer-bill-apt',
        'new-customer-bill-city',
        'new-customer-bill-state',
        'new-customer-bill-zip'
    ];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const sameCb = document.getElementById('new-customer-same-address');
    if (sameCb) sameCb.checked = true;
    const billingFields = document.getElementById('new-customer-billing-fields');
    if (billingFields) billingFields.classList.add('hidden');

    modal.classList.remove('hidden');
        initAddCustomerPlaces();
    document.getElementById('new-customer-name')?.focus();
}

function hideAddCustomerModal() {
    const modal = document.getElementById('add-customer-modal');
    if (modal) modal.classList.add('hidden');
}

async function assertCustomerEmailAvailable(email) {
    const emailNorm = (email || '').trim().toLowerCase();
    if (!emailNorm || !emailNorm.includes('@')) {
        throw new Error('A valid email is required.');
    }

    const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('email, role')
        .ilike('email', emailNorm)
        .maybeSingle();
    if (profileError) {
        console.warn('profiles email check failed:', profileError);
    }
    if (profile && (profile.role === 'admin' || profile.role === 'salesman')) {
        throw new Error('This email is already a ' + profile.role + ' login. Use a different customer email.');
    }
    if (profile && profile.role === 'customer') {
        throw new Error('A customer login already exists for this email.');
    }

    const { data: existingCustomer } = await supabaseClient
        .from('customers')
        .select('id, name, email')
        .ilike('email', emailNorm)
        .maybeSingle();
    if (existingCustomer) {
        const who = existingCustomer.name ? ' (' + existingCustomer.name + ')' : '';
        throw new Error('A customer record already exists for this email' + who + '.');
    }
}

function normalizeStoreKey(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function findExactStoreMatch(matches, name, company) {
    const want = [normalizeStoreKey(name), normalizeStoreKey(company)].filter(Boolean);
    if (!want.length || !Array.isArray(matches) || !matches.length) return null;
    function isSameStore(a, b) {
        if (!a || !b) return false;
        if (a === b) return true;
        if (a.length >= 5 && b.length >= 5 && (a.indexOf(b) !== -1 || b.indexOf(a) !== -1)) return true;
        return false;
    }
    const hits = matches.filter(function (c) {
        const keys = [normalizeStoreKey(c.name), normalizeStoreKey(c.company)].filter(Boolean);
        return keys.some(function (k) {
            return want.some(function (w) { return isSameStore(k, w); });
        });
    });
    if (!hits.length) return null;
    if (hits.length === 1) return hits[0];
    const exact = hits.filter(function (c) {
        const keys = [normalizeStoreKey(c.name), normalizeStoreKey(c.company)].filter(Boolean);
        return keys.some(function (k) { return want.indexOf(k) !== -1; });
    });
    return exact.length === 1 ? exact[0] : hits[0];
}

async function matchCustomerForInquiryApproval(email) {
    const emailNorm = (email || '').trim().toLowerCase();
    if (!emailNorm || !emailNorm.includes('@')) {
        throw new Error('A valid email is required.');
    }

    const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('email, role')
        .ilike('email', emailNorm)
        .maybeSingle();
    if (profileError) {
        console.warn('profiles email check failed:', profileError);
    }
    if (profile && (profile.role === 'admin' || profile.role === 'salesman')) {
        throw new Error('This email is already a ' + profile.role + ' login. Use a different customer email.');
    }

    const { data: matches, error: matchError } = await supabaseClient
        .from('customers')
        .select('id, name, company, email, status, salesman_commission_percent')
        .ilike('email', emailNorm);
    if (matchError) throw matchError;

    const list = matches || [];
    const protectedHit = list.find(function (c) {
        return typeof shouldSkipCustomerLoginReset === 'function' && shouldSkipCustomerLoginReset(c);
    });
    if (protectedHit) {
        throw new Error(
            'This email belongs to a protected account (' +
            (protectedHit.name || protectedHit.company || emailNorm) +
            '). It cannot be overwritten from an inquiry.'
        );
    }

    return {
        profile: profile || null,
        matches: list,
        loginExists: list.length > 0 || !!(profile && profile.role === 'customer')
    };
}

async function assertSalesmanEmailAvailable(email) {
    const emailNorm = (email || '').trim().toLowerCase();
    if (!emailNorm || !emailNorm.includes('@')) {
        throw new Error('A valid email is required.');
    }

    const { data: existingSalesman } = await supabaseClient
        .from('salesmen')
        .select('id, first_name, last_name, email')
        .ilike('email', emailNorm)
        .maybeSingle();
    if (existingSalesman) {
        const who = [existingSalesman.first_name, existingSalesman.last_name].filter(Boolean).join(' ');
        throw new Error(
            'A salesman already exists for ' + emailNorm +
            (who ? ' (' + who + ')' : '') +
            '.\nOpen that card instead of adding them again.'
        );
    }

    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('email, role')
        .ilike('email', emailNorm)
        .maybeSingle();
    if (profile && profile.role === 'admin') {
        throw new Error('This email is already an admin login. Use a different salesman email.');
    }
    if (profile && profile.role === 'customer') {
        throw new Error('This email is already a customer login. Use a different salesman email.');
    }
    if (profile && profile.role === 'salesman') {
        throw new Error('A salesman login already exists for this email. Check the Salesmen list before adding again.');
    }
}


async function saveNewCustomer(event) {
    event.preventDefault();

    const name = (document.getElementById('new-customer-name')?.value || '').trim();
    const company = (document.getElementById('new-customer-company')?.value || '').trim();
    const email = (document.getElementById('new-customer-email')?.value || '').trim();
    const phone = (document.getElementById('new-customer-phone')?.value || '').trim();
    if (typeof isValidPhoneUS === 'function' && !isValidPhoneUS(phone)) {
        alert('Enter phone as (717)555-1234');
        document.getElementById('new-customer-phone')?.focus();
        return;
    }
    const territory = (document.getElementById('new-customer-territory')?.value || '').trim();
    const notes = (document.getElementById('new-customer-notes')?.value || '').trim();

    const shipStreet = (document.getElementById('new-customer-ship-street')?.value || '').trim();
    const shipApt = (document.getElementById('new-customer-ship-apt')?.value || '').trim();
    const shipCity = (document.getElementById('new-customer-ship-city')?.value || '').trim();
    const shipState = (document.getElementById('new-customer-ship-state')?.value || '').trim();
    const shipZip = (document.getElementById('new-customer-ship-zip')?.value || '').trim();

    if (!name) {
        alert('Customer name is required.');
        return;
    }
    if (!company) {
        alert('Company is required.');
        return;
    }
    if (!email || !email.includes('@')) {
        alert('A valid email is required.');
        return;
    }
    if (!phone) {
        alert('Phone is required.');
        return;
    }
    if (!shipStreet || !shipCity || !shipState || !shipZip) {
        alert('Shipping street, city, state, and ZIP are required.');
        return;
    }

    const shippingAddress = (typeof buildAddressFromParts === 'function')
        ? buildAddressFromParts(shipStreet, shipApt, shipCity, shipState, shipZip)
        : [shipStreet, shipApt, [shipCity, shipState, shipZip].filter(Boolean).join(', ')].filter(Boolean).join('\n');

    const sameAsShipping = document.getElementById('new-customer-same-address')?.checked !== false;
    let billingAddress = shippingAddress;
    if (!sameAsShipping) {
        const billStreet = (document.getElementById('new-customer-bill-street')?.value || '').trim();
        const billApt = (document.getElementById('new-customer-bill-apt')?.value || '').trim();
        const billCity = (document.getElementById('new-customer-bill-city')?.value || '').trim();
        const billState = (document.getElementById('new-customer-bill-state')?.value || '').trim();
        const billZip = (document.getElementById('new-customer-bill-zip')?.value || '').trim();
        billingAddress = (typeof buildAddressFromParts === 'function')
            ? buildAddressFromParts(billStreet, billApt, billCity, billState, billZip)
            : [billStreet, billApt, [billCity, billState, billZip].filter(Boolean).join(', ')].filter(Boolean).join('\n');
        if (!billingAddress) billingAddress = shippingAddress;
    }

    const btn = event.submitter || document.querySelector('#add-customer-modal button[type="submit"]');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Saving…';
    }

    try {
        await assertCustomerEmailAvailable(email);

        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');

        const fnUrl = SUPABASE_URL + '/functions/v1/create-customer-user';
        const fnRes = await fetch(fnUrl, {
            method: 'POST',
            headers: await getEdgeFunctionHeaders(),
            body: JSON.stringify({
                email: email,
                full_name: name,
                company: company
            })
        });

        const fnText = await fnRes.text();
        let fnData = null;
        try {
            fnData = JSON.parse(fnText);
        } catch (e) {
            fnData = { error: fnText || 'Empty response' };
        }

        if (!fnRes.ok) {
            console.error('Edge function failed:', fnRes.status, fnData);
            throw new Error(
                (fnData && fnData.error) ? fnData.error : ('Function HTTP ' + fnRes.status + ': ' + fnText)
            );
        }
        if (fnData && fnData.error) {
            throw new Error(fnData.error);
        }

        const shipLat = parseFloat(document.getElementById('new-customer-ship-lat')?.value || '');
        const shipLng = parseFloat(document.getElementById('new-customer-ship-lng')?.value || '');
        const shipPlace = (document.getElementById('new-customer-ship-place')?.value || '').trim();

        const { data: created, error } = await supabaseClient
            .from('customers')
            .insert({
                name: name,
                company: company,
                email: email,
                phone: phone,
                shipping_address: shippingAddress,
                billing_address: billingAddress,
                territory: territory || null,
                notes: notes || null,
                status: 'Active',
                source: 'admin',
                submitted_by: user.fullName || user.email || 'Admin',
                submitted_by_email: user.email || null,
                onboarding_complete: false,
                password_changed: false,
                lat: isFinite(shipLat) ? shipLat : null,
                lng: isFinite(shipLng) ? shipLng : null,
                place_id: shipPlace || null
            })
            .select('id')
            .single();

        if (error) {
            console.error(error);
            throw new Error('Login was created, but saving the customer row failed.\n' + error.message);
        }

        if (created && created.id) {
            const { error: shipErr } = await supabaseClient
                .from('customer_shipping_addresses')
                .insert({
                    customer_id: created.id,
                    label: 'Primary',
                    address_line1: shipStreet,
                    city: shipCity,
                    state: shipState,
                    zip: shipZip,
                    is_default: true,
                    lat: isFinite(shipLat) ? shipLat : null,
                    lng: isFinite(shipLng) ? shipLng : null,
                    place_id: shipPlace || null
                });
            if (shipErr) console.warn('shipping address insert:', shipErr.message);
        }

        hideAddCustomerModal();
        if (typeof loadCustomers === 'function') await loadCustomers();
                if (typeof initCustomerMap === 'function') initCustomerMap();

        const emailOk = fnData && fnData.email_sent === true;
        const emailFailReason = (fnData && fnData.email_error) ? String(fnData.email_error) : '';
        if (typeof logPortalEmail === 'function') {
            await logPortalEmail({
                email_type: 'credentials',
                status: emailOk ? 'sent' : 'failed',
                to_email: email,
                to_name: name,
                subject: 'Your Donegal Natural wholesale account is approved',
                store_names: company || name,
                related_customer_id: created && created.id ? created.id : null,
                error: emailOk ? null : (emailFailReason || 'Credentials email was not sent')
            });
        }

        alert(
            'Customer added.\n' +
            'Login account created.\n\n' +
            'Customer login email: ' + email + '\n\n' +
            (emailOk
                ? 'Credentials email was sent to the customer.'
                : ('Credentials email was NOT sent.\n' +
                   (emailFailReason ? ('Reason: ' + emailFailReason + '\n') : '') +
                   'Use password recovery after email delivery is restored.'))
        );

    } catch (err) {
        console.error(err);
        alert('Could not add customer.\n' + (err.message || ''));
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Save Customer';
        }
    }
}

function parseCustomerPaymentDetails(raw) {
    if (!raw) return {};
    if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
    try { return JSON.parse(raw) || {}; } catch (e) { return {}; }
}

function formatCustomerPaymentLabel(customer) {
    const method = String((customer && customer.payment_method) || '').toLowerCase();
    const status = String((customer && customer.payment_method_status) || '').toLowerCase();
    const onFile = (method === 'card' || method === 'ach') && (status === 'on_file' || status === 'approved');
    if (!onFile) return '';
    const details = parseCustomerPaymentDetails(customer.payment_method_details);
    if (method === 'card') {
        return (details.brand || 'Card') + ' •••• ' + (details.last4 || 'on file');
    }
    return (details.bank_name || 'ACH') + ' •••• ' + (details.account_last4 || 'on file');
}

function customerPaymentDetailsHtml(customer) {
    const method = String((customer && customer.payment_method) || '').toLowerCase();
    const status = String((customer && customer.payment_method_status) || '').toLowerCase();
    const details = parseCustomerPaymentDetails(customer && customer.payment_method_details);
    const onFile = (method === 'card' || method === 'ach') && (status === 'on_file' || status === 'approved');
    if (!onFile) {
        return '<p class="text-sm text-[#6B4423]">No card or ACH on file.</p>';
    }
    if (method === 'card') {
        const exp = [details.exp_month, details.exp_year].filter(Boolean).join('/');
        return (
            '<p class="text-sm font-semibold text-[#1E4D2B]">' + escapeHtml((details.brand || 'Card') + ' •••• ' + (details.last4 || '')) + '</p>' +
            (details.name ? '<p class="text-sm text-[#6B4423]">Name on card: ' + escapeHtml(details.name) + '</p>' : '') +
            (exp ? '<p class="text-sm text-[#6B4423]">Exp: ' + escapeHtml(exp) + '</p>' : '') +
            '<p class="text-xs text-[#6B4423] mt-1">Status: ' + escapeHtml(status) + '. Last 4 only.</p>'
        );
    }
    return (
        '<p class="text-sm font-semibold text-[#1E4D2B]">' + escapeHtml((details.bank_name || 'ACH') + ' •••• ' + (details.account_last4 || '')) + '</p>' +
        (details.name ? '<p class="text-sm text-[#6B4423]">Name on account: ' + escapeHtml(details.name) + '</p>' : '') +
        (details.account_type ? '<p class="text-sm text-[#6B4423]">Type: ' + escapeHtml(details.account_type) + '</p>' : '') +
        (details.routing_last4 ? '<p class="text-sm text-[#6B4423]">Routing last 4: ' + escapeHtml(details.routing_last4) + '</p>' : '') +
        '<p class="text-xs text-[#6B4423] mt-1">Status: ' + escapeHtml(status) + '. Last 4 only.</p>'
    );
}


async function showCustomerDetail(customerName) {
    const customer = allCustomers.find(c => c.name === customerName);
    if (!customer) return;

    const modal = document.getElementById('customer-modal');
    if (!modal) return;

        // Store id on the modal so edit/save can use it
    modal.dataset.customerId = customer.id || '';

    // Ensure salesmen list is available for name lookup
    if ((!salesmen || salesmen.length === 0) && typeof loadSalesmen === 'function') {
        loadSalesmen();
    }

    document.getElementById('modal-customer-name').textContent = customer.name;
    document.getElementById('modal-customer-company').textContent = customer.company || '';
    document.getElementById('modal-customer-status').textContent = customer.status || 'Active';
    document.getElementById('modal-customer-phone').textContent = customer.phone || 'N/A';
    document.getElementById('modal-customer-email').textContent = customer.email || 'N/A';
    document.getElementById('modal-customer-territory').textContent = customer.territory || 'N/A';
    document.getElementById('modal-customer-balance').textContent = '$' + (customer.balance || 0).toLocaleString();
    // Password + Payment status (always visible in detail, even when completed)
let onboardingSection = document.getElementById('modal-customer-onboarding');
if (!onboardingSection) {
    onboardingSection = document.createElement('div');
    onboardingSection.id = 'modal-customer-onboarding';
    onboardingSection.className = 'mt-3 pt-3 border-t border-[#d4b78f]';
    const statusEl = document.getElementById('modal-customer-status');
    if (statusEl && statusEl.parentElement) {
        statusEl.parentElement.appendChild(onboardingSection);
    }
}
const pwBadge = customer.password_changed
    ? `<span class="px-2 py-0.5 text-xs font-bold rounded-full bg-green-100 text-green-800">✓ Password set</span>`
    : `<span class="px-2 py-0.5 text-xs font-bold rounded-full bg-orange-100 text-orange-800">Needs Password</span>`;
const method = String(customer.payment_method || '').toLowerCase();
const payStatus = String(customer.payment_method_status || '').toLowerCase();
const hasPay = (method === 'card' || method === 'ach') && (payStatus === 'on_file' || payStatus === 'approved');
let payLabel = 'Payment Pending';
if (hasPay) {
    let details = {};
    details = parseCustomerPaymentDetails(customer.payment_method_details);
    payLabel = method === 'card'
        ? ((details.brand || 'Card') + ' •••• ' + (details.last4 || ''))
        : ((details.bank_name || 'ACH') + ' •••• ' + (details.account_last4 || ''));
}
const payBadge = hasPay
    ? `<span class="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800">✓ ${escapeHtml(payLabel)}</span>`
    : `<span class="px-2 py-0.5 text-xs font-bold rounded-full bg-orange-100 text-orange-800">Payment Pending</span>`;
onboardingSection.innerHTML = `
    <p class="text-xs text-[#6B4423] mb-1.5">Onboarding Status</p>
    <div class="flex flex-wrap gap-2">${pwBadge}${payBadge}</div>
    <div class="mt-3">
        <p class="text-sm font-semibold brand-green mb-1">Payment on file</p>
        ${customerPaymentDetailsHtml(customer)}
    </div>
`;
    // Assigned salesman (read-only)
    const salesmanEl = document.getElementById('modal-customer-salesman');
    if (salesmanEl) {
        const email = (customer.salesmanEmail || '').toLowerCase().trim();
        let display = '— Unassigned —';
        if (email && Array.isArray(salesmen) && salesmen.length > 0) {
            const match = salesmen.find(s =>
                (s.email || '').toLowerCase().trim() === email
            );
            if (match) {
                display = match.name
                    || [match.firstName, match.lastName].filter(Boolean).join(' ')
                    || email;
            } else {
                display = email; // fallback if salesman list is stale
            }
        } else if (email) {
            display = email;
        }
        salesmanEl.textContent = display;
        const monthlyEl = document.getElementById('modal-customer-monthly-amount');
        if (monthlyEl) monthlyEl.textContent = customer.monthlyAmount || 'Not set';
            // ===== Pricing status + assigned salesman's approved sheet (read-only) + Revoke =====
    let pricingSection = document.getElementById('modal-customer-pricing');
    if (!pricingSection) {
        pricingSection = document.createElement('div');
        pricingSection.id = 'modal-customer-pricing';
        pricingSection.className = 'mt-4 pt-4 border-t border-[#d4b78f]';
        const salesmanBlock = document.getElementById('modal-customer-salesman');
        if (salesmanBlock && salesmanBlock.parentElement) {
            salesmanBlock.parentElement.appendChild(pricingSection);
        }
    }

    const isPricingApproved = !!customer.pricingApprovedAt;
    let sheetHtml = '<p class="text-sm text-[#6B4423]">No price sheet found for this customer.</p>';
    const salesmanEmail = (customer.salesmanEmail || '').toLowerCase().trim();
    try {
        let prices = null;
        let sourceLabel = '';
        let updatedAt = null;
        const { data: custSheet, error: custErr } = await supabaseClient
            .from('customer_price_sheets')
            .select('prices, updated_at')
            .eq('customer_id', customer.id)
            .maybeSingle();
        if (custErr) throw custErr;
        if (custSheet && custSheet.prices && typeof custSheet.prices === 'object'
                && Object.keys(custSheet.prices).length > 0) {
            prices = custSheet.prices;
            sourceLabel = 'Customer sheet';
            updatedAt = custSheet.updated_at;
        } else if (salesmanEmail) {
            const { data: salesSheet, error: salesErr } = await supabaseClient
                .from('salesman_price_sheets')
                .select('prices, updated_at, salesman_name')
                .eq('salesman_email', salesmanEmail)
                .maybeSingle();
            if (salesErr) throw salesErr;
            if (salesSheet && salesSheet.prices && Object.keys(salesSheet.prices).length > 0) {
                prices = salesSheet.prices;
                sourceLabel = 'Salesman sheet'
                    + (salesSheet.salesman_name ? ' (' + salesSheet.salesman_name + ')' : '');
                updatedAt = salesSheet.updated_at;
            }
        }
        if (prices) {
            const rows = Object.keys(prices).sort().map(function (name) {
                const price = Number(prices[name]);
                return `<div class="flex justify-between text-sm py-1 border-b border-[#eee]">
                    <span class="pr-2">${escapeHtml(name)}</span>
                    <span class="font-semibold brand-green">$${price.toFixed(2)}</span>
                </div>`;
            }).join('');
            sheetHtml = `
                <p class="text-xs text-[#6B4423] mb-2">
                    ${escapeHtml(sourceLabel)}
                    ${updatedAt ? ' · updated ' + new Date(updatedAt).toLocaleDateString() : ''}
                </p>
                <div class="max-h-80 overflow-y-auto border border-[#d4b78f] rounded-lg p-2 bg-[#f8f4eb]">
                    ${rows}
                </div>
            `;
        }
    } catch (err) {
        console.error('Could not load customer price sheet:', err);
        sheetHtml = '<p class="text-sm text-red-600">Could not load price sheet.</p>';
    }

    pricingSection.innerHTML = `
        <p class="text-sm font-semibold brand-green mb-1">Pricing Access</p>
        <p class="text-sm mb-3 ${isPricingApproved ? 'text-green-700' : 'text-orange-700'}">
            ${isPricingApproved
                ? `<i class="fas fa-check-circle mr-1"></i> Approved ${new Date(customer.pricingApprovedAt).toLocaleDateString()}
                   ${customer.pricingApprovedBy ? ' by ' + escapeHtml(customer.pricingApprovedBy) : ''}`
                : `<i class="fas fa-exclamation-circle mr-1"></i> Not approved — customer cannot see prices`}
        </p>
        <label class="flex items-center gap-2 text-sm text-[#6B4423] mb-3">
            <input type="checkbox" id="modal-customer-special-pricing"
                   ${customer.specialPricing ? 'checked' : ''}
                   onchange="toggleCustomerSpecialPricing(this.checked)">
            Special pricing — do not overwrite this sheet on salesman push
        </label>
        <button type="button"
                onclick="openCustomerProtectedSheet('${customer.id}')"
                class="mb-3 w-full px-4 py-2.5 bg-[#1E4D2B] text-[#d4b78f] rounded-xl font-semibold text-sm">
            View price sheet by category
        </button>
        <p class="text-xs text-[#6B4423] mb-3">${
            (customer.specialPriceItems && customer.specialPriceItems.length)
                ? (customer.specialPriceItems.length + ' product(s) locked from push')
                : 'No individual products locked'
        }</p>
        ${!isPricingApproved ? `
            <button type="button"
                    onclick="approveCustomerPricingAccess()"
                    class="mt-4 w-full px-4 py-2.5 bg-[#1E4D2B] text-[#d4b78f] rounded-xl font-semibold text-sm hover:bg-[#254a2f]">
                Approve pricing for this customer
            </button>
        ` : ''}
        ${isPricingApproved ? `
            <button type="button"
                    onclick="revokeCustomerPricingAccess()"
                    class="mt-4 w-full px-4 py-2.5 border-2 border-red-600 text-red-700 rounded-xl font-semibold text-sm hover:bg-red-50">
                Revoke pricing access for this customer
            </button>
            <p class="text-xs text-[#6B4423] mt-1">Clears the customer’s access only. Does not change the salesman’s price sheet.</p>
        ` : ''}
    `;
    }

    const addr = customer.shippingAddress || customer.address || 'N/A';
    document.getElementById('modal-customer-address').textContent = addr;
    const billingEl = document.getElementById('modal-customer-billing');
    if (billingEl) billingEl.textContent = customer.billingAddress || 'N/A';
    document.getElementById('modal-customer-notes').textContent = customer.notes || 'No notes.';

    const customerOrders = (allOrders || []).filter(o =>
        o.customer && o.customer.toLowerCase() === customer.name.toLowerCase()
    );
    document.getElementById('modal-customer-total-orders').textContent = customerOrders.length;

        modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

function hideEditCustomerModal() {
    const modal = document.getElementById('edit-customer-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

async function openSetCustomerPricing(customerId) {
    const customer = (allCustomers || []).find(function (c) {
        return String(c.id) === String(customerId);
    });
    if (!customer) {
        alert('Customer not found.');
        return;
    }
    if (typeof showCustomerDetail === 'function') {
        await showCustomerDetail(customer.name);
    }
    setTimeout(function () {
        if (typeof openReportsCustomerPriceSheet === 'function') {
            openReportsCustomerPriceSheet(customerId);
        }
    }, 0);
}

async function notifyCustomerPricingReady(customer) {
    const email = String((customer && customer.email) || '').toLowerCase().trim();
    const name = (customer && (customer.name || customer.company)) || 'there';
    const company = (customer && (customer.company || customer.name)) || '';
    if (!email || email.indexOf('@') === -1) return;
    if (typeof isBlockedMassEmailAddress === 'function' && isBlockedMassEmailAddress(email)) return;

    let storeNames = [];
    try {
        const { data: storeRows } = await supabaseClient
            .from('customers')
            .select('name, company, email, pricing_approved_at')
            .ilike('email', email)
            .not('pricing_approved_at', 'is', null);
        const seen = {};
        (storeRows || []).forEach(function (row) {
            const label = String(row.company || row.name || '').trim();
            if (!label) return;
            const key = label.toLowerCase();
            if (seen[key]) return;
            seen[key] = true;
            storeNames.push(label);
        });
    } catch (e) {
        storeNames = [];
    }
    if (!storeNames.length && company) storeNames = [company];
    const storeLine = storeNames.join(', ');
    const storeHtml = storeNames.map(function (s) { return escapeHtml(s); }).join(', ');
    const multi = storeNames.length > 1;

    const subject = 'Your Donegal Natural wholesale pricing is ready';
    const text =
        'Hello ' + name + ',\n\n' +
        'Your wholesale pricing is now viewable in your Donegal Natural account.\n\n' +
        (multi
            ? ('Stores on this login: ' + storeLine + '.\n\n')
            : (storeLine ? ('Store: ' + storeLine + '.\n\n') : '')) +
        'Sign in at https://www.donegalnaturaldogtreats.com/login-portal.html\n' +
        (multi
            ? 'After you sign in, use Ordering as and Change, then Active Store on Account, to switch locations. Each store has its own prices.\n\n'
            : 'Open the wholesale portal to see case sizes and prices.\n\n') +
        'Questions: support@donegalnatural.com\n\n' +
        'Thank you,\nDonegal Natural Dog Treats';
    const html =
        '<div style="font-family:Arial,sans-serif;color:#3b2a1a;line-height:1.5">' +
        '<p style="font-size:16px;font-weight:700;color:#1E4D2B;margin:0 0 12px">Donegal Natural Dog Treats</p>' +
        '<p>Hello ' + escapeHtml(name) + ',</p>' +
        '<p>Your wholesale pricing is now viewable in your Donegal Natural account.</p>' +
        (storeHtml
            ? ('<p>' + (multi ? 'Stores on this login: ' : 'Store: ') + '<strong>' + storeHtml + '</strong>.</p>')
            : '') +
        '<p>Sign in at <a href="https://www.donegalnaturaldogtreats.com/login-portal.html">the wholesale login</a>.</p>' +
        (multi
            ? '<p>After you sign in, use <strong>Ordering as</strong> and <strong>Change</strong>, then <strong>Active Store</strong> on Account, to switch locations. Each store has its own prices.</p>'
            : '<p>Open the wholesale portal to see case sizes and prices.</p>') +
        '<p>Questions: <a href="mailto:support@donegalnatural.com">support@donegalnatural.com</a></p>' +
        '<p>Thank you,<br>Donegal Natural Dog Treats</p>' +
        '</div>';
    try {
        const fnRes = await fetch(SUPABASE_URL + '/functions/v1/send-customer-email', {
            method: 'POST',
            headers: await getEdgeFunctionHeaders(),
            body: JSON.stringify({ to: email, subject: subject, html: html, text: text })
        });
        const fnText = await fnRes.text();
        let fnData = null;
        try { fnData = JSON.parse(fnText); } catch (e) { fnData = { error: fnText || 'Empty response' }; }
        if (typeof logPortalEmail === 'function') {
            await logPortalEmail({
                email_type: 'pricing_ready',
                status: (fnRes.ok && !(fnData && fnData.error)) ? 'sent' : 'failed',
                to_email: email,
                to_name: name,
                subject: subject,
                store_names: storeLine,
                related_customer_id: customer && customer.id ? customer.id : null,
                error: (fnRes.ok && !(fnData && fnData.error)) ? null : ((fnData && fnData.error) || ('HTTP ' + fnRes.status))
            });
        }
    } catch (err) {
        console.warn('pricing ready email:', err && err.message ? err.message : err);
    }
}

async function toggleCustomerSpecialPricing(on) {
    const modal = document.getElementById('customer-modal');
    const id = modal && modal.dataset ? modal.dataset.customerId : '';
    if (!id) return;
    try {
        const { error } = await supabaseClient
            .from('customers')
            .update({ special_pricing: !!on })
            .eq('id', id);
        if (error) throw error;
        const row = (allCustomers || []).find(function (c) { return String(c.id) === String(id); });
        if (row) {
            row.specialPricing = !!on;
            row.special_pricing = !!on;
        }
    } catch (err) {
        alert('Could not save special pricing.\n' + (err.message || ''));
        const box = document.getElementById('modal-customer-special-pricing');
        if (box) box.checked = !on;
    }
}



function normSpecialName(s) {
    return String(s || '').toLowerCase().replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
}

async function openCustomerProtectedSheet(customerId) {
    const customer = (allCustomers || []).find(function (c) { return String(c.id) === String(customerId); });
    if (!customer) return;
    window._protectedSheetCustomerId = customer.id;
    const modal = document.getElementById('customer-protected-sheet-modal');
    const list = document.getElementById('customer-protected-sheet-list');
    const sub = document.getElementById('customer-protected-sheet-sub');
    if (!modal || !list) {
        alert('Price sheet modal is missing from internal-portal.html');
        return;
    }
    list.innerHTML = '<p class="text-sm text-[#6B4423] p-3">Loading…</p>';
    modal.classList.remove('hidden');
    if (sub) sub.textContent = (customer.company || customer.name || '') + ' · check products that must keep their current $';

    let prices = {};
    try {
        // Start from the salesman sheet (source of truth)
        if (customer.salesmanEmail) {
            const { data: ss } = await supabaseClient
                .from('salesman_price_sheets')
                .select('prices')
                .eq('salesman_email', String(customer.salesmanEmail).toLowerCase())
                .maybeSingle();
            if (ss && ss.prices) prices = Object.assign({}, ss.prices);
        }
        // Overlay only locked/special prices from the customer sheet
        const { data: cs } = await supabaseClient
            .from('customer_price_sheets')
            .select('prices')
            .eq('customer_id', customer.id)
            .maybeSingle();
        if (cs && cs.prices) {
            const lockedNames = {};
            (customer.specialPriceItems || []).forEach(function (n) { lockedNames[n] = true; });
            Object.keys(cs.prices).forEach(function (name) {
                if (lockedNames[name] && cs.prices[name] != null) {
                    prices[name] = cs.prices[name];
                }
            });
        }
        window._spsDisplayNames = {};
        if (customer.salesmanEmail) {
            const { data: nickRow } = await supabaseClient
                .from('salesman_price_sheets')
                .select('display_names')
                .eq('salesman_email', String(customer.salesmanEmail).toLowerCase())
                .maybeSingle();
            if (nickRow && nickRow.display_names && typeof nickRow.display_names === 'object') {
                window._spsDisplayNames = nickRow.display_names;
            }
        }
    } catch (err) {
        list.innerHTML = '<p class="text-sm text-red-600 p-3">Could not load sheet.</p>';
        return;
    }

    const locked = {};
    (customer.specialPriceItems || []).forEach(function (n) { locked[normSpecialName(n)] = true; });
    const catalogByName = {};
    (typeof PRODUCT_CATALOG !== 'undefined' ? PRODUCT_CATALOG : []).forEach(function (p) {
        if (p && p.name) catalogByName[p.name] = p;
    });
    const grouped = {};
    const unmatched = [];
    Object.keys(prices).sort().forEach(function (name) {
        const n = Number(prices[name]);
        if (isNaN(n)) return;
        const catalog = catalogByName[name];
        const row = { name: name, price: n, caseSize: catalog ? (catalog.caseSize || '') : '' };
        const cats = (typeof priceSheetDisplayCategories === 'function')
            ? priceSheetDisplayCategories(name, catalog)
            : [];
        if (cats && cats.length) {
            cats.forEach(function (cat) {
                if (!grouped[cat]) grouped[cat] = [];
                grouped[cat].push(row);
            });
        } else {
            unmatched.push(row);
        }
    });
    if (unmatched.length) grouped['Other'] = unmatched;

    list.innerHTML = Object.keys(grouped).sort().map(function (cat) {
        const rows = grouped[cat].map(function (row) {
            const checked = locked[normSpecialName(row.name)] ? 'checked' : '';
            return '<label class="flex items-center justify-between gap-3 py-1.5 border-b border-[#eee] text-sm">' +
                '<span class="flex items-center gap-2 min-w-0">' +
                '<input type="checkbox" class="cps-lock accent-[#1E4D2B]" data-name="' + encodeURIComponent(row.name) + '" ' + checked + '>' +
                '<span class="truncate">' + escapeHtml(salesmanSheetDisplayName(row.name)) +
                (row.caseSize ? (' <span class="text-xs text-[#6B4423]">' + escapeHtml(row.caseSize) + '</span>') : '') +
                '</span></span>' +
                '<span class="font-semibold brand-green">$' + Number(row.price).toFixed(2) + '</span></label>';
        }).join('');
        return '<div class="mb-4"><p class="text-xs font-bold uppercase tracking-wide text-[#6B4423] mb-1">' +
            escapeHtml(cat) + '</p>' + rows + '</div>';
    }).join('') || '<p class="text-sm text-[#6B4423] p-3">No prices on this sheet.</p>';
}

function hideCustomerProtectedSheet() {
    const modal = document.getElementById('customer-protected-sheet-modal');
    if (modal) modal.classList.add('hidden');
}

async function saveCustomerProtectedSheet() {
    const id = window._protectedSheetCustomerId;
    if (!id) return;
    const names = Array.from(document.querySelectorAll('#customer-protected-sheet-list .cps-lock:checked')).map(function (el) {
        return decodeURIComponent(el.getAttribute('data-name') || '');
    }).filter(Boolean);
    try {
        const { error } = await supabaseClient.from('customers').update({ special_price_items: names }).eq('id', id);
        if (error) throw error;
        const row = (allCustomers || []).find(function (c) { return String(c.id) === String(id); });
        if (row) row.specialPriceItems = names;
        hideCustomerProtectedSheet();
        if (row && row.name && typeof showCustomerDetail === 'function') showCustomerDetail(row.name);
        alert(names.length + ' product(s) locked from salesman push.');
    } catch (err) {
        alert('Could not save locked products.\n' + (err.message || ''));
    }
}

async function approveCustomerPricingAccess() {
    const modal = document.getElementById('customer-modal');
    const customerId = modal && modal.dataset ? modal.dataset.customerId : '';
    if (!customerId) {
        alert('Could not find customer id.');
        return;
    }
    const admin = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const approvedBy = admin.fullName || admin.name || admin.email || 'Admin';
    if (!confirm('Unlock prices for this customer using the assigned salesman sheet?')) return;
    try {
        const { error } = await supabaseClient
            .from('customers')
            .update({
                pricing_approved_at: new Date().toISOString(),
                pricing_approved_by: approvedBy
            })
            .eq('id', customerId);
        if (error) throw error;
        await loadCustomers();
        const refreshed = allCustomers.find(function (c) {
            return String(c.id) === String(customerId);
        });
        if (refreshed) showCustomerDetail(refreshed.name);
        if (refreshed) await notifyCustomerPricingReady(refreshed);
        alert('Pricing unlocked for this customer.');
    } catch (err) {
        console.error(err);
        alert('Could not unlock pricing.\n' + (err.message || ''));
    }
}

async function revokeCustomerPricingAccess() {
    const modal = document.getElementById('customer-modal');
    const customerId = modal?.dataset?.customerId;
    if (!customerId) {
        alert('Could not find customer id.');
        return;
    }

    if (!confirm('Revoke pricing access for this customer?\n\nThey will no longer see prices until a salesman re-approves them.\nThe salesman’s price sheet itself is not changed.')) {
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('customers')
            .update({
                pricing_approved_at: null,
                pricing_approved_by: null
            })
            .eq('id', customerId);

        if (error) throw error;

        await loadCustomers();
        // Re-open the same customer so the modal refreshes
        const refreshed = allCustomers.find(c => String(c.id) === String(customerId));
        if (refreshed) {
            showCustomerDetail(refreshed.name);
        } else {
            hideCustomerModal();
        }
        alert('Pricing access revoked for this customer.');
    } catch (err) {
        console.error(err);
        alert('Could not revoke pricing access.\n' + (err.message || ''));
    }
}

function showEditCustomerModal() {
    const detailModal = document.getElementById('customer-modal');
    const customerId = detailModal?.dataset?.customerId;

    let customer = null;
    if (customerId) {
        customer = allCustomers.find(c => String(c.id) === String(customerId));
    }
    if (!customer) {
        const customerName = document.getElementById('modal-customer-name')?.textContent;
        customer = allCustomers.find(c => c.name === customerName);
    }
    if (!customer) {
        alert('Could not load customer for editing.');
        return;
    }

    // Hide detail modal
    if (detailModal) {
        detailModal.classList.add('hidden');
        detailModal.style.display = 'none';
    }

    const modal = document.getElementById('edit-customer-modal');
    if (!modal) return;

    modal.dataset.customerId = customer.id || '';

    document.getElementById('edit-name').value = customer.name || '';
    document.getElementById('edit-company').value = customer.company || '';
    document.getElementById('edit-email').value = customer.email || '';
    document.getElementById('edit-phone').value = customer.phone || '';
    document.getElementById('edit-territory').value = customer.territory || '';
    const monthlySel = document.getElementById('edit-monthly-amount');
    if (monthlySel) monthlySel.value = customer.monthlyAmount || '';
    document.getElementById('edit-address').value =
        customer.shippingAddress || customer.address || '';
    document.getElementById('edit-notes').value = customer.notes || '';

    // Populate salesman dropdown
    const salesmanSelect = document.getElementById('edit-salesman');
    if (salesmanSelect) {
        const fillSalesmanSelect = () => {
            salesmanSelect.innerHTML = '<option value="">— Unassigned —</option>';
            (salesmen || []).forEach(s => {
                if (s.active === false) return;
                const name = s.name || [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email || '';
                const email = (s.email || '').toLowerCase().trim();
                if (!email && !name) return;
                const opt = document.createElement('option');
                opt.value = email || name;
                opt.textContent = name + (s.territory ? ' — ' + s.territory : '');
                salesmanSelect.appendChild(opt);
            });
            const current = (customer.salesmanEmail || '').toLowerCase().trim();
            if (current) {
                salesmanSelect.value = current;
                // If email didn't match any option, keep Unassigned selected
                if (salesmanSelect.value !== current) {
                    salesmanSelect.value = '';
                }
            } else {
                salesmanSelect.value = '';
            }
        };

        if (!Array.isArray(salesmen) || salesmen.length === 0) {
            if (typeof loadSalesmen === 'function') {
                loadSalesmen().then(fillSalesmanSelect);
            } else {
                fillSalesmanSelect();
            }
        } else {
            fillSalesmanSelect();
        }
    }

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}


async function saveEditedCustomer(e) {
    e.preventDefault();

    const modal = document.getElementById('edit-customer-modal');
    const customerId = modal?.dataset?.customerId;

    if (!customerId) {
        alert('Could not find customer id. Please close and open the customer again.');
        return;
    }

    const name = document.getElementById('edit-name').value.trim();
    const company = document.getElementById('edit-company').value.trim();
    const email = document.getElementById('edit-email').value.trim();
    const phone = document.getElementById('edit-phone').value.trim();
    const territory = document.getElementById('edit-territory').value.trim();
    const address = document.getElementById('edit-address').value.trim();
    const notes = document.getElementById('edit-notes').value.trim();
    const salesmanEmail = (document.getElementById('edit-salesman')?.value || '').trim().toLowerCase() || null;

    if (!name) {
        alert('Customer name is required.');
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('customers')
            .update((() => {
                const payload = {
                    name: name,
                    company: company || null,
                    email: email || null,
                    phone: phone || null,
                    territory: territory || null,
                    shipping_address: address || null,
                    notes: notes || null,
                    monthly_amount: (document.getElementById('edit-monthly-amount')?.value || '').trim() || null,
                    salesman_email: salesmanEmail,
                    assigned_at: salesmanEmail ? new Date().toISOString() : null,
                    updated_at: new Date().toISOString()
                };
                // Auto-unlock only if currently locked AND salesman has approved sheet
                if (salesmanEmail && salesmanHasApprovedSheet(salesmanEmail)) {
                    const existing = allCustomers.find(c => String(c.id) === String(customerId));
                    if (existing && !existing.pricingApprovedAt) {
                        payload.pricing_approved_at = new Date().toISOString();
                        const admin = JSON.parse(localStorage.getItem('currentUser') || '{}');
                        payload.pricing_approved_by = admin.fullName || admin.email || 'Admin';
                    }
                }
                return payload;
            })())
            .eq('id', customerId);

        if (error) {
            console.error(error);
            alert('Failed to update customer.\n' + error.message);
            return;
        }

        const existingBefore = (allCustomers || []).find(function (c) {
            return String(c.id) === String(customerId);
        });
        const oldSalesman = String((existingBefore && (existingBefore.salesmanEmail || existingBefore.salesman_email)) || '').toLowerCase().trim();
        const newSalesman = String(salesmanEmail || '').toLowerCase().trim();
        if (oldSalesman !== newSalesman) {
            const moved = await applyNewSalesmanPriceSheetToCustomer({
                id: customerId,
                email: email || (existingBefore && existingBefore.email),
                company: company || (existingBefore && existingBefore.company),
                name: name
            }, salesmanEmail);
            if (!moved.ok) {
                alert('Salesman changed, but the price sheet did not copy:\n' + moved.reason);
            }
        }
        const justUnlocked = existingBefore && !existingBefore.pricingApprovedAt &&
            salesmanEmail && typeof salesmanHasApprovedSheet === 'function' &&
            salesmanHasApprovedSheet(salesmanEmail);
        hideEditCustomerModal();
        await loadCustomers();
        if (typeof updateEstimatedSpendCard === 'function') updateEstimatedSpendCard();
        showCustomerDetail(name);
        if (justUnlocked) {
            await notifyCustomerPricingReady({
                id: customerId,
                email: email || existingBefore.email,
                name: name,
                company: company || existingBefore.company
            });
        }
        if (typeof logAdminActivity === 'function') {
            logAdminActivity({
                action: 'edit',
                entityType: 'customer',
                entityLabel: company || name,
                summary: 'Customer record saved',
                details: { salesmanEmail: salesmanEmail || '' }
            });
        }
        alert('Customer updated.');

    } catch (err) {
        console.error(err);
        alert('Something went wrong while updating the customer.');
    }
}

function hideCustomerModal() {
    const modal = document.getElementById('customer-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

function isCustomerEnabled(status) {
    const s = String(status || '').toLowerCase();
    // Active or Approved = enabled; everything else (Inactive, Rejected, etc.) = disabled
    return s === 'active' || s === 'approved';
}

async function toggleCustomerActive(customerId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') {
            event.stopImmediatePropagation();
        }
    }

    const customer = (allCustomers || []).find(c => String(c.id) === String(customerId));
    if (!customer) {
        alert('Customer not found.');
        return;
    }

    const currentlyEnabled = isCustomerEnabled(customer.status);
    const newStatus = currentlyEnabled ? 'Inactive' : 'Active';
    const name = customer.name || customer.company || 'this customer';
    const action = currentlyEnabled ? 'Disable' : 'Enable';

    if (!confirm(`${action} ${name}?`)) return;

    try {
        const { error } = await supabaseClient
            .from('customers')
            .update({
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', customerId);

        if (error) throw error;

        customer.status = newStatus;
        if (typeof renderCustomers === 'function') renderCustomers();
        if (typeof initCustomerMap === 'function') initCustomerMap();
    } catch (err) {
        console.error('toggleCustomerActive error:', err);
        alert('Could not update customer status.\n' + (err.message || ''));
    }
}

function shouldSkipCustomerLoginReset(customer) {
    const email = String(customer.email || '').toLowerCase().trim();
    const company = String(customer.company || '').toLowerCase();
    const name = String(customer.name || '').toLowerCase();
    if (!email) return true;
    if (email === 'jackerman@donegalnatural.com') return true;
    if (company.includes('admin test store')) return true;
    if (name.includes('admin test store')) return true;
    if (name.includes('adriana hoang') || company.includes('adriana hoang')) return true;
    if (name.includes('gerald bair') || company.includes('gerald bair')) return true;
    return false;
}

async function setAllCustomersActive(enabled) {
    const checked = Array.from(document.querySelectorAll('.customer-mass-checkbox:checked'));
    if (!checked.length) {
        alert('Select at least one customer first.');
        return;
    }

    const selected = checked
        .map((cb) => (allCustomers || []).find((c) => String(c.id) === String(cb.value)))
        .filter(Boolean);

    if (!selected.length) {
        alert('No matching customers for the current selection.');
        return;
    }

    const newStatus = enabled ? 'Active' : 'Inactive';
    if (!confirm(
        (enabled ? 'Enable ' : 'Disable ') + selected.length + ' selected customer(s)?\n\n' +
        (enabled
            ? 'They will be set to Active only.\nNo password reset and no credentials email will be sent.\nApprove a pending inquiry to create a login and email credentials.'
            : 'They can still log in, but will only see Account and Order History.')
    )) return;

    try {
        const ids = selected.map((c) => c.id);
        const { error } = await supabaseClient
            .from('customers')
            .update({
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .in('id', ids);
        if (error) throw error;
        await loadCustomers();
        if (typeof initCustomerMap === 'function') initCustomerMap();
        alert(selected.length + ' customer(s) set to ' + newStatus + '.');
    } catch (err) {
        console.error('setAllCustomersActive error:', err);
        alert('Could not update customers.\n' + (err.message || ''));
    }
}

async function resendCustomerCredentials() {
    const modal = document.getElementById('customer-modal');
    const customerId = modal && modal.dataset ? modal.dataset.customerId : '';
    const customer = (allCustomers || []).find(function (c) {
        return String(c.id) === String(customerId);
    });
    if (!customer) {
        alert('Could not find this customer. Close and open the card again.');
        return;
    }
    if (typeof shouldSkipCustomerLoginReset === 'function' && shouldSkipCustomerLoginReset(customer)) {
        alert('This store is on the protected list. Do not send credentials from here.');
        return;
    }
    const email = String(customer.email || '').toLowerCase().trim();
    if (!email || email.indexOf('@') === -1) {
        alert('This store has no email. Edit the customer and save a valid email first.');
        return;
    }
    const display = customer.company || customer.name || email;
    if (!confirm(
        'Resend the initial credentials email to ' + email + '?\n' +
        'Store: ' + display + '\n\n' +
        'From noreply@donegalnatural.com\n' +
        'Subject: Your Donegal Natural wholesale account is approved\n' +
        'They get a temporary password and must change it on first login.'
    )) return;

    const btn = document.getElementById('modal-resend-credentials-btn');
    if (btn && btn.dataset.busy === '1') return;
    if (btn) {
        btn.dataset.busy = '1';
        btn.disabled = true;
    }

    try {
        const fnUrl = SUPABASE_URL + '/functions/v1/create-customer-user';
        const fnRes = await fetch(fnUrl, {
            method: 'POST',
            headers: await getEdgeFunctionHeaders(),
            body: JSON.stringify({
                email: email,
                full_name: customer.name || display,
                company: customer.company || ''
            })
        });
        const fnText = await fnRes.text();
        let fnData = null;
        try { fnData = JSON.parse(fnText); } catch (e) { fnData = { error: fnText || 'Empty response' }; }
        if (!fnRes.ok || (fnData && fnData.error)) {
            throw new Error((fnData && fnData.error) ? fnData.error : ('Function HTTP ' + fnRes.status));
        }

        const emailOk = fnData && fnData.email_sent === true;
        const emailFailReason = (fnData && fnData.email_error) ? String(fnData.email_error) : '';

        await supabaseClient
            .from('customers')
            .update({
                password_changed: false,
                updated_at: new Date().toISOString()
            })
            .eq('id', customer.id);

        if (typeof logPortalEmail === 'function') {
            await logPortalEmail({
                email_type: 'credentials',
                status: emailOk ? 'sent' : 'failed',
                to_email: email,
                to_name: customer.name || '',
                subject: 'Your Donegal Natural wholesale account is approved',
                store_names: customer.company || customer.name || '',
                related_customer_id: customer.id,
                error: emailOk ? null : (emailFailReason || 'Credentials email was not sent')
            });
        }
        if (typeof logAdminActivity === 'function') {
            logAdminActivity({
                action: 'edit',
                entityType: 'customer',
                entityLabel: display,
                summary: 'Credentials email ' + (emailOk ? 'sent' : 'failed') + ' to ' + email
            });
        }
        if (typeof loadCustomers === 'function') await loadCustomers();
        if (typeof showCustomerDetail === 'function') showCustomerDetail(customer.name);

        alert(
            'Login: ' + email + '\n\n' +
            (emailOk
                ? 'Credentials email was sent from noreply@.\nThey must change the password on first login.'
                : ('Credentials email was NOT sent.\n' +
                   (emailFailReason ? ('Reason: ' + emailFailReason + '\n') : '') +
                   'Check Reports → Email Log.'))
        );
    } catch (err) {
        console.error('resendCustomerCredentials error:', err);
        alert('Could not send credentials.\n\n' + (err.message || String(err)));
    } finally {
        if (btn) {
            btn.dataset.busy = '0';
            btn.disabled = false;
        }
    }
}

async function deactivateCustomer() {
    const modal = document.getElementById('customer-modal');
    const customerId = modal?.dataset?.customerId;
    const customerName = document.getElementById('modal-customer-name')?.textContent || 'this customer';

    if (!customerId) {
        alert('Could not find customer id.');
        return;
    }

    if (!confirm(`Deactivate ${customerName}?\n\nThey will no longer appear as Active/Approved in salesman view.`)) {
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('customers')
            .update({
                status: 'Inactive',
                updated_at: new Date().toISOString()
            })
            .eq('id', customerId);

        if (error) {
            console.error(error);
            alert('Failed to deactivate.\n' + error.message);
            return;
        }

        hideCustomerModal();
        await loadCustomers();
        if (typeof initCustomerMap === 'function') initCustomerMap();
        alert(customerName + ' has been deactivated.');

    } catch (err) {
        console.error(err);
        alert('Something went wrong.');
    }
}

async function deleteCustomer() {
    const modal = document.getElementById('customer-modal');
    const customerId = modal?.dataset?.customerId;
    const customerName = document.getElementById('modal-customer-name')?.textContent || 'this customer';

    if (!customerId) {
        alert('Could not find customer id.');
        return;
    }

    if (!confirm(`PERMANENTLY delete ${customerName}?\n\nThis cannot be undone.`)) {
        return;
    }

    // Second confirm for safety
    if (!confirm(`Type OK mentally — really delete ${customerName}?`)) {
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('customers')
            .delete()
            .eq('id', customerId);

        if (error) {
            console.error(error);
            alert('Failed to delete.\n' + error.message);
            return;
        }

        hideCustomerModal();
        await loadCustomers();
        if (typeof initCustomerMap === 'function') initCustomerMap();
        alert(customerName + ' has been deleted.');

    } catch (err) {
        console.error(err);
        alert('Something went wrong.');
    }
}

async function viewCustomerOrders() {
    const customerName = (document.getElementById('modal-customer-name')?.textContent || '').trim();
    const customerId = document.getElementById('customer-modal')?.dataset?.customerId || '';
    hideCustomerModal();

    if (typeof closeMobileSidebar === 'function') closeMobileSidebar();
    document.querySelectorAll('.content-section').forEach(el => { el.style.display = 'none'; });
    const target = document.getElementById('orders');
    if (target) target.style.display = 'block';

    if (typeof showAllOrders === 'function') showAllOrders();
    if (!allOrders || !allOrders.length) {
        if (typeof loadOrders === 'function') await loadOrders();
    }
    filterOrdersByCustomer(customerName, customerId);
}

async function loadCustomerChangeRequests() {
    try {
        const { data, error } = await supabaseClient
            .from('customer_change_requests')
            .select('*')
            .eq('status', 'Pending')
            .order('submitted_at', { ascending: false });

        if (error) {
            console.error(error);
            return [];
        }
        return data || [];
    } catch (err) {
        console.error(err);
        return [];
    }
}

async function updateCustomerChangeRequestsBadge() {
    const badge = document.getElementById('customer-change-requests-badge');
    const wrap = document.getElementById('customer-edit-requests-top');
    const list = await loadCustomerChangeRequests();
    const count = list.length;

    if (badge) {
        badge.textContent = count > 0 ? String(count) : '0';
    }

    if (wrap) {
        if (count > 0) {
            wrap.classList.remove('hidden');
            wrap.style.display = '';
        } else {
            wrap.classList.add('hidden');
            wrap.style.display = 'none';
        }
    }
}

async function showCustomerChangeRequestsPanel() {
    const modal = document.getElementById('customer-change-requests-modal');
    const listEl = document.getElementById('customer-change-requests-list');
    if (!modal || !listEl) {
        alert('Customer change requests modal is missing from the HTML.');
        return;
    }

    listEl.innerHTML = '<p class="text-[#6B4423]">Loading...</p>';
    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    const rows = await loadCustomerChangeRequests();

    if (!rows.length) {
        listEl.innerHTML = '<p class="text-[#6B4423]">No pending customer edit requests.</p>';
        return;
    }

    listEl.innerHTML = rows.map(r => {
        const p = r.proposed_changes || {};
        return `
            <div class="border-2 border-[#6B4423] rounded-xl p-4 mb-4 bg-[#f8f4eb]">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <p class="font-bold brand-green">${escapeHtml(p.name || 'Customer')}</p>
                        <p class="text-sm text-[#6B4423]">
                            Requested by ${escapeHtml(r.salesman_name || r.salesman_email || 'Salesman')}
                        </p>
                        <p class="text-xs text-[#6B4423]">
                            ${r.submitted_at ? new Date(r.submitted_at).toLocaleString() : ''}
                        </p>
                    </div>
                    <span class="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-800">Pending</span>
                </div>
                <div class="text-sm space-y-1 mb-3">
                    <p><strong>Company:</strong> ${escapeHtml(p.company || '—')}</p>
                    <p><strong>Email:</strong> ${escapeHtml(p.email || '—')}</p>
                    <p><strong>Phone:</strong> ${escapeHtml((typeof formatPhoneDisplay === 'function' ? formatPhoneDisplay(p.phone) : p.phone) || '—')}</p>
                    <p><strong>Territory:</strong> ${escapeHtml(p.territory || '—')}</p>
                    <p><strong>Shipping:</strong> ${escapeHtml(p.shipping_address || '—')}</p>
                    <p><strong>Billing:</strong> ${escapeHtml(p.billing_address || '—')}</p>
                    <p><strong>Notes:</strong> ${escapeHtml(p.notes || '—')}</p>
                </div>
                <div class="flex gap-2">
                    <button type="button"
                            onclick="approveCustomerChangeRequest('${r.id}')"
                            class="px-4 py-2 bg-[#1E4D2B] text-[#d4b78f] rounded-xl font-semibold">
                        Approve
                    </button>
                    <button type="button"
                            onclick="denyCustomerChangeRequest('${r.id}')"
                            class="px-4 py-2 border-2 border-red-600 text-red-700 rounded-xl font-semibold">
                        Deny
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function hideCustomerChangeRequestsPanel() {
    const modal = document.getElementById('customer-change-requests-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

async function approveCustomerChangeRequest(id) {
    try {
        const { data: req, error: fetchError } = await supabaseClient
            .from('customer_change_requests')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !req) {
            alert('Could not load request.');
            return;
        }

        const p = req.proposed_changes || {};

        const { error: updateCustomerError } = await supabaseClient
            .from('customers')
            .update({
                name: p.name || null,
                company: p.company || null,
                email: p.email || null,
                phone: p.phone || null,
                territory: p.territory || null,
                shipping_address: p.shipping_address || null,
                billing_address: p.billing_address || null,
                notes: p.notes || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', req.customer_id);

        if (updateCustomerError) {
            console.error(updateCustomerError);
            alert('Failed to update customer.\n' + updateCustomerError.message);
            return;
        }

        const { error: statusError } = await supabaseClient
            .from('customer_change_requests')
            .update({
                status: 'Approved',
                decided_at: new Date().toISOString()
            })
            .eq('id', id);

        if (statusError) {
            console.error(statusError);
        }

        alert('Customer edit approved and applied.');
        await showCustomerChangeRequestsPanel();
        await updateCustomerChangeRequestsBadge();
        if (typeof loadCustomers === 'function') await loadCustomers();

    } catch (err) {
        console.error(err);
        alert('Something went wrong.');
    }
}

async function denyCustomerChangeRequest(id) {
    const notes = prompt('Reason for denial (optional):', '') || null;

    try {
        const { error } = await supabaseClient
            .from('customer_change_requests')
            .update({
                status: 'Denied',
                admin_notes: notes,
                decided_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) {
            console.error(error);
            alert('Failed to deny.\n' + error.message);
            return;
        }

        alert('Edit request denied.');
        await showCustomerChangeRequestsPanel();
        await updateCustomerChangeRequestsBadge();

    } catch (err) {
        console.error(err);
        alert('Something went wrong.');
    }
}

// Keep badge in sync on load
setTimeout(updateCustomerChangeRequestsBadge, 600);

// ================== CUSTOMER MAP ==================
// --- Customer Map Helpers ---

const GEOCODE_CACHE_KEY = 'dn_geocode_cache_v4';
const GEOCODE_USER_AGENT = 'DonegalNaturalInternalPortal/1.0 (admin@donegalnaturaldogtreats.com)';

function getGeocodeCache() {
    try {
        return JSON.parse(localStorage.getItem(GEOCODE_CACHE_KEY) || '{}');
    } catch {
        return {};
    }
}

function setGeocodeCache(cache) {
    try {
        localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.warn('Geocode cache write failed', e);
    }
}

function normalizeAddressKey(addr) {
    return String(addr || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s,.-]/g, '')
        .trim();
}
/**
 * Strip business names, contact people, and trailing notes so Nominatim
 * sees a clean street + city + state + ZIP string.
 */
/**
 * Parse a noisy shipping address into street / city / state / zip.
 * Returns null if we cannot extract usable components.
 */
/**

 * Aggressive free-form clean for Nominatim.
 * - Starts at the first house number
 * - Strips suite/unit/apt noise
 * - Keeps up to the real ZIP (last 5-digit group)
 */
function cleanAddressForGeocode(raw) {
    if (!raw) return '';
    let s = String(raw)
        .replace(/\bUnited States\b/gi, '')
        .replace(/\bUSA\b/gi, '')
        .replace(/\bDO NOT\b[\s\S]*$/i, '')
        .replace(/[\n\r]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // Start at first house number
    const numIdx = s.search(/\b\d{1,6}[A-Za-z]?\s+[A-Za-z0-9]/);
    if (numIdx > 0) s = s.slice(numIdx);

    // Strip suite / unit / apt / # noise (helps Nominatim)
    s = s.replace(/\b(suite|ste|unit|apt|#)\s*[a-z0-9-]+\b/gi, ' ');
    s = s.replace(/\s+/g, ' ').trim();

    // Keep everything up to (and including) the LAST ZIP-like number
    const zipMatch = s.match(/^(.*\b\d{5}(?:-\d{4})?)\b/);
    if (zipMatch) s = zipMatch[1].trim();

    return s;
}

function parseAddressComponents(raw) {
    if (!raw) return null;
    let s = String(raw)
        .replace(/\bUnited States\b/gi, '')
        .replace(/\bUSA\b/gi, '')
        .replace(/\bDO NOT\b[\s\S]*$/i, '')
        .replace(/\s+/g, ' ')
        .trim();

    // Prefer "… City, ST ZIP" or "… City ST ZIP"
    let m = s.match(/(.+?)[,\s]+([A-Za-z .'-]+?)[,\s]+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/i);
    if (!m) {
        m = s.match(/(.+?)\s+([A-Za-z .'-]+)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/i);
    }
    // Also accept full state name "Florida"
    if (!m) {
        m = s.match(/(.+?)[,\s]+([A-Za-z .'-]+?)[,\s]+(Florida|Fl)\s+(\d{5}(?:-\d{4})?)\s*$/i);
        if (m) m[3] = 'FL';
    }
    if (!m) return null;

    let streetPart = m[1].trim();
    // Drop leading business / contact text — start at first street number
    const numIdx = streetPart.search(/\b\d{1,6}\s+[A-Za-z0-9]/);
    if (numIdx > 0) streetPart = streetPart.slice(numIdx);

    return {
        street: streetPart.trim(),
        city: m[2].trim(),
        state: m[3].toUpperCase(),
        zip: m[4]
    };
}

/**
 * Lightweight Florida sanity check.
 * Only rejects results when the original address clearly claims Florida.
 */
function isPlausibleResult(lat, lng, originalAddr) {
    const hasFL = /\b(FL|Florida)\b/i.test(originalAddr || '');
    if (!hasFL) return true;
    // Rough Florida bounding box
    return lat >= 24.0 && lat <= 31.5 && lng >= -88.0 && lng <= -79.0;
}
/**
 * Geocode a shipping address via Nominatim (OpenStreetMap).
 * Rate-limited: call with ≥1 s delay between requests.
 * Results are cached in localStorage.
 * Returns { lat, lng } or null.
 */
async function geocodeAddress(address) {
    if (!address || !String(address).trim()) return null;

    const key = normalizeAddressKey(address);
    const cache = getGeocodeCache();

    if (cache[key]) {
        if (cache[key].failed) return null;
        if (cache[key].lat != null && cache[key].lng != null) {
            return { lat: cache[key].lat, lng: cache[key].lng };
        }
    }

    const cleaned = (typeof cleanAddressForGeocode === 'function')
        ? cleanAddressForGeocode(address)
        : String(address).trim();

    let coords = null;
    try {
        if (!window.google || !google.maps || !google.maps.Geocoder) {
            throw new Error('Google Geocoder is not loaded');
        }
        const geocoder = new google.maps.Geocoder();
        const response = await geocoder.geocode({
            address: cleaned || String(address).trim(),
            componentRestrictions: { country: 'US' }
        });
        const first = response && response.results && response.results[0];
        if (first && first.geometry && first.geometry.location) {
            const loc = first.geometry.location;
            const lat = typeof loc.lat === 'function' ? loc.lat() : Number(loc.lat);
            const lng = typeof loc.lng === 'function' ? loc.lng() : Number(loc.lng);
            if (isFinite(lat) && isFinite(lng)) {
                coords = { lat: lat, lng: lng };
            }
        }
    } catch (err) {
        console.warn('Google geocode error:', err && err.message ? err.message : err);
    }

    if (coords) {
        cache[key] = { lat: coords.lat, lng: coords.lng, ts: Date.now() };
        setGeocodeCache(cache);
        return coords;
    }

    cache[key] = { failed: true, ts: Date.now() };
    setGeocodeCache(cache);
    return null;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// --- Customer Map Helpers ---
let customerMap;

function formatShipRow(row) {
    if (!row) return '';
    const line = String(row.address_line1 || '').trim();
    const cityState = [row.city, row.state].filter(Boolean).join(', ');
    return [line, cityState, row.zip].filter(Boolean).join(', ');
}

function resolveCustomerMapAddress(customer, shipRows) {
    const structured = formatShipRow(shipRows && shipRows[String(customer.id)]);
    if (structured) return structured;
    const raw = customer.shippingAddress || customer.shipping_address
        || customer.billingAddress || customer.billing_address || '';
    const cleaned = (typeof cleanAddressForGeocode === 'function')
        ? cleanAddressForGeocode(raw)
        : String(raw).trim();
    return cleaned || String(raw).trim();
}

async function persistCustomerMapCoords(customerId, shipId, coords) {
    if (!coords || !isFinite(coords.lat) || !isFinite(coords.lng)) return;
    try {
        if (shipId) {
            await supabaseClient
                .from('customer_shipping_addresses')
                .update({ lat: coords.lat, lng: coords.lng })
                .eq('id', shipId);
        }
        if (customerId) {
            await supabaseClient
                .from('customers')
                .update({ lat: coords.lat, lng: coords.lng })
                .eq('id', customerId);
        }
    } catch (err) {
        console.warn('persistCustomerMapCoords:', err);
    }
}

async function initCustomerMap() {
    const mapContainer = document.getElementById('customer-map');
    const statusEl = document.getElementById('customer-map-status');
    if (!mapContainer) return;

    if (!window.google || !google.maps || !google.maps.Map) {
        initCustomerMap._tries = (initCustomerMap._tries || 0) + 1;
        if (initCustomerMap._tries > 20) {
            if (statusEl) statusEl.textContent = 'Google Maps did not load. Check the API key.';
            return;
        }
        if (statusEl) statusEl.textContent = 'Loading Google Maps…';
        setTimeout(function () { initCustomerMap(); }, 300);
        return;
    }
    initCustomerMap._tries = 0;

    if (initCustomerMap._busy) return;
    initCustomerMap._busy = true;

    try {
        if (window._customerMapMarkers && window._customerMapMarkers.length) {
            window._customerMapMarkers.forEach(function (m) {
                if (m && typeof m.setMap === 'function') m.setMap(null);
            });
        }
        window._customerMapMarkers = [];
        mapContainer.innerHTML = '';
        customerMap = new google.maps.Map(mapContainer, {
            center: { lat: 27.8, lng: -81.7 },
            zoom: 6,
            mapId: '9c81a52bfd14d6f58716660f',
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true
        });
        const markerLib = await google.maps.importLibrary('marker');
        const AdvancedMarkerElement = markerLib.AdvancedMarkerElement;

        await new Promise(function (resolve) {
            google.maps.event.addListenerOnce(customerMap, 'idle', resolve);
            setTimeout(resolve, 1200);
        });

        const pinIcon = {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">' +
                '<path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#1E4D2B"/>' +
                '<circle cx="12" cy="12" r="5" fill="#d4b78f"/>' +
                '</svg>'
            ),
            scaledSize: new google.maps.Size(24, 36),
            anchor: new google.maps.Point(12, 36)
        };

        if (!allCustomers || allCustomers.length === 0) {
            await loadCustomers();
        }

        const shipRows = {};
        try {
            const { data: ships, error: shipErr } = await supabaseClient
                .from('customer_shipping_addresses')
                .select('id, customer_id, address_line1, city, state, zip, is_default, lat, lng, place_id');
            if (!shipErr) {
                (ships || []).forEach(function (row) {
                    const id = String(row.customer_id);
                    if (!shipRows[id] || row.is_default) shipRows[id] = row;
                });
            }
        } catch (err) {
            console.warn('customer_shipping_addresses for map:', err);
        }

        const cache = getGeocodeCache();
        const rows = (allCustomers || []).map(function (c) {
            return { customer: c, addr: resolveCustomerMapAddress(c, shipRows) };
        }).filter(function (row) {
            return !!String(row.addr || '').trim();
        });

        const boundsObj = new google.maps.LatLngBounds();
        let pinCount = 0;

        function addPin(customer, addr, coords) {
            const lat = Number(coords.lat);
            const lng = Number(coords.lng);
            if (!isFinite(lat) || !isFinite(lng)) return;
            const marker = new AdvancedMarkerElement({
                position: { lat: lat, lng: lng },
                map: customerMap,
                title: customer.name || customer.company || 'Customer'
            });
            const info = new google.maps.InfoWindow({
                content:
                    '<div style="color:#1E4D2B;max-width:240px;"><strong>' +
                    escapeHtml(customer.name || 'Customer') + '</strong><br>' +
                    escapeHtml(customer.company || '') + '<br>' +
                    escapeHtml(addr || '') + '</div>'
            });
            marker.addEventListener('gmp-click', function () {
                info.setPosition({ lat: lat, lng: lng });
                info.open(customerMap);
            });
            window._customerMapMarkers.push(marker);
            boundsObj.extend({ lat: lat, lng: lng });
            pinCount += 1;
        }

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const ship = shipRows[String(row.customer.id)] || null;
            let coords = null;
            if (ship && ship.lat != null && ship.lng != null) {
                coords = { lat: Number(ship.lat), lng: Number(ship.lng) };
            } else if (row.customer.lat != null && row.customer.lng != null) {
                coords = { lat: Number(row.customer.lat), lng: Number(row.customer.lng) };
            } else {
                if (statusEl) {
                    statusEl.textContent = 'Geocoding ' + (i + 1) + ' of ' + rows.length + '…';
                }
                coords = await geocodeAddress(row.addr);
                if (coords) {
                    persistCustomerMapCoords(row.customer.id, ship && ship.id, coords);
                }
                if (i < rows.length - 1) await delay(200);
            }
            if (coords && isFinite(coords.lat) && isFinite(coords.lng)) {
                addPin(row.customer, row.addr, coords);
            }
        }

        if (pinCount > 0) customerMap.fitBounds(boundsObj, 40);
        if (statusEl) {
            statusEl.textContent = pinCount
                ? (pinCount + ' customer location' + (pinCount === 1 ? '' : 's') + ' shown')
                : 'No geocoded addresses yet';
        }
        console.log('customer map pins', pinCount, window._customerMapMarkers.length);
    } catch (err) {
        console.error('initCustomerMap failed:', err);
        if (statusEl) statusEl.textContent = 'Map error: ' + (err.message || err);
    } finally {
        initCustomerMap._busy = false;
    }
}

window.loadCustomers = loadCustomers;
window.salesmanHasApprovedSheet = salesmanHasApprovedSheet;
window.isHiddenTestCustomer = isHiddenTestCustomer;
window.isTestStoreOrder = isTestStoreOrder;
window.setCustomerMassFilter = setCustomerMassFilter;
window.setCustomerSalesmanFilter = setCustomerSalesmanFilter;
window.clearCustomerListFilters = clearCustomerListFilters;
window.renderCustomers = renderCustomers;
window.toggleSelectAllCustomers = toggleSelectAllCustomers;
window.updateMassAssignCount = updateMassAssignCount;
window.massAssignSelectedCustomers = massAssignSelectedCustomers;
window.updateTotalOrdersBadge = updateTotalOrdersBadge;
window.searchCustomers = searchCustomers;
window.addTestCustomer = addTestCustomer;
window.initAddCustomerPlaces = initAddCustomerPlaces;
window.showAddCustomerModal = showAddCustomerModal;
window.hideAddCustomerModal = hideAddCustomerModal;
window.assertCustomerEmailAvailable = assertCustomerEmailAvailable;
window.normalizeStoreKey = normalizeStoreKey;
window.findExactStoreMatch = findExactStoreMatch;
window.matchCustomerForInquiryApproval = matchCustomerForInquiryApproval;
window.assertSalesmanEmailAvailable = assertSalesmanEmailAvailable;
window.saveNewCustomer = saveNewCustomer;
window.parseCustomerPaymentDetails = parseCustomerPaymentDetails;
window.formatCustomerPaymentLabel = formatCustomerPaymentLabel;
window.customerPaymentDetailsHtml = customerPaymentDetailsHtml;
window.showCustomerDetail = showCustomerDetail;
window.hideEditCustomerModal = hideEditCustomerModal;
window.openSetCustomerPricing = openSetCustomerPricing;
window.notifyCustomerPricingReady = notifyCustomerPricingReady;
window.toggleCustomerSpecialPricing = toggleCustomerSpecialPricing;
window.normSpecialName = normSpecialName;
window.openCustomerProtectedSheet = openCustomerProtectedSheet;
window.hideCustomerProtectedSheet = hideCustomerProtectedSheet;
window.saveCustomerProtectedSheet = saveCustomerProtectedSheet;
window.approveCustomerPricingAccess = approveCustomerPricingAccess;
window.revokeCustomerPricingAccess = revokeCustomerPricingAccess;
window.showEditCustomerModal = showEditCustomerModal;
window.saveEditedCustomer = saveEditedCustomer;
window.hideCustomerModal = hideCustomerModal;
window.isCustomerEnabled = isCustomerEnabled;
window.toggleCustomerActive = toggleCustomerActive;
window.shouldSkipCustomerLoginReset = shouldSkipCustomerLoginReset;
window.setAllCustomersActive = setAllCustomersActive;
window.resendCustomerCredentials = resendCustomerCredentials;
window.deactivateCustomer = deactivateCustomer;
window.deleteCustomer = deleteCustomer;
window.viewCustomerOrders = viewCustomerOrders;
window.loadCustomerChangeRequests = loadCustomerChangeRequests;
window.updateCustomerChangeRequestsBadge = updateCustomerChangeRequestsBadge;
window.showCustomerChangeRequestsPanel = showCustomerChangeRequestsPanel;
window.hideCustomerChangeRequestsPanel = hideCustomerChangeRequestsPanel;
window.approveCustomerChangeRequest = approveCustomerChangeRequest;
window.denyCustomerChangeRequest = denyCustomerChangeRequest;
window.getGeocodeCache = getGeocodeCache;
window.setGeocodeCache = setGeocodeCache;
window.normalizeAddressKey = normalizeAddressKey;
window.cleanAddressForGeocode = cleanAddressForGeocode;
window.parseAddressComponents = parseAddressComponents;
window.isPlausibleResult = isPlausibleResult;
window.geocodeAddress = geocodeAddress;
window.delay = delay;
window.formatShipRow = formatShipRow;
window.resolveCustomerMapAddress = resolveCustomerMapAddress;
window.persistCustomerMapCoords = persistCustomerMapCoords;
window.initCustomerMap = initCustomerMap;
