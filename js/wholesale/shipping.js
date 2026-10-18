// Wholesale portal — shipping rules and saved addresses.
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

const MID_ATLANTIC_650_STATES = [
    'MD', 'NY', 'NJ', 'OH', 'WV',
    'MARYLAND', 'NEW YORK', 'NEW JERSEY', 'OHIO', 'WEST VIRGINIA'
];

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

function isFloridaLocation(text) {
    const t = (text || '').toUpperCase();
    return (
        t.includes('FLORIDA') ||
        t.includes(', FL') ||
        t.includes(' FL ') ||
        t.endsWith(' FL') ||
        t.includes(' FL,')
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

function isMidAtlantic650Location(text) {
    const t = (text || '').toUpperCase();
    return MID_ATLANTIC_650_STATES.some(state => {
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

function getWholesaleQuoteMerchandiseTotal() {
    let total = 0;
    (quoteItems || []).forEach(function (item) {
        const unit = parseFloat(String((item && item.price) || '').replace(/[^0-9.]/g, '')) || 0;
        const qty = parseInt((item && item.quantity), 10) || 0;
        if (unit > 0 && qty > 0) total += unit * qty;
    });
    return total;
}

function wholesaleQuoteMeetsMinimum() {
    return getWholesaleQuoteMerchandiseTotal() + 0.0001 >= WHOLESALE_MIN_ORDER;
}

function alertWholesaleMinimum() {
    const left = Math.max(0, WHOLESALE_MIN_ORDER - getWholesaleQuoteMerchandiseTotal());
    alert(
        'Wholesale orders must total at least $200.00.\n' +
        'Add $' + left.toFixed(2) + ' more to submit.'
    );
}

function evaluateFreeShipping(subtotal, locationText) {
    const amount = Number(subtotal) || 0;
    const loc = locationText || '';
    let halfAt = 250;
    let freeAt = 1500;
    let zoneLabel = 'east of the Mississippi';

    if (isPennsylvaniaLocation(loc)) {
        halfAt = null;
        freeAt = 200;
        zoneLabel = 'Pennsylvania';
    } else if (isFloridaLocation(loc)) {
        halfAt = 250;
        freeAt = 400;
        zoneLabel = 'Florida';
    } else if (isWestOfMississippiLocation(loc)) {
        halfAt = 250;
        freeAt = 2000;
        zoneLabel = 'west of the Mississippi';
    }

    const free = amount >= freeAt;
    const half = !free && halfAt != null && amount >= halfAt;
    const remainingToFree = Math.max(0, freeAt - amount);
    if (free) {
        return {
            free: true,
            half: false,
            threshold: freeAt,
            remaining: 0,
            remainingToFree: 0,
            reason: 'Free shipping: $' + freeAt.toLocaleString() + '+ in ' + zoneLabel
        };
    }
    if (half) {
        return {
            free: false,
            half: true,
            threshold: freeAt,
            remaining: remainingToFree,
            remainingToFree: remainingToFree,
            reason: 'Half freight unlocked in ' + zoneLabel
        };
    }
    return {
        free: false,
        half: false,
        threshold: freeAt,
        remaining: remainingToFree,
        remainingToFree: remainingToFree,
        reason: 'Free shipping at $' + freeAt.toFixed(2) + ' in ' + zoneLabel
    };
}

function getCustomerLocationText() {
    const c = window._currentCustomer;
    if (!c) return '';
    return [
        c.shipping_address,
        c.billing_address,
        c.territory,
        c.shippingAddress,
        c.billingAddress
    ].filter(Boolean).join(' ').toUpperCase();
}

function updateShippingPolicyCard() {
    const el = document.getElementById('customer-shipping-policy-text');
    if (!el) return;

    const loc = getCustomerLocationText();
    if (!loc) {
        el.innerHTML = 'Add a shipping address to see your shipping policy.';
        return;
    }

    if (isPennsylvaniaLocation(loc)) {
        el.innerHTML =
            'Your location: <strong>Pennsylvania</strong>. Free shipping on orders of <strong>$200.00+</strong>.';
    } else if (isFloridaLocation(loc)) {
        el.innerHTML =
            'Your location: <strong>Florida</strong>. Half freight <strong>$250–$399.99</strong>. Free shipping <strong>$400.00+</strong>.';
    } else if (isWestOfMississippiLocation(loc)) {
        el.innerHTML =
            'Your region: <strong>west of the Mississippi</strong>. Half freight <strong>$250–$1,999.99</strong>. Free shipping <strong>$2,000.00+</strong>.';
    } else {
        el.innerHTML =
            'Your region: <strong>east of the Mississippi</strong>. Half freight <strong>$250–$1,499.99</strong>. Free shipping <strong>$1,500.00+</strong>.';
    }
}

async function openShippingAddressesModal() {
    const modal = document.getElementById('manage-addresses-modal');
    if (!modal) {
        alert('Edit form is missing from the page. Hard-refresh and try again.');
        return;
    }

    modal.querySelectorAll('[data-section]').forEach(el => {
        const section = el.getAttribute('data-section');
        el.style.display = (section === 'store' || section === 'shipping') ? 'block' : 'none';
    });
    const title = modal.querySelector('h2');
    if (title) title.textContent = 'Edit Account';
    modal.classList.remove('hidden');
    modal.style.cssText = 'display:flex;position:fixed;top:0;left:0;right:0;bottom:0;z-index:200;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);padding:1rem;';
    document.body.appendChild(modal);
    fillAccountEditFields();
    await loadManageAddressesList();
    await bindWholesaleAccountPlaces();
}

function composeWholesaleAddress(place) {
    const comps = (place && place.addressComponents) || [];
    const get = function (type, useShort) {
        const part = comps.find(function (c) {
            return (c.types || []).indexOf(type) !== -1;
        });
        if (!part) return '';
        return useShort ? (part.shortText || '') : (part.longText || '');
    };
    const street = [get('street_number'), get('route')].filter(Boolean).join(' ');
    const apt = get('subpremise');
    const city = get('locality') || get('sublocality') || get('administrative_area_level_3');
    const state = get('administrative_area_level_1', true);
    const zip = get('postal_code');
    const parts = [];
    if (street) parts.push(street);
    if (apt) parts.push(apt);
    const cityLine = [city, state].filter(Boolean).join(', ') + (zip ? (' ' + zip) : '');
    if (cityLine.trim()) parts.push(cityLine.trim());
    if (parts.length) return parts.join(', ');
    return String((place && place.formattedAddress) || '')
        .replace(/,?\s*USA\s*$/i, '')
        .trim();
}

async function attachWholesalePlacesField(fieldId, mode) {
    const fieldEl = document.getElementById(fieldId);
    if (!fieldEl) return;
    if (document.getElementById(fieldId + '-places')) return;
    if (!window.google || !google.maps || !google.maps.importLibrary) return;
    try {
        const { PlaceAutocompleteElement } = await google.maps.importLibrary('places');
        const widget = new PlaceAutocompleteElement({
            includedRegionCodes: ['us'],
            requestedLanguage: 'en'
        });
        widget.id = fieldId + '-places';
        widget.setAttribute('placeholder', fieldEl.getAttribute('placeholder') || 'Start typing an address');
        widget.setAttribute('no-input-icon', '');
        widget.setAttribute('no-clear-button', '');
        fieldEl.parentElement.insertBefore(widget, fieldEl);
        fieldEl.classList.add('places-backed');
        if (fieldEl.value) widget.value = fieldEl.value;
        widget.addEventListener('gmp-select', async function (event) {
            const prediction = event.placePrediction;
            if (!prediction || typeof prediction.toPlace !== 'function') return;
            const place = prediction.toPlace();
            await place.fetchFields({
                fields: ['addressComponents', 'formattedAddress', 'location', 'id']
            });
            if (mode === 'new-addr') {
                const comps = place.addressComponents || [];
                const get = function (type, useShort) {
                    const part = comps.find(function (c) {
                        return (c.types || []).indexOf(type) !== -1;
                    });
                    if (!part) return '';
                    return useShort ? (part.shortText || '') : (part.longText || '');
                };
                const street = [get('street_number'), get('route')].filter(Boolean).join(' ');
                fieldEl.value = street || composeWholesaleAddress(place);
                widget.value = fieldEl.value;
                const cityEl = document.getElementById('new-addr-city');
                const stateEl = document.getElementById('new-addr-state');
                const zipEl = document.getElementById('new-addr-zip');
                const aptEl = document.getElementById('new-addr-line2');
                if (cityEl) cityEl.value = get('locality') || get('sublocality') || get('administrative_area_level_3');
                if (stateEl) stateEl.value = get('administrative_area_level_1', true);
                if (zipEl) zipEl.value = get('postal_code');
                const apt = get('subpremise');
                if (apt && aptEl && !aptEl.value.trim()) aptEl.value = apt;
            } else {
                const line = composeWholesaleAddress(place);
                fieldEl.value = line;
                widget.value = line;
            }
        });
        widget.addEventListener('input', function () {
            fieldEl.value = widget.value || '';
        });
    } catch (err) {
        console.warn('Wholesale Account Places widget:', err);
    }
}

async function bindWholesaleAccountPlaces() {
    await attachWholesalePlacesField('account-edit-shipping', 'full');
    await attachWholesalePlacesField('account-edit-billing', 'full');
    await attachWholesalePlacesField('new-addr-line1', 'new-addr');
}

window.initWholesaleAccountPlaces = async function () {
    await bindWholesaleAccountPlaces();
};

function closeManageAddressesModal() {
    const modal = document.getElementById('manage-addresses-modal');
    if (modal) modal.style.display = 'none';
}

async function loadManageAddressesList() {
    const container = document.getElementById('manage-addresses-list');
    if (!container) return;

    const customer = window._currentCustomer;
    if (!customer) {
        container.innerHTML = '<p class="text-sm text-[#6B4423]">No customer selected.</p>';
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('customer_shipping_addresses')
            .select('*')
            .eq('customer_id', customer.id)
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = '<p class="text-sm text-[#6B4423]">No shipping addresses yet.</p>';
            return;
        }

        container.innerHTML = data.map(addr => {
            const line = [addr.address_line1, addr.address_line2, addr.city, addr.state, addr.zip]
                .filter(Boolean).join(', ');
            const badge = addr.is_default
                ? '<span class="ml-2 px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-100 text-green-800">Default</span>'
                : '';
            return `
                <div class="border border-[#d4b78f] rounded-xl p-3 bg-[#f8f4eb]">
                    <div class="flex justify-between items-start gap-2">
                        <div>
                            <p class="font-semibold text-[#1E4D2B]">${escapeHtml(addr.label || 'Address')}${badge}</p>
                            <p class="text-sm text-[#6B4423] mt-0.5">${escapeHtml(line)}</p>
                        </div>
                        <div class="flex flex-col gap-1">
                            ${!addr.is_default ? `<button onclick="setDefaultAddress('${addr.id}')" class="text-xs px-2 py-1 border border-[#6B4423] rounded-lg hover:bg-white">Set Default</button>` : ''}
                            <button onclick="deleteAddress('${addr.id}')" class="text-xs px-2 py-1 bg-red-600 text-white rounded-lg">Delete</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
        container.innerHTML = '<p class="text-sm text-red-600">Could not load addresses.</p>';
    }
}

async function saveNewAddress() {
    const customer = window._currentCustomer;
    if (!customer) {
        alert('No customer selected.');
        return;
    }

    const label = document.getElementById('new-addr-label')?.value.trim() || 'Shipping';
    const line1 = document.getElementById('new-addr-line1')?.value.trim() || '';
    const line2 = document.getElementById('new-addr-line2')?.value.trim() || null;
    const city  = document.getElementById('new-addr-city')?.value.trim() || '';
    const state = document.getElementById('new-addr-state')?.value.trim() || '';
    const zip   = document.getElementById('new-addr-zip')?.value.trim() || '';
    const makeDefault = document.getElementById('new-addr-default')?.checked || false;

    if (!line1 || !city || !state || !zip) {
        alert('Street, City, State, and ZIP are required.');
        return;
    }

    try {
        // If making this the default, clear existing default first
        if (makeDefault) {
            await supabaseClient
                .from('customer_shipping_addresses')
                .update({ is_default: false })
                .eq('customer_id', customer.id)
                .eq('is_default', true);
        }

        const { error } = await supabaseClient
            .from('customer_shipping_addresses')
            .insert({
                customer_id: customer.id,
                label,
                address_line1: line1,
                address_line2: line2,
                city,
                state,
                zip,
                is_default: makeDefault
            });

        if (error) throw error;

        // Clear form
        document.getElementById('new-addr-label').value = '';
        document.getElementById('new-addr-line1').value = '';
        document.getElementById('new-addr-line2').value = '';
        document.getElementById('new-addr-city').value = '';
        document.getElementById('new-addr-state').value = '';
        document.getElementById('new-addr-zip').value = '';
        document.getElementById('new-addr-default').checked = false;

        await loadManageAddressesList();
    } catch (err) {
        console.error(err);
        alert('Could not save address.\n' + (err.message || ''));
    }
}

async function setDefaultAddress(addressId) {
    const customer = window._currentCustomer;
    if (!customer) return;

    try {
        // Clear current default
        await supabaseClient
            .from('customer_shipping_addresses')
            .update({ is_default: false })
            .eq('customer_id', customer.id)
            .eq('is_default', true);

        // Set new default
        const { error } = await supabaseClient
            .from('customer_shipping_addresses')
            .update({ is_default: true })
            .eq('id', addressId);

        if (error) throw error;
        await loadManageAddressesList();
    } catch (err) {
        console.error(err);
        alert('Could not update default address.');
    }
}

async function deleteAddress(addressId) {
    if (!confirm('Delete this shipping address?')) return;

    try {
        const { error } = await supabaseClient
            .from('customer_shipping_addresses')
            .delete()
            .eq('id', addressId);

        if (error) throw error;
        await loadManageAddressesList();
    } catch (err) {
        console.error(err);
        alert('Could not delete address.');
    }
}

async function checkAndShowAddressConfirmation() {
    try {
        const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (!user || !user.email) return;

        const storageKey = 'shippingAddressConfirmed_' + user.email.toLowerCase();
        if (localStorage.getItem(storageKey)) return; // already confirmed in this browser

        // Prefer the currently selected store if multi-store is active
        let customer = window._currentCustomer || null;

        if (!customer) {
            const { data: customers, error: custErr } = await supabaseClient
                .from('customers')
                .select('id, name, email')
                .ilike('email', user.email)
                .limit(1);
            if (custErr || !customers || customers.length === 0) return;
            customer = customers[0];
        }

        // Load default shipping address
        const { data: addresses, error: addrErr } = await supabaseClient
            .from('customer_shipping_addresses')
            .select('*')
            .eq('customer_id', customer.id)
            .eq('is_default', true)
            .limit(1);

        if (addrErr || !addresses || addresses.length === 0) return;

        const addr = addresses[0];

        // Fill modal fields
        document.getElementById('confirm-address-line1').value = addr.address_line1 || '';
        document.getElementById('confirm-address-line2').value = addr.address_line2 || '';
        document.getElementById('confirm-city').value = addr.city || '';
        document.getElementById('confirm-state').value = addr.state || '';
        document.getElementById('confirm-zip').value = addr.zip || '';

        const modal = document.getElementById('address-confirm-modal');
        if (!modal) return;

        modal.dataset.addressId = addr.id;
        modal.dataset.storageKey = storageKey;
        modal.style.display = 'flex';

        document.getElementById('confirm-address-btn').onclick = async function () {
            const addressId = modal.dataset.addressId;
            const key = modal.dataset.storageKey;

            const updated = {
                address_line1: document.getElementById('confirm-address-line1').value.trim(),
                address_line2: document.getElementById('confirm-address-line2').value.trim() || null,
                city: document.getElementById('confirm-city').value.trim(),
                state: document.getElementById('confirm-state').value.trim(),
                zip: document.getElementById('confirm-zip').value.trim(),
                updated_at: new Date().toISOString()
            };

            if (!updated.address_line1 || !updated.city || !updated.state || !updated.zip) {
                alert('Please fill in Street Address, City, State, and ZIP.');
                return;
            }

            const { error } = await supabaseClient
                .from('customer_shipping_addresses')
                .update(updated)
                .eq('id', addressId);

            if (error) {
                console.error('Address update failed:', error);
                alert('Could not save address. Please try again.');
                return;
            }

            localStorage.setItem(key, 'true');
            modal.style.display = 'none';
        };

    } catch (err) {
        console.error('Address confirmation error:', err);
    }
}

window.isPennsylvaniaLocation = isPennsylvaniaLocation;
window.isFloridaLocation = isFloridaLocation;
window.isWestOfMississippiLocation = isWestOfMississippiLocation;
window.isMidAtlantic650Location = isMidAtlantic650Location;
window.getWholesaleQuoteMerchandiseTotal = getWholesaleQuoteMerchandiseTotal;
window.wholesaleQuoteMeetsMinimum = wholesaleQuoteMeetsMinimum;
window.alertWholesaleMinimum = alertWholesaleMinimum;
window.evaluateFreeShipping = evaluateFreeShipping;
window.getCustomerLocationText = getCustomerLocationText;
window.updateShippingPolicyCard = updateShippingPolicyCard;
window.openShippingAddressesModal = openShippingAddressesModal;
window.composeWholesaleAddress = composeWholesaleAddress;
window.attachWholesalePlacesField = attachWholesalePlacesField;
window.bindWholesaleAccountPlaces = bindWholesaleAccountPlaces;
window.closeManageAddressesModal = closeManageAddressesModal;
window.loadManageAddressesList = loadManageAddressesList;
window.saveNewAddress = saveNewAddress;
window.setDefaultAddress = setDefaultAddress;
window.deleteAddress = deleteAddress;
window.checkAndShowAddressConfirmation = checkAndShowAddressConfirmation;
