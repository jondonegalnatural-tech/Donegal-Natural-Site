// Internal portal — weekly sales matrix, trends charts, and sales summary.
// Matrix and trends state stays global in internal-portal.js.
// ================== WEEKLY MATRIX FUNCTIONS ==================
function getSunday(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff));
}

function formatWeekRange(startDate) {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function getFourWeekWindow() {
    const today = new Date();
    const currentSunday = getSunday(today);
    const weeks = [];

    for (let i = 0; i < 4; i++) {
        const weekStart = new Date(currentSunday);
        weekStart.setDate(weekStart.getDate() - (i * 7));
        weeks.unshift({
            start: weekStart,
            label: `Week ${4 - i}`,
            range: formatWeekRange(weekStart)
        });
    }
    return weeks;
}

function moveMatrixWeeks(weekOffset) {
    if (!currentMatrixStartDate) currentMatrixStartDate = getSunday(new Date());

    const newStart = new Date(currentMatrixStartDate);
    newStart.setDate(newStart.getDate() + weekOffset);

    currentMatrixStartDate = newStart;
    renderWeeklyMatrix();
}

let currentMatrixWeeks = [];

function renderWeeklyMatrix() {
    const container = document.getElementById('weekly-matrix-container');
    if (!container) return;

    // Only build the checkbox list once (rebuilding would wipe the user's selection)
    const matrixDd = document.getElementById('matrix-category-dropdown');
    if (matrixDd && matrixDd.children.length === 0) {
        populateCategoryDropdown();
    }

    const weeks = getFourWeekWindow();
    currentMatrixWeeks = weeks;
    currentMatrixStartDate = weeks[0].start;

    const searchTerm = (document.getElementById('matrix-search')?.value || '').toLowerCase().trim();
    const selectedCategories = getSelectedMatrixCategories();
    const isAllCategories = selectedCategories.includes('all');

    let filteredCatalog = PRODUCT_CATALOG.filter(product => {
        const matchesCategory = isAllCategories || selectedCategories.includes(product.category);
        const matchesSearch = searchTerm === '' || product.name.toLowerCase().includes(searchTerm);
        return matchesCategory && matchesSearch;
    });

    const grouped = {};
    filteredCatalog.forEach(product => {
        if (!grouped[product.category]) grouped[product.category] = [];
        grouped[product.category].push(product);
    });

        let html = `
        <div class="overflow-x-auto max-h-[650px] overflow-y-auto border border-[#6B4423] rounded-xl">
            <table class="w-full text-sm border-collapse">
                <thead>
                    <tr>
                        <th class="p-3 text-center border border-[#6B4423] min-w-[280px] sticky top-0 left-0 bg-[#1E4D2B] text-[#d4b78f] z-30">Product Name</th>
    `;

    weeks.forEach((week, index) => {
        html += `
            <th class="p-2 text-center border border-[#6B4423] min-w-[130px] sticky top-0 bg-[#1E4D2B] text-[#d4b78f] z-20">
                <div class="flex flex-col items-center gap-1">
                    <label class="flex items-center gap-1 cursor-pointer text-xs">
                        <input type="checkbox" class="week-checkbox" data-week-index="${index}" checked onchange="updateMatrixTotals()">
                        <span class="font-bold">${week.label}</span>
                    </label>
                    <div class="text-xs font-normal leading-tight">${week.range}</div>
                </div>
            </th>
        `;
    });

    html += `
                        <th class="p-3 text-center border border-[#6B4423] min-w-[120px] sticky top-0 bg-[#254a2f] text-[#d4b78f] z-20">
                            4 Week Total<br><span class="text-xs font-normal">(Selected Weeks)</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (Object.keys(grouped).length === 0) {
        html += `<tr><td colspan="6" class="p-8 text-center text-[#6B4423]">No products match your search or category filter.</td></tr>`;
    } else {
        Object.keys(grouped).forEach(category => {
            const productsInCategory = grouped[category];
            const categoryWeekTotals = [0, 0, 0, 0];

            const productData = productsInCategory.map(product => {
                const weekValues = weeks.map((week, idx) => {
                    const value = getMatrixValue(product, week.start);
                    categoryWeekTotals[idx] += value;
                    return value;
                });
                return { product, weekValues };
            });

            html += `
                <tr class="bg-[#f8f1e9] text-[#6B4423] category-total-row" data-category="${category}">
                    <td class="p-2 border border-[#6B4423] font-bold sticky left-0 bg-[#f8f1e9] z-10 min-w-[280px] text-left">${category}</td>
                    <td class="p-2 border border-[#6B4423] text-center font-bold week-cell" data-week="0">${formatMatrixValue(categoryWeekTotals[0])}</td>
                    <td class="p-2 border border-[#6B4423] text-center font-bold week-cell" data-week="1">${formatMatrixValue(categoryWeekTotals[1])}</td>
                    <td class="p-2 border border-[#6B4423] text-center font-bold week-cell" data-week="2">${formatMatrixValue(categoryWeekTotals[2])}</td>
                    <td class="p-2 border border-[#6B4423] text-center font-bold week-cell" data-week="3">${formatMatrixValue(categoryWeekTotals[3])}</td>
                    <td class="p-2 border border-[#6B4423] text-center font-bold total-cell">${currentMatrixMetric === 'change' ? '—' : '0'}</td>
                </tr>
            `;

            productData.forEach(({ product, weekValues }, index) => {
                const bgClass = index % 2 === 0 ? 'bg-white' : 'bg-[#f8f4eb]';
                html += `
                    <tr class="${bgClass}" data-product="${product.name.replace(/[^a-zA-Z0-9]/g, '_')}" data-category="${category}">
                        <td class="p-3 border border-[#6B4423] sticky left-0 ${bgClass} font-medium text-[#1E4D2B] z-10 text-left">${product.name}</td>
                        <td class="p-3 border border-[#6B4423] text-center week-cell" data-week="0">${formatMatrixValue(weekValues[0])}</td>
                        <td class="p-3 border border-[#6B4423] text-center week-cell" data-week="1">${formatMatrixValue(weekValues[1])}</td>
                        <td class="p-3 border border-[#6B4423] text-center week-cell" data-week="2">${formatMatrixValue(weekValues[2])}</td>
                        <td class="p-3 border border-[#6B4423] text-center week-cell" data-week="3">${formatMatrixValue(weekValues[3])}</td>
                        <td class="p-3 border border-[#6B4423] text-center font-bold total-cell">${currentMatrixMetric === 'change' ? '—' : '0'}</td>
                    </tr>
                `;
            });
        });
    }

    html += `</tbody></table></div>`;
    container.innerHTML = html;
    updateMatrixTotals();
}

function getUnitsSoldInWeek(productName, weekStartDate) {
    if (!allOrders || allOrders.length === 0) return 0;

    const weekEnd = new Date(weekStartDate);
    weekEnd.setDate(weekEnd.getDate() + 6);

    let total = 0;

    allOrders.forEach(order => {
        if (typeof isTestStoreOrder === 'function' && isTestStoreOrder(order)) return;
        if (!order.items) return;
        order.items.forEach(item => {
            if (item.product && item.product.toLowerCase().includes(productName.toLowerCase())) {
                const orderDate = new Date(order.submittedAt);
                if (orderDate >= weekStartDate && orderDate <= weekEnd) {
                    total += item.quantity || 0;
                }
            }
        });
    });

    return total;
}

function getMatrixValue(product, weekStartDate) {
    const units = getUnitsSoldInWeek(product.name, weekStartDate);
    const price = product.unitPrice || 0;
    const cost = product.landedCost || 0;

    switch (currentMatrixMetric) {
        case 'sales':
            return units * price;
        case 'potential':
        case 'actual':
            return units * (price - cost);
        case 'change':
            const lastYearDate = new Date(weekStartDate);
            lastYearDate.setFullYear(lastYearDate.getFullYear() - 1);
            const lastYearUnits = getUnitsSoldInWeek(product.name, lastYearDate);
            if (lastYearUnits === 0) return null;
            return ((units - lastYearUnits) / lastYearUnits) * 100;
        default:
            return units;
    }
}

function formatMatrixValue(value) {
    if (value === null || value === undefined) return '—';

    if (currentMatrixMetric === 'sales' || currentMatrixMetric === 'potential' || currentMatrixMetric === 'actual') {
        return '$' + value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    if (currentMatrixMetric === 'change') {
        const sign = value > 0 ? '+' : '';
        return sign + value.toFixed(1) + '%';
    }
    return value;
}

function updateMatrixTotals() {
    const checkboxes = document.querySelectorAll('.week-checkbox');
    const selectedWeeks = [];
    checkboxes.forEach(cb => {
        if (cb.checked) selectedWeeks.push(parseInt(cb.dataset.weekIndex));
    });

    document.querySelectorAll('tr[data-product], tr.category-total-row').forEach(row => {
        let total = 0;

        if (currentMatrixMetric === 'change') {
            const totalCell = row.querySelector('.total-cell');
            if (totalCell) totalCell.textContent = '—';
            return;
        }

        selectedWeeks.forEach(weekIndex => {
            const cell = row.querySelector(`.week-cell[data-week="${weekIndex}"]`);
            if (cell) {
                let value = cell.textContent;
                if (currentMatrixMetric === 'sales' || currentMatrixMetric === 'potential' || currentMatrixMetric === 'actual') {
                    value = value.replace(/[$,]/g, '');
                }
                total += parseFloat(value) || 0;
            }
        });

        const totalCell = row.querySelector('.total-cell');
        if (totalCell) {
            if (currentMatrixMetric === 'sales' || currentMatrixMetric === 'potential' || currentMatrixMetric === 'actual') {
                totalCell.textContent = '$' + total.toLocaleString();
            } else {
                totalCell.textContent = total;
            }
        }
    });
}

function setMatrixMetric(metric) {
    currentMatrixMetric = metric;

    const buttons = {
        units: document.getElementById('metric-units'),
        sales: document.getElementById('metric-sales'),
        change: document.getElementById('metric-change'),
        potential: document.getElementById('metric-potential'),
        actual: document.getElementById('metric-actual')
    };

    Object.keys(buttons).forEach(key => {
        if (buttons[key]) {
            if (key === metric) {
                buttons[key].className = 'metric-btn px-4 py-2 rounded-xl text-sm font-semibold border-2 border-[#6B4423] bg-[#1E4D2B] text-[#d4b78f]';
            } else {
                buttons[key].className = 'metric-btn px-4 py-2 rounded-xl text-sm font-semibold border-2 border-[#6B4423] bg-white text-[#6B4423] hover:bg-[#f8f4eb]';
            }
        }
    });

    const disclaimer = document.getElementById('change-disclaimer');
    if (disclaimer) {
        disclaimer.style.display = (metric === 'change') ? 'block' : 'none';
    }

    renderWeeklyMatrix();
}

function getMetricLabel(metric) {
    switch (metric) {
        case 'units': return 'Units';
        case 'sales': return 'Sales $';
        case 'change': return '% Change';
        case 'potential': return 'Potential GP';
        case 'actual': return 'Actual GP';
        default: return metric;
    }
}

function populateCategoryDropdown() {
    const dropdown = document.getElementById('matrix-category-dropdown');
    if (!dropdown) return;

    const categories = [...new Set((PRODUCT_CATALOG || []).map(p => p.category).filter(Boolean))].sort();

    let html = `
        <label class="flex items-center gap-2 px-3 py-1.5 hover:bg-[#f8f4eb] cursor-pointer text-sm">
            <input type="checkbox" id="matrix-cat-all" checked onchange="onMatrixCategoryChange('all')" class="accent-[#1E4D2B]">
            <span class="font-semibold">All Categories</span>
        </label>
        <div class="border-t border-[#e8d9b8] my-1"></div>
    `;

    categories.forEach(cat => {
        const safeId = 'matrix-cat-' + cat.replace(/[^a-zA-Z0-9]/g, '_');
        html += `
            <label class="flex items-center gap-2 px-3 py-1.5 hover:bg-[#f8f4eb] cursor-pointer text-sm">
                <input type="checkbox" id="${safeId}" data-category="${cat}" onchange="onMatrixCategoryChange()" class="accent-[#1E4D2B]">
                <span>${cat}</span>
            </label>
        `;
    });

    dropdown.innerHTML = html;
}

function exportMatrixToCSV() {
    const table = document.querySelector('#weekly-matrix-container table');
    if (!table) return alert("No data to export.");

    let csv = [];
    table.querySelectorAll('tr').forEach(row => {
        const cols = row.querySelectorAll('td, th');
        const rowData = [];
        cols.forEach(col => {
            let text = col.innerText.replace(/(\r\n|\n|\r)/gm, " ").replace(/"/g, '""');
            rowData.push(`"${text}"`);
        });
        csv.push(rowData.join(','));
    });

    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Weekly_Sales_Matrix_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
}

function exportMatrixToExcel() {
    const table = document.querySelector('#weekly-matrix-container table');
    if (!table) return alert("No data to export.");
    if (typeof XLSX === 'undefined') return alert("Excel library not loaded.");

    const wb = XLSX.utils.table_to_book(table, { sheet: "Weekly Sales" });
    XLSX.writeFile(wb, `Weekly_Sales_Matrix_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ================== TRENDS VIEW (Phase 1) ==================
function setMatrixView(view) {
    currentMatrixView = view;

    const tableView = document.getElementById('matrix-table-view');
    const trendsView = document.getElementById('matrix-trends-view');
    const btnTable = document.getElementById('matrix-view-table');
    const btnTrends = document.getElementById('matrix-view-trends');

    if (!tableView || !trendsView) return;

    if (view === 'trends') {
        tableView.classList.add('hidden');
        trendsView.classList.remove('hidden');
        if (btnTable) {
            btnTable.className = 'px-5 py-2 rounded-xl text-sm font-semibold border-2 border-[#6B4423] bg-white text-[#6B4423] hover:bg-[#f8f4eb]';
        }
        if (btnTrends) {
            btnTrends.className = 'px-5 py-2 rounded-xl text-sm font-semibold border-2 border-[#6B4423] bg-[#1E4D2B] text-[#d4b78f]';
        }
        initTrendsYears();
        populateTrendsCategoryDropdown();
        renderTrendsChart();
    } else {
        trendsView.classList.add('hidden');
        tableView.classList.remove('hidden');
        if (btnTable) {
            btnTable.className = 'px-5 py-2 rounded-xl text-sm font-semibold border-2 border-[#6B4423] bg-[#1E4D2B] text-[#d4b78f]';
        }
        if (btnTrends) {
            btnTrends.className = 'px-5 py-2 rounded-xl text-sm font-semibold border-2 border-[#6B4423] bg-white text-[#6B4423] hover:bg-[#f8f4eb]';
        }
        if (typeof renderWeeklyMatrix === 'function') renderWeeklyMatrix();
    }
}

function setTrendsMode(mode) {
    currentTrendsMode = mode;
    const btnMulti = document.getElementById('trends-mode-multi');
    const btnMtd = document.getElementById('trends-mode-mtd');
    const yearControls = document.getElementById('trends-year-0')?.closest('.flex.items-center.gap-3');

    if (mode === 'multi') {
        if (btnMulti) btnMulti.className = 'px-4 py-2 rounded-xl text-sm font-semibold border-2 border-[#6B4423] bg-[#1E4D2B] text-[#d4b78f]';
        if (btnMtd) btnMtd.className = 'px-4 py-2 rounded-xl text-sm font-semibold border-2 border-[#6B4423] bg-white text-[#6B4423] hover:bg-[#f8f4eb]';
        if (yearControls) yearControls.classList.remove('hidden');
        renderTrendsChart();
    } else {
        if (btnMtd) btnMtd.className = 'px-4 py-2 rounded-xl text-sm font-semibold border-2 border-[#6B4423] bg-[#1E4D2B] text-[#d4b78f]';
        if (btnMulti) btnMulti.className = 'px-4 py-2 rounded-xl text-sm font-semibold border-2 border-[#6B4423] bg-white text-[#6B4423] hover:bg-[#f8f4eb]';
        if (yearControls) yearControls.classList.add('hidden');
        renderTrendsChart();
    }
}

function setTrendsMetric(metric) {
    currentTrendsMetric = metric;
    const btnUnits = document.getElementById('trends-metric-units');
    const btnSales = document.getElementById('trends-metric-sales');

    if (metric === 'units') {
        if (btnUnits) btnUnits.className = 'px-4 py-2 rounded-xl text-sm font-semibold border-2 border-[#6B4423] bg-[#1E4D2B] text-[#d4b78f]';
        if (btnSales) btnSales.className = 'px-4 py-2 rounded-xl text-sm font-semibold border-2 border-[#6B4423] bg-white text-[#6B4423] hover:bg-[#f8f4eb]';
    } else {
        if (btnSales) btnSales.className = 'px-4 py-2 rounded-xl text-sm font-semibold border-2 border-[#6B4423] bg-[#1E4D2B] text-[#d4b78f]';
        if (btnUnits) btnUnits.className = 'px-4 py-2 rounded-xl text-sm font-semibold border-2 border-[#6B4423] bg-white text-[#6B4423] hover:bg-[#f8f4eb]';
    }
    renderTrendsChart();
}

function initTrendsYears() {
    const currentYear = new Date().getFullYear();
    // Forward-looking: current year + next two years
    const years = [currentYear, currentYear + 1, currentYear + 2];

    years.forEach((year, idx) => {
        const label = document.getElementById('trends-year-' + idx + '-label');
        if (label) label.textContent = year;
        const cb = document.getElementById('trends-year-' + idx);
        if (cb) cb.dataset.year = year;
    });
}

function populateTrendsCategoryDropdown() {
    const dropdown = document.getElementById('trends-category-dropdown');
    if (!dropdown) return;

    const categories = [...new Set((PRODUCT_CATALOG || []).map(p => p.category).filter(Boolean))].sort();

    let html = `
        <label class="flex items-center gap-2 px-3 py-1.5 hover:bg-[#f8f4eb] cursor-pointer text-sm">
            <input type="checkbox" id="trends-cat-all" checked onchange="onTrendsCategoryChange('all')" class="accent-[#1E4D2B]">
            <span class="font-semibold">All Categories</span>
        </label>
        <div class="border-t border-[#e8d9b8] my-1"></div>
    `;

    categories.forEach(cat => {
        const safeId = 'trends-cat-' + cat.replace(/[^a-zA-Z0-9]/g, '_');
        html += `
            <label class="flex items-center gap-2 px-3 py-1.5 hover:bg-[#f8f4eb] cursor-pointer text-sm">
                <input type="checkbox" id="${safeId}" data-category="${cat}" onchange="onTrendsCategoryChange()" class="accent-[#1E4D2B]">
                <span>${cat}</span>
            </label>
        `;
    });

    dropdown.innerHTML = html;
}

function toggleTrendsCategoryDropdown() {
    const dd = document.getElementById('trends-category-dropdown');
    if (!dd) return;
    dd.classList.toggle('hidden');
}

function onTrendsCategoryChange(which) {
    const allCb = document.getElementById('trends-cat-all');
    const categoryCbs = document.querySelectorAll('#trends-category-dropdown input[data-category]');

    if (which === 'all') {
        const isChecked = allCb?.checked;
        categoryCbs.forEach(cb => { cb.checked = false; });
        if (allCb) allCb.checked = !!isChecked;
    } else {
        if (allCb) allCb.checked = false;
    }

    updateTrendsCategoryLabel();
    renderTrendsChart();
}

function getSelectedMatrixCategories() {
    const allCb = document.getElementById('matrix-cat-all');
    if (allCb && allCb.checked) return ['all'];

    const selected = [];
    document.querySelectorAll('#matrix-category-dropdown input[data-category]:checked').forEach(cb => {
        selected.push(cb.dataset.category);
    });
    return selected.length ? selected : ['all'];
}

function onMatrixCategoryChange(which) {
    const allCb = document.getElementById('matrix-cat-all');
    const categoryCbs = document.querySelectorAll('#matrix-category-dropdown input[data-category]');

    if (which === 'all') {
        const isChecked = allCb?.checked;
        categoryCbs.forEach(cb => { cb.checked = false; });
        if (allCb) allCb.checked = !!isChecked;
    } else {
        if (allCb) allCb.checked = false;
    }

    // Update the dropdown label if the element exists
    const label = document.getElementById('matrix-category-label');
    if (label) {
        const selected = getSelectedMatrixCategories();
        if (selected.includes('all') || selected.length === 0) {
            label.textContent = 'All Categories';
        } else if (selected.length === 1) {
            label.textContent = selected[0];
        } else {
            label.textContent = selected.length + ' categories';
        }
    }

    if (typeof renderWeeklyMatrix === 'function') {
        renderWeeklyMatrix();
    }
}

function toggleMatrixCategoryDropdown() {
    const dd = document.getElementById('matrix-category-dropdown');
    if (!dd) return;
    dd.classList.toggle('hidden');
}

function getSelectedTrendsCategories() {
    const allCb = document.getElementById('trends-cat-all');
    if (allCb && allCb.checked) return ['all'];

    const selected = [];
    document.querySelectorAll('#trends-category-dropdown input[data-category]:checked').forEach(cb => {
        selected.push(cb.dataset.category);
    });
    return selected.length ? selected : ['all'];
}

function updateTrendsCategoryLabel() {
    const label = document.getElementById('trends-category-label');
    if (!label) return;

    const selected = getSelectedTrendsCategories();
    if (selected.includes('all') || selected.length === 0) {
        label.textContent = 'All Categories';
    } else if (selected.length === 1) {
        label.textContent = selected[0];
    } else {
        label.textContent = selected.length + ' categories';
    }
}

document.addEventListener('click', function(e) {
    const matrixBtn = document.getElementById('matrix-category-btn');
    const matrixDd = document.getElementById('matrix-category-dropdown');
    if (matrixBtn && matrixDd && !matrixBtn.contains(e.target) && !matrixDd.contains(e.target)) {
        matrixDd.classList.add('hidden');
    }

    const trendsBtn = document.getElementById('trends-category-btn');
    const trendsDd = document.getElementById('trends-category-dropdown');
    if (trendsBtn && trendsDd && !trendsBtn.contains(e.target) && !trendsDd.contains(e.target)) {
        trendsDd.classList.add('hidden');
    }
});

function getMonthlyTrendData(selectedYears, categories, metric) {
    // categories is an array: ['all'] or ['Bully Sticks', 'Jerky', ...]
    const result = {};
    selectedYears.forEach(y => {
        result[y] = {};
        for (let m = 0; m < 12; m++) result[y][m] = 0;
    });

    if (!allOrders || allOrders.length === 0) return result;

    const isAll = !categories || categories.includes('all') || categories.length === 0;

    const productNamesInCategory = new Set();
    if (!isAll && typeof PRODUCT_CATALOG !== 'undefined') {
        PRODUCT_CATALOG.forEach(p => {
            if (categories.includes(p.category)) {
                productNamesInCategory.add(p.name);
            }
        });
    }

    allOrders.forEach(order => {
        if (typeof isTestStoreOrder === 'function' && isTestStoreOrder(order)) return;
        const orderDate = new Date(order.submittedAt || order.submitted_at || order.date || 0);
        if (isNaN(orderDate.getTime())) return;

        const year = orderDate.getFullYear();
        const month = orderDate.getMonth();

        if (!selectedYears.includes(year)) return;

        (order.items || []).forEach(item => {
            const name = item.product || item.name || '';
            if (!name) return;

            if (!isAll) {
                if (!productNamesInCategory.has(name)) {
                    let matched = false;
                    productNamesInCategory.forEach(pn => {
                        if (name.toLowerCase().includes(pn.toLowerCase()) || pn.toLowerCase().includes(name.toLowerCase())) {
                            matched = true;
                        }
                    });
                    if (!matched) return;
                }
            }

            const qty = parseInt(item.quantity, 10) || 0;
            if (qty <= 0) return;

            if (metric === 'sales') {
                const unit = typeof getOrderItemUnitPrice === 'function'
                    ? getOrderItemUnitPrice(item)
                    : (parseFloat(item.unitPrice) || 0);
                result[year][month] += qty * unit;
            } else {
                result[year][month] += qty;
            }
        });
    });

    return result;
}

function renderTrendsChart() {
    const canvas = document.getElementById('trends-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    const selectedCategories = getSelectedTrendsCategories();
    const metric = currentTrendsMetric || 'units';

    // ========== MTD vs LY MTD MODE ==========
    if (currentTrendsMode === 'mtd') {
        renderMtdComparisonChart(canvas, selectedCategories, metric);
        return;
    }

    // ========== MULTI-YEAR MODE ==========
    const selectedYears = [];
    for (let i = 0; i < 3; i++) {
        const cb = document.getElementById('trends-year-' + i);
        if (cb && cb.checked) {
            const y = parseInt(cb.dataset.year || cb.nextElementSibling?.textContent, 10);
            if (!isNaN(y)) selectedYears.push(y);
        }
    }
    if (selectedYears.length === 0) {
        selectedYears.push(new Date().getFullYear());
    }
    selectedYears.sort((a, b) => a - b);

    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const colors = [
        { border: '#1E4D2B', bg: 'rgba(30, 77, 43, 0.12)' },
        { border: '#6B4423', bg: 'rgba(107, 68, 35, 0.12)' },
        { border: '#c9a227', bg: 'rgba(201, 162, 39, 0.12)' },
        { border: '#2a6f4e', bg: 'rgba(42, 111, 78, 0.12)' },
        { border: '#8b5a2b', bg: 'rgba(139, 90, 43, 0.12)' },
        { border: '#4a7c59', bg: 'rgba(74, 124, 89, 0.12)' },
        { border: '#a67c52', bg: 'rgba(166, 124, 82, 0.12)' },
        { border: '#3d5c45', bg: 'rgba(61, 92, 69, 0.12)' }
    ];

    let datasets = [];
    const isAll = selectedCategories.includes('all');

    if (!isAll && selectedCategories.length > 0) {
        // One line per selected category (focus on current year or latest selected year)
        const focusYear = selectedYears.includes(new Date().getFullYear())
            ? new Date().getFullYear()
            : selectedYears[selectedYears.length - 1];

        selectedCategories.forEach((cat, idx) => {
            const monthlyData = getMonthlyTrendData([focusYear], [cat], metric);
            const data = [];
            for (let m = 0; m < 12; m++) {
                data.push(Math.round((monthlyData[focusYear] || {})[m] || 0));
            }
            const c = colors[idx % colors.length];
            datasets.push({
                label: cat,
                data: data,
                borderColor: c.border,
                backgroundColor: c.bg,
                borderWidth: 2.5,
                tension: 0.3,
                fill: false,
                pointRadius: 3,
                pointHoverRadius: 5
            });
        });
    } else {
        // All Categories → one line per year
        const monthlyData = getMonthlyTrendData(selectedYears, ['all'], metric);
        datasets = selectedYears.map((year, idx) => {
            const data = [];
            for (let m = 0; m < 12; m++) data.push(Math.round((monthlyData[year] || {})[m] || 0));
            const c = colors[idx % colors.length];
            return {
                label: String(year),
                data: data,
                borderColor: c.border,
                backgroundColor: c.bg,
                borderWidth: 2.5,
                tension: 0.3,
                fill: true,
                pointRadius: 3,
                pointHoverRadius: 5
            };
        });
    }

    if (trendsChartInstance) {
        trendsChartInstance.destroy();
        trendsChartInstance = null;
    }

    trendsChartInstance = new Chart(canvas, {
        type: 'line',
        data: { labels: monthLabels, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#6B4423', font: { weight: '600' }, boxWidth: 12 }
                },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            const v = ctx.parsed.y || 0;
                            if (metric === 'sales') return ctx.dataset.label + ': $' + v.toLocaleString();
                            return ctx.dataset.label + ': ' + v.toLocaleString() + ' units';
                        }
                    }
                }
            },
            scales: {
                x: { ticks: { color: '#6B4423' }, grid: { color: 'rgba(107, 68, 35, 0.08)' } },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#6B4423',
                        callback: function(value) {
                            if (metric === 'sales') {
                                if (value >= 1000) return '$' + (value / 1000).toFixed(0) + 'k';
                                return '$' + value;
                            }
                            return value;
                        }
                    },
                    grid: { color: 'rgba(107, 68, 35, 0.08)' }
                }
            }
        }
    });

    // Summary cards
    const monthlyForSummary = getMonthlyTrendData(selectedYears, selectedCategories, metric);
    updateTrendsSummary(selectedYears, monthlyForSummary, metric, selectedCategories);
}

