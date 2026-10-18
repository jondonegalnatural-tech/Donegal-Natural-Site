// Internal portal — ACH bank log and commission totals.
let bankLogYear = new Date().getFullYear();

let bankLogRows = [];

let bankLogExpandedMonth = null;

function calcOrderAmount(o) {
    let sub = 0;
    (o.items || []).forEach(item => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unitPrice ?? item.unit_price ?? item.price) || 0;
        sub += qty * price;
    });
    const shipping = Number(o.shipping_cost) || 0;
    const credit = Number(o.credit) || 0;
    return sub + shipping - credit;
}

function changeBankLogYear(delta) {
    bankLogYear += delta;
    bankLogExpandedMonth = null;
    renderBankLogTable();
}

async function loadAchBankLog() {
    const container = document.getElementById('ach-bank-log-table');
    if (!container) return;

    container.innerHTML = `<p class="text-[#6B4423]"><i class="fas fa-spinner fa-spin mr-2"></i>Loading bank log…</p>`;

    try {
        const { data, error } = await supabaseClient
            .from('orders')
            .select('id, payment_status, payment_method_type, payment_initiated_at, paid_at, amount_paid, refund_amount,items, shipping_cost, credit, customer_name, customer_company, submitted_at')
            .or('payment_method_type.eq.us_bank_account,payment_method_type.eq.customer_balance,payment_method_type.eq.card,payment_status.eq.paid,payment_initiated_at.not.is.null')
            .order('payment_initiated_at', { ascending: false, nullsFirst: false })
            .limit(1000);

        if (error) throw error;

        bankLogRows = data || [];
        bankLogExpandedMonth = null;

        // Default year to current year (or latest year that has data)
        const years = new Set();
        bankLogRows.forEach(o => {
            const d = new Date(o.payment_initiated_at || o.submitted_at || o.paid_at || 0);
            if (!isNaN(d.getTime())) years.add(d.getFullYear());
        });
        if (years.size > 0 && !years.has(bankLogYear)) {
            bankLogYear = Math.max(...years);
        }

        renderBankLogTable();
    } catch (err) {
        console.error('loadAchBankLog error:', err);
        container.innerHTML = `<p class="text-red-600">Failed to load bank log: ${err.message || err}</p>`;
    }
}

