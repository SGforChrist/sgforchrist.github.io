/* ============================================================================
   Dependency-free SVG charts — works as a plain static GitHub Pages site.
   ============================================================================ */
const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}
function makeScale(domain, range) {
  const [d0, d1] = domain, [r0, r1] = range;
  return (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
}

let tooltipEl = null;
function getTooltip() {
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.className = "chart-tooltip";
    document.body.appendChild(tooltipEl);
  }
  return tooltipEl;
}
function showTooltip(evt, html) {
  const t = getTooltip();
  t.innerHTML = html;
  t.style.left = (evt.pageX + 14) + "px";
  t.style.top = (evt.pageY - 14) + "px";
  t.classList.add("is-visible");
}
function hideTooltip() { if (tooltipEl) tooltipEl.classList.remove("is-visible"); }

const COHORT_COLORS = {
  "Turned 15–19 in 2000": "#6E93B8",
  "Turned 15–19 in 2010": "#8F9B72",
  "Turned 15–19 in 2015": "#D9A441",
  "Turned 15–19 in 2020": "#C56A3B",
  "Turned 15–19 in 2025": "#B23A2E",
};

/* ============================================================================
   CENTREPIECE — Growth-window cohort lines.
   ============================================================================ */
function drawGrowthWindow(mountId, opts = {}) {
  const mount = document.getElementById(mountId);
  if (!mount) return;
  const w = mount.clientWidth || 640;
  const h = opts.height || 380;
  const margin = { top: 24, right: 68, bottom: 40, left: 42 };
  const innerW = w - margin.left - margin.right;
  const innerH = h - margin.top - margin.bottom;

  const svg = svgEl("svg", { viewBox: `0 0 ${w} ${h}`, width: "100%", height: h, role: "img" });
  mount.innerHTML = "";
  mount.appendChild(svg);

  const x = makeScale([2000, 2025], [margin.left, margin.left + innerW]);
  const y = makeScale([7, 14], [margin.top + innerH, margin.top]);

  [8, 10, 12, 14].forEach((v) => {
    const ly = y(v);
    svg.appendChild(svgEl("line", { x1: margin.left, x2: margin.left + innerW, y1: ly, y2: ly, stroke: "var(--ink-line)", "stroke-width": 1 }));
    const lbl = svgEl("text", { x: margin.left - 8, y: ly + 4, "text-anchor": "end", "font-family": "var(--font-mono)", "font-size": "10.5", fill: "var(--text-on-ink-dim)" });
    lbl.textContent = v + "%";
    svg.appendChild(lbl);
  });
  [2000, 2005, 2010, 2015, 2020, 2025].forEach((yr) => {
    const lbl = svgEl("text", { x: x(yr), y: h - 10, "text-anchor": "middle", "font-family": "var(--font-mono)", "font-size": "10.5", fill: "var(--text-on-ink-dim)" });
    lbl.textContent = yr;
    svg.appendChild(lbl);
  });

  const highlight = opts.highlight || null;

  Object.entries(COHORT_LINES).forEach(([name, coh]) => {
    const color = COHORT_COLORS[name];
    const faded = highlight && highlight !== name;
    const op = faded ? 0.14 : 1;
    const pts = coh.points;

    if (pts.length > 1) {
      const peakIdx = pts.reduce((mi, p, i) => (p[1] > pts[mi][1] ? i : mi), 0);
      if (peakIdx > 0) {
        const dGrow = pts.slice(0, peakIdx + 1).map((p, i) => `${i === 0 ? "M" : "L"} ${x(p[0])} ${y(p[1])}`).join(" ");
        svg.appendChild(svgEl("path", { d: dGrow, fill: "none", stroke: color, "stroke-width": faded ? 2 : 4, "stroke-linecap": "round", opacity: op }));
      }
      const dDecl = pts.slice(peakIdx).map((p, i) => `${i === 0 ? "M" : "L"} ${x(p[0])} ${y(p[1])}`).join(" ");
      svg.appendChild(svgEl("path", { d: dDecl, fill: "none", stroke: color, "stroke-width": faded ? 1.5 : 2.4, "stroke-linecap": "round", opacity: op }));
    }

    pts.forEach((p, i) => {
      const c = svgEl("circle", { cx: x(p[0]), cy: y(p[1]), r: faded ? 2 : (i === 0 ? 5 : 3.5), fill: color, opacity: op, style: "cursor:pointer" });
      c.addEventListener("mousemove", (e) => showTooltip(e, `<strong>${name}</strong> (${coh.born})<br>${p[0]} · age ${coh.ages[i]} · ${p[1].toFixed(1)}%`));
      c.addEventListener("mouseleave", hideTooltip);
      svg.appendChild(c);
    });

    if (!faded) {
      const last = pts[pts.length - 1];
      const yr = last[0];
      if (x(yr) + 40 < w) {
        const tag = svgEl("text", { x: x(yr) + 8, y: y(last[1]) + 4, "font-family": "var(--font-mono)", "font-size": "10.5", fill: color, "font-weight": "600", opacity: op });
        tag.textContent = String(name.match(/\d{4}/)[0]);
        svg.appendChild(tag);
      }
    }
  });
}

