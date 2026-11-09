ALTER TABLE lejrbalet.daily_challenges ADD COLUMN IF NOT EXISTS rerolls smallint NOT NULL DEFAULT 0 CHECK(rerolls BETWEEN 0 AND 2);
ALTER TABLE lejrbalet.daily_challenges ADD COLUMN IF NOT EXISTS seen_templates text[] NOT NULL DEFAULT '{}';
UPDATE lejrbalet.daily_challenges SET title='FOR THE HORDE' WHERE template='alliance' AND title<>'FOR THE HORDE';
UPDATE lejrbalet.entries SET title='FOR THE HORDE' WHERE kind='screenshot' AND title='For Horden!' AND data::jsonb ? 'challenge';
