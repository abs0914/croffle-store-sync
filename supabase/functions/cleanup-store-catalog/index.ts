import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CleanupRequest {
  storeId: string
  productsToDelete: string[]
  productsToAdd: Array<{
    product_name: string
    price: number
    category_id: string
    description?: string
  }>
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { storeId, productsToDelete, productsToAdd }: CleanupRequest = await req.json()

    console.log(`Starting cleanup for store ${storeId}`)
    console.log(`Products to delete: ${productsToDelete.length}`)
    console.log(`Products to add: ${productsToAdd.length}`)

    const results = {
      deleted: 0,
      added: 0,
      errors: [] as string[]
    }

    // Delete duplicate products
    if (productsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('product_catalog')
        .delete()
        .in('id', productsToDelete)

      if (deleteError) {
        console.error('Delete error:', deleteError)
        results.errors.push(`Delete error: ${deleteError.message}`)
      } else {
        results.deleted = productsToDelete.length
        console.log(`Successfully deleted ${productsToDelete.length} products`)
      }
    }

    // Add missing products
    if (productsToAdd.length > 0) {
      const productsWithDefaults = productsToAdd.map(product => ({
        ...product,
        store_id: storeId,
        is_available: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { data: addedProducts, error: addError } = await supabase
        .from('product_catalog')
        .insert(productsWithDefaults)
        .select()

      if (addError) {
        console.error('Add error:', addError)
        results.errors.push(`Add error: ${addError.message}`)
      } else {
        results.added = addedProducts?.length || 0
        console.log(`Successfully added ${results.added} products`)
      }
    }

    console.log('Cleanup completed:', results)

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Cleanup function error:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      deleted: 0,
      added: 0,
      errors: [error.message]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})