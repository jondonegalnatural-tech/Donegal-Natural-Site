// Wholesale portal — quotes, order history, back orders, and invoices.
let customerBackOrders = [];

let _quotesStoreFilter = 'all';

let _ordersStoreFilter = 'all';

async function loadMyQuotes() {
    const container = document.getElementById('section-quotes');
    if (!container) return;

    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!user) {
        container.innerHTML = `
            <h2 class="text-2xl font-bold brand-green mb-6">My Quote Requests</h2>
            <div class="bg-white border-2 border-[#6B4423] rounded-2xl p-8 text-center">
                <p class="text-[#6B4423]">Please log in to see your quotes.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <h2 class="text-2xl font-bold brand-green mb-6">My Quote Requests</h2>
        <p class="text-sm text-[#6B4423]">Loading…</p>
    `;

    try {
        const email = (user.email || '').toLowerCase().trim();

        const { data, error } = await supabaseClient
            .from('orders')
            .select('*')
            .eq('source', 'wholesale')
            .eq('customer_email', email)
            .order('submitted_at', { ascending: false });

        if (error) throw error;

        // My Quotes = unpaid and not denied
        const active = (data || []).filter(order => {
            const p = (order.payment_status || '').toLowerCase();
            const s = (order.status || '').toLowerCase();
            return p !== 'paid' && s !== 'denied';
        });
                window._myQuotesCache = active;

                // Ensure back orders available for nested fulfilled rows
                if (!customerBackOrders || customerBackOrders.length === 0) {
                    await loadCustomerBackOrders();
                }

        // Apply store filter
        let filtered = active;
        if (_quotesStoreFilter !== 'all') {
            filtered = active.filter(o => String(o.customer_id) === String(_quotesStoreFilter));
        }

        if (filtered.length === 0) {
            const tabsHtml = buildStoreTabs('quotes', _quotesStoreFilter, 'switchQuotesStoreFilter');
            container.innerHTML = `
                <h2 class="text-2xl font-bold brand-green mb-4">My Quote Requests</h2>
                ${tabsHtml}
                <div class="bg-white border-2 border-[#6B4423] rounded-2xl p-8 text-center">
                    <p class="text-[#6B4423]">No open quotes for this store.</p>
                </div>
            `;
            return;
        }

        const tabsHtml = buildStoreTabs('quotes', _quotesStoreFilter, 'switchQuotesStoreFilter');
        let html = `<h2 class="text-2xl font-bold brand-green mb-4">My Quote Requests</h2>${tabsHtml}`;

        active.forEach(quote => {
            const date = new Date(quote.submitted_at).toLocaleDateString();
            const items = quote.items || [];
            const itemCount = items.length;
            const status = (quote.status || 'submitted').toLowerCase();

            let total = 0;
            items.forEach(item => {
                if (item.isMarketPrice) return;
                const price = parseFloat(item.unitPrice) || 0;
                const qty = parseInt(item.quantity, 10) || 0;
                total += price * qty;
            });

            const totalDisplay = total > 0
                ? '$' + total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : 'Market Price items only';

            let badgeClass = 'bg-gray-100 text-gray-700';
            let badgeText = quote.status || 'Unknown';
            let statusMessage = '';

            if (status === 'submitted' || status === 'pending' || status === '') {
                badgeClass = 'bg-orange-100 text-orange-700';
                badgeText = 'Submitted';
                statusMessage = 'Waiting for review by our team.';
            } else if (status === 'received') {
                badgeClass = 'bg-blue-100 text-blue-700';
                badgeText = 'Accepted';
                statusMessage = 'Your quote has been accepted. Pricing is confirmed.';
            } else if (status === 'processing') {
                badgeClass = 'bg-blue-100 text-blue-800';
                badgeText = 'Processing';
                statusMessage = 'Your order is being prepared.';
            } else if (status === 'denied') {
                badgeClass = 'bg-red-100 text-red-700';
                badgeText = 'Denied';
                statusMessage = 'This quote was not approved.';
            }

            html += `
                <div class="bg-white border-2 border-[#6B4423] rounded-2xl p-6 mb-4 cursor-pointer hover:shadow-md transition"
                     onclick='showBrandedInvoice(${JSON.stringify(quote).replace(/'/g, "&#39;")})'>
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <p class="font-bold text-lg brand-green">Quote ${getStoreBadgeForOrder(quote)}</p>
                            <p class="text-xs text-[#6B4423]">${escapeHtml(displayInvoiceNumber(quote))}</p>
                            <p class="text-sm text-[#6B4423]">Submitted: ${date}</p>
                        </div>
                        <span class="px-3 py-1 text-xs font-semibold rounded-full ${badgeClass}">
                            ${badgeText}
                        </span>
                    </div>

                    ${statusMessage ? `<p class="text-sm text-[#6B4423] mb-3">${statusMessage}</p>` : ''}

                    <p class="text-sm text-[#6B4423] mb-2">${itemCount} item(s)</p>

                    
                    <ul class="text-sm space-y-1 mb-4">
                        ${items.map(item => `
                            <li class="flex justify-between">
                                <span>• ${escapeHtml(orderLineDisplayName(item))} × ${item.quantity}</span>
                                <span class="text-[#6B4423]">${item.displayPrice || ''}</span>
                            </li>
                        `).join('')}
                        ${(() => {
                            const fulfilledBOs = (customerBackOrders || []).filter(b =>
                                false && (b.status || '').toLowerCase() === 'fulfilled' &&
                                (String(b.original_order_id) === String(quote.id) ||
                                 String(b.invoice_number) === String(quote.id))
                            );
                            if (!fulfilledBOs.length) return '';
                            return `
                                <li class="pt-2 mt-1 border-t border-[#e8d9c2]">
                                    <p class="text-xs font-semibold text-green-800 mb-1">Back Order Fulfillment</p>
                                    ${fulfilledBOs.map(b => `
                                        <div class="flex justify-between text-green-800">
                                            <span>• ${b.product_name || '—'} × ${b.quantity || 1}
                                                <span class="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-green-100 text-green-800">BO Fulfilled</span>
                                            </span>
                                            <span>${b.display_price || (b.unit_price != null ? ('$' + Number(b.unit_price).toFixed(2)) : '')}</span>
                                        </div>
                                    `).join('')}
                                </li>
                            `;
                        })()}
                    </ul>

                    <div class="border-t border-[#d4b78f] pt-3 flex justify-between items-center mb-3">
                        <span class="font-semibold brand-green">Quote Total</span>
                        <span class="text-xl font-bold brand-green">${totalDisplay}</span>
                    </div>

                    ${(() => {
                        if (total <= 0) return '';
                        const accounts = window._customerAccounts || [];
                        const quoteCust = accounts.find(c => String(c.id) === String(quote.customer_id)) || window._currentCustomer;
                        const loc = quoteCust
                            ? [quoteCust.shipping_address, quoteCust.billing_address, quoteCust.territory].filter(Boolean).join(' ').toUpperCase()
                            : getCustomerLocationText();
                        const fs = evaluateFreeShipping(total, loc || '');
                        if (fs.free) {
                            return `
                            <div class="mb-3 px-3 py-2 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs font-semibold">
                                ✓ Free shipping qualified — ${fs.reason}
                            </div>`;
                        }
                        if (fs.half) {
                            return `
                            <div class="mb-3 px-3 py-2 rounded-xl bg-[#f8f4eb] border border-[#d4b78f] text-[#6B4423] text-xs font-semibold">
                                ✓ Half freight qualified — ${fs.reason}
                            </div>`;
                        }
                        return '';
                    })()}

                    ${(() => {
                        const pStatus = (quote.payment_status || '').toLowerCase();
                        const method = (quote.payment_method_type || '').toLowerCase();
                        const isAchPending = pStatus !== 'paid' && (method === 'us_bank_account' || method === 'customer_balance');
                        const isDenied = status === 'denied';
                        const canEdit = status === 'submitted' || status === 'pending' || status === '';

                        if (isDenied) return '';

                        let editBtn = '';
                        if (canEdit) {
                            editBtn = `
                            <button onclick="event.stopPropagation(); openEditQuoteModal('${quote.id}')"
                                    class="w-full mb-2 border-2 border-[#6B4423] text-[#1E4D2B] font-semibold py-2.5 rounded-xl hover:bg-[#f8f4eb]">
                                Edit / Add Items
                            </button>`;
                        }

                        if (pStatus === 'paid') {
                            return editBtn + `
                            <div class="w-full bg-green-100 text-green-800 font-semibold py-3 rounded-xl text-center">
                                Paid ✓
                            </div>`;
                        }
                        if (isAchPending) {
                            return editBtn + `
                            <div class="w-full bg-blue-50 border border-blue-200 text-blue-800 font-semibold py-3 rounded-xl text-center text-sm">
                                ACH Processing<br>
                                <span class="font-normal text-xs">Typically clears in 3–5 business days</span>
                            </div>`;
                        }
                        if (!quote.invoice_ready_at) {
                            return editBtn + `
                            <div class="w-full bg-[#f8f4eb] border border-[#d4b78f] text-[#6B4423] font-semibold py-3 rounded-xl text-center text-sm">
                                Awaiting invoice from Donegal.
                            </div>`;
                        }
                        return editBtn;
                    })()}
                </div>
            `;
        });

        container.innerHTML = html;
    } catch (err) {
        console.error(err);
        container.innerHTML = `
            <h2 class="text-2xl font-bold brand-green mb-6">My Quote Requests</h2>
            <p class="text-sm text-red-600">Could not load quotes.</p>
        `;
    }
}

