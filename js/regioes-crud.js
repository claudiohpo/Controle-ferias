// Modal de gerenciamento de regiões (cadastro próprio, usado como fonte única de verdade
// para os seletores de região em Funcionários e Gestores).
let _regioesCrudAoFechar = null;
let _regioesCrudEditandoId = null;

function garantirModalRegioes() {
  if (document.getElementById("modalRegioes")) return;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div class="modal-overlay" id="modalRegioes" hidden>
      <div class="modal-box">
        <div class="modal-header">
          <h2>🌎 Regiões cadastradas</h2>
          <button class="modal-fechar" data-fechar-modal aria-label="Fechar">✕</button>
        </div>
        <div class="modal-body">
          <form id="formRegiao" style="display:flex; gap:8px; align-items:flex-end;">
            <div style="flex:1;">
              <input type="hidden" id="regiaoId" value="" />
              <label for="nomeRegiao" id="labelNomeRegiao">Nova região</label>
              <input type="text" id="nomeRegiao" placeholder="Ex.: Grande SP" required />
            </div>
            <button type="submit" class="btn" id="btnSalvarRegiao">Adicionar</button>
            <button type="button" class="btn secundario" id="btnCancelarEdicaoRegiao" style="display:none;">Cancelar</button>
          </form>
          <div id="msgRegiao" class="mensagem"></div>
          <div id="listaRegioesModal" style="margin-top:16px;">Carregando...</div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn secundario" data-fechar-modal>Fechar</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrapper.firstElementChild);
  inicializarModal("modalRegioes");

  document.getElementById("formRegiao").addEventListener("submit", salvarRegiaoModal);
  document.getElementById("btnCancelarEdicaoRegiao").addEventListener("click", sairModoEdicaoRegiao);

  // Ao fechar o modal (X, Fechar ou clique fora), avisa quem abriu para atualizar os selects.
  document.getElementById("modalRegioes").addEventListener("click", (e) => {
    if (e.target.id === "modalRegioes" || e.target.closest("[data-fechar-modal]")) {
      if (typeof _regioesCrudAoFechar === "function") _regioesCrudAoFechar();
    }
  });
}

// Abre o modal de gerenciamento de regiões. `aoFechar` é chamado quando o modal for fechado,
// para a página que o abriu atualizar seus próprios selects/checkboxes de região.
async function abrirGerenciarRegioes(aoFechar) {
  garantirModalRegioes();
  _regioesCrudAoFechar = aoFechar || null;
  sairModoEdicaoRegiao();
  await carregarListaRegioesModal();
  abrirModal("modalRegioes");
}

function sairModoEdicaoRegiao() {
  _regioesCrudEditandoId = null;
  document.getElementById("regiaoId").value = "";
  document.getElementById("nomeRegiao").value = "";
  document.getElementById("labelNomeRegiao").textContent = "Nova região";
  document.getElementById("btnSalvarRegiao").textContent = "Adicionar";
  document.getElementById("btnCancelarEdicaoRegiao").style.display = "none";
  document.getElementById("msgRegiao").className = "mensagem";
}

async function salvarRegiaoModal(e) {
  e.preventDefault();
  const msg = document.getElementById("msgRegiao");
  msg.className = "mensagem";
  const nome = document.getElementById("nomeRegiao").value.trim();
  if (!nome) return;

  try {
    if (_regioesCrudEditandoId) {
      await Api.request("/api/regioes", { method: "PUT", body: { id: _regioesCrudEditandoId, nome } });
    } else {
      await Api.request("/api/regioes", { method: "POST", body: { nome } });
    }
    sairModoEdicaoRegiao();
    await carregarListaRegioesModal();
  } catch (err) {
    msg.className = "mensagem erro";
    msg.textContent = err.message;
  }
}

async function carregarListaRegioesModal() {
  const div = document.getElementById("listaRegioesModal");
  try {
    const lista = await Api.request("/api/regioes");
    if (!lista.length) {
      div.innerHTML = `<p class="hint">Nenhuma região cadastrada ainda. Adicione a primeira acima.</p>`;
      return;
    }
    div.innerHTML = `
      <div class="table-wrap">
        <table class="tabela-resizavel" id="tabelaRegioesModal">
          <thead><tr><th>Nome</th><th class="nao-redimensionavel"></th></tr></thead>
          <tbody>
            ${lista
              .map(
                (r) => `
              <tr>
                <td title="${r.nome}">${r.nome}</td>
                <td style="white-space:nowrap;">
                  <button class="btn-icone" data-editar-regiao="${r._id}" data-nome="${r.nome}" title="Editar" aria-label="Editar">✏️</button>
                  <button class="btn-icone" data-excluir-regiao="${r._id}" title="Excluir" aria-label="Excluir">🗑️</button>
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    div.querySelectorAll("[data-editar-regiao]").forEach((btn) => {
      btn.addEventListener("click", () => {
        _regioesCrudEditandoId = btn.dataset.editarRegiao;
        document.getElementById("regiaoId").value = _regioesCrudEditandoId;
        document.getElementById("nomeRegiao").value = btn.dataset.nome;
        document.getElementById("labelNomeRegiao").textContent = "Renomear região";
        document.getElementById("btnSalvarRegiao").textContent = "Salvar";
        document.getElementById("btnCancelarEdicaoRegiao").style.display = "inline-flex";
        document.getElementById("nomeRegiao").focus();
      });
    });
    div.querySelectorAll("[data-excluir-regiao]").forEach((btn) => {
      btn.addEventListener("click", () => excluirRegiaoModal(btn.dataset.excluirRegiao));
    });

    if (typeof inicializarTabelaRedimensionavel === "function") inicializarTabelaRedimensionavel("tabelaRegioesModal");
  } catch (err) {
    div.innerHTML = `<div class="mensagem erro" style="display:block;">${err.message}</div>`;
  }
}

async function excluirRegiaoModal(id) {
  if (!confirm("Tem certeza que deseja excluir esta região? Esta ação não pode ser desfeita.")) return;
  try {
    await Api.request(`/api/regioes?id=${id}`, { method: "DELETE" });
    await carregarListaRegioesModal();
  } catch (err) {
    alert(err.message);
  }
}
