import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { userCache } from '../constants/contexte/getUserCache';

// Types pour une meilleure type safety
interface JwtPayload {
  id: string;
  exp?: number;
  iat?: number;
  [key: string]: any;
}

interface UseAuthGuardOptions {
  onLogout?: () => void | Promise<void>;
  redirectTo?: string;
  autoCheck?: boolean;
}

interface AuthStatus {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  tokenExpiry: Date | null;
}

export const useAuthGuard = (options: UseAuthGuardOptions = {}) => {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    isAuthenticated: false,
    isLoading: true,
    userId: null,
    tokenExpiry: null,
  });

  // Vérifier si un token est valide
  const isTokenValid = useCallback((token: string): boolean => {
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const currentTime = Date.now() / 1000;
      
      // Vérifier si le token a une date d'expiration
      if (decoded.exp) {
        return decoded.exp > currentTime;
      }
      
      // Si pas d'expiration, considérer comme valide
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la validation du token:', error);
      return false;
    }
  }, []);

  // Extraire les informations du token
  const extractTokenInfo = useCallback((token: string): { userId: string | null; expiry: Date | null } => {
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      return {
        userId: decoded.id || null,
        expiry: decoded.exp ? new Date(decoded.exp * 1000) : null,
      };
    } catch (error) {
      console.error('❌ Erreur lors de l\'extraction des infos token:', error);
      return { userId: null, expiry: null };
    }
  }, []);

  // Fonction de déconnexion améliorée
  const logout = useCallback(async () => {
    try {
      console.log('🔄 Début de la déconnexion...');
      
      // 1. Supprimer tous les tokens d'authentification
      const tokenKeys = ['authToken', 'userToken', 'token', 'authTokenBackup', 'authTokenTimestamp'];
      await Promise.allSettled(
        tokenKeys.map(key => AsyncStorage.removeItem(key))
      );
      
      // 2. Nettoyer tous les flags de succès
      const flagKeys = ['profile_update_success', 'codeVerified'];
      await Promise.allSettled(
        flagKeys.map(key => AsyncStorage.removeItem(key))
      );
      
      // 3. Invalider le cache utilisateur
      try {
        userCache.invalidate();
      } catch (cacheError) {
        console.warn('⚠️ Erreur lors de l\'invalidation du cache:', cacheError);
      }
      
      // 4. Mettre à jour l'état local
      setAuthStatus({
        isAuthenticated: false,
        isLoading: false,
        userId: null,
        tokenExpiry: null,
      });
      
      // 5. Callback personnalisé si fourni
      if (options.onLogout) {
        try {
          await options.onLogout();
        } catch (callbackError) {
          console.error('❌ Erreur dans le callback onLogout:', callbackError);
        }
      }
      
      console.log('✅ Déconnexion terminée');
      
      // 6. Rediriger vers la page de connexion
      const redirectPath = options.redirectTo || '/pages/auth/login';
      router.replace(redirectPath as any);
      
    } catch (error) {
      console.error('❌ Erreur lors de la déconnexion:', error);
      
      // En cas d'erreur, forcer quand même la redirection
      const redirectPath = options.redirectTo || '/pages/auth/login';
      router.replace(redirectPath as any);
    }
  }, [router, options]);

  // Vérifier le statut d'authentification
  const checkAuthStatus = useCallback(async (): Promise<boolean> => {
    try {
      setAuthStatus(prev => ({ ...prev, isLoading: true }));

      // Essayer de récupérer le token depuis différents emplacements
      const token = await AsyncStorage.getItem('authToken') ||
                   await AsyncStorage.getItem('userToken') ||
                   await AsyncStorage.getItem('token');
      
      if (!token || token.trim() === '') {
        setAuthStatus({
          isAuthenticated: false,
          isLoading: false,
          userId: null,
          tokenExpiry: null,
        });
        return false;
      }

      // Vérifier la validité du token
      if (!isTokenValid(token)) {
        console.log('⚠️ Token expiré ou invalide');
        await logout();
        return false;
      }

      // Extraire les informations du token
      const { userId, expiry } = extractTokenInfo(token);
      
      setAuthStatus({
        isAuthenticated: true,
        isLoading: false,
        userId,
        tokenExpiry: expiry,
      });

      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la vérification d\'authentification:', error);
      setAuthStatus({
        isAuthenticated: false,
        isLoading: false,
        userId: null,
        tokenExpiry: null,
      });
      return false;
    }
  }, [isTokenValid, extractTokenInfo, logout]);

  // Fonction pour exiger l'authentification
  const requireAuth = useCallback(async (callback: () => void | Promise<void>) => {
    const isAuthenticated = await checkAuthStatus();
    
    if (isAuthenticated) {
      try {
        await callback();
      } catch (error) {
        console.error('❌ Erreur dans le callback requireAuth:', error);
        throw error;
      }
    } else {
      console.log('🚫 Action nécessite une authentification');
      router.replace('/pages/auth/login' as any);
    }
  }, [checkAuthStatus, router]);

  // Fonction pour vérifier si l'utilisateur peut accéder à une route
  const canAccessRoute = useCallback(async (route: string): Promise<boolean> => {
    const isAuthenticated = await checkAuthStatus();
    
    // Routes qui nécessitent une authentification
    const protectedRoutes = [
      '/pages/home/',
      '/pages/profil/',
      '/pages/Paiement/',
      '/pages/Reservation/',
      '/pages/TicketPage/',
    ];
    
    const requiresAuth = protectedRoutes.some(protectedRoute => 
      route.startsWith(protectedRoute)
    );
    
    if (requiresAuth && !isAuthenticated) {
      console.log(`🚫 Accès refusé à ${route} - authentification requise`);
      return false;
    }
    
    return true;
  }, [checkAuthStatus]);

  // Vérification automatique au montage si activée
  useEffect(() => {
    if (options.autoCheck !== false) {
      checkAuthStatus();
    }
  }, [checkAuthStatus, options.autoCheck]);

  // Vérification périodique du token si l'utilisateur est authentifié
  useEffect(() => {
    if (!authStatus.isAuthenticated) return;

    const interval = setInterval(async () => {
      const isValid = await checkAuthStatus();
      if (!isValid) {
        console.log('🔄 Token expiré détecté, déconnexion automatique...');
        await logout();
      }
    }, 60000); // Vérifier toutes les minutes

    return () => clearInterval(interval);
  }, [authStatus.isAuthenticated, checkAuthStatus, logout]);

  return {
    // État d'authentification
    ...authStatus,
    
    // Fonctions
    logout,
    checkAuthStatus,
    requireAuth,
    canAccessRoute,
    
    // Utilitaires
    isTokenValid,
    extractTokenInfo,
  };
}; 