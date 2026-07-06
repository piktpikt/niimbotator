import "$/app.css"; // PIKT: Skeleton/Tailwind design system, loaded before Bootstrap during migration (Chantier 0)
import "$/styles/style.scss";
import "toastify-js/src/toastify.css";
import App from "$/App.svelte";
import { mount } from "svelte";
import { configureFabric } from "$/defaults";
import { initTheme } from "$/stores/theme"; // PIKT: apply persisted theme + dark mode (Chantier 0)

configureFabric();
initTheme();

const app = mount(App, {
  target: document.getElementById("app")!,
});

// PIKT (dev-only): expose the app's REAL store singletons on window for browser-driven proofs. A dynamic
// import from inside the app's module graph returns the same instances the components use (a Playwright
// eval `import()` would get a separate copy and can't drive reactivity). Stripped from production builds.
if (import.meta.env.DEV) {
  void Promise.all([
    import("$/stores"),
    import("$/stores/printerMetrics"),
    import("$/utils/label_designer_object_helper"),
    import("$/services/imageImport"),
  ]).then(([stores, metrics, helper, imageImport]) => {
    (window as unknown as { __nb?: unknown }).__nb = { ...stores, ...metrics, ...helper, ...imageImport };
  });
}

export default app;
