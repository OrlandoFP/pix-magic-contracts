import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PaymentNotificationRequest {
  clientName: string;
  clientEmail: string;
  contractId: string;
  parkName: string;
  visitDate: string;
  receiptUrl: string;
  notifyEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("notify-payment-receipt function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      clientName, 
      clientEmail, 
      contractId, 
      parkName, 
      visitDate,
      receiptUrl,
      notifyEmail 
    }: PaymentNotificationRequest = await req.json();

    console.log("Sending payment notification email for contract:", contractId);
    console.log("Notifying:", notifyEmail);

    const emailResponse = await resend.emails.send({
      from: "Guia Disney <onboarding@resend.dev>",
      to: [notifyEmail],
      subject: `💰 Comprovante de Pagamento Recebido - ${clientName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #10b981; }
            .label { font-weight: bold; color: #059669; }
            .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Comprovante Recebido!</h1>
              <p>Um cliente enviou o comprovante de pagamento</p>
            </div>
            <div class="content">
              <div class="info-box">
                <p><span class="label">Cliente:</span> ${clientName}</p>
                <p><span class="label">Email:</span> ${clientEmail}</p>
                <p><span class="label">Parque:</span> ${parkName}</p>
                <p><span class="label">Data da Visita:</span> ${visitDate}</p>
                <p><span class="label">ID do Contrato:</span> ${contractId}</p>
              </div>
              
              <p>O cliente enviou o comprovante de pagamento e está aguardando confirmação.</p>
              
              <a href="${receiptUrl}" class="button" target="_blank">
                📄 Ver Comprovante
              </a>
              
              <div class="footer">
                <p>Este é um email automático do sistema de contratos.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in notify-payment-receipt function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
