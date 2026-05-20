# P+3 Ceramics

A Scandinavian-inspired luxury ceramics gallery showcasing artisan works from select workshops in Colombia and Italy.

## Design Philosophy

- ✨ Scandinavian minimalism meets artistic expression
- 🎨 Soft color palette: sage, dusty rose, warm grays
- 🖼️ Gallery-like presentation with generous white space
- 💎 Luxury feel through restraint and quality

## Features

- 🎯 Clean, modern design with artistic touches
- 💳 Secure one-click checkout via Stripe Payment Links
- 🏷️ Product filtering by type and workshop
- 📱 Fully responsive, mobile-first design
- ✨ Auto-deploy via GitHub Actions
- 🚫 No backend required - pure static site

## Tech Stack

- **HTML5** - Semantic markup
- **CSS3** - Custom properties, Grid, modern features
- **Vanilla JavaScript** - No frameworks, no build step
- **Stripe Payment Links** - Secure checkout
- **GitHub Pages** - Free hosting

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
    artist: "Workshop Name",
    type: "Vessel", // or "Wall Piece", "Limited Design", etc.
    priceEUR: 640,
    image: "./images/product-photo.png",
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
4. Push to GitHub - done!

## Marking Items as Sold

When a piece sells, update `products.js`:

```javascript
{
  title: "Blue Rust Vessel",
  available: false, // Shows "Sold" button, grayed out
}
```

Commit and push - the site updates automatically.

## Deployment

Automatically deploys to GitHub Pages on every push to `main` branch via GitHub Actions.

## Cost

- **Hosting**: $0 (GitHub Pages)
- **Domain** (optional): ~€12/year
- **Stripe fees**: 2.9% + €0.30 per transaction

## Why This Approach?

**Perfect for curated, luxury ceramics:**

- ✅ Each piece is unique and special
- ✅ Single-item checkout maintains exclusivity
- ✅ Zero security risk - Stripe owns all pricing
- ✅ Zero backend maintenance
- ✅ Beautiful, fast, elegant

## Project Structure

```
evandro-ceramics-store/
├── index.html           # Main page
├── products.js          # Product catalog (edit this to add/remove items)
├── script.js            # Gallery logic
├── styles.css           # Styling
├── images/              # Product photos
├── STRIPE_SETUP.md      # Stripe integration guide
└── .github/workflows/   # Auto-deploy config
```

## License

P+3 Ceramics