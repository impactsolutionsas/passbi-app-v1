import { Image, Text, View } from "react-native";
import { Booking, formatClasseType, getStatusColor, getStatusText, getRealTicketStatus } from "../mestickets";
import tw from "@/tailwind";
import { Ionicons } from "@expo/vector-icons";

// Composant pour le contenu d'un ticket
const TicketContent = ({ item, hideStatus = false }: { item: Booking, hideStatus?: boolean }) => {
  const isUrbanTicket =
    item.zoneType === "SAME_ZONE" ||
    item.zoneType === "DIFFERENT_ZONES" ||
    item.zoneType === "TOUT_ZONE";
  const departureText = isUrbanTicket
    ? item.departureStation || item.ticket?.departureStation || item.trip?.departure
    : item.trip?.departure;
  const destinationText = isUrbanTicket
    ? item.arrivalStation || item.ticket?.arrivalStation || item.trip?.destination
    : item.trip?.destination;
  const price = item.payment.amount;
  const prices = item.trip?.price;
  const departureTime = item.trip?.arrivalTime || item.bookingDate || "Date non disponible";
  const departureTimes = item.trip?.departureTime || "Date non disponible";
  
  const searchDate = item.ticket?.searchDate || "Date non disponible";
  

  const departureZone = item.ticket?.departurezone;
  const arrivalZone = item.ticket?.arrivalzone;
  const matriculeVehicle = item.ticket?.matriculeVehicle;
  
  const seat = item.seatNumber;

const operatorNameText =
    item.operatorName ||
    item.operator?.name ||
    item.trip?.operator?.name ||
    item.ticket?.operatorName ||
    "Opérateur inconnu";
  const operatorLogo =
    item.operatorLogo ||
    item.operator?.logoUrl ||
    item.trip?.operator?.logoUrl ||
    item.ticket?.operatorLogo;
  
  const classType = item.ticket?.ticketCount?.classeType;
  const isInterZones = item.isInterZones;
  
  const formattedClassType = formatClasseType(classType);
  const isDemDikk = operatorNameText.toLowerCase().includes("dem dikk");

  const zoneText = isDemDikk
    ? departureZone || item.zoneType // Seulement departureZone pour Dem Dikk
    : departureZone && arrivalZone
      ? `${departureZone} → ${arrivalZone}`
      : departureZone || arrivalZone || item.zoneType;

  const ticketNumberText = item.ticket?.Number || item.ticket?.code || "N/A";
  const dateText = item.trip?.departureTime || item.bookingDate || "Date non disponible";

  // CORRECTION: Récupération du nom du passager avec plus de robustesse
  const passengerName =
    item.passengers && item.passengers.length > 0 ? item.passengers[0].name : null;

  // Vérifier si l'opérateur est TER
  const isTER = operatorNameText.toLowerCase().includes("ter");

  // CORRECTION PRINCIPALE: Utiliser getRealTicketStatus qui donne maintenant la priorité à isTicketExpired
  const realStatus = getRealTicketStatus(item);
  const statusText = getStatusText(item);
  const statusColor = getStatusColor(item);

  // CORRECTION: Nouvelle logique pour afficher le statut
  // Afficher le statut uniquement si:
  // 1. hideStatus n'est pas true
  // 2. Il y a un texte de statut
  // 3. Le statut n'est pas "Valide" (on cache le statut "Valide" pour les tickets normaux)
  const shouldShowStatus = !hideStatus && statusText && statusText !== "Valide";

  return (
    <View style={tw`p-4`}>
      {/* En-tête du ticket */}
      <View style={tw`flex-row justify-between items-start mb-4`}>
        <View>
          {operatorLogo ? (
            <Image
              source={{ uri: operatorLogo }}
              style={tw`w-10 h-10 rounded-lg`}
              resizeMode="cover"
              onError={() => console.log("Erreur de chargement de l'image operator logo")}
            />
          ) : (
            <View style={tw`w-10 h-10 rounded-lg bg-gray-200 items-center justify-center`}>
              <Ionicons name="business-outline" size={20} color="#6B7280" />
            </View>
          )}
        </View>
        <View style={tw`flex-1 ml-3`}>
          <Text style={tw`text-lg font-bold text-gray-900`}>{operatorNameText}</Text>

          {/* CORRECTION: Affichage du nom du passager pour TOUS les types de tickets */}
          {passengerName && (
            <Text style={tw`text-sm text-gray-600`}>Passager: {passengerName}</Text>
          )}

          {/* Affichage des zones pour les tickets urbains */}
          {item.zoneType && <Text style={tw`text-sm text-gray-600`}>{zoneText}</Text>}

          {/* Affichage du classeType SEULEMENT pour TER */}
          {isTER && formattedClassType && (
            <View style={tw`flex-row items-center mt-1`}>
              <Ionicons name="layers-outline" size={14} color="#6B7280" />
              <Text style={tw`text-sm text-gray-600 ml-1`}>{formattedClassType}</Text>
            </View>
          )}

          {/* AJOUT: Affichage du numéro de siège pour les tickets interurbains */}
          {!isUrbanTicket && seat && (
            <View style={tw`flex-row items-center mt-1`}>
              <Ionicons name="car-outline" size={14} color="#6B7280" />
              <Text style={tw`text-sm text-gray-600 ml-1`}>Siège: {seat}</Text>
            </View>
          )}
        </View>
        
        {/* CORRECTION: Nouvelle condition pour afficher le statut */}
        {shouldShowStatus && (
          <View style={tw`rounded-full px-3 py-1 ${statusColor}`}>
            <Text style={tw`text-xs font-medium`}>{statusText}</Text>
          </View>
        )}
      </View>

      {/* Trajet */}
      <View style={tw`flex-row items-center mb-4`}>
        <View style={tw`flex-1`}>
          <Text style={tw`text-sm text-gray-500`}>Départ</Text>
          <Text style={tw`text-base font-semibold text-gray-900`}>{departureText || "Dakar"}</Text>
        </View>

        <View style={tw`mx-4`}>
          <Ionicons name="arrow-forward" size={20} color="#9CA3AF" />
        </View>

        <View style={tw`flex-1`}>
          <Text style={tw`text-sm text-gray-500`}>Destination</Text>
          <Text style={tw`text-base font-semibold text-gray-900`}>
            {destinationText || "Diamniadio"}
          </Text>
        </View>
      </View>

      {/* Détails */}
      <View style={tw`flex-row justify-between items-center pt-3 border-t border-gray-100`}></View>
      {isUrbanTicket && (
        <View style={tw`flex-row justify-between items-center pt-2`}>
          {ticketNumberText && ticketNumberText !== "N/A" && (
            <View style={tw`flex-row items-center`}>
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
              <Text style={tw`ml-1 text-sm text-gray-600`}>
                {dateText && dateText !== "Date non disponible"
                  ? new Date(dateText).toLocaleDateString("fr-FR")
                  : "Date non disponible"}{" "}
                {departureTime &&
                  ` à ${new Date(departureTime).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`}
              </Text>
            </View>
          )}

          <View style={tw`flex-row items-center`}>
            <Text style={tw`text-sm text-gray-500`}>
              {price ? `${price} FCFA` : "Prix non spécifié"}
            </Text>
          </View>
        </View>
      )}

      {/* AJOUT: Informations supplémentaires pour les tickets interurbains */}
      {!isUrbanTicket && (
        <View style={tw`flex-row justify-between items-center pt-2`}>
          {ticketNumberText && ticketNumberText !== "N/A" && (
            <View style={tw`flex-row items-center`}>
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
              <Text style={tw`ml-1 text-sm text-gray-600`}>
                {searchDate && searchDate !== "Date non disponible"
                  ? new Date(searchDate).toLocaleDateString("fr-FR")
                  : "Date non disponible"}{" "}
                {departureTimes &&
                  ` à ${new Date(departureTimes).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`}
              </Text>
            </View>
          )}
          <View style={tw`flex-row items-center`}>
            <Text style={tw`text-sm text-gray-500`}>
              {prices ? `${prices} FCFA` : "Prix non spécifié"}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default TicketContent;