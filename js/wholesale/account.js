// Wholesale portal — stores, account, price list, and resale certificates.
function resolveActiveCustomer() {
    const accounts = window._customerAccounts || [];
    if (accounts.length === 0) {
        window._currentCustomer = null;
        return null;
    }
    if (accounts.length === 1) {
        window._currentCustomer = accounts[0];
        localStorage.setItem('activeCustomerId', accounts[0].id);
        return accounts[0];
    }
    const savedId = localStorage.getItem('activeCustomerId');
    let active = accounts.find(c => String(c.id) === String(savedId));
    if (!active) {
        active = accounts[0];
        localStorage.setItem('activeCustomerId', active.id);
    }
    window._currentCustomer = active;
    return active;
}

async function switchActiveCustomer(customerId) {
    const accounts = window._customerAccounts || [];
    const next = accounts.find(c => String(c.id) === String(customerId));
    if (!next) return;
    if (window._currentCustomer && String(window._currentCustomer.id) === String(next.id)) return;

    if (typeof _openQuoteSaveTimer !== 'undefined' && _openQuoteSaveTimer) {
        clearTimeout(_openQuoteSaveTimer);
        _openQuoteSaveTimer = null;
    }
    if (typeof persistOpenQuoteNow === 'function') {
        await persistOpenQuoteNow();
    }

    localStorage.setItem('activeCustomerId', String(next.id));
    window._currentCustomer = next;
    if (typeof loadOpenQuoteForActiveStore === 'function') {
        await loadOpenQuoteForActiveStore();
    }
    if (typeof applyBrianWholesaleSheetPrices === 'function') {
        await applyBrianWholesaleSheetPrices();
    }
    if (typeof renderCategoryFilters === 'function') renderCategoryFilters();
    if (typeof renderPortalProducts === 'function') renderPortalProducts();

    if (isCustomerInactive(next)) {
        applyInactiveSoftRestriction();
    } else {
        clearInactiveSoftRestriction();
    }

    if (typeof updateShippingPolicyCard === 'function') updateShippingPolicyCard();
    if (typeof displayWelcome === 'function') displayWelcome();
    if (typeof updateOrderingAsIndicator === 'function') updateOrderingAsIndicator();
    if (typeof updateQuoteSidebar === 'function') updateQuoteSidebar();
    if (typeof showAccountInfo === 'function') showAccountInfo();

    if (!next.onboarding_complete) {
        document.getElementById('onboarding-modal')?.classList.remove('hidden');
    }
}

window._customerAccounts = [];

function getStoreLabel(c) {
    if (!c) return 'Store';
    const company = (c.company || c.name || '').trim();
    const addr = (c.shipping_address || c.billing_address || c.territory || '').trim();
    const shortAddr = addr ? addr.split(',')[0].trim() : '';
    if (company && shortAddr) return `${company} — ${shortAddr}`;
    if (company) return company;
    if (shortAddr) return shortAddr;
    return c.id ? `Store ${String(c.id).slice(0, 8)}` : 'Store';
}

async function setActiveCustomer(id) {
    const accounts = window._customerAccounts || [];
    const found = accounts.find(c => String(c.id) === String(id));
    if (!found) return;

    window._currentCustomer = found;
    localStorage.setItem('activeCustomerId', String(found.id));
    if (typeof applyBrianWholesaleSheetPrices === 'function') {
        await applyBrianWholesaleSheetPrices();
    }

    // Refresh anything that depends on the active store
    if (typeof updateShippingPolicyCard === 'function') updateShippingPolicyCard();
    if (typeof renderCategoryFilters === 'function') renderCategoryFilters();
    if (typeof renderPortalProducts === 'function') renderPortalProducts();
    if (typeof updateOrderingAsIndicator === 'function') updateOrderingAsIndicator();
    if (typeof updateQuoteSidebar === 'function') updateQuoteSidebar();
}

function updateOrderingAsIndicator() {
    // Remove any existing chip
    document.getElementById('ordering-as-chip')?.remove();

    const accounts = window._customerAccounts || [];
    if (accounts.length <= 1) return;          // single-store → no chip

    const active = window._currentCustomer;
    if (!active) return;

    const label = getStoreLabel(active);

    // Prefer placing under the welcome name
    const welcome = document.getElementById('welcome-name');
    if (welcome && welcome.parentElement) {
        const chip = document.createElement('div');
        chip.id = 'ordering-as-chip';
        chip.className = 'text-xs text-[#6B4423] mt-0.5';
        chip.innerHTML = `Ordering as: <strong class="text-[#1E4D2B]">${escapeHtml(label)}</strong>
            <button type="button" onclick="document.querySelector('.sidebar-link[data-target=\\'section-account\\']')?.click()"
                    class="ml-1 underline hover:text-[#1E4D2B]">Change</button>`;
        welcome.parentElement.appendChild(chip);
    }
}

function buildStoreTabs(section, currentFilter, onSelect) {
    const accounts = window._customerAccounts || [];
    if (accounts.length <= 1) return '';   // single-store → no tabs

    const tabs = [
        { id: 'all', label: 'All Stores' },
        ...accounts.map(c => ({ id: String(c.id), label: getStoreLabel(c) }))
    ];

    return `
        <div class="flex flex-wrap gap-2 mb-5 border-b border-[#d4b78f] pb-3">
            ${tabs.map(t => {
                const active = String(currentFilter) === String(t.id);
                return `
                    <button type="button"
                            onclick="${onSelect}('${t.id}')"
                            class="px-3 py-1.5 text-sm font-semibold rounded-xl border-2 transition
                                   ${active
                                       ? 'bg-[#1E4D2B] text-[#d4b78f] border-[#1E4D2B]'
                                       : 'bg-white text-[#6B4423] border-[#6B4423] hover:bg-[#f8f4eb]'}">
                        ${escapeHtml(t.label)}
                    </button>`;
            }).join('')}
        </div>
    `;
}

function isCustomerInactive(c) {
    return !!c && String(c.status || '').toLowerCase() === 'inactive';
}

