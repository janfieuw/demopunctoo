// src/routes/account.js
// CommonJS router for DEMO landing + signup + login

const express = require("express");
const crypto = require("crypto");

const db = require("../db");

let layoutDemo = null;
try {
  ({ layoutDemo } = require("../ui/layout"));
} catch (e) {
  layoutDemo = null;
}

const router = express.Router();

/* =========================
   Config
========================= */
const LOGO_SRC = "/static/logo_punctoo_groot_opgeel.png"; // moet bestaan in src/static
const COOKIE_SESSION = "demo_session";
const COOKIE_EMAIL = "demo_email";

/* =========================
   Helpers
========================= */
function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderPage(title, innerHtml) {
  if (typeof layoutDemo === "function") {
    return layoutDemo(title, innerHtml);
  }

  return `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/static/demo.css" />
</head>
<body style="margin:0;background:#fdc500;font-family:Arial,Helvetica,sans-serif;">
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;">
    <div style="width:min(720px,100%);text-align:center;">
      ${innerHtml}
    </div>
  </div>
</body>
</html>`;
}

function ensureDemoSession(req, res) {
  let sid = String(req.cookies?.[COOKIE_SESSION] || "").trim();
  if (!sid) {
    sid = crypto.randomBytes(4).toString("hex"); // 8 chars
    res.cookie(COOKIE_SESSION, sid, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
  }
  return sid;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hashHex = crypto.scryptSync(String(password), salt, 64).toString("hex");
  const saltHex = salt.toString("hex");
  // alles in 1 veld:
  return `${saltHex}:${hashHex}`;
}

function verifyPassword(password, stored) {
  const raw = String(stored || "");
  const parts = raw.split(":");
  if (parts.length !== 2) return false;

  const [saltHex, hashHex] = parts;

  const computedHex = crypto
    .scryptSync(String(password), Buffer.from(saltHex, "hex"), 64)
    .toString("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(computedHex, "hex"), Buffer.from(hashHex, "hex"));
  } catch {
    return false;
  }
}

/* =========================
   Pages
========================= */
function renderLanding() {
  return renderPage(
    "DEMO – Start",
    `
<div style="display:flex;flex-direction:column;align-items:center;gap:16px;">
  <img src="${LOGO_SRC}" alt="Punctoo" style="width:260px;max-width:78vw;height:auto;margin-bottom:6px;" />
  <div style="font-size:44px;letter-spacing:.08em;text-transform:uppercase;font-weight:800;line-height:1;">
    DEMO&nbsp;UITTESTEN<br/>IN&nbsp;5&nbsp;STAPPEN
  </div>

  <div style="max-width:760px;font-size:14px;line-height:1.5;margin-top:8px;">
    <b>Deze demo toont hoe Punctoo werkt in de praktijk.</b><br/>
    Je doorloopt de volledige flow: account → onderneming → werknemers → ScanTags/QR → smartphone koppelen.<br/>
    <i>Beperkt tot 2 werknemers (demo).</i>
  </div>

  <div style="margin-top:10px;display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">
    <a href="/demo/signup" class="demo-btn primary">ACCOUNT AANMAKEN (start wizard)</a>
    <a href="/demo/login" class="demo-btn ghost">REEDS ACCOUNT? LOGIN</a>
  </div>
</div>`
  );
}

function renderSignup({ error = "", email = "" } = {}) {
  const err = error
    ? `<div class="demo-alert" role="alert" style="margin-bottom:12px;">${escapeHtml(error)}</div>`
    : "";

  return renderPage(
    "DEMO – Account aanmaken",
    `
<div style="display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center;">
  <img src="${LOGO_SRC}" alt="Punctoo" style="width:260px;max-width:78vw;height:auto;margin-bottom:6px;" />

  ${err}

  <div style="font-size:14px;letter-spacing:.08em;text-transform:uppercase;">Account aanmaken</div>

  <form method="post" action="/demo/signup" style="width:min(520px,92vw);margin-top:2px;">
    <div style="display:flex;flex-direction:column;gap:10px;">
      <input
        type="email"
        name="email"
        placeholder="E-mail"
        value="${escapeHtml(email)}"
        required
        style="height:46px;border-radius:10px;border:2px solid #000;padding:0 14px;font-size:16px;"
      />
      <input
        type="password"
        name="password"
        placeholder="Wachtwoord"
        required
        minlength="6"
        autocomplete="new-password"
        style="height:46px;border-radius:10px;border:2px solid #000;padding:0 14px;font-size:16px;"
      />
      <input
        type="password"
        name="password2"
        placeholder="Herhaal wachtwoord"
        required
        minlength="6"
        autocomplete="new-password"
        style="height:46px;border-radius:10px;border:2px solid #000;padding:0 14px;font-size:16px;"
      />

      <button type="submit" class="demo-btn primary" style="height:46px;">VOLGENDE</button>

      <a href="/demo/account" class="demo-link">Terug</a>
    </div>
  </form>
</div>`
  );
}

function renderLogin({ error = "", email = "" } = {}) {
  const err = error
    ? `<div class="demo-alert" role="alert" style="margin-bottom:12px;">${escapeHtml(error)}</div>`
    : "";

  return renderPage(
    "DEMO – Login",
    `
<div style="display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center;">
  <img src="${LOGO_SRC}" alt="Punctoo" style="width:260px;max-width:78vw;height:auto;margin-bottom:6px;" />

  ${err}

  <div style="font-size:14px;letter-spacing:.08em;text-transform:uppercase;">Login (rapporten bekijken)</div>

  <form method="post" action="/demo/login" style="width:min(520px,92vw);margin-top:2px;">
    <div style="display:flex;flex-direction:column;gap:10px;">
      <input
        type="email"
        name="email"
        placeholder="E-mail"
        value="${escapeHtml(email)}"
        required
        style="height:46px;border-radius:10px;border:2px solid #000;padding:0 14px;font-size:16px;"
      />
      <input
        type="password"
        name="password"
        placeholder="Wachtwoord"
        required
        autocomplete="current-password"
        style="height:46px;border-radius:10px;border:2px solid #000;padding:0 14px;font-size:16px;"
      />

      <button type="submit" class="demo-btn primary" style="height:46px;">LOGIN</button>

      <a href="/demo/account" class="demo-link">Terug</a>
    </div>
  </form>
</div>`
  );
}

/* =========================
   Routes
========================= */

// landing
router.get("/demo/account", (req, res) => {
  ensureDemoSession(req, res);
  res.type("html").send(renderLanding());
});

// signup
router.get("/demo/signup", (req, res) => {
  ensureDemoSession(req, res);
  res.type("html").send(renderSignup({ email: req.cookies?.[COOKIE_EMAIL] || "" }));
});

router.post("/demo/signup", express.urlencoded({ extended: false }), async (req, res) => {
  const sid = ensureDemoSession(req, res);

  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const password2 = String(req.body.password2 || "");

    if (!email || !password || !password2) {
      return res.status(400).type("html").send(renderSignup({ error: "Vul e-mail en beide wachtwoorden in.", email }));
    }

    if (password !== password2) {
      return res.status(400).type("html").send(renderSignup({ error: "Wachtwoorden komen niet overeen.", email }));
    }

    if (password.length < 6) {
      return res.status(400).type("html").send(renderSignup({ error: "Wachtwoord moet minstens 6 tekens zijn.", email }));
    }

    const passwordHash = hashPassword(password);

    // ✅ past bij jouw huidige tabel: email, password_hash, demo_session_id, created_at
    await db.run(
      `INSERT INTO demo_accounts (email, password_hash, demo_session_id, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         demo_session_id = EXCLUDED.demo_session_id`,
      [email, passwordHash, sid]
    );

    res.cookie(COOKIE_EMAIL, email, {
      httpOnly: false,
      sameSite: "lax",
      secure: true,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    return res.redirect("/wizard/company");
  } catch (err) {
    console.error("POST /demo/signup error:", err);
    return res.status(500).type("html").send(
      renderSignup({
        error: "Interne fout bij account aanmaken.",
        email: req.body.email || "",
      })
    );
  }
});

// login
router.get("/demo/login", (req, res) => {
  ensureDemoSession(req, res);
  res.type("html").send(renderLogin({ email: req.cookies?.[COOKIE_EMAIL] || "" }));
});

router.post("/demo/login", express.urlencoded({ extended: false }), async (req, res) => {
  ensureDemoSession(req, res);

  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).type("html").send(renderLogin({ error: "Vul e-mail en wachtwoord in.", email }));
    }

    const row = await db.get(
      `SELECT email, password_hash
       FROM demo_accounts
       WHERE email = $1
       LIMIT 1`,
      [email]
    );

    if (!row) {
      return res.status(401).type("html").send(renderLogin({ error: "Account niet gevonden.", email }));
    }

    const ok = verifyPassword(password, row.password_hash);
    if (!ok) {
      return res.status(401).type("html").send(renderLogin({ error: "Fout wachtwoord.", email }));
    }

    res.cookie(COOKIE_EMAIL, email, {
      httpOnly: false,
      sameSite: "lax",
      secure: true,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    return res.redirect("/reports");
  } catch (err) {
    console.error("POST /demo/login error:", err);
    return res.status(500).type("html").send(renderLogin({ error: "Interne fout bij login.", email: req.body.email || "" }));
  }
});

module.exports = router;
