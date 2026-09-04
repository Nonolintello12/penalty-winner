(function () {
  'use strict';

  // ---------- Constantes de terrain (mêmes proportions que le CSS) ----------
  const GOAL = { left: 29, top: 9, width: 42, height: 21 };
  const BALL_START = { x: 50, y: 84 };
  const KEEPER_H_PCT = 18.6;
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
    document.getElementById('profile-bar-rank').textContent = currentProfile.rankEmoji + ' ' + currentProfile.rankName;
    const fill = document.getElementById('profile-bar-progress-fill');
    const sub = document.getElementById('profile-bar-sub');
    if (currentProfile.maxRank) {
      fill.style.width = '100%';
      sub.textContent = 'Rang maximum atteint !';
    } else {
      const pct = Math.min(100, (currentProfile.wins / currentProfile.winsToPromote) * 100);
      fill.style.width = pct + '%';
      sub.textContent = currentProfile.wins + ' / ' + currentProfile.winsToPromote + ' victoires pour le palier suivant';
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
      rankBadge.textContent = currentProfile.rankEmoji + ' ' + currentProfile.rankName;
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

  // ---------- Motifs de ballon : un dessin qui rappelle le vrai ballon ----------
  function petalsPattern(colors, count) {
    let s = '';
    const step = 360 / count;
    for (let i = 0; i < count; i++) {
      s += '<path d="M50,50 Q72,38 86,50 Q72,62 50,50 Z" fill="' + colors[i % colors.length] + '" transform="rotate(' + (i * step) + ' 50 50)"/>';
    }
    s += '<circle cx="50" cy="50" r="8.5" fill="#12203E"/>';
    return s;
  }

  // Ballon classique noir/blanc à pentagones (Telstar/Etrusco/Telstar 18) :
  // pentagones dans colors[0], petits accents (nation) dans colors[1].
  function pentagonPattern(colors) {
    const dark = colors[0];
    const accent = colors[1];
    return (
      '<g fill="' + dark + '">' +
      '<polygon points="50,36 63,46 58,61 42,61 37,46"/>' +
      '</g>' +
      '<g fill="none" stroke="' + dark + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">' +
      '<path d="M50,36 L50,7"/><path d="M63,46 L88,38"/><path d="M58,61 L74,82"/>' +
      '<path d="M42,61 L26,82"/><path d="M37,46 L12,38"/></g>' +
      '<g fill="' + dark + '">' +
      '<polygon points="50,7 57,13 54,20 46,20 43,13"/>' +
      '<polygon points="88,38 93,46 87,52 80,49 81,41"/>' +
      '<polygon points="74,82 68,89 59,86 60,78 68,75"/>' +
      '<polygon points="26,82 32,89 41,86 40,78 32,75"/>' +
      '<polygon points="12,38 7,46 13,52 20,49 19,41"/></g>' +
      '<g fill="' + accent + '">' +
      '<polygon points="50,11 53,16 47,16"/>' +
      '<polygon points="85,41 88,46 82,45"/>' +
      '<polygon points="69,79 72,84 66,83"/>' +
      '<polygon points="31,79 34,84 28,83"/>' +
      '<polygon points="15,41 18,46 12,45"/></g>'
    );
  }

  // Al Rihla : grande vague colorée sur fond clair.
  function wavePattern(colors) {
    return (
      '<path d="M3,68 C28,34 34,88 58,54" stroke="' + colors[1] + '" stroke-width="15" fill="none" stroke-linecap="round"/>' +
      '<path d="M46,58 C56,80 64,20 97,34" stroke="' + colors[2] + '" stroke-width="15" fill="none" stroke-linecap="round"/>'
    );
  }

  // Brazuca : bandes épaisses qui s'entrecroisent (look "tressé").
  function braidThickPattern(colors) {
    const bands = [
      ['M6,30 C35,15 45,85 88,72', colors[0]],
      ['M94,30 C65,15 55,85 12,72', colors[1]],
      ['M30,4 C15,35 85,65 70,96', colors[2]],
      ['M70,4 C85,35 15,65 30,96', colors[0]],
    ];
    return bands.map(function (b) {
      return '<path d="' + b[0] + '" stroke="' + b[1] + '" stroke-width="11" fill="none" stroke-linecap="round"/>';
    }).join('');
  }

  // Jabulani : plein de petits panneaux colorés tout autour (look "confetti").
  function confettiPattern(colors) {
    let s = '';
    const n = 8;
    for (let i = 0; i < n; i++) {
      s += '<path d="M50,50 L62,26 Q67,38 62,50 Z" fill="' + colors[i % colors.length] + '" transform="rotate(' + (i * (360 / n)) + ' 50 50)"/>';
    }
    return s;
  }

  // Teamgeist : tourbillon noir à 4 pales au centre.
  function teamgeistPattern(colors) {
    const dark = colors[0];
    return (
      '<path d="M50,50 C35,35 35,15 50,8 C45,25 45,40 50,50 Z" fill="' + dark + '"/>' +
      '<path d="M50,50 C65,65 65,85 50,92 C55,75 55,60 50,50 Z" fill="' + dark + '"/>' +
      '<path d="M50,50 C65,35 85,35 92,50 C75,45 60,45 50,50 Z" fill="' + dark + '"/>' +
      '<path d="M50,50 C35,65 15,65 8,50 C25,55 40,55 50,50 Z" fill="' + dark + '"/>' +
      '<circle cx="50" cy="50" r="5" fill="' + colors[1] + '"/>'
    );
  }

  // Fevernova : flammes courbes qui partent du centre.
  function flameSwirlPattern(colors) {
    let s = '';
    for (let i = 0; i < 3; i++) {
      s += '<path d="M50,50 Q60,30 58,15 Q69,32 66,50 Z" fill="' + colors[i % colors.length] + '" transform="rotate(' + (i * 120) + ' 50 50)"/>';
    }
    s += '<circle cx="50" cy="50" r="7" fill="' + colors[1] + '"/>';
    return s;
  }

  // Tricolore : pentagones fins + petits triangles bleu/rouge + rond central.
  function tricolorePattern(colors) {
    return (
      '<g fill="none" stroke="#c7d0e0" stroke-width="1.6" stroke-linejoin="round">' +
      '<polygon points="50,36 63,46 58,61 42,61 37,46"/>' +
      '<path d="M50,36 L50,7"/><path d="M63,46 L88,38"/><path d="M58,61 L74,82"/>' +
      '<path d="M42,61 L26,82"/><path d="M37,46 L12,38"/></g>' +
      '<polygon points="50,10 54,16 46,16" fill="' + colors[0] + '"/>' +
      '<polygon points="86,40 90,46 82,45" fill="' + colors[2] + '"/>' +
      '<polygon points="70,80 74,86 65,85" fill="' + colors[0] + '"/>' +
      '<polygon points="30,80 34,86 25,85" fill="' + colors[2] + '"/>' +
      '<polygon points="14,40 18,46 10,45" fill="' + colors[0] + '"/>' +
      '<circle cx="50" cy="50" r="9" fill="' + colors[2] + '" stroke="' + colors[0] + '" stroke-width="2"/>'
    );
  }

  // Questra : anneaux + deux étoiles superposées (look "orbite").
  function orbitStarPattern(colors) {
    return (
      '<circle cx="50" cy="50" r="32" fill="none" stroke="' + colors[0] + '" stroke-width="2"/>' +
      '<circle cx="50" cy="50" r="22" fill="none" stroke="' + colors[2] + '" stroke-width="2"/>' +
      '<polygon points="50,32 54,44 67,44 57,52 61,65 50,57 39,65 43,52 33,44 46,44" fill="' + colors[2] + '"/>' +
      '<polygon points="50,50 53,58 62,58 55,64 58,73 50,68 42,73 45,64 38,58 47,58" fill="' + colors[0] + '" opacity=".85"/>'
    );
  }

  function ballPatternMarkup(pattern, colors) {
    switch (pattern) {
      case 'petals6': return petalsPattern(colors, 6);
      case 'pentagon': return pentagonPattern(colors);
      case 'wave': return wavePattern(colors);
      case 'braidthick': return braidThickPattern(colors);
      case 'confetti': return confettiPattern(colors);
      case 'teamgeist': return teamgeistPattern(colors);
      case 'flameswirl': return flameSwirlPattern(colors);
      case 'tricolore': return tricolorePattern(colors);
      case 'orbitstar': return orbitStarPattern(colors);
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

  function keeperMiniSvg(jersey, gloves) {
    return '<svg viewBox="0 0 40 74">' +
      '<path d="M6 30 C2 24 4 16 10 13" stroke="' + gloves + '" stroke-width="6" stroke-linecap="round" fill="none"/>' +
      '<path d="M34 30 C38 24 36 16 30 13" stroke="' + gloves + '" stroke-width="6" stroke-linecap="round" fill="none"/>' +
      '<rect x="11" y="20" width="18" height="30" rx="7" fill="' + jersey + '"/>' +
      '<circle cx="20" cy="9" r="6.4" fill="#E8B48C"/>' +
      '</svg>';
  }

  function applyKeeperColors(jersey, gloves) {
    document.querySelectorAll('#keeper .keeper-jersey').forEach((el) => el.setAttribute('fill', jersey));
    document.querySelectorAll('#keeper .keeper-glove').forEach((el) => el.setAttribute('stroke', gloves));
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
      (ball) => (ball.price === 0 ? 'Gratuit' : '💎 ' + ball.price));

    renderShopList(document.getElementById('shop-list-keepers'), catalog.keepers, 'keeper',
      currentProfile.ownedKeepers, currentProfile.selectedKeeper,
      (k) => keeperMiniSvg(k.jersey, k.gloves),
      (k) => (k.price === 0 ? 'Gratuit' : '💎 ' + k.price) + ' · style +' + k.style.toFixed(1) + '%');
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
        '<div class="shop-item-name">' + entry.name + '</div>' +
        '<div class="shop-item-price">' + priceLabelFn(entry) + '</div>' +
        '</div>';
      const btn = document.createElement('button');
      btn.type = 'button';
      if (isSelected) {
        btn.className = 'shop-item-btn selected';
        btn.textContent = 'Choisi';
        btn.disabled = true;
      } else if (isOwned) {
        btn.className = 'shop-item-btn select';
        btn.textContent = 'Choisir';
        btn.addEventListener('click', () => shopAction('select', kind, id));
      } else {
        btn.className = 'shop-item-btn buy';
        btn.textContent = 'Acheter';
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
      alert(e.message);
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
    modeHint.textContent = mode === 'ranked'
      ? 'Classée : victoire = +1 vers le palier suivant, défaite = -2.'
      : 'Amical : ton rang ne bouge pas.';
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
    if (!username) { errorEl.textContent = 'Choisis un pseudo.'; return; }
    try {
      const data = await profileApi('signup', { username });
      currentProfile = data.profile;
      currentProfileSecret = data.secretCode;
      localStorage.setItem('pw_profile_username', data.username);
      localStorage.setItem('pw_profile_secret', data.secretCode);
      document.getElementById('profile-secret-display').textContent = data.secretCode;
      showScreen('profileCode');
    } catch (e) {
      errorEl.textContent = e.message;
    }
  });

  document.getElementById('btn-profile-code-continue').addEventListener('click', proceedToSetup);

  document.getElementById('btn-profile-login').addEventListener('click', async () => {
    const errorEl = document.getElementById('profile-login-error');
    errorEl.textContent = '';
    const username = document.getElementById('profile-login-username').value.trim();
    const secretCode = document.getElementById('profile-login-code').value.trim().toUpperCase();
    if (!username || !secretCode) { errorEl.textContent = 'Pseudo et code secret nécessaires.'; return; }
    try {
      const data = await profileApi('login', { username, secretCode });
      currentProfile = data.profile;
      currentProfileSecret = secretCode;
      localStorage.setItem('pw_profile_username', data.username);
      localStorage.setItem('pw_profile_secret', secretCode);
      proceedToSetup();
    } catch (e) {
      errorEl.textContent = e.message;
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

  // ---------- Créer une partie ----------
  const btnCreate = document.getElementById('btn-create');
  const createError = document.getElementById('create-error');

  async function createRoom() {
    createError.textContent = '';
    const name = currentProfile ? currentProfile.username : (document.getElementById('create-name').value.trim() || 'Joueur 1');
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
      document.getElementById('waiting-link').value = location.origin + location.pathname + '?code=' + roomCode;
      showScreen('waiting');
      startPolling();
    } catch (e) {
      createError.textContent = "Oups, impossible de créer la partie (" + e.message + ")";
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
    const name = currentProfile ? currentProfile.username : (document.getElementById('join-name').value.trim() || 'Joueur 2');
    const code = document.getElementById('join-code').value.trim().toUpperCase();
    if (code.length !== 4) {
      joinError.textContent = 'Le code fait 4 lettres, vérifie avec ton ami.';
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
      joinError.textContent = 'Impossible de rejoindre : ' + e.message;
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
      pitchHint.textContent = 'Erreur : ' + e.message;
      aimArea.disabled = false;
    }
  });

  function updateScoreboard(state) {
    document.getElementById('score-p1-name').textContent = state.players[0] || 'Joueur 1';
    document.getElementById('score-p2-name').textContent = state.players[1] || 'Joueur 2';
    document.getElementById('score-p1-num').textContent = state.scores[0];
    document.getElementById('score-p2-num').textContent = state.scores[1];
    document.getElementById('score-p1').classList.toggle('active', state.shooterIdx === 0);
    document.getElementById('score-p2').classList.toggle('active', state.shooterIdx === 1);
    const pill = document.getElementById('mode-pill');
    if (state.mode === 'ranked') {
      pill.style.display = 'inline-block';
      pill.textContent = 'CLASSÉE';
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
      resultBanner.textContent = r.isSave ? 'ARRÊT !' : 'BUT !';
      resultBanner.classList.add('show', r.isSave ? 'save' : 'goal');
      if (!r.isSave) spawnConfetti();
      updateScoreboard(state);
      pitchHint.textContent = r.isSave ? 'Le gardien a plongé au bon endroit' : 'Le tireur a trompé le gardien';
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
      pitchHint.textContent = 'Clique dans la cage pour viser ton tir';
      btnConfirm.textContent = 'Valider le tir';
      btnConfirm.disabled = !pendingPct;
    } else if (iAmKeeping) {
      currentMode = 'keep';
      aimArea.disabled = false;
      turnOverlay.style.display = 'none';
      pitchHint.textContent = 'Clique où le gardien doit plonger';
      btnConfirm.textContent = 'Valider le plongeon';
      btnConfirm.disabled = !pendingPct;
    } else {
      currentMode = null;
      aimArea.disabled = true;
      btnConfirm.disabled = true;
      pendingPct = null;
      turnOverlay.style.display = 'flex';
      if (state.phase === 'shoot') {
        turnOverlayTitle.textContent = 'AU TIR';
        turnOverlayText.textContent = shooterName + ' vise… attends ton tour.';
        pitchHint.textContent = "L'adversaire vise son tir";
      } else {
        turnOverlayTitle.textContent = 'DANS LES CAGES';
        turnOverlayText.textContent = keeperName + ' choisit où plonger.';
        pitchHint.textContent = 'Le gardien réfléchit à son plongeon';
      }
    }
  }

  async function showGameOver(state) {
    const iWon = state.winner === (myRole === 'p1' ? 0 : 1);
    document.getElementById('gameover-role').textContent = iWon ? 'VICTOIRE !' : 'DÉFAITE';
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
            ? '🎉 Tu passes ' + myPromo.rankEmoji + ' ' + myPromo.rankName + ' !'
            : 'Victoire enregistrée pour ton rang (' + currentProfile.rankEmoji + ' ' + currentProfile.rankName + ').';
        } else {
          banner.classList.add('demote');
          banner.textContent = myDemo.demoted
            ? '📉 Tu redescends ' + myDemo.rankEmoji + ' ' + myDemo.rankName + '.'
            : 'Défaite classée : -2 victoires (' + currentProfile.rankEmoji + ' ' + currentProfile.rankName + ').';
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
})();
