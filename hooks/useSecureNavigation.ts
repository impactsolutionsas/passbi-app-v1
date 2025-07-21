import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../Provider/AppProvider';
import { BackHandler, Alert } from 'react-native';

// Routes publiques qui ne nécessitent pas d'authentification
const PUBLIC_ROUTES = [
  '/pages/auth/login',
  '/pages/auth/register',
  '/pages/auth/verificationCode',
  '/(tabs)',
];

// Routes protégées qui nécessitent une authentification
const PROTECTED_ROUTES = [
  '/pages/home/',
  '/pages/profil/',
  '/pages/Paiement/',
  '/pages/Reservation/',
  '/pages/TicketPage/',
  '/pages/views/',
  '/pages/models/',
  '/pages/controllers/',
];

export const useSecureNavigation = () => {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuth();

  // Vérifier si une route nécessite une authentification
  const isProtectedRoute = useCallback((route: string): boolean => {
    return PROTECTED_ROUTES.some(protectedRoute => 
      route.startsWith(protectedRoute)
    );
  }, []);

  // Vérifier si une route est publique
  const isPublicRoute = useCallback((route: string): boolean => {
    return PUBLIC_ROUTES.some(publicRoute => 
      route.startsWith(publicRoute)
    );
  }, []);

  // Navigation sécurisée
  const secureNavigate = useCallback(async (route: any, params?: any) => {
    // Si la route est protégée et que l'utilisateur n'est pas authentifié
    if (isProtectedRoute(route) && !isAuthenticated) {
      console.log('🚫 Accès refusé à', route, '- authentification requise');
      
      Alert.alert(
        "Accès refusé",
        "Vous devez être connecté pour accéder à cette page.",
        [
          {
            text: "Se connecter",
            onPress: () => router.replace('/pages/auth/login' as any),
          },
          {
            text: "Annuler",
            style: "cancel",
          },
        ]
      );
      return false;
    }

    // Si l'utilisateur est authentifié et essaie d'accéder à une route publique
    if (isAuthenticated && isPublicRoute(route) && route !== '/(tabs)') {
      console.log('🔄 Utilisateur authentifié redirigé vers l\'accueil');
      router.replace('/pages/home/accueil' as any);
      return false;
    }

    // Navigation normale
    try {
      if (params) {
        router.push({ pathname: route, params } as any);
      } else {
        router.push(route as any);
      }
      return true;
    } catch (error) {
      console.error('❌ Erreur de navigation:', error);
      return false;
    }
  }, [isAuthenticated, isProtectedRoute, isPublicRoute, router]);

  // Navigation avec remplacement (replace)
  const secureReplace = useCallback(async (route: any, params?: any) => {
    // Si la route est protégée et que l'utilisateur n'est pas authentifié
    if (isProtectedRoute(route) && !isAuthenticated) {
      console.log('🚫 Accès refusé à', route, '- authentification requise');
      router.replace('/pages/auth/login' as any);
      return false;
    }

    // Si l'utilisateur est authentifié et essaie d'accéder à une route publique
    if (isAuthenticated && isPublicRoute(route) && route !== '/(tabs)') {
      console.log('🔄 Utilisateur authentifié redirigé vers l\'accueil');
      router.replace('/pages/home/accueil' as any);
      return false;
    }

    // Navigation avec remplacement
    try {
      if (params) {
        router.replace({ pathname: route, params } as any);
      } else {
        router.replace(route as any);
      }
      return true;
    } catch (error) {
      console.error('❌ Erreur de navigation:', error);
      return false;
    }
  }, [isAuthenticated, isProtectedRoute, isPublicRoute, router]);

  // Déconnexion sécurisée
  const secureLogout = useCallback(async () => {
    try {
      console.log('🔄 Déconnexion sécurisée...');
      await logout();
      
      // Rediriger vers la page de connexion
      router.replace('/pages/auth/login' as any);
      
      // Empêcher complètement le retour en arrière après déconnexion
      setTimeout(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
          Alert.alert(
            "Application fermée",
            "Vous avez été déconnecté. L'application va se fermer.",
            [
              {
                text: "OK",
                onPress: () => BackHandler.exitApp(),
              },
            ]
          );
          return true; // Empêcher l'action par défaut
        });
        
        // Nettoyer le handler après un délai pour éviter les conflits
        setTimeout(() => {
          backHandler.remove();
        }, 5000);
      }, 100);
      
    } catch (error) {
      console.error('❌ Erreur lors de la déconnexion:', error);
      // En cas d'erreur, forcer quand même la redirection
      router.replace('/pages/auth/login' as any);
    }
  }, [logout, router]);

  return {
    secureNavigate,
    secureReplace,
    secureLogout,
    isProtectedRoute,
    isPublicRoute,
  };
}; 