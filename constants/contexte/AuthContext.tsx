// constants/contexte/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { verifyOtp, logout } from '../../services/api/api'; // Ajustez selon votre structure

interface AuthContextType {
  isAuthenticated: boolean;
  userId: string | null;
  userToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Vérifier l'état d'authentification au démarrage
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('USER_TOKEN');
        const id = await AsyncStorage.getItem('USER_ID');
        
        if (token && id) {
          setUserToken(token);
          setUserId(id);
          setIsAuthenticated(true);
        }
      } catch (error) {
/*         console.error('Erreur lors de la vérification de l\'authentification:', error);
 */      } finally {
        setLoading(false);
      }
    };
    
    checkAuthStatus();
  }, []);

  // Fonction de connexion
  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    try {
      // Appel à votre API de connexion
      const response = await verifyOtp(email, password); // Ajustez selon votre API
      
      if (response && response.token && response.userId) {
        // Stocker les informations d'authentification
        await AsyncStorage.setItem('USER_TOKEN', response.token);
        await AsyncStorage.setItem('USER_ID', response.userId);
        
        // Mettre à jour l'état
        setUserToken(response.token);
        setUserId(response.userId);
        setIsAuthenticated(true);
      } else {
        throw new Error('Échec de la connexion');
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Fonction de déconnexion
  const handleLogout = async () => {
    setLoading(true);
    try {
      // Appel à votre API de déconnexion si nécessaire
      await logout(); // Ajustez selon votre API
      
      // Supprimer les informations d'authentification
      await AsyncStorage.removeItem('USER_TOKEN');
      await AsyncStorage.removeItem('USER_ID');
      
      // Réinitialiser l'état
      setUserToken(null);
      setUserId(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    isAuthenticated,
    userId,
    userToken,
    loading,
    login: handleLogin,
    logout: handleLogout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook personnalisé pour utiliser le contexte d'authentification
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
};