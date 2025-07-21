import React, { useEffect } from 'react';
import { Alert, BackHandler } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { usePaymentProtection} from '../constants/contexte/PaymentProtectionContext';

interface SecureNavigationProps {
  children: React.ReactNode;
}

export const SecureNavigation: React.FC<SecureNavigationProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { 
    isPaymentProtected, 
    hasPaymentStarted, 
    isPaymentPage, 
    stopPaymentProtection 
  } = usePaymentProtection();

  useEffect(() => {
    const handleBackPress = () => {
      // Si la protection de paiement est active
      if (isPaymentProtected || hasPaymentStarted) {
        const currentPageIsPayment = isPaymentPage(pathname);
        
        if (currentPageIsPayment) {
          // Si on est sur une page de paiement, permettre la navigation vers l'accueil
         /*   Alert.alert(
            "Paiement en cours",
            "Voulez-vous annuler le paiement et retourner à l'accueil ?",
            [
              {
                text: "Continuer le paiement",
                style: "cancel"
              },
              {
                text: "Accueil",
                onPress: () => {
                  stopPaymentProtection();
                  router.push('../../../pages/home/accueil');
                }
              }
            ],
            { cancelable: false }
          );  */
          return true;
        } else {
          // Si on n'est pas sur une page de paiement, bloquer complètement
          Alert.alert(
            "Navigation bloquée",
            "Vous ne pouvez pas naviguer vers d'autres pages pendant le paiement.",
            [
              {
                text: "Accueil",
                onPress: () => {
                  stopPaymentProtection();
                  router.replace('/(tabs)');
                }
              }
            ],
            { cancelable: false }
          );
          return true;
        }
      }
      
      return false;
    };

    // Ajouter le listener pour le bouton retour physique (Android)
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    return () => {
      backHandler.remove();
    };
  }, [isPaymentProtected, hasPaymentStarted, pathname, router, isPaymentPage, stopPaymentProtection]);

  return <>{children}</>;
}; 