const express = require("express");
const router = express.Router();

/**
 * Demo afgerond – expliciete overgang naar gebruik
 * Styling: zelfde typografie-feel als de andere demo pages:
 * - Roboto
 * - volledige achtergrond warm geel
 * - alle tekst wit
 */
router.get("/ready", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <title>Demo klaar</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <!-- Roboto zoals de rest (fallbacks inbegrepen) -->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap');

    :root{
      --punctoo-yellow: #FDC500;
      --white: #ffffff;
      --black: #000000;
    }

    html, body {
      height: 100%;
    }

    body {
      margin: 0;
      font-family: Roboto, Arial, Helvetica, sans-serif;
      background: var(--punctoo-yellow);
      color: var(--white);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .wrap {
      width: min(820px, 92vw);
      padding: 40px 16px;
      text-align: center;
    }

    /* Titel iets “krachtiger” zoals in je demo-wizard */
    h1 {
      margin: 0 0 14px 0;
      font-size: clamp(26px, 3.2vw, 40px);
      font-weight: 900;
      letter-spacing: 0.02em;
    }

    p {
      margin: 10px 0;
      font-size: 16px;
      line-height: 1.55;
      opacity: 0.98;
    }

    .strong {
      font-weight: 700;
    }

    .btn {
      display: inline-block;
      margin-top: 22px;
      padding: 14px 26px;
      background: var(--black);
      color: var(--white);
      text-decoration: none;
      border-radius: 10px;
      font-weight: 900;
      letter-spacing: 0.02em;
      transition: transform 0.08s ease, opacity 0.12s ease;
    }

    .btn:active {
      transform: translateY(1px);
      opacity: 0.92;
    }

    .muted {
      margin-top: 16px;
      font-size: 13px;
      opacity: 0.85;
    }
  </style>
</head>

<body>
  <main class="wrap" role="main" aria-label="Demo configuratie voltooid">
    <h1>Demo-configuratie voltooid</h1>

    <p>
      Je ScanTags en smartphones zijn gekoppeld.<br />
      De demo-opstelling is nu klaar voor gebruik.
    </p>

    <p>
      Vanaf dit punt kan je enkel nog <span class="strong">rapporten bekijken</span>.
      Aanpassingen aan werknemers, roosters of instellingen
      zijn in deze demo niet mogelijk.
    </p>

    <a href="/demo/login" class="btn">Ga naar login &amp; rapporten</a>

    <div class="muted">
      Wil je instellingen wijzigen? Maak dan een nieuwe account aan.
    </div>
  </main>
</body>
</html>`);
});

module.exports = router;
