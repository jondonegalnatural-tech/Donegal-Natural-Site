// Wholesale portal — quote cart, payment method, and quote edits.
function showPackagedItemModal(name, price, cs, category, image = null, healthBenefits = null) {
    if (window._customerIsInactive) {
        alert('This account is currently inactive and cannot add items to a quote.');
        return;
    }
    if (typeof isProductAllowedForBrian === 'function' && !isProductAllowedForBrian(name)) {
        alert('This item is not on your pricing sheet and cannot be ordered.');
        return;
    }
    const oldModal = document.getElementById('add-to-quote-modal');
    if (oldModal) oldModal.remove();

    // Store pending item safely — avoids broken onclick string interpolation
    window._pendingQuoteItem = { name, price, cs, category };

    const modal = document.createElement('div');
    modal.id = 'add-to-quote-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999]';

    const imagePath = image || 'media/placeholder-bully-stick.png';

    let imageHTML = `
        <div class="mb-4 flex justify-center">
            <img src="${escapeHtml(imagePath)}" alt="${escapeHtml(name)}" class="max-h-40 rounded-xl object-contain border border-[#d4b78f]">
        </div>
    `;

    let benefitsHTML = '';
    if (healthBenefits && healthBenefits.length > 0) {
        benefitsHTML = `
            <div class="mb-4">
                <p class="font-semibold text-sm mb-1 text-[#1E4D2B]">Health Benefits:</p>
                <ul class="text-sm text-[#6B4423] list-disc pl-5 space-y-1">
                    ${healthBenefits.map(b => `<li>${escapeHtml(b)}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    modal.innerHTML = `
        <div class="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 class="text-xl font-bold brand-green mb-3">Add to Quote</h3>

            ${imageHTML}

            <p class="font-semibold text-lg mb-1">${escapeHtml(wholesaleDisplayName(name))}</p>
            <p class="text-sm text-[#6B4423] mb-1">${escapeHtml(formatCardMeta({ price: price, cs: cs }))}</p>
            <p class="text-[11px] leading-snug text-[#6B4423] mb-4">Order any quantity — a full case is not required.</p>

            ${(function () {
                const text = getIngredientsForProduct(name);
                const analysis = getAnalysisForProduct(name);
                if (!text && !analysis) return '';
                return '<div class="text-sm text-[#6B4423] mb-4">' +
                    (text ? ('<p class="mb-2"><span class="font-bold text-[#1E4D2B]">Ingredients: </span>' + escapeHtml(text) + '</p>') : '') +
                    (analysis ? ('<p><span class="font-bold text-[#1E4D2B]">Guaranteed analysis: </span>' + escapeHtml(analysis) + '</p>') : '') +
                    '</div>';
            })()}

            ${benefitsHTML}

            <div class="mb-4">
                <label class="block text-sm font-medium mb-1">Quantity</label>
                <input type="number" id="quote-quantity" value="1" min="1" autofocus
                       class="w-full border-2 border-[#6B4423] rounded-xl px-4 py-2 text-lg">
            </div>

            <div class="flex gap-3">
                <button onclick="addToQuoteFromModal()"
                        class="flex-1 bg-[#1E4D2B] text-[#d4b78f] font-bold py-3 rounded-2xl">
                    Add to Quote
                </button>
                <button onclick="closeAddToQuoteModal()"
                        class="flex-1 border-2 border-[#6B4423] text-[#6B4423] font-bold py-3 rounded-2xl">
                    Cancel
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    setTimeout(() => {
        const qtyInput = document.getElementById('quote-quantity');
        if (qtyInput) {
            qtyInput.focus();
            qtyInput.select();
        }
    }, 50);
}

function closeAddToQuoteModal() {
    const modal = document.getElementById('add-to-quote-modal');
    if (modal) modal.remove();
}

function buildOpenQuoteItems() {
    return (quoteItems || []).map(function (item) {
        const isMarket = !!(item.isMarketPrice || String(item.price || '').toLowerCase().includes('market'));
        const numericPrice = parseFloat(String(item.price || '').replace(/[^0-9.]/g, '')) || 0;
        return {
            product: item.name,
            displayName: item.displayName || wholesaleDisplayName(item.name),
            quantity: item.quantity || 1,
            caseSize: item.cs || "",
            unitPrice: numericPrice || null,
            displayPrice: item.price || "",
            isMarketPrice: isMarket
        };
    });
}

function openQuoteEstimatedSubtotal(items) {
    let total = 0;
    (items || []).forEach(function (item) {
        if (item.isMarketPrice) return;
        const price = parseFloat(item.unitPrice) || 0;
        const qty = parseInt(item.quantity, 10) || 0;
        total += price * qty;
    });
    return total;
}

function schedulePersistOpenQuote() {
    if (_openQuoteSaveTimer) clearTimeout(_openQuoteSaveTimer);
    _openQuoteSaveTimer = setTimeout(function () {
        _openQuoteSaveTimer = null;
        persistOpenQuoteNow();
    }, 1000);
}

async function persistOpenQuoteNow() {
    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
        const customer = window._currentCustomer;
        if (!customer || !customer.id) return;
        if (_openQuoteSaveTimer) {
            clearTimeout(_openQuoteSaveTimer);
            _openQuoteSaveTimer = null;
        }
        if (!quoteItems || quoteItems.length === 0) {
            if (!window._quoteClearConfirmed) return;
            window._quoteClearConfirmed = false;
            const { error } = await supabaseClient
                .from('customer_open_quotes')
                .delete()
                .eq('customer_id', customer.id);
            if (error) console.warn('persistOpenQuoteNow delete:', error.message);
            return;
        }
        const items = buildOpenQuoteItems();
        const { error } = await supabaseClient
            .from('customer_open_quotes')
            .upsert({
                customer_id: customer.id,
                customer_email: (customer.email || '').toLowerCase().trim() || null,
                customer_name: customer.name || null,
                customer_company: customer.company || null,
                salesman_email: customer.salesman_email || null,
                items: items,
                item_count: items.length,
                estimated_subtotal: openQuoteEstimatedSubtotal(items),
                updated_at: new Date().toISOString()
            }, { onConflict: 'customer_id' });
        if (error) console.warn('persistOpenQuoteNow upsert:', error.message);
    } catch (err) {
        console.warn('persistOpenQuoteNow:', err && err.message ? err.message : err);
    }
}

function quoteItemsFromOpenQuoteRows(rows) {
    return (rows || []).map(function (item) {
        const name = item.product || item.name || '';
        const price = item.displayPrice || (item.unitPrice != null ? ('$' + Number(item.unitPrice).toFixed(2)) : (item.price || ''));
        return {
            name: name,
            displayName: item.displayName || name,
            price: price,
            cs: item.caseSize || item.cs || '',
            quantity: parseInt(item.quantity, 10) || 1,
            isMarketPrice: !!(item.isMarketPrice)
        };
    }).filter(function (item) { return !!item.name; });
}

function removeStaleQuoteItems() {
    if (!Array.isArray(quoteItems) || !quoteItems.length) return;
    if (typeof WHOLESALE_PRICES === 'undefined' || !Array.isArray(WHOLESALE_PRICES)) return;

    const allowed = {};
    WHOLESALE_PRICES.forEach(function (p) {
        if (p && p.name) allowed[p.name] = true;
    });

    const before = quoteItems.length;
    quoteItems = quoteItems.filter(function (item) {
        return item && item.name && allowed[item.name];
    });

    if (quoteItems.length !== before) {
        localStorage.setItem('wholesaleQuote', JSON.stringify(quoteItems));
        const customer = window._currentCustomer;
        if (customer && customer.id) {
            localStorage.setItem('wholesaleQuote_' + customer.id, JSON.stringify(quoteItems));
        }
        if (typeof renderQuote === 'function') renderQuote();
        console.log('Removed', before - quoteItems.length, 'stale quote item(s)');
    }
}

async function loadOpenQuoteForActiveStore() {
    const customer = window._currentCustomer;
    if (!customer || !customer.id) {
        quoteItems = [];
        localStorage.setItem('wholesaleQuote', '[]');
        return;
    }
    const localKey = 'wholesaleQuote_' + customer.id;
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient
                .from('customer_open_quotes')
                .select('items')
                .eq('customer_id', customer.id)
                .maybeSingle();
            if (error) throw error;
            if (data && Array.isArray(data.items) && data.items.length) {
                quoteItems = quoteItemsFromOpenQuoteRows(data.items);
                localStorage.setItem(localKey, JSON.stringify(quoteItems));
                localStorage.setItem('wholesaleQuote', JSON.stringify(quoteItems));
                return;
            }
        }
    } catch (err) {
        console.warn('loadOpenQuoteForActiveStore:', err && err.message ? err.message : err);
    }
    try {
        const saved = localStorage.getItem(localKey);
        quoteItems = saved ? (JSON.parse(saved) || []) : [];
    } catch (e) {
        quoteItems = [];
    }
    localStorage.setItem('wholesaleQuote', JSON.stringify(quoteItems));
        removeStaleQuoteItems();
}

function showQuoteAddedBadge(name, qty) {
    var existing = document.getElementById('quote-added-badge');
    if (existing) existing.remove();
    var el = document.createElement('div');
    el.id = 'quote-added-badge';
    el.setAttribute('role', 'status');
    el.style.cssText = [
        'position:fixed',
        'left:50%',
        'bottom:24px',
        'transform:translateX(-50%)',
        'z-index:2147483647',
        'background:#1E4D2B',
        'color:#d4b78f',
        'border:2px solid #6B4423',
        'border-radius:16px',
        'padding:12px 20px',
        'font-size:14px',
        'font-weight:700',
        'text-align:center',
        'box-shadow:0 8px 24px rgba(0,0,0,0.25)',
        'pointer-events:none',
        'max-width:90vw'
    ].join(';');
    var title = document.createElement('p');
    title.style.cssText = 'margin:0;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;';
    title.textContent = 'Added to quote';
    var detail = document.createElement('p');
    detail.style.cssText = 'margin:4px 0 0;';
    detail.textContent = (name || 'Item') + ' × ' + (parseInt(qty, 10) || 1);
    el.appendChild(title);
    el.appendChild(detail);
    document.body.appendChild(el);
    if (window._quoteAddedBadgeTimer) clearTimeout(window._quoteAddedBadgeTimer);
    window._quoteAddedBadgeTimer = setTimeout(function () {
        var node = document.getElementById('quote-added-badge');
        if (node) node.remove();
        window._quoteAddedBadgeTimer = null;
    }, 2500);
}

function addToQuoteFromModal() {
    const pending = window._pendingQuoteItem;
    if (!pending) {
        closeAddToQuoteModal();
        return;
    }
    if (typeof isProductAllowedForBrian === 'function' && !isProductAllowedForBrian(pending.name)) {
        alert('This item is not on your pricing sheet and cannot be ordered.');
        closeAddToQuoteModal();
        window._pendingQuoteItem = null;
        return;
    }

    const qtyInput = document.getElementById('quote-quantity');
    const qty = parseInt(qtyInput?.value, 10) || 1;

    quoteItems.push({
        name: pending.name,
        price: pending.price,
        cs: pending.cs,
        quantity: qty
    });

    localStorage.setItem('wholesaleQuote', JSON.stringify(quoteItems));
    updateQuoteSidebar();
    if (typeof schedulePersistOpenQuote === 'function') schedulePersistOpenQuote();
    showQuoteAddedBadge(pending.name, qty);
    closeAddToQuoteModal();
    window._pendingQuoteItem = null;
}

function addToQuote(name, price, cs, quantity) {
    if (typeof isProductAllowedForBrian === 'function' && !isProductAllowedForBrian(name)) {
        alert('This item is not on your pricing sheet and cannot be ordered.');
        return;
    }
    if (isWholesaleOos(name)) {
        alert(wholesaleOosLabel(name) || 'This item is out of stock.');
        return;
    }
    const qty = parseInt(quantity) || 1;

    quoteItems.push({
        name: name,
        price: price,
        cs: cs,
        quantity: qty,
        isMarketPrice: isWholesaleMarketProduct(name)
    });

    localStorage.setItem('wholesaleQuote', JSON.stringify(quoteItems));
    updateQuoteSidebar();
    if (typeof schedulePersistOpenQuote === 'function') schedulePersistOpenQuote();
    showQuoteAddedBadge(name, qty);
    closeAddToQuoteModal();
}

function updateQuoteSidebar() {
    const itemsContainer = document.getElementById('quote-items-list');
    const summaryContainer = document.getElementById('quote-summary');
    
    if (!itemsContainer || !summaryContainer) return;

    // Always keep mobile quote badge in sync (empty + non-empty)
    const mobileCount = document.getElementById('quote-count-mobile');
    if (mobileCount) mobileCount.textContent = String(quoteItems.length);

    itemsContainer.innerHTML = '';
    summaryContainer.innerHTML = '';

    if (quoteItems.length === 0) {
        itemsContainer.innerHTML = `<p class="text-[#6B4423] text-sm italic">No items in quote yet.</p>`;
        return;
    }

    let pricedTotal = 0;
    let hasMarketPrice = false;

    quoteItems.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'bg-[#f8f4eb] border border-[#d4b78f] rounded-xl p-3 mb-2 text-sm';

        const isMarketPrice = !!(item.isMarketPrice || String(item.price || '').toLowerCase().includes('market'));
        const isPerLb = String(item.price || '').toLowerCase().includes('/lb');
        const numericPrice = parseFloat(String(item.price || '').replace(/[^0-9.]/g, '')) || 0;

        let priceInfo = '';
        let lineTotalHTML = '';

        if (isMarketPrice) hasMarketPrice = true;

        if (numericPrice <= 0 && isMarketPrice) {
            priceInfo = `<span class="text-[#c56134] font-semibold">Market Price</span>`;
            lineTotalHTML = marketDisclaimerHtml();
        } else {
            const numericPrice = parseFloat(item.price.replace(/[^0-9.]/g, '')) || 0;
            const lineTotalValue = numericPrice * item.quantity;
            pricedTotal += lineTotalValue;

            if (isPerLb) {
                priceInfo = item.price;
                lineTotalHTML = `<div class="text-right font-semibold mt-1">$${lineTotalValue.toFixed(2)}</div>`;
            } else {
                priceInfo = item.price;
                lineTotalHTML = `<div class="text-right font-semibold mt-1">$${lineTotalValue.toFixed(2)}</div>`;
            }
        }

        const qtyLabel = isPerLb ? 'lbs' : 'units';
        const qtyVal = parseInt(item.quantity, 10) || 1;
        div.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex-1 pr-2">
                    <p class="font-semibold leading-tight">${escapeHtml(wholesaleDisplayName(item.name))}</p>
                    ${(!hideWholesaleCaseCounts() && item.cs) ? ('<p class="text-xs text-[#6B4423] mt-0.5">' + escapeHtml(item.cs) + '</p>') : ''}
                    <p class="text-xs mt-1">${priceInfo}</p>
                    <div class="card-qty-input-wrap mt-1">
                        <input type="number" min="1" step="1" value="${qtyVal}"
                               onchange="updateQuoteQty(${index}, this.value)"
                               class="card-qty-input"
                               aria-label="Quantity">
                        <span class="card-qty-units-inside">${qtyLabel}</span>
                    </div>
                </div>

                <div class="flex flex-col items-end">
                    <button type="button" onclick="removeFromQuote(${index})"
                            class="text-red-500 hover:text-red-700 text-xl leading-none mb-1">
                        ×
                    </button>
                    ${lineTotalHTML}
                </div>
            </div>
        `;
        itemsContainer.appendChild(div);
    });

    // Sticky Summary Section
    let summaryHTML = '';

    if (pricedTotal > 0) {
        summaryHTML += `
            <div class="flex justify-between font-semibold mb-2">
                <span>Subtotal:</span>
                <span>$${pricedTotal.toFixed(2)}</span>
            </div>
        `;
    }

    if (hasMarketPrice) {
        summaryHTML += `
            <p class="text-xs text-[#c56134] mb-1">
                * ${MARKET_PRICE_DISCLAIMER}
            </p>
        `;
    }

    // Free shipping status for this customer + current quote subtotal
    const locText = getCustomerLocationText();
    if (locText && pricedTotal > 0) {
        const fs = evaluateFreeShipping(pricedTotal, locText);
        if (fs.free) {
            summaryHTML += `
                <div class="mb-3 px-3 py-2 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs font-semibold">
                    ✓ Free shipping unlocked — ${fs.reason}
                </div>
            `;
        } else if (fs.half) {
            summaryHTML += `
                <div class="mb-3 px-3 py-2 rounded-xl bg-[#f8f4eb] border border-[#d4b78f] text-[#6B4423] text-xs font-semibold">
                    ✓ Half freight unlocked. $${fs.remaining.toFixed(2)} more to reach free shipping.
                </div>
            `;
        } else {
            const toFree = Number(fs.remainingToFree != null ? fs.remainingToFree : fs.remaining) || 0;
            summaryHTML += `
                <div class="mb-3 px-3 py-2 rounded-xl bg-[#f8f4eb] border border-[#d4b78f] text-[#6B4423] text-xs">
                    $${toFree.toFixed(2)} more to reach free shipping.
                </div>
            `;
        }
    }

    const minRemaining = Math.max(0, WHOLESALE_MIN_ORDER - pricedTotal);
    if (minRemaining > 0) {
        summaryHTML += `
            <div class="mb-3 px-3 py-2 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-xs font-semibold">
                $${minRemaining.toFixed(2)} more to reach the $200.00 minimum order.
            </div>
        `;
    }

    summaryHTML += `
        <p class="text-xs text-[#6B4423] italic mb-3">
            Final total will be sent with your invoice.
        </p>
        <button onclick="${minRemaining > 0 ? 'alertWholesaleMinimum()' : 'openQuoteConfirmModal()'}"
                class="w-full font-bold py-3 rounded-2xl border-2 border-[#6B4423] ${minRemaining > 0 ? 'bg-[#d4b78f] text-[#6B4423]' : 'bg-[#1E4D2B] hover:bg-[#254a2f] text-[#d4b78f]'}">
            ${minRemaining > 0 ? '$200.00 minimum required' : 'Submit Quote Request'}
        </button>
        <button onclick="clearQuote()" 
                class="w-full mt-2 text-sm text-[#6B4423] hover:text-red-600">
            Clear Quote
        </button>
    `;

    summaryContainer.innerHTML = summaryHTML;
}

function expandQuoteModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999]';

    let content = `<div class="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">`;
    content += `<h3 class="text-2xl font-bold brand-green mb-4">Full Quote Summary</h3>`;

    if (quoteItems.length === 0) {
        content += `<p class="text-[#6B4423]">No items in quote.</p>`;
    } else {
        content += `<div class="space-y-3">`;
        quoteItems.forEach((item, index) => {
            const isMarket = item.price.toLowerCase().includes('market');
            content += `
                <div class="border border-[#d4b78f] rounded-xl p-4">
                    <div class="flex justify-between">
                        <div>
                            <p class="font-semibold">${escapeHtml(wholesaleDisplayName(item.name))}</p>
                            <p class="text-sm text-[#6B4423]">${escapeHtml(item.cs)} × ${item.quantity}</p>
                        </div>
                        <div class="text-right">
                            ${isMarket ? 
                                `<span class="text-[#c56134] font-semibold">Market Price</span>` : 
                                `<span class="font-semibold">$${(parseFloat(item.price.replace(/[^0-9.]/g,'')) * item.quantity).toFixed(2)}</span>`
                            }
                        </div>
                    </div>
                </div>
            `;
        });
        content += `</div>`;
    }

    content += `
        <div class="mt-6 flex justify-end gap-3">
            <button onclick="this.closest('.fixed').remove()" 
                    class="px-6 py-2 border-2 border-[#6B4423] rounded-2xl">Close</button>
            <button onclick="this.closest('.fixed').remove(); openQuoteConfirmModal();" 
                    class="px-6 py-2 bg-[#1E4D2B] text-[#d4b78f] rounded-2xl">Submit Quote</button>
        </div>
    `;

    content += `</div>`;
    modal.innerHTML = content;
    document.body.appendChild(modal);
}

