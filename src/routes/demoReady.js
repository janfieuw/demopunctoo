const express = require("express");
const router = express.Router();

router.get("/ready", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <title>Demo klaar</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <!-- JetBrains Mono -->
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap" rel="stylesheet">

  <style>
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
      font-family: 'JetBrains Mono', monospace;
      background: var(--punctoo-yellow);
      color: var(--white);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .wrap {
      width: min(900px, 92vw);
      padding: 40px 20px;
      text-align: center;
    }

    h1 {
      margin: 0 0 24px 0;
      font-size: clamp(28px, 4vw, 46px);
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    p {
      font-size: 15px;
      line-height: 1.6;
      margin: 12px 0;
    }

    .strong {
      font-weight: 700;
    }

    .btn {
      display: inline-block;
      margin-top: 28px;
      padding: 14px 30px;
      background: var(--black);
      color: var(--white);
      text-decoration: none;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-radius: 10px;
      transition: transform 0.08s ease, opacity 0.12s ease;
    }

    .btn:active {
      transform: translateY(1px);
      opacity: 0.9;
    }

    .muted {
      margin-top: 18px;
      font-size: 13px;
      opacity: 0.85;
    }
  </style>
</head>

<body>
  <main class="wrap">
   <div class="demo-kicker">CONFIGURATIE VOLTOOID</div>

    <p>
      Je ScanTags en smartphones zijn nu gekoppeld.<br />
      De demo-opstelling is nu klaar voor gebruik. <br><br>
      Heb je problemen ondervonden? Contacteer dan href="mailto:support@punctoo.be">support@punctoo.be</a>
    </p>

    <p>
      Vanaf dit punt kan je enkel nog <span class="strong">rapporten bekijken</span>.
      Aanpassingen aan werknemers, roosters of instellingen
      zijn in deze demo niet mogelijk.
    </p>

    <a href="/demo/login" class="btn">
      GA NAAR LOGIN & RAPPORTEN
    </a>

    <div class="muted">
      Wil je instellingen wijzigen? Maak dan een nieuwe account aan.
    </div>
  </main>
</body>
</html>`);
});

module.exports = router;
