-- Additive migration. Before applying to another installation, back up
-- lejrbalet.profiles, entries and journal using your normal database backup.
-- No existing tables or character records are changed by this migration.
CREATE TABLE IF NOT EXISTS lejrbalet.sync_devices (
 id text PRIMARY KEY, owner text NOT NULL REFERENCES lejrbalet.profiles(id),
 name text NOT NULL, token_hash text NOT NULL UNIQUE,
 created timestamptz NOT NULL DEFAULT now(), expires timestamptz NOT NULL,
 revoked timestamptz, last_seen timestamptz
);
CREATE INDEX IF NOT EXISTS sync_devices_owner ON lejrbalet.sync_devices(owner);
CREATE TABLE IF NOT EXISTS lejrbalet.sync_inbox (
 owner text NOT NULL REFERENCES lejrbalet.profiles(id), guid text NOT NULL,
 realm text NOT NULL, payload text NOT NULL, captured_at bigint NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(owner,guid,realm)
);
ALTER TABLE lejrbalet.sync_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE lejrbalet.sync_inbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON lejrbalet.sync_devices, lejrbalet.sync_inbox FROM PUBLIC,anon,authenticated;
