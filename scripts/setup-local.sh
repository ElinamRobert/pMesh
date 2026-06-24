#!/usr/bin/env bash
# One-shot local setup for ProductPilot AI
set -e

echo "==> Starting local Postgres (Docker)..."
docker compose up -d

echo "==> Waiting for Postgres to be ready..."
until docker exec pmesh_db pg_isready -U pmesh -q; do sleep 1; done
echo "    Postgres is ready."

echo "==> Creating .env.local from template..."
if [ ! -f .env.local ]; then
  cp .env.local.example .env.local
  # Generate a random NEXTAUTH_SECRET
  SECRET=$(openssl rand -base64 32)
  sed -i "s/change_me_generate_with_openssl_rand_base64_32/$SECRET/" .env.local
  echo "    .env.local created. Add your ANTHROPIC_API_KEY and VOYAGE_API_KEY."
else
  echo "    .env.local already exists, skipping."
fi

echo "==> Installing dependencies..."
npm install --ignore-scripts

echo "==> Running Prisma migrations..."
npx prisma migrate deploy

echo ""
echo "✓ Setup complete. Run: npm run dev"
