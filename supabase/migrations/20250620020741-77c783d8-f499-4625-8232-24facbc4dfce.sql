
-- Create damaged_goods table for tracking damaged items
CREATE TABLE public.damaged_goods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grn_id UUID NOT NULL REFERENCES public.goods_received_notes(id),
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  damaged_quantity NUMERIC NOT NULL DEFAULT 0,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  financial_impact NUMERIC NOT NULL DEFAULT 0,
  damage_reason TEXT NOT NULL,
  damage_category TEXT NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id),
  recorded_by UUID NOT NULL,
  photos TEXT[] DEFAULT '{}',
  disposition TEXT NOT NULL DEFAULT 'pending' CHECK (disposition IN ('return_to_supplier', 'dispose', 'partial_use', 'pending')),
  disposition_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create damage_audit_trail table for tracking changes
CREATE TABLE public.damage_audit_trail (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  damage_id UUID NOT NULL REFERENCES public.damaged_goods(id),
  action TEXT NOT NULL,
  performed_by UUID NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.damaged_goods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.damage_audit_trail ENABLE ROW LEVEL SECURITY;

-- Create policies for damaged_goods
CREATE POLICY "Admin and owners can manage damaged goods" 
  ON public.damaged_goods 
  FOR ALL 
  USING (is_admin_or_owner());

-- Create policies for damage_audit_trail
CREATE POLICY "Admin and owners can view damage audit trail" 
  ON public.damage_audit_trail 
  FOR SELECT 
  USING (is_admin_or_owner());

CREATE POLICY "Admin and owners can create damage audit trail" 
  ON public.damage_audit_trail 
  FOR INSERT 
  WITH CHECK (is_admin_or_owner());

-- Add indexes for performance
CREATE INDEX idx_damaged_goods_grn_id ON public.damaged_goods(grn_id);
CREATE INDEX idx_damaged_goods_supplier_id ON public.damaged_goods(supplier_id);
CREATE INDEX idx_damaged_goods_disposition ON public.damaged_goods(disposition);
CREATE INDEX idx_damage_audit_trail_damage_id ON public.damage_audit_trail(damage_id);

-- Add trigger for updated_at
CREATE TRIGGER update_damaged_goods_updated_at
  BEFORE UPDATE ON public.damaged_goods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