function renderMtdComparisonChart(canvas, categories, metric) {
    const isAll = !categories || categories.includes('all') || categories.length === 0;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();

    let mtdValue = 0;
    let lyMtdValue = 0;

    const productNamesInCategory = new Set();
    if (!isAll && typeof PRODUCT_CATALOG !== 'undefined') {
        PRODUCT_CATALOG.forEach(p => {
            if (categories.includes(p.category)) {
                productNamesInCategory.add(p.name);
            }
        });
    }

    (allOrders || []).forEach(order => {
        const orderDate = new Date(order.submittedAt || order.submitted_at || order.date || 0);
        if (isNaN(orderDate.getTime())) return;

        const y = orderDate.getFullYear();
        const m = orderDate.getMonth();
        const d = orderDate.getDate();

        const isCurrentMtd = (y === currentYear && m === currentMonth && d <= currentDay);
        const isLyMtd = (y === currentYear - 1 && m === currentMonth && d <= currentDay);

        if (!isCurrentMtd && !isLyMtd) return;

        (order.items || []).forEach(item => {
            const name = item.product || item.name || '';
            if (!name) return;

            if (!isAll) {
                if (!productNamesInCategory.has(name)) {
                    let matched = false;
                    productNamesInCategory.forEach(pn => {
                        if (name.toLowerCase().includes(pn.toLowerCase()) || pn.toLowerCase().includes(name.toLowerCase())) {
                            matched = true;
                        }
                    });
                    if (!matched) return;
                }
            }

            const qty = parseInt(item.quantity, 10) || 0;
            if (qty <= 0) return;

            let add = qty;
            if (metric === 'sales') {
                const unit = typeof getOrderItemUnitPrice === 'function'
                    ? getOrderItemUnitPrice(item)
                    : (parseFloat(item.unitPrice) || 0);
                add = qty * unit;
            }

            if (isCurrentMtd) mtdValue += add;
            if (isLyMtd) lyMtdValue += add;
        });
    });

    mtdValue = Math.round(mtdValue);
    lyMtdValue = Math.round(lyMtdValue);

    if (trendsChartInstance) {
        trendsChartInstance.destroy();
        trendsChartInstance = null;
    }

    trendsChartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: ['This Month (MTD)', 'Last Year MTD'],
            datasets: [{
                label: metric === 'sales' ? 'Sales $' : 'Units',
                data: [mtdValue, lyMtdValue],
                backgroundColor: ['rgba(30, 77, 43, 0.75)', 'rgba(107, 68, 35, 0.65)'],
                borderColor: ['#1E4D2B', '#6B4423'],
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            const v = ctx.parsed.y || 0;
                            if (metric === 'sales') return '$' + v.toLocaleString();
                            return v.toLocaleString() + ' units';
                        }
                    }
                }
            },
            scales: {
                x: { ticks: { color: '#6B4423', font: { weight: '600' } }, grid: { display: false } },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#6B4423',
                        callback: function(value) {
                            if (metric === 'sales') {
                                if (value >= 1000) return '$' + (value / 1000).toFixed(0) + 'k';
                                return '$' + value;
                            }
                            return value;
                        }
                    },
                    grid: { color: 'rgba(107, 68, 35, 0.08)' }
                }
            }
        }
    });

    // Summary cards for MTD mode
    const ytdEl = document.getElementById('trends-summary-ytd');
    const vsEl = document.getElementById('trends-summary-vsly');
    const topEl = document.getElementById('trends-summary-topcat');

    if (ytdEl) {
        ytdEl.textContent = metric === 'sales'
            ? '$' + mtdValue.toLocaleString()
            : mtdValue.toLocaleString() + ' units';
    }

    if (vsEl) {
        if (lyMtdValue === 0) {
            vsEl.textContent = '—';
            vsEl.className = 'text-xl font-bold brand-green mt-1';
        } else {
            const pct = ((mtdValue - lyMtdValue) / lyMtdValue) * 100;
            const sign = pct >= 0 ? '+' : '';
            vsEl.textContent = sign + pct.toFixed(1) + '%';
            vsEl.className = 'text-xl font-bold mt-1 ' + (pct >= 0 ? 'text-green-700' : 'text-red-600');
        }
    }

    if (topEl) {
        if (isAll) {
            topEl.textContent = 'All Categories';
        } else if (categories.length === 1) {
            topEl.textContent = categories[0];
        } else {
            topEl.textContent = categories.length + ' categories';
        }
    }
}

