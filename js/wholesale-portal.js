// =============================================
// WHOLESALE-PORTAL.JS — Donegal Natural
// =============================================

console.log("wholesale-portal.js loaded");

// ================== SUPABASE SETUP ==================
const SUPABASE_URL = 'https://kyzfdlzqlckrpdkavxei.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5emZkbHpxbGNrcnBka2F2eGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3ODU0NjEsImV4cCI6MjEwMDM2MTQ2MX0.Y1Sshp1-0lFwKakCgpJtAUpaHNB0PQ1vuo6SOHZcPu4';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Edge Function auth — use the logged-in user's JWT (not the public anon key)
async function getEdgeFunctionHeaders() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session || !session.access_token) {
        throw new Error('Not signed in — cannot call Edge Function');
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + session.access_token,
        'apikey': SUPABASE_ANON_KEY
    };
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Soft guard — fast redirect if no customer cache
(function () {
    try {
        const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (!user || (user.role !== 'customer' && user.role !== 'admin')) {
            window.location.replace('login-portal.html');
        }
    } catch (e) {
        window.location.replace('login-portal.html');
    }
})();

// Hard guard — live session + role from profiles
(async function enforceCustomerSession() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            localStorage.removeItem('currentUser');
            window.location.replace('login-portal.html');
            return;
        }
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('id, email, full_name, role, company, must_change_password')
            .eq('id', session.user.id)
            .single();
        if (error || !profile || (profile.role !== 'customer' && profile.role !== 'admin')) {
            localStorage.removeItem('currentUser');
            try { await supabaseClient.auth.signOut(); } catch (_) {}
            window.location.replace('login-portal.html');
            return;
        }
        const prev = JSON.parse(localStorage.getItem('currentUser') || '{}');
        localStorage.setItem('currentUser', JSON.stringify({
            id: profile.id,
            username: profile.email,
            fullName: profile.full_name || profile.email,
            role: profile.role,
            company: profile.company || '',
            email: profile.email,
            mustChangePassword: !!profile.must_change_password,
            loginTime: prev.loginTime || new Date().toISOString(),
            supabase: true
        }));
    } catch (e) {
        console.error('enforceCustomerSession:', e);
        localStorage.removeItem('currentUser');
        window.location.replace('login-portal.html');
    }
})();

async function revalidateCustomerSession() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            localStorage.removeItem('currentUser');
            window.location.replace('login-portal.html');
            return false;
        }
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
        if (error || !profile || (profile.role !== 'customer' && profile.role !== 'admin')) {
            localStorage.removeItem('currentUser');
            try { await supabaseClient.auth.signOut(); } catch (_) {}
            window.location.replace('login-portal.html');
            return false;
        }
        return true;
    } catch (err) {
        localStorage.removeItem('currentUser');
        window.location.replace('login-portal.html');
        return false;
    }
}

window.addEventListener('pageshow', function () { revalidateCustomerSession(); });
window.addEventListener('focus', function () { revalidateCustomerSession(); });
document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') revalidateCustomerSession();
});
// ================== GLOBAL VARIABLES ==================
let currentCategoryFilter = 'All';
let currentSubCategoryFilter = '';
let recommendedRotatorTimer = null;
let quoteItems = JSON.parse(localStorage.getItem('wholesaleQuote')) || [];
let portalInventory = {}; // product_name → quantity
let customerBackOrders = []; // pending + fulfilled for this customer

function resolveActiveCustomer() {
    const accounts = window._customerAccounts || [];
    if (accounts.length === 0) {
        window._currentCustomer = null;
        return null;
    }
    if (accounts.length === 1) {
        window._currentCustomer = accounts[0];
        localStorage.setItem('activeCustomerId', accounts[0].id);
        return accounts[0];
    }
    const savedId = localStorage.getItem('activeCustomerId');
    let active = accounts.find(c => String(c.id) === String(savedId));
    if (!active) {
        active = accounts[0];
        localStorage.setItem('activeCustomerId', active.id);
    }
    window._currentCustomer = active;
    return active;
}

function switchActiveCustomer(customerId) {
    const accounts = window._customerAccounts || [];
    const next = accounts.find(c => String(c.id) === String(customerId));
    if (!next) return;

    localStorage.setItem('activeCustomerId', next.id);
    window._currentCustomer = next;

    // Soft restriction follows the active store
    if (isCustomerInactive(next)) {
        applyInactiveSoftRestriction();
    } else {
        clearInactiveSoftRestriction();
    }

    // Refresh anything that depends on the active store
    if (typeof updateShippingPolicyCard === 'function') updateShippingPolicyCard();
    if (typeof renderPortalProducts === 'function') renderPortalProducts();
    if (typeof displayWelcome === 'function') displayWelcome();
    if (typeof updateQuoteSidebar === 'function') updateQuoteSidebar();

    // If this store still needs onboarding, show the modal
    if (!next.onboarding_complete) {
        document.getElementById('onboarding-modal')?.classList.remove('hidden');
    }
}
// ================== END MULTI-STORE ==================
let _quotesStoreFilter = 'all';   // 'all' or a customer id (string)
let _ordersStoreFilter = 'all';   // same for Order History
// ================== FREE SHIPPING HELPERS (customer portal) ==================
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

/**
 * Priority: PA ($250) → MD/NY/NJ/OH/WV ($650) → west ($2,000) → other east ($1,200)
 * Returns { free, threshold, remaining, reason }
 */
function evaluateFreeShipping(subtotal, locationText) {
    const amount = Number(subtotal) || 0;
    const loc = locationText || '';

    if (isPennsylvaniaLocation(loc)) {
        const threshold = 250;
        const free = amount >= threshold;
        return {
            free,
            threshold,
            remaining: Math.max(0, threshold - amount),
            reason: free
                ? 'Free shipping: $250+ in Pennsylvania'
                : 'Pennsylvania threshold: $250.00'
        };
    }

    if (isMidAtlantic650Location(loc)) {
        const threshold = 650;
        const free = amount >= threshold;
        return {
            free,
            threshold,
            remaining: Math.max(0, threshold - amount),
            reason: free
                ? 'Free shipping: $650+ (MD / NY / NJ / OH / WV)'
                : 'MD / NY / NJ / OH / WV threshold: $650.00'
        };
    }

    if (isWestOfMississippiLocation(loc)) {
        const threshold = 2000;
        const free = amount >= threshold;
        return {
            free,
            threshold,
            remaining: Math.max(0, threshold - amount),
            reason: free
                ? 'Free shipping: $2,000+ west of the Mississippi'
                : 'West of Mississippi threshold: $2,000.00'
        };
    }

    // Default: other east of Mississippi
    const threshold = 1200;
    const free = amount >= threshold;
    return {
        free,
        threshold,
        remaining: Math.max(0, threshold - amount),
        reason: free
            ? 'Free shipping: $1,200+ east of the Mississippi'
            : 'East of Mississippi threshold: $1,200.00'
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
        el.innerHTML =
            'Add a shipping address to see your free-shipping threshold. ' +
            'PA <strong>$250+</strong> · MD/NY/NJ/OH/WV <strong>$650+</strong> · ' +
            'other East <strong>$1,200+</strong> · West <strong>$2,000+</strong>.';
        return;
    }

    if (isPennsylvaniaLocation(loc)) {
        el.innerHTML =
            'Your location: <strong>Pennsylvania</strong>. Free shipping on orders of <strong>$250.00+</strong>.';
    } else if (isMidAtlantic650Location(loc)) {
        el.innerHTML =
            'Your region: <strong>MD / NY / NJ / OH / WV</strong>. Free shipping on orders of <strong>$650.00+</strong>.';
    } else if (isWestOfMississippiLocation(loc)) {
        el.innerHTML =
            'Your region: <strong>west of the Mississippi</strong>. Free shipping on orders of <strong>$2,000.00+</strong>.';
    } else {
        el.innerHTML =
            'Your region: <strong>east of the Mississippi</strong>. Free shipping on orders of <strong>$1,200.00+</strong>.';
    }
}
// ================== END FREE SHIPPING HELPERS ==================

// ================== MULTI-STORE (SHARED EMAIL) HELPERS ==================
window._customerAccounts = [];   // all customers that share the logged-in email

function getStoreLabel(c) {
    if (!c) return 'Store';
    const company = (c.company || c.name || '').trim();
    const addr = (c.shipping_address || c.billing_address || c.territory || '').trim();
    const shortAddr = addr ? addr.split(',')[0].trim() : '';
    if (company && shortAddr) return `${company} — ${shortAddr}`;
    if (company) return company;
    if (shortAddr) return shortAddr;
    return c.id ? `Store ${String(c.id).slice(0, 8)}` : 'Store';
}

function setActiveCustomer(id) {
    const accounts = window._customerAccounts || [];
    const found = accounts.find(c => String(c.id) === String(id));
    if (!found) return;

    window._currentCustomer = found;
    localStorage.setItem('activeCustomerId', String(found.id));

    // Refresh anything that depends on the active store
    if (typeof updateShippingPolicyCard === 'function') updateShippingPolicyCard();
    if (typeof renderPortalProducts === 'function') renderPortalProducts();
    if (typeof updateOrderingAsIndicator === 'function') updateOrderingAsIndicator();
    if (typeof updateQuoteSidebar === 'function') updateQuoteSidebar();
}

function updateOrderingAsIndicator() {
    // Remove any existing chip
    document.getElementById('ordering-as-chip')?.remove();

    const accounts = window._customerAccounts || [];
    if (accounts.length <= 1) return;          // single-store → no chip

    const active = window._currentCustomer;
    if (!active) return;

    const label = getStoreLabel(active);

    // Prefer placing under the welcome name
    const welcome = document.getElementById('welcome-name');
    if (welcome && welcome.parentElement) {
        const chip = document.createElement('div');
        chip.id = 'ordering-as-chip';
        chip.className = 'text-xs text-[#6B4423] mt-0.5';
        chip.innerHTML = `Ordering as: <strong class="text-[#1E4D2B]">${escapeHtml(label)}</strong>
            <button type="button" onclick="document.querySelector('.sidebar-link[data-target=\\'section-account\\']')?.click()"
                    class="ml-1 underline hover:text-[#1E4D2B]">Change</button>`;
        welcome.parentElement.appendChild(chip);
    }
}
// ================== END MULTI-STORE HELPERS ==================
function buildStoreTabs(section, currentFilter, onSelect) {
    const accounts = window._customerAccounts || [];
    if (accounts.length <= 1) return '';   // single-store → no tabs

    const tabs = [
        { id: 'all', label: 'All Stores' },
        ...accounts.map(c => ({ id: String(c.id), label: getStoreLabel(c) }))
    ];

    return `
        <div class="flex flex-wrap gap-2 mb-5 border-b border-[#d4b78f] pb-3">
            ${tabs.map(t => {
                const active = String(currentFilter) === String(t.id);
                return `
                    <button type="button"
                            onclick="${onSelect}('${t.id}')"
                            class="px-3 py-1.5 text-sm font-semibold rounded-xl border-2 transition
                                   ${active
                                       ? 'bg-[#1E4D2B] text-[#d4b78f] border-[#1E4D2B]'
                                       : 'bg-white text-[#6B4423] border-[#6B4423] hover:bg-[#f8f4eb]'}">
                        ${escapeHtml(t.label)}
                    </button>`;
            }).join('')}
        </div>
    `;
}

// ================== INACTIVE SOFT RESTRICTION ==================
function isCustomerInactive(c) {
    return !!c && String(c.status || '').toLowerCase() === 'inactive';
}

function applyInactiveSoftRestriction() {
    window._customerIsInactive = true;

    // Banner
    let banner = document.getElementById('inactive-restriction-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'inactive-restriction-banner';
        banner.className = 'w-full bg-amber-50 border-b-2 border-amber-500 text-amber-900 px-4 py-3 text-sm font-medium flex items-start gap-3 z-40';
        banner.innerHTML = `
            <i class="fas fa-exclamation-triangle text-amber-600 text-lg flex-shrink-0 mt-0.5"></i>
            <div>
                <strong>Account restricted.</strong>
                This store is currently marked Inactive. You can view Account details and Order History only.
                Contact your salesman or Donegal Natural to reactivate ordering.
            </div>
        `;
        const nav = document.querySelector('nav.sticky');
        if (nav && nav.parentNode) {
            nav.parentNode.insertBefore(banner, nav.nextSibling);
        } else {
            document.body.prepend(banner);
        }
    }
    banner.style.display = 'flex';

    // Hide Products + Quotes nav (desktop sidebar + mobile)
    document.querySelectorAll(
        '.sidebar-link[data-target="section-products"], .sidebar-link[data-target="section-quotes"]'
    ).forEach(el => {
        el.style.display = 'none';
    });

    // Hide quote sidebar completely
    const qs = document.getElementById('quote-sidebar');
    if (qs) {
        qs.classList.add('hidden');
        qs.classList.remove('flex');
        qs.style.display = 'none';
    }

    // Force Account section
    document.querySelectorAll('.portal-section').forEach(s => {
        s.style.display = 'none';
    });
    const accountSec = document.getElementById('section-account');
    if (accountSec) accountSec.style.display = 'block';

    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    const accountLink = document.querySelector('.sidebar-link[data-target="section-account"]');
    if (accountLink) {
        accountLink.classList.add('active');
        accountLink.style.display = ''; // ensure visible
    }

    if (typeof showAccountInfo === 'function') showAccountInfo();
}

function clearInactiveSoftRestriction() {
    window._customerIsInactive = false;

    const banner = document.getElementById('inactive-restriction-banner');
    if (banner) banner.style.display = 'none';

    // Phase 1: restore Products only — Quotes nav stays hidden
    document.querySelectorAll(
        '.sidebar-link[data-target="section-products"]'
    ).forEach(el => {
        el.style.display = '';
    });
    document.querySelectorAll(
        '.sidebar-link[data-target="section-quotes"]'
    ).forEach(el => {
        el.style.display = 'none';
    });

    const qs = document.getElementById('quote-sidebar');
    if (qs) {
        qs.style.display = '';
        // Desktop restores via CSS; mobile stays hidden until user opens it
        if (window.innerWidth >= 1024) {
            qs.classList.remove('hidden');
        }
    }
}
// ================== END INACTIVE SOFT RESTRICTION ==================

function getStoreBadgeForOrder(order) {
    const accounts = window._customerAccounts || [];
    if (accounts.length <= 1) return '';
    const match = accounts.find(c =>
        String(c.id) === String(order.customer_id) ||
        (c.company && order.customer_company && c.company.toLowerCase() === order.customer_company.toLowerCase())
    );
    if (!match) return '';
    return `<span class="inline-block ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-[#e8d9c2] text-[#1E4D2B]">${getStoreLabel(match)}</span>`;
}
// ================== MAIN CATEGORIES ==================
const MAIN_CATEGORIES = [
    "All",
    "Bully Sticks",
    "Jerky",
    "Ears",
    "Cow Cheeks",
    "Ox Tails",
    "Rabbit",
    "Duck and Goose",
    "Beef",
    "Buffalo",
    "Deer (Venison)",
    "Elk",
    "Chicken and Turkey",
    "Feet",
    "Horns",
    "Hooves",
    "Braided",
    "Large Meaty Femur/Bone/Knuckles",
    "Pressed Bones",
    "Twisty Q’s and Natural Munchy Sticks",
    "Supreme Hide Chips",
    "Retrievers",
    "Packaged Items"
];

const WHOLESALE_BROWSE_TREE = {
    "Bully Sticks": {
        "Green Line": [
            "6” Thin Green Line Bully Sticks (Bulk)",
            "12” Thin Green Line Bully Sticks (Bulk)",
            "6” Regular Green Line Bully Sticks (Bulk)",
            "12” Regular Green Line Bully Sticks (Bulk)",
            "6” “Thick” Green Line Bully Sticks (Bulk)",
            "12” “Thick” Green Line Bully Sticks (Bulk)",
            "6” “Super Thick” Green Line Bully Sticks (Bulk)",
            "12” “Super Thick” Green Line Bully Sticks (Bulk)"
        ],
        "Canes": ["24-28” Bully Cane", "32-36” Bully Cane"],
        "Braided Bully": [
            "6” Braided Bully Sticks (Bulk)",
            "12” Braided Bully Sticks (Bulk)",
            "6” “Super” Braided Bully Sticks (Bulk)",
            "12” “Super” Braided Bully Sticks (Bulk)"
        ],
        "Euro Bully": [
            "6” Euro Bully Stick (Bulk)",
            "6” Euro Bully Stick (Display)",
            "12” Euro Bully Stick (Bulk)",
            "12” Euro Bully Sticks (Display)"
        ],
        "Bully Pieces": [
            "8oz. Bag of Bully Pieces",
            "10oz. Bag of Bully Pieces",
            "16oz. Bag of Bully Pieces"
        ]
    },
    "Jerky": {
        "Jerky Stick Treats": [
            "USA Beef Jerky Treats (Bulk)",
            "USA Beef Jerky Treats (Display)",
            "USA Turkey Jerky Treats (Bulk)",
            "USA Turkey Jerky Treats (Display)",
            "USA Chicken Jerky Treats (Bulk)",
            "USA Chicken Jerky Treats (Display)",
            "USA Elky Jerky Treats (Bulk)",
            "USA Elky Jerky Treats (Display)",
            "USA Venison & Sweet Potato Jerky Treats (Bulk)",
            "USA Venison & Sweet Potato Jerky Treats (Display)"
        ],
        "Training Treats": [
            "6oz. Bags of USA Elky Training Treats",
            "10oz. Bags of USA Elky Training Treats",
            "16oz. Bags of USA Elky Training Treats",
            "USA Elky Training Treats (per lb.)"
        ],
        "Jerky Stuffed Bones": [
            "Large Turkey Jerky Stuffed Buffalo Bone",
            "Large Elky Jerky Stuffed Buffalo Bone",
            "Large Venison and Sweet Potato Stuffed Buffalo Bone"
        ]
    },
    "Ears": {
        "Natural/Flavored Cow Ears": [
            "Natural Cow Ears (Bulk)",
            "Vanilla Cow Ears (Bulk)",
            "Honey Smoked Cow Ears (Bulk)"
        ],
        "Hairy Beef Ears": ["Hairy Beef Ears (Bulk)"],
        "Buffalo Ears": [
            "MAGNA Buffalo Ears (Bulk)",
            "Honey Smoked MAGNA Buffalo Ears (Bulk)"
        ],
        "Pig Ears": ["Polish Pig Ears (Bulk)"],
        "Lamb Ears": ["White Lamb Ears (Bulk)", "Vanilla Lamb Ears (Bulk)"],
        "Fuzzy Rabbit Ears": ["Fuzzy Rabbit Ears (Bulk)", "10-Pack Fuzzy Rabbit Ears"],
        "Packaged Ears": [
            "6-Pack Natural Cow Ears",
            "6-Pack Vanilla Cow Ears",
            "6-Pack Honey Smoked Cow Ears",
            "5-Pack Hairy Beef Ears",
            "10-Pack Fuzzy Rabbit Ears"
        ]
    },
    "Cow Cheeks": {
        "All Natural Rollio": ["5-6” Natural Rollio (Bulk)", "10-12” Natural Rollio (Bulk)"],
        "Natural/Flavored Rollios": [
            "5-6” Regular Rollio (Bulk)",
            "10-12” Regular Rollio (Bulk)",
            "5-6” Vanilla Rollio (Bulk)",
            "10-12” Vanilla Rollio (Bulk)",
            "5-6” Honey Smoked Rollio (Bulk)",
            "10-12” Honey Smoked Rollio (Bulk)"
        ],
        "PHAT Rollios": [
            "5-6” PHAT Rollio (Bulk)",
            "10-12” PHAT Rollio (Bulk)",
            "5-6” Vanilla PHAT Rollio (Bulk)",
            "10-12” Vanilla PHAT Rollio (Bulk)",
            "5-6” Honey Smoked PHAT Rollio (Bulk)",
            "10-12” Honey Smoked PHAT Rollio (Bulk)"
        ],
        "Peanut Butter Rollios": [
            "5-6” Peanut Butter Rollio (Bulk)",
            "10-12” Peanut Butter Rollio (Bulk)"
        ],
        "Cow Cheek Slabs": [
            "5-6” Cow Cheek Slab (Bulk per lb.)",
            "5-6” Vanilla Cow Cheek Slab (Bulk per lb.)",
            "10-12” Cow Cheek Slab (Bulk per lb.)",
            "10-12” Vanilla Cow Cheek Slab (Bulk per lb.)",
            "10-12” Natural Cow Cheek Slabs (Bulk per lb.)"
        ],
        "Chunky Cheeks": [
            "White Chunky Cheeks (Bulk)",
            "Vanilla Chunky Cheeks (Bulk)",
            "8oz. Bags of White Chunky Cheeks",
            "8oz. Bags of Vanilla Chunky Cheeks",
            "16oz. Bags of White Chunky Cheeks",
            "16oz. Bags of Vanilla Chunky Cheeks"
        ]
    },
    "Ox Tails": {
        "MAGNA Ox Tails": [
            "6” MAGNA Natural Ox Tails (Bulk)",
            "12” MAGNA Natural Ox Tails (Bulk)"
        ],
        "Ox Tails": [
            "6” White Ox Tails (Bulk)",
            "12” White Ox Tails (Bulk)",
            "6” Vanilla Ox Tails (Bulk)",
            "12” Vanilla Ox Tails (Bulk)",
            "6” Honey Smoked Ox Tails (Bulk)",
            "12” Honey Smoked Ox Tails (Bulk)"
        ]
    },
    "Rabbit": {
        "Fuzzy Rabbit Ears": ["Fuzzy Rabbit Ears (Bulk)", "10-Pack Fuzzy Rabbit Ears"],
        "Fuzzy Rabbit Feet": ["Fuzzy Rabbit Feet (Bulk)", "10-Pack Fuzzy Rabbit Feet"]
    },
    "Duck and Goose": {
        "Duck Neck": ["Crunchy Baked Duck Necks (Bulk)", "10-Pack of Crunchy Duck Necks"],
        "Duck Heads": [
            "Crunchy Baked Duck Heads (Bulk)",
            "5-Pack of Crunchy Duck Heads",
            "10-Pack of Duck Heads"
        ],
        "Duck Feet": ["Euro Duck Feet (Bulk)", "Euro Duck Feet (Display)", "10-Pack Euro Duck Feet"],
        "Goose Neck": ["Goose Neck (Bulk)", "10-Pack of Crunchy Goose Necks"],
        "Packaged Duck and Goose": [
            "5-Pack of Crunchy Duck Heads",
            "10-Pack of Duck Heads",
            "10-Pack Euro Duck Feet",
            "10-Pack of Crunchy Goose Necks"
        ]
    },
    "Beef": {
        "Beef Jerky Treats": ["USA Beef Jerky Treats (Bulk)"],
        "Hairy Beef Ears": ["Hairy Beef Ears (Bulk)"],
        "Super Meaty Beef Tendons": ["Super Meaty Beef Tendons (Bulk)"],
        "Paddywacks": ["6” Paddywack (Bulk)", "12” Paddywack (Bulk)"],
        "Corium Sticks": [
            "6” Corium Sticks (Bulk)",
            "12” Corium Sticks (Bulk)",
            "6” Beef Wrapped Corium Sticks (Bulk)",
            "12” Beef Wrapped Corium Sticks (Bulk)"
        ],
        "Beef Lung": ["8oz. Bag of Beef Lung", "16oz. Bag of Beef Lung"],
        "Trachea and Trachea Pieces": [
            "5-6” Beef Trachea",
            "10-13” Beef Trachea",
            "8oz. Bags of Beef Trachea Pieces",
            "16oz. Bags of Beef Trachea Pieces"
        ],
        "Packaged": [
            "8oz. Bags of Beef Trachea Pieces",
            "16oz. Bags of Beef Trachea Pieces",
            "8oz. Bag of Beef Lung",
            "16oz. Bag of Beef Lung",
            "5-Pack Hairy Beef Ears"
        ]
    },
    "Buffalo": {
        "Buffalo Ears": [
            "MAGNA Buffalo Ears (Bulk)",
            "Honey Smoked MAGNA Buffalo Ears (Bulk)"
        ],
        "Buffalo Bone and Knuckle": [
            "Reg Large Meaty Buffalo Bone",
            "Small Meaty Buffalo Knuckle"
        ],
        "Stuffed Buffalo Bones": [
            "Large Turkey Jerky Stuffed Buffalo Bone",
            "Large Elky Jerky Stuffed Buffalo Bone",
            "Large Venison and Sweet Potato Stuffed Buffalo Bone",
            "Large Peanut Butter Stuffed Buffalo Bone"
        ],
        "Buffalo Horns": [
            "Large Buffalo Horn (Bulk)",
            "Medium Buffalo Horn (Bulk)",
            "Small Buffalo Horn (Bulk)"
        ],
        "Buffalo Collagen": ["6” Buffalo Collagen Sticks"]
    },
    "Deer (Venison)": {
        "": [
            "USA Venison & Sweet Potato Jerky Treats (Bulk)",
            "USA Venison & Sweet Potato Jerky Treats (Display)",
            "Large Venison and Sweet Potato Stuffed Buffalo Bone",
            "Deer Skin Chips (Bulk)"
        ]
    },
    "Elk": {
        "": [
            "USA Elky Jerky Treats (Bulk)",
            "USA Elky Jerky Treats (Display)",
            "6oz. Bags of USA Elky Training Treats",
            "10oz. Bags of USA Elky Training Treats",
            "16oz. Bags of USA Elky Training Treats",
            "USA Elky Training Treats (per lb.)"
        ]
    },
    "Chicken and Turkey": {
        "Chicken": [
            "Crunchy Euro Chicken Feet (Bulk)",
            "Euro White Chicken Feet (Bulk)",
            "Vanilla Flavored White Euro Chicken Feet (Bulk)",
            "10-Pack Euro Chicken Feet",
            "10-Pack White Euro Chicken Feet",
            "10-Pack Vanilla Euro Chicken Feet",
            "USA Chicken Jerky Treats (Bulk)",
            "USA Chicken Jerky Treats (Display)"
        ],
        "Turkey": [
            "USA Turkey Jerky Treats (Bulk)",
            "USA Turkey Jerky Treats (Display)",
            "Large Turkey Jerky Stuffed Buffalo Bone"
        ]
    },
    "Feet": {
        "Chicken Feet": [
            "Crunchy Euro Chicken Feet (Bulk)",
            "Euro White Chicken Feet (Bulk)",
            "Vanilla Flavored White Euro Chicken Feet (Bulk)",
            "10-Pack Euro Chicken Feet",
            "10-Pack White Euro Chicken Feet",
            "10-Pack Vanilla Euro Chicken Feet"
        ],
        "Duck Feet": ["Euro Duck Feet (Bulk)", "Euro Duck Feet (Display)", "10-Pack Euro Duck Feet"],
        "Fuzzy Rabbit Feet": ["Fuzzy Rabbit Feet (Bulk)", "10-Pack Fuzzy Rabbit Feet"],
        "Packaged Feet": [
            "10-Pack Euro Chicken Feet",
            "10-Pack White Euro Chicken Feet",
            "10-Pack Vanilla Euro Chicken Feet",
            "10-Pack Euro Duck Feet",
            "10-Pack Fuzzy Rabbit Feet"
        ]
    },
    "Horns": {
        "Rams Horn": ["Large Rams Horn (Bulk)", "Medium Rams Horn (Bulk)", "Small Rams Horn (Bulk)"],
        "Buffalo Horn": ["Large Buffalo Horn (Bulk)", "Medium Buffalo Horn (Bulk)", "Small Buffalo Horn (Bulk)"]
    },
    "Hooves": {
        "": ["Regular Cow Hooves (Bulk)", "Smoked Cow Hooves (Bulk)", "“Super” Cow Hooves (Bulk)"]
    },
    "Braided": {
        "Braided Bully Sticks": [
            "6” Braided Bully Sticks (Bulk)",
            "12” Braided Bully Sticks (Bulk)",
            "6” “Super” Braided Bully Sticks (Bulk)",
            "12” “Super” Braided Bully Sticks (Bulk)"
        ],
        "Braided Esophagus": [
            "6” Braided Esophagus (Bulk)",
            "12” Braided Esophagus (Bulk)",
            "6” Braided Esophagus (Display)",
            "12” Braided Esophagus (Display)"
        ],
        "Supreme USA Hide Braided Donuts": [
            "5-7” Braided USA Hide Donuts (Bulk)",
            "5-7” Vanilla USA Hide Braided Donuts (Bulk)",
            "8-9” Braided USA Hide Donuts (Bulk)",
            "8-9” Vanilla USA Hide Braided Donuts (Bulk)",
            "10-11” Braided USA Hide Donuts (Bulk)",
            "10-11” Vanilla USA Hide Braided Donuts (Bulk)"
        ]
    },
    "Large Meaty Femur/Bone/Knuckles": {
        "Large Buffalo Bone": ["Reg Large Meaty Buffalo Bone"],
        "Buffalo Knuckle": ["Small Meaty Buffalo Knuckle"],
        "Stuffed Buffalo Bone": [
            "Large Turkey Jerky Stuffed Buffalo Bone",
            "Large Elky Jerky Stuffed Buffalo Bone",
            "Large Venison and Sweet Potato Stuffed Buffalo Bone",
            "Large Peanut Butter Stuffed Buffalo Bone"
        ],
        "Jumbo Meaty Femur": ["14-16” Jumbo Meaty Femur Knuckle Bone"]
    },
    "Pressed Bones": {
        "Supreme Pressed Ring": ["6” Supreme Pressed Ring (Bulk)"],
        "Supreme Pressed Stick": ["10” x 20mm Supreme Pressed Stick (Bulk)"],
        "Supreme Pressed Bones": [
            "4.5” Pressed Bone (Bulk)",
            "6.5” Pressed Bone (Bulk)",
            "8.5” Pressed Bone (Bulk)",
            "10.5” Pressed Bone (Bulk)",
            "12.5” Pressed Bone (Bulk)"
        ]
    },
    "Twisty Q’s and Natural Munchy Sticks": {
        "Munch Sticks": [
            "12” x 20mm Natural Munchy Sticks (Bulk)",
            "5” x 10mm Natural Munchy Sticks (Bulk)",
            "6.5” Bacon Munchy Sticks (Bulk)"
        ],
        "Twisty Q’s": ["10” White Twisty Q’s (Bulk)", "10” Vanilla Twisty Q’s (Bulk)"],
        "Twisty’s": [
            "5” x 4/6mm White Twisty-100/inner (Bulk)",
            "5” x 9/10mm White Twisty-50/inner (Bulk)",
            "10” x 9/10mm White Twisty (Bulk)"
        ]
    },
    "Supreme Hide Chips": {
        "Supreme USA Hide Chips": [
            "White USA Supreme Hide Chips (Bulk per lb.)",
            "Vanilla USA Supreme Chips (Bulk per lb.)",
            "Peanut Butter Basted USA Supreme Hide Chips (Bulk per lb.)",
            "8oz. Bags of White Supreme Chips (Binkey’s)"
        ],
        "Binky’s": [
            "8oz. Bags of Peanut Butter Supreme Chips (Binkey’s)",
            "8oz. Bags of Vanilla Supreme Chips (Binkey’s)",
            "16oz. Bags of White Supreme Chips (Binkey’s)",
            "16oz. Bags of Peanut Butter Supreme Chips (Binkey’s)",
            "16oz. Bags of Vanilla Supreme Chips (Binkey’s)"
        ]
    },
    "Retrievers": {
        "USA White Hide Retriever": [
            "6/9” White Supreme Retriever (Bulk)",
            "10-11” x 30mm White Supreme Retriever (Bulk)"
        ],
        "Vanilla Flavored Retriever": [
            "6/9” Vanilla Supreme Retriever (Bulk)",
            "10-11” x 30mm Vanilla MAGNA Retriever (Bulk)"
        ]
    },
    "Packaged Items": {
        "Duck and Goose": [
            "5-Pack of Crunchy Duck Heads",
            "10-Pack of Crunchy Duck Necks",
            "10-Pack of Crunchy Goose Necks",
            "10-Pack Euro Duck Feet",
            "10-Pack of Duck Heads"
        ],
        "Ears": [
            "6-Pack Natural Cow Ears",
            "6-Pack Vanilla Cow Ears",
            "6-Pack Honey Smoked Cow Ears",
            "10-Pack Fuzzy Rabbit Ears",
            "5-Pack Hairy Beef Ears"
        ],
        "Feet": [
            "10-Pack Fuzzy Rabbit Feet",
            "10-Pack Euro Chicken Feet",
            "10-Pack White Euro Chicken Feet",
            "10-Pack Vanilla Euro Chicken Feet"
        ],
        "Chunky Cheeks": [
            "8oz. Bags of White Chunky Cheeks",
            "8oz. Bags of Vanilla Chunky Cheeks",
            "16oz. Bags of White Chunky Cheeks",
            "16oz. Bags of Vanilla Chunky Cheeks"
        ],
        "Beef Lung": ["8oz. Bag of Beef Lung", "16oz. Bag of Beef Lung"],
        "Bully Pieces": [
            "8oz. Bag of Bully Pieces",
            "10oz. Bag of Bully Pieces",
            "16oz. Bag of Bully Pieces"
        ],
        "Jerky": [
            "6oz. Bags of USA Elky Training Treats",
            "10oz. Bags of USA Elky Training Treats",
            "16oz. Bags of USA Elky Training Treats",
            "USA Elky Training Treats (per lb.)"
        ],
        "Trachea Pieces": ["8oz. Bags of Beef Trachea Pieces", "16oz. Bags of Beef Trachea Pieces"],
        "Binky’s": [
            "8oz. Bags of White Supreme Chips (Binkey’s)",
            "8oz. Bags of Peanut Butter Supreme Chips (Binkey’s)",
            "8oz. Bags of Vanilla Supreme Chips (Binkey’s)",
            "16oz. Bags of White Supreme Chips (Binkey’s)",
            "16oz. Bags of Peanut Butter Supreme Chips (Binkey’s)",
            "16oz. Bags of Vanilla Supreme Chips (Binkey’s)"
        ]
    }
};


