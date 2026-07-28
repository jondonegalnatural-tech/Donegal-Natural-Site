// =====================================================
// INTERNAL-PORTAL.JS - Unified & Organized Version
// =====================================================

// ================== SUPABASE CLIENT ==================
const SUPABASE_URL = 'https://kyzfdlzqlckrpdkavxei.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5emZkbHpxbGNrcnBka2F2eGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3ODU0NjEsImV4cCI6MjEwMDM2MTQ2MX0.Y1Sshp1-0lFwKakCgpJtAUpaHNB0PQ1vuo6SOHZcPu4';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// =====================================================

// ================== GLOBAL VARIABLES ==================
let currentMatrixStartDate = null;
let currentMatrixMetric = 'units';
let currentInsightsFilter = 'all';
let allCustomers = [];
let allOrders = [];
let currentFilter = 'all';
let salesmen = JSON.parse(localStorage.getItem('salesmen')) || [];

// ================== SHARED HELPER FUNCTIONS ==================
// Functions used by more than one section will be placed here.
// (We will move shared helpers into this section as we reorganize.)

function filterCustomerInsights(filterType) {
    currentInsightsFilter = filterType;
    refreshCustomerInsights();
}

function showSection(section) {
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
        currentFilter = 'all';          // always start on All Orders
        if (typeof loadOrders === 'function') {
            loadOrders();
        } else if (typeof renderOrdersTable === 'function') {
            renderOrdersTable();
        }
    }

    // === Inquiries ===
    if (section === 'inquiries') {
        if (typeof renderInquiries === 'function') {
            setTimeout(() => renderInquiries(), 80);
        }
    }

    // === Customers ===
        if (section === 'customers') {
        if (typeof loadCustomers === 'function') {
            loadCustomers();   // loads from Supabase and then calls renderCustomers
        }
        setTimeout(() => {
            if (typeof initCustomerMap === 'function') initCustomerMap();
        }, 400);
    }

    // === Reports ===
    if (section === 'reports') {
        if (typeof updateReportsSalesSummary === 'function') {
            setTimeout(() => updateReportsSalesSummary(), 80);
        }
        if (typeof renderWeeklyMatrix === 'function') {
            setTimeout(() => renderWeeklyMatrix(), 100);
        }
        if (typeof refreshCustomerInsights === 'function') {
            setTimeout(() => refreshCustomerInsights(), 120);
        }
        if (typeof renderVendors === 'function') {
        setTimeout(() => renderVendors(), 100);
        }
        if (typeof renderCostOfGoods === 'function') {
        setTimeout(() => renderCostOfGoods(), 100);
        }
        if (typeof renderProfitMarginSection === 'function') {
        setTimeout(() => renderProfitMarginSection(), 150);
        }
        if (typeof renderProfitMarginSection === 'function') {
        setTimeout(() => renderProfitMarginSection(), 150);
        }
        renderIngredients();
        
       
    }

    // === Dashboard ===
    if (section === 'dashboard') {
    if (typeof updateDashboardSales === 'function') {
        updateDashboardSales();
    }
    if (typeof updatePendingPOIndicators === 'function') {
        updatePendingPOIndicators();
    }
}

    if (typeof updateDashboardOrders === 'function') updateDashboardOrders();
}

// ================== SALESMEN ==================
// --- Salesmen Helpers ---

function saveSalesmen() {
    localStorage.setItem('salesmen', JSON.stringify(salesmen));
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

function renderSalesmen() {
    const list = document.getElementById('salesmen-list');
    if (!list) return;

    // Reload from storage in case array is stale
    salesmen = JSON.parse(localStorage.getItem('salesmen') || '[]');

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
        const monthly = s.monthlySales != null
            ? '$' + Number(s.monthlySales).toLocaleString()
            : '—';
        const yearly = s.yearlySales != null
            ? '$' + Number(s.yearlySales).toLocaleString()
            : '—';

        const card = document.createElement('div');
        card.className = 'bg-white border-2 border-[#6B4423] rounded-2xl p-6 cursor-pointer hover:shadow-lg transition';
        card.onclick = () => showSalesmanDetail(s.id);

        card.innerHTML = `
            <div class="flex items-center gap-4 mb-4">
                <div class="w-14 h-14 bg-[#1E4D2B] rounded-full flex items-center justify-center">
                    <i class="fas fa-user text-[#d4b78f] text-2xl"></i>
                </div>
                <div>
                    <h3 class="text-xl font-bold brand-green ${isActive ? '' : 'line-through text-gray-400'}">${s.name || [s.firstName, s.lastName].filter(Boolean).join(' ') || 'Unnamed'}</h3>
                    <p class="text-sm text-[#6B4423]">Territory: <strong>${s.territory || '—'}</strong></p>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4 text-sm mb-3">
                <div>
                    <p class="text-[#6B4423] text-xs">Yearly Sales</p>
                    <p class="font-semibold brand-green">${yearly}</p>
                </div>
                <div class="text-right">
                    <p class="text-[#6B4423] text-xs">Commission</p>
                    <p class="font-semibold brand-green">${s.commission != null ? s.commission + '%' : '—'}</p>
                </div>
            </div>
            <div class="flex justify-between text-sm">
                <div>
                    <p class="text-[#6B4423]">Status</p>
                    <p class="font-semibold ${isActive ? 'text-green-600' : 'text-gray-400'}">${isActive ? 'Active' : 'Inactive'}</p>
                </div>
                <div class="text-right">
                    <p class="text-[#6B4423]">This Month Sales</p>
                    <p class="font-semibold brand-green">${monthly}</p>
                </div>
            </div>
        `;

        list.appendChild(card);
    });
}


// ================== PRODUCT CATALOG ==================
const PRODUCT_CATALOG = [
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



// ================== USER & AUTHENTICATION ==================
function logout() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem("currentUser");
        window.location.href = "login-portal.html";
    }
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

    populateCategoryDropdown();

    const weeks = getFourWeekWindow();
    currentMatrixWeeks = weeks;
    currentMatrixStartDate = weeks[0].start;

    const searchTerm = (document.getElementById('matrix-search')?.value || '').toLowerCase().trim();
    const selectedCategory = document.getElementById('matrix-category')?.value || 'all';

    let filteredCatalog = PRODUCT_CATALOG.filter(product => {
        const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
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
    const select = document.getElementById('matrix-category');
    if (!select) return;

    const categories = [...new Set(PRODUCT_CATALOG.map(p => p.category))];
    select.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });
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

