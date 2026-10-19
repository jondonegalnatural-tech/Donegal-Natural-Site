// Internal portal — product photo gallery.
// _photoGalleryFamilyKey stays global because other portal code reads it.
// ================== PRODUCT PHOTO GALLERY ==================
const PHOTO_BUCKET = 'product-photos';
const PHOTO_FAMILIES = [
    { key: 'green-line', title: 'Green Line Bully Sticks', names: ['6” Thin Green Line Bully Sticks (Bulk)', '12” Thin Green Line Bully Sticks (Bulk)', '6” Regular Green Line Bully Sticks (Bulk)', '12” Regular Green Line Bully Sticks (Bulk)', '6” “Thick” Green Line Bully Sticks (Bulk)', '12” “Thick” Green Line Bully Sticks (Bulk)', '6” “Super Thick” Green Line Bully Sticks (Bulk)', '12” “Super Thick” Green Line Bully Sticks (Bulk)'] },
    { key: 'bully-canes', title: 'Bully Canes', names: ['24-28” Bully Cane', '32-36” Bully Cane'] },
    { key: 'braided-bully', title: 'Braided Bully Sticks', names: ['6” Braided Bully Sticks (Bulk)', '12” Braided Bully Sticks (Bulk)', '6” “Super” Braided Bully Sticks (Bulk)', '12” “Super” Braided Bully Sticks (Bulk)'] },
    { key: 'euro-bully', title: 'Euro Bully Sticks', names: ['6” Euro Bully Stick (Bulk)', '6” Euro Bully Stick (Display)', '12” Euro Bully Stick (Bulk)', '12” Euro Bully Sticks (Display)'] },
    { key: 'bully-pieces', title: 'Bully Pieces', names: ['8oz. Bag of Bully Pieces', '10oz. Bag of Bully Pieces', '16oz. Bag of Bully Pieces'], kind: 'packaged' },
    { key: 'beef-jerky', title: 'USA Beef Jerky Treats', names: ['USA Beef Jerky Treats (Bulk)', 'USA Beef Jerky Treats (Display)'] },
    { key: 'turkey-jerky', title: 'USA Turkey Jerky Treats', names: ['USA Turkey Jerky Treats (Bulk)', 'USA Turkey Jerky Treats (Display)'] },
    { key: 'chicken-jerky', title: 'USA Chicken Jerky Treats', names: ['USA Chicken Jerky Treats (Bulk)', 'USA Chicken Jerky Treats (Display)'] },
    { key: 'elky-jerky', title: 'USA Elky Jerky Treats', names: ['USA Elky Jerky Treats (Bulk)', 'USA Elky Jerky Treats (Display)'] },
    { key: 'venison-jerky', title: 'USA Venison & Sweet Potato Jerky', names: ['USA Venison & Sweet Potato Jerky Treats (Bulk)', 'USA Venison & Sweet Potato Jerky Treats (Display)'] },
    { key: 'elky-training', title: 'USA Elky Training Treats', names: ['6oz. Bags of USA Elky Training Treats', '8oz. Bags of USA Elky Training Treats', '10oz. Bags of USA Elky Training Treats', '12oz. Bags of USA Elky Training Treats'], kind: 'packaged' },
    { key: 'cow-ears', title: 'Cow Ears', names: ['Natural Cow Ears (Bulk)', 'Vanilla Cow Ears (Bulk)', 'Honey Smoked Cow Ears (Bulk)'] },
    { key: 'cow-ears-6pack', title: '6-Pack Cow Ears', names: ['6-Pack, Natural Cow Ears', '6-Pack Natural Cow Ears', '6-Pack, Vanilla Cow Ears', '6-Pack Vanilla Cow Ears', '6-Pack, Honey Smoked Cow Ears', '6-Pack Honey Smoked Cow Ears'], linkedFamilyKey: 'cow-ears', kind: 'packaged' },
    { key: 'buffalo-ears', title: 'Buffalo Ears', names: ['MAGNA Buffalo Ears (Bulk)', 'Honey Smoked MAGNA Buffalo Ears (Bulk)'] },
    { key: 'lamb-ears', title: 'Lamb Ears', names: ['White Lamb Ears (Bulk)', 'Vanilla Lamb Ears (Bulk)'] },
    { key: 'hairy-beef-ears', title: 'Hairy Beef Ears', names: ['Hairy Beef Ears (Bulk)', '5-Pack Hairy Beef Ears'] },
    { key: 'pig-ears', title: 'Pig Ears', names: ['Polish Pig Ears (Bulk)'] },
    { key: 'rabbit-ears', title: 'Fuzzy Rabbit Ears', names: ['Fuzzy Rabbit Ears (Bulk)', '10-Pack of Fuzzy Rabbit Ears', '10-Pack Fuzzy Rabbit Ears'] },
    { key: 'rabbit-feet', title: 'Fuzzy Rabbit Feet', names: ['Fuzzy Rabbit Feet (Bulk)', '10-Pack of Fuzzy Rabbit Feet', '10-Pack Fuzzy Rabbit Feet'] },
    { key: 'natural-rollio', title: 'Natural Rollio', names: ['5-6” Natural Rollio (Bulk)', '10-12” Natural Rollio (Bulk)'] },
    { key: 'regular-rollio', title: 'Regular Rollio', names: ['5-6” Regular Rollio (Bulk)', '10-12” Regular Rollio (Bulk)'] },
    { key: 'vanilla-rollio', title: 'Vanilla Rollio', names: ['5-6” Vanilla Rollio (Bulk)', '10-12” Vanilla Rollio (Bulk)'] },
    { key: 'honey-rollio', title: 'Honey Smoked Rollio', names: ['5-6” Honey Smoked Rollio (Bulk)', '10-12” Honey Smoked Rollio (Bulk)'] },
    { key: 'phat-rollio', title: 'PHAT Rollio', names: ['5-6” PHAT Rollio (Bulk)', '10-12” PHAT Rollio (Bulk)', '5-6” Vanilla PHAT Rollio (Bulk)', '10-12” Vanilla PHAT Rollio (Bulk)', '5-6” Honey Smoked PHAT Rollio (Bulk)', '10-12” Honey Smoked PHAT Rollio (Bulk)'] },
    { key: 'pb-rollio', title: 'Peanut Butter Rollio', names: ['5-6” Peanut Butter Rollio (Bulk)', '10-12” Peanut Butter Rollio (Bulk)'] },
    { key: 'cheek-slabs', title: 'Cow Cheek Slabs', names: ['5-6” Cow Cheek Slab (Bulk per lb.)', '5-6” Vanilla Cow Cheek Slab (Bulk per lb.)', '10-12” Cow Cheek Slab (Bulk per lb.)', '10-12” Vanilla Cow Cheek Slab (Bulk per lb.)', '10-12” Natural Cow Cheek Slabs (Bulk per lb.)'] },
    { key: 'chunky-bulk', title: 'Chunky Cheeks (Bulk)', names: ['White Chunky Cheeks (Bulk)', 'Vanilla Chunky Cheeks (Bulk)'] },
    { key: 'chunky-bags', title: 'Chunky Cheeks (Bags)', names: ['8oz. Bags of White Chunky Cheeks', '8oz. Bags of Vanilla Chunky Cheeks', '16oz. Bags of White Chunky Cheeks', '16oz. Bags of Vanilla Chunky Cheeks'], linkedFamilyKey: 'chunky-bulk', kind: 'packaged' },
    { key: 'pressed-bones', title: 'Pressed Bones', names: ['4.5” Pressed Bone (Bulk)', '6.5” Pressed Bone (Bulk)', '8.5” Pressed Bone (Bulk)', '10.5” Pressed Bone (Bulk)', '12.5” Pressed Bone (Bulk)'] },
    { key: 'pressed-ring', title: 'Supreme Pressed Ring', names: ['6” Supreme Pressed Ring (Bulk)'] },
    { key: 'pressed-stick', title: 'Supreme Pressed Stick', names: ['10” x 20mm Supreme Pressed Stick (Bulk)'] },
    { key: 'buffalo-knuckle', title: 'Buffalo Knuckle', names: ['Small Meaty Buffalo Knuckle'] },
    { key: 'femur', title: 'Jumbo Meaty Femur', names: ['14-16” Jumbo Meaty Femur Knuckle Bone'] },
    { key: 'beef-gullet', title: 'Beef Gullet / Esophagus', names: ['Beef Gullet', 'Beef Esophagus', 'Braided Esophagus'] },
    { key: 'magna-ox', title: 'MAGNA Ox Tails', names: ['6” MAGNA Natural Ox Tails (Bulk)', '12” MAGNA Natural Ox Tails (Bulk)'] },
    { key: 'ox-tails', title: 'Ox Tails', names: ['6” White Ox Tails (Bulk)', '12” White Ox Tails (Bulk)', '6” Vanilla Ox Tails (Bulk)', '12” Vanilla Ox Tails (Bulk)', '6” Honey Smoked Ox Tails (Bulk)', '12” Honey Smoked Ox Tails (Bulk)'] },
    { key: 'duck-necks', title: 'Duck Necks', names: ['Crunchy Baked Duck Necks (Bulk)', '10-Pack of Crunchy Duck Necks'] },
    { key: 'duck-heads', title: 'Duck Heads', names: ['Crunchy Baked Duck Heads (Bulk)', '5-Pack of Crunchy Duck Heads', '10-Pack of Duck Heads'] },
    { key: 'chicken-feet', title: 'Chicken Feet', names: ['Crunchy Euro Chicken Feet (Bulk)', '10-Pack Euro Chicken Feet'] },
    { key: 'braided-esophagus', title: 'Braided Esophagus', names: ['6” Braided Esophagus (Bulk)', '12” Braided Esophagus (Bulk)', '6” Braided Esophagus (Display)', '12” Braided Esophagus (Display)'] },
    { key: 'hide-donuts', title: 'USA Hide Braided Donuts', names: ['5-7” Braided USA Hide Donuts (Bulk)', '5-7” Vanilla USA Hide Braided Donuts (Bulk)', '8-9” Braided USA Hide Donuts (Bulk)', '8-9” Vanilla USA Hide Braided Donuts (Bulk)', '10-11” Braided USA Hide Donuts (Bulk)', '10-11” Vanilla USA Hide Braided Donuts (Bulk)'] },
    { key: 'binkeys', title: 'Binky’s Supreme Chips', names: ['8oz. Bags of White Supreme Chips (Binkey’s)', '8oz. Bags of Peanut Butter Supreme Chips (Binkey’s)', '8oz. Bags of Vanilla Supreme Chips (Binkey’s)', '16oz. Bags of White Supreme Chips (Binkey’s)', '16oz. Bags of Peanut Butter Supreme Chips (Binkey’s)', '16oz. Bags of Vanilla Supreme Chips (Binkey’s)'], linkedFamilyKey: 'supreme-chips-bulk', kind: 'packaged' },
    { key: 'supreme-chips-bulk', title: 'Supreme Hide Chips (Bulk)', names: ['White USA Supreme Hide Chips (Bulk per lb.)', 'Vanilla USA Supreme Chips (Bulk per lb.)', 'Peanut Butter Basted USA Supreme Hide Chips (Bulk per lb.)'] }
];

