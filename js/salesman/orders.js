// Salesman portal — order entry, history, and invoices.
let currentOrderItems = [];

function addProductToOrder() {
    const productSelect = document.getElementById("order-product");
    const qtyInput = document.getElementById("order-qty");
    if (!productSelect || !productSelect.value) return;

    const productName = productSelect.value;
    const quantity = parseInt(qtyInput.value) || 1;

    const existing = currentOrderItems.findIndex(item => item.product === productName);
    if (existing !== -1) {
        currentOrderItems[existing].quantity += quantity;
    } else {
        currentOrderItems.push({ product: productName, quantity });
    }
    renderOrderItems();
    qtyInput.value = 1;
}

function renderOrderItems() {
    const container = document.getElementById("order-items-list");
    if (!container) return;

    if (currentOrderItems.length === 0) {
        container.innerHTML = `<p style="color:#888; font-size:0.9rem; margin:0;">No products added yet.</p>`;
        return;
    }

    container.innerHTML = currentOrderItems.map((item, index) => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0; border-bottom:1px solid #ddd;">
            <div><strong>${escapeHtml(item.product)}</strong> × ${item.quantity}</div>
            <button onclick="removeOrderItem(${index})" style="background:#c56134; color:white; border:none; padding:0.25rem 0.6rem; border-radius:6px; font-size:0.75rem;">Remove</button>
        </div>
    `).join("");
}

function removeOrderItem(index) {
    currentOrderItems.splice(index, 1);
    renderOrderItems();
}

const orderFormEl = document.getElementById("order-form");

if (orderFormEl) {
    orderFormEl.addEventListener("submit", async function (e) {
        e.preventDefault();
        const user = getCurrentUser() || currentUser;

        if (currentOrderItems.length === 0) {
            alert("Please add at least one product to the order.");
            return;
        }

        const customerName = (document.getElementById("order-customer")?.value || "").trim();
        const notes = (document.getElementById("order-notes")?.value || "").trim();

        if (!customerName) {
            alert("Please select or enter a customer.");
            return;
        }

        const payload = {
            customer_id: null,
            customer_name: customerName,
            customer_email: null,
            customer_company: null,
            salesman_email: (typeof getOperatingSalesmanEmail === 'function' ? getOperatingSalesmanEmail() : (user.email || "")).toLowerCase().trim(),
            salesman_name: (typeof getOperatingSalesmanName === 'function' ? getOperatingSalesmanName() : null) || user.fullName || user.name || "Salesman",
            status: "submitted",
            source: "salesman",
            items: currentOrderItems.map(item => ({
                product: item.product,
                quantity: item.quantity || 1,
                unitPrice: null,
                displayPrice: "",
                isMarketPrice: false
            })),
            notes: notes || null,
            shipping_cost: 0,
            submitted_at: new Date().toISOString()
        };

        try {
            const { error } = await supabaseClient
                .from("orders")
                .insert([payload]);

            if (error) throw error;

            this.reset();
            currentOrderItems = [];
            renderOrderItems();
            alert("Order submitted successfully!");
            if (typeof renderMyOrders === "function") {
                renderMyOrders();
            }
        } catch (err) {
            console.error(err);
            alert("Could not .\n" + (err.message || ""));
        }
    });
}

async function renderMyOrders() {
    const container = document.getElementById("my-orders-list");
    if (!container) return;

    const user = getCurrentUser() || currentUser;
    if (!user) {
        container.innerHTML = `<p class="text-sm text-[#6B4423]">Please log in.</p>`;
        return;
    }

    container.innerHTML = `<p class="text-sm text-[#6B4423]">Loading orders...</p>`;

    try {
        let query = supabaseClient
            .from("orders")
            .select("*")
            .order("submitted_at", { ascending: false });

        // Salesmen only see their own orders; admins see all
        if (user.role === "salesman") {
            query = query.eq("salesman_email", (user.email || "").toLowerCase().trim());
        }

        const { data, error } = await query;

        if (error) {
            console.error(error);
            container.innerHTML = `<p class="text-sm text-red-600">Could not load orders.</p>`;
            return;
        }

        const orders = data || [];
        window._salesmanOrders = orders;

        // Populate the customer filter dropdown (unique names only)
        const filterEl = document.getElementById("order-history-customer-filter");
        if (filterEl) {
            const currentValue = filterEl.value || "";
            if (!currentValue) window._orderHistoryCustomerId = '';
            const names = [...new Set(orders.map(o => o.customer_name || o.customer || "").filter(Boolean))].sort();
            const hasOpen = orders.some(o => !o.customer_id);
            filterEl.innerHTML = `<option value="">All customers (recent first)</option>` +
                (hasOpen ? `<option value="__open__">Open orders (not on a customer)</option>` : '') +
                names.map(n => `<option value="${n.replace(/"/g, "&quot;")}">${n}</option>`).join("");
            filterEl.value = currentValue; // keep selection if possible
        }

        // Apply customer filter if one is selected
        const selectedCustomer = (filterEl && filterEl.value) ? filterEl.value.trim() : "";
        let filtered = orders;
        const pinnedId = window._orderHistoryCustomerId || '';
        if (selectedCustomer === '__open__') {
            filtered = orders.filter(o => !o.customer_id);
            window._orderHistoryCustomerId = '';
        } else if (pinnedId || selectedCustomer) {
            filtered = orders.filter(o => {
                if (pinnedId && o.customer_id && String(o.customer_id) === String(pinnedId)) return true;
                if (selectedCustomer && (o.customer_name || o.customer || '').trim() === selectedCustomer) return true;
                return false;
            });
        }

        if (filtered.length === 0) {
            container.innerHTML = selectedCustomer
                ? `<p class="text-sm text-[#6B4423]">No orders found for this customer.</p>`
                : `<p class="text-sm text-[#6B4423]">No orders yet.</p>`;
            return;
        }

        // Already sorted by submitted_at desc from the query
        if (!window._salesmanCustomers || !window._salesmanCustomers.length) {
            if (typeof renderCustomers === 'function') {
                try { await renderCustomers(); } catch (e) {}
            }
        }
        container.innerHTML = filtered.map(order => createOrderCard(order, user.role === "admin")).join("");

    } catch (err) {
        console.error(err);
        container.innerHTML = `<p class="text-sm text-red-600">Error loading orders.</p>`;
    }
}

