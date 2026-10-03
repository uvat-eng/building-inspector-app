CREATE TABLE IF NOT EXISTS t_p27863069_building_inspector_a.tenant_ctx (
  id BIGSERIAL PRIMARY KEY,
  company TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
