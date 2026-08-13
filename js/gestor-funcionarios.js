function fmtData(iso) {
  if (!iso) return "-";
  const [ano, mes, dia] = String(iso).slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

async function init() {
  if (!renderGestorNav("funcionarios")) return;

  document.getElementById("formNovo").addEventListener("submit", cadastrarFuncionario);
  document.getElementById("btnImportar").addEventListener("click", importarLote);
  document.getElementById("busca").addEventListener("input", debounce(carregarLista, 350));

  await carregarLista();
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

async function cadastrarFuncionario(e) {
  e.preventDefault();
  const msg = document.getElementById("msgNovo");
  msg.className = "mensagem";
  try {
    await Api.request("/api/funcionarios", {
      method: "POST",
      body: {
        nome: document.getElementById("nome").value,
        cpf: document.getElementById("cpf").value,
        matricula: document.getElementById("matricula").value,
        gestor: document.getElementById("gestorNome").value,
        regiao: document.getElementById("regiao").value,
        periodoAquisitivoInicio: document.getElementById("inicioAquisitivo").value,
        diasDireito: document.getElementById("diasDireito").value,
      },
    });
    msg.className = "mensagem sucesso";
    msg.textContent = "Funcionário cadastrado com sucesso.";
    document.getElementById("formNovo").reset();
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
      const [nome, cpf, matricula, gestor, regiao, periodoAquisitivoInicio] = linha.split(";").map((c) => (c || "").trim());
      return { nome, cpf, matricula, gestor, regiao, periodoAquisitivoInicio };
    })
    .filter((item) => item.nome && item.nome.toLowerCase() !== "nome"); // ignora possível linha de cabeçalho
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
    msg.textContent = `Importação concluída: ${resultado.criados} criado(s), ${resultado.atualizados} atualizado(s).` +
      (resultado.erros.length ? ` Erros: ${resultado.erros.join(" | ")}` : "");
    document.getElementById("loteTexto").value = "";
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
    const params = busca ? `?busca=${encodeURIComponent(busca)}` : "";
    const lista = await Api.request(`/api/funcionarios${params}`);
    if (!lista.length) {
      div.innerHTML = `<p class="hint">Nenhum funcionário encontrado.</p>`;
      return;
    }
    div.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Nome</th><th>CPF</th><th>Matrícula</th><th>Gestor</th><th>Região</th><th>Aquisitivo</th><th>Prazo limite</th><th></th></tr>
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
                <td>${fmtData(f.dataMaxGozo)}</td>
                <td><button class="btn secundario pequeno" onclick="excluirFuncionario('${f._id}')">Excluir</button></td>
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
