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
  datas?: string;
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

// Colors matching the original PDF
const PURPLE = [128, 0, 128] as const; // Purple/Magenta for headers
const GOLD_BORDER = [218, 165, 32] as const; // Gold for page border
const BLACK = [0, 0, 0] as const;
const GRAY = [100, 100, 100] as const;

export function generateContractPDF(data: ContractData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // ============ PAGE 1 ============
  renderPage1(doc, data, pageWidth, pageHeight, margin);

  // ============ PAGE 2 ============
  doc.addPage();
  renderPage2(doc, data, pageWidth, pageHeight, margin);

  return doc;
}

function drawPageBorder(doc: jsPDF, pageWidth: number, pageHeight: number) {
  // Gold/yellow border around the page
  doc.setDrawColor(...GOLD_BORDER);
  doc.setLineWidth(3);
  doc.rect(5, 5, pageWidth - 10, pageHeight - 10);
}

function renderPage1(
  doc: jsPDF,
  data: ContractData,
  pageWidth: number,
  pageHeight: number,
  margin: number
) {
  drawPageBorder(doc, pageWidth, pageHeight);

  const contentWidth = pageWidth - 2 * margin;
  let y = 25;

  // Header - Company Name in italic purple
  doc.setFontSize(32);
  doc.setFont("times", "italic");
  doc.setTextColor(...PURPLE);
  doc.text("Orlando Fast Pass", pageWidth / 2, y, { align: "center" });

  // Tagline
  y += 10;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text("A Magia da Disney nas suas mãos", pageWidth / 2, y, { align: "center" });

  // Line separator
  y += 10;
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.5);
  doc.line(margin + 30, y, pageWidth - margin - 30, y);

  // Contract Title
  y += 15;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLACK);
  doc.text("CONTRATO DE PRESTAÇÃO DE SERVIÇOS", pageWidth / 2, y, { align: "center" });

  // Section 1 - Dados do Viajante
  y += 15;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PURPLE);
  doc.text("1. DADOS DO VIAJANTE (CONTRATANTE)", margin, y);

  // Table for client data
  y += 8;
  const tableStartY = y;
  const rowHeight = 12;
  const col1Width = 80;
  const col2Width = contentWidth - col1Width;

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.3);

  // Row 1: Cliente | CPF
  drawTableRow(doc, margin, y, col1Width, rowHeight, "Cliente:", data.nomeCompleto);
  drawTableRow(doc, margin + col1Width, y, col2Width, rowHeight, "CPF:", data.cpf);
  y += rowHeight;

  // Row 2: Endereço (full width)
  drawTableRow(doc, margin, y, contentWidth, rowHeight, "Endereço:", data.endereco || "");
  y += rowHeight;

  // Row 3: E-mail | Telefone
  drawTableRow(doc, margin, y, col1Width, rowHeight, "E-mail:", data.email || "");
  drawTableRow(doc, margin + col1Width, y, col2Width, rowHeight, "Telefone:", data.telefone);
  y += rowHeight;

  // Row 4: CEP (full width)
  drawTableRow(doc, margin, y, contentWidth, rowHeight, "CEP:", data.cep || "");
  y += rowHeight;

  // Section 2 - Dados da Contratada
  y += 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PURPLE);
  doc.text("2. DADOS DA CONTRATADA (ORLANDO FAST PASS)", margin, y);

  y += 8;
  // Row 1: Razão Social | CNPJ
  drawTableRow(doc, margin, y, col1Width, rowHeight, "Razão Social:", "Orlando Fast Pass");
  drawTableRow(doc, margin + col1Width, y, col2Width, rowHeight, "CNPJ:", "33.142.150/0001-99");
  y += rowHeight;

  // Row 2: Endereço (full width)
  drawTableRow(doc, margin, y, contentWidth, rowHeight, "Endereço:", "Rua Nossa Senhora das Mercês, 628 - Vila das Mercês - São Paulo/SP");
  y += rowHeight;

  // Section 3 - Detalhes da Aventura
  y += 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PURPLE);
  doc.text("3. DETALHES DA AVENTURA", margin, y);

  y += 8;
  const halfWidth = contentWidth / 2;
  
  // Row 1: Guia Mágico | Pessoas
  drawTableRowClean(doc, margin, y, halfWidth, rowHeight, "Guia Mágico:", data.nomeGuia);
  drawTableRowClean(doc, margin + halfWidth, y, halfWidth, rowHeight, "Pessoas:", data.quantidadePessoas || "-");
  y += rowHeight;

  // Row 2: Qtd Dias | Valor Total
  drawTableRowClean(doc, margin, y, halfWidth, rowHeight, "Qtd Dias:", data.quantidadeDias);
  drawTableRowClean(doc, margin + halfWidth, y, halfWidth, rowHeight, "Valor Total:", `R$ ${data.valor}`);
  y += rowHeight;

  // Row 3: Parques (full width with proper formatting)
  const parquesList = formatParquesList(data.datasRequeridas);
  const parquesLineCount = Math.min(parquesList.length, 8);
  const parquesRowHeight = Math.max(rowHeight, 10 + parquesLineCount * 5);
  
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentWidth, parquesRowHeight);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLACK);
  doc.text("Parques:", margin + 3, y + 8);
  
  doc.setFont("helvetica", "normal");
  let parqueY = y + 8;
  parquesList.slice(0, 8).forEach((parque: string) => {
    doc.text(parque, margin + 35, parqueY);
    parqueY += 5;
  });
  
  y += parquesRowHeight;

  // Section 4 - Observações
  y += 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PURPLE);
  doc.text("4. OBSERVAÇÕES E SOLICITAÇÕES", margin, y);

  y += 8;
  // Observations box
  const obsHeight = 25;
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentWidth, obsHeight);

  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...BLACK);
  const parquesForObs = formatParquesList(data.datasRequeridas).join('\n');
  const obsText = `${parquesForObs}\nServiço de compra e agendamento virtual das filas expressas: Lightning Lane Single Pass e Lightning Lane Multi Pass.`;
  const obsLines = doc.splitTextToSize(obsText, contentWidth - 10);
  doc.text(obsLines, margin + 5, y + 8);
}

