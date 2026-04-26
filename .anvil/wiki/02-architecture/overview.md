# Architecture — boxtoplay-dashboard

## Vue d’ensemble

Architecture TanStack Start avec séparation claire:

- **UI routes React** (`src/routes/*`) pour affichage et interactions utilisateur
- **Server Functions** (`src/server/*`) pour appels API externes sécurisés (GitHub / BoxToPlay)
- **TanStack Query** côté client pour cache/fetch/mutations

Sources: [`src/routes/__root.tsx`](../../../../src/routes/__root.tsx), [`src/routes/index.tsx`](../../../../src/routes/index.tsx), [`src/routes/modpacks.tsx`](../../../../src/routes/modpacks.tsx), [`src/server/dashboard.ts`](../../../../src/server/dashboard.ts), [`src/server/modpacks.ts`](../../../../src/server/modpacks.ts).

## Parcours principaux

- Dashboard (`/`) : statut Minecraft + derniers workflows
- Modpacks (`/modpacks`) : recherche modpacks, sélection version, dispatch workflow GitHub
- Backups (`/backups`) : placeholder UI