function switchQuotesStoreFilter(id) {
    _quotesStoreFilter = id;
    loadMyQuotes();
}

async function loadOrderHistory() {
    const container = document.getElementById('section-orders');
    if (!container) return;

    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!user) {
        container.innerHTML = `
            <h2 class="text-2xl font-bold brand-green mb-6">Order History</h2>
            <div class="bg-white border-2 border-[#6B4423] rounded-2xl p-8 text-center">
                <p class="text-[#6B4423]">Please log in to see your orders.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <h2 class="text-2xl font-bold brand-green mb-6">Order History</h2>
        <p class="text-sm text-[#6B4423]">Loading…</p>
    `;

    try {
        const email = (user.email || '').toLowerCase().trim();

        const { data, error } = await supabaseClient
            .from('orders')
            .select('*')
            .eq('source', 'wholesale')
            .eq('customer_email', email)
            .order('submitted_at', { ascending: false });

        if (error) throw error;

        // Phase 1: Order History shows all orders (status/payment UI hidden)
        const completed = data || [];

                // Cache for search + click-to-invoice
        window._orderHistoryCache = completed;
                // Ensure back orders are available for nested fulfilled rows
        if (!customerBackOrders || customerBackOrders.length === 0) {
            await loadCustomerBackOrders();
        }

        // Apply store filter
        let filtered = completed;
        if (_ordersStoreFilter !== 'all') {
            filtered = completed.filter(o => String(o.customer_id) === String(_ordersStoreFilter));
        }

        if (filtered.length === 0) {
            const tabsHtml = buildStoreTabs('orders', _ordersStoreFilter, 'switchOrdersStoreFilter');
            container.innerHTML = `
                <h2 class="text-2xl font-bold brand-green mb-4">Order History</h2>
                ${tabsHtml}
                <div class="bg-white border-2 border-[#6B4423] rounded-2xl p-8 text-center">
                          <p class="text-[#6B4423]">No orders yet for this store.</p>              <p class="text-[#6B4423]">No paid or denied orders for this store.</p>
                </div>
            `;
            return;
        }

        const tabsHtml = buildStoreTabs('orders', _ordersStoreFilter, 'switchOrdersStoreFilter');
        let html = `
            <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 class="text-2xl font-bold brand-green">Order History</h2>
                <input type="text" id="order-history-search"
                       placeholder="Search invoice #, product, amount…"
                       class="border-2 border-[#6B4423] rounded-xl px-4 py-2 text-sm w-full sm:w-72"
                       oninput="filterOrderHistory()">
            </div>
            ${tabsHtml}
            <div id="order-history-list">
        `;

        filtered.forEach(order => {
            const date = new Date(order.submitted_at).toLocaleDateString();
            const status = (order.status || '').toLowerCase();
            const items = order.items || [];

            let subtotal = 0;
            items.forEach(item => {
                const price = parseFloat(item.unitPrice) || 0;
                const qty = parseInt(item.quantity, 10) || 0;
                subtotal += price * qty;
            });

            const shipping = parseFloat(order.shipping_cost) || 0;
            const finalTotal = subtotal + shipping;

            let badgeClass = 'bg-gray-100 text-gray-700';
            let badgeText = status || 'Unknown';

            if (status === 'denied') {
                badgeClass = 'bg-red-100 text-red-700';
                badgeText = 'Denied';
            } else if (status === 'shipped') {
                badgeClass = 'bg-purple-100 text-purple-800';
                badgeText = 'Shipped';
            } else if (status === 'delivered') {
                badgeClass = 'bg-green-100 text-green-700';
                badgeText = 'Delivered';
            } else if (status === 'processing' || (order.payment_status || '').toLowerCase() === 'paid') {
                badgeClass = 'bg-blue-100 text-blue-800';
                badgeText = 'Paid';
            }

            html += `
                <div class="bg-white border-2 border-[#6B4423] rounded-2xl p-6 mb-4 cursor-pointer hover:shadow-md transition"
                     onclick="openOrderHistoryInvoice('${order.id}')">
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <p class="font-bold text-lg brand-green">Invoice ${getStoreBadgeForOrder(order)}</p>
                            <p class="text-xs text-[#6B4423]">${escapeHtml(displayInvoiceNumber(order))}</p>
                            <p class="text-sm text-[#6B4423]">Order Date: ${date}</p>
                            ${(order.tracking_number || '').trim() ? `
                            <p class="text-sm text-[#6B4423] mt-1">
                                <span class="font-semibold">${order.carrier || 'UPS'}:</span>
                                <a href="https://www.ups.com/track?tracknum=${encodeURIComponent(String(order.tracking_number).trim())}"
                                   target="_blank" rel="noopener"
                                   onclick="event.stopPropagation()"
                                   class="font-mono text-[#1E4D2B] underline hover:text-[#254a2f]">
                                    ${String(order.tracking_number).trim()}
                                </a>
                            </p>` : ''}
                        </div>
                        ${'' /* Phase 1: status badge hidden */}
                    </div>

                    <ul class="text-sm space-y-1 mb-4">
                        ${items.map(item => `
                            <li class="flex justify-between">
                                <span>• ${escapeHtml(orderLineDisplayName(item))} × ${item.quantity}</span>
                                <span class="text-[#6B4423]">${item.displayPrice || ('$' + (parseFloat(item.unitPrice) || 0).toFixed(2))}</span>
                            </li>
                        `).join('')}
                        ${(() => {
                            const fulfilledBOs = (customerBackOrders || []).filter(b =>
                                false && (b.status || '').toLowerCase() === 'fulfilled' &&
                                (String(b.original_order_id) === String(order.id) ||
                                 String(b.invoice_number) === String(order.id))
                            );
                            if (!fulfilledBOs.length) return '';
                            return `
                                <li class="pt-2 mt-1 border-t border-[#e8d9c2]">
                                    <p class="text-xs font-semibold text-green-800 mb-1">Back Order Fulfillment</p>
                                    ${fulfilledBOs.map(b => `
                                        <div class="flex justify-between text-green-800">
                                            <span>• ${b.product_name || '—'} × ${b.quantity || 1}
                                                <span class="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-green-100 text-green-800">BO Fulfilled</span>
                                            </span>
                                            <span>${b.display_price || (b.unit_price != null ? ('$' + Number(b.unit_price).toFixed(2)) : '')}</span>
                                        </div>
                                    `).join('')}
                                </li>
                            `;
                        })()}
                    </ul>

                    <div class="border-t border-[#d4b78f] pt-3 space-y-1 text-sm mb-4">
                        <div class="flex justify-between">
                            <span class="text-[#6B4423]">Subtotal</span>
                            <span>$${subtotal.toFixed(2)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-[#6B4423]">Shipping</span>
                            <span>${shipping > 0 ? '$' + shipping.toFixed(2) : 'TBD'}</span>
                        </div>
                        <div class="flex justify-between font-bold text-lg brand-green pt-2">
                            <span>Final Total</span>
                            <span>$${finalTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    ${'' /* Phase 1: payment UI hidden */}
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    } catch (err) {
        console.error(err);
        container.innerHTML = `
            <h2 class="text-2xl font-bold brand-green mb-6">Order History</h2>
            <p class="text-sm text-red-600">Could not load order history.</p>
        `;
    }
}

function switchOrdersStoreFilter(id) {
    _ordersStoreFilter = id;
    loadOrderHistory();
}

async function loadCustomerBackOrders() {
    const container = document.getElementById('customer-back-orders');
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!user || !user.email) {
        customerBackOrders = [];
        if (container) {
            container.innerHTML = `<p class="text-xs text-[#6B4423]">Sign in to see back orders.</p>`;
        }
        return;
    }

    const email = (user.email || '').toLowerCase().trim();

    try {
        const { data, error } = await supabaseClient
            .from('back_orders')
            .select('*')
            .ilike('customer_email', email)
            .order('created_at', { ascending: false });

        if (error) throw error;
        customerBackOrders = data || [];
    } catch (err) {
        console.error('loadCustomerBackOrders error:', err);
        customerBackOrders = [];
    }

    renderCustomerBackOrdersSidebar();
}

function renderCustomerBackOrdersSidebar() {
    const container = document.getElementById('customer-back-orders');
    if (!container) return;

    // Sidebar = pending only
    const pending = (customerBackOrders || []).filter(b =>
        (b.status || '').toLowerCase() === 'pending'
    );

    if (pending.length === 0) {
        container.innerHTML = `<p class="text-xs text-[#6B4423]">No items currently on back order.</p>`;
        return;
    }

    // Group by invoice
    const groups = {};
    pending.forEach(b => {
        const key = String(b.invoice_number || b.original_order_id || b.id);
        if (!groups[key]) {
            groups[key] = {
                invoice: b.invoice_number || String(b.original_order_id || ''),
                items: []
            };
        }
        groups[key].items.push(b);
    });

    let html = '';
    Object.values(groups).forEach(g => {
        const shortInv = String(g.invoice || '').slice(0, 8);
        html += `
            <div class="mb-3 last:mb-0">
                <p class="text-xs font-semibold text-[#1E4D2B] mb-1">Invoice #${shortInv}</p>
                <ul class="space-y-1">
                    ${g.items.map(item => `
                        <li class="text-xs leading-snug">
                            <span class="font-medium">${escapeHtml(item.product_name || '—')}</span>
                            <span class="text-[#6B4423]"> × ${item.quantity || 1}</span>
                            ${item.case_size ? `<span class="text-[#6B4423]"> · ${item.case_size}</span>` : ''}
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    });

    html += `
        <p class="text-[10px] text-[#6B4423] mt-2 leading-snug border-t border-[#d4b78f] pt-2">
            These items will ship once stock is available. Fulfilled back orders also appear under Order History.
        </p>
    `;
    container.innerHTML = html;
}

function openOrderHistoryInvoice(orderId) {
    const order = (window._orderHistoryCache || []).find(o => o.id === orderId);
    if (!order) return;
    showBrandedInvoice(order);
}

function openMyQuoteInvoice(orderId) {
    const order = (window._myQuotesCache || []).find(o => o.id === orderId);
    if (!order) return;
    showBrandedInvoice(order);
}

function filterOrderHistory() {
    const term = (document.getElementById('order-history-search')?.value || '').toLowerCase().trim();
    const list = document.getElementById('order-history-list');
    if (!list) return;

    const all = window._orderHistoryCache || [];
    const filtered = !term ? all : all.filter(order => {
        const id = String(order.id || '').toLowerCase();
        const itemsText = (order.items || []).map(i => (i.product || i.name || '')).join(' ').toLowerCase();
        let sub = 0;
        (order.items || []).forEach(item => {
            const price = parseFloat(item.unitPrice) || 0;
            const qty = parseInt(item.quantity, 10) || 0;
            sub += price * qty;
        });
        const shipping = parseFloat(order.shipping_cost) || 0;
        const totalStr = (sub + shipping).toFixed(2);
        return id.includes(term) || itemsText.includes(term) || totalStr.includes(term);
    });

    if (filtered.length === 0) {
        list.innerHTML = `<div class="bg-white border-2 border-[#6B4423] rounded-2xl p-8 text-center"><p class="text-[#6B4423]">No orders match your search.</p></div>`;
        return;
    }
    renderOrderHistoryCards(filtered, list);
}

function renderOrderHistoryCards(orders, listEl) {
    let html = '';
    orders.forEach(order => {
        const date = new Date(order.submitted_at).toLocaleDateString();
        const status = (order.status || '').toLowerCase();
        const items = order.items || [];
        let subtotal = 0;
        items.forEach(item => {
            const price = parseFloat(item.unitPrice) || 0;
            const qty = parseInt(item.quantity, 10) || 0;
            subtotal += price * qty;
        });
        const shipping = parseFloat(order.shipping_cost) || 0;
        const finalTotal = subtotal + shipping;

        // Phase 1: status badge hidden
        let badgeClass = '';
        let badgeText = '';

        const pStatus = (order.payment_status || '').toLowerCase();
        const method = (order.payment_method_type || '').toLowerCase();
        const isAchPending = pStatus !== 'paid' && (method === 'us_bank_account' || method === 'customer_balance');
                let payBlock = ''; // Phase 1: payment UI hidden

        html += `
            <div class="bg-white border-2 border-[#6B4423] rounded-2xl p-6 mb-4 cursor-pointer hover:shadow-md transition"
                 onclick="openOrderHistoryInvoice('${order.id}')">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <p class="font-bold text-lg brand-green">Invoice</p>
                        <p class="text-xs text-[#6B4423]">${escapeHtml(displayInvoiceNumber(order))}</p>
                        <p class="text-sm text-[#6B4423]">Order Date: ${date}</p>
                        ${(order.tracking_number || '').trim() ? `
                        <p class="text-sm text-[#6B4423] mt-1">
                            <span class="font-semibold">${order.carrier || 'UPS'}:</span>
                            <a href="https://www.ups.com/track?tracknum=${encodeURIComponent(String(order.tracking_number).trim())}"
                               target="_blank" rel="noopener"
                               onclick="event.stopPropagation()"
                               class="font-mono text-[#1E4D2B] underline hover:text-[#254a2f]">
                                ${String(order.tracking_number).trim()}
                            </a>
                        </p>` : ''}
                    </div>
                    <span class="px-3 py-1 text-xs font-semibold rounded-full ${badgeClass}">${badgeText}</span>
                </div>
                <ul class="text-sm space-y-1 mb-4">
                    ${items.map(item => `
                        <li class="flex justify-between">
                            <span>• ${escapeHtml(orderLineDisplayName(item))} × ${item.quantity}</span>
                            <span class="text-[#6B4423]">${item.displayPrice || ('$' + (parseFloat(item.unitPrice) || 0).toFixed(2))}</span>
                        </li>
                    `).join('')}
                    ${(() => {
                        const fulfilledBOs = (customerBackOrders || []).filter(b =>
                            false && (b.status || '').toLowerCase() === 'fulfilled' &&
                            (String(b.original_order_id) === String(order.id) ||
                             String(b.invoice_number) === String(order.id))
                        );
                        if (!fulfilledBOs.length) return '';
                        return `
                            <li class="pt-2 mt-1 border-t border-[#e8d9c2]">
                                <p class="text-xs font-semibold text-green-800 mb-1">Back Order Fulfillment</p>
                                ${fulfilledBOs.map(b => `
                                    <div class="flex justify-between text-green-800">
                                        <span>• ${b.product_name || '—'} × ${b.quantity || 1}
                                            <span class="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-green-100 text-green-800">BO Fulfilled</span>
                                        </span>
                                        <span>${b.display_price || (b.unit_price != null ? ('$' + Number(b.unit_price).toFixed(2)) : '')}</span>
                                    </div>
                                `).join('')}
                            </li>
                        `;
                    })()}
                </ul>
                <div class="border-t border-[#d4b78f] pt-3 space-y-1 text-sm mb-4">
                    <div class="flex justify-between"><span class="text-[#6B4423]">Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
                    <div class="flex justify-between"><span class="text-[#6B4423]">Shipping</span><span>${shipping > 0 ? '$' + shipping.toFixed(2) : 'TBD'}</span></div>
                    <div class="flex justify-between font-bold text-lg brand-green pt-2"><span>Final Total</span><span>$${finalTotal.toFixed(2)}</span></div>
                </div>
                ${payBlock}
            </div>
        `;
    });
    listEl.innerHTML = html;
}

function updateMyQuotesBadge(count) {
    const n = Number(count) || 0;
    const ids = ['my-quotes-badge', 'my-quotes-badge-mobile'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (n > 0) {
            el.textContent = String(n);
            el.classList.remove('hidden');
        } else {
            el.textContent = '';
            el.classList.add('hidden');
        }
    });
}

async function refreshMyQuotesBadge() {
    try {
        const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (!user || !user.email) {
            updateMyQuotesBadge(0);
            return;
        }
        const email = (user.email || '').toLowerCase().trim();
        const { data, error } = await supabaseClient
            .from('orders')
            .select('id, payment_status, status')
            .eq('source', 'wholesale')
            .eq('customer_email', email);
        if (error) throw error;
        const unpaid = (data || []).filter(o => {
            const p = (o.payment_status || '').toLowerCase();
            const s = (o.status || '').toLowerCase();
            return p !== 'paid' && s !== 'denied';
        });
        updateMyQuotesBadge(unpaid.length);
    } catch (err) {
        console.error('refreshMyQuotesBadge error:', err);
        updateMyQuotesBadge(0);
    }
}

function updateOrderHistoryBadge(count) {
    const n = Number(count) || 0;
    const ids = ['order-history-badge', 'order-history-badge-mobile'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (n > 0) {
            el.textContent = String(n);
            el.classList.remove('hidden');
        } else {
            el.textContent = '';
            el.classList.add('hidden');
        }
    });
}

async function refreshOrderHistoryBadge() {
    try {
        const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (!user || !user.email) {
            updateOrderHistoryBadge(0);
            return;
        }
        const email = (user.email || '').toLowerCase().trim();
        const lastViewed = localStorage.getItem('orderHistoryLastViewed');
        const lastViewedMs = lastViewed ? new Date(lastViewed).getTime() : 0;

        const { data, error } = await supabaseClient
            .from('orders')
            .select('id, status, payment_status, paid_at, submitted_at')
            .eq('source', 'wholesale')
            .eq('customer_email', email);
        if (error) throw error;

        // Badge = newly paid orders since last time customer opened Order History
        const newCompleted = (data || []).filter(o => {
            const p = (o.payment_status || '').toLowerCase();
            if (p !== 'paid') return false;
            const ts = new Date(o.paid_at || o.submitted_at || 0).getTime();
            return ts > lastViewedMs;
        });
        updateOrderHistoryBadge(newCompleted.length);
    } catch (err) {
        console.error('refreshOrderHistoryBadge error:', err);
        updateOrderHistoryBadge(0);
    }
}

function markOrderHistoryViewed() {
    localStorage.setItem('orderHistoryLastViewed', new Date().toISOString());
    updateOrderHistoryBadge(0);
}

function showBrandedInvoice(order) {
    // Remove any existing invoice modal
    document.getElementById('branded-invoice-modal')?.remove();

    let subtotal = 0;
    (order.items || []).forEach(item => {
        const price = parseFloat(item.unitPrice) || 0;
        const qty = parseInt(item.quantity, 10) || 0;
        subtotal += price * qty;
    });
    const shipping = parseFloat(order.shipping_cost) || 0;
    const credit = parseFloat(order.credit) || 0;
    const total = subtotal + shipping - credit;

    const modal = document.createElement('div');
    modal.id = 'branded-invoice-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <!-- Header -->
            <div class="bg-[#1E4D2B] text-[#d4b78f] p-6 rounded-t-2xl flex justify-between items-start">
                <div class="flex items-center gap-3">
                    <img src="media/logo.png" alt="Donegal Natural" class="h-12 w-auto bg-white rounded-lg p-1">
                    <div>
                        <h2 class="text-2xl font-bold">PRO FORMA INVOICE</h2>
                        <p class="text-sm opacity-90">Donegal Natural Dog Treats</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <button type="button"
                            onclick="window.print()"
                            class="text-sm font-semibold border border-[#d4b78f] text-[#d4b78f] px-3 py-1.5 rounded-lg hover:bg-[#254a2f] print:hidden">
                        Print
                    </button>
                    <button onclick="document.getElementById('branded-invoice-modal').remove()" 
                            class="text-2xl hover:text-white leading-none print:hidden">&times;</button>
                </div>
            </div>

            <div class="p-6 space-y-6">
                <!-- Invoice meta -->
                <div class="flex flex-wrap justify-between gap-4 text-sm">
                    <div>
                        <p class="text-[#6B4423] font-semibold">Pro Forma #</p>
                        <p class="font-mono text-xs break-all">${escapeHtml(displayInvoiceNumber(order))}</p>
                    </div>
                    <div>
                        <p class="text-[#6B4423] font-semibold">Date</p>
                        <p>${new Date(order.submitted_at || order.created_at || Date.now()).toLocaleDateString()}</p>
                    </div>
                    ${'' /* Phase 1: status hidden on pro forma */}
                    ${(order.tracking_number || '').trim() ? `
                    <div>
                        <p class="text-[#6B4423] font-semibold">${order.carrier || 'UPS'} Tracking</p>
                        <a href="https://www.ups.com/track?tracknum=${encodeURIComponent(String(order.tracking_number).trim())}"
                           target="_blank" rel="noopener"
                           class="font-mono text-sm text-[#1E4D2B] underline hover:text-[#254a2f]">
                            ${String(order.tracking_number).trim()}
                        </a>
                    </div>` : ''}
                </div>

                <!-- Bill To / Ship To -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-[#f8f4eb] border border-[#d4b78f] rounded-xl p-4">
                        <p class="text-xs font-semibold text-[#6B4423] mb-1">BILL TO</p>
                        <p class="font-semibold text-[#1E4D2B]">${escapeHtml(order.customer_name || '—')}</p>
                        <p class="text-sm text-[#6B4423]">${escapeHtml(order.customer_company && String(order.customer_company).toLowerCase() !== String(order.customer_name || '').toLowerCase() ? order.customer_company : '')}</p>
                        <p class="text-sm text-[#6B4423]">${escapeHtml((typeof formatPhoneDisplay === 'function' && (window._currentCustomer && window._currentCustomer.phone)) ? formatPhoneDisplay(window._currentCustomer.phone) : ((window._currentCustomer && window._currentCustomer.phone) || ''))}</p>
                        <p class="text-sm text-[#6B4423]">${escapeHtml((window._currentCustomer && (window._currentCustomer.billing_address || window._currentCustomer.billingAddress)) || '')}</p>
                    </div>
                    <div class="bg-[#f8f4eb] border border-[#d4b78f] rounded-xl p-4">
                        <p class="text-xs font-semibold text-[#6B4423] mb-1">SHIP TO</p>
                        <p class="font-semibold text-[#1E4D2B]">${escapeHtml(order.customer_name || '—')}</p>
                        <p class="text-sm text-[#6B4423]">${escapeHtml(order.customer_company && String(order.customer_company).toLowerCase() !== String(order.customer_name || '').toLowerCase() ? order.customer_company : '')}</p>
                        <p class="text-sm text-[#6B4423]">${escapeHtml((window._currentCustomer && (window._currentCustomer.shipping_address || window._currentCustomer.shippingAddress)) || '')}</p>
                    </div>
                </div>

                <!-- Line items -->
                <div>
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b-2 border-[#6B4423] text-left">
                                <th class="py-2 font-semibold text-[#1E4D2B]">Item</th>
                                <th class="py-2 font-semibold text-[#1E4D2B] text-center">Qty</th>
                                <th class="py-2 font-semibold text-[#1E4D2B] text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(order.items || []).map(item => {
                                const price = parseFloat(item.unitPrice) || 0;
                                const qty = parseInt(item.quantity, 10) || 0;
                                const lineTotal = price * qty;
                                return `
                                    <tr class="border-b border-[#e8d9c2]">
                                        <td class="py-3 text-[#1E4D2B]">${escapeHtml(orderLineDisplayName(item))}${item.isMarketPrice ? '<p class="text-[11px] text-[#c56134] mt-1">' + MARKET_PRICE_DISCLAIMER + '</p>' : ''}</td>
                                        <td class="py-3 text-center text-[#6B4423]">${qty}</td>
                                        <td class="py-3 text-right font-medium">$${lineTotal.toFixed(2)}</td>
                                    </tr>
                                `;
                            }).join('')}
                            ${(() => {
                                const fulfilledBOs = (customerBackOrders || []).filter(b =>
                                    false && (b.status || '').toLowerCase() === 'fulfilled' &&
                                    (String(b.original_order_id) === String(order.id) ||
                                     String(b.invoice_number) === String(order.id))
                                );
                                if (!fulfilledBOs.length) return '';
                                return fulfilledBOs.map(b => {
                                    const price = parseFloat(b.unit_price) || 0;
                                    const qty = parseInt(b.quantity, 10) || 0;
                                    const lineTotal = price * qty;
                                    return `
                                        <tr class="border-b border-[#e8d9c2] bg-green-50">
                                            <td class="py-3 text-green-800">
                                                ${escapeHtml(b.product_name || '—')}
                                                <span class="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-green-100 text-green-800">BO Fulfilled</span>
                                            </td>
                                            <td class="py-3 text-center text-green-800">${qty}</td>
                                            <td class="py-3 text-right font-medium text-green-800">$${lineTotal.toFixed(2)}</td>
                                        </tr>
                                    `;
                                }).join('');
                            })()}
                        </tbody>
                    </table>
                </div>

                <!-- Totals -->
                <div class="border-t-2 border-[#6B4423] pt-4 space-y-1 text-sm max-w-xs ml-auto">
                    <div class="flex justify-between">
                        <span class="text-[#6B4423]">Subtotal</span>
                        <span>$${subtotal.toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-[#6B4423]">Shipping</span>
                        <span>${shipping > 0 ? '$' + shipping.toFixed(2) : '—'}</span>
                    </div>
                    ${credit > 0 ? `
                    <div class="flex justify-between text-green-700">
                        <span>Credit</span>
                        <span>-$${credit.toFixed(2)}</span>
                    </div>` : ''}
                    <div class="flex justify-between font-bold text-lg brand-green pt-2 border-t border-[#d4b78f] mt-2">
                        <span>Total Due</span>
                        <span>$${total.toFixed(2)}</span>
                    </div>
                </div>

                <div class="text-center text-xs text-[#6B4423] pt-4 border-t border-[#e8d9c2]">
                    Thank you                     This is a pro forma invoice · Final invoice will be issued through QuickBooksfor your business · Terms: Net 10 days
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

window.loadMyQuotes = loadMyQuotes;
window.switchQuotesStoreFilter = switchQuotesStoreFilter;
window.loadOrderHistory = loadOrderHistory;
window.switchOrdersStoreFilter = switchOrdersStoreFilter;
window.loadCustomerBackOrders = loadCustomerBackOrders;
window.renderCustomerBackOrdersSidebar = renderCustomerBackOrdersSidebar;
window.openOrderHistoryInvoice = openOrderHistoryInvoice;
window.openMyQuoteInvoice = openMyQuoteInvoice;
window.filterOrderHistory = filterOrderHistory;
window.renderOrderHistoryCards = renderOrderHistoryCards;
window.updateMyQuotesBadge = updateMyQuotesBadge;
window.refreshMyQuotesBadge = refreshMyQuotesBadge;
window.updateOrderHistoryBadge = updateOrderHistoryBadge;
window.refreshOrderHistoryBadge = refreshOrderHistoryBadge;
window.markOrderHistoryViewed = markOrderHistoryViewed;
window.showBrandedInvoice = showBrandedInvoice;
