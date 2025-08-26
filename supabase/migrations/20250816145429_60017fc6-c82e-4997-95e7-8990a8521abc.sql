-- Update the other senior transaction to properly record the discount amount
UPDATE transactions 
SET discount_amount = subtotal - total
WHERE receipt_number = '20250816-4606-212755';