function renderBankLogTable() {
    const container = document.getElementById('ach-bank-log-table');
    if (!container) return;

    const yearLabel = document.getElementById('bank-log-year-label');
    if (yearLabel) yearLabel.textContent = String(bankLogYear);

    // Group rows by year-month for the selected year
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const byMonth = {}; // key: 0-11 → { pendingCount, pendingAmt, clearedCount, clearedAmt, rows: [] }

    const yearsWithData = new Set();

    bankLogRows.forEach(o => {
        const initiated = o.payment_initiated_at || o.submitted_at;
        const d = new Date(initiated || o.paid_at || 0);
        if (isNaN(d.getTime())) return;

        const y = d.getFullYear();
        yearsWithData.add(y);
        if (y !== bankLogYear) return;

        const m = d.getMonth();
        if (!byMonth[m]) {
            byMonth[m] = { pendingCount: 0, pendingAmt: 0, clearedCount: 0, clearedAmt: 0, rows: [] };
        }
        const calcAmt = calcOrderAmount(o);
        const paidAmt = Number(o.amount_paid);
        const amount = (!Number.isNaN(paidAmt) && paidAmt > 0) ? paidAmt : calcAmt;
        const isPaid = (o.payment_status || '').toLowerCase() === 'paid';

        byMonth[m].rows.push(o);
        if (isPaid) {
            byMonth[m].clearedCount += 1;
            byMonth[m].clearedAmt += amount;
        } else {
            byMonth[m].pendingCount += 1;
            byMonth[m].pendingAmt += calcAmt;
        }
    });

    // Year nav buttons
    const prevBtn = document.getElementById('bank-log-prev-year');
    const nextBtn = document.getElementById('bank-log-next-year');
    if (prevBtn) {
        const hasPrev = [...yearsWithData].some(y => y < bankLogYear);
        prevBtn.classList.toggle('hidden', !hasPrev);
    }
    if (nextBtn) {
        const hasNext = [...yearsWithData].some(y => y > bankLogYear);
        nextBtn.classList.toggle('hidden', !hasNext);
    }

    const monthsPresent = Object.keys(byMonth).map(Number).sort((a, b) => b - a); // newest first

    if (monthsPresent.length === 0) {
        container.innerHTML = `
            <p class="text-[#6B4423]">No payments recorded for ${bankLogYear}.</p>
            <p class="text-xs text-[#6B4423] mt-2">Card and ACH payments will appear here after they are initiated.</p>
        `;
        return;
    }

    let html = `
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead>
                    <tr class="bg-[#1E4D2B] text-[#d4b78f]">
                        <th class="p-3 text-left">Month</th>
                        <th class="p-3 text-center">Pending #</th>
                        <th class="p-3 text-right">Pending $</th>
                        <th class="p-3 text-center">Cleared #</th>
                        <th class="p-3 text-right">Cleared $</th>
                        <th class="p-3 text-right">Total $</th>
                    </tr>
                </thead>
                <tbody>
    `;

    monthsPresent.forEach(m => {
        const bucket = byMonth[m];
        const totalAmt = bucket.pendingAmt + bucket.clearedAmt;
        const key = bankLogYear + '-' + m;
        const isExpanded = bankLogExpandedMonth === key;

        html += `
            <tr class="border-b border-[#d4b78f] hover:bg-[#f8f4eb] cursor-pointer"
                onclick="toggleBankLogMonth('${key}')">
                <td class="p-3 font-semibold brand-green">
                    <i class="fas fa-chevron-${isExpanded ? 'down' : 'right'} text-xs mr-2"></i>
                    ${monthNames[m]} ${bankLogYear}
                </td>
                <td class="p-3 text-center">${bucket.pendingCount}</td>
                <td class="p-3 text-right ${bucket.pendingAmt > 0 ? 'text-blue-700 font-semibold' : ''}">${fmtMoney(bucket.pendingAmt)}</td>
                <td class="p-3 text-center">${bucket.clearedCount}</td>
                <td class="p-3 text-right ${bucket.clearedAmt > 0 ? 'text-green-700 font-semibold' : ''}">${fmtMoney(bucket.clearedAmt)}</td>
                <td class="p-3 text-right font-bold">${fmtMoney(totalAmt)}</td>
            </tr>
        `;

        if (isExpanded) {
            // Detail header
            html += `
                <tr class="bg-[#f8f1e9]">
                    <td colspan="11" class="p-0">
                        <div class="overflow-x-auto px-2 py-2">
                            <table class="w-full text-xs">
                                <thead>
                                    <tr class="text-[#6B4423]">
                                        <th class="p-2 text-left">Customer</th>
                                        <th class="p-2 text-left">Invoice #</th>
                                        <th class="p-2 text-left">Date Initiated</th>
                                        <th class="p-2 text-center">Method</th>
                                        <th class="p-2 text-center">Status</th>
                                        <th class="p-2 text-right">Pending $</th>
                                        <th class="p-2 text-right">Cleared $</th>
                                        <th class="p-2 text-right">Deposited $</th>
                                        <th class="p-2 text-right">Refunded $</th>
                                        <th class="p-2 text-left">Date Cleared</th>
                                        <th class="p-2 text-center">Refund</th>
                                    </tr>
                                </thead>
                                <tbody>
            `;

            // Sort detail rows: pending first, then by initiated date desc
            const detailRows = bucket.rows.slice().sort((a, b) => {
                const aPaid = (a.payment_status || '').toLowerCase() === 'paid';
                const bPaid = (b.payment_status || '').toLowerCase() === 'paid';
                if (aPaid !== bPaid) return aPaid ? 1 : -1;
                const da = new Date(a.payment_initiated_at || a.submitted_at || 0);
                const db = new Date(b.payment_initiated_at || b.submitted_at || 0);
                return db - da;
            });

                        detailRows.forEach(o => {
                const calcAmt = calcOrderAmount(o);
                const paidAmt = Number(o.amount_paid);
                const clearedAmt = (!Number.isNaN(paidAmt) && paidAmt > 0) ? paidAmt : calcAmt;
                const refundAmt = Number(o.refund_amount) || 0;
                const isPaid = (o.payment_status || '').toLowerCase() === 'paid';
                const customer = o.customer_company || o.customer_name || '—';
                const inv = String(o.id || '').slice(0, 8);
                const method = (o.payment_method_type || '').toLowerCase();
                let methodBadge;
                if (method === 'us_bank_account') {
                    methodBadge = `<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">ACH</span>`;
                } else if (method === 'customer_balance') {
                    methodBadge = `<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">Balance</span>`;
                } else if (method === 'card') {
                    methodBadge = `<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">Card</span>`;
                } else if (method) {
                    methodBadge = `<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">${method}</span>`;
                } else {
                    methodBadge = `<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-500">—</span>`;
                }

                // Phase 2: Stripe fee estimates and Dashboard refund links removed
                let depositDisplay = isPaid ? fmtMoney(clearedAmt) : '—';
                let depositClass = isPaid && clearedAmt > 0 ? 'text-[#1E4D2B] font-semibold' : 'text-gray-400';
                const refundBtn = `<span class="text-gray-300">—</span>`;
                let statusBadge;
                if (refundAmt > 0) {
                    statusBadge = `<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">Refunded</span>`;
                } else if (isPaid) {
                    statusBadge = `<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">Cleared</span>`;
                } else {
                    statusBadge = `<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Pending</span>`;
                }

                html += `
                    <tr class="border-t border-[#e8d9b8]">
                        <td class="p-2">${customer}</td>
                        <td class="p-2 font-mono">${inv}</td>
                        <td class="p-2">${fmtDate(o.payment_initiated_at || o.submitted_at)}</td>
                        <td class="p-2 text-center">${methodBadge}</td>
                        <td class="p-2 text-center">${statusBadge}</td>
                        <td class="p-2 text-right ${!isPaid ? 'text-blue-700 font-semibold' : 'text-gray-400'}">${isPaid ? '$0.00' : fmtMoney(calcAmt)}</td>
                        <td class="p-2 text-right ${isPaid ? 'text-green-700 font-semibold' : 'text-gray-400'}">${isPaid ? fmtMoney(clearedAmt) : '—'}</td>
                        <td class="p-2 text-right ${depositClass}">${depositDisplay}</td>
                        <td class="p-2 text-right ${refundAmt > 0 ? 'text-orange-700 font-semibold' : 'text-gray-400'}">${refundAmt > 0 ? fmtMoney(refundAmt) : '—'}</td>
                        <td class="p-2">${isPaid ? fmtDate(o.paid_at) : '—'}</td>
                        <td class="p-2 text-center">${refundBtn}</td>
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

    html += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
}

function toggleBankLogMonth(key) {
    if (bankLogExpandedMonth === key) {
        bankLogExpandedMonth = null;
    } else {
        bankLogExpandedMonth = key;
    }
    renderBankLogTable();
}

async function updateDashboardAchCounts() {
    const ytdEl = document.getElementById('dash-fin-ytd');
    const mtdEl = document.getElementById('dash-fin-mtd');
    const wtdEl = document.getElementById('dash-fin-wtd');
    const pendingEl = document.getElementById('dash-pending-ach');
    const pendingLabel = document.getElementById('dash-pending-ach-label');

    // ---- YTD / MTD / WTD sales from allOrders ----
    let ytdTotal = 0;
    let mtdTotal = 0;
    let wtdTotal = 0;
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday

    (allOrders || []).forEach(order => {
        if (typeof isTestStoreOrder === 'function' && isTestStoreOrder(order)) return;
        if (!order.items || !Array.isArray(order.items)) return;
        const orderDate = new Date(
            order.submittedAt || order.submitted_at || order.date || now
        );
        if (isNaN(orderDate.getTime())) return;

        const orderTotal = (typeof getOrderSalesTotal === 'function')
            ? getOrderSalesTotal(order)
            : 0;

        if (orderDate >= startOfYear) ytdTotal += orderTotal;
        if (orderDate >= startOfMonth) mtdTotal += orderTotal;
        if (orderDate >= startOfWeek) wtdTotal += orderTotal;
    });

    const fmt = (n) => '$' + Math.round(n).toLocaleString();

    if (ytdEl) ytdEl.textContent = fmt(ytdTotal);
    if (mtdEl) mtdEl.textContent = fmt(mtdTotal);
    if (wtdEl) wtdEl.textContent = fmt(wtdTotal);

    // Month label for Pending ACH (e.g. "Pending ACH (Aug)")
    if (pendingLabel) {
        const mon = now.toLocaleString('en-US', { month: 'short' });
        pendingLabel.textContent = 'Pending ACH (' + mon + ')';
    }

    if (!pendingEl) return;

    // ---- Pending ACH $ for current calendar month ----
    try {
        const { data, error } = await supabaseClient
            .from('orders')
            .select('id, payment_status, payment_initiated_at, submitted_at, payment_method_type, items, shipping_cost, credit')
            .or('payment_method_type.eq.us_bank_account,payment_method_type.eq.customer_balance')
            .limit(500);

        if (error) throw error;

        const rows = data || [];
        let pendingAmount = 0;

        rows.forEach(o => {
            const status = (o.payment_status || '').toLowerCase();
            if (status === 'paid') return;

            const initiated = new Date(o.payment_initiated_at || o.submitted_at || 0);
            if (isNaN(initiated.getTime())) return;
            if (initiated.getFullYear() !== now.getFullYear() || initiated.getMonth() !== now.getMonth()) return;

            let sub = 0;
            (o.items || []).forEach(item => {
                const qty = Number(item.quantity) || 0;
                const price = Number(item.unitPrice ?? item.unit_price ?? item.price) || 0;
                sub += qty * price;
            });
            const shipping = Number(o.shipping_cost) || 0;
            const credit = Number(o.credit) || 0;
            pendingAmount += sub + shipping - credit;
        });

        pendingEl.textContent = fmt(pendingAmount);
    } catch (err) {
        console.error('updateDashboardAchCounts error:', err);
        if (pendingEl) pendingEl.textContent = '—';
    }
}

function openAchLogFiltered(filter) {
    // filter: 'pending' | 'cleared15'
    if (typeof showSection === 'function') showSection('financials');
    setTimeout(() => {
        if (typeof showFinancialsSub === 'function') showFinancialsSub('ach-log');
        setTimeout(() => {
            if (typeof loadAchBankLog === 'function') loadAchBankLog(filter);
        }, 80);
    }, 50);
}

function showFinancialsSub(which) {
    // Hide all Financials sub-panels
    document.querySelectorAll('.financials-sub').forEach(el => el.classList.add('hidden'));

    // Show the selected one
    const target = document.getElementById('financials-' + which);
    if (target) target.classList.remove('hidden');

    // Update sub-nav button styles
    document.querySelectorAll('#financials .flex.flex-wrap.gap-2 > button').forEach(btn => {
        btn.classList.remove('bg-[#1E4D2B]', 'text-[#d4b78f]');
        btn.classList.add('bg-white', 'text-[#6B4423]', 'hover:bg-[#f8f4eb]');
        if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes("'" + which + "'")) {
            btn.classList.remove('bg-white', 'text-[#6B4423]', 'hover:bg-[#f8f4eb]');
            btn.classList.add('bg-[#1E4D2B]', 'text-[#d4b78f]');
        }
    });

    // Load data for the selected sub-panel
        if (which === 'ach-log') {
        if (typeof loadAchBankLog === 'function') {
            setTimeout(() => loadAchBankLog(), 50);
        }
    }
    if (which === 'sales') {
        if (typeof updateReportsSalesSummary === 'function') {
            setTimeout(() => updateReportsSalesSummary(), 50);
        }
        if (typeof renderWeeklyMatrix === 'function') {
            setTimeout(() => renderWeeklyMatrix(), 80);
        }
    }
    if (which === 'profit') {
        if (typeof renderProfitMarginSection === 'function') {
            setTimeout(() => renderProfitMarginSection(), 50);
        }
    }
    if (which === 'commission') {
        if (typeof renderPortalCommissionBlock === 'function') {
            setTimeout(() => renderPortalCommissionBlock(), 50);
        }
    }
}

function commissionSalesmanEmail(order) {
    let email = String((order && (order.salesmanEmail || order.salesman_email)) || '')
        .toLowerCase()
        .trim();
    if (email) return email;
    if (!order || typeof allCustomers === 'undefined' || !Array.isArray(allCustomers)) return '';
    const cid = order.customerId || order.customer_id;
    const cemail = String(order.customerEmail || order.customer_email || '').toLowerCase().trim();
    const match = allCustomers.find(function (c) {
        if (cid && String(c.id) === String(cid)) return true;
        const ce = String(c.email || '').toLowerCase().trim();
        return !!(cemail && ce === cemail);
    });
    return String((match && (match.salesmanEmail || match.salesman_email)) || '')
        .toLowerCase()
        .trim();
}

function isBrianAssignedOrder(order) {
    return commissionSalesmanEmail(order) === 'donegaldogtreats@gmail.com';
}

function commissionSalesmanLabel(order) {
    const email = commissionSalesmanEmail(order);
    const name = String((order && (order.salesman || order.salesmanName || order.salesman_name)) || '').trim();
    if (email === 'donegaldogtreats@gmail.com') return 'Brian Frohne';
    if (email === 'jackerman@donegalnatural.com') return name || 'Jonathan Ackerman';
    if (name && name.toLowerCase() !== 'unassigned') return name;
    if (email && typeof salesmen !== 'undefined' && Array.isArray(salesmen)) {
        const s = salesmen.find(function (row) {
            return String(row.email || '').toLowerCase().trim() === email;
        });
        if (s) {
            return s.name || [s.firstName, s.lastName].filter(Boolean).join(' ') || email;
        }
    }
    return name || email || 'Unassigned';
}

function isJonathanAssignedOrder(order) {
    return commissionSalesmanEmail(order) === 'jackerman@donegalnatural.com';
}

function getSalesmanCommissionPercent(order) {
    if (isBrianAssignedOrder(order)) return 10;
    const raw = order.salesmanCommissionPercent ?? order.salesman_commission_percent ?? order.commissionRate;
    if (raw != null && raw !== '' && !isNaN(Number(raw))) return Number(raw);
    return 0;
}

function getOrderCommissionPercent(order) {
    if (!order) return 5;
    if (isJonathanAssignedOrder(order)) {
        const raw = order.salesmanCommissionPercent ?? order.salesman_commission_percent ?? order.commissionRate;
        if (raw != null && raw !== '' && !isNaN(Number(raw))) return Number(raw);
        return 5;
    }
    return 5;
}

function updatePortalCommissionCard() {
    const card = document.getElementById('dash-portal-commission-card');
    const ytdEl = document.getElementById('dash-commission-ytd');
    const mtdEl = document.getElementById('dash-commission-mtd');
    if (!card) return;

    const tabBtn = document.getElementById('financials-commission-tab-btn');
    if (!isJonathanAdmin()) {
        card.style.display = 'none';
        if (tabBtn) tabBtn.style.display = 'none';
        return;
    }
    card.style.display = '';
    if (tabBtn) tabBtn.style.display = '';

    let ytdCommission = 0;
    let mtdCommission = 0;
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    (allOrders || []).forEach(order => {
        if (typeof isTestStoreOrder === 'function' && isTestStoreOrder(order)) return;
        const status = String(order.status || '').toLowerCase();
        if (status === 'denied' || status === 'cancelled' || status === 'canceled') return;
        if (!order.items || !Array.isArray(order.items)) return;

        const orderDate = new Date(order.submittedAt || order.submitted_at || order.date || now);
        if (isNaN(orderDate.getTime())) return;

        let orderTotal = 0;
        order.items.forEach(item => {
            const qty = parseInt(item.quantity, 10) || 0;
            const unit = typeof getOrderItemUnitPrice === 'function'
                ? getOrderItemUnitPrice(item)
                : (parseFloat(item.unitPrice) || 0);
            orderTotal += qty * unit;
        });

        const rate = getOrderCommissionPercent(order) / 100;

        if (orderDate >= startOfYear) ytdCommission += orderTotal * rate;
        if (orderDate >= startOfMonth) mtdCommission += orderTotal * rate;
    });

    const fmt = (n) => '$' + Math.round(n).toLocaleString();
    if (ytdEl) ytdEl.textContent = fmt(ytdCommission);
    if (mtdEl) mtdEl.textContent = fmt(mtdCommission);

    const panel = document.getElementById('financials-commission');
    if (panel && !panel.classList.contains('hidden') && typeof renderPortalCommissionBlock === 'function') {
        renderPortalCommissionBlock();
    }
}

let commissionPeriod = 'all';

let commissionBreakdown = 'order';

function getOrderSalesTotal(order) {
    let total = 0;
    (order && order.items ? order.items : []).forEach(function (item) {
        const qty = parseInt(item.quantity, 10) || 0;
        const unit = typeof getOrderItemUnitPrice === 'function'
            ? getOrderItemUnitPrice(item)
            : (parseFloat(item.unitPrice) || 0);
        total += qty * unit;
    });
    const shipping = Number(order && (order.shippingCost != null ? order.shippingCost : order.shipping_cost)) || 0;
    const credit = Number(order && order.credit) || 0;
    return Math.max(0, total + shipping - credit);
}

function getCommissionPeriodStart(period) {
    const now = new Date();
    if (period === 'mtd') return new Date(now.getFullYear(), now.getMonth(), 1);
    if (period === 'wtd') {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        return start;
    }
    if (period === 'all') return null;
    return new Date(now.getFullYear(), 0, 1);
}

function listCommissionOrders(period) {
    const start = getCommissionPeriodStart(period || commissionPeriod);
    const rows = [];
    (allOrders || []).forEach(function (order) {
        if (typeof isTestStoreOrder === 'function' && isTestStoreOrder(order)) return;
        const status = String(order.status || '').toLowerCase();
        if (status === 'denied' || status === 'cancelled' || status === 'canceled') return;
        if (!order.items || !Array.isArray(order.items)) return;
        const orderDate = new Date(order.submittedAt || order.submitted_at || order.date || Date.now());
        if (isNaN(orderDate.getTime())) return;
        if (start && orderDate < start) return;
        const sales = getOrderSalesTotal(order);
        const rate = getOrderCommissionPercent(order);
        rows.push({
            order: order,
            date: orderDate,
            sales: sales,
            rate: rate,
            commission: sales * (rate / 100)
        });
    });
    rows.sort(function (a, b) { return b.date - a.date; });
    return rows;
}

function setCommissionPeriod(period) {
    commissionPeriod = period || 'ytd';
    renderPortalCommissionBlock();
}

function showCommissionBreakdown(which) {
    commissionBreakdown = which || 'overview';
    renderPortalCommissionBlock();
}

function formatCommissionMoney(n) {
    return '$' + (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderPortalCommissionBlock() {
    const panel = document.getElementById('financials-commission');
    if (!panel) return;
    if (typeof isJonathanAdmin === 'function' && !isJonathanAdmin()) {
        panel.classList.add('hidden');
        const hideBtn = document.getElementById('financials-commission-tab-btn');
        if (hideBtn) hideBtn.style.display = 'none';
        return;
    }

    document.querySelectorAll('[data-comm-period]').forEach(function (btn) {
        const on = btn.getAttribute('data-comm-period') === commissionPeriod;
        btn.classList.toggle('bg-[#1E4D2B]', on);
        btn.classList.toggle('text-[#d4b78f]', on);
        btn.classList.toggle('bg-white', !on);
        btn.classList.toggle('text-[#6B4423]', !on);
        btn.classList.toggle('hover:bg-[#f8f4eb]', !on);
    });
    document.querySelectorAll('[data-comm-tab]').forEach(function (btn) {
        const on = btn.getAttribute('data-comm-tab') === commissionBreakdown;
        btn.classList.toggle('bg-[#1E4D2B]', on);
        btn.classList.toggle('text-[#d4b78f]', on);
        btn.classList.toggle('bg-white', !on);
        btn.classList.toggle('text-[#6B4423]', !on);
        btn.classList.toggle('hover:bg-[#f8f4eb]', !on);
    });

    const rows = listCommissionOrders(commissionPeriod);
    let sales = 0;
    let commission = 0;
    rows.forEach(function (r) {
        sales += r.sales;
        commission += r.commission;
    });
    const avgRate = sales > 0 ? (commission / sales) * 100 : 0;

    const salesEl = document.getElementById('comm-sum-sales');
    const commEl = document.getElementById('comm-sum-commission');
    const ordersEl = document.getElementById('comm-sum-orders');
    const rateEl = document.getElementById('comm-sum-rate');
    if (salesEl) salesEl.textContent = formatCommissionMoney(sales);
    if (commEl) commEl.textContent = formatCommissionMoney(commission);
    if (ordersEl) ordersEl.textContent = String(rows.length);
    if (rateEl) rateEl.textContent = avgRate.toFixed(1) + '%';

    const body = document.getElementById('commission-breakdown-body');
    if (!body) return;

    if (!rows.length) {
        body.innerHTML = '<p class="text-sm text-[#6B4423] text-center py-6">No commission orders in this period.</p>';
        return;
    }

    if (commissionBreakdown === 'overview') {
        const byRate = {};
        rows.forEach(function (r) {
            const key = String(r.rate);
            if (!byRate[key]) byRate[key] = { rate: r.rate, orders: 0, sales: 0, commission: 0 };
            byRate[key].orders += 1;
            byRate[key].sales += r.sales;
            byRate[key].commission += r.commission;
        });
        const rateRows = Object.keys(byRate).sort(function (a, b) {
            return Number(b) - Number(a);
        }).map(function (k) {
            const g = byRate[k];
            return '<tr class="border-t border-[#d4b78f]">'
                + '<td class="p-3">' + escapeHtml(g.rate) + '%</td>'
                + '<td class="p-3 text-right">' + g.orders + '</td>'
                + '<td class="p-3 text-right">' + formatCommissionMoney(g.sales) + '</td>'
                + '<td class="p-3 text-right font-semibold">' + formatCommissionMoney(g.commission) + '</td>'
                + '</tr>';
        }).join('');
        body.innerHTML =
            '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="bg-[#f8f4eb]">'
            + '<th class="p-3 text-left">Rate used</th>'
            + '<th class="p-3 text-right">Orders</th>'
            + '<th class="p-3 text-right">Sales</th>'
            + '<th class="p-3 text-right">Commission</th>'
            + '</tr></thead><tbody>'
            + rateRows
            + '</tbody></table></div>'
            + '<p class="text-xs text-[#6B4423] mt-3">Same math as the Dashboard card: item subtotal × salesman commission % on the order (default 5%). Shipping and credits are not included.</p>';
        return;
    }

    if (commissionBreakdown === 'salesman') {
        const groups = {};
        rows.forEach(function (r) {
            const o = r.order;
            const email = commissionSalesmanEmail(o);
            const name = commissionSalesmanLabel(o);
            const key = (email || name || 'unassigned').toLowerCase();
            if (!groups[key]) {
                groups[key] = { name: name || 'Unassigned', email: email, orders: 0, sales: 0, commission: 0, stores: {} };
            }
            groups[key].orders += 1;
            groups[key].sales += r.sales;
            groups[key].commission += r.commission;
            const store = String(o.customerCompany || o.customer || o.customerEmail || 'Store').trim();
            groups[key].stores[store] = true;
        });
        const list = Object.keys(groups).map(function (k) { return groups[k]; })
            .sort(function (a, b) { return b.commission - a.commission; });
        let html = '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="bg-[#f8f4eb]">'
            + '<th class="p-3 text-left">Submitted By</th>'
            + '<th class="p-3 text-right">Company Name</th>'
            + '<th class="p-3 text-right">Orders</th>'
            + '<th class="p-3 text-right">Sales</th>'
            + '<th class="p-3 text-right">Commission</th>'
            + '</tr></thead><tbody>';
        list.forEach(function (g) {
            html += '<tr class="border-t border-[#d4b78f]">'
                + '<td class="p-3 font-semibold brand-green">' + escapeHtml(g.name)
                + (g.email ? '<div class="text-xs font-normal text-[#6B4423]">' + escapeHtml(g.email) + '</div>' : '')
                + '</td>'
                + '<td class="p-3 text-right">' + Object.keys(g.stores).length + '</td>'
                + '<td class="p-3 text-right">' + g.orders + '</td>'
                + '<td class="p-3 text-right">' + formatCommissionMoney(g.sales) + '</td>'
                + '<td class="p-3 text-right font-semibold">' + formatCommissionMoney(g.commission) + '</td>'
                + '</tr>';
        });
        html += '</tbody></table></div>';
        body.innerHTML = html;
        return;
    }

    if (commissionBreakdown === 'store') {
        const groups = {};
        rows.forEach(function (r) {
            const o = r.order;
            const company = String(o.customerCompany || '').trim();
            const name = String(o.customer || o.customerName || '').trim();
            const email = String(o.customerEmail || '').trim();
            const key = String(o.customerId || email || company || name || o.id).toLowerCase();
            if (!groups[key]) {
                groups[key] = {
                    store: company || name || 'Store',
                    contact: name,
                    salesman: commissionSalesmanLabel(o) || '—',
                    orders: 0,
                    sales: 0,
                    commission: 0
                };
            }
            groups[key].orders += 1;
            groups[key].sales += r.sales;
            groups[key].commission += r.commission;
        });
        const list = Object.keys(groups).map(function (k) { return groups[k]; })
            .sort(function (a, b) { return b.commission - a.commission; });
        let html = '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="bg-[#f8f4eb]">'
            + '<th class="p-3 text-left">Store</th>'
            + '<th class="p-3 text-left">Salesman</th>'
            + '<th class="p-3 text-right">Orders</th>'
            + '<th class="p-3 text-right">Sales</th>'
            + '<th class="p-3 text-right">Commission</th>'
            + '</tr></thead><tbody>';
        list.forEach(function (g) {
            html += '<tr class="border-t border-[#d4b78f]">'
                + '<td class="p-3 font-semibold brand-green">' + escapeHtml(g.store)
                + (g.contact && g.contact !== g.store ? '<div class="text-xs font-normal text-[#6B4423]">' + escapeHtml(g.contact) + '</div>' : '')
                + '</td>'
                + '<td class="p-3">' + escapeHtml(g.salesman) + '</td>'
                + '<td class="p-3 text-right">' + g.orders + '</td>'
                + '<td class="p-3 text-right">' + formatCommissionMoney(g.sales) + '</td>'
                + '<td class="p-3 text-right font-semibold">' + formatCommissionMoney(g.commission) + '</td>'
                + '</tr>';
        });
        html += '</tbody></table></div>';
        body.innerHTML = html;
        return;
    }

    function commissionOrderTable(list, showSalesmanCut) {
        if (!list.length) {
            return '<p class="text-sm text-[#6B4423] px-1 py-3">No orders in this group.</p>';
        }
        let table = '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="bg-[#f8f4eb]">'
            + '<th class="p-3 text-left">Date</th>'
            + '<th class="p-3 text-left">Invoice</th>'
            + '<th class="p-3 text-left">Store</th>'
            + '<th class="p-3 text-left">Salesman</th>'
            + (showSalesmanCut ? '<th class="p-3 text-right">Salesman rate</th><th class="p-3 text-right">Salesman $</th>' : '')
            + '<th class="p-3 text-right">Your rate</th>'
            + '<th class="p-3 text-right">Your commission</th>'
            + '</tr></thead><tbody>';
        list.forEach(function (r) {
            const o = r.order;
            const safeId = String(o.id || '').replace(/'/g, '');
            const inv = (typeof displayInvoiceNumber === 'function')
                ? displayInvoiceNumber(o)
                : (o.invoiceNumber || o.id || '—');
            const store = o.customerCompany || o.customer || o.customerEmail || '—';
            const salesmanRate = getSalesmanCommissionPercent(o);
            const salesmanPay = r.sales * (salesmanRate / 100);
            table += '<tr class="border-t border-[#d4b78f] hover:bg-[#f8f4eb] cursor-pointer" onclick="openOrderInvoiceModal(\'' + safeId + '\')">'
                + '<td class="p-3 whitespace-nowrap">' + escapeHtml(r.date.toLocaleDateString()) + '</td>'
                + '<td class="p-3 font-semibold brand-green">' + escapeHtml(inv) + '</td>'
                + '<td class="p-3">' + escapeHtml(store) + '</td>'
                + '<td class="p-3">' + escapeHtml(commissionSalesmanLabel(o)) + '</td>'
                + (showSalesmanCut
                    ? ('<td class="p-3 text-right">' + salesmanRate + '%</td>'
                        + '<td class="p-3 text-right">' + formatCommissionMoney(salesmanPay) + '</td>')
                    : '')
                + '<td class="p-3 text-right">' + escapeHtml(r.rate) + '%</td>'
                + '<td class="p-3 text-right font-semibold">' + formatCommissionMoney(r.commission) + '</td>'
                + '</tr>';
        });
        table += '</tbody></table></div>';
        return table;
    }

    const mine = [];
    const others = [];
    rows.forEach(function (r) {
        if (isJonathanAssignedOrder(r.order)) mine.push(r);
        else others.push(r);
    });
    function groupSum(list) {
        let sales = 0;
        let yours = 0;
        let salesman = 0;
        list.forEach(function (r) {
            sales += r.sales;
            yours += r.commission;
            salesman += r.sales * (getSalesmanCommissionPercent(r.order) / 100);
        });
        return { sales: sales, yours: yours, salesman: salesman };
    }
    const mineSum = groupSum(mine);
    const otherSum = groupSum(others);

    body.innerHTML =
        '<div class="mb-8">'
        + '<h3 class="text-base font-bold brand-green mb-1">Your orders</h3>'
        + '<p class="text-xs text-[#6B4423] mb-3">Only you are paid on these. '
        + mine.length + ' invoices · ' + formatCommissionMoney(mineSum.sales) + ' sales · '
        + formatCommissionMoney(mineSum.yours) + ' to you</p>'
        + commissionOrderTable(mine, false)
        + '</div>'
        + '<div>'
        + '<h3 class="text-base font-bold brand-green mb-1">All other orders</h3>'
        + '<p class="text-xs text-[#6B4423] mb-3">You earn 5%. Brian earns 10% on his stores. '
        + others.length + ' invoices · ' + formatCommissionMoney(otherSum.sales) + ' sales · '
        + formatCommissionMoney(otherSum.salesman) + ' to the salesman · '
        + formatCommissionMoney(otherSum.yours) + ' to you</p>'
        + commissionOrderTable(others, true)
        + '</div>';
}

window.calcOrderAmount = calcOrderAmount;
window.changeBankLogYear = changeBankLogYear;
window.loadAchBankLog = loadAchBankLog;
window.renderBankLogTable = renderBankLogTable;
window.toggleBankLogMonth = toggleBankLogMonth;
window.updateDashboardAchCounts = updateDashboardAchCounts;
window.openAchLogFiltered = openAchLogFiltered;
window.showFinancialsSub = showFinancialsSub;
window.commissionSalesmanEmail = commissionSalesmanEmail;
window.isBrianAssignedOrder = isBrianAssignedOrder;
window.commissionSalesmanLabel = commissionSalesmanLabel;
window.isJonathanAssignedOrder = isJonathanAssignedOrder;
window.getSalesmanCommissionPercent = getSalesmanCommissionPercent;
window.getOrderCommissionPercent = getOrderCommissionPercent;
window.updatePortalCommissionCard = updatePortalCommissionCard;
window.getOrderSalesTotal = getOrderSalesTotal;
window.getCommissionPeriodStart = getCommissionPeriodStart;
window.listCommissionOrders = listCommissionOrders;
window.setCommissionPeriod = setCommissionPeriod;
window.showCommissionBreakdown = showCommissionBreakdown;
window.formatCommissionMoney = formatCommissionMoney;
window.renderPortalCommissionBlock = renderPortalCommissionBlock;
