// Records a login problem the customer can read back by code.
// Never send a password or a URL that contains a token.

function makeSupportCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint8Array(4);
    if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(bytes);
    } else {
        for (let i = 0; i < 4; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    let code = 'L-';
    for (let i = 0; i < 4; i++) code += chars[bytes[i] % chars.length];
    return code;
}

function supportBrowserLabel() {
    const ua = navigator.userAgent || '';
    let browser = 'Browser';
    if (/Edg\//.test(ua)) browser = 'Edge';
    else if (/Chrome\//.test(ua)) browser = 'Chrome';
    else if (/Firefox\//.test(ua)) browser = 'Firefox';
    else if (/Safari\//.test(ua)) browser = 'Safari';
    let os = '';
    if (/Windows/.test(ua)) os = 'Windows';
    else if (/Android/.test(ua)) os = 'Android';
    else if (/iPhone|iPad/.test(ua)) os = 'iPhone';
    else if (/Mac OS/.test(ua)) os = 'Mac';
    return (os ? (browser + ' on ' + os) : browser).slice(0, 80);
}

async function recordSupportEvent(client, event) {
    if (!client || !event || !event.code || !event.step || !event.summary) return;
    const email = String(event.email || '').trim().toLowerCase();
    const safeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
    const page = String(location.pathname || '/login-portal.html').split('?')[0].slice(0, 120);
    const base = String(client.supabaseUrl || '').replace(/\/$/, '');
    const key = client.supabaseKey;
    if (!base || !key) return;
    const status = Number(event.httpStatus);
    try {
        const res = await fetch(base + '/rest/v1/customer_support_events', {
            method: 'POST',
            keepalive: true,
            headers: {
                apikey: key,
                Authorization: 'Bearer ' + key,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal'
            },
            body: JSON.stringify({
                support_code: event.code,
                email: safeEmail,
                step: event.step,
                summary: String(event.summary).slice(0, 300),
                http_status: Number.isFinite(status) ? status : null,
                browser: supportBrowserLabel(),
                page: page
            })
        });
        if (!res.ok) console.warn('support event', res.status);
    } catch (e) {
        console.warn('support event', e);
    }
}

window.makeSupportCode = makeSupportCode;
window.recordSupportEvent = recordSupportEvent;
