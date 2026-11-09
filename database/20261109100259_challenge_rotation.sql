-- Only widen the award ceiling for rare/epic challenges; existing awards are unchanged.
ALTER TABLE lejrbalet.daily_challenges DROP CONSTRAINT daily_challenges_points_check;
ALTER TABLE lejrbalet.daily_challenges ADD CONSTRAINT daily_challenges_points_check CHECK(points BETWEEN 1 AND 200);
