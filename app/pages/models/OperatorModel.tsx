import { OperatorColors } from './typesTicket';

export class OperatorModel {
  getOperatorColors(operatorType: string): OperatorColors {
    switch (operatorType) {
      case "TER":
        return {
          primary: '#10B981',
          secondary: '#059669',
          accent: '#065F46',
          background: '#ECFDF5'
        };
      case "DemDikk":
        return {
          primary: '#2563EB',
          secondary: '#1D4ED8',
          accent: '#1E40AF',
          background: '#EFF6FF'
        };
      case "BRT":
      default:
        return {
          primary: '#10B981',
          secondary: '#059669',
          accent: '#065F46',
          background: '#ECFDF5'
        };
    }
  }
}