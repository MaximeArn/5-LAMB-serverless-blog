# API : articles

Deux familles de routes : `/posts` pour la lecture publique (articles publiés uniquement) et `/manage/posts` pour la gestion, qui demande le header `Authorization: <idToken>`.

## Article

| Champ | Description |
| --- | --- |
| `postId` | identifiant (UUID) |
| `title` | 1 à 200 caractères |
| `content` | texte libre (Markdown conseillé), 100 000 caractères maximum |
| `status` | `draft` ou `published` |
| `authorId`, `authorName` | auteur |
| `createdAt`, `updatedAt`, `publishedAt` | dates ISO 8601 |

Les listes ne renvoient pas `content` : on l'obtient en lisant l'article.

## Routes

| Méthode | Route | Accès | Corps | Réponse |
| --- | --- | --- | --- | --- |
| GET | `/posts` | public | | 200 `items[]`, `nextToken` |
| GET | `/posts/{postId}` | public | | 200 article publié |
| GET | `/manage/posts` | connecté | | 200 `items[]`, `nextToken` |
| GET | `/manage/posts/{postId}` | auteur, editor, admin | | 200 article |
| POST | `/manage/posts` | connecté | `title`, `content` | 201 article en brouillon |
| PATCH | `/manage/posts/{postId}` | auteur, editor, admin | `title` et/ou `content` | 200 article |
| DELETE | `/manage/posts/{postId}` | auteur, editor, admin | | 204 |
| PATCH | `/manage/posts/{postId}/status` | editor, admin | `status` | 200 article |

Listes : `limit` (1 à 100, 20 par défaut) et `nextToken` (renvoyé quand il reste des pages). Sur `/manage/posts`, un `guest-author` voit ses articles (filtre optionnel `status`) ; un editor ou un admin voit les articles du `status` demandé, `draft` par défaut.

Un article publié modifié par un `guest-author` repasse en brouillon.

## Erreurs

| HTTP | Code |
| --- | --- |
| 400 | `VALIDATION_ERROR`, `INVALID_JSON`, `INVALID_NEXT_TOKEN` |
| 401 | `UNAUTHORIZED` |
| 403 | `FORBIDDEN` (article d'un autre auteur, ou publication par un `guest-author`) |
| 404 | `POST_NOT_FOUND` |
| 409 | `POST_CONFLICT` (article modifié entre-temps : le recharger puis réessayer) |
