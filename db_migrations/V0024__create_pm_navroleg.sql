INSERT INTO t_p27863069_building_inspector_a.users
  (id, fio, fio_key, password, role, "group", org, phone, locations, specialties, certificates, educations, must_change_password)
VALUES (
  'pmnavroleg01',
  'navroleg',
  'navroleg',
  'superman',
  'pm',
  '',
  'ООО «Глобал-Стройинжиниринг»',
  '',
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  false
)
ON CONFLICT (id) DO UPDATE
  SET fio = EXCLUDED.fio,
      fio_key = EXCLUDED.fio_key,
      password = EXCLUDED.password,
      role = EXCLUDED.role,
      must_change_password = false;