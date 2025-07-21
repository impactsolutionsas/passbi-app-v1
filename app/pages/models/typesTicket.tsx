export type RouteParams = {
    departure?: string;
    destination?: string;
    date?: string;
    seat?: string;
    totalAvailableSeats?: string;
    departureTime?: string;
    price?: number;
    tripId?: string;
    name?: string;
    phoneNumber?: string;
    reserveId?: string;
    temporaryReservationId?: string;
    operatorName?: string;
    operatorLogoUrl?: string;
    operatorSlogan?: string;
    operatorCommission?: number;
    transportType?: string;
    passengers?: string;
    arrivalStation?: string;
    reservation?: string;
    // Paramètres BRT/TER
    id?: string;
    zoneName?: string;
    zoneType?: string;
    departureStation?: string;
    destinationStation?: string;
    amount?: string;
    ticketCount?: string;
    code?: string;
    zone?: string;
    status?: string;
    createdAt?: string;
    expiresAt?: string;
    methodePay?: string;
    ticketId?: string;
    pendingExpiresAt?: string;
    classe?: string; 
    operatorType?: string; 
    // Paramètres spécifiques Dem Dikk
    lineNumber?: string;
    lineName?: string;
    validityDuration?: string;
  };
  
  export interface UserData {
    data?: {
      user?: {
        firstName?: string;
        name?: string;
      };
    };
  }
  
  export interface TicketData {
    departure: string;
    destination: string;
    departureDate: string;
    departureTime: string;
    ticketCode: string;
    price: string;
    zone: string;
    expiresAt: string;
    validatedAt: string;
    operatorName: string;
    transportType: string;
    classeType: string;
    // Champs spécifiques à Dem Dikk
    lineNumber?: string;
    lineName?: string;
    validityDuration?: string;
  }
  
  export interface QRCodeData {
    ticketId: string;
    departure: string;
    destination: string;
    departureDate: string;
    departureTime: string;
    price: string;
    expiresAt: string;
    validatedAt: string;
    operatorName: string;
    classeType: string;
    lineNumber?: string;  
    lineName?: string;    
    validityDuration?: string;
  }
  
  export interface OperatorColors {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  }