// Salesman portal — customer list, detail, and pricing.
async function notifyCustomerPricingReady(customer) {
    const email = String((customer && customer.email) || '').toLowerCase().trim();
    const name = (customer && (customer.name || customer.company)) || 'there';
    const company = (customer && (customer.company || customer.name)) || '';
    if (!email || email.indexOf('@') === -1) return;
    if (email === 'jackerman@donegalnatural.com') return;

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
        if (!fnRes.ok) {
            const fnText = await fnRes.text();
            console.warn('pricing ready email:', fnRes.status, fnText);
        }
    } catch (err) {
        console.warn('pricing ready email:', err && err.message ? err.message : err);
    }
}

function hideSalesmanCustomerQuoteModal() {
    document.getElementById('salesman-open-quote-modal')?.remove();
}

function openSalesmanCustomerQuoteModal(customerId) {
    const customer = (window._salesmanCustomers || []).find(function (c) {
        return String(c.id) === String(customerId);
    });
    const quote = (window._salesmanOpenQuotes || {})[String(customerId)] || null;
    if (!customer || !quote) {
        alert('No open quote found for this store.');
        return;
    }
    hideSalesmanCustomerQuoteModal();
    const items = Array.isArray(quote.items) ? quote.items : [];
    const updated = quote.updated_at ? new Date(quote.updated_at).toLocaleString() : '—';
    const visited = customer.last_login_at
        ? new Date(customer.last_login_at).toLocaleString()
        : 'Never';
    const estimate = '$' + (Number(quote.estimated_subtotal) || 0).toFixed(2);
    const lines = items.length
        ? items.map(function (item) {
            const name = escapeHtml(item.product || item.name || '—');
            const qty = item.quantity || 1;
            const cs = escapeHtml(item.caseSize || item.cs || '');
            const market = !!(item.isMarketPrice || String(item.displayPrice || item.price || '').toLowerCase().includes('market'));
            const price = market
                ? 'Market'
                : ('$' + (parseFloat(item.unitPrice != null ? item.unitPrice : item.price) || 0).toFixed(2));
            return '<div class="flex justify-between gap-3 text-sm py-2 border-b border-[#e5d5c0]">' +
                '<span>' + name + (cs ? (' <span class="text-[#6B4423]">· ' + cs + '</span>') : '') + '</span>' +
                '<span class="whitespace-nowrap font-semibold">× ' + escapeHtml(String(qty)) + ' · ' + escapeHtml(price) + '</span>' +
                '</div>';
        }).join('')
        : '<p class="text-sm text-[#6B4423]">No line items.</p>';
    const modal = document.createElement('div');
    modal.id = 'salesman-open-quote-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110] p-4';
    modal.onclick = hideSalesmanCustomerQuoteModal;
    modal.innerHTML =
        '<div class="bg-white border-2 border-[#6B4423] rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onclick="event.stopImmediatePropagation()">' +
        '<div class="flex items-start justify-between gap-3 mb-3">' +
        '<h2 class="text-xl font-bold brand-green">Open Quote</h2>' +
        '<button type="button" onclick="hideSalesmanCustomerQuoteModal()" class="text-3xl leading-none text-[#6B4423]">&times;</button>' +
        '</div>' +
        '<p class="font-semibold text-[#1E4D2B]">' + escapeHtml(customer.company || customer.name || 'Store') + '</p>' +
        '<p class="text-sm text-[#6B4423] mb-4">' + escapeHtml(customer.name || '') + '</p>' +
        '<p class="text-sm text-[#6B4423]">Last cart update: <span class="font-semibold text-[#1E4D2B]">' + escapeHtml(updated) + '</span></p>' +
        '<p class="text-sm text-[#6B4423] mb-4">Last visit: <span class="font-semibold text-[#1E4D2B]">' + escapeHtml(visited) + '</span></p>' +
        '<p class="text-sm font-semibold brand-green mb-2">Estimated subtotal ' + escapeHtml(estimate) + '</p>' +
        lines +
        '</div>';
    document.body.appendChild(modal);
}

