const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "troque-este-segredo-em-producao";
const TOKEN_TTL = "12h";

// Gera um token JWT para gestor ou funcionário.
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

// Extrai e valida o token do header Authorization: Bearer <token>.
function getTokenFromReq(req) {
  const header = req.headers && (req.headers.authorization || req.headers.Authorization);
  if (!header) return null;
  const parts = String(header).split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;
  return parts[1];
}

// Verifica o token e retorna o payload decodificado, ou null se inválido.
function verifyToken(req) {
  const token = getTokenFromReq(req);
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

// Middleware helper: exige um papel específico ('gestor' ou 'funcionario').
// Retorna o payload se autorizado, ou envia 401/403 e retorna null.
function requireRole(req, res, role) {
  const payload = verifyToken(req);
  if (!payload) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: "Não autenticado. Faça login novamente." }));
    return null;
  }
  if (role && payload.role !== role) {
    res.statusCode = 403;
    res.end(JSON.stringify({ error: "Acesso não autorizado para este perfil." }));
    return null;
  }
  return payload;
}

module.exports = { signToken, verifyToken, requireRole };
