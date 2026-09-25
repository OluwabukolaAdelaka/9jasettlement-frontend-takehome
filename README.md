# Swapr: multi-currency FX wallet

Hold balances in NGN, USD, GBP, EUR and JPY, watch live rates, and convert with a quote that is locked for 30 seconds.

- **Live app:** https://9jasettlement-frontend-takehome.vercel.app/
- **Debug panel:** add `?debug=1` to the URL (force a rates outage, force the next conversion to expire, reset balances)

## Setup

Requires Node.js 20+ (built and tested on Node 22).

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # all unit and component tests (Vitest)
npm run test:watch
npm run typecheck    # tsc --noEmit, strict mode
npm run lint
npm run build
```

No environment variables or external services. The mock API runs inside the app.

## Architecture

A single Next.js (App Router) app. The UI only talks to the mock API over HTTP (`fetch`), as it would with a real backend.

```
src/
  domain/       Pure logic: money, pricing, quote timing, rates, portfolio. No React, no fetch. Fully unit-tested.
  server/       The mock backend: in-memory state, pricing rules, quotes, conversions, debug switches.
  app/api/      Thin route handlers: parse the request -> call server/ -> respond.
  lib/api/      Typed fetch client, API types, and mappers from API strings to bigint.
  hooks/        Data and state hooks (TanStack Query): balances, rates, quote, confirm, history.
  components/   UI, split by feature: wallet/, rates/, convert/, history/, receipt/, debug/, ui/.
