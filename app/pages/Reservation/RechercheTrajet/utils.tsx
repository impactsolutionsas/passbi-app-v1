// utils.ts - Fonctions utilitaires pour le traitement des données

import { ApiResponse, Trip, TransportType } from './types';

// Fonction pour obtenir les trajets correspondant au filtre actif
export const getFilteredTrips = (data: ApiResponse | null, filter: TransportType): Trip[] => {
  if (!data) return [];
  
  switch (filter) {
    case 'Bus':
      return data.transportTypeBUS || [];
    case 'Bateau':
      return data.transportTypeBOAT || [];
    case 'Avion':
      return data.transportTypePLANE || [];
    case 'Train':
      return data.transportTypeTRAIN || [];
    default:
      return [];
  }
};

// utils.ts

export const getOperatorName = (data: Trip) => data.operator?.name || "Opérateurs";
export const getOperatorLogoUrl = (data: Trip) => data.operator?.logoUrl || "";
export const getOperatorSlogan = (data: Trip) => data.operator?.slogan || "";

  
// Formater la date pour l'affichage
export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('fr-FR', options as Intl.DateTimeFormatOptions);
};

// Formater l'heure pour l'affichage
export const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

// Formater le prix
export const formatPrice = (price: number) => {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " XOF";
};