// ================== ORDERS ==================
// --- Orders Helpers ---
async function loadOrders() {
    try {
        const { data, error } = await supabaseClient
            .from('orders')
            .select('*')
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
                items: o.items || []
            }));
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
            if (item.isMarketPrice || item.unitPrice === null || item.unitPrice === undefined) {
                hasMarketPrice = true;
            } else {
                const price = parseFloat(item.unitPrice) || 0;
                const qty = parseInt(item.quantity, 10) || 0;
                total += price * qty;
            }
        });
        return { total, hasMarketPrice };
    }

    let html = `
    <div class="mb-3 flex justify-between items-center">
        <button id="print-selected-btn"
                onclick="printSelectedOrders()"
                class="hidden px-4 py-2 bg-[#1E4D2B] text-[#d4b78f] rounded-xl text-sm font-semibold hover:bg-[#254a2f]">
            Print Selected Orders
        </button>
    </div>
    <table class="w-full">
        <thead>
            <tr class="bg-[#1E4D2B] text-[#d4b78f]">
                <th class="p-3 text-center w-10">
                    <input type="checkbox" id="select-all-orders" onchange="toggleSelectAllOrders(this)">
                </th>
                <th class="p-3 text-left">Order ID</th>
                <th class="p-3 text-left">Salesman</th>
                <th class="p-3 text-left">Customer</th>
                <th class="p-3 text-left">Total</th>
                <th class="p-3 text-left">Status</th>
                <th class="p-3 text-left">Date</th>
            </tr>
        </thead>
        <tbody>
`;

    filteredOrders.forEach(order => {
        const currentStatus = order.status || 'submitted';
        const statusLower = (currentStatus || '').toLowerCase();
        const { total, hasMarketPrice } = getOrderTotalInfo(order);
        const safeId = String(order.id || '');

        let totalHTML = '';
        if (hasMarketPrice) {
            totalHTML = `<span class="text-orange-600 font-semibold">Needs Pricing</span>`;
        } else {
            totalHTML = `$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }

        let statusHTML = '';
        if (statusLower === 'pending' || statusLower === 'submitted' || statusLower === '') {
            if (hasMarketPrice) {
                statusHTML = `
                    <button onclick="openMarketPriceModal('${safeId}'); event.stopImmediatePropagation()"
                            class="text-xs px-3 py-1 rounded bg-orange-500 text-white hover:bg-orange-600">
                        Set Market Prices
                    </button>
                `;
            } else {
                statusHTML = `
                    <div class="flex gap-2">
                        <button onclick="updateOrderStatus('${safeId}', 'received'); event.stopImmediatePropagation()"
                                class="text-xs px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700">
                            Approve
                        </button>
                        <button onclick="denyOrder('${safeId}'); event.stopImmediatePropagation()"
                                class="text-xs px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700">
                            Deny
                        </button>
                    </div>
                `;
            }
        } else if (statusLower === 'received') {
            statusHTML = `
                <button onclick="updateOrderStatus('${safeId}', 'processing'); event.stopImmediatePropagation()"
                        class="text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">
                    Move to Processing
                </button>
            `;
        } else if (statusLower === 'processing') {
            statusHTML = `
    <button onclick="openShipInvoiceModal('${safeId}'); event.stopImmediatePropagation()"
            class="text-xs px-3 py-1 rounded bg-purple-600 text-white hover:bg-purple-700">
        Move to Shipped
    </button>
`;
        } else if (statusLower === 'shipped') {
            statusHTML = `
                <span class="text-xs px-3 py-1 rounded bg-purple-100 text-purple-800 font-medium">
                    Awaiting Delivery
                </span>
            `;
        } else if (statusLower === 'delivered') {
            statusHTML = `
                <span class="text-xs px-3 py-1 rounded bg-orange-500 text-white">
                    Delivered
                </span>
            `;
        } else if (statusLower === 'denied') {
            statusHTML = `
                <span class="text-xs px-3 py-1 rounded bg-red-600 text-white">
                    Denied
                </span>
            `;
        } else {
            statusHTML = `
                <span class="text-xs px-3 py-1 rounded bg-gray-200">
                    ${currentStatus}
                </span>
            `;
        }

        html += `
            <tr class="border-t border-[#6B4423] hover:bg-[#f8f4eb]">
                <td class="p-3 text-center" onclick="event.stopPropagation()">
                    <input type="checkbox" class="order-checkbox" value="${safeId}" onchange="updatePrintSelectedButton()">
                </td>
                <td class="p-3 font-mono cursor-pointer" onclick="showOrderDetails('${safeId}')">#${safeId.slice(0, 8)}</td>
                <td class="p-3">${order.salesman || 'N/A'}</td>
                <td class="p-3">${order.customer || 'N/A'}</td>
                <td class="p-3">${totalHTML}</td>
                <td class="p-3">${statusHTML}</td>
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

        await loadOrders();
    } catch (err) {
        console.error(err);
        alert('Could not deny order.\n' + (err.message || ''));
    }
}

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

    const subtotal = getShipInvoiceSubtotal();
    const locationText = getShipInvoiceLocationText(shipInvoiceOrder);

    let free = false;
    let reason = '';

    if (subtotal >= 2000 && isWestOfMississippiLocation(locationText)) {
        free = true;
        reason = 'Free shipping: $2,000+ west of the Mississippi';
    } else if (subtotal >= 200 && isPennsylvaniaLocation(locationText)) {
        free = true;
        reason = 'Free shipping: $200+ in Pennsylvania';
    }

    const noteEl = document.getElementById('ship-inv-shipping-note');

    if (free) {
        shippingEl.value = '0.00';
        shippingEl.readOnly = true;
        shippingEl.classList.add('bg-gray-100');
        if (noteEl) noteEl.textContent = reason;
    } else {
        shippingEl.readOnly = false;
        shippingEl.classList.remove('bg-gray-100');
        if (noteEl) noteEl.textContent = 'Enter shipping amount ($)';
        const current = parseFloat(shippingEl.value);
        shippingEl.value = (!isNaN(current) && current >= 0)
            ? current.toFixed(2)
            : '0.00';
    }
}
let shipInvoiceOrder = null;
let shipInvoiceItems = [];

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

    const searchEl = document.getElementById('ship-inv-product-search');
    if (searchEl) searchEl.value = '';
    const resultsEl = document.getElementById('ship-inv-product-results');
    if (resultsEl) {
        resultsEl.innerHTML = '';
        resultsEl.classList.add('hidden');
    }

    renderShipInvoiceItems();
    recalcShipInvoiceTotals();

    document.getElementById('ship-invoice-modal')?.classList.remove('hidden');
}

