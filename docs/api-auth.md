# API : authentification et utilisateurs

Base URL : affichée par `npm run info`. Les routes protégées attendent le header `Authorization: <idToken>`.

## Rôles

| Action | guest-author | editor | admin |
| --- | :-: | :-: | :-: |
| Créer un article (brouillon) | oui | oui | oui |
| Modifier / supprimer ses articles | oui | oui | oui |
| Publier, modifier / supprimer tous les articles | non | oui | oui |
| Gérer les rôles des utilisateurs | non | non | oui |

Toute inscription donne le rôle `guest-author`. Un changement de rôle s'applique au prochain token (connexion ou rafraîchissement).

## Routes

| Méthode | Route | Accès | Corps | Réponse |
| --- | --- | --- | --- | --- |
| POST | `/auth/register` | public | `email`, `password`, `name` | 201 `userId`, `role` |
| POST | `/auth/confirm` | public | `email`, `code` (reçu par e-mail) | 200 |
| POST | `/auth/login` | public | `email`, `password` | 200 `idToken`, `refreshToken`, `expiresIn` |
| POST | `/auth/refresh` | public | `refreshToken` | 200 `idToken`, `expiresIn` |
| GET | `/auth/me` | connecté | | 200 `userId`, `email`, `name`, `role` |
| GET | `/users` | admin | | 200 `items[]` |
| PATCH | `/users/{userId}/role` | admin | `role` | 200 `userId`, `role` |

Mot de passe : 8 caractères minimum, avec majuscule, minuscule et chiffre. `idToken` valable 1 h, `refreshToken` 30 jours.

## Erreurs

| HTTP | Code |
| --- | --- |
| 400 | `VALIDATION_ERROR`, `INVALID_JSON`, `INVALID_PASSWORD`, `INVALID_CODE`, `EXPIRED_CODE`, `CANNOT_CHANGE_OWN_ROLE` |
| 401 | `UNAUTHORIZED` (token absent ou invalide), `NOT_AUTHORIZED` (identifiants incorrects) |
| 403 | `FORBIDDEN` (rôle insuffisant), `USER_NOT_CONFIRMED` |
| 404 | `USER_NOT_FOUND` |
| 409 | `USER_ALREADY_EXISTS` |
| 429 | `TOO_MANY_REQUESTS` |
