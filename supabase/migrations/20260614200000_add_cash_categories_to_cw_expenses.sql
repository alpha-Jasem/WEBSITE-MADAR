-- Add cash_in and cash_out to the allowed category values in cw_expenses
ALTER TABLE cw_expenses
  DROP CONSTRAINT IF EXISTS cw_expenses_category_check;

ALTER TABLE cw_expenses
  ADD CONSTRAINT cw_expenses_category_check
  CHECK (category IN (
    'tools',
    'electricity',
    'rent',
    'salary',
    'marketing',
    'maintenance',
    'other',
    'cash_in',
    'cash_out'
  ));
