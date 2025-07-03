-- Allow inventory update operations to create alerts
CREATE POLICY "Allow system to create inventory alerts" 
ON public.store_inventory_alerts 
FOR INSERT 
WITH CHECK (true);