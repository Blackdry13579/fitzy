# FITZONE App (projet)

## Description du projet

**FITZONE** est une application **mobile-first** dédiée à la vente et à la mise en valeur de **machines et équipements sportifs**.  
Le projet vise à proposer une expérience utilisateur professionnelle combinant catalogue de produits, gestion de portefeuille, revenus/commissions, parrainage et engagement (missions/récompenses).

Ce dépôt est une **nouvelle base propre** (frontend + backend) créée pour remplacer l’ancienne implémentation expérimentale (`projet-maison`) et repartir sur une architecture et un design cohérents.

## Objectifs

- Offrir un parcours fluide d’inscription/connexion et d’utilisation sur mobile.
- Mettre en avant des machines/équipements sportifs avec fiches détaillées (photos, prix, conditions).
- Permettre la gestion des dépôts, retraits et de l’historique des opérations.
- Intégrer un système de **commissions quotidiennes**, de **bonus**, de **parrainage** et de **missions/récompenses**.
- Construire une base technique maintenable (frontend, backend, documentation).

## Marchés cibles (prévu)

- Burkina Faso (**+226**)
- Côte d’Ivoire (**+225**)
- Guinée (**+224**)
- Mali (**+223**)

## Fonctionnalités prévues (vue d’ensemble)

- Inscription et connexion par téléphone (code d’invitation obligatoire à l’inscription).
- Bonus de bienvenue avec progression (objectif mentionné : jusqu’à 500 FCFA).
- Accueil avec bannière, solde et raccourcis.
- Catalogue de machines sportives/équipements avec photos et prix.
- Fiches détaillées des équipements.
- Dépôts et retraits (ex. Mobile Money) et comptes de retrait.
- Commissions quotidiennes.
- Historique des opérations.
- Parrainage et suivi des filleuls/équipe.
- Missions et récompenses.
- Collection / “Mes produits”.
- Profil et assistance/support.

## Priorité des premières maquettes (MVP UI)

1. Inscription  
2. Connexion  
3. Accueil  
4. Catalogue  
5. Détail d’une machine  
6. Dépôt  
7. Commissions quotidiennes  
8. Historique  

> La version web responsive et l’administration (back-office) seront étudiées ultérieurement.

---

## Plan des pages (proposition complète)

### 1) Onboarding & authentification
| Page | Objectif | Éléments clés |
|---|---|---|
| **Splash / Chargement** | Premier écran au lancement | Logo, état de chargement, vérification session |
| **Onboarding / Présentation** *(optionnel mais recommandé)* | Expliquer rapidement le concept (1–3 slides) | Valeur proposée, CTA “Créer un compte” / “Se connecter” |
| **Inscription** | Création de compte | Pays (+226/+225/+224/+223), numéro de téléphone, mot de passe (+ confirmation), **code d’invitation obligatoire**, acceptation CGU, validation/erreurs |
| **Vérification téléphone (OTP/SMS)** *(recommandé)* | Sécuriser le numéro | Saisie code, renvoi code, timer |
| **Connexion** | Accès au compte | Pays/numéro, mot de passe, “Se souvenir de moi”, lien mot de passe oublié |
| **Mot de passe oublié** | Récupération d’accès | Saisie numéro, envoi code |
| **Réinitialisation mot de passe** | Définir un nouveau mot de passe | Nouveau mot de passe + confirmation, validation |

### 2) Cœur de l’application
| Page | Objectif | Éléments clés |
|---|---|---|
| **Accueil (Dashboard)** | Vue d’ensemble et accès rapide | Bannière/promo, solde, raccourcis (dépôt, catalogue, commissions, parrainage), résumé activité/produits actifs |
| **Catalogue des machines/équipements** | Découvrir et parcourir l’offre | Liste/grille, filtres/tri, catégories/paliers, photo, prix, aperçu rendement/conditions |
| **Détail d’une machine** | Décider et agir | Photos, description, prix, gains/conditions (durée, commission quotidienne, etc.), disponibilité, CTA “Acheter/Activer” |
| **Confirmation d’achat/activation** *(page ou modal)* | Sécuriser l’action | Récapitulatif, impact sur solde, confirmation |
| **Mes produits / Ma collection** | Suivre les équipements détenus | Produits actifs/terminés, statut, dates, revenus générés, progression, accès au détail |

