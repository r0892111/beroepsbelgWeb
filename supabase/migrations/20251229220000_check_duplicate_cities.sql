/*
  # Check for duplicate cities
  
  This migration helps identify duplicate cities in the database.
  Run these queries to check for duplicates before cleaning up.
  
  To use:
  1. Run the SELECT queries below to identify duplicates
  2. If duplicates are found, manually merge or delete them
  3. Update tours_table_prod.city_id to point to the correct city ID
*/

-- Check for cities with duplicate slugs (same slug, different IDs)
SELECT 
  slug,
  COUNT(*) as count,
  array_agg(id) as city_ids,
  array_agg(name_nl) as names
FROM cities
GROUP BY slug
HAVING COUNT(*) > 1
ORDER BY slug;

-- Check for cities with no data (empty/null fields)
SELECT 
  id,
  slug,
  name_nl,
  name_en,
  name_fr,
  name_de,
  display_order,
  created_at
FROM cities
WHERE 
  (name_nl IS NULL OR name_nl = '')
  AND (name_en IS NULL OR name_en = '')
  AND (name_fr IS NULL OR name_fr = '')
  AND (name_de IS NULL OR name_de = '')
ORDER BY created_at DESC;

-- Check for tours that reference cities that don't exist
SELECT DISTINCT
  t.city_id,
  t.city as city_slug,
  COUNT(*) as tour_count
FROM tours_table_prod t
LEFT JOIN cities c ON t.city_id = c.id
WHERE t.city_id IS NOT NULL
  AND c.id IS NULL
GROUP BY t.city_id, t.city
ORDER BY tour_count DESC;

-- Check for tours with city_id pointing to wrong city (slug mismatch)
SELECT 
  t.id as tour_id,
  t.title,
  t.city as tour_city_slug,
  t.city_id,
  c.slug as city_slug,
  c.name_nl as city_name
FROM tours_table_prod t
LEFT JOIN cities c ON t.city_id = c.id
WHERE t.city_id IS NOT NULL
  AND c.id IS NOT NULL
  AND t.city IS NOT NULL
  AND t.city != c.slug
ORDER BY t.city, c.slug;

/*
  If duplicates are found, you can:
  
  1. Merge duplicate cities:
     - Keep the city with the most complete data
     - Update tours_table_prod.city_id to point to the kept city
     - Delete the duplicate city records
  
  2. Clean up empty cities:
     - If a city has no data and no tours, delete it
     - If a city has no data but has tours, update it with proper data
  
  3. Fix tour city_id references:
     - Update tours_table_prod.city_id to point to correct city IDs
     - Match by slug: UPDATE tours_table_prod t SET city_id = c.id FROM cities c WHERE t.city = c.slug AND t.city_id IS NULL;
*/

