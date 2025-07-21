import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, FlatList, Image, ActivityIndicator } from 'react-native';
import * as React from 'react';

import HeaderComponent from '../../../constants/headerpage/HeaderComponent';
import tw from '../../../tailwind';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import { useRoute } from '@react-navigation/native';
import DynamicCarousel from '../../../components/Carrousel';
import { ToastRefType } from '../home/composant/types';
import { useOperators, OperatorProvider } from '../../../constants/contexte/OperatorContext';

interface Operator {
  id: string;
  name: string;
  logoUrl: string;
  isUrbainStatus: boolean | string;
  ticketValidity: string;
}

interface Station {
  id: string;
  name: string;
}

interface Zone {
  id: string;
  name: string;
  stations: Station[];
}

interface SelectedStation {
  zoneId: string;
  zoneName: string;  
  stationId: string;
  stationName: string;
}

interface Tarif {
  id: string;
  nameTarif: string;
  price: number;
}

interface Line {
  id: string;
  name: string;
  tarifs: Tarif[];
}

interface OperatorPricingData {
  operator: Operator;
  lines: Line[];
  zones: Zone[];
}

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

interface OperatorData {
  operator: Operator;
  zones: Zone[];
}

const brtOperator = {
  name: "BRT",
  slogan: "Bus Rapid Transit",
  transportType: "BUS"
};