// ================== WHOLESALE PRICES (Full Structure with Duplication) ==================
let WHOLESALE_PRICES = [
    // ================== BULLY STICKS ==================
    { category: "Bully Sticks", subCategory: "Green Line", name: "6” Thin Green Line Bully Sticks (Bulk)", cs: "1000/cs", price: "$0.54" },
    { category: "Bully Sticks", subCategory: "Green Line", name: "12” Thin Green Line Bully Sticks (Bulk)", cs: "500/cs", price: "$1.10" },
    { category: "Bully Sticks", subCategory: "Green Line", name: "6” Regular Green Line Bully Sticks (Bulk)", cs: "800/cs", price: "$1.53" },
    { category: "Bully Sticks", subCategory: "Green Line", name: "12” Regular Green Line Bully Sticks (Bulk)", cs: "400/cs", price: "$2.87" },
    { category: "Bully Sticks", subCategory: "Green Line", name: "6” “Thick” Green Line Bully Sticks (Bulk)", cs: "600/cs", price: "$1.79" },
    { category: "Bully Sticks", subCategory: "Green Line", name: "12” “Thick” Green Line Bully Sticks (Bulk)", cs: "300/cs", price: "$3.58" },
    { category: "Bully Sticks", subCategory: "Green Line", name: "6” “Super Thick” Green Line Bully Sticks (Bulk)", cs: "500/cs", price: "$2.51" },
    { category: "Bully Sticks", subCategory: "Green Line", name: "12” “Super Thick” Green Line Bully Sticks (Bulk)", cs: "250/cs", price: "$4.99" },

    { category: "Bully Sticks", subCategory: "Canes", name: "24-28” Bully Cane", cs: "50/cs", price: "$9.95" },
    { category: "Bully Sticks", subCategory: "Canes", name: "32-36” Bully Cane", cs: "50/cs", price: "$11.40" },

    { category: "Bully Sticks", subCategory: "Braided Bully", name: "6” Braided Bully Sticks (Bulk)", cs: "100/cs", price: "$3.10" },
    { category: "Bully Sticks", subCategory: "Braided Bully", name: "12” Braided Bully Sticks (Bulk)", cs: "50/cs", price: "$6.11" },
    { category: "Bully Sticks", subCategory: "Braided Bully", name: "6” “Super” Braided Bully Sticks (Bulk)", cs: "75/cs", price: "$4.31" },
    { category: "Bully Sticks", subCategory: "Braided Bully", name: "12” “Super” Braided Bully Sticks (Bulk)", cs: "35/cs", price: "$7.91" },

    { category: "Bully Sticks", subCategory: "Euro Bully", name: "6” Euro Bully Stick (Bulk)", cs: "300/cs", price: "$2.15" },
    { category: "Bully Sticks", subCategory: "Euro Bully", name: "6” Euro Bully Stick (Display)", cs: "70/display", price: "$2.19" },
    { category: "Bully Sticks", subCategory: "Euro Bully", name: "12” Euro Bully Stick (Bulk)", cs: "300/cs", price: "$4.42" },
    { category: "Bully Sticks", subCategory: "Euro Bully", name: "12” Euro Bully Sticks (Display)", cs: "70/display", price: "$4.54" },

    { category: "Bully Sticks", subCategory: "Bully Pieces", name: "8oz. Bag of Bully Pieces", cs: "70bags/cs", price: "$6.59" },
    { category: "Bully Sticks", subCategory: "Bully Pieces", name: "10oz. Bag of Bully Pieces", cs: "50bags/cs", price: "$10.07" },
    { category: "Bully Sticks", subCategory: "Bully Pieces", name: "16oz. Bag of Bully Pieces", cs: "35bags/cs", price: "$12.30" },

    // ================== JERKY ==================
    { category: "Jerky", subCategory: "Jerky Stick Treats", name: "USA Beef Jerky Treats (Bulk)", cs: "1000/cs", price: "$0.52" },
    { category: "Jerky", subCategory: "Jerky Stick Treats", name: "USA Beef Jerky Treats (Display)", cs: "250/display", price: "$0.53" },
    { category: "Jerky", subCategory: "Jerky Stick Treats", name: "USA Turkey Jerky Treats (Bulk)", cs: "1200/cs", price: "$0.57" },
    { category: "Jerky", subCategory: "Jerky Stick Treats", name: "USA Turkey Jerky Treats (Display)", cs: "250/display", price: "$0.59" },
    { category: "Jerky", subCategory: "Jerky Stick Treats", name: "USA Chicken Jerky Treats (Bulk)", cs: "1200/cs", price: "$0.59" },
    { category: "Jerky", subCategory: "Jerky Stick Treats", name: "USA Chicken Jerky Treats (Display)", cs: "250/display", price: "$0.58" },
    { category: "Jerky", subCategory: "Jerky Stick Treats", name: "USA Elky Jerky Treats (Bulk)", cs: "1000/cs", price: "$0.59" },
    { category: "Jerky", subCategory: "Jerky Stick Treats", name: "USA Elky Jerky Treats (Display)", cs: "250/display", price: "$0.60" },
    { category: "Jerky", subCategory: "Jerky Stick Treats", name: "USA Venison & Sweet Potato Jerky Treats (Bulk)", cs: "1000/cs", price: "$0.59" },
    { category: "Jerky", subCategory: "Jerky Stick Treats", name: "USA Venison & Sweet Potato Jerky Treats (Display)", cs: "250/display", price: "$0.61" },

    { category: "Jerky", subCategory: "Training Treats", name: "6oz. Bags of USA Elky Training Treats", cs: "50/cs", price: "$3.90" },
    { category: "Jerky", subCategory: "Training Treats", name: "10oz. Bags of USA Elky Training Treats", cs: "35/cs", price: "$7.91" },
    { category: "Jerky", subCategory: "Training Treats", name: "16oz. Bags of USA Elky Training Treats", cs: "20/cs", price: "$19.94" },
    { category: "Jerky", subCategory: "Training Treats", name: "USA Elky Training Treats (per lb.)", cs: "20lbs/cs", price: "$19.46" },

    // Jerky Stuffed Bones (duplicated in Buffalo & Large Meaty Bones)
    { category: "Jerky", subCategory: "Jerky Stuffed Bones", name: "Large Turkey Jerky Stuffed Buffalo Bone", cs: "50/cs", price: "$4.07" },
    { category: "Jerky", subCategory: "Jerky Stuffed Bones", name: "Large Elky Jerky Stuffed Buffalo Bone", cs: "50/cs", price: "$4.07" },
    { category: "Jerky", subCategory: "Jerky Stuffed Bones", name: "Large Venison and Sweet Potato Stuffed Buffalo Bone", cs: "50/cs", price: "$4.07" },

    // ================== EARS ==================
    { category: "Ears", subCategory: "Natural/Flavored Cow Ears", name: "Natural Cow Ears (Bulk)", cs: "150/cs", price: "$1.04" },
    { category: "Ears", subCategory: "Natural/Flavored Cow Ears", name: "Vanilla Cow Ears (Bulk)", cs: "150/cs", price: "$1.13" },
    { category: "Ears", subCategory: "Natural/Flavored Cow Ears", name: "Honey Smoked Cow Ears (Bulk)", cs: "150/cs", price: "$1.19" },
    { category: "Ears", subCategory: "Hairy Beef Ears", name: "Hairy Beef Ears (Bulk)", cs: "80/cs", price: "$1.31" },
    { category: "Ears", subCategory: "Buffalo Ears", name: "MAGNA Buffalo Ears (Bulk)", cs: "100/cs", price: "$1.07" },
    { category: "Ears", subCategory: "Buffalo Ears", name: "Honey Smoked MAGNA Buffalo Ears (Bulk)", cs: "100/cs", price: "$1.19" },
    { category: "Ears", subCategory: "Pig Ears", name: "Polish Pig Ears (Bulk)", cs: "100/cs", price: "Market Price" },
    { category: "Ears", subCategory: "Lamb Ears", name: "White Lamb Ears (Bulk)", cs: "400/cs", price: "$0.44" },
    { category: "Ears", subCategory: "Lamb Ears", name: "Vanilla Lamb Ears (Bulk)", cs: "400/cs", price: "$0.52" },
    { category: "Ears", subCategory: "Fuzzy Rabbit Ears", name: "Fuzzy Rabbit Ears (Bulk)", cs: "500/cs", price: "$0.37" },
    { category: "Ears", subCategory: "Fuzzy Rabbit Ears", name: "10-Pack of Fuzzy Rabbit Ears", cs: "60bags/cs", price: "$4.45" },
    { category: "Ears", subCategory: "Packaged Ears", name: "6-Pack, Natural Cow Ears", cs: "24bags/cs", price: "$7.13" },
    { category: "Ears", subCategory: "Packaged Ears", name: "6-Pack, Vanilla Cow Ears", cs: "24bags/cs", price: "$7.13" },
    { category: "Ears", subCategory: "Packaged Ears", name: "6-Pack, Honey Smoked Cow Ears", cs: "24bags/cs", price: "$7.13" },
    { category: "Ears", subCategory: "Packaged Ears", name: "5-Pack Hairy Beef Ears", cs: "50bags/cs", price: "$7.19" },
    { category: "Ears", subCategory: "Packaged Ears", name: "10-Pack of Fuzzy Rabbit Ears", cs: "60bags/cs", price: "$4.45" },

    // ================== COW CHEEKS ==================
    { category: "Cow Cheeks", subCategory: "All Natural Rollio", name: "5-6” Natural Rollio (Bulk)", cs: "100/cs", price: "$1.91" },
    { category: "Cow Cheeks", subCategory: "All Natural Rollio", name: "10-12” Natural Rollio (Bulk)", cs: "50/cs", price: "$3.59" },
    { category: "Cow Cheeks", subCategory: "Natural/Flavored Rollios", name: "5-6” Regular Rollio (Bulk)", cs: "100/cs", price: "$2.10" },
    { category: "Cow Cheeks", subCategory: "Natural/Flavored Rollios", name: "10-12” Regular Rollio (Bulk)", cs: "50/cs", price: "$3.95" },
    { category: "Cow Cheeks", subCategory: "Natural/Flavored Rollios", name: "5-6” Vanilla Rollio (Bulk)", cs: "100/cs", price: "$2.23" },
    { category: "Cow Cheeks", subCategory: "Natural/Flavored Rollios", name: "10-12” Vanilla Rollio (Bulk)", cs: "50/cs", price: "$4.14" },
    { category: "Cow Cheeks", subCategory: "Natural/Flavored Rollios", name: "5-6” Honey Smoked Rollio (Bulk)", cs: "100/cs", price: "$2.32" },
    { category: "Cow Cheeks", subCategory: "Natural/Flavored Rollios", name: "10-12” Honey Smoked Rollio (Bulk)", cs: "50/cs", price: "$4.43" },
    { category: "Cow Cheeks", subCategory: "PHAT Rollios", name: "5-6” PHAT Rollio (Bulk)", cs: "100/cs", price: "$2.51" },
    { category: "Cow Cheeks", subCategory: "PHAT Rollios", name: "10-12” PHAT Rollio (Bulk)", cs: "50/cs", price: "$5.03" },
    { category: "Cow Cheeks", subCategory: "PHAT Rollios", name: "5-6” Vanilla PHAT Rollio (Bulk)", cs: "100/cs", price: "$2.51" },
    { category: "Cow Cheeks", subCategory: "PHAT Rollios", name: "10-12” Vanilla PHAT Rollio (Bulk)", cs: "50/cs", price: "$5.15" },
    { category: "Cow Cheeks", subCategory: "PHAT Rollios", name: "5-6” Honey Smoked PHAT Rollio (Bulk)", cs: "100/cs", price: "$2.63" },
    { category: "Cow Cheeks", subCategory: "PHAT Rollios", name: "10-12” Honey Smoked PHAT Rollio (Bulk)", cs: "50/cs", price: "$5.15" },
    { category: "Cow Cheeks", subCategory: "Peanut Butter Rollios", name: "5-6” Peanut Butter Rollio (Bulk)", cs: "100/cs", price: "$2.62" },
    { category: "Cow Cheeks", subCategory: "Peanut Butter Rollios", name: "10-12” Peanut Butter Rollio (Bulk)", cs: "50/cs", price: "$4.19" },
    { category: "Cow Cheeks", subCategory: "Cow Cheek Slabs", name: "5-6” Cow Cheek Slab (Bulk per lb.)", cs: "28lbs/cs", price: "$6.18/lb" },
    { category: "Cow Cheeks", subCategory: "Cow Cheek Slabs", name: "5-6” Vanilla Cow Cheek Slab (Bulk per lb.)", cs: "28lbs/cs", price: "$6.42/lb" },
    { category: "Cow Cheeks", subCategory: "Cow Cheek Slabs", name: "10-12” Cow Cheek Slab (Bulk per lb.)", cs: "28lbs/cs", price: "$6.18/lb" },
    { category: "Cow Cheeks", subCategory: "Cow Cheek Slabs", name: "10-12” Vanilla Cow Cheek Slab (Bulk per lb.)", cs: "28lbs/cs", price: "$6.42/lb" },
    { category: "Cow Cheeks", subCategory: "Cow Cheek Slabs", name: "10-12” Natural Cow Cheek Slabs (Bulk per lb.)", cs: "28lbs/cs", price: "$5.99/lb" },
    { category: "Cow Cheeks", subCategory: "Chunky Cheeks", name: "White Chunky Cheeks (Bulk)", cs: "22lbs/cs", price: "$5.93/lb" },
    { category: "Cow Cheeks", subCategory: "Chunky Cheeks", name: "Vanilla Chunky Cheeks (Bulk)", cs: "22lbs/cs", price: "$5.99/lb" },
    { category: "Cow Cheeks", subCategory: "Chunky Cheeks", name: "8oz. Bags of White Chunky Cheeks", cs: "24bags/cs", price: "$3.46" },
    { category: "Cow Cheeks", subCategory: "Chunky Cheeks", name: "8oz. Bags of Vanilla Chunky Cheeks", cs: "24bags/cs", price: "$3.46" },
    { category: "Cow Cheeks", subCategory: "Chunky Cheeks", name: "16oz. Bags of White Chunky Cheeks", cs: "12bags/cs", price: "$6.33" },
    { category: "Cow Cheeks", subCategory: "Chunky Cheeks", name: "16oz. Bags of Vanilla Chunky Cheeks", cs: "12bags/cs", price: "$6.33" },

    // ================== OX TAILS ==================
    { category: "Ox Tails", subCategory: "MAGNA Ox Tails", name: "6” MAGNA Natural Ox Tails (Bulk)", cs: "150/cs", price: "$2.02" },
    { category: "Ox Tails", subCategory: "MAGNA Ox Tails", name: "12” MAGNA Natural Ox Tails (Bulk)", cs: "75/cs", price: "$3.23" },
    { category: "Ox Tails", subCategory: "Ox Tails", name: "6” White Ox Tails (Bulk)", cs: "500/cs", price: "$0.95" },
    { category: "Ox Tails", subCategory: "Ox Tails", name: "12” White Ox Tails (Bulk)", cs: "250/cs", price: "$2.03" },
    { category: "Ox Tails", subCategory: "Ox Tails", name: "6” Vanilla Ox Tails (Bulk)", cs: "500/cs", price: "$1.19" },
    { category: "Ox Tails", subCategory: "Ox Tails", name: "12” Vanilla Ox Tails (Bulk)", cs: "250/cs", price: "$2.27" },
    { category: "Ox Tails", subCategory: "Ox Tails", name: "6” Honey Smoked Ox Tails (Bulk)", cs: "500/cs", price: "$1.19" },
    { category: "Ox Tails", subCategory: "Ox Tails", name: "12” Honey Smoked Ox Tails (Bulk)", cs: "250/cs", price: "$2.37" },

    // ================== RABBIT ==================
    { category: "Rabbit", subCategory: "Fuzzy Rabbit Ears", name: "Fuzzy Bunny Ears (Bulk)", cs: "500/cs", price: "$0.37" },
    { category: "Rabbit", subCategory: "Fuzzy Rabbit Ears", name: "10-Pack of Fuzzy Bunny Ears", cs: "60bags/cs", price: "$4.25" },
    { category: "Rabbit", subCategory: "Fuzzy Rabbit Feet", name: "Fuzzy Rabbit Feet (Bulk)", cs: "500/cs", price: "$0.45" },
    { category: "Rabbit", subCategory: "Fuzzy Rabbit Feet", name: "10-Pack of Fuzzy Rabbit Feet", cs: "60bags/cs", price: "$5.10" },

    // ================== DUCK AND GOOSE ==================
    { category: "Duck and Goose", subCategory: "Duck Neck", name: "Crunchy Baked Duck Necks (Bulk)", cs: "300/cs", price: "$0.83" },
    { category: "Duck and Goose", subCategory: "Duck Neck", name: "10-Pack of Crunchy Duck Necks", cs: "50bags/cs", price: "$8.99" },
    { category: "Duck and Goose", subCategory: "Duck Heads", name: "Crunchy Baked Duck Heads (Bulk)", cs: "300/cs", price: "$0.83" },
    { category: "Duck and Goose", subCategory: "Duck Heads", name: "5-Pack of Crunchy Duck Heads", cs: "75bags/cs", price: "$16.07" },
    { category: "Duck and Goose", subCategory: "Duck Heads", name: "10-Pack of Crunch Duck Heads", cs: "50bags/cs", price: "$7.91" },
    { category: "Duck and Goose", subCategory: "Duck Feet", name: "Euro Duck Feet (Bulk)", cs: "500/cs", price: "$0.78" },
    { category: "Duck and Goose", subCategory: "Duck Feet", name: "Euro Duck Feet (Display)", cs: "150/display", price: "$0.90" },
    { category: "Duck and Goose", subCategory: "Duck Feet", name: "10-Pack of Euro Duck Feet", cs: "50bags/cs", price: "$9.11" },
    { category: "Duck and Goose", subCategory: "Goose Neck", name: "Goose Neck (Bulk)", cs: "150/cs", price: "$1.79" },
    { category: "Duck and Goose", subCategory: "Goose Neck", name: "10-Pack of Crunchy Goose Necks", cs: "50bags/cs", price: "$17.99" },
    { category: "Duck and Goose", subCategory: "Packaged Duck and Goose", name: "5-Pack of Crunchy Duck Heads", cs: "75bags/cs", price: "$16.07" },
    { category: "Duck and Goose", subCategory: "Packaged Duck and Goose", name: "10-Pack of Crunch Duck Heads", cs: "50bags/cs", price: "$7.91" },
    { category: "Duck and Goose", subCategory: "Packaged Duck and Goose", name: "10-Pack of Euro Duck Feet", cs: "50bags/cs", price: "$9.11" },
    { category: "Duck and Goose", subCategory: "Packaged Duck and Goose", name: "10-Pack of Crunchy Goose Necks", cs: "50bags/cs", price: "$17.99" },

    // ================== BEEF ==================
    { category: "Beef", subCategory: "Beef Jerky Treats", name: "USA Beef Jerky Treats (Bulk)", cs: "1000/cs", price: "$0.52" },
    { category: "Beef", subCategory: "Hairy Beef Ears", name: "Hairy Beef Ears (Bulk)", cs: "80/cs", price: "$1.31" },
    { category: "Beef", subCategory: "Super Meaty Beef Tendons", name: "Super Meaty Beef Tendons (Bulk)", cs: "140/cs", price: "$2.03" },
    { category: "Beef", subCategory: "Paddywacks", name: "6” Paddywack (Bulk)", cs: "500/cs", price: "$0.65" },
    { category: "Beef", subCategory: "Paddywacks", name: "12” Paddywack (Bulk)", cs: "200/cs", price: "$1.32" },
    { category: "Beef", subCategory: "Corium Sticks", name: "6” Corium Sticks (Bulk)", cs: "400/cs", price: "$1.11" },
    { category: "Beef", subCategory: "Corium Sticks", name: "12” Corium Sticks (Bulk)", cs: "180/cs", price: "$2.16" },
    { category: "Beef", subCategory: "Corium Sticks", name: "6” Beef Wrapped Corium Sticks (Bulk)", cs: "200/cs", price: "$1.46" },
    { category: "Beef", subCategory: "Corium Sticks", name: "12” Beef Wrapped Corium Sticks (Bulk)", cs: "100/cs", price: "$2.88" },
    { category: "Beef", subCategory: "Beef Lung", name: "8oz. Bag of Beef Lung", cs: "50bags/cs", price: "$4.48" },
    { category: "Beef", subCategory: "Beef Lung", name: "16oz. Bag of Beef Lung", cs: "25bags/cs", price: "$8.70" },
    { category: "Beef", subCategory: "Trachea and Trachea Pieces", name: "5-6” Beef Trachea", cs: "60/cs", price: "$0.78" },
    { category: "Beef", subCategory: "Trachea and Trachea Pieces", name: "10-13” Beef Trachea", cs: "120/cs", price: "$1.79" },
    { category: "Beef", subCategory: "Trachea and Trachea Pieces", name: "8oz. Bags of Beef Trachea Pieces", cs: "24bags/cs", price: "$3.11" },
    { category: "Beef", subCategory: "Trachea and Trachea Pieces", name: "16oz. Bags of Beef Trachea Pieces", cs: "12/cs", price: "$5.99" },
    { category: "Beef", subCategory: "Packaged", name: "8oz. Bags of Beef Trachea Pieces", cs: "24bags/cs", price: "$3.11" },
    { category: "Beef", subCategory: "Packaged", name: "16oz. Bags of Beef Trachea Pieces", cs: "12/cs", price: "$5.99" },
    { category: "Beef", subCategory: "Packaged", name: "8oz. Bag of Beef Lung", cs: "50bags/cs", price: "$4.48" },
    { category: "Beef", subCategory: "Packaged", name: "16oz. Bag of Beef Lung", cs: "25bags/cs", price: "$8.70" },
    { category: "Beef", subCategory: "Packaged", name: "5-Pack of Hairy Beef Ears", cs: "50bags/cs", price: "$7.19" },

    // ================== BUFFALO ==================
    { category: "Buffalo", subCategory: "Buffalo Ears", name: "MAGNA Buffalo Ears (Bulk)", cs: "100/cs", price: "$1.07" },
    { category: "Buffalo", subCategory: "Buffalo Ears", name: "Honey Smoked MAGNA Buffalo Ears (Bulk)", cs: "100/cs", price: "$1.19" },
    { category: "Buffalo", subCategory: "Buffalo Bone and Knuckle", name: "Reg Large Meaty Buffalo Bone", cs: "50/cs", price: "$2.63" },
    { category: "Buffalo", subCategory: "Buffalo Bone and Knuckle", name: "Small Meaty Buffalo Knuckle", cs: "100/cs", price: "$0.42" },

    // Stuffed Buffalo Bones (duplicated)
    { category: "Buffalo", subCategory: "Stuffed Buffalo Bones", name: "Large Turkey Jerky Stuffed Buffalo Bone", cs: "50/cs", price: "$4.07" },
    { category: "Buffalo", subCategory: "Stuffed Buffalo Bones", name: "Large Elky Jerky Stuffed Buffalo Bone", cs: "50/cs", price: "$4.07" },
    { category: "Buffalo", subCategory: "Stuffed Buffalo Bones", name: "Large Venison and Sweet Potato Stuffed Buffalo Bone", cs: "50/cs", price: "$4.07" },
    { category: "Buffalo", subCategory: "Stuffed Buffalo Bones", name: "Large Peanut Butter Stuffed Buffalo Bone", cs: "50/cs", price: "$4.07" },

    { category: "Buffalo", subCategory: "Buffalo Horns", name: "Large Buffalo Horn (Bulk)", cs: "35/cs", price: "$5.14" },
    { category: "Buffalo", subCategory: "Buffalo Horns", name: "Medium Buffalo Horn (Bulk)", cs: "50/cs", price: "$3.42" },
    { category: "Buffalo", subCategory: "Buffalo Horns", name: "Small Buffalo Horn (Bulk)", cs: "100/cs", price: "$1.98" },
    { category: "Buffalo", subCategory: "Buffalo Collagen", name: "6” Buffalo Collagen Sticks", cs: "200/cs", price: "$0.95" },

    // ================== DEER (VENISON) ==================
    { category: "Deer (Venison)", subCategory: "", name: "USA Venison & Sweet Potato Jerky Treats (Bulk)", cs: "1000/cs", price: "$0.59" },
    { category: "Deer (Venison)", subCategory: "", name: "USA Venison & Sweet Potato Jerky Treats (Display)", cs: "250/display", price: "$0.61" },
    { category: "Deer (Venison)", subCategory: "", name: "Large Venison and Sweet Potato Stuffed Buffalo Bone", cs: "50/cs", price: "$4.07" },
    { category: "Deer (Venison)", subCategory: "", name: "Deer Skin Chips (Bulk)", cs: "500/cs", price: "$0.79" },

    // ================== ELK ==================
    { category: "Elk", subCategory: "", name: "USA Elky Jerky Treats (Bulk)", cs: "1000/cs", price: "$0.59" },
    { category: "Elk", subCategory: "", name: "USA Elky Jerky Treats (Display)", cs: "250/display", price: "$0.60" },
    { category: "Elk", subCategory: "", name: "6oz. Bags of USA Elky Training Treats", cs: "50/cs", price: "$3.90" },
    { category: "Elk", subCategory: "", name: "10oz. Bags of USA Elky Training Treats", cs: "35/cs", price: "$7.91" },
    { category: "Elk", subCategory: "", name: "16oz. Bags of USA Elky Training Treats", cs: "20/cs", price: "$19.94" },
    { category: "Elk", subCategory: "", name: "USA Elky Training Treats (Bulk per lb.)", cs: "20lbs/cs", price: "$19.46" },

    // ================== CHICKEN AND TURKEY ==================
    { category: "Chicken and Turkey", subCategory: "Chicken", name: "Crunchy Euro Chicken Feet (Bulk)", cs: "750/cs", price: "$0.30" },
    { category: "Chicken and Turkey", subCategory: "Chicken", name: "Euro White Chicken Feet (Bulk)", cs: "500/cs", price: "$0.30" },
    { category: "Chicken and Turkey", subCategory: "Chicken", name: "Vanilla Flavored White Euro Chicken Feet (Bulk)", cs: "500/cs", price: "$0.35" },
    { category: "Chicken and Turkey", subCategory: "Chicken", name: "10-Pack of Euro Chicken Feet", cs: "50bags/cs", price: "$3.59" },
    { category: "Chicken and Turkey", subCategory: "Chicken", name: "10-Pack of White Euro Chicken Feet", cs: "60bags/cs", price: "$3.59" },
    { category: "Chicken and Turkey", subCategory: "Chicken", name: "10-Pack of Vanilla Euro Chicken Feet", cs: "60bags/cs", price: "$3.95" },
    { category: "Chicken and Turkey", subCategory: "Chicken", name: "USA Chicken Jerky Treats (Bulk)", cs: "1200/cs", price: "$0.59" },
    { category: "Chicken and Turkey", subCategory: "Chicken", name: "USA Chicken Jerky Treats (Display)", cs: "250/display", price: "$0.58" },

    { category: "Chicken and Turkey", subCategory: "Turkey", name: "USA Turkey Jerky Treats (Bulk)", cs: "1200/cs", price: "$0.57" },
    { category: "Chicken and Turkey", subCategory: "Turkey", name: "USA Turkey Jerky Treats (Display)", cs: "250/display", price: "$0.59" },
    { category: "Chicken and Turkey", subCategory: "Turkey", name: "Large Turkey Jerky Stuffed Buffalo Bone", cs: "50/cs", price: "$4.07" },

    // ================== FEET ==================
    { category: "Feet", subCategory: "Chicken Feet", name: "Crunchy Euro Chicken Feet (Bulk)", cs: "750/cs", price: "$0.30" },
    { category: "Feet", subCategory: "Chicken Feet", name: "Euro White Chicken Feet (Bulk)", cs: "500/cs", price: "$0.30" },
    { category: "Feet", subCategory: "Chicken Feet", name: "Vanilla Flavored White Euro Chicken Feet (Bulk)", cs: "500/cs", price: "$0.35" },
    { category: "Feet", subCategory: "Chicken Feet", name: "10-Pack of Euro Chicken Feet", cs: "50bags/cs", price: "$3.59" },
    { category: "Feet", subCategory: "Chicken Feet", name: "10-Pack of White Euro Chicken Feet", cs: "60bags/cs", price: "$3.59" },
    { category: "Feet", subCategory: "Chicken Feet", name: "10-Pack of Vanilla Euro Chicken Feet", cs: "60bags/cs", price: "$3.95" },
    { category: "Feet", subCategory: "Duck Feet", name: "Euro Duck Feet (Bulk)", cs: "500/cs", price: "$0.78" },
    { category: "Feet", subCategory: "Duck Feet", name: "Euro Duck Feet (Display)", cs: "150/display", price: "$0.90" },
    { category: "Feet", subCategory: "Duck Feet", name: "10-Pack of Euro Duck Feet", cs: "50bags/cs", price: "$9.11" },
    { category: "Feet", subCategory: "Fuzzy Rabbit Feet", name: "Fuzzy Rabbit Feet (Bulk)", cs: "500/cs", price: "$0.45" },
    { category: "Feet", subCategory: "Fuzzy Rabbit Feet", name: "10-Pack of Fuzzy Rabbit Feet", cs: "60bags/cs", price: "$5.10" },
    { category: "Feet", subCategory: "Packaged Feet", name: "10-Pack of Euro Chicken Feet", cs: "50bags/cs", price: "$3.59" },
    { category: "Feet", subCategory: "Packaged Feet", name: "10-Pack of White Euro Chicken Feet", cs: "60bags/cs", price: "$3.59" },
    { category: "Feet", subCategory: "Packaged Feet", name: "10-Pack of Vanilla Euro Chicken Feet", cs: "60bags/cs", price: "$3.95" },
    { category: "Feet", subCategory: "Packaged Feet", name: "10-Pack of Euro Duck Feet", cs: "50bags/cs", price: "$9.11" },
    { category: "Feet", subCategory: "Packaged Feet", name: "10-Pack of Fuzzy Rabbit Feet", cs: "60bags/cs", price: "$5.10" },

    // ================== HORNS ==================
    { category: "Horns", subCategory: "Rams Horn", name: "Large Rams Horn (Bulk)", cs: "50/cs", price: "$5.51" },
    { category: "Horns", subCategory: "Rams Horn", name: "Medium Rams Horn (Bulk)", cs: "80/cs", price: "$3.29" },
    { category: "Horns", subCategory: "Rams Horn", name: "Small Rams Horn (Bulk)", cs: "195/cs", price: "$1.70" },
    { category: "Horns", subCategory: "Buffalo Horn", name: "Large Buffalo Horn (Bulk)", cs: "35/cs", price: "$5.14" },
    { category: "Horns", subCategory: "Buffalo Horn", name: "Medium Buffalo Horn (Bulk)", cs: "50/cs", price: "$3.42" },
    { category: "Horns", subCategory: "Buffalo Horn", name: "Small Buffalo Horn (Bulk)", cs: "100/cs", price: "$1.98" },

    // ================== HOOVES ==================
    { category: "Hooves", subCategory: "", name: "Regular Cow Hooves (Bulk)", cs: "400/cs", price: "$0.47" },
    { category: "Hooves", subCategory: "", name: "Smoked Cow Hooves (Bulk)", cs: "400/cs", price: "$0.54" },
    { category: "Hooves", subCategory: "", name: "“Super” Cow Hooves (Bulk)", cs: "200/cs", price: "$0.95" },

    // ================== BRAIDED ==================
    { category: "Braided", subCategory: "Braided Bully Sticks", name: "6” Braided Bully Sticks (Bulk)", cs: "100/cs", price: "$3.10" },
    { category: "Braided", subCategory: "Braided Bully Sticks", name: "12” Braided Bully Sticks (Bulk)", cs: "50/cs", price: "$6.11" },
    { category: "Braided", subCategory: "Braided Bully Sticks", name: "6” “Super” Braided Bully Sticks (Bulk)", cs: "75/cs", price: "$4.31" },
    { category: "Braided", subCategory: "Braided Bully Sticks", name: "12” “Super” Braided Bully Sticks (Bulk)", cs: "35/cs", price: "$7.91" },
    { category: "Braided", subCategory: "Braided Esophagus", name: "6” Braided Esophagus (Bulk)", cs: "500/cs", price: "$0.90" },
    { category: "Braided", subCategory: "Braided Esophagus", name: "12” Braided Esophagus (Bulk)", cs: "250/cs", price: "$1.79" },
    { category: "Braided", subCategory: "Braided Esophagus", name: "6” Braided Esophagus (Display)", cs: "50/display", price: "$0.95" },
    { category: "Braided", subCategory: "Braided Esophagus", name: "12” Braided Esophagus (Display)", cs: "25/display", price: "$1.91" },
    { category: "Braided", subCategory: "Supreme USA Hide Braided Donuts", name: "5-7” Braided USA Hide Donuts (Bulk)", cs: "45/cs", price: "$5.27" },
    { category: "Braided", subCategory: "Supreme USA Hide Braided Donuts", name: "5-7” Vanilla USA Hide Braided Donuts (Bulk)", cs: "45/cs", price: "$5.51" },
    { category: "Braided", subCategory: "Supreme USA Hide Braided Donuts", name: "8-9” Braided USA Hide Donuts (Bulk)", cs: "30/cs", price: "$6.46" },
    { category: "Braided", subCategory: "Supreme USA Hide Braided Donuts", name: "8-9” Vanilla USA Hide Braided Donuts (Bulk)", cs: "30/cs", price: "$6.59" },
    { category: "Braided", subCategory: "Supreme USA Hide Braided Donuts", name: "10-11” Braided USA Hide Donuts (Bulk)", cs: "20/cs", price: "$7.89" },
    { category: "Braided", subCategory: "Supreme USA Hide Braided Donuts", name: "10-11” Vanilla USA Hide Braided Donuts (Bulk)", cs: "20/cs", price: "$7.99" },

    // ================== LARGE MEATY FEMUR/BONE/KNUCKLES ==================
    { category: "Large Meaty Femur/Bone/Knuckles", subCategory: "Large Buffalo Bone", name: "Reg Large Meaty Buffalo Bone", cs: "50/cs", price: "$2.63" },
    { category: "Large Meaty Femur/Bone/Knuckles", subCategory: "Buffalo Knuckle", name: "Small Meaty Buffalo Knuckle", cs: "100/cs", price: "$0.42" },
    { category: "Large Meaty Femur/Bone/Knuckles", subCategory: "Stuffed Buffalo Bone", name: "Large Turkey Jerky Stuffed Buffalo Bone", cs: "50/cs", price: "$4.07" },
    { category: "Large Meaty Femur/Bone/Knuckles", subCategory: "Stuffed Buffalo Bone", name: "Large Elky Jerky Stuffed Buffalo Bone", cs: "50/cs", price: "$4.07" },
    { category: "Large Meaty Femur/Bone/Knuckles", subCategory: "Stuffed Buffalo Bone", name: "Large Venison and Sweet Potato Stuffed Buffalo Bone", cs: "50/cs", price: "$4.07" },
    { category: "Large Meaty Femur/Bone/Knuckles", subCategory: "Stuffed Buffalo Bone", name: "Large Peanut Butter Stuffed Buffalo Bone", cs: "50/cs", price: "$4.07" },
    { category: "Large Meaty Femur/Bone/Knuckles", subCategory: "Jumbo Meaty Femur", name: "14-16” Jumbo Meaty Femur Knuckle Bone", cs: "18/cs", price: "$6.59" },

    // ================== PRESSED BONES ==================
    { category: "Pressed Bones", subCategory: "Supreme Pressed Ring", name: "6” Supreme Pressed Ring (Bulk)", cs: "100/cs", price: "$2.77" },
    { category: "Pressed Bones", subCategory: "Supreme Pressed Stick", name: "10” x 20mm Supreme Pressed Stick (Bulk)", cs: "200/cs", price: "$1.37" },
    { category: "Pressed Bones", subCategory: "Supreme Pressed Bones", name: "4.5” Pressed Bone (Bulk)", cs: "500/cs", price: "$0.41" },
    { category: "Pressed Bones", subCategory: "Supreme Pressed Bones", name: "6.5” Pressed Bone (Bulk)", cs: "200/cs", price: "$1.32" },
    { category: "Pressed Bones", subCategory: "Supreme Pressed Bones", name: "8.5” Pressed Bone (Bulk)", cs: "100/cs", price: "$2.27" },
    { category: "Pressed Bones", subCategory: "Supreme Pressed Bones", name: "10.5” Pressed Bone (Bulk)", cs: "50/cs", price: "$3.95" },
    { category: "Pressed Bones", subCategory: "Supreme Pressed Bones", name: "12.5” Pressed Bone (Bulk)", cs: "50/cs", price: "$5.65" },

    // ================== TWISTY Q’S AND NATURAL MUNCHY STICKS ==================
    { category: "Twisty Q’s and Natural Munchy Sticks", subCategory: "Munch Sticks", name: "12” x 20mm Natural Munchy Sticks (Bulk)", cs: "200/cs", price: "$0.30" },
    { category: "Twisty Q’s and Natural Munchy Sticks", subCategory: "Munch Sticks", name: "5” x 10mm Natural Munchy Sticks (Bulk)", cs: "2000/cs", price: "$0.05" },
    { category: "Twisty Q’s and Natural Munchy Sticks", subCategory: "Munch Sticks", name: "6.5” Bacon Munchy Sticks (Bulk)", cs: "1300/cs", price: "$0.06" },
    { category: "Twisty Q’s and Natural Munchy Sticks", subCategory: "Twisty Q’s", name: "10” White Twisty Q’s (Bulk)", cs: "500/cs", price: "$0.49" },
    { category: "Twisty Q’s and Natural Munchy Sticks", subCategory: "Twisty Q’s", name: "10” Vanilla Twisty Q’s (Bulk)", cs: "500/cs", price: "$0.52" },
    { category: "Twisty Q’s and Natural Munchy Sticks", subCategory: "Twisty’s", name: "5” x 4/6mm White Twisty-100/inner (Bulk)", cs: "3800/cs", price: "$0.05" },
    { category: "Twisty Q’s and Natural Munchy Sticks", subCategory: "Twisty’s", name: "5” x 9/10mm White Twisty-50/inner (Bulk)", cs: "2000/cs", price: "$0.12" },
    { category: "Twisty Q’s and Natural Munchy Sticks", subCategory: "Twisty’s", name: "10” x 9/10mm White Twisty (Bulk)", cs: "500/cs", price: "$0.29" },

    // ================== SUPREME HIDE CHIPS ==================
    { category: "Supreme Hide Chips", subCategory: "Supreme USA Hide Chips", name: "White USA Supreme Hide Chips (Bulk per lb.)", cs: "23lbs/cs", price: "$5.93" },
    { category: "Supreme Hide Chips", subCategory: "Supreme USA Hide Chips", name: "Vanilla USA Supreme Chips (Bulk per lb.)", cs: "22lbs/cs", price: "$5.99" },
    { category: "Supreme Hide Chips", subCategory: "Supreme USA Hide Chips", name: "Peanut Butter Basted USA Supreme Hide Chips (Bulk per lb.)", cs: "23lbs/cs", price: "$5.39" },
    { category: "Supreme Hide Chips", subCategory: "Supreme USA Hide Chips", name: "8oz. Bags of White Supreme Chips (Binkey’s)", cs: "24bags/cs", price: "$2.99" },
    { category: "Supreme Hide Chips", subCategory: "Binky’s", name: "8oz. Bags of Peanut Butter Supreme Chips (Binkey’s)", cs: "24bags/cs", price: "$2.99" },
    { category: "Supreme Hide Chips", subCategory: "Binky’s", name: "8oz. Bags of Vanilla Supreme Chips (Binkey’s)", cs: "24bags/cs", price: "$2.99" },
    { category: "Supreme Hide Chips", subCategory: "Binky’s", name: "16oz. Bags of White Supreme Chips (Binkey’s)", cs: "12bags/cs", price: "$5.99" },
    { category: "Supreme Hide Chips", subCategory: "Binky’s", name: "16oz. Bags of Peanut Butter Supreme Chips (Binkey’s)", cs: "12bags/cs", price: "$5.99" },
    { category: "Supreme Hide Chips", subCategory: "Binky’s", name: "16oz. Bags of Vanilla Supreme Chips (Binkey’s)", cs: "12bags/cs", price: "$6.18" },

    // ================== RETRIEVERS ==================
    { category: "Retrievers", subCategory: "USA White Hide Retriever", name: "6/9” White Supreme Retriever (Bulk)", cs: "280/cs", price: "$0.94" },
    { category: "Retrievers", subCategory: "USA White Hide Retriever", name: "10-11” x 30mm White Supreme Retriever (Bulk)", cs: "130/cs", price: "$1.62" },
    { category: "Retrievers", subCategory: "Vanilla Flavored Retriever", name: "6/9” Vanilla Supreme Retriever (Bulk)", cs: "300/cs", price: "$1.22" },
    { category: "Retrievers", subCategory: "Vanilla Flavored Retriever", name: "10-11” x 30mm Vanilla MAGNA Retriever (Bulk)", cs: "150/cs", price: "$2.00" },

    // ================== PACKAGED ITEMS (Top Level) ==================
    { category: "Packaged Items", subCategory: "Duck and Goose", name: "5-Pack of Duck Heads", cs: "75bags/cs", price: "$16.07" },
    { category: "Packaged Items", subCategory: "Duck and Goose", name: "10-Pack of Crunch Duck Necks", cs: "50bags/cs", price: "$8.99" },
    { category: "Packaged Items", subCategory: "Duck and Goose", name: "10-Pack of Crunchy Goose Necks", cs: "50bags/cs", price: "$17.99" },
    { category: "Packaged Items", subCategory: "Duck and Goose", name: "10-Pack of Euro Duck Feet", cs: "50bags/cs", price: "$9.11" },
    { category: "Packaged Items", subCategory: "Duck and Goose", name: "10-Pack of Duck Heads", cs: "50bags/cs", price: "$7.91" },

    { category: "Packaged Items", subCategory: "Ears", name: "6-Pack, Natural Cow Ears", cs: "24bags/cs", price: "$7.13" },
    { category: "Packaged Items", subCategory: "Ears", name: "6-Pack, Vanilla Cow Ears", cs: "24bags/cs", price: "$7.13" },
    { category: "Packaged Items", subCategory: "Ears", name: "6-Pack, Honey Smoked Cow Ears", cs: "24bags/cs", price: "$7.13" },
    { category: "Packaged Items", subCategory: "Ears", name: "10-Pack of Fuzzy Bunny Ears", cs: "60bags/cs", price: "$4.45" },
    { category: "Packaged Items", subCategory: "Ears", name: "5-Pack of Hairy Beef Ears", cs: "50bags/cs", price: "$7.19" },

    { category: "Packaged Items", subCategory: "Feet", name: "10-Pack of Fuzzy Bunny Feet", cs: "60bags/cs", price: "$5.10" },
    { category: "Packaged Items", subCategory: "Feet", name: "10-Pack of Euro Chicken Feet", cs: "50bags/cs", price: "$3.59" },
    { category: "Packaged Items", subCategory: "Feet", name: "10-Pack of White Crunchy Chicken Feet", cs: "60bags/cs", price: "$3.59" },
    { category: "Packaged Items", subCategory: "Feet", name: "10-Pack of Vanilla Flavored White Crunchy Chicken Feet", cs: "60bags/cs", price: "$3.95" },

    { category: "Packaged Items", subCategory: "Chunky Cheeks", name: "8oz. Bags of White Chunky Cheeks", cs: "24bags/cs", price: "$3.46" },
    { category: "Packaged Items", subCategory: "Chunky Cheeks", name: "8oz. Bags of Vanilla Chunky Cheeks", cs: "24bags/cs", price: "$3.46" },
    { category: "Packaged Items", subCategory: "Chunky Cheeks", name: "16oz. Bags of White Chunky Cheeks", cs: "12bags/cs", price: "$6.33" },
    { category: "Packaged Items", subCategory: "Chunky Cheeks", name: "16oz. Bags of Vanilla Chunky Cheeks", cs: "12bags/cs", price: "$6.33" },

    { category: "Packaged Items", subCategory: "Beef Lung", name: "8oz. Bag of Beef Lung", cs: "50bags/cs", price: "$4.48" },
    { category: "Packaged Items", subCategory: "Beef Lung", name: "16oz. Bag of Beef Lung", cs: "25bags/cs", price: "$8.70" },

    { category: "Packaged Items", subCategory: "Bully Pieces", name: "8oz. Bag of Bully Pieces", cs: "70bags/cs", price: "$6.59" },
    { category: "Packaged Items", subCategory: "Bully Pieces", name: "10oz. Bag of Bully Pieces", cs: "50bags/cs", price: "$10.07" },
    { category: "Packaged Items", subCategory: "Bully Pieces", name: "16oz. Bag of Bully Pieces", cs: "35bags/cs", price: "$12.30" },

    { category: "Packaged Items", subCategory: "Jerky", name: "6oz. Bags of USA Elky Training Treats", cs: "50/cs", price: "$3.90" },
    { category: "Packaged Items", subCategory: "Jerky", name: "10oz. Bags of USA Elky Training Treats", cs: "35/cs", price: "$7.91" },
    { category: "Packaged Items", subCategory: "Jerky", name: "16oz. Bags of USA Elky Training Treats", cs: "20/cs", price: "$19.94" },
    { category: "Packaged Items", subCategory: "Jerky", name: "USA Elky Training Treats (per lb.)", cs: "20lbs/cs", price: "$19.46" },

    { category: "Packaged Items", subCategory: "Trachea Pieces", name: "8oz. Bags of Beef Trachea Pieces", cs: "24bags/cs", price: "$3.11" },
    { category: "Packaged Items", subCategory: "Trachea Pieces", name: "16oz. Bags of Beef Trachea Pieces", cs: "12/cs", price: "$5.99" },

    { category: "Packaged Items", subCategory: "Binky’s", name: "8oz. Bags of White Supreme Chips (Binkey’s)", cs: "24bags/cs", price: "$2.99" },
    { category: "Packaged Items", subCategory: "Binky’s", name: "8oz. Bags of Peanut Butter Supreme Chips (Binkey’s)", cs: "24bags/cs", price: "$2.99" },
    { category: "Packaged Items", subCategory: "Binky’s", name: "8oz. Bags of Vanilla Supreme Chips (Binkey’s)", cs: "24bags/cs", price: "$2.99" },
    { category: "Packaged Items", subCategory: "Binky’s", name: "16oz. Bags of White Supreme Chips (Binkey’s)", cs: "12bags/cs", price: "$5.99" },
    { category: "Packaged Items", subCategory: "Binky’s", name: "16oz. Bags of Peanut Butter Supreme Chips (Binkey’s)", cs: "12bags/cs", price: "$5.99" },
    { category: "Packaged Items", subCategory: "Binky’s", name: "16oz. Bags of Vanilla Supreme Chips (Binkey’s)", cs: "12bags/cs", price: "$6.18" },
];
// ================== 75 DOG HEALTH BENEFITS ==================
const DOG_HEALTH_BENEFITS = [
    "Supports healthy joint lubrication through natural glycosaminoglycan production",
    "Helps maintain optimal gut microbiome diversity for better nutrient absorption",
    "Contains compounds that may reduce oxidative stress in senior dogs",
    "Promotes healthy skin barrier function from within",
    "Supports natural detoxification pathways in the liver",
    "May help regulate healthy inflammatory responses after activity",
    "Contains prebiotic fibers that feed beneficial gut bacteria",
    "Supports cognitive function through omega-3 fatty acid delivery",
    "Helps maintain strong, flexible tendons and ligaments",
    "Promotes healthy fur growth and reduced seasonal shedding",
    "Supports natural immune modulation during seasonal changes",
    "Contains minerals that aid in healthy bone density maintenance",
    "Helps support normal digestive enzyme production",
    "May assist with healthy weight management when fed appropriately",
    "Supports cardiovascular health through natural antioxidant activity",
    "Promotes healthy eye function and retinal health",
    "Helps maintain normal blood sugar levels in active dogs",
    "Supports healthy kidney function through proper hydration support",
    "Contains compounds that may ease occasional stiffness",
    "Promotes healthy anal gland function through dietary fiber",
    "Supports natural calming responses during travel or storms",
    "Helps maintain healthy oral microbiome balance",
    "Contains nutrients that support healthy nail growth",
    "Supports proper muscle recovery after exercise",
    "May help maintain healthy respiratory function",
    "Promotes balanced energy levels throughout the day",
    "Supports healthy thyroid function through trace minerals",
    "Helps maintain normal histamine response during allergy season",
    "Contains ingredients that support healthy liver enzyme levels",
    "Promotes strong, healthy teeth through natural chewing action",
    "Supports healthy brain development in growing puppies",
    "Helps maintain proper pH balance in the urinary tract",
    "Contains antioxidants that support cellular health",
    "Promotes healthy gut lining integrity",
    "Supports normal hormone balance in adult dogs",
    "Helps maintain healthy joint fluid viscosity",
    "Contains nutrients that support healthy vision in low light",
    "Promotes proper digestion of proteins and fats",
    "Supports healthy immune response to environmental stressors",
    "Helps maintain normal inflammatory markers after intense play",
    "Contains prebiotics that support beneficial bacteria growth",
    "Promotes healthy skin elasticity and coat shine",
    "Supports natural detoxification through increased water intake",
    "Helps maintain healthy blood pressure levels",
    "Contains compounds that support healthy cartilage repair",
    "Promotes balanced mood and reduced restlessness",
    "Supports healthy spleen and lymphatic function",
    "Helps maintain normal digestive transit time",
    "Contains minerals essential for healthy nerve function",
    "Promotes strong immune response during seasonal transitions",
    "Supports healthy muscle tone and flexibility",
    "Helps maintain normal histamine levels year-round",
    "Contains antioxidants that protect against free radicals",
    "Promotes healthy kidney filtration and waste removal",
    "Supports proper nutrient absorption in the small intestine",
    "Helps maintain healthy respiratory tract moisture",
    "Contains ingredients that support healthy aging processes",
    "Promotes balanced energy without spikes or crashes",
    "Supports healthy skin barrier against environmental irritants",
    "Helps maintain normal joint range of motion",
    "Contains nutrients that support healthy brain aging",
    "Promotes proper bile production for fat digestion",
    "Supports healthy immune surveillance in the gut",
    "Helps maintain normal inflammatory balance after exercise",
    "Contains compounds that support healthy collagen production",
    "Promotes healthy fur pigmentation and coat quality",
    "Supports proper hydration at the cellular level",
    "Helps maintain healthy anal sac expression",
    "Contains minerals that support strong, healthy bones",
    "Promotes balanced gut motility and regularity",
    "Supports healthy response to seasonal environmental changes",
    "Helps maintain normal cognitive sharpness in senior dogs",
    "Contains antioxidants that support overall vitality",
    "Promotes healthy tendon and ligament strength",
    "Supports proper enzyme activity in the digestive tract"
];
function getHealthBenefitsForProduct(productName) {
    let hash = 0;
    for (let i = 0; i < productName.length; i++) {
        hash = productName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const benefits = [];
    const numBenefits = 4;

    for (let i = 0; i < numBenefits; i++) {
        const index = Math.abs(hash + i) % DOG_HEALTH_BENEFITS.length;
        benefits.push(DOG_HEALTH_BENEFITS[index]);
    }
    
    return benefits;
}

const ITEM_SPECIFIC_BENEFITS = {
    // ==================== BULLY STICKS ====================
    "6” Thin Green Line Bully Sticks (Bulk)": {
        bullets: [
            "Thin profile makes it easier for smaller dogs to chew",
            "High in natural protein and low in fat",
            "Helps reduce plaque and tartar through extended chewing",
            "Great everyday chew for light to moderate chewers"
        ]
    },
    "12” Thin Green Line Bully Sticks (Bulk)": {
        bullets: [
            "Thin profile makes it easier for smaller dogs to chew",
            "High in natural protein and low in fat",
            "Helps reduce plaque and tartar through extended chewing",
            "Longer length provides more chewing time"
        ]
    },
    "6” Regular Green Line Bully Sticks (Bulk)": {
        bullets: [
            "Standard thickness offers a good balance of durability and chew time",
            "High protein, low fat, and fully digestible",
            "Helps clean teeth while satisfying natural chewing instincts",
            "Excellent everyday chew for most dogs"
        ]
    },
    "12” Regular Green Line Bully Sticks (Bulk)": {
        bullets: [
            "Standard thickness offers a good balance of durability and chew time",
            "High protein, low fat, and fully digestible",
            "Helps clean teeth while satisfying natural chewing instincts",
            "Longer size provides extended chewing satisfaction"
        ]
    },
    "6” “Thick” Green Line Bully Sticks (Bulk)": {
        bullets: [
            "Thicker cut provides longer chew time for moderate chewers",
            "High in natural protein with a satisfying texture",
            "Helps reduce plaque and tartar buildup",
            "Great for dogs who finish thinner sticks too quickly"
        ]
    },
    "12” “Thick” Green Line Bully Sticks (Bulk)": {
        bullets: [
            "Thicker cut provides longer chew time for moderate chewers",
            "High in natural protein with a satisfying texture",
            "Helps reduce plaque and tartar buildup",
            "Longer length + thickness = extended engagement"
        ]
    },
    "6” “Super Thick” Green Line Bully Sticks (Bulk)": {
        bullets: [
            "Extra thick for aggressive and powerful chewers",
            "Very long-lasting compared to standard bully sticks",
            "High protein and excellent for dental health",
            "Ideal for dogs who destroy regular chews quickly"
        ]
    },
    "12” “Super Thick” Green Line Bully Sticks (Bulk)": {
        bullets: [
            "Extra thick for aggressive and powerful chewers",
            "Very long-lasting compared to standard bully sticks",
            "High protein and excellent for dental health",
            "Longer size provides maximum chewing time"
        ]
    },
    "24-28” Bully Cane": {
        bullets: [
            "Extra long bully stick for extended chewing sessions",
            "High protein and low fat",
            "Helps clean teeth through prolonged chewing action",
            "Great for large dogs or dogs who love long chews"
        ]
    },
    "32-36” Bully Cane": {
        bullets: [
            "Extra long bully stick for extended chewing sessions",
            "High protein and low fat",
            "Helps clean teeth through prolonged chewing action",
            "Ideal for large, powerful chewers"
        ]
    },
    "6” Braided Bully Sticks (Bulk)": {
        bullets: [
            "Braided design creates a more challenging and longer-lasting chew",
            "High protein with a unique texture dogs enjoy working on",
            "Helps reduce plaque and tartar more effectively",
            "Great for moderate to aggressive chewers"
        ]
    },
    "12” Braided Bully Sticks (Bulk)": {
        bullets: [
            "Braided design creates a more challenging and longer-lasting chew",
            "High protein with a unique texture dogs enjoy working on",
            "Helps reduce plaque and tartar more effectively",
            "Longer length provides extended chewing time"
        ]
    },
    "6” “Super” Braided Bully Sticks (Bulk)": {
        bullets: [
            "Extra thick braided design for aggressive chewers",
            "Extremely long-lasting and durable",
            "High protein and excellent for dental health",
            "Perfect for dogs who finish regular bully sticks quickly"
        ]
    },
    "12” “Super” Braided Bully Sticks (Bulk)": {
        bullets: [
            "Extra thick braided design for aggressive chewers",
            "Extremely long-lasting and durable",
            "High protein and excellent for dental health",
            "Longer size offers maximum chewing satisfaction"
        ]
    },
    "6” Euro Bully Stick (Bulk)": {
        bullets: [
            "Premium European-style bully stick with excellent quality",
            "High protein and fully digestible",
            "Helps clean teeth and satisfy chewing needs",
            "Great everyday chew for most dogs"
        ]
    },
    "12” Euro Bully Stick (Bulk)": {
        bullets: [
            "Premium European-style bully stick with excellent quality",
            "High protein and fully digestible",
            "Helps clean teeth and satisfy chewing needs",
            "Longer length provides extended chewing time"
        ]
    },
    "8oz. Bag of Bully Pieces": {
        bullets: [
            "Convenient smaller pieces perfect for training or smaller dogs",
            "Same high-protein benefits as full bully sticks",
            "Easy to portion and great for on-the-go use",
            "Helps clean teeth even in smaller chew sessions"
        ]
    },
    "10oz. Bag of Bully Pieces": {
        bullets: [
            "Convenient smaller pieces perfect for training or smaller dogs",
            "Same high-protein benefits as full bully sticks",
            "Easy to portion and great for on-the-go use",
            "Helps clean teeth even in smaller chew sessions"
        ]
    },
    "16oz. Bag of Bully Pieces": {
        bullets: [
            "Value size of smaller bully pieces",
            "Same high-protein benefits as full bully sticks",
            "Great for training, small dogs, or frequent use",
            "Helps clean teeth even in shorter chew sessions"
        ]
    },

    // ==================== JERKY ====================
    "USA Beef Jerky Treats (Bulk)": {
        bullets: [
            "Made from 100% USA beef with no fillers",
            "High protein and low fat",
            "Great for training or as an everyday treat",
            "Easy to break into smaller pieces"
        ]
    },
    "USA Turkey Jerky Treats (Bulk)": {
        bullets: [
            "Made from 100% USA turkey with no fillers",
            "High protein and low fat",
            "Great for training or as an everyday treat",
            "Lean alternative to beef jerky"
        ]
    },
    "USA Chicken Jerky Treats (Bulk)": {
        bullets: [
            "Made from 100% USA chicken with no fillers",
            "High protein and low fat",
            "Great for training or as an everyday treat",
            "Mild flavor most dogs enjoy"
        ]
    },
    "USA Elky Jerky Treats (Bulk)": {
        bullets: [
            "Made from 100% USA elk with no fillers",
            "High protein and novel flavor for picky eaters",
            "Great for training or as an everyday treat",
            "Lean and easy to digest"
        ]
    },
    "USA Venison & Sweet Potato Jerky Treats (Bulk)": {
        bullets: [
            "Made with real venison and sweet potato",
            "High protein with added fiber from sweet potato",
            "Great novel protein option for dogs with sensitivities",
            "Excellent for training or everyday use"
        ]
    },
    "6oz. Bags of USA Elky Training Treats": {
        bullets: [
            "Small, soft training treats made with real elk",
            "Perfect for frequent rewarding and positive reinforcement",
            "Easy to break into tiny pieces",
            "High protein and low fat"
        ]
    },
    "10oz. Bags of USA Elky Training Treats": {
        bullets: [
            "Small, soft training treats made with real elk",
            "Perfect for frequent rewarding and positive reinforcement",
            "Easy to break into tiny pieces",
            "High protein and low fat"
        ]
    },
    "16oz. Bags of USA Elky Training Treats": {
        bullets: [
            "Small, soft training treats made with real elk",
            "Perfect for frequent rewarding and positive reinforcement",
            "Easy to break into tiny pieces",
            "High protein and low fat"
        ]
    },
    "Large Turkey Jerky Stuffed Buffalo Bone": {
        bullets: [
            "Real buffalo bone provides long-lasting chewing",
            "Stuffed with premium turkey jerky for extra protein and flavor",
            "Excellent for aggressive chewers",
            "Combines dental benefits with irresistible taste"
        ]
    },
    "Large Elky Jerky Stuffed Buffalo Bone": {
        bullets: [
            "Real buffalo bone provides long-lasting chewing",
            "Stuffed with premium elk jerky for extra protein and flavor",
            "Excellent for aggressive chewers",
            "Combines dental benefits with irresistible taste"
        ]
    },
    "Large Venison and Sweet Potato Stuffed Buffalo Bone": {
        bullets: [
            "Real buffalo bone provides long-lasting chewing",
            "Stuffed with venison and sweet potato jerky",
            "Excellent for aggressive chewers",
            "Novel protein option with added fiber"
        ]
    },

    // ==================== EARS ====================
    "Natural Cow Ears (Bulk)": {
        bullets: [
            "Natural dental chew that helps scrape plaque and tartar",
            "Lightweight with a satisfying texture",
            "High protein and fully digestible",
            "Great for most dogs as an everyday chew"
        ]
    },
    "Vanilla Cow Ears (Bulk)": {
        bullets: [
            "Natural dental chew with added vanilla flavor",
            "Lightweight with a satisfying texture",
            "High protein and fully digestible",
            "Great for picky eaters"
        ]
    },
    "Honey Smoked Cow Ears (Bulk)": {
        bullets: [
            "Natural dental chew with honey smoked flavor",
            "Lightweight with a satisfying texture",
            "High protein and fully digestible",
            "Great for picky eaters who enjoy smoky flavors"
        ]
    },
    "Hairy Beef Ears (Bulk)": {
        bullets: [
            "Natural beef ear with hair for extra texture",
            "Helps clean teeth while providing a satisfying chew",
            "High protein and fully digestible",
            "Great for dogs who enjoy a more natural texture"
        ]
    },
    "MAGNA Buffalo Ears (Bulk)": {
        bullets: [
            "Made from premium MAGNA buffalo",
            "Natural dental chew that helps clean teeth",
            "High protein and fully digestible",
            "Great alternative to cow ears"
        ]
    },
    "Honey Smoked MAGNA Buffalo Ears (Bulk)": {
        bullets: [
            "Premium MAGNA buffalo ear with honey smoked flavor",
            "Natural dental chew that helps clean teeth",
            "High protein and fully digestible",
            "Great for picky eaters"
        ]
    },
    "Polish Pig Ears (Bulk)": {
        bullets: [
            "Natural pig ear with a unique texture",
            "Helps clean teeth while providing a satisfying chew",
            "High protein and fully digestible",
            "Great novel chew option"
        ]
    },
    "White Lamb Ears (Bulk)": {
        bullets: [
            "Made from 100% lamb",
            "Lightweight and gentle on digestion",
            "Natural dental chew with a soft texture",
            "Excellent for smaller dogs or sensitive stomachs"
        ]
    },
    "Vanilla Lamb Ears (Bulk)": {
        bullets: [
            "Made from 100% lamb with vanilla flavor",
            "Lightweight and gentle on digestion",
            "Natural dental chew with a soft texture",
            "Great for picky smaller dogs"
        ]
    },
    "Fuzzy Rabbit Ears (Bulk)": {
        bullets: [
            "Made from 100% rabbit",
            "Lean, high-protein, and gentle on digestion",
            "Natural dental chew with a soft, fuzzy texture",
            "Excellent novel protein for dogs with sensitivities"
        ]
    },
    "10-Pack of Fuzzy Rabbit Ears": {
        bullets: [
            "Convenient pre-portioned 10-pack",
            "Lean, high-protein rabbit ears",
            "Gentle on digestion and great for smaller dogs",
            "Natural dental benefits with a soft texture"
        ]
    },
    "6-Pack, Natural Cow Ears": {
        bullets: [
            "Convenient 6-pack for easy portion control",
            "Natural dental chew that helps clean teeth",
            "Lightweight with a satisfying texture",
            "Great for storage and travel"
        ]
    },
    "6-Pack, Vanilla Cow Ears": {
        bullets: [
            "Convenient 6-pack with vanilla flavor",
            "Natural dental chew that helps clean teeth",
            "Lightweight with a satisfying texture",
            "Great for picky eaters"
        ]
    },
    "6-Pack, Honey Smoked Cow Ears": {
        bullets: [
            "Convenient 6-pack with honey smoked flavor",
            "Natural dental chew that helps clean teeth",
            "Lightweight with a satisfying texture",
            "Great for picky eaters who enjoy smoky flavors"
        ]
    },
    "5-Pack Hairy Beef Ears": {
        bullets: [
            "Convenient 5-pack of hairy beef ears",
            "Natural texture helps clean teeth",
            "High protein and fully digestible",
            "Great for dogs who enjoy a more natural chew"
        ]
    },

    // ==================== COW CHEEKS ====================
    "5-6” Natural Rollio (Bulk)": {
        bullets: [
            "Rolled cow cheek delivers very high protein",
            "Thick, meaty texture provides extended chewing time",
            "Excellent for aggressive chewers",
            "Fully digestible with no fillers"
        ]
    },
    "10-12” Natural Rollio (Bulk)": {
        bullets: [
            "Rolled cow cheek delivers very high protein",
            "Thick, meaty texture provides extended chewing time",
            "Excellent for aggressive chewers",
            "Longer size for maximum chewing satisfaction"
        ]
    },
    "5-6” Regular Rollio (Bulk)": {
        bullets: [
            "Rolled cow cheek with a classic texture",
            "High protein and long-lasting chew",
            "Great for moderate to aggressive chewers",
            "Fully digestible single-ingredient chew"
        ]
    },
    "10-12” Regular Rollio (Bulk)": {
        bullets: [
            "Rolled cow cheek with a classic texture",
            "High protein and long-lasting chew",
            "Great for moderate to aggressive chewers",
            "Longer size for extended chewing time"
        ]
    },
    "5-6” Vanilla Rollio (Bulk)": {
        bullets: [
            "Rolled cow cheek with vanilla flavor",
            "High protein with added appeal for picky eaters",
            "Thick texture provides long chew time",
            "Great for dogs who enjoy flavored chews"
        ]
    },
    "10-12” Vanilla Rollio (Bulk)": {
        bullets: [
            "Rolled cow cheek with vanilla flavor",
            "High protein with added appeal for picky eaters",
            "Thick texture provides long chew time",
            "Longer size for extended chewing satisfaction"
        ]
    },
    "5-6” Honey Smoked Rollio (Bulk)": {
        bullets: [
            "Rolled cow cheek with honey smoked flavor",
            "High protein with a rich, smoky taste",
            "Thick texture provides long chew time",
            "Great for picky eaters who enjoy smoky flavors"
        ]
    },
    "10-12” Honey Smoked Rollio (Bulk)": {
        bullets: [
            "Rolled cow cheek with honey smoked flavor",
            "High protein with a rich, smoky taste",
            "Thick texture provides long chew time",
            "Longer size for extended chewing satisfaction"
        ]
    },
    "5-6” PHAT Rollio (Bulk)": {
        bullets: [
            "Extra thick and meaty rolled cow cheek",
            "Very high protein for aggressive chewers",
            "Longer chew time than standard rollios",
            "Excellent for powerful chewers"
        ]
    },
    "10-12” PHAT Rollio (Bulk)": {
        bullets: [
            "Extra thick and meaty rolled cow cheek",
            "Very high protein for aggressive chewers",
            "Longer chew time than standard rollios",
            "Maximum chewing satisfaction for large dogs"
        ]
    },
    "5-6” Vanilla PHAT Rollio (Bulk)": {
        bullets: [
            "Extra thick vanilla-flavored rolled cow cheek",
            "Very high protein with added flavor appeal",
            "Longer chew time than standard rollios",
            "Great for aggressive chewers who enjoy vanilla"
        ]
    },
    "10-12” Vanilla PHAT Rollio (Bulk)": {
        bullets: [
            "Extra thick vanilla-flavored rolled cow cheek",
            "Very high protein with added flavor appeal",
            "Longer chew time than standard rollios",
            "Great for large picky eaters"
        ]
    },
    "5-6” Honey Smoked PHAT Rollio (Bulk)": {
        bullets: [
            "Extra thick honey smoked rolled cow cheek",
            "Very high protein with rich smoky flavor",
            "Longer chew time than standard rollios",
            "Excellent for aggressive chewers who enjoy smoky flavors"
        ]
    },
    "10-12” Honey Smoked PHAT Rollio (Bulk)": {
        bullets: [
            "Extra thick honey smoked rolled cow cheek",
            "Very high protein with rich smoky flavor",
            "Longer chew time than standard rollios",
            "Great for powerful chewers who enjoy smoky flavors"
        ]
    },
    "5-6” Peanut Butter Rollio (Bulk)": {
        bullets: [
            "Rolled cow cheek basted in real peanut butter",
            "High protein with irresistible peanut butter flavor",
            "Thick texture provides long chew time",
            "Great for picky eaters and aggressive chewers"
        ]
    },
    "10-12” Peanut Butter Rollio (Bulk)": {
        bullets: [
            "Rolled cow cheek basted in real peanut butter",
            "High protein with irresistible peanut butter flavor",
            "Thick texture provides long chew time",
            "Great for picky eaters and aggressive chewers"
        ]
    },
    "5-6” Cow Cheek Slab (Bulk per lb.)": {
        bullets: [
            "Thick cow cheek slab cut into manageable pieces",
            "Very high protein with a dense, meaty texture",
            "Excellent for aggressive chewers",
            "Sold by the pound for flexible purchasing"
        ]
    },
    "10-12” Cow Cheek Slab (Bulk per lb.)": {
        bullets: [
            "Thick cow cheek slab cut into manageable pieces",
            "Very high protein with a dense, meaty texture",
            "Excellent for aggressive chewers",
            "Sold by the pound for flexible purchasing"
        ]
    },
    "White Chunky Cheeks (Bulk)": {
        bullets: [
            "Chunky pieces of cow cheek with a satisfying texture",
            "Very high protein and fully digestible",
            "Great for training or as a special reward",
            "Excellent value when purchased in bulk"
        ]
    },
    "Vanilla Chunky Cheeks (Bulk)": {
        bullets: [
            "Vanilla-flavored chunky cow cheek pieces",
            "Very high protein with added flavor appeal",
            "Great for picky eaters",
            "Excellent value when purchased in bulk"
        ]
    },
    "8oz. Bags of White Chunky Cheeks": {
        bullets: [
            "Convenient pre-portioned 8oz bags",
            "High protein chunky cow cheek pieces",
            "Great for training or as a special reward",
            "Easy to store and portion"
        ]
    },
    "8oz. Bags of Vanilla Chunky Cheeks": {
        bullets: [
            "Convenient pre-portioned 8oz bags with vanilla flavor",
            "High protein chunky cow cheek pieces",
            "Great for picky eaters",
            "Easy to store and portion"
        ]
    },
    "16oz. Bags of White Chunky Cheeks": {
        bullets: [
            "Value size 16oz bags of chunky cow cheek",
            "High protein with a satisfying texture",
            "Great for frequent chewers or multi-dog homes",
            "Excellent value"
        ]
    },
    "16oz. Bags of Vanilla Chunky Cheeks": {
        bullets: [
            "Value size 16oz bags of vanilla chunky cow cheek",
            "High protein with added flavor appeal",
            "Great for picky frequent chewers",
            "Excellent value"
        ]
    },

    // ==================== OX TAILS ====================
    "6” MAGNA Natural Ox Tails (Bulk)": {
        bullets: [
            "Premium MAGNA ox tail with high collagen content",
            "Rich in natural protein and minerals",
            "Tough texture provides long chew time",
            "Great for dental health and joint support"
        ]
    },
    "12” MAGNA Natural Ox Tails (Bulk)": {
        bullets: [
            "Premium MAGNA ox tail with high collagen content",
            "Rich in natural protein and minerals",
            "Tough texture provides long chew time",
            "Longer size for extended chewing satisfaction"
        ]
    },
    "6” White Ox Tails (Bulk)": {
        bullets: [
            "Natural ox tail with a clean white appearance",
            "High in collagen and protein",
            "Tough texture provides long chew time",
            "Great for dental health"
        ]
    },
    "12” White Ox Tails (Bulk)": {
        bullets: [
            "Natural ox tail with a clean white appearance",
            "High in collagen and protein",
            "Tough texture provides long chew time",
            "Longer size for extended chewing"
        ]
    },
    "6” Vanilla Ox Tails (Bulk)": {
        bullets: [
            "Natural ox tail with vanilla flavor",
            "High in collagen and protein",
            "Tough texture provides long chew time",
            "Great for picky eaters"
        ]
    },
    "12” Vanilla Ox Tails (Bulk)": {
        bullets: [
            "Natural ox tail with vanilla flavor",
            "High in collagen and protein",
            "Tough texture provides long chew time",
            "Longer size for extended chewing"
        ]
    },
    "6” Honey Smoked Ox Tails (Bulk)": {
        bullets: [
            "Natural ox tail with honey smoked flavor",
            "High in collagen and protein",
            "Tough texture provides long chew time",
            "Great for picky eaters who enjoy smoky flavors"
        ]
    },
    "12” Honey Smoked Ox Tails (Bulk)": {
        bullets: [
            "Natural ox tail with honey smoked flavor",
            "High in collagen and protein",
            "Tough texture provides long chew time",
            "Longer size for extended chewing satisfaction"
        ]
    },

    // ==================== RABBIT ====================
    "Fuzzy Bunny Ears (Bulk)": {
        bullets: [
            "Made from 100% rabbit",
            "Lean, high-protein, and gentle on digestion",
            "Natural dental chew with a soft, fuzzy texture",
            "Excellent novel protein for dogs with sensitivities"
        ]
    },
    "10-Pack of Fuzzy Bunny Ears": {
        bullets: [
            "Convenient pre-portioned 10-pack",
            "Lean, high-protein rabbit ears",
            "Gentle on digestion and great for smaller dogs",
            "Natural dental benefits with a soft texture"
        ]
    },
    "Fuzzy Rabbit Feet (Bulk)": {
        bullets: [
            "Made from 100% rabbit feet",
            "Lean and high in natural glucosamine",
            "Gentle on digestion with a unique texture",
            "Great for joint support and dental health"
        ]
    },
    "10-Pack of Fuzzy Rabbit Feet": {
        bullets: [
            "Convenient pre-portioned 10-pack of rabbit feet",
            "Lean and high in natural glucosamine",
            "Gentle on digestion with a unique texture",
            "Great for joint support and smaller dogs"
        ]
    },

    // ==================== DUCK AND GOOSE ====================
    "Crunchy Baked Duck Necks (Bulk)": {
        bullets: [
            "Made from 100% duck necks",
            "Crunchy texture helps clean teeth",
            "High protein and low fat",
            "Great for dental health and a satisfying crunch"
        ]
    },
    "10-Pack of Crunchy Duck Necks": {
        bullets: [
            "Convenient pre-portioned 10-pack",
            "Crunchy duck necks help clean teeth",
            "High protein and low fat",
            "Great for dental health"
        ]
    },
    "Crunchy Baked Duck Heads (Bulk)": {
        bullets: [
            "Made from 100% duck heads",
            "Crunchy texture provides excellent dental benefits",
            "High protein with a unique chewing experience",
            "Great for dogs who enjoy crunchy chews"
        ]
    },
    "5-Pack of Crunchy Duck Heads": {
        bullets: [
            "Convenient pre-portioned 5-pack",
            "Crunchy duck heads provide excellent dental benefits",
            "High protein with a unique chewing experience",
            "Great for dogs who enjoy crunchy chews"
        ]
    },
    "10-Pack of Crunch Duck Heads": {
        bullets: [
            "Convenient pre-portioned 10-pack",
            "Crunchy duck heads provide excellent dental benefits",
            "High protein with a unique chewing experience",
            "Great for dogs who enjoy crunchy chews"
        ]
    },
    "Euro Duck Feet (Bulk)": {
        bullets: [
            "Made from premium Euro duck feet",
            "Crunchy texture helps clean teeth",
            "High in natural glucosamine for joint support",
            "Great for dental health and joint maintenance"
        ]
    },
    "10-Pack of Euro Duck Feet": {
        bullets: [
            "Convenient pre-portioned 10-pack",
            "Crunchy duck feet help clean teeth",
            "High in natural glucosamine for joint support",
            "Great for dental and joint health"
        ]
    },
    "Goose Neck (Bulk)": {
        bullets: [
            "Made from 100% goose necks",
            "Larger size provides longer chew time than duck necks",
            "Crunchy texture helps clean teeth",
            "High protein and low fat"
        ]
    },
    "10-Pack of Crunchy Goose Necks": {
        bullets: [
            "Convenient pre-portioned 10-pack of goose necks",
            "Larger size provides longer chew time",
            "Crunchy texture helps clean teeth",
            "High protein and low fat"
        ]
    },

    // ==================== BEEF ====================
    "Super Meaty Beef Tendons (Bulk)": {
        bullets: [
            "Made from premium beef tendons",
            "Very tough and long-lasting for aggressive chewers",
            "High in collagen and protein",
            "Excellent for dental health and jaw strength"
        ]
    },
    "6” Paddywack (Bulk)": {
        bullets: [
            "Made from premium beef paddywack",
            "Tough texture provides long chew time",
            "High protein and fully digestible",
            "Great for moderate to aggressive chewers"
        ]
    },
    "12” Paddywack (Bulk)": {
        bullets: [
            "Made from premium beef paddywack",
            "Tough texture provides long chew time",
            "High protein and fully digestible",
            "Longer size for extended chewing satisfaction"
        ]
    },
    "6” Corium Sticks (Bulk)": {
        bullets: [
            "Made from premium beef corium",
            "Tough, long-lasting chew",
            "High protein and fully digestible",
            "Great for moderate chewers"
        ]
    },
    "12” Corium Sticks (Bulk)": {
        bullets: [
            "Made from premium beef corium",
            "Tough, long-lasting chew",
            "High protein and fully digestible",
            "Longer size for extended chewing time"
        ]
    },
    "6” Beef Wrapped Corium Sticks (Bulk)": {
        bullets: [
            "Beef wrapped around a corium stick",
            "Two textures in one chew for added interest",
            "High protein and long-lasting",
            "Great for dogs who enjoy variety"
        ]
    },
    "12” Beef Wrapped Corium Sticks (Bulk)": {
        bullets: [
            "Beef wrapped around a corium stick",
            "Two textures in one chew for added interest",
            "High protein and long-lasting",
            "Longer size for extended chewing satisfaction"
        ]
    },
    "8oz. Bag of Beef Lung": {
        bullets: [
            "Made from 100% beef lung",
            "High protein and low fat",
            "Light and airy texture dogs enjoy",
            "Great for training or as a special treat"
        ]
    },
    "16oz. Bag of Beef Lung": {
        bullets: [
            "Made from 100% beef lung",
            "High protein and low fat",
            "Light and airy texture dogs enjoy",
            "Great value size for frequent use"
        ]
    },
    "5-6” Beef Trachea": {
        bullets: [
            "Made from premium beef trachea",
            "Crunchy texture helps clean teeth",
            "High in glucosamine for joint support",
            "Great for dental and joint health"
        ]
    },
    "10-13” Beef Trachea": {
        bullets: [
            "Made from premium beef trachea",
            "Crunchy texture helps clean teeth",
            "High in glucosamine for joint support",
            "Longer size for extended chewing time"
        ]
    },
    "8oz. Bags of Beef Trachea Pieces": {
        bullets: [
            "Convenient pre-portioned pieces of beef trachea",
            "Crunchy texture helps clean teeth",
            "High in glucosamine for joint support",
            "Great for training or smaller dogs"
        ]
    },
    "16oz. Bags of Beef Trachea Pieces": {
        bullets: [
            "Value size of beef trachea pieces",
            "Crunchy texture helps clean teeth",
            "High in glucosamine for joint support",
            "Great for frequent use or multi-dog homes"
        ]
    },

    // ==================== HORNS ====================
    "Large Rams Horn": {
        bullets: [
            "Extremely durable natural horn chew",
            "Long-lasting for aggressive and powerful chewers",
            "Helps reduce plaque and tartar through vigorous chewing",
            "Great for dogs who destroy softer chews quickly"
        ]
    },
    "Medium Rams Horn": {
        bullets: [
            "Durable natural horn chew for moderate to aggressive chewers",
            "Long-lasting and satisfying texture",
            "Helps clean teeth while providing extended engagement",
            "Great middle-ground size for most large dogs"
        ]
    },
    "Small Buffalo Horns": {
        bullets: [
            "Natural buffalo horn with a satisfying texture",
            "Good durability for moderate chewers",
            "Helps reduce plaque and tartar",
            "Great for smaller large-breed dogs or moderate chewers"
        ]
    },
    "Medium Buffalo Horns": {
        bullets: [
            "Natural buffalo horn with excellent durability",
            "Long-lasting chew for moderate to aggressive chewers",
            "Helps clean teeth through extended chewing action",
            "Great size for most large dogs"
        ]
    },
    "Large Buffalo Horns": {
        bullets: [
            "Large, very durable natural buffalo horn",
            "Excellent for aggressive and powerful chewers",
            "Long-lasting and helps reduce plaque and tartar",
            "Maximum chewing time for heavy chewers"
        ]
    },

    // ==================== HOOVES ====================
    "Regular Cow Hooves": {
        bullets: [
            "Natural cow hoof with a tough, satisfying texture",
            "Helps clean teeth through chewing action",
            "High protein and fully digestible",
            "Great everyday chew for moderate chewers"
        ]
    },
    "Smoked Cow Hooves": {
        bullets: [
            "Naturally smoked cow hoof with added flavor",
            "Tough texture provides long chew time",
            "Helps clean teeth and satisfies chewing instincts",
            "Great for picky eaters who enjoy smoky flavors"
        ]
    },
    "\"SUPER\" Cow Hooves": {
        bullets: [
            "Extra thick and durable \"SUPER\" cow hoof",
            "Built for aggressive and powerful chewers",
            "Long-lasting with excellent dental benefits",
            "Great for dogs who finish regular hooves too quickly"
        ]
    },

    // ==================== BRAIDED ITEMS ====================
    "6” Braided Esophagus (Bulk)": {
        bullets: [
            "Braided esophagus creates a unique, longer-lasting chew",
            "High protein with an interesting texture dogs enjoy",
            "Helps clean teeth through extended chewing",
            "Great for moderate chewers who like variety"
        ]
    },
    "12” Braided Esophagus (Bulk)": {
        bullets: [
            "Braided esophagus creates a unique, longer-lasting chew",
            "High protein with an interesting texture dogs enjoy",
            "Helps clean teeth through extended chewing",
            "Longer size for more chewing satisfaction"
        ]
    },
    "5-7” Supreme USA Hide Braided Donuts": {
        bullets: [
            "Made from premium USA hide in a fun donut shape",
            "Braided construction provides extended chew time",
            "High protein and fully digestible",
            "Great for dogs who enjoy a challenge"
        ]
    },

    // ==================== LARGE MEATY FEMUR / BONES / KNUCKLES ====================
    "Reg. Large Meaty Buffalo Bone": {
        bullets: [
            "Large, meaty buffalo bone for powerful chewers",
            "Long-lasting and excellent for dental health",
            "Rich in natural minerals and collagen",
            "Great for aggressive chewers who need serious durability"
        ]
    },
    "Small Meaty Buffalo Knuckle": {
        bullets: [
            "Smaller buffalo knuckle bone with meaty flavor",
            "Good durability for moderate to aggressive chewers",
            "High in natural minerals and collagen",
            "Great size for smaller large-breed dogs"
        ]
    },
    "14-16” Jumbo Meaty Femur Knuckle Bone": {
        bullets: [
            "Extra large jumbo femur knuckle bone",
            "Extremely long-lasting for the most aggressive chewers",
            "Rich in minerals and excellent for dental health",
            "Maximum chewing time and jaw exercise"
        ]
    },

    // ==================== PRESSED BONES ====================
    "4.5” Supreme Pressed Bone": {
        bullets: [
            "Small pressed bone made from premium ingredients",
            "Consistent texture and long-lasting chew",
            "Great for smaller dogs or moderate chewers",
            "Clean and convenient pressed bone option"
        ]
    },
    "6.5” Supreme Pressed Bone": {
        bullets: [
            "Medium pressed bone with consistent quality",
            "Long-lasting and satisfying chew",
            "Great for moderate chewers and most dog sizes",
            "Clean, mess-free pressed bone"
        ]
    },
    "8.5” Supreme Pressed Bone": {
        bullets: [
            "Large pressed bone for bigger dogs",
            "Very long-lasting and durable",
            "Excellent for moderate to aggressive chewers",
            "Clean and consistent pressed bone option"
        ]
    },
    "10.5” Supreme Pressed Bone": {
        bullets: [
            "Extra large pressed bone for large dogs",
            "Extremely long-lasting chew",
            "Great for aggressive chewers",
            "Clean, consistent, and durable pressed bone"
        ]
    },
    "12.5” Supreme Pressed Bone": {
        bullets: [
            "Jumbo pressed bone for the largest dogs",
            "Maximum durability and chew time",
            "Excellent for powerful, aggressive chewers",
            "Clean and consistent large pressed bone"
        ]
    },
    "6” Supreme Pressed Ring": {
        bullets: [
            "Fun ring shape made from premium pressed ingredients",
            "Long-lasting chew with a unique design",
            "Great for moderate to aggressive chewers",
            "Clean and consistent pressed bone product"
        ]
    },
    "10” x 20mm Supreme Pressed Stick": {
        bullets: [
            "Long pressed stick for extended chewing",
            "Durable and consistent texture",
            "Great for moderate to aggressive chewers",
            "Clean, mess-free long chew option"
        ]
    },

    // ==================== TWISTY & MUNCHY ====================
    "5” x 4/6mm White Twisty": {
        bullets: [
            "Thin, lightweight twisted chew",
            "Crunchy texture and easy to digest",
            "Great for smaller dogs or light chewers",
            "Fun shape keeps dogs engaged"
        ]
    },
    "5” x 9/10mm White Twisty": {
        bullets: [
            "Medium thickness twisted chew",
            "Crunchy texture with good durability",
            "Great for moderate chewers",
            "Fun twisted shape dogs enjoy"
        ]
    },
    "10” x 9/10mm White Twisty": {
        bullets: [
            "Longer twisted chew for extended sessions",
            "Crunchy texture with satisfying chew time",
            "Great for moderate chewers who like longer chews",
            "Fun shape provides mental stimulation"
        ]
    },
    "10” White Twisty-Q": {
        bullets: [
            "Twisted chew with a unique Q shape",
            "Crunchy texture and good durability",
            "Great for moderate chewers",
            "Fun design adds interest"
        ]
    },
    "10” Vanilla Twisty-Q": {
        bullets: [
            "Vanilla-flavored twisted chew",
            "Crunchy texture with added flavor appeal",
            "Great for picky moderate chewers",
            "Fun shape + flavor combination"
        ]
    },
    "12” x 20mm Natural Munchy Sticks": {
        bullets: [
            "Thin, natural munchy sticks",
            "Lightweight and easy to digest",
            "Great for smaller dogs or light chewers",
            "Perfect for quick chew sessions"
        ]
    },
    "5” x 10mm Natural Munchy Sticks": {
        bullets: [
            "Small, thin natural munchy sticks",
            "Lightweight, crunchy, and easy to digest",
            "Great for small dogs and puppies",
            "Perfect for training or quick rewards"
        ]
    },
    "6.5” Bacon Munchy Sticks": {
        bullets: [
            "Bacon-flavored munchy sticks",
            "Lightweight with a satisfying crunch",
            "Great for picky eaters and small dogs",
            "Easy to digest and perfect for quick chew sessions"
        ]
    },

    // ==================== SUPREME HIDE CHIPS ====================
    "White Supreme Chips (per lb.)": {
        bullets: [
            "Thin, crispy hide chips made from premium hide",
            "High protein and low fat",
            "Great for training or everyday snacking",
            "Lightweight and easy to digest"
        ]
    },
    "Vanilla Supreme Chips": {
        bullets: [
            "Thin, crispy vanilla-flavored hide chips",
            "High protein with added flavor appeal",
            "Great for picky dogs and training",
            "Lightweight and easy to digest"
        ]
    },
    "Peanut Butter Basted Supreme Chips": {
        bullets: [
            "Thin, crispy hide chips basted in peanut butter",
            "High protein with irresistible peanut butter flavor",
            "Great for picky eaters and training",
            "Lightweight and easy to digest"
        ]
    },
    "8oz. Bags of White or PB Chips": {
        bullets: [
            "Convenient 8oz bags of supreme hide chips",
            "High protein and low fat",
            "Great for training or everyday use",
            "Easy to store and portion"
        ]
    },
    "8oz. Bags of Vanilla Chips": {
        bullets: [
            "Convenient 8oz bags of vanilla supreme chips",
            "High protein with added flavor",
            "Great for picky dogs and training",
            "Easy to store and portion"
        ]
    },
    "16oz. White or PB Chips": {
        bullets: [
            "Value size 16oz bags of supreme hide chips",
            "High protein and low fat",
            "Great for frequent use or multi-dog homes",
            "Excellent value"
        ]
    },
    "16oz. Vanilla Chips": {
        bullets: [
            "Value size 16oz bags of vanilla supreme chips",
            "High protein with added flavor appeal",
            "Great for picky frequent chewers",
            "Excellent value"
        ]
    },

    // ==================== RETRIEVERS ====================
    "6/9” White Supreme Retriever": {
        bullets: [
            "Durable retriever-style chew made from premium hide",
            "Designed for extended chewing and play",
            "Great for dental health and keeping dogs occupied",
            "Good size for moderate to large dogs"
        ]
    },
    "10-11” x 30mm Vanilla Supreme Retrievers": {
        bullets: [
            "Longer vanilla-flavored retriever chew",
            "Durable and designed for extended chewing",
            "Great for dental health and mental stimulation",
            "Excellent for large dogs who enjoy longer chews"
        ]
    },

    // ==================== PACKAGED ITEMS ====================
    "10 Pack, Euro Chicken Feets": {
        bullets: [
            "Convenient 10-pack of crunchy euro chicken feet",
            "Helps clean teeth and provides natural glucosamine",
            "Great for dental and joint health",
            "Easy to portion and store"
        ]
    },
    "10 Pack, White Crunchy Chicken Feets": {
        bullets: [
            "Convenient 10-pack of white crunchy chicken feet",
            "Helps clean teeth and provides natural glucosamine",
            "Great for dental and joint health",
            "Easy to portion and store"
        ]
    },
    "10 Pack, Vanilla White Chicken Feets": {
        bullets: [
            "Convenient 10-pack of vanilla-flavored chicken feet",
            "Helps clean teeth with added flavor appeal",
            "Great for picky dogs and joint health",
            "Easy to portion and store"
        ]
    }
};


// ================== RENDER CATEGORY FILTERS ==================

function getSidebarCategories() {
    const fromTree = Object.keys(WHOLESALE_BROWSE_TREE || {});
    const ordered = MAIN_CATEGORIES.filter(c => c !== 'All' && fromTree.indexOf(c) !== -1);
    const extra = fromTree.filter(c => MAIN_CATEGORIES.indexOf(c) === -1);
    return ordered.concat(extra);
}

function getSubcategoriesFor(category) {
    const tree = (WHOLESALE_BROWSE_TREE || {})[category];
    if (!tree) return [];
    return Object.keys(tree).filter(Boolean);
}

function isTestProductName(name) {
    return /^test\s*product/i.test(name || '');
}

function normalizeProductName(name) {
    return String(name || '')
        .toLowerCase()
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/,/g, '')
        .replace(/\bcrunch\b/g, 'crunchy')
        .replace(/\bbunny\b/g, 'rabbit')
        .replace(/\b10-pack of /g, '10-pack ')
        .replace(/\s+/g, ' ')
        .trim();
}