function applyInactiveSoftRestriction() {
    window._customerIsInactive = true;

    // Banner
    let banner = document.getElementById('inactive-restriction-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'inactive-restriction-banner';
        banner.className = 'w-full bg-amber-50 border-b-2 border-amber-500 text-amber-900 px-4 py-3 text-sm font-medium flex items-start gap-3 z-40';
        banner.innerHTML = `
            <i class="fas fa-exclamation-triangle text-amber-600 text-lg flex-shrink-0 mt-0.5"></i>
            <div>
                <strong>Account restricted.</strong>
                This store is currently marked Inactive. You can view Account details and Order History only.
                Contact your salesman or Donegal Natural to reactivate ordering.
            </div>
        `;
        const nav = document.querySelector('nav.sticky');
        if (nav && nav.parentNode) {
            nav.parentNode.insertBefore(banner, nav.nextSibling);
        } else {
            document.body.prepend(banner);
        }
    }
    banner.style.display = 'flex';

    // Hide Products + Quotes nav (desktop sidebar + mobile)
    document.querySelectorAll(
        '.sidebar-link[data-target="section-products"], .sidebar-link[data-target="section-quotes"]'
    ).forEach(el => {
        el.style.display = 'none';
    });

    // Hide quote sidebar completely
    const qs = document.getElementById('quote-sidebar');
    if (qs) {
        qs.classList.add('hidden');
        qs.classList.remove('flex');
        qs.style.display = 'none';
    }

    // Force Account section
    document.querySelectorAll('.portal-section').forEach(s => {
        s.style.display = 'none';
    });
    const accountSec = document.getElementById('section-account');
    if (accountSec) accountSec.style.display = 'block';

    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    const accountLink = document.querySelector('.sidebar-link[data-target="section-account"]');
    if (accountLink) {
        accountLink.classList.add('active');
        accountLink.style.display = ''; // ensure visible
    }

    if (typeof showAccountInfo === 'function') showAccountInfo();
}

function clearInactiveSoftRestriction() {
    window._customerIsInactive = false;

    const banner = document.getElementById('inactive-restriction-banner');
    if (banner) banner.style.display = 'none';

    // Phase 1: restore Products only — Quotes nav stays hidden
    document.querySelectorAll(
        '.sidebar-link[data-target="section-products"]'
    ).forEach(el => {
        el.style.display = '';
    });
    document.querySelectorAll(
        '.sidebar-link[data-target="section-quotes"]'
    ).forEach(el => {
        el.style.display = 'none';
    });

    const qs = document.getElementById('quote-sidebar');
    if (qs) {
        qs.style.display = '';
        // Desktop restores via CSS; mobile stays hidden until user opens it
        if (window.innerWidth >= 1024) {
            qs.classList.remove('hidden');
        }
    }
}

function getStoreBadgeForOrder(order) {
    const accounts = window._customerAccounts || [];
    if (accounts.length <= 1) return '';
    const match = accounts.find(c =>
        String(c.id) === String(order.customer_id) ||
        (c.company && order.customer_company && c.company.toLowerCase() === order.customer_company.toLowerCase())
    );
    if (!match) return '';
    return `<span class="inline-block ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-[#e8d9c2] text-[#1E4D2B]">${getStoreLabel(match)}</span>`;
}

const PRICE_LIST_EACH_NOTE = 'All prices are per piece, bag, or pack as listed. You may order any quantity — a full case is not required.';

