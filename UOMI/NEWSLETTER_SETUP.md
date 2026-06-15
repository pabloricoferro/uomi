# Newsletter Setup Guide

The newsletter popup is fully built. It shows on every page 2.5 seconds after load, includes a waving figure, and detects duplicate emails. To start collecting emails into a Google Sheet (downloadable as `.xlsx`), follow these steps once.

---

## Step 1 — Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new blank spreadsheet.
2. Name it **UOMI Newsletter**.
3. In row 1, add these headers:

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| Email | Name | Country | Date of Birth | Sex | Subscribed At | Page |

Leave all other rows empty — the script will fill them automatically.

---

## Step 2 — Create the Google Apps Script

1. In the sheet, go to **Extensions → Apps Script**.
2. Delete any existing code and paste the following:

```javascript
function doGet(e) {
  var callback = e.parameter.callback || 'callback';
  var email    = (e.parameter.email   || '').toLowerCase().trim();
  var name     = (e.parameter.name    || '').trim();
  var country  = (e.parameter.country || '').trim();
  var dob      = (e.parameter.dob     || '').trim();
  var sex      = (e.parameter.sex     || '').trim();

  if (!email || !isValidEmail(email)) {
    return respond(callback, { status: 'error', message: 'Invalid email' });
  }

  var sheet   = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();

  // Check for duplicate email (skip header row)
  if (lastRow >= 2) {
    var emails = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < emails.length; i++) {
      if (emails[i][0].toString().toLowerCase().trim() === email) {
        return respond(callback, { status: 'duplicate' });
      }
    }
  }

  // Append new subscriber — columns: Email, Name, Country, DOB, Sex, Subscribed At, Page
  sheet.appendRow([email, name, country, dob, sex, new Date(), e.parameter.page || '']);
  return respond(callback, { status: 'success' });
}

function respond(callback, data) {
  return ContentService
    .createTextOutput(callback + '(' + JSON.stringify(data) + ')')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

3. Click **Save** (give the project any name, e.g. "UOMI Newsletter").

---

## Step 3 — Deploy as a Web App

1. Click **Deploy → New deployment**.
2. Click the gear icon ⚙ next to "Type" and select **Web app**.
3. Set the following:
   - **Execute as**: Me
   - **Who has access**: Anyone
4. Click **Deploy**.
5. If prompted, click **Authorize access** and follow the OAuth steps.
6. Copy the **Web App URL** — it looks like:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

---

## Step 4 — Paste the URL into script.js

Open `UOMI/script.js` and find this line near the top of the `newsletterPopup` function:

```javascript
var SCRIPT_URL = '';   // ← paste your Google Apps Script Web App URL here
```

Replace the empty string with your URL:

```javascript
var SCRIPT_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
```

Save, commit, and push to GitHub. Done — the popup will now write every new email to your Google Sheet.

---

## Downloading the Email List as Excel

1. Open the **UOMI Newsletter** Google Sheet.
2. Go to **File → Download → Microsoft Excel (.xlsx)**.

---

## How It Works

| Scenario | Result |
|---|---|
| New subscriber | All 5 fields saved to sheet; user sees "Thank you for subscribing!" |
| Same email again | Not added; user sees "This email is already subscribed." |
| Missing required field | Inline validation message, form not submitted |
| User clicks "No thanks" | Popup won't re-appear for 7 days |
| User already subscribed (same browser) | Popup never shows again |

---

## Customizing the Popup

All configuration is at the top of the `newsletterPopup` IIFE in `script.js`:

```javascript
var SCRIPT_URL   = '';   // Google Apps Script URL
var SHOW_DELAY   = 2500; // ms before popup appears (default: 2.5 s)
var DISMISS_DAYS = 7;    // days before re-showing after "No thanks"
```

To change the heading or description, search for `'Stay in the loop'` and `'Be the first to know'` in `script.js`.

The sex options are defined as `<option>` tags inside the popup HTML in `script.js` — search for `'Male'` to find them.
