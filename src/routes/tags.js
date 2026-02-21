// src/routes/tags.js
const express = require("express");
const QRCode = require("qrcode");
const PDFDocument = require("pdfkit");
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
   PDF helper
   ========================= */
function safeFileName(s) {
  return String(s || "codes")
    .toLowerCase()
    .replace(/[^a-z0-9\- _]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

function drawRow(doc, x, y, cols, widths, opts = {}) {
  const fontSize = opts.fontSize || 11;
  doc.fontSize(fontSize).fillColor("#000000");

  let cx = x;
  for (let i = 0; i < cols.length; i++) {
    doc.text(String(cols[i] ?? ""), cx, y, {
      width: widths[i],
      align: i === 0 ? "right" : "left",
    });
    cx += widths[i];
  }
}

function drawLine(doc, x, y, w) {
  doc
    .save()
    .strokeColor("#000000")
    .lineWidth(0.5)
    .moveTo(x, y)
    .lineTo(x + w, y)
    .stroke()
    .restore();
}

/* =========================
   Route: PDF met activatiecodes
   ========================= */
router.get("/tags/codes.pdf", async (req, res) => {
  const company = await getCompany(req);
  if (!company) return res.redirect("/demo/signup");

  const employees = await getEmployees(company.id);

  // Response headers
  const filename = `punctoo-codes-${safeFileName(company.name)}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  // A4 PDF
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 54, right: 54, bottom: 54, left: 54 },
  });

  // stream to client
  doc.pipe(res);

  // Witte achtergrond (default), zwarte tekst
  doc.fillColor("#000000");

  // Header
  doc.font("Helvetica-Bold").fontSize(18).text("Activatiecodes", { align: "left" });
  doc.moveDown(0.3);

  doc
    .font("Helvetica")
    .fontSize(11)
    .text(`Bedrijf: ${company.name || "-"}`)
    .text(`Datum: ${new Date().toLocaleDateString("nl-BE")}`);

  doc.moveDown(1);

  // Table layout
  const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const x = doc.page.margins.left;
  let y = doc.y;

  const widths = [40, Math.floor(pageW * 0.55), Math.floor(pageW * 0.45) - 40];
  // widths: [#, werknemer, activatiecode] (som ≈ pageW)

  // Table header
  doc.font("Helvetica-Bold");
  drawRow(doc, x, y, ["#", "Werknemer", "Activatiecode"], widths, { fontSize: 11 });
  y += 18;
  drawLine(doc, x, y, pageW);
  y += 10;

  // Rows
  doc.font("Helvetica");
  if (employees.length === 0) {
    doc.text("Geen werknemers gevonden.", x, y);
  } else {
    for (let i = 0; i < employees.length; i++) {
      const e = employees[i];
      const label = employeeLabel(e);
      const code = String(e.scan_code || "");

      // page break
      if (y > doc.page.height - doc.page.margins.bottom - 40) {
        doc.addPage();
        y = doc.page.margins.top;

        // re-header on new page
        doc.font("Helvetica-Bold");
        drawRow(doc, x, y, ["#", "Werknemer", "Activatiecode"], widths, { fontSize: 11 });
        y += 18;
        drawLine(doc, x, y, pageW);
        y += 10;
        doc.font("Helvetica");
      }

      drawRow(doc, x, y, [String(i + 1), label, code], widths, { fontSize: 11 });
      y += 18;
    }
  }

  doc.moveDown(2);
  doc
    .font("Helvetica")
    .fontSize(10)
    .text("Tip: Gebruik deze activatiecodes bij de eerste scan-IN (smartphone koppelen).");

  doc.end();
});

/* =========================
   Route: /tags (pagina)
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
                <td><b>${escapeHtml(empl