function findCatalogProduct(name) {
    const want = normalizeProductName(name);
    return (WHOLESALE_PRICES || []).find(p => {
        if (isTestProductName(p.name)) return false;
        return normalizeProductName(p.name) === want;
    }) || null;
}

function clearWholesaleSearch() {
    const searchInput = document.getElementById('product-search');
    const clearBtn = document.getElementById('clear-search');
    const suggestionsBox = document.getElementById('search-suggestions');
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.classList.add('hidden');
    if (suggestionsBox) suggestionsBox.classList.add('hidden');
}

function selectWholesaleCategory(category) {
    currentCategoryFilter = category;
    currentSubCategoryFilter = '';
    clearWholesaleSearch();
    renderCategoryFilters();
    renderPortalProducts();
}

function selectWholesaleSubcategory(category, subcategory) {
    currentCategoryFilter = category;
    currentSubCategoryFilter = subcategory || '';
    clearWholesaleSearch();
    renderCategoryFilters();
    renderPortalProducts();
}

function renderCategoryFilters() {
    const sidebar = document.getElementById('sidebar-categories');
    const mobile = document.getElementById('mobile-category-filters');
    const cats = getSidebarCategories();
    const items = [{ label: 'Recommended', value: 'All' }].concat(
        cats.map(c => ({ label: c, value: c }))
    );

    function fill(container, useChip) {
        if (!container) return;
        container.innerHTML = '';

        if (useChip && currentCategoryFilter !== 'All') {
            const back = document.createElement('button');
            back.type = 'button';
            back.className = 'mobile-cat-chip';
            back.textContent = 'Recommended';
            back.onclick = () => selectWholesaleCategory('All');
            container.appendChild(back);

            const catBtn = document.createElement('button');
            catBtn.type = 'button';
            catBtn.className = 'mobile-cat-chip';
            if (!currentSubCategoryFilter) catBtn.classList.add('active');
            catBtn.textContent = currentCategoryFilter;
            catBtn.onclick = () => selectWholesaleCategory(currentCategoryFilter);
            container.appendChild(catBtn);

            getSubcategoriesFor(currentCategoryFilter).forEach(sub => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'mobile-cat-chip';
                if (currentSubCategoryFilter === sub) btn.classList.add('active');
                btn.textContent = sub;
                btn.onclick = () => selectWholesaleSubcategory(currentCategoryFilter, sub);
                container.appendChild(btn);
            });
            return;
        }

        items.forEach(item => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = item.label;
            btn.className = useChip ? 'mobile-cat-chip' : 'sidebar-cat-btn';
            if (currentCategoryFilter === item.value) {
                btn.classList.add('open');
                if (!currentSubCategoryFilter) btn.classList.add('active');
            }
            btn.onclick = () => selectWholesaleCategory(item.value);
            container.appendChild(btn);

            if (!useChip && item.value !== 'All' && item.value === currentCategoryFilter) {
                const subs = getSubcategoriesFor(item.value);
                if (subs.length) {
                    const subList = document.createElement('div');
                    subList.className = 'sidebar-sub-list';
                    subs.forEach(sub => {
                        const subBtn = document.createElement('button');
                        subBtn.type = 'button';
                        subBtn.className = 'sidebar-sub-btn';
                        subBtn.textContent = sub;
                        if (currentSubCategoryFilter === sub) subBtn.classList.add('active');
                        subBtn.onclick = () => selectWholesaleSubcategory(item.value, sub);
                        subList.appendChild(subBtn);
                    });
                    container.appendChild(subList);
                }
            }
        });
    }

    fill(sidebar, false);
    fill(mobile, true);
}

