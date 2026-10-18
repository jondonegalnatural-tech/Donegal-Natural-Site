// Salesman portal — new customer submission and address lookup.
async function loadCustomerSubmissions() {
    const container = document.getElementById("customer-submissions-list");
    if (!container) return;

    const user = getCurrentUser() || currentUser;
    if (!user) return;

    container.innerHTML = `<p class="text-sm text-[#6B4423]">Loading submissions...</p>`;

    try {
        const email = (user.email || "").toLowerCase().trim();
        const { data, error } = await supabaseClient
            .from('wholesale_inquiries')
            .select('*')
            .eq('source', 'salesman')
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
            container.innerHTML = `<p class="text-sm text-red-600">Could not load submissions.</p>`;
            return;
        }

        // Filter to this salesman's submissions (from notes for now)
        const mine = (data || []).filter(row => {
            const n = (row.notes || "").toLowerCase();
            return n.includes(email) || n.includes((user.fullName || user.name || "").toLowerCase());
        });

        if (mine.length === 0) {
            container.innerHTML = `<p class="text-sm text-[#6B4423]">You have not submitted any customers yet.</p>`;
            return;
        }

        container.innerHTML = `
            <h3 class="text-lg font-bold brand-green mb-3">Your Submitted Customers</h3>
            ${mine.map(c => {
                const status = (c.status || "pending").toLowerCase();
                let badgeClass = "bg-orange-100 text-orange-700";
                if (status === "approved") badgeClass = "bg-green-100 text-green-700";
                if (status === "denied") badgeClass = "bg-red-100 text-red-700";
                return `
                    <div class="bg-white border-2 border-[#6B4423] rounded-xl p-4 mb-3">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="font-bold brand-green">${escapeHtml(c.owner_name || "")}</p>
                        <p class="text-sm text-[#6B4423]">${escapeHtml(c.company_name || "")}</p>
                            </div>
                            <span class="px-2 py-1 text-xs font-semibold rounded-full ${badgeClass}">
                                ${status.charAt(0).toUpperCase() + status.slice(1)}
                            </span>
                        </div>
                        ${c.email ? `<p class="text-sm mt-1">${escapeHtml(c.email)}</p>` : ""}
                        ${c.phone ? `<p class="text-sm">${escapeHtml(typeof formatPhoneDisplay === 'function' ? formatPhoneDisplay(c.phone) : c.phone)}</p>` : ""}
                    </div>
                `;
            }).join("")}
        `;
    } catch (err) {
        console.error(err);
        container.innerHTML = `<p class="text-sm text-red-600">Error loading submissions.</p>`;
    }
}

let salesmanShipPlace = null;

let salesmanBillPlace = null;

function isPoBoxAddress(value) {
    return /^\s*(p\.?\s*o\.?\s*box|post\s*office\s*box)\b/i.test(String(value || ''));
}

function setSalesmanCityStateZipVisible(prefix, show) {
    const wrap = document.getElementById(prefix + '-city-state-zip-wrap');
    if (!wrap) return;
    wrap.style.display = show ? 'grid' : 'none';
}

function fillSalesmanAddressFromPlace(prefix, place) {
    if (!place) return;
    const comps = place.addressComponents || [];
    const get = function (type, useShort) {
        const part = comps.find(function (c) {
            return (c.types || []).indexOf(type) !== -1;
        });
        if (!part) return '';
        return useShort ? (part.shortText || '') : (part.longText || '');
    };
    const streetLine = [get('street_number'), get('route')].filter(Boolean).join(' ');
    const city = get('locality') || get('sublocality') || get('administrative_area_level_3');
    const state = get('administrative_area_level_1', true);
    const zip = get('postal_code');
    const apt = get('subpremise');
    const streetEl = document.getElementById(prefix + '-street');
    const cityEl = document.getElementById(prefix + '-city');
    const stateEl = document.getElementById(prefix + '-state');
    const zipEl = document.getElementById(prefix + '-zip');
    const aptEl = document.getElementById(prefix + '-apt');
    if (streetEl && streetLine) streetEl.value = streetLine;
    if (cityEl && city) cityEl.value = city;
    if (stateEl && state) stateEl.value = state;
    if (zipEl && zip) zipEl.value = zip;
    if (apt && aptEl && !aptEl.value.trim()) aptEl.value = apt;
    const loc = place.location;
    const picked = {
        place_id: place.id || '',
        formatted: place.formattedAddress || streetLine,
        lat: loc && typeof loc.lat === 'function' ? loc.lat() : (loc && loc.lat) || null,
        lng: loc && typeof loc.lng === 'function' ? loc.lng() : (loc && loc.lng) || null
    };
    if (prefix === 'cust-ship') salesmanShipPlace = picked;
    else salesmanBillPlace = picked;
}

