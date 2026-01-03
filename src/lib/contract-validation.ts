import { z } from "zod";

export const contractFormSchema = z.object({
  nomeCompleto: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres").max(100, "Nome deve ter no máximo 100 caracteres"),
  cpf: z.string().trim().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/, "CPF inválido"),
  endereco: z.string().trim().min(10, "Endereço deve ter pelo menos 10 caracteres").max(200, "Endereço deve ter no máximo 200 caracteres"),
  cep: z.string().trim().regex(/^\d{5}-?\d{3}$/, "CEP inválido"),
  email: z.string().trim().email("E-mail inválido").max(255, "E-mail deve ter no máximo 255 caracteres"),
  telefone: z.string().trim().regex(/^\(?[1-9]{2}\)?\s?(?:9\d{4}|[2-9]\d{3})-?\d{4}$/, "Telefone inválido"),
  nomeGuia: z.string().trim().min(2, "Nome do guia deve ter pelo menos 2 caracteres").max(100, "Nome do guia deve ter no máximo 100 caracteres"),
  valor: z.string().trim().regex(/^\d+([.,]\d{1,2})?$/, "Valor inválido"),
  datasRequeridas: z.string().trim().optional(),
});

export type ContractFormData = z.infer<typeof contractFormSchema>;

export function formatCPF(value: string): string {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
}

export function formatCEP(value: string): string {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 5) return numbers;
  return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
}

export function formatPhone(value: string): string {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
}

export function formatCurrency(value: string): string {
  const numbers = value.replace(/\D/g, '');
  if (!numbers) return '';
  const amount = parseInt(numbers) / 100;
  return amount.toFixed(2).replace('.', ',');
}
