import { TicketData, QRCodeData, RouteParams } from './typesTicket';

export class TicketModel {
  private ticketData: TicketData = {
    departure: "",
    destination: "",
    departureDate: "",
    departureTime: "",
    ticketCode: "",
    price: "",
    zone: "",
    expiresAt: "",
    validatedAt: "",
    operatorName: "",
    transportType: "",
    classeType: ""
  };

  // Getters
  getTicketData(): TicketData {
    return this.ticketData;
  }

  // Setters
  setTicketData(data: TicketData): void {
    this.ticketData = data;
  }

  // Generate QR Code data
  generateQRCodeData(): string {
    if (!this.ticketData) return "";

    const qrData: QRCodeData = {
      ticketId: this.ticketData.ticketCode,
      departure: this.ticketData.departure,
      destination: this.ticketData.destination,
      departureDate: this.ticketData.departureDate,
      departureTime: this.ticketData.departureTime,
      price: this.ticketData.price,
      expiresAt: this.ticketData.expiresAt,
      validatedAt: this.ticketData.validatedAt,
      operatorName: this.ticketData.operatorName,
      classeType: this.ticketData.classeType || "",
      lineNumber: this.ticketData.lineNumber,
      lineName: this.ticketData.lineName,
      validityDuration: this.ticketData.validityDuration
    };

    return JSON.stringify(qrData);
  }

  // Format date
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric', month: 'short', year: 'numeric'
    };
    return date.toLocaleDateString('fr-FR', options);
  }

  // Format time
  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit', minute: '2-digit'
    };
    return date.toLocaleTimeString('fr-FR', options);
  }
}