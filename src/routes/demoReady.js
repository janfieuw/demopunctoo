const express = require("express");
const router = express.Router();

/**
 * Demo afgerond – expliciete overgang naar gebruik
 */
router.get("/ready", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <title>Demo klaar</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      background: #FDC500;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: #fff;
      padding: 40px;
      max-width: 520px;
      width: 90%;
      border-radius: 12px;
      text-align: center;
    }
    h1 {
      margin-top: 0;
    }
    p {
      line-height: 1.5;
    }
    a.button {
      display: inline-block;
      margin-top: 24px;
      padding: 14px 26px;
      background: #000;
      color: #fff;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
    }
    .muted {
      margin-top: 16px;
      font-size: 13px;
      opacity: 0.75;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Demo-configuratie voltooid</h1>

    <p>
      Je ScanTags en smartphones zijn gekoppeld.<br />
      De demo-opstelling is nu klaar voor gebruik.
    </p>

    <p>
      Vanaf dit punt kan je enkel nog <strong>rapporten bekijken</strong>.
      Aanpassingen aan werknemers, roosters of instellingen
      zijn in deze demo niet mogelijk.
    </p>

    <a href="/demo/login" class="button">Ga naar login & rapporten</a>

    <div class="muted">
      Wil je instellingen wijzigen? Maak dan een nieuwe account aan.
    </div>
  </div>
</body>
</html>
  `);
});

module.exports = router;
