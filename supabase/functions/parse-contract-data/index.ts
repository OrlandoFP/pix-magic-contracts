import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rawText } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Você é um assistente especializado em extrair dados de contratos de guiamento Disney.
Extraia os seguintes campos do texto fornecido e retorne um JSON válido:

- nomeCompleto: nome completo do cliente
- email: email do cliente
- cpf: CPF do cliente (apenas números, formato XXX.XXX.XXX-XX)
- telefone: telefone com DDD (formato (XX) XXXXX-XXXX)
- cep: CEP (formato XXXXX-XXX)
- endereco: endereço completo
- parkDates: array de objetos com parkId e date para cada parque mencionado. Use estes IDs exatos:
  - "magic-kingdom" para Magic Kingdom
  - "epcot" para EPCOT
  - "hollywood-studios" para Hollywood Studios
  - "animal-kingdom" para Animal Kingdom
  - "epic-universe" para EPIC Universe
  - "universal-studios" para Universal Studios
  - "islands-adventure" para Islands of Adventure
  Formato de cada item: { "parkId": "magic-kingdom", "date": "2025-01-15" } (use formato ISO YYYY-MM-DD)
  
Exemplo de parkDates: [{"parkId": "magic-kingdom", "date": "2025-01-07"}, {"parkId": "epcot", "date": "2025-01-08"}]

Se um campo não for encontrado, deixe como string vazia ou array vazio para parkDates.
Retorne APENAS o JSON, sem explicações.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: rawText },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos à sua conta." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao processar com IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Extract JSON from the response
    let parsedData;
    try {
      // Try to find JSON in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError, content);
      return new Response(JSON.stringify({ error: "Erro ao interpretar resposta da IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data: parsedData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("parse-contract-data error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
