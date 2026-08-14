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
  document.getElementById("btnGerenciarRegioes").addEventListener("click", () => {
    abrirGerenciarRegioes(async () => {
      await carregarRegioesDisponiveis();
    });
  });

  await carregarRegioesDisponiveis();
  await carregarLista();
}

async function carregarRegioesDisponiveis() {
  try {
    // Lista COMPLETA de regiões (sem filtrar pelas permissões do gestor logado): é necessário
    // para que qualquer gestor consiga conceder acesso a uma região que ele próprio ainda não gerencia.
    const todas = await Api.request("/api/regioes");
    regioesDisponiveis = todas.map((r) => r.nome);
  } catch (err) {
    regioesDisponiveis = [];
  }
  renderCheckboxRegioes(regioesSelecionadasNoForm());
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
      const resposta = await Api.request("/api/gestores", { method: "PUT", body });
      // Se editei meu próprio cadastro, a API devolve um token novo — atualiza a sessão
      // localmente para as mudanças de região valerem sem precisar deslogar.
      if (resposta && resposta.token) {
        Api.setSessao(resposta.token, "gestor", resposta.nome, resposta.regioes);
        renderGestorNav("gestores");
      }
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
        <table class="tabela-resizavel" id="tabelaGestores">
          <thead><tr><th>Usuário</th><th>Nome</th><th>Regiões</th><th>Criado em</th><th class="nao-redimensionavel"></th></tr></thead>
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
    inicializarTabelaRedimensionavel("tabelaGestores");
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
