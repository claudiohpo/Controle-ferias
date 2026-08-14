const { ObjectId } = require("mongodb");
const { getDb } = require("../lib/db");
const { requireRole } = require("../lib/auth");

async function readBody(req) {
  if (req.body && Object.keys(req.body).length) return req.body;
  return new Promise((resolve) => {
    let data = "";
    req.on && req.on("data", (c) => (data += c));
    req.on &&
      req.on("end", () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch {
          resolve({});
        }
      });
    req.on && req.on("error", () => resolve({}));
  });
}

// Entidade "regiões": cadastro próprio, independente do texto livre em funcionários/gestores.
// Qualquer gestor autenticado pode ver a lista completa (sem restrição por região) — é necessário
// para poder conceder acesso a regiões que o próprio gestor ainda não gerencia.
module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  try {
    const payload = requireRole(req, res, "gestor");
    if (!payload) return;

    const db = await getDb();
    const regioes = db.collection("regioes");

    if (req.method === "GET") {
      const lista = await regioes.find({}).sort({ nome: 1 }).toArray();
      return res.end(JSON.stringify(lista));
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const nome = String(body.nome || "").trim();
      if (!nome) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "Informe o nome da região." }));
      }
      const existente = await regioes.findOne({ nome: { $regex: `^${nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } });
      if (existente) {
        res.statusCode = 409;
        return res.end(JSON.stringify({ error: "Já existe uma região com este nome." }));
      }
      const result = await regioes.insertOne({ nome, createdAt: new Date() });
      res.statusCode = 201;
      return res.end(JSON.stringify({ message: "Região criada.", id: result.insertedId }));
    }

    if (req.method === "PUT") {
      const body = await readBody(req);
      if (!body.id || !body.nome) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "Informe id e nome." }));
      }
      let regiaoId;
      try {
        regiaoId = new ObjectId(body.id);
      } catch {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "ID inválido." }));
      }
      const existente = await regioes.findOne({ _id: regiaoId });
      if (!existente) {
        res.statusCode = 404;
        return res.end(JSON.stringify({ error: "Região não encontrada." }));
      }
      const nomeNovo = String(body.nome).trim();
      const nomeAntigo = existente.nome;

      await regioes.updateOne({ _id: regiaoId }, { $set: { nome: nomeNovo, updatedAt: new Date() } });

      // Propaga o novo nome para funcionários e gestores que referenciam a região antiga.
      if (nomeNovo !== nomeAntigo) {
        await db.collection("funcionarios").updateMany({ regiao: nomeAntigo }, { $set: { regiao: nomeNovo } });
        await db.collection("gestores").updateMany({ regioes: nomeAntigo }, { $set: { "regioes.$": nomeNovo } });
      }

      res.statusCode = 200;
      return res.end(JSON.stringify({ message: "Região atualizada." }));
    }

    if (req.method === "DELETE") {
      const q = req.query || {};
      const id = q.id;
      if (!id) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "ID obrigatório." }));
      }
      let regiaoId;
      try {
        regiaoId = new ObjectId(id);
      } catch {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "ID inválido." }));
      }
      const existente = await regioes.findOne({ _id: regiaoId });
      if (!existente) {
        res.statusCode = 404;
        return res.end(JSON.stringify({ error: "Região não encontrada." }));
      }
      const emUsoFuncionarios = await db.collection("funcionarios").countDocuments({ regiao: existente.nome });
      if (emUsoFuncionarios > 0) {
        res.statusCode = 400;
        return res.end(
          JSON.stringify({ error: `Não é possível excluir: ${emUsoFuncionarios} funcionário(s) ainda estão nesta região.` })
        );
      }
      await regioes.deleteOne({ _id: regiaoId });
      // Remove a região de qualquer gestor que a tivesse marcada.
      await db.collection("gestores").updateMany({ regioes: existente.nome }, { $pull: { regioes: existente.nome } });
      res.statusCode = 200;
      return res.end(JSON.stringify({ message: "Região removida." }));
    }

    res.setHeader("Allow", "GET,POST,PUT,DELETE");
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: "Method Not Allowed" }));
  } catch (err) {
    console.error("api/regioes error:", err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: "Erro interno: " + (err && err.message ? err.message : "unknown") }));
  }
};
