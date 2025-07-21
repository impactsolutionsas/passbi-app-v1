// types.ts
export type ToastRefType = {
    show: (title: string, message: string, type: 'error' | 'success' | 'info') => void;
  };
  
  export type Lieu = {
    id: number;
    nom: string;
    arrivees: string[];
  };
  
  export type SearchTicketsParams = {
    departure: string;
    destination: string;
    date: string;
    seat: number;
  };