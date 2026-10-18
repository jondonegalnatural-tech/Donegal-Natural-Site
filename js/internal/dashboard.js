// Internal portal — navigation, dashboard cards, insights, and activity log.
let currentInsightsFilter = 'all';

var ordersLoadedAt = 0;

var customersLoadedAt = 0;

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

window.filterCustomerInsights = filterCustomerInsights;
window.toggleCustomerInsights = toggleCustomerInsights;
window.refreshCustomerInsights = refreshCustomerInsights;
window.showSection = showSection;
window.toggleDashboardCustomize = toggleDashboardCustomize;
window.dashboardCardClick = dashboardCardClick;
window.goToLowStock = goToLowStock;
window.goToPendingPOs = goToPendingPOs;
window.goToOrderRecommendations = goToOrderRecommendations;
window.saveDashboardCardOrder = saveDashboardCardOrder;
window.applyDashboardCardOrder = applyDashboardCardOrder;
window.initDashboardDragAndDrop = initDashboardDragAndDrop;
window.updateDashboardSalesmen = updateDashboardSalesmen;
window.updateDashboardSales = updateDashboardSales;
window.getAdminActivityActor = getAdminActivityActor;
window.logAdminActivity = logAdminActivity;
window.loadAdminActivityLog = loadAdminActivityLog;
window.adminActivityRowHtml = adminActivityRowHtml;
window.openAdminActivityLogModal = openAdminActivityLogModal;
window.closeAdminActivityLogModal = closeAdminActivityLogModal;
window.isJonathanAdmin = isJonathanAdmin;
