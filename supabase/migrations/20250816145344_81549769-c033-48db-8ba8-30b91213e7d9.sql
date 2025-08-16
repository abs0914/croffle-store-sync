-- Update the specific transaction to properly record full discount amount
UPDATE transactions 
SET 
  discount_amount = subtotal - total,  -- This will be 58.04 (full discount including VAT exemption)
  discount = subtotal - total          -- Also update the discount field
WHERE receipt_number = '20250816-9749-213308';

-- For future reference, let's also create a function to recalculate discount amounts for all senior transactions
CREATE OR REPLACE FUNCTION recalculate_senior_discounts()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update all senior discount transactions to have proper discount_amount
  UPDATE transactions 
  SET 
    discount_amount = CASE 
      WHEN subtotal > 0 AND subtotal > total THEN subtotal - total 
      ELSE COALESCE(discount_amount, 0) 
    END,
    discount = CASE 
      WHEN subtotal > 0 AND subtotal > total THEN subtotal - total 
      ELSE COALESCE(discount, 0) 
    END
  WHERE discount_type = 'senior' 
    AND subtotal > total
    AND (discount_amount IS NULL OR discount_amount != (subtotal - total));
END;
$$;