### 3) Portefeuille & finances
| Page | Objectif | Éléments clés |
|---|---|---|
| **Portefeuille (vue globale)** | Centraliser les finances | Solde disponible, revenus/commissions, bonus, accès dépôt/retrait/historique |
| **Dépôt** | Recharger le compte | Montant (saisie + montants rapides), méthode (ex. Mobile Money), instructions/confirmation, limites |
| **Retrait** | Retirer des fonds | Montant, solde disponible, compte de retrait, conditions d’éligibilité (ex. produit actif), frais/délais/horaires si applicable |
| **Comptes de retrait / Moyens de paiement** | Gérer les destinations de paiement | Ajouter/modifier/supprimer compte Mobile Money/bancaire, compte par défaut |
| **Commissions quotidiennes** | Suivre les gains journaliers | Gains du jour, cumul, détail par produit/source, statut (en attente/crédité) |
| **Historique des opérations** | Traçabilité complète | Liste filtrable (dépôts, retraits, commissions, bonus, achats), statuts, dates, détails d’une transaction |
| **Détail d’une transaction** *(optionnel mais utile)* | Comprendre une opération | Référence, type, montant, statut, date, motif/notes |

### 4) Parrainage, missions & récompenses
| Page | Objectif | Éléments clés |
|---|---|---|
| **Parrainage / Mon équipe** | Gérer le réseau | Code/lien d’invitation (copie/partage), aperçu équipe, liste des filleuls/niveaux, statistiques |
| **Plan de commissions / Salaire d’équipe** | Comprendre les gains réseau | Règles par niveau, paliers, récompenses, progression |
| **Missions & Récompenses** | Engagement et progression | Liste des missions, objectifs, progression (ex. bonus bienvenue vers 500 FCFA), récompenses à réclamer/réclamées |

### 5) Compte, support & confiance
| Page | Objectif | Éléments clés |
|---|---|---|
| **Profil** | Infos personnelles | Nom, téléphone, pays, date d’inscription, code parrain, photo/avatar (optionnel) |
| **Paramètres du compte** | Gérer le compte | Changer mot de passe, préférences (langue/notifications), sécurité |
| **Centre d’aide / Support** | Assistance utilisateur | FAQ, contact (chat/WhatsApp/téléphone/email selon choix), création/suivi de tickets |
| **Notifications** | Suivi des événements | Dépôts/retraits, commissions, missions, messages support |
| **À propos / CGU / Confidentialité** | Confiance et conformité | CGU, politique de confidentialité, infos légales/app |

### 6) États et pages système
| Page/État | Objectif |
|---|---|
| **Chargement / Skeleton** | Attente de données |
| **État vide** (aucun produit, aucun filleul, aucun historique) | Guider l’utilisateur |
| **Succès** (dépôt, achat, retrait demandé, etc.) | Confirmation claire |
| **Erreur** (réseau, paiement échoué, validation) | Compréhension + action de reprise |
| **Maintenance / Indisponibilité** | Gestion des interruptions |
| **404 / Page introuvable** | Navigation invalide |
| **Session expirée** | Ré-authentification |

### 7) Évolutions ultérieures (hors MVP initial)
- **Back-office d’administration (web)** : gestion utilisateurs, produits/machines, dépôts/retraits, commissions, missions, parrainages, support, paramètres.
- **Version web responsive** des parcours principaux.

---

## Références étudiées
- TopToywa (parcours/organisation observés via captures et indices publics)
- Boschww (référence de parcours mentionnée)
- Maquette/template FITZONE (vision “machines et équipements sportifs”)

## Structure du dépôt (initiale)

```text
fitzone-app/
  README.md
  docs/
```

> La stack technique et l’architecture détaillée (frontend/backend) seront définies dans un document dédié.