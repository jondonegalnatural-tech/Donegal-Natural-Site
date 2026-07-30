// =============================================
// WHOLESALE-PORTAL.JS — Donegal Natural
// =============================================

console.log("wholesale-portal.js loaded");

// ================== SUPABASE SETUP (TEMPORARY) ==================
// ================== SUPABASE SETUP ==================
// ================== SUPABASE SETUP ==================
const SUPABASE_URL = 'https://kyzfdlzqlckrpdkavxei.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5emZkbHpxbGNrcnBka2F2eGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3ODU0NjEsImV4cCI6MjEwMDM2MTQ2MX0.Y1Sshp1-0lFwKakCgpJtAUpaHNB0PQ1vuo6SOHZcPu4';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ================== GLOBAL VARIABLES ==================
let currentCategoryFilter = 'All';
let quoteItems = JSON.parse(localStorage.getItem('wholesaleQuote')) || [];
let portalInventory = {}; // product_name → quantity


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

// ================== WHOLESALE PRICES (Full Structure with Duplication) ==================
const WHOLESALE_PRICES = [
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

function renderCategoryFilters() {
    const container = document.getElementById('category-filters');
    if (!container) return;

    container.innerHTML = '';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.gap = '0.35rem';
    container.style.fontSize = '0.88rem';

    // Row 1: All
    createSingleText(container, 'All', true);

    // Row 2
    createCategoryRow(container, ['Bully Sticks', 'Cow Cheeks', 'Jerky', 'Feet', 'Ears']);

    // Row 3
    createCategoryRow(container, ['Large Meaty Femur/Bone/Knuckles', 'Horns', 'Hooves', 'Braided', 'Ox Tails']);

    // Row 4
    createCategoryRow(container, ['Twisty Q’s and Natural Munchy Sticks', 'Supreme Hide Chips', 'Retrievers', 'Pressed Bones']);

    // Row 5
    createSingleText(container, 'Packaged Items', false);
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

// Helper for single item rows (All and Packaged Items)
function createSingleText(parent, text, isAll) {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.justifyContent = 'center';
    div.style.width = '100%';

    const span = document.createElement('span');
    span.textContent = text;
    span.style.cursor = 'pointer';
    span.style.fontWeight = '700';
    span.style.fontSize = '0.88rem';                    // Consistent font size
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

// Helper for multi-item rows
function createCategoryRow(parent, categories) {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'center';
    row.style.flexWrap = 'wrap';
    row.style.width = '100%';
    row.style.lineHeight = '1.65';

    categories.forEach((category, index) => {
        const span = document.createElement('span');
        span.textContent = category;
        span.style.cursor = 'pointer';
        span.style.margin = '0 5px';
        span.style.fontWeight = '700';
        span.style.fontSize = '0.9rem';
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
function renderPortalProducts() {
    const container = document.getElementById('portal-products');
    if (!container) return;

    // Gate: no prices until salesman has approved pricing for this customer
    const customer = window._currentCustomer;
    if (!customer || !customer.pricing_approved_at) {
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

    const section = document.getElementById('section-products');
    if (section) {
        section.style.setProperty('max-width', 'none', 'important');
        section.style.setProperty('width', '100%', 'important');
        section.style.setProperty('margin-left', '0', 'important');
        section.style.setProperty('margin-right', '0', 'important');
        section.style.setProperty('padding-left', '2rem', 'important');
        section.style.setProperty('padding-right', '2rem', 'important');
        section.style.setProperty('box-sizing', 'border-box', 'important');
    }

    container.style.maxWidth = '1200px';
    container.style.width = '100%';
    container.style.marginLeft = 'auto';
    container.style.marginRight = 'auto';
    container.style.paddingLeft = '0';
    container.style.paddingRight = '0';
    container.innerHTML = '';

    const table = document.createElement('table');
    table.style.cssText = 'width:100%; border-collapse:collapse; table-layout:auto; margin:0; padding:0; font-size: 0.88rem;';
    table.innerHTML = `
        <thead>
            <tr style="background:#1E4D2B; color:#d4b78f;">
                <th style="border:2px solid #6B4423; padding:0.45rem 0.5rem; text-align:left; font-weight:600;">Product Name</th>
                <th style="border:2px solid #6B4423; padding:0.45rem 0.5rem; text-align:center; font-weight:600; width:90px;">Case Size</th>
                <th style="border:2px solid #6B4423; padding:0.45rem 0.5rem; text-align:center; font-weight:600; width:95px;">Unit Price</th>
                <th style="border:2px solid #6B4423; padding:0.45rem 0.5rem; text-align:center; font-weight:600; width:120px;">Add to Quote</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    container.appendChild(table);
    const tbody = table.querySelector('tbody');

    let productsToShow = WHOLESALE_PRICES;
    if (currentCategoryFilter !== 'All') {
        productsToShow = WHOLESALE_PRICES.filter(p => p.category === currentCategoryFilter);
    }

    if (productsToShow.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="4" style="padding:1rem; text-align:center; color:#6B4423;">No products found in this category.</td>`;
        tbody.appendChild(row);
        return;
    }

    const grouped = {};
    productsToShow.forEach(product => {
        const key = product.subCategory || "General";
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(product);
    });

    Object.keys(grouped).forEach(subCat => {
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `
            <td colspan="4" style="background:#e8d9c2; color:#1E4D2B; font-weight:700; padding:0.45rem 0.5rem; border:2px solid #6B4423; font-size:0.9rem;">
                ${subCat}
            </td>
        `;
        tbody.appendChild(headerRow);

        grouped[subCat].forEach(product => {
            const safeName = product.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            let displayPrice = product.price || "";
            if (product.price && !product.price.toLowerCase().includes('market') && !product.price.includes('/')) {
                displayPrice += '/ea';
            }

            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid #6B4423';
            row.innerHTML = `
                                <td style="border:1px solid #6B4423; padding:0.5rem; font-weight:600; color:#1E4D2B;">
                    ${product.name}
                    ${(() => {
                        const qty = portalInventory[product.name];
                        if (qty === undefined) return '';
                        if (qty <= 0) return ' <span style="display:inline-block;margin-left:6px;padding:1px 6px;font-size:0.7rem;font-weight:700;border-radius:999px;background:#fee2e2;color:#b91c1c;">Out of Stock</span>';
                        if (qty < 50) return ' <span style="display:inline-block;margin-left:6px;padding:1px 6px;font-size:0.7rem;font-weight:700;border-radius:999px;background:#ffedd5;color:#c2410c;">Low Stock</span>';
                        return '';
                    })()}
                </td>
                <td style="border:1px solid #6B4423; padding:0.5rem; color:#6B4423; text-align:center; width:90px;">
                    ${product.cs || ""}
                </td>
                <td style="border:1px solid #6B4423; padding:0.5rem; font-weight:700; color:#1E4D2B; text-align:center; width:95px;">
                    ${displayPrice}
                </td>
                <td style="border:1px solid #6B4423; padding:0.5rem; text-align:center; width:120px;">
                    <button onclick="showPackagedItemModal('${safeName}', '${product.price || ""}', '${product.cs || ""}', '${product.category}', 'media/placeholder-bully-stick.png', getHealthBenefitsForProduct('${product.name}'))"
                            style="padding: 0.35rem 0.85rem; background:#1E4D2B; color:#d4b78f; font-weight:700; border-radius:8px; font-size:0.78rem; white-space: nowrap;">
                        Add to Quote
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    });
}
// ================== ADD TO QUOTE SYSTEM ==================
function showPackagedItemModal(name, price, cs, category, image = null, healthBenefits = null) {
    const oldModal = document.getElementById('add-to-quote-modal');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.id = 'add-to-quote-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999]';

    // Use placeholder image if none is provided
    const imagePath = image || 'media/placeholder-bully-stick.png';

    let imageHTML = `
        <div class="mb-4 flex justify-center">
            <img src="${imagePath}" alt="${name}" class="max-h-40 rounded-xl object-contain border border-[#d4b78f]">
        </div>
    `;

    let benefitsHTML = '';
    if (healthBenefits && healthBenefits.length > 0) {
        benefitsHTML = `
            <div class="mb-4">
                <p class="font-semibold text-sm mb-1 text-[#1E4D2B]">Health Benefits:</p>
                <ul class="text-sm text-[#6B4423] list-disc pl-5 space-y-1">
                    ${healthBenefits.map(b => `<li>${b}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    modal.innerHTML = `
        <div class="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 class="text-xl font-bold brand-green mb-3">Add to Quote</h3>

            ${imageHTML}

            <p class="font-semibold text-lg mb-1">${name}</p>
            <p class="text-sm text-[#6B4423] mb-4">${cs} • ${price}</p>

            ${benefitsHTML}

            <div class="mb-4">
                <label class="block text-sm font-medium mb-1">Quantity</label>
                <input type="number" id="quote-quantity" value="1" min="1" 
                       class="w-full border-2 border-[#6B4423] rounded-xl px-4 py-2 text-lg">
            </div>

            <div class="flex gap-3">
                <button onclick="addToQuote('${name.replace(/'/g, "\\'")}', '${price}', '${cs}', document.getElementById('quote-quantity').value)"
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
}

function closeAddToQuoteModal() {
    const modal = document.getElementById('add-to-quote-modal');
    if (modal) modal.remove();
}

function addToQuote(name, price, cs, quantity) {
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
                    <p class="font-semibold leading-tight">${item.name}</p>
                    <p class="text-xs text-[#6B4423] mt-0.5">${item.cs}</p>
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

    summaryHTML += `
        <p class="text-xs text-[#6B4423] italic mb-3">
            Final total will be sent with your invoice.
        </p>

        <button onclick="submitQuote()" 
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
                            <p class="font-semibold">${item.name}</p>
                            <p class="text-sm text-[#6B4423]">${item.cs} × ${item.quantity}</p>
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
            <button onclick="submitQuote(); this.closest('.fixed').remove()" 
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

async function submitQuote() {
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
        submitted_at: new Date().toISOString()
    };

    try {
        const { data, error } = await supabaseClient
            .from('orders')
            .insert([payload])
            .select('id')
            .single();

        if (error) throw error;

        quoteItems = [];
        localStorage.setItem('wholesaleQuote', JSON.stringify(quoteItems));
        updateQuoteSidebar();

        alert(
            "Thank you! Your quote request has been submitted.\n\n" +
            "A member of our team will contact you shortly." +
            (data?.id ? "\n\nReference: " + data.id : "")
        );
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

        const active = (data || []).filter(order => {
            const status = (order.status || '').toLowerCase();
            return !['shipped', 'delivered'].includes(status);
        });

        if (active.length === 0) {
            container.innerHTML = `
                <h2 class="text-2xl font-bold brand-green mb-6">My Quote Requests</h2>
                <div class="bg-white border-2 border-[#6B4423] rounded-2xl p-8 text-center">
                    <p class="text-[#6B4423]">You have no active quotes.</p>
                </div>
            `;
            return;
        }

        let html = `<h2 class="text-2xl font-bold brand-green mb-6">My Quote Requests</h2>`;

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
                <div class="bg-white border-2 border-[#6B4423] rounded-2xl p-6 mb-4">
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <p class="font-bold text-lg brand-green">Quote</p>
                            <p class="text-xs text-[#6B4423]">${quote.id}</p>
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
                                <span>• ${item.product} × ${item.quantity}</span>
                                <span class="text-[#6B4423]">${item.displayPrice || ''}</span>
                            </li>
                        `).join('')}
                    </ul>

                    <div class="border-t border-[#d4b78f] pt-3 flex justify-between items-center">
                        <span class="font-semibold brand-green">Quote Total</span>
                        <span class="text-xl font-bold brand-green">${totalDisplay}</span>
                    </div>
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

        const completed = (data || []).filter(order => {
            const status = (order.status || '').toLowerCase();
            return ['shipped', 'delivered'].includes(status);
        });

        updateOrderHistoryBadge(completed.length);

        if (completed.length === 0) {
            container.innerHTML = `
                <h2 class="text-2xl font-bold brand-green mb-6">Order History</h2>
                <div class="bg-white border-2 border-[#6B4423] rounded-2xl p-8 text-center">
                    <p class="text-[#6B4423]">No completed orders yet.</p>
                </div>
            `;
            return;
        }

        let html = `<h2 class="text-2xl font-bold brand-green mb-6">Order History</h2>`;

        completed.forEach(order => {
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

            const badgeClass = status === 'shipped'
                ? 'bg-purple-100 text-purple-800'
                : 'bg-green-100 text-green-700';
            const badgeText = status === 'shipped' ? 'Shipped' : 'Delivered';

            html += `
                <div class="bg-white border-2 border-[#6B4423] rounded-2xl p-6 mb-4">
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <p class="font-bold text-lg brand-green">Invoice</p>
                            <p class="text-xs text-[#6B4423]">${order.id}</p>
                            <p class="text-sm text-[#6B4423]">Order Date: ${date}</p>
                        </div>
                        <span class="px-3 py-1 text-xs font-semibold rounded-full ${badgeClass}">
                            ${badgeText}
                        </span>
                    </div>

                    <ul class="text-sm space-y-1 mb-4">
                        ${items.map(item => `
                            <li class="flex justify-between">
                                <span>• ${item.product} × ${item.quantity}</span>
                                <span class="text-[#6B4423]">${item.displayPrice || ('$' + (parseFloat(item.unitPrice) || 0).toFixed(2))}</span>
                            </li>
                        `).join('')}
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

                    <button onclick="payInvoice('${order.id}')"
                            class="w-full bg-[#1E4D2B] hover:bg-[#254a2f] text-[#d4b78f] font-bold py-3 rounded-xl">
                        Pay Invoice
                    </button>
                </div>
            `;
        });

        container.innerHTML = html;
    } catch (err) {
        console.error(err);
        container.innerHTML = `
            <h2 class="text-2xl font-bold brand-green mb-6">Order History</h2>
            <p class="text-sm text-red-600">Could not load order history.</p>
        `;
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
        const { data, error } = await supabaseClient
            .from('orders')
            .select('id, status')
            .eq('source', 'wholesale')
            .eq('customer_email', email);
        if (error) throw error;
        const completed = (data || []).filter(o => {
            const s = (o.status || '').toLowerCase();
            return s === 'shipped' || s === 'delivered';
        });
        updateOrderHistoryBadge(completed.length);
    } catch (err) {
        console.error('refreshOrderHistoryBadge error:', err);
        updateOrderHistoryBadge(0);
    }
}

function payInvoice(orderId) {
    // Placeholder – payment flow (Check / ACH) will be built later
    alert('Payment options for Invoice #' + orderId + ' will be available soon.\n\nCheck and ACH payment will be added at the end of this build.');
}
// ================== ACCOUNT INFO DISPLAY ==================//
function showAccountInfo() {
    const container = document.getElementById('account-details');
    if (!container) return;

    const user = JSON.parse(localStorage.getItem('currentUser'));

    if (!user) {
        container.innerHTML = `<p class="text-[#6B4423]">No user information found.</p>`;
        return;
    }

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <p class="text-sm text-[#6B4423] font-semibold">Full Name</p>
                <p class="text-lg font-semibold">${user.fullName || 'N/A'}</p>
            </div>
            <div>
                <p class="text-sm text-[#6B4423] font-semibold">Company</p>
                <p class="text-lg font-semibold">${user.company || 'N/A'}</p>
            </div>
            <div>
                <p class="text-sm text-[#6B4423] font-semibold">Email</p>
                <p class="text-lg">${user.email || 'N/A'}</p>
            </div>
            <div>
                <p class="text-sm text-[#6B4423] font-semibold">Role</p>
                <p class="text-lg capitalize">${user.role || 'N/A'}</p>
            </div>
        </div>
    `;
}

function logout() {
    localStorage.removeItem("currentUser");
    window.location.href = "login-portal.html";
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

    const filtered = WHOLESALE_PRICES.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Simple re-render of filtered results
    container.innerHTML = '';

    if (filtered.length === 0) {
        container.innerHTML = `<p class="text-center py-8 text-[#6B4423]">No products found.</p>`;
        return;
    }

    // Re-use the same table structure from renderPortalProducts
    const table = document.createElement('table');
    table.style.cssText = 'width:100%; border-collapse:collapse; table-layout:auto; margin:0; padding:0; font-size: 0.88rem;';

    table.innerHTML = `
        <thead>
            <tr style="background:#1E4D2B; color:#d4b78f;">
                <th style="border:2px solid #6B4423; padding:0.45rem 0.5rem; text-align:left; font-weight:600; max-width: 340px;">Product Name</th>
                <th style="border:2px solid #6B4423; padding:0.45rem 0.5rem; text-align:center; font-weight:600; width:80px;">Case Size</th>
                <th style="border:2px solid #6B4423; padding:0.45rem 0.5rem; text-align:center; font-weight:600; width:85px;">Unit Price</th>
                <th style="border:2px solid #6B4423; padding:0.45rem 0.5rem; text-align:center; font-weight:600; width:115px;">Add to Quote</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');

    filtered.forEach(product => {
        const safeName = product.name.replace(/"/g, '&quot;');
        let displayPrice = product.price || "";
        if (product.price && !product.price.toLowerCase().includes('market') && !product.price.includes('/')) {
            displayPrice += '/ea';
        }

        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #6B4423';
        row.innerHTML = `
            <td style="border:1px solid #6B4423; padding:0.45rem 0.5rem; font-weight:600; color:#1E4D2B; white-space: nowrap; max-width: 340px; overflow: hidden; text-overflow: ellipsis;">
                ${product.name}
            </td>
            <td style="border:1px solid #6B4423; padding:0.45rem 0.5rem; color:#6B4423; text-align:center; width:80px;">
                ${product.cs || ""}
            </td>
            <td style="border:1px solid #6B4423; padding:0.45rem 0.5rem; font-weight:700; color:#1E4D2B; text-align:center; width:85px;">
                ${displayPrice}
            </td>
            <td style="border:1px solid #6B4423; padding:0.45rem 0.5rem; text-align:right; width:115px;">
                <button onclick="showPackagedItemModal('${safeName}', '${product.price || ""}', '${product.cs || ""}', '${product.category}')"
                        style="padding: 0.32rem 0.9rem; background:#1E4D2B; color:#d4b78f; font-weight:700; border-radius:8px; font-size:0.78rem; white-space: nowrap;">
                    Add to Quote
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    container.appendChild(table);
}

// ================== WELCOME MESSAGE ==================
function displayWelcome() {
    const nameElement = document.getElementById('welcome-name');
    if (!nameElement) return;

    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');

    if (user && user.fullName) {
        const company = user.company ? ` (${user.company})` : '';
        nameElement.textContent = `${user.fullName}${company}`;
    } else {
        nameElement.textContent = '';
    }
}

// ================== INITIALIZATION ==================
document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');

    if (!user || user.role !== 'customer') {
        window.location.href = 'login-portal.html';
        return;
    }

    // Password change required?
    if (user.mustChangePassword) {
        document.getElementById('password-change-modal')?.classList.remove('hidden');
        return; // stop portal init until password is changed
    }

        // Load customer record for onboarding + pricing gate
    try {
        const email = (user.email || '').toLowerCase().trim();
        const { data: customer } = await supabaseClient
            .from('customers')
            .select('*')
            .ilike('email', email)
            .maybeSingle();

        window._currentCustomer = customer || null;

        if (!customer || !customer.onboarding_complete) {
            document.getElementById('onboarding-modal')?.classList.remove('hidden');
            return;
        }
    } catch (err) {
        console.error('Customer load error:', err);
    }

    // Normal portal init
    await loadPortalInventory();
    renderCategoryFilters();
    renderPortalProducts();
    updateQuoteSidebar();
    setupSearch();
    displayWelcome();
    refreshOrderHistoryBadge();

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
            if (targetId === 'section-orders') loadOrderHistory();
        });
    });

    const defaultLink = document.querySelector('.sidebar-link[data-target="section-products"]');
    if (defaultLink) defaultLink.classList.add('active');
});

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

async function submitOnboarding() {
    const billing = document.getElementById('onboard-billing')?.value.trim() || '';
    const method = document.querySelector('input[name="payment-method"]:checked')?.value || '';
    const errEl = document.getElementById('onboarding-error');

    if (!billing) {
        if (errEl) {
            errEl.textContent = 'Billing address is required.';
            errEl.classList.remove('hidden');
        }
        return;
    }
    if (!method) {
        if (errEl) {
            errEl.textContent = 'Please select a payment method.';
            errEl.classList.remove('hidden');
        }
        return;
    }

    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const paymentStatus = method === 'ach' ? 'pending_admin' : 'active';
    const email = (user.email || '').toLowerCase().trim();

    console.log('Onboarding update for email:', email);
    console.log('Payload:', { billing, method, paymentStatus });

    try {
        const { data, error } = await supabaseClient
            .from('customers')
            .update({
                billing_address: billing,
                payment_method: method,
                payment_method_status: paymentStatus,
                onboarding_complete: true
            })
            .ilike('email', email)
            .select();

        console.log('Update data:', data);
        console.log('Update error:', error);

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
