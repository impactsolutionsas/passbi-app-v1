// HeaderComponent.tsx - Correction des erreurs de rendu de texte

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useRouter, useLocalSearchParams } from "expo-router";
import tw from "../../tailwind";
import { useRoute } from "@react-navigation/native";
import {
  getUser,
  setToken,
  getToken,
  searchTickets,
  getOperator,
  reservationBRT,
} from "../../services/api/api";

// Fonction utilitaire pour décoder les URL
const decodeUrlParam = (param: string): string => {
  if (!param) return "";
  try {
    return decodeURIComponent(param);
  } catch (error) {
    console.error("Erreur de décodage URL:", error);
    return param;
  }
};

// Fonction pour formater les noms de stations
const formatStationName = (stationName: string): string => {
  const decoded = decodeUrlParam(stationName);

  // Si c'est le texte par défaut, retourner une valeur plus appropriée
  if (decoded.includes("Sélectionner une station")) {
    return decoded.includes("départ") ? "Station de départ" : "Station d&apos;arrivée";
  }

  return decoded;
};

// Fonction pour formater la classe TER
const formatTerClass = (classe: string | number | undefined): string => {
  if (!classe) return "Classe standard";

  const classeStr = String(classe);

  switch (classeStr) {
    case "1":
    case "Classe_1":
      return "1ère Classe";
    case "2":
    case "Classe_2":
      return "2ème Classe";
    default:
      return `Classe ${classeStr}`;
  }
};

// Définir le type des paramètres de la route
type RouteParams = {
  departure: string;
  destination: string;
  date: string;
  seat: string;
  operatorName?: string;
  transportType?: string;
  // Champs BRT/TER
  id?: string;
  zoneName?: string;
  zoneType?: string;
  departureStation?: string;
  arrivalStation?: string;
  destinationStation?: string;
  amount?: string;
  ticketCount?: string;
  code?: string;
  zone?: string;
  status?: string;
  createdAt?: string;
  ticketValidity?: string;
  ticketvalidity?: string;
  pendingExpiresAt?: string;
  operatorType?: string;
  // Ajout pour TER
  classe?: string;
  // Ajout pour Dem Dikk
  lineNumber?: string;
  lineName?: string;
  validityDuration?: string;
  expiresAt?: string;
};

// Définir l'interface pour les trajets
interface Trip {
  tripId: string;
  departure: string;
  destination: string;
  departureTime: string;
  totalAvailableSeats: number;
  price: number;
  seat: string;
  requestedSeats: number;
  operator?: {
    name: string;
    logoUrl?: string;
    slogan?: string;
    commissionPassenger?: number;
    transportType?: string;
  };
}

interface HeaderComponentProps {
  onBack?: () => void;
  onModifier?: () => void;
  children?: React.ReactNode;
  showJourneyDetails?: boolean; // Pour afficher/masquer les détails du trajet
  showDetails?: boolean; // Pour afficher/masquer les détails du trajet
  showDetail?: boolean; // Pour afficher/masquer les détails du trajet
  showButton?: boolean;
  showButtons?: boolean;
  showHeaders?: boolean;
  showHeader?: boolean; // Nouvel attribut pour afficher/masquer la barre de navigation verte
  showHeaderpaiement?: boolean; // Nouvel attribut pour afficher/masquer la barre de navigation verte
  disableBackButton?: boolean; // Nouvel attribut pour désactiver le bouton retour
  departLieu?: string;
  departHeure?: string;
  arriveeLieu?: string;
  arriveeHeure?: string;
  requestedSeats: string;
  price?: number;
  date?: string;
  placesRestantes?: number;
  operator: {
    name: string;
    logoUrl?: string;
    slogan?: string;
    commissionPassenger?: number;
    transportType?: string;
  };
  // Ajout des props optionnelles pour les données de route
  departure?: string;
  destination?: string;
  userName?: string;
  showGreetings?: boolean;
  showOperator?: boolean;
  brtDetails?: {
    // Informations existantes
    id?: string;
    code: string;
    status: string;
    createdAt: string;
    expiresAt: string;
    zoneName: string;
    zoneType: string;
    departureStation: string;
    arrivalStation: string;
    amount: string;
    ticketCount: string;

    // Nouveaux champs pour les IDs des stations
    departureStationId?: string; // ID de la station de départ
    arrivalStationId?: string; // ID de la station d'arrivée

    // Informations sur les zones et tarifs
    zones?: any[]; // Données des zones
    tarifs?: any[]; // Données des tarifs

    // Autres champs existants
    lineName?: string;
    lineId?: string;
    operatorType?: string;
    ticketValidity?: string;
    zone: string;
    tariffType?: string;
    isInterZones?: boolean;
    userId?: string;
    reservationDate?: string;
    paymentStatus?: string;
  } | null;
  // Ajout pour les détails spécifiques du TER
  terDetails?: {
    departureStation: string;
    destinationStation: string;
    amount: string;
    ticketCount: string;
    ticketValidity?: string;
    classe: number | string;
    zone: string;
    code: string;
    status: string;
    expiresAt: string;
  } | null;
  // Ajout pour les détails spécifiques de Dem Dikk
  demDikkDetails?: {
    lineNumber: string;
    lineName: string;
    zoneName: string;
    arrivalStation: string;

    departureStation: string;
    destinationStation: string;
    amount: string;
    ticketCount: string;
    validityDuration: string;
    code: string;
    status: string;
    expiresAt: string;
  } | null;
}

