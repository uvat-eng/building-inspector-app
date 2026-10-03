UPDATE companies SET plan = 'closed', access_code = '' WHERE id = 'cbeac13ceee3' AND name = 'ООО Проверка Пути';
UPDATE users SET password = md5(random()::text || clock_timestamp()::text) WHERE company_id = 'cbeac13ceee3' AND fio = 'Путев Пётр';
