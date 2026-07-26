// ─── RETAIL PRICE MAP (Wholesale × 2.60, retail-friendly endings: .49 / .79 / .99) ──
const RETAIL_PRICE_MAP = {
  'green-line-bully-sticks': 'Starting at $1.49',
  'super-thick-green-line-bully-stick': 'Starting at $6.79',
  'euro-bully-sticks': 'Starting at $5.79',
  'braided-bully-sticks': 'Starting at $8.49',
  'bully-canes': '$29.79',
  'regular-rollio': 'Starting at $4.99',
  'honey-smoked-rollio': 'Starting at $6.49',
  'vanilla-rollio': 'Starting at $5.99',
  'phat-rollio': 'Starting at $6.79',
  'peanut-butter-rollio': 'Starting at $6.99',
  'beef-jerky-sticks': '$1.49',
  'chicken-jerky-sticks': '$1.79',
  'turkey-jerky-sticks': '$1.49',
  'turkey-jerky-stick': '$1.49',
  'elk-jerky-sticks': '$1.79',
  'elky-jerky-training-treats': 'Starting at $10.49',
  'elk-jerky-training-treats': 'Starting at $10.49',
  'venison-and-sweet-potato': '$1.79',
  'rabbit-ears': 'Starting at $0.99',
  'lamb-ears': 'Starting at $1.49',
  'pig-ears': 'Market price',
  'cow-ears': 'Starting at $2.79',
  'buffalo-ears': 'Starting at $2.79',
  'chunky-cow-cheeks': 'Starting at $9.49',
  'cow-cheek-slabs': 'Starting at $15.79',
  'rabbit-feet': 'Starting at $1.49',
  'chicken-feet': 'Starting at $0.79',
  'duck-feet': 'Starting at $2.49',
  'duck-heads': 'Starting at $2.49',
  'duck-necks': 'Starting at $2.49',
  'goose-necks': 'Starting at $4.79',
  'beef-lung': 'Starting at $11.79',
  'beef-trachea': 'Starting at $2.49',
  'beef-wrapped-corium-sticks': 'Starting at $3.99',
  'beef-corium-sticks': 'Starting at $6.99',
  'super-meaty-beef-tendons': '$5.49',
  'buffalo-femur-bones': '$6.99',
  'elk-jerky-stuffed-buffalo-femur-bone': '$10.79',
  'peanut-butter-stuffed-buffalo-femur-bone': '$10.79',
  'buffalo-horns': 'Starting at $5.49',
  'buffalo-horns-1': 'Starting at $5.49',
  'supreme-braided-rings': 'Starting at $13.79',
  'rams-horns': 'Starting at $4.49',
  'white-supreme-retirever': 'Starting at $2.49',
  'white-supreme-retriever': 'Starting at $2.49',
  'supreme-pressed-bones': 'Starting at $1.49',
  'supreme-pressed-ring-6-inch': '$7.49',
  '10-inch-supreme-pressed-stick': '$3.79',
  '0fc188wymy0uz0yp99vgft6eziidw9': '$3.79',
};

