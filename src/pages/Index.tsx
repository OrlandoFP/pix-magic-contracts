import { Database } from "lucide-react";
import { ContractForm } from "@/components/ContractForm";
import { Link } from "react-router-dom";
import logoOrlandoFastPass from "@/assets/logo-orlando-fast-pass.png";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <nav className="gradient-hero py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="font-display text-xl font-bold text-primary-foreground">
            Contratos Disney
          </h1>
          <Link
            to="/contratos"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg glass-effect text-gold-light text-sm font-medium hover:bg-white/10 transition-colors"
          >
            <Database className="h-4 w-4" />
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="gradient-hero text-primary-foreground py-10 lg:py-16 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gold/5 blur-3xl floating" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-gold/5 blur-3xl floating" style={{ animationDelay: '-3s' }} />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <img 
              src={logoOrlandoFastPass} 
              alt="Contrato Orlando Fast Pass" 
              className="mx-auto h-40 md:h-52 lg:h-64 w-auto mb-6 animate-slide-up drop-shadow-2xl"
            />
            
            <p className="animate-slide-up text-base md:text-lg text-primary-foreground/70 max-w-xl mx-auto leading-relaxed" style={{ animationDelay: '0.1s' }}>
              Gere contratos profissionais em PDF automaticamente.
            </p>
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
