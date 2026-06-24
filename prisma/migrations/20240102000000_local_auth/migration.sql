-- Migration: switch from Supabase auth to local credentials
-- Removes supabase_id, adds password_hash

ALTER TABLE "users" DROP COLUMN IF EXISTS "supabase_id";
ALTER TABLE "users" ADD COLUMN "password_hash" TEXT NOT NULL DEFAULT '';

-- Remove the default once the column is created
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP DEFAULT;
