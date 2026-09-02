INSERT INTO t_p27863069_building_inspector_a.users
  (id, fio, fio_key, password, role, "group", org, phone, locations, specialties, certificates, educations)
VALUES (
  'admin0000001',
  'Админ',
  'админ',
  '521456',
  'admin',
  '',
  'ООО «Глобал-Стройинжиниринг»',
  '',
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb
)
ON CONFLICT (id) DO UPDATE
  SET password = EXCLUDED.password, role = EXCLUDED.role;