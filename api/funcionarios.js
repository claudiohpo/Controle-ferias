const { ObjectId } = require("mongodb");
const { getDb } = require("../lib/db");
const { requireRole, verifyToken } = require("../lib/auth");

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

// Calcula período aquisitivo (fim) e data máxima de gozo a partir do início, seguindo a CLT
// (período aquisitivo de 12 meses + período concessivo de até 12 meses).
function calcularDatasCLT(inicioStr) {
  const inicio = new Date(inicioStr);
  const fimAquisitivo = new Date(inicio);
  fimAquisitivo.setFullYear(fimAquisitivo.getFullYear() + 1);
  const dataMaxGozo = new Date(fimAquisitivo);
  dataMaxGozo.setFullYear(dataMaxGozo.getFullYear() + 1);
  return {
    periodoAquisitivoFim: fimAquisitivo.toISOString().slice(0, 10),
    dataMaxGozo: dataMaxGozo.toISOString().slice(0, 10),
  };
}

function montarFuncionario(input) {
  const cpf = apenasNumeros(input.cpf);
  const periodoAquisitivoInicio = input.periodoAquisitivoInicio;
  const datasCalculadas = calcularDatasCLT(periodoAquisitivoInicio);
  return {
    nome: String(input.nome || "").trim(),
    cpf,
    matricula: input.matricula ? String(input.matricula).trim() : null,
    gestor: input.gestor ? String(input.gestor).trim() : null,
    regiao: input.regiao ? String(input.regiao).trim() : null,
    periodoAquisitivoInicio,
    periodoAquisitivoFim: input.periodoAquisitivoFim || datasCalculadas.periodoAquisitivoFim,
    dataMaxGozo: input.dataMaxGozo || datasCalculadas.dataMaxGozo,
    diasDireito: input.diasDireito ? Number(input.diasDireito) : 30,
    updatedAt: new Date(),
  };
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
      if (!requireRole(req, res, "gestor")) return;

      if (q.id) {
        try {
          const doc = await funcionarios.findOne({ _id: new ObjectId(q.id) });
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
      if (q.regiao) filter.regiao = q.regiao;
      if (q.gestor) filter.gestor = q.gestor;

      const docs = await funcionarios.find(filter).sort({ nome: 1 }).toArray();
      return res.end(JSON.stringify(docs));
    }

    // Criação individual ou importação em lote — somente gestor
    if (req.method === "POST") {
      if (!requireRole(req, res, "gestor")) return;
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
            const doc = montarFuncionario(item);
            const existente = await funcionarios.findOne({ cpf });
            if (existente) {
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
      if (!requireRole(req, res, "gestor")) return;
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
      const doc = montarFuncionario({ ...existente, ...body });
      await funcionarios.updateOne({ _id: existente._id }, { $set: doc });
      res.statusCode = 200;
      return res.end(JSON.stringify({ message: "Funcionário atualizado." }));
    }

    // Remoção — somente gestor
    if (req.method === "DELETE") {
      if (!requireRole(req, res, "gestor")) return;
      const q = req.query || {};
      const id = q.id || (req.body && req.body.id);
      if (!id) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "ID obrigatório." }));
      }
      try {
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
