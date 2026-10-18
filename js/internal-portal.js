// =====================================================
// INTERNAL-PORTAL.JS - Unified & Organized Version
// =====================================================

// ================== SUPABASE CLIENT ==================
// SUPABASE_URL and SUPABASE_ANON_KEY come from js/supabase-client.js

const GOOGLE_MAPS_API_KEY = 'AIzaSyA3w15On3HstCQaS_XfKNXbO0I0ipHsQCg';

var supabaseClient = window.supabaseClient;

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

var allCustomers = [];
var allOrders = [];
var currentFilter = 'all';

var currentOrdersView = 'all'; // 'all' | 'back'
var approvePendingBackOrders = []; // queued during Approve modal
    // queued during Ship modal
var salesmen = [];
var DATA_TTL_MS = 45000; // 45 seconds


var inquiriesLoadedAt = 0;

var inventoryLoadedAt = 0;

function isDataFresh(loadedAt) {
    return loadedAt > 0 && (Date.now() - loadedAt) < DATA_TTL_MS;
}

// showTableLoading moved to js/core/format.js
window.allOrders = allOrders;
window.allCustomers = allCustomers;
window.salesmen = salesmen;
window.currentFilter = currentFilter;
window.currentOrdersView = currentOrdersView;
window.approvePendingBackOrders = approvePendingBackOrders;


// ================== SHARED HELPER FUNCTIONS ==================
// Functions used by more than one section will be placed here.
// (We will move shared helpers into this section as we reorganize.)


// ================== BANK LOG (monthly + drill-down) ==================

          // raw ACH/bank orders
 // e.g. '2026-7' or null


// Salesman list, password reset, and order invoice modal live in js/internal/salesmen.js

// ================== PRODUCT CATALOG ==================


// ================== LOAD PRODUCT CATALOG FROM SUPABASE ==================

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


// ================== CUSTOMER APPROVALS ==================


// Wholesale inquiries live in js/internal/inquiries.js

// ================== DASHBOARD CUSTOMIZE (DRAG & DROP) ==================


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


// Framework stub only — future auto-create when inventory would go negative
// function maybeAutoCreateBackOrderFromInventory(productName, requestedQty) { ... }


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


// ================== VENDORS SYSTEM ==================
var vendors = [];


// ================== ADD VENDOR – CATEGORIES + PRODUCTS ==================
   // holds product names while the chooser is open


// ================== COST OF GOODS ==================
var productCosts = [];


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


// ================== INGREDIENTS (Supabase) ==================


// ================== PROFIT MARGIN ANALYSIS ==================


// ================== PROFIT MARGIN RENDER FUNCTIONS ==================

   // 'all' | 'outperform' | 'underperform'


// ================== LEGAL / FORMS ==================
// Access is gated by admin portal session (no client-side shared password)


// Pending value is set by updateDashboardOrders (order-item prices at submission).
// Do not overwrite with catalog prices.

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


// Product photo gallery lives in js/internal/products.js


// ================== END COMPANY BASE PRICE SHEET ==================

// ================== FINAL NOTE ==================
// All major systems have been included and updated.
// The file should now be in a working state with the new Customer Insights clickable cards.