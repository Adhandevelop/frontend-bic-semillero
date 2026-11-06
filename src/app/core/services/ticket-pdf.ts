export interface VerifiedTicket {
  valid:boolean;status:string;ticket_code:string;
  trip:{id:number;origin:string;destination:string;date_time_start:string;date_time_end?:string|null};
  passenger:{name:string;identification_number?:string};
  seat:{id:number;seat_number:string};
}
export interface PdfTicket {ticket:VerifiedTicket;verificationUrl:string;issuedAt?:string;}

export function ticketVerificationUrl(value:string|undefined,origin:string,sessionToken:string|null):URL {
  if(!value)throw new Error('Una boleta no incluye su enlace de verificación.');
  const url=new URL(value,origin);
  if(!['http:','https:'].includes(url.protocol)||url.host!==new URL(origin).host||url.username||url.password||url.pathname!=='/api/sales/tickets/verify/'||!url.searchParams.get('token')||url.searchParams.get('token')===sessionToken)throw new Error('Una boleta tiene un enlace de verificación no válido.');
  return new URL(url.pathname+url.search,origin);
}

export async function createTicketPdf(saleId:number,entries:PdfTicket[]) {
  if(!entries.length)throw new Error('Esta compra no tiene boletas emitidas.');
  const [{jsPDF},qrModule]=await Promise.all([import('jspdf'),import('qrcode')]);
  const qr=typeof qrModule.toDataURL==='function'?qrModule:qrModule.default;
  const images=await Promise.all(entries.map(e=>qr.toDataURL(e.verificationUrl,{width:600,margin:4,errorCorrectionLevel:'M'})));
  const pdf=new jsPDF({unit:'mm',format:'a4'});
  const date=(value?:string|null)=>value&&Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat('es-CO',{dateStyle:'medium',timeStyle:'short',hourCycle:'h23',timeZone:'America/Bogota'}).format(new Date(value)):'No informada';
  entries.forEach(({ticket:t,issuedAt},index)=>{
    if(index)pdf.addPage();
    pdf.setFillColor(16,53,110);pdf.rect(0,0,210,40,'F');
    pdf.setTextColor(255);pdf.setFont('helvetica','bold');pdf.setFontSize(22);pdf.text('Buses Universal',18,20);
    pdf.setFontSize(11);pdf.text('BOLETA DE VIAJE',18,30);pdf.text(`Compra #${saleId}`,154,30);
    pdf.setTextColor(20,45,80);let y=52;
    const field=(label:string,value:string)=>{
      pdf.setFontSize(9);pdf.setFont('helvetica','normal');pdf.setTextColor(90,108,130);pdf.text(label,18,y);
      pdf.setFontSize(12);pdf.setFont('helvetica','bold');pdf.setTextColor(20,45,80);
      const lines=pdf.splitTextToSize(value||'No informado',174);pdf.text(lines,18,y+6);y+=12+lines.length*5;
    };
    field('PASAJERO',t.passenger.name);
    field('DOCUMENTO',t.passenger.identification_number||'No informado');
    field('RUTA / TERMINALES',`${t.trip.origin} - ${t.trip.destination}`);
    field('SALIDA · HORA COLOMBIA',date(t.trip.date_time_start));
    field('LLEGADA · HORA COLOMBIA',date(t.trip.date_time_end));
    field('SILLA / ESTADO',`${t.seat.seat_number} / ${t.status==='issued'?'Emitida':t.status==='used'?'Ya utilizada':t.status==='cancelled'?'Cancelada':t.status}`);
    field('CÓDIGO DEL TIQUETE',t.ticket_code);
    pdf.setFontSize(9);pdf.setFont('helvetica','normal');pdf.text(`Emisión: ${date(issuedAt)}`,18,y);
    // QR stays in a fixed, generous area, with a quiet zone supplied by qrcode.
    if(y>214)throw new Error('Los datos de una boleta superan el espacio disponible del PDF.');
    pdf.addImage(images[index],'PNG',145,220,48,48);
    pdf.setFontSize(10);pdf.text(['Escanea el QR para consultar','la autenticidad y el estado actual.','La validez se verifica en línea.'],18,235);
    pdf.setDrawColor(215,225,238);pdf.line(18,277,192,277);
    pdf.setFontSize(9);pdf.text(`Boleta ${index+1} de ${entries.length} · No es una factura electrónica`,18,285);
  });
  return pdf;
}
