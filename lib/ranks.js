// L'échelle des rangs du jeu. Chaque palier indique combien de victoires
// (gagnées PENDANT qu'on est à ce palier) sont nécessaires pour passer au
// palier suivant. Le dernier palier (Unreal Legend 3) n'a pas de suite.
const TIERS = [
  { name: 'Non classé', winsToPromote: 5 },
  { name: 'Bronze 1', winsToPromote: 10 },
  { name: 'Bronze 2', winsToPromote: 10 },
  { name: 'Bronze 3', winsToPromote: 10 },
  { name: 'Argent 1', winsToPromote: 15 },
  { name: 'Argent 2', winsToPromote: 15 },
  { name: 'Argent 3', winsToPromote: 15 },
  { name: 'Or 1', winsToPromote: 20 },
  { name: 'Or 2', winsToPromote: 20 },
  { name: 'Or 3', winsToPromote: 20 },
  { name: 'Platine 1', winsToPromote: 25 },
  { name: 'Platine 2', winsToPromote: 25 },
  { name: 'Platine 3', winsToPromote: 25 },
  { name: 'Diamant 1', winsToPromote: 30 },
  { name: 'Diamant 2', winsToPromote: 30 },
  { name: 'Diamant 3', winsToPromote: 30 },
  { name: 'Élite 1', winsToPromote: 35 },
  { name: 'Élite 2', winsToPromote: 35 },
  { name: 'Élite 3', winsToPromote: 35 },
  { name: 'Champion 1', winsToPromote: 40 },
  { name: 'Champion 2', winsToPromote: 40 },
  { name: 'Champion 3', winsToPromote: 40 },
  { name: 'Unreal 1', winsToPromote: 45 },
  { name: 'Unreal 2', winsToPromote: 45 },
  { name: 'Unreal 3', winsToPromote: 45 },
  { name: 'Unreal Legend 1', winsToPromote: 50 },
  { name: 'Unreal Legend 2', winsToPromote: 50 },
  { name: 'Unreal Legend 3', winsToPromote: null },
];

function publicProfile(p) {
  const tier = TIERS[p.rankIndex] || TIERS[TIERS.length - 1];
  return {
    username: p.username,
    rankIndex: p.rankIndex,
    rankName: tier.name,
    wins: p.wins,
    winsToPromote: tier.winsToPromote,
    totalWins: p.totalWins,
    maxRank: p.rankIndex >= TIERS.length - 1,
  };
}

// Enregistre une victoire pour ce profil et le fait monter de palier si le
// seuil est atteint. Retourne { profile, promoted } ou null si le profil
// n'existe pas (ex: pseudo supprimé entre-temps).
async function recordWin(redis, username) {
  const key = 'profile:' + username.toLowerCase();
  const profile = await redis.get(key);
  if (!profile) return null;

  profile.wins += 1;
  profile.totalWins += 1;

  const tier = TIERS[profile.rankIndex];
  let promoted = false;
  if (tier && tier.winsToPromote != null && profile.wins >= tier.winsToPromote && profile.rankIndex < TIERS.length - 1) {
    profile.rankIndex += 1;
    profile.wins = 0;
    promoted = true;
  }

  await redis.set(key, profile);
  return { profile, promoted };
}

const LOSS_PENALTY = 2;

// Enregistre une défaite en mode classé : retire 2 victoires. Si le
// compteur passe sous 0, on redescend d'un palier (le trop-perçu est
// reporté sur le palier du dessous). On ne descend jamais sous "Non
// classé". Retourne { profile, demoted } ou null si le profil n'existe pas.
async function recordLoss(redis, username) {
  const key = 'profile:' + username.toLowerCase();
  const profile = await redis.get(key);
  if (!profile) return null;

  profile.wins -= LOSS_PENALTY;
  let demoted = false;

  while (profile.wins < 0 && profile.rankIndex > 0) {
    profile.rankIndex -= 1;
    const prevTier = TIERS[profile.rankIndex];
    profile.wins = (prevTier.winsToPromote || 0) + profile.wins;
    demoted = true;
  }
  if (profile.wins < 0) profile.wins = 0;

  await redis.set(key, profile);
  return { profile, demoted };
}

module.exports = { TIERS, publicProfile, recordWin, recordLoss };
