# Sécurité — principes de base (à appliquer dès le départ)

## Règle fondamentale
- **Le frontend (navigateur/app client) ne doit jamais accéder directement à la base de données.**
- Toute lecture/écriture de données passe par une **API backend** contrôlée (authentification, autorisation, validation).

## Base de données (VPS)
- La BD (MongoDB/PostgreSQL) doit être accessible **uniquement** depuis le backend (réseau privé, firewall, bind/local network), jamais exposée publiquement sans protection stricte.
- Identifiants de connexion BD stockés **côté serveur uniquement** (variables d’environnement), jamais dans le code frontend ni dans un bundle client.
- Comptes BD avec **moindre privilège** (pas de compte admin applicatif).

## API & authentification
- Authentification (ex. JWT access/refresh) et vérification du numéro (OTP) gérées côté serveur.
- **Validation et sanitisation** de toutes les entrées côté backend (ne jamais faire confiance au client).
- Contrôles d’autorisation (RBAC) : un utilisateur ne peut agir que sur ses propres ressources (solde, retraits, historique, etc.).
- Rate limiting, protection contre brute-force (login/OTP), journaux d’audit sur opérations sensibles (dépôts, retraits, commissions).

## Données sensibles & transactions
- Ne jamais exposer de secrets (clés API paiement/SMS, secrets JWT, URI BD) au client.
- Traçabilité des opérations financières (historique/transactions) et calculs critiques (commissions, bonus) effectués/validés côté serveur.
- Sauvegardes BD régulières et stratégie de restauration.

## Transport & déploiement
- HTTPS obligatoire en production.
- CORS configuré strictement (origines autorisées).
- Mises à jour de dépendances et gestion des vulnérabilités.

> Ce document est une base. Les règles métier et menaces spécifiques (fraude, retraits, parrainage) devront être détaillées dans la conception sécurité avant mise en production.