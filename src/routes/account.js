// src/routes/account.js
const express = require("express");
const crypto = require("crypto");
const { get, run } = require("../db");

// layout helpers (escapeHtml kan in jouw runtime anders heten => fallback)
const layoutModule = require("../ui/layout");
const layout = layoutModule.layout;
const layoutDemo = layoutModule.layoutDemo;

// ✅ Fallback: als escapeHtml niet bestaat of geen function is, gebruik deze lokale.
const escapeHtml =
  typeof layoutModule.escapeHtml === "function"
    ? layoutModule.escapeHtml
    : function escapeHtmlFallback(v) {
        return String(v ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      };

const router = express.Router();

/* =========================
   Helpers
   ========================= */

function renderWithDemoLayout(title, leftHtml, options = {}) {
  // ✅ layoutDemo kan 2 of 3 params hebben; we geven altijd options mee
  if (typeof layoutDemo === "function") return layoutDemo(title, leftHtml, options);
  return layout(title, leftHtml);
}

function isLikelyEmail(v) {
  const s = String(v || "").trim();
  return s.length >= 5 && s.includes("@") && s.includes(".");
}

function makeDemoSessionId() {
  return crypto.randomBytes(16).toString("hex");
}

/* ===== Password hashing (zonder extra deps) ===== */

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  try {
    const parts = String(stored || "").split("$");
    if (parts.length !== 3) return false;
    const [algo, salt, hash] = parts;
    if (algo !== "scrypt") return false;

    const test = crypto.scryptSync(String(password), salt, 64).toString("hex");
    const a = Buffer.from(test, "hex");
    const b = Buffer.from(hash, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 dagen
  };
}

function setDemoCookies(res, demoSessionId) {
  res.cookie("demo_account", "1", cookieOpts());
  res.cookie("demo_session", demoSessionId, cookieOpts());
}

/* =========================
   Views
   ========================= */

function renderLanding() {
  return renderWithDemoLayout(
    "DEMO — START",
    `
      <div class="demo-kicker">DEMO UITTESTEN <br> IN 5 STAPPEN</div>

      <p class="demo-lead">
        <b>Deze demo toont hoe Punctoo werkt in de praktijk.</b><br>
        Je doorloopt de volledige flow: account → onderneming → werknemers → ScanTags/QR → smartphone koppelen.<br>
        <i>Beperkt tot 2 werknemers (demo).</i>
      </p>

      <div class="demo-title">Start</div>

      <div class="demo-actions" style="display:flex; gap:12px; flex-wrap:wrap;">
        <a class="demo-btn primary" href="/demo/signup">ACCOUNT AANMAKEN (start wizard)</a>
        <a class="demo-btn ghost" href="/demo/login">REEDS ACCOUNT? LOGIN</a>
      </div>
    `,
    { width: 850 }
  );
}

function renderLogin({ error = "", email = "" } = {}) {
  const errorHtml = error
    ? `<div class="demo-alert" role="alert">${escapeHtml(error)}</div>`
    : "";

  return renderWithDemoLayout(
    "DEMO — LOGIN",
    `
      <img
        src="/static/logo_punctoo_groot_opgeel.png"
        alt="Punctoo"
        style="width:260px; height:auto; margin-bottom:18px;"
      />

      <div class="demo-title">LOGIN (rapporten bekijken)</div>

      <p class="demo-lead">
        Log in met het e-mailadres en paswoord van je demo-account.<br />
        Nog geen account?
        <a href="/demo/signup" class="demo-link">Maak eerst een account aan</a>.
      </p>

      ${errorHtml}

      <form class="demo-formtwee" method="POST" action="/demo/login">
        <label class="demo-label">E-mail</label>
        <input class="demo-input" name="email" type="email"
          placeholder="bv. jan@bedrijf.be"
          value="${escapeHtml(email)}" required />

        <label class="demo-label">Paswoord</label>
        <input class="demo-input" name="password" type="password" required />

        <div class="demo-actions" style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="demo-btn primary" type="submit">LOGIN</button>
          <a class="demo-btn ghost" href="/demo/account">TERUG</a>
          <a class="demo-btn ghost" href="/demo/logout">UITLOGGEN</a>
        </div>
      </form>
    `,
    { width: 850 }
  );
}

function renderSignup({ error = "", email = "" } = {}) {
  const errorHtml = error
    ? `<div class="demo-alert" role="alert">${escapeHtml(error)}</div>`
    : "";

  return renderWithDemoLayout(
    "DEMO — ACCOUNT AANMAKEN",
    `
      <div class="demo-kicker">DEMO UITTESTEN <br> IN 5 STAPPEN</div>

      <p class="demo-lead">
        <b>Deze demo toont hoe Punctoo werkt in de praktijk.</b><br>
        Je doorloopt in 5 stappen het volledige proces:
        van account en werknemers aanmaken tot het scannen en opmaken van een rapport.<br>
        <i>De demo is beperkt tot 2 werknemers.</i>
      </p>

      <div class="demo-title">Stap 1/5: ACCOUNT AANMAKEN</div>

      <p class="demo-lead">
        Kies een e-mailadres als login en vul je paswoord twee keer in.
      </p>

      ${errorHtml}

      <form class="demo-formtwee" method="POST" action="/demo/signup">
        <label class="demo-label">E-mail</label>
        <input class="demo-input" name="email" type="email"
          placeholder="bv. jan@bedrijf.be"
          value="${escapeHtml(email)}" required />

        <label class="demo-label">Paswoord</label>
        <input class="demo-input" name="password" type="password" required />

        <label class="demo-label">Herhaal paswoord</label>
        <input class="demo-input" name="password2" type="password" required />

        <div class="demo-actions" style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="demo-btn primary" type="submit">ACCOUNT AANMAKEN</button>
          <a class="demo-btn ghost" href="/demo/account">TERUG</a>
          <a class="demo-btn ghost" href="/demo/login">REEDS ACCOUNT? LOGIN</a>
        </div>
      </form>
    `,
    { width: 850 }
  );
}

/* =========================
   Routes
   ========================= */

// ✅ Landing voor de demo
router.get("/demo", (req, res) => res.redirect("/demo/account"));
router.get("/demo/account", (req, res) => res.send(renderLanding()));

// ✅ Login (enkel login, geen wizard)
router.get("/demo/login", (req, res) => res.send(renderLogin()));

router.post("/demo/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!isLikelyEmail(email)) {
    return res.status(400).send(renderLogin({ error: "Vul een geldig e-mailadres in.", email }));
  }
  if (password.length < 6) {
    return res.status(400).send(renderLogin({ error: "Paswoord moet minstens 6 tekens zijn.", email }));
  }

  const existing = await get(
    `SELECT password_hash, demo_session_id
     FROM demo_accounts
     WHERE email=$1
     LIMIT 1`,
    [email]
  );

  if (!existing) {
    return res.status(404).send(
      renderLogin({
        error: "Geen account gevonden voor dit e-mailadres. Maak eerst een account aan.",
        email,
      })
    );
  }

  const ok = verifyPassword(password, existing.password_hash);
  if (!ok) {
    return res.status(401).send(renderLogin({ error: "Fout paswoord.", email }));
  }

  setDemoCookies(res, existing.demo_session_id);

  // ✅ Nieuwe flow: login = alleen rapporten (geen aanpassingen meer in de demo)
  return res.redirect("/reports");
});

