-- Create recipe usage log table for tracking when recipes are used in POS
CREATE TABLE IF NOT EXISTS public.recipe_usage_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    quantity_used numeric NOT NULL DEFAULT 1,
    used_by uuid REFERENCES auth.users(id),
    transaction_id text, -- Reference to POS transaction
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recipe_usage_log_recipe_id ON public.recipe_usage_log(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_usage_log_store_id ON public.recipe_usage_log(store_id);
CREATE INDEX IF NOT EXISTS idx_recipe_usage_log_created_at ON public.recipe_usage_log(created_at);
CREATE INDEX IF NOT EXISTS idx_recipe_usage_log_transaction_id ON public.recipe_usage_log(transaction_id);

-- Enable RLS
ALTER TABLE public.recipe_usage_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view recipe usage log for their stores" ON public.recipe_usage_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_stores us
            WHERE us.user_id = auth.uid()
            AND us.store_id = recipe_usage_log.store_id
        )
    );

CREATE POLICY "Users can insert recipe usage log for their stores" ON public.recipe_usage_log
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_stores us
            WHERE us.user_id = auth.uid()
            AND us.store_id = recipe_usage_log.store_id
        )
    );

-- Add comments
COMMENT ON TABLE public.recipe_usage_log IS 'Tracks when recipes are used in POS transactions for inventory deduction';
COMMENT ON COLUMN public.recipe_usage_log.recipe_id IS 'Reference to the recipe that was used';
COMMENT ON COLUMN public.recipe_usage_log.store_id IS 'Store where the recipe was used';
COMMENT ON COLUMN public.recipe_usage_log.quantity_used IS 'How many units of the recipe were made/used';
COMMENT ON COLUMN public.recipe_usage_log.used_by IS 'User who triggered the recipe usage';
COMMENT ON COLUMN public.recipe_usage_log.transaction_id IS 'Reference to the POS transaction that triggered this usage';
COMMENT ON COLUMN public.recipe_usage_log.notes IS 'Additional notes about the recipe usage';

-- Create a function to automatically deduct inventory when recipe is used
CREATE OR REPLACE FUNCTION public.handle_recipe_usage()
RETURNS trigger AS $$
BEGIN
    -- This function can be extended to automatically trigger inventory deductions
    -- For now, it just logs the usage
    
    -- You could add automatic inventory deduction logic here
    -- by calling the deductInventoryForRecipe function
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for recipe usage
CREATE TRIGGER on_recipe_usage_created
    AFTER INSERT ON public.recipe_usage_log
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_recipe_usage();

-- Add a view for recipe usage analytics
CREATE OR REPLACE VIEW public.recipe_usage_analytics AS
SELECT 
    r.id as recipe_id,
    r.name as recipe_name,
    r.store_id,
    s.name as store_name,
    COUNT(rul.id) as usage_count,
    SUM(rul.quantity_used) as total_quantity_used,
    AVG(rul.quantity_used) as avg_quantity_per_use,
    MIN(rul.created_at) as first_used,
    MAX(rul.created_at) as last_used,
    DATE_TRUNC('month', rul.created_at) as usage_month
FROM public.recipes r
LEFT JOIN public.recipe_usage_log rul ON r.id = rul.recipe_id
LEFT JOIN public.stores s ON r.store_id = s.id
WHERE r.is_active = true
GROUP BY r.id, r.name, r.store_id, s.name, DATE_TRUNC('month', rul.created_at)
ORDER BY total_quantity_used DESC NULLS LAST;

-- Grant permissions
GRANT SELECT ON public.recipe_usage_analytics TO authenticated;

-- Add RLS to the view
ALTER VIEW public.recipe_usage_analytics SET (security_invoker = true);
