-- Add car_type and plate fields to cw_customers
-- These allow editing car info from the customer profile (leads page)
ALTER TABLE cw_customers
  ADD COLUMN IF NOT EXISTS car_type TEXT,
  ADD COLUMN IF NOT EXISTS plate TEXT;
