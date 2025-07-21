import { API_URL } from "../config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { supabaseClient } from "../../lib/supabase";

// Clés de cache pour les différentes requêtes
// Clés de cache élargies
// Clés de cache pour les différentes requêtes
export const CACHE_KEYS = {
  USER_PREFERENCES: "cache_user_preferences",
  TICKETS_HISTORY: 'TICKETS_HISTORY',
  USER_INFO: 'USER_INFO',
  SEARCH_RESULTS: "cache_search_results_",
  USER_PROFILE: "cache_user_profile",
  ACTIVE_RESERVATIONS: "cache_active_reservations",
  LATEST_SEARCHES: "cache_latest_searches",
  BUS_STATIONS: "cache_bus_stations",
  POPULAR_ROUTES: "cache_popular_routes",
  OFFLINE_STATUS: "offline_status"
};

export const CACHE_DURATION = {
  SHORT: 10000 * 60 * 10,         // 10 minutes
 
};

// Clés de stockage
const AUTH_TOKEN_KEY = "authToken";
const AUTH_TOKEN_BACKUP_KEY = "authTokenBackup";
const TOKEN_TIMESTAMP_KEY = "authTokenTimestamp";

// Fonction améliorée pour enregistrer le token
export const setToken = async (token) => {
  try {
    // Enregistrer le token principal
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);

    // Enregistrer une copie de sauvegarde du token
    await AsyncStorage.setItem(AUTH_TOKEN_BACKUP_KEY, token);

    // Enregistrer un timestamp pour suivre quand le token a été stocké
    await AsyncStorage.setItem(TOKEN_TIMESTAMP_KEY, Date.now().toString());

    // Ajout : Vérifier que le token est bien stocké
    const check = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    console.log("[DEBUG] Token stocké dans AsyncStorage:", check);

    console.log("Token sauvegardé avec succès");
    return true;
  } catch (error) {
/*     console.error("Erreur lors de la sauvegarde du token:", error);
 */    return false;
  }
};


