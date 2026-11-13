# Stack technique (proposition) — FITZONE App

> Ce document décrit la **stack cible proposée** pour construire FITZONE proprement (frontend + backend).  
> Il s’appuie sur le besoin fonctionnel du projet (auth téléphone, code d’invitation, catalogue, portefeuille/dépôts-retraits, commissions, parrainage, missions/récompenses, historique, support) et sur les bonnes pratiques pour une application mobile-first.

## 1) Principes de choix
- **Cohérence** : un design system unique (tokens, composants, états) et des conventions partagées.
- **Maintenabilité** : séparation claire frontend/backend, modules par domaine métier.
- **Sécurité** : authentification robuste, validation côté serveur, gestion rigoureuse des transactions.
- **Évolutivité** : possibilité d’ajouter web responsive et back-office admin plus tard.
- **Contexte local** : support des pays cibles (+226, +225, +224, +223) et intégrations paiement/mobile money (selon fournisseurs disponibles).

## 2) Stack cible recommandée

### Frontend (application mobile-first)
- **Framework** : React + TypeScript
- **Build/outillage** : Vite
- **Routing** : React Router
- **Gestion d’état / données serveur** : TanStack Query (React Query) + état local ciblé (Context/Zustand selon besoin)
- **Formulaires & validation** : React Hook Form + Zod (validation schémas, côté client) — en miroir avec la validation backend
- **UI / styles** : Tailwind CSS + composants UI réutilisables (design system maison) ; icônes (ex. Lucide)
- **Internationalisation** *(prévu)* : i18n (fr en priorité, extensible)
- **PWA** *(optionnel, utile en mobile web)* : manifest + service worker pour installation/expérience app-like

**Structure front (par domaines/fonctionnalités)** :
- `auth` (inscription, connexion, OTP, reset)
- `home` (dashboard, bannière, raccourcis)
- `catalog` (liste, filtres) / `machines` (détail, activation)
- `wallet` (solde, dépôt, retrait, comptes de retrait)
- `commissions` / `history`
- `referral` (équipe, code, paliers)
- `missions` / `rewards` / `collection`
- `profile` / `support` / `settings` / `notifications`

### Backend (API)
- **Runtime** : Node.js
- **Langage** : TypeScript
- **Framework HTTP** : NestJS *(recommandé pour une structure modulaire forte)* ou Express (plus léger) — à trancher au démarrage de l’implémentation
- **Validation** : DTO/schémas (ex. class-validator/Zod) sur toutes les entrées
- **Authentification** : JWT (access/refresh) + hachage de mots de passe (bcrypt/argon2), OTP SMS pour vérification/récupération
- **Base de données** : PostgreSQL *(recommandé pour la cohérence transactionnelle : soldes, dépôts/retraits, commissions, historique)*  
  - ORM : Prisma (ou TypeORM)
- **Cache / jobs** *(selon besoins)* : Redis + file de tâches (BullMQ) pour calculs planifiés (ex. commissions quotidiennes), notifications, traitements asynchrones
- **Stockage fichiers** *(si nécessaire)* : stockage objet (images produits/bannières) via S3-compatible ou équivalent
- **Documentation API** : OpenAPI/Swagger

**Modules backend (par domaine)** :
- `auth`, `users`, `referrals`
- `catalog`/`machines`, `collections`
- `wallet`, `deposits`, `withdrawals`, `payment-accounts`
- `transactions`/`history`, `commissions`
- `missions`, `rewards`, `bonuses`
- `support`, `notifications`
- `admin` *(phase ultérieure)*

### Intégrations externes (à préciser)
- **SMS/OTP** : fournisseur SMS (pour vérification téléphone et reset)
- **Paiements Mobile Money** : intégration selon opérateurs/pays (API agrégateur ou opérateurs) pour dépôts/retraits
- **Notifications** : push/in-app (et/ou email si pertinent)

### Qualité, sécurité & exploitation
- **Tests** : unitaires + intégration (API) ; e2e pour parcours critiques (inscription, dépôt, achat, retrait)
- **Sécurité** : RBAC (utilisateur/admin), rate limiting, journaux d’audit sur opérations sensibles, protection des secrets (env), conformité des flux de paiement
- **CI/CD** : lint, tests, build automatisés
- **Déploiement** *(à définir)* : frontend statique (CDN/hébergement web), backend conteneurisé + base managée

## 3) Décisions à valider avant implémentation
- Choix final backend : **NestJS** vs **Express**.
- Choix SGBD : **PostgreSQL** (recommandé) vs autre.
- Fournisseurs **SMS/OTP** et **Mobile Money** par pays (BF/CI/GN/ML).
- Règles métier exactes : calcul des commissions quotidiennes, paliers/revenus des machines, conditions de retrait, logique de bonus/missions/parrainage.
- Périmètre MVP technique (sans back-office admin au départ ou non).