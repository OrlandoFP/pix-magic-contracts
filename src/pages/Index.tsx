import { FileText, Shield, Zap, Download } from "lucide-react";
import { ContractForm } from "@/components/ContractForm";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="gradient-hero text-primary-foreground py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/20 text-gold-light text-sm font-medium mb-6">
                <Zap className="h-4 w-4" />
                Geração Automática de Contratos
              </div>
            </div>
            
            <h1 className="animate-slide-up font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Contratos de Guiamento
              <span className="block text-gradient-gold">Disney</span>
            </h1>
            
            <p className="animate-slide-up text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-8" style={{ animationDelay: '0.1s' }}>
              Gere contratos profissionais em PDF automaticamente. 
              Preencha os dados do cliente e baixe o documento pronto para assinatura.
            </p>

            <div className="animate-slide-up flex flex-wrap justify-center gap-6 text-sm" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center gap-2 text-primary-foreground/80">
                <Shield className="h-5 w-5 text-gold" />
                <span>Dados Seguros</span>
              </div>
              <div className="flex items-center gap-2 text-primary-foreground/80">
                <FileText className="h-5 w-5 text-gold" />
                <span>PDF Profissional</span>
              </div>
              <div className="flex items-center gap-2 text-primary-foreground/80">
                <Download className="h-5 w-5 text-gold" />
                <span>Download Instantâneo</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Form Section */}
      <main className="container mx-auto px-4 py-12 lg:py-20">
        <div className="max-w-3xl mx-auto">
          <div className="animate-scale-in bg-card rounded-2xl shadow-elevated p-6 md:p-10 border border-border">
            <div className="text-center mb-10">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">
                Preencha os Dados do Contrato
              </h2>
              <p className="text-muted-foreground">
                Todos os campos marcados com * são obrigatórios
              </p>
            </div>

            <ContractForm />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Sistema de Contratos de Guiamento Disney. 
            Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
