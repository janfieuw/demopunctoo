// src/app.js
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");

// routes
const accountRoutes = require("./routes/account");
const wizardRoutes = require("./routes/wizard");
const tagsRoutes = require("./routes/tags");
const deviceRoutes = require("./routes/device");

const app = express();

/* ------------------ middleware ------------------ */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

/* ------------------ static ------------------ */
app.use("/static", express.static(path.join(__dirname, "static")));

/* ------------------ routes ------------------ */
app.use("/", accountRoutes);
app.use("/wizard", wizardRoutes);
app.use("/tags", tagsRoutes);
app.use("/device", deviceRoutes);

/* ------------------ healthcheck ------------------ */
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

/* ------------------ falllback ------------------ */
app.use((req, res) => {
  res.status(404).send("Not found");
});

module.exports = app;