function initGrowthWindowSelector() {
  const btns = document.querySelectorAll(".cohort-btn");
  if (!btns.length) return;
  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      btns.forEach((b) => { b.classList.remove("is-active"); b.setAttribute("aria-selected", "false"); });
      btn.classList.add("is-active");
      btn.setAttribute("aria-selected", "true");
      const h = btn.dataset.cohort === "all" ? null : btn.dataset.cohort;
      drawGrowthWindow("growth-window", { height: 380, highlight: h });
    });
  });
}

/* ============================================================================
   Cross-sectional bars (snapshot view)
   ============================================================================ */
function drawSnapshotBars(mountId) {
  const mount = document.getElementById(mountId);
  if (!mount) return;
  const w = mount.clientWidth || 640;
  const h = 320;
  const margin = { top: 16, right: 16, bottom: 44, left: 40 };
  const innerW = w - margin.left - margin.right;
  const innerH = h - margin.top - margin.bottom;

  const svg = svgEl("svg", { viewBox: `0 0 ${w} ${h}`, width: "100%", height: h });
  mount.innerHTML = "";
  mount.appendChild(svg);

  const ageBands = ["15-19", "20-24", "25-29", "30-34", "35-39", "40-44"];
  const years = [2000, 2010, 2015, 2020, 2025];
  const yearColor = { 2000: "#5B6274", 2010: "#7A8298", 2015: "#8A93A6", 2020: "#D9A441", 2025: "#B23A2E" };
  const y = makeScale([0, 15], [margin.top + innerH, margin.top]);

  [0, 5, 10, 15].forEach((v) => {
    const ly = y(v);
    svg.appendChild(svgEl("line", { x1: margin.left, x2: margin.left + innerW, y1: ly, y2: ly, stroke: "var(--ink-line)", "stroke-width": 1 }));
    const lbl = svgEl("text", { x: margin.left - 8, y: ly + 4, "text-anchor": "end", "font-family": "var(--font-mono)", "font-size": "10.5", fill: "var(--text-on-ink-dim)" });
    lbl.textContent = v + "%";
    svg.appendChild(lbl);
  });

  const groupW = innerW / ageBands.length;
  const barW = (groupW - 10) / years.length;
  ageBands.forEach((band, gi) => {
    years.forEach((yr, yi) => {
      const val = AGE_PCT_BY_YEAR[yr] && AGE_PCT_BY_YEAR[yr][band];
      if (val === undefined) return;
      const bx = margin.left + gi * groupW + yi * barW + 5;
      const by = y(val);
      const bh = (margin.top + innerH) - by;
      const rect = svgEl("rect", { x: bx, y: by, width: barW - 1.5, height: bh, fill: yearColor[yr], opacity: yr === 2025 ? 1 : 0.85, rx: 1 });
      rect.addEventListener("mousemove", (e) => showTooltip(e, `<strong>${band}</strong><br>${yr}: ${val.toFixed(1)}%`));
      rect.addEventListener("mouseleave", hideTooltip);
      svg.appendChild(rect);
    });
    const lbl = svgEl("text", { x: margin.left + gi * groupW + groupW / 2, y: margin.top + innerH + 20, "text-anchor": "middle", "font-family": "var(--font-mono)", "font-size": "11", fill: "var(--text-on-ink-dim)" });
    lbl.textContent = band;
    svg.appendChild(lbl);
  });
}

/* ============================================================================
   Age-band table — clears tbody before populating
   ============================================================================ */
