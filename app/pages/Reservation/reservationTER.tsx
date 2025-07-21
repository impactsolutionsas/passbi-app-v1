import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Modal, ActivityIndicator, FlatList } from 'react-native';
import HeaderComponent from '../../../constants/headerpage/HeaderComponent';
import tw from '../../../tailwind';
import DynamicCarousel from '../../../components/Carrousel';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import { useOperators, OperatorProvider } from '../../../constants/contexte/OperatorContext';
import { useRoute } from '@react-navigation/native';

type RouteParams = {
  departureStationId: string;
  arrivalStationId: string;
  date: string;
  seat: string;
  totalAvailableSeats: string;
  departureTime: string;
  price: number;
  operatorId: string;
  temporaryReservationId: string;
  operatorName?: string;
  operatorLogoUrl?: string;
  operatorSlogan?: string;
};

interface Station {
  id: string;
  name: string;
  zoneName?: string;
  zoneId?: string;
}

interface Zone {
  id: string;
  name: string;
  stations: Station[];
}

interface Operator {
  id: string;
  name: string;
  logoUrl: string;
  isUrbainStatus: string | boolean;
  ticketValidity: string;
}

interface SelectedStation {
  zoneId: string;
  zoneName: string;
  stationId: string;
  stationName: string;
}

const brtOperator = {
  name: "TER",
  slogan: "TER sénégal",
  transportType: "Train"
};

interface OperatorData {
  operator: Operator;
  zones: Zone[];
  lines?: [{
    departure: string;
    destination: string;
    id?: string;
    name?: string;
    tarifs?: any[];
  }];
}

