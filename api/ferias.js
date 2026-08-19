const { ObjectId } = require("mongodb");
const { getDb } = require("../lib/db");
const { verifyToken, requireRole, regioesPermitidas } = require("../lib/auth");
const { validarSolicitacao } = require("../lib/clt");

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

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  try {
    const db = await getDb();
    const solicitacoes = db.collection("solicitacoes_ferias");
    const funcionariosCol = db.collection("funcionarios");

    if (req.method === "GET") {
      const payload = verifyToken(req);
      if (!payload) {
        res.statusCode = 401;
        return res.end(JSON.stringify({ error: "Não autenticado." }));
      }

      const q = req.query || {};
      const filter = {};

      if (payload.role === "funcionario") {
        filter.funcionarioId = payload.funcionarioId;
      } else if (payload.role === "gestor") {
        if (q.status) filter.status = q.status;
        if (q.funcionarioId) filter.funcionarioId = q.funcionarioId;
        const regioes = regioesPermitidas(payload);
        const regioesQuery = q.regioes ? String(q.regioes).split(",").filter(Boolean) : null;
        if (regioes && regioesQuery) {
          filter.funcionarioRegiao = { $in: regioes.filter((r) => regioesQuery.includes(r)) };
        } else if (regioes) {
          filter.funcionarioRegiao = { $in: regioes };
        } else if (regioesQuery) {
          filter.funcionarioRegiao = { $in: regioesQuery };
        }
      } else {
        res.statusCode = 403;
        return res.end(JSON.stringify({ error: "Acesso não autorizado." }));
      }

      const docs = await solicitacoes.find(filter).sort({ criadoEm: -1 }).toArray();
      return res.end(JSON.stringify(docs));
    }

    if (req.method === "POST") {
      const payload = verifyToken(req);
      if (!payload || payload.role !== "funcionario") {
        res.statusCode = 401;
        return res.end(JSON.stringify({ error: "Não autenticado como funcionário." }));
      }

      const body = await readBody(req);
      const funcionario = await funcionariosCol.findOne({ _id: new ObjectId(payload.funcionarioId) });
      if (!funcionario) {
        res.statusCode = 404;
        return res.end(JSON.stringify({ error: "Funcionário não encontrado." }));
      }

      const periodos = Array.isArray(body.periodos) ? body.periodos : [];
      const abonoPecuniarioDias = Number(body.abonoPecuniarioDias || 0);
      const adiantar13 = !!body.adiantar13;

      // Bloqueia nova solicitação se já existir uma pendente ou aprovada para este funcionário.
      const existente = await solicitacoes.findOne({
        funcionarioId: payload.funcionarioId,
        status: { $in: ["pendente", "aprovado"] },
      });
      if (existente) {
        res.statusCode = 409;
        return res.end(
          JSON.stringify({ error: "Você já possui uma solicitação pendente ou aprovada. Aguarde a resposta do gestor ou entre em contato para alterá-la." })
        );
      }

      const validacao = validarSolicitacao(funcionario, periodos, abonoPecuniarioDias);
      if (!validacao.valid) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: validacao.error }));
      }

      const doc = {
        funcionarioId: payload.funcionarioId,
        funcionarioNome: funcionario.nome,
        funcionarioCpf: funcionario.cpf,
        funcionarioRegiao: funcionario.regiao || null,
        funcionarioMatricula: funcionario.matricula || null,
        funcionarioGestor: funcionario.gestor || null,
        periodos: periodos.map((p) => ({ inicio: p.inicio, dias: Number(p.dias) })),
        abonoPecuniarioDias,
        adiantar13,
        numeroRequisicaoNatCorp: null,
        totalDias: validacao.totalDias,
        status: "pendente",
        comentarioGestor: null,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      };
      const result = await solicitacoes.insertOne(doc);
      res.statusCode = 201;
      return res.end(JSON.stringify({ message: "Solicitação enviada com sucesso.", id: result.insertedId }));
    }

    if (req.method === "PATCH") {
      const payload = verifyToken(req);
      if (!payload) {
        res.statusCode = 401;
        return res.end(JSON.stringify({ error: "Não autenticado." }));
      }
      const body = await readBody(req);
      const q = req.query || {};
      const id = q.id || body.id;
      if (!id) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "ID obrigatório." }));
      }
      let solicitacaoId;
      try {
        solicitacaoId = new ObjectId(id);
      } catch {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "ID inválido." }));
      }
      const existente = await solicitacoes.findOne({ _id: solicitacaoId });
      if (!existente) {
        res.statusCode = 404;
        return res.end(JSON.stringify({ error: "Solicitação não encontrada." }));
      }

      // Funcionário: só pode registrar/editar o número da requisição no NatCorp,
      // e apenas na sua própria solicitação já aprovada.
      if (payload.role === "funcionario") {
        if (existente.funcionarioId !== payload.funcionarioId) {
          res.statusCode = 403;
          return res.end(JSON.stringify({ error: "Você só pode editar a sua própria solicitação." }));
        }
        if (existente.status !== "aprovado") {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: "O número da requisição só pode ser informado após a aprovação das férias." }));
        }
        if (body.numeroRequisicaoNatCorp === undefined) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: "Informe o número da requisição." }));
        }
        const numero = String(body.numeroRequisicaoNatCorp).trim();
        if (!numero) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: "Informe um número de requisição válido." }));
        }
        await solicitacoes.updateOne({ _id: solicitacaoId }, { $set: { numeroRequisicaoNatCorp: numero, atualizadoEm: new Date() } });
        res.statusCode = 200;
        return res.end(JSON.stringify({ message: "Número da requisição salvo com sucesso." }));
      }

      // Gestor: aprova, rejeita ou cancela a solicitação.
      if (payload.role === "gestor") {
        if (!body.status || !["aprovado", "rejeitado", "cancelado"].includes(body.status)) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: "Informe id e status ('aprovado', 'rejeitado' ou 'cancelado')." }));
        }
        const regioes = regioesPermitidas(payload);
        if (regioes && !regioes.includes(existente.funcionarioRegiao)) {
          res.statusCode = 403;
          return res.end(JSON.stringify({ error: "Você não tem acesso à região deste funcionário." }));
        }
        if (body.status === "cancelado" && !["aprovado", "pendente"].includes(existente.status)) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: "Somente solicitações pendentes ou aprovadas podem ser canceladas." }));
        }
        await solicitacoes.updateOne(
          { _id: solicitacaoId },
          {
            $set: {
              status: body.status,
              comentarioGestor: body.comentario || null,
              atualizadoEm: new Date(),
            },
          }
        );
        res.statusCode = 200;
        return res.end(JSON.stringify({ message: `Solicitação ${body.status}.` }));
      }

      res.statusCode = 403;
      return res.end(JSON.stringify({ error: "Acesso não autorizado." }));
    }

    res.setHeader("Allow", "GET,POST,PATCH");
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: "Method Not Allowed" }));
  } catch (err) {
    console.error("api/ferias error:", err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: "Erro interno: " + (err && err.message ? err.message : "unknown") }));
  }
};
