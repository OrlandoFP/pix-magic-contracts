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
}

const CONTRACT_TEXT = `Serviço de compra e agendamento virtual das filas expressas: Lightning Lane Single Pass e Lightning Lane Multi Pass.

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

export function generateContractPDF(data: ContractData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = 20;

  // Header
  doc.setFillColor(26, 42, 74); // Navy color
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("CONTRATO DE GUIAMENTO", pageWidth / 2, 22, { align: "center" });
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Serviço de Guiamento Disney", pageWidth / 2, 32, { align: "center" });
  
  const today = new Date().toLocaleDateString('pt-BR');
  doc.setFontSize(10);
  doc.text(`Data de Emissão: ${today}`, pageWidth / 2, 40, { align: "center" });

  yPosition = 55;

  // Client Data Section
  doc.setTextColor(26, 42, 74);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("DADOS DO CONTRATANTE", margin, yPosition);
  
  yPosition += 8;
  doc.setDrawColor(212, 175, 55); // Gold color
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  
  yPosition += 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);

  const clientInfo = [
    { label: "Nome Completo:", value: data.nomeCompleto },
    { label: "CPF:", value: data.cpf },
    { label: "Endereço:", value: data.endereco },
    { label: "CEP:", value: data.cep },
    { label: "E-mail:", value: data.email },
    { label: "Telefone:", value: data.telefone },
  ];

  clientInfo.forEach((item) => {
    doc.setFont("helvetica", "bold");
    doc.text(item.label, margin, yPosition);
    doc.setFont("helvetica", "normal");
    doc.text(item.value, margin + 35, yPosition);
    yPosition += 7;
  });

  // Service Details Section
  yPosition += 10;
  doc.setTextColor(26, 42, 74);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("DETALHES DO SERVIÇO", margin, yPosition);
  
  yPosition += 8;
  doc.setDrawColor(212, 175, 55);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  
  yPosition += 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);

  const serviceInfo = [
    { label: "Datas Requeridas:", value: data.datasRequeridas },
    { label: "Nome do Guia:", value: data.nomeGuia },
    { label: "Quantidade de Dias:", value: data.quantidadeDias },
    { label: "Valor Total:", value: `R$ ${data.valor}` },
  ];

  serviceInfo.forEach((item) => {
    doc.setFont("helvetica", "bold");
    doc.text(item.label, margin, yPosition);
    doc.setFont("helvetica", "normal");
    doc.text(item.value, margin + 45, yPosition);
    yPosition += 7;
  });

  // Contract Terms Section
  yPosition += 10;
  doc.setTextColor(26, 42, 74);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("TERMOS E CONDIÇÕES DO SERVIÇO", margin, yPosition);
  
  yPosition += 8;
  doc.setDrawColor(212, 175, 55);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  
  yPosition += 10;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);

  const lines = doc.splitTextToSize(CONTRACT_TEXT, contentWidth);
  
  lines.forEach((line: string) => {
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }
    doc.text(line, margin, yPosition);
    yPosition += 5;
  });

  // Signature Section
  if (yPosition > 240) {
    doc.addPage();
    yPosition = 30;
  }
  
  yPosition += 20;
  doc.setDrawColor(26, 42, 74);
  doc.setLineWidth(0.3);
  
  // Client signature
  doc.line(margin, yPosition + 20, margin + 70, yPosition + 20);
  doc.setFontSize(10);
  doc.text("Contratante", margin + 20, yPosition + 28);
  
  // Company signature
  doc.line(pageWidth - margin - 70, yPosition + 20, pageWidth - margin, yPosition + 20);
  doc.text("Contratado", pageWidth - margin - 50, yPosition + 28);

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  return doc;
}

export function downloadContractPDF(data: ContractData): void {
  const doc = generateContractPDF(data);
  const fileName = `Contrato_${data.nomeCompleto.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

export function getContractPDFBlob(data: ContractData): Blob {
  const doc = generateContractPDF(data);
  return doc.output('blob');
}
