// ═══════════════════════════════════════════════════════════════════════════
// UOMI — PRODUCT CATALOG
// ═══════════════════════════════════════════════════════════════════════════
// Each product needs:
//   id          — unique slug
//   title       — display name
//   type        — category label shown on card
//   description — one-line description
//   priceEUR    — price as a number (€)
//   image       — path relative to site root
//   alt         — image alt text for accessibility
//   stripeLink  — Stripe Payment Link (LIVE: no "test_" in URL). The price charged
//                 is set in Stripe, not here — keep title/priceEUR in sync with Stripe.
//   available   — true = in stock, false = sold

window.PRODUCTS = [
  {
    id:          "cuenco-luna",
    title:       "Cuenco Luna",
    type:        "Bowl",
    description: "Handmade bowl with a moon-white glaze and lunar crescent mark.",
    priceEUR:    45,
    image:       "./images/cuenco-luna.svg",
    alt:         "Cuenco Luna — handmade ceramic bowl with moon glaze",
    stripeLink:  "https://buy.stripe.com/6oUaEXdBo89gahU9qA0RG02",
    available:   true,
  },
  {
    id:          "jarron-raiz",
    title:       "Jarrón Raíz",
    type:        "Vase",
    description: "Decorative vase with organic root textures pressed into red clay.",
    priceEUR:    85,
    image:       "./images/jarron-raiz.svg",
    alt:         "Jarrón Raíz — decorative ceramic vase with root textures",
    stripeLink:  "https://buy.stripe.com/fZufZhcxkexE9dQcCM0RG01",
    available:   true,
  },
  {
    id:          "plato-tierra",
    title:       "Plato Tierra",
    type:        "Plate",
    description: "Wheel-thrown plate with concentric earth rings in terracotta.",
    priceEUR:    32,
    image:       "./images/plato-tierra.svg",
    alt:         "Plato Tierra — textured ceramic plate with concentric rings",
    stripeLink:  "https://buy.stripe.com/4gM7sLeFsexEgGi5ak0RG00",
    available:   true,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// HOW TO CHANGE NAME OR PRICE
// Update BOTH places so the shop card matches what Stripe charges:
//   1. Stripe Dashboard → Payment Links → edit the link (or create a new one)
//   2. products.js → title, priceEUR, stripeLink (if you created a new link)
//
// HOW TO ADD A NEW PRODUCT
// 1. Copy one block above and fill in all fields
// 2. Add the product image to the /images/ folder
// 3. Create a Payment Link in Stripe Dashboard → Payment Links
// 4. Paste the Stripe link into stripeLink
// 5. Save and push to GitHub
//
// HOW TO MARK A PIECE AS SOLD
//   Change available: true  →  available: false
//   The card will show "Sold" automatically.
// ═══════════════════════════════════════════════════════════════════════════
