/**
 * Cria o usuário gestor master no banco de dados.
 * Rode localmente (nunca em produção/API pública):
 *   node scripts/seed.js
 *
 * Requer as variáveis de ambiente MONGODB_URI (e opcionalmente DB_NAME) definidas,
 * seja no seu shell ou em um arquivo .env na raiz (usando `node -r dotenv/config scripts/seed.js`).
 */
const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || "ferias_stf";

async function main() {
  if (!MONGODB_URI) {
    console.error("Defina a variável de ambiente MONGODB_URI antes de rodar este script.");
    process.exit(1);
  }

  const username = process.argv[2] || "admin";
  const senhaGerada = process.argv[3] || crypto.randomBytes(6).toString("base64url");

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const gestores = db.collection("gestores");

  const existente = await gestores.findOne({ username });
  if (existente) {
    console.log(`Já existe um gestor com o usuário "${username}". Nada foi alterado.`);
    await client.close();
    return;
  }

  const passwordHash = bcrypt.hashSync(senhaGerada, 12);
  await gestores.insertOne({
    username,
    passwordHash,
    nome: "Administrador Master",
    role: "gestor",
    createdAt: new Date(),
  });

  console.log("========================================");
  console.log("Usuário gestor master criado com sucesso!");
  console.log("Usuário:", username);
  console.log("Senha:  ", senhaGerada);
  console.log("Banco:  ", DB_NAME);
  console.log("========================================");
  console.log("Guarde esta senha em local seguro e altere-a após o primeiro acesso (Configurações > Trocar senha).");

  await client.close();
}

main().catch((err) => {
  console.error("Erro ao criar gestor master:", err);
  process.exit(1);
});
