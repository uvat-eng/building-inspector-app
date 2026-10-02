ALTER TABLE waybills ENABLE ROW LEVEL SECURITY;
ALTER TABLE waybills FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON waybills USING (company_id = coalesce(nullif(current_setting('app.company',true),''),'gsi')) WITH CHECK (company_id = coalesce(nullif(current_setting('app.company',true),''),'gsi'));