// Fonction optimisée pour récupérer les données utilisateur avec stratégie cache-first
export const getUser = async (token) => {
  if (!isTokenWellFormed(token)) {
    console.warn("Token mal formé détecté dans getUser:", token);
    throw new Error("TOKEN_MALFORMED");
  }
  let cachedData = null;
  try {
    // 1. Appel réseau à l'API utilisateur
    const response = await fetch(`${API_URL}/settings/user/preferences`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      timeout: 10000 // Timeout 10 secondes
    });

    if (response.ok) {
      const userData = await response.json();
      // 2. Mise en cache des données fraîches
      await AsyncStorage.setItem(
        CACHE_KEYS.USER_PREFERENCES,
        JSON.stringify({
          timestamp: Date.now(),
          data: userData
        })
      );
      console.log("✅ Données utilisateur mises à jour depuis l'API");
      return userData;
    } else if (response.status === 401 || response.status === 403) {
      // Cas critique : token refusé, déclencher la déconnexion
      console.warn('[DECONNEXION] Backend a retourné', response.status, 'pour getUser. Token refusé.');
      throw new Error('UNAUTHORIZED');
    } else {
      // Pour les autres erreurs, tente le cache ou mode dégradé
      console.warn('Erreur API non critique (', response.status, '), tentative d\'utilisation du cache');
      // On ne lève pas d'erreur ici, on passe à la lecture du cache plus bas
    }
  } catch (networkError) {
    console.warn("🌐 Erreur réseau ou API, tentative d'utilisation du cache:", networkError);
    // On continue vers la lecture du cache
  }
  // 4. Lecture du cache si dispo
  try {
    const cachedDataJson = await AsyncStorage.getItem(CACHE_KEYS.USER_PREFERENCES);
    if (cachedDataJson) {
      cachedData = JSON.parse(cachedDataJson);
      const cacheAge = Date.now() - cachedData.timestamp;
      if (cacheAge < CACHE_DURATION.SHORT) {
        console.log("📦 Utilisation des données utilisateur depuis le cache");
        return cachedData.data;
      } else {
        console.warn("⚠️ Cache expiré, non utilisé");
      }
    }
  } catch (cacheError) {
    console.error("❌ Erreur lors de la lecture du cache:", cacheError);
  }
  // 5. Si aucun fallback dispo
  console.warn('[DECONNEXION] Impossible de récupérer les données utilisateur, cache et API indisponibles.');
  throw new Error("Impossible de récupérer les données utilisateur");
};
// Fonction pour mettre à jour les données utilisateur
export const updateUser = async (userId, userData, token) => {
  try {
    // Créer l'objet de données de requête avec tous les champs
    const requestData = {
      userId: userId,
      name: userData.name,
      firstName: userData.firstName,
      notifications: userData.notifications,
      preferredPayment: userData.preferredPayment
    };

    console.log("Données envoyées pour mise à jour:", requestData);

    const response = await fetch(`${API_URL}/settings/user/preferences/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestData),
      timeout: 15000 // Timeout de 15 secondes pour les mises à jour
    });

    const data = await response.json();
    console.log("Réponse complète de l'API pour updateUser:", data);

  

    return data;
  } catch (error) {
    console.error('Erreur updateUser:', error);
    throw error;
  }
};

// Fonction pour vérifier la validité du cache
export const isCacheValid = async (cacheKey = CACHE_KEYS.USER_PREFERENCES, maxAge = CACHE_DURATION.MEDIUM) => {
  try {
    const cachedDataJson = await AsyncStorage.getItem(cacheKey);
    if (!cachedDataJson) {
      return false;
    }

    const cachedData = JSON.parse(cachedDataJson);
    const cacheAge = Date.now() - cachedData.timestamp;
    
    // Le cache est valide s'il n'a pas dépassé l'âge maximum
    return cacheAge < maxAge;
  } catch (error) {
/*     console.error("Erreur lors de la vérification de la validité du cache:", error);
 */    return false;
  }
};

// Fonction pour vider le cache utilisateur
export const clearUserCache = async () => {
  try {
    await AsyncStorage.removeItem(CACHE_KEYS.USER_PREFERENCES);
    console.log("Cache utilisateur vidé avec succès");
    return true;
  } catch (error) {
    console.error("Erreur lors du vidage du cache utilisateur:", error);
    return false;
  }
};

// Fonction pour vider tout le cache
export const clearAllCache = async () => {
  try {
    const cachePromises = Object.values(CACHE_KEYS).map(key => 
      AsyncStorage.removeItem(key)
    );
    
    await Promise.allSettled(cachePromises);
    console.log("Tout le cache a été vidé avec succès");
    return true;
  } catch (error) {
    console.error("Erreur lors du vidage de tout le cache:", error);
    return false;
  }
};

// Fonction pour supprimer le token d'authentification
export const removeToken = async () => {
  try {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(AUTH_TOKEN_BACKUP_KEY);
    await AsyncStorage.removeItem(TOKEN_TIMESTAMP_KEY);
    console.log("Token supprimé avec succès");
    return true;
  } catch (error) {
    console.error("Erreur lors de la suppression du token:", error);
    return false;
  }
};

// Fonction pour vérifier si le token est expiré


// Fonction utilitaire pour récupérer des données génériques avec cache
export const getCachedData = async (cacheKey, fetchFunction, maxAge = CACHE_DURATION.MEDIUM) => {
  try {
    // Vérifier le cache d'abord
    const cachedDataJson = await AsyncStorage.getItem(cacheKey);
    
    if (cachedDataJson) {
      const cachedData = JSON.parse(cachedDataJson);
      const cacheAge = Date.now() - cachedData.timestamp;
      
      if (cacheAge < maxAge) {
        console.log(`Données récupérées du cache pour ${cacheKey}`);
        return cachedData.data;
      }
    }

    // Si le cache n'est pas valide, faire la requête
    const freshData = await fetchFunction();
    
    // Sauvegarder dans le cache
    await AsyncStorage.setItem(cacheKey, JSON.stringify({
      timestamp: Date.now(),
      data: freshData
    }));

    return freshData;
  } catch (error) {
    console.error(`Erreur lors de la récupération des données pour ${cacheKey}:`, error);
    
    // En cas d'erreur, essayer de retourner les données en cache même si expirées
    try {
      const cachedDataJson = await AsyncStorage.getItem(cacheKey);
      if (cachedDataJson) {
        const cachedData = JSON.parse(cachedDataJson);
        console.log(`Utilisation des données expirées du cache pour ${cacheKey}`);
        return cachedData.data;
      }
    } catch (cacheError) {
      console.error(`Erreur lors de la récupération du cache de secours:`, cacheError);
    }
    
    throw error;
  }
};
export const ticketPending = async (code) => {
  const { data, error } = await supabaseClient.from("Ticket").select().eq("code", "Y7USUQ6H");

  if (data) return data;
  return error;
};

// Fonction pour récupérer les opérateurs de transport via supabase
export const getDemDikk = async () => {
  const { data, error } = await supabaseClient.from("Operator")
  .select("*, Line(*, Zone(*, StationBRT(*), Tarif(*)))")
  .eq("isDDD", true);

  console.log("getDemDikk", data);
  if (data) return data;
  return error;
};

// Fonction pour vérifier la validité du token côté client
// Fonction pour décoder le JWT et vérifier l'expiration localement
const decodeJWT = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch (error) {
    console.error("Erreur lors du décodage du JWT:", error);
    return null;
  }
};

// PATCH: isTokenExpiredLocally toujours false si backend ne gère pas l'expiration
const isTokenExpiredLocally = (token) => {
  return false; // Toujours valide localement
};

// Fonction améliorée pour récupérer le token
export const getToken = async () => {
  try {
    // Essayer de récupérer le token principal
    let token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

    // Si le token n'est pas trouvé, essayer la sauvegarde
    if (!token) {
      console.log("Token principal non trouvé, tentative de récupération du backup");
      token = await AsyncStorage.getItem(AUTH_TOKEN_BACKUP_KEY);

      // Si un token de sauvegarde existe, restaurer le token principal
      if (token) {
        console.log("Token de sauvegarde trouvé, restauration du token principal");
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
      }
    }

    // Vérifier si nous avons un token et s'il n'est pas expiré localement
    if (token) {
      // Vérifier l'expiration locale d'abord
      if (isTokenExpiredLocally(token)) {
        console.log("Token expiré localement, suppression...");
        await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
        await AsyncStorage.removeItem(AUTH_TOKEN_BACKUP_KEY);
        return null;
      }

      // Mettre à jour le timestamp pour indiquer que le token est toujours utilisé
      await AsyncStorage.setItem(TOKEN_TIMESTAMP_KEY, Date.now().toString());
    }

    return token;
  } catch (error) {
    console.error("Erreur lors de la récupération du token :", error);
    return null;
  }
};

// Fonction de validation améliorée
export const validateToken = async () => {
  try {
    const token = await getToken();
    if (!token) {
      console.log("Aucun token trouvé");
      return false;
    }

    // Vérifier si le token est bien formé (format JWT basique)
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn("Format de token invalide");
      return false;
    }

    // PATCH: On ne vérifie plus l'expiration locale
    // if (isTokenExpiredLocally(token)) {
    //   console.log("Token expiré localement");
    //   return false;
    // }

    // Vérifier la connectivité réseau
    const networkState = await NetInfo.fetch();
    const isConnected = networkState.isConnected;

    if (!isConnected) {
      console.log("Mode hors ligne: token considéré comme valide (non expiré localement)");
      return true;
    }

    // Vérifier si nous avons fait une validation récente (cache de validation)
    const lastValidation = await AsyncStorage.getItem('last_token_validation');
    const now = Date.now();
    
    if (lastValidation) {
      const timeSinceValidation = now - parseInt(lastValidation);
      const validationCacheTime = 2 * 60 * 1000; // 2 minutes
      
      if (timeSinceValidation < validationCacheTime) {
        console.log("Validation récente en cache, token considéré comme valide");
        return true;
      }
    }

    // Si nous sommes en ligne, faire une validation avec le serveur
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 secondes

      const response = await fetch(`${API_URL}/settings/user/preferences`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Si la réponse est 401 ou 403, le token n'est plus valide
      if (response.status === 401 || response.status === 403) {
        console.warn("Token expiré ou invalide selon le serveur");
        // PATCH: On ne supprime plus le token localement
        return false;
      }

      const isValid = response.ok;
      
      if (isValid) {
        // Mettre à jour le cache de validation
        await AsyncStorage.setItem('last_token_validation', now.toString());
        await AsyncStorage.setItem(TOKEN_TIMESTAMP_KEY, now.toString());
      }

      return isValid;
    } catch (networkError) {
      console.log("Erreur réseau lors de la validation:", networkError.message);
      // PATCH: Toujours considérer comme valide en cas d'erreur réseau
      return true;
    }
  } catch (error) {
    console.error("Erreur lors de la validation du token :", error);
    return false;
  }
};

// Fonction pour rafraîchir le token (si vous avez un endpoint de refresh)
export const refreshToken = async () => {
  try {
    const refreshToken = await AsyncStorage.getItem('refresh_token');
    if (!refreshToken) return null;

    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
      await AsyncStorage.setItem(AUTH_TOKEN_BACKUP_KEY, data.access_token);
      
      if (data.refresh_token) {
        await AsyncStorage.setItem('refresh_token', data.refresh_token);
      }
      
      return data.access_token;
    }
    
    return null;
  } catch (error) {
    console.error("Erreur lors du rafraîchissement du token:", error);
    return null;
  }
};

// Fonction utilitaire pour nettoyer tous les tokens
export const clearAllTokens = async () => {
  try {
    await AsyncStorage.multiRemove([
      AUTH_TOKEN_KEY,
      AUTH_TOKEN_BACKUP_KEY,
      'refresh_token',
      TOKEN_TIMESTAMP_KEY,
      'last_token_validation'
    ]);
  } catch (error) {
    console.error("Erreur lors du nettoyage des tokens:", error);
  }
};
// Fonction améliorée pour vérifier si le token est expiré
export const isTokenExpired = async () => {
  // Cette fonction n'est plus utilisée pour la validation
  // Elle peut être supprimée ou gardée pour d'autres usages
  console.log("Validation d'expiration déléguée au backend uniquement");
  return false; // On ne considère jamais le token comme expiré localement
};

// Fonction pour vérifier si l'application peut fonctionner hors ligne
export const canWorkOffline = async () => {
  try {
    const token = await getToken();
    if (!token) return false;

    // Vérifier si nous avons des données essentielles en cache
    const hasUserData = await AsyncStorage.getItem(CACHE_KEYS.USER_PREFERENCES);
    const hasOperatorData = await AsyncStorage.getItem("cache_operators_data");
    
    // L'application peut fonctionner hors ligne si :
    // 1. Nous avons un token valide (non expiré)
    // 2. Nous avons au moins les données utilisateur de base
    const tokenValid = !(await isTokenExpired());
    
    return tokenValid && (hasUserData !== null);
  } catch (error) {
    console.error("Erreur lors de la vérification des capacités hors ligne:", error);
    return false;
  }
};

export const sendPhoneNumber = async (phoneNumber,countryId) => {
  try {
    const response = await fetch(`${API_URL}/authUser/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber,countryId }),
      cache: "no-store"
    });

    console.log("Statut de la réponse:", response.status);
    
    return await handleApiResponse(response, "/authUser/send-otp");
  } catch (error) {
    console.error("Erreur API détaillée:", error);
    throw error;
  }
};



