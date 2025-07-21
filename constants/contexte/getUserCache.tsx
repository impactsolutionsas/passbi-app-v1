// services/cache/UnifiedUserCache.ts - Version corrigée pour recalcul fullName
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getToken, getUser } from '../../services/api/api';

// Interface unifiée pour les données utilisateur
export interface UnifiedUser {
  id: string;
  firstName: string;
  name: string;
  email: string | null;
  photoUrl: string | null;
  role: string;
  createdAt: string;
  idNumber: string | null;
  pieceType: string | null;
  // Nouveaux champs pour les préférences
  preferredPayment?: string;
  notifications?: string;
  // Champs calculés
  fullName: string;
  displayName: string;
}

export interface UserResponse {
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

class UnifiedUserCache {
  private static instance: UnifiedUserCache;
  private userData: UnifiedUser | null = null;
  private lastFetchTime: number = 0;
  private currentToken: string | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly STORAGE_KEY = '@user_data_cache';
  private readonly STORAGE_TIMESTAMP_KEY = '@user_data_timestamp';
  private isFetching: boolean = false;
  private fetchPromise: Promise<UnifiedUser | null> | null = null;
  private listeners: Array<(user: UnifiedUser | null) => void> = [];
  private isInitialized: boolean = false;

  static getInstance(): UnifiedUserCache {
    if (!UnifiedUserCache.instance) {
      UnifiedUserCache.instance = new UnifiedUserCache();
    }
    return UnifiedUserCache.instance;
  }

  // Initialisation du cache avec chargement depuis AsyncStorage
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      
      // Charger les données depuis AsyncStorage
      const [storedUserData, storedTimestamp] = await Promise.all([
        AsyncStorage.getItem(this.STORAGE_KEY),
        AsyncStorage.getItem(this.STORAGE_TIMESTAMP_KEY)
      ]);

      if (storedUserData && storedTimestamp) {
        const parsedUserData = JSON.parse(storedUserData);
        
        // CORRECTION : Recalculer fullName et displayName au chargement
        this.userData = {
          ...parsedUserData,
          fullName: this.calculateFullName(parsedUserData.firstName, parsedUserData.name),
          displayName: this.calculateDisplayName(parsedUserData.firstName, parsedUserData.name)
        };
        
        this.lastFetchTime = parseInt(storedTimestamp, 10);
        
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation du cache:', error);
      this.isInitialized = true; // Continuer même en cas d'erreur
    }
  }

