CREATE TABLE IF NOT EXISTS t_p27863069_building_inspector_a.locations (
  id text PRIMARY KEY,
  title text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'MapPin',
  note text NOT NULL DEFAULT '',
  sort integer NOT NULL DEFAULT 0,
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO t_p27863069_building_inspector_a.locations (id, title, icon, sort) VALUES
  ('yakutia', 'Якутия', 'Snowflake', 1),
  ('megion', 'Мегион', 'Mountain', 2),
  ('messoyakha', 'Мессояха', 'Waves', 3),
  ('meretoyakha', 'Меретояха', 'Waves', 4),
  ('azs', 'Проект АЗС', 'Fuel', 5),
  ('fuel-depot', 'Проект склады топлива', 'Warehouse', 6),
  ('plants', 'Проект заводы', 'Factory', 7)
ON CONFLICT (id) DO NOTHING;