// src/app.js
const express = require("express");
const path = require("path");

function createApp() {
  const app = express();

  // Trust proxy (Railway / reverse proxy) so secure cookies + req.ip etc work correctly
  app.set("trust proxy", 1);

  // Body parsing
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  /**
   * Static files
   * Belangrijk:
   * - In jouw project staan assets verspreid over /src/static, /src/styles en soms /src/img
   * - In templates wordt vaak verwezen naar /static/... (bv. /static/demo.css, /static/logo_....png)
   * Daarom mappen we /static op MEERDERE folders (in deze volgorde).
   * Express doorloopt deze middlewares van boven naar beneden en pakt de eerste match.
   */
  const staticDir = path.join(__dirname, "static");
  const stylesDir = path.join(__dirname, "styles");
  const imgDir = path.join(__dirname, "img");

  // 1) klassieke /static map
  app.use("/static", express.static(staticDir));

  // 2) fallback: als demo.css of logo's eigenlijk in /styles staan, dan werkt /static/... toch
  app.use("/static", express.static(stylesDir));

  // 3) fallback: als logo's in /img staan, dan werkt /static/... ook
  app.use("/static", express.static(imgDir));

  // Optioneel: ook direct bereikbaar houden (handig tijdens debug)
  app.use("/styles", express.static(stylesDir));
  app.use("/img", express.static(imgDir));

  // Routes
  app.use("/", require("./routes/account"));
  app.use("/", require("./routes/admin"));
  app.use("/", require("./routes/reports"));
  app.use("/", require("./routes/scan"));
  app.use("/", require("./routes/tags"));
  app.use("/", require("./routes/wizard"));
  app.use("/", require("./routes/pair"));
  app.use("/", require("./routes/device"));
  app.use("/", require("./routes/setup"));
  app.use("/", require("./routes/scantagPdf"));

  // Root convenience
  app.get("/", (req, res) => res.redirect("/demo/account"));

  // 404 fallback (zorgt dat je niet “stil” niets ziet)
  app.use((req, res) => {
    res.status(404).send("Not found");
  });

  return app;
}

module.exports = { createApp };
