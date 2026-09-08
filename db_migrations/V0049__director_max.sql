INSERT INTO users (
  id, fio, fio_key, password, role, "group", org, phone,
  locations, specialties, certificates, educations, must_change_password
) VALUES (
  'dirmax000001', 'MAX', 'max', 'агент007', 'director', '',
  'ООО «Глобал-Стройинжиниринг»', '',
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, false
)
ON CONFLICT (id) DO UPDATE SET
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  must_change_password = false;
