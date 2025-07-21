import React,{ useState, FC, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, Switch, ScrollView, Alert, Linking, Modal, ActivityIndicator, BackHandler, Platform } from 'react-native';
import tw from '../../../tailwind';
import { Ionicons } from '@expo/vector-icons';
import HeaderComponent from '../../../../constants/HearpageReserve/HeaderComponent';
import { useRouter, useLocalSearchParams } from "expo-router";
import { getUser, setToken, getToken, searchTickets, reserve, payement, payementUrbain, getOperator, reservationBRT } from '../../../../services/api/api';
import { jwtDecode, JwtPayload } from "jwt-decode";
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { usePaymentProtection } from '../../../../constants/contexte/PaymentProtectionContext';

// Définir le type des paramètres de la route - VERSION MISE À JOUR
type RouteParams = {
  departure: string;
  destination: string;
  date: string;
  seat: string;
  totalAvailableSeats: string;
  departureTime: string;
  price?: number;
  tripId: string;
  name: string;
  phoneNumber: string;
  reserveId?: string;
  temporaryReservationId: string;
  operatorName?: string;
  operatorLogoUrl?: string;
  operatorSlogan?: string;
  operatorCommission?: number;
  transportType?: string;
  passengers?: string;
  reservation?: string;

  // Paramètres BRT/TER/DemDikk
  id?: string;
  zoneName?: string;
  zoneType?: string;
  departureStation?: string;
  destinationStation?: string;
  arrivalStation?: string;
  amount?: string;
  ticketCount?: string;
  code?: string;
  zone?: string;
  status?: string;
  createdAt?: string;
  expiresAt?: string;
  methodePay?: string;
  ticketId?: string;
  pendingExpiresAt?: string;
  classe?: string;
  operatorType?: string;

  // NOUVEAUX PARAMÈTRES OBLIGATOIRES POUR LA NOUVELLE API
  operatorId?: string; // ID de l'opérateur (obligatoire)
  departureStationId?: string; // ID de la station de départ (obligatoire)
  departStationId?: string; // Fallback pour departureStationId
  arrivalStationId?: string; // ID de la station d'arrivée (obligatoire)

  // NOUVEAUX PARAMÈTRES OPTIONNELS
  classeType?: string; // Type de classe (optionnel) - ex: "Classe_1", "Classe_2"

  // Paramètres spécifiques à Dem Dikk
  lineNumber?: string;
  lineName?: string;
  validityDuration?: string;

  // Propriété pour gérer les réponses de réservation
  reservationData?: Record<string, any>;
  [key: string]: any; // Pour permettre l'indexation comme params[0]
};

interface PaymentResultData {
  
  deepLinks?: {
    maxitLink?: string;
    orangeMoneyLink?: string;
    
    waveDeepLink?: string;
    waveWebUrl?: string;
  };
  transactionCode?: string;
  reservationId?: string;
  qrCode?: string;
  sessionId?: string;
  validUntil?: string;
  paymentUrl?: string;
  paymentData?: any;
  selectedPayment?: string;
}

// Définir l'interface pour les trajets
interface Trip {
  tripId: string;
  departure: string;
  destination: string;
  departureTime: string;
  totalAvailableSeats: number;
  price: number;
  requestedSeats: number;
  temporaryReservationId: string;
  operatorName?: string;
  operatorLogoUrl?: string;
  operatorSlogan?: string;
  operatorCommission?: number;
  transportType?: string;
}

interface Passenger {
  id?: string;
  name: string;
  phoneNumber: string;
}

interface CustomJwtPayload extends JwtPayload {
  id: string;
  // Autres champs qui peuvent être dans votre token
}

// Interface pour les données BRT/TER
interface UrbainReservation {
  id: string;
  zoneName: string;
  zoneType: string;
  departureStation: string;
  arrivalStation: string;
  amount: string;
  ticketCount: string;
  code: string;
  zone: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  pendingExpiresAt: string;
  classe?: string; // Ajout pour le TER
  operatorType?: string; // Pour distinguer BRT/TER
}


