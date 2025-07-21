// constants/headerpage/HeaderComponent.tsx - Version corrigée avec bouton de retour

import {useState, FC, useEffect, useCallback, ReactNode, useMemo, useRef} from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, SafeAreaView, KeyboardAvoidingView,Animated ,Platform, ActivityIndicator,Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import tw from '../../tailwind'; 
import CustomTabBar from '../CustomTabBar';
import { userCache, UnifiedUser } from '../contexte/getUserCache';
import { AuthGuard } from "../../app/pages/auth/AuthGuard";

// Define interface for operator type
interface Operator {
  name: string;
  logoUrl?: string;
  slogan?: string;
  commissionPassenger?: number;
  transportType?: string;
}

interface HeaderComponentProps {
  onNotificationPress?: () => void;
  customStyle?: object;
  customLeftComponent?: React.ReactNode;
  customLeftComponentProfil?: React.ReactNode;
  userName?: string;
  showGreeting?: boolean;
  showGreetings?: boolean;
  onEndSession?: () => void;
  children?: React.ReactNode;
  operator?: Operator;
  showOperator?: boolean;
  showDetails?: boolean;
  price?: number;
  requestedSeats?: string;
}

// Hook personnalisé pour gérer l'état utilisateur avec support hors connexion
const useUserData = () => {
  const [user, setUser] = useState<UnifiedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const isMountedRef = useRef(true);

  // Fonction pour charger les données utilisateur
  const loadUserData = useCallback(async (showLoader: boolean = false) => {
    try {
      if (showLoader && isMountedRef.current) {
        setIsLoading(true);
      }

      // S'assurer que le cache est initialisé
      await userCache.initialize();

      // D'abord essayer de récupérer depuis le cache (maintenant avec AsyncStorage)
      const cachedUser = await userCache.getUser();
      if (cachedUser && isMountedRef.current) {
        setUser(cachedUser);
      }

      // Essayer de fetch depuis l'API si nécessaire (sans forcer si hors connexion)
      try {
        const fetchedUser = await userCache.fetchUser(false);
        if (fetchedUser && isMountedRef.current) {
          setUser(fetchedUser);
        }
      } catch (error) {
        // En cas d'erreur de connexion, on garde les données en cache
      }

    } catch (error) {
      console.error('❌ HeaderComponent: Erreur lors du chargement utilisateur:', error);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsInitialized(true);
      }
    }
  }, []);

  // Effet pour s'abonner aux changements du cache
  useEffect(() => {
    // Charger les données initiales
    loadUserData(true);

    // S'abonner aux changements
    const unsubscribe = userCache.subscribe((updatedUser) => {
      if (isMountedRef.current) {
        setUser(updatedUser);
      }
    });

    // Cleanup
    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [loadUserData]);

  return {
    user,
    isLoading,
    isInitialized,
    refreshUser: () => loadUserData(false)
  };
};

// Composant Skeleton pour le nom d'utilisateur
const UsernameSkeleton: React.FC = () => {
  const spinAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnimation, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [spinAnimation]);

  const spin = spinAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={tw`flex-row items-center`}>
      {/* Cercle de chargement fin */}
      <View style={tw`w-4 h-4 mr-2`}>
        <Animated.View
          style={[
            tw`w-4 h-4 rounded-full border-2 border-gray-300`,
            {
              borderTopColor: 'rgba(255, 255, 255, 0.8)',
              transform: [{ rotate: spin }],
            },
          ]}
        />
      </View>
    </View>
  );
};

// Composant optimisé pour l'affichage du nom complet avec recalcul dynamique
const UsernameDisplay: React.FC<{
  user: UnifiedUser | null;
  userLoading: boolean;
  isInitialized: boolean;
}> = ({ user, userLoading, isInitialized }) => {
  
  // CORRECTION : Recalculer dynamiquement le nom complet au lieu d'utiliser user.fullName
  const fullName = useMemo(() => {
    if (!user) return "Utilisateur";
    
    // Recalculer à partir des données actuelles firstName et name
    const cleanFirstName = user.firstName?.trim() || '';
    const cleanLastName = user.name?.trim() || '';
    
    if (cleanFirstName && cleanLastName) {
      return `${cleanFirstName} ${cleanLastName}`;
    } else if (cleanFirstName) {
      return cleanFirstName;
    } else if (cleanLastName) {
      return cleanLastName;
    }
    return 'Utilisateur';
  }, [user?.firstName, user?.name]); // Dépendances sur les champs individuels

  // Afficher le skeleton pendant le chargement initial seulement
  if (!isInitialized || (userLoading && !user)) {
    return <UsernameSkeleton />;
  }

  // Si l'utilisateur est initialisé mais qu'on n'a pas de données
  if (isInitialized && !user) {
    return (
      <View style={tw`flex-row items-center`}>
        <Text style={tw`text-white text-base font-semibold tracking-wide`}>
          Utilisateur
        </Text>
      </View>
    );
  }

  return (
    <View style={tw`flex-row items-center`}>
      <Text style={tw`text-white text-base font-semibold tracking-wide`}>
        {fullName}
      </Text>
      
      {/* Indicateur de chargement discret pendant les mises à jour */}
      {userLoading && user && (
        <View style={tw`ml-2 w-3 h-3`}>
          <ActivityIndicator 
            size="small" 
            color="rgba(255,255,255,0.7)" 
          />
        </View>
      )}
    </View>
  );
};