// ✅ Signup start de wizard
router.get("/demo/signup", (req, res) => res.send(renderSignup()));

router.post("/demo/signup", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const password2 = String(req.body.password2 || "");

  if (!isLikelyEmail(email)) {
    return res.status(400).send(renderSignup({ error: "Vul een geldig e-mailadres in.", email }));
  }
  if (password.length < 6) {
    return res.status(400).send(renderSignup({ error: "Paswoord moet minstens 6 tekens zijn.", email }));
  }
  if (password !== password2) {
    return res.status(400).send(renderSignup({ error: "Paswoorden komen niet overeen.", email }));
  }

  const exists = await get(`SELECT 1 FROM demo_accounts WHERE email=$1 LIMIT 1`, [email]);
  if (exists) {
    return res.status(409).send(
      renderSignup({ error: "Dit e-mailadres heeft al een account. Ga naar login.", email })
    );
  }

  const demoSessionId = makeDemoSessionId();
  const passwordHash = hashPassword(password);

  await run(
    `INSERT INTO demo_accounts (email, password_hash, demo_session_id)
     VALUES ($1,$2,$3)`,
    [email, passwordHash, demoSessionId]
  );

  setDemoCookies(res, demoSessionId);

  // ✅ Signupp start de wizard-flow
  return res.redirect("/wizard/company");
});

router.get("/demo/logout", (req, res) => {
  res.clearCookie("demo_account");
  res.clearCookie("demo_session");
  return res.redirect("/demo/account");
});

module.exports = router;
