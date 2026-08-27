-- Local migration: recalculate KOC tiers using follower count only.
-- This does not affect kol_profiles (KOL / artists).
BEGIN;

UPDATE kocs
SET tier = CASE
  WHEN COALESCE(followers, 0) >= 1000000 THEN 'Mega'
  WHEN COALESCE(followers, 0) >= 300000 THEN 'Macro'
  WHEN COALESCE(followers, 0) >= 100000 THEN 'Mid'
  WHEN COALESCE(followers, 0) >= 10000 THEN 'Micro'
  ELSE 'Nano'
END;

COMMIT;
