import { jsPDF } from "jspdf";

interface ContractData {
  nomeCompleto: string;
  cpf: string;
  endereco: string;
  cep: string;
  email: string;
  telefone: string;
  datasRequeridas: string;
  nomeGuia: string;
  quantidadeDias: string;
  valor: string;
  quantidadePessoas?: string;
}

const CONTRACT_TERMS = `Serviço de compra e agendamento virtual das filas expressas: Lightning Lane Single Pass e Lightning Lane Multi Pass.

O valor do Lightning Lane Multi Pass é individual e por parque e será pago diretamente para a Disney (realizamos a compra). Pode variar entre $15 e $30 por dia e por pessoa e só é confirmado no dia da utilização.

O valor do Lightning Lane Single Pass é individual e por parque e será pago diretamente para a Disney (realizamos a compra). Pode variar entre $8 e $29 por dia e por pessoa e só é confirmado no dia da utilização.

Ou seja, o valor do nosso serviço NÃO INCLUI o Lightning Lane Single Pass nem o Lightning Lane Multi Pass, os quais são serviços distintos. Valores do Lightning Lane Multi Pass e do Lightning Lane Single Pass podem variar sem aviso prévio.

No dia a ser utilizado, compraremos o Lightning Lane Multi Pass ou Lightning Lane Single Pass (ou ambos, quem determinará é você) através do seu APP MY DISNEY EXPERIENCE para todo o grupo/família, e fazer todos os agendamentos possíveis durante o seu dia de parque. O horário é válido desde as 7h da manhã (horário que pode ser feito o primeiro agendamento) até as 18h.

Para essa compra ser realizada, precisamos linkar seus dados bancários à sua conta do APP, por isso, no dia anterior à compra, solicitaremos os dados necessários para a realização da mesma. Esse serviço pode ser utilizado nos quatro parques da Disney, sendo apenas um parque por dia. Não fazemos esse tipo de serviço para ingressos Park Hopper.

Através do WhatsApp criaremos um grupo com no máximo duas pessoas do grupo/família, pois caso uma das pessoas perca o sinal, seguimos com a comunicação. Todas as marcações e entradas nas atrações devem e serão comunicadas através do grupo criado no WhatsApp.

O horário de compra do serviço e agendamento das primeiras atrações é sempre (07h00) da manhã, 3 ou 7 dias antes do primeiro dia de parque (03 dias antes para hóspedes externos e 07 dias antes para hóspedes Disney).

OBS 1: O dia de parque já deve estar agendado e todo o grupo deve estar na mesma conta. Não fazemos sincronização de contas quando pessoas do mesmo grupo estão em contas diferentes.

OBS 2: Ao haver cancelamento em até 10 dias antes do serviço, será cobrado uma multa de 50% do valor, após esse período, o valor não será estornado.

OBS 3: Caso o grupo/família ou algum membro deixe de comparecer ao parque por qualquer motivo, o valor não é estornado, pois deixaremos aquele dia e alguém da nossa equipe disponível para realizar o serviço para você.

NÃO GARANTIMOS NENHUM AGENDAMENTO DE ATRAÇÃO ESPECÍFICA, mas faremos de tudo para conseguir as melhores. As atrações são agendadas sempre conforme a disponibilidade do sistema da Disney.

Agendamento e guiamento serão feitos até as 18h, podendo ser estendido.`;

// Colors
const NAVY = [26, 42, 74] as const;
const GOLD = [212, 175, 55] as const;
const DARK_TEXT = [40, 40, 40] as const;
const LIGHT_TEXT = [100, 100, 100] as const;

export function generateContractPDF(data: ContractData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  // ============ PAGE 1 ============
  renderPage1(doc, data, pageWidth, pageHeight, margin, contentWidth);

  // ============ PAGE 2 ============
  doc.addPage();
  renderPage2(doc, data, pageWidth, pageHeight, margin, contentWidth);

  // Footer on all pages
  addFooter(doc, pageWidth, pageHeight);

  return doc;
}