function showAccountInfo() {
    const container = document.getElementById('account-details');
    if (!container) return;

    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!user) {
        container.innerHTML = `<p class="text-[#6B4423]">No user information found.</p>`;
        return;
    }

    const accounts = window._customerAccounts || [];
    const active = window._currentCustomer;

    let html = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
                <p class="text-sm text-[#6B4423] font-semibold">Login Email</p>
                <p class="text-lg">${escapeHtml(user.email || 'N/A')}</p>
            </div>
            <div>
                <p class="text-sm text-[#6B4423] font-semibold">Full Name</p>
                <p class="text-lg font-semibold">${escapeHtml(user.fullName || 'N/A')}</p>
            </div>
        </div>
    `;

    // Store selector (multi-store only)
    if (accounts.length > 1) {
        html += `
            <div class="mb-6 p-4 bg-[#f8f4eb] border-2 border-[#6B4423] rounded-xl">
                <label class="block text-sm font-semibold text-[#1E4D2B] mb-2">Active Store</label>
                <select id="store-selector"
                        class="w-full border-2 border-[#6B4423] rounded-xl px-4 py-2.5 text-sm font-medium"
                        onchange="switchActiveCustomer(this.value)">
                    ${accounts.map(c => `
                        <option value="${c.id}" ${active && String(c.id) === String(active.id) ? 'selected' : ''}>
                            ${getStoreLabel(c)}
                        </option>
                    `).join('')}
                </select>
                <p class="text-xs text-[#6B4423] mt-2">
                    Pricing, free-shipping thresholds, and new quotes use the selected store.
                    Quotes &amp; Order History still show activity for every store under this email.
                </p>
            </div>
        `;
    }

    if (!active) {
        html += `<p class="text-[#6B4423]">No store record found for this email.</p>`;
        container.innerHTML = html;
        return;
    }

    const pricingOk = !!active.pricing_approved_at;

    // ========== STORE DETAILS ==========
    html += `
        <div class="border-t border-[#d4b78f] pt-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="font-bold brand-green">
                    ${accounts.length > 1 ? 'Selected Store Details' : 'Store Details'}
                </h3>
                <button type="button" id="account-edit-btn"
                        class="px-4 py-1.5 text-sm border-2 border-[#6B4423] rounded-xl hover:bg-[#f8f4eb] font-semibold text-[#1E4D2B]">
                    Edit
                </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
                <div>
                    <p class="text-[#6B4423] font-semibold">Company / Store</p>
                    <p class="font-semibold text-[#1E4D2B]">${escapeHtml(active.company || active.name || '—')}</p>
                </div>
                <div>
                    <p class="text-[#6B4423] font-semibold">Contact name</p>
                    <p>${escapeHtml(active.name || '—')}</p>
                </div>
                <div>
                    <p class="text-[#6B4423] font-semibold">Phone</p>
                    <p>${escapeHtml((typeof formatPhoneDisplay === 'function' ? formatPhoneDisplay(active.phone) : active.phone) || '—')}</p>
                </div>
                <div>
                    <p class="text-[#6B4423] font-semibold">Assigned Salesman</p>
                <p id="account-assigned-salesman">${escapeHtml(active.salesman_email || '—')}</p>
                </div>
                <div class="md:col-span-2">
                    <p class="text-[#6B4423] font-semibold">Shipping Address</p>
                <p>${escapeHtml(active.shipping_address || '—')}</p>
                </div>
                <div class="md:col-span-2">
                    <p class="text-[#6B4423] font-semibold">Billing Address</p>
                <p>${escapeHtml(active.billing_address || '—')}</p>
                </div>
                <div>
                    <p class="text-[#6B4423] font-semibold">Pricing Status</p>
                    <p class="${pricingOk ? 'text-green-700 font-semibold' : 'text-orange-700'}">
                        ${pricingOk ? 'Approved' : 'Awaiting salesman approval'}
                    </p>
                </div>
                <div>
                    <p class="text-[#6B4423] font-semibold">Onboarding</p>
                    <p>${active.onboarding_complete ? 'Complete' : 'Incomplete'}</p>
                </div>
                <div class="md:col-span-2">
                    <div class="flex justify-between items-start gap-3">
                        <div>
                            <p class="text-[#6B4423] font-semibold">Payment on file</p>
                            <p>${escapeHtml(paymentMethodLabel(active))}</p>
                            <p class="text-xs text-[#6B4423] mt-1">Card or ACH last 4 only. We are not charging this method from the portal.</p>
                        </div>
                        <button type="button" onclick="openPaymentMethodModal()"
                                class="px-4 py-1.5 text-sm border-2 border-[#6B4423] rounded-xl hover:bg-[#f8f4eb] font-semibold text-[#1E4D2B]">
                            Edit
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;



    html += `
        <div class="border-t border-[#d4b78f] pt-6 mt-6">
            <div class="flex justify-between items-start gap-3 mb-2">
                <div>
                    <h3 class="font-bold brand-green">Your wholesale price list</h3>
                    <p class="text-xs text-[#6B4423] mt-1">The list your salesman set for this store. Print or download Excel / PDF.</p>
                </div>
                ${pricingOk ? `
                <div class="flex flex-wrap gap-2">
                    <button type="button" onclick="openWholesalePriceList()"
                            class="px-4 py-1.5 text-sm border-2 border-[#6B4423] rounded-xl hover:bg-[#f8f4eb] font-semibold text-[#1E4D2B]">
                        View
                    </button>
                    <button type="button" onclick="openWholesalePriceList(true)"
                            class="px-4 py-1.5 text-sm bg-[#1E4D2B] text-[#d4b78f] rounded-xl font-semibold">
                        Print
                    </button>
                    <button type="button" onclick="exportWholesalePriceListExcel()"
                            class="px-4 py-1.5 text-sm border-2 border-[#6B4423] rounded-xl hover:bg-[#f8f4eb] font-semibold text-[#1E4D2B]">
                        Export Excel
                    </button>
                    <button type="button" onclick="exportWholesalePriceListPdf()"
                            class="px-4 py-1.5 text-sm border-2 border-[#6B4423] rounded-xl hover:bg-[#f8f4eb] font-semibold text-[#1E4D2B]">
                        Export PDF
                    </button>
                </div>` : ''}
            </div>
            <p class="text-sm ${pricingOk ? 'text-[#6B4423]' : 'text-orange-700'}">
                ${pricingOk
                    ? 'Uses your assigned salesman\'s sheet and any extras on this store only.'
                    : 'Prices unlock after your salesman approves pricing.'}
            </p>
        </div>
    `;

    // ========== RESALE CERTIFICATE ==========
    html += `
        <div class="border-t border-[#d4b78f] pt-6 mt-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="font-bold brand-green">Resale Certificate</h3>
                <button onclick="openResaleCertModal()"
                        class="px-4 py-1.5 text-sm border-2 border-[#6B4423] rounded-xl hover:bg-[#f8f4eb] font-semibold text-[#1E4D2B]">
                    Edit
                </button>
            </div>
            <div id="account-resale-summary" class="text-sm text-[#6B4423]">
                <p>Loading…</p>
            </div>
        </div>
    `;

    container.innerHTML = html;

    const editBtn = document.getElementById('account-edit-btn');
    if (editBtn) {
        editBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            openShippingAddressesModal();
        });
    }

    // Load resale cert summary asynchronously
    loadAccountResaleSummary();    
    loadAssignedSalesmanDisplay(active);
}

function getWholesalePriceListRows() {
    const salesmanPrices = window._wholesaleSalesmanPrices || {};
    if (!salesmanPrices || !Object.keys(salesmanPrices).length) return [];
    const hidden = window._wholesaleHiddenPrices || {};
    const rows = [];
    (WHOLESALE_PRICES || []).forEach(function (p) {
        if (!p || !p.name) return;
        if (typeof isTestProductName === 'function' && isTestProductName(p.name)) return;
        if (typeof isProductAllowedForBrian === 'function' && !isProductAllowedForBrian(p.name)) return;
        if (hidden[p.name]) return;
        const extraOk = window._wholesaleAssignedProducts &&
            window._wholesaleAssignedProducts.has(p.name);
        if (!Object.prototype.hasOwnProperty.call(salesmanPrices, p.name) && !extraOk) return;
        rows.push({
            name: p.name,
            display: (typeof wholesaleDisplayName === 'function') ? wholesaleDisplayName(p.name) : p.name,
            category: p.category || 'Other',
            caseSize: p.cs || p.caseSize || '',
            price: p.price || '',
            isMarketPrice: !!p.isMarketPrice,
            oos: (typeof wholesaleOosLabel === 'function') ? wholesaleOosLabel(p.name) : ''
        });
    });
    rows.sort(function (a, b) {
        const c = String(a.category).localeCompare(String(b.category));
        if (c) return c;
        return String(a.display).localeCompare(String(b.display));
    });
    return rows;
}

function hideWholesalePriceList() {
    const modal = document.getElementById('wholesale-price-list-modal');
    if (modal) modal.classList.add('hidden');
}

