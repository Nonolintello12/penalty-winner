// Le client Redis (Upstash) partagé entre toutes les fonctions /api,
// pour ne pas ré-écrire la même connexion dans chaque fichier.
const { Redis } = require('@upstash/redis');

let client = null;

function getRedis() {
  if (!client) {
    client = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
  }
  return client;
}

module.exports = { getRedis };