function hideShipInvoiceModal() {
    document.getElementById('ship-invoice-modal')?.classList.add('hidden');
    shipInvoiceOrder = null;
    shipInvoiceItems = [];
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

        return `
            <div class="flex flex-wrap items-center gap-2 border border-[#d4b78f] rounded-xl px-3 py-2 bg-[#f8f4eb]">
                <div class="flex-1 min-w-[160px]">
                    <p class="font-semibold text-sm brand-green">${item.product}</p>
                    <p class="text-xs text-[#6B4423]">${priceLabel}${item.caseSize ? ' · ' + item.caseSize : ''}</p>
                </div>
                <input type="number" min="1" step="1" value="${item.quantity}"
                       onchange="updateShipInvoiceQty(${index}, this.value)"
                       class="w-20 border-2 border-[#6B4423] rounded-lg px-2 py-1 text-sm">
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
    const total = subtotal + shipping;

    const subEl = document.getElementById('ship-inv-subtotal');
    const totEl = document.getElementById('ship-inv-total');
    if (subEl) subEl.textContent = '$' + subtotal.toFixed(2);
    if (totEl) totEl.textContent = '$' + total.toFixed(2);
}

async function confirmShipInvoice() {
    if (!shipInvoiceOrder) return;

    if (!shipInvoiceItems.length) {
        alert('Invoice must have at least one line item.');
        return;
    }

    const shipping = parseFloat(document.getElementById('ship-inv-shipping')?.value);
    if (isNaN(shipping) || shipping < 0) {
        alert('Enter a valid shipping amount (0 or higher).');
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
                items: itemsPayload
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

        hideShipInvoiceModal();
        await loadOrders();
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

    const now = new Date();
    const tenDaysAgo = new Date(now);
    tenDaysAgo.setDate(now.getDate() - 10);

    allOrders.forEach(order => {
        const status = (order.status || '').toString().trim().toLowerCase();

        if (status === 'pending' || status === 'submitted' || status === '') {
            pending++;
        } else if (status === 'received') {
            received++;
            // Check aging
            const orderDate = new Date(order.submittedAt || order.date || now);
            if (orderDate < tenDaysAgo) agingCount++;
        } else if (status === 'processing') {
            processing++;
            // Check aging
            const orderDate = new Date(order.submittedAt || order.date || now);
            if (orderDate < tenDaysAgo) agingCount++;
        }
    });

    // Update the numbers
    const pendingEl = document.getElementById('dash-pending-count');
    const receivedEl = document.getElementById('dash-received-count');
    const processingEl = document.getElementById('dash-processing-count');

    if (pendingEl) pendingEl.textContent = pending;
    if (receivedEl) receivedEl.textContent = received;
    if (processingEl) processingEl.textContent = processing;

    // Aging alert
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

    // Update pending dollar value
    if (typeof updateDashboardPendingValue === 'function') {
        updateDashboardPendingValue();
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
    const order = allOrders.find(o => o.id === orderId);
    if (!order) {
        alert("Order not found.");
        return;
    }
    let itemsList = order.items ? order.items.map(i => `• ${i.product} x${i.quantity}`).join('\n') : 'No items';
    let details = `Order #${order.id}\n\n`;
    details += `Salesman: ${order.salesman || 'N/A'}\n`;
    details += `Customer: ${order.customer || 'N/A'}\n`;
    details += `Status: ${order.status || 'Submitted'}\n`;
    details += `Date: ${new Date(order.submittedAt).toLocaleString()}\n\n`;
    details += `Items:\n${itemsList}\n\n`;
    details += `Notes: ${order.notes || 'None'}\n`;
    alert(details);
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

function hideAddOrderModal() {
    const modal = document.getElementById('add-order-modal');
    if (modal) modal.classList.add('hidden');
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
    if (typeof salesmen === 'undefined' || !Array.isArray(salesmen)) {
        salesmen = JSON.parse(localStorage.getItem('salesmen') || '[]');
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
        return `
            <button type="button"
                    onclick="selectOrderProduct('${safeName}')"
                    class="w-full text-left px-4 py-2 text-sm hover:bg-[#f8f4eb] border-b border-[#f0e6d9] last:border-0">
                <span class="font-medium text-[#1E4D2B]">${p.name}</span>
                <span class="block text-xs text-[#6B4423] mt-0.5">Case size: ${caseSize} · Qty is in units</span>
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

        return `
            <div class="flex flex-wrap items-center gap-3 bg-white border border-[#6B4423] rounded-xl px-3 py-2">
                <div class="flex-1 min-w-[140px]">
                    <span class="text-sm font-medium text-[#1E4D2B]">${p.name}</span>
                    <span class="block text-xs text-[#6B4423]">Case: ${caseSize} · Enter units</span>
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
        submitted_at: new Date().toISOString()
    };

    try {
        const { error } = await supabaseClient
            .from('orders')
            .insert([payload]);

        if (error) throw error;

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

function updateDashboardVendors() {
    // Active / Inactive counts
    const activeCount = vendors.filter(v => v.active !== false).length;
    const inactiveCount = vendors.filter(v => v.active === false).length;

    const activeEl = document.getElementById('dash-active-vendors');
    const inactiveEl = document.getElementById('dash-inactive-vendors');

    if (activeEl) activeEl.textContent = activeCount;
    if (inactiveEl) inactiveEl.textContent = inactiveCount;

    // Total Purchases YTD
    const ytdEl = document.getElementById('dash-vendor-ytd');
    if (!ytdEl) return;

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    let ytdTotal = 0;

    vendors.forEach(vendor => {
        if (!vendor.purchases) return;
        vendor.purchases.forEach(p => {
            const purchaseDate = new Date(p.date);
            if (purchaseDate >= startOfYear) {
                ytdTotal += parseFloat(p.amount) || 0;
            }
        });
    });

    ytdEl.textContent = '$' + ytdTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// Optional: make it rotate every 4 seconds
setInterval(() => {
    if (document.getElementById('dashboard')?.style.display !== 'none') {
        updateDashboardVendors();
    }
}, 4000);

function toggleSelectAllOrders(checkbox) {
    const checkboxes = document.querySelectorAll('.order-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = checkbox.checked;
    });
    updatePrintSelectedButton();
}

function updatePrintSelectedButton() {
    const checked = document.querySelectorAll('.order-checkbox:checked');
    const btn = document.getElementById('print-selected-btn');
    if (!btn) return;

    if (checked.length > 0) {
        btn.classList.remove('hidden');
        btn.textContent = `Print Selected Orders (${checked.length})`;
    } else {
        btn.classList.add('hidden');
    }
}

function printSelectedOrders() {
    const checked = document.querySelectorAll('.order-checkbox:checked');
    if (checked.length === 0) {
        alert('Please select at least one order to print.');
        return;
    }

    const selectedIds = Array.from(checked).map(cb => parseInt(cb.value, 10));
    const ordersToPrint = allOrders.filter(o => selectedIds.includes(o.id));

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
    try {
        const { data, error } = await supabaseClient
            .from('customers')
            .select('*')
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
                payment_method_status: c.payment_method_status || null
            }));
        }
    } catch (err) {
        console.error(err);
        allCustomers = [];
    }

    renderCustomers();
}

