// src/routes/device.js
const express = require("express");
const { DateTime } = require("luxon");
const { get, run } = require("../db");
const { COOKIE_NAME } = require("../config");
const { escapeHtml } = require("../ui/layout");

const router = express.Router();

const TZ = "Europe/Brussels";
const COOLDOWN_MINUTES = 5;

// redirect timers
const AUTO_REDIRECT_MS_OK = 1200;
const AUTO_REDIRECT_MS_NOTOK = 1500;

// ✅ na koppelen willen we niet terug naar /t/... maar naar login/rapporten
// Pas dit aan als jouw app andere routes gebruikt:
const AFTER_PAIR_REDIRECT_URL = "/login";

let scanEventsHasIgnoredCols = null;

async function detectScanEventsColumns() {
  if (scanEventsHasIgnoredCols !== null) return scanEventsHasIgnoredCols;

  const row = await get(
    `
    SELECT
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='scan_events' AND column_name='ignored'
      ) AS has_ignored,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='scan_events' AND column_name='ignored_reason'
      ) AS has_ignored_reason,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='scan_events' AND column_name='source'
      ) AS has_source
    `
  );

  scanEventsHasIgnoredCols = {
    has_ignored: row?.has_ignored === true,
    has_ignored_reason: row?.has_ignored_reason === true,
    has_source: row?.has_source === true,
  };

  return scanEventsHasIgnoredCols;
}

function nowTs() {
  return DateTime.now().setZone(TZ).toJSDate();
}

async function resolveTag(tagId) {
  return await get(
    `SELECT st.id AS tag_id, st.name AS tag_name, c.id AS company_id, c.name AS company_name
     FROM scantags st
     JOIN companies c ON c.id = st.company_id
     WHERE st.id = $1`,
    [tagId]
  );
}

async function getBoundEmployee(companyId, token) {
  if (!token) return null;

  return await get(
    `
    SELECT
      db.employee_id,
      e.first_name,
      e.last_name,
      e.display_name
    FROM device_bindings db
    JOIN employees e ON e.id = db.employee_id
    WHERE db.company_id = $1
      AND db.token = $2
    LIMIT 1
    `,
    [companyId, token]
  );
}

async function getLastNonIgnoredEvent(employeeId) {
  const cols = await detectScanEventsColumns();

  if (cols.has_ignored) {
    return await get(
      `
      SELECT direction, "timestamp"
      FROM scan_events
      WHERE employee_id=$1 AND ignored = FALSE
      ORDER BY "timestamp" DESC
      LIMIT 1
      `,
      [employeeId]
    );
  }

  return await get(
    `
    SELECT direction, "timestamp"
    FROM scan_events
    WHERE employee_id=$1
    ORDER BY "timestamp" DESC
    LIMIT 1
    `,
    [employeeId]
  );
}

// ✅ extra helper: laatste event (ook ignored) kan nuttig zijn,
// maar we houden het simpel: check op laatste event in het algemeen.
async function getLastEvent(employeeId) {
  return await get(
    `
    SELECT direction, "timestamp"
    FROM scan_events
    WHERE employee_id=$1
    ORDER BY "timestamp" DESC
    LIMIT 1
    `,
    [employeeId]
  );
}