export const getCountrie = async () => {
  try {
   
    const response = await fetch(`${API_URL}/authUser/countries`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    console.log("Statut de la réponse:", response.status);
    const textResponse = await response.text();
    console.log("liste countrie :", textResponse);

    try {
      const data = JSON.parse(textResponse);
      if (!response.ok) {
        throw new Error(data.message || "Une erreur est survenue.");
      }
      return data;
    } catch (jsonError) {
      console.log("Erreur de parsing JSON:", jsonError);
      throw new Error("Réponse invalide du serveur");
    }
  } catch (error) {
    console.error("Erreur API détaillée:", error);
    throw error;
  }
};


export const getpassagers = async () => {
  try {
    // Récupérer le token d'authentification
    const token = await getToken();
    
    if (!token) {
      throw new Error("Token d'authentification non disponible");
    }
    
    const response = await fetch(`${API_URL}/listPassengersByUser`, {
      method: "GET",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
    });

    console.log("Statut de la réponse:", response.status);
    const textResponse = await response.text();
    console.log("liste passagers :", textResponse);

    try {
      const data = JSON.parse(textResponse);
      if (!response.ok) {
        throw new Error(data.message || "Une erreur est survenue.");
      }
      return data;
    } catch (jsonError) {
      console.log("Erreur de parsing JSON:", jsonError);
      throw new Error("Réponse invalide du serveur");
    }
  } catch (error) {
    console.error("Erreur API détaillée:", error);
    throw error;
  }
};


export const verifyOtp = async (phoneNumber, code) => {

  try {
    const response = await fetch(`${API_URL}/authUser/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber, code }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Échec de la vérification du code OTP.");
    }

    // Stocker le token de manière persistante
    await setToken(data.token);

    return data;
  } catch (error) {
    throw error;
  }
};


export const reservationBRT = async (operatorId,departureStationId,arrivalStationId) => {
  try {
    const token = await getToken();
    if (!token) {
      console.warn("Aucun token disponible, l'utilisateur devra peut-être se connecter");
    }

    // Le requestedSeats devrait déjà être un nombre à ce stade
    // Mais on affiche sa valeur et son type pour déboguer

    const response = await fetch(`${API_URL}/ticket/reserve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({
        operatorId,
        departureStationId,
        arrivalStationId
      }),
    });

    const data = await response.json();
    console.log("Réponse de l'API dans reserveId:", data);

    if (!response.ok) {
      console.error("Erreur dans la réponse API:", data);
      throw new Error(data.message || "Échec de la réservation");
    }

    return data;
  } catch (error) {
    console.error("Erreur lors de la réservation:", error);
    throw error;
  }
};