async function renderCustomers() {
    const grid = document.getElementById("customers-grid");
    if (!grid) return;

    grid.innerHTML = `<p class="text-sm text-[#6B4423]">Loading customers...</p>`;

    const user = getCurrentUser() || currentUser;
    if (!user) {
        grid.innerHTML = `<p class="text-sm text-[#6B4423]">Please log in.</p>`;
        return;
    }

    try {
        let query = supabaseClient
            .from('customers')
            .select('*')
            .in('status', ['Approved', 'Active'])
            .order('name', { ascending: true });

        if (user.role === 'salesman') {
            query = query.eq(
                'salesman_email',
                (user.email || '').toLowerCase().trim()
            );
        }

        const { data, error } = await query;

        if (error) {
            console.error(error);
            grid.innerHTML = `<p class="text-sm text-red-600">Could not load customers.</p>`;
            return;
        }

        if (typeof updateSalesmanCustomerListTabs === 'function') updateSalesmanCustomerListTabs();

        if (!data || data.length === 0) {
            grid.innerHTML = `<p class="text-sm text-[#6B4423]">No approved customers yet.</p>`;
            return;
        }

        window._salesmanCustomers = data || [];
        const jonathanView = typeof isJonathanSalesmanView === 'function' && isJonathanSalesmanView();
        let list = data.slice();
        if (jonathanView) {
            if (salesmanCustomerListTab === 'test') {
                list = list.filter(isJonathanTestCustomer);
            } else {
                list = list.filter(function (c) { return !isJonathanTestCustomer(c); });
            }
        } else {
            list = list.filter(function (c) { return !isJonathanTestCustomer(c); });
        }

        const quoteByCustomer = {};
        try {
            const ids = list.map(function (c) { return c.id; }).filter(Boolean);
            if (ids.length) {
                const { data: quotes, error: quoteErr } = await supabaseClient
                    .from('customer_open_quotes')
                    .select('customer_id, items, item_count, estimated_subtotal, updated_at')
                    .in('customer_id', ids);
                if (!quoteErr) {
                    (quotes || []).forEach(function (row) {
                        quoteByCustomer[String(row.customer_id)] = row;
                    });
                } else {
                    console.warn('salesman open quotes:', quoteErr.message);
                }
            }
        } catch (quoteLoadErr) {
            console.warn('salesman open quotes:', quoteLoadErr);
        }
        window._salesmanOpenQuotes = quoteByCustomer;

        grid.innerHTML = '';
        if (!list.length) {
            grid.innerHTML = `<p class="text-sm text-[#6B4423]">${
                salesmanCustomerListTab === 'test' ? 'No test stores.' : 'No customers on this tab.'
            }</p>`;
            return;
        }

        list.forEach(c => {
            const safeName = (c.name || '').replace(/'/g, "\\'");
            const div = document.createElement("div");
            div.style.cssText = "background:#fff;border:3px solid #6B4423;border-radius:12px;padding:1rem;cursor:pointer;position:relative;";
            div.onclick = function (e) {
                if (e.target && e.target.closest && e.target.closest('button')) return;
                e.preventDefault();
                e.stopPropagation();
                showSalesmanCustomerDetail(c);
            };

            const assignedAt = c.assigned_at ? new Date(c.assigned_at) : null;
            const createdAt = c.created_at ? new Date(c.created_at) : null;
            const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
            const isNew = assignedAt && (Date.now() - assignedAt.getTime()) < fiveDaysMs;

            const newBadge = isNew
                ? `<span style="display:inline-block;background:#ea580c;color:#fff;font-size:0.7rem;font-weight:700;padding:0.15rem 0.5rem;border-radius:999px;margin-left:0.4rem;vertical-align:middle;">NEW</span>`
                : '';

            const needsPricing = !c.pricing_approved_at;
            function salesmanDateLabel(d) {
                return d && !isNaN(d.getTime()) ? d.toLocaleDateString() : 'Not recorded';
            }
            const waitFrom = assignedAt || createdAt;
            const waitingDays = (needsPricing && waitFrom && !isNaN(waitFrom.getTime()))
                ? Math.max(0, Math.floor((Date.now() - waitFrom.getTime()) / 86400000))
                : null;
            const pricingBadge = needsPricing
                ? `<div style="margin-top:0.5rem;font-size:0.75rem;font-weight:700;color:#c2410c;">Pricing not approved yet${waitingDays == null ? '' : ' · ' + waitingDays + ' day' + (waitingDays === 1 ? '' : 's')}</div>`
                : '';
            const timingLine = `<div style="margin-top:0.35rem;font-size:0.75rem;color:#6B4423;">Account ${salesmanDateLabel(createdAt)} · Assigned ${salesmanDateLabel(assignedAt)}</div>`;

            const showCommission = (typeof canEditCustomerCommission === 'function' && canEditCustomerCommission())
                && c.salesman_commission_percent != null
                && c.salesman_commission_percent !== ''
                && Number(c.salesman_commission_percent) > 0;
            const quote = quoteByCustomer[String(c.id)] || null;
            const quoteCount = quote
                ? (Number(quote.item_count) || (Array.isArray(quote.items) ? quote.items.length : 0))
                : 0;
            const quoteBtn = quoteCount > 0
                ? `<button type="button" onclick="event.stopPropagation(); openSalesmanCustomerQuoteModal('${String(c.id).replace(/'/g, '')}')"
                    style="width:100%;background:#fff;color:#1E4D2B;border:2px solid #6B4423;padding:0.55rem;border-radius:8px;font-weight:700;margin-top:0.5rem;">
                    View Quote · ${quoteCount} item${quoteCount === 1 ? '' : 's'}
                   </button>`
                : '';
            const commissionBadge = showCommission
                ? `<div style="position:absolute;top:0.45rem;right:0.45rem;padding:0.1rem 0.4rem;background:#fff7ed;border:1.5px solid #c2410c;border-radius:999px;color:#c2410c;font-size:0.62rem;font-weight:800;line-height:1.2;white-space:nowrap;">${Number(c.salesman_commission_percent)}%</div>`
                : '';

            div.innerHTML = `
                ${commissionBadge}
                <div style="font-weight:700;color:#1E4D2B;margin-bottom:0.3rem;padding-right:${showCommission ? '2.6rem' : '0'};">
                    ${escapeHtml(c.company || c.name || '')}${newBadge}
                </div>
                <div style="color:#6B4423;font-size:0.85rem;margin-bottom:0.4rem;">
                    ${c.company && c.name && c.company !== c.name ? escapeHtml(c.name) : ''}
                </div>
                <div style="color:#6B4423;font-size:0.8rem;margin-bottom:0.6rem;">
                    ${escapeHtml(c.territory || c.status || '')}
                </div>
                ${timingLine}
                ${pricingBadge}
                ${quoteBtn}
                ${needsPricing ? `<button type="button" onclick="event.stopPropagation(); openSetCustomerPricingFromCard('${String(c.id || '').replace(/'/g, "\\'")}')"
                    style="width:100%;background:#1E4D2B;color:#d4b78f;border:2px solid #6B4423;padding:0.55rem;border-radius:8px;font-weight:700;margin-top:0.5rem;">
                    Set Customer Pricing
                </button>` : ''}
                <button type="button" class="view-customer-btn"
                    style="width:100%;background:#fff;color:#1E4D2B;border:2px solid #6B4423;padding:0.55rem;border-radius:8px;font-weight:700;margin-top:0.5rem;">
                    View Customer
                </button>
                <button type="button" onclick="event.stopPropagation(); placeOrderForCustomer('${safeName}')"
                    style="width:100%;background:#1E4D2B;color:#d4b78f;border:2px solid #6B4423;padding:0.55rem;border-radius:8px;font-weight:700;margin-top:0.5rem;">
                    Place Order
                </button>
            `;

            const viewBtn = div.querySelector('.view-customer-btn');
            if (viewBtn) {
                viewBtn.onclick = function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    showSalesmanCustomerDetail(c);
                };
            }
            grid.appendChild(div);
        });
    } catch (err) {
        console.error(err);
        grid.innerHTML = `<p class="text-sm text-red-600">Error loading customers.</p>`;
    }
}

function orderMatchesCustomer(order, customer) {
    if (!order || !customer) return false;
    if (customer.id && order.customer_id && String(order.customer_id) === String(customer.id)) return true;
    const email = (customer.email || '').toLowerCase().trim();
    const orderEmail = (order.customer_email || '').toLowerCase().trim();
    if (email && orderEmail && email === orderEmail) return true;
    const name = (customer.name || '').toLowerCase().trim();
    const orderName = (order.customer_name || order.customer || '').toLowerCase().trim();
    if (name && orderName && name === orderName) return true;
    return false;
}