function getSalesmanCommissionRates(user) {
    let standardRate = 8;
    let marketRate = 3;

    if (!user) {
        return { standardRate, marketRate };
    }

    // Rates already on the logged-in user object
    if (user.commission != null) {
        standardRate = parseFloat(user.commission) || standardRate;
    }
    if (user.marketCommission != null) {
        marketRate = parseFloat(user.marketCommission) || marketRate;
    }

    try {
        const salesmen = JSON.parse(localStorage.getItem("salesmen") || "[]");
        if (!Array.isArray(salesmen) || salesmen.length === 0) {
            return { standardRate, marketRate };
        }

        const email = (user.email || "").toLowerCase().trim();
        const fullName = (user.fullName || user.name || "").toLowerCase().trim();

        // 1) Match by email (best)
        let match = null;
        if (email) {
            match = salesmen.find(s => (s.email || "").toLowerCase().trim() === email);
        }

        // 2) Fallback: match by full name
        if (!match && fullName) {
            match = salesmen.find(s => {
                const sName = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase().trim();
                return sName === fullName;
            });
        }

        if (match) {
            if (match.commission != null) {
                standardRate = parseFloat(match.commission) || standardRate;
            }
            if (match.marketCommission != null) {
                marketRate = parseFloat(match.marketCommission) || marketRate;
            }
        }
    } catch (e) {
        // ignore lookup errors
    }

    return { standardRate, marketRate };
}

