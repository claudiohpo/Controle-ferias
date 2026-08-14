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
    <div class="stat"><div class="valor">${fmtData(funcionarioAtual.dataLimiteInicioFerias)}</div><div class="rotulo">Prazo limite de início</div></div>
    <div class="stat"><div class="valor">${fmtData(funcionarioAtual.dataLimiteProgramacao)}</div><div class="rotulo">Prazo para programar</div></div>
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
  const estamosEmJaneiro = new Date().getMonth() === 0;

  const area = document.getElementById("areaSolicitacao");
  area.innerHTML = `
    <div class="card">
      <h2 style="margin-top:0; font-size:1rem;">Solicitar férias</h2>
      <p class="hint">Você tem direito a ${diasDireito} dias. É possível dividir em até 3 períodos (um deles com pelo menos 14 dias corridos e os demais com pelo menos 5) e converter até ${abonoMax} dias em abono pecuniário.</p>

      <form id="formFerias">
        <div id="periodosContainer"></div>
        <button type="button" class="btn secundario pequeno" id="btnAddPeriodo" style="margin-top:12px;">+ Adicionar período</button>

        <label for="abono">Abono pecuniário (venda de dias) — máximo ${abonoMax}</label>
        <input type="number" id="abono" min="0" max="${abonoMax}" placeholder="0" value="" />

        <p class="hint" id="resumoDias"></p>

        <div style="margin-top:18px; padding:14px; border:1px solid var(--borda); border-radius:8px;">
          <label style="display:flex; align-items:flex-start; gap:8px; margin-top:0; cursor:${estamosEmJaneiro ? "pointer" : "not-allowed"};">
            <input type="checkbox" id="chk13" style="width:auto; margin-top:3px;" ${estamosEmJaneiro ? "" : "disabled"} />
            <span>Quero adiantar a <strong>1ª parcela do 13º salário</strong> junto com um dos períodos de férias (Lei 4.749/1965).</span>
          </label>
          <div id="areaPeriodo13" style="display:none; margin-top:10px;">
            <label for="periodo13">Em qual período?</label>
            <select id="periodo13"></select>
          </div>
          <p class="hint" style="margin-top:8px;">
            ${
              estamosEmJaneiro
                ? "Por lei, esse pedido só pode ser feito em janeiro do ano em que o período escolhido começa."
                : "⚠️ Disponível apenas em janeiro do ano em que as férias vão começar — fora dessa janela, a opção fica bloqueada por lei."
            }
          </p>
        </div>

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

  function atualizarSelectPeriodo13() {
    const select = document.getElementById("periodo13");
    const valorAtual = select.value;
    select.innerHTML = Array.from({ length: contadorPeriodos }, (_, i) => `<option value="${i + 1}">Período ${i + 1}</option>`).join("");
    if (valorAtual && Number(valorAtual) <= contadorPeriodos) select.value = valorAtual;
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

  const chk13 = document.getElementById("chk13");
  chk13.addEventListener("change", () => {
    document.getElementById("areaPeriodo13").style.display = chk13.checked ? "block" : "none";
    if (chk13.checked) atualizarSelectPeriodo13();
  });

  function atualizarResumo() {
    const dias = Array.from(container.querySelectorAll(".input-dias")).map((i) => Number(i.value || 0));
    const somaPeriodos = dias.reduce((a, b) => a + b, 0);
    const abono = Number(document.getElementById("abono").value || 0);
    const restante = diasDireito - abono - somaPeriodos;
    const resumo = document.getElementById("resumoDias");
    resumo.textContent = `Dias nos períodos: ${somaPeriodos} · Abono: ${abono} · ${
      restante === 0 ? "Total confere com seus dias de direito ✅" : `Faltam alocar ${restante} dia(s) para totalizar ${diasDireito}`
    }`;
    if (chk13.checked) atualizarSelectPeriodo13();
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
    const adiantar13 = document.getElementById("chk13").checked;
    const periodoAdiantamento13 = adiantar13 ? Number(document.getElementById("periodo13").value) : undefined;

    try {
      await Api.request("/api/ferias", {
        method: "POST",
        body: { periodos, abonoPecuniarioDias, adiantar13, periodoAdiantamento13 },
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
          <tr><th>Períodos</th><th>Abono</th><th>13º adiantado</th><th>Total</th><th>Status</th><th>Enviado em</th><th></th></tr>
        </thead>
        <tbody>
          ${solicitacoes
            .map(
              (s) => `
            <tr>
              <td>${s.periodos.map((p) => `${fmtData(p.inicio)} a ${fmtData(somaDiasData(p.inicio, p.dias))} (${p.dias}d)`).join("<br/>")}</td>
              <td>${s.abonoPecuniarioDias || 0} dias</td>
              <td>${s.adiantar13 ? `🎁 Período ${s.periodoAdiantamento13}` : "-"}</td>
              <td>${s.totalDias} dias</td>
              <td><span class="badge ${s.status}">${s.status}</span>${s.comentarioGestor ? `<div class="hint">${s.comentarioGestor}</div>` : ""}</td>
              <td>${fmtData(s.criadoEm)}</td>
              <td>${s.status === "aprovado" ? `<button class="btn secundario pequeno" onclick="imprimirComprovante('${s._id}')">Imprimir pré-aprovação</button>` : ""}</td>
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
    <html><head><title>Programação de Férias - Pré-aprovada</title>
    <style>
      body{font-family:Arial,sans-serif;padding:40px;color:#111}
      h1{font-size:1.3rem;margin-bottom:4px}
      .aviso{background:#fdf1e1;border:1px solid #e0b370;color:#7a4a08;padding:12px 14px;border-radius:8px;font-size:0.85rem;margin:16px 0}
      table{border-collapse:collapse;width:100%;margin-top:16px} td,th{border:1px solid #ccc;padding:8px;text-align:left}
    </style>
    </head><body>
    <h1>Programação de Férias — Pré-aprovada</h1>
    <p style="color:#555;margin-top:0;">Acordo entre funcionário e gestor</p>
    <div class="aviso">
      ⚠️ Este documento <strong>não é um comprovante oficial de férias</strong> e não possui validade como efetividade do gozo.
      Ele apenas registra a programação combinada entre funcionário e gestor neste sistema. A aprovação final,
      incluindo o registro efetivo, é de responsabilidade do gerente/RH conforme os processos internos da empresa.
    </div>
    <p><strong>Funcionário:</strong> ${funcionarioAtual.nome}<br/>
    <strong>CPF:</strong> ${funcionarioAtual.cpf}</p>
    <table>
      <thead><tr><th>Período</th><th>Início</th><th>Fim</th><th>Dias</th><th>1ª parcela do 13º</th></tr></thead>
      <tbody>
        ${s.periodos
          .map(
            (p, i) =>
              `<tr><td>${i + 1}</td><td>${fmtData(p.inicio)}</td><td>${fmtData(somaDiasData(p.inicio, p.dias))}</td><td>${p.dias}</td><td>${
                s.adiantar13 && s.periodoAdiantamento13 === i + 1 ? "Sim" : "-"
              }</td></tr>`
          )
          .join("")}
      </tbody>
    </table>
    <p><strong>Abono pecuniário:</strong> ${s.abonoPecuniarioDias || 0} dias</p>
    <p><strong>Adiantamento da 1ª parcela do 13º salário:</strong> ${
      s.adiantar13 ? `Sim, vinculado ao período ${s.periodoAdiantamento13} (Lei 4.749/1965)` : "Não solicitado"
    }</p>
    <p><strong>Status:</strong> Pré-aprovada pelo gestor (aguarda efetivação pelo RH/gerente)</p>
    </body></html>
  `);
  janela.document.close();
  janela.print();
}

init();
