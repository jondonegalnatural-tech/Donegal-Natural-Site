// =============================================
// SALESMAN-PORTAL.JS — Donegal Natural Salesman Portal
// Updated with correct Head Admin accounts
// =============================================

// ================== SALESMAN / ADMIN ACCOUNTS ==================



var currentUser = null;
var proposals = JSON.parse(localStorage.getItem("salesmanProposals") || "[]");
let vendorLogs = JSON.parse(localStorage.getItem("vendorLogs") || "[]");


// ================== SUPABASE CLIENT ==================
// SUPABASE_URL and SUPABASE_ANON_KEY come from js/supabase-client.js

var supabaseClient = window.supabaseClient;
// =====================================================




// Soft guard — fast redirect if no salesman/admin cache
(function () {
    try {
        const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (!user || (user.role !== 'salesman' && user.role !== 'admin')) {
            window.location.replace('login-portal.html');
        }
    } catch (e) {
        window.location.replace('login-portal.html');
    }
})();

// Hard guard — live session + role from profiles
(async function enforceSalesmanSession() {
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
        if (error || !profile || (profile.role !== 'salesman' && profile.role !== 'admin')) {
            localStorage.removeItem('currentUser');
            try { await supabaseClient.auth.signOut(); } catch (_) {}
            window.location.replace('login-portal.html');
            return;
        }
        const prev = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const viewingAsSalesman = !!(prev.isViewAs || localStorage.getItem('originalAdminUser'));
        const viewAsEmail = String(prev.viewAsSalesmanEmail || localStorage.getItem('viewAsSalesmanEmail') || '').toLowerCase().trim();
        const viewAsName = prev.viewAsSalesmanName || localStorage.getItem('viewAsSalesmanName') || '';
        const seatEmail = (viewingAsSalesman && viewAsEmail) ? viewAsEmail : profile.email;
        const seatName = viewingAsSalesman
            ? (viewAsEmail && viewAsEmail !== 'jackerman@donegalnatural.com'
                ? ('Jonathan (Operating as ' + (viewAsName || 'Brian') + ')')
                : 'Jonathan (Sales View)')
            : (profile.full_name || profile.email);
        const refreshed = {
            id: profile.id,
            username: seatEmail,
            fullName: seatName,
            name: seatName,
            role: viewingAsSalesman ? 'salesman' : profile.role,
            company: profile.company || '',
            email: seatEmail,
            viewAsSalesmanEmail: viewingAsSalesman ? viewAsEmail : '',
            viewAsSalesmanName: viewingAsSalesman ? viewAsName : '',
            mustChangePassword: !!profile.must_change_password,
            loginTime: prev.loginTime || new Date().toISOString(),
            supabase: true,
            isViewAs: viewingAsSalesman
        };
        localStorage.setItem('currentUser', JSON.stringify(refreshed));
        currentUser = refreshed;
    } catch (e) {
        console.error('enforceSalesmanSession:', e);
        localStorage.removeItem('currentUser');
        window.location.replace('login-portal.html');
    }
})();

