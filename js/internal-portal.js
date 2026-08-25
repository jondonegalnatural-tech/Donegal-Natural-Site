// =====================================================
// INTERNAL-PORTAL.JS - Unified & Organized Version
// =====================================================

// ================== SUPABASE CLIENT ==================
const SUPABASE_URL = 'https://kyzfdlzqlckrpdkavxei.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5emZkbHpxbGNrcnBka2F2eGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3ODU0NjEsImV4cCI6MjEwMDM2MTQ2MX0.Y1Sshp1-0lFwKakCgpJtAUpaHNB0PQ1vuo6SOHZcPu4';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Soft guard — fast redirect if no local admin cache (reduces UI flash)
(function () {
    try {
        const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (!user || user.role !== 'admin') {
            window.location.replace('login-portal.html');
        }
    } catch (e) {
        window.location.replace('login-portal.html');
    }
})();

// Hard guard — live session + role from profiles
(async function enforceAdminSession() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            localStorage.removeItem('currentUser');
            window.location.replace('login-portal.html');
            return;
        }
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('id, email, full_name, role, company, must_change_password')
            .eq('id', session.user.id)
            .single();
        if (error || !profile || profile.role !== 'admin') {
            localStorage.removeItem('currentUser');
            try { await supabaseClient.auth.signOut(); } catch (_) {}
            window.location.replace('login-portal.html');
            return;
        }
        const prev = JSON.parse(localStorage.getItem('currentUser') || '{}');
        localStorage.setItem('currentUser', JSON.stringify({
            id: profile.id,
            username: profile.email,
            fullName: profile.full_name || profile.email,
            role: profile.role,
            company: profile.company || '',
            email: profile.email,
            mustChangePassword: !!profile.must_change_password,
            loginTime: prev.loginTime || new Date().toISOString(),
            supabase: true
        }));
    } catch (e) {
        console.error('enforceAdminSession:', e);
        localStorage.removeItem('currentUser');
        window.location.replace('login-portal.html');
    }
})();

// Re-check when browser restores this page from Back/Forward cache
window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    (async function () {
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) {
                localStorage.removeItem('currentUser');
                window.location.replace('login-portal.html');
                return;
            }
            const { data: profile, error } = await supabaseClient
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();
            if (error || !profile || profile.role !== 'admin') {
                localStorage.removeItem('currentUser');
                try { await supabaseClient.auth.signOut(); } catch (_) {}
                window.location.replace('login-portal.html');
            }
        } catch (err) {
            localStorage.removeItem('currentUser');
            window.location.replace('login-portal.html');
        }
    })();
});
// =====================================================


// HARD SAFETY — set to true ONLY right before publishing the live site
const EMAILS_ENABLED = true;

function generateInvoiceNumber() {
    // DN-XXXXX — 5 chars, skip ambiguous 0/O/1/I
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return 'DN-' + code;
}

