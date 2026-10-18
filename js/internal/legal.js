// Internal portal — resale certificates and legal forms.
async function loadAdminResaleCertificates() {
    const container = document.getElementById('resale-certs-admin-list');
    if (!container) return;

    container.innerHTML = '<p class="text-sm text-[#6B4423]">Loading…</p>';

    try {
        const { data, error } = await supabaseClient
            .from('customer_resale_certificates')
            .select(`
                id,
                certificate_number,
                expiration_date,
                file_name,
                file_path,
                uploaded_at,
                customers (
                    id,
                    name,
                    company,
                    email
                )
            `)
            .order('expiration_date', { ascending: true });

        if (error) throw error;

        window._adminResaleCerts = data || [];

        if (!data || data.length === 0) {
            container.innerHTML = '<p class="text-sm text-[#6B4423]">No resale certificates uploaded yet.</p>';
            return;
        }

        const rows = data.map(cert => {
            const cust = cert.customers || {};
            const company = cust.company || cust.name || '—';
            const email = cust.email || '—';
            const exp = cert.expiration_date ? new Date(cert.expiration_date).toLocaleDateString() : '—';
            const expired = cert.expiration_date && new Date(cert.expiration_date) < new Date();
            const uploaded = cert.uploaded_at ? new Date(cert.uploaded_at).toLocaleDateString() : '—';

            return `
                <tr class="border-b border-[#e8d9c2]">
                    <td class="py-3 pr-4">
                        <p class="font-semibold text-[#1E4D2B]">${escapeHtml(company)}</p>
                        <p class="text-xs text-[#6B4423]">${escapeHtml(email)}</p>
                    </td>
                    <td class="py-3 pr-4 font-mono text-sm">${escapeHtml(cert.certificate_number || '—')}</td>
                    <td class="py-3 pr-4">
                        <span class="${expired ? 'text-red-600 font-semibold' : ''}">${exp}${expired ? ' (Expired)' : ''}</span>
                    </td>
                    <td class="py-3 pr-4 text-sm text-[#6B4423]">${uploaded}</td>
                    <td class="py-3">
                        <button onclick="downloadResaleCert('${cert.id}')"
                                class="px-3 py-1 text-xs border-2 border-[#6B4423] rounded-lg hover:bg-[#f8f4eb] font-semibold">
                            Download
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <table class="w-full text-sm">
                <thead>
                    <tr class="border-b-2 border-[#6B4423] text-left">
                        <th class="py-2 pr-4 font-semibold text-[#1E4D2B]">Customer</th>
                        <th class="py-2 pr-4 font-semibold text-[#1E4D2B]">Certificate #</th>
                        <th class="py-2 pr-4 font-semibold text-[#1E4D2B]">Expiration</th>
                        <th class="py-2 pr-4 font-semibold text-[#1E4D2B]">Uploaded</th>
                        <th class="py-2 font-semibold text-[#1E4D2B]">File</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    } catch (err) {
        console.error(err);
        container.innerHTML = `<p class="text-sm text-red-600">Could not load certificates.<br>${err.message || ''}</p>`;
    }
}

async function downloadResaleCert(certId) {
    const cert = (window._adminResaleCerts || []).find(c => String(c.id) === String(certId));
    if (!cert || !cert.file_path) {
        alert('File not found.');
        return;
    }

    try {
        const { data, error } = await supabaseClient.storage
            .from('resale-certificates')
            .createSignedUrl(cert.file_path, 60);

        if (error) throw error;
        if (!data?.signedUrl) throw new Error('No signed URL returned');

        window.open(data.signedUrl, '_blank');
    } catch (err) {
        console.error(err);
        alert('Could not download file.\n' + (err.message || ''));
    }
}

function exportResaleCertificatesCSV() {
    const rows = window._adminResaleCerts || [];
    if (!rows.length) {
        alert('No certificates to export.');
        return;
    }

    const header = ['Company', 'Name', 'Email', 'Certificate Number', 'Expiration', 'Status', 'Uploaded', 'File Name'];
    const lines = [header.join(',')];

    rows.forEach(cert => {
        const cust = cert.customers || {};
        const expired = cert.expiration_date && new Date(cert.expiration_date) < new Date();
        const line = [
            csvEscape(cust.company || ''),
            csvEscape(cust.name || ''),
            csvEscape(cust.email || ''),
            csvEscape(cert.certificate_number || ''),
            cert.expiration_date || '',
            expired ? 'Expired' : 'Active',
            cert.uploaded_at ? new Date(cert.uploaded_at).toISOString().slice(0, 10) : '',
            csvEscape(cert.file_name || '')
        ];
        lines.push(line.join(','));
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resale-certificates-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
}

function csvEscape(val) {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
}

function showLegalFormsSection() {
    showSection('legal-forms');
    if (typeof loadAdminResaleCertificates === 'function') {
        loadAdminResaleCertificates();
    }
    if (typeof loadIngredients === 'function') {
        loadIngredients().then(() => {
            if (typeof renderIngredients === 'function') renderIngredients();
        });
    }
}

window.loadAdminResaleCertificates = loadAdminResaleCertificates;
window.downloadResaleCert = downloadResaleCert;
window.exportResaleCertificatesCSV = exportResaleCertificatesCSV;
window.csvEscape = csvEscape;
window.showLegalFormsSection = showLegalFormsSection;
