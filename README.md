# Meher Container Load Calculator - Firebase Hosted

This folder is the hosted/team version of the calculator.

## What It Uses

- Firebase Hosting for the webpage.
- Firestore for browser-side team PIN records.
- Firestore for shared regional masters, vendor directory, and settings.
- Logo/settings are stored in Firestore for the Spark/free version. Firebase Storage can be enabled later if needed.

## Spark / Free Mode Note

This version is configured for Firebase Spark/free plan, so it does not deploy Cloud Functions or secrets.

The PIN gate is checked in the browser against Firestore. This is simple for team sharing, but not as secure as a backend-validated login. Upgrade to Blaze later if you want strict server-side PIN validation.

## First Deploy

Install dependencies:

```powershell
npm install
```

Deploy:

```powershell
npm run deploy
```

## First Admin PIN

When no active admin PIN exists yet, the app accepts `8421` as the first admin PIN. Log in with `8421`, open Admin, and create normal planner/viewer/admin PINs for the team. After an active admin PIN exists, use the admin-created PINs.

## Recommended Roles

- `admin`: manage part masters, vendor directory, settings, and team PINs.
- `planner`: calculate and export files.
- `viewer`: open shared data without editing/exporting.

## Important

Do not publish sensitive business files in the project folder. Upload/order files are still parsed in the browser.
