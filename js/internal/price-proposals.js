// Internal portal — salesman price-change proposals.
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

window.getPendingPriceProposals = getPendingPriceProposals;
window.updatePriceProposalsBadge = updatePriceProposalsBadge;
window.showPriceProposalsPanel = showPriceProposalsPanel;
window.showProposalDetail = showProposalDetail;
window.renderProposalDetailHtml = renderProposalDetailHtml;
window.toggleProposalChangesOnly = toggleProposalChangesOnly;
window.hidePriceProposalsPanel = hidePriceProposalsPanel;
window.approvePriceProposal = approvePriceProposal;
window.denyPriceProposal = denyPriceProposal;
