// Salesman portal — approved sheet and initial pricing sheet.
function brianPackCategories(name) {
    const key = String(name || '').toLowerCase().replace(/[“”"]/g, '').replace(/\s+/g, ' ').trim();
    const map = {
        "40 pack, 6\" thin bully stick": ["Bully Sticks"],
        "20 pack, 12\" thin bully stick": ["Bully Sticks"],
        "20 pack, 12\" regular bully sticks": ["Bully Sticks"],
        "25 pack, 6\" regular bully sticks": ["Bully Sticks"],
        "25 pack, 6\" monster green line bully stick": ["Bully Sticks"],
        "20 pack, 12\" monster green line bully stick": ["Bully Sticks"],
        "24-28\" bully cane": ["Bully Sticks"],
        "32-36\" bully cane": ["Bully Sticks"],
        "20 pack, 6\" braided bully sticks": ["Bully Sticks"],
        "10 pack, 12\" braided bully sticks": ["Bully Sticks"],
        "20 pack, 12\" thick euro bullies": ["Bully Sticks"],
        "25 pack, 6\" thick euro bullies": ["Bully Sticks"],
        "50 pack, usa beef jerky treats": ["Jerky"],
        "50 pack, usa turkey jerky treats": ["Jerky"],
        "50 pack, usa chicken jerky treats": ["Jerky"],
        "50 pack, usa elky jerky treats": ["Jerky"],
        "50 pack, usa venison and sweet potato jerky treats": ["Jerky"],
        "8oz bags of usa elky training treats": ["Jerky"],
        "12oz bags of usa elky training treats": ["Jerky"],
        "10 pack, large turkey jerky stuffed buffalo bone": ["Jerky"],
        "10 pack, large elky jerky stuffed buffalo bone": ["Jerky"],
        "10 pack, large venison jerky stuffed buffalo bone": ["Jerky"],
        "10 pack, large peanut butter stuffed buffalo bone": ["Jerky", "Buffalo"],
        "25 pack, natural cow ears": ["Ears"],
        "25 pack, natural vanilla cow ear": ["Ears"],
        "25 pack, honey smoked cow ear": ["Ears"],
        "5 pack, hairy beef ears": ["Ears"],
        "10 pack, hairy beef ears": ["Ears"],
        "50 pack, regular magna buffalo ears": ["Ears"],
        "50 pack, honey smoked magna buffalo ears": ["Ears"],
        "polish pig ears": ["Ears"],
        "10 pack, fuzzy bunny ears": ["Ears", "Rabbit"],
        "25 pack, fuzzy bunny ears": ["Ears", "Rabbit"],
        "20 pack, 5-6\" natural rollio rolled cow cheek": ["Cow Cheeks"],
        "10 pack, 10-12\" natural rollio rolled cow cheek": ["Cow Cheeks"],
        "20 pack, 5\" rollio rolled cow cheek": ["Cow Cheeks"],
        "10 pack, 10\" rollio rolled cow cheek": ["Cow Cheeks"],
        "20 pack, 5\" vanilla rollio rolled cow cheek": ["Cow Cheeks"],
        "10 pack, 10\" vanilla rollio rolled cow cheek": ["Cow Cheeks"],
        "20 pack, 5\" honey smoked rollio rolled cow cheek": ["Cow Cheeks"],
        "10 pack, 10\" honey smoked rollio rolled cow cheek": ["Cow Cheeks"],
        "10 pack, 5-6\" phat rollio rolled cow cheek": ["Cow Cheeks"],
        "10 pack, 5-6\" phat vanilla rollio rolled cow cheek": ["Cow Cheeks"],
        "10 pack, 5-6\" phat honey smoked rollio rolled cow cheek": ["Cow Cheeks"],
        "5 pack, 10-12\" phat rollio rolled cow cheek": ["Cow Cheeks"],
        "5 pack, 10-12\" phat vanilla rollio rolled cow cheek": ["Cow Cheeks"],
        "5 pack, 10-12\" phat honey smoked rollio rolled cow cheek": ["Cow Cheeks"],
        "5 pack, 10-12\" bully basted phat rollio": ["Cow Cheeks"],
        "10 pack, 5-6\" peanut butter stuffed rollio": ["Cow Cheeks"],
        "5 pack, 10-12\" peanut butter stuffed rollio": ["Cow Cheeks"],
        "50 pack, 5-6\" cheek slabs": ["Cow Cheeks"],
        "50 pack, 5-6\" vanilla cheek slabs": ["Cow Cheeks"],
        "25 pack, 12\" cheek slabs": ["Cow Cheeks"],
        "25 pack, 12\" vanilla cheek slabs": ["Cow Cheeks"],
        "8oz bags of chunky cow cheeks": ["Cow Cheeks"],
        "8oz bags of vanilla chunky cow cheeks": ["Cow Cheeks"],
        "8oz bags of honey smoked chunky cow cheeks": ["Cow Cheeks"],
        "16oz bags of chunky cow cheeks": ["Cow Cheeks"],
        "16oz bags of vanilla chunky cow cheeks": ["Cow Cheeks"],
        "16oz bags of honey smoked chunky cow cheeks": ["Cow Cheeks"],
        "25 pack, 6\" magna natural ox tails": ["Ox Tails"],
        "10 pack, 12\" magna natural ox tails": ["Ox Tails"],
        "10 pack, fuzzy bunny feet": ["Rabbit"],
        "25 pack, fuzzy bunny feet": ["Rabbit"],
        "10 pack, crunchy duck necks": ["Duck and Goose"],
        "25 pack, crunchy duck necks": ["Duck and Goose"],
        "5 pack, handsome crunchy duck heads": ["Duck and Goose"],
        "10 pack, handsome crunchy duck heads": ["Duck and Goose"],
        "20 pack, handsome crunchy duck heads": ["Duck and Goose"],
        "10 pack, sexy euro duck feet": ["Duck and Goose"],
        "25 pack, sexy euro duck feet": ["Duck and Goose"],
        "10 pack, crunchy goose necks": ["Duck and Goose"],
        "10 pack, super meaty beef tendons": ["Beef"],
        "50 pack, 6\" paddywack": ["Beef"],
        "20 pack, 12\" paddywack": ["Beef"],
        "25 pack, 6\" beef collagen sticks": ["Beef"],
        "20 pack, 12\" beef collagen sticks": ["Beef"],
        "20 pack, 6\" beef wrapped corium sticks": ["Beef"],
        "10 pack, 12\" beef wrapped corium sticks": ["Beef"],
        "20 pack, regular cow hooves": ["Beef"],
        "20 pack, smoked cow hooves": ["Beef"],
        "25 pack, 6\" beef trachea": ["Beef"],
        "15 pack, 12\" beef trachea": ["Beef"],
        "8oz bags of beef trachea pieces": ["Beef"],
        "16oz bags of beef trachea pieces": ["Beef"],
        "20 pack, 6\" braided esophagus": ["Beef"],
        "10 pack, 12\" braided esophagus": ["Beef"],
        "14-16\" jumbo meaty femur knuckle bone": ["Beef"],
        "8oz usa beef lung flips": ["Beef"],
        "16oz usa beef lung flips": ["Beef"],
        "50 pack, usa lamb ears": ["Lamb"],
        "8oz bag of usa lamb lung": ["Lamb"],
        "16oz bag of usa lamb lung": ["Lamb"],
        "20 pack, small buffalo horns": ["Buffalo"],
        "10 pack, medium buffalo horns": ["Buffalo"],
        "5 pack, large buffalo horns": ["Buffalo"],
        "50 pack, small meaty buffalo knuckle": ["Buffalo"],
        "10 pack, regular large meaty buffalo bone": ["Buffalo"],
        "8oz bags of buffalo bites (lung)": ["Buffalo"],
        "16oz bags of buffalo bites (lung)": ["Buffalo"],
        "50 pack, sexy euro chicken feet": ["Chicken"],
        "50 pack, vanilla flavored white euro chicken feet": ["Chicken"],
        "5-7\" supreme usa hide braided donuts": ["Braided"],
        "5-7\" vanilla supreme braided donuts": ["Braided"],
        "8-9\" supreme usa hide braided donuts": ["Braided"],
        "8-9\" vanilla supreme braided donuts": ["Braided"],
        "10-11\" supreme usa hide braided donuts": ["Braided"],
        "10-11\" vanilla supreme braided donuts": ["Braided"],
        "50 pack, 4\" supreme pressed bone": ["Pressed Bones"],
        "20 pack, 6\" supreme pressed bone": ["Pressed Bones"],
        "10 pack, 8\" supreme pressed bone": ["Pressed Bones"],
        "5 pack, 10\" supreme pressed bone": ["Pressed Bones"],
        "5 pack, 12\" supreme pressed bone": ["Pressed Bones"],
        "10 pack, 6\" supreme pressed ring": ["Pressed Bones"],
        "20 pack, 10\" x 20mm supreme pressed stick": ["Pressed Bones"],
        "20 pack, 6-9\" vanilla flavored magna retrievers": ["Retrievers"],
        "10 pack, 10-11\" x 30mm vanilla supreme retrievers": ["Retrievers"],
        "20 pack, 6/9\" white supreme retriever": ["Retrievers"],
        "10 pack, 10/11\" x 30mm white supreme retriever": ["Retrievers"],
        "100 pack, 5\" x 4/6mm white twisty (100/inner)": ["Twisty Q's and Natural Munchy Sticks"],
        "100 pack, 5\" x 9/10mm white twisty (50/inner)": ["Twisty Q's and Natural Munchy Sticks"],
        "50 pack, 10\" x 9/10mm white twisty": ["Twisty Q's and Natural Munchy Sticks"],
        "20 pack, 10\" white twisty-q": ["Twisty Q's and Natural Munchy Sticks"],
        "20 pack, 10\" vanilla twisty-q": ["Twisty Q's and Natural Munchy Sticks"],
        "10 pack, 12\" x 20mm natural munchy sticks": ["Twisty Q's and Natural Munchy Sticks"],
        "100 pack, 5\" 10mm natural munchy sticks": ["Twisty Q's and Natural Munchy Sticks"],
        "8oz bags of white binkey's": ["Binkey's"],
        "8oz bags of peanut butter binkey's": ["Binkey's"],
        "8oz bags of vanilla binkey's": ["Binkey's"],
        "16oz bags of white binkey's": ["Binkey's"],
        "16oz bags of peanut butter binkey's": ["Binkey's"],
        "16oz bags of vanilla binkey's": ["Binkey's"],
    };
    if (map[key]) return map[key];
    if (/euro bull|bully stick|bully cane|braided bully|monster/.test(key)) return ['Bully Sticks'];
    if (/peanut butter stuffed buffalo|stuffed buffalo bone/.test(key)) return ['Jerky', 'Buffalo'];
    if (/jerky|elky training/.test(key)) return ['Jerky'];
    if (/bunny ear/.test(key)) return ['Ears', 'Rabbit'];
    if (/bunny feet/.test(key)) return ['Rabbit'];
    if (/cow ear|buffalo ear|hairy beef ear|pig ear/.test(key)) return ['Ears'];
    if (/rollio|cheek slab|chunky/.test(key)) return ['Cow Cheeks'];
    if (/ox tail/.test(key)) return ['Ox Tails'];
    if (/duck|goose/.test(key)) return ['Duck and Goose'];
    if (/lamb/.test(key)) return ['Lamb'];
    if (/buffalo horn|buffalo knuckle|buffalo bone|buffalo bite/.test(key)) return ['Buffalo'];
    if (/chicken feet/.test(key)) return ['Chicken'];
    if (/donut/.test(key)) return ['Braided'];
    if (/pressed/.test(key)) return ['Pressed Bones'];
    if (/retriever/.test(key)) return ['Retrievers'];
    if (/twisty|munchy/.test(key)) return ["Twisty Q's and Natural Munchy Sticks"];
    if (/binkey/.test(key)) return ["Binkey's"];
    if (/tendon|paddywack|collagen|corium|hoove|trachea|esophagus|femur|lung flip/.test(key)) return ['Beef'];
    return null;
}

function salesmanSheetItemKey(name) {
    const raw = String(name || '').toLowerCase().replace(/[“”"]/g, '');
    const pack = parseInt(raw, 10) || 0;
    const lengthMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:”|"|')/);
    const length = lengthMatch ? Number(lengthMatch[1]) : 0;
    let family = 'zzz';
    if (/euro/.test(raw)) family = 'euro';
    else if (/braided bully/.test(raw)) family = 'braided bully';
    else if (/cane/.test(raw)) family = 'cane';
    else if (/monster/.test(raw)) family = 'green line 3 monster';
    else if (/regular/.test(raw) && /bully/.test(raw)) family = 'green line 2 regular';
    else if (/thin/.test(raw) && /bully/.test(raw)) family = 'green line 1 thin';
    else if (/bully stick/.test(raw)) family = 'green line';
    else if (/elky training/.test(raw)) family = 'training';
    else if (/stuffed buffalo/.test(raw)) family = 'stuffed bone';
    else if (/jerky/.test(raw)) family = 'jerky';
    else if (/hairy beef ear/.test(raw)) family = 'hairy ear';
    else if (/buffalo ear/.test(raw)) family = 'buffalo ear';
    else if (/bunny ear|rabbit ear/.test(raw)) family = 'rabbit ear';
    else if (/pig ear/.test(raw)) family = 'pig ear';
    else if (/cow ear/.test(raw)) family = 'cow ear';
    else if (/peanut butter stuffed .*rollio|peanut butter stuffed rollio/.test(raw)) family = 'pb rollio';
    else if (/phat/.test(raw)) family = 'phat rollio';
    else if (/natural .*rollio|natural rollio/.test(raw)) family = 'natural rollio';
    else if (/rollio/.test(raw)) family = 'rollio';
    else if (/cheek slab/.test(raw)) family = 'cheek slab';
    else if (/chunky/.test(raw)) family = 'chunky';
    else if (/ox tail/.test(raw)) family = 'ox tail';
    else if (/bunny feet|rabbit feet/.test(raw)) family = 'rabbit feet';
    else if (/duck neck/.test(raw)) family = 'duck neck';
    else if (/goose/.test(raw)) family = 'goose';
    else if (/duck head/.test(raw)) family = 'duck head';
    else if (/duck feet/.test(raw)) family = 'duck feet';
    else if (/trachea piece/.test(raw)) family = 'trachea piece';
    else if (/trachea/.test(raw)) family = 'trachea';
    else if (/tendon/.test(raw)) family = 'tendon';
    else if (/paddywack/.test(raw)) family = 'paddywack';
    else if (/collagen/.test(raw)) family = 'collagen';
    else if (/corium/.test(raw)) family = 'corium';
    else if (/hoove/.test(raw)) family = 'hoof';
    else if (/esophagus/.test(raw)) family = 'esophagus';
    else if (/femur/.test(raw)) family = 'femur';
    else if (/lamb ear/.test(raw)) family = 'lamb ear';
    else if (/lamb lung/.test(raw)) family = 'lamb lung';
    else if (/lung/.test(raw)) family = 'lung';
    else if (/buffalo horn/.test(raw)) family = 'buffalo horn';
    else if (/buffalo knuckle|buffalo bone/.test(raw)) family = 'buffalo bone';
    else if (/buffalo bite/.test(raw)) family = 'buffalo bite';
    else if (/chicken feet/.test(raw)) family = 'chicken feet';
    else if (/donut/.test(raw)) family = 'donut';
    else if (/pressed ring/.test(raw)) family = 'pressed ring';
    else if (/pressed stick/.test(raw)) family = 'pressed stick';
    else if (/pressed/.test(raw)) family = 'pressed bone';
    else if (/retriever/.test(raw)) family = 'retriever';
    else if (/twisty-q|twisty q/.test(raw)) family = 'twisty q';
    else if (/twisty/.test(raw)) family = 'twisty';
    else if (/munchy/.test(raw)) family = 'munchy';
    else if (/binkey/.test(raw)) family = 'binkey';
    let flavor = 'm';
    if (/honey/.test(raw)) flavor = 'honey';
    else if (/vanilla/.test(raw)) flavor = 'vanilla';
    else if (/peanut/.test(raw)) flavor = 'peanut';
    else if (/natural/.test(raw)) flavor = 'natural';
    return family + ' ' + flavor + ' ' + String(length).padStart(4, '0') + ' ' + String(pack).padStart(4, '0') + ' ' + raw;
}

async function renderPriceSheet() {
    const list = document.getElementById("price-sheet-list");
    const updatedEl = document.getElementById("price-sheet-updated");
    if (!list) return;

    const user = getCurrentUser() || currentUser;
    if (!user) {
        list.innerHTML = `<p class="text-sm text-[#6B4423]">Please log in.</p>`;
        return;
    }

    const email = (user.email || "").toLowerCase().trim();
    list.innerHTML = `<p class="text-sm text-[#6B4423]">Loading price sheet...</p>`;

    try {
        const { data: sheet, error } = await supabaseClient
            .from('salesman_price_sheets')
            .select('*')
            .eq('salesman_email', email)
            .maybeSingle();

        if (error) {
            console.error(error);
            list.innerHTML = `<p class="text-sm text-red-600">Could not load price sheet.</p>`;
            return;
        }

        if (!sheet || !sheet.prices || Object.keys(sheet.prices).length === 0) {
            list.innerHTML = `<p class="text-sm text-[#6B4423]">No custom prices yet. Approved proposals will appear here.</p>`;
            if (updatedEl) updatedEl.textContent = "";
            return;
        }

        if (updatedEl) {
            updatedEl.textContent = sheet.updated_at
                ? "Last updated: " + new Date(sheet.updated_at).toLocaleString()
                : "";
        }

        // Cache for Print / Export
        window._placeOrderDisplayNames = (sheet.display_names && typeof sheet.display_names === 'object')
            ? sheet.display_names
            : {};
        window._currentSalesmanPriceSheet = {
            prices: sheet.prices || {},
            updated_at: sheet.updated_at || null,
            salesman_email: email
        };

        const catalogByName = {};
        if (typeof PRODUCT_CATALOG !== "undefined") {
            PRODUCT_CATALOG.forEach(function (p) {
                catalogByName[p.name] = p;
            });
        }
        const grouped = {};
        const categoryOrder = [];
        const unmatched = [];
        Object.keys(sheet.prices).forEach(function (name) {
            const p = catalogByName[name];
            const n = Number(sheet.prices[name]);
            const priceText = isFinite(n) ? ('$' + n.toFixed(2) + '/ea.') : 'Market';
            const mapped = (typeof brianPackCategories === 'function') ? brianPackCategories(name) : null;
            const cat = (mapped && mapped[0]) || (p && p.category) || '';
            if (cat) {
                if (!grouped[cat]) {
                    grouped[cat] = [];
                    categoryOrder.push(cat);
                }
                grouped[cat].push({
                    name: name,
                    caseSize: p ? (p.caseSize || p.case_size || '') : '',
                    priceText: priceText
                });
            } else {
                unmatched.push({ name: name, caseSize: '', priceText: priceText });
            }
        });
        categoryOrder.forEach(function (cat) {
            grouped[cat].sort(function (a, b) {
                return salesmanSheetItemKey(a.name).localeCompare(salesmanSheetItemKey(b.name));
            });
        });
        unmatched.sort(function (a, b) {
            return salesmanSheetItemKey(a.name).localeCompare(salesmanSheetItemKey(b.name));
        });

        let tableHtml = `
            <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead>
                    <tr class="bg-[#1E4D2B] text-[#d4b78f]">
                        <th class="p-3 text-left">Product</th>
                        <th class="p-3 text-left w-32">Case Size</th>
                        <th class="p-3 text-right w-28">Unit Price</th>
                    </tr>
                </thead>
                <tbody>
        `;
        categoryOrder.forEach(function (cat) {
            tableHtml += `
                <tr class="bg-[#f8f4eb]">
                    <td colspan="3" class="p-3 font-bold brand-green border-b-2 border-[#6B4423]">${escapeHtml(cat)}</td>
                </tr>
            `;
            grouped[cat].forEach(function (row) {
                tableHtml += `
                    <tr class="border-b border-[#e5d5c0]">
                        <td class="p-3">${escapeHtml(salesmanDisplayName(row.name))}</td>
                        <td class="p-3 text-[#6B4423]">${escapeHtml(row.caseSize || '—')}</td>
                        <td class="p-3 text-right font-semibold brand-green whitespace-nowrap">${row.priceText}</td>
                    </tr>
                `;
            });
        });
        if (unmatched.length) {
            tableHtml += `
                <tr class="bg-[#f8f4eb]">
                    <td colspan="3" class="p-3 font-bold brand-green border-b-2 border-[#6B4423]">Other</td>
                </tr>
            `;
            unmatched.forEach(function (row) {
                tableHtml += `
                    <tr class="border-b border-[#e5d5c0]">
                        <td class="p-3">${escapeHtml(salesmanDisplayName(row.name))}</td>
                        <td class="p-3 text-[#6B4423]">—</td>
                        <td class="p-3 text-right font-semibold brand-green whitespace-nowrap">${row.priceText}</td>
                    </tr>
                `;
            });
        }
        tableHtml += `</tbody></table></div>`;
        list.innerHTML = tableHtml;
        if (typeof filterSalesmanPriceSheetList === 'function') filterSalesmanPriceSheetList();

    } catch (err) {
        console.error(err);
        list.innerHTML = `<p class="text-sm text-red-600">Error loading price sheet.</p>`;
    }
}

function filterSalesmanPriceSheetList() {
    const q = String((document.getElementById('salesman-price-sheet-search') || {}).value || '')
        .toLowerCase().trim();
    const list = document.getElementById('price-sheet-list');
    if (!list) return;
    const rows = list.querySelectorAll('tbody tr');
    let header = null;
    let shown = 0;
    function closeSection() {
        if (header) header.style.display = shown ? '' : 'none';
    }
    rows.forEach(function (tr) {
        if (tr.querySelector('td[colspan]')) {
            closeSection();
            header = tr;
            shown = 0;
            return;
        }
        const hit = !q || String(tr.textContent || '').toLowerCase().indexOf(q) !== -1;
        tr.style.display = hit ? '' : 'none';
        if (hit) shown += 1;
    });
    closeSection();
}

function filterInitialPriceSheetList() {
    const q = String((document.getElementById('initial-sheet-search') || {}).value || '')
        .toLowerCase().trim();
    const list = document.getElementById('initial-sheet-list');
    if (!list) return;
    const cards = list.querySelectorAll('[data-product-name]');
    cards.forEach(function (card) {
        const name = String(card.getAttribute('data-product-name') || card.textContent || '')
            .toLowerCase();
        const hit = !q || name.indexOf(q) !== -1;
        card.style.display = hit ? '' : 'none';
        if (hit && q) {
            const body = card.closest('.initial-cat-body');
            if (body) body.classList.remove('hidden');
        }
    });
    list.querySelectorAll('.mb-3.border-2').forEach(function (wrap) {
        const visible = wrap.querySelectorAll('[data-product-name]');
        let any = false;
        visible.forEach(function (card) {
            if (card.style.display !== 'none') any = true;
        });
        wrap.style.display = any || !q ? '' : 'none';
    });
}

function brianExcelSku(name) {
    const key = String(name || '').toLowerCase().replace(/[“”"]/g, '').replace(/\s+/g, ' ').trim();
    const map = {
        '40 pack, 6 thin bully stick': 'PZSK6',
        '20 pack, 12 thin bully stick': 'PZSK12',
        '25 pack, 6 regular bully sticks': 'GRPZ6',
        '20 pack, 12 regular bully sticks': 'GRPZ12',
        '25 pack, 6 monster green line bully stick': 'GRSUP6',
        '20 pack, 12 monster green line bully stick': 'GRSUP12',
        '20 pack, 6 braided bully sticks': '16925-22043',
        '10 pack, 12 braided bully sticks': '16925-22055',
        '25 pack, 6 thick euro bullies': '6EUR',
        '20 pack, 12 thick euro bullies': '12EUR',
        '10 pack, hairy beef ears': 'HBE',
        '10 pack, super meaty beef tendons': 'SMBT',
        '25 pack, fuzzy bunny ears': 'FRE',
        '20 pack, handsome crunchy duck heads': 'DHD',
        '10 pack, 10 rollio rolled cow cheek': 'ROLL',
        '10 pack, 10 vanilla rollio rolled cow cheek': 'ROLLV',
        '10 pack, 10 honey smoked rollio rolled cow cheek': 'ROLLHS',
        '20 pack, 5 rollio rolled cow cheek': '5ROLL',
        '20 pack, 5 vanilla rollio rolled cow cheek': '5ROLLV',
        '20 pack, 5 honey smoked rollio rolled cow cheek': '5ROLLH',
        '20 pack, 5-6 natural rollio rolled cow cheek': 'NROLL5',
        '10 pack, 10-12 natural rollio rolled cow cheek': 'NROLL10',
        '10 pack, 5-6 phat rollio rolled cow cheek': 'PH5',
        '5 pack, 10-12 phat rollio rolled cow cheek': 'PH10',
        '10 pack, 5-6 phat honey smoked rollio rolled cow cheek': 'PH5HS',
        '5 pack, 10-12 phat honey smoked rollio rolled cow cheek': 'PH10HS',
        '10 pack, 5-6 phat vanilla rollio rolled cow cheek': 'PH5V',
        '5 pack, 10-12 phat vanilla rollio rolled cow cheek': 'PH10V',
        '10 pack, 5-6 peanut butter stuffed rollio': 'NPBROLL5',
        '5 pack, 10-12 peanut butter stuffed rollio': 'NPBROLL10',
        '25 pack, 6 magna natural ox tails': 'MNOX6',
        '10 pack, 12 magna natural ox tails': 'MNOX12',
        '50 pack, usa venison and sweet potato jerky treats': 'VSP',
        '50 pack, usa elky jerky treats': '16925-00006',
        '50 pack, usa turkey jerky treats': '16925-02222',
        '50 pack, usa chicken jerky treats': '16925-01225',
        '20 pack, small buffalo horns': 'BUFFSM',
        '10 pack, medium buffalo horns': 'BUFFM',
        '5 pack, large buffalo horns': 'BUFFL',
        '25 pack, 6 beef trachea': '16925-20407',
        '15 pack, 12 beef trachea': '16925-20414',
        '25 pack, natural cow ears': 'COWNAT',
        '50 pack, regular magna buffalo ears': 'MBUFF',
        '10 pack, 10/11 x 30mm white supreme retriever': 'SUP10RTR',
        '8oz bags of buffalo bites (lung)': '8LUNG',
        '16oz bags of buffalo bites (lung)': '16LUNG',
        '8oz bags of usa elky training treats': 'TT8',
        '12oz bags of usa elky training treats': 'TT12'
    };
    return map[key] || '';
}

function exportPriceSheetExcel() {
    if (typeof XLSX === 'undefined') {
        alert('Excel is not loaded. Refresh and try again.');
        return;
    }
    const sheet = window._currentSalesmanPriceSheet;
    const prices = sheet && sheet.prices;
    if (!prices || !Object.keys(prices).length) {
        alert('No price sheet is loaded.');
        return;
    }
    const grouped = {};
    Object.keys(prices).forEach(function (name) {
        const cats = (typeof brianPackCategories === 'function' && brianPackCategories(name)) || ['Other'];
        const cat = cats[0] || 'Other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(name);
    });
    Object.keys(grouped).forEach(function (cat) {
        grouped[cat].sort(function (a, b) {
            return salesmanSheetItemKey(a).localeCompare(salesmanSheetItemKey(b));
        });
    });
    const aoa = [
        ['Donegal Natural Dog Treats'],
        ['258 W Front St · Marietta, PA 17547'],
        ['(800) 223-0017'],
        ['Salesman Price Sheet'],
        []
    ];
    Object.keys(grouped).sort().forEach(function (cat) {
        aoa.push([cat]);
        aoa.push(['Product', 'SKU', 'Unit Price']);
        const nicks = window._placeOrderDisplayNames || {};
        grouped[cat].forEach(function (name) {
            const shown = String(nicks[name] || name).trim();
            aoa.push([shown, brianExcelSku(name), Number(prices[name])]);
        });
        aoa.push([]);
    });
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 56 }, { wch: 16 }, { wch: 14 }];
    Object.keys(ws).forEach(function (ref) {
        if (ref.charAt(0) === '!') return;
        if (XLSX.utils.decode_cell(ref).c !== 2) return;
        if (typeof ws[ref].v !== 'number') return;
        ws[ref].t = 'n';
        ws[ref].z = '"$"#,##0.00';
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Price Sheet');
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, 'Salesman_Price_Sheet_' + stamp + '.xlsx');
}

async function exportPriceSheetPdf() {
    const user = getCurrentUser() || currentUser;
    if (!user) {
        alert("You must be logged in.");
        return;
    }

    const email = (user.email || "").toLowerCase().trim();
    let prices = null;
    let updatedAt = null;

    // Prefer the sheet already loaded on the Account tab
    if (window._currentSalesmanPriceSheet &&
        window._currentSalesmanPriceSheet.prices &&
        Object.keys(window._currentSalesmanPriceSheet.prices).length > 0) {
        prices = window._currentSalesmanPriceSheet.prices;
        updatedAt = window._currentSalesmanPriceSheet.updated_at;
    } else {
        // Fallback: fetch fresh
        try {
            const { data: sheet, error } = await supabaseClient
                .from("salesman_price_sheets")
                .select("prices, updated_at")
                .eq("salesman_email", email)
                .maybeSingle();

            if (error) throw error;
            if (!sheet || !sheet.prices || Object.keys(sheet.prices).length === 0) {
                alert("No approved price sheet found to print.");
                return;
            }
            prices = sheet.prices;
            updatedAt = sheet.updated_at;
        } catch (err) {
            console.error(err);
            alert("Could not load price sheet for printing.\n" + (err.message || ""));
            return;
        }
    }

    // Build category-grouped rows using PRODUCT_CATALOG order
    const catalogByName = {};
    if (typeof PRODUCT_CATALOG !== "undefined") {
        PRODUCT_CATALOG.forEach(p => {
            catalogByName[p.name] = p;
        });
    }

    const grouped = {};
    const categoryOrder = [];
    const nicks = window._placeOrderDisplayNames || {};
    const sheetOrder = ['Bully Sticks', 'Jerky', 'Ears', 'Cow Cheeks', 'Ox Tails', 'Rabbit', 'Duck and Goose', 'Beef', 'Lamb', 'Buffalo', 'Chicken', 'Braided', 'Pressed Bones', 'Retrievers', "Twisty Q's and Natural Munchy Sticks", "Binkey's", 'Other'];

    Object.keys(prices).forEach(name => {
        const cats = (typeof brianPackCategories === 'function' && brianPackCategories(nicks[name] || name)) || [];
        const cat = cats[0] || (catalogByName[name] && catalogByName[name].category) || 'Other';
        if (!grouped[cat]) {
            grouped[cat] = [];
            categoryOrder.push(cat);
        }
        grouped[cat].push({
            name: nicks[name] || name,
            caseSize: (catalogByName[name] && catalogByName[name].caseSize) || '',
            price: Number(prices[name])
        });
    });
    categoryOrder.sort(function (a, b) {
        const ia = sheetOrder.indexOf(a);
        const ib = sheetOrder.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    const unmatched = [];

    // Sort products inside each category
    categoryOrder.forEach(cat => {
        grouped[cat].sort((a, b) => salesmanSheetItemKey(a.name).localeCompare(salesmanSheetItemKey(b.name)));
    });
    unmatched.sort((a, b) => salesmanSheetItemKey(a.name).localeCompare(salesmanSheetItemKey(b.name)));

    const salesmanName = user.fullName || user.name || "Sales Representative";
    const generated = new Date().toLocaleString();
    const lastUpdated = updatedAt
        ? new Date(updatedAt).toLocaleString()
        : "—";

    // Build table HTML
    let tableHtml = "";
    categoryOrder.forEach(cat => {
        tableHtml += `
            <tr class="cat-row">
                <td colspan="3" class="cat-header">${cat}</td>
            </tr>
        `;
        grouped[cat].forEach(row => {
            tableHtml += `
                <tr>
                    <td>${escapeHtml(salesmanDisplayName(row.name))}</td>
                    <td class="case">${escapeHtml(row.caseSize || "—")}</td>
                    <td class="price">$${row.price.toFixed(2)}/ea.</td>
                </tr>
            `;
        });
    });

    if (unmatched.length) {
        tableHtml += `
            <tr class="cat-row">
                <td colspan="3" class="cat-header">Other</td>
            </tr>
        `;
        unmatched.forEach(row => {
            tableHtml += `
                <tr>
                    <td>${escapeHtml(salesmanDisplayName(row.name))}</td>
                    <td class="case">—</td>
                    <td class="price">$${row.price.toFixed(2)}/ea.</td>
                </tr>
            `;
        });
    }

    const disclaimer = `
        <div class="disclaimer">
            <strong>CONFIDENTIAL — AUTHORIZED SALES USE ONLY</strong><br>
            This pricing sheet contains proprietary and confidential information of Donegal Natural Dog Treats.
            It is provided solely for the authorized sales representative named above for use in the ordinary
            course of business with approved wholesale customers. Unauthorized disclosure, distribution,
            reproduction, or sharing with any third party is strictly prohibited. Prices are subject to change
            without notice and do not constitute a binding offer or contract.
        </div>
    `;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Donegal Natural — Salesman Price Sheet</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
            color: #1a1a1a;
            margin: 0;
            padding: 24px 32px;
            font-size: 12px;
            line-height: 1.4;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #1E4D2B;
            padding-bottom: 12px;
            margin-bottom: 16px;
        }
        .header-left h1 {
            margin: 0 0 4px;
            font-size: 20px;
            color: #1E4D2B;
        }
        .header-left p {
            margin: 0;
            color: #6B4423;
            font-size: 11px;
        }
        .header-right img {
            height: 64px;
            width: auto;
        }
        .meta {
            margin-bottom: 14px;
            font-size: 12px;
        }
        .meta strong { color: #1E4D2B; }
        .disclaimer {
            background: #fef3c7;
            border: 2px solid #b45309;
            color: #78350f;
            padding: 10px 14px;
            margin: 12px 0 18px;
            font-size: 10.5px;
            line-height: 1.45;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th {
            background: #1E4D2B;
            color: #d4b78f;
            text-align: left;
            padding: 8px 10px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }
        td {
            padding: 6px 10px;
            border-bottom: 1px solid #e5d5c0;
            vertical-align: top;
        }
        .cat-header {
            background: #f8f4eb;
            color: #1E4D2B;
            font-weight: 700;
            font-size: 12px;
            padding: 8px 10px;
            border-bottom: 2px solid #6B4423;
        }
        .case { width: 110px; color: #555; }
        .price { width: 80px; text-align: right; font-weight: 700; color: #1E4D2B; }
        tr { page-break-inside: avoid; }
        .footer-note {
            margin-top: 8px;
            font-size: 10px;
            color: #6B4423;
            text-align: center;
        }
        @media print {
            body { padding: 12px 18px; }
            .no-print { display: none !important; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <h1>Donegal Natural Dog Treats</h1>
            <p>258 W Front St · Marietta, PA 17547</p>
            <p>(800) 223-0017 · donegalnaturaldogtreats.com</p>
        </div>
        <div class="header-right">
            <img src="media/logo.png" alt="Donegal Natural" onerror="this.style.display='none'">
        </div>
    </div>

    <h2 style="margin:0 0 6px; color:#1E4D2B; font-size:16px;">Sales Representative Price Sheet</h2>
    <div class="meta">
        <div><strong>Salesman:</strong> ${escapeHtml(salesmanName)}</div>
        <div><strong>Email:</strong> ${escapeHtml(email || "—")}</div>
        <div><strong>Generated:</strong> ${generated}</div>
        <div><strong>Sheet last updated:</strong> ${lastUpdated}</div>
    </div>

    ${disclaimer}

    <table>
        <thead>
            <tr>
                <th>Product</th>
                <th class="case">Case Size</th>
                <th class="price">Unit Price</th>
            </tr>
        </thead>
        <tbody>
            ${tableHtml}
        </tbody>
    </table>

    ${disclaimer}

    <p class="footer-note">
        Donegal Natural Dog Treats · Confidential pricing for authorized sales use only
    </p>

    <script>
        window.onload = function () {
            setTimeout(function () { window.print(); }, 350);
        };
    </script>
</body>
</html>
    `;

    const printWin = window.open("", "_blank", "width=900,height=700");
    if (!printWin) {
        alert("Please allow pop-ups to print the price sheet.");
        return;
    }
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
}

async function salesmanHasApprovedPriceSheet() {
    const user = getCurrentUser() || currentUser;
    if (!user) return false;
    const email = (user.email || '').toLowerCase().trim();
    if (!email) return false;

    // Prefer live sheet with actual prices
    try {
        const { data: sheet } = await supabaseClient
            .from('salesman_price_sheets')
            .select('id, prices')
            .eq('salesman_email', email)
            .maybeSingle();
        if (sheet && sheet.prices && Object.keys(sheet.prices).length > 0) {
            return true;
        }
    } catch (e) {
        // fall through to status check
    }

    // Fallback: salesmen.price_sheet_status
    const record = await getMySalesmanRecord();
    const status = (record?.priceSheetStatus || '').toLowerCase().trim();
    return status === 'approved';
}

async function getMySalesmanRecord() {
    const user = getCurrentUser() || currentUser;
    if (!user) return null;

    const email = (user.email || "").toLowerCase().trim();
    if (!email) return null;

    // ===== 1. Try Supabase first =====
    try {
        const { data, error } = await supabaseClient
            .from('salesmen')
            .select('*')
            .eq('email', email)
            .maybeSingle();

        if (!error && data) {
            // Convert snake_case from Supabase to the camelCase the rest of the code expects
            const record = {
                id: data.id,
                firstName: data.first_name,
                lastName: data.last_name,
                email: data.email,
                territory: data.territory || "",
                commission: Number(data.commission) || 8,
                marketCommission: Number(data.market_commission) || 3,
                priceSheetStatus: data.price_sheet_status || "required",
                yearlySales: Number(data.yearly_sales) || 0,
                monthlySales: Number(data.monthly_sales) || 0,
                notes: data.notes || "",
                quotesSubmitted: data.quotes_submitted || 0,
                active: data.active !== false,
                profileId: data.profile_id
            };

            // Also keep localStorage in sync so other code still works
            let salesmen = JSON.parse(localStorage.getItem("salesmen") || "[]");
            const idx = salesmen.findIndex(s => (s.email || "").toLowerCase() === email);
            if (idx !== -1) {
                salesmen[idx] = { ...salesmen[idx], ...record };
            } else {
                salesmen.push(record);
            }
            localStorage.setItem("salesmen", JSON.stringify(salesmen));

            return record;
        }
    } catch (err) {
        console.warn("Supabase salesmen read failed, falling back to localStorage", err);
    }

    // ===== 2. Fallback to localStorage (old behavior) =====
    try {
        let salesmen = JSON.parse(localStorage.getItem("salesmen") || "[]");
        const fullName = (user.fullName || user.name || "").toLowerCase().trim();

        let match = salesmen.find(s => (s.email || "").toLowerCase().trim() === email);

        if (!match && fullName) {
            match = salesmen.find(s => {
                const sName = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase().trim();
                const alt = (s.name || "").toLowerCase().trim();
                const sEmail = (s.email || "").toLowerCase().trim();
                return (sName === fullName || alt === fullName) && (!sEmail || sEmail === email);
            });
        }

        return match || null;
    } catch (e) {
        console.error("getMySalesmanRecord error:", e);
        return null;
    }
}

async function updateInitialSheetTabVisibility() {
    const tabBtn = document.getElementById("initial-sheet-tab");
    if (!tabBtn) return;

    const user = getCurrentUser() || currentUser;
    if (!user) {
        tabBtn.style.display = "none";
        return;
    }

    const email = (user.email || "").toLowerCase().trim();
    const record = await getMySalesmanRecord();
    const status = (record && record.priceSheetStatus)
        ? String(record.priceSheetStatus).toLowerCase().trim()
        : "";

    // If they already have a price sheet with prices, never show the Initial Sheet tab
    let hasApprovedSheet = false;
    if (email) {
        try {
            const { data: sheet } = await supabaseClient
                .from("salesman_price_sheets")
                .select("id, prices")
                .eq("salesman_email", email)
                .maybeSingle();

            if (sheet && sheet.prices && Object.keys(sheet.prices).length > 0) {
                hasApprovedSheet = true;
            }
        } catch (e) {
            // ignore lookup errors
        }
    }

    // Show only when status is explicitly required/pending AND they don't already have a sheet
    if ((status === "required" || status === "pending") && !hasApprovedSheet) {
        tabBtn.style.display = "";
    } else {
        tabBtn.style.display = "none";
    }
}

async function renderInitialPriceSheet() {
    const container = document.getElementById("initial-sheet-list");
    if (!container) return;

    if (typeof PRODUCT_CATALOG === "undefined") {
        container.innerHTML = `<p class="text-red-600">PRODUCT_CATALOG not found.</p>`;
        return;
    }

    const record = await getMySalesmanRecord();
    const isPending = record && String(record.priceSheetStatus || '').toLowerCase() === 'pending';

    // If pending, load the existing Pending initialPriceSheet so the salesman can still edit it
    window._pendingInitialProposalId = null;
    if (isPending) {
        const user = getCurrentUser() || currentUser;
        const email = (user?.email || '').toLowerCase().trim();
        if (email) {
            try {
                const { data: pendingProp } = await supabaseClient
                    .from('price_proposals')
                    .select('id, items, submitted_at')
                    .eq('type', 'initialPriceSheet')
                    .eq('status', 'Pending')
                    .eq('salesman_email', email)
                    .order('submitted_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (pendingProp) {
                    window._pendingInitialProposalId = pendingProp.id;
                    if (!window.initialSheetDraftPrices) window.initialSheetDraftPrices = {};
                    // Prefill drafts from the submitted proposal
                    (pendingProp.items || []).forEach(item => {
                        if (item.product != null && item.proposedPrice != null) {
                            window.initialSheetDraftPrices[item.product] = Number(item.proposedPrice);
                        }
                    });
                }
            } catch (e) {
                console.warn('Could not load pending initial sheet proposal:', e);
            }
        }
    }

    // Draft map — survives accordion expand/collapse
    if (!window.initialSheetDraftPrices) window.initialSheetDraftPrices = {};

    // Group catalog by category (preserve first-seen order)
    const grouped = {};
    const categoryOrder = [];
    PRODUCT_CATALOG.forEach((p, index) => {
        const cat = p.category || "Other";
        if (!grouped[cat]) {
            grouped[cat] = [];
            categoryOrder.push(cat);
        }
        grouped[cat].push({ product: p, index: index });
    });

    if (!window.initialSheetExpanded) window.initialSheetExpanded = {};
    // First load: only Bully Sticks open; everything else collapsed
    categoryOrder.forEach(cat => {
        if (window.initialSheetExpanded[cat] === undefined) {
            window.initialSheetExpanded[cat] = (cat === "Bully Sticks");
        }
    });

    let html = '';

    // Banner when editing a still-Pending sheet
    if (isPending) {
        html += `
            <div class="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 mb-4">
                <p class="font-semibold text-orange-800">Your initial pricing sheet is pending admin approval.</p>
                <p class="text-sm text-orange-700 mt-1">
                    You can still edit prices below and update the sheet until an admin reviews it.
                    New catalog products (if any) appear with catalog defaults.
                </p>
            </div>
        `;
    }

    html += `
        <div class="flex flex-wrap gap-2 mb-3">
            <button type="button" onclick="expandAllInitialCategories(true)"
                    class="px-3 py-1.5 text-xs font-semibold border-2 border-[#6B4423] rounded-lg hover:bg-[#f8f4eb]">
                Expand All
            </button>
            <button type="button" onclick="expandAllInitialCategories(false)"
                    class="px-3 py-1.5 text-xs font-semibold border-2 border-[#6B4423] rounded-lg hover:bg-[#f8f4eb]">
                Collapse All
            </button>
            <button type="button" onclick="selectAllInitialSheet(true)"
                    class="px-3 py-1.5 text-xs font-semibold border-2 border-[#6B4423] rounded-lg hover:bg-[#f8f4eb]">
                Select All
            </button>
            <button type="button" onclick="selectAllInitialSheet(false)"
                    class="px-3 py-1.5 text-xs font-semibold border-2 border-[#6B4423] rounded-lg hover:bg-[#f8f4eb]">
                Deselect All
            </button>
        </div>
    `;

    categoryOrder.forEach(cat => {
        const items = grouped[cat];
        const isOpen = !!window.initialSheetExpanded[cat];
        const safeCat = cat.replace(/'/g, "\\'");

        html += `
            <div class="mb-3 border-2 border-[#6B4423] rounded-2xl overflow-hidden">
                <button type="button"
                        onclick="toggleInitialCategory('${safeCat}')"
                        class="w-full flex items-center justify-between gap-3 px-4 py-3 bg-[#1E4D2B] text-[#d4b78f] text-left hover:bg-[#254a2f]">
                    <span class="font-bold text-sm">
                        <i class="fas fa-chevron-${isOpen ? 'down' : 'right'} text-xs mr-2"></i>
                        ${cat}
                    </span>
                    <span class="text-xs opacity-90">${items.length} product${items.length !== 1 ? 's' : ''}</span>
                </button>
                <div class="initial-cat-body ${isOpen ? '' : 'hidden'} space-y-2 p-3 bg-[#f8f4eb]">
        `;

        items.forEach(({ product: p, index }) => {
            const catalogPrice = p.isMarketPrice ? null : Number(p.unitPrice);
            const displayCatalog = p.isMarketPrice
                ? "Market Price"
                : "$" + Number(p.unitPrice).toFixed(2);

            // Prefer saved draft, otherwise catalog default
            let startVal = "";
            if (p.isMarketPrice) {
                startVal = (window.initialSheetDraftPrices[p.name] != null)
                    ? Number(window.initialSheetDraftPrices[p.name]).toFixed(2)
                    : "";
            } else if (window.initialSheetDraftPrices[p.name] != null) {
                startVal = Number(window.initialSheetDraftPrices[p.name]).toFixed(2);
            } else {
                startVal = Number(p.unitPrice).toFixed(2);
            }

            const safeName = p.name.replace(/"/g, "&quot;");
            const safeNameJs = p.name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

            html += `
                <div class="bg-white border border-[#d4b78f] rounded-xl p-3 flex flex-wrap items-center gap-3"
                     data-initial-index="${index}"
                     data-product-name="${safeName}">
                    <input type="checkbox"
                           class="initial-sheet-check w-4 h-4 accent-[#1E4D2B]"
                           data-name="${safeName}"
                           checked>
                    <div class="flex-1 min-w-[160px]">
                        <p class="text-sm font-semibold brand-green">${p.name}</p>
                        <p class="text-xs text-[#6B4423]">${p.caseSize || ""} · Catalog: ${displayCatalog}</p>
                    </div>
                    <div class="flex items-center gap-2 flex-wrap">
                        <label class="text-xs text-[#6B4423] whitespace-nowrap">Your price</label>
                        <div class="flex items-center border-2 border-[#6B4423] rounded-lg overflow-hidden bg-white">
                            <span class="px-2 py-1.5 text-sm font-semibold text-[#6B4423] bg-[#f8f4eb] border-r border-[#d4b78f] select-none">$</span>
                            <input type="number"
                                   step="0.01"
                                   min="0"
                                   value="${startVal}"
                                   class="initial-sheet-price w-20 border-0 px-2 py-1.5 text-sm font-semibold focus:outline-none focus:ring-0"
                                   data-catalog="${catalogPrice === null ? "" : catalogPrice}"
                                   data-name="${safeName}"
                                   oninput="onInitialPriceInput(this)">
                        </div>
                        <button type="button"
                                class="initial-save-btn hidden px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#1E4D2B] text-[#d4b78f] hover:bg-[#254a2f]"
                                data-name="${safeName}"
                                onclick="saveInitialPriceRow('${safeNameJs}')">
                            Save
                        </button>
                        <span class="initial-saved-label text-xs text-green-700 font-semibold hidden">Saved</span>
                        <span class="initial-flag text-xs text-red-600 font-semibold hidden">±5% from catalog</span>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    // Re-apply flags for any restored draft values
    container.querySelectorAll(".initial-sheet-price").forEach(inp => {
        if (typeof flagInitialPrice === "function") flagInitialPrice(inp);
    });
    if (typeof filterInitialPriceSheetList === 'function') filterInitialPriceSheetList();

    // Update Submit button label for pending vs first submit
    const submitBtn = document.getElementById('initial-sheet-submit-btn');
    if (submitBtn) {
        submitBtn.textContent = window._pendingInitialProposalId
            ? 'Update Pending Pricing Sheet'
            : 'Submit Initial Pricing Sheet';
        submitBtn.style.display = '';
    }
}

function toggleInitialCategory(cat) {
    if (!window.initialSheetExpanded) window.initialSheetExpanded = {};
    window.initialSheetExpanded[cat] = !window.initialSheetExpanded[cat];
    renderInitialPriceSheet();
}

function expandAllInitialCategories(open) {
    if (!window.initialSheetExpanded) window.initialSheetExpanded = {};
    Object.keys(window.initialSheetExpanded).forEach(k => {
        window.initialSheetExpanded[k] = !!open;
    });
    // Also set any categories not yet tracked
    if (typeof PRODUCT_CATALOG !== "undefined") {
        PRODUCT_CATALOG.forEach(p => {
            const cat = p.category || "Other";
            window.initialSheetExpanded[cat] = !!open;
        });
    }
    renderInitialPriceSheet();
}

function onInitialPriceInput(input) {
    if (!window.initialSheetDraftPrices) window.initialSheetDraftPrices = {};

    const name = input.getAttribute("data-name");
    const row = input.closest("[data-product-name]") || input.closest("[data-initial-index]");
    const saveBtn = row ? row.querySelector(".initial-save-btn") : null;
    const savedLabel = row ? row.querySelector(".initial-saved-label") : null;

    // Always keep the live value in the draft map while typing
    const val = parseFloat(input.value);
    if (name && !isNaN(val) && val >= 0) {
        // Do NOT commit yet — only on Save click
        // Just show the Save button when different from last saved draft
        const lastSaved = window.initialSheetDraftPrices[name];
        const catalog = parseFloat(input.getAttribute("data-catalog"));
        const baseline = (lastSaved != null) ? Number(lastSaved) : (isNaN(catalog) ? null : catalog);

        const differs = baseline == null
            ? !isNaN(val)
            : Math.abs(val - baseline) > 0.0001;

        if (saveBtn) {
            if (differs) {
                saveBtn.classList.remove("hidden");
                if (savedLabel) savedLabel.classList.add("hidden");
            } else {
                saveBtn.classList.add("hidden");
            }
        }
    } else if (saveBtn) {
        saveBtn.classList.remove("hidden");
        if (savedLabel) savedLabel.classList.add("hidden");
    }

    flagInitialPrice(input);
}

function saveInitialPriceRow(productName) {
    if (!window.initialSheetDraftPrices) window.initialSheetDraftPrices = {};

    const input = document.querySelector(
        `.initial-sheet-price[data-name="${CSS.escape(productName)}"]`
    );
    if (!input) return;

    const val = parseFloat(input.value);
    if (isNaN(val) || val < 0) {
        alert("Enter a valid price (0 or higher) before saving.");
        return;
    }

    window.initialSheetDraftPrices[productName] = val;

    const row = input.closest("[data-product-name]") || input.closest("[data-initial-index]");
    const saveBtn = row ? row.querySelector(".initial-save-btn") : null;
    const savedLabel = row ? row.querySelector(".initial-saved-label") : null;

    if (saveBtn) saveBtn.classList.add("hidden");
    if (savedLabel) {
        savedLabel.classList.remove("hidden");
        setTimeout(() => {
            if (savedLabel) savedLabel.classList.add("hidden");
        }, 1500);
    }

    flagInitialPrice(input);
}

function flagInitialPrice(input) {
    // Absolute ±5% from catalog (higher OR lower)
    const catalog = parseFloat(input.getAttribute("data-catalog"));
    const proposed = parseFloat(input.value);

    // Flag sits next to the $ input group — search from the row
    const row = input.closest("[data-product-name]") || input.closest("[data-initial-index]");
    const flag = row
        ? row.querySelector(".initial-flag")
        : input.parentElement.querySelector(".initial-flag");
    if (!flag) return;

    // Style the outer $ wrapper border, not the bare input
    const wrapper = input.closest(".flex.items-center.border-2") || input;

    if (!isNaN(catalog) && catalog > 0 && !isNaN(proposed)) {
        const pct = Math.abs((proposed - catalog) / catalog) * 100;
        if (pct > 5) {
            flag.textContent = (proposed >= catalog ? "+" : "") +
                ((proposed - catalog) / catalog * 100).toFixed(1) + "% from catalog";
            flag.classList.remove("hidden");
            wrapper.classList.add("border-red-500");
            return;
        }
    }

    flag.classList.add("hidden");
    wrapper.classList.remove("border-red-500");
}

function selectAllInitialSheet(checked) {
    document.querySelectorAll(".initial-sheet-check").forEach(cb => {
        cb.checked = checked;
    });
}

async function submitInitialPriceSheet() {
    const user = getCurrentUser() || currentUser;
    if (!user) {
        alert("You must be logged in.");
        return;
    }

    const checks = document.querySelectorAll(".initial-sheet-check:checked");
    if (checks.length === 0) {
        alert("Select at least one product.");
        return;
    }

    const items = [];
    checks.forEach(cb => {
        const row = cb.closest("[data-initial-index]");
        const priceInput = row.querySelector(".initial-sheet-price");
        const name = cb.getAttribute("data-name");
        const catalog = parseFloat(priceInput.getAttribute("data-catalog"));
        const nameKey = cb.getAttribute("data-name");
        // Prefer the saved draft if present, otherwise the live input
        let proposed = parseFloat(priceInput.value);
        if (window.initialSheetDraftPrices &&
            window.initialSheetDraftPrices[nameKey] != null) {
            proposed = Number(window.initialSheetDraftPrices[nameKey]);
        }

        if (isNaN(proposed) || proposed < 0) {
            return;
        }

        items.push({
            product: name,
            catalogPrice: isNaN(catalog) ? null : catalog,
            proposedPrice: proposed,
            belowCatalog: !isNaN(catalog) && proposed < catalog
        });
    });

    if (items.length === 0) {
        alert("No valid prices entered for selected products.");
        return;
    }

    const belowCount = items.filter(i => i.belowCatalog).length;
    const email = (user.email || "").toLowerCase().trim();

    try {
        // 1. Upsert: if a Pending initialPriceSheet already exists for this salesman, UPDATE it
        let proposalError = null;
        if (window._pendingInitialProposalId) {
            const { error } = await supabaseClient
                .from('price_proposals')
                .update({
                    items: items,
                    submitted_at: new Date().toISOString(),
                    salesman_name: user.fullName || user.name || "Salesman"
                })
                .eq('id', window._pendingInitialProposalId)
                .eq('status', 'Pending'); // safety: only update while still Pending
            proposalError = error;
        } else {
            const { data: proposal, error } = await supabaseClient
                .from('price_proposals')
                .insert({
                    type: 'initialPriceSheet',
                    salesman_email: email,
                    salesman_name: user.fullName || user.name || "Salesman",
                    status: 'Pending',
                    items: items,
                    submitted_at: new Date().toISOString()
                })
                .select()
                .single();
            proposalError = error;
            if (proposal && proposal.id) {
                window._pendingInitialProposalId = proposal.id;
            }
        }

        if (proposalError) {
            console.error(proposalError);
            alert("Failed to submit pricing sheet. Please try again.\n" + proposalError.message);
            return;
        }

        // 2. Update the salesman's status to pending in Supabase
        const { error: statusError } = await supabaseClient
            .from('salesmen')
            .update({ price_sheet_status: 'pending' })
            .eq('email', email);

        if (statusError) {
            console.error(statusError);
            // Proposal was saved, but status update failed – still tell the user it was submitted
        }

        const wasUpdate = !!window._pendingInitialProposalId;
        alert(
            (wasUpdate
                ? "Pending pricing sheet updated.\n"
                : "Initial pricing sheet submitted for admin approval.\n") +
            items.length + " product(s) included." +
            (belowCount ? "\n" + belowCount + " item(s) are below catalog price and will need careful review." : "")
        );

        // Keep drafts while still Pending so the form stays in sync after update.
        // Drafts are cleared when admin approves/denies (deny already resets status to required).

        // Refresh the UI
        await updateInitialSheetTabVisibility();
        await renderInitialPriceSheet();

    } catch (err) {
        console.error(err);
        alert("Something went wrong while submitting. Please try again.");
    }
}

window.brianPackCategories = brianPackCategories;
window.salesmanSheetItemKey = salesmanSheetItemKey;
window.renderPriceSheet = renderPriceSheet;
window.filterSalesmanPriceSheetList = filterSalesmanPriceSheetList;
window.filterInitialPriceSheetList = filterInitialPriceSheetList;
window.brianExcelSku = brianExcelSku;
window.exportPriceSheetExcel = exportPriceSheetExcel;
window.exportPriceSheetPdf = exportPriceSheetPdf;
window.salesmanHasApprovedPriceSheet = salesmanHasApprovedPriceSheet;
window.getMySalesmanRecord = getMySalesmanRecord;
window.updateInitialSheetTabVisibility = updateInitialSheetTabVisibility;
window.renderInitialPriceSheet = renderInitialPriceSheet;
window.toggleInitialCategory = toggleInitialCategory;
window.expandAllInitialCategories = expandAllInitialCategories;
window.onInitialPriceInput = onInitialPriceInput;
window.saveInitialPriceRow = saveInitialPriceRow;
window.flagInitialPrice = flagInitialPrice;
window.selectAllInitialSheet = selectAllInitialSheet;
window.submitInitialPriceSheet = submitInitialPriceSheet;
