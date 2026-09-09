INSERT INTO t_p27863069_building_inspector_a.users
    (id, fio, fio_key, password, role, "group", org, phone,
     specialties, certificates, educations, locations,
     must_change_password, objects, chief)
VALUES
    ('dirsalavat01', 'Salavat', 'salavat', 'Yulaev', 'director', '',
     'ООО «Глобал-Стройинжиниринг»', '',
     '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
     false, '[]'::jsonb, '')
ON CONFLICT (id) DO UPDATE
SET password = EXCLUDED.password,
    role = EXCLUDED.role,
    fio_key = EXCLUDED.fio_key;