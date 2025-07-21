// types.ts - Définitions des types pour les résultats de recherche

export type RouteParams = {
    departure: string;
    destination: string;
    date: string;
    seat: string;
    totalAvailableSeats: string;
    departureTime: string;
    price: number;
    operator: {
      name: string;
      logoUrl?: string;
      slogan?: string;
    }
  };
  
  export interface Trip {
    tripId: string;
    departure: string;
    destination: string;
    departureTime: string;
    totalAvailableSeats: number;
    price: number;
    seat: string;
    requestedSeats: number;
    transportType: string;
    operator?: {
      name: string;
      logoUrl?: string;
      slogan?: string;
      commissionPassenger?: number;
    }
    stations: {
      name: string;
      id: string;
    }[];
    destinationStation?: string;
  }
  
  export interface ApiResponse {
    transportTypeBUS: Trip[];
    transportTypeBOAT: Trip[];
    transportTypePLANE: Trip[];
    transportTypeTRAIN: Trip[];
  }
  
  export type TransportType = 'Bus' | 'Avion' | 'Bateau' | 'Train';