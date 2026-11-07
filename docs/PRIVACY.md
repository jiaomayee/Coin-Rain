# Privacy policy for Coin-Rain

**Effective date:** 7 November 2026
**Last updated:** 7 November 2026

## Summary

Coin-Rain is a small, always-on-top Windows desktop widget that turns a monthly income figure into an endless coin rain and a running total. It is an offline, single-user application. We do not collect, transmit, sell or share any personal information. The developer (ZanYu Studio) operates no server, no account system and no analytics pipeline for this app.

This policy applies to the Microsoft Store version of Coin-Rain and to the equivalent build published in the project's open-source repository.

## Information we do not collect

We do not collect or have access to any of the following:

- Name, email address, phone number, postal address, government ID or payment details
- Contacts, photos, files, documents, microphone or camera input
- Location, IP address, device identifiers, advertising IDs or purchase history
- Keystrokes, screenshots, usage telemetry, crash reports or diagnostic logs
- Clipboard contents (see the one-way exception below)

## What is stored on your device

The app keeps a single local JSON configuration file in its Electron user-data folder (for Store/MSIX installs, Windows redirects this into the app's private per-user data container). It contains only:

- The derived per-second earnings rate and the workday/hour basis used to compute it — the monthly income you type is used for the calculation and is **never written to disk**
- The running total and the timestamp used to advance it while the app is open
- Display preferences: theme, particle shape, density, fall speed, effects, cheer frequency, idle delay, immersive mode and always-on-top toggles
- Interface language, selected currency and a first-run completion flag
- Milestone progress

Nothing in this file leaves your device. It is not synced, uploaded or shared with other users.

## Network access and external links

The app makes no HTTP requests, opens no sockets, and contains no auto-updater, telemetry, analytics or advertising SDK. It works fully offline.

The only outbound action happens when **you deliberately click** one of the credit links ("View on GitHub", the repository link on the first-run screen, or "View on GitHub" in the tray menu). In that case:

- Windows is asked to open a fixed, `https`-only URL from an allowlist (`github.com`, `workbuddy.cn`) in your default browser
- The "Copy link" button writes that same URL to the Windows clipboard

No application data, identifier or query parameter is attached to those URLs. Once your browser opens the destination site, that site's own privacy policy applies. Coin-Rain itself receives nothing back.

## Third parties

Coin-Rain embeds no third-party SDK, analytics service, crash reporter, ad network or remote content. Electron and its bundled Chromium runtime are used locally and are not configured to contact any service on our behalf. Microsoft may process standard installation, licensing and diagnostic data under the Microsoft Privacy Statement when you acquire the app from the Store.

## Your controls

- **Reset total** — the in-app button clears the running total and milestone progress
- **Remove everything** — uninstall the app; a Store install removes its private data container, or you can delete the local data folder manually
- **Change preferences** — every display, language and currency option can be changed at any time in Style Studio

## Children

Coin-Rain is a general-audience entertainment widget and is not directed at children under 13. It contains no user-generated content, social features, chat, advertising, in-app purchases or external content feeds.

## Not a financial tool

Currency conversion uses a static, built-in reference table for demonstration only. All figures shown are illustrative and must not be used for payroll, accounting, tax, invoicing or trading decisions.

## Changes to this policy

If this policy changes, the revised version will be published at the same URL with an updated effective date. The app contains no mechanism that can silently change its data-handling behaviour without a new Store submission.

## Contact

Questions about this policy can be raised as an issue in the public repository: <https://github.com/jiaomayee/Coin-Rain/issues>
