// Salesman portal — admin proposal review and customer edit proposals.
function showAdminPanel() {
    const modal = document.getElementById("admin-modal");
    const list = document.getElementById("admin-proposals-list");
    const pending = proposals.filter(p => p.status === "Pending");

    if (pending.length === 0) {
        list.innerHTML = "<p style='padding:1.5rem 0;color:#6B4423;'>No pending proposals.</p>";
    } else {
        list.innerHTML = pending.map(p => `
            <div class="proposal-card">
                <strong>${escapeHtml(p.product)}</strong> for <strong>${escapeHtml(p.customer)}</strong><br>
                <span style="font-size:0.85rem;">by ${p.salesmanName}</span><br><br>
                Current: <strong>${p.currentPrice}</strong> → Proposed: <strong style="color:#c56134;">${p.proposedPrice}</strong><br>
                <em>${p.reason}</em><br><br>
                <button onclick="approveProposal(${p.id}, this)" style="background:#166534;color:white;border:none;padding:0.5rem 1rem;border-radius:8px;margin-right:0.5rem;">Approve</button>
                <button onclick="rejectProposal(${p.id}, this)" style="background:#991b1b;color:white;border:none;padding:0.5rem 1rem;border-radius:8px;">Reject</button>
            </div>
        `).join("");
    }
    modal.style.display = "flex";
}

function hideAdminPanel() {
    document.getElementById("admin-modal").style.display = "none";
    renderMyProposals();
}

function approveProposal(id, btn) {
    const p = proposals.find(x => x.id === id);
    p.status = "Approved";
    p.adminNotes = prompt("Admin notes (optional):", "Approved") || "";
    localStorage.setItem("salesmanProposals", JSON.stringify(proposals));
    btn.parentElement.innerHTML = "<span style='color:#166534;font-weight:700;'>✓ Approved</span>";
    setTimeout(hideAdminPanel, 800);
}

function rejectProposal(id, btn) {
    const p = proposals.find(x => x.id === id);
    p.status = "Rejected";
    p.adminNotes = prompt("Reason for rejection:", "") || "";
    localStorage.setItem("salesmanProposals", JSON.stringify(proposals));
    btn.parentElement.innerHTML = "<span style='color:#991b1b;font-weight:700;'>✗ Rejected</span>";
    setTimeout(hideAdminPanel, 800);
}

function updateAdminDashboard() {
    const pending = proposals.filter(p => p.status === "Pending").length;
    const approved = proposals.filter(p => p.status === "Approved").length;
    const rejected = proposals.filter(p => p.status === "Rejected").length;

    const pendingEl = document.getElementById("pending-count");
    const approvedEl = document.getElementById("approved-count");
    const rejectedEl = document.getElementById("rejected-count");

    if (pendingEl) pendingEl.textContent = pending;
    if (approvedEl) approvedEl.textContent = approved;
    if (rejectedEl) rejectedEl.textContent = rejected;
}

function showProposeCustomerEdit() {
    const detail = document.getElementById('salesman-customer-modal');
    if (!detail) {
        alert('Customer detail modal not found.');
        return;
    }

    let customer = null;
    try {
        customer = JSON.parse(detail.dataset.customerJson || 'null');
    } catch (e) {
        customer = null;
    }
    if (!customer) {
        alert('Could not load customer data for editing.');
        return;
    }

    const modal = document.getElementById('propose-customer-edit-modal');
    if (!modal) {
        alert('Propose edit modal is missing from the HTML.');
        return;
    }

    modal.dataset.customerId = customer.id || detail.dataset.customerId || '';

    const setVal = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    };

    setVal('pce-name', customer.name);
    setVal('pce-company', customer.company);
    setVal('pce-email', customer.email);
    setVal('pce-phone', customer.phone);
    setVal('pce-territory', customer.territory);
    setVal('pce-shipping', customer.shipping_address || customer.shippingAddress);
    setVal('pce-billing', customer.billing_address || customer.billingAddress);
    setVal('pce-notes', customer.notes);

    hideSalesmanCustomerModal();
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

function hideProposeCustomerEdit() {
    const modal = document.getElementById('propose-customer-edit-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

function togglePceSameAddress() {
    const same = document.getElementById('pce-same-address');
    const shipping = document.getElementById('pce-shipping');
    const billing = document.getElementById('pce-billing');
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

async function submitCustomerEditProposal(event) {
    event.preventDefault();

    const modal = document.getElementById('propose-customer-edit-modal');
    const customerId = modal?.dataset?.customerId;
    if (!customerId) {
        alert('Missing customer id.');
        return;
    }

    const user = getCurrentUser() || currentUser;
    if (!user) {
        alert('You must be logged in.');
        return;
    }

    const same = document.getElementById('pce-same-address')?.checked;
    const shipping = (document.getElementById('pce-shipping')?.value || '').trim();
    const billing = same
        ? shipping
        : (document.getElementById('pce-billing')?.value || '').trim();

    const proposed = {
        name: (document.getElementById('pce-name')?.value || '').trim(),
        company: (document.getElementById('pce-company')?.value || '').trim(),
        email: (document.getElementById('pce-email')?.value || '').trim(),
        phone: (document.getElementById('pce-phone')?.value || '').trim(),
        territory: (document.getElementById('pce-territory')?.value || '').trim(),
        shipping_address: shipping,
        billing_address: billing || shipping,
        notes: (document.getElementById('pce-notes')?.value || '').trim()
    };

    if (!proposed.name) {
        alert('Name is required.');
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('customer_change_requests')
            .insert({
                customer_id: customerId,
                salesman_email: (user.email || '').toLowerCase().trim(),
                salesman_name: user.fullName || user.name || 'Salesman',
                status: 'Pending',
                proposed_changes: proposed,
                submitted_at: new Date().toISOString()
            });

        if (error) {
            console.error(error);
            alert('Failed to submit edit request.\n' + error.message);
            return;
        }

        hideProposeCustomerEdit();
        alert('Edit submitted for admin approval.');

    } catch (err) {
        console.error(err);
        alert('Something went wrong.');
    }
}

window.showAdminPanel = showAdminPanel;
window.hideAdminPanel = hideAdminPanel;
window.approveProposal = approveProposal;
window.rejectProposal = rejectProposal;
window.updateAdminDashboard = updateAdminDashboard;
window.showProposeCustomerEdit = showProposeCustomerEdit;
window.hideProposeCustomerEdit = hideProposeCustomerEdit;
window.togglePceSameAddress = togglePceSameAddress;
window.submitCustomerEditProposal = submitCustomerEditProposal;
