import React, { useEffect } from "react";
import { BackHandler, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../Provider/AppProvider";

interface ProtectedRouteGuardProps {
  children: React.ReactNode;
}

export const ProtectedRouteGuard: React.FC<ProtectedRouteGuardProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const backAction = () => {
      // Si l'utilisateur n'est pas authentifié sur une page protégée
      if (!isAuthenticated) {
        if (router && typeof router.replace === 'function') {
          if (typeof window !== 'undefined' && window.location.pathname === '/pages/auth/login') {
            // Déjà sur login, ne rien faire
            return false;
          }
        }
        Alert.alert("Accès refusé", "Vous devez être connecté pour accéder à cette page.", [
          {
            text: "Se connecter",
            onPress: () => router.replace("/pages/auth/login" as any),
          },
          {
            text: "Fermer l'app",
            onPress: () => BackHandler.exitApp(),
            style: "destructive",
          },
        ]);
        return true;
      }

      // Si l'utilisateur est authentifié, permettre le retour normal
      return false;
    };

    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [isAuthenticated, router]);

  return <>{children}</>;
};
