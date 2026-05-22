import "$/app.css"; // PIKT: Skeleton/Tailwind design system, loaded before Bootstrap during migration (Chantier 0)
import "$/styles/style.scss";
import "@popperjs/core";
import "toastify-js/src/toastify.css";
import "bootstrap/js/dist/dropdown";
import "bootstrap/js/dist/collapse";
import App from "$/App.svelte";
import { mount } from "svelte";
import { configureFabric } from "$/defaults";
import { initTheme } from "$/stores/theme"; // PIKT: apply persisted theme + dark mode (Chantier 0)

configureFabric();
initTheme();

const app = mount(App, {
  target: document.getElementById("app")!,
});

export default app;
