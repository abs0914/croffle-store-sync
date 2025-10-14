
-- Void the transaction 20251006-7274-122645
INSERT INTO void_transactions (
  store_id,
  original_transaction_id,
  original_receipt_number,
  void_receipt_number,
  void_reason_category,
  void_reason,
  void_notes,
  voided_by_user_id,
  voided_by_cashier_name,
  original_total,
  original_vat_amount,
  original_discount_amount,
  original_items,
  void_date,
  original_transaction_date,
  created_at,
  updated_at
)
VALUES (
  'c3bfe728-1550-4f4d-af04-12899f3b276b',
  '22c31c96-15f6-46d3-baca-1221268923f4',
  '20251006-7274-122645',
  'VOID-20251006-7274-122645',
  'management_decision',
  'Administrative deletion requested',
  'Deleted via admin request',
  'e8d978c8-e9f7-4566-8dd6-ad8194b7af84',
  'kimhe admin',
  125,
  0,
  0,
  '[{"name":"Caramel Delight Croffle","quantity":1,"unit_price":125,"total_price":125},{"name":"Paper Bag 06","quantity":1,"unit_price":0,"total_price":0},{"name":"Take out box w cover","quantity":1,"unit_price":0,"total_price":0}]'::jsonb,
  NOW(),
  '2025-10-06 04:26:45.489+00'::timestamp with time zone,
  NOW(),
  NOW()
);

-- Update the original transaction status to voided
UPDATE transactions 
SET status = 'voided'
WHERE id = '22c31c96-15f6-46d3-baca-1221268923f4';