async function insertScanEvent({
  companyId,
  employeeId,
  scantagId,
  direction,
  ts,
  ignored,
  ignored_reason,
  source,
}) {
  const cols = await detectScanEventsColumns();

  // als je schema source/ignored/ignored_reason heeft: gebruik het
  if (cols.has_source && cols.has_ignored && cols.has_ignored_reason) {
    await run(
      `
      INSERT INTO scan_events
        (company_id, employee_id, scantag_id, direction, "timestamp", source, ignored, ignored_reason)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
      [
        companyId,
        employeeId,
        scantagId,
        direction,
        ts,
        source || "SCAN",
        ignored === true,
        ignored_reason || null,
      ]
    );
    return;
  }

  // fallback schema (oude)
  await run(
    `
    INSERT INTO scan_events
      (company_id, employee_id, scantag_id, direction, "timestamp")
    VALUES
      ($1,$2,$3,$4,$5)
    `,
    [companyId, employeeId, scantagId, direction, ts]
  );
}

/* =========================
   UI helpers
   ========================= */

function renderImageOnly({ ok, redirectUrl, redirectMs }) {
  const img = ok ? "/static/scan-ok.png" : "/static/scan-notok.png";
  const sec = redirectMs > 0 ? Math.max(1, Math.round(redirectMs / 1000)) : 0;

  const meta =
    redirectUrl && sec > 0
      ? `<meta http-equiv="refresh" content="${sec};url=${escapeHtml(redirectUrl)}">`
      : "";

  return `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${ok ? "Scan geslaagd" : "Scan niet gelukt"}</title>
  ${meta}
  <style>
    html, body { margin:0; padding:0; height:100%; background:#FDC500; }
    .wrap { height:100%; display:flex; align-items:center; justify-content:center; }
    img { max-width: 92vw; max-height: 92vh; width:auto; height:auto; display:block; }
  </style>
</head>
<body>
  <div class="wrap">
    <img src="${img}" alt="${ok ? "Scan geslaagd" : "Scan niet gelukt"}" />
  </div>
</body>
</html>`;
}

function renderPairPage(tag, direction) {
  return `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Punctoo – Koppelen</title>
  <style>
    html, body { margin:0; padding:0; height:100%; background:#FDC500; font-family: Arial, Helvetica, sans-serif; }
    .wrap { min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; text-align:center; padding:48px 18px; box-sizing:border-box; }
    .logo { font-weight:900; font-size:44px; letter-spacing:-0.02em; margin:0 0 18px 0; }
    .subtitle { font-size:18px; letter-spacing:0.18em; margin:0 0 6px 0; }
    .hint { font-size:20px; margin:0 0 18px 0; }
    form { width:min(520px, 92vw); }
    input { width:100%; font-size:22px; padding:18px 16px; border-radius:14px; border:3px solid #111; text-align:center; outline:none; box-sizing:border-box; background:#fff; }
    button { width:100%; margin-top:14px; font-size:20px; padding:18px 16px; border-radius:18px; border:none; background:#000; color:#fff; font-weight:800; letter-spacing:0.12em; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="logo">MyPunctoo</div>
    <div class="subtitle">KOPPELEN SMARTPHONE</div>
    <div class="hint">Geef éénmalig ID:</div>

    <form method="post" action="/pair">
      <input type="hidden" name="tagId" value="${escapeHtml(String(tag.tag_id))}" />
      <input type="hidden" name="direction" value="${escapeHtml(String(direction))}" />
      <input name="employeeCode" placeholder="bv. 981d14c0" autocomplete="off" />
      <button type="submit">BEVESTIG</button>
    </form>
  </div>
</body>
</html>`;
}

/* =========================
   Routes
   ========================= */

// IN/OUT
router.get("/t/:tagId/:direction", async (req, res) => {
  const tagId = Number(req.params.tagId);
  const direction = String(req.params.direction || "").toLowerCase();
  if (direction !== "in" && direction !== "out") return res.status(404).send("Not found");

  const tag = await resolveTag(tagId);
  if (!tag) return res.status(404).send("Not found");

  const token = req.cookies[COOKIE_NAME];
  const bound = await getBoundEmployee(tag.company_id, token);

  // als device nog niet gekoppeld is: toon koppel-scherm
  if (!bound) {
    return res.send(renderPairPage(tag, direction));
  }

  const ts = nowTs();

  // ✅ paired=1 betekent: "koppelen = eerste scan-IN"
  // We forceren IN, zelfs als iemand per ongeluk /out?paired=1 zou triggeren.
  const paired = String(req.query.paired || "") === "1";
  const dirDb = paired ? "IN" : direction.toUpperCase();

  if (paired) {
    // ✅ anti-dubbelklik: als er net (30s) al een IN gelogd werd, log niet opnieuw
    const lastAny = await getLastEvent(bound.employee_id);
    if (lastAny && lastAny.timestamp) {
      const lastTs = new Date(lastAny.timestamp);
      const diffSec = (ts - lastTs) / 1000;

      if (diffSec >= 0 && diffSec < 30 && String(lastAny.direction || "").toUpperCase() === "IN") {
        return res.send(
          renderImageOnly({
            ok: true,
            redirectUrl: AFTER_PAIR_REDIRECT_URL,
            redirectMs: AUTO_REDIRECT_MS_OK,
          })
        );
      }
    }

    // ✅ log echte eerste scan-in (geen cooldown check hier)
    await insertScanEvent({
      companyId: tag.company_id,
      employeeId: bound.employee_id,
      scantagId: tag.tag_id,
      direction: "IN",
      ts,
      ignored: false,
      ignored_reason: null,
      source: "PAIR",
    });

    return res.send(
      renderImageOnly({
        ok: true,
        redirectUrl: AFTER_PAIR_REDIRECT_URL, // ✅ niet terug naar /t/... -> voorkomt onmiddellijk scan foutief
        redirectMs: AUTO_REDIRECT_MS_OK,
      })
    );
  }

  // normale scan-flow (met cooldown)
  const last = await getLastNonIgnoredEvent(bound.employee_id);
  if (last && last.timestamp) {
    const lastTs = new Date(last.timestamp);
    const diffMin = (ts - lastTs) / 60000;

    if (diffMin >= 0 && diffMin < COOLDOWN_MINUTES) {
      const cols = await detectScanEventsColumns();

      // als schema het toelaat: log ignored event met reason
      if (cols.has_ignored && cols.has_ignored_reason) {
        await insertScanEvent({
          companyId: tag.company_id,
          employeeId: bound.employee_id,
          scantagId: tag.tag_id,
          direction: dirDb,
          ts,
          ignored: true,
          ignored_reason: "COOLDOWN_5_MIN",
          source: "SCAN",
        });
      }

      return res.send(
        renderImageOnly({
          ok: false,
          redirectUrl: `/t/${tag.tag_id}/${direction}`,
          redirectMs: AUTO_REDIRECT_MS_NOTOK,
        })
      );
    }
  }

  // normale scan ok
  await insertScanEvent({
    companyId: tag.company_id,
    employeeId: bound.employee_id,
    scantagId: tag.tag_id,
    direction: dirDb,
    ts,
    ignored: false,
    ignored_reason: null,
    source: "SCAN",
  });

  return res.send(
    renderImageOnly({
      ok: true,
      redirectUrl: `/t/${tag.tag_id}/${direction}`,
      redirectMs: AUTO_REDIRECT_MS_OK,
    })
  );
});

module.exports = router;