function renderPage2(
  doc: jsPDF,
  data: ContractData,
  pageWidth: number,
  pageHeight: number,
  margin: number
) {
  drawPageBorder(doc, pageWidth, pageHeight);

  const contentWidth = pageWidth - 2 * margin;
  let y = 25;

  // Section 5 - Terms and Conditions
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PURPLE);
  doc.text("5. DIZERES, TERMOS E CONDIÇÕES", margin, y);

  y += 10;

  // Terms text
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BLACK);

  const lines = doc.splitTextToSize(CONTRACT_TERMS, contentWidth);
  lines.forEach((line: string) => {
    if (y > pageHeight - 100) {
      doc.addPage();
      drawPageBorder(doc, pageWidth, pageHeight);
      y = 25;
    }
    doc.text(line, margin, y);
    y += 5;
  });

  // Signature Section at bottom
  y = pageHeight - 70;

  // Right side - Guide signature (name in italic)
  const rightX = pageWidth - margin - 70;
  doc.setFontSize(20);
  doc.setFont("times", "italic");
  doc.setTextColor(...BLACK);
  doc.text(data.nomeGuia, rightX + 35, y, { align: "center" });

  // Signature lines
  y += 15;
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.5);

  // Left signature line
  const leftLineStart = margin;
  const leftLineEnd = margin + 70;
  doc.line(leftLineStart, y, leftLineEnd, y);

  // Right signature line
  const rightLineStart = pageWidth - margin - 70;
  const rightLineEnd = pageWidth - margin;
  doc.line(rightLineStart, y, rightLineEnd, y);

  // Left side labels
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLACK);
  doc.text("Assinatura do Contratante", leftLineStart, y);

  doc.text("Orlando Fast Pass", rightLineStart, y);

  // Client name
  y += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(data.nomeCompleto.toUpperCase(), leftLineStart, y);

  // Company subtitle
  doc.setFontSize(8);
  doc.setTextColor(...PURPLE);
  doc.text("CONSULTORIA E ESTRATÉGIA MÁGICA", rightLineStart, y);
}

