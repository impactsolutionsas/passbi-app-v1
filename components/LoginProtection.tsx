import React, { useEffect } from 'react';
import { BackHandler, Alert } from 'react-native';
import { useAuth } from '../Provider/AppProvider';
import { usePathname } from 'expo-router';

interface LoginProtectionProps {
  children: React.ReactNode;
}

export const LoginProtection: React.FC<LoginProtectionProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const isAuthPage = pathname === "/pages/auth/register" || pathname === "/pages/auth/verificationCode";

  useEffect(() => {
    if (isAuthPage) return;
    const backAction = () => {
      if (!isAuthenticated) {
        console.log('🚪 Fermeture automatique de l\'application - utilisateur non authentifié');
        BackHandler.exitApp();
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isAuthenticated, isAuthPage, pathname]);

  return <>{children}</>;
}; 