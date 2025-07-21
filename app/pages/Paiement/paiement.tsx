import {useState, FC, useEffect, useCallback} from 'react';
import { View, Text, TouchableOpacity, Image, Switch, ScrollView, Alert , Modal, Pressable,ActivityIndicator, Linking, BackHandler} from 'react-native';
import tw from '../../../tailwind';
import { Ionicons } from '@expo/vector-icons';
import HeaderComponent from '../../../constants/HearpageReserve/HeaderComponent';
import { useRouter, Link } from "expo-router";
import { getUser, setToken, getToken, searchTickets, reserve, payement } from '../../../services/api/api';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import {jwtDecode, JwtPayload} from "jwt-decode";
import React from 'react';

// Définir le type des paramètres de la route
type RouteParams = {
  departure: string;
  destination: string;
  date: string;
  seat: string;
  totalAvailableSeats: string;
  departureTime: string;
  price: number;
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
};

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
  // Add any other fields that may be in your token
}

// Interface pour les données de paiement
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
  paymentData?: any;
  selectedPayment?: string;
}

export default function ExactPassengerForm() {
  const [saveProfile, setSaveProfile] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState('OM');
  const [isLoading, setIsLoading] = useState(false);
  const route = useRoute();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentResultData, setPaymentResultData] = useState<PaymentResultData | null>(null);

  const { 
    departure = "", 
    destination = "", 
    date = "", 
    seat = "1",
    totalAvailableSeats = "0",
    departureTime = "",
    price = 0,
    tripId = "",
    temporaryReservationId = "",
    operatorName = "Dakar Dem Dikk",
    operatorLogoUrl = "https://example.com/ti-logo.png",
    operatorSlogan = "Plus qu'un patrimoine",
    operatorCommission = 5,
    transportType = "BUS",
    passengers = "[]",
    reservation = ""
  } = (route.params as RouteParams) || {};
  
  const [loading, setLoading] = useState(true);
  const [passengersList, setPassengersList] = useState<Passenger[]>([]);
  const [user, setUser] = useState<{ data?: { user?: { name: string; firstName: string; phoneNumber?: string; } } } | null>(null);
  const [tempReservationId, setTempReservationId] = useState('');
  const params = route.params as RouteParams;
  const requestedSeatsNumber = parseInt(seat || "1", 10);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const router = useRouter();
  
  // Récupérer les données utilisateur
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentToken = await getToken();
        if (currentToken) {
          setToken(currentToken);

          try {
            const userData = await getUser(currentToken);
            if (userData) {
              setUser(userData);
            }
          } catch (userError) {
            console.error("Erreur utilisateur:", userError);
          }
        }
      } catch (err) {
        console.error("Erreur token:", err);
      }
    };

    fetchUserData();
  }, []);
      
  const paymentOptions = [
    { id: 'OM', name: 'Orange Money', logo: require('../../../assets/images/omoney.png') },
    { id: 'wave', name: 'Wave', logo: require('../../../assets/images/wave.png') },
  ];

  // Fonction utilitaire pour vérifier les deep links disponibles
  const checkAvailablePaymentMethods = async () => {
    const methods = [];
    
    // Vérifier Orange Money
    const omSchemes = ['orangemoney://', 'omoney://'];
    for (const scheme of omSchemes) {
      try {
        if (await Linking.canOpenURL(scheme)) {
          methods.push('OM');
          break;
        }
      } catch (error) {
        console.warn(`Erreur vérification scheme ${scheme}:`, error);
      }
    }
    
    // Vérifier Wave
    const waveSchemes = ['wave://', 'wavemoney://'];
    for (const scheme of waveSchemes) {
      try {
        if (await Linking.canOpenURL(scheme)) {
          methods.push('WAVE');
          break;
        }
      } catch (error) {
        console.warn(`Erreur vérification scheme ${scheme}:`, error);
      }
    }
    
    return methods;
  };

  // Fonction utilitaire pour naviguer vers la page des tickets
  const navigateToTicketPage = (
    paymentResult: any, 
    passengers: any[], 
    operatorName: string, 
    paymentStatus: string
  ) => {
    router.push({
      pathname: "../../pages/home/mestickets",
      params: {
        transactionCode: paymentResult?.transactionCode || "",
        reservationId: paymentResult?.reservationId || reservationId || "",
        departure,
        destination,
        date,
        seat,
        departureTime,
        price: price.toString(),
        tripId,
        operatorName,
        passengers: JSON.stringify(passengers),
        qrCode: paymentResult?.qrCode || "",
        paymentMethod: selectedPayment,
        paymentStatus
      }
    });
  };

  // Fonction pour gérer le flux de secours
  const handleFallbackFlow = (paymentResult: any, passengers: any[], operatorName: string) => {
    setShowPaymentModal(false);
    // Redirection vers la page des tickets avec statut PENDING
    navigateToTicketPage(paymentResult, passengers, operatorName, 'PENDING');
  };

  const handlePaymentRedirect = async (
    paymentLink: string,
    appName: string
  ) => {
    try {
      console.log("Tentative d'ouverture du lien:", paymentLink);
      
      if (!paymentLink) {
        throw new Error("Lien de paiement non disponible");
      }

      // Validation et nettoyage de l'URL
      const cleanedLink = paymentLink.trim();
      
      // Vérifier si l'URL est valide
      try {
        new URL(cleanedLink);
      } catch (urlError) {
        console.error("URL invalide:", cleanedLink);
        throw new Error("Lien de paiement invalide");
      }

      const canOpen = await Linking.canOpenURL(cleanedLink);
      console.log(`canOpenURL pour ${appName}:`, canOpen);
      
      // Préparer les données pour la redirection
      const passengers = passengersList.length > 0 ? passengersList : [{ 
        name: user?.data?.user ? `${user.data.user.firstName} ${user.data.user.name}` : "Passager",
        phoneNumber: user?.data?.user?.phoneNumber || "77123456"
      }];

      if (canOpen) {
        try {
          // Tentative d'ouverture avec gestion d'erreur
          await Linking.openURL(cleanedLink);
          
          console.log(`Lien ${appName} ouvert avec succès`);
          
          // Fermer le modal après ouverture réussie
          setShowPaymentModal(false);
          
          // Redirection après paiement avec délai
          setTimeout(() => {
            navigateToTicketPage(paymentResultData, passengers, operatorName, 'PAID');
          }, 3000);
          
        } catch (openError) {
          console.error("Erreur lors de l'ouverture du lien:", openError);
          // Si l'ouverture échoue, utiliser le flux de secours
          handleFallbackFlow(paymentResultData, passengers, operatorName);
        }
        
      } else {
        console.log(`Application ${appName} non disponible, tentative d'ouverture directe`);
        
        // Tentative d'ouverture directe même si canOpenURL retourne false
        try {
          await Linking.openURL(cleanedLink);
          
          console.log(`Lien ${appName} ouvert directement avec succès`);
          
          // Fermer le modal après ouverture du lien
          setShowPaymentModal(false);
          
          // Redirection après paiement avec délai
          setTimeout(() => {
            navigateToTicketPage(paymentResultData, passengers, operatorName, 'PAID');
          }, 3000);
          
        } catch (openError) {
          console.error("Impossible d'ouvrir le lien:", openError);
          Alert.alert(
            "Erreur d'ouverture", 
            `Impossible d'ouvrir ${appName}. Redirection vers vos tickets.`,
            [
              {
                text: "OK",
                onPress: () => handleFallbackFlow(paymentResultData, passengers, operatorName)
              }
            ]
          );
        }
      }
      
    } catch (error) {
      console.error("Erreur lien de paiement:", error);
      
      // Préparer les données pour le flux de secours
      const passengers = passengersList.length > 0 ? passengersList : [{ 
        name: user?.data?.user ? `${user.data.user.firstName} ${user.data.user.name}` : "Passager",
        phoneNumber: user?.data?.user?.phoneNumber || "77123456"
      }];
      
      // Gestion d'erreur avec message approprié
      let errorMessage = `Problème avec l'ouverture de ${appName}`;
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      Alert.alert(
        "Erreur", 
        errorMessage,
        [
          {
            text: "OK",
            onPress: () => handleFallbackFlow(paymentResultData, passengers, operatorName)
          }
        ]
      );
    }
  };
   
  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      
      // Validation des données
      if (!tripId || !reservationId) {
        Alert.alert("Erreur", "Données manquantes pour le paiement");
        setIsLoading(false);
        return;
      }

      // Validation du token
      const token = await getToken();
      if (!token) {
        Alert.alert("Erreur", "Session expirée, veuillez vous reconnecter");
        setIsLoading(false);
        return;
      }
      
      // Préparation des données de paiement avec validation
      const passengers = passengersList.length > 0 ? passengersList : [{ 
        name: user?.data?.user ? `${user.data.user.firstName} ${user.data.user.name}` : "Passager",
        phoneNumber: user?.data?.user?.phoneNumber || "77123456"
      }];

      const paymentData = {
        tripId: tripId,
        amount: (price * parseInt(seat || "1", 10)).toString(),
        methodePay: selectedPayment.toUpperCase(),
        passengers: passengers
      };

      console.log("Données de paiement:", paymentData);
      console.log("ReservationId:", reservationId);

      // Appel API avec gestion d'erreur améliorée
      const paymentResult = await payement(
        reservationId,
        paymentData,
        token
      );
      
      console.log("Résultat paiement:", paymentResult);

      // Validation du résultat
      if (!paymentResult) {
        throw new Error("Aucune réponse du serveur de paiement");
      }

      // Stocker les données de paiement pour utilisation ultérieure
      const resultData: PaymentResultData = {
        ...paymentResult,
        paymentData,
        selectedPayment
      };
      
      setPaymentResultData(resultData);

      if (selectedPayment === 'OM') {
        // Vérifier si les liens de paiement existent
        if (paymentResult?.deepLinks?.maxitLink || paymentResult?.deepLinks?.orangeMoneyLink) {
          setShowPaymentModal(true);
        } else {
          // Fallback si pas de liens deep
          Alert.alert(
            "Information",
            "Paiement initié. Vous allez être redirigé vers vos tickets.",
            [ 
              {
                text: "OK",
                onPress: () => {
                  navigateToTicketPage(paymentResult, passengers, operatorName, 'PENDING');
                }
              }
            ]
          );
        }
      } else if (selectedPayment === 'wave') {
        if (paymentResult?.deepLinks?.waveWebUrl || paymentResult?.deepLinks?.waveDeepLink) {
          // Utiliser directement paymentResult au lieu de paymentResultData
          const waveUrl = paymentResult.deepLinks.waveWebUrl || paymentResult.deepLinks.waveDeepLink;
          handlePaymentRedirect(waveUrl, 'Wave');
        } else {
          // Fallback si pas de liens deep
          Alert.alert(
            "Information",
            "Paiement initié. Vous allez être redirigé vers vos tickets.",
            [
              {
                text: "OK",
                onPress: () => {
                  navigateToTicketPage(paymentResult, passengers, operatorName, 'PENDING');
                }
              }
            ]
          );
        }
      }
      
    } catch (error) {
      console.error("Erreur paiement complète:", error);
      
      // Gestion d'erreur plus détaillée
      let errorMessage = "Problème lors du paiement";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      
      Alert.alert("Erreur", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Utilisation dans useEffect pour vérifier les méthodes disponibles
  useEffect(() => {
    const checkMethods = async () => {
      try {
        const available = await checkAvailablePaymentMethods();
        console.log('Méthodes de paiement disponibles:', available);
      } catch (error) {
        console.warn('Erreur vérification méthodes de paiement:', error);
      }
    };
    
    checkMethods();
  }, []);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        if (params?.passengers) {
          try {
            const parsedPassengers = JSON.parse(params.passengers);
            if (Array.isArray(parsedPassengers)) {
              setPassengersList(parsedPassengers);
            }
          } catch (error) {
            console.error("Erreur parsing passagers:", error);
          }
        }
        
        if (params?.reservation) {
          try {
            const parsedReservation = JSON.parse(params.reservation);
            if (parsedReservation?.reservationId) {
              setReservationId(parsedReservation.reservationId);
            }
          } catch (error) {
            console.error("Erreur parsing réservation:", error);
          }
        } else if (params?.reserveId) {
          setReservationId(params.reserveId);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Erreur chargement données:", err);
        setLoading(false);
      }
    };
  
    fetchTickets();
  }, [params]);
  
  const passengerList = passengersList.length > 0
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
        if (isLoading) {
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
                  router.push('../../pages/home/accueil');
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
    }, [isLoading, router])
  ); */

  return (
    <HeaderComponent 
      showDetails={true}
      operator={{ 
        name: params?.operatorName || "Opérateur",
        logoUrl: params?.operatorLogoUrl || "",
        slogan: params?.operatorSlogan || "",
        commissionPassenger: Number(params?.operatorCommission) || 5,
        transportType: params?.transportType || "BUS"
      }}
      price={Number(params?.price)}
      requestedSeats={params?.seat}
      showHeader={true}
    >
      <View style={tw`bg-white h-full p-6 pb-24`}>
        {/* Modal de paiement avec vérifications */}
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
                      handlePaymentRedirect(
                        paymentResultData.deepLinks.maxitLink!, 
                        'Maxit'
                      );
                    }}
                    style={tw`border-2 border-orange-500 rounded-xl p-4 mb-4 flex-row items-center justify-center bg-white shadow-sm`}
                  >
                    <View style={tw`bg-orange-100 rounded-lg p-2 mr-4 w-12 h-12 items-center justify-center`}>
                      <Image
                        source={require("../../../assets/images/maxit.png")}  
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
                      handlePaymentRedirect(
                        paymentResultData.deepLinks.orangeMoneyLink!, 
                        'Orange Money'
                      );
                    }}
                    style={tw`border-2 border-orange-500 rounded-xl p-4 flex-row items-center justify-center bg-white shadow-sm`}
                  >
                    <View style={tw`bg-orange-100 rounded-lg p-2 mr-4 w-12 h-12 items-center justify-center`}>
                      <Image
                        source={require("../../../assets/images/omoney.png")}  
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
                {paymentResultData?.deepLinks?.waveWebUrl && (
                  <TouchableOpacity
                    onPress={() => {
                      handlePaymentRedirect(
                        paymentResultData.deepLinks.waveWebUrl!, 
                        'Wave'
                      );
                    }}
                    style={tw`border-2 border-blue-500 rounded-xl p-4 flex-row items-center justify-center bg-white shadow-sm`}
                  >
                    <View style={tw`bg-blue-100 rounded-lg p-2 mr-4 w-12 h-12 items-center justify-center`}>
                      <Image
                        source={require("../../../assets/images/wave.png")}  
                        style={tw`w-10 h-10 rounded-lg`}
                        resizeMode="cover"
                        onError={() => console.log('Erreur chargement logo Wave')}
                      />
                    </View>
                    
                    <View style={tw`flex-1`}>
                      <Text style={tw`text-gray-800 font-bold text-base`}>WAVE</Text>
                      <Text style={tw`text-gray-500 text-sm`}>Wave Money</Text>
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
        
        {/* Payment Method Selection */}
        <Text style={tw`text-teal-800 text-lg font-bold mb-1`}>Mode de paiement</Text>
        
        {/* Payment Options */}
        <View style={tw`mb-6`}>
          {paymentOptions.map((option) => (
            <TouchableOpacity 
              key={option.id}
              onPress={() => setSelectedPayment(option.id)}
              style={tw`mb-4 p-4 rounded-xl ${selectedPayment === option.id ? 'bg-teal-50 border-2 border-teal-500' : 'bg-gray-50 border border-gray-100'} flex-row justify-between items-center`}
            >
              <View style={tw`flex-row items-center flex-1`}>
                <View style={tw`h-10 w-10 rounded-lg bg-white shadow-sm mr-4 items-center justify-center`}>
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

              <View style={tw`h-6 w-6 rounded-full border-2 ${selectedPayment === option.id ? 'border-teal-500 bg-teal-500' : 'border-gray-300 bg-white'} items-center justify-center`}>
                {selectedPayment === option.id && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Pay Button */}
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
    </HeaderComponent>
  );
}