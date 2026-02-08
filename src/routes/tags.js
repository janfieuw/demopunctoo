const express = require("express");
const QRCode = require("qrcode");
const { get, all } = require("../db");
const { layoutDemo, escapeHtml } = require("../ui/layout");

const router = express.Router();

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

router.get("/tags", async (req, res) => {
  const company = await getCompany(req);
  if (!company) return res.redirect("/demo/account");

  const tag = await getScantag(company.id);
  if (!tag) return res.redirect("/wizard/qrs");

  const employees = await getEmployees(company.id);

  const baseUrl = getBaseUrl(req);
  const inUrl = `${baseUrl}/t/${tag.id}/in`;
  const outUrl = `${baseUrl}/t/${tag.id}/out`;

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
      "DEMO — STAP 5/5",
      `
        <div class="demo-kicker">DEMO UITTESTEN <br> IN 5 STAPPEN</div>

        <h1 class="demo-title">STAP 5/5: SMARTPHONE KOPPELEN</h1>

        <p class="demo-lead">
          De ScanTag is klaar voor gebruik.<br>
          Gebruik de QR-codes hieronder om te scannen met een smartphone.
        </p>

        <!-- TEMPLATE + QR -->
        <div style="margin-top:16px;">
          <img src="/static/scantag-template.png"
               alt="ScanTag"
               style="width:100%; max-width:700px; display:block;" />

          <img src="${inQrDataUrl}" style="display:none;" />
          <img src="${outQrDataUrl}" style="display:none;" />
        </div>

        <h2 class="demo-title" style="margin-top:24px;">
          Activatiecodes (eerste scan)
        </h2>

        <div class="demo-tablewrap">
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

        <div class="demo-actions" style="margin-top:24px;">
          <a class="demo-btn primary" href="/demo/login">
            GA NAAR LOGIN (RAPPORTEN)
          </a>
        </div>

        <p class="demo-muted" style="margin-top:14px;">
          De demo-configuratie is afgerond.<br>
          Aanpassingen zijn niet meer mogelijk in deze demo.
        </p>
      `
    )
  );
});

module.exports = router;
