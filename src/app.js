const express = require("express");
const path = require("path");

/**
 * Express app.use() accepteert alleen middleware functions (Router is ook function).
 * Sommige files exporteren per ongeluk { router } of { default: router } of { createRouter }.
 * Deze helper maakt dat robuust én geeft een super duidelijke error als het fout zit.
 */
function normalizeMiddleware(mod, name) {
  let mw = mod;

  // Common patterns
  if (mw && typeof mw === "object") {
    if (typeof mw.default === "function") mw = mw.default;
    else if (typeof mw.router === "function") mw = mw.router;
    else if (typeof mw.createRouter === "function") mw = mw.createRouter();
    else if (typeof mw.createApp === "function") mw = mw.createApp(); // just in case
  }

  if (typeof mw !== "function") {
    const exportedKeys =
      mod && typeof mod === "object" ? Object.keys(mod) : [];
    throw new Error(
      `[app.js] Route "${name}" is not a middleware function.\n` +
        `Expected: module.exports = router (express.Router())\n` +
        `Got type: ${typeof mw}\n` +
        `Original export type: ${typeof mod}\n` +
        `Exported keys: ${exportedKeys.join(", ") || "(none)"}\n\n` +
        `Fix in src/routes/${name}.js: at bottom do -> module.exports = router;`
    );
  }

  return mw;
}

function createApp() {
  const app = express();

  // Body parsing
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // Static assets
  // - src/styles -> /static  (css + images die je daar zet)
  // - src/static -> /static  (assets)
  app.use("/static", express.static(path.join(__dirname, "styles")));
  app.use("/static", express.static(path.join(__dirname, "static")));

  // Home
  app.get("/", (req, res) => res.redirect("/demo/account"));

  // ---- Routes (met harde checks) ----
  const account = normalizeMiddleware(require("./routes/account"), "account");
  const wizard = normalizeMiddleware(require("./routes/wizard"), "wizard");
  const admin = normalizeMiddleware(require("./routes/admin"), "admin");
  const reports = normalizeMiddleware(require("./routes/reports"), "reports");
  const scan = normalizeMiddleware(require("./routes/scan"), "scan");
  const tags = normalizeMiddleware(require("./routes/tags"), "tags");
  const device = normalizeMiddleware(require("./routes/device"), "device");
  const pair = normalizeMiddleware(require("./routes/pair"), "pair");
  const scantagPdf = normalizeMiddleware(require("./routes/scantagPdf"), "scantagPdf");

  app.use(account);
  app.use(wizard);
  app.use(admin);
  app.use(reports);
  app.use(scan);
  app.use(tags);
  app.use(device);
  app.use(pair);
  app.use(scantagPdf);

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

// Exports (robust)
module.exports = createApp;
module.exports.createApp = createApp;