export default function ExactPassengerForm() {
  const [saveProfile, setSaveProfile] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState('OM');
  const [isLoading, setIsLoading] = useState(false);
  const route = useRoute();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentResultData, setPaymentResultData] = useState<PaymentResultData | null>(null);

  // Utilisez useRoute au lieu de useLocalSearchParams
  const params = route.params as RouteParams;
  
  console.log("🚀 === DÉBUT LOGS PAIEMENT === ");
  console.log("📋 Paramètres reçus dans paiementUrbain:", params);
  console.log("🔍 Détails des paramètres:");
  console.log("  - Départ:", params.departure);
  console.log("  - Destination:", params.destination);
  console.log("  - Arrivée:", params.arrivalStation);
  console.log("  - Opérateur:", params.operatorName);
  console.log("  - Type Opérateur:", params.operatorType);
  console.log("💰 PRIX REÇUS:");
  console.log("  - amount:", params.amount);
  console.log("  - price:", params.price);
  console.log("  - Type amount:", typeof params.amount);
  console.log("  - Type price:", typeof params.price);
  console.log("📍 STATIONS:");
  console.log("  - Station Départ:", params.departureStation);
  console.log("  - Station Arrivée:", params.destinationStation || params.arrivalStation);
  console.log("  - ID Station Départ:", params.departureStationId);
  console.log("  - ID Station Arrivée:", params.arrivalStationId);
  console.log("🎫 RÉSERVATION:");
  console.log("  - Zone:", params.zoneName);
  console.log("  - Type Zone:", params.zoneType);
  console.log("  - ID Opérateur:", params.operatorId);
  console.log("  - Ticket Count:", params.ticketCount);
  console.log("  - ID Réservation:", params.id);
  console.log("  - Expires At:", params.expiresAt);
  console.log("  - Status:", params.status);
  console.log("📅 DATES:");
  console.log("  - Date:", params.date);
  console.log("  - Heure Départ:", params.departureTime);
  console.log("  - Créé le:", params.createdAt);
  console.log("  - Expire le:", params.expiresAt);
  console.log("🔧 PARAMÈTRES SPÉCIFIQUES:");
  console.log("  - Ligne:", params.lineName);
  console.log("  - Durée Validité:", params.validityDuration);
  console.log("  - Méthode Paiement:", params.methodePay);
  console.log("  - Trip ID:", params.tripId);
  console.log("  - Reserve ID:", params.reserveId);
  console.log("  - Temporary Reservation ID:", params.temporaryReservationId);
  console.log("🚀 === FIN LOGS PAIEMENT === ");
  console.log("🏢 Logo reçu dans params:", params.operatorLogoUrl);
  console.log("🏢 Type du logo:", typeof params.operatorLogoUrl);
  
  const router = useRouter();

  const destinationRoute = params.arrivalStation || "";

  // États pour stocker les données
  const [loading, setLoading] = useState(true);
  const [passengersList, setPassengersList] = useState<Passenger[]>([]);
  const [user, setUser] = useState<{ data?: { user?: { name: string; firstName: string; phoneNumber?: string; } } } | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [urbainReservation, setUrbainReservation] = useState<UrbainReservation | null>(null);
  const [tempReservationId, setTempReservationId] = useState('');
  const [reservationId, setReservationId] = useState<string | null>(null);

  // Hook de navigation sécurisée pour empêcher le retour pendant le paiement
  const {
    isPaymentProtected,
    hasPaymentStarted,
    startPaymentProtection,
    stopPaymentProtection
  } = usePaymentProtection();
 useFocusEffect(
      React.useCallback(() => {
        const onBackPress = () => {
          router.back();
          return true;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => backHandler.remove();
      }, [router])
    );
  // Remplace le useEffect par useFocusEffect pour le bouton retour
/*   useFocusEffect(
    React.useCallback(() => {
      const handleBackPress = () => {
        if (isLoading || hasPaymentStarted) {
          Alert.alert(
            "Paiement en cours",
            "Le paiement est en cours. Vous ne pouvez pas revenir en arrière. Voulez-vous aller à l'accueil ?",
            [
              {
                text: "Annuler",
                style: "cancel"
              },
              {
                text: "Accueil",
                onPress: () => {
                  stopPaymentProtection();
                  router.push('../../../pages/home/accueil');
                }
              }
            ],
            { cancelable: false }
          );
          return true;
        }
        return false;
      };
      const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
      return () => backHandler.remove();
    }, [isLoading, hasPaymentStarted, router, stopPaymentProtection])
  ); */

  // Déterminer explicitement le type d'opérateur dès le début
  const isBRT = params.operatorName === "Bus Rapid Transit" || params.operatorType === "BRT";
  const isTER = params.operatorName === "TER Senegal" || params.operatorType === "TER";
  const isDemDikk = params.operatorName === "Dem Dikk" || params.operatorType === "Dem Dikk";
  const isUrbain = isBRT || isTER || isDemDikk;

   

  
  const paymentOptions = [
    { id: 'OM', name: 'Orange Money', logo: require('../../../../assets/images/omoney.png') },
    { id: 'WAVE', name: 'Wave', logo: require('../../../../assets/images/wave.png') },
    // { id: 'mixe', name: 'Mixx Yas', logo: require('../../../../assets/images/yass.png') },
  ];

  // Récupérer les données utilisateur
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentToken = await getToken();
        console.log("[DEBUG] Token récupéré avant getUser (paiementUrbain):", currentToken);

        if (currentToken) {
          setToken(currentToken);
          try {
            const userData = await getUser(currentToken);
            if (userData) {
              setUser(userData);
              console.log("Données utilisateur récupérées:", userData);
            }
          } catch (userError) {
            console.error("Erreur lors de la récupération des données utilisateur:", userError);
          }
        }
      } catch (err) {
        console.error("Erreur lors de la récupération du token:", err);
      } finally {
        // On initialise les détails de réservation même si l'authentification échoue
        initializeReservationDetails();
      }
    };

    fetchUserData();
  }, []);

  // Initialiser les détails de réservation
  const initializeReservationDetails = useCallback(() => {
    try {
      console.log("🔧 === DÉBUT INITIALISATION RÉSERVATION ===");
      
      // Afficher tous les paramètres pour le débogage
      console.log("📋 Paramètres bruts reçus:", params);
      console.log("📊 Nombre de clés dans params:", Object.keys(params).length);
      console.log("🔑 Clés disponibles:", Object.keys(params));

      // Vérifier si params est un objet vide ou ne contient que __EXPO_ROUTER_key
      const hasRealParams = Object.keys(params).length > 0 &&
        (Object.keys(params).length > 1 || !Object.keys(params).includes('__EXPO_ROUTER_key'));

      console.log("✅ Paramètres valides détectés:", hasRealParams);

      if (!hasRealParams) {
        console.warn("⚠️ Paramètres manquants - utilisation des valeurs par défaut");
        // Utiliser des données factices pour le développement/test

        // Simuler les paramètres pour test
      }

      // Extraction des données de la réservation
      let reservationData = null;
      if (params.reservationData) {
        reservationData = params.reservationData;
        console.log("📋 Données de réservation trouvées dans params.reservationData");
      } else if (Array.isArray(params) && params[0] && typeof params[0] === 'object') {
        reservationData = params[0];
        console.log("📋 Données de réservation trouvées dans params[0]");
      } else {
        console.log("❌ Aucune donnée de réservation trouvée");
      }

      if (reservationData) {
        console.log("📋 Données de réservation détectées:", reservationData);
        console.log("🔍 Clés dans reservationData:", Object.keys(reservationData));

        // Assignez ces valeurs aux paramètres si elles n'existent pas déjà
        const updates = [];
        if (!params.amount && reservationData.amount) {
          params.amount = String(reservationData.amount);
          updates.push(`amount: ${reservationData.amount}`);
        }
        if (!params.zoneName && reservationData.zoneName) {
          params.zoneName = reservationData.zoneName;
          updates.push(`zoneName: ${reservationData.zoneName}`);
        }
        if (!params.zoneType && reservationData.zoneType) {
          params.zoneType = reservationData.zoneType;
          updates.push(`zoneType: ${reservationData.zoneType}`);
        }
        if (!params.code && reservationData.code) {
          params.code = reservationData.code;
          updates.push(`code: ${reservationData.code}`);
        }
        if (!params.ticketCount && reservationData.ticketCount) {
          params.ticketCount = String(reservationData.ticketCount);
          updates.push(`ticketCount: ${reservationData.ticketCount}`);
        }
        if (!params.id && reservationData.id) {
          params.id = reservationData.id;
          updates.push(`id: ${reservationData.id}`);
        }
        if (!params.expiresAt && reservationData.expiresAt) {
          params.expiresAt = reservationData.expiresAt;
          updates.push(`expiresAt: ${reservationData.expiresAt}`);
        }
        if (!params.status && reservationData.status) {
          params.status = reservationData.status;
          updates.push(`status: ${reservationData.status}`);
        }

        console.log("✅ Paramètres mis à jour:", updates);
        console.log("📋 Paramètres finaux après mise à jour:", params);
      }

      // Pour les transports urbains (BRT/TER)
      if (isUrbain) {
        console.log("🚇 === TRAITEMENT TRANSPORT URBAIN ===");
        console.log(`📋 Type d'opérateur détecté: ${isBRT ? 'BRT' : (isTER ? 'TER' : 'Dem Dikk')}`);
        console.log("🔍 Données urbaines détectées:", {
          id: params.id,
          operatorId: params.operatorId,
          zoneName: params.zoneName,
          departureStation: params.departureStation,
          arrivalStation: params.destinationStation || params.arrivalStation,
          departureStationId: params.departureStationId || params.departStationId,
          arrivalStationId: params.arrivalStationId,
          amount: params.amount,
          ticketCount: params.ticketCount,
          classe: params.classe,
          classeType: params.classeType
        });

        // Création de l'objet UrbainReservation
        console.log("🏗️ === CRÉATION OBJET URBAIN RESERVATION ===");
        const urbainData: UrbainReservation = {
          id: params.id || "temp-id-" + Date.now(),
          zoneName: params.zoneName || "",
          zoneType: params.zoneType || "",
          departureStation: params.departureStation || "",
          arrivalStation: params.destinationStation || params.arrivalStation || "",
          amount: params.amount || "",
          ticketCount: params.ticketCount || "1",
          code: params.code || "",
          zone: params.zone || "",
          status: params.status || "",
          createdAt: params.createdAt || new Date().toISOString(),
          expiresAt: params.expiresAt || "",
          pendingExpiresAt: params.pendingExpiresAt || "",
          classe: params.classe || "",
          operatorType: isBRT ? "BRT" : (isTER ? "TER" : "DemDikk")
        };

        console.log("📋 Objet UrbainReservation créé:", urbainData);
        console.log("💰 Prix dans urbainData:", urbainData.amount);
        console.log("🎫 Nombre de tickets:", urbainData.ticketCount);
        console.log("📍 Station départ:", urbainData.departureStation);
        console.log("📍 Station arrivée:", urbainData.arrivalStation);
        console.log("🏢 Zone:", urbainData.zoneName);

        setUrbainReservation(urbainData);
        setReservationId(params.id || "temp-id-" + Date.now());
        console.log("✅ États mis à jour avec les données urbaines");
      } else {
        // Pour les opérateurs standard
        console.log("Opérateur standard détecté:", {
          name: params.operatorName,
          logoUrl: params.operatorLogoUrl,
          slogan: params.operatorSlogan,
          commission: params.operatorCommission,
          transportType: params.transportType
        });

        // Traiter les passagers
        if (params.passengers) {
          try {
            const parsedPassengers = JSON.parse(params.passengers);
            if (Array.isArray(parsedPassengers)) {
              setPassengersList(parsedPassengers);
              console.log("Passagers récupérés:", parsedPassengers);
            }
          } catch (parseError) {
            console.error("Erreur lors de l'analyse des passagers:", parseError);
          }
        }

        // Traiter la réservation
        if (params.reservation) {
          try {
            const parsedReservation = JSON.parse(params.reservation);
            if (parsedReservation && parsedReservation.reservationId) {
              setReservationId(parsedReservation.reservationId);
              console.log("ID de réservation récupéré:", parsedReservation.reservationId);
            }
          } catch (parseError) {
            console.error("Erreur lors de l'analyse de la réservation:", parseError);
          }
        } else if (params.reserveId) {
          // Utiliser reserveId comme fallback
          setReservationId(params.reserveId);
        }
      }
    } catch (err) {
      console.error("❌ Erreur lors de l'initialisation des détails de réservation:", err);
    } finally {
      setLoading(false);
      console.log("🔧 === FIN INITIALISATION RÉSERVATION ===");
    }
  }, [params, isBRT, isTER, isDemDikk, isUrbain]);

  // Initialiser les détails lors du chargement de la page
  useEffect(() => {
    initializeReservationDetails();
  }, [initializeReservationDetails]);

  // FONCTION DE PAIEMENT CORRIGÉE
  // FONCTION DE PAIEMENT MODIFIÉE AVEC CONDITIONS PAR OPÉRATEUR
  // FONCTION DE PAIEMENT MODIFIÉE AVEC CONDITIONS PAR OPÉRATEUR
  const handleSubmit = async () => {
    try {
      console.log("💳 === DÉBUT PAIEMENT ===");
      console.log("🔍 Données utilisées pour le paiement:");
      console.log("  - Opérateur ID:", params.operatorId);
      console.log("  - Prix:", params.amount);
      console.log("  - Méthode de paiement:", selectedPayment);
      console.log("  - Station départ ID:", params.departureStationId);
      console.log("  - Station arrivée ID:", params.arrivalStationId);
      console.log("  - Type opérateur:", params.operatorType);
      
      // Activer la protection permanente dès le début du paiement
      startPaymentProtection(`urbain_payment_${Date.now()}_${params.operatorId || 'unknown'}`);
      setIsLoading(true);

      // VALIDATION ET RÉCUPÉRATION SÉCURISÉE DU TOKEN
      let token = await getToken();

      if (isUrbain) {
        // Pour BRT/TER/Dem Dikk - VERSION AVEC CONDITIONS SPÉCIFIQUES

        if (!params.operatorId || params.operatorId.trim() === '') {
          Alert.alert("Erreur", "ID de l'opérateur manquant");
          return;
        }

        let operatorName = "Inconnu";
        let paymentResult;

        // Déterminer le type d'opérateur et préparer les données de paiement
        if (isBRT) {
          operatorName = "Bus Rapid Transit";
          console.log("Paiement BRT détecté");

          // Données spécifiques pour BRT
          const brtPaymentData = {
            operatorId: params.operatorId,
            departureStationId: params.departureStationId || params.departStationId,
            arrivalStationId: params.arrivalStationId,
            price: parseFloat(params.amount || "0"),
            methodePay: selectedPayment
          };

          console.log("Données de paiement BRT:", brtPaymentData);

          // Appel API pour BRT
          paymentResult = await payementUrbain(
            brtPaymentData.operatorId,
            null, // classeType non requis pour BRT
            brtPaymentData.departureStationId,
            brtPaymentData.arrivalStationId,
            null, // ticketCount non requis pour BRT
            brtPaymentData.price,
            brtPaymentData.methodePay,
            token
          );

        } else if (isDemDikk) {
          operatorName = "Dem Dikk";
          console.log("🚌 === PAIEMENT DEM DIKK ===");
          console.log("📋 Paiement Dem Dikk détecté");

          // Données spécifiques pour Dem Dikk
          const demDikkPaymentData = {
            operatorId: params.operatorId,
            departureStationId: params.departureStationId || params.departStationId,
            arrivalStationId: params.arrivalStationId,
            price: parseFloat(params.amount || "0"),
            methodePay: selectedPayment
          };

          console.log("📋 Données de paiement Dem Dikk:", demDikkPaymentData);
          console.log("💰 Prix final pour Dem Dikk:", demDikkPaymentData.price);
          console.log("📍 Station départ:", demDikkPaymentData.departureStationId);
          console.log("📍 Station arrivée:", demDikkPaymentData.arrivalStationId);
          console.log("💳 Méthode de paiement:", demDikkPaymentData.methodePay);

          // Appel API pour Dem Dikk
          paymentResult = await payementUrbain(
            demDikkPaymentData.operatorId,
            null, // classeType non requis pour Dem Dikk
            demDikkPaymentData.departureStationId,
            demDikkPaymentData.arrivalStationId,
            null, // ticketCount non requis pour Dem Dikk
            demDikkPaymentData.price,
            demDikkPaymentData.methodePay,
            token
          );

        } else if (isTER) {
          operatorName = "TER Senegal";
          console.log("Paiement TER détecté");

          const classeType = params.classeType || params.classe;
          const ticketCount = parseInt(params.ticketCount || "1");

          if (!classeType) {
            Alert.alert("Erreur", "Type de classe manquant pour le TER");
            return;
          }

          if (classeType.toLowerCase() === 'classe_1') {
            console.log("TER Classe 1 détecté - sans stations");

            // Données spécifiques pour TER Classe 1 (sans stations)
            const terClasse1PaymentData = {
              operatorId: params.operatorId,
              classeType: classeType,
              ticketCount: ticketCount,
              price: parseFloat(params.amount || "0"),
              methodePay: selectedPayment
            };

            console.log("Données de paiement TER Classe 1:", terClasse1PaymentData);

            // Appel API pour TER Classe 1
            paymentResult = await payementUrbain(
              terClasse1PaymentData.operatorId,
              terClasse1PaymentData.classeType,
              null, // departureStationId non requis pour Classe 1
              null, // arrivalStationId non requis pour Classe 1
              terClasse1PaymentData.ticketCount,
              terClasse1PaymentData.price,
              terClasse1PaymentData.methodePay,
              token
            );

          } else if (classeType.toLowerCase() === 'classe_2') {
            console.log("TER Classe 2 détecté - avec stations");

            // Vérifier que les stations sont présentes pour Classe 2
            if (!params.departureStationId && !params.departStationId) {
              Alert.alert("Erreur", "Station de départ manquante pour TER Classe 2");
              return;
            }

            if (!params.arrivalStationId) {
              Alert.alert("Erreur", "Station d&apos;arrivée manquante pour TER Classe 2");
              return;
            }

            // Données spécifiques pour TER Classe 2 (avec stations)
            const terClasse2PaymentData = {
              operatorId: params.operatorId,
              classeType: classeType,
              departureStationId: params.departureStationId || params.departStationId,
              arrivalStationId: params.arrivalStationId,
              ticketCount: ticketCount,
              price: parseFloat(params.amount || "0"),
              methodePay: selectedPayment
            };

            console.log("Données de paiement TER Classe 2:", terClasse2PaymentData);

            // Appel API pour TER Classe 2
            paymentResult = await payementUrbain(
              terClasse2PaymentData.operatorId,
              terClasse2PaymentData.classeType,
              terClasse2PaymentData.departureStationId,
              terClasse2PaymentData.arrivalStationId,
              terClasse2PaymentData.ticketCount,
              terClasse2PaymentData.price,
              terClasse2PaymentData.methodePay,
              token
            );

          } else {
            // Type de classe non reconnu pour TER
            Alert.alert("Erreur", `Type de classe TER non reconnu: ${classeType}`);
            return;
          }
        }

        console.log(`Paiement ${operatorName} effectué avec succès:`, paymentResult);

        // Créer les données passagers pour transport urbain
        const urbainPassengers = passengersList.length > 0 ? passengersList : [{
          name: user?.data?.user ? `${user.data.user.firstName} ${user.data.user.name}` : "Passager",
          phoneNumber: user?.data?.user?.phoneNumber || "77123456"
        }];

        // Validation du résultat de paiement
        if (!paymentResult) {
          throw new Error("Aucune réponse du serveur de paiement");
        }

        // Stocker les données de paiement pour utilisation ultérieure
        const resultData: PaymentResultData = {
          ...paymentResult,
          paymentData: {
            operatorId: params.operatorId,
            price: parseFloat(params.amount || "0"),
            passengers: urbainPassengers
          },
          selectedPayment
        };

        setPaymentResultData(resultData);

        // GESTION DES MODES DE PAIEMENT AVEC MODALES
        if (selectedPayment === 'OM') {
          console.log("Traitement paiement OM");
          console.log("maxitLink:", paymentResult?.deepLinks.maxitLink);
          console.log("orangeMoneyLink:", paymentResult?.deepLinks.orangeMoneyLink);

          if (paymentResult?.deepLinks.maxitLink || paymentResult?.deepLinks.orangeMoneyLink) {
            console.log("Ouverture du modal OM");
            setShowPaymentModal(true);
          } else {
            console.log("Aucun lien OM trouvé");
            Alert.alert("Erreur", "Liens de paiement Orange Money non disponibles");
          }
        } else if (selectedPayment === 'WAVE') {
          setPaymentResultData(resultData);
          const waveUrl = paymentResult?.paymentUrl || paymentResult?.redirectUrl;
          if (!waveUrl) {
            Alert.alert('Erreur', 'Lien de paiement Wave manquant.');
            return;
          }
          handlePaymentRedirect(waveUrl, 'Wave', paymentResult, urbainPassengers, operatorName);
        }

      } else {
        // Pour les réservations standard (non urbaines)
        // ... logique existante
      }

    } catch (error) {
      console.error("Erreur lors du paiement:", error);

      // Désactiver la protection en cas d'erreur
      stopPaymentProtection();

      // Gérer les différents types d'erreurs
      let errorMessage = "Une erreur est survenue lors du paiement.";

      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }

      Alert.alert("Erreur de paiement", errorMessage);

    } finally {
      setIsLoading(false);
    }
  };

  // FONCTION POUR GÉRER LA REDIRECTION VERS LES APPLICATIONS DE PAIEMENT
