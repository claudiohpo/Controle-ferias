let funcionarioAtual = null;
let contadorPeriodos = 0;

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
  if (!Api.exigirPerfil("funcionario", "funcionario-login.html")) return;

  document.getElementById("btnSair").addEventListener("click", () => {
    Api.logout();
    window.location.href = "index.html";
  });

  try {
    funcionarioAtual = await Api.request("/api/funcionarios?me=true");
  } catch (err) {
    document.getElementById("saudacao").textContent = "Erro ao carregar seus dados.";
    return;
  }

  document.getElementById("saudacao").textContent = `Olá, ${funcionarioAtual.nome}!`;
  renderInfo();
  await renderSolicitacoes();
}

function renderInfo() {
  const diasDireito = funcionarioAtual.diasDireito || 30;
  const grid = document.getElementById("infoGrid");
  grid.innerHTML = `
    <div class="stat"><div class="valor">${diasDireito}</div><div class="rotulo">Dias de direito</div></div>
    <div class="stat"><div class="valor">${fmtData(funcionarioAtual.periodoAquisitivoInicio)}</div><div class="rotulo">Início do aquisitivo</div></div>
    <div class="stat"><div class="valor">${fmtData(funcionarioAtual.periodoAquisitivoFim)}</div><div class="rotulo">Liberado a partir de</div></div>
    <div class="stat"><div class="valor">${fmtData(funcionarioAtual.dataMaxGozo)}</div><div class="rotulo">Prazo limite de gozo</div></div>
  `;
}

function linhaPeriodo(numero) {
  return `
    <div class="periodo-row" data-periodo="${numero}">
      <div>
        <label>Data de início (período ${numero})</label>
        <input type="date" class="input-inicio" required />
      </div>
      <div>
        <label>Dias</label>
        <input type="number" class="input-dias" min="1" max="30" required />
      </div>
      <div>
        <label>&nbsp;</label>
        <button type="button" class="btn secundario pequeno btn-remover" title="Remover período">✕</button>
      </div>
    </div>
  `;
}

function renderFormularioSolicitacao() {
  const diasDireito = funcionarioAtual.diasDireito || 30;
  const abonoMax = Math.min(10, Math.floor(diasDireito / 3));

  const area = document.getElementById("areaSolicitacao");
  area.innerHTML = `
    <div class="card">
      <h2 style="margin-top:0; font-size:1rem;">Solicitar férias</h2>
      <p class="hint">Você tem direito a ${diasDireito} dias. É possível dividir em até 3 períodos (um deles com pelo menos 14 dias corridos e os demais com pelo menos 5) e converter até ${abonoMax} dias em abono pecuniário.</p>

      <form id="formFerias">
        <div id="periodosContainer"></div>
        <button type="button" class="btn secundario pequeno" id="btnAddPeriodo" style="margin-top:12px;">+ Adicionar período</button>

        <label for="abono">Abono pecuniário (venda de dias) — máximo ${abonoMax}</label>
        <input type="number" id="abono" min="0" max="${abonoMax}" value="0" />

        <p class="hint" id="resumoDias"></p>

        <button type="submit" class="btn" style="margin-top:16px;">Enviar solicitação</button>
      </form>
      <div id="msgFerias" class="mensagem"></div>
    </div>
  `;

  const container = document.getElementById("periodosContainer");
  contadorPeriodos = 0;

  function addPeriodo() {
    if (contadorPeriodos >= 3) return;
    contadorPeriodos++;
    const div = document.createElement("div");
    div.innerHTML = linhaPeriodo(contadorPeriodos);
    container.appendChild(div.firstElementChild);
    atualizarBotaoAdicionar();
    atualizarResumo();
  }

  function atualizarBotaoAdicionar() {
    document.getElementById("btnAddPeriodo").style.display = contadorPeriodos >= 3 ? "none" : "inline-flex";
  }

  container.addEventListener("input", atualizarResumo);
  container.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-remover")) {
      e.target.closest(".periodo-row").remove();
      contadorPeriodos--;
      atualizarBotaoAdicionar();
      atualizarResumo();
    }
  });

  document.getElementById("btnAddPeriodo").addEventListener("click", addPeriodo);
  document.getElementById("abono").addEventListener("input", atualizarResumo);

  function atualizarResumo() {
    const dias = Array.from(container.querySelectorAll(".input-dias")).map((i) => Number(i.value || 0));
    const somaPeriodos = dias.reduce((a, b) => a + b, 0);
    const abono = Number(document.getElementById("abono").value || 0);
    const restante = diasDireito - abono - somaPeriodos;
    const resumo = document.getElementById("resumoDias");
    resumo.textContent = `Dias nos períodos: ${somaPeriodos} · Abono: ${abono} · ${
      restante === 0 ? "Total confere com seus dias de direito ✅" : `Faltam alocar ${restante} dia(s) para totalizar ${diasDireito}`
    }`;
  }

  addPeriodo();

  document.getElementById("formFerias").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("msgFerias");
    msg.className = "mensagem";

    const linhas = Array.from(container.querySelectorAll(".periodo-row"));
    const periodos = linhas.map((linha) => ({
      inicio: linha.querySelector(".input-inicio").value,
      dias: Number(linha.querySelector(".input-dias").value),
    }));
    const abonoPecuniarioDias = Number(document.getElementById("abono").value || 0);

    try {
      await Api.request("/api/ferias", {
        method: "POST",
        body: { periodos, abonoPecuniarioDias },
      });
      msg.className = "mensagem sucesso";
      msg.textContent = "Solicitação enviada com sucesso! Aguarde a aprovação do seu gestor.";
      await renderSolicitacoes();
      document.getElementById("formFerias").reset();
    } catch (err) {
      msg.className = "mensagem erro";
      msg.textContent = err.message || "Não foi possível enviar a solicitação.";
    }
  });
}