function updateTrendsSummary(selectedYears, monthlyData, metric, category) {
    const currentYear = new Date().getFullYear();
    const prevYear = currentYear - 1;

    let ytd = 0;
    let prevYtd = 0;

    if (monthlyData[currentYear]) {
        Object.values(monthlyData[currentYear]).forEach(v => ytd += v);
    }
    if (monthlyData[prevYear]) {
        Object.values(monthlyData[prevYear]).forEach(v => prevYtd += v);
    }

    const ytdEl = document.getElementById('trends-summary-ytd');
    const vsEl = document.getElementById('trends-summary-vsly');
    const topEl = document.getElementById('trends-summary-topcat');

    if (ytdEl) {
        if (metric === 'sales') {
            ytdEl.textContent = '$' + Math.round(ytd).toLocaleString();
        } else {
            ytdEl.textContent = Math.round(ytd).toLocaleString() + ' units';
        }
    }

    if (vsEl) {
        if (prevYtd === 0) {
            vsEl.textContent = '—';
        } else {
            const pct = ((ytd - prevYtd) / prevYtd) * 100;
            const sign = pct >= 0 ? '+' : '';
            vsEl.textContent = sign + pct.toFixed(1) + '%';
            vsEl.className = 'text-xl font-bold mt-1 ' + (pct >= 0 ? 'text-green-700' : 'text-red-600');
        }
    }

    if (topEl) {
        if (!category || category === 'all' || (Array.isArray(category) && (category.includes('all') || category.length === 0))) {
            topEl.textContent = 'All Categories';
        } else if (Array.isArray(category)) {
            topEl.textContent = category.length === 1 ? category[0] : category.length + ' categories';
        } else {
            topEl.textContent = category;
        }
    }
}

