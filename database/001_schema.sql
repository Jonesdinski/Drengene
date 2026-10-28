-- Lejrbalet PostgreSQL schema. Run once via Supabase SQL Editor or npm run db:migrate.
-- A private schema prevents direct access through Supabase's browser Data API.
CREATE SCHEMA IF NOT EXISTS lejrbalet;
REVOKE ALL ON SCHEMA lejrbalet FROM PUBLIC, anon, authenticated;
SET search_path TO lejrbalet;
CREATE TABLE IF NOT EXISTS profiles(id text PRIMARY KEY,auth_id text NOT NULL UNIQUE,name text NOT NULL,bio text NOT NULL DEFAULT '',avatar text,created text NOT NULL);
CREATE TABLE IF NOT EXISTS legacy(id text PRIMARY KEY,name text NOT NULL UNIQUE,token_hash text UNIQUE,claimed_by text REFERENCES profiles(id),created text NOT NULL);
CREATE TABLE IF NOT EXISTS entries(id text PRIMARY KEY,kind text NOT NULL,owner text REFERENCES profiles(id),legacy_id text REFERENCES legacy(id),title text NOT NULL,body text NOT NULL,data text NOT NULL,done integer NOT NULL DEFAULT 0 CHECK(done IN (0,1)),deleted integer NOT NULL DEFAULT 0 CHECK(deleted IN (0,1)),created text NOT NULL);
CREATE TABLE IF NOT EXISTS actions(entry_id text NOT NULL REFERENCES entries(id),user_id text NOT NULL REFERENCES profiles(id),kind text NOT NULL,value text NOT NULL,PRIMARY KEY(entry_id,user_id,kind));
CREATE TABLE IF NOT EXISTS aliases(name text PRIMARY KEY,profile_id text NOT NULL REFERENCES profiles(id));
CREATE TABLE IF NOT EXISTS journal(id text PRIMARY KEY,actor text NOT NULL REFERENCES profiles(id),message text NOT NULL,created text NOT NULL);
CREATE TABLE IF NOT EXISTS settings(key text PRIMARY KEY,value text NOT NULL);
CREATE TABLE IF NOT EXISTS uploads(id text PRIMARY KEY,owner text NOT NULL REFERENCES profiles(id),mime text NOT NULL,created text NOT NULL);
CREATE INDEX IF NOT EXISTS entries_kind_created ON entries(kind,created DESC);
CREATE INDEX IF NOT EXISTS entries_owner ON entries(owner);
CREATE INDEX IF NOT EXISTS journal_created ON journal(created DESC);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE legacy ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA lejrbalet FROM PUBLIC, anon, authenticated;
-- The server's database connection uses the postgres role, not a browser key.