const HeaderComponent: React.FC<HeaderComponentProps> = ({
  onBack,
  onModifier,

  children,
  showJourneyDetails = false,
  showDetails = false,
  showDetail = false,
  showButton = true,
  showButtons = false,
  showHeader = false, // Par défaut, le header est affiché
  showHeaderpaiement = false,
  showHeaders = false,
  disableBackButton = false,
  departLieu = "Dakar Liberté VI",
  departHeure = "7:00",
  arriveeLieu = "Ziguinchor Quartier Hafia",
  price = 100,
  arriveeHeure = "22:00",
  placesRestantes = 14,
  operator = {
    name: "DemDikk",
    slogan: "Plus qu'un patrimoine",
    commissionPassenger: 5,
  },
  requestedSeats = "",
  departure,
  destination,
  date,
  userName,
  showGreetings = false,
  showOperator = false,
  brtDetails = null,
  terDetails = null,
  demDikkDetails = null,
}) => {
  console.log("🏢 HeaderComponent - Propriétés de l'opérateur:", {
    name: operator.name,
    logoUrl: operator.logoUrl,
    slogan: operator.slogan,
    transportType: operator.transportType
  });
  const { t } = useTranslation();
  const router = useRouter();
  const route = useRoute();

  // Extraction sécurisée des paramètres de route
  const routeParams = useLocalSearchParams() as any;


  const departureFromRoute = departure || routeParams.departure || routeParams.departureStation;
  const destinationFromRoute =
    destination ||
    routeParams.destination ||
    routeParams.arrivalStation ||
    routeParams.destinationStation;
  const ticketCount = routeParams.ticketCount || "2";
  const zoneFromRoute = routeParams.zoneName || "";
  const amountFromRoute = routeParams.amount || "0";

  const dateFromRoute = date || routeParams.date;
  const seatFromRoute = routeParams.seat || requestedSeats;
  const classeFromRoute = routeParams.classe;
  const Amount = routeParams.amount;

  let decodedExpiresAt = routeParams.validityDuration || decodeURIComponent(routeParams.ticketvalidity) || routeParams.ticketValidity;
  console.log("decodedExpiresAt", decodedExpiresAt);



  const lineNumberFromRoute = routeParams.lineNumber;
  const lineNameFromRoute = routeParams.lineName;
  const validityDurationFromRoute = routeParams.validityDuration;

  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const priceNum = Number(price) || 0;
  const seatsNum = parseInt(requestedSeats) || 1;

  // Calculer le montant total (requestedSeats * price)
  const amount = seatsNum * priceNum;

  // Calculer la commission et le total
  const commissionRate = operator.commissionPassenger || 5;
  const commissionAmount = Math.round((amount * commissionRate) / 100);
  const totalAmount = amount + commissionAmount;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Déterminer si c'est un BRT, TER ou Dem Dikk depuis les props de l'opérateur
  const isBRT = operator.name === "Bus Rapid Transit";
  const isTER = operator.name === "TER Senegal";
  const isDemDikk = operator.name === "Dem Dikk";
  console.log("isDemDikk", isDemDikk);

  const isUrbain = isBRT || isTER || isDemDikk;

  // Fonction pour formater la zone
  const formatZone = (zone: string) => {
    const decoded = decodeUrlParam(zone);

    switch (decoded) {
      case "DIFFERENT_ZONES":
        return "Tout parcours";
      case "SAME_ZONE":
        return "Même zone";
      default:
        return decoded || "Zone standard";
    }
  };

  // Traduire le type de classe pour TER
  const getClasseLabel = (classe: string | number | undefined) => {
    if (classe === 1 || classe === "1" || classe === "Classe_1") {
      return "Première classe";
    } else if (classe === 2 || classe === "2" || classe === "Classe_2") {
      return "Deuxième classe";
    }
    return classe ? `Classe ${classe}` : "Classe standard";
  };

  // Charger les données pour les trajets si nécessaire
  useEffect(() => {
    const fetchTrips = async () => {
      if (!departureFromRoute || !destinationFromRoute || !dateFromRoute || !seatFromRoute) {
        return; // Ne pas effectuer la recherche si les paramètres ne sont pas disponibles
      }

      try {
        setLoading(true);
        const result = await searchTickets(
          departureFromRoute,
          destinationFromRoute,
          dateFromRoute,
          parseInt(seatFromRoute)
        );

        if (result && result.data && Array.isArray(result.data)) {
          setTrips(result.data);
        } else {
          setError("Aucun trajet trouvé pour cette recherche");
        }
      } catch (err) {
        setError("Erreur lors de la recherche des trajets");
      } finally {
        setLoading(false);
      }
    };

    // Seulement effectuer la recherche si nous avons besoin des données de trajet
    if (showHeader && (showJourneyDetails || showDetails || showDetail)) {
      fetchTrips();
    }
  }, [
    departureFromRoute,
    destinationFromRoute,
    dateFromRoute,
    seatFromRoute,
    showHeader,
    showJourneyDetails,
    showDetails,
    showDetail,
  ]);

  const handleBack = () => {
    if (disableBackButton) {
      // Afficher une alerte si le bouton retour est désactivé
      Alert.alert(
        "Paiement en cours",
        "Le paiement est en cours. Vous ne pouvez pas revenir en arrière. Voulez-vous aller à l'accueil ?",
        [
          {
            text: "Annuler",
            style: "cancel",
          },
          {
            text: "Accueil",
            onPress: () => {
              router.replace("/(tabs)");
            },
          },
        ],
        { cancelable: false }
      );
      return;
    }

    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const handleModifier = () => {
    if (onModifier) {
      onModifier();
    } else {
      router.push("/pages/home/accueil");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options = { year: "numeric", month: "long", day: "numeric" };
    return date.toLocaleDateString("fr-FR", options as Intl.DateTimeFormatOptions);
  };

  // Formater l'heure pour l'affichage
  const formatTime = (dateString: string) => {
    if (!dateString) return "N/A";

    try {
      const decodedDate = decodeURIComponent(dateString);
      const date = new Date(decodedDate);

      return date.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Africa/Dakar",
      });
    } catch (error) {
      return "N/A";
    }
  };

  const isSameZone = (
    departureStationId: string,
    arrivalStationId: string,
    zones: any[]
  ): boolean => {
    for (const zone of zones) {
      const stationIds = zone.stations.map((station: any) => station.id);
      const hasDeparture = stationIds.includes(departureStationId);
      const hasArrival = stationIds.includes(arrivalStationId);

      // Si les deux stations sont dans la même zone
      if (hasDeparture && hasArrival) {
        return true;
      }
    }
    return false;
  };

  // Fonction pour obtenir le prix selon le type de zone
  const getBRTPrice = (
    departureStationId: string,
    arrivalStationId: string,
    zones: any[],
    tarifs: any[]
  ): number => {
    const sameZone = isSameZone(departureStationId, arrivalStationId, zones);

    if (sameZone) {
      // Chercher le tarif "Same_zone"
      const sameZoneTarif = tarifs.find((tarif) => tarif.nameTarif === "Same_zone");
      return sameZoneTarif ? sameZoneTarif.price : 400; // Prix par défaut
    } else {
      // Chercher le tarif "Different_zone"
      const differentZoneTarif = tarifs.find((tarif) => tarif.nameTarif === "Different_zone");
      return differentZoneTarif ? differentZoneTarif.price : 500; // Prix par défaut
    }
  };

  // Fonction pour obtenir le type de tarif
  const getTariffType = (
    departureStationId: string,
    arrivalStationId: string,
    zones: any[]
  ): string => {
    const sameZone = isSameZone(departureStationId, arrivalStationId, zones);
    return sameZone ? "Same_zone" : "Different_zone";
  };

  // Fonctions helper pour éviter les erreurs de rendu de texte
  const getPlacesText = (count: string | number): string => {
    const num = parseInt(String(count)) || 1;
    return num > 1 ? "places" : "place";
  };

  const getPassengersText = (count: string | number): string => {
    const num = parseInt(String(count)) || 1;
    return num > 1 ? "Passagers" : "Passager";
  };

  const getTransportTypeText = (): string => {
    if (isTER) return "Train Express Régional";
    if (isBRT) return "Bus Rapid Transit";
    return operator.transportType || "Transport";
  };

  // Fonctions helper pour les expressions ternaires dans les template strings
  const getSeatsInfo = (seats: string): string => {
    if (seats && seats !== "") {
      return ` | ${seats} ${getPlacesText(seats)}`;
    }
    return "";
  };

  const getSeatsInfoSimple = (seats: string): string => {
    if (seats && seats !== "") {
      return ` | ${seats} place(s)`;
    }
    return "";
  };

  const getRouteText = (): string => {
    return `${departureFromRoute || departure} > ${destinationFromRoute || destination}`;
  };

  const getDateText = (): string => {
    return dateFromRoute || date || "";
  };

  // Variables pour les styles conditionnels
  const headerPaddingTop = showGreetings ? "pt-2" : "pt-12";

  return (
    <KeyboardAvoidingView
      style={tw`flex-1`}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView contentContainerStyle={tw`flex-grow`} bounces={false}>
        <SafeAreaView style={tw`flex-1 bg-[#094741]`}>
          {/* En-tête avec salutations et opérateur (optionnel) */}
          {showGreetings && (
            <View style={tw`bg-[#094741] pt-12 px-4 pb-2`}>
              <Text style={tw`text-white text-lg font-bold`}>
                Bonjour, {userName || "Utilisateur"}
              </Text>
              {showOperator && (
                <View style={tw`flex-row items-center mt-2`}>
                  <Image
                    source={operator.logoUrl ? { uri: operator.logoUrl } : undefined}
                    style={tw`w-6 h-6 rounded-full mr-2`}
                    resizeMode="cover"
                  />
                  <Text style={tw`text-white text-sm`}>
                    {operator.name} - {operator.slogan}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Barre de navigation verte (optionnelle) */}
          {showHeader && (
            <View
              style={tw`bg-[#094741] px-4 ${headerPaddingTop} pb-1 flex-row h-30 justify-between items-center`}
            >
              <View style={tw`flex-row items-center`}>
                {showButton && (
                  <TouchableOpacity onPress={handleBack} style={tw`mr-2`}>
                    <Ionicons name="chevron-back" size={24} color="white" />
                  </TouchableOpacity>
                )}
                {trips && trips.length > 0 ? (
                  <View>
                    <View style={tw`flex-row items-center`}>
                      <Text style={tw`text-white font-bold text-lg`}>{trips[0].departure}</Text>
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color="white"
                        style={tw`mx-2 mt-1`}
                      />
                      <Text style={tw`text-white font-bold text-lg`}>{trips[0].destination}</Text>
                    </View>
                    <Text style={tw`text-white text-xs`}>
                      {formatDate(trips[0].departureTime)}
                      {getSeatsInfo(requestedSeats)}
                    </Text>
                  </View>
                ) : (
                  <View>
                    <Text style={tw`text-white font-bold text-lg`}>{getRouteText()}</Text>
                    {/* N'affichez que la date ici */}
                    <Text style={tw`text-white text-xs`}>{getDateText()}</Text>
                  </View>
                )}
              </View>

              {showButton && (
                <TouchableOpacity
                  onPress={handleModifier}
                  style={tw`border border-white rounded-md px-7 py-1`}
                >
                  <Text style={tw`text-white`}>Modifier</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Barre de navigation pour le paiement */}
          {showHeaderpaiement && (
            <View
              style={tw`bg-[#094741] px-4 ${headerPaddingTop} pb-1 flex-row h-30 justify-between items-center`}
            >
              <View style={tw`flex-row items-center`}>
                {showButton && (
                  <TouchableOpacity onPress={handleBack} style={tw`mr-2`}>
                    <Ionicons name="chevron-back" size={24} color="white" />
                  </TouchableOpacity>
                )}
                {trips && trips.length > 0 ? (
                  <View>
                    <Text style={tw`text-white text-xs`}>
                      {formatDate(trips[0].departureTime)}
                      {getSeatsInfo(requestedSeats)}
                    </Text>
                  </View>
                ) : (
                  <View style={tw`flex-row `}>
                    <TouchableOpacity onPress={handleBack} style={tw`mr-2`}>
                      <Ionicons name="chevron-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text style={tw`text-white text-xs mt-1`}>
                      {getDateText()}
                      {getSeatsInfoSimple(requestedSeats)}
                    </Text>
                  </View>
                )}
              </View>

              {showButton && (
                <TouchableOpacity
                  onPress={handleModifier}
                  style={tw`border border-white rounded-md px-7 py-1`}
                >
                  <Text style={tw`text-white`}>Modifier</Text>
                </TouchableOpacity>
              )}

              {showButtons && (
                <TouchableOpacity
                  onPress={handleBack}
                  style={tw`border border-white rounded-md px-7 py-1`}
                >
                  <Text style={tw`text-white`}>Modifier</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Autre barre de navigation */}
          {showHeaders && (
            <View
              style={tw`bg-[#094741] px-4 ${headerPaddingTop} pb-1 flex-row h-30 justify-between items-center`}
            >
              <View style={tw`flex-row items-center`}>
                {showButton && (
                  <TouchableOpacity onPress={handleBack} style={tw`mr-2`}>
                    <Ionicons name="chevron-back" size={24} color="white" />
                  </TouchableOpacity>
                )}
                {trips && trips.length > 0 ? (
                  <View>
                    <View style={tw`flex-row items-center`}>
                      <Text style={tw`text-white font-bold text-lg`}>{trips[0].departure}</Text>
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color="white"
                        style={tw`mx-2 mt-1`}
                      />
                      <Text style={tw`text-white font-bold text-lg`}>{trips[0].destination}</Text>
                    </View>
                    <Text style={tw`text-white text-xs`}>
                      {formatDate(trips[0].departureTime)}
                      {getSeatsInfo(requestedSeats)}
                    </Text>
                  </View>
                ) : (
                  <View>
                    <Text style={tw`text-white font-bold text-lg`}>{getRouteText()}</Text>
                    {/* N'affichez que la date ici */}
                    <Text style={tw`text-white text-xs`}>{getDateText()}</Text>
                  </View>
                )}
              </View>

              {showButton && (
                <TouchableOpacity
                  onPress={handleModifier}
                  style={tw`border border-white rounded-md px-7 py-1`}
                >
                  <Text style={tw`text-white`}>Modifier</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {showJourneyDetails && (
            <View style={tw`bg-white mx-4 my-3 p-4 rounded-2xl shadow-lg`}>
              {/* En-tête avec logo et nom de l'opérateur */}
              <View style={tw`flex-row items-center mb-6`}>
                <Image
                  source={operator.logoUrl ? { uri: operator.logoUrl } : undefined}
                  style={tw`w-12 h-12 rounded-xl mr-3`}
                  resizeMode="cover"
                  onError={(error) => console.log("❌ Erreur chargement logo:", error)}
                  onLoad={() => console.log("✅ Logo chargé avec succès:", operator.logoUrl)}
                />
                <View>
                  <Text style={tw`font-bold text-base text-gray-900`}>{operator.name}</Text>
                  <View style={tw`flex-row items-center`}>
                    <Ionicons
                      name={
                        operator.transportType === "Bus"
                          ? "bus"
                          : operator.transportType === "Avion"
                            ? "airplane"
                            : operator.transportType === "Bateau"
                              ? "boat"
                              : "train"
                      }
                      size={16}
                      color="#6B7280"
                      style={tw`mr-1`}
                    />
                    <Text style={tw`text-gray-500 text-sm`}>{operator.transportType}</Text>
                  </View>
                </View>
              </View>

              {/* Informations complémentaires */}
              <View style={tw`flex-row items-center justify-between mb-6`}>
                <View style={tw`items-center`}>
                  <MaterialIcons name="event-seat" size={24} color="#094741" />
                  <Text style={tw`text-xs text-gray-500 mt-1`}>Places</Text>
                  <Text style={tw`text-base font-bold text-gray-900`}>{placesRestantes}</Text>
                </View>

                <View style={tw`items-center`}>
                  <MaterialIcons name="group" size={24} color="#094741" />
                  <Text style={tw`text-xs text-gray-500 mt-1`}>Réservées</Text>
                  <Text style={tw`text-base font-bold text-gray-900`}>{requestedSeats}</Text>
                </View>

                <View style={tw`items-center`}>
                  <MaterialIcons name="payments" size={24} color="#094741" />
                  <Text style={tw`text-xs text-gray-500 mt-1`}>Prix/pers.</Text>
                  <Text style={tw`text-base font-bold text-gray-900`}>{price} XOF</Text>
                </View>
              </View>

              {/* Total */}
              <View style={tw`bg-teal-50 rounded-xl p-4`}>
                <View style={tw`flex-row justify-between items-center`}>
                  <Text style={tw`text-base text-gray-700`}>Total à payer</Text>
                  <View style={tw`items-end`}>
                    <Text style={tw`text-xl font-bold text-teal-800`}>{amount} XOF</Text>
                    <Text style={tw`text-xs text-gray-500`}>
                      pour {requestedSeats} {getPlacesText(requestedSeats)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {showDetails && (
            <View style={tw`bg-white mx-4 my-3 p-2 rounded-lg shadow-md`}>
              <View style={tw`flex-row items-center mb-1`}>
                <Image
                  source={operator.logoUrl ? { uri: operator.logoUrl } : undefined}
                  style={tw`w-12 h-12 mr-2`}
                  resizeMode="contain"
                />
                <View>
                  <Text style={tw`font-bold text-lg`}>{operator.name}</Text>
                  <View style={tw`flex-row items-center`}>
                    <Ionicons
                      name={
                        operator.transportType === "BUS"
                          ? "bus"
                          : operator.transportType === "Avion"
                            ? "airplane"
                            : operator.transportType === "Bateau"
                              ? "boat"
                              : "train"
                      }
                      size={16}
                      color="#6B7280"
                      style={tw`mr-1`}
                    />
                    <Text style={tw`text-gray-500 text-sm`}>{operator.transportType}</Text>
                  </View>
                </View>
              </View>
              <View style={tw`bg-white rounded-lg p-4 mb-0`}>
                <View style={tw`flex-row items-center justify-between mb-4`}>
                  <View style={tw`flex-row items-center`}>
                    <View style={tw`bg-teal-50 rounded-full p-2 mr-3`}>
                      <Ionicons name="person-outline" size={20} color="#065f46" />
                    </View>
                    <Text style={tw`text-lg font-semibold text-gray-900`}>
                      {requestedSeats} {getPassengersText(requestedSeats)}
                    </Text>
                  </View>
                </View>

                <View style={tw`space-y-3`}>
                  <View style={tw`flex-row justify-between items-center`}>
                    <Text style={tw`text-gray-500`}>Prix des billets ({requestedSeats})</Text>
                    <Text style={tw`text-gray-900`}>{amount} XOF</Text>
                  </View>

                  <View style={tw`flex-row justify-between items-center`}>
                    <View style={tw`flex-row items-center`}>
                      <Text style={tw`text-gray-500`}>Frais de service</Text>
                      <Text style={tw`text-xs text-gray-400 ml-1`}>({commissionRate}%)</Text>
                    </View>
                    <Text style={tw`text-gray-900`}>{commissionAmount} XOF</Text>
                  </View>

                  <View
                    style={tw`flex-row justify-between items-center pt-3 border-t border-gray-100`}
                  >
                    <Text style={tw`text-gray-900 font-medium`}>Total</Text>
                    <Text style={tw`text-lg font-bold text-teal-800`}>{totalAmount} XOF</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Section des détails pour BRT/TER - VERSION AMÉLIORÉE */}
          {showDetail && (
            <View style={tw`mb-4 bg-white rounded-2xl shadow-sm p-1`}>
              <View style={tw`flex-row items-center `}>
                <Image
                  source={operator.logoUrl ? { uri: operator.logoUrl } : undefined}
                  style={tw`w-14 h-14 rounded-xl mr-3`}
                  resizeMode="contain"
                />
                <View style={tw`flex-1`}>
                  <Text style={tw`font-bold text-xl text-gray-900 mb-1`}>{operator.name}</Text>
                  <View style={tw`flex-row items-center`}>
                    <View style={tw`bg-teal-50 rounded-full px-3 py-1 flex-row items-center`}>
                      <Ionicons
                        name={isTER ? "train" : isBRT ? "subway" : "bus"}
                        size={16}
                        color="#6B7280"
                        style={tw`mr-1`}
                      />
                      <Text style={tw`text-teal-600 text-sm font-medium`}>
                        {getTransportTypeText()}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              {isBRT && (
                <View style={tw`bg-white rounded-2xl shadow-sm p-5`}>
                  <View style={tw`mb-2`}>
                    <View style={tw`flex-row justify-between items-center`}>
                      <Text style={tw`text-base font-medium text-gray-600`}>
                        {brtDetails?.zoneName || routeParams.zoneName || zoneFromRoute || "Zone"}
                      </Text>
                      <View style={tw`flex-row items-center`}>
                        <Ionicons name="time-outline" size={16} color="#6B7280" style={tw`mr-1`} />
                        <Text style={tw`text-sm font-medium text-gray-800`}>
                          Valide pendant {routeParams.ticketValidity}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Infos trajet */}
                  <View style={tw`bg-gray-50 p-4 rounded-xl`}>
                    <View style={tw`flex-row items-center justify-between`}>
                      <View style={tw`flex-1`}>
                        <View style={tw`flex-row items-center mb-4`}>
                          <View style={tw`bg-teal-100 rounded-full p-2 mr-3`}>
                            <MaterialIcons name="my-location" size={20} color="#0D9488" />
                          </View>
                          <View>
                            <Text style={tw`text-xs text-gray-500 mb-1`}>Départ</Text>
                            <Text style={tw`text-base font-semibold text-gray-900`}>
                              {brtDetails?.departureStation || departureFromRoute}
                            </Text>
                          </View>
                        </View>

                        <View style={tw`flex-row items-center`}>
                          <View style={tw`bg-teal-100 rounded-full p-2 mr-3`}>
                            <MaterialIcons name="location-pin" size={20} color="#0D9488" />
                          </View>
                          <View>
                            <Text style={tw`text-xs text-gray-500 mb-1`}>Arrivée</Text>
                            <Text style={tw`text-base font-semibold text-gray-900`}>
                              {brtDetails?.arrivalStation || destinationFromRoute || "Diamniadio"}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={tw`items-end ml-4`}>
                        <Text style={tw`text-xs text-gray-500 mb-1`}>Prix total</Text>
                        <Text style={tw`text-xl font-bold text-teal-700`}>
                          {/* Calcul du prix selon le type de zone */}
                          {(() => {
                            // Récupérer les données des zones et tarifs depuis votre API ou état global
                            const zones = []; // À remplacer par vos données de zones
                            const tarifs = []; // À remplacer par vos données de tarifs

                            // Si vous avez les IDs des stations
                            if (brtDetails?.departureStationId && brtDetails?.arrivalStationId) {
                              return getBRTPrice(
                                brtDetails.departureStationId,
                                brtDetails.arrivalStationId,
                                zones,
                                tarifs
                              );
                            }

                            // Sinon, utiliser le montant existant ou valeur par défaut
                            return brtDetails?.amount;
                          })()}{" "}
                          XOF
                        </Text>

                        {/* Affichage du type de tarif */}
                        <Text style={tw`text-xs text-gray-500 mt-1`}>
                          {(() => {
                            const zones = []; // À remplacer par vos données
                            if (brtDetails?.departureStationId && brtDetails?.arrivalStationId) {
                              const tariffType = getTariffType(
                                brtDetails.departureStationId,
                                brtDetails.arrivalStationId,
                                zones
                              );
                              return tariffType === "Same_zone" ? "Même zone" : "Zones différentes";
                            }
                            return "Tarif standard";
                          })()}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* Détails spécifiques au TER */}
              {isTER && (
                <View style={tw`space-y-4`}>
                  {/* Infos trajet */}
                  <View style={tw`bg-gray-50 p-3 rounded-lg`}>
                    <View style={tw`flex-row justify-between items-center mb-3`}>
                      <View style={tw`flex-1`}>
                        <Text style={tw`text-xs text-gray-500`}>Départ</Text>
                        <Text style={tw`text-base font-bold text-gray-900`}>
                          {formatStationName(
                            terDetails?.departureStation || departureFromRoute || "Dakar"
                          )}
                        </Text>
                      </View>

                      <View style={tw`flex-row items-center px-2`}>
                        <View style={tw`h-0.5 w-16 bg-teal-500`}></View>
                        <View style={tw`h-3 w-3 rounded-full bg-[#094741]`}></View>
                      </View>

                      <View style={tw`flex-1 items-end`}>
                        <Text style={tw`text-xs text-gray-500`}>Destination</Text>
                        <Text style={tw`text-base font-bold text-gray-900`}>
                          {formatStationName(
                            terDetails?.destinationStation || destinationFromRoute || "Diamniadio"
                          )}
                        </Text>
                      </View>
                    </View>

                    {/* Zone et Validité */}
                    <View style={tw`flex-row justify-between items-center mt-1`}>
                      <View>
                        <Text style={tw`text-xs text-gray-500`}>Zone</Text>
                        <Text style={tw`text-sm font-medium text-gray-800`}>
                          {formatZone(terDetails?.zone || zoneFromRoute || "Tout parcours")}
                        </Text>
                      </View>

                      <View style={tw`items-end`}>
                        <Text style={tw`text-xs text-gray-500`}>Expiration</Text>
                        <Text style={tw`text-sm font-medium text-gray-800`}>
                          Valide pendant {decodedExpiresAt}
                        </Text>
                      </View>

                      <View style={tw`items-end`}>
                        <Text style={tw`text-xs text-gray-500`}>Nb Tickets</Text>
                        <Text
                          style={tw`text-sm bg-teal-50 p-2 rounded-sm font-medium text-gray-800`}
                        >
                          {terDetails?.ticketCount || ticketCount}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Classe et Prix */}
                  <View style={tw`flex-row justify-between items-center`}>
                    <View style={tw`bg-teal-50 p-3 rounded-lg flex-1 mr-2`}>
                      <Text style={tw`text-xs text-gray-500`}>Classe</Text>
                      <Text style={tw`text-base font-bold text-teal-700`}>
                        {getClasseLabel(terDetails?.classe || classeFromRoute || "Classe_1")}
                      </Text>
                    </View>

                    <View style={tw`bg-teal-50 p-3 rounded-lg flex-1`}>
                      <Text style={tw`text-xs text-gray-500`}>Prix</Text>
                      <Text style={tw`text-base font-bold text-teal-700`}>
                        {terDetails?.amount || Amount || ""} XOF
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {isDemDikk && (
                <View style={tw` bg-white rounded-2xl shadow-sm p-5`}>
                  <View style={tw`mb-2`}>
                    <View style={tw`  `}>
                      <Text style={tw`text-base font-medium text-gray-600`}>
                        TICKET - {demDikkDetails?.zoneName || zoneFromRoute}
                      </Text>
                    </View>
                  </View>
                  {/* Infos trajet */}
                  <View style={tw`bg-gray-50 p-4 rounded-xl`}>
                    <View style={tw`flex-row items-center justify-between `}>
                      <View style={tw`flex-1`}>
                        <View style={tw`flex-row items-center mb-4`}>
                          <View style={tw`bg-teal-100 rounded-full p-2 mr-3`}>
                            <MaterialIcons name="my-location" size={20} color="#0D9488" />
                          </View>
                          <View>
                            <Text style={tw`text-xs text-gray-500 mb-1`}>Départ</Text>
                            <Text style={tw`text-base font-semibold text-gray-900`}>
                              {demDikkDetails?.departureStation || departureFromRoute}
                            </Text>
                          </View>
                        </View>

                        <View style={tw`flex-row items-center`}>
                          <View style={tw`bg-teal-100 rounded-full p-2 mr-3`}>
                            <MaterialIcons name="location-pin" size={20} color="#0D9488" />
                          </View>
                          <View>
                            <Text style={tw`text-xs text-gray-500 mb-1`}>Arrivée</Text>
                            <Text style={tw`text-base font-semibold text-gray-900`}>
                              {demDikkDetails?.arrivalStation || destinationFromRoute || "Diamniadio"}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={tw`items-end ml-4`}>
                        <Text style={tw`text-xs text-gray-500 mb-1`}>Prix total</Text>
                        <Text style={tw`text-xl font-bold text-teal-700`}>
                          {demDikkDetails?.amount || Amount} XOF
                        </Text>
                      </View>
                    </View>

                    {/* Zone et Validité */}
                  </View>
                  <View style={tw`flex-row  ml-1`}>
                    <Ionicons name="time-outline" size={19} color="#6B7280" style={tw`mr-1`} />
                    <Text style={tw`text-sm font-medium text-gray-800`}>
                      Valide pendant {(decodedExpiresAt)} aprés  Activation
                    </Text>
                  </View>
                  {/* Classe et Prix */}
                </View>
              )}
            </View>
          )}

          {children}
        </SafeAreaView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default HeaderComponent;
