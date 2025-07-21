import React, { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useAuth } from '../Provider/AppProvider';
import { useRouter, usePathname } from 'expo-router';

interface GlobalProtectionProps {
  children: React.ReactNode;
}

export const GlobalProtection: React.FC<GlobalProtectionProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();

  // Exception : toujours autoriser le rendu de l'inscription et de la vérification OTP
  const isAuthPage =
    pathname === '/pages/auth/register' ||
    pathname === '/pages/auth/verificationCode';

  // Debug pour voir l'état
  console.log('🔍 GlobalProtection - isAuthenticated:', isAuthenticated, 'pathname:', pathname);

  useEffect(() => {
    if (isAuthPage) return; // Ne rien faire sur ces pages
    const backAction = () => {
      if (pathname === '/pages/auth/login') {
        console.log('🚫 Retour depuis login - fermeture de l\'app');
        BackHandler.exitApp();
        return true;
      }
      if (!isAuthenticated) {
        console.log('🚫 Retour sans authentification - fermeture de l\'app');
        BackHandler.exitApp();
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isAuthenticated, pathname, isAuthPage]);

  return <>{children}</>;
}; 