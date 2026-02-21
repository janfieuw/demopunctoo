const express = require("express");
const { layoutDemo } = require("../ui/layout");

const router = express.Router();

router.get("/ready", (req, res) => {
  return res.send(
    layoutDemo(
      "PUNCTOO — DEMO VOLTOOID",
      `
        <div class="demo-kicker">DEMO UITTESTEN IN 5 STAPPEN</div>
        <h1 class="demo-title">DEMO-CONFIGURATIE VOLTOOID.</h1>

        <p class="demo-lead">
          Je ScanTags en smartphones zijn gekoppeld.<br>
          De demo-opstelling is nu klaar voor gebruik.
        </p>

        <div class="demo-actions" style="margin-top:18px;">
          <a href="/demo/login" class="demo-btn primary">
            GA NAAR LOGIN & RAPPORTEN
          </a>
        </div>
      `
    )
  );
});

module.exports = router;
