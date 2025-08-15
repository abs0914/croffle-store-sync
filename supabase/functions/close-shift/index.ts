import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CloseShiftRequest {
  userId: string;
  endingCash?: number;
  endPhoto?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Close shift function called');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { userId, endingCash, endPhoto }: CloseShiftRequest = await req.json();

    console.log('📝 Request details:', { userId, endingCash });

    if (!userId) {
      console.error('❌ Missing userId');
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Find the active shift for this user
    console.log('🔍 Looking for active shift for user:', userId);
    const { data: activeShift, error: findError } = await supabase
      .from('shifts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (findError && findError.code !== 'PGRST116') {
      console.error('❌ Error finding active shift:', findError);
      return new Response(
        JSON.stringify({ error: 'Failed to find active shift', details: findError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!activeShift) {
      console.log('ℹ️ No active shift found for user');
      return new Response(
        JSON.stringify({ message: 'No active shift found for this user' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('📋 Found active shift:', {
      id: activeShift.id,
      startTime: activeShift.start_time,
      startingCash: activeShift.starting_cash
    });

    // Close the shift
    const currentTime = new Date().toISOString();
    const finalEndingCash = endingCash ?? activeShift.starting_cash; // Default to starting cash if not provided

    console.log('💰 Closing shift with ending cash:', finalEndingCash);

    const { data: updatedShift, error: updateError } = await supabase
      .from('shifts')
      .update({
        end_time: currentTime,
        status: 'closed',
        ending_cash: finalEndingCash,
        end_photo: endPhoto || null
      })
      .eq('id', activeShift.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error closing shift:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to close shift', details: updateError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Shift closed successfully:', updatedShift.id);

    // Calculate cash variance
    const cashVariance = finalEndingCash - activeShift.starting_cash;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Shift closed successfully',
        shift: {
          id: updatedShift.id,
          startTime: updatedShift.start_time,
          endTime: updatedShift.end_time,
          startingCash: updatedShift.starting_cash,
          endingCash: updatedShift.ending_cash,
          cashVariance: cashVariance,
          status: updatedShift.status
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});