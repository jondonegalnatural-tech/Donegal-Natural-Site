// Wholesale portal — catalog, product cards, and browse.
let currentCategoryFilter = 'All';

let currentSubCategoryFilter = '';

let recommendedRotatorTimer = null;

let portalInventory = {};

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
        ],
        "Packaged": [
            "10 Pack, 12\" Braided Bully Sticks",
            "10 Pack, 6\" Braided Bully Sticks",
            "20 Pack, 12\" Regular Bully Sticks",
            "20 Pack, 12\" Thick Euro Bullies",
            "25 Pack, 6\" Regular Bully Sticks",
            "25 Pack, 6\" Thick Euro Bullies",
            "20 Pack, 12\" Thin Green Line Bully Sticks",
            "40 Pack, 6\" Thin Green Line Bully Sticks"            
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
            "USA Venison & Sweet Potato Jerky Treats (Display)",
            "50 Pack, Chicken Jerky Treats",
            "50 Pack, Elky Jerky Treats",
            "50 Pack, Turkey Jerky Treats"
        ],
        "Training Treats": [
            "6oz. Bags of USA Elky Training Treats",
            "8oz. Bags of USA Elky Training Treats",
            "10oz. Bags of USA Elky Training Treats",
            "12oz. Bags of USA Elky Training Treats"
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
        ],
        "Packaged": [
            "25 Pack, 12\" Cheek Slabs",
            "25 Pack, 12\" Vanilla Cheek Slabs"
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
        "Duck Feet": ["Euro Duck Feet (Bulk)", "Euro Duck Feet (Display)", "10-Pack Euro Duck Feet", "50 Pack, Euro Duck Feets"],
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
        "Beef Lung": [
            "8oz. Bag of Beef Lung",
            "16oz. Bag of Beef Lung",
            "8oz. Beef Lung Flips, Made in USA",
            "16oz. Beef Lung Flips, Made in USA"
        ],
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
            "8oz. Beef Lung Flips, Made in USA",
            "16oz. Beef Lung Flips, Made in USA",
            "5-Pack Hairy Beef Ears",
            "12\" Beef Trachea, bagged (15/bag)",
            "12\" Beef Trachea, bagged (30/bag)",
            "6\" Beef Trachea, bagged (25/bag)",
            "20 Pack, Collagen Sticks",
            "25 Pack, Collagen Sticks"
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
            "Deer Skin Chips (Bulk)",
            "Deer Skin Chips"
        ]
    },
    "Elk": {
        "": [
            "USA Elky Jerky Treats (Bulk)",
            "USA Elky Jerky Treats (Display)",
            "6oz. Bags of USA Elky Training Treats",
            "8oz. Bags of USA Elky Training Treats",
            "10oz. Bags of USA Elky Training Treats",
            "12oz. Bags of USA Elky Training Treats"
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
            "10-Pack Vanilla Euro Chicken Feet",
            "50 Pack, Sexy Chicken Feets"
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
        ],
        "Packaged": [
            "10 Pack, 6\" Pressed Rings",
            "10 Pack, 8\" Pressed Bone",
            "20 Pack, 6\" Pressed Bones",
            "5 Pack, 10\" Pressed Bones"
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
            "10” x 9/10mm White Twisty (Bulk)",
            "10\" x 9/10mm White Twisty",
            "5\" x 4/6mm White Twisty (100/inner)",
            "5\" x 9/10mm White Twisty (50/inner)"
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
        "Beef Lung": [
            "8oz. Bag of Beef Lung",
            "16oz. Bag of Beef Lung",
            "8oz. Beef Lung Flips, Made in USA",
            "16oz. Beef Lung Flips, Made in USA"
        ],
        "Bully Pieces": [
            "8oz. Bag of Bully Pieces",
            "10oz. Bag of Bully Pieces",
            "16oz. Bag of Bully Pieces"
        ],
        "Jerky": [
            "6oz. Bags of USA Elky Training Treats",
            "8oz. Bags of USA Elky Training Treats",
            "10oz. Bags of USA Elky Training Treats",
            "12oz. Bags of USA Elky Training Treats"
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
    "8oz. Bags of USA Elky Training Treats": {
        bullets: [
            "Small, soft training treats made with real elk",
            "Perfect for frequent rewarding and positive reinforcement",
            "Easy to break into tiny pieces",
            "High protein and low fat"
        ]
    },
    "12oz. Bags of USA Elky Training Treats": {
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

function getSidebarCategories() {
    if (typeof isBrianAssignedCustomer === 'function' && isBrianAssignedCustomer(window._currentCustomer)) {
        const brianOrder = [
            'Bully Sticks',
            'Jerky',
            'Ears',
            'Cow Cheeks',
            'Ox Tails',
            'Rabbit',
            'Duck and Goose',
            'Beef',
            'Lamb',
            'Buffalo',
            'Chicken',
            'Braided',
            'Pressed Bones',
            'Retrievers',
            "Twisty Q's and Natural Munchy Sticks",
            "Binkey's"
        ];
        const present = {};
        (WHOLESALE_PRICES || []).forEach(function (p) {
            if (p && p.category) present[p.category] = true;
        });
        return brianOrder.filter(function (cat) { return present[cat]; });
    }
    const fromTree = Object.keys(WHOLESALE_BROWSE_TREE || {});
    const ordered = MAIN_CATEGORIES.filter(c => c !== 'All' && fromTree.indexOf(c) !== -1);
    const extra = fromTree.filter(c => MAIN_CATEGORIES.indexOf(c) === -1);
    return ordered.concat(extra);
}

function getSubcategoriesFor(category) {
    if (typeof isBrianAssignedCustomer === 'function' && isBrianAssignedCustomer(window._currentCustomer)) return [];
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
    markWholesaleNewSeenForFolder(category, '');
    renderCategoryFilters();
    renderPortalProducts();
}

function selectWholesaleSubcategory(category, subcategory) {
    currentCategoryFilter = category;
    currentSubCategoryFilter = subcategory || '';
    clearWholesaleSearch();
    markWholesaleNewSeenForFolder(category, currentSubCategoryFilter);
    renderCategoryFilters();
    renderPortalProducts();
}

function renderCategoryFilters() {
    const sidebar = document.getElementById('sidebar-categories');
    const mobile = document.getElementById('mobile-category-filters');
    const cats = getSidebarCategories();
    const items = [{ label: 'All Categories', value: 'All' }].concat(
        cats.map(c => ({ label: c, value: c }))
    );

    function fill(container, useChip) {
        if (!container) return;
        container.innerHTML = '';

        if (useChip && currentCategoryFilter !== 'All') {
            const back = document.createElement('button');
            back.type = 'button';
            back.className = 'mobile-cat-chip';
            back.onclick = () => selectWholesaleCategory('All');
            container.appendChild(back);

            const catBtn = document.createElement('button');
            catBtn.type = 'button';
            catBtn.className = 'mobile-cat-chip';
            if (!currentSubCategoryFilter) catBtn.classList.add('active');
            catBtn.textContent = currentCategoryFilter;
            if (categoryHasNewItems(currentCategoryFilter)) {
                catBtn.appendChild(makeWholesaleNewItemsBadge());
            }
            catBtn.onclick = () => selectWholesaleCategory(currentCategoryFilter);
            container.appendChild(catBtn);

            getSubcategoriesFor(currentCategoryFilter).forEach(sub => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'mobile-cat-chip';
                if (currentSubCategoryFilter === sub) btn.classList.add('active');
                btn.textContent = sub;
                if (subcategoryHasNewItems(currentCategoryFilter, sub)) {
                    btn.appendChild(makeWholesaleNewItemsBadge());
                }
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
            if (item.value !== 'All' && categoryHasNewItems(item.value)) {
                btn.appendChild(makeWholesaleNewItemsBadge());
            }
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
                        if (subcategoryHasNewItems(item.value, sub)) {
                            subBtn.appendChild(makeWholesaleNewItemsBadge());
                        }
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
    let displayPrice = String((product && product.price) || '').trim();
    if (!displayPrice) return '';
    if (displayPrice.toLowerCase().includes('market')) return displayPrice;
    displayPrice = displayPrice.replace(/\/ea\.?$/i, '').trim();
    if (!displayPrice.includes('/')) displayPrice += ' each';
    return displayPrice;
}

function formatPackSize(cs) {
    if (typeof hideWholesaleCaseCounts === 'function' && hideWholesaleCaseCounts()) return '';
    const raw = String(cs || '').trim();
    if (!raw) return '';
    const m = raw.match(/^(\d+)\s*\/\s*cs$/i);
    if (m) return m[1] + ' per case';
    return raw;
}

function formatListPrice(price, isMarket) {
    const raw = String(price || '').trim();
    if (!raw) return '';
    if (isMarket || raw.toLowerCase().includes('market')) return raw;
    if (/\/lb/i.test(raw)) return raw;
    if (/\/ea/i.test(raw)) return raw.replace(/\/ea\.?$/i, ' / ea');
    if (raw.includes('/')) return raw;
    return raw + ' / ea';
}

function formatCardMeta(product) {
    const priceText = formatCardPrice(product);
    const packText = formatPackSize(product && product.cs);
    return [priceText, packText].filter(Boolean).join(' · ');
}

function hideWholesaleCaseCounts(customer) {
    try {
        if (typeof isBrianAssignedCustomer !== 'function') return false;
        return isBrianAssignedCustomer(customer || window._currentCustomer);
    } catch (e) {
        return false;
    }
}

function useWholesaleItemGrid() {
    const customer = window._currentCustomer;
    if (typeof isBrianAssignedCustomer === 'function' && isBrianAssignedCustomer(customer)) return true;
    const email = String((customer && (customer.salesman_email || customer.salesmanEmail)) || '').toLowerCase().trim();
    return email === 'donegaldogtreats@gmail.com' || email === 'jackerman@donegalnatural.com';
}

function brianPackGroup(name) {
    const n = String(name || '').toLowerCase();
    if (/braided bully/.test(n)) return 'Braided Bully';
    if (/euro bull/.test(n)) return 'Euro Bully';
    if (/bully cane/.test(n)) return 'Canes';
    if (/monster|thin bully|regular bully|bully stick/.test(n)) return 'Green Line';
    if (/jerky treats/.test(n)) return 'Jerky Stick Treats';
    if (/elky training/.test(n)) return 'Training Treats';
    if (/stuffed buffalo bone/.test(n)) return 'Jerky Stuffed Bones';
    if (/cow ear/.test(n)) return 'Natural/Flavored Cow Ears';
    if (/buffalo ears/.test(n)) return 'Buffalo Ears';
    if (/hairy beef ears/.test(n)) return 'Hairy Beef Ears';
    if (/bunny ears/.test(n)) return 'Fuzzy Rabbit Ears';
    if (/pig ear/.test(n)) return 'Pig Ears';
    if (/natural .*rollio|natural rollio/.test(n)) return 'All Natural Rollio';
    if (/phat/.test(n)) return 'PHAT Rollios';
    if (/peanut butter stuffed .*rollio|peanut butter stuffed rollio/.test(n)) return 'Peanut Butter Rollios';
    if (/rollio/.test(n)) return 'Natural/Flavored Rollios';
    if (/cheek slab/.test(n)) return 'Cow Cheek Slabs';
    if (/chunky/.test(n)) return 'Chunky Cheeks';
    if (/ox tail/.test(n)) return 'MAGNA Ox Tails';
    if (/bunny feet/.test(n)) return 'Fuzzy Rabbit Feet';
    if (/duck neck/.test(n)) return 'Duck Neck';
    if (/goose/.test(n)) return 'Goose Neck';
    if (/duck head/.test(n)) return 'Duck Heads';
    if (/duck feet/.test(n)) return 'Duck Feet';
    if (/tendon/.test(n)) return 'Super Meaty Beef Tendons';
    if (/paddywack/.test(n)) return 'Paddywacks';
    if (/collagen/.test(n)) return 'Beef Collagen';
    if (/corium/.test(n)) return 'Corium Sticks';
    if (/hoove/.test(n)) return 'Hooves';
    if (/trachea piece/.test(n)) return 'Trachea Pieces';
    if (/trachea/.test(n)) return 'Trachea';
    if (/esophagus/.test(n)) return 'Braided Esophagus';
    if (/femur/.test(n)) return 'Jumbo Meaty Femur';
    if (/lung flip/.test(n)) return 'Beef Lung';
    if (/lamb ear/.test(n)) return 'Lamb Ears';
    if (/lamb lung/.test(n)) return 'Lamb Lung';
    if (/buffalo horn/.test(n)) return 'Buffalo Horns';
    if (/buffalo knuckle|buffalo bone/.test(n)) return 'Buffalo Bone and Knuckle';
    if (/buffalo bite/.test(n)) return 'Buffalo Bites';
    if (/chicken feet/.test(n)) return 'Chicken Feet';
    if (/donut/.test(n)) return 'Supreme USA Hide Braided Donuts';
    if (/pressed ring/.test(n)) return 'Supreme Pressed Ring';
    if (/pressed stick/.test(n)) return 'Supreme Pressed Stick';
    if (/pressed bone/.test(n)) return 'Supreme Pressed Bones';
    if (/vanilla/.test(n) && /retriever/.test(n)) return 'Vanilla Flavored Retriever';
    if (/retriever/.test(n)) return 'USA White Hide Retriever';
    if (/twisty-q|twisty q/.test(n)) return "Twisty Q's";
    if (/twisty/.test(n)) return "Twisty's";
    if (/munchy/.test(n)) return 'Munch Sticks';
    if (/binkey/.test(n)) return "Binkey's";
    return '';
}

function renderWholesaleItemGrid(container) {
    if (!container) return;
    stopRecommendedRotator();
    updateProductsHeading('Wholesale Products');
    const searchVal = String((document.getElementById('product-search') || {}).value || '')
        .toLowerCase().trim();
    let rows = (WHOLESALE_PRICES || []).filter(function (p) {
        if (!p || !p.name) return false;
        if (typeof isTestProductName === 'function' && isTestProductName(p.name)) return false;
        return true;
    });
    if (currentCategoryFilter && currentCategoryFilter !== 'All') {
        rows = rows.filter(function (p) {
            if (String(p.category || '') === currentCategoryFilter) return true;
            const mapped = (typeof brianPackCategories === 'function') ? brianPackCategories(p.name) : null;
            return !!(mapped && mapped.indexOf(currentCategoryFilter) !== -1);
        });
    }
    if (currentSubCategoryFilter) {
        const tree = (WHOLESALE_BROWSE_TREE || {})[currentCategoryFilter] || {};
        const allowed = {};
        (tree[currentSubCategoryFilter] || []).forEach(function (n) { allowed[n] = true; });
        rows = rows.filter(function (p) {
            if (allowed[p.name]) return true;
            const group = (typeof brianPackGroup === 'function') ? brianPackGroup(p.name) : '';
            return group === currentSubCategoryFilter;
        });
    }
    if (searchVal) {
        rows = rows.filter(function (p) {
            const nick = (typeof wholesaleDisplayName === 'function')
                ? wholesaleDisplayName(p.name) : p.name;
            return (p.name + ' ' + nick).toLowerCase().indexOf(searchVal) !== -1;
        });
    }
    const groupOrder = [
        'Green Line', 'Canes', 'Braided Bully', 'Euro Bully',
        'Jerky Stick Treats', 'Training Treats', 'Jerky Stuffed Bones',
        'Natural/Flavored Cow Ears', 'Buffalo Ears', 'Hairy Beef Ears', 'Fuzzy Rabbit Ears', 'Pig Ears',
        'Natural/Flavored Rollios', 'All Natural Rollio', 'PHAT Rollios', 'Peanut Butter Rollios', 'Cow Cheek Slabs', 'Chunky Cheeks',
        'MAGNA Ox Tails', 'Fuzzy Rabbit Feet', 'Fuzzy Rabbit Ears',
        'Duck Neck', 'Goose Neck', 'Duck Heads', 'Duck Feet',
        'Super Meaty Beef Tendons', 'Paddywacks', 'Beef Collagen', 'Corium Sticks', 'Hooves', 'Trachea', 'Trachea Pieces', 'Braided Esophagus', 'Jumbo Meaty Femur', 'Beef Lung',
        'Lamb Ears', 'Lamb Lung',
        'Buffalo Horns', 'Buffalo Bone and Knuckle', 'Jerky Stuffed Bones', 'Buffalo Bites',
        'Chicken Feet', 'Supreme USA Hide Braided Donuts',
        'Supreme Pressed Bones', 'Supreme Pressed Ring', 'Supreme Pressed Stick',
        'Vanilla Flavored Retriever', 'USA White Hide Retriever',
        "Twisty's", "Twisty Q's", 'Munch Sticks', "Binkey's"
    ];
    function groupRank(name) {
        const g = (typeof brianPackGroup === 'function') ? brianPackGroup(name) : '';
        const i = groupOrder.indexOf(g);
        return i === -1 ? 999 : i;
    }
        function itemSortKey(name) {
        const raw = String(name || '').toLowerCase().replace(/[“”"]/g, '');
        const pack = parseInt(raw, 10) || 0;
        const lengthMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:”|"|'')/);
        const length = lengthMatch ? Number(lengthMatch[1]) : 0;
        let style = 'zzz';
        if (/super thick/.test(raw)) style = 'super thick';
        else if (/thick/.test(raw)) style = 'thick';
        else if (/thin/.test(raw)) style = 'thin';
        else if (/regular/.test(raw)) style = 'regular';
        else if (/monster/.test(raw)) style = 'monster';
        else if (/natural/.test(raw)) style = 'natural';
        else if (/vanilla/.test(raw)) style = 'vanilla';
        else if (/honey/.test(raw)) style = 'honey';
        else if (/phat/.test(raw)) style = 'phat';
        return style + ' ' + String(length).padStart(4, '0') + ' ' + String(pack).padStart(4, '0') + ' ' + raw;
    }
    rows.sort(function (a, b) {
        const ga = groupRank(a.name);
        const gb = groupRank(b.name);
        if (ga !== gb) return ga - gb;
        return itemSortKey(a.name).localeCompare(itemSortKey(b.name));
    });
    if (!rows.length) {
        container.innerHTML = '<p class="text-center py-8 text-[#6B4423]">No products found.</p>';
        return;
    }
    const hideCase = typeof hideWholesaleCaseCounts === 'function' && hideWholesaleCaseCounts();
    let html = '<div class="overflow-x-auto border-2 border-[#6B4423] rounded-2xl bg-white">' +
        '<table class="w-full text-sm"><thead><tr class="bg-[#1E4D2B] text-[#d4b78f]">' +
        '<th class="p-2.5 text-left">Product</th>' +
        (hideCase ? '' : '<th class="p-2.5 text-left w-28">Case size</th>') +
        '<th class="p-2.5 text-right w-28">Price each</th>' +
        '<th class="p-2.5 text-center w-40">Add to quote</th>' +
        '</tr></thead><tbody>';
    let lastCat = '';
    let lastGroup = '';
    rows.forEach(function (p, idx) {
        const cat = p.category || 'Other';
        const group = (typeof brianPackGroup === 'function') ? brianPackGroup(p.name) : '';
        if (cat !== lastCat) {
            lastCat = cat;
            lastGroup = '';
            html += '<tr class="bg-[#f8f4eb]"><td colspan="' + (hideCase ? '3' : '4') +
                '" class="p-2.5 font-bold brand-green border-t border-[#d4b78f]">' +
                escapeHtml(cat) + '</td></tr>';
        }
        if (group && group !== lastGroup) {
            lastGroup = group;
            html += '<tr><td colspan="' + (hideCase ? '3' : '4') +
                '" class="px-2.5 py-1.5 text-xs font-semibold text-[#6B4423] border-t border-[#e5d5c0]">' +
                escapeHtml(group) + '</td></tr>';
        }
        const display = (typeof wholesaleDisplayName === 'function')
            ? wholesaleDisplayName(p.name) : p.name;
        const priceText = (typeof formatListPrice === 'function')
            ? formatListPrice(p.price, p.isMarketPrice)
            : String(p.price || '');
        const oos = typeof isWholesaleOos === 'function' && isWholesaleOos(p.name);
        const oosLabel = oos && typeof wholesaleOosLabel === 'function'
            ? wholesaleOosLabel(p.name) : '';
        const safeName = encodeURIComponent(p.name);
        const safePrice = encodeURIComponent(p.price || '');
        const safeCs = encodeURIComponent(p.cs || '');
        html += '<tr class="' + (idx % 2 ? 'bg-[#f8f4eb]' : 'bg-white') + ' border-t border-[#e8d9b8]">' +
            '<td class="p-2.5">' +
            '<div class="flex items-center gap-3">' +
            (function () {
                const coming = (typeof isWholesaleComingSoon === 'function' && isWholesaleComingSoon(p.name));
                const src = (typeof getProductImagePath === 'function' && getProductImagePath(p)) || '';
                const real = !coming && src && src.indexOf('placeholder') === -1;
                if (!real) {
                    return '<div style="width:48px;height:48px;flex-shrink:0;border-radius:8px;background:#6B4423;color:#F5E6C8;font-size:9px;line-height:1.15;font-weight:700;display:flex;align-items:center;justify-content:center;text-align:center;padding:3px;">Photograph Coming Soon</div>';
                }
                return '<button type="button" class="flex-shrink-0" title="View photo" onclick="openGridProductPhoto(decodeURIComponent(\'' +
                    encodeURIComponent(p.name) + '\'))">' +
                    '<img src="' + escapeHtml(src) +
                    '" alt="" class="w-12 h-12 object-contain rounded-lg border border-[#d4b78f] bg-[#f8f4eb]" ' +
                    'onerror="this.onerror=null;this.parentNode.outerHTML=\'<div class=\\\'w-12 h-12 flex-shrink-0 rounded-lg bg-[#8a8680] text-white text-[8px] leading-tight font-semibold flex items-center justify-center text-center px-1\\\'>Photograph Coming Soon</div>\';">' +
                    '</button>';
            }()) +
            '<div>' + escapeHtml(display) +
            (oos ? '<p class="text-[11px] text-orange-700">' + escapeHtml(oosLabel || 'Out of stock') + '</p>' : '') +
            '</div></div></td>' +
            (hideCase ? '' : ('<td class="p-2.5 text-[#6B4423]">' +
                escapeHtml((typeof formatPackSize === 'function' ? formatPackSize(p.cs) : p.cs) || '—') +
                '</td>')) +
            '<td class="p-2.5 text-right font-semibold brand-green whitespace-nowrap">' +
            escapeHtml(priceText || '—') + '</td>' +
            '<td class="p-2.5 text-center whitespace-nowrap">' +
            (oos
                ? '<span class="text-xs text-orange-700">Unavailable</span>'
                : ('<input type="number" min="1" value="1" class="w-16 border-2 border-[#6B4423] rounded-lg px-2 py-1 text-sm mr-2" id="grid-qty-' + idx + '">' +
                    '<button type="button" class="px-3 py-1 text-xs font-semibold rounded-lg bg-[#1E4D2B] text-[#d4b78f]" ' +
                    'onclick="addToQuote(decodeURIComponent(\'' + safeName + '\'), decodeURIComponent(\'' + safePrice + '\'), decodeURIComponent(\'' + safeCs + '\'), (document.getElementById(\'grid-qty-' + idx + '\')||{}).value || 1)">' +
                    'Add</button>')) +
            '</td></tr>';
    });
    html += '</tbody></table></div>' +
        '<p class="text-[11px] text-[#6B4423] mt-2">Every item on your sheet is listed. A full case is not required.</p>';
    container.innerHTML = html;
}

function openGridProductPhoto(name) {
    const paths = (typeof getProductImagePaths === 'function')
        ? getProductImagePaths(name)
        : [];
    const fallback = (typeof getProductImagePath === 'function')
        ? getProductImagePath({ name: name })
        : '';
    const list = (paths && paths.length) ? paths : (fallback ? [fallback] : ['media/placeholder-bully-stick.png']);
    if (typeof openProductImageLightbox === 'function') {
        openProductImageLightbox(list, 0);
    }
}

function makeOrderAnyQtyNote() {
    const note = document.createElement('p');
    note.className = 'text-[11px] leading-snug text-[#6B4423] mt-1 mb-2';
    note.textContent = 'Order any quantity — a full case is not required.';
    return note;
}

function isWholesaleMarketProduct(productOrName) {
    if (productOrName && typeof productOrName === 'object') {
        if (productOrName.isMarketPrice) return true;
        if (String(productOrName.price || '').toLowerCase().includes('market')) return true;
        productOrName = productOrName.name;
    }
    const name = String(productOrName || '');
    const catalog = (WHOLESALE_PRICES || []).find(function (p) { return p && p.name === name; });
    return !!(catalog && catalog.isMarketPrice);
}

function marketDisclaimerHtml() {
    return '<p class="text-[11px] leading-snug text-[#c56134] mt-1">' + MARKET_PRICE_DISCLAIMER + '</p>';
}

let _wholesaleProductImages = [];

const PHOTO_FAMILY_LINKS = {
    'cow-ears-6pack': 'cow-ears',
    'chunky-bags': 'chunky-bulk',
    'binkeys': 'supreme-chips-bulk'
};

function wholesalePhotoSlug(name) {
    return String(name || '')
        .toLowerCase()
        .replace(/[“”"']/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 48);
}

function wholesalePhotoUrl(path) {
    const p = String(path || '');
    if (!p) return '';
    if (p === 'COMING_SOON' || p.indexOf('COMING_SOON/') === 0) return '';
    if (!/\.(jpe?g|png|webp|gif)$/i.test(p)) return '';
    try {
        const pub = supabaseClient.storage.from('product-photos').getPublicUrl(path);
        return (pub && pub.data && pub.data.publicUrl) || '';
    } catch (err) {
        return '';
    }
}

function getPhotoFamilyKeyForName(name) {
    const group = (typeof getCombinedGroupForName === 'function')
        ? getCombinedGroupForName(name)
        : null;
    if (group && group.id) return group.id;
    return wholesalePhotoSlug(name);
}

function isRealWholesalePhotoPath(path) {
    const p = String(path || '');
    if (!p) return false;
    if (p === 'COMING_SOON' || p.indexOf('COMING_SOON/') === 0) return false;
    return /\.(jpe?g|png|webp|gif)$/i.test(p);
}

function galleryRowsForFamily(key) {
    return (_wholesaleProductImages || []).filter(function (row) {
        return row.family_key === key && isRealWholesalePhotoPath(row.storage_path);
    });
}

function galleryRowsForProductName(name) {
    const group = (typeof getCombinedGroupForName === 'function')
        ? getCombinedGroupForName(name)
        : null;
    const keys = {};
    function addKey(k) {
        if (k) keys[String(k)] = true;
    }
    addKey(getPhotoFamilyKeyForName(name));
    addKey(wholesalePhotoSlug(name));
    if (group) {
        addKey(group.id);
        addKey(wholesalePhotoSlug(group.title));
        (group.names || []).forEach(function (n) { addKey(wholesalePhotoSlug(n)); });
    }
    const catalog = (typeof WHOLESALE_PRICES !== 'undefined' && Array.isArray(WHOLESALE_PRICES))
        ? WHOLESALE_PRICES.find(function (p) { return p && p.name === name; })
        : null;
    if (catalog) {
        addKey(wholesalePhotoSlug((catalog.category || '') + '-' + (catalog.subCategory || catalog.category || '')));
        addKey(wholesalePhotoSlug(catalog.subCategory || ''));
    }
    const needle = photoNameKey(name);
    return (_wholesaleProductImages || []).filter(function (row) {
        if (!isRealWholesalePhotoPath(row.storage_path)) return false;
        if (keys[String(row.family_key || '')]) return true;
        if (needle && photoNameKey(row.variant_name) === needle) return true;
        return false;
    });
}

function photoNameKey(value) {
    return String(value || '').toLowerCase().replace(/,/g, '').replace(/\s+/g, ' ').trim();
}

function isWholesaleComingSoon(name) {
    const needle = photoNameKey(name);
    if (!needle) return false;
    return (_wholesaleProductImages || []).some(function (row) {
        const path = String(row.storage_path || '');
        const isFlag = row.scope === 'coming_soon' ||
            path === 'COMING_SOON' ||
            path.indexOf('COMING_SOON/') === 0;
        return isFlag && photoNameKey(row.variant_name) === needle;
    });
}

function applyWholesaleComingSoon(photoEl, imgEl, name) {
    if (!photoEl) return;
    const coming = isWholesaleComingSoon(name);
    photoEl.classList.toggle('is-coming-soon', coming);
    photoEl.style.cursor = coming ? 'default' : 'pointer';
    photoEl.title = coming ? '' : 'Click to enlarge';
    if (imgEl) imgEl.style.cursor = coming ? 'default' : 'pointer';
}

function getGalleryCardHeroPath(name) {
    const rows = galleryRowsForProductName(name);
    const hero = rows.find(function (row) { return row.is_card_hero; }) ||
        rows.find(function (row) { return row.scope === 'packaged'; }) ||
        rows.find(function (row) { return row.scope === 'family'; });
    return hero ? wholesalePhotoUrl(hero.storage_path) : '';
}

async function loadWholesaleProductImages() {
    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
        const { data, error } = await supabaseClient
            .from('product_images')
            .select('family_key, linked_family_key, scope, variant_name, is_card_hero, sort_order, storage_path')
            .order('sort_order', { ascending: true });
        if (error) throw error;
        _wholesaleProductImages = data || [];
    } catch (err) {
        console.warn('loadWholesaleProductImages:', err);
        _wholesaleProductImages = [];
    }
}

function getProductImagePath(product) {
    const name = String((product && product.name) || '');
    const galleryHero = getGalleryCardHeroPath(name);
    if (galleryHero) return galleryHero;
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
        { match: /elky training/i, file: 'Jerky Squares Full Product shot.jpg' },
        { match: /elky jerky/i, file: 'Elky Sticks  (Full Shot).jpg' },
        { match: /stuffed buffalo/i, file: 'Stuffed Buffalo Bone (End Shot).jpg' },
        { match: /beef jerky/i, file: 'Elky Sticks  (Full Shot).jpg' },
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
    const familyKey = getPhotoFamilyKeyForName(title);
    const rows = galleryRowsForProductName(title).slice();
    const linkedKey = (rows[0] && rows[0].linked_family_key) || PHOTO_FAMILY_LINKS[familyKey] || '';
    const linkedRows = linkedKey ? galleryRowsForFamily(linkedKey) : [];
    const urls = [];

    function addRow(row) {
        const url = row && wholesalePhotoUrl(row.storage_path);
        if (url && urls.indexOf(url) === -1) urls.push(url);
    }

    const ownHero = rows.find(function (row) { return row.is_card_hero; }) ||
        rows.find(function (row) { return row.scope === 'packaged'; }) ||
        rows.find(function (row) { return row.scope === 'family'; });
    if (ownHero) addRow(ownHero);

    rows.filter(function (row) {
        return row.scope === 'packaged' || row.scope === 'family';
    }).forEach(addRow);

    linkedRows.filter(function (row) {
        return row.is_card_hero || row.scope === 'family';
    }).forEach(addRow);

    const flavorNeedle = String(title || '').toLowerCase();
    function variantMatch(row) {
        if (row.scope !== 'variant') return false;
        const label = String(row.variant_name || '').toLowerCase();
        if (!label) return false;
        return flavorNeedle.indexOf(label) !== -1 || label.indexOf(flavorNeedle) !== -1;
    }
    rows.filter(variantMatch).forEach(addRow);
    linkedRows.filter(variantMatch).forEach(addRow);
    rows.filter(function (row) { return row.scope === 'variant'; }).forEach(addRow);
    linkedRows.filter(function (row) { return row.scope === 'variant'; }).forEach(addRow);
    rows.forEach(addRow);

    if (urls.length) return urls;

    const group = getCombinedGroupForName(title);
    const galleryKey = group ? group.title : title;
    const fromMap = PRODUCT_IMAGE_GALLERY[galleryKey];
    if (fromMap && fromMap.length) {
        return fromMap.map(function (f) { return encodeURI(f); });
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
            '8oz. Bags of USA Elky Training Treats',
            '10oz. Bags of USA Elky Training Treats',
            '12oz. Bags of USA Elky Training Treats'
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

function quotedStyleWord(name) {
    const matches = String(name || '').match(/[“"']\s*([A-Za-z][A-Za-z0-9 -]{0,30})\s*[”"']/g) || [];
    if (!matches.length) return '';
    const last = matches[matches.length - 1];
    const inner = last.replace(/[“"'\s]/g, '').trim();
    return inner;
}

function variantChipLabel(dim, product) {
    const catalogName = (product && product.name) || '';
    const catalogLabel = extractVariantDim(dim, product);
    const nick = (typeof wholesaleDisplayName === 'function')
        ? wholesaleDisplayName(catalogName)
        : catalogName;
    if (!nick || nick === catalogName) return catalogLabel;
    const nickLabel = extractVariantDim(dim, { name: nick });
    if (dim === 'size' || dim === 'bag' || dim === 'pack' || dim === 'format' || dim === 'hornSize') {
        return nickLabel || catalogLabel;
    }
    const quoted = quotedStyleWord(nick);
    if (quoted) return quoted.charAt(0).toUpperCase() + quoted.slice(1);
    const nickTrim = String(nick).replace(/\s+/g, ' ').trim();
    if (nickTrim.split(' ').length <= 3 && !/\d/.test(nickTrim)) return nickTrim;
    const catNorm = (typeof normalizeProductName === 'function')
        ? normalizeProductName(catalogName)
        : String(catalogName).toLowerCase();
    const nickNorm = (typeof normalizeProductName === 'function')
        ? normalizeProductName(nick)
        : nickTrim.toLowerCase();
    const extra = nickNorm.split(' ').map(function (t) {
        return String(t || '').replace(/["“”']+/g, '');
    }).filter(function (t) {
        const catTokens = catNorm.split(' ').map(function (c) {
            return String(c || '').replace(/["“”']+/g, '');
        });
        return t && catTokens.indexOf(t) === -1 &&
            t !== 'bulk' && t !== 'display' && t !== 'sticks' &&
            !/^\d/.test(t);
    });
    if (extra.length) {
        return extra.map(function (t) {
            return t.charAt(0).toUpperCase() + t.slice(1);
        }).join(' ');
    }
    return nickLabel || catalogLabel;
}

function styleGroupLabel(dim, product, variants) {
    const catalogLabel = extractVariantDim(dim, product);
    if (dim === 'size' || dim === 'bag' || dim === 'pack' || dim === 'format' || dim === 'hornSize') {
        return variantChipLabel(dim, product);
    }
    const group = (variants || []).filter(function (v) {
        return extractVariantDim(dim, v) === catalogLabel;
    });
    for (let i = 0; i < group.length; i++) {
        const chip = variantChipLabel(dim, group[i]);
        if (chip && chip !== catalogLabel) return chip;
    }
    return catalogLabel;
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

let wholesaleIngredients = [];

function normalizeIngredientKey(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function formatAnalysis(analysis) {
    if (!analysis || typeof analysis !== 'object') return '';
    const parts = [];
    if (analysis.protein) parts.push('Protein ' + analysis.protein);
    if (analysis.fat) parts.push('Fat ' + analysis.fat);
    if (analysis.fiber) parts.push('Fiber ' + analysis.fiber);
    if (analysis.moisture) parts.push('Moisture ' + analysis.moisture);
    return parts.length ? parts.join(' · ') : '';
}

function findIngredientRow(productName) {
    const raw = String(productName || '');
    const want = normalizeIngredientKey(raw);
    if (!want) return null;

    function rowsMatching(keyword) {
        const key = normalizeIngredientKey(keyword);
        return (wholesaleIngredients || []).filter(function (row) {
            return normalizeIngredientKey(row.name).indexOf(key) !== -1;
        });
    }

    function firstRowOrFallback(rows, fallbackIngredients) {
        if (rows && rows.length) return rows[0];
        if (fallbackIngredients) {
            return { name: '', ingredients: fallbackIngredients, analysis: null };
        }
        return null;
    }

    if (/honey\s*smoked/i.test(raw)) {
        return firstRowOrFallback(rowsMatching('honey smoked'), 'Natural honey and natural smoke flavoring');
    }

    if (/vanilla/i.test(raw)) {
        return firstRowOrFallback(rowsMatching('vanilla'), 'Flavored with natural vanilla');
    }

    if (/stuffed/i.test(raw) || /jerky/i.test(raw)) {
        const jerky = rowsMatching('jerky');
        const typeOrder = [
            { tokens: ['venison', 'sweet potato'], fallback: 'Ground Venison, Sweet Potato, Rice Flour, Spices, Sugar, Salt and Garlic Powder' },
            { tokens: ['elky', 'elk'], fallback: 'Ground Elk Meat, Rice Flour, Spices, Sugar, Salt and Garlic Powder' },
            { tokens: ['turkey'], fallback: 'Ground Turkey Meat, Rice Flour, Spices, Sugar, Salt and Garlic Powder' },
            { tokens: ['chicken'], fallback: 'Ground Chicken Meat, Rice Flour, Spices, Sugar, Salt and Garlic Powder' },
            { tokens: ['beef'], fallback: 'Ground Beef Meat, Rice Flour, Spices, Sugar, Salt and Garlic Powder' }
        ];
        for (let i = 0; i < typeOrder.length; i++) {
            const tokens = typeOrder[i].tokens;
            if (!tokens.some(function (t) { return want.indexOf(t) !== -1; })) continue;
            const hit = jerky.find(function (row) {
                const name = normalizeIngredientKey(row.name);
                return tokens.some(function (t) { return name.indexOf(t) !== -1; });
            });
            if (hit) return hit;
            return { name: '', ingredients: typeOrder[i].fallback, analysis: null };
        }
        if (/peanut\s*butter/i.test(raw)) {
            const pb = rowsMatching('peanut butter');
            return firstRowOrFallback(pb, 'All natural peanut butter');
        }
        if (/jerky/i.test(raw) && jerky.length) return jerky[0];
        return null;
    }

    if (/peanut\s*butter/i.test(raw)) {
        return firstRowOrFallback(rowsMatching('peanut butter'), 'All natural peanut butter');
    }

    return null;
}

function getIngredientsForProduct(productName) {
    const match = findIngredientRow(productName);
    return match && match.ingredients ? String(match.ingredients).trim() : '';
}

function getAnalysisForProduct(productName) {
    const match = findIngredientRow(productName);
    return match ? formatAnalysis(match.analysis) : '';
}

function buildCardIngredientsEl() {
    const el = document.createElement('p');
    el.className = 'card-ingredients';
    return el;
}

function updateCardIngredients(el, productName) {
    if (!el) return;
    const text = getIngredientsForProduct(productName);
    const analysis = getAnalysisForProduct(productName);
    if (!text && !analysis) {
        el.textContent = '';
        el.style.display = 'none';
        return;
    }
    el.innerHTML =
        (text
            ? ('<span class="card-ingredients-label">Ingredients: </span>' + escapeHtml(text))
            : '') +
        (analysis
            ? ((text ? '<div class="card-analysis">' : '<div class="card-analysis" style="margin-top:0">') +
                '<span class="card-analysis-label">Guaranteed analysis: </span>' +
                escapeHtml(analysis) +
                '</div>')
            : '');
    el.style.display = '';
}

async function loadWholesaleIngredients() {
    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
        const { data, error } = await supabaseClient
            .from('product_ingredients')
            .select('name, ingredients, analysis')
            .order('sort_order', { ascending: true });
        if (error) throw error;
        wholesaleIngredients = (data || []).map(function (row) {
            return {
                name: row.name || '',
                ingredients: row.ingredients || '',
                analysis: row.analysis || null
            };
        }).filter(function (row) {
            return row.name && (row.ingredients || row.analysis);
        });
    } catch (err) {
        console.warn('loadWholesaleIngredients:', err);
        wholesaleIngredients = [];
    }
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
    applyWholesaleComingSoon(photo, img, fallback.name || group.title);
    if ((group.names || []).some(isWholesaleNewProduct) || isWholesaleNewProduct(fallback.name) || isWholesaleNewProduct(group.title)) {
        appendCardNewBadge(photo);
    }
    photo.onclick = () => {
        if (photo.classList.contains('is-coming-soon')) return;
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

    const marketNote = document.createElement('p');
    marketNote.className = 'text-[11px] leading-snug text-[#c56134] mt-1';
    marketNote.textContent = MARKET_PRICE_DISCLAIMER;
    marketNote.classList.add('hidden');

    const descEl = buildCardDescriptionEl();
    const ingredientsEl = buildCardIngredientsEl();
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
    body.appendChild(marketNote);

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
            applyWholesaleComingSoon(photo, img, preview.name);
            if (!chosen.length) {
                meta.textContent = 'Select one or more options';
            } else if (chosen.length === 1) {
                meta.textContent = formatCardMeta(chosen[0]);
                marketNote.classList.toggle('hidden', !isWholesaleMarketProduct(chosen[0]));
                if (marketNote) marketNote.classList.toggle('hidden', !isWholesaleMarketProduct(chosen[0]));
            } else {
                meta.textContent = chosen.length + ' options selected';
            }
            Array.from(flavorRow.children).forEach(el => {
                el.classList.toggle('active', !!selected[el.getAttribute('data-name')]);
            });
            const descName = (chosen[0] || preview).name;
            updateCardDescription(descEl, descName);
            updateCardIngredients(ingredientsEl, descName);
            updateDogSizeRow(sizeRow, descName);
            syncCombinedOosButton(descName);
        }

        variants.forEach(v => {
            const opt = document.createElement('button');
            opt.type = 'button';
            opt.className = 'card-option-btn';
            opt.textContent = extractVariantDim(labelDim, v) || wholesaleDisplayName(v.name);
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
        body.appendChild(ingredientsEl);
        body.appendChild(sizeRow);
        body.appendChild(qtyRow);
        body.appendChild(makeOrderAnyQtyNote());
        body.appendChild(btn);
        refreshMulti();
    } else {
        const dims = group.dims || ['size'];
        let selected = variants[0] || fallback;
        const state = {};
        dims.forEach(d => {
            state[d] = styleGroupLabel(d, selected, variants);
        });
        const rows = {};

        function findSelected() {
            return variants.find(v => dims.every(d => styleGroupLabel(d, v, variants) === state[d]))
                || variants.find(v => dims.filter(d => state[d]).every(d => styleGroupLabel(d, v, variants) === state[d]))
                || variants[0]
                || fallback;
        }

        function refreshSingle() {
            selected = findSelected();
            meta.textContent = formatCardMeta(selected);
            marketNote.classList.toggle('hidden', !isWholesaleMarketProduct(selected));
            img.src = getProductImagePath(selected);
            img.alt = selected.name;
            applyWholesaleComingSoon(photo, img, selected.name);
            dims.forEach(d => {
                const row = rows[d];
                if (!row) return;
                Array.from(row.children).forEach(el => {
                    el.classList.toggle('active', el.textContent === state[d]);
                });
            });
            updateCardDescription(descEl, selected.name);
            updateCardIngredients(ingredientsEl, selected.name);
            updateDogSizeRow(sizeRow, selected.name);
        }

        dims.forEach(d => {
            const labels = [];
            variants.forEach(v => {
                const label = styleGroupLabel(d, v, variants);
                if (label && labels.indexOf(label) === -1) labels.push(label);
            });
            if (!labels.length) return;
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
        body.appendChild(ingredientsEl);
        body.appendChild(sizeRow);
        body.appendChild(qtyRow);
        body.appendChild(makeOrderAnyQtyNote());
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
    applyWholesaleComingSoon(photo, img, product.name);
    if (isWholesaleNewProduct(product.name)) {
        appendCardNewBadge(photo);
    }
    photo.onclick = () => {
        if (photo.classList.contains('is-coming-soon')) return;
        openProductImageLightbox(getProductImagePaths(product), 0);
    };

    const body = document.createElement('div');
    body.className = 'card-body';

    const name = document.createElement('h3');
    name.className = 'card-name';
    name.textContent = wholesaleDisplayName(product.name);

    const meta = document.createElement('p');
    meta.className = 'card-meta';
    meta.textContent = formatCardMeta(product);

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

    const ingredientsEl = buildCardIngredientsEl();
    updateCardIngredients(ingredientsEl, product.name);

    const marketNote = document.createElement('p');
    marketNote.className = 'text-[11px] leading-snug text-[#c56134] mt-1';
    marketNote.textContent = MARKET_PRICE_DISCLAIMER;
    marketNote.classList.toggle('hidden', !isWholesaleMarketProduct(product));

    body.appendChild(name);
    body.appendChild(meta);
    body.appendChild(makeOrderAnyQtyNote());
    body.appendChild(marketNote);
    body.appendChild(descEl);
    body.appendChild(ingredientsEl);
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

function isJonathanCardPreview() {
    try {
        const emails = [];
        const current = JSON.parse(localStorage.getItem('currentUser') || 'null');
        const original = JSON.parse(localStorage.getItem('originalAdminUser') || 'null');
        if (current && current.email) emails.push(String(current.email).toLowerCase().trim());
        if (original && original.email) emails.push(String(original.email).toLowerCase().trim());
        return emails.some(function (e) {
            return e === 'jackerman@donegalnatural.com' || e.indexOf('jackerman') !== -1;
        });
    } catch (err) {
        return false;
    }
}

function insertWholesaleTestCard(container) {
    if (!container || !isJonathanCardPreview()) return;
    const existing = document.getElementById('wholesale-test-card-wrap');
    if (existing) existing.remove();
    const group = (COMBINED_CARD_GROUPS || []).find(function (g) {
        return g.id === 'cow-ears';
    });
    if (!group || typeof buildCombinedCard !== 'function') return;
    const wrap = document.createElement('div');
    wrap.id = 'wholesale-test-card-wrap';
    wrap.className = 'mb-6';
    const label = document.createElement('p');
    label.className = 'text-xs font-bold text-[#1E4D2B] mb-2';
    label.textContent = 'TEST CARD — only you can see this. Live Cow Ears below is unchanged.';
    wrap.appendChild(label);
    const card = buildCombinedCard(group);
    card.classList.add('wholesale-test-card');
    wrap.appendChild(card);
    container.insertBefore(wrap, container.firstChild);
}

function renderRecommendedCards() {
    const container = document.getElementById('portal-products');
    if (!container) return;
    updateProductsHeading('Recommended for you');
    renderProductCardGrid(container, pickRandomProducts(4), 'No products available yet.');
    insertWholesaleTestCard(container);
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
    }, 45000);
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

    if (useWholesaleItemGrid()) {
        renderWholesaleItemGrid(container);
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
        const names = (tree[sub] || []).slice();
        extraLungNamesForBrowse(currentCategoryFilter, sub).forEach(function (n) {
            if (names.indexOf(n) === -1) names.push(n);
        });
                extraBullyPackNamesForBrowse(currentCategoryFilter, sub).forEach(function (n) {
            if (names.indexOf(n) === -1) names.push(n);
        });
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
    insertWholesaleTestCard(container);
}

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

var wholesaleOosMap = {};

function getWholesaleOos(name) {
    return wholesaleOosMap[name] || null;
}

function isWholesaleOos(name) {
    var row = getWholesaleOos(name);
    return !!(row && row.is_out_of_stock);
}

function formatOosDisplayDate(value) {
    var raw = String(value || '').slice(0, 10);
    var parts = raw.split('-');
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return raw;
    return parts[1] + '/' + parts[2] + '/' + String(parts[0]).slice(-2);
}

function wholesaleOosLabel(name) {
    var row = getWholesaleOos(name);
    if (!row || !row.is_out_of_stock) return '';
    var eta = row.estimated_back_at ? String(row.estimated_back_at).slice(0, 10) : '';
    return eta ? ('Out of Stock: Expected in stock date ' + formatOosDisplayDate(eta)) : 'Out of Stock';
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
        if (!restricted.size) {
            window._wholesaleAssignedProducts = new Set();
            return;
        }
        const mine = (window._currentCustomer?.salesman_email || '').toLowerCase().trim();
        const allowed = new Set(byEmail[mine] || []);
        window._wholesaleAssignedProducts = allowed;
        WHOLESALE_PRICES = WHOLESALE_PRICES.filter(p =>
            !restricted.has(p.name) || allowed.has(p.name)
        );
    } catch (err) {
        console.error('filterWholesaleCatalogForSalesman:', err);
    }
}

const BRIAN_SEAT_EMAIL = 'donegaldogtreats@gmail.com';

function isBrianAssignedCustomer(customer) {
    const email = String((customer && (customer.salesman_email || customer.salesmanEmail)) || '').toLowerCase().trim();
    return email === BRIAN_SEAT_EMAIL;
}

function shouldFailClosedToSalesmanSheet(customer) {
    const salesman = String((customer && (customer.salesman_email || customer.salesmanEmail)) || '').toLowerCase().trim();
    if (!salesman) return false;
    if (salesman === 'jackerman@donegalnatural.com') return false;
    const email = String((customer && customer.email) || '').toLowerCase().trim();
    const company = String((customer && (customer.company || customer.name)) || '').toLowerCase();
    if (email === 'jackerman@donegalnatural.com') return false;
    if (company.indexOf('admin test store') !== -1) return false;
    return true;
}

function wholesaleDisplayName(catalogName) {
    const map = window._wholesaleDisplayNames || {};
    if (!catalogName) return '';
    let nick = String((map && map[catalogName]) || '').replace(/\s+/g, ' ').trim();
    if (!nick && map && typeof normalizeProductName === 'function') {
        const want = normalizeProductName(catalogName);
        Object.keys(map).some(function (key) {
            if (normalizeProductName(key) !== want) return false;
            nick = String(map[key] || '').replace(/\s+/g, ' ').trim();
            return !!nick;
        });
    }
    return nick || catalogName || '';
}

function orderLineDisplayName(item) {
    const nick = String((item && item.displayName) || '').replace(/\s+/g, ' ').trim();
    if (nick) return nick;
    const catalog = (item && (item.product || item.name)) || '';
    return wholesaleDisplayName(catalog) || catalog || 'Item';
}

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
    if (/jerky|elky training|stuffed buffalo bone/.test(key)) return ['Jerky'];
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

async function applyBrianWholesaleSheetPrices() {
    window._wholesaleSalesmanPrices = {};
    window._wholesaleDisplayNames = {};
    window._wholesaleHiddenPrices = {};

    const customer = window._currentCustomer;
    const salesmanEmail = String((customer && (customer.salesman_email || customer.salesmanEmail)) || '').toLowerCase().trim();

    if (!customer || !customer.id || !salesmanEmail) {
        WHOLESALE_PRICES = [];
        return;
    }

    // Load salesman sheet — this is the only product list
    try {
        const { data: sheet } = await supabaseClient
            .from('salesman_price_sheets')
            .select('prices, display_names, hidden_prices')
            .eq('salesman_email', salesmanEmail)
            .maybeSingle();
        if (sheet) {
            window._wholesaleSalesmanPrices = (sheet.prices && typeof sheet.prices === 'object') ? sheet.prices : {};
            window._wholesaleDisplayNames = (sheet.display_names && typeof sheet.display_names === 'object') ? sheet.display_names : {};
            window._wholesaleHiddenPrices = (sheet.hidden_prices && typeof sheet.hidden_prices === 'object') ? sheet.hidden_prices : {};
        }
    } catch (err) {
        console.warn('salesman sheet load:', err);
    }

    // Start with ONLY the salesman sheet keys
    const prices = Object.assign({}, window._wholesaleSalesmanPrices);

    // Overlay customer specials — price changes only, never new keys
    try {
        const { data: custSheet } = await supabaseClient
            .from('customer_price_sheets')
            .select('prices, salesman_email')
            .eq('customer_id', customer.id)
            .maybeSingle();
        const sheetSalesman = String((custSheet && custSheet.salesman_email) || '').toLowerCase().trim();
        if (custSheet && custSheet.prices && sheetSalesman === salesmanEmail) {
            Object.keys(custSheet.prices).forEach(function (name) {
                if (custSheet.prices[name] == null || custSheet.prices[name] === '') return;
                if (Object.prototype.hasOwnProperty.call(prices, name)) {
                    prices[name] = custSheet.prices[name];
                }
            });
        }
    } catch (err) {
        console.warn('customer overlay:', err);
    }

    // Remove hidden
    const hidden = window._wholesaleHiddenPrices || {};
    Object.keys(prices).forEach(function (name) {
        const want = String(name || '').toLowerCase();
        const hit = Object.keys(hidden).some(function (key) {
            return String(key || '').toLowerCase() === want;
        });
        if (hit) delete prices[name];
    });

    // Build final list from salesman keys only
    const next = [];
    Object.keys(prices).forEach(function (name) {
        const raw = prices[name];
        const n = Number(raw);
        const mapped = (typeof brianPackCategories === 'function') ? brianPackCategories(name) : null;
        const cat = (mapped && mapped[0]) || 'Other';
        next.push({
            name: name,
            category: cat,
            subCategory: (mapped && mapped[1]) || '',
            cs: '',
            price: (!isNaN(n) && raw !== '' && raw != null) ? ('$' + n.toFixed(2)) : '',
            isMarketPrice: false
        });
    });

    WHOLESALE_PRICES = next;
}

function isBeefOrBuffaloLungName(name) {
    const n = String(name || '');
    if (!n || /lamb/i.test(n)) return false;
    return /beef\s*lung/i.test(n) ||
        /buffalo\s*lung/i.test(n) ||
        /lung\s*flips/i.test(n) ||
        /lung\s*bites/i.test(n);
}

function extraLungNamesForBrowse(category, sub) {
    const cat = String(category || '');
    const folder = String(sub || '');
    const inBeef = cat === 'Beef' && (!folder || folder === 'Beef Lung' || folder === 'Packaged');
    const inPack = cat === 'Packaged Items' && (!folder || folder === 'Beef Lung' || folder === 'Packaged' || /lung/i.test(folder));
    if (!inBeef && !inPack) return [];
    const seen = {};
    const out = [];
    (WHOLESALE_PRICES || []).forEach(function (p) {
        const name = p && p.name;
        if (!isBeefOrBuffaloLungName(name) || seen[name]) return;
        seen[name] = true;
        out.push(name);
    });
    return out;
}

function extraBullyPackNamesForBrowse(category, sub) {
    const cat = String(category || '');
    const folder = String(sub || '');
    if (cat !== 'Bully Sticks') return [];
    if (folder && folder !== 'Packaged') return [];
    const seen = {};
    const out = [];
    (WHOLESALE_PRICES || []).forEach(function (p) {
        const name = p && p.name;
        if (!name || seen[name]) return;
        const n = String(name).toLowerCase();
        if (n.indexOf('pack') === -1 || n.indexOf('thin') === -1) return;
        seen[name] = true;
        out.push(name);
    });
    return out;
}

async function loadWholesaleCatalog() {
    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) {
            console.warn('loadWholesaleCatalog: supabaseClient not ready — keeping hardcoded list');
            return;
        }

        const { data, error } = await supabaseClient
            .from('products')
            .select('id, name, category, sub_category, case_size, unit_price, is_market_price, active')
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
                : '',
            isMarketPrice: !!row.is_market_price
        }));

        console.log('loadWholesaleCatalog: loaded', WHOLESALE_PRICES.length, 'products from Supabase');
        await filterWholesaleCatalogForSalesman();
        await loadWholesaleOutOfStock();
        window._wholesaleCatalogBase = (WHOLESALE_PRICES || []).map(function (p) {
            return Object.assign({}, p);
        });
        await applyBrianWholesaleSheetPrices();
    } catch (err) {
        console.error('loadWholesaleCatalog error — keeping hardcoded list:', err);
        if (typeof applyBrianWholesaleSheetPrices === 'function') {
            await applyBrianWholesaleSheetPrices();
        }
    }
}

function newProductAlertStorageKey() {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const email = (user.email || '').toLowerCase().trim();
    return email ? ('newProductAlertSeenAt_' + email) : null;
}

function newProductSeenNamesKey() {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const email = (user.email || '').toLowerCase().trim();
    return email ? ('newProductSeenNames_' + email) : null;
}

function getSeenNewProductNames() {
    const key = newProductSeenNamesKey();
    if (!key) return [];
    try {
        const raw = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(raw) ? raw.map(normalizeProductName) : [];
    } catch (err) {
        return [];
    }
}

function isWholesaleNewProduct(name) {
    const map = window._wholesaleNewNames || {};
    return !!map[normalizeProductName(name)];
}

function makeWholesaleNewItemsBadge() {
    const el = document.createElement('span');
    el.className = 'wholesale-new-items-badge';
    el.textContent = 'New items';
    return el;
}

function appendCardNewBadge(photo) {
    if (!photo) return;
    const pill = document.createElement('span');
    pill.className = 'card-new-badge';
    pill.textContent = 'New';
    photo.appendChild(pill);
}

function namesInWholesaleFolder(category, subcategory) {
    const names = [];
    const tree = (WHOLESALE_BROWSE_TREE || {})[category];
    if (tree) {
        const keys = subcategory ? [subcategory] : Object.keys(tree);
        keys.forEach(function (sub) {
            (tree[sub] || []).forEach(function (n) { names.push(n); });
        });
    }
    (WHOLESALE_PRICES || []).forEach(function (p) {
        if (p.category !== category) return;
        if (subcategory && String(p.subCategory || '') !== subcategory) return;
        names.push(p.name);
    });
    return names;
}

function categoryHasNewItems(category) {
    if (!category || category === 'All') return false;
    return namesInWholesaleFolder(category).some(isWholesaleNewProduct);
}

function subcategoryHasNewItems(category, sub) {
    if (!category || !sub) return false;
    return namesInWholesaleFolder(category, sub).some(isWholesaleNewProduct);
}

function markWholesaleNewSeenForFolder(category, subcategory) {
    if (!category || category === 'All') return;
    const key = newProductSeenNamesKey();
    if (!key) return;
    const seen = getSeenNewProductNames();
    const seenMap = {};
    seen.forEach(function (n) { seenMap[n] = true; });
    namesInWholesaleFolder(category, subcategory).forEach(function (name) {
        if (!isWholesaleNewProduct(name)) return;
        seenMap[normalizeProductName(name)] = true;
    });
    localStorage.setItem(key, JSON.stringify(Object.keys(seenMap)));
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

window.getHealthBenefitsForProduct = getHealthBenefitsForProduct;
window.getSidebarCategories = getSidebarCategories;
window.getSubcategoriesFor = getSubcategoriesFor;
window.isTestProductName = isTestProductName;
window.normalizeProductName = normalizeProductName;
window.findCatalogProduct = findCatalogProduct;
window.clearWholesaleSearch = clearWholesaleSearch;
window.selectWholesaleCategory = selectWholesaleCategory;
window.selectWholesaleSubcategory = selectWholesaleSubcategory;
window.renderCategoryFilters = renderCategoryFilters;
window.createSingleText = createSingleText;
window.createCategoryRow = createCategoryRow;
window.createTextRow = createTextRow;
window.createStyledRow = createStyledRow;
window.loadPortalInventory = loadPortalInventory;
window.stopRecommendedRotator = stopRecommendedRotator;
window.pickRandomProducts = pickRandomProducts;
window.formatCardPrice = formatCardPrice;
window.formatPackSize = formatPackSize;
window.formatListPrice = formatListPrice;
window.formatCardMeta = formatCardMeta;
window.hideWholesaleCaseCounts = hideWholesaleCaseCounts;
window.useWholesaleItemGrid = useWholesaleItemGrid;
window.brianPackGroup = brianPackGroup;
window.renderWholesaleItemGrid = renderWholesaleItemGrid;
window.openGridProductPhoto = openGridProductPhoto;
window.makeOrderAnyQtyNote = makeOrderAnyQtyNote;
window.isWholesaleMarketProduct = isWholesaleMarketProduct;
window.marketDisclaimerHtml = marketDisclaimerHtml;
window.wholesalePhotoSlug = wholesalePhotoSlug;
window.wholesalePhotoUrl = wholesalePhotoUrl;
window.getPhotoFamilyKeyForName = getPhotoFamilyKeyForName;
window.isRealWholesalePhotoPath = isRealWholesalePhotoPath;
window.galleryRowsForFamily = galleryRowsForFamily;
window.galleryRowsForProductName = galleryRowsForProductName;
window.photoNameKey = photoNameKey;
window.isWholesaleComingSoon = isWholesaleComingSoon;
window.applyWholesaleComingSoon = applyWholesaleComingSoon;
window.getGalleryCardHeroPath = getGalleryCardHeroPath;
window.loadWholesaleProductImages = loadWholesaleProductImages;
window.getProductImagePath = getProductImagePath;
window.getProductImagePaths = getProductImagePaths;
window.closeProductImageLightbox = closeProductImageLightbox;
window.openProductImageLightbox = openProductImageLightbox;
window.getCombinedGroupForName = getCombinedGroupForName;
window.parseCaseQty = parseCaseQty;
window.appendProductCards = appendProductCards;
window.quotedStyleWord = quotedStyleWord;
window.variantChipLabel = variantChipLabel;
window.styleGroupLabel = styleGroupLabel;
window.extractVariantDim = extractVariantDim;
window.getProductDescription = getProductDescription;
window.getRecommendedDogSizes = getRecommendedDogSizes;
window.buildCardDescriptionEl = buildCardDescriptionEl;
window.buildDogSizeRow = buildDogSizeRow;
window.updateCardDescription = updateCardDescription;
window.normalizeIngredientKey = normalizeIngredientKey;
window.formatAnalysis = formatAnalysis;
window.findIngredientRow = findIngredientRow;
window.getIngredientsForProduct = getIngredientsForProduct;
window.getAnalysisForProduct = getAnalysisForProduct;
window.buildCardIngredientsEl = buildCardIngredientsEl;
window.updateCardIngredients = updateCardIngredients;
window.loadWholesaleIngredients = loadWholesaleIngredients;
window.updateDogSizeRow = updateDogSizeRow;
window.buildCombinedCard = buildCombinedCard;
window.buildProductCard = buildProductCard;
window.renderProductCardGrid = renderProductCardGrid;
window.renderGroupedCategoryCards = renderGroupedCategoryCards;
window.updateProductsHeading = updateProductsHeading;
window.isJonathanCardPreview = isJonathanCardPreview;
window.insertWholesaleTestCard = insertWholesaleTestCard;
window.renderRecommendedCards = renderRecommendedCards;
window.startRecommendedRotator = startRecommendedRotator;
window.renderPortalProducts = renderPortalProducts;
window.setupSearch = setupSearch;
window.filterAndRenderProducts = filterAndRenderProducts;
window.getWholesaleOos = getWholesaleOos;
window.isWholesaleOos = isWholesaleOos;
window.formatOosDisplayDate = formatOosDisplayDate;
window.wholesaleOosLabel = wholesaleOosLabel;
window.loadWholesaleOutOfStock = loadWholesaleOutOfStock;
window.filterWholesaleCatalogForSalesman = filterWholesaleCatalogForSalesman;
window.isBrianAssignedCustomer = isBrianAssignedCustomer;
window.shouldFailClosedToSalesmanSheet = shouldFailClosedToSalesmanSheet;
window.wholesaleDisplayName = wholesaleDisplayName;
window.orderLineDisplayName = orderLineDisplayName;
window.brianPackCategories = brianPackCategories;
window.applyBrianWholesaleSheetPrices = applyBrianWholesaleSheetPrices;
window.isBeefOrBuffaloLungName = isBeefOrBuffaloLungName;
window.extraLungNamesForBrowse = extraLungNamesForBrowse;
window.extraBullyPackNamesForBrowse = extraBullyPackNamesForBrowse;
window.loadWholesaleCatalog = loadWholesaleCatalog;
window.newProductAlertStorageKey = newProductAlertStorageKey;
window.newProductSeenNamesKey = newProductSeenNamesKey;
window.getSeenNewProductNames = getSeenNewProductNames;
window.isWholesaleNewProduct = isWholesaleNewProduct;
window.makeWholesaleNewItemsBadge = makeWholesaleNewItemsBadge;
window.appendCardNewBadge = appendCardNewBadge;
window.namesInWholesaleFolder = namesInWholesaleFolder;
window.categoryHasNewItems = categoryHasNewItems;
window.subcategoryHasNewItems = subcategoryHasNewItems;
window.markWholesaleNewSeenForFolder = markWholesaleNewSeenForFolder;
window.checkNewProductAlert = checkNewProductAlert;
window.dismissNewProductAlert = dismissNewProductAlert;
