// =============================================
// SALESMAN-PORTAL.JS — Donegal Natural Salesman Portal
// Updated with correct Head Admin accounts
// =============================================

// ================== SALESMAN / ADMIN ACCOUNTS ==================



// Immediate auth guard — redirect before the page paints
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

let currentUser = null;
let proposals = JSON.parse(localStorage.getItem("salesmanProposals") || "[]");
let vendorLogs = JSON.parse(localStorage.getItem("vendorLogs") || "[]");
let currentOrderItems = [];
// ================== SUPABASE CLIENT ==================
const SUPABASE_URL = 'https://kyzfdlzqlckrpdkavxei.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5emZkbHpxbGNrcnBka2F2eGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3ODU0NjEsImV4cCI6MjEwMDM2MTQ2MX0.Y1Sshp1-0lFwKakCgpJtAUpaHNB0PQ1vuo6SOHZcPu4';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// =====================================================

// ================== PRODUCT CATALOG ==================
const PRODUCT_CATALOG = [
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
    { name: "10oz. Bags of USA Elky Training Treats", category: "Jerky", subCategory: "Training Treats", caseSize: "35/cs", unitPrice: 7.91, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "16oz. Bags of USA Elky Training Treats", category: "Jerky", subCategory: "Training Treats", caseSize: "20/cs", unitPrice: 19.94, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },
    { name: "USA Elky Training Treats (per lb.)", category: "Jerky", subCategory: "Training Treats", caseSize: "20lbs/cs", unitPrice: 19.46, isMarketPrice: false, marketPriceNote: null, landedCost: null, grossProfit: null, priceAsOf: "July 2026" },

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
        territoriesEl.innerHTML = `<strong>${roleText}</strong>${territoryText}`;
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

function logout() {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("originalAdminUser");
    location.reload();
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
async function renderCustomers() {
    const grid = document.getElementById("customers-grid");
    if (!grid) return;

    grid.innerHTML = `<p class="text-sm text-[#6B4423]">Loading customers...</p>`;

    const user = getCurrentUser() || currentUser;
    if (!user) {
        grid.innerHTML = `<p class="text-sm text-[#6B4423]">Please log in.</p>`;
        return;
    }

    try {
        let query = supabaseClient
            .from('customers')
            .select('*')
            .in('status', ['Approved', 'Active'])
            .order('name', { ascending: true });

        if (user.role === 'salesman') {
            query = query.eq(
                'salesman_email',
                (user.email || '').toLowerCase().trim()
            );
        }

        const { data, error } = await query;

        if (error) {
            console.error(error);
            grid.innerHTML = `<p class="text-sm text-red-600">Could not load customers.</p>`;
            return;
        }

        if (!data || data.length === 0) {
            grid.innerHTML = `<p class="text-sm text-[#6B4423]">No approved customers yet.</p>`;
            return;
        }

        window._salesmanCustomers = data || [];
        grid.innerHTML = '';

        data.forEach(c => {
            const safeName = (c.name || '').replace(/'/g, "\\'");
            const div = document.createElement("div");
            div.style.cssText = "background:#fff;border:3px solid #6B4423;border-radius:12px;padding:1rem;cursor:pointer;";
            div.onclick = function (e) {
                if (e.target && e.target.closest && e.target.closest('button')) return;
                showSalesmanCustomerDetail(c);
            };

            const assignedAt = c.assigned_at ? new Date(c.assigned_at) : null;
            const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
            const isNew = assignedAt && (Date.now() - assignedAt.getTime()) < fiveDaysMs;

            const newBadge = isNew
                ? `<span style="display:inline-block;background:#ea580c;color:#fff;font-size:0.7rem;font-weight:700;padding:0.15rem 0.5rem;border-radius:999px;margin-left:0.4rem;vertical-align:middle;">NEW</span>`
                : '';

            const needsPricing = !c.pricing_approved_at;
            const pricingBadge = needsPricing
                ? `<div style="margin-top:0.5rem;font-size:0.75rem;font-weight:700;color:#c2410c;">Pricing not approved yet</div>`
                : '';

            div.innerHTML = `
                <div style="font-weight:700;color:#1E4D2B;margin-bottom:0.3rem;">
                    ${c.name || ''}${newBadge}
                </div>
                <div style="color:#6B4423;font-size:0.85rem;margin-bottom:0.4rem;">
                    ${c.company || ''}
                </div>
                <div style="color:#6B4423;font-size:0.8rem;margin-bottom:0.6rem;">
                    ${c.territory || c.status || ''}
                </div>
                ${pricingBadge}
                <button type="button" onclick="event.stopPropagation(); placeOrderForCustomer('${safeName}')"
                    style="width:100%;background:#1E4D2B;color:#d4b78f;border:2px solid #6B4423;padding:0.55rem;border-radius:8px;font-weight:700;margin-top:0.5rem;">
                    Place Order
                </button>
            `;

            grid.appendChild(div);
        });
    } catch (err) {
        console.error(err);
        grid.innerHTML = `<p class="text-sm text-red-600">Error loading customers.</p>`;
    }
}

async function checkNewAssignedCustomers() {
    const user = getCurrentUser() || currentUser;
    if (!user || !user.email) return;

    const email = (user.email || '').toLowerCase().trim();
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

    try {
        const { data, error } = await supabaseClient
            .from('customers')
            .select('id, name, company, assigned_at, pricing_approved_at')
            .eq('salesman_email', email)
            .gte('assigned_at', fiveDaysAgo)
            .order('assigned_at', { ascending: false });

        if (error) throw error;
        if (!data || data.length === 0) return;

        const seenKey = 'seenNewCustomers_' + email;
        const seen = JSON.parse(localStorage.getItem(seenKey) || '[]');
        const fresh = data.filter(c => !seen.includes(c.id));

        if (fresh.length === 0) return;

        const list = document.getElementById('new-customers-list');
        const modal = document.getElementById('new-customers-modal');
        if (!list || !modal) return;

        list.innerHTML = fresh.map(c => `
            <div class="border-2 border-[#6B4423] rounded-xl px-4 py-3">
                <p class="font-bold brand-green">${c.name || ''}</p>
                <p class="text-sm text-[#6B4423]">${c.company || ''}</p>
                ${!c.pricing_approved_at
                    ? `<p class="text-xs text-orange-700 font-semibold mt-1">Pricing not approved yet</p>`
                    : `<p class="text-xs text-green-700 mt-1">Pricing approved</p>`}
            </div>
        `).join('');

        modal.classList.remove('hidden');
        window._pendingSeenCustomerIds = fresh.map(c => c.id);
    } catch (err) {
        console.error('New customers check:', err);
    }
}

function dismissNewCustomersModal() {
    const user = getCurrentUser() || currentUser;
    const email = (user?.email || '').toLowerCase().trim();
    const seenKey = 'seenNewCustomers_' + email;
    const seen = JSON.parse(localStorage.getItem(seenKey) || '[]');
    const pending = window._pendingSeenCustomerIds || [];
    localStorage.setItem(seenKey, JSON.stringify([...new Set([...seen, ...pending])]));
    document.getElementById('new-customers-modal')?.classList.add('hidden');
}

async function showSalesmanCustomerDetail(customer) {
    const modal = document.getElementById('salesman-customer-modal');
    if (!modal || !customer) return;

    modal.dataset.customerId = customer.id || '';
    modal.dataset.customerJson = JSON.stringify(customer);

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || '—';
    };

    setText('sc-name', customer.name);
    setText('sc-company', customer.company);
    setText('sc-status', customer.status);
    setText('sc-phone', customer.phone);
    setText('sc-email', customer.email);
    setText('sc-territory', customer.territory);
    setText('sc-shipping', customer.shipping_address || customer.shippingAddress);
    setText('sc-billing', customer.billing_address || customer.billingAddress);
    setText('sc-notes', customer.notes || 'No notes.');

    // Pricing status + button area
    let pricingEl = document.getElementById('sc-pricing-status');
    if (!pricingEl) {
        pricingEl = document.createElement('div');
        pricingEl.id = 'sc-pricing-status';
        pricingEl.className = 'mt-4 pt-4 border-t border-[#d4b78f]';
        const notesEl = document.getElementById('sc-notes');
        if (notesEl && notesEl.parentElement) {
            notesEl.parentElement.appendChild(pricingEl);
        } else {
            modal.querySelector('.space-y-4, .p-8, div')?.appendChild(pricingEl);
        }
    }

    if (customer.pricing_approved_at) {
        const when = new Date(customer.pricing_approved_at).toLocaleDateString();
        pricingEl.innerHTML = `
            <p class="text-sm font-semibold text-green-700">
                <i class="fas fa-check-circle mr-1"></i>
                Pricing approved ${when}
            </p>
            <p class="text-xs text-[#6B4423] mt-1 mb-3">Customer can view their price sheet.</p>
            <button type="button"
                    onclick="openCustomerPricingEditor(JSON.parse(document.getElementById('salesman-customer-modal').dataset.customerJson))"
                    class="w-full px-4 py-2.5 border-2 border-[#6B4423] text-[#1E4D2B] rounded-xl font-semibold text-sm hover:bg-[#f8f4eb]">
                Edit Customer Pricing
            </button>
        `;
    } else {
        const hasSheet = await salesmanHasApprovedPriceSheet();
        if (hasSheet) {
            pricingEl.innerHTML = `
                <p class="text-sm font-semibold text-orange-700 mb-2">
                    Pricing not approved yet
                </p>
                <p class="text-xs text-[#6B4423] mb-3">
                    Attach your approved price sheet so this customer can see pricing.
                </p>
                <button type="button"
                        onclick="approveCustomerPricing()"
                        class="w-full px-4 py-2.5 bg-[#1E4D2B] text-[#d4b78f] rounded-xl font-semibold text-sm">
                    Set/Edit Pricing for This Customer
                </button>
            `;
        } else {
            pricingEl.innerHTML = `
                <p class="text-sm font-semibold text-orange-700 mb-2">
                    Pricing not available yet
                </p>
                <p class="text-xs text-[#6B4423] mb-3">
                    Your initial pricing sheet must be approved by admin before you can approve pricing for customers.
                </p>
                <button type="button" disabled
                        class="w-full px-4 py-2.5 bg-gray-300 text-gray-500 rounded-xl font-semibold text-sm cursor-not-allowed">
                    Approve Pricing (requires your approved sheet)
                </button>
            `;
        }
    }

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

function hideSalesmanCustomerModal() {
    const modal = document.getElementById('salesman-customer-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

async function salesmanHasApprovedPriceSheet() {
    const user = getCurrentUser() || currentUser;
    if (!user || !user.email) return false;
    const email = (user.email || '').toLowerCase().trim();

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
        console.warn('salesmanHasApprovedPriceSheet sheet check:', e);
    }

    // Fallback: salesmen.price_sheet_status
    try {
        const record = await getMySalesmanRecord();
        const status = (record && record.priceSheetStatus)
            ? String(record.priceSheetStatus).toLowerCase().trim()
            : '';
        return status === 'approved';
    } catch (e) {
        return false;
    }
}

async function approveCustomerPricing() {
    // Legacy entry point — open the full customer pricing editor instead
    const modal = document.getElementById('salesman-customer-modal');
    let customer = null;
    try {
        customer = JSON.parse(modal?.dataset?.customerJson || 'null');
    } catch (e) {
        customer = null;
    }
    if (!customer) {
        alert('Could not load customer.');
        return;
    }
    openCustomerPricingEditor(customer);
}

async function openCustomerPricingEditor(customer) {
    if (!customer || !customer.id) {
        alert('Missing customer.');
        return;
    }

    const hasSheet = await salesmanHasApprovedPriceSheet();
    if (!hasSheet) {
        alert('Your initial pricing sheet must be approved by admin before you can set customer pricing.');
        return;
    }

    window._customerPricingTarget = customer;
    window._customerPricingDraft = {};
    window._customerPricingBase = {};
    window._customerPriceExpanded = window._customerPriceExpanded || {};

    const label = document.getElementById('cp-customer-label');
    if (label) {
        label.textContent = (customer.name || 'Customer') +
            (customer.company ? ' · ' + customer.company : '');
    }

    const list = document.getElementById('customer-pricing-list');
    if (list) list.innerHTML = `<p class="text-sm text-[#6B4423]">Loading price sheet…</p>`;

    const modal = document.getElementById('customer-pricing-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }

    await renderCustomerPricingEditor();
}

function hideCustomerPricingModal() {
    const modal = document.getElementById('customer-pricing-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
    window._customerPricingTarget = null;
    window._customerPricingDraft = {};
    window._customerPricingBase = {};
}

async function loadSalesmanBasePrices() {
    const user = getCurrentUser() || currentUser;
    const email = (user?.email || '').toLowerCase().trim();
    if (!email) return {};

    try {
        const { data: sheet } = await supabaseClient
            .from('salesman_price_sheets')
            .select('prices')
            .eq('salesman_email', email)
            .maybeSingle();

        if (sheet && sheet.prices && typeof sheet.prices === 'object') {
            return sheet.prices;
        }
    } catch (e) {
        console.warn('loadSalesmanBasePrices:', e);
    }
    return {};
}

async function loadCustomerPrices(customerId) {
    if (!customerId) return null;
    try {
        const { data } = await supabaseClient
            .from('customer_price_sheets')
            .select('prices')
            .eq('customer_id', customerId)
            .maybeSingle();
        if (data && data.prices && typeof data.prices === 'object') {
            return data.prices;
        }
    } catch (e) {
        console.warn('loadCustomerPrices:', e);
    }
    return null;
}

async function renderCustomerPricingEditor() {
    const container = document.getElementById('customer-pricing-list');
    if (!container) return;

    if (typeof PRODUCT_CATALOG === 'undefined') {
        container.innerHTML = `<p class="text-red-600">PRODUCT_CATALOG not found.</p>`;
        return;
    }

    const customer = window._customerPricingTarget;
    if (!customer) {
        container.innerHTML = `<p class="text-sm text-[#6B4423]">No customer selected.</p>`;
        return;
    }

    const basePrices = await loadSalesmanBasePrices();
    const existingCustomer = await loadCustomerPrices(customer.id);

    window._customerPricingBase = basePrices || {};
    if (!window._customerPricingDraft) window._customerPricingDraft = {};

    // Seed draft: existing customer sheet → else base sheet → else catalog
    PRODUCT_CATALOG.forEach(p => {
        const name = p.name;
        if (window._customerPricingDraft[name] != null) return;
        if (existingCustomer && existingCustomer[name] != null) {
            window._customerPricingDraft[name] = Number(existingCustomer[name]);
        } else if (basePrices[name] != null) {
            window._customerPricingDraft[name] = Number(basePrices[name]);
        } else if (!p.isMarketPrice) {
            window._customerPricingDraft[name] = Number(p.unitPrice);
        }
    });

    // Group by category
    const grouped = {};
    const categoryOrder = [];
    PRODUCT_CATALOG.forEach(p => {
        const cat = p.category || 'Other';
        if (!grouped[cat]) {
            grouped[cat] = [];
            categoryOrder.push(cat);
        }
        grouped[cat].push(p);
    });

    if (!window._customerPriceExpanded) window._customerPriceExpanded = {};
    categoryOrder.forEach(cat => {
        if (window._customerPriceExpanded[cat] === undefined) {
            window._customerPriceExpanded[cat] = (cat === 'Bully Sticks');
        }
    });

    let html = '';
    categoryOrder.forEach(cat => {
        const items = grouped[cat];
        const isOpen = !!window._customerPriceExpanded[cat];
        const safeCat = cat.replace(/'/g, "\\'");

        html += `
            <div class="mb-3 border-2 border-[#6B4423] rounded-2xl overflow-hidden">
                <button type="button"
                        onclick="toggleCustomerPriceCategory('${safeCat}')"
                        class="w-full flex items-center justify-between gap-3 px-4 py-3 bg-[#1E4D2B] text-[#d4b78f] text-left hover:bg-[#254a2f]">
                    <span class="font-bold text-sm">
                        <i class="fas fa-chevron-${isOpen ? 'down' : 'right'} text-xs mr-2"></i>
                        ${cat}
                    </span>
                    <span class="text-xs opacity-90">${items.length} product${items.length !== 1 ? 's' : ''}</span>
                </button>
                <div class="cp-cat-body ${isOpen ? '' : 'hidden'} space-y-2 p-3 bg-[#f8f4eb]">
        `;

        items.forEach(p => {
            const base = (basePrices[p.name] != null)
                ? Number(basePrices[p.name])
                : (p.isMarketPrice ? null : Number(p.unitPrice));
            const draft = window._customerPricingDraft[p.name];
            const startVal = (draft != null && !isNaN(Number(draft)))
                ? Number(draft).toFixed(2)
                : (base != null ? Number(base).toFixed(2) : '');
            const baseLabel = base != null ? ('$' + Number(base).toFixed(2)) : 'Market';
            const safeName = p.name.replace(/"/g, '&quot;');
            const safeNameJs = p.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

            html += `
                <div class="bg-white border border-[#d4b78f] rounded-xl p-3 flex flex-wrap items-center gap-3"
                     data-cp-name="${safeName}">
                    <div class="flex-1 min-w-[160px]">
                        <p class="text-sm font-semibold brand-green">${p.name}</p>
                        <p class="text-xs text-[#6B4423]">${p.caseSize || ''} · Your base: ${baseLabel}</p>
                    </div>
                    <div class="flex items-center gap-2 flex-wrap">
                        <label class="text-xs text-[#6B4423] whitespace-nowrap">Customer price</label>
                        <div class="flex items-center border-2 border-[#6B4423] rounded-lg overflow-hidden bg-white">
                            <span class="px-2 py-1.5 text-sm font-semibold text-[#6B4423] bg-[#f8f4eb] border-r border-[#d4b78f] select-none">$</span>
                            <input type="number"
                                   step="0.01"
                                   min="0"
                                   value="${startVal}"
                                   class="cp-price-input w-20 border-0 px-2 py-1.5 text-sm font-semibold focus:outline-none focus:ring-0"
                                   data-name="${safeName}"
                                   data-base="${base === null || base === undefined ? '' : base}"
                                   oninput="onCustomerPriceInput(this)">
                        </div>
                        <span class="cp-flag text-xs text-red-600 font-semibold hidden">±5% from base</span>
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

    container.querySelectorAll('.cp-price-input').forEach(inp => {
        flagCustomerPrice(inp);
    });

    updateCustomerPricingSummary();
}

function toggleCustomerPriceCategory(cat) {
    if (!window._customerPriceExpanded) window._customerPriceExpanded = {};
    window._customerPriceExpanded[cat] = !window._customerPriceExpanded[cat];
    renderCustomerPricingEditor();
}

function expandAllCustomerPriceCategories(open) {
    if (!window._customerPriceExpanded) window._customerPriceExpanded = {};
    if (typeof PRODUCT_CATALOG !== 'undefined') {
        PRODUCT_CATALOG.forEach(p => {
            const cat = p.category || 'Other';
            window._customerPriceExpanded[cat] = !!open;
        });
    }
    renderCustomerPricingEditor();
}

function onCustomerPriceInput(input) {
    if (!window._customerPricingDraft) window._customerPricingDraft = {};
    const name = input.getAttribute('data-name');
    const val = parseFloat(input.value);
    if (name && !isNaN(val) && val >= 0) {
        window._customerPricingDraft[name] = val;
    }
    flagCustomerPrice(input);
    updateCustomerPricingSummary();
}

function flagCustomerPrice(input) {
    // ±5% vs salesman BASE sheet (not catalog)
    const base = parseFloat(input.getAttribute('data-base'));
    const proposed = parseFloat(input.value);
    const row = input.closest('[data-cp-name]');
    const flag = row ? row.querySelector('.cp-flag') : null;
    const wrapper = input.closest('.flex.items-center.border-2') || input;

    if (!flag) return;

    if (!isNaN(base) && base > 0 && !isNaN(proposed)) {
        const pct = Math.abs((proposed - base) / base) * 100;
        if (pct > 5) {
            const signed = ((proposed - base) / base * 100);
            flag.textContent = (signed >= 0 ? '+' : '') + signed.toFixed(1) + '% from your base';
            flag.classList.remove('hidden');
            wrapper.classList.add('border-red-500');
            return;
        }
    }
    flag.classList.add('hidden');
    wrapper.classList.remove('border-red-500');
}

function updateCustomerPricingSummary() {
    const el = document.getElementById('customer-pricing-summary');
    if (!el) return;

    const inputs = document.querySelectorAll('.cp-price-input');
    let outside = 0;
    inputs.forEach(inp => {
        const base = parseFloat(inp.getAttribute('data-base'));
        const proposed = parseFloat(inp.value);
        if (!isNaN(base) && base > 0 && !isNaN(proposed)) {
            const pct = Math.abs((proposed - base) / base) * 100;
            if (pct > 5) outside++;
        }
    });

    if (outside > 0) {
        el.classList.remove('hidden');
        el.innerHTML = `<span class="text-orange-700 font-semibold">${outside} product(s) are outside ±5% of your base sheet.</span> Those will be sent to admin for approval. Prices within ±5% will apply immediately.`;
    } else {
        el.classList.add('hidden');
        el.innerHTML = '';
    }
}

async function saveCustomerPricing() {
    const customer = window._customerPricingTarget;
    if (!customer || !customer.id) {
        alert('No customer selected.');
        return;
    }

    const user = getCurrentUser() || currentUser;
    if (!user) {
        alert('You must be logged in.');
        return;
    }

    const email = (user.email || '').toLowerCase().trim();
    const basePrices = window._customerPricingBase || {};
    const draft = window._customerPricingDraft || {};

    // Build full price map from live inputs (prefer draft map)
    const prices = {};
    const outsideItems = [];

    document.querySelectorAll('.cp-price-input').forEach(inp => {
        const name = inp.getAttribute('data-name');
        const base = parseFloat(inp.getAttribute('data-base'));
        let val = parseFloat(inp.value);
        if (name && draft[name] != null) val = Number(draft[name]);
        if (!name || isNaN(val) || val < 0) return;

        prices[name] = val;

        if (!isNaN(base) && base > 0) {
            const pct = Math.abs((val - base) / base) * 100;
            if (pct > 5) {
                outsideItems.push({
                    product: name,
                    basePrice: base,
                    proposedPrice: val,
                    pctChange: ((val - base) / base) * 100
                });
            }
        }
    });

    if (Object.keys(prices).length === 0) {
        alert('No valid prices to save.');
        return;
    }

    const saveBtn = document.getElementById('customer-pricing-save-btn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving…';
    }

    try {
        if (outsideItems.length === 0) {
            // All within ±5% — write sheet + approve customer immediately
            const { error: upsertErr } = await supabaseClient
                .from('customer_price_sheets')
                .upsert({
                    customer_id: customer.id,
                    salesman_email: email,
                    prices: prices,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'customer_id' });

            if (upsertErr) throw upsertErr;

            const { error: custErr } = await supabaseClient
                .from('customers')
                .update({
                    pricing_approved_at: new Date().toISOString(),
                    pricing_approved_by: user.fullName || user.name || user.email || 'Salesman'
                })
                .eq('id', customer.id);

            if (custErr) throw custErr;

            alert('Customer pricing saved. Customer can now see these prices.');
            hideCustomerPricingModal();

            // Refresh customer detail + list
            customer.pricing_approved_at = new Date().toISOString();
            const detailModal = document.getElementById('salesman-customer-modal');
            if (detailModal) {
                detailModal.dataset.customerJson = JSON.stringify(customer);
                if (typeof showSalesmanCustomerDetail === 'function') {
                    showSalesmanCustomerDetail(customer);
                }
            }
            if (typeof renderCustomers === 'function') renderCustomers();

        } else {
            // Some outside ±5% — still save in-range as draft on customer sheet? 
            // Per design: create Pending proposal; keep previous prices until admin acts.
            // We do NOT overwrite customer_price_sheets until approved.
            const { error: propErr } = await supabaseClient
                .from('price_proposals')
                .insert({
                    type: 'customerPricing',
                    salesman_email: email,
                    salesman_name: user.fullName || user.name || 'Salesman',
                    status: 'Pending',
                    items: outsideItems.map(i => ({
                        product: i.product,
                        basePrice: i.basePrice,
                        proposedPrice: i.proposedPrice,
                        pctChange: Number(i.pctChange.toFixed(2)),
                        customerId: customer.id,
                        customerName: customer.name || '',
                        customerCompany: customer.company || ''
                    })),
                    overall_notes: 'Customer pricing changes outside ±5% of salesman base sheet. Customer: ' +
                        (customer.name || customer.id),
                    submitted_at: new Date().toISOString()
                });

            if (propErr) throw propErr;

            // Also apply the in-range prices immediately if customer already had approval
            // or if this is first-time and only some items are outside.
            // Simpler rule: only apply full map when ALL are in range.
            // Outside → proposal only; previous sheet stays until admin approves.

            alert(
                outsideItems.length + ' product(s) are outside ±5% of your base sheet.\n\n' +
                'Those were sent to admin for approval.\n' +
                'Previous customer prices (if any) are unchanged until admin approves.'
            );
            hideCustomerPricingModal();
        }
    } catch (err) {
        console.error(err);
        alert('Could not save customer pricing.\n' + (err.message || ''));
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Customer Pricing';
        }
    }
}


// ================== PLACE ORDER MODAL ==================
let currentPlaceOrderCustomer = null;
let placeOrderItems = []; // { name, quantity, caseSize, unitPrice, isMarketPrice }

function placeOrderForCustomer(customerName) {
    currentPlaceOrderCustomer = customerName;
    placeOrderItems = [];

    const nameEl = document.getElementById("place-order-customer-name");
    if (nameEl) nameEl.textContent = customerName;

    const searchEl = document.getElementById("place-order-product-search");
    if (searchEl) searchEl.value = "";

    const resultsEl = document.getElementById("place-order-product-results");
    if (resultsEl) {
        resultsEl.innerHTML = "";
        resultsEl.classList.add("hidden");
    }

    const notesEl = document.getElementById("place-order-notes");
    if (notesEl) notesEl.value = "";

    renderPlaceOrderItems();

    const modal = document.getElementById("place-order-modal");
    if (modal) modal.classList.remove("hidden");
}

function hidePlaceOrderModal() {
    const modal = document.getElementById("place-order-modal");
    if (modal) modal.classList.add("hidden");
    currentPlaceOrderCustomer = null;
    placeOrderItems = [];
}

function searchPlaceOrderProducts() {
    const searchEl = document.getElementById("place-order-product-search");
    const resultsEl = document.getElementById("place-order-product-results");
    if (!searchEl || !resultsEl) return;

    const term = (searchEl.value || "").toLowerCase().trim();

    if (term.length < 2) {
        resultsEl.innerHTML = "";
        resultsEl.classList.add("hidden");
        return;
    }

    if (typeof PRODUCT_CATALOG === "undefined") {
        resultsEl.innerHTML = `<p class="p-3 text-sm text-red-600">PRODUCT_CATALOG not found.</p>`;
        resultsEl.classList.remove("hidden");
        return;
    }

    const matches = PRODUCT_CATALOG.filter(p =>
        p.name.toLowerCase().includes(term)
    ).slice(0, 12);

    if (matches.length === 0) {
        resultsEl.innerHTML = `<p class="p-3 text-sm text-[#6B4423]">No products found.</p>`;
        resultsEl.classList.remove("hidden");
        return;
    }

    resultsEl.innerHTML = matches.map(p => {
        const priceLabel = p.isMarketPrice
            ? "Market Price"
            : "$" + Number(p.unitPrice).toFixed(2);
        const safeName = p.name.replace(/'/g, "\\'");

        return `
            <div class="px-3 py-2 hover:bg-[#f8f4eb] cursor-pointer border-b border-[#d4b78f] flex justify-between items-center"
                 onclick="addProductToPlaceOrder('${safeName}')">
                <div>
                    <p class="text-sm font-semibold brand-green">${p.name}</p>
                    <p class="text-xs text-[#6B4423]">${p.caseSize || ""} · ${priceLabel}</p>
                </div>
                <span class="text-xs font-bold text-[#1E4D2B]">Add</span>
            </div>
        `;
    }).join("");

    resultsEl.classList.remove("hidden");
}

function addProductToPlaceOrder(productName) {
    if (typeof PRODUCT_CATALOG === "undefined") return;

    const product = PRODUCT_CATALOG.find(p => p.name === productName);
    if (!product) return;

    const existing = placeOrderItems.find(i => i.name === productName);
    if (existing) {
        existing.quantity += 1;
    } else {
        placeOrderItems.push({
            name: product.name,
            quantity: 1,
            caseSize: product.caseSize || "",
            unitPrice: product.isMarketPrice ? null : Number(product.unitPrice),
            isMarketPrice: !!product.isMarketPrice,
            displayPrice: product.isMarketPrice
                ? "Market Price"
                : "$" + Number(product.unitPrice).toFixed(2)
        });
    }

    const searchEl = document.getElementById("place-order-product-search");
    if (searchEl) searchEl.value = "";

    const resultsEl = document.getElementById("place-order-product-results");
    if (resultsEl) {
        resultsEl.innerHTML = "";
        resultsEl.classList.add("hidden");
    }

    renderPlaceOrderItems();
}

function renderPlaceOrderItems() {
    const container = document.getElementById("place-order-items-list");
    if (!container) return;

    if (placeOrderItems.length === 0) {
        container.innerHTML = `<p class="text-sm text-[#6B4423]">No products added yet.</p>`;
        return;
    }

    container.innerHTML = placeOrderItems.map((item, index) => `
        <div class="flex justify-between items-center py-2 border-b border-[#d4b78f]">
            <div class="flex-1 pr-3">
                <p class="text-sm font-semibold brand-green">${item.name}</p>
                <p class="text-xs text-[#6B4423]">${item.caseSize || ""} · ${item.displayPrice}</p>
            </div>
            <div class="flex items-center gap-2">
                <label class="text-xs text-[#6B4423]">Units</label>
                <input type="number"
                       min="1"
                       value="${item.quantity}"
                       class="place-order-qty w-16 border-2 border-[#6B4423] rounded-lg px-2 py-1 text-sm text-center"
                       onchange="updatePlaceOrderQty(${index}, this.value)">
                <button onclick="removePlaceOrderItem(${index})"
                        class="text-red-600 text-sm px-2 py-1 hover:bg-red-50 rounded-lg">
                    Remove
                </button>
            </div>
        </div>
    `).join("");

    // Focus the last quantity field so salesman can type immediately
    const qtyInputs = container.querySelectorAll('input.place-order-qty');
    if (qtyInputs.length) {
        const last = qtyInputs[qtyInputs.length - 1];
        last.focus();
        last.select();
    }
}

function updatePlaceOrderQty(index, value) {
    const qty = parseInt(value, 10);
    if (isNaN(qty) || qty < 1) return;
    if (placeOrderItems[index]) {
        placeOrderItems[index].quantity = qty;
        renderPlaceOrderItems();
    }
}

function removePlaceOrderItem(index) {
    placeOrderItems.splice(index, 1);
    renderPlaceOrderItems();
}

async function submitPlaceOrder() {
    const nameFromField =
        (document.getElementById("place-order-customer-name")?.textContent || "").trim() ||
        (document.getElementById("place-order-customer")?.value || "").trim() ||
        (typeof currentPlaceOrderCustomer === "string" ? currentPlaceOrderCustomer : "") ||
        (currentPlaceOrderCustomer && currentPlaceOrderCustomer.name) ||
        "";

    if (!nameFromField) {
        alert("No customer selected.");
        return;
    }

    if (!placeOrderItems || placeOrderItems.length === 0) {
        alert("Please add at least one product to the order.");
        return;
    }

    const user = getCurrentUser() || currentUser;
    if (!user) {
        alert("You must be logged in.");
        return;
    }

    const notesEl = document.getElementById("place-order-notes");
    const notes = notesEl ? notesEl.value.trim() : "";

    const customerObj = (currentPlaceOrderCustomer && typeof currentPlaceOrderCustomer === "object")
        ? currentPlaceOrderCustomer
        : null;

    const payload = {
        customer_id: customerObj?.id || null,
        customer_name: nameFromField,
        customer_email: (customerObj?.email || "").toLowerCase().trim() || null,
        customer_company: customerObj?.company || null,
        salesman_email: (user.email || "").toLowerCase().trim(),
        salesman_name: user.fullName || user.name || "Salesman",
        status: "submitted",
        source: "salesman",
        items: placeOrderItems.map(item => ({
            product: item.name,
            quantity: item.quantity || 1,
            caseSize: item.caseSize || "",
            unitPrice: item.unitPrice != null ? item.unitPrice : null,
            displayPrice: item.displayPrice || "",
            isMarketPrice: !!item.isMarketPrice
        })),
        notes: notes || "Submitted via Salesman Portal",
        shipping_cost: 0,
        submitted_at: new Date().toISOString()
    };

    try {
        const { error } = await supabaseClient
            .from("orders")
            .insert([payload]);

        if (error) throw error;

        hidePlaceOrderModal();
        alert("Order submitted successfully for " + nameFromField + ".");

        if (typeof renderMyOrders === "function") {
            renderMyOrders();
        }
    } catch (err) {
        console.error(err);
        alert("Could not submit order.\n" + (err.message || ""));
    }
}

// ================== PRICE CHANGE PROPOSAL (MULTI-PRODUCT) ==================
let proposalItems = []; // { name, caseSize, currentPrice, proposedPrice, reason, isMarketPrice }

function searchProposalProducts() {
    const searchEl = document.getElementById("proposal-product-search");
    const resultsEl = document.getElementById("proposal-product-results");
    if (!searchEl || !resultsEl) return;

    const term = (searchEl.value || "").toLowerCase().trim();

    if (term.length < 2) {
        resultsEl.innerHTML = "";
        resultsEl.classList.add("hidden");
        return;
    }

    if (typeof PRODUCT_CATALOG === "undefined") {
        resultsEl.innerHTML = `<p class="p-3 text-sm text-red-600">PRODUCT_CATALOG not found.</p>`;
        resultsEl.classList.remove("hidden");
        return;
    }

    const matches = PRODUCT_CATALOG.filter(p =>
        p.name.toLowerCase().includes(term)
    ).slice(0, 12);

    if (matches.length === 0) {
        resultsEl.innerHTML = `<p class="p-3 text-sm text-[#6B4423]">No products found.</p>`;
        resultsEl.classList.remove("hidden");
        return;
    }

    resultsEl.innerHTML = matches.map(p => {
        const priceLabel = p.isMarketPrice
            ? "Market Price"
            : "$" + Number(p.unitPrice).toFixed(2);
        const safeName = p.name.replace(/'/g, "\\'");

        return `
            <div class="px-3 py-2 hover:bg-[#f8f4eb] cursor-pointer border-b border-[#d4b78f] flex justify-between items-center"
                 onclick="addProductToProposal('${safeName}')">
                <div>
                    <p class="text-sm font-semibold brand-green">${p.name}</p>
                    <p class="text-xs text-[#6B4423]">${p.caseSize || ""} · ${priceLabel}</p>
                </div>
                <span class="text-xs font-bold text-[#1E4D2B]">Add</span>
            </div>
        `;
    }).join("");

    resultsEl.classList.remove("hidden");
}

function addProductToProposal(productName) {
    if (typeof PRODUCT_CATALOG === "undefined") return;

    const product = PRODUCT_CATALOG.find(p => p.name === productName);
    if (!product) return;

    if (proposalItems.some(i => i.name === productName)) {
        alert("That product is already on this proposal.");
        return;
    }

    proposalItems.push({
        name: product.name,
        caseSize: product.caseSize || "",
        currentPrice: product.isMarketPrice ? null : Number(product.unitPrice),
        displayCurrentPrice: product.isMarketPrice
            ? "Market Price"
            : "$" + Number(product.unitPrice).toFixed(2),
        proposedPrice: product.isMarketPrice ? "" : Number(product.unitPrice).toFixed(2),
        reason: "",
        isMarketPrice: !!product.isMarketPrice
    });

    const searchEl = document.getElementById("proposal-product-search");
    if (searchEl) searchEl.value = "";

    const resultsEl = document.getElementById("proposal-product-results");
    if (resultsEl) {
        resultsEl.innerHTML = "";
        resultsEl.classList.add("hidden");
    }

    renderProposalItems();
}

function renderProposalItems() {
    const container = document.getElementById("proposal-items-list");
    if (!container) return;

    if (proposalItems.length === 0) {
        container.innerHTML = `<p class="text-sm text-[#6B4423]">No products added yet. Search above to add items.</p>`;
        return;
    }

    container.innerHTML = proposalItems.map((item, index) => `
        <div class="bg-white border-2 border-[#6B4423] rounded-xl p-4 mb-3">
            <div class="flex justify-between items-start mb-2">
                <div>
                    <p class="font-semibold brand-green">${item.name}</p>
                    <p class="text-xs text-[#6B4423]">${item.caseSize || ""}</p>
                </div>
                <button type="button" onclick="removeProposalItem(${index})"
                        class="text-red-600 text-sm px-2 py-1 hover:bg-red-50 rounded-lg">
                    Remove
                </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                    <label class="block text-xs font-semibold text-[#6B4423] mb-1">Current Price</label>
                    <input type="text" value="${item.displayCurrentPrice}" readonly
                           class="form-input w-full px-3 py-2 bg-gray-50">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-[#6B4423] mb-1">Proposed Price *</label>
                    <input type="number" step="0.01" min="0"
                           value="${item.proposedPrice}"
                           class="form-input w-full px-3 py-2"
                           onchange="updateProposalField(${index}, 'proposedPrice', this.value)">
                </div>
            </div>

            <div>
                <label class="block text-xs font-semibold text-[#6B4423] mb-1">Reason for change *</label>
                <textarea rows="2" class="form-input w-full px-3 py-2"
                          placeholder="Why is this price change needed?"
                          onchange="updateProposalField(${index}, 'reason', this.value)">${item.reason || ""}</textarea>
            </div>
        </div>
    `).join("");
}

function updateProposalField(index, field, value) {
    if (!proposalItems[index]) return;
    proposalItems[index][field] = value;
}

function removeProposalItem(index) {
    proposalItems.splice(index, 1);
    renderProposalItems();
}

async function submitPriceProposal() {
    const user = getCurrentUser() || currentUser;
    if (!user) {
        alert("You must be logged in.");
        return;
    }

    if (proposalItems.length === 0) {
        alert("Add at least one product to the proposal.");
        return;
    }

    for (let i = 0; i < proposalItems.length; i++) {
        const item = proposalItems[i];
        const proposed = parseFloat(item.proposedPrice);
        const reason = (item.reason || "").trim();

        if (isNaN(proposed) || proposed < 0) {
            alert("Please enter a valid proposed price for:\n" + item.name);
            return;
        }
        if (!reason) {
            alert("A reason is required for each product.\nMissing reason for:\n" + item.name);
            return;
        }
    }

    const notesEl = document.getElementById("proposal-overall-notes");
    const overallNotes = notesEl ? notesEl.value.trim() : "";
    const email = (user.email || "").toLowerCase().trim();

    const items = proposalItems.map(item => ({
        product: item.name,
        caseSize: item.caseSize || "",
        currentPrice: item.currentPrice,
        displayCurrentPrice: item.displayCurrentPrice,
        proposedPrice: parseFloat(item.proposedPrice),
        reason: (item.reason || "").trim(),
        isMarketPrice: !!item.isMarketPrice
    }));

    try {
        const { data, error } = await supabaseClient
            .from('price_proposals')
            .insert({
                type: 'priceChange',
                salesman_email: email,
                salesman_name: user.fullName || user.name || "Salesman",
                status: 'Pending',
                items: items,
                overall_notes: overallNotes || null,
                submitted_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error(error);
            alert("Failed to submit proposal. Please try again.\n" + error.message);
            return;
        }

        // Clear the form
        proposalItems = [];
        renderProposalItems();
        if (notesEl) notesEl.value = "";

        alert("Price change proposal submitted for admin approval.");
        renderProposalHistory();

    } catch (err) {
        console.error(err);
        alert("Something went wrong while submitting. Please try again.");
    }
}

async function renderProposalHistory() {
    const container = document.getElementById("proposal-history-list");
    if (!container) return;

    const user = getCurrentUser() || currentUser;
    if (!user) {
        container.innerHTML = `<p class="text-sm text-[#6B4423]">Please log in.</p>`;
        return;
    }

    container.innerHTML = `<p class="text-sm text-[#6B4423]">Loading proposals...</p>`;

    try {
        let query = supabaseClient
            .from('price_proposals')
            .select('*')
            .order('submitted_at', { ascending: false });

        // Salesmen only see their own; admins see all
        if (user.role === "salesman") {
            query = query.eq('salesman_email', (user.email || "").toLowerCase().trim());
        }

        const { data, error } = await query;

        if (error) {
            console.error(error);
            container.innerHTML = `<p class="text-sm text-red-600">Could not load proposals.</p>`;
            return;
        }

        if (!data || data.length === 0) {
            container.innerHTML = `<p class="text-sm text-[#6B4423]">No proposals submitted yet.</p>`;
            return;
        }

        container.innerHTML = data.map(p => {
            const status = (p.status || "Pending").toLowerCase();
            let badgeClass = "bg-orange-100 text-orange-700";
            if (status === "approved") badgeClass = "bg-green-100 text-green-700";
            if (status === "denied" || status === "rejected") badgeClass = "bg-red-100 text-red-700";

            const date = new Date(p.submitted_at).toLocaleDateString();
            const items = p.items || [];
            const typeLabel = p.type === 'initialPriceSheet' ? 'Initial Sheet' : 'Price Change';

            const itemLines = items.map(item => `
                <div class="text-sm py-1 border-b border-[#eee]">
                    <span class="font-medium">${item.product}</span>
                    <div class="text-xs text-[#6B4423]">
                        ${item.displayCurrentPrice || (item.catalogPrice != null ? "$" + Number(item.catalogPrice).toFixed(2) : "—")}
                        → <strong>$${Number(item.proposedPrice).toFixed(2)}</strong>
                    </div>
                    ${item.reason ? `<div class="text-xs text-[#555]">Reason: ${item.reason}</div>` : ""}
                </div>
            `).join("");

            return `
                <div class="border border-[#d4b78f] rounded-xl p-3 mb-3">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <p class="font-semibold brand-green text-sm">${typeLabel}</p>
                            <p class="text-xs text-[#6B4423]">${date} · ${items.length} product(s)</p>
                        </div>
                        <span class="px-2 py-1 text-xs font-semibold rounded-full ${badgeClass}">
                            ${p.status || "Pending"}
                        </span>
                    </div>
                    ${itemLines}
                </div>
            `;
        }).join("");

    } catch (err) {
        console.error(err);
        container.innerHTML = `<p class="text-sm text-red-600">Error loading proposals.</p>`;
    }
}
// ================== CUSTOMER INFORMATION (Submit for Approval) ==================

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
                                <p class="font-bold brand-green">${c.owner_name || ""}</p>
                                <p class="text-sm text-[#6B4423]">${c.company_name || ""}</p>
                            </div>
                            <span class="px-2 py-1 text-xs font-semibold rounded-full ${badgeClass}">
                                ${status.charAt(0).toUpperCase() + status.slice(1)}
                            </span>
                        </div>
                        ${c.email ? `<p class="text-sm mt-1">${c.email}</p>` : ""}
                        ${c.phone ? `<p class="text-sm">${c.phone}</p>` : ""}
                    </div>
                `;
            }).join("")}
        `;
    } catch (err) {
        console.error(err);
        container.innerHTML = `<p class="text-sm text-red-600">Error loading submissions.</p>`;
    }
}

function toggleSameAddress() {
    const same = document.getElementById('cust-same-address');
    const shipping = document.getElementById('cust-shipping');
    const billing = document.getElementById('cust-billing');
    if (!same || !shipping || !billing) return;

    if (same.checked) {
        billing.value = shipping.value;
        billing.readOnly = true;
        billing.classList.add('bg-gray-100');
    } else {
        billing.readOnly = false;
        billing.classList.remove('bg-gray-100');
    }
}

// Keep billing in sync while typing shipping if checkbox is checked
(function setupSameAddressListeners() {
    const shipping = document.getElementById('cust-shipping');
    if (shipping) {
        shipping.addEventListener('input', function () {
            const same = document.getElementById('cust-same-address');
            const billing = document.getElementById('cust-billing');
            if (same && same.checked && billing) {
                billing.value = shipping.value;
            }
        });
    }
    // Apply initial state once the form exists
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
        const shippingAddress = document.getElementById("cust-shipping").value.trim();
        const sameAddress = document.getElementById("cust-same-address")?.checked;
        const billingAddress = sameAddress
            ? shippingAddress
            : document.getElementById("cust-billing").value.trim();
        const notes = document.getElementById("cust-notes").value.trim();

        if (!name || !company || !email || !phone || !shippingAddress || !billingAddress) {
            alert("Please fill in all required fields (Notes are optional).");
            return;
        }

        const notesParts = [];
        notesParts.push("Shipping: " + shippingAddress);
        notesParts.push("Billing: " + billingAddress);
        if (notes) notesParts.push("Notes: " + notes);
        notesParts.push("Submitted by: " + (user.fullName || user.name || user.email || "Salesman"));

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

// ================== ORDER SYSTEM ==================
function addProductToOrder() {
    const productSelect = document.getElementById("order-product");
    const qtyInput = document.getElementById("order-qty");
    if (!productSelect || !productSelect.value) return;

    const productName = productSelect.value;
    const quantity = parseInt(qtyInput.value) || 1;

    const existing = currentOrderItems.findIndex(item => item.product === productName);
    if (existing !== -1) {
        currentOrderItems[existing].quantity += quantity;
    } else {
        currentOrderItems.push({ product: productName, quantity });
    }
    renderOrderItems();
    qtyInput.value = 1;
}

function renderOrderItems() {
    const container = document.getElementById("order-items-list");
    if (!container) return;

    if (currentOrderItems.length === 0) {
        container.innerHTML = `<p style="color:#888; font-size:0.9rem; margin:0;">No products added yet.</p>`;
        return;
    }

    container.innerHTML = currentOrderItems.map((item, index) => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0; border-bottom:1px solid #ddd;">
            <div><strong>${item.product}</strong> × ${item.quantity}</div>
            <button onclick="removeOrderItem(${index})" style="background:#c56134; color:white; border:none; padding:0.25rem 0.6rem; border-radius:6px; font-size:0.75rem;">Remove</button>
        </div>
    `).join("");
}

function removeOrderItem(index) {
    currentOrderItems.splice(index, 1);
    renderOrderItems();
}

const orderFormEl = document.getElementById("order-form");
if (orderFormEl) {
    orderFormEl.addEventListener("submit", async function (e) {
        e.preventDefault();
        const user = getCurrentUser() || currentUser;

        if (currentOrderItems.length === 0) {
            alert("Please add at least one product to the order.");
            return;
        }

        const customerName = (document.getElementById("order-customer")?.value || "").trim();
        const notes = (document.getElementById("order-notes")?.value || "").trim();

        if (!customerName) {
            alert("Please select or enter a customer.");
            return;
        }

        const payload = {
            customer_id: null,
            customer_name: customerName,
            customer_email: null,
            customer_company: null,
            salesman_email: (user.email || "").toLowerCase().trim(),
            salesman_name: user.fullName || user.name || "Salesman",
            status: "submitted",
            source: "salesman",
            items: currentOrderItems.map(item => ({
                product: item.product,
                quantity: item.quantity || 1,
                unitPrice: null,
                displayPrice: "",
                isMarketPrice: false
            })),
            notes: notes || null,
            shipping_cost: 0,
            submitted_at: new Date().toISOString()
        };

        try {
            const { error } = await supabaseClient
                .from("orders")
                .insert([payload]);

            if (error) throw error;

            this.reset();
            currentOrderItems = [];
            renderOrderItems();
            alert("Order submitted successfully!");
            if (typeof renderMyOrders === "function") {
                renderMyOrders();
            }
        } catch (err) {
            console.error(err);
            alert("Could not .\n" + (err.message || ""));
        }
    });
}

async function renderMyOrders() {
    const container = document.getElementById("my-orders-list");
    if (!container) return;

    const user = getCurrentUser() || currentUser;
    if (!user) {
        container.innerHTML = `<p class="text-sm text-[#6B4423]">Please log in.</p>`;
        return;
    }

    container.innerHTML = `<p class="text-sm text-[#6B4423]">Loading orders...</p>`;

    try {
        let query = supabaseClient
            .from("orders")
            .select("*")
            .order("submitted_at", { ascending: false });

        // Salesmen only see their own orders; admins see all
        if (user.role === "salesman") {
            query = query.eq("salesman_email", (user.email || "").toLowerCase().trim());
        }

        const { data, error } = await query;

        if (error) {
            console.error(error);
            container.innerHTML = `<p class="text-sm text-red-600">Could not load orders.</p>`;
            return;
        }

        const orders = data || [];
        window._salesmanOrders = orders;

        // Populate the customer filter dropdown (unique names only)
        const filterEl = document.getElementById("order-history-customer-filter");
        if (filterEl) {
            const currentValue = filterEl.value || "";
            const names = [...new Set(orders.map(o => o.customer_name || o.customer || "").filter(Boolean))].sort();
            filterEl.innerHTML = `<option value="">All customers (recent first)</option>` +
                names.map(n => `<option value="${n.replace(/"/g, "&quot;")}">${n}</option>`).join("");
            filterEl.value = currentValue; // keep selection if possible
        }

        // Apply customer filter if one is selected
        const selectedCustomer = (filterEl && filterEl.value) ? filterEl.value.trim() : "";
        let filtered = orders;
        if (selectedCustomer) {
            filtered = orders.filter(o =>
                (o.customer_name || o.customer || "").trim() === selectedCustomer
            );
        }

        if (filtered.length === 0) {
            container.innerHTML = selectedCustomer
                ? `<p class="text-sm text-[#6B4423]">No orders found for this customer.</p>`
                : `<p class="text-sm text-[#6B4423]">No orders yet.</p>`;
            return;
        }

        // Already sorted by submitted_at desc from the query
        container.innerHTML = filtered.map(order => createOrderCard(order, user.role === "admin")).join("");

    } catch (err) {
        console.error(err);
        container.innerHTML = `<p class="text-sm text-red-600">Error loading orders.</p>`;
    }
}

function getSalesmanCommissionRates(user) {
    let standardRate = 8;
    let marketRate = 3;

    if (!user) {
        return { standardRate, marketRate };
    }

    // Rates already on the logged-in user object
    if (user.commission != null) {
        standardRate = parseFloat(user.commission) || standardRate;
    }
    if (user.marketCommission != null) {
        marketRate = parseFloat(user.marketCommission) || marketRate;
    }

    try {
        const salesmen = JSON.parse(localStorage.getItem("salesmen") || "[]");
        if (!Array.isArray(salesmen) || salesmen.length === 0) {
            return { standardRate, marketRate };
        }

        const email = (user.email || "").toLowerCase().trim();
        const fullName = (user.fullName || user.name || "").toLowerCase().trim();

        // 1) Match by email (best)
        let match = null;
        if (email) {
            match = salesmen.find(s => (s.email || "").toLowerCase().trim() === email);
        }

        // 2) Fallback: match by full name
        if (!match && fullName) {
            match = salesmen.find(s => {
                const sName = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase().trim();
                return sName === fullName;
            });
        }

        if (match) {
            if (match.commission != null) {
                standardRate = parseFloat(match.commission) || standardRate;
            }
            if (match.marketCommission != null) {
                marketRate = parseFloat(match.marketCommission) || marketRate;
            }
        }
    } catch (e) {
        // ignore lookup errors
    }

    return { standardRate, marketRate };
}

function createOrderCard(order, showSalesman = false) {
    const user = getCurrentUser() || currentUser;
    const { standardRate, marketRate } = getSalesmanCommissionRates(user);

    const status = (order.status || "Submitted").toString();
    const statusLower = status.toLowerCase();

    let statusClass = "bg-orange-100 text-orange-700";
    if (statusLower === "received" || statusLower === "processing") {
        statusClass = "bg-blue-100 text-blue-800";
    } else if (statusLower === "shipped") {
        statusClass = "bg-purple-100 text-purple-800";
    } else if (statusLower === "delivered" || statusLower === "completed") {
        statusClass = "bg-green-100 text-green-700";
    } else if (statusLower === "denied") {
        statusClass = "bg-red-100 text-red-700";
    }

    let productSubtotal = 0;
    let normalSubtotal = 0;
    let marketSubtotal = 0;

        const itemRows = (order.items || []).map(item => {
        const qty = parseInt(item.quantity, 10) || 0;
        const isMarket = !!item.isMarketPrice;
        const unitPriceNum = parseFloat(item.unitPrice);
        const hasRealPrice = !isNaN(unitPriceNum) && unitPriceNum > 0;
        const lineTotal = hasRealPrice ? unitPriceNum * qty : 0;

        if (isMarket) {
            if (hasRealPrice) {
                productSubtotal += lineTotal;
                marketSubtotal += lineTotal;
            }
        } else {
            productSubtotal += lineTotal;
            normalSubtotal += lineTotal;
        }

        const lineLabel = hasRealPrice
            ? "$" + lineTotal.toFixed(2)
            : (item.displayPrice || "Market Price");

        const unitLabel = hasRealPrice
            ? "$" + unitPriceNum.toFixed(2)
            : (item.displayPrice || "Market Price");

        return `
            <div class="flex justify-between text-sm py-1 border-b border-[#eee]">
                <div class="pr-3">
                    <span class="font-medium">${item.product || item.name || "Item"}</span>
                    <span class="text-[#6B4423]"> × ${qty} units</span>
                    <div class="text-xs text-[#6B4423]">${unitLabel} each</div>
                </div>
                <div class="text-right font-semibold">${lineLabel}</div>
            </div>
        `;
    }).join("");

    const shipping = parseFloat(order.shipping_cost ?? order.shippingCost) || 0;
    const finalTotal = productSubtotal + shipping;

    const normalCommission = normalSubtotal * (standardRate / 100);
    const marketCommissionAmt = marketSubtotal * (marketRate / 100);
    const totalCommission = normalCommission + marketCommissionAmt;

     const safeId = String(order.id || '').replace(/'/g, "\\'");
    return `
        <div style="background:#fff; border:2px solid #6B4423; border-radius:12px; padding:1rem; margin-bottom:1rem; cursor:pointer;"
             onclick="openSalesmanOrderInvoice('${safeId}')"
             title="Click to view invoice">
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:0.75rem;">
                <div>
                    <strong style="color:#1E4D2B; font-size:1.05rem;">${order.customer_name || order.customer || "Customer"}</strong>
                    <div style="font-size:0.8rem; color:#888; margin-top:0.15rem;">
                        Order #${order.id} · ${new Date(order.submitted_at || order.submittedAt).toLocaleDateString()}
                    </div>
                    ${showSalesman ? `<div style="font-size:0.8rem; color:#6B4423;">Salesman: ${order.salesman_name || order.salesman || "N/A"}</div>` : ""}
                </div>
                <span class="px-3 py-1 text-xs font-semibold rounded-full ${statusClass}">
                    ${status}
                </span>
            </div>

            <div style="margin-bottom:0.75rem;">
                ${itemRows || "<p class='text-sm text-[#6B4423]'>No items</p>"}
            </div>

            <div style="border-top:1px solid #d4b78f; padding-top:0.6rem; font-size:0.9rem;">
                <div style="display:flex; justify-content:space-between;">
                    <span class="text-[#6B4423]">Product Subtotal</span>
                    <span>$${productSubtotal.toFixed(2)}</span>
                </div>
                <div style="display:flex; justify-content:space-between;">
                    <span class="text-[#6B4423]">Shipping</span>
                    <span>${shipping > 0
                        ? ("$" + shipping.toFixed(2))
                        : ((statusLower === "shipped" || statusLower === "delivered" || statusLower === "completed")
                            ? "Free Shipping"
                            : "TBD")}</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-weight:700; color:#1E4D2B; margin-top:0.25rem;">
                    <span>Order Total</span>
                    <span>$${finalTotal.toFixed(2)}</span>
                </div>
            </div>

            <div style="margin-top:0.75rem; padding:0.6rem; background:#f8f4eb; border-radius:8px; font-size:0.85rem;">
                <div style="display:flex; justify-content:space-between;">
                    <span>Commission (${standardRate}% standard${marketSubtotal > 0 ? " / " + marketRate + "% market" : ""})</span>
                    <strong style="color:#1E4D2B;">$${totalCommission.toFixed(2)}</strong>
                </div>
                <p style="margin:0.25rem 0 0; font-size:0.75rem; color:#6B4423;">
                    Commission is calculated on product subtotal only. Shipping is not included.
                </p>
            </div>
        </div>
    `;
}

function hideOrderInvoiceModal() {
    const modal = document.getElementById('order-invoice-modal');
    if (modal) modal.classList.add('hidden');
}

async function openSalesmanOrderInvoice(orderId) {
    const id = String(orderId || '');
    const orders = window._salesmanOrders || [];
    const order = orders.find(o => String(o.id) === id);
    if (!order) {
        alert('Order not found.');
        return;
    }

    // Customer lookup for addresses (email first, then name)
    let customer = null;
    const customers = window._salesmanCustomers || [];
    if (customers.length) {
        customer = customers.find(c =>
            (c.email && order.customer_email && c.email.toLowerCase() === order.customer_email.toLowerCase()) ||
            (c.name && order.customer_name && c.name.toLowerCase() === order.customer_name.toLowerCase())
        ) || null;
    }

    // Lazy load from Supabase if Order History was opened before Customers tab
    if (!customer && typeof supabaseClient !== 'undefined') {
        try {
            const email = (order.customer_email || '').trim();
            const name = (order.customer_name || order.customer || '').trim();

            if (email) {
                const { data } = await supabaseClient
                    .from('customers')
                    .select('*')
                    .ilike('email', email)
                    .limit(1)
                    .maybeSingle();
                if (data) customer = data;
            }

            if (!customer && name) {
                const { data } = await supabaseClient
                    .from('customers')
                    .select('*')
                    .ilike('name', name)
                    .limit(1)
                    .maybeSingle();
                if (data) customer = data;
            }

            if (customer) {
                window._salesmanCustomers = window._salesmanCustomers || [];
                const already = window._salesmanCustomers.some(c => String(c.id) === String(customer.id));
                if (!already) window._salesmanCustomers.push(customer);
            }
        } catch (err) {
            console.warn('Invoice customer lookup failed:', err);
        }
    }

    // Header
    const invNumber = document.getElementById('inv-number');
    const invDate = document.getElementById('inv-date');
    const invStatus = document.getElementById('inv-status');
    if (invNumber) invNumber.textContent = order.id || '—';
    if (invDate) {
        const d = new Date(order.submitted_at || order.submittedAt || Date.now());
        invDate.textContent = isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
    }
    if (invStatus) invStatus.textContent = (order.status || 'Submitted').toString();

    // BILL TO / SHIP TO
    const billEl = document.getElementById('inv-bill-to');
    const shipEl = document.getElementById('inv-ship-to');
    const name = order.customer_name || order.customer || customer?.name || '—';
    const company = order.customer_company || customer?.company || '';
    const email = order.customer_email || customer?.email || '';
    const phone = customer?.phone || '';
    const billingAddr = customer?.billing_address || customer?.billingAddress || customer?.shipping_address || customer?.shippingAddress || '';
    const shippingAddr = customer?.shipping_address || customer?.shippingAddress || billingAddr || '';

    const billLines = [name, company, phone, email, billingAddr].filter(Boolean);
    const shipLines = [name, company, phone, email, shippingAddr].filter(Boolean);
    if (billEl) billEl.innerHTML = billLines.map(l => `<p>${l}</p>`).join('') || '—';
    if (shipEl) shipEl.innerHTML = shipLines.map(l => `<p>${l}</p>`).join('') || '—';

    // Line items
    const tbody = document.getElementById('inv-items-body');
    let productSubtotal = 0;
    if (tbody) {
        const items = order.items || [];
        if (items.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-[#6B4423]">No line items</td></tr>`;
        } else {
            tbody.innerHTML = items.map(item => {
                const qty = parseInt(item.quantity, 10) || 0;
                const unit = parseFloat(item.unitPrice);
                const hasPrice = !isNaN(unit) && unit > 0;
                const lineTotal = hasPrice ? unit * qty : 0;
                if (hasPrice) productSubtotal += lineTotal;
                const unitLabel = hasPrice ? '$' + unit.toFixed(2) : (item.displayPrice || 'Market Price');
                const totalLabel = hasPrice ? '$' + lineTotal.toFixed(2) : (item.displayPrice || '—');
                return `
                    <tr class="border-b border-[#eee]">
                        <td class="p-3 align-top">${qty}</td>
                        <td class="p-3 align-top">${item.product || item.name || 'Item'}</td>
                        <td class="p-3 text-right align-top">${unitLabel}</td>
                        <td class="p-3 text-right align-top font-semibold">${totalLabel}</td>
                    </tr>
                `;
            }).join('');
        }
    }

    // Notes (hide system text)
    const notesEl = document.getElementById('inv-notes');
    if (notesEl) {
        let notes = (order.notes || '').trim();
        const systemPhrases = [
            'Submitted via Salesman Portal',
            'Created via Add Order',
            'Submitted via Wholesale Portal'
        ];
        if (systemPhrases.some(p => notes === p || notes.startsWith(p))) {
            notes = '';
        }
        notesEl.textContent = notes || '—';
    }

    // Totals
    const shipping = parseFloat(order.shipping_cost ?? order.shippingCost) || 0;
    const credit = parseFloat(order.credit) || 0;
    const finalTotal = Math.max(0, productSubtotal + shipping - credit);

    const subEl = document.getElementById('inv-subtotal');
    const shipCostEl = document.getElementById('inv-shipping');
    const creditRow = document.getElementById('inv-credit-row');
    const creditEl = document.getElementById('inv-credit');
    const totalEl = document.getElementById('inv-total');

    if (subEl) subEl.textContent = '$' + productSubtotal.toFixed(2);
    if (shipCostEl) {
        const st = (order.status || '').toString().toLowerCase();
        if (shipping > 0) {
            shipCostEl.textContent = '$' + shipping.toFixed(2);
        } else if (st === 'shipped' || st === 'delivered' || st === 'completed') {
            shipCostEl.textContent = 'Free Shipping';
        } else {
            shipCostEl.textContent = 'TBD';
        }
    }
    if (creditRow && creditEl) {
        if (credit > 0) {
            creditRow.classList.remove('hidden');
            creditEl.textContent = '−$' + credit.toFixed(2);
        } else {
            creditRow.classList.add('hidden');
        }
    }
    if (totalEl) totalEl.textContent = '$' + finalTotal.toFixed(2);

    // Show modal
    const modal = document.getElementById('order-invoice-modal');
    if (modal) modal.classList.remove('hidden');
}

function updateOrderStatus(orderId, newStatus) {
    let orders = JSON.parse(localStorage.getItem("submittedOrders") || "[]");
    const index = orders.findIndex(o => o.id === orderId);
    if (index !== -1) {
        orders[index].status = newStatus;
        localStorage.setItem("submittedOrders", JSON.stringify(orders));
        renderMyOrders();
    }
}

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
                <p class="text-lg font-semibold">${user.fullName || user.name || "N/A"}</p>
            </div>
            <div>
                <p class="text-sm text-[#6B4423] font-semibold">Email</p>
                <p class="text-lg">${user.email || "N/A"}</p>
            </div>
            <div>
                <p class="text-sm text-[#6B4423] font-semibold">Role</p>
                <p class="text-lg capitalize">${user.role || "N/A"}</p>
            </div>
            <div>
                <p class="text-sm text-[#6B4423] font-semibold">Territories</p>
                <p class="text-lg">${user.territories ? user.territories.join(", ") : "N/A"}</p>
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

        const rows = Object.keys(sheet.prices).sort().map(name => {
            const price = sheet.prices[name];
            return `
                <div class="flex justify-between py-2 border-b border-[#eee] text-sm">
                    <span class="pr-3">${name}</span>
                    <span class="font-semibold brand-green">$${Number(price).toFixed(2)}</span>
                </div>
            `;
        }).join("");

        list.innerHTML = rows;

    } catch (err) {
        console.error(err);
        list.innerHTML = `<p class="text-sm text-red-600">Error loading price sheet.</p>`;
    }
}

function exportPriceSheetPdf() {
    alert("PDF export will be added next. For now, use the on-screen price sheet.");
}

// ================== INITIAL PRICING SHEET ==================
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

// ================== ADMIN ==================
function showAdminPanel() {
    const modal = document.getElementById("admin-modal");
    const list = document.getElementById("admin-proposals-list");
    const pending = proposals.filter(p => p.status === "Pending");

    if (pending.length === 0) {
        list.innerHTML = "<p style='padding:1.5rem 0;color:#6B4423;'>No pending proposals.</p>";
    } else {
        list.innerHTML = pending.map(p => `
            <div class="proposal-card">
                <strong>${p.product}</strong> for <strong>${p.customer}</strong><br>
                <span style="font-size:0.85rem;">by ${p.salesmanName}</span><br><br>
                Current: <strong>${p.currentPrice}</strong> → Proposed: <strong style="color:#c56134;">${p.proposedPrice}</strong><br>
                <em>${p.reason}</em><br><br>
                <button onclick="approveProposal(${p.id}, this)" style="background:#166534;color:white;border:none;padding:0.5rem 1rem;border-radius:8px;margin-right:0.5rem;">Approve</button>
                <button onclick="rejectProposal(${p.id}, this)" style="background:#991b1b;color:white;border:none;padding:0.5rem 1rem;border-radius:8px;">Reject</button>
            </div>
        `).join("");
    }
    modal.style.display = "flex";
}

function hideAdminPanel() {
    document.getElementById("admin-modal").style.display = "none";
    renderMyProposals();
}

function approveProposal(id, btn) {
    const p = proposals.find(x => x.id === id);
    p.status = "Approved";
    p.adminNotes = prompt("Admin notes (optional):", "Approved") || "";
    localStorage.setItem("salesmanProposals", JSON.stringify(proposals));
    btn.parentElement.innerHTML = "<span style='color:#166534;font-weight:700;'>✓ Approved</span>";
    setTimeout(hideAdminPanel, 800);
}

function rejectProposal(id, btn) {
    const p = proposals.find(x => x.id === id);
    p.status = "Rejected";
    p.adminNotes = prompt("Reason for rejection:", "") || "";
    localStorage.setItem("salesmanProposals", JSON.stringify(proposals));
    btn.parentElement.innerHTML = "<span style='color:#991b1b;font-weight:700;'>✗ Rejected</span>";
    setTimeout(hideAdminPanel, 800);
}

function updateAdminDashboard() {
    const pending = proposals.filter(p => p.status === "Pending").length;
    const approved = proposals.filter(p => p.status === "Approved").length;
    const rejected = proposals.filter(p => p.status === "Rejected").length;

    const pendingEl = document.getElementById("pending-count");
    const approvedEl = document.getElementById("approved-count");
    const rejectedEl = document.getElementById("rejected-count");

    if (pendingEl) pendingEl.textContent = pending;
    if (approvedEl) approvedEl.textContent = approved;
    if (rejectedEl) rejectedEl.textContent = rejected;
}

function showProposeCustomerEdit() {
    const detail = document.getElementById('salesman-customer-modal');
    if (!detail) {
        alert('Customer detail modal not found.');
        return;
    }

    let customer = null;
    try {
        customer = JSON.parse(detail.dataset.customerJson || 'null');
    } catch (e) {
        customer = null;
    }
    if (!customer) {
        alert('Could not load customer data for editing.');
        return;
    }

    const modal = document.getElementById('propose-customer-edit-modal');
    if (!modal) {
        alert('Propose edit modal is missing from the HTML.');
        return;
    }

    modal.dataset.customerId = customer.id || detail.dataset.customerId || '';

    const setVal = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    };

    setVal('pce-name', customer.name);
    setVal('pce-company', customer.company);
    setVal('pce-email', customer.email);
    setVal('pce-phone', customer.phone);
    setVal('pce-territory', customer.territory);
    setVal('pce-shipping', customer.shipping_address || customer.shippingAddress);
    setVal('pce-billing', customer.billing_address || customer.billingAddress);
    setVal('pce-notes', customer.notes);

    hideSalesmanCustomerModal();
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

function hideProposeCustomerEdit() {
    const modal = document.getElementById('propose-customer-edit-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

function togglePceSameAddress() {
    const same = document.getElementById('pce-same-address');
    const shipping = document.getElementById('pce-shipping');
    const billing = document.getElementById('pce-billing');
    if (!same || !shipping || !billing) return;

    if (same.checked) {
        billing.value = shipping.value;
        billing.readOnly = true;
        billing.classList.add('bg-gray-100');
    } else {
        billing.readOnly = false;
        billing.classList.remove('bg-gray-100');
    }
}

async function submitCustomerEditProposal(event) {
    event.preventDefault();

    const modal = document.getElementById('propose-customer-edit-modal');
    const customerId = modal?.dataset?.customerId;
    if (!customerId) {
        alert('Missing customer id.');
        return;
    }

    const user = getCurrentUser() || currentUser;
    if (!user) {
        alert('You must be logged in.');
        return;
    }

    const same = document.getElementById('pce-same-address')?.checked;
    const shipping = (document.getElementById('pce-shipping')?.value || '').trim();
    const billing = same
        ? shipping
        : (document.getElementById('pce-billing')?.value || '').trim();

    const proposed = {
        name: (document.getElementById('pce-name')?.value || '').trim(),
        company: (document.getElementById('pce-company')?.value || '').trim(),
        email: (document.getElementById('pce-email')?.value || '').trim(),
        phone: (document.getElementById('pce-phone')?.value || '').trim(),
        territory: (document.getElementById('pce-territory')?.value || '').trim(),
        shipping_address: shipping,
        billing_address: billing || shipping,
        notes: (document.getElementById('pce-notes')?.value || '').trim()
    };

    if (!proposed.name) {
        alert('Name is required.');
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('customer_change_requests')
            .insert({
                customer_id: customerId,
                salesman_email: (user.email || '').toLowerCase().trim(),
                salesman_name: user.fullName || user.name || 'Salesman',
                status: 'Pending',
                proposed_changes: proposed,
                submitted_at: new Date().toISOString()
            });

        if (error) {
            console.error(error);
            alert('Failed to submit edit request.\n' + error.message);
            return;
        }

        hideProposeCustomerEdit();
        alert('Edit submitted for admin approval.');

    } catch (err) {
        console.error(err);
        alert('Something went wrong.');
    }
}



// ================== INITIALIZATION ==================
window.onload = function() {
    const user = getCurrentUser();

    if (!user || (user.role !== "salesman" && user.role !== "admin")) {
        window.location.href = "login-portal.html";
        return;
    }

    currentUser = user;
    showPortal();

    if (typeof checkNewAssignedCustomers === 'function') {
        setTimeout(checkNewAssignedCustomers, 600);
    }
};