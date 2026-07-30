/* ==================================================
   ⚽ TIRS AU BUT — Mission 1 : le décor
   ==================================================

   Ce fichier dessine le stade, le but, le gardien et
   le ballon. Rien ne bouge encore : c'est la mission 2.

   Repère à connaître : sur un canvas,
     x = 0  → tout à GAUCHE      x = 800 → tout à DROITE
     y = 0  → tout en HAUT       y = 500 → tout en BAS
   Attention : y augmente vers le BAS. C'est à l'envers
   de ce qu'on fait en maths, et c'est normal.
   ================================================== */


/* ---------- 1. On attrape le canvas ---------- */

const canvas = document.getElementById("jeu");
const ctx = canvas.getContext("2d");   // ctx = notre "crayon"

const L = canvas.width;    // 800
const H = canvas.height;   // 500


/* ---------- 2. Les dimensions du stade ----------
   Ce sont LES NOMBRES À BIDOUILLER. Change-les et
   recharge la page pour voir ce qui se passe. */

const HORIZON = 130;       // où la pelouse commence

const BUT = {
  gauche: 175,
  droite: 625,
  haut: 150,
  bas: 330                 // la ligne de but (par terre)
};

const POINT_PENALTY = { x: L / 2, y: 452 };


/* ---------- 3. Les objets du jeu ---------- */

const ballon = {
  x: POINT_PENALTY.x,
  y: POINT_PENALTY.y,
  r: 14                    // r = le rayon (la taille) du ballon
};

const gardien = {
  x: L / 2,                // au milieu du but
  y: BUT.bas               // ses pieds sont sur la ligne
};


/* ---------- 4. La foule ----------
   On fabrique les spectateurs UNE SEULE FOIS, au
   démarrage, et on garde leurs positions dans une liste.
   Si on les tirait au hasard à chaque image, ils
   sauteraient partout comme des puces ! */

const COULEURS_FOULE = ["#ff6b6b", "#4dabf7", "#ffd43b", "#f8f9fa", "#69db7c"];
const foule = [];

for (let i = 0; i < 600; i++) {
  foule.push({
    x: Math.random() * L,
    y: Math.random() * (HORIZON - 10),
    couleur: COULEURS_FOULE[Math.floor(Math.random() * COULEURS_FOULE.length)]
  });
}


/* ==================================================
   LES FONCTIONS DE DESSIN
   Une fonction = une recette. On l'écrit une fois,
   on peut s'en resservir autant qu'on veut.
   ================================================== */

function dessinerTribunes() {
  // Le fond sombre du stade
  const fond = ctx.createLinearGradient(0, 0, 0, HORIZON);
  fond.addColorStop(0, "#060d1c");
  fond.addColorStop(1, "#1a2f57");
  ctx.fillStyle = fond;
  ctx.fillRect(0, 0, L, HORIZON);

  // Les spectateurs : un petit carré par personne
  for (const personne of foule) {
    ctx.fillStyle = personne.couleur;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(personne.x, personne.y, 3, 3);
  }
  ctx.globalAlpha = 1;   // on remet l'opacité à fond pour la suite
}


function dessinerPelouse() {
  ctx.fillStyle = "#2f7d3a";
  ctx.fillRect(0, HORIZON, L, H - HORIZON);

  // Les bandes de tonte. Elles sont de plus en plus
  // hautes vers le bas : ça donne l'effet de perspective,
  // comme si le terrain s'éloignait.
  let y = HORIZON;
  let hauteur = 7;
  let claire = true;

  while (y < H) {
    ctx.fillStyle = claire ? "#3b9146" : "#347f3d";
    ctx.fillRect(0, y, L, hauteur);
    y += hauteur;
    hauteur *= 1.32;
    claire = !claire;
  }

  // La surface de réparation + le point de penalty
  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  ctx.lineWidth = 3;
  ctx.strokeRect(60, BUT.bas, L - 120, 145);

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(POINT_PENALTY.x, POINT_PENALTY.y, 4, 0, Math.PI * 2);
  ctx.fill();
}


function dessinerBut() {
  const largeur = BUT.droite - BUT.gauche;
  const hauteur = BUT.bas - BUT.haut;

  // Le filet : une grille de traits fins
  ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
  ctx.lineWidth = 1;

  for (let x = BUT.gauche; x <= BUT.droite; x += 18) {
    ctx.beginPath();
    ctx.moveTo(x, BUT.haut);
    ctx.lineTo(x, BUT.bas);
    ctx.stroke();
  }
  for (let y = BUT.haut; y <= BUT.bas; y += 18) {
    ctx.beginPath();
    ctx.moveTo(BUT.gauche, y);
    ctx.lineTo(BUT.droite, y);
    ctx.stroke();
  }

  // Les poteaux et la barre transversale
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 9;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(BUT.gauche, BUT.bas);
  ctx.lineTo(BUT.gauche, BUT.haut);
  ctx.lineTo(BUT.droite, BUT.haut);
  ctx.lineTo(BUT.droite, BUT.bas);
  ctx.stroke();
}


function dessinerGardien(x, y) {
  // x, y = la position de ses PIEDS
  const jambes = 34;
  const buste = 46;
  const hautDuBuste = y - jambes - buste;

  // Son ombre par terre
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.beginPath();
  ctx.ellipse(x, y, 27, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Les jambes
  ctx.fillStyle = "#101c33";
  ctx.fillRect(x - 14, y - jambes, 11, jambes);
  ctx.fillRect(x + 3, y - jambes, 11, jambes);

  // Le maillot + les bras écartés
  ctx.fillStyle = "#d9f425";
  ctx.fillRect(x - 17, hautDuBuste, 34, buste);
  ctx.fillRect(x - 41, hautDuBuste + 6, 24, 10);
  ctx.fillRect(x + 17, hautDuBuste + 6, 24, 10);

  // Les gants
  ctx.fillStyle = "#ff6b2c";
  ctx.beginPath();
  ctx.arc(x - 43, hautDuBuste + 11, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 43, hautDuBuste + 11, 8, 0, Math.PI * 2);
  ctx.fill();

  // La tête
  ctx.fillStyle = "#f0c49a";
  ctx.beginPath();
  ctx.arc(x, hautDuBuste - 12, 12, 0, Math.PI * 2);
  ctx.fill();
}


function dessinerBallon(x, y, r) {
  // Son ombre
  ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.75, r, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // La boule blanche
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // Les taches noires
  ctx.fillStyle = "#16181d";
  ctx.beginPath();
  ctx.arc(x, y, r * 0.32, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(
      x + Math.cos(angle) * r * 0.68,
      y + Math.sin(angle) * r * 0.68,
      r * 0.17,
      0, Math.PI * 2
    );
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}


/* ==================================================
   LA BOUCLE DE JEU
   Elle tourne ~60 fois par seconde. À chaque tour :
   on efface tout, puis on redessine tout.
   C'est comme un dessin animé : 60 images par seconde.
   ================================================== */

function boucle() {
  ctx.clearRect(0, 0, L, H);        // on efface l'image précédente

  dessinerTribunes();
  dessinerPelouse();
  dessinerBut();
  dessinerGardien(gardien.x, gardien.y);
  dessinerBallon(ballon.x, ballon.y, ballon.r);

  requestAnimationFrame(boucle);    // "refais-moi ça à la prochaine image"
}

boucle();   // 🚀 on lance le jeu
