import { useState, useRef } from "react";
import { Upload, FileText, X, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DocumentUploadProps {
  contractId: string;
  label: string;
  currentUrl: string | null;
  fieldName: "signed_contract_url" | "payment_receipt_url";
  onUploadComplete: (url: string) => void;
}

export function DocumentUpload({
  contractId,
  label,
  currentUrl,
  fieldName,
  onUploadComplete,
}: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Formato inválido. Use PDF, JPG, PNG ou WEBP.");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${contractId}/${fieldName}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("contract-documents")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("contract-documents")
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      // Update contract with the URL
      const { error: updateError } = await supabase
        .from("contracts")
        .update({ [fieldName]: publicUrl })
        .eq("id", contractId);

      if (updateError) throw updateError;

      onUploadComplete(publicUrl);
      toast.success("Documento enviado com sucesso!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao enviar documento.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    try {
      const { error } = await supabase
        .from("contracts")
        .update({ [fieldName]: null })
        .eq("id", contractId);

      if (error) throw error;

      onUploadComplete("");
      toast.success("Documento removido.");
    } catch (error) {
      console.error("Remove error:", error);
      toast.error("Erro ao remover documento.");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  if (currentUrl) {
    return (
      <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border border-green-200 dark:border-green-900">
        <p className="text-xs text-green-600 dark:text-green-400 font-semibold uppercase tracking-wide mb-2">
          {label}
        </p>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-sm text-green-700 dark:text-green-300 flex-1">
            Documento anexado
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-green-600 hover:text-green-700"
            onClick={() => window.open(currentUrl, "_blank")}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-red-500 hover:text-red-600"
            onClick={handleRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border-2 border-dashed p-4 text-center transition-colors cursor-pointer ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={handleFileChange}
      />
      
      {isUploading ? (
        <div className="flex flex-col items-center gap-2 py-2">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground">Enviando...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-2">
          <Upload className="h-6 w-6 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-[10px] text-muted-foreground/70">
            Arraste ou clique (PDF, JPG, PNG)
          </p>
        </div>
      )}
    </div>
  );
}