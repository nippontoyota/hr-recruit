SET search_path TO recruitment;

DELETE FROM evaluations
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY candidate_id, type ORDER BY created_at DESC) as rnum
    FROM evaluations
    WHERE type = 'TECHNICAL_TEST'
  ) t
  WHERE t.rnum > 1
);
