import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, FlatList, Image, ActivityIndicator } from 'react-native';
import * as React from 'react';

import HeaderComponent from '../../../constants/headerpage/HeaderComponent';
import tw from '../../../tailwind';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import { useRoute } from "@react-navigation/native";
import DynamicCarousel from "../../../components/Carrousel";
import { ToastRefType } from "../home/composant/types";
import { useOperators, OperatorProvider } from "../../../constants/contexte/OperatorContext";
import { getDemDikk } from "../../../services/api/api";

interface Station {
  id: string;
  name: string;
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
  isUrbainStatus: boolean | string;
  ticketValidity: string;
}
interface SelectedStation {
  zoneId: string;
  zoneName: string;
  stationId: string;
  stationName: string;
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


function ReservationScreens() {
  const router = useRouter();
  const route = useRoute();
  const userName = "Rama Seck";
  const toastRef = useRef<ToastRefType>(null);
  
  // Utilisation du hook useOperators pour accéder aux opérateurs
  const { 
    operators, 
    selectedOperator, 
    setSelectedOperator: setContextOperator, 
    loading: operatorsLoading, 
    error: operatorsError,
    refreshOperators 
  } = useOperators();
  
  // États pour les stations sélectionnées
  const [departureStation, setDepartureStation] = useState<SelectedStation | null>(null);
  const [arrivalStation, setArrivalStation] = useState<SelectedStation | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
    console.log(operator);
    
  
  // États pour les modals
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'departure' | 'arrival'>('departure');
  
  // État pour le modal de sélection de zone
  const [zoneModalVisible, setZoneModalVisible] = useState(false);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  // État pour le modal d'information des zones et stations
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [selectedZoneInfo, setSelectedZoneInfo] = useState<any>(null);
  
  // États pour la réservation
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // État pour stocker toutes les zones de l'opérateur sélectionné
  const [operatorZones, setOperatorZones] = useState<Zone[]>([]);

  // Ajoute un flag pour savoir si les données ont déjà été chargées
  const [hasLoadedZones, setHasLoadedZones] = useState(false);

  // État pour les données Dem Dikk
  const [demDikkData, setDemDikkData] = useState<any[]>([]);
  const [loadingDemDikk, setLoadingDemDikk] = useState(false);

  // État pour le prix du ticket
  const [ticketPrice, setTicketPrice] = useState<number | null>(null);

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
  console.log(operatorId);
  

  // Fonction pour charger les données Dem Dikk
  const loadDemDikkData = async () => {
    if (hasLoadedZones || demDikkData.length > 0) return;

    setLoadingDemDikk(true);
    try {
      console.log("🔍 Chargement des données Dem Dikk...");
      const data = await getDemDikk();
      console.log("✅ Données Dem Dikk reçues:", data);

      if (data && Array.isArray(data)) {
        setDemDikkData(data);
        
        // Convertir les données Dem Dikk en format Zone (utiliser les Line)
        const zones: Zone[] = [];
        
        data.forEach((operator: any) => {
          if (operator.Line && operator.Line.length > 0) {
            // Trier les lignes par ordre
            const sortedLines = operator.Line.sort((a: any, b: any) => {
              const orderA = a.order || 0;
              const orderB = b.order || 0;
              return orderA - orderB;
            });

            console.log(`📋 Lignes triées pour ${operator.name}:`);
            sortedLines.forEach((line: any, index: number) => {
              console.log(`  ${index + 1}. ${line.name} (ordre: ${line.order})`);
            });

            sortedLines.forEach((line: any) => {
              // Collecter toutes les stations de cette ligne
              const allStations: Station[] = [];
              
              if (line.Zone && line.Zone.length > 0) {
                // Trier les zones par ordre
                const sortedZones = line.Zone.sort((a: any, b: any) => {
                  const orderA = a.order || 0;
                  const orderB = b.order || 0;
                  return orderA - orderB;
                });

                sortedZones.forEach((zone: any) => {
                  if (zone.StationBRT && zone.StationBRT.length > 0) {
                    // Trier les stations par ordre
                    const sortedStations = zone.StationBRT.sort((a: any, b: any) => {
                      const orderA = a.order || 0;
                      const orderB = b.order || 0;
                      return orderA - orderB;
                    });

                    sortedStations.forEach((station: any) => {
                      allStations.push({
                        id: station.id,
                        name: station.name || "Station",
                      });
                    });
                  }
                });
              }

              zones.push({
                id: line.id,
                name: line.name || "Ligne Dem Dikk",
                stations: allStations
              });
            });
          }
        });

        setOperatorZones(zones);
        setHasLoadedZones(true);
        console.log("✅ Zones Dem Dikk converties:", zones);
      }
    } catch (error) {
      console.error("❌ Erreur lors du chargement des données Dem Dikk:", error);
      if (toastRef.current) {
        toastRef.current.show(
          "Erreur de connexion",
          "Impossible de charger les lignes Dem Dikk. Veuillez réessayer.",
          "error"
        );
      }
    } finally {
      setLoadingDemDikk(false);
    }
  };

  // Fonction pour récupérer les zones et leurs stations
  const getZonesWithStations = () => {
    if (!selectedZone || !demDikkData.length) return [];

    console.log("🔍 Recherche des zones pour la ligne:", selectedZone.name);
    console.log("📊 Données Dem Dikk disponibles:", demDikkData.length, "opérateurs");

    // Parcourir tous les opérateurs pour trouver la ligne sélectionnée
    for (const operator of demDikkData) {
      if (operator.Line && operator.Line.length > 0) {
        // Chercher la ligne qui correspond à la zone sélectionnée
        const selectedLine = operator.Line.find((line: any) => line.id === selectedZone.id);
        if (selectedLine && selectedLine.Zone && selectedLine.Zone.length > 0) {
                      console.log("✅ Ligne trouvée:", selectedLine.name, "avec", selectedLine.Zone.length, "zones");
            
            // Trier les zones par ordre
            const sortedZones = selectedLine.Zone.sort((a: any, b: any) => {
              const orderA = a.order || 0;
              const orderB = b.order || 0;
              return orderA - orderB;
            });

            console.log("📋 Zones triées par ordre:");
            sortedZones.forEach((zone: any, index: number) => {
              console.log(`  ${index + 1}. ${zone.name} (ordre: ${zone.order})`);
            });

          // Convertir les zones en format pour l'affichage
          const zonesWithStations = sortedZones.map((zone: any) => {
            // Trier les stations par ordre
            const sortedStations = zone.StationBRT?.sort((a: any, b: any) => {
              const orderA = a.order || 0;
              const orderB = b.order || 0;
              return orderA - orderB;
            }).map((station: any) => ({
              id: station.id,
              name: station.name,
            })) || [];
            
            console.log(`Zone ${zone.name} (ordre: ${zone.order}): ${sortedStations.length} stations`);
            
            // Log des stations triées par ordre
            sortedStations.forEach((station: any, index: number) => {
              console.log(`    Station ${index + 1}: ${station.name} (ordre: ${station.order})`);
            });
            
            return {
              zoneId: zone.id,
              zoneName: zone.name,
              stations: sortedStations
            };
          }).filter((zoneData: any) => {
            // Filtrer les stations selon le mode (départ/arrivée)
            if (modalMode === "departure" && arrivalStation) {
              zoneData.stations = zoneData.stations.filter((station: any) => 
                station.id !== arrivalStation.stationId
              );
            }
            if (modalMode === "arrival" && departureStation) {
              zoneData.stations = zoneData.stations.filter((station: any) => 
                station.id !== departureStation.stationId
              );
            }
            return zoneData.stations.length > 0;
          });

          console.log("📋 Zones avec stations filtrées:", zonesWithStations.length);
          return zonesWithStations;
        }
      }
    }

    console.log("❌ Aucune ligne trouvée pour:", selectedZone.name);
    return [];
  };

  // Charger les données Dem Dikk au démarrage
  useEffect(() => {
    loadDemDikkData();
  }, [hasLoadedZones, demDikkData.length]);

  // Sélectionner l'opérateur DEM DIKK au démarrage (si disponible dans les paramètres)

  // Rafraîchir les opérateurs si nécessaire
  useEffect(() => {
    if (operatorsError) {
      // Affichage d'une erreur si les opérateurs n'ont pas pu être chargés
      if (toastRef.current) {
        toastRef.current.show(
          "Erreur de connexion", 
          "Impossible de charger les opérateurs. Veuillez vérifier votre connexion.",
          'error'
        );
      }
    }
  }, [operatorsError]);

  const openZoneModal = () => {
    setZoneModalVisible(true);
  };

  const handleZoneSelect = (zone: Zone) => {
    setSelectedZone(zone);
    setZoneModalVisible(false);

    // Trouver les informations détaillées de la zone sélectionnée
    const zoneDetails = demDikkData.find((op) => op.id === zone.id);
    if (zoneDetails) {
      setSelectedZoneInfo(zoneDetails);
      setInfoModalVisible(true);
    }

    // Réinitialiser les stations sélectionnées lorsqu'on change de zone
    setDepartureStation(null);
    setArrivalStation(null);
  };

  const openModal = (mode: 'departure' | 'arrival') => {
    // Vérifier qu'une zone est sélectionnée avant d'ouvrir le modal
    if (!selectedZone) {
      if (toastRef.current) {
        toastRef.current.show(
          "Sélection requise", 
          "Veuillez d'abord sélectionner une ligne",
          'info'
        );
      }
      return;
    }

    console.log(`🔍 Ouverture du modal ${mode} pour la ligne:`, selectedZone.name);
    console.log(`📊 Zones disponibles:`, getZonesWithStations().length);

    setModalMode(mode);
    setModalVisible(true);
  };

  const handleStationSelect = (zoneId: string, zoneName: string, station: Station) => {
    // Récupérer le vrai zoneId de la station BRT sélectionnée
    let realZoneId = zoneId;
    let realZoneName = zoneName;

    // Chercher la station BRT dans les données pour récupérer son vrai zoneId
    if (demDikkData.length > 0 && selectedZone) {
      for (const operator of demDikkData) {
        if (operator.Line && operator.Line.length > 0) {
          const selectedLine = operator.Line.find((line: any) => line.id === selectedZone.id);
          if (selectedLine && selectedLine.Zone && selectedLine.Zone.length > 0) {
            for (const zone of selectedLine.Zone) {
              if (zone.StationBRT && zone.StationBRT.length > 0) {
                const foundStation = zone.StationBRT.find((s: any) => s.id === station.id);
                if (foundStation) {
                  realZoneId = zone.id;
                  realZoneName = zone.name;
                  console.log("🔍 Station BRT trouvée:", foundStation.name);
                  console.log("📍 Vrai zoneId:", realZoneId);
                  console.log("📍 Vrai zoneName:", realZoneName);
                  break;
                }
              }
            }
          }
        }
      }
    }

    const selectedStationData = {
      zoneId: realZoneId,
      zoneName: realZoneName,
      stationId: station.id,
      stationName: station.name
    };
    
    if (modalMode === 'departure') {
      setDepartureStation(selectedStationData);
    } else {
      setArrivalStation(selectedStationData);
    }
    
    setModalVisible(false);

    // Récupérer automatiquement le prix uniquement quand on sélectionne la station de destination
    if (modalMode === "arrival") {
      console.log("🎯 Sélection de la station de destination:", selectedStationData.stationName);
      console.log("📍 ZoneId de la station de destination:", selectedStationData.zoneId);
      console.log("💰 État de ticketPrice avant récupération:", ticketPrice);
      
      if (departureStation) {
        console.log("✅ Station de départ déjà sélectionnée:", departureStation.stationName);
        console.log("🚀 Déclenchement de la recherche du prix...");
        const retrievedPrice = getTicketPriceFromDestinationZone(selectedStationData);
        console.log("💰 Prix récupéré par getTicketPriceFromDestinationZone:", retrievedPrice);
      } else {
        console.log("⏳ Station de départ pas encore sélectionnée, prix sera récupéré plus tard");
      }
    } else if (modalMode === "departure") {
      console.log("🎯 Sélection de la station de départ:", selectedStationData.stationName);
      // Ne pas déclencher la recherche du prix ici, attendre la sélection de la destination
    }
  };

  // Fonction pour récupérer le prix basé sur le zoneId de la station de destination
  const getTicketPriceFromDestinationZone = (destinationStation: any) => {
    console.log("🔍 === DÉBUT RECHERCHE PRIX ===");
    
    if (!destinationStation) {
      console.log("❌ Station de destination manquante");
      return;
    }
    
    if (!demDikkData.length) {
      console.log("❌ Données Dem Dikk non chargées");
      return;
    }
    
    if (!selectedZone) {
      console.log("❌ Aucune ligne sélectionnée");
      return;
    }

    console.log("🔍 Recherche du prix pour la station de destination:", destinationStation.stationName);
    console.log("📍 ZoneId de destination:", destinationStation.zoneId);
    console.log("📍 ZoneName de destination:", destinationStation.zoneName);
    console.log("📊 Données Dem Dikk disponibles:", demDikkData.length, "opérateurs");
    console.log("🚇 Ligne sélectionnée:", selectedZone.name);

    // Parcourir tous les opérateurs pour trouver la ligne sélectionnée
    for (const operator of demDikkData) {
      console.log("🔍 Vérification de l'opérateur:", operator.name);
      
      if (operator.Line && operator.Line.length > 0) {
        console.log("  📋 Lignes disponibles:", operator.Line.length);
        
        const selectedLine = operator.Line.find((line: any) => line.id === selectedZone.id);
        if (selectedLine) {
          console.log("  ✅ Ligne sélectionnée trouvée:", selectedLine.name);
          console.log("  📊 Zones dans cette ligne:", selectedLine.Zone?.length || 0);
          
          if (selectedLine.Zone && selectedLine.Zone.length > 0) {
            // Chercher la zone qui correspond au zoneId de la station de destination
            const destinationZone = selectedLine.Zone.find((zone: any) => zone.id === destinationStation.zoneId);
            
            if (destinationZone) {
              console.log("  ✅ Zone de destination trouvée:", destinationZone.name);
              console.log("  💰 Tarifs disponibles:", destinationZone.Tarif?.length || 0);
              
              // Chercher le tarif correspondant à cette zone
              if (destinationZone.Tarif && destinationZone.Tarif.length > 0) {
                const ticketPrice = destinationZone.Tarif[0].price || 250;
                console.log("  💰 Prix du ticket récupéré:", ticketPrice, "FCFA");
                console.log("  📋 Détails du tarif:", {
                  zoneId: destinationZone.id,
                  zoneName: destinationZone.name,
                  stationName: destinationStation.stationName,
                  price: ticketPrice,
                  currency: "FCFA"
                });
                
                // Stocker le prix dans l'état
                setTicketPrice(ticketPrice);
                console.log("  ✅ Prix stocké dans l'état:", ticketPrice);
                console.log("  🎯 Prix récupéré pour la station:", destinationStation.stationName);
                console.log("  🎯 Zone de destination:", destinationZone.name);
                console.log("  💰 Montant final:", ticketPrice, "FCFA");
                
                return ticketPrice;
              } else {
                console.log("  ⚠️ Aucun tarif trouvé pour la zone:", destinationZone.name);
              }
            } else {
              console.log("  ❌ Zone de destination non trouvée pour zoneId:", destinationStation.zoneId);
              console.log("  📋 Zones disponibles:", selectedLine.Zone.map((z: any) => ({ id: z.id, name: z.name })));
              console.log("  🔍 Recherche de correspondance...");
              
              // Afficher toutes les stations BRT pour déboguer
              selectedLine.Zone.forEach((zone: any, zoneIndex: number) => {
                if (zone.StationBRT && zone.StationBRT.length > 0) {
                  console.log(`    Zone ${zoneIndex + 1} (${zone.name}):`);
                  zone.StationBRT.forEach((station: any) => {
                    console.log(`      - ${station.name} (ID: ${station.id})`);
                  });
                }
              });
            }
          } else {
            console.log("  ❌ Aucune zone trouvée dans la ligne");
          }
        } else {
          console.log("  ❌ Ligne sélectionnée non trouvée dans cet opérateur");
        }
      } else {
        console.log("  ❌ Aucune ligne trouvée dans cet opérateur");
      }
    }

    console.log("❌ Impossible de récupérer le prix du ticket");
    console.log("🔍 === FIN RECHERCHE PRIX ===");
    return null;
  };

  const handleSubmit = async () => {
    if (!departureStation || !arrivalStation) {
      setError("Veuillez sélectionner une station de départ et d'arrivée");
      return;
    }
    
    if (departureStation.stationId === arrivalStation.stationId) {
      setError("Les stations de départ et d'arrivée ne peuvent pas être identiques");
      return;
    }
  
    if (!selectedOperator) {
      setError("Aucun opérateur sélectionné");
      return;
    }
  
    try {
      setLoading(true);

      // Récupérer le tarif de la station de destination
      let ticketPrice = getTicketPriceFromDestinationZone(arrivalStation) || 250; // Utilise le prix calculé ou 250 FCFA par défaut

      // Chercher le tarif dans les données Dem Dikk basé sur la station de destination
      if (demDikkData.length > 0 && arrivalStation && selectedZone) {
        const selectedOperator = demDikkData.find((op) => op.id === selectedZone.id);
        if (selectedOperator && selectedOperator.Line && selectedOperator.Line.length > 0) {
          // Trouver la ligne sélectionnée
          const selectedLine = selectedOperator.Line.find((line: any) => line.id === selectedZone.id);
          if (selectedLine && selectedLine.Zone && selectedLine.Zone.length > 0) {
            // Trier les zones par ordre pour la cohérence
            const sortedZones = selectedLine.Zone.sort((a: any, b: any) => {
              const orderA = a.order || 0;
              const orderB = b.order || 0;
              return orderA - orderB;
            });

            // Chercher la zone qui contient la station de destination
            for (const zone of sortedZones) {
              if (zone.StationBRT && zone.StationBRT.length > 0) {
                // Trier les stations par ordre
                const sortedStations = zone.StationBRT.sort((a: any, b: any) => {
                  const orderA = a.order || 0;
                  const orderB = b.order || 0;
                  return orderA - orderB;
                });

                // Chercher la station de destination dans les stations BRT triées
                const destinationStation = sortedStations.find(
                  (station: any) => station.id === arrivalStation.stationId
                );
                if (destinationStation) {
                  // Récupérer le tarif associé à cette zone
                  if (zone.Tarif && zone.Tarif.length > 0) {
                    ticketPrice = getTicketPriceFromDestinationZone(arrivalStation) || 250;
                    console.log(
                      `Prix récupéré depuis Dem Dikk API: ${ticketPrice} FCFA pour la station de destination ${destinationStation.name} (Zone: ${zone.name}, ordre: ${zone.order})`
                    );
                    break;
                  }
                }
              }
            }
          }
        }
      }
      
      // Générer des données de réservation avec le bon tarif
      const currentDate = new Date();
      const expirationDate = new Date(currentDate.getTime() + 1 * 60 * 60 * 1000); // 1 heure de validité

      console.log("💰 Prix du ticket avant génération des données:", ticketPrice);
      console.log("📍 Station de destination:", arrivalStation.stationName);
      console.log("📍 Zone de destination:", arrivalStation.zoneName);
      console.log("🏢 Données Dem Dikk disponibles:", demDikkData.length, "opérateurs");
      if (demDikkData.length > 0) {
        console.log("🏢 Premier opérateur Dem Dikk:", {
          id: demDikkData[0].id,
          name: demDikkData[0].name
        });
      }
      
      // Vérifier que le prix a été récupéré
      if (ticketPrice === null || ticketPrice === undefined) {
        console.log("⚠️ Prix non récupéré, utilisation du prix par défaut (250 FCFA)");
        setTicketPrice(250);
      } else {
        console.log("✅ Prix récupéré avec succès:", ticketPrice, "FCFA");
      }
      
      const mockReservationData = {
        id: `RES_${Date.now()}`, // ID unique basé sur timestamp
        amount: ticketPrice !== undefined && ticketPrice !== null ? ticketPrice : 250, // Vérification plus stricte du prix
        expiresAt: expirationDate.toISOString(),
        zoneType: selectedZone?.name || "Zone urbaine",
        zoneName: arrivalStation?.zoneName || selectedZone?.name || "Zone sélectionnée", // Utiliser la zone de la station d'arrivée
        ticketCount: 1,
        validityTime: expirationDate.toISOString()
      };

      console.log("📋 Données de réservation générées:", {
        operatorId: operator?.id,
        departureStationId: departureStation.stationId,
        arrivalStationId: arrivalStation.stationId,
        ticketPrice: ticketPrice,
        finalAmount: mockReservationData.amount,
        reservationData: mockReservationData,
      });

      console.log("🎯 État de ticketPrice avant création des paramètres:");
      console.log("  - ticketPrice:", ticketPrice);
      console.log("  - Type ticketPrice:", typeof ticketPrice);
      console.log("  - ticketPrice est null:", ticketPrice === null);
      console.log("  - ticketPrice est undefined:", ticketPrice === undefined);
      console.log("  - ticketPrice est truthy:", !!ticketPrice);

      // Préparer les paramètres pour la navigation
      const navigationParams = {
        // Paramètres de base
        departure: departureStation.stationName,
        destination: arrivalStation.stationName,
        arrivalStation: arrivalStation.stationName,
        departureStation: departureStation.stationName,
        destinationStation: arrivalStation.stationName,
        
        // Paramètres de l'opérateur
        operatorName: operator?.name || "Dem Dikk",
        operatorId: demDikkData.length > 0 ? demDikkData[0].id : "dem-dikk-default-id",
        operatorLogoUrl: demDikkData.length > 0 ? demDikkData[0].logoUrl : require("../../../assets/images/DDK.png"),
        operatorType: "Dem Dikk",
        
        // Paramètres des stations
        departureStationId: departureStation.stationId,
        arrivalStationId: arrivalStation.stationId,
        
        // Paramètres de réservation
        amount: (() => {
          const finalAmount = ticketPrice !== null && ticketPrice !== undefined ? ticketPrice : 250;
          console.log("💰 Prix final pour amount:", finalAmount);
          console.log("💰 Type du prix final:", typeof finalAmount);
          return finalAmount.toString();
        })(),
        expiresAt: mockReservationData.expiresAt,
        zone: mockReservationData.zoneType,
        zoneName: mockReservationData.zoneName,
        ticketCount: mockReservationData.ticketCount.toString(),
        id: mockReservationData.id,
        validityTime: mockReservationData.validityTime,
        
        // Paramètres supplémentaires pour compatibilité
        date: new Date().toISOString(),
        seat: "1",
        totalAvailableSeats: "50",
        departureTime: new Date().toLocaleTimeString(),
        price: (() => {
          const finalPrice = ticketPrice !== null && ticketPrice !== undefined ? ticketPrice : 250;
          console.log("💰 Prix final pour price:", finalPrice);
          console.log("💰 Type du prix final:", typeof finalPrice);
          return finalPrice;
        })(),
        tripId: mockReservationData.id,
        temporaryReservationId: mockReservationData.id,
        name: "Passager",
        phoneNumber: "",
        reserveId: mockReservationData.id,
        status: "pending",
        createdAt: new Date().toISOString(),
        methodePay: "OM",
        ticketId: mockReservationData.id,
        pendingExpiresAt: mockReservationData.expiresAt,
        
        // Paramètres spécifiques Dem Dikk
        lineNumber: selectedZone?.name || "",
        lineName: selectedZone?.name || "",
        validityDuration: "1 heure",
      };

      console.log("📤 Paramètres envoyés vers paiementUrbain:", navigationParams);
      console.log("💰 Prix envoyé dans 'amount':", navigationParams.amount);
      console.log("💰 Prix envoyé dans 'price':", navigationParams.price);
      console.log("💰 Type du prix amount:", typeof navigationParams.amount);
      console.log("💰 Type du prix price:", typeof navigationParams.price);
      console.log("🎯 Prix final transmis:", ticketPrice);
      console.log("🏢 ID Opérateur envoyé:", navigationParams.operatorId);
      console.log("🏢 Nom Opérateur envoyé:", navigationParams.operatorName);
      console.log("🏢 Logo Opérateur envoyé:", navigationParams.operatorLogoUrl);

      // Navigation vers la page de paiement avec les données complètes de la réservation
      router.push({
        pathname: "/pages/Paiement/paiementUrbain/paiement",
        params: navigationParams,
      });
      
    } catch (error) {
      console.error("Erreur lors de la préparation de la réservation:", error);
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };
  
  // Rendu d'un item de zone pour la liste de sélection
  const renderZoneItem = ({ item }: { item: Zone }) => (
    <TouchableOpacity 
      style={tw`bg-white rounded-xl mb-3 p-4 shadow-sm border border-gray-200`}
      onPress={() => handleZoneSelect(item)}
    >
      <Text style={tw`text-base font-medium text-gray-800`}>{item.name}</Text>
      <Text style={tw`text-sm text-gray-500 mt-1`}>{item.stations.length} stations</Text>
      <View style={tw`flex-row justify-end`}>
        <Ionicons name="chevron-forward" size={20} color="#094741" />
      </View>
    </TouchableOpacity>
  );

  // Rendu d'un item de zone avec ses stations pour le modal de sélection
  const renderZoneWithStationsItem = ({ item }: { item: any }) => (
    <View style={tw`mb-6`}>
      {/* En-tête de la zone */}
      <View style={tw`bg-gray-50 px-4 py-3 rounded-t-lg mb-0 border-b border-gray-200`}>
        <Text style={tw`text-base font-semibold text-black`}>{item.zoneName}</Text>
        <Text style={tw`text-xs text-gray-600 mt-1`}>{item.stations.length} stations</Text>
      </View>
      
      {/* Ligne droite avec stations */}
      <View style={tw`bg-white rounded-b-lg overflow-hidden`}>
        <View style={tw`relative`}>
          {/* Ligne verticale continue */}
          <View style={tw`absolute left-6 top-0 bottom-0 w-0.5 bg-gray-300`} />
          
          {item.stations.map((station: Station, index: number) => (
            <TouchableOpacity
              key={station.id}
              style={tw`flex-row items-center py-4 px-5 active:bg-gray-50`}
              onPress={() => handleStationSelect(selectedZone?.id || "", selectedZone?.name || "", station)}
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

  // Informations de l'opérateur
  const operatorInfo = {
    name: selectedOperator?.name || "Dem Dikk",
    slogan: (selectedOperator as any)?.slogan || "Transport urbain",
    transportType: "BUS"
  };

  const customBackgroundImage = (
    <Image 
      source={require("../../../assets/images/DDK.png")}  
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
      showDetails={false}
      userName={userName}
      operator={operatorInfo}
      showOperator={false}
      customStyle={tw`h-70 bg-teal-800 rounded-b-lg`}
      customLeftComponent={customBackgroundImage}
    >
      <ScrollView>
        {/* Affichage des opérateurs */}
        <View style={tw`px-6 py-4`}>
          <Text style={tw`text-2xl font-bold text-gray-800 mb-1`}>
            Achetez vos tickets Dem Dikk
          </Text>
          <Text style={tw`text-base text-gray-600 mb-4`}>
            Sélectionnez une ligne et choisissez vos stations
          </Text>
        </View>

        {/* Message d'erreur */}
        {error && (
          <View style={tw`bg-red-100 p-2 rounded-md mx-4 mb-3`}>
            <Text style={tw`text-red-700 text-center`}>{error}</Text>
          </View>
        )}

        {/* Bouton de sélection de ligne/zone */}
        <TouchableOpacity 
          style={tw`flex-row items-center rounded-lg bg-[#094741] p-4 mx-4 mb-6`}
          onPress={openZoneModal}
        >
          <View style={tw`h-8 w-8 items-center justify-center rounded-full bg-white bg-opacity-20`}>
            <Ionicons name="git-branch-outline" size={20} color="#ffffff" />
          </View>
          <View style={tw`flex-1 ml-3`}>
            <Text style={tw`text-base font-medium text-white`}>
              {selectedZone ? selectedZone.name : "Sélectionnez une ligne"}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={20} color="#ffffff" />
        </TouchableOpacity>

        {/* Champ départ - visible uniquement si une zone est sélectionnée */}
        {selectedZone && (
          <TouchableOpacity 
            style={tw`flex-row items-center rounded-lg bg-[#F1F2F6] p-6 mx-4 mb-3`}
            onPress={() => openModal('departure')}
          >
            <View style={tw`h-8 w-8 items-center justify-center rounded-full `}>
              <Ionicons name="radio-button-on-outline" size={18} color="#888" />
            </View>
            <View style={tw`flex-1 ml-3`}>
              {departureStation ? (
                <View>
                  <Text style={tw`text-xs text-gray-500 mb-0.5`}>Zone: {departureStation.zoneName}</Text>
                  <Text style={tw`text-base font-medium text-gray-900`}>{departureStation.stationName}</Text>
                </View>
              ) : (
                <Text style={tw`text-base text-gray-600`}>
                  Station de départ
                </Text>
              )}
            </View>
            <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
        
        {/* Champ destination - visible uniquement si une zone est sélectionnée */}
        {selectedZone && (
          <TouchableOpacity 
            style={tw`flex-row items-center rounded-lg bg-[#F1F2F6] p-4 mx-4 mb-7`}
            onPress={() => openModal('arrival')}
          >
            <View style={tw`h-8 w-8 items-center justify-center rounded-full`}>
              <Ionicons name="location-outline" size={18} color="#888" />
            </View>
            <View style={tw`flex-1 ml-3`}>
              {arrivalStation ? (
               <View>
                 <Text style={tw`text-xs text-gray-500 mb-0.5`}>Zone: {arrivalStation.zoneName}</Text>
                 <Text style={tw`text-base font-medium text-gray-900`}>{arrivalStation.stationName}</Text>
               </View>
              ) : (
                <Text style={tw`text-base text-gray-600`}>
                  Station de destination
                </Text>
              )}
            </View>
            <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}

        {/* Affichage du prix et bouton de paiement - visible uniquement si une zone est sélectionnée */}
        {selectedZone && (
          <View style={tw`px-4 mb-6`}>
            {/* Affichage du prix */}
            {ticketPrice && departureStation && arrivalStation && (
              <View style={tw`bg-green-50 border border-green-200 rounded-lg p-4 mb-4`}>
                <View style={tw`flex-row items-center justify-between`}>
                  <View>
                    <Text style={tw`text-sm text-green-700 font-medium`}>Prix du ticket</Text>
                    <Text style={tw`text-xs text-green-600`}>{arrivalStation.zoneName}</Text>
                  </View>
                  <View style={tw`items-end`}>
                    <Text style={tw`text-lg font-bold text-green-700`}>{ticketPrice} FCFA</Text>
                    
                  </View>
                </View>
              </View>
            )}
            
            {/* Log pour déboguer l'affichage du prix */}
            {(() => {
              console.log("🎯 État de l'affichage du prix:");
              console.log("  - ticketPrice:", ticketPrice);
              console.log("  - departureStation:", departureStation?.stationName);
              console.log("  - arrivalStation:", arrivalStation?.stationName);
              console.log("  - Affichage activé:", !!(ticketPrice && departureStation && arrivalStation));
              console.log("  - ticketPrice est truthy:", !!ticketPrice);
              console.log("  - departureStation est truthy:", !!departureStation);
              console.log("  - arrivalStation est truthy:", !!arrivalStation);
              return null;
            })()}

            <TouchableOpacity
              style={tw`bg-[#094741] py-3 rounded-md items-center mb-4 ${
                !departureStation || !arrivalStation ? "opacity-50" : ""
              }`}
              onPress={handleSubmit}
              disabled={!departureStation || !arrivalStation || !selectedOperator}
            >
              {loading ? (
                <View style={tw`flex-row items-center`}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={tw`ml-2 text-white font-semibold text-base`}>Préparation...</Text>
                </View>
              ) : (
                <Text style={tw`text-white font-semibold text-base`}>Confirmer</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modal pour la sélection des zones */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={zoneModalVisible}
        onRequestClose={() => setZoneModalVisible(false)}
      >
        <View style={tw`flex-1 bg-black bg-opacity-50 justify-end`}>
          <View style={tw`bg-white rounded-t-xl pt-2 pb-6 h-3/4`}>
            <View style={tw`flex-row justify-between items-center px-4 py-2 border-b border-gray-200`}>
              <Text style={tw`text-lg font-bold text-[#094741]`}>
                Sélectionnez une ligne
              </Text>
              <TouchableOpacity onPress={() => setZoneModalVisible(false)}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={operatorZones}
              renderItem={renderZoneItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={tw`pt-2 pb-6 px-4`}
              ListEmptyComponent={
                <View style={tw`py-8 items-center`}>
                  {loadingDemDikk ? (
                    <View style={tw`items-center`}>
                      <ActivityIndicator size="large" color="#094741" />
                      <Text style={tw`text-gray-500 text-center mt-2`}>
                        Chargement des lignes Dem Dikk...
                      </Text>
                    </View>
                  ) : (
                    <Text style={tw`text-gray-500 text-center`}>
                      Aucune ligne Dem Dikk disponible
                    </Text>
                  )}
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Modal pour la sélection des stations */}
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
                  {modalMode === "departure"
                    ? "Sélectionnez votre départ"
                    : "Sélectionnez votre arrivée"}
                </Text>
                <Text style={tw`text-sm text-gray-600 mt-1`}>
                  {selectedZone?.name} • {getZonesWithStations().length} zones disponibles
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
              data={getZonesWithStations()}
              renderItem={renderZoneWithStationsItem}
              keyExtractor={(item) => item.zoneId}
              contentContainerStyle={tw`pt-4 pb-6 px-4`}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={tw`py-12 items-center`}>
                  <View style={tw`h-16 w-16 rounded-full bg-gray-100 items-center justify-center mb-4`}>
                    <Ionicons name="location-outline" size={32} color="#6B7280" />
                  </View>
                  <Text style={tw`text-black text-center text-base font-medium`}>
                    Aucune zone disponible pour cette ligne
                  </Text>
                  <Text style={tw`text-gray-600 text-center text-sm mt-2`}>
                    Veuillez sélectionner une autre ligne
                  </Text>
                </View>
              }
              onLayout={() => {
                const zones = getZonesWithStations();
                console.log(`📋 Modal ${modalMode}: ${zones.length} zones à afficher`);
                zones.forEach((zone, index) => {
                  console.log(`Zone ${index + 1}: ${zone.zoneName} (${zone.stations.length} stations)`);
                });
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Modal d'information des zones et stations */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={infoModalVisible}
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <View style={tw`flex-1 bg-black bg-opacity-50 justify-end`}>
          <View style={tw`bg-white rounded-t-xl pt-2 pb-6 h-3/4`}>
            <View
              style={tw`flex-row justify-between items-center px-4 py-2 border-b border-gray-200`}
            >
              <Text style={tw`text-lg font-bold text-[#094741]`}>
                Informations de la ligne
              </Text>
              <TouchableOpacity onPress={() => setInfoModalVisible(false)}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <ScrollView style={tw`flex-1 px-4`}>
              {selectedZoneInfo && (
                <View style={tw`py-4`}>
                  <Text style={tw`text-xl font-bold text-gray-800 mb-4`}>
                    {selectedZoneInfo.name}
                  </Text>
                  
                  {selectedZoneInfo.Line && selectedZoneInfo.Line.map((line: any, lineIndex: number) => (
                    <View key={lineIndex} style={tw`mb-6`}>
                      <Text style={tw`text-lg font-semibold text-gray-700 mb-2`}>
                        Ligne: {line.name}
                      </Text>
                      
                      {line.Zone && line.Zone.map((zone: any, zoneIndex: number) => (
                        <View key={zoneIndex} style={tw`mb-4 bg-gray-50 p-3 rounded-lg`}>
                          <Text style={tw`text-base font-medium text-gray-600 mb-2`}>
                            Zone: {zone.name}
                          </Text>
                          
                          {zone.Tarif && zone.Tarif.length > 0 && (
                            <View style={tw`mb-2`}>
                              <Text style={tw`text-sm text-green-600 font-medium`}>
                                Tarif: {zone.Tarif[0].price} FCFA
                              </Text>
                            </View>
                          )}
                          
                          {zone.StationBRT && zone.StationBRT.length > 0 && (
                            <View>
                              <Text style={tw`text-sm text-gray-500 mb-1`}>
                                Stations ({zone.StationBRT.length}):
                              </Text>
                              {zone.StationBRT.map((station: any, stationIndex: number) => (
                                <View key={stationIndex} style={tw`flex-row items-center py-1`}>
                                  <View style={tw`h-2 w-2 rounded-full bg-[#094741] mr-2`} />
                                  <Text style={tw`text-sm text-gray-700`}>
                                    {station.name}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={tw`px-4 py-3 border-t border-gray-200`}>
              <TouchableOpacity
                style={tw`bg-[#094741] py-3 rounded-md items-center`}
                onPress={() => setInfoModalVisible(false)}
              >
                <Text style={tw`text-white font-semibold text-base`}>
                  Compris
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <DynamicCarousel
        customImages={homeImages}
        autoScrollInterval={4000}
        height="h-32"
        activeDotColor="bg-green-600"
      />
    </HeaderComponent>
  );
}

// Export le composant enveloppé dans l'OperatorProvider
export default function ReservationScreen() {
  return (
    <OperatorProvider>
      <ReservationScreens />
    </OperatorProvider>
  );
}