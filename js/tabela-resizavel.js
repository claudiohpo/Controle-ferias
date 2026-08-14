// Torna as colunas de uma tabela redimensionáveis por arraste (como planilhas).
// Deve ser chamado toda vez que o conteúdo (thead/tbody) da tabela for recriado.
// As larguras escolhidas pelo usuário são salvas por tabela (localStorage) e reaplicadas.
function inicializarTabelaRedimensionavel(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const ths = Array.from(table.querySelectorAll("thead th"));
  if (!ths.length) return;

  const chave = "tabela_larguras_" + tableId;
  let larguras = null;
  try {
    larguras = JSON.parse(localStorage.getItem(chave) || "null");
  } catch {
    larguras = null;
  }

  if (larguras && larguras.length === ths.length) {
    ths.forEach((th, i) => {
      if (larguras[i]) th.style.width = larguras[i] + "px";
    });
  } else {
    // Captura a largura natural (table-layout: auto) antes de travar em "fixed",
    // para que nada mude visualmente na primeira renderização.
    ths.forEach((th) => {
      th.style.width = th.offsetWidth + "px";
    });
  }
  table.style.tableLayout = "fixed";

  ths.forEach((th, idx) => {
    if (th.classList.contains("nao-redimensionavel")) return;
    if (idx === ths.length - 1) return; // a última coluna (ações) acompanha o espaço restante
    if (th.querySelector(".col-resizer")) return;

    th.style.position = "relative";
    const handle = document.createElement("div");
    handle.className = "col-resizer";
    th.appendChild(handle);

    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.pageX;
      const startWidth = th.offsetWidth;
      document.body.classList.add("redimensionando-coluna");

      function mover(ev) {
        const nova = Math.max(60, startWidth + (ev.pageX - startX));
        th.style.width = nova + "px";
      }
      function soltar() {
        document.removeEventListener("mousemove", mover);
        document.removeEventListener("mouseup", soltar);
        document.body.classList.remove("redimensionando-coluna");
        const novasLarguras = ths.map((t) => t.offsetWidth);
        localStorage.setItem(chave, JSON.stringify(novasLarguras));
      }
      document.addEventListener("mousemove", mover);
      document.addEventListener("mouseup", soltar);
    });
  });
}
