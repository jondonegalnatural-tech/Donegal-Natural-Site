// =============================================
// WHOLESALE-PORTAL.JS — Donegal Natural
// =============================================

console.log("wholesale-portal.js loaded");

// ================== SUPABASE SETUP ==================
var SUPABASE_URL = 'https://kyzfdlzqlckrpdkavxei.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5emZkbHpxbGNrcnBka2F2eGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3ODU0NjEsImV4cCI6MjEwMDM2MTQ2MX0.Y1Sshp1-0lFwKakCgpJtAUpaHNB0PQ1vuo6SOHZcPu4';

var supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = supabaseClient;

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



var quoteItems = JSON.parse(localStorage.getItem('wholesaleQuote')) || [];
 // product_name → quantity
 // pending + fulfilled for this customer





// ================== END MULTI-STORE ==================
   // 'all' or a customer id (string)
   // same for Order History
// ================== FREE SHIPPING HELPERS (customer portal) ==================












/**
 * PA $200 free · FL half $250–$399.99 / free $400 ·
 * East half $250–$1,499.99 / free $1,500 · West half $250–$1,999.99 / free $2,000
 */


var WHOLESALE_MIN_ORDER = 200;












// ================== END FREE SHIPPING HELPERS ==================

// ================== MULTI-STORE (SHARED EMAIL) HELPERS ==================
   // all customers that share the logged-in email






// ================== END MULTI-STORE HELPERS ==================


// ================== INACTIVE SOFT RESTRICTION ==================





// ================== END INACTIVE SOFT RESTRICTION ==================


// ================== MAIN CATEGORIES ==================





// ================== WHOLESALE PRICES (Full Structure with Duplication) ==================
var WHOLESALE_PRICES = [
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
    { category: "Jerky", subCategory: "Training Treats", name: "8oz. Bags of USA Elky Training Treats", cs: "50/cs", price: "$6.65" },
    { category: "Jerky", subCategory: "Training Treats", name: "10oz. Bags of USA Elky Training Treats", cs: "35/cs", price: "$7.91" },
    { category: "Jerky", subCategory: "Training Treats", name: "12oz. Bags of USA Elky Training Treats", cs: "35/cs", price: "$9.90" },

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
    { category: "Elk", subCategory: "", name: "8oz. Bags of USA Elky Training Treats", cs: "50/cs", price: "$6.65" },
    { category: "Elk", subCategory: "", name: "10oz. Bags of USA Elky Training Treats", cs: "35/cs", price: "$7.91" },
    { category: "Elk", subCategory: "", name: "12oz. Bags of USA Elky Training Treats", cs: "35/cs", price: "$9.90" },

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
    { category: "Packaged Items", subCategory: "Jerky", name: "8oz. Bags of USA Elky Training Treats", cs: "50/cs", price: "$6.65" },
    { category: "Packaged Items", subCategory: "Jerky", name: "10oz. Bags of USA Elky Training Treats", cs: "35/cs", price: "$7.91" },
    { category: "Packaged Items", subCategory: "Jerky", name: "12oz. Bags of USA Elky Training Treats", cs: "35/cs", price: "$9.90" },

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






// ================== RENDER CATEGORY FILTERS ==================





























// ================== RENDER PORTAL PRODUCTS (With Grouping) ==================




var MARKET_PRICE_DISCLAIMER = 'Market price. Final invoice may be adjusted to current market cost at shipment.';







































































































































// ================== ADD TO QUOTE SYSTEM ==================




var _openQuoteSaveTimer = null;
































































       





// ================== CUSTOMER BACK ORDERS ==================



// ================== END CUSTOMER BACK ORDERS ==================





















// ================== EDIT QUOTE (pending only) ==================




















// ================== END EDIT QUOTE ==================




// ================== ACCOUNT INFO DISPLAY ==================

























// ================== MANAGE SHIPPING ADDRESSES ==================






































// ================== END MANAGE SHIPPING ADDRESSES ==================



// ================== BAR WITH SUGGESTIONS ==================




// ================== WELCOME MESSAGE ==================


// ================== INITIALIZATION ==================





































































// ================== ADDRESS CONFIRMATION ==================












    
