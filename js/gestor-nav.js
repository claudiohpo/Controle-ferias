function renderGestorNav(paginaAtiva) {
  if (!Api.exigirPerfil("gestor", "gestor-login.html")) return false;

  const paginas = [
    { href: "gestor-dashboard.html", label: "Dashboard", key: "dashboard" },
    { href: "gestor-funcionarios.html", label: "Funcionários", key: "funcionarios" },
    { href: "gestor-ferias.html", label: "Solicitações", key: "ferias" },
    { href: "gestor-config.html", label: "Configurações", key: "config" },
  ];

  document.getElementById("gestorTopbar").innerHTML = `
    <div>
      <h1>🗂️ Painel do Gestor</h1>
      <div class="sub">Olá, ${Api.getNome()}</div>
    </div>
    <button class="btn secundario pequeno" id="btnSairGestor">Sair</button>
  `;

  document.getElementById("gestorNav").innerHTML = paginas
    .map((p) => `<a href="${p.href}" class="${p.key === paginaAtiva ? "active" : ""}">${p.label}</a>`)
    .join("");

  document.getElementById("btnSairGestor").addEventListener("click", () => {
    Api.logout();
    window.location.href = "index.html";
  });

  return true;
}
