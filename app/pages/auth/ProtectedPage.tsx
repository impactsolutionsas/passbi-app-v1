import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator , BackHandler } from 'react-native';
import { useRouter , usePathname } from 'expo-router';
import { useAuth } from '../../../Provider/AppProvider';
import tw from '../../../tailwind';

interface ProtectedPageProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ProtectedPage: React.FC<ProtectedPageProps> = ({ 
  children, 
  fallback 
}) => {
  const { isAuthenticated, isInitialized } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Exception : autoriser l'accès à l'inscription et à la vérification OTP même sans authentification
  const isAuthPage = pathname === "/pages/auth/register" || pathname === "/pages/auth/verificationCode";

  // Empêcher le retour en arrière si l'utilisateur n'est pas authentifié
  useEffect(() => {
    const backAction = () => {
      if (!isAuthenticated) {
        // Empêcher le retour en arrière et fermer l'app
        BackHandler.exitApp();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isAuthenticated]);

  // Rediriger vers la page de connexion si l'utilisateur n'est pas authentifié
  useEffect(() => {
    if (isInitialized && !isAuthenticated && !isAuthPage) {
      if (pathname !== '/pages/auth/login') {
      console.log('🚫 Utilisateur non authentifié, redirection vers login');
      router.replace('/pages/auth/login' as any);
    }
    }
  }, [isAuthenticated, isInitialized, router, isAuthPage, pathname]);

  // Afficher un loader pendant l'initialisation
  if (!isInitialized) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-white`}>
        <ActivityIndicator size="large" color="#0D9488" />
        <Text style={tw`mt-4 text-gray-600`}>Vérification de l'authentification...</Text>
      </View>
    );
  }

  // Si l'utilisateur n'est pas authentifié, afficher le fallback ou un message par défaut
  if (!isAuthenticated && !isAuthPage) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <View style={tw`flex-1 justify-center items-center bg-white px-4`}>
        <Text style={tw`text-xl font-bold text-gray-900 mb-4`}>
          Accès refusé
        </Text>
        <Text style={tw`text-gray-600 text-center mb-6`}>
          Vous n&apos;êtes pas autorisé à accéder à cette page.
        </Text>
      </View>
    );
  }

  // Si l'utilisateur est authentifié, afficher le contenu
  return <>{children}</>;
};