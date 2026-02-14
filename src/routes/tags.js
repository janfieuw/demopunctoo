// src/routes/tags.js
const express = require("express");
const QRCode = require("qrcode");
const { get, all } = require("../db");
const { layoutDemo, escapeHtml } = require("../ui/layout");

const router = express.Router();

/* =========================
   Session helpers
   ========================= */
function getDemoSession(req) {
  return String(req.cookies?.demo_session || "").trim();
}

async function getCompany(req) {
  const sid = getDemoSession(req);
  if (!sid) return null;

  return await get(
    `SELECT id, name FROM companies WHERE demo_session_id = $1 ORDER BY id LIMIT 1`,
    [sid]
  );
}

/* =========================
   Data helpers
   ========================= */
async function getScantag(companyId) {
  return await get(
    `SELECT id, name FROM scantags WHERE company_id = $1 ORDER BY id ASC LIMIT 1`,
    [companyId]
  );
}

async function getEmployees(companyId) {
  return await all(
    `
    SELECT id, first_name, last_name, display_name, scan_code
    FROM employees
    WHERE company_id = $1
    ORDER BY
      COALESCE(last_name, '') ASC,
      COALESCE(first_name, '') ASC,
      COALESCE(display_name, '') ASC,
      id ASC
    `,
    [companyId]
  );
}

function employeeLabel(e) {
  const fn = String(e.first_name || "").trim();
  const ln = String(e.last_name || "").trim();
  if (ln || fn) return `${ln} ${fn}`.trim();
  return String(e.display_name || "").trim() || `#${e.id}`;
}

function getBaseUrl(req) {
  const proto = (req.headers["x-forwarded-proto"] || req.protocol || "https")
    .toString()
    .split(",")[0]
    .trim();
  return `${proto}://${req.get("host")}`;
}

/* =========================
   Route
   ========================= */
router.get("/tags", async (req, res) => {
  const company = await getCompany(req);
  if (!company) return res.redirect("/demo/signup");

  const tag = await getScantag(company.id);
  if (!tag) return res.redirect("/wizard/qrs");

  const employees = await getEmployees(company.id);

  // ✅ per ScanTag IN/OUT
  const baseUrl = getBaseUrl(req);
  const inUrl = `${baseUrl}/t/${tag.id}/in`;
  const outUrl = `${baseUrl}/t/${tag.id}/out`;

  // QR’s als dataURL (voor later gebruik indien je ze wil tonen)
  const qrOpts = { margin: 1, width: 600 };
  const inQrDataUrl = await QRCode.toDataURL(inUrl, qrOpts);
  const outQrDataUrl = await QRCode.toDataURL(outUrl, qrOpts);

  const empRows =
    employees.length === 0
      ? `<tr><td colspan="3">Geen werknemers gevonden.</td></tr>`
      : employees
          .map(
            (e, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><b>${escapeHtml(employeeLabel(e))}</b></td>
                <td><code>${escapeHtml(String(e.scan_code || ""))}</code></td>
              </tr>
            `
          )
          .join("");

  return res.send(
    layoutDemo(
      "PUNCTOO — SCANTAG",
      `
        <div class="demo-kicker">DEMO UITTESTEN IN 5 STAPPEN.</div>
        <h1 class="demo-title">STAP 5: SMARTPHONE KOPPELEN.</h1>

        <p class="demo-lead">
          <b>1. Download jouw persoonlijke ScanTag.</b><br>
          Druk jouw ScanTag af om later te kunnen gebruiken.<br>
          Gebruik onderstaande codes bij de eerste scan-IN.
        </p>

        <div class="demo-actions" style="margin-top:14px;">
          <a class="demo-btn secondary" href="/scantag/${tag.id}.pdf">DOWNLOAD JOUW SCANTAG</a>
        </div>

        <p class="demo-muted" style="margin-top:16px;">
          <b>Gebruik onderstaande codes bij de eerste scan-IN.</b>
        </p>

        <div class="demo-tablewrap scroll-x" style="margin-top:10px;">
          <table class="demo-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Werknemer</th>
                <th>Activatiecode</th>
              </tr>
            </thead>
            <tbody>${empRows}</tbody>
          </table>
        </div>

        <p class="demo-lead" style="margin-top:16px;">
          <b>2. Klaar?</b> Rond nu jouw wizard af en klik op onderstaande knop.
        </p>

        <div class="demo-actions" style="margin-top:12px;">
          <a class="demo-btn primary" href="/wizard/complete">VOLTOOI DEMO</a>
        </div>

        <!-- (optioneel) QR's tonen, als je wil debuggen:
        <div style="margin-top:22px; display:flex; gap:16px; flex-wrap:wrap;">
          <div>
            <div class="demo-muted"><b>IN</b></div>
            <img src="${inQrDataUrl}" alt="QR IN" style="max-width:220px; height:auto;" />
          </div>
          <div>
            <div class="demo-muted"><b>OUT</b></div>
            <img src="${outQrDataUrl}" alt="QR OUT" style="max-width:220px; height:auto;" />
          </div>
        </div>
        -->
      `
    )
  );
});

module.exports = router;
