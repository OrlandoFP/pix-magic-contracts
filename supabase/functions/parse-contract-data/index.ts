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

    const systemPrompt = `Você é um assistente especializado em extrair dados de formulários de reserva de guiamento Disney/Orlando.

O texto segue este formato de template:
- DADOS PESSOAIS: Nome completo, CPF, E-mail, Telefone, Endereço completo, CEP, Quantidade de pessoas
- PARQUES E DATAS: Lista de parques onde o cliente preenche a data de visita (formato DD/MM/YYYY ou DD/MM/YY)
- INFORMAÇÕES ADICIONAIS: Hóspede Disney (Sim/Não), Nome do guia

Extraia e retorne um JSON com:

- nomeCompleto: nome completo do cliente
- email: email do cliente  
- cpf: CPF (mantenha formatação XXX.XXX.XXX-XX se presente)
- telefone: telefone com DDD (formato (XX) XXXXX-XXXX)
- cep: CEP (formato XXXXX-XXX)
- endereco: endereço completo
- quantidadePessoas: número de pessoas (integer, default 1 se não informado)
- hospedeDisney: boolean (true se "Sim", false se "Não" ou não informado)
- nomeGuia: nome do guia se informado
- parkDates: array de objetos para cada parque COM DATA preenchida. Use estes IDs:
  - "magic-kingdom" para Magic Kingdom
  - "epcot" para EPCOT
  - "hollywood-studios" para Hollywood Studios
  - "animal-kingdom" para Animal Kingdom
  - "epic-universe" para Epic Universe
  - "universal-studios" para Universal Studios
  - "islands-adventure" para Islands of Adventure
  IMPORTANTE: Converta datas de DD/MM/YYYY para formato ISO YYYY-MM-DD
  Exemplo: "15/01/2025" → "2025-01-15"
  
  Formato: { "parkId": "magic-kingdom", "date": "2025-01-15" }

IGNORE parques sem data preenchida (linhas com apenas ":" ou vazias).
Retorne APENAS o JSON válido, sem explicações ou markdown.`;

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
