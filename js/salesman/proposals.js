// Salesman portal — price change proposals.
async function loadProposalSalesmanSheet() {
    window._proposalSheetPrices = window._proposalSheetPrices || {};
    const email = (typeof getOperatingSalesmanEmail === 'function'
        ? getOperatingSalesmanEmail()
        : '').toLowerCase().trim();
    if (!email || typeof supabaseClient === 'undefined') return window._proposalSheetPrices;
    try {
        const { data } = await supabaseClient
            .from('salesman_price_sheets')
            .select('prices')
            .eq('salesman_email', email)
            .maybeSingle();
        if (data && data.prices && typeof data.prices === 'object') {
            window._proposalSheetPrices = data.prices;
        }
    } catch (err) {
        console.warn('loadProposalSalesmanSheet:', err);
    }
    return window._proposalSheetPrices;
}

function proposalSheetPrice(name) {
    const map = window._proposalSheetPrices || {};
    function norm(s) {
        return String(s || '')
            .toLowerCase()
            .replace(/[“”]/g, '"')
            .replace(/[‘’]/g, "'")
            .replace(/\s+/g, ' ')
            .trim();
    }
    const want = norm(name);
    if (!want) return null;
    if (map[name] != null && map[name] !== '') return Number(map[name]);
    const hit = Object.keys(map).find(function (k) { return norm(k) === want; });
    return hit != null ? Number(map[hit]) : null;
}

async function searchProposalProducts() {
    if (!window._proposalSheetPrices || !Object.keys(window._proposalSheetPrices).length) {
        await loadProposalSalesmanSheet();
    }
    const searchEl = document.getElementById('proposal-product-search');
    const resultsEl = document.getElementById('proposal-product-results');
    if (!searchEl || !resultsEl) return;

    const term = (searchEl.value || '').toLowerCase().trim();
    if (term.length < 2) {
        resultsEl.innerHTML = '';
        resultsEl.classList.add('hidden');
        return;
    }

    if (typeof PRODUCT_CATALOG === 'undefined') {
        resultsEl.innerHTML = '<p class="p-3 text-sm text-red-600">PRODUCT_CATALOG not found.</p>';
        resultsEl.classList.remove('hidden');
        return;
    }

    const matches = PRODUCT_CATALOG.filter(function (p) {
        return p && p.name && p.name.toLowerCase().includes(term);
    }).slice(0, 12);

    if (!matches.length) {
        resultsEl.innerHTML = '<p class="p-3 text-sm text-[#6B4423]">No products found.</p>';
        resultsEl.classList.remove('hidden');
        return;
    }

    resultsEl.innerHTML = matches.map(function (p) {
        const safeName = String(p.name).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const price = p.isMarketPrice
            ? 'Market'
            : ('$' + Number(p.unitPrice).toFixed(2));
        return '<div class="px-3 py-2 border-b border-[#d4b78f] hover:bg-[#f8f4eb] cursor-pointer flex justify-between items-center proposal-add-row" data-name="' + encodeURIComponent(p.name) + '">' +
            '<div><p class="text-sm font-semibold brand-green">' + escapeHtml(p.name) + '</p>' +
            '<p class="text-xs text-[#6B4423]">' + escapeHtml(p.caseSize || '') + ' · ' + escapeHtml(price) + '</p></div>' +
            '<span class="text-xs font-bold text-[#1E4D2B]">Add</span></div>';
    }).join('');
    resultsEl.querySelectorAll('.proposal-add-row').forEach(function (row) {
        row.onclick = function () {
            addProductToProposal(decodeURIComponent(row.getAttribute('data-name') || ''));
        };
    });
    resultsEl.classList.remove('hidden');
}

var proposalItems = proposalItems || [];