// ─── VARIANT MAP (each size/flavor as a selectable button in the modal) ───────
const VARIANT_MAP = {
  'green-line-bully-sticks': [
    { label: '6" Thin', price: '$1.49' },
    { label: '12" Thin', price: '$2.99' },
    { label: '6" Regular', price: '$4.49' },
    { label: '12" Regular', price: '$7.49' },
    { label: '6" Thick', price: '$4.79' },
    { label: '12" Thick', price: '$9.49' },
  ],
  'super-thick-green-line-bully-stick': [
    { label: '6"', price: '$6.79' },
    { label: '12"', price: '$12.99' },
  ],
  'euro-bully-sticks': [
    { label: '6"', price: '$5.79' },
    { label: '12"', price: '$11.79' },
  ],
  'braided-bully-sticks': [
    { label: '6"', price: '$8.49' },
    { label: '12"', price: '$15.99' },
  ],
  'regular-rollio': [
    { label: '5-6"', price: '$4.99' },
    { label: '10-12"', price: '$9.49' },
  ],
  'honey-smoked-rollio': [
    { label: '5-6"', price: '$6.49' },
    { label: '10-12"', price: '$11.79' },
  ],
  'vanilla-rollio': [
    { label: '5-6"', price: '$5.99' },
    { label: '10-12"', price: '$10.79' },
  ],
  'phat-rollio': [
    { label: 'Regular 5-6"', price: '$6.79' },
    { label: 'Regular 10-12"', price: '$13.49' },
    { label: 'Honey Smoked 5-6"', price: '$6.99' },
    { label: 'Honey Smoked 10-12"', price: '$13.49' },
    { label: 'Vanilla 5-6"', price: '$6.79' },
    { label: 'Vanilla 10-12"', price: '$13.49' },
  ],
  'peanut-butter-rollio': [
    { label: '5-6"', price: '$6.99' },
    { label: '10-12"', price: '$10.99' },
  ],
  'elky-jerky-training-treats': [
    { label: '6 oz', price: '$10.49' },
    { label: '10 oz', price: '$18.79' },
  ],
  'elk-jerky-training-treats': [
    { label: '6 oz', price: '$10.49' },
    { label: '10 oz', price: '$18.79' },
  ],
  'rabbit-ears': [
    { label: 'Single', price: '$0.99' },
    { label: '10 Pack', price: '$11.49' },
  ],
  'lamb-ears': [
    { label: 'White / Plain', price: '$1.49' },
    { label: 'Vanilla', price: '$1.49' },
  ],
  'cow-ears': [
    { label: 'Natural', price: '$2.79' },
    { label: 'Vanilla', price: '$2.99' },
    { label: 'Honey Smoked', price: '$3.49' },
  ],
  'buffalo-ears': [
    { label: 'Plain', price: '$2.79' },
    { label: 'Honey Smoked', price: '$3.49' },
  ],
  'chunky-cow-cheeks': [
    { label: '8 oz', price: '$9.49' },
    { label: '16 oz', price: '$16.49' },
  ],
  'cow-cheek-slabs': [
    { label: 'Natural / lb', price: '$15.79' },
    { label: 'Regular / lb', price: '$16.49' },
    { label: 'Vanilla / lb', price: '$16.79' },
  ],
  'rabbit-feet': [
    { label: 'Single', price: '$1.49' },
    { label: '10 Pack', price: '$13.49' },
  ],
  'chicken-feet': [
    { label: 'Single', price: '$0.79' },
    { label: '10 Pack', price: '$9.49' },
  ],
  'duck-feet': [
    { label: 'Single', price: '$2.49' },
    { label: '10 Pack', price: '$23.79' },
  ],
  'duck-heads': [
    { label: 'Single', price: '$2.49' },
    { label: '5 Pack', price: '$41.79' },
    { label: '10 Pack', price: '$20.79' },
  ],
  'duck-necks': [
    { label: 'Single', price: '$2.49' },
    { label: '10 Pack', price: '$23.49' },
  ],
  'goose-necks': [
    { label: 'Single', price: '$4.79' },
    { label: '10 Pack', price: '$46.79' },
  ],
  'beef-lung': [
    { label: '8 oz', price: '$11.79' },
    { label: '16 oz', price: '$22.79' },
  ],
  'beef-trachea': [
    { label: '5-6"', price: '$2.49' },
    { label: '10-13"', price: '$4.79' },
  ],
  'beef-wrapped-corium-sticks': [
    { label: '6"', price: '$3.99' },
    { label: '12"', price: '$7.49' },
  ],
  'beef-corium-sticks': [
    { label: '6"', price: '$6.99' },
    { label: '12"', price: '$7.49' },
  ],
  'buffalo-horns': [
    { label: 'Small', price: '$5.49' },
    { label: 'Medium', price: '$8.99' },
    { label: 'Large', price: '$13.49' },
  ],
  'buffalo-horns-1': [
    { label: 'Small', price: '$5.49' },
    { label: 'Medium', price: '$8.99' },
    { label: 'Large', price: '$13.49' },
  ],
  'supreme-braided-rings': [
    { label: 'Plain 5-7"', price: '$13.79' },
    { label: 'Plain 8-9"', price: '$16.99' },
    { label: 'Plain 10-11"', price: '$20.79' },
    { label: 'Vanilla 5-7"', price: '$14.49' },
    { label: 'Vanilla 8-9"', price: '$17.49' },
    { label: 'Vanilla 10-11"', price: '$20.79' },
  ],
  'rams-horns': [
    { label: 'Small', price: '$4.49' },
    { label: 'Medium', price: '$8.79' },
    { label: 'Large', price: '$14.49' },
  ],
  'white-supreme-retirever': [
    { label: '6-9"', price: '$2.49' },
    { label: '10-11"', price: '$4.49' },
  ],
  'white-supreme-retriever': [
    { label: '6-9"', price: '$2.49' },
    { label: '10-11"', price: '$4.49' },
  ],
  'supreme-pressed-bones': [
    { label: '4.5"', price: '$1.49' },
    { label: '6.5"', price: '$3.49' },
    { label: '8.5"', price: '$5.99' },
    { label: '10.5"', price: '$10.49' },
    { label: '12.5"', price: '$14.79' },
  ],
};

