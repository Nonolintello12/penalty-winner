// Gère les comptes joueurs : pas de mot de passe, juste un pseudo + un
// code secret généré par le jeu (comme un code de partie, mais personnel).
const { getRedis } = require('../lib/redis');
const { publicProfile } = require('../lib/ranks');

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomCode(len) {
  let code = '';
  for (let i = 0; i < len; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

function profileKey(username) {
  return 'profile:' + username.toLowerCase();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'méthode non supportée' });
  }

  try {
    const redis = getRedis();
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { action } = body;
    const username = String(body.username || '').trim().slice(0, 16);
    if (!username) return res.status(400).json({ error: 'pseudo manquant' });

    const key = profileKey(username);

    if (action === 'signup') {
      if (await redis.get(key)) return res.status(409).json({ error: 'ce pseudo est déjà pris' });
      const secretCode = randomCode(6);
      const profile = { username, secretCode, rankIndex: 0, wins: 0, totalWins: 0, createdAt: Date.now() };
      await redis.set(key, profile);
      return res.status(200).json({ username, secretCode, profile: publicProfile(profile) });
    }

    if (action === 'login') {
      const profile = await redis.get(key);
      const code = String(body.secretCode || '').trim().toUpperCase();
      if (!profile || profile.secretCode !== code) {
        return res.status(401).json({ error: 'pseudo ou code secret incorrect' });
      }
      return res.status(200).json({ username: profile.username, profile: publicProfile(profile) });
    }

    return res.status(400).json({ error: 'action inconnue' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'erreur serveur' });
  }
};
