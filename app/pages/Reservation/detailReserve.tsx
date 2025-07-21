import React,{ useState, FC, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, ScrollView, Modal,BackHandler, FlatList, Alert,ActivityIndicator } from 'react-native';
import tw from '../../../tailwind';
import { Ionicons } from '@expo/vector-icons';
import HeaderComponent from '../../../constants/HearpageReserve/HeaderComponent';
import { useRouter, Link } from "expo-router";
import { useRoute,useFocusEffect } from '@react-navigation/native';

import { getUser, setToken, getToken, searchTickets, reserve, getpassagers } from '../../../services/api/api';
import { jwtDecode, JwtPayload } from "jwt-decode";

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
  temporaryReservationId: string;
  operatorName?: string;
  operatorLogoUrl?: string;
  operatorSlogan?: string;
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
}

// Définir l'interface pour un passager
interface Passenger {
  id: string;
  name: string;
  phoneNumber: string;
}

interface CustomJwtPayload extends JwtPayload {
  id: string;
  // Add any other fields that may be in your token
}

export default function ExactPassengerForm() {
  const [saveProfile, setSaveProfile] = useState(false);
  const route = useRoute();
  const router = useRouter();
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [savedPassengers, setSavedPassengers] = useState<Passenger[]>([]);
  const [currentPassenger, setCurrentPassenger] = useState<Passenger | null>(null);
  const [selectedPassengerId, setSelectedPassengerId] = useState('');
  const [selectedPassengerIndex, setSelectedPassengerIndex] = useState<number | null>(null);
  const [showPassengerOptions, setShowPassengerOptions] = useState(false);
  const [selectModalVisible, setSelectModalVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [expirationModalVisible, setExpirationModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tempReservationId, setTempReservationId] = useState('');
  // Nouvel état pour suivre si la vérification du temporaryReservationId est en cours
  const [isCheckingReservationId, setIsCheckingReservationId] = useState(true);

  // Initialiser avec des valeurs par défaut pour éviter les erreurs undefined
  const {
    departure = "",
    destination = "",
    date = "",
    seat = "",
    totalAvailableSeats = "0",
    departureTime = "",
    price = 0,
    tripId = "",
    temporaryReservationId = "",
    operatorName = "Opérateur",
    operatorLogoUrl = "",
    operatorSlogan = "" } = (route.params as RouteParams) || {};

  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ data?: { user?: { name: string; firstName: string; } } } | null>(null);
  const [requiredPassengersCount, setRequiredPassengersCount] = useState(0);

  const operator = {
    name: operatorName,
    logoUrl: operatorLogoUrl,
    slogan: operatorSlogan,
    transportType: "BUS" // Valeur par défaut
  };

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
  const fetchUserData = useCallback(async () => {
    setLoading(true);
    setIsCheckingReservationId(true); // Début de la vérification
    try {
      const currentToken = await getToken();
      if (currentToken) {
        setToken(currentToken);
        console.log("Token récupéré :", currentToken);

        // Décoder le token pour extraire l'ID utilisateur
        const decodedToken = jwtDecode<CustomJwtPayload>(currentToken);
        const userId = decodedToken.id;
        console.log('decode', decodedToken);
        
        // Récupérer la liste des passagers enregistrés
        try {
          const passagerResponse = await getpassagers();
          console.log("passagers", passagerResponse);
          if (passagerResponse && passagerResponse.data && Array.isArray(passagerResponse.data)) {
            // Formater les données des passagers
            const formattedPassengers = passagerResponse.data.map((passager: any) => ({
              id: passager.id || `saved-${Math.random().toString(36).substring(2, 9)}`,
              name: passager.name || '',
              phoneNumber: passager.phoneNumber || ''
            }));
            setSavedPassengers(formattedPassengers);
          }
        } catch (passagerError) {
          console.error("Erreur lors de la récupération des passagers:", passagerError);
        }
        
        // Rechercher les trajets disponibles
        const result = await searchTickets(departure, destination, date, parseInt(seat));
        console.log('recherche trouver', result);

        // Récupérer le temporaryReservationId pour le trajet spécifié
        if (result && result.data) {
          const allTrips = [
            ...(result.data.transportTypeBUS || []),
            ...(result.data.transportTypeTRAIN || []),
            ...(result.data.transportTypePLANE || []),
            ...(result.data.transportTypeBOAT || [])
          ].flat();

          const selectedTrip = allTrips.find(trip => trip.tripId === tripId);
          if (selectedTrip && selectedTrip.temporaryReservationId) {
            setTempReservationId(selectedTrip.temporaryReservationId);
            console.log("temporaryReservationId trouvé:", selectedTrip.temporaryReservationId);
            setIsCheckingReservationId(false); // Fin de la vérification réussie
          } else {
            console.warn("temporaryReservationId non trouvé pour ce trajet");
            setIsCheckingReservationId(false); // Fin de la vérification même si pas trouvé
          }
        } else {
          setIsCheckingReservationId(false); // Fin de la vérification même si pas de résultat
        }

        if (!userId) {
          throw new Error("ID utilisateur introuvable dans le token.");
        }

        const userData = await getUser(currentToken);
        console.log("Utilisateur connecté :", userData);

        if (userData && userData.data && userData.data.user) {
          setUser(userData);
        }
      }
    } catch (error) {
      console.error("Erreur lors de la récupération de l'utilisateur:", error);
      setIsCheckingReservationId(false); // Fin de la vérification en cas d'erreur
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserData();

    // Si temporaryReservationId est déjà fourni dans les paramètres de route, utilisez-le
    if (temporaryReservationId) {
      setTempReservationId(temporaryReservationId);
      setIsCheckingReservationId(false); // Pas besoin de vérifier si déjà fourni
      console.log("temporaryReservationId des paramètres:", temporaryReservationId);
    }

    // Initialiser le nombre de passagers requis
    const seatCount = parseInt(seat) || 0;
    setRequiredPassengersCount(seatCount);

    // Initialiser le tableau de passagers avec des objets vides
    const initialPassengers = Array(seatCount).fill(null).map((_, index) => ({
      id: `temp-${index}`,
      name: '',
      phoneNumber: ''
    }));

    setPassengers(initialPassengers);

    // Vérifier si la réservation a expiré
    if (temporaryReservationId) {
      const checkReservationExpiration = async () => {
        try {
          const result = await searchTickets(departure, destination, date, parseInt(seat));
          if (result && result.data) {
            const allTrips = [
              ...(result.data.transportTypeBUS || []),
              ...(result.data.transportTypeTRAIN || []),
              ...(result.data.transportTypePLANE || []),
              ...(result.data.transportTypeBOAT || [])
            ].flat();
            
            const selectedTrip = allTrips.find(trip => trip.tripId === tripId);
            if (!selectedTrip || !selectedTrip.temporaryReservationId) {
              setExpirationModalVisible(true);
            }
          }
        } catch (error) {
/*           console.error("Erreur lors de la vérification de la réservation:", error);
 */        }
      };
      checkReservationExpiration();
    }
  }, [fetchUserData, temporaryReservationId, tripId, departure, destination, date, seat]);

  // Formater l'heure pour l'affichage
  const formatTime = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('fr-FR', options as Intl.DateTimeFormatOptions);
  };

  const openPassengerModal = (index: number) => {
    setSelectedPassengerIndex(index);
    setCurrentPassenger(passengers[index]);
    setSelectedPassengerId(''); // Réinitialiser la sélection
    setModalVisible(true);
  };

  const handlePassengerNameChange = (text: string) => {
    if (currentPassenger) {
      setCurrentPassenger({
        ...currentPassenger,
        name: text
      });
    }
  };

  const handlePassengerPhoneChange = (text: string) => {
    if (currentPassenger) {
      setCurrentPassenger({
        ...currentPassenger,
        phoneNumber: text
      });
    }
  };

  // Fonction pour vérifier si tous les passagers ont été renseignés
  const areAllPassengersComplete = () => {
    return passengers.every(passenger => passenger && passenger.name && passenger.phoneNumber);
  };

  // Fonction pour vérifier si le bouton peut être activé
  const isButtonEnabled = () => {
    return !isSubmitting && 
           !isCheckingReservationId && 
           tempReservationId && 
           tempReservationId.trim() !== '' && 
           areAllPassengersComplete() &&
           saveProfile;
  };

  // Fonction pour obtenir le texte du bouton
  const getButtonText = () => {
    if (isSubmitting) {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ActivityIndicator size="small" color="#ffffff" />
          <Text style={{ color: '#ffffff', marginLeft: 8 }}>Reservation en cours... </Text>
        </View>
      );
    }
    
    if (isCheckingReservationId && !areAllPassengersComplete()) {
      return "Continuer...";
    }
    
    if (!saveProfile) {
      return "Activer la sauvegarde pour continuer";
    }
   
    return "Continuer";
  };

  // Fonction modifiée pour utiliser l'endpoint reserve avant de rediriger vers la page de paiement
  const handleSubmit = async () => {
    if (!saveProfile) {
      Alert.alert(
        "Sauvegarde requise",
        "Vous devez activer la sauvegarde de vos informations pour continuer avec la réservation.",
        [{ text: "OK" }]
      );
      return;
    }

    if (!areAllPassengersComplete()) {
      Alert.alert(
        "Informations incomplètes",
        `Veuillez renseigner les informations de tous les ${requiredPassengersCount} passagers avant de continuer.`,
        [{ text: "OK" }]
      );
      return;
    }

    setIsSubmitting(true);
    try {
      if (!tripId) {
        throw new Error("ID du trajet manquant");
      }

      const passengersData = passengers.map(passenger => ({
        name: passenger.name,
        phoneNumber: passenger.phoneNumber
      }));

      console.log("Envoi de la demande de réservation:", {
        tripId,
        temporaryReservationId: tempReservationId,
        passengers: passengersData,
        saved: saveProfile
      });

      const reservationResult = await reserve(tripId, tempReservationId, passengersData, saveProfile);

      console.log("Réservation effectuée avec succès:", reservationResult);

      router.push({
        pathname: "/pages/Paiement/paiement",
        params: {
          reservation: JSON.stringify(reservationResult),
          price: price,
          tripId: tripId,
          departure: departure,
          destination: destination,
          date: date,
          seat: seat,
          totalAvailableSeats: String(totalAvailableSeats),
          departureTime: departureTime,
          temporaryReservationId: tempReservationId,
          passengers: JSON.stringify(passengersData),
          operatorName: operator.name,
          operatorLogoUrl: operator.logoUrl,
          operatorSlogan: operator.slogan,
          transportType: operator.transportType
        }
      });
      console.log(seat);

    } catch (error: any) {
      console.error("Erreur lors de la réservation:", error);
      Alert.alert(
        "Erreur de réservation",
        error.message || "Impossible de finaliser votre réservation. Veuillez réessayer plus tard.",
        [{ text: "OK" }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectPassenger = (savedPassenger: Passenger) => {
    if (currentPassenger && selectedPassengerIndex !== null) {
      const updatedPassenger = {
        ...currentPassenger,
        name: savedPassenger.name,
        phoneNumber: savedPassenger.phoneNumber
      };
      setCurrentPassenger(updatedPassenger);
    }
    setSelectModalVisible(false);
  };

  const handleModalSubmit = () => {
    if (!currentPassenger) return;

    if (!currentPassenger.name) {
      Alert.alert("Champ obligatoire", "Veuillez saisir le nom du passager");
      return;
    }
    if (!currentPassenger.phoneNumber) {
      Alert.alert("Champ obligatoire", "Veuillez saisir le numéro de téléphone");
      return;
    }

    if (selectedPassengerIndex !== null) {
      const updatedPassengers = [...passengers];
      updatedPassengers[selectedPassengerIndex] = currentPassenger;
      setPassengers(updatedPassengers);
    }

    setModalVisible(false);
  };

  const newPassengerOption = { id: 'new', name: 'Nouveau passager', phoneNumber: '' };

  return (
    <HeaderComponent
      showJourneyDetails={true}
      departLieu={departure}
      departHeure={formatTime(departureTime)}
      arriveeLieu={destination}
      date={formatDate(date)}
      placesRestantes={parseInt(totalAvailableSeats) || 0}
      price={price}
      operator={{ name: operator.name, logoUrl: operator.logoUrl, slogan: operator.slogan, transportType: operator.transportType }}
      requestedSeats={seat}
      showHeader={true}
      showDetails={false}
    >
      <ScrollView style={tw`bg-white`}>
        <View style={tw`p-4 pb-24`}>
          <View style={tw`flex-row items-center justify-between mb-6`}>
            <View>
              <Text style={tw`text-2xl font-bold text-gray-900`}>Vos passagers</Text>
              <Text style={tw`text-sm text-gray-500 mt-1`}>{requiredPassengersCount} place(s) à remplir</Text>
            </View>
            <View style={tw`h-8 w-8 rounded-full bg-teal-50 items-center justify-center`}>
              <Text style={tw`text-teal-800 font-medium`}>{requiredPassengersCount}</Text>
            </View>
          </View>

          {passengers.map((passenger, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => openPassengerModal(index)}
              style={tw`mb-4 bg-white rounded-xl shadow-sm border border-gray-100`}
            >
              <View style={tw`p-4`}>
                <Text style={tw`text-xs font-medium text-teal-700 mb-2`}>
                  PASSAGER {index + 1}
                </Text>
                
                {passenger.name ? (
                  <View>
                    <Text style={tw`text-base font-medium text-gray-900`}>
                      {passenger.name}
                    </Text>
                    <Text style={tw`text-sm text-gray-500 mt-1`}>
                      {passenger.phoneNumber}
                    </Text>
                  </View>
                ) : (
                  <View style={tw`flex-row items-center`}>
                    <Ionicons name="person-add-outline" size={20} color="#9CA3AF" />
                    <Text style={tw`text-gray-400 ml-2`}>
                      Ajouter les informations
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}

          {/* Option de sauvegarde - OBLIGATOIRE */}
          <View style={tw`flex-row items-center justify-between ${saveProfile ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'} p-4 rounded-xl mt-2 mb-6`}>
            <View style={tw`flex-1 mr-4`}>
              <View style={tw`flex-row items-center mb-1`}>
                <Ionicons 
                  name={saveProfile ? "checkmark-circle" : "alert-circle"} 
                  size={20} 
                  color={saveProfile ? "#059669" : "#EA580C"} 
                />
                <Text style={tw`${saveProfile ? 'text-green-800' : 'text-orange-800'} font-bold ml-2`}>
                  {saveProfile ? 'Sauvegarde activée' : 'Sauvegarde requise'}
                </Text>
              </View>
              <Text style={tw`${saveProfile ? 'text-green-700' : 'text-orange-700'} text-sm`}>
                {saveProfile 
                  ? 'Vos informations seront sauvegardées pour vos prochaines réservations'
                  : 'Vous devez activer la sauvegarde pour continuer avec votre réservation'
                }
              </Text>
            </View>
            <Switch
              trackColor={{ false: "#FED7AA", true: "#A7F3D0" }}
              thumbColor={saveProfile ? "#059669" : "#EA580C"}
              value={saveProfile}
              onValueChange={setSaveProfile}
            />
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!isButtonEnabled()}
            style={tw`${!isButtonEnabled() ? 'bg-gray-400' : 'bg-teal-800'} py-4 rounded-xl shadow-sm`}
          >
            <Text style={tw`text-white text-center font-semibold text-lg`}>
              {getButtonText()}
            </Text>
          </TouchableOpacity>
          
          {/* Message d'aide si la sauvegarde n'est pas activée */}
         {/*  {!saveProfile && areAllPassengersComplete() && (
            <View style={tw`mt-3 bg-orange-50 border border-orange-200 rounded-lg p-3`}>
              <View style={tw`flex-row items-center`}>
                <Ionicons name="information-circle" size={16} color="#EA580C" />
                <Text style={tw`text-orange-700 text-sm ml-2 flex-1`}>
                  Activez la sauvegarde ci-dessus pour pouvoir continuer avec votre réservation
                </Text>
              </View>
            </View>
          )} */}
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={tw`flex-1 justify-end bg-black bg-opacity-50`}>
          <View style={tw`bg-white rounded-t-lg p-5 h-2/3`}>
            <View style={tw`flex-row justify-between items-center mb-5`}>
              <Text style={tw`text-xl font-bold text-teal-800`}>
                Passager {selectedPassengerIndex !== null ? selectedPassengerIndex + 1 : ""}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#065f46" />
              </TouchableOpacity>
            </View>

            <View style={tw`mb-5`}>
              <Text style={tw`text-gray-700 font-medium mb-2`}>Type de passager</Text>
              <TouchableOpacity
                style={tw`flex-row justify-between items-center p-3 border border-gray-200 rounded-md`}
                onPress={() => setSelectModalVisible(true)}
              >
                <Text style={tw`text-gray-600`}>
                  {currentPassenger?.name ? currentPassenger.name : "Sélectionner un passager"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={tw`mb-5`}>
              <Text style={tw`text-gray-700 font-medium mb-2`}>Nom et Prénom</Text>
              <TextInput
                placeholder="Nom et prénom du passager"
                value={currentPassenger?.name || ""}
                onChangeText={handlePassengerNameChange}
                style={tw`p-3 bg-gray-100 rounded-md`}
              />
            </View>

            <View style={tw`mb-5`}>
              <Text style={tw`text-gray-700 font-medium mb-2`}>Téléphone</Text>
              <TextInput
                placeholder="Numéro de téléphone"
                value={currentPassenger?.phoneNumber || ""}
                onChangeText={handlePassengerPhoneChange}
                keyboardType="phone-pad"
                style={tw`p-3 bg-gray-100 rounded-md`}
              />
            </View>

            <TouchableOpacity
              onPress={handleModalSubmit}
              style={tw`bg-teal-800 py-4 rounded-lg flex items-center mt-5`}
            >
              <Text style={tw`text-white font-bold text-lg`}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={selectModalVisible}
        onRequestClose={() => setSelectModalVisible(false)}
      >
        <View style={tw`flex-1 justify-end bg-black bg-opacity-50`}>
          <View style={tw`bg-white rounded-t-lg`}>
            <View style={tw`p-4 border-b border-gray-200 flex-row justify-between items-center`}>
              <Text style={tw`text-lg font-bold text-teal-800`}>Sélectionner un passager</Text>
              <TouchableOpacity onPress={() => setSelectModalVisible(false)}>
                <Ionicons name="close" size={24} color="#065f46" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={tw`p-4 border-b border-gray-100 flex-row justify-between items-center`}
              onPress={() => {
                if (currentPassenger) {
                  setCurrentPassenger({
                    ...currentPassenger,
                    name: '',
                    phoneNumber: ''
                  });
                }
                setSelectModalVisible(false);
              }}
            >
              <Text style={tw`text-gray-700 text-lg`}>Nouveau passager</Text>
            </TouchableOpacity>

            <ScrollView style={tw`max-h-80`}>
              {savedPassengers.map((savedPassenger) => (
                <TouchableOpacity
                  key={savedPassenger.id}
                  style={tw`p-4 border-b border-gray-100 flex-row justify-between items-center`}
                  onPress={() => handleSelectPassenger(savedPassenger)}
                >
                  <View>
                    <Text style={tw`text-gray-700 text-lg`}>{savedPassenger.name}</Text>
                    <Text style={tw`text-gray-500 text-sm`}>{savedPassenger.phoneNumber}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {savedPassengers.length === 0 && (
                <View style={tw`p-4 border-b border-gray-100`}>
                  <Text style={tw`text-gray-500 text-center`}>Aucun passager sauvegardé</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={expirationModalVisible}
        onRequestClose={() => setExpirationModalVisible(false)}
      >
        <View style={tw`flex-1 justify-center items-center bg-black/50`}>
          <View style={tw`bg-white rounded-2xl p-6 w-11/12 max-w-sm`}>
            <View style={tw`items-center mb-4`}>
              <Ionicons name="time-outline" size={48} color="#EF4444" />
            </View>
            <Text style={tw`text-xl font-bold text-center text-gray-900 mb-2`}>
              Réservation expirée
            </Text>
            <Text style={tw`text-gray-600 text-center mb-6`}>
              Votre réservation a expiré. Veuillez effectuer une nouvelle recherche.
            </Text>
            <TouchableOpacity
              onPress={() => {
                setExpirationModalVisible(false);
                router.push("/pages/home/accueil");
              }}
              style={tw`bg-teal-800 py-3 rounded-xl`}
            >
              <Text style={tw`text-white text-center font-semibold`}>
                Retour à l&apos;accueil
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </HeaderComponent>
  );
}