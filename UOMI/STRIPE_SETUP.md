# Stripe Payment Links Setup

## Quick Setup (~20 minutes)

This site uses **Stripe Payment Links** for secure, one-click purchases. No backend required, no security risks.

### 1. Create Stripe Account

1. Go to [https://stripe.com](https://stripe.com)
2. Sign up for a free account
3. Complete business verification for **UOMI** (required for live payments)

### 2. Create Payment Links in Stripe

For each ceramic piece:

1. Go to **Payment Links** in Stripe Dashboard (left sidebar)
2. Click **New**
3. Fill in:
   - **Product name**: e.g., "Cuenco Luna"
   - **Description**: Detailed description of the piece
   - **Price**: e.g., €45
   - **Image**: Upload product photo
   - **Collect shipping address**: Enable (for physical goods)
4. Click **Create link**
5. Copy the payment link (looks like: `https://buy.stripe.com/xxxxx`)

### 3. Update products.js

Replace the placeholder Stripe links with your real ones:

```javascript
{
  id: "cuenco-luna",
  title: "Cuenco Luna",
  stripeLink: "https://buy.stripe.com/xxxxx", // Paste your real link here
  available: true, // Set to false when sold
}
```

### 4. Test Everything

**Test Mode (Free Testing):**

1. Toggle to "Test mode" in Stripe Dashboard (top right)
2. Create test payment links
3. Use test credit card: `4242 4242 4242 4242`
4. Any future expiry date, any CVC

**Live Mode:**

1. Toggle to "Live mode" in Stripe Dashboard
2. Create payment links again in live mode
3. Update `products.js` with live payment links
4. Now real purchases work!

### 5. When a Piece Sells

1. Mark as sold in `products.js`:

```javascript
{
  title: "Cuenco Luna",
  available: false, // Item will show as "Sold"
}
```

2. Commit and push to GitHub
3. Site updates automatically

### 6. Adding New Products

Edit `products.js`:

```javascript
{
  id: "new-piece-01",
  title: "New Ceramic Piece",
  type: "Vessel", // or "Bowl", "Plate", "Wall Piece", etc.
  description: "One-line description.",
  priceEUR: 750,
  image: "./images/new-piece.svg",
  alt: "Description for accessibility",
  stripeLink: "https://buy.stripe.com/xxxxx",
  available: true,
}
```

Add the image to `images/`, commit, and push.

## Features

✅ **One-click checkout** via Stripe Payment Links  
✅ **Sold items** automatically display as unavailable  
✅ **No backend needed** — works on GitHub Pages  
✅ **Secure** — prices locked in Stripe, can't be tampered  
✅ **Email receipts** sent automatically by Stripe  
✅ **Stripe fees**: 2.9% + €0.30 per transaction in Europe  

## Shipping

Stripe automatically collects shipping addresses. Configure shipping rates in:

- **Stripe Dashboard → Settings → Shipping rates**

Or handle shipping manually after each sale.

## Custom Domain (Optional)

1. Buy a domain (e.g., `uomi.art` at Namecheap ~€12/year)
2. Add a `CNAME` file to the repo with your domain
3. Point domain DNS to GitHub Pages
4. Done!

## Managing Orders

- View all orders in **Stripe Dashboard → Payments**
- Get email notifications for each sale
- Export orders to CSV for record-keeping
- Mark items as "Sold" in `products.js` manually

## Support

- Stripe Dashboard: [https://dashboard.stripe.com](https://dashboard.stripe.com)
- Stripe Payment Links Docs: [https://stripe.com/docs/payment-links](https://stripe.com/docs/payment-links)
- Stripe has 24/7 support chat

## Why Payment Links?

**Perfect for handmade, curated ceramics:**

- Each piece is special and unique — buyers consider purchases carefully
- No need for cart/bulk buying
- Maintains the gallery feel
- Zero security risk (Stripe owns the price)
- Zero maintenance (no backend to manage)