function createSingleText(parent, text, isAll) {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.justifyContent = 'center';
    div.style.width = '100%';

    const span = document.createElement('span');
    span.textContent = text;
    span.style.cursor = 'pointer';
    span.style.fontWeight = '700';
    span.style.fontSize = isAll ? '0.95rem' : '0.88rem';
    span.style.color = currentCategoryFilter === text ? '#1E4D2B' : '#333';
    span.style.textDecoration = currentCategoryFilter === text ? 'none' : 'underline';
    span.style.textDecorationColor = '#1E4D2B';
    span.style.textDecorationThickness = '1.5px';

    span.onclick = () => {
        currentCategoryFilter = text;
        renderCategoryFilters();
        renderPortalProducts();
    };

    div.appendChild(span);
    parent.appendChild(div);
}

function createCategoryRow(parent, categories) {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'center';
    row.style.flexWrap = 'wrap';
    row.style.width = '100%';
    row.style.lineHeight = '1.6';

    categories.forEach((category, index) => {
        const span = document.createElement('span');
        span.textContent = category;
        span.style.cursor = 'pointer';
        span.style.margin = '0 5px';
        span.style.fontWeight = '700';
        span.style.fontSize = '0.88rem';
        span.style.color = currentCategoryFilter === category ? '#1E4D2B' : '#333';
        span.style.textDecoration = currentCategoryFilter === category ? 'none' : 'underline';
        span.style.textDecorationColor = '#1E4D2B';
        span.style.textDecorationThickness = '1.5px';

        span.onmouseover = () => {
            if (currentCategoryFilter !== category) span.style.color = '#1E4D2B';
        };
        span.onmouseout = () => {
            if (currentCategoryFilter !== category) span.style.color = '#333';
        };

        span.onclick = () => {
            currentCategoryFilter = category;
            renderCategoryFilters();
            renderPortalProducts();
        };

        row.appendChild(span);

        if (index < categories.length - 1) {
            const comma = document.createElement('span');
            comma.textContent = ',';
            comma.style.color = '#888';
            comma.style.margin = '0 2px';
            comma.style.fontWeight = '700';
            row.appendChild(comma);
        }
    });

    parent.appendChild(row);
}

function createTextRow(parent, categories) {
    const row = document.createElement('div');
    row.style.textAlign = 'center';
    row.style.lineHeight = '1.7';

    categories.forEach((category, index) => {
        const span = document.createElement('span');
        span.textContent = category;
        span.style.cursor = 'pointer';
        span.style.margin = '0 5px';
        span.style.color = currentCategoryFilter === category ? '#1E4D2B' : '#333';
        span.style.fontWeight = currentCategoryFilter === category ? '700' : '400';
        span.style.transition = 'all 0.2s ease';

        // Green underline on hover
        span.onmouseover = () => {
            if (currentCategoryFilter !== category) {
                span.style.textDecoration = 'underline';
                span.style.textDecorationColor = '#1E4D2B';
                span.style.textDecorationThickness = '1.5px';
            }
        };
        span.onmouseout = () => {
            span.style.textDecoration = 'none';
        };

        span.onclick = () => {
            currentCategoryFilter = category;
            renderCategoryFilters();
            renderPortalProducts();
        };

        row.appendChild(span);

        // Add comma between items
        if (index < categories.length - 1) {
            const comma = document.createElement('span');
            comma.textContent = ',';
            comma.style.color = '#888';
            comma.style.margin = '0 3px';
            comma.style.fontWeight = '400';
            row.appendChild(comma);
        }
    });

    parent.appendChild(row);
}

function createStyledRow(parent, categories) {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.flexWrap = 'wrap';
    row.style.justifyContent = 'center';
    row.style.gap = '0.5rem';

    categories.forEach(category => {
        const btn = document.createElement('button');
        btn.textContent = category;

        const isActive = currentCategoryFilter === category;

        btn.className = `px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
            isActive 
                ? 'bg-[#1E4D2B] text-[#d4b78f] border-[#1E4D2B]' 
                : 'bg-white text-[#1E4D2B] border-[#6B4423] hover:bg-[#f5f0e6]'
        }`;

        btn.onclick = () => {
            currentCategoryFilter = category;
            renderCategoryFilters();
            renderPortalProducts();
        };

        row.appendChild(btn);
    });

    parent.appendChild(row);
}

async function loadPortalInventory() {
    try {
        const { data, error } = await supabaseClient
            .from('inventory')
            .select('product_name, quantity');

        if (error) throw error;

        portalInventory = {};
        (data || []).forEach(row => {
            portalInventory[row.product_name] = Number(row.quantity) || 0;
        });

        console.log('Portal inventory loaded:', Object.keys(portalInventory).length);
    } catch (err) {
        console.error('loadPortalInventory error:', err);
        portalInventory = {};
    }
}

// ================== RENDER PORTAL PRODUCTS (With Grouping) ==================
function stopRecommendedRotator() {
    if (recommendedRotatorTimer) {
        clearInterval(recommendedRotatorTimer);
        recommendedRotatorTimer = null;
    }
}

function pickRandomProducts(count) {
    const pool = (WHOLESALE_PRICES || []).filter(p => !isTestProductName(p.name));
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = pool[i];
        pool[i] = pool[j];
        pool[j] = tmp;
    }
    return pool.slice(0, Math.min(count, pool.length));
}

function formatCardPrice(product) {
    let displayPrice = product.price || '';
    if (displayPrice && !displayPrice.toLowerCase().includes('market') && !displayPrice.includes('/')) {
        displayPrice += '/ea';
    }
    return displayPrice;
}



