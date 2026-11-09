-- Additive only: existing profiles, gallery, uploads and sync data are unchanged.
CREATE TABLE IF NOT EXISTS lejrbalet.daily_challenges (
 id uuid PRIMARY KEY,
 owner text NOT NULL REFERENCES lejrbalet.profiles(id),
 day date NOT NULL,
 slot smallint NOT NULL CHECK(slot BETWEEN 0 AND 2),
 template text NOT NULL,
 title text NOT NULL,
 description text NOT NULL,
 points smallint NOT NULL CHECK(points BETWEEN 1 AND 100),
 completed_at timestamptz,
 upload_id text REFERENCES lejrbalet.uploads(id),
 evidence_hash text,
 gallery_id text REFERENCES lejrbalet.entries(id),
 UNIQUE(owner,day,slot),
 UNIQUE(owner,evidence_hash),
 CHECK ((completed_at IS NULL AND upload_id IS NULL AND evidence_hash IS NULL AND gallery_id IS NULL) OR (completed_at IS NOT NULL AND upload_id IS NOT NULL AND evidence_hash IS NOT NULL AND gallery_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS daily_challenges_completed ON lejrbalet.daily_challenges(completed_at DESC) WHERE completed_at IS NOT NULL;
ALTER TABLE lejrbalet.daily_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON lejrbalet.daily_challenges FROM PUBLIC, anon, authenticated;
