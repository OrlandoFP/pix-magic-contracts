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
    const body = await req.json().catch(() => ({}));
    const rawText = typeof body?.rawText === "string" ? body.rawText.trim() : "";

    if (!rawText) {
      return new Response(JSON.stringify({ error: "rawText inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Basic safety limit to avoid abuse / oversized prompts
    if (rawText.length > 10000) {
      return new Response(JSON.stringify({ error: "Texto muito longo para processar" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get current date for context
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    const systemPrompt = `Você é um assistente especializado em extrair dados de formulários de reserva de guiamento Disney/Orlando.

DATA DE HOJE: ${currentDay}/${currentMonth}/${currentYear}

REGRAS CRÍTICAS PARA DATAS:
1. O cliente geralmente informa datas FUTURAS (próximas semanas ou meses)
2. Se o mês não for informado, assuma o próximo mês que faça sentido (não meses passados)
3. Se o ano não for informado:
   - Se a data (dia/mês) ainda não passou este ano, use ${currentYear}
   - Se a data já passou este ano, use ${currentYear + 1}
4. Formatos aceitos: "7/jan", "07/01", "7 de janeiro", "dia 7", etc.
5. MUITO IMPORTANTE: Converta SEMPRE para formato YYYY-MM-DD

EXEMPLOS de conversão (considerando hoje ${currentDay}/${currentMonth}/${currentYear}):
- "7/jan" ou "07/01" → "${currentMonth > 1 ? currentYear + 1 : currentYear}-01-07"
- "15/02" → "${currentMonth > 2 ? currentYear + 1 : currentYear}-02-15"
- "dia 20 de março" → "${currentMonth > 3 ? currentYear + 1 : currentYear}-03-20"

IDs dos parques (use EXATAMENTE estes):
- magic-kingdom → Magic Kingdom
- epcot → EPCOT  
- hollywood-studios → Hollywood Studios
- animal-kingdom → Animal Kingdom
- epic-universe → Epic Universe
- universal-studios → Universal Studios
- islands-adventure → Islands of Adventure

IGNORE parques sem data preenchida.`;

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
          { role: "user", content: `Extraia os dados do seguinte texto:\n\n${rawText}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_contract_data",
              description: "Extrai dados estruturados de um formulário de reserva de guiamento Disney",
              parameters: {
                type: "object",
                properties: {
                  nomeCompleto: { 
                    type: "string", 
                    description: "Nome completo do cliente" 
                  },
                  email: { 
                    type: "string", 
                    description: "E-mail do cliente" 
                  },
                  cpf: { 
                    type: "string", 
                    description: "CPF formatado XXX.XXX.XXX-XX" 
                  },
                  telefone: { 
                    type: "string", 
                    description: "Telefone com DDD (XX) XXXXX-XXXX" 
                  },
                  cep: { 
                    type: "string", 
                    description: "CEP formatado XXXXX-XXX" 
                  },
                  endereco: { 
                    type: "string", 
                    description: "Endereço completo" 
                  },
                  quantidadePessoas: { 
                    type: "integer", 
                    description: "Número de pessoas (default 1)" 
                  },
                  hospedeDisney: { 
                    type: "boolean", 
                    description: "Se é hóspede Disney (true/false)" 
                  },
                  nomeGuia: { 
                    type: "string", 
                    description: "Nome do guia se informado" 
                  },
                  parkDates: {
                    type: "array",
                    description: "Array de parques com suas datas",
                    items: {
                      type: "object",
                      properties: {
                        parkId: { 
                          type: "string", 
                          enum: ["magic-kingdom", "epcot", "hollywood-studios", "animal-kingdom", "epic-universe", "universal-studios", "islands-adventure"],
                          description: "ID do parque" 
                        },
                        date: { 
                          type: "string", 
                          description: "Data no formato YYYY-MM-DD" 
                        }
                      },
                      required: ["parkId", "date"]
                    }
                  }
                },
                required: ["nomeCompleto"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_contract_data" } },
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
    
    // Extract data from tool call
    let parsedData;
    try {
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall && toolCall.function?.arguments) {
        parsedData = JSON.parse(toolCall.function.arguments);
      } else {
        // Fallback: try to parse from content
        const content = data.choices?.[0]?.message?.content || "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No structured data found in response");
        }
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
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