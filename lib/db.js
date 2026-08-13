const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || "ferias_stf";

let clientPromise = null;

// Mantém uma única conexão compartilhada com o MongoDB entre invocações da function.
async function getDb() {
  if (!MONGODB_URI) throw new Error("MONGODB_URI não definido nas variáveis de ambiente");
  if (!clientPromise) {
    const client = new MongoClient(MONGODB_URI);
    clientPromise = client.connect().then((c) => c);
  }
  const client = await clientPromise;
  return client.db(DB_NAME);
}

module.exports = { getDb, DB_NAME };