export const reservationDDK = async (operatorId,departureStationId,arrivalStationId) => {
  try {
    const token = await getToken();
    if (!token) {
      console.warn("Aucun token disponible, l'utilisateur devra peut-être se connecter");
    }

  
    // Le requestedSeats devrait déjà être un nombre à ce stade
    // Mais on affiche sa valeur et son type pour déboguer

    const response = await fetch(`${API_URL}/ticket/reserve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({
        operatorId,
        departureStationId,
        arrivalStationId
      }),
    });

    const data = await response.json();
    console.log("Réponse de l'API dans reserve DDK:", data);

    if (!response.ok) {
      console.error("Erreur dans la réponse API:", data);
      throw new Error(data.message || "Échec de la réservation");
    }

    return data;
  } catch (error) {
    console.error("Erreur lors de la réservation:", error);
    throw error;
  }
};

// Correction proposée pour la fonction reservation dans api.js
// Correction proposée pour la fonction reservation dans api.js
export const reservation = async (operatorId, departureStationId, arrivalStationId, classeType, ticketCount) => {
  try {
    const token = await getToken();
    if (!token) {
      console.warn("Aucun token disponible, l'utilisateur devra peut-être se connecter");
    }
    
    // Vérifier que les paramètres obligatoires sont présents
    if (!operatorId) throw new Error("L'identifiant de l'opérateur est requis");
    if (!departureStationId) throw new Error("La station de départ est requise");
    if (!arrivalStationId) throw new Error("La station d'arrivée est requise");
    if (!classeType) throw new Error("Le type de classe est requis");
    
    // S'assurer que ticketCount est un nombre valide
    const validTicketCount = ticketCount && ticketCount > 0 ? parseInt(ticketCount) : 1;
    
    // Préparer les données pour la requête
    const requestBody = {
      operatorId,
      departureStationId,
      arrivalStationId,
      classeType,
      ticketCount: validTicketCount // S'assurer que c'est un nombre
    };
    
    console.log("Données de réservation envoyées:", requestBody);
    
    const response = await fetch(`${API_URL}/ticket/reserve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify(requestBody),
    });
    
    const data = await response.json();
    console.log("Réponse de l'API:", data);
    
    if (!response.ok) {
      console.error("Erreur dans la réponse API:", data);
      throw new Error(data.message || "Échec de la réservation");
    }
    
    // Vérifier si le nombre de tickets dans la réponse correspond à ce qui a été demandé
    if (data.data && Array.isArray(data.data)) {
      const totalTicketsReturned = data.data.length;
      console.log(`Tickets demandés: ${validTicketCount}, Tickets reçus: ${totalTicketsReturned}`);
      
      if (totalTicketsReturned !== validTicketCount) {
        console.warn(`Attention: Nombre de tickets reçus (${totalTicketsReturned}) différent du nombre demandé (${validTicketCount})`);
      }
    }
    
    return data;
  } catch (error) {
    console.error("Erreur lors de la réservation:", error);
    throw error;
  }
};


