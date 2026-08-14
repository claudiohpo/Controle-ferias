// Monta as linhas do relatório: uma linha por PERÍODO de férias (não por solicitação),
// já que é isso que o RH precisa lançar/efetivar — cada período é um lançamento distinto.
function montarLinhasRelatorio(solicitacoes) {
  const linhas = [];
  for (const s of solicitacoes) {
    const abono = s.abonoPecuniarioDias || 0;
    s.periodos.forEach((p, idx) => {
      linhas.push({
        nome: s.funcionarioNome || "-",
        cpf: formatarCPF(s.funcionarioCpf),
        matricula: s.funcionarioMatricula || "-",
        regiao: s.funcionarioRegiao || "-",
        gestor: s.funcionarioGestor || "-",
        status: rotuloStatus(s.status),
        numPeriodo: `${idx + 1}/${s.periodos.length}`,
        inicio: fmtData(p.inicio),
        fim: fmtData(somaDiasData(p.inicio, p.dias)),
        dias: p.dias,
        abono: idx === 0 ? abono : 0, // evita repetir o total do abono em cada período da mesma solicitação
        solicitadoEm: fmtData(s.criadoEm),
        comentario: s.comentarioGestor || "",
      });
    });
  }
  return linhas;
}

function formatarCPF(cpf) {
  const d = String(cpf || "").replace(/\D/g, "");
  if (d.length !== 11) return cpf || "-";
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function rotuloStatus(status) {
  const mapa = { pendente: "Pendente", aprovado: "Aprovado", rejeitado: "Rejeitado", cancelado: "Cancelado" };
  return mapa[status] || status;
}

function nomeArquivoRelatorio(extensao) {
  const hoje = new Date().toISOString().slice(0, 10);
  return `relatorio-ferias-fieldbreak-${hoje}.${extensao}`;
}

function gerarPDFRelatorio(linhas, statusesSelecionados) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("Não foi possível carregar o gerador de PDF. Verifique sua conexão com a internet e tente novamente.");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text("FieldBreak — Relatório de Programação de Férias", 30, 34);

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  const statusTexto = statusesSelecionados.map(rotuloStatus).join(", ") || "nenhum";
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}  ·  Status incluídos: ${statusTexto}  ·  ${linhas.length} período(s)`, 30, 50);

  const colunas = ["Funcionário", "CPF", "Matrícula", "Região", "Gestor", "Status", "Período", "Início", "Fim", "Dias", "Abono", "Solicitado em", "Comentário"];
  const corpo = linhas.map((l) => [l.nome, l.cpf, l.matricula, l.regiao, l.gestor, l.status, l.numPeriodo, l.inicio, l.fim, String(l.dias), l.abono ? String(l.abono) : "", l.solicitadoEm, l.comentario]);

  doc.autoTable({
    head: [colunas],
    body: corpo,
    startY: 64,
    styles: { fontSize: 7, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [47, 111, 237], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 252] },
    margin: { left: 24, right: 24 },
    columnStyles: {
      0: { cellWidth: 95 },
      12: { cellWidth: 110 },
    },
  });

  doc.save(nomeArquivoRelatorio("pdf"));
}

function gerarExcelRelatorio(linhas) {
  if (!window.XLSX) {
    alert("Não foi possível carregar o gerador de Excel. Verifique sua conexão com a internet e tente novamente.");
    return;
  }
  const dados = linhas.map((l) => ({
    Funcionário: l.nome,
    CPF: l.cpf,
    Matrícula: l.matricula,
    Região: l.regiao,
    Gestor: l.gestor,
    Status: l.status,
    "Nº Período": l.numPeriodo,
    "Início do Período": l.inicio,
    "Fim do Período": l.fim,
    "Dias do Período": l.dias,
    "Abono Pecuniário (dias)": l.abono || "",
    "Solicitado em": l.solicitadoEm,
    "Comentário do Gestor": l.comentario,
  }));

  const ws = XLSX.utils.json_to_sheet(dados);
  ws["!cols"] = [
    { wch: 28 }, { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 11 },
    { wch: 9 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 32 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Férias");
  XLSX.writeFile(wb, nomeArquivoRelatorio("xlsx"));
}
