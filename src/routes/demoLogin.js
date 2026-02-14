// src/routes/demoLogin.js
const express = require("express");
const { get } = require("../db");
const { layoutDemo, escapeHtml } = require("../ui/layout");

const router = express.Router();

// optioneel bcryptjs (als aanwezig). We vallen terug op plain compare.
let bcrypt = null;
try {
  // eslint-disable-next-line global-require
  bcrypt = require("bcryptjs");
} catch (e) {
  bcrypt = null;
}

function getDemoSession(req) {
  return String(req.cookies?.demo_session || "").trim();
}

function isAuthed(req) {
  return String(req.cookies?.demo_auth || "") === "1";
}

function setAuthed(res) {
  // 7 dagen is ok voor demo
  res.cookie("demo_auth", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthed(res) {
  res.clearCookie("demo_auth");
}

async function verifyLogin(email, password) {
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");

  if (!e || !p) return { ok: false, reason: "missing" };

  // 1) Probeer demo_users
  let user =
    (await get(
      `SELECT id, email, password_hash, password
       FROM demo_users
       WHERE lower(email) = $1
       ORDER BY id DESC
       LIMIT 1`,
      [e]
    )) || null;

  // 2) Fallback: users (als je project dat gebruikt)
  if (!user) {
    user =
      (await get(
        `SELECT id, email, password_hash, password
         FROM users
         WHERE lower(email) = $1
         ORDER BY id DESC
         LIMIT 1`,
        [e]
      )) || null;
  }

  if (!user) return { ok: false, reason: "notfound" };

  // password_hash (bcrypt)
  if (user.password_hash && bcrypt) {
    const ok = await bcrypt.compare(p, user.password_hash);
    return { ok, reason: ok ? "ok" : "badpass", userId: user.id };
  }

  // plain password fallback (voor demo)
  if (user.password) {
    const ok = String(user.password) === p;
    return { ok, reason: ok ? "ok" : "badpass", userId: user.id };
  }

  // Geen bruikbaar wachtwoordveld
  return { ok: false, reason: "nopassword" };
}

/* =========================
   GET /demo/login
   ========================= */
router.get("/demo/login", async (req, res) => {
  // Als al ingelogd: direct naar rapporten
  if (isAuthed(req)) return res.redirect("/reports");

  // kleine check: als er zelfs geen demo_session is, stuur naar signup
  const sid = getDemoSession(req);
  if (!sid) return res.redirect("/demo/signup");

  const error = String(req.query?.err || "");
  let errorMsg = "";
  if (error === "1") errorMsg = "Onjuiste login. Controleer e-mail en wachtwoord.";
  if (error === "2") errorMsg = "Vul e-mail en wachtwoord in.";

  res.send(
    layoutDemo(
      "PUNCTOO — LOGIN",
      `
      <div class="demo-kicker">DEMO UITTESTEN IN 5 STAPPEN.</div>
      <h1 class="demo-title">LOGIN.</h1>

      <p class="demo-lead">
        Log in om verder te gaan naar <b>rapporten</b> en je <b>ScanTag</b>.
      </p>

      ${errorMsg ? `<div class="demo-error" style="margin:10px 0 14px 0;"><b>${escapeHtml(errorMsg)}</b></div>` : ""}

      <form method="POST" action="/demo/login" class="demo-form" autocomplete="on">
        <div class="demo-field">
          <label for="email">E-mail</label>
          <input id="email" name="email" type="email" required />
        </div>

        <div class="demo-field">
          <label for="password">Paswoord</label>
          <input id="password" name="password" type="password" required />
        </div>

        <div class="demo-actions" style="margin-top:14px;">
          <button type="submit" class="demo-btn primary">LOGIN</button>
        </div>

        <p class="demo-muted" style="margin-top:14px;">
          Nog geen account? <a href="/demo/signup">Maak een account aan.</a>
        </p>
      </form>
      `
    )
  );
});

/* =========================
   POST /demo/login
   ========================= */
router.post("/demo/login", async (req, res) => {
  const email = req.body?.email;
  const password = req.body?.password;

  if (!email || !password) return res.redirect("/demo/login?err=2");

  const result = await verifyLogin(email, password);
  if (!result.ok) return res.redirect("/demo/login?err=1");

  setAuthed(res);

  // ✅ Na succesvolle login -> rapporten aanmaken/bekijken
  // PAS AAN als jouw route anders is (bv. /reports/new)
  return res.redirect("/reports");
});

/* =========================
   (optioneel) logout
   ========================= */
router.get("/demo/logout", (req, res) => {
  clearAuthed(res);
  return res.redirect("/demo/login");
});

module.exports = router;