function addProductToProposal(productName) {
    if (typeof PRODUCT_CATALOG === "undefined") return;
    if (!Array.isArray(proposalItems)) proposalItems = [];

    const want = String(productName || '');
    const product = PRODUCT_CATALOG.find(function (p) {
        return p && p.name === want;
    }) || PRODUCT_CATALOG.find(function (p) {
        return p && String(p.name || '').toLowerCase() === want.toLowerCase();
    });
    if (!product) {
        alert('Could not add that product.');
        return;
    }

    if (proposalItems.some(i => i.name === productName)) {
        alert("That product is already on this proposal.");
        return;
    }

    proposalItems.push({
        name: product.name,
        caseSize: product.caseSize || "",
        currentPrice: (function () {
            const sheetPrice = proposalSheetPrice(product.name);
            if (sheetPrice != null && !isNaN(sheetPrice)) return sheetPrice;
            return product.isMarketPrice ? null : Number(product.unitPrice);
        })(),
        displayCurrentPrice: (function () {
            const sheetPrice = proposalSheetPrice(product.name);
            if (sheetPrice != null && !isNaN(sheetPrice)) return '$' + sheetPrice.toFixed(2);
            return product.isMarketPrice ? 'Market Price' : ('$' + Number(product.unitPrice).toFixed(2));
        })(),
        proposedPrice: (function () {
            const sheetPrice = proposalSheetPrice(product.name);
            if (sheetPrice != null && !isNaN(sheetPrice)) return sheetPrice.toFixed(2);
            return product.isMarketPrice ? '' : Number(product.unitPrice).toFixed(2);
        })(),
        catalogPrice: proposalSheetPrice(product.name),
        reason: "",
        isMarketPrice: !!product.isMarketPrice
    });

    const searchEl = document.getElementById("proposal-product-search");
    if (searchEl) searchEl.value = "";

    const resultsEl = document.getElementById("proposal-product-results");
    if (resultsEl) {
        resultsEl.innerHTML = "";
        resultsEl.classList.add("hidden");
    }

    renderProposalItems();
}

function renderProposalItems() {
    const container = document.getElementById("proposal-items-list");
    if (!container) return;

    if (proposalItems.length === 0) {
        container.innerHTML = `<p class="text-sm text-[#6B4423]">No products added yet. Search above to add items.</p>`;
        return;
    }

    container.innerHTML = proposalItems.map((item, index) => `
        <div class="bg-white border-2 border-[#6B4423] rounded-xl p-4 mb-3">
            <div class="flex justify-between items-start mb-2">
                <div>
                    <p class="font-semibold brand-green">${escapeHtml(item.name)}</p>
                    <p class="text-xs text-[#6B4423]">${escapeHtml(item.caseSize || "")}</p>
                </div>
                <button type="button" onclick="removeProposalItem(${index})"
                        class="text-red-600 text-sm px-2 py-1 hover:bg-red-50 rounded-lg">
                    Remove
                </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                    <label class="block text-xs font-semibold text-[#6B4423] mb-1">Current Price</label>
                    <input type="text" value="${escapeHtml(item.displayCurrentPrice)}" readonly
                           class="form-input w-full px-3 py-2 bg-gray-50">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-[#6B4423] mb-1">Proposed Price *</label>
                    <input type="number" step="0.01" min="0"
                           value="${item.proposedPrice}"
                           class="form-input w-full px-3 py-2"
                           onchange="updateProposalField(${index}, 'proposedPrice', this.value)">
                </div>
            </div>

            <div>
                <label class="block text-xs font-semibold text-[#6B4423] mb-1">Reason for change *</label>
                <textarea rows="2" class="form-input w-full px-3 py-2"
                          placeholder="Why is this price change needed?"
                          onchange="updateProposalField(${index}, 'reason', this.value)">${escapeHtml(item.reason || "")}</textarea>
            </div>
        </div>
    `).join("");
}

function updateProposalField(index, field, value) {
    if (!proposalItems[index]) return;
    proposalItems[index][field] = value;
}

function removeProposalItem(index) {
    proposalItems.splice(index, 1);
    renderProposalItems();
}

