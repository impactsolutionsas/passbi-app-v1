// contexts/OperatorContext.tsx - Version corrigée avec gestion utilisateur

import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useMemo,
  useCallback,
  useRef
} from 'react';
import { getOperator, getUser, getToken } from '../../services/api/api';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

// Interfaces mises à jour
export interface Operator {
  id: string;
  name: string;
  logoUrl: string;
  isUrbainStatus: boolean | string;
  ticketValidity: string;
}

export interface OperatorWithZones {
  operator: Operator;
  zones: any[];
}

interface CachedData {
  data: OperatorWithZones[];
  timestamp: number;
}

// Interface utilisateur mise à jour pour correspondre à l'API
interface User {
  id: string;
  firstName: string;
  name: string;
  email: string | null;
  photoUrl: string | null;
  role: string;
  createdAt: string;
  idNumber: string | null;
  pieceType: string | null;
  // Champ calculé pour la compatibilité
  username: string;
  fullName: string;
}

interface UserResponse {
  data: {
    id: string;
    notifications: string;
    preferredPayment: string;
    user: {
      id: string;
      firstName: string;
      name: string;
      email: string | null;
      photoUrl: string | null;
      role: string;
      createdAt: string;
      idNumber: string | null;
      pieceType: string | null;
    };
    userId: string;
  };
  message: string;
  status: number;
}

interface OperatorContextType {
  operators: OperatorWithZones[];
  selectedOperator: Operator | null;
  setSelectedOperator: (operator: Operator) => void;
  loading: boolean;
  error: string | null;
  refreshOperators: () => Promise<void>;
  lastFetched: number | null;
  getOperatorById: (operatorId: string) => Promise<OperatorWithZones | null>;
  operatorIconsCache: Map<string, string>;
  user: User | null;
  userLoading: boolean;
  isInitialized: boolean;
  refreshUser: () => Promise<void>; // Nouvelle fonction pour rafraîchir l'utilisateur
}

interface OperatorProviderProps {
  children: ReactNode;
}

export const OperatorContext = createContext<OperatorContextType | undefined>(undefined);

// Clés de stockage
const OPERATORS_STORAGE_KEY = 'CACHED_OPERATORS_DATA';
const ICONS_CACHE_KEY = 'OPERATORS_ICONS_CACHE';
const USER_STORAGE_KEY = 'CACHED_USER_DATA';
const CACHE_MAX_AGE =     1 * 1000; // 7 jours
const USER_CACHE_MAX_AGE = 10 *   1000; // 30 minutes pour les données utilisateur
const MIN_REFRESH_INTERVAL = 1 * 1000; // 5 minutes minimum entre les refresh

