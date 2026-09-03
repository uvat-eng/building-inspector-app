CREATE TABLE IF NOT EXISTS ppe_items (
  id VARCHAR(16) PRIMARY KEY,
  holder_id VARCHAR(32) NOT NULL DEFAULT '',
  holder_fio VARCHAR(255) NOT NULL DEFAULT '',
  object_id VARCHAR(32) NOT NULL DEFAULT '',
  title VARCHAR(255) NOT NULL DEFAULT '',
  season VARCHAR(16) NOT NULL DEFAULT 'summer',
  size VARCHAR(32) NOT NULL DEFAULT '',
  qty INTEGER NOT NULL DEFAULT 1,
  issued_at VARCHAR(16) NOT NULL DEFAULT '',
  wear_months INTEGER NOT NULL DEFAULT 24,
  expires_at VARCHAR(16) NOT NULL DEFAULT '',
  status VARCHAR(24) NOT NULL DEFAULT 'active',
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ppe_writeoffs (
  id VARCHAR(16) PRIMARY KEY,
  holder_id VARCHAR(32) NOT NULL DEFAULT '',
  holder_fio VARCHAR(255) NOT NULL DEFAULT '',
  object_id VARCHAR(32) NOT NULL DEFAULT '',
  item_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  reason TEXT NOT NULL DEFAULT '',
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(24) NOT NULL DEFAULT 'review',
  engineer_fio VARCHAR(255) NOT NULL DEFAULT '',
  engineer_at VARCHAR(32) NOT NULL DEFAULT '',
  manager_fio VARCHAR(255) NOT NULL DEFAULT '',
  manager_at VARCHAR(32) NOT NULL DEFAULT '',
  decline_reason TEXT NOT NULL DEFAULT '',
  act_no VARCHAR(32) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS equipment_items (
  id VARCHAR(16) PRIMARY KEY,
  holder_id VARCHAR(32) NOT NULL DEFAULT '',
  holder_fio VARCHAR(255) NOT NULL DEFAULT '',
  object_id VARCHAR(32) NOT NULL DEFAULT '',
  title VARCHAR(255) NOT NULL DEFAULT '',
  inv_no VARCHAR(64) NOT NULL DEFAULT '',
  serial_no VARCHAR(64) NOT NULL DEFAULT '',
  condition TEXT NOT NULL DEFAULT '',
  verified_at VARCHAR(16) NOT NULL DEFAULT '',
  verified_to VARCHAR(16) NOT NULL DEFAULT '',
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(24) NOT NULL DEFAULT 'active',
  received_at VARCHAR(16) NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS equipment_moves (
  id VARCHAR(16) PRIMARY KEY,
  equipment_id VARCHAR(16) NOT NULL DEFAULT '',
  from_id VARCHAR(32) NOT NULL DEFAULT '',
  from_fio VARCHAR(255) NOT NULL DEFAULT '',
  to_id VARCHAR(32) NOT NULL DEFAULT '',
  to_fio VARCHAR(255) NOT NULL DEFAULT '',
  object_id VARCHAR(32) NOT NULL DEFAULT '',
  condition TEXT NOT NULL DEFAULT '',
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  moved_at VARCHAR(16) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ppe_holder ON ppe_items(holder_id);
CREATE INDEX IF NOT EXISTS idx_equip_holder ON equipment_items(holder_id);
CREATE INDEX IF NOT EXISTS idx_writeoff_status ON ppe_writeoffs(status);