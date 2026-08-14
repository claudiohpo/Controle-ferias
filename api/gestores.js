const { ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");
const { getDb } = require("../lib/db");
const { requireRole, signToken } = require("../lib/auth");

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

function normalizarRegioes(regioes) {
  if (!Array.isArray(regioes)) return [];
  return regioes.map((r) => String(r).trim()).filter(Boolean);
}

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  try {
    // Qualquer rota deste arquivo exige um gestor autenticado.
    const payload = requireRole(req, res, "gestor");
    if (!payload) return;

    const db = await getDb();
    const gestores = db.collection("gestores");

    if (req.method === "GET") {
      const lista = await gestores.find({}, { projection: { passwordHash: 0 } }).sort({ nome: 1 }).toArray();
      return res.end(JSON.stringify(lista));
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const { username, password, nome } = body;
      if (!username || !password || String(password).length < 6) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "Informe usuário e senha (mín. 6 caracteres)." }));
      }
      const usernameNorm = String(username).trim().toLowerCase();
      const existe = await gestores.findOne({ username: usernameNorm });
      if (existe) {
        res.statusCode = 409;
        return res.end(JSON.stringify({ error: "Já existe um gestor com este usuário." }));
      }
      const passwordHash = bcrypt.hashSync(String(password), 12);
      const result = await gestores.insertOne({
        username: usernameNorm,
        passwordHash,
        nome: nome || usernameNorm,
        regioes: normalizarRegioes(body.regioes),
        role: "gestor",
        createdAt: new Date(),
      });
      res.statusCode = 201;
      return res.end(JSON.stringify({ message: "Gestor criado com sucesso.", id: result.insertedId }));
    }

    if (req.method === "PUT") {
      const body = await readBody(req);
      if (!body.id) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "ID obrigatório." }));
      }
      let gestorId;
      try {
        gestorId = new ObjectId(body.id);
      } catch {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "ID inválido." }));
      }
      const existente = await gestores.findOne({ _id: gestorId });
      if (!existente) {
        res.statusCode = 404;
        return res.end(JSON.stringify({ error: "Gestor não encontrado." }));
      }

      const update = { updatedAt: new Date() };
      if (body.nome !== undefined) update.nome = body.nome;
      if (body.regioes !== undefined) update.regioes = normalizarRegioes(body.regioes);
      if (body.novaSenha) {
        if (String(body.novaSenha).length < 6) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: "A nova senha deve ter pelo menos 6 caracteres." }));
        }
        update.passwordHash = bcrypt.hashSync(String(body.novaSenha), 12);
      }

      await gestores.updateOne({ _id: gestorId }, { $set: update });

      // Se o gestor está editando o próprio cadastro, emite um token novo já com os dados
      // atualizados (nome/regiões), para a sessão refletir a mudança sem precisar deslogar.
      if (payload.username === existente.username) {
        const novasRegioes = update.regioes !== undefined ? update.regioes : existente.regioes || [];
        const novoNome = update.nome !== undefined ? update.nome : existente.nome;
        const token = signToken({ role: "gestor", username: existente.username, nome: novoNome || existente.username, regioes: novasRegioes });
        res.statusCode = 200;
        return res.end(
          JSON.stringify({
            message: "Gestor atualizado com sucesso.",
            token,
            nome: novoNome || existente.username,
            regioes: novasRegioes,
          })
        );
      }

      res.statusCode = 200;
      return res.end(JSON.stringify({ message: "Gestor atualizado com sucesso." }));
    }

    if (req.method === "DELETE") {
      const q = req.query || {};
      const id = q.id;
      if (!id) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "ID obrigatório." }));
      }
      const total = await gestores.countDocuments();
      if (total <= 1) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "Não é possível excluir o único gestor cadastrado." }));
      }
      let gestorId;
      try {
        gestorId = new ObjectId(id);
      } catch {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "ID inválido." }));
      }
      if (payload.username) {
        const alvo = await gestores.findOne({ _id: gestorId });
        if (alvo && alvo.username === payload.username) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: "Você não pode excluir seu próprio usuário enquanto está logado nele." }));
        }
      }
      await gestores.deleteOne({ _id: gestorId });
      res.statusCode = 200;
      return res.end(JSON.stringify({ message: "Gestor removido." }));
    }

    res.setHeader("Allow", "GET,POST,PUT,DELETE");
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: "Method Not Allowed" }));
  } catch (err) {
    console.error("api/gestores error:", err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: "Erro interno: " + (err && err.message ? err.message : "unknown") }));
  }
};