export const register = async (name,firstName, token) => {
  try {
    if (!token) {
      throw new Error("Token non disponible");
    }

    const response = await fetch(`${API_URL}/authUser/complete-register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ name,firstName }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Échec de l'inscription");
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const getOperator = async () => {
  try {
    // Définir la clé de cache pour les opérateurs
    const OPERATORS_CACHE_KEY = "cache_operators_data";
    
    // Vérifier l'état de la connexion
    const networkState = await NetInfo.fetch();
    const isConnected = networkState.isConnected;
    
    // Si nous sommes connectés, essayer d'abord de récupérer les données fraîches
    if (isConnected) {
      try {
        // Récupérer le token d'authentification
        const token = await getToken();
        
        if (!token) {
          throw new Error("Token d'authentification non disponible");
        }
        
        const response = await fetch(`${API_URL}/operator/zones`, {
          method: "GET",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
        });

        console.log("Statut de la réponse:", response.status);
        
        if (response.ok) {
          const data = await response.json();
          
          // Stocker les données dans le cache avec un timestamp
          await AsyncStorage.setItem(OPERATORS_CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            data: data
          }));
          
          console.log("Données des opérateurs mises en cache avec succès");
          return data;
        } else {
          // En cas d'erreur, on tente de récupérer depuis le cache
          console.log("Échec de la récupération des opérateurs depuis l'API, tentative depuis le cache");
          throw new Error("Échec de la récupération depuis l'API");
        }
      } catch (networkError) {
        console.log("Erreur réseau, tentative de récupération depuis le cache", networkError);
        // On continue vers la récupération depuis le cache
      }
    } else {
      console.log("Appareil hors ligne, utilisation des données en cache");
    }
    
    // Récupérer les données depuis le cache
    const cachedDataJson = await AsyncStorage.getItem(OPERATORS_CACHE_KEY);
    
    if (cachedDataJson) {
      const cachedData = JSON.parse(cachedDataJson);
      const ageCache = (Date.now() - cachedData.timestamp) / 1000;
      
      console.log(`Données des opérateurs récupérées du cache, âge: ${ageCache} secondes`);
      
      // Vérifier si les données en cache sont encore "fraîches" (moins de 7 jours)
      if (ageCache < CACHE_DURATION.SHORT / 1000) {
        return cachedData.data;
      } else {
        console.log("Données en cache trop anciennes, une mise à jour est recommandée");
        // On retourne quand même les données périmées si nous sommes hors ligne
        if (!isConnected) {
          return cachedData.data;
        }
      }
    }
    
    // Si on arrive ici sans données, c'est qu'on n'a pas pu récupérer les données
    // ni depuis l'API ni depuis le cache
    throw new Error("Impossible de récupérer les données des opérateurs");
    
  } catch (error) {
/*     console.error("Erreur lors de la récupération des opérateurs:", error);
 */    throw error;
  }
};
export const getTrip = async () => {
  try {
    // Définir la clé de cache pour les opérateurs
    const OPERATORS_CACHE_KEY = "cache_operators_data";
    
    // Vérifier l'état de la connexion
    const networkState = await NetInfo.fetch();
    const isConnected = networkState.isConnected;
    
    // Si nous sommes connectés, essayer d'abord de récupérer les données fraîches
    if (isConnected) {
      try {
        // Récupérer le token d'authentification
        const token = await getToken();
        
        if (!token) {
          throw new Error("Token d'authentification non disponible");
        }
        
        const response = await fetch(`${API_URL}/getTrip/departures-destinations
`, {
          method: "GET",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
        });

        console.log("Statut de la réponse:", response.status);
        
        if (response.ok) {
          const data = await response.json();
              console.log('donnée',data);

          
          // Stocker les données dans le cache avec un timestamp
          await AsyncStorage.setItem(OPERATORS_CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            data: data
          }));
          
          return data;
        } else {
          // En cas d'erreur, on tente de récupérer depuis le cache
          console.log("Échec de la récupération des trajets  depuis l'API, tentative depuis le cache");
          throw new Error("Échec de la récupération depuis l'API");
        }
      } catch (networkError) {
        console.log("Erreur réseau, tentative de récupération depuis le cache", networkError);
        // On continue vers la récupération depuis le cache
      }
    } else {
      console.log("Appareil hors ligne, utilisation des données en cache");
    }
    
    // Récupérer les données depuis le cache
    const cachedDataJson = await AsyncStorage.getItem(OPERATORS_CACHE_KEY);
    
    if (cachedDataJson) {
      const cachedData = JSON.parse(cachedDataJson);
      const ageCache = (Date.now() - cachedData.timestamp) / 1000;
      
      console.log(`Données des opérateurs récupérées du cache, âge: ${ageCache} secondes`);
      
      // Vérifier si les données en cache sont encore "fraîches" (moins de 7 jours)
      if (ageCache < CACHE_DURATION.SHORT / 1000) {
        return cachedData.data;
      } else {
        console.log("Données en cache trop anciennes, une mise à jour est recommandée");
        // On retourne quand même les données périmées si nous sommes hors ligne
        if (!isConnected) {
          return cachedData.data;
        }
      }
    }
    
    // Si on arrive ici sans données, c'est qu'on n'a pas pu récupérer les données
    // ni depuis l'API ni depuis le cache
    throw new Error("Impossible de récupérer les données des tajets");
    
  } catch (error) {
/*     console.error("Erreur lors de la récupération des opérateurs:", error);
 */    throw error;
  }
};



export const getOperatorById = async (id) => {
  try {
    // Définir la clé de cache pour les opérateurs
    const OPERATORS_CACHE_KEY = "cache_operators_data";
    
    // Vérifier l'état de la connexion
    const networkState = await NetInfo.fetch();
    const isConnected = networkState.isConnected;
    
    // Si nous sommes connectés, essayer d'abord de récupérer les données fraîches
    if (isConnected) {
      try {
        // Récupérer le token d'authentification
        const token = await getToken();
        
        if (!token) {
          throw new Error("Token d'authentification non disponible");
        }
        
        const response = await fetch(`${API_URL}/operator/${id}/zones`, {
          method: "GET",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
        });

        console.log("Statut de la réponse:", response.status);
        
        if (response.ok) {
          const data = await response.json();
          
          // Stocker les données dans le cache avec un timestamp
          await AsyncStorage.setItem(OPERATORS_CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            data: data
          }));
          
          console.log("Données des opérateurs mises en cache avec succès");
          return data;
        } else {
          // En cas d'erreur, on tente de récupérer depuis le cache
          console.log("Échec de la récupération des opérateurs depuis l'API, tentative depuis le cache");
          throw new Error("Échec de la récupération depuis l'API");
        }
      } catch (networkError) {
        console.log("Erreur réseau, tentative de récupération depuis le cache", networkError);
        // On continue vers la récupération depuis le cache
      }
    } else {
      console.log("Appareil hors ligne, utilisation des données en cache");
    }
    
    // Récupérer les données depuis le cache
    const cachedDataJson = await AsyncStorage.getItem(OPERATORS_CACHE_KEY);
    
    if (cachedDataJson) {
      const cachedData = JSON.parse(cachedDataJson);
      const ageCache = (Date.now() - cachedData.timestamp) / 1000;
      
      console.log(`Données des opérateurs récupérées du cache, âge: ${ageCache} secondes`);
      
      // Vérifier si les données en cache sont encore "fraîches" (moins de 7 jours)
      if (ageCache < CACHE_DURATION.SHORT / 1000) {
        return cachedData.data;
      } else {
        console.log("Données en cache trop anciennes, une mise à jour est recommandée");
        // On retourne quand même les données périmées si nous sommes hors ligne
        if (!isConnected) {
          return cachedData.data;
        }
      }
    }
    
    // Si on arrive ici sans données, c'est qu'on n'a pas pu récupérer les données
    // ni depuis l'API ni depuis le cache
    throw new Error("Impossible de récupérer les données des opérateurs");
    
  } catch (error) {
/*     console.error("Erreur lors de la récupération des opérateurs:", error);
 */    throw error;
  }
};


export const fetchWithCache = async (endpoint, options, cacheKey, cacheDuration) => {
  try {
    // Vérifier si des données en cache sont disponibles et valides
    const cachedData = await AsyncStorage.getItem(cacheKey);
    
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData);
      const isDataFresh = Date.now() - timestamp < cacheDuration;
      
      if (isDataFresh) {
        console.log(`Utilisation des données en cache pour: ${endpoint}`);
        return { data };
      }
    }
    
    // Si pas de cache valide, effectuer la requête API
    console.log(`Récupération des données depuis l'API: ${endpoint}`);
    const response = await fetch(`${API_URL}${endpoint}`, options);
    
    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Mettre en cache les nouvelles données
    const cacheData = {
      data: result,
      timestamp: Date.now()
    };
    
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    return { data: result };
    
  } catch (error) {
/*     console.error(`Erreur lors de la requête ${endpoint}:`, error);
 */    throw error;
  }
};

/**
 * Fonction pour récupérer l'historique des tickets d'un utilisateur
 */
export const geticket = async (userId, token) => {
  try {
    const response = await fetch(`${API_URL}/booking/history/${userId}`, {
      method: "GET",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
    });

    console.log("Statut de la réponse:", response.status);
    
      const data = await response.json();
      console.log("ticket history",data);
      
    
    return data;
  } catch (error) {
/*     console.error("Erreur lors de la récupération des données utilisateur:", error);
 */    return null;
  }
};

export const activateTicket = async (ticketId, matriculeVehicle) => {
  try {
    const token = await getToken();
    
    if (!token) {
      throw new Error("Token d'authentification manquant");
    }

    const response = await fetch(`${API_URL}/booking/activate-ticket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ticketId,
        matriculeVehicle
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erreur lors de l\'activation du ticket');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur lors de l\'activation du ticket:', error);
    throw error;
  }
};

// Fonction modifiée pour rechercher des tickets avec gestion de cache
export const searchTickets = async (departure, destination, date, seat) => {
  try {
    const token = await getToken();
    const response= await fetch(`${API_URL}/booking/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({
        departure,
        destination,
        date,
        seat
      }),
    });
    const data = await response.json();
    console.log(data)
    if (!response.ok) {
/*       throw new Error(data.message || "Échec de la recherche");
 */    }

    return data;
  } catch (error) {
    throw error;
  }
};

