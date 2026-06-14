
ALTER TABLE supplies
  ADD COLUMN consumption_interval numeric NULL,       -- 消耗周期（天）
  ADD COLUMN consumption_amount   numeric NULL,       -- 每次消耗量
  ADD COLUMN last_deducted_at     timestamptz NULL;   -- 上次自动扣减时间
