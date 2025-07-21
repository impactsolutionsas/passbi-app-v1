// Créez un nouveau fichier, par exemple navigation/AuthGuard.js
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, BackHandler, Alert, TouchableOpacity } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../../../Provider/AppProvider';
import tw from '../../../tailwind';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { 
  isProtectedRoute, 
  isPublicRoute, 
  isNoBackRoute,
  DEFAULT_REDIRECTS 
} from '../../../constants/routeConfig';

// On définit le type des props en précisant que 'children' est de type ReactNode
interface AuthGuardProps {
    children: React.ReactNode;
  }

  export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => { 
     const { isAuthenticated, isInitialized, logout } = useAuth();
     const router = useRouter();
     const pathname = usePathname();
     const [isChecking, setIsChecking] = useState(true);

     // Exception : autoriser l'accès à l'inscription et à la vérification OTP même sans authentification
     const isAuthPage = pathname === "/pages/auth/register" || pathname === "/pages/auth/verificationCode";

     // Vérifier la validité du token
     const validateToken = async (): Promise<boolean> => {
       try {
         const token = await AsyncStorage.getItem('authToken') ||
                      await AsyncStorage.getItem('userToken') ||
                      await AsyncStorage.getItem('token');
         
         if (!token) {
           return false;
         }

         // Décoder et vérifier le token
         const decoded = jwtDecode(token);
         const currentTime = Date.now() / 1000;
         
         if (decoded.exp && decoded.exp < currentTime) {
           console.log('Token expiré détecté');
           return false;
         }

         return true;
       } catch (error) {
         console.error('Erreur lors de la validation du token:', error);
         return false;
       }
     };

     // Gérer le bouton retour du téléphone
     useEffect(() => {
       const backAction = () => {
         // Si l'utilisateur n'est pas authentifié et essaie d'accéder à une route protégée
         if (!isAuthenticated && isProtectedRoute(pathname)) {
           Alert.alert(
             "Accès refusé",
             "Vous devez être connecté pour accéder à cette page.",
             [
               {
                 text: "Se connecter",
                 onPress: () => router.replace(DEFAULT_REDIRECTS.unauthenticated as any),
               },
               {
                 text: "Fermer l'app",
                 onPress: () => BackHandler.exitApp(),
                 style: "destructive",
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
     }, [isAuthenticated, pathname, router]);

     // Vérification de l'authentification au chargement
     useEffect(() => {
       const checkAuth = async () => {
         setIsChecking(true);
         
         try {
           const isValid = await validateToken();
           
           // Si le token n'est pas valide et qu'on est sur une route protégée
           if (!isValid && isProtectedRoute(pathname) && !isAuthPage) {
             console.log('Token invalide sur route protégée, redirection vers login');
             await logout();
             if (pathname !== '/pages/auth/login') {
             router.replace(DEFAULT_REDIRECTS.unauthenticated as any);
             }
             return;
           }
           
           // Si l'utilisateur est authentifié et qu'on est sur une route publique
           if (isAuthenticated && isPublicRoute(pathname) && pathname !== '/(tabs)') {
             console.log('Utilisateur authentifié sur route publique, redirection vers accueil');
             if (pathname !== DEFAULT_REDIRECTS.authenticated) {
             router.replace(DEFAULT_REDIRECTS.authenticated as any);
             }
             return;
           }
           
         } catch (error) {
           console.error('Erreur lors de la vérification d\'authentification:', error);
           if (isProtectedRoute(pathname)) {
             await logout();
             if (pathname !== '/pages/auth/login') {
             router.replace(DEFAULT_REDIRECTS.unauthenticated as any);
             }
           }
         } finally {
           setIsChecking(false);
         }
       };

       if (isInitialized) {
         checkAuth();
       }
     }, [isAuthenticated, isInitialized, pathname, logout, router, isAuthPage]);

     // Vérification périodique de l'authentification
     useEffect(() => {
       if (!isAuthenticated || !isProtectedRoute(pathname)) {
         return;
       }

       const interval = setInterval(async () => {
         const isValid = await validateToken();
         if (!isValid) {
           console.log('Token expiré détecté lors de la vérification périodique');
           await logout();
           router.replace(DEFAULT_REDIRECTS.unauthenticated as any);
         }
       }, 30000); // Vérifier toutes les 30 secondes

       return () => clearInterval(interval);
     }, [isAuthenticated, pathname, logout, router]);

     // Afficher un loader pendant la vérification
     if (isChecking || !isInitialized) {
       return (
         <View style={tw`flex-1 justify-center items-center bg-white`}>
           <ActivityIndicator size="large" color="#0D9488" />
           <Text style={tw`mt-4 text-gray-600`}>Vérification de l'authentification...</Text>
         </View>
       );
     }

     // Si l'utilisateur n'est pas authentifié et essaie d'accéder à une route protégée
     if (!isAuthenticated && isProtectedRoute(pathname)) {
       return (
         <View style={tw`flex-1 justify-center items-center bg-white px-4`}>
           <Text style={tw`text-xl font-bold text-gray-900 mb-4`}>
             Accès refusé
           </Text>
           <Text style={tw`text-gray-600 text-center mb-6`}>
             Vous n&apos;êtes pas autorisé à accéder à cette page.
           </Text>
           <View style={tw`flex-row gap-4`}>
             <TouchableOpacity
               style={tw`bg-teal-600 px-6 py-3 rounded-xl`}
               onPress={() => router.replace(DEFAULT_REDIRECTS.unauthenticated as any)}
             >
               <Text style={tw`text-white font-semibold`}>
                 Se connecter
               </Text>
             </TouchableOpacity>
             <TouchableOpacity
               style={tw`bg-gray-500 px-6 py-3 rounded-xl`}
               onPress={() => BackHandler.exitApp()}
             >
               <Text style={tw`text-white font-semibold`}>
                 Fermer
               </Text>
             </TouchableOpacity>
           </View>
         </View>
       );
     }

     // Si tout est OK, afficher le contenu
     return <>{children}</>;
  }