function renderPage1(
  doc: jsPDF,
  data: ContractData,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  contentWidth: number
) {
  let y = 20;

  // Header - Company Name
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("Orlando Fast Pass", pageWidth / 2, y, { align: "center" });

  y += 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...GOLD);
  doc.text("A Magia da Disney nas suas mãos", pageWidth / 2, y, { align: "center" });

  // Gold line separator
  y += 8;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.line(margin + 40, y, pageWidth - margin - 40, y);

  // Contract Title
  y += 15;
  doc.setFillColor(...NAVY);
  doc.roundedRect(margin, y - 6, contentWidth, 14, 2, 2, "F");
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("CONTRATO DE PRESTAÇÃO DE SERVIÇOS", pageWidth / 2, y + 3, { align: "center" });

  // Section 1 - Dados do Viajante
  y += 25;
  renderSectionHeader(doc, "1. DADOS DO VIAJANTE (CONTRATANTE)", margin, y);

  y += 12;
  const clientData = [
    { label: "Cliente:", value: data.nomeCompleto },
    { label: "CPF:", value: data.cpf },
    { label: "Endereço:", value: data.endereco || "-" },
    { label: "E-mail:", value: data.email },
    { label: "Telefone:", value: data.telefone },
    { label: "CEP:", value: data.cep || "-" },
  ];

  clientData.forEach((item) => {
    renderLabelValue(doc, item.label, item.value, margin, y, contentWidth);
    y += 8;
  });

  // Section 2 - Dados da Contratada
  y += 8;
  renderSectionHeader(doc, "2. DADOS DA CONTRATADA (ORLANDO FAST PASS)", margin, y);

  y += 12;
  const companyData = [
    { label: "Razão Social:", value: "Orlando Fast Pass" },
    { label: "CNPJ:", value: "33.142.150/0001-99" },
    { label: "Endereço:", value: "Rua Nossa Senhora das Mercês, 628 - Vila das Mercês - São Paulo/SP" },
  ];

  companyData.forEach((item) => {
    renderLabelValue(doc, item.label, item.value, margin, y, contentWidth);
    y += 8;
  });

  // Section 3 - Detalhes da Aventura
  y += 8;
  renderSectionHeader(doc, "3. DETALHES DA AVENTURA", margin, y);

  y += 12;
  const serviceData = [
    { label: "Guia Mágico:", value: data.nomeGuia },
    { label: "Pessoas:", value: data.quantidadePessoas || "-" },
    { label: "Parques:", value: data.datasRequeridas },
    { label: "Qtd Dias:", value: data.quantidadeDias },
    { label: "Valor Total:", value: `R$ ${data.valor}` },
  ];

  serviceData.forEach((item) => {
    renderLabelValue(doc, item.label, item.value, margin, y, contentWidth);
    y += 8;
  });

  // Section 4 - Observações
  y += 8;
  renderSectionHeader(doc, "4. OBSERVAÇÕES E SOLICITAÇÕES", margin, y);

  y += 12;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK_TEXT);
  doc.text("Serviço de compra e agendamento virtual das filas expressas: Lightning Lane Single Pass e Lightning Lane Multi Pass.", margin, y, {
    maxWidth: contentWidth
  });

  // Decorative bottom border
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(2);
  doc.line(0, pageHeight - 10, pageWidth, pageHeight - 10);
}

function renderPage2(
  doc: jsPDF,
  data: ContractData,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  contentWidth: number
) {
  let y = 20;

  // Header
  doc.setFillColor(...NAVY);
  doc.roundedRect(margin, y - 6, contentWidth, 14, 2, 2, "F");
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("DIZERES, TERMOS E CONDIÇÕES", pageWidth / 2, y + 3, { align: "center" });

  y += 20;

  // Terms text
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK_TEXT);

  const lines = doc.splitTextToSize(CONTRACT_TERMS, contentWidth);
  lines.forEach((line: string) => {
    if (y > pageHeight - 80) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, margin, y);
    y += 4;
  });

  // Signature Section
  y = pageHeight - 70;
  
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.5);

  // Left signature - Guide
  const leftCenter = margin + 45;
  doc.line(margin, y, margin + 90, y);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text(data.nomeGuia, leftCenter, y + 8, { align: "center" });
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...LIGHT_TEXT);
  doc.text("Assinatura do Contratante", leftCenter, y + 14, { align: "center" });

  // Right signature - Company
  const rightCenter = pageWidth - margin - 45;
  doc.line(pageWidth - margin - 90, y, pageWidth - margin, y);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("Orlando Fast Pass", rightCenter, y + 8, { align: "center" });
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...LIGHT_TEXT);
  doc.text("CONSULTORIA E ESTRATÉGIA MÁGICA", rightCenter, y + 14, { align: "center" });

  // Client name below left signature
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK_TEXT);
  doc.text(data.nomeCompleto.toUpperCase(), leftCenter, y + 22, { align: "center" });

  // Decorative bottom border
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(2);
  doc.line(0, pageHeight - 10, pageWidth, pageHeight - 10);
}

function renderSectionHeader(doc: jsPDF, text: string, x: number, y: number) {
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text(text, x, y);

  // Gold underline
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(x, y + 2, x + doc.getTextWidth(text), y + 2);
}

function renderLabelValue(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  maxWidth: number
) {
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...LIGHT_TEXT);
  doc.text(label, x, y);

  const labelWidth = doc.getTextWidth(label) + 3;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK_TEXT);
  
  // Handle long values
  const availableWidth = maxWidth - labelWidth;
  const lines = doc.splitTextToSize(value, availableWidth);
  doc.text(lines[0] || "-", x + labelWidth, y);
}

function addFooter(doc: jsPDF, pageWidth: number, pageHeight: number) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...LIGHT_TEXT);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pageHeight - 15,
      { align: "center" }
    );
  }
}

export function downloadContractPDF(data: ContractData): void {
  const doc = generateContractPDF(data);
  const fileName = `OFP_Contrato_${data.nomeCompleto.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}

export function getContractPDFBlob(data: ContractData): Blob {
  const doc = generateContractPDF(data);
  return doc.output('blob');
}
