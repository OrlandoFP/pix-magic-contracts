import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  password: string;
  nome_completo: string;
  cpf: string;
  telefone: string;
  contract_id: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: CreateUserRequest = await req.json();
    
    console.log("Received user creation request for:", data.email);

    // Validate required fields
    if (!data.email || !data.password || !data.nome_completo) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, password, nome_completo" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Here you would create the user in your system
    // For now, we'll just log and return success
    // You can add your user creation logic here
    
    console.log("User credentials received successfully:", {
      email: data.email,
      nome_completo: data.nome_completo,
      cpf: data.cpf,
      contract_id: data.contract_id,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "User credentials received",
        data: {
          email: data.email,
          nome_completo: data.nome_completo,
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
