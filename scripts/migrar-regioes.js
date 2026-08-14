/**
 * Migração: popula a coleção "regioes" a partir dos valores já usados no campo
 * `regiao` dos funcionários existentes. Rode uma vez após atualizar para a versão
 * que introduziu o cadastro próprio de regiões:
 *   node scripts/migrar-regioes.js
 *
 * Requer MONGODB_URI (e opcionalmente DB_NAME) nas variáveis de ambiente.
 * Seguro rodar mais de uma vez — regiões já existentes não são duplicadas.
 */
const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || "ferias_stf";

async function main() {
  if (!MONGODB_URI) {
    console.error("Defina a variável de ambiente MONGODB_URI antes de rodar este script.");
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  const nomesExistentes = (await db.collection("funcionarios").distinct("regiao")).filter(Boolean);
  const regioesCol = db.collection("regioes");

  let criadas = 0;
  for (const nome of nomesExistentes) {
    const jaExiste = await regioesCol.findOne({ nome: { $regex: `^${nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } });
    if (!jaExiste) {
      await regioesCol.insertOne({ nome, createdAt: new Date() });
      criadas++;
    }
  }

  console.log(`Migração concluída: ${criadas} região(ões) nova(s) criada(s) a partir de ${nomesExistentes.length} valor(es) encontrado(s) em funcionários.`);
  await client.close();
}

main().catch((err) => {
  console.error("Erro na migração de regiões:", err);
  process.exit(1);
});