```

**Rules that keep it clean:**
- `domain/` is shared by the server and the browser. The quote endpoint and the live estimate call the same `priceConversion()`, so the estimate can't follow different rules from the quote.
- Components never import from `server/`. Money becomes a `bigint` at the API edge (`lib/api/mappers.ts`), so components never handle money strings or floats.
- Containers (`WalletCard`, `RatesCard`, `ConvertCard`, `HistoryCard`) fetch data and choose a state. Everything below them only renders.

**Libraries:**
| Library | Why |
|---|---|
| Next.js 16 + React 19 + TypeScript (strict) | Route handlers give a real HTTP boundary for the mock API and deploy to Vercel with no setup. |
| TanStack Query | Polling, retries, keeping the last good data on failure, and pausing when the tab is hidden, without hand-written timers. |
| big.js + native `BigInt` | `BigInt` for amounts in minor units; big.js only for rate maths (division, 8-dp rates). |
| Tailwind CSS 4 | Design tokens in one place (`globals.css`), fast responsive layout. |
| Vitest + Testing Library | Fast unit tests, plus component tests that run the real UI against the real route handlers. |

## Key decisions

### Money precision
- Amounts are `bigint` minor units everywhere in the app (kobo, cents, pence, whole yen), and integer strings on the wire. There are no floats in money maths.
- Rates are 8-dp strings. Rate maths uses big.js, then rounds to an integer minor unit once, in a deliberate direction:
  - **send amount → receive amount: rounded down**, so the user never receives more than the rate gives.
  - **receive amount → send amount: rounded up**, so the user always sends enough to receive what they asked for. A test checks this over hundreds of amounts.
  - **spread: rounded down** at 8 dp, so rounding never favours the user beyond the 0.5% spread.
  - **fee: 0.5% rounded up, minimum 1 minor unit**, in pure `BigInt`, charged on top (total debit = sell + fee).
- User input is parsed from text straight to minor units and rejected, not rounded, if it has too many decimals (for example `10.5` JPY).
- Display uses `Intl.NumberFormat` with `currencyDisplay: "narrowSymbol"`. Without it, en-US and en-GB browsers show "NGN 1,250.00" instead of "₦1,250.00". Values are passed to Intl as decimal strings, so very large balances are never rounded by float precision.
- **The receipt matches the quote exactly:** every amount on every screen goes through one `Money` component, and the receipt renders the server's own values.

### Quote countdown
- The time left is **worked out, not counted down**: `expiresAt − (Date.now() + clockOffset)`.
- `clockOffset` is estimated once, when the quote arrives, from `serverTime` and the midpoint of the request, which cancels most of the network delay. A wrong device clock doesn't affect the countdown.
- A 250 ms interval only triggers a re-render, and the value is always recalculated from `Date.now()`. It's also recalculated on `visibilitychange`, so after a backgrounded tab or a sleeping laptop the next frame is correct. A test moves the clock 22 s with no timers firing and checks the countdown.
- The time left is capped at the quote's lifetime, so a clock reading taken just before the quote arrived can't show "31s".
- Screen readers hear "quote locked", "under 10 seconds" and "expired", once each, from a live region that's always mounted.

### Stale rates
- TanStack Query keeps the last good data when a refresh fails, and rates also go through `mergeWithLastGood()`, so a blank, zero or malformed rate is **never shown**. The last good value stays instead.
- "Stale" means more than 15 s since the browser last received rates. It uses the browser's receive time, not the server timestamp, so a clock difference can't make fresh data look stale.
- Failed refreshes are retried automatically, and polling carries on. While refreshes are failing, the stale badge adds "retrying…" (based on `failureCount`, which is set from the first failure, not only after every retry fails).
- Polling pauses while the tab is hidden (`refetchIntervalInBackground: false`) and fetches immediately when it becomes visible (`refetchOnWindowFocus: "always"`).

### Double submission
Three layers, each enough on its own for the user-facing case:
1. **A ref checked synchronously** in the click handler, so a double-click or repeated Enter is ignored before React has even re-rendered.
2. **The button is disabled** and the inputs are locked (`<fieldset disabled>`) while submitting.
3. **One idempotency key per quote** (`crypto.randomUUID()`), reused if the user retries after a network error. The server returns the original result for a repeated key.

On the server, a quote can also be used only once, even with a different key, and every check runs before any balance changes, with no `await` between the checks and the update. A failed conversion can't move money, and two requests can't interleave.

## Decisions where the brief was open

| Question | Decision |
|---|---|
| What is the live estimate? | The same pricing as the quote (spread and fee) at the live mid-market rate, labelled "Estimate" with "≈". Showing mid-market alone would make every quote look worse than the estimate. |
| Fee currency | Charged in the sell currency, on top of the sell amount. |
| "New rate is worse" | Sending a fixed amount: worse if you'd receive less. Receiving a fixed amount: worse if you'd pay more (sell + fee). The difference is shown. |
| Expiry boundary | The server accepts a quote up to and including `expiresAt` ("past expiresAt" is expired). The UI treats 0 s left as expired, so it's the stricter of the two. |
| Portfolio total | Valued at mid-market rates and labelled "Estimated", rounded once at the end rather than per balance. |
| Reset balances (debug) | Restores balances only. History is kept, so earlier receipts still open. |
| Changing inputs during a quote | Any edit (amount, either currency, swap, send/receive) discards the quote immediately. |
| Swap button | Also flips send/receive, so the typed amount keeps its currency ("send 100 USD" becomes "receive 100 USD"). |
| Opening a receipt from history | Expands inline under the row (`aria-expanded`), which works well at 375px and with the keyboard. |

## Mock API

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/balances` | Integer strings in minor units |
| GET | `/api/rates?base=USD` | Every rate drifts ±0.5% per request; ~10% of requests return 503 |
| POST | `/api/quotes` | Exactly one of `sellAmount` / `buyAmount`; 0.5% spread; fee 0.5% rounded up, min 1; locked for 30 s |
| POST | `/api/conversions` | 410 `QUOTE_EXPIRED` past `expiresAt`; 422 `INSUFFICIENT_FUNDS`; idempotent by key |
| GET | `/api/conversions` | Newest first |
| GET/POST | `/api/debug` | Debug switches (used by the `?debug=1` panel) |

