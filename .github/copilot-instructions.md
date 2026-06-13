# GitHub Pages build/deploy instructions for this repo

This repository hosts a Vite React app from:

- `apps/doc-trak-mobile-upload`

Use these exact project details when repeating setup in a new session/context:

- Local repo path used: `C:\ProjectWork\Devl\Hackathon`
- Git remote: `https://github.com/Epigee/DocTrakPhotoRelay.git`
- Default branch: `main`
- Pages workflow file: `.github/workflows/deploy-pages.yml`
- Workflow name: `Deploy Vite app to Pages`

## One-time GitHub setup

1. Repository Pages setting must be:
   - **Settings -> Pages -> Source: GitHub Actions**
2. Workflow deploys on push to `main`.

## Build/deploy behavior

1. CI runner uses Node 20.
2. Working directory is `apps/doc-trak-mobile-upload`.
3. Commands used:
   - `npm ci`
   - `npm run build`
4. Deploy artifact path:
   - `apps/doc-trak-mobile-upload/dist`

## Publish URL

Project Pages URL format for this repo:

- `https://epigee.github.io/DocTrakPhotoRelay/`

## Runtime URL context for the upload app

The app reads context from query params (or optional base64url `ctx` token). Required values:

- `wsUrl`
- `userId`
- `configuration`

Common optional values used by this app:

- `app` (default `DTEXTERNALAPP`)
- `targetApp`
- `targetUserId`
- `messageType` (default `DocTrakMobileImageUpload`)
- `ackTimeoutMs`
- `site`
- `context`
- `formGuid`
- `mongooseUrl`

Example runtime URL:

`https://epigee.github.io/DocTrakPhotoRelay/?wsUrl=wss://<endpoint>&userId=<user>&configuration=<config>&app=DTEXTERNALAPP&targetApp=DOCTRAK&targetUserId=<user>&messageType=DocTrakMobileImageUpload`

## Important production caveat

Because this is a browser-hosted static app, the target WebSocket endpoint must:

1. Be publicly reachable from the internet.
2. Support secure WebSocket (`wss://`) for HTTPS-hosted pages.
3. Allow the site origin during WebSocket handshake checks (origin allowlist pattern for `https://epigee.github.io`).
