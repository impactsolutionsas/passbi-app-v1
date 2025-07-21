import React, { useEffect } from 'react';
import { BackHandler, Alert } from 'react-native';
import { useAuthState } from '../hooks/useAuthState';
import { usePathname } from 'expo-router';

interface LogoutProtectionProps {
  children: React.ReactNode;
}

export const LogoutProtection: React.FC<LogoutProtectionProps> = ({ children }) => {
  const { isAuthenticated, hasLoggedOut } = useAuthState();
  const pathname = usePathname();

  useEffect(() => {
    const backAction = () => {
      // Bloquer le retour SEULEMENT si :
      // 1. L'utilisateur s'est déconnecté
      // 2. ET qu'il est actuellement sur la page de login
      if (hasLoggedOut && pathname === '/pages/auth/login') {
        Alert.alert(
          "Accès refusé",
          "Vous avez été déconnecté. Vous ne pouvez pas revenir aux pages précédentes.",
          [
            {
              text: "Fermer l'app",
              onPress: () => BackHandler.exitApp(),
              style: "destructive",
            },
            {
              text: "Rester sur login",
              style: "cancel",
            },
          ]
        );
        return true; // Empêcher l'action par défaut
      }
      
      // Dans tous les autres cas, permettre le retour normal
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [hasLoggedOut, pathname]);

  return <>{children}</>;
}; 