// Fonction modifiée pour récupérer l'historique des tickets avec gestion de cache


export const reserve = async (tripId, temporaryReservationId, passengers, saved = false) => {
  try {
    const token = await getToken();
    if (!token) {
      console.warn("Aucun token disponible, l'utilisateur devra peut-être se connecter");
    }

    // Le requestedSeats devrait déjà être un nombre à ce stade
    // Mais on affiche sa valeur et son type pour déboguer
    console.log("reserveId - requestedSeats:", passengers, "Type:", typeof passengers);

    const response = await fetch(`${API_URL}/booking/reserve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({
        tripId,
        temporaryReservationId,
        passengers: passengers, // Ne pas reconvertir, car il devrait déjà être un nombre
        saved
      }),
    });

    const data = await response.json();

    if (!response.ok) {
/*       console.error("Erreur dans la réponse API:", data);
 *//*       throw new Error(data.message || "Échec de la réservation");
 */    }

    return data;
  } catch (error) {
/*     console.error("Erreur lors de la réservation:", error);
 */    throw error;
  }
};


export const payement = async (reservationId, paymentData, token) => {
  try {
    // Vérifier si userId est présent, sinon essayer de l'extraire du token
    if (!paymentData.userId && token) {
      try {
        const decoded = jwtDecode(token);
        console.log("Token décodé dans la fonction API:", JSON.stringify(decoded, null, 2));

        // Essayer différentes possibilités pour le userId
        paymentData.userId = decoded.id || decoded.userId || decoded._id ||
          decoded.sub || decoded.user_id ||
          (decoded.user ? decoded.user.id || decoded.user._id : null);

        console.log("UserId extrait dans l'API:", paymentData.userId);
      } catch (e) {
      }
    }

    console.log("Données envoyées à l'API:", JSON.stringify({
      reservationId,
      paymentData,
    }, null, 2));

    const response = await fetch(`${API_URL}/booking/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : `Bearer ${paymentData.tempToken}`,
      },
      body: JSON.stringify({
        reservationId,
        paymentData,
      }),
    });
    

    console.log("Statut de la réponse :", response.status);

    let data;
    try {
      data = await response.json();
      console.log("api response",data);

    } catch (jsonError) {
      console.error("Erreur lors du parsing JSON :", jsonError);
      data = { message: "Réponse invalide du serveur" };
    }

    console.log("Données de réponse complètes :", data);

    if (!response.ok) {
      throw new Error(data?.message || `Échec du paiement (Code: ${response.status})`);
    }

    return data;
  } catch (error) {

    throw error;
  }
};