async function attachSalesmanPlacesWidget(prefix) {
    const streetEl = document.getElementById(prefix + '-street');
    const hintEl = document.getElementById(prefix + '-hint');
    if (!streetEl) return;
    if (document.getElementById(prefix + '-places')) return;
    if (!window.google || !google.maps || !google.maps.importLibrary) return;
    try {
        const { PlaceAutocompleteElement } = await google.maps.importLibrary('places');
        const widget = new PlaceAutocompleteElement({
            includedRegionCodes: ['us'],
            requestedLanguage: 'en'
        });
        widget.id = prefix + '-places';
        widget.setAttribute('placeholder', 'e.g. 1310 Vermont Rd or PO Box 123');
        widget.setAttribute('no-input-icon', '');
        widget.setAttribute('no-clear-button', '');
        streetEl.parentElement.insertBefore(widget, streetEl);
        streetEl.classList.add('places-backed');
        widget.addEventListener('gmp-select', async function (event) {
            const prediction = event.placePrediction;
            if (!prediction || typeof prediction.toPlace !== 'function') {
                if (prefix === 'cust-ship') salesmanShipPlace = null;
                else salesmanBillPlace = null;
                return;
            }
            const place = prediction.toPlace();
            await place.fetchFields({
                fields: ['addressComponents', 'formattedAddress', 'location', 'id']
            });
            fillSalesmanAddressFromPlace(prefix, place);
            setSalesmanCityStateZipVisible(prefix, false);
        });
        widget.addEventListener('input', function () {
            const typed = widget.value || '';
            streetEl.value = typed;
            if (prefix === 'cust-ship') salesmanShipPlace = null;
            else salesmanBillPlace = null;
            setSalesmanCityStateZipVisible(prefix, isPoBoxAddress(typed));
        });
    } catch (err) {
        console.warn('Salesman Places widget:', err);
        if (hintEl) hintEl.textContent = 'Address lookup is unavailable. Type the full address.';
        setSalesmanCityStateZipVisible(prefix, true);
    }
}

window.initSalesmanInquiryPlaces = async function () {
    await attachSalesmanPlacesWidget('cust-ship');
    await attachSalesmanPlacesWidget('cust-bill');
    if (typeof toggleSameAddress === 'function') toggleSameAddress();
};

function assembleSalesmanAddress(prefix) {
    const street = (document.getElementById(prefix + '-street')?.value || '').trim();
    const apt = (document.getElementById(prefix + '-apt')?.value || '').trim();
    const city = (document.getElementById(prefix + '-city')?.value || '').trim();
    const state = (document.getElementById(prefix + '-state')?.value || '').trim();
    const zip = (document.getElementById(prefix + '-zip')?.value || '').trim();
    const parts = [];
    if (street) parts.push(street);
    if (apt) parts.push(apt);
    const cityLine = [city, state].filter(Boolean).join(', ') + (zip ? (' ' + zip) : '');
    if (cityLine.trim()) parts.push(cityLine.trim());
    return parts.join('\n');
}

function formatSalesmanPlaceNote(place) {
    if (!place || !place.place_id) return '';
    let block = 'Google place: ' + place.place_id;
    if (place.lat != null && place.lat !== '') {
        block += '\nLat: ' + place.lat + '\nLng: ' + place.lng;
    }
    return block;
}

function resetSalesmanAddressFields() {
    ['cust-ship', 'cust-bill'].forEach(function (prefix) {
        ['street', 'apt', 'city', 'zip'].forEach(function (field) {
            const el = document.getElementById(prefix + '-' + field);
            if (el) el.value = '';
        });
        const stateEl = document.getElementById(prefix + '-state');
        if (stateEl) stateEl.value = '';
        const widget = document.getElementById(prefix + '-places');
        if (widget) widget.value = '';
        setSalesmanCityStateZipVisible(prefix, false);
    });
    salesmanShipPlace = null;
    salesmanBillPlace = null;
}

function toggleSameAddress() {
    const same = document.getElementById('cust-same-address');
    const billingBlock = document.getElementById('cust-billing-places-block');
    if (!same || !billingBlock) return;
    billingBlock.style.display = same.checked ? 'none' : 'block';
}

(function setupSameAddressListeners() {
    setTimeout(function () {
        if (typeof toggleSameAddress === 'function') toggleSameAddress();
    }, 300);
})();

const customerInfoForm = document.getElementById("customer-info-form");

