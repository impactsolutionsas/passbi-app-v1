import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import { geticket, getToken } from "../../services/api/api";
import { jwtDecode } from "jwt-decode";
import { supabaseClient } from "@/lib/supabase";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../Provider/AppProvider";

// Types (identiques à votre version)
type Booking = {
  id: string;
  is_update?: boolean;
  trip?: {
    departure?: string;
    destination?: string;
    departureTime?: string;
    station_arrivee?: string;
    station_depart?: string;
    arrivalTime?: string;
    price?: number;
    date?: string;
    operator?: {
      name: string;
      legalName?: string;
      logoUrl?: string;
    };
    vehicle?: {
      seats?: number;
      registrationNumber?: string;
    };
  };
  seatsBooked?: number;
  ticket: {
    id?: string;
    code: string;
    Number?: string;
    isUpdated?: boolean;
    tickeNumber?: string;
    searchDate?: string;
    status?: string;
    zoneType?: string;
    zoneName?: string;
    operatorName?: string;
    operatorLogo?: string;
    arrivalStation?: string;
    departureStation?: string;
    matriculeVehicle?: string;
    validatedAt?: string;
    expiresAt?: string;
    departurezone?: string;
    arrivalzone?: string;
    ticketCount?: {
      count: number;
      classeType?: string;
    };
  };
  payment: {
    amount?: number;
    method: string;
    transactionId?: string;
    date?: string;
  };
  operator: {
    name: string;
    legalName?: string;
    logoUrl?: string;
  };
  operatorName?: string;
  operatorLogo?: string;
  // 🔥 CHANGEMENT: string → boolean pour correspondre aux données JSON
  isInterZones?: boolean;
  validatedAt?: string;
  expiresAt?: string;
  date?: string;
  bookingDate?: string;
  seatNumber?: string;
  status?: "active" | "used" | "expired" | "confirmed";
  zoneType?: string;
  departureStation?: string;
  arrivalStation?: string;
  passengers?: {
    id: string;
    name: string;
    phoneNumber: string;
  }[];
  cachedAt?: string;
  lastSyncedAt?: string;
};

// 2. Mettre à jour le type TicketApiResponse
type TicketApiResponse = {
  id: string;
  userId?: string;
  trip?: {
    departure?: string;
    destination?: string;
    departureTime?: string;
    station_arrivee?: string;
    station_depart?: string;
    arrivalTime?: string;
    price?: number;
    date?: string;
    operator?: {
      name: string;
      legalName?: string;
      logoUrl?: string;
    };
    vehicle?: {
      seats?: number;
      registrationNumber?: string;
    };
  };
  seatsBooked?: number;
  ticket?: {
    id?: string;
    code?: string;
    isUpdated?: boolean;
    Number?: string;
    searchDate?: string;
    status?: string;
    zoneType?: string;
    operatorName?: string;
    operatorLogo?: string;
    departureStation?: string;
    arrivalStation?: string;
    validatedAt?: string;
    expiresAt?: string;
    departurezone?: string;
    arrivalzone?: string;
        matriculeVehicle?: string;

    // 🔥 AJOUT: isInterZones dans l'objet ticket
    isInterZones?: boolean;
    ticketCount?: {
      count: number;
      classeType?: string;
    };
  };
  payment?: {
    amount?: number;
    method?: string;
    transactionId?: string;
    date?: string;
  };
  operator?: {
    name?: string;
    legalName?: string;
    logoUrl?: string;
  };
  operatorName?: string;
  operatorLogo?: string;
  date?: string;
  bookingDate?: string;
  validatedAt?: string;
  expiresAt?: string;
  // 🔥 CHANGEMENT: Également boolean au niveau racine
  isInterZones?: boolean;
  seatNumber?: string;
  status?: string;
  zoneType?: string;
  departureStation?: string;
  arrivalStation?: string;
  passengers?: {
    id: string;
    name: string;
    phoneNumber: string;
  }[];
};

