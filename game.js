(function () {
  'use strict';

  // ---------- Constantes de terrain (mêmes proportions que le CSS) ----------
  const GOAL = { left: 29, top: 9, width: 42, height: 27 };
  const BALL_START = { x: 50, y: 84 };
  const KEEPER_H_PCT = 22;
  const KEEPER_START_PCT = { x: 50, y: 100 };
  const POLL_MS = 1000;

  // ---------- État local (côté navigateur uniquement) ----------
  let roomCode = null;
  let myRole = null; // 'p1' ou 'p2'
  let lastVersion = null;
  let pollTimer = null;
  let pendingPct = null;

  // ---------- Récupération des éléments de la page ----------
  const screens = {
    profile: document.getElementById('screen-profile'),
    profileCode: document.getElementById('screen-profile-code'),
    setup: document.getElementById('screen-setup'),
    shop: document.getElementById('screen-shop'),
    waiting: document.getElementById('screen-waiting'),
    pitch: document.getElementById('screen-pitch'),
    gameover: document.getElementById('screen-gameover'),
  };
  const gameWrap = document.getElementById('game-wrap');
  const NO_GAME_WRAP_SCREENS = ['profile', 'profileCode', 'setup', 'shop', 'waiting'];

  // ---------- Traductions (FR / EN) ----------
  const TRANSLATIONS = {
    fr: {
      'start.tag': 'MONDIAL 2026', 'start.title': 'Tirs au but', 'start.sub': 'Prêt à défier ton ami ?', 'start.button': 'Commencer',
      'profile.tag': 'Avant de commencer', 'profile.title': 'Ton profil', 'profile.sub': 'Crée un profil pour suivre ton rang, ou joue sans compte.',
      'profile.tabNew': 'Créer un profil', 'profile.tabLogin': 'Se connecter', 'profile.chooseUsername': 'Choisis un pseudo',
      'profile.usernamePlaceholder': 'Ton pseudo', 'profile.username': 'Pseudo', 'profile.secretCode': 'Code secret',
      'profile.loginButton': 'Me connecter', 'profile.createButton': 'Créer mon profil', 'profile.skipButton': 'Continuer sans compte',
      'profile.errorChooseUsername': 'Choisis un pseudo.', 'profile.errorLoginFields': 'Pseudo et code secret nécessaires.',
      'profileCode.label': 'Ton code secret',
      'profileCode.rule': "Note bien ce code quelque part (ou fais une capture d'écran) ! Il te servira à retrouver ton profil et ton rang sur un autre ordinateur.",
      'profileCode.continue': "J'ai noté mon code, continuer",
      'setup.tag': 'Séance de tirs au but', 'setup.title': 'Face à face', 'setup.sub': 'Deux joueurs, deux ordinateurs. Premier à 10 buts gagne.',
      'setup.change': 'changer', 'setup.shopButton': '🛒 Boutique de ballons', 'setup.tabCreate': 'Créer une partie', 'setup.tabJoin': 'Rejoindre une partie',
      'setup.yourName': 'Ton prénom', 'setup.yourNamePlaceholder': 'Ton prénom', 'setup.modeLabel': 'Mode de partie',
      'setup.modeCasual': 'Classique', 'setup.modeRanked': 'Classée',
      'setup.modeHintCasual': 'Amical : ton rang ne bouge pas.',
      'setup.modeHintRanked': 'Classée : victoire = +1 vers le palier suivant, défaite = -2.',
      'setup.createRule': "Tu vas recevoir un code à 4 lettres. Envoie-le à ton ami (par message, appel...) pour qu'il rejoigne ta partie depuis son ordinateur.",
      'setup.createButton': 'Créer la partie', 'setup.matchCode': 'Code de la partie', 'setup.joinButton': 'Rejoindre la partie',
      'setup.errorCreateRoom': 'Oups, impossible de créer la partie ({error})',
      'setup.errorJoinCode': 'Le code fait 4 lettres, vérifie avec ton ami.',
      'setup.errorJoinRoom': 'Impossible de rejoindre : {error}',
      'profileBar.maxRank': 'Rang maximum atteint !',
      'profileBar.progress': '{wins} / {target} victoires pour le palier suivant',
      'shop.tag': 'Boutique', 'shop.title': 'Ta collection', 'shop.diamondsPrefix': '💎',
      'shop.diamondsSuffix': 'diamants — gagne-en 5 à chaque match joué.',
      'shop.tabBalls': 'Ballons', 'shop.tabKeepers': 'Gardiens',
      'shop.styleHint': 'Le "style" est juste cosmétique : ça ne change rien aux arrêts ni aux tirs.',
      'shop.backButton': 'Retour au jeu', 'shop.free': 'Gratuit', 'shop.styleLabel': ' · style +{n}%',
      'shop.chosen': 'Choisi', 'shop.choose': 'Choisir', 'shop.buy': 'Acheter',
      'waiting.label': 'Ton code de partie', 'waiting.copyButton': 'Copier le lien',
      'waiting.qrLabel': 'Ou fais scanner ce code par ton ami :',
      'waiting.status': 'En attente de ton adversaire…', 'waiting.backButton': '⬅ Retour',
      'pitch.firstTo': 'Premier à', 'pitch.tenGoals': '10 buts', 'pitch.winsMatch': 'remporte le match',
      'mode.pillRanked': 'CLASSÉE', 'scoreboard.player1': 'Joueur 1', 'scoreboard.player2': 'Joueur 2',
      'pitch.hintAimShoot': 'Clique dans la cage pour viser ton tir', 'pitch.confirmShoot': 'Valider le tir',
      'pitch.hintAimKeep': 'Clique où le gardien doit plonger', 'pitch.confirmKeep': 'Valider le plongeon',
      'pitch.turnTitleShoot': 'AU TIR', 'pitch.waitingShootText': '{name} vise… attends ton tour.',
      'pitch.hintWaitingShoot': "L'adversaire vise son tir",
      'pitch.turnTitleKeep': 'DANS LES CAGES', 'pitch.waitingKeepText': '{name} choisit où plonger.',
      'pitch.hintWaitingKeep': 'Le gardien réfléchit à son plongeon',
      'pitch.resultSave': 'ARRÊT !', 'pitch.resultGoal': 'BUT !',
      'pitch.hintResultSave': 'Le gardien a plongé au bon endroit', 'pitch.hintResultGoal': 'Le tireur a trompé le gardien',
      'pitch.errorPrefix': 'Erreur : {error}',
      'gameover.victory': 'VICTOIRE !', 'gameover.defeat': 'DÉFAITE', 'gameover.replayButton': 'Rejouer (nouvelle partie)',
      'gameover.promotedBanner': '🎉 Tu passes {emoji} {name} !',
      'gameover.winRecordedBanner': 'Victoire enregistrée pour ton rang ({emoji} {name}).',
      'gameover.demotedBanner': '📉 Tu redescends {emoji} {name}.',
      'gameover.lossRecordedBanner': 'Défaite classée : -2 victoires ({emoji} {name}).',
    },
    en: {
      'start.tag': 'WORLD CUP 2026', 'start.title': 'Penalty Shootout', 'start.sub': 'Ready to challenge your friend?', 'start.button': 'Start',
      'profile.tag': 'Before you start', 'profile.title': 'Your profile', 'profile.sub': 'Create a profile to track your rank, or play without an account.',
      'profile.tabNew': 'Create a profile', 'profile.tabLogin': 'Log in', 'profile.chooseUsername': 'Choose a username',
      'profile.usernamePlaceholder': 'Your username', 'profile.username': 'Username', 'profile.secretCode': 'Secret code',
      'profile.loginButton': 'Log in', 'profile.createButton': 'Create my profile', 'profile.skipButton': 'Continue without an account',
      'profile.errorChooseUsername': 'Choose a username.', 'profile.errorLoginFields': 'Username and secret code required.',
      'profileCode.label': 'Your secret code',
      'profileCode.rule': "Write this code down somewhere (or take a screenshot)! You'll need it to find your profile and rank on another computer.",
      'profileCode.continue': "I've saved my code, continue",
      'setup.tag': 'Penalty shootout session', 'setup.title': 'Head to head', 'setup.sub': 'Two players, two computers. First to 10 goals wins.',
      'setup.change': 'change', 'setup.shopButton': '🛒 Ball shop', 'setup.tabCreate': 'Create a match', 'setup.tabJoin': 'Join a match',
      'setup.yourName': 'Your name', 'setup.yourNamePlaceholder': 'Your name', 'setup.modeLabel': 'Match mode',
      'setup.modeCasual': 'Casual', 'setup.modeRanked': 'Ranked',
      'setup.modeHintCasual': "Friendly: your rank doesn't move.",
      'setup.modeHintRanked': 'Ranked: win = +1 toward the next tier, loss = -2.',
      'setup.createRule': "You'll get a 4-letter code. Send it to your friend (by text, call...) so they can join your match from their computer.",
      'setup.createButton': 'Create the match', 'setup.matchCode': 'Match code', 'setup.joinButton': 'Join the match',
      'setup.errorCreateRoom': "Oops, couldn't create the match ({error})",
      'setup.errorJoinCode': 'The code is 4 letters, check with your friend.',
      'setup.errorJoinRoom': "Couldn't join: {error}",
      'profileBar.maxRank': 'Maximum rank reached!',
      'profileBar.progress': '{wins} / {target} wins for the next tier',
      'shop.tag': 'Shop', 'shop.title': 'Your collection', 'shop.diamondsPrefix': '💎',
      'shop.diamondsSuffix': 'diamonds — earn 5 per match played.',
      'shop.tabBalls': 'Balls', 'shop.tabKeepers': 'Goalkeepers',
      'shop.styleHint': '"Style" is just cosmetic: it changes nothing about saves or shots.',
      'shop.backButton': 'Back to the game', 'shop.free': 'Free', 'shop.styleLabel': ' · style +{n}%',
      'shop.chosen': 'Selected', 'shop.choose': 'Select', 'shop.buy': 'Buy',
      'waiting.label': 'Your match code', 'waiting.copyButton': 'Copy link',
      'waiting.qrLabel': 'Or have your friend scan this code:',
      'waiting.status': 'Waiting for your opponent…', 'waiting.backButton': '⬅ Back',
      'pitch.firstTo': 'First to', 'pitch.tenGoals': '10 goals', 'pitch.winsMatch': 'wins the match',
      'mode.pillRanked': 'RANKED', 'scoreboard.player1': 'Player 1', 'scoreboard.player2': 'Player 2',
      'pitch.hintAimShoot': 'Click in the goal to aim your shot', 'pitch.confirmShoot': 'Confirm shot',
      'pitch.hintAimKeep': 'Click where the keeper should dive', 'pitch.confirmKeep': 'Confirm dive',
      'pitch.turnTitleShoot': 'SHOOTING', 'pitch.waitingShootText': '{name} is aiming… wait for your turn.',
      'pitch.hintWaitingShoot': 'Your opponent is aiming their shot',
      'pitch.turnTitleKeep': 'IN GOAL', 'pitch.waitingKeepText': '{name} is choosing where to dive.',
      'pitch.hintWaitingKeep': 'The keeper is thinking about their dive',
      'pitch.resultSave': 'SAVE!', 'pitch.resultGoal': 'GOAL!',
      'pitch.hintResultSave': 'The keeper dove the right way', 'pitch.hintResultGoal': 'The shooter fooled the keeper',
      'pitch.errorPrefix': 'Error: {error}',
      'gameover.victory': 'VICTORY!', 'gameover.defeat': 'DEFEAT', 'gameover.replayButton': 'Play again (new match)',
      'gameover.promotedBanner': '🎉 You reach {emoji} {name}!',
      'gameover.winRecordedBanner': 'Win recorded for your rank ({emoji} {name}).',
      'gameover.demotedBanner': '📉 You drop to {emoji} {name}.',
      'gameover.lossRecordedBanner': 'Ranked loss: -2 wins ({emoji} {name}).',
    },
  };

  const SERVER_ERROR_TRANSLATIONS = {
    'ce pseudo est déjà pris': 'This username is already taken',
    'pseudo ou code secret incorrect': 'Incorrect username or secret code',
    'pseudo manquant': 'Missing username',
    'partie introuvable': 'Match not found',
    'cette partie est déjà complète': 'This match is already full',
    "ce n'est pas la phase de tir": "It's not the shooting phase",
    "ce n'est pas ton tour de tirer": "It's not your turn to shoot",
    "ce n'est pas la phase de plongeon": "It's not the diving phase",
    "ce n'est pas ton tour de plonger": "It's not your turn to dive",
    'position invalide': 'Invalid position',
    'code manquant': 'Missing code',
    'action inconnue': 'Unknown action',
    'méthode non supportée': 'Method not supported',
    'erreur serveur': 'Server error',
    'objet inconnu': 'Unknown item',
    'profil introuvable': 'Profile not found',
    'déjà possédé': 'Already owned',
    'pas assez de diamants': 'Not enough diamonds',
    "cet objet n'est pas possédé": "You don't own this item",
    'erreur réseau': 'Network error',
  };

  let currentLang = localStorage.getItem('pw_lang') || 'fr';

  function t(key, vars) {
    let str = (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) || TRANSLATIONS.fr[key] || key;
    if (vars) {
      Object.keys(vars).forEach((k) => { str = str.replace('{' + k + '}', vars[k]); });
    }
    return str;
  }

  function te(serverMessage) {
    if (currentLang === 'fr') return serverMessage;
    return SERVER_ERROR_TRANSLATIONS[serverMessage] || serverMessage;
  }

  const RANK_NAME_MAP = [
    ['Non classé', 'Unranked'], ['Unreal Legend', 'Unreal Legend'], ['Unreal', 'Unreal'],
    ['Bronze', 'Bronze'], ['Argent', 'Silver'], ['Platine', 'Platinum'], ['Diamant', 'Diamond'],
    ['Élite', 'Elite'], ['Champion', 'Champion'], ['Or', 'Gold'],
  ];
  function tItemName(name) {
    if (currentLang !== 'en') return name;
    return name.replace(/^Ballon/, 'Ball');
  }

  function tr(rankName) {
    if (currentLang !== 'en' || !rankName) return rankName;
    for (const [fr, en] of RANK_NAME_MAP) {
      if (rankName === fr) return en;
      if (rankName.indexOf(fr + ' ') === 0) return en + rankName.slice(fr.length);
    }
    return rankName;
  }

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    document.documentElement.lang = currentLang;
    // Re-rendu des morceaux dynamiques déjà affichés (pas gérés par data-i18n)
    renderProfileBar();
    if (screens.shop.classList.contains('active')) renderShop();
  }

  function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('pw_lang', lang);
    document.getElementById('lang-btn-fr').classList.toggle('active', lang === 'fr');
    document.getElementById('lang-btn-en').classList.toggle('active', lang === 'en');
    applyTranslations();
  }
  document.getElementById('lang-btn-fr').addEventListener('click', () => setLanguage('fr'));
  document.getElementById('lang-btn-en').addEventListener('click', () => setLanguage('en'));

  // ---------- Écran de démarrage ----------
  document.getElementById('btn-start-enter').addEventListener('click', () => {
    document.getElementById('start-overlay').classList.add('hidden');
  });

  function showScreen(key) {
    Object.values(screens).forEach((s) => s.classList.remove('active'));
    if (NO_GAME_WRAP_SCREENS.includes(key)) {
      gameWrap.style.display = 'none';
    } else {
      gameWrap.style.display = 'block';
    }
    screens[key].classList.add('active');
  }

  // ---------- Onglets Créer / Rejoindre ----------
  const tabBtnCreate = document.getElementById('tab-btn-create');
  const tabBtnJoin = document.getElementById('tab-btn-join');
  const tabCreate = document.getElementById('tab-create');
  const tabJoin = document.getElementById('tab-join');

  function activateTab(which) {
    tabBtnCreate.classList.toggle('active', which === 'create');
    tabBtnJoin.classList.toggle('active', which === 'join');
    tabCreate.classList.toggle('active', which === 'create');
    tabJoin.classList.toggle('active', which === 'join');
  }
  tabBtnCreate.addEventListener('click', () => activateTab('create'));
  tabBtnJoin.addEventListener('click', () => activateTab('join'));

  // Si on arrive via un lien "?code=ABCD", on prépare l'onglet "Rejoindre"
  const urlCode = new URLSearchParams(location.search).get('code');
  if (urlCode) {
    activateTab('join');
    document.getElementById('join-code').value = urlCode.toUpperCase();
  }

  // ---------- Profil joueur (pseudo + code secret, pas de mot de passe) ----------
  let currentProfile = null; // { username, rankName, wins, winsToPromote, totalWins, maxRank }
  let currentProfileSecret = null;

  async function profileApi(action, extra) {
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'erreur réseau');
    return data;
  }

  function renderProfileBar() {
    updateHud();
    const bar = document.getElementById('profile-bar');
    const createNameField = document.getElementById('create-name-field');
    const joinNameField = document.getElementById('join-name-field');
    const modeField = document.getElementById('mode-field');
    if (!currentProfile) {
      bar.style.display = 'none';
      createNameField.style.display = '';
      joinNameField.style.display = '';
      modeField.style.display = 'none';
      selectedMode = 'classic';
      setModeButtons('classic');
      return;
    }
    bar.style.display = 'block';
    createNameField.style.display = 'none';
    joinNameField.style.display = 'none';
    modeField.style.display = 'block';
    document.getElementById('profile-bar-name').textContent = currentProfile.username;
    document.getElementById('profile-bar-rank').textContent = currentProfile.rankEmoji + ' ' + tr(currentProfile.rankName);
    const fill = document.getElementById('profile-bar-progress-fill');
    const sub = document.getElementById('profile-bar-sub');
    if (currentProfile.maxRank) {
      fill.style.width = '100%';
      sub.textContent = t('profileBar.maxRank');
    } else {
      const pct = Math.min(100, (currentProfile.wins / currentProfile.winsToPromote) * 100);
      fill.style.width = pct + '%';
      sub.textContent = t('profileBar.progress', { wins: currentProfile.wins, target: currentProfile.winsToPromote });
    }
  }

  function proceedToSetup() {
    renderProfileBar();
    showScreen('setup');
  }

  // ---------- Bandeaux fixes en haut de l'écran (rang / diamants) ----------
  let currentRoomMode = null; // mode de la partie en cours, pour savoir si on affiche le rang
  function updateHud() {
    const diamondsBadge = document.getElementById('hud-diamonds-badge');
    const rankBadge = document.getElementById('hud-rank-badge');
    if (!currentProfile) {
      diamondsBadge.style.display = 'none';
      rankBadge.style.display = 'none';
      return;
    }
    diamondsBadge.style.display = 'block';
    document.getElementById('hud-diamonds-count').textContent = currentProfile.diamonds;

    if (currentRoomMode === 'ranked') {
      rankBadge.style.display = 'block';
      rankBadge.textContent = currentProfile.rankEmoji + ' ' + tr(currentProfile.rankName);
    } else {
      rankBadge.style.display = 'none';
    }
  }

  // ---------- Ballon et gardien : dessin selon le skin choisi ----------
  let shopCatalog = null; // { balls: {...}, keepers: {...} }
  async function loadShopCatalog() {
    if (shopCatalog) return shopCatalog;
    const res = await fetch('/api/store');
    shopCatalog = await res.json();
    return shopCatalog;
  }

  // ---------- Motifs de ballon : formes grandes et franches ----------
  // Le ballon est minuscule à l'écran : les détails fins deviennent flous.
  // On garde donc peu de formes, mais grandes, pour que ça se voit bien.
  function petalsPattern(colors, count) {
    let s = '';
    const step = 360 / count;
    for (let i = 0; i < count; i++) {
      s += '<path d="M50,50 Q73,36 90,50 Q73,64 50,50 Z" fill="' + colors[i % colors.length] + '" transform="rotate(' + (i * step) + ' 50 50)"/>';
    }
    s += '<circle cx="50" cy="50" r="9" fill="#12203E"/>';
    return s;
  }

  // Ballon classique noir/blanc à pentagones (Telstar/Etrusco/Telstar 18) :
  // pentagones dans colors[0], accents (nation) dans colors[1].
  function pentagonPattern(colors) {
    const dark = colors[0];
    const accent = colors[1];
    return (
      '<g fill="' + dark + '">' +
      '<polygon points="50,32 66,44 60,63 40,63 34,44"/>' +
      '</g>' +
      '<g fill="none" stroke="' + dark + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">' +
      '<path d="M50,32 L50,5"/><path d="M66,44 L91,36"/><path d="M60,63 L77,85"/>' +
      '<path d="M40,63 L23,85"/><path d="M34,44 L9,36"/></g>' +
      '<g fill="' + accent + '">' +
      '<polygon points="50,4 58,11 47,14"/>' +
      '<polygon points="92,35 96,44 85,42"/>' +
      '<polygon points="76,86 80,95 68,92"/>' +
      '<polygon points="24,86 20,95 32,92"/>' +
      '<polygon points="8,35 4,44 15,42"/></g>'
    );
  }

  // Teamgeist : tourbillon central à 4 grandes pales.
  function teamgeistPattern(colors) {
    const dark = colors[0];
    return (
      '<path d="M50,50 C30,42 26,18 44,4 C40,24 40,42 50,50 Z" fill="' + dark + '"/>' +
      '<path d="M50,50 C70,58 74,82 56,96 C60,76 60,58 50,50 Z" fill="' + dark + '"/>' +
      '<path d="M50,50 C58,30 82,26 96,44 C76,40 58,40 50,50 Z" fill="' + dark + '"/>' +
      '<path d="M50,50 C42,70 18,74 4,56 C24,60 42,60 50,50 Z" fill="' + dark + '"/>' +
      '<circle cx="50" cy="50" r="7" fill="' + colors[1] + '"/>'
    );
  }

  // Al Rihla : grande vague colorée qui traverse le ballon (fond clair).
  function wavePattern(colors) {
    return (
      '<path d="M6,64 C30,30 40,86 70,50" stroke="' + colors[1] + '" stroke-width="16" fill="none" stroke-linecap="round"/>' +
      '<path d="M40,60 C55,78 70,22 96,38" stroke="' + colors[2] + '" stroke-width="16" fill="none" stroke-linecap="round"/>'
    );
  }

  // Tricolore : pentagones sur fond blanc, avec des triangles bleu/rouge
  // qui alternent à chaque pointe (comme le vrai ballon de 1998).
  function tricolorePattern(colors) {
    return (
      '<g fill="none" stroke="#cfd6e4" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">' +
      '<polygon points="50,32 66,44 60,63 40,63 34,44"/>' +
      '<path d="M50,32 L50,5"/><path d="M66,44 L91,36"/><path d="M60,63 L77,85"/>' +
      '<path d="M40,63 L23,85"/><path d="M34,44 L9,36"/></g>' +
      '<polygon points="50,4 58,11 47,14" fill="' + colors[0] + '"/>' +
      '<polygon points="92,35 96,44 85,42" fill="' + colors[2] + '"/>' +
      '<polygon points="76,86 80,95 68,92" fill="' + colors[0] + '"/>' +
      '<polygon points="24,86 20,95 32,92" fill="' + colors[2] + '"/>' +
      '<polygon points="8,35 4,44 15,42" fill="' + colors[0] + '"/>' +
      '<circle cx="50" cy="50" r="10" fill="' + colors[0] + '" stroke="' + colors[2] + '" stroke-width="3"/>'
    );
  }

  // Questra : ballon presque blanc avec un grand anneau + une étoile bleue.
  function starPattern(colors) {
    return (
      '<circle cx="50" cy="50" r="31" fill="none" stroke="' + colors[0] + '" stroke-width="3"/>' +
      '<polygon points="50,21 59,42 82,42 63,56 70,78 50,64 30,78 37,56 18,42 41,42" fill="' + colors[0] + '"/>'
    );
  }

  function ballPatternMarkup(pattern, colors) {
    switch (pattern) {
      case 'pentagon': return pentagonPattern(colors);
      case 'teamgeist': return teamgeistPattern(colors);
      case 'wave': return wavePattern(colors);
      case 'tricolore': return tricolorePattern(colors);
      case 'star': return starPattern(colors);
      case 'petals2': return petalsPattern(colors, 2);
      case 'petals4': return petalsPattern(colors, 4);
      case 'petals5': return petalsPattern(colors, 5);
      case 'petals6': return petalsPattern(colors, 6);
      case 'petals3':
      default: return petalsPattern(colors, 3);
    }
  }

  function ballMiniSvg(ball) {
    return '<svg viewBox="0 0 100 100">' +
      '<circle cx="50" cy="50" r="47" fill="#eef1f4"/>' +
      ballPatternMarkup(ball.pattern, ball.colors) +
      '</svg>';
  }

  // ---------- Gardien : silhouette avec les bras levés, mains au-dessus de la tête ----------
  function keeperMiniSvg(jersey, gloves) {
    return '<svg viewBox="0 0 40 74">' +
      '<path d="M12,29 C6,24 3,14 3,6" stroke="' + gloves + '" stroke-width="5" stroke-linecap="round" fill="none"/>' +
      '<path d="M28,29 C34,24 37,14 37,6" stroke="' + gloves + '" stroke-width="5" stroke-linecap="round" fill="none"/>' +
      '<circle cx="3" cy="5" r="4.2" fill="' + gloves + '"/>' +
      '<circle cx="37" cy="5" r="4.2" fill="' + gloves + '"/>' +
      '<rect x="9" y="26" width="22" height="26" rx="9" fill="' + jersey + '"/>' +
      '<circle cx="20" cy="16" r="7" fill="#E8B48C"/>' +
      '</svg>';
  }

  function applyKeeperColors(jersey, gloves) {
    document.querySelectorAll('#keeper .keeper-jersey').forEach((el) => el.setAttribute('fill', jersey));
    document.querySelectorAll('#keeper .keeper-glove').forEach((el) => el.setAttribute('stroke', gloves));
    document.querySelectorAll('#keeper .keeper-hand').forEach((el) => el.setAttribute('fill', gloves));
  }

  async function applyBallSkinForState(state) {
    const catalog = await loadShopCatalog();
    const skinId = (state.balls && state.balls[state.shooterIdx]) || 'classique';
    const skin = catalog.balls[skinId] || catalog.balls.classique;
    document.getElementById('ball-pattern').innerHTML = ballPatternMarkup(skin.pattern, skin.colors);
  }

  async function applyKeeperSkinForState(state) {
    const catalog = await loadShopCatalog();
    const keeperIdx = state.shooterIdx === 0 ? 1 : 0;
    const skinId = (state.keepers && state.keepers[keeperIdx]) || 'classique';
    const skin = catalog.keepers[skinId] || catalog.keepers.classique;
    applyKeeperColors(skin.jersey, skin.gloves);
  }

  // ---------- Boutique ----------
  document.getElementById('btn-open-shop').addEventListener('click', async () => {
    await renderShop();
    showScreen('shop');
  });
  document.getElementById('btn-shop-back').addEventListener('click', () => {
    showScreen('setup');
  });

  const shoptabBtnBalls = document.getElementById('shoptab-btn-balls');
  const shoptabBtnKeepers = document.getElementById('shoptab-btn-keepers');
  const shoptabBalls = document.getElementById('shoptab-balls');
  const shoptabKeepers = document.getElementById('shoptab-keepers');
  shoptabBtnBalls.addEventListener('click', () => activateShopTab('balls'));
  shoptabBtnKeepers.addEventListener('click', () => activateShopTab('keepers'));
  function activateShopTab(which) {
    shoptabBtnBalls.classList.toggle('active', which === 'balls');
    shoptabBtnKeepers.classList.toggle('active', which === 'keepers');
    shoptabBalls.classList.toggle('active', which === 'balls');
    shoptabKeepers.classList.toggle('active', which === 'keepers');
  }

  async function renderShop() {
    if (!currentProfile) return;
    const catalog = await loadShopCatalog();
    document.getElementById('shop-diamonds').textContent = currentProfile.diamonds;

    renderShopList(document.getElementById('shop-list-balls'), catalog.balls, 'ball',
      currentProfile.ownedBalls, currentProfile.selectedBall,
      (ball) => ballMiniSvg(ball),
      (ball) => (ball.price === 0 ? t('shop.free') : '💎 ' + ball.price));

    renderShopList(document.getElementById('shop-list-keepers'), catalog.keepers, 'keeper',
      currentProfile.ownedKeepers, currentProfile.selectedKeeper,
      (k) => keeperMiniSvg(k.jersey, k.gloves),
      (k) => (k.price === 0 ? t('shop.free') : '💎 ' + k.price) + t('shop.styleLabel', { n: k.style.toFixed(1) }));
  }

  function renderShopList(list, catalog, kind, owned, selectedId, previewFn, priceLabelFn) {
    list.innerHTML = '';
    Object.keys(catalog).forEach((id) => {
      const entry = catalog[id];
      const isOwned = owned.includes(id);
      const isSelected = selectedId === id;
      const item = document.createElement('div');
      item.className = 'shop-item' + (isSelected ? ' selected' : '');
      item.innerHTML =
        '<div class="shop-item-ball">' + previewFn(entry) + '</div>' +
        '<div class="shop-item-info">' +
        '<div class="shop-item-name">' + tItemName(entry.name) + '</div>' +
        '<div class="shop-item-price">' + priceLabelFn(entry) + '</div>' +
        '</div>';
      const btn = document.createElement('button');
      btn.type = 'button';
      if (isSelected) {
        btn.className = 'shop-item-btn selected';
        btn.textContent = t('shop.chosen');
        btn.disabled = true;
      } else if (isOwned) {
        btn.className = 'shop-item-btn select';
        btn.textContent = t('shop.choose');
        btn.addEventListener('click', () => shopAction('select', kind, id));
      } else {
        btn.className = 'shop-item-btn buy';
        btn.textContent = t('shop.buy');
        btn.disabled = currentProfile.diamonds < entry.price;
        btn.addEventListener('click', () => shopAction('buy', kind, id));
      }
      item.appendChild(btn);
      list.appendChild(item);
    });
  }

  async function shopAction(action, kind, itemId) {
    try {
      const res = await fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, kind, itemId, username: currentProfile.username, secretCode: currentProfileSecret }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'erreur réseau');
      currentProfile = data.profile;
      renderProfileBar();
      await renderShop();
    } catch (e) {
      alert(te(e.message));
    }
  }

  // ---------- Mode de partie : classique ou classée ----------
  let selectedMode = 'classic';
  const modeBtnClassic = document.getElementById('mode-btn-classic');
  const modeBtnRanked = document.getElementById('mode-btn-ranked');
  const modeHint = document.getElementById('mode-hint');
  function setModeButtons(mode) {
    selectedMode = mode;
    modeBtnClassic.classList.toggle('active', mode === 'classic');
    modeBtnRanked.classList.toggle('active', mode === 'ranked');
    modeHint.textContent = mode === 'ranked' ? t('setup.modeHintRanked') : t('setup.modeHintCasual');
  }
  modeBtnClassic.addEventListener('click', () => setModeButtons('classic'));
  modeBtnRanked.addEventListener('click', () => setModeButtons('ranked'));

  // Onglets Créer un profil / Se connecter
  const ptabBtnNew = document.getElementById('ptab-btn-new');
  const ptabBtnLogin = document.getElementById('ptab-btn-login');
  const ptabNew = document.getElementById('ptab-new');
  const ptabLogin = document.getElementById('ptab-login');
  function activateProfileTab(which) {
    ptabBtnNew.classList.toggle('active', which === 'new');
    ptabBtnLogin.classList.toggle('active', which === 'login');
    ptabNew.classList.toggle('active', which === 'new');
    ptabLogin.classList.toggle('active', which === 'login');
  }
  ptabBtnNew.addEventListener('click', () => activateProfileTab('new'));
  ptabBtnLogin.addEventListener('click', () => activateProfileTab('login'));

  document.getElementById('btn-profile-create').addEventListener('click', async () => {
    const errorEl = document.getElementById('profile-new-error');
    errorEl.textContent = '';
    const username = document.getElementById('profile-new-username').value.trim();
    if (!username) { errorEl.textContent = t('profile.errorChooseUsername'); return; }
    try {
      const data = await profileApi('signup', { username });
      currentProfile = data.profile;
      currentProfileSecret = data.secretCode;
      localStorage.setItem('pw_profile_username', data.username);
      localStorage.setItem('pw_profile_secret', data.secretCode);
      document.getElementById('profile-secret-display').textContent = data.secretCode;
      showScreen('profileCode');
    } catch (e) {
      errorEl.textContent = te(e.message);
    }
  });

  document.getElementById('btn-profile-code-continue').addEventListener('click', proceedToSetup);

  document.getElementById('btn-profile-login').addEventListener('click', async () => {
    const errorEl = document.getElementById('profile-login-error');
    errorEl.textContent = '';
    const username = document.getElementById('profile-login-username').value.trim();
    const secretCode = document.getElementById('profile-login-code').value.trim().toUpperCase();
    if (!username || !secretCode) { errorEl.textContent = t('profile.errorLoginFields'); return; }
    try {
      const data = await profileApi('login', { username, secretCode });
      currentProfile = data.profile;
      currentProfileSecret = secretCode;
      localStorage.setItem('pw_profile_username', data.username);
      localStorage.setItem('pw_profile_secret', secretCode);
      proceedToSetup();
    } catch (e) {
      errorEl.textContent = te(e.message);
    }
  });

  document.getElementById('btn-profile-skip').addEventListener('click', () => {
    currentProfile = null;
    proceedToSetup();
  });

  document.getElementById('btn-profile-logout').addEventListener('click', () => {
    localStorage.removeItem('pw_profile_username');
    localStorage.removeItem('pw_profile_secret');
    currentProfile = null;
    currentProfileSecret = null;
    currentRoomMode = null;
    updateHud();
    activateProfileTab('new');
    showScreen('profile');
  });

  // Reprise automatique du profil si on l'a déjà sur cet ordinateur
  (async function tryResumeProfile() {
    const savedUsername = localStorage.getItem('pw_profile_username');
    const savedSecret = localStorage.getItem('pw_profile_secret');
    if (!savedUsername || !savedSecret) return;
    try {
      const data = await profileApi('login', { username: savedUsername, secretCode: savedSecret });
      currentProfile = data.profile;
      currentProfileSecret = savedSecret;
      // Si une partie est en cours (page rechargée en plein match), on ne
      // touche pas à l'écran affiché — seule la reprise de partie décide.
      if (sessionStorage.getItem('pw_code')) {
        renderProfileBar();
      } else {
        proceedToSetup();
      }
    } catch (e) {
      localStorage.removeItem('pw_profile_username');
      localStorage.removeItem('pw_profile_secret');
    }
  })();

  // ---------- Appel au serveur (fonctions dans /api) ----------
  async function api(action, extra) {
    const res = await fetch('/api/room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, code: roomCode, role: myRole, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'erreur réseau');
    return data;
  }

  async function fetchState() {
    const res = await fetch(`/api/room?code=${encodeURIComponent(roomCode)}&role=${encodeURIComponent(myRole)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'erreur réseau');
    return data;
  }

  // ---------- QR code du lien de partie (bibliothèque chargée dans le HTML) ----------
  function renderWaitingQrCode(link) {
    const container = document.getElementById('waiting-qr');
    container.innerHTML = '';
    if (window.QRCode) {
      new QRCode(container, { text: link, width: 176, height: 176, colorDark: '#050D1C', colorLight: '#ffffff' });
    }
  }

  // ---------- Créer une partie ----------
  const btnCreate = document.getElementById('btn-create');
  const createError = document.getElementById('create-error');

  async function createRoom() {
    createError.textContent = '';
    const name = currentProfile ? currentProfile.username : (document.getElementById('create-name').value.trim() || t('scoreboard.player1'));
    btnCreate.disabled = true;
    try {
      const data = await api('create', {
        name,
        profileUsername: currentProfile ? currentProfile.username : undefined,
        mode: currentProfile ? selectedMode : 'classic',
        ballSkin: currentProfile ? currentProfile.selectedBall : undefined,
        keeperSkin: currentProfile ? currentProfile.selectedKeeper : undefined,
      });
      roomCode = data.code;
      myRole = data.role;
      currentRoomMode = data.state.mode;
      updateHud();
      sessionStorage.setItem('pw_code', roomCode);
      sessionStorage.setItem('pw_role', myRole);
      document.getElementById('waiting-code').textContent = roomCode;
      const joinLink = location.origin + location.pathname + '?code=' + roomCode;
      document.getElementById('waiting-link').value = joinLink;
      renderWaitingQrCode(joinLink);
      showScreen('waiting');
      startPolling();
    } catch (e) {
      createError.textContent = t('setup.errorCreateRoom', { error: te(e.message) });
    }
    btnCreate.disabled = false;
  }
  btnCreate.addEventListener('click', createRoom);

  document.getElementById('btn-copy-link').addEventListener('click', () => {
    const input = document.getElementById('waiting-link');
    input.select();
    navigator.clipboard && navigator.clipboard.writeText(input.value).catch(() => {});
  });

  // ---------- Rejoindre une partie ----------
  const btnJoin = document.getElementById('btn-join');
  const joinError = document.getElementById('join-error');
  btnJoin.addEventListener('click', async () => {
    joinError.textContent = '';
    const name = currentProfile ? currentProfile.username : (document.getElementById('join-name').value.trim() || t('scoreboard.player2'));
    const code = document.getElementById('join-code').value.trim().toUpperCase();
    if (code.length !== 4) {
      joinError.textContent = t('setup.errorJoinCode');
      return;
    }
    btnJoin.disabled = true;
    try {
      const data = await api('join', {
        code, name,
        profileUsername: currentProfile ? currentProfile.username : undefined,
        ballSkin: currentProfile ? currentProfile.selectedBall : undefined,
        keeperSkin: currentProfile ? currentProfile.selectedKeeper : undefined,
      });
      roomCode = code;
      myRole = data.role;
      currentRoomMode = data.state.mode;
      updateHud();
      sessionStorage.setItem('pw_code', roomCode);
      sessionStorage.setItem('pw_role', myRole);
      startPolling();
    } catch (e) {
      joinError.textContent = t('setup.errorJoinRoom', { error: te(e.message) });
    }
    btnJoin.disabled = false;
  });

  // ---------- Reprise automatique si la page est rechargée ----------
  (function tryResume() {
    const savedCode = sessionStorage.getItem('pw_code');
    const savedRole = sessionStorage.getItem('pw_role');
    if (savedCode && savedRole) {
      roomCode = savedCode;
      myRole = savedRole;
      startPolling();
    }
  })();

  // ---------- Boucle de synchronisation ----------
  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    tick();
    pollTimer = setInterval(tick, POLL_MS);
  }

  async function tick() {
    try {
      const data = await fetchState();
      applyState(data.state);
    } catch (e) {
      // Partie introuvable (expirée) : on revient à l'écran de départ.
      clearInterval(pollTimer);
      sessionStorage.removeItem('pw_code');
      sessionStorage.removeItem('pw_role');
      showScreen('setup');
    }
  }

  // ---------- Éléments du terrain ----------
  const aimArea = document.getElementById('aim-area');
  const btnConfirm = document.getElementById('btn-confirm');
  const pitchHint = document.getElementById('pitch-hint');
  const ball = document.getElementById('ball');
  const keeper = document.getElementById('keeper');
  const resultBanner = document.getElementById('result-banner');
  const markerShot = document.getElementById('marker-shot');
  const reachCircle = document.getElementById('reach-circle');
  const turnOverlay = document.getElementById('turn-overlay');
  const turnOverlayTitle = document.getElementById('turn-overlay-title');
  const turnOverlayText = document.getElementById('turn-overlay-text');

  let currentMode = null; // 'shoot' | 'keep' | null

  function keeperPitchPos(pct) {
    const cx = GOAL.left + (pct.x / 100) * GOAL.width;
    const cyFeet = GOAL.top + (pct.y / 100) * GOAL.height;
    return { x: cx, y: cyFeet - KEEPER_H_PCT * 0.42 };
  }

  function resetPitchVisuals() {
    ball.style.transition = 'none';
    ball.style.left = BALL_START.x + '%';
    ball.style.top = BALL_START.y + '%';
    ball.style.transform = 'translate(-50%,-50%)';
    requestAnimationFrame(() => { ball.style.transition = ''; });

    keeper.style.transition = 'none';
    const startPos = keeperPitchPos(KEEPER_START_PCT);
    keeper.style.left = startPos.x + '%';
    keeper.style.top = startPos.y + '%';
    keeper.style.transform = 'translate(-50%,-50%) rotate(0deg)';
    requestAnimationFrame(() => { keeper.style.transition = ''; });

    resultBanner.classList.remove('show', 'goal', 'save');
    markerShot.style.display = 'none';
    reachCircle.style.display = 'none';
    document.querySelectorAll('.confetti').forEach((c) => c.remove());
  }

  function pctFromEvent(evt) {
    const rect = aimArea.getBoundingClientRect();
    let x = ((evt.clientX - rect.left) / rect.width) * 100;
    let y = ((evt.clientY - rect.top) / rect.height) * 100;
    x = Math.max(2, Math.min(98, x));
    y = Math.max(2, Math.min(98, y));
    return { x, y };
  }

  aimArea.addEventListener('click', (evt) => {
    // evt.detail === 0 : clic "fantôme" (déclenché au clavier via Entrée/Espace
    // sur un bouton qui a le focus), sans vraie position de souris. On l'ignore
    // sinon ça vise un point au hasard.
    if (!currentMode || evt.detail === 0) return;
    pendingPct = pctFromEvent(evt);
    btnConfirm.disabled = false;
    if (currentMode === 'shoot') {
      markerShot.style.display = 'block';
      markerShot.style.left = pendingPct.x + '%';
      markerShot.style.top = pendingPct.y + '%';
    } else {
      reachCircle.style.display = 'block';
      reachCircle.style.left = pendingPct.x + '%';
      reachCircle.style.top = pendingPct.y + '%';
    }
  });

  btnConfirm.addEventListener('click', async (evt) => {
    if (!pendingPct || !currentMode || evt.detail === 0) return;
    btnConfirm.disabled = true;
    aimArea.disabled = true;
    btnConfirm.blur();
    try {
      const data = await api(currentMode, { pos: pendingPct });
      pendingPct = null;
      applyState(data.state);
    } catch (e) {
      pitchHint.textContent = t('pitch.errorPrefix', { error: te(e.message) });
      aimArea.disabled = false;
    }
  });

  function updateScoreboard(state) {
    document.getElementById('score-p1-name').textContent = state.players[0] || t('scoreboard.player1');
    document.getElementById('score-p2-name').textContent = state.players[1] || t('scoreboard.player2');
    document.getElementById('score-p1-num').textContent = state.scores[0];
    document.getElementById('score-p2-num').textContent = state.scores[1];
    document.getElementById('score-p1').classList.toggle('active', state.shooterIdx === 0);
    document.getElementById('score-p2').classList.toggle('active', state.shooterIdx === 1);
    const pill = document.getElementById('mode-pill');
    if (state.mode === 'ranked') {
      pill.style.display = 'inline-block';
      pill.textContent = t('mode.pillRanked');
    } else {
      pill.style.display = 'none';
    }
  }

  function spawnConfetti() {
    const colors = ['var(--gold)', 'var(--red)', 'var(--blue)', 'var(--chalk)'];
    const pitchEl = document.getElementById('pitch');
    for (let i = 0; i < 18; i++) {
      const el = document.createElement('div');
      el.className = 'confetti';
      el.style.left = (10 + Math.random() * 80) + '%';
      el.style.top = '6%';
      el.style.background = colors[i % colors.length];
      el.style.animationDelay = (Math.random() * 0.2) + 's';
      pitchEl.appendChild(el);
      setTimeout(() => el.remove(), 1500);
    }
  }

  function toPitchCoords(pct) {
    return {
      x: GOAL.left + (pct.x / 100) * GOAL.width,
      y: GOAL.top + (pct.y / 100) * GOAL.height,
    };
  }

  function playReveal(state) {
    const r = state.lastResult;
    aimArea.disabled = true;
    reachCircle.style.display = 'none';
    markerShot.style.display = 'none';
    btnConfirm.disabled = true;
    turnOverlay.style.display = 'none';
    pitchHint.textContent = '…';

    const shotPitch = toPitchCoords(r.shotPos);
    const keepPitch = keeperPitchPos(r.keepPos);

    requestAnimationFrame(() => {
      keeper.style.left = keepPitch.x + '%';
      keeper.style.top = keepPitch.y + '%';
      const dxSign = (r.keepPos.x - KEEPER_START_PCT.x);
      const tilt = Math.max(-38, Math.min(38, dxSign * 0.9));
      const stretch = r.keepPos.y < 40 ? 1.08 : 1;
      keeper.style.transform = 'translate(-50%,-50%) rotate(' + tilt + 'deg) scale(' + stretch + ')';

      const target = r.isSave
        ? { x: shotPitch.x + (keepPitch.x - shotPitch.x) * 0.22, y: shotPitch.y + (keepPitch.y - shotPitch.y) * 0.22 }
        : shotPitch;
      ball.style.left = target.x + '%';
      ball.style.top = target.y + '%';
      ball.style.transform = 'translate(-50%,-50%) scale(0.7) rotate(280deg)';
    });

    setTimeout(() => {
      resultBanner.textContent = r.isSave ? t('pitch.resultSave') : t('pitch.resultGoal');
      resultBanner.classList.add('show', r.isSave ? 'save' : 'goal');
      if (!r.isSave) spawnConfetti();
      updateScoreboard(state);
      pitchHint.textContent = r.isSave ? t('pitch.hintResultSave') : t('pitch.hintResultGoal');
    }, 560);
  }

  function renderPitchTurn(state) {
    const shooterRole = state.shooterIdx === 0 ? 'p1' : 'p2';
    const keeperRole = shooterRole === 'p1' ? 'p2' : 'p1';
    const shooterName = state.players[state.shooterIdx];
    const keeperName = state.players[state.shooterIdx === 0 ? 1 : 0];

    const iAmShooting = state.phase === 'shoot' && myRole === shooterRole;
    const iAmKeeping = state.phase === 'keep' && myRole === keeperRole;

    resultBanner.classList.remove('show', 'goal', 'save');

    if (iAmShooting) {
      currentMode = 'shoot';
      aimArea.disabled = false;
      turnOverlay.style.display = 'none';
      pitchHint.textContent = t('pitch.hintAimShoot');
      btnConfirm.textContent = t('pitch.confirmShoot');
      btnConfirm.disabled = !pendingPct;
    } else if (iAmKeeping) {
      currentMode = 'keep';
      aimArea.disabled = false;
      turnOverlay.style.display = 'none';
      pitchHint.textContent = t('pitch.hintAimKeep');
      btnConfirm.textContent = t('pitch.confirmKeep');
      btnConfirm.disabled = !pendingPct;
    } else {
      currentMode = null;
      aimArea.disabled = true;
      btnConfirm.disabled = true;
      pendingPct = null;
      turnOverlay.style.display = 'flex';
      if (state.phase === 'shoot') {
        turnOverlayTitle.textContent = t('pitch.turnTitleShoot');
        turnOverlayText.textContent = t('pitch.waitingShootText', { name: shooterName });
        pitchHint.textContent = t('pitch.hintWaitingShoot');
      } else {
        turnOverlayTitle.textContent = t('pitch.turnTitleKeep');
        turnOverlayText.textContent = t('pitch.waitingKeepText', { name: keeperName });
        pitchHint.textContent = t('pitch.hintWaitingKeep');
      }
    }
  }

  async function showGameOver(state) {
    const iWon = state.winner === (myRole === 'p1' ? 0 : 1);
    document.getElementById('gameover-role').textContent = iWon ? t('gameover.victory') : t('gameover.defeat');
    document.getElementById('winner-name').textContent = state.players[state.winner];
    document.getElementById('final-score').textContent = state.scores[0] + ' – ' + state.scores[1];

    const banner = document.getElementById('promotion-banner');
    banner.style.display = 'none';
    banner.classList.remove('demote');

    const promo = state.lastPromotion;
    const demo = state.lastDemotion;
    const myPromo = currentProfile && promo && promo.username === currentProfile.username ? promo : null;
    const myDemo = currentProfile && demo && demo.username === currentProfile.username ? demo : null;

    if (currentProfile) {
      // Toujours rafraîchir : les diamants montent à chaque match, même sans promotion/rétrogradation.
      try {
        const data = await profileApi('login', { username: currentProfile.username, secretCode: currentProfileSecret });
        currentProfile = data.profile;
        renderProfileBar();
      } catch (e) { /* on garde l'ancien affichage si le rafraîchissement échoue */ }

      if (myPromo || myDemo) {
        banner.style.display = 'block';
        if (myPromo) {
          banner.textContent = myPromo.promoted
            ? t('gameover.promotedBanner', { emoji: myPromo.rankEmoji, name: tr(myPromo.rankName) })
            : t('gameover.winRecordedBanner', { emoji: currentProfile.rankEmoji, name: tr(currentProfile.rankName) });
        } else {
          banner.classList.add('demote');
          banner.textContent = myDemo.demoted
            ? t('gameover.demotedBanner', { emoji: myDemo.rankEmoji, name: tr(myDemo.rankName) })
            : t('gameover.lossRecordedBanner', { emoji: currentProfile.rankEmoji, name: tr(currentProfile.rankName) });
        }
      }
    }

    showScreen('gameover');
  }

  let revealedVersion = null;
  function applyState(state) {
    if (state.version === lastVersion) return;
    lastVersion = state.version;

    if (state.mode && state.mode !== currentRoomMode) {
      currentRoomMode = state.mode;
      updateHud();
    }

    if (state.phase === 'waiting') {
      updateScoreboard(state);
      const joinLink = location.origin + location.pathname + '?code=' + roomCode;
      document.getElementById('waiting-code').textContent = roomCode;
      document.getElementById('waiting-link').value = joinLink;
      renderWaitingQrCode(joinLink);
      showScreen('waiting');
      return;
    }

    updateScoreboard(state);

    if (state.phase === 'gameover') {
      showGameOver(state);
      return;
    }

    showScreen('pitch');

    if (state.phase === 'reveal') {
      if (revealedVersion !== state.version) {
        revealedVersion = state.version;
        playReveal(state);
      }
      return;
    }

    // shoot / keep : nouveau round -> on remet le terrain à zéro visuellement
    resetPitchVisuals();
    applyBallSkinForState(state);
    applyKeeperSkinForState(state);
    renderPitchTurn(state);
  }

  // ---------- Rejouer ----------
  document.getElementById('btn-replay').addEventListener('click', () => {
    sessionStorage.removeItem('pw_code');
    sessionStorage.removeItem('pw_role');
    location.href = location.pathname;
  });

  // ---------- Bouton retour (écran d'attente) ----------
  document.getElementById('btn-waiting-back').addEventListener('click', () => {
    if (pollTimer) clearInterval(pollTimer);
    sessionStorage.removeItem('pw_code');
    sessionStorage.removeItem('pw_role');
    roomCode = null;
    myRole = null;
    currentRoomMode = null;
    updateHud();
    showScreen('setup');
  });

  // ---------- Initialisation de la langue ----------
  document.getElementById('lang-btn-fr').classList.toggle('active', currentLang === 'fr');
  document.getElementById('lang-btn-en').classList.toggle('active', currentLang === 'en');
  applyTranslations();
})();
