// ═══════════════════════════════════════════════════════════════════════════
// UOMI — PRODUCT CATALOG
// ═══════════════════════════════════════════════════════════════════════════
// Each product needs:
//   id          — unique slug (also sent to Stripe as client_reference_id, so the
//                 "Product" column in the Orders sheet and the automatic "Sold"
//                 status both use it)
//   type        — category key: ashtray | small | large | mug | bowl | vase | plate | jewelry
//                 (labels are translated in i18n.js, keys "type.*")
//   priceEUR    — price as a number (€)
//   images      — list of image paths; the card shows arrows to browse them
//   stripeLink  — Stripe Payment Link (LIVE: no "test_" in URL). The price charged
//                 is set in Stripe, not here — keep priceEUR in sync with Stripe.
//   available   — false = force "Sold" manually. Normally you don't need it:
//                 a paid order in the Orders sheet marks the piece as sold.

window.PRODUCTS = [
  {
    id:         "small-cup-1",
    type:       "small",
    priceEUR:   18,
    images:     ["./images/cuenco-luna.svg", "./images/jarron-raiz.svg", "./images/plato-tierra.svg"],
    stripeLink: "",
    available:  true,
  },
  {
    id:         "small-cup-2",
    type:       "small",
    priceEUR:   18,
    images:     ["./images/cuenco-luna.svg", "./images/jarron-raiz.svg", "./images/plato-tierra.svg"],
    stripeLink: "",
    available:  true,
  },
  {
    id:         "ashtray-1",
    type:       "ashtray",
    priceEUR:   16,
    images:     ["./images/plato-tierra.svg", "./images/cuenco-luna.svg", "./images/jarron-raiz.svg"],
    stripeLink: "",
    available:  true,
  },
  {
    id:         "ashtray-2",
    type:       "ashtray",
    priceEUR:   16,
    images:     ["./images/plato-tierra.svg", "./images/cuenco-luna.svg", "./images/jarron-raiz.svg"],
    stripeLink: "",
    available:  true,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// HOW TO ADD A NEW PRODUCT
// 1. Copy one block above and fill in all fields
// 2. Add the product photos to the /images/ folder and list them in `images`
// 3. Create a Payment Link in Stripe (max 1 sale) and paste it in stripeLink
// 4. Save and push to GitHub
// ═══════════════════════════════════════════════════════════════════════════
