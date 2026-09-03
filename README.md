# ⚽ Tirs au but — Mondial 2026

Un jeu de tirs au but à deux, **en ligne**, chacun sur son propre ordinateur.

## Comment y jouer

1. Ouvre le lien du jeu.
2. Un joueur clique sur **"Créer une partie"** → il reçoit un code à 4 lettres.
3. Il envoie ce code (ou le lien "Copier le lien") à son ami.
4. L'ami clique sur **"Rejoindre une partie"** et entre le code.
5. La partie commence : chacun tire et garde les cages à tour de rôle.
   Premier à 10 buts gagne.

## Comment il est fabriqué

| Fichier | À quoi il sert |
|---|---|
| `index.html` | La page web (les écrans : créer/rejoindre, terrain, fin de partie) |
| `style.css` | Les couleurs et la mise en page |
| `game.js` | Le jeu côté navigateur : dessine le terrain, envoie les actions au serveur |
| `api/room.js` | Le serveur (fonction Vercel) : garde l'état de chaque partie |

Pas de compte, pas de mot de passe : juste un code à 4 lettres par partie.

## Comment la synchronisation marche

Vercel n'héberge que des pages web, pas un serveur qui reste allumé en
permanence. Pour que les deux joueurs voient la même partie, on utilise
un **carnet de score partagé** : une petite base de données (Redis, chez
Upstash, branchée directement sur ce projet Vercel). Le navigateur de
chaque joueur relit ce carnet environ une fois par seconde pour voir ce
qui a changé.

## Pour travailler dessus

Ouvrir `index.html` directement dans un navigateur ne suffit plus (il a
besoin du serveur `/api/room`). Pour tester en local il faut `vercel dev`.
Chaque `git push` remet automatiquement le jeu en ligne sur Vercel.
