// =====================================================
// INTERNAL-PORTAL.JS - Unified & Organized Version
// =====================================================

// ================== SUPABASE CLIENT ==================
var SUPABASE_URL = 'https://kyzfdlzqlckrpdkavxei.supabase.co';
const GOOGLE_MAPS_API_KEY = 'AIzaSyA3w15On3HstCQaS_XfKNXbO0I0ipHsQCg';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5emZkbHpxbGNrcnBka2F2eGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3ODU0NjEsImV4cCI6MjEwMDM2MTQ2MX0.Y1Sshp1-0lFwKakCgpJtAUpaHNB0PQ1vuo6SOHZcPu4';

var supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = supabaseClient;

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

async function revalidateAdminSession() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            localStorage.removeItem('currentUser');
            window.location.replace('login-portal.html');
            return false;
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
            return false;
        }
        return true;
    } catch (err) {
        localStorage.removeItem('currentUser');
        window.location.replace('login-portal.html');
        return false;
    }
}

window.addEventListener('pageshow', function () { revalidateAdminSession(); });
window.addEventListener('focus', function () { revalidateAdminSession(); });
document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') revalidateAdminSession();
});


// HARD SAFETY — ship/deny emails stay off (QuickBooks). Function kept but unused.
var EMAILS_ENABLED = false;

// Pro forma notify lives in js/internal/orders.js


// ================== GLOBAL VARIABLES ==================
var currentMatrixStartDate = null;
var currentMatrixMetric = 'units';
var currentMatrixView = 'table';          // 'table' | 'trends'
var currentTrendsMode = 'multi';          // 'multi' | 'mtd' (mtd later)
var currentTrendsMetric = 'units';        // 'units' | 'sales'
var trendsChartInstance = null;
let currentInsightsFilter = 'all';
var allCustomers = [];
var allOrders = [];
var currentFilter = 'all';
let allBackOrders = [];
let currentOrdersView = 'all'; // 'all' | 'back'
var approvePendingBackOrders = []; // queued during Approve modal
var shipPendingBackOrders = [];    // queued during Ship modal
var salesmen = [];
const DATA_TTL_MS = 45000; // 45 seconds
var ordersLoadedAt = 0;
var customersLoadedAt = 0;
var inquiriesLoadedAt = 0;
let vendorsLoadedAt = 0;
var inventoryLoadedAt = 0;

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
            username: 'jackerman@donegalnatural.com',
            fullName: 'Jonathan (Sales View)',
            name: 'Jonathan (Sales View)',
            role: 'salesman',
            email: 'jackerman@donegalnatural.com',
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

async function goToOperateAsSalesman(displayName, fallbackEmail) {
    try {
        const original = JSON.parse(localStorage.getItem('currentUser') || 'null');
        const adminEmail = String((original && (original.email || original.username)) || '').toLowerCase().trim();
        if (adminEmail !== 'jackerman@donegalnatural.com') {
            alert('Only Jonathan can operate as a salesman.');
            return;
        }
        if ((!salesmen || !salesmen.length) && typeof loadSalesmen === 'function') {
            await loadSalesmen();
        }
        const hintName = String(displayName || '').toLowerCase();
        const hintEmail = String(fallbackEmail || '').toLowerCase().trim();
        const seat = (salesmen || []).find(function (s) {
            const name = String(s.name || [s.firstName, s.lastName].filter(Boolean).join(' ') || '').toLowerCase();
            const email = String(s.email || '').toLowerCase().trim();
            return (hintName && name.indexOf(hintName) !== -1) || (hintEmail && email === hintEmail);
        });
        const seatEmail = String((seat && seat.email) || fallbackEmail || '').toLowerCase().trim();
        const seatLabel = (seat && (seat.name || [seat.firstName, seat.lastName].filter(Boolean).join(' '))) || displayName;
        if (!seatEmail) {
            alert('Could not find a salesman seat for ' + displayName + '. Add them in Salesmen first.');
            return;
        }
        if (original) {
            localStorage.setItem('originalAdminUser', JSON.stringify(original));
        }
        localStorage.setItem('viewAsSalesmanEmail', seatEmail);
        localStorage.setItem('viewAsSalesmanName', seatLabel);
        localStorage.setItem('currentUser', JSON.stringify({
            id: original && original.id ? original.id : null,
            username: seatEmail,
            fullName: 'Jonathan (Operating as ' + seatLabel + ')',
            name: 'Jonathan (Operating as ' + seatLabel + ')',
            role: 'salesman',
            email: seatEmail,
            viewAsSalesmanEmail: seatEmail,
            viewAsSalesmanName: seatLabel,
            mustChangePassword: false,
            loginTime: new Date().toISOString(),
            supabase: true,
            isViewAs: true
        }));
    } catch (e) {
        console.error('goToOperateAsSalesman error:', e);
        alert('Could not open that salesman view.');
        return;
    }
    window.location.href = 'salesman-portal.html';
}

function goToBrianSalesmanView() {
    goToOperateAsSalesman('Brian', 'donegaldogtreats@gmail.com');
}

function goToMarshallSalesmanView() {
    goToOperateAsSalesman('Marshall', 'marshallg@comcast.net');
}

function goToCustomerView() {
    try {
        const original = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (original) {
            localStorage.setItem('originalAdminUser', JSON.stringify(original));
        }

        localStorage.setItem('currentUser', JSON.stringify({
            id: original?.id || null,
            username: 'jackerman@donegalnatural.com',
            fullName: 'Jonathan (Customer View)',
            name: 'Jonathan (Customer View)',
            role: 'customer',
            email: 'jackerman@donegalnatural.com',
            company: 'Donegal Admin Test Store',
            mustChangePassword: false,
            loginTime: new Date().toISOString(),
            supabase: true,
            isViewAs: true
        }));
    } catch (e) {
        console.error('goToCustomerView error:', e);
    }
    window.location.href = 'wholesale-portal.html';
}


// ================== SHARED HELPER FUNCTIONS ==================
// Functions used by more than one section will be placed here.
// (We will move shared helpers into this section as we reorganize.)

function filterCustomerInsights(filterType) {
    currentInsightsFilter = filterType;
    refreshCustomerInsights();
}