function ReservationScreens() {
  const router = useRouter();
  const route = useRoute();
  const userName = "Rama Seck";
  const toastRef = useRef<ToastRefType>(null);
  
  // Use useOperators hook to access operators
  const { 
    operators, 
    selectedOperator, 
    setSelectedOperator: setContextOperator, 
    loading: operatorsLoading, 
    error: operatorsError,
    refreshOperators,
    getOperatorById,
    isInitialized
  } = useOperators();

  // States for selected stations
  const [departureStation, setDepartureStation] = useState<SelectedStation | null>(null);
  const [arrivalStation, setArrivalStation] = useState<SelectedStation | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [operatorData, setOperatorData] = useState<OperatorData | null>(null);
  
  // States for modals
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'departure' | 'arrival'>('departure');
  
  // States for reservation
  const [error, setError] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [loading, setLoading] = useState(false);
  
  // State to store all zones of selected operator
  const [operatorZones, setOperatorZones] = useState<Zone[]>([]);
  
  // État pour les données de pricing actuelles
  const [currentOperatorPricingData, setCurrentOperatorPricingData] = useState<OperatorPricingData | null>(null);

  const {
    departureStationId = "",
    arrivalStationId = "",
    date = "",
    seat = "",
    totalAvailableSeats = "0",
    departureTime = "",
    price = 0,
    operatorId = "",
    temporaryReservationId = "",
    operatorName = "Opérateur",
    operatorLogoUrl = "",
    operatorSlogan = "" 
  } = (route.params as RouteParams) || {};

  // **FONCTION CORRIGÉE** : Récupérer les données de pricing depuis le cache/contexte
  const fetchOperatorPricingData = async (targetOperatorId: string): Promise<OperatorPricingData | null> => {
    try {
      console.log("🔍 Récupération des données de pricing pour l'opérateur:", targetOperatorId);
      
      // 1. Essayer d'abord depuis le cache local (contexte)
      const cachedOperatorData = operators.find(op => op.operator?.id === targetOperatorId);
      
      if (cachedOperatorData) {
        console.log("✅ Données trouvées dans le cache local");
        
        // NOTE: OperatorWithZones n'a pas de propriété 'lines'.
        // Si besoin de tarifs, ils doivent être dans operator.tarifs ou zones.
        const pricingData: OperatorPricingData = {
          operator: cachedOperatorData.operator,
          lines: [], // <-- à normaliser selon la structure réelle
          zones: cachedOperatorData.zones || []
        };
        
        console.log("📊 Données de pricing récupérées:", {
          operatorName: pricingData.operator.name,
          linesCount: pricingData.lines.length,
          zonesCount: pricingData.zones.length
        });
        
        return pricingData;
      }
      
      // 2. Si pas dans le cache, utiliser getOperatorById pour rafraîchir
      console.log("🔄 Pas trouvé dans le cache, récupération via getOperatorById...");
      const operatorWithZones = await getOperatorById(targetOperatorId);
      
      if (operatorWithZones) {
        console.log("✅ Données récupérées via getOperatorById");
        
        const pricingData: OperatorPricingData = {
          operator: operatorWithZones.operator,
          lines: [], // <-- à normaliser selon la structure réelle
          zones: operatorWithZones.zones || []
        };
        
        return pricingData;
      }
      
      // 3. Dernier recours : forcer un refresh des opérateurs
      console.log("🔄 Tentative de refresh des opérateurs...");
      await refreshOperators();
      
      // Essayer à nouveau après le refresh
      const refreshedOperator = operators.find(op => op.operator?.id === targetOperatorId);
      if (refreshedOperator) {
        console.log("✅ Données trouvées après refresh");
        return {
          operator: refreshedOperator.operator,
          lines: [], // <-- à normaliser selon la structure réelle
          zones: refreshedOperator.zones || []
        };
      }
      
      throw new Error(`Opérateur ${targetOperatorId} non trouvé même après refresh`);
      
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des données de pricing:", error);
      return null;
    }
  };

  // Mock data for destination history
/*   const frequentDestinations = [
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
  ]; */

  // **EFFET CORRIGÉ** : Sélectionner l'opérateur avec synchronisation
  useEffect(() => {
    const selectOperator = async () => {
      if (!isInitialized || operators.length === 0) {
        console.log("⏳ En attente de l'initialisation des opérateurs...");
        return;
      }

      try {
        let targetOperator = null;
        
        // 1. Chercher par operatorId des params
        if (operatorId) {
          console.log("🔍 Recherche de l'opérateur par ID:", operatorId);
          const operatorWithZones = await getOperatorById(operatorId);
          if (operatorWithZones) {
            targetOperator = operatorWithZones;
          }
        }
        
        // 2. Chercher par nom (BRT/Bus Rapid Transit)
        if (!targetOperator) {
          console.log("🔍 Recherche de l'opérateur BRT par nom...");
          targetOperator = operators.find(op => 
            op.operator && (
              op.operator.name.toLowerCase().includes('brt') || 
              op.operator.name.toLowerCase().includes('bus rapid transit')
            )
          );
        }
        
        // 3. Prendre le premier disponible
        if (!targetOperator && operators.length > 0) {
          console.log("🔍 Sélection du premier opérateur disponible");
          targetOperator = operators[0];
        }
        
        if (targetOperator) {
          console.log("✅ Opérateur sélectionné:", targetOperator.operator.name);
          setOperator(targetOperator.operator);
          setContextOperator(targetOperator.operator);
          setOperatorZones(targetOperator.zones || []);
          setSelectedZone(null);
          
          // Préparer les données de pricing
          const pricingData: OperatorPricingData = {
            operator: targetOperator.operator,
            lines: targetOperator.lines || [],
            zones: targetOperator.zones || []
          };
          setCurrentOperatorPricingData(pricingData);
          
          console.log("📊 Données de pricing préparées:", {
            operatorName: pricingData.operator.name,
            linesCount: pricingData.lines.length,
            zonesCount: pricingData.zones.length
          });
        } else {
          console.log("❌ Aucun opérateur disponible");
        }
      } catch (error) {
        console.error("❌ Erreur lors de la sélection de l'opérateur:", error);
        setError("Erreur lors du chargement de l'opérateur");
      }
    };

    selectOperator();
  }, [isInitialized, operators, operatorId, getOperatorById, setContextOperator]);
    
  // Refresh operators if necessary
  useEffect(() => {
    if (operatorsError && toastRef.current) {
      toastRef.current.show(
        "Erreur de connexion", 
        "Impossible de charger les opérateurs. Veuillez vérifier votre connexion.",
        'error'
      );
    }
  }, [operatorsError]);

  const openModal = (mode: 'departure' | 'arrival') => {
    setModalMode(mode);
    setModalVisible(true);
  };

  const handleStationSelect = (zoneId: string, zoneName: string, station: Station) => {
    const selectedStationData = {
      zoneId,
      zoneName,
      stationId: station.id,
      stationName: station.name
    };
    
    if (modalMode === 'departure') {
      setDepartureStation(selectedStationData);
    } else {
      setArrivalStation(selectedStationData);
    }
    
    setModalVisible(false);
  };

  // **FONCTION CORRIGÉE** : Calcul de prix avec vraies données
  const calculatePricing = (departureZoneId: string, arrivalZoneId: string, operatorData: OperatorPricingData) => {
    console.log("🔍 Calcul du prix - Données reçues:", {
      departureZoneId, 
      arrivalZoneId,
      operatorName: operatorData.operator.name,
      linesCount: operatorData.lines.length,
      zonesCount: operatorData.zones.length
    });

    // Validation stricte - PAS de prix par défaut
    if (!operatorData) {
      throw new Error("Données de l'opérateur manquantes - Impossible de calculer le prix");
    }

    if (!operatorData.lines || !Array.isArray(operatorData.lines) || operatorData.lines.length === 0) {
      throw new Error("Aucune ligne de transport trouvée dans les données de l'opérateur");
    }

    const line = operatorData.lines[0];
    console.log("📍 Ligne utilisée:", line.name);

    if (!line.tarifs || !Array.isArray(line.tarifs) || line.tarifs.length === 0) {
      throw new Error(`Aucun tarif configuré pour la ligne ${line.name}`);
    }

    // Afficher tous les tarifs disponibles
    console.log("💰 Tarifs disponibles:", line.tarifs.map(t => ({
      id: t.id,
      name: t.nameTarif,
      price: t.price
    })));

    const isSameZone = departureZoneId === arrivalZoneId;
    console.log(`🎯 Type de trajet: ${isSameZone ? 'Même zone' : 'Zones différentes'}`);

    let selectedTarif = null;

    // Logique de sélection du tarif améliorée
    if (isSameZone) {
      // Chercher un tarif pour la même zone
      selectedTarif = line.tarifs.find(tarif => {
        const nameLower = tarif.nameTarif.toLowerCase();
        return nameLower.includes("same") ||
               nameLower.includes("même") ||
               nameLower.includes("intra") ||
               nameLower.includes("zone unique") ||
               nameLower.includes("local");
      });
    } else {
      // Chercher un tarif pour zones différentes
      selectedTarif = line.tarifs.find(tarif => {
        const nameLower = tarif.nameTarif.toLowerCase();
        return nameLower.includes("different") ||
               nameLower.includes("inter") ||
               nameLower.includes("différent") ||
               nameLower.includes("cross") ||
               nameLower.includes("transit");
      });
    }

    // Si pas de tarif spécifique trouvé, prendre le premier MAIS vérifier qu'il existe
    if (!selectedTarif) {
      selectedTarif = line.tarifs[0];
      console.log("⚠️ Aucun tarif spécifique trouvé, utilisation du premier tarif disponible");
    }

    // Validation finale du prix
    if (!selectedTarif || !selectedTarif.price || typeof selectedTarif.price !== 'number' || selectedTarif.price <= 0) {
      throw new Error(`Prix invalide pour le tarif ${selectedTarif?.nameTarif || 'inconnu'}: ${selectedTarif?.price || 'N/A'}`);
    }

    const result = {
      tarifName: selectedTarif.nameTarif,
      price: selectedTarif.price, // 100% depuis l'API/cache
      isSameZone: isSameZone,
      tarifId: selectedTarif.id,
      source: "CACHE/API" // Pour confirmer la source
    };

    console.log("✅ PRIX CALCULÉ DEPUIS LES VRAIES DONNÉES:", {
      tarif: result.tarifName,
      price: `${result.price} FCFA`,
      source: result.source,
      tarifId: result.tarifId
    });

    return result;
  };

  // **FONCTION CORRIGÉE** : handleSubmit avec vraies données
  const handleSubmit = async () => {
    if (!departureStation || !arrivalStation) {
      setError("Veuillez sélectionner une station de départ et d'arrivée");
      return;
    }
    
    if (departureStation.stationId === arrivalStation.stationId) {
      setError("Les stations de départ et d'arrivée ne peuvent pas être identiques");
      return;
    }

    if (!operator) {
      setError("Aucun opérateur sélectionné");
      return;
    }

    setError(null);
    setLoading(true);
    
    try {
      console.log("🔄 Démarrage du processus de réservation...");
      
      // Essayer d'abord avec les données déjà chargées
      let operatorPricingData = currentOperatorPricingData;
      
      // Si pas de données en cache, les récupérer
      if (!operatorPricingData) {
        console.log("🔄 Récupération des données de pricing...");
        operatorPricingData = await fetchOperatorPricingData(operator.id);
      }
      
      if (!operatorPricingData) {
        throw new Error("Impossible de récupérer les données de l'opérateur");
      }
      
      console.log("✅ Données récupérées, calcul du prix...");
      
      // Calcul du prix - EXCEPTION lancée si problème
      const pricingInfo = calculatePricing(
        departureStation.zoneId, 
        arrivalStation.zoneId, 
        operatorPricingData
      );

      console.log("💰 PRIX FINAL (100% depuis les vraies données):", {
        price: pricingInfo.price,
        tarif: pricingInfo.tarifName,
        source: pricingInfo.source
      });
      
      // Continuer avec la navigation...
      const reservationData = {
        operatorId: operator.id,
        operatorName: operator.name,
        operatorLogoUrl: operator.logoUrl,
        operatorType: "BRT",
        ticketValidity: "1 heure",
        
        departureStationId: departureStation.stationId,
        departureStationName: departureStation.stationName,
        departureZoneId: departureStation.zoneId,
        departureZoneName: departureStation.zoneName,
        
        arrivalStationId: arrivalStation.stationId,
        arrivalStationName: arrivalStation.stationName,
        arrivalZoneId: arrivalStation.zoneId,
        arrivalZoneName: arrivalStation.zoneName,
        
        amount: pricingInfo.price, // 100% depuis les vraies données
        tarifType: pricingInfo.tarifName,
        tarifId: pricingInfo.tarifId,
        
        ticketCount: 1,
        date: new Date().toISOString(),
        status: "pending",
        createdAt: new Date().toISOString()
      };
      
      // Navigation...
      router.push({
        pathname: "/pages/Paiement/paiementUrbain/paiement",
        params: {
          amount: reservationData.amount.toString(), // Prix depuis les vraies données
          operatorName: reservationData.operatorName,
          tarifType: reservationData.tarifType,
          departureStation: reservationData.departureStationName,
          arrivalStation: reservationData.arrivalStationName,
          destination: reservationData.arrivalStationName,
          
          // Données de l'opérateur
          operatorType: reservationData.operatorType,
          operatorId: reservationData.operatorId,
          operatorLogoUrl: reservationData.operatorLogoUrl,
          ticketValidity: "1 heure",
          
          // Données additionnelles
          ticketCount: reservationData.ticketCount.toString(),
          zoneName: reservationData.arrivalZoneName,
          zoneType: "BRT",
          code: `BRT${Date.now()}`,
          status: reservationData.status,
          createdAt: reservationData.createdAt,
          
          // Données des zones de départ et d'arrivée
          departureZoneId: reservationData.departureZoneId,
          departureZoneName: reservationData.departureZoneName,
          arrivalZoneId: reservationData.arrivalZoneId,
          arrivalStationId: reservationData.arrivalStationId,
          departureStationId: reservationData.departureStationId,
          arrivalZoneName: reservationData.arrivalZoneName
        }
      });
      
    } catch (error) {
      console.error("❌ Erreur:", error instanceof Error ? error.message : 'Erreur inconnue');
      setError(`Erreur de tarification: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  // Rendu d'un item de zone avec ses stations - design exact de reservationDDK
  const renderZoneWithStationsItem = ({ item }: { item: Zone }) => (
    <View style={tw`mb-6`}>
      {/* En-tête de la zone */}
      <View style={tw`bg-gray-50 px-4 py-3 rounded-t-lg mb-0 border-b border-gray-200`}>
        <Text style={tw`text-base font-semibold text-black`}>{item.name}</Text>
        <Text style={tw`text-xs text-gray-600 mt-1`}>{item.stations.length} stations</Text>
      </View>
      
      {/* Ligne droite avec stations */}
      <View style={tw`bg-white rounded-b-lg overflow-hidden`}>
        <View style={tw`relative`}>
          {/* Ligne verticale continue */}
          <View style={tw`absolute left-6 top-0 bottom-0 w-0.5 bg-gray-300`} />
          
          {item.stations
            .filter(station => {
              // Si on choisit l'arrivée, on masque la station de départ
              if (modalMode === 'arrival' && departureStation) {
                return station.id !== departureStation.stationId;
              }
              // Si on choisit le départ, on masque la station d'arrivée
              if (modalMode === 'departure' && arrivalStation) {
                return station.id !== arrivalStation.stationId;
              }
              return true;
            })
            .map((station, index) => (
              <TouchableOpacity
                key={station.id}
                style={tw`flex-row items-center py-4 px-5 active:bg-gray-50`}
                onPress={() => handleStationSelect(item.id, item.name, station)}
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
  );

  const customBackgroundImage = (
    <Image 
      source={require("../../../assets/images/BRTImage.png")}  
      style={tw`w-full h-full absolute rounded-b-lg`} 
      resizeMode="cover"
    />
  );

  const homeImages = [
    { id: '1', image: require('../../../assets/images/pub.png') },
    { id: '2', image: require('../../../assets/images/DDK.png') },
    { id: '3', image: require('../../../assets/images/TER.png') },
  ];

  return (
    <HeaderComponent 
      showGreetings={false}
      userName={userName}
      operator={brtOperator}
      showOperator={false}
      customStyle={tw`h-70 bg-teal-800 rounded-b-lg`}
      customLeftComponent={customBackgroundImage}
    >
      <ScrollView>
        {/* Affichage des opérateurs */}
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

        {/* Message d'erreur */}
        {error && (
          <View style={tw`bg-red-100 p-2 rounded-md mx-4 mb-3`}>
            <Text style={tw`text-red-700 text-center`}>{error}</Text>
          </View>
        )}

        {/* Champ départ */}
        <TouchableOpacity 
          style={tw`flex-row items-center rounded-lg bg-[#F1F2F6] p-4 mx-4 mb-3`}
          onPress={() => openModal('departure')}
          disabled={!operatorZones.length}
        >
          <View style={tw`h-8 w-8 items-center justify-center rounded-full `}>
            <Ionicons name="radio-button-on-outline" size={18} color="#888" />
          </View>
          <View style={tw`flex-1 ml-3`}>
            {operatorZones.length > 0 ? (
              departureStation ? (
                <View>
                  <Text style={tw`text-xs text-gray-500 mb-0.5`}>Zone: {departureStation.zoneName}</Text>
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
          onPress={() => openModal('arrival')}
          disabled={!operatorZones.length}
        >
          <View style={tw`h-8 w-8 items-center justify-center rounded-full `}>
            <Ionicons name="location-outline" size={18} color="#888" />
          </View>
          <View style={tw`flex-1 ml-3`}>
            {operatorZones.length > 0 ? (
              arrivalStation ? (
               <View>
                 <Text style={tw`text-xs text-gray-500 mb-0.5`}>Zone: {arrivalStation.zoneName}</Text>
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
        
        {/* Affichage dynamique du prix */}
       {/*  <View style={tw`px-6 mb-2`}>
          {operator && departureStation && arrivalStation ? (
            <Text style={tw`text-lg font-bold text-green-700`}>
              Prix : {(() => {
                try {
                  const operatorPricingData = currentOperatorPricingData;
                  if (!operatorPricingData) return <Text style={tw`text-base text-gray-400`}>Chargement du prix...</Text>;
                  const pricingInfo = calculatePricing(
                    departureStation.zoneId,
                    arrivalStation.zoneId,
                    operatorPricingData
                  );
                  return pricingInfo.price + ' FCFA';
                } catch {
                  return <Text style={tw`text-base text-red-500`}>Prix non disponible</Text>;
                }
              })()}
            </Text>
          ) : (
            <Text style={tw`text-base text-gray-400`}>Sélectionnez les stations pour voir le prix</Text>
          )}
        </View> */}
        {/* Bouton de paiement */}
        <View style={tw`px-4 mb-6`}>
          <TouchableOpacity 
            style={tw`bg-[#094741] py-3 rounded-md items-center mb-4 ${(!departureStation || !arrivalStation || loading || !operator || !operatorZones.length) ? 'opacity-50' : ''}`}
            onPress={handleSubmit}
            disabled={!departureStation || !arrivalStation || loading || !operator || !operatorZones.length}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={tw`text-white font-semibold text-base`}>Confirmer</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Zone de publicité */}
        <DynamicCarousel 
          customImages={homeImages}
          autoScrollInterval={4000}
          height="h-32"
          activeDotColor="bg-green-600"
        />        
      </ScrollView>

      {/* Modal pour la sélection des stations - design exact de reservationDDK */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={tw`flex-1 bg-black bg-opacity-50 justify-end`}>
          <View style={tw`bg-white rounded-t-xl pt-2 pb-6 h-3/4`}>
            <View
              style={tw`flex-row justify-between items-center px-6 py-4 border-b border-gray-200 bg-white`}
            >
              <View style={tw`flex-1`}>
                <Text style={tw`text-lg font-bold text-black`}>
                  {modalMode === 'departure' ? 'Sélectionnez votre départ' : 'Sélectionnez votre arrivée'}
                </Text>
                <Text style={tw`text-sm text-gray-600 mt-1`}>
                  {operator?.name || 'BRT'} • {operatorZones.length} zones disponibles
                </Text>
              </View>
              <TouchableOpacity 
                style={tw`h-8 w-8 items-center justify-center rounded-full bg-gray-100`}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#374151" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={operatorZones}
              renderItem={renderZoneWithStationsItem}
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
          </View>
        </View>
      </Modal>
    </HeaderComponent>
  );
}

export default function ReservationScreen() {
  return (
    <OperatorProvider>
      <ReservationScreens />
    </OperatorProvider>
  );
}