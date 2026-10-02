ALTER TABLE t_p27863069_building_inspector_a.asset_timesheet ADD COLUMN IF NOT EXISTS company_id TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.company', true), ''), 'gsi');
CREATE INDEX IF NOT EXISTS idx_co_asset_timesheet ON t_p27863069_building_inspector_a.asset_timesheet (company_id);
ALTER TABLE t_p27863069_building_inspector_a.asset_timesheet ENABLE ROW LEVEL SECURITY;