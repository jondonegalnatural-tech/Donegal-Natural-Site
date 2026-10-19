// Internal portal — mass email, mailing list, and email log.
// SUPABASE_URL comes from js/supabase-client.js

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

window.isBlockedMassEmailAddress = isBlockedMassEmailAddress;
window.shouldSkipMassEmailStore = shouldSkipMassEmailStore;
window.addMassEmailRecipient = addMassEmailRecipient;
window.getMassEmailRecipients = getMassEmailRecipients;
window.renderMailingListExtras = renderMailingListExtras;
window.loadMailingListExtras = loadMailingListExtras;
window.addMailingListExtra = addMailingListExtra;
window.removeMailingListExtra = removeMailingListExtra;
window.parseIndividualMassEmails = parseIndividualMassEmails;
window.populateMassEmailSalesmanSelect = populateMassEmailSalesmanSelect;
window.onMassEmailSalesmanChange = onMassEmailSalesmanChange;
window.onMassEmailAudienceChange = onMassEmailAudienceChange;
window.updateMassEmailRecipientCount = updateMassEmailRecipientCount;
window.renderMassEmailRecipientChecks = renderMassEmailRecipientChecks;
window.setMassEmailChecks = setMassEmailChecks;
window.updateMassEmailCheckedLabel = updateMassEmailCheckedLabel;
window.getCheckedMassEmailRecipients = getCheckedMassEmailRecipients;
window.previewMassEmailRecipients = previewMassEmailRecipients;
window.buildMassEmailHtml = buildMassEmailHtml;
window.logPortalEmail = logPortalEmail;
window.loadEmailLog = loadEmailLog;
window.readMassEmailAttachment = readMassEmailAttachment;
window.sendMassCustomerEmail = sendMassCustomerEmail;
