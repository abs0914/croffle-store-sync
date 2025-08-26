import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Shift {
  id: string;
  user_id: string;
  store_id: string;
  start_time: string;
  starting_cash: number;
  cashier_id: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Starting auto-close shifts process...');

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Calculate the cutoff time (12 hours ago)
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 12);
    
    console.log(`🕐 Looking for shifts older than: ${cutoffTime.toISOString()}`);

    // Find active shifts older than 12 hours
    const { data: oldShifts, error: fetchError } = await supabase
      .from('shifts')
      .select('id, user_id, store_id, start_time, starting_cash, cashier_id')
      .eq('status', 'active')
      .lt('start_time', cutoffTime.toISOString());

    if (fetchError) {
      console.error('❌ Error fetching old shifts:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch shifts', details: fetchError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!oldShifts || oldShifts.length === 0) {
      console.log('✅ No shifts need auto-closing');
      return new Response(
        JSON.stringify({ 
          message: 'No shifts need auto-closing',
          processedCount: 0
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🔍 Found ${oldShifts.length} shifts to auto-close`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each shift
    for (const shift of oldShifts as Shift[]) {
      try {
        console.log(`🔄 Auto-closing shift ${shift.id}...`);

        // Calculate how long the shift has been open
        const shiftStart = new Date(shift.start_time);
        const hoursOpen = Math.floor((Date.now() - shiftStart.getTime()) / (1000 * 60 * 60));

        // Close the shift with ending cash equal to starting cash (no transactions assumed)
        const { data: updatedShift, error: updateError } = await supabase
          .from('shifts')
          .update({
            status: 'closed',
            end_time: new Date().toISOString(),
            ending_cash: shift.starting_cash, // Assume no cash changes for auto-closed shifts
            end_photo: null // No photo for auto-closed shifts
          })
          .eq('id', shift.id)
          .eq('status', 'active') // Double-check it's still active
          .select()
          .single();

        if (updateError) {
          console.error(`❌ Error closing shift ${shift.id}:`, updateError);
          errorCount++;
          results.push({
            shiftId: shift.id,
            status: 'error',
            error: updateError.message,
            hoursOpen
          });
          continue;
        }

        // Log the auto-closure for audit purposes
        await supabase.functions.invoke('log-bir-audit', {
          body: {
            storeId: shift.store_id,
            logType: 'system',
            eventName: 'shift_auto_closed',
            eventData: {
              shiftId: shift.id,
              userId: shift.user_id,
              cashierId: shift.cashier_id,
              hoursOpen,
              startTime: shift.start_time,
              endTime: new Date().toISOString(),
              reason: 'Automatic closure after 12 hours',
              startingCash: shift.starting_cash,
              endingCash: shift.starting_cash
            },
            userId: null, // System action
            cashierName: 'SYSTEM',
            terminalId: 'SYSTEM-AUTO-CLOSE'
          }
        });

        console.log(`✅ Successfully auto-closed shift ${shift.id} (was open for ${hoursOpen} hours)`);
        successCount++;
        results.push({
          shiftId: shift.id,
          status: 'closed',
          hoursOpen,
          startingCash: shift.starting_cash,
          endingCash: shift.starting_cash
        });

      } catch (error) {
        console.error(`❌ Unexpected error processing shift ${shift.id}:`, error);
        errorCount++;
        results.push({
          shiftId: shift.id,
          status: 'error',
          error: error.message
        });
      }
    }

    const summary = {
      totalProcessed: oldShifts.length,
      successCount,
      errorCount,
      results
    };

    console.log('📊 Auto-close shifts summary:', summary);

    return new Response(
      JSON.stringify({
        message: `Auto-close process completed. ${successCount} shifts closed, ${errorCount} errors.`,
        ...summary
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Unexpected error in auto-close shifts:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});