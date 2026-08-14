// Este arquivo documenta o snippet inline que deve estar no <head> de cada página,
// ANTES do link do CSS, para evitar o "flash" de tema claro antes de escurecer:
//
// <script>
//   (function () {
//     var tema = localStorage.getItem("ferias_theme");
//     if (!tema) tema = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
//     if (tema === "dark") document.documentElement.classList.add("dark");
//   })();
// </script>
//
// Ele roda de forma síncrona e bloqueante durante o parse do <head>, definindo a classe
// "dark" em <html> antes da primeira pintura da página — por isso precisa ficar inline
// (um <script src> externo chegaria tarde demais, depois do primeiro paint).