export const payementUrbain = async (operatorId, classeType, departureStationId, arrivalStationId, ticketCount,price, methodePay, token) => {
  try {
    // Construire l'objet de données avec les champs obligatoires
    const paymentData = {
      operatorId,
      departureStationId,
      arrivalStationId,
      methodePay,
      price
    };

    // Ajouter les champs optionnels seulement s'ils sont fournis
    if (ticketCount && ticketCount > 0) {
      paymentData.ticketCount = ticketCount;
    }
    if (classeType) {
      paymentData.classeType = classeType;
    }

    
    console.log("Données envoyées à l'API:", JSON.stringify(paymentData, null, 2));
    
    const response = await fetch(`${API_URL}/booking/initiate-urbain`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(paymentData),
    });
    
    console.log("Statut de la réponse :", response.status);
    
    let data;
    try {
      data = await response.json();
      console.log("Réponse de l'API:", data);
      
    } catch (jsonError) {
      console.error("Erreur lors du parsing JSON :", jsonError);
      data = { message: "Réponse invalide du serveur" };
    }
    
    console.log("Données de réponse complètes :", data);
    
    if (!response.ok) {
      throw new Error(data?.message || `Échec du paiement (Code: ${response.status})`);
    }
    
    return data;
  } catch (error) {
    console.error("Erreur dans payementUrbain:", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    // Récupérer le token avant de le supprimer
    const token = await getToken();

    if (token) {
      try {
        // Envoyer la requête de déconnexion au serveur
        const response = await fetch(`${API_URL}/authUser/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });

        // Vérifier la réponse du serveur
        const data = await response.json();
        if (!response.ok) {
          console.warn("Erreur lors de la déconnexion côté serveur:", data.message);
        }
      } catch (serverError) {
        console.warn("Erreur lors de la communication avec le serveur pour la déconnexion:", serverError);
        // On continue pour supprimer les tokens localement même si la requête serveur échoue
      }
    }

    // Supprimer tous les tokens du stockage local
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(AUTH_TOKEN_BACKUP_KEY);
    await AsyncStorage.removeItem(TOKEN_TIMESTAMP_KEY);

    return { success: true, message: "Déconnexion réussie" };
  } catch (error) {
    console.error("Erreur lors de la déconnexion:", error);
    throw error;
  }
};


// Fonctions pour gérer les opérations hors ligne
const OFFLINE_QUEUE_KEY = "offline_operations_queue";
// Fonction pour traiter la file d'attente hors ligne
// À appeler quand la connexion est rétablie
export const processOfflineQueue = async () => {
  try {
    const queueJson = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!queueJson) return true;

    const queue = JSON.parse(queueJson);
    if (queue.length === 0) return true;

    console.log(`Traitement de ${queue.length} opérations en attente...`);

    const failedOperations = [];

    for (const item of queue) {
      try {
        switch (item.operation) {
          case 'updateUser':
            await updateUser(
              item.params.userId,
              item.params.userData,
              item.params.token
            );
            break;
          // Ajouter d'autres cas selon vos besoins
          default:
            console.warn(`Opération inconnue: ${item.operation}`);
            failedOperations.push(item);
        }
      } catch (error) {
        console.error(`Échec de la synchronisation pour l'opération ${item.operation}:`, error);
        failedOperations.push(item);
      }
    }

    // Mettre à jour la file avec les opérations qui ont échoué
    if (failedOperations.length > 0) {
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(failedOperations));
      console.log(`${failedOperations.length} opérations restent à synchroniser.`);
    } else {
      await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
      console.log("Toutes les opérations ont été synchronisées avec succès.");
    }

    return failedOperations.length === 0;
  } catch (error) {
    console.error("Erreur lors du traitement de la file d'attente hors ligne:", error);
    return false;
  }
};

// Fonction pour vérifier la connectivité manuellement
// À utiliser dans votre application pour déclencher le processus de synchronisation
export const checkConnectivityAndSync = async () => {
  try {
    const response = await fetch(`${API_URL}/ping`, {
      method: 'GET',
      timeout: 5000  // Timeout de 5 secondes
    });

    if (response.ok) {
      // Si connecté, traiter la file d'attente
      await processOfflineQueue();
      return true;
    }

    return false;
  } catch (error) {
    console.log("Pas de connexion Internet disponible.");
    return false;
  }
};

