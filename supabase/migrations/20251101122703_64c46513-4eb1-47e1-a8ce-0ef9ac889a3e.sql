-- Void transaction 20251101-8015-185403
UPDATE transactions 
SET status = 'voided'
WHERE receipt_number = '20251101-8015-185403' AND status = 'completed';