function fmtData(iso) {
  if (!iso) return "-";
  const [ano, mes, dia] = String(iso).slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

let todosFuncionarios = [];
let regioesDoGestor = [];
let regioesFiltroAtual = [];
let ordenacaoAtual = { campo: "dataLimiteInicioFerias", asc: true };
let editandoId = null;
let arquivoCsvTexto = null;

const COLUNAS = [
  { campo: "nome", label: "Nome" },
  { campo: "cpf", label: "CPF" },
  { campo: "matricula", label: "Matrícula" },
  { campo: "gestor", label: "Gestor" },
  { campo: "regiao", label: "Região" },
  { campo: "periodoAquisitivoInicio", label: "Aquisitivo (início)" },
  { campo: "periodoAquisitivoFim", label: "Aquisitivo (fim)" },
  { campo: "dataLimiteInicioFerias", label: "Prazo limite" },
];

async function init() {
  if (!renderGestorNav("funcionarios")) return;

  inicializarModal("modalFuncionario");
  inicializarModal("modalImportar");
  aplicarMascaraCPF(document.getElementById("cpf"));

  document.getElementById("formNovo").addEventListener("submit", salvarFuncionario);
  document.getElementById("btnExcluirFuncionario").addEventListener("click", () => excluirFuncionario(editandoId, true));
  document.getElementById("btnAbrirNovo").addEventListener("click", () => {
    sairModoEdicao();
    abrirModal("modalFuncionario");
  });
  document.getElementById("btnAbrirImportar").addEventListener("click", () => {
    document.getElementById("msgLote").className = "mensagem";
    document.getElementById("loteTexto").value = "";
    document.getElementById("arquivoCsv").value = "";
    document.getElementById("nomeArquivoCsv").textContent = "";
    arquivoCsvTexto = null;
    abrirModal("modalImportar");
  });

  document.getElementById("tabColar").addEventListener("click", () => alternarAbaImportar("colar"));
  document.getElementById("tabArquivo").addEventListener("click", () => alternarAbaImportar("arquivo"));
  document.getElementById("arquivoCsv").addEventListener("change", carregarArquivoCsv);
  document.getElementById("btnImportar").addEventListener("click", importarLote);

  document.getElementById("busca").addEventListener("input", debounce(carregarLista, 350));

  await carregarListaRegioes();
  await carregarLista();
}

function alternarAbaImportar(aba) {
  document.getElementById("tabColar").classList.toggle("ativo", aba === "colar");
  document.getElementById("tabArquivo").classList.toggle("ativo", aba === "arquivo");
  document.getElementById("painelColar").style.display = aba === "colar" ? "block" : "none";
  document.getElementById("painelArquivo").style.display = aba === "arquivo" ? "block" : "none";
}

function carregarArquivoCsv() {
  const input = document.getElementById("arquivoCsv");
  const file = input.files[0];
  if (!file) return;
  document.getElementById("nomeArquivoCsv").textContent = file.name;
  const leitor = new FileReader();
  leitor.onload = () => {
    arquivoCsvTexto = String(leitor.result || "");
  };
  leitor.readAsText(file, "utf-8");
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

async function carregarListaRegioes() {
  try {
    regioesDoGestor = await Api.request("/api/funcionarios?listaRegioes=true");
    document.getElementById("listaRegioesDatalist").innerHTML = regioesDoGestor.map((r) => `<option value="${r}"></option>`).join("");
    criarSeletorRegioes(
      "filtroRegioes",
      regioesDoGestor,
      (selecionadas) => {
        regioesFiltroAtual = selecionadas;
        carregarLista();
      },
      "funcionarios"
    );
  } catch (err) {
    console.error(err);
  }
}

function limparFormulario() {
  document.getElementById("formNovo").reset();
  document.getElementById("funcionarioId").value = "";
  document.getElementById("diasDireito").value = 30;
}

function sairModoEdicao() {
  editandoId = null;
  limparFormulario();
  document.getElementById("tituloFormFuncionario").textContent = "Novo funcionário";
  document.getElementById("btnSalvarFuncionario").textContent = "Cadastrar";
  document.getElementById("btnExcluirFuncionario").style.display = "none";
  document.getElementById("msgNovo").className = "mensagem";
}

function entrarModoEdicao(f) {
  editandoId = f._id;
  document.getElementById("funcionarioId").value = f._id;
  document.getElementById("nome").value = f.nome || "";
  document.getElementById("cpf").value = f.cpf || "";
  aplicarMascaraCPF(document.getElementById("cpf"));
  document.getElementById("matricula").value = f.matricula || "";
  document.getElementById("gestorNome").value = f.gestor || "";
  document.getElementById("regiao").value = f.regiao || "";
  document.getElementById("inicioAquisitivo").value = (f.periodoAquisitivoInicio || "").slice(0, 10);
  document.getElementById("diasDireito").value = f.diasDireito || 30;
  document.getElementById("fimAquisitivo").value = (f.periodoAquisitivoFim || "").slice(0, 10);
  document.getElementById("limiteInicio").value = (f.dataLimiteInicioFerias || "").slice(0, 10);
  document.getElementById("limiteProgramacao").value = (f.dataLimiteProgramacao || "").slice(0, 10);

  document.getElementById("tituloFormFuncionario").textContent = `Editando: ${f.nome}`;
  document.getElementById("btnSalvarFuncionario").textContent = "Salvar alterações";
  document.getElementById("btnExcluirFuncionario").style.display = "inline-flex";
  document.getElementById("msgNovo").className = "mensagem";
  abrirModal("modalFuncionario");
}

function dadosDoFormulario() {
  return {
    nome: document.getElementById("nome").value,
    cpf: somenteNumerosCPF(document.getElementById("cpf").value),
    matricula: document.getElementById("matricula").value,
    gestor: document.getElementById("gestorNome").value,
    regiao: document.getElementById("regiao").value,
    periodoAquisitivoInicio: document.getElementById("inicioAquisitivo").value,
    diasDireito: document.getElementById("diasDireito").value,
    periodoAquisitivoFim: document.getElementById("fimAquisitivo").value || undefined,
    dataLimiteInicioFerias: document.getElementById("limiteInicio").value || undefined,
    dataLimiteProgramacao: document.getElementById("limiteProgramacao").value || undefined,
  };
}

async function salvarFuncionario(e) {
  e.preventDefault();
  const msg = document.getElementById("msgNovo");
  msg.className = "mensagem";
  try {
    if (editandoId) {
      await Api.request("/api/funcionarios", { method: "PUT", body: { id: editandoId, ...dadosDoFormulario() } });
    } else {
      await Api.request("/api/funcionarios", { method: "POST", body: dadosDoFormulario() });
    }
    fecharModal("modalFuncionario");
    sairModoEdicao();
    await carregarListaRegioes();
    await carregarLista();
  } catch (err) {
    msg.className = "mensagem erro";
    msg.textContent = err.message;
  }
}

// Detecta se a primeira linha é um cabeçalho (ex.: "nome;cpf;...") e a descarta.
function removerCabecalho(linhas) {
  if (!linhas.length) return linhas;
  const primeiraColuna = (linhas[0].split(";")[0] || "").trim().toLowerCase();
  if (["nome", "name", "funcionario", "funcionário"].includes(primeiraColuna)) {
    return linhas.slice(1);
  }
  return linhas;
}

function parseLote(texto) {
  const linhas = removerCabecalho(
    texto
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length)
  );
  return linhas
    .map((linha) => {
      const [nome, cpf, matricula, gestor, regiao, periodoAquisitivoInicio, periodoAquisitivoFim, dataLimiteInicioFerias, dataLimiteProgramacao] = linha
        .split(";")
        .map((c) => (c || "").trim());
      return {
        nome,
        cpf,
        matricula,
        gestor,
        regiao,
        periodoAquisitivoInicio,
        periodoAquisitivoFim: periodoAquisitivoFim || undefined,
        dataLimiteInicioFerias: dataLimiteInicioFerias || undefined,
        dataLimiteProgramacao: dataLimiteProgramacao || undefined,
      };
    })
    .filter((item) => item.nome);
}

async function importarLote() {
  const msg = document.getElementById("msgLote");
  msg.className = "mensagem";

  const usandoArquivo = document.getElementById("tabArquivo").classList.contains("ativo");
  const texto = usandoArquivo ? arquivoCsvTexto : document.getElementById("loteTexto").value;

  if (!texto) {
    msg.className = "mensagem erro";
    msg.textContent = usandoArquivo ? "Selecione um arquivo .csv." : "Cole ao menos uma linha válida.";
    return;
  }

  const lote = parseLote(texto);
  if (!lote.length) {
    msg.className = "mensagem erro";
    msg.textContent = "Nenhuma linha válida encontrada.";
    return;
  }
  try {
    const resultado = await Api.request("/api/funcionarios", { method: "POST", body: { lote } });
    msg.className = "mensagem sucesso";
    msg.textContent =
      `Importação concluída: ${resultado.criados} criado(s), ${resultado.atualizados} atualizado(s).` +
      (resultado.erros.length ? ` Erros: ${resultado.erros.join(" | ")}` : "");
    await carregarListaRegioes();
    await carregarLista();
  } catch (err) {
    msg.className = "mensagem erro";
    msg.textContent = err.message;
  }
}

async function carregarLista() {
  const div = document.getElementById("listaFuncionarios");
  const busca = document.getElementById("busca").value;
  try {
    const params = new URLSearchParams();
    if (busca) params.set("busca", busca);
    if (regioesFiltroAtual.length && regioesFiltroAtual.length < regioesDoGestor.length) {
      params.set("regioes", regioesFiltroAtual.join(","));
    }
    const query = params.toString();
    todosFuncionarios = await Api.request(`/api/funcionarios${query ? "?" + query : ""}`);
    renderTabela();
  } catch (err) {
    div.innerHTML = `<div class="mensagem erro" style="display:block;">${err.message}</div>`;
  }
}

function ordenarLista(lista) {
  const { campo, asc } = ordenacaoAtual;
  const camposTexto = ["nome", "cpf", "matricula", "gestor", "regiao"];
  const copia = [...lista];
  copia.sort((a, b) => {
    let va = a[campo] || "";
    let vb = b[campo] || "";
    if (!camposTexto.includes(campo)) {
      va = va || "9999-99-99";
      vb = vb || "9999-99-99";
    } else {
      va = String(va).toLowerCase();
      vb = String(vb).toLowerCase();
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
  const div = document.getElementById("listaFuncionarios");
  if (!todosFuncionarios.length) {
    div.innerHTML = `<p class="hint">Nenhum funcionário encontrado.</p>`;
    return;
  }

  const lista = ordenarLista(todosFuncionarios);

  const headerHtml = COLUNAS.map((c) => {
    const ativo = ordenacaoAtual.campo === c.campo;
    const seta = ativo ? (ordenacaoAtual.asc ? "▲" : "▼") : "↕";
    return `<th class="ordenavel ${ativo ? "ativo" : ""}" data-campo="${c.campo}" title="${c.label}">${c.label} <span class="seta">${seta}</span></th>`;
  }).join("");

  div.innerHTML = `
    <div class="table-wrap">
      <table class="tabela-fixa">
        <colgroup>
          <col style="width:20%" /><col style="width:14%" /><col style="width:9%" /><col style="width:11%" />
          <col style="width:11%" /><col style="width:11%" /><col style="width:11%" /><col style="width:9%" /><col style="width:44px" />
        </colgroup>
        <thead>
          <tr>${headerHtml}<th></th></tr>
        </thead>
        <tbody>
          ${lista
            .map(
              (f) => `
            <tr>
              <td title="${f.nome}">${f.nome}</td>
              <td title="${f.cpf}">${f.cpf}</td>
              <td title="${f.matricula || ""}">${f.matricula || "-"}</td>
              <td title="${f.gestor || ""}">${f.gestor || "-"}</td>
              <td title="${f.regiao || ""}">${f.regiao || "-"}</td>
              <td>${fmtData(f.periodoAquisitivoInicio)}</td>
              <td>${fmtData(f.periodoAquisitivoFim)}</td>
              <td>${fmtData(f.dataLimiteInicioFerias)}</td>
              <td><button class="btn-icone" data-editar="${f._id}" title="Editar" aria-label="Editar">✏️</button></td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  div.querySelectorAll("th.ordenavel").forEach((th) => {
    th.addEventListener("click", () => ordenarPor(th.dataset.campo));
  });
  div.querySelectorAll("[data-editar]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const f = todosFuncionarios.find((x) => x._id === btn.dataset.editar);
      if (f) entrarModoEdicao(f);
    });
  });
}

async function excluirFuncionario(id, fecharModalAoExcluir) {
  if (!id) return;
  if (!confirm("Tem certeza que deseja excluir este funcionário? Esta ação não pode ser desfeita.")) return;
  try {
    await Api.request(`/api/funcionarios?id=${id}`, { method: "DELETE" });
    if (fecharModalAoExcluir) {
      fecharModal("modalFuncionario");
      sairModoEdicao();
    }
    await carregarLista();
  } catch (err) {
    alert(err.message);
  }
}

init();
