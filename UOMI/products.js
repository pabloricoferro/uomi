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
//   stripeLink  — Stripe Payment Link (get from Stripe Dashboard → Payment Links)
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
    stripeLink:  "https://buy.stripe.com/test_PLACEHOLDER_CUENCO",
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
    stripeLink:  "https://buy.stripe.com/test_PLACEHOLDER_JARRON",
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
    stripeLink:  "https://buy.stripe.com/test_PLACEHOLDER_PLATO",
    available:   true,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
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
