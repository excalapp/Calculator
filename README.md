# FinTechCo Calculator

A mortgage and compound-interest calculator that runs entirely in the browser. Plain HTML, CSS and JavaScript, with [Chart.js](https://www.chartjs.org/) for the charts. No build step, no backend.

## Features

**Mortgage**
- Sliders (with exact-value inputs) for home price, down payment, interest rate, term and extra monthly principal
- Monthly principal & interest payment, loan amount, total interest, total of payments and payoff date
- Interest saved and time saved when you add extra principal
- Charts: principal vs. interest split, total interest paid over time (with a "no extra payments" comparison line), and principal vs. interest per year
- Full amortization schedule, yearly or monthly, with CSV export

**Savings growth**
- Starting balance, monthly contribution, annual return, years and compounding frequency (yearly, quarterly, monthly, daily)
- Optional yearly contribution increase and inflation adjustment
- Final balance, total deposited, interest earned, growth multiple, and the year interest overtakes your deposits
- Stacked chart of deposits vs. compound growth plus the inflation-adjusted balance
- Year-by-year table with CSV export

Also: light/dark theme (follows the system by default), keyboard-accessible controls, responsive down to phone width, and inputs remembered in `localStorage`.

## Run it

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 5173
```

Then visit http://localhost:5173. Use `#mortgage` or `#savings` in the URL to link straight to a tab.

## The math

- Monthly payment: `M = P·r(1+r)^n / ((1+r)^n − 1)`, where `r` is the monthly rate and `n` the number of payments (`M = P/n` at 0%).
- Savings are simulated month by month. Contributions land at the end of each month, and the chosen compounding frequency is converted to an equivalent monthly rate: `(1 + r/k)^(k/12) − 1`.

The core functions are exposed as `window.FinTechCo` (`monthlyPayment`, `amortize`, `growSavings`) for quick checks in the console.

Taxes, insurance, PMI and HOA dues are not included. Estimates are for planning only.