  // Sauvegarder dans AsyncStorage
  private async saveToStorage(userData: UnifiedUser): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(userData)),
        AsyncStorage.setItem(this.STORAGE_TIMESTAMP_KEY, Date.now().toString())
      ]);
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde:', error);
    }
  }

  // Méthode pour s'abonner aux changements
  subscribe(listener: (user: UnifiedUser | null) => void): () => void {
    this.listeners.push(listener);
    
    // Retourner une fonction de désabonnement
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notifier tous les listeners
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.userData);
      } catch (error) {
        console.error('Erreur lors de la notification du listener:', error);
      }
    });
  }

  async isValid(): Promise<boolean> {
    // S'assurer que le cache est initialisé
    await this.initialize();

    if (!this.userData) {
      return false;
    }

    // Pour les données hors connexion, considérer comme valides si elles existent
    // Vérifier expiration du cache seulement si on peut vérifier le token
    try {
      const currentToken = await getToken();
      
      // Si pas de token, utiliser les données en cache (mode hors connexion)
      if (!currentToken) {
        return true; // Considérer comme valide en mode hors connexion
      }

      // Si token différent, invalider le cache
      if (currentToken !== this.currentToken) {
        this.clear();
        return false;
      }

      // Vérifier expiration du cache uniquement si on a une connexion
      if ((Date.now() - this.lastFetchTime) >= this.CACHE_DURATION) {
        return false;
      }

    } catch (error) {
      // En cas d'erreur (probablement hors connexion), utiliser les données en cache
      return true;
    }

    return true;
  }

  // Récupérer les données utilisateur depuis le cache
  async getUser(): Promise<UnifiedUser | null> {
    await this.initialize();

    if (this.userData) {
      return this.userData;
    }

    const isValid = await this.isValid();
    if (isValid && this.userData) {
      return this.userData;
    }

    return null;
  }

  // Récupérer juste le nom d'affichage
  async getDisplayName(): Promise<string> {
    const user = await this.getUser();
    return user?.displayName || 'Utilisateur';
  }

  // Récupérer le nom complet
  async getFullName(): Promise<string> {
    const user = await this.getUser();
    return user?.fullName || 'Utilisateur';
  }

  // Récupérer les données avec fetch automatique si nécessaire
  async fetchUser(forceRefresh: boolean = false): Promise<UnifiedUser | null> {
    // S'assurer que le cache est initialisé
    await this.initialize();

    // Si on ne force pas le refresh et que le cache est valide
    if (!forceRefresh && await this.isValid()) {
      return this.userData;
    }

    // Si un fetch est déjà en cours
    if (this.isFetching && this.fetchPromise) {
      return this.fetchPromise;
    }

    // Démarrer un nouveau fetch
    this.isFetching = true;
    this.fetchPromise = this.performFetch();
    
    try {
      const result = await this.fetchPromise;
      return result;
    } finally {
      this.isFetching = false;
      this.fetchPromise = null;
    }
  }

  private async performFetch(): Promise<UnifiedUser | null> {
    try {
      
      const currentToken = await getToken();
      if (!currentToken) {
        return this.userData; // Retourner les données en cache si pas de token
      }

      // Stocker le token actuel
      this.currentToken = currentToken;

      const userResponse: UserResponse = await getUser(currentToken);
      
      if (userResponse?.data?.user) {
        const rawUser = userResponse.data.user;
        
        // Créer l'objet utilisateur unifié avec toutes les données
        const unifiedUser: UnifiedUser = {
          ...rawUser,
          // Ajouter les préférences depuis la réponse
          preferredPayment: userResponse.data.preferredPayment,
          notifications: userResponse.data.notifications,
          fullName: this.calculateFullName(rawUser.firstName, rawUser.name),
          displayName: this.calculateDisplayName(rawUser.firstName, rawUser.name)
        };
        
        // Mettre à jour le cache et sauvegarder
        this.userData = unifiedUser;
        this.lastFetchTime = Date.now();
        
        // Sauvegarder dans AsyncStorage
        await this.saveToStorage(unifiedUser);
        
        // Notifier les listeners
        this.notifyListeners();
        
        return unifiedUser;
      } else {
        console.warn('⚠️ Structure de réponse utilisateur inattendue');
        return this.userData; // Retourner les données en cache
      }
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des données utilisateur:', error);
      // En cas d'erreur, retourner les données en cache si disponibles
      if (this.userData) {
        return this.userData;
      }
      throw error;
    }
  }

  private calculateFullName(firstName: string, name: string): string {
    const cleanFirstName = firstName?.trim() || '';
    const cleanLastName = name?.trim() || '';
    
    if (cleanFirstName && cleanLastName) {
      return `${cleanFirstName} ${cleanLastName}`;
    } else if (cleanFirstName) {
      return cleanFirstName;
    } else if (cleanLastName) {
      return cleanLastName;
    }
    return 'Utilisateur';
  }

  private calculateDisplayName(firstName: string, name: string): string {
    // Priorité au prénom pour l'affichage
    const cleanFirstName = firstName?.trim() || '';
    const cleanLastName = name?.trim() || '';
    
    if (cleanFirstName) {
      return cleanFirstName;
    } else if (cleanLastName) {
      return cleanLastName;
    }
    return 'Utilisateur';
  }

  // CORRECTION : Mettre à jour manuellement les données avec recalcul forcé
  async updateUser(userData: Partial<UnifiedUser>): Promise<void> {
    if (this.userData) {
      
      // Fusionner les nouvelles données
      const updatedUser = {
        ...this.userData,
        ...userData
      };
      
      // FORCER le recalcul des champs calculés avec les nouvelles données
      const finalFirstName = updatedUser.firstName;
      const finalName = updatedUser.name;
      
      this.userData = {
        ...updatedUser,
        fullName: this.calculateFullName(finalFirstName, finalName),
        displayName: this.calculateDisplayName(finalFirstName, finalName)
      };
      
      this.lastFetchTime = Date.now();
      
      // Sauvegarder dans AsyncStorage
      await this.saveToStorage(this.userData);
      
      // Notifier les listeners
      this.notifyListeners();
    } else {
      console.warn('⚠️ Tentative de mise à jour du cache sans données existantes');
    }
  }

  // Nouvelle méthode pour mettre à jour avec les données de l'API
  async updateFromApiResponse(apiResponse: any): Promise<void> {
    if (apiResponse?.data?.user) {
      const updatedData: Partial<UnifiedUser> = {
        ...apiResponse.data.user,
        preferredPayment: apiResponse.data.preferredPayment,
        notifications: apiResponse.data.notifications
      };
      
      await this.updateUser(updatedData);
    }
  }

  // Invalider le cache (forcer le prochain fetch)
  invalidate(): void {
    this.lastFetchTime = 0;
  }

  // Nettoyer complètement le cache
  async clear(): Promise<void> {
    this.userData = null;
    this.lastFetchTime = 0;
    this.currentToken = null;
    this.isFetching = false;
    this.fetchPromise = null;
    
    // Nettoyer AsyncStorage
    try {
      await Promise.all([
        AsyncStorage.removeItem(this.STORAGE_KEY),
        AsyncStorage.removeItem(this.STORAGE_TIMESTAMP_KEY)
      ]);
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage d\'AsyncStorage:', error);
    }
    
    // Notifier les listeners
    this.notifyListeners();
  }

  // Vérifier si on est en train de charger
  isLoading(): boolean {
    return this.isFetching;
  }

  // Obtenir l'état du cache
  getCacheInfo(): {
    hasData: boolean;
    isValid: boolean;
    lastFetchTime: Date | null;
    isLoading: boolean;
    isInitialized: boolean;
  } {
    return {
      hasData: this.userData !== null,
      isValid: this.userData !== null && (Date.now() - this.lastFetchTime) < this.CACHE_DURATION,
      lastFetchTime: this.lastFetchTime > 0 ? new Date(this.lastFetchTime) : null,
      isLoading: this.isFetching,
      isInitialized: this.isInitialized
    };
  }
}

// Export d'une instance unique
export const userCache = UnifiedUserCache.getInstance();
export default UnifiedUserCache;