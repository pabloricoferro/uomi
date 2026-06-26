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

1. Toggle to **Test mode** in Stripe Dashboard (top right — must show orange "Test mode" badge)
2. Create test payment links (URLs contain `/test_`)
3. Use test credit card: `4242 4242 4242 4242`
4. Any future expiry date, any CVC
5. View test payments at: [dashboard.stripe.com/test/payments](https://dashboard.stripe.com/test/payments)

**Configure redirect after payment (recommended):**

After a successful test or live payment, send buyers back to your site:

1. Stripe Dashboard → **Payment Links** → open each link → **After payment**
2. Choose **Don't show confirmation page**
3. Set redirect URL to your success page, for example:
   - `https://www.uomi.art/success.html`
   - or `https://pabloricoferro.github.io/uomi/success.html`
4. Save and redeploy the link if Stripe asks you to

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

## Troubleshooting

### I completed a test payment but don't see it in Stripe

- Confirm **Test mode** is ON in the Dashboard (orange badge, top right). Live-mode payments and test-mode payments are separate lists.
- Open [dashboard.stripe.com/test/payments](https://dashboard.stripe.com/test/payments) directly.
- Use card `4242 4242 4242 4242` only — real cards fail in test mode.
- If checkout shows an error, try **Card** as the payment method (not Klarna, Satispay, etc.).

### "Buy Now" opens Stripe but checkout fails

- The Payment Link must be **active** in Dashboard → Payment Links.
- The link URL in `products.js` must match exactly the link copied from Stripe (including `/test_` in test mode).
- If you recreated a link in Stripe, update `stripeLink` in `products.js` and push to GitHub.

### Payment succeeds but I land on stripe.com

- Set **After payment → Redirect** on each Payment Link to `success.html` on your site (see step 4 above).

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
