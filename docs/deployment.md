# Déploiement

## Prérequis

- Node.js 24
- Serverless Framework v4, connecté (`serverless login`)
- AWS CLI configurée sur le compte cible

La région est `eu-north-1` : l'organisation AWS du compte bloque les autres régions.

## Commandes

```bash
npm install
npm run deploy                    # stage dev
npm run deploy -- --stage prod    # autre stage
npm run info                      # URL de l'API et liste des routes
npm run remove                    # supprime toute la stack
```

Le bucket des médias s'appelle `blogify-<stage>-media-<id du compte AWS>`. CloudFormation ne supprime pas un bucket qui contient des fichiers : le vider avant `npm run remove`.

```bash
aws s3 rm s3://blogify-dev-media-<id du compte AWS> --recursive --region eu-north-1
```

## Packaging

Chaque fonction est bundlée par esbuild et déployée dans son propre zip (`package.individually: true`) : une Lambda ne télécharge que son code au démarrage à froid (5 Ko à 1 Mo selon la fonction, contre 5,7 Mo pour un zip commun aux 19 fonctions) et ne contient pas celui des autres.

## Créer le premier admin

Seul un admin peut changer un rôle via l'API, donc le premier se crée à la main :

1. S'inscrire et confirmer le compte via l'API (`/auth/register` puis `/auth/confirm`).
2. Console AWS, région `eu-north-1` : Cognito → User pools → `blogify-dev-users` → Groups → `admin` → _Add user to group_.
3. Se reconnecter pour obtenir un token avec le nouveau rôle ou simmplement taper sur la route refreshToken.

## Limite connue

Les e-mails de vérification sont envoyés par Cognito (environ 50 par jour). En production, il faudrait brancher Amazon SES avec un domaine propre.
