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

function menorDataPeriodo(s) {
  if (!s.periodos || !s.periodos.length) return "9999-99-99";
  return s.periodos.reduce((min, p) => (p.inicio < min ? p.inicio : min), s.periodos[0].inicio);
}

const LIMITE_STORAGE_KEY = "ferias_limite_simultaneo";
function obterLimiteSimultaneo() {
  const salvo = Number(localStorage.getItem(LIMITE_STORAGE_KEY));
  return salvo && salvo > 0 ? salvo : 3;
}
function salvarLimiteSimultaneo(valor) {
  localStorage.setItem(LIMITE_STORAGE_KEY, String(valor));
}

let regioesDoGestor = [];
let regioesFiltroAtual = [];
let todasSolicitacoes = []; // sempre TODOS os status que o gestor pode ver (filtragem é feita no navegador)
let ordenacaoAtual = { campo: "criadoEm", asc: false };

const COLUNAS_FERIAS = [
  { campo: "funcionarioNome", label: "Funcionário" },
  { campo: "inicioGozo", label: "Início do Período" },
  { campo: "status", label: "Status" },
  { campo: "criadoEm", label: "Enviado em" },
];

async function init() {
  if (!renderGestorNav("ferias")) return;
  document.getElementById("filtroStatus").addEventListener("change", renderTabela);

  const limiteInput = document.getElementById("limiteSimultaneo");
  limiteInput.value = obterLimiteSimultaneo();
  limiteInput.addEventListener("change", () => {
    const v = Math.max(1, Number(limiteInput.value) || 3);
    limiteInput.value = v;
    salvarLimiteSimultaneo(v);
    renderTabela();
  });

  inicializarModal("modalExportar");
  document.getElementById("btnAbrirExportar").addEventListener("click", () => {
    document.getElementById("msgExportar").className = "mensagem";
    abrirModal("modalExportar");
  });
  document.getElementById("btnExportarTodos").addEventListener("click", () => {
    document.querySelectorAll('#statusExportarGrid input[type="checkbox"]').forEach((c) => (c.checked = true));
  });
  document.getElementById("btnExportarNenhum").addEventListener("click", () => {
    document.querySelectorAll('#statusExportarGrid input[type="checkbox"]').forEach((c) => (c.checked = false));
  });
  document.getElementById("btnGerarPDF").addEventListener("click", () => gerarRelatorio("pdf"));
  document.getElementById("btnGerarExcel").addEventListener("click", () => gerarRelatorio("excel"));

  try {
    const todasRegioes = await Api.request("/api/regioes");
    const meusPermitidas = Api.getRegioes();
    const permitidas = meusPermitidas.length ? todasRegioes.filter((r) => meusPermitidas.includes(r.nome)) : todasRegioes;
    regioesDoGestor = permitidas.map((r) => r.nome);

    criarSeletorRegioes(
      "filtroRegioes",
      regioesDoGestor,
      (selecionadas) => {
        regioesFiltroAtual = selecionadas;
        renderTabela();
      },
      "ferias"
    );
  } catch (err) {
    console.error(err);
  }

  await carregarLista();
}

async function carregarLista() {
  const div = document.getElementById("listaSolicitacoes");
  try {
    // Busca SEMPRE todos os status (a filtragem por status agora acontece no navegador),
    // para que a detecção de sobreposição enxergue aprovados/pendentes mesmo quando a
    // tabela está filtrada para mostrar só um status.
    todasSolicitacoes = await Api.request("/api/ferias");
    renderTabela();
  } catch (err) {
    div.innerHTML = `<div class="mensagem erro" style="display:block;">${err.message}</div>`;
  }
}

