// AppProvider.tsx - Version corrigée avec setCodeVerified
import React, { createContext, useContext, useState, useEffect } from "react";
import { OperatorProvider } from "@/constants/contexte/OperatorContext";
import { TicketsProvider } from "../constants/contexte/TicketsContext";
import { PaymentProtectionProvider } from "../constants/contexte/PaymentProtectionContext";
import { getToken } from "../services/api/api";
import { jwtDecode } from "jwt-decode";
import { View, Text, BackHandler, Alert, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GlobalProtection } from "../components/GlobalProtection";

interface CustomJwtPayload {
  id: string;
  exp?: number;
  iat?: number;
}

interface AuthState {
  isAuthenticated: boolean;
  isInitialized: boolean;
  userId: string | null;
  token: string | null;
  codeVerified: boolean; // Ajout de cette propriété
}

interface AuthContextType extends AuthState {
  login: (token: string) => void;
  logout: () => void;
  checkAuthStatus: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  setCodeVerified: (verified: boolean) => Promise<void>; // Ajout de cette fonction
}

// Contexte d'authentification
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider d'authentification
const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isInitialized: false,
    userId: null,
    token: null,
    codeVerified: false, // Initialisation
  });

  // Vérifier si le token est valide
  const isTokenValid = (token: string): boolean => {
    try {
      const decoded = jwtDecode<CustomJwtPayload>(token);
      const currentTime = Date.now() / 1000;
      return decoded.exp ? decoded.exp > currentTime : true;
    } catch {
      return false;
    }
  };

  // Vérifier le statut d'authentification
  const checkAuthStatus = async () => {
    try {
      const token = await getToken();
      const storedCodeVerified = await AsyncStorage.getItem("codeVerified");

      if (!token) {
        console.warn('[AUTO-LOGOUT] Déconnexion automatique : token absent');
        setAuthState({
          isAuthenticated: false,
          isInitialized: true,
          userId: null,
          token: null,
          codeVerified: false,
        });
        return;
      }

      if (!isTokenValid(token)) {
        console.warn('[AUTO-LOGOUT] Déconnexion automatique : token expiré ou invalide');
        await AsyncStorage.removeItem("codeVerified");
        setAuthState({
          isAuthenticated: false,
          isInitialized: true,
          userId: null,
          token: null,
          codeVerified: false,
        });
        return;
      }

      const decoded = jwtDecode<CustomJwtPayload>(token);
      const userId = decoded.id;

      if (userId) {
        setAuthState({
          isAuthenticated: true,
          isInitialized: true,
          userId,
          token,
          codeVerified: storedCodeVerified === "true",
        });
      } else {
        console.warn('[AUTO-LOGOUT] Déconnexion automatique : userId non trouvé dans le token');
        setAuthState({
          isAuthenticated: false,
          isInitialized: true,
          userId: null,
          token: null,
          codeVerified: false,
        });
      }
    } catch (error) {
      console.warn('[AUTO-LOGOUT] Déconnexion automatique : erreur lors de la vérification d\'authentification', error);
      setAuthState({
        isAuthenticated: false,
        isInitialized: true,
        userId: null,
        token: null,
        codeVerified: false,
      });
    }
  };

  // Connexion
  const login = (token: string) => {
    try {
      if (!isTokenValid(token)) {
        throw new Error("Token invalide");
      }

      const decoded = jwtDecode<CustomJwtPayload>(token);
      const userId = decoded.id;

      if (userId) {
        setAuthState((prevState) => ({
          ...prevState,
          isAuthenticated: true,
          isInitialized: true,
          userId,
          token,
        }));
      }
    } catch (error) {
      console.error("Erreur lors de la connexion:", error);
      logout();
    }
  };

  // Déconnexion
  const logout = async () => {
    try {

      // 1. Mettre à jour l'état local IMMÉDIATEMENT
      setAuthState({
        isAuthenticated: false,
        isInitialized: true,
        userId: null,
        token: null,
        codeVerified: false,
      });

      // 2. Supprimer tous les tokens d'authentification
      const tokenKeys = [
        "authToken",
        "userToken",
        "token",
        "authTokenBackup",
        "authTokenTimestamp",
      ];
      await Promise.allSettled(tokenKeys.map((key) => AsyncStorage.removeItem(key)));

      // 3. Nettoyer tous les flags de succès
      const flagKeys = ["profile_update_success", "codeVerified"];
      await Promise.allSettled(flagKeys.map((key) => AsyncStorage.removeItem(key)));

      // 4. Nettoyer le cache utilisateur si disponible
      try {
        const { userCache } = await import("../constants/contexte/getUserCache");
        userCache.invalidate();
      } catch (cacheError) {
        console.warn("⚠️ Erreur lors de l'invalidation du cache:", cacheError);
      }

      // 5. Nettoyer le cache de navigation et rediriger
      try {
        const { router, usePathname } = await import("expo-router");
        const pathname = typeof usePathname === 'function' ? usePathname() : undefined;
        // Rediriger vers login uniquement si on n'y est pas déjà
        if (pathname !== "/pages/auth/login") {
          router.replace("/pages/auth/login" as any);
        }
      } catch (navError) {
        console.warn("⚠️ Erreur lors de la redirection:", navError);
      }

    } catch (error) {
      console.error("❌ Erreur lors de la déconnexion:", error);

      // En cas d'erreur, forcer quand même la mise à jour de l'état
      setAuthState({
        isAuthenticated: false,
        isInitialized: true,
        userId: null,
        token: null,
        codeVerified: false,
      });
    }
  };

  // Fonction pour définir le statut de vérification du code
  const setCodeVerified = async (verified: boolean) => {
    try {
      if (verified) {
        await AsyncStorage.setItem("codeVerified", "true");
      } else {
        await AsyncStorage.removeItem("codeVerified");
      }

      setAuthState((prevState) => ({
        ...prevState,
        codeVerified: verified,
      }));

    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut de vérification:", error);
    }
  };

  // Rafraîchir l'authentification
  const refreshAuth = async () => {
    await checkAuthStatus();
  };

  // Vérification initiale au montage
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Vérification périodique du token
/*   useEffect(() => {
    if (!authState.isAuthenticated) return;

    const interval = setInterval(() => {
      if (authState.token && !isTokenValid(authState.token)) {
        console.warn('[AUTO-LOGOUT] Déconnexion périodique : token expiré détecté');
        logout();
      }
    }, 60000); // Vérifier chaque minute

    return () => clearInterval(interval);
  }, [authState.isAuthenticated, authState.token]);
 */
 

  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    checkAuthStatus,
    refreshAuth,
    setCodeVerified, // Ajout de la fonction dans le contexte
  };

  return (
    <AuthContext.Provider value={contextValue}>
      <GlobalProtection>{children}</GlobalProtection>
    </AuthContext.Provider>
  );
};

// Hook pour utiliser l'authentification
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider");
  }
  return context;
};

// Provider conditionnel pour les données
const ConditionalDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isInitialized } = useAuth();

  // Afficher un écran de chargement si pas encore initialisé
  if (!isInitialized) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text>Initialisation...</Text>
      </View>
    );
  }

  // PaymentProtectionProvider doit englober tout le reste
  return (
    <PaymentProtectionProvider>
      <OperatorProvider>
        <TicketsProvider>{children}</TicketsProvider>
      </OperatorProvider>
      {/*isAuthenticated ? (
        <OperatorProvider>
          <TicketsProvider>{children}</TicketsProvider>
        </OperatorProvider>
      ) : (
        <OperatorProvider>
          <TicketsProvider>{children}</TicketsProvider>
        </OperatorProvider>
      )*/}
    </PaymentProtectionProvider>
  );
};

// Composant principal qui regroupe tous les providers
export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <ConditionalDataProvider>{children}</ConditionalDataProvider>
    </AuthProvider>
  );
};

export default AppProviders;