function salesmanOpenOrderAssignHtml(order) {
    const customers = window._salesmanCustomers || [];
    const oid = String(order.id || '');
    const options = ['<option value="">Assign to customer…</option>']
        .concat(customers.map(function (c) {
            const label = (c.name || 'Customer') + (c.company ? (' — ' + c.company) : '');
            return '<option value="' + escapeHtml(String(c.id)) + '">' + escapeHtml(label) + '</option>';
        }));
    return '<div style="margin-top:0.5rem;" onclick="event.stopPropagation()">' +
        '<select id="assign-open-' + escapeHtml(oid) + '" class="border-2 border-[#6B4423] rounded-xl px-2 py-1 text-xs">' +
        options.join('') +
        '</select> ' +
        '<button type="button" class="px-3 py-1 bg-[#1E4D2B] text-[#d4b78f] rounded-xl text-xs font-semibold" ' +
        'onclick="event.stopPropagation(); assignOpenOrderFromHistory(\'' + oid.replace(/'/g, "\\'") + '\')">Attach</button>' +
        '</div>';
}

async function assignOpenOrderFromHistory(orderId) {
    const sel = document.getElementById('assign-open-' + orderId);
    const customerId = sel && sel.value ? sel.value : '';
    if (!customerId) {
        alert('Choose a customer first.');
        return;
    }
    const customers = window._salesmanCustomers || [];
    const customer = customers.find(c => String(c.id) === String(customerId));
    if (!customer) {
        alert('Customer not found. Open the Customers tab once, then try again.');
        return;
    }
    try {
        const { error } = await supabaseClient
            .from('orders')
            .update({
                customer_id: customer.id,
                customer_name: customer.name || null,
                customer_email: (customer.email || '').toLowerCase() || null,
                customer_company: customer.company || null,
                salesman_commission_percent: (customer.salesman_commission_percent != null && customer.salesman_commission_percent !== '')
                    ? Number(customer.salesman_commission_percent)
                    : null
            })
            .eq('id', orderId);
        if (error) throw error;
        alert((customer.name || 'Customer') + ' now has this order.');
        if (typeof renderMyOrders === 'function') renderMyOrders();
    } catch (err) {
        console.error(err);
        alert('Could not attach order.\n' + (err.message || ''));
    }
}

function createOrderCard(order, showSalesman = false) {
    const user = getCurrentUser() || currentUser;
    const { standardRate, marketRate } = getSalesmanCommissionRates(user);

    const status = (order.status || "Submitted").toString();
    const statusLower = status.toLowerCase();

    let statusClass = "bg-orange-100 text-orange-700";
    if (statusLower === "received" || statusLower === "processing") {
        statusClass = "bg-blue-100 text-blue-800";
    } else if (statusLower === "shipped") {
        statusClass = "bg-purple-100 text-purple-800";
    } else if (statusLower === "delivered" || statusLower === "completed") {
        statusClass = "bg-green-100 text-green-700";
    } else if (statusLower === "denied") {
        statusClass = "bg-red-100 text-red-700";
    }

    let productSubtotal = 0;
    let normalSubtotal = 0;
    let marketSubtotal = 0;

        const itemRows = (order.items || []).map(item => {
        const qty = parseInt(item.quantity, 10) || 0;
        const isMarket = !!item.isMarketPrice;
        const unitPriceNum = parseFloat(item.unitPrice);
        const hasRealPrice = !isNaN(unitPriceNum) && unitPriceNum > 0;
        const lineTotal = hasRealPrice ? unitPriceNum * qty : 0;

        if (isMarket) {
            if (hasRealPrice) {
                productSubtotal += lineTotal;
                marketSubtotal += lineTotal;
            }
        } else {
            productSubtotal += lineTotal;
            normalSubtotal += lineTotal;
        }

        const lineLabel = hasRealPrice
            ? "$" + lineTotal.toFixed(2)
            : (item.displayPrice || "Market Price");

        const unitLabel = hasRealPrice
            ? "$" + unitPriceNum.toFixed(2)
            : (item.displayPrice || "Market Price");

        return `
            <div class="flex justify-between text-sm py-1 border-b border-[#eee]">
                <div class="pr-3">
                    <span class="font-medium">${escapeHtml(item.product || item.name || "Item")}</span>
                    <span class="text-[#6B4423]"> × ${qty} units</span>
                    <div class="text-xs text-[#6B4423]">${unitLabel} each</div>
                </div>
                <div class="text-right font-semibold">${lineLabel}</div>
            </div>
        `;
    }).join("");

    const shipping = parseFloat(order.shipping_cost ?? order.shippingCost) || 0;
    const finalTotal = productSubtotal + shipping;

    const normalCommission = normalSubtotal * (standardRate / 100);
    const marketCommissionAmt = marketSubtotal * (marketRate / 100);
    const totalCommission = normalCommission + marketCommissionAmt;

     const safeId = String(order.id || '').replace(/'/g, "\\'");
    return `
        <div style="background:#fff; border:2px solid #6B4423; border-radius:12px; padding:1rem; margin-bottom:1rem; cursor:pointer;"
             onclick="event.stopPropagation(); openSalesmanOrderInvoice('${safeId}')"
             title="Click to view invoice">
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:0.75rem;">
                <div>
                    <strong style="color:#1E4D2B; font-size:1.05rem;">${escapeHtml(order.customer_name || order.customer || "Customer")}</strong>
                    ${!order.customer_id ? '<div style="margin-top:0.25rem;display:inline-block;padding:0.15rem 0.45rem;background:#fff7ed;border:2px solid #c2410c;border-radius:6px;color:#c2410c;font-size:0.7rem;font-weight:800;">OPEN ORDER</div>' : ''}
                    <div style="font-size:0.8rem; color:#888; margin-top:0.15rem;">
                        Order #${escapeHtml(displayInvoiceNumber(order))} · ${new Date(order.submitted_at || order.submittedAt).toLocaleDateString()}
                    </div>
                    ${showSalesman ? `<div style="font-size:0.8rem; color:#6B4423;">Salesman: ${escapeHtml(order.salesman_name || order.salesman || "N/A")}</div>` : ""}
                    ${!order.customer_id ? salesmanOpenOrderAssignHtml(order) : ''}
                </div>
                <span class="px-3 py-1 text-xs font-semibold rounded-full ${statusClass}">
                    ${status}
                </span>
            </div>

            <div style="margin-bottom:0.75rem;">
                ${itemRows || "<p class='text-sm text-[#6B4423]'>No items</p>"}
            </div>

            <div style="border-top:1px solid #d4b78f; padding-top:0.6rem; font-size:0.9rem;">
                <div style="display:flex; justify-content:space-between;">
                    <span class="text-[#6B4423]">Product Subtotal</span>
                    <span>$${productSubtotal.toFixed(2)}</span>
                </div>
                <div style="display:flex; justify-content:space-between;">
                    <span class="text-[#6B4423]">Shipping</span>
                    <span>${shipping > 0
                        ? ("$" + shipping.toFixed(2))
                        : ((statusLower === "shipped" || statusLower === "delivered" || statusLower === "completed")
                            ? "Free Shipping"
                            : "TBD")}</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-weight:700; color:#1E4D2B; margin-top:0.25rem;">
                    <span>Order Total</span>
                    <span>$${finalTotal.toFixed(2)}</span>
                </div>
            </div>

            <div style="margin-top:0.75rem; padding:0.6rem; background:#f8f4eb; border-radius:8px; font-size:0.85rem;">
                <div style="display:flex; justify-content:space-between;">
                    <span>Commission (${standardRate}% standard${marketSubtotal > 0 ? " / " + marketRate + "% market" : ""})</span>
                    <strong style="color:#1E4D2B;">$${totalCommission.toFixed(2)}</strong>
                </div>
                <p style="margin:0.25rem 0 0; font-size:0.75rem; color:#6B4423;">
                    Commission is calculated on product subtotal only. Shipping is not included.
                </p>
            </div>
        </div>
    `;
}

function hideOrderInvoiceModal() {
    const modal = document.getElementById('order-invoice-modal');
    if (modal) modal.classList.add('hidden');
}

function printOrderInvoice() {
    const modal = document.getElementById('order-invoice-modal');
    if (!modal || modal.classList.contains('hidden')) {
        alert('Open an invoice first.');
        return;
    }
    window.print();
}

async function openSalesmanOrderInvoice(orderId) {
    const id = String(orderId || '');
    const orders = window._salesmanOrders || [];
    const order = orders.find(o => String(o.id) === id);
    if (!order) {
        alert('Order not found.');
        return;
    }

    // Customer lookup for addresses (email first, then name)
    let customer = null;
    const customers = window._salesmanCustomers || [];
    if (customers.length) {
        customer = customers.find(c =>
            (c.email && order.customer_email && c.email.toLowerCase() === order.customer_email.toLowerCase()) ||
            (c.name && order.customer_name && c.name.toLowerCase() === order.customer_name.toLowerCase())
        ) || null;
    }

    // Lazy load from Supabase if Order History was opened before Customers tab
    if (!customer && typeof supabaseClient !== 'undefined') {
        try {
            const email = (order.customer_email || '').trim();
            const name = (order.customer_name || order.customer || '').trim();

            if (email) {
                const { data } = await supabaseClient
                    .from('customers')
                    .select('*')
                    .ilike('email', email)
                    .limit(1)
                    .maybeSingle();
                if (data) customer = data;
            }

            if (!customer && name) {
                const { data } = await supabaseClient
                    .from('customers')
                    .select('*')
                    .ilike('name', name)
                    .limit(1)
                    .maybeSingle();
                if (data) customer = data;
            }

            if (customer) {
                window._salesmanCustomers = window._salesmanCustomers || [];
                const already = window._salesmanCustomers.some(c => String(c.id) === String(customer.id));
                if (!already) window._salesmanCustomers.push(customer);
            }
        } catch (err) {
            console.warn('Invoice customer lookup failed:', err);
        }
    }

    // Header
    const invNumber = document.getElementById('inv-number');
    const invDate = document.getElementById('inv-date');
    const invStatus = document.getElementById('inv-status');
    if (invNumber) invNumber.textContent = displayInvoiceNumber(order);
    if (typeof markInvoiceUpdatedState === 'function') markInvoiceUpdatedState(order);
    if (invDate) {
        const d = new Date(order.submitted_at || order.submittedAt || Date.now());
        invDate.textContent = isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
    }
    if (invStatus) invStatus.textContent = (order.status || 'Submitted').toString();

    // BILL TO / SHIP TO
    const billEl = document.getElementById('inv-bill-to');
    const shipEl = document.getElementById('inv-ship-to');
    const name = order.customer_name || order.customer || customer?.name || '—';
    const company = order.customer_company || customer?.company || '';
    const email = order.customer_email || customer?.email || '';
    const phone = customer?.phone || '';
    const billingAddr = customer?.billing_address || customer?.billingAddress || customer?.shipping_address || customer?.shippingAddress || '';
    const shippingAddr = customer?.shipping_address || customer?.shippingAddress || billingAddr || '';

    const phoneDisp = phone
        ? (typeof formatPhoneDisplay === 'function' ? formatPhoneDisplay(phone) : phone)
        : '';
    const companyLine = (company && company.toLowerCase() !== String(name || '').toLowerCase()) ? company : '';
    const billLines = [name, companyLine, phoneDisp, billingAddr].filter(Boolean);
    const shipLines = [name, companyLine, shippingAddr].filter(Boolean);
    if (billEl) billEl.innerHTML = billLines.map(l => `<p>${escapeHtml(l)}</p>`).join('') || '—';
    if (shipEl) shipEl.innerHTML = shipLines.map(l => `<p>${escapeHtml(l)}</p>`).join('') || '—';

    // Line items
    const tbody = document.getElementById('inv-items-body');
    let productSubtotal = 0;
    if (tbody) {
        const items = order.items || [];
        if (items.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-[#6B4423]">No line items</td></tr>`;
        } else {
            tbody.innerHTML = items.map(item => {
                const qty = parseInt(item.quantity, 10) || 0;
                const unit = parseFloat(item.unitPrice);
                const hasPrice = !isNaN(unit) && unit > 0;
                const lineTotal = hasPrice ? unit * qty : 0;
                if (hasPrice) productSubtotal += lineTotal;
                const unitLabel = hasPrice ? '$' + unit.toFixed(2) : (item.displayPrice || 'Market Price');
                const totalLabel = hasPrice ? '$' + lineTotal.toFixed(2) : (item.displayPrice || '—');
                return `
                    <tr class="border-b border-[#eee]">
                        <td class="p-3 align-top">${qty}</td>
                        <td class="p-3 align-top">${escapeHtml(orderLineDisplayName(item))}${
                            (item.itemNumber || item.needsUpcLabel || item.needsCigarTag)
                                ? ('<div class="text-[11px] font-semibold text-[#6B4423] mt-0.5">' +
                                    escapeHtml([
                                        item.itemNumber ? ('#' + item.itemNumber) : '',
                                        item.skuCode || '',
                                        item.needsUpcLabel ? 'UPC + Label' : '',
                                        item.needsCigarTag ? 'Cigar Tag' : ''
                                    ].filter(Boolean).join(' · ')) + '</div>')
                                : ''
                        }</td>
                        <td class="p-3 text-right align-top">${unitLabel}</td>
                        <td class="p-3 text-right align-top font-semibold">${totalLabel}</td>
                    </tr>
                `;
            }).join('');
        }
    }

    // Notes (hide system text)
    const notesEl = document.getElementById('inv-notes');
    if (notesEl) {
        let notes = (order.notes || '').trim();
        const systemPhrases = [
            'Submitted via Salesman Portal',
            'Created via Add Order',
            'Submitted via Wholesale Portal'
        ];
        if (systemPhrases.some(p => notes === p)) {
            notes = '';
        }
        notesEl.textContent = notes || '—';
    }

    // Totals
    const shipping = parseFloat(order.shipping_cost ?? order.shippingCost) || 0;
    const credit = parseFloat(order.credit) || 0;
    const finalTotal = Math.max(0, productSubtotal + shipping - credit);

    const subEl = document.getElementById('inv-subtotal');
    const shipCostEl = document.getElementById('inv-shipping');
    const creditRow = document.getElementById('inv-credit-row');
    const creditEl = document.getElementById('inv-credit');
    const totalEl = document.getElementById('inv-total');

    if (subEl) subEl.textContent = '$' + productSubtotal.toFixed(2);
    if (shipCostEl) {
        const st = (order.status || '').toString().toLowerCase();
        if (shipping > 0) {
            shipCostEl.textContent = '$' + shipping.toFixed(2);
        } else if (st === 'shipped' || st === 'delivered' || st === 'completed') {
            shipCostEl.textContent = 'Free Shipping';
        } else {
            shipCostEl.textContent = 'TBD';
        }
    }
    if (creditRow && creditEl) {
        if (credit > 0) {
            creditRow.classList.remove('hidden');
            creditEl.textContent = '−$' + credit.toFixed(2);
        } else {
            creditRow.classList.add('hidden');
        }
    }
    if (totalEl) totalEl.textContent = '$' + finalTotal.toFixed(2);

    const editBtn = document.getElementById('sm-inv-edit-order-btn');
    if (editBtn) {
        const st = String(order.status || 'submitted').toLowerCase();
        const canEdit = (typeof canEditSalesmanOrder === 'function') && canEditSalesmanOrder(order) &&
            (st === 'submitted' || st === 'pending' || st === '' || st === 'received' || st === 'processing');
        if (canEdit) {
            editBtn.textContent = 'Update Order';
            editBtn.classList.remove('hidden');
            editBtn.setAttribute('data-order-id', String(order.id));
        } else {
            editBtn.classList.add('hidden');
            editBtn.removeAttribute('data-order-id');
        }
    }

    // Show modal after this click finishes so the backdrop does not close it
    const modal = document.getElementById('order-invoice-modal');
    if (!modal) {
        alert('Invoice window is missing from salesman-portal.html.');
        return;
    }
    document.body.appendChild(modal);
    modal.style.zIndex = '5000';
    modal.classList.remove('hidden');
}

function canEditSalesmanOrder(order) {
    const user = getCurrentUser() || currentUser;
    const email = (user && user.email ? String(user.email) : '').toLowerCase().trim();
    const seat = (typeof getOperatingSalesmanEmail === 'function')
        ? String(getOperatingSalesmanEmail() || '').toLowerCase().trim()
        : email;
    if (email === 'jackerman@donegalnatural.com' || !!(user && user.isViewAs) || !!localStorage.getItem('originalAdminUser')) return true;
    if (seat !== 'donegaldogtreats@gmail.com' && email !== 'donegaldogtreats@gmail.com') return false;
    const orderEmail = String((order && (order.salesman_email || order.salesmanEmail)) || '').toLowerCase().trim();
    return !orderEmail || orderEmail === 'donegaldogtreats@gmail.com';
}

function editOrderFromSalesmanInvoice() {
    const btn = document.getElementById('sm-inv-edit-order-btn');
    const orderId = btn ? btn.getAttribute('data-order-id') : '';
    if (!orderId) return;
    openSalesmanEditOrder(orderId);
}

let smEditOrder = null;

let smEditItems = [];

async function openSalesmanEditOrder(orderId) {
    const existing = (window._salesmanOrders || []).find(function (o) {
        return String(o.id) === String(orderId);
    });
    if (!canEditSalesmanOrder(existing || smEditOrder)) {
        alert('You can only edit an order you submitted.');
        return;
    }
    let order = (window._salesmanOrders || []).find(function (o) {
        return String(o.id) === String(orderId);
    });
    if (!order && typeof supabaseClient !== 'undefined') {
        const { data, error } = await supabaseClient
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .maybeSingle();
        if (error) {
            alert('Could not load order.\n' + (error.message || ''));
            return;
        }
        order = data;
        if (order) {
            window._salesmanOrders = window._salesmanOrders || [];
            window._salesmanOrders.push(order);
        }
    }
    if (!order) {
        alert('Order not found.');
        return;
    }
    const st = String(order.status || 'submitted').toLowerCase();
    if (!(st === 'submitted' || st === 'pending' || st === '' || st === 'received' || st === 'processing')) {
        alert('Shipped or denied orders cannot be edited.');
        return;
    }
    smEditOrder = order;
    loadEditOrderSheet(order);
    smEditItems = (order.items || []).map(function (item) {
        return {
            product: item.product || item.name || '',
            quantity: item.quantity || 1,
            caseSize: item.caseSize || '',
            unitPrice: item.unitPrice != null ? item.unitPrice : null,
            displayPrice: item.displayPrice || '',
            isMarketPrice: !!item.isMarketPrice
        };
    });
    const customerEl = document.getElementById('sm-edit-customer');
    const invoiceEl = document.getElementById('sm-edit-invoice');
    const statusEl = document.getElementById('sm-edit-status');
    const commissionEl = document.getElementById('sm-edit-commission');
    if (customerEl) customerEl.textContent = order.customer_name || order.customer || '—';
    if (invoiceEl) invoiceEl.textContent = (typeof displayInvoiceNumber === 'function') ? displayInvoiceNumber(order) : String(order.invoice_number || order.id);
    if (statusEl) statusEl.textContent = order.status || 'submitted';
    if (commissionEl) {
        const raw = order.salesman_commission_percent != null ? order.salesman_commission_percent : 5;
        commissionEl.value = String(raw);
    }
    const searchEl = document.getElementById('sm-edit-product-search');
    if (searchEl) searchEl.value = '';
    const resultsEl = document.getElementById('sm-edit-product-results');
    if (resultsEl) {
        resultsEl.innerHTML = '';
        resultsEl.classList.add('hidden');
    }
    renderSalesmanEditItems();
    const editModal = document.getElementById('sm-edit-order-modal');
    if (editModal) {
        document.body.appendChild(editModal);
        editModal.style.zIndex = '6000';
        editModal.classList.remove('hidden');
    }
    if (typeof hideOrderInvoiceModal === 'function') hideOrderInvoiceModal();
}

function hideSalesmanEditOrderModal() {
    document.getElementById('sm-edit-order-modal')?.classList.add('hidden');
    smEditOrder = null;
    smEditItems = [];
}

function salesmanEditItemKey(item) {
    return String((item && (item.product || item.name)) || '').trim().toLowerCase();
}

function salesmanEditItemQty(item) {
    return parseInt(item && item.quantity, 10) || 0;
}

function salesmanEditItemUnit(item) {
    const n = parseFloat(item && item.unitPrice);
    return isFinite(n) ? n : 0;
}

function salesmanEditSum(items) {
    return (items || []).reduce(function (sum, item) {
        return sum + (salesmanEditItemQty(item) * salesmanEditItemUnit(item));
    }, 0);
}

function renderSalesmanEditItems() {
    const container = document.getElementById('sm-edit-items');
    const subEl = document.getElementById('sm-edit-subtotal');
    const summaryEl = document.getElementById('sm-edit-change-summary');
    if (!container) return;
    if (!smEditItems.length) {
        container.innerHTML = '<p class="text-sm text-[#6B4423]">No line items.</p>';
    } else {
        container.innerHTML = smEditItems.map(function (item, index) {
            const unit = salesmanEditItemUnit(item);
            const qty = salesmanEditItemQty(item);
            const line = unit * qty;
            const priceLabel = unit > 0 ? ('$' + unit.toFixed(2)) : (item.displayPrice || '—');
            return '<div class="flex flex-wrap items-center gap-2 border border-[#d4b78f] rounded-xl px-3 py-2 bg-[#f8f4eb]">' +
                '<div class="flex-1 min-w-[160px]"><p class="font-semibold text-sm brand-green">' + escapeHtml(item.product) + '</p>' +
                '<p class="text-xs text-[#6B4423]">' + escapeHtml(priceLabel) + (item.caseSize ? (' · ' + escapeHtml(item.caseSize)) : '') + '</p></div>' +
                '<input type="number" min="1" step="1" value="' + qty + '" onchange="updateSalesmanEditQty(' + index + ', this.value)" class="w-20 border-2 border-[#6B4423] rounded-lg px-2 py-1 text-sm">' +
                '<p class="font-semibold text-sm brand-green min-w-[70px] text-right">' + (unit > 0 ? ('$' + line.toFixed(2)) : '—') + '</p>' +
                '<button type="button" onclick="removeSalesmanEditItem(' + index + ')" class="px-3 py-1 text-xs bg-red-600 text-white rounded-lg">Remove</button></div>';
        }).join('');
    }
    const nextTotal = salesmanEditSum(smEditItems);
    if (subEl) subEl.textContent = '$' + nextTotal.toFixed(2);
    if (summaryEl && smEditOrder) {
        const before = smEditOrder.items || [];
        const prevMap = {};
        before.forEach(function (item) {
            const key = salesmanEditItemKey(item);
            if (key) prevMap[key] = salesmanEditItemQty(item);
        });
        const nextMap = {};
        smEditItems.forEach(function (item) {
            const key = salesmanEditItemKey(item);
            if (key) nextMap[key] = salesmanEditItemQty(item);
        });
        const changes = [];
        Object.keys(prevMap).forEach(function (key) {
            if (nextMap[key] == null) changes.push(key + ': removed (was qty ' + prevMap[key] + ')');
            else if (prevMap[key] !== nextMap[key]) changes.push(key + ': qty ' + prevMap[key] + ' → ' + nextMap[key]);
        });
        Object.keys(nextMap).forEach(function (key) {
            if (prevMap[key] == null) changes.push(key + ': added qty ' + nextMap[key]);
        });
        const prevTotal = salesmanEditSum(before);
        if (!changes.length && prevTotal === nextTotal) {
            summaryEl.textContent = 'No item changes yet.';
        } else {
            summaryEl.innerHTML = '<p class="font-semibold text-[#1E4D2B] mb-1">Pending changes</p>' +
                (changes.length ? ('<ul class="list-disc ml-5">' + changes.map(function (line) {
                    return '<li>' + escapeHtml(line) + '</li>';
                }).join('') + '</ul>') : '<p>Items unchanged</p>') +
                '<p class="mt-2">Previous subtotal: $' + prevTotal.toFixed(2) + '</p>' +
                '<p>Updated subtotal: $' + nextTotal.toFixed(2) + '</p>';
        }
    }
}

function updateSalesmanEditQty(index, value) {
    if (!smEditItems[index]) return;
    smEditItems[index].quantity = Math.max(1, parseInt(value, 10) || 1);
    renderSalesmanEditItems();
}

function removeSalesmanEditItem(index) {
    smEditItems.splice(index, 1);
    renderSalesmanEditItems();
}

async function loadEditOrderSheet(order) {
    const email = String((order && (order.salesman_email || order.salesmanEmail)) || 'donegaldogtreats@gmail.com').toLowerCase().trim();
    window._editOrderSheetPrices = {};
    window._editOrderSheetNames = {};
    try {
        const { data } = await supabaseClient
            .from('salesman_price_sheets')
            .select('prices, display_names')
            .eq('salesman_email', email)
            .maybeSingle();
        window._editOrderSheetPrices = (data && data.prices) || {};
        window._editOrderSheetNames = (data && data.display_names) || {};
    } catch (err) {
        console.warn('loadEditOrderSheet:', err);
    }
}

function renderSalesmanEditProductSearch() {
    const input = document.getElementById('sm-edit-product-search');
    const results = document.getElementById('sm-edit-product-results');
    if (!input || !results) return;
    const q = String(input.value || '').trim().toLowerCase();
    const prices = window._editOrderSheetPrices || {};
    const names = window._editOrderSheetNames || {};
    if (!q) {
        results.innerHTML = '';
        results.classList.add('hidden');
        return;
    }
    const matches = Object.keys(prices).filter(function (name) {
        const shown = String(names[name] || name);
        return (name + ' ' + shown).toLowerCase().indexOf(q) !== -1;
    }).slice(0, 12);
    if (!matches.length) {
        results.innerHTML = '<p class="p-3 text-sm text-[#6B4423]">No products on this salesman sheet</p>';
        results.classList.remove('hidden');
        return;
    }
    results.innerHTML = matches.map(function (name) {
        const shown = String(names[name] || name);
        const safe = String(name)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/"/g, '&quot;');
        return '<button type="button" class="w-full text-left px-3 py-2 hover:bg-[#f8f4eb]" onclick="addSalesmanEditProduct(\'' + safe + '\')">' +
            escapeHtml(shown) + ' · $' + Number(prices[name]).toFixed(2) + '</button>';
    }).join('');
    results.classList.remove('hidden');
}

function addSalesmanEditProduct(productName) {
    const prices = window._editOrderSheetPrices || {};
    if (!Object.prototype.hasOwnProperty.call(prices, productName)) return;
    const names = window._editOrderSheetNames || {};
    const product = {
        name: names[productName] || productName,
        caseSize: '',
        unitPrice: Number(prices[productName]),
        isMarketPrice: false
    };
    const existing = smEditItems.find(function (i) { return salesmanEditItemKey(i) === String(productName).toLowerCase(); });
    if (existing) {
        existing.quantity = salesmanEditItemQty(existing) + 1;
    } else {
        smEditItems.push({
            product: product.name,
            quantity: 1,
            caseSize: product.caseSize || '',
            unitPrice: product.isMarketPrice ? null : Number(product.unitPrice),
            isMarketPrice: !!product.isMarketPrice,
            displayPrice: product.isMarketPrice ? 'Market Price' : ('$' + Number(product.unitPrice).toFixed(2))
        });
    }
    const searchEl = document.getElementById('sm-edit-product-search');
    if (searchEl) searchEl.value = '';
    const resultsEl = document.getElementById('sm-edit-product-results');
    if (resultsEl) {
        resultsEl.innerHTML = '';
        resultsEl.classList.add('hidden');
    }
    renderSalesmanEditItems();
}

async function saveSalesmanEditedOrder() {
    if (!canEditSalesmanOrder()) {
        alert('You can only edit an order you submitted.');
        return;
    }
    if (!smEditOrder) return;
    if (!smEditItems.length) {
        alert('Order must have at least one line item.');
        return;
    }
    const rawCommission = String((document.getElementById('sm-edit-commission') || {}).value || '').trim();
    let commissionPercent = null;
    if (rawCommission !== '') {
        commissionPercent = Number(rawCommission);
        if (!isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 100) {
            alert('Commission must be between 0 and 100.');
            return;
        }
    }
    const itemsPayload = smEditItems.map(function (item) {
        return {
            product: item.product,
            quantity: item.quantity || 1,
            caseSize: item.caseSize || '',
            unitPrice: item.unitPrice,
            displayPrice: item.displayPrice || '',
            isMarketPrice: !!item.isMarketPrice
        };
    });
    const before = smEditOrder.items || [];
    const prevMap = {};
    before.forEach(function (item) {
        const key = salesmanEditItemKey(item);
        if (key) prevMap[key] = { product: item.product || item.name || key, qty: salesmanEditItemQty(item) };
    });
    const nextMap = {};
    itemsPayload.forEach(function (item) {
        const key = salesmanEditItemKey(item);
        if (key) nextMap[key] = { product: item.product, qty: salesmanEditItemQty(item) };
    });
    const changes = [];
    Object.keys(prevMap).forEach(function (key) {
        if (!nextMap[key]) changes.push(prevMap[key].product + ': removed (was qty ' + prevMap[key].qty + ')');
        else if (prevMap[key].qty !== nextMap[key].qty) changes.push(prevMap[key].product + ': qty ' + prevMap[key].qty + ' → ' + nextMap[key].qty);
    });
    Object.keys(nextMap).forEach(function (key) {
        if (!prevMap[key]) changes.push(nextMap[key].product + ': added qty ' + nextMap[key].qty);
    });
    const editBlock = [
        'ORDER UPDATED',
        'Edited: ' + new Date().toLocaleString(),
        changes.length ? ('Changed items:\n- ' + changes.join('\n- ')) : 'Changed items: none',
        'Previous subtotal: $' + salesmanEditSum(before).toFixed(2),
        'Updated subtotal: $' + salesmanEditSum(itemsPayload).toFixed(2)
    ];
    if (commissionPercent != null) editBlock.push('Commission: ' + commissionPercent + '%');
    const existingNotes = String(smEditOrder.notes || '').trim().replace(/\n*ORDER UPDATED[\s\S]*$/i, '').trim();
    const notesToSave = existingNotes ? (existingNotes + '\n\n' + editBlock.join('\n')) : editBlock.join('\n');
    const payload = { items: itemsPayload, notes: notesToSave };
    if (commissionPercent != null) {
        payload.salesman_commission_percent = commissionPercent;
        payload.portal_commission_rate = commissionPercent;
    }
    try {
        const { data, error } = await supabaseClient
            .from('orders')
            .update(payload)
            .eq('id', smEditOrder.id)
            .select('id');
        if (error) throw error;
        if (!data || data.length === 0) throw new Error('Update matched 0 rows.');
        if (typeof notifyMarshallProforma === 'function') {
            await notifyMarshallProforma({
                orderId: (typeof displayInvoiceNumber === 'function') ? displayInvoiceNumber(smEditOrder) : (smEditOrder.invoice_number || smEditOrder.id),
                customerName: smEditOrder.customer_name || '',
                companyName: smEditOrder.customer_company || '',
                customerEmail: smEditOrder.customer_email || '',
                salesmanName: smEditOrder.salesman_name || '',
                items: itemsPayload,
                notes: notesToSave,
                shippingCost: smEditOrder.shipping_cost || 0,
                credit: smEditOrder.credit || 0,
                submittedAt: smEditOrder.submitted_at,
                source: smEditOrder.source || 'salesman',
                commissionRate: commissionPercent,
                isRevision: true,
                editedAt: new Date().toLocaleString(),
                previousSubtotal: salesmanEditSum(before),
                updatedSubtotal: salesmanEditSum(itemsPayload),
                changeLog: changes.join('\n'),
                subjectPrefix: 'UPDATED '
            });
        }
        hideSalesmanEditOrderModal();
        if (typeof renderMyOrders === 'function') await renderMyOrders();
        alert('Order updated.\nUpdated pro forma emailed.');
    } catch (err) {
        console.error(err);
        alert('Could not update order.\n' + (err.message || ''));
    }
}

function updateOrderStatus(orderId, newStatus) {
    let orders = JSON.parse(localStorage.getItem("submittedOrders") || "[]");
    const index = orders.findIndex(o => o.id === orderId);
    if (index !== -1) {
        orders[index].status = newStatus;
        localStorage.setItem("submittedOrders", JSON.stringify(orders));
        renderMyOrders();
    }
}

window.addProductToOrder = addProductToOrder;
window.renderOrderItems = renderOrderItems;
window.removeOrderItem = removeOrderItem;
window.renderMyOrders = renderMyOrders;
window.getSalesmanCommissionRates = getSalesmanCommissionRates;
window.salesmanOpenOrderAssignHtml = salesmanOpenOrderAssignHtml;
window.assignOpenOrderFromHistory = assignOpenOrderFromHistory;
window.createOrderCard = createOrderCard;
window.hideOrderInvoiceModal = hideOrderInvoiceModal;
window.printOrderInvoice = printOrderInvoice;
window.openSalesmanOrderInvoice = openSalesmanOrderInvoice;
window.canEditSalesmanOrder = canEditSalesmanOrder;
window.editOrderFromSalesmanInvoice = editOrderFromSalesmanInvoice;
window.openSalesmanEditOrder = openSalesmanEditOrder;
window.hideSalesmanEditOrderModal = hideSalesmanEditOrderModal;
window.salesmanEditItemKey = salesmanEditItemKey;
window.salesmanEditItemQty = salesmanEditItemQty;
window.salesmanEditItemUnit = salesmanEditItemUnit;
window.salesmanEditSum = salesmanEditSum;
window.renderSalesmanEditItems = renderSalesmanEditItems;
window.updateSalesmanEditQty = updateSalesmanEditQty;
window.removeSalesmanEditItem = removeSalesmanEditItem;
window.loadEditOrderSheet = loadEditOrderSheet;
window.renderSalesmanEditProductSearch = renderSalesmanEditProductSearch;
window.addSalesmanEditProduct = addSalesmanEditProduct;
window.saveSalesmanEditedOrder = saveSalesmanEditedOrder;
window.updateOrderStatus = updateOrderStatus;
