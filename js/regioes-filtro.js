// Renderiza um seletor "lista suspensa com checkbox" para filtrar por região.
// containerId: elemento onde o seletor será montado.
// regioesDisponiveis: array de strings com todas as regiões que podem ser exibidas.
// onChange(regioesSelecionadas): chamado sempre que a seleção mudar.
// A seleção é mantida em localStorage por página (chaveId) para persistir entre visitas.
function criarSeletorRegioes(containerId, regioesDisponiveis, onChange, chaveId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const storageKey = `ferias_regioes_filtro_${chaveId || containerId}`;
  let selecionadas;
  try {
    const salvo = JSON.parse(localStorage.getItem(storageKey) || "null");
    selecionadas = Array.isArray(salvo) ? salvo.filter((r) => regioesDisponiveis.includes(r)) : [...regioesDisponiveis];
  } catch {
    selecionadas = [...regioesDisponiveis];
  }
  if (!selecionadas.length) selecionadas = [...regioesDisponiveis];

  function salvar() {
    localStorage.setItem(storageKey, JSON.stringify(selecionadas));
  }

  function label() {
    if (!regioesDisponiveis.length) return "Nenhuma região";
    if (selecionadas.length === regioesDisponiveis.length) return "Todas as regiões";
    if (selecionadas.length === 1) return selecionadas[0];
    return `${selecionadas.length} regiões selecionadas`;
  }

  function render() {
    container.innerHTML = `
      <div class="regioes-seletor">
        <button type="button" class="btn secundario pequeno" id="${containerId}_btn">🌎 ${label()}</button>
        <div class="regioes-painel" id="${containerId}_painel" hidden>
          <div class="regioes-painel-acoes">
            <button type="button" class="btn secundario pequeno" id="${containerId}_todas">Selecionar todas</button>
            <button type="button" class="btn secundario pequeno" id="${containerId}_nenhuma">Limpar</button>
          </div>
          ${regioesDisponiveis
            .map(
              (r) => `
            <label class="regiao-item">
              <input type="checkbox" value="${r}" ${selecionadas.includes(r) ? "checked" : ""} />
              <span>${r}</span>
            </label>
          `
            )
            .join("")}
        </div>
      </div>
    `;

    const btn = document.getElementById(`${containerId}_btn`);
    const painel = document.getElementById(`${containerId}_painel`);

    btn.addEventListener("click", () => {
      painel.hidden = !painel.hidden;
    });

    document.addEventListener("click", (e) => {
      if (!container.contains(e.target)) painel.hidden = true;
    });

    container.querySelectorAll('.regiao-item input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener("change", () => {
        selecionadas = Array.from(container.querySelectorAll('.regiao-item input[type="checkbox"]:checked')).map((c) => c.value);
        if (!selecionadas.length) selecionadas = [];
        salvar();
        btn.textContent = `🌎 ${label()}`;
        onChange(selecionadas);
      });
    });

    document.getElementById(`${containerId}_todas`).addEventListener("click", () => {
      selecionadas = [...regioesDisponiveis];
      salvar();
      render();
      onChange(selecionadas);
    });
    document.getElementById(`${containerId}_nenhuma`).addEventListener("click", () => {
      selecionadas = [];
      salvar();
      render();
      onChange(selecionadas);
    });
  }

  render();
  onChange(selecionadas);
}
