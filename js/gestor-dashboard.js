async function init() {
  if (!renderGestorNav("dashboard")) return;

  try {
    const stats = await Api.request("/api/dashboard");

    document.getElementById("statsGrid").innerHTML = `
      <div class="stat"><div class="valor">${stats.totalFuncionarios}</div><div class="rotulo">Funcionários</div></div>
      <div class="stat"><div class="valor">${stats.pendentes}</div><div class="rotulo">Pendentes</div></div>
      <div class="stat"><div class="valor">${stats.aprovadas}</div><div class="rotulo">Aprovadas</div></div>
      <div class="stat"><div class="valor">${stats.rejeitadas}</div><div class="rotulo">Rejeitadas</div></div>
    `;

    const div = document.getElementById("semSolicitacao");
    if (!stats.semSolicitacao.length) {
      div.innerHTML = `<p class="hint">Todos os funcionários já possuem uma solicitação em andamento ou aprovada.</p>`;
      return;
    }
    div.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nome</th><th>CPF</th><th>Região</th><th>Gestor</th></tr></thead>
          <tbody>
            ${stats.semSolicitacao
              .map((f) => `<tr><td>${f.nome}</td><td>${f.cpf}</td><td>${f.regiao || "-"}</td><td>${f.gestor || "-"}</td></tr>`)
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    document.getElementById("statsGrid").innerHTML = `<div class="mensagem erro" style="display:block;">${err.message}</div>`;
  }
}

init();
