// src/routes/account.js
const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

// Verwacht: db helper(s) in ../db met run/get/all of iets gelijkaardigs.
// Pas dit eventueel aan aan jouw db-wrapper.
const db = require("../db");

// --------------------
// Helpers
// --------------------
function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Als jij al een layout helper hebt (renderWithDemoLayout), kan je dit vervangen.
// Dit is bewust “klassiek” en self-contained.
function renderDemoPage(title, innerHtml) {
  return `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/static/demo.css" />
</head>
<body>
  <div class="demo-shell">
    <div class="demo-left">
      ${innerHtml}
    </div>
    <div class="demo-right"></div>
  </div>
</body>
</html>`;
}

function cookieOptions(req) {
  // Railway draait https → secure cookie ok.
  // Lokaal (http) moet secure false zijn.
  const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";

  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
    path: "/", // ✅ CRUCIAAL: cookie zichtbaar voor /wizard/*
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 dagen
  };
}

function newDemoSessionId() {
  // 32 hex chars
  return crypto.randomBytes(16).toString("hex");
}

async function dbRun(sql, params) {
  if (typeof db.run === "function") return db.run(sql, params);
  // fallback: pg Pool interface
  return db.query(sql, params);
}

async function dbGet(sql, params) {
  if (typeof db.get === "function") return db.get(sql, params);
  const r = await db.query(sql, params);
  return r.rows?.[0] || null;
}

// --------------------
// Router
// --------------------
const router = express.Router();

// LANDING: /demo/account
router.get("/demo/account", (req, res) => {
  const html = renderDemoPage(
    "DEMO",
    `
    <div class="demo-block">
      <img
        src="/static/logo_punctoo_groot_opgeel.png"
        alt="MyPunctoo"
        style="width:260px; height:auto; margin-bottom:18px;"
      />

      <div class="demo-title">DEMO UITTTESTEN<br/>IN 5 STAPPEN</div>

      <p class="demo-lead">
        <b>Deze demo toont hoe Punctoo werkt in de praktijk.</b><br/>
        Je doorloopt de volledige flow: account → onderneming → werknemers → ScanTags/QR → smartphone koppelen.<br/>
        <i>Beperkt tot 2 werknemers (demo).</i>
      </p>

      <div class="demo-actions" style="display:flex; gap:12px; flex-wrap:wrap;">
        <a class="demo-btn primary" href="/demo/signup">ACCOUNT AANMAKEN (START WIZARD)</a>
        <a class="demo-btn ghost" href="/demo/login">REEDS ACCOUNT? LOGIN</a>
      </div>
    </div>
  `
  );
  res.status(200).send(html);
});

// SIGNUP FORM
router.get("/demo/signup", (req, res) => {
  const error = String(req.query.error || "");
  const email = String(req.query.email || "");

  const html = renderDemoPage(
    "DEMO - SIGNUP",
    `
    <div class="demo-block" style="text-align:center;">
      <img
        src="/static/logo_punctoo_groot_opgeel.png"
        alt="MyPunctoo"
        style="width:260px; height:auto; margin-bottom:18px;"
      />

      ${error ? `<div class="demo-alert" role="alert">${escapeHtml(error)}</div>` : ""}

      <div class="demo-subtitle">ACCOUNT AANMAKEN</div>

      <form method="POST" action="/demo/signup" style="max-width:520px; margin:0 auto;">
        <input
          class="demo-input"
          type="email"
          name="email"
          placeholder="E-mail"
          value="${escapeHtml(email)}"
          required
          autocomplete="email"
        />

        <input
          class="demo-input"
          type="password"
          name="password"
          placeholder="Wachtwoord"
          required
          autocomplete="new-password"
          minlength="6"
        />

        <input
          class="demo-input"
          type="password"
          name="password2"
          placeholder="Herhaal wachtwoord"
          required
          autocomplete="new-password"
          minlength="6"
        />

        <button class="demo-btn primary" type="submit" style="width:100%;">VOLGENDE</button>
      </form>

      <div style="margin-top:10px;">
        <a class="demo-link" href="/demo/account">Terug</a>
      </div>
    </div>
  `
  );

  res.status(200).send(html);
});