// Orders, approve/ship modals, and pro forma notify live in js/internal/orders.js

// Customer list, detail, pricing, and map live in js/internal/customers.js

function updateReportsSalesSummary() {
    const container = document.getElementById('sales-reports-content');
    if (!container) return;

    if (!allOrders || allOrders.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-chart-line text-5xl text-[#d4b78f] mb-4"></i>
                <p class="text-[#6B4423]">No sales data yet. Add some orders to see reports here.</p>
            </div>
        `;
        return;
    }

    let ytdSales = 0;
    let mtdSales = 0;
    let wtdSales = 0;
    let totalOrders = allOrders.filter(function (o) {
        return typeof isTestStoreOrder !== 'function' || !isTestStoreOrder(o);
    }).length;

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    allOrders.forEach(order => {
        if (typeof isTestStoreOrder === 'function' && isTestStoreOrder(order)) return;
        if (!order.items || !Array.isArray(order.items)) return;
        const orderDate = new Date(order.submittedAt || order.submitted_at || order.date || now);
        if (isNaN(orderDate.getTime())) return;

        let orderTotal = 0;
        order.items.forEach(item => {
            const qty = parseInt(item.quantity, 10) || 0;
            const unit = typeof getOrderItemUnitPrice === 'function'
                ? getOrderItemUnitPrice(item)
                : (parseFloat(item.unitPrice) || 0);
            orderTotal += qty * unit;
        });

        if (orderDate >= startOfYear) ytdSales += orderTotal;
        if (orderDate >= startOfMonth) mtdSales += orderTotal;
        if (orderDate >= startOfWeek) wtdSales += orderTotal;
    });

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="bg-[#f8f4eb] rounded-xl p-5 text-center">
                <p class="text-sm text-[#6B4423]">Year to Date</p>
                <p class="text-3xl font-bold brand-green mt-1">$${ytdSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div class="bg-[#f8f4eb] rounded-xl p-5 text-center">
                <p class="text-sm text-[#6B4423]">Month to Date</p>
                <p class="text-3xl font-bold brand-green mt-1">$${mtdSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div class="bg-[#f8f4eb] rounded-xl p-5 text-center">
                <p class="text-sm text-[#6B4423]">Week to Date</p>
                <p class="text-3xl font-bold brand-green mt-1">$${wtdSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div class="bg-[#f8f4eb] rounded-xl p-5 text-center">
                <p class="text-sm text-[#6B4423]">Total Orders</p>
                <p class="text-3xl font-bold brand-green mt-1">${totalOrders}</p>
            </div>
        </div>
    `;
}

window.getSunday = getSunday;
window.formatWeekRange = formatWeekRange;
window.getFourWeekWindow = getFourWeekWindow;
window.moveMatrixWeeks = moveMatrixWeeks;
window.renderWeeklyMatrix = renderWeeklyMatrix;
window.getUnitsSoldInWeek = getUnitsSoldInWeek;
window.getMatrixValue = getMatrixValue;
window.formatMatrixValue = formatMatrixValue;
window.updateMatrixTotals = updateMatrixTotals;
window.setMatrixMetric = setMatrixMetric;
window.getMetricLabel = getMetricLabel;
window.populateCategoryDropdown = populateCategoryDropdown;
window.exportMatrixToCSV = exportMatrixToCSV;
window.exportMatrixToExcel = exportMatrixToExcel;
window.setMatrixView = setMatrixView;
window.setTrendsMode = setTrendsMode;
window.setTrendsMetric = setTrendsMetric;
window.initTrendsYears = initTrendsYears;
window.populateTrendsCategoryDropdown = populateTrendsCategoryDropdown;
window.toggleTrendsCategoryDropdown = toggleTrendsCategoryDropdown;
window.onTrendsCategoryChange = onTrendsCategoryChange;
window.getSelectedMatrixCategories = getSelectedMatrixCategories;
window.onMatrixCategoryChange = onMatrixCategoryChange;
window.toggleMatrixCategoryDropdown = toggleMatrixCategoryDropdown;
window.getSelectedTrendsCategories = getSelectedTrendsCategories;
window.updateTrendsCategoryLabel = updateTrendsCategoryLabel;
window.getMonthlyTrendData = getMonthlyTrendData;
window.renderTrendsChart = renderTrendsChart;
window.renderMtdComparisonChart = renderMtdComparisonChart;
window.updateTrendsSummary = updateTrendsSummary;
window.updateReportsSalesSummary = updateReportsSalesSummary;

// Salesman → customer price-sheet drill-down.
// ========== Reports: Salesman → Customers price-sheet drill-down ==========
async function populateReportsSalesmanSelect() {
    const select = document.getElementById('reports-salesman-select');
    if (!select) return;

    if (!Array.isArray(salesmen) || salesmen.length === 0) {
        if (typeof loadSalesmen === 'function') await loadSalesmen();
    }
    if (!Array.isArray(allCustomers) || !allCustomers.length) {
        if (typeof loadCustomers === 'function') await loadCustomers();
    }
    if (!Array.isArray(allCustomers) || !allCustomers.length) {
        if (typeof loadCustomers === 'function') await loadCustomers();
    }

    const active = (salesmen || []).filter(s => s.active !== false && (s.email || '').trim());
    const current = select.value;
    select.innerHTML = '<option value="">— Choose a salesman —</option>' +
        active.map(s => {
            const name = s.name || [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email;
            const email = (s.email || '').toLowerCase().trim();
            return `<option value="${escapeHtml(email)}">${escapeHtml(name)}${s.territory ? ' — ' + escapeHtml(s.territory) : ''}</option>`;
        }).join('');

    // Restore previous selection if still valid
    if (current && Array.from(select.options).some(o => o.value === current)) {
        select.value = current;
    }
}

async function onReportsSalesmanChange() {
    const select = document.getElementById('reports-salesman-select');
    const container = document.getElementById('reports-salesman-customers');
    if (!container) return;

    const email = (select?.value || '').toLowerCase().trim();
    if (!email) {
        container.innerHTML = '';
        return;
    }

    // Ensure customers are loaded
    if ((!allCustomers || allCustomers.length === 0) && typeof loadCustomers === 'function') {
        await loadCustomers();
    }

    const filtered = (allCustomers || []).filter(c =>
        (c.salesmanEmail || '').toLowerCase().trim() === email
    );

    if (filtered.length === 0) {
        container.innerHTML = '<p class="text-sm text-[#6B4423]">No customers currently assigned to this salesman.</p>';
        return;
    }

    container.innerHTML = filtered.map(c => {
        const name = (c.name || '—').replace(/"/g, '&quot;');
        const company = (c.company || c.email || '').replace(/"/g, '&quot;');
        const id = c.id || '';
        return `
            <div class="flex items-center justify-between gap-3 p-3 border border-[#d4b78f] rounded-xl bg-[#f8f4eb]">
                <div class="min-w-0">
                    <p class="font-semibold brand-green truncate">${escapeHtml(name)}</p>
                    <p class="text-xs text-[#6B4423] truncate">${escapeHtml(company)}</p>
                </div>
                <button type="button"
                        onclick="openReportsCustomerPriceSheet('${id}')"
                        class="px-3 py-1.5 text-xs bg-[#1E4D2B] text-[#d4b78f] font-semibold rounded-lg hover:bg-[#254a2f] flex-shrink-0">
                    <i class="fas fa-file-invoice-dollar mr-1"></i> View Price Sheet
                </button>
            </div>
        `;
    }).join('');
}

function renderComparedPriceSheetTable(sheetPrices, listEl) {
    if (!listEl) return 0;
    const catalog = (typeof PRODUCT_CATALOG !== 'undefined' ? PRODUCT_CATALOG : [])
        .filter(function (p) { return !p.isMarketPrice; });
    if (!catalog.length) {
        listEl.innerHTML = '<p class="text-sm text-[#6B4423]">Catalog not loaded.</p>';
        return 0;
    }
    const byCat = {};
    catalog.forEach(function (p) {
        const cat = p.category || 'Other';
        if (!byCat[cat]) byCat[cat] = [];
        const base = Number(p.unitPrice);
        const raw = sheetPrices && sheetPrices[p.name] != null ? Number(sheetPrices[p.name]) : base;
        const sheet = isNaN(raw) ? base : raw;
        const delta = (!isNaN(base) && base > 0) ? ((sheet - base) / base * 100) : 0;
        byCat[cat].push({
            name: p.name,
            caseSize: p.caseSize || '',
            base: isNaN(base) ? null : base,
            sheet: sheet,
            delta: delta
        });
    });
    const cats = Object.keys(byCat).sort();
    let total = 0;
    let html = '';
    cats.forEach(function (cat) {
        const rows = byCat[cat].sort(function (a, b) { return a.name.localeCompare(b.name); });
        total += rows.length;
        html += '<div><h3 class="text-base font-bold brand-green mb-2 border-b border-[#d4b78f] pb-1">' +
            escapeHtml(cat) + '</h3>' +
            '<div class="overflow-x-auto border border-[#d4b78f] rounded-xl mb-4">' +
            '<table class="w-full text-sm"><thead><tr class="bg-[#1E4D2B] text-[#d4b78f]">' +
            '<th class="p-2.5 text-left">Product</th>' +
            '<th class="p-2.5 text-left w-24">Case</th>' +
            '<th class="p-2.5 text-right w-24">Base</th>' +
            '<th class="p-2.5 text-right w-24">This sheet</th>' +
            '<th class="p-2.5 text-right w-20">Delta</th>' +
            '</tr></thead><tbody>';
        rows.forEach(function (row, i) {
            const bg = i % 2 ? 'bg-[#f8f4eb]' : 'bg-white';
            const deltaClass = Math.abs(row.delta) > 0.05
                ? (row.delta > 0 ? 'text-green-700' : 'text-red-700')
                : 'text-[#6B4423]';
            const deltaText = (row.delta >= 0 ? '+' : '') + row.delta.toFixed(1) + '%';
            html += '<tr class="border-t border-[#e8d9b8] ' + bg + '">' +
                '<td class="p-2.5">' + escapeHtml(salesmanSheetDisplayName(row.name)) + '</td>' +
                '<td class="p-2.5 text-[#6B4423]">' + escapeHtml(row.caseSize || '—') + '</td>' +
                '<td class="p-2.5 text-right">' + (row.base != null ? ('$' + row.base.toFixed(2)) : '—') + '</td>' +
                '<td class="p-2.5 text-right font-semibold">$' + row.sheet.toFixed(2) + '</td>' +
                '<td class="p-2.5 text-right ' + deltaClass + '">' + deltaText + '</td>' +
                '</tr>';
        });
        html += '</tbody></table></div></div>';
    });
    listEl.innerHTML = html;
    return total;
}

async function openReportsCustomerPriceSheet(customerId) {
    if (!customerId) {
        alert('Missing customer id.');
        return;
    }

    const customer = (allCustomers || []).find(c => String(c.id) === String(customerId));
    if (!customer) {
        alert('Customer not found in current list.');
        return;
    }

    const salesmanEmail = (customer.salesmanEmail || '').toLowerCase().trim();
    window._spsDisplayNames = {};
    const titleEl = document.getElementById('price-sheet-modal-title');
    const subEl = document.getElementById('price-sheet-modal-subtitle');
    const listEl = document.getElementById('price-sheet-modal-list');
    const modal = document.getElementById('salesman-price-sheet-modal');

    window._spsCanEdit = false;
    window._spsEditing = false;
    window._spsSheet = null;
    if (typeof setSalesmanPriceSheetEditMode === 'function') setSalesmanPriceSheetEditMode(false);
    if (titleEl) titleEl.textContent = 'Customer Price Sheet';
    if (subEl) subEl.textContent = (customer.name || customer.email || customerId) + (customer.company ? ' · ' + customer.company : '');
    if (listEl) listEl.innerHTML = '<p class="text-sm text-[#6B4423]"><i class="fas fa-spinner fa-spin mr-2"></i>Loading…</p>';
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }

    try {
        let prices = null;
        let sourceLabel = '';
        let updatedAt = null;

        // 1. Prefer customer_price_sheets
        const { data: custSheet, error: custErr } = await supabaseClient
            .from('customer_price_sheets')
            .select('prices, updated_at')
            .eq('customer_id', customerId)
            .maybeSingle();
        if (custErr) throw custErr;

        if (custSheet && custSheet.prices && typeof custSheet.prices === 'object' && Object.keys(custSheet.prices).length > 0) {
            prices = custSheet.prices;
            sourceLabel = 'Customer-specific sheet';
            updatedAt = custSheet.updated_at;
        } else if (salesmanEmail) {
            // 2. Fallback to salesman_price_sheets
            const { data: salesSheet, error: salesErr } = await supabaseClient
                .from('salesman_price_sheets')
                .select('prices, updated_at, salesman_name')
                .eq('salesman_email', salesmanEmail)
                .maybeSingle();
            if (salesErr) throw salesErr;

            if (salesSheet && salesSheet.prices && typeof salesSheet.prices === 'object' && Object.keys(salesSheet.prices).length > 0) {
                prices = salesSheet.prices;
                sourceLabel = 'Salesman base sheet' + (salesSheet.salesman_name ? ' (' + salesSheet.salesman_name + ')' : '');
                updatedAt = salesSheet.updated_at;
            }
        }

        if (!prices) {
            if (listEl) listEl.innerHTML = '<p class="text-sm text-[#6B4423]">No price sheet found for this customer (and no salesman base sheet available).</p>';
            return;
        }

        if (salesmanEmail) {
            const { data: nickRow } = await supabaseClient
                .from('salesman_price_sheets')
                .select('display_names')
                .eq('salesman_email', salesmanEmail)
                .maybeSingle();
            if (nickRow && nickRow.display_names && typeof nickRow.display_names === 'object') {
                window._spsDisplayNames = nickRow.display_names;
            }
        }
        const count = renderComparedPriceSheetTable(prices, listEl);

        if (subEl) {
            const updated = updatedAt ? new Date(updatedAt).toLocaleString() : '';
            subEl.textContent = (customer.name || customer.email || customerId)
                + ' · ' + sourceLabel
                + ' · ' + count + ' products'
                + (updated ? ' · Updated ' + updated : '');
        }
    } catch (err) {
        console.error('openReportsCustomerPriceSheet error:', err);
        if (listEl) listEl.innerHTML = `<p class="text-sm text-red-600">Could not load price sheet.<br>${err.message || ''}</p>`;
    }
}

window.populateReportsSalesmanSelect = populateReportsSalesmanSelect;
window.onReportsSalesmanChange = onReportsSalesmanChange;
window.renderComparedPriceSheetTable = renderComparedPriceSheetTable;
window.openReportsCustomerPriceSheet = openReportsCustomerPriceSheet;
