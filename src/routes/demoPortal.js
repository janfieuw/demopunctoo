const express = require("express");
const { get } = require("../db");

const router = express.Router();

/* =========================
   Helpers (zelfde idee als tags.js)
   ========================= */
function getDemoSession(req) {
  return String(req.cookies?.demo_session || "").trim();
}

async function getCompany(req) {
  const sid = getDemoSession(req);
  if (!sid) return null;

  return await get(
    `SELECT id, name
     FROM companies
     WHERE demo_session_id = $1
     ORDER BY id
     LIMIT 1`,
    [sid]
  );
}

async function getScantag(companyId) {
  return await get(
    `SELECT id, name
     FROM scantags
     WHERE company_id = $1
     ORDER BY id
     LIMIT 1`,
    [companyId]
  );
}

/* =========================
   Portal page (2 acties)
   ========================= */
router.get("/demo/portal", async (req, res) => {
  const company = await getCompany(req);
  if (!company) return res.redirect("/demo/login");

  const tag = await getScantag(company.id);
  if (!tag) return res.redirect("/wizard/qrs"); // of een logische fallback

  // Link naar jouw bestaande PDF endpoint
  const pdfUrl = `/scantag/${tag.id}.pdf`;

  res.send(`<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <title>Demo Portal</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <!-- JetBrains Mono -->
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap" rel="stylesheet">

  <style>
    :root{
      --punctoo-yellow: #FDC500;
      --white: #ffffff;
      --black: #000000;
    }

    html, body { height: 100%; }

    body{
      margin: 0;
      font-family: "JetBrains Mono", monospace;
      background: var(--punctoo-yellow);
      color: var(--white);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .wrap{
      width: min(980px, 92vw);
      padding: 44px 22px;
      text-align: center;
    }

    .kicker{
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.10em;
      opacity: 0.92;
      font-size: 16px;
      margin-bottom: 14px;
    }

    h1{
      margin: 0 0 18px 0;
      font-size: clamp(26px, 4vw, 44px);
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    p{
      margin: 10px 0;
      font-size: 14px;
      line-height: 1.6;
      opacity: 0.96;
    }

    .actions{
      margin-top: 26px;
      display: flex;
      gap: 14px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn{
      display: inline-block;
      padding: 14px 26px;
      background: var(--black);
      color: var(--white);
      text-decoration: none;
      border-radius: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      transition: transform 0.08s ease, opacity 0.12s ease;
      min-width: 260px;
      text-align: center;
    }

    .btn:active{
      transform: translateY(1px);
      opacity: 0.92;
    }

    .note{
      margin-top: 18px;
      font-size: 12px;
      opacity: 0.85;
    }
  </style>
</head>
<body>
  <main class="wrap" aria-label="Demo portal">
    <div class="kicker">Demo voltooid</div>
    <h1>Rapporten &amp; scantag</h1>

    <p>
      Je bent ingelogd in de demo. Vanaf nu kan je enkel nog:
      <br><b>1)</b> rapporten bekijken en <b>2)</b> je ScanTag downloaden.
    </p>

    <div class="actions">
      <a class="btn" href="/reports">Rapporten bekijken</a>
      <a class="btn" href="${pdfUrl}">Download scantag</a>
    </div>

    <div class="note">
      In deze demo zijn wijzigingen aan werknemers, roosters of instellingen niet meer mogelijk.
    </div>
  </main>
</body>
</html>`);
});

module.exports = router;
