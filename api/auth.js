const bcrypt = require("bcryptjs");
const { getDb } = require("../lib/db");
const { signToken, verifyToken } = require("../lib/auth");

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

function apenasNumeros(v) {
  return String(v || "").replace(/\D/g, "");
}

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: "Method Not Allowed" }));
  }

  try {
    const body = await readBody(req);
    const action = body.action;
    const db = await getDb();

    // Login do gestor (usuário + senha)
    if (action === "login-gestor") {
      const { username, password } = body;
      if (!username || !password) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "Informe usuário e senha." }));
      }
      const gestores = db.collection("gestores");
      const usernameNorm = String(username).trim().toLowerCase();
      const gestor = await gestores.findOne({ username: usernameNorm });
      if (!gestor) {
        res.statusCode = 401;
        return res.end(JSON.stringify({ error: "Usuário ou senha inválidos." }));
      }
      const ok = bcrypt.compareSync(String(password), gestor.passwordHash);
      if (!ok) {
        res.statusCode = 401;
        return res.end(JSON.stringify({ error: "Usuário ou senha inválidos." }));
      }
      const token = signToken({ role: "gestor", username: gestor.username, nome: gestor.nome || gestor.username });
      res.statusCode = 200;
      return res.end(JSON.stringify({ token, nome: gestor.nome || gestor.username, username: gestor.username }));
    }

    // Login do funcionário via CPF (sem senha, conforme especificação)
    if (action === "login-funcionario") {
      const cpf = apenasNumeros(body.cpf);
      if (!cpf || cpf.length !== 11) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "Informe um CPF válido (11 dígitos)." }));
      }
      const funcionarios = db.collection("funcionarios");
      const funcionario = await funcionarios.findOne({ cpf });
      if (!funcionario) {
        res.statusCode = 404;
        return res.end(JSON.stringify({ error: "CPF não encontrado. Procure o seu gestor." }));
      }
      const token = signToken({ role: "funcionario", funcionarioId: String(funcionario._id), cpf });
      res.statusCode = 200;
      return res.end(JSON.stringify({ token, nome: funcionario.nome }));
    }

    // Troca de senha do gestor autenticado
    if (action === "trocar-senha-gestor") {
      const payload = verifyToken(req);
      if (!payload || payload.role !== "gestor") {
        res.statusCode = 401;
        return res.end(JSON.stringify({ error: "Não autenticado." }));
      }
      const { senhaAtual, novaSenha } = body;
      if (!senhaAtual || !novaSenha || String(novaSenha).length < 6) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "Preencha a senha atual e uma nova senha com pelo menos 6 caracteres." }));
      }
      const gestores = db.collection("gestores");
      const gestor = await gestores.findOne({ username: payload.username });
      if (!gestor || !bcrypt.compareSync(String(senhaAtual), gestor.passwordHash)) {
        res.statusCode = 401;
        return res.end(JSON.stringify({ error: "Senha atual incorreta." }));
      }
      const novoHash = bcrypt.hashSync(String(novaSenha), 12);
      await gestores.updateOne({ _id: gestor._id }, { $set: { passwordHash: novoHash, updatedAt: new Date() } });
      res.statusCode = 200;
      return res.end(JSON.stringify({ message: "Senha atualizada com sucesso." }));
    }

    // Criar novo gestor (apenas por um gestor já autenticado)
    if (action === "criar-gestor") {
      const payload = verifyToken(req);
      if (!payload || payload.role !== "gestor") {
        res.statusCode = 401;
        return res.end(JSON.stringify({ error: "Não autenticado." }));
      }
      const { username, password, nome } = body;
      if (!username || !password || String(password).length < 6) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "Informe usuário e senha (mín. 6 caracteres)." }));
      }
      const gestores = db.collection("gestores");
      const usernameNorm = String(username).trim().toLowerCase();
      const existe = await gestores.findOne({ username: usernameNorm });
      if (existe) {
        res.statusCode = 409;
        return res.end(JSON.stringify({ error: "Já existe um gestor com este usuário." }));
      }
      const passwordHash = bcrypt.hashSync(String(password), 12);
      await gestores.insertOne({
        username: usernameNorm,
        passwordHash,
        nome: nome || usernameNorm,
        role: "gestor",
        createdAt: new Date(),
      });
      res.statusCode = 201;
      return res.end(JSON.stringify({ message: "Gestor criado com sucesso." }));
    }

    res.statusCode = 400;
    return res.end(JSON.stringify({ error: "Action desconhecida." }));
  } catch (err) {
    console.error("api/auth error:", err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: "Erro interno: " + (err && err.message ? err.message : "unknown") }));
  }
};