function updateQuoteQty(index, value) {
    if (!quoteItems[index]) return;
    const qty = parseInt(value, 10);
    quoteItems[index].quantity = (isNaN(qty) || qty < 1) ? 1 : qty;
    localStorage.setItem('wholesaleQuote', JSON.stringify(quoteItems));
    updateQuoteSidebar();
    if (typeof schedulePersistOpenQuote === 'function') schedulePersistOpenQuote();
}

function removeFromQuote(index) {
    quoteItems.splice(index, 1);
    localStorage.setItem('wholesaleQuote', JSON.stringify(quoteItems));
    updateQuoteSidebar();
    if (typeof schedulePersistOpenQuote === 'function') schedulePersistOpenQuote();
}

function clearQuote() {
    if (confirm("Are you sure you want to clear the entire quote?")) {
        quoteItems = [];
        window._quoteClearConfirmed = true;
        localStorage.setItem('wholesaleQuote', JSON.stringify(quoteItems));
        updateQuoteSidebar();
        if (typeof persistOpenQuoteNow === 'function') persistOpenQuoteNow();
    }
}

function showQuoteSidebar() {
    if (window._customerIsInactive) return;
    const sidebar = document.getElementById('quote-sidebar');
    if (sidebar) {
        sidebar.classList.remove('hidden');
        sidebar.classList.add('flex');
    }
}