// ─── SHOPIFY STOREFRONT API ───────────────────────────────────────────────────
const ShopifyAPI = (() => {
  const STORE    = 'donegal-natural-dog-treats.myshopify.com';
  const TOKEN    = '9fff32ed554f6d0fd5f0566800a4cb23';
  const ENDPOINT = `https://${STORE}/api/2024-01/graphql.json`;

  async function query(gql, variables = {}) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': TOKEN,
      },
      body: JSON.stringify({ query: gql, variables }),
    });
    if (!res.ok) throw new Error(`Shopify API error: ${res.status}`);
    const { data, errors } = await res.json();
    if (errors) throw new Error(errors[0].message);
    return data;
  }

  async function getProducts(limit = 50) {
    const data = await query(`
      query GetProducts($num: Int!) {
        products(first: $num) {
          nodes {
            id handle title description productType
            priceRange { minVariantPrice { amount currencyCode } }
            images(first: 10) { nodes { url altText } }
            variants(first: 10) {
              nodes { id title availableForSale price { amount currencyCode } }
            }
          }
        }
      }
    `, { num: limit });
    return data.products.nodes;
  }

  async function getProduct(handle) {
    const data = await query(`
      query GetProduct($handle: String!) {
        productByHandle(handle: $handle) {
          id handle title description productType
          priceRange { minVariantPrice { amount currencyCode } }
          images(first: 10) { nodes { url altText } }
          variants(first: 20) {
            nodes { id title availableForSale price { amount currencyCode } }
          }
        }
      }
    `, { handle });
    return data.productByHandle;
  }

  async function createCart() {
    const data = await query(`
      mutation CartCreate {
        cartCreate { cart { id checkoutUrl } }
      }
    `);
    return data.cartCreate.cart;
  }

  async function addToCart(cartId, variantId, quantity = 1) {
    const data = await query(`
      mutation AddToCart($cartId: ID!, $lines: [CartLineInput!]!) {
        cartLinesAdd(cartId: $cartId, lines: $lines) {
          cart {
            id checkoutUrl
            cost { totalAmount { amount currencyCode } }
            lines(first: 50) {
              nodes {
                id quantity
                merchandise { ... on ProductVariant { id title price { amount currencyCode } product { title images(first:1) { nodes { url } } } } }
              }
            }
          }
        }
      }
    `, { cartId, lines: [{ merchandiseId: variantId, quantity }] });
    return data.cartLinesAdd.cart;
  }

  async function updateCartLine(cartId, lineId, quantity) {
    const data = await query(`
      mutation UpdateLine($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
        cartLinesUpdate(cartId: $cartId, lines: $lines) {
          cart {
            id checkoutUrl
            cost { totalAmount { amount currencyCode } }
            lines(first: 50) {
              nodes {
                id quantity
                merchandise { ... on ProductVariant { id title price { amount currencyCode } product { title images(first:1) { nodes { url } } } } }
              }
            }
          }
        }
      }
    `, { cartId, lines: [{ id: lineId, quantity }] });
    return data.cartLinesUpdate.cart;
  }

  async function getCart(cartId) {
    const data = await query(`
      query GetCart($cartId: ID!) {
        cart(id: $cartId) {
          id checkoutUrl
          cost { totalAmount { amount currencyCode } }
          lines(first: 50) {
            nodes {
              id quantity
              merchandise { ... on ProductVariant { id title price { amount currencyCode } product { title images(first:1) { nodes { url } } } } }
            }
          }
        }
      }
    `, { cartId });
    return data.cart;
  }

  function formatPrice(amount, currencyCode = 'USD') {
    const num = parseFloat(amount);
    if (num === 0) return 'Contact for pricing';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(num);
  }

  return { getProducts, getProduct, createCart, addToCart, updateCartLine, getCart, formatPrice };
})();

