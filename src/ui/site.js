// Shared chrome: logo, header, footer, helpers. All copy comes from business.js.
import { business } from "../data/business.js";
import { ALLERGEN_BY_ID } from "../engine/allergens.js";

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Logo: an S-shaped production line with a checkpoint at the changeover.
export const logoMark = (size = 30) => `
<svg width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true">
  <rect width="32" height="32" rx="8" fill="#1f5c45"/>
  <path d="M7 9.5H19.5a3.75 3.75 0 0 1 0 7.5H12.5a3.75 3.75 0 0 0 0 7.5H25" fill="none" stroke="#f6f2ea" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="7" cy="9.5" r="2" fill="#d9c9a3"/>
  <circle cx="16" cy="17" r="3.2" fill="#d8612a" stroke="#1f5c45" stroke-width="1.4"/>
  <circle cx="25" cy="24.5" r="2" fill="#d9c9a3"/>
</svg>`;

export function chip(id, pal = false) {
  const a = ALLERGEN_BY_ID[id];
  if (!a) return "";
  return `<span class="chip${pal ? " pal" : ""}" style="--c:${a.color}" title="${pal ? "May contain: " : ""}${esc(a.label)}"><i></i>${esc(a.label)}</span>`;
}

export function navItems(page) {
  const home = page === "home" ? "" : "/";
  const items = [
    ["Product", `${home}#product`],
    ["Solutions", `${home}#solutions`],
    ["How it works", `${home}#how`],
    ["Technology", `${home}#technology`],
    ["Pricing", `${home}#pricing`],
  ];
  if (business.founders.length) items.push(["Team", `${home}#team`]);
  if (business.email) items.push(["Contact", `${home}#contact`]);
  return items;
}

export function renderHeader(page = "home") {
  const el = document.querySelector("[data-header]");
  if (!el) return;
  const links = navItems(page).map(([l, h]) => `<li><a href="${h}">${l}</a></li>`).join("");
  const cta = page === "app"
    ? `<a class="btn ghost small" href="/">Back to site</a><a class="btn primary small" href="/app.html#report">Report</a>`
    : `<a class="btn ghost small" href="/#how">See how it works</a><a class="btn primary small" href="/app.html">Open the demo <span class="arrow">→</span></a>`;
  el.className = "site-header";
  el.innerHTML = `
    <div class="wrap nav">
      <a class="brand" href="/" aria-label="${esc(business.name)} home">${logoMark()}<span>${esc(business.name)}</span></a>
      <button class="menu-btn" aria-expanded="false" aria-controls="nav-panel" aria-label="Open menu">
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
      </button>
      <div class="nav-panel" id="nav-panel">
        <ul class="nav-links">${links}</ul>
        <div class="nav-cta">${cta}</div>
      </div>
    </div>`;
  const btn = el.querySelector(".menu-btn");
  const close = () => { el.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-label", "Open menu"); };
  btn.addEventListener("click", () => {
    const open = el.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  el.querySelectorAll(".nav-panel a").forEach((a) => a.addEventListener("click", close));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  const onScroll = () => el.classList.toggle("scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

export function renderFooter() {
  const el = document.querySelector("[data-footer]");
  if (!el) return;
  const year = new Date().getFullYear();
  const company = [
    business.founders.length && `<li><a href="/#team">Team</a></li>`,
    business.email && `<li><a href="mailto:${esc(business.email)}">${esc(business.email)}</a></li>`,
    business.linkedinUrl && `<li><a href="${esc(business.linkedinUrl)}" rel="noopener">LinkedIn</a></li>`,
    `<li><a href="/#technology">Architecture</a></li>`,
    `<li><a href="/#faq">FAQ</a></li>`,
  ].filter(Boolean).join("");
  el.className = "site-footer";
  el.innerHTML = `
    <div class="wrap">
      <div class="foot-grid">
        <div>
          <a class="brand" href="/">${logoMark(26)}<span>${esc(business.name)}</span></a>
          <p style="margin-top:14px;max-width:34ch">${esc(business.tagline)}</p>
          ${business.headquarters ? `<p class="muted">${esc(business.headquarters)}</p>` : ""}
        </div>
        <div><h4>Product</h4><ul>
          <li><a href="/#product">Capabilities</a></li>
          <li><a href="/#how">How it works</a></li>
          <li><a href="/app.html">Demo workspace</a></li>
          <li><a href="/#pricing">Pilot programme</a></li>
        </ul></div>
        <div><h4>Solutions</h4><ul>
          ${business.customers.slice(0, 4).map((c) => `<li><a href="/#solutions">${esc(c.name)}</a></li>`).join("")}
        </ul></div>
        <div><h4>Company</h4><ul>${company}</ul></div>
      </div>
      <div class="foot-base">
        <span>© ${year} ${esc(business.name)}. All rights reserved.</span>
        <span>SavorCline supports, and does not replace, your HACCP and allergen management procedures.</span>
      </div>
    </div>`;
}

export function initReveal() {
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px" });
  els.forEach((e) => io.observe(e));
}

export const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
export const fmtDate = (iso) => new Date(iso).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", year: "numeric" });