// SIGNUP POST
router.post("/demo/signup", express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const password2 = String(req.body.password2 || "");

    if (!email) return res.redirect(`/demo/signup?error=${encodeURIComponent("E-mail is verplicht.")}`);
    if (password.length < 6)
      return res.redirect(`/demo/signup?email=${encodeURIComponent(email)}&error=${encodeURIComponent("Wachtwoord is te kort (min. 6).")}`);
    if (password !== password2)
      return res.redirect(`/demo/signup?email=${encodeURIComponent(email)}&error=${encodeURIComponent("Wachtwoorden komen niet overeen.")}`);

    // Bestaat al?
    const existing = await dbGet(`SELECT id FROM demo_accounts WHERE email = $1`, [email]);
    if (existing) {
      return res.redirect(`/demo/signup?email=${encodeURIComponent(email)}&error=${encodeURIComponent("E-mail bestaat al. Gebruik login.")}`);
    }

    const demoSessionId = newDemoSessionId();
    const passwordHash = await bcrypt.hash(password, 10);

    await dbRun(
      `INSERT INTO demo_accounts (email, password_hash, demo_session_id)
       VALUES ($1, $2, $3)`,
      [email, passwordHash, demoSessionId]
    );

    // ✅ CRUCIAAL: path "/"
    res.cookie("demo_session", demoSessionId, cookieOptions(req));
    res.cookie("demo_email", email, { ...cookieOptions(req), httpOnly: false }); // optioneel

    // Door naar wizard stap "bedrijf"
    return res.redirect("/wizard/company");
  } catch (err) {
    console.error("Signup error:", err);
    return res.redirect(`/demo/signup?error=${encodeURIComponent("Interne fout bij account aanmaken.")}`);
  }
});

// LOGIN FORM
router.get("/demo/login", (req, res) => {
  const error = String(req.query.error || "");
  const email = String(req.query.email || "");

  const html = renderDemoPage(
    "DEMO - LOGIN",
    `
    <div class="demo-block" style="text-align:center;">
      <img
        src="/static/logo_punctoo_groot_opgeel.png"
        alt="MyPunctoo"
        style="width:260px; height:auto; margin-bottom:18px;"
      />

      ${error ? `<div class="demo-alert" role="alert">${escapeHtml(error)}</div>` : ""}

      <div class="demo-subtitle">LOGIN (rapporten bekijken)</div>

      <form method="POST" action="/demo/login" style="max-width:520px; margin:0 auto;">
        <input
          class="demo-input"
          type="email"
          name="email"
          placeholder="E-mail"
          value="${escapeHtml(email)}"
          required
          autocomplete="email"
        />

        <input
          class="demo-input"
          type="password"
          name="password"
          placeholder="Wachtwoord"
          required
          autocomplete="current-password"
        />

        <button class="demo-btn primary" type="submit" style="width:100%;">LOGIN</button>
      </form>

      <div style="margin-top:10px;">
        <a class="demo-link" href="/demo/account">Terug</a>
      </div>
    </div>
  `
  );

  res.status(200).send(html);
});

// LOGIN POST
router.post("/demo/login", express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    const row = await dbGet(
      `SELECT id, email, password_hash, demo_session_id
       FROM demo_accounts
       WHERE email = $1`,
      [email]
    );

    if (!row) {
      return res.redirect(`/demo/login?email=${encodeURIComponent(email)}&error=${encodeURIComponent("Onbekende login.")}`);
    }

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      return res.redirect(`/demo/login?email=${encodeURIComponent(email)}&error=${encodeURIComponent("Fout wachtwoord.")}`);
    }

    // ✅ CRUCIAAL: path "/"
    res.cookie("demo_session", row.demo_session_id, cookieOptions(req));
    res.cookie("demo_email", row.email, { ...cookieOptions(req), httpOnly: false }); // optioneel

    // Hier ga jij naar jouw rapportpagina (pas aan naar jouw echte route)
    return res.redirect("/reports");
  } catch (err) {
    console.error("Login error:", err);
    return res.redirect(`/demo/login?error=${encodeURIComponent("Interne fout bij login.")}`);
  }
});

// LOGOUT
router.get("/demo/logout", (req, res) => {
  res.clearCookie("demo_session", { path: "/" });
  res.clearCookie("demo_email", { path: "/" });
  return res.redirect("/demo/account");
});

module.exports = router;
