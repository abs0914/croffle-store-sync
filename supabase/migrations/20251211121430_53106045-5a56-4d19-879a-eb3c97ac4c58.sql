-- Fix PWD discount data for two transactions that were missing discount_type persistence

-- Transaction 20251211-2199-195941: Subtotal ₱276.79, 20% discount = ₱55.36
UPDATE transactions 
SET 
  discount_type = 'pwd',
  discount = 55.36,
  pwd_discount = 55.36
WHERE receipt_number = '20251211-2199-195941';

-- Transaction 20251211-1285-200058: Subtotal ₱204.46, 20% discount = ₱40.89
UPDATE transactions 
SET 
  discount_type = 'pwd',
  discount = 40.89,
  pwd_discount = 40.89
WHERE receipt_number = '20251211-1285-200058';