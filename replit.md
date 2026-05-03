# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Auto-deploy (Hostinger)

`fitness.thewise.cloud` is hosted on Hostinger and built from the `deploy` branch
of `https://github.com/iammagdy/wise-body-fitness-app`. To make every push to
`deploy` trigger a Hostinger build automatically:

1. In Hostinger hPanel → Websites → Git, enable "Auto deployment" for the
   `deploy` branch and copy the webhook URL it generates.
2. In GitHub → Settings → Secrets and variables → Actions, add a repository
   secret named `HOSTINGER_DEPLOY_WEBHOOK` and paste the webhook URL.

The workflow at `.github/workflows/hostinger-deploy.yml` will then POST to the
webhook on every push to `deploy`. If the secret isn't set, the workflow
skips gracefully.
