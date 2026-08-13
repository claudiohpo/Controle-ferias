const { ObjectId } = require("mongodb");
const { getDb } = require("../lib/db");
const { requireRole, verifyToken, regioesPermitidas } = require("../lib/auth");
const { calcularDatasPadrao } = require("../lib/clt");

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

function montarFuncionario(input) {
  const cpf = apenasNumeros(input.cpf);
  const periodoAquisitivoInicio = input.periodoAquisitivoInicio;
  const padrao = calcularDatasPadrao(periodoAquisitivoInicio);
  return {
    nome: String(input.nome || "").trim(),
    cpf,
    matricula: input.matricula ? String(input.matricula).trim() : null,
    gestor: input.gestor ? String(input.gestor).trim() : null,
    regiao: input.regiao ? String(input.regiao).trim() : null,
    periodoAquisitivoInicio,
    // As datas informadas explicitamente pelo RH (manual ou importação) sempre prevalecem;
    // caso não sejam informadas, usamos o cálculo padrão como sugestão.
    periodoAquisitivoFim: input.periodoAquisitivoFim || padrao.periodoAquisitivoFim,
    dataLimiteInicioFerias: input.dataLimiteInicioFerias || padrao.dataLimiteInicioFerias,
    dataLimiteProgramacao: input.dataLimiteProgramacao || padrao.dataLimiteProgramacao,
    diasDireito: input.diasDireito ? Number(input.diasDireito) : 30,
    updatedAt: new Date(),
  };
}

