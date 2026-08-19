let dadosDashboard = null;

const NOMES_MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function ehBissexto(ano) {
  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
}

function diasNoAno(ano) {
  return ehBissexto(ano) ? 366 : 365;
}

// Converte 'YYYY-MM-DD' em Date UTC (evita problemas de fuso horário).
function parseDataUTC(str) {
  const [ano, mes, dia] = String(str).slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function fmtDataUTC(date) {
  return date.toISOString().slice(0, 10).split("-").reverse().join("/");
}

// Dia do ano (1-based) de uma Date UTC dentro do ano informado.
function diaDoAno(date, ano) {
  const inicio = Date.UTC(ano, 0, 1);
  return Math.floor((date.getTime() - inicio) / 86400000) + 1;
}

function corPorNome(nome) {
  let hash = 0;
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 62%, 52%)`;
}

// Gera a lista de { funcionarioNome, inicio: Date, fim: Date } a partir das solicitações aprovadas.
function extrairPeriodos(feriasAprovadas) {
  const lista = [];
  for (const s of feriasAprovadas) {
    for (const p of s.periodos) {
      const inicio = parseDataUTC(p.inicio);
      const fim = new Date(inicio.getTime() + (Number(p.dias) - 1) * 86400000);
      lista.push({ funcionarioNome: s.funcionarioNome, inicio, fim });
    }
  }
  return lista;
}

function anosDisponiveis(periodos) {
  const anos = new Set();
  const atual = new Date().getUTCFullYear();
  anos.add(atual);
  for (const p of periodos) {
    anos.add(p.inicio.getUTCFullYear());
    anos.add(p.fim.getUTCFullYear());
  }
  return Array.from(anos).sort();
}

async function init() {
  if (!renderGestorNav("dashboard")) return;
  inicializarModal("modalListaNatCorp");

  try {
    dadosDashboard = await Api.request("/api/dashboard");
  } catch (err) {
    document.getElementById("statsGrid").innerHTML = `<div class="mensagem erro" style="display:block;">${err.message}</div>`;
    return;
  }

  renderStats();
  renderDonut();
  renderSemSolicitacao();

  const periodos = extrairPeriodos(dadosDashboard.feriasAprovadas || []);
  const anos = anosDisponiveis(periodos);
  const anoSelect = document.getElementById("anoSelect");
  anoSelect.innerHTML = anos.map((a) => `<option value="${a}">${a}</option>`).join("");
  anoSelect.value = String(new Date().getUTCFullYear());
  anoSelect.addEventListener("change", () => renderAno(periodos, Number(anoSelect.value)));

  renderAno(periodos, Number(anoSelect.value));
  renderGantt(periodos);
}

function renderStats() {
  const d = dadosDashboard;
  const qtdNatCorp = (d.requisicoesNatCorp || []).length;
  document.getElementById("statsGrid").innerHTML = `
    <div class="stat"><div class="valor">${d.totalFuncionarios}</div><div class="rotulo">Funcionários</div></div>
    <div class="stat"><div class="valor">${d.pendentes}</div><div class="rotulo">Pendentes</div></div>
    <div class="stat"><div class="valor">${d.aprovadas}</div><div class="rotulo">Aprovadas</div></div>
    <div class="stat"><div class="valor">${d.rejeitadas}</div><div class="rotulo">Rejeitadas</div></div>
    <div class="stat"><div class="valor">${d.canceladas || 0}</div><div class="rotulo">Canceladas</div></div>
    <div class="stat stat-clicavel" id="statNatCorp" role="button" tabindex="0" title="Ver funcionários e códigos">
      <div class="valor">${qtdNatCorp}</div><div class="rotulo">📋 Requisições NatCorp</div>
    </div>
  `;

  const statNatCorp = document.getElementById("statNatCorp");
  statNatCorp.addEventListener("click", abrirModalListaNatCorp);
  statNatCorp.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") abrirModalListaNatCorp();
  });
}

function abrirModalListaNatCorp() {
  const lista = dadosDashboard.requisicoesNatCorp || [];
  const container = document.getElementById("listaModalNatCorp");
  if (!lista.length) {
    container.innerHTML = `<p class="hint">Nenhuma requisição do NatCorp informada ainda pelos funcionários.</p>`;
  } else {
    container.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Funcionário</th><th>CPF</th><th>Nº Requisição NatCorp</th></tr></thead>
          <tbody>
            ${lista
              .slice()
              .sort((a, b) => a.funcionarioNome.localeCompare(b.funcionarioNome))
              .map((r) => `<tr><td>${r.funcionarioNome}</td><td>${r.funcionarioCpf}</td><td>${r.numeroRequisicaoNatCorp}</td></tr>`)
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }
  abrirModal("modalListaNatCorp");
}

function renderDonut() {
  const d = dadosDashboard;
  const partes = [
    { label: "Pendentes", valor: d.pendentes, cor: "var(--pendente)" },
    { label: "Aprovadas", valor: d.aprovadas, cor: "var(--sucesso)" },
    { label: "Rejeitadas", valor: d.rejeitadas, cor: "var(--erro)" },
    { label: "Canceladas", valor: d.canceladas || 0, cor: "var(--texto-suave)" },
  ];
  const total = partes.reduce((a, b) => a + b.valor, 0);

  const wrap = document.getElementById("donutStatus");
  if (!total) {
    wrap.innerHTML = `<p class="hint">Nenhuma solicitação registrada ainda.</p>`;
    return;
  }

  let acumulado = 0;
  const stops = partes
    .filter((p) => p.valor > 0)
    .map((p) => {
      const inicio = (acumulado / total) * 100;
      acumulado += p.valor;
      const fim = (acumulado / total) * 100;
      return `${p.cor} ${inicio}% ${fim}%`;
    })
    .join(", ");

  wrap.innerHTML = `
    <div class="donut-wrap">
      <div class="donut" style="background: conic-gradient(${stops});">
        <div class="donut-total"><div class="n">${total}</div><div class="r">total</div></div>
      </div>
      <div class="legenda">
        ${partes
          .map(
            (p) => `
          <div class="legenda-item">
            <span class="dot" style="background:${p.cor}"></span>
            <span>${p.label}: <strong>${p.valor}</strong> ${total ? `(${Math.round((p.valor / total) * 100)}%)` : ""}</span>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderAno(periodos, ano) {
  renderBarraMensal(periodos, ano);
  renderConcentracao(periodos, ano);
}

function renderBarraMensal(periodos, ano) {
  const contagemPorMes = Array(12).fill(0);
  for (let mes = 0; mes < 12; mes++) {
    const inicioMes = Date.UTC(ano, mes, 1);
    const fimMes = Date.UTC(ano, mes + 1, 0);
    const pessoas = new Set();
    for (const p of periodos) {
      if (p.inicio.getTime() <= fimMes && p.fim.getTime() >= inicioMes) {
        pessoas.add(p.funcionarioNome);
      }
    }
    contagemPorMes[mes] = pessoas.size;
  }
  const max = Math.max(1, ...contagemPorMes);

  document.getElementById("barMensal").innerHTML = `
    <div class="bar-chart">
      ${contagemPorMes
        .map(
          (qtd, i) => `
        <div class="bar-col">
          <div class="bar-valor">${qtd || ""}</div>
          <div class="bar" style="height:${(qtd / max) * 100}%; ${qtd === 0 ? "background:var(--borda);" : ""}"></div>
          <div class="bar-label">${NOMES_MESES[i]}</div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

const PX_POR_DIA = 5.5;
const LARGURA_COLUNA_NOME = 170;

function diaAbsoluto(date) {
  // Índice de dia absoluto (desde uma época fixa) — usado para posicionar tudo em px.
  return Math.floor(date.getTime() / 86400000);
}

function renderGantt(periodos) {
  const container = document.getElementById("calendarioAnual");

  if (!periodos.length) {
    container.innerHTML = `<p class="gantt-empty">Nenhuma férias aprovada ainda.</p>`;
    return;
  }

  const hoje = new Date();
  const anoAtual = hoje.getUTCFullYear();

  let minAno = anoAtual;
  let maxAno = anoAtual;
  periodos.forEach((p) => {
    minAno = Math.min(minAno, p.inicio.getUTCFullYear());
    maxAno = Math.max(maxAno, p.fim.getUTCFullYear());
  });

  const rangeInicio = new Date(Date.UTC(minAno, 0, 1));
  const rangeFim = new Date(Date.UTC(maxAno, 11, 31));
  const diaBase = diaAbsoluto(rangeInicio);
  const totalDias = diaAbsoluto(rangeFim) - diaBase + 1;
  const larguraTotal = totalDias * PX_POR_DIA;

  function pxDoDia(date) {
    return (diaAbsoluto(date) - diaBase) * PX_POR_DIA;
  }

  // Cabeçalho: um rótulo por mês, largura proporcional aos dias daquele mês.
  const meses = [];
  for (let ano = minAno; ano <= maxAno; ano++) {
    for (let mes = 0; mes < 12; mes++) {
      const inicioMes = new Date(Date.UTC(ano, mes, 1));
      const fimMes = new Date(Date.UTC(ano, mes + 1, 0));
      const largura = (diaAbsoluto(fimMes) - diaAbsoluto(inicioMes) + 1) * PX_POR_DIA;
      meses.push({ ano, mes, largura, offset: pxDoDia(inicioMes), inicioDeAno: mes === 0 });
    }
  }

  const headerHtml = meses
    .map(
      (m) =>
        `<div class="gantt-mes-label ${m.inicioDeAno ? "ano-novo" : ""}" style="width:${m.largura}px; flex-basis:${m.largura}px;">${NOMES_MESES[m.mes]}${
          m.inicioDeAno ? " " + m.ano : ""
        }</div>`
    )
    .join("");

  const gridlinesHtml = meses
    .filter((m) => m.offset > 0)
    .map((m) => `<div class="gantt-gridline ${m.inicioDeAno ? "ano-novo" : ""}" style="left:${m.offset}px;"></div>`)
    .join("");

  // Agrupa por funcionário (uma linha por pessoa, podendo ter mais de uma barra).
  const porFuncionario = new Map();
  for (const p of periodos) {
    if (!porFuncionario.has(p.funcionarioNome)) porFuncionario.set(p.funcionarioNome, []);
    porFuncionario.get(p.funcionarioNome).push(p);
  }
  const linhas = Array.from(porFuncionario.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  const linhasHtml = linhas
    .map(([nome, barras]) => {
      const cor = corPorNome(nome);
      const barrasHtml = barras
        .map((b) => {
          const left = pxDoDia(b.inicio);
          const width = pxDoDia(b.fim) - left + PX_POR_DIA;
          const titulo = `${nome}: ${fmtDataUTC(b.inicio)} a ${fmtDataUTC(b.fim)}`;
          return `<div class="gantt-bar" title="${titulo}" style="left:${left}px; width:${width}px; background:${cor};"></div>`;
        })
        .join("");
      return `
        <div class="gantt-row">
          <div class="gantt-nome" title="${nome}">${nome}</div>
          <div class="gantt-track" style="width:${larguraTotal}px;">${barrasHtml}</div>
        </div>
      `;
    })
    .join("");

  // Linha marcando "hoje", quando estiver dentro do intervalo exibido.
  let hojeHtml = "";
  let hojePx = null;
  if (hoje >= rangeInicio && hoje <= rangeFim) {
    hojePx = pxDoDia(new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate())));
    hojeHtml = `<div class="gantt-hoje-linha" style="left:${hojePx}px;"><span class="gantt-hoje-rotulo">hoje</span></div>`;
  }

  container.innerHTML = `
    <div class="gantt">
      <div class="gantt-inner" style="width:${LARGURA_COLUNA_NOME + larguraTotal}px;">
        <div class="gantt-header-row">
          <div class="gantt-corner"></div>
          ${headerHtml}
        </div>
        <div class="gantt-body">
          <div class="gantt-gridlines" style="width:${larguraTotal}px;">${gridlinesHtml}${hojeHtml}</div>
          ${linhasHtml}
        </div>
      </div>
    </div>
  `;

  // Rola automaticamente até "hoje" (centralizado), para já abrir mostrando o período relevante.
  const scrollWrap = container.querySelector(".gantt");
  if (scrollWrap && hojePx !== null) {
    requestAnimationFrame(() => {
      scrollWrap.scrollLeft = Math.max(0, LARGURA_COLUNA_NOME + hojePx - scrollWrap.clientWidth / 2);
    });
  }
}

function renderConcentracao(periodos, ano) {
  const total = diasNoAno(ano);
  const contagem = new Array(total + 1).fill(0); // índice 1..total
  const nomesPorDia = Array.from({ length: total + 1 }, () => []);

  for (const p of periodos) {
    if (p.inicio.getUTCFullYear() > ano || p.fim.getUTCFullYear() < ano) continue;
    const inicioClip = p.inicio.getTime() < Date.UTC(ano, 0, 1) ? new Date(Date.UTC(ano, 0, 1)) : p.inicio;
    const fimClip = p.fim.getTime() > Date.UTC(ano, 11, 31) ? new Date(Date.UTC(ano, 11, 31)) : p.fim;
    const diaIni = diaDoAno(inicioClip, ano);
    const diaFim = diaDoAno(fimClip, ano);
    for (let d = diaIni; d <= diaFim; d++) {
      contagem[d]++;
      nomesPorDia[d].push(p.funcionarioNome);
    }
  }

  const dias = [];
  for (let d = 1; d <= total; d++) {
    if (contagem[d] >= 2) dias.push({ dia: d, qtd: contagem[d], nomes: nomesPorDia[d] });
  }
  dias.sort((a, b) => b.qtd - a.qtd);
  const top = dias.slice(0, 5);

  const div = document.getElementById("concentracaoDias");
  if (!top.length) {
    div.innerHTML = `<p class="hint">Nenhum dia com sobreposição de férias entre dois ou mais funcionários em ${ano}.</p>`;
    return;
  }

  div.innerHTML = `
    <div class="concentracao-lista">
      ${top
        .map((item) => {
          const data = new Date(Date.UTC(ano, 0, item.dia));
          const nomesUnicos = Array.from(new Set(item.nomes));
          const limite = obterLimiteSimultaneoDashboard();
          const nivel = item.qtd > limite ? "critico" : item.qtd === limite ? "atencao" : "livre";
          return `
          <div class="concentracao-item">
            <div class="concentracao-cabecalho">
              <span><strong>${fmtDataUTC(data)}</strong> — ${item.qtd} funcionários simultaneamente</span>
              <span class="badge-sobreposicao ${nivel}">${nivel === "critico" ? "🔴" : nivel === "atencao" ? "🟡" : "🟢"} ${
            nivel === "critico" ? "acima do limite" : nivel === "atencao" ? "no limite" : "dentro do limite"
          } (${limite})</span>
            </div>
            <div class="concentracao-nomes">${nomesUnicos.join(", ")}</div>
          </div>
        `;
        })
        .join("")}
    </div>
  `;
}

// Limite simultâneo recomendado, compartilhado (via localStorage) com a tela de Solicitações,
// para os dois lugares do sistema usarem a mesma referência ao sinalizar concentração de férias.
function obterLimiteSimultaneoDashboard() {
  const salvo = Number(localStorage.getItem("ferias_limite_simultaneo"));
  return salvo && salvo > 0 ? salvo : 3;
}

let ordenacaoSemSolicitacao = { campo: "nome", asc: true };
const COLUNAS_SEM_SOLICITACAO = [
  { campo: "nome", label: "Nome" },
  { campo: "cpf", label: "CPF" },
  { campo: "regiao", label: "Região" },
  { campo: "gestor", label: "Gestor" },
];

function ordenarSemSolicitacao(campo) {
  if (ordenacaoSemSolicitacao.campo === campo) {
    ordenacaoSemSolicitacao.asc = !ordenacaoSemSolicitacao.asc;
  } else {
    ordenacaoSemSolicitacao = { campo, asc: true };
  }
  renderSemSolicitacao();
}

function renderSemSolicitacao() {
  const div = document.getElementById("semSolicitacao");
  const stats = dadosDashboard;
  if (!stats.semSolicitacao.length) {
    div.innerHTML = `<p class="hint">Todos os funcionários já possuem uma solicitação em andamento ou aprovada.</p>`;
    return;
  }

  const { campo, asc } = ordenacaoSemSolicitacao;
  const lista = [...stats.semSolicitacao].sort((a, b) => {
    const va = String(a[campo] || "").toLowerCase();
    const vb = String(b[campo] || "").toLowerCase();
    if (va < vb) return asc ? -1 : 1;
    if (va > vb) return asc ? 1 : -1;
    return 0;
  });

  const headerHtml = COLUNAS_SEM_SOLICITACAO.map((c) => {
    const ativo = campo === c.campo;
    const seta = ativo ? (asc ? "▲" : "▼") : "↕";
    return `<th class="ordenavel ${ativo ? "ativo" : ""}" data-campo="${c.campo}">${c.label} <span class="seta">${seta}</span></th>`;
  }).join("");

  div.innerHTML = `
    <div class="table-wrap">
      <table class="tabela-resizavel" id="tabelaSemSolicitacao">
        <thead><tr>${headerHtml}</tr></thead>
        <tbody>
          ${lista
            .map((f) => `<tr><td title="${f.nome}">${f.nome}</td><td>${f.cpf}</td><td title="${f.regiao || ""}">${f.regiao || "-"}</td><td title="${f.gestor || ""}">${f.gestor || "-"}</td></tr>`)
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  div.querySelectorAll("th.ordenavel").forEach((th) => {
    th.addEventListener("click", () => ordenarSemSolicitacao(th.dataset.campo));
  });
  inicializarTabelaRedimensionavel("tabelaSemSolicitacao");
}

init();
