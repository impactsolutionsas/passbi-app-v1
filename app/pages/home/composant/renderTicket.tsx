import tw from "@/tailwind";
import { useRouter } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { Booking, getRealTicketStatus, isTicketClickable } from "../mestickets";
import TicketContent from "./ticketContent";
import { supabaseClient } from "@/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";
import NetInfo from '@react-native-community/netinfo';

interface Ticket {
  id?: string;
  code?: string;
  isUpdated?: boolean;
  tickeNumber?: string;
}

// Rendu d'un ticket individuel avec écoute temps réel
const RenderTicket = ({ item }: { item: Booking }) => {
  const router = useRouter();
  
  // 🔥 CORRECTION 1: Initialiser avec les données existantes et valeur par défaut pour isUpdated
  const [ticket, setTicket] = useState<Ticket | undefined>(() => {
    if (item?.ticket) {
      return {
        id: item.ticket.id,
        code: item.ticket.code,
        isUpdated: item.ticket.isUpdated ?? true, // 🔥 Valeur par défaut true si undefined
        tickeNumber: item.ticket.tickeNumber
      };
    }
    return undefined;
  });
  
  // 🔥 NOUVEAU: État pour suivre la connectivité
  const [isOnline, setIsOnline] = useState(true);
  const subscriptionRef = useRef<RealtimeChannel | null>(null);

  // 🔥 NOUVEAU: Surveillance de la connectivité
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });
    return unsubscribe;
  }, []);

  // Récupération initiale des données du ticket ET écoute temps réel
  useEffect(() => {
    if (!item?.ticket?.id) return;

    const fetchTicketData = async () => {
      // 🔥 CORRECTION 2: Ne pas faire d'appel réseau si hors ligne
      if (!isOnline) {
        console.log('📶 Hors ligne - utilisation des données cached pour ticket', item.ticket.id);
        return;
      }

      try {
        const { data } = await supabaseClient
          .from("Ticket")
          .select("id,code,isUpdated,tickeNumber")
          .eq("id", item.ticket.id)
          .maybeSingle();

        if (data) {
          setTicket({
            id: data.id,
            code: data.code,
            isUpdated: data.isUpdated ?? true, // 🔥 Valeur par défaut si undefined
            tickeNumber: data.tickeNumber
          });
        }
      } catch (error) {
        console.error("Erreur lors de la récupération du ticket:", error);
        // 🔥 CORRECTION 3: En cas d'erreur, garder les données existantes
        console.log('❌ Erreur réseau - conservation des données cached');
      }
    };

    // Nettoyage de l'abonnement précédent s'il existe
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    // Récupération initiale seulement si en ligne
    if (isOnline) {
      fetchTicketData();

      // AJOUT: Écoute en temps réel des changements sur le ticket
      const channelName = `ticket-${item.ticket.id}-${Date.now()}`;
      subscriptionRef.current = supabaseClient
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'Ticket',
            filter: `id=eq.${item.ticket.id}`
          },
          (payload) => {
            console.log('🔄 Changement détecté sur le ticket:', payload);
            
            // Mettre à jour l'état local avec les nouvelles données
            if (payload.new) {
              setTicket(prevTicket => ({
                ...prevTicket,
                id: payload.new.id,
                code: payload.new.code,
                isUpdated: payload.new.isUpdated ?? true, // 🔥 Valeur par défaut
                tickeNumber: payload.new.tickeNumber
              }));
            }
          }
        )
        .subscribe();
    } else {
      console.log('📶 Hors ligne - pas d\'abonnement temps réel');
    }

    // Nettoyage de l'abonnement
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [item?.ticket?.id, isOnline]);

  const realStatus = getRealTicketStatus(item);
  const isExpired = realStatus === "expired";
  const clickable = isTicketClickable(item);

  // 🔥 CORRECTION 4: Utiliser les données cached si disponibles
  const effectiveTicket = ticket || item.ticket;

  // 🔥 CORRECTION 5: Logique améliorée pour shouldShowLoading
  const shouldShowLoading = () => {
    // Si hors ligne, ne jamais afficher le loading
    if (!isOnline) {
      return false;
    }
    
    // Si pas de données du tout, afficher le loading
    if (!effectiveTicket) {
      return true;
    }
    
    // Si isUpdated est explicitement false, afficher le loading
    if (effectiveTicket.isUpdated === false) {
      return true;
    }
    
    // Dans tous les autres cas, ne pas afficher le loading
    return false;
  };

  // 🔥 CORRECTION 6: Nouvelle logique pour isTicketReady
  const isTicketReady = () => {
    // Si pas de ticket, pas prêt
    if (!effectiveTicket) {
      return false;
    }
    
    // Si hors ligne, utiliser les données cached (toujours prêt)
    if (!isOnline) {
      return true;
    }
    
    // Si en ligne, vérifier isUpdated
    // Si isUpdated est true ou undefined, prêt
    // Si isUpdated est false, pas prêt (en cours de mise à jour)
    return effectiveTicket.isUpdated !== false;
  };

  // 🔥 LOGS DE DEBUG
  // console.log('🔍 DEBUG TICKET:', {
  //   ticketId: item?.ticket?.id,
  //   isOnline,
  //   effectiveTicket: effectiveTicket ? {
  //     id: effectiveTicket.id,
  //     isUpdated: effectiveTicket.isUpdated,
  //     code: effectiveTicket.code
  //   } : null,
  //   shouldShowLoading: shouldShowLoading(),
  //   isTicketReady: isTicketReady(),
  //   clickable,
  //   realStatus
  // });

  // Ticket expiré
  if (isExpired) {
    return (
      <View
        style={tw`relative bg-white rounded-xl shadow-lg mx-4 mb-4 overflow-hidden border border-gray-100 opacity-40`}
      >
        <TicketContent item={item} />
      </View>
    );
  }

  // Fonction pour calculer la date d'expiration d'un ticket
  const calculateExpirationDate = (item: Booking): Date => {
    if (item.trip?.departureTime) {
      const departureDate = new Date(item.trip.departureTime);

      let validityHours = 2; // Par défaut 2 heures
      const operatorName = item.operatorName || item.ticket?.operatorName || '';

      if (operatorName.toLowerCase().includes('brt') ||
        operatorName.toLowerCase().includes('rapid transit')) {
        validityHours = 1; // BRT: 1 heure
      } else if (operatorName.toLowerCase().includes('dem dikk')) {
        validityHours = 1; // Dem Dikk: 1 heure
      } else if (operatorName.toLowerCase().includes('ter')) {
        validityHours = 2; // TER: 2 heures
      }

      return new Date(departureDate.getTime() + (validityHours * 60 * 60 * 1000));
    }

    return new Date(Date.now() + (2 * 60 * 60 * 1000));
  };

  const getValidityHours = (item: Booking) => {
    const operatorName = item.operatorName || item.ticket?.operatorName || '';

    if (operatorName.toLowerCase().includes('brt') ||
      operatorName.toLowerCase().includes('rapid transit')) {
      return 1; // BRT: 1 heure
    } else if (operatorName.toLowerCase().includes('dem dikk')) {
      return 1; // Dem Dikk: 1 heure
    } else if (operatorName.toLowerCase().includes('ter')) {
      return 2; // TER: 2 heures
    }

    return 2; // Par défaut 2 heures
  };

  // Ticket en cours de chargement
  if (shouldShowLoading()) {
    return (
      <View
        style={tw`relative bg-white rounded-xl shadow-lg mb-4 overflow-hidden border border-gray-100 opacity-40`}
      >
        <TicketContent item={item} />
        <View
          style={tw`opacity-70 absolute bg-white h-100% items-center justify-center w-97% flex-row gap-3`}
        >
          <ActivityIndicator color="#094741" size={35} />
          <Text style={tw`text-lg font-bold text-gray-800`}>
            {isOnline ? 'Ticket en cours de chargement...' : 'Ticket disponible hors ligne'}
          </Text>
        </View>
      </View>
    );
  }

  // 🔥 CORRECTION 7: Utiliser la nouvelle fonction isTicketReady
  // Ticket actif : cliquable
  if (clickable && isTicketReady()) {
    const isUrbanTicket =
      item.zoneType === "SAME_ZONE" ||
      item.zoneType === "DIFFERENT_ZONES" ||
      item.zoneType === "TOUT_ZONE";
    // Correction : détection souple de l'opérateur
    const opName = (item.operatorName || "").toLowerCase();
    const isBRT = opName.includes("brt") || opName.includes("rapid transit");
    const isTER = opName.includes("ter");
    const isDemDikk = opName.includes("dem dikk");

    return (
      <TouchableOpacity
        style={tw`bg-white rounded-xl shadow-sm mx-4 mb-4 overflow-hidden border border-gray-100`}
        onPress={() => {
          // console.log('🎯 Ticket cliqué:', {
          //   isUrbanTicket,
          //   operatorName: item.operatorName,
          //   ticketCode: effectiveTicket?.code
          // });
          
          if (isUrbanTicket) {
            // Déterminer l'opérateur et le type pour la navigation
            let operatorName = "";
            let operatorType = "";
            let operatorLogoUrl = "";
            
            let transportType = "";

            if (isBRT) {
              operatorName = "Bus Rapid Transit";
              operatorType = "BRT";
              transportType = "BRT";
            } else if (isDemDikk) {
              operatorName = "Dem Dikk";
              operatorType = "DemDikk";
              transportType = "DemDikk";
            } else if (isTER) {
              operatorName = "TER Senegal";
              operatorType = "TER";
              transportType = "TER";
            } else {
              operatorName = item.operatorName || "Opérateur inconnu";
              operatorType = "INCONNU";
              transportType = "INCONNU";
            }

            // Navigation pour les tickets urbains avec classeType
            router.push({
              pathname: "/pages/TicketPage/TicketPageUrbain/ticketpages",
              params: {
                departureStation: (effectiveTicket as any)?.departureStation || (item as any).departureStation ,
                arrivalStation: (effectiveTicket as any)?.arrivalStation || (item as any).arrivalStation ,
                operatorName: operatorName|| item.operator?.name,
                operatorLogoUrl:item.operator?.logoUrl,
                 id: item.ticket?.id || "",
                operatorType: operatorType,
                transportType: transportType,
                ticketCode: effectiveTicket?.code || '',
                tickeNumber: effectiveTicket?.tickeNumber || '',
                price: item.payment?.amount || '',
                validatedAt: item.ticket?.validatedAt,
                expiresAt: item.ticket?.expiresAt,
                departurezone: item.ticket?.departurezone,
                matriculeVehicle: item.ticket?.matriculeVehicle,
                isInterZones: String(item!.isInterZones),
                status:item.ticket?.status,
                zoneType: (effectiveTicket as any)?.zoneType || (item as any).zoneType || '',
                validityHours: getValidityHours(item).toString(),
                bookingDate: item.bookingDate || item.date || '',
                transactionId: item.payment?.transactionId || '',
                classeType: item.ticket?.ticketCount?.classeType || '',
                ticketCount: item.ticket?.ticketCount?.count || 1
              }
            });
          } else {
            // Navigation pour les tickets interurbains
            const interurbainRoute = {
              pathname: "/pages/TicketPage/ticketpages",
              params: {
                departure: item.trip?.departure || "",
                destination: item.trip?.destination || "",
                date: item.trip?.departureTime || item.date || item.bookingDate || "",
                departureTime: item.trip?.departureTime || "",
                station_depart: item.trip?.station_depart || "",
                station_arrivee: item.trip?.station_arrivee || "",
                price: item.trip?.price || item.payment?.amount || 0,
                operatorName:
                  item.operatorName || item.operator?.name || item.trip?.operator?.name || "",
                  operatorLogoUrl:item.operator?.logoUrl,

                ticketNumber: item.ticket?.Number || effectiveTicket?.code || "",
                seatNumber: effectiveTicket?.tickeNumber,
                ticketCode: effectiveTicket?.code || "",
                vehicleNumber: item.trip?.vehicle?.registrationNumber || "",
                registrationNumber: item.trip?.vehicle?.registrationNumber || "",
                vehicleData: JSON.stringify(item.trip?.vehicle) || "{}",
                passengerName:
                  item.passengers && item.passengers.length > 0 ? item.passengers[0].name : "",
                passengerPhone:
                  item.passengers && item.passengers.length > 0 ? item.passengers[0].phoneNumber : "",
              },
            };

            // console.log("Navigation vers route interurbain :", interurbainRoute);
            router.push(interurbainRoute as any);
          }
        }}
      >
        <TicketContent item={item} />
      </TouchableOpacity>
    );
  }

  // 🔥 CORRECTION 8: Affichage amélioré pour les tickets non-cliquables
  // console.log('❌ Ticket non-cliquable:', {
  //   clickable,
  //   isTicketReady: isTicketReady(),
  //   reason: !clickable ? 'Ticket non clickable (expiré?)' : 'Ticket pas prêt'
  // });

  // Ticket non-cliquable ou pas encore activé
  return (
    <View
      style={tw`bg-white rounded-xl shadow-sm mx-4 mb-4 overflow-hidden border border-gray-100 opacity-60`}
    >
      <TicketContent item={item} />
      {/* 🔥 AJOUT: Indicateur pour debug */}
      {__DEV__ && (
        <View style={tw`absolute top-2 right-2 bg-red-500 rounded px-2 py-1`}>
          <Text style={tw`text-white text-xs`}>
            {!clickable ? 'Expiré' : 'Pas prêt'}
          </Text>
        </View>
      )}
    </View>
  );
};

export default RenderTicket;