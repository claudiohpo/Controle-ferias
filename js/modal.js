function abrirModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.hidden = false;
  document.body.style.overflow = "hidden";
}

function fecharModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.hidden = true;
  document.body.style.overflow = "";
}

// Fecha ao clicar fora da caixa, e associa o "X" e o(s) botão(ões) [data-fechar-modal].
function inicializarModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) fecharModal(id);
  });
  overlay.querySelectorAll("[data-fechar-modal]").forEach((btn) => {
    btn.addEventListener("click", () => fecharModal(id));
  });
}
