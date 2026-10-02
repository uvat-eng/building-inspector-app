CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    schema_name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'demo',
    owner_fio TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    paid_until TIMESTAMPTZ NULL,
    purchase_ref TEXT NOT NULL DEFAULT ''
);

INSERT INTO companies (id, name, schema_name, plan, owner_fio)
VALUES ('gsi', 'ООО «Глобал-Стройинжиниринг»', 't_p27863069_building_inspector_a', 'full', '')
ON CONFLICT (id) DO NOTHING;

CREATE SCHEMA IF NOT EXISTS t_p27863069_building_inspector_a_probe;