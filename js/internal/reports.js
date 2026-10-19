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
    if (typeof XLSX === 'undefined') {
        if (typeof loadExcelLib === 'function') {
            loadExcelLib().then(function () { exportMatrixToExcel(); }).catch(function () {
                alert("Excel library not loaded.");
            });
            return;
        }
        return alert("Excel library not loaded.");
    }

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
    if (!canvas) return;
    if (typeof Chart === 'undefined') {
        if (typeof loadChartLib === 'function') {
            loadChartLib().then(function () { renderTrendsChart(); }).catch(function () {});
        }
        return;
    }

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

async function loadProductCosts() {
    try {
        const { data, error } = await supabaseClient
            .from('product_costs')
            .select('*')
            .order('product_name');

        if (error) throw error;

        productCosts = (data || []).map(row => ({
            id: row.id,
            productName: row.product_name,
            category: row.category || '',
            vendorName: row.vendor_name,
            unitCost: Number(row.unit_cost),
            notes: row.notes || '',
            lastUpdated: row.last_updated
        }));

        console.log('Product costs loaded from Supabase:', productCosts.length);
    } catch (err) {
        console.error('loadProductCosts error:', err);
        productCosts = [];
    }
}

async function openProductCostsModal() {
    document.getElementById('product-costs-modal').classList.remove('hidden');
    await loadProductCosts();
    renderCostOfGoods();
}

function hideProductCostsModal() {
    document.getElementById('product-costs-modal').classList.add('hidden');
}

