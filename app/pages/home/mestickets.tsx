import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ScrollView,
  SafeAreaView,
  TextInput,
  Modal,
  Alert,
  BackHandler,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import tw from "../../../tailwind";
import CustomTabBar from "../../../constants/CustomTabBar";
import { useTickets } from "../../../constants/contexte/TicketsContext";
import { ticketPending } from "@/services/api/api";
import RenderTicket from "./composant/renderTicket";
import { supabaseClient } from "@/lib/supabase";
import TicketNotification from "./composant/TicketNotification";

// Type corrigé pour les réservations
export type Booking = {
  id: string;
  trip?: {
    departure?: string;
    destination?: string;
    departureTime?: string;
    arrivalTime?: string;
    station_arrivee?: string;
    station_depart?: string;
    price?: number;
    date?: string;
    operator?: {
      name?: string;
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
    isUpdated?: boolean;
    Number?: string;
    tickeNumber?: string;
    status?: string;
    zoneType?: string;
    zoneName?: string;
    operatorName?: string;
    operatorLogo?: string;
    arrivalStation?: string;
    departureStation?: string;
    validatedAt?: string;
    expiresAt?: string;
    searchDate?: string;
    departurezone?: string;
    arrivalzone?: string;
    matriculeVehicle?: string;
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
  date?: string;
  bookingDate?: string;
  validatedAt?: string;
  expiresAt?: string;
  seatNumber?: string;
  status?: "active" | "expired" | "isUpdated" | "used" | "confirmed";
  zoneType?: string;
  isInterZones?: boolean;
  departureStation?: string;
  arrivalStation?: string;
  passengers?: {
    id: string;
    name: string;
    phoneNumber: string;
  }[];
};

export type TransportType = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  subTypes?: {
    id: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[];
};

export const transportTypes: TransportType[] = [
  { id: "all", label: "Tous", icon: "apps-outline" },
  {
    id: "urbain",
    label: "Urbain",
    icon: "bus-outline",
    subTypes: [
      { id: "brt", label: "BRT", icon: "bus-outline" },
      { id: "ter", label: "TER", icon: "train-outline" },
      { id: "demdikk", label: "Dem Dikk", icon: "bus-outline" },
    ],
  },
  {
    id: "interurbain",
    label: "Interurbain",
    icon: "train-outline",
    subTypes: [
      { id: "train", label: "Train", icon: "train-outline" },
      { id: "bus", label: "Bus", icon: "bus-outline" },
      { id: "air", label: "Air", icon: "airplane-outline" },
    ],
  },
];

export default function MesTickets() {
  const router = useRouter();
  const { tickets, loading, refreshTickets, hasLoaded, error, currentUserId } = useTickets();
  
  const [filteredTickets, setFilteredTickets] = useState<Booking[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState("all");
  const [selectedSubType, setSelectedSubType] = useState<string | null>(null);
const prevLoading = useRef(loading);
const prevHasLoaded = useRef(hasLoaded);
const didInitialRefresh = useRef(false);
  // États pour la notification
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationTimer, setNotificationTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastNotification, setLastNotification] = useState(""); // Ajout pour éviter la boucle
  const previousTicketCountRef = useRef(0);
  const hasInitializedRef = useRef(false);

  // États simplifiés pour la recherche
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");

  // Fonction utilitaire pour obtenir le nom de l'opérateur
  const getOperatorName = (ticket: Booking): string => {
    return ticket.operatorName || 
           ticket.ticket?.operatorName || 
           ticket.operator?.name || 
           "";
  };

  // Fonctions utilitaires corrigées pour les types de tickets
  const isUrbanTicket = (ticket: Booking): boolean => {
    const operatorName = getOperatorName(ticket).toLowerCase();

    // Vérifier d'abord le zoneType qui est l'indicateur le plus fiable
    const hasUrbanZoneType = ticket.zoneType === "SAME_ZONE" || 
                            ticket.zoneType === "DIFFERENT_ZONES" ||
                            ticket.zoneType === "TOUT_ZONE";
    
    // Vérifier si c'est un opérateur urbain connu
    const isUrbanOperator = operatorName.includes("bus rapid transit") ||
                           operatorName.includes("brt") ||
                           operatorName.includes("ter") ||
                           operatorName.includes("Dem Dikk") ;
    
    // Vérifier si le ticket a des caractéristiques urbaines
    const hasUrbanCharacteristics = ticket.departureStation && ticket.arrivalStation &&
                                   !ticket.trip?.departure && !ticket.trip?.destination;
    
    // Un ticket est urbain si :
    // 1. Il a un zoneType urbain OU
    // 2. Il vient d'un opérateur urbain connu OU
    // 3. Il a des caractéristiques urbaines (stations au lieu de villes)
    return hasUrbanZoneType || isUrbanOperator || hasUrbanCharacteristics;
  };

  const isInterurbanTicket = (ticket: Booking): boolean => {
    const operatorName = getOperatorName(ticket).toLowerCase();
   
    // Vérifier d'abord si ce n'est PAS un ticket urbain
    if (isUrbanTicket(ticket)) {
      return false;
    }
    
    // Vérifier si c'est un opérateur interurbain connu
    const isInterurbanOperator = operatorName.includes("train") ||
                                operatorName.includes("air") ||
                                operatorName.includes("senegal airlines") ||
                                operatorName.includes("petit train") ||
                                operatorName.includes("express") ||
                               operatorName.includes("Dem Dikk") ||
                                operatorName.includes("intercity");
    
    // Vérifier si le ticket a des caractéristiques interurbaines
    const hasInterurbanCharacteristics = ticket.trip && 
                                        ticket.trip.departure && 
                                        ticket.trip.destination &&
                                        ticket.trip.departure !== ticket.trip.destination;
    
    // Un ticket est interurbain si :
    // 1. Il vient d'un opérateur interurbain connu OU
    // 2. Il a des caractéristiques interurbaines (départ/destination différents)
    return isInterurbanOperator || hasInterurbanCharacteristics;
  };

  // Fonction corrigée de filtrage
  const applyFilters = () => {
    let filtered = tickets;

    // Filtrer par type de transport avec une logique plus précise
    if (selectedType !== "all") {
      filtered = filtered.filter((ticket) => {
        if (selectedType === "urbain") {
          return isUrbanTicket(ticket);
        } else if (selectedType === "interurbain") {
          return isInterurbanTicket(ticket);
        }
        return true;
      });
    }

    // Filtrer par sous-type avec une logique améliorée
    if (selectedSubType) {
      filtered = filtered.filter((ticket) => {
        const operatorName = getOperatorName(ticket).toLowerCase();
        
        switch (selectedSubType) {
          case "bus":
            return operatorName.includes("bus") && 
                   !operatorName.includes("rapid transit") && 
                   !operatorName.includes("dem dikk");
          case "brt":
            return operatorName.includes("brt") || operatorName.includes("rapid transit");
          case "demdikk":
            // Dem Dikk (urbain)
            return operatorName.includes("dem dikk") ||
                   operatorName.includes("dakar dem dikk");
          
          case "ter":
            // TER (urbain)
            return operatorName.includes("ter") && 
                   !operatorName.includes("intercity") &&
                   !operatorName.includes("express");
          
          case "train":
            // Train interurbain
            return !isUrbanTicket(ticket) && 
                   (operatorName.includes("train") || 
                    operatorName.includes("chemin de fer") ||
                    operatorName.includes("railway"));
          
          case "air":
            // Transport aérien
            return operatorName.includes("air") || 
                   operatorName.includes("airline") ||
                   operatorName.includes("aviation");
          
          default:
            return true;
        }
      });
    }

    // Filtrer par recherche simple (départ ET arrivée)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((ticket) => {
        const isUrbanTicket = ticket.zoneType === "SAME_ZONE" || 
                             ticket.zoneType === "DIFFERENT_ZONES" ||
                             ticket.zoneType === "TOUT_ZONE";
        
        const departure = isUrbanTicket
          ? (ticket.departureStation || ticket.ticket?.departureStation || ticket.trip?.departure || "").toLowerCase()
          : (ticket.trip?.departure || "").toLowerCase();
        
        const arrival = isUrbanTicket
          ? (ticket.arrivalStation || ticket.ticket?.arrivalStation || ticket.trip?.destination || "").toLowerCase()
          : (ticket.trip?.destination || "").toLowerCase();

        const operatorName = getOperatorName(ticket).toLowerCase();
        const passengerName = ticket.passengers && ticket.passengers.length > 0 
          ? ticket.passengers[0].name.toLowerCase() 
          : "";

        return departure.includes(query) || 
               arrival.includes(query) || 
               operatorName.includes(query) ||
               passengerName.includes(query);
      });
    }

    // Filtrer par date simple
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter((ticket) => {
        let ticketDate: Date | null = null;
        
        if (ticket.ticket?.searchDate) {
          ticketDate = new Date(ticket.ticket.searchDate);
        } else if (ticket.trip?.departureTime) {
          ticketDate = new Date(ticket.trip.departureTime);
        } else if (ticket.bookingDate) {
          ticketDate = new Date(ticket.bookingDate);
        }

        if (!ticketDate || isNaN(ticketDate.getTime())) return false;

        const ticketDateOnly = new Date(ticketDate.getFullYear(), ticketDate.getMonth(), ticketDate.getDate());

        switch (dateFilter) {
          case "today":
            return ticketDateOnly.getTime() === today.getTime();
          case "week":
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return ticketDateOnly >= weekAgo && ticketDateOnly <= today;
          case "month":
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return ticketDateOnly >= monthAgo && ticketDateOnly <= today;
          default:
            return true;
        }
      });
    }

    setFilteredTickets(filtered);
  };

  // Fonction pour réinitialiser les filtres
  const resetFilters = () => {
    setSearchQuery("");
    setDateFilter("all");
    setSelectedType("all");
    setSelectedSubType(null);
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        router.replace("/pages/home/accueil");
        return true;
      }
    );
    return () => backHandler.remove();
  }, []);

  // Rafraîchissement automatique quand on revient sur la page
  useEffect(() => {
    if (hasLoaded && !loading && !didInitialRefresh.current) {
      didInitialRefresh.current = true;
      setTimeout(() => {
        console.log('🔄 Rafraîchissement immédiat à l\'arrivée sur mestickets');
        refreshTickets();
      }, 500);
    }
  }, [hasLoaded, loading, refreshTickets]);

  // Affichage conditionnel pour le chargement initial
  const showInitialLoader = !hasLoaded && loading;

  // Gestion des erreurs
  if (error) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-50`}>
        <View style={tw`flex-1 justify-center items-center px-4`}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={tw`text-red-500 text-center mt-4 text-lg`}>
            Erreur lors du chargement des tickets
          </Text>
          <Text style={tw`text-gray-600 text-center mt-2`}>
            {error}
          </Text>
          <TouchableOpacity
            style={tw`mt-4 bg-teal-600 py-3 px-6 rounded-xl`}
            onPress={refreshTickets}
          >
            <Text style={tw`text-white font-semibold`}>Réessayer</Text>
          </TouchableOpacity>
        </View>
        <CustomTabBar />
      </SafeAreaView>
    );
  }

  // Vérifier si des filtres sont actifs
  const hasActiveFilters = searchQuery.trim() || dateFilter !== "all" || selectedType !== "all";

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      {/* Notification */}
      <TicketNotification
        visible={showNotification}
        message={notificationMessage}
        type="info"
        duration={2000}
        onHide={() => setShowNotification(false)}
      />

      {/* Header personnalisé */}
      <View style={tw`bg-white border-b border-gray-100`}>
        <View style={tw`px-4 py-8 flex-row items-center justify-between`}>
          <View>
            <Text style={tw`text-2xl font-bold text-gray-900`}>Mes Tickets</Text>
            <Text style={tw`text-sm text-gray-500 mt-1`}>
              {filteredTickets.length} ticket{filteredTickets.length !== 1 ? "s" : ""} trouvé
              {filteredTickets.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        {/* Barre de recherche simple */}
        <View style={tw`px-4 pb-3`}>
          <View style={tw`flex-row items-center bg-gray-50 rounded-xl px-3 py-2`}>
            <Ionicons name="search-outline" size={16} color="#6B7280" />
            <TextInput
              style={tw`flex-1 ml-2 text-sm`}
              placeholder="Rechercher par départ, arrivée, opérateur..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={16} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Affichage des filtres actifs */}
        {hasActiveFilters && (
          <View style={tw`px-4 pb-3`}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={tw`flex-row gap-2`}>
                {dateFilter !== 'all' && (
                  <View style={tw`bg-teal-100 px-3 py-1 rounded-full flex-row items-center`}>
                    <Ionicons name="calendar-outline" size={12} color="#0D9488" />
                    <Text style={tw`ml-1 text-xs text-teal-700`}>
                      {dateFilter === 'today' ? 'Aujourd\'hui' : 
                       dateFilter === 'week' ? 'Cette semaine' : 'Ce mois'}
                    </Text>
                  </View>
                )}
                {searchQuery.trim() && (
                  <View style={tw`bg-gray-100 px-3 py-1 rounded-full flex-row items-center`}>
                    <Ionicons name="search-outline" size={12} color="black" />
                    <Text style={tw`ml-1 text-xs `}>&quot;{searchQuery}&quot;</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Menu des types de transport */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw`px-3 py-3`}
          decelerationRate="fast"
        >
          {transportTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              onPress={() => {
                setSelectedType(type.id);
                setSelectedSubType(null);
              }}
              style={tw`px-4 py-2.5 mx-1 rounded-lg flex-row items-center ${
                selectedType === type.id ? "bg-teal-50 border border-teal-200" : "bg-gray-50"
              }`}
            >
              <Ionicons
                name={type.icon}
                size={18}
                color={selectedType === type.id ? "#0D9488" : "#6B7280"}
              />
              <Text
                style={tw`ml-2 text-sm font-medium ${
                  selectedType === type.id ? "text-teal-700" : "text-gray-600"
                }`}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sous-catégories */}
        {selectedType !== "all" && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw`px-3 pb-2`}
          >
            {transportTypes
              .find((type) => type.id === selectedType)
              ?.subTypes?.map((subType) => (
                <TouchableOpacity
                  key={subType.id}
                  onPress={() =>
                    setSelectedSubType(selectedSubType === subType.id ? null : subType.id)
                  }
                  style={tw`px-3 py-1.5 mx-1 rounded-full flex-row items-center ${
                    selectedSubType === subType.id ? "bg-teal-100" : "bg-gray-50"
                  }`}
                >
                  <Ionicons
                    name={subType.icon}
                    size={14}
                    color={selectedSubType === subType.id ? "#0D9488" : "#6B7280"}
                  />
                  <Text
                    style={tw`ml-1.5 text-xs font-medium ${
                      selectedSubType === subType.id ? "text-teal-700" : "text-gray-600"
                    }`}
                  >
                    {subType.label}
                  </Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        )}
      </View>

      {/* Modal de filtres simple */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={tw`flex-1 bg-black bg-opacity-50 justify-end`}>
          <View style={tw`bg-white rounded-t-3xl p-6`}>
            <View style={tw`flex-row items-center justify-between mb-6`}>
              <Text style={tw`text-xl font-bold text-gray-900`}>Filtres</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close-outline" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <Text style={tw`text-base font-medium text-gray-900 mb-3`}>Filtrer par date</Text>
            
            {[
              { value: "all", label: "Toutes les dates", icon: "calendar-outline" },
              { value: "today", label: "Aujourd'hui", icon: "today-outline" },
              { value: "week", label: "Cette semaine", icon: "calendar-outline" },
              { value: "month", label: "Ce mois", icon: "calendar-outline" }
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={tw`flex-row items-center py-3 px-4 rounded-xl mb-2 ${
                  dateFilter === option.value ? "bg-teal-50 border border-teal-200" : "bg-gray-50"
                }`}
                onPress={() => setDateFilter(option.value as any)}
              >
                <Ionicons
                  name={option.icon as any}
                  size={20}
                  color={dateFilter === option.value ? "#0D9488" : "#6B7280"}
                />
                <Text style={tw`ml-3 text-base ${
                  dateFilter === option.value ? "text-teal-700 font-medium" : "text-gray-700"
                }`}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={tw`mt-6 bg-teal-600 py-3 rounded-xl`}
              onPress={() => setShowFilters(false)}
            >
              <Text style={tw`text-white font-semibold text-center`}>Appliquer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Contenu principal */}
      {!hasLoaded && loading ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <View style={tw`w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin`}></View>
          <Text style={tw`mt-2 text-gray-600 text-sm`}>Chargement...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTickets}
          renderItem={({ item, index }) => (
            <RenderTicket item={item} key={index} />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={tw`py-4 pb-24`}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={refreshTickets} 
              colors={["#0D9488"]} 
            />
          }
          ListEmptyComponent={() => (
            <View style={tw`flex-1 justify-center items-center px-4 py-20`}>
              <Ionicons name="ticket-outline" size={48} color="#9CA3AF" />
              <Text style={tw`text-gray-600 text-center mt-4`}>
                {loading ? "Chargement des tickets..." : "Aucun ticket trouvé"}
              </Text>
              {!loading && hasActiveFilters && (
                <View style={tw`mt-4`}>
                  <Text style={tw`text-gray-500 text-center mb-3 text-sm`}>
                    Essayez d&apos;ajuster vos filtres
                  </Text>
                  <TouchableOpacity
                    style={tw`bg-teal-600 py-2 px-4 rounded-lg`}
                    onPress={resetFilters}
                  >
                    <Text style={tw`text-white font-semibold text-center`}>Réinitialiser</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}
      <CustomTabBar />
    </SafeAreaView>
  );
}


// Fonction pour vérifier si un ticket est expiré basé sur la date et l'heure
// Fonction corrigée pour vérifier si un ticket est expiré
// Fonction pour vérifier si un ticket est expiré basé sur la date et l'heure
const isTicketExpired = (item: Booking): boolean => {
  const now = new Date();
  
  // Pour les tickets urbains
  const isUrbanTicket = item.zoneType === "SAME_ZONE" || 
                       item.zoneType === "DIFFERENT_ZONES" ||
                       item.zoneType === "TOUT_ZONE";
  
  if (isUrbanTicket) {
    // Pour les tickets urbains, vérifier validatedAt ou date de départ
    if (item.trip?.departureTime) {
      try {
        const departureDate = new Date(item.trip.departureTime);
        
        // Déterminer la durée de validité selon l'opérateur
        let validityHours = 24; // Par défaut 2 heures
        const operatorName = item.operatorName || item.ticket?.operatorName || '';
        
        if (operatorName.toLowerCase().includes('bus rapid transit') || 
            operatorName.toLowerCase().includes('brt')) {
          validityHours = 24; // BRT: 1 heure
        } else if (operatorName.toLowerCase().includes('dem dikk')) {
          validityHours = 24; // Dem Dikk: 1 heure
        } else if (operatorName.toLowerCase().includes('ter senegal') ||
                   operatorName.toLowerCase().includes('ter')) {
          validityHours = 24; // TER: 2 heures
        }
        
        const expirationDate = new Date(departureDate.getTime() + (validityHours * 60 * 60 * 1000));
        
        return now > expirationDate;
      } catch (error) {
        console.error('Erreur lors du parsing de departureTime urbain:', error);
        return false;
      }
    }
    
    // Si pas de departureTime, utiliser bookingDate + validité
    if (item.bookingDate) {
      try {
        const bookingDate = new Date(item.bookingDate);
        const expirationDate = new Date(bookingDate.getTime() + (2 * 60 * 60 * 1000)); // 2 heures par défaut
        
        return now > expirationDate;
      } catch (error) {
        console.error('Erreur lors du parsing de bookingDate urbain:', error);
        return false;
      }
    }
  } else {
    // Pour les tickets interurbains
    if (item.ticket?.searchDate && item.trip?.departureTime) {
      try {
        // Récupérer la date de voyage (searchDate)
        const searchDate = new Date(item.ticket.searchDate);
        
        // Récupérer l'heure de départ (departureTime)
        const departureTime = new Date(item.trip.departureTime);
        
        // Créer la date/heure complète de départ
        const completeDepartureDateTime = new Date(
          searchDate.getFullYear(),
          searchDate.getMonth(),
          searchDate.getDate(),
          departureTime.getHours(),
          departureTime.getMinutes(),
          departureTime.getSeconds()
        );
        
        // Le ticket expire après l'heure de départ
        return now > completeDepartureDateTime;
      } catch (error) {
        console.error('Erreur lors du parsing des dates interurbaines:', error);
        return false;
      }
    }
    
    // Si on a seulement searchDate (pas d'heure de départ)
    if (item.ticket?.searchDate) {
      try {
        const searchDate = new Date(item.ticket.searchDate);
        // Ajouter 23h59 à la date de voyage pour l'expiration
        const endOfDay = new Date(searchDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        return now > endOfDay;
      } catch (error) {
        console.error('Erreur lors du parsing de searchDate:', error);
        return false;
      }
    }
    
    // Si on a trip.departureTime mais pas de searchDate
    if (item.trip?.departureTime) {
      try {
        const departureDate = new Date(item.trip.departureTime);
        
        return now > departureDate;
      } catch (error) {
        console.error('Erreur lors du parsing de departureTime interurbain:', error);
        return false;
      }
    }
  }
  
  // Si aucune date n'est disponible, considérer le ticket comme valide
  console.warn('Aucune date disponible pour le ticket:', item.id);
  return false;
};

// CORRECTION PRINCIPALE : Fonction pour obtenir le statut réel du ticket
export const getRealTicketStatus = (item: Booking): "active" | "expired" | "isUpdated" | "Pending" | "used" | "confirmed" => {
 // PRIORITÉ 1: Vérifier si le ticket est expiré selon la date/heure (isTicketExpired)
  if (isTicketExpired(item)) {
    return "expired";
  }

  // PRIORITÉ 2: Vérifier le statut local (item.status)
  if (item.status === "isUpdated") {
    return "isUpdated";
  }
    const dbStatus = item.ticket?.status;
  if (dbStatus) {
    switch (dbStatus.toLowerCase()) {
      case "valid":
      case "active":
      case "confirmed":
        return "active";
      case "Pending":
        return "Pending";
      case "expired":
        return "expired";
      case "used":
        return "used";
      case "isupdated":
      case "is_updated":
        return "isUpdated";
      default:
        // Si le statut DB n'est pas reconnu, continuer avec la logique existante
        break;
    }
  }
  
 
  
  // PRIORITÉ 3: Vérifier si le ticket est expiré selon la date/heure
  if (isTicketExpired(item)) {
    return "expired";
  }

  // Sinon retourner 'active' par défaut
  return "active";
};

// Fonction de debug pour analyser les tickets
export const debugTicketStatus = (item: Booking) => {
  const now = new Date();
  const isUrbanTicket = item.zoneType === "SAME_ZONE" || 
                       item.zoneType === "DIFFERENT_ZONES" ||
                       item.zoneType === "TOUT_ZONE";

  console.log('🔍 Debug Ticket Status:', {
    ticketId: item.id,
    operatorName: item.operatorName || item.ticket?.operatorName,
    isUrbanTicket,
    originalStatus: item.status,
    searchDate: item.ticket?.searchDate,
    departureTime: item.trip?.departureTime,
    bookingDate: item.bookingDate,
    now: now.toISOString(),
    isExpiredResult: isTicketExpired(item),
    finalStatus: getRealTicketStatus(item)
  });
};

// Fonctions utilitaires pour l'affichage des statuts (inchangées)
export const getStatusColor = (item: Booking): string => {
  const realStatus = getRealTicketStatus(item);
  switch (realStatus) {
    case "active":
      return "bg-green-100 text-green-800";
    case "expired":
      return "bg-red-400 text-red-800";
    case "isUpdated":
      return "bg-yellow-100 text-yellow-800";
    case "Pending":
      return "bg-blue-100 text-blue-800";
    case "used":
      return "bg-gray-100 text-gray-800";
    case "confirmed":
      return "bg-teal-100 text-teal-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const getStatusText = (item: Booking): string => {
  const realStatus = getRealTicketStatus(item);
  switch (realStatus) {
    case "active":
      return "Valide";
    case "expired":
      return "Expiré";
    case "isUpdated":
      return "Modifié";
    case "Pending":
      return "En attente";
    case "used":
      return "Utilisé";
    case "confirmed":
      return "Confirmé";
    default:
      return "Valide";
  }
};

// Fonction pour vérifier si un ticket est cliquable
export const isTicketClickable = (item: Booking): boolean => {
  // Vérifier si c'est un ticket Dem Dikk avec le statut "pending"
  const operatorName = item.operatorName || item.ticket?.operatorName || "";
  const isDemDikkPending = 
    operatorName.toLowerCase().includes("dem dikk") && 
    (String(item.status) === "pending" || String(item.ticket?.status) === "pending");
  
  // Si c'est un ticket Dem Dikk en attente, le rendre cliquable
  if (isDemDikkPending) {
    console.log("🎫 Ticket Dem Dikk pending autorisé à être cliqué:", {
      ticketId: item.id,
      operatorName,
      status: item.status,
      ticketStatus: item.ticket?.status
    });
    return true;
  }
  
  // Pour tous les autres tickets, utiliser uniquement la logique de durée de validité
  const isExpired = isTicketExpired(item);
  if (isExpired) {
    console.log("❌ Ticket expiré, non cliquable:", {
      ticketId: item.id,
      operatorName,
      isExpired
    });
  }
  return !isExpired;
};


// Fonction pour formater le classeType
export const formatClasseType = (classeType?: string): string | null => {
  if (!classeType) return null;

  // Convertir "Classe_2" en "Classe 2"
  return classeType.replace("_", " ");
};
