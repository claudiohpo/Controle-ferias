const { getDb } = require("../lib/db");
const { requireRole, regioesPermitidas } = require("../lib/auth");

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "GET") {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: "Method Not Allowed" }));
  }

  try {
    const payload = requireRole(req, res, "gestor");
    if (!payload) return;
    const regioes = regioesPermitidas(payload);
    const filtroFuncionarios = regioes ? { regiao: { $in: regioes } } : {};
    const filtroSolicitacoes = regioes ? { funcionarioRegiao: { $in: regioes } } : {};

    const db = await getDb();
    const funcionarios = db.collection("funcionarios");
    const solicitacoes = db.collection("solicitacoes_ferias");

    const totalFuncionarios = await funcionarios.countDocuments(filtroFuncionarios);
    const pendentes = await solicitacoes.countDocuments({ ...filtroSolicitacoes, status: "pendente" });
    const aprovadas = await solicitacoes.countDocuments({ ...filtroSolicitacoes, status: "aprovado" });
    const rejeitadas = await solicitacoes.countDocuments({ ...filtroSolicitacoes, status: "rejeitado" });
    const canceladas = await solicitacoes.countDocuments({ ...filtroSolicitacoes, status: "cancelado" });

    const comSolicitacao = await solicitacoes.distinct("funcionarioId", { ...filtroSolicitacoes, status: { $in: ["pendente", "aprovado"] } });
    const todosFuncionarios = await funcionarios
      .find(filtroFuncionarios, { projection: { nome: 1, cpf: 1, regiao: 1, gestor: 1 } })
      .toArray();
    const semSolicitacao = todosFuncionarios.filter((f) => !comSolicitacao.includes(String(f._id)));

    // Períodos aprovados, usados para montar o calendário anual e os gráficos de ocupação.
    const aprovadasDocs = await solicitacoes
      .find(
        { ...filtroSolicitacoes, status: "aprovado" },
        { projection: { funcionarioNome: 1, funcionarioCpf: 1, periodos: 1, numeroRequisicaoNatCorp: 1 } }
      )
      .toArray();
    const feriasAprovadas = aprovadasDocs.map((s) => ({
      funcionarioNome: s.funcionarioNome,
      funcionarioCpf: s.funcionarioCpf,
      periodos: s.periodos,
    }));

    // Requisições com número do NatCorp já informado pelo funcionário, para o card do dashboard.
    const requisicoesNatCorp = aprovadasDocs
      .filter((s) => s.numeroRequisicaoNatCorp)
      .map((s) => ({
        funcionarioNome: s.funcionarioNome,
        funcionarioCpf: s.funcionarioCpf,
        numeroRequisicaoNatCorp: s.numeroRequisicaoNatCorp,
      }));

    res.statusCode = 200;
    return res.end(
      JSON.stringify({
        totalFuncionarios,
        pendentes,
        aprovadas,
        rejeitadas,
        canceladas,
        semSolicitacao,
        feriasAprovadas,
        requisicoesNatCorp,
      })
    );
  } catch (err) {
    console.error("api/dashboard error:", err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: "Erro interno: " + (err && err.message ? err.message : "unknown") }));
  }
};
