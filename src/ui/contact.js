// Early-access form: validation, then POST to business.formEndpoint if set, otherwise a pre-filled email.
// Never shows success for a request that was not sent.
import { business } from "../data/business.js";

const form = document.querySelector("[data-lead-form]");
if (form) {
  const $ = (s) => form.querySelector(s);
  const status = $("[data-status]");
  const plan = new URLSearchParams(location.search).get("plan");
  if (plan && [...form.plan.options].some((o) => o.value === plan || o.text === plan)) form.plan.value = plan;
  form.message.addEventListener("input", () => { $("[data-count]").textContent = form.message.value.length; });

  const FREE = /@(gmail|googlemail|yahoo|hotmail|outlook|live|icloud|aol|proton|protonmail|gmx|mail)\./i;
  const setErr = (k, msg) => {
    const el = $(`[data-err="${k}"]`); if (el) el.textContent = msg || "";
    const input = form.elements[k]; if (input) input.setAttribute("aria-invalid", msg ? "true" : "false");
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form.website.value) return; // honeypot
    const v = Object.fromEntries(new FormData(form));
    const errs = {
      name: (v.name || "").trim().length < 2 && "Please enter your full name.",
      email: !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v.email || "").trim()) ? "Enter a valid email address." : FREE.test(v.email) && "Please use your work email.",
      company: !(v.company || "").trim() && "Company is required.",
      size: !v.size && "Select a company size.",
      use: !v.use && "Select a primary use case.",
      message: !(v.message || "").trim() && "Tell us briefly what you would like to check.",
      consent: !v.consent && "Please agree so we can reply to you.",
    };
    Object.entries(errs).forEach(([k, m]) => setErr(k, m));
    const first = Object.keys(errs).find((k) => errs[k]);
    if (first) { form.elements[first].focus(); status.textContent = ""; return; }

    const payload = { name: v.name.trim(), email: v.email.trim(), company: v.company.trim(), role: (v.role || "").trim(), companySize: v.size, plan: v.plan || "", useCase: v.use, message: v.message.trim(), consent: true, source: business.domain };
    const btn = $("[data-submit]");
    btn.disabled = true; status.className = "form-status"; status.textContent = "Sending…";
    if (business.formEndpoint) {
      try {
        const r = await fetch(business.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) });
        if (!r.ok) throw new Error(String(r.status));
        form.innerHTML = `<div class="sent"><h2>Thanks, your request was sent.</h2><p>We'll reply to ${payload.email.replace(/</g, "&lt;")}.</p></div>`;
      } catch {
        status.className = "form-status bad";
        status.textContent = business.email ? `We couldn't send your request. Please email ${business.email} directly.` : "We couldn't send your request. Please try again later.";
        btn.disabled = false;
      }
      return;
    }
    if (business.email) {
      const body = `Name: ${payload.name}\nEmail: ${payload.email}\nCompany: ${payload.company}\nRole: ${payload.role || "-"}\nCompany size: ${payload.companySize}\nPlan of interest: ${payload.plan || "-"}\nPrimary use case: ${payload.useCase}\n\n${payload.message}`;
      location.href = `mailto:${business.email}?subject=${encodeURIComponent(`${business.name} early access: ${payload.company}`)}&body=${encodeURIComponent(body)}`;
      status.textContent = `Your email app should have opened with the request ready. Press send there. If nothing opened, email ${business.email}.`;
      btn.disabled = false;
      return;
    }
    status.className = "form-status bad";
    status.textContent = "The request form isn't connected yet, so nothing was sent. Please try again later.";
    btn.disabled = false;
  });

  const note = document.createElement("p");
  note.className = "hint";
  note.textContent = business.formEndpoint ? "" : business.email ? `Your request opens as a pre-filled email to ${business.email}.` : "";
  if (note.textContent) $("[data-submit]").after(note);
}
