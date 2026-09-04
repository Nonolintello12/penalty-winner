// La boutique : ballons ET gardiens à acheter avec des diamants gagnés en
// jouant (+5 à chaque match terminé). Chaque skin est juste une recoloration
// du même dessin (ballon ou gardien), appliquée côté client dans game.js.
// Un ballon par Coupe du Monde, du plus récent (gratuit) au plus ancien
// (le plus cher). Couleurs originales juste inspirées de l'ambiance de
// chaque édition — pas une reproduction des vrais ballons.
// "pattern" dit à game.js QUEL dessin utiliser (les formes sont générées
// côté client), pensé pour rappeler le vrai ballon de chaque édition :
// pentagon = ballon noir/blanc classique (+ petit accent), orbitstar =
// anneaux + étoiles (Questra), tricolore = pentagones fins + triangles
// bleu/rouge + rond central, flameswirl = flammes courbes (Fevernova),
// teamgeist = tourbillon noir central, confetti = plein de petits
// panneaux colorés (Jabulani), braidthick = bandes épaisses entrelacées
// (Brazuca), wave = grande vague colorée (Al Rihla), petals3 = tourbillon
// moderne à 3 pointes (2026).
const BALLS = {
  classique: { name: 'Ballon CDM 2026', price: 0, pattern: 'petals3', colors: ['#FFC72C', '#D6001C', '#1751B4'] },
  cdm2022: { name: 'Ballon CDM 2022 (Al Rihla)', price: 50, pattern: 'wave', colors: ['#F7F9FA', '#C8102E', '#003DA5'] },
  cdm2018: { name: 'Ballon CDM 2018 (Telstar 18)', price: 100, pattern: 'pentagon', colors: ['#1A1A1A', '#00A19A', '#F7F9FA'] },
  cdm2014: { name: 'Ballon CDM 2014 (Brazuca)', price: 200, pattern: 'braidthick', colors: ['#F7941D', '#00A651', '#0072BC'] },
  cdm2010: { name: 'Ballon CDM 2010 (Jabulani)', price: 300, pattern: 'confetti', colors: ['#00A651', '#F7941D', '#0072BC'] },
  cdm2006: { name: 'Ballon CDM 2006 (Teamgeist)', price: 500, pattern: 'teamgeist', colors: ['#1A1A1A', '#FFC72C', '#F7F9FA'] },
  cdm2002: { name: 'Ballon CDM 2002 (Fevernova)', price: 600, pattern: 'flameswirl', colors: ['#FFC72C', '#D6001C', '#F7F9FA'] },
  cdm1998: { name: 'Ballon CDM 1998 (Tricolore)', price: 800, pattern: 'tricolore', colors: ['#002395', '#F7F9FA', '#ED2939'] },
  cdm1994: { name: 'Ballon CDM 1994 (Questra)', price: 1000, pattern: 'orbitstar', colors: ['#B22234', '#F7F9FA', '#3C3B6E'] },
  cdm1990: { name: 'Ballon CDM 1990 (Etrusco)', price: 2000, pattern: 'pentagon', colors: ['#000000', '#008C45', '#CD212A'] },
};

// Le maillot du pays vainqueur de chaque édition (mêmes années et mêmes
// prix que les ballons). "style" est juste un chiffre cosmétique affiché
// dans la boutique — aucun effet sur les arrêts ni sur les tirs.
const KEEPERS = {
  classique: { name: 'Goal CDM 2026', price: 0, style: 0, jersey: '#C6FF00', gloves: '#8FCB00' },
  cdm2022: { name: 'Goal CDM 2022', price: 50, style: 0.1, jersey: '#75AADB', gloves: '#FFFFFF' },
  cdm2018: { name: 'Goal CDM 2018', price: 100, style: 0.2, jersey: '#0055A4', gloves: '#ED2939' },
  cdm2014: { name: 'Goal CDM 2014', price: 200, style: 0.3, jersey: '#FFFFFF', gloves: '#1A1A1A' },
  cdm2010: { name: 'Goal CDM 2010', price: 300, style: 0.4, jersey: '#C60B1E', gloves: '#FFC400' },
  cdm2006: { name: 'Goal CDM 2006', price: 500, style: 0.5, jersey: '#004C99', gloves: '#FFFFFF' },
  cdm2002: { name: 'Goal CDM 2002', price: 600, style: 0.6, jersey: '#FFDF00', gloves: '#009739' },
  cdm1998: { name: 'Goal CDM 1998', price: 800, style: 0.7, jersey: '#0055A4', gloves: '#FFFFFF' },
  cdm1994: { name: 'Goal CDM 1994', price: 1000, style: 0.8, jersey: '#FFDF00', gloves: '#002776' },
  cdm1990: { name: 'Goal CDM 1990', price: 2000, style: 0.9, jersey: '#FFFFFF', gloves: '#DD0000' },
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