function printWholesalePriceList() {
    const body = document.getElementById('wholesale-price-list-body');
    if (!body || !body.innerHTML.trim()) {
        alert('Open the price list first.');
        return;
    }
    let frame = document.getElementById('wholesale-price-list-print-frame');
    if (!frame) {
        frame = document.createElement('iframe');
        frame.id = 'wholesale-price-list-print-frame';
        frame.setAttribute('aria-hidden', 'true');
        frame.style.position = 'fixed';
        frame.style.right = '0';
        frame.style.bottom = '0';
        frame.style.width = '0';
        frame.style.height = '0';
        frame.style.border = '0';
        document.body.appendChild(frame);
    }
    const doc = frame.contentWindow.document;
    doc.open();
    doc.write('<!DOCTYPE html><html><head><title>Wholesale Price List</title>');
    doc.write('<base href="' + window.location.origin + '/">');
    doc.write('<style>');
    doc.write('@page{margin:0.6in;}');
    doc.write('body{font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;margin:0;}');
    doc.write('img{height:56px!important;width:auto!important;max-width:160px!important;object-fit:contain;}');
    doc.write('h3{color:#1E4D2B;margin:0 0 4px;}');
    doc.write('table{width:100%;border-collapse:collapse;margin-bottom:10px;}');
    doc.write('th,td{padding:5px 6px;font-size:12px;vertical-align:top;}');
    doc.write('th{text-align:left;border-bottom:2px solid #6B4423;color:#1E4D2B;}');
    doc.write('td{border-bottom:1px solid #e6e6e6;}');
    doc.write('th:last-child,td:last-child{text-align:right;}');
    doc.write('tr{page-break-inside:avoid;}');
    doc.write('.brand-green{color:#1E4D2B;}');
    doc.write('</style></head><body>');
    doc.write(body.innerHTML);
    doc.write('</body></html>');
    doc.close();
    frame.contentWindow.focus();
    frame.contentWindow.print();
}

function wholesalePriceListFileSlug(name) {
    return String(name || 'Wholesale_Price_List')
        .replace(/[^a-z0-9]+/gi, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 60) || 'Wholesale_Price_List';
}

function getWholesalePriceListExportMeta() {
    const customer = window._currentCustomer;
    if (!customer || !customer.pricing_approved_at) {
        alert('Pricing is not approved for this store yet.');
        return null;
    }
    const rows = getWholesalePriceListRows();
    if (!rows.length) {
        alert('No salesman price list is attached to this store yet.');
        return null;
    }
    const store = customer.company || customer.name || 'Store';
    const salesmanEl = document.getElementById('account-assigned-salesman');
    const salesmanRaw = salesmanEl
        ? String(salesmanEl.innerText || '').split('\n')[0].trim()
        : '';
    const salesman = salesmanRaw || String(customer.salesman_email || '').trim() || '—';
    const grouped = {};
    rows.forEach(function (row) {
        const cat = row.category || 'Other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(row);
    });
    const categories = Object.keys(grouped).sort();
    return { rows: rows, grouped: grouped, categories: categories, store: store, salesman: salesman };
}

