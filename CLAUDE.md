# FinTechCo Calculator

Mortgage and compound-interest calculator. Static site: `index.html`, `styles.css`, `app.js`, with Chart.js loaded from cdnjs. No build step, no package.json, no backend.

## Working on it
- Keep it plain HTML/CSS/JavaScript. Don't add frameworks, bundlers or npm dependencies.
- All colors are CSS tokens on `:root` with dark-mode overrides; use tokens, not literal colors.
- Math lives in `monthlyPayment`, `amortize` and `growSavings` in `app.js`, exposed as `window.FinTechCo`.
- Check syntax with `node --check app.js` before committing.
- Preview locally with `python3 -m http.server 5173`.

## Deploys
Every push to `main` deploys to https://excalapp.github.io/Calculator/ via `.github/workflows/deploy.yml`. Only `index.html`, `styles.css` and `app.js` are published; if you add a file the page needs, add it to the copy step there too.