// Garante que a região do funcionário está dentro do que o gestor tem permissão de acessar.
function regiaoPermitida(regioes, regiao) {
  if (!regioes) return true; // sem restrição (master)
  return regioes.includes(regiao);
}

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  try {
    const db = await getDb();
    const funcionarios = db.collection("funcionarios");

    if (req.method === "GET") {
      const q = req.query || {};

      // Funcionário consultando seus próprios dados
      if (q.me === "true") {
        const payload = verifyToken(req);
        if (!payload || payload.role !== "funcionario") {
          res.statusCode = 401;
          return res.end(JSON.stringify({ error: "Não autenticado." }));
        }
        const doc = await funcionarios.findOne({ _id: new ObjectId(payload.funcionarioId) });
        if (!doc) {
          res.statusCode = 404;
          return res.end(JSON.stringify({ error: "Funcionário não encontrado." }));
        }
        return res.end(JSON.stringify(doc));
      }

      // Gestor listando/consultando funcionários
      const payload = requireRole(req, res, "gestor");
      if (!payload) return;
      const regioes = regioesPermitidas(payload);

      // Lista de regiões distintas (para popular selects de cadastro/edição).
      if (q.listaRegioes === "true") {
        const todas = await funcionarios.distinct("regiao");
        const filtradas = todas.filter(Boolean).sort();
        const resultado = regioes ? filtradas.filter((r) => regioes.includes(r)) : filtradas;
        return res.end(JSON.stringify(resultado));
      }

      if (q.id) {
        try {
          const doc = await funcionarios.findOne({ _id: new ObjectId(q.id) });
          if (doc && !regiaoPermitida(regioes, doc.regiao)) {
            res.statusCode = 403;
            return res.end(JSON.stringify({ error: "Você não tem acesso à região deste funcionário." }));
          }
          return res.end(JSON.stringify(doc || null));
        } catch {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: "ID inválido." }));
        }
      }

      const filter = {};
      if (q.busca) {
        filter.$or = [
          { nome: { $regex: q.busca, $options: "i" } },
          { cpf: { $regex: q.busca, $options: "i" } },
          { matricula: { $regex: q.busca, $options: "i" } },
        ];
      }
      if (q.gestor) filter.gestor = q.gestor;

      // Regiões: interseção entre o que o gestor pode ver e o que ele pediu para filtrar (opcional).
      const regioesQuery = q.regioes ? String(q.regioes).split(",").filter(Boolean) : null;
      if (regioes && regioesQuery) {
        filter.regiao = { $in: regioes.filter((r) => regioesQuery.includes(r)) };
      } else if (regioes) {
        filter.regiao = { $in: regioes };
      } else if (regioesQuery) {
        filter.regiao = { $in: regioesQuery };
      }

      const docs = await funcionarios.find(filter).sort({ dataLimiteInicioFerias: 1 }).toArray();
      return res.end(JSON.stringify(docs));
    }

    // Criação individual ou importação em lote — somente gestor
    if (req.method === "POST") {
      const payload = requireRole(req, res, "gestor");
      if (!payload) return;
      const regioes = regioesPermitidas(payload);
      const body = await readBody(req);

      if (Array.isArray(body.lote)) {
        const resultados = { criados: 0, atualizados: 0, erros: [] };
        for (const item of body.lote) {
          try {
            const cpf = apenasNumeros(item.cpf);
            if (!cpf || cpf.length !== 11) {
              resultados.erros.push(`${item.nome || "(sem nome)"}: CPF inválido.`);
              continue;
            }
            if (!item.nome || !item.periodoAquisitivoInicio) {
              resultados.erros.push(`${item.nome || cpf}: nome ou período aquisitivo ausente.`);
              continue;
            }
            if (!regiaoPermitida(regioes, item.regiao)) {
              resultados.erros.push(`${item.nome}: sem permissão para a região "${item.regiao}".`);
              continue;
            }
            const doc = montarFuncionario(item);
            const existente = await funcionarios.findOne({ cpf });
            if (existente) {
              if (!regiaoPermitida(regioes, existente.regiao)) {
                resultados.erros.push(`${item.nome}: funcionário já existe em região sem sua permissão.`);
                continue;
              }
              await funcionarios.updateOne({ _id: existente._id }, { $set: doc });
              resultados.atualizados++;
            } else {
              doc.createdAt = new Date();
              await funcionarios.insertOne(doc);
              resultados.criados++;
            }
          } catch (e) {
            resultados.erros.push(`${item.nome || item.cpf || "?"}: ${e.message}`);
          }
        }
        res.statusCode = 200;
        return res.end(JSON.stringify(resultados));
      }

      // Cadastro individual
      const cpf = apenasNumeros(body.cpf);
      if (!cpf || cpf.length !== 11) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "CPF inválido (deve ter 11 dígitos)." }));
      }
      if (!body.nome || !body.periodoAquisitivoInicio) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "Nome e período aquisitivo de início são obrigatórios." }));
      }
      if (!regiaoPermitida(regioes, body.regiao)) {
        res.statusCode = 403;
        return res.end(JSON.stringify({ error: "Você não tem permissão para cadastrar funcionários nesta região." }));
      }
      const existente = await funcionarios.findOne({ cpf });
      if (existente) {
        res.statusCode = 409;
        return res.end(JSON.stringify({ error: "Já existe um funcionário cadastrado com este CPF." }));
      }
      const doc = montarFuncionario(body);
      doc.createdAt = new Date();
      const result = await funcionarios.insertOne(doc);
      res.statusCode = 201;
      return res.end(JSON.stringify({ message: "Funcionário criado.", id: result.insertedId }));
    }

    // Atualização — somente gestor
    if (req.method === "PUT") {
      const payload = requireRole(req, res, "gestor");
      if (!payload) return;
      const regioes = regioesPermitidas(payload);
      const body = await readBody(req);
      if (!body.id) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "ID obrigatório." }));
      }
      const existente = await funcionarios.findOne({ _id: new ObjectId(body.id) });
      if (!existente) {
        res.statusCode = 404;
        return res.end(JSON.stringify({ error: "Funcionário não encontrado." }));
      }
      if (!regiaoPermitida(regioes, existente.regiao)) {
        res.statusCode = 403;
        return res.end(JSON.stringify({ error: "Você não tem acesso à região deste funcionário." }));
      }
      const novaRegiao = body.regiao !== undefined ? body.regiao : existente.regiao;
      if (!regiaoPermitida(regioes, novaRegiao)) {
        res.statusCode = 403;
        return res.end(JSON.stringify({ error: "Você não tem permissão para mover o funcionário para esta região." }));
      }
      const doc = montarFuncionario({ ...existente, ...body });
      await funcionarios.updateOne({ _id: existente._id }, { $set: doc });
      res.statusCode = 200;
      return res.end(JSON.stringify({ message: "Funcionário atualizado." }));
    }

    // Remoção — somente gestor
    if (req.method === "DELETE") {
      const payload = requireRole(req, res, "gestor");
      if (!payload) return;
      const regioes = regioesPermitidas(payload);
      const q = req.query || {};
      const id = q.id || (req.body && req.body.id);
      if (!id) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "ID obrigatório." }));
      }
      try {
        const existente = await funcionarios.findOne({ _id: new ObjectId(id) });
        if (!existente) {
          res.statusCode = 404;
          return res.end(JSON.stringify({ error: "Funcionário não encontrado." }));
        }
        if (!regiaoPermitida(regioes, existente.regiao)) {
          res.statusCode = 403;
          return res.end(JSON.stringify({ error: "Você não tem acesso à região deste funcionário." }));
        }
        await funcionarios.deleteOne({ _id: new ObjectId(id) });
        return res.end(JSON.stringify({ message: "Funcionário removido." }));
      } catch {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "ID inválido." }));
      }
    }

    res.setHeader("Allow", "GET,POST,PUT,DELETE");
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: "Method Not Allowed" }));
  } catch (err) {
    console.error("api/funcionarios error:", err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: "Erro interno: " + (err && err.message ? err.message : "unknown") }));
  }
};
