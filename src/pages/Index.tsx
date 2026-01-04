import { Database, Sparkles, ArrowRight } from "lucide-react";
import { ContractForm } from "@/components/ContractForm";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-hero flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">Contratos Disney</span>
          </div>
          <Link
            to="/contratos"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all duration-200 shadow-soft hover:shadow-elevated"
          >
            <Database className="h-4 w-4" />
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-28 pb-12 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 gradient-mesh opacity-50" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-72 h-72 rounded-full bg-primary/10 blur-3xl floating" />
          <div className="absolute top-40 right-1/4 w-96 h-96 rounded-full bg-accent/10 blur-3xl floating" style={{ animationDelay: '-2s' }} />
          <div className="absolute -bottom-20 left-1/2 w-80 h-80 rounded-full bg-primary/5 blur-3xl floating" style={{ animationDelay: '-4s' }} />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="animate-fade-in inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/20">
              <Sparkles className="h-4 w-4" />
              Geração Automática de Contratos
            </div>
            
            <h1 className="animate-slide-up text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-[1.1] text-foreground">
              Contratos de Guiamento{" "}
              <span className="text-gradient-primary">Disney</span>
            </h1>
            
            <p className="animate-slide-up text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed" style={{ animationDelay: '0.1s' }}>
              Gere contratos profissionais em PDF automaticamente. 
              Simples, rápido e seguro.
            </p>
          </div>
        </div>
      </header>

      {/* Form Section */}
      <main className="container mx-auto px-4 pb-20">
        <div className="max-w-3xl mx-auto">
          <div className="animate-scale-in card-modern p-8 md:p-10">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Dados do Contrato
              </h2>
              <p className="text-muted-foreground">
                Campos com * são obrigatórios
              </p>
            </div>

            <ContractForm />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Sistema de Contratos de Guiamento Disney
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;