async function renderSolicitacoes() {
  const lista = document.getElementById("listaSolicitacoes");
  let solicitacoes = [];
  try {
    solicitacoes = await Api.request("/api/ferias");
  } catch (err) {
    lista.textContent = "Erro ao carregar solicitações.";
    return;
  }

  const temAtiva = solicitacoes.some((s) => s.status === "pendente" || s.status === "aprovado");
  const area = document.getElementById("areaSolicitacao");
  if (temAtiva) {
    area.innerHTML = `<div class="mensagem info">Você já possui uma solicitação ${
      solicitacoes.find((s) => s.status === "pendente" || s.status === "aprovado").status
    }. Para alterá-la, entre em contato com seu gestor.</div>`;
  } else {
    renderFormularioSolicitacao();
  }

  if (!solicitacoes.length) {
    lista.innerHTML = `<p class="hint">Nenhuma solicitação registrada ainda.</p>`;
    return;
  }

  lista.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Períodos</th><th>Abono</th><th>Total</th><th>Status</th><th>Enviado em</th><th></th></tr>
        </thead>
        <tbody>
          ${solicitacoes
            .map(
              (s) => `
            <tr>
              <td>${s.periodos.map((p) => `${fmtData(p.inicio)} a ${fmtData(somaDiasData(p.inicio, p.dias))} (${p.dias}d)`).join("<br/>")}</td>
              <td>${s.abonoPecuniarioDias || 0} dias</td>
              <td>${s.totalDias} dias</td>
              <td><span class="badge ${s.status}">${s.status}</span>${s.comentarioGestor ? `<div class="hint">${s.comentarioGestor}</div>` : ""}</td>
              <td>${fmtData(s.criadoEm)}</td>
              <td>${s.status === "aprovado" ? `<button class="btn secundario pequeno" onclick="imprimirComprovante('${s._id}')">Imprimir</button>` : ""}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  window.__solicitacoes = solicitacoes;
}

function imprimirComprovante(id) {
  const s = (window.__solicitacoes || []).find((x) => x._id === id);
  if (!s) return;
  const janela = window.open("", "_blank");
  janela.document.write(`
    <html><head><title>Comprovante de Férias</title>
    <style>body{font-family:Arial,sans-serif;padding:40px;color:#111} h1{font-size:1.3rem} table{border-collapse:collapse;width:100%;margin-top:16px} td,th{border:1px solid #ccc;padding:8px;text-align:left}</style>
    </head><body>
    <h1>Comprovante de Férias</h1>
    <p><strong>Funcionário:</strong> ${funcionarioAtual.nome}<br/>
    <strong>CPF:</strong> ${funcionarioAtual.cpf}</p>
    <table>
      <thead><tr><th>Período</th><th>Início</th><th>Fim</th><th>Dias</th></tr></thead>
      <tbody>
        ${s.periodos
          .map(
            (p, i) => `<tr><td>${i + 1}</td><td>${fmtData(p.inicio)}</td><td>${fmtData(somaDiasData(p.inicio, p.dias))}</td><td>${p.dias}</td></tr>`
          )
          .join("")}
      </tbody>
    </table>
    <p><strong>Abono pecuniário:</strong> ${s.abonoPecuniarioDias || 0} dias</p>
    <p><strong>Status:</strong> Aprovado</p>
    </body></html>
  `);
  janela.document.close();
  janela.print();
}

init();
