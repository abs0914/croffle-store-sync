-- Enable realtime for product_catalog table
ALTER TABLE product_catalog REPLICA IDENTITY FULL;

-- Add the table to the realtime publication if not already added
DO $$
BEGIN
    -- Check if the table is already in the publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'product_catalog'
    ) THEN
        -- Add table to realtime publication
        ALTER PUBLICATION supabase_realtime ADD TABLE product_catalog;
    END IF;
END $$;