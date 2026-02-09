const express = require("express");
const path = require("path");

// Routes
const accountRouter = require("./routes/account");
const wizardRouter = require("./routes/wizard");
const adminRouter = require("./routes/admin");
const reportsRouter = require("./routes/reports");
const scanRouter = require("./routes/scan");
const tagsRouter = require("./routes/tags");
const deviceRouter = require("./routes/device");
const pairRouter = require("./routes/pair");
const scantagPdfRouter = require("./routes/scantagPdf");

function createApp() {
  const app = express();

  // Body parsing
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // Static assets
  // src/styles -> /static (demo.css, scanpages.css, images die je daar zet)
  app.use("/static", express.static(path.join(__dirname, "styles")));
  // src/static -> /static (logo’s/png’s/extra assets die je daar zet)
  app.use("/static", express.static(path.join(__dirname, "static")));

  // Home
  app.get("/", (req, res) => res.redirect("/demo/account"));

  // App routes
  app.use(accountRouter);
  app.use(wizardRouter);
  app.use(adminRouter);
  app.use(reportsRouter);
  app.use(scanRouter);
  app.use(tagsRouter);

  // Device/Pair/Scantag PDF
  app.use(deviceRouter);
  app.use(pairRouter);
  app.use(scantagPdfRouter);

  // 404
  app.use((req, res) => {
    res.status(404).send("Not found");
  });

  // Error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error("UNHANDLED ERROR:", err);
    res.status(500).send("Internal Server Error");
  });

  return app;
}

// ✅ Belangrijk: exporteer ALLE vormen zodat server.js nooit kan mismatchen
module.exports = createApp;
module.exports.createApp = createApp;
