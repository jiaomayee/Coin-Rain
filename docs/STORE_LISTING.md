# Microsoft Store submission copy for Coin-Rain

Working notes for filling in the Partner Center submission pages. All customer-facing text below is in English. **Descriptions must not contain URLs** — Partner Center rejects them. Keep the privacy policy URL in its own dedicated field only.

---

## 0. Store identity (confirmed from Partner Center)

| Field | Value |
| --- | --- |
| Product name | `Coin-Rain` |
| Package/Identity/Name | `ZanYuStudio.Coin-Rain` |
| Package/Identity/Publisher | `CN=3B4E628D-9FA8-44F4-AEA2-1207A18F1FF4` |
| Package/Properties/PublisherDisplayName | `ZanYu Studio` |
| Store ID | `9P4QC0KH7HX2` |

`dist/Coin-Rain 1.0.0.appx` has been rebuilt with exactly these values. Because the reserved identity contains a dash, `appx.applicationId` is set separately to `ZanYuStudio.CoinRain` — MSIX only permits letters, digits and periods in an Application Id. Do not change either value without rebuilding the package.

---

## 1. Pricing and availability

| Field | Value |
| --- | --- |
| Pricing | Free |
| Markets | All available markets (default) |
| Visibility | Public / discoverable in the Store |
| Release date | As soon as certification completes |
| Free trial, sale price, rental | None |

---

## 2. Properties

- **Category:** `Productivity` (alternative: `Entertainment`; it is a desktop companion, not a game)
- **Subcategory / secondary category:** optional — leave empty if no suitable value is offered (Partner Center marks both as Not required)
- **Keywords / search terms:** `coin rain`, `desktop widget`, `income`, `always on top`, `motivation`, `relaxing`, `offline`, `countdown`
- **Hardware / system requirements:** Windows 10 version 1809 or later, x64. No special hardware.
- **Package family / restricted capability:** see `runFullTrust` justification in section 6.

### Privacy policy (mandatory for this app)

The Properties page asks "Does your product access, collect or transmit personal information?" On this submission the answer **must stay `Yes`**, and **"Provide a privacy policy URL"** must stay selected. Choosing `No` (or switching to "Provide privacy policy text" without pasting the full text) and clicking Save silently reverts, and the red "This submission requires a privacy policy" warning stays.

This is not a UI bug. Microsoft Store Policy 10.5.1 states that product types which inherently have access to personal information — explicitly including Desktop Bridge and Win32 products — must always have a privacy policy. Once the `.appx` is uploaded, Partner Center detects `runFullTrust` (the only capability in this package manifest) and locks the answer. `Yes` describes the app's capability, not an admission that data is uploaded; the policy text itself correctly states that nothing is collected or transmitted.

**Privacy policy URL — paste exactly:**

`https://github.com/jiaomayee/Coin-Rain/blob/main/docs/PRIVACY.md`

Verified HTTP 200, publicly reachable, and the online file contains the full policy. Alternative plain-text URL: `https://raw.githubusercontent.com/jiaomayee/Coin-Rain/main/docs/PRIVACY.md` (some Chinese corporate networks cannot resolve that host; it is a local restriction only). A URL is preferred over pasting policy text because the document can be updated without a new submission.

- **Support info (optional):** Website — `https://github.com/jiaomayee/Coin-Rain/issues`. Contact details are only mandatory for business/company developer accounts; if the page marks them required, fill them in.

---

## 3. Age ratings

Answer **No** to every question in the age-rating questionnaire: no violence, no blood, no sexual content, no drugs/alcohol/tobacco, no gambling, no user-generated content, no online interaction, no sharing of location or personal data, no advertising, no in-app purchases. Expected rating: suitable for all ages.

---

## 4. Packages

- Upload **only** `dist/Coin-Rain 1.0.0.appx` (the unsigned, Store-only build). Microsoft re-signs it during certification.
- Do **not** upload `dist-sideload/CoinRain-LocalTest.appx` — its identity carries a local-test suffix and will be rejected.
- Do **not** sign the package yourself.
- Version stays `1.0.0.0` (four segments, last segment zero is required for Store packages).
- Supported languages declared by the package: `en-US`, `zh-CN`, `zh-TW`, `ja-JP`.

---

## 5. Store listings

### Product name
`Coin-Rain` (must exactly match the reserved product name)

### Short description (for the summary line)
`A tiny desktop widget that turns your income into an endless coin rain.`