async function notifyMarshallProforma(order) {
    try {
        const res = await fetch(SUPABASE_URL + '/functions/v1/send-pro-forma-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
                'apikey': SUPABASE_ANON_KEY
            },
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
                source: order.source || 'internal'
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

// ================== GLOBAL VARIABLES ==================
let currentMatrixStartDate = null;
let currentMatrixMetric = 'units';
let currentMatrixView = 'table';          // 'table' | 'trends'
let currentTrendsMode = 'multi';          // 'multi' | 'mtd' (mtd later)
let currentTrendsMetric = 'units';        // 'units' | 'sales'
let trendsChartInstance = null;
let currentInsightsFilter = 'all';
let allCustomers = [];
let allOrders = [];
let currentFilter = 'all';
let allBackOrders = [];
let currentOrdersView = 'all'; // 'all' | 'back'
let approvePendingBackOrders = []; // queued during Approve modal
let shipPendingBackOrders = [];    // queued during Ship modal
let salesmen = [];
const DATA_TTL_MS = 45000; // 45 seconds
let ordersLoadedAt = 0;
let customersLoadedAt = 0;
let inquiriesLoadedAt = 0;
let vendorsLoadedAt = 0;
let inventoryLoadedAt = 0;

function isDataFresh(loadedAt) {
    return loadedAt > 0 && (Date.now() - loadedAt) < DATA_TTL_MS;
}

function showTableLoading(containerId, message) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `<p class="text-center text-[#6B4423] py-10"><i class="fas fa-spinner fa-spin mr-2"></i>${message || 'Loading…'}</p>`;
}

function goToSalesmanView() {
    try {
        const original = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (original) {
            localStorage.setItem('originalAdminUser', JSON.stringify(original));
        }

        localStorage.setItem('currentUser', JSON.stringify({
            id: original?.id || null,
            username: 'jon.donegalnatural@gmail.com',
            fullName: 'Jonathan (Sales View)',
            name: 'Jonathan (Sales View)',
            role: 'salesman',
            email: 'jon.donegalnatural@gmail.com',
            mustChangePassword: false,
            loginTime: new Date().toISOString(),
            supabase: true,
            isViewAs: true
        }));
    } catch (e) {
        console.error('goToSalesmanView error:', e);
    }
    window.location.href = 'salesman-portal.html';
}

// ================== SHARED HELPER FUNCTIONS ==================
// Functions used by more than one section will be placed here.
// (We will move shared helpers into this section as we reorganize.)

function filterCustomerInsights(filterType) {
    currentInsightsFilter = filterType;
    refreshCustomerInsights();
}

async function refreshCustomerInsights() {
    const tableBody = document.getElementById('customer-insights-table');
    const totalEl = document.getElementById('total-customers-count');
    const activeEl = document.getElementById('active-customers-count');
    const inactiveEl = document.getElementById('inactive-customers-count');

    if (!tableBody) return;

    // Ensure data is loaded
    if (!allCustomers || allCustomers.length === 0) {
        if (typeof loadCustomers === 'function') await loadCustomers();
    }
    if (!allOrders || allOrders.length === 0) {
        if (typeof loadOrders === 'function') await loadOrders();
    }

    const threshold = parseInt(document.getElementById('inactive-threshold')?.value, 10) || 60;
    const sortBy = document.getElementById('insights-sort')?.value || 'days';
    const now = new Date();

    // Build insight rows from customers + orders
    const rows = (allCustomers || []).map(customer => {
        const name = customer.name || '';
        const company = customer.company || '';
        const customerOrders = (allOrders || []).filter(o => {
            const cName = (o.customer || o.customer_name || '').toLowerCase();
            return cName && name && cName === name.toLowerCase();
        });

        let totalSpent = 0;
        let lastOrderDate = null;

        customerOrders.forEach(order => {
            const orderDate = new Date(order.submittedAt || order.submitted_at || order.date || 0);
            if (!lastOrderDate || orderDate > lastOrderDate) lastOrderDate = orderDate;

            (order.items || []).forEach(item => {
                const qty = parseInt(item.quantity, 10) || 0;
                const unit = typeof getOrderItemUnitPrice === 'function'
                    ? getOrderItemUnitPrice(item)
                    : (parseFloat(item.unitPrice) || 0);
                totalSpent += qty * unit;
            });
        });

        const daysSince = lastOrderDate
            ? Math.floor((now - lastOrderDate) / (1000 * 60 * 60 * 24))
            : null;

        const isInactive = daysSince === null || daysSince >= threshold;

        return {
            name,
            company,
            lastOrderDate,
            daysSince,
            orderCount: customerOrders.length,
            totalSpent,
            isInactive
        };
    });

    const activeRows = rows.filter(r => !r.isInactive);
    const inactiveRows = rows.filter(r => r.isInactive);

    if (totalEl) totalEl.textContent = rows.length;
    if (activeEl) activeEl.textContent = activeRows.length;
    if (inactiveEl) inactiveEl.textContent = inactiveRows.length;

    // Highlight selected filter card
    ['all', 'active', 'inactive'].forEach(type => {
        const card = document.getElementById('card-' + type);
        if (!card) return;
        if (currentInsightsFilter === type) {
            card.classList.add('ring-2', 'ring-[#1E4D2B]');
        } else {
            card.classList.remove('ring-2', 'ring-[#1E4D2B]');
        }
    });

    // Apply filter
    let filtered = rows;
    if (currentInsightsFilter === 'active') filtered = activeRows;
    if (currentInsightsFilter === 'inactive') filtered = inactiveRows;

    // Sort
    filtered = filtered.slice().sort((a, b) => {
        if (sortBy === 'orders') return b.orderCount - a.orderCount;
        if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
        // days (default) — nulls last, highest days first
        if (a.daysSince === null && b.daysSince === null) return 0;
        if (a.daysSince === null) return 1;
        if (b.daysSince === null) return -1;
        return b.daysSince - a.daysSince;
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="p-6 text-center text-[#6B4423]">
                    No customers match this filter.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = filtered.map(r => {
        const lastOrderText = r.lastOrderDate
            ? r.lastOrderDate.toLocaleDateString()
            : 'Never';
        const daysText = r.daysSince !== null ? r.daysSince : '—';
        const statusBadge = r.isInactive
            ? `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">Inactive</span>`
            : `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">Active</span>`;

        return `
            <tr class="border-t border-[#d4b78f] hover:bg-[#f8f4eb]">
                <td class="p-3">
                    <p class="font-semibold brand-green">${r.name || '—'}</p>
                    <p class="text-xs text-[#6B4423]">${r.company || ''}</p>
                </td>
                <td class="p-3 text-center">${lastOrderText}</td>
                <td class="p-3 text-center">${daysText}</td>
                <td class="p-3 text-center">${r.orderCount}</td>
                <td class="p-3 text-center">$${r.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="p-3 text-center">${statusBadge}</td>
            </tr>
        `;
    }).join('');
}

// ================== BANK LOG (monthly + drill-down) ==================
let bankLogYear = new Date().getFullYear();
let bankLogRows = [];          // raw ACH/bank orders
let bankLogExpandedMonth = null; // e.g. '2026-7' or null

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

function fmtMoney(n) {
    const v = Number(n);
    if (Number.isNaN(v)) return '—';
    return '$' + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}



function fmtDate(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString();
    } catch {
        return iso;
    }
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
        if (!order.items || !Array.isArray(order.items)) return;
        const orderDate = new Date(
            order.submittedAt || order.submitted_at || order.date || now
        );
        if (isNaN(orderDate.getTime())) return;

        let orderTotal = 0;
        order.items.forEach(item => {
            const qty = parseInt(item.quantity, 10) || 0;
            const unit = typeof getOrderItemUnitPrice === 'function'
                ? getOrderItemUnitPrice(item)
                : (parseFloat(item.unitPrice) || 0);
            orderTotal += qty * unit;
        });

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
}

function showSection(section) {
    if (typeof closeMobileSidebar === 'function') closeMobileSidebar();
    if (section === 'salesmen' && typeof renderSalesmen === 'function') {
        renderSalesmen();
    }

    // Hide all sections
    document.querySelectorAll('.content-section').forEach(el => {
        el.style.display = 'none';
    });

    // Show the target section
    const target = document.getElementById(section);
    if (target) {
        target.style.display = 'block';
    }

        // === Orders ===
    if (section === 'orders') {
        currentFilter = 'all';
        currentOrdersView = 'all';
        if (typeof showAllOrders === 'function') showAllOrders();
        if (isDataFresh(ordersLoadedAt) && allOrders && allOrders.length >= 0) {
            if (typeof updateOrderStatusCards === 'function') updateOrderStatusCards();
            if (typeof renderOrdersTable === 'function') renderOrdersTable();
        } else if (typeof loadOrders === 'function') {
            loadOrders();
        } else if (typeof renderOrdersTable === 'function') {
            renderOrdersTable();
        }
        // Always refresh back-order badge count
        if (typeof loadBackOrders === 'function') loadBackOrders();
    }

    // === Inquiries ===
    if (section === 'inquiries') {
        if (typeof renderInquiries === 'function') {
            setTimeout(() => renderInquiries(), 80);
        }
    }

    // === Customers ===
        if (section === 'customers') {
        if (isDataFresh(customersLoadedAt) && allCustomers && allCustomers.length >= 0) {
            if (typeof renderCustomers === 'function') renderCustomers();
        } else if (typeof loadCustomers === 'function') {
            loadCustomers();
        }
        setTimeout(() => {
            if (typeof initCustomerMap === 'function') initCustomerMap();
        }, 400);
    }

// === Financials ===
    if (section === 'financials') {
        setTimeout(() => {
            if (typeof showFinancialsSub === 'function') showFinancialsSub('sales');
        }, 40);
    }

    // === Reports ===
    if (section === 'reports') {
        if (typeof refreshCustomerInsights === 'function') {
            setTimeout(() => refreshCustomerInsights(), 80);
        }
        // Populate salesman selector for price-sheet drill-down
        (async () => {
            if ((!salesmen || salesmen.length === 0) && typeof loadSalesmen === 'function') {
                await loadSalesmen();
            }
            if ((!allCustomers || allCustomers.length === 0) && typeof loadCustomers === 'function') {
                await loadCustomers();
            }
            if (typeof populateReportsSalesmanSelect === 'function') {
                await populateReportsSalesmanSelect();
            }
        })();
    }

    // === Dashboard ===
    if (section === 'dashboard') {
    if (typeof updateDashboardSales === 'function') {
        updateDashboardSales();
    }
    if (typeof updatePendingPOIndicators === 'function') {
        updatePendingPOIndicators();
    }
    // Refresh inquiry counts for the dashboard card
    if (typeof loadInquiries === 'function') {
        loadInquiries().then(() => {
            if (typeof updateInquiryStats === 'function') updateInquiryStats();
        });
    }
    if (typeof loadInventory === 'function') {
    loadInventory().then(() => {
        if (typeof updateDashboardLowStock === 'function') updateDashboardLowStock();
    if (typeof updateDashboardAchCounts === 'function') {
        updateDashboardAchCounts();
    }
    });
} else if (typeof updateDashboardLowStock === 'function') {
    updateDashboardLowStock();
}

}

    if (typeof updateDashboardOrders === 'function') updateDashboardOrders();
}

// ================== SALESMEN ==================
// --- Salesmen Helpers ---

function saveSalesmen() {
    // localStorage writes removed – salesmen live in Supabase
}

function addTestSalesman() {
    const firstNames = ['Brian', 'Sarah', 'Mike', 'Jessica', 'David'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Davis'];
    const territories = ['Florida', 'Northeast', 'Midwest', 'Southeast', 'West Coast'];

    const newSalesman = {
        id: Date.now(),
        name: firstNames[Math.floor(Math.random() * firstNames.length)] + ' ' +
              lastNames[Math.floor(Math.random() * lastNames.length)],
        territory: territories[Math.floor(Math.random() * territories.length)],
        commission: 8,
        yearlySales: Math.floor(Math.random() * 200000) + 100000,
        monthlySales: Math.floor(Math.random() * 30000) + 15000,
        active: true
    };

    salesmen.push(newSalesman);
    saveSalesmen();

    alert('Test salesman added: ' + newSalesman.name);
    // Optional: refresh the section if you have a render function
    if (typeof renderSalesmen === 'function') {
        renderSalesmen();
    }
}

function getSalesmanOrderTotals(salesman) {
    const fullName = (
        salesman.name ||
        [salesman.firstName, salesman.lastName].filter(Boolean).join(' ') ||
        ''
    ).trim().toLowerCase();
    const email = (salesman.email || '').trim().toLowerCase();

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let yearly = 0;
    let monthly = 0;

    (allOrders || []).forEach(order => {
        const orderName = (
            order.salesman ||
            order.salesman_name ||
            order.salesmanName ||
            ''
        ).trim().toLowerCase();
        const orderEmail = (
            order.salesmanEmail ||
            order.salesman_email ||
            ''
        ).trim().toLowerCase();

        const nameMatch = fullName && orderName && orderName === fullName;
        const emailMatch = email && orderEmail && orderEmail === email;
        if (!nameMatch && !emailMatch) return;

        const orderDate = new Date(
            order.submittedAt || order.submitted_at || order.created_at || order.date || 0
        );
        if (isNaN(orderDate.getTime())) return;

        let orderTotal = 0;
        (order.items || []).forEach(item => {
            const qty = parseInt(item.quantity, 10) || 0;
            const unit = typeof getOrderItemUnitPrice === 'function'
                ? getOrderItemUnitPrice(item)
                : (parseFloat(item.unitPrice) || 0);
            orderTotal += qty * unit;
        });

        if (orderDate >= startOfYear) yearly += orderTotal;
        if (orderDate >= startOfMonth) monthly += orderTotal;
    });

    return { yearly, monthly };
}

let currentSalesmanOrdersId = null;

function hideSalesmanOrdersModal() {
    const modal = document.getElementById('salesman-orders-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.style.display = 'none';
}

function openSalesmanOrdersModal() {
    const detailModal = document.getElementById('salesman-modal');
    const salesmanId = detailModal?.dataset?.salesmanId;
    const salesman = salesmanId
        ? salesmen.find(s => String(s.id) === String(salesmanId))
        : null;

    if (!salesman) {
        alert('No salesman selected.');
        return;
    }

    currentSalesmanOrdersId = salesman.id;

    const titleEl = document.getElementById('salesman-orders-title');
    const displayName = salesman.name
        || [salesman.firstName, salesman.lastName].filter(Boolean).join(' ')
        || 'Salesman';
    if (titleEl) titleEl.textContent = `Orders — ${displayName}`;

    const fill = () => {
        renderSalesmanOrdersList(salesman);
        const modal = document.getElementById('salesman-orders-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
        }
    };

    if (typeof loadOrders === 'function' && (!allOrders || allOrders.length === 0)) {
        loadOrders().then(fill);
    } else {
        fill();
    }
}

function hideSalesmanModal() {
    const modal = document.getElementById('salesman-modal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.classList.add('hidden');
}

async function deleteSalesman() {
    const modal = document.getElementById('salesman-modal');
    const salesmanId = modal?.dataset?.salesmanId;
    if (!salesmanId) {
        alert('Could not find salesman id.');
        return;
    }

    const salesman = (salesmen || []).find(s => String(s.id) === String(salesmanId));
    if (!salesman) {
        alert('Salesman not found.');
        return;
    }

    const displayName = salesman.name
        || [salesman.firstName, salesman.lastName].filter(Boolean).join(' ')
        || 'this salesman';
    const email = (salesman.email || '').toLowerCase().trim();

    if (!email) {
        alert('This salesman has no email on file. Cannot safely delete.');
        return;
    }

    // Confirm 1
    if (!confirm(
        'PERMANENTLY delete ' + displayName + '?\n\n' +
        'This will:\n' +
        '• Remove their login (Auth + profile)\n' +
        '• Delete their salesmen record and price sheet\n' +
        '• Unassign every customer currently under them (prices re-lock until a new salesman approves)\n\n' +
        'Orders and customer records are NEVER deleted.\n\n' +
        'This cannot be undone.'
    )) {
        return;
    }

    // Confirm 2 — type the exact email
    const typed = prompt(
        'Type the salesman email exactly to confirm permanent delete:\n\n' + email
    );
    if (typed === null) return;
    if (typed.toLowerCase().trim() !== email) {
        alert('Email did not match. Delete cancelled.');
        return;
    }

    try {
        // 1. Unassign customers + re-lock pricing (Option A)
        const { error: custErr } = await supabaseClient
            .from('customers')
            .update({
                salesman_email: null,
                assigned_at: null,
                pricing_approved_at: null,
                pricing_approved_by: null
            })
            .eq('salesman_email', email);
        if (custErr) throw custErr;

        // 2. Delete price sheet(s)
        const { error: sheetErr } = await supabaseClient
            .from('salesman_price_sheets')
            .delete()
            .eq('salesman_email', email);
        if (sheetErr) throw sheetErr;

        // 3. Delete salesmen row
        const { error: salesErr } = await supabaseClient
            .from('salesmen')
            .delete()
            .eq('id', salesmanId);
        if (salesErr) throw salesErr;

        // 4. Auth + profiles cleanup via Edge Function (Step 3)
        try {
            const fnUrl = SUPABASE_URL + '/functions/v1/delete-salesman-user';
            const fnRes = await fetch(fnUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
                    'apikey': SUPABASE_ANON_KEY
                },
                body: JSON.stringify({ email: email })
            });
            const fnText = await fnRes.text();
            let fnData = null;
            try { fnData = JSON.parse(fnText); } catch (e) { fnData = { error: fnText }; }
            if (!fnRes.ok || (fnData && fnData.error)) {
                console.warn('Auth cleanup warning:', fnData?.error || fnRes.status);
                // Non-blocking — tables are already cleaned
            }
        } catch (fnErr) {
            console.warn('delete-salesman-user call failed (tables already cleaned):', fnErr);
        }

        hideSalesmanModal();
        if (typeof renderSalesmen === 'function') await renderSalesmen();
        if (typeof updateDashboardSalesmen === 'function') updateDashboardSalesmen();
        alert(displayName + ' has been permanently deleted.\nCustomers under them are now unassigned and prices are locked.');
    } catch (err) {
        console.error('deleteSalesman error:', err);
        alert('Could not delete salesman.\n' + (err.message || ''));
    }
}

function renderSalesmanOrdersList(salesman) {
    const container = document.getElementById('salesman-orders-list');
    if (!container) return;

    const fullName = (
        salesman.name ||
        [salesman.firstName, salesman.lastName].filter(Boolean).join(' ') ||
        ''
    ).trim().toLowerCase();
    const email = (salesman.email || '').trim().toLowerCase();

    const matched = (allOrders || []).filter(order => {
        const orderName = (
            order.salesman ||
            order.salesman_name ||
            order.salesmanName ||
            ''
        ).trim().toLowerCase();
        const orderEmail = (
            order.salesmanEmail ||
            order.salesman_email ||
            ''
        ).trim().toLowerCase();
        return (fullName && orderName === fullName) || (email && orderEmail === email);
    }).sort((a, b) => {
        const da = new Date(a.submittedAt || a.submitted_at || a.date || 0);
        const db = new Date(b.submittedAt || b.submitted_at || b.date || 0);
        return db - da;
    });

    if (matched.length === 0) {
        container.innerHTML = '<p class="text-sm text-[#6B4423]">No orders for this salesman yet.</p>';
        return;
    }

    // Group by calendar year → month (January starts each year)
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const byYear = {};

    matched.forEach(order => {
        const d = new Date(order.submittedAt || order.submitted_at || order.date || 0);
        if (isNaN(d.getTime())) return;
        const y = d.getFullYear();
        const m = d.getMonth(); // 0 = January
        if (!byYear[y]) byYear[y] = {};
        if (!byYear[y][m]) byYear[y][m] = [];
        byYear[y][m].push(order);
    });

    const years = Object.keys(byYear).map(Number).sort((a, b) => b - a); // newest year first

    let html = '';
    years.forEach(year => {
        const months = Object.keys(byYear[year]).map(Number).sort((a, b) => b - a); // newest month first
        let yearOrderCount = 0;
        let yearTotal = 0;

        months.forEach(m => {
            (byYear[year][m] || []).forEach(order => {
                yearOrderCount += 1;
                (order.items || []).forEach(item => {
                    const qty = parseInt(item.quantity, 10) || 0;
                    const unit = typeof getOrderItemUnitPrice === 'function'
                        ? getOrderItemUnitPrice(item)
                        : (parseFloat(item.unitPrice) || 0);
                    yearTotal += qty * unit;
                });
            });
        });

        html += `
            <div class="mb-5">
                <div class="flex items-center justify-between mb-2 pb-1 border-b-2 border-[#1E4D2B]">
                    <h4 class="text-base font-bold brand-green">${year}</h4>
                    <span class="text-xs text-[#6B4423]">${yearOrderCount} order${yearOrderCount !== 1 ? 's' : ''} · $${yearTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
        `;

        months.forEach(m => {
            const ordersInMonth = byYear[year][m] || [];
            let monthTotal = 0;
            ordersInMonth.forEach(order => {
                (order.items || []).forEach(item => {
                    const qty = parseInt(item.quantity, 10) || 0;
                    const unit = typeof getOrderItemUnitPrice === 'function'
                        ? getOrderItemUnitPrice(item)
                        : (parseFloat(item.unitPrice) || 0);
                    monthTotal += qty * unit;
                });
            });

            html += `
                <div class="mb-3">
                    <div class="flex items-center justify-between mb-1.5">
                        <p class="text-sm font-semibold text-[#6B4423]">${monthNames[m]}</p>
                        <span class="text-xs text-[#6B4423]">${ordersInMonth.length} · $${monthTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div class="space-y-2">
            `;

            ordersInMonth.forEach(order => {
                const id = order.id || order.order_id || '';
                const shortId = String(id).length > 8 ? String(id).slice(0, 8) : id;
                const customer = order.customer || order.customer_name || '—';
                const status = order.status || '—';
                const date = new Date(order.submittedAt || order.submitted_at || order.date || 0);
                const dateText = isNaN(date.getTime()) ? '—' : date.toLocaleDateString();

                let total = 0;
                (order.items || []).forEach(item => {
                    const qty = parseInt(item.quantity, 10) || 0;
                    const unit = typeof getOrderItemUnitPrice === 'function'
                        ? getOrderItemUnitPrice(item)
                        : (parseFloat(item.unitPrice) || 0);
                    total += qty * unit;
                });

                const safeId = String(id).replace(/'/g, "\\'");

                html += `
                    <button type="button"
                            onclick="openSalesmanOrderInvoice('${safeId}')"
                            class="w-full text-left bg-[#f8f4eb] border border-[#d4b78f] rounded-xl px-4 py-3 hover:bg-[#f0e6d9] transition">
                        <div class="flex justify-between gap-2">
                            <span class="font-semibold brand-green">#${shortId}</span>
                            <span class="text-sm text-[#6B4423]">${dateText}</span>
                        </div>
                        <div class="flex justify-between gap-2 mt-1 text-sm">
                            <span class="truncate">${customer}</span>
                            <span class="font-semibold whitespace-nowrap">$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <p class="text-xs text-[#6B4423] mt-1">${status}</p>
                    </button>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        html += `</div>`;
    });

    container.innerHTML = html;
}

function hideOrderInvoiceModal() {
    const modal = document.getElementById('order-invoice-modal');
    if (!modal) return;
    modal.classList.add('hidden');
}

function openOrderInvoiceModal(orderId) {
    const order = (allOrders || []).find(o => String(o.id) === String(orderId));
    if (!order) {
        alert('Order not found.');
        return;
    }

        // Prefer live customer record for addresses (email first, then name)
    const customerName = (order.customer || order.customer_name || '').trim().toLowerCase();
    const customerEmail = (order.customerEmail || order.customer_email || '').trim().toLowerCase();
    const customer = (allCustomers || []).find(c => {
        const cEmail = (c.email || '').trim().toLowerCase();
        const cName = (c.name || '').trim().toLowerCase();
        if (customerEmail && cEmail && customerEmail === cEmail) return true;
        if (customerName && cName && cName === customerName) return true;
        return false;
    }) || null;

    // Invoice number + date
    const invNum = document.getElementById('inv-number');
    if (invNum) invNum.textContent = String(order.id || '—');

    const invDate = document.getElementById('inv-date');
    if (invDate) {
        const d = new Date(order.submittedAt || order.submitted_at || order.date || 0);
        invDate.textContent = isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
    }

    // UPS tracking (framework — link opens UPS.com)
    const trackNum = (order.trackingNumber || order.tracking_number || '').trim();
    const invStatusEl = document.getElementById('inv-status');
    let trackBadge = document.getElementById('inv-tracking-badge');
    if (!trackBadge && invStatusEl && invStatusEl.parentElement) {
        trackBadge = document.createElement('div');
        trackBadge.id = 'inv-tracking-badge';
        trackBadge.className = 'mt-2 text-sm';
        invStatusEl.parentElement.appendChild(trackBadge);
    }
    if (trackBadge) {
        if (trackNum) {
            const safe = trackNum.replace(/"/g, '');
            trackBadge.innerHTML = `
                <span class="text-[#6B4423]">${order.carrier || 'UPS'} Tracking:</span>
                <a href="https://www.ups.com/track?tracknum=${encodeURIComponent(safe)}"
                   target="_blank" rel="noopener"
                   class="ml-1 font-mono font-semibold text-[#1E4D2B] underline hover:text-[#254a2f]">
                    ${safe}
                </a>`;
        } else {
            trackBadge.innerHTML = '';
        }
    }

    // BILL TO
    const billEl = document.getElementById('inv-bill-to');
    if (billEl) {
        const lines = [];
        if (order.customer) lines.push(order.customer);
        if (order.customerCompany) lines.push(order.customerCompany);
        if (customer?.phone) lines.push(customer.phone);
        else if (order.customerEmail) lines.push(order.customerEmail);
        const billing = customer?.billingAddress || customer?.shippingAddress || '';
        if (billing) lines.push(billing);
        billEl.innerHTML = lines.length
            ? lines.map(l => `<p>${l}</p>`).join('')
            : '—';
    }

    // SHIP TO
    const shipEl = document.getElementById('inv-ship-to');
    if (shipEl) {
        const lines = [];
        if (order.customer) lines.push(order.customer);
        if (order.customerCompany) lines.push(order.customerCompany);
        const shipping = customer?.shippingAddress || customer?.billingAddress || '';
        if (shipping) lines.push(shipping);
        shipEl.innerHTML = lines.length
            ? lines.map(l => `<p>${l}</p>`).join('')
            : '—';
    }

    // Line items (original order + any fulfilled back-order items)
    const tbody = document.getElementById('inv-items-body');
    let subtotal = 0;

    if (tbody) {
        // Ensure back orders are loaded
        if ((!allBackOrders || allBackOrders.length === 0) && typeof loadBackOrders === 'function') {
            // fire-and-forget; we still render with whatever is already in memory
            loadBackOrders();
        }

        const items = order.items || [];
        let rowsHtml = '';

        if (items.length) {
            rowsHtml += items.map(item => {
                const qty = parseInt(item.quantity, 10) || 0;
                const unit = typeof getOrderItemUnitPrice === 'function'
                    ? getOrderItemUnitPrice(item)
                    : (parseFloat(item.unitPrice) || 0);
                const hasPrice = unit > 0;
                const lineTotal = qty * unit;
                if (hasPrice) subtotal += lineTotal;

                const desc = [
                    item.product || item.name || '—',
                    item.caseSize ? `· ${item.caseSize}` : ''
                ].filter(Boolean).join(' ');

                const unitText = hasPrice
                    ? ('$' + unit.toFixed(2))
                    : (item.isMarketPrice ? 'Market' : '—');
                const totalText = hasPrice
                    ? ('$' + lineTotal.toFixed(2))
                    : '—';

                return `
                    <tr class="border-t border-[#d4b78f]">
                        <td class="p-3 text-left font-semibold">${qty}</td>
                        <td class="p-3 text-left">${desc}</td>
                        <td class="p-3 text-right">${unitText}</td>
                        <td class="p-3 text-right font-semibold">${totalText}</td>
                    </tr>`;
            }).join('');
        }

        // Append fulfilled back-order items for this original order
        const fulfilledBOs = (allBackOrders || []).filter(b =>
            (b.status || '').toLowerCase() === 'fulfilled' &&
            (String(b.original_order_id) === String(order.id) ||
             String(b.invoice_number) === String(order.id))
        );

        if (fulfilledBOs.length > 0) {
            rowsHtml += `
                <tr class="bg-[#f0f7f0]">
                    <td colspan="4" class="p-2 text-center text-xs font-semibold text-green-800 uppercase tracking-wide">
                        — Back Order Fulfillment —
                    </td>
                </tr>`;

            rowsHtml += fulfilledBOs.map(b => {
                const qty = parseInt(b.quantity, 10) || 0;
                const unit = b.unit_price != null ? Number(b.unit_price) : 0;
                const hasPrice = unit > 0;
                const lineTotal = qty * unit;
                if (hasPrice) subtotal += lineTotal;

                const desc = [
                    b.product_name || '—',
                    b.case_size ? `· ${b.case_size}` : '',
                    '<span class="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-green-100 text-green-800">BO Fulfilled</span>'
                ].filter(Boolean).join(' ');

                const unitText = hasPrice ? ('$' + unit.toFixed(2)) : (b.display_price || '—');
                const totalText = hasPrice ? ('$' + lineTotal.toFixed(2)) : '—';

                return `
                    <tr class="border-t border-[#c8e0c8] bg-[#f8fbf8]">
                        <td class="p-3 text-left font-semibold">${qty}</td>
                        <td class="p-3 text-left">${desc}</td>
                        <td class="p-3 text-right">${unitText}</td>
                        <td class="p-3 text-right font-semibold">${totalText}</td>
                    </tr>`;
            }).join('');
        }

        if (!rowsHtml) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="p-4 text-center text-[#6B4423]">No line items</td>
                </tr>`;
        } else {
            tbody.innerHTML = rowsHtml;
        }
    }

// Notes — hide system default text
    const notesEl = document.getElementById('inv-notes');
    if (notesEl) {
        const raw = (order.notes || '').trim();
        const isSystem =
            !raw ||
            /^(created via add order|submitted via salesman portal)$/i.test(raw);
        notesEl.textContent = isSystem ? '' : raw;
    }

// Totals (+ credit only if > 0 after ship)
    const shipping = Number(order.shippingCost != null ? order.shippingCost : 0) || 0;
    const credit = Number(order.credit != null ? order.credit : 0) || 0;
    const total = Math.max(0, subtotal + shipping - credit);

    const subEl = document.getElementById('inv-subtotal');
    const shipCostEl = document.getElementById('inv-shipping');
    const creditRow = document.getElementById('inv-credit-row');
    const creditEl = document.getElementById('inv-credit');
    const totEl = document.getElementById('inv-total');

    if (subEl) subEl.textContent = '$' + subtotal.toFixed(2);
    if (shipCostEl) shipCostEl.textContent = '$' + shipping.toFixed(2);

    if (creditRow && creditEl) {
        if (credit > 0) {
            creditRow.classList.remove('hidden');
            creditEl.textContent = '−$' + credit.toFixed(2);
        } else {
            creditRow.classList.add('hidden');
        }
    }

    if (totEl) totEl.textContent = '$' + total.toFixed(2);

    // Ensure customers are available for addresses on next open if missing
    if ((!allCustomers || allCustomers.length === 0) && typeof loadCustomers === 'function') {
        loadCustomers();
    }

    const modal = document.getElementById('order-invoice-modal');
    if (modal) modal.classList.remove('hidden');
}

function openSalesmanOrderInvoice(orderId) {
    // Always open the read-only invoice — never the editable Ship modal
    if (typeof openOrderInvoiceModal === 'function') {
        openOrderInvoiceModal(orderId);
        return;
    }
    if (typeof showOrderDetails === 'function') {
        showOrderDetails(orderId);
        return;
    }
    alert('Order invoice view is not available yet for #' + orderId);
}

async function loadSalesmen() {
    try {
        const { data, error } = await supabaseClient
            .from('salesmen')
.select('id, first_name, last_name, email, territory, commission, market_commission, price_sheet_status, yearly_sales, monthly_sales, active, notes, mailing_address, assigned_products')
            .order('last_name', { ascending: true });

        if (error) throw error;

        salesmen = (data || []).map(s => ({
            id: s.id,
            firstName: s.first_name,
            lastName: s.last_name,
            name: [s.first_name, s.last_name].filter(Boolean).join(' '),
            email: s.email,
            territory: s.territory || '',
            commission: s.commission != null ? Number(s.commission) : 8,
            marketCommission: s.market_commission != null ? Number(s.market_commission) : 3,
            priceSheetStatus: s.price_sheet_status,
            yearlySales: Number(s.yearly_sales) || 0,
            monthlySales: Number(s.monthly_sales) || 0,
            active: s.active !== false,
            notes: s.notes || '',
            mailingAddress: s.mailing_address || '',
        }));
    } catch (err) {
        console.error('loadSalesmen error:', err);
        salesmen = [];
    }
}


async function renderSalesmen() {
    const list = document.getElementById('salesmen-list');
    if (!list) return;

    if (typeof loadSalesmen === 'function') {
        await loadSalesmen();
    }

    list.innerHTML = '';

    if (!salesmen || salesmen.length === 0) {
        list.innerHTML = `
            <div class="col-span-full text-center py-16">
                <i class="fas fa-users text-6xl text-[#d4b78f] mb-4"></i>
                <p class="text-[#6B4423]">No salesmen added yet.</p>
            </div>
        `;
        return;
    }

    salesmen.forEach(s => {
        const isActive = s.active !== false;
        const totals = getSalesmanOrderTotals(s);
        const monthly = '$' + Math.round(totals.monthly).toLocaleString();
        const yearly = '$' + Math.round(totals.yearly).toLocaleString();

        const card = document.createElement('div');
        card.className = 'bg-white border-2 border-[#6B4423] rounded-2xl p-6 cursor-pointer hover:shadow-lg transition';
        card.onclick = () => showSalesmanDetail(s.id);

        card.innerHTML = `
            <div class="flex items-start justify-between gap-3 mb-4">
                <div class="flex items-center gap-4 min-w-0">
                    <div class="w-14 h-14 bg-[#1E4D2B] rounded-full flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-user text-[#d4b78f] text-2xl"></i>
                    </div>
                    <div class="min-w-0">
                        <h3 class="text-xl font-bold brand-green truncate">${s.name || [s.firstName, s.lastName].filter(Boolean).join(' ') || 'Unnamed'}</h3>
                        <p class="text-sm text-[#6B4423]">Territory: <strong>${s.territory || '—'}</strong></p>
                    </div>
                </div>
                <button type="button"
                        title="${isActive ? 'Click to disable' : 'Click to enable'}"
                        onclick="toggleSalesmanActive('${s.id}', event)"
                        class="px-3 py-1 text-xs font-semibold rounded-full flex-shrink-0 cursor-pointer transition
                               ${isActive
                                   ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                   : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}">
                    ${isActive ? 'Active' : 'Inactive'}
                </button>
            </div>
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <p class="text-[#6B4423] text-xs">Yearly Sales</p>
                    <p class="font-semibold brand-green">${yearly}</p>
                </div>
                <div class="text-right">
                    <p class="text-[#6B4423] text-xs">This Month</p>
                    <p class="font-semibold brand-green">${monthly}</p>
                </div>
                <div>
                    <p class="text-[#6B4423] text-xs">Commission</p>
                    <p class="font-semibold brand-green">${s.commission != null ? s.commission + '%' : '—'}</p>
                </div>
            </div>
        `;

        list.appendChild(card);
    });
}


// ================== PRODUCT CATALOG ==================
let PRODUCT_CATALOG = [
    // ========== BULLY STICKS - Green Line ==========
    { name: "6” Thin Green Line Bully Sticks (Bulk)", category: "Bully Sticks", subCategory: "Green Line", caseSize: "1000/cs", unitPrice: 0.54, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” Thin Green Line Bully Sticks (Bulk)", category: "Bully Sticks", subCategory: "Green Line", caseSize: "500/cs", unitPrice: 1.10, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6” Regular Green Line Bully Sticks (Bulk)", category: "Bully Sticks", subCategory: "Green Line", caseSize: "800/cs", unitPrice: 1.53, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” Regular Green Line Bully Sticks (Bulk)", category: "Bully Sticks", subCategory: "Green Line", caseSize: "400/cs", unitPrice: 2.87, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6” “Thick” Green Line Bully Sticks (Bulk)", category: "Bully Sticks", subCategory: "Green Line", caseSize: "600/cs", unitPrice: 1.79, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” “Thick” Green Line Bully Sticks (Bulk)", category: "Bully Sticks", subCategory: "Green Line", caseSize: "300/cs", unitPrice: 3.58, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6” “Super Thick” Green Line Bully Sticks (Bulk)", category: "Bully Sticks", subCategory: "Green Line", caseSize: "500/cs", unitPrice: 2.51, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” “Super Thick” Green Line Bully Sticks (Bulk)", category: "Bully Sticks", subCategory: "Green Line", caseSize: "250/cs", unitPrice: 4.99, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== BULLY STICKS - Canes ==========
    { name: "24-28” Bully Cane", category: "Bully Sticks", subCategory: "Canes", caseSize: "50/cs", unitPrice: 9.95, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "32-36” Bully Cane", category: "Bully Sticks", subCategory: "Canes", caseSize: "50/cs", unitPrice: 11.40, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== BULLY STICKS - Braided Bully ==========
    { name: "6” Braided Bully Sticks (Bulk)", category: "Bully Sticks", subCategory: "Braided Bully", caseSize: "100/cs", unitPrice: 3.10, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” Braided Bully Sticks (Bulk)", category: "Bully Sticks", subCategory: "Braided Bully", caseSize: "50/cs", unitPrice: 6.11, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6” “Super” Braided Bully Sticks (Bulk)", category: "Bully Sticks", subCategory: "Braided Bully", caseSize: "75/cs", unitPrice: 4.31, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” “Super” Braided Bully Sticks (Bulk)", category: "Bully Sticks", subCategory: "Braided Bully", caseSize: "35/cs", unitPrice: 7.91, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== BULLY STICKS - Euro Bully ==========
    { name: "6” Euro Bully Stick (Bulk)", category: "Bully Sticks", subCategory: "Euro Bully", caseSize: "300/cs", unitPrice: 2.15, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6” Euro Bully Stick (Display)", category: "Bully Sticks", subCategory: "Euro Bully", caseSize: "70/display", unitPrice: 2.19, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” Euro Bully Stick (Bulk)", category: "Bully Sticks", subCategory: "Euro Bully", caseSize: "300/cs", unitPrice: 4.42, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” Euro Bully Sticks (Display)", category: "Bully Sticks", subCategory: "Euro Bully", caseSize: "70/display", unitPrice: 4.54, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== BULLY STICKS - Bully Pieces ==========
    { name: "8oz. Bag of Bully Pieces", category: "Bully Sticks", subCategory: "Bully Pieces", caseSize: "70bags/cs", unitPrice: 6.59, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10oz. Bag of Bully Pieces", category: "Bully Sticks", subCategory: "Bully Pieces", caseSize: "50bags/cs", unitPrice: 10.07, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "16oz. Bag of Bully Pieces", category: "Bully Sticks", subCategory: "Bully Pieces", caseSize: "35bags/cs", unitPrice: 12.30, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== JERKY - Jerky Stick Treats ==========
    { name: "USA Beef Jerky Treats (Bulk)", category: "Jerky", subCategory: "Jerky Stick Treats", caseSize: "1000/cs", unitPrice: 0.52, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "USA Beef Jerky Treats (Display)", category: "Jerky", subCategory: "Jerky Stick Treats", caseSize: "250/display", unitPrice: 0.53, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "USA Turkey Jerky Treats (Bulk)", category: "Jerky", subCategory: "Jerky Stick Treats", caseSize: "1200/cs", unitPrice: 0.57, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "USA Turkey Jerky Treats (Display)", category: "Jerky", subCategory: "Jerky Stick Treats", caseSize: "250/display", unitPrice: 0.59, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "USA Chicken Jerky Treats (Bulk)", category: "Jerky", subCategory: "Jerky Stick Treats", caseSize: "1200/cs", unitPrice: 0.59, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "USA Chicken Jerky Treats (Display)", category: "Jerky", subCategory: "Jerky Stick Treats", caseSize: "250/display", unitPrice: 0.58, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "USA Elky Jerky Treats (Bulk)", category: "Jerky", subCategory: "Jerky Stick Treats", caseSize: "1000/cs", unitPrice: 0.59, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "USA Elky Jerky Treats (Display)", category: "Jerky", subCategory: "Jerky Stick Treats", caseSize: "250/display", unitPrice: 0.60, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "USA Venison & Sweet Potato Jerky Treats (Bulk)", category: "Jerky", subCategory: "Jerky Stick Treats", caseSize: "1000/cs", unitPrice: 0.59, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "USA Venison & Sweet Potato Jerky Treats (Display)", category: "Jerky", subCategory: "Jerky Stick Treats", caseSize: "250/display", unitPrice: 0.61, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== JERKY - Training Treats ==========
    { name: "6oz. Bags of USA Elky Training Treats", category: "Jerky", subCategory: "Training Treats", caseSize: "50/cs", unitPrice: 3.90, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10oz. Bags of USA Elky Training Treats", category: "Jerky", subCategory: "Training Treats", caseSize: "35/cs", unitPrice: 7.91, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "16oz. Bags of USA Elky Training Treats", category: "Jerky", subCategory: "Training Treats", caseSize: "20/cs", unitPrice: 19.94, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "USA Elky Training Treats (per lb.)", category: "Jerky", subCategory: "Training Treats", caseSize: "20lbs/cs", unitPrice: 19.46, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== JERKY - Jerky Stuffed Bones ==========
    { name: "Large Turkey Jerky Stuffed Buffalo Bone", category: "Jerky", subCategory: "Jerky Stuffed Bones", caseSize: "50/cs", unitPrice: 4.07, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Large Elky Jerky Stuffed Buffalo Bone", category: "Jerky", subCategory: "Jerky Stuffed Bones", caseSize: "50/cs", unitPrice: 4.07, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Large Venison and Sweet Potato Stuffed Buffalo Bone", category: "Jerky", subCategory: "Jerky Stuffed Bones", caseSize: "50/cs", unitPrice: 4.07, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== EARS ==========
    { name: "Natural Cow Ears (Bulk)", category: "Ears", subCategory: "Natural/Flavored Cow Ears", caseSize: "150/cs", unitPrice: 1.04, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Vanilla Cow Ears (Bulk)", category: "Ears", subCategory: "Natural/Flavored Cow Ears", caseSize: "150/cs", unitPrice: 1.13, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Honey Smoked Cow Ears (Bulk)", category: "Ears", subCategory: "Natural/Flavored Cow Ears", caseSize: "150/cs", unitPrice: 1.19, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Hairy Beef Ears (Bulk)", category: "Ears", subCategory: "Hairy Beef Ears", caseSize: "80/cs", unitPrice: 1.31, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "MAGNA Buffalo Ears (Bulk)", category: "Ears", subCategory: "Buffalo Ears", caseSize: "100/cs", unitPrice: 1.07, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Honey Smoked MAGNA Buffalo Ears (Bulk)", category: "Ears", subCategory: "Buffalo Ears", caseSize: "100/cs", unitPrice: 1.19, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Polish Pig Ears (Bulk)", category: "Ears", subCategory: "Pig Ears", caseSize: "100/cs", unitPrice: 0.98, isMarketPrice: true, marketPriceNote: "Market Price – currently set to $0.98", landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "White Lamb Ears (Bulk)", category: "Ears", subCategory: "Lamb Ears", caseSize: "400/cs", unitPrice: 0.44, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Vanilla Lamb Ears (Bulk)", category: "Ears", subCategory: "Lamb Ears", caseSize: "400/cs", unitPrice: 0.52, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Fuzzy Rabbit Ears (Bulk)", category: "Ears", subCategory: "Fuzzy Rabbit Ears", caseSize: "500/cs", unitPrice: 0.37, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== COW CHEEKS ==========
    { name: "5-6” Natural Rollio (Bulk)", category: "Cow Cheeks", subCategory: "All Natural Rollio", caseSize: "100/cs", unitPrice: 1.91, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-12” Natural Rollio (Bulk)", category: "Cow Cheeks", subCategory: "All Natural Rollio", caseSize: "50/cs", unitPrice: 3.59, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "5-6” Regular Rollio (Bulk)", category: "Cow Cheeks", subCategory: "Natural/Flavored Rollios", caseSize: "100/cs", unitPrice: 2.10, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-12” Regular Rollio (Bulk)", category: "Cow Cheeks", subCategory: "Natural/Flavored Rollios", caseSize: "50/cs", unitPrice: 3.95, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "5-6” Vanilla Rollio (Bulk)", category: "Cow Cheeks", subCategory: "Natural/Flavored Rollios", caseSize: "100/cs", unitPrice: 2.23, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-12” Vanilla Rollio (Bulk)", category: "Cow Cheeks", subCategory: "Natural/Flavored Rollios", caseSize: "50/cs", unitPrice: 4.14, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "5-6” Honey Smoked Rollio (Bulk)", category: "Cow Cheeks", subCategory: "Natural/Flavored Rollios", caseSize: "100/cs", unitPrice: 2.32, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-12” Honey Smoked Rollio (Bulk)", category: "Cow Cheeks", subCategory: "Natural/Flavored Rollios", caseSize: "50/cs", unitPrice: 4.43, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "5-6” PHAT Rollio (Bulk)", category: "Cow Cheeks", subCategory: "PHAT Rollios", caseSize: "100/cs", unitPrice: 2.51, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-12” PHAT Rollio (Bulk)", category: "Cow Cheeks", subCategory: "PHAT Rollios", caseSize: "50/cs", unitPrice: 5.03, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "5-6” Vanilla PHAT Rollio (Bulk)", category: "Cow Cheeks", subCategory: "PHAT Rollios", caseSize: "100/cs", unitPrice: 2.51, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-12” Vanilla PHAT Rollio (Bulk)", category: "Cow Cheeks", subCategory: "PHAT Rollios", caseSize: "50/cs", unitPrice: 5.15, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "5-6” Honey Smoked PHAT Rollio (Bulk)", category: "Cow Cheeks", subCategory: "PHAT Rollios", caseSize: "100/cs", unitPrice: 2.63, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-12” Honey Smoked PHAT Rollio (Bulk)", category: "Cow Cheeks", subCategory: "PHAT Rollios", caseSize: "50/cs", unitPrice: 5.15, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "5-6” Peanut Butter Rollio (Bulk)", category: "Cow Cheeks", subCategory: "Peanut Butter Rollios", caseSize: "100/cs", unitPrice: 2.62, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-12” Peanut Butter Rollio (Bulk)", category: "Cow Cheeks", subCategory: "Peanut Butter Rollios", caseSize: "50/cs", unitPrice: 4.19, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "5-6” Cow Cheek Slab (Bulk per lb.)", category: "Cow Cheeks", subCategory: "Cow Cheek Slabs", caseSize: "28lbs/cs", unitPrice: 6.18, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "5-6” Vanilla Cow Cheek Slab (Bulk per lb.)", category: "Cow Cheeks", subCategory: "Cow Cheek Slabs", caseSize: "28lbs/cs", unitPrice: 6.42, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-12” Cow Cheek Slab (Bulk per lb.)", category: "Cow Cheeks", subCategory: "Cow Cheek Slabs", caseSize: "28lbs/cs", unitPrice: 6.18, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-12” Vanilla Cow Cheek Slab (Bulk per lb.)", category: "Cow Cheeks", subCategory: "Cow Cheek Slabs", caseSize: "28lbs/cs", unitPrice: 6.42, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-12” Natural Cow Cheek Slabs (Bulk per lb.)", category: "Cow Cheeks", subCategory: "Cow Cheek Slabs", caseSize: "28lbs/cs", unitPrice: 5.99, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "White Chunky Cheeks (Bulk)", category: "Cow Cheeks", subCategory: "Chunky Cheeks", caseSize: "22lbs/cs", unitPrice: 5.93, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Vanilla Chunky Cheeks (Bulk)", category: "Cow Cheeks", subCategory: "Chunky Cheeks", caseSize: "22lbs/cs", unitPrice: 5.99, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== OX TAILS ==========
    { name: "6” MAGNA Natural Ox Tails (Bulk)", category: "Ox Tails", subCategory: "MAGNA Ox Tails", caseSize: "150/cs", unitPrice: 2.02, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” MAGNA Natural Ox Tails (Bulk)", category: "Ox Tails", subCategory: "MAGNA Ox Tails", caseSize: "75/cs", unitPrice: 3.32, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6” White Ox Tails (Bulk)", category: "Ox Tails", subCategory: "Ox Tails", caseSize: "500/cs", unitPrice: 0.95, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” White Ox Tails (Bulk)", category: "Ox Tails", subCategory: "Ox Tails", caseSize: "250/cs", unitPrice: 2.03, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6” Vanilla Ox Tails (Bulk)", category: "Ox Tails", subCategory: "Ox Tails", caseSize: "500/cs", unitPrice: 1.19, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” Vanilla Ox Tails (Bulk)", category: "Ox Tails", subCategory: "Ox Tails", caseSize: "250/cs", unitPrice: 2.27, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6” Honey Smoked Ox Tails (Bulk)", category: "Ox Tails", subCategory: "Ox Tails", caseSize: "500/cs", unitPrice: 1.19, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” Honey Smoked Ox Tails (Bulk)", category: "Ox Tails", subCategory: "Ox Tails", caseSize: "250/cs", unitPrice: 2.37, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== RABBIT ==========
    { name: "Fuzzy Rabbit Ears (Bulk)", category: "Rabbit", subCategory: "Fuzzy Rabbit Ears", caseSize: "500/cs", unitPrice: 0.37, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Fuzzy Rabbit Feet (Bulk)", category: "Rabbit", subCategory: "Fuzzy Rabbit Feet", caseSize: "500/cs", unitPrice: 0.45, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== DUCK AND GOOSE ==========
    { name: "Crunchy Baked Duck Necks (Bulk)", category: "Duck and Goose", subCategory: "Duck Neck", caseSize: "300/cs", unitPrice: 0.83, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Crunchy Baked Duck Heads (Bulk)", category: "Duck and Goose", subCategory: "Duck Heads", caseSize: "300/cs", unitPrice: 0.83, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Euro Duck Feet (Bulk)", category: "Duck and Goose", subCategory: "Duck Feet", caseSize: "500/cs", unitPrice: 0.78, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Euro Duck Feet (Display)", category: "Duck and Goose", subCategory: "Duck Feet", caseSize: "150/display", unitPrice: 0.90, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Goose Neck (Bulk)", category: "Duck and Goose", subCategory: "Goose Neck", caseSize: "150/cs", unitPrice: 1.79, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== BEEF ==========
    { name: "Super Meaty Beef Tendons (Bulk)", category: "Beef", subCategory: "Super Meaty Beef Tendons", caseSize: "140/cs", unitPrice: 2.03, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6” Paddywack (Bulk)", category: "Beef", subCategory: "Paddywacks", caseSize: "500/cs", unitPrice: 0.65, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” Paddywack (Bulk)", category: "Beef", subCategory: "Paddywacks", caseSize: "200/cs", unitPrice: 1.32, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6” Corium Sticks (Bulk)", category: "Beef", subCategory: "Corium Sticks", caseSize: "400/cs", unitPrice: 1.11, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” Corium Sticks (Bulk)", category: "Beef", subCategory: "Corium Sticks", caseSize: "180/cs", unitPrice: 2.16, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6” Beef Wrapped Corium Sticks (Bulk)", category: "Beef", subCategory: "Corium Sticks", caseSize: "200/cs", unitPrice: 1.46, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” Beef Wrapped Corium Sticks (Bulk)", category: "Beef", subCategory: "Corium Sticks", caseSize: "100/cs", unitPrice: 2.88, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "5-6” Beef Trachea", category: "Beef", subCategory: "Trachea and Trachea Pieces", caseSize: "60/cs", unitPrice: 0.78, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-13” Beef Trachea", category: "Beef", subCategory: "Trachea and Trachea Pieces", caseSize: "120/cs", unitPrice: 1.79, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== BUFFALO ==========
    { name: "MAGNA Buffalo Ears (Bulk)", category: "Buffalo", subCategory: "Buffalo Ears", caseSize: "100/cs", unitPrice: 1.07, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Honey Smoked MAGNA Buffalo Ears (Bulk)", category: "Buffalo", subCategory: "Buffalo Ears", caseSize: "100/cs", unitPrice: 1.19, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Reg Large Meaty Buffalo Bone", category: "Buffalo", subCategory: "Buffalo Bone and Knuckle", caseSize: "50/cs", unitPrice: 2.63, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Small Meaty Buffalo Knuckle", category: "Buffalo", subCategory: "Buffalo Bone and Knuckle", caseSize: "100/cs", unitPrice: 0.42, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Large Turkey Jerky Stuffed Buffalo Bone", category: "Buffalo", subCategory: "Stuffed Buffalo Bones", caseSize: "50/cs", unitPrice: 4.07, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Large Elky Jerky Stuffed Buffalo Bone", category: "Buffalo", subCategory: "Stuffed Buffalo Bones", caseSize: "50/cs", unitPrice: 4.07, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Large Venison and Sweet Potato Stuffed Buffalo Bone", category: "Buffalo", subCategory: "Stuffed Buffalo Bones", caseSize: "50/cs", unitPrice: 4.07, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Large Peanut Butter Stuffed Buffalo Bone", category: "Buffalo", subCategory: "Stuffed Buffalo Bones", caseSize: "50/cs", unitPrice: 4.07, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Large Buffalo Horn (Bulk)", category: "Buffalo", subCategory: "Buffalo Horns", caseSize: "35/cs", unitPrice: 5.14, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Medium Buffalo Horn (Bulk)", category: "Buffalo", subCategory: "Buffalo Horns", caseSize: "50/cs", unitPrice: 3.42, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Small Buffalo Horn (Bulk)", category: "Buffalo", subCategory: "Buffalo Horns", caseSize: "100/cs", unitPrice: 1.98, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6” Buffalo Collagen Sticks", category: "Buffalo", subCategory: "Buffalo Collagen", caseSize: "200/cs", unitPrice: 0.95, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== FEET ==========
    { name: "Crunchy Euro Chicken Feet (Bulk)", category: "Feet", subCategory: "Chicken Feet", caseSize: "750/cs", unitPrice: 0.30, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Euro White Chicken Feet (Bulk)", category: "Feet", subCategory: "Chicken Feet", caseSize: "500/cs", unitPrice: 0.30, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Vanilla Flavored White Euro Chicken Feet (Bulk)", category: "Feet", subCategory: "Chicken Feet", caseSize: "500/cs", unitPrice: 0.35, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Euro Duck Feet (Bulk)", category: "Feet", subCategory: "Duck Feet", caseSize: "500/cs", unitPrice: 0.78, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Fuzzy Rabbit Feet (Bulk)", category: "Feet", subCategory: "Fuzzy Rabbit Feet", caseSize: "500/cs", unitPrice: 0.45, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== HORNS ==========
    { name: "Large Rams Horn (Bulk)", category: "Horns", subCategory: "Rams Horn", caseSize: "50/cs", unitPrice: 5.51, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Medium Rams Horn (Bulk)", category: "Horns", subCategory: "Rams Horn", caseSize: "80/cs", unitPrice: 3.29, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Small Rams Horn (Bulk)", category: "Horns", subCategory: "Rams Horn", caseSize: "195/cs", unitPrice: 1.70, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Large Buffalo Horn (Bulk)", category: "Horns", subCategory: "Buffalo Horn", caseSize: "35/cs", unitPrice: 5.14, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Medium Buffalo Horn (Bulk)", category: "Horns", subCategory: "Buffalo Horn", caseSize: "50/cs", unitPrice: 3.42, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Small Buffalo Horn (Bulk)", category: "Horns", subCategory: "Buffalo Horn", caseSize: "100/cs", unitPrice: 1.98, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== HOOVES ==========
    { name: "Regular Cow Hooves (Bulk)", category: "Hooves", subCategory: "Cow Hooves", caseSize: "400/cs", unitPrice: 0.47, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Smoked Cow Hooves (Bulk)", category: "Hooves", subCategory: "Cow Hooves", caseSize: "400/cs", unitPrice: 0.54, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "“Super” Cow Hooves (Bulk)", category: "Hooves", subCategory: "Cow Hooves", caseSize: "200/cs", unitPrice: 0.95, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== BRAIDED ==========
    { name: "6” Braided Esophagus (Bulk)", category: "Braided", subCategory: "Braided Esophagus", caseSize: "500/cs", unitPrice: 0.90, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” Braided Esophagus (Bulk)", category: "Braided", subCategory: "Braided Esophagus", caseSize: "250/cs", unitPrice: 1.79, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6” Braided Esophagus (Display)", category: "Braided", subCategory: "Braided Esophagus", caseSize: "50/display", unitPrice: 0.95, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” Braided Esophagus (Display)", category: "Braided", subCategory: "Braided Esophagus", caseSize: "25/display", unitPrice: 1.91, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "5-7” Braided USA Hide Donuts (Bulk)", category: "Braided", subCategory: "Supreme USA Hide Braided Donuts", caseSize: "45/cs", unitPrice: 5.27, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "5-7” Vanilla USA Hide Braided Donuts (Bulk)", category: "Braided", subCategory: "Supreme USA Hide Braided Donuts", caseSize: "45/cs", unitPrice: 5.51, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "8-9” Braided USA Hide Donuts (Bulk)", category: "Braided", subCategory: "Supreme USA Hide Braided Donuts", caseSize: "30/cs", unitPrice: 6.46, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "8-9” Vanilla USA Hide Braided Donuts (Bulk)", category: "Braided", subCategory: "Supreme USA Hide Braided Donuts", caseSize: "30/cs", unitPrice: 6.59, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-11” Braided USA Hide Donuts (Bulk)", category: "Braided", subCategory: "Supreme USA Hide Braided Donuts", caseSize: "20/cs", unitPrice: 7.89, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-11” Vanilla USA Hide Braided Donuts (Bulk)", category: "Braided", subCategory: "Supreme USA Hide Braided Donuts", caseSize: "20/cs", unitPrice: 7.99, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== LARGE MEATY FEMUR / BONE / KNUCKLES ==========
    { name: "14-16” Jumbo Meaty Femur Knuckle Bone", category: "Large Meaty Femur/Bone/Knuckles", subCategory: "Jumbo Meaty Femur", caseSize: "18/cs", unitPrice: 6.59, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== PRESSED BONES ==========
    { name: "6” Supreme Pressed Ring (Bulk)", category: "Pressed Bones", subCategory: "Supreme Pressed Ring", caseSize: "100/cs", unitPrice: 2.77, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10” x 20mm Supreme Pressed Stick (Bulk)", category: "Pressed Bones", subCategory: "Supreme Pressed Stick", caseSize: "200/cs", unitPrice: 1.37, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "4.5” Pressed Bone (Bulk)", category: "Pressed Bones", subCategory: "Supreme Pressed Bones", caseSize: "500/cs", unitPrice: 0.41, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6.5” Pressed Bone (Bulk)", category: "Pressed Bones", subCategory: "Supreme Pressed Bones", caseSize: "200/cs", unitPrice: 1.32, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "8.5” Pressed Bone (Bulk)", category: "Pressed Bones", subCategory: "Supreme Pressed Bones", caseSize: "100/cs", unitPrice: 2.27, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10.5” Pressed Bone (Bulk)", category: "Pressed Bones", subCategory: "Supreme Pressed Bones", caseSize: "50/cs", unitPrice: 3.95, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12.5” Pressed Bone (Bulk)", category: "Pressed Bones", subCategory: "Supreme Pressed Bones", caseSize: "50/cs", unitPrice: 5.65, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== TWISTY Q’S AND MUNCHY STICKS ==========
    { name: "12” x 20mm Natural Munchy Sticks (Bulk)", category: "Twisty Q’s and Natural Munchy Sticks", subCategory: "Munch Sticks", caseSize: "200/cs", unitPrice: 0.30, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "5” x 10mm Natural Munchy Sticks (Bulk)", category: "Twisty Q’s and Natural Munchy Sticks", subCategory: "Munch Sticks", caseSize: "2000/cs", unitPrice: 0.05, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6.5” Bacon Munchy Sticks (Bulk)", category: "Twisty Q’s and Natural Munchy Sticks", subCategory: "Munch Sticks", caseSize: "1300/cs", unitPrice: 0.06, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10” White Twisty Q’s (Bulk)", category: "Twisty Q’s and Natural Munchy Sticks", subCategory: "Twisty Q’s", caseSize: "500/cs", unitPrice: 0.49, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10” Vanilla Twisty Q’s (Bulk)", category: "Twisty Q’s and Natural Munchy Sticks", subCategory: "Twisty Q’s", caseSize: "500/cs", unitPrice: 0.52, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== SUPREME HIDE CHIPS ==========
    { name: "White USA Supreme Hide Chips (Bulk per lb.)", category: "Supreme Hide Chips", subCategory: "Supreme USA Hide Chips", caseSize: "23lbs/cs", unitPrice: 5.93, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Vanilla USA Supreme Chips (Bulk per lb.)", category: "Supreme Hide Chips", subCategory: "Supreme USA Hide Chips", caseSize: "22lbs/cs", unitPrice: 5.99, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Peanut Butter Basted USA Supreme Hide Chips (Bulk per lb.)", category: "Supreme Hide Chips", subCategory: "Supreme USA Hide Chips", caseSize: "23lbs/cs", unitPrice: 5.39, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== RETRIEVERS ==========
    { name: "6/9” White Supreme Retriever (Bulk)", category: "Retrievers", subCategory: "USA White Hide Retriever", caseSize: "280/cs", unitPrice: 0.94, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-11” x 30mm White Supreme Retriever (Bulk)", category: "Retrievers", subCategory: "USA White Hide Retriever", caseSize: "130/cs", unitPrice: 1.62, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6/9” Vanilla Supreme Retriever (Bulk)", category: "Retrievers", subCategory: "Vanilla Flavored Retriever", caseSize: "300/cs", unitPrice: 1.22, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-11” x 30mm Vanilla MAGNA Retriever (Bulk)", category: "Retrievers", subCategory: "Vanilla Flavored Retriever", caseSize: "150/cs", unitPrice: 2.00, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== PACKAGED ITEMS ==========
    { name: "6-Pack Natural Cow Ears", category: "Packaged Items", subCategory: "Packaged Ears", caseSize: "24bags/cs", unitPrice: 7.13, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6-Pack Vanilla Cow Ears", category: "Packaged Items", subCategory: "Packaged Ears", caseSize: "24bags/cs", unitPrice: 7.13, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6-Pack Honey Smoked Cow Ears", category: "Packaged Items", subCategory: "Packaged Ears", caseSize: "24bags/cs", unitPrice: 7.13, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-Pack Fuzzy Rabbit Ears", category: "Packaged Items", subCategory: "Packaged Ears", caseSize: "60bags/cs", unitPrice: 4.45, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "5-Pack Hairy Beef Ears", category: "Packaged Items", subCategory: "Packaged Ears", caseSize: "50bags/cs", unitPrice: 7.19, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-Pack Euro Chicken Feet", category: "Packaged Items", subCategory: "Packaged Feet", caseSize: "50bags/cs", unitPrice: 3.59, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-Pack White Euro Chicken Feet", category: "Packaged Items", subCategory: "Packaged Feet", caseSize: "60bags/cs", unitPrice: 3.59, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-Pack Vanilla Euro Chicken Feet", category: "Packaged Items", subCategory: "Packaged Feet", caseSize: "60bags/cs", unitPrice: 3.95, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-Pack Euro Duck Feet", category: "Packaged Items", subCategory: "Packaged Feet", caseSize: "50bags/cs", unitPrice: 9.11, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-Pack Fuzzy Rabbit Feet", category: "Packaged Items", subCategory: "Packaged Feet", caseSize: "60bags/cs", unitPrice: 5.10, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "8oz. Bags of White Chunky Cheeks", category: "Packaged Items", subCategory: "Chunky Cheeks", caseSize: "24bags/cs", unitPrice: 3.46, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "8oz. Bags of Vanilla Chunky Cheeks", category: "Packaged Items", subCategory: "Chunky Cheeks", caseSize: "24bags/cs", unitPrice: 3.46, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "16oz. Bags of White Chunky Cheeks", category: "Packaged Items", subCategory: "Chunky Cheeks", caseSize: "12bags/cs", unitPrice: 6.33, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "16oz. Bags of Vanilla Chunky Cheeks", category: "Packaged Items", subCategory: "Chunky Cheeks", caseSize: "12bags/cs", unitPrice: 6.33, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "8oz. Bag of Beef Lung", category: "Packaged Items", subCategory: "Beef Lung", caseSize: "50bags/cs", unitPrice: 4.48, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "16oz. Bag of Beef Lung", category: "Packaged Items", subCategory: "Beef Lung", caseSize: "25bags/cs", unitPrice: 8.70, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "8oz. Bags of Beef Trachea Pieces", category: "Packaged Items", subCategory: "Trachea Pieces", caseSize: "24bags/cs", unitPrice: 3.11, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "16oz. Bags of Beef Trachea Pieces", category: "Packaged Items", subCategory: "Trachea Pieces", caseSize: "12/cs", unitPrice: 5.99, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "8oz. Bags of White Supreme Chips (Binkey’s)", category: "Packaged Items", subCategory: "Binky’s", caseSize: "24bags/cs", unitPrice: 2.99, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "8oz. Bags of Peanut Butter Supreme Chips (Binkey’s)", category: "Packaged Items", subCategory: "Binky’s", caseSize: "24bags/cs", unitPrice: 2.99, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "8oz. Bags of Vanilla Supreme Chips (Binkey’s)", category: "Packaged Items", subCategory: "Binky’s", caseSize: "24bags/cs", unitPrice: 2.99, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "16oz. Bags of White Supreme Chips (Binkey’s)", category: "Packaged Items", subCategory: "Binky’s", caseSize: "12bags/cs", unitPrice: 5.99, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "16oz. Bags of Peanut Butter Supreme Chips (Binkey’s)", category: "Packaged Items", subCategory: "Binky’s", caseSize: "12bags/cs", unitPrice: 5.99, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "16oz. Bags of Vanilla Supreme Chips (Binkey’s)", category: "Packaged Items", subCategory: "Binky’s", caseSize: "12bags/cs", unitPrice: 6.18, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "5-Pack of Crunchy Duck Heads", category: "Packaged Items", subCategory: "Duck and Goose", caseSize: "75bags/cs", unitPrice: 16.07, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-Pack of Crunchy Duck Necks", category: "Packaged Items", subCategory: "Duck and Goose", caseSize: "50bags/cs", unitPrice: 8.99, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-Pack of Crunchy Goose Necks", category: "Packaged Items", subCategory: "Duck and Goose", caseSize: "50bags/cs", unitPrice: 17.99, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-Pack of Duck Heads", category: "Packaged Items", subCategory: "Duck and Goose", caseSize: "50bags/cs", unitPrice: 7.91, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" }
];

// ================== LOAD PRODUCT CATALOG FROM SUPABASE ==================
async function loadProductCatalog() {
    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) {
            console.warn('loadProductCatalog: supabaseClient not ready — keeping hardcoded catalog');
            return;
        }

        const { data, error } = await supabaseClient
            .from('products')
            .select('id, name, category, sub_category, case_size, unit_price, is_market_price, active, updated_at')
            .order('category', { ascending: true })
            .order('name', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            console.warn('loadProductCatalog: no products in DB — keeping hardcoded catalog');
            return;
        }

        const mapped = data.map(row => ({
            id: row.id,
            name: row.name || '',
            category: row.category || 'Other',
            subCategory: row.sub_category || '',
            caseSize: row.case_size || '',
            unitPrice: row.unit_price != null ? Number(row.unit_price) : null,
            isMarketPrice: !!row.is_market_price,
            active: row.active !== false,
            marketPriceNote: null,
            landedCost: null,
            grossProfit: null,
            updatedAt: row.updated_at || null,
            priceAsOf: row.updated_at
                ? new Date(row.updated_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                : null
        }));

        PRODUCT_CATALOG_ALL = mapped;
        // Rest of the app only sees active products
        PRODUCT_CATALOG = mapped.filter(p => p.active !== false);

        console.log('loadProductCatalog: loaded', PRODUCT_CATALOG.length, 'active /', PRODUCT_CATALOG_ALL.length, 'total from Supabase');
    } catch (err) {
        console.error('loadProductCatalog error — keeping hardcoded catalog:', err);
    }
}
// ================== END LOAD PRODUCT CATALOG ==================


// ================== USER & AUTHENTICATION ==================

async function logout() {
    if (!confirm("Are you sure you want to logout?")) return;
    localStorage.removeItem("currentUser");
    try { await supabaseClient.auth.signOut(); } catch (_) {}
    window.location.href = "login-portal.html";
}

function loadUser() {
    const nameEl = document.getElementById("user-name");
    if (!nameEl) return;

    try {
        const raw = localStorage.getItem("currentUser");
        if (!raw) {
            nameEl.textContent = "User";
            return;
        }
        const user = JSON.parse(raw);
        nameEl.textContent = user.fullName || user.username || user.email || "User";
    } catch (err) {
        console.error("loadUser error:", err);
        nameEl.textContent = "User";
    }
}

// ================== WEEKLY MATRIX FUNCTIONS ==================
function getSunday(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff));
}

function formatWeekRange(startDate) {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function getFourWeekWindow() {
    const today = new Date();
    const currentSunday = getSunday(today);
    const weeks = [];

    for (let i = 0; i < 4; i++) {
        const weekStart = new Date(currentSunday);
        weekStart.setDate(weekStart.getDate() - (i * 7));
        weeks.unshift({
            start: weekStart,
            label: `Week ${4 - i}`,
            range: formatWeekRange(weekStart)
        });
    }
    return weeks;
}

function moveMatrixWeeks(weekOffset) {
    if (!currentMatrixStartDate) currentMatrixStartDate = getSunday(new Date());

    const newStart = new Date(currentMatrixStartDate);
    newStart.setDate(newStart.getDate() + weekOffset);

    currentMatrixStartDate = newStart;
    renderWeeklyMatrix();
}

let currentMatrixWeeks = [];

function renderWeeklyMatrix() {
    const container = document.getElementById('weekly-matrix-container');
    if (!container) return;

    // Only build the checkbox list once (rebuilding would wipe the user's selection)
    const matrixDd = document.getElementById('matrix-category-dropdown');
    if (matrixDd && matrixDd.children.length === 0) {
        populateCategoryDropdown();
    }

    const weeks = getFourWeekWindow();
    currentMatrixWeeks = weeks;
    currentMatrixStartDate = weeks[0].start;

    const searchTerm = (document.getElementById('matrix-search')?.value || '').toLowerCase().trim();
    const selectedCategories = getSelectedMatrixCategories();
    const isAllCategories = selectedCategories.includes('all');

    let filteredCatalog = PRODUCT_CATALOG.filter(product => {
        const matchesCategory = isAllCategories || selectedCategories.includes(product.category);
        const matchesSearch = searchTerm === '' || product.name.toLowerCase().includes(searchTerm);
        return matchesCategory && matchesSearch;
    });

    const grouped = {};
    filteredCatalog.forEach(product => {
        if (!grouped[product.category]) grouped[product.category] = [];
        grouped[product.category].push(product);
    });

        let html = `
        <div class="overflow-x-auto max-h-[650px] overflow-y-auto border border-[#6B4423] rounded-xl">
            <table class="w-full text-sm border-collapse">
                <thead>
                    <tr>
                        <th class="p-3 text-center border border-[#6B4423] min-w-[280px] sticky top-0 left-0 bg-[#1E4D2B] text-[#d4b78f] z-30">Product Name</th>
    `;

    weeks.forEach((week, index) => {
        html += `
            <th class="p-2 text-center border border-[#6B4423] min-w-[130px] sticky top-0 bg-[#1E4D2B] text-[#d4b78f] z-20">
                <div class="flex flex-col items-center gap-1">
                    <label class="flex items-center gap-1 cursor-pointer text-xs">
                        <input type="checkbox" class="week-checkbox" data-week-index="${index}" checked onchange="updateMatrixTotals()">
                        <span class="font-bold">${week.label}</span>
                    </label>
                    <div class="text-xs font-normal leading-tight">${week.range}</div>
                </div>
            </th>
        `;
    });

    html += `
                        <th class="p-3 text-center border border-[#6B4423] min-w-[120px] sticky top-0 bg-[#254a2f] text-[#d4b78f] z-20">
                            4 Week Total<br><span class="text-xs font-normal">(Selected Weeks)</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (Object.keys(grouped).length === 0) {
        html += `<tr><td colspan="6" class="p-8 text-center text-[#6B4423]">No products match your search or category filter.</td></tr>`;
    } else {
        Object.keys(grouped).forEach(category => {
            const productsInCategory = grouped[category];
            const categoryWeekTotals = [0, 0, 0, 0];

            const productData = productsInCategory.map(product => {
                const weekValues = weeks.map((week, idx) => {
                    const value = getMatrixValue(product, week.start);
                    categoryWeekTotals[idx] += value;
                    return value;
                });
                return { product, weekValues };
            });

            html += `
                <tr class="bg-[#f8f1e9] text-[#6B4423] category-total-row" data-category="${category}">
                    <td class="p-2 border border-[#6B4423] font-bold sticky left-0 bg-[#f8f1e9] z-10 min-w-[280px] text-left">${category}</td>
                    <td class="p-2 border border-[#6B4423] text-center font-bold week-cell" data-week="0">${formatMatrixValue(categoryWeekTotals[0])}</td>
                    <td class="p-2 border border-[#6B4423] text-center font-bold week-cell" data-week="1">${formatMatrixValue(categoryWeekTotals[1])}</td>
                    <td class="p-2 border border-[#6B4423] text-center font-bold week-cell" data-week="2">${formatMatrixValue(categoryWeekTotals[2])}</td>
                    <td class="p-2 border border-[#6B4423] text-center font-bold week-cell" data-week="3">${formatMatrixValue(categoryWeekTotals[3])}</td>
                    <td class="p-2 border border-[#6B4423] text-center font-bold total-cell">${currentMatrixMetric === 'change' ? '—' : '0'}</td>
                </tr>
            `;

            productData.forEach(({ product, weekValues }, index) => {
                const bgClass = index % 2 === 0 ? 'bg-white' : 'bg-[#f8f4eb]';
                html += `
                    <tr class="${bgClass}" data-product="${product.name.replace(/[^a-zA-Z0-9]/g, '_')}" data-category="${category}">
                        <td class="p-3 border border-[#6B4423] sticky left-0 ${bgClass} font-medium text-[#1E4D2B] z-10 text-left">${product.name}</td>
                        <td class="p-3 border border-[#6B4423] text-center week-cell" data-week="0">${formatMatrixValue(weekValues[0])}</td>
                        <td class="p-3 border border-[#6B4423] text-center week-cell" data-week="1">${formatMatrixValue(weekValues[1])}</td>
                        <td class="p-3 border border-[#6B4423] text-center week-cell" data-week="2">${formatMatrixValue(weekValues[2])}</td>
                        <td class="p-3 border border-[#6B4423] text-center week-cell" data-week="3">${formatMatrixValue(weekValues[3])}</td>
                        <td class="p-3 border border-[#6B4423] text-center font-bold total-cell">${currentMatrixMetric === 'change' ? '—' : '0'}</td>
                    </tr>
                `;
            });
        });
    }

    html += `</tbody></table></div>`;
    container.innerHTML = html;
    updateMatrixTotals();
}

function getUnitsSoldInWeek(productName, weekStartDate) {
    if (!allOrders || allOrders.length === 0) return 0;

    const weekEnd = new Date(weekStartDate);
    weekEnd.setDate(weekEnd.getDate() + 6);

    let total = 0;

    allOrders.forEach(order => {
        if (!order.items) return;
        order.items.forEach(item => {
            if (item.product && item.product.toLowerCase().includes(productName.toLowerCase())) {
                const orderDate = new Date(order.submittedAt);
                if (orderDate >= weekStartDate && orderDate <= weekEnd) {
                    total += item.quantity || 0;
                }
            }
        });
    });

    return total;
}

function getMatrixValue(product, weekStartDate) {
    const units = getUnitsSoldInWeek(product.name, weekStartDate);
    const price = product.unitPrice || 0;
    const cost = product.landedCost || 0;

    switch (currentMatrixMetric) {
        case 'sales':
            return units * price;
        case 'potential':
        case 'actual':
            return units * (price - cost);
        case 'change':
            const lastYearDate = new Date(weekStartDate);
            lastYearDate.setFullYear(lastYearDate.getFullYear() - 1);
            const lastYearUnits = getUnitsSoldInWeek(product.name, lastYearDate);
            if (lastYearUnits === 0) return null;
            return ((units - lastYearUnits) / lastYearUnits) * 100;
        default:
            return units;
    }
}

function formatMatrixValue(value) {
    if (value === null || value === undefined) return '—';

    if (currentMatrixMetric === 'sales' || currentMatrixMetric === 'potential' || currentMatrixMetric === 'actual') {
        return '$' + value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    if (currentMatrixMetric === 'change') {
        const sign = value > 0 ? '+' : '';
        return sign + value.toFixed(1) + '%';
    }
    return value;
}

function updateMatrixTotals() {
    const checkboxes = document.querySelectorAll('.week-checkbox');
    const selectedWeeks = [];
    checkboxes.forEach(cb => {
        if (cb.checked) selectedWeeks.push(parseInt(cb.dataset.weekIndex));
    });

    document.querySelectorAll('tr[data-product], tr.category-total-row').forEach(row => {
        let total = 0;

        if (currentMatrixMetric === 'change') {
            const totalCell = row.querySelector('.total-cell');
            if (totalCell) totalCell.textContent = '—';
            return;
        }

        selectedWeeks.forEach(weekIndex => {
            const cell = row.querySelector(`.week-cell[data-week="${weekIndex}"]`);
            if (cell) {
                let value = cell.textContent;
                if (currentMatrixMetric === 'sales' || currentMatrixMetric === 'potential' || currentMatrixMetric === 'actual') {
                    value = value.replace(/[$,]/g, '');
                }
                total += parseFloat(value) || 0;
            }
        });

        const totalCell = row.querySelector('.total-cell');
        if (totalCell) {
            if (currentMatrixMetric === 'sales' || currentMatrixMetric === 'potential' || currentMatrixMetric === 'actual') {
                totalCell.textContent = '$' + total.toLocaleString();
            } else {
                totalCell.textContent = total;
            }
        }
    });
}

function setMatrixMetric(metric) {
    currentMatrixMetric = metric;

    const buttons = {
        units: document.getElementById('metric-units'),
        sales: document.getElementById('metric-sales'),
        change: document.getElementById('metric-change'),
        potential: document.getElementById('metric-potential'),
        actual: document.getElementById('metric-actual')
    };

    Object.keys(buttons).forEach(key => {
        if (buttons[key]) {
            if (key === metric) {
                buttons[key].className = 'metric-btn px-4 py-2 rounded-xl text-sm font-semibold border-2 border-[#6B4423] bg-[#1E4D2B] text-[#d4b78f]';
            } else {
                buttons[key].className = 'metric-btn px-4 py-2 rounded-xl text-sm font-semibold border-2 border-[#6B4423] bg-white text-[#6B4423] hover:bg-[#f8f4eb]';
            }
        }
    });

    const disclaimer = document.getElementById('change-disclaimer');
    if (disclaimer) {
        disclaimer.style.display = (metric === 'change') ? 'block' : 'none';
    }

    renderWeeklyMatrix();
}

function getMetricLabel(metric) {
    switch (metric) {
        case 'units': return 'Units';
        case 'sales': return 'Sales $';
        case 'change': return '% Change';
        case 'potential': return 'Potential GP';
        case 'actual': return 'Actual GP';
        default: return metric;
    }
}

function populateCategoryDropdown() {
    const dropdown = document.getElementById('matrix-category-dropdown');
    if (!dropdown) return;

    const categories = [...new Set((PRODUCT_CATALOG || []).map(p => p.category).filter(Boolean))].sort();

    let html = `
        <label class="flex items-center gap-2 px-3 py-1.5 hover:bg-[#f8f4eb] cursor-pointer text-sm">
            <input type="checkbox" id="matrix-cat-all" checked onchange="onMatrixCategoryChange('all')" class="accent-[#1E4D2B]">
            <span class="font-semibold">All Categories</span>
        </label>
        <div class="border-t border-[#e8d9b8] my-1"></div>
    `;

    categories.forEach(cat => {
        const safeId = 'matrix-cat-' + cat.replace(/[^a-zA-Z0-9]/g, '_');
        html += `
            <label class="flex items-center gap-2 px-3 py-1.5 hover:bg-[#f8f4eb] cursor-pointer text-sm">
                <input type="checkbox" id="${safeId}" data-category="${cat}" onchange="onMatrixCategoryChange()" class="accent-[#1E4D2B]">
                <span>${cat}</span>
            </label>
        `;
    });

    dropdown.innerHTML = html;
}

function exportMatrixToCSV() {
    const table = document.querySelector('#weekly-matrix-container table');
    if (!table) return alert("No data to export.");

    let csv = [];
    table.querySelectorAll('tr').forEach(row => {
        const cols = row.querySelectorAll('td, th');
        const rowData = [];
        cols.forEach(col => {
            let text = col.innerText.replace(/(\r\n|\n|\r)/gm, " ").replace(/"/g, '""');
            rowData.push(`"${text}"`);
        });
        csv.push(rowData.join(','));
    });

    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Weekly_Sales_Matrix_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
}

function exportMatrixToExcel() {
    const table = document.querySelector('#weekly-matrix-container table');
    if (!table) return alert("No data to export.");
    if (typeof XLSX === 'undefined') return alert("Excel library not loaded.");

    const wb = XLSX.utils.table_to_book(table, { sheet: "Weekly Sales" });
    XLSX.writeFile(wb, `Weekly_Sales_Matrix_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ================== TRENDS VIEW (Phase 1) ==================
function setMatrixView(view) {
    currentMatrixView = view;

    const tableView = document.getElementById('matrix-table-view');
    const trendsView = document.getElementById('matrix-trends-view');
    const btnTable = document.getElementById('matrix-view-table');
    const btnTrends = document.getElementById('matrix-view-trends');

    if (!tableView || !trendsView) return;

    if (view === 'trends') {
        tableView.classList.add('hidden');
        trendsView.classList.remove('hidden');
        if (btnTable) {
            btnTable.className = 'px-5 py-2 rounded-xl text-sm font-semibold border-2 border-[#6B4423] bg-white text-[#6B4423] hover:bg-[#f8f4eb]';
        }
        if (btnTrends) {
            btnTrends.className = 'px-5 py-2 rounded-xl text-sm font-semibold border-2 border-[#6B4423] bg-[#1E4D2B] text-[#d4b78f]';
        }
        initTrendsYears();
        populateTrendsCategoryDropdown();
        renderTrendsChart();
    } else {
        trendsView.classList.add('hidden');
        tableView.classList.remove('hidden');
        if (btnTable) {
            btnTable.className = 'px-5 py-2 rounded-xl text-sm font-semibold border-2 border-[#6B4423] bg-[#1E4D2B] text-[#d4b78f]';
        }
        if (btnTrends) {
            btnTrends.className = 'px-5 py-2 rounded-xl text-sm font-semibold border-2 border-[#6B4423] bg-white text-[#6B4423] hover:bg-[#f8f4eb]';
        }
        if (typeof renderWeeklyMatrix === 'function') renderWeeklyMatrix();
    }
}

function setTrendsMode(mode) {
    currentTrendsMode = mode;
    const btnMulti = document.getElementById('trends-mode-multi');
    const btnMtd = document.getElementById('trends-mode-mtd');
    const yearControls = document.getElementById('trends-year-0')?.closest('.flex.items-center.gap-3');

    if (mode === 'multi') {
        if (btnMulti) btnMulti.className = 'px-4 py-2 rounded-xl text-sm font-semibold border-2 border-[#6B4423] bg-[#1E4D2B] text-[#d4b78f]';
        if (btnMtd) btnMtd.className = 'px-4 py-2 rounded-xl text-sm font-semibold border-2 border-[#6B4423] bg-white text-[#6B4423] hover:bg-[#f8f4eb]';
        if (yearControls) yearControls.classList.remove('hidden');
        renderTrendsChart();
    } else {
        if (btnMtd) btnMtd.className = 'px-4 py-2 rounded-xl text-sm font-semibold border-2 border-[#6B4423] bg-[#1E4D2B] text-[#d4b78f]';
        if (btnMulti) btnMulti.className = 'px-4 py-2 rounded-xl text-sm font-semibold border-2 border-[#6B4423] bg-white text-[#6B4423] hover:bg-[#f8f4eb]';
        if (yearControls) yearControls.classList.add('hidden');
        renderTrendsChart();
    }
}

function setTrendsMetric(metric) {
    currentTrendsMetric = metric;
    const btnUnits = document.getElementById('trends-metric-units');
    const btnSales = document.getElementById('trends-metric-sales');

    if (metric === 'units') {
        if (btnUnits) btnUnits.className = 'px-4 py-2 rounded-xl text-sm font-semibold border-2 border-[#6B4423] bg-[#1E4D2B] text-[#d4b78f]';
        if (btnSales) btnSales.className = 'px-4 py-2 rounded-xl text-sm font-semibold border-2 border-[#6B4423] bg-white text-[#6B4423] hover:bg-[#f8f4eb]';
    } else {
        if (btnSales) btnSales.className = 'px-4 py-2 rounded-xl text-sm font-semibold border-2 border-[#6B4423] bg-[#1E4D2B] text-[#d4b78f]';
        if (btnUnits) btnUnits.className = 'px-4 py-2 rounded-xl text-sm font-semibold border-2 border-[#6B4423] bg-white text-[#6B4423] hover:bg-[#f8f4eb]';
    }
    renderTrendsChart();
}

function initTrendsYears() {
    const currentYear = new Date().getFullYear();
    // Forward-looking: current year + next two years
    const years = [currentYear, currentYear + 1, currentYear + 2];

    years.forEach((year, idx) => {
        const label = document.getElementById('trends-year-' + idx + '-label');
        if (label) label.textContent = year;
        const cb = document.getElementById('trends-year-' + idx);
        if (cb) cb.dataset.year = year;
    });
}

function populateTrendsCategoryDropdown() {
    const dropdown = document.getElementById('trends-category-dropdown');
    if (!dropdown) return;

    const categories = [...new Set((PRODUCT_CATALOG || []).map(p => p.category).filter(Boolean))].sort();

    let html = `
        <label class="flex items-center gap-2 px-3 py-1.5 hover:bg-[#f8f4eb] cursor-pointer text-sm">
            <input type="checkbox" id="trends-cat-all" checked onchange="onTrendsCategoryChange('all')" class="accent-[#1E4D2B]">
            <span class="font-semibold">All Categories</span>
        </label>
        <div class="border-t border-[#e8d9b8] my-1"></div>
    `;

    categories.forEach(cat => {
        const safeId = 'trends-cat-' + cat.replace(/[^a-zA-Z0-9]/g, '_');
        html += `
            <label class="flex items-center gap-2 px-3 py-1.5 hover:bg-[#f8f4eb] cursor-pointer text-sm">
                <input type="checkbox" id="${safeId}" data-category="${cat}" onchange="onTrendsCategoryChange()" class="accent-[#1E4D2B]">
                <span>${cat}</span>
            </label>
        `;
    });

    dropdown.innerHTML = html;
}

function toggleTrendsCategoryDropdown() {
    const dd = document.getElementById('trends-category-dropdown');
    if (!dd) return;
    dd.classList.toggle('hidden');
}

function onTrendsCategoryChange(which) {
    const allCb = document.getElementById('trends-cat-all');
    const categoryCbs = document.querySelectorAll('#trends-category-dropdown input[data-category]');

    if (which === 'all') {
        const isChecked = allCb?.checked;
        categoryCbs.forEach(cb => { cb.checked = false; });
        if (allCb) allCb.checked = !!isChecked;
    } else {
        if (allCb) allCb.checked = false;
    }

    updateTrendsCategoryLabel();
    renderTrendsChart();
}

function getSelectedMatrixCategories() {
    const allCb = document.getElementById('matrix-cat-all');
    if (allCb && allCb.checked) return ['all'];

    const selected = [];
    document.querySelectorAll('#matrix-category-dropdown input[data-category]:checked').forEach(cb => {
        selected.push(cb.dataset.category);
    });
    return selected.length ? selected : ['all'];
}

function onMatrixCategoryChange(which) {
    const allCb = document.getElementById('matrix-cat-all');
    const categoryCbs = document.querySelectorAll('#matrix-category-dropdown input[data-category]');

    if (which === 'all') {
        const isChecked = allCb?.checked;
        categoryCbs.forEach(cb => { cb.checked = false; });
        if (allCb) allCb.checked = !!isChecked;
    } else {
        if (allCb) allCb.checked = false;
    }

    // Update the dropdown label if the element exists
    const label = document.getElementById('matrix-category-label');
    if (label) {
        const selected = getSelectedMatrixCategories();
        if (selected.includes('all') || selected.length === 0) {
            label.textContent = 'All Categories';
        } else if (selected.length === 1) {
            label.textContent = selected[0];
        } else {
            label.textContent = selected.length + ' categories';
        }
    }

    if (typeof renderWeeklyMatrix === 'function') {
        renderWeeklyMatrix();
    }
}

function toggleMatrixCategoryDropdown() {
    const dd = document.getElementById('matrix-category-dropdown');
    if (!dd) return;
    dd.classList.toggle('hidden');
}

function getSelectedTrendsCategories() {
    const allCb = document.getElementById('trends-cat-all');
    if (allCb && allCb.checked) return ['all'];

    const selected = [];
    document.querySelectorAll('#trends-category-dropdown input[data-category]:checked').forEach(cb => {
        selected.push(cb.dataset.category);
    });
    return selected.length ? selected : ['all'];
}

function updateTrendsCategoryLabel() {
    const label = document.getElementById('trends-category-label');
    if (!label) return;

    const selected = getSelectedTrendsCategories();
    if (selected.includes('all') || selected.length === 0) {
        label.textContent = 'All Categories';
    } else if (selected.length === 1) {
        label.textContent = selected[0];
    } else {
        label.textContent = selected.length + ' categories';
    }
}

document.addEventListener('click', function(e) {
    const matrixBtn = document.getElementById('matrix-category-btn');
    const matrixDd = document.getElementById('matrix-category-dropdown');
    if (matrixBtn && matrixDd && !matrixBtn.contains(e.target) && !matrixDd.contains(e.target)) {
        matrixDd.classList.add('hidden');
    }

    const trendsBtn = document.getElementById('trends-category-btn');
    const trendsDd = document.getElementById('trends-category-dropdown');
    if (trendsBtn && trendsDd && !trendsBtn.contains(e.target) && !trendsDd.contains(e.target)) {
        trendsDd.classList.add('hidden');
    }
});

function getMonthlyTrendData(selectedYears, categories, metric) {
    // categories is an array: ['all'] or ['Bully Sticks', 'Jerky', ...]
    const result = {};
    selectedYears.forEach(y => {
        result[y] = {};
        for (let m = 0; m < 12; m++) result[y][m] = 0;
    });

    if (!allOrders || allOrders.length === 0) return result;

    const isAll = !categories || categories.includes('all') || categories.length === 0;

    const productNamesInCategory = new Set();
    if (!isAll && typeof PRODUCT_CATALOG !== 'undefined') {
        PRODUCT_CATALOG.forEach(p => {
            if (categories.includes(p.category)) {
                productNamesInCategory.add(p.name);
            }
        });
    }

    allOrders.forEach(order => {
        const orderDate = new Date(order.submittedAt || order.submitted_at || order.date || 0);
        if (isNaN(orderDate.getTime())) return;

        const year = orderDate.getFullYear();
        const month = orderDate.getMonth();

        if (!selectedYears.includes(year)) return;

        (order.items || []).forEach(item => {
            const name = item.product || item.name || '';
            if (!name) return;

            if (!isAll) {
                if (!productNamesInCategory.has(name)) {
                    let matched = false;
                    productNamesInCategory.forEach(pn => {
                        if (name.toLowerCase().includes(pn.toLowerCase()) || pn.toLowerCase().includes(name.toLowerCase())) {
                            matched = true;
                        }
                    });
                    if (!matched) return;
                }
            }

            const qty = parseInt(item.quantity, 10) || 0;
            if (qty <= 0) return;

            if (metric === 'sales') {
                const unit = typeof getOrderItemUnitPrice === 'function'
                    ? getOrderItemUnitPrice(item)
                    : (parseFloat(item.unitPrice) || 0);
                result[year][month] += qty * unit;
            } else {
                result[year][month] += qty;
            }
        });
    });

    return result;
}

function renderTrendsChart() {
    const canvas = document.getElementById('trends-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    const selectedCategories = getSelectedTrendsCategories();
    const metric = currentTrendsMetric || 'units';

    // ========== MTD vs LY MTD MODE ==========
    if (currentTrendsMode === 'mtd') {
        renderMtdComparisonChart(canvas, selectedCategories, metric);
        return;
    }

    // ========== MULTI-YEAR MODE ==========
    const selectedYears = [];
    for (let i = 0; i < 3; i++) {
        const cb = document.getElementById('trends-year-' + i);
        if (cb && cb.checked) {
            const y = parseInt(cb.dataset.year || cb.nextElementSibling?.textContent, 10);
            if (!isNaN(y)) selectedYears.push(y);
        }
    }
    if (selectedYears.length === 0) {
        selectedYears.push(new Date().getFullYear());
    }
    selectedYears.sort((a, b) => a - b);

    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const colors = [
        { border: '#1E4D2B', bg: 'rgba(30, 77, 43, 0.12)' },
        { border: '#6B4423', bg: 'rgba(107, 68, 35, 0.12)' },
        { border: '#c9a227', bg: 'rgba(201, 162, 39, 0.12)' },
        { border: '#2a6f4e', bg: 'rgba(42, 111, 78, 0.12)' },
        { border: '#8b5a2b', bg: 'rgba(139, 90, 43, 0.12)' },
        { border: '#4a7c59', bg: 'rgba(74, 124, 89, 0.12)' },
        { border: '#a67c52', bg: 'rgba(166, 124, 82, 0.12)' },
        { border: '#3d5c45', bg: 'rgba(61, 92, 69, 0.12)' }
    ];

    let datasets = [];
    const isAll = selectedCategories.includes('all');

    if (!isAll && selectedCategories.length > 0) {
        // One line per selected category (focus on current year or latest selected year)
        const focusYear = selectedYears.includes(new Date().getFullYear())
            ? new Date().getFullYear()
            : selectedYears[selectedYears.length - 1];

        selectedCategories.forEach((cat, idx) => {
            const monthlyData = getMonthlyTrendData([focusYear], [cat], metric);
            const data = [];
            for (let m = 0; m < 12; m++) {
                data.push(Math.round((monthlyData[focusYear] || {})[m] || 0));
            }
            const c = colors[idx % colors.length];
            datasets.push({
                label: cat,
                data: data,
                borderColor: c.border,
                backgroundColor: c.bg,
                borderWidth: 2.5,
                tension: 0.3,
                fill: false,
                pointRadius: 3,
                pointHoverRadius: 5
            });
        });
    } else {
        // All Categories → one line per year
        const monthlyData = getMonthlyTrendData(selectedYears, ['all'], metric);
        datasets = selectedYears.map((year, idx) => {
            const data = [];
            for (let m = 0; m < 12; m++) data.push(Math.round((monthlyData[year] || {})[m] || 0));
            const c = colors[idx % colors.length];
            return {
                label: String(year),
                data: data,
                borderColor: c.border,
                backgroundColor: c.bg,
                borderWidth: 2.5,
                tension: 0.3,
                fill: true,
                pointRadius: 3,
                pointHoverRadius: 5
            };
        });
    }

    if (trendsChartInstance) {
        trendsChartInstance.destroy();
        trendsChartInstance = null;
    }

    trendsChartInstance = new Chart(canvas, {
        type: 'line',
        data: { labels: monthLabels, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#6B4423', font: { weight: '600' }, boxWidth: 12 }
                },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            const v = ctx.parsed.y || 0;
                            if (metric === 'sales') return ctx.dataset.label + ': $' + v.toLocaleString();
                            return ctx.dataset.label + ': ' + v.toLocaleString() + ' units';
                        }
                    }
                }
            },
            scales: {
                x: { ticks: { color: '#6B4423' }, grid: { color: 'rgba(107, 68, 35, 0.08)' } },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#6B4423',
                        callback: function(value) {
                            if (metric === 'sales') {
                                if (value >= 1000) return '$' + (value / 1000).toFixed(0) + 'k';
                                return '$' + value;
                            }
                            return value;
                        }
                    },
                    grid: { color: 'rgba(107, 68, 35, 0.08)' }
                }
            }
        }
    });

    // Summary cards
    const monthlyForSummary = getMonthlyTrendData(selectedYears, selectedCategories, metric);
    updateTrendsSummary(selectedYears, monthlyForSummary, metric, selectedCategories);
}

function renderMtdComparisonChart(canvas, categories, metric) {
    const isAll = !categories || categories.includes('all') || categories.length === 0;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();

    let mtdValue = 0;
    let lyMtdValue = 0;

    const productNamesInCategory = new Set();
    if (!isAll && typeof PRODUCT_CATALOG !== 'undefined') {
        PRODUCT_CATALOG.forEach(p => {
            if (categories.includes(p.category)) {
                productNamesInCategory.add(p.name);
            }
        });
    }

    (allOrders || []).forEach(order => {
        const orderDate = new Date(order.submittedAt || order.submitted_at || order.date || 0);
        if (isNaN(orderDate.getTime())) return;

        const y = orderDate.getFullYear();
        const m = orderDate.getMonth();
        const d = orderDate.getDate();

        const isCurrentMtd = (y === currentYear && m === currentMonth && d <= currentDay);
        const isLyMtd = (y === currentYear - 1 && m === currentMonth && d <= currentDay);

        if (!isCurrentMtd && !isLyMtd) return;

        (order.items || []).forEach(item => {
            const name = item.product || item.name || '';
            if (!name) return;

            if (!isAll) {
                if (!productNamesInCategory.has(name)) {
                    let matched = false;
                    productNamesInCategory.forEach(pn => {
                        if (name.toLowerCase().includes(pn.toLowerCase()) || pn.toLowerCase().includes(name.toLowerCase())) {
                            matched = true;
                        }
                    });
                    if (!matched) return;
                }
            }

            const qty = parseInt(item.quantity, 10) || 0;
            if (qty <= 0) return;

            let add = qty;
            if (metric === 'sales') {
                const unit = typeof getOrderItemUnitPrice === 'function'
                    ? getOrderItemUnitPrice(item)
                    : (parseFloat(item.unitPrice) || 0);
                add = qty * unit;
            }

            if (isCurrentMtd) mtdValue += add;
            if (isLyMtd) lyMtdValue += add;
        });
    });

    mtdValue = Math.round(mtdValue);
    lyMtdValue = Math.round(lyMtdValue);

    if (trendsChartInstance) {
        trendsChartInstance.destroy();
        trendsChartInstance = null;
    }

    trendsChartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: ['This Month (MTD)', 'Last Year MTD'],
            datasets: [{
                label: metric === 'sales' ? 'Sales $' : 'Units',
                data: [mtdValue, lyMtdValue],
                backgroundColor: ['rgba(30, 77, 43, 0.75)', 'rgba(107, 68, 35, 0.65)'],
                borderColor: ['#1E4D2B', '#6B4423'],
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            const v = ctx.parsed.y || 0;
                            if (metric === 'sales') return '$' + v.toLocaleString();
                            return v.toLocaleString() + ' units';
                        }
                    }
                }
            },
            scales: {
                x: { ticks: { color: '#6B4423', font: { weight: '600' } }, grid: { display: false } },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#6B4423',
                        callback: function(value) {
                            if (metric === 'sales') {
                                if (value >= 1000) return '$' + (value / 1000).toFixed(0) + 'k';
                                return '$' + value;
                            }
                            return value;
                        }
                    },
                    grid: { color: 'rgba(107, 68, 35, 0.08)' }
                }
            }
        }
    });

    // Summary cards for MTD mode
    const ytdEl = document.getElementById('trends-summary-ytd');
    const vsEl = document.getElementById('trends-summary-vsly');
    const topEl = document.getElementById('trends-summary-topcat');

    if (ytdEl) {
        ytdEl.textContent = metric === 'sales'
            ? '$' + mtdValue.toLocaleString()
            : mtdValue.toLocaleString() + ' units';
    }

    if (vsEl) {
        if (lyMtdValue === 0) {
            vsEl.textContent = '—';
            vsEl.className = 'text-xl font-bold brand-green mt-1';
        } else {
            const pct = ((mtdValue - lyMtdValue) / lyMtdValue) * 100;
            const sign = pct >= 0 ? '+' : '';
            vsEl.textContent = sign + pct.toFixed(1) + '%';
            vsEl.className = 'text-xl font-bold mt-1 ' + (pct >= 0 ? 'text-green-700' : 'text-red-600');
        }
    }

    if (topEl) {
        if (isAll) {
            topEl.textContent = 'All Categories';
        } else if (categories.length === 1) {
            topEl.textContent = categories[0];
        } else {
            topEl.textContent = categories.length + ' categories';
        }
    }
}

function updateTrendsSummary(selectedYears, monthlyData, metric, category) {
    const currentYear = new Date().getFullYear();
    const prevYear = currentYear - 1;

    let ytd = 0;
    let prevYtd = 0;

    if (monthlyData[currentYear]) {
        Object.values(monthlyData[currentYear]).forEach(v => ytd += v);
    }
    if (monthlyData[prevYear]) {
        Object.values(monthlyData[prevYear]).forEach(v => prevYtd += v);
    }

    const ytdEl = document.getElementById('trends-summary-ytd');
    const vsEl = document.getElementById('trends-summary-vsly');
    const topEl = document.getElementById('trends-summary-topcat');

    if (ytdEl) {
        if (metric === 'sales') {
            ytdEl.textContent = '$' + Math.round(ytd).toLocaleString();
        } else {
            ytdEl.textContent = Math.round(ytd).toLocaleString() + ' units';
        }
    }

    if (vsEl) {
        if (prevYtd === 0) {
            vsEl.textContent = '—';
        } else {
            const pct = ((ytd - prevYtd) / prevYtd) * 100;
            const sign = pct >= 0 ? '+' : '';
            vsEl.textContent = sign + pct.toFixed(1) + '%';
            vsEl.className = 'text-xl font-bold mt-1 ' + (pct >= 0 ? 'text-green-700' : 'text-red-600');
        }
    }

    if (topEl) {
        if (!category || category === 'all' || (Array.isArray(category) && (category.includes('all') || category.length === 0))) {
            topEl.textContent = 'All Categories';
        } else if (Array.isArray(category)) {
            topEl.textContent = category.length === 1 ? category[0] : category.length + ' categories';
        } else {
            topEl.textContent = category;
        }
    }
}

// ================== ORDERS ==================
// --- Orders Helpers ---
async function loadOrders() {
    showTableLoading('orders-table', 'Loading orders…');
    try {
        const { data, error } = await supabaseClient
            .from('orders')
            .select('id, source, status, submitted_at, customer_name, customer_email, customer_company, salesman_name, salesman_email, notes, shipping_cost, credit, items, tracking_number, carrier, delivered_at, payment_status, paid_at, portal_commission_rate')
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
                portalCommissionRate: o.portal_commission_rate != null ? Number(o.portal_commission_rate) : 5
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

    function getOrderTotalInfo(order) {
    let total = 0;
    let hasMarketPrice = false;
    (order.items || []).forEach(item => {
        const unit = parseFloat(item.unitPrice);
        const hasRealPrice = !isNaN(unit) && unit > 0;
        const qty = parseInt(item.quantity, 10) || 0;

        if (item.isMarketPrice && !hasRealPrice) {
            // Market item still waiting for admin price
            hasMarketPrice = true;
        } else if (hasRealPrice) {
            total += unit * qty;
        }
    });
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
        ${jonathanCommissionButtons}
    </div>
    <table class="w-full">
        <thead>
            <tr class="bg-[#1E4D2B] text-[#d4b78f]">
                <th class="p-3 text-center w-10">
                    <input type="checkbox" id="select-all-orders" onchange="toggleSelectAllOrders(this)">
                </th>
                <th class="p-3 text-left">Salesman</th>
                <th class="p-3 text-left">Customer</th>
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

        let totalHTML = '';
        if (hasMarketPrice) {
            totalHTML = `<span class="text-orange-600 font-semibold">Needs Pricing</span>${rateBadge}`;
        } else {
            totalHTML = `
                <div class="flex flex-col items-start gap-0.5">
                    <span>$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${rateBadge}</span>
                </div>
            `;
        }

        

        html += `
            <tr class="border-t border-[#6B4423] hover:bg-[#f8f4eb] cursor-pointer"
                onclick="openOrderInvoiceModal('${safeId}')">
                <td class="p-3 text-center" onclick="event.stopPropagation()">
                    <input type="checkbox" class="order-checkbox" value="${safeId}" onchange="updatePrintSelectedButton()">
                </td>
                <td class="p-3">${order.salesman || (order.source === 'wholesale' ? 'Wholesale' : '—')}</td>
                <td class="p-3">${order.customer || '—'}</td>
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
        subtitle.textContent = `Order #${order.id} · ${order.customer || ''}`;
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
                <p class="font-semibold brand-green">${item.product}</p>
                <p class="text-sm text-[#6B4423] mb-2">Quantity: ${item.quantity} · Case: ${item.caseSize || '—'}</p>
                <label class="text-sm text-[#6B4423]">Unit Price ($)</label>
                <input type="number"
                       id="market-price-input-${index}"
                       min="0"
                       step="0.01"
                       placeholder="0.00"
                       class="w-full mt-1 border-2 border-[#6B4423] rounded-lg px-3 py-2 text-sm"
                       data-product="${item.product}">
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
    if (idEl) idEl.textContent = String(order.id || '');
    if (subtitleEl) subtitleEl.textContent = 'Review line items, then approve or edit';

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
                    <p class="font-semibold text-sm brand-green">${item.product}</p>
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
        const safeName = p.name.replace(/'/g, "\\'");
        return `
            <button type="button"
                    onclick="addApproveOrderProduct('${safeName}')"
                    class="w-full text-left px-4 py-2 text-sm hover:bg-[#f8f4eb] border-b border-[#f0e6d9]">
                <span class="font-medium text-[#1E4D2B]">${p.name}</span>
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
}

async function confirmApproveOrder() {
    if (!approveOrderOrder) return;

    if (!approveOrderItems.length) {
        alert('Order must have at least one line item.');
        return;
    }

    const orderId = approveOrderOrder.id;

    const itemsPayload = approveOrderItems.map(item => ({
        product: item.product,
        quantity: item.quantity || 1,
        caseSize: item.caseSize || '',
        unitPrice: item.unitPrice,
        displayPrice: item.displayPrice || '',
        isMarketPrice: !!item.isMarketPrice
    }));

    try {
        console.log('confirmApproveOrder →', { orderId, type: typeof orderId });

        const { data, error } = await supabaseClient
            .from('orders')
            .update({
                status: 'received',
                items: itemsPayload
            })
            .eq('id', orderId)
            .select('id, status');

        if (error) throw error;

        if (!data || data.length === 0) {
            throw new Error(
                'Update matched 0 rows for order ' + orderId +
                '. Check that the order still exists and RLS allows admin updates on orders.'
            );
        }
        // Insert any items marked Out of Stock during this approval
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
        hideApproveOrderModal();
        await loadOrders();
        alert('Order approved.');
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
    const sub = Number(subtotal) || 0;
    if (isPennsylvaniaLocation(locationText)) {
        if (sub >= 250) {
            return { free: true, reason: 'Free shipping: $250+ in Pennsylvania' };
        }
        return { free: false, reason: 'Free shipping at $250+ in Pennsylvania', threshold: 250 };
    }
    if (isMidAtlantic650Location(locationText)) {
        if (sub >= 650) {
            return { free: true, reason: 'Free shipping: $650+ (MD / NY / NJ / OH / WV)' };
        }
        return { free: false, reason: 'Free shipping at $650+ for MD/NY/NJ/OH/WV', threshold: 650 };
    }
    if (isWestOfMississippiLocation(locationText)) {
        if (sub >= 2000) {
            return { free: true, reason: 'Free shipping: $2,000+ west of the Mississippi' };
        }
        return { free: false, reason: 'Free shipping at $2,000+ west of the Mississippi', threshold: 2000 };
    }
    // Other east of Mississippi
    if (sub >= 1200) {
        return { free: true, reason: 'Free shipping: $1,200+ east of the Mississippi' };
    }
    return { free: false, reason: 'Free shipping at $1,200+ east of the Mississippi', threshold: 1200 };
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
let shipInvoiceOrder = null;
let shipInvoiceItems = [];
let shipInvoiceMode = 'order'; // 'order' | 'backorder'
let shipBackOrderPendingIds = [];

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
    document.getElementById('ship-inv-id').textContent = String(order.id || '');
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
                    <p class="font-semibold text-sm brand-green">${item.product}</p>
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
                <span class="font-medium text-[#1E4D2B]">${p.name}</span>
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
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
                    'apikey': SUPABASE_ANON_KEY
                },
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

        alert('Order shipped. Invoice saved.');
    } catch (err) {
        console.error(err);
        alert('Could not ship order.\n' + (err.message || ''));
    }
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

    if (alertEl && agingText) {
        if (agingCount > 0) {
            alertEl.classList.remove('hidden');
            agingText.textContent = `${agingCount} order${agingCount > 1 ? 's' : ''} aging over 10 days`;
        } else {
            alertEl.classList.add('hidden');
        }
    }
}

function updateDashboardPendingCount() {
    if (!allOrders) return;

    const pendingCount = allOrders.filter(order => {
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
            allCustomers.map(c =>
                `<option value="${(c.name || '').replace(/"/g, '&quot;')}">${c.name}${c.company ? ' — ' + c.company : ''}</option>`
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
                <span class="font-medium text-[#1E4D2B]">${p.name}</span>
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

    newOrderSelectedProducts.push({ name: productName, quantity: 1 });

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

function renderNewOrderSelectedList() {
    const list = document.getElementById('new-order-selected-list');
    if (!list) return;

    if (newOrderSelectedProducts.length === 0) {
        list.innerHTML = '<p class="text-sm text-[#6B4423]" id="new-order-empty-msg">No products added yet. Search above to add items.</p>';
        return;
    }

    list.innerHTML = newOrderSelectedProducts.map((p, index) => {
        const catalogItem = (typeof PRODUCT_CATALOG !== 'undefined')
            ? PRODUCT_CATALOG.find(c => c.name === p.name)
            : null;
        const caseSize = catalogItem?.caseSize || '—';

        const priceText = catalogItem
            ? (catalogItem.isMarketPrice
                ? 'Market'
                : (catalogItem.unitPrice != null
                    ? ('$' + Number(catalogItem.unitPrice).toFixed(2))
                    : '—'))
            : '—';

        return `
            <div class="flex flex-wrap items-center gap-3 bg-white border border-[#6B4423] rounded-xl px-3 py-2">
                <div class="flex-1 min-w-[140px]">
                    <span class="text-sm font-medium text-[#1E4D2B]">${p.name}</span>
                    <span class="block text-xs text-[#6B4423]">${caseSize} · ${priceText}</span>
                </div>
                <label class="text-xs text-[#6B4423]">Units</label>
                <input type="number" min="1" value="${p.quantity}"
                       class="w-20 border-2 border-[#6B4423] rounded-lg px-2 py-1 text-sm text-center"
                       onchange="updateOrderProductQty(${index}, this.value)">
                <button type="button" onclick="removeOrderProduct(${index})"
                        class="text-red-600 text-sm px-2 py-1 hover:bg-red-50 rounded-lg">
                    Remove
                </button>
            </div>
        `;
    }).join('');

    // Auto-focus the Units input on the product just added
    const qtyInputs = list.querySelectorAll('input[type="number"]');
    if (qtyInputs.length > 0) {
        const last = qtyInputs[qtyInputs.length - 1];
        last.focus();
        last.select();
    }
}

function updateOrderProductQty(index, value) {
    const qty = parseInt(value, 10);
    if (!qty || qty < 1) return;
    if (newOrderSelectedProducts[index]) {
        newOrderSelectedProducts[index].quantity = qty;
    }
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
                return {
                    product: p.name,
                    quantity: p.quantity || 1,
                    caseSize: catalog?.caseSize || '',
                    unitPrice: catalog && !catalog.isMarketPrice ? catalog.unitPrice : null,
                    displayPrice: catalog
                        ? (catalog.isMarketPrice ? 'Market Price' : ('$' + Number(catalog.unitPrice).toFixed(2)))
                        : '',
                    isMarketPrice: !!(catalog && catalog.isMarketPrice)
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
                    <p style="font-weight:600;color:#1E4D2B;margin:0;">${item.product || 'Item'}</p>
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
                <p style="margin:0 0 12px;color:#1E4D2B;font-weight:600;">${customer}</p>
                <p style="font-size:11px;font-weight:700;color:#6B4423;text-transform:uppercase;margin:0 0 4px;">Shipping Address</p>
                <p style="margin:0 0 16px;color:#1E4D2B;white-space:pre-line;">${shipText}</p>
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
    if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
    }

    const customer = (document.getElementById('new-order-customer')?.value || '').trim();
    const salesman = (document.getElementById('new-order-salesman')?.value || '').trim();
    const notes = (document.getElementById('new-order-notes')?.value || '').trim();

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
                return {
                    product: p.name,
                    quantity: p.quantity || 1,
                    caseSize: catalog?.caseSize || '',
                    unitPrice: catalog && !catalog.isMarketPrice ? catalog.unitPrice : null,
                    displayPrice: catalog
                        ? (catalog.isMarketPrice ? 'Market Price' : ('$' + Number(catalog.unitPrice).toFixed(2)))
                        : '',
                    isMarketPrice: !!(catalog && catalog.isMarketPrice)
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
        customer_name: customer,
        customer_email: null,
        customer_company: null,
        salesman_email: null,
        salesman_name: salesman || user.fullName || user.name || 'Admin',
        status: 'submitted',
        source: 'internal',
        items: items,
        notes: notes || 'Created via Add Order',
        shipping_cost: 0,
        submitted_at: new Date().toISOString(),
        invoice_number: invoiceNumber
    };

    try {
        const { data, error } = await supabaseClient
            .from('orders')
            .insert([payload])
            .select('id, invoice_number')
            .single();

        if (error) throw error;

        const shortId = data?.invoice_number || invoiceNumber || data?.id;

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
            source: payload.source || 'internal'
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

async function saveNewOrder(event) {
    event.preventDefault();

    const customer = (document.getElementById('new-order-customer')?.value || '').trim();
    const salesman = (document.getElementById('new-order-salesman')?.value || '').trim();
    const notes = (document.getElementById('new-order-notes')?.value || '').trim();

    if (!customer) {
        alert('Please select a customer.');
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
                return {
                    product: p.name,
                    quantity: p.quantity || 1,
                    caseSize: catalog?.caseSize || '',
                    unitPrice: catalog && !catalog.isMarketPrice ? catalog.unitPrice : null,
                    displayPrice: catalog
                        ? (catalog.isMarketPrice ? 'Market Price' : ('$' + Number(catalog.unitPrice).toFixed(2)))
                        : '',
                    isMarketPrice: !!(catalog && catalog.isMarketPrice)
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
        customer_name: customer,
        customer_email: null,
        customer_company: null,
        salesman_email: null,
        salesman_name: salesman || user.fullName || user.name || 'Admin',
        status: 'submitted',
        source: 'internal',
        items: items,
        notes: notes || 'Created via Add Order',
        shipping_cost: 0,
        submitted_at: new Date().toISOString(),
        invoice_number: invoiceNumber
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
            source: payload.source || 'internal'
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
                    <td>${item.product || ''}</td>
                    <td>${item.caseSize || '—'}</td>
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
                        <div class="meta">Order #${order.id}</div>
                        <div class="meta">Date: ${new Date(order.submittedAt).toLocaleDateString()}</div>
                    </div>
                </div>
                <hr>
                <div class="ship-to">
                    <strong>Ship To:</strong><br>
                    ${order.customer || ''}<br>
                    ${order.customerCompany || ''}<br>
                    ${order.customerEmail || ''}
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
                ${order.notes ? `<div class="notes"><strong>Notes:</strong> ${order.notes}</div>` : ''}
                <div class="footer">Thank you for your business – Donegal Natural</div>
            </div>
        `;
    });

    printContent += `</body></html>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
    }, 300);
}

// ================== CUSTOMERS ==================
// --- Customers Helpers ---
async function loadCustomers() {
    showTableLoading('customer-list', 'Loading customers…');
    try {
        const { data, error } = await supabaseClient
            .from('customers')
            .select('id, name, company, email, phone, shipping_address, billing_address, notes, status, source, submitted_by, submitted_by_email, salesman_email, territory, created_at, payment_method, payment_method_status, password_changed, onboarding_complete, pricing_approved_at, pricing_approved_by, assigned_at, last_login_at')
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
                balance: 0,
                created_at: c.created_at,
                payment_method: c.payment_method || null,
                payment_method_status: c.payment_method_status || null,
                password_changed: !!c.password_changed,
                onboarding_complete: !!c.onboarding_complete,
                pricingApprovedAt: c.pricing_approved_at || null,
                pricingApprovedBy: c.pricing_approved_by || null,
                assignedAt: c.assigned_at || null,
                lastLoginAt: c.last_login_at || null,
            }));
        }
    } catch (err) {
        console.error(err);
        allCustomers = [];
    }

    customersLoadedAt = Date.now();
    renderCustomers();
}

function salesmanHasApprovedSheet(email) {
    const e = (email || '').toLowerCase().trim();
    if (!e) return false;
    const s = (salesmen || []).find(x => (x.email || '').toLowerCase().trim() === e);
    return !!(s && String(s.priceSheetStatus || '').toLowerCase() === 'approved');
}

let customerMassFilter = 'all'; // 'all' | 'unassigned'

function setCustomerMassFilter(filter) {
    customerMassFilter = filter || 'all';
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

    if (customerMassFilter === 'unassigned') {
        filteredCustomers = filteredCustomers.filter(c => !(c.salesmanEmail || '').trim());
    }

    if ((!salesmen || salesmen.length === 0) && typeof loadSalesmen === 'function') {
        loadSalesmen().then(() => renderCustomers());
    }

    if (filteredCustomers.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-users text-6xl text-[#d4b78f] mb-4"></i>
                <p class="text-[#6B4423]">No customers found.</p>
            </div>
        `;
        return;
    }

    const salesmanOptions = (salesmen || [])
        .filter(s => s.active !== false)
        .map(s => {
            const name = s.name || [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email || '';
            const email = (s.email || '').toLowerCase().trim();
            return `<option value="${email}">${name}${s.territory ? ' — ' + s.territory : ''}</option>`;
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
                    <button type="button" onclick="setCustomerMassFilter('unassigned')"
                            class="px-3 py-1 text-xs font-semibold rounded-full border-2 ${customerMassFilter === 'unassigned' ? 'bg-[#1E4D2B] text-[#d4b78f] border-[#1E4D2B]' : 'border-[#6B4423] text-[#6B4423] hover:bg-white'}">
                        Unassigned
                    </button>
                </div>
            </div>
            <div class="flex flex-wrap items-center gap-3">
                <select id="mass-assign-salesman"
                        class="border-2 border-[#6B4423] rounded-xl px-3 py-2 text-sm min-w-[200px]">
                    <option value="">— Select salesman —</option>
                    ${salesmanOptions}
                </select>
                <button type="button" onclick="massAssignSelectedCustomers()"
                        class="px-4 py-2 text-sm font-semibold rounded-xl bg-[#1E4D2B] text-[#d4b78f] hover:bg-[#254a2f]">
                    Assign selected
                </button>
                <span id="mass-assign-count" class="text-xs text-[#6B4423]"></span>
            </div>
        </div>
        <div class="col-span-full flex flex-wrap gap-3 mb-2">
            <button type="button" onclick="setAllCustomersActive(true)"
                    class="px-4 py-2 text-sm font-semibold rounded-xl bg-green-700 text-white hover:bg-green-800">
                Enable All Customers
            </button>
            <button type="button" onclick="setAllCustomersActive(false)"
                    class="px-4 py-2 text-sm font-semibold rounded-xl bg-red-700 text-white hover:bg-red-800">
                Disable All Customers
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
                            <h3 class="text-xl font-bold brand-green">${customer.name}</h3>
                            <p class="text-sm text-[#6B4423]">${customer.company || 'Individual'}</p>
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
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p class="text-[#6B4423] text-xs">Territory</p>
                            <p class="font-semibold">${customer.territory || 'N/A'}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-[#6B4423] text-xs">Balance Owed</p>
                            <p class="font-bold ${balanceClass}">$${(customer.balance || 0).toLocaleString()}</p>
                        </div>
                    </div>
                    ${customer.salesmanEmail
                        ? `<p class="text-xs text-[#6B4423] mt-2">Salesman: ${customer.salesmanEmail}</p>`
                        : `<p class="text-xs text-orange-600 mt-2">Unassigned</p>`}
                    <p class="text-xs text-[#6B4423] mt-1">Last login: ${
                        customer.lastLoginAt
                            ? new Date(customer.lastLoginAt).toLocaleString()
                            : 'Never'
                    }</p>
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
    document.getElementById('new-customer-name')?.focus();
}

function hideAddCustomerModal() {
    const modal = document.getElementById('add-customer-modal');
    if (modal) modal.classList.add('hidden');
}

async function saveNewCustomer(event) {
    event.preventDefault();

    const name = (document.getElementById('new-customer-name')?.value || '').trim();
    const company = (document.getElementById('new-customer-company')?.value || '').trim();
    const email = (document.getElementById('new-customer-email')?.value || '').trim();
    const phone = (document.getElementById('new-customer-phone')?.value || '').trim();
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
    if (!email) {
        alert('Email is required.');
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

    try {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');

        const { data, error } = await supabaseClient
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
                submitted_by_email: user.email || null
            })
            .select()
            .single();

        if (error) {
            console.error(error);
            alert('Failed to save customer.\n' + error.message);
            return;
        }

        hideAddCustomerModal();
        if (typeof loadCustomers === 'function') await loadCustomers();
        alert('Customer added: ' + name);

    } catch (err) {
        console.error(err);
        alert('Something went wrong while saving the customer.');
    }
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
const payBadge = (customer.onboarding_complete || customer.payment_method)
    ? `<span class="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800">✓ Payment method</span>`
    : `<span class="px-2 py-0.5 text-xs font-bold rounded-full bg-orange-100 text-orange-800">Payment Pending</span>`;
onboardingSection.innerHTML = `
    <p class="text-xs text-[#6B4423] mb-1.5">Onboarding Status</p>
    <div class="flex flex-wrap gap-2">${pwBadge}${payBadge}</div>
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
    let sheetHtml = '<p class="text-sm text-[#6B4423]">No price sheet found for the assigned salesman.</p>';

    const salesmanEmail = (customer.salesmanEmail || '').toLowerCase().trim();
    if (salesmanEmail) {
        try {
            const { data: sheet } = await supabaseClient
                .from('salesman_price_sheets')
                .select('prices, updated_at, salesman_name')
                .eq('salesman_email', salesmanEmail)
                .maybeSingle();

            if (sheet && sheet.prices && Object.keys(sheet.prices).length > 0) {
                const rows = Object.keys(sheet.prices).sort().map(name => {
                    const price = Number(sheet.prices[name]);
                    return `<div class="flex justify-between text-sm py-1 border-b border-[#eee]">
                        <span class="pr-2">${name}</span>
                        <span class="font-semibold brand-green">$${price.toFixed(2)}</span>
                    </div>`;
                }).join('');
                sheetHtml = `
                    <p class="text-xs text-[#6B4423] mb-2">
                        Salesman sheet${sheet.salesman_name ? ' (' + sheet.salesman_name + ')' : ''}
                        ${sheet.updated_at ? ' · updated ' + new Date(sheet.updated_at).toLocaleDateString() : ''}
                    </p>
                    <div class="max-h-48 overflow-y-auto border border-[#d4b78f] rounded-lg p-2 bg-[#f8f4eb]">
                        ${rows}
                    </div>
                `;
            }
        } catch (err) {
            console.error('Could not load salesman price sheet:', err);
            sheetHtml = '<p class="text-sm text-red-600">Could not load price sheet.</p>';
        }
    }

    pricingSection.innerHTML = `
        <p class="text-sm font-semibold brand-green mb-1">Pricing Access</p>
        <p class="text-sm mb-3 ${isPricingApproved ? 'text-green-700' : 'text-orange-700'}">
            ${isPricingApproved
                ? `<i class="fas fa-check-circle mr-1"></i> Approved ${new Date(customer.pricingApprovedAt).toLocaleDateString()}
                   ${customer.pricingApprovedBy ? ' by ' + customer.pricingApprovedBy : ''}`
                : `<i class="fas fa-exclamation-circle mr-1"></i> Not approved — customer cannot see prices`}
        </p>
        ${sheetHtml}
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

        hideEditCustomerModal();
        await loadCustomers();
        showCustomerDetail(name);
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

async function setAllCustomersActive(enabled) {
    const action = enabled ? 'Enable' : 'Disable';
    const newStatus = enabled ? 'Active' : 'Inactive';
    const ids = (allCustomers || []).map(c => c.id).filter(Boolean);

    if (!ids.length) {
        alert('No customers loaded.');
        return;
    }

    const message = enabled
    ? `Enable ALL ${ids.length} customer(s)?\n\nThis will set every customer to Active.`
    : `Disable ALL ${ids.length} customer(s)?\n\nInactive customers can still log in, but will only see their Account info and Order History. They will not see products, quotes, or the ability to place new orders.`;

    if (!confirm(message)) {
        return;
    }

    try {
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
        alert(`All customers set to ${newStatus}.`);
    } catch (err) {
        console.error('setAllCustomersActive error:', err);
        alert('Could not update customers.\n' + (err.message || ''));
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

function viewCustomerOrders() {
    const customerName = document.getElementById('modal-customer-name').textContent;
    hideCustomerModal();
    showSection('orders');

    // Filter orders to show only this customer's orders
    setTimeout(() => {
        if (typeof filterOrdersByCustomer === 'function') {
            filterOrdersByCustomer(customerName);
        }
    }, 100);
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
                        <p class="font-bold brand-green">${p.name || 'Customer'}</p>
                        <p class="text-sm text-[#6B4423]">
                            Requested by ${r.salesman_name || r.salesman_email || 'Salesman'}
                        </p>
                        <p class="text-xs text-[#6B4423]">
                            ${r.submitted_at ? new Date(r.submitted_at).toLocaleString() : ''}
                        </p>
                    </div>
                    <span class="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-800">Pending</span>
                </div>
                <div class="text-sm space-y-1 mb-3">
                    <p><strong>Company:</strong> ${p.company || '—'}</p>
                    <p><strong>Email:</strong> ${p.email || '—'}</p>
                    <p><strong>Phone:</strong> ${p.phone || '—'}</p>
                    <p><strong>Territory:</strong> ${p.territory || '—'}</p>
                    <p><strong>Shipping:</strong> ${p.shipping_address || '—'}</p>
                    <p><strong>Billing:</strong> ${p.billing_address || '—'}</p>
                    <p><strong>Notes:</strong> ${p.notes || '—'}</p>
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

const GEOCODE_CACHE_KEY = 'dn_geocode_cache_v1';
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

    // Cache hit (success or permanent failure) → return immediately
    if (cache[key]) {
        if (cache[key].failed) return null;
        if (cache[key].lat != null && cache[key].lng != null) {
            return { lat: cache[key].lat, lng: cache[key].lng };
        }
    }

    const components = parseAddressComponents(address);
    let coords = null;

    // ---------- 1. Structured path (preferred) ----------
    if (components && components.street && (components.state || components.zip)) {
        const params = new URLSearchParams({
            format: 'json',
            limit: '1',
            countrycodes: 'us',
            addressdetails: '0'
        });
        if (components.street) params.set('street', components.street);
        if (components.city) params.set('city', components.city);
        if (components.state) params.set('state', components.state);
        if (components.zip) params.set('postalcode', components.zip);

        try {
            const res = await fetch(
                'https://nominatim.openstreetmap.org/search?' + params.toString(),
                {
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': GEOCODE_USER_AGENT
                    }
                }
            );
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    const lat = parseFloat(data[0].lat);
                    const lng = parseFloat(data[0].lon);
                    if (!isNaN(lat) && !isNaN(lng) && isPlausibleResult(lat, lng, address)) {
                        coords = { lat, lng };
                    }
                }
            }
        } catch (err) {
            console.warn('Structured Nominatim error:', err);
        }
    }

    // ---------- 2. Free-form fallback (only if structured missed) ----------
    if (!coords) {
        const cleaned = cleanAddressForGeocode(address);
        if (cleaned && cleaned.length >= 8) {
            try {
                const res = await fetch(
                    'https://nominatim.openstreetmap.org/search?' +
                    new URLSearchParams({
                        q: cleaned,
                        format: 'json',
                        limit: '1',
                        countrycodes: 'us',
                        addressdetails: '0'
                    }).toString(),
                    {
                        headers: {
                            'Accept': 'application/json',
                            'User-Agent': GEOCODE_USER_AGENT
                        }
                    }
                );
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        const lat = parseFloat(data[0].lat);
                        const lng = parseFloat(data[0].lon);
                        if (!isNaN(lat) && !isNaN(lng) && isPlausibleResult(lat, lng, address)) {
                            coords = { lat, lng };
                        }
                    }
                }
            } catch (err) {
                console.warn('Free-form Nominatim error:', err);
            }
        }
    }

    // ---------- 3. Cache only after both paths have been tried ----------
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

async function initCustomerMap() {
    const mapContainer = document.getElementById('customer-map');
    if (!mapContainer || typeof L === 'undefined') return;

    // Remove old map instance if it exists
    if (customerMap) {
        customerMap.remove();
        customerMap = null;
    }

    // Default view (eastern US) — will fitBounds once markers are ready
    customerMap = L.map('customer-map').setView([39.5, -80], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(customerMap);

    // Force correct sizing after the tab becomes visible
    setTimeout(() => {
        if (customerMap) customerMap.invalidateSize();
    }, 200);

    // Ensure customers are loaded
    if (!allCustomers || allCustomers.length === 0) {
        await loadCustomers();
    }

    const statusEl = document.getElementById('customer-map-status');
    const bounds = [];
    const cache = getGeocodeCache();

    const customersWithAddr = (allCustomers || []).filter(c => {
        const addr = c.shippingAddress || c.address || c.shipping_address || '';
        return !!String(addr).trim();
    });

    // Split into already-cached vs needs network
    const cached = [];
    const toGeocode = [];

    customersWithAddr.forEach(customer => {
        const addr = customer.shippingAddress || customer.address || customer.shipping_address || '';
        const key = normalizeAddressKey(addr);
        if (cache[key] && cache[key].lat != null && cache[key].lng != null) {
            cached.push({ customer, addr, coords: { lat: cache[key].lat, lng: cache[key].lng } });
        } else {
            toGeocode.push({ customer, addr });
        }
    });

    // 1. Place every cached pin immediately
    cached.forEach(({ customer, addr, coords }) => {
        const marker = L.marker([coords.lat, coords.lng]).addTo(customerMap);
        marker.bindPopup(
            `<b>${customer.name || 'Customer'}</b><br>` +
            `${customer.company || ''}<br>` +
            `${addr}`
        );
        bounds.push([coords.lat, coords.lng]);
    });

    if (bounds.length > 0) {
        customerMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }

    if (statusEl) {
        if (toGeocode.length === 0) {
            statusEl.textContent = bounds.length
                ? `${bounds.length} customer location${bounds.length === 1 ? '' : 's'} shown`
                : 'No geocoded addresses yet';
        } else {
            statusEl.textContent = `Showing ${bounds.length} from cache. Geocoding ${toGeocode.length} remaining…`;
        }
    }

    // 2. Only network-geocode the ones that are missing (respect 1 req/sec)
    for (let i = 0; i < toGeocode.length; i++) {
        const { customer, addr } = toGeocode[i];

        if (statusEl) {
            statusEl.textContent = `Showing ${bounds.length} from cache. Geocoding ${i + 1} of ${toGeocode.length}…`;
        }

        const coords = await geocodeAddress(addr);

        if (coords) {
            const marker = L.marker([coords.lat, coords.lng]).addTo(customerMap);
            marker.bindPopup(
                `<b>${customer.name || 'Customer'}</b><br>` +
                `${customer.company || ''}<br>` +
                `${addr}`
            );
            bounds.push([coords.lat, coords.lng]);

            // Re-fit as new pins arrive (keeps map useful while the rest load)
            if (bounds.length > 0) {
                customerMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
            }
        }

        if (i < toGeocode.length - 1) {
            await delay(1100);
        }
    }

    if (statusEl) {
        statusEl.textContent = bounds.length
            ? `${bounds.length} customer location${bounds.length === 1 ? '' : 's'} shown`
            : 'No geocoded addresses yet';
    }
}

function updateReportsSalesSummary() {
    const container = document.getElementById('sales-reports-content');
    if (!container) return;

    if (!allOrders || allOrders.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-chart-line text-5xl text-[#d4b78f] mb-4"></i>
                <p class="text-[#6B4423]">No sales data yet. Add some orders to see reports here.</p>
            </div>
        `;
        return;
    }

    let ytdSales = 0;
    let mtdSales = 0;
    let wtdSales = 0;
    let totalOrders = allOrders.length;

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    allOrders.forEach(order => {
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

        if (orderDate >= startOfYear) ytdSales += orderTotal;
        if (orderDate >= startOfMonth) mtdSales += orderTotal;
        if (orderDate >= startOfWeek) wtdSales += orderTotal;
    });

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="bg-[#f8f4eb] rounded-xl p-5 text-center">
                <p class="text-sm text-[#6B4423]">Year to Date</p>
                <p class="text-3xl font-bold brand-green mt-1">$${ytdSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div class="bg-[#f8f4eb] rounded-xl p-5 text-center">
                <p class="text-sm text-[#6B4423]">Month to Date</p>
                <p class="text-3xl font-bold brand-green mt-1">$${mtdSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div class="bg-[#f8f4eb] rounded-xl p-5 text-center">
                <p class="text-sm text-[#6B4423]">Week to Date</p>
                <p class="text-3xl font-bold brand-green mt-1">$${wtdSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div class="bg-[#f8f4eb] rounded-xl p-5 text-center">
                <p class="text-sm text-[#6B4423]">Total Orders</p>
                <p class="text-3xl font-bold brand-green mt-1">${totalOrders}</p>
            </div>
        </div>
    `;
}

function showSalesmanDetail(salesmanId = null) {
    const modal = document.getElementById('salesman-modal');
    if (!modal) {
        console.error('ERROR: salesman-modal not found in HTML');
        return;
    }

    // Prefer the salesman that was clicked; fall back to first if needed
    let salesman = null;
    if (salesmanId != null) {
        salesman = salesmen.find(s => String(s.id) === String(salesmanId));
    }
    if (!salesman && salesmen.length > 0) {
        salesman = salesmen[0];
    }
    if (!salesman) {
        console.error('No salesman data available');
        return;
    }

    // Remember which salesman is open so save can target the right row
    modal.dataset.salesmanId = salesman.id || '';

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };
    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value;
    };

    const displayName = salesman.name
        || [salesman.firstName, salesman.lastName].filter(Boolean).join(' ')
        || 'Salesman';

    setText('modal-salesman-name', displayName);
    setText('modal-territory', salesman.territory || 'N/A');
    setText('modal-commission', (salesman.commission != null ? salesman.commission : 8) + '%');
    setText('modal-market-commission', (salesman.marketCommission != null ? salesman.marketCommission : 3) + '%');

    const totals = typeof getSalesmanOrderTotals === 'function'
        ? getSalesmanOrderTotals(salesman)
        : { yearly: 0, monthly: 0 };
    setText('modal-yearly-sales', '$' + Math.round(totals.yearly).toLocaleString());
    setText('modal-monthly-sales', '$' + Math.round(totals.monthly).toLocaleString());
    setText('modal-quotes', salesman.quotesSubmitted || 0);
        // Initial pricing sheet status + actions
    const sheetStatusEl = document.getElementById('modal-price-sheet-status');
    const sheetCustomersEl = document.getElementById('modal-price-sheet-customers');
    const viewSheetBtn = document.getElementById('modal-view-price-sheet-btn');
    const resetSheetBtn = document.getElementById('modal-reset-price-sheet-btn');

    const statusRaw = (salesman.priceSheetStatus || '').toLowerCase();
    let statusLabel = 'Not submitted';
    if (statusRaw === 'approved') statusLabel = 'Approved';
    else if (statusRaw === 'pending' || statusRaw === 'submitted') statusLabel = 'Pending review';
    else if (statusRaw === 'required') statusLabel = 'Required (not yet approved)';
    if (sheetStatusEl) sheetStatusEl.textContent = statusLabel;

    if (viewSheetBtn) viewSheetBtn.classList.add('hidden');
    if (resetSheetBtn) resetSheetBtn.classList.add('hidden');
    if (sheetCustomersEl) sheetCustomersEl.textContent = '';

    if (statusRaw === 'approved') {
        if (viewSheetBtn) viewSheetBtn.classList.remove('hidden');
        if (resetSheetBtn) resetSheetBtn.classList.remove('hidden');
        // Count customers unlocked under this salesman
        const email = (salesman.email || '').toLowerCase().trim();
        if (email && sheetCustomersEl) {
            (async () => {
                try {
                    const { count, error } = await supabaseClient
                        .from('customers')
                        .select('id', { count: 'exact', head: true })
                        .eq('salesman_email', email)
                        .not('pricing_approved_at', 'is', null);
                    if (!error && sheetCustomersEl) {
                        sheetCustomersEl.textContent = (count || 0) + ' customer(s) currently have pricing unlocked under this salesman.';
                    }
                } catch (e) {
                    console.warn('price sheet customer count:', e);
                }
            })();
        }
    }
    setValue('modal-notes', salesman.notes || '');

    modal.style.display = 'flex';
    modal.classList.remove('hidden');
}

/**
 * Shared categorized price-sheet table for the #salesman-price-sheet-modal.
 * Mirrors exportPriceSheetPdf grouping:
 *   - PRODUCT_CATALOG category order (first-seen)
 *   - alphabetical within category
 *   - unmatched products under "Other"
 * Columns: Product | Case Size | Unit Price
 * @param {Object} prices  { productName: number }
 * @param {HTMLElement} listEl
 * @returns {number} number of products rendered
 */
function renderCategorizedPriceSheetTable(prices, listEl) {
    if (!listEl) return 0;
    if (!prices || typeof prices !== 'object') {
        listEl.innerHTML = '<p class="text-sm text-[#6B4423]">No price sheet data.</p>';
        return 0;
    }

    const catalogByName = {};
    if (typeof PRODUCT_CATALOG !== 'undefined') {
        PRODUCT_CATALOG.forEach(p => {
            catalogByName[p.name] = p;
        });
    }

    const grouped = {};
    const unmatched = [];

    Object.keys(prices).forEach(name => {
        const price = Number(prices[name]);
        if (!name || isNaN(price)) return;
        const p = catalogByName[name];
        if (p) {
            const cat = p.category || 'Other';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push({
                name,
                caseSize: p.caseSize || '',
                price,
                priceAsOf: p.priceAsOf || '—'
            });
        } else {
            unmatched.push({
                name,
                caseSize: '',
                price,
                priceAsOf: '—'
            });
        }
    });

    // Alphabetical within each category
    Object.keys(grouped).forEach(cat => {
        grouped[cat].sort((a, b) => a.name.localeCompare(b.name));
    });
    unmatched.sort((a, b) => a.name.localeCompare(b.name));

    // Same category order style as Company Base (alphabetical)
    const categories = Object.keys(grouped).sort();
    if (unmatched.length) categories.push('Other');

    let total = 0;
    categories.forEach(cat => {
        if (cat === 'Other') total += unmatched.length;
        else total += (grouped[cat] || []).length;
    });

    if (total === 0) {
        listEl.innerHTML = '<p class="text-sm text-[#6B4423]">Price sheet is empty.</p>';
        return 0;
    }

    let html = '';

    categories.forEach(cat => {
        const rows = cat === 'Other' ? unmatched : grouped[cat];
        if (!rows || rows.length === 0) return;

        html += `
            <div>
                <h3 class="text-base font-bold brand-green mb-2 border-b border-[#d4b78f] pb-1">${cat}</h3>
                <div class="overflow-x-auto border border-[#d4b78f] rounded-xl mb-4">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="bg-[#1E4D2B] text-[#d4b78f]">
                                <th class="p-2.5 text-left">Product</th>
                                <th class="p-2.5 text-left w-28">Case Size</th>
                                <th class="p-2.5 text-right w-28">Unit Price</th>
                                <th class="p-2.5 text-center w-28">As Of</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        rows.forEach((row, i) => {
            const bg = i % 2 ? 'bg-[#f8f4eb]' : 'bg-white';
            html += `
                <tr class="border-t border-[#e8d9b8] ${bg}">
                    <td class="p-2.5">${row.name}</td>
                    <td class="p-2.5 text-[#6B4423]">${row.caseSize || '—'}</td>
                    <td class="p-2.5 text-right font-semibold">$${row.price.toFixed(2)}</td>
                    <td class="p-2.5 text-center text-xs text-[#6B4423]">${row.priceAsOf || '—'}</td>
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
    return total;
}


async function openSalesmanPriceSheetModal() {
    const detailModal = document.getElementById('salesman-modal');
    const salesmanId = detailModal?.dataset?.salesmanId;
    const salesman = salesmanId
        ? salesmen.find(s => String(s.id) === String(salesmanId))
        : null;

    if (!salesman || !(salesman.email || '').trim()) {
        alert('No salesman email on file — cannot load price sheet.');
        return;
    }

    const email = salesman.email.toLowerCase().trim();
    const titleEl = document.getElementById('price-sheet-modal-title');
    const subEl = document.getElementById('price-sheet-modal-subtitle');
    const listEl = document.getElementById('price-sheet-modal-list');
    const modal = document.getElementById('salesman-price-sheet-modal');

    if (titleEl) titleEl.textContent = 'Initial Pricing Sheet';
    if (subEl) subEl.textContent = (salesman.name || email) + ' · ' + email;
    if (listEl) listEl.innerHTML = '<p class="text-sm text-[#6B4423]"><i class="fas fa-spinner fa-spin mr-2"></i>Loading…</p>';
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }

    try {
        const { data, error } = await supabaseClient
            .from('salesman_price_sheets')
            .select('id, prices, updated_at, salesman_name')
            .eq('salesman_email', email)
            .maybeSingle();

        if (error) throw error;

        if (!data || !data.prices || typeof data.prices !== 'object') {
            if (listEl) listEl.innerHTML = '<p class="text-sm text-[#6B4423]">No price sheet found for this salesman.</p>';
            return;
        }

         const count = renderCategorizedPriceSheetTable(data.prices, listEl);

        if (subEl) {
            const updated = data.updated_at ? new Date(data.updated_at).toLocaleString() : '';
            subEl.textContent = (salesman.name || email) + ' · ' + count + ' products'
                + (updated ? ' · Updated ' + updated : '');
        }
    } catch (err) {
        console.error('openSalesmanPriceSheetModal error:', err);
        if (listEl) listEl.innerHTML = `<p class="text-sm text-red-600">Could not load price sheet.<br>${err.message || ''}</p>`;
    }
}

function hideSalesmanPriceSheetModal() {
    const modal = document.getElementById('salesman-price-sheet-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.style.display = 'none';
}

// ========== Reports: Salesman → Customers price-sheet drill-down ==========
async function populateReportsSalesmanSelect() {
    const select = document.getElementById('reports-salesman-select');
    if (!select) return;

    if (!Array.isArray(salesmen) || salesmen.length === 0) {
        if (typeof loadSalesmen === 'function') await loadSalesmen();
    }

    const active = (salesmen || []).filter(s => s.active !== false && (s.email || '').trim());
    const current = select.value;
    select.innerHTML = '<option value="">— Choose a salesman —</option>' +
        active.map(s => {
            const name = s.name || [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email;
            const email = (s.email || '').toLowerCase().trim();
            return `<option value="${email}">${name}${s.territory ? ' — ' + s.territory : ''}</option>`;
        }).join('');

    // Restore previous selection if still valid
    if (current && Array.from(select.options).some(o => o.value === current)) {
        select.value = current;
    }
}

async function onReportsSalesmanChange() {
    const select = document.getElementById('reports-salesman-select');
    const container = document.getElementById('reports-salesman-customers');
    if (!container) return;

    const email = (select?.value || '').toLowerCase().trim();
    if (!email) {
        container.innerHTML = '';
        return;
    }

    // Ensure customers are loaded
    if ((!allCustomers || allCustomers.length === 0) && typeof loadCustomers === 'function') {
        await loadCustomers();
    }

    const filtered = (allCustomers || []).filter(c =>
        (c.salesmanEmail || '').toLowerCase().trim() === email
    );

    if (filtered.length === 0) {
        container.innerHTML = '<p class="text-sm text-[#6B4423]">No customers currently assigned to this salesman.</p>';
        return;
    }

    container.innerHTML = filtered.map(c => {
        const name = (c.name || '—').replace(/"/g, '&quot;');
        const company = (c.company || c.email || '').replace(/"/g, '&quot;');
        const id = c.id || '';
        return `
            <div class="flex items-center justify-between gap-3 p-3 border border-[#d4b78f] rounded-xl bg-[#f8f4eb]">
                <div class="min-w-0">
                    <p class="font-semibold brand-green truncate">${name}</p>
                    <p class="text-xs text-[#6B4423] truncate">${company}</p>
                </div>
                <button type="button"
                        onclick="openReportsCustomerPriceSheet('${id}')"
                        class="px-3 py-1.5 text-xs bg-[#1E4D2B] text-[#d4b78f] font-semibold rounded-lg hover:bg-[#254a2f] flex-shrink-0">
                    <i class="fas fa-file-invoice-dollar mr-1"></i> View Price Sheet
                </button>
            </div>
        `;
    }).join('');
}

async function openReportsCustomerPriceSheet(customerId) {
    if (!customerId) {
        alert('Missing customer id.');
        return;
    }

    const customer = (allCustomers || []).find(c => String(c.id) === String(customerId));
    if (!customer) {
        alert('Customer not found in current list.');
        return;
    }

    const salesmanEmail = (customer.salesmanEmail || '').toLowerCase().trim();
    const titleEl = document.getElementById('price-sheet-modal-title');
    const subEl = document.getElementById('price-sheet-modal-subtitle');
    const listEl = document.getElementById('price-sheet-modal-list');
    const modal = document.getElementById('salesman-price-sheet-modal');

    if (titleEl) titleEl.textContent = 'Customer Price Sheet';
    if (subEl) subEl.textContent = (customer.name || customer.email || customerId) + (customer.company ? ' · ' + customer.company : '');
    if (listEl) listEl.innerHTML = '<p class="text-sm text-[#6B4423]"><i class="fas fa-spinner fa-spin mr-2"></i>Loading…</p>';
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }

    try {
        let prices = null;
        let sourceLabel = '';
        let updatedAt = null;

        // 1. Prefer customer_price_sheets
        const { data: custSheet, error: custErr } = await supabaseClient
            .from('customer_price_sheets')
            .select('prices, updated_at')
            .eq('customer_id', customerId)
            .maybeSingle();
        if (custErr) throw custErr;

        if (custSheet && custSheet.prices && typeof custSheet.prices === 'object' && Object.keys(custSheet.prices).length > 0) {
            prices = custSheet.prices;
            sourceLabel = 'Customer-specific sheet';
            updatedAt = custSheet.updated_at;
        } else if (salesmanEmail) {
            // 2. Fallback to salesman_price_sheets
            const { data: salesSheet, error: salesErr } = await supabaseClient
                .from('salesman_price_sheets')
                .select('prices, updated_at, salesman_name')
                .eq('salesman_email', salesmanEmail)
                .maybeSingle();
            if (salesErr) throw salesErr;

            if (salesSheet && salesSheet.prices && typeof salesSheet.prices === 'object' && Object.keys(salesSheet.prices).length > 0) {
                prices = salesSheet.prices;
                sourceLabel = 'Salesman base sheet' + (salesSheet.salesman_name ? ' (' + salesSheet.salesman_name + ')' : '');
                updatedAt = salesSheet.updated_at;
            }
        }

        if (!prices) {
            if (listEl) listEl.innerHTML = '<p class="text-sm text-[#6B4423]">No price sheet found for this customer (and no salesman base sheet available).</p>';
            return;
        }

        const count = renderCategorizedPriceSheetTable(prices, listEl);

        if (subEl) {
            const updated = updatedAt ? new Date(updatedAt).toLocaleString() : '';
            subEl.textContent = (customer.name || customer.email || customerId)
                + ' · ' + sourceLabel
                + ' · ' + count + ' products'
                + (updated ? ' · Updated ' + updated : '');
        }
    } catch (err) {
        console.error('openReportsCustomerPriceSheet error:', err);
        if (listEl) listEl.innerHTML = `<p class="text-sm text-red-600">Could not load price sheet.<br>${err.message || ''}</p>`;
    }
}

async function resetSalesmanPriceSheet() {
    const detailModal = document.getElementById('salesman-modal');
    const salesmanId = detailModal?.dataset?.salesmanId;
    const salesman = salesmanId
        ? salesmen.find(s => String(s.id) === String(salesmanId))
        : null;

    if (!salesman || !(salesman.email || '').trim()) {
        alert('No salesman email on file — cannot reset price sheet.');
        return;
    }

    const email = salesman.email.toLowerCase().trim();
    const name = salesman.name || email;

    const ok = confirm(
        'RESET initial pricing sheet for ' + name + '?\n\n' +
        'This will:\n' +
        '• Delete their approved price sheet\n' +
        '• Set their price sheet status back to Required\n' +
        '• Clear pricing approval on all customers assigned to them (they will not see prices until the salesman re-approves)\n\n' +
        'The salesman must submit a new initial sheet and you must approve it again.'
    );
    if (!ok) return;

    const ok2 = confirm('Are you sure? This cannot be undone.');
    if (!ok2) return;

    try {
        // 1. Delete price sheet row(s)
        const { error: delErr } = await supabaseClient
            .from('salesman_price_sheets')
            .delete()
            .eq('salesman_email', email);
        if (delErr) throw delErr;

        // 2. Set salesman status back to required
        const { error: statusErr } = await supabaseClient
            .from('salesmen')
            .update({ price_sheet_status: 'required' })
            .eq('id', salesmanId);
        if (statusErr) throw statusErr;

        // 3. Re-lock customers assigned to this salesman
        const { error: custErr } = await supabaseClient
            .from('customers')
            .update({ pricing_approved_at: null })
            .eq('salesman_email', email);
        if (custErr) throw custErr;

        // Update local cache
        salesman.priceSheetStatus = 'required';

        alert('Price sheet reset for ' + name + '.\nCustomers under this salesman are locked again until pricing is re-approved.');

        hideSalesmanPriceSheetModal();
        if (typeof showSalesmanDetail === 'function') {
            showSalesmanDetail(salesmanId);
        }
        if (typeof renderSalesmen === 'function') {
            renderSalesmen();
        }
    } catch (err) {
        console.error('resetSalesmanPriceSheet error:', err);
        alert('Could not reset price sheet.\n' + (err.message || ''));
    }
}

async function hideSalesmanModal() {
    const modal = document.getElementById('salesman-modal');
    if (!modal) return;

    // Optional: still allow quick notes save from the detail modal
    const salesmanId = modal.dataset.salesmanId;
    const notesEl = document.getElementById('modal-notes');
    const notes = notesEl ? notesEl.value.trim() : '';

    if (salesmanId && notesEl) {
        const salesman = salesmen.find(s => String(s.id) === String(salesmanId));
        if (salesman) salesman.notes = notes;

        try {
            const { error } = await supabaseClient
                .from('salesmen')
                .update({ notes: notes || null })
                .eq('id', salesmanId);
            if (error) throw error;
        } catch (err) {
            console.error(err);
            // Non-blocking — still close the modal
        }
    }

    modal.style.display = 'none';
    modal.classList.add('hidden');
}

function hideEditSalesmanModal() {
    const modal = document.getElementById('edit-salesman-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.style.display = 'none';
}

function showEditSalesmanModal() {
    const detailModal = document.getElementById('salesman-modal');
    const salesmanId = detailModal?.dataset?.salesmanId;
    if (!salesmanId) {
        alert('No salesman selected.');
        return;
    }

    const salesman = salesmen.find(s => String(s.id) === String(salesmanId));
    if (!salesman) {
        alert('Could not load salesman for editing.');
        return;
    }

    // Hide detail modal
    if (detailModal) {
        detailModal.classList.add('hidden');
        detailModal.style.display = 'none';
    }

    const modal = document.getElementById('edit-salesman-modal');
    if (!modal) return;

    modal.dataset.salesmanId = salesman.id || '';

    document.getElementById('edit-salesman-first-name').value = salesman.firstName || '';
    document.getElementById('edit-salesman-last-name').value = salesman.lastName || '';
    document.getElementById('edit-salesman-email').value = salesman.email || '';
    document.getElementById('edit-salesman-territory').value = salesman.territory || '';
    document.getElementById('edit-salesman-active').checked = salesman.active !== false;
    document.getElementById('edit-salesman-commission').value =
        salesman.commission != null ? salesman.commission : 8;
    document.getElementById('edit-salesman-market-commission').value =
        salesman.marketCommission != null ? salesman.marketCommission : 3;
    document.getElementById('edit-salesman-notes').value = salesman.notes || '';

    // Parse existing mailing address into structured fields
    const parts = (typeof parseAddressBlock === 'function')
        ? parseAddressBlock(salesman.mailingAddress || '')
        : { street: '', apt: '', city: '', state: '', zip: '' };

    document.getElementById('edit-salesman-mail-street').value = parts.street || '';
    document.getElementById('edit-salesman-mail-apt').value = parts.apt || '';
    document.getElementById('edit-salesman-mail-city').value = parts.city || '';
    document.getElementById('edit-salesman-mail-state').value = parts.state || '';
    document.getElementById('edit-salesman-mail-zip').value = parts.zip || '';
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

async function toggleSalesmanActive(salesmanId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') {
            event.stopImmediatePropagation();
        }
    }

    const salesman = (salesmen || []).find(s => String(s.id) === String(salesmanId));
    if (!salesman) {
        alert('Salesman not found.');
        return;
    }

    const currentlyActive = salesman.active !== false;
    const newActive = !currentlyActive;
    const name = salesman.name
        || [salesman.firstName, salesman.lastName].filter(Boolean).join(' ')
        || 'this salesman';

    const action = newActive ? 'enable' : 'disable';
    if (!confirm(`${action === 'enable' ? 'Enable' : 'Disable'} ${name}?`)) {
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('salesmen')
            .update({ active: newActive })
            .eq('id', salesmanId);

        if (error) throw error;

        salesman.active = newActive;
        if (typeof renderSalesmen === 'function') await renderSalesmen();
        if (typeof updateDashboardSalesmen === 'function') updateDashboardSalesmen();
    } catch (err) {
        console.error('toggleSalesmanActive error:', err);
        alert('Could not update salesman status.\n' + (err.message || ''));
    }
}

async function saveEditedSalesman(event) {
    event.preventDefault();

    const modal = document.getElementById('edit-salesman-modal');
    const salesmanId = modal?.dataset?.salesmanId;
    if (!salesmanId) {
        alert('Could not find salesman id. Please close and open again.');
        return;
    }

    const firstName = (document.getElementById('edit-salesman-first-name')?.value || '').trim();
    const lastName = (document.getElementById('edit-salesman-last-name')?.value || '').trim();
    const email = (document.getElementById('edit-salesman-email')?.value || '').trim().toLowerCase();
    const territory = (document.getElementById('edit-salesman-territory')?.value || '').trim();
    const active = document.getElementById('edit-salesman-active')?.checked !== false;
    const commission = parseFloat(document.getElementById('edit-salesman-commission')?.value);
    const marketCommission = parseFloat(document.getElementById('edit-salesman-market-commission')?.value);
    const notes = (document.getElementById('edit-salesman-notes')?.value || '').trim();

    const mailStreet = (document.getElementById('edit-salesman-mail-street')?.value || '').trim();
    const mailApt = (document.getElementById('edit-salesman-mail-apt')?.value || '').trim();
    const mailCity = (document.getElementById('edit-salesman-mail-city')?.value || '').trim();
    const mailState = (document.getElementById('edit-salesman-mail-state')?.value || '').trim();
    const mailZip = (document.getElementById('edit-salesman-mail-zip')?.value || '').trim();
    const mailingAddress = (typeof buildAddressFromParts === 'function')
        ? buildAddressFromParts(mailStreet, mailApt, mailCity, mailState, mailZip)
        : [mailStreet, mailApt, [mailCity, mailState, mailZip].filter(Boolean).join(', ')].filter(Boolean).join('\n');

    if (!firstName || !lastName || !territory) {
        alert('First Name, Last Name, and Territory are required.');
        return;
    }
    if (isNaN(commission) || commission < 0) {
        alert('Please enter a valid Standard Commission %.');
        return;
    }
    if (isNaN(marketCommission) || marketCommission < 0) {
        alert('Please enter a valid Market Price Commission %.');
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('salesmen')
            .update({
                first_name: firstName,
                last_name: lastName,
                email: email || null,
                territory: territory,
                active: active,
                commission: commission,
                market_commission: marketCommission,
                notes: notes || null,
                mailing_address: mailingAddress || null
            })
            .eq('id', salesmanId);

        if (error) throw error;

        hideEditSalesmanModal();

        if (typeof renderSalesmen === 'function') await renderSalesmen();
        if (typeof updateDashboardSalesmen === 'function') updateDashboardSalesmen();

        // Re-open detail so the user sees the updated values
        if (typeof showSalesmanDetail === 'function') {
            showSalesmanDetail(salesmanId);
        }

        alert('Salesman updated.');
    } catch (err) {
        console.error(err);
        alert('Could not update salesman.\n' + (err.message || ''));
    }
}


function showAddSalesmanModal() {
    const modal = document.getElementById('add-salesman-modal');
    if (!modal) {
        alert('Add Salesman modal not found.');
        return;
    }

    const nameEl = document.getElementById('new-salesman-name');
    const territoryEl = document.getElementById('new-salesman-territory');
    const commissionEl = document.getElementById('new-salesman-commission');
    const activeEl = document.getElementById('new-salesman-active');

    if (nameEl) nameEl.value = '';
    if (territoryEl) territoryEl.value = '';
    if (commissionEl) commissionEl.value = '8';
    if (activeEl) activeEl.checked = true;

    modal.classList.remove('hidden');
    if (nameEl) nameEl.focus();
}

function hideAddSalesmanModal() {
    const modal = document.getElementById('add-salesman-modal');
    if (modal) modal.classList.add('hidden');
}

async function addNewSalesman(e) {
    e.preventDefault();

    const firstName = document.getElementById('new-first-name').value.trim();
    const lastName = document.getElementById('new-last-name').value.trim();
    const territory = document.getElementById('new-territory').value.trim();
    const commission = parseFloat(document.getElementById('new-commission').value) || 8;
    const marketCommission = parseFloat(document.getElementById('new-market-commission').value) || 3;
    const email = (document.getElementById('new-salesman-email')?.value || "").trim().toLowerCase();

    const mailStreet = (document.getElementById('new-salesman-mail-street')?.value || '').trim();
    const mailApt = (document.getElementById('new-salesman-mail-apt')?.value || '').trim();
    const mailCity = (document.getElementById('new-salesman-mail-city')?.value || '').trim();
    const mailState = (document.getElementById('new-salesman-mail-state')?.value || '').trim();
    const mailZip = (document.getElementById('new-salesman-mail-zip')?.value || '').trim();
    const mailingAddress = (typeof buildAddressFromParts === 'function')
        ? buildAddressFromParts(mailStreet, mailApt, mailCity, mailState, mailZip)
        : [mailStreet, mailApt, [mailCity, mailState, mailZip].filter(Boolean).join(', ')].filter(Boolean).join('\n');

        if (!firstName || !lastName || !territory) {
        alert("Please fill in First Name, Last Name, and Territory.");
        return;
    }
    if (!email || !email.includes('@')) {
        alert("A valid email is required so the salesman can log in and receive credentials.");
        return;
    }

    const fullName = firstName + ' ' + lastName;

    try {
        // 1. Create Auth user + profile + send credentials email
        // Password is generated server-side only
        const fnUrl = SUPABASE_URL + '/functions/v1/create-salesman-user';
        const fnRes = await fetch(fnUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
                email: email,
                full_name: fullName,
                territory: territory
            })
        });

        const fnText = await fnRes.text();
        let fnData = null;
        try {
            fnData = JSON.parse(fnText);
        } catch (e) {
            fnData = { error: fnText || 'Empty response' };
        }

        if (!fnRes.ok || (fnData && fnData.error)) {
            throw new Error(
                (fnData && fnData.error) ? fnData.error : ('Function HTTP ' + fnRes.status)
            );
        }

        // 2. Insert salesman row
        const { data, error } = await supabaseClient
            .from('salesmen')
            .insert({
                first_name: firstName,
                last_name: lastName,
                email: email || null,
                territory: territory,
                commission: commission,
                market_commission: marketCommission,
                price_sheet_status: 'required',
                yearly_sales: 0,
                monthly_sales: 0,
                active: true,
                mailing_address: mailingAddress || null
            })
            .select()
            .single();

        if (error) {
            console.error(error);
            alert("Failed to add salesman.\n" + error.message);
            return;
        }

        const emailOk = fnData && fnData.email_sent === true;
        const emailFailReason = (fnData && fnData.email_error) ? String(fnData.email_error) : '';
        const returnedTemp = (fnData && fnData.temp_password) ? String(fnData.temp_password) : '';

        alert(
            'Salesman ' + firstName + ' ' + lastName + ' has been added.\n' +
            'Login account created.\n\n' +
            (emailOk
                ? 'Credentials email was sent to the salesman.\nThey must change the password on first login.'
                : ('Credentials email was NOT sent.\n' +
                   (emailFailReason ? ('Reason: ' + emailFailReason + '\n') : '') +
                   (returnedTemp
                       ? ('Temporary password (give to salesman):\n' + returnedTemp)
                       : 'Please check the Edge Function logs.')))
        );
        hideAddSalesmanModal();
        document.getElementById('add-salesman-form').reset();

        // Refresh the Salesmen section and dashboard card
        if (typeof renderSalesmen === 'function') renderSalesmen();
        if (typeof updateDashboardSalesmen === 'function') updateDashboardSalesmen();

    } catch (err) {
        console.error(err);
        alert("Something went wrong while adding the salesman.\n\n" + (err.message || String(err)));
    }
}

function saveNewSalesman(event) {
    event.preventDefault();

    const name = (document.getElementById('new-salesman-name')?.value || '').trim();
    const territory = (document.getElementById('new-salesman-territory')?.value || '').trim();
    const commission = parseFloat(document.getElementById('new-salesman-commission')?.value);
    const active = document.getElementById('new-salesman-active')?.checked !== false;

    if (!name) {
        alert('Name is required.');
        return;
    }
    if (!territory) {
        alert('Territory is required.');
        return;
    }
    if (isNaN(commission) || commission < 0) {
        alert('Please enter a valid commission %.');
        return;
    }

    if (typeof salesmen === 'undefined' || !Array.isArray(salesmen)) {
        salesmen = JSON.parse(localStorage.getItem('salesmen') || '[]');
    }

    const newSalesman = {
        id: Date.now(),
        name: name,
        territory: territory,
        commission: commission,
        yearlySales: 0,
        monthlySales: 0,
        active: active,
        createdAt: new Date().toISOString()
    };

    salesmen.unshift(newSalesman);
    saveSalesmen();
    hideAddSalesmanModal();

    if (typeof renderSalesmen === 'function') renderSalesmen();
    if (typeof updateDashboardSalesmen === 'function') updateDashboardSalesmen();

    alert('Salesman added: ' + newSalesman.name);
}

// ================== PRICE CHANGE PROPOSALS (FROM SALESMEN) ==================

async function getPendingPriceProposals() {
    try {
        const { data, error } = await supabaseClient
            .from('price_proposals')
            .select('*')
            .eq('status', 'Pending')
            .order('submitted_at', { ascending: false });

        if (error) {
            console.error("Error loading proposals:", error);
            return [];
        }

        // Convert to the shape the rest of the UI expects
        return (data || []).map(p => ({
            id: p.id,
            type: p.type,
            salesmanEmail: p.salesman_email,
            salesmanName: p.salesman_name,
            status: p.status,
            items: p.items || [],
            overallNotes: p.overall_notes,
            submittedAt: p.submitted_at
        }));
    } catch (err) {
        console.error(err);
        return [];
    }
}

async function updatePriceProposalsBadge() {
    const badge = document.getElementById("price-proposals-badge");
    if (!badge) return;

    const pending = await getPendingPriceProposals();
    if (pending.length > 0) {
        badge.textContent = pending.length;
        badge.classList.remove("hidden");
    } else {
        badge.classList.add("hidden");
    }
}

async function showPriceProposalsPanel() {
    const modal = document.getElementById("price-proposals-modal");
    const list = document.getElementById("price-proposals-list");
    if (!modal || !list) {
        alert("Price proposals modal not found in HTML.");
        return;
    }

    list.innerHTML = `<p class="text-[#6B4423] text-center py-8">Loading...</p>`;
    modal.classList.remove("hidden");

    const pending = await getPendingPriceProposals();

    if (pending.length === 0) {
        list.innerHTML = `
            <p class="text-[#6B4423] text-center py-8">No pending price proposals.</p>
        `;
        return;
    }

    // Compact list – each row is clickable
    list.innerHTML = pending.map(p => {
        const date = new Date(p.submittedAt).toLocaleDateString();
        const itemCount = (p.items || []).length;
        const typeLabel = p.type === 'initialPriceSheet'
            ? 'Initial Pricing Sheet'
            : (p.type === 'customerPricing' ? 'Customer Pricing'
                : (p.type === 'newProduct' ? 'New Product' : 'Price Change'));

        return `
            <div class="border-2 border-[#6B4423] rounded-2xl p-4 mb-3 cursor-pointer hover:bg-[#f8f4eb] transition"
                 onclick="showProposalDetail('${p.id}')">
                <div class="flex justify-between items-center">
                    <div>
                        <p class="font-bold brand-green">${p.salesmanName || "Salesman"}</p>
                        <p class="text-sm text-[#6B4423]">${typeLabel} · ${date} · ${itemCount} product(s)</p>
                    </div>
                    <span class="px-3 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">
                        Pending
                    </span>
                </div>
            </div>
        `;
    }).join("");
}

async function showProposalDetail(id) {
    const list = document.getElementById("price-proposals-list");
    if (!list) return;

    list.innerHTML = `<p class="text-[#6B4423] text-center py-8">Loading proposal...</p>`;

    try {
        const { data, error } = await supabaseClient
            .from('price_proposals')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            list.innerHTML = `<p class="text-red-600 text-center py-8">Could not load proposal.</p>`;
            return;
        }

        const p = {
            id: data.id,
            type: data.type,
            salesmanEmail: data.salesman_email,
            salesmanName: data.salesman_name,
            status: data.status,
            items: data.items || [],
            overallNotes: data.overall_notes,
            submittedAt: data.submitted_at
        };

        // Cache for toggle filter
        window._currentProposalDetail = p;

        const date = new Date(p.submittedAt).toLocaleDateString();
        const typeLabel = p.type === 'initialPriceSheet'
            ? 'Initial Pricing Sheet'
            : (p.type === 'customerPricing' ? 'Customer Pricing'
                : (p.type === 'newProduct' ? 'New Product' : 'Price Change'));

        list.innerHTML = renderProposalDetailHtml(p, date, typeLabel, false);
    } catch (err) {
        console.error(err);
        list.innerHTML = `<p class="text-red-600 text-center py-8">Error loading proposal.</p>`;
    }
}

function renderProposalDetailHtml(p, date, typeLabel, changesOnly) {
    const items = p.items || [];
    const isCustomerPricing = p.type === 'customerPricing';
    let changedCount = 0;
    let over5Count = 0;

    const itemRows = items.map(item => {
        const proposed = Number(item.proposedPrice);

        // Customer Pricing → compare to salesman basePrice
        // Other types → compare to catalogPrice
        const refPrice = isCustomerPricing
            ? (item.basePrice != null ? Number(item.basePrice) : null)
            : (item.catalogPrice != null ? Number(item.catalogPrice) : null);
        const hasRef = refPrice != null && !isNaN(refPrice);
        const isChanged = hasRef && !isNaN(proposed) && Math.abs(proposed - refPrice) > 0.0001;
        const below = isCustomerPricing
            ? (hasRef && !isNaN(proposed) && proposed < refPrice)
            : (item.belowCatalog || (hasRef && !isNaN(proposed) && proposed < refPrice));
        const over5 = item.outside5 === true ||
            (hasRef && refPrice > 0 && !isNaN(proposed) &&
                Math.abs(proposed - refPrice) / refPrice > 0.05);

        if (isChanged) changedCount++;
        if (over5) over5Count++;

        if (changesOnly && !isChanged) return "";

        let pctBadge = "";
        if (hasRef && refPrice > 0 && !isNaN(proposed) && isChanged) {
            const pct = ((proposed - refPrice) / refPrice) * 100;
            const sign = pct >= 0 ? "+" : "";
            if (over5) {
                pctBadge = `<span class="ml-1 px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-700">${sign}${pct.toFixed(1)}%</span>`;
            } else if (below) {
                pctBadge = `<span class="ml-1 px-2 py-0.5 text-xs font-bold rounded-full bg-orange-100 text-orange-700">${sign}${pct.toFixed(1)}%</span>`;
            } else {
                pctBadge = `<span class="ml-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">${sign}${pct.toFixed(1)}%</span>`;
            }
        }

        const rowClass = over5
            ? "border-2 border-red-400 bg-red-50"
            : (below
                ? "border-2 border-orange-300 bg-orange-50"
                : (isChanged
                    ? "border-2 border-[#1E4D2B] bg-[#f0f7f0]"
                    : "border border-[#d4b78f] bg-[#f8f4eb]"));

        const refLabel = isCustomerPricing ? "Base" : "Catalog";
        const changeLabel = isChanged
            ? (over5
                ? ` <span class="text-red-700 text-xs font-bold">(±5% from ${refLabel.toLowerCase()})</span>`
                : (below
                    ? ` <span class="text-orange-700 text-xs font-semibold">(below ${refLabel.toLowerCase()})</span>`
                    : ' <span class="text-[#1E4D2B] text-xs font-semibold">(changed)</span>'))
            : ` <span class="text-[#6B4423] text-xs">(same as ${refLabel.toLowerCase()})</span>`;

        return `
            <div class="rounded-xl p-3 mb-2 ${rowClass}">
                <p class="font-semibold brand-green">${item.product || "—"}</p>
                <p class="text-sm text-[#6B4423] mt-1">
                    ${refLabel}: <strong>${hasRef ? "$" + refPrice.toFixed(2) : "—"}</strong>
                    → Proposed: <strong class="${over5 ? "text-red-700" : (below ? "text-orange-700" : "text-[#c56134]")}">$${isNaN(proposed) ? "—" : proposed.toFixed(2)}</strong>
                    ${pctBadge}
                    ${changeLabel}
                </p>
            </div>
        `;
    }).join("");

    const summaryBits = [];
    if (changedCount > 0) summaryBits.push(changedCount + " changed");
    if (over5Count > 0) summaryBits.push(over5Count + " outside ±5%");
    const summaryText = summaryBits.length
        ? summaryBits.join(" · ")
        : (isCustomerPricing ? "No price changes from base sheet" : "No price changes from catalog");

    return `
        <button type="button" onclick="showPriceProposalsPanel()"
                class="mb-4 text-sm text-[#6B4423] hover:underline">
            ← Back to list
        </button>

        <div class="border-2 border-[#6B4423] rounded-2xl p-4">
            <div class="flex justify-between items-start mb-3">
                <div>
                    <p class="font-bold text-lg brand-green">${p.salesmanName || "Salesman"}</p>
                    <p class="text-sm text-[#6B4423]">${typeLabel} · ${date} · ${items.length} product(s)</p>
                    <p class="text-xs font-semibold mt-1 ${over5Count > 0 ? "text-red-700" : "text-[#6B4423]"}">${summaryText}</p>
                </div>
                <span class="px-3 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">
                    Pending
                </span>
            </div>

            ${p.overallNotes ? `<p class="text-sm text-[#6B4423] mb-3"><strong>Notes:</strong> ${p.overallNotes}</p>` : ""}

            <div class="flex flex-wrap gap-2 mb-3">
                <button type="button"
                        onclick="toggleProposalChangesOnly(false)"
                        class="px-3 py-1.5 text-xs font-semibold rounded-lg border-2 ${!changesOnly ? "bg-[#1E4D2B] text-[#d4b78f] border-[#1E4D2B]" : "border-[#6B4423] text-[#6B4423] hover:bg-[#f8f4eb]"}">
                    Show all
                </button>
                <button type="button"
                        onclick="toggleProposalChangesOnly(true)"
                        class="px-3 py-1.5 text-xs font-semibold rounded-lg border-2 ${changesOnly ? "bg-[#1E4D2B] text-[#d4b78f] border-[#1E4D2B]" : "border-[#6B4423] text-[#6B4423] hover:bg-[#f8f4eb]"}">
                    Show changes only
                </button>
            </div>

            <div class="max-h-72 overflow-y-auto mb-4">
                ${itemRows || "<p class='text-sm text-[#6B4423]'>No items</p>"}
                ${changesOnly && changedCount === 0 ? `<p class='text-sm text-[#6B4423]'>No price changes — every selected item matches ${isCustomerPricing ? "base sheet" : "catalog"}.</p>` : ""}
            </div>

            <div class="flex gap-3">
                <button type="button"
                        onclick="approvePriceProposal('${p.id}')"
                        class="flex-1 px-4 py-3 bg-green-700 text-white font-semibold rounded-xl">
                    Approve
                </button>
                <button type="button"
                        onclick="denyPriceProposal('${p.id}')"
                        class="flex-1 px-4 py-3 bg-red-700 text-white font-semibold rounded-xl">
                    Deny
                </button>
            </div>
        </div>
    `;
}

function toggleProposalChangesOnly(changesOnly) {
    const p = window._currentProposalDetail;
    if (!p) return;
    const list = document.getElementById("price-proposals-list");
    if (!list) return;

    const date = new Date(p.submittedAt).toLocaleDateString();
    const typeLabel = p.type === 'initialPriceSheet'
        ? 'Initial Pricing Sheet'
        : (p.type === 'customerPricing' ? 'Customer Pricing'
            : (p.type === 'newProduct' ? 'New Product' : 'Price Change'));

    list.innerHTML = renderProposalDetailHtml(p, date, typeLabel, !!changesOnly);
}

function hidePriceProposalsPanel() {
    const modal = document.getElementById("price-proposals-modal");
    if (modal) modal.classList.add("hidden");
}

// ================== CUSTOMER APPROVALS ==================

async function getPendingCustomers() {
    try {
        const { data, error } = await supabaseClient
            .from('customers')
            .select('*')
            .eq('status', 'Pending')
            .order('created_at', { ascending: false });

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

async function updateCustomerApprovalsBadge() {
    const badge = document.getElementById("customer-approvals-badge");
    if (!badge) return;

    const pending = await getPendingCustomers();
    if (pending.length > 0) {
        badge.textContent = pending.length;
        badge.classList.remove("hidden");
    } else {
        badge.classList.add("hidden");
    }
}

async function showCustomerApprovalsPanel() {
    const modal = document.getElementById("customer-approvals-modal");
    const list = document.getElementById("customer-approvals-list");
    if (!modal || !list) {
        alert("Customer approvals modal not found.");
        return;
    }

    list.innerHTML = `<p class="text-[#6B4423] text-center py-8">Loading...</p>`;
    modal.classList.remove("hidden");

    const pending = await getPendingCustomers();

    if (pending.length === 0) {
        list.innerHTML = `
            <p class="text-[#6B4423] text-center py-8">No pending customer submissions.</p>
        `;
        return;
    }

    list.innerHTML = pending.map(c => {
        const date = new Date(c.created_at).toLocaleDateString();
        return `
            <div class="border-2 border-[#6B4423] rounded-2xl p-4 mb-3">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <p class="font-bold text-lg brand-green">${c.name}</p>
                        <p class="text-sm text-[#6B4423]">${c.company || ""}</p>
                        <p class="text-xs text-[#6B4423] mt-1">
                            Submitted by ${c.submitted_by || "Salesman"} · ${date}
                        </p>
                    </div>
                    <span class="px-3 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">
                        Pending
                    </span>
                </div>

                <div class="text-sm text-[#6B4423] space-y-1 mb-4">
                    ${c.email ? `<p><strong>Email:</strong> ${c.email}</p>` : ""}
                    ${c.phone ? `<p><strong>Phone:</strong> ${c.phone}</p>` : ""}
                    ${c.shipping_address ? `<p><strong>Shipping:</strong> ${c.shipping_address}</p>` : ""}
                    ${c.billing_address ? `<p><strong>Billing:</strong> ${c.billing_address}</p>` : ""}
                    ${c.notes ? `<p><strong>Notes:</strong> ${c.notes}</p>` : ""}
                </div>

                <div class="flex gap-3">
                    <button type="button"
                            onclick="approveCustomer('${c.id}')"
                            class="flex-1 px-4 py-2 bg-green-700 text-white font-semibold rounded-xl">
                        Approve
                    </button>
                    <button type="button"
                            onclick="denyCustomer('${c.id}')"
                            class="flex-1 px-4 py-2 bg-red-700 text-white font-semibold rounded-xl">
                        Deny
                    </button>
                </div>
            </div>
        `;
    }).join("");
}

function hideCustomerApprovalsPanel() {
    const modal = document.getElementById("customer-approvals-modal");
    if (modal) modal.classList.add("hidden");
}

async function approveCustomer(id) {
    try {
        const { error } = await supabaseClient
            .from('customers')
            .update({
                status: 'Approved',
                approved_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) {
            console.error(error);
            alert("Failed to approve customer.");
            return;
        }

        alert("Customer approved.");
        await updateCustomerApprovalsBadge();
        showCustomerApprovalsPanel();   // refresh the list
        if (typeof loadCustomers === 'function') loadCustomers();

    } catch (err) {
        console.error(err);
        alert("Something went wrong.");
    }
}

async function denyCustomer(id) {
    const reason = prompt("Reason for denying this customer (optional):", "");
    if (reason === null) return; // user cancelled

    try {
        const { error } = await supabaseClient
            .from('customers')
            .update({
                status: 'Rejected',
                notes: reason ? `Denied: ${reason}` : null
            })
            .eq('id', id);

        if (error) {
            console.error(error);
            alert("Failed to deny customer.");
            return;
        }

        alert("Customer denied.");
        await updateCustomerApprovalsBadge();
        showCustomerApprovalsPanel();
        if (typeof loadCustomers === 'function') loadCustomers();

    } catch (err) {
        console.error(err);
        alert("Something went wrong.");
    }
}

async function approvePriceProposal(id) {
    try {
        // 1. Load the proposal
        const { data: proposal, error: loadError } = await supabaseClient
            .from('price_proposals')
            .select('*')
            .eq('id', id)
            .single();

        if (loadError || !proposal) {
            alert("Could not find the proposal.");
            return;
        }

        // 5% catalog-price safety check (Initial Pricing Sheet only)
        if (proposal.type === 'initialPriceSheet') {
            const over = [];
            (proposal.items || []).forEach(item => {
                const catalog = Number(item.catalogPrice);
                const proposed = Number(item.proposedPrice);
                if (!isNaN(catalog) && catalog > 0 && !isNaN(proposed) &&
                    Math.abs(proposed - catalog) / catalog > 0.05) {
                    const pct = ((proposed - catalog) / catalog * 100).toFixed(1);
                    const sign = Number(pct) >= 0 ? "+" : "";
                    over.push(`${item.product}: $${catalog.toFixed(2)} → $${proposed.toFixed(2)} (${sign}${pct}%)`);
                }
            });
            if (over.length > 0) {
                const msg =
                    'WARNING: The following items are more than ±5% away from catalog price:\n\n' +
                    over.join('\n') +
                    '\n\nDo you still want to approve this pricing sheet?';
                if (!confirm(msg)) return;
            }
        }

        // Customer pricing: confirm when items are outside ±5%
        if (proposal.type === 'customerPricing') {
            const outside = (proposal.items || []).filter(i => {
                if (i.outside5) return true;
                const base = Number(i.basePrice);
                const proposed = Number(i.proposedPrice);
                return base > 0 && !isNaN(proposed) &&
                    Math.abs((proposed - base) / base) > 0.05;
            });
            if (outside.length > 0) {
                const preview = outside.slice(0, 8).map(i => {
                    const base = Number(i.basePrice);
                    const proposed = Number(i.proposedPrice);
                    const pct = i.pctChange != null
                        ? Number(i.pctChange)
                        : ((proposed - base) / base * 100);
                    const sign = pct >= 0 ? '+' : '';
                    return `${i.product}: $${base.toFixed(2)} → $${proposed.toFixed(2)} (${sign}${pct.toFixed(1)}%)`;
                }).join('\n');
                const more = outside.length > 8 ? `\n…and ${outside.length - 8} more` : '';
                const cust = outside[0]?.customerName || 'this customer';
                if (!confirm(
                    `Approve customer pricing for ${cust}?\n\n` +
                    `${outside.length} item(s) outside ±5% of salesman base:\n\n` +
                    preview + more +
                    `\n\nThis will apply the full proposed price map and unlock pricing for the customer immediately.`
                )) return;
            }
        }

        // ========== CUSTOMER PRICING PATH ==========
        if (proposal.type === 'customerPricing') {
            const items = proposal.items || [];
            const customerId =
                proposal.customer_id ||
                proposal.customerId ||
                items.find(i => i.customerId)?.customerId ||
                null;

            if (!customerId) {
                alert('This customer pricing proposal is missing a customer id.');
                return;
            }

            const email = (proposal.salesman_email || '').toLowerCase().trim();
            const adminUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const approvedBy = adminUser.fullName || adminUser.name || adminUser.email || 'Admin';

            // Build full prices map in priority order:
            // 1. salesman base sheet
            // 2. existing customer sheet
            // 3. this proposal's items (highest priority)
            let pricesMap = {};

            if (email) {
                try {
                    const { data: baseSheet } = await supabaseClient
                        .from('salesman_price_sheets')
                        .select('prices')
                        .eq('salesman_email', email)
                        .maybeSingle();
                    if (baseSheet?.prices && typeof baseSheet.prices === 'object') {
                        pricesMap = { ...baseSheet.prices };
                    }
                } catch (e) {
                    console.warn('customerPricing base merge:', e);
                }
            }

            try {
                const { data: existingCust } = await supabaseClient
                    .from('customer_price_sheets')
                    .select('prices')
                    .eq('customer_id', customerId)
                    .maybeSingle();
                if (existingCust?.prices && typeof existingCust.prices === 'object') {
                    pricesMap = { ...pricesMap, ...existingCust.prices };
                }
            } catch (e) {
                console.warn('customerPricing existing sheet merge:', e);
            }

            items.forEach(item => {
                const name = item.product || item.name;
                if (name && item.proposedPrice != null && !isNaN(Number(item.proposedPrice))) {
                    pricesMap[name] = Number(item.proposedPrice);
                }
            });

            if (Object.keys(pricesMap).length === 0) {
                alert('No valid prices found on this proposal.');
                return;
            }

            // 1. Upsert full map into customer_price_sheets
            const { error: sheetErr } = await supabaseClient
                .from('customer_price_sheets')
                .upsert({
                    customer_id: customerId,
                    salesman_email: email || null,
                    prices: pricesMap,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'customer_id' });
            if (sheetErr) throw sheetErr;

            // 2. Unlock the customer
            const { error: custErr } = await supabaseClient
                .from('customers')
                .update({
                    pricing_approved_at: new Date().toISOString(),
                    pricing_approved_by: approvedBy
                })
                .eq('id', customerId);
            if (custErr) throw custErr;

            // 3. Mark proposal Approved
            const { error: propErr } = await supabaseClient
                .from('price_proposals')
                .update({
                    status: 'Approved',
                    decided_at: new Date().toISOString()
                })
                .eq('id', id);
            if (propErr) throw propErr;

            alert('Customer pricing approved and unlocked.');
            await updatePriceProposalsBadge();
            hidePriceProposalsPanel();
            if (typeof loadCustomers === 'function') loadCustomers();
            return; // IMPORTANT – do not fall into the salesman path
        }
        // ========== END CUSTOMER PRICING PATH ==========

        // ========== SALESMAN / INITIAL PRICE SHEET PATH ==========
        // 2. Mark the proposal as Approved
        const { error: updateError } = await supabaseClient
            .from('price_proposals')
            .update({
                status: 'Approved',
                decided_at: new Date().toISOString()
            })
            .eq('id', id);

        if (updateError) {
            console.error(updateError);
            alert("Failed to approve proposal.");
            return;
        }

        const email = (proposal.salesman_email || "").toLowerCase().trim();
        const salesmanName = proposal.salesman_name || "";

        // 3. Set the salesman's price_sheet_status to approved
        if (email) {
            await supabaseClient
                .from('salesmen')
                .update({ price_sheet_status: 'approved' })
                .eq('email', email);
        }

        // 4. Build the prices map from the proposal items
        const pricesMap = {};
        (proposal.items || []).forEach(item => {
            if (item.product && item.proposedPrice != null) {
                pricesMap[item.product] = parseFloat(item.proposedPrice);
            }
        });

        // 5. Upsert into salesman_price_sheets
        if (email && Object.keys(pricesMap).length > 0) {
            const { data: existing } = await supabaseClient
                .from('salesman_price_sheets')
                .select('id, prices')
                .eq('salesman_email', email)
                .maybeSingle();

            if (existing) {
                const merged = { ...(existing.prices || {}), ...pricesMap };
                await supabaseClient
                    .from('salesman_price_sheets')
                    .update({
                        prices: merged,
                        salesman_name: salesmanName,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);
            } else {
                await supabaseClient
                    .from('salesman_price_sheets')
                    .insert({
                        salesman_email: email,
                        salesman_name: salesmanName,
                        prices: pricesMap
                    });
            }
        }

        alert("Proposal approved. Prices saved for " + (salesmanName || "salesman") + ".");
        await updatePriceProposalsBadge();
        hidePriceProposalsPanel();

    } catch (err) {
        console.error(err);
        alert("Something went wrong while approving.");
    }
}

async function denyPriceProposal(id) {
    const reason = prompt("Reason for denying this proposal (required):", "");
    if (reason === null) return;
    if (!reason.trim()) {
        alert("A denial reason is required.");
        return;
    }

    try {
        // 1. Load the proposal so we know its type + salesman
        const { data: proposal, error: loadError } = await supabaseClient
            .from('price_proposals')
            .select('*')
            .eq('id', id)
            .single();

        if (loadError || !proposal) {
            alert("Could not find the proposal.");
            return;
        }

        // 2. Mark it Denied (reason goes in overall_notes — safest column)
        const { error: updateError } = await supabaseClient
            .from('price_proposals')
            .update({
                status: 'Denied',
                overall_notes: (proposal.overall_notes ? proposal.overall_notes + '\n\n' : '') +
                               'DENIED: ' + reason.trim(),
                decided_at: new Date().toISOString()
            })
            .eq('id', id);

        if (updateError) throw updateError;

        // 3. If this was an Initial Pricing Sheet, reset salesman so they can resubmit
        if (proposal.type === 'initialPriceSheet') {
            const email = (proposal.salesman_email || '').toLowerCase().trim();
            if (email) {
                // Reset status → Initial Sheet tab can show again
                const { error: statusError } = await supabaseClient
                    .from('salesmen')
                    .update({ price_sheet_status: 'required' })
                    .eq('email', email);

                if (statusError) {
                    console.error('Could not reset price_sheet_status:', statusError);
                }

                // Remove any existing sheet so the tab is not blocked by hasApprovedSheet
                const { error: sheetError } = await supabaseClient
                    .from('salesman_price_sheets')
                    .delete()
                    .eq('salesman_email', email);

                if (sheetError) {
                    console.error('Could not clear salesman_price_sheets:', sheetError);
                }
            }
        }

        alert("Proposal denied." +
              (proposal.type === 'initialPriceSheet'
                  ? "\n\nSalesman can now submit a new Initial Pricing Sheet."
                  : ""));

        await updatePriceProposalsBadge();
        showPriceProposalsPanel();

    } catch (err) {
        console.error('denyPriceProposal error:', err);
        alert("Could not deny proposal.\n" + (err.message || ''));
    }
}

// ================== WHOLESALE INQUIRIES (Supabase) ==================
let inquiries = [];

async function loadInquiries() {
    try {
        const { data, error } = await supabaseClient
            .from('wholesale_inquiries')
            .select('id, owner_name, company_name, email, phone, nature_of_business, nature_other, monthly_amount, region, notes, status, source, created_at, assigned_salesman_id')
            .order('created_at', { ascending: false });

        if (error) throw error;
        inquiries = data || [];
        inquiriesLoadedAt = Date.now();
    } catch (err) {
        console.error('Error loading inquiries:', err);
        inquiries = [];
    }
}

function updateInquiryStats() {
    const pendingList = inquiries.filter(i => (i.status || '').toLowerCase() === 'pending');
    const approved = inquiries.filter(i => (i.status || '').toLowerCase() === 'approved').length;
    const denied   = inquiries.filter(i => (i.status || '').toLowerCase() === 'denied').length;
    const pending  = pendingList.length;

    const pendingEl  = document.getElementById('pending-count');
    const approvedEl = document.getElementById('approved-count');
    const deniedEl   = document.getElementById('denied-count');

    if (pendingEl)  pendingEl.textContent  = pending;
    if (approvedEl) approvedEl.textContent = approved;
    if (deniedEl)   deniedEl.textContent   = denied;

    // Dashboard card count
    const dashPending = document.getElementById('dash-pending-inquiries');
    if (dashPending) dashPending.textContent = pending;

    // Dashboard card list of who is pending
    const listEl = document.getElementById('dash-pending-inquiries-list');
    if (listEl) {
        if (pendingList.length === 0) {
            listEl.innerHTML = '<p class="text-xs text-[#6B4423] text-center">No pending inquiries</p>';
        } else {
            listEl.innerHTML = pendingList.map(i => {
                const name = (i.owner_name || '—').trim();
                const company = (i.company_name || '').trim();
                return `
                    <div class="bg-[#f8f4eb] rounded-lg px-3 py-1.5 text-left">
                        <p class="text-sm font-semibold brand-green truncate">${name}</p>
                        ${company ? `<p class="text-xs text-[#6B4423] truncate">${company}</p>` : ''}
                    </div>
                `;
            }).join('');
        }
    }

    // Sidebar badge
    const badge = document.getElementById('inquiries-badge');
    if (badge) {
        if (pending > 0) {
            badge.textContent = String(pending);
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

async function renderInquiries() {
    const pendingContainer  = document.getElementById('pending-inquiries-list');
    const approvedContainer = document.getElementById('approved-inquiries-list');
    const deniedContainer   = document.getElementById('denied-inquiries-list');

    if (!pendingContainer || !approvedContainer || !deniedContainer) return;

    pendingContainer.innerHTML  = '<p class="text-[#6B4423] text-center py-4">Loading…</p>';
    approvedContainer.innerHTML = '';
    deniedContainer.innerHTML   = '';

    await loadInquiries();

    pendingContainer.innerHTML  = '';
    approvedContainer.innerHTML = '';
    deniedContainer.innerHTML   = '';

    const pending  = inquiries.filter(i => (i.status || '').toLowerCase() === 'pending');
    const approved = inquiries.filter(i => (i.status || '').toLowerCase() === 'approved');
    const denied   = inquiries.filter(i => (i.status || '').toLowerCase() === 'denied');

    if (pending.length === 0) {
        pendingContainer.innerHTML = `
            <div class="text-center py-6">
                <i class="fas fa-inbox text-3xl text-[#d4b78f] mb-2"></i>
                <p class="text-[#6B4423]">No pending inquiries</p>
            </div>
        `;
    } else {
        pending.forEach(inquiry => pendingContainer.appendChild(createInquiryCard(inquiry, true)));
    }

    if (approved.length === 0) {
        approvedContainer.innerHTML = `
            <div class="text-center py-6">
                <i class="fas fa-check-circle text-3xl text-green-400 mb-2"></i>
                <p class="text-[#6B4423]">No approved inquiries yet</p>
            </div>
        `;
    } else {
        approved.forEach(inquiry => approvedContainer.appendChild(createInquiryCard(inquiry, false)));
    }

    if (denied.length === 0) {
        deniedContainer.innerHTML = `
            <div class="text-center py-6">
                <i class="fas fa-times-circle text-3xl text-red-400 mb-2"></i>
                <p class="text-[#6B4423]">No denied inquiries yet</p>
            </div>
        `;
    } else {
        denied.forEach(inquiry => deniedContainer.appendChild(createInquiryCard(inquiry, false)));
    }

    updateInquiryStats();
}

function getInquiryLocation(inquiry) {
    const region = (inquiry.region || '').trim();
    if (region) return region;

    const notes = (inquiry.notes || '').trim();
    if (!notes) return '—';

    // Prefer Shipping: block from landing-page form
    const shipMatch = notes.match(/Shipping:\s*([\s\S]*?)(?=\n(?:Billing|Admin notes|Approved by|Assigned salesman|Temp username|Temp password):|$)/i);
    const block = (shipMatch ? shipMatch[1] : notes).trim();

    // "City, ST" or "City, ST ZIP"
    const cityState = block.match(/([A-Za-z .'-]+),\s*([A-Z]{2})(?:\s+\d{5}(?:-\d{4})?)?/i);
    if (cityState) {
        return cityState[1].trim() + ', ' + cityState[2].toUpperCase();
    }

    // Fallback: last non-empty line of the shipping block
    const lines = block.split(/\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length) return lines[lines.length - 1];

    return '—';
}

function createInquiryCard(inquiry, showActions) {
    const div = document.createElement('div');
    div.className = 'border border-[#d4b78f] rounded-xl p-5 mb-4 bg-[#f8f4eb]';

    const status = (inquiry.status || 'pending').toLowerCase();
    const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
    const submitted = inquiry.created_at
        ? new Date(inquiry.created_at).toLocaleString()
        : '—';

    const nature = inquiry.nature_other
        ? `${inquiry.nature_of_business} (${inquiry.nature_other})`
        : (inquiry.nature_of_business || '—');

    const location = getInquiryLocation(inquiry);

    let html = `
        <div class="flex justify-between items-start mb-3">
            <div>
                <p class="font-bold text-lg">${inquiry.owner_name || '—'}</p>
                <p class="text-sm text-[#6B4423]">${inquiry.company_name || '—'} • ${inquiry.email || '—'}</p>
                <p class="text-sm text-[#6B4423]">${inquiry.phone || ''}</p>
            </div>
            <div class="text-right">
                <span class="px-3 py-1 text-xs font-semibold rounded-full
                    ${status === 'pending'  ? 'bg-orange-100 text-orange-700' : ''}
                    ${status === 'approved' ? 'bg-green-100 text-green-700' : ''}
                    ${status === 'denied'   ? 'bg-red-100 text-red-700' : ''}">
                    ${statusLabel}
                </span>
                <p class="text-xs text-[#6B4423] mt-1">Submitted: ${submitted}</p>
                <p class="text-xs text-[#6B4423]">Source: ${inquiry.source || '—'}</p>
            </div>
        </div>
        <div class="mb-3 bg-white rounded-lg p-3 text-sm space-y-1">
            <p><strong>Location:</strong> ${location}</p>
            <p><strong>Monthly Amount:</strong> ${inquiry.monthly_amount || '—'}</p>
            <p><strong>Nature of Business:</strong> ${nature}</p>
        </div>
    `;

    if (showActions && status === 'pending') {
        html += `
            <div class="flex gap-3 mt-4">
                <button onclick="approveInquiry('${inquiry.id}', this)" class="flex-1 bg-[#1E4D2B] hover:bg-[#254a2f] text-[#d4b78f] font-bold py-2.5 rounded-xl text-sm">
                    ✓ Approve
                </button>
                <button onclick="denyInquiry('${inquiry.id}', this)" class="flex-1 border-2 border-[#6B4423] hover:bg-red-50 text-[#6B4423] font-bold py-2.5 rounded-xl text-sm">
                    ✗ Deny
                </button>
            </div>
        `;
    }

    div.innerHTML = html;
    return div;
}

// Approve / Deny will be wired to Supabase in the next step
async function approveInquiry(id, element) {
    // Opens the approval modal instead of approving immediately
    openInquiryApprovalModal(id);
}

function hideInquiryApprovalModal() {
    const modal = document.getElementById('inquiry-approval-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function toggleNewCustomerSameAddress() {
    const same = document.getElementById('new-customer-same-address');
    const billingFields = document.getElementById('new-customer-billing-fields');
    if (!same || !billingFields) return;

    if (same.checked) {
        billingFields.classList.add('hidden');
        // Optional: copy ship → bill so values exist if user later unchecks
        document.getElementById('new-customer-bill-street').value = document.getElementById('new-customer-ship-street')?.value || '';
        document.getElementById('new-customer-bill-apt').value = document.getElementById('new-customer-ship-apt')?.value || '';
        document.getElementById('new-customer-bill-city').value = document.getElementById('new-customer-ship-city')?.value || '';
        document.getElementById('new-customer-bill-state').value = document.getElementById('new-customer-ship-state')?.value || '';
        document.getElementById('new-customer-bill-zip').value = document.getElementById('new-customer-ship-zip')?.value || '';
    } else {
        billingFields.classList.remove('hidden');
    }
}

function toggleIaSameAddress() {
    const same = document.getElementById('ia-same-address');
    const billingFields = document.getElementById('ia-billing-fields');
    if (!same || !billingFields) return;

    if (same.checked) {
        billingFields.classList.add('hidden');
        // Optional: copy ship → bill so values exist if user later unchecks
        document.getElementById('ia-bill-street').value = document.getElementById('ia-ship-street')?.value || '';
        document.getElementById('ia-bill-apt').value = document.getElementById('ia-ship-apt')?.value || '';
        document.getElementById('ia-bill-city').value = document.getElementById('ia-ship-city')?.value || '';
        document.getElementById('ia-bill-state').value = document.getElementById('ia-ship-state')?.value || '';
        document.getElementById('ia-bill-zip').value = document.getElementById('ia-ship-zip')?.value || '';
    } else {
        billingFields.classList.remove('hidden');
    }
}

function buildAddressFromParts(street, apt, city, state, zip) {
    const parts = [];
    if (street) parts.push(street.trim());
    if (apt) parts.push(apt.trim());
    const cityLine = [city, state, zip].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    // Prefer "City, ST ZIP"
    if (city && state) {
        parts.push(`${city.trim()}, ${state.trim()} ${zip ? zip.trim() : ''}`.trim());
    } else if (cityLine) {
        parts.push(cityLine);
    }
    return parts.join('\n');
}

function parseAddressBlock(block) {
    const result = { street: '', apt: '', city: '', state: '', zip: '' };
    if (!block) return result;
    const lines = block.split(/\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return result;

    // Last line is usually "City, ST ZIP"
    const last = lines[lines.length - 1];
    const cityStateZip = last.match(/^(.+?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/i);
    if (cityStateZip) {
        result.city = cityStateZip[1].trim();
        result.state = cityStateZip[2].toUpperCase();
        result.zip = cityStateZip[3];
        lines.pop();
    }

    if (lines.length >= 1) result.street = lines[0];
    if (lines.length >= 2) result.apt = lines[1];
    // If only one remaining line and no city parsed, treat whole block as free-text street
    if (!result.city && lines.length === 0 && block) {
        result.street = block.trim();
    }
    return result;
}

async function openInquiryApprovalModal(inquiryId) {
    const modal = document.getElementById('inquiry-approval-modal');
    if (!modal) {
        alert('Approval modal not found. Check internal-portal.html.');
        return;
    }

    try {
        const { data: inquiry, error } = await supabaseClient
            .from('wholesale_inquiries')
            .select('*')
            .eq('id', inquiryId)
            .single();

        if (error) throw error;
        if (!inquiry) throw new Error('Inquiry not found');

        document.getElementById('ia-inquiry-id').value = inquiry.id;
        document.getElementById('ia-name').value = inquiry.owner_name || '';
        document.getElementById('ia-company').value = inquiry.company_name || '';
        document.getElementById('ia-email').value = inquiry.email || '';
        document.getElementById('ia-phone').value = inquiry.phone || '';

        const notesText = inquiry.notes || '';

        // Extract multi-line Shipping block (until next known key or end)
        let shipBlock = '';
        const shipMatch = notesText.match(/Shipping:\s*([\s\S]*?)(?=\n(?:Billing|Admin notes|Approved by|Assigned salesman|Temp username|Temp password):|$)/i);
        if (shipMatch) shipBlock = shipMatch[1].trim();

        let billBlock = '';
        const billMatch = notesText.match(/Billing:\s*([\s\S]*?)(?=\n(?:Shipping|Admin notes|Approved by|Assigned salesman|Temp username|Temp password):|$)/i);
        if (billMatch) billBlock = billMatch[1].trim();

        const shipParts = parseAddressBlock(shipBlock);
        document.getElementById('ia-ship-street').value = shipParts.street || '';
        document.getElementById('ia-ship-apt').value = shipParts.apt || '';
        document.getElementById('ia-ship-city').value = shipParts.city || '';
        document.getElementById('ia-ship-state').value = shipParts.state || '';
        document.getElementById('ia-ship-zip').value = shipParts.zip || '';

        const billParts = parseAddressBlock(billBlock || shipBlock);
        document.getElementById('ia-bill-street').value = billParts.street || '';
        document.getElementById('ia-bill-apt').value = billParts.apt || '';
        document.getElementById('ia-bill-city').value = billParts.city || '';
        document.getElementById('ia-bill-state').value = billParts.state || '';
        document.getElementById('ia-bill-zip').value = billParts.zip || '';

        const same = !billBlock || billBlock.trim() === shipBlock.trim();
        document.getElementById('ia-same-address').checked = same;
        toggleIaSameAddress();
        document.getElementById('ia-notes').value = '';

        // Load salesmen
                const { data: salesmenList, error: salesmenErr } = await supabaseClient
            .from('salesmen')
            .select('id, first_name, last_name, email, territory, active')
            .order('last_name', { ascending: true });

        if (salesmenErr) {
            console.error('Salesmen load error:', salesmenErr);
        }

        // Prefer active salesmen; if none marked active, show all
        let list = (salesmenList || []).filter(s => s.active !== false);
        if (list.length === 0) {
            list = salesmenList || [];
        }

        const select = document.getElementById('ia-salesman');
        const suggestedEl = document.getElementById('ia-suggested');
        select.innerHTML = '<option value="">Select salesman…</option>';

        let suggestedId = null;
        const regionHint = (inquiry.region || shipBlock || notesText || '').toLowerCase();

            list.forEach(s => {
                        const label = [s.first_name, s.last_name].filter(Boolean).join(' ')
                || s.email
                || s.id;
            const territory = (s.territory || '').trim();
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = territory ? (label + ' — ' + territory) : label;
            opt.dataset.email = (s.email || '').toLowerCase().trim();
            opt.dataset.name = label;
            select.appendChild(opt);

            // Simple suggestion: territory text appears in region/shipping/notes
            if (!suggestedId && territory && regionHint.includes(territory.toLowerCase())) {
                suggestedId = s.id;
            }
        });

        if (suggestedId) {
            select.value = suggestedId;
            const match = list.find(s => s.id === suggestedId);
                        const matchName = match
                ? ([match.first_name, match.last_name].filter(Boolean).join(' ') || match.email)
                : '';
            suggestedEl.textContent = matchName
                ? 'Suggested (by territory): ' + matchName
                : '';
        } else {
            suggestedEl.textContent = 'No automatic match — please select a salesman.';
        }

        modal.classList.remove('hidden');
    } catch (err) {
        console.error('Open approval modal error:', err);
        alert('Could not open approval form.\n' + (err.message || ''));
    }
}

async function confirmInquiryApproval() {
    const inquiryId = document.getElementById('ia-inquiry-id').value;
    const name = document.getElementById('ia-name').value.trim();
    const company = document.getElementById('ia-company').value.trim();
    const email = document.getElementById('ia-email').value.trim();
    const phone = document.getElementById('ia-phone').value.trim();
    const shipStreet = document.getElementById('ia-ship-street')?.value.trim() || '';
    const shipApt = document.getElementById('ia-ship-apt')?.value.trim() || '';
    const shipCity = document.getElementById('ia-ship-city')?.value.trim() || '';
    const shipState = document.getElementById('ia-ship-state')?.value.trim() || '';
    const shipZip = document.getElementById('ia-ship-zip')?.value.trim() || '';

    if (!shipStreet || !shipCity || !shipState || !shipZip) {
        alert('Shipping street, city, state, and ZIP are required.');
        return;
    }

    const shipping = buildAddressFromParts(shipStreet, shipApt, shipCity, shipState, shipZip);

    const same = document.getElementById('ia-same-address')?.checked;
    let billing = shipping;
    if (!same) {
        const billStreet = document.getElementById('ia-bill-street')?.value.trim() || '';
        const billApt = document.getElementById('ia-bill-apt')?.value.trim() || '';
        const billCity = document.getElementById('ia-bill-city')?.value.trim() || '';
        const billState = document.getElementById('ia-bill-state')?.value.trim() || '';
        const billZip = document.getElementById('ia-bill-zip')?.value.trim() || '';
        billing = buildAddressFromParts(billStreet, billApt, billCity, billState, billZip) || shipping;
    }
    const adminNotes = document.getElementById('ia-notes').value.trim();
    const salesmanSelect = document.getElementById('ia-salesman');
    const salesmanId = salesmanSelect.value;

    if (!name || !company || !email) {
        alert('Name, company, and email are required.');
        return;
    }

    const selectedOpt = salesmanSelect.options[salesmanSelect.selectedIndex];
    const salesmanEmail = salesmanId ? (selectedOpt.dataset.email || null) : null;
    const salesmanName = salesmanId
        ? (selectedOpt.dataset.name || selectedOpt.textContent)
        : 'Unassigned';

    const btn = document.getElementById('ia-confirm-btn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Saving…';
    }

    try {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const approvedBy = user.fullName || user.name || user.email || 'Admin';

        const notesParts = [];
        if (adminNotes) notesParts.push('Admin notes: ' + adminNotes);
        notesParts.push('Approved by: ' + approvedBy);
        if (salesmanId) {
            notesParts.push('Assigned salesman: ' + salesmanName);
        } else {
            notesParts.push('No salesman assigned at approval');
        }

        const tempUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        const tempPassword = 'DN' + Math.random().toString(36).slice(2, 8).toUpperCase() + '!';

        // Create Auth user + profile via Edge Function (raw fetch for real error text)
        const fnUrl = SUPABASE_URL + '/functions/v1/create-customer-user';
        const fnRes = await fetch(fnUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
                email: email,
                password: tempPassword,
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

        const notesWithCreds = notesParts.join('\n') +
            '\nTemp username: ' + email +
            '\nTemp password: ' + tempPassword;

                const customerPayload = {
            name: name,
            company: company,
            email: email,
            phone: phone || '',
            shipping_address: shipping || '',
            billing_address: billing || shipping || '',
            notes: notesWithCreds,
            status: 'Approved',
            salesman_email: salesmanEmail,
            assigned_at: salesmanId ? new Date().toISOString() : null,
            onboarding_complete: false,
            password_changed: false
        };

        const { data: existing } = await supabaseClient
            .from('customers')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (!existing) {
            const { error: custError } = await supabaseClient
                .from('customers')
                .insert([customerPayload]);
            if (custError) throw custError;
        }

        const updatePayload = {
            status: 'approved',
            owner_name: name,
            company_name: company,
            email: email,
            phone: phone || null,
            notes: notesWithCreds,
            assigned_salesman_id: salesmanId || null
        };

        const { error: updateError } = await supabaseClient
            .from('wholesale_inquiries')
            .update(updatePayload)
            .eq('id', inquiryId);

        if (updateError) throw updateError;

        hideInquiryApprovalModal();
        await renderInquiries();

        const emailOk = fnData && fnData.email_sent === true;
        const emailFailReason = (fnData && fnData.email_error) ? String(fnData.email_error) : '';

        alert(
            'Inquiry approved.\n' +
            'Customer created.\n' +
            'Login account created.\n' +
            (salesmanId ? 'Assigned to: ' + salesmanName : 'No salesman assigned (you can assign later)') + '\n\n' +
            'Customer login (email + temp password):\n' +
            'Email: ' + email + '\n' +
            'Password: ' + tempPassword + '\n\n' +
            (emailOk
                ? 'Credentials email was sent to the customer.'
                : ('Credentials email was NOT sent.\n' +
                   (emailFailReason ? ('Reason: ' + emailFailReason + '\n') : '') +
                   'Please give the customer the temp password above.'))
        );
    } catch (err) {
        console.error('Confirm approval error:', err);
        alert('Could not complete approval.\n' + (err.message || ''));
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Approve & Create Customer';
        }
    }
}

async function denyInquiry(id, element) {
    if (!id) return;

    const reason = prompt('Reason for denying this inquiry:');
    if (reason === null) return;
    if (!reason.trim()) {
        alert('A denial reason is required.');
        return;
    }

    if (element) {
        element.disabled = true;
        element.textContent = 'Saving…';
    }

    try {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const deniedBy = user.fullName || user.name || user.email || 'Admin';

        const { data, error } = await supabaseClient
            .from('wholesale_inquiries')
            .update({
                status: 'denied',
                notes: 'Denied by ' + deniedBy + ': ' + reason.trim()
            })
            .eq('id', id)
            .select('id, status');

        if (error) throw error;

        if (!data || data.length === 0) {
            throw new Error('No inquiry was updated. Check that the row still exists.');
        }

        // Force a full refresh of lists + stats
        await loadInquiries();
        await renderInquiries();
        if (typeof updateInquiryStats === 'function') updateInquiryStats();

        alert('Inquiry denied.');
    } catch (err) {
        console.error('Deny error:', err);
        alert('Could not deny inquiry.\n' + (err.message || ''));
        if (element) {
            element.disabled = false;
            element.textContent = '✗ Deny';
        }
    }
}

function addTestInquiry() {
    alert('Test inquiries are no longer needed — submit from the landing page instead.');
}

function showInquiriesSection() {
    showSection('inquiries');
    if (typeof renderInquiries === 'function') {
        setTimeout(() => renderInquiries(), 120);
    }
}

// ================== INVENTORY ==================
function openAddProductModal() {
    const modal = document.getElementById('add-product-modal');
    if (!modal) return;

    // Clear form
    const ids = [
        'new-product-name', 'new-product-category', 'new-product-subcategory',
        'new-product-casesize', 'new-product-unitprice', 'new-product-marketnote',
        'new-product-priceasof'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
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

    const name = (document.getElementById('new-product-name')?.value || '').trim();
    const category = (document.getElementById('new-product-category')?.value || '').trim();
    const subCategory = (document.getElementById('new-product-subcategory')?.value || '').trim();
    const caseSize = (document.getElementById('new-product-casesize')?.value || '').trim();
    const unitPriceRaw = document.getElementById('new-product-unitprice')?.value;
    const unitPrice = parseFloat(unitPriceRaw);
    const isMarket = document.getElementById('new-product-ismarket')?.checked === true;
    const marketNote = (document.getElementById('new-product-marketnote')?.value || '').trim();
    const priceAsOf = (document.getElementById('new-product-priceasof')?.value || '').trim();

    if (!name) {
        alert('Product name is required.');
        return;
    }
    if (!category) {
        alert('Category is required.');
        return;
    }
    if (isNaN(unitPrice) || unitPrice < 0) {
        alert('Enter a valid unit price (0 or higher).');
        return;
    }

    // Guard against exact-name duplicates in the live catalog
    if (PRODUCT_CATALOG.some(p => p.name === name)) {
        alert('A product with that exact name already exists in the catalog.');
        return;
    }

    const catalogEntry = {
        name: name,
        category: category,
        subCategory: subCategory || null,
        caseSize: caseSize || null,
        unitPrice: unitPrice,
        isMarketPrice: isMarket,
        marketPriceNote: isMarket ? (marketNote || null) : null,
        landedCost: null,
        grossProfit: null,
        priceAsOf: priceAsOf || null
    };

    try {
        // 0. Check products table first (catches DB duplicates the catalog doesn't know about)
        const { data: existing, error: checkErr } = await supabaseClient
            .from('products')
            .select('id, name')
            .eq('name', name)
            .maybeSingle();

        if (checkErr) throw checkErr;

        let productAlreadyInDb = !!existing;

        if (!productAlreadyInDb) {
            // 1. Insert into products table
            const { error: prodErr } = await supabaseClient
                .from('products')
                .insert({
                    name: name,
                    category: category,
                    sub_category: subCategory || null,
                    case_size: caseSize || null,
                    unit_price: unitPrice,
                    is_market_price: isMarket,
                    active: true
                });

            if (prodErr) {
                // 409 / unique_violation → clear message
                const code = prodErr.code || '';
                const msg = (prodErr.message || '').toLowerCase();
                if (code === '23505' || msg.includes('duplicate') || msg.includes('unique') || msg.includes('conflict')) {
                    alert('A product with that name already exists in the database.\n\nUse a different name, or check Inventory / products.');
                    return;
                }
                throw prodErr;
            }
        } else {
            // Already in DB — still continue so inventory + proposals can be set up on retry
            console.warn('Product already in products table; skipping insert and continuing with inventory/proposals:', name);
        }

        // 2. Push into live catalog (if not already there)
        if (!PRODUCT_CATALOG.some(p => p.name === name)) {
            PRODUCT_CATALOG.push(catalogEntry);
        }

        // 3. Start inventory at 0 (or leave existing qty alone)
        if (typeof upsertInventoryQuantity === 'function') {
            if (inventory[name] === undefined) {
                inventory[name] = 0;
                await upsertInventoryQuantity(name, 0);
            }
        }

        // 4. Ensure salesmen are loaded
        if (!Array.isArray(salesmen) || salesmen.length === 0) {
            if (typeof loadSalesmen === 'function') await loadSalesmen();
        }

                // New products are added to the catalog only.
        // Salesmen set their own prices later via Price Change proposal.
        // Do NOT auto-create Pending proposals — that put them in the admin queue immediately.

        hideAddProductModal();

        if (typeof loadProductCatalog === 'function') {
            await loadProductCatalog();
        }
        if (typeof applyRecommendedPriceToSalesmen === 'function') {
            await applyRecommendedPriceToSalesmen(name, unitPrice);
        }
        if (typeof renderBasePriceSheet === 'function') {
            renderBasePriceSheet();
        }
        if (typeof showCurrentInventory === 'function') showCurrentInventory();
        if (typeof updatePriceProposalsBadge === 'function') updatePriceProposalsBadge();

        alert(
            'Product added: ' + name + '\n' +
            'It is on the company price sheet and in the products table.\n' +
            'Recommended price was written to salesman sheets.'
        );
    } catch (err) {
        console.error('saveNewProduct error:', err);
        const code = err?.code || '';
        const msg = (err?.message || '').toLowerCase();
        if (code === '23505' || msg.includes('duplicate') || msg.includes('unique') || msg.includes('conflict')) {
            alert('A product with that name already exists in the database.\n\nUse a different product name.');
        } else {
            alert('Could not save product.\n' + (err.message || ''));
        }
    }
}

// Preferred main category order
const INVENTORY_CATEGORY_ORDER = [
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
let inventory = {};
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
                    <p class="font-medium">${item.productName}</p>
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
            <span class="font-medium text-[#1E4D2B] truncate pr-2">${i + 1}. ${p.name}</span>
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

// ================== DASHBOARD CUSTOMIZE (DRAG & DROP) ==================
let dashboardCustomizeMode = false;
let draggedCard = null;

function toggleDashboardCustomize() {
    dashboardCustomizeMode = !dashboardCustomizeMode;

    const label = document.getElementById('customize-dashboard-label');
    const cards = document.querySelectorAll('#dashboard-cards .dashboard-card');

    if (dashboardCustomizeMode) {
        if (label) label.textContent = 'Done Customizing';
        cards.forEach(card => {
            card.setAttribute('draggable', 'true');
            card.classList.add('ring-2', 'ring-[#d4b78f]');
            const handle = card.querySelector('.dashboard-drag-handle');
            if (handle) handle.classList.remove('hidden');
        });
    } else {
        if (label) label.textContent = 'Customize Dashboard';
        cards.forEach(card => {
            card.setAttribute('draggable', 'false');
            card.classList.remove('ring-2', 'ring-[#d4b78f]', 'opacity-50');
            const handle = card.querySelector('.dashboard-drag-handle');
            if (handle) handle.classList.add('hidden');
        });
        saveDashboardCardOrder();
    }
}

function dashboardCardClick(event, target) {
    // Ignore normal navigation while customizing
    if (dashboardCustomizeMode) {
        event.preventDefault();
        event.stopPropagation();
        return;
    }

    if (target === 'orders') {
        showSection('orders');
    } else if (target === 'financials-sales') {
        showSection('financials');
        setTimeout(() => showFinancialsSub('sales'), 50);
    } else if (target === 'financials-matrix') {
        showSection('financials');
        setTimeout(() => showFinancialsSub('sales'), 50);
    } else if (target === 'financials') {
        showSection('financials');
        setTimeout(() => showFinancialsSub('ach-log'), 50);
    } else if (target === 'reports') {
        showSection('reports');
    } else if (target === 'salesmen') {
        showSection('salesmen');
    } else if (target === 'vendors') {
        if (typeof showVendorsSection === 'function') {
            showVendorsSection();
        } else {
            showSection('vendors');
        }
    } else if (target === 'profit') {
        showSection('financials');
        setTimeout(() => {
            showFinancialsSub('profit');
            const el = document.getElementById('profit-margin-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 200);
        } else if (target === 'inquiries') {
        if (typeof showInquiriesSection === 'function') {
            showInquiriesSection();
        } else {
            showSection('inquiries');
        }
    } else if (target === 'inventory') {
        if (typeof showInventorySection === 'function') {
            showInventorySection();
        } else {
            showSection('inventory');
        }
    }
}

function goToLowStock(event) {
    event.stopPropagation();          // prevent the whole card click
    if (typeof showInventorySection === 'function') {
        showInventorySection();       // opens Inventory + Current Inventory
    } else {
        showSection('inventory');
        if (typeof showCurrentInventory === 'function') showCurrentInventory();
    }
}

function goToPendingPOs(event) {
    event.stopPropagation();          // prevent the whole card click
    if (typeof showInventorySection === 'function') {
        showSection('inventory');
        if (typeof showInventoryReceiving === 'function') {
            showInventoryReceiving(); // opens the Receive POs view
        }
    } else {
        showSection('inventory');
    }
}

function goToOrderRecommendations(event) {
    event.stopPropagation();          // prevent the whole card click
    showSection('inventory');
    if (typeof showInventoryProjections === 'function') {
        showInventoryProjections();   // jumps straight to Projections
    }
}

function saveDashboardCardOrder() {
    const container = document.getElementById('dashboard-cards');
    if (!container) return;

    const order = Array.from(container.querySelectorAll('.dashboard-card'))
        .map(card => card.getAttribute('data-card-id'))
        .filter(Boolean);

    localStorage.setItem('dashboardCardOrder', JSON.stringify(order));
}

function applyDashboardCardOrder() {
    const container = document.getElementById('dashboard-cards');
    if (!container) return;

    let order = [];
    try {
        order = JSON.parse(localStorage.getItem('dashboardCardOrder') || '[]');
    } catch (e) {
        order = [];
    }
    if (!Array.isArray(order) || order.length === 0) return;

    const cardsById = {};
    container.querySelectorAll('.dashboard-card').forEach(card => {
        const id = card.getAttribute('data-card-id');
        if (id) cardsById[id] = card;
    });

    order.forEach(id => {
        if (cardsById[id]) {
            container.appendChild(cardsById[id]);
        }
    });
}

function initDashboardDragAndDrop() {
    const container = document.getElementById('dashboard-cards');
    if (!container) return;

    container.addEventListener('dragstart', function (e) {
        if (!dashboardCustomizeMode) return;
        const card = e.target.closest('.dashboard-card');
        if (!card) return;
        draggedCard = card;
        card.classList.add('opacity-50');
        e.dataTransfer.effectAllowed = 'move';
        try {
            e.dataTransfer.setData('text/plain', card.getAttribute('data-card-id') || '');
        } catch (err) {}
    });

    container.addEventListener('dragend', function (e) {
        const card = e.target.closest('.dashboard-card');
        if (card) card.classList.remove('opacity-50');
        draggedCard = null;
        container.querySelectorAll('.dashboard-card').forEach(c => {
            c.classList.remove('ring-4', 'ring-green-400');
        });
    });

    container.addEventListener('dragover', function (e) {
        if (!dashboardCustomizeMode || !draggedCard) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const overCard = e.target.closest('.dashboard-card');
        if (!overCard || overCard === draggedCard) return;

        const cards = Array.from(container.querySelectorAll('.dashboard-card'));
        const draggedIndex = cards.indexOf(draggedCard);
        const overIndex = cards.indexOf(overCard);

        if (draggedIndex < overIndex) {
            container.insertBefore(draggedCard, overCard.nextSibling);
        } else {
            container.insertBefore(draggedCard, overCard);
        }
    });

    container.addEventListener('drop', function (e) {
        if (!dashboardCustomizeMode) return;
        e.preventDefault();
        saveDashboardCardOrder();
    });

    // Apply saved order on load
    applyDashboardCardOrder();
}

// ================== INITIALIZATION ==================
window.onload = async function() {
    loadUser();
    const dashboard = document.getElementById('dashboard');
    if (dashboard) dashboard.style.display = 'block';
    if (typeof initDashboardDragAndDrop === 'function') {
        initDashboardDragAndDrop();
    }
    // Parallel independent loads for faster first paint
    const loads = [];
    if (typeof loadProductCatalog === 'function') loads.push(loadProductCatalog());
    if (typeof loadOrders === 'function') loads.push(loadOrders());
    if (typeof loadInventory === 'function') loads.push(loadInventory());
    if (typeof loadInquiries === 'function') loads.push(loadInquiries());
    if (typeof loadVendors === 'function') loads.push(loadVendors());
    try {
        await Promise.all(loads);
    } catch (err) {
        console.warn('Dashboard parallel load warning:', err);
    }
    // Pure UI updates from in-memory data (after loads settle)
    if (typeof updateDashboardSales === 'function') updateDashboardSales();
    if (typeof updateDashboardOrders === 'function') updateDashboardOrders();
    if (typeof updateDashboardPendingCount === 'function') updateDashboardPendingCount();
    if (typeof updateDashboardLowStock === 'function') updateDashboardLowStock();
    if (typeof updatePendingPOIndicators === 'function') updatePendingPOIndicators();
    if (typeof updateDashboardVendors === 'function') updateDashboardVendors();
    if (typeof updateDashboardSalesmen === 'function') updateDashboardSalesmen();
    if (typeof updateDashboardProfitMargin === 'function') updateDashboardProfitMargin();
    if (typeof updateDashboardSalesMatrix === 'function') updateDashboardSalesMatrix();
    if (typeof updateDashboardAchCounts === 'function') updateDashboardAchCounts();
    if (typeof updateInquiryStats === 'function') updateInquiryStats();
};

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
            <h3 class="text-xl font-bold brand-green">${displayName}</h3>
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
            <td class="p-3 font-mono">#${order.id}</td>
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
        billEl.innerHTML = lines.map(l => `<p>${l}</p>`).join('');
    }

    const shipEl = document.getElementById('inv-ship-to');
    if (shipEl) {
        const lines = [customerName];
        if (customerCompany) lines.push(customerCompany);
        const shipping = customer?.shippingAddress || customer?.billingAddress || '';
        if (shipping) lines.push(shipping);
        shipEl.innerHTML = lines.map(l => `<p>${l}</p>`).join('');
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

            const desc = [
                item.product_name || '—',
                item.case_size ? '· ' + item.case_size : ''
            ].filter(Boolean).join(' ');

            const unitText = hasPrice ? ('$' + unit.toFixed(2)) : (item.display_price || '—');
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

// Framework stub only — future auto-create when inventory would go negative
// function maybeAutoCreateBackOrderFromInventory(productName, requestedQty) { ... }

function filterOrdersByCustomer(customerName) {
    const container = document.getElementById('orders-table');
    const empty = document.getElementById('orders-empty');
    const summaryCards = document.querySelector('#orders .grid-cols-1.md\\:grid-cols-3');

    if (!container || !allOrders) return;

    // Hide the general customer summary cards
    if (summaryCards) summaryCards.style.display = 'none';

    const customerOrders = allOrders.filter(order =>
        order.customer && order.customer.toLowerCase() === customerName.toLowerCase()
    );

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
            <h3 class="text-xl font-bold brand-green">Orders for ${customerName}</h3>
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
            <td class="p-3 font-mono">#${order.id}</td>
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

async function updateDashboardSalesmen() {
    try {
        const { data, error } = await supabaseClient
                        .from('salesmen')
.select('id, first_name, last_name, email, territory, commission, market_commission, price_sheet_status, yearly_sales, monthly_sales, active, notes, mailing_address, assigned_products')
            .order('last_name', { ascending: true });

        if (error) {
            console.error('Error loading salesmen for dashboard:', error);
            salesmen = [];
        } else {
            salesmen = (data || []).map(s => ({
                id: s.id,
                firstName: s.first_name,
                lastName: s.last_name,
                name: [s.first_name, s.last_name].filter(Boolean).join(' '),
                email: s.email,
                territory: s.territory || '',
                commission: s.commission != null ? Number(s.commission) : 8,
                marketCommission: s.market_commission != null ? Number(s.market_commission) : 3,
                priceSheetStatus: s.price_sheet_status,
                yearlySales: Number(s.yearly_sales) || 0,
                monthlySales: Number(s.monthly_sales) || 0,
                active: s.active !== false,
                notes: s.notes || '',
                mailingAddress: s.mailing_address || '',
            }));
        }
    } catch (err) {
        console.error(err);
        salesmen = [];
    }

    const activeList = salesmen.filter(s => s.active !== false);
    const countEl = document.getElementById('dash-salesmen-count');
    if (countEl) countEl.textContent = activeList.length;

    const container = document.getElementById('dash-top-salesmen');
    if (!container) return;

    if (activeList.length === 0) {
        container.innerHTML = '<p class="text-[#6B4423] text-sm">No salesmen yet.</p>';
        return;
    }

    // Ensure orders are loaded before calculating YTD
    try {
        if (typeof loadOrders === 'function' && (!allOrders || allOrders.length === 0)) {
            await loadOrders();
        }
    } catch (err) {
        console.warn('updateDashboardSalesmen: could not load orders', err);
    }

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const ytdByKey = {};

    (allOrders || []).forEach(order => {
        const orderDate = new Date(
            order.submittedAt || order.submitted_at || order.created_at || order.date || 0
        );
        if (isNaN(orderDate.getTime()) || orderDate < startOfYear) return;

        const name = (
            order.salesman ||
            order.salesman_name ||
            order.salesmanName ||
            ''
        ).trim();
        const email = (
            order.salesmanEmail ||
            order.salesman_email ||
            ''
        ).trim().toLowerCase();

        const key = name || email;
        if (!key) return;

        let orderTotal = 0;
        (order.items || []).forEach(item => {
            const qty = parseInt(item.quantity, 10) || 0;
            const unit = typeof getOrderItemUnitPrice === 'function'
                ? getOrderItemUnitPrice(item)
                : (parseFloat(item.unitPrice) || 0);
            orderTotal += qty * unit;
        });

        if (!ytdByKey[key]) ytdByKey[key] = { name: name || key, ytd: 0 };
        ytdByKey[key].ytd += orderTotal;
        if (name) ytdByKey[key].name = name;
    });

    let topSalesmen = Object.values(ytdByKey)
        .sort((a, b) => b.ytd - a.ytd)
        .slice(0, 3);

    // Fallback: show active salesmen at $0 if no order names matched
    if (topSalesmen.length === 0) {
        topSalesmen = activeList.slice(0, 3).map(s => ({
            name: s.name || [s.firstName, s.lastName].filter(Boolean).join(' ') || 'Unnamed',
            ytd: 0
        }));
    }

    container.innerHTML = topSalesmen.map((s, i) => `
        <div class="flex justify-between items-center">
            <span class="font-medium truncate pr-2">${i + 1}. ${s.name}</span>
            <span class="font-semibold whitespace-nowrap">$${Math.round(s.ytd).toLocaleString()}</span>
        </div>
    `).join('');

    if (typeof updatePriceProposalsBadge === 'function') {
        updatePriceProposalsBadge();
    }
    if (typeof updateCustomerApprovalsBadge === 'function') {
        updateCustomerApprovalsBadge();
    }
}

// Shared helper – real unit price for any order line item
function getOrderItemUnitPrice(item) {
    if (item.unitPrice != null && !isNaN(Number(item.unitPrice))) {
        return Number(item.unitPrice);
    }
    const name = (item.product || item.productName || item.name || '').trim();
    if (name && typeof PRODUCT_CATALOG !== 'undefined') {
        const match = PRODUCT_CATALOG.find(p => p.name === name);
        if (match && match.unitPrice != null && !match.isMarketPrice) {
            return Number(match.unitPrice);
        }
    }
    return 0;
}

function updateDashboardSales() {
    const ytdEl = document.getElementById('dash-ytd-sales');
    const mtdEl = document.getElementById('dash-mtd-sales');
    const wtdEl = document.getElementById('dash-wtd-sales');
    const ytdUnitsEl = document.getElementById('dash-ytd-units');
    const mtdUnitsEl = document.getElementById('dash-mtd-units');
    const wtdUnitsEl = document.getElementById('dash-wtd-units');

    if (!allOrders || allOrders.length === 0) {
        if (ytdEl) ytdEl.textContent = '$0';
        if (mtdEl) mtdEl.textContent = '$0';
        if (wtdEl) wtdEl.textContent = '$0';
        if (ytdUnitsEl) ytdUnitsEl.textContent = '0';
        if (mtdUnitsEl) mtdUnitsEl.textContent = '0';
        if (wtdUnitsEl) wtdUnitsEl.textContent = '0';
        if (typeof updatePortalCommissionCard === 'function') {
            updatePortalCommissionCard();
        }
        return;
    }

    let ytdTotal = 0, mtdTotal = 0, wtdTotal = 0;
    let ytdUnits = 0, mtdUnits = 0, wtdUnits = 0;

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday start

    allOrders.forEach(order => {
        if (!order.items || !Array.isArray(order.items)) return;

        const orderDate = new Date(order.submittedAt || order.submitted_at || order.date || now);
        if (isNaN(orderDate.getTime())) return;

        let orderTotal = 0;
        let orderUnits = 0;

        order.items.forEach(item => {
            const qty = parseInt(item.quantity, 10) || 0;
            const unit = typeof getOrderItemUnitPrice === 'function'
                ? getOrderItemUnitPrice(item)
                : (parseFloat(item.unitPrice) || 0);
            orderTotal += qty * unit;
            orderUnits += qty;
        });

        if (orderDate >= startOfYear) {
            ytdTotal += orderTotal;
            ytdUnits += orderUnits;
        }
        if (orderDate >= startOfMonth) {
            mtdTotal += orderTotal;
            mtdUnits += orderUnits;
        }
        if (orderDate >= startOfWeek) {
            wtdTotal += orderTotal;
            wtdUnits += orderUnits;
        }
    });

    if (ytdEl) ytdEl.textContent = '$' + Math.round(ytdTotal).toLocaleString();
    if (mtdEl) mtdEl.textContent = '$' + Math.round(mtdTotal).toLocaleString();
    if (wtdEl) wtdEl.textContent = '$' + Math.round(wtdTotal).toLocaleString();
    if (ytdUnitsEl) ytdUnitsEl.textContent = ytdUnits.toLocaleString();
    if (mtdUnitsEl) mtdUnitsEl.textContent = mtdUnits.toLocaleString();
    if (wtdUnitsEl) wtdUnitsEl.textContent = wtdUnits.toLocaleString();

    if (typeof updatePortalCommissionCard === 'function') {
        updatePortalCommissionCard();
    }
}

function isJonathanAdmin() {
    try {
        const u = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (!u || u.role !== 'admin') return false;
        const e = String(u.email || u.username || '').toLowerCase().trim();
        return e === 'jackerman@donegalnatural.com' ||
               e === 'jon.donegalnatural@gmail.com' ||
               e.includes('jackerman') ||
               e.includes('jon.donegalnatural');
    } catch (err) {
        return false;
    }
}

function updatePortalCommissionCard() {
    const card = document.getElementById('dash-portal-commission-card');
    const ytdEl = document.getElementById('dash-commission-ytd');
    const mtdEl = document.getElementById('dash-commission-mtd');
    if (!card) return;

    if (!isJonathanAdmin()) {
        card.style.display = 'none';
        return;
    }
    card.style.display = '';

    let ytdCommission = 0;
    let mtdCommission = 0;
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    (allOrders || []).forEach(order => {
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

        const rate = Number(order.portalCommissionRate) === 10 ? 0.10 : 0.05;

        if (orderDate >= startOfYear) ytdCommission += orderTotal * rate;
        if (orderDate >= startOfMonth) mtdCommission += orderTotal * rate;
    });

    const fmt = (n) => '$' + Math.round(n).toLocaleString();
    if (ytdEl) ytdEl.textContent = fmt(ytdCommission);
    if (mtdEl) mtdEl.textContent = fmt(mtdCommission);
}
// ================== VENDORS SYSTEM ==================
let vendors = [];

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
                    <h3 class="text-xl font-bold brand-green ${isActive ? '' : 'line-through text-gray-400'}">${vendor.name}</h3>
                    <p class="text-sm text-[#6B4423]">${vendor.contact || ''}</p>
                </div>
                <span class="px-3 py-1 text-xs font-semibold rounded-full ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">
                    ${isActive ? 'Active' : 'Inactive'}
                </span>
            </div>
            <div class="space-y-1 text-sm text-[#6B4423]">
                <p><i class="fas fa-phone w-5"></i> ${vendor.phone || '—'}</p>
                <p><i class="fas fa-envelope w-5"></i> ${vendor.email || '—'}</p>
            </div>
        `;

        list.appendChild(card);
    });
}

function hideAddVendorModal() {
    const modal = document.getElementById('add-vendor-modal');
    if (modal) modal.classList.add('hidden');
}

// ================== ADD VENDOR – CATEGORIES + PRODUCTS ==================
let tempSelectedProducts = [];   // holds product names while the chooser is open

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
                <span class="text-sm">${p.name}</span>
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
            <td class="p-3">${product.name}</td>
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

// ================== COST OF GOODS ==================
let productCosts = [];

async function loadProductCosts() {
    try {
        const { data, error } = await supabaseClient
            .from('product_costs')
            .select('*')
            .order('product_name');

        if (error) throw error;

        productCosts = (data || []).map(row => ({
            id: row.id,
            productName: row.product_name,
            category: row.category || '',
            vendorName: row.vendor_name,
            unitCost: Number(row.unit_cost),
            notes: row.notes || '',
            lastUpdated: row.last_updated
        }));

        console.log('Product costs loaded from Supabase:', productCosts.length);
    } catch (err) {
        console.error('loadProductCosts error:', err);
        productCosts = [];
    }
}

async function openProductCostsModal() {
    document.getElementById('product-costs-modal').classList.remove('hidden');
    await loadProductCosts();
    renderCostOfGoods();
}

function hideProductCostsModal() {
    document.getElementById('product-costs-modal').classList.add('hidden');
}

function renderCostOfGoods() {
    const tbody = document.getElementById('cost-of-goods-body');
    const searchInput = document.getElementById('cog-search');
    if (!tbody) return;

    const search = (searchInput?.value || '').toLowerCase();
    tbody.innerHTML = '';

    if (!window.expandedProducts) window.expandedProducts = {};

    PRODUCT_CATALOG.forEach((product, index) => {
        if (search &&
            !product.name.toLowerCase().includes(search) &&
            !(product.category || '').toLowerCase().includes(search)) {
            return;
        }

        const costsForProduct = productCosts.filter(c => c.productName === product.name);
        const isExpanded = window.expandedProducts[product.name] === true;
        const hasMultiple = costsForProduct.length > 1;
        const hasSingle = costsForProduct.length === 1;
        const singleCost = hasSingle ? costsForProduct[0] : null;

        // Format date helper
        const formatDate = (iso) => {
            if (!iso) return '—';
            const d = new Date(iso);
            return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
        };

        // --- Main row ---
        const headerRow = document.createElement('tr');
        headerRow.className = 'border-b border-[#d4b78f] hover:bg-[#f8f4eb]';

        if (hasMultiple) {
            // Multiple costs → expandable summary
            headerRow.classList.add('cursor-pointer');
            headerRow.innerHTML = `
                <td class="p-3 font-medium">
                    <span class="mr-2 text-[#6B4423]">${isExpanded ? '▼' : '▶'}</span>
                    ${product.name}
                </td>
                <td class="p-3 text-sm text-[#6B4423]">${product.category || ''}</td>
                <td class="p-3 text-sm">${costsForProduct.length} cost(s)</td>
                <td class="p-3"></td>
                <td class="p-3"></td>
                <td class="p-3 text-center">
                    <button data-index="${index}" class="add-cost-btn px-3 py-1 text-xs bg-[#1E4D2B] text-[#d4b78f] rounded-lg hover:bg-[#254a2f]">
                        Add Cost
                    </button>
                </td>
            `;
            headerRow.addEventListener('click', function(e) {
                if (e.target.closest('.add-cost-btn')) return;
                window.expandedProducts[product.name] = !isExpanded;
                renderCostOfGoods();
            });
        } else if (hasSingle) {
            // Single cost → show details on the main row
            headerRow.innerHTML = `
                <td class="p-3 font-medium">${product.name}</td>
                <td class="p-3 text-sm text-[#6B4423]">${product.category || ''}</td>
                <td class="p-3">${singleCost.vendorName}</td>
                <td class="p-3 text-right font-semibold">$${parseFloat(singleCost.unitCost).toFixed(2)}</td>
                <td class="p-3 text-center text-sm">${formatDate(singleCost.lastUpdated)}</td>
                <td class="p-3 text-center">
                    <div class="flex justify-center gap-2">
                        <button data-id="${singleCost.id}" class="edit-cost-btn px-3 py-1 text-xs border border-[#6B4423] rounded-lg hover:bg-white">
                            Edit
                        </button>
                        <button data-id="${singleCost.id}" class="delete-cost-btn px-3 py-1 text-xs border border-red-400 text-red-600 rounded-lg hover:bg-red-50">
                            Delete
                        </button>
                        <button data-index="${index}" class="add-cost-btn px-3 py-1 text-xs bg-[#1E4D2B] text-[#d4b78f] rounded-lg hover:bg-[#254a2f]">
                            Add Cost
                        </button>
                    </div>
                </td>
            `;
        } else {
            // No costs
            headerRow.innerHTML = `
                <td class="p-3 font-medium">${product.name}</td>
                <td class="p-3 text-sm text-[#6B4423]">${product.category || ''}</td>
                <td class="p-3 text-sm">—</td>
                <td class="p-3"></td>
                <td class="p-3"></td>
                <td class="p-3 text-center">
                    <button data-index="${index}" class="add-cost-btn px-3 py-1 text-xs bg-[#1E4D2B] text-[#d4b78f] rounded-lg hover:bg-[#254a2f]">
                        Add Cost
                    </button>
                </td>
            `;
        }

        tbody.appendChild(headerRow);

        // --- Expanded rows (only for multiple costs) ---
        if (hasMultiple && isExpanded) {
            costsForProduct.forEach(cost => {
                const costRow = document.createElement('tr');
                costRow.className = 'bg-[#f8f4eb] border-b border-[#d4b78f]';
                costRow.innerHTML = `
                    <td class="p-3 pl-10 text-sm" colspan="2"></td>
                    <td class="p-3">${cost.vendorName}</td>
                    <td class="p-3 text-right font-semibold">$${parseFloat(cost.unitCost).toFixed(2)}</td>
                    <td class="p-3 text-center text-sm">${formatDate(cost.lastUpdated)}</td>
                    <td class="p-3 text-center">
                        <div class="flex justify-center gap-2">
                            <button data-id="${cost.id}" class="edit-cost-btn px-3 py-1 text-xs border border-[#6B4423] rounded-lg hover:bg-white">
                                Edit
                            </button>
                            <button data-id="${cost.id}" class="delete-cost-btn px-3 py-1 text-xs border border-red-400 text-red-600 rounded-lg hover:bg-red-50">
                                Delete
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(costRow);
            });
        }
    });

    // Event listeners
    tbody.querySelectorAll('.add-cost-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const index = parseInt(this.getAttribute('data-index'));
            window.editingCostId = null;
            assignProductCost(PRODUCT_CATALOG[index].name);
        });
    });

    tbody.querySelectorAll('.edit-cost-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const costId = this.getAttribute('data-id'); // keep as string (UUID)
            window.editingCostId = costId;
            editProductCostById(costId);
        });
    });

    tbody.querySelectorAll('.delete-cost-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const costId = this.getAttribute('data-id'); // keep as string (UUID)
            deleteProductCost(costId);
        });
    });
}

function showAddCostModal() {
    const productSelect = document.getElementById('cost-product');
    productSelect.innerHTML = '<option value="">Select a product...</option>';
    PRODUCT_CATALOG.forEach(product => {
        const option = document.createElement('option');
        option.value = product.name;
        option.textContent = product.name;
        productSelect.appendChild(option);
    });

    const vendorSelect = document.getElementById('cost-vendor');
    vendorSelect.innerHTML = '<option value="">Select a vendor...</option>';
    vendors.forEach(v => {
        const option = document.createElement('option');
        option.value = v.name;
        option.textContent = v.name;
        vendorSelect.appendChild(option);
    });

    document.getElementById('cost-unit-cost').value = '';
    document.getElementById('cost-notes').value = '';

    document.getElementById('add-cost-modal').classList.remove('hidden');
}

function hideAddCostModal() {
    document.getElementById('add-cost-modal').classList.add('hidden');
}

async function saveProductCost(event) {
    event.preventDefault();

    const productName = document.getElementById('cost-product').value;
    const vendorName = document.getElementById('cost-vendor').value;
    const unitCostRaw = document.getElementById('cost-unit-cost').value;
    const unitCost = parseFloat(unitCostRaw);
    const notes = (document.getElementById('cost-notes').value || '').trim();

    if (!productName || !vendorName || isNaN(unitCost)) {
        alert('Please fill in Product, Vendor, and a valid Unit Cost.');
        return;
    }

    const catalogItem = PRODUCT_CATALOG.find(p => p.name === productName);
    const category = catalogItem ? catalogItem.category : '';

    try {
        if (window.editingCostId) {
            // Update existing row
            const { error } = await supabaseClient
                .from('product_costs')
                .update({
                    product_name: productName,
                    category: category || null,
                    vendor_name: vendorName,
                    unit_cost: unitCost,
                    notes: notes || null,
                    last_updated: new Date().toISOString()
                })
                .eq('id', window.editingCostId);

            if (error) throw error;
            window.editingCostId = null;
        } else {
            // Insert new row
            const { error } = await supabaseClient
                .from('product_costs')
                .insert({
                    product_name: productName,
                    category: category || null,
                    vendor_name: vendorName,
                    unit_cost: unitCost,
                    notes: notes || null
                });

            if (error) throw error;
        }

        await loadProductCosts();
        renderCostOfGoods();
        hideAddCostModal();
    } catch (err) {
        console.error('saveProductCost error:', err);
        alert('Could not save cost.\n' + (err.message || ''));
    }
}

function assignProductCost(productName) {
    showAddCostModal();
    setTimeout(() => {
        document.getElementById('cost-product').value = productName;
    }, 100);
}

// Load vendors early so the dashboard card is correct on first paint
// Load vendors early so the dashboard cards are correct on first paint
if (typeof loadVendors === 'function') {
    loadVendors().then(() => {
        if (typeof updateDashboardVendors === 'function') {
            updateDashboardVendors();
        }
        if (typeof updatePendingPOIndicators === 'function') {
            updatePendingPOIndicators();
        }
        setTimeout(() => {
            if (typeof updatePendingPOIndicators === 'function') {
                updatePendingPOIndicators();
            }
        }, 800);
    });
}

function editProductCost(productName) {
    const costRecord = productCosts.find(c => c.productName === productName);
    showAddCostModal();
    setTimeout(() => {
        if (costRecord) {
            document.getElementById('cost-product').value = costRecord.productName;
            document.getElementById('cost-vendor').value = costRecord.vendorName;
            document.getElementById('cost-unit-cost').value = costRecord.unitCost;
            document.getElementById('cost-notes').value = costRecord.notes || '';
        } else {
            document.getElementById('cost-product').value = productName;
        }
    }, 100);
}



function editProductCostById(costId) {
    const costRecord = productCosts.find(c => String(c.id) === String(costId));
    if (!costRecord) {
        alert('Cost record not found.');
        return;
    }

    window.editingCostId = costId;
    showAddCostModal();

    setTimeout(() => {
        document.getElementById('cost-product').value = costRecord.productName;
        document.getElementById('cost-vendor').value = costRecord.vendorName;
        document.getElementById('cost-unit-cost').value = costRecord.unitCost;
        document.getElementById('cost-notes').value = costRecord.notes || '';
    }, 100);
}

async function deleteProductCost(costId) {
    if (!confirm('Are you sure you want to delete this cost?')) return;

    try {
        const { error } = await supabaseClient
            .from('product_costs')
            .delete()
            .eq('id', costId);

        if (error) throw error;

        await loadProductCosts();
        renderCostOfGoods();
    } catch (err) {
        console.error('deleteProductCost error:', err);
        alert('Could not delete cost.\n' + (err.message || ''));
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

// ================== INGREDIENTS (Supabase) ==================
let productIngredients = [];

function getDefaultIngredients() {
    return [
        {
            group: "Jerky Stick Treats",
            name: "USA Beef Jerky Treats",
            ingredients: "Ground Beef Meat, Rice Flour, Spices, Sugar, Salt and Garlic Powder",
            notForHuman: true,
            analysis: { protein: "29.60%", fat: "18.70%", fiber: "0.21%", moisture: "32.70%" },
            sortOrder: 1
        },
        {
            group: "Jerky Stick Treats",
            name: "USA Turkey Jerky Treats",
            ingredients: "Ground Turkey Meat, Rice Flour, Spices, Sugar, Salt and Garlic Powder",
            notForHuman: true,
            analysis: { protein: "30.80%", fat: "16.90%", fiber: "0.25%", moisture: "32.20%" },
            sortOrder: 2
        },
        {
            group: "Jerky Stick Treats",
            name: "USA Chicken Jerky Treats",
            ingredients: "Ground Chicken Meat, Rice Flour, Spices, Sugar, Salt and Garlic Powder",
            notForHuman: true,
            analysis: { protein: "31.20%", fat: "16.40%", fiber: "0.25%", moisture: "32.00%" },
            sortOrder: 3
        },
        {
            group: "Jerky Stick Treats",
            name: "USA Elky Jerky Treats/Squares",
            ingredients: "Ground Elk Meat, Rice Flour, Spices, Sugar, Salt and Garlic Powder",
            notForHuman: true,
            analysis: { protein: "29.60%", fat: "18.70%", fiber: "0.21%", moisture: "32.70%" },
            sortOrder: 4
        },
        {
            group: "Jerky Stick Treats",
            name: "USA Venison & Sweet Potato Jerky Treats",
            ingredients: "Ground Venison, Sweet Potato, Rice Flour, Spices, Sugar, Salt and Garlic Powder",
            notForHuman: true,
            analysis: { protein: "27.50%", fat: "17.80%", fiber: "1.80%", moisture: "31.50%" },
            sortOrder: 5
        },
        {
            group: "Natural Vanilla",
            name: "Vanilla Rollios (all sizes + PHAT)",
            ingredients: "Flavored with natural vanilla",
            notForHuman: false,
            analysis: null,
            sortOrder: 10
        },
        {
            group: "Natural Vanilla",
            name: "Vanilla Cow Ears / Lamb Ears / Ox Tails / Chicken Feet",
            ingredients: "Flavored with natural vanilla",
            notForHuman: false,
            analysis: null,
            sortOrder: 11
        },
        {
            group: "Natural Vanilla",
            name: "Vanilla Cow Cheek Slabs & Chunky Cheeks",
            ingredients: "Flavored with natural vanilla",
            notForHuman: false,
            analysis: null,
            sortOrder: 12
        },
        {
            group: "Natural Vanilla",
            name: "Vanilla Supreme Chips / Binky’s / Retrievers / Braided Donuts / Twisty Q’s",
            ingredients: "Flavored with natural vanilla",
            notForHuman: false,
            analysis: null,
            sortOrder: 13
        },
        {
            group: "Natural Honey + Smoke",
            name: "Honey Smoked Rollios (all sizes + PHAT)",
            ingredients: "Natural honey and natural smoke flavoring",
            notForHuman: false,
            analysis: null,
            sortOrder: 20
        },
        {
            group: "Natural Honey + Smoke",
            name: "Honey Smoked Cow Ears / MAGNA Buffalo Ears / Ox Tails",
            ingredients: "Natural honey and natural smoke flavoring",
            notForHuman: false,
            analysis: null,
            sortOrder: 21
        },
        {
            group: "Natural Honey + Smoke",
            name: "Smoked Cow Hooves",
            ingredients: "Natural smoke flavoring",
            notForHuman: false,
            analysis: null,
            sortOrder: 22
        },
        {
            group: "All Natural Peanut Butter",
            name: "Peanut Butter Rollios",
            ingredients: "All natural peanut butter",
            notForHuman: false,
            analysis: null,
            sortOrder: 30
        },
        {
            group: "All Natural Peanut Butter",
            name: "Peanut Butter Stuffed Buffalo Bone",
            ingredients: "All natural peanut butter",
            notForHuman: false,
            analysis: null,
            sortOrder: 31
        },
        {
            group: "All Natural Peanut Butter",
            name: "Peanut Butter Supreme Chips / Binky’s",
            ingredients: "All natural peanut butter",
            notForHuman: false,
            analysis: null,
            sortOrder: 32
        }
    ];
}

function mapIngredientRow(row) {
    return {
        id: row.id,
        group: row.group_name,
        name: row.name,
        ingredients: row.ingredients || '',
        notForHuman: !!row.not_for_human,
        analysis: row.analysis || null,
        sortOrder: row.sort_order != null ? row.sort_order : 0
    };
}

async function loadIngredients() {
    try {
        const { data, error } = await supabaseClient
            .from('product_ingredients')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            // First-time seed from defaults
            const defaults = getDefaultIngredients();
            const payload = defaults.map(d => ({
                group_name: d.group,
                name: d.name,
                ingredients: d.ingredients,
                not_for_human: d.notForHuman,
                analysis: d.analysis,
                sort_order: d.sortOrder
            }));

            const { data: inserted, error: insertError } = await supabaseClient
                .from('product_ingredients')
                .insert(payload)
                .select();

            if (insertError) throw insertError;
            productIngredients = (inserted || []).map(mapIngredientRow);
        } else {
            productIngredients = data.map(mapIngredientRow);
        }

        updateIngredientsCardPreview();
        return productIngredients;
    } catch (err) {
        console.error('loadIngredients error:', err);
        productIngredients = [];
        return [];
    }
}

async function saveIngredientItem(item) {
    if (!item || !item.id) return;

    try {
        const { error } = await supabaseClient
            .from('product_ingredients')
            .update({
                ingredients: item.ingredients || '',
                not_for_human: !!item.notForHuman,
                analysis: item.analysis || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', item.id);

        if (error) throw error;
    } catch (err) {
        console.error('saveIngredientItem error:', err);
        alert('Could not save ingredient.\n' + (err.message || ''));
        throw err;
    }
}

function updateIngredientsCardPreview() {
    const elky = productIngredients.find(i =>
        (i.name || '').toLowerCase().includes('elky')
    ) || productIngredients[0];

    if (!elky) return;

    const titleEl = document.getElementById('ingredients-card-title');
    const textEl = document.getElementById('ingredients-card-text');
    const warnEl = document.getElementById('ingredients-card-warning');
    const analysisEl = document.getElementById('ingredients-card-analysis');

    if (titleEl) titleEl.textContent = elky.name || '';
    if (textEl) textEl.textContent = elky.ingredients || '';
    if (warnEl) {
        if (elky.notForHuman) {
            warnEl.textContent = 'NOT FOR HUMAN CONSUMPTION';
            warnEl.classList.remove('hidden');
        } else {
            warnEl.textContent = '';
            warnEl.classList.add('hidden');
        }
    }
    if (analysisEl && elky.analysis) {
        analysisEl.innerHTML = `
            <div class="bg-[#f8f4eb] rounded-lg py-2">
                <p class="text-xs text-[#6B4423]">Protein</p>
                <p class="font-bold">${elky.analysis.protein || '—'}</p>
            </div>
            <div class="bg-[#f8f4eb] rounded-lg py-2">
                <p class="text-xs text-[#6B4423]">Acid Fat</p>
                <p class="font-bold">${elky.analysis.fat || '—'}</p>
            </div>
            <div class="bg-[#f8f4eb] rounded-lg py-2">
                <p class="text-xs text-[#6B4423]">Crude Fiber</p>
                <p class="font-bold">${elky.analysis.fiber || '—'}</p>
            </div>
            <div class="bg-[#f8f4eb] rounded-lg py-2">
                <p class="text-xs text-[#6B4423]">Moisture</p>
                <p class="font-bold">${elky.analysis.moisture || '—'}</p>
            </div>
        `;
    }
}

function renderIngredients() {
    const container = document.getElementById('ingredients-list');
    const searchInput = document.getElementById('ingredients-search');
    if (!container) return;

    const search = (searchInput?.value || '').toLowerCase();
    container.innerHTML = '';

    if (!productIngredients || productIngredients.length === 0) {
        container.innerHTML = '<p class="text-[#6B4423] text-sm p-4">No ingredients loaded yet.</p>';
        return;
    }

    const groups = {};
    productIngredients.forEach(item => {
        if (search &&
            !(item.name || '').toLowerCase().includes(search) &&
            !(item.group || '').toLowerCase().includes(search)) {
            return;
        }
        if (!groups[item.group]) groups[item.group] = [];
        groups[item.group].push(item);
    });

    Object.keys(groups).forEach(groupName => {
        const header = document.createElement('div');
        header.className = 'mt-5 mb-2';
        header.innerHTML = `<h3 class="text-lg font-bold brand-green border-b border-[#d4b78f] pb-1">${groupName}</h3>`;
        container.appendChild(header);

        groups[groupName].forEach(item => {
            const isExpanded = window.expandedIngredients && window.expandedIngredients[item.id];
            const safeId = String(item.id).replace(/'/g, "\\'");

            let analysisHTML = '';
            if (item.analysis) {
                analysisHTML = `
                    <div class="mt-3">
                        <p class="font-semibold mb-2">Guaranteed Analysis</p>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                            <div class="bg-[#f8f4eb] rounded-lg py-2">
                                <p class="text-xs text-[#6B4423]">Protein</p>
                                <p class="font-bold">${item.analysis.protein || '—'}</p>
                            </div>
                            <div class="bg-[#f8f4eb] rounded-lg py-2">
                                <p class="text-xs text-[#6B4423]">Acid Fat</p>
                                <p class="font-bold">${item.analysis.fat || '—'}</p>
                            </div>
                            <div class="bg-[#f8f4eb] rounded-lg py-2">
                                <p class="text-xs text-[#6B4423]">Crude Fiber</p>
                                <p class="font-bold">${item.analysis.fiber || '—'}</p>
                            </div>
                            <div class="bg-[#f8f4eb] rounded-lg py-2">
                                <p class="text-xs text-[#6B4423]">Moisture</p>
                                <p class="font-bold">${item.analysis.moisture || '—'}</p>
                            </div>
                        </div>
                    </div>
                `;
            }

            const card = document.createElement('div');
            card.className = 'border border-[#d4b78f] rounded-xl overflow-hidden mb-2';
            card.innerHTML = `
                <div class="flex items-center justify-between px-4 py-3 bg-[#f8f4eb] cursor-pointer hover:bg-[#f0e6d9]"
                     onclick="toggleIngredient('${safeId}')">
                    <span class="font-medium">${item.name}</span>
                    <span class="text-[#6B4423] text-lg">${isExpanded ? '▼' : '▶'}</span>
                </div>
                <div id="ingredient-detail-${safeId}" class="${isExpanded ? '' : 'hidden'} px-4 py-4 bg-white text-sm space-y-2">
                    <p><strong>Ingredients:</strong> ${item.ingredients}</p>
                    ${item.notForHuman ? '<p class="text-red-600 font-semibold">NOT FOR HUMAN CONSUMPTION</p>' : ''}
                    ${analysisHTML}
                    <div class="pt-3">
                        <button onclick="editIngredient('${safeId}'); event.stopPropagation();"
                                class="px-4 py-1.5 text-xs bg-[#1E4D2B] text-[#d4b78f] rounded-lg hover:bg-[#254a2f]">
                            Edit
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    });
}

function toggleIngredient(id) {
    if (!window.expandedIngredients) window.expandedIngredients = {};
    window.expandedIngredients[id] = !window.expandedIngredients[id];
    renderIngredients();
}

async function editIngredient(id) {
    const item = productIngredients.find(i => String(i.id) === String(id));
    if (!item) return;

    const newIngredients = prompt('Edit Ingredients:', item.ingredients);
    if (newIngredients === null) return;

    item.ingredients = newIngredients.trim();

    if (item.analysis) {
        const protein = prompt('Protein % (number only):', String(item.analysis.protein || '').replace('%', ''));
        const fat = prompt('Acid Fat % (number only):', String(item.analysis.fat || '').replace('%', ''));
        const fiber = prompt('Crude Fiber % (number only):', String(item.analysis.fiber || '').replace('%', ''));
        const moisture = prompt('Moisture % (number only):', String(item.analysis.moisture || '').replace('%', ''));

        if (protein !== null && protein !== '') item.analysis.protein = protein + '%';
        if (fat !== null && fat !== '') item.analysis.fat = fat + '%';
        if (fiber !== null && fiber !== '') item.analysis.fiber = fiber + '%';
        if (moisture !== null && moisture !== '') item.analysis.moisture = moisture + '%';
    }

    try {
        await saveIngredientItem(item);
        updateIngredientsCardPreview();
        renderIngredients();
        alert('Ingredients saved successfully!');
    } catch (err) {
        // error already alerted in saveIngredientItem
    }
}

async function openIngredientsModal() {
    const modal = document.getElementById('ingredients-modal');
    if (!modal) return;

    if (!productIngredients || productIngredients.length === 0) {
        await loadIngredients();
    }

    modal.classList.remove('hidden');
    renderIngredients();
}

function closeIngredientsModal() {
    const modal = document.getElementById('ingredients-modal');
    if (modal) modal.classList.add('hidden');
}
// ================== PROFIT MARGIN ANALYSIS ==================

function getProductMarginData() {
    // Only products that have at least one cost record
    const productsWithCost = [];

    PRODUCT_CATALOG.forEach(product => {
        const costs = productCosts.filter(c => c.productName === product.name);
        if (costs.length === 0) return;

        // Use the lowest cost if multiple vendors (most common approach)
        const unitCost = Math.min(...costs.map(c => parseFloat(c.unitCost)));
        const sellingPrice = parseFloat(product.unitPrice) || 0;

        if (sellingPrice <= 0) return;

        const marginDollar = sellingPrice - unitCost;
        const marginPercent = (marginDollar / sellingPrice) * 100;

        let status = 'normal';
        if (marginPercent > 55) status = 'outperform';
        else if (marginPercent < 30) status = 'underperform';

        productsWithCost.push({
            name: product.name,
            category: product.category || '',
            unitCost: unitCost,
            sellingPrice: sellingPrice,
            marginDollar: marginDollar,
            marginPercent: marginPercent,
            status: status
        });
    });

    // Sort by margin % descending
    productsWithCost.sort((a, b) => b.marginPercent - a.marginPercent);

    return productsWithCost;
}

function getMarginSummary() {
    const data = getProductMarginData();

    if (data.length === 0) {
        return {
            totalProducts: 0,
            avgMargin: 0,
            outperformCount: 0,
            underperformCount: 0,
            topPerformers: []
        };
    }

    const totalMargin = data.reduce((sum, p) => sum + p.marginPercent, 0);
    const avgMargin = totalMargin / data.length;

    const outperformCount = data.filter(p => p.status === 'outperform').length;
    const underperformCount = data.filter(p => p.status === 'underperform').length;

    // Top 20% by margin
    const topCount = Math.max(1, Math.ceil(data.length * 0.20));
    const topPerformers = data.slice(0, topCount);

    return {
        totalProducts: data.length,
        avgMargin: avgMargin,
        outperformCount: outperformCount,
        underperformCount: underperformCount,
        topPerformers: topPerformers,
        allProducts: data
    };
}

function updateDashboardProfitMargin() {
    const summary = getMarginSummary();

    const avgEl = document.getElementById('dash-avg-margin');
    const outEl = document.getElementById('dash-outperform-count');
    const underEl = document.getElementById('dash-underperform-count');

    if (avgEl) {
        avgEl.textContent = summary.totalProducts > 0 
            ? summary.avgMargin.toFixed(1) + '%' 
            : '—';
    }
    if (outEl) outEl.textContent = summary.outperformCount;
    if (underEl) underEl.textContent = summary.underperformCount;
}

// ================== PROFIT MARGIN RENDER FUNCTIONS ==================

let currentMarginFilter = 'all';   // 'all' | 'outperform' | 'underperform'

function renderProfitMarginSection() {
    const summary = getMarginSummary();

    // Summary cards
    const avgEl = document.getElementById('pm-avg-margin');
    const outEl = document.getElementById('pm-outperform');
    const underEl = document.getElementById('pm-underperform');

    if (avgEl) {
        avgEl.textContent = summary.totalProducts > 0 
            ? summary.avgMargin.toFixed(1) + '%' 
            : '—';
    }
    if (outEl) outEl.textContent = summary.outperformCount;
    if (underEl) underEl.textContent = summary.underperformCount;

    // Top Performers (always shows top 20%)
    const topContainer = document.getElementById('pm-top-performers');
    if (topContainer) {
        if (summary.topPerformers.length === 0) {
            topContainer.innerHTML = '<p class="text-[#6B4423]">No products with cost data yet.</p>';
        } else {
            topContainer.innerHTML = summary.topPerformers.map((p, i) => `
                <div class="flex justify-between items-center bg-[#f8f4eb] rounded-xl px-4 py-2">
                    <span class="font-medium">${i + 1}. ${p.name}</span>
                    <span class="font-bold text-green-700">${p.marginPercent.toFixed(1)}%</span>
                </div>
            `).join('');
        }
    }

}

function setMarginFilter(filter) {
    currentMarginFilter = filter;

    // Clear the search box
    const searchInput = document.getElementById('pm-search');
    if (searchInput) searchInput.value = '';

    if (filter === 'all') {
        // All Products → open modal
        showPmProductsModal('all');
    } else {
        // Out Performing or Under-Performing → show inside the section
        renderMarginFilteredList();
    }
}

function renderMarginFilteredList() {
    const resultsContainer = document.getElementById('pm-search-results');
    if (!resultsContainer) return;

    const data = getProductMarginData();
    let filtered = [];

    if (currentMarginFilter === 'outperform') {
        filtered = data.filter(p => p.status === 'outperform');
    } else if (currentMarginFilter === 'underperform') {
        filtered = data.filter(p => p.status === 'underperform');
    } else {
        filtered = data; // all
    }

    resultsContainer.innerHTML = '';

    if (filtered.length === 0) {
        resultsContainer.innerHTML = '<p class="text-[#6B4423] text-sm">No products in this category.</p>';
        return;
    }

    filtered.forEach(p => {
        let statusBadge = '';
        if (p.status === 'outperform') {
            statusBadge = '<span class="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">★ Outperform</span>';
        } else if (p.status === 'underperform') {
            statusBadge = '<span class="px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full">⚠ Under</span>';
        } else {
            statusBadge = '<span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">Normal</span>';
        }

        const card = document.createElement('div');
        card.className = 'bg-[#f8f4eb] border border-[#d4b78f] rounded-xl px-4 py-3';
        card.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <p class="font-medium">${p.name}</p>
                    <p class="text-sm text-[#6B4423] mt-1">
                        Cost: $${p.unitCost.toFixed(2)} &nbsp;|&nbsp; 
                        Price: $${p.sellingPrice.toFixed(2)} &nbsp;|&nbsp; 
                        Margin: $${p.marginDollar.toFixed(2)} (${p.marginPercent.toFixed(1)}%)
                    </p>
                </div>
                <div>${statusBadge}</div>
            </div>
        `;
        resultsContainer.appendChild(card);
    });
}

function renderProfitMarginSearch() {
    const searchInput = document.getElementById('pm-search');
    if (!searchInput) return;

    const search = searchInput.value.trim().toLowerCase();

    if (search.length < 2) {
        // Clear the in-section list when search is empty
        const resultsContainer = document.getElementById('pm-search-results');
        if (resultsContainer) resultsContainer.innerHTML = '';
        return;
    }

    // Search → open modal
    showPmProductsModal('search', search);
}

function showPmProductsModal(filter, searchTerm = '') {
    const modal = document.getElementById('pm-products-modal');
    const listContainer = document.getElementById('pm-modal-list');
    const titleEl = document.getElementById('pm-modal-title');
    const subtitleEl = document.getElementById('pm-modal-subtitle');

    if (!modal || !listContainer) return;

    const marginData = getProductMarginData();
    const marginByName = {};
    marginData.forEach(p => { marginByName[p.name] = p; });

    let filtered = [];
    let title = 'Products';
    let subtitle = '';

    if (filter === 'search') {
        const term = (searchTerm || '').toLowerCase().trim();
        const catalog = (typeof PRODUCT_CATALOG !== 'undefined') ? PRODUCT_CATALOG : [];
        filtered = catalog
            .filter(p =>
                p.name.toLowerCase().includes(term) ||
                (p.category || '').toLowerCase().includes(term)
            )
            .map(p => {
                if (marginByName[p.name]) return marginByName[p.name];
                return {
                    name: p.name,
                    category: p.category || '',
                    unitCost: null,
                    sellingPrice: parseFloat(p.unitPrice) || 0,
                    marginDollar: null,
                    marginPercent: null,
                    status: 'no-cost'
                };
            });
        title = 'Search Results';
        subtitle = term
            ? `Showing products matching "${searchTerm}"`
            : 'Search results';
    } else {
        filtered = marginData;
        title = 'All Products';
        subtitle = 'All products with cost data';
    }

    if (titleEl) titleEl.textContent = title;
    if (subtitleEl) subtitleEl.textContent = subtitle;

    listContainer.innerHTML = '';

    if (filtered.length === 0) {
        listContainer.innerHTML = '<p class="text-[#6B4423] text-sm">No products found.</p>';
    } else {
        filtered.forEach(p => {
            let statusBadge = '';
            let detailLine = '';

            if (p.status === 'no-cost' || p.unitCost == null) {
                statusBadge = '<span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">No cost data</span>';
                detailLine = `Price: $${(p.sellingPrice || 0).toFixed(2)} · Add a cost in Cost of Goods to see margin`;
            } else if (p.status === 'outperform') {
                statusBadge = '<span class="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">★ Outperform</span>';
                detailLine = `Cost: $${p.unitCost.toFixed(2)} · Price: $${p.sellingPrice.toFixed(2)} · Margin: $${p.marginDollar.toFixed(2)} (${p.marginPercent.toFixed(1)}%)`;
            } else if (p.status === 'underperform') {
                statusBadge = '<span class="px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full">⚠ Under</span>';
                detailLine = `Cost: $${p.unitCost.toFixed(2)} · Price: $${p.sellingPrice.toFixed(2)} · Margin: $${p.marginDollar.toFixed(2)} (${p.marginPercent.toFixed(1)}%)`;
            } else {
                statusBadge = '<span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">Normal</span>';
                detailLine = `Cost: $${p.unitCost.toFixed(2)} · Price: $${p.sellingPrice.toFixed(2)} · Margin: $${p.marginDollar.toFixed(2)} (${p.marginPercent.toFixed(1)}%)`;
            }

            const card = document.createElement('div');
            card.className = 'bg-[#f8f4eb] border border-[#d4b78f] rounded-xl px-4 py-3';
            card.innerHTML = `
                <div class="flex justify-between items-start gap-3">
                    <div>
                        <p class="font-medium">${p.name}</p>
                        <p class="text-sm text-[#6B4423] mt-1">${detailLine}</p>
                    </div>
                    <div>${statusBadge}</div>
                </div>
            `;
            listContainer.appendChild(card);
        });
    }

    modal.classList.remove('hidden');
}

function hidePmProductsModal() {
    const modal = document.getElementById('pm-products-modal');
    if (modal) modal.classList.add('hidden');
}

// ================== LEGAL / FORMS PASSWORD PROTECTION ==================

const LEGAL_PASSWORD = 'legal2026';
const LEGAL_UNLOCK_KEY = 'legalFormsUnlockedUntil';

function isLegalFormsUnlocked() {
    const unlockedUntil = localStorage.getItem(LEGAL_UNLOCK_KEY);
    if (!unlockedUntil) return false;
    return Date.now() < parseInt(unlockedUntil, 10);
}

function unlockLegalForms() {
    // Unlock for 1 hour
    const unlockUntil = Date.now() + (60 * 60 * 1000);
    localStorage.setItem(LEGAL_UNLOCK_KEY, unlockUntil.toString());
}

async function loadAdminResaleCertificates() {
    const container = document.getElementById('resale-certs-admin-list');
    if (!container) return;

    container.innerHTML = '<p class="text-sm text-[#6B4423]">Loading…</p>';

    try {
        const { data, error } = await supabaseClient
            .from('customer_resale_certificates')
            .select(`
                id,
                certificate_number,
                expiration_date,
                file_name,
                file_path,
                uploaded_at,
                customers (
                    id,
                    name,
                    company,
                    email
                )
            `)
            .order('expiration_date', { ascending: true });

        if (error) throw error;

        window._adminResaleCerts = data || [];

        if (!data || data.length === 0) {
            container.innerHTML = '<p class="text-sm text-[#6B4423]">No resale certificates uploaded yet.</p>';
            return;
        }

        const rows = data.map(cert => {
            const cust = cert.customers || {};
            const company = cust.company || cust.name || '—';
            const email = cust.email || '—';
            const exp = cert.expiration_date ? new Date(cert.expiration_date).toLocaleDateString() : '—';
            const expired = cert.expiration_date && new Date(cert.expiration_date) < new Date();
            const uploaded = cert.uploaded_at ? new Date(cert.uploaded_at).toLocaleDateString() : '—';

            return `
                <tr class="border-b border-[#e8d9c2]">
                    <td class="py-3 pr-4">
                        <p class="font-semibold text-[#1E4D2B]">${company}</p>
                        <p class="text-xs text-[#6B4423]">${email}</p>
                    </td>
                    <td class="py-3 pr-4 font-mono text-sm">${cert.certificate_number || '—'}</td>
                    <td class="py-3 pr-4">
                        <span class="${expired ? 'text-red-600 font-semibold' : ''}">${exp}${expired ? ' (Expired)' : ''}</span>
                    </td>
                    <td class="py-3 pr-4 text-sm text-[#6B4423]">${uploaded}</td>
                    <td class="py-3">
                        <button onclick="downloadResaleCert('${cert.id}')"
                                class="px-3 py-1 text-xs border-2 border-[#6B4423] rounded-lg hover:bg-[#f8f4eb] font-semibold">
                            Download
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <table class="w-full text-sm">
                <thead>
                    <tr class="border-b-2 border-[#6B4423] text-left">
                        <th class="py-2 pr-4 font-semibold text-[#1E4D2B]">Customer</th>
                        <th class="py-2 pr-4 font-semibold text-[#1E4D2B]">Certificate #</th>
                        <th class="py-2 pr-4 font-semibold text-[#1E4D2B]">Expiration</th>
                        <th class="py-2 pr-4 font-semibold text-[#1E4D2B]">Uploaded</th>
                        <th class="py-2 font-semibold text-[#1E4D2B]">File</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    } catch (err) {
        console.error(err);
        container.innerHTML = `<p class="text-sm text-red-600">Could not load certificates.<br>${err.message || ''}</p>`;
    }
}

async function downloadResaleCert(certId) {
    const cert = (window._adminResaleCerts || []).find(c => String(c.id) === String(certId));
    if (!cert || !cert.file_path) {
        alert('File not found.');
        return;
    }

    try {
        const { data, error } = await supabaseClient.storage
            .from('resale-certificates')
            .createSignedUrl(cert.file_path, 60);

        if (error) throw error;
        if (!data?.signedUrl) throw new Error('No signed URL returned');

        window.open(data.signedUrl, '_blank');
    } catch (err) {
        console.error(err);
        alert('Could not download file.\n' + (err.message || ''));
    }
}

function exportResaleCertificatesCSV() {
    const rows = window._adminResaleCerts || [];
    if (!rows.length) {
        alert('No certificates to export.');
        return;
    }

    const header = ['Company', 'Name', 'Email', 'Certificate Number', 'Expiration', 'Status', 'Uploaded', 'File Name'];
    const lines = [header.join(',')];

    rows.forEach(cert => {
        const cust = cert.customers || {};
        const expired = cert.expiration_date && new Date(cert.expiration_date) < new Date();
        const line = [
            csvEscape(cust.company || ''),
            csvEscape(cust.name || ''),
            csvEscape(cust.email || ''),
            csvEscape(cert.certificate_number || ''),
            cert.expiration_date || '',
            expired ? 'Expired' : 'Active',
            cert.uploaded_at ? new Date(cert.uploaded_at).toISOString().slice(0, 10) : '',
            csvEscape(cert.file_name || '')
        ];
        lines.push(line.join(','));
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resale-certificates-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
}

function csvEscape(val) {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
}

function showLegalFormsSection() {
    if (isLegalFormsUnlocked()) {
        // Already unlocked — just show the section
        showSection('legal-forms');
        if (typeof loadAdminResaleCertificates === 'function') {
            loadAdminResaleCertificates();
        }
        if (typeof loadIngredients === 'function') {
            loadIngredients().then(() => {
                if (typeof renderIngredients === 'function') renderIngredients();
            });
        }
    } else {
        // Show password modal
        const input = document.getElementById('legal-password-input');
        const errorEl = document.getElementById('legal-password-error');
        if (input) input.value = '';
        if (errorEl) errorEl.classList.add('hidden');
        const modal = document.getElementById('legal-password-modal');
        if (modal) {
            modal.classList.remove('hidden');
            setTimeout(() => {
                if (input) input.focus();
            }, 100);
        }
    }
}

function hideLegalPasswordModal() {
    const modal = document.getElementById('legal-password-modal');
    if (modal) modal.classList.add('hidden');
}

function checkLegalPassword() {
    const input = document.getElementById('legal-password-input');
    const errorEl = document.getElementById('legal-password-error');

    if (input && input.value === LEGAL_PASSWORD) {
                unlockLegalForms();
        hideLegalPasswordModal();
        showSection('legal-forms');
        if (typeof loadIngredients === 'function') {
            loadIngredients().then(() => {
                if (typeof renderIngredients === 'function') renderIngredients();
            });
        }
    } else {
        if (errorEl) errorEl.classList.remove('hidden');
        if (input) {
            input.value = '';
            input.focus();
        }
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

// Update Pending Value on load
if (typeof updateDashboardPendingValue === 'function') {
    setTimeout(updateDashboardPendingValue, 400);
}

// Update Weekly Sales Matrix card on load
if (typeof updateDashboardSalesMatrix === 'function') {
    setTimeout(updateDashboardSalesMatrix, 400);
}

// Update Customer Approvals badge on load
if (typeof updateCustomerApprovalsBadge === 'function') {
    setTimeout(updateCustomerApprovalsBadge, 500);
}

// Also keep Price Proposals badge in sync
if (typeof updatePriceProposalsBadge === 'function') {
    setTimeout(updatePriceProposalsBadge, 500);
}

if (typeof loadUser === 'function') {
    loadUser();
}

// ================== COMPANY BASE PRICE SHEET ==================
let basePriceSheetEditMode = false;
let basePriceSheetShowDiscontinued = false;
let PRODUCT_CATALOG_ALL = []; // active + discontinued — Base Price Sheet only

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

async function discontinueSelectedProducts() {
    const ids = getBpsSelectedIds();
    if (!ids.length) {
        alert('Select at least one product.');
        return;
    }
    if (!confirm('Discontinue ' + ids.length + ' product(s)?\n\nThey will be hidden from wholesale and salesman catalogs.\nYou can show them again with “Show discontinued” and Reactivate later.')) {
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

async function applyRecommendedPriceToSalesmen(productName, recommendedPrice) {
    const { data, error } = await supabaseClient
        .from('salesman_price_sheets')
        .select('id, prices');
    if (error) throw error;
    if (!data || !data.length) return 0;

    let count = 0;
    for (const row of data) {
        const prices = row.prices && typeof row.prices === 'object' ? { ...row.prices } : {};
        prices[productName] = recommendedPrice;
        const { error: updErr } = await supabaseClient
            .from('salesman_price_sheets')
            .update({ prices: prices, updated_at: new Date().toISOString() })
            .eq('id', row.id);
        if (updErr) throw updErr;
        count += 1;
    }
    return count;
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

        const nameCount = updates.filter(u => u.nameChanged).length;
        const priceCount = updates.filter(u => u.priceChanged).length;
        alert(
            'Saved ' + updates.length + ' product(s).' +
            (nameCount ? '\nRenamed ' + nameCount + ' product(s) on salesman and customer sheets.' : '') +
            (priceCount ? '\nRecommended price written to salesman sheets.' : '')
        );
    } catch (err) {
        console.error('saveBasePriceSheetEdits error:', err);
        alert('Could not save.\n' + (err.message || ''));
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
        }
    }
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
                return `<option value="${email}">${name}${s.territory ? ' — ' + s.territory : ''}</option>`;
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
    } catch (err) {
        console.error('onBulkPercentSalesmanChange error:', err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-red-600">Could not load sheet.<br>${err.message || ''}</td></tr>`;
    }
}

function renderBulkPercentTable() {
    const tbody = document.getElementById('bulk-pct-tbody');
    if (!tbody || typeof PRODUCT_CATALOG === 'undefined') return;

    // Exclude market-price items; baseline = PRODUCT_CATALOG.unitPrice
    const products = PRODUCT_CATALOG.filter(p => !p.isMarketPrice && p.unitPrice != null);

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-[#6B4423]">No non-market products in catalog.</td></tr>';
        return;
    }

    tbody.innerHTML = products.map((p, i) => {
        const catalog = Number(p.unitPrice) || 0;
        const current = bulkPctCurrentPrices[p.name] != null
            ? Number(bulkPctCurrentPrices[p.name])
            : catalog;
        const delta = catalog > 0 ? ((current - catalog) / catalog * 100) : 0;
        const deltaText = (delta >= 0 ? '+' : '') + delta.toFixed(1) + '%';
        const deltaClass = Math.abs(delta) > 0.05
            ? (delta > 0 ? 'text-green-700' : 'text-red-700')
            : 'text-[#6B4423]';
        const alreadyAdjusted = Math.abs(current - catalog) > 0.001;
        const custCount = bulkPctCustomCustomerCounts[p.name] || 0;
        const safeName = p.name.replace(/"/g, '&quot;').replace(/'/g, "\\'");

        return `
            <tr class="border-t border-[#e8d9b8] ${i % 2 ? 'bg-[#f8f4eb]' : 'bg-white'}" data-product="${safeName}">
                <td class="p-2 text-center">
                    <input type="checkbox" class="bulk-pct-cb accent-[#1E4D2B]"
                           data-product="${safeName}"
                           onchange="updateBulkPercentSelectedCount(); previewBulkPercentAdjust();">
                </td>
                <td class="p-2">
                    <span class="font-medium">${p.name}</span>
                    ${alreadyAdjusted ? '<span class="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-800">adjusted</span>' : ''}
                    ${p.caseSize ? `<span class="block text-xs text-[#6B4423]">${p.caseSize}</span>` : ''}
                </td>
                <td class="p-2 text-right">$${catalog.toFixed(2)}</td>
                <td class="p-2 text-right font-semibold">$${current.toFixed(2)}</td>
                <td class="p-2 text-right ${deltaClass}">${deltaText}</td>
                <td class="p-2 text-right font-semibold bulk-pct-new-price">—</td>
                <td class="p-2 text-center">
                    ${custCount > 0
                        ? `<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-800" title="Customers with a custom price different from this sheet">${custCount}</span>`
                        : '<span class="text-[#6B4423]">—</span>'}
                </td>
            </tr>
        `;
    }).join('');

    updateBulkPercentSelectedCount();
}

function toggleBulkPercentSelectAll() {
    const master = document.getElementById('bulk-pct-select-all');
    const checked = master?.checked === true;
    document.querySelectorAll('.bulk-pct-cb').forEach(cb => {
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
    const confirmBtn = document.getElementById('bulk-pct-confirm-btn');
    if (confirmBtn) confirmBtn.disabled = checked === 0;
}

function previewBulkPercentAdjust() {
    const pct = parseFloat(document.getElementById('bulk-pct-value')?.value) || 0;
    const factor = 1 + (pct / 100);

    document.querySelectorAll('#bulk-pct-tbody tr[data-product]').forEach(row => {
        const product = row.getAttribute('data-product');
        const cb = row.querySelector('.bulk-pct-cb');
        const newCell = row.querySelector('.bulk-pct-new-price');
        if (!newCell) return;

        if (!cb || !cb.checked) {
            newCell.textContent = '—';
            newCell.classList.remove('text-green-700', 'text-red-700');
            return;
        }

        const catalogItem = (PRODUCT_CATALOG || []).find(p => p.name === product);
        const catalog = catalogItem ? Number(catalogItem.unitPrice) || 0 : 0;
        const current = bulkPctCurrentPrices[product] != null
            ? Number(bulkPctCurrentPrices[product])
            : catalog;

        // Apply % to the salesman’s current price (not catalog)
        const newPrice = Math.round(current * factor * 100) / 100;
        newCell.textContent = '$' + newPrice.toFixed(2);
        if (newPrice > current) newCell.classList.add('text-green-700');
        else if (newPrice < current) newCell.classList.add('text-red-700');
        else newCell.classList.remove('text-green-700', 'text-red-700');
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

    const checked = Array.from(document.querySelectorAll('.bulk-pct-cb:checked'));
    if (checked.length === 0) {
        alert('Select at least one product.');
        return;
    }

    const factor = 1 + (pct / 100);
    const updates = {};

    checked.forEach(cb => {
        const product = cb.getAttribute('data-product');
        if (!product) return;
        const catalogItem = (PRODUCT_CATALOG || []).find(p => p.name === product);
        const catalog = catalogItem ? Number(catalogItem.unitPrice) || 0 : 0;
        const current = bulkPctCurrentPrices[product] != null
            ? Number(bulkPctCurrentPrices[product])
            : catalog;
        const newPrice = Math.round(current * factor * 100) / 100;
        updates[product] = newPrice;
    });

    const productCount = Object.keys(updates).length;
    const direction = pct > 0 ? 'increase' : 'decrease';
    if (!confirm(
        `Apply ${pct > 0 ? '+' : ''}${pct}% ${direction} to ${productCount} product(s) on ${bulkPctSalesmanName}'s price sheet?\n\n` +
        `This writes only to salesman_price_sheets.\nCustomer price sheets are NOT changed.`
    )) return;

    const confirmBtn = document.getElementById('bulk-pct-confirm-btn');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Saving…';
    }

    try {
        // Merge with existing sheet
        const { data: existing } = await supabaseClient
            .from('salesman_price_sheets')
            .select('id, prices')
            .eq('salesman_email', bulkPctSalesmanEmail)
            .maybeSingle();

        const merged = { ...(existing?.prices || {}), ...updates };

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

        alert(`Done. ${productCount} product(s) updated on ${bulkPctSalesmanName}'s sheet.`);
        hideBulkPercentAdjustModal();
    } catch (err) {
        console.error('confirmBulkPercentAdjust error:', err);
        alert('Could not save changes.\n' + (err.message || ''));
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Apply to Salesman Sheet';
        }
    }
}
// ================== END BULK % ADJUSTMENTS ==================

// ================== END COMPANY BASE PRICE SHEET ==================

// ================== FINAL NOTE ==================
// All major systems have been included and updated.
// The file should now be in a working state with the new Customer Insights clickable cards.