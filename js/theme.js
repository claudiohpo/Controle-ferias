(function () {
  const STORAGE_KEY = "ferias_theme";

  function aplicarTema(tema) {
    document.body.classList.toggle("dark", tema === "dark");
    const btn = document.getElementById("themeToggle");
    if (btn) btn.textContent = tema === "dark" ? "☀️" : "🌙";
  }

  function temaInicial() {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (salvo) return salvo;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  document.addEventListener("DOMContentLoaded", () => {
    const tema = temaInicial();
    aplicarTema(tema);

    const btn = document.getElementById("themeToggle");
    if (btn) {
      btn.addEventListener("click", () => {
        const atual = document.body.classList.contains("dark") ? "dark" : "light";
        const novo = atual === "dark" ? "light" : "dark";
        localStorage.setItem(STORAGE_KEY, novo);
        aplicarTema(novo);
      });
    }
  });
})();