### Full description — paste as-is

```
Coin-Rain is a tiny, always-on-top desktop widget that turns a monthly income figure into an endless, gently falling coin rain. Enter a number once, then watch your running total grow second by second while coins melt into a progress bar on their way down. It is a light-hearted way to make a long workday feel a little more rewarding.

How it works
Set a monthly income using the standard 21.75 workdays x 8 hours basis. The app derives a per-second rate and accumulates a running total from timestamps while it is open. Coins fall straight down: on the filled part of the bar they splash and melt in, and on the empty part they are pulled through a little tube into the filled area. Small cheer messages and milestone goals keep the mood playful.

Made for idle moments
The app starts as a compact 260 x 210 window that sits on your desktop. Drag the bottom edge to make it taller. After a few seconds without mouse movement the title bar slides away and the coin rain fills the whole window; move the pointer back and the controls return. Pause, reset the total, or hide everything from the tray at any time.

Your style
Four themes, three particle shapes, adjustable density, fall speed, effects, cheer frequency and idle delay. Switch the interface between English, Simplified Chinese, Traditional Chinese and Japanese, and display the total in any of 13 currencies using built-in offline reference rates.

Privacy first
No account, no login, no network requests. Your monthly income is never written to disk — only the derived rate, the running total and your display preferences are kept locally. The app does not add earnings for the time it was closed. The only outbound action is a deliberate click on the open-source credits, which opens a fixed link in your default browser.

Coin-Rain is an open-source project under the MIT license, developed with WorkBuddy and Tencent Hunyuan Hy4. Figures are illustrative and are not intended for payroll, accounting or trading use.
```

### Screenshots (ready to upload)

Five PNG files in `docs/store/`, all **1920 x 1080**, built from real captures of the packaged build in English / USD:

| File | Shows |
| --- | --- |
| `01-desktop-widget.png` | Mini widget, coins falling and melting into the progress bar, running total |
| `02-immersive.png` | Immersive mode with the title bar retracted |
| `03-style-studio.png` | Expanded Style Studio with income, themes and language settings |
| `04-first-run.png` | First-run language / currency wizard |
| `05-open-source.png` | Open Source card, MIT license and ZanYu Studio copyright |

Upload at least one; uploading all five is recommended. The older `docs/preview.png` and `docs/open-source.png` are small README crops and are **not** valid Store screenshots.

### Privacy policy URL

This field belongs to the **Properties** page, not to Store listings — see section 2 for the exact URL and why the answer cannot be set to `No`.

### Other listing fields

- **Support contact / website:** use the repository's Issues page as the support URL if a contact field is required
- **Additional listing languages:** add `zh-CN`, `zh-TW` and `ja-JP` if you want localised Store pages; English alone is sufficient for submission
- **What's new:** `Initial release.` (only shown on updates)

---

## 6. Submission options and notes

### Restricted capability justification (required because the manifest declares `runFullTrust`)

```
This is a packaged Win32 desktop application built with Electron. The runFullTrust capability is required for the desktop executable to launch and to provide the always-on-top widget window, tray icon and local settings storage. The app makes no network requests, installs no drivers, does not modify system settings outside its own data, and does not auto-start without the user enabling that option in the tray menu.
```

### Notes for certification testers

```
1. On first launch, choose a language and currency on the setup screen (defaults are English and USD) and click Start earning.
2. In Style Studio, enter any monthly income and click Set. The running total begins increasing and coins start falling.
3. Drag the bottom edge of the window to resize it; leave the pointer still for a few seconds to see immersive mode.
4. The app is fully offline: no login, no network access, no telemetry. Optional credit links only open in the default browser when clicked.
5. The app is a Store-only unsigned MSIX/AppX package; Windows Defender and firewall prompts are not expected.
```

### Submission options

- **Automatic updates / graded rollout:** leave defaults
- **Manual publication after certification:** optional, useful if you want to check the Store page first
- **Stop acquiring for older OS versions:** leave defaults

---

## Common rejection causes for this app

- Publisher identity values (`identityName`, `publisher`, `publisherDisplayName`) not copied verbatim from Partner Center → Product identity (**resolved** in the current build; see section 0)
- Reserved product name not exactly `Coin-Rain`
- Uploading the self-signed local-test package instead of the unsigned Store package
- Screenshots below 1366 x 768, or a missing privacy policy URL
- Empty `runFullTrust` justification in Submission options