function drawTableRow(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  value: string
) {
  // Draw cell border
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.3);
  doc.rect(x, y, width, height);

  // Label
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLACK);
  doc.text(label, x + 3, y + 8);

  // Value
  const labelWidth = doc.getTextWidth(label) + 5;
  doc.setFont("helvetica", "normal");
  
  // Truncate value if too long
  const maxValueWidth = width - labelWidth - 5;
  let displayValue = value;
  if (doc.getTextWidth(value) > maxValueWidth) {
    while (doc.getTextWidth(displayValue + "...") > maxValueWidth && displayValue.length > 0) {
      displayValue = displayValue.slice(0, -1);
    }
    displayValue += "...";
  }
  
  doc.text(displayValue, x + 3 + labelWidth, y + 8);
}

function drawTableRowMultiline(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  value: string,
  maxTextWidth: number
) {
  // Draw cell border
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.3);
  doc.rect(x, y, width, height);

  // Label
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLACK);
  doc.text(label, x + 3, y + 8);

  // Value - multiline
  const labelWidth = doc.getTextWidth(label) + 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  
  const lines = doc.splitTextToSize(value, maxTextWidth - labelWidth);
  let textY = y + 8;
  lines.slice(0, 4).forEach((line: string) => {
    doc.text(line, x + 3 + labelWidth, textY);
    textY += 5;
  });
}

function extractDatesFromParks(datasRequeridas: string): string {
  // Extract dates from format like "Magic Kingdom (04/01/2026), EPCOT (06/01/2026)"
  const dateRegex = /\((\d{2}\/\d{2}\/\d{4})\)/g;
  const dates: string[] = [];
  let match;
  while ((match = dateRegex.exec(datasRequeridas)) !== null) {
    const dateStr = match[1].split('/').slice(0, 2).join('/'); // Get only DD/MM
    if (!dates.includes(dateStr)) {
      dates.push(dateStr);
    }
  }
  if (dates.length > 0) {
    return dates.join(', ');
  }
  return datasRequeridas;
}

function formatParquesList(datasRequeridas: string): string[] {
  // Parse "Magic Kingdom (04/01/2026), EPCOT (06/01/2026)" into formatted list
  const items = datasRequeridas.split(',').map(item => item.trim());
  const formatted: string[] = [];
  
  items.forEach(item => {
    const match = item.match(/(.+?)\s*\((\d{2})\/(\d{2})\/\d{4}\)/);
    if (match) {
      const parkName = match[1].trim();
      const day = match[2];
      const month = match[3];
      formatted.push(`${day}/${month} - ${parkName}`);
    } else if (item) {
      formatted.push(item);
    }
  });
  
  return formatted;
}

function drawTableRowClean(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  value: string
) {
  // Draw cell border
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.3);
  doc.rect(x, y, width, height);

  // Label
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLACK);
  doc.text(label, x + 3, y + 8);

  // Value - positioned with fixed offset for alignment
  doc.setFont("helvetica", "normal");
  const valueX = x + 40; // Fixed position for cleaner alignment
  
  // Truncate value if needed
  const maxValueWidth = width - 45;
  let displayValue = value;
  if (doc.getTextWidth(value) > maxValueWidth) {
    while (doc.getTextWidth(displayValue + "...") > maxValueWidth && displayValue.length > 0) {
      displayValue = displayValue.slice(0, -1);
    }
    displayValue += "...";
  }
  
  doc.text(displayValue, valueX, y + 8);
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
