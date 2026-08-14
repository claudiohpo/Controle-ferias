function renderGestorNav(paginaAtiva) {
  if (!Api.exigirPerfil("gestor", "gestor-login.html")) return false;

  const paginas = [
    { href: "gestor-dashboard.html", label: "Dashboard", key: "dashboard" },
    { href: "gestor-funcionarios.html", label: "Funcionários", key: "funcionarios" },
    { href: "gestor-ferias.html", label: "Solicitações", key: "ferias" },
    { href: "gestor-gestores.html", label: "Gestores", key: "gestores" },
    { href: "gestor-config.html", label: "Configurações", key: "config" },
  ];

  const regioes = Api.getRegioes();
  const regioesTexto = regioes.length ? `Regiões: ${regioes.join(", ")}` : "Acesso a todas as regiões";
  const versaoAtual = typeof HISTORICO_VERSOES !== "undefined" && HISTORICO_VERSOES[0] ? HISTORICO_VERSOES[0].versao : "";

  document.getElementById("gestorTopbar").innerHTML = `
    <div>
      <h1>🗂️ Painel do Gestor</h1>
      <div class="sub">Olá, ${Api.getNome()} · ${regioesTexto}</div>
    </div>
    <div style="display:flex; gap:10px; align-items:center;">
      ${versaoAtual ? `<button class="btn secundario pequeno" id="btnVersaoSistema" title="Ver histórico de versões">🕘 v${versaoAtual}</button>` : ""}
      <button class="btn secundario pequeno" id="btnSairGestor">Sair</button>
    </div>
  `;

  document.getElementById("gestorNav").innerHTML = paginas
    .map((p) => `<a href="${p.href}" class="${p.key === paginaAtiva ? "active" : ""}">${p.label}</a>`)
    .join("");

  document.getElementById("btnSairGestor").addEventListener("click", () => {
    Api.logout();
    window.location.href = "index.html";
  });

  const btnVersao = document.getElementById("btnVersaoSistema");
  if (btnVersao) {
    garantirModalHistoricoVersoes();
    btnVersao.addEventListener("click", () => {
      montarConteudoHistoricoVersoes();
      abrirModal("modalHistoricoVersoes");
    });
  }

  return true;
}

// Cria o modal de histórico de versões no <body> caso ainda não exista
// (é injetado via JS para não precisar duplicar o HTML em todas as páginas).
function garantirModalHistoricoVersoes() {
  if (document.getElementById("modalHistoricoVersoes")) return;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div class="modal-overlay" id="modalHistoricoVersoes" hidden>
      <div class="modal-box">
        <div class="modal-header">
          <h2>🕘 Histórico de versões</h2>
          <button class="modal-fechar" data-fechar-modal aria-label="Fechar">✕</button>
        </div>
        <div class="modal-body" id="conteudoHistoricoVersoes"></div>
        <div class="modal-footer">
          <button type="button" class="btn secundario" data-fechar-modal>Fechar</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrapper.firstElementChild);
  if (typeof inicializarModal === "function") inicializarModal("modalHistoricoVersoes");
}

function montarConteudoHistoricoVersoes() {
  const container = document.getElementById("conteudoHistoricoVersoes");
  if (!container || typeof HISTORICO_VERSOES === "undefined") return;

  container.innerHTML = HISTORICO_VERSOES.map((v, i) => {
    const isAtual = i === 0;
    const [ano, mes, dia] = v.data.split("-");
    return `
      <div style="margin-bottom:20px; ${i < HISTORICO_VERSOES.length - 1 ? "padding-bottom:16px; border-bottom:1px solid var(--borda);" : ""}">
        <div style="display:flex; align-items:baseline; gap:8px; margin-bottom:10px; flex-wrap:wrap;">
          <strong style="font-size:1.05rem;">v${v.versao}</strong>
          ${isAtual ? '<span class="badge aprovado">atual</span>' : ""}
          <span class="hint">${dia}/${mes}/${ano}</span>
        </div>
        ${secaoHistoricoVersao("Adicionado", v.mudancas.adicionado)}
        ${secaoHistoricoVersao("Alterado", v.mudancas.alterado)}
        ${secaoHistoricoVersao("Corrigido", v.mudancas.corrigido)}
        ${secaoHistoricoVersao("Removido", v.mudancas.removido)}
      </div>
    `;
  }).join("");
}

function secaoHistoricoVersao(titulo, itens) {
  if (!itens || !itens.length) return "";
  return `
    <div style="margin-bottom:10px;">
      <div style="font-size:0.75rem; font-weight:700; color:var(--texto-suave); text-transform:uppercase; letter-spacing:0.03em; margin-bottom:5px;">${titulo}</div>
      <ul style="margin:0; padding-left:18px; font-size:0.88rem; display:flex; flex-direction:column; gap:5px;">
        ${itens.map((t) => `<li>${t}</li>`).join("")}
      </ul>
    </div>
  `;
}
