// Internal portal — wholesale inquiry list, approve, and deny.
// inquiries stays global because dashboard and other portal code read it.
// inquiriesLoadedAt stays global in internal-portal.js.
// ================== WHOLESALE INQUIRIES (Supabase) ==================
var inquiries = [];

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
                const name = (i.owner_name || '').trim();
                const company = (i.company_name || name || '—').trim();
                return `
                    <div class="bg-[#f8f4eb] rounded-lg px-3 py-1.5 text-left">
                        <p class="text-sm font-semibold brand-green truncate">${escapeHtml(company)}</p>
                        ${name && name !== company ? `<p class="text-xs text-[#6B4423] truncate">${escapeHtml(name)}</p>` : ''}
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

function getInquirySubmittedBy(inquiry) {
    const notes = String((inquiry && inquiry.notes) || '');
    const match = notes.match(/Submitted by:\s*(.+)/i);
    return match ? match[1].trim() : '';
}

function formatInquirySource(inquiry) {
    const source = String((inquiry && inquiry.source) || '').trim();
    const submittedBy = getInquirySubmittedBy(inquiry);
    if (source.toLowerCase() === 'salesman') {
        return submittedBy ? ('Salesman — ' + submittedBy) : 'Salesman';
    }
    if (source.toLowerCase() === 'landing_page' || source.toLowerCase() === 'landing-page') {
        return submittedBy ? ('Website — ' + submittedBy) : 'Website inquiry';
    }
    if (submittedBy) return (source || 'Inquiry') + ' — ' + submittedBy;
    return source || '—';
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
                <p class="font-bold text-lg">${escapeHtml(inquiry.owner_name || '—')}</p>
                <p class="text-sm text-[#6B4423]">${escapeHtml(inquiry.company_name || '—')} • ${escapeHtml(inquiry.email || '—')}</p>
                <p class="text-sm text-[#6B4423]">${escapeHtml(typeof formatPhoneDisplay === 'function' ? formatPhoneDisplay(inquiry.phone) : (inquiry.phone || ''))}</p>
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
            </div>                <p class="text-xs text-[#6B4423]">Source: ${escapeHtml(formatInquirySource(inquiry))}</p>
        </div>
        <div class="mb-3 bg-white rounded-lg p-3 text-sm space-y-1">
            <p><strong>Location:</strong> ${escapeHtml(location)}</p>
            <p><strong>Monthly Amount:</strong> ${escapeHtml(inquiry.monthly_amount || '—')}</p>
            <p><strong>Nature of Business:</strong> ${escapeHtml(nature)}</p>
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
    const lines = String(block).split(/\n/).map(function (l) {
        return l.trim();
    }).filter(function (l) {
        return l && !/^(Google place|Lat|Lng|Place id)\b/i.test(l);
    });
    if (lines.length === 0) return result;

    for (let i = lines.length - 1; i >= 0; i--) {
        const cityStateZip = lines[i].match(/^(.+?),\s*([A-Z]{2})(?:\s+(\d{5}(?:-\d{4})?))?$/i);
        if (cityStateZip) {
            result.city = cityStateZip[1].trim();
            result.state = cityStateZip[2].toUpperCase();
            result.zip = cityStateZip[3] || '';
            lines.splice(i, 1);
            break;
        }
        const oneLine = lines[i].match(/^(.+?),\s*(.+?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/i);
        if (oneLine) {
            result.street = oneLine[1].trim();
            result.city = oneLine[2].trim();
            result.state = oneLine[3].toUpperCase();
            result.zip = oneLine[4];
            lines.splice(i, 1);
            break;
        }
    }

    if (lines.length >= 1) result.street = lines[0];
    if (lines.length >= 2 && !/,\s*[A-Z]{2}\b/i.test(lines[1])) {
        result.apt = lines[1];
    }
    if (!result.city && !result.street && block) {
        result.street = String(block).trim();
    }
    return result;
}

function syncInquiryPaymentRequiredDefault() {
    const select = document.getElementById('ia-salesman');
    const box = document.getElementById('ia-require-payment');
    if (!select || !box) return;
    const opt = select.options[select.selectedIndex];
    const email = String((opt && opt.dataset && opt.dataset.email) || '').toLowerCase().trim();
    box.checked = email !== 'donegaldogtreats@gmail.com';
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
        const fmtMatch = notesText.match(/Google formatted:\s*([^\n]+)/i);
        if (fmtMatch) {
            shipBlock = fmtMatch[1].replace(/,\s*USA\s*$/i, '').trim();
        }
        const shipMatch = notesText.match(/Shipping:\s*([\s\S]*?)(?=\n(?:Billing|Admin notes|Approved by|Assigned salesman|Temp username|Temp password|Google formatted|Google place|Lat|Lng):|$)/i);
        if (!shipBlock && shipMatch) shipBlock = shipMatch[1].trim();

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

        const submittedBy = (typeof getInquirySubmittedBy === 'function')
            ? getInquirySubmittedBy(inquiry)
            : '';
        if (!suggestedId && submittedBy) {
            const needle = submittedBy.toLowerCase();
            const bySubmit = list.find((s) => {
                const label = [s.first_name, s.last_name].filter(Boolean).join(' ').toLowerCase();
                const em = String(s.email || '').toLowerCase();
                return (label && (needle.indexOf(label) !== -1 || label.indexOf(needle) !== -1))
                    || (em && needle.indexOf(em) !== -1);
            });
            if (bySubmit) suggestedId = bySubmit.id;
        }

        if (suggestedId) {
            select.value = suggestedId;
            const match = list.find(s => s.id === suggestedId);
                        const matchName = match
                ? ([match.first_name, match.last_name].filter(Boolean).join(' ') || match.email)
                : '';
            suggestedEl.textContent = submittedBy
                ? ('Submitted by: ' + submittedBy)
                : (matchName ? ('Suggested (by territory): ' + matchName) : '');
        } else {
            suggestedEl.textContent = submittedBy
                ? ('Submitted by: ' + submittedBy + ' — select them in the list')
                : 'No automatic match — please select a salesman.';
        }

        if (typeof syncInquiryPaymentRequiredDefault === 'function') {
            syncInquiryPaymentRequiredDefault();
        }
        modal.classList.remove('hidden');
    } catch (err) {
        console.error('Open approval modal error:', err);
        alert('Could not open approval form.\n' + (err.message || ''));
    }
}

async function notifySalesmanInquiryAssigned(opts) {
    const to = String((opts && opts.salesmanEmail) || '').toLowerCase().trim();
    if (!to || to.indexOf('@') === -1) return;
    const salesmanName = (opts && opts.salesmanName) || 'there';
    const storeName = (opts && (opts.company || opts.name)) || 'a new store';
    const contactName = (opts && opts.name) || '';
    const customerEmail = (opts && opts.email) || '';
    const phone = (opts && opts.phone) || '';
    const shipping = (opts && opts.shipping) || '';
    const subject = 'New store assigned: ' + storeName;
    const text =
        'Hello ' + salesmanName + ',\n\n' +
        'A wholesale inquiry was approved and this store is now assigned to you.\n\n' +
        'Store: ' + storeName + '\n' +
        (contactName ? ('Contact: ' + contactName + '\n') : '') +
        (customerEmail ? ('Customer email: ' + customerEmail + '\n') : '') +
        (phone ? ('Phone: ' + phone + '\n') : '') +
        (shipping ? ('Shipping:\n' + shipping + '\n') : '') +
        '\nOpen the salesman portal to review the account and set pricing so they can see prices.\n' +
        'https://www.donegalnaturaldogtreats.com/login-portal.html\n\n' +
        'Questions: support@donegalnatural.com\n\n' +
        'Donegal Natural Dog Treats';
    const html =
        '<div style="font-family:Arial,sans-serif;color:#3b2a1a;line-height:1.5">' +
        '<p style="font-size:16px;font-weight:700;color:#1E4D2B;margin:0 0 12px">Donegal Natural Dog Treats</p>' +
        '<p>Hello ' + escapeHtml(salesmanName) + ',</p>' +
        '<p>A wholesale inquiry was approved and this store is now assigned to you.</p>' +
        '<p><strong>Store:</strong> ' + escapeHtml(storeName) + '<br>' +
        (contactName ? ('<strong>Contact:</strong> ' + escapeHtml(contactName) + '<br>') : '') +
        (customerEmail ? ('<strong>Customer email:</strong> ' + escapeHtml(customerEmail) + '<br>') : '') +
        (phone ? ('<strong>Phone:</strong> ' + escapeHtml(phone) + '<br>') : '') +
        (shipping ? ('<strong>Shipping:</strong><br>' + escapeHtml(shipping).replace(/\n/g, '<br>') + '<br>') : '') +
        '</p>' +
        '<p>Open the salesman portal to review the account and set pricing so they can see prices.<br>' +
        '<a href="https://www.donegalnaturaldogtreats.com/login-portal.html">Wholesale login</a></p>' +
        '<p>Questions: <a href="mailto:support@donegalnatural.com">support@donegalnatural.com</a></p>' +
        '</div>';
    try {
        const fnRes = await fetch(SUPABASE_URL + '/functions/v1/send-customer-email', {
            method: 'POST',
            headers: await getEdgeFunctionHeaders(),
            body: JSON.stringify({ to: to, subject: subject, html: html, text: text })
        });
        const fnText = await fnRes.text();
        let fnData = null;
        try { fnData = JSON.parse(fnText); } catch (e) { fnData = { error: fnText || 'Empty response' }; }
        if (typeof logPortalEmail === 'function') {
            await logPortalEmail({
                email_type: 'salesman_assignment',
                status: (fnRes.ok && !(fnData && fnData.error)) ? 'sent' : 'failed',
                to_email: to,
                to_name: salesmanName,
                subject: subject,
                store_names: storeName,
                error: (fnRes.ok && !(fnData && fnData.error)) ? null : ((fnData && fnData.error) || ('HTTP ' + fnRes.status))
            });
        }
    } catch (err) {
        console.warn('salesman assignment email:', err && err.message ? err.message : err);
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

    let matchInfo = { profile: null, matches: [], loginExists: false };
    try {
        matchInfo = await matchCustomerForInquiryApproval(email);
    } catch (e) {
        alert(e.message || 'This email cannot be used for a customer.');
        return;
    }

    let existingCustomer = findExactStoreMatch(matchInfo.matches, name, company);
    const loginExists = !!matchInfo.loginExists;
    if (!existingCustomer && (matchInfo.matches || []).length === 1) {
        existingCustomer = matchInfo.matches[0];
    }
    const existingStoreNames = (matchInfo.matches || []).map(function (c) {
        return c.name || c.company || c.id;
    }).filter(Boolean).join(', ');

    if (existingCustomer) {
        if (!confirm(
            'This email already has this store (' +
            ([existingCustomer.name, existingCustomer.company].filter(Boolean).join(' / ') || email) +
            ').\n' +
            'Current status: ' + (existingCustomer.status || '—') + '\n\n' +
            'Approve will update that store only.\n' +
            'Login and password will not change. No credentials email will be sent.\n' +
            'Commission stays, or transfers from the assigned salesman.\n' +
            'Status will be set to Active.\n\n' +
            'OK to update this store?'
        )) {
            return;
        }
    } else if (loginExists) {
        if (!confirm(
            'This email already logs into ' +
            matchInfo.matches.length +
            ' store(s)' +
            (existingStoreNames ? (':\n' + existingStoreNames) : '.') +
            '\n\n' +
            'Approve will ADD this new store to that same login.\n' +
            'Login and password will not change. No credentials email will be sent.\n' +
            'The customer will see the new store in their store switcher.\n\n' +
            'OK to attach this store?'
        )) {
            return;
        }
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

        let fnData = { email_sent: false, skipped: true };

        if (!loginExists) {
            const fnUrl = SUPABASE_URL + '/functions/v1/create-customer-user';
            const fnRes = await fetch(fnUrl, {
                method: 'POST',
                headers: await getEdgeFunctionHeaders(),
                body: JSON.stringify({
                    email: email,
                    full_name: name,
                    company: company
                })
            });

            const fnText = await fnRes.text();
            fnData = null;
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
        }

        // Do not store temp password in notes (security) — show once in alert + email only
        const notesSafe = notesParts.join('\n');

        let shipLat = null;
        let shipLng = null;
        let shipPlace = '';
        try {
            const { data: inqRow } = await supabaseClient
                .from('wholesale_inquiries')
                .select('notes')
                .eq('id', inquiryId)
                .maybeSingle();
            const rawNotes = (inqRow && inqRow.notes) ? String(inqRow.notes) : '';
            const latM = rawNotes.match(/\bLat:\s*(-?\d+(?:\.\d+)?)/i);
            const lngM = rawNotes.match(/\bLng:\s*(-?\d+(?:\.\d+)?)/i);
            const placeM = rawNotes.match(/Google place:\s*(\S+)/i);
            if (latM) shipLat = parseFloat(latM[1]);
            if (lngM) shipLng = parseFloat(lngM[1]);
            if (placeM) shipPlace = placeM[1];
        } catch (e) {
            console.warn('inquiry coord parse:', e);
        }
        if ((!isFinite(shipLat) || !isFinite(shipLng)) && typeof geocodeAddress === 'function') {
            const geo = await geocodeAddress(shipping);
            if (geo) {
                shipLat = geo.lat;
                shipLng = geo.lng;
            }
        }

        let commissionPercent = null;
        if (existingCustomer && existingCustomer.salesman_commission_percent != null && existingCustomer.salesman_commission_percent !== '') {
            const kept = Number(existingCustomer.salesman_commission_percent);
            if (isFinite(kept)) commissionPercent = kept;
        }
        if (salesmanId) {
            let salesmanRate = null;
            const cached = (typeof salesmen !== 'undefined' ? salesmen : []).find(function (s) {
                return String(s.id) === String(salesmanId);
            });
            if (cached && cached.commission != null && cached.commission !== '') {
                const n = Number(cached.commission);
                if (isFinite(n)) salesmanRate = n;
            }
            if (salesmanRate == null) {
                const { data: smRow } = await supabaseClient
                    .from('salesmen')
                    .select('commission')
                    .eq('id', salesmanId)
                    .maybeSingle();
                if (smRow && smRow.commission != null && smRow.commission !== '') {
                    const n = Number(smRow.commission);
                    if (isFinite(n)) salesmanRate = n;
                }
            }
            if (salesmanRate != null) commissionPercent = salesmanRate;
        }

        const customerPayload = {
            name: name,
            company: company,
            email: email,
            phone: phone || '',
            shipping_address: shipping || '',
            billing_address: billing || shipping || '',
            notes: notesSafe,
            status: 'Active',
            salesman_email: salesmanEmail,
            assigned_at: salesmanId ? new Date().toISOString() : null,
            salesman_commission_percent: commissionPercent,
            monthly_amount: (function () {
                const inquiryRow = (inquiries || []).find(function (row) {
                    return String(row.id) === String(inquiryId);
                });
                return (inquiryRow && inquiryRow.monthly_amount) ? inquiryRow.monthly_amount : null;
            })(),
            onboarding_complete: false,
            password_changed: false,
            lat: isFinite(shipLat) ? shipLat : null,
            lng: isFinite(shipLng) ? shipLng : null,
            place_id: shipPlace || null,
            require_payment_method: !!(document.getElementById('ia-require-payment') && document.getElementById('ia-require-payment').checked)
        };

        if (loginExists) {
            customerPayload.password_changed = true;
            if (!existingCustomer) {
                customerPayload.onboarding_complete = false;
            }
        }

        let customerId = existingCustomer && existingCustomer.id ? existingCustomer.id : null;
        if (!customerId) {
            const { data: created, error: custError } = await supabaseClient
                .from('customers')
                .insert([customerPayload])
                .select('id')
                .single();
            if (custError) throw custError;
            customerId = created && created.id ? created.id : null;
        } else {
            const updateFields = {
                name: customerPayload.name,
                company: customerPayload.company,
                email: customerPayload.email,
                phone: customerPayload.phone,
                shipping_address: customerPayload.shipping_address,
                billing_address: customerPayload.billing_address,
                notes: customerPayload.notes,
                status: 'Active',
                salesman_email: customerPayload.salesman_email,
                assigned_at: customerPayload.assigned_at,
                lat: customerPayload.lat,
                lng: customerPayload.lng,
                place_id: customerPayload.place_id,
                salesman_commission_percent: commissionPercent,
                require_payment_method: customerPayload.require_payment_method,
                updated_at: new Date().toISOString()
            };
            if (!loginExists) {
                updateFields.onboarding_complete = false;
                updateFields.password_changed = false;
                updateFields.last_login_at = null;
                updateFields.payment_method = null;
                updateFields.payment_method_status = null;
                updateFields.pricing_approved_at = null;
                updateFields.pricing_approved_by = null;
                updateFields.territory = null;
            }
            const { error: updError } = await supabaseClient
                .from('customers')
                .update(updateFields)
                .eq('id', customerId);
            if (updError) throw updError;            
            if (customerPayload.salesman_email) {
                await applyNewSalesmanPriceSheetToCustomer({
                    id: customerId,
                    email: customerPayload.email,
                    company: customerPayload.company,
                    name: customerPayload.name
                }, customerPayload.salesman_email);
            }
        }

        if (customerId) {
            const { data: existingShip } = await supabaseClient
                .from('customer_shipping_addresses')
                .select('id')
                .eq('customer_id', customerId)
                .eq('is_default', true)
                .maybeSingle();
            const shipFields = {
                label: 'Primary',
                address_line1: shipStreet,
                city: shipCity,
                state: shipState,
                zip: shipZip,
                is_default: true,
                lat: isFinite(shipLat) ? shipLat : null,
                lng: isFinite(shipLng) ? shipLng : null,
                place_id: shipPlace || null
            };
            if (existingShip && existingShip.id) {
                const { error: shipErr } = await supabaseClient
                    .from('customer_shipping_addresses')
                    .update(shipFields)
                    .eq('id', existingShip.id);
                if (shipErr) console.warn('approval shipping update:', shipErr.message);
            } else {
                const { error: shipErr } = await supabaseClient
                    .from('customer_shipping_addresses')
                    .insert(Object.assign({ customer_id: customerId }, shipFields));
                if (shipErr) console.warn('approval shipping insert:', shipErr.message);
            }
        }

        const updatePayload = {
            status: 'approved',
            owner_name: name,
            company_name: company,
            email: email,
            phone: phone || null,
            notes: notesSafe,
            assigned_salesman_id: salesmanId || null
        };

        const { error: updateError } = await supabaseClient
            .from('wholesale_inquiries')
            .update(updatePayload)
            .eq('id', inquiryId);

        if (updateError) throw updateError;

        hideInquiryApprovalModal();
        await renderInquiries();
        if (typeof loadCustomers === 'function') await loadCustomers();
        if (typeof initCustomerMap === 'function') initCustomerMap();
        if (salesmanEmail) {
            await notifySalesmanInquiryAssigned({
                salesmanEmail: salesmanEmail,
                salesmanName: salesmanName,
                name: name,
                company: company,
                email: email,
                phone: phone,
                shipping: shipping
            });
        }

        const emailOk = fnData && fnData.email_sent === true;
        const emailFailReason = (fnData && fnData.email_error) ? String(fnData.email_error) : '';

        if (!loginExists && typeof logPortalEmail === 'function') {
            await logPortalEmail({
                email_type: 'credentials',
                status: emailOk ? 'sent' : 'failed',
                to_email: email,
                to_name: name,
                subject: 'Your Donegal Natural wholesale account is approved',
                store_names: company || name,
                related_customer_id: customerId || null,
                error: emailOk ? null : (emailFailReason || 'Credentials email was not sent')
            });
        }

        if (typeof logAdminActivity === 'function') {
            logAdminActivity({
                action: 'approve',
                entityType: 'inquiry',
                entityLabel: company || name || email,
                summary: loginExists ? 'Existing login' : 'New customer created',
                details: { salesman: salesmanName || '', loginExists: !!loginExists }
            });
        }
        if (loginExists) {
            alert(
                'Inquiry approved.\n' +
                (existingCustomer
                    ? 'Existing store updated.\n'
                    : 'New store attached to the existing login.\n') +
                'Status set to Active.\n' +
                'Login and password were not changed.\n' +
                'No credentials email was sent.\n' +
                (salesmanId ? 'Assigned to: ' + salesmanName : 'No salesman assigned (you can assign later)')
            );
        } else {
            alert(
                'Inquiry approved.\n' +
                'Customer created.\n' +
                'Status set to Active.\n' +
                'Login account created.\n' +
                (salesmanId ? 'Assigned to: ' + salesmanName : 'No salesman assigned (you can assign later)') + '\n\n' +
                'Customer login email: ' + email + '\n\n' +
                (emailOk
                    ? 'Credentials email was sent to the customer.'
                    : ('Credentials email was NOT sent.\n' +
                       (emailFailReason ? ('Reason: ' + emailFailReason + '\n') : '') +
                       'Use password recovery after email delivery is restored.'))
            );
        }
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

// Inventory load, edit, receive, and stock status live in js/internal/inventory.js

window.loadInquiries = loadInquiries;
window.updateInquiryStats = updateInquiryStats;
window.renderInquiries = renderInquiries;
window.getInquiryLocation = getInquiryLocation;
window.getInquirySubmittedBy = getInquirySubmittedBy;
window.formatInquirySource = formatInquirySource;
window.createInquiryCard = createInquiryCard;
window.approveInquiry = approveInquiry;
window.hideInquiryApprovalModal = hideInquiryApprovalModal;
window.toggleNewCustomerSameAddress = toggleNewCustomerSameAddress;
window.toggleIaSameAddress = toggleIaSameAddress;
window.buildAddressFromParts = buildAddressFromParts;
window.parseAddressBlock = parseAddressBlock;
window.syncInquiryPaymentRequiredDefault = syncInquiryPaymentRequiredDefault;
window.openInquiryApprovalModal = openInquiryApprovalModal;
window.notifySalesmanInquiryAssigned = notifySalesmanInquiryAssigned;
window.confirmInquiryApproval = confirmInquiryApproval;
window.denyInquiry = denyInquiry;
window.addTestInquiry = addTestInquiry;
window.showInquiriesSection = showInquiriesSection;
