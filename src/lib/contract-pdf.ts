import { jsPDF } from "jspdf";
import { DEFAULT_CONTRACT_TERMS } from "@/lib/contract-terms";

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
  observacao?: string;
  customTerms?: string;
  formaPagamento?: string;
}

const CONTRACT_TERMS = DEFAULT_CONTRACT_TERMS;

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
  const pageTopY = 25;
  const contentBottomY = pageHeight - margin - 12;
  let y = pageTopY;

  const newContentPage = () => {
    doc.addPage();
    drawPageBorder(doc, pageWidth, pageHeight);
    y = pageTopY;
  };

  const ensureSpace = (requiredHeight: number) => {
    if (y + requiredHeight > contentBottomY) {
      newContentPage();
    }
  };

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
  y += 18;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PURPLE);
  doc.text("1. DADOS DO VIAJANTE (CONTRATANTE)", margin, y);

  // Table for client data
  y += 10;
  const tableStartY = y;
  const rowHeight = 14;
  const col1Width = 90;
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
  y += 12;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PURPLE);
  doc.text("2. DADOS DA CONTRATADA (ORLANDO FAST PASS)", margin, y);

  y += 10;
  // Row 1: Razão Social | CNPJ
  drawTableRow(doc, margin, y, col1Width, rowHeight, "Razão Social:", "Orlando Fast Pass");
  drawTableRow(doc, margin + col1Width, y, col2Width, rowHeight, "CNPJ:", "33.142.150/0001-99");
  y += rowHeight;

  // Row 2: Endereço (full width)
  drawTableRow(doc, margin, y, contentWidth, rowHeight, "Endereço:", "Rua Nossa Senhora das Mercês, 628 - Vila das Mercês - São Paulo/SP");
  y += rowHeight;

  // Section 3 - Detalhes da Aventura
  y += 12;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PURPLE);
  doc.text("3. DETALHES DA AVENTURA", margin, y);

  y += 10;
  const halfWidth = contentWidth / 2;
  const adventureRowHeight = 14;
  
  // Row 1: Guia Mágico | Pessoas
  drawTableRowClean(doc, margin, y, halfWidth, adventureRowHeight, "Guia Mágico:", data.nomeGuia);
  drawTableRowClean(doc, margin + halfWidth, y, halfWidth, adventureRowHeight, "Pessoas:", data.quantidadePessoas || "-");
  y += adventureRowHeight;

  // Row 2: Qtd Dias | Forma de Pagamento
  drawTableRowClean(doc, margin, y, halfWidth, adventureRowHeight, "Qtd Dias:", data.quantidadeDias);
  drawTableRowClean(doc, margin + halfWidth, y, halfWidth, adventureRowHeight, "Pagamento:", data.formaPagamento || "À Vista");
  y += adventureRowHeight;

  // Row 3: Valor Total (full width)
  const isUSD = data.valor.startsWith('$') || data.valor.startsWith('$ ');
  drawTableRowClean(doc, margin, y, contentWidth, adventureRowHeight, "Valor Total:", isUSD ? data.valor : `R$ ${data.valor}`);
  y += adventureRowHeight;

  // Row 3: Parques (quebra automática de página quando necessário)
  const parquesList = formatParquesList(data.datasRequeridas);
  const listX = margin + 50;
  const listMaxWidth = margin + contentWidth - 5 - listX;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  // Split each park line to the available width and account for wrapping
  const rawParquesLines = parquesList.flatMap((parque) =>
    doc.splitTextToSize(parque, listMaxWidth)
  );
  const parquesLines = rawParquesLines.length > 0 ? rawParquesLines : ["-"];

  const parkLineHeight = 6;
  const topTextOffset = 9;
  const bottomPadding = 8;
  const minParquesBoxHeight = topTextOffset + bottomPadding;

  ensureSpace(minParquesBoxHeight + 12);

  let remainingParques = [...parquesLines];
  while (remainingParques.length > 0) {
    const availableHeight = contentBottomY - y;

    if (availableHeight < minParquesBoxHeight) {
      newContentPage();
      continue;
    }

    const maxLinesThisBox = Math.max(
      1,
      Math.floor((availableHeight - topTextOffset - bottomPadding) / parkLineHeight) + 1
    );

    const boxLines = remainingParques.slice(0, maxLinesThisBox);
    remainingParques = remainingParques.slice(boxLines.length);

    const boxHeight =
      topTextOffset + bottomPadding + (boxLines.length - 1) * parkLineHeight;

    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentWidth, boxHeight);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BLACK);
    doc.text("Parques:", margin + 5, y + topTextOffset);

    doc.setFont("helvetica", "normal");
    let parqueY = y + topTextOffset;
    boxLines.forEach((line: string) => {
      doc.text(line, listX, parqueY);
      parqueY += parkLineHeight;
    });

    y += boxHeight + 12;

    if (remainingParques.length > 0) {
      newContentPage();
    }
  }

  // Section 4 - Observações (quebra automática de página quando necessário)
  const obsText = data.observacao || 
    "Serviço de compra e agendamento virtual das filas expressas: Lightning Lane Single Pass e Lightning Lane Multi Pass.";

  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(...BLACK);

  const obsLines = doc.splitTextToSize(obsText, contentWidth - 10) as string[];
  const obsLineHeight = 6;
  const obsTopOffset = 8;
  const obsBottomPadding = 8;
  const minObsBoxHeight = obsTopOffset + obsBottomPadding;

  const drawObsTitle = (continued: boolean) => {
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PURPLE);
    doc.text(
      continued
        ? "4. OBSERVAÇÕES E SOLICITAÇÕES (CONT.)"
        : "4. OBSERVAÇÕES E SOLICITAÇÕES",
      margin,
      y
    );
    y += 10;
  };

  // Evita título “sobrando” no fim da página sem a caixa logo abaixo
  ensureSpace(10 + minObsBoxHeight);
  drawObsTitle(false);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(...BLACK);

  let remainingObs = obsLines.length > 0 ? [...obsLines] : [""];
  while (remainingObs.length > 0) {
    const availableHeight = contentBottomY - y;

    if (availableHeight < minObsBoxHeight) {
      newContentPage();
      drawObsTitle(true);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(...BLACK);
      continue;
    }

    const maxLinesThisBox = Math.max(
      1,
      Math.floor((availableHeight - obsTopOffset - obsBottomPadding) / obsLineHeight) + 1
    );

    const boxLines = remainingObs.slice(0, maxLinesThisBox);
    remainingObs = remainingObs.slice(boxLines.length);

    const boxHeight =
      obsTopOffset + obsBottomPadding + (boxLines.length - 1) * obsLineHeight;

    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentWidth, boxHeight);

    let textY = y + obsTopOffset;
    boxLines.forEach((line: string) => {
      doc.text(line, margin + 5, textY);
      textY += obsLineHeight;
    });

    y += boxHeight + 12;

    if (remainingObs.length > 0) {
      newContentPage();
      drawObsTitle(true);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(...BLACK);
    }
  }

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

  const termsToUse = data.customTerms || CONTRACT_TERMS;
  const lines = doc.splitTextToSize(termsToUse, contentWidth);
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
  const items = datasRequeridas
    .split(/,\s*|\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
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
