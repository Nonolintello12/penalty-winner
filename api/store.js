// Achat et sélection des ballons et gardiens. Protégé par le pseudo + code
// secret, comme une connexion, pour éviter qu'un autre navigateur touche
// ton profil.
const { getRedis } = require('../lib/redis');
const { publicProfile } = require('../lib/ranks');
const { BALLS, KEEPERS, buyItem, selectItem } = require('../lib/shop');

const redis = getRedis();

async function checkAuth(username, secretCode) {
  const profile = await redis.get('profile:' + String(username || '').toLowerCase());
  if (!profile || profile.secretCode !== String(secretCode || '').trim().toUpperCase()) return null;
  return profile;
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    return res.status(200).json({ balls: BALLS, keepers: KEEPERS });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'méthode non supportée' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { action, username, secretCode, itemId } = body;
    const kind = body.kind === 'keeper' ? 'keeper' : 'ball';

    const authed = await checkAuth(username, secretCode);
    if (!authed) return res.status(401).json({ error: 'pseudo ou code secret incorrect' });

    if (action === 'buy') {
      const result = await buyItem(redis, username, kind, itemId);
      if (result.error) return res.status(400).json({ error: result.error });
      return res.status(200).json({ profile: publicProfile(result.profile) });
    }

    if (action === 'select') {
      const result = await selectItem(redis, username, kind, itemId);
      if (result.error) return res.status(400).json({ error: result.error });
      return res.status(200).json({ profile: publicProfile(result.profile) });
    }

    return res.status(400).json({ error: 'action inconnue' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'erreur serveur' });
  }
};