async function submitPriceProposal() {
    const user = getCurrentUser() || currentUser;
    if (!user) {
        alert("You must be logged in.");
        return;
    }

    if (proposalItems.length === 0) {
        alert("Add at least one product to the proposal.");
        return;
    }

    for (let i = 0; i < proposalItems.length; i++) {
        const item = proposalItems[i];
        const proposed = parseFloat(item.proposedPrice);
        const reason = (item.reason || "").trim();

        if (isNaN(proposed) || proposed < 0) {
            alert("Please enter a valid proposed price for:\n" + item.name);
            return;
        }
        if (!reason) {
            alert("A reason is required for each product.\nMissing reason for:\n" + item.name);
            return;
        }
    }

    const notesEl = document.getElementById("proposal-overall-notes");
    const overallNotes = notesEl ? notesEl.value.trim() : "";
    const email = (typeof getOperatingSalesmanEmail === 'function'
        ? getOperatingSalesmanEmail()
        : (user.email || '')).toLowerCase().trim();
    const salesmanName = (typeof getOperatingSalesmanName === 'function'
        ? getOperatingSalesmanName()
        : (user.fullName || user.name || 'Salesman'));

    const items = proposalItems.map(item => ({
        product: item.name,
        caseSize: item.caseSize || "",
        currentPrice: item.currentPrice,
        catalogPrice: item.currentPrice,
        displayCurrentPrice: item.displayCurrentPrice,
        proposedPrice: parseFloat(item.proposedPrice),
        reason: (item.reason || "").trim(),
        isMarketPrice: !!item.isMarketPrice
    }));

    try {
        const { data, error } = await supabaseClient
            .from('price_proposals')
            .insert({
                type: 'priceChange',
                salesman_email: email,
                salesman_name: salesmanName,
                status: 'Pending',
                items: items,
                overall_notes: overallNotes || null,
                submitted_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error(error);
            alert("Failed to submit proposal. Please try again.\n" + error.message);
            return;
        }

        // Clear the form
        proposalItems = [];
        renderProposalItems();
        if (notesEl) notesEl.value = "";

        alert("Price change proposal submitted for admin approval.");
        renderProposalHistory();

    } catch (err) {
        console.error(err);
        alert("Something went wrong while submitting. Please try again.");
    }
}

async function renderProposalHistory() {
    const container = document.getElementById("proposal-history-list");
    if (!container) return;

    const user = getCurrentUser() || currentUser;
    if (!user) {
        container.innerHTML = `<p class="text-sm text-[#6B4423]">Please log in.</p>`;
        return;
    }

    container.innerHTML = `<p class="text-sm text-[#6B4423]">Loading proposals...</p>`;

    try {
        let query = supabaseClient
            .from('price_proposals')
            .select('*')
            .order('submitted_at', { ascending: false });

        // Salesmen only see their own; admins see all
        const seat = (typeof getOperatingSalesmanEmail === 'function'
            ? getOperatingSalesmanEmail()
            : (user.email || '')).toLowerCase().trim();
        if (user.role === 'salesman' || seat === 'donegaldogtreats@gmail.com') {
            query = query.eq('salesman_email', seat);
        }

        const { data, error } = await query;

        if (error) {
            console.error(error);
            container.innerHTML = `<p class="text-sm text-red-600">Could not load proposals.</p>`;
            return;
        }

        if (!data || data.length === 0) {
            container.innerHTML = `<p class="text-sm text-[#6B4423]">No proposals submitted yet.</p>`;
            return;
        }

        container.innerHTML = data.map(p => {
            const status = (p.status || "Pending").toLowerCase();
            let badgeClass = "bg-orange-100 text-orange-700";
            if (status === "approved") badgeClass = "bg-green-100 text-green-700";
            if (status === "denied" || status === "rejected") badgeClass = "bg-red-100 text-red-700";

            const date = new Date(p.submitted_at).toLocaleDateString();
            const items = p.items || [];
            const typeLabel = p.type === 'initialPriceSheet' ? 'Initial Sheet' : 'Price Change';

            const itemLines = items.map(item => `
                <div class="text-sm py-1 border-b border-[#eee]">
                    <span class="font-medium">${escapeHtml(item.product)}</span>
                    <div class="text-xs text-[#6B4423]">
                        ${escapeHtml(item.displayCurrentPrice || (item.catalogPrice != null ? "$" + Number(item.catalogPrice).toFixed(2) : "—"))}
                        → <strong>$${Number(item.proposedPrice).toFixed(2)}</strong>
                    </div>
                    ${item.reason ? `<div class="text-xs text-[#555]">Reason: ${escapeHtml(item.reason)}</div>` : ""}
                </div>
            `).join("");

            return `
                <div class="border border-[#d4b78f] rounded-xl p-3 mb-3">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <p class="font-semibold brand-green text-sm">${typeLabel}</p>
                            <p class="text-xs text-[#6B4423]">${date} · ${items.length} product(s)</p>
                        </div>
                        <span class="px-2 py-1 text-xs font-semibold rounded-full ${badgeClass}">
                            ${p.status || "Pending"}
                        </span>
                    </div>
                    ${itemLines}
                </div>
            `;
        }).join("");

    } catch (err) {
        console.error(err);
        container.innerHTML = `<p class="text-sm text-red-600">Error loading proposals.</p>`;
    }
}

window.loadProposalSalesmanSheet = loadProposalSalesmanSheet;
window.proposalSheetPrice = proposalSheetPrice;
window.searchProposalProducts = searchProposalProducts;
window.addProductToProposal = addProductToProposal;
window.renderProposalItems = renderProposalItems;
window.updateProposalField = updateProposalField;
window.removeProposalItem = removeProposalItem;
window.submitPriceProposal = submitPriceProposal;
window.renderProposalHistory = renderProposalHistory;