const handlePaymentRedirect = async (
    paymentLink: string,
    appName: string,
    paymentResult: any,
    passengers: any[],
    operatorName: string
  ) => {
    try {
      console.log("Tentative d'ouverture du lien:", paymentLink);

      if (!paymentLink) {
        throw new Error("Lien de paiement non disponible");
      }

      const canOpen = await Linking.canOpenURL(paymentLink);

      if (canOpen) {
        await Linking.openURL(paymentLink);

        // Fermer le modal après ouverture du lien
        setShowPaymentModal(false);

        // Désactiver la protection après ouverture du lien de paiement
        stopPaymentProtection();

        // Redirection après paiement avec délai
        setTimeout(() => {
          navigateToTicketPage(paymentResult, passengers, operatorName, 'PAID');
        }, 3000);

      } else {
        // Tentative d'ouverture directe même si canOpenURL retourne false
        try {
          await Linking.openURL(paymentLink);
          
          // Fermer le modal après ouverture du lien
          setShowPaymentModal(false);
          
          // Désactiver la protection après ouverture du lien de paiement
          stopPaymentProtection();
          
          // Redirection après paiement avec délai
          setTimeout(() => {
            navigateToTicketPage(paymentResult, passengers, operatorName, 'PAID');
          }, 3000);
          
        } catch (openError) {
          console.error("Impossible d'ouvrir le lien:", openError);
          Alert.alert("Erreur", `Impossible d'ouvrir ${appName}. Veuillez réessayer.`);
          setShowPaymentModal(false);
          stopPaymentProtection();
        }
      }
    } catch (error) {
      console.error("Erreur lien de paiement:", error);
      stopPaymentProtection();
      Alert.alert("Erreur", `Problème avec l'ouverture de ${appName}`);
      setShowPaymentModal(false);
    }
  };

  // FONCTION POUR GÉRER LE PAIEMENT DIRECT SANS MODAL
  /*const handleDirectPaymentSuccess = (
    paymentResult: any, 
    passengers: any[], 
    operatorName: string
  ) => {
    Alert.alert(
      "Information",
      "Paiement initié. Vous allez être redirigé vers votre ticket.",
      [ 
        {
          text: "OK",
          onPress: () => {
            stopPaymentProtection();
          }
        }
      ]
    );
  };*/

  // FONCTION POUR NAVIGUER VERS LA PAGE DE TICKET
  const navigateToTicketPage = (
    paymentResult: any,
    passengers: any[],
    operatorName: string,
    paymentStatus: string
  ) => {
    // Obtenir la date et heure actuelles d'achat du ticket
    const purchaseDate = new Date();
    const purchaseDateString = purchaseDate.toLocaleDateString('fr-FR');
    const purchaseTimeString = purchaseDate.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Préparer les params pour la redirection
    const commonParams = {
      departure: params.departureStation,
      destination: params.destinationStation || destinationRoute,
      bookingDate: purchaseDateString,
      bookingTime: purchaseTimeString,
      seat: params.ticketCount || "1",
      price: parseFloat(params.amount || "0"),
      ticketId: paymentResult?.data?.id || paymentResult?.ticketId || paymentResult?.reservationId,
      ticketCode: paymentResult?.data?.code || paymentResult?.ticketCode || paymentResult?.sessionId,
      code: paymentResult?.data?.code || paymentResult?.code || paymentResult?.sessionId,
      id: paymentResult?.data?.id || paymentResult?.id || paymentResult?.reservationId,
      amount: paymentResult?.data?.amount || parseFloat(params.amount || "0"),
      ticketNumbers: JSON.stringify(paymentResult?.ticketNumbers || []),
      operatorName: operatorName,
      operatorLogoUrl: params.operatorLogoUrl,
      operatorId: params.operatorId,
      operatorType: isDemDikk ? "DemDikk" : (isBRT ? "BRT" : "TER"),
      transportType: isDemDikk ? "BUS" : (isBRT ? "BRT" : "TER"),
      zoneName: params.zoneName,
      zoneType: params.zoneType,
      zone: params.zone,
      expiresAt: paymentResult?.validUntil || paymentResult?.data?.expiresAt || new Date(Date.now() + 3600000).toISOString(),
      validatedAt: paymentResult?.data?.validatedAt || purchaseDate.toISOString(),
      createdAt: paymentResult?.data?.createdAt || purchaseDate.toISOString(),
      status: paymentResult?.data?.status || "Valid",
      validityDuration: paymentResult?.data?.validityDuration || params.validityDuration,
      passengers: JSON.stringify(passengers),
      departureStationId: params.departureStationId || params.departStationId,
      arrivalStationId: params.arrivalStationId,
      departureStation: params.departureStation,
      destinationStation: params.destinationStation || destinationRoute,
      qrCode: paymentResult?.qrCode || "",
      paymentMethod: selectedPayment,
      paymentStatus: paymentStatus,
      sessionId: paymentResult?.sessionId,
      paymentUrl: paymentResult?.paymentUrl
    };

    // Ajouter les paramètres spécifiques selon le type d'opérateur
    let specificParams = {};

    if (isTER) {
      specificParams = {
        classe: params.classeType || params.classe,
        classeType: params.classeType || params.classe,
        ticketCount: params.ticketCount || "1"
      };
    } else if (isDemDikk) {
      specificParams = {
        lineNumber: params.lineNumber || paymentResult?.data?.lineNumber || "",
        lineName: params.lineName || paymentResult?.data?.lineName || "",
        validityDuration: paymentResult?.data?.validityDuration || params.validityDuration || "4 heures"
      };
    }

    // Fusionner les paramètres
    const routeParams = { ...commonParams, ...specificParams };

    console.log("Paramètres finaux pour redirection:", routeParams);

    // Rediriger vers la page de ticket
    router.push({
      pathname: "../../../pages/home/mestickets",
      params: routeParams
    });
  };


  // Obtenir la liste des passagers
  /*   const passengerList = passengersList.length > 0
      ? passengersList
      : user?.data?.user
        ? [{
            name: `${user.data.user.firstName} ${user.data.user.name}`,
            phoneNumber: user.data.user.phoneNumber || "77123456"
          }]
        : [{
            name: 'Passager',
            phoneNumber: '77123456'
          }];
   */
  // Extraire uniquement l'heure d'une date
  const extractTimeOnly = (dateString: string) => {
    if (!dateString) return '';

    const date = new Date(dateString);

    // Vérifier que la date est valide
    if (isNaN(date.getTime())) return '';

    // Retourner uniquement l'heure et les minutes
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  // Préparer les détails urbains pour le HeaderComponent
  const urbainDetails = isUrbain && (urbainReservation || params) ? {
    zoneName: urbainReservation?.zoneName || params.zoneName || "",
    zoneType: urbainReservation?.zoneType || params.zoneType || "",
    departureStation: urbainReservation?.departureStation || params.departureStation || "",
    arrivalStation: urbainReservation?.arrivalStation || params.destinationStation || "",
    zone: urbainReservation?.zone || params.zone || "",
    ticketCount: urbainReservation?.ticketCount || params.ticketCount || "1",
    code: urbainReservation?.code || params.code || "",
    amount: urbainReservation?.amount || params.amount || "0",
    status: urbainReservation?.status || params.status || "",
    createdAt: urbainReservation?.createdAt ? new Date(urbainReservation.createdAt).toLocaleString() :
      params.createdAt ? new Date(params.createdAt).toLocaleString() : new Date().toLocaleString(),
    expiresAt: urbainReservation?.expiresAt ? extractTimeOnly(urbainReservation.expiresAt) :
      params.expiresAt ? extractTimeOnly(params.expiresAt) : "",
    operatorType: isBRT ? "BRT" : (isTER ? "TER" : "DemDikk"),
    classe: isTER ? (urbainReservation?.classe || params.classe || "1") : undefined,
    classeType: params.classeType // Nouveau champ pour la nouvelle API
  } : null;

  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-white`}>
        <ActivityIndicator size="large" color="#094741" />
        <Text style={tw`mt-4 text-teal-800`}>Chargement des informations...</Text>
      </View>
    );
  }

  return (
    <HeaderComponent
      showDetail={true}
      showButtons={true}
      showButton={false}
      disableBackButton={isLoading}
      operator={{
        name: isBRT ? "Bus Rapid Transit" : (isTER ? "TER Senegal" : (isDemDikk ? "Dem Dikk" : (params.operatorName || "Opérateur"))),
        logoUrl: params.operatorLogoUrl || "",
        slogan: params.operatorSlogan || (isBRT ? "Transport urbain rapide" : (isTER ? "Train Express Régional" : (isDemDikk ? "Transport urbain" : ""))),
        commissionPassenger: Number(params.operatorCommission) || 0,
        transportType: isBRT ? "BRT" : (isTER ? "TER" : (isDemDikk ? "BUS" : (params.transportType || "BUS")))
      }}
      price={(() => {
        const finalPrice = Number(params.amount || params.price || 0);
        console.log("💰 Prix final affiché dans l'interface:", finalPrice);
        console.log("💰 Détails du prix:");
        console.log("  - params.amount:", params.amount);
        console.log("  - params.price:", params.price);
        console.log("  - Type amount:", typeof params.amount);
        console.log("  - Type price:", typeof params.price);
        return finalPrice;
      })()}
      requestedSeats={params.ticketCount || params.seat}
      showHeaderpaiement={true}
      date={params.date || new Date().toLocaleDateString('fr-FR')}
      brtDetails={urbainDetails} // Pour les détails BRT/TER/DemDikk
      departure={params.departureStation || params.departure || ""}
      destination={params.destinationStation || params.arrivalStation || ""}
    >
      <View style={tw`bg-white h-full p-6 pb-24`}>
        {/* Méthode de paiement */}
        <Text style={tw`text-teal-800 text-lg font-bold mb-4`}>Sélectionner votre mode de paiement</Text>

        {/* Options de paiement */}
        <View style={tw`mb-6`}>
          {paymentOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              onPress={() => setSelectedPayment(option.id)}
              style={tw`
                mb-4 p-4 rounded-xl
                ${selectedPayment === option.id ? 'bg-teal-50 border-2 border-teal-500' : 'bg-gray-50 border border-gray-100'}
                flex-row justify-between items-center
              `}
            >
              <View style={tw`flex-row items-center flex-1`}>
                <View style={tw`
                  h-10 w-10 rounded-lg bg-white shadow-sm mr-4 
                  items-center justify-center
                `}>
                  <Image
                    source={option.logo}
                    style={tw`h-6 w-8`}
                    resizeMode="contain"
                  />
                </View>

                <View>
                  <Text style={tw`text-gray-900 font-medium text-base`}>
                    {option.name}
                  </Text>
                  <Text style={tw`text-gray-500 text-sm mt-0.5`}>
                    Paiement instantané
                  </Text>
                </View>
              </View>

              <View style={tw`
                h-6 w-6 rounded-full border-2
                ${selectedPayment === option.id ? 'border-teal-500 bg-teal-500' : 'border-gray-300 bg-white'}
                items-center justify-center
              `}>
                {selectedPayment === option.id && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bouton de paiement */}
        <View style={tw``}>
          <TouchableOpacity
            onPress={handleSubmit}
            style={[
              tw`py-4 rounded-md items-center`,
              isLoading ? tw`bg-gray-400` : tw`bg-teal-800`
            ]}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={tw`flex-row items-center`}>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={tw`ml-2 text-white font-bold text-base uppercase font-semibold`}>
                  Paiement en cours...
                </Text>
              </View>
            ) : (
              <Text style={tw`text-white font-bold text-base uppercase font-semibold`}>
                PAYER
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <Modal
        animationType="fade"
        transparent={true}
        visible={showPaymentModal}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center px-6`}>
          <View style={tw`bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl`}>
            <Text style={tw`text-center text-lg font-bold text-gray-800 mb-6`}>
              Choisissez votre mode de paiement
            </Text>

            <View style={tw`mb-6`}>
              {/* Maxit - avec vérification */}
              {paymentResultData?.deepLinks?.maxitLink && (
                <TouchableOpacity
                  onPress={() => {
                    const url = paymentResultData?.deepLinks?.maxitLink;
                    if (!url) {
                      Alert.alert('Erreur', 'Lien de paiement Maxit manquant.');
                      return;
                    }
                    handlePaymentRedirect(
                      url,
                      'Maxit',
                      paymentResultData,
                      paymentResultData.paymentData?.passengers || [],
                      params.operatorName || "Opérateur"
                    );
                  }}
                  style={tw`border-2 border-orange-500 rounded-xl p-4 mb-4 flex-row items-center justify-center bg-white shadow-sm`}
                >
                  <View style={tw`bg-orange-100 rounded-lg p-2 mr-4 w-12 h-12 items-center justify-center`}>
                    <Image
                      source={require("../../../../assets/images/maxit.png")}
                      style={tw`w-10 h-10 rounded-lg`}
                      resizeMode="cover"
                      onError={() => console.log('Erreur chargement logo Maxit')}
                    />
                  </View>

                  <View style={tw`flex-1`}>
                    <Text style={tw`text-gray-800 font-bold text-base`}>MAXIT</Text>
                    <Text style={tw`text-gray-500 text-sm`}>Paiement sécurisé</Text>
                  </View>

                  <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                </TouchableOpacity>
              )}

              {/* Orange Money - avec vérification */}
              {paymentResultData?.deepLinks?.orangeMoneyLink && (
                <TouchableOpacity
                  onPress={() => {
                    const url = paymentResultData?.deepLinks?.orangeMoneyLink;
                    if (!url) {
                      Alert.alert('Erreur', 'Lien de paiement Orange Money manquant.');
                      return;
                    }
                    handlePaymentRedirect(
                      url,
                      'Orange Money',
                      paymentResultData,
                      paymentResultData.paymentData?.passengers || [],
                      params.operatorName || "Opérateur"
                    );
                  }}
                  style={tw`border-2 border-orange-500 rounded-xl p-4 mb-4 flex-row items-center justify-center bg-white shadow-sm`}
                >
                  <View style={tw`bg-orange-100 rounded-lg p-2 mr-4 w-12 h-12 items-center justify-center`}>
                    <Image
                      source={require("../../../../assets/images/omoney.png")}
                      style={tw`w-10 h-10 rounded-lg`}
                      resizeMode="cover"
                      onError={() => console.log('Erreur chargement logo Orange Money')}
                    />
                  </View>

                  <View style={tw`flex-1`}>
                    <Text style={tw`text-gray-800 font-bold text-base`}>ORANGE MONEY</Text>
                    <Text style={tw`text-gray-500 text-sm`}>Paiement mobile</Text>
                  </View>

                  <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                </TouchableOpacity>
              )}

              {/* Wave - avec vérification */}
              {paymentResultData?.paymentUrl && (
                <TouchableOpacity
                  onPress={() => {
                    const waveUrl = paymentResultData?.paymentUrl;
                    if (!waveUrl) {
                      Alert.alert('Erreur', 'Lien de paiement Wave manquant.');
                      return;
                    }
                    handlePaymentRedirect(
                      waveUrl,
                      'Wave',
                      paymentResultData,
                      paymentResultData.paymentData?.passengers || [],
                      params.operatorName || "Opérateur"
                    );
                  }}
                  style={tw`border-2 border-blue-500 rounded-xl p-4 flex-row items-center justify-center bg-white shadow-sm`}
                >
                  <View style={tw`bg-blue-100 rounded-lg p-2 mr-4 w-12 h-12 items-center justify-center`}>
                    <Image
                      source={require("../../../../assets/images/wave.png")}
                      style={tw`w-10 h-10 rounded-lg`}
                      resizeMode="cover"
                      onError={() => console.log('Erreur chargement logo Wave')}
                    />
                  </View>

                  <View style={tw`flex-1`}>
                    <Text style={tw`text-gray-800 font-bold text-base`}>WAVE</Text>
                    <Text style={tw`text-gray-500 text-sm`}>Paiement mobile</Text>
                  </View>

                  <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={() => setShowPaymentModal(false)}
              style={tw`py-2`}
            >
              <Text style={tw`text-gray-500 text-center text-sm`}>
                Annuler
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </HeaderComponent>
  );
}