function renderCustomers() {
    const container = document.getElementById('customer-list');
    if (!container) return;

    const searchTerm = (document.getElementById('customer-search')?.value || '').toLowerCase().trim();

    let filteredCustomers = allCustomers;
    if (searchTerm) {
        filteredCustomers = allCustomers.filter(c =>
            c.name.toLowerCase().includes(searchTerm) ||
            (c.company && c.company.toLowerCase().includes(searchTerm))
        );
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

    let html = '';
    filteredCustomers.forEach(customer => {
        const balanceClass = customer.balance > 0 ? 'text-red-600' : 'text-green-600';
        const isAchApproved =
            String(customer.payment_method || '').toLowerCase() === 'ach' &&
            String(customer.payment_method_status || '').toLowerCase() === 'approved';

        if (isAchApproved) {
            console.log('ACH badge for:', customer.name, customer.payment_method, customer.payment_method_status);
        }

        html += `
            <div onclick="showCustomerDetail('${customer.name}')" class="bg-white border-2 border-[#6B4423] rounded-2xl p-6 cursor-pointer hover:shadow-lg transition">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-xl font-bold brand-green">
                            ${customer.name}
                        </h3>
                        <p class="text-sm text-[#6B4423]">${customer.company || 'Individual'}</p>
                    </div>
                    <div class="flex flex-col items-end gap-1">
                        <span class="px-3 py-1 text-xs font-semibold rounded-full ${customer.status === 'Active' || customer.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}">
                            ${customer.status || 'Active'}
                        </span>
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
            </div>
        `;
    });

    container.innerHTML = html;
}

function updateTotalOrdersBadge() {
    const badge = document.getElementById('orders-total-count');
    if (!badge) return;

    // Always show current total orders in the system
    const total = (typeof allOrders !== 'undefined' && Array.isArray(allOrders))
        ? allOrders.length
        : JSON.parse(localStorage.getItem('submittedOrders') || '[]').length;

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
        'new-customer-address',
        'new-customer-notes'
    ];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

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
    const address = (document.getElementById('new-customer-address')?.value || '').trim();
    const territory = (document.getElementById('new-customer-territory')?.value || '').trim();
    const notes = (document.getElementById('new-customer-notes')?.value || '').trim();

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
    if (!address) {
        alert('Address is required.');
        return;
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
                shipping_address: address,
                billing_address: address,
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

function showCustomerDetail(customerName) {
    const customer = allCustomers.find(c => c.name === customerName);
    if (!customer) return;

    const modal = document.getElementById('customer-modal');
    if (!modal) return;

    // Store id on the modal so edit/save can use it
    modal.dataset.customerId = customer.id || '';

    document.getElementById('modal-customer-name').textContent = customer.name;
    document.getElementById('modal-customer-company').textContent = customer.company || '';
    document.getElementById('modal-customer-status').textContent = customer.status || 'Active';
    document.getElementById('modal-customer-phone').textContent = customer.phone || 'N/A';
    document.getElementById('modal-customer-email').textContent = customer.email || 'N/A';
    document.getElementById('modal-customer-territory').textContent = customer.territory || 'N/A';
    document.getElementById('modal-customer-balance').textContent = '$' + (customer.balance || 0).toLocaleString();

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

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

function hideEditCustomerModal() {
    const modal = document.getElementById('edit-customer-modal');
    if (modal) modal.style.display = 'none';
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

    if (!name) {
        alert('Customer name is required.');
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('customers')
            .update({
                name: name,
                company: company || null,
                email: email || null,
                phone: phone || null,
                territory: territory || null,
                shipping_address: address || null,
                notes: notes || null,
                updated_at: new Date().toISOString()
            })
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
let customerMap;

async function initCustomerMap() {
    const mapContainer = document.getElementById('customer-map');
    if (!mapContainer || typeof L === 'undefined') return;

    // Remove old map instance if it exists
    if (customerMap) {
        customerMap.remove();
        customerMap = null;
    }

    // Default view that matches the wider eastern US view you showed
    customerMap = L.map('customer-map').setView([41.0, -77.5], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(customerMap);

    // Force correct sizing after the tab becomes visible
    setTimeout(() => {
        if (customerMap) {
            customerMap.invalidateSize();
        }
    }, 200);

    // Load customers
        if (!allCustomers || allCustomers.length === 0) {
        await loadCustomers();
    }

        allCustomers.forEach(customer => {
        const addr = customer.shippingAddress || customer.address || customer.shipping_address || '';
        if (!addr) return;

        // Temporary random positions until real geocoding is added
        const lat = 40.5 + (Math.random() - 0.5) * 2;
        const lng = -78.4 + (Math.random() - 0.5) * 3;

        const marker = L.marker([lat, lng]).addTo(customerMap);
        marker.bindPopup(
            `<b>${customer.name}</b><br>${customer.company || ''}<br>${addr}`
        );
    });
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
        if (!order.items) return;
        const orderDate = new Date(order.submittedAt);
        let orderTotal = 0;

        order.items.forEach(item => {
            orderTotal += (item.quantity || 1) * getOrderItemUnitPrice(item);
        });

        if (orderDate >= startOfYear) ytdSales += orderTotal;
        if (orderDate >= startOfMonth) mtdSales += orderTotal;
        if (orderDate >= startOfWeek) wtdSales += orderTotal;
    });

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="bg-[#f8f4eb] rounded-xl p-5 text-center">
                <p class="text-sm text-[#6B4423]">Year to Date</p>
                <p class="text-3xl font-bold brand-green mt-1">$${ytdSales.toLocaleString()}</p>
            </div>
            <div class="bg-[#f8f4eb] rounded-xl p-5 text-center">
                <p class="text-sm text-[#6B4423]">Month to Date</p>
                <p class="text-3xl font-bold brand-green mt-1">$${mtdSales.toLocaleString()}</p>
            </div>
            <div class="bg-[#f8f4eb] rounded-xl p-5 text-center">
                <p class="text-sm text-[#6B4423]">Week to Date</p>
                <p class="text-3xl font-bold brand-green mt-1">$${wtdSales.toLocaleString()}</p>
            </div>
            <div class="bg-[#f8f4eb] rounded-xl p-5 text-center">
                <p class="text-sm text-[#6B4423]">Total Orders</p>
                <p class="text-3xl font-bold brand-green mt-1">${totalOrders}</p>
            </div>
        </div>

        <div class="mt-6 text-xs text-[#6B4423] text-center">
            Using $50 placeholder value per item • Real pricing will be connected later
        </div>
    `;
}

function showSalesmanDetail(salesmanId = null) {
    const modal = document.getElementById('salesman-modal');
    if (!modal) {
        console.error("ERROR: salesman-modal not found in HTML");
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
        console.error("No salesman data available");
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
    setValue('modal-commission', salesman.commission != null ? salesman.commission : 8);
    setValue('modal-market-commission', salesman.marketCommission != null ? salesman.marketCommission : 3);
    setText('modal-yearly-sales', '$' + (Number(salesman.yearlySales) || 0).toLocaleString());
    setText('modal-monthly-sales', '$' + (Number(salesman.monthlySales) || 0).toLocaleString());
    setText('modal-quotes', salesman.quotesSubmitted || 0);
    setValue('modal-notes', salesman.notes || '');

    modal.style.display = 'flex';
    modal.classList.remove('hidden');
}

async function hideSalesmanModal() {
    const modal = document.getElementById('salesman-modal');
    if (!modal) return;

    const salesmanId = modal.dataset.salesmanId;
    const commissionEl = document.getElementById('modal-commission');
    const marketEl = document.getElementById('modal-market-commission');
    const notesEl = document.getElementById('modal-notes');

    const commission = commissionEl ? parseFloat(commissionEl.value) : null;
    const marketCommission = marketEl ? parseFloat(marketEl.value) : null;
    const notes = notesEl ? notesEl.value.trim() : '';

    if (salesmanId) {
        const salesman = salesmen.find(s => String(s.id) === String(salesmanId));
        if (salesman) {
            if (!isNaN(commission)) salesman.commission = commission;
            if (!isNaN(marketCommission)) salesman.marketCommission = marketCommission;
            salesman.notes = notes;
        }

        // Persist to Supabase
        try {
            const payload = {
                notes: notes || null
            };
            if (!isNaN(commission)) payload.commission = commission;
            if (!isNaN(marketCommission)) payload.market_commission = marketCommission;

            const { error } = await supabaseClient
                .from('salesmen')
                .update(payload)
                .eq('id', salesmanId);

            if (error) throw error;

            // Keep localStorage in sync for other helpers
            saveSalesmen();
            if (typeof renderSalesmen === 'function') renderSalesmen();
            if (typeof updateDashboardSalesmen === 'function') updateDashboardSalesmen();
        } catch (err) {
            console.error(err);
            alert('Could not save salesman changes.\n' + (err.message || ''));
        }
    }

    modal.style.display = 'none';
    modal.classList.add('hidden');
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

    if (!firstName || !lastName || !territory) {
        alert("Please fill in First Name, Last Name, and Territory.");
        return;
    }

    if (!email) {
        alert("Email is required.");
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('salesmen')
            .insert({
                first_name: firstName,
                last_name: lastName,
                email: email,
                territory: territory,
                commission: commission,
                market_commission: marketCommission,
                price_sheet_status: 'required',
                yearly_sales: 0,
                monthly_sales: 0,
                active: true
            })
            .select()
            .single();

        if (error) {
            console.error(error);
            alert("Failed to add salesman.\n" + error.message);
            return;
        }

        alert(`Salesman ${firstName} ${lastName} has been added successfully!`);
        hideAddSalesmanModal();
        document.getElementById('add-salesman-form').reset();

        // Refresh the Salesmen section and dashboard card
        if (typeof renderSalesmen === 'function') renderSalesmen();
        if (typeof updateDashboardSalesmen === 'function') updateDashboardSalesmen();

    } catch (err) {
        console.error(err);
        alert("Something went wrong while adding the salesman.");
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
        const typeLabel = p.type === 'initialPriceSheet' ? 'Initial Pricing Sheet' : 'Price Change';

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

        const date = new Date(p.submittedAt).toLocaleDateString();
        const typeLabel = p.type === 'initialPriceSheet' ? 'Initial Pricing Sheet' : 'Price Change';

        const itemRows = (p.items || []).map(item => `
            <div class="border border-[#d4b78f] rounded-xl p-3 mb-2 bg-[#f8f4eb]">
                <p class="font-semibold brand-green">${item.product}</p>
                <p class="text-sm text-[#6B4423] mt-1">
                    Catalog: <strong>${item.catalogPrice != null ? "$" + Number(item.catalogPrice).toFixed(2) : "—"}</strong>
                    → Proposed: <strong class="text-[#c56134]">$${Number(item.proposedPrice).toFixed(2)}</strong>
                    ${item.belowCatalog ? ' <span class="text-red-600 text-xs">(below catalog)</span>' : ''}
                </p>
            </div>
        `).join("");

        list.innerHTML = `
            <button type="button" onclick="showPriceProposalsPanel()"
                    class="mb-4 text-sm text-[#6B4423] hover:underline">
                ← Back to list
            </button>

            <div class="border-2 border-[#6B4423] rounded-2xl p-4">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <p class="font-bold text-lg brand-green">${p.salesmanName || "Salesman"}</p>
                        <p class="text-sm text-[#6B4423]">${typeLabel} · ${date} · ${(p.items || []).length} product(s)</p>
                    </div>
                    <span class="px-3 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">
                        Pending
                    </span>
                </div>

                ${p.overallNotes ? `<p class="text-sm text-[#6B4423] mb-3"><strong>Notes:</strong> ${p.overallNotes}</p>` : ""}

                <div class="max-h-64 overflow-y-auto mb-4">
                    ${itemRows || "<p class='text-sm text-[#6B4423]'>No items</p>"}
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
    } catch (err) {
        console.error(err);
        list.innerHTML = `<p class="text-red-600 text-center py-8">Error loading proposal.</p>`;
    }
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
            // First try to find existing sheet
            const { data: existing } = await supabaseClient
                .from('salesman_price_sheets')
                .select('id, prices')
                .eq('salesman_email', email)
                .maybeSingle();

            if (existing) {
                // Merge with any existing prices
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
                // Create new sheet
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

function denyPriceProposal(id) {
    const reason = prompt("Reason for denying this proposal (required):", "");
    if (reason === null) return;
    if (!reason.trim()) {
        alert("A denial reason is required.");
        return;
    }

    let all = JSON.parse(localStorage.getItem("salesmanProposals") || "[]");
    const proposal = all.find(p => p.id === id);
    if (!proposal) return;

    proposal.status = "Denied";
    proposal.denialReason = reason.trim();
    proposal.decidedAt = new Date().toISOString();
    localStorage.setItem("salesmanProposals", JSON.stringify(all));

    alert("Proposal denied.");

    updatePriceProposalsBadge();
    showPriceProposalsPanel();
}

// ================== WHOLESALE INQUIRIES (Supabase) ==================
let inquiries = [];

async function loadInquiries() {
    try {
        const { data, error } = await supabaseClient
            .from('wholesale_inquiries')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        inquiries = data || [];
    } catch (err) {
        console.error('Error loading inquiries:', err);
        inquiries = [];
    }
}

function updateInquiryStats() {
    const pending  = inquiries.filter(i => (i.status || '').toLowerCase() === 'pending').length;
    const approved = inquiries.filter(i => (i.status || '').toLowerCase() === 'approved').length;
    const denied   = inquiries.filter(i => (i.status || '').toLowerCase() === 'denied').length;

    const pendingEl  = document.getElementById('pending-count');
    const approvedEl = document.getElementById('approved-count');
    const deniedEl   = document.getElementById('denied-count');

    if (pendingEl)  pendingEl.textContent  = pending;
    if (approvedEl) approvedEl.textContent = approved;
    if (deniedEl)   deniedEl.textContent   = denied;

    const dashPending  = document.getElementById('dash-pending-inquiries');
    const dashApproved = document.getElementById('dash-approved-inquiries');
    const dashDenied   = document.getElementById('dash-denied-inquiries');

    if (dashPending)  dashPending.textContent  = pending;
    if (dashApproved) dashApproved.textContent = approved;
    if (dashDenied)   dashDenied.textContent   = denied;
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

function createInquiryCard(inquiry, showActions) {
    const div = document.createElement('div');
    div.className = 'border border-[#d4b78f] rounded-xl p-5 mb-4 bg-[#f8f4eb]';

    const status = (inquiry.status || 'pending').toLowerCase();
    const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
    const submitted = inquiry.created_at
        ? new Date(inquiry.created_at).toLocaleDateString()
        : '—';

    const nature = inquiry.nature_other
        ? `${inquiry.nature_of_business} (${inquiry.nature_other})`
        : (inquiry.nature_of_business || '—');

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

function toggleIaSameAddress() {
    const same = document.getElementById('ia-same-address');
    const shipping = document.getElementById('ia-shipping');
    const billing = document.getElementById('ia-billing');
    if (!same || !shipping || !billing) return;

    if (same.checked) {
        billing.value = shipping.value;
        billing.readOnly = true;
        billing.classList.add('bg-gray-100');
    } else {
        billing.readOnly = false;
        billing.classList.remove('bg-gray-100');
    }
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
        let shipping = '';
        let billing = '';
        const shipMatch = notesText.match(/Shipping:\s*(.+?)(?:\n|$)/i);
        const billMatch = notesText.match(/Billing:\s*(.+?)(?:\n|$)/i);
        if (shipMatch) shipping = shipMatch[1].trim();
        if (billMatch) billing = billMatch[1].trim();

        document.getElementById('ia-shipping').value = shipping;
        document.getElementById('ia-billing').value = billing || shipping;
        document.getElementById('ia-same-address').checked = !billing || billing === shipping;
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
        const regionHint = (inquiry.region || shipping || notesText || '').toLowerCase();

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
    const shipping = document.getElementById('ia-shipping').value.trim();
    const same = document.getElementById('ia-same-address').checked;
    const billing = same ? shipping : document.getElementById('ia-billing').value.trim();
    const adminNotes = document.getElementById('ia-notes').value.trim();
    const salesmanSelect = document.getElementById('ia-salesman');
    const salesmanId = salesmanSelect.value;

    if (!name || !company || !email) {
        alert('Name, company, and email are required.');
        return;
    }
    if (!salesmanId) {
        alert('You must assign a salesman before approving.');
        return;
    }

    const selectedOpt = salesmanSelect.options[salesmanSelect.selectedIndex];
    const salesmanEmail = selectedOpt.dataset.email || null;
    const salesmanName = selectedOpt.dataset.name || selectedOpt.textContent;

    const btn = document.getElementById('ia-confirm-btn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Saving…';
    }

    try {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const approvedBy = user.fullName || user.name || user.email || 'Admin';

        const notesParts = [];
        if (shipping) notesParts.push('Shipping: ' + shipping);
        if (billing) notesParts.push('Billing: ' + billing);
        if (adminNotes) notesParts.push('Admin notes: ' + adminNotes);
        notesParts.push('Approved by: ' + approvedBy);
        notesParts.push('Assigned salesman: ' + salesmanName);

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
            assigned_at: new Date().toISOString(),
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
            assigned_salesman_id: salesmanId
        };

        const { error: updateError } = await supabaseClient
            .from('wholesale_inquiries')
            .update(updatePayload)
            .eq('id', inquiryId);

        if (updateError) throw updateError;

        hideInquiryApprovalModal();
        await renderInquiries();

        alert(
            'Inquiry approved.\n' +
            'Customer created.\n' +
            'Login account created.\n' +
            'Assigned to: ' + salesmanName + '\n\n' +
            'Customer login (email + temp password):\n' +
            'Email: ' + email + '\n' +
            'Password: ' + tempPassword + '\n\n' +
            '(Email delivery will be automated later)'
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

        // Only use columns that exist in the live schema
        const { error } = await supabaseClient
            .from('wholesale_inquiries')
            .update({
                status: 'denied',
                notes: 'Denied by ' + deniedBy + ': ' + reason.trim()
            })
            .eq('id', id);

        if (error) throw error;

        await renderInquiries();
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
// --- Inventory Helpers ---

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
    } catch (err) {
        console.error('loadInventory error:', err);
        inventory = {};
    }
}

async function upsertInventoryQuantity(productName, quantity) {
    try {
        const { error } = await supabaseClient
            .from('inventory')
            .upsert(
                {
                    product_name: productName,
                    quantity: quantity,
                    updated_at: new Date().toISOString()
                },
                { onConflict: 'product_name' }
            );

        if (error) throw error;
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
    await loadInventory();
    showCurrentInventory();
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

function updateDashboardLowStock() {
    ensureInventoryInitialized();

    let lowStockCount = 0;

    Object.keys(inventory).forEach(name => {
        const qty = inventory[name] || 0;
        // Count anything under 50 cases (including 0)
        if (qty < 50) {
            lowStockCount++;
        }
    });

    const lowStockEl = document.getElementById('dash-low-stock-count');
    if (lowStockEl) {
        lowStockEl.textContent = lowStockCount;
    }
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
    if (typeof inventory === 'undefined' || inventory === null) {
        inventory = JSON.parse(localStorage.getItem('inventory') || '{}');
    }

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

    showSection('reports');

    setTimeout(() => {
        if (typeof renderWeeklyMatrix === 'function') {
            renderWeeklyMatrix();
        }

        const el = document.getElementById('weekly-matrix-section')
            || document.getElementById('weekly-matrix-container');

        if (!el) return;

        // Scroll so the section top is below the sticky nav
        const navOffset = 90;
        const top = el.getBoundingClientRect().top + window.pageYOffset - navOffset;

        window.scrollTo({
            top: top,
            behavior: 'smooth'
        });
    }, 350);
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
        showSection('reports');
        setTimeout(() => {
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
window.onload = function() {
    loadUser();

    // Show dashboard by default
    const dashboard = document.getElementById('dashboard');
    if (dashboard) dashboard.style.display = 'block';

    // Load orders first
    if (typeof loadOrders === 'function') {
        loadOrders();
    }

    // Then update dashboard numbers
    if (typeof updateDashboardSales === 'function') {
        updateDashboardSales();
    }
        if (typeof updatePendingPOIndicators === 'function') {
        updatePendingPOIndicators();
    }
    
    // Other initial renders
    if (typeof renderInquiries === 'function') renderInquiries();
    if (typeof updateInquiryStats === 'function') updateInquiryStats();
    if (typeof updateDashboardPendingCount === 'function') updateDashboardPendingCount();
        if (typeof updateDashboardVendors === 'function') {
        updateDashboardVendors();
    }
    if (typeof updateDashboardSalesmen === 'function') {
        updateDashboardSalesmen();
    }
    if (typeof updateDashboardProfitMargin === 'function') {
        updateDashboardProfitMargin();
    }
    if (typeof updateDashboardLowStock === 'function') {
        updateDashboardLowStock();
    }
        if (typeof initDashboardDragAndDrop === 'function') {
        initDashboardDragAndDrop();
    }
        if (typeof updateDashboardOrders === 'function') {
        updateDashboardOrders();
    }
    if (typeof updateDashboardSalesMatrix === 'function') {
        updateDashboardSalesMatrix();
    }
};

// ================== ADDITIONAL HELPER FUNCTIONS ==================
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
            <span onclick="updateOrderStatus(${order.id}, '${status}', this)" 
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
    currentFilter = 'all';
    if (typeof renderOrdersTable === 'function') {
        renderOrdersTable();
    }
}

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
        html += `<tr onclick="showOrderDetails(${order.id})" class="border-t border-[#6B4423] cursor-pointer hover:bg-[#f8f4eb]">
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
            .select('*')
            .eq('active', true)
            .order('yearly_sales', { ascending: false });

        if (error) {
            console.error("Error loading salesmen for dashboard:", error);
            salesmen = [];
        } else {
            salesmen = (data || []).map(s => ({
                id: s.id,
                firstName: s.first_name,
                lastName: s.last_name,
                name: [s.first_name, s.last_name].filter(Boolean).join(' '),
                email: s.email,
                territory: s.territory || '',
                commission: Number(s.commission) || 8,
                marketCommission: Number(s.market_commission) || 3,
                priceSheetStatus: s.price_sheet_status,
                yearlySales: Number(s.yearly_sales) || 0,
                monthlySales: Number(s.monthly_sales) || 0,
                active: s.active !== false
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

    const topSalesmen = activeList
        .map(s => ({
            name: s.name || [s.firstName, s.lastName].filter(Boolean).join(' ') || 'Unnamed',
            ytd: Number(s.yearlySales) || 0
        }))
        .sort((a, b) => b.ytd - a.ytd)
        .slice(0, 3);

    container.innerHTML = topSalesmen.map((s, i) => `
        <div class="flex justify-between items-center">
            <span class="font-medium truncate pr-2">${i + 1}. ${s.name}</span>
            <span class="font-semibold whitespace-nowrap">$${s.ytd.toLocaleString()}</span>
        </div>
    `).join('');

    if (typeof updatePriceProposalsBadge === "function") {
        updatePriceProposalsBadge();
    }
    if (typeof updateCustomerApprovalsBadge === "function") {
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

        const orderDate = new Date(order.submittedAt || order.date || now);
        let orderTotal = 0;
        let orderUnits = 0;

        order.items.forEach(item => {
            const qty = item.quantity || 1;
            orderTotal += qty * getOrderItemUnitPrice(item);
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

    if (ytdEl) ytdEl.textContent = '$' + ytdTotal.toLocaleString();
    if (mtdEl) mtdEl.textContent = '$' + mtdTotal.toLocaleString();
    if (wtdEl) wtdEl.textContent = '$' + wtdTotal.toLocaleString();
    if (ytdUnitsEl) ytdUnitsEl.textContent = ytdUnits.toLocaleString();
    if (mtdUnitsEl) mtdUnitsEl.textContent = mtdUnits.toLocaleString();
    if (wtdUnitsEl) wtdUnitsEl.textContent = wtdUnits.toLocaleString();
}

// ================== VENDORS SYSTEM ==================
let vendors = [];

async function loadVendors() {
    try {
        // 1. Fetch all vendors
        const { data: vendorRows, error: vErr } = await supabaseClient
            .from('vendors')
            .select('*')
            .order('name');

        if (vErr) throw vErr;

        // 2. Fetch all purchases
        const { data: purchaseRows, error: pErr } = await supabaseClient
            .from('vendor_purchases')
            .select('*')
            .order('created_at', { ascending: false });

        if (pErr) throw pErr;

        // 3. Fetch all items
        const { data: itemRows, error: iErr } = await supabaseClient
            .from('vendor_purchase_items')
            .select('*');

        if (iErr) throw iErr;

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

    modal.classList.remove('hidden');
    if (nameEl) nameEl.focus();
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

function showVendorDetail(vendorId) {
    const vendor = vendors.find(v => v.id === vendorId);
    if (!vendor) return;

    window.currentVendorId = vendorId;

    if (vendor.active === undefined) vendor.active = true;

    // Basic info
    document.getElementById('vendor-modal-name').textContent = vendor.name || 'Vendor';
    document.getElementById('vendor-modal-contact').textContent = vendor.contact || 'No contact listed';
    document.getElementById('vendor-modal-phone').textContent = vendor.phone || 'N/A';
    document.getElementById('vendor-modal-email').textContent = vendor.email || 'N/A';
    document.getElementById('vendor-modal-notes').textContent = vendor.notes || 'None';

    // Status badge + toggle button
    const isActive = vendor.active !== false;
    const statusHTML = isActive
        ? `<span class="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700 mr-2">Active</span>
           <button onclick="toggleVendorStatus()" class="px-3 py-1 text-xs border border-red-400 text-red-600 rounded-lg hover:bg-red-50">Mark Inactive</button>`
        : `<span class="px-3 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-600 mr-2">Inactive</span>
           <button onclick="toggleVendorStatus()" class="px-3 py-1 text-xs border border-green-600 text-green-700 rounded-lg hover:bg-green-50">Mark Active</button>`;

    const statusArea = document.getElementById('vendor-status-area');
    if (statusArea) statusArea.innerHTML = statusHTML;

    // Recent Orders (last 5)
    const purchases = (vendor.purchases || []).slice(0, 5);
    let purchaseHTML = '';

    if (purchases.length === 0) {
        purchaseHTML = `<p class="text-sm text-[#6B4423]">No orders yet.</p>`;
    } else {
        purchaseHTML = `<div class="space-y-2">`;
        purchases.forEach(p => {
            const dateObj = new Date(p.date);
            const formattedDate = `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}/${dateObj.getFullYear()}`;

            // FIXED: use the items array that loadVendors builds
            const productCount = (p.items && p.items.length) ? p.items.length : (p.quantity || 0);

            purchaseHTML += `
                <div class="flex justify-between items-center text-sm border-b border-[#d4b78f] pb-2">
                    <span>${formattedDate}</span>
                    <span class="font-semibold">${productCount} product(s)</span>
                    <span class="font-bold brand-green">$${Number(p.amount || 0).toFixed(2)}</span>
                </div>
            `;
        });
        purchaseHTML += `</div>`;
    }

    const historyContainer = document.querySelector('#vendor-modal .bg-\\[\\#f8f4eb\\]');
    if (historyContainer) {
        historyContainer.innerHTML = `
            <p class="text-sm text-[#6B4423] font-semibold mb-3">Recent Orders (last 5)</p>
            ${purchaseHTML}
        `;
    }

    document.getElementById('vendor-modal').classList.remove('hidden');
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
    document.getElementById('vendor-modal').classList.add('hidden');
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

// ================== INGREDIENTS ==================
let productIngredients = JSON.parse(localStorage.getItem('productIngredients')) || null;

// Default data (used only the first time)
function getDefaultIngredients() {
    return [
        // ===== JERKY STICK TREATS =====
        {
            id: 1,
            group: "Jerky Stick Treats",
            name: "USA Beef Jerky Treats",
            ingredients: "Ground Beef Meat, Rice Flour, Spices, Sugar, Salt and Garlic Powder",
            notForHuman: true,
            analysis: { protein: "29.60%", fat: "18.70%", fiber: "0.21%", moisture: "32.70%" }
        },
        {
            id: 2,
            group: "Jerky Stick Treats",
            name: "USA Turkey Jerky Treats",
            ingredients: "Ground Turkey Meat, Rice Flour, Spices, Sugar, Salt and Garlic Powder",
            notForHuman: true,
            analysis: { protein: "30.80%", fat: "16.90%", fiber: "0.25%", moisture: "32.20%" }
        },
        {
            id: 3,
            group: "Jerky Stick Treats",
            name: "USA Chicken Jerky Treats",
            ingredients: "Ground Chicken Meat, Rice Flour, Spices, Sugar, Salt and Garlic Powder",
            notForHuman: true,
            analysis: { protein: "31.20%", fat: "16.40%", fiber: "0.25%", moisture: "32.00%" }
        },
        {
            id: 4,
            group: "Jerky Stick Treats",
            name: "USA Elky Jerky Treats/Squares",
            ingredients: "Ground Elk Meat, Rice Flour, Spices, Sugar, Salt and Garlic Powder",
            notForHuman: true,
            analysis: { protein: "29.60%", fat: "18.70%", fiber: "0.21%", moisture: "32.70%" }
        },
        {
            id: 5,
            group: "Jerky Stick Treats",
            name: "USA Venison & Sweet Potato Jerky Treats",
            ingredients: "Ground Venison, Sweet Potato, Rice Flour, Spices, Sugar, Salt and Garlic Powder",
            notForHuman: true,
            analysis: { protein: "27.50%", fat: "17.80%", fiber: "1.80%", moisture: "31.50%" }
        },

        // ===== NATURAL VANILLA =====
        {
            id: 10,
            group: "Natural Vanilla",
            name: "Vanilla Rollios (all sizes + PHAT)",
            ingredients: "Flavored with natural vanilla",
            notForHuman: false,
            analysis: null
        },
        {
            id: 11,
            group: "Natural Vanilla",
            name: "Vanilla Cow Ears / Lamb Ears / Ox Tails / Chicken Feet",
            ingredients: "Flavored with natural vanilla",
            notForHuman: false,
            analysis: null
        },
        {
            id: 12,
            group: "Natural Vanilla",
            name: "Vanilla Cow Cheek Slabs & Chunky Cheeks",
            ingredients: "Flavored with natural vanilla",
            notForHuman: false,
            analysis: null
        },
        {
            id: 13,
            group: "Natural Vanilla",
            name: "Vanilla Supreme Chips / Binky’s / Retrievers / Braided Donuts / Twisty Q’s",
            ingredients: "Flavored with natural vanilla",
            notForHuman: false,
            analysis: null
        },

        // ===== NATURAL HONEY + SMOKE =====
        {
            id: 20,
            group: "Natural Honey + Smoke",
            name: "Honey Smoked Rollios (all sizes + PHAT)",
            ingredients: "Natural honey and natural smoke flavoring",
            notForHuman: false,
            analysis: null
        },
        {
            id: 21,
            group: "Natural Honey + Smoke",
            name: "Honey Smoked Cow Ears / MAGNA Buffalo Ears / Ox Tails",
            ingredients: "Natural honey and natural smoke flavoring",
            notForHuman: false,
            analysis: null
        },
        {
            id: 22,
            group: "Natural Honey + Smoke",
            name: "Smoked Cow Hooves",
            ingredients: "Natural smoke flavoring",
            notForHuman: false,
            analysis: null
        },

        // ===== ALL NATURAL PEANUT BUTTER =====
        {
            id: 30,
            group: "All Natural Peanut Butter",
            name: "Peanut Butter Rollios",
            ingredients: "All natural peanut butter",
            notForHuman: false,
            analysis: null
        },
        {
            id: 31,
            group: "All Natural Peanut Butter",
            name: "Peanut Butter Stuffed Buffalo Bone",
            ingredients: "All natural peanut butter",
            notForHuman: false,
            analysis: null
        },
        {
            id: 32,
            group: "All Natural Peanut Butter",
            name: "Peanut Butter Supreme Chips / Binky’s",
            ingredients: "All natural peanut butter",
            notForHuman: false,
            analysis: null
        }
    ];
}

// Load or create the data
if (!productIngredients) {
    productIngredients = getDefaultIngredients();
    localStorage.setItem('productIngredients', JSON.stringify(productIngredients));
}

function saveIngredients() {
    localStorage.setItem('productIngredients', JSON.stringify(productIngredients));
}

function renderIngredients() {
    const container = document.getElementById('ingredients-list');
    const searchInput = document.getElementById('ingredients-search');
    if (!container) return;

    const search = (searchInput?.value || '').toLowerCase();
    container.innerHTML = '';

    // Group items
    const groups = {};
    productIngredients.forEach(item => {
        if (search &&
            !item.name.toLowerCase().includes(search) &&
            !item.group.toLowerCase().includes(search)) {
            return;
        }
        if (!groups[item.group]) groups[item.group] = [];
        groups[item.group].push(item);
    });

    Object.keys(groups).forEach(groupName => {
        // Group header
        const header = document.createElement('div');
        header.className = 'mt-5 mb-2';
        header.innerHTML = `<h3 class="text-lg font-bold brand-green border-b border-[#d4b78f] pb-1">${groupName}</h3>`;
        container.appendChild(header);

        groups[groupName].forEach(item => {
            const isExpanded = window.expandedIngredients && window.expandedIngredients[item.id];

            const card = document.createElement('div');
            card.className = 'border border-[#d4b78f] rounded-xl overflow-hidden mb-2';

            let analysisHTML = '';
            if (item.analysis) {
                analysisHTML = `
                    <div class="mt-3">
                        <p class="font-semibold mb-2">Guaranteed Analysis</p>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                            <div class="bg-[#f8f4eb] rounded-lg py-2">
                                <p class="text-xs text-[#6B4423]">Protein</p>
                                <p class="font-bold">${item.analysis.protein}</p>
                            </div>
                            <div class="bg-[#f8f4eb] rounded-lg py-2">
                                <p class="text-xs text-[#6B4423]">Acid Fat</p>
                                <p class="font-bold">${item.analysis.fat}</p>
                            </div>
                            <div class="bg-[#f8f4eb] rounded-lg py-2">
                                <p class="text-xs text-[#6B4423]">Crude Fiber</p>
                                <p class="font-bold">${item.analysis.fiber}</p>
                            </div>
                            <div class="bg-[#f8f4eb] rounded-lg py-2">
                                <p class="text-xs text-[#6B4423]">Moisture</p>
                                <p class="font-bold">${item.analysis.moisture}</p>
                            </div>
                        </div>
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="flex items-center justify-between px-4 py-3 bg-[#f8f4eb] cursor-pointer hover:bg-[#f0e6d9]"
                     onclick="toggleIngredient(${item.id})">
                    <span class="font-medium">${item.name}</span>
                    <span class="text-[#6B4423] text-lg">${isExpanded ? '▼' : '▶'}</span>
                </div>
                <div id="ingredient-detail-${item.id}" class="${isExpanded ? '' : 'hidden'} px-4 py-4 bg-white text-sm space-y-2">
                    <p><strong>Ingredients:</strong> ${item.ingredients}</p>
                    ${item.notForHuman ? '<p class="text-red-600 font-semibold">NOT FOR HUMAN CONSUMPTION</p>' : ''}
                    ${analysisHTML}
                    <div class="pt-3">
                        <button onclick="editIngredient(${item.id}); event.stopPropagation();"
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

function editIngredient(id) {
    const item = productIngredients.find(i => i.id === id);
    if (!item) return;

    const newIngredients = prompt("Edit Ingredients:", item.ingredients);
    if (newIngredients === null) return;

    item.ingredients = newIngredients.trim();

    if (item.analysis) {
        const protein = prompt("Protein % (number only):", item.analysis.protein.replace('%', ''));
        const fat     = prompt("Acid Fat % (number only):", item.analysis.fat.replace('%', ''));
        const fiber   = prompt("Crude Fiber % (number only):", item.analysis.fiber.replace('%', ''));
        const moisture = prompt("Moisture % (number only):", item.analysis.moisture.replace('%', ''));

        if (protein !== null && protein !== '') item.analysis.protein = protein + '%';
        if (fat !== null && fat !== '')         item.analysis.fat = fat + '%';
        if (fiber !== null && fiber !== '')     item.analysis.fiber = fiber + '%';
        if (moisture !== null && moisture !== '') item.analysis.moisture = moisture + '%';
    }

    saveIngredients();
    renderIngredients();
    alert("Ingredients saved successfully!");
}

// Modal open / close
function openIngredientsModal() {
    const modal = document.getElementById('ingredients-modal');
    if (modal) {
        modal.classList.remove('hidden');
        renderIngredients();
    }
}

function closeIngredientsModal() {
    const modal = document.getElementById('ingredients-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
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

    const data = getProductMarginData();
    let filtered = [];
    let title = 'Products';
    let subtitle = '';

    if (filter === 'search') {
        filtered = data.filter(p => p.name.toLowerCase().includes(searchTerm));
        title = 'Search Results';
        subtitle = `Showing products matching "${searchTerm}"`;
    } else {
        filtered = data;
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

function showLegalFormsSection() {
    if (isLegalFormsUnlocked()) {
        // Already unlocked — just show the section
        showSection('legal-forms');
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
    await loadVendors();
    if (typeof renderVendors === 'function') {
        renderVendors();
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

if (typeof refreshAchApprovalsBadge === 'function') {
    setTimeout(refreshAchApprovalsBadge, 500);
}
if (typeof loadUser === 'function') {
    loadUser();
}
// ================== ACH PAYMENT APPROVALS ==================

async function showAchApprovalsPanel() {
    const modal = document.getElementById('ach-approvals-modal');
    const list = document.getElementById('ach-approvals-list');
    if (!modal || !list) return;

    modal.classList.remove('hidden');
    list.innerHTML = `<p class="text-sm text-[#6B4423]">Loading…</p>`;

    try {
        const { data, error } = await supabaseClient
            .from('customers')
            .select('id, name, company, email, phone, payment_method, payment_method_status, created_at')
            .eq('payment_method', 'ach')
            .eq('payment_method_status', 'pending_admin')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            list.innerHTML = `<p class="text-sm text-[#6B4423]">No pending ACH requests.</p>`;
            updateAchApprovalsBadge(0);
            return;
        }

        updateAchApprovalsBadge(data.length);

        list.innerHTML = data.map(c => `
            <div class="border-2 border-[#6B4423] rounded-xl p-4 mb-3 bg-white">
                <div class="flex justify-between items-start gap-3">
                    <div>
                        <p class="font-bold brand-green">${c.name || ''}</p>
                        <p class="text-sm text-[#6B4423]">${c.company || ''}</p>
                        <p class="text-sm mt-1">${c.email || ''}</p>
                        ${c.phone ? `<p class="text-sm">${c.phone}</p>` : ''}
                    </div>
                    <div class="flex flex-col gap-2">
                        <button type="button"
                                onclick="setAchStatus('${c.id}', 'approved')"
                                class="px-4 py-2 bg-[#1E4D2B] text-[#d4b78f] rounded-xl text-sm font-semibold">
                            Approve
                        </button>
                        <button type="button"
                                onclick="setAchStatus('${c.id}', 'denied')"
                                class="px-4 py-2 border-2 border-[#6B4423] rounded-xl text-sm font-semibold text-[#6B4423]">
                            Deny
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
        list.innerHTML = `<p class="text-sm text-red-600">Could not load ACH requests.</p>`;
    }
}

function hideAchApprovalsPanel() {
    document.getElementById('ach-approvals-modal')?.classList.add('hidden');
}

async function setAchStatus(customerId, status) {
    if (!customerId || !status) return;
    if (!confirm(status === 'approved' ? 'Allow this customer to pay by ACH?' : 'Deny ACH for this customer?')) {
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('customers')
            .update({ payment_method_status: status })
            .eq('id', customerId);

        if (error) throw error;
        await showAchApprovalsPanel();
        await refreshAchApprovalsBadge();
    } catch (err) {
        console.error(err);
        alert('Could not update ACH status.\n' + (err.message || ''));
    }
}

function updateAchApprovalsBadge(count) {
    const badge = document.getElementById('ach-approvals-badge');
    if (!badge) return;
    if (count > 0) {
        badge.textContent = String(count);
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

async function refreshAchApprovalsBadge() {
    try {
        const { count, error } = await supabaseClient
            .from('customers')
            .select('id', { count: 'exact', head: true })
            .eq('payment_method', 'ach')
            .eq('payment_method_status', 'pending_admin');

        if (error) throw error;
        updateAchApprovalsBadge(count || 0);
    } catch (err) {
        console.error(err);
    }
}

// ================== FINAL NOTE ==================
// All major systems have been included and updated.
// The file should now be in a working state with the new Customer Insights clickable cards.