interface CustomJwtPayload {
  id: string;
  exp?: number;
  iat?: number;
}

interface PersistentCacheData {
  tickets: Booking[];
  lastSyncTimestamp: number;
  userId: string;
  version: number;
}

interface TicketsContextType {
  tickets: Booking[];
  loading: boolean;
  error: string | null;
  refreshTickets: () => Promise<void>;
  
  hasLoaded: boolean;
  lastUpdated: Date | null;
  currentUserId: string | null;
  isOnline: boolean;
  lastSyncAttempt: Date | null;
  cachedTicketsCount: number;
}

const TicketsContext = createContext<TicketsContextType | undefined>(undefined);

const getPersistentCacheKey = (userId: string) => `PERSISTENT_TICKETS_${userId}`;
const CACHE_VERSION = 1;

interface TicketsProviderProps {
  children: ReactNode;
}

export function TicketsProvider({ children }: TicketsProviderProps) {
  const { isAuthenticated, userId: authUserId, isInitialized: authInitialized } = useAuth();

  const [tickets, setTickets] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncAttempt, setLastSyncAttempt] = useState<Date | null>(null);
  const [cachedTicketsCount, setCachedTicketsCount] = useState(0);

  // Refs pour gérer les abonnements
  const ticketChannelRef = useRef<any>(null);
  const bookingChannelRef = useRef<any>(null);
  const isLoadingRef = useRef(false);
  const lastRefreshRef = useRef<number>(0);

  // 🔥 NOUVEAU: État pour suivre les abonnements actifs
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Surveillance de la connectivité
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);

      if (state.isConnected && hasLoaded && currentUserId) {
        setTimeout(() => fetchTickets(true), 1000);
      }
    });

    return unsubscribe;
  }, [hasLoaded, currentUserId]);

  // Nettoyer toutes les données utilisateur
  const clearUserData = useCallback(async () => {
    setTickets([]);
    setCurrentUserId(null);
    setHasLoaded(false);
    setLastUpdated(null);
    setError(null);
    setLastSyncAttempt(null);
    setCachedTicketsCount(0);

    // Nettoyer les abonnements
    cleanupSubscriptions();

    isLoadingRef.current = false;
    lastRefreshRef.current = 0;
  }, []);

  // Surveillance des changements d'authentification
  useEffect(() => {
    if (!authInitialized) return;

    if (!isAuthenticated || !authUserId) {
      clearUserData();
      return;
    }

    if (currentUserId && currentUserId !== authUserId) {
      clearUserData().then(() => {
        setCurrentUserId(authUserId);
        fetchTickets(false);
      });
      return;
    }

    if (!currentUserId && authUserId) {
      setCurrentUserId(authUserId);
      fetchTickets(false);
    }
  }, [isAuthenticated, authUserId, authInitialized, currentUserId]);

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

  // Chargement persistant du cache
  const loadPersistentCache = useCallback(async (userId: string): Promise<Booking[]> => {
    try {
      const cacheKey = getPersistentCacheKey(userId);
      const cachedDataString = await AsyncStorage.getItem(cacheKey);

      if (cachedDataString) {
        const cachedData: PersistentCacheData = JSON.parse(cachedDataString);

        if (cachedData.tickets && cachedData.userId === userId) {
          setCachedTicketsCount(cachedData.tickets.length);
          return cachedData.tickets;
        }
      }
    } catch (error) {
      console.warn("⚠️ Erreur chargement cache persistant:", error);
    }

    setCachedTicketsCount(0);
    return [];
  }, []);

  // Sauvegarde avec fusion des données
  const saveToPersistentCache = useCallback(async (newTickets: Booking[], userId: string) => {
    try {
      const cacheKey = getPersistentCacheKey(userId);

      const existingCachedData = await AsyncStorage.getItem(cacheKey);
      let existingTickets: Booking[] = [];

      if (existingCachedData) {
        const parsed: PersistentCacheData = JSON.parse(existingCachedData);
        existingTickets = parsed.tickets || [];
      }

      const ticketMap = new Map<string, Booking>();

      existingTickets.forEach((ticket) => {
        ticketMap.set(ticket.id, ticket);
      });

      const now = new Date().toISOString();
      newTickets.forEach((ticket) => {
        ticketMap.set(ticket.id, {
          ...ticket,
          lastSyncedAt: now,
          cachedAt: ticketMap.has(ticket.id) ? ticketMap.get(ticket.id)?.cachedAt : now,
        });
      });

      const mergedTickets = Array.from(ticketMap.values());

      const sortedTickets = mergedTickets.sort((a, b) => {
        const dateA = new Date(a.date || a.bookingDate || a.cachedAt || Date.now());
        const dateB = new Date(b.date || b.bookingDate || b.cachedAt || Date.now());
        return dateB.getTime() - dateA.getTime();
      });

      const cacheData: PersistentCacheData = {
        tickets: sortedTickets,
        lastSyncTimestamp: Date.now(),
        userId,
        version: CACHE_VERSION,
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      setCachedTicketsCount(sortedTickets.length);

    } catch (error) {
      console.warn("⚠️ Erreur sauvegarde cache persistant:", error);
    }
  }, []);

  // Format pour les tickets interurbains
  const formatInterurbainTicket = (ticket: TicketApiResponse, defaultStatus: string): Booking => {
    return {
      id: ticket.id || "",
      trip: {
        departure: ticket.trip?.departure || "",
        destination: ticket.trip?.destination || "",
        departureTime: ticket.trip?.departureTime || "",
        station_arrivee: ticket.trip?.station_arrivee || "",
        station_depart: ticket.trip?.station_depart || "",
        price: ticket.trip?.price || ticket.payment?.amount || 0,
        date: ticket.trip?.date || ticket.bookingDate || "",
        operator: ticket.trip?.operator || { name: "Unknown Operator" },
        vehicle: ticket.trip?.vehicle || {},
      },
      seatsBooked: ticket.seatsBooked || 1,
      ticket: {
        id: ticket.ticket?.id,
        isUpdated: ticket?.ticket?.isUpdated,
        code: ticket.ticket?.code || "",
        Number: ticket.ticket?.Number || ticket.ticket?.code || "",
        status: ticket.ticket?.status || defaultStatus,
        zoneType: ticket.ticket?.zoneType || "",
        operatorName: ticket.ticket?.operatorName || ticket.operatorName || "",
        operatorLogo: ticket.ticket?.operatorLogo || ticket.operatorLogo || "",
        departureStation: ticket.ticket?.departureStation || "",
        arrivalStation: ticket.ticket?.arrivalStation || "",
        validatedAt: ticket.ticket?.validatedAt || "",
        searchDate: ticket.ticket?.searchDate || "",
        departurezone: ticket.ticket?.departurezone || "",
        arrivalzone: ticket.ticket?.arrivalzone || "",
      },
      payment: {
        amount: ticket.payment?.amount || ticket.trip?.price || 0,
        method: ticket.payment?.method || "unknown",
        transactionId: ticket.payment?.transactionId || "",
        date: ticket.payment?.date || ticket.bookingDate || "",
      },
      operator: ticket.trip?.operator || { name: "Unknown Operator" },
      operatorName: ticket.trip?.operator?.name || ticket.operatorName || "",
      operatorLogo: ticket.trip?.operator?.logoUrl || ticket.operatorLogo || "",
      date: ticket.trip?.date || ticket.bookingDate || "",
      bookingDate: ticket.bookingDate || "",
      status: (ticket.status === "confirmed" ? "active" : defaultStatus) as
        | "active"
        | "used"
        | "expired"
        | "confirmed",
      seatNumber: ticket.seatNumber || "",
      passengers: ticket.passengers || [],
    };
  };

  // Format pour les tickets urbains
  const formatUrbainTicket = (
    ticket: TicketApiResponse,
    defaultStatus: "active" | "used" | "expired" | "confirmed"
  ): Booking => {
    return {
      id: ticket.id || "",
      ticket: {
        id: ticket.ticket?.id || "",
        isUpdated: ticket?.ticket?.isUpdated,
        code: ticket.ticket?.code || "",
        Number: ticket.ticket?.Number || ticket.ticket?.code || "",
        status: ticket.ticket?.status || defaultStatus,
        zoneType: ticket.ticket?.zoneType || ticket.zoneType || "",
        operatorName: ticket.ticket?.operatorName || ticket.operatorName || "",
        operatorLogo: ticket.ticket?.operatorLogo || ticket.operatorLogo || "",
       
        departureStation: ticket.ticket?.departureStation || ticket.departureStation || "",
        arrivalStation: ticket.ticket?.arrivalStation || ticket.arrivalStation || "",
        validatedAt: ticket.ticket?.validatedAt || "",
        matriculeVehicle: ticket.ticket?.matriculeVehicle || "",
        expiresAt: ticket.ticket?.expiresAt || "",
        departurezone: ticket.ticket?.departurezone || "",
        arrivalzone: ticket.ticket?.arrivalzone || "",
        ticketCount: {
          count: ticket.ticket?.ticketCount?.count || 1,
          classeType: ticket.ticket?.ticketCount?.classeType || "",
        },
      },
      payment: {
        amount: ticket.payment?.amount || 0,
        method: ticket.payment?.method || "unknown",
        transactionId: ticket.payment?.transactionId || "",
        date: ticket.payment?.date || ticket.bookingDate || "",
      },
      trip: {
        departure: ticket.ticket?.departureStation || ticket.departureStation || "",
        destination: ticket.ticket?.arrivalStation || ticket.arrivalStation || "",
        price: ticket.payment?.amount || 0,
        departureTime: ticket.bookingDate || "",
      },
      operator: {
        name: ticket.ticket?.operatorName || ticket.operatorName || "Opérateur inconnu",
        logoUrl: ticket.ticket?.operatorLogo || ticket.operatorLogo || "",
      },
      operatorName: ticket.ticket?.operatorName || ticket.operatorName || "",
      operatorLogo: ticket.ticket?.operatorLogo || ticket.operatorLogo || "",
      date: ticket.bookingDate || "",
      bookingDate: ticket.bookingDate || "",
 ...(ticket.ticket?.isInterZones !== undefined 
      ? { isInterZones: ticket.ticket.isInterZones }
      : ticket.isInterZones !== undefined 
        ? { isInterZones: ticket.isInterZones }
        : {}
    ),
      validatedAt: ticket.validatedAt,
      expiresAt: ticket.expiresAt,
      status: ticket.ticket?.status === "Used" ? "used" : defaultStatus,
      zoneType: ticket.ticket?.zoneType || ticket.zoneType || "",
      departureStation: ticket.ticket?.departureStation || ticket.departureStation || "",
      arrivalStation: ticket.ticket?.arrivalStation || ticket.arrivalStation || "",
    };
  };
  

  // 🔥 NOUVEAU: Fonction pour nettoyer les abonnements
  const cleanupSubscriptions = useCallback(() => {
    if (ticketChannelRef.current) {
      try {
        supabaseClient.removeChannel(ticketChannelRef.current);
      } catch (error) {
        console.error("Erreur lors de la suppression du canal Ticket:", error);
      }
      ticketChannelRef.current = null;
    }

    if (bookingChannelRef.current) {
      try {
        supabaseClient.removeChannel(bookingChannelRef.current);
      } catch (error) {
        console.error("Erreur lors de la suppression du canal Booking:", error);
      }
      bookingChannelRef.current = null;
    }

    setIsSubscribed(false);
  }, []);

  // 🔥 AMÉLIORÉ: Fonction pour s'abonner aux mises à jour en temps réel
  const subscribeToRealTimeUpdates = useCallback(
    (userId: string) => {
      if (!userId || isSubscribed) {
        return;
      }

      try {
        // 🔥 NOUVEAU: Abonnement à la table Ticket pour les mises à jour d'état
        const ticketChannel = supabaseClient
          .channel(`ticket_updates_${userId}_${Date.now()}`)
          .on(
            "postgres_changes",
            {
              event: "*", // Écouter tous les événements (INSERT, UPDATE, DELETE)
              schema: "public",
              table: "Ticket",
              // Optionnel: filtrer par userId si la table Ticket a cette colonne
              // filter: `userId=eq.${userId}`,
            },
            (payload) => {
              // Recharger les tickets après tout changement
              setTimeout(() => fetchTickets(true), 100); // Petit délai pour éviter les conflits
            }
          )
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              setIsSubscribed(true);
            } else if (status === "CLOSED") {
              setIsSubscribed(false);
            } else if (status === "CHANNEL_ERROR") {
              setIsSubscribed(false);
            }
          });

        ticketChannelRef.current = ticketChannel;

        // NOUVEAU: Abonnement à la table Booking pour les nouvelles réservations
        const bookingChannel = supabaseClient
          .channel(`booking_updates_${userId}_${Date.now()}`)
          .on(
            "postgres_changes",
            {
              event: "*", // Écouter tous les événements
              schema: "public",
              table: "Booking",
              filter: `userId=eq.${userId}`, // Filtrer par userId
            },
            (payload) => {
              // Recharger les tickets après tout changement de réservation
              setTimeout(() => fetchTickets(true), 200); // Réduit de 1000ms à 200ms pour plus de rapidité
            }
          )
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
            } else if (status === "CLOSED") {
            } else if (status === "CHANNEL_ERROR") {
            }
          });

        bookingChannelRef.current = bookingChannel;
      } catch (error) {
        setIsSubscribed(false);
      }
    },
    [] // Retiré isSubscribed des dépendances pour éviter les boucles
  );

  // fetchTickets avec cache persistant
  const fetchTickets = useCallback(
    async (forceRefresh: boolean = false) => {
      if (!isAuthenticated || !authUserId) {
        return;
      }

      if (isLoadingRef.current && !forceRefresh) {
        return;
      }

      const now = Date.now();
      if (!forceRefresh && now - lastRefreshRef.current < 30000) {
        return;
      }

      try {
        isLoadingRef.current = true;
        setLoading(true);
        setError(null);
        setLastSyncAttempt(new Date());

        console.log("📦 Chargement du cache persistant...");
        const cachedTickets = await loadPersistentCache(authUserId);

        if (cachedTickets.length > 0) {
          setTickets(cachedTickets);
          setHasLoaded(true);
          setLastUpdated(new Date());
        } else {
          setTickets([]);
          setHasLoaded(true);
        }

        // 🔥 NOUVEAU: Démarrer les abonnements temps réel dès que possible
        if (!isSubscribed) {
          subscribeToRealTimeUpdates(authUserId);
        }

        if (!isOnline) {
          return;
        }

        console.log("🌐 Tentative de synchronisation en ligne...");
        const currentToken = await getToken();
        if (!currentToken) {
          throw new Error("Token non trouvé. Veuillez vous reconnecter.");
        }

        if (!isTokenValid(currentToken)) {
          throw new Error("Session expirée. Veuillez vous reconnecter.");
        }

        const decodedToken = jwtDecode<CustomJwtPayload>(currentToken);
        const userIdFromToken = decodedToken.id;

        if (!userIdFromToken) {
          throw new Error("ID utilisateur introuvable dans le token.");
        }

        if (userIdFromToken !== authUserId) {
          console.warn(`⚠️ Incohérence utilisateur: token=${userIdFromToken}, auth=${authUserId}`);
          throw new Error("Incohérence d'authentification détectée.");
        }

        console.log(`🔄 Récupération tickets API pour utilisateur ${userIdFromToken}...`);
        const response = await geticket(userIdFromToken, currentToken);
        

        if (response && response.data) {
          const validateTicketOwnership = (ticketList: TicketApiResponse[]) => {
            return ticketList.filter(
              (ticket) => !ticket.userId || ticket.userId === userIdFromToken
            );
          };

          const interUrbainUpcoming = validateTicketOwnership(
            response.data.interUrbain?.upcomingBookings || []
          ).map((ticket: TicketApiResponse) => formatInterurbainTicket(ticket, "active"));

          const interUrbainPast = validateTicketOwnership(
            response.data.interUrbain?.pastBookings || []
          ).map((ticket: TicketApiResponse) => formatInterurbainTicket(ticket, "used"));

          const urbainUpcoming = validateTicketOwnership(
            response.data.urbain?.upcomingBookings || []
          ).map((ticket: TicketApiResponse) => formatUrbainTicket(ticket, "active"));

          const urbainPast = validateTicketOwnership(response.data.urbain?.pastBookings || []).map(
            (ticket: TicketApiResponse) => formatUrbainTicket(ticket, "used")
          );

          const freshTickets = [
            ...interUrbainUpcoming,
            ...interUrbainPast,
            ...urbainUpcoming,
            ...urbainPast,
          ];

          await saveToPersistentCache(freshTickets, userIdFromToken);

          const mergedTickets = await loadPersistentCache(userIdFromToken);

          setTickets(mergedTickets);
          setLastUpdated(new Date());
          setHasLoaded(true);
          lastRefreshRef.current = now;
        } else {
          setHasLoaded(true);
          lastRefreshRef.current = now;
        }
      } catch (error: any) {
        console.error("❌ Erreur lors de la récupération des tickets:", error);

        if (error.message?.includes("Session expirée") || error.message?.includes("Token")) {
          setError("Session expirée. Reconnectez-vous pour synchroniser.");
        } else {
          setError(`Synchronisation échouée: ${error.message}. Utilisation du cache local.`);
        }

        if (!hasLoaded) {
          setHasLoaded(true);
        }
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    },
    [
      isAuthenticated,
      authUserId,
      isOnline,
      subscribeToRealTimeUpdates,
      loadPersistentCache,
      saveToPersistentCache,
      isSubscribed,
    ] // Retiré hasLoaded car il change trop souvent
  );

  const refreshTickets = useCallback(async () => {
    await fetchTickets(true);
  }, []); // Retiré fetchTickets des dépendances pour éviter les boucles

  // Rafraîchissement automatique périodique (seulement si en ligne)
  useEffect(() => {
    if (!isAuthenticated || !authUserId || !hasLoaded || !isOnline) return;

    const interval = setInterval(() => {
      if (!loading) {
        fetchTickets(true);
      }
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated, authUserId, hasLoaded, loading, isOnline]); // Retiré fetchTickets

  // Rafraîchissement quand l'application redevient active
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        nextAppState === "active" &&
        hasLoaded &&
        !loading &&
        isAuthenticated &&
        authUserId &&
        isOnline
      ) {
        setTimeout(() => fetchTickets(true), 1000);
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription?.remove();
  }, [hasLoaded, loading, isAuthenticated, authUserId, isOnline]); // Retiré fetchTickets

  // Nettoyage lors du démontage
  useEffect(() => {
    return () => {
      cleanupSubscriptions();
    };
  }, [cleanupSubscriptions]);

  const contextValue: TicketsContextType = {
    tickets: useMemo(() => tickets, [tickets]),
    loading,
    error,
    refreshTickets,
    hasLoaded,
    lastUpdated,
    currentUserId,
    isOnline,
    lastSyncAttempt,
    cachedTicketsCount,
  };

  return <TicketsContext.Provider value={contextValue}>{children}</TicketsContext.Provider>;
}

export function useTickets() {
  const context = useContext(TicketsContext);
  if (context === undefined) {
    throw new Error("useTickets must be used within a TicketsProvider");
  }
  return context;
}