Every endpoint adds 200–1,500 ms of latency, except `/api/debug`. Errors use `{ "error": { "code", "message" } }`. Other codes: `INVALID_REQUEST`, `SAME_CURRENCY`, `AMOUNT_TOO_SMALL`, `QUOTE_NOT_FOUND`, `QUOTE_ALREADY_USED`, `IDEMPOTENCY_KEY_REUSED`, `INVALID_BASE`, `RATES_UNAVAILABLE`.

**In-memory state:** there's no database. State lives in the server process (on `globalThis`), so it resets when Vercel restarts the function, and separate function instances don't share it. To keep history across a page refresh anyway, each completed conversion is also saved in `localStorage` and merged with the server's list (one entry per ID, newest first). Balances come only from the server, so a restart resets them to the starting values.

## Testing

`npm test` runs about 180 tests. They target the risky logic:
- Money: parsing and formatting (JPY with 0 decimals, ₦ in every locale, very large values), fee rounding, spread, both conversion directions, and a never-under-deliver / never-overcharge property check.
- Time: clock offset, countdown after a sleep, a wrong client clock, the expiry boundary, and the 31 s cap.
- Server rules: fee and spread, insufficient funds including the fee, 410 past expiry, idempotency, single-use quotes, balances unchanged on every failure, and debug switches.
- Rates: direction detection at the 8th decimal, rejecting zero or blank rates, keeping the last good rate, drift staying within ±0.5%.
- Convert flow (component tests) run the real UI against the real route handlers, with only latency, 503s and drift turned off:
  - the receipt matches the quote
  - a double-click plus repeated Enter converts once
  - the countdown is correct after backgrounding, and expiry blocks confirm
  - a worse rate is highlighted after refresh
  - a server-side 410 leaves balances unchanged and offers a fresh quote
  - editing invalidates the quote
  - same-currency and over-balance conversions are blocked
  - the whole flow works with the keyboard only
- History: a conversion shows up, its receipt opens, and it survives a remount and a server restart.

## Accessibility and responsive layout
- Semantic landmarks, one `h1`, a labelled `h2` section per card, and a skip link.
- Every input and dropdown is labelled. Send/Receive is a radio group, and all controls are native.
- One visible focus ring everywhere. Focus follows the flow: to the quote when it arrives, to the result after confirming, and back to the amount field for a new conversion.
- Live regions for the quote (locked / under 10 s / expired), form errors and stale rates. Each is announced once, not on every tick or poll.
- Meaning never relies on colour alone (arrows and badges have text). Text contrast is at least 5.2:1. Reduced motion is respected.
- Works at 375px: long names shorten with "…", and the rates board hides its code badge on small screens.

## Trade-offs (what I chose not to do)
- No database. In-memory state, as the brief allows, plus a `localStorage` copy for history. Balances can reset when Vercel restarts the function.
- No stretch goals (sparkline, SSE, locale switcher, dark mode, Playwright). The brief favours a polished core, and I spent the time on correctness and tests instead.
- No end-to-end browser tests. The component tests cover the full flow against the real route handlers, but not a real browser.
- Mock API responses aren't schema-validated in the client. They're treated as a trusted boundary (typed, but not checked at runtime). Stored history *is* validated, because `localStorage` can hold anything.
- Polling, not streaming, for rates, as the brief specifies.

## Next steps (with another week)
- A shared store (Redis or Postgres) so balances and history survive restarts and all function instances agree.
- Runtime validation of API responses (for example zod), and generating the client types from one schema.
- Playwright tests for quote expiry, the debug panel, and the 375px layout in real browsers.
- A "Max" button that works out the largest amount the balance covers including the fee.
- The stretch goals: sparklines, streamed rates, a locale switcher and dark mode.

## AI usage
I used Claude Code (Anthropic) as a pair programmer for planning, scaffolding, writing code and tests, reviewing edge cases, and drafting this README. I directed the scope and order of work, reviewed and edited every change, committed each step myself, and tested the app in the browser (including 375px).

## Time spent
About 6 hours in total.