const HeaderComponent: React.FC<HeaderComponentProps> = ({
  onNotificationPress,
  customStyle,
  customLeftComponent,
  customLeftComponentProfil,
  
  userName = "",
  showGreeting = false,
  showGreetings = false,
  onEndSession,
  children,
  operator = { name: "" },
  showOperator = false,
  showDetails = false,
  price = 0,
  requestedSeats = "1"
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  
  // Utiliser le hook personnalisé pour les données utilisateur avec support hors connexion
  const { user, isLoading: userLoading, isInitialized, refreshUser } = useUserData();

  const handleNotification = () => {
    if (onNotificationPress) {
      onNotificationPress();
    }
  };

  // Get logo based on operator name
  const getOperatorLogo = (operatorName: string) => {
    switch(operatorName.toLowerCase()) {
      case 'brt':
        return require("../../assets/images/BRT.png");
      case 'ter':
        return require("../../assets/images/TER.png");
      case 'dakar dem dikk':
      case 'dem dikk':
        return require("../../assets/images/DD.png");
      default:
        return require("../../assets/images/logoheader.png");
    }
  };

  return (
    <KeyboardAvoidingView 
      style={tw`flex-1`}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView contentContainerStyle={tw`flex-grow `} bounces={false}>
        <SafeAreaView style={tw`flex-1 bg-white `}>

          <View style={[tw`h-70 bg-teal-800 rounded-b-lg`, customStyle]}>
           

                  {customLeftComponent ? (
              <>
                {customLeftComponent}
                {/* Bouton de retour intégré */}
                <TouchableOpacity 
                  style={tw`absolute top-12 left-5 z-10`}
                  onPress={() => router.back()}
                >
                  <Text style={tw`text-white text-4xl font-bold`}>←</Text>
                </TouchableOpacity>
              </>
            ) : (
             
            
              <Image 
                source={require("../../assets/images/logoheader.png")} 
                style={tw`w-full h-full absolute rounded-b-lg`} 
                resizeMode="cover"
              />
             
            
              
              
              
            )}
             
            
            {/* Show operator information if requested */}
            {showOperator && operator && operator.name && (
              <View style={tw`flex-row items-center px-5 pt-16`}>
                <View style={tw`w-12 h-12 rounded-full bg-white items-center justify-center`}>
                  
                  <Image 
                    source={operator.logoUrl ? { uri: operator.logoUrl } : getOperatorLogo(operator.name)} 
                    style={tw`w-10 h-10 rounded-full`}
                    resizeMode="contain"
                  />
                </View>
                <View style={tw`ml-3`}>
                  <Text style={tw`text-white font-bold text-lg`}>{operator.name}</Text>
                  {operator.slogan && (
                    <Text style={tw`text-white text-xs`}>{operator.slogan}</Text>
                  )}
                </View>
              </View>
            )}
            
            {/* Texte de salutation et nom d'utilisateur - CORRIGÉ */}
            {(showGreeting || showGreetings) && (
              <View style={tw`flex-row justify-between items-center px-6 pt-40`}>
                <View style={tw`flex-row items-center`}>
                  <Text style={tw`text-white text-base font-light tracking-wide`}>
                    Bonjour,{' '}
                  </Text>
                  
                  {/* Composant d'affichage corrigé avec recalcul dynamique */}
                  <UsernameDisplay 
                    user={user}
                    userLoading={userLoading}
                    isInitialized={isInitialized}
                  />
                </View>
                
                {/* Bouton notification */}
                {/* <TouchableOpacity 
                  onPress={handleNotification}
                  style={tw`p-2`}
                >
                  <Ionicons name="notifications-outline" size={24} color="white" />
                </TouchableOpacity> */}
              </View>
            )}
            
            {/* Show ticket details if requested */}
            {showDetails && operator && operator.name && (
              <View style={tw`flex-row items-center px-5 pt-16`}>
                <View style={tw`w-12 h-12 rounded-full bg-white items-center justify-center`}>
                  <Image 
                    source={operator.logoUrl ? { uri: operator.logoUrl } : getOperatorLogo(operator.name)} 
                    style={tw`w-10 h-10 rounded-full`}
                    resizeMode="contain"
                  />
                  
                </View>
                <View style={tw`ml-3`}>
                  <Text style={tw`text-white font-bold text-lg`}>{operator.name}</Text>
                  {operator.slogan && (
                    <Text style={tw`text-white text-xs`}>{operator.slogan}</Text>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Carte blanche contenant le contenu */}
          <View style={tw`${showDetails ? '-mt-6' : '-mt-20'} bg-white rounded-lg p-2 px-3 pt-5`}>
            {children}
          </View>
        </SafeAreaView>
      </ScrollView>

    </KeyboardAvoidingView>
  );
};

export default HeaderComponent;