async function renderCustomerOrdersOnSalesmanModal(customer) {
    const modal = document.getElementById('salesman-customer-modal');
    if (!modal || !customer) return;
    let wrap = document.getElementById('sc-orders-wrap');
    if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'sc-orders-wrap';
        wrap.className = 'mt-4 pt-4 border-t border-[#d4b78f]';
        const notesEl = document.getElementById('sc-notes');
        if (notesEl && notesEl.parentElement) notesEl.parentElement.appendChild(wrap);
        else modal.appendChild(wrap);
    }
    wrap.innerHTML = '<p class="text-sm font-semibold text-[#1E4D2B] mb-2">Orders</p><p class="text-xs text-[#6B4423]">Loading…</p>';
    try {
        const { data, error } = await supabaseClient
            .from('orders')
            .select('id, invoice_number, customer_id, customer_name, customer_email, status, submitted_at')
            .order('submitted_at', { ascending: false });
        if (error) throw error;
        const rows = (data || []).filter(o => orderMatchesCustomer(o, customer));
        let html = '<p class="text-sm font-semibold text-[#1E4D2B] mb-1">Orders</p>';
        if (!rows.length) {
            html += '<p class="text-xs text-[#6B4423]">No orders for this customer yet.</p>';
        } else {
            html += '<select id="sc-orders-select" class="w-full border-2 border-[#6B4423] rounded-xl px-3 py-2 text-sm" onchange="onSalesmanCustomerOrderPicked(this)">' +
                '<option value="">View order — date and invoice #</option>' +
                rows.map(function (o) {
                    const inv = (typeof displayInvoiceNumber === 'function') ? displayInvoiceNumber(o) : (o.invoice_number || o.id);
                    const when = o.submitted_at ? new Date(o.submitted_at).toLocaleDateString() : '';
                    return '<option value="' + escapeHtml(String(o.id || '')) + '">' +
                        escapeHtml(when) + ' · ' + escapeHtml(String(inv)) + '</option>';
                }).join('') +
                '</select>';
        }
        wrap.innerHTML = html;
    } catch (err) {
        console.error(err);
        wrap.innerHTML = '<p class="text-sm text-red-600">Could not load orders.</p>';
    }
}

function onSalesmanCustomerOrderPicked(sel) {
    const id = sel && sel.value ? sel.value : '';
    if (!id) return;
    if (typeof openSalesmanOrderInvoice === 'function') openSalesmanOrderInvoice(id);
    sel.selectedIndex = 0;
}

function viewSalesmanCustomerOrders() {
    const modal = document.getElementById('salesman-customer-modal');
    let customer = null;
    try { customer = JSON.parse(modal?.dataset?.customerJson || 'null'); } catch (e) { customer = null; }
    if (!customer) {
        alert('Could not load customer.');
        return;
    }
    window._orderHistoryCustomerId = customer.id || '';
    window._orderHistoryCustomerName = customer.name || '';
    if (typeof hideSalesmanCustomerModal === 'function') hideSalesmanCustomerModal();
    const histBtn = document.querySelector('.tab-btn[data-tab="order-history"]');
    if (histBtn) histBtn.click();
    const filterEl = document.getElementById('order-history-customer-filter');
    if (filterEl && customer.name) {
        if (![...filterEl.options].some(o => o.value === customer.name)) {
            const opt = document.createElement('option');
            opt.value = customer.name;
            opt.textContent = customer.name;
            filterEl.appendChild(opt);
        }
        filterEl.value = customer.name;
    }
    if (typeof renderMyOrders === 'function') renderMyOrders();
}

function renderAttachOpenOrder(customer) {
    const modal = document.getElementById('salesman-customer-modal');
    if (!modal || !customer || !customer.id) return;

    let wrap = document.getElementById('sc-attach-order-wrap');
    if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'sc-attach-order-wrap';
        wrap.className = 'mt-4 pt-4 border-t border-[#d4b78f]';
        const notesEl = document.getElementById('sc-notes');
        if (notesEl && notesEl.parentElement) {
            notesEl.parentElement.appendChild(wrap);
        } else {
            modal.appendChild(wrap);
        }
    }

    wrap.innerHTML =
        '<p class="text-sm font-semibold text-[#1E4D2B] mb-1">Attach open order</p>' +
        '<p class="text-xs text-[#6B4423] mb-2">Enter an invoice like DN-AKC95 from a walk-in order. It will show on this customer.</p>' +
        '<div class="flex items-center gap-2">' +
            '<input id="sc-attach-invoice" type="text" placeholder="DN-XXXXX" autocomplete="off" ' +
                'class="border-2 border-[#6B4423] rounded-xl px-3 py-2 text-sm flex-1">' +
            '<button type="button" onclick="attachOpenOrderToCustomer()" ' +
                'class="px-4 py-2 bg-[#1E4D2B] text-[#d4b78f] rounded-xl text-sm font-semibold">Attach</button>' +
        '</div>' +
        '<p id="sc-attach-status" class="text-xs text-[#6B4423] mt-2"></p>';
}

async function attachOpenOrderToCustomer() {
    const modal = document.getElementById('salesman-customer-modal');
    const customerId = modal && modal.dataset ? modal.dataset.customerId : '';
    let customer = null;
    try { customer = JSON.parse(modal?.dataset?.customerJson || 'null'); } catch (e) { customer = null; }
    const invoice = (document.getElementById('sc-attach-invoice')?.value || '').trim().toUpperCase();
    const statusEl = document.getElementById('sc-attach-status');
    if (!customerId || !customer) {
        alert('Missing customer.');
        return;
    }
    if (!invoice) {
        alert('Enter an invoice number.');
        return;
    }
    try {
        const { data: row, error: findErr } = await supabaseClient
            .from('orders')
            .select('id, invoice_number, customer_id, customer_name')
            .ilike('invoice_number', invoice)
            .maybeSingle();
        if (findErr) throw findErr;
        if (!row) {
            alert('No order found for ' + invoice + '.');
            return;
        }
        if (row.customer_id && String(row.customer_id) !== String(customerId)) {
            if (!confirm('That invoice is already on another customer. Move it here?')) return;
        }
        const { error: updErr } = await supabaseClient
            .from('orders')
            .update({
                customer_id: customerId,
                customer_name: customer.name || row.customer_name,
                customer_email: (customer.email || '').toLowerCase() || null,
                customer_company: customer.company || null,
                salesman_commission_percent: (customer.salesman_commission_percent != null && customer.salesman_commission_percent !== '')
                    ? Number(customer.salesman_commission_percent)
                    : null
            })
            .eq('id', row.id);
        if (updErr) throw updErr;
        if (statusEl) statusEl.textContent = invoice + ' attached to ' + (customer.name || 'this customer') + '.';
        if (typeof renderMyOrders === 'function') renderMyOrders();
        alert(invoice + ' is now on ' + (customer.name || 'this customer') + '.');
    } catch (err) {
        console.error(err);
        alert('Could not attach order.\n' + (err.message || ''));
    }
}

function canPlaceOpenOrder() {
    const seat = (typeof getOperatingSalesmanEmail === 'function')
        ? getOperatingSalesmanEmail()
        : '';
    return seat === 'jackerman@donegalnatural.com';
}

function updateOpenOrderButtonVisibility() {
    const btn = document.getElementById('salesman-open-order-btn');
    if (!btn) return;
    btn.style.display = canPlaceOpenOrder() ? '' : 'none';
}

let salesmanCustomerListTab = 'live';

function isJonathanSalesmanView() {
    const user = getCurrentUser() || currentUser;
    const email = (user && user.email ? String(user.email) : '').toLowerCase().trim();
    return email === 'jackerman@donegalnatural.com' || !!(user && user.isViewAs) || !!localStorage.getItem('originalAdminUser');
}

