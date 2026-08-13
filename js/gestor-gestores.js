let regioesDisponiveis = [];
let editandoGestorId = null;

function fmtData(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
}

async function init() {
  if (!renderGestorNav("gestores")) return;

  inicializarModal("modalGestor");
  adicionarToggleSenha("novaSenhaGestor");
  adicionarToggleSenha("confirmarSenhaGestor");

  document.getElementById("formGestor").addEventListener("submit", salvarGestor);
  document.getElementById("btnExcluirGestor").addEventListener("click", () => excluirGestor(editandoGestorId, true));
  document.getElementById("btnAbrirNovoGestor").addEventListener("click", () => {
    sairModoEdicao();
    abrirModal("modalGestor");
  });

  try {
    regioesDisponiveis = await Api.request("/api/funcionarios?listaRegioes=true");
  } catch (err) {
    regioesDisponiveis = [];
  }
  renderCheckboxRegioes([]);

  await carregarLista();
}

function renderCheckboxRegioes(selecionadas) {
  const grid = document.getElementById("regioesCheckboxGrid");
  if (!regioesDisponiveis.length) {
    grid.innerHTML = `<p class="hint" style="margin:0;">Nenhuma região cadastrada ainda (cadastre funcionários primeiro).</p>`;
    return;
  }
  grid.innerHTML = regioesDisponiveis
    .map(
      (r) => `
    <label>
      <input type="checkbox" value="${r}" ${selecionadas.includes(r) ? "checked" : ""} />
      <span>${r}</span>
    </label>
  `
    )
    .join("");
}

function regioesSelecionadasNoForm() {
  return Array.from(document.querySelectorAll('#regioesCheckboxGrid input[type="checkbox"]:checked')).map((c) => c.value);
}

function limparFormulario() {
  document.getElementById("formGestor").reset();
  document.getElementById("gestorId").value = "";
  renderCheckboxRegioes([]);
}

function sairModoEdicao() {
  editandoGestorId = null;
  limparFormulario();
  document.getElementById("tituloFormGestor").textContent = "Novo gestor";
  document.getElementById("btnSalvarGestor").textContent = "Criar gestor";
  document.getElementById("btnExcluirGestor").style.display = "none";
  document.getElementById("labelSenhaGestor").textContent = "Senha (mín. 6 caracteres)";
  document.getElementById("hintSenhaEdicao").style.display = "none";
  document.getElementById("novoUsuario").disabled = false;
  document.getElementById("msgGestor").className = "mensagem";
}

function entrarModoEdicao(g) {
  editandoGestorId = g._id;
  document.getElementById("gestorId").value = g._id;
  document.getElementById("novoUsuario").value = g.username;
  document.getElementById("novoUsuario").disabled = true;
  document.getElementById("novoNome").value = g.nome || "";
  renderCheckboxRegioes(g.regioes || []);
  document.getElementById("novaSenhaGestor").value = "";
  document.getElementById("confirmarSenhaGestor").value = "";

  document.getElementById("tituloFormGestor").textContent = `Editando: ${g.nome || g.username}`;
  document.getElementById("btnSalvarGestor").textContent = "Salvar alterações";
  document.getElementById("btnExcluirGestor").style.display = "inline-flex";
  document.getElementById("labelSenhaGestor").textContent = "Nova senha (opcional)";
  document.getElementById("hintSenhaEdicao").style.display = "block";
  document.getElementById("msgGestor").className = "mensagem";
  abrirModal("modalGestor");
}

async function salvarGestor(e) {
  e.preventDefault();
  const msg = document.getElementById("msgGestor");
  msg.className = "mensagem";

  const senha = document.getElementById("novaSenhaGestor").value;

  if (!editandoGestorId || senha) {
    const validacao = validarConfirmacaoSenha("novaSenhaGestor", "confirmarSenhaGestor");
    if (!validacao.valid) {
      msg.className = "mensagem erro";
      msg.textContent = validacao.error;
      return;
    }
  }

  const regioes = regioesSelecionadasNoForm();

  try {
    if (editandoGestorId) {
      const body = { id: editandoGestorId, nome: document.getElementById("novoNome").value, regioes };
      if (senha) body.novaSenha = senha;
      await Api.request("/api/gestores", { method: "PUT", body });
    } else {
      await Api.request("/api/gestores", {
        method: "POST",
        body: {
          username: document.getElementById("novoUsuario").value,
          nome: document.getElementById("novoNome").value,
          password: senha,
          regioes,
        },
      });
    }
    fecharModal("modalGestor");
    sairModoEdicao();
    await carregarLista();
  } catch (err) {
    msg.className = "mensagem erro";
    msg.textContent = err.message;
  }
}

async function carregarLista() {
  const div = document.getElementById("listaGestores");
  try {
    const lista = await Api.request("/api/gestores");
    if (!lista.length) {
      div.innerHTML = `<p class="hint">Nenhum gestor cadastrado.</p>`;
      return;
    }
    div.innerHTML = `
      <div class="table-wrap">
        <table class="tabela-fixa">
          <colgroup>
            <col style="width:20%" /><col style="width:24%" /><col style="width:34%" /><col style="width:16%" /><col style="width:44px" />
          </colgroup>
          <thead><tr><th>Usuário</th><th>Nome</th><th>Regiões</th><th>Criado em</th><th></th></tr></thead>
          <tbody>
            ${lista
              .map(
                (g) => `
              <tr>
                <td title="${g.username}">${g.username}</td>
                <td title="${g.nome || ""}">${g.nome || "-"}</td>
                <td title="${g.regioes && g.regioes.length ? g.regioes.join(", ") : "Todas"}">${
                  g.regioes && g.regioes.length ? g.regioes.join(", ") : "Todas"
                }</td>
                <td>${fmtData(g.createdAt)}</td>
                <td><button class="btn-icone" data-editar="${g._id}" title="Editar" aria-label="Editar">✏️</button></td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    div.querySelectorAll("[data-editar]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const g = lista.find((x) => x._id === btn.dataset.editar);
        if (g) entrarModoEdicao(g);
      });
    });
  } catch (err) {
    div.innerHTML = `<div class="mensagem erro" style="display:block;">${err.message}</div>`;
  }
}

async function excluirGestor(id, fecharModalAoExcluir) {
  if (!id) return;
  if (!confirm("Tem certeza que deseja excluir este gestor? Esta ação não pode ser desfeita.")) return;
  try {
    await Api.request(`/api/gestores?id=${id}`, { method: "DELETE" });
    if (fecharModalAoExcluir) {
      fecharModal("modalGestor");
      sairModoEdicao();
    }
    await carregarLista();
  } catch (err) {
    alert(err.message);
  }
}

init();
