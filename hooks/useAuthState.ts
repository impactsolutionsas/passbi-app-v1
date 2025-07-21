import { useState, useEffect } from 'react';
import { useAuth } from '../Provider/AppProvider';

export const useAuthState = () => {
  const { isAuthenticated, isInitialized } = useAuth();
  const [hasBeenAuthenticated, setHasBeenAuthenticated] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(true);

  // Suivre si l'utilisateur a été authentifié au moins une fois
  useEffect(() => {
    if (isAuthenticated && !hasBeenAuthenticated) {
      setHasBeenAuthenticated(true);
      setIsFirstVisit(false);
    }
  }, [isAuthenticated, hasBeenAuthenticated]);

  // Déterminer si l'utilisateur s'est déconnecté
  const hasLoggedOut = hasBeenAuthenticated && !isAuthenticated;

  // Déterminer si c'est la première visite
  const isNewUser = isFirstVisit && !isAuthenticated;

  return {
    isAuthenticated,
    isInitialized,
    hasBeenAuthenticated,
    hasLoggedOut,
    isNewUser,
    isFirstVisit,
  };
}; 