function isJonathanTestCustomer(c) {
    const name = String((c && c.name) || '').toLowerCase();
    const company = String((c && c.company) || '').toLowerCase();
    const email = String((c && c.email) || '').toLowerCase().trim();
    if (email === 'jackerman@donegalnatural.com') return true;
    if (name.includes('admin test store') || company.includes('admin test store')) return true;
    if (name.includes('customer view') || company.includes('customer view')) return true;
    if (name.includes('test store') || company.includes('test store')) return true;
    return false;
}

function setSalesmanCustomerListTab(tab) {
    salesmanCustomerListTab = (tab === 'test') ? 'test' : 'live';
    if (typeof renderCustomers === 'function') renderCustomers();
}

function updateSalesmanCustomerListTabs() {
    const wrap = document.getElementById('salesman-customer-list-tabs');
    const liveBtn = document.getElementById('sm-cust-tab-live');
    const testBtn = document.getElementById('sm-cust-tab-test');
    if (!wrap) return;
    const show = typeof isJonathanSalesmanView === 'function' && isJonathanSalesmanView();
    wrap.style.display = show ? '' : 'none';
    if (!show) return;
    const on = 'px-3 py-1 text-xs font-semibold rounded-full border-2 border-[#1E4D2B] bg-[#1E4D2B] text-[#d4b78f]';
    const off = 'px-3 py-1 text-xs font-semibold rounded-full border-2 border-[#6B4423] text-[#6B4423] hover:bg-[#f8f4eb]';
    if (liveBtn) liveBtn.className = salesmanCustomerListTab === 'test' ? off : on;
    if (testBtn) testBtn.className = salesmanCustomerListTab === 'test' ? on : off;
}

function canEditCustomerCommission() {
    const user = getCurrentUser() || currentUser;
    const email = (user && user.email ? String(user.email) : '').toLowerCase().trim();
    return email === 'jackerman@donegalnatural.com' || !!(user && user.isViewAs) || !!localStorage.getItem('originalAdminUser');
}

function renderSalesmanCommissionEditor(customer) {
    let wrap = document.getElementById('sc-commission-wrap');
    if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'sc-commission-wrap';
        wrap.className = 'mt-4 pt-4 border-t border-[#d4b78f]';
        const notesEl = document.getElementById('sc-notes');
        if (notesEl && notesEl.parentElement) {
            notesEl.parentElement.appendChild(wrap);
        }
    }
    if (!wrap) return;

    const current = customer.salesman_commission_percent;
    const hasCustom = current != null && current !== '' && !isNaN(Number(current));

    if (!canEditCustomerCommission()) {
        wrap.innerHTML = hasCustom
            ? ('<p class="text-sm font-extrabold text-orange-700">Commission ' +
                escapeHtml(String(Number(current))) + '%</p>')
            : '';
        return;
    }

    wrap.innerHTML =
        '<p class="text-sm font-semibold text-[#1E4D2B] mb-1">Salesman commission</p>' +
        '<p class="text-xs text-[#6B4423] mb-2">Leave blank for the default 5%. Use 20 for a 20% customer.</p>' +
        '<div class="flex items-center gap-2">' +
            '<input id="sc-commission-input" type="text" inputmode="decimal" ' +
                'name="salesman_commission_pct" autocomplete="off" ' +
                'data-1p-ignore="true" data-lpignore="true" data-form-type="other" ' +
                'value="' + (hasCustom ? escapeHtml(String(Number(current))) : '') + '" ' +
                'placeholder="Default" ' +
                'class="border-2 border-[#6B4423] rounded-xl px-3 py-2 text-sm w-28">' +
            '<span class="text-sm font-semibold text-[#6B4423]">%</span>' +
            '<button type="button" onclick="saveSalesmanCustomerCommission()" ' +
                'class="px-4 py-2 bg-[#1E4D2B] text-[#d4b78f] rounded-xl text-sm font-semibold">Save</button>' +
        '</div>';
}

async function saveSalesmanCustomerCommission() {
    const modal = document.getElementById('salesman-customer-modal');
    const id = modal && modal.dataset ? modal.dataset.customerId : '';
    if (!id) {
        alert('Missing customer.');
        return;
    }
    const raw = (document.getElementById('sc-commission-input')?.value || '').trim();
    let value = null;
    if (raw !== '') {
        value = parseFloat(raw);
        if (isNaN(value) || value < 0 || value > 100) {
            alert('Enter a commission between 0 and 100, or leave blank for default.');
            return;
        }
    }
    try {
        const { error } = await supabaseClient
            .from('customers')
            .update({ salesman_commission_percent: value })
            .eq('id', id);
        if (error) throw error;
        const { error: orderErr } = await supabaseClient
            .from('orders')
            .update({ salesman_commission_percent: value })
            .eq('customer_id', id);
        if (orderErr) throw orderErr;
        let customer = null;
        try { customer = JSON.parse(modal.dataset.customerJson || 'null'); } catch (e) { customer = null; }
        if (customer) {
            customer.salesman_commission_percent = value;
            modal.dataset.customerJson = JSON.stringify(customer);
        }
        if (typeof renderCustomers === 'function') renderCustomers();
        alert(value == null ? 'Commission reset to default.' : ('Commission set to ' + value + '%.'));
    } catch (err) {
        console.error(err);
        alert('Could not save commission.\n' + (err.message || ''));
    }
}

async function checkNewAssignedCustomers() {
    const user = getCurrentUser() || currentUser;
    if (!user || !user.email) return;
    if (user.isViewAs || localStorage.getItem('originalAdminUser')) return;

    const email = (user.email || '').toLowerCase().trim();
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

    try {
        const { data, error } = await supabaseClient
            .from('customers')
            .select('id, name, company, assigned_at, pricing_approved_at')
            .eq('salesman_email', email)
            .gte('assigned_at', fiveDaysAgo)
            .order('assigned_at', { ascending: false });

        if (error) throw error;
        if (!data || data.length === 0) return;

        const seenKey = 'seenNewCustomers_' + email;
        const seen = JSON.parse(localStorage.getItem(seenKey) || '[]');
        const fresh = data.filter(c => !seen.includes(c.id));

        if (fresh.length === 0) return;

        const list = document.getElementById('new-customers-list');
        const modal = document.getElementById('new-customers-modal');
        if (!list || !modal) return;

        list.innerHTML = fresh.map(c => `
            <div class="border-2 border-[#6B4423] rounded-xl px-4 py-3">
                <p class="font-bold brand-green">${escapeHtml(c.name || '')}</p>
                <p class="text-sm text-[#6B4423]">${escapeHtml(c.company || '')}</p>
                ${!c.pricing_approved_at
                    ? `<p class="text-xs text-orange-700 font-semibold mt-1">Pricing not approved yet</p>`
                    : `<p class="text-xs text-green-700 mt-1">Pricing approved</p>`}
            </div>
        `).join('');

        modal.classList.remove('hidden');
        window._pendingSeenCustomerIds = fresh.map(c => c.id);
    } catch (err) {
        console.error('New customers check:', err);
    }
}

