ALTER TABLE users NO FORCE ROW LEVEL SECURITY;
ALTER TABLE locations NO FORCE ROW LEVEL SECURITY;
UPDATE users SET company_id = 'cfa05df275e7', password = md5(random()::text || clock_timestamp()::text) WHERE id = '245042a327cd' AND fio = 'Тестов Тест Тестович';
UPDATE locations SET company_id = 'cfa05df275e7' WHERE id = 'loc-a4b4d3ed' AND created_by = 'Тестов Тест Тестович';
UPDATE companies SET plan = 'closed', access_code = '' WHERE id = 'cfa05df275e7' AND name = 'ООО Проверка Изоляции';
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE locations FORCE ROW LEVEL SECURITY;