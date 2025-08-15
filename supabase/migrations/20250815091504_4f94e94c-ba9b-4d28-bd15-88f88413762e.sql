-- Clear rate limit for IT Park cashier account
DELETE FROM auth_rate_limits 
WHERE identifier = 'cashier.itpark@thecroffle.com';