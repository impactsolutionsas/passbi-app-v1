import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSecurePaymentNavigation } from '../hooks/useSecurePaymentNavigation';

interface PaymentProtectionProps {
  children: React.ReactNode;
  isPaymentPage?: boolean;
  allowAccess?: boolean;
}

export const PaymentProtection: React.FC<PaymentProtectionProps> = ({
  children,
  isPaymentPage = false,
  allowAccess = true
}) => {
  const router = useRouter();
  const { isProtected, hasPaymentStarted } = useSecurePaymentNavigation({
    permanentProtection: true
  });

  useEffect(() => {
    // Si c'est une page de paiement et que l'accès n'est pas autorisé
    if (isPaymentPage && !allowAccess) {
      Alert.alert(
        "Accès refusé",
        "Vous ne pouvez pas accéder directement à cette page de paiement.",
        [
          {
            text: "Accueil",
            onPress: () => {
              router.replace('/(tabs)');
            }
          }
        ],
        { cancelable: false }
      );
      return;
    }

    // Si la protection est active et que l'utilisateur essaie d'accéder à une page de paiement
    if (isProtected || hasPaymentStarted) {
      if (isPaymentPage) {
        // Permettre l'accès aux pages de paiement si la protection est active
        return;
      } else {
        // Bloquer l'accès aux autres pages si la protection est active
        Alert.alert(
          "Navigation bloquée",
          "Vous ne pouvez pas naviguer vers d'autres pages pendant le paiement.",
          [
            {
              text: "Accueil",
              onPress: () => {
                router.replace('/(tabs)');
              }
            }
          ],
          { cancelable: false }
        );
        return;
      }
    }
  }, [isPaymentPage, allowAccess, isProtected, hasPaymentStarted, router]);

  return <>{children}</>;
};

export default PaymentProtection; 