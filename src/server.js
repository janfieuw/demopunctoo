function start() {
  const mod = require("./app");

  // Kan 3 vormen zijn:
  // 1) function createApp()
  // 2) { createApp: function }
  // 3) express app object
  let app;
  if (typeof mod === "function") {
    app = mod();
  } else if (mod && typeof mod.createApp === "function") {
    app = mod.createApp();
  } else {
    app = mod;
  }

  if (!app || typeof app.listen !== "function") {
    throw new Error(
      "Startup failed: app is not an Express instance (export mismatch in src/app.js)."
    );
  }

  const port = process.env.PORT || 3000;

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

start();
