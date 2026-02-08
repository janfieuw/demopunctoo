// src/app.js
const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");

function createApp() {
  const app = express();

  // Railway / proxies
  app.set("trust proxy", 1);

  // Body parsing
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(cookieParser());

  // ----------------------------
  // Static files
  // ----------------------------
  // In jouw projectstructuur zitten assets o.a. in:
  // - src/static (foto's zoals demo-wall.jpg, scan-ok.png, ...)
  // - src/styles (demo.css, scantag-template.png, logo_punctoo_groot_opgeel.png, ...)
  // - src/img (als je daar ook iets wil serveren)
  const staticDir = path.join(__dirname, "static");
  const stylesDir = path.join(__dirname, "styles");
  const imgDir = path.join(__dirname, "img");

  // 1) "normale" manier: alles via /static/...
  app.use("/static", express.static(staticDir));
  app.use("/static", express.static(stylesDir));
  app.use("/static", express.static(imgDir));

  // 2) Legacy / foute paden opvangen (zodat oude HTML niet "kaal" wordt)
  //    Jij hebt bv. in account.js:  <img src="demo/scr/styles/logo_punctoo_groot_opgeel.png">
  //    Dat bestaat niet als route. Daarom mappen we die naar /static/...
  app.use("/demo/scr/styles", express.static(stylesDir));
  app.use("/demo/src/styles", express.static(stylesDir));
  app.use("/demo/styles", express.static(stylesDir));
  app.use("/scr/styles", express.static(stylesDir));
  app.use("/src/styles", express.static(stylesDir));
  app.use("/styles", express.static(stylesDir));

  app.use("/demo/scr/static", express.static(staticDir));
  app.use("/demo/src/static", express.static(staticDir));
  app.use("/scr/static", express.static(staticDir));
  app.use("/src/static", express.static(staticDir));

  app.use("/demo/img", express.static(imgDir));
  app.use("/img", express.static(imgDir));

  // ----------------------------
  // Routes
  // ----------------------------
  // Let op: dit verwacht dat deze bestanden bestaan in src/routes/
  // (zoals in jouw project: account.js, wizard.js, tags.js, device.js, pair.js, reports.js, scan.js, setup.js, admin.js)
  const accountRouter = require("./routes/account");
  const wizardRouter = require("./routes/wizard");
  const tagsRouter = require("./routes/tags");
  const deviceRouter = require("./routes/device");
  const pairRouter = require("./routes/pair");
  const reportsRouter = require("./routes/reports");
  const scanRouter = require("./routes/scan");
  const setupRouter = require("./routes/setup");
  const adminRouter = require("./routes/admin");

  // DEMO landing / login / signup flow
  app.use("/demo", accountRouter);

  // Wizard stappen
  app.use("/wizard", wizardRouter);

  // Tags/QR pagina
  app.use("/tags", tagsRouter);

  // Scans
  app.use("/t", deviceRouter);  // QR routes: /t/:tagId/:direction
  app.use("/pair", pairRouter);

  // Rapporten
  app.use("/reports", reportsRouter);

  // Scan endpoints (als je die gebruikt)
  app.use("/scan", scanRouter);

  // Setup/admin
  app.use("/setup", setupRouter);
  app.use("/admin", adminRouter);

  // Root: stuur door naar demo landing
  app.get("/", (req, res) => {
    res.redirect("/demo/account");
  });

  // 404
  app.use((req, res) => {
    res.status(404).send("Not found");
  });

  return app;
}

module.exports = { createApp };
