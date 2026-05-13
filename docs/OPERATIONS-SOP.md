# Standard Operating Procedure — Meher Container Load Planner (Firebase)

This SOP covers routine operations for the **container-load-calculator-firebase** app: **deploy**, **verify**, **tests**, and **Firestore hygiene**. Adjust names if your clone lives in a different folder.

---

## 1. Roles and access

| Role | Typical tasks |
|------|-----------------|
| **Maintainer** | Deploy hosting/rules, run full test suite, change Firestore rules |
| **Planner / Admin** | Use the app with team PIN; no deploy required |

**Prerequisites on the maintainer machine**

- Node.js **LTS** (v18+ recommended)
- **Firebase CLI** (project uses `firebase-tools` via `npm install`)
- Access to Firebase project **`container-loader-ceb56`** (or your target project)
- Logged in: `firebase login`

---

## 2. One-time / new machine setup

From the project root (`container-load-calculator-firebase`):

```bash
npm install
npm run playwright:install
```

Confirm Firebase project:

```bash
firebase projects:list
firebase use
```

Expected hosting site (default in this repo): **`meher-container-loader`** on project **`container-loader-ceb56`**.

---

## 3. Standard release (UI / `index.html` changes)

### 3.1 Pre-deploy checks (recommended)

```bash
npm test
npm run test:smoke
```

Optional full E2E (includes planner tests only if `SMOKE_PLANNER_PIN` is set — see Section 5):

```bash
npm run test:all
```

### 3.2 Deploy Hosting + Firestore rules

When you changed **`index.html`** and/or **`firestore.rules`**:

```bash
firebase deploy --only hosting,firestore:rules
```

Or use npm scripts from `package.json`:

```bash
npm run deploy
```

### 3.3 Post-deploy verification

1. Open **https://meher-container-loader.web.app** (or your `SMOKE_BASE_URL`).
2. Hard refresh: **Ctrl+F5** (Windows) or clear cache if assets look stale.
3. Smoke checks:
   - Page title contains **Meher**
   - **Step 1** visible, region dropdown works
   - Sign in with a **Planner or Admin** PIN and confirm **Add Part** / **Calculate** enable after catalog load
4. Run **Calculate** on a small known plan; confirm **results** and **Summary PDF** (if used in your workflow).

### 3.4 If deploy fails

- Read CLI error (auth, project, network).
- Re-run `firebase login`.
- Confirm `firebase use` points at the correct project.
- For rules compile errors: fix `firestore.rules`, redeploy **firestore:rules** only:

```bash
firebase deploy --only firestore:rules
```

---

## 4. Firestore rules only (no HTML)

```bash
firebase deploy --only firestore:rules
```

Validate in Console: **Firestore → Rules** shows the deployed revision time.

---

## 5. Automated tests (reference)

| Command | Purpose |
|---------|---------|
| `npm test` | Unit checks (`tests/unit.mjs`) |
| `npm run test:smoke` | Playwright public smoke (`tests/e2e/smoke.spec.cjs`) |
| `npm run test:e2e` | All Playwright tests |
| `npm run test:planner` | Planner flow only (`tests/e2e/planner-full.spec.cjs`) |
| `npm run test:all` | Unit + full Playwright |

**Planner E2E** requires:

- Env **`SMOKE_PLANNER_PIN`** = valid Planner or Admin PIN  
- Optional **`SMOKE_REGION`** (default `USA`) — region document must contain usable catalog parts  

**PowerShell example**

```powershell
$env:SMOKE_PLANNER_PIN = "YOUR_PIN"
$env:SMOKE_REGION = "USA"
npm run test:planner
```

**Custom URL**

```powershell
$env:SMOKE_BASE_URL = "https://meher-container-loader.web.app"
npm run test:e2e
```

---

## 6. Data and storage hygiene (optional)

- **Regional masters:** `meherRegions/{USA|AUS|EU|NZ}` — team catalog data.
- **Vendor directory:** `vendorDirectory/{vendorCode}` — display names.
- **Settings:** `settings/global` — shared settings (e.g. pallet max, logo refs).
- **Vendor uploads log:** `vendorOrderUploads` — metadata rows from Step 2.
- **Legacy `plans` collection:** The in-app **Save Plan** feature was removed. Old documents (if any) still consume storage until **deleted in Console** or via a one-off script.

**SOP:** If you agree no history is needed, delete obsolete `plans` documents in Firebase Console → Firestore → Data.

---

## 7. Security and secrets

- Do **not** commit real PINs, service account keys, or `.env` with secrets into git.
- Use **CI secrets** (GitHub Actions, etc.) for `SMOKE_PLANNER_PIN` if E2E runs in CI.
- Firestore rules in this repo are permissive for development; tightening rules for production should be a **separate change** with review.

---

## 8. Rollback (Hosting)

Firebase Hosting keeps prior releases.

1. Open [Firebase Console](https://console.firebase.google.com/) → project → **Hosting**.
2. Open **Release history** for site **`meher-container-loader`**.
3. **Roll back** to the last known-good release.

Firestore rules rollback: redeploy a known-good `firestore.rules` from git history.

---

## 9. Record-keeping (recommended)

After each production deploy, log:

- **Date / time (UTC)**
- **Git commit** or tag
- **Who** deployed
- **What** changed (one line)
- **Smoke test** result (pass/fail)

---

## 10. Quick checklist (copy for tickets)

- [ ] `npm test` pass  
- [ ] `npm run test:smoke` pass  
- [ ] `firebase deploy --only hosting,firestore:rules` (or scoped subset)  
- [ ] Live site smoke (hard refresh, sign-in, one calculation)  
- [ ] Release note / commit message updated  

---

*Document version: aligned with removal of in-app “Save Plan” and current npm scripts. Update this SOP when deploy targets or test layout change.*