function ReservationScreens() {
  const route = useRoute();

  const [depart, setDepart] = useState('Sélectionner une station de départ');
  const [price, setPrice] = useState('');
  const [destination, setDestination] = useState('Sélectionner une station d\'arrivée');
  const [date, setDate] = useState('29 Jan 2025');
  const [ticketCount, setTicketCount] = useState<number>(1);
  const [classeType, setClasseType] = useState('Classe_1');
  const [departStations, setDepartStations] = useState<Station[]>([]);
  const [arrivalStations, setArrivalStations] = useState<Station[]>([]);
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [showTicketPicker, setShowTicketPicker] = useState(false);
  const [showDepartPicker, setShowDepartPicker] = useState(false);
  const [showArrivalPicker, setShowArrivalPicker] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [operator, setOperator] = useState<Operator | null>(null);
  console.log(operator);
  const [operatorZones, setOperatorZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  
  const { 
    operators, 
    selectedOperator, 
    setSelectedOperator: setContextOperator, 
    loading: operatorsLoading, 
    error: operatorsError,
    refreshOperators 
  } = useOperators();
  
  const [operatorData, setOperatorData] = useState<OperatorData | null>(null);
  console.log(operatorData);
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [departureStation, setDepartureStation] = useState<SelectedStation | null>(null);
  const [arrivalStation, setArrivalStation] = useState<SelectedStation | null>(null);
  const [autoRoute, setAutoRoute] = useState('Trajet complet');
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(true);

  const {
    departureStationId = "",
    arrivalStationId = "",
    seat = "",
    totalAvailableSeats = "0",
    departureTime = "",
    operatorId = "",
    temporaryReservationId = "",
    operatorName = "Opérateur",
    operatorLogoUrl = "",
    operatorSlogan = "" 
  } = (route.params as RouteParams) || {};

  // Utiliser le contexte des opérateurs
  const operatorsContext = useOperators();

  // Vérifier si fetchOperators existe dans le contexte
  const fetchOperators = (operatorsContext as any)?.fetchOperators;

  const frequentDestinations = [
    {
      id: '1',
      departure: 'Zone 1 - Station A',
      arrival: 'Zone 2 - Station B',
      lastUsed: 'Il y a 2 jours',
      price: 500
    },
    {
      id: '2',
      departure: 'Zone 3 - Station C',
      arrival: 'Zone 4 - Station D',
      lastUsed: 'Il y a 5 jours',
      price: 700
    },
    {
      id: '3',
      departure: 'Zone 2 - Station E',
      arrival: 'Zone 5 - Station F',
      lastUsed: 'Il y a 1 semaine',
      price: 600
    }
  ];

  const router = useRouter();
  const userName = "Rama Seck";

  // Fonction corrigée pour charger les données
  const fetchOperatorData = async () => {
    try {
      setIsBackgroundLoading(true);
      
      // 1. Attendre que les opérateurs soient chargés
      if (operators.length === 0) {
        console.log("En attente du chargement des opérateurs...");
        return;
      }

      // 2. Sélectionner l'opérateur approprié
      const targetOperator = operatorId 
        ? operators.find(op => op.operator?.id === operatorId)
        : operators.find(op => op.operator && (op.operator.name.toLowerCase().includes('TER') || op.operator.name.toLowerCase().includes('TER sénégal')));

      if (!targetOperator) {
        throw new Error("Opérateur non trouvé");
      }

      // 3. Configurer l'opérateur et ses zones
      setOperator(targetOperator.operator);
      setOperatorZones(targetOperator.zones);
      setOperatorData(targetOperator);
      
      console.log("Opérateur configuré:", targetOperator.operator.name);
      console.log("Zones disponibles:", targetOperator.zones.length);

      // 4. Extraire toutes les stations de toutes les zones
      const allStations = targetOperator.zones.flatMap(zone => 
        zone.stations.map(station => ({
          ...station,
          zoneName: zone.name,
          zoneId: zone.id
        }))
      );

      console.log("Stations extraites:", allStations.length);

      // 5. Configurer les stations pour départ et arrivée
      setDepartStations(allStations);
      setArrivalStations(allStations);

      // 6. Si on a des paramètres de route, pré-sélectionner les stations
      if (departureStationId && arrivalStationId) {
        const departureStation = allStations.find(s => s.id === departureStationId);
        const arrivalStation = allStations.find(s => s.id === arrivalStationId);
        
        if (departureStation) {
          setDepart(departureStation.name);
          setDepartureStation({
            zoneId: departureStation.zoneId,
            zoneName: departureStation.zoneName,
            stationId: departureStation.id,
            stationName: departureStation.name
          });
        }
        
        if (arrivalStation) {
          setDestination(arrivalStation.name);
          setArrivalStation({
            zoneId: arrivalStation.zoneId,
            zoneName: arrivalStation.zoneName,
            stationId: arrivalStation.id,
            stationName: arrivalStation.name
          });
        }
      }

      // 7. Marquer les données comme chargées
      setIsDataLoaded(true);
      setErrorMessage(null);
      
      console.log("Données chargées avec succès");

    } catch (error) {
      console.error("Erreur lors de la récupération des données:", error);
      setErrorMessage(`Erreur de chargement: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      setIsDataLoaded(false);
    } finally {
      setIsBackgroundLoading(false);
    }
  };

  // Chargement en arrière-plan des données de l'opérateur et des stations
  useEffect(() => {
    // Seulement si les opérateurs sont chargés et qu'on n'a pas encore de données
    if (operators.length > 0 && !isDataLoaded) {
      fetchOperatorData();
    }
  }, [operators, operatorId, isDataLoaded]);

  // Debug : Ajout pour vérifier l'état
  useEffect(() => {
    console.log("État actuel:", {
      operatorsCount: operators.length,
      operatorsLoading,
      isDataLoaded,
      departStationsCount: departStations.length,
      operator: operator?.name,
      zonesCount: operatorZones.length
    });
  }, [operators, operatorsLoading, isDataLoaded, departStations, operator, operatorZones]);

  // Effet pour traiter les données des opérateurs quand elles sont chargées
  // Sélectionner l'opérateur DEM DIKK au démarrage
  useEffect(() => {
    const findOperatorById = (targetId?: string) => {
      // Utiliser l'ID passé en paramètre ou prendre le premier
      const operatorData = targetId 
        ? operators.find(op => op.operator && op.operator.id === targetId)
        : operators.find(op => op.operator && (op.operator.name.toLowerCase().includes('TER') || op.operator.name.toLowerCase().includes('TER sénégal')));

      
      if (operatorData) {
        setOperator(operatorData.operator);
        console.log("Opérateur sélectionné:", operatorData.operator.name);
        setContextOperator(operatorData.operator);
        setOperatorZones(operatorData.zones);
        setSelectedZone(null);
      }
    };
  
    if (operators.length > 0) {
      // Utiliser l'operatorId des paramètres de route s'il existe
      findOperatorById(operatorId || undefined);
    }
  }, [operators, operatorId]);
  
  // Fonction de rechargement des données corrigée
  const handleRetry = async () => {
    setErrorMessage(null);
    setIsDataLoaded(false);
    
    if (refreshOperators && typeof refreshOperators === 'function') {
      try {
        await refreshOperators();
        // fetchOperatorData sera appelé automatiquement via le useEffect
      } catch (error) {
        console.error("Erreur lors du rechargement:", error);
        setErrorMessage(`Erreur de rechargement: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }
    } else {
      // Réessayer directement avec les données existantes
      await fetchOperatorData();
    }
  };
     const departclass1 = operatorData?.lines?.[0]?.departure || 'Station de départ';
const arriveclass1 = operatorData?.lines?.[0]?.destination || 'Station d\'arrivée';
const lineName = operatorData?.lines?.[0]?.name || 'Ligne TER';


// Fonction pour calculer le prix basé sur les zones et la classe
// Fonction pour calculer le prix basé sur les zones et la classe
const calculateTerPrice = (
  departureStation,
  arrivalStation,
  classeType,
  operatorData,
  allStations
) => {
  try {
    // Récupérer les tarifs depuis les données de l'opérateur
    const tarifs = operatorData?.lines?.[0]?.tarifs || [];
 
    // Debug safe - vérifier si les tarifs existent
    if (tarifs.length === 0) {
      console.warn('Aucun tarif trouvé, utilisation du prix par défaut');
      return classeType === 'Classe_1';
    }
    
    // Trouver le tarif correspondant à la classe sélectionnée
    let selectedTarif;
    if (classeType === 'Classe_1') {
      // Chercher le tarif pour classe_1 avec plusieurs variantes
      selectedTarif = tarifs.find(t => {
        const name = t.nameTarif?.toLowerCase() || '';
        return name === 'classe_1' || 
               name === '1ere_classe' || 
               name === 'classe1' ||
               name.includes('classe_1') ||
               name.includes('1ere');
      });
    } else if (classeType === 'Classe_2') {
      // Chercher le tarif pour Classe_2 avec plusieurs variantes
      selectedTarif = tarifs.find(t => {
        const name = t.nameTarif?.toLowerCase() || '';
        return name === 'classe_2' || 
               name === '2eme_classe' || 
               name === 'classe2' ||
               name.includes('classe_2') ||
               name.includes('2eme');
      });
    }
    
    // Si aucun tarif spécifique trouvé, utiliser le premier disponible
    if (!selectedTarif && tarifs.length > 0) {
      selectedTarif = tarifs[0];
      console.warn(`Tarif spécifique non trouvé pour ${classeType}, utilisation du premier tarif disponible`);
    }
    
    // Vérifier que le tarif sélectionné a un prix valide
    const basePrice = selectedTarif?.price;
    if (!basePrice || typeof basePrice !== 'number' || basePrice <= 0) {
      console.warn('Prix de base invalide, utilisation du prix par défaut');
      return classeType === 'Classe_1';
    }
    
    console.log('Tarifs disponibles:', tarifs.map(t => ({ name: t.nameTarif, price: t.price })));
    console.log('Tarif sélectionné pour', classeType, ':', {
      name: selectedTarif?.nameTarif,
      price: selectedTarif?.price
    });
    console.log('Prix de base:', basePrice);
    
    // Pour la Classe_1 (1ère classe), le prix est fixe (trajet complet)
    if (classeType === 'Classe_1') {
      // CORRECTION: Multiplier par 1 au lieu de 5 pour garder le prix original
      const finalPrice = selectedTarif?.price; // Ou simplement: return basePrice;
      console.log('Prix final Classe_1:', finalPrice);
      return finalPrice;
    }
    
    // Pour la Classe_2 (2ème classe), calculer selon les zones
    if (classeType === 'Classe_2') {
      // Vérifier que les stations sont définies
      if (!departureStation || !arrivalStation || !allStations || allStations.length === 0) {
        console.warn('Stations invalides, utilisation du prix de base');
        return basePrice;
      }
      
      // Trouver les informations des stations de départ et d'arrivée
      const departureStationData = allStations.find(s => 
        s.name === departureStation || s.id === departureStation
      );
      const arrivalStationData = allStations.find(s => 
        s.name === arrivalStation || s.id === arrivalStation
      );
      
      if (!departureStationData || !arrivalStationData) {
        console.warn('Station non trouvée, utilisation du prix de base.');
        return basePrice;
      }
      
      // Extraire les numéros de zone depuis les noms des zones (ex: "Zone 1" -> 1)
      const departureZoneNumber = parseInt(
        departureStationData.zoneName?.match(/\d+/)?.[0] || '1'
      );
      const arrivalZoneNumber = parseInt(
        arrivalStationData.zoneName?.match(/\d+/)?.[0] || '1'
      );
      
      // Vérifier que les numéros de zone sont valides
      if (isNaN(departureZoneNumber) || isNaN(arrivalZoneNumber)) {
        console.warn('Numéros de zone invalides, utilisation du prix de base');
        return basePrice;
      }
      
      console.log('Calcul du prix pour Classe_2:', {
        departure: departureStation,
        arrival: arrivalStation,
        departureZone: departureZoneNumber,
        arrivalZone: arrivalZoneNumber,
        basePrice
      });
      
      // Si même zone, prix de base
      if (departureZoneNumber === arrivalZoneNumber) {
        console.log('Même zone, prix de base:', basePrice);
        return basePrice;
      }
      
      // Calcul du prix selon les zones
      let finalPrice;
      
      // Règles de tarification par zone pour la 2ème classe
      if ((departureZoneNumber === 1 && arrivalZoneNumber === 2) || 
          (departureZoneNumber === 2 && arrivalZoneNumber === 1)) {
        // Entre zone 1 et zone 2
        finalPrice = basePrice * 2;
      } else if ((departureZoneNumber === 2 && arrivalZoneNumber === 3) || 
                 (departureZoneNumber === 3 && arrivalZoneNumber === 2)) {
        // Entre zone 2 et zone 3
        finalPrice = basePrice * 2;
      } else if ((departureZoneNumber === 1 && arrivalZoneNumber === 3) || 
                 (departureZoneNumber === 3 && arrivalZoneNumber === 1)) {
        // Entre zone 1 et zone 3 (saut d'une zone)
        finalPrice = basePrice * 3;
      } else {
        // Pour tous les autres cas, utiliser la différence de zones
        const zoneDifference = Math.abs(arrivalZoneNumber - departureZoneNumber);
        const multiplier = Math.max(1, zoneDifference + 1);
        finalPrice = basePrice * multiplier;
      }
      
      console.log('Prix calculé pour Classe_2:', {
        departureZone: departureZoneNumber,
        arrivalZone: arrivalZoneNumber,
        finalPrice,
        multiplier: finalPrice / basePrice
      });
      
      return finalPrice;
    }
    
    // Fallback - retourner le prix de base
    console.log('Fallback - Prix de base:', basePrice);
    return basePrice;
    
  } catch (error) {
    console.error('Erreur dans le calcul du prix:', error);
    // Retourner des prix par défaut selon la classe
  }
};


// Fonction mise à jour pour handleSubmit
const handleSubmit = async () => {
  if (!isDataLoaded) {
    alert("Les données sont encore en cours de chargement. Veuillez patienter un instant.");
    return;
  }

  if (!operator) {
    alert("Données de l'opérateur non disponibles. Veuillez réessayer.");
    return;
  }

  try {
    setLoading(true);
    let departStationId, arrivalStationId;
    let departStationName, arrivalStationName;

   if (classeType === 'Classe_1') {
  // Pour la 1ère classe, utiliser les données de lines
  const lineData = operatorData?.lines?.[0];
  
  if (lineData) {
    // Rechercher les stations correspondantes dans les zones
    const departureStationData = departStations.find(s => 
      s.name.toLowerCase().includes(lineData.departure.toLowerCase()) ||
      lineData.departure.toLowerCase().includes(s.name.toLowerCase())
    );
    
    const arrivalStationData = departStations.find(s => 
      s.name.toLowerCase().includes(lineData.destination.toLowerCase()) ||
      lineData.destination.toLowerCase().includes(s.name.toLowerCase())
    );
    
    if (departureStationData && arrivalStationData) {
      departStationId = departureStationData.id;
      arrivalStationId = arrivalStationData.id;
      departStationName = departureStationData.name;
      arrivalStationName = arrivalStationData.name;
    } else {
      // Fallback: utiliser les noms des lines directement
      departStationName = lineData.departure;
      arrivalStationName = lineData.destination;
      // Utiliser les IDs des première et dernière stations comme fallback
      departStationId = departStations[0]?.id || 'default-departure';
      arrivalStationId = departStations[departStations.length - 1]?.id || 'default-arrival';
    }
    
    console.log("Classe 1 - Trajet configuré depuis lines:", {
      lineName: lineData.name,
      departStationName,
      arrivalStationName,
      departStationId,
      arrivalStationId
    });
  } else {
    throw new Error("Données de ligne non disponibles pour la classe 1");
  }
} else {
      // Pour la 2ème classe, utiliser les stations sélectionnées
      const departStation = departStations.find(s => s.name === depart);
      const arrivalStation = arrivalStations.find(s => s.name === destination);

      if (!departStation || !arrivalStation) {
        alert("Veuillez sélectionner des stations valides");
        setLoading(false);
        return;
      }

      departStationId = departStation.id;
      arrivalStationId = arrivalStation.id;
      departStationName = departStation.name;
      arrivalStationName = arrivalStation.name;
    }
    
    const operatorId = operator.id;
    
    // **NOUVEAU: Calcul du prix dynamique**
    const calculatedPrice = calculateTerPrice(
      departStationName,
      arrivalStationName,
      classeType,
      operatorData,
      departStations
    );
    
    console.log("💰 Prix calculé pour TER:", calculatedPrice);
    console.log("💰 Type du prix calculé:", typeof calculatedPrice);
    console.log("🏢 Opérateur TER:", {
      name: operator.name,
      logoUrl: operator.logoUrl,
      id: operator.id
    });
    
    console.log("Données de réservations:", {
      operatorId: operatorId,
      departStationId,
      arrivalStationId,
      departStationName,
      arrivalStationName,
      classeType,
      ticketCount,
      calculatedPrice
    });

    // Simulation d'une réponse API avec le prix calculé
    const simulatedResponse = {
      status: 201,
      data: Array.from({ length: ticketCount }, (_, index) => ({
        id: `temp_reservation_${Date.now()}_${index}`,
        amount: calculatedPrice, // **Utilisation du prix calculé**
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        classeType: classeType,
        zoneType: classeType === 'Classe_1' ? 'COMPLETE' : 'PARTIAL',
        zoneName: classeType === 'Classe_1' ? 'Trajet Complet' : `${departStationName} - ${arrivalStationName}`,
        departureStation: departStationName,
        arrivalStation: arrivalStationName,
        operatorId: operatorId,
        operatorName: operator.name,
        operatorLogo: operator.logoUrl,
        ticketvalidity: "5 jours"
      }))
    };

    console.log("📋 Réponse simulée avec prix:", {
      status: simulatedResponse.status,
      ticketCount: simulatedResponse.data.length,
      firstTicketAmount: simulatedResponse.data[0]?.amount,
      firstTicketOperator: simulatedResponse.data[0]?.operatorName,
      firstTicketLogo: simulatedResponse.data[0]?.operatorLogo
    });

    // Traitement de la réponse simulée
    const result = simulatedResponse;
    console.log("Réponse de réservation simulée:", result);

    // Vérifier le statut 201 (Created) ou 200 (OK)
    if (result.status === 201 || result.status === 200) {
      // Calculer le nombre total de tickets et utiliser les données du premier ticket
      const reservationData = result.data[0];
      const totalTicketCount = result.data.length;
      
      const amount = reservationData.amount;
      const expiresAt = reservationData.expiresAt;
      const classe = reservationData.classeType;
      const zone = reservationData.zoneType;
      const id = reservationData.id;
      const zoneName = reservationData.zoneName;
      const logourl=reservationData.operatorLogo

      console.log("📋 Données extraites de la réponse:", {
        totalTicketCount,
        requestedTickets: ticketCount,
        amount,
        departStationName,
        arrivalStationName,
        operatorName: operator.name,
        operatorLogo: operator.logoUrl
      });

      // Préparer les paramètres de navigation avec le logo et le prix
      const navigationParams = {
        operatorName: operator.name,
        operatorLogoUrl: operator.logoUrl || require("../../../assets/images/TER.png"),
        operatorSlogan: "Train Express Régional",
        operatorCommission: 5,
        ticketvalidity: "5 jours",
        operatorId: operator.id,
        operatorType: "TER",
        transportType: "train",
        departureStation: departStationName,
        departStationId: departStationId,
        arrivalStationId: arrivalStationId,
        destinationStation: arrivalStationName,
        id: id,
        amount: amount.toString(),
        price: amount, // Ajout du prix numérique
        expiresAt: expiresAt,
        classe: classeType,
        zone: zone,
        zoneName: zoneName,
        ticketCount: totalTicketCount.toString(),
        // Paramètres supplémentaires pour compatibilité
        date: new Date().toLocaleDateString('fr-FR'),
        seat: ticketCount.toString(),
        totalAvailableSeats: "50",
        departureTime: new Date().toLocaleTimeString(),
        tripId: id,
        temporaryReservationId: id,
        name: "Passager",
        phoneNumber: "",
        reserveId: id,
        status: "pending",
        createdAt: new Date().toISOString(),
        methodePay: "OM",
        ticketId: id,
        pendingExpiresAt: expiresAt,
      };

      console.log("📤 Paramètres envoyés vers paiementUrbain TER:", navigationParams);
      console.log("💰 Prix envoyé dans 'amount':", navigationParams.amount);
      console.log("💰 Prix envoyé dans 'price':", navigationParams.price);
      console.log("🏢 Logo Opérateur envoyé:", navigationParams.operatorLogoUrl);
      console.log("🏢 Nom Opérateur envoyé:", navigationParams.operatorName);

      router.push({
        pathname: "/pages/Paiement/paiementUrbain/paiement",
        params: navigationParams,
      });
      
    } else {
      throw new Error("Erreur de réservation simulée");
    }
  } catch (error) {
    console.error("Erreur lors de la réservation:", error);
    alert("Erreur lors de la réservation: " + (error instanceof Error ? error.message : "Erreur inconnue"));
  } finally {
    setLoading(false);
  }
};

  // Fonction pour grouper les stations par zone avec design exact de reservationDDK
const renderStationsByZone = (
  stations: Station[],
  onSelect: (station: Station) => void,
  mode: 'departure' | 'arrival'
) => {
  if (operatorZones.length === 0) {
    return (
      <View style={tw`p-4 items-center`}>
        <Text style={tw`text-gray-500`}>Aucune station disponible</Text>
      </View>
    );
  }

  // Trier les zones par ordre (Zone 1, Zone 2, Zone 3, etc.)
  const sortedZones = [...operatorZones].sort((a, b) => {
    // Extraire le numéro de zone depuis le nom (ex: "Zone 1" -> 1)
    const zoneNumberA = parseInt(a.name.match(/\d+/)?.[0] || '0');
    const zoneNumberB = parseInt(b.name.match(/\d+/)?.[0] || '0');
    console.log(`🔍 Tri des zones: ${a.name} (${zoneNumberA}) vs ${b.name} (${zoneNumberB})`);
    return zoneNumberA - zoneNumberB;
  });

  return sortedZones.map((zone, zoneIndex) => (
    <View key={zone.id} style={tw`mb-6`}>
      {/* En-tête de la zone - design exact de reservationDDK */}
      <View style={tw`bg-gray-50 px-4 py-3 rounded-t-lg mb-0 border-b border-gray-200`}>
        <Text style={tw`text-base font-semibold text-black`}>{zone.name}</Text>
        <Text style={tw`text-xs text-gray-600 mt-1`}>{zone.stations.length} stations</Text>
      </View>
      
      {/* Ligne droite avec stations - design exact de reservationDDK */}
      <View style={tw`bg-white rounded-b-lg overflow-hidden`}>
        <View style={tw`relative`}>
          {/* Ligne verticale continue */}
          <View style={tw`absolute left-6 top-0 bottom-0 w-0.5 bg-gray-300`} />
          
          {zone.stations
            .filter(station => {
              // Masquer la station déjà sélectionnée dans l'autre champ
              if (mode === 'departure' && arrivalStation) {
                return station.id !== arrivalStation.stationId;
              }
              if (mode === 'arrival' && departureStation) {
                return station.id !== departureStation.stationId;
              }
              return true;
            })
            .map((station, index) => (
              <TouchableOpacity
                key={station.id}
                style={tw`flex-row items-center py-4 px-5 active:bg-gray-50`}
                onPress={() => onSelect(station)}
              >
                {/* Point de station */}
                <View style={tw`relative z-10`}>
                  <View style={tw`h-4 w-4 rounded-full bg-[#094741] border-2 border-white shadow-sm`} />
                  {/* Ligne de connexion vers la droite */}
                  <View style={tw`absolute top-2 left-4 w-3 h-0.5 bg-gray-300`} />
                </View>
                
                {/* Informations de la station */}
                <View style={tw`flex-1 ml-6`}>
                  <Text style={tw`text-base font-bold text-black`}>{station.name}</Text>
                  <Text style={tw`text-sm text-gray-600 mt-1`}>
                    Station {index + 1}
                  </Text>
                </View>
                
                {/* Icône de sélection */}
                <View style={tw`ml-3`}>
                  <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                </View>
              </TouchableOpacity>
            ))}
        </View>
      </View>
    </View>
  ));
};

  // Fonction pour gérer le changement de classe
  const handleClassChange = (newClass) => {
    setClasseType(newClass);
    setShowClassPicker(false);

    if (newClass === 'Classe_1' && departStations.length > 0) {
      // En première classe, configurez le trajet complet automatiquement
      setDepart(departStations[0].name);
      setDestination(departStations[departStations.length - 1].name);
    }
  };

  const customBackgroundImage = (
    <Image
      source={require("../../../assets/images/ImageTER.png")}
      style={tw`w-full h-full absolute rounded-b-lg`}
      resizeMode="cover"
    />
  );


  const homeImages = [
  { id: '1', image: require('../../../assets/images/TER.png') },
  { id: '2', image: require('../../../assets/images/DDK.png') },
  { id: '3', image: require('../../../assets/images/TER.png') },
];
  return (
    <HeaderComponent
      showGreeting={false}
      userName={userName}
      operator={brtOperator}
      showOperator={false}
      customStyle={tw`h-70 bg-teal-800 rounded-b-lg`}
      customLeftComponent={customBackgroundImage}>
      <View>
        <ScrollView style={tw`flex-1 bg-white pb-20`}>

 <View style={tw`px-6 py-4`}>
          <Text style={tw`text-2xl font-bold text-gray-800 mb-1`}>
            Réservez vos tickets {brtOperator.name}
          </Text>
        {/*   {operator ? (
            <Text style={tw`text-sm text-gray-600`}>
              Opérateur: {operator.name}
            </Text>
          ) : (
            <Text style={tw`text-sm text-gray-400`}>Chargement de l'opérateur...</Text>
          )} */}
        </View>
          {/* Message d'erreur non bloquant */}
         {/*  {(errorMessage || operatorsError) && (
            <View style={tw`mb-3 p-2 bg-red-50 rounded-md flex-row items-center`}>
              <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
              <Text style={tw`flex-1 ml-2 text-xs text-red-600`}>{errorMessage || operatorsError}</Text>
              <TouchableOpacity
                style={tw`bg-red-100 p-1 rounded-md`}
                onPress={handleRetry}
              >
                <Text style={tw`text-xs text-red-700`}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          )} */}

          {/* Indicateur de chargement */}
        {/*   {(isBackgroundLoading || operatorsLoading) && (
            <View style={tw`p-2 bg-blue-50 rounded-md flex-row items-center justify-center mb-3`}>
              <ActivityIndicator size="small" color="#0369a1" />
              <Text style={tw`ml-2 text-xs text-blue-600`}>Chargement des données...</Text>
            </View>
          )} */}

          <View           style={tw`flex-row items-center rounded-lg bg-[#F1F2F6] p-4 mx-4 mb-3`}>
            <TouchableOpacity
              style={tw`flex-1  flex-row`}
              onPress={() => setShowClassPicker(true)}
            >
              <Ionicons name="briefcase-outline" size={18} color="#888" />
              <Text style={tw`flex-1 ml-2 text-sm h-8 `}>{classeType === 'Classe_1' ? '1ère Classe' : '2ème Classe'}</Text>
            </TouchableOpacity>
          </View>

          {/* Les champs de départ et destination ne sont affichés qu'en 2ème classe */}
          {classeType === 'Classe_2' && (
            <>
              {/* Champ départ */}
          <TouchableOpacity
            style={tw`flex-row items-center rounded-lg bg-[#F1F2F6] p-4 mx-4 mb-3`}
            onPress={() => setShowDepartPicker(true)}
            disabled={!operatorZones.length}
          >
            <View style={tw`h-8 w-8 items-center justify-center rounded-full `}>
              <Ionicons name="train-outline" size={18} color="#888" />
            </View>
            <View style={tw`flex-1 ml-3`}>
              {operatorZones.length > 0 ? (
                departureStation ? (
                  <View>
                    <Text style={tw`text-base font-medium text-gray-900`}>{departureStation.stationName}</Text>
                  </View>
                ) : (
                  <Text style={tw`text-base text-gray-600`}>Sélectionnez un départ</Text>
                )
              ) : (
                <Text style={tw`text-base text-gray-400`}>Chargement des zones...</Text>
              )}
            </View>
            <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
          </TouchableOpacity>

              {/* Champ destination */}
          <TouchableOpacity
            style={tw`flex-row items-center rounded-lg bg-[#F1F2F6] p-4 mx-4 mb-7`}
            onPress={() => setShowArrivalPicker(true)}
            disabled={!operatorZones.length}
          >
            <View style={tw`h-8 w-8 items-center justify-center rounded-full `}>
              <Ionicons name="location-outline" size={18} color="#888" />
            </View>
            <View style={tw`flex-1 ml-3`}>
              {operatorZones.length > 0 ? (
                arrivalStation ? (
                  <View>
                    <Text style={tw`text-base font-medium text-gray-900`}>{arrivalStation.stationName}</Text>
                  </View>
                ) : (
                  <Text style={tw`text-base text-gray-600`}>Sélectionnez une arrivée</Text>
                )
              ) : (
                <Text style={tw`text-base text-gray-400`}>Chargement des zones...</Text>
              )}
            </View>
            <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
          </TouchableOpacity>
            </>
          )}

          {/* En 1ère classe, affichage d'un trajet pré-défini */}
          {classeType === 'Classe_1' && (
          <View           style={tw`flex-row items-center rounded-lg bg-[#F1F2F6] p-4 mx-4 mb-3`}>
              <Ionicons name="train-outline" size={20}  style={tw` h-8 `} color="#888" />
              <Text style={tw`flex-1 ml-2 h-8 `}>
                Trajet complet: {departclass1} → {arriveclass1}
              </Text>
            </View>
          )}

          {/* Options TER */}
          <View style={tw`mb-3`}>
          <View           style={tw`flex-row items-center rounded-lg bg-[#F1F2F6] p-4 mx-4 mb-3`}>
              {/* Nombre de tickets */}
              {/* <TouchableOpacity
                style={tw`flex-row items-center rounded-lg bg-[#F1F2F6] flex-1 h-8`}
                onPress={() => setShowTicketPicker(true)}
              > */}
                <Ionicons name="people-outline" size={18} color="#888" />
                <Text style={tw`flex-1 ml-2 text-sm  `}>{ticketCount} {ticketCount > 1 ? 'Tickets' : 'Ticket'}</Text>
             {/*  </TouchableOpacity> */}
            </View>

            {/* Modal pour la classe */}
            <Modal
              visible={showClassPicker}
              transparent={true}
              animationType="slide"
            >
              <View style={tw`flex-1 justify-end bg-black bg-opacity-50`}>
                <View style={tw`bg-white p-4 rounded-t-lg`}>
                  <Text style={tw`text-center text-lg font-bold mb-3`}>Sélectionnez la classe</Text>
                  <TouchableOpacity
                    style={tw`p-3 border-b border-gray-200`}
                    onPress={() => handleClassChange('Classe_1')}
                  >
                    <Text style={tw`text-center ${classeType === 'Classe_1' ? 'text-green-700 font-bold' : ''}`}>1ère Classe (Trajet complet)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={tw`p-3 border-b border-gray-200`}
                    onPress={() => handleClassChange('Classe_2')}
                  >
                    <Text style={tw`text-center ${classeType === 'Classe_2' ? 'text-green-700 font-bold' : ''}`}>2ème Classe (Choix du trajet)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={tw`mt-3 p-3 bg-gray-200 rounded-lg`}
                    onPress={() => setShowClassPicker(false)}
                  >
                    <Text style={tw`text-center font-bold`}>Fermer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* Modal pour le nombre de tickets */}
            <Modal
              visible={showTicketPicker}
              transparent={true}
              animationType="slide"
            >
              <View style={tw`flex-1 justify-end bg-black bg-opacity-50`}>
                <View style={tw`bg-white p-4 rounded-t-lg`}>
                  <Text style={tw`text-center text-lg font-bold mb-3`}>Nombre de tickets</Text>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <TouchableOpacity
                      key={num}
                      style={tw`p-3 border-b border-gray-200`}
                      onPress={() => {
                        setTicketCount(num);
                        setShowTicketPicker(false);
                      }}
                    >
                      <Text style={tw`text-center ${ticketCount === num ? 'text-green-700 font-bold' : ''}`}>{num} {num > 1 ? 'Tickets' : 'Ticket'}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={tw`mt-3 p-3 bg-gray-200 rounded-lg`}
                    onPress={() => setShowTicketPicker(false)}
                  >
                    <Text style={tw`text-center font-bold`}>Fermer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* Modal pour la sélection de la station de départ - design exact de reservationDDK */}
            <Modal
              animationType="slide"
              transparent={true}
              visible={showDepartPicker}
              onRequestClose={() => setShowDepartPicker(false)}
            >
              <View style={tw`flex-1 bg-black bg-opacity-50 justify-end`}>
                <View style={tw`bg-white rounded-t-xl pt-2 pb-6 h-3/4`}>
                  <View
                    style={tw`flex-row justify-between items-center px-6 py-4 border-b border-gray-200 bg-white`}
                  >
                    <View style={tw`flex-1`}>
                      <Text style={tw`text-lg font-bold text-black`}>
                        Sélectionnez votre départ
                      </Text>
                      <Text style={tw`text-sm text-gray-600 mt-1`}>
                        {operator?.name || 'TER'} • {operatorZones.length} zones disponibles
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={tw`h-8 w-8 items-center justify-center rounded-full bg-gray-100`}
                      onPress={() => setShowDepartPicker(false)}
                    >
                      <Ionicons name="close" size={20} color="#374151" />
                    </TouchableOpacity>
                  </View>

                  {!isDataLoaded ? (
                    <View style={tw`py-12 items-center`}>
                      <View style={tw`h-16 w-16 rounded-full bg-gray-100 items-center justify-center mb-4`}>
                        <ActivityIndicator size="large" color="#094741" />
                      </View>
                      <Text style={tw`text-black text-center text-base font-medium`}>
                        Chargement des stations...
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={[...operatorZones].sort((a, b) => {
                        // Extraire le numéro de zone depuis le nom (ex: "Zone 1" -> 1)
                        const zoneNumberA = parseInt(a.name.match(/\d+/)?.[0] || '0');
                        const zoneNumberB = parseInt(b.name.match(/\d+/)?.[0] || '0');
                        return zoneNumberA - zoneNumberB;
                      })}
                      renderItem={({ item: zone }) => (
                        <View style={tw`mb-6`}>
                          {/* En-tête de la zone */}
                          <View style={tw`bg-gray-50 px-4 py-3 rounded-t-lg mb-0 border-b border-gray-200`}>
                            <Text style={tw`text-base font-semibold text-black`}>{zone.name}</Text>
                            <Text style={tw`text-xs text-gray-600 mt-1`}>{zone.stations.length} stations</Text>
                          </View>
                          
                          {/* Ligne droite avec stations */}
                          <View style={tw`bg-white rounded-b-lg overflow-hidden`}>
                            <View style={tw`relative`}>
                              {/* Ligne verticale continue */}
                              <View style={tw`absolute left-6 top-0 bottom-0 w-0.5 bg-gray-300`} />
                              
                              {zone.stations
                                .filter(station => {
                                  if (arrivalStation) {
                                    return station.id !== arrivalStation.stationId;
                                  }
                                  return true;
                                })
                                .map((station, index) => (
                                  <TouchableOpacity
                                    key={station.id}
                                    style={tw`flex-row items-center py-4 px-5 active:bg-gray-50`}
                                    onPress={() => {
                                      setDepartureStation({
                                        zoneId: station.zoneId || zone.id,
                                        zoneName: station.zoneName || zone.name,
                                        stationId: station.id,
                                        stationName: station.name
                                      });
                                      setDepart(station.name);
                                      setShowDepartPicker(false);
                                    }}
                                  >
                                    {/* Point de station */}
                                    <View style={tw`relative z-10`}>
                                      <View style={tw`h-4 w-4 rounded-full bg-[#094741] border-2 border-white shadow-sm`} />
                                      {/* Ligne de connexion vers la droite */}
                                      <View style={tw`absolute top-2 left-4 w-3 h-0.5 bg-gray-300`} />
                                    </View>
                                    
                                    {/* Informations de la station */}
                                    <View style={tw`flex-1 ml-6`}>
                                      <Text style={tw`text-base font-bold text-black`}>{station.name}</Text>
                                      <Text style={tw`text-sm text-gray-600 mt-1`}>
                                        Station {index + 1}
                                      </Text>
                                    </View>
                                    
                                    {/* Icône de sélection */}
                                    <View style={tw`ml-3`}>
                                      <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                                    </View>
                                  </TouchableOpacity>
                                ))}
                            </View>
                          </View>
                        </View>
                      )}
                      keyExtractor={(item) => item.id}
                      contentContainerStyle={tw`pt-4 pb-6 px-4`}
                      showsVerticalScrollIndicator={false}
                      ListEmptyComponent={
                        <View style={tw`py-12 items-center`}>
                          <View style={tw`h-16 w-16 rounded-full bg-gray-100 items-center justify-center mb-4`}>
                            <Ionicons name="location-outline" size={32} color="#6B7280" />
                          </View>
                          <Text style={tw`text-black text-center text-base font-medium`}>
                            Aucune zone disponible
                          </Text>
                          <Text style={tw`text-gray-600 text-center text-sm mt-2`}>
                            Veuillez réessayer plus tard
                          </Text>
                        </View>
                      }
                    />
                  )}
                </View>
              </View>
            </Modal>

            {/* Modal pour la sélection de la station d'arrivée - design exact de reservationDDK */}
            <Modal
              animationType="slide"
              transparent={true}
              visible={showArrivalPicker}
              onRequestClose={() => setShowArrivalPicker(false)}
            >
              <View style={tw`flex-1 bg-black bg-opacity-50 justify-end`}>
                <View style={tw`bg-white rounded-t-xl pt-2 pb-6 h-3/4`}>
                  <View
                    style={tw`flex-row justify-between items-center px-6 py-4 border-b border-gray-200 bg-white`}
                  >
                    <View style={tw`flex-1`}>
                      <Text style={tw`text-lg font-bold text-black`}>
                        Sélectionnez votre arrivée
                      </Text>
                      <Text style={tw`text-sm text-gray-600 mt-1`}>
                        {operator?.name || 'TER'} • {operatorZones.length} zones disponibles
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={tw`h-8 w-8 items-center justify-center rounded-full bg-gray-100`}
                      onPress={() => setShowArrivalPicker(false)}
                    >
                      <Ionicons name="close" size={20} color="#374151" />
                    </TouchableOpacity>
                  </View>

                  {!isDataLoaded ? (
                    <View style={tw`py-12 items-center`}>
                      <View style={tw`h-16 w-16 rounded-full bg-gray-100 items-center justify-center mb-4`}>
                        <ActivityIndicator size="large" color="#094741" />
                      </View>
                      <Text style={tw`text-black text-center text-base font-medium`}>
                        Chargement des stations...
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={[...operatorZones].sort((a, b) => {
                        // Extraire le numéro de zone depuis le nom (ex: "Zone 1" -> 1)
                        const zoneNumberA = parseInt(a.name.match(/\d+/)?.[0] || '0');
                        const zoneNumberB = parseInt(b.name.match(/\d+/)?.[0] || '0');
                        return zoneNumberA - zoneNumberB;
                      })}
                      renderItem={({ item: zone }) => (
                        <View style={tw`mb-6`}>
                          {/* En-tête de la zone */}
                          <View style={tw`bg-gray-50 px-4 py-3 rounded-t-lg mb-0 border-b border-gray-200`}>
                            <Text style={tw`text-base font-semibold text-black`}>{zone.name}</Text>
                            <Text style={tw`text-xs text-gray-600 mt-1`}>{zone.stations.length} stations</Text>
                          </View>
                          
                          {/* Ligne droite avec stations */}
                          <View style={tw`bg-white rounded-b-lg overflow-hidden`}>
                            <View style={tw`relative`}>
                              {/* Ligne verticale continue */}
                              <View style={tw`absolute left-6 top-0 bottom-0 w-0.5 bg-gray-300`} />
                              
                              {zone.stations
                                .filter(station => {
                                  if (departureStation) {
                                    return station.id !== departureStation.stationId;
                                  }
                                  return true;
                                })
                                .map((station, index) => (
                                  <TouchableOpacity
                                    key={station.id}
                                    style={tw`flex-row items-center py-4 px-5 active:bg-gray-50`}
                                    onPress={() => {
                                      setArrivalStation({
                                        zoneId: station.zoneId || zone.id,
                                        zoneName: station.zoneName || zone.name,
                                        stationId: station.id,
                                        stationName: station.name
                                      });
                                      setDestination(station.name);
                                      setShowArrivalPicker(false);
                                    }}
                                  >
                                    {/* Point de station */}
                                    <View style={tw`relative z-10`}>
                                      <View style={tw`h-4 w-4 rounded-full bg-[#094741] border-2 border-white shadow-sm`} />
                                      {/* Ligne de connexion vers la droite */}
                                      <View style={tw`absolute top-2 left-4 w-3 h-0.5 bg-gray-300`} />
                                    </View>
                                    
                                    {/* Informations de la station */}
                                    <View style={tw`flex-1 ml-6`}>
                                      <Text style={tw`text-base font-bold text-black`}>{station.name}</Text>
                                      <Text style={tw`text-sm text-gray-600 mt-1`}>
                                        Station {index + 1}
                                      </Text>
                                    </View>
                                    
                                    {/* Icône de sélection */}
                                    <View style={tw`ml-3`}>
                                      <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                                    </View>
                                  </TouchableOpacity>
                                ))}
                            </View>
                          </View>
                        </View>
                      )}
                      keyExtractor={(item) => item.id}
                      contentContainerStyle={tw`pt-4 pb-6 px-4`}
                      showsVerticalScrollIndicator={false}
                      ListEmptyComponent={
                        <View style={tw`py-12 items-center`}>
                          <View style={tw`h-16 w-16 rounded-full bg-gray-100 items-center justify-center mb-4`}>
                            <Ionicons name="location-outline" size={32} color="#6B7280" />
                          </View>
                          <Text style={tw`text-black text-center text-base font-medium`}>
                            Aucune zone disponible
                          </Text>
                          <Text style={tw`text-gray-600 text-center text-sm mt-2`}>
                            Veuillez réessayer plus tard
                          </Text>
                        </View>
                      }
                    />
                  )}
                </View>
              </View>
            </Modal>
          </View>

          {/* Bouton de recherche avec état de chargement */}
          <TouchableOpacity
            style={tw`bg-[#094741] py-3 rounded-md items-center mb-4 flex-row justify-center`}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <ActivityIndicator size="small" color="white" />
                <Text style={tw`text-white font-bold ml-2`}>Traitement...</Text>
              </>
            ) : (
              <Text style={tw`text-white font-bold`}>Rechercher</Text>
            )}
          </TouchableOpacity>


         <DynamicCarousel 
  customImages={homeImages}
  autoScrollInterval={4000}
  height="h-32"
  activeDotColor="bg-green-600"
