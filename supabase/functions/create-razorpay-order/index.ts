import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Supabase environment is not configured on the server." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!razorpayKeyId || !razorpayKeySecret) {
      return new Response(
        JSON.stringify({ error: "Razorpay keys are not configured in Supabase Edge Function secrets." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired user session." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { address_id, coupon_code } = await req.json();
    if (!address_id || typeof address_id !== "string") {
      return new Response(
        JSON.stringify({ error: "Valid delivery address_id is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Validate cart, stock, coupon, and create pending order via user-scoped RPC
    const { data: order, error: orderErr } = await userClient.rpc("prepare_razorpay_order", {
      p_address_id: address_id,
      p_coupon_code: coupon_code || null,
    });

    if (orderErr || !order) {
      return new Response(
        JSON.stringify({ error: orderErr?.message || "Failed to prepare order." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amountPaise = Math.round(Number(order.total_amount) * 100);
    if (amountPaise < 100) {
      return new Response(
        JSON.stringify({ error: "Minimum payable amount for Razorpay is ₹1.00." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Create Razorpay Order server-side
    const basicAuth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const rzpResp = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: order.order_number,
        notes: {
          shmx_order_id: order.id,
          user_id: userData.user.id,
        },
      }),
    });

    const rzpData = await rzpResp.json();
    if (!rzpResp.ok || !rzpData.id) {
      return new Response(
        JSON.stringify({ error: rzpData?.error?.description || "Razorpay order creation failed." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Persist initial payment record using service role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    await adminClient.from("payments").insert({
      order_id: order.id,
      user_id: userData.user.id,
      provider: "razorpay",
      razorpay_order_id: rzpData.id,
      amount: order.total_amount,
      currency: "INR",
      status: "created",
    });

    return new Response(
      JSON.stringify({
        order_id: order.id,
        order_number: order.order_number,
        razorpay_order_id: rzpData.id,
        amount_paise: amountPaise,
        currency: "INR",
        key_id: razorpayKeyId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unexpected server error." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
