function formatPhoneUS(value) {
    const d = String(value || '').replace(/\D/g, '').slice(0, 10);
    if (d.length === 0) return '';
    if (d.length < 4) return '(' + d;
    if (d.length < 7) return '(' + d.slice(0, 3) + ')' + d.slice(3);
    return '(' + d.slice(0, 3) + ')' + d.slice(3, 6) + '-' + d.slice(6);
}

function isValidPhoneUS(value) {
    return /^\([0-9]{3}\)[0-9]{3}-[0-9]{4}$/.test(String(value || '').trim());
}

function bindPhoneMask(input) {
    if (!input || input.dataset.phoneBound === '1') return;
    input.dataset.phoneBound = '1';
    input.setAttribute('type', 'tel');
    input.setAttribute('inputmode', 'numeric');
    input.setAttribute('autocomplete', 'tel');
    input.setAttribute('maxlength', '13');
    if (!input.getAttribute('placeholder')) input.setAttribute('placeholder', '(717)555-1234');
    input.addEventListener('input', function () {
        this.value = formatPhoneUS(this.value);
    });
    input.addEventListener('blur', function () {
        if (this.value) this.value = formatPhoneUS(this.value);
    });
    if (input.value) input.value = formatPhoneUS(input.value);
}

function initPhoneMasks() {
    [
        'wi-phone',
        'cust-phone',
        'pce-phone',
        'new-customer-phone',
        'edit-phone',
        'ia-phone',
        'new-vendor-phone',
        'edit-vendor-phone'
    ].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) bindPhoneMask(el);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPhoneMasks);
} else {
    initPhoneMasks();
}