// Fonction pour précharger et mettre en cache les données essentielles
export const preloadEssentialData = async () => {
  try {
    const token = await getToken();
    const isConnected = (await NetInfo.fetch()).isConnected;

    if (!isConnected) {
      console.log("Hors ligne: impossible de précharger les données");
      return false;
    }

    console.log("Préchargement des données essentielles...");

    // Liste des données à précharger
    const preloadTasks = [
      // Stations de bus (longue durée de cache)
      fetchWithCache("/stations", {
        method: "GET",
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      }, CACHE_KEYS.BUS_STATIONS, true, CACHE_DURATION.SHORT),

      // Itinéraires populaires
      fetchWithCache("/routes/popular", {
        method: "GET",
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      }, CACHE_KEYS.POPULAR_ROUTES, true, CACHE_DURATION.LONG),

      // Profil utilisateur si connecté
      token ? fetchWithCache("/settings/user/preferences", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      }, CACHE_KEYS.USER_PROFILE, true, CACHE_DURATION.MEDIUM) : Promise.resolve(null),

      // Réservations actives si connecté
      token ? fetchWithCache("/booking/active", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      }, CACHE_KEYS.ACTIVE_RESERVATIONS, true, CACHE_DURATION.SHORT) : Promise.resolve(null)
    ];

    // Exécuter toutes les tâches de préchargement en parallèle
    await Promise.allSettled(preloadTasks);

    // Créer des copies de sauvegarde des données importantes
    const keysToBackup = [
      CACHE_KEYS.USER_PROFILE,
      CACHE_KEYS.BUS_STATIONS,
      CACHE_KEYS.ACTIVE_RESERVATIONS
    ];

    for (const key of keysToBackup) {
      try {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          await AsyncStorage.setItem(`backup_${key}`, data);
        }
      } catch (e) {
        console.error(`Erreur lors de la sauvegarde de backup pour ${key}:`, e);
      }
    }

    console.log("Préchargement terminé avec succès");
    return true;
  } catch (error) {
    console.error("Erreur lors du préchargement des données:", error);
    return false;
  }
};

// Mettre en place des écouteurs de connectivité
export const setupOfflineListeners = () => {
  // Écouteur pour détecter les changements de connectivité
  const unsubscribe = NetInfo.addEventListener(state => {
    if (state.isConnected) {
      console.log("Connexion Internet rétablie!");

      // Tenter de traiter la file d'attente
      processOfflineQueue().catch(e =>
        console.error("Erreur lors du traitement automatique de la file:", e)
      );

      // Précharger les données essentielles
      preloadEssentialData().catch(e =>
        console.error("Erreur lors du préchargement automatique:", e)
      );
    } else {
      console.log("Connexion Internet perdue. Mode hors ligne activé.");
      // Enregistrer le passage en mode hors ligne
      AsyncStorage.setItem(CACHE_KEYS.OFFLINE_STATUS, JSON.stringify({
        lastOnline: Date.now(),
        cacheRefreshed: false
      })).catch(e => console.error("Erreur lors de l'enregistrement du statut hors ligne:", e));
    }
  });

  return unsubscribe; // Pour désinscrire l'écouteur si nécessaire
};

// Fonction pour vérifier si l'application est en mode hors ligne et depuis quand
export const getOfflineStatus = async () => {
  try {
    const isConnected = (await NetInfo.fetch()).isConnected;

    if (isConnected) {
      return { isOffline: false, lastOnline: Date.now() };
    }

    const offlineStatusJson = await AsyncStorage.getItem(CACHE_KEYS.OFFLINE_STATUS);

    if (offlineStatusJson) {
      const offlineStatus = JSON.parse(offlineStatusJson);
      const offlineDuration = Date.now() - offlineStatus.lastOnline;

      return {
        isOffline: true,
        lastOnline: offlineStatus.lastOnline,
        offlineDuration,
        offlineDurationText: formatOfflineDuration(offlineDuration),
        cacheRefreshed: offlineStatus.cacheRefreshed || false
      };
    }

    return { isOffline: true, lastOnline: null, offlineDuration: null };
  } catch (error) {
    console.error("Erreur lors de la récupération du statut hors ligne:", error);
    return { isOffline: !isConnected, error: true };
  }
};

// Formater la durée hors ligne
const formatOfflineDuration = (duration) => {
  const minutes = Math.floor(duration / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} jour${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} heure${hours > 1 ? 's' : ''}`;
  } else {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
};
// Fonction de vérification de l'état de connexion actuel
export const isOnline = async () => {
  const networkState = await NetInfo.fetch();
  return networkState.isConnected;
};

// Fonction utilitaire pour parser JSON de manière sécurisée
const safeJsonParse = (textResponse, endpoint) => {
  try {
    // Vérifier si la réponse commence par HTML (erreur serveur)
    if (textResponse.trim().startsWith('<')) {
      console.error(`Erreur serveur pour ${endpoint}: Réponse HTML reçue au lieu de JSON`);
      console.error("Contenu de la réponse:", textResponse.substring(0, 200) + "...");
      throw new Error("Le serveur a retourné une page d'erreur HTML au lieu de données JSON");
    }
    
    // Vérifier si la réponse est vide
    if (!textResponse || textResponse.trim() === '') {
      throw new Error("Réponse vide du serveur");
    }
    
    // Essayer de parser le JSON
    const data = JSON.parse(textResponse);
    return data;
  } catch (jsonError) {
    console.error(`Erreur de parsing JSON pour ${endpoint}:`, jsonError);
    console.error("Contenu de la réponse:", textResponse.substring(0, 200) + "...");
    
    if (jsonError.message.includes("HTML")) {
      throw new Error("Erreur serveur: Le serveur a retourné une page d'erreur");
    } else if (jsonError.message.includes("vide")) {
      throw new Error("Erreur serveur: Réponse vide");
    } else {
      throw new Error("Erreur serveur: Format de réponse invalide");
    }
  }
};

// Fonction utilitaire pour gérer les réponses API de manière cohérente
const handleApiResponse = async (response, endpoint) => {
  const textResponse = await response.text();
  console.log(`Réponse ${endpoint}:`, textResponse.substring(0, 200) + "...");
  
  const data = safeJsonParse(textResponse, endpoint);
  
  if (!response.ok) {
    throw new Error(data.message || `Erreur ${response.status}: ${response.statusText}`);
  }
  
  return data;
};

// Fonction utilitaire pour vérifier la forme d'un JWT
export function isTokenWellFormed(token) {
  // Un JWT doit avoir 3 parties séparées par des points
  if (typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  // Vérifie que chaque partie n'est pas vide
  return parts.every(part => part.length > 0);
}


