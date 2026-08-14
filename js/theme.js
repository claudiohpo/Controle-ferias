// Aplica o toggle do tema e mantém o botão sincronizado.
// A classe "dark" já é aplicada em <html> antes mesmo deste arquivo carregar
// (veja o script inline no <head> de cada página) — isso evita o "flash" de
// tema claro antes de escurecer a tela.
(function () {
  const STORAGE_KEY = "ferias_theme";

  function aplicarTema(tema) {
    document.documentElement.classList.toggle("dark", tema === "dark");
    const btn = document.getElementById("themeToggle");
    if (btn) btn.textContent = tema === "dark" ? "☀️" : "🌙";
  }

  document.addEventListener("DOMContentLoaded", () => {
    // A classe já foi definida pelo script anti-flash no <head>; aqui só sincronizamos o ícone.
    const temaAtual = document.documentElement.classList.contains("dark") ? "dark" : "light";
    aplicarTema(temaAtual);

    const btn = document.getElementById("themeToggle");
    if (btn) {
      btn.addEventListener("click", () => {
        const atual = document.documentElement.classList.contains("dark") ? "dark" : "light";
        const novo = atual === "dark" ? "light" : "dark";
        localStorage.setItem(STORAGE_KEY, novo);
        aplicarTema(novo);
      });
    }
  });
})();