if (customerInfoForm) {
    customerInfoForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const user = getCurrentUser() || currentUser;
        if (!user) {
            alert("You must be logged in.");
            return;
        }

        const name = document.getElementById("cust-name").value.trim();
        const company = document.getElementById("cust-company").value.trim();
        const email = document.getElementById("cust-email").value.trim();
        const phone = document.getElementById("cust-phone").value.trim();
        if (typeof isValidPhoneUS === 'function' && !isValidPhoneUS(phone)) {
            alert('Enter phone as (717)555-1234');
            document.getElementById("cust-phone").focus();
            return;
        }

        const shippingAddress = assembleSalesmanAddress('cust-ship');
        const sameAddress = document.getElementById("cust-same-address")?.checked;
        const billingAddress = sameAddress
            ? shippingAddress
            : assembleSalesmanAddress('cust-bill');
        const notes = document.getElementById("cust-notes").value.trim();
        const shipStreet = (document.getElementById('cust-ship-street')?.value || '').trim();
        const billStreet = (document.getElementById('cust-bill-street')?.value || '').trim();
        const placesReady = !!(window.google && google.maps && google.maps.places);

        if (placesReady && !salesmanShipPlace && !isPoBoxAddress(shipStreet)) {
            alert('Please pick the shipping address from the Google list.\nPO Boxes can be typed in full.');
            document.getElementById('cust-ship-street')?.focus();
            return;
        }
        if (!sameAddress && placesReady && !salesmanBillPlace && !isPoBoxAddress(billStreet)) {
            alert('Please pick the billing address from the Google list.\nPO Boxes can be typed in full.');
            document.getElementById('cust-bill-street')?.focus();
            return;
        }

        if (!name || !company || !email || !phone || !shippingAddress || !billingAddress) {
            alert("Please fill in all required fields (Notes are optional).");
            return;
        }
            
        const seat = (typeof getOperatingSalesmanEmail === 'function'
            ? getOperatingSalesmanEmail()
            : (user.email || '')).toLowerCase().trim();
        if (seat === 'donegaldogtreats@gmail.com') {
        const emailKey = email.toLowerCase().trim();
        const { data: existingRows, error: existErr } = await supabaseClient
                .from('customers')
                .select('id, name, company, email, salesman_email, status')
                .ilike('email', emailKey);
        if (existErr) {
                alert('Could not check for an existing customer.\n' + existErr.message);
                return;
            }
        const rows = (existingRows || []).filter(function (c) {
        const em = String(c.email || '').toLowerCase();
        const blob = String((c.company || '') + ' ' + (c.name || '')).toLowerCase();
        if (em === 'jackerman@donegalnatural.com') return false;
        if (blob.indexOf('admin test store') !== -1) return false;
        if (blob.indexOf('adriana hoang') !== -1 || blob.indexOf('gerald bair') !== -1) return false;
                return true;
            });
        const brianRows = rows.filter(function (c) {
                return String(c.salesman_email || '').toLowerCase() === seat;
            });
        const otherRows = rows.filter(function (c) {
                return String(c.salesman_email || '').toLowerCase() !== seat;
            });
        if (otherRows.length && !brianRows.length) {
                alert(
                    'This email already belongs to another salesman:\n' +
                    otherRows.map(function (c) {
                        return (c.company || c.name || c.email) + ' (' + (c.salesman_email || 'unassigned') + ')';
                    }).join('\n') +
                    '\n\nBrian cannot overwrite another salesman\'s account.'
                );
                return;
            }
        if (brianRows.length) {
                const label = brianRows.map(function (c) {
                    return (c.company || c.name || c.email) + ' · ' + (c.status || '');
                }).join('\n');
        if (!confirm(
                    'This email already has a Brian store:\n' + label +
                    '\n\nSubmit will UPDATE that account after approval.\n' +
                    'A second store will not be added.\n\nContinue?'
                )) return;
            }
        }

        const notesParts = [];
        notesParts.push("Shipping: " + shippingAddress);
        const shipPlaceNote = formatSalesmanPlaceNote(salesmanShipPlace);
        if (shipPlaceNote) notesParts.push(shipPlaceNote);
        notesParts.push("Billing: " + billingAddress);
        if (!sameAddress) {
            const billPlaceNote = formatSalesmanPlaceNote(salesmanBillPlace);
            if (billPlaceNote) notesParts.push(billPlaceNote);
        }
        if (notes) notesParts.push("Notes: " + notes);
        notesParts.push(
            "Submitted by: " +
            (user.fullName || user.name || user.email || "Salesman") +
            (user.email ? (" (" + user.email + ")") : "")
        );

        try {
            const { error } = await supabaseClient
                .from('wholesale_inquiries')
                .insert({
                    owner_name: name,
                    company_name: company,
                    email: email,
                    phone: phone,
                    monthly_amount: null,
                    nature_of_business: "Submitted by salesman",
                    nature_other: null,
                    source: "salesman",
                    status: "pending",
                    notes: notesParts.join("\n")
                });

            if (error) {
                console.error(error);
                alert("Failed to submit customer. Please try again.\n" + error.message);
                return;
            }

            this.reset();
            resetSalesmanAddressFields();
            const sameEl = document.getElementById("cust-same-address");
            if (sameEl) sameEl.checked = true;
            if (typeof toggleSameAddress === "function") toggleSameAddress();

            loadCustomerSubmissions();
            alert("Customer submitted for approval. It will appear in Customer Inquiries.");
        } catch (err) {
            console.error(err);
            alert("Something went wrong. Please try again.");
        }
    });
}

window.loadCustomerSubmissions = loadCustomerSubmissions;
window.isPoBoxAddress = isPoBoxAddress;
window.setSalesmanCityStateZipVisible = setSalesmanCityStateZipVisible;
window.fillSalesmanAddressFromPlace = fillSalesmanAddressFromPlace;
window.attachSalesmanPlacesWidget = attachSalesmanPlacesWidget;
window.assembleSalesmanAddress = assembleSalesmanAddress;
window.formatSalesmanPlaceNote = formatSalesmanPlaceNote;
window.resetSalesmanAddressFields = resetSalesmanAddressFields;
window.toggleSameAddress = toggleSameAddress;
