
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DamagedGoodsRecord {
  id: string;
  grn_id: string;
  item_id: string;
  item_name: string;
  damaged_quantity: number;
  unit_cost: number;
  financial_impact: number;
  damage_reason: string;
  damage_category: string;
  supplier_id: string;
  recorded_by: string;
  created_at: string;
  photos?: string[];
  disposition: 'return_to_supplier' | 'dispose' | 'partial_use' | 'pending';
  disposition_notes?: string;
}

export interface DamagedGoodsReport {
  period: {
    start_date: string;
    end_date: string;
  };
  summary: {
    total_damaged_items: number;
    total_financial_impact: number;
    total_incidents: number;
  };
  by_supplier: Record<string, {
    damaged_items: number;
    financial_impact: number;
    incidents: number;
  }>;
  by_category: Record<string, {
    damaged_items: number;
    financial_impact: number;
    percentage: number;
  }>;
  by_disposition: Record<string, number>;
  trending_issues: Array<{
    issue: string;
    frequency: number;
    impact: number;
  }>;
}

export const recordDamagedGoods = async (
  grnId: string,
  itemId: string,
  itemName: string,
  damagedQuantity: number,
  unitCost: number,
  damageReason: string,
  supplierId: string,
  recordedBy: string,
  photos: string[] = []
): Promise<DamagedGoodsRecord | null> => {
  try {
    const financialImpact = damagedQuantity * unitCost;
    const damageCategory = categorizeDamage(damageReason);

    const { data, error } = await supabase
      .from('damaged_goods')
      .insert({
        grn_id: grnId,
        item_id: itemId,
        item_name: itemName,
        damaged_quantity: damagedQuantity,
        unit_cost: unitCost,
        financial_impact: financialImpact,
        damage_reason: damageReason,
        damage_category: damageCategory,
        supplier_id: supplierId,
        recorded_by: recordedBy,
        photos: photos,
        disposition: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    // Create audit trail
    await createDamageAuditTrail(data.id, 'recorded', recordedBy, 'Damaged goods recorded');

    toast.success(`Damaged goods recorded: ${itemName} (${damagedQuantity} units)`);
    return data;
  } catch (error) {
    console.error('Error recording damaged goods:', error);
    toast.error('Failed to record damaged goods');
    return null;
  }
};

export const updateDamageDisposition = async (
  damageId: string,
  disposition: DamagedGoodsRecord['disposition'],
  notes: string,
  updatedBy: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('damaged_goods')
      .update({
        disposition,
        disposition_notes: notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', damageId);

    if (error) throw error;

    // Create audit trail
    await createDamageAuditTrail(damageId, 'disposition_updated', updatedBy, `Disposition changed to: ${disposition}`);

    toast.success('Damage disposition updated');
    return true;
  } catch (error) {
    console.error('Error updating damage disposition:', error);
    toast.error('Failed to update damage disposition');
    return false;
  }
};

export const generateDamagedGoodsReport = async (
  startDate: string,
  endDate: string,
  storeId?: string
): Promise<DamagedGoodsReport | null> => {
  try {
    let query = supabase
      .from('damaged_goods')
      .select(`
        *,
        grn:goods_received_notes(
          delivery_order:delivery_orders(
            purchase_order:purchase_orders(store_id)
          )
        )
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (storeId) {
      query = query.eq('grn.delivery_order.purchase_order.store_id', storeId);
    }

    const { data: damagedGoods, error } = await query;
    if (error) throw error;

    if (!damagedGoods || damagedGoods.length === 0) {
      return {
        period: { start_date: startDate, end_date: endDate },
        summary: { total_damaged_items: 0, total_financial_impact: 0, total_incidents: 0 },
        by_supplier: {},
        by_category: {},
        by_disposition: {},
        trending_issues: []
      };
    }

    // Calculate summary
    const totalDamagedItems = damagedGoods.reduce((sum, item) => sum + item.damaged_quantity, 0);
    const totalFinancialImpact = damagedGoods.reduce((sum, item) => sum + item.financial_impact, 0);
    const totalIncidents = damagedGoods.length;

    // Group by supplier
    const bySupplier: Record<string, any> = {};
    damagedGoods.forEach(item => {
      if (!bySupplier[item.supplier_id]) {
        bySupplier[item.supplier_id] = {
          damaged_items: 0,
          financial_impact: 0,
          incidents: 0
        };
      }
      bySupplier[item.supplier_id].damaged_items += item.damaged_quantity;
      bySupplier[item.supplier_id].financial_impact += item.financial_impact;
      bySupplier[item.supplier_id].incidents += 1;
    });

    // Group by category
    const byCategory: Record<string, any> = {};
    damagedGoods.forEach(item => {
      if (!byCategory[item.damage_category]) {
        byCategory[item.damage_category] = {
          damaged_items: 0,
          financial_impact: 0,
          percentage: 0
        };
      }
      byCategory[item.damage_category].damaged_items += item.damaged_quantity;
      byCategory[item.damage_category].financial_impact += item.financial_impact;
    });

    // Calculate percentages for categories
    Object.keys(byCategory).forEach(category => {
      byCategory[category].percentage = (byCategory[category].financial_impact / totalFinancialImpact) * 100;
    });

    // Group by disposition
    const byDisposition: Record<string, number> = {};
    damagedGoods.forEach(item => {
      byDisposition[item.disposition] = (byDisposition[item.disposition] || 0) + 1;
    });

    // Calculate trending issues
    const issueFrequency: Record<string, { frequency: number; impact: number }> = {};
    damagedGoods.forEach(item => {
      if (!issueFrequency[item.damage_reason]) {
        issueFrequency[item.damage_reason] = { frequency: 0, impact: 0 };
      }
      issueFrequency[item.damage_reason].frequency += 1;
      issueFrequency[item.damage_reason].impact += item.financial_impact;
    });

    const trendingIssues = Object.entries(issueFrequency)
      .map(([issue, data]) => ({ issue, ...data }))
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 10);

    return {
      period: { start_date: startDate, end_date: endDate },
      summary: {
        total_damaged_items: totalDamagedItems,
        total_financial_impact: totalFinancialImpact,
        total_incidents: totalIncidents
      },
      by_supplier: bySupplier,
      by_category: byCategory,
      by_disposition: byDisposition,
      trending_issues: trendingIssues
    };
  } catch (error) {
    console.error('Error generating damaged goods report:', error);
    toast.error('Failed to generate damaged goods report');
    return null;
  }
};

const categorizeDamage = (damageReason: string): string => {
  const categories = {
    'Physical damage during transport': 'logistics',
    'Poor packaging': 'logistics',
    'Temperature damage': 'logistics',
    'Expired or near expiry': 'quality',
    'Contamination': 'quality',
    'Quality below standards': 'quality',
    'Wrong item received': 'fulfillment',
    'Quantity shortage': 'fulfillment'
  };
  
  return categories[damageReason as keyof typeof categories] || 'other';
};

const createDamageAuditTrail = async (
  damageId: string,
  action: string,
  performedBy: string,
  details: string
): Promise<void> => {
  try {
    await supabase
      .from('damage_audit_trail')
      .insert({
        damage_id: damageId,
        action,
        performed_by: performedBy,
        details,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error creating damage audit trail:', error);
  }
};

export const getDamagedGoodsByGRN = async (grnId: string): Promise<DamagedGoodsRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('damaged_goods')
      .select('*')
      .eq('grn_id', grnId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching damaged goods by GRN:', error);
    return [];
  }
};

export const getPendingDamageDispositions = async (storeId?: string): Promise<DamagedGoodsRecord[]> => {
  try {
    let query = supabase
      .from('damaged_goods')
      .select(`
        *,
        grn:goods_received_notes(
          delivery_order:delivery_orders(
            purchase_order:purchase_orders(store_id)
          )
        )
      `)
      .eq('disposition', 'pending')
      .order('created_at', { ascending: false });

    if (storeId) {
      query = query.eq('grn.delivery_order.purchase_order.store_id', storeId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching pending damage dispositions:', error);
    return [];
  }
};