// ── Product card renderer ─────────────────────────────────────────────────────
function renderProductCard(product, category) {
  const images = product.images.nodes;
  const img = images[0];

  // Price shown on card: use RETAIL_PRICE_MAP first, fall back to Shopify price
  const shopifyPrice = ShopifyAPI.formatPrice(
    product.priceRange.minVariantPrice.amount,
    product.priceRange.minVariantPrice.currencyCode
  );
  const price = RETAIL_PRICE_MAP[product.handle] ||
    (shopifyPrice !== 'Contact for pricing' ? shopifyPrice : 'Contact for pricing');

  // Embed all image URLs as data attributes for hover cycling
  const imgUrls = images.map(i => i.url);
  const imgData = imgUrls.length > 1
    ? `data-images='${JSON.stringify(imgUrls)}'`
    : '';

  const imgHtml = img
    ? `<img src="${img.url}" alt="${img.altText || product.title}" loading="lazy" class="card-img-main">`
    : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:3rem;">🐾</div>`;

  // Progress pip indicators (shown on hover when multiple images exist)
  const pips = imgUrls.length > 1
    ? `<div class="card-img-pips">${imgUrls.map((_, i) =>
        `<span class="card-img-pip${i === 0 ? ' active' : ''}"></span>`
      ).join('')}</div>`
    : '';

  const tag = category || product.productType || '';

  return `
    <div class="product-card" data-handle="${product.handle}" ${imgData}
         onclick="openProductModal('${product.handle}')"
         onmouseenter="startCardCycle(this)"
         onmouseleave="stopCardCycle(this)">
      <div class="product-card-img">
        ${imgHtml}
        ${pips}
      </div>
      <div class="product-card-body">
        ${tag ? `<span class="product-tag">${tag}</span>` : ''}
        <h3>${product.title}</h3>
        <p>${product.description || ''}</p>
        <div class="product-card-footer">
          <span class="product-price">${price}</span>
          <span class="product-link">Shop →</span>
        </div>
      </div>
    </div>`;
}

// ── Card hover image cycling ──────────────────────────────────────────────────
const _cardTimers = new WeakMap();

function startCardCycle(card) {
  const raw = card.dataset.images;
  if (!raw) return;
  let images;
  try { images = JSON.parse(raw); } catch { return; }
  if (images.length < 2) return;

  let index = 0;
  const img = card.querySelector('.card-img-main');
  const pips = card.querySelectorAll('.card-img-pip');

  const advance = () => {
    index = (index + 1) % images.length;
    if (img) {
      img.style.opacity = '0';
      setTimeout(() => {
        img.src = images[index];
        img.style.opacity = '1';
      }, 150);
    }
    pips.forEach((p, i) => p.classList.toggle('active', i === index));
  };

  const timer = setInterval(advance, 900);
  _cardTimers.set(card, timer);
}

function stopCardCycle(card) {
  const timer = _cardTimers.get(card);
  if (timer) {
    clearInterval(timer);
    _cardTimers.delete(card);
  }
  // Reset to first image
  const raw = card.dataset.images;
  if (!raw) return;
  let images;
  try { images = JSON.parse(raw); } catch { return; }
  const img = card.querySelector('.card-img-main');
  if (img && images[0]) {
    img.style.opacity = '0';
    setTimeout(() => {
      img.src = images[0];
      img.style.opacity = '1';
    }, 150);
  }
  card.querySelectorAll('.card-img-pip').forEach((p, i) => p.classList.toggle('active', i === 0));
}