function populateAgeBandTable() {
  const tbody = document.getElementById("age-band-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";
  AGE_BAND_CHANGE_2020_2025.forEach((row) => {
    const tr = document.createElement("tr");
    if (["15–19", "20–24", "25–29"].includes(row.band)) tr.className = "row-youth";
    tr.innerHTML = `<td>${row.band}</td><td>${row.y2020.toFixed(1)}%</td><td>${row.y2025.toFixed(1)}%</td><td>${row.change.toFixed(1)}pp</td>`;
    tbody.appendChild(tr);
  });
}

/* ============================================================================
   Education gradient
   ============================================================================ */
function drawEducationChart(mountId) {
  const mount = document.getElementById(mountId);
  if (!mount) return;
  const w = mount.clientWidth || 340;
  const h = 200;
  const margin = { top: 16, right: 20, bottom: 28, left: 36 };
  const innerW = w - margin.left - margin.right;
  const innerH = h - margin.top - margin.bottom;

  const svg = svgEl("svg", { viewBox: `0 0 ${w} ${h}`, width: "100%", height: h });
  mount.innerHTML = "";
  mount.appendChild(svg);

  const years = [2010, 2020, 2025];
  const vals = years.map((yr) => BY_EDUCATION.christian_university_grads[yr]);
  const x = makeScale([2010, 2025], [margin.left, margin.left + innerW]);
  const y = makeScale([20, 34], [margin.top + innerH, margin.top]);

  [20, 25, 30].forEach((v) => {
    const ly = y(v);
    svg.appendChild(svgEl("line", { x1: margin.left, x2: margin.left + innerW, y1: ly, y2: ly, stroke: "var(--paper-line)", "stroke-width": 1 }));
    const lbl = svgEl("text", { x: margin.left - 8, y: ly + 4, "text-anchor": "end", "font-family": "var(--font-mono)", "font-size": "10", fill: "var(--text-on-paper-dim)" });
    lbl.textContent = v + "%";
    svg.appendChild(lbl);
  });

  const d = years.map((yr, i) => `${i === 0 ? "M" : "L"} ${x(yr)} ${y(vals[i])}`).join(" ");
  svg.appendChild(svgEl("path", { d, fill: "none", stroke: "var(--signal)", "stroke-width": 2.4, "stroke-linecap": "round" }));
  years.forEach((yr, i) => {
    const c = svgEl("circle", { cx: x(yr), cy: y(vals[i]), r: 4, fill: "var(--signal)", style: "cursor:pointer" });
    c.addEventListener("mousemove", (e) => showTooltip(e, `<strong>${yr}</strong><br>${vals[i]}% of graduates Christian`));
    c.addEventListener("mouseleave", hideTooltip);
    svg.appendChild(c);
    const lbl = svgEl("text", { x: x(yr), y: h - 8, "text-anchor": "middle", "font-family": "var(--font-mono)", "font-size": "10.5", fill: "var(--text-on-paper-dim)" });
    lbl.textContent = yr;
    svg.appendChild(lbl);
  });
}

/* ============================================================================
   Scroll reveal + nav highlight
   ============================================================================ */
function initReveal() {
  if (!("IntersectionObserver" in window)) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("revealed"); obs.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
}

function initNavHighlight() {
  const links = Array.from(document.querySelectorAll(".header-nav a"))
    .filter((a) => (a.getAttribute("href") || "").startsWith("#"));
  const map = links.map((a) => ({ a, id: a.getAttribute("href").slice(1) }));
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) map.forEach((m) => m.a.classList.toggle("is-current", m.id === e.target.id));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  map.forEach((m) => { const s = document.getElementById(m.id); if (s) obs.observe(s); });
}

/* ============================================================================
   INIT
   ============================================================================ */
function renderAll() {
  drawGrowthWindow("growth-window", { height: 380 });
  drawSnapshotBars("snapshot-bars");
  populateAgeBandTable();
  drawEducationChart("education-chart");
}

document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  initGrowthWindowSelector();
  initReveal();
  initNavHighlight();
});

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const active = document.querySelector(".cohort-btn.is-active");
    const h = active && active.dataset.cohort !== "all" ? active.dataset.cohort : null;
    drawGrowthWindow("growth-window", { height: 380, highlight: h });
    drawSnapshotBars("snapshot-bars");
    drawEducationChart("education-chart");
  }, 200);
});
