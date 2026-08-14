function fmtData(iso) {
  if (!iso) return "-";
  const [ano, mes, dia] = String(iso).slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

function somaDiasData(inicioStr, dias) {
  const d = new Date(inicioStr + "T00:00:00");
  d.setDate(d.getDate() + (Number(dias) - 1));
  return d.toISOString().slice(0, 10);
}

let regioesDoGestor = [];
let regioesFiltroAtual = [];

async function init() {
  if (!renderGestorNav("ferias")) return;
  document.getElementById("filtroStatus").addEventListener("change", carregarLista);

  try {
    regioesDoGestor = await Api.request("/api/funcionarios?listaRegioes=true");
    criarSeletorRegioes(
      "filtroRegioes",
      regioesDoGestor,
      (selecionadas) => {
        regioesFiltroAtual = selecionadas;
        carregarLista();
      },
      "ferias"
    );
  } catch (err) {
    console.error(err);
    await carregarLista();
  }
}

async function carregarLista() {
  const div = document.getElementById("listaSolicitacoes");
  const status = document.getElementById("filtroStatus").value;
  try {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (regioesFiltroAtual.length && regioesFiltroAtual.length < regioesDoGestor.length) {
      params.set("regioes", regioesFiltroAtual.join(","));
    }
    const query = params.toString();
    const lista = await Api.request(`/api/ferias${query ? "?" + query : ""}`);
    if (!lista.length) {
      div.innerHTML = `<p class="hint">Nenhuma solicitação encontrada.</p>`;
      return;
    }
    div.innerHTML = `
      <div class="table-wrap">
        <table class="tabela-resizavel" id="tabelaFerias">
          <thead>
            <tr><th>Funcionário</th><th>Períodos</th><th>Abono</th><th>Status</th><th>Enviado em</th><th class="nao-redimensionavel">Ações</th></tr>
          </thead>
          <tbody>
            ${lista
              .map(
                (s) => `
              <tr>
                <td title="${s.funcionarioNome}">${s.funcionarioNome}<br/><span class="hint">${s.funcionarioCpf}</span></td>
                <td>${s.periodos.map((p) => `${fmtData(p.inicio)} a ${fmtData(somaDiasData(p.inicio, p.dias))} (${p.dias}d)`).join("<br/>")}</td>
                <td>${s.abonoPecuniarioDias || 0} dias</td>
                <td><span class="badge ${s.status}">${s.status}</span>${s.comentarioGestor ? `<div class="hint">${s.comentarioGestor}</div>` : ""}</td>
                <td>${fmtData(s.criadoEm)}</td>
                <td>
                  ${
                    s.status === "pendente"
                      ? `<button class="btn sucesso pequeno" onclick="responder('${s._id}','aprovado')">Aprovar</button>
                         <button class="btn erro pequeno" onclick="responder('${s._id}','rejeitado')">Rejeitar</button>`
                      : s.status === "aprovado"
                      ? `<button class="btn erro pequeno" onclick="responder('${s._id}','cancelado')">Cancelar</button>`
                      : "-"
                  }
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
    inicializarTabelaRedimensionavel("tabelaFerias");
  } catch (err) {
    div.innerHTML = `<div class="mensagem erro" style="display:block;">${err.message}</div>`;
  }
}

async function responder(id, status) {
  let comentario = null;
  if (status === "rejeitado") {
    comentario = prompt("Motivo da rejeição (opcional):") || null;
  }
  if (status === "cancelado") {
    if (!confirm("Tem certeza que deseja cancelar estas férias já aprovadas? O funcionário poderá enviar uma nova solicitação depois.")) return;
    comentario = prompt("Motivo do cancelamento (opcional):") || null;
  }
  try {
    await Api.request(`/api/ferias?id=${id}`, { method: "PATCH", body: { status, comentario } });
    await carregarLista();
  } catch (err) {
    alert(err.message);
  }
}

init();