function getProductImagePath(product) {
    const name = String((product && product.name) || '');
    const rules = [
        { match: /thin green line/i, file: 'Green Line Bully Stick (Full picture).jpg' },
        { match: /regular green line/i, file: 'Green Line Reg Bully Stick.jpg' },
        { match: /green line/i, file: 'Green Line Bully Stick (Full picture).jpg' },
        { match: /12.?[”"].*(super thick|thick)/i, file: '12in Bully Stick (Full Product).jpg' },
        { match: /6.?[”"].*(super thick|thick)/i, file: '6in Thick Bully Stick (Full Product).jpg' },
        { match: /bully cane/i, file: 'Bully Canes .jpg' },
        { match: /braided bully/i, file: 'Braided Bully (Full Picture).jpg' },
        { match: /12.?[”"].*euro bully/i, file: 'Euro Bully Stick 12in .jpg' },
        { match: /euro bully/i, file: 'Euro Bully Stick 6 in. .jpg' },
        { match: /chicken jerky/i, file: 'Chicken Jerky (Full Shot).jpg' },
        { match: /turkey jerky stuffed/i, file: 'Stuffed Buffalo Bone (End Shot).jpg' },
        { match: /turkey jerky/i, file: 'Turkey Jerky (Full Shot).jpg' },
        { match: /elky.*stuffed buffalo/i, file: 'Elk Jerky Stuffed Buffalo Bone (Close up of Jerky).jpg' },
        { match: /elky jerky|elky training/i, file: 'Elky Sticks  (Full Shot).jpg' },
        { match: /stuffed buffalo/i, file: 'Stuffed Buffalo Bone (End Shot).jpg' },
        { match: /beef jerky|jerky treats/i, file: 'Jerky Squares Full Product shot.jpg' },
        { match: /hairy beef ear|hairy cow ear/i, file: 'Hairy Cow Ears (Full Product).jpg' },
        { match: /vanilla cow ear/i, file: 'Vanilla Cow Ear (Full Shot).jpg' },
        { match: /buffalo ear/i, file: 'Buffalo Ears (Full Product Shot).jpg' },
        { match: /pig ear/i, file: 'Pig Ear (Full Shot).jpg' },
        { match: /rabbit ear/i, file: 'Rabbitt ears (full product).jpg' },
        { match: /rabbit feet/i, file: 'Rabbit Feet (Full Product Shot).jpg' },
        { match: /peanut butter rollio/i, file: 'Peanut Butter Rollio (Full Shot).jpg' },
        { match: /honey smoked phat/i, file: 'Honey Smoked Phat Rollio (Full Shot).jpg' },
        { match: /vanilla phat/i, file: 'Vanilla Phat Rollio 6 in. .jpg' },
        { match: /phat rollio/i, file: 'Phat Rollio (Full Shot).jpg' },
        { match: /honey smoked rollio/i, file: 'Honey Smoked Rollio (Upright).jpg' },
        { match: /vanilla rollio/i, file: 'Vanilla Rollio.jpg' },
        { match: /rollio/i, file: 'Regular Rollio 12in. (Full Product).jpg' },
        { match: /cheek slab/i, file: 'Beef Cheek Slab (Full Shot).jpg' },
        { match: /chunky cheek/i, file: 'Chunky Chow Cheek Pieces.jpg' },
        { match: /duck neck/i, file: 'Duck Neck (full shot).jpg' },
        { match: /duck head/i, file: 'Duck heads (Full Shot).jpg' },
        { match: /duck feet|duck foot/i, file: 'Duck Feet (Multiple).jpg' },
        { match: /goose neck/i, file: 'Goose Neck (Full Shot).jpg' },
        { match: /chicken feet/i, file: 'Chicken Feet (full Shot).jpg' },
        { match: /super meaty beef tendon/i, file: 'Super Meaty Beef Tendons.jpg' },
        { match: /beef wrapped corium|corium/i, file: 'Beef Wrapped Corium (Full Shot).jpg' },
        { match: /paddywack/i, file: 'Beef Tendon 6in. (Full Shot).jpg' },
        { match: /beef lung/i, file: 'Beef Lung (Full Poduct).jpg' },
        { match: /trachea/i, file: 'Beef Trachea 12in (Full Product).jpg' },
        { match: /buffalo horn/i, file: 'Buffalo Horn.jpg' },
        { match: /rams horn/i, file: 'Rams Horn (Full Product).jpg' },
        { match: /buffalo knuckle|meaty buffalo bone/i, file: 'Buffalo End Bone (Full Product) .jpg' },
        { match: /femur/i, file: 'Large Femur Bone (Full Product).jpg' },
        { match: /hide donut|braided usa hide|pressed ring/i, file: 'Large Hide Ring (Full Product).jpg' }
    ];
    for (let i = 0; i < rules.length; i++) {
        if (rules[i].match.test(name)) {
            return encodeURI('media/' + rules[i].file);
        }
    }
    return 'media/placeholder-bully-stick.png';
}

const PRODUCT_IMAGE_GALLERY = {
    // key = group title or product name (normalized match below)
    'Bully Canes': ['media/Bully Canes .jpg'],
    'Green Line Bully Sticks': [
        'media/Green Line Bully Stick (Full picture).jpg',
        'media/Green Line Reg Bully Stick.jpg'
    ]
};

function getProductImagePaths(productOrTitle) {
    const title = typeof productOrTitle === 'string'
        ? productOrTitle
        : ((productOrTitle && productOrTitle.name) || '');
    const group = getCombinedGroupForName(title);
    const galleryKey = group ? group.title : title;
    const fromMap = PRODUCT_IMAGE_GALLERY[galleryKey];
    if (fromMap && fromMap.length) {
        return fromMap.map(f => encodeURI(f));
    }
    const single = getProductImagePath(
        typeof productOrTitle === 'string' ? { name: productOrTitle } : productOrTitle
    );
    return single ? [single] : ['media/placeholder-bully-stick.png'];
}

let _imageLightboxTimer = null;

function closeProductImageLightbox() {
    if (_imageLightboxTimer) {
        clearInterval(_imageLightboxTimer);
        _imageLightboxTimer = null;
    }
    document.getElementById('product-image-lightbox')?.remove();
}

function openProductImageLightbox(paths, startIndex) {
    closeProductImageLightbox();
    const list = (paths || []).filter(Boolean);
    if (!list.length) return;
    let index = Math.max(0, Math.min(startIndex || 0, list.length - 1));

    const modal = document.createElement('div');
    modal.id = 'product-image-lightbox';
    modal.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[1000] p-4';
    modal.onclick = (e) => {
        if (e.target === modal) closeProductImageLightbox();
    };

    const frame = document.createElement('div');
    frame.className = 'relative bg-white rounded-2xl border-2 border-[#6B4423] p-3 max-w-3xl w-full max-h-[90vh] flex flex-col items-center';
    frame.onclick = (e) => e.stopPropagation();

    const img = document.createElement('img');
    img.alt = 'Product photo';
    img.className = 'max-h-[70vh] w-auto max-w-full object-contain rounded-xl';
    img.src = list[index];
    img.onerror = function () {
        this.onerror = null;
        this.src = 'media/placeholder-bully-stick.png';
    };

    const caption = document.createElement('p');
    caption.className = 'text-sm text-[#6B4423] mt-2 font-semibold';

    function show(i) {
        index = (i + list.length) % list.length;
        img.src = list[index];
        caption.textContent = list.length > 1
            ? (index + 1) + ' / ' + list.length
            : '';
    }

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'absolute top-2 right-3 text-2xl text-[#6B4423] leading-none';
    closeBtn.textContent = '×';
    closeBtn.onclick = closeProductImageLightbox;

    frame.appendChild(closeBtn);
    frame.appendChild(img);
    frame.appendChild(caption);

    if (list.length > 1) {
        const nav = document.createElement('div');
        nav.className = 'flex gap-3 mt-3';
        const prev = document.createElement('button');
        prev.type = 'button';
        prev.className = 'px-4 py-2 border-2 border-[#6B4423] rounded-xl font-semibold text-[#1E4D2B]';
        prev.textContent = '‹ Prev';
        prev.onclick = () => show(index - 1);
        const next = document.createElement('button');
        next.type = 'button';
        next.className = 'px-4 py-2 border-2 border-[#6B4423] rounded-xl font-semibold text-[#1E4D2B]';
        next.textContent = 'Next ›';
        next.onclick = () => show(index + 1);
        nav.appendChild(prev);
        nav.appendChild(next);
        frame.appendChild(nav);

        _imageLightboxTimer = setInterval(() => show(index + 1), 10000);
    }

    modal.appendChild(frame);
    document.body.appendChild(modal);
    show(index);
}

const COMBINED_CARD_GROUPS = [
    {
        id: 'green-line',
        title: 'Green Line Bully Sticks',
        mode: 'single',
        dims: ['greenStyle', 'size'],
        names: [
            '6” Thin Green Line Bully Sticks (Bulk)',
            '12” Thin Green Line Bully Sticks (Bulk)',
            '6” Regular Green Line Bully Sticks (Bulk)',
            '12” Regular Green Line Bully Sticks (Bulk)',
            '6” “Thick” Green Line Bully Sticks (Bulk)',
            '12” “Thick” Green Line Bully Sticks (Bulk)',
            '6” “Super Thick” Green Line Bully Sticks (Bulk)',
            '12” “Super Thick” Green Line Bully Sticks (Bulk)'
        ]
    },
    {
        id: 'bully-canes',
        title: 'Bully Canes',
        mode: 'single',
        dims: ['size'],
        names: ['24-28” Bully Cane', '32-36” Bully Cane']
    },
    {
        id: 'braided-bully',
        title: 'Braided Bully Sticks',
        mode: 'single',
        dims: ['braidStyle', 'size'],
        names: [
            '6” Braided Bully Sticks (Bulk)',
            '12” Braided Bully Sticks (Bulk)',
            '6” “Super” Braided Bully Sticks (Bulk)',
            '12” “Super” Braided Bully Sticks (Bulk)'
        ]
    },
    {
        id: 'euro-bully',
        title: 'Euro Bully Sticks',
        mode: 'single',
        dims: ['size', 'pack'],
        names: [
            '6” Euro Bully Stick (Bulk)',
            '6” Euro Bully Stick (Display)',
            '12” Euro Bully Stick (Bulk)',
            '12” Euro Bully Sticks (Display)'
        ]
    },
    {
        id: 'bully-pieces',
        title: 'Bully Pieces',
        mode: 'single',
        dims: ['bag'],
        names: [
            '8oz. Bag of Bully Pieces',
            '10oz. Bag of Bully Pieces',
            '16oz. Bag of Bully Pieces'
        ]
    },
    {
        id: 'beef-jerky',
        title: 'USA Beef Jerky Treats',
        mode: 'single',
        dims: ['pack'],
        names: ['USA Beef Jerky Treats (Bulk)', 'USA Beef Jerky Treats (Display)']
    },
    {
        id: 'turkey-jerky',
        title: 'USA Turkey Jerky Treats',
        mode: 'single',
        dims: ['pack'],
        names: ['USA Turkey Jerky Treats (Bulk)', 'USA Turkey Jerky Treats (Display)']
    },
    {
        id: 'chicken-jerky',
        title: 'USA Chicken Jerky Treats',
        mode: 'single',
        dims: ['pack'],
        names: ['USA Chicken Jerky Treats (Bulk)', 'USA Chicken Jerky Treats (Display)']
    },
    {
        id: 'elky-jerky',
        title: 'USA Elky Jerky Treats',
        mode: 'single',
        dims: ['pack'],
        names: ['USA Elky Jerky Treats (Bulk)', 'USA Elky Jerky Treats (Display)']
    },
    {
        id: 'venison-jerky',
        title: 'USA Venison & Sweet Potato Jerky',
        mode: 'single',
        dims: ['pack'],
        names: [
            'USA Venison & Sweet Potato Jerky Treats (Bulk)',
            'USA Venison & Sweet Potato Jerky Treats (Display)'
        ]
    },
    {
        id: 'elky-training',
        title: 'USA Elky Training Treats',
        mode: 'single',
        dims: ['bag'],
        names: [
            '6oz. Bags of USA Elky Training Treats',
            '10oz. Bags of USA Elky Training Treats',
            '16oz. Bags of USA Elky Training Treats',
            'USA Elky Training Treats (per lb.)'
        ]
    },
    {
        id: 'cow-ears',
        title: 'Cow Ears',
        mode: 'multi',
        labelDim: 'flavor',
        names: [
            'Natural Cow Ears (Bulk)',
            'Vanilla Cow Ears (Bulk)',
            'Honey Smoked Cow Ears (Bulk)'
        ]
    },
    {
        id: 'cow-ears-6pack',
        title: '6-Pack Cow Ears',
        mode: 'multi',
        labelDim: 'flavor',
        names: [
            '6-Pack Natural Cow Ears',
            '6-Pack Vanilla Cow Ears',
            '6-Pack Honey Smoked Cow Ears'
        ]
    },
    {
        id: 'buffalo-ears',
        title: 'Buffalo Ears',
        mode: 'multi',
        labelDim: 'flavor',
        names: [
            'MAGNA Buffalo Ears (Bulk)',
            'Honey Smoked MAGNA Buffalo Ears (Bulk)'
        ]
    },
    {
        id: 'lamb-ears',
        title: 'Lamb Ears',
        mode: 'multi',
        labelDim: 'flavor',
        names: ['White Lamb Ears (Bulk)', 'Vanilla Lamb Ears (Bulk)']
    },
    {
        id: 'hairy-beef-ears',
        title: 'Hairy Beef Ears',
        mode: 'single',
        dims: ['format'],
        names: ['Hairy Beef Ears (Bulk)', '5-Pack Hairy Beef Ears']
    },
    {
        id: 'rabbit-ears',
        title: 'Fuzzy Rabbit Ears',
        mode: 'single',
        dims: ['format'],
        names: ['Fuzzy Rabbit Ears (Bulk)', '10-Pack Fuzzy Rabbit Ears']
    },
    {
        id: 'rabbit-feet',
        title: 'Fuzzy Rabbit Feet',
        mode: 'single',
        dims: ['format'],
        names: ['Fuzzy Rabbit Feet (Bulk)', '10-Pack Fuzzy Rabbit Feet']
    },
    {
        id: 'natural-rollio',
        title: 'Natural Rollio',
        mode: 'single',
        dims: ['size'],
        names: ['5-6” Natural Rollio (Bulk)', '10-12” Natural Rollio (Bulk)']
    },
    {
        id: 'regular-rollio',
        title: 'Regular Rollio',
        mode: 'single',
        dims: ['size'],
        names: ['5-6” Regular Rollio (Bulk)', '10-12” Regular Rollio (Bulk)']
    },
    {
        id: 'vanilla-rollio',
        title: 'Vanilla Rollio',
        mode: 'single',
        dims: ['size'],
        names: ['5-6” Vanilla Rollio (Bulk)', '10-12” Vanilla Rollio (Bulk)']
    },
    {
        id: 'honey-rollio',
        title: 'Honey Smoked Rollio',
        mode: 'single',
        dims: ['size'],
        names: ['5-6” Honey Smoked Rollio (Bulk)', '10-12” Honey Smoked Rollio (Bulk)']
    },
    {
        id: 'phat-rollio',
        title: 'PHAT Rollio',
        mode: 'single',
        dims: ['phatStyle', 'size'],
        names: [
            '5-6” PHAT Rollio (Bulk)',
            '10-12” PHAT Rollio (Bulk)',
            '5-6” Vanilla PHAT Rollio (Bulk)',
            '10-12” Vanilla PHAT Rollio (Bulk)',
            '5-6” Honey Smoked PHAT Rollio (Bulk)',
            '10-12” Honey Smoked PHAT Rollio (Bulk)'
        ]
    },
    {
        id: 'pb-rollio',
        title: 'Peanut Butter Rollio',
        mode: 'single',
        dims: ['size'],
        names: ['5-6” Peanut Butter Rollio (Bulk)', '10-12” Peanut Butter Rollio (Bulk)']
    },
    {
        id: 'cheek-slabs',
        title: 'Cow Cheek Slabs',
        mode: 'single',
        dims: ['cheekFlavor', 'size'],
        names: [
            '5-6” Cow Cheek Slab (Bulk per lb.)',
            '5-6” Vanilla Cow Cheek Slab (Bulk per lb.)',
            '10-12” Cow Cheek Slab (Bulk per lb.)',
            '10-12” Vanilla Cow Cheek Slab (Bulk per lb.)',
            '10-12” Natural Cow Cheek Slabs (Bulk per lb.)'
        ]
    },
    {
        id: 'chunky-bulk',
        title: 'Chunky Cheeks (Bulk)',
        mode: 'multi',
        labelDim: 'flavor',
        names: ['White Chunky Cheeks (Bulk)', 'Vanilla Chunky Cheeks (Bulk)']
    },
    {
        id: 'chunky-bags',
        title: 'Chunky Cheeks (Bags)',
        mode: 'single',
        dims: ['flavor', 'bag'],
        names: [
            '8oz. Bags of White Chunky Cheeks',
            '8oz. Bags of Vanilla Chunky Cheeks',
            '16oz. Bags of White Chunky Cheeks',
            '16oz. Bags of Vanilla Chunky Cheeks'
        ]
    },
    {
        id: 'magna-ox',
        title: 'MAGNA Ox Tails',
        mode: 'single',
        dims: ['size'],
        names: ['6” MAGNA Natural Ox Tails (Bulk)', '12” MAGNA Natural Ox Tails (Bulk)']
    },
    {
        id: 'ox-tails',
        title: 'Ox Tails',
        mode: 'single',
        dims: ['flavor', 'size'],
        names: [
            '6” White Ox Tails (Bulk)',
            '12” White Ox Tails (Bulk)',
            '6” Vanilla Ox Tails (Bulk)',
            '12” Vanilla Ox Tails (Bulk)',
            '6” Honey Smoked Ox Tails (Bulk)',
            '12” Honey Smoked Ox Tails (Bulk)'
        ]
    },
    {
        id: 'duck-necks',
        title: 'Duck Necks',
        mode: 'single',
        dims: ['format'],
        names: ['Crunchy Baked Duck Necks (Bulk)', '10-Pack of Crunchy Duck Necks']
    },
    {
        id: 'duck-heads',
        title: 'Duck Heads',
        mode: 'single',
        dims: ['format'],
        names: [
            'Crunchy Baked Duck Heads (Bulk)',
            '5-Pack of Crunchy Duck Heads',
            '10-Pack of Duck Heads'
        ]
    },
    {
        id: 'duck-feet',
        title: 'Euro Duck Feet',
        mode: 'single',
        dims: ['format'],
        names: [
            'Euro Duck Feet (Bulk)',
            'Euro Duck Feet (Display)',
            '10-Pack Euro Duck Feet'
        ]
    },
    {
        id: 'goose-necks',
        title: 'Goose Necks',
        mode: 'single',
        dims: ['format'],
        names: ['Goose Neck (Bulk)', '10-Pack of Crunchy Goose Necks']
    },
    {
        id: 'chicken-feet',
        title: 'Chicken Feet',
        mode: 'single',
        dims: ['chickenStyle', 'format'],
        names: [
            'Crunchy Euro Chicken Feet (Bulk)',
            'Euro White Chicken Feet (Bulk)',
            'Vanilla Flavored White Euro Chicken Feet (Bulk)',
            '10-Pack Euro Chicken Feet',
            '10-Pack White Euro Chicken Feet',
            '10-Pack Vanilla Euro Chicken Feet'
        ]
    },
    {
        id: 'stuffed-bones',
        title: 'Stuffed Buffalo Bones',
        mode: 'multi',
        labelDim: 'stuffedFlavor',
        names: [
            'Large Turkey Jerky Stuffed Buffalo Bone',
            'Large Elky Jerky Stuffed Buffalo Bone',
            'Large Venison and Sweet Potato Stuffed Buffalo Bone',
            'Large Peanut Butter Stuffed Buffalo Bone'
        ]
    },
    {
        id: 'paddywack',
        title: 'Paddywacks',
        mode: 'single',
        dims: ['size'],
        names: ['6” Paddywack (Bulk)', '12” Paddywack (Bulk)']
    },
    {
        id: 'corium',
        title: 'Corium Sticks',
        mode: 'single',
        dims: ['coriumStyle', 'size'],
        names: [
            '6” Corium Sticks (Bulk)',
            '12” Corium Sticks (Bulk)',
            '6” Beef Wrapped Corium Sticks (Bulk)',
            '12” Beef Wrapped Corium Sticks (Bulk)'
        ]
    },
    {
        id: 'beef-lung',
        title: 'Beef Lung',
        mode: 'single',
        dims: ['bag'],
        names: ['8oz. Bag of Beef Lung', '16oz. Bag of Beef Lung']
    },
    {
        id: 'beef-trachea',
        title: 'Beef Trachea',
        mode: 'single',
        dims: ['size'],
        names: ['5-6” Beef Trachea', '10-13” Beef Trachea']
    },
    {
        id: 'trachea-pieces',
        title: 'Beef Trachea Pieces',
        mode: 'single',
        dims: ['bag'],
        names: [
            '8oz. Bags of Beef Trachea Pieces',
            '16oz. Bags of Beef Trachea Pieces'
        ]
    },
    {
        id: 'buffalo-horns',
        title: 'Buffalo Horns',
        mode: 'single',
        dims: ['hornSize'],
        names: [
            'Large Buffalo Horn (Bulk)',
            'Medium Buffalo Horn (Bulk)',
            'Small Buffalo Horn (Bulk)'
        ]
    },
    {
        id: 'rams-horns',
        title: 'Rams Horns',
        mode: 'single',
        dims: ['hornSize'],
        names: [
            'Large Rams Horn (Bulk)',
            'Medium Rams Horn (Bulk)',
            'Small Rams Horn (Bulk)'
        ]
    },
    {
        id: 'hooves',
        title: 'Cow Hooves',
        mode: 'single',
        dims: ['hoofStyle'],
        names: [
            'Regular Cow Hooves (Bulk)',
            'Smoked Cow Hooves (Bulk)',
            '“Super” Cow Hooves (Bulk)'
        ]
    },
    {
        id: 'braided-esophagus',
        title: 'Braided Esophagus',
        mode: 'single',
        dims: ['size', 'pack'],
        names: [
            '6” Braided Esophagus (Bulk)',
            '12” Braided Esophagus (Bulk)',
            '6” Braided Esophagus (Display)',
            '12” Braided Esophagus (Display)'
        ]
    },
    {
        id: 'hide-donuts',
        title: 'USA Hide Braided Donuts',
        mode: 'single',
        dims: ['donutFlavor', 'size'],
        names: [
            '5-7” Braided USA Hide Donuts (Bulk)',
            '5-7” Vanilla USA Hide Braided Donuts (Bulk)',
            '8-9” Braided USA Hide Donuts (Bulk)',
            '8-9” Vanilla USA Hide Braided Donuts (Bulk)',
            '10-11” Braided USA Hide Donuts (Bulk)',
            '10-11” Vanilla USA Hide Braided Donuts (Bulk)'
        ]
    },
    {
        id: 'pressed-bones',
        title: 'Pressed Bones',
        mode: 'single',
        dims: ['size'],
        names: [
            '4.5” Pressed Bone (Bulk)',
            '6.5” Pressed Bone (Bulk)',
            '8.5” Pressed Bone (Bulk)',
            '10.5” Pressed Bone (Bulk)',
            '12.5” Pressed Bone (Bulk)'
        ]
    },
    {
        id: 'twisty-qs',
        title: 'Twisty Q’s',
        mode: 'single',
        dims: ['flavor'],
        names: ['10” White Twisty Q’s (Bulk)', '10” Vanilla Twisty Q’s (Bulk)']
    },
    {
        id: 'retrievers',
        title: 'Supreme Retrievers',
        mode: 'single',
        dims: ['retrieverStyle', 'size'],
        names: [
            '6/9” White Supreme Retriever (Bulk)',
            '10-11” x 30mm White Supreme Retriever (Bulk)',
            '6/9” Vanilla Supreme Retriever (Bulk)',
            '10-11” x 30mm Vanilla MAGNA Retriever (Bulk)'
        ]
    },
    {
        id: 'supreme-chips-bulk',
        title: 'Supreme Hide Chips (Bulk)',
        mode: 'multi',
        labelDim: 'chipFlavor',
        names: [
            'White USA Supreme Hide Chips (Bulk per lb.)',
            'Vanilla USA Supreme Chips (Bulk per lb.)',
            'Peanut Butter Basted USA Supreme Hide Chips (Bulk per lb.)'
        ]
    },
    {
        id: 'binkeys',
        title: 'Binky’s Supreme Chips',
        mode: 'single',
        dims: ['chipFlavor', 'bag'],
        names: [
            '8oz. Bags of White Supreme Chips (Binkey’s)',
            '8oz. Bags of Peanut Butter Supreme Chips (Binkey’s)',
            '8oz. Bags of Vanilla Supreme Chips (Binkey’s)',
            '16oz. Bags of White Supreme Chips (Binkey’s)',
            '16oz. Bags of Peanut Butter Supreme Chips (Binkey’s)',
            '16oz. Bags of Vanilla Supreme Chips (Binkey’s)'
        ]
    }
];

function getCombinedGroupForName(name) {
    const want = normalizeProductName(name);
    return COMBINED_CARD_GROUPS.find(g =>
        g.names.some(n => normalizeProductName(n) === want)
    ) || null;
}

function parseCaseQty(cs) {
    const m = String(cs || '').replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
    return m ? Math.round(Number(m[1])) : 0;
}

function appendProductCards(grid, products) {
    const seen = {};
    (products || []).forEach(product => {
        const group = getCombinedGroupForName(product.name);
        if (group) {
            if (seen[group.id]) return;
            seen[group.id] = true;
            grid.appendChild(buildCombinedCard(group));
            return;
        }
        grid.appendChild(buildProductCard(product));
    });
}

function extractVariantDim(dim, product) {
    const n = String((product && product.name) || '');
    switch (dim) {
        case 'size': {
            const m = n.match(/(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s*[”"]/);
            if (m) return m[1] + '”';
            const m2 = n.match(/(\d+\/\d+)\s*[”"]/);
            if (m2) return m2[1] + '”';
            return '';
        }
        case 'pack':
            if (/\bdisplay\b/i.test(n)) return 'Display';
            if (/\bbulk\b/i.test(n)) return 'Bulk';
            return '';
        case 'bag': {
            const m = n.match(/(\d+)\s*oz/i);
            if (m) return m[1] + 'oz';
            if (/per lb/i.test(n)) return 'per lb';
            return '';
        }
        case 'format':
            if (/10-pack/i.test(n)) return '10-Pack';
            if (/5-pack/i.test(n)) return '5-Pack';
            if (/6-pack/i.test(n)) return '6-Pack';
            if (/\bdisplay\b/i.test(n)) return 'Display';
            if (/\bbulk\b/i.test(n)) return 'Bulk';
            return 'Standard';
        case 'greenStyle':
            if (/thin/i.test(n)) return 'Thin';
            if (/super thick/i.test(n)) return 'Super Thick';
            if (/thick/i.test(n)) return 'Thick';
            if (/regular/i.test(n)) return 'Regular';
            return '';
        case 'braidStyle':
            if (/[“"]super[”"]/i.test(n) || /super”|super"/.test(n)) return 'Super';
            return 'Regular';
        case 'flavor':
            if (/honey smoked/i.test(n)) return 'Honey Smoked';
            if (/vanilla/i.test(n)) return 'Vanilla';
            if (/peanut butter/i.test(n)) return 'Peanut Butter';
            if (/natural/i.test(n)) return 'Natural';
            if (/\bwhite\b/i.test(n)) return 'White';
            if (/magna/i.test(n)) return 'MAGNA';
            return '';
        case 'phatStyle':
            if (/honey smoked/i.test(n)) return 'Honey Smoked';
            if (/vanilla/i.test(n)) return 'Vanilla';
            return 'Natural';
        case 'cheekFlavor':
            if (/vanilla/i.test(n)) return 'Vanilla';
            return 'Natural';
        case 'chickenStyle':
            if (/vanilla/i.test(n)) return 'Vanilla';
            if (/white/i.test(n)) return 'White';
            return 'Crunchy Euro';
        case 'hornSize':
            if (/large/i.test(n)) return 'Large';
            if (/medium/i.test(n)) return 'Medium';
            if (/small/i.test(n)) return 'Small';
            return '';
        case 'hoofStyle':
            if (/super/i.test(n)) return 'Super';
            if (/smoked/i.test(n)) return 'Smoked';
            return 'Regular';
        case 'coriumStyle':
            if (/beef wrapped/i.test(n)) return 'Beef Wrapped';
            return 'Plain';
        case 'chipFlavor':
            if (/peanut butter/i.test(n)) return 'Peanut Butter';
            if (/vanilla/i.test(n)) return 'Vanilla';
            if (/white/i.test(n)) return 'White';
            return '';
        case 'retrieverStyle':
            if (/vanilla/i.test(n)) return 'Vanilla';
            return 'White';
        case 'donutFlavor':
            if (/vanilla/i.test(n)) return 'Vanilla';
            return 'Natural';
        case 'stuffedFlavor':
            if (/turkey/i.test(n)) return 'Turkey';
            if (/elky/i.test(n)) return 'Elky';
            if (/venison/i.test(n)) return 'Venison';
            if (/peanut butter/i.test(n)) return 'Peanut Butter';
            return '';
        default:
            return '';
    }
}

const DOG_SIZE_META = [
    { key: 'XS', label: 'Chihuahua', scale: 0.55, img: 'media/dog-xs-chihuahua.png' },
    { key: 'S', label: 'Beagle', scale: 0.7, img: 'media/dog-s-beagle.png' },
    { key: 'M', label: 'GSP', scale: 0.85, img: 'media/dog-m-gsp.png' },
    { key: 'L', label: 'Labrador', scale: 1.0, img: 'media/dog-l-labrador.png' },
    { key: 'XL', label: 'St. Bernard', scale: 1.2, img: 'media/dog-xl-stbernard.png' }
];

function getProductDescription(productName) {
    const entry = ITEM_SPECIFIC_BENEFITS && ITEM_SPECIFIC_BENEFITS[productName];
    if (!entry || !entry.bullets || !entry.bullets.length) {
        // try normalized key match
        const want = normalizeProductName(productName);
        const key = Object.keys(ITEM_SPECIFIC_BENEFITS || {}).find(
            k => normalizeProductName(k) === want
        );
        const found = key ? ITEM_SPECIFIC_BENEFITS[key] : null;
        if (!found || !found.bullets || !found.bullets.length) return '';
        return found.bullets.slice(0, 2).join(' ');
    }
    return entry.bullets.slice(0, 2).join(' ');
}

function getRecommendedDogSizes(productName) {
    const n = String(productName || '').toLowerCase();
    if (/thin/.test(n)) return ['XS', 'S'];
    if (/super thick|super”|“super”/.test(n)) return ['L', 'XL'];
    if (/thick/.test(n)) return ['M', 'L'];
    if (/cane|24-28|32-36|femur|large meaty|jumbo/.test(n)) return ['L', 'XL'];
    if (/braided|phat|rollio|cheek slab/.test(n)) return ['M', 'L', 'XL'];
    if (/6\s*[”"]/.test(n) && !/12/.test(n)) return ['XS', 'S', 'M'];
    if (/12\s*[”"]|10-12|10-13/.test(n)) return ['S', 'M', 'L'];
    if (/ear|feet|foot|neck|trachea|lung|jerky|chip/.test(n)) return ['XS', 'S', 'M', 'L'];
    if (/horn|hoof|bone|knuckle/.test(n)) return ['M', 'L', 'XL'];
    return ['S', 'M', 'L'];
}

function buildCardDescriptionEl() {
    const el = document.createElement('p');
    el.className = 'card-desc';
    return el;
}

function buildDogSizeRow() {
    const wrap = document.createElement('div');
    wrap.className = 'card-sizes';

    const title = document.createElement('p');
    title.className = 'card-sizes-label';
    title.textContent = 'Recommended size';
    wrap.appendChild(title);

    const row = document.createElement('div');
    row.className = 'card-sizes-row';

    DOG_SIZE_META.forEach(size => {
        const item = document.createElement('div');
        item.className = 'card-size-item';
        item.setAttribute('data-size', size.key);

        const icon = document.createElement('div');
        icon.className = 'card-size-icon';
        const px = Math.round(36 + (size.scale - 0.55) * 40);
        icon.style.width = px + 'px';
        icon.style.height = Math.round(px * 0.7) + 'px';

        const img = document.createElement('img');
        img.src = size.img;
        img.alt = size.label;
        img.draggable = false;
        icon.appendChild(img);

        const key = document.createElement('span');
        key.className = 'card-size-key';
        key.textContent = size.key;

        const label = document.createElement('span');
        label.className = 'card-size-name';
        label.textContent = size.label;

        item.appendChild(icon);
        item.appendChild(key);
        item.appendChild(label);
        row.appendChild(item);
    });

    wrap.appendChild(row);
    return wrap;
}

function updateCardDescription(el, productName) {
    if (!el) return;
    const text = getProductDescription(productName);
    el.textContent = text || '';
    el.style.display = text ? '' : 'none';
}

function updateDogSizeRow(wrap, productName) {
    if (!wrap) return;
    const active = getRecommendedDogSizes(productName);
    wrap.querySelectorAll('.card-size-item').forEach(item => {
        const key = item.getAttribute('data-size');
        item.classList.toggle('active', active.indexOf(key) !== -1);
    });
}

function buildCombinedCard(group) {
    const variants = group.names.map(findCatalogProduct).filter(Boolean);
    const fallback = variants[0] || { name: group.title, cs: '', price: '', category: '' };
    const card = document.createElement('div');
    card.className = 'wholesale-product-card';

    const photo = document.createElement('div');
    photo.className = 'card-photo';
    const img = document.createElement('img');
    img.src = getProductImagePath(fallback);
    img.alt = group.title;
    img.onerror = function () {
        this.onerror = null;
        this.src = 'media/placeholder-bully-stick.png';
    };
    photo.appendChild(img);
    photo.style.cursor = 'pointer';
    photo.title = 'Click to enlarge';
    photo.onclick = () => {
        const currentName = (img.alt && img.alt !== group.title) ? img.alt : (fallback.name || group.title);
        openProductImageLightbox(getProductImagePaths(currentName), 0);
    };

    const body = document.createElement('div');
    body.className = 'card-body';

    const name = document.createElement('h3');
    name.className = 'card-name';
    name.textContent = group.title;

    const meta = document.createElement('p');
    meta.className = 'card-meta';

    const descEl = buildCardDescriptionEl();
    const sizeRow = buildDogSizeRow();

    const qtyRow = document.createElement('div');
    qtyRow.className = 'card-qty-row';
    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.min = '1';
    qtyInput.value = '1';
    const qtyWrap = document.createElement('div');
    qtyWrap.className = 'card-qty-input-wrap';
    qtyInput.className = 'card-qty-input';
    qtyWrap.appendChild(qtyInput);
    const unitsLabel = document.createElement('span');
    unitsLabel.className = 'card-qty-units-inside';
    unitsLabel.textContent = 'units';
    qtyWrap.appendChild(unitsLabel);
    qtyRow.appendChild(qtyWrap);

    // Kept for easy revert of qty chips later (not used in UI right now)
    const caseRow = document.createElement('div');
    caseRow.className = 'card-qty-row card-case-row';
    function caseQtyFor(product) {
        return parseCaseQty(product && product.cs);
    }
    function addQtyChip(label, getValue, row) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'card-qty-chip';
        chip.textContent = label;
        chip.onclick = () => {
            const n = getValue();
            if (n > 0) qtyInput.value = String(n);
        };
        (row || qtyRow).appendChild(chip);
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card-add';
    btn.textContent = 'Add to Quote';

    function syncCombinedOosButton(productName) {
        if (typeof isWholesaleOos === 'function' && isWholesaleOos(productName)) {
            btn.disabled = true;
            btn.textContent = wholesaleOosLabel(productName) || 'Out of Stock';
        } else {
            btn.disabled = false;
            btn.textContent = 'Add to Quote';
        }
    }

    body.appendChild(name);
    body.appendChild(meta);

    if (group.mode === 'multi') {
        const selected = {};
        const labelDim = group.labelDim || 'flavor';
        const flavorRow = document.createElement('div');
        flavorRow.className = 'card-options';

        function selectedVariants() {
            return variants.filter(v => selected[v.name]);
        }

        function refreshMulti() {
            const chosen = selectedVariants();
            const preview = chosen[0] || fallback;
            img.src = getProductImagePath(preview);
            img.alt = preview.name;
            if (!chosen.length) {
                meta.textContent = 'Select one or more options';
            } else if (chosen.length === 1) {
                const csText = chosen[0].cs ? ('Case size ' + chosen[0].cs) : '';
                meta.textContent = [csText, formatCardPrice(chosen[0])].filter(Boolean).join(' · ');
            } else {
                meta.textContent = chosen.length + ' options selected';
            }
            Array.from(flavorRow.children).forEach(el => {
                el.classList.toggle('active', !!selected[el.getAttribute('data-name')]);
            });
            const descName = (chosen[0] || preview).name;
            updateCardDescription(descEl, descName);
            updateDogSizeRow(sizeRow, descName);
            syncCombinedOosButton(descName);
        }

        variants.forEach(v => {
            const opt = document.createElement('button');
            opt.type = 'button';
            opt.className = 'card-option-btn';
            opt.textContent = extractVariantDim(labelDim, v) || v.name;
            opt.setAttribute('data-name', v.name);
            opt.onclick = () => {
                selected[v.name] = !selected[v.name];
                refreshMulti();
            };
            flavorRow.appendChild(opt);
        });
        if (variants[0]) selected[variants[0].name] = true;

        btn.onclick = () => {
            if (window._customerIsInactive) {
                alert('This account is currently inactive and cannot add items to a quote.');
                return;
            }
            const chosen = selectedVariants();
            if (!chosen.length) {
                alert('Select at least one option.');
                return;
            }
            if (chosen.some(function (v) { return isWholesaleOos(v.name); })) {
                alert(wholesaleOosLabel(chosen[0].name) || 'One or more selected items are out of stock.');
                return;
            }
            chosen.forEach(v => addToQuote(v.name, v.price || '', v.cs || '', qtyInput.value));
        };

        body.appendChild(flavorRow);
        body.appendChild(descEl);
        body.appendChild(sizeRow);
        body.appendChild(qtyRow);
        body.appendChild(btn);
        refreshMulti();
    } else {
        const dims = group.dims || ['size'];
        let selected = variants[0] || fallback;
        const state = {};
        dims.forEach(d => {
            state[d] = extractVariantDim(d, selected);
        });
        const rows = {};

        function findSelected() {
            return variants.find(v => dims.every(d => extractVariantDim(d, v) === state[d]))
                || variants.find(v => dims.filter(d => state[d]).every(d => extractVariantDim(d, v) === state[d]))
                || variants[0]
                || fallback;
        }

        function refreshSingle() {
            selected = findSelected();
            const csText = selected.cs ? ('Case size ' + selected.cs) : '';
            meta.textContent = [csText, formatCardPrice(selected)].filter(Boolean).join(' · ');
            img.src = getProductImagePath(selected);
            img.alt = selected.name;
            dims.forEach(d => {
                const row = rows[d];
                if (!row) return;
                Array.from(row.children).forEach(el => {
                    el.classList.toggle('active', el.textContent === state[d]);
                });
            });
            updateCardDescription(descEl, selected.name);
            updateDogSizeRow(sizeRow, selected.name);
        }

        dims.forEach(d => {
            const labels = [];
            variants.forEach(v => {
                const label = extractVariantDim(d, v);
                if (label && labels.indexOf(label) === -1) labels.push(label);
            });
            if (labels.length < 2) return;
            const row = document.createElement('div');
            row.className = 'card-options';
            labels.forEach(label => {
                const opt = document.createElement('button');
                opt.type = 'button';
                opt.className = 'card-option-btn';
                opt.textContent = label;
                opt.onclick = () => {
                    state[d] = label;
                    refreshSingle();
                };
                row.appendChild(opt);
            });
            rows[d] = row;
            body.appendChild(row);
        });

        btn.onclick = () => {
            if (window._customerIsInactive) {
                alert('This account is currently inactive and cannot add items to a quote.');
                return;
            }
            selected = findSelected();
            if (isWholesaleOos(selected.name)) {
                alert(wholesaleOosLabel(selected.name) || 'This item is out of stock.');
                return;
            }
            addToQuote(selected.name, selected.price || '', selected.cs || '', qtyInput.value);
        };

        body.appendChild(descEl);
        body.appendChild(sizeRow);
        body.appendChild(qtyRow);
        body.appendChild(btn);
        refreshSingle();
    }

    card.appendChild(photo);
    card.appendChild(body);
    return card;
}

function buildProductCard(product) {
    const card = document.createElement('div');
    card.className = 'wholesale-product-card';

    const photo = document.createElement('div');
    photo.className = 'card-photo';
    const img = document.createElement('img');
    img.src = getProductImagePath(product);
    img.onerror = function () {
        this.onerror = null;
        this.src = 'media/placeholder-bully-stick.png';
    };
    img.alt = product.name || 'Donegal Natural treat';
    photo.appendChild(img);
    photo.style.cursor = 'pointer';
    photo.title = 'Click to enlarge';
    photo.onclick = () => {
        openProductImageLightbox(getProductImagePaths(product), 0);
    };

    const body = document.createElement('div');
    body.className = 'card-body';

    const name = document.createElement('h3');
    name.className = 'card-name';
    name.textContent = product.name || '';

    const meta = document.createElement('p');
    meta.className = 'card-meta';
    const csText = product.cs ? ('Case size ' + product.cs) : '';
    const priceText = formatCardPrice(product);
    meta.textContent = [csText, priceText].filter(Boolean).join(' · ');

    const descEl = buildCardDescriptionEl();
    const sizeRow = buildDogSizeRow();
    updateCardDescription(descEl, product.name);
    updateDogSizeRow(sizeRow, product.name);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card-add';
    btn.textContent = isWholesaleOos(product.name)
        ? (wholesaleOosLabel(product.name) || 'Out of Stock')
        : 'Add to Quote';
    if (isWholesaleOos(product.name)) btn.disabled = true;
    btn.onclick = () => {
        if (isWholesaleOos(product.name)) {
            alert(wholesaleOosLabel(product.name) || 'This item is out of stock.');
            return;
        }
        const benefits = (typeof getHealthBenefitsForProduct === 'function')
            ? getHealthBenefitsForProduct(product.name)
            : null;
        showPackagedItemModal(
            product.name,
            product.price || '',
            product.cs || '',
            product.category,
            getProductImagePath(product),
            benefits
        );
    };

    body.appendChild(name);
    body.appendChild(meta);
    body.appendChild(descEl);
    body.appendChild(sizeRow);
    body.appendChild(btn);
    card.appendChild(photo);
    card.appendChild(body);
    return card;
}

function renderProductCardGrid(container, products, emptyMessage) {
    container.innerHTML = '';
    if (!products || products.length === 0) {
        container.innerHTML = '<p class="text-center py-8 text-[#6B4423]">' + (emptyMessage || 'No products found.') + '</p>';
        return;
    }
    const grid = document.createElement('div');
    grid.className = 'wholesale-card-grid';
    appendProductCards(grid, products);
    container.appendChild(grid);
}

function renderGroupedCategoryCards(container, products, emptyMessage) {
    container.innerHTML = '';
    if (!products || products.length === 0) {
        container.innerHTML = '<p class="text-center py-8 text-[#6B4423]">' + (emptyMessage || 'No products found.') + '</p>';
        return;
    }

    const groups = [];
    const map = {};
    products.forEach(p => {
        const key = (p.subCategory || '').trim() || 'Other';
        if (!map[key]) {
            map[key] = [];
            groups.push(key);
        }
        map[key].push(p);
    });

    groups.forEach(sub => {
        const block = document.createElement('div');
        block.className = 'subcategory-block';

        const heading = document.createElement('h3');
        heading.className = 'subcategory-heading';
        heading.textContent = sub;
        block.appendChild(heading);

        const grid = document.createElement('div');
        grid.className = 'wholesale-card-grid';
        appendProductCards(grid, map[sub]);
        block.appendChild(grid);
        container.appendChild(block);
    });
}

function updateProductsHeading(text) {
    const heading = document.getElementById('products-heading');
    if (heading) heading.textContent = text;
}

function renderRecommendedCards() {
    const container = document.getElementById('portal-products');
    if (!container) return;
    updateProductsHeading('Recommended for you');
    renderProductCardGrid(container, pickRandomProducts(4), 'No products available yet.');
}

function startRecommendedRotator() {
    stopRecommendedRotator();
    recommendedRotatorTimer = setInterval(() => {
        if (currentCategoryFilter !== 'All') {
            stopRecommendedRotator();
            return;
        }
        const searchInput = document.getElementById('product-search');
        if (searchInput && searchInput.value.trim().length >= 2) {
            stopRecommendedRotator();
            return;
        }
        renderRecommendedCards();
    }, 10000);
}

function renderPortalProducts() {
    const container = document.getElementById('portal-products');
    if (!container) return;

    if (window._customerIsInactive) {
        stopRecommendedRotator();
        updateProductsHeading('Wholesale Products');
        container.innerHTML = `
            <div class="bg-white border-2 border-amber-400 rounded-2xl p-10 text-center max-w-xl mx-auto">
                <i class="fas fa-lock text-4xl text-amber-600 mb-4"></i>
                <h3 class="text-xl font-bold text-amber-900 mb-2">Ordering restricted</h3>
                <p class="text-[#6B4423] text-sm">This account is currently inactive. Contact your salesman to reactivate.</p>
            </div>
        `;
        return;
    }

    const customer = window._currentCustomer;
    if (!customer || !customer.pricing_approved_at) {
        stopRecommendedRotator();
        updateProductsHeading('Wholesale Products');
        container.innerHTML = `
            <div class="bg-white border-2 border-[#6B4423] rounded-2xl p-10 text-center max-w-xl mx-auto">
                <i class="fas fa-lock text-4xl text-[#6B4423] mb-4"></i>
                <h3 class="text-xl font-bold brand-green mb-2">Pricing not available yet</h3>
                <p class="text-[#6B4423] text-sm leading-relaxed">
                    Your salesman has not approved pricing for your account yet.
                    You’ll be able to browse wholesale prices once they attach your price sheet.
                </p>
            </div>
        `;
        return;
    }

    if (currentCategoryFilter === 'All') {
        renderRecommendedCards();
        startRecommendedRotator();
        return;
    }

    stopRecommendedRotator();
    const tree = (WHOLESALE_BROWSE_TREE || {})[currentCategoryFilter];
    if (currentSubCategoryFilter) {
        updateProductsHeading(currentCategoryFilter + ' — ' + currentSubCategoryFilter);
    } else {
        updateProductsHeading(currentCategoryFilter);
    }

    if (!tree) {
        const productsToShow = WHOLESALE_PRICES.filter(p =>
            p.category === currentCategoryFilter && !isTestProductName(p.name)
        );
        renderGroupedCategoryCards(container, productsToShow, 'No products found in this category.');
        return;
    }

    const subKeys = currentSubCategoryFilter
        ? [currentSubCategoryFilter]
        : Object.keys(tree);

    container.innerHTML = '';
    let shown = 0;
    subKeys.forEach(sub => {
        const names = tree[sub] || [];
        const products = names.map(findCatalogProduct).filter(Boolean);
        if (!products.length) return;
        shown += products.length;

        const block = document.createElement('div');
        block.className = 'subcategory-block';
        if (sub) {
            const heading = document.createElement('h3');
            heading.className = 'subcategory-heading';
            heading.textContent = sub;
            block.appendChild(heading);
        }
        const grid = document.createElement('div');
        grid.className = 'wholesale-card-grid';
        appendProductCards(grid, products);
        block.appendChild(grid);
        container.appendChild(block);
    });

    if (!shown) {
        container.innerHTML = '<p class="text-center py-8 text-[#6B4423]">No products found in this category.</p>';
    }
}
// ================== ADD TO QUOTE SYSTEM ==================
function showPackagedItemModal(name, price, cs, category, image = null, healthBenefits = null) {
    if (window._customerIsInactive) {
        alert('This account is currently inactive and cannot add items to a quote.');
        return;
    }
    const oldModal = document.getElementById('add-to-quote-modal');
    if (oldModal) oldModal.remove();

    // Store pending item safely — avoids broken onclick string interpolation
    window._pendingQuoteItem = { name, price, cs, category };

    const modal = document.createElement('div');
    modal.id = 'add-to-quote-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999]';

    const imagePath = image || 'media/placeholder-bully-stick.png';

    let imageHTML = `
        <div class="mb-4 flex justify-center">
            <img src="${escapeHtml(imagePath)}" alt="${escapeHtml(name)}" class="max-h-40 rounded-xl object-contain border border-[#d4b78f]">
        </div>
    `;

    let benefitsHTML = '';
    if (healthBenefits && healthBenefits.length > 0) {
        benefitsHTML = `
            <div class="mb-4">
                <p class="font-semibold text-sm mb-1 text-[#1E4D2B]">Health Benefits:</p>
                <ul class="text-sm text-[#6B4423] list-disc pl-5 space-y-1">
                    ${healthBenefits.map(b => `<li>${escapeHtml(b)}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    modal.innerHTML = `
        <div class="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 class="text-xl font-bold brand-green mb-3">Add to Quote</h3>

            ${imageHTML}

            <p class="font-semibold text-lg mb-1">${escapeHtml(name)}</p>
            <p class="text-sm text-[#6B4423] mb-4">${escapeHtml(cs)} • ${escapeHtml(price)}</p>

            ${benefitsHTML}

            <div class="mb-4">
                <label class="block text-sm font-medium mb-1">Quantity</label>
                <input type="number" id="quote-quantity" value="1" min="1" autofocus
                       class="w-full border-2 border-[#6B4423] rounded-xl px-4 py-2 text-lg">
            </div>

            <div class="flex gap-3">
                <button onclick="addToQuoteFromModal()"
                        class="flex-1 bg-[#1E4D2B] text-[#d4b78f] font-bold py-3 rounded-2xl">
                    Add to Quote
                </button>
                <button onclick="closeAddToQuoteModal()"
                        class="flex-1 border-2 border-[#6B4423] text-[#6B4423] font-bold py-3 rounded-2xl">
                    Cancel
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    setTimeout(() => {
        const qtyInput = document.getElementById('quote-quantity');
        if (qtyInput) {
            qtyInput.focus();
            qtyInput.select();
        }
    }, 50);
}

function closeAddToQuoteModal() {
    const modal = document.getElementById('add-to-quote-modal');
    if (modal) modal.remove();
}

function addToQuoteFromModal() {
    const pending = window._pendingQuoteItem;
    if (!pending) {
        closeAddToQuoteModal();
        return;
    }

    const qtyInput = document.getElementById('quote-quantity');
    const qty = parseInt(qtyInput?.value, 10) || 1;

    quoteItems.push({
        name: pending.name,
        price: pending.price,
        cs: pending.cs,
        quantity: qty
    });

    localStorage.setItem('wholesaleQuote', JSON.stringify(quoteItems));
    updateQuoteSidebar();
    closeAddToQuoteModal();
    window._pendingQuoteItem = null;
}

function addToQuote(name, price, cs, quantity) {
    if (isWholesaleOos(name)) {
        alert(wholesaleOosLabel(name) || 'This item is out of stock.');
        return;
    }
    const qty = parseInt(quantity) || 1;

    quoteItems.push({
        name: name,
        price: price,
        cs: cs,
        quantity: qty
    });

    localStorage.setItem('wholesaleQuote', JSON.stringify(quoteItems));
    updateQuoteSidebar();
    closeAddToQuoteModal();
}

function updateQuoteSidebar() {
    const itemsContainer = document.getElementById('quote-items-list');
    const summaryContainer = document.getElementById('quote-summary');
    
    if (!itemsContainer || !summaryContainer) return;

    // Always keep mobile quote badge in sync (empty + non-empty)
    const mobileCount = document.getElementById('quote-count-mobile');
    if (mobileCount) mobileCount.textContent = String(quoteItems.length);

    itemsContainer.innerHTML = '';
    summaryContainer.innerHTML = '';

    if (quoteItems.length === 0) {
        itemsContainer.innerHTML = `<p class="text-[#6B4423] text-sm italic">No items in quote yet.</p>`;
        return;
    }

    let pricedTotal = 0;
    let hasMarketPrice = false;

    quoteItems.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'bg-[#f8f4eb] border border-[#d4b78f] rounded-xl p-3 mb-2 text-sm';

        const isMarketPrice = item.price.toLowerCase().includes('market');
        const isPerLb = item.price.toLowerCase().includes('/lb');

        let priceInfo = '';
        let lineTotalHTML = '';

        if (isMarketPrice) {
            hasMarketPrice = true;
            priceInfo = `<span class="text-[#c56134] font-semibold">Market Price</span>`;
            lineTotalHTML = `<div class="text-right text-sm mt-1">Qty: ${item.quantity}</div>`;
        } else {
            const numericPrice = parseFloat(item.price.replace(/[^0-9.]/g, '')) || 0;
            const lineTotalValue = numericPrice * item.quantity;
            pricedTotal += lineTotalValue;

            if (isPerLb) {
                // Special display for per lb items
                priceInfo = `${item.quantity} lbs × ${item.price}`;
                lineTotalHTML = `<div class="text-right font-semibold mt-1">$${lineTotalValue.toFixed(2)}</div>`;
            } else {
                priceInfo = `${item.price} × ${item.quantity}`;
                lineTotalHTML = `<div class="text-right font-semibold mt-1">$${lineTotalValue.toFixed(2)}</div>`;
            }
        }

        div.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex-1 pr-2">
                    <p class="font-semibold leading-tight">${escapeHtml(item.name)}</p>
                    <p class="text-xs text-[#6B4423] mt-0.5">${escapeHtml(item.cs)}</p>
                    <p class="text-xs mt-1">${priceInfo}</p>
                </div>

                <div class="flex flex-col items-end">
                    <button onclick="removeFromQuote(${index})" 
                            class="text-red-500 hover:text-red-700 text-xl leading-none mb-1">
                        ×
                    </button>
                    ${lineTotalHTML}
                </div>
            </div>
        `;
        itemsContainer.appendChild(div);
    });

    // Sticky Summary Section
    let summaryHTML = '';

    if (pricedTotal > 0) {
        summaryHTML += `
            <div class="flex justify-between font-semibold mb-2">
                <span>Subtotal:</span>
                <span>$${pricedTotal.toFixed(2)}</span>
            </div>
        `;
    }

    if (hasMarketPrice) {
        summaryHTML += `
            <p class="text-xs text-[#c56134] mb-1">
                * Market Price items will be confirmed on final invoice.
            </p>
        `;
    }

    // Free shipping status for this customer + current quote subtotal
    const locText = getCustomerLocationText();
    if (locText && pricedTotal > 0) {
        const fs = evaluateFreeShipping(pricedTotal, locText);
        if (fs.free) {
            summaryHTML += `
                <div class="mb-3 px-3 py-2 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs font-semibold">
                    ✓ Free shipping unlocked — ${fs.reason}
                </div>
            `;
        } else if (fs.threshold) {
            summaryHTML += `
                <div class="mb-3 px-3 py-2 rounded-xl bg-[#f8f4eb] border border-[#d4b78f] text-[#6B4423] text-xs">
                    $${fs.remaining.toFixed(2)} more for free shipping (${fs.reason})
                </div>
            `;
        }
    }

    summaryHTML += `
        <p class="text-xs text-[#6B4423] italic mb-3">
            Final total will be sent with your invoice.
        </p>

        <button onclick="openQuoteConfirmModal()" 
                class="w-full bg-[#1E4D2B] hover:bg-[#254a2f] text-[#d4b78f] font-bold py-3 rounded-2xl border-2 border-[#6B4423]">
            Submit Quote Request
        </button>
        <button onclick="clearQuote()" 
                class="w-full mt-2 text-sm text-[#6B4423] hover:text-red-600">
            Clear Quote
        </button>
    `;

    summaryContainer.innerHTML = summaryHTML;
}

function expandQuoteModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999]';

    let content = `<div class="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">`;
    content += `<h3 class="text-2xl font-bold brand-green mb-4">Full Quote Summary</h3>`;

    if (quoteItems.length === 0) {
        content += `<p class="text-[#6B4423]">No items in quote.</p>`;
    } else {
        content += `<div class="space-y-3">`;
        quoteItems.forEach((item, index) => {
            const isMarket = item.price.toLowerCase().includes('market');
            content += `
                <div class="border border-[#d4b78f] rounded-xl p-4">
                    <div class="flex justify-between">
                        <div>
                            <p class="font-semibold">${escapeHtml(item.name)}</p>
                            <p class="text-sm text-[#6B4423]">${escapeHtml(item.cs)} × ${item.quantity}</p>
                        </div>
                        <div class="text-right">
                            ${isMarket ? 
                                `<span class="text-[#c56134] font-semibold">Market Price</span>` : 
                                `<span class="font-semibold">$${(parseFloat(item.price.replace(/[^0-9.]/g,'')) * item.quantity).toFixed(2)}</span>`
                            }
                        </div>
                    </div>
                </div>
            `;
        });
        content += `</div>`;
    }

    content += `
        <div class="mt-6 flex justify-end gap-3">
            <button onclick="this.closest('.fixed').remove()" 
                    class="px-6 py-2 border-2 border-[#6B4423] rounded-2xl">Close</button>
            <button onclick="this.closest('.fixed').remove(); openQuoteConfirmModal();" 
                    class="px-6 py-2 bg-[#1E4D2B] text-[#d4b78f] rounded-2xl">Submit Quote</button>
        </div>
    `;

    content += `</div>`;
    modal.innerHTML = content;
    document.body.appendChild(modal);
}

function removeFromQuote(index) {
    quoteItems.splice(index, 1);
    localStorage.setItem('wholesaleQuote', JSON.stringify(quoteItems));
    updateQuoteSidebar();
}

function clearQuote() {
    if (confirm("Are you sure you want to clear the entire quote?")) {
        quoteItems = [];
        localStorage.setItem('wholesaleQuote', JSON.stringify(quoteItems));
        updateQuoteSidebar();
    }
}

function showQuoteSidebar() {
    if (window._customerIsInactive) return;
    const sidebar = document.getElementById('quote-sidebar');
    if (sidebar) {
        sidebar.classList.remove('hidden');
        sidebar.classList.add('flex');
    }
}

function hideQuoteSidebar() {
    const sidebar = document.getElementById('quote-sidebar');
    if (sidebar) {
        sidebar.classList.add('hidden');
        sidebar.classList.remove('flex');
    }
}

async function notifyMarshallProforma(order) {
    try {
        const res = await fetch(SUPABASE_URL + '/functions/v1/send-pro-forma-email', {
            method: 'POST',
            headers: await getEdgeFunctionHeaders(),
            body: JSON.stringify({
                orderId: order.orderId || order.id,
                customerName: order.customerName || order.customer_name || '',
                companyName: order.companyName || order.customer_company || '',
                customerEmail: order.customerEmail || order.customer_email || '',
                salesmanName: order.salesmanName || order.salesman_name || '',
                items: order.items || [],
                notes: order.notes || '',
                shippingCost: order.shippingCost ?? order.shipping_cost ?? 0,
                credit: order.credit ?? 0,
                submittedAt: order.submittedAt || order.submitted_at || new Date().toISOString(),
                source: order.source || 'wholesale'
            })
        });
        if (!res.ok) {
            const text = await res.text();
            console.error('Pro forma email failed:', res.status, text);
        }
    } catch (err) {
        console.error('Pro forma email error:', err);
    }
}

function hideQuoteConfirmModal() {
    document.getElementById('quote-confirm-modal-dynamic')?.remove();
    const staticModal = document.getElementById('quote-confirm-modal');
    if (staticModal) {
        staticModal.classList.add('hidden');
        staticModal.style.display = '';
    }
}

function openQuoteConfirmModal() {
    if (window._customerIsInactive) {
        alert('This account is currently inactive and cannot submit new quotes.');
        return;
    }
    if (!quoteItems || quoteItems.length === 0) {
        alert('Your quote is empty!');
        return;
    }

    // Remove any existing dynamic confirm
    document.getElementById('quote-confirm-modal-dynamic')?.remove();

    const customer = window._currentCustomer || null;
    let shipText = 'No shipping address on file';
    if (customer) {
        shipText = (customer.shipping_address || customer.shippingAddress || '').trim()
            || 'No shipping address on file';
    }

    let pricedTotal = 0;
    let hasMarket = false;
    let rows = '';

    quoteItems.forEach((item) => {
        const isMarket = String(item.price || '').toLowerCase().includes('market');
        const qty = item.quantity || 1;
        let lineLabel = item.price || '—';
        if (isMarket) {
            hasMarket = true;
            lineLabel = 'Market';
        } else {
            const unit = parseFloat(String(item.price).replace(/[^0-9.]/g, '')) || 0;
            const line = unit * qty;
            pricedTotal += line;
            lineLabel = '$' + line.toFixed(2);
        }
        rows += `
            <div style="display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #f0e6d6;padding-bottom:8px;margin-bottom:8px;">
                <div style="min-width:0;">
                    <p style="font-weight:600;color:#1E4D2B;margin:0;">${escapeHtml(item.name || 'Item')}</p>
                    <p style="font-size:12px;color:#6B4423;margin:2px 0 0;">Qty ${qty}${item.cs ? ' · ' + escapeHtml(item.cs) : ''}</p>
                </div>
                <p style="font-weight:600;color:#1E4D2B;white-space:nowrap;margin:0;">${lineLabel}</p>
            </div>
        `;
    });

    const overlay = document.createElement('div');
    overlay.id = 'quote-confirm-modal-dynamic';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;padding:16px;';
    overlay.innerHTML = `
        <div style="background:#fff;border:2px solid #6B4423;border-radius:16px;width:100%;max-width:32rem;max-height:90vh;overflow:auto;box-shadow:0 20px 40px rgba(0,0,0,0.2);">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #d4b78f;">
                <h2 style="margin:0;font-size:1.25rem;font-weight:700;color:#1E4D2B;">Confirm Your Quote</h2>
                <button type="button" onclick="hideQuoteConfirmModal()" style="border:none;background:none;font-size:1.5rem;color:#6B4423;cursor:pointer;line-height:1;">&times;</button>
            </div>
            <div style="padding:16px 20px;">
                <p style="font-size:11px;font-weight:700;color:#6B4423;text-transform:uppercase;margin:0 0 4px;">Shipping Address</p>
                <p style="font-size:14px;color:#1E4D2B;white-space:pre-line;margin:0 0 16px;">${escapeHtml(shipText)}</p>

                <p style="font-size:11px;font-weight:700;color:#6B4423;text-transform:uppercase;margin:0 0 8px;">Items</p>
                <div style="margin-bottom:16px;">${rows}</div>

                <div style="display:flex;justify-content:space-between;align-items:center;background:#f8f4eb;border-radius:12px;padding:12px 16px;">
                    <span style="font-weight:600;color:#6B4423;">Quote Total</span>
                    <span style="font-size:1.25rem;font-weight:700;color:#1E4D2B;">$${pricedTotal.toFixed(2)}</span>
                </div>
                ${hasMarket ? '<p style="font-size:12px;color:#c2410c;margin:8px 0 0;">Some items are market price and are not included in this total.</p>' : ''}
            </div>
            <div style="display:flex;gap:12px;padding:16px 20px;border-top:1px solid #d4b78f;">
                <button type="button" onclick="hideQuoteConfirmModal()"
                    style="flex:1;padding:10px 16px;border:2px solid #6B4423;background:#fff;color:#6B4423;border-radius:12px;font-weight:600;cursor:pointer;">
                    Go Back
                </button>
                <button type="button" onclick="confirmAndSubmitQuote()"
                    style="flex:1;padding:10px 16px;border:none;background:#1E4D2B;color:#d4b78f;border-radius:12px;font-weight:600;cursor:pointer;">
                    Confirm &amp; Submit
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function confirmAndSubmitQuote() {
    hideQuoteConfirmModal();
    if (typeof submitQuote === 'function') {
        await submitQuote();
    }
}

function generateInvoiceNumber() {
    // DN-XXXXX — 5 chars, skip ambiguous 0/O/1/I
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return 'DN-' + code;
}

function displayInvoiceNumber(order) {
    return order?.invoice_number || order?.invoiceNumber || order?.id || '—';
}

async function submitQuote() {
    if (window._customerIsInactive) {
        alert('This account is currently inactive and cannot submit new quotes.');
        return;
    }
    if (quoteItems.length === 0) {
        alert("Your quote is empty!");
        return;
    }

    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!user) {
        alert("You must be logged in to submit a quote.");
        return;
    }

    const customer = window._currentCustomer || null;

    const items = quoteItems.map(item => {
        const isMarket = (item.price || "").toLowerCase().includes("market");
        const numericPrice = isMarket
            ? null
            : parseFloat(String(item.price).replace(/[^0-9.]/g, "")) || 0;

        return {
            product: item.name,
            quantity: item.quantity || 1,
            caseSize: item.cs || "",
            unitPrice: numericPrice,
            displayPrice: item.price || "",
            isMarketPrice: isMarket
        };
    });

    const invoiceNumber = generateInvoiceNumber();

    const payload = {
        customer_id: customer?.id || null,
        customer_name: user.fullName || user.username || customer?.name || "Unknown Customer",
        customer_email: (user.email || customer?.email || "").toLowerCase().trim(),
        customer_company: user.company || customer?.company || "",
        salesman_email: customer?.salesman_email || null,
        salesman_name: null,
        status: "submitted",
        source: "wholesale",
        items: items,
        notes: "Submitted via Wholesale Portal",
        shipping_cost: 0,
        submitted_at: new Date().toISOString(),
        invoice_number: invoiceNumber
    };

    try {
        const { data, error } = await supabaseClient
            .from('orders')
            .insert([payload])
            .select('id, invoice_number')
            .single();

        if (error) throw error;

        const shortId = data?.invoice_number || invoiceNumber || data?.id;

        // Email Pro Forma PDF to Marshall (fire-and-forget)
        await notifyMarshallProforma({
            orderId: shortId,
            customerName: payload.customer_name,
            companyName: payload.customer_company,
            customerEmail: payload.customer_email,
            salesmanName: payload.salesman_name,
            items: payload.items,
            notes: payload.notes,
            shippingCost: payload.shipping_cost || 0,
            credit: 0,
            submittedAt: payload.submitted_at,
            source: payload.source
        });

        quoteItems = [];
        localStorage.setItem('wholesaleQuote', JSON.stringify(quoteItems));
        updateQuoteSidebar();

        // Phase 1: open pro forma immediately with the new order
        const newOrder = {
            id: shortId,
            invoice_number: shortId,
            _uuid: data?.id,
            customer_name: payload.customer_name,
            customer_company: payload.customer_company,
            customer_email: payload.customer_email,
            items: payload.items,
            shipping_cost: payload.shipping_cost || 0,
            credit: 0,
            status: payload.status,
            submitted_at: payload.submitted_at,
            notes: payload.notes
        };
        if (typeof showBrandedInvoice === 'function') {
            showBrandedInvoice(newOrder);
        }

        // Short confirmation (optional — remove the alert entirely if you prefer none)
        alert("Thank you, your quote has been submitted.");

        // Close quote sidebar and go to Order History
        if (typeof hideQuoteSidebar === 'function') hideQuoteSidebar();
        document.querySelectorAll('.portal-section').forEach(s => { s.style.display = 'none'; });
        const ordersSec = document.getElementById('section-orders');
        if (ordersSec) ordersSec.style.display = 'block';
        document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
        const ordersLink = document.querySelector('.sidebar-link[data-target="section-orders"]');
        if (ordersLink) ordersLink.classList.add('active');
        if (typeof loadOrderHistory === 'function') loadOrderHistory();
    } catch (err) {
        console.error('Order submit error:', err);
        alert("Could not submit your quote. Please try again.\n" + (err.message || ""));
    }
}

async function loadMyQuotes() {
    const container = document.getElementById('section-quotes');
    if (!container) return;

    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!user) {
        container.innerHTML = `
            <h2 class="text-2xl font-bold brand-green mb-6">My Quote Requests</h2>
            <div class="bg-white border-2 border-[#6B4423] rounded-2xl p-8 text-center">
                <p class="text-[#6B4423]">Please log in to see your quotes.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <h2 class="text-2xl font-bold brand-green mb-6">My Quote Requests</h2>
        <p class="text-sm text-[#6B4423]">Loading…</p>
    `;

    try {
        const email = (user.email || '').toLowerCase().trim();

        const { data, error } = await supabaseClient
            .from('orders')
            .select('*')
            .eq('source', 'wholesale')
            .eq('customer_email', email)
            .order('submitted_at', { ascending: false });

        if (error) throw error;

        // My Quotes = unpaid and not denied
        const active = (data || []).filter(order => {
            const p = (order.payment_status || '').toLowerCase();
            const s = (order.status || '').toLowerCase();
            return p !== 'paid' && s !== 'denied';
        });
                window._myQuotesCache = active;

                // Ensure back orders available for nested fulfilled rows
                if (!customerBackOrders || customerBackOrders.length === 0) {
                    await loadCustomerBackOrders();
                }

        // Apply store filter
        let filtered = active;
        if (_quotesStoreFilter !== 'all') {
            filtered = active.filter(o => String(o.customer_id) === String(_quotesStoreFilter));
        }

        if (filtered.length === 0) {
            const tabsHtml = buildStoreTabs('quotes', _quotesStoreFilter, 'switchQuotesStoreFilter');
            container.innerHTML = `
                <h2 class="text-2xl font-bold brand-green mb-4">My Quote Requests</h2>
                ${tabsHtml}
                <div class="bg-white border-2 border-[#6B4423] rounded-2xl p-8 text-center">
                    <p class="text-[#6B4423]">No open quotes for this store.</p>
                </div>
            `;
            return;
        }

        const tabsHtml = buildStoreTabs('quotes', _quotesStoreFilter, 'switchQuotesStoreFilter');
        let html = `<h2 class="text-2xl font-bold brand-green mb-4">My Quote Requests</h2>${tabsHtml}`;

        active.forEach(quote => {
            const date = new Date(quote.submitted_at).toLocaleDateString();
            const items = quote.items || [];
            const itemCount = items.length;
            const status = (quote.status || 'submitted').toLowerCase();

            let total = 0;
            items.forEach(item => {
                if (item.isMarketPrice) return;
                const price = parseFloat(item.unitPrice) || 0;
                const qty = parseInt(item.quantity, 10) || 0;
                total += price * qty;
            });

            const totalDisplay = total > 0
                ? '$' + total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : 'Market Price items only';

            let badgeClass = 'bg-gray-100 text-gray-700';
            let badgeText = quote.status || 'Unknown';
            let statusMessage = '';

            if (status === 'submitted' || status === 'pending' || status === '') {
                badgeClass = 'bg-orange-100 text-orange-700';
                badgeText = 'Submitted';
                statusMessage = 'Waiting for review by our team.';
            } else if (status === 'received') {
                badgeClass = 'bg-blue-100 text-blue-700';
                badgeText = 'Accepted';
                statusMessage = 'Your quote has been accepted. Pricing is confirmed.';
            } else if (status === 'processing') {
                badgeClass = 'bg-blue-100 text-blue-800';
                badgeText = 'Processing';
                statusMessage = 'Your order is being prepared.';
            } else if (status === 'denied') {
                badgeClass = 'bg-red-100 text-red-700';
                badgeText = 'Denied';
                statusMessage = 'This quote was not approved.';
            }

            html += `
                <div class="bg-white border-2 border-[#6B4423] rounded-2xl p-6 mb-4 cursor-pointer hover:shadow-md transition"
                     onclick='showBrandedInvoice(${JSON.stringify(quote).replace(/'/g, "&#39;")})'>
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <p class="font-bold text-lg brand-green">Quote ${getStoreBadgeForOrder(quote)}</p>
                            <p class="text-xs text-[#6B4423]">${escapeHtml(displayInvoiceNumber(quote))}</p>
                            <p class="text-sm text-[#6B4423]">Submitted: ${date}</p>
                        </div>
                        <span class="px-3 py-1 text-xs font-semibold rounded-full ${badgeClass}">
                            ${badgeText}
                        </span>
                    </div>

                    ${statusMessage ? `<p class="text-sm text-[#6B4423] mb-3">${statusMessage}</p>` : ''}

                    <p class="text-sm text-[#6B4423] mb-2">${itemCount} item(s)</p>

                    
                    <ul class="text-sm space-y-1 mb-4">
                        ${items.map(item => `
                            <li class="flex justify-between">
                                <span>• ${escapeHtml(item.product)} × ${item.quantity}</span>
                                <span class="text-[#6B4423]">${item.displayPrice || ''}</span>
                            </li>
                        `).join('')}
                        ${(() => {
                            const fulfilledBOs = (customerBackOrders || []).filter(b =>
                                false && (b.status || '').toLowerCase() === 'fulfilled' &&
                                (String(b.original_order_id) === String(quote.id) ||
                                 String(b.invoice_number) === String(quote.id))
                            );
                            if (!fulfilledBOs.length) return '';
                            return `
                                <li class="pt-2 mt-1 border-t border-[#e8d9c2]">
                                    <p class="text-xs font-semibold text-green-800 mb-1">Back Order Fulfillment</p>
                                    ${fulfilledBOs.map(b => `
                                        <div class="flex justify-between text-green-800">
                                            <span>• ${b.product_name || '—'} × ${b.quantity || 1}
                                                <span class="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-green-100 text-green-800">BO Fulfilled</span>
                                            </span>
                                            <span>${b.display_price || (b.unit_price != null ? ('$' + Number(b.unit_price).toFixed(2)) : '')}</span>
                                        </div>
                                    `).join('')}
                                </li>
                            `;
                        })()}
                    </ul>

                    <div class="border-t border-[#d4b78f] pt-3 flex justify-between items-center mb-3">
                        <span class="font-semibold brand-green">Quote Total</span>
                        <span class="text-xl font-bold brand-green">${totalDisplay}</span>
                    </div>

                    ${(() => {
                        if (total <= 0) return '';
                        const accounts = window._customerAccounts || [];
                        const quoteCust = accounts.find(c => String(c.id) === String(quote.customer_id)) || window._currentCustomer;
                        const loc = quoteCust
                            ? [quoteCust.shipping_address, quoteCust.billing_address, quoteCust.territory].filter(Boolean).join(' ').toUpperCase()
                            : getCustomerLocationText();
                        const fs = evaluateFreeShipping(total, loc || '');
                        if (!fs.free) return '';
                        return `
                            <div class="mb-3 px-3 py-2 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs font-semibold">
                                ✓ Free shipping qualified — ${fs.reason}
                            </div>`;
                    })()}

                    ${(() => {
                        const pStatus = (quote.payment_status || '').toLowerCase();
                        const method = (quote.payment_method_type || '').toLowerCase();
                        const isAchPending = pStatus !== 'paid' && (method === 'us_bank_account' || method === 'customer_balance');
                        const isDenied = status === 'denied';
                        const canEdit = status === 'submitted' || status === 'pending' || status === '';

                        if (isDenied) return '';

                        let editBtn = '';
                        if (canEdit) {
                            editBtn = `
                            <button onclick="event.stopPropagation(); openEditQuoteModal('${quote.id}')"
                                    class="w-full mb-2 border-2 border-[#6B4423] text-[#1E4D2B] font-semibold py-2.5 rounded-xl hover:bg-[#f8f4eb]">
                                Edit / Add Items
                            </button>`;
                        }

                        if (pStatus === 'paid') {
                            return editBtn + `
                            <div class="w-full bg-green-100 text-green-800 font-semibold py-3 rounded-xl text-center">
                                Paid ✓
                            </div>`;
                        }
                        if (isAchPending) {
                            return editBtn + `
                            <div class="w-full bg-blue-50 border border-blue-200 text-blue-800 font-semibold py-3 rounded-xl text-center text-sm">
                                ACH Processing<br>
                                <span class="font-normal text-xs">Typically clears in 3–5 business days</span>
                            </div>`;
                        }
                        if (!quote.invoice_ready_at) {
                            return editBtn + `
                            <div class="w-full bg-[#f8f4eb] border border-[#d4b78f] text-[#6B4423] font-semibold py-3 rounded-xl text-center text-sm">
                                Awaiting invoice from Donegal.
                            </div>`;
                        }
                        return editBtn;
                    })()}
                </div>
            `;
        });

        container.innerHTML = html;
    } catch (err) {
        console.error(err);
        container.innerHTML = `
            <h2 class="text-2xl font-bold brand-green mb-6">My Quote Requests</h2>
            <p class="text-sm text-red-600">Could not load quotes.</p>
        `;
    }
}       
function switchQuotesStoreFilter(id) {
    _quotesStoreFilter = id;
    loadMyQuotes();
}

async function loadOrderHistory() {
    const container = document.getElementById('section-orders');
    if (!container) return;

    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!user) {
        container.innerHTML = `
            <h2 class="text-2xl font-bold brand-green mb-6">Order History</h2>
            <div class="bg-white border-2 border-[#6B4423] rounded-2xl p-8 text-center">
                <p class="text-[#6B4423]">Please log in to see your orders.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <h2 class="text-2xl font-bold brand-green mb-6">Order History</h2>
        <p class="text-sm text-[#6B4423]">Loading…</p>
    `;

    try {
        const email = (user.email || '').toLowerCase().trim();

        const { data, error } = await supabaseClient
            .from('orders')
            .select('*')
            .eq('source', 'wholesale')
            .eq('customer_email', email)
            .order('submitted_at', { ascending: false });

        if (error) throw error;

        // Phase 1: Order History shows all orders (status/payment UI hidden)
        const completed = data || [];

                // Cache for search + click-to-invoice
        window._orderHistoryCache = completed;
                // Ensure back orders are available for nested fulfilled rows
        if (!customerBackOrders || customerBackOrders.length === 0) {
            await loadCustomerBackOrders();
        }

        // Apply store filter
        let filtered = completed;
        if (_ordersStoreFilter !== 'all') {
            filtered = completed.filter(o => String(o.customer_id) === String(_ordersStoreFilter));
        }

        if (filtered.length === 0) {
            const tabsHtml = buildStoreTabs('orders', _ordersStoreFilter, 'switchOrdersStoreFilter');
            container.innerHTML = `
                <h2 class="text-2xl font-bold brand-green mb-4">Order History</h2>
                ${tabsHtml}
                <div class="bg-white border-2 border-[#6B4423] rounded-2xl p-8 text-center">
                          <p class="text-[#6B4423]">No orders yet for this store.</p>              <p class="text-[#6B4423]">No paid or denied orders for this store.</p>
                </div>
            `;
            return;
        }

        const tabsHtml = buildStoreTabs('orders', _ordersStoreFilter, 'switchOrdersStoreFilter');
        let html = `
            <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 class="text-2xl font-bold brand-green">Order History</h2>
                <input type="text" id="order-history-search"
                       placeholder="Search invoice #, product, amount…"
                       class="border-2 border-[#6B4423] rounded-xl px-4 py-2 text-sm w-full sm:w-72"
                       oninput="filterOrderHistory()">
            </div>
            ${tabsHtml}
            <div id="order-history-list">
        `;

        filtered.forEach(order => {
            const date = new Date(order.submitted_at).toLocaleDateString();
            const status = (order.status || '').toLowerCase();
            const items = order.items || [];

            let subtotal = 0;
            items.forEach(item => {
                const price = parseFloat(item.unitPrice) || 0;
                const qty = parseInt(item.quantity, 10) || 0;
                subtotal += price * qty;
            });

            const shipping = parseFloat(order.shipping_cost) || 0;
            const finalTotal = subtotal + shipping;

            let badgeClass = 'bg-gray-100 text-gray-700';
            let badgeText = status || 'Unknown';

            if (status === 'denied') {
                badgeClass = 'bg-red-100 text-red-700';
                badgeText = 'Denied';
            } else if (status === 'shipped') {
                badgeClass = 'bg-purple-100 text-purple-800';
                badgeText = 'Shipped';
            } else if (status === 'delivered') {
                badgeClass = 'bg-green-100 text-green-700';
                badgeText = 'Delivered';
            } else if (status === 'processing' || (order.payment_status || '').toLowerCase() === 'paid') {
                badgeClass = 'bg-blue-100 text-blue-800';
                badgeText = 'Paid';
            }

            html += `
                <div class="bg-white border-2 border-[#6B4423] rounded-2xl p-6 mb-4 cursor-pointer hover:shadow-md transition"
                     onclick="openOrderHistoryInvoice('${order.id}')">
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <p class="font-bold text-lg brand-green">Invoice ${getStoreBadgeForOrder(order)}</p>
                            <p class="text-xs text-[#6B4423]">${escapeHtml(displayInvoiceNumber(order))}</p>
                            <p class="text-sm text-[#6B4423]">Order Date: ${date}</p>
                            ${(order.tracking_number || '').trim() ? `
                            <p class="text-sm text-[#6B4423] mt-1">
                                <span class="font-semibold">${order.carrier || 'UPS'}:</span>
                                <a href="https://www.ups.com/track?tracknum=${encodeURIComponent(String(order.tracking_number).trim())}"
                                   target="_blank" rel="noopener"
                                   onclick="event.stopPropagation()"
                                   class="font-mono text-[#1E4D2B] underline hover:text-[#254a2f]">
                                    ${String(order.tracking_number).trim()}
                                </a>
                            </p>` : ''}
                        </div>
                        ${'' /* Phase 1: status badge hidden */}
                    </div>

                    <ul class="text-sm space-y-1 mb-4">
                        ${items.map(item => `
                            <li class="flex justify-between">
                                <span>• ${escapeHtml(item.product)} × ${item.quantity}</span>
                                <span class="text-[#6B4423]">${item.displayPrice || ('$' + (parseFloat(item.unitPrice) || 0).toFixed(2))}</span>
                            </li>
                        `).join('')}
                        ${(() => {
                            const fulfilledBOs = (customerBackOrders || []).filter(b =>
                                false && (b.status || '').toLowerCase() === 'fulfilled' &&
                                (String(b.original_order_id) === String(order.id) ||
                                 String(b.invoice_number) === String(order.id))
                            );
                            if (!fulfilledBOs.length) return '';
                            return `
                                <li class="pt-2 mt-1 border-t border-[#e8d9c2]">
                                    <p class="text-xs font-semibold text-green-800 mb-1">Back Order Fulfillment</p>
                                    ${fulfilledBOs.map(b => `
                                        <div class="flex justify-between text-green-800">
                                            <span>• ${b.product_name || '—'} × ${b.quantity || 1}
                                                <span class="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-green-100 text-green-800">BO Fulfilled</span>
                                            </span>
                                            <span>${b.display_price || (b.unit_price != null ? ('$' + Number(b.unit_price).toFixed(2)) : '')}</span>
                                        </div>
                                    `).join('')}
                                </li>
                            `;
                        })()}
                    </ul>

                    <div class="border-t border-[#d4b78f] pt-3 space-y-1 text-sm mb-4">
                        <div class="flex justify-between">
                            <span class="text-[#6B4423]">Subtotal</span>
                            <span>$${subtotal.toFixed(2)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-[#6B4423]">Shipping</span>
                            <span>${shipping > 0 ? '$' + shipping.toFixed(2) : 'TBD'}</span>
                        </div>
                        <div class="flex justify-between font-bold text-lg brand-green pt-2">
                            <span>Final Total</span>
                            <span>$${finalTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    ${'' /* Phase 1: payment UI hidden */}
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    } catch (err) {
        console.error(err);
        container.innerHTML = `
            <h2 class="text-2xl font-bold brand-green mb-6">Order History</h2>
            <p class="text-sm text-red-600">Could not load order history.</p>
        `;
    }
}
function switchOrdersStoreFilter(id) {
    _ordersStoreFilter = id;
    loadOrderHistory();
}

// ================== CUSTOMER BACK ORDERS ==================
async function loadCustomerBackOrders() {
    const container = document.getElementById('customer-back-orders');
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!user || !user.email) {
        customerBackOrders = [];
        if (container) {
            container.innerHTML = `<p class="text-xs text-[#6B4423]">Sign in to see back orders.</p>`;
        }
        return;
    }

    const email = (user.email || '').toLowerCase().trim();

    try {
        const { data, error } = await supabaseClient
            .from('back_orders')
            .select('*')
            .ilike('customer_email', email)
            .order('created_at', { ascending: false });

        if (error) throw error;
        customerBackOrders = data || [];
    } catch (err) {
        console.error('loadCustomerBackOrders error:', err);
        customerBackOrders = [];
    }

    renderCustomerBackOrdersSidebar();
}

function renderCustomerBackOrdersSidebar() {
    const container = document.getElementById('customer-back-orders');
    if (!container) return;

    // Sidebar = pending only
    const pending = (customerBackOrders || []).filter(b =>
        (b.status || '').toLowerCase() === 'pending'
    );

    if (pending.length === 0) {
        container.innerHTML = `<p class="text-xs text-[#6B4423]">No items currently on back order.</p>`;
        return;
    }

    // Group by invoice
    const groups = {};
    pending.forEach(b => {
        const key = String(b.invoice_number || b.original_order_id || b.id);
        if (!groups[key]) {
            groups[key] = {
                invoice: b.invoice_number || String(b.original_order_id || ''),
                items: []
            };
        }
        groups[key].items.push(b);
    });

    let html = '';
    Object.values(groups).forEach(g => {
        const shortInv = String(g.invoice || '').slice(0, 8);
        html += `
            <div class="mb-3 last:mb-0">
                <p class="text-xs font-semibold text-[#1E4D2B] mb-1">Invoice #${shortInv}</p>
                <ul class="space-y-1">
                    ${g.items.map(item => `
                        <li class="text-xs leading-snug">
                            <span class="font-medium">${escapeHtml(item.product_name || '—')}</span>
                            <span class="text-[#6B4423]"> × ${item.quantity || 1}</span>
                            ${item.case_size ? `<span class="text-[#6B4423]"> · ${item.case_size}</span>` : ''}
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    });

    html += `
        <p class="text-[10px] text-[#6B4423] mt-2 leading-snug border-t border-[#d4b78f] pt-2">
            These items will ship once stock is available. Fulfilled back orders also appear under Order History.
        </p>
    `;
    container.innerHTML = html;
}
// ================== END CUSTOMER BACK ORDERS ==================



function openOrderHistoryInvoice(orderId) {
    const order = (window._orderHistoryCache || []).find(o => o.id === orderId);
    if (!order) return;
    showBrandedInvoice(order);
}

function openMyQuoteInvoice(orderId) {
    const order = (window._myQuotesCache || []).find(o => o.id === orderId);
    if (!order) return;
    showBrandedInvoice(order);
}

function filterOrderHistory() {
    const term = (document.getElementById('order-history-search')?.value || '').toLowerCase().trim();
    const list = document.getElementById('order-history-list');
    if (!list) return;

    const all = window._orderHistoryCache || [];
    const filtered = !term ? all : all.filter(order => {
        const id = String(order.id || '').toLowerCase();
        const itemsText = (order.items || []).map(i => (i.product || i.name || '')).join(' ').toLowerCase();
        let sub = 0;
        (order.items || []).forEach(item => {
            const price = parseFloat(item.unitPrice) || 0;
            const qty = parseInt(item.quantity, 10) || 0;
            sub += price * qty;
        });
        const shipping = parseFloat(order.shipping_cost) || 0;
        const totalStr = (sub + shipping).toFixed(2);
        return id.includes(term) || itemsText.includes(term) || totalStr.includes(term);
    });

    if (filtered.length === 0) {
        list.innerHTML = `<div class="bg-white border-2 border-[#6B4423] rounded-2xl p-8 text-center"><p class="text-[#6B4423]">No orders match your search.</p></div>`;
        return;
    }
    renderOrderHistoryCards(filtered, list);
}

function renderOrderHistoryCards(orders, listEl) {
    let html = '';
    orders.forEach(order => {
        const date = new Date(order.submitted_at).toLocaleDateString();
        const status = (order.status || '').toLowerCase();
        const items = order.items || [];
        let subtotal = 0;
        items.forEach(item => {
            const price = parseFloat(item.unitPrice) || 0;
            const qty = parseInt(item.quantity, 10) || 0;
            subtotal += price * qty;
        });
        const shipping = parseFloat(order.shipping_cost) || 0;
        const finalTotal = subtotal + shipping;

        // Phase 1: status badge hidden
        let badgeClass = '';
        let badgeText = '';

        const pStatus = (order.payment_status || '').toLowerCase();
        const method = (order.payment_method_type || '').toLowerCase();
        const isAchPending = pStatus !== 'paid' && (method === 'us_bank_account' || method === 'customer_balance');
                let payBlock = ''; // Phase 1: payment UI hidden

        html += `
            <div class="bg-white border-2 border-[#6B4423] rounded-2xl p-6 mb-4 cursor-pointer hover:shadow-md transition"
                 onclick="openOrderHistoryInvoice('${order.id}')">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <p class="font-bold text-lg brand-green">Invoice</p>
                        <p class="text-xs text-[#6B4423]">${escapeHtml(displayInvoiceNumber(order))}</p>
                        <p class="text-sm text-[#6B4423]">Order Date: ${date}</p>
                        ${(order.tracking_number || '').trim() ? `
                        <p class="text-sm text-[#6B4423] mt-1">
                            <span class="font-semibold">${order.carrier || 'UPS'}:</span>
                            <a href="https://www.ups.com/track?tracknum=${encodeURIComponent(String(order.tracking_number).trim())}"
                               target="_blank" rel="noopener"
                               onclick="event.stopPropagation()"
                               class="font-mono text-[#1E4D2B] underline hover:text-[#254a2f]">
                                ${String(order.tracking_number).trim()}
                            </a>
                        </p>` : ''}
                    </div>
                    <span class="px-3 py-1 text-xs font-semibold rounded-full ${badgeClass}">${badgeText}</span>
                </div>
                <ul class="text-sm space-y-1 mb-4">
                    ${items.map(item => `
                        <li class="flex justify-between">
                            <span>• ${item.product} × ${item.quantity}</span>
                            <span class="text-[#6B4423]">${item.displayPrice || ('$' + (parseFloat(item.unitPrice) || 0).toFixed(2))}</span>
                        </li>
                    `).join('')}
                    ${(() => {
                        const fulfilledBOs = (customerBackOrders || []).filter(b =>
                            false && (b.status || '').toLowerCase() === 'fulfilled' &&
                            (String(b.original_order_id) === String(order.id) ||
                             String(b.invoice_number) === String(order.id))
                        );
                        if (!fulfilledBOs.length) return '';
                        return `
                            <li class="pt-2 mt-1 border-t border-[#e8d9c2]">
                                <p class="text-xs font-semibold text-green-800 mb-1">Back Order Fulfillment</p>
                                ${fulfilledBOs.map(b => `
                                    <div class="flex justify-between text-green-800">
                                        <span>• ${b.product_name || '—'} × ${b.quantity || 1}
                                            <span class="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-green-100 text-green-800">BO Fulfilled</span>
                                        </span>
                                        <span>${b.display_price || (b.unit_price != null ? ('$' + Number(b.unit_price).toFixed(2)) : '')}</span>
                                    </div>
                                `).join('')}
                            </li>
                        `;
                    })()}
                </ul>
                <div class="border-t border-[#d4b78f] pt-3 space-y-1 text-sm mb-4">
                    <div class="flex justify-between"><span class="text-[#6B4423]">Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
                    <div class="flex justify-between"><span class="text-[#6B4423]">Shipping</span><span>${shipping > 0 ? '$' + shipping.toFixed(2) : 'TBD'}</span></div>
                    <div class="flex justify-between font-bold text-lg brand-green pt-2"><span>Final Total</span><span>$${finalTotal.toFixed(2)}</span></div>
                </div>
                ${payBlock}
            </div>
        `;
    });
    listEl.innerHTML = html;
}

function updateMyQuotesBadge(count) {
    const n = Number(count) || 0;
    const ids = ['my-quotes-badge', 'my-quotes-badge-mobile'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (n > 0) {
            el.textContent = String(n);
            el.classList.remove('hidden');
        } else {
            el.textContent = '';
            el.classList.add('hidden');
        }
    });
}

async function refreshMyQuotesBadge() {
    try {
        const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (!user || !user.email) {
            updateMyQuotesBadge(0);
            return;
        }
        const email = (user.email || '').toLowerCase().trim();
        const { data, error } = await supabaseClient
            .from('orders')
            .select('id, payment_status, status')
            .eq('source', 'wholesale')
            .eq('customer_email', email);
        if (error) throw error;
        const unpaid = (data || []).filter(o => {
            const p = (o.payment_status || '').toLowerCase();
            const s = (o.status || '').toLowerCase();
            return p !== 'paid' && s !== 'denied';
        });
        updateMyQuotesBadge(unpaid.length);
    } catch (err) {
        console.error('refreshMyQuotesBadge error:', err);
        updateMyQuotesBadge(0);
    }
}

function updateOrderHistoryBadge(count) {
    const n = Number(count) || 0;
    const ids = ['order-history-badge', 'order-history-badge-mobile'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (n > 0) {
            el.textContent = String(n);
            el.classList.remove('hidden');
        } else {
            el.textContent = '';
            el.classList.add('hidden');
        }
    });
}

async function refreshOrderHistoryBadge() {
    try {
        const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (!user || !user.email) {
            updateOrderHistoryBadge(0);
            return;
        }
        const email = (user.email || '').toLowerCase().trim();
        const lastViewed = localStorage.getItem('orderHistoryLastViewed');
        const lastViewedMs = lastViewed ? new Date(lastViewed).getTime() : 0;

        const { data, error } = await supabaseClient
            .from('orders')
            .select('id, status, payment_status, paid_at, submitted_at')
            .eq('source', 'wholesale')
            .eq('customer_email', email);
        if (error) throw error;

        // Badge = newly paid orders since last time customer opened Order History
        const newCompleted = (data || []).filter(o => {
            const p = (o.payment_status || '').toLowerCase();
            if (p !== 'paid') return false;
            const ts = new Date(o.paid_at || o.submitted_at || 0).getTime();
            return ts > lastViewedMs;
        });
        updateOrderHistoryBadge(newCompleted.length);
    } catch (err) {
        console.error('refreshOrderHistoryBadge error:', err);
        updateOrderHistoryBadge(0);
    }
}

function markOrderHistoryViewed() {
    localStorage.setItem('orderHistoryLastViewed', new Date().toISOString());
    updateOrderHistoryBadge(0);
}

// ================== EDIT QUOTE (pending only) ==================
let editQuoteOrder = null;
let editQuoteItems = [];

function openEditQuoteModal(orderId) {
    const order = (window._myQuotesCache || []).find(o => String(o.id) === String(orderId));
    if (!order) {
        alert('Quote not found.');
        return;
    }

    const status = (order.status || '').toLowerCase();
    if (status !== 'submitted' && status !== 'pending' && status !== '') {
        alert('This quote can no longer be edited. Once Accepted, please submit a new order.');
        return;
    }

    editQuoteOrder = order;
    editQuoteItems = (order.items || []).map(item => ({
        product: item.product || item.name || '',
        quantity: item.quantity || 1,
        caseSize: item.caseSize || item.cs || '',
        unitPrice: item.unitPrice != null ? item.unitPrice : null,
        displayPrice: item.displayPrice || item.price || '',
        isMarketPrice: !!item.isMarketPrice
    }));

    document.getElementById('edit-quote-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'edit-quote-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999] p-4';
    modal.innerHTML = `
        <div class="bg-white border-2 border-[#6B4423] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
             onclick="event.stopPropagation()">
            <div class="flex items-start justify-between mb-4">
                <div>
                    <h2 class="text-2xl font-bold brand-green">Edit Quote</h2>
                    <p class="text-sm text-[#6B4423]">Add, remove, or change quantities. Only available while awaiting review.</p>
                    <p class="text-xs text-[#6B4423] font-mono mt-1">${escapeHtml(displayInvoiceNumber(order))}</p>
                </div>
                <button type="button" onclick="hideEditQuoteModal()"
                        class="text-2xl text-[#6B4423] leading-none">&times;</button>
            </div>

            <div class="mb-4">
                <h3 class="font-bold brand-green mb-2">Line Items</h3>
                <div id="edit-quote-items" class="space-y-2"></div>
            </div>

            <div class="mb-4 relative">
                <label class="block text-sm font-semibold text-[#6B4423] mb-1">Add product</label>
                <input type="text" id="edit-quote-product-search"
                       oninput="renderEditQuoteProductSearch()"
                       class="w-full border-2 border-[#6B4423] rounded-xl px-4 py-2"
                       placeholder="Search products…">
                <div id="edit-quote-product-results"
                     class="hidden absolute z-50 w-full bg-white border-2 border-[#6B4423] rounded-xl mt-1 max-h-56 overflow-auto shadow-lg"></div>
            </div>

            <div class="border-t border-[#d4b78f] pt-4 mb-6 flex justify-between text-sm">
                <span class="text-[#6B4423]">Subtotal</span>
                <span id="edit-quote-subtotal" class="font-semibold brand-green">$0.00</span>
            </div>

            <div class="flex justify-end gap-3">
                <button type="button" onclick="hideEditQuoteModal()"
                        class="px-5 py-2 border-2 border-[#6B4423] rounded-xl">
                    Cancel
                </button>
                <button type="button" onclick="confirmEditQuote()"
                        class="px-5 py-2 bg-[#1E4D2B] text-[#d4b78f] font-bold rounded-xl">
                    Save Changes
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    renderEditQuoteItems();
    recalcEditQuoteTotals();
}

function hideEditQuoteModal() {
    document.getElementById('edit-quote-modal')?.remove();
    editQuoteOrder = null;
    editQuoteItems = [];
}

function renderEditQuoteItems() {
    const container = document.getElementById('edit-quote-items');
    if (!container) return;

    if (!editQuoteItems.length) {
        container.innerHTML = `<p class="text-sm text-[#6B4423]">No line items.</p>`;
        return;
    }

    container.innerHTML = editQuoteItems.map((item, index) => {
        const hasRealPrice = item.unitPrice != null && !isNaN(Number(item.unitPrice)) && Number(item.unitPrice) > 0;
        const priceLabel = hasRealPrice
            ? ('$' + Number(item.unitPrice).toFixed(2))
            : (item.isMarketPrice ? 'Market' : (item.displayPrice || '—'));
        const qty = parseInt(item.quantity, 10) || 0;
        const unit = hasRealPrice ? Number(item.unitPrice) : 0;
        const lineTotalLabel = hasRealPrice ? ('$' + (qty * unit).toFixed(2)) : '—';

        return `
            <div class="flex flex-wrap items-center gap-2 border border-[#d4b78f] rounded-xl px-3 py-2 bg-[#f8f4eb]">
                <div class="flex-1 min-w-[140px]">
                    <p class="font-semibold text-sm brand-green">${escapeHtml(item.product)}</p>
                    <p class="text-xs text-[#6B4423]">${priceLabel}${item.caseSize ? ' · ' + item.caseSize : ''}</p>
                </div>
                <input type="number" min="1" step="1" value="${item.quantity}"
                       onchange="updateEditQuoteQty(${index}, this.value)"
                       class="w-20 border-2 border-[#6B4423] rounded-lg px-2 py-1 text-sm">
                <div class="text-right min-w-[60px]">
                    <p class="text-xs text-[#6B4423]">Line</p>
                    <p class="font-semibold text-sm brand-green">${lineTotalLabel}</p>
                </div>
                <button type="button" onclick="removeEditQuoteItem(${index})"
                        class="px-3 py-1 text-xs bg-red-600 text-white rounded-lg">
                    Remove
                </button>
            </div>
        `;
    }).join('');
}

function updateEditQuoteQty(index, value) {
    const qty = parseInt(value, 10);
    if (!editQuoteItems[index]) return;
    editQuoteItems[index].quantity = (isNaN(qty) || qty < 1) ? 1 : qty;
    renderEditQuoteItems();
    recalcEditQuoteTotals();
}

function removeEditQuoteItem(index) {
    editQuoteItems.splice(index, 1);
    renderEditQuoteItems();
    recalcEditQuoteTotals();
}

function renderEditQuoteProductSearch() {
    const search = (document.getElementById('edit-quote-product-search')?.value || '').toLowerCase().trim();
    const resultsEl = document.getElementById('edit-quote-product-results');
    if (!resultsEl) return;

    if (search.length < 1) {
        resultsEl.innerHTML = '';
        resultsEl.classList.add('hidden');
        return;
    }

    const matches = (WHOLESALE_PRICES || []).filter(p =>
        p.name.toLowerCase().includes(search) ||
        (p.category || '').toLowerCase().includes(search)
    ).slice(0, 20);

    if (!matches.length) {
        resultsEl.innerHTML = `<p class="px-4 py-3 text-sm text-[#6B4423]">No products found.</p>`;
        resultsEl.classList.remove('hidden');
        return;
    }

    resultsEl.innerHTML = matches.map(p => {
        const safeName = p.name.replace(/'/g, "\\'");
        return `
            <button type="button"
                    onclick="addEditQuoteProduct('${safeName}')"
                    class="w-full text-left px-4 py-2 text-sm hover:bg-[#f8f4eb] border-b border-[#f0e6d9]">
                <span class="font-medium text-[#1E4D2B]">${escapeHtml(p.name)}</span>
                <span class="block text-xs text-[#6B4423]">${escapeHtml(p.cs || '')} · ${escapeHtml(p.price || '')}</span>
            </button>
        `;
    }).join('');
    resultsEl.classList.remove('hidden');
}

function addEditQuoteProduct(productName) {
    const catalog = (WHOLESALE_PRICES || []).find(p => p.name === productName);
    const isMarket = catalog && (catalog.price || '').toLowerCase().includes('market');
    const numericPrice = isMarket
        ? null
        : parseFloat(String(catalog?.price || '').replace(/[^0-9.]/g, '')) || null;

    const existing = editQuoteItems.find(i => i.product === productName);
    if (existing) {
        existing.quantity = (existing.quantity || 1) + 1;
    } else {
        editQuoteItems.push({
            product: productName,
            quantity: 1,
            caseSize: catalog?.cs || '',
            unitPrice: numericPrice,
            displayPrice: catalog?.price || '',
            isMarketPrice: !!isMarket
        });
    }

    const searchEl = document.getElementById('edit-quote-product-search');
    if (searchEl) searchEl.value = '';
    const resultsEl = document.getElementById('edit-quote-product-results');
    if (resultsEl) {
        resultsEl.innerHTML = '';
        resultsEl.classList.add('hidden');
    }

    renderEditQuoteItems();
    recalcEditQuoteTotals();
}

function recalcEditQuoteTotals() {
    let subtotal = 0;
    (editQuoteItems || []).forEach(item => {
        const unit = parseFloat(item.unitPrice);
        if (isNaN(unit) || unit < 0) return;
        subtotal += unit * (parseInt(item.quantity, 10) || 0);
    });
    const el = document.getElementById('edit-quote-subtotal');
    if (el) el.textContent = '$' + subtotal.toFixed(2);
}

async function confirmEditQuote() {
    if (!editQuoteOrder) return;

    if (!editQuoteItems.length) {
        alert('Quote must have at least one line item.');
        return;
    }

    const status = (editQuoteOrder.status || '').toLowerCase();
    if (status !== 'submitted' && status !== 'pending' && status !== '') {
        alert('This quote can no longer be edited.');
        return;
    }

    const itemsPayload = editQuoteItems.map(item => ({
        product: item.product,
        quantity: item.quantity || 1,
        caseSize: item.caseSize || '',
        unitPrice: item.unitPrice,
        displayPrice: item.displayPrice || '',
        isMarketPrice: !!item.isMarketPrice
    }));

    try {
        const { error } = await supabaseClient
            .from('orders')
            .update({ items: itemsPayload })
            .eq('id', editQuoteOrder.id);

        if (error) throw error;

        hideEditQuoteModal();
        await loadMyQuotes();
        alert('Quote updated.');
    } catch (err) {
        console.error(err);
        alert('Could not update quote.\n' + (err.message || ''));
    }
}
// ================== END EDIT QUOTE ==================




// ================== ACCOUNT INFO DISPLAY ==================
function showAccountInfo() {
    const container = document.getElementById('account-details');
    if (!container) return;

    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!user) {
        container.innerHTML = `<p class="text-[#6B4423]">No user information found.</p>`;
        return;
    }

    const accounts = window._customerAccounts || [];
    const active = window._currentCustomer;

    let html = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
                <p class="text-sm text-[#6B4423] font-semibold">Login Email</p>
                <p class="text-lg">${escapeHtml(user.email || 'N/A')}</p>
            </div>
            <div>
                <p class="text-sm text-[#6B4423] font-semibold">Full Name</p>
                <p class="text-lg font-semibold">${user.fullName || 'N/A'}</p>
            </div>
        </div>
    `;

    // Store selector (multi-store only)
    if (accounts.length > 1) {
        html += `
            <div class="mb-6 p-4 bg-[#f8f4eb] border-2 border-[#6B4423] rounded-xl">
                <label class="block text-sm font-semibold text-[#1E4D2B] mb-2">Active Store</label>
                <select id="store-selector"
                        class="w-full border-2 border-[#6B4423] rounded-xl px-4 py-2.5 text-sm font-medium"
                        onchange="switchActiveCustomer(this.value)">
                    ${accounts.map(c => `
                        <option value="${c.id}" ${active && String(c.id) === String(active.id) ? 'selected' : ''}>
                            ${getStoreLabel(c)}
                        </option>
                    `).join('')}
                </select>
                <p class="text-xs text-[#6B4423] mt-2">
                    Pricing, free-shipping thresholds, and new quotes use the selected store.
                    Quotes &amp; Order History still show activity for every store under this email.
                </p>
            </div>
        `;
    }

    if (!active) {
        html += `<p class="text-[#6B4423]">No store record found for this email.</p>`;
        container.innerHTML = html;
        return;
    }

    const pricingOk = !!active.pricing_approved_at;

    // ========== STORE DETAILS ==========
    html += `
        <div class="border-t border-[#d4b78f] pt-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="font-bold brand-green">
                    ${accounts.length > 1 ? 'Selected Store Details' : 'Store Details'}
                </h3>
                <button onclick="openShippingAddressesModal()"
                        class="px-4 py-1.5 text-sm border-2 border-[#6B4423] rounded-xl hover:bg-[#f8f4eb] font-semibold text-[#1E4D2B]">
                    Edit
                </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
                <div>
                    <p class="text-[#6B4423] font-semibold">Company / Store</p>
                    <p class="font-semibold text-[#1E4D2B]">${escapeHtml(active.company || active.name || '—')}</p>
                </div>
                <div>
                    <p class="text-[#6B4423] font-semibold">Assigned Salesman</p>
                <p id="account-assigned-salesman">${escapeHtml(active.salesman_email || '—')}</p>
                </div>
                <div class="md:col-span-2">
                    <p class="text-[#6B4423] font-semibold">Shipping Address</p>
                <p>${escapeHtml(active.shipping_address || '—')}</p>
                </div>
                <div class="md:col-span-2">
                    <p class="text-[#6B4423] font-semibold">Billing Address</p>
                <p>${escapeHtml(active.billing_address || '—')}</p>
                </div>
                <div>
                    <p class="text-[#6B4423] font-semibold">Pricing Status</p>
                    <p class="${pricingOk ? 'text-green-700 font-semibold' : 'text-orange-700'}">
                        ${pricingOk ? 'Approved' : 'Awaiting salesman approval'}
                    </p>
                </div>
                <div>
                    <p class="text-[#6B4423] font-semibold">Onboarding</p>
                    <p>${active.onboarding_complete ? 'Complete' : 'Incomplete'}</p>
                </div>
            </div>
        </div>
    `;



    // ========== RESALE CERTIFICATE ==========
    html += `
        <div class="border-t border-[#d4b78f] pt-6 mt-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="font-bold brand-green">Resale Certificate</h3>
                <button onclick="openResaleCertModal()"
                        class="px-4 py-1.5 text-sm border-2 border-[#6B4423] rounded-xl hover:bg-[#f8f4eb] font-semibold text-[#1E4D2B]">
                    Edit
                </button>
            </div>
            <div id="account-resale-summary" class="text-sm text-[#6B4423]">
                <p>Loading…</p>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Load resale cert summary asynchronously
    loadAccountResaleSummary();    
    loadAssignedSalesmanDisplay(active);
}

async function loadAssignedSalesmanDisplay(customer) {
    const el = document.getElementById('account-assigned-salesman');
    if (!el || !customer) return;

    const email = (customer.salesman_email || '').toLowerCase().trim();
    if (!email) {
        el.textContent = '—';
        return;
    }

    // Show email immediately while we look up the name
    el.textContent = email;

    try {
        const { data, error } = await supabaseClient
            .from('salesmen')
            .select('first_name, last_name, email')
            .ilike('email', email)
            .maybeSingle();

        if (error || !data) {
            // Keep the email we already showed
            return;
        }

        const name = [data.first_name, data.last_name].filter(Boolean).join(' ').trim();
        if (name) {
            el.innerHTML = `<span class="font-semibold text-[#1E4D2B]">${escapeHtml(name)}</span><br><span class="text-xs text-[#6B4423]">${escapeHtml(email)}</span>`;
        }
    } catch (err) {
        console.error('loadAssignedSalesmanDisplay error:', err);
        // Leave the email visible
    }
}




async function loadAccountResaleSummary() {
    const el = document.getElementById('account-resale-summary');
    if (!el) return;

    const customer = window._currentCustomer;
    if (!customer) {
        el.innerHTML = '<p>—</p>';
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('customer_resale_certificates')
            .select('*')
            .eq('customer_id', customer.id)
            .order('uploaded_at', { ascending: false })
            .limit(1);

        if (error) throw error;

        if (!data || data.length === 0) {
            el.innerHTML = '<p>No resale certificate on file.</p>';
            return;
        }

        const cert = data[0];
        const exp = cert.expiration_date ? new Date(cert.expiration_date).toLocaleDateString() : '—';
        const expired = cert.expiration_date && new Date(cert.expiration_date) < new Date();

        el.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                    <p class="text-[#6B4423] font-semibold">Certificate Number</p>
                    <p>${escapeHtml(cert.certificate_number || '—')}</p>
                </div>
                <div>
                    <p class="text-[#6B4423] font-semibold">Expiration</p>
                    <p class="${expired ? 'text-red-600 font-semibold' : ''}">${exp}${expired ? ' (Expired)' : ''}</p>
                </div>
            </div>
        `;
    } catch (err) {
        console.error(err);
        el.innerHTML = '<p class="text-red-600">Could not load certificate.</p>';
    }
}

// ================== MANAGE SHIPPING ADDRESSES ==================
async function openShippingAddressesModal() {
    const modal = document.getElementById('manage-addresses-modal');
    if (!modal) return;

    // Show only shipping section, hide payment + resale
    modal.querySelectorAll('[data-section]').forEach(el => {
        el.style.display = el.getAttribute('data-section') === 'shipping' ? 'block' : 'none';
    });
    modal.querySelector('h2').textContent = 'Shipping Addresses';
    modal.style.display = 'flex';
    await loadManageAddressesList();
}



async function openResaleCertModal() {
    const modal = document.getElementById('manage-addresses-modal');
    if (!modal) return;

    modal.querySelectorAll('[data-section]').forEach(el => {
        el.style.display = el.getAttribute('data-section') === 'resale' ? 'block' : 'none';
    });
    modal.querySelector('h2').textContent = 'Resale Certificate';
    modal.style.display = 'flex';
    await loadCurrentResaleCert();
}

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
                            <p class="font-semibold text-[#1E4D2B]">${addr.label || 'Address'}${badge}</p>
                            <p class="text-sm text-[#6B4423] mt-0.5">${line}</p>
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







async function loadCurrentResaleCert() {
    const el = document.getElementById('resale-cert-current');
    if (!el) return;

    const customer = window._currentCustomer;
    if (!customer) {
        el.innerHTML = '<p class="text-sm text-[#6B4423]">No customer selected.</p>';
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('customer_resale_certificates')
            .select('*')
            .eq('customer_id', customer.id)
            .order('uploaded_at', { ascending: false })
            .limit(1);

        if (error) throw error;

        if (!data || data.length === 0) {
            el.innerHTML = '<p class="text-sm text-[#6B4423]">No resale certificate on file.</p>';
            return;
        }

        const cert = data[0];
        const exp = cert.expiration_date ? new Date(cert.expiration_date).toLocaleDateString() : '—';
        const expired = cert.expiration_date && new Date(cert.expiration_date) < new Date();

        el.innerHTML = `
            <div class="p-3 bg-[#f8f4eb] border border-[#d4b78f] rounded-xl">
                <p><span class="font-semibold">Number:</span> ${escapeHtml(cert.certificate_number || '—')}</p>
                <p><span class="font-semibold">Expires:</span> <span class="${expired ? 'text-red-600 font-semibold' : ''}">${exp}${expired ? ' (Expired)' : ''}</span></p>
                <p class="text-xs mt-1">${escapeHtml(cert.file_name || '')}</p>
            </div>
        `;
    } catch (err) {
        console.error(err);
        el.innerHTML = '<p class="text-sm text-red-600">Could not load certificate.</p>';
    }
}

async function uploadResaleCertificate() {
    const customer = window._currentCustomer;
    if (!customer) {
        alert('No customer selected.');
        return;
    }

    const number = document.getElementById('resale-cert-number')?.value.trim() || '';
    const expiration = document.getElementById('resale-cert-expiration')?.value || '';
    const fileInput = document.getElementById('resale-cert-file');
    const file = fileInput?.files?.[0];

    if (!number || !expiration || !file) {
        alert('Certificate number, expiration date, and file are required.');
        return;
    }
    if (file.size === 0) {
        alert('The selected file is empty. Please choose another file.');
        return;
    }

    try {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const uid = user.id || customer.id;
        const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
        const path = `${uid}/${Date.now()}.${ext}`;

        // Explicit content type helps avoid "No content provided"
        const contentType = file.type || (
            ext === 'pdf' ? 'application/pdf' :
            ext === 'png' ? 'image/png' :
            'image/jpeg'
        );

        const { error: uploadError } = await supabaseClient.storage
            .from('resale-certificates')
            .upload(path, file, {
                upsert: true,
                contentType: contentType,
                cacheControl: '3600'
            });

        if (uploadError) throw uploadError;

        const { error: insertError } = await supabaseClient
            .from('customer_resale_certificates')
            .insert({
                customer_id: customer.id,
                certificate_number: number,
                expiration_date: expiration,
                file_name: file.name,
                file_path: path
            });

        if (insertError) throw insertError;

        document.getElementById('resale-cert-number').value = '';
        document.getElementById('resale-cert-expiration').value = '';
        if (fileInput) fileInput.value = '';

        await loadCurrentResaleCert();
        alert('Resale certificate uploaded.');
    } catch (err) {
        console.error(err);
        alert('Could not upload certificate.\n' + (err.message || JSON.stringify(err)));
    }
}

// ================== END MANAGE SHIPPING ADDRESSES ==================

async function logout() {
    if (!confirm("Are you sure you want to logout?")) return;
    localStorage.removeItem("currentUser");
    try { await supabaseClient.auth.signOut(); } catch (_) {}
    window.location.replace("login-portal.html");
}

// ================== BAR WITH SUGGESTIONS ==================
function setupSearch() {
    const searchInput = document.getElementById('product-search');
    const clearBtn = document.getElementById('clear-search');
    const suggestionsBox = document.getElementById('search-suggestions');

    if (!searchInput) return;

    searchInput.addEventListener('input', function () {
        const term = this.value.toLowerCase().trim();

        // Show or hide clear button
        if (clearBtn) {
            clearBtn.classList.toggle('hidden', term.length === 0);
        }

        // If search is empty or too short, reset the grid
        if (term.length < 2) {
            if (suggestionsBox) suggestionsBox.classList.add('hidden');
            renderPortalProducts();
            return;
        }

        // Filter products for suggestions and grid
        const filteredProducts = WHOLESALE_PRICES.filter(product =>
            product.name.toLowerCase().includes(term)
        );

        // Show suggestions dropdown
        if (suggestionsBox) {
            suggestionsBox.innerHTML = '';
            suggestionsBox.classList.remove('hidden');

            filteredProducts.slice(0, 10).forEach(product => {
                const div = document.createElement('div');
                div.className = 'px-4 py-2 hover:bg-[#f8f4eb] cursor-pointer text-sm border-b border-[#d4b78f]';
                div.textContent = product.name;

                div.onclick = () => {
                    searchInput.value = product.name;
                    suggestionsBox.classList.add('hidden');
                    filterAndRenderProducts(term);
                };

                suggestionsBox.appendChild(div);
            });
        }

        // Live filter the product grid
        filterAndRenderProducts(term);
    });

    // Clear button functionality
    if (clearBtn) {
        clearBtn.onclick = () => {
            searchInput.value = '';
            clearBtn.classList.add('hidden');
            if (suggestionsBox) suggestionsBox.classList.add('hidden');
            renderPortalProducts();
        };
    }

    // Hide suggestions when clicking outside
    document.addEventListener('click', function (e) {
        if (suggestionsBox && 
            !searchInput.contains(e.target) && 
            !suggestionsBox.contains(e.target)) {
            suggestionsBox.classList.add('hidden');
        }
    });
}

function filterAndRenderProducts(searchTerm) {
    const container = document.getElementById('portal-products');
    if (!container) return;

    stopRecommendedRotator();
    updateProductsHeading('Search results');

    const term = (searchTerm || '').toLowerCase();
    const filtered = WHOLESALE_PRICES.filter(p =>
        (p.name || '').toLowerCase().includes(term)
    );
    renderProductCardGrid(container, filtered, 'No products found.');
}

// ================== WELCOME MESSAGE ==================
function displayWelcome() {
    const nameElement = document.getElementById('welcome-name');
    if (!nameElement) return;

    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    const active = window._currentCustomer;
    const accounts = window._customerAccounts || [];

    if (user && user.fullName) {
        const isCustomerView = !!(user.isViewAs || localStorage.getItem('originalAdminUser') || user.role === 'admin');
        if (isCustomerView) {
            nameElement.textContent = 'Jonathan (Customer View)';
            return;
        }
        const company = user.company ? ` (${escapeHtml(user.company)})` : '';
        let text = `${escapeHtml(user.fullName)}${company}`;
        if (accounts.length > 1 && active) {
            text += `<br><span class="text-xs font-normal text-[#6B4423]">Ordering as: ${escapeHtml(getStoreLabel(active))}</span>`;
        }
        nameElement.innerHTML = text;
    } else {
        nameElement.textContent = '';
    }
}

// ================== INITIALIZATION ==================
var wholesaleOosMap = {};

function getWholesaleOos(name) {
    return wholesaleOosMap[name] || null;
}

function isWholesaleOos(name) {
    var row = getWholesaleOos(name);
    return !!(row && row.is_out_of_stock);
}

function wholesaleOosLabel(name) {
    var row = getWholesaleOos(name);
    if (!row || !row.is_out_of_stock) return '';
    var eta = row.estimated_back_at ? String(row.estimated_back_at).slice(0, 10) : '';
    return eta ? ('Out of stock · back ' + eta) : 'Out of stock';
}

async function loadWholesaleOutOfStock() {
    wholesaleOosMap = {};
    try {
        var { data, error } = await supabaseClient
            .from('product_stock_status')
            .select('product_name, is_out_of_stock, estimated_back_at')
            .eq('is_out_of_stock', true);
        if (error) throw error;
        (data || []).forEach(function (row) {
            wholesaleOosMap[row.product_name] = row;
        });
    } catch (err) {
        console.warn('loadWholesaleOutOfStock:', err);
    }
}

async function filterWholesaleCatalogForSalesman() {
    if (!Array.isArray(WHOLESALE_PRICES) || !WHOLESALE_PRICES.length) return;
    try {
        const { data, error } = await supabaseClient
            .rpc('active_salesman_product_assignments');
        if (error) throw error;
        const restricted = new Set();
        const byEmail = {};
        (data || []).forEach(s => {
            const email = (s.email || '').toLowerCase().trim();
            let list = [];
            if (Array.isArray(s.assigned_products)) list = s.assigned_products;
            else if (typeof s.assigned_products === 'string') {
                try { list = JSON.parse(s.assigned_products); } catch (e) { list = []; }
            }
            byEmail[email] = list;
            list.forEach(name => restricted.add(name));
        });
        if (!restricted.size) return;
        const mine = (window._currentCustomer?.salesman_email || '').toLowerCase().trim();
        const allowed = new Set(byEmail[mine] || []);
        WHOLESALE_PRICES = WHOLESALE_PRICES.filter(p =>
            !restricted.has(p.name) || allowed.has(p.name)
        );
    } catch (err) {
        console.error('filterWholesaleCatalogForSalesman:', err);
    }
}

async function loadWholesaleCatalog() {
    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) {
            console.warn('loadWholesaleCatalog: supabaseClient not ready — keeping hardcoded list');
            return;
        }

        const { data, error } = await supabaseClient
            .from('products')
            .select('id, name, category, sub_category, case_size, unit_price, active')
            .eq('active', true)
            .order('category', { ascending: true })
            .order('name', { ascending: true });

        if (error) throw error;
        if (!data || data.length === 0) {
            console.warn('loadWholesaleCatalog: no active products — keeping hardcoded list');
            return;
        }

        WHOLESALE_PRICES = data.map(row => ({
            id: row.id,
            category: row.category || 'Other',
            subCategory: row.sub_category || '',
            name: row.name || '',
            cs: row.case_size || '',
            price: row.unit_price != null
                ? ('$' + Number(row.unit_price).toFixed(2))
                : ''
        }));

        console.log('loadWholesaleCatalog: loaded', WHOLESALE_PRICES.length, 'products from Supabase');
        await filterWholesaleCatalogForSalesman();
        await loadWholesaleOutOfStock();
    } catch (err) {
        console.error('loadWholesaleCatalog error — keeping hardcoded list:', err);
    }
}

function newProductAlertStorageKey() {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const email = (user.email || '').toLowerCase().trim();
    return email ? ('newProductAlertSeenAt_' + email) : null;
}

async function checkNewProductAlert() {
    const key = newProductAlertStorageKey();
    if (!key || typeof supabaseClient === 'undefined') return;

    const lastSeen = localStorage.getItem(key) || '2026-08-10T00:00:00.000Z';

    try {
        const { data, error } = await supabaseClient
            .from('products')
            .select('name, category, case_size, unit_price, created_at')
            .eq('active', true)
            .gt('created_at', lastSeen)
            .order('created_at', { ascending: false });

        if (error) throw error;
        if (!data || data.length === 0) return;

        const list = document.getElementById('new-product-alert-list');
        const modal = document.getElementById('new-product-alert-modal');
        if (!list || !modal) return;

        list.innerHTML = data.map(p => {
            const price = p.unit_price != null ? ('$' + Number(p.unit_price).toFixed(2)) : '';
            const cs = p.case_size ? (' · ' + p.case_size) : '';
            return '<li><strong>' + escapeHtml(p.name || '') + '</strong>' +
                (p.category ? (' <span class="text-[#6B4423]">(' + escapeHtml(p.category) + escapeHtml(cs) + ')</span>') : '') +
                (price ? (' — ' + escapeHtml(price)) : '') + '</li>';
        }).join('');

        document.querySelectorAll('.fixed.inset-0').forEach(function (el) {
            if (el.id !== 'new-product-alert-modal') {
                el.style.display = 'none';
            }
        });

        document.body.appendChild(modal);
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.style.zIndex = '2147483647';
        modal.style.pointerEvents = 'auto';
    } catch (err) {
        console.error('checkNewProductAlert error:', err);
    }
}

function dismissNewProductAlert() {
    const key = newProductAlertStorageKey();
    if (key) localStorage.setItem(key, new Date().toISOString());
    const modal = document.getElementById('new-product-alert-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}


function goToAdminView() {
    try {
        const original = JSON.parse(localStorage.getItem('originalAdminUser') || 'null');
        if (original) {
            localStorage.setItem('currentUser', JSON.stringify(original));
            localStorage.removeItem('originalAdminUser');
        }
    } catch (e) {
        console.error('goToAdminView error:', e);
    }
    window.location.href = 'internal-portal.html';
}

document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');

    if (!user || (user.role !== 'customer' && user.role !== 'admin')) {
        window.location.href = 'login-portal.html';
        return;
    }

    // Password change required?
    if (user.mustChangePassword) {
        document.getElementById('password-change-modal')?.classList.remove('hidden');
        return; // stop portal init until password is changed
    }

        // Load ALL customer records that share this email (multi-store support)
    try {
        const email = (user.email || '').toLowerCase().trim();
        const { data: customers, error: custErr } = await supabaseClient
            .from('customers')
            .select('*')
            .ilike('email', email);

        if (custErr) throw custErr;

        window._customerAccounts = customers || [];

        // Resolve which store is active
        const savedId = localStorage.getItem('activeCustomerId');
        let active = null;
        if (savedId) {
            active = window._customerAccounts.find(c => String(c.id) === String(savedId));
        }
        if (!active && window._customerAccounts.length > 0) {
            active = window._customerAccounts[0];   // auto-select first
        }
        window._currentCustomer = active || null;
        if (active) {
            localStorage.setItem('activeCustomerId', String(active.id));
        }

        // Onboarding is per selected store
        if (!active || !active.onboarding_complete) {
            document.getElementById('onboarding-modal')?.classList.remove('hidden');
            return;
        }

        // Soft restriction for Inactive stores
        if (isCustomerInactive(active)) {
            applyInactiveSoftRestriction();
        } else {
            clearInactiveSoftRestriction();
        }
    } catch (err) {
        console.error('Customer load error:', err);
    }

    // Normal portal init — paint immediately from the fallback catalog
    renderCategoryFilters();
    renderPortalProducts();
    if (typeof checkNewProductAlert === 'function') checkNewProductAlert();

    await Promise.all([
        loadWholesaleCatalog(),
        loadPortalInventory(),
        loadCustomerBackOrders()
    ]);
    renderCategoryFilters();
    renderPortalProducts();
    if (typeof updateShippingPolicyCard === 'function') updateShippingPolicyCard();
    updateQuoteSidebar();
    setupSearch();
    displayWelcome();
        // Shipping address confirmation (shows until customer confirms)
    checkAndShowAddressConfirmation();
    updateOrderingAsIndicator();
    refreshOrderHistoryBadge();
    refreshMyQuotesBadge();

    // Phase 1: always hide My Quotes / Quotes nav
    document.querySelectorAll('.sidebar-link[data-target="section-quotes"]').forEach(el => {
        el.style.display = 'none';
    });

    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('data-target');
            sidebarLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.portal-section').forEach(section => {
                section.style.display = 'none';
            });
            const targetSection = document.getElementById(targetId);
            if (targetSection) targetSection.style.display = 'block';
            if (targetId === 'section-account') showAccountInfo();
            if (targetId === 'section-quotes') loadMyQuotes();
            if (targetId === 'section-orders') {
                markOrderHistoryViewed();
                loadOrderHistory();
            }
        });
    });

    const defaultLink = document.querySelector('.sidebar-link[data-target="section-products"]');
    if (defaultLink) defaultLink.classList.add('active');
});