/>

          {/* Historique des destinations fréquentes */}
       {/*    <View style={tw`px-6 mb-6`}>
            <Text style={tw`text-lg font-semibold text-gray-800 mb-3`}>
              Destinations fréquentes
            </Text>
            <View style={tw`space-y-3`}>
              {frequentDestinations.map((destination) => (
                <View
                  key={destination.id}
                  style={tw`bg-white rounded-xl p-4 shadow-sm`}
                >
                  <View style={tw`flex-row justify-between items-start mb-2`}>
                    <View style={tw`flex-1`}>
                      <Text style={tw`text-sm text-gray-500`}>De</Text>
                      <Text style={tw`text-base font-medium text-gray-900`}>
                        {destination.departure}
                      </Text>
                    </View>
                    <View style={tw`flex-1 items-end`}>
                      <Text style={tw`text-sm text-gray-500`}>Vers</Text>
                      <Text style={tw`text-base font-medium text-gray-900`}>
                        {destination.arrival}
                      </Text>
                    </View>
                  </View>
                  <View style={tw`flex-row justify-between items-center mt-2`}>
                    <View>
                      <Text style={tw`text-xs text-gray-500`}>
                        {destination.lastUsed}
                      </Text>
                      <Text style={tw`text-sm font-semibold text-[#094741]`}>
                        {destination.price} FCFA
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={tw`bg-[#094741] px-4 py-2 rounded-lg`}
                      onPress={() => {
                        // Simuler la sélection des stations
                        const departureParts = destination.departure.split(' - ');
                        const arrivalParts = destination.arrival.split(' - ');
                        setDepartureStation({
                          zoneId: departureParts[0].replace('Zone ', ''),
                          zoneName: departureParts[0],
                          stationId: 'station-' + departureParts[1],
                          stationName: departureParts[1]
                        });
                        setArrivalStation({
                          zoneId: arrivalParts[0].replace('Zone ', ''),
                          zoneName: arrivalParts[0],
                          stationId: 'station-' + arrivalParts[1],
                          stationName: arrivalParts[1]
                        });
                      }}
                    >
                      <Text style={tw`text-white font-medium`}>Acheter</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View> */}
        </ScrollView>

      </View>
    </HeaderComponent>
  );
}


// Export a wrapped version of the component
export default function ReservationScreen() {
  return (
    <OperatorProvider>
      <ReservationScreens />
    </OperatorProvider>
  );
}