# API : médias

Les médias sont stockés uniquement dans un bucket S3 privé, sous la clé `media/{ownerId}/{mediaId}` : un média existe si et seulement si son fichier existe. Les fichiers ne passent pas par l'API.

## Envoi d'un fichier

1. `POST /manage/media` : l'API renvoie un formulaire d'envoi signé (`upload.url` et `upload.fields`), valable 5 minutes. Elle n'écrit rien.
2. Le client envoie un formulaire `multipart/form-data` à `upload.url` : tous les champs de `upload.fields`, puis le fichier dans un dernier champ `file`.
3. S3 répond `204` : le fichier est stocké et le média est aussitôt lisible à son `url`.

S3 refuse le fichier (`403`) si le formulaire a expiré, si le type ou le nom diffère de la demande, ou si le fichier dépasse la taille autorisée. Un formulaire jamais utilisé ne laisse aucune trace.

| Type | `contentType` | Taille max |
| --- | --- | --- |
| Image | `image/jpeg`, `image/png`, `image/webp`, `image/gif` | 10 Mo |
| Vidéo | `video/mp4`, `video/webm` | 100 Mo |

## Routes

| Méthode | Route | Accès | Corps | Réponse |
| --- | --- | --- | --- | --- |
| POST | `/manage/media` | connecté | `fileName`, `contentType` | 201 `mediaId`, `ownerId`, `url`, `upload` |
| GET | `/manage/media` | connecté | | 200 `items[]` (`mediaId`, `size`, `uploadedAt`, `url`), `nextToken` |
| DELETE | `/manage/media/{ownerId}/{mediaId}` | propriétaire, editor, admin | | 204 |
| GET | `/media/{ownerId}/{mediaId}` | public | | 302 vers une URL S3 signée (15 min) |

`GET /manage/media` liste les médias de l'utilisateur connecté, du plus récent au plus ancien (`limit`, `nextToken`). `DELETE` répond `204` même si le fichier n'existe plus, ce qui permet de rejouer l'appel.

`GET /media/{ownerId}/{mediaId}` s'utilise directement dans `<img src>` ou dans un article en Markdown : `![](<base URL>/media/{ownerId}/{mediaId})`.

## Erreurs

| HTTP | Code |
| --- | --- |
| 400 | `VALIDATION_ERROR`, `INVALID_JSON`, `INVALID_NEXT_TOKEN` |
| 401 | `UNAUTHORIZED` |
| 403 | `FORBIDDEN` (média d'un autre utilisateur pour un `guest-author`) |
| 404 | `MEDIA_NOT_FOUND` |
