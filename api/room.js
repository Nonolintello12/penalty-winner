// Ce fichier vit dans /api : Vercel en fait automatiquement une petite adresse
// internet (une "fonction serverless") qu'on peut appeler depuis game.js.
// C'est notre "carnet de score partagé" : il lit et écrit l'état de chaque
// partie dans Upstash (une base Redis), pour que les deux joueurs -
// chacun sur son ordinateur - voient la même partie.

const { getRedis } = require('../lib/redis');
const { recordWin, recordLoss, TIERS } = require('../lib/ranks');
const { addDiamonds, DIAMONDS_PER_MATCH } = require('../lib/shop');

const redis = getRedis();

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // pas de 0/O ni 1/I, pour éviter les confusions
const ROOM_TTL_SECONDS = 6 * 60 * 60; // une partie oubliée disparaît après 6h
const SAVE_RADIUS = 0.34; // même règle d'arrêt que dans le jeu d'origine
const WIN_TARGET = 10;
const REVEAL_MS = 2600; // durée d'affichage de l'animation but/arrêt

function randomCode() {
  let code = '';
  for (let i = 0; i < 4; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

function roomKey(code) {
  return 'room:' + code;
}

function clampPct(v) {
  return Math.max(2, Math.min(98, Number(v)));
}

function freshState(name1, profileUsername1, mode, ballSkin1, keeperSkin1) {
  return {
    mode: mode === 'ranked' ? 'ranked' : 'classic',
    players: [name1, null],
    profiles: [profileUsername1 || null, null], // pseudo du compte classé, si connecté
    balls: [ballSkin1 || 'classique', 'classique'], // ballon choisi par chaque joueur
    keepers: [keeperSkin1 || 'classique', 'classique'], // gardien choisi par chaque joueur
    scores: [0, 0],
    shooterIdx: 0,
    phase: 'waiting', // waiting -> shoot -> keep -> reveal -> gameover
    shotPos: null,
    keepPos: null,
    lastResult: null,
    revealUntil: null,
    winner: null,
    lastPromotion: null, // { username, rankName, promoted } rempli si le vainqueur a gagné en étant connecté (mode classé)
    lastDemotion: null, // { username, rankName, demoted } rempli si le perdant a un profil (mode classé)
    version: 1,
  };
}

async function loadState(code) {
  return (await redis.get(roomKey(code))) || null;
}

async function saveState(code, state) {
  await redis.set(roomKey(code), state, { ex: ROOM_TTL_SECONDS });
}

// Si le temps d'affichage du but/arrêt est passé, on prépare le tour suivant.
function resolveAutoAdvance(state) {
  if (state.phase === 'reveal' && state.revealUntil && Date.now() >= state.revealUntil) {
    if (state.winner !== null) {
      state.phase = 'gameover';
    } else {
      state.shooterIdx = state.shooterIdx === 0 ? 1 : 0;
      state.phase = 'shoot';
    }
    state.shotPos = null;
    state.keepPos = null;
    state.lastResult = null;
    state.revealUntil = null;
    state.version += 1;
  }
  return state;
}

// Le gardien ne doit pas voir où le tir est visé avant la révélation.
function redactForRole(state, role) {
  const clone = JSON.parse(JSON.stringify(state));
  const shooterRole = clone.shooterIdx === 0 ? 'p1' : 'p2';
  const isKeeper = role && role !== shooterRole;
  if (isKeeper && (clone.phase === 'shoot' || clone.phase === 'keep')) {
    clone.shotPos = null;
  }
  return clone;
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const code = String(req.query.code || '').toUpperCase();
      const role = req.query.role || null;
      if (!code) return res.status(400).json({ error: 'code manquant' });

      let state = await loadState(code);
      if (!state) return res.status(404).json({ error: "partie introuvable" });

      const before = state.version;
      state = resolveAutoAdvance(state);
      if (state.version !== before) await saveState(code, state);

      return res.status(200).json({ code, state: redactForRole(state, role) });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { action } = body;

      if (action === 'create') {
        const name = String(body.name || 'Joueur 1').slice(0, 16);
        const profileUsername = body.profileUsername ? String(body.profileUsername).slice(0, 16) : null;
        const ballSkin = body.ballSkin ? String(body.ballSkin).slice(0, 24) : null;
        const keeperSkin = body.keeperSkin ? String(body.keeperSkin).slice(0, 24) : null;
        let code = randomCode();
        for (let tries = 0; tries < 5; tries++) {
          if (!(await redis.get(roomKey(code)))) break;
          code = randomCode();
        }
        const state = freshState(name, profileUsername, body.mode, ballSkin, keeperSkin);
        await saveState(code, state);
        return res.status(200).json({ code, role: 'p1', state: redactForRole(state, 'p1') });
      }

      const code = String(body.code || '').toUpperCase();
      if (!code) return res.status(400).json({ error: 'code manquant' });

      let state = await loadState(code);
      if (!state) return res.status(404).json({ error: "partie introuvable" });

      if (action === 'join') {
        const name = String(body.name || 'Joueur 2').slice(0, 16);
        const profileUsername = body.profileUsername ? String(body.profileUsername).slice(0, 16) : null;
        const ballSkin = body.ballSkin ? String(body.ballSkin).slice(0, 24) : null;
        const keeperSkin = body.keeperSkin ? String(body.keeperSkin).slice(0, 24) : null;
        if (state.players[1]) return res.status(409).json({ error: 'cette partie est déjà complète' });
        state.players[1] = name;
        state.profiles[1] = profileUsername;
        state.balls[1] = ballSkin || 'classique';
        state.keepers[1] = keeperSkin || 'classique';
        state.phase = 'shoot';
        state.version += 1;
        await saveState(code, state);
        return res.status(200).json({ code, role: 'p2', state: redactForRole(state, 'p2') });
      }

      const role = body.role;
      const shooterRole = state.shooterIdx === 0 ? 'p1' : 'p2';
      const keeperRole = shooterRole === 'p1' ? 'p2' : 'p1';

      if (action === 'shoot') {
        if (state.phase !== 'shoot') return res.status(409).json({ error: "ce n'est pas la phase de tir" });
        if (role !== shooterRole) return res.status(403).json({ error: 'ce n\'est pas ton tour de tirer' });
        const pos = body.pos;
        if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number')
          return res.status(400).json({ error: 'position invalide' });
        state.shotPos = { x: clampPct(pos.x), y: clampPct(pos.y) };
        state.phase = 'keep';
        state.version += 1;
        await saveState(code, state);
        return res.status(200).json({ code, state: redactForRole(state, role) });
      }

      if (action === 'keep') {
        if (state.phase !== 'keep') return res.status(409).json({ error: "ce n'est pas la phase de plongeon" });
        if (role !== keeperRole) return res.status(403).json({ error: "ce n'est pas ton tour de plonger" });
        const pos = body.pos;
        if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number')
          return res.status(400).json({ error: 'position invalide' });
        state.keepPos = { x: clampPct(pos.x), y: clampPct(pos.y) };

        const dx = (state.shotPos.x - state.keepPos.x) / 100;
        const dy = (state.shotPos.y - state.keepPos.y) / 100;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const isSave = dist < SAVE_RADIUS;
        if (!isSave) state.scores[state.shooterIdx] += 1;

        state.lastResult = { isSave, shooterIdx: state.shooterIdx, shotPos: state.shotPos, keepPos: state.keepPos };
        if (state.scores[state.shooterIdx] >= WIN_TARGET) {
          state.winner = state.shooterIdx;

          if (state.profiles) {
            const loserIdx = state.winner === 0 ? 1 : 0;
            const winnerUsername = state.profiles[state.winner];
            const loserUsername = state.profiles[loserIdx];

            // Diamants : 5 par match joué jusqu'au bout, gagné ou perdu,
            // pour chaque joueur connecté à un profil.
            if (winnerUsername) await addDiamonds(redis, winnerUsername, DIAMONDS_PER_MATCH);
            if (loserUsername) await addDiamonds(redis, loserUsername, DIAMONDS_PER_MATCH);

            if (state.mode === 'ranked') {
              if (winnerUsername) {
                const result = await recordWin(redis, winnerUsername);
                if (result) {
                  const tier = TIERS[result.profile.rankIndex] || TIERS[TIERS.length - 1];
                  state.lastPromotion = { username: winnerUsername, rankName: tier.name, rankEmoji: tier.emoji, promoted: result.promoted };
                }
              }
              if (loserUsername) {
                const result = await recordLoss(redis, loserUsername);
                if (result) {
                  const tier = TIERS[result.profile.rankIndex] || TIERS[TIERS.length - 1];
                  state.lastDemotion = { username: loserUsername, rankName: tier.name, rankEmoji: tier.emoji, demoted: result.demoted };
                }
              }
            }
          }
        }

        state.phase = 'reveal';
        state.revealUntil = Date.now() + REVEAL_MS;
        state.version += 1;
        await saveState(code, state);
        return res.status(200).json({ code, state: redactForRole(state, role) });
      }

      return res.status(400).json({ error: 'action inconnue' });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'méthode non supportée' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'erreur serveur' });
  }
};