function exportWholesalePriceListExcel() {
    const meta = getWholesalePriceListExportMeta();
    if (!meta) return;
    if (typeof XLSX === 'undefined') {
        alert('Excel library not loaded. Hard-refresh and try again.');
        return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    const aoa = [
        ['Donegal Natural Dog Treats'],
        ['258 W Front St · Marietta, PA 17547'],
        ['(800) 223-0017'],
        [meta.store + ' — Wholesale Price List'],
        ['Assigned salesman: ' + meta.salesman],
        ['Price list as of ' + stamp],
        [PRICE_LIST_EACH_NOTE],
        []
    ];
    meta.categories.forEach(function (cat) {
        aoa.push([cat]);
        const hideCase = hideWholesaleCaseCounts();
        aoa.push(hideCase ? ['Product', 'Price each'] : ['Product', 'Pack size', 'Price each']);
        meta.grouped[cat].forEach(function (row) {
            const raw = String(row.price || '').replace(/[^0-9.]/g, '');
            const price = raw === '' ? '' : Number(raw);
            const market = row.isMarketPrice ? ' (Market)' : '';
            const name = String(row.display || row.name || '') + market;
            aoa.push(hideCase ? [name, price] : [name, formatPackSize(row.caseSize) || '', price]);
        });
        aoa.push([]);
    });
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = hideWholesaleCaseCounts()
        ? [{ wch: 56 }, { wch: 12 }]
        : [{ wch: 56 }, { wch: 16 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Price List');
    XLSX.writeFile(wb, wholesalePriceListFileSlug(meta.store) + '_Wholesale_Price_List_' + stamp + '.xlsx');
}

async function exportWholesalePriceListPdf() {
    const meta = getWholesalePriceListExportMeta();
    if (!meta) return;
    const jsPdfCtor = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : window.jsPDF;
    if (!jsPdfCtor) {
        alert('PDF library not loaded. Hard-refresh and try again.');
        return;
    }
    const stamp = new Date().toLocaleDateString();
    const fileStamp = new Date().toISOString().slice(0, 10);
    const doc = new jsPdfCtor({ unit: 'pt', format: 'letter', compress: true });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const green = [30, 77, 43];
    const gold = [212, 183, 143];
    const cream = [248, 244, 235];
    const brown = [107, 68, 35];
    const title = String(meta.store || 'Wholesale Price List');

    function drawPageChrome() {
        doc.setFillColor(green[0], green[1], green[2]);
        doc.rect(0, 0, pageWidth, 78, 'F');
        doc.setTextColor(gold[0], gold[1], gold[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('Donegal Natural Dog Treats', 28, 32);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('258 W Front St  ·  Marietta, PA 17547  ·  (800) 223-0017', 28, 48);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('WHOLESALE PRICE LIST', pageWidth - 28, 32, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(title + '  ·  ' + stamp, pageWidth - 28, 48, { align: 'right' });
        doc.setFillColor(gold[0], gold[1], gold[2]);
        doc.rect(0, 78, pageWidth, 6, 'F');
        doc.setFillColor(green[0], green[1], green[2]);
        doc.rect(0, pageHeight - 32, pageWidth, 32, 'F');
        doc.setTextColor(gold[0], gold[1], gold[2]);
        doc.setFontSize(8);
        doc.text(
            'Donegal Natural  ·  ' + title + '  ·  Page ' + doc.internal.getCurrentPageInfo().pageNumber,
            pageWidth / 2,
            pageHeight - 14,
            { align: 'center' }
        );
    }

    drawPageChrome();
    doc.setTextColor(brown[0], brown[1], brown[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(
        'All prices are per piece, bag, or pack as listed. You may order any quantity - a full case is not required.',
        28,
        96
    );
    let cursorY = 110;
    meta.categories.forEach(function (cat) {
        const body = meta.grouped[cat].map(function (row) {
            const market = row.isMarketPrice ? ' (Market)' : '';
            const hideCase = hideWholesaleCaseCounts();
            return hideCase
                ? [
                    String(row.display || row.name || '') + market,
                    String(formatListPrice(row.price, row.isMarketPrice) || '—')
                ]
                : [
                    String(row.display || row.name || '') + market,
                    String(formatPackSize(row.caseSize) || '—'),
                    String(formatListPrice(row.price, row.isMarketPrice) || '—')
                ];
        });
        if (cursorY > pageHeight - 120) {
            doc.addPage();
            cursorY = 100;
        }
        doc.setFillColor(green[0], green[1], green[2]);
        doc.roundedRect(28, cursorY, pageWidth - 56, 22, 3, 3, 'F');
        doc.setTextColor(gold[0], gold[1], gold[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(String(cat), 40, cursorY + 15);
        cursorY += 26;
        doc.autoTable({
            startY: cursorY,
            head: hideWholesaleCaseCounts()
                ? [['Product', 'Price each']]
                : [['Product', 'Pack size', 'Price each']],
            body: body,
            theme: 'grid',
            styles: {
                font: 'helvetica',
                fontSize: 9,
                textColor: [40, 28, 16],
                lineColor: [212, 183, 143],
                lineWidth: 0.4,
                cellPadding: 5
            },
            headStyles: {
                fillColor: brown,
                textColor: gold,
                fontStyle: 'bold'
            },
            alternateRowStyles: { fillColor: cream },
            columnStyles: {
                0: { cellWidth: hideWholesaleCaseCounts() ? 430 : 340 },
                1: hideWholesaleCaseCounts()
                    ? { cellWidth: 86, halign: 'right', fontStyle: 'bold', textColor: green }
                    : { cellWidth: 90 },
                2: hideWholesaleCaseCounts()
                    ? { cellWidth: 0 }
                    : { cellWidth: 86, halign: 'right', fontStyle: 'bold', textColor: green }
            },
            margin: { left: 28, right: 28, top: 100, bottom: 44 },
            didDrawPage: function () {
                drawPageChrome();
            }
        });
        cursorY = doc.lastAutoTable.finalY + 16;
    });

    doc.save(wholesalePriceListFileSlug(meta.store) + '_Wholesale_Price_List_' + fileStamp + '.pdf');
}

function openWholesalePriceList(autoPrint) {
    const customer = window._currentCustomer;
    if (!customer || !customer.pricing_approved_at) {
        alert('Pricing is not approved for this store yet.');
        return;
    }
    const rows = getWholesalePriceListRows();
    const body = document.getElementById('wholesale-price-list-body');
    const modal = document.getElementById('wholesale-price-list-modal');
    if (!body || !modal) {
        alert('Price list is missing from the page. Refresh and try again.');
        return;
    }
    if (!rows.length) {
        alert('No salesman price list is attached to this store yet.');
        return;
    }

    const store = escapeHtml(customer.company || customer.name || 'Store');
    const salesmanEl = document.getElementById('account-assigned-salesman');
    const salesmanRaw = salesmanEl
        ? String(salesmanEl.innerText || '').split('\n')[0].trim()
        : '';
    const salesman = salesmanRaw || String(customer.salesman_email || '').trim();
    const today = new Date().toLocaleDateString();
    const grouped = {};
    rows.forEach(function (row) {
        if (!grouped[row.category]) grouped[row.category] = [];
        grouped[row.category].push(row);
    });

    let html = `
        <div class="flex items-start justify-between gap-4 mb-4">
            <div>
                <p class="text-xs font-semibold tracking-wide text-[#6B4423]">DONEGAL NATURAL DOG TREATS</p>
                <h3 class="text-2xl font-bold brand-green">Wholesale Price List</h3>
                <p class="text-sm text-[#6B4423] mt-1">${store}</p>
                <p class="text-xs text-[#6B4423]">Printed ${escapeHtml(today)}</p>
            </div>
            <img src="media/logo.png" alt="Donegal Natural"
                 style="height:56px;width:auto;max-width:160px;object-fit:contain;flex-shrink:0;">
        </div>
        <p class="text-sm text-[#6B4423] mb-2">Assigned salesman: ${escapeHtml(salesman || '—')}</p>
        <p class="text-sm text-[#6B4423] mb-4">${escapeHtml(PRICE_LIST_EACH_NOTE)}</p>
    `;
    Object.keys(grouped).forEach(function (cat) {
        html += '<p class="text-xs font-bold uppercase tracking-wide text-[#6B4423] mt-4 mb-1">' +
            escapeHtml(cat) + '</p>';
        const hideCase = hideWholesaleCaseCounts();
        html += '<table class="w-full text-sm mb-2"><thead><tr class="border-b-2 border-[#6B4423] text-left">' +
            '<th class="py-1 font-semibold text-[#1E4D2B]">Product</th>' +
            (hideCase ? '' : '<th class="py-1 font-semibold text-[#1E4D2B]">Pack size</th>') +
            '<th class="py-1 font-semibold text-[#1E4D2B] text-right">Price each</th>' +
            '</tr></thead><tbody>';
        grouped[cat].forEach(function (row) {
            html += '<tr class="border-b border-[#eee]">' +
                '<td class="py-1.5 pr-2">' + escapeHtml(row.display) +
                (row.isMarketPrice ? '<span class="block text-[11px] text-[#c56134]">Market price</span>' : '') +
                (row.oos ? '<span class="block text-[11px] text-orange-700">' + escapeHtml(row.oos) + '</span>' : '') +
                '</td>' +
                (hideCase ? '' : ('<td class="py-1.5 text-[#6B4423] whitespace-nowrap">' + escapeHtml(formatPackSize(row.caseSize)) + '</td>')) +
                '<td class="py-1.5 text-right font-semibold brand-green whitespace-nowrap">' + escapeHtml(formatListPrice(row.price, row.isMarketPrice)) + '</td>' +
                '</tr>';
        });
        html += '</tbody></table>';
    });
    html += '<p class="text-[11px] text-[#6B4423] mt-4">' +
        escapeHtml(typeof MARKET_PRICE_DISCLAIMER === 'string'
            ? MARKET_PRICE_DISCLAIMER
            : 'Market price. Final invoice may be adjusted to current market cost at shipment.') +
        '</p>';

    body.innerHTML = html;
    modal.classList.remove('hidden');
    modal.scrollTop = 0;
    if (autoPrint) {
        printWholesalePriceList();
    }
}

async function loadAssignedSalesmanDisplay(customer) {
    const el = document.getElementById('account-assigned-salesman');
    if (!el || !customer) return;

    const email = (customer.salesman_email || '').toLowerCase().trim();
    if (!email) {
        el.textContent = '—';
        return;
    }

    // Show email immediately while we look up the name
    el.textContent = email;

    try {
        const { data, error } = await supabaseClient
            .from('salesmen')
            .select('first_name, last_name, email')
            .ilike('email', email)
            .maybeSingle();

        if (error || !data) {
            // Keep the email we already showed
            return;
        }

        const name = [data.first_name, data.last_name].filter(Boolean).join(' ').trim();
        if (name) {
            el.innerHTML = `<span class="font-semibold text-[#1E4D2B]">${escapeHtml(name)}</span><br><span class="text-xs text-[#6B4423]">${escapeHtml(email)}</span>`;
        }
    } catch (err) {
        console.error('loadAssignedSalesmanDisplay error:', err);
        // Leave the email visible
    }
}

async function loadAccountResaleSummary() {
    const el = document.getElementById('account-resale-summary');
    if (!el) return;

    const customer = window._currentCustomer;
    if (!customer) {
        el.innerHTML = '<p>—</p>';
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('customer_resale_certificates')
            .select('*')
            .eq('customer_id', customer.id)
            .order('uploaded_at', { ascending: false })
            .limit(1);

        if (error) throw error;

        if (!data || data.length === 0) {
            el.innerHTML = '<p>No resale certificate on file.</p>';
            return;
        }

        const cert = data[0];
        const exp = cert.expiration_date ? new Date(cert.expiration_date).toLocaleDateString() : '—';
        const expired = cert.expiration_date && new Date(cert.expiration_date) < new Date();

        el.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                    <p class="text-[#6B4423] font-semibold">Certificate Number</p>
                    <p>${escapeHtml(cert.certificate_number || '—')}</p>
                </div>
                <div>
                    <p class="text-[#6B4423] font-semibold">Expiration</p>
                    <p class="${expired ? 'text-red-600 font-semibold' : ''}">${exp}${expired ? ' (Expired)' : ''}</p>
                </div>
            </div>
        `;
    } catch (err) {
        console.error(err);
        el.innerHTML = '<p class="text-red-600">Could not load certificate.</p>';
    }
}

function fillAccountEditFields() {
    const c = window._currentCustomer;
    const companyEl = document.getElementById('account-edit-company');
    const nameEl = document.getElementById('account-edit-name');
    const phoneEl = document.getElementById('account-edit-phone');
    const shipEl = document.getElementById('account-edit-shipping');
    const billEl = document.getElementById('account-edit-billing');
    if (!c) return;
    if (companyEl) companyEl.value = c.company || '';
    if (nameEl) nameEl.value = c.name || '';
    if (phoneEl) phoneEl.value = c.phone || '';
    if (shipEl) shipEl.value = c.shipping_address || '';
    if (billEl) billEl.value = c.billing_address || '';
    const shipWidget = document.getElementById('account-edit-shipping-places');
    const billWidget = document.getElementById('account-edit-billing-places');
    if (shipWidget) shipWidget.value = c.shipping_address || '';
    if (billWidget) billWidget.value = c.billing_address || '';
}

async function saveAccountDetails() {
    const c = window._currentCustomer;
    if (!c || !c.id) {
        alert('No store selected.');
        return;
    }
    const company = (document.getElementById('account-edit-company')?.value || '').trim();
    const name = (document.getElementById('account-edit-name')?.value || '').trim();
    const phone = (document.getElementById('account-edit-phone')?.value || '').trim();
    const shipping = (document.getElementById('account-edit-shipping')?.value || '').trim();
    const billing = (document.getElementById('account-edit-billing')?.value || '').trim();
    if (!company && !name) {
        alert('Enter a company or contact name.');
        return;
    }
    try {
        const { error } = await supabaseClient
            .from('customers')
            .update({
                company: company || name,
                name: name || company,
                phone: phone || null,
                shipping_address: shipping || null,
                billing_address: billing || null
            })
            .eq('id', c.id);
        if (error) throw error;
        window._currentCustomer = Object.assign({}, c, {
            company: company || name,
            name: name || company,
            phone: phone || null,
            shipping_address: shipping || null,
            billing_address: billing || null
        });
        const accounts = window._customerAccounts || [];
        const idx = accounts.findIndex(function (row) { return String(row.id) === String(c.id); });
        if (idx >= 0) window._customerAccounts[idx] = window._currentCustomer;
        if (typeof showAccountInfo === 'function') showAccountInfo();
        if (typeof updateShippingPolicyCard === 'function') updateShippingPolicyCard();
        if (typeof closeManageAddressesModal === 'function') closeManageAddressesModal();
        alert('Account details saved.');
    } catch (err) {
        console.error(err);
        alert('Could not save account details. ' + (err && err.message ? err.message : ''));
    }
}

async function openResaleCertModal() {
    const modal = document.getElementById('manage-addresses-modal');
    if (!modal) return;

    modal.querySelectorAll('[data-section]').forEach(el => {
        el.style.display = el.getAttribute('data-section') === 'resale' ? 'block' : 'none';
    });
    modal.querySelector('h2').textContent = 'Resale Certificate';
    modal.style.display = 'flex';
    await loadCurrentResaleCert();
}

async function loadCurrentResaleCert() {
    const el = document.getElementById('resale-cert-current');
    if (!el) return;

    const customer = window._currentCustomer;
    if (!customer) {
        el.innerHTML = '<p class="text-sm text-[#6B4423]">No customer selected.</p>';
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('customer_resale_certificates')
            .select('*')
            .eq('customer_id', customer.id)
            .order('uploaded_at', { ascending: false })
            .limit(1);

        if (error) throw error;

        if (!data || data.length === 0) {
            el.innerHTML = '<p class="text-sm text-[#6B4423]">No resale certificate on file.</p>';
            return;
        }

        const cert = data[0];
        const exp = cert.expiration_date ? new Date(cert.expiration_date).toLocaleDateString() : '—';
        const expired = cert.expiration_date && new Date(cert.expiration_date) < new Date();

        el.innerHTML = `
            <div class="p-3 bg-[#f8f4eb] border border-[#d4b78f] rounded-xl">
                <p><span class="font-semibold">Number:</span> ${escapeHtml(cert.certificate_number || '—')}</p>
                <p><span class="font-semibold">Expires:</span> <span class="${expired ? 'text-red-600 font-semibold' : ''}">${exp}${expired ? ' (Expired)' : ''}</span></p>
                <p class="text-xs mt-1">${escapeHtml(cert.file_name || '')}</p>
            </div>
        `;
    } catch (err) {
        console.error(err);
        el.innerHTML = '<p class="text-sm text-red-600">Could not load certificate.</p>';
    }
}

async function uploadResaleCertificate() {
    const customer = window._currentCustomer;
    if (!customer) {
        alert('No customer selected.');
        return;
    }

    const number = document.getElementById('resale-cert-number')?.value.trim() || '';
    const expiration = document.getElementById('resale-cert-expiration')?.value || '';
    const fileInput = document.getElementById('resale-cert-file');
    const file = fileInput?.files?.[0];

    if (!number || !expiration || !file) {
        alert('Certificate number, expiration date, and file are required.');
        return;
    }
    if (file.size === 0) {
        alert('The selected file is empty. Please choose another file.');
        return;
    }

    try {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const uid = user.id || customer.id;
        const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
        const path = `${uid}/${Date.now()}.${ext}`;

        // Explicit content type helps avoid "No content provided"
        const contentType = file.type || (
            ext === 'pdf' ? 'application/pdf' :
            ext === 'png' ? 'image/png' :
            'image/jpeg'
        );

        const { error: uploadError } = await supabaseClient.storage
            .from('resale-certificates')
            .upload(path, file, {
                upsert: true,
                contentType: contentType,
                cacheControl: '3600'
            });

        if (uploadError) throw uploadError;

        const { error: insertError } = await supabaseClient
            .from('customer_resale_certificates')
            .insert({
                customer_id: customer.id,
                certificate_number: number,
                expiration_date: expiration,
                file_name: file.name,
                file_path: path
            });

        if (insertError) throw insertError;

        document.getElementById('resale-cert-number').value = '';
        document.getElementById('resale-cert-expiration').value = '';
        if (fileInput) fileInput.value = '';

        await loadCurrentResaleCert();
        alert('Resale certificate uploaded.');
    } catch (err) {
        console.error(err);
        alert('Could not upload certificate.\n' + (err.message || JSON.stringify(err)));
    }
}

async function logout() {
    if (!confirm("Are you sure you want to logout?")) return;
    localStorage.removeItem("currentUser");
    try { await supabaseClient.auth.signOut(); } catch (_) {}
    window.location.replace("login-portal.html");
}

function displayWelcome() {
    const nameElement = document.getElementById('welcome-name');
    if (!nameElement) return;

    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    const active = window._currentCustomer;
    const accounts = window._customerAccounts || [];

    if (user && user.fullName) {
        const isCustomerView = !!(user.isViewAs || localStorage.getItem('originalAdminUser') || user.role === 'admin');
        const adminBtn = document.getElementById('admin-view-btn');
        if (adminBtn) {
            if (isCustomerView) adminBtn.classList.remove('hidden');
            else adminBtn.classList.add('hidden');
        }
        if (isCustomerView) {
            nameElement.textContent = 'Jonathan (Customer View)';
            if (typeof updateOrderingAsIndicator === 'function') updateOrderingAsIndicator();
            return;
        }
        const company = user.company ? ` (${escapeHtml(user.company)})` : '';
        let text = `${escapeHtml(user.fullName)}${company}`;
        if (accounts.length > 1 && active) {
            text += `<br><span class="text-xs font-normal text-[#6B4423]">Ordering as: ${escapeHtml(getStoreLabel(active))}</span>`;
        }
        nameElement.innerHTML = text;
    } else {
        nameElement.textContent = '';
    }
}

function goToAdminView() {
    try {
        const original = JSON.parse(localStorage.getItem('originalAdminUser') || 'null');
        if (original) {
            localStorage.setItem('currentUser', JSON.stringify(original));
            localStorage.removeItem('originalAdminUser');
        }
    } catch (e) {
        console.error('goToAdminView error:', e);
    }
    window.location.href = 'internal-portal.html';
}

document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');

    if (!user || (user.role !== 'customer' && user.role !== 'admin')) {
        window.location.href = 'login-portal.html';
        return;
    }

    // Password change required?
    if (user.mustChangePassword) {
        document.getElementById('password-change-modal')?.classList.remove('hidden');
        return; // stop portal init until password is changed
    }

        // Load ALL customer records that share this email (multi-store support)
    try {
        const email = (user.email || '').toLowerCase().trim();
        const { data: customers, error: custErr } = await supabaseClient
            .from('customers')
            .select('*')
            .ilike('email', email);

        if (custErr) throw custErr;

        window._customerAccounts = customers || [];

        // Resolve which store is active
        const savedId = localStorage.getItem('activeCustomerId');
        let active = null;
        if (savedId) {
            active = window._customerAccounts.find(c => String(c.id) === String(savedId));
        }
        if (!active && window._customerAccounts.length > 0) {
            active = window._customerAccounts[0];   // auto-select first
        }
        window._currentCustomer = active || null;
        if (active) {
            localStorage.setItem('activeCustomerId', String(active.id));
        }

        // Onboarding is per selected store
        if (!active || !active.onboarding_complete) {
            document.getElementById('onboarding-modal')?.classList.remove('hidden');
            return;
        }

        // Soft restriction for Inactive stores
        if (isCustomerInactive(active)) {
            applyInactiveSoftRestriction();
        } else {
            clearInactiveSoftRestriction();
        }
    } catch (err) {
        console.error('Customer load error:', err);
    }



    await Promise.all([
        loadWholesaleCatalog(),
        loadWholesaleIngredients(),
        loadPortalInventory(),
        loadCustomerBackOrders(),
        loadWholesaleProductImages()
    ]);
    renderCategoryFilters();
    renderPortalProducts();
    if (typeof checkNewProductAlert === 'function') checkNewProductAlert();
    if (typeof updateShippingPolicyCard === 'function') updateShippingPolicyCard();
    if (typeof loadOpenQuoteForActiveStore === 'function') await loadOpenQuoteForActiveStore();
    updateQuoteSidebar();
    setupSearch();
    displayWelcome();
        // Shipping address confirmation (shows until customer confirms)
    checkAndShowAddressConfirmation();
    updateOrderingAsIndicator();
    refreshOrderHistoryBadge();
    refreshMyQuotesBadge();

    // Phase 1: always hide My Quotes / Quotes nav
    document.querySelectorAll('.sidebar-link[data-target="section-quotes"]').forEach(el => {
        el.style.display = 'none';
    });

    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('data-target');
            sidebarLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.portal-section').forEach(section => {
                section.style.display = 'none';
            });
            const targetSection = document.getElementById(targetId);
            if (targetSection) targetSection.style.display = 'block';
            if (targetId === 'section-account') showAccountInfo();
            if (targetId === 'section-quotes') loadMyQuotes();
            if (targetId === 'section-orders') {
                markOrderHistoryViewed();
                loadOrderHistory();
            }
        });
    });

    const defaultLink = document.querySelector('.sidebar-link[data-target="section-products"]');
    if (defaultLink) defaultLink.classList.add('active');
});

async function submitPasswordChange() {
    const p1 = document.getElementById('new-password')?.value || '';
    const p2 = document.getElementById('confirm-password')?.value || '';
    const errEl = document.getElementById('password-change-error');

    if (p1.length < 8) {
        if (errEl) {
            errEl.textContent = 'Password must be at least 8 characters.';
            errEl.classList.remove('hidden');
        }
        return;
    }
    if (p1 !== p2) {
        if (errEl) {
            errEl.textContent = 'Passwords do not match.';
            errEl.classList.remove('hidden');
        }
        return;
    }

    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const email = (user.email || '').toLowerCase().trim();

    try {
        const { error: authError } = await supabaseClient.auth.updateUser({ password: p1 });
        if (authError) throw authError;

        // Best-effort: try to clear profiles.must_change_password
        // RLS is currently blocking this — do not throw
        if (user.id) {
            const { error: profileError } = await supabaseClient
                .from('profiles')
                .update({ must_change_password: false })
                .eq('id', user.id);
            if (profileError) {
                console.warn('profiles.must_change_password update blocked:', profileError.message);
            }
        }

        // Durable flag on customers table (this is what stops the modal on next login)
        // Password is account-level; mark password_changed on every store that shares this email
        if (email) {
            const { error: custError } = await supabaseClient
                .from('customers')
                .update({ password_changed: true })
                .ilike('email', email);
            if (custError) {
                console.warn('customers.password_changed update failed:', custError.message);
            }
        }

        // Clear local flag
        user.mustChangePassword = false;
        localStorage.setItem('currentUser', JSON.stringify(user));

        document.getElementById('password-change-modal')?.classList.add('hidden');

        // Supabase invalidates the current session on password update.
        // Sign out and send them to login so they authenticate cleanly
        // with the new password and a fresh JWT.
        try {
            await supabaseClient.auth.signOut();
        } catch (_) {}
        localStorage.removeItem('currentUser');
        window.location.href = 'login-portal.html';
    } catch (err) {
        console.error(err);
        if (errEl) {
            errEl.textContent = err.message || 'Could not update password.';
            errEl.classList.remove('hidden');
        }
    }
}

async function submitOnboarding() {
    const street = document.getElementById('onboard-bill-street')?.value.trim() || '';
    const apt    = document.getElementById('onboard-bill-apt')?.value.trim() || '';
    const city   = document.getElementById('onboard-bill-city')?.value.trim() || '';
    const state  = document.getElementById('onboard-bill-state')?.value.trim() || '';
    const zip    = document.getElementById('onboard-bill-zip')?.value.trim() || '';

    const billing = [street, apt, city, state, zip].filter(Boolean).join(', ');
    const errEl = document.getElementById('onboarding-error');

    if (!street || !city || !state || !zip) {
        if (errEl) {
            errEl.textContent = 'Street, City, State, and ZIP are required.';
            errEl.classList.remove('hidden');
        }
        return;
    }

    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const email = (user.email || '').toLowerCase().trim();

    try {
        const activeId = window._currentCustomer?.id;
        const updatePayload = {
            billing_address: billing,
            onboarding_complete: true
        };

        let query = supabaseClient
            .from('customers')
            .update(updatePayload);

        if (activeId) {
            query = query.eq('id', activeId);
        } else {
            query = query.ilike('email', email);
        }

        const { data, error } = await query.select();

        if (error) throw error;

        if (!data || data.length === 0) {
            alert('Update ran but no customer row was matched for email: ' + email);
            return;
        }

        document.getElementById('onboarding-modal')?.classList.add('hidden');
        location.reload();
    } catch (err) {
        console.error(err);
        alert('Onboarding save failed:\n' + (err.message || JSON.stringify(err)));
        if (errEl) {
            errEl.textContent = err.message || 'Could not save account info.';
            errEl.classList.remove('hidden');
        }
    }
}

window.resolveActiveCustomer = resolveActiveCustomer;
window.switchActiveCustomer = switchActiveCustomer;
window.getStoreLabel = getStoreLabel;
window.setActiveCustomer = setActiveCustomer;
window.updateOrderingAsIndicator = updateOrderingAsIndicator;
window.buildStoreTabs = buildStoreTabs;
window.isCustomerInactive = isCustomerInactive;
window.applyInactiveSoftRestriction = applyInactiveSoftRestriction;
window.clearInactiveSoftRestriction = clearInactiveSoftRestriction;
window.getStoreBadgeForOrder = getStoreBadgeForOrder;
window.showAccountInfo = showAccountInfo;
window.getWholesalePriceListRows = getWholesalePriceListRows;
window.hideWholesalePriceList = hideWholesalePriceList;
window.printWholesalePriceList = printWholesalePriceList;
window.wholesalePriceListFileSlug = wholesalePriceListFileSlug;
window.getWholesalePriceListExportMeta = getWholesalePriceListExportMeta;
window.exportWholesalePriceListExcel = exportWholesalePriceListExcel;
window.exportWholesalePriceListPdf = exportWholesalePriceListPdf;
window.openWholesalePriceList = openWholesalePriceList;
window.loadAssignedSalesmanDisplay = loadAssignedSalesmanDisplay;
window.loadAccountResaleSummary = loadAccountResaleSummary;
window.fillAccountEditFields = fillAccountEditFields;
window.saveAccountDetails = saveAccountDetails;
window.openResaleCertModal = openResaleCertModal;
window.loadCurrentResaleCert = loadCurrentResaleCert;
window.uploadResaleCertificate = uploadResaleCertificate;
window.logout = logout;
window.displayWelcome = displayWelcome;
window.goToAdminView = goToAdminView;
window.submitPasswordChange = submitPasswordChange;
window.submitOnboarding = submitOnboarding;
