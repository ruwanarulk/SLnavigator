#!/bin/sh
# Vercel runs `vercel-build` instead of `build` for this project.
# Applies pending migrations on every deploy; seeds only when SEED_ON_DEPLOY=1
# (set it for the first deploy of a new database, then remove it).
set -e
npx prisma migrate deploy
if [ "$SEED_ON_DEPLOY" = "1" ]; then
  echo "SEED_ON_DEPLOY=1: seeding database"
  npx prisma db seed
fi
npm run build
