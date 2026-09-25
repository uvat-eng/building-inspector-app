-- Демонстрационным записям для проверки Apple открываем доступ к объекту,
-- иначе проверяющий видит пустые экраны и отклоняет приложение.
UPDATE t_p27863069_building_inspector_a.users
SET objects = '["obj-1788169434061"]'::jsonb,
    must_change_password = false
WHERE fio IN ('Demo Manager', 'Demo Inspector');