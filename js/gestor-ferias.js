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

async function init() {
  if (!renderGestorNav("ferias")) return;
  document.getElementById("filtroStatus").addEventListener("change", carregarLista);
  await carregarLista();
}

async function carregarLista() {
  const div = document.getElementById("listaSolicitacoes");
  const status = document.getElementById("filtroStatus").value;
  try {
    const params = status ? `?status=${status}` : "";
    const lista = await Api.request(`/api/ferias${params}`);
    if (!lista.length) {
      div.innerHTML = `<p class="hint">Nenhuma solicitação encontrada.</p>`;
      return;
    }
    div.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Funcionário</th><th>Períodos</th><th>Abono</th><th>Status</th><th>Enviado em</th><th>Ações</th></tr>
          </thead>
          <tbody>
            ${lista
              .map(
                (s) => `
              <tr>
                <td>${s.funcionarioNome}<br/><span class="hint">${s.funcionarioCpf}</span></td>
                <td>${s.periodos.map((p) => `${fmtData(p.inicio)} a ${fmtData(somaDiasData(p.inicio, p.dias))} (${p.dias}d)`).join("<br/>")}</td>
                <td>${s.abonoPecuniarioDias || 0} dias</td>
                <td><span class="badge ${s.status}">${s.status}</span>${s.comentarioGestor ? `<div class="hint">${s.comentarioGestor}</div>` : ""}</td>
                <td>${fmtData(s.criadoEm)}</td>
                <td>
                  ${
                    s.status === "pendente"
                      ? `<button class="btn sucesso pequeno" onclick="responder('${s._id}','aprovado')">Aprovar</button>
                         <button class="btn erro pequeno" onclick="responder('${s._id}','rejeitado')">Rejeitar</button>`
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
  } catch (err) {
    div.innerHTML = `<div class="mensagem erro" style="display:block;">${err.message}</div>`;
  }
}

async function responder(id, status) {
  let comentario = null;
  if (status === "rejeitado") {
    comentario = prompt("Motivo da rejeição (opcional):") || null;
  }
  try {
    await Api.request(`/api/ferias?id=${id}`, { method: "PATCH", body: { status, comentario } });
    await carregarLista();
  } catch (err) {
    alert(err.message);
  }
}

init();
