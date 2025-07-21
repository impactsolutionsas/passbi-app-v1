import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PaymentProtectionContextType {
  isPaymentProtected: boolean;
  hasPaymentStarted: boolean;
  currentPaymentId: string | null;
  startPaymentProtection: (paymentId: string) => void;
  stopPaymentProtection: () => void;
  isPaymentPage: (pagePath: string) => boolean;
}

const PaymentProtectionContext = createContext<PaymentProtectionContextType | undefined>(undefined);

interface PaymentProtectionProviderProps {
  children: ReactNode;
}

export const PaymentProtectionProvider: React.FC<PaymentProtectionProviderProps> = ({ children }) => {
  const [isPaymentProtected, setIsPaymentProtected] = useState(false);
  const [hasPaymentStarted, setHasPaymentStarted] = useState(false);
  const [currentPaymentId, setCurrentPaymentId] = useState<string | null>(null);

  // Liste des pages de paiement autorisées
  const paymentPages = [
    '/pages/Paiement/paiement',
    '/pages/Paiement/paiementUrbain/paiement',
    '/pages/payment-status',
    '/pages/Paiement/RedirectionPayement/payment-success'
  ];

  const startPaymentProtection = (paymentId: string) => {
    setIsPaymentProtected(true);
    setHasPaymentStarted(true);
    setCurrentPaymentId(paymentId);
  };

  const stopPaymentProtection = () => {
    setIsPaymentProtected(false);
    setHasPaymentStarted(false);
    setCurrentPaymentId(null);
  };

  const isPaymentPage = (pagePath: string): boolean => {
    return paymentPages.some(paymentPage => pagePath.includes(paymentPage));
  };

  const value: PaymentProtectionContextType = {
    isPaymentProtected,
    hasPaymentStarted,
    currentPaymentId,
    startPaymentProtection,
    stopPaymentProtection,
    isPaymentPage
  };

  return (
    <PaymentProtectionContext.Provider value={value}>
      {children}
    </PaymentProtectionContext.Provider>
  );
};

export const usePaymentProtection = (): PaymentProtectionContextType => {
  const context = useContext(PaymentProtectionContext);
  if (context === undefined) {
    throw new Error('usePaymentProtection must be used within a PaymentProtectionProvider');
  }
  return context;
}; 