function toggleCustomerInsights() {
    const body = document.getElementById('customer-insights-body');
    const btn = document.getElementById('customer-insights-toggle');
    if (!body) return;
    const opening = body.classList.contains('hidden');
    body.classList.toggle('hidden', !opening);
    if (btn) {
        btn.innerHTML = opening
            ? '<i class="fas fa-chevron-up mr-2"></i> Collapse'
            : '<i class="fas fa-chevron-down mr-2"></i> Expand';
    }
    if (opening && typeof refreshCustomerInsights === 'function') {
        refreshCustomerInsights();
    }
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
                    <p class="font-semibold brand-green">${escapeHtml(r.name || '—')}</p>
                    <p class="text-xs text-[#6B4423]">${escapeHtml(r.company || '')}</p>
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
            if (typeof loadMailingListExtras === 'function') await loadMailingListExtras();
            if (typeof loadOpenQuotes === 'function') loadOpenQuotes();
            if (typeof loadAdminActivityLog === 'function') loadAdminActivityLog();
            if (typeof renderProductPhotoGallery === 'function' && typeof _photoGalleryFamilyKey !== 'undefined' && _photoGalleryFamilyKey) {
                renderProductPhotoGallery();
            }
            if (typeof loadInquiries === 'function') {
                loadInquiries().then(function () {
                    if (typeof onMassEmailAudienceChange === 'function') onMassEmailAudienceChange();
                });
            } else if (typeof onMassEmailAudienceChange === 'function') {
                onMassEmailAudienceChange();
            }
            else if (typeof updateMassEmailRecipientCount === 'function') updateMassEmailRecipientCount();
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
            if (typeof updateEstimatedSpendCard === 'function') updateEstimatedSpendCard();
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
    if (typeof updateEstimatedSpendCard === 'function') updateEstimatedSpendCard();
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
        if (typeof isTestStoreOrder === 'function' && isTestStoreOrder(order)) return;
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

// hideSalesmanModal lives in js/internal/salesmen.js (the version that saves notes).


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
                headers: await getEdgeFunctionHeaders(),
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

async function resetSalesmanPassword() {
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
    const fullName = salesman.name
        || [salesman.firstName, salesman.lastName].filter(Boolean).join(' ')
        || email;
    const territory = salesman.territory || '';

    if (!email || !email.includes('@')) {
        alert('This salesman has no email on file. Cannot reset the password.');
        return;
    }
    if (email === 'jackerman@donegalnatural.com') {
        alert('This login is also the admin account. Reset it from Forgot password on the login page instead.');
        return;
    }

    if (!confirm(
        'Reset login password for ' + displayName + ' (' + email + ')?\n\n' +
        'This emails a new temporary password from noreply@ and forces a password change on next login.\n' +
        'Their current password will stop working immediately.'
    )) {
        return;
    }

    const btn = document.getElementById('modal-reset-password-btn');
    if (btn && btn.dataset.busy === '1') return;
    if (btn) {
        btn.dataset.busy = '1';
        btn.disabled = true;
    }

    try {
        const fnUrl = SUPABASE_URL + '/functions/v1/create-salesman-user';
        const fnRes = await fetch(fnUrl, {
            method: 'POST',
            headers: await getEdgeFunctionHeaders(),
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

        const emailOk = fnData && fnData.email_sent === true;
        const emailFailReason = (fnData && fnData.email_error) ? String(fnData.email_error) : '';
        const returnedTemp = (fnData && fnData.temp_password) ? String(fnData.temp_password) : '';

        alert(
            'Password reset for ' + displayName + '.\n' +
            'Login: ' + email + '\n\n' +
            (emailOk
                ? 'Credentials email was sent from noreply@.\nThey must change the password on first login.'
                : ('Credentials email was NOT sent.\n' +
                   (emailFailReason ? ('Reason: ' + emailFailReason + '\n') : '') +
                   (returnedTemp
                       ? ('Temporary password (give to salesman):\n' + returnedTemp)
                       : 'Please check the Edge Function logs.')))
        );
    } catch (err) {
        console.error('resetSalesmanPassword error:', err);
        alert('Could not reset salesman password.\n\n' + (err.message || String(err)));
    } finally {
        if (btn) {
            btn.dataset.busy = '0';
            btn.disabled = false;
        }
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

function printOrderInvoice() {
    const modal = document.getElementById('order-invoice-modal');
    if (!modal || modal.classList.contains('hidden')) {
        alert('Open an invoice first.');
        return;
    }
    window.print();
}

function invoiceDownloadFilename() {
    const raw = (document.getElementById('inv-number') && document.getElementById('inv-number').textContent) || 'invoice';
    const safe = String(raw).trim().replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    return (safe || 'invoice') + '.pdf';
}

async function downloadOrderInvoice() {
    const modal = document.getElementById('order-invoice-modal');
    const sheet = document.getElementById('order-invoice-sheet');
    if (!modal || modal.classList.contains('hidden') || !sheet) {
        alert('Open an invoice first.');
        return;
    }
    const jsPdfCtor = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : window.jsPDF;
    if (typeof html2canvas !== 'function' || !jsPdfCtor) {
        alert('PDF library not loaded. Hard-refresh and try again.');
        return;
    }
    const btn = document.getElementById('inv-download-btn');
    if (btn && btn.getAttribute('data-busy') === '1') return;
    const prevLabel = btn ? btn.textContent : 'Download';
    if (btn) {
        btn.setAttribute('data-busy', '1');
        btn.disabled = true;
        btn.textContent = 'Downloading…';
    }

    const hidden = [];
    sheet.querySelectorAll('.invoice-no-print').forEach(function (el) {
        hidden.push({ el: el, display: el.style.display });
        el.style.display = 'none';
    });
    const prevMax = sheet.style.maxHeight;
    const prevOverflow = sheet.style.overflow;
    sheet.style.maxHeight = 'none';
    sheet.style.overflow = 'visible';

    try {
        const canvas = await html2canvas(sheet, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const doc = new jsPdfCtor({ unit: 'pt', format: 'letter', compress: true });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 28;
        const imgWidth = pageWidth - (margin * 2);
        const imgHeight = canvas.height * (imgWidth / canvas.width);
        const pageDrawHeight = pageHeight - (margin * 2);
        let heightLeft = imgHeight;
        let position = margin;
        doc.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
        heightLeft -= pageDrawHeight;
        while (heightLeft > 0) {
            position = heightLeft - imgHeight + margin;
            doc.addPage();
            doc.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
            heightLeft -= pageDrawHeight;
        }
        doc.save(invoiceDownloadFilename());
    } catch (err) {
        console.error('downloadOrderInvoice', err);
        alert('Could not download the invoice. Try Print and choose Save as PDF.');
    } finally {
        hidden.forEach(function (item) { item.el.style.display = item.display; });
        sheet.style.maxHeight = prevMax;
        sheet.style.overflow = prevOverflow;
        if (btn) {
            btn.removeAttribute('data-busy');
            btn.disabled = false;
            btn.textContent = prevLabel || 'Download';
        }
    }
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
    const customerId = order.customerId || order.customer_id || '';
    const customer = (allCustomers || []).find(c => customerId && String(c.id) === String(customerId))
        || (allCustomers || []).find(c => {
            const cEmail = (c.email || '').trim().toLowerCase();
            const cName = (c.name || '').trim().toLowerCase();
            if (customerEmail && cEmail && customerEmail === cEmail) return true;
            if (customerName && cName && cName === customerName) return true;
            return false;
        }) || null;

    // Invoice number + date
    const invNum = document.getElementById('inv-number');
    if (invNum) invNum.textContent = String(displayInvoiceNumber(order));
    if (typeof markInvoiceUpdatedState === 'function') markInvoiceUpdatedState(order);

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
            const safeText = escapeHtml(trackNum);
            const safeCarrier = escapeHtml(order.carrier || 'UPS');
            trackBadge.innerHTML = `
                <span class="text-[#6B4423]">${safeCarrier} Tracking:</span>
                <a href="https://www.ups.com/track?tracknum=${encodeURIComponent(trackNum)}"
                   target="_blank" rel="noopener"
                   class="ml-1 font-mono font-semibold text-[#1E4D2B] underline hover:text-[#254a2f]">
                    ${safeText}
                </a>`;
        } else {
            trackBadge.innerHTML = '';
        }
    }

    // BILL TO
    const billEl = document.getElementById('inv-bill-to');
    if (billEl) {
        const lines = [];
        const billName = String(order.customer || order.customer_name || '').trim();
        const billCo = String(order.customerCompany || order.customer_company || (customer && customer.company) || '').trim();
        if (billName) lines.push(billName);
        if (billCo && billCo.toLowerCase() !== billName.toLowerCase()) lines.push(billCo);
        const billPhone = (customer && customer.phone) || order.customerPhone || order.customer_phone || '';
        if (billPhone) {
            lines.push(typeof formatPhoneDisplay === 'function' ? formatPhoneDisplay(billPhone) : billPhone);
        } else if (order.customerEmail || order.customer_email) {
            lines.push(order.customerEmail || order.customer_email);
        }
        const billing = (customer && (customer.billingAddress || customer.billing_address))
            || (customer && (customer.shippingAddress || customer.shipping_address))
            || '';
        if (billing) lines.push(billing);
        billEl.innerHTML = lines.length
            ? lines.map(l => `<p>${escapeHtml(l)}</p>`).join('')
            : '—';
    }

    // SHIP TO
    const shipEl = document.getElementById('inv-ship-to');
    if (shipEl) {
        const lines = [];
        const shipName = String(order.customer || order.customer_name || '').trim();
        const shipCo = String(order.customerCompany || order.customer_company || (customer && customer.company) || '').trim();
        if (shipName) lines.push(shipName);
        if (shipCo && shipCo.toLowerCase() !== shipName.toLowerCase()) lines.push(shipCo);
        const shipping = (customer && (customer.shippingAddress || customer.shipping_address))
            || (customer && (customer.billingAddress || customer.billing_address))
            || '';
        if (shipping) lines.push(shipping);
        shipEl.innerHTML = lines.length
            ? lines.map(l => `<p>${escapeHtml(l)}</p>`).join('')
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

                const desc = escapeHtml([
                    orderLineDisplayName(item),
                    item.caseSize ? `· ${item.caseSize}` : ''
                ].filter(Boolean).join(' '));

                const unitText = hasPrice
                    ? ('$' + unit.toFixed(2))
                    : (item.isMarketPrice ? 'Market' : '—');
                const marketNote = item.isMarketPrice
                    ? '<div class="text-[11px] text-[#c56134] mt-1">Market price. Final invoice may be adjusted to current market cost at shipment.</div>'
                    : '';
                const totalText = hasPrice
                    ? ('$' + lineTotal.toFixed(2))
                    : '—';

                return `
                    <tr class="border-t border-[#d4b78f]">
                        <td class="p-3 text-left font-semibold">${qty}</td>
                        <td class="p-3 text-left">${desc}${marketNote}</td>
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
                    escapeHtml(b.product_name || '—'),
                    b.case_size ? `· ${escapeHtml(b.case_size)}` : '',
                    '<span class="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-green-100 text-green-800">BO Fulfilled</span>'
                ].filter(Boolean).join(' ');

                const unitText = hasPrice ? ('$' + unit.toFixed(2)) : escapeHtml(b.display_price || '—');
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

    const editBtn = document.getElementById('inv-edit-order-btn');
    if (editBtn) {
        const st = String(order.status || 'submitted').toLowerCase();
        const canEdit = st === 'submitted' || st === 'pending' || st === '' || st === 'received' || st === 'processing';
        if (canEdit) {
            editBtn.classList.remove('hidden');
            editBtn.setAttribute('data-order-id', String(order.id));
        } else {
            editBtn.classList.add('hidden');
            editBtn.removeAttribute('data-order-id');
        }
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
.select('id, first_name, last_name, email, territory, commission, market_commission, price_sheet_status, yearly_sales, monthly_sales, active, notes, mailing_address, assigned_products, last_login_at')
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
            assigned_products: Array.isArray(s.assigned_products) ? s.assigned_products : [],
            lastLoginAt: s.last_login_at || null,
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
                        <h3 class="text-xl font-bold brand-green truncate">${escapeHtml(s.name || [s.firstName, s.lastName].filter(Boolean).join(' ') || 'Unnamed')}</h3>
                        <p class="text-sm text-[#6B4423]">Territory: <strong>${escapeHtml(s.territory || '—')}</strong></p>
                        ${(s.email || '').toLowerCase().trim() === 'jackerman@donegalnatural.com'
                            ? ''
                            : `<p class="text-xs text-[#6B4423] mt-1">Last login: ${
                                s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleString() : 'Never'
                            }</p>`}
                    </div>
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
var PRODUCT_CATALOG = [
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
    { name: "8oz. Bags of USA Elky Training Treats", category: "Jerky", subCategory: "Training Treats", caseSize: "50/cs", unitPrice: 6.65, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "September 2026" },
    { name: "10oz. Bags of USA Elky Training Treats", category: "Jerky", subCategory: "Training Treats", caseSize: "35/cs", unitPrice: 7.91, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12oz. Bags of USA Elky Training Treats", category: "Jerky", subCategory: "Training Treats", caseSize: "35/cs", unitPrice: 9.90, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "September 2026" },


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
    window.location.replace("login-portal.html");
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

// Weekly matrix, trends, and sales summary live in js/internal/reports.js

// Salesman detail and price-sheet editor live in js/internal/salesmen.js

// Price-sheet drill-down is in js/internal/reports.js. Salesman edit and build-price-sheet tools are in js/internal/salesmen.js.

// ================== PRICE CHANGE PROPOSALS (FROM SALESMEN) ==================

async function getPendingPriceProposals() {
    try {
        const { data, error } = await supabaseClient
            .from('price_proposals')
            .select('*')
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
            submittedAt: p.submitted_at,
            decidedAt: p.decided_at || data.decided_at || null
        }));
    } catch (err) {
        console.error(err);
        return [];
    }
}

async function updatePriceProposalsBadge() {
    const badge = document.getElementById("price-proposals-badge");
    const homeBadge = document.getElementById("dash-home-badge");
    const pending = await getPendingPriceProposals();
    const pendingOnly = pending.filter(function (p) {
        return String(p.status || '').toLowerCase() === 'pending';
    });
    const initialCount = pendingOnly.filter(function (p) {
        return p.type === 'initialPriceSheet';
    }).length;

    if (badge) {
        if (pendingOnly.length > 0) {
            badge.textContent = pendingOnly.length;
            badge.classList.remove("hidden");
        } else {
            badge.classList.add("hidden");
        }
    }
    if (homeBadge) {
        if (initialCount > 0) {
            homeBadge.textContent = initialCount;
            homeBadge.classList.remove("hidden");
            homeBadge.title = initialCount + ' initial pricing sheet' + (initialCount === 1 ? '' : 's') + ' submitted';
        } else {
            homeBadge.classList.add("hidden");
        }
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

    const rows = await getPendingPriceProposals();
    if (!rows.length) {
        list.innerHTML = '<p class="text-[#6B4423] text-center py-8">No price proposals yet.</p>';
        return;
    }

    const order = ['Pending', 'Approved', 'Denied'];
    function badgeClass(status) {
        const s = String(status || '').toLowerCase();
        if (s === 'approved') return 'bg-green-100 text-green-800';
        if (s === 'denied') return 'bg-red-100 text-red-800';
        return 'bg-orange-100 text-orange-700';
    }

    list.innerHTML = order.map(function (status) {
        const group = rows.filter(function (p) {
            return String(p.status || '') === status;
        });
        if (!group.length) return '';
        return '<p class="text-xs font-bold uppercase tracking-wide text-[#6B4423] mt-4 mb-2">' + status + '</p>' +
            group.map(function (p) {
                const date = new Date(p.submittedAt).toLocaleDateString();
                const decided = p.decidedAt
                    ? new Date(p.decidedAt).toLocaleString()
                    : '';
                const itemCount = (p.items || []).length;
                const typeLabel = p.type === 'initialPriceSheet'
                    ? 'Initial Pricing Sheet'
                    : (p.type === 'customerPricing' ? 'Customer Pricing'
                        : (p.type === 'newProduct' ? 'New Product' : 'Price Change'));
                return '<div class="border-2 border-[#6B4423] rounded-2xl p-4 mb-3 cursor-pointer hover:bg-[#f8f4eb] transition" onclick="showProposalDetail(\'' + p.id + '\')">' +
                    '<div class="flex justify-between items-center"><div>' +
                    '<p class="font-bold brand-green">' + escapeHtml(p.salesmanName || 'Salesman') + '</p>' +
                    '<p class="text-sm text-[#6B4423]">' + typeLabel + ' · submitted ' + date + ' · ' + itemCount + ' product(s)' +
                    (decided ? (' · ' + String(p.status || '').toLowerCase() + ' ' + decided) : '') + '</p>' +
                    '</div><span class="px-3 py-1 text-xs font-semibold rounded-full ' + badgeClass(p.status) + '">' +
                    escapeHtml(p.status || '') + '</span></div></div>';
            }).join('');
    }).join('');
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
            submittedAt: data.submitted_at,
            decidedAt: data.decided_at || null
        };

        // Cache for toggle filter
        window._currentProposalDetail = p;

        if (p.salesmanEmail && Array.isArray(p.items) && typeof supabaseClient !== 'undefined') {
            try {
                const { data: liveSheet } = await supabaseClient
                    .from('salesman_price_sheets')
                    .select('prices')
                    .eq('salesman_email', String(p.salesmanEmail).toLowerCase().trim())
                    .maybeSingle();
                const live = (liveSheet && liveSheet.prices) || {};
                function norm(s) {
                    return String(s || '').toLowerCase().replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
                }
                p.items = p.items.map(function (item) {
                    const want = norm(item.product);
                    const hit = Object.keys(live).find(function (k) { return norm(k) === want; });
                    if (hit == null) return item;
                    const sheetPrice = Number(live[hit]);
                    if (isNaN(sheetPrice)) return item;
                    return Object.assign({}, item, {
                        currentPrice: sheetPrice,
                        catalogPrice: sheetPrice
                    });
                });
                window._currentProposalDetail = p;
            } catch (err) {
                console.warn('live salesman sheet compare:', err);
            }
        }

        const date = new Date(p.submittedAt).toLocaleDateString() +
            (p.decidedAt ? (' · ' + String(p.status || '') + ' ' + new Date(p.decidedAt).toLocaleString()) : '');
        const typeLabel = p.type === 'initialPriceSheet'
            ? 'Initial Pricing Sheet'
            : (p.type === 'customerPricing' ? 'Customer Pricing'
                : (p.type === 'newProduct' ? 'New Product' : 'Price Change'));

        const startOnChanges = p.type === 'initialPriceSheet'
            || p.type === 'priceChange'
            || p.type === 'customerPricing';
        list.innerHTML = renderProposalDetailHtml(p, date, typeLabel, startOnChanges);
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
    const changedLines = [];

    const itemRows = items.map(item => {
        const proposed = Number(item.proposedPrice);

        // Customer Pricing → compare to salesman basePrice
        // Other types → compare to catalogPrice
        const refPrice = isCustomerPricing
            ? (item.basePrice != null ? Number(item.basePrice) : null)
            : (item.currentPrice != null ? Number(item.currentPrice)
                : (item.catalogPrice != null ? Number(item.catalogPrice) : null));
        const hasRef = refPrice != null && !isNaN(refPrice);
        const isChanged = hasRef && !isNaN(proposed) && Math.abs(proposed - refPrice) > 0.0001;
        const below = isCustomerPricing
            ? (hasRef && !isNaN(proposed) && proposed < refPrice)
            : (item.belowCatalog || (hasRef && !isNaN(proposed) && proposed < refPrice));
        const over5 = item.outside5 === true ||
            (hasRef && refPrice > 0 && !isNaN(proposed) &&
                Math.abs(proposed - refPrice) / refPrice > 0.05);

        if (isChanged) {
            changedCount++;
            const pct = (hasRef && refPrice > 0 && !isNaN(proposed))
                ? ((proposed - refPrice) / refPrice) * 100
                : null;
            changedLines.push({
                product: item.product || "—",
                ref: hasRef ? refPrice : null,
                proposed: isNaN(proposed) ? null : proposed,
                pct: pct,
                over5: !!over5
            });
        }
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

        const refLabel = isCustomerPricing ? "Base" : "Sheet";
        const changeLabel = isChanged
            ? (over5
                ? ` <span class="text-red-700 text-xs font-bold">(±5% from ${refLabel.toLowerCase()})</span>`
                : (below
                    ? ` <span class="text-orange-700 text-xs font-semibold">(below ${refLabel.toLowerCase()})</span>`
                    : ' <span class="text-[#1E4D2B] text-xs font-semibold">(changed)</span>'))
            : ` <span class="text-[#6B4423] text-xs">(same as ${refLabel.toLowerCase()})</span>`;

        return `
            <div class="rounded-xl p-3 mb-2 ${rowClass}">
                <p class="font-semibold brand-green">${escapeHtml(item.product || "—")}</p>
                <p class="text-sm text-[#6B4423] mt-1">
                    ${refLabel}: <strong>${hasRef ? "$" + refPrice.toFixed(2) : "—"}</strong>
                    → Proposed: <strong class="${over5 ? "text-red-700" : (below ? "text-orange-700" : "text-[#c56134]")}">$${isNaN(proposed) ? "—" : proposed.toFixed(2)}</strong>
                    ${pctBadge}
                    ${changeLabel}
                </p>
            </div>
        `;
    }).join("");

    const refWord = isCustomerPricing ? "base sheet" : "the salesman's price sheet";

    const noticeClass = changedCount === 0
        ? "border-green-700 bg-green-50"
        : (over5Count > 0 ? "border-red-500 bg-red-50" : "border-amber-500 bg-amber-50");
    const noticeTitleClass = changedCount === 0
        ? "text-green-800"
        : (over5Count > 0 ? "text-red-800" : "text-amber-900");
    const noticeTitle = changedCount === 0
        ? "No edits on this sheet"
        : "This sheet has edits — review before approving";
    const noticeBody = changedCount === 0
        ? ("Every listed price matches " + refWord + ".")
        : (changedCount + " price" + (changedCount === 1 ? "" : "s") + " differ from " + refWord
            + (over5Count > 0 ? (" · " + over5Count + " outside ±5%") : "") + ".");
    const noticeList = changedLines.slice(0, 12).map(row => {
        const name = (typeof escapeHtml === "function") ? escapeHtml(row.product) : row.product;
        const from = row.ref != null ? "$" + Number(row.ref).toFixed(2) : "—";
        const to = "$" + Number(row.proposed).toFixed(2);
        const pct = row.pct != null ? ((row.pct >= 0 ? "+" : "") + row.pct.toFixed(1) + "%") : "";
        return "<li class=\"" + (row.over5 ? "text-red-800 font-semibold" : "") + "\">" + name + ": " + from + " → " + to + (pct ? " (" + pct + ")" : "") + "</li>";
    }).join("");
    const noticeMore = changedLines.length > 12
        ? "<p class=\"text-xs mt-1\">…and " + (changedLines.length - 12) + " more. Use Show changes only below.</p>"
        : "";

    return `
        <button type="button" onclick="showPriceProposalsPanel()"
                class="mb-3 text-sm text-[#6B4423] hover:underline">
            ← Back to list
        </button>

        <div class="border-2 border-[#6B4423] rounded-2xl p-4">
            <div class="sticky top-0 z-10 bg-white pb-3 mb-3 border-b border-[#d4b78f]">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <p class="font-bold text-lg brand-green">${escapeHtml(p.salesmanName || "Salesman")}</p>
                        <p class="text-sm text-[#6B4423]">${typeLabel} · ${date} · ${items.length} product(s)</p>
                    </div>
                    <span class="px-3 py-1 text-xs font-semibold rounded-full ${
                String(p.status || '').toLowerCase() === 'approved' ? 'bg-green-100 text-green-800' :
                String(p.status || '').toLowerCase() === 'denied' ? 'bg-red-100 text-red-800' :
                'bg-orange-100 text-orange-700'
            }">${escapeHtml(p.status || 'Pending')}</span>
                </div>

                <div class="rounded-xl border-2 ${noticeClass} px-4 py-3 mb-3">
                    <p class="font-bold ${noticeTitleClass}">${noticeTitle}</p>
                    <p class="text-sm ${noticeTitleClass} mt-1">${noticeBody}</p>
                    ${changedCount > 0 ? `<ul class="mt-2 text-sm space-y-0.5 max-h-28 overflow-y-auto">${noticeList}</ul>${noticeMore}` : ""}
                </div>

                ${String(p.status || '').toLowerCase() === 'pending' ? `
                <div class="flex gap-3">
                    <button type="button"
                            onclick="approvePriceProposal('${p.id}')"
                            class="flex-1 px-4 py-3 bg-green-700 text-white font-semibold rounded-xl">
                        Approve sheet
                    </button>
                    <button type="button"
                            onclick="denyPriceProposal('${p.id}')"
                            class="flex-1 px-4 py-3 bg-red-700 text-white font-semibold rounded-xl">
                        Deny
                    </button>
                </div>
                ` : ''}
            </div>

            ${p.overallNotes ? `<p class="text-sm text-[#6B4423] mb-3"><strong>Notes:</strong> ${escapeHtml(p.overallNotes)}</p>` : ""}

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

            <div class="max-h-72 overflow-y-auto">
                ${itemRows || "<p class='text-sm text-[#6B4423]'>No items</p>"}
                ${changesOnly && changedCount === 0 ? `<p class='text-sm text-[#6B4423]'>No price changes — every selected item matches ${refWord}.</p>` : ""}
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
                        <p class="font-bold text-lg brand-green">${escapeHtml(c.name)}</p>
                        <p class="text-sm text-[#6B4423]">${escapeHtml(c.company || "")}</p>
                        <p class="text-xs text-[#6B4423] mt-1">
                            Submitted by ${escapeHtml(c.submitted_by || "Salesman")} · ${date}
                        </p>
                    </div>
                    <span class="px-3 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">
                        Pending
                    </span>
                </div>

                <div class="text-sm text-[#6B4423] space-y-1 mb-4">
                    ${c.email ? `<p><strong>Email:</strong> ${escapeHtml(c.email)}</p>` : ""}
                    ${c.phone ? `<p><strong>Phone:</strong> ${escapeHtml(typeof formatPhoneDisplay === 'function' ? formatPhoneDisplay(c.phone) : c.phone)}</p>` : ""}
                    ${c.shipping_address ? `<p><strong>Shipping:</strong> ${escapeHtml(c.shipping_address)}</p>` : ""}
                    ${c.billing_address ? `<p><strong>Billing:</strong> ${escapeHtml(c.billing_address)}</p>` : ""}
                    ${c.notes ? `<p><strong>Notes:</strong> ${escapeHtml(c.notes)}</p>` : ""}
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
            const pricedCustomer = (allCustomers || []).find(function (c) {
                return String(c.id) === String(customerId);
            });
            if (pricedCustomer && !pricedCustomer.pricingApprovedAt) {
                await notifyCustomerPricingReady(pricedCustomer);
            }

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

// Wholesale inquiries live in js/internal/inquiries.js

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
    } else if (target === 'financials-commission') {
        showSection('financials');
        setTimeout(() => showFinancialsSub('commission'), 200);
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
    } else if (target === 'price-sheet') {
        if (typeof openBasePriceSheetModal === 'function') openBasePriceSheetModal();
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
    if (typeof loadCustomers === 'function') loads.push(loadCustomers());
    if (typeof loadVendors === 'function') loads.push(loadVendors());
    try {
        await Promise.all(loads);
    } catch (err) {
        console.warn('Dashboard parallel load warning:', err);
    }
    // Pure UI updates from in-memory data (after loads settle)
    if (typeof updateDashboardSales === 'function') updateDashboardSales();
    if (typeof updateDashboardOrders === 'function') updateDashboardOrders();
    if (typeof updateEstimatedSpendCard === 'function') updateEstimatedSpendCard();
    if (typeof updateDashboardPendingCount === 'function') updateDashboardPendingCount();
    if (typeof updateDashboardLowStock === 'function') updateDashboardLowStock();
    if (typeof updatePendingPOIndicators === 'function') updatePendingPOIndicators();
    if (typeof updateDashboardVendors === 'function') updateDashboardVendors();
    if (typeof updateDashboardSalesmen === 'function') updateDashboardSalesmen();
    if (typeof updateDashboardProfitMargin === 'function') updateDashboardProfitMargin();
    if (typeof updateDashboardSalesMatrix === 'function') updateDashboardSalesMatrix();
    if (typeof updateDashboardAchCounts === 'function') updateDashboardAchCounts();
    if (typeof updateInquiryStats === 'function') updateInquiryStats();
    if (typeof checkOosDueAlerts === 'function') checkOosDueAlerts();
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

// Framework stub only — future auto-create when inventory would go negative
// function maybeAutoCreateBackOrderFromInventory(productName, requestedQty) { ... }

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

async function updateDashboardSalesmen() {
    try {
        const { data, error } = await supabaseClient
                        .from('salesmen')
.select('id, first_name, last_name, email, territory, commission, market_commission, price_sheet_status, yearly_sales, monthly_sales, active, notes, mailing_address, assigned_products, last_login_at')
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
                assigned_products: Array.isArray(s.assigned_products) ? s.assigned_products : [],
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
        if (typeof isTestStoreOrder === 'function' && isTestStoreOrder(order)) return;
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
            <span class="font-medium truncate pr-2">${i + 1}. ${escapeHtml(s.name)}</span>
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

let mailingListExtras = [];

function isBlockedMassEmailAddress(email) {
    const e = String(email || '').toLowerCase().trim();
    if (!e || e.indexOf('@') === -1) return true;
    if (e === 'jackerman@donegalnatural.com') return true;
    if (e === 'support@donegalnatural.com') return true;
    if (e === 'orders@donegalnatural.com') return true;
    if (e === 'inquiry@donegalnatural.com') return true;
    if (e === 'billing@donegalnatural.com') return true;
    if (e === 'info@donegalnatural.com') return true;
    if (e === 'noreply@donegalnatural.com') return true;
    return false;
}

function shouldSkipMassEmailStore(customer) {
    const email = String((customer && customer.email) || '').toLowerCase().trim();
    const company = String((customer && customer.company) || '').toLowerCase();
    const name = String((customer && customer.name) || '').toLowerCase();
    if (isBlockedMassEmailAddress(email)) return true;
    if (company.includes('admin test store') || name.includes('admin test store')) return true;
    return false;
}

function addMassEmailRecipient(map, email, name, storeLabel) {
    const addr = String(email || '').toLowerCase().trim();
    if (isBlockedMassEmailAddress(addr)) return;
    if (!map.has(addr)) {
        map.set(addr, {
            email: addr,
            name: name || addr,
            stores: []
        });
    }
    const rec = map.get(addr);
    if (storeLabel && rec.stores.indexOf(storeLabel) === -1) rec.stores.push(storeLabel);
    if (name && rec.name === rec.email) rec.name = name;
}

function getMassEmailRecipients(audience) {
    const mode = audience || (document.getElementById('mass-email-audience') || {}).value || 'individual';
    const map = new Map();
    if (mode === 'individual') {
        parseIndividualMassEmails().forEach(function (addr) {
            addMassEmailRecipient(map, addr, addr, 'Individual');
        });
        return Array.from(map.values()).sort(function (a, b) {
            return a.email.localeCompare(b.email);
        });
    }
    if (mode === 'salesman') {
        const selected = String((document.getElementById('mass-email-salesman') || {}).value || '').toLowerCase().trim();
        if (!selected) {
            return [];
        }
        (allCustomers || []).forEach(function (c) {
            if (shouldSkipMassEmailStore(c)) return;
            const assigned = String(c.salesmanEmail || c.salesman_email || '').toLowerCase().trim();
            if (assigned !== selected) return;
            addMassEmailRecipient(map, c.email, c.name || c.company || '', c.company || c.name || '');
        });
        return Array.from(map.values()).sort(function (a, b) {
            return a.email.localeCompare(b.email);
        });
    }
    if (mode === 'missing_spend') {
        const hasAmount = {};
        (typeof inquiries !== 'undefined' && inquiries ? inquiries : []).forEach(function (row) {
            const addr = String(row.email || '').toLowerCase().trim();
            const amount = String(row.monthly_amount || '').trim();
            if (addr && amount) hasAmount[addr] = true;
        });
        (allCustomers || []).forEach(function (c) {
            if (shouldSkipMassEmailStore(c)) return;
            const addr = String(c.email || '').toLowerCase().trim();
            if (!addr || hasAmount[addr]) return;
            addMassEmailRecipient(map, addr, c.name || c.company || '', c.company || c.name || 'No estimate');
        });
        (typeof inquiries !== 'undefined' && inquiries ? inquiries : []).forEach(function (row) {
            if (String(row.status || '').toLowerCase() !== 'approved') return;
            const addr = String(row.email || '').toLowerCase().trim();
            if (!addr || hasAmount[addr] || isBlockedMassEmailAddress(addr)) return;
            if (map.has(addr)) return;
            addMassEmailRecipient(map, addr, row.owner_name || row.company_name || '', row.company_name || 'No estimate');
        });
        return Array.from(map.values()).sort(function (a, b) {
            return a.email.localeCompare(b.email);
        });
    }
    (allCustomers || []).forEach(function (c) {
        if (shouldSkipMassEmailStore(c)) return;
        if (mode === 'active' && String(c.status || '') !== 'Active' && String(c.status || '') !== 'Approved') return;
        addMassEmailRecipient(map, c.email, c.name || c.company || '', c.name || c.company || '');
    });
    (mailingListExtras || []).forEach(function (extra) {
        addMassEmailRecipient(map, extra.email, extra.name || '', extra.name || 'Extra');
    });
    return Array.from(map.values()).sort(function (a, b) {
        return a.email.localeCompare(b.email);
    });
}

function renderMailingListExtras() {
    const box = document.getElementById('mailing-extra-list');
    if (!box) return;
    const rows = mailingListExtras || [];
    if (!rows.length) {
        box.innerHTML = '<p class="text-[#6B4423]">No extra emails yet.</p>';
        return;
    }
    box.innerHTML = rows.map(function (row) {
        const id = String(row.id || '');
        const email = escapeHtml(row.email || '');
        const name = escapeHtml(row.name || '');
        return (
            '<div class="flex items-center justify-between gap-2 border border-[#d4b78f] rounded-xl px-3 py-2">' +
            '<div>' +
            '<p class="font-medium">' + email + '</p>' +
            (name ? ('<p class="text-xs text-[#6B4423]">' + name + '</p>') : '') +
            '</div>' +
            '<button type="button" onclick="removeMailingListExtra(\'' + id + '\')" ' +
            'class="px-3 py-1 text-xs border-2 border-[#6B4423] rounded-lg hover:bg-[#f8f4eb]">Remove</button>' +
            '</div>'
        );
    }).join('');
}

async function loadMailingListExtras() {
    try {
        const { data, error } = await supabaseClient
            .from('mailing_list_extras')
            .select('id, email, name, notes, source, created_at, created_by_email')
            .order('email');
        if (error) throw error;
        mailingListExtras = data || [];
    } catch (err) {
        console.warn('mailing_list_extras load:', err && err.message ? err.message : err);
        mailingListExtras = [];
        const box = document.getElementById('mailing-extra-list');
        if (box) {
            box.innerHTML = '<p class="text-red-700">Could not load extra emails. Run the mailing_list_extras SQL in Supabase if this table is new.<br>' +
                escapeHtml((err && err.message) || '') + '</p>';
        }
        return;
    }
    renderMailingListExtras();
}

async function addMailingListExtra() {
    const emailInput = document.getElementById('mailing-extra-email');
    const nameInput = document.getElementById('mailing-extra-name');
    const email = String((emailInput && emailInput.value) || '').toLowerCase().trim();
    const name = String((nameInput && nameInput.value) || '').trim();
    if (isBlockedMassEmailAddress(email)) {
        alert('Enter a real store email. Company mailboxes and jackerman@ cannot be added.');
        return;
    }
    const alreadyCustomer = (allCustomers || []).some(function (c) {
        return String(c.email || '').toLowerCase().trim() === email;
    });
    if (alreadyCustomer) {
        alert('That email is already on the customer list. Check it in the list below.');
        return;
    }
    const alreadyExtra = (mailingListExtras || []).some(function (row) {
        return String(row.email || '').toLowerCase().trim() === email;
    });
    if (alreadyExtra) {
        alert('That email is already on the extra list.');
        return;
    }
    try {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const { error } = await supabaseClient
            .from('mailing_list_extras')
            .insert({
                email: email,
                name: name || null,
                source: 'manual',
                created_by_email: user.email || user.username || ''
            });
        if (error) throw error;
        if (emailInput) emailInput.value = '';
        if (nameInput) nameInput.value = '';
        await loadMailingListExtras();
        updateMassEmailRecipientCount();
    } catch (err) {
        alert('Could not add email.\n' + ((err && err.message) || err));
    }
}

async function removeMailingListExtra(id) {
    if (!id) return;
    if (!confirm('Remove this extra email from the website list?')) return;
    try {
        const { error } = await supabaseClient
            .from('mailing_list_extras')
            .delete()
            .eq('id', id);
        if (error) throw error;
        await loadMailingListExtras();
        updateMassEmailRecipientCount();
    } catch (err) {
        alert('Could not remove email.\n' + ((err && err.message) || err));
    }
}

function parseIndividualMassEmails() {
    const raw = String((document.getElementById('mass-email-individual-to') || {}).value || '');
    return raw.split(/[\s,;]+/).map(function (part) {
        return part.toLowerCase().trim();
    }).filter(function (part) {
        return part.indexOf('@') !== -1 && !isBlockedMassEmailAddress(part);
    });
}

function populateMassEmailSalesmanSelect() {
    const select = document.getElementById('mass-email-salesman');
    if (!select) return;
    const active = (salesmen || []).filter(function (s) {
        return s.active !== false && (s.email || '').trim();
    });
    const current = select.value;
    select.innerHTML = '<option value="">— Choose a salesman —</option>' +
        active.map(function (s) {
            const name = s.name || [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email;
            const email = (s.email || '').toLowerCase().trim();
            return '<option value="' + escapeHtml(email) + '">' + escapeHtml(name) + '</option>';
        }).join('');
    if (current && Array.from(select.options).some(function (o) { return o.value === current; })) {
        select.value = current;
    }
}

function onMassEmailSalesmanChange() {
    renderMassEmailRecipientChecks(getMassEmailRecipients());
    updateMassEmailRecipientCount();
}

function onMassEmailAudienceChange() {
    const mode = (document.getElementById('mass-email-audience') || {}).value || 'individual';
    const individualBox = document.getElementById('mass-email-individual-box');
    const extrasBox = document.getElementById('mass-email-extras-box');
    const listBox = document.getElementById('mass-email-list-box');
    const salesmanBox = document.getElementById('mass-email-salesman-box');
    const isList = mode === 'active' || mode === 'all' || mode === 'missing_spend' || mode === 'salesman';
    if (individualBox) individualBox.classList.toggle('hidden', isList);
    if (extrasBox) extrasBox.classList.toggle('hidden', mode !== 'active' && mode !== 'all');
    if (salesmanBox) salesmanBox.classList.toggle('hidden', mode !== 'salesman');
    if (listBox) listBox.classList.toggle('hidden', !isList);
    if (mode === 'salesman' && typeof populateMassEmailSalesmanSelect === 'function') {
        populateMassEmailSalesmanSelect();
    }
    if (isList) renderMassEmailRecipientChecks(getMassEmailRecipients());
    const btn = document.getElementById('mass-email-send-btn');
    if (btn && !btn.disabled) btn.textContent = isList ? 'Send mass email' : 'Send email';
    if (mode === 'missing_spend') {
        const subjectEl = document.getElementById('mass-email-subject');
        const bodyEl = document.getElementById('mass-email-body');
        if (subjectEl && !subjectEl.value) {
            subjectEl.value = 'Quick question on your monthly wholesale volume';
        }
        if (bodyEl && !bodyEl.value) {
            bodyEl.value =
                'Hello,\n\n' +
                'We are lining up inventory for the wholesale portal and do not have an estimated monthly purchase amount on file for your store.\n\n' +
                'Please reply with the range that best matches what you expect to spend with Donegal Natural each month:\n\n' +
                '• Under $500\n' +
                '• $500–$1,000\n' +
                '• $1,000–$2,500\n' +
                '• $2,500–$5,000\n' +
                '• $5,000+\n\n' +
                'Include your store name if you have more than one location.\n\n' +
                'Thank you,\nDonegal Natural Dog Treats';
        }
    }
    updateMassEmailRecipientCount();
}

function updateMassEmailRecipientCount() {
    const el = document.getElementById('mass-email-count');
    const mode = (document.getElementById('mass-email-audience') || {}).value || 'individual';
    const list = getMassEmailRecipients();
    if (mode === 'active' || mode === 'all' || mode === 'missing_spend' || mode === 'salesman') {
        const box = document.getElementById('mass-email-recipient-list');
        const hasChecks = box && box.querySelectorAll('.mass-email-check').length;
        if (!hasChecks) renderMassEmailRecipientChecks(list);
    }
    const checked = getCheckedMassEmailRecipients(list);
    if (el) {
        el.textContent = checked.length + ' selected of ' + list.length + ' unique email' + (list.length === 1 ? '' : 's');
    }
}

function renderMassEmailRecipientChecks(list) {
    const box = document.getElementById('mass-email-recipient-list');
    if (!box) return;
    const rows = list || getMassEmailRecipients();
    if (!rows.length) {
        box.innerHTML = '<p class="text-[#6B4423] px-2 py-1">No emails in this list.</p>';
        return;
    }
    box.innerHTML = rows.map(function (r) {
        const email = escapeHtml(r.email || '');
        const extra = r.stores && r.stores.length ? (' — ' + r.stores.join(' | ')) : '';
        return (
            '<label class="flex items-start gap-2 px-2 py-1">' +
            '<input type="checkbox" class="mass-email-check mt-1" value="' + email + '" checked onchange="updateMassEmailCheckedLabel()">' +
            '<span>' + email + escapeHtml(extra) + '</span>' +
            '</label>'
        );
    }).join('');
}

function setMassEmailChecks(on) {
    document.querySelectorAll('.mass-email-check').forEach(function (el) {
        el.checked = !!on;
    });
    updateMassEmailCheckedLabel();
}

function updateMassEmailCheckedLabel() {
    const el = document.getElementById('mass-email-count');
    if (!el) return;
    const list = getMassEmailRecipients();
    const checked = getCheckedMassEmailRecipients(list);
    el.textContent = checked.length + ' selected of ' + list.length + ' unique email' + (list.length === 1 ? '' : 's');
}

function getCheckedMassEmailRecipients(list) {
    const rows = list || getMassEmailRecipients();
    const box = document.getElementById('mass-email-recipient-list');
    if (!box) return rows;
    const checks = box.querySelectorAll('.mass-email-check');
    if (!checks.length) return rows;
    const selected = {};
    checks.forEach(function (el) {
        if (el.checked) selected[String(el.value || '').toLowerCase().trim()] = true;
    });
    return rows.filter(function (r) {
        return selected[r.email];
    });
}

function previewMassEmailRecipients() {
    const list = getCheckedMassEmailRecipients();
    if (!list.length) {
        alert('Check at least one email.');
        return;
    }
    const lines = list.map(function (r) {
        return r.email + (r.stores.length ? (' — ' + r.stores.join(' | ')) : '');
    });
    alert('Will send to ' + list.length + ' email(s):\n\n' + lines.join('\n'));
}

function buildMassEmailHtml(message) {
    const safe = escapeHtml(message).replace(/\n/g, '<br>');
    return (
        '<div style="font-family:Arial,sans-serif;color:#3b2a1a;line-height:1.5">' +
        '<p style="font-size:16px;font-weight:700;color:#1E4D2B;margin:0 0 12px">Donegal Natural Dog Treats</p>' +
        '<div>' + safe + '</div>' +
        '<p style="margin:20px 0 0;font-size:13px;color:#6B4423">Questions: support@donegalnatural.com</p>' +
        '</div>'
    );
}

async function logPortalEmail(entry) {
    try {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const row = {
            email_type: entry.email_type || 'other',
            status: entry.status || 'sent',
            to_email: String(entry.to_email || '').toLowerCase().trim(),
            to_name: entry.to_name || '',
            subject: entry.subject || '',
            body_preview: String(entry.body_preview || '').slice(0, 500),
            error: entry.error || null,
            related_customer_id: entry.related_customer_id || null,
            store_names: entry.store_names || '',
            sent_by_email: user.email || user.username || '',
            sent_at: entry.status === 'sent' ? new Date().toISOString() : null
        };
        const { error } = await supabaseClient.from('email_log').insert(row);
        if (error) console.warn('email_log insert:', error.message);
    } catch (e) {
        console.warn('email_log insert:', e);
    }
}


function getAdminActivityActor() {
    try {
        const original = JSON.parse(localStorage.getItem('originalAdminUser') || 'null');
        const user = JSON.parse(localStorage.getItem('currentUser') || 'null') || {};
        const actor = original || user;
        const viewAs = original
            ? String(user.viewAsSalesmanEmail || user.email || '').toLowerCase().trim()
            : '';
        return {
            email: String(actor.email || actor.username || '').toLowerCase().trim() || 'unknown',
            name: actor.fullName || actor.name || actor.email || '',
            viewAs: viewAs
        };
    } catch (e) {
        return { email: 'unknown', name: '', viewAs: '' };
    }
}

async function logAdminActivity(entry) {
    try {
        const actor = getAdminActivityActor();
        const details = (entry && entry.details && typeof entry.details === 'object')
            ? Object.assign({}, entry.details)
            : {};
        if (actor.viewAs) details.view_as = actor.viewAs;
        const { error } = await supabaseClient.from('admin_activity_log').insert({
            actor_email: actor.email,
            actor_name: actor.name || null,
            action: String((entry && entry.action) || 'edit'),
            entity_type: (entry && entry.entityType) || null,
            entity_label: (entry && entry.entityLabel) || null,
            summary: (entry && entry.summary) || null,
            details: details,
            result: (entry && entry.result) || 'ok',
            error: (entry && entry.error) || null
        });
        if (error) console.warn('admin_activity_log insert:', error.message);
    } catch (e) {
        console.warn('admin_activity_log insert:', e);
    }
}

async function loadAdminActivityLog() {
    const tbody = document.getElementById('admin-activity-table');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td class="p-3 text-[#6B4423]" colspan="5">Loading…</td></tr>';
    try {
        const action = String((document.getElementById('admin-activity-action-filter') || {}).value || '').trim();
        let query = supabaseClient
            .from('admin_activity_log')
            .select('created_at, actor_email, actor_name, action, entity_type, entity_label, summary, result, error')
            .order('created_at', { ascending: false })
            .limit(200);
        if (action) query = query.eq('action', action);
        const { data, error } = await query;
        if (error) throw error;
        const rows = data || [];
        if (!rows.length) {
            tbody.innerHTML = '<tr><td class="p-3 text-[#6B4423]" colspan="5">No admin activity yet.</td></tr>';
            return;
        }
        window._adminActivityRows = rows;
        tbody.innerHTML = rows.slice(0, 8).map(function (r) {
            const whenText = r.created_at ? new Date(r.created_at).toLocaleString() : '';
            const who = escapeHtml(r.actor_name || r.actor_email || '');
            const what = escapeHtml(r.entity_label || r.summary || r.entity_type || '');
            const resultColor = r.result === 'ok' || r.result === 'verified'
                ? 'text-green-700'
                : (r.result === 'failed' ? 'text-red-700' : 'text-[#6B4423]');
            return (
                '<tr class="border-t border-[#d4b78f] align-top">' +
                '<td class="p-3 whitespace-nowrap">' + escapeHtml(whenText) + '</td>' +
                '<td class="p-3">' + who +
                    '<div class="text-xs text-[#6B4423]">' + escapeHtml(r.actor_email || '') + '</div></td>' +
                '<td class="p-3">' + escapeHtml(r.action || '') + '</td>' +
                '<td class="p-3">' + what +
                    (r.summary && r.entity_label
                        ? ('<div class="text-xs text-[#6B4423]">' + escapeHtml(r.summary) + '</div>')
                        : '') +
                '</td>' +
                '<td class="p-3 ' + resultColor + '">' + escapeHtml(r.result || '') +
                    (r.error ? ('<div class="text-xs text-red-700">' + escapeHtml(r.error) + '</div>') : '') +
                '</td>' +
                '</tr>'
            );
        }).join('');
        const note = document.getElementById('admin-activity-recent-note');
        if (note) note.textContent = 'Recent ' + Math.min(8, rows.length) + ' of ' + rows.length + '.';
    } catch (err) {
        tbody.innerHTML = '<tr><td class="p-3 text-red-700" colspan="5">Could not load admin log. Run the Admin Activity Log SQL in Supabase if this table is new.<br>' +
            escapeHtml(err.message || '') + '</td></tr>';
    }
}

function adminActivityRowHtml(r) {
    const whenText = r.created_at ? new Date(r.created_at).toLocaleString() : '';
    const who = escapeHtml(r.actor_name || r.actor_email || '');
    const what = escapeHtml(r.entity_label || r.summary || r.entity_type || '');
    const resultColor = r.result === 'ok' || r.result === 'verified'
        ? 'text-green-700'
        : (r.result === 'failed' ? 'text-red-700' : 'text-[#6B4423]');
    return '<tr class="border-t border-[#d4b78f] align-top">' +
        '<td class="p-3 whitespace-nowrap">' + escapeHtml(whenText) + '</td>' +
        '<td class="p-3">' + who +
            '<div class="text-xs text-[#6B4423]">' + escapeHtml(r.actor_email || '') + '</div></td>' +
        '<td class="p-3">' + escapeHtml(r.action || '') + '</td>' +
        '<td class="p-3">' + what +
            (r.summary && r.entity_label
                ? ('<div class="text-xs text-[#6B4423]">' + escapeHtml(r.summary) + '</div>')
                : '') +
        '</td>' +
        '<td class="p-3 ' + resultColor + '">' + escapeHtml(r.result || '') +
            (r.error ? ('<div class="text-xs text-red-700">' + escapeHtml(r.error) + '</div>') : '') +
        '</td></tr>';
}

function openAdminActivityLogModal() {
    const modal = document.getElementById('admin-activity-modal');
    const body = document.getElementById('admin-activity-modal-table');
    if (!modal || !body) return;
    const rows = window._adminActivityRows || [];
    body.innerHTML = rows.length
        ? rows.map(adminActivityRowHtml).join('')
        : '<tr><td class="p-3 text-[#6B4423]" colspan="5">No admin activity yet.</td></tr>';
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

function closeAdminActivityLogModal() {
    const modal = document.getElementById('admin-activity-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.style.display = 'none';
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



async function loadEmailLog() {
    const tbody = document.getElementById('email-log-table');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td class="p-3 text-[#6B4423]" colspan="5">Loading…</td></tr>';
    try {
        const { data, error } = await supabaseClient
            .from('email_log')
            .select('id, created_at, sent_at, to_email, to_name, subject, email_type, status, error, store_names')
            .order('created_at', { ascending: false })
            .limit(100);
        if (error) throw error;
        const rows = data || [];
        if (!rows.length) {
            tbody.innerHTML = '<tr><td class="p-3 text-[#6B4423]" colspan="5">No emails logged yet.</td></tr>';
            return;
        }
        tbody.innerHTML = rows.map(function (r) {
            const when = r.sent_at || r.created_at;
            const whenText = when ? new Date(when).toLocaleString() : '—';
            const statusColor = r.status === 'sent' ? 'text-green-700' : (r.status === 'failed' ? 'text-red-700' : 'text-[#6B4423]');
            const toLabel = escapeHtml(r.to_email || '') +
                (r.store_names ? ('<div class="text-xs text-[#6B4423]">' + escapeHtml(r.store_names) + '</div>') : '');
            return (
                '<tr class="border-t border-[#d4b78f] align-top">' +
                '<td class="p-2 whitespace-nowrap">' + escapeHtml(whenText) + '</td>' +
                '<td class="p-2">' + toLabel + '</td>' +
                '<td class="p-2">' + escapeHtml(r.subject || '') + '</td>' +
                '<td class="p-2">' + escapeHtml(r.email_type || '') + '</td>' +
                '<td class="p-2 ' + statusColor + '">' + escapeHtml(r.status || '') +
                (r.error ? ('<div class="text-xs text-red-700">' + escapeHtml(r.error) + '</div>') : '') +
                '</td>' +
                '</tr>'
            );
        }).join('');
    } catch (err) {
        tbody.innerHTML = '<tr><td class="p-3 text-red-700" colspan="5">Could not load email log. Run the Email Log SQL in Supabase if this table is new.<br>' +
            escapeHtml(err.message || '') + '</td></tr>';
    }
}

const MASS_EMAIL_ATTACH_MAX = 6 * 1024 * 1024;
const MASS_EMAIL_ATTACH_TYPES = {
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'xls': 'application/vnd.ms-excel',
    'pdf': 'application/pdf',
    'csv': 'text/csv',
    'txt': 'text/plain',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

function readMassEmailAttachment() {
    return new Promise(function (resolve, reject) {
        const input = document.getElementById('mass-email-attachment');
        if (!input || !input.files || !input.files[0]) {
            resolve(null);
            return;
        }
        const file = input.files[0];
        const ext = String(file.name || '').split('.').pop().toLowerCase();
        if (!MASS_EMAIL_ATTACH_TYPES[ext]) {
            reject(new Error('Use PDF, Excel, Word, CSV, or a text file.'));
            return;
        }
        if (file.size > MASS_EMAIL_ATTACH_MAX) {
            reject(new Error('Attachment is over 6 MB. Export a smaller Excel or PDF.'));
            return;
        }
        const reader = new FileReader();
        reader.onload = function () {
            const result = String(reader.result || '');
            const comma = result.indexOf(',');
            resolve({
                filename: file.name,
                contentType: file.type || MASS_EMAIL_ATTACH_TYPES[ext],
                content: comma >= 0 ? result.slice(comma + 1) : result
            });
        };
        reader.onerror = function () {
            reject(new Error('Could not read the attachment.'));
        };
        reader.readAsDataURL(file);
    });
}

async function sendMassCustomerEmail() {
    const subject = (document.getElementById('mass-email-subject') || {}).value || '';
    const message = (document.getElementById('mass-email-body') || {}).value || '';
    const btn = document.getElementById('mass-email-send-btn');
    const progress = document.getElementById('mass-email-progress');
    const list = getCheckedMassEmailRecipients();

    if (!subject.trim() || !message.trim()) {
        alert('Subject and message are required.');
        return;
    }
    if (!list.length) {
        alert('Check at least one email.');
        return;
    }
    const attachInput = document.getElementById('mass-email-attachment');
    const attachName = attachInput && attachInput.files && attachInput.files[0] ? attachInput.files[0].name : '';
    if (!confirm('Send this email to ' + list.length + ' address(es)' + (attachName ? (' with ' + attachName + ' attached') : '') + '?')) return;
    if (!confirm('Last check: this will email customers now. Continue?')) return;

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Sending…';
    }

    let attachment = null;
    try {
        attachment = await readMassEmailAttachment();
    } catch (err) {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Send email';
        }
        alert(err.message || 'Could not read the attachment.');
        return;
    }

    const html = buildMassEmailHtml(message);
    const text = message.trim();
    const payload = {
        to: '',
        subject: subject.trim(),
        html: html,
        text: text
    };
    if (attachment) payload.attachments = [attachment];
    const preview = text + (attachment ? ('\n[attachment: ' + attachment.filename + ']') : '');

    let sent = 0;
    let failed = 0;
    let lastErr = '';

    for (let i = 0; i < list.length; i++) {
        const rec = list[i];
        payload.to = rec.email;
        if (progress) {
            progress.textContent = 'Sending ' + (i + 1) + ' of ' + list.length + ' — ' + rec.email;
        }
        try {
            const fnRes = await fetch(SUPABASE_URL + '/functions/v1/send-customer-email', {
                method: 'POST',
                headers: await getEdgeFunctionHeaders(),
                body: JSON.stringify(payload)
            });
            const fnText = await fnRes.text();
            let fnData = null;
            try { fnData = JSON.parse(fnText); } catch (e) { fnData = { error: fnText || 'Empty response' }; }
            if (!fnRes.ok || (fnData && fnData.error)) {
                throw new Error((fnData && fnData.error) ? fnData.error : ('HTTP ' + fnRes.status));
            }
            sent += 1;
            await logPortalEmail({
                email_type: 'mass',
                status: 'sent',
                to_email: rec.email,
                to_name: rec.name,
                subject: subject.trim(),
                body_preview: preview,
                store_names: rec.stores.join(' | ')
            });
        } catch (err) {
            failed += 1;
            lastErr = err.message || String(err);
            await logPortalEmail({
                email_type: 'mass',
                status: 'failed',
                to_email: rec.email,
                to_name: rec.name,
                subject: subject.trim(),
                body_preview: preview,
                store_names: rec.stores.join(' | '),
                error: err.message || String(err)
            });
        }
    }

    if (btn) {
        btn.disabled = false;
        const mode = (document.getElementById('mass-email-audience') || {}).value || 'individual';
        btn.textContent = (mode === 'active' || mode === 'all' || mode === 'salesman') ? 'Send mass email' : 'Send email';
    }
    if (progress) {
        progress.textContent = 'Done. Sent ' + sent + ', failed ' + failed + '.';
    }
    await loadEmailLog();
    alert('Mass email finished.\nSent: ' + sent + '\nFailed: ' + failed + (lastErr ? ('\n\nLast error:\n' + lastErr) : ''));
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


// ================== VENDORS SYSTEM ==================
var vendors = [];

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
                    ${escapeHtml(product.name)}
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
                <td class="p-3 font-medium">${escapeHtml(product.name)}</td>
                <td class="p-3 text-sm text-[#6B4423]">${escapeHtml(product.category || '')}</td>
                <td class="p-3">${escapeHtml(singleCost.vendorName)}</td>
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
                <td class="p-3 font-medium">${escapeHtml(product.name)}</td>
                <td class="p-3 text-sm text-[#6B4423]">${escapeHtml(product.category || '')}</td>
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
                    <td class="p-3">${escapeHtml(cost.vendorName)}</td>
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
        header.innerHTML = `<h3 class="text-lg font-bold brand-green border-b border-[#d4b78f] pb-1">${escapeHtml(groupName)}</h3>`;
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
                    <span class="font-medium">${escapeHtml(item.name)}</span>
                    <span class="text-[#6B4423] text-lg">${isExpanded ? '▼' : '▶'}</span>
                </div>
                <div id="ingredient-detail-${safeId}" class="${isExpanded ? '' : 'hidden'} px-4 py-4 bg-white text-sm space-y-2">
                    <p><strong>Ingredients:</strong> ${escapeHtml(item.ingredients || '')}</p>
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
                    <span class="font-medium">${i + 1}. ${escapeHtml(p.name)}</span>
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
                    <p class="font-medium">${escapeHtml(p.name)}</p>
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
                        <p class="font-medium">${escapeHtml(p.name)}</p>
                        <p class="text-sm text-[#6B4423] mt-1">${escapeHtml(detailLine)}</p>
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

// ================== LEGAL / FORMS ==================
// Access is gated by admin portal session (no client-side shared password)

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
                        <p class="font-semibold text-[#1E4D2B]">${escapeHtml(company)}</p>
                        <p class="text-xs text-[#6B4423]">${escapeHtml(email)}</p>
                    </td>
                    <td class="py-3 pr-4 font-mono text-sm">${escapeHtml(cert.certificate_number || '—')}</td>
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
    showSection('legal-forms');
    if (typeof loadAdminResaleCertificates === 'function') {
        loadAdminResaleCertificates();
    }
    if (typeof loadIngredients === 'function') {
        loadIngredients().then(() => {
            if (typeof renderIngredients === 'function') renderIngredients();
        });
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

// Company base price sheet and bulk adjustments live in js/internal/base-price-sheet.js

// ================== OUT OF STOCK ==================
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

// ================== PRODUCT PHOTO GALLERY ==================
const PHOTO_BUCKET = 'product-photos';
const PHOTO_FAMILIES = [
    { key: 'green-line', title: 'Green Line Bully Sticks', names: ['6” Thin Green Line Bully Sticks (Bulk)', '12” Thin Green Line Bully Sticks (Bulk)', '6” Regular Green Line Bully Sticks (Bulk)', '12” Regular Green Line Bully Sticks (Bulk)', '6” “Thick” Green Line Bully Sticks (Bulk)', '12” “Thick” Green Line Bully Sticks (Bulk)', '6” “Super Thick” Green Line Bully Sticks (Bulk)', '12” “Super Thick” Green Line Bully Sticks (Bulk)'] },
    { key: 'bully-canes', title: 'Bully Canes', names: ['24-28” Bully Cane', '32-36” Bully Cane'] },
    { key: 'braided-bully', title: 'Braided Bully Sticks', names: ['6” Braided Bully Sticks (Bulk)', '12” Braided Bully Sticks (Bulk)', '6” “Super” Braided Bully Sticks (Bulk)', '12” “Super” Braided Bully Sticks (Bulk)'] },
    { key: 'euro-bully', title: 'Euro Bully Sticks', names: ['6” Euro Bully Stick (Bulk)', '6” Euro Bully Stick (Display)', '12” Euro Bully Stick (Bulk)', '12” Euro Bully Sticks (Display)'] },
    { key: 'bully-pieces', title: 'Bully Pieces', names: ['8oz. Bag of Bully Pieces', '10oz. Bag of Bully Pieces', '16oz. Bag of Bully Pieces'], kind: 'packaged' },
    { key: 'beef-jerky', title: 'USA Beef Jerky Treats', names: ['USA Beef Jerky Treats (Bulk)', 'USA Beef Jerky Treats (Display)'] },
    { key: 'turkey-jerky', title: 'USA Turkey Jerky Treats', names: ['USA Turkey Jerky Treats (Bulk)', 'USA Turkey Jerky Treats (Display)'] },
    { key: 'chicken-jerky', title: 'USA Chicken Jerky Treats', names: ['USA Chicken Jerky Treats (Bulk)', 'USA Chicken Jerky Treats (Display)'] },
    { key: 'elky-jerky', title: 'USA Elky Jerky Treats', names: ['USA Elky Jerky Treats (Bulk)', 'USA Elky Jerky Treats (Display)'] },
    { key: 'venison-jerky', title: 'USA Venison & Sweet Potato Jerky', names: ['USA Venison & Sweet Potato Jerky Treats (Bulk)', 'USA Venison & Sweet Potato Jerky Treats (Display)'] },
    { key: 'elky-training', title: 'USA Elky Training Treats', names: ['6oz. Bags of USA Elky Training Treats', '8oz. Bags of USA Elky Training Treats', '10oz. Bags of USA Elky Training Treats', '12oz. Bags of USA Elky Training Treats'], kind: 'packaged' },
    { key: 'cow-ears', title: 'Cow Ears', names: ['Natural Cow Ears (Bulk)', 'Vanilla Cow Ears (Bulk)', 'Honey Smoked Cow Ears (Bulk)'] },
    { key: 'cow-ears-6pack', title: '6-Pack Cow Ears', names: ['6-Pack, Natural Cow Ears', '6-Pack Natural Cow Ears', '6-Pack, Vanilla Cow Ears', '6-Pack Vanilla Cow Ears', '6-Pack, Honey Smoked Cow Ears', '6-Pack Honey Smoked Cow Ears'], linkedFamilyKey: 'cow-ears', kind: 'packaged' },
    { key: 'buffalo-ears', title: 'Buffalo Ears', names: ['MAGNA Buffalo Ears (Bulk)', 'Honey Smoked MAGNA Buffalo Ears (Bulk)'] },
    { key: 'lamb-ears', title: 'Lamb Ears', names: ['White Lamb Ears (Bulk)', 'Vanilla Lamb Ears (Bulk)'] },
    { key: 'hairy-beef-ears', title: 'Hairy Beef Ears', names: ['Hairy Beef Ears (Bulk)', '5-Pack Hairy Beef Ears'] },
    { key: 'pig-ears', title: 'Pig Ears', names: ['Polish Pig Ears (Bulk)'] },
    { key: 'rabbit-ears', title: 'Fuzzy Rabbit Ears', names: ['Fuzzy Rabbit Ears (Bulk)', '10-Pack of Fuzzy Rabbit Ears', '10-Pack Fuzzy Rabbit Ears'] },
    { key: 'rabbit-feet', title: 'Fuzzy Rabbit Feet', names: ['Fuzzy Rabbit Feet (Bulk)', '10-Pack of Fuzzy Rabbit Feet', '10-Pack Fuzzy Rabbit Feet'] },
    { key: 'natural-rollio', title: 'Natural Rollio', names: ['5-6” Natural Rollio (Bulk)', '10-12” Natural Rollio (Bulk)'] },
    { key: 'regular-rollio', title: 'Regular Rollio', names: ['5-6” Regular Rollio (Bulk)', '10-12” Regular Rollio (Bulk)'] },
    { key: 'vanilla-rollio', title: 'Vanilla Rollio', names: ['5-6” Vanilla Rollio (Bulk)', '10-12” Vanilla Rollio (Bulk)'] },
    { key: 'honey-rollio', title: 'Honey Smoked Rollio', names: ['5-6” Honey Smoked Rollio (Bulk)', '10-12” Honey Smoked Rollio (Bulk)'] },
    { key: 'phat-rollio', title: 'PHAT Rollio', names: ['5-6” PHAT Rollio (Bulk)', '10-12” PHAT Rollio (Bulk)', '5-6” Vanilla PHAT Rollio (Bulk)', '10-12” Vanilla PHAT Rollio (Bulk)', '5-6” Honey Smoked PHAT Rollio (Bulk)', '10-12” Honey Smoked PHAT Rollio (Bulk)'] },
    { key: 'pb-rollio', title: 'Peanut Butter Rollio', names: ['5-6” Peanut Butter Rollio (Bulk)', '10-12” Peanut Butter Rollio (Bulk)'] },
    { key: 'cheek-slabs', title: 'Cow Cheek Slabs', names: ['5-6” Cow Cheek Slab (Bulk per lb.)', '5-6” Vanilla Cow Cheek Slab (Bulk per lb.)', '10-12” Cow Cheek Slab (Bulk per lb.)', '10-12” Vanilla Cow Cheek Slab (Bulk per lb.)', '10-12” Natural Cow Cheek Slabs (Bulk per lb.)'] },
    { key: 'chunky-bulk', title: 'Chunky Cheeks (Bulk)', names: ['White Chunky Cheeks (Bulk)', 'Vanilla Chunky Cheeks (Bulk)'] },
    { key: 'chunky-bags', title: 'Chunky Cheeks (Bags)', names: ['8oz. Bags of White Chunky Cheeks', '8oz. Bags of Vanilla Chunky Cheeks', '16oz. Bags of White Chunky Cheeks', '16oz. Bags of Vanilla Chunky Cheeks'], linkedFamilyKey: 'chunky-bulk', kind: 'packaged' },
    { key: 'pressed-bones', title: 'Pressed Bones', names: ['4.5” Pressed Bone (Bulk)', '6.5” Pressed Bone (Bulk)', '8.5” Pressed Bone (Bulk)', '10.5” Pressed Bone (Bulk)', '12.5” Pressed Bone (Bulk)'] },
    { key: 'pressed-ring', title: 'Supreme Pressed Ring', names: ['6” Supreme Pressed Ring (Bulk)'] },
    { key: 'pressed-stick', title: 'Supreme Pressed Stick', names: ['10” x 20mm Supreme Pressed Stick (Bulk)'] },
    { key: 'buffalo-knuckle', title: 'Buffalo Knuckle', names: ['Small Meaty Buffalo Knuckle'] },
    { key: 'femur', title: 'Jumbo Meaty Femur', names: ['14-16” Jumbo Meaty Femur Knuckle Bone'] },
    { key: 'beef-gullet', title: 'Beef Gullet / Esophagus', names: ['Beef Gullet', 'Beef Esophagus', 'Braided Esophagus'] },
    { key: 'magna-ox', title: 'MAGNA Ox Tails', names: ['6” MAGNA Natural Ox Tails (Bulk)', '12” MAGNA Natural Ox Tails (Bulk)'] },
    { key: 'ox-tails', title: 'Ox Tails', names: ['6” White Ox Tails (Bulk)', '12” White Ox Tails (Bulk)', '6” Vanilla Ox Tails (Bulk)', '12” Vanilla Ox Tails (Bulk)', '6” Honey Smoked Ox Tails (Bulk)', '12” Honey Smoked Ox Tails (Bulk)'] },
    { key: 'duck-necks', title: 'Duck Necks', names: ['Crunchy Baked Duck Necks (Bulk)', '10-Pack of Crunchy Duck Necks'] },
    { key: 'duck-heads', title: 'Duck Heads', names: ['Crunchy Baked Duck Heads (Bulk)', '5-Pack of Crunchy Duck Heads', '10-Pack of Duck Heads'] },
    { key: 'chicken-feet', title: 'Chicken Feet', names: ['Crunchy Euro Chicken Feet (Bulk)', '10-Pack Euro Chicken Feet'] },
    { key: 'braided-esophagus', title: 'Braided Esophagus', names: ['6” Braided Esophagus (Bulk)', '12” Braided Esophagus (Bulk)', '6” Braided Esophagus (Display)', '12” Braided Esophagus (Display)'] },
    { key: 'hide-donuts', title: 'USA Hide Braided Donuts', names: ['5-7” Braided USA Hide Donuts (Bulk)', '5-7” Vanilla USA Hide Braided Donuts (Bulk)', '8-9” Braided USA Hide Donuts (Bulk)', '8-9” Vanilla USA Hide Braided Donuts (Bulk)', '10-11” Braided USA Hide Donuts (Bulk)', '10-11” Vanilla USA Hide Braided Donuts (Bulk)'] },
    { key: 'binkeys', title: 'Binky’s Supreme Chips', names: ['8oz. Bags of White Supreme Chips (Binkey’s)', '8oz. Bags of Peanut Butter Supreme Chips (Binkey’s)', '8oz. Bags of Vanilla Supreme Chips (Binkey’s)', '16oz. Bags of White Supreme Chips (Binkey’s)', '16oz. Bags of Peanut Butter Supreme Chips (Binkey’s)', '16oz. Bags of Vanilla Supreme Chips (Binkey’s)'], linkedFamilyKey: 'supreme-chips-bulk', kind: 'packaged' },
    { key: 'supreme-chips-bulk', title: 'Supreme Hide Chips (Bulk)', names: ['White USA Supreme Hide Chips (Bulk per lb.)', 'Vanilla USA Supreme Chips (Bulk per lb.)', 'Peanut Butter Basted USA Supreme Hide Chips (Bulk per lb.)'] }
];

let _photoGalleryImages = [];
let _photoGalleryFamilyKey = null;
let _photoGalleryCategory = null;
let _photoGalleryQueue = [];

function photoFamilySlug(name) {
    return String(name || '')
        .toLowerCase()
        .replace(/[“”"']/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 48);
}

const PHOTO_GALLERY_TREE = {
    'Bully Sticks': {
        'Green Line': ['6” Thin Green Line Bully Sticks (Bulk)', '12” Thin Green Line Bully Sticks (Bulk)', '6” Regular Green Line Bully Sticks (Bulk)', '12” Regular Green Line Bully Sticks (Bulk)', '6” “Thick” Green Line Bully Sticks (Bulk)', '12” “Thick” Green Line Bully Sticks (Bulk)', '6” “Super Thick” Green Line Bully Sticks (Bulk)', '12” “Super Thick” Green Line Bully Sticks (Bulk)'],
        'Canes': ['24-28” Bully Cane', '32-36” Bully Cane'],
        'Braided Bully': ['6” Braided Bully Sticks (Bulk)', '12” Braided Bully Sticks (Bulk)', '6” “Super” Braided Bully Sticks (Bulk)', '12” “Super” Braided Bully Sticks (Bulk)'],
        'Euro Bully': ['6” Euro Bully Stick (Bulk)', '6” Euro Bully Stick (Display)', '12” Euro Bully Stick (Bulk)', '12” Euro Bully Sticks (Display)'],
        'Bully Pieces': ['8oz. Bag of Bully Pieces', '10oz. Bag of Bully Pieces', '16oz. Bag of Bully Pieces']
    },
    'Jerky': {
        'Jerky Stick Treats': ['USA Beef Jerky Treats (Bulk)', 'USA Beef Jerky Treats (Display)', 'USA Turkey Jerky Treats (Bulk)', 'USA Turkey Jerky Treats (Display)', 'USA Chicken Jerky Treats (Bulk)', 'USA Chicken Jerky Treats (Display)', 'USA Elky Jerky Treats (Bulk)', 'USA Elky Jerky Treats (Display)', 'USA Venison & Sweet Potato Jerky Treats (Bulk)', 'USA Venison & Sweet Potato Jerky Treats (Display)'],
        'Training Treats': ['6oz. Bags of USA Elky Training Treats', '8oz. Bags of USA Elky Training Treats', '10oz. Bags of USA Elky Training Treats', '12oz. Bags of USA Elky Training Treats'],
        'Jerky Stuffed Bones': ['Large Turkey Jerky Stuffed Buffalo Bone', 'Large Elky Jerky Stuffed Buffalo Bone', 'Large Venison and Sweet Potato Stuffed Buffalo Bone']
    },
    'Ears': {
        'Natural/Flavored Cow Ears': ['Natural Cow Ears (Bulk)', 'Vanilla Cow Ears (Bulk)', 'Honey Smoked Cow Ears (Bulk)'],
        'Hairy Beef Ears': ['Hairy Beef Ears (Bulk)'],
        'Buffalo Ears': ['MAGNA Buffalo Ears (Bulk)', 'Honey Smoked MAGNA Buffalo Ears (Bulk)'],
        'Pig Ears': ['Polish Pig Ears (Bulk)'],
        'Lamb Ears': ['White Lamb Ears (Bulk)', 'Vanilla Lamb Ears (Bulk)'],
        'Fuzzy Rabbit Ears': ['Fuzzy Rabbit Ears (Bulk)', '10-Pack Fuzzy Rabbit Ears', '10-Pack of Fuzzy Rabbit Ears'],
    },
    'Cow Cheeks': {
        'All Natural Rollio': ['5-6” Natural Rollio (Bulk)', '10-12” Natural Rollio (Bulk)'],
        'Natural/Flavored Rollios': ['5-6” Regular Rollio (Bulk)', '10-12” Regular Rollio (Bulk)', '5-6” Vanilla Rollio (Bulk)', '10-12” Vanilla Rollio (Bulk)', '5-6” Honey Smoked Rollio (Bulk)', '10-12” Honey Smoked Rollio (Bulk)'],
        'PHAT Rollios': ['5-6” PHAT Rollio (Bulk)', '10-12” PHAT Rollio (Bulk)', '5-6” Vanilla PHAT Rollio (Bulk)', '10-12” Vanilla PHAT Rollio (Bulk)', '5-6” Honey Smoked PHAT Rollio (Bulk)', '10-12” Honey Smoked PHAT Rollio (Bulk)'],
        'Peanut Butter Rollios': ['5-6” Peanut Butter Rollio (Bulk)', '10-12” Peanut Butter Rollio (Bulk)'],
        'Cow Cheek Slabs': ['5-6” Cow Cheek Slab (Bulk per lb.)', '5-6” Vanilla Cow Cheek Slab (Bulk per lb.)', '10-12” Cow Cheek Slab (Bulk per lb.)', '10-12” Vanilla Cow Cheek Slab (Bulk per lb.)', '10-12” Natural Cow Cheek Slabs (Bulk per lb.)'],
        'Chunky Cheeks': ['White Chunky Cheeks (Bulk)', 'Vanilla Chunky Cheeks (Bulk)', '8oz. Bags of White Chunky Cheeks', '8oz. Bags of Vanilla Chunky Cheeks', '16oz. Bags of White Chunky Cheeks', '16oz. Bags of Vanilla Chunky Cheeks']
    },
    'Ox Tails': {
        'MAGNA Ox Tails': ['6” MAGNA Natural Ox Tails (Bulk)', '12” MAGNA Natural Ox Tails (Bulk)'],
        'Ox Tails': ['6” White Ox Tails (Bulk)', '12” White Ox Tails (Bulk)', '6” Vanilla Ox Tails (Bulk)', '12” Vanilla Ox Tails (Bulk)', '6” Honey Smoked Ox Tails (Bulk)', '12” Honey Smoked Ox Tails (Bulk)']
    },
    'Rabbit': {
        'Fuzzy Rabbit Ears': ['Fuzzy Rabbit Ears (Bulk)', 'Fuzzy Bunny Ears (Bulk)', '10-Pack Fuzzy Rabbit Ears', '10-Pack of Fuzzy Rabbit Ears', '10-Pack of Fuzzy Bunny Ears'],
        'Fuzzy Rabbit Feet': ['Fuzzy Rabbit Feet (Bulk)', '10-Pack Fuzzy Rabbit Feet', '10-Pack of Fuzzy Rabbit Feet']
    },
    'Duck and Goose': {
        'Duck Neck': ['Crunchy Baked Duck Necks (Bulk)', '10-Pack of Crunchy Duck Necks'],
        'Duck Heads': ['Crunchy Baked Duck Heads (Bulk)', '5-Pack of Crunchy Duck Heads', '10-Pack of Duck Heads', '10-Pack of Crunch Duck Heads'],
        'Duck Feet': ['Euro Duck Feet (Bulk)', 'Euro Duck Feet (Display)', '10-Pack Euro Duck Feet', '10-Pack of Euro Duck Feet'],
        'Goose Neck': ['Goose Neck (Bulk)', '10-Pack of Crunchy Goose Necks'],
    },
    'Beef': {
        'Beef Jerky Treats': ['USA Beef Jerky Treats (Bulk)'],
        'Hairy Beef Ears': ['Hairy Beef Ears (Bulk)'],
        'Super Meaty Beef Tendons': ['Super Meaty Beef Tendons (Bulk)'],
        'Paddywacks (Neck Tendons)': ['6” Paddywack (Bulk)', '12” Paddywack (Bulk)'],
        'Corium Sticks (Collagen)': ['6” Corium Sticks (Bulk)', '12” Corium Sticks (Bulk)', '6” Beef Wrapped Corium Sticks (Bulk)', '12” Beef Wrapped Corium Sticks (Bulk)'],
        'Beef Lung': ['8oz. Bag of Beef Lung', '16oz. Bag of Beef Lung'],
        'Trachea and Trachea Pieces': ['5-6” Beef Trachea', '10-13” Beef Trachea', '8oz. Bags of Beef Trachea Pieces', '16oz. Bags of Beef Trachea Pieces'],
        'Packaged': ['8oz. Bags of Beef Trachea Pieces', '16oz. Bags of Beef Trachea Pieces', '8oz. Bag of Beef Lung', '16oz. Bag of Beef Lung', '5-Pack Hairy Beef Ears']
    },
    'Buffalo': {
        'Buffalo Ears': ['MAGNA Buffalo Ears (Bulk)', 'Honey Smoked MAGNA Buffalo Ears (Bulk)'],
        'Buffalo Bone and Knuckle': ['Reg Large Meaty Buffalo Bone', 'Small Meaty Buffalo Knuckle'],
        'Stuffed Buffalo Bones': ['Large Turkey Jerky Stuffed Buffalo Bone', 'Large Elky Jerky Stuffed Buffalo Bone', 'Large Venison and Sweet Potato Stuffed Buffalo Bone', 'Large Peanut Butter Stuffed Buffalo Bone'],
        'Buffalo Horns': ['Large Buffalo Horn (Bulk)', 'Medium Buffalo Horn (Bulk)', 'Small Buffalo Horn (Bulk)'],
        'Buffalo Collagen': ['6” Buffalo Collagen Sticks']
    },
    'Deer (Venison)': {
        'Deer (Venison)': ['USA Venison & Sweet Potato Jerky Treats (Bulk)', 'USA Venison & Sweet Potato Jerky Treats (Display)', 'Large Venison and Sweet Potato Stuffed Buffalo Bone', 'Deer Skin Chips (Bulk)']
    },
    'Elk': {
        'Elk': ['USA Elky Jerky Treats (Bulk)', 'USA Elky Jerky Treats (Display)', '6oz. Bags of USA Elky Training Treats', '8oz. Bags of USA Elky Training Treats', '10oz. Bags of USA Elky Training Treats', '12oz. Bags of USA Elky Training Treats']
    },
    'Chicken and Turkey': {
        'Chicken': ['Crunchy Euro Chicken Feet (Bulk)', 'Euro White Chicken Feet (Bulk)', 'Vanilla Flavored White Euro Chicken Feet (Bulk)', '10-Pack Euro Chicken Feet', '10-Pack of Euro Chicken Feet', '10-Pack White Euro Chicken Feet', '10-Pack of White Euro Chicken Feet', '10-Pack Vanilla Euro Chicken Feet', '10-Pack of Vanilla Euro Chicken Feet', 'USA Chicken Jerky Treats (Bulk)', 'USA Chicken Jerky Treats (Display)'],
        'Turkey': ['USA Turkey Jerky Treats (Bulk)', 'USA Turkey Jerky Treats (Display)', 'Large Turkey Jerky Stuffed Buffalo Bone']
    },
    'Feet': {
        'Chicken Feet': ['Crunchy Euro Chicken Feet (Bulk)', 'Euro White Chicken Feet (Bulk)', 'Vanilla Flavored White Euro Chicken Feet (Bulk)', '10-Pack Euro Chicken Feet', '10-Pack of Euro Chicken Feet', '10-Pack White Euro Chicken Feet', '10-Pack of White Euro Chicken Feet', '10-Pack Vanilla Euro Chicken Feet', '10-Pack of Vanilla Euro Chicken Feet'],
        'Duck Feet': ['Euro Duck Feet (Bulk)', 'Euro Duck Feet (Display)', '10-Pack Euro Duck Feet', '10-Pack of Euro Duck Feet'],
        'Fuzzy Rabbit Feet': ['Fuzzy Rabbit Feet (Bulk)', '10-Pack Fuzzy Rabbit Feet', '10-Pack of Fuzzy Rabbit Feet'],
    },
    'Horns': {
        'Rams Horn': ['Large Rams Horn (Bulk)', 'Medium Rams Horn (Bulk)', 'Small Rams Horn (Bulk)'],
        'Buffalo Horn': ['Large Buffalo Horn (Bulk)', 'Medium Buffalo Horn (Bulk)', 'Small Buffalo Horn (Bulk)']
    },
    'Hooves': {
        'Hooves': ['Regular Cow Hooves (Bulk)', 'Smoked Cow Hooves (Bulk)', '“Super” Cow Hooves (Bulk)']
    },
    'Braided': {
        'Braided Bully Sticks': ['6” Braided Bully Sticks (Bulk)', '12” Braided Bully Sticks (Bulk)', '6” “Super” Braided Bully Sticks (Bulk)', '12” “Super” Braided Bully Sticks (Bulk)'],
        'Braided Esophagus': ['6” Braided Esophagus (Bulk)', '12” Braided Esophagus (Bulk)', '6” Braided Esophagus (Display)', '12” Braided Esophagus (Display)'],
        'Supreme USA Hide Braided Donuts': ['5-7” Braided USA Hide Donuts (Bulk)', '5-7” Vanilla USA Hide Braided Donuts (Bulk)', '8-9” Braided USA Hide Donuts (Bulk)', '8-9” Vanilla USA Hide Braided Donuts (Bulk)', '10-11” Braided USA Hide Donuts (Bulk)', '10-11” Vanilla USA Hide Braided Donuts (Bulk)']
    },
    'Large Meaty Femur/Bone/Knuckles': {
        'Large Buffalo Bone': ['Reg Large Meaty Buffalo Bone'],
        'Buffalo Knuckle': ['Small Meaty Buffalo Knuckle'],
        'Stuffed Buffalo Bone': ['Large Turkey Jerky Stuffed Buffalo Bone', 'Large Elky Jerky Stuffed Buffalo Bone', 'Large Venison and Sweet Potato Stuffed Buffalo Bone', 'Large Peanut Butter Stuffed Buffalo Bone'],
        'Jumbo Meaty Femur': ['14-16” Jumbo Meaty Femur Knuckle Bone']
    },
    'Pressed Bones': {
        'Supreme Pressed Ring': ['6” Supreme Pressed Ring (Bulk)'],
        'Supreme Pressed Stick': ['10” x 20mm Supreme Pressed Stick (Bulk)'],
        'Supreme Pressed Bones': ['4.5” Pressed Bone (Bulk)', '6.5” Pressed Bone (Bulk)', '8.5” Pressed Bone (Bulk)', '10.5” Pressed Bone (Bulk)', '12.5” Pressed Bone (Bulk)']
    },
    'Twisty Q’s and Natural Munchy Sticks': {
        'Munch Sticks': ['12” x 20mm Natural Munchy Sticks (Bulk)', '5” x 10mm Natural Munchy Sticks (Bulk)', '6.5” Bacon Munchy Sticks (Bulk)'],
        'Twisty Q’s': ['10” White Twisty Q’s (Bulk)', '10” Vanilla Twisty Q’s (Bulk)'],
        "Twisty's": ['5” x 4/6mm White Twisty-100/inner (Bulk)', '5” x 9/10mm White Twisty-50/inner (Bulk)', '10” x 9/10mm White Twisty (Bulk)']
    },
    'Supreme Hide Chips': {
        'Supreme USA Hide Chips': ['White USA Supreme Hide Chips (Bulk per lb.)', 'Vanilla USA Supreme Chips (Bulk per lb.)', 'Peanut Butter Basted USA Supreme Hide Chips (Bulk per lb.)', "8oz. Bags of White Supreme Chips (Binkey's)"],
        "Binky's": ["8oz. Bags of Peanut Butter Supreme Chips (Binkey's)", "8oz. Bags of Vanilla Supreme Chips (Binkey's)", "16oz. Bags of White Supreme Chips (Binkey's)", "16oz. Bags of Peanut Butter Supreme Chips (Binkey's)", "16oz. Bags of Vanilla Supreme Chips (Binkey's)"]
    },
    'Retrievers': {
        'USA White Hide Retriever': ['6/9” White Supreme Retriever (Bulk)', '10-11” x 30mm White Supreme Retriever (Bulk)'],
        'Vanilla Flavored Retriever': ['6/9” Vanilla Supreme Retriever (Bulk)', '10-11” x 30mm Vanilla MAGNA Retriever (Bulk)']
    },
    'Packaged Items': {
        'Duck and Goose': ['5-Pack of Crunchy Duck Heads', '5-Pack of Duck Heads', '10-Pack of Crunchy Duck Necks', '10-Pack of Crunchy Goose Necks', '10-Pack Euro Duck Feet', '10-Pack of Euro Duck Feet', '10-Pack of Duck Heads'],
        'Ears': ['6-Pack Natural Cow Ears', '6-Pack, Natural Cow Ears', '6-Pack Vanilla Cow Ears', '6-Pack, Vanilla Cow Ears', '6-Pack Honey Smoked Cow Ears', '6-Pack, Honey Smoked Cow Ears', '10-Pack of Fuzzy Bunny Ears', '10-Pack Fuzzy Rabbit Ears', '5-Pack Hairy Beef Ears'],
        'Feet': ['10-Pack Fuzzy Rabbit Feet', '10-Pack of Fuzzy Rabbit Feet', '10-Pack of Fuzzy Bunny Feet', '10-Pack Euro Chicken Feet', '10-Pack of Euro Chicken Feet', '10-Pack White Euro Chicken Feet', '10-Pack of White Euro Chicken Feet', '10-Pack Vanilla Euro Chicken Feet', '10-Pack of Vanilla Euro Chicken Feet'],
        'Chunky Cheeks': ['8oz. Bags of White Chunky Cheeks', '8oz. Bags of Vanilla Chunky Cheeks', '16oz. Bags of White Chunky Cheeks', '16oz. Bags of Vanilla Chunky Cheeks'],
        'Beef Lung': ['8oz. Bag of Beef Lung', '16oz. Bag of Beef Lung'],
        'Bully Pieces': ['8oz. Bag of Bully Pieces', '10oz. Bag of Bully Pieces', '16oz. Bag of Bully Pieces'],
        'Jerky': ['6oz. Bags of USA Elky Training Treats', '8oz. Bags of USA Elky Training Treats', '10oz. Bags of USA Elky Training Treats', '12oz. Bags of USA Elky Training Treats'],
        'Trachea Pieces': ['8oz. Bags of Beef Trachea Pieces', '16oz. Bags of Beef Trachea Pieces'],
        "Binky's": ["8oz. Bags of White Supreme Chips (Binkey's)", "8oz. Bags of Peanut Butter Supreme Chips (Binkey's)", "8oz. Bags of Vanilla Supreme Chips (Binkey's)", "16oz. Bags of White Supreme Chips (Binkey's)", "16oz. Bags of Peanut Butter Supreme Chips (Binkey's)", "16oz. Bags of Vanilla Supreme Chips (Binkey's)"]
    }
};

const PHOTO_PACKAGED_ITEMS = {
    'Duck and Goose': [
        '5-Pack of Crunchy Duck Heads',
        '10-Pack of Crunchy Duck Necks',
        '10-Pack of Crunchy Goose Necks',
        '10-Pack Euro Duck Feet',
        '10-Pack of Duck Heads'
    ],
    'Ears': [
        '6-Pack Natural Cow Ears',
        '6-Pack Vanilla Cow Ears',
        '6-Pack Honey Smoked Cow Ears',
        '10-Pack Fuzzy Rabbit Ears',
        '5-Pack Hairy Beef Ears'
    ],
    'Feet': [
        '10-Pack Fuzzy Rabbit Feet',
        '10-Pack Euro Chicken Feet',
        '10-Pack White Euro Chicken Feet',
        '10-Pack Vanilla Euro Chicken Feet'
    ],
    'Chunky Cheeks': [
        '8oz. Bags of White Chunky Cheeks',
        '8oz. Bags of Vanilla Chunky Cheeks',
        '16oz. Bags of White Chunky Cheeks',
        '16oz. Bags of Vanilla Chunky Cheeks'
    ],
    'Beef Lung': [
        '8oz. Bag of Beef Lung',
        '16oz. Bag of Beef Lung'
    ],
    'Bully Pieces': [
        '8oz. Bag of Bully Pieces',
        '10oz. Bag of Bully Pieces',
        '16oz. Bag of Bully Pieces'
    ],
    'Jerky': [
        '6oz. Bags of USA Elky Training Treats',
        '8oz. Bags of USA Elky Training Treats',
        '10oz. Bags of USA Elky Training Treats',
        '12oz. Bags of USA Elky Training Treats'
    ],
    'Trachea Pieces': [
        '8oz. Bags of Beef Trachea Pieces',
        '16oz. Bags of Beef Trachea Pieces'
    ],
    "Binky's": [
        "8oz. Bags of White Supreme Chips (Binkey's)",
        "8oz. Bags of Peanut Butter Supreme Chips (Binkey's)",
        "8oz. Bags of Vanilla Supreme Chips (Binkey's)",
        "16oz. Bags of White Supreme Chips (Binkey's)",
        "16oz. Bags of Peanut Butter Supreme Chips (Binkey's)",
        "16oz. Bags of Vanilla Supreme Chips (Binkey's)"
    ]
};

function packagedSubForName(name) {
    const needle = photoNameKey(name);
    if (!needle) return '';
    const keys = Object.keys(PHOTO_PACKAGED_ITEMS);
    for (let i = 0; i < keys.length; i++) {
        const names = PHOTO_PACKAGED_ITEMS[keys[i]];
        for (let n = 0; n < names.length; n++) {
            if (photoNameKey(names[n]) === needle) return keys[i];
        }
    }
    return '';
}

function getPhotoFamilies() {
    const oldFamilies = (typeof PHOTO_FAMILIES !== 'undefined' && Array.isArray(PHOTO_FAMILIES))
        ? PHOTO_FAMILIES
        : [];
    const list = [];
    const categories = Object.keys(PHOTO_GALLERY_TREE);
    categories.forEach(function (category) {
        const subs = PHOTO_GALLERY_TREE[category] || {};
        Object.keys(subs).forEach(function (sub) {
            if ((category === 'Ears' && sub === 'Packaged Ears') ||
                (category === 'Feet' && sub === 'Packaged Feet') ||
                (category === 'Duck and Goose' && sub === 'Packaged Duck and Goose')) {
                return;
            }
            const rawNames = subs[sub] || [];
            const names = [];
            const seen = {};
            rawNames.forEach(function (n) {
                const k = photoNameKey(n);
                if (!k || seen[k]) return;
                seen[k] = true;
                names.push(n);
            });
            if (!names.length) return;
            const nameSet = {};
            names.forEach(function (n) { nameSet[photoNameKey(n)] = true; });
            const matches = oldFamilies.filter(function (old) {
                return (old.names || []).some(function (n) { return nameSet[photoNameKey(n)]; });
            });
            const aliasKeys = matches.map(function (old) { return old.key; });
            names.forEach(function (n) {
                const leftover = photoFamilySlug(n);
                if (leftover && aliasKeys.indexOf(leftover) === -1) aliasKeys.push(leftover);
            });
            const key = photoFamilySlug(category + '-' + sub) || ('fam-' + list.length);
            if (aliasKeys.indexOf(key) === -1) aliasKeys.unshift(key);
            matches.forEach(function (old) {
                if (aliasKeys.indexOf(old.key) === -1) aliasKeys.push(old.key);
            });
            list.push({
                key: key,
                title: sub,
                category: category,
                names: names,
                aliasKeys: aliasKeys,
                kind: /packaged/i.test(category + ' ' + sub) ? 'packaged' : undefined
            });
        });
    });
    return list;
}

function getPhotoFamilyByKey(key) {
    return getPhotoFamilies().find(function (f) {
        if (f.key === key) return true;
        return (f.aliasKeys || []).indexOf(key) !== -1;
    }) || null;
}

function isRealPhotoPath(path) {
    const p = String(path || '');
    if (!p) return false;
    if (p === 'COMING_SOON' || p.indexOf('COMING_SOON/') === 0) return false;
    return /\.(jpe?g|png|webp|gif)$/i.test(p);
}

function photoPublicUrl(path) {
    if (!isRealPhotoPath(path)) return '';
    try {
        const pub = supabaseClient.storage.from(PHOTO_BUCKET).getPublicUrl(path);
        return (pub && pub.data && pub.data.publicUrl) || '';
    } catch (err) {
        return '';
    }
}

function isPackagedPhotoFamily(family) {
    if (!family) return false;
    if (family.kind === 'packaged' || family.linkedFamilyKey) return true;
    const blob = ((family.title || '') + ' ' + (family.names || []).join(' ')).toLowerCase();
    return /\b(6-pack|10-pack|8oz|10oz|16oz|bag|bags|display)\b/.test(blob) && !/\(bulk\)/.test(blob);
}

async function loadProductImages() {
    const { data, error } = await supabaseClient
        .from('product_images')
        .select('id, family_key, linked_family_key, scope, variant_name, is_card_hero, sort_order, storage_path, created_at')
        .order('sort_order', { ascending: true });
    if (error) throw error;
    _photoGalleryImages = data || [];
}

function photosForFamily(familyKey) {
    const family = getPhotoFamilyByKey(familyKey);
    const keys = {};
    keys[String(familyKey || '')] = true;
    if (family) {
        keys[String(family.key || '')] = true;
        (family.aliasKeys || []).forEach(function (k) {
            keys[String(k || '')] = true;
        });
    }
    const nameSet = {};
    if (family) {
        (family.names || []).forEach(function (n) {
            nameSet[photoNameKey(n)] = true;
        });
    }
    return (_photoGalleryImages || []).filter(function (row) {
        if (keys[String(row.family_key || '')]) return true;
        return !!(nameSet[photoNameKey(row.variant_name)]);
    });
}

function photoNameKey(value) {
    return String(value || '').toLowerCase().replace(/,/g, '').replace(/\s+/g, ' ').trim();
}

function isComingSoonPath(path) {
    const p = String(path || '');
    return p === 'COMING_SOON' || p.indexOf('COMING_SOON/') === 0;
}

function comingSoonStoragePath(familyKey, productName) {
    const slug = photoNameKey(productName).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
    return 'COMING_SOON/' + String(familyKey || 'item') + '/' + (slug || 'item');
}

function visiblePhotosForFamily(familyKey) {
    return photosForFamily(familyKey).filter(function (row) {
        return row.scope !== 'coming_soon' && !isComingSoonPath(row.storage_path);
    });
}

function productHasComingSoon(familyKey, productName) {
    const needle = photoNameKey(productName);
    if (!needle) return false;
    return (_photoGalleryImages || []).some(function (row) {
        return (row.scope === 'coming_soon' || isComingSoonPath(row.storage_path)) &&
            photoNameKey(row.variant_name) === needle;
    });
}

async function setAllPackagedComingSoon(enabled) {
    const families = getPhotoFamilies().filter(function (f) {
        return f.category === 'Packaged Items' || isPackagedPhotoFamily(f);
    });
    if (!families.length) {
        alert('No packaged items found.');
        return;
    }
    if (enabled && !confirm('Mark every packaged item as Photograph Coming Soon?')) return;
    if (!enabled && !confirm('Clear Photograph Coming Soon on every packaged item?')) return;
    try {
        for (let i = 0; i < families.length; i++) {
            const family = families[i];
            const names = family.names || [];
            for (let n = 0; n < names.length; n++) {
                const already = productHasComingSoon(family.key, names[n]);
                if (enabled && already) continue;
                if (!enabled && !already) continue;
                if (enabled) {
                    const { error } = await supabaseClient.from('product_images').insert({
                        family_key: family.key,
                        scope: 'variant',
                        variant_name: names[n],
                        storage_path: comingSoonStoragePath(family.key, names[n]),
                        is_card_hero: false,
                        sort_order: 999
                    });
                    if (error) throw error;
                } else {
                    const flags = photosForFamily(family.key).filter(function (row) {
                        return (row.scope === 'coming_soon' || isComingSoonPath(row.storage_path)) &&
                            photoNameKey(row.variant_name) === photoNameKey(names[n]);
                    });
                    for (let f = 0; f < flags.length; f++) {
                        const { error } = await supabaseClient.from('product_images').delete().eq('id', flags[f].id);
                        if (error) throw error;
                    }
                }
            }
        }
        await loadProductImages();
        renderProductPhotoGallery();
    } catch (err) {
        console.error(err);
        alert('Could not update packaged coming soon.\n' + (err.message || err));
        try {
            await loadProductImages();
            renderProductPhotoGallery();
        } catch (e) {}
    }
}


async function toggleProductComingSoon(familyKey, productName, enabled) {
    const key = familyKey || _photoGalleryFamilyKey;
    const name = String(productName || '').trim();
    if (!key || !name) return;
    try {
        if (enabled) {
            if (!productHasComingSoon(key, name)) {
                const { error } = await supabaseClient.from('product_images').insert({
                    family_key: key,
                    scope: 'variant',
                    variant_name: name,
                    storage_path: comingSoonStoragePath(key, name),
                    is_card_hero: false,
                    sort_order: 999
                });
                if (error) throw error;
            }
        } else {
            const flags = (_photoGalleryImages || []).filter(function (row) {
                return (row.scope === 'coming_soon' || isComingSoonPath(row.storage_path)) &&
                    photoNameKey(row.variant_name) === photoNameKey(name);
            });
            for (let i = 0; i < flags.length; i++) {
                const { error } = await supabaseClient.from('product_images').delete().eq('id', flags[i].id);
                if (error) throw error;
            }
        }
        await loadProductImages();
        renderProductPhotoGallery();
    } catch (err) {
        console.error(err);
        alert('Could not update coming-soon flag.\n' + (err.message || err));
    }
}

function heroForFamily(familyKey) {
    const rows = visiblePhotosForFamily(familyKey);
    return rows.find(function (r) {
        return r.is_card_hero && isRealPhotoPath(r.storage_path);
    }) || rows.find(function (r) {
        return isRealPhotoPath(r.storage_path);
    }) || null;
}

async function openProductPhotoGallery() {
    const modal = document.getElementById('product-photo-gallery-modal');
    if (!modal) {
        alert('Photo gallery modal is missing. Paste the HTML from step 2 first.');
        return;
    }
    _photoGalleryFamilyKey = null;
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    const sub = document.getElementById('photo-gallery-subtitle');
    if (sub) sub.textContent = 'Loading…';
    try {
        await loadProductImages();
        renderProductPhotoGallery();
    } catch (err) {
        console.error(err);
        if (sub) sub.textContent = 'Could not load photos. ' + (err.message || '');
    }
}

function hideProductPhotoGallery() {
    const modal = document.getElementById('product-photo-gallery-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.style.display = 'none';
    _photoGalleryFamilyKey = null;
}

function photoGalleryBackToGrid() {
    if (_photoGalleryFamilyKey) {
        _photoGalleryFamilyKey = null;
    } else {
        _photoGalleryCategory = null;
    }
    renderProductPhotoGallery();
}

function openPhotoGalleryCategory(category) {
    _photoGalleryCategory = category;
    _photoGalleryFamilyKey = null;
    renderProductPhotoGallery();
}

function onPhotoGalleryScopeChange() {
    const scopeEl = document.getElementById('photo-gallery-scope');
    const wrap = document.getElementById('photo-gallery-variant-wrap');
    if (!wrap) return;
    wrap.classList.toggle('hidden', !(scopeEl && scopeEl.value === 'product'));
}

function renderProductPhotoGallery() {
    const grid = document.getElementById('photo-gallery-grid');
    const familyView = document.getElementById('photo-gallery-family-view');
    const backBtn = document.getElementById('photo-gallery-back');
    const searchWrap = document.getElementById('photo-gallery-search-wrap');
    const sub = document.getElementById('photo-gallery-subtitle');
    if (!grid) return;

    if (_photoGalleryFamilyKey) {
        if (searchWrap) searchWrap.classList.add('hidden');
        grid.classList.add('hidden');
        if (familyView) familyView.classList.remove('hidden');
        if (backBtn) {
            backBtn.classList.remove('hidden');
            backBtn.textContent = '← ' + (_photoGalleryCategory || 'Subcategories');
        }
        renderProductPhotoFamilyView();
        return;
    }

    if (searchWrap) searchWrap.classList.remove('hidden');
    grid.classList.remove('hidden');
    if (familyView) familyView.classList.add('hidden');

    const q = String((document.getElementById('photo-gallery-search') || {}).value || '').toLowerCase().trim();
    const families = getPhotoFamilies();

    if (!_photoGalleryCategory) {
        if (backBtn) backBtn.classList.add('hidden');
        const cats = [];
        const seen = {};
        families.forEach(function (f) {
            const cat = String(f.category || 'Other');
            if (seen[cat]) return;
            seen[cat] = true;
            cats.push(cat);
        });
        const list = cats.filter(function (cat) {
            return !q || cat.toLowerCase().indexOf(q) !== -1;
        });
        if (sub) sub.textContent = 'Choose a category';
        grid.innerHTML = list.map(function (cat) {
            const count = families.filter(function (f) { return f.category === cat; }).length;
            const safe = String(cat).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            return (
                '<button type="button" onclick="openPhotoGalleryCategory(\'' + safe + '\')" ' +
                'class="text-left bg-[#f8f4eb] border-2 border-[#6B4423] rounded-xl p-4 hover:bg-[#f0e6d9]">' +
                '<p class="text-sm font-semibold brand-green">' + escapeHtml(cat) + '</p>' +
                '<p class="text-xs text-[#6B4423]">' + count + ' subcategor' + (count === 1 ? 'y' : 'ies') + '</p>' +
                '</button>'
            );
        }).join('') || '<p class="text-sm text-[#6B4423] col-span-full">No categories match that search.</p>';
        return;
    }

    if (backBtn) {
        backBtn.classList.remove('hidden');
        backBtn.textContent = '← All categories';
    }
    const subs = families.filter(function (f) {
        if (f.category !== _photoGalleryCategory) return false;
        if (f.category !== 'Packaged Items') {
            const title = String(f.title || '').toLowerCase();
            if (title === 'packaged ears' ||
                title === 'packaged feet' ||
                title === 'packaged duck and goose' ||
                title.indexOf('packaged') === 0) {
                return false;
            }
        }
        if (!q) return true;
        const hay = (f.title + ' ' + (f.names || []).join(' ')).toLowerCase();
        return hay.indexOf(q) !== -1;
    });
    if (sub) sub.textContent = _photoGalleryCategory + ' · choose a subcategory';
    const packagedBtns = (_photoGalleryCategory === 'Packaged Items')
        ? '<div class="col-span-full flex flex-wrap gap-2 mb-2">' +
            '<button type="button" onclick="setAllPackagedComingSoon(true)" class="px-3 py-2 text-sm bg-[#1E4D2B] text-[#d4b78f] font-semibold rounded-xl">Mark all packaged coming soon</button>' +
            '<button type="button" onclick="setAllPackagedComingSoon(false)" class="px-3 py-2 text-sm border-2 border-[#6B4423] rounded-xl hover:bg-[#f8f4eb]">Clear packaged coming soon</button>' +
          '</div>'
        : '';
    grid.innerHTML = packagedBtns + subs.map(function (f) {
        const hero = heroForFamily(f.key);
        const thumb = hero ? photoPublicUrl(hero.storage_path) : '';
        const safeKey = String(f.key).replace(/'/g, '');
        return (
            '<button type="button" onclick="openPhotoFamily(\'' + safeKey + '\')" ' +
            'class="text-left bg-[#f8f4eb] border-2 border-[#6B4423] rounded-xl overflow-hidden hover:bg-[#f0e6d9]">' +
            (thumb
                ? '<img src="' + escapeHtml(thumb) + '" alt="" class="w-full h-28 object-contain bg-white">'
                : '<div class="w-full h-28 bg-white flex items-center justify-center text-xs text-[#6B4423]">No photo yet</div>') +
            '<div class="p-2">' +
            '<p class="text-sm font-semibold brand-green">' + escapeHtml(f.title) + '</p>' +
            '<p class="text-xs text-[#6B4423]">' + (f.names || []).length + ' item' + ((f.names || []).length === 1 ? '' : 's') + '</p>' +
            '</div></button>'
        );
    }).join('') || '<p class="text-sm text-[#6B4423] col-span-full">No subcategories in this category.</p>';
}

function openPhotoFamily(key) {
    _photoGalleryFamilyKey = key;
    renderProductPhotoGallery();
}

function renderProductPhotoFamilyView() {
    const family = getPhotoFamilyByKey(_photoGalleryFamilyKey);
    const meta = document.getElementById('photo-gallery-family-meta');
    const photosEl = document.getElementById('photo-gallery-family-photos');
    const scopeEl = document.getElementById('photo-gallery-scope');
    const variantEl = document.getElementById('photo-gallery-variant');
    const sub = document.getElementById('photo-gallery-subtitle');
    if (!family || !photosEl) return;

    if (sub) sub.textContent = family.title;

    const rows = visiblePhotosForFamily(family.key);
    const uniqueNames = [];
    const seenNames = {};
    (family.names || []).forEach(function (n) {
        const k = photoNameKey(n);
        if (!k || seenNames[k]) return;
        seenNames[k] = true;
        uniqueNames.push(n);
    });
    if (meta) {
        const safeKey = String(family.key).replace(/'/g, '');
        meta.innerHTML =
            '<p class="mb-3">A photo set to Entire subcategory shows on every item here unless that item has its own photo.</p>' +
            '<div class="flex items-end justify-between gap-3 mb-2">' +
            '<p class="text-sm font-semibold text-[#6B4423]">Items in this subcategory</p>' +
            '<p class="text-xs font-semibold text-[#6B4423] w-28 text-center leading-tight">Mark as coming soon</p>' +
            '</div>' +
            '<div class="space-y-2">' +
            uniqueNames.map(function (n) {
                const coming = productHasComingSoon(family.key, n);
                const safeName = String(n).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                return '<label class="flex items-center justify-between gap-3 bg-white border-2 border-[#6B4423] rounded-xl px-3 py-2 cursor-pointer ' +
                    (coming ? 'opacity-70' : '') + '">' +
                    '<span class="' + (coming ? 'text-[#6B4423]' : 'text-[#1E4D2B]') + ' font-medium">' +
                    escapeHtml(n) +
                    (coming ? ' <span class="text-xs font-semibold">· Photograph coming soon</span>' : '') +
                    '</span>' +
                    '<span class="flex flex-col items-center w-28 shrink-0">' +
                    '<input type="checkbox" ' + (coming ? 'checked ' : '') +
                    'onchange="toggleProductComingSoon(\'' + safeKey + '\', \'' + safeName + '\', this.checked)">' +
                    '</span>' +
                    '</label>';
            }).join('') +
            '</div>';
    }

    if (scopeEl) {
        scopeEl.value = isPackagedPhotoFamily(family) ? 'packaged' : 'family';
        onPhotoGalleryScopeChange();
    }

    if (variantEl) {
        variantEl.innerHTML = (family.names || []).map(function (n) {
            return '<option value="' + escapeHtml(n) + '">' + escapeHtml(n) + '</option>';
        }).join('');
    }

    if (!rows.length) {
        photosEl.innerHTML = '<p class="text-sm text-[#6B4423]">No photos yet. Add the main product shot first.</p>';
        return;
    }

    photosEl.innerHTML = rows.map(function (row) {
        const url = photoPublicUrl(row.storage_path);
        const label = row.scope === 'variant'
            ? ('Flavor: ' + (row.variant_name || ''))
            : (row.scope === 'packaged' ? 'Packaged main' : 'Family / product');
        return (
            '<div class="border-2 border-[#6B4423] rounded-xl overflow-hidden bg-white">' +
            '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' +
            '<img src="' + escapeHtml(url) + '" alt="" class="w-full h-40 object-contain bg-[#f8f4eb]">' +
            '</a>' +
            '<div class="p-3">' +
            '<p class="text-xs font-semibold text-[#6B4423] mb-2">' + escapeHtml(label) +
            (row.is_card_hero ? ' · Card photo' : '') + '</p>' +
            '<div class="flex flex-wrap gap-2">' +
            (row.is_card_hero
                ? ''
                : '<button type="button" onclick="setPhotoAsCardHero(\'' + row.id + '\')" class="px-3 py-1.5 text-xs border-2 border-[#6B4423] rounded-lg hover:bg-[#f8f4eb]">Use as card photo</button>') +
            '<button type="button" onclick="removeProductPhoto(\'' + row.id + '\', \'' + String(row.storage_path || '').replace(/'/g, '') + '\')" class="px-3 py-1.5 text-xs border-2 border-red-600 text-red-700 rounded-lg hover:bg-red-50">Remove</button>' +
            '</div></div></div>'
        );
    }).join('');
}

function photoGalleryFileAllowed(file) {
    return ['image/jpeg', 'image/png', 'image/webp'].indexOf(String((file && file.type) || '').toLowerCase()) !== -1;
}

function syncPhotoGalleryQueueLabel() {
    const fileEl = document.getElementById('photo-gallery-file');
    const label = document.getElementById('photo-gallery-file-label');
    if (fileEl) {
        try {
            const dt = new DataTransfer();
            _photoGalleryQueue.forEach(function (file) { dt.items.add(file); });
            fileEl.files = dt.files;
        } catch (err) {}
    }
    if (!label) return;
    if (!_photoGalleryQueue.length) {
        label.textContent = 'Drop photos here, or choose files';
    } else if (_photoGalleryQueue.length === 1) {
        label.textContent = _photoGalleryQueue[0].name;
    } else {
        label.textContent = _photoGalleryQueue.length + ' photos selected';
    }
}

function enqueuePhotoGalleryFiles(list) {
    Array.from(list || []).forEach(function (file) {
        if (!photoGalleryFileAllowed(file)) return;
        const exists = _photoGalleryQueue.some(function (queued) {
            return queued.name === file.name && queued.size === file.size && queued.lastModified === file.lastModified;
        });
        if (!exists) _photoGalleryQueue.push(file);
    });
    syncPhotoGalleryQueueLabel();
}

function onPhotoGalleryFilePicked() {
    const fileEl = document.getElementById('photo-gallery-file');
    enqueuePhotoGalleryFiles(fileEl && fileEl.files);
}

function onPhotoGalleryDrop(event) {
    event.preventDefault();
    const drop = document.getElementById('photo-gallery-drop');
    if (drop) drop.classList.remove('ring-2', 'ring-[#1E4D2B]');
    if (!event.dataTransfer || !event.dataTransfer.files || !event.dataTransfer.files.length) return;
    const incoming = Array.from(event.dataTransfer.files).filter(photoGalleryFileAllowed);
    if (!incoming.length) {
        alert('Use JPG, PNG, or WebP files.');
        return;
    }
    enqueuePhotoGalleryFiles(incoming);
}


async function addProductPhoto() {
    const family = getPhotoFamilyByKey(_photoGalleryFamilyKey);
    const fileEl = document.getElementById('photo-gallery-file');
    const scopeEl = document.getElementById('photo-gallery-scope');
    const variantEl = document.getElementById('photo-gallery-variant');
    const btn = document.getElementById('photo-gallery-add-btn');
    const files = fileEl && fileEl.files ? Array.from(fileEl.files) : [];
    if (!family || !files.length) {
        alert('Choose a photo first.');
        return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    for (let i = 0; i < files.length; i++) {
        const type = String(files[i].type || '').toLowerCase();
        if (allowed.indexOf(type) === -1) {
            alert(files[i].name + ' is not a JPG, PNG, or WebP.');
            return;
        }
        if (files[i].size > 5 * 1024 * 1024) {
            alert(files[i].name + ' is over 5 MB.');
            return;
        }
    }

    const applyAs = (scopeEl && scopeEl.value) || 'subcategory';
    const scope = applyAs === 'product'
        ? 'variant'
        : (isPackagedPhotoFamily(family) ? 'packaged' : 'family');
    const variantName = applyAs === 'product' ? String((variantEl && variantEl.value) || '') : null;
    if (applyAs === 'product' && !variantName) {
        alert('Pick the product this photo belongs to.');
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Uploading…';
    }

    try {
        const { data: sessionData } = await supabaseClient.auth.getSession();
        const uid = sessionData && sessionData.session && sessionData.session.user && sessionData.session.user.id;
        let existing = photosForFamily(family.key);
        let hasHero = existing.some(function (r) {
            return r.is_card_hero && r.storage_path !== 'COMING_SOON';
        });

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const type = String(file.type || '').toLowerCase();
            const ext = type === 'image/png' ? '.png' : (type === 'image/webp' ? '.webp' : '.jpg');
            const path = family.key + '/' + (window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + '-' + i) + ext;
            const makeHero = scope !== 'variant' && !hasHero;

            const { error: upErr } = await supabaseClient.storage
                .from(PHOTO_BUCKET)
                .upload(path, file, { upsert: false, contentType: file.type, cacheControl: '3600' });
            if (upErr) throw upErr;

            const { error: insErr } = await supabaseClient.from('product_images').insert({
                family_key: family.key,
                linked_family_key: family.linkedFamilyKey || null,
                scope: scope,
                variant_name: variantName,
                is_card_hero: makeHero,
                sort_order: existing.length + i,
                storage_path: path,
                created_by: uid || null
            });
            if (insErr) throw insErr;
            if (makeHero) hasHero = true;
        }

        _photoGalleryQueue = [];
        fileEl.value = '';
        if (typeof syncPhotoGalleryQueueLabel === 'function') syncPhotoGalleryQueueLabel();
        await loadProductImages();
        renderProductPhotoGallery();
    } catch (err) {
        console.error(err);
        alert('Could not add photo.\n' + (err.message || err));
        try {
            await loadProductImages();
            renderProductPhotoGallery();
        } catch (e) {}
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Add photo';
        }
    }
}

async function setPhotoAsCardHero(id) {
    if (!_photoGalleryFamilyKey) return;
    const row = (_photoGalleryImages || []).find(function (r) { return String(r.id) === String(id); });
    if (row && typeof isComingSoonPath === 'function' && isComingSoonPath(row.storage_path)) {
        alert('That is a coming-soon flag, not a photo.');
        return;
    }
    try {
        const family = getPhotoFamilyByKey(_photoGalleryFamilyKey);
        const keys = [_photoGalleryFamilyKey].concat((family && family.aliasKeys) || []);
        for (let i = 0; i < keys.length; i++) {
            const { error: clearErr } = await supabaseClient
                .from('product_images')
                .update({ is_card_hero: false })
                .eq('family_key', keys[i]);
            if (clearErr) throw clearErr;
        }
        const { error } = await supabaseClient
            .from('product_images')
            .update({ is_card_hero: true })
            .eq('id', id);
        if (error) throw error;
        await loadProductImages();
        renderProductPhotoGallery();
    } catch (err) {
        console.error(err);
        alert('Could not set card photo.\n' + (err.message || err));
    }
}

async function removeProductPhoto(id, path) {
    if (!confirm('Remove this photo?')) return;
    try {
        if (path) {
            await supabaseClient.storage.from(PHOTO_BUCKET).remove([path]);
        }
        const { error } = await supabaseClient.from('product_images').delete().eq('id', id);
        if (error) throw error;
        await loadProductImages();
        renderProductPhotoGallery();
    } catch (err) {
        console.error(err);
        alert('Could not remove photo.\n' + (err.message || err));
    }
}
// ================== END PRODUCT PHOTO GALLERY ==================

// ================== END COMPANY BASE PRICE SHEET ==================

// ================== FINAL NOTE ==================
// All major systems have been included and updated.
// The file should now be in a working state with the new Customer Insights clickable cards.