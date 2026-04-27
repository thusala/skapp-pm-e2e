-- Seed data for E2E API tests.
-- This file is mounted into Postgres via docker-compose init script.
-- Add tables / seed rows as needed by your E2E tests.

-- Example: create an extension commonly needed by NestJS + TypeORM
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- NOTE: TypeORM will auto-synchronize / run migrations when the backend
-- starts (depending on your AppModule configuration). This seed file is
-- for any *additional* data the tests need that isn't created by migrations.
--
-- Add INSERT statements below as your test suite grows.
-- e.g.:
-- INSERT INTO "user" (id, email, name) VALUES (1, 'admin@test.com', 'Test Admin');
