# Newsletter Setup Guide

The newsletter popup is fully built. It shows on every page 2.5 seconds after load, includes a waving figure, and detects duplicate emails. To start collecting emails into a Google Sheet (downloadable as `.xlsx`), follow these steps once.

---

## Step 1 — Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new blank spreadsheet.
2. Name it **UOMI Newsletter**.
3. In row 1, add these headers:

| A | B | C | D | E |
|---|---|---|---|---|
| Email | Name | Country | Sex | Age |

(`Age` stores the date of birth from the form.)


Leave all other rows empty — the script will fill them automatically.

---

## Step 2 — Create the Google Apps Script

1. In the sheet, go to **Extensions → Apps Script**.
2. Delete any existing code and paste the following:

```javascript
var SPREADSHEET_ID = '1kijPBOhZoxQ-u-Dl1rNa6X-_GuTmvZrLR5eOavtk2sY';

function doGet(e) {
  e = e || {};
  var p  = e.parameter || {};
  var cb = p.callback  || 'callback';

  try {
    var email   = (p.email   || '').toLowerCase().trim();
    var name    = (p.name    || '').trim();
    var country = (p.country || '').trim();
    var sex     = (p.sex     || '').trim();
    var age     = (p.age     || '').trim();

    Logger.log('Received: ' + email);

    if (!email) {
      return jsonp(cb, {status: 'error', msg: 'No email'});
    }

    var sheet   = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    var lastRow = sheet.getLastRow();

    if (lastRow >= 2) {
      var existing = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < existing.length; i++) {
        if (existing[i][0].toString().toLowerCase().trim() === email) {
          Logger.log('Duplicate: ' + email);
          return jsonp(cb, {status: 'duplicate'});
        }
      }
    }

    // Columns match sheet: Email | Name | Country | Sex | Age
    sheet.appendRow([email, name, country, sex, age]);
    Logger.log('Saved: ' + email);
    return jsonp(cb, {status: 'success'});

  } catch (err) {
    Logger.log('ERROR: ' + err.toString());
    return jsonp(cb, {status: 'error', msg: err.toString()});
  }
}

function jsonp(callback, data) {
  return ContentService
    .createTextOutput(callback + '(' + JSON.stringify(data) + ')')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

// ── Select testWrite in dropdown → Run (NOT doGet) ──
function testWrite() {
  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
  sheet.appendRow(['test2@uomi.art', 'Test User', 'Spain', 'Male', '1990-01-01']);
  Logger.log('testWrite OK');
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

## Troubleshooting

### Error: `Cannot read properties of undefined (reading 'parameter')`

You ran **`doGet`** from the editor (Run button). That function expects a web request with URL parameters — when run manually, `e` is undefined.

**Fix:** In the function dropdown at the top, select **`testWrite`** (not `doGet`) and click Run. You should see `testWrite OK` in the log and a new row in the sheet.

### Data not appearing after form submit

1. **Redeploy after every code change:** Deploy → Manage deployments → Edit (pencil) → Version: **New version** → Deploy. Saving alone does not update the live URL.
2. **Test the URL in the browser** (replace with your deployment URL):

```
https://script.google.com/macros/s/YOUR_ID/exec?email=test@uomi.art&name=Test&country=Spain&sex=Male
```

You should see `ok` on the page and a new row in the sheet.

3. Check **Executions** in the left sidebar of Apps Script for errors.

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