function hideQuoteSidebar() {
    const sidebar = document.getElementById('quote-sidebar');
    if (sidebar) {
        sidebar.classList.add('hidden');
        sidebar.classList.remove('flex');
    }
}

async function notifyMarshallProforma(order) {
    try {
        const res = await fetch(SUPABASE_URL + '/functions/v1/send-pro-forma-email', {
            method: 'POST',
            headers: await getEdgeFunctionHeaders(),
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
                source: order.source || 'wholesale',
                commissionRate: order.commissionRate || order.salesman_commission_percent || null
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

function hideQuoteConfirmModal() {
    document.getElementById('quote-confirm-modal-dynamic')?.remove();
    const staticModal = document.getElementById('quote-confirm-modal');
    if (staticModal) {
        staticModal.classList.add('hidden');
        staticModal.style.display = '';
    }
}

function digitsOnly(value, max) {
    return String(value || '').replace(/\D/g, '').slice(0, max || 4);
}

function shouldSkipPaymentPrompt(customer) {
    if (!customer) return false;
    const id = String(customer.id || '').toLowerCase();
    const email = String(customer.email || '').toLowerCase().trim();
    const company = String(customer.company || '').toLowerCase().trim();
    const exemptIds = {
        'e87aac4d-6a28-4831-9efb-f98ab4f45f0e': true,
        'c6a37470-05c1-4c67-b291-832e103955ae': true,
        '5328f89e-73b3-468f-91a2-9efd0a6437ca': true
    };
    const exemptEmails = {
        'frantz64@comcast.net': true,
        'mrfeedman@gmail.com': true,
        'wagginwheelspet@outlook.com': true
    };
    if (exemptIds[id] || exemptEmails[email]) return true;
    if (email === 'jackerman@donegalnatural.com') return true;
    if (typeof isBrianAssignedCustomer === 'function' && isBrianAssignedCustomer(customer)) return true;
    if (company.indexOf('admin test store') !== -1) return true;
    if (company === 'woof n tails llc') return true;
    if (company === 'waggin wheels pet supply') return true;
    if (company === 'the feed store, inc.') return true;
    return false;
}

function hasPaymentMethodOnFile(customer) {
    if (!customer) return false;
    const method = String(customer.payment_method || '').toLowerCase();
    const status = String(customer.payment_method_status || '').toLowerCase();
    if (method !== 'card' && method !== 'ach') return false;
    return status === 'on_file' || status === 'approved';
}

function paymentMethodLabel(customer) {
    if (!hasPaymentMethodOnFile(customer)) return 'None on file';
    let details = {};
    try { details = JSON.parse(customer.payment_method_details || '{}') || {}; } catch (e) { details = {}; }
    if (String(customer.payment_method).toLowerCase() === 'card') {
        return (details.brand || 'Card') + ' •••• ' + (details.last4 || 'on file');
    }
    return (details.bank_name || 'ACH') + ' •••• ' + (details.account_last4 || 'on file');
}

function setPaymentMethodType(type) {
    window._paymentMethodType = type === 'ach' ? 'ach' : 'card';
    const cardBtn = document.getElementById('pay-type-card');
    const achBtn = document.getElementById('pay-type-ach');
    const cardFields = document.getElementById('pay-card-fields');
    const achFields = document.getElementById('pay-ach-fields');
    if (cardBtn) cardBtn.className = 'px-4 py-2 border-2 rounded-xl font-semibold ' +
        (window._paymentMethodType === 'card' ? 'border-[#1E4D2B] bg-[#1E4D2B] text-[#d4b78f]' : 'border-[#6B4423]');
    if (achBtn) achBtn.className = 'px-4 py-2 border-2 rounded-xl font-semibold ' +
        (window._paymentMethodType === 'ach' ? 'border-[#1E4D2B] bg-[#1E4D2B] text-[#d4b78f]' : 'border-[#6B4423]');
    if (cardFields) cardFields.classList.toggle('hidden', window._paymentMethodType !== 'card');
    if (achFields) achFields.classList.toggle('hidden', window._paymentMethodType !== 'ach');
}

function openPaymentMethodModal() {
    const err = document.getElementById('pay-method-error');
    if (err) { err.textContent = ''; err.classList.add('hidden'); }
    const customer = window._currentCustomer || {};
    let details = {};
    try { details = JSON.parse(customer.payment_method_details || '{}') || {}; } catch (e) { details = {}; }
    const savedType = String(customer.payment_method || '').toLowerCase() === 'ach' ? 'ach' : 'card';
    setPaymentMethodType(savedType);
    const setVal = function (id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    };
    setVal('pay-card-brand', details.brand);
    setVal('pay-card-name', details.name);
    setVal('pay-card-last4', details.last4);
    setVal('pay-card-exp-month', details.exp_month);
    setVal('pay-card-exp-year', details.exp_year);
    setVal('pay-ach-name', details.name);
    setVal('pay-ach-bank', details.bank_name);
    setVal('pay-ach-type', details.account_type || 'checking');
    setVal('pay-ach-routing-last4', details.routing_last4);
    setVal('pay-ach-account-last4', details.account_last4);
    document.getElementById('payment-method-modal')?.classList.remove('hidden');
}

function hidePaymentMethodModal() {
    document.getElementById('payment-method-modal')?.classList.add('hidden');
}

async function savePaymentMethodOnFile() {
    const customer = window._currentCustomer;
    const err = document.getElementById('pay-method-error');
    const showErr = function (msg) {
        if (!err) { alert(msg); return; }
        err.textContent = msg;
        err.classList.remove('hidden');
    };
    if (!customer || !customer.id) {
        showErr('No store is selected.');
        return;
    }
    const type = window._paymentMethodType === 'ach' ? 'ach' : 'card';
    let details = { type: type, saved_at: new Date().toISOString() };
    if (type === 'card') {
        const name = (document.getElementById('pay-card-name')?.value || '').trim();
        const brand = (document.getElementById('pay-card-brand')?.value || '').trim();
        const last4 = digitsOnly(document.getElementById('pay-card-last4')?.value, 4);
        const mm = digitsOnly(document.getElementById('pay-card-exp-month')?.value, 2);
        const yy = digitsOnly(document.getElementById('pay-card-exp-year')?.value, 2);
        const monthNum = parseInt(mm, 10);
        if (!name || !brand || last4.length !== 4 || !monthNum || monthNum < 1 || monthNum > 12 || yy.length !== 2) {
            showErr('Enter name, brand, last 4, and a valid expiration.');
            return;
        }
        details.name = name;
        details.brand = brand;
        details.last4 = last4;
        details.exp_month = mm.padStart(2, '0');
        details.exp_year = yy;
    } else {
        const name = (document.getElementById('pay-ach-name')?.value || '').trim();
        const bank = (document.getElementById('pay-ach-bank')?.value || '').trim();
        const acctType = (document.getElementById('pay-ach-type')?.value || 'checking').trim();
        const routingLast4 = digitsOnly(document.getElementById('pay-ach-routing-last4')?.value, 4);
        const accountLast4 = digitsOnly(document.getElementById('pay-ach-account-last4')?.value, 4);
        if (!name || !bank || routingLast4.length !== 4 || accountLast4.length !== 4) {
            showErr('Enter name, bank, routing last 4, and account last 4.');
            return;
        }
        details.name = name;
        details.bank_name = bank;
        details.account_type = acctType === 'savings' ? 'savings' : 'checking';
        details.routing_last4 = routingLast4;
        details.account_last4 = accountLast4;
    }
    try {
        const { data, error } = await supabaseClient
            .from('customers')
            .update({
                payment_method: type,
                payment_method_status: 'on_file',
                payment_method_details: JSON.stringify(details)
            })
            .eq('id', customer.id)
            .select()
            .maybeSingle();
        if (error) throw error;
        if (data) {
            window._currentCustomer = Object.assign({}, customer, data);
            const list = window._customerAccounts || [];
            window._customerAccounts = list.map(function (row) {
                return String(row.id) === String(customer.id) ? Object.assign({}, row, data) : row;
            });
        } else {
            customer.payment_method = type;
            customer.payment_method_status = 'on_file';
            customer.payment_method_details = JSON.stringify(details);
        }
        hidePaymentMethodModal();
        if (typeof showAccountInfo === 'function') showAccountInfo();
        if (window._resumeQuoteAfterPayment) {
            window._resumeQuoteAfterPayment = false;
            openQuoteConfirmModal();
        }
    } catch (e) {
        console.error(e);
        showErr(e.message || 'Could not save payment method.');
    }
}

function openQuoteConfirmModal() {
    if (window._customerIsInactive) {
        alert('This account is currently inactive and cannot submit new quotes.');
        return;
    }
    if (!quoteItems || quoteItems.length === 0) {
        alert('Your quote is empty!');
        return;
    }
    if (!wholesaleQuoteMeetsMinimum()) {
        alertWholesaleMinimum();
        return;
    }
    const payCustomer = window._currentCustomer || null;
    const requirePayment = !!(payCustomer && payCustomer.require_payment_method);
    if (requirePayment && !shouldSkipPaymentPrompt(payCustomer) && !hasPaymentMethodOnFile(payCustomer)) {
        window._resumeQuoteAfterPayment = true;
        openPaymentMethodModal();
        return;
    }

    // Remove any existing dynamic confirm
    document.getElementById('quote-confirm-modal-dynamic')?.remove();

    const customer = window._currentCustomer || null;
    let shipText = 'No shipping address on file';
    if (customer) {
        shipText = (customer.shipping_address || customer.shippingAddress || '').trim()
            || 'No shipping address on file';
    }

    const accounts = window._customerAccounts || [];
    const isMultiStore = accounts.length > 1;
    const storeName = (customer && (customer.company || customer.name)) || 'Selected store';
    const storeBlock = isMultiStore ? `
                <div style="margin:0 0 16px;padding:12px 16px;background:#f8f4eb;border:2px solid #6B4423;border-radius:12px;">
                    <p style="font-size:11px;font-weight:700;color:#6B4423;text-transform:uppercase;margin:0 0 4px;">Ordering for</p>
                    <p style="font-size:16px;font-weight:700;color:#1E4D2B;margin:0;">${escapeHtml(storeName)}</p>
                </div>
    ` : '';

    let pricedTotal = 0;
    let hasMarket = false;
    let rows = '';

    quoteItems.forEach((item) => {
        const isMarket = !!(item.isMarketPrice || String(item.price || '').toLowerCase().includes('market'));
        const qty = item.quantity || 1;
        const unit = parseFloat(String(item.price || '').replace(/[^0-9.]/g, '')) || 0;
        if (isMarket) hasMarket = true;
        if (unit > 0) pricedTotal += unit * qty;
        const lineLabel = unit > 0 ? ('$' + (unit * qty).toFixed(2)) : (isMarket ? 'Market' : (item.price || '—'));
        rows += `
            <div style="display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #f0e6d6;padding-bottom:8px;margin-bottom:8px;">
                <div style="min-width:0;">
                    <p style="font-weight:600;color:#1E4D2B;margin:0;">${escapeHtml(wholesaleDisplayName(item.name || 'Item'))}</p>
                    <p style="font-size:12px;color:#6B4423;margin:2px 0 0;">Qty ${qty}${(!hideWholesaleCaseCounts() && item.cs) ? ' · ' + escapeHtml(item.cs) : ''}</p>
                    ${isMarket ? '<p style="font-size:11px;color:#c2410c;margin:4px 0 0;">' + MARKET_PRICE_DISCLAIMER + '</p>' : ''}
                </div>
                <p style="font-weight:600;color:#1E4D2B;white-space:nowrap;margin:0;">${lineLabel}</p>
            </div>
        `;
    });

    const overlay = document.createElement('div');
    overlay.id = 'quote-confirm-modal-dynamic';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;padding:16px;';
    overlay.innerHTML = `
        <div style="background:#fff;border:2px solid #6B4423;border-radius:16px;width:100%;max-width:32rem;max-height:90vh;overflow:auto;box-shadow:0 20px 40px rgba(0,0,0,0.2);">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #d4b78f;">
                <h2 style="margin:0;font-size:1.25rem;font-weight:700;color:#1E4D2B;">Confirm Your Quote</h2>
                <button type="button" onclick="hideQuoteConfirmModal()" style="border:none;background:none;font-size:1.5rem;color:#6B4423;cursor:pointer;line-height:1;">&times;</button>
            </div>
            <div style="padding:16px 20px;">
                ${storeBlock}
                <p style="font-size:11px;font-weight:700;color:#6B4423;text-transform:uppercase;margin:0 0 4px;">Shipping Address</p>
                <p style="font-size:14px;color:#1E4D2B;white-space:pre-line;margin:0 0 16px;">${escapeHtml(shipText)}</p>

                <p style="font-size:11px;font-weight:700;color:#6B4423;text-transform:uppercase;margin:0 0 8px;">Items</p>
                <div style="margin-bottom:16px;">${rows}</div>

                <div style="display:flex;justify-content:space-between;align-items:center;background:#f8f4eb;border-radius:12px;padding:12px 16px;">
                    <span style="font-weight:600;color:#6B4423;">Quote Total</span>
                    <span style="font-size:1.25rem;font-weight:700;color:#1E4D2B;">$${pricedTotal.toFixed(2)}</span>
                </div>
                ${hasMarket ? '<p style="font-size:12px;color:#c2410c;margin:8px 0 0;">Some items are market price and are not included in this total.</p>' : ''}
            </div>                ${hasMarket ? '<p style="font-size:12px;color:#c2410c;margin:8px 0 0;">' + MARKET_PRICE_DISCLAIMER + '</p>' : ''}
            <div style="display:flex;gap:12px;padding:16px 20px;border-top:1px solid #d4b78f;">
                <button type="button" onclick="hideQuoteConfirmModal()"
                    style="flex:1;padding:10px 16px;border:2px solid #6B4423;background:#fff;color:#6B4423;border-radius:12px;font-weight:600;cursor:pointer;">
                    Go Back
                </button>
                <button type="button" onclick="confirmAndSubmitQuote()"
                    style="flex:1;padding:10px 16px;border:none;background:#1E4D2B;color:#d4b78f;border-radius:12px;font-weight:600;cursor:pointer;">
                    Confirm &amp; Submit
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function confirmAndSubmitQuote() {
    hideQuoteConfirmModal();
    if (typeof submitQuote === 'function') {
        await submitQuote();
    }
}

async function submitQuote() {
    if (window._customerIsInactive) {
        alert('This account is currently inactive and cannot submit new quotes.');
        return;
    }
    if (quoteItems.length === 0) {
        alert("Your quote is empty!");
        return;
    }
    if (!wholesaleQuoteMeetsMinimum()) {
        alertWholesaleMinimum();
        return;
    }

    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!user) {
        alert("You must be logged in to submit a quote.");
        return;
    }

    const customer = window._currentCustomer || null;

    const items = quoteItems.map(item => {
        const isMarket = !!(item.isMarketPrice || String(item.price || '').toLowerCase().includes('market'));
        const numericPrice = parseFloat(String(item.price || '').replace(/[^0-9.]/g, '')) || 0;

        return {
            product: item.name,
            displayName: wholesaleDisplayName(item.name),
            quantity: item.quantity || 1,
            caseSize: item.cs || "",
            unitPrice: numericPrice || null,
            displayPrice: item.price || "",
            isMarketPrice: isMarket
        };
    });

    const invoiceNumber = generateInvoiceNumber();

    const payload = {
        customer_id: customer?.id || null,
        customer_name: user.fullName || user.username || customer?.name || "Unknown Customer",
        customer_email: (user.email || customer?.email || "").toLowerCase().trim(),
        customer_company: user.company || customer?.company || "",
        salesman_email: customer?.salesman_email || null,
        salesman_name: (String(customer?.salesman_email || '').toLowerCase().trim() === 'donegaldogtreats@gmail.com')
            ? 'Brian Frohne'
            : null,
        status: "submitted",
        source: "wholesale",
        items: items,
        notes: "Submitted via Wholesale Portal",
        shipping_cost: 0,
        submitted_at: new Date().toISOString(),
        invoice_number: invoiceNumber,
        salesman_commission_percent: (customer && customer.salesman_commission_percent != null && customer.salesman_commission_percent !== '')
            ? Number(customer.salesman_commission_percent)
            : null
    };
    if (String(payload.salesman_email || '').toLowerCase().trim() !== 'jackerman@donegalnatural.com') {
        payload.portal_commission_rate = 5;
    }

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
            credit: 0,
            submittedAt: payload.submitted_at,
            source: payload.source,
            commissionRate: payload.salesman_commission_percent || null,
            customerPhone: (window._currentCustomer && window._currentCustomer.phone) || '',
            billingAddress: (window._currentCustomer && (window._currentCustomer.billing_address || window._currentCustomer.billingAddress)) || '',
            shippingAddress: (window._currentCustomer && (window._currentCustomer.shipping_address || window._currentCustomer.shippingAddress)) || ''
        });

        quoteItems = [];
        localStorage.setItem('wholesaleQuote', JSON.stringify(quoteItems));
        updateQuoteSidebar();
        if (typeof persistOpenQuoteNow === 'function') persistOpenQuoteNow();

        // Phase 1: open pro forma immediately with the new order
        const newOrder = {
            id: shortId,
            invoice_number: shortId,
            _uuid: data?.id,
            customer_name: payload.customer_name,
            customer_company: payload.customer_company,
            customer_email: payload.customer_email,
            items: payload.items,
            shipping_cost: payload.shipping_cost || 0,
            credit: 0,
            status: payload.status,
            submitted_at: payload.submitted_at,
            notes: payload.notes
        };
        if (typeof showBrandedInvoice === 'function') {
            showBrandedInvoice(newOrder);
        }

        // Short confirmation (optional — remove the alert entirely if you prefer none)
        alert("Thank you, your quote has been submitted.");

        // Close quote sidebar and go to Order History
        if (typeof hideQuoteSidebar === 'function') hideQuoteSidebar();
        document.querySelectorAll('.portal-section').forEach(s => { s.style.display = 'none'; });
        const ordersSec = document.getElementById('section-orders');
        if (ordersSec) ordersSec.style.display = 'block';
        document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
        const ordersLink = document.querySelector('.sidebar-link[data-target="section-orders"]');
        if (ordersLink) ordersLink.classList.add('active');
        if (typeof loadOrderHistory === 'function') loadOrderHistory();
    } catch (err) {
        console.error('Order submit error:', err);
        alert("Could not submit your quote. Please try again.\n" + (err.message || ""));
    }
}

let editQuoteOrder = null;

let editQuoteItems = [];

function openEditQuoteModal(orderId) {
    const order = (window._myQuotesCache || []).find(o => String(o.id) === String(orderId));
    if (!order) {
        alert('Quote not found.');
        return;
    }

    const status = (order.status || '').toLowerCase();
    if (status !== 'submitted' && status !== 'pending' && status !== '') {
        alert('This quote can no longer be edited. Once Accepted, please submit a new order.');
        return;
    }

    editQuoteOrder = order;
    editQuoteItems = (order.items || []).map(item => ({
        product: item.product || item.name || '',
        quantity: item.quantity || 1,
        caseSize: item.caseSize || item.cs || '',
        unitPrice: item.unitPrice != null ? item.unitPrice : null,
        displayPrice: item.displayPrice || item.price || '',
        isMarketPrice: !!item.isMarketPrice
    }));

    document.getElementById('edit-quote-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'edit-quote-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999] p-4';
    modal.innerHTML = `
        <div class="bg-white border-2 border-[#6B4423] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
             onclick="event.stopPropagation()">
            <div class="flex items-start justify-between mb-4">
                <div>
                    <h2 class="text-2xl font-bold brand-green">Edit Quote</h2>
                    <p class="text-sm text-[#6B4423]">Add, remove, or change quantities. Only available while awaiting review.</p>
                    <p class="text-xs text-[#6B4423] font-mono mt-1">${escapeHtml(displayInvoiceNumber(order))}</p>
                </div>
                <button type="button" onclick="hideEditQuoteModal()"
                        class="text-2xl text-[#6B4423] leading-none">&times;</button>
            </div>

            <div class="mb-4">
                <h3 class="font-bold brand-green mb-2">Line Items</h3>
                <div id="edit-quote-items" class="space-y-2"></div>
            </div>

            <div class="mb-4 relative">
                <label class="block text-sm font-semibold text-[#6B4423] mb-1">Add product</label>
                <input type="text" id="edit-quote-product-search"
                       oninput="renderEditQuoteProductSearch()"
                       class="w-full border-2 border-[#6B4423] rounded-xl px-4 py-2"
                       placeholder="Search products…">
                <div id="edit-quote-product-results"
                     class="hidden absolute z-50 w-full bg-white border-2 border-[#6B4423] rounded-xl mt-1 max-h-56 overflow-auto shadow-lg"></div>
            </div>

            <div class="border-t border-[#d4b78f] pt-4 mb-6 flex justify-between text-sm">
                <span class="text-[#6B4423]">Subtotal</span>
                <span id="edit-quote-subtotal" class="font-semibold brand-green">$0.00</span>
            </div>

            <div class="flex justify-end gap-3">
                <button type="button" onclick="hideEditQuoteModal()"
                        class="px-5 py-2 border-2 border-[#6B4423] rounded-xl">
                    Cancel
                </button>
                <button type="button" onclick="confirmEditQuote()"
                        class="px-5 py-2 bg-[#1E4D2B] text-[#d4b78f] font-bold rounded-xl">
                    Save Changes
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    renderEditQuoteItems();
    recalcEditQuoteTotals();
}

function hideEditQuoteModal() {
    document.getElementById('edit-quote-modal')?.remove();
    editQuoteOrder = null;
    editQuoteItems = [];
}

function renderEditQuoteItems() {
    const container = document.getElementById('edit-quote-items');
    if (!container) return;

    if (!editQuoteItems.length) {
        container.innerHTML = `<p class="text-sm text-[#6B4423]">No line items.</p>`;
        return;
    }

    container.innerHTML = editQuoteItems.map((item, index) => {
        const hasRealPrice = item.unitPrice != null && !isNaN(Number(item.unitPrice)) && Number(item.unitPrice) > 0;
        const priceLabel = hasRealPrice
            ? ('$' + Number(item.unitPrice).toFixed(2))
            : (item.isMarketPrice ? 'Market' : (item.displayPrice || '—'));
        const qty = parseInt(item.quantity, 10) || 0;
        const unit = hasRealPrice ? Number(item.unitPrice) : 0;
        const lineTotalLabel = hasRealPrice ? ('$' + (qty * unit).toFixed(2)) : '—';

        return `
            <div class="flex flex-wrap items-center gap-2 border border-[#d4b78f] rounded-xl px-3 py-2 bg-[#f8f4eb]">
                <div class="flex-1 min-w-[140px]">
                    <p class="font-semibold text-sm brand-green">${escapeHtml(orderLineDisplayName(item))}</p>
                    <p class="text-xs text-[#6B4423]">${priceLabel}${(!hideWholesaleCaseCounts() && item.caseSize) ? ' · ' + item.caseSize : ''}</p>
                </div>
                <input type="number" min="1" step="1" value="${item.quantity}"
                       onchange="updateEditQuoteQty(${index}, this.value)"
                       class="w-20 border-2 border-[#6B4423] rounded-lg px-2 py-1 text-sm">
                <div class="text-right min-w-[60px]">
                    <p class="text-xs text-[#6B4423]">Line</p>
                    <p class="font-semibold text-sm brand-green">${lineTotalLabel}</p>
                </div>
                <button type="button" onclick="removeEditQuoteItem(${index})"
                        class="px-3 py-1 text-xs bg-red-600 text-white rounded-lg">
                    Remove
                </button>
            </div>
        `;
    }).join('');
}

function updateEditQuoteQty(index, value) {
    const qty = parseInt(value, 10);
    if (!editQuoteItems[index]) return;
    editQuoteItems[index].quantity = (isNaN(qty) || qty < 1) ? 1 : qty;
    renderEditQuoteItems();
    recalcEditQuoteTotals();
}

function removeEditQuoteItem(index) {
    editQuoteItems.splice(index, 1);
    renderEditQuoteItems();
    recalcEditQuoteTotals();
}

function renderEditQuoteProductSearch() {
    const search = (document.getElementById('edit-quote-product-search')?.value || '').toLowerCase().trim();
    const resultsEl = document.getElementById('edit-quote-product-results');
    if (!resultsEl) return;

    if (search.length < 1) {
        resultsEl.innerHTML = '';
        resultsEl.classList.add('hidden');
        return;
    }

    const source = (typeof productsAllowedForCurrentCustomer === 'function')
        ? productsAllowedForCurrentCustomer(WHOLESALE_PRICES)
        : (WHOLESALE_PRICES || []);
    const matches = source.filter(p =>
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
                    onclick="addEditQuoteProduct('${safeName}')"
                    class="w-full text-left px-4 py-2 text-sm hover:bg-[#f8f4eb] border-b border-[#f0e6d9]">
                <span class="font-medium text-[#1E4D2B]">${escapeHtml(p.name)}</span>
                <span class="block text-xs text-[#6B4423]">${escapeHtml(p.cs || '')} · ${escapeHtml(p.price || '')}</span>
            </button>
        `;
    }).join('');
    resultsEl.classList.remove('hidden');
}

function addEditQuoteProduct(productName) {
    if (typeof isProductAllowedForBrian === 'function' && !isProductAllowedForBrian(productName)) {
        alert('This item is not on your pricing sheet and cannot be ordered.');
        return;
    }
    const catalog = (WHOLESALE_PRICES || []).find(p => p.name === productName);
    const isMarket = catalog && (catalog.price || '').toLowerCase().includes('market');
    const numericPrice = isMarket
        ? null
        : parseFloat(String(catalog?.price || '').replace(/[^0-9.]/g, '')) || null;

    const existing = editQuoteItems.find(i => i.product === productName);
    if (existing) {
        existing.quantity = (existing.quantity || 1) + 1;
    } else {
        editQuoteItems.push({
            product: productName,
            quantity: 1,
            caseSize: catalog?.cs || '',
            unitPrice: numericPrice,
            displayPrice: catalog?.price || '',
            isMarketPrice: !!isMarket
        });
    }

    const searchEl = document.getElementById('edit-quote-product-search');
    if (searchEl) searchEl.value = '';
    const resultsEl = document.getElementById('edit-quote-product-results');
    if (resultsEl) {
        resultsEl.innerHTML = '';
        resultsEl.classList.add('hidden');
    }

    renderEditQuoteItems();
    recalcEditQuoteTotals();
}

function recalcEditQuoteTotals() {
    let subtotal = 0;
    (editQuoteItems || []).forEach(item => {
        const unit = parseFloat(item.unitPrice);
        if (isNaN(unit) || unit < 0) return;
        subtotal += unit * (parseInt(item.quantity, 10) || 0);
    });
    const el = document.getElementById('edit-quote-subtotal');
    if (el) el.textContent = '$' + subtotal.toFixed(2);
}

async function confirmEditQuote() {
    if (!editQuoteOrder) return;

    if (!editQuoteItems.length) {
        alert('Quote must have at least one line item.');
        return;
    }

    const status = (editQuoteOrder.status || '').toLowerCase();
    if (status !== 'submitted' && status !== 'pending' && status !== '') {
        alert('This quote can no longer be edited.');
        return;
    }

    const itemsPayload = editQuoteItems.map(item => ({
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
            .update({ items: itemsPayload })
            .eq('id', editQuoteOrder.id);

        if (error) throw error;

        hideEditQuoteModal();
        await loadMyQuotes();
        alert('Quote updated.');
    } catch (err) {
        console.error(err);
        alert('Could not update quote.\n' + (err.message || ''));
    }
}

window.showPackagedItemModal = showPackagedItemModal;
window.closeAddToQuoteModal = closeAddToQuoteModal;
window.buildOpenQuoteItems = buildOpenQuoteItems;
window.openQuoteEstimatedSubtotal = openQuoteEstimatedSubtotal;
window.schedulePersistOpenQuote = schedulePersistOpenQuote;
window.persistOpenQuoteNow = persistOpenQuoteNow;
window.quoteItemsFromOpenQuoteRows = quoteItemsFromOpenQuoteRows;
window.removeStaleQuoteItems = removeStaleQuoteItems;
window.loadOpenQuoteForActiveStore = loadOpenQuoteForActiveStore;
window.showQuoteAddedBadge = showQuoteAddedBadge;
window.addToQuoteFromModal = addToQuoteFromModal;
window.addToQuote = addToQuote;
window.updateQuoteSidebar = updateQuoteSidebar;
window.expandQuoteModal = expandQuoteModal;
window.updateQuoteQty = updateQuoteQty;
window.removeFromQuote = removeFromQuote;
window.clearQuote = clearQuote;
window.showQuoteSidebar = showQuoteSidebar;
window.hideQuoteSidebar = hideQuoteSidebar;
window.notifyMarshallProforma = notifyMarshallProforma;
window.hideQuoteConfirmModal = hideQuoteConfirmModal;
window.digitsOnly = digitsOnly;
window.shouldSkipPaymentPrompt = shouldSkipPaymentPrompt;
window.hasPaymentMethodOnFile = hasPaymentMethodOnFile;
window.paymentMethodLabel = paymentMethodLabel;
window.setPaymentMethodType = setPaymentMethodType;
window.openPaymentMethodModal = openPaymentMethodModal;
window.hidePaymentMethodModal = hidePaymentMethodModal;
window.savePaymentMethodOnFile = savePaymentMethodOnFile;
window.openQuoteConfirmModal = openQuoteConfirmModal;
window.confirmAndSubmitQuote = confirmAndSubmitQuote;
window.submitQuote = submitQuote;
window.openEditQuoteModal = openEditQuoteModal;
window.hideEditQuoteModal = hideEditQuoteModal;
window.renderEditQuoteItems = renderEditQuoteItems;
window.updateEditQuoteQty = updateEditQuoteQty;
window.removeEditQuoteItem = removeEditQuoteItem;
window.renderEditQuoteProductSearch = renderEditQuoteProductSearch;
window.addEditQuoteProduct = addEditQuoteProduct;
window.recalcEditQuoteTotals = recalcEditQuoteTotals;
window.confirmEditQuote = confirmEditQuote;