export const OperatorProvider: React.FC<OperatorProviderProps> = ({ children }) => {
  const [operators, setOperators] = useState<OperatorWithZones[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [operatorIconsCache] = useState<Map<string, string>>(new Map());
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Références pour éviter les appels multiples
  const isLoadingRef = useRef(false);
  const isUserLoadingRef = useRef(false);
  const lastRefreshRef = useRef<number>(0);
  const lastUserRefreshRef = useRef<number>(0);
  const initializationPromiseRef = useRef<Promise<void> | null>(null);

  // Fonction pour transformer les données utilisateur de l'API
  const transformUserData = useCallback((apiUserData: UserResponse['data']['user']): User => {
    const { firstName, name } = apiUserData;
    const cleanFirstName = firstName?.trim() || "";
    const cleanLastName = name?.trim() || "";
    
    let fullName = "";
    let username = "";
    
    if (cleanFirstName && cleanLastName) {
      fullName = `${cleanFirstName} ${cleanLastName}`;
      username = `${cleanFirstName} ${cleanLastName}`;
    } else if (cleanFirstName) {
      fullName = cleanFirstName;
      username = cleanFirstName;
    } else if (cleanLastName) {
      fullName = cleanLastName;
      username = cleanLastName;
    } else {
      fullName = "Utilisateur";
      username = "Utilisateur";
    }

    return {
      ...apiUserData,
      username,
      fullName
    };
  }, []);

  // Fonction pour charger les données utilisateur
  const loadUser = useCallback(async (forceRefresh: boolean = false): Promise<void> => {
    if (isUserLoadingRef.current && !forceRefresh) {
      return;
    }

    const now = Date.now();
    if (!forceRefresh && (now - lastUserRefreshRef.current) < MIN_REFRESH_INTERVAL) {
      return;
    }

    try {
      isUserLoadingRef.current = true;
      setUserLoading(true);

      // Vérifier d'abord le token
      const token = await getToken();
      if (!token) {
        setUser(null);
        return;
      }

      // Essayer le cache d'abord
      if (!forceRefresh) {
        const cachedUserString = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (cachedUserString) {
          const cachedUserData = JSON.parse(cachedUserString);
          const isUserDataFresh = Date.now() - cachedUserData.timestamp < USER_CACHE_MAX_AGE;
          
          if (cachedUserData.data && isUserDataFresh) {
            setUser(cachedUserData.data);
            return;
          }
        }
      }

      // Appel API
      const userResponse: UserResponse = await getUser();
      
      if (userResponse && userResponse.data && userResponse.data.user) {
        const transformedUser = transformUserData(userResponse.data.user);
        setUser(transformedUser);
        
        // Sauvegarder en cache
        const timestamp = Date.now();
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ 
          data: transformedUser, 
          timestamp 
        }));
        lastUserRefreshRef.current = timestamp;
        
      } else {
        setUser(null);
      }
    } catch (error) {
/*       console.error('❌ Erreur lors du chargement utilisateur:', error);
 */      
      // Fallback vers le cache en cas d'erreur
      try {
        const cachedUserString = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (cachedUserString) {
          const cachedUserData = JSON.parse(cachedUserString);
          if (cachedUserData.data) {
            console.log('🔄 Fallback vers le cache utilisateur après erreur');
            setUser(cachedUserData.data);
          }
        }
      } catch (cacheErr) {
        console.error('❌ Erreur cache utilisateur:', cacheErr);
        console.log('[DEBUG CLEAR USER] setUser(null) déclenché car erreur lors du fallback cache utilisateur');
        setUser(null);
      }
    } finally {
      setUserLoading(false);
      isUserLoadingRef.current = false;
    }
  }, [transformUserData]);

  // Fonction publique pour rafraîchir l'utilisateur
  const refreshUser = useCallback(async (): Promise<void> => {
    await loadUser(true);
  }, [loadUser]);

  const updateIconsCache = useCallback(async (operators: OperatorWithZones[]) => {
    try {
      const iconsData: { [key: string]: string } = {};
      operators.forEach(op => {
        if (op.operator.logoUrl) {
          operatorIconsCache.set(op.operator.id, op.operator.logoUrl);
          iconsData[op.operator.id] = op.operator.logoUrl;
        }
      });
      await AsyncStorage.setItem(ICONS_CACHE_KEY, JSON.stringify(iconsData));
    } catch (error) {
      console.warn('Erreur lors de la sauvegarde du cache des icônes:', error);
    }
  }, [operatorIconsCache]);

  const loadIconsCache = useCallback(async () => {
    try {
      const cachedIcons = await AsyncStorage.getItem(ICONS_CACHE_KEY);
      if (cachedIcons) {
        const iconsData = JSON.parse(cachedIcons);
        Object.entries(iconsData).forEach(([id, url]) => {
          operatorIconsCache.set(id, url as string);
        });
      }
    } catch (error) {
/*       console.warn('Erreur lors du chargement du cache des icônes:', error);
 */    }
  }, [operatorIconsCache]);

  const loadOperators = useCallback(async (forceRefresh: boolean = false): Promise<void> => {
    if (isLoadingRef.current && !forceRefresh) {
      return;
    }

    const now = Date.now();
    if (!forceRefresh && (now - lastRefreshRef.current) < MIN_REFRESH_INTERVAL) {
      return;
    }

    try {
      isLoadingRef.current = true;
      setError(null);
      
      if (operatorIconsCache.size === 0) {
        await loadIconsCache();
      }

      if (!forceRefresh) {
        const cachedDataString = await AsyncStorage.getItem(OPERATORS_STORAGE_KEY);
        if (cachedDataString) {
          const cachedData: CachedData = JSON.parse(cachedDataString);
          const isDataFresh = Date.now() - cachedData.timestamp < CACHE_MAX_AGE;
          
          if (cachedData.data && cachedData.data.length > 0) {
            setOperators(cachedData.data);
            if (cachedData.data.length > 0 && !selectedOperator) {
              setSelectedOperator(cachedData.data[0].operator);
            }
            setLastFetched(cachedData.timestamp);
            setIsInitialized(true);
            
            if (isDataFresh) {
              return;
            }
          }
        }
      }

      setLoading(true);
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        throw new Error('Pas de connexion internet');
      }

      const response = await getOperator();
      
      console.log("operator",response);
      
      if (response && Array.isArray(response.data)) {
        setOperators(response.data);
        if (response.data.length > 0 && !selectedOperator) {
          setSelectedOperator(response.data[0].operator);
        }

        const timestamp = Date.now();
        await AsyncStorage.setItem(OPERATORS_STORAGE_KEY, JSON.stringify({ 
          data: response.data, 
          timestamp 
        }));
        setLastFetched(timestamp);
        lastRefreshRef.current = timestamp;
        await updateIconsCache(response.data);
      }
    } catch (err: any) {
/*       console.error('❌ Erreur lors du chargement:', err);
 */      setError(err.message);
      
      try {
        const cachedDataString = await AsyncStorage.getItem(OPERATORS_STORAGE_KEY);
        if (cachedDataString) {
          const cachedData: CachedData = JSON.parse(cachedDataString);
          if (cachedData.data && cachedData.data.length > 0) {
            console.log('🔄 Fallback vers le cache après erreur');
            setOperators(cachedData.data);
            if (!selectedOperator) {
              setSelectedOperator(cachedData.data[0].operator);
            }
            setLastFetched(cachedData.timestamp);
          }
        }
      } catch (cacheErr) {
        console.error('❌ Erreur cache:', cacheErr);
      }
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
      setIsInitialized(true);
    }
  }, [selectedOperator, loadIconsCache, updateIconsCache]);

  const initializeOperators = useCallback(async (): Promise<void> => {
    if (initializationPromiseRef.current) {
      return initializationPromiseRef.current;
    }

    initializationPromiseRef.current = loadOperators(false);
    return initializationPromiseRef.current;
  }, [loadOperators]);

  const getOperatorById = useCallback(async (operatorId: string): Promise<OperatorWithZones | null> => {
    const cachedOperator = operators.find(op => op.operator?.id === operatorId);
    if (cachedOperator) {
      return cachedOperator;
    }

    if (!isInitialized) {
      await initializeOperators();
      const operatorAfterInit = operators.find(op => op.operator?.id === operatorId);
      if (operatorAfterInit) {
        return operatorAfterInit;
      }
    }

    try {
      await loadOperators(true);
      const refreshedOperator = operators.find(op => op.operator?.id === operatorId);
      return refreshedOperator || null;
    } catch (error) {
      console.error('❌ Erreur getOperatorById:', error);
      return null;
    }
  }, [operators, loadOperators, isInitialized, initializeOperators]);

  const refreshOperators = useCallback(async (): Promise<void> => {
    const now = Date.now();
    
    if (now - lastRefreshRef.current < MIN_REFRESH_INTERVAL) {
      return;
    }

    await loadOperators(true);
  }, [loadOperators]);

  // Initialisation au montage
  useEffect(() => {
    const initialize = async () => {
      await initializeOperators();
      // Charger l'utilisateur après l'initialisation des opérateurs
      await loadUser();
    };
    
    initialize();
  }, []);

  // Gestion des changements d'état de l'app
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && isInitialized) {
        clearTimeout(timeoutId);
        
        timeoutId = setTimeout(() => {
          const now = Date.now();
          const timeSinceLastFetch = lastFetched ? now - lastFetched : Infinity;
          const timeSinceLastUserFetch = lastUserRefreshRef.current ? now - lastUserRefreshRef.current : Infinity;
          
          // Refresh opérateurs si anciennes (> 1 heure)
          if (timeSinceLastFetch > 60 * 60 * 1000) {
            loadOperators(true);
          }
          
          // Refresh utilisateur si anciennes (> 30 minutes)
          if (timeSinceLastUserFetch > USER_CACHE_MAX_AGE) {
            loadUser(true);
          }
        }, 2000) as any;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      clearTimeout(timeoutId);
      subscription?.remove();
    };
  }, [isInitialized, lastFetched, loadOperators, loadUser]);

  // Vérification périodique
  useEffect(() => {
    if (!lastFetched || !isInitialized) return;

    const checkForUpdates = async () => {
      const networkState = await NetInfo.fetch();
      if (networkState.isConnected) {
        const sixHoursInMs = 6 * 60 * 60 * 1000;
        const now = Date.now();
        
        // Vérifier les opérateurs
        if (now - lastFetched > sixHoursInMs) {
          loadOperators(true);
        }
        
        // Vérifier l'utilisateur
        if (now - lastUserRefreshRef.current > USER_CACHE_MAX_AGE) {
          loadUser(true);
        }
      }
    };

    const intervalId = setInterval(checkForUpdates, 2 * 60 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [lastFetched, loadOperators, loadUser, isInitialized]);

  const contextValue = useMemo<OperatorContextType>(() => ({
    operators,
    selectedOperator,
    setSelectedOperator,
    loading,
    error,
    refreshOperators,
    lastFetched,
    getOperatorById,
    operatorIconsCache,
    user,
    userLoading,
    isInitialized,
    refreshUser
  }), [
    operators,
    selectedOperator,
    loading,
    error,
    refreshOperators,
    lastFetched,
    getOperatorById,
    operatorIconsCache,
    user,
    userLoading,
    isInitialized,
    refreshUser
  ]);

  return (
    <OperatorContext.Provider value={contextValue}>
      {children}
    </OperatorContext.Provider>
  );
};

export const useOperators = (): OperatorContextType => {
  const context = useContext(OperatorContext);
  if (!context) {
    throw new Error('useOperators doit être utilisé à l\'intérieur d\'un OperatorProvider');
  }
  return context;
};