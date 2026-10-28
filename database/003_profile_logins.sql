-- Private mapping for accounts whose ownership has been verified before merging.
CREATE TABLE IF NOT EXISTS lejrbalet.profile_logins (
 auth_id text PRIMARY KEY,
 profile_id text NOT NULL REFERENCES lejrbalet.profiles(id),
 is_admin boolean NOT NULL DEFAULT false
);
ALTER TABLE lejrbalet.profile_logins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON lejrbalet.profile_logins FROM PUBLIC, anon, authenticated;