// Calcula, para uma solicitação, quais outras (aprovadas ou pendentes, de qualquer status
// exceto a própria) têm ao menos um período com datas sobrepostas.
function calcularConflitos(alvo, universo) {
  const aprovados = new Map(); // nome -> [ 'dd/mm a dd/mm', ... ]
  const pendentes = new Map();

  for (const outra of universo) {
    if (outra._id === alvo._id) continue;
    if (outra.status !== "aprovado" && outra.status !== "pendente") continue;

    for (const pAlvo of alvo.periodos) {
      const inicioAlvo = pAlvo.inicio;
      const fimAlvo = somaDiasData(pAlvo.inicio, pAlvo.dias);
      for (const pOutra of outra.periodos) {
        const inicioOutra = pOutra.inicio;
        const fimOutra = somaDiasData(pOutra.inicio, pOutra.dias);
        const sobrepoe = inicioAlvo <= fimOutra && inicioOutra <= fimAlvo;
        if (!sobrepoe) continue;
        const alvoMap = outra.status === "aprovado" ? aprovados : pendentes;
        if (!alvoMap.has(outra.funcionarioNome)) alvoMap.set(outra.funcionarioNome, []);
        alvoMap.get(outra.funcionarioNome).push(`${fmtData(pOutra.inicio)} a ${fmtData(fimOutra)}`);
      }
    }
  }

  return { aprovados, pendentes };
}

