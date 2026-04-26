# Environnements & Exécution — boxtoplay-dashboard

## Variables d’environnement

- `GH_TOKEN`
- `GITHUB_REPO`

Source: [`.env.example`](../../../../.env.example), usage dans [`src/server/dashboard.ts`](../../../../src/server/dashboard.ts) et [`src/server/modpacks.ts`](../../../../src/server/modpacks.ts).

## Commandes

```bash
npm run dev
npm run build
npm run test
```

## Notes opérationnelles

- Les appels externes sensibles sont routés via server functions pour éviter CORS et exposer les tokens uniquement côté serveur.
