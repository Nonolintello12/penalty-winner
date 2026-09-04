// La boutique : ballons ET gardiens à acheter avec des diamants gagnés en
// jouant (+5 à chaque match terminé). Chaque skin est juste une recoloration
// du même dessin (ballon ou gardien), appliquée côté client dans game.js.
// Un ballon par Coupe du Monde, du plus récent (gratuit) au plus ancien
// (le plus cher). Couleurs originales juste inspirées de l'ambiance de
// chaque édition — pas une reproduction des vrais ballons.
// "pattern" dit à game.js QUEL dessin utiliser (les formes sont générées
// côté client) — chaque époque a son style, pas juste sa couleur :
// pentagon = ballon classique à pentagones, petals3/petals6 = tourbillon
// à 3 ou 6 pointes, wave = grande vague, braid = bandes tressées,
// panel = deux grands panneaux courbes, flame = flammes pointues,
// triflag = deux voiles de chaque côté, star = anneaux + étoile.
const BALLS = {
  classique: { name: 'Ballon CDM 2026', price: 0, pattern: 'petals3', colors: ['#FFC72C', '#D6001C', '#1751B4'] },
  cdm2022: { name: 'Ballon CDM 2022', price: 50, pattern: 'wave', colors: ['#E7E7E9', '#C8102E', '#003DA5'] },
  cdm2018: { name: 'Ballon CDM 2018', price: 100, pattern: 'pentagon', colors: ['#00A19A', '#1A1A1A', '#E8E8E8'] },
  cdm2014: { name: 'Ballon CDM 2014', price: 200, pattern: 'braid', colors: ['#F7941D', '#00A651', '#0072BC'] },
  cdm2010: { name: 'Ballon CDM 2010', price: 300, pattern: 'petals6', colors: ['#00A651', '#F7941D', '#0072BC'] },
  cdm2006: { name: 'Ballon CDM 2006', price: 500, pattern: 'panel', colors: ['#1A1A1A', '#FFC72C', '#F7F9FA'] },
  cdm2002: { name: 'Ballon CDM 2002', price: 600, pattern: 'flame', colors: ['#FFC72C', '#D6001C', '#F7F9FA'] },
  cdm1998: { name: 'Ballon CDM 1998', price: 800, pattern: 'triflag', colors: ['#002395', '#F7F9FA', '#ED2939'] },
  cdm1994: { name: 'Ballon CDM 1994', price: 1000, pattern: 'star', colors: ['#B22234', '#F7F9FA', '#3C3B6E'] },
  cdm1990: { name: 'Ballon CDM 1990', price: 2000, pattern: 'pentagon', colors: ['#008C45', '#F7F9FA', '#CD212A'] },
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
