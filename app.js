/* FinTechCo Calculator: mortgage amortization and compound savings growth.
   Pure client-side math; Chart.js renders the charts. */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const usdShort = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
  const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });

  const STORE_KEY = "fintechco-calculator-v1";
  const store = {
    read() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; } },
    write(data) { try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch { /* storage unavailable */ } },
  };

  /* ------------------------------------------------------------------ */
  /* Math                                                                */
  /* ------------------------------------------------------------------ */

  function monthlyPayment(principal, annualRate, months) {
    if (principal <= 0 || months <= 0) return 0;
    const r = annualRate / 100 / 12;
    if (r === 0) return principal / months;
    return (principal * r) / (1 - Math.pow(1 + r, -months));
  }

  // Returns one row per payment until the balance reaches zero.
  function amortize(principal, annualRate, years, extra = 0) {
    const r = annualRate / 100 / 12;
    const n = years * 12;
    const pmt = monthlyPayment(principal, annualRate, n);
    const rows = [];
    let balance = principal;
    let cumInterest = 0;

    for (let i = 1; i <= n && balance > 0.005; i++) {
      const interest = balance * r;
      let principalPart = Math.min(pmt - interest, balance);
      const extraPart = Math.min(extra, balance - principalPart);
      balance -= principalPart + extraPart;
      cumInterest += interest;
      rows.push({
        n: i,
        payment: principalPart + interest + extraPart,
        principal: principalPart + extraPart,
        extra: extraPart,
        interest,
        cumInterest,
        balance: Math.max(balance, 0),
      });
    }
    return { pmt, rows, totalInterest: cumInterest };
  }

  // Month-by-month simulation so any compounding frequency works with monthly deposits.
  function growSavings({ initial, monthly, rate, years, perYear, step, inflation }) {
    const monthlyRate = Math.pow(1 + rate / 100 / perYear, perYear / 12) - 1;
    const rows = [];
    let balance = initial;
    let deposited = initial;
    let contribution = monthly;

    for (let y = 1; y <= years; y++) {
      let yearInterest = 0;
      let yearDeposit = 0;
      for (let m = 0; m < 12; m++) {
        const interest = balance * monthlyRate;
        balance += interest + contribution;
        yearInterest += interest;
        yearDeposit += contribution;
      }
      deposited += yearDeposit;
      rows.push({
        year: y,
        deposit: yearDeposit,
        interest: yearInterest,
        deposited,
        earned: balance - deposited,
        balance,
        real: balance / Math.pow(1 + inflation / 100, y),
      });
      contribution *= 1 + step / 100;
    }
    return rows;
  }

  /* ------------------------------------------------------------------ */
  /* Inputs                                                              */
  /* ------------------------------------------------------------------ */

  const saved = store.read();

  function setRangeFill(range) {
    const min = +range.min, max = +range.max;
    const pct = ((+range.value - min) / (max - min)) * 100;
    range.style.setProperty("--pct", `${Math.min(100, Math.max(0, pct))}%`);
  }

  function decimalsFor(step) {
    const s = String(step);
    return s.includes(".") ? s.split(".")[1].length : 0;
  }

  // Each slider has a twin number box with id `${id}-n`. The number box can go
  // beyond the slider's range up to 10x its max; the slider simply pins at its end.
  function bindPair(id, onChange) {
    const range = $("#" + id);
    const box = $("#" + id + "-n");
    const dec = decimalsFor(range.step);
    const hardMax = +range.max * 10;
    if (saved[id] != null) range.value = saved[id];
    let value = +(saved[id] ?? range.value);

    const show = () => { box.value = value.toFixed(dec); };
    range.addEventListener("input", () => {
      value = +range.value;
      show(); setRangeFill(range); onChange();
    });
    box.addEventListener("input", () => {
      const v = parseFloat(box.value);
      if (Number.isNaN(v)) return;
      value = Math.min(Math.max(v, +range.min), hardMax);
      range.value = value; setRangeFill(range); onChange();
    });
    box.addEventListener("blur", show);
    show(); setRangeFill(range);
    return { get: () => value, id };
  }

  function bindSegmented(id, onChange) {
    const group = $("#" + id);
    const buttons = $$("button", group);
    const select = (val) => {
      group.dataset.value = val;
      buttons.forEach((b) => {
        const on = b.dataset.value === String(val);
        b.setAttribute("aria-checked", on);
        b.tabIndex = on ? 0 : -1;
      });
    };
    buttons.forEach((b, i) => {
      b.addEventListener("click", () => { select(b.dataset.value); onChange(); });
      b.addEventListener("keydown", (e) => {
        const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!dir) return;
        e.preventDefault();
        const next = buttons[(i + dir + buttons.length) % buttons.length];
        next.focus(); next.click();
      });
    });
    select(saved[id] ?? group.dataset.value);
    return { get: () => group.dataset.value, id };
  }

  /* ------------------------------------------------------------------ */
  /* Charts                                                              */
  /* ------------------------------------------------------------------ */

  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const alpha = (hex, a) => {
    const h = hex.replace("#", "");
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };

  function palette() {
    return {
      ink: css("--ink"), muted: css("--muted"), line: css("--line"), surface: css("--surface"),
      principal: css("--principal"), interest: css("--interest"), deposit: css("--deposit"), growth: css("--growth"),
    };
  }

  function baseOptions(p) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 350 },
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "bottom", align: "start", labels: { color: p.muted, usePointStyle: true, pointStyle: "rectRounded", boxWidth: 10, boxHeight: 10, padding: 16 } },
        tooltip: {
          backgroundColor: p.ink, titleColor: p.surface, bodyColor: p.surface, padding: 10, cornerRadius: 4,
          callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${usd0.format(ctx.parsed.y ?? ctx.parsed)}` },
        },
      },
      scales: {
        x: { grid: { display: false }, border: { color: p.line }, ticks: { color: p.muted, maxRotation: 0, autoSkipPadding: 14 } },
        y: { grid: { color: p.line }, border: { display: false }, ticks: { color: p.muted, callback: (v) => usdShort.format(v) }, beginAtZero: true },
      },
    };
  }

  Chart.defaults.font.family = '"Roboto", system-ui, sans-serif';
  Chart.defaults.font.size = 12;

  const charts = {};

  function buildCharts() {
    Object.values(charts).forEach((c) => c.destroy());
    const p = palette();

    charts.split = new Chart($("#m-chart-split"), {
      type: "doughnut",
      data: { labels: ["Principal", "Interest"], datasets: [{ data: [1, 1], backgroundColor: [p.principal, p.interest], borderColor: p.surface, borderWidth: 3, hoverOffset: 4 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: "72%",
        plugins: {
          legend: baseOptions(p).plugins.legend,
          tooltip: { ...baseOptions(p).plugins.tooltip, callbacks: { label: (ctx) => ` ${ctx.label}: ${usd0.format(ctx.parsed)}` } },
        },
      },
    });

    charts.balance = new Chart($("#m-chart-balance"), {
      type: "line",
      data: {
        labels: [],
        datasets: [
          { label: "Total interest paid", data: [], borderColor: p.interest, backgroundColor: alpha(p.interest, 0.18), fill: "origin", tension: 0.3, pointRadius: 0, borderWidth: 2.5 },
          { label: "Interest with no extra payments", data: [], borderColor: p.interest, borderDash: [5, 5], fill: false, tension: 0.3, pointRadius: 0, borderWidth: 1.5, hidden: true },
          { label: "Remaining balance", data: [], borderColor: p.principal, backgroundColor: "transparent", tension: 0.3, pointRadius: 0, borderWidth: 2.5 },
        ],
      },
      options: (() => {
        const o = baseOptions(p);
        // The "no extra payments" comparison line only appears in the legend while it is shown.
        o.plugins.legend.labels.filter = (item) => !item.hidden;
        return o;
      })(),
    });

    const stacked = baseOptions(p);
    stacked.scales.x.stacked = true;
    stacked.scales.y.stacked = true;
    charts.years = new Chart($("#m-chart-years"), {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          { label: "Principal", data: [], backgroundColor: p.principal, borderRadius: 3, maxBarThickness: 28 },
          { label: "Interest", data: [], backgroundColor: p.interest, borderRadius: 3, maxBarThickness: 28 },
        ],
      },
      options: stacked,
    });

    const sav = baseOptions(p);
    sav.scales.x.stacked = true;
    sav.scales.y.stacked = true;
    charts.savings = new Chart($("#s-chart"), {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          { label: "Your deposits", data: [], backgroundColor: p.deposit, borderRadius: 3, maxBarThickness: 28, order: 2 },
          { label: "Interest earned", data: [], backgroundColor: p.growth, borderRadius: 3, maxBarThickness: 28, order: 2 },
          { type: "line", label: "Balance in today’s dollars", data: [], borderColor: p.ink, backgroundColor: p.ink, borderDash: [4, 4], borderWidth: 1.5, pointRadius: 0, tension: 0.3, stack: "real", order: 1 },
        ],
      },
      options: sav,
    });
  }

  /* ------------------------------------------------------------------ */
  /* Mortgage                                                            */
  /* ------------------------------------------------------------------ */

  const m = {};
  let mortgageState = null;

  function addMonths(ym, k) {
    const [y, mo] = ym.split("-").map(Number);
    return new Date(y, mo - 1 + k, 1);
  }

  function defaultStart() {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  function monthsLabel(k) {
    const y = Math.floor(k / 12), mo = k % 12;
    return [y && `${y} yr`, mo && `${mo} mo`].filter(Boolean).join(" ") || "0 mo";
  }

  function renderMortgage() {
    const price = m.price.get();
    const downPct = m.down.get();
    const rate = m.rate.get();
    const years = +m.term.get();
    const extra = m.extra.get();
    const start = $("#m-start").value || defaultStart();

    const down = Math.min(price, (price * downPct) / 100);
    const loan = Math.max(price - down, 0);
    const plan = amortize(loan, rate, years, extra);
    const base = extra > 0 ? amortize(loan, rate, years, 0) : plan;
    const months = plan.rows.length;
    const totalPaid = loan + plan.totalInterest;

    $("#m-down-amt").textContent = usd0.format(down);
    $("#m-payment").textContent = usd2.format(plan.pmt);
    $("#m-payment-sub").textContent = extra > 0
      ? `${usd2.format(plan.pmt + extra)} with your extra ${usd0.format(extra)}`
      : `${years * 12} payments at ${rate.toFixed(2)}% APR`;
    $("#m-loan").textContent = usd0.format(loan);
    $("#m-interest").textContent = usd0.format(plan.totalInterest);
    $("#m-total").textContent = usd0.format(totalPaid);
    $("#m-payoff").textContent = months ? monthFmt.format(addMonths(start, months - 1)) : "—";

    const savedPill = $("#m-saved");
    const interestSaved = base.totalInterest - plan.totalInterest;
    if (extra > 0 && interestSaved > 0.5) {
      savedPill.hidden = false;
      savedPill.innerHTML = `Paying ${usd0.format(extra)} extra each month saves <strong>${usd0.format(interestSaved)}</strong> in interest and pays the loan off <strong>${monthsLabel(base.rows.length - months)}</strong> early.`;
    } else {
      savedPill.hidden = true;
    }

    const ratio = totalPaid > 0 ? plan.totalInterest / totalPaid : 0;
    $("#m-ratio").textContent = `${Math.round(ratio * 100)}%`;

    // Yearly roll-up (loan years, 12 payments each)
    const yearly = [];
    for (let i = 0; i < plan.rows.length; i += 12) {
      const chunk = plan.rows.slice(i, i + 12);
      const last = chunk[chunk.length - 1];
      yearly.push({
        year: i / 12 + 1,
        from: addMonths(start, i),
        to: addMonths(start, i + chunk.length - 1),
        payment: chunk.reduce((s, r) => s + r.payment, 0),
        principal: chunk.reduce((s, r) => s + r.principal, 0),
        interest: chunk.reduce((s, r) => s + r.interest, 0),
        cumInterest: last.cumInterest,
        balance: last.balance,
      });
    }
    const baseCum = [];
    for (let i = 11; i < base.rows.length + 11; i += 12) baseCum.push(base.rows[Math.min(i, base.rows.length - 1)].cumInterest);

    // Charts
    charts.split.data.datasets[0].data = [loan, plan.totalInterest];
    charts.split.update();

    const span = Math.max(yearly.length, extra > 0 ? baseCum.length : 0);
    const labels = Array.from({ length: span + 1 }, (_, i) => (i === 0 ? "Start" : `Yr ${i}`));
    charts.balance.data.labels = labels;
    charts.balance.data.datasets[0].data = [0, ...yearly.map((y) => y.cumInterest)];
    charts.balance.data.datasets[1].data = [0, ...baseCum];
    charts.balance.data.datasets[1].hidden = !(extra > 0);
    charts.balance.data.datasets[2].data = [loan, ...yearly.map((y) => y.balance)];
    charts.balance.update();

    charts.years.data.labels = yearly.map((y) => `Yr ${y.year}`);
    charts.years.data.datasets[0].data = yearly.map((y) => y.principal);
    charts.years.data.datasets[1].data = yearly.map((y) => y.interest);
    charts.years.update();

    mortgageState = { plan, yearly, start };
    renderMortgageTable();
    persist();
  }

  function renderMortgageTable() {
    if (!mortgageState) return;
    const { plan, yearly, start } = mortgageState;
    const view = m.view.get();
    const tbody = $("#m-table tbody");
    let html = "";
    if (view === "yearly") {
      // First year where principal paid overtakes interest
      const cross = yearly.findIndex((y) => y.principal > y.interest);
      yearly.forEach((y, i) => {
        html += `<tr${i === cross && i > 0 ? ' class="milestone" title="Principal now outpaces interest"' : ""}>
          <td>Year ${y.year}<small>${monthFmt.format(y.from)} – ${monthFmt.format(y.to)}</small></td>
          <td>${usd0.format(y.payment)}</td><td>${usd0.format(y.principal)}</td>
          <td class="c-int">${usd0.format(y.interest)}</td><td>${usd0.format(y.cumInterest)}</td><td>${usd0.format(y.balance)}</td></tr>`;
      });
    } else {
      plan.rows.forEach((r) => {
        html += `<tr><td>#${r.n}<small>${monthFmt.format(addMonths(start, r.n - 1))}</small></td>
          <td>${usd2.format(r.payment)}</td><td>${usd2.format(r.principal)}</td>
          <td class="c-int">${usd2.format(r.interest)}</td><td>${usd2.format(r.cumInterest)}</td><td>${usd2.format(r.balance)}</td></tr>`;
      });
    }
    tbody.innerHTML = html || `<tr><td colspan="6">No loan to amortize. Lower the down payment to borrow something.</td></tr>`;
  }

  function exportMortgageCSV() {
    if (!mortgageState) return;
    const { plan, start } = mortgageState;
    const lines = [["Payment #", "Date", "Payment", "Principal", "Extra principal", "Interest", "Total interest", "Balance"]];
    plan.rows.forEach((r) => {
      const d = addMonths(start, r.n - 1);
      lines.push([r.n, `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        r.payment, r.principal - r.extra, r.extra, r.interest, r.cumInterest, r.balance].map((v) => (typeof v === "number" && !Number.isInteger(v) ? v.toFixed(2) : v)));
    });
    download("amortization-schedule.csv", lines);
  }

  /* ------------------------------------------------------------------ */
  /* Savings                                                             */
  /* ------------------------------------------------------------------ */

  const s = {};
  let savingsRows = [];

  function renderSavings() {
    const params = {
      initial: s.initial.get(),
      monthly: s.monthly.get(),
      rate: s.rate.get(),
      years: Math.round(s.years.get()),
      perYear: +s.comp.get(),
      step: s.step.get(),
      inflation: s.infl.get(),
    };
    const rows = growSavings(params);
    savingsRows = rows;
    const last = rows[rows.length - 1] || { balance: params.initial, deposited: params.initial, earned: 0, real: params.initial };

    $("#s-eyebrow").textContent = `Balance after ${params.years} ${params.years === 1 ? "year" : "years"}`;
    $("#s-final").textContent = usd0.format(last.balance);
    $("#s-real").textContent = `${usd0.format(last.real)} in today’s dollars at ${params.inflation}% inflation`;
    $("#s-contrib").textContent = usd0.format(last.deposited);
    $("#s-earned").textContent = usd0.format(last.earned);
    $("#s-multiple").textContent = last.deposited > 0 ? `${(last.balance / last.deposited).toFixed(2)}×` : "—";
    const cross = rows.find((r) => r.earned > r.deposited);
    $("#s-cross").textContent = cross ? `Year ${cross.year}` : "Not yet";

    charts.savings.data.labels = rows.map((r) => `Yr ${r.year}`);
    charts.savings.data.datasets[0].data = rows.map((r) => r.deposited);
    charts.savings.data.datasets[1].data = rows.map((r) => r.earned);
    charts.savings.data.datasets[2].data = rows.map((r) => r.real);
    charts.savings.update();

    $("#s-table tbody").innerHTML = rows.map((r) => `<tr${cross && r.year === cross.year ? ' class="milestone" title="Interest earned now exceeds everything you deposited"' : ""}>
      <td>Year ${r.year}</td><td>${usd0.format(r.deposit)}</td><td class="c-grow">${usd0.format(r.interest)}</td>
      <td>${usd0.format(r.deposited)}</td><td class="c-grow">${usd0.format(r.earned)}</td><td>${usd0.format(r.balance)}</td><td>${usd0.format(r.real)}</td></tr>`).join("");

    persist();
  }

  function exportSavingsCSV() {
    const lines = [["Year", "Deposited this year", "Interest this year", "Total deposited", "Total interest", "Balance", "Balance in today's dollars"]];
    savingsRows.forEach((r) => lines.push([r.year, r.deposit, r.interest, r.deposited, r.earned, r.balance, r.real].map((v, i) => (i ? v.toFixed(2) : v))));
    download("savings-growth.csv", lines);
  }

  /* ------------------------------------------------------------------ */
  /* Shared                                                              */
  /* ------------------------------------------------------------------ */

  function download(name, rows) {
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  let ready = false;
  function persist() {
    if (!ready) return;
    const data = {};
    [...Object.values(m), ...Object.values(s)].forEach((f) => { data[f.id] = f.get(); });
    data["m-start"] = $("#m-start").value;
    data.tab = currentTab;
    data.theme = document.documentElement.dataset.theme || "";
    store.write(data);
  }

  // Tabs
  let currentTab = "mortgage";
  function showTab(name, focus = false) {
    if (!["mortgage", "savings"].includes(name)) name = "mortgage";
    currentTab = name;
    $$(".tab").forEach((t) => {
      const on = t.dataset.tab === name;
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    $("#panel-mortgage").hidden = name !== "mortgage";
    $("#panel-savings").hidden = name !== "savings";
    if (location.hash !== "#" + name) history.replaceState(null, "", "#" + name);
    persist();
  }

  // Theme: system → light → dark → system
  function applyTheme(t) {
    if (t) document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
    $("#theme-btn").title = `Theme: ${t || "system"}`;
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */

  applyTheme(saved.theme || "");
  buildCharts();

  m.price = bindPair("m-price", renderMortgage);
  m.down = bindPair("m-down", renderMortgage);
  m.rate = bindPair("m-rate", renderMortgage);
  m.extra = bindPair("m-extra", renderMortgage);
  m.term = bindSegmented("m-term", renderMortgage);
  m.view = bindSegmented("m-view", renderMortgageTable);
  $("#m-start").value = saved["m-start"] || defaultStart();
  $("#m-start").addEventListener("change", renderMortgage);
  $("#m-csv").addEventListener("click", exportMortgageCSV);

  s.initial = bindPair("s-initial", renderSavings);
  s.monthly = bindPair("s-monthly", renderSavings);
  s.rate = bindPair("s-rate", renderSavings);
  s.years = bindPair("s-years", renderSavings);
  s.step = bindPair("s-step", renderSavings);
  s.infl = bindPair("s-infl", renderSavings);
  s.comp = bindSegmented("s-comp", renderSavings);
  $("#s-csv").addEventListener("click", exportSavingsCSV);

  $$("form").forEach((f) => f.addEventListener("submit", (e) => e.preventDefault()));

  $$(".tab").forEach((t, i, all) => {
    t.addEventListener("click", () => showTab(t.dataset.tab));
    t.addEventListener("keydown", (e) => {
      const dir = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (dir) { e.preventDefault(); showTab(all[(i + dir + all.length) % all.length].dataset.tab, true); }
    });
  });
  window.addEventListener("hashchange", () => showTab(location.hash.slice(1)));

  $("#theme-btn").addEventListener("click", () => {
    const order = ["", "light", "dark"];
    const cur = document.documentElement.dataset.theme || "";
    applyTheme(order[(order.indexOf(cur) + 1) % order.length]);
    buildCharts(); renderMortgage(); renderSavings(); persist();
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    buildCharts(); renderMortgage(); renderSavings();
  });

  showTab(location.hash.slice(1) || saved.tab || "mortgage");
  renderMortgage();
  renderSavings();
  ready = true;
  persist();

  // Exposed for quick checks in the console.
  window.FinTechCo = { monthlyPayment, amortize, growSavings };
})();