function renderBadgeSobreposicao(solicitacao, conflito, limite) {
  if (solicitacao.status !== "pendente" && solicitacao.status !== "aprovado") {
    return `<span class="hint">-</span>`;
  }

  const aprovadosCount = conflito.aprovados.size;
  const pendentesCount = conflito.pendentes.size;

  if (aprovadosCount === 0 && pendentesCount === 0) {
    return `<span class="badge-sobreposicao livre">✅ Sem sobreposição</span>`;
  }

  // Projeção: se esta solicitação (quando pendente) for aprovada, quantos ficam simultâneos.
  const totalProjetado = aprovadosCount + (solicitacao.status === "pendente" ? 1 : 0);
  const nivel = totalProjetado > limite ? "critico" : totalProjetado === limite ? "atencao" : aprovadosCount > 0 ? "atencao" : "livre";
  const icone = nivel === "critico" ? "🔴" : nivel === "atencao" ? "🟡" : "🟢";

  const partes = [];
  if (aprovadosCount) partes.push(`${aprovadosCount} aprovado(s)`);
  if (pendentesCount) partes.push(`${pendentesCount} pendente(s)`);

  const detalhesTitulo = [
    aprovadosCount ? `Aprovados: ${Array.from(conflito.aprovados.keys()).join(", ")}` : "",
    pendentesCount ? `Pendentes: ${Array.from(conflito.pendentes.keys()).join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  const linhaProjecao =
    solicitacao.status === "pendente" && aprovadosCount > 0
      ? `<span class="sobreposicao-linha">Se aprovar: ${totalProjetado} simultâneo(s) (limite: ${limite})</span>`
      : "";

  return `<span class="badge-sobreposicao ${nivel}" title="${detalhesTitulo}">${icone} ${partes.join(" + ")}</span>${linhaProjecao}`;
}

function ordenarLista(lista) {
  const { campo, asc } = ordenacaoAtual;
  const copia = [...lista];
  copia.sort((a, b) => {
    let va, vb;
    if (campo === "inicioGozo") {
      va = menorDataPeriodo(a);
      vb = menorDataPeriodo(b);
    } else if (campo === "funcionarioNome") {
      va = String(a.funcionarioNome || "").toLowerCase();
      vb = String(b.funcionarioNome || "").toLowerCase();
    } else {
      va = a[campo] || "";
      vb = b[campo] || "";
    }
    if (va < vb) return asc ? -1 : 1;
    if (va > vb) return asc ? 1 : -1;
    return 0;
  });
  return copia;
}

function ordenarPor(campo) {
  if (ordenacaoAtual.campo === campo) {
    ordenacaoAtual.asc = !ordenacaoAtual.asc;
  } else {
    ordenacaoAtual = { campo, asc: true };
  }
  renderTabela();
}

function renderTabela() {
  const div = document.getElementById("listaSolicitacoes");

  // 1) Filtro de região (aplicado ao universo completo, pois a sobreposição também deve
  //    respeitar a região que o gestor está enxergando).
  const universoRegional =
    regioesFiltroAtual.length && regioesDoGestor.length && regioesFiltroAtual.length < regioesDoGestor.length
      ? todasSolicitacoes.filter((s) => regioesFiltroAtual.includes(s.funcionarioRegiao))
      : regioesDoGestor.length && regioesFiltroAtual.length === 0
      ? []
      : todasSolicitacoes;

  // 2) Filtro de status (só afeta o que é exibido na tabela — a detecção de sobreposição
  //    continua considerando aprovados/pendentes de todos os status visíveis na região).
  const statusSelecionado = document.getElementById("filtroStatus").value;
  const listaExibida = statusSelecionado ? universoRegional.filter((s) => s.status === statusSelecionado) : universoRegional;

  if (!listaExibida.length) {
    div.innerHTML = `<p class="hint">Nenhuma solicitação encontrada.</p>`;
    return;
  }

  const limite = obterLimiteSimultaneo();
  const lista = ordenarLista(listaExibida);

  const headerHtml = COLUNAS_FERIAS.map((c) => {
    const ativo = ordenacaoAtual.campo === c.campo;
    const seta = ativo ? (ordenacaoAtual.asc ? "▲" : "▼") : "↕";
    return `<th class="ordenavel ${ativo ? "ativo" : ""}" data-campo="${c.campo}">${c.label} <span class="seta">${seta}</span></th>`;
  }).join("");

  div.innerHTML = `
    <div class="table-wrap">
      <table class="tabela-resizavel" id="tabelaFerias">
        <thead>
          <tr>
            ${headerHtml}
            <th>Períodos</th>
            <th>Abono</th>
            <th>13º adiantado</th>
            <th>Sobreposição</th>
            <th class="nao-redimensionavel">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${lista
            .map((s) => {
              const conflito = calcularConflitos(s, universoRegional);
              return `
            <tr>
              <td title="${s.funcionarioNome}">${s.funcionarioNome}<br/><span class="hint">${s.funcionarioCpf}</span></td>
              <td>${fmtData(menorDataPeriodo(s))}</td>
              <td><span class="badge ${s.status}">${s.status}</span>${s.comentarioGestor ? `<div class="hint">${s.comentarioGestor}</div>` : ""}</td>
              <td>${fmtData(s.criadoEm)}</td>
              <td>${s.periodos.map((p) => `${fmtData(p.inicio)} a ${fmtData(somaDiasData(p.inicio, p.dias))} (${p.dias}d)`).join("<br/>")}</td>
              <td>${s.abonoPecuniarioDias || 0} dias</td>
              <td>${s.adiantar13 ? `🎁 Período ${s.periodoAdiantamento13}` : "-"}</td>
              <td class="permite-quebra">${renderBadgeSobreposicao(s, conflito, limite)}</td>
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
          `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  div.querySelectorAll("th.ordenavel").forEach((th) => {
    th.addEventListener("click", () => ordenarPor(th.dataset.campo));
  });

  inicializarTabelaRedimensionavel("tabelaFerias");
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

async function gerarRelatorio(tipo) {
  const msg = document.getElementById("msgExportar");
  msg.className = "mensagem";

  const statusesSelecionados = Array.from(document.querySelectorAll('#statusExportarGrid input[type="checkbox"]:checked')).map((c) => c.value);
  if (!statusesSelecionados.length) {
    msg.className = "mensagem erro";
    msg.textContent = "Selecione ao menos um status para gerar o relatório.";
    return;
  }

  msg.className = "mensagem info";
  msg.textContent = "Gerando relatório...";

  try {
    let filtradas =
      regioesFiltroAtual.length && regioesDoGestor.length && regioesFiltroAtual.length < regioesDoGestor.length
        ? todasSolicitacoes.filter((s) => regioesFiltroAtual.includes(s.funcionarioRegiao))
        : regioesDoGestor.length && regioesFiltroAtual.length === 0
        ? []
        : todasSolicitacoes;

    filtradas = filtradas.filter((s) => statusesSelecionados.includes(s.status));

    if (!filtradas.length) {
      msg.className = "mensagem erro";
      msg.textContent = "Nenhuma solicitação encontrada para os status/regiões selecionados.";
      return;
    }

    const linhas = montarLinhasRelatorio(filtradas);

    if (tipo === "pdf") {
      gerarPDFRelatorio(linhas, statusesSelecionados);
    } else {
      gerarExcelRelatorio(linhas);
    }

    msg.className = "mensagem sucesso";
    msg.textContent = `Relatório gerado com ${filtradas.length} solicitação(ões) / ${linhas.length} período(s).`;
  } catch (err) {
    msg.className = "mensagem erro";
    msg.textContent = err.message;
  }
}

init();