function renderCostOfGoods() {
    const tbody = document.getElementById('cost-of-goods-body');
    const searchInput = document.getElementById('cog-search');
    if (!tbody) return;

    const search = (searchInput?.value || '').toLowerCase();
    tbody.innerHTML = '';

    if (!window.expandedProducts) window.expandedProducts = {};

    PRODUCT_CATALOG.forEach((product, index) => {
        if (search &&
            !product.name.toLowerCase().includes(search) &&
            !(product.category || '').toLowerCase().includes(search)) {
            return;
        }

        const costsForProduct = productCosts.filter(c => c.productName === product.name);
        const isExpanded = window.expandedProducts[product.name] === true;
        const hasMultiple = costsForProduct.length > 1;
        const hasSingle = costsForProduct.length === 1;
        const singleCost = hasSingle ? costsForProduct[0] : null;

        // Format date helper
        const formatDate = (iso) => {
            if (!iso) return '—';
            const d = new Date(iso);
            return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
        };

        // --- Main row ---
        const headerRow = document.createElement('tr');
        headerRow.className = 'border-b border-[#d4b78f] hover:bg-[#f8f4eb]';

        if (hasMultiple) {
            // Multiple costs → expandable summary
            headerRow.classList.add('cursor-pointer');
            headerRow.innerHTML = `
                <td class="p-3 font-medium">
                    <span class="mr-2 text-[#6B4423]">${isExpanded ? '▼' : '▶'}</span>
                    ${escapeHtml(product.name)}
                </td>
                <td class="p-3 text-sm text-[#6B4423]">${product.category || ''}</td>
                <td class="p-3 text-sm">${costsForProduct.length} cost(s)</td>
                <td class="p-3"></td>
                <td class="p-3"></td>
                <td class="p-3 text-center">
                    <button data-index="${index}" class="add-cost-btn px-3 py-1 text-xs bg-[#1E4D2B] text-[#d4b78f] rounded-lg hover:bg-[#254a2f]">
                        Add Cost
                    </button>
                </td>
            `;
            headerRow.addEventListener('click', function(e) {
                if (e.target.closest('.add-cost-btn')) return;
                window.expandedProducts[product.name] = !isExpanded;
                renderCostOfGoods();
            });
        } else if (hasSingle) {
            // Single cost → show details on the main row
            headerRow.innerHTML = `
                <td class="p-3 font-medium">${escapeHtml(product.name)}</td>
                <td class="p-3 text-sm text-[#6B4423]">${escapeHtml(product.category || '')}</td>
                <td class="p-3">${escapeHtml(singleCost.vendorName)}</td>
                <td class="p-3 text-right font-semibold">$${parseFloat(singleCost.unitCost).toFixed(2)}</td>
                <td class="p-3 text-center text-sm">${formatDate(singleCost.lastUpdated)}</td>
                <td class="p-3 text-center">
                    <div class="flex justify-center gap-2">
                        <button data-id="${singleCost.id}" class="edit-cost-btn px-3 py-1 text-xs border border-[#6B4423] rounded-lg hover:bg-white">
                            Edit
                        </button>
                        <button data-id="${singleCost.id}" class="delete-cost-btn px-3 py-1 text-xs border border-red-400 text-red-600 rounded-lg hover:bg-red-50">
                            Delete
                        </button>
                        <button data-index="${index}" class="add-cost-btn px-3 py-1 text-xs bg-[#1E4D2B] text-[#d4b78f] rounded-lg hover:bg-[#254a2f]">
                            Add Cost
                        </button>
                    </div>
                </td>
            `;
        } else {
            // No costs
            headerRow.innerHTML = `
                <td class="p-3 font-medium">${escapeHtml(product.name)}</td>
                <td class="p-3 text-sm text-[#6B4423]">${escapeHtml(product.category || '')}</td>
                <td class="p-3 text-sm">—</td>
                <td class="p-3"></td>
                <td class="p-3"></td>
                <td class="p-3 text-center">
                    <button data-index="${index}" class="add-cost-btn px-3 py-1 text-xs bg-[#1E4D2B] text-[#d4b78f] rounded-lg hover:bg-[#254a2f]">
                        Add Cost
                    </button>
                </td>
            `;
        }

        tbody.appendChild(headerRow);

        // --- Expanded rows (only for multiple costs) ---
        if (hasMultiple && isExpanded) {
            costsForProduct.forEach(cost => {
                const costRow = document.createElement('tr');
                costRow.className = 'bg-[#f8f4eb] border-b border-[#d4b78f]';
                costRow.innerHTML = `
                    <td class="p-3 pl-10 text-sm" colspan="2"></td>
                    <td class="p-3">${escapeHtml(cost.vendorName)}</td>
                    <td class="p-3 text-right font-semibold">$${parseFloat(cost.unitCost).toFixed(2)}</td>
                    <td class="p-3 text-center text-sm">${formatDate(cost.lastUpdated)}</td>
                    <td class="p-3 text-center">
                        <div class="flex justify-center gap-2">
                            <button data-id="${cost.id}" class="edit-cost-btn px-3 py-1 text-xs border border-[#6B4423] rounded-lg hover:bg-white">
                                Edit
                            </button>
                            <button data-id="${cost.id}" class="delete-cost-btn px-3 py-1 text-xs border border-red-400 text-red-600 rounded-lg hover:bg-red-50">
                                Delete
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(costRow);
            });
        }
    });

    // Event listeners
    tbody.querySelectorAll('.add-cost-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const index = parseInt(this.getAttribute('data-index'));
            window.editingCostId = null;
            assignProductCost(PRODUCT_CATALOG[index].name);
        });
    });

    tbody.querySelectorAll('.edit-cost-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const costId = this.getAttribute('data-id'); // keep as string (UUID)
            window.editingCostId = costId;
            editProductCostById(costId);
        });
    });

    tbody.querySelectorAll('.delete-cost-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const costId = this.getAttribute('data-id'); // keep as string (UUID)
            deleteProductCost(costId);
        });
    });
}

function showAddCostModal() {
    const productSelect = document.getElementById('cost-product');
    productSelect.innerHTML = '<option value="">Select a product...</option>';
    PRODUCT_CATALOG.forEach(product => {
        const option = document.createElement('option');
        option.value = product.name;
        option.textContent = product.name;
        productSelect.appendChild(option);
    });

    const vendorSelect = document.getElementById('cost-vendor');
    vendorSelect.innerHTML = '<option value="">Select a vendor...</option>';
    vendors.forEach(v => {
        const option = document.createElement('option');
        option.value = v.name;
        option.textContent = v.name;
        vendorSelect.appendChild(option);
    });

    document.getElementById('cost-unit-cost').value = '';
    document.getElementById('cost-notes').value = '';

    document.getElementById('add-cost-modal').classList.remove('hidden');
}

function hideAddCostModal() {
    document.getElementById('add-cost-modal').classList.add('hidden');
}

async function saveProductCost(event) {
    event.preventDefault();

    const productName = document.getElementById('cost-product').value;
    const vendorName = document.getElementById('cost-vendor').value;
    const unitCostRaw = document.getElementById('cost-unit-cost').value;
    const unitCost = parseFloat(unitCostRaw);
    const notes = (document.getElementById('cost-notes').value || '').trim();

    if (!productName || !vendorName || isNaN(unitCost)) {
        alert('Please fill in Product, Vendor, and a valid Unit Cost.');
        return;
    }

    const catalogItem = PRODUCT_CATALOG.find(p => p.name === productName);
    const category = catalogItem ? catalogItem.category : '';

    try {
        if (window.editingCostId) {
            // Update existing row
            const { error } = await supabaseClient
                .from('product_costs')
                .update({
                    product_name: productName,
                    category: category || null,
                    vendor_name: vendorName,
                    unit_cost: unitCost,
                    notes: notes || null,
                    last_updated: new Date().toISOString()
                })
                .eq('id', window.editingCostId);

            if (error) throw error;
            window.editingCostId = null;
        } else {
            // Insert new row
            const { error } = await supabaseClient
                .from('product_costs')
                .insert({
                    product_name: productName,
                    category: category || null,
                    vendor_name: vendorName,
                    unit_cost: unitCost,
                    notes: notes || null
                });

            if (error) throw error;
        }

        await loadProductCosts();
        renderCostOfGoods();
        hideAddCostModal();
    } catch (err) {
        console.error('saveProductCost error:', err);
        alert('Could not save cost.\n' + (err.message || ''));
    }
}

function assignProductCost(productName) {
    showAddCostModal();
    setTimeout(() => {
        document.getElementById('cost-product').value = productName;
    }, 100);
}

function editProductCost(productName) {
    const costRecord = productCosts.find(c => c.productName === productName);
    showAddCostModal();
    setTimeout(() => {
        if (costRecord) {
            document.getElementById('cost-product').value = costRecord.productName;
            document.getElementById('cost-vendor').value = costRecord.vendorName;
            document.getElementById('cost-unit-cost').value = costRecord.unitCost;
            document.getElementById('cost-notes').value = costRecord.notes || '';
        } else {
            document.getElementById('cost-product').value = productName;
        }
    }, 100);
}

function editProductCostById(costId) {
    const costRecord = productCosts.find(c => String(c.id) === String(costId));
    if (!costRecord) {
        alert('Cost record not found.');
        return;
    }

    window.editingCostId = costId;
    showAddCostModal();

    setTimeout(() => {
        document.getElementById('cost-product').value = costRecord.productName;
        document.getElementById('cost-vendor').value = costRecord.vendorName;
        document.getElementById('cost-unit-cost').value = costRecord.unitCost;
        document.getElementById('cost-notes').value = costRecord.notes || '';
    }, 100);
}

async function deleteProductCost(costId) {
    if (!confirm('Are you sure you want to delete this cost?')) return;

    try {
        const { error } = await supabaseClient
            .from('product_costs')
            .delete()
            .eq('id', costId);

        if (error) throw error;

        await loadProductCosts();
        renderCostOfGoods();
    } catch (err) {
        console.error('deleteProductCost error:', err);
        alert('Could not delete cost.\n' + (err.message || ''));
    }
}

let productIngredients = [];

function getDefaultIngredients() {
    return [
        {
            group: "Jerky Stick Treats",
            name: "USA Beef Jerky Treats",
            ingredients: "Ground Beef Meat, Rice Flour, Spices, Sugar, Salt and Garlic Powder",
            notForHuman: true,
            analysis: { protein: "29.60%", fat: "18.70%", fiber: "0.21%", moisture: "32.70%" },
            sortOrder: 1
        },
        {
            group: "Jerky Stick Treats",
            name: "USA Turkey Jerky Treats",
            ingredients: "Ground Turkey Meat, Rice Flour, Spices, Sugar, Salt and Garlic Powder",
            notForHuman: true,
            analysis: { protein: "30.80%", fat: "16.90%", fiber: "0.25%", moisture: "32.20%" },
            sortOrder: 2
        },
        {
            group: "Jerky Stick Treats",
            name: "USA Chicken Jerky Treats",
            ingredients: "Ground Chicken Meat, Rice Flour, Spices, Sugar, Salt and Garlic Powder",
            notForHuman: true,
            analysis: { protein: "31.20%", fat: "16.40%", fiber: "0.25%", moisture: "32.00%" },
            sortOrder: 3
        },
        {
            group: "Jerky Stick Treats",
            name: "USA Elky Jerky Treats/Squares",
            ingredients: "Ground Elk Meat, Rice Flour, Spices, Sugar, Salt and Garlic Powder",
            notForHuman: true,
            analysis: { protein: "29.60%", fat: "18.70%", fiber: "0.21%", moisture: "32.70%" },
            sortOrder: 4
        },
        {
            group: "Jerky Stick Treats",
            name: "USA Venison & Sweet Potato Jerky Treats",
            ingredients: "Ground Venison, Sweet Potato, Rice Flour, Spices, Sugar, Salt and Garlic Powder",
            notForHuman: true,
            analysis: { protein: "27.50%", fat: "17.80%", fiber: "1.80%", moisture: "31.50%" },
            sortOrder: 5
        },
        {
            group: "Natural Vanilla",
            name: "Vanilla Rollios (all sizes + PHAT)",
            ingredients: "Flavored with natural vanilla",
            notForHuman: false,
            analysis: null,
            sortOrder: 10
        },
        {
            group: "Natural Vanilla",
            name: "Vanilla Cow Ears / Lamb Ears / Ox Tails / Chicken Feet",
            ingredients: "Flavored with natural vanilla",
            notForHuman: false,
            analysis: null,
            sortOrder: 11
        },
        {
            group: "Natural Vanilla",
            name: "Vanilla Cow Cheek Slabs & Chunky Cheeks",
            ingredients: "Flavored with natural vanilla",
            notForHuman: false,
            analysis: null,
            sortOrder: 12
        },
        {
            group: "Natural Vanilla",
            name: "Vanilla Supreme Chips / Binky’s / Retrievers / Braided Donuts / Twisty Q’s",
            ingredients: "Flavored with natural vanilla",
            notForHuman: false,
            analysis: null,
            sortOrder: 13
        },
        {
            group: "Natural Honey + Smoke",
            name: "Honey Smoked Rollios (all sizes + PHAT)",
            ingredients: "Natural honey and natural smoke flavoring",
            notForHuman: false,
            analysis: null,
            sortOrder: 20
        },
        {
            group: "Natural Honey + Smoke",
            name: "Honey Smoked Cow Ears / MAGNA Buffalo Ears / Ox Tails",
            ingredients: "Natural honey and natural smoke flavoring",
            notForHuman: false,
            analysis: null,
            sortOrder: 21
        },
        {
            group: "Natural Honey + Smoke",
            name: "Smoked Cow Hooves",
            ingredients: "Natural smoke flavoring",
            notForHuman: false,
            analysis: null,
            sortOrder: 22
        },
        {
            group: "All Natural Peanut Butter",
            name: "Peanut Butter Rollios",
            ingredients: "All natural peanut butter",
            notForHuman: false,
            analysis: null,
            sortOrder: 30
        },
        {
            group: "All Natural Peanut Butter",
            name: "Peanut Butter Stuffed Buffalo Bone",
            ingredients: "All natural peanut butter",
            notForHuman: false,
            analysis: null,
            sortOrder: 31
        },
        {
            group: "All Natural Peanut Butter",
            name: "Peanut Butter Supreme Chips / Binky’s",
            ingredients: "All natural peanut butter",
            notForHuman: false,
            analysis: null,
            sortOrder: 32
        }
    ];
}

function mapIngredientRow(row) {
    return {
        id: row.id,
        group: row.group_name,
        name: row.name,
        ingredients: row.ingredients || '',
        notForHuman: !!row.not_for_human,
        analysis: row.analysis || null,
        sortOrder: row.sort_order != null ? row.sort_order : 0
    };
}

async function loadIngredients() {
    try {
        const { data, error } = await supabaseClient
            .from('product_ingredients')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            // First-time seed from defaults
            const defaults = getDefaultIngredients();
            const payload = defaults.map(d => ({
                group_name: d.group,
                name: d.name,
                ingredients: d.ingredients,
                not_for_human: d.notForHuman,
                analysis: d.analysis,
                sort_order: d.sortOrder
            }));

            const { data: inserted, error: insertError } = await supabaseClient
                .from('product_ingredients')
                .insert(payload)
                .select();

            if (insertError) throw insertError;
            productIngredients = (inserted || []).map(mapIngredientRow);
        } else {
            productIngredients = data.map(mapIngredientRow);
        }

        updateIngredientsCardPreview();
        return productIngredients;
    } catch (err) {
        console.error('loadIngredients error:', err);
        productIngredients = [];
        return [];
    }
}

async function saveIngredientItem(item) {
    if (!item || !item.id) return;

    try {
        const { error } = await supabaseClient
            .from('product_ingredients')
            .update({
                ingredients: item.ingredients || '',
                not_for_human: !!item.notForHuman,
                analysis: item.analysis || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', item.id);

        if (error) throw error;
    } catch (err) {
        console.error('saveIngredientItem error:', err);
        alert('Could not save ingredient.\n' + (err.message || ''));
        throw err;
    }
}

function updateIngredientsCardPreview() {
    const elky = productIngredients.find(i =>
        (i.name || '').toLowerCase().includes('elky')
    ) || productIngredients[0];

    if (!elky) return;

    const titleEl = document.getElementById('ingredients-card-title');
    const textEl = document.getElementById('ingredients-card-text');
    const warnEl = document.getElementById('ingredients-card-warning');
    const analysisEl = document.getElementById('ingredients-card-analysis');

    if (titleEl) titleEl.textContent = elky.name || '';
    if (textEl) textEl.textContent = elky.ingredients || '';
    if (warnEl) {
        if (elky.notForHuman) {
            warnEl.textContent = 'NOT FOR HUMAN CONSUMPTION';
            warnEl.classList.remove('hidden');
        } else {
            warnEl.textContent = '';
            warnEl.classList.add('hidden');
        }
    }
    if (analysisEl && elky.analysis) {
        analysisEl.innerHTML = `
            <div class="bg-[#f8f4eb] rounded-lg py-2">
                <p class="text-xs text-[#6B4423]">Protein</p>
                <p class="font-bold">${elky.analysis.protein || '—'}</p>
            </div>
            <div class="bg-[#f8f4eb] rounded-lg py-2">
                <p class="text-xs text-[#6B4423]">Acid Fat</p>
                <p class="font-bold">${elky.analysis.fat || '—'}</p>
            </div>
            <div class="bg-[#f8f4eb] rounded-lg py-2">
                <p class="text-xs text-[#6B4423]">Crude Fiber</p>
                <p class="font-bold">${elky.analysis.fiber || '—'}</p>
            </div>
            <div class="bg-[#f8f4eb] rounded-lg py-2">
                <p class="text-xs text-[#6B4423]">Moisture</p>
                <p class="font-bold">${elky.analysis.moisture || '—'}</p>
            </div>
        `;
    }
}

function renderIngredients() {
    const container = document.getElementById('ingredients-list');
    const searchInput = document.getElementById('ingredients-search');
    if (!container) return;

    const search = (searchInput?.value || '').toLowerCase();
    container.innerHTML = '';

    if (!productIngredients || productIngredients.length === 0) {
        container.innerHTML = '<p class="text-[#6B4423] text-sm p-4">No ingredients loaded yet.</p>';
        return;
    }

    const groups = {};
    productIngredients.forEach(item => {
        if (search &&
            !(item.name || '').toLowerCase().includes(search) &&
            !(item.group || '').toLowerCase().includes(search)) {
            return;
        }
        if (!groups[item.group]) groups[item.group] = [];
        groups[item.group].push(item);
    });

    Object.keys(groups).forEach(groupName => {
        const header = document.createElement('div');
        header.className = 'mt-5 mb-2';
        header.innerHTML = `<h3 class="text-lg font-bold brand-green border-b border-[#d4b78f] pb-1">${escapeHtml(groupName)}</h3>`;
        container.appendChild(header);

        groups[groupName].forEach(item => {
            const isExpanded = window.expandedIngredients && window.expandedIngredients[item.id];
            const safeId = String(item.id).replace(/'/g, "\\'");

            let analysisHTML = '';
            if (item.analysis) {
                analysisHTML = `
                    <div class="mt-3">
                        <p class="font-semibold mb-2">Guaranteed Analysis</p>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                            <div class="bg-[#f8f4eb] rounded-lg py-2">
                                <p class="text-xs text-[#6B4423]">Protein</p>
                                <p class="font-bold">${item.analysis.protein || '—'}</p>
                            </div>
                            <div class="bg-[#f8f4eb] rounded-lg py-2">
                                <p class="text-xs text-[#6B4423]">Acid Fat</p>
                                <p class="font-bold">${item.analysis.fat || '—'}</p>
                            </div>
                            <div class="bg-[#f8f4eb] rounded-lg py-2">
                                <p class="text-xs text-[#6B4423]">Crude Fiber</p>
                                <p class="font-bold">${item.analysis.fiber || '—'}</p>
                            </div>
                            <div class="bg-[#f8f4eb] rounded-lg py-2">
                                <p class="text-xs text-[#6B4423]">Moisture</p>
                                <p class="font-bold">${item.analysis.moisture || '—'}</p>
                            </div>
                        </div>
                    </div>
                `;
            }

            const card = document.createElement('div');
            card.className = 'border border-[#d4b78f] rounded-xl overflow-hidden mb-2';
            card.innerHTML = `
                <div class="flex items-center justify-between px-4 py-3 bg-[#f8f4eb] cursor-pointer hover:bg-[#f0e6d9]"
                     onclick="toggleIngredient('${safeId}')">
                    <span class="font-medium">${escapeHtml(item.name)}</span>
                    <span class="text-[#6B4423] text-lg">${isExpanded ? '▼' : '▶'}</span>
                </div>
                <div id="ingredient-detail-${safeId}" class="${isExpanded ? '' : 'hidden'} px-4 py-4 bg-white text-sm space-y-2">
                    <p><strong>Ingredients:</strong> ${escapeHtml(item.ingredients || '')}</p>
                    ${item.notForHuman ? '<p class="text-red-600 font-semibold">NOT FOR HUMAN CONSUMPTION</p>' : ''}
                    ${analysisHTML}
                    <div class="pt-3">
                        <button onclick="editIngredient('${safeId}'); event.stopPropagation();"
                                class="px-4 py-1.5 text-xs bg-[#1E4D2B] text-[#d4b78f] rounded-lg hover:bg-[#254a2f]">
                            Edit
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    });
}

function toggleIngredient(id) {
    if (!window.expandedIngredients) window.expandedIngredients = {};
    window.expandedIngredients[id] = !window.expandedIngredients[id];
    renderIngredients();
}

async function editIngredient(id) {
    const item = productIngredients.find(i => String(i.id) === String(id));
    if (!item) return;

    const newIngredients = prompt('Edit Ingredients:', item.ingredients);
    if (newIngredients === null) return;

    item.ingredients = newIngredients.trim();

    if (item.analysis) {
        const protein = prompt('Protein % (number only):', String(item.analysis.protein || '').replace('%', ''));
        const fat = prompt('Acid Fat % (number only):', String(item.analysis.fat || '').replace('%', ''));
        const fiber = prompt('Crude Fiber % (number only):', String(item.analysis.fiber || '').replace('%', ''));
        const moisture = prompt('Moisture % (number only):', String(item.analysis.moisture || '').replace('%', ''));

        if (protein !== null && protein !== '') item.analysis.protein = protein + '%';
        if (fat !== null && fat !== '') item.analysis.fat = fat + '%';
        if (fiber !== null && fiber !== '') item.analysis.fiber = fiber + '%';
        if (moisture !== null && moisture !== '') item.analysis.moisture = moisture + '%';
    }

    try {
        await saveIngredientItem(item);
        updateIngredientsCardPreview();
        renderIngredients();
        alert('Ingredients saved successfully!');
    } catch (err) {
        // error already alerted in saveIngredientItem
    }
}

async function openIngredientsModal() {
    const modal = document.getElementById('ingredients-modal');
    if (!modal) return;

    if (!productIngredients || productIngredients.length === 0) {
        await loadIngredients();
    }

    modal.classList.remove('hidden');
    renderIngredients();
}

function closeIngredientsModal() {
    const modal = document.getElementById('ingredients-modal');
    if (modal) modal.classList.add('hidden');
}

function getProductMarginData() {
    // Only products that have at least one cost record
    const productsWithCost = [];

    PRODUCT_CATALOG.forEach(product => {
        const costs = productCosts.filter(c => c.productName === product.name);
        if (costs.length === 0) return;

        // Use the lowest cost if multiple vendors (most common approach)
        const unitCost = Math.min(...costs.map(c => parseFloat(c.unitCost)));
        const sellingPrice = parseFloat(product.unitPrice) || 0;

        if (sellingPrice <= 0) return;

        const marginDollar = sellingPrice - unitCost;
        const marginPercent = (marginDollar / sellingPrice) * 100;

        let status = 'normal';
        if (marginPercent > 55) status = 'outperform';
        else if (marginPercent < 30) status = 'underperform';

        productsWithCost.push({
            name: product.name,
            category: product.category || '',
            unitCost: unitCost,
            sellingPrice: sellingPrice,
            marginDollar: marginDollar,
            marginPercent: marginPercent,
            status: status
        });
    });

    // Sort by margin % descending
    productsWithCost.sort((a, b) => b.marginPercent - a.marginPercent);

    return productsWithCost;
}

function getMarginSummary() {
    const data = getProductMarginData();

    if (data.length === 0) {
        return {
            totalProducts: 0,
            avgMargin: 0,
            outperformCount: 0,
            underperformCount: 0,
            topPerformers: []
        };
    }

    const totalMargin = data.reduce((sum, p) => sum + p.marginPercent, 0);
    const avgMargin = totalMargin / data.length;

    const outperformCount = data.filter(p => p.status === 'outperform').length;
    const underperformCount = data.filter(p => p.status === 'underperform').length;

    // Top 20% by margin
    const topCount = Math.max(1, Math.ceil(data.length * 0.20));
    const topPerformers = data.slice(0, topCount);

    return {
        totalProducts: data.length,
        avgMargin: avgMargin,
        outperformCount: outperformCount,
        underperformCount: underperformCount,
        topPerformers: topPerformers,
        allProducts: data
    };
}

function updateDashboardProfitMargin() {
    const summary = getMarginSummary();

    const avgEl = document.getElementById('dash-avg-margin');
    const outEl = document.getElementById('dash-outperform-count');
    const underEl = document.getElementById('dash-underperform-count');

    if (avgEl) {
        avgEl.textContent = summary.totalProducts > 0 
            ? summary.avgMargin.toFixed(1) + '%' 
            : '—';
    }
    if (outEl) outEl.textContent = summary.outperformCount;
    if (underEl) underEl.textContent = summary.underperformCount;
}

let currentMarginFilter = 'all';

function renderProfitMarginSection() {
    const summary = getMarginSummary();

    // Summary cards
    const avgEl = document.getElementById('pm-avg-margin');
    const outEl = document.getElementById('pm-outperform');
    const underEl = document.getElementById('pm-underperform');

    if (avgEl) {
        avgEl.textContent = summary.totalProducts > 0 
            ? summary.avgMargin.toFixed(1) + '%' 
            : '—';
    }
    if (outEl) outEl.textContent = summary.outperformCount;
    if (underEl) underEl.textContent = summary.underperformCount;

    // Top Performers (always shows top 20%)
    const topContainer = document.getElementById('pm-top-performers');
    if (topContainer) {
        if (summary.topPerformers.length === 0) {
            topContainer.innerHTML = '<p class="text-[#6B4423]">No products with cost data yet.</p>';
        } else {
            topContainer.innerHTML = summary.topPerformers.map((p, i) => `
                <div class="flex justify-between items-center bg-[#f8f4eb] rounded-xl px-4 py-2">
                    <span class="font-medium">${i + 1}. ${escapeHtml(p.name)}</span>
                    <span class="font-bold text-green-700">${p.marginPercent.toFixed(1)}%</span>
                </div>
            `).join('');
        }
    }

}

function setMarginFilter(filter) {
    currentMarginFilter = filter;

    // Clear the search box
    const searchInput = document.getElementById('pm-search');
    if (searchInput) searchInput.value = '';

    if (filter === 'all') {
        // All Products → open modal
        showPmProductsModal('all');
    } else {
        // Out Performing or Under-Performing → show inside the section
        renderMarginFilteredList();
    }
}

function renderMarginFilteredList() {
    const resultsContainer = document.getElementById('pm-search-results');
    if (!resultsContainer) return;

    const data = getProductMarginData();
    let filtered = [];

    if (currentMarginFilter === 'outperform') {
        filtered = data.filter(p => p.status === 'outperform');
    } else if (currentMarginFilter === 'underperform') {
        filtered = data.filter(p => p.status === 'underperform');
    } else {
        filtered = data; // all
    }

    resultsContainer.innerHTML = '';

    if (filtered.length === 0) {
        resultsContainer.innerHTML = '<p class="text-[#6B4423] text-sm">No products in this category.</p>';
        return;
    }

    filtered.forEach(p => {
        let statusBadge = '';
        if (p.status === 'outperform') {
            statusBadge = '<span class="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">★ Outperform</span>';
        } else if (p.status === 'underperform') {
            statusBadge = '<span class="px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full">⚠ Under</span>';
        } else {
            statusBadge = '<span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">Normal</span>';
        }

        const card = document.createElement('div');
        card.className = 'bg-[#f8f4eb] border border-[#d4b78f] rounded-xl px-4 py-3';
        card.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <p class="font-medium">${escapeHtml(p.name)}</p>
                    <p class="text-sm text-[#6B4423] mt-1">
                        Cost: $${p.unitCost.toFixed(2)} &nbsp;|&nbsp; 
                        Price: $${p.sellingPrice.toFixed(2)} &nbsp;|&nbsp; 
                        Margin: $${p.marginDollar.toFixed(2)} (${p.marginPercent.toFixed(1)}%)
                    </p>
                </div>
                <div>${statusBadge}</div>
            </div>
        `;
        resultsContainer.appendChild(card);
    });
}

function renderProfitMarginSearch() {
    const searchInput = document.getElementById('pm-search');
    if (!searchInput) return;

    const search = searchInput.value.trim().toLowerCase();

    if (search.length < 2) {
        // Clear the in-section list when search is empty
        const resultsContainer = document.getElementById('pm-search-results');
        if (resultsContainer) resultsContainer.innerHTML = '';
        return;
    }

    // Search → open modal
    showPmProductsModal('search', search);
}

function showPmProductsModal(filter, searchTerm = '') {
    const modal = document.getElementById('pm-products-modal');
    const listContainer = document.getElementById('pm-modal-list');
    const titleEl = document.getElementById('pm-modal-title');
    const subtitleEl = document.getElementById('pm-modal-subtitle');

    if (!modal || !listContainer) return;

    const marginData = getProductMarginData();
    const marginByName = {};
    marginData.forEach(p => { marginByName[p.name] = p; });

    let filtered = [];
    let title = 'Products';
    let subtitle = '';

    if (filter === 'search') {
        const term = (searchTerm || '').toLowerCase().trim();
        const catalog = (typeof PRODUCT_CATALOG !== 'undefined') ? PRODUCT_CATALOG : [];
        filtered = catalog
            .filter(p =>
                p.name.toLowerCase().includes(term) ||
                (p.category || '').toLowerCase().includes(term)
            )
            .map(p => {
                if (marginByName[p.name]) return marginByName[p.name];
                return {
                    name: p.name,
                    category: p.category || '',
                    unitCost: null,
                    sellingPrice: parseFloat(p.unitPrice) || 0,
                    marginDollar: null,
                    marginPercent: null,
                    status: 'no-cost'
                };
            });
        title = 'Search Results';
        subtitle = term
            ? `Showing products matching "${searchTerm}"`
            : 'Search results';
    } else {
        filtered = marginData;
        title = 'All Products';
        subtitle = 'All products with cost data';
    }

    if (titleEl) titleEl.textContent = title;
    if (subtitleEl) subtitleEl.textContent = subtitle;

    listContainer.innerHTML = '';

    if (filtered.length === 0) {
        listContainer.innerHTML = '<p class="text-[#6B4423] text-sm">No products found.</p>';
    } else {
        filtered.forEach(p => {
            let statusBadge = '';
            let detailLine = '';

            if (p.status === 'no-cost' || p.unitCost == null) {
                statusBadge = '<span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">No cost data</span>';
                detailLine = `Price: $${(p.sellingPrice || 0).toFixed(2)} · Add a cost in Cost of Goods to see margin`;
            } else if (p.status === 'outperform') {
                statusBadge = '<span class="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">★ Outperform</span>';
                detailLine = `Cost: $${p.unitCost.toFixed(2)} · Price: $${p.sellingPrice.toFixed(2)} · Margin: $${p.marginDollar.toFixed(2)} (${p.marginPercent.toFixed(1)}%)`;
            } else if (p.status === 'underperform') {
                statusBadge = '<span class="px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full">⚠ Under</span>';
                detailLine = `Cost: $${p.unitCost.toFixed(2)} · Price: $${p.sellingPrice.toFixed(2)} · Margin: $${p.marginDollar.toFixed(2)} (${p.marginPercent.toFixed(1)}%)`;
            } else {
                statusBadge = '<span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">Normal</span>';
                detailLine = `Cost: $${p.unitCost.toFixed(2)} · Price: $${p.sellingPrice.toFixed(2)} · Margin: $${p.marginDollar.toFixed(2)} (${p.marginPercent.toFixed(1)}%)`;
            }

            const card = document.createElement('div');
            card.className = 'bg-[#f8f4eb] border border-[#d4b78f] rounded-xl px-4 py-3';
            card.innerHTML = `
                <div class="flex justify-between items-start gap-3">
                    <div>
                        <p class="font-medium">${escapeHtml(p.name)}</p>
                        <p class="text-sm text-[#6B4423] mt-1">${escapeHtml(detailLine)}</p>
                    </div>
                    <div>${statusBadge}</div>
                </div>
            `;
            listContainer.appendChild(card);
        });
    }

    modal.classList.remove('hidden');
}

function hidePmProductsModal() {
    const modal = document.getElementById('pm-products-modal');
    if (modal) modal.classList.add('hidden');
}

window.loadProductCosts = loadProductCosts;
window.openProductCostsModal = openProductCostsModal;
window.hideProductCostsModal = hideProductCostsModal;
window.renderCostOfGoods = renderCostOfGoods;
window.showAddCostModal = showAddCostModal;
window.hideAddCostModal = hideAddCostModal;
window.saveProductCost = saveProductCost;
window.assignProductCost = assignProductCost;
window.editProductCost = editProductCost;
window.editProductCostById = editProductCostById;
window.deleteProductCost = deleteProductCost;
window.getDefaultIngredients = getDefaultIngredients;
window.mapIngredientRow = mapIngredientRow;
window.loadIngredients = loadIngredients;
window.saveIngredientItem = saveIngredientItem;
window.updateIngredientsCardPreview = updateIngredientsCardPreview;
window.renderIngredients = renderIngredients;
window.toggleIngredient = toggleIngredient;
window.editIngredient = editIngredient;
window.openIngredientsModal = openIngredientsModal;
window.closeIngredientsModal = closeIngredientsModal;
window.getProductMarginData = getProductMarginData;
window.getMarginSummary = getMarginSummary;
window.updateDashboardProfitMargin = updateDashboardProfitMargin;
window.renderProfitMarginSection = renderProfitMarginSection;
window.setMarginFilter = setMarginFilter;
window.renderMarginFilteredList = renderMarginFilteredList;
window.renderProfitMarginSearch = renderProfitMarginSearch;
window.showPmProductsModal = showPmProductsModal;
window.hidePmProductsModal = hidePmProductsModal;
