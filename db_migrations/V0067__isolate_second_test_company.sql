ALTER TABLE users NO FORCE ROW LEVEL SECURITY;
ALTER TABLE locations NO FORCE ROW LEVEL SECURITY;
UPDATE users SET company_id = 'cdecb63252e3', password = md5(random()::text || clock_timestamp()::text) WHERE id = '54ddece7b47c' AND fio = 'Проверкин Пётр Петрович';
UPDATE locations SET company_id = 'cdecb63252e3' WHERE id = 'loc-e0c9123a' AND created_by = 'Проверкин Пётр Петрович';
UPDATE companies SET plan = 'closed', access_code = '' WHERE id = 'cdecb63252e3' AND name = 'ООО Тест Изоляции';
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE locations FORCE ROW LEVEL SECURITY;