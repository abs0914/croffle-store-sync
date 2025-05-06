
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

console.log("Edge function called: setup-users");

serve(async (req) => {
  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get the request body
    const requestBody = await req.json();
    console.log("Request body:", JSON.stringify(requestBody));

    // Extract the user ID from the request or JWT
    const targetUserId = requestBody.userId;
    console.log("Target user ID:", targetUserId);

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: "Missing user ID" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Setting up user with ID:", targetUserId);

    // First, fetch user details from auth.users via service_role client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: userData, error: userError } = await supabaseAdmin.auth
      .admin
      .getUserById(targetUserId);

    if (userError) {
      console.error("Error fetching user:", userError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch user" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!userData?.user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Found user:", userData.user.email);

    // Check if a profile already exists for this user
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", targetUserId)
      .single();

    if (!existingProfile) {
      // Create a new profile in the public schema
      const { data: newProfile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: targetUserId,
          email: userData.user.email,
          name: userData.user.user_metadata?.name || userData.user.email?.split("@")[0] || "User",
          role: "cashier", // Default role for new users
        })
        .select()
        .single();

      if (profileError) {
        console.error("Error creating profile:", profileError);
        return new Response(
          JSON.stringify({ error: "Failed to create user profile" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      console.log("Created new profile:", newProfile);
    }

    // Create a default store for new users if none exists
    const { data: existingStores } = await supabaseAdmin
      .from("stores")
      .select("*")
      .limit(1);

    let storeId;

    if (existingStores && existingStores.length > 0) {
      console.log("Using existing store with ID:", existingStores[0].id);
      storeId = existingStores[0].id;
    } else {
      // Create a default store
      const { data: newStore, error: storeError } = await supabaseAdmin
        .from("stores")
        .insert({
          name: "Main Store",
          address: "123 Main Street",
          phone: "555-123-4567",
          email: "store@example.com",
          is_active: true,
        })
        .select()
        .single();

      if (storeError) {
        console.error("Error creating store:", storeError);
        return new Response(
          JSON.stringify({ error: "Failed to create default store" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      console.log("Created new store:", newStore);
      storeId = newStore.id;
    }

    // Grant the user access to the store
    const { data: existingAccess } = await supabaseAdmin
      .from("user_store_access")
      .select("*")
      .eq("user_id", targetUserId)
      .eq("store_id", storeId)
      .maybeSingle();

    if (!existingAccess) {
      const { error: accessError } = await supabaseAdmin
        .from("user_store_access")
        .insert({
          user_id: targetUserId,
          store_id: storeId,
        });

      if (accessError) {
        console.error("Error granting store access:", accessError);
        return new Response(
          JSON.stringify({ error: "Failed to grant store access" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      console.log("Granted access to store:", storeId);
    } else {
      console.log("User already has access to store:", storeId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "User setup completed successfully",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
