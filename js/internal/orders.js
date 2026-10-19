// Internal portal — orders, approve/ship modals, and pro forma notify.
// Shared state (allOrders, allCustomers, supabaseClient, currentFilter, and the
// back-order queues) stays global in internal-portal.js.
// shipInvoice* queues are global because back-order fulfillment still lives there.
async function notifyMarshallProforma(order) {
    try {
        const emailKey = String(order.customerEmail || order.customer_email || '').trim().toLowerCase();
        const idKey = String(order.customerId || order.customer_id || '').trim();
        if ((!order.billingAddress && !order.billing_address)
            || (!order.shippingAddress && !order.shipping_address)
            || (!order.customerPhone && !order.customer_phone)) {
            const pool = (typeof allCustomers !== 'undefined' && allCustomers) ? allCustomers : [];
            const hit = pool.find(function (c) {
                if (idKey && String(c.id) === idKey) return true;
                const e = String(c.email || '').trim().toLowerCase();
                return !!(emailKey && e && e === emailKey);
            });
            if (hit) {
                if (!order.customerPhone && !order.customer_phone) order.customerPhone = hit.phone || '';
                if (!order.billingAddress && !order.billing_address) {
                    order.billingAddress = hit.billingAddress || hit.billing_address || '';
                }
                if (!order.shippingAddress && !order.shipping_address) {
                    order.shippingAddress = hit.shippingAddress || hit.shipping_address || '';
                }
            }
        }
        if (order.customerPhone && typeof formatPhoneDisplay === 'function') {
            order.customerPhone = formatPhoneDisplay(order.customerPhone);
        }
        const res = await fetch(SUPABASE_URL + '/functions/v1/send-pro-forma-email', {
            method: 'POST',
            headers: await getEdgeFunctionHeaders(),
            body: JSON.stringify({
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
                source: order.source || 'internal',
                commissionRate: order.commissionRate || order.salesman_commission_percent || null,
                isRevision: !!(order.isRevision || orderHasUpdateNote(order)),
                changeLog: order.changeLog || '',
                editedAt: order.editedAt || '',
                previousSubtotal: order.previousSubtotal,
                updatedSubtotal: order.updatedSubtotal,
                customerPhone: order.customerPhone || order.customer_phone || '',
                billingAddress: order.billingAddress || order.billing_address || '',
                shippingAddress: order.shippingAddress || order.shipping_address || '',
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

// ================== ORDERS ==================
// --- Orders Helpers ---
async function loadOrders() {
    showTableLoading('orders-table', 'Loading orders…');
    try {
        const { data, error } = await supabaseClient
            .from('orders')
            .select('id, source, status, submitted_at, customer_id, invoice_number, customer_name, customer_email, customer_company, salesman_name, salesman_email, notes, shipping_cost, credit, items, tracking_number, carrier, delivered_at, payment_status, paid_at, portal_commission_rate, salesman_commission_percent')
            .order('submitted_at', { ascending: false });

        if (error) {
            console.error('loadOrders error:', error);
            allOrders = [];
        } else {
            // Map Supabase rows to the shape the existing table expects
            allOrders = (data || []).map(o => ({
                id: o.id,
                source: o.source,
                status: o.status,
                submittedAt: o.submitted_at,
                customerId: o.customer_id || null,
                invoiceNumber: o.invoice_number || null,
                customer: o.customer_name,
                customerEmail: o.customer_email,
                customerCompany: o.customer_company,
                salesman: o.salesman_name,
                salesmanEmail: o.salesman_email,
                notes: o.notes,
                shippingCost: o.shipping_cost,
                credit: o.credit != null ? Number(o.credit) : 0,
                items: o.items || [],
                trackingNumber: o.tracking_number || null,
                carrier: o.carrier || 'UPS',
                deliveredAt: o.delivered_at || null,
                paymentStatus: o.payment_status || null,
                paidAt: o.paid_at || null,
                portalCommissionRate: o.portal_commission_rate != null ? Number(o.portal_commission_rate) : 5,
                salesmanCommissionPercent: o.salesman_commission_percent != null && o.salesman_commission_percent !== ''
                    ? Number(o.salesman_commission_percent)
                    : null
            }));
            ordersLoadedAt = Date.now();
        }
    } catch (err) {
        console.error(err);
        allOrders = [];
    }

    if (typeof updateOrderStatusCards === 'function') {
        updateOrderStatusCards();
    }

    if (typeof renderOrdersTable === 'function') {
        renderOrdersTable();
    }

    if (typeof updateDashboardPendingCount === 'function') {
        updateDashboardPendingCount();
    }

    if (typeof updateDashboardSales === 'function') {
        updateDashboardSales();
    }

    if (typeof updateDashboardOrders === 'function') {
        updateDashboardOrders();
    }
}

function renderOrdersSummary() {
    const totalEl = document.getElementById('total-orders-count');
    const pendingEl = document.getElementById('pending-orders-count');
    const monthlyOrdersEl = document.getElementById('monthly-orders-count');
    const monthlySalesEl = document.getElementById('monthly-sales-count');

    if (!totalEl || !pendingEl) return;

    totalEl.textContent = allOrders.length;

    const pending = allOrders.filter(o => (o.status || "").toLowerCase() === 'submitted').length;
    pendingEl.textContent = pending;

    const now = new Date();
    const thisMonthOrders = allOrders.filter(o => {
        const orderDate = new Date(o.submittedAt);
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
    });

    if (monthlyOrdersEl) monthlyOrdersEl.textContent = thisMonthOrders.length;

    let monthlyTotal = 0;
    thisMonthOrders.forEach(order => {
        if (order.items) {
            order.items.forEach(item => {
                monthlyTotal += (item.quantity || 1) * 50;
            });
        }
    });

    if (monthlySalesEl) monthlySalesEl.textContent = '$' + monthlyTotal.toLocaleString();
}

function showAgingOrders() {
    // Go to the Orders section
    showSection('orders');

    // Set a special filter for aging orders
    currentFilter = 'aging';

    // Re-render the table with only aging orders
    if (typeof renderOrdersTable === 'function') {
        renderOrdersTable();
    }
}

function updateOrderStatusCards() {
    if (!allOrders || allOrders.length === 0) return;

    let pending = 0;
    let received = 0;
    let processing = 0;
    let shipped = 0;
    let delivered = 0;

    allOrders.forEach(order => {
        const status = (order.status || '').toLowerCase();

        if (status === 'pending' || status === 'submitted') {
            pending++;
        } else if (status === 'received') {
            received++;
        } else if (status === 'processing') {
            processing++;
        } else if (status === 'shipped') {
            shipped++;
        } else if (status === 'delivered') {
            delivered++;
        }
    });

    // Update the DOM elements
    const pendingEl = document.getElementById('orders-pending-count');
    const receivedEl = document.getElementById('orders-received-count');
    const processingEl = document.getElementById('orders-processing-count');
    const shippedEl = document.getElementById('orders-shipped-count');
    const deliveredEl = document.getElementById('orders-delivered-count');

    if (pendingEl) pendingEl.textContent = pending;
    if (receivedEl) receivedEl.textContent = received;
    if (processingEl) processingEl.textContent = processing;
    if (shippedEl) shippedEl.textContent = shipped;
    if (deliveredEl) deliveredEl.textContent = delivered;
    
    const totalEl = document.getElementById('orders-total-count');
    if (totalEl) {
    totalEl.textContent = allOrders.length;
}
}

function toggleOrderBOExpand(orderId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    }
    if (!window.expandedOrderBOs) window.expandedOrderBOs = {};
    const key = String(orderId || '');
    window.expandedOrderBOs[key] = !window.expandedOrderBOs[key];
    if (typeof renderOrdersTable === 'function') renderOrdersTable();
}

function copyOrderId(orderId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    }
    const fullId = String(orderId || '');
    if (!fullId) return;

    const done = () => {
        // brief visual feedback if the clicked control is a button
        const btn = event && event.currentTarget;
        if (btn && btn.tagName === 'BUTTON') {
            const prev = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => { btn.innerHTML = prev; }, 900);
        }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(fullId).then(done).catch(() => {
            window.prompt('Copy order ID:', fullId);
        });
    } else {
        window.prompt('Copy order ID:', fullId);
    }
}

function hasUnpaidPriorOrders(order) {
    if (!order || !allOrders || allOrders.length < 2) return false;

    const email = String(order.customerEmail || order.customer_email || '').trim().toLowerCase();
    const name = String(order.customer || order.customer_name || '').trim().toLowerCase();
    if (!email && !name) return false;

    return allOrders.some(other => {
        if (String(other.id) === String(order.id)) return false;

        const otherEmail = String(other.customerEmail || other.customer_email || '').trim().toLowerCase();
        const otherName = String(other.customer || other.customer_name || '').trim().toLowerCase();

        const sameCustomer =
            (email && otherEmail && email === otherEmail) ||
            (name && otherName && name === otherName);
        if (!sameCustomer) return false;

        const pay = String(other.paymentStatus || other.payment_status || '').toLowerCase();
        if (pay === 'paid') return false;

        const st = String(other.status || '').toLowerCase();
        // Only count orders that should have been paid (past pending/submitted/denied)
        if (st === 'pending' || st === 'submitted' || st === 'denied' || st === '') return false;

        return true;
    });
}

function unpaidPriorBadgeHTML(order) {
    if (typeof hasUnpaidPriorOrders !== 'function' || !hasUnpaidPriorOrders(order)) return '';
    return `<span class="inline-flex items-center gap-0.5 px-1.5 py-0 text-[9px] font-bold rounded-full bg-red-100 text-red-700 border border-red-300 whitespace-nowrap leading-none" title="Customer has an unpaid prior order">
        <i class="fas fa-exclamation-triangle text-[8px]"></i>
        Unpaid
    </span>`;
}

function renderOrdersTable() {
    const container = document.getElementById('orders-table');
    const empty = document.getElementById('orders-empty');
    if (!container) return;

    let filteredOrders = allOrders;

    if (currentFilter !== 'all') {
        filteredOrders = filteredOrders.filter(order => {
            const status = (order.status || '').toString().trim().toLowerCase();
            if (currentFilter === 'pending') {
                return status === 'pending' || status === 'submitted' || status === '';
            }
            if (currentFilter === 'aging') {
                if (status !== 'received' && status !== 'processing') return false;
                const orderDate = new Date(order.submittedAt || order.date || new Date());
                const tenDaysAgo = new Date();
                tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
                return orderDate < tenDaysAgo;
            }
            return status === currentFilter.toLowerCase();
        });
    }

    const searchInput = document.getElementById('orders-search');
    const searchTerm = (searchInput?.value || '').trim().toLowerCase();
    if (searchTerm) {
        filteredOrders = filteredOrders.filter(order => {
            const orderId = String(order.id || '').toLowerCase();
            return orderId.includes(searchTerm);
        });
    }

    if (filteredOrders.length === 0) {
        container.innerHTML = '';
        if (empty) empty.classList.remove('hidden');
        return;
    }

    if (empty) empty.classList.add('hidden');

    function orderCompanyLabel(order) {
        const stored = String((order && (order.customerCompany || order.customer_company)) || '').trim();
        if (stored) return stored;
        const id = String((order && (order.customerId || order.customer_id)) || '');
        const email = String((order && (order.customerEmail || order.customer_email)) || '').toLowerCase().trim();
        const pool = (typeof allCustomers !== 'undefined' && allCustomers) ? allCustomers : [];
        const hit = pool.find(function (c) {
            return (id && String(c.id) === id) ||
                (email && String(c.email || '').toLowerCase().trim() === email);
        });
        if (hit && hit.company) return hit.company;
        const raw = String((order && order.customer) || '').trim();
        if (raw.indexOf('/') !== -1) return raw.split('/')[0].trim();
        return raw || '—';
    }

    function getOrderTotalInfo(order) {
    let total = 0;
    let hasMarketPrice = false;
    (order.items || []).forEach(item => {
        const unit = parseFloat(item.unitPrice);
        const hasRealPrice = !isNaN(unit) && unit > 0;
        const qty = parseInt(item.quantity, 10) || 0;

        if (item.isMarketPrice && !hasRealPrice) {
            hasMarketPrice = true;
        } else if (hasRealPrice) {
            total += unit * qty;
        }
    });
    const shipping = Number(order.shippingCost != null ? order.shippingCost : order.shipping_cost) || 0;
    const credit = Number(order.credit != null ? order.credit : 0) || 0;
    total = Math.max(0, total + shipping - credit);
    return { total, hasMarketPrice };
}

    const jonathanCommissionButtons = (typeof isJonathanAdmin === 'function' && isJonathanAdmin()) ? `
        <button id="apply-10-commission-btn"
                onclick="bulkSetPortalCommissionRate(10)"
                class="hidden px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90"
                style="background:#6B4423;color:#d4b78f;">
            Apply 10% Commission
        </button>
        <button id="reset-5-commission-btn"
                onclick="bulkSetPortalCommissionRate(5)"
                class="hidden px-4 py-2 border-2 border-[#6B4423] text-[#6B4423] rounded-xl text-sm font-semibold hover:bg-[#f8f4eb]">
            Reset to 5%
        </button>
    ` : '';

    let html = `
    <div class="mb-3 flex flex-wrap gap-2 items-center">
        <button id="print-selected-btn"
                onclick="printSelectedOrders()"
                class="hidden px-4 py-2 bg-[#1E4D2B] text-[#d4b78f] rounded-xl text-sm font-semibold hover:bg-[#254a2f]">
            Print Selected Orders
        </button>
        ${(typeof isJonathanAdmin === 'function' && isJonathanAdmin()) ? `
        <button id="delete-selected-btn"
                onclick="deleteSelectedOrders()"
                class="hidden px-4 py-2 bg-red-700 text-white rounded-xl text-sm font-semibold hover:bg-red-800">
            Delete Selected Orders
        </button>` : ''}
        ${jonathanCommissionButtons}
    </div>
    <table class="w-full">
        <thead>
            <tr class="bg-[#1E4D2B] text-[#d4b78f]">
                <th class="p-3 text-center w-10">
                    <input type="checkbox" id="select-all-orders" onchange="toggleSelectAllOrders(this)">
                </th>
                <th class="p-3 text-left">Submitted by</th>
                <th class="p-3 text-left">Company Name</th>
                <th class="p-3 text-left">Total</th>
                <th class="p-3 text-left">Date</th>
            </tr>
        </thead>
        <tbody>
`;

    filteredOrders.forEach(order => {
        const currentStatus = order.status || 'submitted';
        const statusLower = (currentStatus || '').toLowerCase();
        const { total, hasMarketPrice } = getOrderTotalInfo(order);
        const safeId = String(order.id || '').replace(/'/g, "\\'");

        const rateBadge = Number(order.portalCommissionRate) === 10
            ? `<span class="ml-1 text-xs font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">10%</span>`
            : '';
        const creditAmt = Number(order.credit) || 0;
        const creditBadge = creditAmt > 0
            ? `<span class="ml-1 text-xs font-bold bg-red-100 text-red-800 px-1.5 py-0.5 rounded">Credit</span>`
            : '';
        const editedBadge = /ORDER UPDATED/i.test(String(order.notes || ''))
            ? `<span class="ml-2 text-xs font-bold bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded">Edited</span>`
            : '';

        let totalHTML = '';
        if (hasMarketPrice) {
            totalHTML = `<span class="text-orange-600 font-semibold">Needs Pricing</span>${rateBadge}${creditBadge}`;
        } else {
            totalHTML = `
                <div class="flex flex-col items-start gap-0.5">
                    <span>$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${rateBadge}${creditBadge}</span>
                </div>
            `;
        }

        

        html += `
            <tr class="border-t border-[#6B4423] hover:bg-[#f8f4eb] cursor-pointer"
                onclick="openOrderInvoiceModal('${safeId}')">
                <td class="p-3 text-center" onclick="event.stopPropagation()">
                    <input type="checkbox" class="order-checkbox" value="${safeId}" onchange="updatePrintSelectedButton()">
                </td>
                <td class="p-3">${escapeHtml(order.salesman || (order.source === 'wholesale' ? 'Wholesale' : '—'))}</td>
                <td class="p-3">${escapeHtml(orderCompanyLabel(order))}${editedBadge}</td>
                <td class="p-3">${totalHTML}</td>
                <td class="p-3 text-sm">${order.submittedAt ? new Date(order.submittedAt).toLocaleDateString() : '—'}</td>
            </tr>
        `;


    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

let currentMarketPriceOrderId = null;

function openMarketPriceModal(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    currentMarketPriceOrderId = orderId;

    const subtitle = document.getElementById('market-price-subtitle');
    if (subtitle) {
        subtitle.textContent = `Order #${displayInvoiceNumber(order)} · ${order.customer || ''}`;
    }

    const container = document.getElementById('market-price-items');
    if (!container) return;

    const marketItems = (order.items || []).filter(item =>
        item.isMarketPrice || item.unitPrice === null || item.unitPrice === undefined
    );

    if (marketItems.length === 0) {
        container.innerHTML = '<p class="text-[#6B4423]">No market-price items found.</p>';
    } else {
        container.innerHTML = marketItems.map((item, index) => `
            <div class="bg-[#f8f4eb] border border-[#d4b78f] rounded-xl p-4">
                <p class="font-semibold brand-green">${escapeHtml(item.product)}</p>
                <p class="text-sm text-[#6B4423] mb-2">Quantity: ${item.quantity} · Case: ${item.caseSize || '—'}</p>
                <label class="text-sm text-[#6B4423]">Unit Price ($)</label>
                <input type="number"
                       id="market-price-input-${index}"
                       min="0"
                       step="0.01"
                       placeholder="0.00"
                       class="w-full mt-1 border-2 border-[#6B4423] rounded-lg px-3 py-2 text-sm"
                       data-product="${escapeHtml(item.product)}">
            </div>
        `).join('');
    }

    const modal = document.getElementById('market-price-modal');
    if (modal) modal.classList.remove('hidden');
}

function hideMarketPriceModal() {
    const modal = document.getElementById('market-price-modal');
    if (modal) modal.classList.add('hidden');
    currentMarketPriceOrderId = null;
}

function confirmMarketPrices() {
    if (!currentMarketPriceOrderId) return;

    const order = allOrders.find(o => o.id === currentMarketPriceOrderId);
    if (!order) return;

    const inputs = document.querySelectorAll('#market-price-items input[type="number"]');
    let allFilled = true;

    inputs.forEach(input => {
        const value = parseFloat(input.value);
        if (isNaN(value) || value < 0) {
            allFilled = false;
            input.classList.add('border-red-500');
        } else {
            input.classList.remove('border-red-500');

            // Update the matching item on the order
            const productName = input.dataset.product;
            const item = order.items.find(i => i.product === productName);
            if (item) {
                item.unitPrice = value;
                item.displayPrice = '$' + value.toFixed(2);
                // Keep isMarketPrice = true so market commission still applies
            }
        }
    });

    if (!allFilled) {
        alert('Please enter a valid price for every market-price item.');
        return;
    }

    // Persist the priced items to Supabase and move status to received
    (async () => {
        try {
            const { error } = await supabaseClient
                .from('orders')
                .update({
                    items: order.items,
                    status: 'received'
                })
                .eq('id', currentMarketPriceOrderId);

            if (error) throw error;

            hideMarketPriceModal();
            await loadOrders();
            alert('Market prices saved and order approved.');
        } catch (err) {
            console.error(err);
            alert('Could not save market prices.\n' + (err.message || ''));
        }
    })();
}

async function denyOrder(orderId) {
    if (!orderId) return;
    if (!confirm('Deny this order?')) return;

    try {
        const { error } = await supabaseClient
            .from('orders')
            .update({ status: 'denied' })
            .eq('id', orderId);

        if (error) throw error;

        // Order status emails removed — QuickBooks handles customer notifications
        await loadOrders();
    } catch (err) {
        console.error(err);
        alert('Could not deny order.\n' + (err.message || ''));
    }
}

// ================== APPROVE ORDER MODAL ==================
let approveOrderOrder = null;
let approveOrderItems = [];

function openApproveOrderModal(orderId) {
    const order = allOrders.find(o => String(o.id) === String(orderId));
    if (!order) {
        alert('Order not found.');
        return;
    }

    approveOrderOrder = order;
    approveOrderItems = (order.items || []).map(item => ({
        product: item.product || item.name || '',
        quantity: item.quantity || 1,
        caseSize: item.caseSize || '',
        unitPrice: item.unitPrice != null ? item.unitPrice : null,
        displayPrice: item.displayPrice || '',
        isMarketPrice: !!item.isMarketPrice
    }));

    const customerEl = document.getElementById('approve-ord-customer');
    const salesmanEl = document.getElementById('approve-ord-salesman');
    const idEl = document.getElementById('approve-ord-id');
    const subtitleEl = document.getElementById('approve-order-subtitle');

    if (customerEl) customerEl.textContent = order.customer || '—';
    if (salesmanEl) salesmanEl.textContent = order.salesman || '—';
    if (idEl) idEl.textContent = String(displayInvoiceNumber(order));
    if (subtitleEl) subtitleEl.textContent = 'Review line items, then approve or edit';

    const commissionWrap = document.getElementById('approve-ord-commission-wrap');
    const commissionInput = document.getElementById('approve-ord-commission');
    if (commissionWrap && commissionInput) {
        if (typeof isJonathanAdmin === 'function' && isJonathanAdmin()) {
            commissionWrap.classList.remove('hidden');
            const current = (typeof getOrderCommissionPercent === 'function')
                ? getOrderCommissionPercent(order)
                : 5;
            commissionInput.value = String(current);
        } else {
            commissionWrap.classList.add('hidden');
            commissionInput.value = '';
        }
    }

    const searchEl = document.getElementById('approve-ord-product-search');
    if (searchEl) searchEl.value = '';
    const resultsEl = document.getElementById('approve-ord-product-results');
    if (resultsEl) {
        resultsEl.innerHTML = '';
        resultsEl.classList.add('hidden');
    }

    renderApproveOrderItems();
    recalcApproveOrderTotals();

    document.getElementById('approve-order-modal')?.classList.remove('hidden');
}

function hideApproveOrderModal() {
    document.getElementById('approve-order-modal')?.classList.add('hidden');
    approveOrderOrder = null;
    approveOrderItems = [];
    approvePendingBackOrders = [];
}



function renderApproveOrderItems() {
    const container = document.getElementById('approve-ord-items');
    if (!container) return;

    if (!approveOrderItems.length) {
        container.innerHTML = `<p class="text-sm text-[#6B4423]">No line items.</p>`;
        return;
    }

    container.innerHTML = approveOrderItems.map((item, index) => {
        const hasRealPrice = item.unitPrice != null && !isNaN(Number(item.unitPrice)) && Number(item.unitPrice) > 0;
        const priceLabel = hasRealPrice
            ? ('$' + Number(item.unitPrice).toFixed(2))
            : (item.isMarketPrice
                ? 'Market'
                : (item.displayPrice || '—'));

        const qty = parseInt(item.quantity, 10) || 0;
        const unit = hasRealPrice ? Number(item.unitPrice) : 0;
        const lineTotal = qty * unit;
        const lineTotalLabel = hasRealPrice
            ? ('$' + lineTotal.toFixed(2))
            : '—';

        return `
            <div class="flex flex-wrap items-center gap-2 border border-[#d4b78f] rounded-xl px-3 py-2 bg-[#f8f4eb]">
                <div class="flex-1 min-w-[160px]">
                    <p class="font-semibold text-sm brand-green">${escapeHtml(orderLineDisplayName(item))}</p>
                    <p class="text-xs text-[#6B4423]">${priceLabel}${item.caseSize ? ' · ' + item.caseSize : ''}</p>
                </div>
                <input type="number" min="1" step="1" value="${item.quantity}"
                       onchange="updateApproveOrderQty(${index}, this.value)"
                       class="w-20 border-2 border-[#6B4423] rounded-lg px-2 py-1 text-sm">
                <div class="text-right min-w-[70px]">
                    <p class="text-xs text-[#6B4423]">Line Total</p>
                    <p class="font-semibold text-sm brand-green">${lineTotalLabel}</p>
                </div>
                <button type="button" onclick="markApproveItemOutOfStock(${index})"
                        class="px-3 py-1 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                    Out of Stock
                </button>
                <button type="button" onclick="removeApproveOrderItem(${index})"
                        class="px-3 py-1 text-xs bg-red-600 text-white rounded-lg">
                    Remove
                </button>
            </div>
        `;
    }).join('');
}

function markApproveItemOutOfStock(index) {
    if (!approveOrderItems[index] || !approveOrderOrder) return;

    const item = approveOrderItems[index];
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');

    approvePendingBackOrders.push({
        original_order_id: approveOrderOrder.id,
        invoice_number: String(approveOrderOrder.id),
        customer_name: approveOrderOrder.customer || approveOrderOrder.customer_name || null,
        customer_email: approveOrderOrder.customerEmail || approveOrderOrder.customer_email || null,
        customer_company: approveOrderOrder.customerCompany || approveOrderOrder.customer_company || null,
        product_name: item.product,
        case_size: item.caseSize || null,
        quantity: item.quantity || 1,
        unit_price: item.unitPrice != null ? item.unitPrice : null,
        display_price: item.displayPrice || null,
        is_market_price: !!item.isMarketPrice,
        status: 'pending',
        created_by: user.fullName || user.email || 'Admin'
    });

    // Remove line from the working order items
    approveOrderItems.splice(index, 1);
    renderApproveOrderItems();
    recalcApproveOrderTotals();
}

function updateApproveOrderQty(index, value) {
    const qty = parseInt(value, 10);
    if (!approveOrderItems[index]) return;
    if (isNaN(qty) || qty < 1) {
        approveOrderItems[index].quantity = 1;
    } else {
        approveOrderItems[index].quantity = qty;
    }
    renderApproveOrderItems();
    recalcApproveOrderTotals();
}

function removeApproveOrderItem(index) {
    approveOrderItems.splice(index, 1);
    renderApproveOrderItems();
    recalcApproveOrderTotals();
}

function renderApproveOrderProductSearch() {
    const search = (document.getElementById('approve-ord-product-search')?.value || '').toLowerCase().trim();
    const resultsEl = document.getElementById('approve-ord-product-results');
    if (!resultsEl || typeof PRODUCT_CATALOG === 'undefined') return;

    if (search.length < 1) {
        resultsEl.innerHTML = '';
        resultsEl.classList.add('hidden');
        return;
    }

    const matches = PRODUCT_CATALOG.filter(p =>
        p.name.toLowerCase().includes(search) ||
        (p.category || '').toLowerCase().includes(search)
    ).slice(0, 20);

    if (!matches.length) {
        resultsEl.innerHTML = `<p class="px-4 py-3 text-sm text-[#6B4423]">No products found.</p>`;
        resultsEl.classList.remove('hidden');
        return;
    }

    resultsEl.innerHTML = matches.map(p => {
        const safeName = String(p.name)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/"/g, '&quot;');
        return `
            <button type="button"
                    onclick="addApproveOrderProduct('${safeName}')"
                    class="w-full text-left px-4 py-2 text-sm hover:bg-[#f8f4eb] border-b border-[#f0e6d9]">
                <span class="font-medium text-[#1E4D2B]">${escapeHtml(p.name)}</span>
                <span class="block text-xs text-[#6B4423]">${p.caseSize || ''} · ${p.isMarketPrice ? 'Market' : ('$' + Number(p.unitPrice).toFixed(2))}</span>
            </button>
        `;
    }).join('');
    resultsEl.classList.remove('hidden');
}

function addApproveOrderProduct(productName) {
    const catalog = (typeof PRODUCT_CATALOG !== 'undefined')
        ? PRODUCT_CATALOG.find(p => p.name === productName)
        : null;

    const existing = approveOrderItems.find(i => i.product === productName);
    if (existing) {
        existing.quantity = (existing.quantity || 1) + 1;
    } else {
        approveOrderItems.push({
            product: productName,
            quantity: 1,
            caseSize: catalog?.caseSize || '',
            unitPrice: catalog && !catalog.isMarketPrice ? catalog.unitPrice : null,
            displayPrice: catalog
                ? (catalog.isMarketPrice ? 'Market Price' : ('$' + Number(catalog.unitPrice).toFixed(2)))
                : '',
            isMarketPrice: !!(catalog && catalog.isMarketPrice)
        });
    }

    const searchEl = document.getElementById('approve-ord-product-search');
    if (searchEl) searchEl.value = '';
    const resultsEl = document.getElementById('approve-ord-product-results');
    if (resultsEl) {
        resultsEl.innerHTML = '';
        resultsEl.classList.add('hidden');
    }

    renderApproveOrderItems();
    recalcApproveOrderTotals();
}

function recalcApproveOrderTotals() {
    let subtotal = 0;
    (approveOrderItems || []).forEach(item => {
        const unit = parseFloat(item.unitPrice);
        if (isNaN(unit) || unit < 0) return;
        subtotal += unit * (parseInt(item.quantity, 10) || 0);
    });

    const subEl = document.getElementById('approve-ord-subtotal');
    if (subEl) subEl.textContent = '$' + subtotal.toFixed(2);
    if (typeof renderApproveOrderChangeSummary === 'function') renderApproveOrderChangeSummary();
}

function editOrderFromInvoice() {
    const btn = document.getElementById('inv-edit-order-btn');
    const orderId = btn ? btn.getAttribute('data-order-id') : '';
    if (!orderId) return;
    if (typeof hideOrderInvoiceModal === 'function') hideOrderInvoiceModal();
    if (typeof openApproveOrderModal === 'function') openApproveOrderModal(orderId);
}

function readApproveOrderCommissionPercent() {
    const el = document.getElementById('approve-ord-commission');
    if (!el || (typeof isJonathanAdmin === 'function' && !isJonathanAdmin())) return null;
    const raw = String(el.value || '').trim();
    if (raw === '') return null;
    const n = Number(raw);
    if (!isFinite(n) || n < 0 || n > 100) {
        throw new Error('Commission must be between 0 and 100.');
    }
    return n;
}

function getOrderItemKey(item) {
    return String((item && (item.product || item.name)) || '').trim().toLowerCase();
}

function getOrderItemQty(item) {
    return parseInt(item && item.quantity, 10) || 0;
}

function getOrderItemUnit(item) {
    const n = parseFloat(item && item.unitPrice);
    return isFinite(n) ? n : 0;
}

function sumOrderItems(items) {
    return (items || []).reduce(function (sum, item) {
        return sum + (getOrderItemQty(item) * getOrderItemUnit(item));
    }, 0);
}

function diffOrderItems(before, after) {
    const prev = {};
    (before || []).forEach(function (item) {
        const key = getOrderItemKey(item);
        if (!key) return;
        prev[key] = { product: item.product || item.name || key, qty: getOrderItemQty(item) };
    });
    const next = {};
    (after || []).forEach(function (item) {
        const key = getOrderItemKey(item);
        if (!key) return;
        next[key] = { product: item.product || item.name || key, qty: getOrderItemQty(item) };
    });
    const changes = [];
    Object.keys(prev).forEach(function (key) {
        if (!next[key]) {
            changes.push(prev[key].product + ': removed (was qty ' + prev[key].qty + ')');
        } else if (prev[key].qty !== next[key].qty) {
            changes.push(prev[key].product + ': qty ' + prev[key].qty + ' → ' + next[key].qty);
        }
    });
    Object.keys(next).forEach(function (key) {
        if (!prev[key]) {
            changes.push(next[key].product + ': added qty ' + next[key].qty);
        }
    });
    return changes;
}

function buildOrderEditNote(beforeItems, afterItems, extra) {
    const when = new Date().toLocaleString();
    const changes = diffOrderItems(beforeItems, afterItems);
    const prevTotal = sumOrderItems(beforeItems);
    const nextTotal = sumOrderItems(afterItems);
    const lines = [
        'ORDER UPDATED',
        'Edited: ' + when,
        changes.length ? ('Changed items:\n- ' + changes.join('\n- ')) : 'Changed items: none',
        'Previous subtotal: $' + prevTotal.toFixed(2),
        'Updated subtotal: $' + nextTotal.toFixed(2)
    ];
    if (extra && extra.commission != null && extra.commission !== '') {
        lines.push('Commission: ' + extra.commission + '%');
    }
    return lines.join('\n');
}

function mergeOrderEditNotes(existing, editBlock) {
    const raw = String(existing || '').trim();
    const stripped = raw.replace(/\n*ORDER UPDATED[\s\S]*$/i, '').trim();
    if (!stripped) return editBlock;
    return stripped + '\n\n' + editBlock;
}

function renderApproveOrderChangeSummary() {
    const el = document.getElementById('approve-ord-change-summary');
    if (!el || !approveOrderOrder) return;
    const changes = diffOrderItems(approveOrderOrder.items || [], approveOrderItems || []);
    const prevTotal = sumOrderItems(approveOrderOrder.items || []);
    const nextTotal = sumOrderItems(approveOrderItems || []);
    if (!changes.length && prevTotal === nextTotal) {
        el.textContent = 'No item changes yet.';
        return;
    }
    el.innerHTML =
        '<p class="font-semibold text-[#1E4D2B] mb-1">Pending changes</p>' +
        (changes.length
            ? ('<ul class="list-disc ml-5">' + changes.map(function (line) {
                return '<li>' + escapeHtml(line) + '</li>';
            }).join('') + '</ul>')
            : '<p>Items unchanged</p>') +
        '<p class="mt-2">Previous subtotal: $' + prevTotal.toFixed(2) + '</p>' +
        '<p>Updated subtotal: $' + nextTotal.toFixed(2) + '</p>';
}

async function sendUpdatedOrderProforma(order, itemsPayload, notesToSave, commissionPercent) {
    if (typeof notifyMarshallProforma !== 'function') return;
    const shortId = (typeof displayInvoiceNumber === 'function')
        ? displayInvoiceNumber(order)
        : (order.invoiceNumber || order.id);
    const prevTotal = (typeof sumOrderItems === 'function') ? sumOrderItems(order.items || []) : 0;
    const nextTotal = (typeof sumOrderItems === 'function') ? sumOrderItems(itemsPayload || []) : 0;
    const changeLines = (typeof diffOrderItems === 'function')
        ? diffOrderItems(order.items || [], itemsPayload || [])
        : [];
    await notifyMarshallProforma({
        orderId: shortId,
        customerName: order.customer || order.customer_name || '',
        companyName: order.customerCompany || order.customer_company || '',
        customerEmail: order.customerEmail || order.customer_email || '',
        salesmanName: order.salesman || order.salesman_name || '',
        items: itemsPayload,
        notes: notesToSave,
        shippingCost: order.shippingCost ?? order.shipping_cost ?? 0,
        credit: order.credit ?? 0,
        submittedAt: order.submittedAt || order.submitted_at || new Date().toISOString(),
        source: order.source || 'internal',
        commissionRate: commissionPercent != null
            ? commissionPercent
            : (order.salesmanCommissionPercent || order.salesman_commission_percent || null),
        isRevision: true,
        editedAt: new Date().toLocaleString(),
        previousSubtotal: prevTotal,
        updatedSubtotal: nextTotal,
        changeLog: changeLines.join('\n'),
        subjectPrefix: 'UPDATED '
    });
}

function buildApproveItemsPayload() {
    return (approveOrderItems || []).map(function (item) {
        return {
            product: item.product,
            quantity: item.quantity || 1,
            caseSize: item.caseSize || '',
            unitPrice: item.unitPrice,
            displayPrice: item.displayPrice || '',
            isMarketPrice: !!item.isMarketPrice
        };
    });
}

async function saveEditedOrderItems() {
    if (!approveOrderOrder) return;
    if (!approveOrderItems.length) {
        alert('Order must have at least one line item.');
        return;
    }

    const orderId = approveOrderOrder.id;
    const itemsPayload = buildApproveItemsPayload();

    let commissionPercent = null;
    try {
        commissionPercent = readApproveOrderCommissionPercent();
    } catch (e) {
        alert(e.message || 'Invalid commission.');
        return;
    }

    const editBlock = buildOrderEditNote(approveOrderOrder.items || [], itemsPayload, { commission: commissionPercent });
    const notesToSave = mergeOrderEditNotes(approveOrderOrder.notes || '', editBlock);
    const payload = {
        items: itemsPayload,
        notes: notesToSave
    };
    if (commissionPercent != null) {
        payload.salesman_commission_percent = commissionPercent;
        payload.portal_commission_rate = commissionPercent;
    }

    try {
        const { data, error } = await supabaseClient
            .from('orders')
            .update(payload)
            .eq('id', orderId)
            .select('id');
        if (error) throw error;
        if (!data || data.length === 0) {
            throw new Error('Update matched 0 rows for order ' + orderId);
        }
        await sendUpdatedOrderProforma(approveOrderOrder, itemsPayload, notesToSave, commissionPercent);
        hideApproveOrderModal();
        await loadOrders();
        if (typeof logAdminActivity === 'function') {
            logAdminActivity({
                action: 'edit',
                entityType: 'order',
                entityLabel: (approveOrderOrder && (approveOrderOrder.invoiceNumber || approveOrderOrder.invoice_number)) || '',
                summary: 'Order items saved'
            });
        }
        alert('Order updated.\nUpdated pro forma emailed.');
    } catch (err) {
        console.error(err);
        alert('Could not update order.\n' + (err.message || ''));
    }
}

async function confirmApproveOrder() {
    if (!approveOrderOrder) return;

    if (!approveOrderItems.length) {
        alert('Order must have at least one line item.');
        return;
    }

    const orderId = approveOrderOrder.id;
    const itemsPayload = buildApproveItemsPayload();

    let commissionPercent = null;
    try {
        commissionPercent = readApproveOrderCommissionPercent();
    } catch (e) {
        alert(e.message || 'Invalid commission.');
        return;
    }

    const editBlock = buildOrderEditNote(approveOrderOrder.items || [], itemsPayload, { commission: commissionPercent });
    const notesToSave = mergeOrderEditNotes(approveOrderOrder.notes || '', editBlock);

    const approveUpdate = {
        status: 'received',
        items: itemsPayload,
        notes: notesToSave
    };
    if (commissionPercent != null) {
        approveUpdate.salesman_commission_percent = commissionPercent;
        approveUpdate.portal_commission_rate = commissionPercent;
    }

    try {
        console.log('confirmApproveOrder →', { orderId: orderId, type: typeof orderId });

        const { data, error } = await supabaseClient
            .from('orders')
            .update(approveUpdate)
            .eq('id', orderId)
            .select('id, status');

        if (error) throw error;

        if (!data || data.length === 0) {
            throw new Error(
                'Update matched 0 rows for order ' + orderId +
                '. Check that the order still exists and RLS allows admin updates on orders.'
            );
        }
        if (approvePendingBackOrders.length > 0) {
            const { error: boError } = await supabaseClient
                .from('back_orders')
                .insert(approvePendingBackOrders);
            if (boError) {
                console.error('back_orders insert error:', boError);
                alert('Order approved, but one or more back-order rows could not be saved.\n' + (boError.message || ''));
            }
            approvePendingBackOrders = [];
            if (typeof loadBackOrders === 'function') await loadBackOrders();
        }
        await sendUpdatedOrderProforma(approveOrderOrder, itemsPayload, notesToSave, commissionPercent);
        hideApproveOrderModal();
        await loadOrders();
        alert('Order approved.\nUpdated pro forma emailed.');
    } catch (err) {
        console.error(err);
        alert('Could not approve order.\n' + (err.message || ''));
    }
}
// ================== END APPROVE ORDER MODAL ==================

// ================== SHIP INVOICE MODAL ==================
const WEST_OF_MISSISSIPPI_STATES = [
    'WA', 'OR', 'CA', 'NV', 'ID', 'MT', 'WY', 'UT', 'AZ', 'NM', 'CO',
    'ND', 'SD', 'NE', 'KS', 'OK', 'TX', 'MN', 'IA', 'MO', 'AR', 'LA',
    'AK', 'HI',
    'WASHINGTON', 'OREGON', 'CALIFORNIA', 'NEVADA', 'IDAHO', 'MONTANA',
    'WYOMING', 'UTAH', 'ARIZONA', 'NEW MEXICO', 'COLORADO',
    'NORTH DAKOTA', 'SOUTH DAKOTA', 'NEBRASKA', 'KANSAS', 'OKLAHOMA', 'TEXAS',
    'MINNESOTA', 'IOWA', 'MISSOURI', 'ARKANSAS', 'LOUISIANA',
    'ALASKA', 'HAWAII'
];

const MID_ATLANTIC_650_STATES = [
    'MD', 'NY', 'NJ', 'OH', 'WV',
    'MARYLAND', 'NEW YORK', 'NEW JERSEY', 'OHIO', 'WEST VIRGINIA'
];

function isMidAtlantic650Location(text) {
    const t = (text || '').toUpperCase();
    return MID_ATLANTIC_650_STATES.some(state => {
        if (state.length === 2) {
            return (
                t.includes(', ' + state) ||
                t.includes(' ' + state + ' ') ||
                t.endsWith(' ' + state) ||
                t.includes(' ' + state + ',')
            );
        }
        return t.includes(state);
    });
}

function evaluateFreeShipping(subtotal, locationText) {
    const amount = Number(subtotal) || 0;
    const loc = locationText || '';
    let halfAt = 250;
    let freeAt = 1500;
    let zoneLabel = 'east of the Mississippi';

    if (isPennsylvaniaLocation(loc)) {
        halfAt = null;
        freeAt = 200;
        zoneLabel = 'Pennsylvania';
    } else if (isFloridaLocation(loc)) {
        halfAt = 250;
        freeAt = 400;
        zoneLabel = 'Florida';
    } else if (isWestOfMississippiLocation(loc)) {
        halfAt = 250;
        freeAt = 2000;
        zoneLabel = 'west of the Mississippi';
    }

    const free = amount >= freeAt;
    const half = !free && halfAt != null && amount >= halfAt;
    if (free) {
        return {
            free: true,
            half: false,
            threshold: freeAt,
            remaining: 0,
            reason: 'Free shipping: $' + freeAt.toLocaleString() + '+ in ' + zoneLabel
        };
    }
    if (half) {
        return {
            free: false,
            half: true,
            threshold: freeAt,
            remaining: Math.max(0, freeAt - amount),
            reason: 'Half freight unlocked in ' + zoneLabel
        };
    }
    const next = halfAt != null ? halfAt : freeAt;
    return {
        free: false,
        half: false,
        threshold: next,
        remaining: Math.max(0, next - amount),
        reason: halfAt != null
            ? ('Half freight at $' + halfAt.toFixed(2) + ' in ' + zoneLabel)
            : ('Free shipping at $' + freeAt.toFixed(2) + ' in ' + zoneLabel)
    };
}

function getShipInvoiceLocationText(order) {
    if (!order) return '';
    const parts = [
        order.customer,
        order.customerCompany,
        order.territory,
        order.shippingAddress,
        order.shipping_address,
        order.notes
    ];

    // Prefer live customer record for shipping/billing/territory
    try {
        const customerName = (order.customer || order.customer_name || '').trim().toLowerCase();
        const customerEmail = (order.customerEmail || order.customer_email || '').trim().toLowerCase();
        const customer = (allCustomers || []).find(c => {
            const cEmail = (c.email || '').trim().toLowerCase();
            const cName = (c.name || '').trim().toLowerCase();
            if (customerEmail && cEmail && customerEmail === cEmail) return true;
            if (customerName && cName && cName === customerName) return true;
            return false;
        }) || null;
        if (customer) {
            parts.push(customer.shippingAddress, customer.billingAddress, customer.territory, customer.shipping_address, customer.billing_address);
        }
    } catch (e) { /* ignore */ }

    return parts.filter(Boolean).join(' ').toUpperCase();
}

function isPennsylvaniaLocation(text) {
    const t = (text || '').toUpperCase();
    return (
        t.includes('PENNSYLVANIA') ||
        t.includes(', PA') ||
        t.includes(' PA ') ||
        t.endsWith(' PA') ||
        t.includes(' PA,')
    );
}

function isFloridaLocation(text) {
    const t = (text || '').toUpperCase();
    return (
        t.includes('FLORIDA') ||
        t.includes(', FL') ||
        t.includes(' FL ') ||
        t.endsWith(' FL') ||
        t.includes(' FL,')
    );
}

function isWestOfMississippiLocation(text) {
    const t = (text || '').toUpperCase();
    return WEST_OF_MISSISSIPPI_STATES.some(state => {
        if (state.length === 2) {
            return (
                t.includes(', ' + state) ||
                t.includes(' ' + state + ' ') ||
                t.endsWith(' ' + state)
            );
        }
        return t.includes(state);
    });
}

function getShipInvoiceSubtotal() {
    let subtotal = 0;
    (shipInvoiceItems || []).forEach(item => {
        const unit = parseFloat(item.unitPrice);
        if (isNaN(unit) || unit < 0) return; // skip only if no real price yet
        subtotal += unit * (parseInt(item.quantity, 10) || 0);
    });
    return subtotal;
}

function applyAutoShippingRules() {
    const shippingEl = document.getElementById('ship-inv-shipping');
    if (!shippingEl || !shipInvoiceOrder) return;

    // Back-order fulfillments: always free shipping (no additional charge)
    if (typeof shipInvoiceMode !== 'undefined' && shipInvoiceMode === 'backorder') {
        shippingEl.type = 'text';
        shippingEl.value = 'Free Shipping';
        shippingEl.readOnly = true;
        shippingEl.classList.add('bg-gray-100', 'text-green-800', 'font-semibold');
        const noteEl = document.getElementById('ship-inv-shipping-note');
        if (noteEl) noteEl.textContent = 'Back order follow-up: free shipping (no additional charge)';
        return;
    }

    const subtotal = getShipInvoiceSubtotal();
    const locationText = getShipInvoiceLocationText(shipInvoiceOrder);
    const result = evaluateFreeShipping(subtotal, locationText);

    const noteEl = document.getElementById('ship-inv-shipping-note');

    if (result.free) {
        shippingEl.value = '0.00';
        shippingEl.readOnly = true;
        shippingEl.classList.add('bg-gray-100', 'text-green-800', 'font-semibold');
        // Visual label in the field (value stays 0.00 for save logic)
        shippingEl.type = 'text';
        shippingEl.value = 'Free Shipping';
        if (noteEl) noteEl.textContent = result.reason;
    } else if (result.half) {
        shippingEl.readOnly = false;
        shippingEl.type = 'number';
        shippingEl.classList.remove('bg-gray-100', 'text-green-800', 'font-semibold');
        if (noteEl) {
            noteEl.textContent = result.reason + ' — enter half of quoted freight ($)';
        }
        const currentHalf = parseFloat(shippingEl.value);
        shippingEl.value = (!isNaN(currentHalf) && currentHalf >= 0)
            ? currentHalf.toFixed(2)
            : '0.00';
    } else {
        shippingEl.readOnly = false;
        shippingEl.type = 'number';
        shippingEl.classList.remove('bg-gray-100', 'text-green-800', 'font-semibold');
        if (noteEl) {
            noteEl.textContent = result.reason
                ? (result.reason + (result.threshold ? ' — enter shipping amount ($)' : ''))
                : 'Enter shipping amount ($)';
        }
        const current = parseFloat(shippingEl.value);
        shippingEl.value = (!isNaN(current) && current >= 0)
            ? current.toFixed(2)
            : '0.00';
    }
}
var shipInvoiceOrder = null;
var shipInvoiceItems = [];
var shipInvoiceMode = 'order'; // 'order' | 'backorder'
var shipBackOrderPendingIds = [];

function openShipInvoiceModal(orderId) {
    const order = allOrders.find(o => String(o.id) === String(orderId));
    if (!order) {
        alert('Order not found.');
        return;
    }

    shipInvoiceOrder = order;
    shipInvoiceItems = (order.items || []).map(item => ({
        product: item.product || item.name || '',
        quantity: item.quantity || 1,
        caseSize: item.caseSize || '',
        unitPrice: item.unitPrice != null ? item.unitPrice : null,
        displayPrice: item.displayPrice || '',
        isMarketPrice: !!item.isMarketPrice
    }));

    document.getElementById('ship-inv-customer').textContent = order.customer || '—';
    document.getElementById('ship-inv-salesman').textContent = order.salesman || '—';
    document.getElementById('ship-inv-id').textContent = String(displayInvoiceNumber(order));
    document.getElementById('ship-invoice-subtitle').textContent =
        'Review line items and shipping, then confirm ship';

const shippingEl = document.getElementById('ship-inv-shipping');
    if (shippingEl) {
        const start = order.shippingCost != null ? Number(order.shippingCost) : 0;
        shippingEl.value = (isNaN(start) ? 0 : start).toFixed(2);
    }

    const trackingEl = document.getElementById('ship-inv-tracking');
    if (trackingEl) {
        trackingEl.value = order.trackingNumber || order.tracking_number || '';
    }

    const searchEl = document.getElementById('ship-inv-product-search');
    if (searchEl) searchEl.value = '';
    const resultsEl = document.getElementById('ship-inv-product-results');
    if (resultsEl) {
        resultsEl.innerHTML = '';
        resultsEl.classList.add('hidden');
    }

    renderShipInvoiceItems();

    // Ensure customer addresses are available for free-shipping region detection
    const finishOpen = () => {
        recalcShipInvoiceTotals();
        document.getElementById('ship-invoice-modal')?.classList.remove('hidden');
    };
    if ((!allCustomers || allCustomers.length === 0) && typeof loadCustomers === 'function') {
        loadCustomers().then(finishOpen).catch(finishOpen);
    } else {
        finishOpen();
    }
}

function hideShipInvoiceModal() {
    document.getElementById('ship-invoice-modal')?.classList.add('hidden');
    shipInvoiceOrder = null;
    shipInvoiceItems = [];
    shipPendingBackOrders = [];
    shipInvoiceMode = 'order';
    shipBackOrderPendingIds = [];
}

function renderShipInvoiceItems() {
    const container = document.getElementById('ship-inv-items');
    if (!container) return;

    if (!shipInvoiceItems.length) {
        container.innerHTML = `<p class="text-sm text-[#6B4423]">No line items.</p>`;
        return;
    }

    container.innerHTML = shipInvoiceItems.map((item, index) => {
                const hasRealPrice = item.unitPrice != null && !isNaN(Number(item.unitPrice)) && Number(item.unitPrice) > 0;
        const priceLabel = hasRealPrice
            ? ('$' + Number(item.unitPrice).toFixed(2))
            : (item.isMarketPrice
                ? 'Market'
                : (item.displayPrice || '—'));

        const qty = parseInt(item.quantity, 10) || 0;
        const unit = hasRealPrice ? Number(item.unitPrice) : 0;
        const lineTotal = qty * unit;
        const lineTotalLabel = hasRealPrice
            ? ('$' + lineTotal.toFixed(2))
            : '—';

        return `
            <div class="flex flex-wrap items-center gap-2 border border-[#d4b78f] rounded-xl px-3 py-2 bg-[#f8f4eb]">
                <div class="flex-1 min-w-[160px]">
                    <p class="font-semibold text-sm brand-green">${escapeHtml(orderLineDisplayName(item))}</p>
                    <p class="text-xs text-[#6B4423]">${priceLabel}${item.caseSize ? ' · ' + item.caseSize : ''}</p>
                </div>
                <input type="number" min="1" step="1" value="${item.quantity}"
                       onchange="updateShipInvoiceQty(${index}, this.value)"
                       class="w-20 border-2 border-[#6B4423] rounded-lg px-2 py-1 text-sm">
                <div class="text-right min-w-[70px]">
                    <p class="text-xs text-[#6B4423]">Line Total</p>
                    <p class="font-semibold text-sm brand-green">${lineTotalLabel}</p>
                </div>
                <button type="button" onclick="markShipItemOutOfStock(${index})"
                        class="px-3 py-1 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                    Out of Stock
                </button>
                <button type="button" onclick="removeShipInvoiceItem(${index})"
                        class="px-3 py-1 text-xs bg-red-600 text-white rounded-lg">
                    Remove
                </button>
            </div>
        `;
    }).join('');
}

function updateShipInvoiceQty(index, value) {
    const qty = parseInt(value, 10);
    if (!shipInvoiceItems[index]) return;
    if (isNaN(qty) || qty < 1) {
        shipInvoiceItems[index].quantity = 1;
    } else {
        shipInvoiceItems[index].quantity = qty;
    }
    renderShipInvoiceItems();
    recalcShipInvoiceTotals();
}

function removeShipInvoiceItem(index) {
    shipInvoiceItems.splice(index, 1);
    renderShipInvoiceItems();
    recalcShipInvoiceTotals();
}

function markShipItemOutOfStock(index) {
    if (!shipInvoiceItems[index] || !shipInvoiceOrder) return;

    const item = shipInvoiceItems[index];
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');

    shipPendingBackOrders.push({
        original_order_id: shipInvoiceOrder.id,
        invoice_number: String(shipInvoiceOrder.id),
        customer_name: shipInvoiceOrder.customer || shipInvoiceOrder.customer_name || null,
        customer_email: shipInvoiceOrder.customerEmail || shipInvoiceOrder.customer_email || null,
        customer_company: shipInvoiceOrder.customerCompany || shipInvoiceOrder.customer_company || null,
        product_name: item.product,
        case_size: item.caseSize || null,
        quantity: item.quantity || 1,
        unit_price: item.unitPrice != null ? item.unitPrice : null,
        display_price: item.displayPrice || null,
        is_market_price: !!item.isMarketPrice,
        status: 'pending',
        created_by: user.fullName || user.email || 'Admin'
    });

    shipInvoiceItems.splice(index, 1);
    renderShipInvoiceItems();
    recalcShipInvoiceTotals();
}

function renderShipInvoiceProductSearch() {
    const search = (document.getElementById('ship-inv-product-search')?.value || '').toLowerCase().trim();
    const resultsEl = document.getElementById('ship-inv-product-results');
    if (!resultsEl || typeof PRODUCT_CATALOG === 'undefined') return;

    if (search.length < 1) {
        resultsEl.innerHTML = '';
        resultsEl.classList.add('hidden');
        return;
    }

    const matches = PRODUCT_CATALOG.filter(p =>
        p.name.toLowerCase().includes(search) ||
        (p.category || '').toLowerCase().includes(search)
    ).slice(0, 20);

    if (!matches.length) {
        resultsEl.innerHTML = `<p class="px-4 py-3 text-sm text-[#6B4423]">No products found.</p>`;
        resultsEl.classList.remove('hidden');
        return;
    }

    resultsEl.innerHTML = matches.map(p => {
        const safeName = p.name.replace(/'/g, "\\'");
        return `
            <button type="button"
                    onclick="addShipInvoiceProduct('${safeName}')"
                    class="w-full text-left px-4 py-2 text-sm hover:bg-[#f8f4eb] border-b border-[#f0e6d9]">
                <span class="font-medium text-[#1E4D2B]">${escapeHtml(p.name)}</span>
                <span class="block text-xs text-[#6B4423]">${p.caseSize || ''} · ${p.isMarketPrice ? 'Market' : ('$' + Number(p.unitPrice).toFixed(2))}</span>
            </button>
        `;
    }).join('');
    resultsEl.classList.remove('hidden');
}

function addShipInvoiceProduct(productName) {
    const catalog = (typeof PRODUCT_CATALOG !== 'undefined')
        ? PRODUCT_CATALOG.find(p => p.name === productName)
        : null;

    const existing = shipInvoiceItems.find(i => i.product === productName);
    if (existing) {
        existing.quantity = (existing.quantity || 1) + 1;
    } else {
        shipInvoiceItems.push({
            product: productName,
            quantity: 1,
            caseSize: catalog?.caseSize || '',
            unitPrice: catalog && !catalog.isMarketPrice ? catalog.unitPrice : null,
            displayPrice: catalog
                ? (catalog.isMarketPrice ? 'Market Price' : ('$' + Number(catalog.unitPrice).toFixed(2)))
                : '',
            isMarketPrice: !!(catalog && catalog.isMarketPrice)
        });
    }

    const searchEl = document.getElementById('ship-inv-product-search');
    if (searchEl) searchEl.value = '';
    const resultsEl = document.getElementById('ship-inv-product-results');
    if (resultsEl) {
        resultsEl.innerHTML = '';
        resultsEl.classList.add('hidden');
    }

    renderShipInvoiceItems();
    recalcShipInvoiceTotals();
}

function recalcShipInvoiceTotals() {
    const subtotal = getShipInvoiceSubtotal();

    applyAutoShippingRules();

const shipping = parseFloat(document.getElementById('ship-inv-shipping')?.value) || 0;
    const credit = parseFloat(document.getElementById('ship-inv-credit')?.value) || 0;
    const total = Math.max(0, subtotal + shipping - credit);

    const subEl = document.getElementById('ship-inv-subtotal');
    const totEl = document.getElementById('ship-inv-total');
    if (subEl) subEl.textContent = '$' + subtotal.toFixed(2);
    if (totEl) totEl.textContent = '$' + total.toFixed(2);
}

async function sendOrderStatusEmail({ type, order, denialReason }) {
    if (!order) return;
    const toEmail = (order.customerEmail || order.customer_email || '').trim();
    if (!toEmail) {
        console.warn('No customer email for order status email', order.id);
        return;
    }

    // Only email Active / Approved customers (matches card verbiage)
    const customerEmail = toEmail.toLowerCase();
    const customerName = (order.customer || order.customer_name || '').trim().toLowerCase();
    const customer = (allCustomers || []).find(c => {
        const cEmail = (c.email || '').trim().toLowerCase();
        const cName = (c.name || '').trim().toLowerCase();
        if (customerEmail && cEmail && customerEmail === cEmail) return true;
        if (customerName && cName && customerName === cName) return true;
        return false;
    }) || null;

    if (customer) {
        const status = String(customer.status || '').trim();
        const enabled = status === 'Active' || status === 'Approved';
        if (!enabled) {
            console.warn(
                'Order status email skipped — customer is not Active/Approved:',
                { orderId: order.id, toEmail, status: customer.status }
            );
            return;
        }
    }

    // HARD SAFETY — emails disabled while developing
    if (!EMAILS_ENABLED) {
        console.log('[DEV] Email skipped (EMAILS_ENABLED=false):', {
            type,
            toEmail,
            orderId: order.id
        });
        return;
    }

    try {
        const res = await fetch(
            SUPABASE_URL + '/functions/v1/send-order-status-email',
            {
                method: 'POST',
                headers: await getEdgeFunctionHeaders(),
                body: JSON.stringify({
                    type: type,
                    toEmail: toEmail,
                    customerName: order.customer || order.customer_name || '',
                    companyName: order.customerCompany || order.customer_company || '',
                    orderId: order.id,
                    denialReason: denialReason || ''
                })
            }
        );
        if (!res.ok) {
            const text = await res.text();
            console.error('Order status email failed:', res.status, text);
        }
    } catch (err) {
        console.error('Order status email error:', err);
    }
}

async function confirmShipInvoice() {
    if (!shipInvoiceOrder) return;

    // Back-order fulfill path (reuses this modal)
    if (shipInvoiceMode === 'backorder') {
        await confirmBackOrderFulfillFromShipModal();
        return;
    }

    if (!shipInvoiceItems.length) {
        alert('Invoice must have at least one line item.');
        return;
    }

    const shippingRaw = (document.getElementById('ship-inv-shipping')?.value || '').toString().trim();
    const shipping = (/free/i.test(shippingRaw) || shippingRaw === '')
        ? 0
        : parseFloat(shippingRaw);
    if (isNaN(shipping) || shipping < 0) {
        alert('Enter a valid shipping amount (0 or higher).');
        return;
    }

    const creditRaw = document.getElementById('ship-inv-credit')?.value;
    const credit = creditRaw === '' || creditRaw == null
        ? 0
        : parseFloat(creditRaw);
    if (isNaN(credit) || credit < 0) {
        alert('Enter a valid credit amount (0 or higher).');
        return;
    }

    const orderId = shipInvoiceOrder.id;
    const previousStatus = (shipInvoiceOrder.status || '').toLowerCase();

    const itemsPayload = shipInvoiceItems.map(item => ({
        product: item.product,
        quantity: item.quantity || 1,
        caseSize: item.caseSize || '',
        unitPrice: item.unitPrice,
        displayPrice: item.displayPrice || '',
        isMarketPrice: !!item.isMarketPrice
    }));

    try {
        const { error } = await supabaseClient
            .from('orders')
            .update({
                status: 'shipped',
                shipping_cost: shipping,
                credit: credit,
                items: itemsPayload,
                invoice_ready_at: new Date().toISOString(),
                tracking_number: (document.getElementById('ship-inv-tracking')?.value || '').trim() || null,
                carrier: 'UPS'
            })
            .eq('id', orderId);

        if (error) throw error;

        if (previousStatus !== 'shipped' && typeof decreaseInventoryForOrder === 'function') {
            decreaseInventoryForOrder({
                ...shipInvoiceOrder,
                items: itemsPayload,
                shippingCost: shipping
            });
        }

        // Capture order before modal clears it
        const shippedOrderSnapshot = {
            id: shipInvoiceOrder.id,
            customer: shipInvoiceOrder.customer || shipInvoiceOrder.customer_name || '',
            customerEmail: shipInvoiceOrder.customerEmail || shipInvoiceOrder.customer_email || '',
            customerCompany: shipInvoiceOrder.customerCompany || shipInvoiceOrder.customer_company || ''
        };
        // Insert any items marked Out of Stock during this ship
        if (shipPendingBackOrders.length > 0) {
            const { error: boError } = await supabaseClient
                .from('back_orders')
                .insert(shipPendingBackOrders);
            if (boError) {
                console.error('back_orders insert error:', boError);
                alert('Order shipped, but one or more back-order rows could not be saved.\n' + (boError.message || ''));
            }
            shipPendingBackOrders = [];
            if (typeof loadBackOrders === 'function') await loadBackOrders();
        }
        hideShipInvoiceModal();
        await loadOrders();

        // Order status emails removed — QuickBooks handles customer notifications

        if (typeof logAdminActivity === 'function') {
            logAdminActivity({
                action: 'ship',
                entityType: 'order',
                entityLabel: (shipInvoiceOrder && (shipInvoiceOrder.invoiceNumber || shipInvoiceOrder.invoice_number)) || '',
                summary: 'Order shipped'
            });
        }
        alert('Order shipped. Invoice saved.');
    } catch (err) {
        console.error(err);
        alert('Could not ship order.\n' + (err.message || ''));
    }
}

function estimateMonthlyRange(amount) {
    const raw = String(amount || '')
        .replace(/\s/g, '')
        .replace(/[–—]/g, '-');
    if (!raw) return null;
    if (/under\$?500/i.test(raw)) return { low: 0, high: 500, open: false };
    if (raw.indexOf('$500') !== -1 && raw.indexOf('$1,000') !== -1) return { low: 500, high: 1000, open: false };
    if (raw.indexOf('$1,000') !== -1 && raw.indexOf('$2,500') !== -1) return { low: 1000, high: 2500, open: false };
    if (raw.indexOf('$2,500') !== -1 && raw.indexOf('$5,000') !== -1) return { low: 2500, high: 5000, open: false };
    if (raw.indexOf('$5,000+') !== -1 || raw.indexOf('$5000+') !== -1) return { low: 5000, high: 5000, open: true };
    const n = parseFloat(String(amount).replace(/[^0-9.]/g, ''));
    if (!isFinite(n) || n <= 0) return null;
    return { low: n, high: n, open: false };
}

function updateEstimatedSpendCard() {
    const monthEl = document.getElementById('dash-estimated-spend');
    if (!monthEl) return;
    const byEmail = {};
    (typeof inquiries !== 'undefined' && inquiries ? inquiries : []).forEach(function (row) {
        const email = String(row.email || '').toLowerCase().trim();
        const amount = String(row.monthly_amount || '').trim();
        if (!email || !amount) return;
        byEmail[email] = amount;
    });
    let low = 0;
    let high = 0;
    let openHigh = false;
    (allCustomers || []).forEach(function (c) {
        const email = String(c.email || '').toLowerCase().trim();
        const company = String(c.company || '').toLowerCase();
        if (email === 'jackerman@donegalnatural.com') return;
        if (company.indexOf('admin test store') !== -1) return;
        const range = estimateMonthlyRange(c.monthlyAmount || byEmail[email] || '');
        if (!range) return;
        low += range.low;
        high += range.high;
        if (range.open) openHigh = true;
    });
    monthEl.textContent = '$' + Math.round(low).toLocaleString() +
        ' – $' + Math.round(high).toLocaleString() +
        (openHigh ? '+' : '');
}


function updateDashboardOrders() {
    if (!allOrders) return;

    let pending = 0;
    let received = 0;
    let processing = 0;
    let agingCount = 0;
    let pendingValue = 0;

    const now = new Date();
    const tenDaysAgo = new Date(now);
    tenDaysAgo.setDate(now.getDate() - 10);

    allOrders.forEach(order => {
        if (typeof isTestStoreOrder === 'function' && isTestStoreOrder(order)) return;
        const status = (order.status || '').toString().trim().toLowerCase();
        const orderDate = new Date(
            order.submittedAt || order.submitted_at || order.date || now
        );

        let orderTotal = 0;
        (order.items || []).forEach(item => {
            const qty = parseInt(item.quantity, 10) || 0;
            const unit = typeof getOrderItemUnitPrice === 'function'
                ? getOrderItemUnitPrice(item)
                : (parseFloat(item.unitPrice) || 0);
            orderTotal += qty * unit;
        });

        if (status === 'pending' || status === 'submitted' || status === '') {
            pending++;
            pendingValue += orderTotal;
        } else if (status === 'received') {
            received++;
            if (!isNaN(orderDate.getTime()) && orderDate < tenDaysAgo) agingCount++;
        } else if (status === 'processing') {
            processing++;
            if (!isNaN(orderDate.getTime()) && orderDate < tenDaysAgo) agingCount++;
        }
    });

    const pendingEl = document.getElementById('dash-pending-count');
    const receivedEl = document.getElementById('dash-received-count');
    const processingEl = document.getElementById('dash-processing-count');
    const pendingValueEl = document.getElementById('dash-pending-value');

    if (pendingEl) pendingEl.textContent = pending;
    if (receivedEl) receivedEl.textContent = received;
    if (processingEl) processingEl.textContent = processing;
    if (pendingValueEl) {
        pendingValueEl.textContent = '$' + Math.round(pendingValue).toLocaleString();
    }

    const alertEl = document.getElementById('dash-orders-alert');
    const agingText = document.getElementById('dash-aging-text');

    if (alertEl) {
        alertEl.classList.add('hidden');
    }
}

function updateDashboardPendingCount() {
    if (!allOrders) return;

    const pendingCount = allOrders.filter(order => {
        if (typeof isTestStoreOrder === 'function' && isTestStoreOrder(order)) return false;
        const status = (order.status || '').toString().trim().toLowerCase();
        return status === 'pending' || status === 'submitted' || status === '';
    }).length;

    const dashEl = document.getElementById('dash-pending-orders');
    if (dashEl) {
        dashEl.textContent = pendingCount;
    }
}

function updateDashboardPendingValue() {
    const el = document.getElementById('dash-pending-value');
    if (!el) return;

    let total = 0;

    if (typeof allOrders !== 'undefined' && Array.isArray(allOrders)) {
        allOrders.forEach(order => {
            if (typeof isTestStoreOrder === 'function' && isTestStoreOrder(order)) return;
            const status = (order.status || '').toLowerCase();
            // Count only pending / submitted orders
            if (status !== 'pending' && status !== 'submitted' && status !== '') return;

            (order.items || []).forEach(item => {
                const name = item.product || item.productName || item.name || '';
                const qty = parseInt(item.quantity, 10) || 0;
                if (!name || qty <= 0) return;

                // Prefer catalog unit price
                let unitPrice = 0;
                if (typeof PRODUCT_CATALOG !== 'undefined') {
                    const match = PRODUCT_CATALOG.find(p =>
                        p.name === name ||
                        p.name.toLowerCase().includes(name.toLowerCase()) ||
                        name.toLowerCase().includes(p.name.toLowerCase())
                    );
                    if (match && match.unitPrice) unitPrice = match.unitPrice;
                }

                // Fallback if no catalog price found
                if (!unitPrice) unitPrice = getOrderItemUnitPrice(item);

                total += qty * unitPrice;
            });
        });
    }

    el.textContent = '$' + total.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

function filterOrders(status) {
    currentFilter = status;
    if (typeof renderOrdersTable === 'function') {
        renderOrdersTable();
    }
}

function refreshOrders() {
    currentFilter = 'all';
    loadOrders();
}

function showOrderDetails(orderId) {
    if (typeof openOrderInvoiceModal === 'function') {
        openOrderInvoiceModal(orderId);
        return;
    }
    alert('Order invoice view is not available yet for #' + orderId);
}

async function updateOrderStatus(orderId, newStatus) {
    if (!orderId || !newStatus) return;

    const order = allOrders.find(o => String(o.id) === String(orderId));
    if (!order) {
        alert('Order not found.');
        return;
    }

    const previousStatus = (order.status || '').toLowerCase();
    const newStatusLower = String(newStatus).toLowerCase();

    let shippingCost = order.shippingCost != null ? order.shippingCost : null;

    try {
        const updatePayload = {
            status: newStatusLower
        };

        if (newStatusLower === 'shipped' && shippingCost != null) {
            updatePayload.shipping_cost = shippingCost;
        }

        const { error } = await supabaseClient
            .from('orders')
            .update(updatePayload)
            .eq('id', orderId);

        if (error) throw error;

        // Inventory: decrease stock when order is marked shipped
        if (newStatusLower === 'shipped' && previousStatus !== 'shipped') {
            order.shippingCost = shippingCost;
                        if (typeof decreaseInventoryForOrder === 'function') {
                await decreaseInventoryForOrder(order);
            }
        }

        await loadOrders();
    } catch (err) {
        console.error(err);
        alert('Could not update order status.\n' + (err.message || ''));
    }
}

function getTotalOrdersCount() {
    return parseInt(localStorage.getItem('totalOrdersAccepted') || '0');
}

function incrementTotalOrdersCount() {
    let count = getTotalOrdersCount();
    count++;
    localStorage.setItem('totalOrdersAccepted', count);
    return count;
}

function addTestOrder() {
    const testOrder = {
        id: Date.now(),
        salesman: "Harper Ackerman",
        customer: "Test Pet Shop",
        items: [
            { product: "6” Thin Green Line Bully Sticks (Bulk)", quantity: 10 },
            { product: "5-6” Natural Rollio (Bulk)", quantity: 5 }
        ],
        status: "Submitted",
        submittedAt: new Date().toISOString(),
        notes: "Test order for development"
    };

    let orders = JSON.parse(localStorage.getItem("submittedOrders") || "[]");
    orders.unshift(testOrder);
    localStorage.setItem("submittedOrders", JSON.stringify(orders));

    if (typeof loadOrders === 'function') {
        loadOrders();
    } else {
        allOrders = orders;
        if (typeof renderOrdersTable === 'function') renderOrdersTable();
        if (typeof updateOrderStatusCards === 'function') updateOrderStatusCards();
    }

    alert("Test order added successfully!");
}

let newOrderSelectedProducts = []; // { name, quantity }

async function showAddOrderModal() {
    const modal = document.getElementById('add-order-modal');
    if (!modal) {
        alert('Add Order modal not found.');
        return;
    }

    // Customers
        if (typeof allCustomers === 'undefined' || !Array.isArray(allCustomers) || allCustomers.length === 0) {
        await loadCustomers();
    }
    const customerSelect = document.getElementById('new-order-customer');
    if (customerSelect) {
        customerSelect.innerHTML = '<option value="">Select customer...</option>' +
            '<option value="__walkin__">No customer (walk-in / open order)</option>' +
            allCustomers.slice().sort(function (a, b) {
                const aKey = String(a.company || a.name || '').toLowerCase();
                const bKey = String(b.company || b.name || '').toLowerCase();
                const byCo = aKey.localeCompare(bKey);
                if (byCo) return byCo;
                return String(a.name || '').toLowerCase().localeCompare(String(b.name || '').toLowerCase());
            }).map(c =>
                `<option value="${escapeHtml(c.name || '')}">${escapeHtml(c.name || '')}${c.company ? ' — ' + escapeHtml(c.company) : ''}</option>`
            ).join('');
    }

    // Salesmen
if (!Array.isArray(salesmen) || salesmen.length === 0) {
    if (typeof loadSalesmen === 'function') await loadSalesmen();
}
    const salesmanSelect = document.getElementById('new-order-salesman');
    if (salesmanSelect) {
        salesmanSelect.innerHTML = '<option value="">Select salesman...</option>' +
            salesmen.map(s => {
                const name = s.name || [s.firstName, s.lastName].filter(Boolean).join(' ');
                return `<option value="${(name || '').replace(/"/g, '&quot;')}">${name}</option>`;
            }).join('');
    }

    // Reset
    const creditWrap = document.getElementById('new-order-credit-wrap');
    const creditEl = document.getElementById('new-order-credit');
    if (creditWrap) creditWrap.classList.toggle('hidden', typeof isJonathanAdmin !== 'function' || !isJonathanAdmin());
    if (creditEl) creditEl.value = '0';
    const notesEl = document.getElementById('new-order-notes');
    if (notesEl) notesEl.value = '';

    const searchEl = document.getElementById('new-order-product-search');
    if (searchEl) searchEl.value = '';

    const resultsEl = document.getElementById('new-order-product-results');
    if (resultsEl) {
        resultsEl.innerHTML = '';
        resultsEl.classList.add('hidden');
    }

    newOrderSelectedProducts = [];
    renderNewOrderSelectedList();
    modal.classList.remove('hidden');
}

function toggleWalkInOrderFields() {
    const sel = document.getElementById('new-order-customer');
    const wrap = document.getElementById('walkin-order-fields');
    if (!wrap) return;
    wrap.classList.toggle('hidden', !sel || sel.value !== '__walkin__');
    if (typeof renderNewOrderSelectedList === 'function') {
        renderNewOrderSelectedList(true);
    }
}

function hideAddOrderModal() {
    const modal = document.getElementById('add-order-modal');
    if (modal) modal.classList.add('hidden');
}

function renderOrderProductSearch() {
    const search = (document.getElementById('new-order-product-search')?.value || '').toLowerCase().trim();
    const resultsEl = document.getElementById('new-order-product-results');
    if (!resultsEl || typeof PRODUCT_CATALOG === 'undefined') return;

    if (search.length < 1) {
        resultsEl.innerHTML = '';
        resultsEl.classList.add('hidden');
        return;
    }

    const matches = PRODUCT_CATALOG.filter(p =>
        p.name.toLowerCase().includes(search) ||
        (p.category || '').toLowerCase().includes(search) ||
        (p.caseSize || '').toLowerCase().includes(search)
    ).slice(0, 20);

    if (matches.length === 0) {
        resultsEl.innerHTML = '<p class="px-4 py-3 text-sm text-[#6B4423]">No products found.</p>';
        resultsEl.classList.remove('hidden');
        return;
    }

    resultsEl.innerHTML = matches.map(p => {
        const caseSize = p.caseSize || '—';
        const safeName = p.name.replace(/'/g, "\\'");
        const priceText = p.isMarketPrice
            ? 'Market'
            : (p.unitPrice != null ? ('$' + Number(p.unitPrice).toFixed(2)) : '—');
        return `
            <button type="button"
                    onclick="selectOrderProduct('${safeName}')"
                    class="w-full text-left px-4 py-2 text-sm hover:bg-[#f8f4eb] border-b border-[#f0e6d9] last:border-0">
                <span class="font-medium text-[#1E4D2B]">${escapeHtml(p.name)}</span>
                <span class="block text-xs text-[#6B4423] mt-0.5">${caseSize} · ${priceText}</span>
            </button>
        `;
    }).join('');
    resultsEl.classList.remove('hidden');
}

function selectOrderProduct(productName) {
    // Don't add duplicates
    if (newOrderSelectedProducts.some(p => p.name === productName)) {
        alert('That product is already on the order.');
        return;
    }

    const catalog = (typeof PRODUCT_CATALOG !== 'undefined')
        ? PRODUCT_CATALOG.find(c => c.name === productName)
        : null;
    newOrderSelectedProducts.push({
        name: productName,
        quantity: 1,
        caseSize: catalog?.caseSize || '',
        unitPrice: catalog && !catalog.isMarketPrice ? Number(catalog.unitPrice) : null,
        displayPrice: catalog
            ? (catalog.isMarketPrice ? 'Market Price' : ('$' + Number(catalog.unitPrice).toFixed(2)))
            : '',
        isMarketPrice: !!(catalog && catalog.isMarketPrice)
    });

    // Clear search
    const searchEl = document.getElementById('new-order-product-search');
    if (searchEl) searchEl.value = '';
    const resultsEl = document.getElementById('new-order-product-results');
    if (resultsEl) {
        resultsEl.innerHTML = '';
        resultsEl.classList.add('hidden');
    }

    renderNewOrderSelectedList();
}

function renderNewOrderSelectedList(skipFocus) {
    const list = document.getElementById('new-order-selected-list');
    if (!list) return;

    if (newOrderSelectedProducts.length === 0) {
        list.innerHTML = '<p class="text-sm text-[#6B4423]" id="new-order-empty-msg">No products added yet. Search above to add items.</p>';
        const emptyTotal = document.getElementById('new-order-total');
        if (emptyTotal) emptyTotal.textContent = '$0.00';
        return;
    }

    const isWalkIn = (document.getElementById('new-order-customer')?.value || '') === '__walkin__';

    list.innerHTML = newOrderSelectedProducts.map((p, index) => {
        const caseSize = p.caseSize || '—';
        const priceVal = (p.unitPrice != null && p.unitPrice !== '')
            ? Number(p.unitPrice).toFixed(2)
            : '';
        const priceText = p.displayPrice
            || (p.isMarketPrice ? 'Market' : (priceVal ? ('$' + priceVal) : '—'));
        const priceField = isWalkIn
            ? ('<label class="text-xs text-[#6B4423]">$</label>' +
               '<input type="number" step="0.01" min="0" value="' + priceVal + '" placeholder="0.00" ' +
               'class="new-order-price w-20 border-2 border-[#6B4423] rounded-lg px-2 py-1 text-sm text-center" ' +
               'onchange="updateOrderProductPrice(' + index + ', this.value)">')
            : '';
        const sub = isWalkIn ? escapeHtml(caseSize) : (escapeHtml(caseSize) + ' · ' + escapeHtml(priceText));
        const qtyN = Number(p.quantity) || 0;
        const unitN = Number(p.unitPrice);
        const lineText = isFinite(unitN) ? ('$' + (unitN * qtyN).toFixed(2)) : '';
        return `
            <div class="flex flex-wrap items-center gap-3 bg-white border border-[#6B4423] rounded-xl px-3 py-2">
                <div class="flex-1 min-w-[140px]">
                    <span class="text-sm font-medium text-[#1E4D2B]">${escapeHtml(p.name)}</span>
                    <span class="block text-xs text-[#6B4423]">${sub}</span>
                    <span class="block text-sm font-bold brand-green">${lineText}</span>
                </div>
                ${priceField}
                <label class="text-xs text-[#6B4423]">Units</label>
                <input type="number" min="1" value="${p.quantity}"
                       class="new-order-qty w-20 border-2 border-[#6B4423] rounded-lg px-2 py-1 text-sm text-center"
                       onchange="updateOrderProductQty(${index}, this.value)">
                <button type="button" onclick="removeOrderProduct(${index})"
                        class="text-red-600 text-sm px-2 py-1 hover:bg-red-50 rounded-lg">
                    Remove
                </button>
            </div>
        `;
    }).join('');
        let orderTotal = 0;
    newOrderSelectedProducts.forEach(function (p) {
        const unit = Number(p.unitPrice);
        const qty = Number(p.quantity) || 0;
        if (isFinite(unit)) orderTotal += unit * qty;
    });
    const creditN = parseFloat(document.getElementById('new-order-credit')?.value || '0');
    if (isFinite(creditN) && creditN > 0) orderTotal -= creditN;
    const totalEl = document.getElementById('new-order-total');
    if (totalEl) totalEl.textContent = '$' + orderTotal.toFixed(2);
    if (!skipFocus) {
        const qtyInputs = list.querySelectorAll('input.new-order-qty');
        if (qtyInputs.length > 0) {
            const last = qtyInputs[qtyInputs.length - 1];
            last.focus();
            last.select();
        }
    }
}

function updateOrderProductQty(index, value) {
    const qty = parseInt(value, 10);
    if (!qty || qty < 1) return;
    if (newOrderSelectedProducts[index]) {
        newOrderSelectedProducts[index].quantity = qty;
        renderNewOrderSelectedList(true);
    }
}

function updateOrderProductPrice(index, value) {
    const item = newOrderSelectedProducts[index];
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
    renderNewOrderSelectedList(true);
}

function removeOrderProduct(index) {
    newOrderSelectedProducts.splice(index, 1);
    renderNewOrderSelectedList();
}

function hideAdminOrderConfirmModal() {
    document.getElementById('admin-order-confirm-dynamic')?.remove();
}

function openAdminOrderConfirmModal(event) {
    if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
    }

    const customer = (document.getElementById('new-order-customer')?.value || '').trim();
    if (!customer) {
        alert('Please select a customer.');
        return;
    }

    let items = [];
    if (typeof newOrderSelectedProducts !== 'undefined' && newOrderSelectedProducts.length > 0) {
        items = newOrderSelectedProducts
            .filter(p => p.name && (p.quantity || 0) > 0)
            .map(p => {
                const catalog = (typeof PRODUCT_CATALOG !== 'undefined')
                    ? PRODUCT_CATALOG.find(c => c.name === p.name)
                    : null;
                const unitPrice = (p.unitPrice != null && p.unitPrice !== '')
                    ? Number(p.unitPrice)
                    : (catalog && !catalog.isMarketPrice ? catalog.unitPrice : null);
                const displayPrice = p.displayPrice
                    || (catalog
                        ? (catalog.isMarketPrice ? 'Market Price' : ('$' + Number(catalog.unitPrice).toFixed(2)))
                        : '');
                return {
                    product: p.name,
                    quantity: p.quantity || 1,
                    caseSize: p.caseSize || catalog?.caseSize || '',
                    unitPrice: unitPrice,
                    displayPrice: displayPrice,
                    isMarketPrice: (p.isMarketPrice != null) ? !!p.isMarketPrice : !!(catalog && catalog.isMarketPrice)
                };
            });
    } else {
        document.querySelectorAll('#new-order-lines .order-line-row').forEach(row => {
            const product = row.querySelector('.order-line-product')?.value || '';
            const qty = parseInt(row.querySelector('.order-line-qty')?.value, 10) || 0;
            if (product && qty > 0) {
                items.push({
                    product: product,
                    quantity: qty,
                    unitPrice: null,
                    displayPrice: '',
                    isMarketPrice: false
                });
            }
        });
    }

    if (!items.length) {
        alert('Please add at least one product with quantity.');
        return;
    }

    let shipText = 'No shipping address on file';
    if (typeof allCustomers !== 'undefined' && Array.isArray(allCustomers)) {
        const match = allCustomers.find(c =>
            (c.name || '').trim().toLowerCase() === customer.toLowerCase() ||
            (c.company || '').trim().toLowerCase() === customer.toLowerCase()
        );
        if (match) {
            shipText = (match.shipping_address || match.shippingAddress || '').trim() || shipText;
        }
    }

    let pricedTotal = 0;
    let hasMarket = false;
    let rows = '';

    items.forEach((item) => {
        const qty = item.quantity || 1;
        let lineLabel = item.displayPrice || '—';
        if (item.isMarketPrice && (item.unitPrice == null || item.unitPrice === '')) {
            hasMarket = true;
            lineLabel = 'Market';
        } else {
            const unit = parseFloat(item.unitPrice) || 0;
            const line = unit * qty;
            pricedTotal += line;
            lineLabel = '$' + line.toFixed(2);
        }
        rows += `
            <div style="display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #f0e6d6;padding-bottom:8px;margin-bottom:8px;">
                <div>
                    <p style="font-weight:600;color:#1E4D2B;margin:0;">${escapeHtml(item.product || 'Item')}</p>
                    <p style="font-size:12px;color:#6B4423;margin:2px 0 0;">Qty ${qty}${item.caseSize ? ' · ' + item.caseSize : ''}</p>
                </div>
                <p style="font-weight:600;color:#1E4D2B;margin:0;">${lineLabel}</p>
            </div>
        `;
    });

    document.getElementById('admin-order-confirm-dynamic')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'admin-order-confirm-dynamic';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;padding:16px;';
    overlay.innerHTML = `
        <div style="background:#fff;border:2px solid #6B4423;border-radius:16px;width:100%;max-width:32rem;max-height:90vh;overflow:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #d4b78f;">
                <h2 style="margin:0;font-size:1.25rem;font-weight:700;color:#1E4D2B;">Confirm Order</h2>
                <button type="button" onclick="hideAdminOrderConfirmModal()" style="border:none;background:none;font-size:1.5rem;color:#6B4423;cursor:pointer;">&times;</button>
            </div>
            <div style="padding:16px 20px;">
                <p style="font-size:11px;font-weight:700;color:#6B4423;text-transform:uppercase;margin:0 0 4px;">Customer</p>
                <p style="margin:0 0 12px;color:#1E4D2B;font-weight:600;">${escapeHtml(customer)}</p>
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
                <button type="button" onclick="hideAdminOrderConfirmModal()"
                    style="flex:1;padding:10px 16px;border:2px solid #6B4423;background:#fff;color:#6B4423;border-radius:12px;font-weight:600;cursor:pointer;">Go Back</button>
                <button type="button" onclick="confirmAndSubmitAdminOrder()"
                    style="flex:1;padding:10px 16px;border:none;background:#1E4D2B;color:#d4b78f;border-radius:12px;font-weight:600;cursor:pointer;">Confirm &amp; Submit</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function confirmAndSubmitAdminOrder() {
    hideAdminOrderConfirmModal();
    if (typeof saveNewOrder === 'function') {
        await saveNewOrder({ preventDefault: function () {} });
    }
}


async function saveNewOrder(event) {
    event.preventDefault();

    const customer = (document.getElementById('new-order-customer')?.value || '').trim();
    const salesman = (document.getElementById('new-order-salesman')?.value || '').trim();
    const notes = (document.getElementById('new-order-notes')?.value || '').trim();
    let creditAmt = 0;
    if (typeof isJonathanAdmin === 'function' && isJonathanAdmin()) {
        creditAmt = parseFloat(document.getElementById('new-order-credit')?.value || '0');
        if (isNaN(creditAmt) || creditAmt < 0) {
            alert('Credit must be 0 or a positive dollar amount.');
            return;
        }
    }

    const isWalkIn = customer === '__walkin__';
    const walkInName = (document.getElementById('walkin-name')?.value || '').trim();
    const walkInCompany = (document.getElementById('walkin-company')?.value || '').trim();
    const walkInEmail = (document.getElementById('walkin-email')?.value || '').trim();
    const walkInPhone = (document.getElementById('walkin-phone')?.value || '').trim();
    const walkInStreet = (document.getElementById('walkin-street')?.value || '').trim();
    const walkInCity = (document.getElementById('walkin-city')?.value || '').trim();
    const walkInState = (document.getElementById('walkin-state')?.value || '').trim().toUpperCase();
    const walkInZip = (document.getElementById('walkin-zip')?.value || '').trim();
    const walkInAddress = [walkInStreet, [walkInCity, walkInState].filter(Boolean).join(', '), walkInZip].filter(Boolean).join(' ');
    const walkInCommissionRaw = (document.getElementById('walkin-commission')?.value || '').trim();
    let walkInCommission = null;
    if (walkInCommissionRaw !== '') {
        walkInCommission = parseFloat(walkInCommissionRaw);
        if (isNaN(walkInCommission) || walkInCommission < 0 || walkInCommission > 100) {
            alert('Commission must be between 0 and 100, or blank.');
            return;
        }
    }
    if (!customer) {
        alert('Please select a customer, or choose walk-in / open order.');
        return;
    }
    if (isWalkIn && !walkInName) {
        alert('Enter a customer name for this open order.');
        return;
    }

    // Prefer selected products list; fall back to line rows
    let items = [];

    if (typeof newOrderSelectedProducts !== 'undefined' && newOrderSelectedProducts.length > 0) {
        items = newOrderSelectedProducts
            .filter(p => p.name && (p.quantity || 0) > 0)
            .map(p => {
                const catalog = (typeof PRODUCT_CATALOG !== 'undefined')
                    ? PRODUCT_CATALOG.find(c => c.name === p.name)
                    : null;
                const unitPrice = (p.unitPrice != null && p.unitPrice !== '')
                    ? Number(p.unitPrice)
                    : (catalog && !catalog.isMarketPrice ? catalog.unitPrice : null);
                const displayPrice = p.displayPrice
                    || (catalog
                        ? (catalog.isMarketPrice ? 'Market Price' : ('$' + Number(catalog.unitPrice).toFixed(2)))
                        : '');
                return {
                    product: p.name,
                    quantity: p.quantity || 1,
                    caseSize: p.caseSize || catalog?.caseSize || '',
                    unitPrice: unitPrice,
                    displayPrice: displayPrice,
                    isMarketPrice: (p.isMarketPrice != null) ? !!p.isMarketPrice : !!(catalog && catalog.isMarketPrice)
                };
            });
    } else {
        const rows = document.querySelectorAll('#new-order-lines .order-line-row');
        rows.forEach(row => {
            const product = row.querySelector('.order-line-product')?.value || '';
            const qty = parseInt(row.querySelector('.order-line-qty')?.value, 10) || 0;
            if (product && qty > 0) {
                items.push({
                    product: product,
                    quantity: qty,
                    unitPrice: null,
                    displayPrice: '',
                    isMarketPrice: false
                });
            }
        });
    }

    if (items.length === 0) {
        alert('Please add at least one product with quantity.');
        return;
    }

    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');

    const invoiceNumber = generateInvoiceNumber();

    const payload = {
        customer_id: null,
        customer_name: isWalkIn ? walkInName : customer,
        customer_email: isWalkIn ? (walkInEmail.toLowerCase() || null) : null,
        customer_company: isWalkIn ? (walkInCompany || null) : null,
        salesman_email: null,
        salesman_name: salesman || user.fullName || user.name || 'Admin',
        status: 'submitted',
        source: 'internal',
        items: items,
        notes: (notes || 'Created via Add Order') +
            (isWalkIn && walkInPhone ? ('\nPhone: ' + walkInPhone) : '') +
            (isWalkIn && walkInAddress ? ('\nAddress: ' + walkInAddress) : ''),
        shipping_cost: 0,
        credit: creditAmt,
        submitted_at: new Date().toISOString(),
        invoice_number: invoiceNumber,
        salesman_commission_percent: isWalkIn ? walkInCommission : (function () {
            if (typeof allCustomers === 'undefined' || !Array.isArray(allCustomers)) return null;
            const match = allCustomers.find(c => (c.name || '').trim() === customer);
            const raw = match && (match.salesmanCommissionPercent != null
                ? match.salesmanCommissionPercent
                : match.salesman_commission_percent);
            if (raw == null || raw === '' || isNaN(Number(raw))) return null;
            return Number(raw);
        })()
    };

    try {
        const { data, error } = await supabaseClient
            .from('orders')
            .insert([payload])
            .select('id, invoice_number')
            .single();

        if (error) throw error;

        const shortId = data?.invoice_number || invoiceNumber || data?.id;

        // Email Pro Forma PDF to Marshall (fire-and-forget)
        await notifyMarshallProforma({
            orderId: shortId,
            customerName: payload.customer_name,
            companyName: payload.customer_company,
            customerEmail: payload.customer_email,
            salesmanName: payload.salesman_name,
            items: payload.items,
            notes: payload.notes,
            shippingCost: payload.shipping_cost || 0,
            credit: payload.credit || 0,
            submittedAt: payload.submitted_at,
            source: payload.source,
            commissionRate: payload.salesman_commission_percent || null
        });

        if (typeof newOrderSelectedProducts !== 'undefined') {
            newOrderSelectedProducts = [];
        }

        hideAddOrderModal();

        if (typeof loadOrders === 'function') {
            await loadOrders();
        }

        alert('Order added for ' + customer);
    } catch (err) {
        console.error(err);
        alert('Could not save order.\n' + (err.message || ''));
    }
}

function showMonthlyOrdersModal() {
    const now = new Date();
    const monthName = now.toLocaleString('default', { month: 'long' });
    const thisMonthOrders = allOrders.filter(o => {
        const orderDate = new Date(o.submittedAt);
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
    });
    const received = thisMonthOrders.filter(o => o.status === 'Received').length;
    const processing = thisMonthOrders.filter(o => o.status === 'Processing').length;
    const shipped = thisMonthOrders.filter(o => o.status === 'Shipped').length;
    alert(`${monthName}'s Orders Breakdown:\n\nTotal: ${thisMonthOrders.length}\nReceived: ${received}\nProcessing: ${processing}\nShipped: ${shipped}`);
}

function showMonthlySalesModal() {
    let totalSales = 0;
    allOrders.forEach(order => {
        if (order.items) {
            order.items.forEach(item => totalSales += (item.quantity || 1) * 50);
        }
    });
    const avg = allOrders.length > 0 ? Math.round(totalSales / allOrders.length) : 0;
    alert(`Monthly Sales: $${totalSales}\nAverage Order: $${avg}`);
}

async function updateDashboardVendors() {
    const activeEl = document.getElementById('dash-active-vendors');
    const inactiveEl = document.getElementById('dash-inactive-vendors');
    const ytdEl = document.getElementById('dash-vendor-ytd');

    let vendorRows = Array.isArray(vendors) ? vendors : [];

    try {
        const { data, error } = await supabaseClient
            .from('vendors')
            .select('id, name, active');

        if (!error && data) {
            vendorRows = data.map(v => ({
                id: v.id,
                name: v.name,
                active: v.active !== false
            }));
        }
    } catch (err) {
        console.warn('updateDashboardVendors: vendors load failed', err);
    }

    const activeCount = vendorRows.filter(v => v.active !== false).length;
    const inactiveCount = vendorRows.filter(v => v.active === false).length;

    if (activeEl) activeEl.textContent = activeCount;
    if (inactiveEl) inactiveEl.textContent = inactiveCount;

    let ytdTotal = 0;
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    try {
        const { data: allPurchases, error: pErr } = await supabaseClient
            .from('vendor_purchases')
            .select('amount, date, created_at, vendor_id, status');

        if (!pErr && allPurchases) {
            allPurchases.forEach(p => {
                const d = new Date(p.date || p.created_at || 0);
                if (isNaN(d.getTime()) || d < startOfYear) return;
                ytdTotal += parseFloat(p.amount) || 0;
            });
        }
    } catch (err) {
        console.warn('updateDashboardVendors: purchases load failed', err);
    }

    if (ytdEl) {
        ytdEl.textContent = '$' + Math.round(ytdTotal).toLocaleString();
    }
}

// Vendor dashboard counts refresh on section enter + after mutations (no polling)

function toggleSelectAllOrders(checkbox) {
    const checkboxes = document.querySelectorAll('.order-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = checkbox.checked;
    });
    updatePrintSelectedButton();
}

function updatePrintSelectedButton() {
    const checked = document.querySelectorAll('.order-checkbox:checked');
    const count = checked.length;
    const btn = document.getElementById('print-selected-btn');
    const apply10 = document.getElementById('apply-10-commission-btn');
    const reset5 = document.getElementById('reset-5-commission-btn');

    if (btn) {
        if (count > 0) {
            btn.classList.remove('hidden');
            btn.textContent = `Print Selected Orders (${count})`;
        } else {
            btn.classList.add('hidden');
        }
    }
    if (apply10) apply10.classList.toggle('hidden', count === 0);
    if (reset5) reset5.classList.toggle('hidden', count === 0);
    const delBtn = document.getElementById('delete-selected-btn');
    if (delBtn) {
        if (count > 0) {
            delBtn.classList.remove('hidden');
            delBtn.textContent = 'Delete Selected Orders (' + count + ')';
        } else {
            delBtn.classList.add('hidden');
        }
    }
}

async function deleteSelectedOrders() {
    if (typeof isJonathanAdmin === 'function' && !isJonathanAdmin()) {
        alert('Only Jonathan can delete orders.');
        return;
    }
    const checked = Array.from(document.querySelectorAll('.order-checkbox:checked')).map(function (cb) {
        return String(cb.value);
    });
    if (!checked.length) {
        alert('Select at least one order first.');
        return;
    }
    const labels = checked.map(function (id) {
        const order = (allOrders || []).find(function (o) { return String(o.id) === id; });
        return (typeof displayInvoiceNumber === 'function' && order) ? displayInvoiceNumber(order) : id;
    });
    if (!confirm('Delete ' + checked.length + ' order(s)?\n\n' + labels.join('\n') + '\n\nThis cannot be undone.')) return;
    if (!confirm('Final confirm: permanently delete ' + checked.length + ' order(s)?')) return;
    try {
        const { error } = await supabaseClient
            .from('orders')
            .delete()
            .in('id', checked);
        if (error) throw error;
        if (typeof logAdminActivity === 'function') {
            logAdminActivity({
                action: 'delete',
                entityType: 'order',
                entityLabel: labels.join(', '),
                summary: 'Deleted ' + checked.length + ' order(s)'
            });
        }
        if (typeof loadOrders === 'function') await loadOrders();
        if (typeof updateDashboardOrders === 'function') updateDashboardOrders();
        if (typeof updateDashboardSales === 'function') updateDashboardSales();
        if (typeof updatePortalCommissionCard === 'function') updatePortalCommissionCard();
        alert('Deleted ' + checked.length + ' order(s).');
    } catch (err) {
        console.error(err);
        alert('Could not delete order(s).\n' + (err.message || ''));
    }
}

async function bulkSetPortalCommissionRate(rate) {
    if (typeof isJonathanAdmin !== 'function' || !isJonathanAdmin()) return;

    const checked = Array.from(document.querySelectorAll('.order-checkbox:checked')).map(cb => cb.value);
    if (!checked.length) {
        alert('Select at least one order first.');
        return;
    }

    const pct = Number(rate) === 10 ? 10 : 5;
    if (!confirm(`Set portal commission to ${pct}% on ${checked.length} order(s)?`)) return;

    try {
        const { error } = await supabaseClient
            .from('orders')
            .update({ portal_commission_rate: pct })
            .in('id', checked);

        if (error) throw error;

        (allOrders || []).forEach(o => {
            if (checked.includes(String(o.id))) {
                o.portalCommissionRate = pct;
            }
        });

        if (typeof renderOrdersTable === 'function') renderOrdersTable();
        if (typeof updatePortalCommissionCard === 'function') updatePortalCommissionCard();

        alert(`Updated ${checked.length} order(s) to ${pct}% commission.`);
    } catch (err) {
        console.error('bulkSetPortalCommissionRate error:', err);
        alert('Could not update commission rate.\n' + (err.message || ''));
    }
}

function printSelectedOrders() {
    const checked = document.querySelectorAll('.order-checkbox:checked');
    if (checked.length === 0) {
        alert('Please select at least one order to print.');
        return;
    }

    const selectedIds = Array.from(checked).map(cb => String(cb.value));
    const ordersToPrint = allOrders.filter(o => selectedIds.includes(String(o.id)));

    if (ordersToPrint.length === 0) {
        alert('No matching orders found.');
        return;
    }

    let printContent = `
        <html>
        <head>
            <title>Print Orders – Donegal Natural</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; color: #222; }
                .order-page { page-break-after: always; margin-bottom: 40px; }
                .order-page:last-child { page-break-after: auto; }
                .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
                .company { font-size: 20px; font-weight: bold; color: #1E4D2B; }
                .title { font-size: 22px; font-weight: bold; text-align: right; }
                .meta { font-size: 13px; margin-top: 4px; }
                hr { border: none; border-top: 2px solid #1E4D2B; margin: 12px 0; }
                .ship-to { margin-bottom: 16px; font-size: 14px; }
                table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 12px; }
                th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; }
                th { background: #f0f0f0; }
                .totals { text-align: right; font-weight: bold; margin-top: 8px; }
                .notes { margin-top: 16px; font-size: 13px; }
                .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #555; }
            </style>
        </head>
        <body>
    `;

    ordersToPrint.forEach(order => {
        let subtotal = 0;
        const rows = (order.items || []).map(item => {
            const price = parseFloat(item.unitPrice) || 0;
            const qty = parseInt(item.quantity, 10) || 0;
            const lineTotal = price * qty;
            subtotal += lineTotal;

            return `
                <tr>
                    <td>${escapeHtml(item.product || '')}</td>
                    <td>${escapeHtml(item.caseSize || '—')}</td>
                    <td>${qty}</td>
                    <td>$${price.toFixed(2)}</td>
                    <td>$${lineTotal.toFixed(2)}</td>
                </tr>
            `;
        }).join('');

        printContent += `
            <div class="order-page">
                <div class="header">
                    <div>
                        <div class="company">Donegal Natural</div>
                    </div>
                    <div class="title">
                        PACKING SLIP / ORDER
                        <div class="meta">Order #${escapeHtml(displayInvoiceNumber(order))}</div>
                        <div class="meta">Date: ${new Date(order.submittedAt).toLocaleDateString()}</div>
                    </div>
                </div>
                <hr>
                <div class="ship-to">
                    <strong>Ship To:</strong><br>
                    ${escapeHtml(order.customer || '')}<br>
                    ${escapeHtml(order.customerCompany || '')}<br>
                    ${escapeHtml(order.customerEmail || '')}
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Product Name</th>
                            <th>Case Size</th>
                            <th>Qty</th>
                            <th>Unit Price</th>
                            <th>Line Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
                <div class="totals">Subtotal: $${subtotal.toFixed(2)}</div>
                ${order.notes ? `<div class="notes"><strong>Notes:</strong> ${escapeHtml(order.notes)}</div>` : ''}
                <div class="footer">Thank you for your business – Donegal Natural</div>
            </div>
        `;
    });

    printContent += `</body></html>`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Please allow pop-ups to print orders.');
        return;
    }
    printWindow.opener = null;
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
    }, 300);
}

window.notifyMarshallProforma = notifyMarshallProforma;
window.loadOrders = loadOrders;
window.renderOrdersSummary = renderOrdersSummary;
window.showAgingOrders = showAgingOrders;
window.updateOrderStatusCards = updateOrderStatusCards;
window.toggleOrderBOExpand = toggleOrderBOExpand;
window.copyOrderId = copyOrderId;
window.hasUnpaidPriorOrders = hasUnpaidPriorOrders;
window.unpaidPriorBadgeHTML = unpaidPriorBadgeHTML;
window.renderOrdersTable = renderOrdersTable;
window.openMarketPriceModal = openMarketPriceModal;
window.hideMarketPriceModal = hideMarketPriceModal;
window.confirmMarketPrices = confirmMarketPrices;
window.denyOrder = denyOrder;
window.openApproveOrderModal = openApproveOrderModal;
window.hideApproveOrderModal = hideApproveOrderModal;
window.renderApproveOrderItems = renderApproveOrderItems;
window.markApproveItemOutOfStock = markApproveItemOutOfStock;
window.updateApproveOrderQty = updateApproveOrderQty;
window.removeApproveOrderItem = removeApproveOrderItem;
window.renderApproveOrderProductSearch = renderApproveOrderProductSearch;
window.addApproveOrderProduct = addApproveOrderProduct;
window.recalcApproveOrderTotals = recalcApproveOrderTotals;
window.editOrderFromInvoice = editOrderFromInvoice;
window.readApproveOrderCommissionPercent = readApproveOrderCommissionPercent;
window.getOrderItemKey = getOrderItemKey;
window.getOrderItemQty = getOrderItemQty;
window.getOrderItemUnit = getOrderItemUnit;
window.sumOrderItems = sumOrderItems;
window.diffOrderItems = diffOrderItems;
window.buildOrderEditNote = buildOrderEditNote;
window.mergeOrderEditNotes = mergeOrderEditNotes;
window.renderApproveOrderChangeSummary = renderApproveOrderChangeSummary;
window.sendUpdatedOrderProforma = sendUpdatedOrderProforma;
window.buildApproveItemsPayload = buildApproveItemsPayload;
window.saveEditedOrderItems = saveEditedOrderItems;
window.confirmApproveOrder = confirmApproveOrder;
window.isMidAtlantic650Location = isMidAtlantic650Location;
window.evaluateFreeShipping = evaluateFreeShipping;
window.getShipInvoiceLocationText = getShipInvoiceLocationText;
window.isPennsylvaniaLocation = isPennsylvaniaLocation;
window.isFloridaLocation = isFloridaLocation;
window.isWestOfMississippiLocation = isWestOfMississippiLocation;
window.getShipInvoiceSubtotal = getShipInvoiceSubtotal;
window.applyAutoShippingRules = applyAutoShippingRules;
window.openShipInvoiceModal = openShipInvoiceModal;
window.hideShipInvoiceModal = hideShipInvoiceModal;
window.renderShipInvoiceItems = renderShipInvoiceItems;
window.updateShipInvoiceQty = updateShipInvoiceQty;
window.removeShipInvoiceItem = removeShipInvoiceItem;
window.markShipItemOutOfStock = markShipItemOutOfStock;
window.renderShipInvoiceProductSearch = renderShipInvoiceProductSearch;
window.addShipInvoiceProduct = addShipInvoiceProduct;
window.recalcShipInvoiceTotals = recalcShipInvoiceTotals;
window.sendOrderStatusEmail = sendOrderStatusEmail;
window.confirmShipInvoice = confirmShipInvoice;
window.estimateMonthlyRange = estimateMonthlyRange;
window.updateEstimatedSpendCard = updateEstimatedSpendCard;
window.updateDashboardOrders = updateDashboardOrders;
window.updateDashboardPendingCount = updateDashboardPendingCount;
window.updateDashboardPendingValue = updateDashboardPendingValue;
window.filterOrders = filterOrders;
window.refreshOrders = refreshOrders;
window.showOrderDetails = showOrderDetails;
window.updateOrderStatus = updateOrderStatus;
window.getTotalOrdersCount = getTotalOrdersCount;
window.incrementTotalOrdersCount = incrementTotalOrdersCount;
window.addTestOrder = addTestOrder;
window.showAddOrderModal = showAddOrderModal;
window.toggleWalkInOrderFields = toggleWalkInOrderFields;
window.hideAddOrderModal = hideAddOrderModal;
window.renderOrderProductSearch = renderOrderProductSearch;
window.selectOrderProduct = selectOrderProduct;
window.renderNewOrderSelectedList = renderNewOrderSelectedList;
window.updateOrderProductQty = updateOrderProductQty;
window.updateOrderProductPrice = updateOrderProductPrice;
window.removeOrderProduct = removeOrderProduct;
window.hideAdminOrderConfirmModal = hideAdminOrderConfirmModal;
window.openAdminOrderConfirmModal = openAdminOrderConfirmModal;
window.confirmAndSubmitAdminOrder = confirmAndSubmitAdminOrder;
window.saveNewOrder = saveNewOrder;
window.showMonthlyOrdersModal = showMonthlyOrdersModal;
window.showMonthlySalesModal = showMonthlySalesModal;
window.updateDashboardVendors = updateDashboardVendors;
window.toggleSelectAllOrders = toggleSelectAllOrders;
window.updatePrintSelectedButton = updatePrintSelectedButton;
window.deleteSelectedOrders = deleteSelectedOrders;
window.bulkSetPortalCommissionRate = bulkSetPortalCommissionRate;
window.printSelectedOrders = printSelectedOrders;

var allBackOrders = [];

var shipPendingBackOrders = [];

function filterOrdersByStatus(status) {
    const container = document.getElementById('orders-table');
    const empty = document.getElementById('orders-empty');

    if (!container || !allOrders) return;

    let filteredOrders = allOrders;

    if (status !== 'all') {
        filteredOrders = allOrders.filter(order => {
            const orderStatus = (order.status || '').toString().trim().toLowerCase();
            if (status === 'pending') {
                return orderStatus === 'pending' || orderStatus === 'submitted';
            }
            return orderStatus === status;
        });
    }

    container.innerHTML = '';

    if (filteredOrders.length === 0) {
        if (empty) empty.classList.remove('hidden');
        return;
    }

    if (empty) empty.classList.add('hidden');

    // Header
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-4 px-2';
    const displayName = status === 'all' ? 'Orders' : status.charAt(0).toUpperCase() + status.slice(1) + ' Orders';

    header.innerHTML = `
        <div>
            <h3 class="text-xl font-bold brand-green">${escapeHtml(displayName)}</h3>
            <p class="text-sm text-[#6B4423]">${filteredOrders.length} order(s) found</p>
        </div>
        ${status !== 'all' ? 
            `<button onclick="showAllOrders()" class="px-4 py-2 text-sm border-2 border-[#6B4423] rounded-xl hover:bg-[#f8f4eb]">
                ← Show All Orders
            </button>` : ''}
    `;
    container.appendChild(header);

    // Build table using the new multi-pill row
    let html = `<table class="w-full"><thead><tr class="bg-[#1E4D2B] text-[#d4b78f]">
        <th class="p-3 text-left">Order ID</th>
        <th class="p-3 text-left">Status</th>
        <th class="p-3 text-left">Date</th>
        <th class="p-3 text-left">Items</th>
    </tr></thead><tbody>`;

    filteredOrders.forEach(order => {
        html += createOrderRow(order);
    });

    html += `</tbody></table>`;
    const tableWrapper = document.createElement('div');
    tableWrapper.innerHTML = html;
    container.appendChild(tableWrapper);
}

function createOrderRow(order) {
    const itemCount = order.items ? order.items.length : 0;
    const currentStatus = (order.status || 'Pending').toLowerCase();

    const statuses = ['pending', 'received', 'processing', 'shipped', 'delivered'];
    const statusLabels = {
        'pending': 'Pending',
        'received': 'Received',
        'processing': 'Processing',
        'shipped': 'Shipped',
        'delivered': 'Delivered'
    };

    let statusHTML = '';

    statuses.forEach(status => {
        const isActive = currentStatus === status;
        let colorClass = '';

        if (status === 'pending') {
            colorClass = isActive ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-700';
        } else if (status === 'received') {
            colorClass = isActive ? 'bg-teal-500 text-white' : 'bg-teal-100 text-teal-700';
        } else if (status === 'processing') {
            colorClass = isActive ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700';
        } else if (status === 'shipped') {
            colorClass = isActive ? 'bg-purple-500 text-white' : 'bg-purple-100 text-purple-700';
        } else if (status === 'delivered') {
            colorClass = isActive ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-700'; // Orange for Delivered
        }

        statusHTML += `
                        <span onclick=\"updateOrderStatus('${String(order.id).replace(/'/g, "\\'")}', '${status}', this)\"  
                  class="px-2.5 py-0.5 text-xs font-semibold rounded-full cursor-pointer transition ${colorClass}">
                ${statusLabels[status]}
            </span>
        `;
    });

    return `
        <tr class="border-t border-[#6B4423] hover:bg-[#f8f4eb]">
            <td class="p-3 font-mono">#${escapeHtml(displayInvoiceNumber(order))}</td>
            <td class="p-3">
                <div class="flex flex-wrap gap-1">
                    ${statusHTML}
                </div>
            </td>
            <td class="p-3 text-sm">${new Date(order.submittedAt).toLocaleDateString()}</td>
            <td class="p-3">${itemCount} item(s)</td>
        </tr>
    `;
}

function showAllOrders() {
    currentOrdersView = 'all';
    currentFilter = 'all';

    // Button styles
    const btnAll = document.getElementById('btn-all-orders');
    const btnBack = document.getElementById('btn-back-orders');
    if (btnAll) {
        btnAll.className = 'inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-[#1E4D2B] text-[#d4b78f] rounded-xl hover:bg-[#254a2f] transition';
    }
    if (btnBack) {
        btnBack.className = 'inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold border-2 border-orange-500 text-orange-700 bg-white rounded-xl hover:bg-orange-50 transition';
    }

    // Show/hide containers
    const ordersTable = document.getElementById('orders-table');
    const ordersEmpty = document.getElementById('orders-empty');
    const backTable = document.getElementById('back-orders-table');
    const backEmpty = document.getElementById('back-orders-empty');
    if (ordersTable) ordersTable.classList.remove('hidden');
    if (backTable) backTable.classList.add('hidden');
    if (backEmpty) backEmpty.classList.add('hidden');

    if (typeof renderOrdersTable === 'function') {
        renderOrdersTable();
    }
}

function showBackOrders() {
    currentOrdersView = 'back';

    // Button styles
    const btnAll = document.getElementById('btn-all-orders');
    const btnBack = document.getElementById('btn-back-orders');
    if (btnAll) {
        btnAll.className = 'inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold border-2 border-[#6B4423] text-[#6B4423] bg-white rounded-xl hover:bg-[#f8f4eb] transition';
    }
    if (btnBack) {
        btnBack.className = 'inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition';
    }

    // Show/hide containers
    const ordersTable = document.getElementById('orders-table');
    const ordersEmpty = document.getElementById('orders-empty');
    const backTable = document.getElementById('back-orders-table');
    const backEmpty = document.getElementById('back-orders-empty');
    if (ordersTable) ordersTable.classList.add('hidden');
    if (ordersEmpty) ordersEmpty.classList.add('hidden');
    if (backTable) backTable.classList.remove('hidden');

    if (typeof loadBackOrders === 'function') {
        loadBackOrders();
    } else if (typeof renderBackOrdersTable === 'function') {
        renderBackOrdersTable();
    }
}

async function loadBackOrders() {
    const container = document.getElementById('back-orders-table');
    if (container) {
        container.innerHTML = `<p class="text-center text-[#6B4423] py-10"><i class="fas fa-spinner fa-spin mr-2"></i>Loading back orders…</p>`;
    }

    try {
        const { data, error } = await supabaseClient
            .from('back_orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        allBackOrders = data || [];
    } catch (err) {
        console.error('loadBackOrders error:', err);
        allBackOrders = [];
    }

    if (typeof updateBackOrdersBadge === 'function') updateBackOrdersBadge();
    if (typeof renderBackOrdersTable === 'function') renderBackOrdersTable();

    // Re-draw All Orders so nested fulfilled BO rows appear on first load
    if (currentOrdersView === 'all' && typeof renderOrdersTable === 'function') {
        renderOrdersTable();
    }
}

function updateBackOrdersBadge() {
    const badge = document.getElementById('back-orders-count');
    if (!badge) return;
    const pending = (allBackOrders || []).filter(b =>
        (b.status || '').toLowerCase() === 'pending'
    );
    // Distinct invoices / orders — not individual line items
    const uniqueInvoices = new Set(
        pending.map(b => String(b.invoice_number || b.original_order_id || b.id))
    );
    badge.textContent = uniqueInvoices.size;
}

function renderBackOrdersTable() {
    const container = document.getElementById('back-orders-table');
    const empty = document.getElementById('back-orders-empty');
    if (!container) return;

    const rows = allBackOrders || [];
    if (rows.length === 0) {
        container.innerHTML = '';
        if (empty) empty.classList.remove('hidden');
        return;
    }
    if (empty) empty.classList.add('hidden');

    // Group by invoice / original order
    const groups = {};
    rows.forEach(b => {
        const key = String(b.invoice_number || b.original_order_id || b.id);
        if (!groups[key]) {
            groups[key] = {
                key: key,
                invoice: b.invoice_number || String(b.original_order_id || ''),
                originalOrderId: b.original_order_id || null,
                customer: b.customer_name || '—',
                customerEmail: b.customer_email || null,
                customerCompany: b.customer_company || null,
                items: [],
                createdAt: b.created_at || null
            };
        }
        groups[key].items.push(b);
        if (b.created_at && (!groups[key].createdAt || b.created_at < groups[key].createdAt)) {
            groups[key].createdAt = b.created_at;
        }
    });

    const groupList = Object.values(groups).sort((a, b) => {
        const da = new Date(a.createdAt || 0);
        const db = new Date(b.createdAt || 0);
        return db - da;
    });

    if (!window.expandedBackOrders) window.expandedBackOrders = {};

    let html = `
        <table class="w-full text-sm">
            <thead>
                <tr class="bg-[#1E4D2B] text-[#d4b78f]">
                    <th class="p-3 text-left w-8"></th>
                    <th class="p-3 text-left">Invoice #</th>
                    <th class="p-3 text-left">Customer</th>
                    <th class="p-3 text-center">Items</th>
                    <th class="p-3 text-left">Status</th>
                    <th class="p-3 text-left">Date</th>
                    <th class="p-3 text-center">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    groupList.forEach(g => {
        const pendingItems = g.items.filter(i => (i.status || '').toLowerCase() === 'pending');
        const allFulfilled = pendingItems.length === 0;
        const isExpanded = !!window.expandedBackOrders[g.key];
        const invShort = String(g.invoice || '').slice(0, 8);
        const dateText = g.createdAt ? new Date(g.createdAt).toLocaleDateString() : '—';

        let statusBadge;
        if (allFulfilled) {
            statusBadge = `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Fulfilled</span>`;
        } else if (pendingItems.length < g.items.length) {
            statusBadge = `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Partial</span>`;
        } else {
            statusBadge = `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">Pending</span>`;
        }

        const safeKey = String(g.key).replace(/'/g, "\\'");
        const actions = !allFulfilled
            ? `<button type="button" onclick="fulfillBackOrderGroup('${safeKey}'); event.stopPropagation();"
                       class="text-xs px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700">
                   Fulfill
               </button>`
            : '—';

        html += `
            <tr class="border-t border-[#d4b78f] hover:bg-[#f8f4eb] cursor-pointer"
                onclick="toggleBackOrderExpand('${safeKey}')">
                <td class="p-3 text-center text-[#6B4423]">
                    <i class="fas fa-chevron-${isExpanded ? 'down' : 'right'} text-xs"></i>
                </td>
                <td class="p-3 font-mono">#${invShort}</td>
                <td class="p-3">${g.customer}</td>
                <td class="p-3 text-center font-semibold">${g.items.length}</td>
                <td class="p-3">${statusBadge}</td>
                <td class="p-3 text-sm">${dateText}</td>
                <td class="p-3 text-center" onclick="event.stopPropagation()">${actions}</td>
            </tr>
        `;

        if (isExpanded) {
            html += `
                <tr class="bg-[#f8f1e9]">
                    <td colspan="7" class="p-0">
                        <div class="px-4 py-3">
                            <table class="w-full text-xs">
                                <thead>
                                    <tr class="text-[#6B4423]">
                                        <th class="p-2 text-left">Product</th>
                                        <th class="p-2 text-left">Case Size</th>
                                        <th class="p-2 text-center">Qty</th>
                                        <th class="p-2 text-left">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
            `;
            g.items.forEach(item => {
                const st = (item.status || 'pending').toLowerCase();
                let itemBadge;
                if (st === 'fulfilled') {
                    itemBadge = `<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">Fulfilled</span>`;
                } else if (st === 'cancelled') {
                    itemBadge = `<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">Cancelled</span>`;
                } else {
                    itemBadge = `<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">Pending</span>`;
                }
                html += `
                    <tr class="border-t border-[#e8d9b8]">
                        <td class="p-2 font-medium">${item.product_name || '—'}</td>
                        <td class="p-2">${item.case_size || '—'}</td>
                        <td class="p-2 text-center font-semibold">${item.quantity || 1}</td>
                        <td class="p-2">${itemBadge}</td>
                    </tr>
                `;
            });
            html += `
                                </tbody>
                            </table>
                        </div>
                    </td>
                </tr>
            `;
        }
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

function toggleBackOrderExpand(key) {
    if (!window.expandedBackOrders) window.expandedBackOrders = {};
    window.expandedBackOrders[key] = !window.expandedBackOrders[key];
    renderBackOrdersTable();
}

async function fulfillBackOrderGroup(groupKey) {
    if (!groupKey) return;

    const groupItems = (allBackOrders || []).filter(b => {
        const key = String(b.invoice_number || b.original_order_id || b.id);
        return key === String(groupKey);
    });
    const pending = groupItems.filter(b => (b.status || '').toLowerCase() === 'pending');
    if (!pending.length) {
        alert('No pending items left on this invoice.');
        return;
    }

    openShipInvoiceForBackOrder(groupKey, pending);
}

function openShipInvoiceForBackOrder(groupKey, pendingItems) {
    shipInvoiceMode = 'backorder';
    shipBackOrderPendingIds = pendingItems.map(b => b.id);
    shipPendingBackOrders = [];

    const sample = pendingItems[0];
    const originalId = sample.original_order_id || sample.invoice_number;
    const originalOrder = (allOrders || []).find(o => String(o.id) === String(originalId)) || null;

    shipInvoiceOrder = originalOrder || {
        id: originalId,
        customer: sample.customer_name,
        customerEmail: sample.customer_email,
        customerCompany: sample.customer_company,
        salesman: '',
        shippingCost: 0,
        credit: 0
    };

    shipInvoiceItems = pendingItems.map(item => ({
        product: item.product_name || '',
        quantity: item.quantity || 1,
        caseSize: item.case_size || '',
        unitPrice: item.unit_price != null ? item.unit_price : null,
        displayPrice: item.display_price || '',
        isMarketPrice: !!item.is_market_price
    }));

    const customerEl = document.getElementById('ship-inv-customer');
    const salesmanEl = document.getElementById('ship-inv-salesman');
    const idEl = document.getElementById('ship-inv-id');
    const subtitleEl = document.getElementById('ship-invoice-subtitle');

    if (customerEl) customerEl.textContent = shipInvoiceOrder.customer || sample.customer_name || '—';
    if (salesmanEl) salesmanEl.textContent = shipInvoiceOrder.salesman || '—';
    if (idEl) idEl.textContent = String(sample.invoice_number || originalId || '');
    if (subtitleEl) subtitleEl.textContent = 'Back order fulfillment — review items and shipping, then confirm';

    const shippingEl = document.getElementById('ship-inv-shipping');
    if (shippingEl) {
        // BO follow-up: no additional shipping when original qualified (region legend TBD in Reports)
        shippingEl.value = '0.00';
        shippingEl.readOnly = true;
        shippingEl.classList.add('bg-gray-100');
    }
    const noteEl = document.getElementById('ship-inv-shipping-note');
    if (noteEl) noteEl.textContent = 'Back order follow-up: no additional shipping (free-ship rules / original order)';

    const creditEl = document.getElementById('ship-inv-credit');
    if (creditEl) creditEl.value = '0.00';

    const searchEl = document.getElementById('ship-inv-product-search');
    if (searchEl) searchEl.value = '';
    const resultsEl = document.getElementById('ship-inv-product-results');
    if (resultsEl) {
        resultsEl.innerHTML = '';
        resultsEl.classList.add('hidden');
    }

    if (typeof renderShipInvoiceItems === 'function') renderShipInvoiceItems();

    const finishBOOpen = () => {
        if (typeof recalcShipInvoiceTotals === 'function') recalcShipInvoiceTotals();
        document.getElementById('ship-invoice-modal')?.classList.remove('hidden');
    };
    if ((!allCustomers || allCustomers.length === 0) && typeof loadCustomers === 'function') {
        loadCustomers().then(finishBOOpen).catch(finishBOOpen);
    } else {
        finishBOOpen();
    }
}

async function confirmBackOrderFulfillFromShipModal() {
    if (!shipBackOrderPendingIds.length) {
        alert('No back-order items to fulfill.');
        return;
    }
    if (!shipInvoiceItems.length) {
        alert('Invoice must have at least one line item.');
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('back_orders')
            .update({
                status: 'fulfilled',
                fulfilled_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .in('id', shipBackOrderPendingIds);

        if (error) throw error;

        if (typeof decreaseInventoryForOrder === 'function') {
            await decreaseInventoryForOrder({
                items: shipInvoiceItems.map(i => ({
                    product: i.product,
                    quantity: i.quantity
                }))
            });
        }

        hideShipInvoiceModal();
        if (typeof loadBackOrders === 'function') await loadBackOrders();
        alert('Back order fulfilled. Inventory updated.');
    } catch (err) {
        console.error(err);
        alert('Could not fulfill back order.\n' + (err.message || ''));
    }
}

function openBackOrderFulfillInvoice(groupKey, fulfilledItems) {
    const items = fulfilledItems || (allBackOrders || []).filter(b => {
        const key = String(b.invoice_number || b.original_order_id || b.id);
        return key === String(groupKey);
    });
    if (!items.length) {
        alert('No items to show on invoice.');
        return;
    }

    const sample = items[0];
    const originalId = sample.original_order_id || sample.invoice_number;
    const originalOrder = (allOrders || []).find(o => String(o.id) === String(originalId)) || null;

    // Prefer original order customer data; fall back to back_order snapshot
    const customerName = (originalOrder && (originalOrder.customer || originalOrder.customer_name))
        || sample.customer_name || '—';
    const customerCompany = (originalOrder && (originalOrder.customerCompany || originalOrder.customer_company))
        || sample.customer_company || '';
    const customerEmail = (originalOrder && (originalOrder.customerEmail || originalOrder.customer_email))
        || sample.customer_email || '';

    // Invoice number / date
    const invNum = document.getElementById('inv-number');
    if (invNum) invNum.textContent = String(sample.invoice_number || originalId || '—');

    const invDate = document.getElementById('inv-date');
    if (invDate) invDate.textContent = new Date().toLocaleDateString();

    const invStatus = document.getElementById('inv-status');
    if (invStatus) invStatus.textContent = 'Back Order Fulfillment';

    // BILL TO / SHIP TO — reuse customer lookup when possible
    const customer = (allCustomers || []).find(c => {
        const cEmail = (c.email || '').trim().toLowerCase();
        const cName = (c.name || '').trim().toLowerCase();
        if (customerEmail && cEmail && customerEmail.toLowerCase() === cEmail) return true;
        if (customerName && cName && cName === customerName.toLowerCase()) return true;
        return false;
    }) || null;

    const billEl = document.getElementById('inv-bill-to');
    if (billEl) {
        const lines = [customerName];
        if (customerCompany) lines.push(customerCompany);
        if (customer?.phone) lines.push(customer.phone);
        else if (customerEmail) lines.push(customerEmail);
        const billing = customer?.billingAddress || customer?.shippingAddress || '';
        if (billing) lines.push(billing);
        billEl.innerHTML = lines.map(l => `<p>${escapeHtml(l)}</p>`).join('');
    }

    const shipEl = document.getElementById('inv-ship-to');
    if (shipEl) {
        const lines = [customerName];
        if (customerCompany) lines.push(customerCompany);
        const shipping = customer?.shippingAddress || customer?.billingAddress || '';
        if (shipping) lines.push(shipping);
        shipEl.innerHTML = lines.map(l => `<p>${escapeHtml(l)}</p>`).join('');
    }

    // Line items from fulfilled back orders
    const tbody = document.getElementById('inv-items-body');
    let subtotal = 0;
    if (tbody) {
        tbody.innerHTML = items.map(item => {
            const qty = parseInt(item.quantity, 10) || 0;
            const unit = item.unit_price != null ? Number(item.unit_price) : 0;
            const hasPrice = unit > 0;
            const lineTotal = qty * unit;
            if (hasPrice) subtotal += lineTotal;

            const desc = escapeHtml([
                item.product_name || '—',
                item.case_size ? '· ' + item.case_size : ''
            ].filter(Boolean).join(' '));

            const unitText = hasPrice ? ('$' + unit.toFixed(2)) : escapeHtml(item.display_price || '—');
            const totalText = hasPrice ? ('$' + lineTotal.toFixed(2)) : '—';

            return `
                <tr class="border-t border-[#d4b78f]">
                    <td class="p-3 text-left font-semibold">${qty}</td>
                    <td class="p-3 text-left">${desc}</td>
                    <td class="p-3 text-right">${unitText}</td>
                    <td class="p-3 text-right font-semibold">${totalText}</td>
                </tr>`;
        }).join('');
    }

    // Notes
    const notesEl = document.getElementById('inv-notes');
    if (notesEl) {
        notesEl.textContent = 'Back order fulfillment for original invoice #' +
            String(sample.invoice_number || originalId || '').slice(0, 8) +
            '. These items were previously out of stock and are now ready to ship.';
    }

    // Shipping: free when original order had $0 shipping or met free-ship rules
    let shipping = 0;
    if (originalOrder) {
        const origShip = Number(originalOrder.shippingCost != null ? originalOrder.shippingCost : originalOrder.shipping_cost);
        if (!isNaN(origShip) && origShip === 0) {
            shipping = 0;
        } else {
            // Still $0 for back-order follow-up when original qualified for free shipping
            // (region rules still being finalized — default free for fulfillment shipments)
            shipping = 0;
        }
    }

    const credit = 0;
    const total = Math.max(0, subtotal + shipping - credit);

    const subEl = document.getElementById('inv-subtotal');
    const shipCostEl = document.getElementById('inv-shipping');
    const creditRow = document.getElementById('inv-credit-row');
    const totEl = document.getElementById('inv-total');

    if (subEl) subEl.textContent = '$' + subtotal.toFixed(2);
    if (shipCostEl) {
        const st = (order.status || '').toString().toLowerCase();
        if (shipping > 0) {
            shipCostEl.textContent = '$' + shipping.toFixed(2);
        } else if (st === 'shipped' || st === 'delivered' || st === 'completed') {
            shipCostEl.textContent = 'Free Shipping';
        } else {
            shipCostEl.textContent = '$0.00';
        }
    }
    if (creditRow) creditRow.classList.add('hidden');
    if (totEl) totEl.textContent = '$' + total.toFixed(2);

    const modal = document.getElementById('order-invoice-modal');
    if (modal) modal.classList.remove('hidden');
}

function filterOrdersByCustomer(customerName, customerId) {
    const container = document.getElementById('orders-table');
    const empty = document.getElementById('orders-empty');
    const summaryCards = document.querySelector('#orders .grid-cols-1.md\\:grid-cols-3');

    if (!container || !allOrders) return;

    // Hide the general customer summary cards
    if (summaryCards) summaryCards.style.display = 'none';

    const customerRow = (typeof allCustomers !== 'undefined')
        ? allCustomers.find(c =>
            (customerId && String(c.id) === String(customerId)) ||
            (customerName && c.name === customerName)
          )
        : null;
    const email = (customerRow && customerRow.email ? String(customerRow.email) : '').toLowerCase().trim();
    const name = (customerName || (customerRow && customerRow.name) || '').toLowerCase().trim();

    const customerOrders = allOrders.filter(order => {
        if (customerId && order.customerId && String(order.customerId) === String(customerId)) return true;
        if (email && order.customerEmail && String(order.customerEmail).toLowerCase() === email) return true;
        if (name && order.customer && String(order.customer).toLowerCase() === name) return true;
        return false;
    });

    container.innerHTML = '';

    // === NEW: Customer Order Summary Stats ===
    let totalSpent = 0;
    customerOrders.forEach(order => {
        if (order.items) {
            order.items.forEach(item => {
                totalSpent += (item.quantity || 1) * 50;
            });
        }
    });

    // Calculate average days between orders
    let avgFrequency = 'N/A';
    if (customerOrders.length > 1) {
        const dates = customerOrders
            .map(o => new Date(o.submittedAt))
            .sort((a, b) => a - b);

        let totalDays = 0;
        for (let i = 1; i < dates.length; i++) {
            totalDays += (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);
        }
        avgFrequency = Math.round(totalDays / (dates.length - 1)) + ' days';
    }

    // Stats header
    const statsDiv = document.createElement('div');
    statsDiv.className = 'mb-6 p-4 bg-[#f8f4eb] border border-[#d4b78f] rounded-xl';
    statsDiv.innerHTML = `
        <div class="flex justify-between items-center mb-2">
            <h3 class="text-xl font-bold brand-green">Orders for ${escapeHtml(customerName)}</h3>
            <button onclick="showSection('customers')" class="px-4 py-2 text-sm border-2 border-[#6B4423] rounded-xl hover:bg-[#f8f4eb]">
              ← Back to Customers
            </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
                <p class="text-sm text-[#6B4423]">Total Orders</p>
                <p class="text-3xl font-bold brand-green">${customerOrders.length}</p>
            </div>
            <div>
                <p class="text-sm text-[#6B4423]">Total Spent</p>
                <p class="text-3xl font-bold brand-green">$${totalSpent.toLocaleString()}</p>
            </div>
            <div>
                <p class="text-sm text-[#6B4423]">Avg Order Frequency</p>
                <p class="text-3xl font-bold brand-green">${avgFrequency}</p>
            </div>
        </div>
    `;
    container.appendChild(statsDiv);

    if (customerOrders.length === 0) {
        if (empty) empty.classList.remove('hidden');
        return;
    }

    if (empty) empty.classList.add('hidden');

    // Orders Table
    let html = `<table class="w-full"><thead><tr class="bg-[#1E4D2B] text-[#d4b78f]">
        <th class="p-3 text-left">Order ID</th>
        <th class="p-3 text-left">Status</th>
        <th class="p-3 text-left">Date</th>
        <th class="p-3 text-left">Items</th>
    </tr></thead><tbody>`;

    customerOrders.forEach(order => {
        const itemCount = order.items ? order.items.length : 0;
                html += `<tr onclick=\"showOrderDetails('${String(order.id).replace(/'/g, "\\'")}')\" class=\"border-t border-[#6B4423] cursor-pointer hover:bg-[#f8f4eb]\">
            <td class="p-3 font-mono">#${escapeHtml(displayInvoiceNumber(order))}</td>
            <td class="p-3">${order.status || 'Submitted'}</td>
            <td class="p-3 text-sm">${new Date(order.submittedAt).toLocaleDateString()}</td>
            <td class="p-3">${itemCount} item(s)</td>
        </tr>`;
    });

    html += `</tbody></table>`;
    const tableWrapper = document.createElement('div');
    tableWrapper.innerHTML = html;
    container.appendChild(tableWrapper);
}

function isSkippedOpenQuoteStore(row) {
    return false;
}

function formatOpenQuoteAge(iso) {
    if (!iso) return '—';
    const t = new Date(iso).getTime();
    if (isNaN(t)) return '—';
    const mins = Math.round((Date.now() - t) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + ' min ago';
    const hours = Math.round(mins / 60);
    if (hours < 24) return hours + (hours === 1 ? ' hr ago' : ' hr ago');
    const days = Math.round(hours / 24);
    if (days === 1) return 'Yesterday';
    return days + ' days ago';
}

function salesmanLabelForOpenQuote(email) {
    const e = String(email || '').toLowerCase().trim();
    if (!e) return '—';
    const pool = (typeof salesmen !== 'undefined' && Array.isArray(salesmen)) ? salesmen : [];
    const match = pool.find(function (s) {
        return String(s.email || '').toLowerCase().trim() === e;
    });
    if (match) {
        const name = match.name || [match.firstName, match.lastName].filter(Boolean).join(' ');
        if (name) return name;
    }
    return e;
}

function openQuoteLineItemsHtml(items) {
    const list = Array.isArray(items) ? items : [];
    if (!list.length) {
        return '<p class="text-sm text-[#6B4423]">No line items.</p>';
    }
    return '<div class="space-y-1">' + list.map(function (item) {
        const name = escapeHtml(item.product || item.name || '—');
        const qty = item.quantity || 1;
        const cs = escapeHtml(item.caseSize || item.cs || '');
        const market = !!(item.isMarketPrice || String(item.displayPrice || item.price || '').toLowerCase().includes('market'));
        const priceLabel = market
            ? 'Market price'
            : ('$' + (parseFloat(item.unitPrice != null ? item.unitPrice : item.price) || 0).toFixed(2));
        return '<div class="flex flex-wrap justify-between gap-2 text-sm">' +
            '<span>' + name + (cs ? (' <span class="text-[#6B4423]">· ' + cs + '</span>') : '') + '</span>' +
            '<span class="whitespace-nowrap">× ' + escapeHtml(String(qty)) + ' · ' + escapeHtml(priceLabel) + '</span>' +
            '</div>';
    }).join('') + '</div>';
}

function toggleOpenQuoteRow(customerId) {
    const detail = document.getElementById('open-quote-detail-' + customerId);
    if (!detail) return;
    detail.classList.toggle('hidden');
}

function openQuoteStoreLabel(row) {
    return String((row && (row.customer_company || row.customer_name || row.customer_email)) || 'Store').trim();
}

function populateOpenQuotesCustomerSelect(rows) {
    const sel = document.getElementById('open-quotes-customer-select');
    if (!sel) return;
    const previous = sel.value || 'all';
    const seen = {};
    const options = ['<option value="all">All open quotes (master)</option>'];
    (rows || []).slice().sort(function (a, b) {
        return openQuoteStoreLabel(a).toLowerCase().localeCompare(openQuoteStoreLabel(b).toLowerCase());
    }).forEach(function (row) {
        const id = String(row.customer_id || '');
        if (!id || seen[id]) return;
        seen[id] = true;
        const label = openQuoteStoreLabel(row) +
            (row.customer_name && row.customer_company ? (' — ' + row.customer_name) : '');
        options.push('<option value="' + escapeHtml(id) + '">' + escapeHtml(label) + '</option>');
    });
    sel.innerHTML = options.join('');
    if (previous === 'all' || seen[previous]) sel.value = previous;
    else sel.value = 'all';
}

function onOpenQuotesCustomerChange() {
    renderOpenQuotesRows(window._openQuotesRows || []);
}

function renderOpenQuotesRows(allRows) {
    const tbody = document.getElementById('open-quotes-table');
    const countEl = document.getElementById('open-quotes-count');
    const sel = document.getElementById('open-quotes-customer-select');
    if (!tbody) return;
    const filterId = sel && sel.value ? sel.value : 'all';
    const rows = filterId === 'all'
        ? (allRows || [])
        : (allRows || []).filter(function (row) {
            return String(row.customer_id) === String(filterId);
        });
    if (countEl) {
        countEl.textContent = filterId === 'all'
            ? (rows.length + ' open')
            : (rows.length ? '1 store' : '0 open');
    }
    if (!rows.length) {
        tbody.innerHTML = filterId === 'all'
            ? '<tr><td class="p-3 text-[#6B4423]" colspan="6">No open quotes. A store appears here after they add items to a quote.</td></tr>'
            : '<tr><td class="p-3 text-[#6B4423]" colspan="6">This store has no items in a quote right now.</td></tr>';
        return;
    }
    tbody.innerHTML = rows.map(function (row) {
        const id = String(row.customer_id || '');
        const store = escapeHtml(row.customer_company || row.customer_name || '—');
        const contact = escapeHtml(row.customer_name || '—');
        const salesman = escapeHtml(salesmanLabelForOpenQuote(row.salesman_email));
        const itemCount = Number(row.item_count) || (Array.isArray(row.items) ? row.items.length : 0);
        const estimate = '$' + (Number(row.estimated_subtotal) || 0).toFixed(2);
        const age = escapeHtml(formatOpenQuoteAge(row.updated_at));
        const whenFull = row.updated_at ? escapeHtml(new Date(row.updated_at).toLocaleString()) : '';
        const startOpen = filterId !== 'all';
        return (
            '<tr class="border-t border-[#d4b78f] cursor-pointer hover:bg-[#f8f4eb]" onclick="toggleOpenQuoteRow(\'' + id.replace(/'/g, '') + '\')">' +
            '<td class="p-3 font-semibold text-[#1E4D2B]">' + store + '</td>' +
            '<td class="p-3">' + contact + '</td>' +
            '<td class="p-3">' + salesman + '</td>' +
            '<td class="p-3 text-center">' + escapeHtml(String(itemCount)) + '</td>' +
            '<td class="p-3 text-right whitespace-nowrap">' + escapeHtml(estimate) + '</td>' +
            '<td class="p-3" title="' + whenFull + '">' + age + '</td>' +
            '</tr>' +
            '<tr id="open-quote-detail-' + id + '" class="' + (startOpen ? '' : 'hidden ') + 'border-t border-[#d4b78f] bg-[#f8f4eb]">' +
            '<td class="p-3" colspan="6">' +
            '<p class="text-xs font-semibold text-[#6B4423] mb-2">' + escapeHtml(row.customer_email || '') + '</p>' +
            openQuoteLineItemsHtml(row.items) +
            '</td></tr>'
        );
    }).join('');
}

async function loadOpenQuotes() {
    const tbody = document.getElementById('open-quotes-table');
    const countEl = document.getElementById('open-quotes-count');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td class="p-3 text-[#6B4423]" colspan="6">Loading…</td></tr>';
    try {
        const { data, error } = await supabaseClient
            .from('customer_open_quotes')
            .select('customer_id, customer_email, customer_name, customer_company, salesman_email, items, item_count, estimated_subtotal, updated_at')
            .order('updated_at', { ascending: false });
        if (error) throw error;
        const rows = (data || []).filter(function (row) {
            return !isSkippedOpenQuoteStore(row);
        });
        window._openQuotesRows = rows;
        populateOpenQuotesCustomerSelect(rows);
        renderOpenQuotesRows(rows);
    } catch (err) {
        window._openQuotesRows = [];
        if (countEl) countEl.textContent = '0 open';
        tbody.innerHTML = '<tr><td class="p-3 text-red-700" colspan="6">Could not load open quotes.<br>' +
            escapeHtml(err.message || '') + '</td></tr>';
    }
}

function clearOrdersSearch() {
    const input = document.getElementById('orders-search');
    if (input) {
        input.value = '';
        renderOrdersTable();
    }
    updateOrdersSearchClearButton();
}

function updateOrdersSearchClearButton() {
    const input = document.getElementById('orders-search');
    const clearBtn = document.getElementById('orders-search-clear');
    if (!input || !clearBtn) return;

    if (input.value.trim() !== '') {
        clearBtn.classList.remove('hidden');
    } else {
        clearBtn.classList.add('hidden');
    }
}

window.filterOrdersByStatus = filterOrdersByStatus;
window.createOrderRow = createOrderRow;
window.showAllOrders = showAllOrders;
window.showBackOrders = showBackOrders;
window.loadBackOrders = loadBackOrders;
window.updateBackOrdersBadge = updateBackOrdersBadge;
window.renderBackOrdersTable = renderBackOrdersTable;
window.toggleBackOrderExpand = toggleBackOrderExpand;
window.fulfillBackOrderGroup = fulfillBackOrderGroup;
window.openShipInvoiceForBackOrder = openShipInvoiceForBackOrder;
window.confirmBackOrderFulfillFromShipModal = confirmBackOrderFulfillFromShipModal;
window.openBackOrderFulfillInvoice = openBackOrderFulfillInvoice;
window.filterOrdersByCustomer = filterOrdersByCustomer;
window.isSkippedOpenQuoteStore = isSkippedOpenQuoteStore;
window.formatOpenQuoteAge = formatOpenQuoteAge;
window.salesmanLabelForOpenQuote = salesmanLabelForOpenQuote;
window.openQuoteLineItemsHtml = openQuoteLineItemsHtml;
window.toggleOpenQuoteRow = toggleOpenQuoteRow;
window.openQuoteStoreLabel = openQuoteStoreLabel;
window.populateOpenQuotesCustomerSelect = populateOpenQuotesCustomerSelect;
window.onOpenQuotesCustomerChange = onOpenQuotesCustomerChange;
window.renderOpenQuotesRows = renderOpenQuotesRows;
window.loadOpenQuotes = loadOpenQuotes;
window.clearOrdersSearch = clearOrdersSearch;
window.updateOrdersSearchClearButton = updateOrdersSearchClearButton;
