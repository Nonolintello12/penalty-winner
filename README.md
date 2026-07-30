# ⚽ Tirs au but

Mon jeu de foot, fait à la main en HTML, CSS et JavaScript.

## Comment y jouer

Il est en ligne : il suffit d'ouvrir le lien. Rien à installer.

## Comment il est fabriqué

Trois fichiers, c'est tout :

| Fichier | À quoi il sert |
|---|---|
| `index.html` | La page web (elle contient le canvas, la zone de dessin) |
| `style.css` | Les couleurs et la mise en page autour du jeu |
| `game.js` | **Tout le jeu** : le stade, le ballon, le gardien, les règles |

Pas de bibliothèque, pas d'outil compliqué : tout le code du jeu est
lisible dans `game.js`.

## Les missions

- [x] **1.** Le décor : le but, le gardien, le ballon
- [ ] **2.** Viser et tirer
- [ ] **3.** But ou arrêt ? + le score
- [ ] **4.** 🤖 Le gardien **réagit** (il suit le ballon)
- [ ] **5.** 🤖 Le gardien **prédit** où le ballon va arriver
- [ ] **6.** 🤖 Le gardien **décide** (plonger tôt, tard, bluffer)
- [ ] **7.** 🤖 Le gardien **apprend** mes habitudes
- [ ] **8.** Le mode 2 joueurs en ligne (un tire, l'autre garde)

## Pour travailler dessus

Ouvrir `index.html` dans un navigateur : ça suffit pour tester.
Chaque `git push` remet automatiquement le jeu en ligne sur Vercel.
