const { getDb } = require("../lib/db");
const { requireRole } = require("../lib/auth");

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "GET") {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: "Method Not Allowed" }));
  }

  try {
    if (!requireRole(req, res, "gestor")) return;

    const db = await getDb();
    const funcionarios = db.collection("funcionarios");
    const solicitacoes = db.collection("solicitacoes_ferias");

    const totalFuncionarios = await funcionarios.countDocuments();
    const pendentes = await solicitacoes.countDocuments({ status: "pendente" });
    const aprovadas = await solicitacoes.countDocuments({ status: "aprovado" });
    const rejeitadas = await solicitacoes.countDocuments({ status: "rejeitado" });

    const comSolicitacao = await solicitacoes.distinct("funcionarioId", { status: { $in: ["pendente", "aprovado"] } });
    const todosFuncionarios = await funcionarios.find({}, { projection: { nome: 1, cpf: 1, regiao: 1, gestor: 1 } }).toArray();
    const semSolicitacao = todosFuncionarios.filter((f) => !comSolicitacao.includes(String(f._id)));

    res.statusCode = 200;
    return res.end(
      JSON.stringify({
        totalFuncionarios,
        pendentes,
        aprovadas,
        rejeitadas,
        semSolicitacao,
      })
    );
  } catch (err) {
    console.error("api/dashboard error:", err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: "Erro interno: " + (err && err.message ? err.message : "unknown") }));
  }
};