function dismissNewCustomersModal() {
    const user = getCurrentUser() || currentUser;
    const email = (user?.email || '').toLowerCase().trim();
    const seenKey = 'seenNewCustomers_' + email;
    const seen = JSON.parse(localStorage.getItem(seenKey) || '[]');
    const pending = window._pendingSeenCustomerIds || [];
    localStorage.setItem(seenKey, JSON.stringify([...new Set([...seen, ...pending])]));
    document.getElementById('new-customers-modal')?.classList.add('hidden');
}

function openSalesmanCustomerFromCard(id) {
    const customer = (window._salesmanCustomers || []).find(function (row) {
        return String(row.id) === String(id);
    });
    if (!customer) {
        alert('Could not open this customer.');
        return;
    }
    showSalesmanCustomerDetail(customer);
}

async function showSalesmanCustomerDetail(customer) {
    const modal = document.getElementById('salesman-customer-modal');
    if (!modal || !customer) return;

    document.body.appendChild(modal);
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.zIndex = '4000';
    modal.dataset.customerId = customer.id || '';
    modal.dataset.customerJson = JSON.stringify(customer);

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || '—';
    };

    setText('sc-name', customer.name);
    setText('sc-company', customer.company);
    setText('sc-status', customer.status);
    setText('sc-phone', (typeof formatPhoneDisplay === 'function' ? formatPhoneDisplay(customer.phone) : customer.phone) || '—');
    setText('sc-email', customer.email);
    setText('sc-territory', customer.territory);
    setText('sc-shipping', customer.shipping_address || customer.shippingAddress);
    setText('sc-billing', customer.billing_address || customer.billingAddress);
    setText('sc-notes', customer.notes || 'No notes.');

    renderSalesmanCommissionEditor(customer);
    const oldAttach = document.getElementById('sc-attach-order-wrap');
    if (oldAttach) oldAttach.remove();
    renderCustomerOrdersOnSalesmanModal(customer);

    // Pricing status + button area
    let pricingEl = document.getElementById('sc-pricing-status');
    if (!pricingEl) {
        pricingEl = document.createElement('div');
        pricingEl.id = 'sc-pricing-status';
        pricingEl.className = 'mt-4 pt-4 border-t border-[#d4b78f]';
        const notesEl = document.getElementById('sc-notes');
        if (notesEl && notesEl.parentElement) {
            notesEl.parentElement.appendChild(pricingEl);
        } else {
            modal.querySelector('.space-y-4, .p-8, div')?.appendChild(pricingEl);
        }
    }

    if (customer.pricing_approved_at) {
        const when = new Date(customer.pricing_approved_at).toLocaleDateString();
        pricingEl.innerHTML = `
            <p class="text-sm font-semibold text-green-700">
                <i class="fas fa-check-circle mr-1"></i>
                Pricing approved ${when}
            </p>
            <p class="text-xs text-[#6B4423] mt-1 mb-3">Customer can view their price sheet.</p>
            <button type="button"
                    onclick="openCustomerPricingEditor(JSON.parse(document.getElementById('salesman-customer-modal').dataset.customerJson))"
                    class="w-full px-4 py-2.5 border-2 border-[#6B4423] text-[#1E4D2B] rounded-xl font-semibold text-sm hover:bg-[#f8f4eb]">
                Edit Customer Pricing
            </button>
        `;
    } else {
        const hasSheet = await salesmanHasApprovedPriceSheet();
        if (hasSheet) {
            pricingEl.innerHTML = `
                <p class="text-sm font-semibold text-orange-700 mb-2">
                    Pricing not approved yet
                </p>
                <p class="text-xs text-[#6B4423] mb-3">
                    Attach your approved price sheet so this customer can see pricing.
                </p>
                <button type="button"
                        onclick="approveCustomerPricing()"
                        class="w-full px-4 py-2.5 bg-[#1E4D2B] text-[#d4b78f] rounded-xl font-semibold text-sm">
                    Set/Edit Pricing for This Customer
                </button>
            `;
        } else {
            pricingEl.innerHTML = `
                <p class="text-sm font-semibold text-orange-700 mb-2">
                    Pricing not available yet
                </p>
                <p class="text-xs text-[#6B4423] mb-3">
                    Your initial pricing sheet must be approved by admin before you can approve pricing for customers.
                </p>
                <button type="button" disabled
                        class="w-full px-4 py-2.5 bg-gray-300 text-gray-500 rounded-xl font-semibold text-sm cursor-not-allowed">
                    Approve Pricing (requires your approved sheet)
                </button>
            `;
        }
    }

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

