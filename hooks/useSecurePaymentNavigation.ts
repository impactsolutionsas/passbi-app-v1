import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Alert, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';

interface UseSecurePaymentNavigationProps {
  isPaymentInProgress?: boolean;
  redirectToHomeOnBack?: boolean;
  customMessage?: string;
  permanentProtection?: boolean;
}

export const useSecurePaymentNavigation = ({
  isPaymentInProgress = true,
  redirectToHomeOnBack = true,
  customMessage = "Le paiement est en cours. Vous ne pouvez pas revenir en arrière.",
  permanentProtection = false
}: UseSecurePaymentNavigationProps = {}) => {
  const router = useRouter();
  const backHandlerRef = useRef<any>(null);
  const [isProtected, setIsProtected] = useState(false);
  const [hasPaymentStarted, setHasPaymentStarted] = useState(false);

  // Fonction pour gérer le retour
  const handleBackPress = () => {
    if (permanentProtection && hasPaymentStarted) {
      Alert.alert(
        "Navigation bloquée",
        "Vous ne pouvez pas revenir aux pages précédentes après avoir initié un paiement.",
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
      return true;
    }

    if (isProtected) {
      Alert.alert(
        "Paiement en cours",
        customMessage,
        [
          {
            text: "Annuler",
            style: "cancel"
          },
          {
            text: "Accueil",
            onPress: () => {
              router.replace('/(tabs)');
            }
          }
        ],
        { cancelable: false }
      );
      return true;
    }
    
    return false;
  };

  // Marquer le début du paiement
  const startPayment = () => {
    setHasPaymentStarted(true);
    setIsProtected(true);
  };

  // Protection pour Android (bouton retour physique)
  useEffect(() => {
    if (Platform.OS === 'android') {
      if (isPaymentInProgress || (permanentProtection && hasPaymentStarted)) {
        setIsProtected(true);
        backHandlerRef.current = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
      } else {
        setIsProtected(false);
        if (backHandlerRef.current) {
          backHandlerRef.current.remove();
          backHandlerRef.current = null;
        }
      }
    }

    return () => {
      if (Platform.OS === 'android' && backHandlerRef.current) {
        backHandlerRef.current.remove();
        backHandlerRef.current = null;
      }
    };
  }, [isPaymentInProgress, permanentProtection, hasPaymentStarted]);

  // Protection pour toutes les plateformes (navigation focus)
  useFocusEffect(
    React.useCallback(() => {
      if (isPaymentInProgress || (permanentProtection && hasPaymentStarted)) {
        setIsProtected(true);
      } else {
        setIsProtected(false);
      }
    }, [isPaymentInProgress, permanentProtection, hasPaymentStarted])
  );

  // Fonction pour désactiver la protection
  const disableProtection = () => {
    setIsProtected(false);
    setHasPaymentStarted(false);
    if (Platform.OS === 'android' && backHandlerRef.current) {
      backHandlerRef.current.remove();
      backHandlerRef.current = null;
    }
  };

  // Fonction pour rediriger vers l'accueil
  const redirectToHome = () => {
    disableProtection();
    router.replace('/(tabs)');
  };

  // Fonction pour réinitialiser complètement
  const resetProtection = () => {
    setIsProtected(false);
    setHasPaymentStarted(false);
    if (Platform.OS === 'android' && backHandlerRef.current) {
      backHandlerRef.current.remove();
      backHandlerRef.current = null;
    }
  };

  return {
    isProtected,
    hasPaymentStarted,
    startPayment,
    disableProtection,
    redirectToHome,
    resetProtection
  };
}; 