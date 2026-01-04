import { FileText, Shield, Zap, Download, Database } from "lucide-react";
import { ContractForm } from "@/components/ContractForm";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="gradient-hero text-primary-foreground py-20 lg:py-32 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gold/5 blur-3xl floating" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-gold/5 blur-3xl floating" style={{ animationDelay: '-3s' }} />
          <div className="absolute top-1/2 left-1/4 w-2 h-2 rounded-full bg-gold/30 floating" style={{ animationDelay: '-1s' }} />
          <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 rounded-full bg-gold/20 floating" style={{ animationDelay: '-2s' }} />
          <div className="absolute bottom-1/4 right-1/4 w-1 h-1 rounded-full bg-gold/40 floating" style={{ animationDelay: '-4s' }} />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-effect text-gold-light text-sm font-medium mb-8 glow-gold shimmer-effect">
                <Zap className="h-4 w-4" />
                Geração Automática de Contratos
              </div>
            </div>
            
            <h1 className="animate-slide-up font-display text-5xl md:text-6xl lg:text-7xl font-bold mb-8 leading-[1.1] tracking-tight">
              Contratos de Guiamento
              <span className="block text-gradient-gold mt-2">Disney</span>
            </h1>
            
            <p className="animate-slide-up text-lg md:text-xl text-primary-foreground/70 max-w-2xl mx-auto mb-12 leading-relaxed" style={{ animationDelay: '0.1s' }}>
              Gere contratos profissionais em PDF automaticamente. 
              Preencha os dados do cliente e baixe o documento pronto para assinatura.
            </p>

            <div className="animate-slide-up flex flex-wrap justify-center gap-8 text-sm" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center gap-3 glass-effect px-5 py-3 rounded-xl">
                <Shield className="h-5 w-5 text-gold" />
                <span className="text-primary-foreground/90">Dados Seguros</span>
              </div>
              <div className="flex items-center gap-3 glass-effect px-5 py-3 rounded-xl">
                <FileText className="h-5 w-5 text-gold" />
                <span className="text-primary-foreground/90">PDF Profissional</span>
              </div>
              <div className="flex items-center gap-3 glass-effect px-5 py-3 rounded-xl">
                <Download className="h-5 w-5 text-gold" />
                <span className="text-primary-foreground/90">Download Instantâneo</span>
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
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Sistema de Contratos de Guiamento Disney. 
            Todos os direitos reservados.
          </p>
          <Link
            to="/contratos"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Database className="h-4 w-4" />
            Ver Contratos Salvos
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default Index;
