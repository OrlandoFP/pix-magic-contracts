import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_CONTRACT_TERMS } from "@/lib/contract-terms";
import { toast } from "sonner";

export function useContractTerms() {
  const [terms, setTerms] = useState(DEFAULT_CONTRACT_TERMS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTerms = async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("contract_terms")
        .eq("id", "default")
        .single();

      if (!error && data?.contract_terms) {
        setTerms(data.contract_terms);
      }
      setIsLoading(false);
    };
    fetchTerms();
  }, []);

  const saveTerms = async (newTerms: string) => {
    const { error } = await supabase
      .from("app_settings")
      .update({ contract_terms: newTerms, updated_at: new Date().toISOString() })
      .eq("id", "default");

    if (error) {
      toast.error("Erro ao salvar termos");
      return false;
    }
    setTerms(newTerms);
    toast.success("Termos atualizados globalmente!");
    return true;
  };

  return { terms, isLoading, saveTerms };
}