async function revalidateSalesmanSession() {
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
        if (error || !profile || (profile.role !== 'salesman' && profile.role !== 'admin')) {
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

window.addEventListener('pageshow', function () { revalidateSalesmanSession(); });
window.addEventListener('focus', function () { revalidateSalesmanSession(); });
document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') revalidateSalesmanSession();
});
// ================== PRODUCT CATALOG ==================
var PRODUCT_CATALOG = [
    // ========== BULLY STICKS - Green Line ==========
    { name: "6” Thin Green Line Bully Sticks (Bulk)", category: "Bully Sticks", subCategory: "Green Line", caseSize: "1000/cs", unitPrice: 0.54, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” Thin Green Line Bully Sticks (Bulk)", category: "Bully Sticks", subCategory: "Green Line", caseSize: "500/cs", unitPrice: 1.10, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6” Regular Green Line Bully Sticks (Bulk)", category: "Bully Sticks", subCategory: "Green Line", caseSize: "800/cs", unitPrice: 1.53, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” Regular Green Line Bully Sticks (Bulk)", category: "Bully Sticks", subCategory: "Green Line", caseSize: "400/cs", unitPrice: 2.87, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6” “Thick” Green Line Bully Sticks (Bulk)", category: "Bully Sticks", subCategory: "Green Line", caseSize: "600/cs", unitPrice: 1.79, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” “Thick” Green Line Bully Sticks (Bulk)", category: "Bully Sticks", subCategory: "Green Line", caseSize: "300/cs", unitPrice: 3.58, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6” “Super Thick” Green Line Bully Sticks (Bulk)", category: "Bully Sticks", subCategory: "Green Line", caseSize: "500/cs", unitPrice: 2.51, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” “Super Thick” Green Line Bully Sticks (Bulk)", category: "Bully Sticks", subCategory: "Green Line", caseSize: "250/cs", unitPrice: 4.99, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== BULLY STICKS - Canes ==========
    { name: "24-28” Bully Cane", category: "Bully Sticks", subCategory: "Canes", caseSize: "50/cs", unitPrice: 9.95, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "32-36” Bully Cane", category: "Bully Sticks", subCategory: "Canes", caseSize: "50/cs", unitPrice: 11.40, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== BULLY STICKS - Braided Bully ==========
    { name: "6” Braided Bully Sticks (Bulk)", category: "Bully Sticks", subCategory: "Braided Bully", caseSize: "100/cs", unitPrice: 3.10, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” Braided Bully Sticks (Bulk)", category: "Bully Sticks", subCategory: "Braided Bully", caseSize: "50/cs", unitPrice: 6.11, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6” “Super” Braided Bully Sticks (Bulk)", category: "Bully Sticks", subCategory: "Braided Bully", caseSize: "75/cs", unitPrice: 4.31, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” “Super” Braided Bully Sticks (Bulk)", category: "Bully Sticks", subCategory: "Braided Bully", caseSize: "35/cs", unitPrice: 7.91, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== BULLY STICKS - Euro Bully ==========
    { name: "6” Euro Bully Stick (Bulk)", category: "Bully Sticks", subCategory: "Euro Bully", caseSize: "300/cs", unitPrice: 2.15, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6” Euro Bully Stick (Display)", category: "Bully Sticks", subCategory: "Euro Bully", caseSize: "70/display", unitPrice: 2.19, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” Euro Bully Stick (Bulk)", category: "Bully Sticks", subCategory: "Euro Bully", caseSize: "300/cs", unitPrice: 4.42, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” Euro Bully Sticks (Display)", category: "Bully Sticks", subCategory: "Euro Bully", caseSize: "70/display", unitPrice: 4.54, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== BULLY STICKS - Bully Pieces ==========
    { name: "8oz. Bag of Bully Pieces", category: "Bully Sticks", subCategory: "Bully Pieces", caseSize: "70bags/cs", unitPrice: 6.59, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10oz. Bag of Bully Pieces", category: "Bully Sticks", subCategory: "Bully Pieces", caseSize: "50bags/cs", unitPrice: 10.07, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "16oz. Bag of Bully Pieces", category: "Bully Sticks", subCategory: "Bully Pieces", caseSize: "35bags/cs", unitPrice: 12.30, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== JERKY - Jerky Stick Treats ==========
    { name: "USA Beef Jerky Treats (Bulk)", category: "Jerky", subCategory: "Jerky Stick Treats", caseSize: "1000/cs", unitPrice: 0.52, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "USA Beef Jerky Treats (Display)", category: "Jerky", subCategory: "Jerky Stick Treats", caseSize: "250/display", unitPrice: 0.53, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "USA Turkey Jerky Treats (Bulk)", category: "Jerky", subCategory: "Jerky Stick Treats", caseSize: "1200/cs", unitPrice: 0.57, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "USA Turkey Jerky Treats (Display)", category: "Jerky", subCategory: "Jerky Stick Treats", caseSize: "250/display", unitPrice: 0.59, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "USA Chicken Jerky Treats (Bulk)", category: "Jerky", subCategory: "Jerky Stick Treats", caseSize: "1200/cs", unitPrice: 0.59, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "USA Chicken Jerky Treats (Display)", category: "Jerky", subCategory: "Jerky Stick Treats", caseSize: "250/display", unitPrice: 0.58, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "USA Elky Jerky Treats (Bulk)", category: "Jerky", subCategory: "Jerky Stick Treats", caseSize: "1000/cs", unitPrice: 0.59, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "USA Elky Jerky Treats (Display)", category: "Jerky", subCategory: "Jerky Stick Treats", caseSize: "250/display", unitPrice: 0.60, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "USA Venison & Sweet Potato Jerky Treats (Bulk)", category: "Jerky", subCategory: "Jerky Stick Treats", caseSize: "1000/cs", unitPrice: 0.59, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "USA Venison & Sweet Potato Jerky Treats (Display)", category: "Jerky", subCategory: "Jerky Stick Treats", caseSize: "250/display", unitPrice: 0.61, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== JERKY - Training Treats ==========
    { name: "6oz. Bags of USA Elky Training Treats", category: "Jerky", subCategory: "Training Treats", caseSize: "50/cs", unitPrice: 3.90, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "8oz. Bags of USA Elky Training Treats", category: "Jerky", subCategory: "Training Treats", caseSize: "50/cs", unitPrice: 6.65, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "September 2026" },
    { name: "10oz. Bags of USA Elky Training Treats", category: "Jerky", subCategory: "Training Treats", caseSize: "35/cs", unitPrice: 7.91, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12oz. Bags of USA Elky Training Treats", category: "Jerky", subCategory: "Training Treats", caseSize: "35/cs", unitPrice: 9.90, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "September 2026" },


    // ========== JERKY - Jerky Stuffed Bones ==========
    { name: "Large Turkey Jerky Stuffed Buffalo Bone", category: "Jerky", subCategory: "Jerky Stuffed Bones", caseSize: "50/cs", unitPrice: 4.07, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Large Elky Jerky Stuffed Buffalo Bone", category: "Jerky", subCategory: "Jerky Stuffed Bones", caseSize: "50/cs", unitPrice: 4.07, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Large Venison and Sweet Potato Stuffed Buffalo Bone", category: "Jerky", subCategory: "Jerky Stuffed Bones", caseSize: "50/cs", unitPrice: 4.07, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== EARS ==========
    { name: "Natural Cow Ears (Bulk)", category: "Ears", subCategory: "Natural/Flavored Cow Ears", caseSize: "150/cs", unitPrice: 1.04, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Vanilla Cow Ears (Bulk)", category: "Ears", subCategory: "Natural/Flavored Cow Ears", caseSize: "150/cs", unitPrice: 1.13, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Honey Smoked Cow Ears (Bulk)", category: "Ears", subCategory: "Natural/Flavored Cow Ears", caseSize: "150/cs", unitPrice: 1.19, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Hairy Beef Ears (Bulk)", category: "Ears", subCategory: "Hairy Beef Ears", caseSize: "80/cs", unitPrice: 1.31, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "MAGNA Buffalo Ears (Bulk)", category: "Ears", subCategory: "Buffalo Ears", caseSize: "100/cs", unitPrice: 1.07, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Honey Smoked MAGNA Buffalo Ears (Bulk)", category: "Ears", subCategory: "Buffalo Ears", caseSize: "100/cs", unitPrice: 1.19, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Polish Pig Ears (Bulk)", category: "Ears", subCategory: "Pig Ears", caseSize: "100/cs", unitPrice: 0.98, isMarketPrice: true, marketPriceNote: "Market Price – currently set to $0.98", landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "White Lamb Ears (Bulk)", category: "Ears", subCategory: "Lamb Ears", caseSize: "400/cs", unitPrice: 0.44, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Vanilla Lamb Ears (Bulk)", category: "Ears", subCategory: "Lamb Ears", caseSize: "400/cs", unitPrice: 0.52, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Fuzzy Rabbit Ears (Bulk)", category: "Ears", subCategory: "Fuzzy Rabbit Ears", caseSize: "500/cs", unitPrice: 0.37, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== COW CHEEKS ==========
    { name: "5-6” Natural Rollio (Bulk)", category: "Cow Cheeks", subCategory: "All Natural Rollio", caseSize: "100/cs", unitPrice: 1.91, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-12” Natural Rollio (Bulk)", category: "Cow Cheeks", subCategory: "All Natural Rollio", caseSize: "50/cs", unitPrice: 3.59, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "5-6” Regular Rollio (Bulk)", category: "Cow Cheeks", subCategory: "Natural/Flavored Rollios", caseSize: "100/cs", unitPrice: 2.10, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-12” Regular Rollio (Bulk)", category: "Cow Cheeks", subCategory: "Natural/Flavored Rollios", caseSize: "50/cs", unitPrice: 3.95, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "5-6” Vanilla Rollio (Bulk)", category: "Cow Cheeks", subCategory: "Natural/Flavored Rollios", caseSize: "100/cs", unitPrice: 2.23, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-12” Vanilla Rollio (Bulk)", category: "Cow Cheeks", subCategory: "Natural/Flavored Rollios", caseSize: "50/cs", unitPrice: 4.14, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "5-6” Honey Smoked Rollio (Bulk)", category: "Cow Cheeks", subCategory: "Natural/Flavored Rollios", caseSize: "100/cs", unitPrice: 2.32, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-12” Honey Smoked Rollio (Bulk)", category: "Cow Cheeks", subCategory: "Natural/Flavored Rollios", caseSize: "50/cs", unitPrice: 4.43, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "5-6” PHAT Rollio (Bulk)", category: "Cow Cheeks", subCategory: "PHAT Rollios", caseSize: "100/cs", unitPrice: 2.51, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-12” PHAT Rollio (Bulk)", category: "Cow Cheeks", subCategory: "PHAT Rollios", caseSize: "50/cs", unitPrice: 5.03, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "5-6” Vanilla PHAT Rollio (Bulk)", category: "Cow Cheeks", subCategory: "PHAT Rollios", caseSize: "100/cs", unitPrice: 2.51, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-12” Vanilla PHAT Rollio (Bulk)", category: "Cow Cheeks", subCategory: "PHAT Rollios", caseSize: "50/cs", unitPrice: 5.15, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "5-6” Honey Smoked PHAT Rollio (Bulk)", category: "Cow Cheeks", subCategory: "PHAT Rollios", caseSize: "100/cs", unitPrice: 2.63, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-12” Honey Smoked PHAT Rollio (Bulk)", category: "Cow Cheeks", subCategory: "PHAT Rollios", caseSize: "50/cs", unitPrice: 5.15, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "5-6” Peanut Butter Rollio (Bulk)", category: "Cow Cheeks", subCategory: "Peanut Butter Rollios", caseSize: "100/cs", unitPrice: 2.62, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-12” Peanut Butter Rollio (Bulk)", category: "Cow Cheeks", subCategory: "Peanut Butter Rollios", caseSize: "50/cs", unitPrice: 4.19, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "5-6” Cow Cheek Slab (Bulk per lb.)", category: "Cow Cheeks", subCategory: "Cow Cheek Slabs", caseSize: "28lbs/cs", unitPrice: 6.18, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "5-6” Vanilla Cow Cheek Slab (Bulk per lb.)", category: "Cow Cheeks", subCategory: "Cow Cheek Slabs", caseSize: "28lbs/cs", unitPrice: 6.42, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-12” Cow Cheek Slab (Bulk per lb.)", category: "Cow Cheeks", subCategory: "Cow Cheek Slabs", caseSize: "28lbs/cs", unitPrice: 6.18, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-12” Vanilla Cow Cheek Slab (Bulk per lb.)", category: "Cow Cheeks", subCategory: "Cow Cheek Slabs", caseSize: "28lbs/cs", unitPrice: 6.42, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-12” Natural Cow Cheek Slabs (Bulk per lb.)", category: "Cow Cheeks", subCategory: "Cow Cheek Slabs", caseSize: "28lbs/cs", unitPrice: 5.99, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "White Chunky Cheeks (Bulk)", category: "Cow Cheeks", subCategory: "Chunky Cheeks", caseSize: "22lbs/cs", unitPrice: 5.93, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Vanilla Chunky Cheeks (Bulk)", category: "Cow Cheeks", subCategory: "Chunky Cheeks", caseSize: "22lbs/cs", unitPrice: 5.99, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== OX TAILS ==========
    { name: "6” MAGNA Natural Ox Tails (Bulk)", category: "Ox Tails", subCategory: "MAGNA Ox Tails", caseSize: "150/cs", unitPrice: 2.02, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” MAGNA Natural Ox Tails (Bulk)", category: "Ox Tails", subCategory: "MAGNA Ox Tails", caseSize: "75/cs", unitPrice: 3.32, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6” White Ox Tails (Bulk)", category: "Ox Tails", subCategory: "Ox Tails", caseSize: "500/cs", unitPrice: 0.95, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” White Ox Tails (Bulk)", category: "Ox Tails", subCategory: "Ox Tails", caseSize: "250/cs", unitPrice: 2.03, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6” Vanilla Ox Tails (Bulk)", category: "Ox Tails", subCategory: "Ox Tails", caseSize: "500/cs", unitPrice: 1.19, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” Vanilla Ox Tails (Bulk)", category: "Ox Tails", subCategory: "Ox Tails", caseSize: "250/cs", unitPrice: 2.27, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6” Honey Smoked Ox Tails (Bulk)", category: "Ox Tails", subCategory: "Ox Tails", caseSize: "500/cs", unitPrice: 1.19, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” Honey Smoked Ox Tails (Bulk)", category: "Ox Tails", subCategory: "Ox Tails", caseSize: "250/cs", unitPrice: 2.37, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== RABBIT ==========
    { name: "Fuzzy Rabbit Ears (Bulk)", category: "Rabbit", subCategory: "Fuzzy Rabbit Ears", caseSize: "500/cs", unitPrice: 0.37, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Fuzzy Rabbit Feet (Bulk)", category: "Rabbit", subCategory: "Fuzzy Rabbit Feet", caseSize: "500/cs", unitPrice: 0.45, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== DUCK AND GOOSE ==========
    { name: "Crunchy Baked Duck Necks (Bulk)", category: "Duck and Goose", subCategory: "Duck Neck", caseSize: "300/cs", unitPrice: 0.83, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Crunchy Baked Duck Heads (Bulk)", category: "Duck and Goose", subCategory: "Duck Heads", caseSize: "300/cs", unitPrice: 0.83, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Euro Duck Feet (Bulk)", category: "Duck and Goose", subCategory: "Duck Feet", caseSize: "500/cs", unitPrice: 0.78, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Euro Duck Feet (Display)", category: "Duck and Goose", subCategory: "Duck Feet", caseSize: "150/display", unitPrice: 0.90, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Goose Neck (Bulk)", category: "Duck and Goose", subCategory: "Goose Neck", caseSize: "150/cs", unitPrice: 1.79, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== BEEF ==========
    { name: "Super Meaty Beef Tendons (Bulk)", category: "Beef", subCategory: "Super Meaty Beef Tendons", caseSize: "140/cs", unitPrice: 2.03, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6” Paddywack (Bulk)", category: "Beef", subCategory: "Paddywacks", caseSize: "500/cs", unitPrice: 0.65, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” Paddywack (Bulk)", category: "Beef", subCategory: "Paddywacks", caseSize: "200/cs", unitPrice: 1.32, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6” Corium Sticks (Bulk)", category: "Beef", subCategory: "Corium Sticks", caseSize: "400/cs", unitPrice: 1.11, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” Corium Sticks (Bulk)", category: "Beef", subCategory: "Corium Sticks", caseSize: "180/cs", unitPrice: 2.16, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6” Beef Wrapped Corium Sticks (Bulk)", category: "Beef", subCategory: "Corium Sticks", caseSize: "200/cs", unitPrice: 1.46, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” Beef Wrapped Corium Sticks (Bulk)", category: "Beef", subCategory: "Corium Sticks", caseSize: "100/cs", unitPrice: 2.88, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "5-6” Beef Trachea", category: "Beef", subCategory: "Trachea and Trachea Pieces", caseSize: "60/cs", unitPrice: 0.78, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-13” Beef Trachea", category: "Beef", subCategory: "Trachea and Trachea Pieces", caseSize: "120/cs", unitPrice: 1.79, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== BUFFALO ==========
    { name: "MAGNA Buffalo Ears (Bulk)", category: "Buffalo", subCategory: "Buffalo Ears", caseSize: "100/cs", unitPrice: 1.07, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Honey Smoked MAGNA Buffalo Ears (Bulk)", category: "Buffalo", subCategory: "Buffalo Ears", caseSize: "100/cs", unitPrice: 1.19, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Reg Large Meaty Buffalo Bone", category: "Buffalo", subCategory: "Buffalo Bone and Knuckle", caseSize: "50/cs", unitPrice: 2.63, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Small Meaty Buffalo Knuckle", category: "Buffalo", subCategory: "Buffalo Bone and Knuckle", caseSize: "100/cs", unitPrice: 0.42, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Large Turkey Jerky Stuffed Buffalo Bone", category: "Buffalo", subCategory: "Stuffed Buffalo Bones", caseSize: "50/cs", unitPrice: 4.07, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Large Elky Jerky Stuffed Buffalo Bone", category: "Buffalo", subCategory: "Stuffed Buffalo Bones", caseSize: "50/cs", unitPrice: 4.07, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Large Venison and Sweet Potato Stuffed Buffalo Bone", category: "Buffalo", subCategory: "Stuffed Buffalo Bones", caseSize: "50/cs", unitPrice: 4.07, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Large Peanut Butter Stuffed Buffalo Bone", category: "Buffalo", subCategory: "Stuffed Buffalo Bones", caseSize: "50/cs", unitPrice: 4.07, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Large Buffalo Horn (Bulk)", category: "Buffalo", subCategory: "Buffalo Horns", caseSize: "35/cs", unitPrice: 5.14, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Medium Buffalo Horn (Bulk)", category: "Buffalo", subCategory: "Buffalo Horns", caseSize: "50/cs", unitPrice: 3.42, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Small Buffalo Horn (Bulk)", category: "Buffalo", subCategory: "Buffalo Horns", caseSize: "100/cs", unitPrice: 1.98, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6” Buffalo Collagen Sticks", category: "Buffalo", subCategory: "Buffalo Collagen", caseSize: "200/cs", unitPrice: 0.95, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== FEET ==========
    { name: "Crunchy Euro Chicken Feet (Bulk)", category: "Feet", subCategory: "Chicken Feet", caseSize: "750/cs", unitPrice: 0.30, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Euro White Chicken Feet (Bulk)", category: "Feet", subCategory: "Chicken Feet", caseSize: "500/cs", unitPrice: 0.30, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Vanilla Flavored White Euro Chicken Feet (Bulk)", category: "Feet", subCategory: "Chicken Feet", caseSize: "500/cs", unitPrice: 0.35, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Euro Duck Feet (Bulk)", category: "Feet", subCategory: "Duck Feet", caseSize: "500/cs", unitPrice: 0.78, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Fuzzy Rabbit Feet (Bulk)", category: "Feet", subCategory: "Fuzzy Rabbit Feet", caseSize: "500/cs", unitPrice: 0.45, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== HORNS ==========
    { name: "Large Rams Horn (Bulk)", category: "Horns", subCategory: "Rams Horn", caseSize: "50/cs", unitPrice: 5.51, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Medium Rams Horn (Bulk)", category: "Horns", subCategory: "Rams Horn", caseSize: "80/cs", unitPrice: 3.29, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Small Rams Horn (Bulk)", category: "Horns", subCategory: "Rams Horn", caseSize: "195/cs", unitPrice: 1.70, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Large Buffalo Horn (Bulk)", category: "Horns", subCategory: "Buffalo Horn", caseSize: "35/cs", unitPrice: 5.14, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Medium Buffalo Horn (Bulk)", category: "Horns", subCategory: "Buffalo Horn", caseSize: "50/cs", unitPrice: 3.42, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Small Buffalo Horn (Bulk)", category: "Horns", subCategory: "Buffalo Horn", caseSize: "100/cs", unitPrice: 1.98, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== HOOVES ==========
    { name: "Regular Cow Hooves (Bulk)", category: "Hooves", subCategory: "Cow Hooves", caseSize: "400/cs", unitPrice: 0.47, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Smoked Cow Hooves (Bulk)", category: "Hooves", subCategory: "Cow Hooves", caseSize: "400/cs", unitPrice: 0.54, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "“Super” Cow Hooves (Bulk)", category: "Hooves", subCategory: "Cow Hooves", caseSize: "200/cs", unitPrice: 0.95, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== BRAIDED ==========
    { name: "6” Braided Esophagus (Bulk)", category: "Braided", subCategory: "Braided Esophagus", caseSize: "500/cs", unitPrice: 0.90, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” Braided Esophagus (Bulk)", category: "Braided", subCategory: "Braided Esophagus", caseSize: "250/cs", unitPrice: 1.79, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6” Braided Esophagus (Display)", category: "Braided", subCategory: "Braided Esophagus", caseSize: "50/display", unitPrice: 0.95, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12” Braided Esophagus (Display)", category: "Braided", subCategory: "Braided Esophagus", caseSize: "25/display", unitPrice: 1.91, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "5-7” Braided USA Hide Donuts (Bulk)", category: "Braided", subCategory: "Supreme USA Hide Braided Donuts", caseSize: "45/cs", unitPrice: 5.27, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "5-7” Vanilla USA Hide Braided Donuts (Bulk)", category: "Braided", subCategory: "Supreme USA Hide Braided Donuts", caseSize: "45/cs", unitPrice: 5.51, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "8-9” Braided USA Hide Donuts (Bulk)", category: "Braided", subCategory: "Supreme USA Hide Braided Donuts", caseSize: "30/cs", unitPrice: 6.46, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "8-9” Vanilla USA Hide Braided Donuts (Bulk)", category: "Braided", subCategory: "Supreme USA Hide Braided Donuts", caseSize: "30/cs", unitPrice: 6.59, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-11” Braided USA Hide Donuts (Bulk)", category: "Braided", subCategory: "Supreme USA Hide Braided Donuts", caseSize: "20/cs", unitPrice: 7.89, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-11” Vanilla USA Hide Braided Donuts (Bulk)", category: "Braided", subCategory: "Supreme USA Hide Braided Donuts", caseSize: "20/cs", unitPrice: 7.99, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== LARGE MEATY FEMUR / BONE / KNUCKLES ==========
    { name: "14-16” Jumbo Meaty Femur Knuckle Bone", category: "Large Meaty Femur/Bone/Knuckles", subCategory: "Jumbo Meaty Femur", caseSize: "18/cs", unitPrice: 6.59, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== PRESSED BONES ==========
    { name: "6” Supreme Pressed Ring (Bulk)", category: "Pressed Bones", subCategory: "Supreme Pressed Ring", caseSize: "100/cs", unitPrice: 2.77, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10” x 20mm Supreme Pressed Stick (Bulk)", category: "Pressed Bones", subCategory: "Supreme Pressed Stick", caseSize: "200/cs", unitPrice: 1.37, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "4.5” Pressed Bone (Bulk)", category: "Pressed Bones", subCategory: "Supreme Pressed Bones", caseSize: "500/cs", unitPrice: 0.41, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6.5” Pressed Bone (Bulk)", category: "Pressed Bones", subCategory: "Supreme Pressed Bones", caseSize: "200/cs", unitPrice: 1.32, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "8.5” Pressed Bone (Bulk)", category: "Pressed Bones", subCategory: "Supreme Pressed Bones", caseSize: "100/cs", unitPrice: 2.27, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10.5” Pressed Bone (Bulk)", category: "Pressed Bones", subCategory: "Supreme Pressed Bones", caseSize: "50/cs", unitPrice: 3.95, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "12.5” Pressed Bone (Bulk)", category: "Pressed Bones", subCategory: "Supreme Pressed Bones", caseSize: "50/cs", unitPrice: 5.65, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== TWISTY Q’S AND MUNCHY STICKS ==========
    { name: "12” x 20mm Natural Munchy Sticks (Bulk)", category: "Twisty Q’s and Natural Munchy Sticks", subCategory: "Munch Sticks", caseSize: "200/cs", unitPrice: 0.30, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "5” x 10mm Natural Munchy Sticks (Bulk)", category: "Twisty Q’s and Natural Munchy Sticks", subCategory: "Munch Sticks", caseSize: "2000/cs", unitPrice: 0.05, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6.5” Bacon Munchy Sticks (Bulk)", category: "Twisty Q’s and Natural Munchy Sticks", subCategory: "Munch Sticks", caseSize: "1300/cs", unitPrice: 0.06, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10” White Twisty Q’s (Bulk)", category: "Twisty Q’s and Natural Munchy Sticks", subCategory: "Twisty Q’s", caseSize: "500/cs", unitPrice: 0.49, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10” Vanilla Twisty Q’s (Bulk)", category: "Twisty Q’s and Natural Munchy Sticks", subCategory: "Twisty Q’s", caseSize: "500/cs", unitPrice: 0.52, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== SUPREME HIDE CHIPS ==========
    { name: "White USA Supreme Hide Chips (Bulk per lb.)", category: "Supreme Hide Chips", subCategory: "Supreme USA Hide Chips", caseSize: "23lbs/cs", unitPrice: 5.93, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Vanilla USA Supreme Chips (Bulk per lb.)", category: "Supreme Hide Chips", subCategory: "Supreme USA Hide Chips", caseSize: "22lbs/cs", unitPrice: 5.99, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "Peanut Butter Basted USA Supreme Hide Chips (Bulk per lb.)", category: "Supreme Hide Chips", subCategory: "Supreme USA Hide Chips", caseSize: "23lbs/cs", unitPrice: 5.39, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== RETRIEVERS ==========
    { name: "6/9” White Supreme Retriever (Bulk)", category: "Retrievers", subCategory: "USA White Hide Retriever", caseSize: "280/cs", unitPrice: 0.94, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-11” x 30mm White Supreme Retriever (Bulk)", category: "Retrievers", subCategory: "USA White Hide Retriever", caseSize: "130/cs", unitPrice: 1.62, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6/9” Vanilla Supreme Retriever (Bulk)", category: "Retrievers", subCategory: "Vanilla Flavored Retriever", caseSize: "300/cs", unitPrice: 1.22, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-11” x 30mm Vanilla MAGNA Retriever (Bulk)", category: "Retrievers", subCategory: "Vanilla Flavored Retriever", caseSize: "150/cs", unitPrice: 2.00, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

    // ========== PACKAGED ITEMS ==========
    { name: "6-Pack Natural Cow Ears", category: "Packaged Items", subCategory: "Packaged Ears", caseSize: "24bags/cs", unitPrice: 7.13, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6-Pack Vanilla Cow Ears", category: "Packaged Items", subCategory: "Packaged Ears", caseSize: "24bags/cs", unitPrice: 7.13, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "6-Pack Honey Smoked Cow Ears", category: "Packaged Items", subCategory: "Packaged Ears", caseSize: "24bags/cs", unitPrice: 7.13, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-Pack Fuzzy Rabbit Ears", category: "Packaged Items", subCategory: "Packaged Ears", caseSize: "60bags/cs", unitPrice: 4.45, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "5-Pack Hairy Beef Ears", category: "Packaged Items", subCategory: "Packaged Ears", caseSize: "50bags/cs", unitPrice: 7.19, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-Pack Euro Chicken Feet", category: "Packaged Items", subCategory: "Packaged Feet", caseSize: "50bags/cs", unitPrice: 3.59, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-Pack White Euro Chicken Feet", category: "Packaged Items", subCategory: "Packaged Feet", caseSize: "60bags/cs", unitPrice: 3.59, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-Pack Vanilla Euro Chicken Feet", category: "Packaged Items", subCategory: "Packaged Feet", caseSize: "60bags/cs", unitPrice: 3.95, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-Pack Euro Duck Feet", category: "Packaged Items", subCategory: "Packaged Feet", caseSize: "50bags/cs", unitPrice: 9.11, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-Pack Fuzzy Rabbit Feet", category: "Packaged Items", subCategory: "Packaged Feet", caseSize: "60bags/cs", unitPrice: 5.10, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "8oz. Bags of White Chunky Cheeks", category: "Packaged Items", subCategory: "Chunky Cheeks", caseSize: "24bags/cs", unitPrice: 3.46, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "8oz. Bags of Vanilla Chunky Cheeks", category: "Packaged Items", subCategory: "Chunky Cheeks", caseSize: "24bags/cs", unitPrice: 3.46, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "16oz. Bags of White Chunky Cheeks", category: "Packaged Items", subCategory: "Chunky Cheeks", caseSize: "12bags/cs", unitPrice: 6.33, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "16oz. Bags of Vanilla Chunky Cheeks", category: "Packaged Items", subCategory: "Chunky Cheeks", caseSize: "12bags/cs", unitPrice: 6.33, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "8oz. Bag of Beef Lung", category: "Packaged Items", subCategory: "Beef Lung", caseSize: "50bags/cs", unitPrice: 4.48, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "16oz. Bag of Beef Lung", category: "Packaged Items", subCategory: "Beef Lung", caseSize: "25bags/cs", unitPrice: 8.70, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "8oz. Bags of Beef Trachea Pieces", category: "Packaged Items", subCategory: "Trachea Pieces", caseSize: "24bags/cs", unitPrice: 3.11, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "16oz. Bags of Beef Trachea Pieces", category: "Packaged Items", subCategory: "Trachea Pieces", caseSize: "12/cs", unitPrice: 5.99, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "8oz. Bags of White Supreme Chips (Binkey’s)", category: "Packaged Items", subCategory: "Binky’s", caseSize: "24bags/cs", unitPrice: 2.99, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "8oz. Bags of Peanut Butter Supreme Chips (Binkey’s)", category: "Packaged Items", subCategory: "Binky’s", caseSize: "24bags/cs", unitPrice: 2.99, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "8oz. Bags of Vanilla Supreme Chips (Binkey’s)", category: "Packaged Items", subCategory: "Binky’s", caseSize: "24bags/cs", unitPrice: 2.99, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "16oz. Bags of White Supreme Chips (Binkey’s)", category: "Packaged Items", subCategory: "Binky’s", caseSize: "12bags/cs", unitPrice: 5.99, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "16oz. Bags of Peanut Butter Supreme Chips (Binkey’s)", category: "Packaged Items", subCategory: "Binky’s", caseSize: "12bags/cs", unitPrice: 5.99, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "16oz. Bags of Vanilla Supreme Chips (Binkey’s)", category: "Packaged Items", subCategory: "Binky’s", caseSize: "12bags/cs", unitPrice: 6.18, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "5-Pack of Crunchy Duck Heads", category: "Packaged Items", subCategory: "Duck and Goose", caseSize: "75bags/cs", unitPrice: 16.07, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-Pack of Crunchy Duck Necks", category: "Packaged Items", subCategory: "Duck and Goose", caseSize: "50bags/cs", unitPrice: 8.99, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-Pack of Crunchy Goose Necks", category: "Packaged Items", subCategory: "Duck and Goose", caseSize: "50bags/cs", unitPrice: 17.99, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "10-Pack of Duck Heads", category: "Packaged Items", subCategory: "Duck and Goose", caseSize: "50bags/cs", unitPrice: 7.91, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" }
];


// ================== USER HELPERS ==================
function getCurrentUser() {
    try {
        // Read from 'currentUser' — this is the key that login-portal.js writes to
        const saved = localStorage.getItem("currentUser");
        if (!saved) return null;
        return JSON.parse(saved);
    } catch {
        return null;
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

    try {
        const { error: authError } = await supabaseClient.auth.updateUser({ password: p1 });
        if (authError) throw authError;

        // Best-effort clear of the flag (RLS may block this — do not throw)
        if (user.id) {
            const { error: profileError } = await supabaseClient
                .from('profiles')
                .update({ must_change_password: false })
                .eq('id', user.id);
            if (profileError) {
                console.warn('profiles.must_change_password update blocked:', profileError.message);
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

function goToAdminView() {
    try {
        const original = JSON.parse(localStorage.getItem('originalAdminUser') || 'null');
        if (original) {
            localStorage.setItem('currentUser', JSON.stringify(original));
            localStorage.removeItem('originalAdminUser');
            localStorage.removeItem('viewAsSalesmanEmail');
            localStorage.removeItem('viewAsSalesmanName');
        }
    } catch (e) {
        console.error('goToAdminView error:', e);
    }
    window.location.href = 'internal-portal.html';
}

function isHeadAdmin() {
    const user = getCurrentUser();
    return user && user.role === "admin";
}

function displayCurrentUser() {
    const nameEl = document.getElementById("user-name");
    const welcomeName = document.getElementById("welcome-name");
    const territoriesEl = document.getElementById("welcome-territories");
    const user = getCurrentUser() || currentUser;

    if (!user) return;

    // Use fullName (from login-portal) with fallback to name for compatibility
    const displayName = user.fullName || user.name || "User";

    if (nameEl) nameEl.textContent = displayName;
    if (welcomeName) welcomeName.textContent = displayName;

    if (territoriesEl) {
        const roleText = user.role === "admin" ? "Head Admin" : "Salesman";
        const territoryText = user.territories ? ` • ${user.territories.join(" + ")}` : "";
        territoriesEl.innerHTML = `<strong>${escapeHtml(roleText)}</strong>${escapeHtml(territoryText)}`;
    }

    // Show Admin View when we are Jonathan or when we are in a temporary Sales View
        const adminViewBtn = document.getElementById("admin-view-btn");
    if (adminViewBtn) {
        const email = (user.email || "").toLowerCase().trim();
        const hasOriginalAdmin = !!localStorage.getItem('originalAdminUser');
    if (email === "jackerman@donegalnatural.com" || hasOriginalAdmin || user.isViewAs) {
        adminViewBtn.style.display = "";
    } else {
        adminViewBtn.style.display = "none";
    }
}
}

// ================== LOGIN ==================

async function showPortal() {
    // Removed reference to deleted #login-view
    document.getElementById("portal-view").style.display = "block";
    document.getElementById("user-info").style.display = "flex";

    displayCurrentUser();
    if (typeof updateOpenOrderButtonVisibility === 'function') updateOpenOrderButtonVisibility();
    populateDropdowns();
    renderCustomers();
    renderProposalHistory();
    renderMyOrders();
    loadCustomerSubmissions();

    // Load from Supabase (or localStorage fallback) then show the Initial Pricing Sheet tab if needed
    await getMySalesmanRecord();
    await updateInitialSheetTabVisibility();

    const adminDashboard = document.getElementById("admin-dashboard");
    if (isHeadAdmin()) {
        adminDashboard.style.display = "block";
        updateAdminDashboard();
    } else {
        adminDashboard.style.display = "none";
    }
}

async function logout() {
    if (!confirm("Are you sure you want to logout?")) return;
    localStorage.removeItem("currentUser");
    try { await supabaseClient.auth.signOut(); } catch (_) {}
    window.location.replace("login-portal.html");
}

// ================== TABS ==================
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-content").forEach(el => el.style.display = "none");
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.getElementById("tab-" + btn.dataset.tab).style.display = "block";
        btn.classList.add("active");

        if (btn.dataset.tab === "order-history") {
            renderMyOrders();
        }
        if (btn.dataset.tab === "account") {
            showAccountDetails();
        }
        if (btn.dataset.tab === "customer-info") {
            loadCustomerSubmissions();
        }
        if (btn.dataset.tab === "proposals") {
            renderProposalHistory();
        }
        if (btn.dataset.tab === "initial-sheet") {
            renderInitialPriceSheet();
        }

        updateInitialSheetTabVisibility();
    });
});

// ================== DROPDOWNS ==================
function populateDropdowns() {
    // Proposal Products
    const prodSelect = document.getElementById("proposal-product");
    if (prodSelect) {
        prodSelect.innerHTML = '<option value="">Select product...</option>';
        const PRODUCTS = [
            { name: "6\" Thin Green Line Bully Stick", price: "$0.54/ea" },
            { name: "12\" Regular Green Line Bully Stick", price: "$2.87/ea" },
            { name: "5-6\" Natural Rollio", price: "$1.91/ea" },
            { name: "Beef Jerky Treats", price: "$0.52/ea" },
            { name: "Fuzzy Rabbit Ears (Bulk)", price: "$0.37/ea" },
            { name: "Small Buffalo Horns", price: "$1.98/ea" }
        ];
        PRODUCTS.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.name;
            opt.textContent = `${p.name} (${p.price})`;
            prodSelect.appendChild(opt);
        });
        prodSelect.onchange = () => {
            const p = PRODUCTS.find(x => x.name === prodSelect.value);
            const currentPriceEl = document.getElementById("current-price");
            if (currentPriceEl) currentPriceEl.value = p ? p.price : "";
        };
    }

    // Proposal Customers
    const custSelect = document.getElementById("proposal-customer");
    if (custSelect) {
        custSelect.innerHTML = '<option value="">Select customer...</option>';
        const MOCK_CUSTOMERS = [
            { name: "Paws & Claws Pet Shop", region: "Northeast" },
            { name: "Happy Tails Supply Co.", region: "Mid-Atlantic" },
            { name: "Midwest Pet Emporium", region: "Midwest" }
        ];
        const user = getCurrentUser() || currentUser;
        MOCK_CUSTOMERS.filter(c => !user.territories || user.territories.includes(c.region))
            .forEach(c => {
                const opt = document.createElement("option");
                opt.value = c.name;
                opt.textContent = `${c.name} (${c.region})`;
                custSelect.appendChild(opt);
            });
    }

    // Order Products
    const orderProductSelect = document.getElementById("order-product");
    if (orderProductSelect) {
        orderProductSelect.innerHTML = '<option value="">Select product...</option>';
        const orderProducts = [
            "6\" Thin Green Line Bully Stick",
            "12\" Regular Green Line Bully Stick",
            "5-6\" Natural Rollio",
            "Beef Jerky Treats",
            "Fuzzy Rabbit Ears (Bulk)",
            "Small Buffalo Horns"
        ];
        orderProducts.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p;
            opt.textContent = p;
            orderProductSelect.appendChild(opt);
        });
    }

    // Order Customers
    const orderCustomerSelect = document.getElementById("order-customer");
    if (orderCustomerSelect) {
        orderCustomerSelect.innerHTML = '<option value="">Select customer...</option>';
        const MOCK_CUSTOMERS = [
            { name: "Paws & Claws Pet Shop", region: "Northeast" },
            { name: "Happy Tails Supply Co.", region: "Mid-Atlantic" },
            { name: "Midwest Pet Emporium", region: "Midwest" }
        ];
        const user = getCurrentUser() || currentUser;
        MOCK_CUSTOMERS.filter(c => !user.territories || user.territories.includes(c.region))
            .forEach(c => {
                const opt = document.createElement("option");
                opt.value = c.name;
                opt.textContent = `${c.name} (${c.region})`;
                orderCustomerSelect.appendChild(opt);
            });
    }
}

// ================== CUSTOMERS ==================
// Customer list, detail, and pricing live in js/salesman/customers.js
















































































// ================== PLACE ORDER MODAL ==================

 // { name, quantity, caseSize, unitPrice, isMarketPrice }

















































if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSalesmanOutOfStock);
} else {
    loadSalesmanOutOfStock();
}



























































// ================== CUSTOMER INFORMATION (Submit for Approval) ==================





























// ================== ORDER SYSTEM ==================




























































async function showAccountDetails() {
    const container = document.getElementById("account-details");
    if (!container) return;

    const user = getCurrentUser() || currentUser;
    if (!user) {
        container.innerHTML = `<p class="text-[#6B4423]">No user information found.</p>`;
        return;
    }

    const { standardRate, marketRate } = getSalesmanCommissionRates(user);

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <p class="text-sm text-[#6B4423] font-semibold">Full Name</p>
                <p class="text-lg font-semibold">${escapeHtml(user.fullName || user.name || "N/A")}</p>
            </div>
            <div>
                <p class="text-sm text-[#6B4423] font-semibold">Email</p>
                <p class="text-lg">${escapeHtml(user.email || "N/A")}</p>
            </div>
            <div>
                <p class="text-sm text-[#6B4423] font-semibold">Role</p>
                <p class="text-lg capitalize">${user.role || "N/A"}</p>
            </div>
            <div>
                <p class="text-sm text-[#6B4423] font-semibold">Territories</p>
                <p class="text-lg">${user.territories ? escapeHtml(user.territories.join(", ")) : "N/A"}</p>
            </div>
            <div>
                <p class="text-sm text-[#6B4423] font-semibold">Standard Commission</p>
                <p class="text-lg font-semibold">${standardRate}%</p>
            </div>
            <div>
                <p class="text-sm text-[#6B4423] font-semibold">Market Price Commission</p>
                <p class="text-lg font-semibold">${marketRate}%</p>
            </div>
        </div>
    `;

        await renderPriceSheet();
}

















// ================== INITIAL PRICING SHEET ==================






















// ================== ADMIN ==================




















// ================== INITIALIZATION ==================
function newProductAlertStorageKey() {
    const email = (typeof getOperatingSalesmanEmail === 'function')
        ? getOperatingSalesmanEmail()
        : String((JSON.parse(localStorage.getItem('currentUser') || '{}').email) || '').toLowerCase().trim();
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

        const salesmanEmail = (typeof getOperatingSalesmanEmail === 'function')
            ? getOperatingSalesmanEmail()
            : '';
        let allowed = null;
        if (salesmanEmail) {
            const { data: sheet } = await supabaseClient
                .from('salesman_price_sheets')
                .select('prices')
                .eq('salesman_email', salesmanEmail)
                .maybeSingle();
            if (sheet && sheet.prices && typeof sheet.prices === 'object') {
                allowed = sheet.prices;
            }
        }
        const visible = (data || []).filter(function (p) {
            if (!p || !p.name) return false;
            if (!allowed) return false;
            return Object.prototype.hasOwnProperty.call(allowed, p.name);
        });
        if (!visible.length) return;

        const list = document.getElementById('new-product-alert-list');
        const modal = document.getElementById('new-product-alert-modal');
        if (!list || !modal) return;

        list.innerHTML = visible.map(p => {
            const price = p.unit_price != null ? ('$' + Number(p.unit_price).toFixed(2)) : '';
            const cs = p.case_size ? (' · ' + p.case_size) : '';
            return '<li><strong>' + escapeHtml(p.name || '') + '</strong>' +
                (p.category ? (' <span class="text-[#6B4423]">(' + escapeHtml(p.category) + escapeHtml(cs) + ')</span>') : '') +
                (price ? (' — ' + escapeHtml(price)) : '') + '</li>';
        }).join('');

        modal.classList.remove('hidden');
    } catch (err) {
        console.error('checkNewProductAlert error:', err);
    }
}

function dismissNewProductAlert() {
    const key = newProductAlertStorageKey();
    if (key) localStorage.setItem(key, new Date().toISOString());
    document.getElementById('new-product-alert-modal')?.classList.add('hidden');
}


window.onload = function() {
    const user = getCurrentUser();

    if (!user || (user.role !== "salesman" && user.role !== "admin")) {
        window.location.href = "login-portal.html";
        return;
    }

    currentUser = user;

    // Force password change on first login
    if (user.mustChangePassword) {
        document.getElementById('password-change-modal')?.classList.remove('hidden');
        return; // stop portal init until password is changed
    }

    showPortal();

    if (typeof checkNewAssignedCustomers === 'function') {
        setTimeout(checkNewAssignedCustomers, 600);
    }
    if (typeof checkNewProductAlert === 'function') {
        setTimeout(checkNewProductAlert, 700);
    }
};