let _photoGalleryImages = [];
var _photoGalleryFamilyKey = null;
let _photoGalleryCategory = null;
let _photoGalleryQueue = [];

function photoFamilySlug(name) {
    return String(name || '')
        .toLowerCase()
        .replace(/[“”"']/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 48);
}

const PHOTO_GALLERY_TREE = {
    'Bully Sticks': {
        'Green Line': ['6” Thin Green Line Bully Sticks (Bulk)', '12” Thin Green Line Bully Sticks (Bulk)', '6” Regular Green Line Bully Sticks (Bulk)', '12” Regular Green Line Bully Sticks (Bulk)', '6” “Thick” Green Line Bully Sticks (Bulk)', '12” “Thick” Green Line Bully Sticks (Bulk)', '6” “Super Thick” Green Line Bully Sticks (Bulk)', '12” “Super Thick” Green Line Bully Sticks (Bulk)'],
        'Canes': ['24-28” Bully Cane', '32-36” Bully Cane'],
        'Braided Bully': ['6” Braided Bully Sticks (Bulk)', '12” Braided Bully Sticks (Bulk)', '6” “Super” Braided Bully Sticks (Bulk)', '12” “Super” Braided Bully Sticks (Bulk)'],
        'Euro Bully': ['6” Euro Bully Stick (Bulk)', '6” Euro Bully Stick (Display)', '12” Euro Bully Stick (Bulk)', '12” Euro Bully Sticks (Display)'],
        'Bully Pieces': ['8oz. Bag of Bully Pieces', '10oz. Bag of Bully Pieces', '16oz. Bag of Bully Pieces']
    },
    'Jerky': {
        'Jerky Stick Treats': ['USA Beef Jerky Treats (Bulk)', 'USA Beef Jerky Treats (Display)', 'USA Turkey Jerky Treats (Bulk)', 'USA Turkey Jerky Treats (Display)', 'USA Chicken Jerky Treats (Bulk)', 'USA Chicken Jerky Treats (Display)', 'USA Elky Jerky Treats (Bulk)', 'USA Elky Jerky Treats (Display)', 'USA Venison & Sweet Potato Jerky Treats (Bulk)', 'USA Venison & Sweet Potato Jerky Treats (Display)'],
        'Training Treats': ['6oz. Bags of USA Elky Training Treats', '8oz. Bags of USA Elky Training Treats', '10oz. Bags of USA Elky Training Treats', '12oz. Bags of USA Elky Training Treats'],
        'Jerky Stuffed Bones': ['Large Turkey Jerky Stuffed Buffalo Bone', 'Large Elky Jerky Stuffed Buffalo Bone', 'Large Venison and Sweet Potato Stuffed Buffalo Bone']
    },
    'Ears': {
        'Natural/Flavored Cow Ears': ['Natural Cow Ears (Bulk)', 'Vanilla Cow Ears (Bulk)', 'Honey Smoked Cow Ears (Bulk)'],
        'Hairy Beef Ears': ['Hairy Beef Ears (Bulk)'],
        'Buffalo Ears': ['MAGNA Buffalo Ears (Bulk)', 'Honey Smoked MAGNA Buffalo Ears (Bulk)'],
        'Pig Ears': ['Polish Pig Ears (Bulk)'],
        'Lamb Ears': ['White Lamb Ears (Bulk)', 'Vanilla Lamb Ears (Bulk)'],
        'Fuzzy Rabbit Ears': ['Fuzzy Rabbit Ears (Bulk)', '10-Pack Fuzzy Rabbit Ears', '10-Pack of Fuzzy Rabbit Ears'],
    },
    'Cow Cheeks': {
        'All Natural Rollio': ['5-6” Natural Rollio (Bulk)', '10-12” Natural Rollio (Bulk)'],
        'Natural/Flavored Rollios': ['5-6” Regular Rollio (Bulk)', '10-12” Regular Rollio (Bulk)', '5-6” Vanilla Rollio (Bulk)', '10-12” Vanilla Rollio (Bulk)', '5-6” Honey Smoked Rollio (Bulk)', '10-12” Honey Smoked Rollio (Bulk)'],
        'PHAT Rollios': ['5-6” PHAT Rollio (Bulk)', '10-12” PHAT Rollio (Bulk)', '5-6” Vanilla PHAT Rollio (Bulk)', '10-12” Vanilla PHAT Rollio (Bulk)', '5-6” Honey Smoked PHAT Rollio (Bulk)', '10-12” Honey Smoked PHAT Rollio (Bulk)'],
        'Peanut Butter Rollios': ['5-6” Peanut Butter Rollio (Bulk)', '10-12” Peanut Butter Rollio (Bulk)'],
        'Cow Cheek Slabs': ['5-6” Cow Cheek Slab (Bulk per lb.)', '5-6” Vanilla Cow Cheek Slab (Bulk per lb.)', '10-12” Cow Cheek Slab (Bulk per lb.)', '10-12” Vanilla Cow Cheek Slab (Bulk per lb.)', '10-12” Natural Cow Cheek Slabs (Bulk per lb.)'],
        'Chunky Cheeks': ['White Chunky Cheeks (Bulk)', 'Vanilla Chunky Cheeks (Bulk)', '8oz. Bags of White Chunky Cheeks', '8oz. Bags of Vanilla Chunky Cheeks', '16oz. Bags of White Chunky Cheeks', '16oz. Bags of Vanilla Chunky Cheeks']
    },
    'Ox Tails': {
        'MAGNA Ox Tails': ['6” MAGNA Natural Ox Tails (Bulk)', '12” MAGNA Natural Ox Tails (Bulk)'],
        'Ox Tails': ['6” White Ox Tails (Bulk)', '12” White Ox Tails (Bulk)', '6” Vanilla Ox Tails (Bulk)', '12” Vanilla Ox Tails (Bulk)', '6” Honey Smoked Ox Tails (Bulk)', '12” Honey Smoked Ox Tails (Bulk)']
    },
    'Rabbit': {
        'Fuzzy Rabbit Ears': ['Fuzzy Rabbit Ears (Bulk)', 'Fuzzy Bunny Ears (Bulk)', '10-Pack Fuzzy Rabbit Ears', '10-Pack of Fuzzy Rabbit Ears', '10-Pack of Fuzzy Bunny Ears'],
        'Fuzzy Rabbit Feet': ['Fuzzy Rabbit Feet (Bulk)', '10-Pack Fuzzy Rabbit Feet', '10-Pack of Fuzzy Rabbit Feet']
    },
    'Duck and Goose': {
        'Duck Neck': ['Crunchy Baked Duck Necks (Bulk)', '10-Pack of Crunchy Duck Necks'],
        'Duck Heads': ['Crunchy Baked Duck Heads (Bulk)', '5-Pack of Crunchy Duck Heads', '10-Pack of Duck Heads', '10-Pack of Crunch Duck Heads'],
        'Duck Feet': ['Euro Duck Feet (Bulk)', 'Euro Duck Feet (Display)', '10-Pack Euro Duck Feet', '10-Pack of Euro Duck Feet'],
        'Goose Neck': ['Goose Neck (Bulk)', '10-Pack of Crunchy Goose Necks'],
    },
    'Beef': {
        'Beef Jerky Treats': ['USA Beef Jerky Treats (Bulk)'],
        'Hairy Beef Ears': ['Hairy Beef Ears (Bulk)'],
        'Super Meaty Beef Tendons': ['Super Meaty Beef Tendons (Bulk)'],
        'Paddywacks (Neck Tendons)': ['6” Paddywack (Bulk)', '12” Paddywack (Bulk)'],
        'Corium Sticks (Collagen)': ['6” Corium Sticks (Bulk)', '12” Corium Sticks (Bulk)', '6” Beef Wrapped Corium Sticks (Bulk)', '12” Beef Wrapped Corium Sticks (Bulk)'],
        'Beef Lung': ['8oz. Bag of Beef Lung', '16oz. Bag of Beef Lung'],
        'Trachea and Trachea Pieces': ['5-6” Beef Trachea', '10-13” Beef Trachea', '8oz. Bags of Beef Trachea Pieces', '16oz. Bags of Beef Trachea Pieces'],
        'Packaged': ['8oz. Bags of Beef Trachea Pieces', '16oz. Bags of Beef Trachea Pieces', '8oz. Bag of Beef Lung', '16oz. Bag of Beef Lung', '5-Pack Hairy Beef Ears']
    },
    'Buffalo': {
        'Buffalo Ears': ['MAGNA Buffalo Ears (Bulk)', 'Honey Smoked MAGNA Buffalo Ears (Bulk)'],
        'Buffalo Bone and Knuckle': ['Reg Large Meaty Buffalo Bone', 'Small Meaty Buffalo Knuckle'],
        'Stuffed Buffalo Bones': ['Large Turkey Jerky Stuffed Buffalo Bone', 'Large Elky Jerky Stuffed Buffalo Bone', 'Large Venison and Sweet Potato Stuffed Buffalo Bone', 'Large Peanut Butter Stuffed Buffalo Bone'],
        'Buffalo Horns': ['Large Buffalo Horn (Bulk)', 'Medium Buffalo Horn (Bulk)', 'Small Buffalo Horn (Bulk)'],
        'Buffalo Collagen': ['6” Buffalo Collagen Sticks']
    },
    'Deer (Venison)': {
        'Deer (Venison)': ['USA Venison & Sweet Potato Jerky Treats (Bulk)', 'USA Venison & Sweet Potato Jerky Treats (Display)', 'Large Venison and Sweet Potato Stuffed Buffalo Bone', 'Deer Skin Chips (Bulk)']
    },
    'Elk': {
        'Elk': ['USA Elky Jerky Treats (Bulk)', 'USA Elky Jerky Treats (Display)', '6oz. Bags of USA Elky Training Treats', '8oz. Bags of USA Elky Training Treats', '10oz. Bags of USA Elky Training Treats', '12oz. Bags of USA Elky Training Treats']
    },
    'Chicken and Turkey': {
        'Chicken': ['Crunchy Euro Chicken Feet (Bulk)', 'Euro White Chicken Feet (Bulk)', 'Vanilla Flavored White Euro Chicken Feet (Bulk)', '10-Pack Euro Chicken Feet', '10-Pack of Euro Chicken Feet', '10-Pack White Euro Chicken Feet', '10-Pack of White Euro Chicken Feet', '10-Pack Vanilla Euro Chicken Feet', '10-Pack of Vanilla Euro Chicken Feet', 'USA Chicken Jerky Treats (Bulk)', 'USA Chicken Jerky Treats (Display)'],
        'Turkey': ['USA Turkey Jerky Treats (Bulk)', 'USA Turkey Jerky Treats (Display)', 'Large Turkey Jerky Stuffed Buffalo Bone']
    },
    'Feet': {
        'Chicken Feet': ['Crunchy Euro Chicken Feet (Bulk)', 'Euro White Chicken Feet (Bulk)', 'Vanilla Flavored White Euro Chicken Feet (Bulk)', '10-Pack Euro Chicken Feet', '10-Pack of Euro Chicken Feet', '10-Pack White Euro Chicken Feet', '10-Pack of White Euro Chicken Feet', '10-Pack Vanilla Euro Chicken Feet', '10-Pack of Vanilla Euro Chicken Feet'],
        'Duck Feet': ['Euro Duck Feet (Bulk)', 'Euro Duck Feet (Display)', '10-Pack Euro Duck Feet', '10-Pack of Euro Duck Feet'],
        'Fuzzy Rabbit Feet': ['Fuzzy Rabbit Feet (Bulk)', '10-Pack Fuzzy Rabbit Feet', '10-Pack of Fuzzy Rabbit Feet'],
    },
    'Horns': {
        'Rams Horn': ['Large Rams Horn (Bulk)', 'Medium Rams Horn (Bulk)', 'Small Rams Horn (Bulk)'],
        'Buffalo Horn': ['Large Buffalo Horn (Bulk)', 'Medium Buffalo Horn (Bulk)', 'Small Buffalo Horn (Bulk)']
    },
    'Hooves': {
        'Hooves': ['Regular Cow Hooves (Bulk)', 'Smoked Cow Hooves (Bulk)', '“Super” Cow Hooves (Bulk)']
    },
    'Braided': {
        'Braided Bully Sticks': ['6” Braided Bully Sticks (Bulk)', '12” Braided Bully Sticks (Bulk)', '6” “Super” Braided Bully Sticks (Bulk)', '12” “Super” Braided Bully Sticks (Bulk)'],
        'Braided Esophagus': ['6” Braided Esophagus (Bulk)', '12” Braided Esophagus (Bulk)', '6” Braided Esophagus (Display)', '12” Braided Esophagus (Display)'],
        'Supreme USA Hide Braided Donuts': ['5-7” Braided USA Hide Donuts (Bulk)', '5-7” Vanilla USA Hide Braided Donuts (Bulk)', '8-9” Braided USA Hide Donuts (Bulk)', '8-9” Vanilla USA Hide Braided Donuts (Bulk)', '10-11” Braided USA Hide Donuts (Bulk)', '10-11” Vanilla USA Hide Braided Donuts (Bulk)']
    },
    'Large Meaty Femur/Bone/Knuckles': {
        'Large Buffalo Bone': ['Reg Large Meaty Buffalo Bone'],
        'Buffalo Knuckle': ['Small Meaty Buffalo Knuckle'],
        'Stuffed Buffalo Bone': ['Large Turkey Jerky Stuffed Buffalo Bone', 'Large Elky Jerky Stuffed Buffalo Bone', 'Large Venison and Sweet Potato Stuffed Buffalo Bone', 'Large Peanut Butter Stuffed Buffalo Bone'],
        'Jumbo Meaty Femur': ['14-16” Jumbo Meaty Femur Knuckle Bone']
    },
    'Pressed Bones': {
        'Supreme Pressed Ring': ['6” Supreme Pressed Ring (Bulk)'],
        'Supreme Pressed Stick': ['10” x 20mm Supreme Pressed Stick (Bulk)'],
        'Supreme Pressed Bones': ['4.5” Pressed Bone (Bulk)', '6.5” Pressed Bone (Bulk)', '8.5” Pressed Bone (Bulk)', '10.5” Pressed Bone (Bulk)', '12.5” Pressed Bone (Bulk)']
    },
    'Twisty Q’s and Natural Munchy Sticks': {
        'Munch Sticks': ['12” x 20mm Natural Munchy Sticks (Bulk)', '5” x 10mm Natural Munchy Sticks (Bulk)', '6.5” Bacon Munchy Sticks (Bulk)'],
        'Twisty Q’s': ['10” White Twisty Q’s (Bulk)', '10” Vanilla Twisty Q’s (Bulk)'],
        "Twisty's": ['5” x 4/6mm White Twisty-100/inner (Bulk)', '5” x 9/10mm White Twisty-50/inner (Bulk)', '10” x 9/10mm White Twisty (Bulk)']
    },
    'Supreme Hide Chips': {
        'Supreme USA Hide Chips': ['White USA Supreme Hide Chips (Bulk per lb.)', 'Vanilla USA Supreme Chips (Bulk per lb.)', 'Peanut Butter Basted USA Supreme Hide Chips (Bulk per lb.)', "8oz. Bags of White Supreme Chips (Binkey's)"],
        "Binky's": ["8oz. Bags of Peanut Butter Supreme Chips (Binkey's)", "8oz. Bags of Vanilla Supreme Chips (Binkey's)", "16oz. Bags of White Supreme Chips (Binkey's)", "16oz. Bags of Peanut Butter Supreme Chips (Binkey's)", "16oz. Bags of Vanilla Supreme Chips (Binkey's)"]
    },
    'Retrievers': {
        'USA White Hide Retriever': ['6/9” White Supreme Retriever (Bulk)', '10-11” x 30mm White Supreme Retriever (Bulk)'],
        'Vanilla Flavored Retriever': ['6/9” Vanilla Supreme Retriever (Bulk)', '10-11” x 30mm Vanilla MAGNA Retriever (Bulk)']
    },
    'Packaged Items': {
        'Duck and Goose': ['5-Pack of Crunchy Duck Heads', '5-Pack of Duck Heads', '10-Pack of Crunchy Duck Necks', '10-Pack of Crunchy Goose Necks', '10-Pack Euro Duck Feet', '10-Pack of Euro Duck Feet', '10-Pack of Duck Heads'],
        'Ears': ['6-Pack Natural Cow Ears', '6-Pack, Natural Cow Ears', '6-Pack Vanilla Cow Ears', '6-Pack, Vanilla Cow Ears', '6-Pack Honey Smoked Cow Ears', '6-Pack, Honey Smoked Cow Ears', '10-Pack of Fuzzy Bunny Ears', '10-Pack Fuzzy Rabbit Ears', '5-Pack Hairy Beef Ears'],
        'Feet': ['10-Pack Fuzzy Rabbit Feet', '10-Pack of Fuzzy Rabbit Feet', '10-Pack of Fuzzy Bunny Feet', '10-Pack Euro Chicken Feet', '10-Pack of Euro Chicken Feet', '10-Pack White Euro Chicken Feet', '10-Pack of White Euro Chicken Feet', '10-Pack Vanilla Euro Chicken Feet', '10-Pack of Vanilla Euro Chicken Feet'],
        'Chunky Cheeks': ['8oz. Bags of White Chunky Cheeks', '8oz. Bags of Vanilla Chunky Cheeks', '16oz. Bags of White Chunky Cheeks', '16oz. Bags of Vanilla Chunky Cheeks'],
        'Beef Lung': ['8oz. Bag of Beef Lung', '16oz. Bag of Beef Lung'],
        'Bully Pieces': ['8oz. Bag of Bully Pieces', '10oz. Bag of Bully Pieces', '16oz. Bag of Bully Pieces'],
        'Jerky': ['6oz. Bags of USA Elky Training Treats', '8oz. Bags of USA Elky Training Treats', '10oz. Bags of USA Elky Training Treats', '12oz. Bags of USA Elky Training Treats'],
        'Trachea Pieces': ['8oz. Bags of Beef Trachea Pieces', '16oz. Bags of Beef Trachea Pieces'],
        "Binky's": ["8oz. Bags of White Supreme Chips (Binkey's)", "8oz. Bags of Peanut Butter Supreme Chips (Binkey's)", "8oz. Bags of Vanilla Supreme Chips (Binkey's)", "16oz. Bags of White Supreme Chips (Binkey's)", "16oz. Bags of Peanut Butter Supreme Chips (Binkey's)", "16oz. Bags of Vanilla Supreme Chips (Binkey's)"]
    }
};

const PHOTO_PACKAGED_ITEMS = {
    'Duck and Goose': [
        '5-Pack of Crunchy Duck Heads',
        '10-Pack of Crunchy Duck Necks',
        '10-Pack of Crunchy Goose Necks',
        '10-Pack Euro Duck Feet',
        '10-Pack of Duck Heads'
    ],
    'Ears': [
        '6-Pack Natural Cow Ears',
        '6-Pack Vanilla Cow Ears',
        '6-Pack Honey Smoked Cow Ears',
        '10-Pack Fuzzy Rabbit Ears',
        '5-Pack Hairy Beef Ears'
    ],
    'Feet': [
        '10-Pack Fuzzy Rabbit Feet',
        '10-Pack Euro Chicken Feet',
        '10-Pack White Euro Chicken Feet',
        '10-Pack Vanilla Euro Chicken Feet'
    ],
    'Chunky Cheeks': [
        '8oz. Bags of White Chunky Cheeks',
        '8oz. Bags of Vanilla Chunky Cheeks',
        '16oz. Bags of White Chunky Cheeks',
        '16oz. Bags of Vanilla Chunky Cheeks'
    ],
    'Beef Lung': [
        '8oz. Bag of Beef Lung',
        '16oz. Bag of Beef Lung'
    ],
    'Bully Pieces': [
        '8oz. Bag of Bully Pieces',
        '10oz. Bag of Bully Pieces',
        '16oz. Bag of Bully Pieces'
    ],
    'Jerky': [
        '6oz. Bags of USA Elky Training Treats',
        '8oz. Bags of USA Elky Training Treats',
        '10oz. Bags of USA Elky Training Treats',
        '12oz. Bags of USA Elky Training Treats'
    ],
    'Trachea Pieces': [
        '8oz. Bags of Beef Trachea Pieces',
        '16oz. Bags of Beef Trachea Pieces'
    ],
    "Binky's": [
        "8oz. Bags of White Supreme Chips (Binkey's)",
        "8oz. Bags of Peanut Butter Supreme Chips (Binkey's)",
        "8oz. Bags of Vanilla Supreme Chips (Binkey's)",
        "16oz. Bags of White Supreme Chips (Binkey's)",
        "16oz. Bags of Peanut Butter Supreme Chips (Binkey's)",
        "16oz. Bags of Vanilla Supreme Chips (Binkey's)"
    ]
};

function packagedSubForName(name) {
    const needle = photoNameKey(name);
    if (!needle) return '';
    const keys = Object.keys(PHOTO_PACKAGED_ITEMS);
    for (let i = 0; i < keys.length; i++) {
        const names = PHOTO_PACKAGED_ITEMS[keys[i]];
        for (let n = 0; n < names.length; n++) {
            if (photoNameKey(names[n]) === needle) return keys[i];
        }
    }
    return '';
}

function getPhotoFamilies() {
    const oldFamilies = (typeof PHOTO_FAMILIES !== 'undefined' && Array.isArray(PHOTO_FAMILIES))
        ? PHOTO_FAMILIES
        : [];
    const list = [];
    const categories = Object.keys(PHOTO_GALLERY_TREE);
    categories.forEach(function (category) {
        const subs = PHOTO_GALLERY_TREE[category] || {};
        Object.keys(subs).forEach(function (sub) {
            if ((category === 'Ears' && sub === 'Packaged Ears') ||
                (category === 'Feet' && sub === 'Packaged Feet') ||
                (category === 'Duck and Goose' && sub === 'Packaged Duck and Goose')) {
                return;
            }
            const rawNames = subs[sub] || [];
            const names = [];
            const seen = {};
            rawNames.forEach(function (n) {
                const k = photoNameKey(n);
                if (!k || seen[k]) return;
                seen[k] = true;
                names.push(n);
            });
            if (!names.length) return;
            const nameSet = {};
            names.forEach(function (n) { nameSet[photoNameKey(n)] = true; });
            const matches = oldFamilies.filter(function (old) {
                return (old.names || []).some(function (n) { return nameSet[photoNameKey(n)]; });
            });
            const aliasKeys = matches.map(function (old) { return old.key; });
            names.forEach(function (n) {
                const leftover = photoFamilySlug(n);
                if (leftover && aliasKeys.indexOf(leftover) === -1) aliasKeys.push(leftover);
            });
            const key = photoFamilySlug(category + '-' + sub) || ('fam-' + list.length);
            if (aliasKeys.indexOf(key) === -1) aliasKeys.unshift(key);
            matches.forEach(function (old) {
                if (aliasKeys.indexOf(old.key) === -1) aliasKeys.push(old.key);
            });
            list.push({
                key: key,
                title: sub,
                category: category,
                names: names,
                aliasKeys: aliasKeys,
                kind: /packaged/i.test(category + ' ' + sub) ? 'packaged' : undefined
            });
        });
    });
    return list;
}

function getPhotoFamilyByKey(key) {
    return getPhotoFamilies().find(function (f) {
        if (f.key === key) return true;
        return (f.aliasKeys || []).indexOf(key) !== -1;
    }) || null;
}

function isRealPhotoPath(path) {
    const p = String(path || '');
    if (!p) return false;
    if (p === 'COMING_SOON' || p.indexOf('COMING_SOON/') === 0) return false;
    return /\.(jpe?g|png|webp|gif)$/i.test(p);
}

function photoPublicUrl(path) {
    if (!isRealPhotoPath(path)) return '';
    try {
        const pub = supabaseClient.storage.from(PHOTO_BUCKET).getPublicUrl(path);
        return (pub && pub.data && pub.data.publicUrl) || '';
    } catch (err) {
        return '';
    }
}

function isPackagedPhotoFamily(family) {
    if (!family) return false;
    if (family.kind === 'packaged' || family.linkedFamilyKey) return true;
    const blob = ((family.title || '') + ' ' + (family.names || []).join(' ')).toLowerCase();
    return /\b(6-pack|10-pack|8oz|10oz|16oz|bag|bags|display)\b/.test(blob) && !/\(bulk\)/.test(blob);
}

async function loadProductImages() {
    const { data, error } = await supabaseClient
        .from('product_images')
        .select('id, family_key, linked_family_key, scope, variant_name, is_card_hero, sort_order, storage_path, created_at')
        .order('sort_order', { ascending: true });
    if (error) throw error;
    _photoGalleryImages = data || [];
}

function photosForFamily(familyKey) {
    const family = getPhotoFamilyByKey(familyKey);
    const keys = {};
    keys[String(familyKey || '')] = true;
    if (family) {
        keys[String(family.key || '')] = true;
        (family.aliasKeys || []).forEach(function (k) {
            keys[String(k || '')] = true;
        });
    }
    const nameSet = {};
    if (family) {
        (family.names || []).forEach(function (n) {
            nameSet[photoNameKey(n)] = true;
        });
    }
    return (_photoGalleryImages || []).filter(function (row) {
        if (keys[String(row.family_key || '')]) return true;
        return !!(nameSet[photoNameKey(row.variant_name)]);
    });
}

function photoNameKey(value) {
    return String(value || '').toLowerCase().replace(/,/g, '').replace(/\s+/g, ' ').trim();
}

function isComingSoonPath(path) {
    const p = String(path || '');
    return p === 'COMING_SOON' || p.indexOf('COMING_SOON/') === 0;
}

function comingSoonStoragePath(familyKey, productName) {
    const slug = photoNameKey(productName).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
    return 'COMING_SOON/' + String(familyKey || 'item') + '/' + (slug || 'item');
}

function visiblePhotosForFamily(familyKey) {
    return photosForFamily(familyKey).filter(function (row) {
        return row.scope !== 'coming_soon' && !isComingSoonPath(row.storage_path);
    });
}

function productHasComingSoon(familyKey, productName) {
    const needle = photoNameKey(productName);
    if (!needle) return false;
    return (_photoGalleryImages || []).some(function (row) {
        return (row.scope === 'coming_soon' || isComingSoonPath(row.storage_path)) &&
            photoNameKey(row.variant_name) === needle;
    });
}

async function setAllPackagedComingSoon(enabled) {
    const families = getPhotoFamilies().filter(function (f) {
        return f.category === 'Packaged Items' || isPackagedPhotoFamily(f);
    });
    if (!families.length) {
        alert('No packaged items found.');
        return;
    }
    if (enabled && !confirm('Mark every packaged item as Photograph Coming Soon?')) return;
    if (!enabled && !confirm('Clear Photograph Coming Soon on every packaged item?')) return;
    try {
        for (let i = 0; i < families.length; i++) {
            const family = families[i];
            const names = family.names || [];
            for (let n = 0; n < names.length; n++) {
                const already = productHasComingSoon(family.key, names[n]);
                if (enabled && already) continue;
                if (!enabled && !already) continue;
                if (enabled) {
                    const { error } = await supabaseClient.from('product_images').insert({
                        family_key: family.key,
                        scope: 'variant',
                        variant_name: names[n],
                        storage_path: comingSoonStoragePath(family.key, names[n]),
                        is_card_hero: false,
                        sort_order: 999
                    });
                    if (error) throw error;
                } else {
                    const flags = photosForFamily(family.key).filter(function (row) {
                        return (row.scope === 'coming_soon' || isComingSoonPath(row.storage_path)) &&
                            photoNameKey(row.variant_name) === photoNameKey(names[n]);
                    });
                    for (let f = 0; f < flags.length; f++) {
                        const { error } = await supabaseClient.from('product_images').delete().eq('id', flags[f].id);
                        if (error) throw error;
                    }
                }
            }
        }
        await loadProductImages();
        renderProductPhotoGallery();
    } catch (err) {
        console.error(err);
        alert('Could not update packaged coming soon.\n' + (err.message || err));
        try {
            await loadProductImages();
            renderProductPhotoGallery();
        } catch (e) {}
    }
}


async function toggleProductComingSoon(familyKey, productName, enabled) {
    const key = familyKey || _photoGalleryFamilyKey;
    const name = String(productName || '').trim();
    if (!key || !name) return;
    try {
        if (enabled) {
            if (!productHasComingSoon(key, name)) {
                const { error } = await supabaseClient.from('product_images').insert({
                    family_key: key,
                    scope: 'variant',
                    variant_name: name,
                    storage_path: comingSoonStoragePath(key, name),
                    is_card_hero: false,
                    sort_order: 999
                });
                if (error) throw error;
            }
        } else {
            const flags = (_photoGalleryImages || []).filter(function (row) {
                return (row.scope === 'coming_soon' || isComingSoonPath(row.storage_path)) &&
                    photoNameKey(row.variant_name) === photoNameKey(name);
            });
            for (let i = 0; i < flags.length; i++) {
                const { error } = await supabaseClient.from('product_images').delete().eq('id', flags[i].id);
                if (error) throw error;
            }
        }
        await loadProductImages();
        renderProductPhotoGallery();
    } catch (err) {
        console.error(err);
        alert('Could not update coming-soon flag.\n' + (err.message || err));
    }
}

function heroForFamily(familyKey) {
    const rows = visiblePhotosForFamily(familyKey);
    return rows.find(function (r) {
        return r.is_card_hero && isRealPhotoPath(r.storage_path);
    }) || rows.find(function (r) {
        return isRealPhotoPath(r.storage_path);
    }) || null;
}

async function openProductPhotoGallery() {
    const modal = document.getElementById('product-photo-gallery-modal');
    if (!modal) {
        alert('Photo gallery modal is missing. Paste the HTML from step 2 first.');
        return;
    }
    _photoGalleryFamilyKey = null;
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    const sub = document.getElementById('photo-gallery-subtitle');
    if (sub) sub.textContent = 'Loading…';
    try {
        await loadProductImages();
        renderProductPhotoGallery();
    } catch (err) {
        console.error(err);
        if (sub) sub.textContent = 'Could not load photos. ' + (err.message || '');
    }
}

function hideProductPhotoGallery() {
    const modal = document.getElementById('product-photo-gallery-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.style.display = 'none';
    _photoGalleryFamilyKey = null;
}

function photoGalleryBackToGrid() {
    if (_photoGalleryFamilyKey) {
        _photoGalleryFamilyKey = null;
    } else {
        _photoGalleryCategory = null;
    }
    renderProductPhotoGallery();
}

function openPhotoGalleryCategory(category) {
    _photoGalleryCategory = category;
    _photoGalleryFamilyKey = null;
    renderProductPhotoGallery();
}

function onPhotoGalleryScopeChange() {
    const scopeEl = document.getElementById('photo-gallery-scope');
    const wrap = document.getElementById('photo-gallery-variant-wrap');
    if (!wrap) return;
    wrap.classList.toggle('hidden', !(scopeEl && scopeEl.value === 'product'));
}

function renderProductPhotoGallery() {
    const grid = document.getElementById('photo-gallery-grid');
    const familyView = document.getElementById('photo-gallery-family-view');
    const backBtn = document.getElementById('photo-gallery-back');
    const searchWrap = document.getElementById('photo-gallery-search-wrap');
    const sub = document.getElementById('photo-gallery-subtitle');
    if (!grid) return;

    if (_photoGalleryFamilyKey) {
        if (searchWrap) searchWrap.classList.add('hidden');
        grid.classList.add('hidden');
        if (familyView) familyView.classList.remove('hidden');
        if (backBtn) {
            backBtn.classList.remove('hidden');
            backBtn.textContent = '← ' + (_photoGalleryCategory || 'Subcategories');
        }
        renderProductPhotoFamilyView();
        return;
    }

    if (searchWrap) searchWrap.classList.remove('hidden');
    grid.classList.remove('hidden');
    if (familyView) familyView.classList.add('hidden');

    const q = String((document.getElementById('photo-gallery-search') || {}).value || '').toLowerCase().trim();
    const families = getPhotoFamilies();

    if (!_photoGalleryCategory) {
        if (backBtn) backBtn.classList.add('hidden');
        const cats = [];
        const seen = {};
        families.forEach(function (f) {
            const cat = String(f.category || 'Other');
            if (seen[cat]) return;
            seen[cat] = true;
            cats.push(cat);
        });
        const list = cats.filter(function (cat) {
            return !q || cat.toLowerCase().indexOf(q) !== -1;
        });
        if (sub) sub.textContent = 'Choose a category';
        grid.innerHTML = list.map(function (cat) {
            const count = families.filter(function (f) { return f.category === cat; }).length;
            const safe = String(cat).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            return (
                '<button type="button" onclick="openPhotoGalleryCategory(\'' + safe + '\')" ' +
                'class="text-left bg-[#f8f4eb] border-2 border-[#6B4423] rounded-xl p-4 hover:bg-[#f0e6d9]">' +
                '<p class="text-sm font-semibold brand-green">' + escapeHtml(cat) + '</p>' +
                '<p class="text-xs text-[#6B4423]">' + count + ' subcategor' + (count === 1 ? 'y' : 'ies') + '</p>' +
                '</button>'
            );
        }).join('') || '<p class="text-sm text-[#6B4423] col-span-full">No categories match that search.</p>';
        return;
    }

    if (backBtn) {
        backBtn.classList.remove('hidden');
        backBtn.textContent = '← All categories';
    }
    const subs = families.filter(function (f) {
        if (f.category !== _photoGalleryCategory) return false;
        if (f.category !== 'Packaged Items') {
            const title = String(f.title || '').toLowerCase();
            if (title === 'packaged ears' ||
                title === 'packaged feet' ||
                title === 'packaged duck and goose' ||
                title.indexOf('packaged') === 0) {
                return false;
            }
        }
        if (!q) return true;
        const hay = (f.title + ' ' + (f.names || []).join(' ')).toLowerCase();
        return hay.indexOf(q) !== -1;
    });
    if (sub) sub.textContent = _photoGalleryCategory + ' · choose a subcategory';
    const packagedBtns = (_photoGalleryCategory === 'Packaged Items')
        ? '<div class="col-span-full flex flex-wrap gap-2 mb-2">' +
            '<button type="button" onclick="setAllPackagedComingSoon(true)" class="px-3 py-2 text-sm bg-[#1E4D2B] text-[#d4b78f] font-semibold rounded-xl">Mark all packaged coming soon</button>' +
            '<button type="button" onclick="setAllPackagedComingSoon(false)" class="px-3 py-2 text-sm border-2 border-[#6B4423] rounded-xl hover:bg-[#f8f4eb]">Clear packaged coming soon</button>' +
          '</div>'
        : '';
    grid.innerHTML = packagedBtns + subs.map(function (f) {
        const hero = heroForFamily(f.key);
        const thumb = hero ? photoPublicUrl(hero.storage_path) : '';
        const safeKey = String(f.key).replace(/'/g, '');
        return (
            '<button type="button" onclick="openPhotoFamily(\'' + safeKey + '\')" ' +
            'class="text-left bg-[#f8f4eb] border-2 border-[#6B4423] rounded-xl overflow-hidden hover:bg-[#f0e6d9]">' +
            (thumb
                ? '<img src="' + escapeHtml(thumb) + '" alt="" loading="lazy" decoding="async" class="w-full h-28 object-contain bg-white">'
                : '<div class="w-full h-28 bg-white flex items-center justify-center text-xs text-[#6B4423]">No photo yet</div>') +
            '<div class="p-2">' +
            '<p class="text-sm font-semibold brand-green">' + escapeHtml(f.title) + '</p>' +
            '<p class="text-xs text-[#6B4423]">' + (f.names || []).length + ' item' + ((f.names || []).length === 1 ? '' : 's') + '</p>' +
            '</div></button>'
        );
    }).join('') || '<p class="text-sm text-[#6B4423] col-span-full">No subcategories in this category.</p>';
}

function openPhotoFamily(key) {
    _photoGalleryFamilyKey = key;
    renderProductPhotoGallery();
}

function renderProductPhotoFamilyView() {
    const family = getPhotoFamilyByKey(_photoGalleryFamilyKey);
    const meta = document.getElementById('photo-gallery-family-meta');
    const photosEl = document.getElementById('photo-gallery-family-photos');
    const scopeEl = document.getElementById('photo-gallery-scope');
    const variantEl = document.getElementById('photo-gallery-variant');
    const sub = document.getElementById('photo-gallery-subtitle');
    if (!family || !photosEl) return;

    if (sub) sub.textContent = family.title;

    const rows = visiblePhotosForFamily(family.key);
    const uniqueNames = [];
    const seenNames = {};
    (family.names || []).forEach(function (n) {
        const k = photoNameKey(n);
        if (!k || seenNames[k]) return;
        seenNames[k] = true;
        uniqueNames.push(n);
    });
    if (meta) {
        const safeKey = String(family.key).replace(/'/g, '');
        meta.innerHTML =
            '<p class="mb-3">A photo set to Entire subcategory shows on every item here unless that item has its own photo.</p>' +
            '<div class="flex items-end justify-between gap-3 mb-2">' +
            '<p class="text-sm font-semibold text-[#6B4423]">Items in this subcategory</p>' +
            '<p class="text-xs font-semibold text-[#6B4423] w-28 text-center leading-tight">Mark as coming soon</p>' +
            '</div>' +
            '<div class="space-y-2">' +
            uniqueNames.map(function (n) {
                const coming = productHasComingSoon(family.key, n);
                const safeName = String(n).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                return '<label class="flex items-center justify-between gap-3 bg-white border-2 border-[#6B4423] rounded-xl px-3 py-2 cursor-pointer ' +
                    (coming ? 'opacity-70' : '') + '">' +
                    '<span class="' + (coming ? 'text-[#6B4423]' : 'text-[#1E4D2B]') + ' font-medium">' +
                    escapeHtml(n) +
                    (coming ? ' <span class="text-xs font-semibold">· Photograph coming soon</span>' : '') +
                    '</span>' +
                    '<span class="flex flex-col items-center w-28 shrink-0">' +
                    '<input type="checkbox" ' + (coming ? 'checked ' : '') +
                    'onchange="toggleProductComingSoon(\'' + safeKey + '\', \'' + safeName + '\', this.checked)">' +
                    '</span>' +
                    '</label>';
            }).join('') +
            '</div>';
    }

    if (scopeEl) {
        scopeEl.value = isPackagedPhotoFamily(family) ? 'packaged' : 'family';
        onPhotoGalleryScopeChange();
    }

    if (variantEl) {
        variantEl.innerHTML = (family.names || []).map(function (n) {
            return '<option value="' + escapeHtml(n) + '">' + escapeHtml(n) + '</option>';
        }).join('');
    }

    if (!rows.length) {
        photosEl.innerHTML = '<p class="text-sm text-[#6B4423]">No photos yet. Add the main product shot first.</p>';
        return;
    }

    photosEl.innerHTML = rows.map(function (row) {
        const url = photoPublicUrl(row.storage_path);
        const label = row.scope === 'variant'
            ? ('Flavor: ' + (row.variant_name || ''))
            : (row.scope === 'packaged' ? 'Packaged main' : 'Family / product');
        return (
            '<div class="border-2 border-[#6B4423] rounded-xl overflow-hidden bg-white">' +
            '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' +
            '<img src="' + escapeHtml(url) + '" alt="" loading="lazy" decoding="async" class="w-full h-40 object-contain bg-[#f8f4eb]">' +
            '</a>' +
            '<div class="p-3">' +
            '<p class="text-xs font-semibold text-[#6B4423] mb-2">' + escapeHtml(label) +
            (row.is_card_hero ? ' · Card photo' : '') + '</p>' +
            '<div class="flex flex-wrap gap-2">' +
            (row.is_card_hero
                ? ''
                : '<button type="button" onclick="setPhotoAsCardHero(\'' + row.id + '\')" class="px-3 py-1.5 text-xs border-2 border-[#6B4423] rounded-lg hover:bg-[#f8f4eb]">Use as card photo</button>') +
            '<button type="button" onclick="removeProductPhoto(\'' + row.id + '\', \'' + String(row.storage_path || '').replace(/'/g, '') + '\')" class="px-3 py-1.5 text-xs border-2 border-red-600 text-red-700 rounded-lg hover:bg-red-50">Remove</button>' +
            '</div></div></div>'
        );
    }).join('');
}

function photoGalleryFileAllowed(file) {
    return ['image/jpeg', 'image/png', 'image/webp'].indexOf(String((file && file.type) || '').toLowerCase()) !== -1;
}

function syncPhotoGalleryQueueLabel() {
    const fileEl = document.getElementById('photo-gallery-file');
    const label = document.getElementById('photo-gallery-file-label');
    if (fileEl) {
        try {
            const dt = new DataTransfer();
            _photoGalleryQueue.forEach(function (file) { dt.items.add(file); });
            fileEl.files = dt.files;
        } catch (err) {}
    }
    if (!label) return;
    if (!_photoGalleryQueue.length) {
        label.textContent = 'Drop photos here, or choose files';
    } else if (_photoGalleryQueue.length === 1) {
        label.textContent = _photoGalleryQueue[0].name;
    } else {
        label.textContent = _photoGalleryQueue.length + ' photos selected';
    }
}

function enqueuePhotoGalleryFiles(list) {
    Array.from(list || []).forEach(function (file) {
        if (!photoGalleryFileAllowed(file)) return;
        const exists = _photoGalleryQueue.some(function (queued) {
            return queued.name === file.name && queued.size === file.size && queued.lastModified === file.lastModified;
        });
        if (!exists) _photoGalleryQueue.push(file);
    });
    syncPhotoGalleryQueueLabel();
}

function onPhotoGalleryFilePicked() {
    const fileEl = document.getElementById('photo-gallery-file');
    enqueuePhotoGalleryFiles(fileEl && fileEl.files);
}

function onPhotoGalleryDrop(event) {
    event.preventDefault();
    const drop = document.getElementById('photo-gallery-drop');
    if (drop) drop.classList.remove('ring-2', 'ring-[#1E4D2B]');
    if (!event.dataTransfer || !event.dataTransfer.files || !event.dataTransfer.files.length) return;
    const incoming = Array.from(event.dataTransfer.files).filter(photoGalleryFileAllowed);
    if (!incoming.length) {
        alert('Use JPG, PNG, or WebP files.');
        return;
    }
    enqueuePhotoGalleryFiles(incoming);
}


async function addProductPhoto() {
    const family = getPhotoFamilyByKey(_photoGalleryFamilyKey);
    const fileEl = document.getElementById('photo-gallery-file');
    const scopeEl = document.getElementById('photo-gallery-scope');
    const variantEl = document.getElementById('photo-gallery-variant');
    const btn = document.getElementById('photo-gallery-add-btn');
    const files = fileEl && fileEl.files ? Array.from(fileEl.files) : [];
    if (!family || !files.length) {
        alert('Choose a photo first.');
        return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    for (let i = 0; i < files.length; i++) {
        const type = String(files[i].type || '').toLowerCase();
        if (allowed.indexOf(type) === -1) {
            alert(files[i].name + ' is not a JPG, PNG, or WebP.');
            return;
        }
        if (files[i].size > 5 * 1024 * 1024) {
            alert(files[i].name + ' is over 5 MB.');
            return;
        }
    }

    const applyAs = (scopeEl && scopeEl.value) || 'subcategory';
    const scope = applyAs === 'product'
        ? 'variant'
        : (isPackagedPhotoFamily(family) ? 'packaged' : 'family');
    const variantName = applyAs === 'product' ? String((variantEl && variantEl.value) || '') : null;
    if (applyAs === 'product' && !variantName) {
        alert('Pick the product this photo belongs to.');
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Uploading…';
    }

    try {
        const { data: sessionData } = await supabaseClient.auth.getSession();
        const uid = sessionData && sessionData.session && sessionData.session.user && sessionData.session.user.id;
        let existing = photosForFamily(family.key);
        let hasHero = existing.some(function (r) {
            return r.is_card_hero && r.storage_path !== 'COMING_SOON';
        });

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const type = String(file.type || '').toLowerCase();
            const ext = type === 'image/png' ? '.png' : (type === 'image/webp' ? '.webp' : '.jpg');
            const path = family.key + '/' + (window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + '-' + i) + ext;
            const makeHero = scope !== 'variant' && !hasHero;

            const { error: upErr } = await supabaseClient.storage
                .from(PHOTO_BUCKET)
                .upload(path, file, { upsert: false, contentType: file.type, cacheControl: '3600' });
            if (upErr) throw upErr;

            const { error: insErr } = await supabaseClient.from('product_images').insert({
                family_key: family.key,
                linked_family_key: family.linkedFamilyKey || null,
                scope: scope,
                variant_name: variantName,
                is_card_hero: makeHero,
                sort_order: existing.length + i,
                storage_path: path,
                created_by: uid || null
            });
            if (insErr) throw insErr;
            if (makeHero) hasHero = true;
        }

        _photoGalleryQueue = [];
        fileEl.value = '';
        if (typeof syncPhotoGalleryQueueLabel === 'function') syncPhotoGalleryQueueLabel();
        await loadProductImages();
        renderProductPhotoGallery();
    } catch (err) {
        console.error(err);
        alert('Could not add photo.\n' + (err.message || err));
        try {
            await loadProductImages();
            renderProductPhotoGallery();
        } catch (e) {}
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Add photo';
        }
    }
}

async function setPhotoAsCardHero(id) {
    if (!_photoGalleryFamilyKey) return;
    const row = (_photoGalleryImages || []).find(function (r) { return String(r.id) === String(id); });
    if (row && typeof isComingSoonPath === 'function' && isComingSoonPath(row.storage_path)) {
        alert('That is a coming-soon flag, not a photo.');
        return;
    }
    try {
        const family = getPhotoFamilyByKey(_photoGalleryFamilyKey);
        const keys = [_photoGalleryFamilyKey].concat((family && family.aliasKeys) || []);
        for (let i = 0; i < keys.length; i++) {
            const { error: clearErr } = await supabaseClient
                .from('product_images')
                .update({ is_card_hero: false })
                .eq('family_key', keys[i]);
            if (clearErr) throw clearErr;
        }
        const { error } = await supabaseClient
            .from('product_images')
            .update({ is_card_hero: true })
            .eq('id', id);
        if (error) throw error;
        await loadProductImages();
        renderProductPhotoGallery();
    } catch (err) {
        console.error(err);
        alert('Could not set card photo.\n' + (err.message || err));
    }
}

async function removeProductPhoto(id, path) {
    if (!confirm('Remove this photo?')) return;
    try {
        if (path) {
            await supabaseClient.storage.from(PHOTO_BUCKET).remove([path]);
        }
        const { error } = await supabaseClient.from('product_images').delete().eq('id', id);
        if (error) throw error;
        await loadProductImages();
        renderProductPhotoGallery();
    } catch (err) {
        console.error(err);
        alert('Could not remove photo.\n' + (err.message || err));
    }
}
// ================== END PRODUCT PHOTO GALLERY ==================

window.photoFamilySlug = photoFamilySlug;
window.packagedSubForName = packagedSubForName;
window.getPhotoFamilies = getPhotoFamilies;
window.getPhotoFamilyByKey = getPhotoFamilyByKey;
window.isRealPhotoPath = isRealPhotoPath;
window.photoPublicUrl = photoPublicUrl;
window.isPackagedPhotoFamily = isPackagedPhotoFamily;
window.loadProductImages = loadProductImages;
window.photosForFamily = photosForFamily;
window.photoNameKey = photoNameKey;
window.isComingSoonPath = isComingSoonPath;
window.comingSoonStoragePath = comingSoonStoragePath;
window.visiblePhotosForFamily = visiblePhotosForFamily;
window.productHasComingSoon = productHasComingSoon;
window.setAllPackagedComingSoon = setAllPackagedComingSoon;
window.toggleProductComingSoon = toggleProductComingSoon;
window.heroForFamily = heroForFamily;
window.openProductPhotoGallery = openProductPhotoGallery;
window.hideProductPhotoGallery = hideProductPhotoGallery;
window.photoGalleryBackToGrid = photoGalleryBackToGrid;
window.openPhotoGalleryCategory = openPhotoGalleryCategory;
window.onPhotoGalleryScopeChange = onPhotoGalleryScopeChange;
window.renderProductPhotoGallery = renderProductPhotoGallery;
window.openPhotoFamily = openPhotoFamily;
window.renderProductPhotoFamilyView = renderProductPhotoFamilyView;
window.photoGalleryFileAllowed = photoGalleryFileAllowed;
window.syncPhotoGalleryQueueLabel = syncPhotoGalleryQueueLabel;
window.enqueuePhotoGalleryFiles = enqueuePhotoGalleryFiles;
window.onPhotoGalleryFilePicked = onPhotoGalleryFilePicked;
window.onPhotoGalleryDrop = onPhotoGalleryDrop;
window.addProductPhoto = addProductPhoto;
window.setPhotoAsCardHero = setPhotoAsCardHero;
window.removeProductPhoto = removeProductPhoto;

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

async function loadProductCatalog() {
    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) {
            console.warn('loadProductCatalog: supabaseClient not ready — keeping hardcoded catalog');
            return;
        }

        const { data, error } = await supabaseClient
            .from('products')
            .select('id, name, category, sub_category, case_size, unit_price, is_market_price, active, updated_at')
            .order('category', { ascending: true })
            .order('name', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            console.warn('loadProductCatalog: no products in DB — keeping hardcoded catalog');
            return;
        }

        const mapped = data.map(row => ({
            id: row.id,
            name: row.name || '',
            category: row.category || 'Other',
            subCategory: row.sub_category || '',
            caseSize: row.case_size || '',
            unitPrice: row.unit_price != null ? Number(row.unit_price) : null,
            isMarketPrice: !!row.is_market_price,
            active: row.active !== false,
            marketPriceNote: null,
            landedCost: null,
            grossProfit: null,
            updatedAt: row.updated_at || null,
            priceAsOf: row.updated_at
                ? new Date(row.updated_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                : null
        }));

        PRODUCT_CATALOG_ALL = mapped;
        // Rest of the app only sees active products
        PRODUCT_CATALOG = mapped.filter(p => p.active !== false);

        console.log('loadProductCatalog: loaded', PRODUCT_CATALOG.length, 'active /', PRODUCT_CATALOG_ALL.length, 'total from Supabase');
    } catch (err) {
        console.error('loadProductCatalog error — keeping hardcoded catalog:', err);
    }
}

window.loadProductCatalog = loadProductCatalog;