function hideSalesmanCustomerModal() {
    const modal = document.getElementById('salesman-customer-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

function openSetCustomerPricingFromCard(id) {
    const customer = (window._salesmanCustomers || []).find(function (row) {
        return String(row.id) === String(id);
    });
    if (!customer) {
        alert('Could not open this customer.');
        return;
    }
    openCustomerPricingEditor(customer);
}

async function approveCustomerPricing() {
    // Legacy entry point — open the full customer pricing editor instead
    const modal = document.getElementById('salesman-customer-modal');
    let customer = null;
    try {
        customer = JSON.parse(modal?.dataset?.customerJson || 'null');
    } catch (e) {
        customer = null;
    }
    if (!customer) {
        alert('Could not load customer.');
        return;
    }
    openCustomerPricingEditor(customer);
}

async function openCustomerPricingEditor(customer) {
    if (!customer || !customer.id) {
        alert('Missing customer.');
        return;
    }

    const hasSheet = await salesmanHasApprovedPriceSheet();
    if (!hasSheet) {
        alert('Your initial pricing sheet must be approved by admin before you can set customer pricing.');
        return;
    }

    window._customerPricingTarget = customer;
    window._customerPricingDraft = {};
    window._customerPricingBase = {};
    window._customerPriceExpanded = window._customerPriceExpanded || {};

    const label = document.getElementById('cp-customer-label');
    if (label) {
        label.textContent = (customer.name || 'Customer') +
            (customer.company ? ' · ' + customer.company : '');
    }

    const bulkPct = document.getElementById('cp-bulk-pct');
    if (bulkPct) bulkPct.value = '';

    const list = document.getElementById('customer-pricing-list');
    if (list) list.innerHTML = `<p class="text-sm text-[#6B4423]">Loading price sheet…</p>`;

    const modal = document.getElementById('customer-pricing-modal');
    if (modal) {
        document.body.appendChild(modal);
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.style.position = 'fixed';
        modal.style.inset = '0';
        modal.style.zIndex = '5000';
    }

    await renderCustomerPricingEditor();
}

function hideCustomerPricingModal() {
    const modal = document.getElementById('customer-pricing-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
    window._customerPricingTarget = null;
    window._customerPricingDraft = {};
    window._customerPricingBase = {};
}

async function loadSalesmanBasePrices(customer) {
    const assigned = String(
        (customer && (customer.salesman_email || customer.salesmanEmail)) || ''
    ).toLowerCase().trim();
    const fallback = (typeof getOperatingSalesmanEmail === 'function')
        ? getOperatingSalesmanEmail()
        : String(((getCurrentUser() || currentUser || {}).email) || '').toLowerCase().trim();
    const email = assigned || fallback;
    if (!email) return {};

    try {
        const { data: sheet } = await supabaseClient
            .from('salesman_price_sheets')
            .select('prices, display_names')
            .eq('salesman_email', email)
            .maybeSingle();

        window._customerPricingDisplayNames = (sheet && sheet.display_names && typeof sheet.display_names === 'object')
            ? sheet.display_names
            : {};
        if (sheet && sheet.prices && typeof sheet.prices === 'object') {
            return sheet.prices;
        }
    } catch (e) {
        console.warn('loadSalesmanBasePrices:', e);
    }
    return {};
}

async function loadCustomerPrices(customerId) {
    if (!customerId) return null;
    try {
        const { data } = await supabaseClient
            .from('customer_price_sheets')
            .select('prices')
            .eq('customer_id', customerId)
            .maybeSingle();
        if (data && data.prices && typeof data.prices === 'object') {
            return data.prices;
        }
    } catch (e) {
        console.warn('loadCustomerPrices:', e);
    }
    return null;
}

async function renderCustomerPricingEditor() {
    const container = document.getElementById('customer-pricing-list');
    if (!container) return;

    if (typeof PRODUCT_CATALOG === 'undefined') {
        container.innerHTML = `<p class="text-red-600">PRODUCT_CATALOG not found.</p>`;
        return;
    }

    const customer = window._customerPricingTarget;
    if (!customer) {
        container.innerHTML = `<p class="text-sm text-[#6B4423]">No customer selected.</p>`;
        return;
    }

    const basePrices = await loadSalesmanBasePrices(customer);
    const existingCustomer = await loadCustomerPrices(customer.id);

    window._customerPricingBase = basePrices || {};
    if (!window._customerPricingDraft) window._customerPricingDraft = {};

    function onSalesmanSheet(name) {
        return !!(name && basePrices && basePrices[name] != null && basePrices[name] !== '');
    }
    function onStoreSheet(name) {
        return !!(name && existingCustomer && existingCustomer[name] != null && existingCustomer[name] !== '');
    }

    PRODUCT_CATALOG.forEach(function (p) {
        const name = p && p.name;
        if (!name || window._customerPricingDraft[name] != null) return;
        if (!onSalesmanSheet(name) && !onStoreSheet(name)) return;
        if (onStoreSheet(name)) {
            window._customerPricingDraft[name] = Number(existingCustomer[name]);
        } else {
            window._customerPricingDraft[name] = Number(basePrices[name]);
        }
    });

    const grouped = {};
    const sheetOrder = [
        'Bully Sticks', 'Jerky', 'Ears', 'Cow Cheeks', 'Ox Tails', 'Rabbit',
        'Duck and Goose', 'Beef', 'Lamb', 'Buffalo', 'Chicken', 'Braided',
        'Pressed Bones', 'Retrievers', "Twisty Q's and Natural Munchy Sticks",
        "Binkey's", 'Other'
    ];
    function addPricingRow(name, price) {
        const cats = (typeof brianPackCategories === 'function' && brianPackCategories(name)) || ['Other'];
        const cat = (cats && cats[0]) || 'Other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push({
            name: name,
            category: cat,
            caseSize: '',
            unitPrice: Number(price),
            isMarketPrice: false
        });
    }
    Object.keys(basePrices || {}).forEach(function (name) {
        if (!name || !onSalesmanSheet(name)) return;
        if (window._customerPricingDraft[name] == null) {
            window._customerPricingDraft[name] = Number(basePrices[name]);
        }
        addPricingRow(name, window._customerPricingDraft[name]);
    });
    Object.keys(existingCustomer || {}).forEach(function (name) {
        if (!name || !onStoreSheet(name) || !onSalesmanSheet(name)) return;
        if (grouped[Object.keys(grouped).find(function (cat) {
            return grouped[cat].some(function (row) { return row.name === name; });
        }) || '']) return;
        if (window._customerPricingDraft[name] == null) {
            window._customerPricingDraft[name] = Number(existingCustomer[name]);
        }
        addPricingRow(name, window._customerPricingDraft[name]);
    });
    Object.keys(grouped).forEach(function (cat) {
        grouped[cat].sort(function (a, b) {
            return salesmanSheetItemKey(a.name).localeCompare(salesmanSheetItemKey(b.name));
        });
    });
    const categoryOrder = sheetOrder.filter(function (cat) {
        return grouped[cat] && grouped[cat].length;
    });

    if (!window._customerPriceExpanded) window._customerPriceExpanded = {};
    categoryOrder.forEach(cat => {
        if (window._customerPriceExpanded[cat] === undefined) {
            window._customerPriceExpanded[cat] = (cat === 'Bully Sticks');
        }
    });

    let html = '';
    categoryOrder.forEach(cat => {
        const items = grouped[cat];
        const isOpen = !!window._customerPriceExpanded[cat];
        const safeCat = cat.replace(/'/g, "\\'");

        html += `
            <div class="mb-3 border-2 border-[#6B4423] rounded-2xl overflow-hidden">
                <button type="button"
                        onclick="toggleCustomerPriceCategory('${safeCat}')"
                        class="w-full flex items-center justify-between gap-3 px-4 py-3 bg-[#1E4D2B] text-[#d4b78f] text-left hover:bg-[#254a2f]">
                    <span class="font-bold text-sm">
                        <i class="fas fa-chevron-${isOpen ? 'down' : 'right'} text-xs mr-2"></i>
                        ${cat}
                    </span>
                    <span class="text-xs opacity-90">${items.length} product${items.length !== 1 ? 's' : ''}</span>
                </button>
                <div class="cp-cat-body ${isOpen ? '' : 'hidden'} space-y-2 p-3 bg-[#f8f4eb]">
        `;

        items.forEach(p => {
            const base = (basePrices[p.name] != null)
                ? Number(basePrices[p.name])
                : (p.isMarketPrice ? null : Number(p.unitPrice));
            const draft = window._customerPricingDraft[p.name];
            const startVal = (draft != null && !isNaN(Number(draft)))
                ? Number(draft).toFixed(2)
                : (base != null ? Number(base).toFixed(2) : '');
            const baseLabel = base != null ? ('$' + Number(base).toFixed(2)) : 'Market';
            const safeName = p.name.replace(/"/g, '&quot;');
            const safeNameJs = p.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            const nickMap = window._customerPricingDisplayNames || {};
            const shownName = String(nickMap[p.name] || p.name).trim();
            const catalogNote = shownName !== p.name ? ('Catalog: ' + p.name) : '';

            html += `
                <div class="bg-white border border-[#d4b78f] rounded-xl p-3 flex flex-wrap items-center gap-3"
                     data-cp-name="${safeName}">
                    <div class="flex-1 min-w-[160px]">
                        <p class="text-sm font-semibold brand-green">${escapeHtml(shownName)}</p>
                        <p class="text-xs text-[#6B4423]">${catalogNote ? escapeHtml(catalogNote) + ' · ' : ''}${escapeHtml(p.caseSize || '')} · Your base: ${escapeHtml(baseLabel)}</p>
                    </div>
                    <div class="flex items-center gap-2 flex-wrap">
                        <label class="text-xs text-[#6B4423] whitespace-nowrap">Customer price</label>
                        <div class="flex items-center border-2 border-[#6B4423] rounded-lg overflow-hidden bg-white">
                            <span class="px-2 py-1.5 text-sm font-semibold text-[#6B4423] bg-[#f8f4eb] border-r border-[#d4b78f] select-none">$</span>
                            <input type="number"
                                   step="0.01"
                                   min="0"
                                   value="${startVal}"
                                   class="cp-price-input w-20 border-0 px-2 py-1.5 text-sm font-semibold focus:outline-none focus:ring-0"
                                   data-name="${safeName}"
                                   data-base="${base === null || base === undefined ? '' : base}"
                                   oninput="onCustomerPriceInput(this)">
                        </div>
                        <span class="cp-flag text-xs text-red-600 font-semibold hidden">±5% from base</span>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    container.querySelectorAll('.cp-price-input').forEach(inp => {
        flagCustomerPrice(inp);
    });

    updateCustomerPricingSummary();
}

function toggleCustomerPriceCategory(cat) {
    if (!window._customerPriceExpanded) window._customerPriceExpanded = {};
    window._customerPriceExpanded[cat] = !window._customerPriceExpanded[cat];
    renderCustomerPricingEditor();
}

function expandAllCustomerPriceCategories(open) {
    if (!window._customerPriceExpanded) window._customerPriceExpanded = {};
    if (typeof PRODUCT_CATALOG !== 'undefined') {
        PRODUCT_CATALOG.forEach(p => {
            const cat = p.category || 'Other';
            window._customerPriceExpanded[cat] = !!open;
        });
    }
    renderCustomerPricingEditor();
}

function applyCustomerPricingBulkPercent() {
    const box = document.getElementById('cp-bulk-pct');
    const pct = parseFloat(box && box.value);
    if (isNaN(pct)) {
        alert('Bulk % is optional. Enter a number and click Apply, or skip it and click Assign Pricing to Customer.');
        return;
    }
    if (pct === 0) {
        alert('Enter a percent other than 0.');
        return;
    }
    const inputs = document.querySelectorAll('#customer-pricing-list .cp-price-input');
    if (!inputs.length) {
        alert('Price sheet is still loading.');
        return;
    }
    const label = (pct > 0 ? '+' : '') + pct + '%';
    if (!confirm('Apply ' + label + ' to every price on this customer sheet?\n\nThis only changes the numbers on screen. Click Assign Pricing to Customer to write them.\nApplying twice compounds.')) {
        return;
    }
    if (!window._customerPricingDraft) window._customerPricingDraft = {};
    const factor = 1 + (pct / 100);
    let changed = 0;
    inputs.forEach(function (el) {
        const current = parseFloat(el.value);
        if (isNaN(current) || current < 0) return;
        const next = Math.round(current * factor * 100) / 100;
        el.value = next.toFixed(2);
        const name = el.getAttribute('data-name');
        if (name) window._customerPricingDraft[name] = next;
        if (typeof flagCustomerPrice === 'function') flagCustomerPrice(el);
        changed += 1;
    });
    if (typeof updateCustomerPricingSummary === 'function') updateCustomerPricingSummary();
    alert('Applied ' + label + ' to ' + changed + ' price(s). Review the sheet, then click Assign Pricing to Customer.');
}

function onCustomerPriceInput(input) {
    if (!window._customerPricingDraft) window._customerPricingDraft = {};
    const name = input.getAttribute('data-name');
    const val = parseFloat(input.value);
    if (name && !isNaN(val) && val >= 0) {
        window._customerPricingDraft[name] = val;
    }
    flagCustomerPrice(input);
    updateCustomerPricingSummary();
}

function flagCustomerPrice(input) {
    // ±5% vs salesman BASE sheet (not catalog)
    const base = parseFloat(input.getAttribute('data-base'));
    const proposed = parseFloat(input.value);
    const row = input.closest('[data-cp-name]');
    const flag = row ? row.querySelector('.cp-flag') : null;
    const wrapper = input.closest('.flex.items-center.border-2') || input;

    if (!flag) return;

    if (!isNaN(base) && base > 0 && !isNaN(proposed)) {
        const pct = Math.abs((proposed - base) / base) * 100;
        if (pct > 5) {
            const signed = ((proposed - base) / base * 100);
            flag.textContent = (signed >= 0 ? '+' : '') + signed.toFixed(1) + '% from your base';
            flag.classList.remove('hidden');
            wrapper.classList.add('border-red-500');
            return;
        }
    }
    flag.classList.add('hidden');
    wrapper.classList.remove('border-red-500');
}

function updateCustomerPricingSummary() {
    const el = document.getElementById('customer-pricing-summary');
    if (!el) return;

    const inputs = document.querySelectorAll('.cp-price-input');
    let outside = 0;
    inputs.forEach(inp => {
        const base = parseFloat(inp.getAttribute('data-base'));
        const proposed = parseFloat(inp.value);
        if (!isNaN(base) && base > 0 && !isNaN(proposed)) {
            const pct = Math.abs((proposed - base) / base) * 100;
            if (pct > 5) outside++;
        }
    });

    if (outside > 0) {
        el.classList.remove('hidden');
        el.innerHTML = `<span class="text-orange-700 font-semibold">${outside} product(s) are outside ±5% of your base sheet.</span> Those will be sent to admin for approval. Prices within ±5% will apply immediately.`;
    } else {
        el.classList.add('hidden');
        el.innerHTML = '';
    }
}

async function saveCustomerPricing() {
    const customer = window._customerPricingTarget;
    if (!customer || !customer.id) {
        alert('No customer selected.');
        return;
    }
    const user = getCurrentUser() || currentUser;
    if (!user) {
        alert('You must be logged in.');
        return;
    }
    const email = (user.email || '').toLowerCase().trim();
    const basePrices = window._customerPricingBase || {};
    const draft = window._customerPricingDraft || {};

    // Build full price map from live inputs (prefer draft map)
    const prices = {};
    const outsideItems = [];
    document.querySelectorAll('.cp-price-input').forEach(inp => {
        const name = inp.getAttribute('data-name');
        const base = parseFloat(inp.getAttribute('data-base'));
        let val = parseFloat(inp.value);
        if (name && draft[name] != null) val = Number(draft[name]);
        if (!name || isNaN(val) || val < 0) return;
        prices[name] = val;
        if (!isNaN(base) && base > 0) {
            const pct = Math.abs((val - base) / base) * 100;
            if (pct > 5) {
                outsideItems.push({
                    product: name,
                    basePrice: base,
                    proposedPrice: val,
                    pctChange: ((val - base) / base) * 100
                });
            }
        }
    });

    if (Object.keys(prices).length === 0) {
        alert('No valid prices to save.');
        return;
    }

    const saveBtn = document.getElementById('customer-pricing-save-btn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving…';
    }

    try {
        if (outsideItems.length === 0) {
            // All within ±5% — write sheet + approve customer immediately
            const { error: upsertErr } = await supabaseClient
                .from('customer_price_sheets')
                .upsert({
                    customer_id: customer.id,
                    salesman_email: email,
                    prices: prices,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'customer_id' });
            if (upsertErr) throw upsertErr;

            const wasLocked = !customer.pricing_approved_at;
            const { data: approvedRows, error: custErr } = await supabaseClient
                .from('customers')
                .update({
                    pricing_approved_at: new Date().toISOString(),
                    pricing_approved_by: user.fullName || user.name || user.email || 'Salesman'
                })
                .eq('id', customer.id)
                .select('id, pricing_approved_at');
            if (custErr) throw custErr;
            if (!approvedRows || !approvedRows.length || !approvedRows[0].pricing_approved_at) {
                throw new Error('The approval did not save. Brian can open the sheet, but his login is not allowed to mark this store approved.');
            }
            if (wasLocked && typeof notifyCustomerPricingReady === 'function') {
                await notifyCustomerPricingReady(customer);
            }

            alert('Customer pricing saved. Customer can now see these prices.');
            hideCustomerPricingModal();

            // Refresh customer detail + list
            customer.pricing_approved_at = new Date().toISOString();
            const detailModal = document.getElementById('salesman-customer-modal');
            if (detailModal) {
                detailModal.dataset.customerJson = JSON.stringify(customer);
                if (typeof showSalesmanCustomerDetail === 'function') {
                    showSalesmanCustomerDetail(customer);
                }
            }
            if (typeof renderCustomers === 'function') renderCustomers();
        } else {
            // Some outside ±5% — create Pending proposal with full map.
            // Do NOT overwrite customer_price_sheets until admin approves.
            const allItems = Object.keys(prices).map(name => {
                const base = basePrices[name] != null ? Number(basePrices[name]) : null;
                const proposed = Number(prices[name]);
                let pctChange = null;
                let outside5 = false;
                if (base != null && base > 0 && !isNaN(proposed)) {
                    pctChange = Number((((proposed - base) / base) * 100).toFixed(2));
                    outside5 = Math.abs(pctChange) > 5;
                }
                return {
                    product: name,
                    basePrice: base,
                    proposedPrice: proposed,
                    pctChange: pctChange,
                    outside5: outside5,
                    customerId: customer.id,
                    customerName: customer.name || '',
                    customerCompany: customer.company || ''
                };
            });

            const { error: propErr } = await supabaseClient
    .from('price_proposals')
    .insert({
        type: 'customerPricing',
        salesman_email: email,
        salesman_name: user.fullName || user.name || 'Salesman',
        status: 'Pending',
        items: allItems,
        overall_notes: 'Customer pricing (full map). Outside ±5%: ' +
            outsideItems.length + ' item(s). Customer: ' +
            (customer.name || customer.id) + ' | id=' + customer.id,
        submitted_at: new Date().toISOString()
    });
            if (propErr) throw propErr;

            alert(
                outsideItems.length + ' product(s) are outside ±5% of your base sheet.\n\n' +
                'Those were sent to admin for approval.\n' +
                'Previous customer prices (if any) are unchanged until admin approves.'
            );
            hideCustomerPricingModal();
        }
    } catch (err) {
        console.error(err);
        alert('Could not save customer pricing.\n' + (err.message || ''));
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Assign Pricing to Customer';
        }
    }
}

window.notifyCustomerPricingReady = notifyCustomerPricingReady;
window.hideSalesmanCustomerQuoteModal = hideSalesmanCustomerQuoteModal;
window.openSalesmanCustomerQuoteModal = openSalesmanCustomerQuoteModal;
window.renderCustomers = renderCustomers;
window.orderMatchesCustomer = orderMatchesCustomer;
window.renderCustomerOrdersOnSalesmanModal = renderCustomerOrdersOnSalesmanModal;
window.onSalesmanCustomerOrderPicked = onSalesmanCustomerOrderPicked;
window.viewSalesmanCustomerOrders = viewSalesmanCustomerOrders;
window.renderAttachOpenOrder = renderAttachOpenOrder;
window.attachOpenOrderToCustomer = attachOpenOrderToCustomer;
window.canPlaceOpenOrder = canPlaceOpenOrder;
window.updateOpenOrderButtonVisibility = updateOpenOrderButtonVisibility;
window.isJonathanSalesmanView = isJonathanSalesmanView;
window.isJonathanTestCustomer = isJonathanTestCustomer;
window.setSalesmanCustomerListTab = setSalesmanCustomerListTab;
window.updateSalesmanCustomerListTabs = updateSalesmanCustomerListTabs;
window.canEditCustomerCommission = canEditCustomerCommission;
window.renderSalesmanCommissionEditor = renderSalesmanCommissionEditor;
window.saveSalesmanCustomerCommission = saveSalesmanCustomerCommission;
window.checkNewAssignedCustomers = checkNewAssignedCustomers;
window.dismissNewCustomersModal = dismissNewCustomersModal;
window.openSalesmanCustomerFromCard = openSalesmanCustomerFromCard;
window.showSalesmanCustomerDetail = showSalesmanCustomerDetail;
window.hideSalesmanCustomerModal = hideSalesmanCustomerModal;
window.openSetCustomerPricingFromCard = openSetCustomerPricingFromCard;
window.approveCustomerPricing = approveCustomerPricing;
window.openCustomerPricingEditor = openCustomerPricingEditor;
window.hideCustomerPricingModal = hideCustomerPricingModal;
window.loadSalesmanBasePrices = loadSalesmanBasePrices;
window.loadCustomerPrices = loadCustomerPrices;
window.renderCustomerPricingEditor = renderCustomerPricingEditor;
window.toggleCustomerPriceCategory = toggleCustomerPriceCategory;
window.expandAllCustomerPriceCategories = expandAllCustomerPriceCategories;
window.applyCustomerPricingBulkPercent = applyCustomerPricingBulkPercent;
window.onCustomerPriceInput = onCustomerPriceInput;
window.flagCustomerPrice = flagCustomerPrice;
window.updateCustomerPricingSummary = updateCustomerPricingSummary;
window.saveCustomerPricing = saveCustomerPricing;
