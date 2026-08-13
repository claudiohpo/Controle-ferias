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

  document.getElementById("formNovo").addEventListener("submit", salvarFuncionario);
  document.getElementById("btnImportar").addEventListener("click", importarLote);
  document.getElementById("busca").addEventListener("input", debounce(carregarLista, 350));
  document.getElementById("btnCancelarEdicao").addEventListener("click", sairModoEdicao);

  await carregarListaRegioes();
  await carregarLista();
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
  document.getElementById("btnCancelarEdicao").style.display = "none";
}

function entrarModoEdicao(f) {
  editandoId = f._id;
  document.getElementById("funcionarioId").value = f._id;
  document.getElementById("nome").value = f.nome || "";
  document.getElementById("cpf").value = f.cpf || "";
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
  document.getElementById("btnCancelarEdicao").style.display = "inline-flex";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function dadosDoFormulario() {
  return {
    nome: document.getElementById("nome").value,
    cpf: document.getElementById("cpf").value,
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
      msg.className = "mensagem sucesso";
      msg.textContent = "Funcionário atualizado com sucesso.";
    } else {
      await Api.request("/api/funcionarios", { method: "POST", body: dadosDoFormulario() });
      msg.className = "mensagem sucesso";
      msg.textContent = "Funcionário cadastrado com sucesso.";
    }
    sairModoEdicao();
    await carregarListaRegioes();
    await carregarLista();
  } catch (err) {
    msg.className = "mensagem erro";
    msg.textContent = err.message;
  }
}

function parseLote(texto) {
  return texto
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length)
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
    .filter((item) => item.nome && item.nome.toLowerCase() !== "nome");
}

async function importarLote() {
  const msg = document.getElementById("msgLote");
  msg.className = "mensagem";
  const texto = document.getElementById("loteTexto").value;
  const lote = parseLote(texto);
  if (!lote.length) {
    msg.className = "mensagem erro";
    msg.textContent = "Cole ao menos uma linha válida.";
    return;
  }
  try {
    const resultado = await Api.request("/api/funcionarios", { method: "POST", body: { lote } });
    msg.className = "mensagem sucesso";
    msg.textContent =
      `Importação concluída: ${resultado.criados} criado(s), ${resultado.atualizados} atualizado(s).` +
      (resultado.erros.length ? ` Erros: ${resultado.erros.join(" | ")}` : "");
    document.getElementById("loteTexto").value = "";
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
  const copia = [...lista];
  copia.sort((a, b) => {
    let va = a[campo] || "";
    let vb = b[campo] || "";
    if (campo !== "nome" && campo !== "cpf" && campo !== "matricula" && campo !== "gestor" && campo !== "regiao") {
      // campos de data: comparação textual ISO já funciona cronologicamente
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
    return `<th class="ordenavel ${ativo ? "ativo" : ""}" data-campo="${c.campo}">${c.label} <span class="seta">${seta}</span></th>`;
  }).join("");

  div.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>${headerHtml}<th></th></tr>
        </thead>
        <tbody>
          ${lista
            .map(
              (f) => `
            <tr>
              <td>${f.nome}</td>
              <td>${f.cpf}</td>
              <td>${f.matricula || "-"}</td>
              <td>${f.gestor || "-"}</td>
              <td>${f.regiao || "-"}</td>
              <td>${fmtData(f.periodoAquisitivoInicio)}</td>
              <td>${fmtData(f.periodoAquisitivoFim)}</td>
              <td>${fmtData(f.dataLimiteInicioFerias)}</td>
              <td style="white-space:nowrap;">
                <button class="btn secundario pequeno" data-editar="${f._id}">Editar</button>
                <button class="btn secundario pequeno" data-excluir="${f._id}">Excluir</button>
              </td>
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
  div.querySelectorAll("[data-excluir]").forEach((btn) => {
    btn.addEventListener("click", () => excluirFuncionario(btn.dataset.excluir));
  });
}

async function excluirFuncionario(id) {
  if (!confirm("Tem certeza que deseja excluir este funcionário? Esta ação não pode ser desfeita.")) return;
  try {
    await Api.request(`/api/funcionarios?id=${id}`, { method: "DELETE" });
    await carregarLista();
  } catch (err) {
    alert(err.message);
  }
}

init();
