// src/ui/layout.js

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layoutDemo(title, content) {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <!-- POPPINS -->
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="/styles/base.css">
  <link rel="stylesheet" href="/styles/demo.css">
</head>

<body class="demo-body">
  <div class="demo-container">

    <div class="demo-left">
      <div class="demo-content">
        ${content}
      </div>
    </div>

    <div class="demo-right">
      <div class="demo-visual"></div>
    </div>

  </div>
</body>
</html>`;
}

module.exports = { layoutDemo, escapeHtml };