// ================== ADDRESS CONFIRMATION ==================
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

async function submitPasswordChange() {
    const p1 = document.getElementById('new-password')?.value || '';
    const p2 = document.getElementById('confirm-password')?.value || '';
    const errEl = document.getElementById('password-change-error');

    if (p1.length < 8) {
        if (errEl) {
            errEl.textContent = 'Password must be at least 8 characters.';
            errEl.classList.remove('hidden');
        }
        return;
    }
    if (p1 !== p2) {
        if (errEl) {
            errEl.textContent = 'Passwords do not match.';
            errEl.classList.remove('hidden');
        }
        return;
    }

    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const email = (user.email || '').toLowerCase().trim();

    try {
        const { error: authError } = await supabaseClient.auth.updateUser({ password: p1 });
        if (authError) throw authError;

        // Best-effort: try to clear profiles.must_change_password
        // RLS is currently blocking this — do not throw
        if (user.id) {
            const { error: profileError } = await supabaseClient
                .from('profiles')
                .update({ must_change_password: false })
                .eq('id', user.id);
            if (profileError) {
                console.warn('profiles.must_change_password update blocked:', profileError.message);
            }
        }

        // Durable flag on customers table (this is what stops the modal on next login)
        // Password is account-level; mark password_changed on every store that shares this email
        if (email) {
            const { error: custError } = await supabaseClient
                .from('customers')
                .update({ password_changed: true })
                .ilike('email', email);
            if (custError) {
                console.warn('customers.password_changed update failed:', custError.message);
            }
        }

        // Clear local flag so this session continues
        user.mustChangePassword = false;
        localStorage.setItem('currentUser', JSON.stringify(user));

        document.getElementById('password-change-modal')?.classList.add('hidden');
        location.reload();
    } catch (err) {
        console.error(err);
        if (errEl) {
            errEl.textContent = err.message || 'Could not update password.';
            errEl.classList.remove('hidden');
        }
    }
}

