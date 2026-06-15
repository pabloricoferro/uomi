# UOMI

A ceramic art studio — handmade pieces in small batches, with full attention to texture and detail.

## Design Philosophy

- Handcrafted, honest materials
- Minimal, gallery-like presentation
- Generous white space and animated figures
- No backend required — pure static site

## Features

- Clean, modern design with custom SVG figure animations
- Secure one-click checkout via Stripe Payment Links
- Fully responsive, mobile-first design
- Auto-deploy via GitHub Actions

## Tech Stack

- **HTML5** — Semantic markup
- **CSS3** — Custom properties, Grid, modern features
- **Vanilla JavaScript** — No frameworks, no build step
- **Stripe Payment Links** — Secure checkout
- **GitHub Pages** — Free hosting

## Local Development

**Recommended (port 3456 — matches Cursor preview):**

```bash
cd UOMI
npm install
npm run dev
```

Then open **http://localhost:3456/** (Home: `http://localhost:3456/index.html`).

In Cursor: **Terminal → Run Task → "UOMI: servidor local (puerto 3456)"** (keep the terminal open).

**Alternatives:**

```bash
# Python (any free port)
python -m http.server 3456

# Or open index.html directly in the browser (no localhost)
```

## Adding New Products

Edit `products.js`:

```javascript
window.PRODUCTS = [
  {
    id: "unique-id",
    title: "Product Name",
    type: "Vessel", // or "Bowl", "Plate", "Wall Piece", etc.
    description: "One-line description.",
    priceEUR: 640,
    image: "./images/product-photo.svg",
    alt: "Description for accessibility",
    stripeLink: "https://buy.stripe.com/xxxxx", // Get from Stripe Dashboard
    available: true,
  },
  // Add more products...
];
```

Then add your product image to the `images/` folder.

## Setup Stripe Payment Links

See [STRIPE_SETUP.md](./STRIPE_SETUP.md) for complete instructions.

**Quick version:**

1. Create payment links in Stripe Dashboard
2. Get the links (e.g., `https://buy.stripe.com/xxxxx`)
3. Add to `products.js`
4. Push to GitHub — done!

## Marking Items as Sold

When a piece sells, update `products.js`:

```javascript
{
  title: "Cuenco Luna",
  available: false, // Shows "Sold" button, grayed out
}
```

Commit and push — the site updates automatically.

## Deployment

Automatically deploys to GitHub Pages on every push to `main` branch via GitHub Actions.

## Cost

- **Hosting**: $0 (GitHub Pages)
- **Domain** (optional): ~€12/year
- **Stripe fees**: 2.9% + €0.30 per transaction

## Project Structure

```
UOMI/
├── index.html           # Home page (figure animations)
├── shop.html            # Product grid
├── about.html           # About page (scroll animation)
├── contact.html         # Contact page
├── script.js            # All page animations and logic
├── figures.js           # SVG figure definitions (used by shop.html)
├── products.js          # Product catalog (edit this to add/remove items)
├── styles.css           # Styling
├── images/              # Product images
├── print/               # Print assets (not used by the website)
├── STRIPE_SETUP.md      # Stripe integration guide
└── .github/workflows/   # Auto-deploy config
```

## License

UOMI
