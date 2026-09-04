// La boutique : ballons ET gardiens à acheter avec des diamants gagnés en
// jouant (+5 à chaque match terminé). Chaque skin est juste une recoloration
// du même dessin (ballon ou gardien), appliquée côté client dans game.js.
const BALLS = {
  classique: { name: 'Ballon Mondial', price: 0, colors: ['#FFC72C', '#D6001C', '#1751B4'] },
  or: { name: 'Ballon Or', price: 20, colors: ['#FFE9A8', '#FFC72C', '#C99400'] },
  neon: { name: 'Ballon Néon', price: 35, colors: ['#2BE7FF', '#7B2BFF', '#FF2BD6'] },
  feu: { name: 'Ballon Feu', price: 50, colors: ['#FF6A00', '#D6001C', '#FFC72C'] },
  galaxie: { name: 'Ballon Galaxie', price: 80, colors: ['#7B2BFF', '#1751B4', '#2BE7FF'] },
};

// style : juste un chiffre "cosmétique" affiché dans la boutique (aucun
// effet sur les arrêts ou les tirs — précisé aussi dans l'interface).
const KEEPERS = {
  classique: { name: 'Gardien Classique', price: 0, style: 0, jersey: '#C6FF00', gloves: '#8FCB00' },
  ombre: { name: 'Gardien Ombre', price: 15, style: 0.1, jersey: '#3A3A46', gloves: '#6C6C7A' },
  titane: { name: 'Gardien Titane', price: 30, style: 0.2, jersey: '#B8C4CC', gloves: '#7C8CA0' },
  plasma: { name: 'Gardien Plasma', price: 50, style: 0.3, jersey: '#FF2BD6', gloves: '#7B2BFF' },
  cosmique: { name: 'Gardien Cosmique', price: 75, style: 0.4, jersey: '#2BE7FF', gloves: '#1751B4' },
  legende: { name: 'Gardien Légende', price: 110, style: 0.5, jersey: '#FFC72C', gloves: '#C99400' },
};

const CATALOGS = { ball: BALLS, keeper: KEEPERS };
const OWNED_FIELD = { ball: 'ownedBalls', keeper: 'ownedKeepers' };
const SELECTED_FIELD = { ball: 'selectedBall', keeper: 'selectedKeeper' };

const DIAMONDS_PER_MATCH = 5;

function profileKey(username) {
  return 'profile:' + username.toLowerCase();
}

async function addDiamonds(redis, username, amount) {
  const key = profileKey(username);
  const profile = await redis.get(key);
  if (!profile) return null;
  profile.diamonds = (profile.diamonds || 0) + amount;
  await redis.set(key, profile);
  return profile;
}

// kind : 'ball' ou 'keeper'
async function buyItem(redis, username, kind, itemId) {
  const catalog = CATALOGS[kind];
  const item = catalog && catalog[itemId];
  if (!item) return { error: 'objet inconnu' };
  const ownedField = OWNED_FIELD[kind];
  const selectedField = SELECTED_FIELD[kind];
  const key = profileKey(username);
  const profile = await redis.get(key);
  if (!profile) return { error: 'profil introuvable' };
  profile[ownedField] = profile[ownedField] || ['classique'];
  if (profile[ownedField].includes(itemId)) return { error: 'déjà possédé' };
  if ((profile.diamonds || 0) < item.price) return { error: 'pas assez de diamants' };
  profile.diamonds -= item.price;
  profile[ownedField].push(itemId);
  profile[selectedField] = itemId;
  await redis.set(key, profile);
  return { profile };
}

async function selectItem(redis, username, kind, itemId) {
  const catalog = CATALOGS[kind];
  if (!catalog || !catalog[itemId]) return { error: 'objet inconnu' };
  const ownedField = OWNED_FIELD[kind];
  const selectedField = SELECTED_FIELD[kind];
  const key = profileKey(username);
  const profile = await redis.get(key);
  if (!profile) return { error: 'profil introuvable' };
  profile[ownedField] = profile[ownedField] || ['classique'];
  if (!profile[ownedField].includes(itemId)) return { error: 'cet objet n\'est pas possédé' };
  profile[selectedField] = itemId;
  await redis.set(key, profile);
  return { profile };
}

module.exports = { BALLS, KEEPERS, DIAMONDS_PER_MATCH, addDiamonds, buyItem, selectItem };