function showBrandedInvoice(order) {
    // Remove any existing invoice modal
    document.getElementById('branded-invoice-modal')?.remove();

    let subtotal = 0;
    (order.items || []).forEach(item => {
        const price = parseFloat(item.unitPrice) || 0;
        const qty = parseInt(item.quantity, 10) || 0;
        subtotal += price * qty;
    });
    const shipping = parseFloat(order.shipping_cost) || 0;
    const credit = parseFloat(order.credit) || 0;
    const total = subtotal + shipping - credit;

    const modal = document.createElement('div');
    modal.id = 'branded-invoice-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <!-- Header -->
            <div class="bg-[#1E4D2B] text-[#d4b78f] p-6 rounded-t-2xl flex justify-between items-start">
                <div class="flex items-center gap-3">
                    <img src="media/logo.png" alt="Donegal Natural" class="h-12 w-auto bg-white rounded-lg p-1">
                    <div>
                        <h2 class="text-2xl font-bold">PRO FORMA INVOICE</h2>
                        <p class="text-sm opacity-90">Donegal Natural Dog Treats</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <button type="button"
                            onclick="window.print()"
                            class="text-sm font-semibold border border-[#d4b78f] text-[#d4b78f] px-3 py-1.5 rounded-lg hover:bg-[#254a2f] print:hidden">
                        Print
                    </button>
                    <button onclick="document.getElementById('branded-invoice-modal').remove()" 
                            class="text-2xl hover:text-white leading-none print:hidden">&times;</button>
                </div>
            </div>

            <div class="p-6 space-y-6">
                <!-- Invoice meta -->
                <div class="flex flex-wrap justify-between gap-4 text-sm">
                    <div>
                        <p class="text-[#6B4423] font-semibold">Pro Forma #</p>
                        <p class="font-mono text-xs break-all">${escapeHtml(displayInvoiceNumber(order))}</p>
                    </div>
                    <div>
                        <p class="text-[#6B4423] font-semibold">Date</p>
                        <p>${new Date(order.submitted_at || order.created_at || Date.now()).toLocaleDateString()}</p>
                    </div>
                    ${'' /* Phase 1: status hidden on pro forma */}
                    ${(order.tracking_number || '').trim() ? `
                    <div>
                        <p class="text-[#6B4423] font-semibold">${order.carrier || 'UPS'} Tracking</p>
                        <a href="https://www.ups.com/track?tracknum=${encodeURIComponent(String(order.tracking_number).trim())}"
                           target="_blank" rel="noopener"
                           class="font-mono text-sm text-[#1E4D2B] underline hover:text-[#254a2f]">
                            ${String(order.tracking_number).trim()}
                        </a>
                    </div>` : ''}
                </div>

                <!-- Bill To -->
                <div class="bg-[#f8f4eb] border border-[#d4b78f] rounded-xl p-4">
                    <p class="text-xs font-semibold text-[#6B4423] mb-1">BILL TO</p>
                    <p class="font-semibold text-[#1E4D2B]">${escapeHtml(order.customer_name || '—')}</p>
                    <p class="text-sm text-[#6B4423]">${escapeHtml(order.customer_company || '')}</p>
                    <p class="text-sm text-[#6B4423]">${escapeHtml(order.customer_email || '')}</p>
                </div>

                <!-- Line items -->
                <div>
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b-2 border-[#6B4423] text-left">
                                <th class="py-2 font-semibold text-[#1E4D2B]">Item</th>
                                <th class="py-2 font-semibold text-[#1E4D2B] text-center">Qty</th>
                                <th class="py-2 font-semibold text-[#1E4D2B] text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(order.items || []).map(item => {
                                const price = parseFloat(item.unitPrice) || 0;
                                const qty = parseInt(item.quantity, 10) || 0;
                                const lineTotal = price * qty;
                                return `
                                    <tr class="border-b border-[#e8d9c2]">
                                        <td class="py-3 text-[#1E4D2B]">${escapeHtml(item.product || item.name || 'Item')}</td>
                                        <td class="py-3 text-center text-[#6B4423]">${qty}</td>
                                        <td class="py-3 text-right font-medium">$${lineTotal.toFixed(2)}</td>
                                    </tr>
                                `;
                            }).join('')}
                            ${(() => {
                                const fulfilledBOs = (customerBackOrders || []).filter(b =>
                                    false && (b.status || '').toLowerCase() === 'fulfilled' &&
                                    (String(b.original_order_id) === String(order.id) ||
                                     String(b.invoice_number) === String(order.id))
                                );
                                if (!fulfilledBOs.length) return '';
                                return fulfilledBOs.map(b => {
                                    const price = parseFloat(b.unit_price) || 0;
                                    const qty = parseInt(b.quantity, 10) || 0;
                                    const lineTotal = price * qty;
                                    return `
                                        <tr class="border-b border-[#e8d9c2] bg-green-50">
                                            <td class="py-3 text-green-800">
                                                ${escapeHtml(b.product_name || '—')}
                                                <span class="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-green-100 text-green-800">BO Fulfilled</span>
                                            </td>
                                            <td class="py-3 text-center text-green-800">${qty}</td>
                                            <td class="py-3 text-right font-medium text-green-800">$${lineTotal.toFixed(2)}</td>
                                        </tr>
                                    `;
                                }).join('');
                            })()}
                        </tbody>
                    </table>
                </div>

                <!-- Totals -->
                <div class="border-t-2 border-[#6B4423] pt-4 space-y-1 text-sm max-w-xs ml-auto">
                    <div class="flex justify-between">
                        <span class="text-[#6B4423]">Subtotal</span>
                        <span>$${subtotal.toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-[#6B4423]">Shipping</span>
                        <span>${shipping > 0 ? '$' + shipping.toFixed(2) : '—'}</span>
                    </div>
                    ${credit > 0 ? `
                    <div class="flex justify-between text-green-700">
                        <span>Credit</span>
                        <span>-$${credit.toFixed(2)}</span>
                    </div>` : ''}
                    <div class="flex justify-between font-bold text-lg brand-green pt-2 border-t border-[#d4b78f] mt-2">
                        <span>Total Due</span>
                        <span>$${total.toFixed(2)}</span>
                    </div>
                </div>

                <div class="text-center text-xs text-[#6B4423] pt-4 border-t border-[#e8d9c2]">
                    Thank you                     This is a pro forma invoice · Final invoice will be issued through QuickBooksfor your business · Terms: Net 10 days
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}







async function submitOnboarding() {
    const street = document.getElementById('onboard-bill-street')?.value.trim() || '';
    const apt    = document.getElementById('onboard-bill-apt')?.value.trim() || '';
    const city   = document.getElementById('onboard-bill-city')?.value.trim() || '';
    const state  = document.getElementById('onboard-bill-state')?.value.trim() || '';
    const zip    = document.getElementById('onboard-bill-zip')?.value.trim() || '';

    const billing = [street, apt, city, state, zip].filter(Boolean).join(', ');
    const errEl = document.getElementById('onboarding-error');

    if (!street || !city || !state || !zip) {
        if (errEl) {
            errEl.textContent = 'Street, City, State, and ZIP are required.';
            errEl.classList.remove('hidden');
        }
        return;
    }

    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const email = (user.email || '').toLowerCase().trim();

    try {
        const activeId = window._currentCustomer?.id;
        const updatePayload = {
            billing_address: billing,
            onboarding_complete: true
        };

        let query = supabaseClient
            .from('customers')
            .update(updatePayload);

        if (activeId) {
            query = query.eq('id', activeId);
        } else {
            query = query.ilike('email', email);
        }

        const { data, error } = await query.select();

        if (error) throw error;

        if (!data || data.length === 0) {
            alert('Update ran but no customer row was matched for email: ' + email);
            return;
        }

        document.getElementById('onboarding-modal')?.classList.add('hidden');
        location.reload();
    } catch (err) {
        console.error(err);
        alert('Onboarding save failed:\n' + (err.message || JSON.stringify(err)));
        if (errEl) {
            errEl.textContent = err.message || 'Could not save account info.';
            errEl.classList.remove('hidden');
        }
    }
}    
