import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,BackHandler,
  FlatList,
  ScrollView,
} from "react-native";
import tw from "../../../tailwind";
import { Ionicons } from "@expo/vector-icons";
import TicketHeader from "../../../constants/TicketHeader/TicketHeader";
import { useRouter, useLocalSearchParams ,useFocusEffect} from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { getUser, setToken, getToken } from "../../../services/api/api";
import ViewShot, { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useRoute } from "@react-navigation/native";
import ConfettiCannon from "react-native-confetti-cannon";

type RouteParams = {
  departure: string;
  destination: string;
  station_arrivee: string;
  station_depart: string;
  date: string;
  seat: string;
  totalAvailableSeats: string;
  departureTime: string;
  price: number;
  tripId: string;
  name: string;
  phoneNumber: string;
  reserveId?: string;
  reservationId?: string;
  temporaryReservationId: string;
  operatorName?: string;
  operatorLogoUrl?: string;
  operatorSlogan?: string;
  operatorCommission?: number;
  transportType?: string;
  ticketCode?: string;
  baseAmount?: string;
  ticketNumbers?: string;
  passengers?: string; // JSON string contenant la liste des passagers
  vehicleNumber?: string;
  seatNumber?: number;
  passengerName?: string; // Changé de number à string
  passengerPhone?: string; // Changé de number à string
};

type Passenger = {
  name: string;
  phoneNumber: string;
  ticketCode?: string;
  seatNumber?: string;
  baseAmount?: string;
};

interface UserData {
  data?: {
    user?: {
      firstName?: string;
      name?: string;
    };
  };
}

export default function TicketScreens() {
  const router = useRouter();
  const route = useRoute();
  const params = useLocalSearchParams() as any;

  const [user, setUser] = useState<UserData | null>(null);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passengersList, setPassengersList] = useState<Passenger[]>([]);
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);
  const [multipleSeats, setMultipleSeats] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string>("");
  const qrCodeRef = useRef<any>(null);

  const [ticketData, setTicketData] = useState({
    departure: "",
    destination: "",
    departureDate: "",
    departureTime: "",
    busStop: "",
    busNumber: "",
    ticketNumber: "",
    passengers: 1,
    seats: "",
    price: "",
    transportType: "BUS",
    operatorName: "",
    operatorSlogan: "",
    tripId: "",
    reservationId: "",
  });

  // Extraction des paramètres de route
  const routeParams = (route.params as RouteParams) || {};

  // Utilisation directe des paramètres
  const departure = params.departure || "";
  const destination = params.destination || "";
  const date = params.date || "";
  const seat = params.seat || "";
  const totalAvailableSeats = params.totalAvailableSeats || "0";
  const departureTime = params.departureTime || "";
  const price = params.price || 0;
  const tripId = params.tripId || "";
  const name = params.name || "";
  const phoneNumber = params.phoneNumber || "";
  const reservationId = params.reservationId || "";
  const temporaryReservationId = params.temporaryReservationId || "";
  const operatorName = params.operatorName || "Dakar Dem Dikk";
  const operatorLogoUrl = params.operatorLogoUrl || "";
  const operatorSlogan = params.operatorSlogan || "Plus qu'un patrimoine";
  const operatorCommission = params.operatorCommission || 5;
  const transportType = params.transportType || "BUS";
  const ticketCode = params.ticketCode || "";
  const baseAmount = params.baseAmount || "";
  const ticketNumbers = params.ticketNumbers || "";
  const passengerName = params.passengerName || "";
  const passengerPhone = params.passengerPhone || "";
  const passengers = params.passengers || "";
  const vehicleNumber = params.vehicleNumber || "";
  const seatNumber = params.seatNumber || 0;
  const station_depart = params.station_depart || "";
  const station_arrivee = params.station_arrivee || "";

  const [shareLoading, setShareLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [showTicketList, setShowTicketList] = useState(false);

  const ticketRef = useRef<ViewShot>(null);
  const confettiRef = useRef<ConfettiCannon>(null);

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
  // Fonction utilitaire pour formater la date
  const formatDate = (dateString: string): string => {
    if (!dateString)
      return new Date().toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

    const date = new Date(dateString);
    const dateOptions: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "short",
      year: "numeric",
    };
    return date.toLocaleDateString("fr-FR", dateOptions);
  };

  // Fonction utilitaire pour formater l'heure
  const formatTime = (timeString: string): string => {
    if (!timeString)
      return new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    const time = new Date(timeString);
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
    };
    return time.toLocaleTimeString("fr-FR", timeOptions);
  };

  // Générer un numéro de bus aléatoire si non fourni
  const generateBusNumber = (): string => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";

    let busNumber = "";
    // 2 lettres
    for (let i = 0; i < 2; i++) {
      busNumber += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    // 4 chiffres
    for (let i = 0; i < 4; i++) {
      busNumber += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    // 2 lettres
    busNumber += " ";
    for (let i = 0; i < 2; i++) {
      busNumber += letters.charAt(Math.floor(Math.random() * letters.length));
    }

    return busNumber;
  };

  // Générer les données du QR code pour un passager
  const generateQRCodeData = (passenger: Passenger | null, ticketInfo: any) => {
    if (!passenger) return "";

    const qrData = {
      ticketId: ticketInfo.ticketNumber,
      passengerName: passenger.name,
      phoneNumber: passenger.phoneNumber,
      seatNumber: passenger.seatNumber,
      price: price,
      departure: departure,
      destination: destination,
      departureDate: ticketInfo.departureDate,
      departureTime: ticketInfo.departureTime,
      busNumber: ticketInfo.busNumber,
      transportType: transportType,
      tripId: tripId,
      reservationId: reservationId || temporaryReservationId,
      operatorName: operatorName,
      timestamp: new Date().toISOString(),
    };

    return JSON.stringify(qrData);
  };

  // Créer la liste des passagers à partir des paramètres
  const createPassengersList = (userData: UserData | null, userPhone: string): Passenger[] => {
    let passengersArray: Passenger[] = [];
    let parsedTicketNumbers: number[] = [];

    try {
      // Parser les passagers depuis les paramètres
      if (passengers && passengers !== "") {
        passengersArray = JSON.parse(passengers);
      }

      // Parser les numéros de tickets
      if (ticketNumbers && ticketNumbers !== "") {
        try {
          parsedTicketNumbers = JSON.parse(ticketNumbers);
        } catch (e) {
          parsedTicketNumbers = ticketNumbers.split(",").map((num) => parseInt(num.trim()));
        }
      }
    } catch (err) {
      console.error("Erreur lors du parsing des données:", err);
    }

    const seatCount = parseInt(seat) || 1;

    // Si aucun passager n'est défini, utiliser les paramètres de route
    if (passengersArray.length === 0) {
      // Utiliser le nom et téléphone des paramètres de route en priorité
      const defaultName =
        name ||
        (userData && userData.data && userData.data.user
          ? `${userData.data.user.firstName} ${userData.data.user.name}`
          : "Passager");

      const defaultPhone = phoneNumber || userPhone || "77123456";

      // Créer des passagers en fonction du nombre de sièges
      passengersArray = Array.from({ length: seatCount }, (_, index) => ({
        name: index === 0 ? defaultName : `Passager ${index + 1}`,
        phoneNumber: defaultPhone,
        ticketCode: ticketCode || `TKT-${Date.now()}-${index + 1}`,
        seatNumber:
          parsedTicketNumbers.length > index
            ? parsedTicketNumbers[index].toString()
            : (index + 1).toString(),
        baseAmount: baseAmount,
      }));
    } else {
      // Compléter les données manquantes des passagers existants
      passengersArray = passengersArray.map((passenger, index) => ({
        ...passenger,
        ticketCode: passenger.ticketCode || ticketCode || `TKT-${Date.now()}-${index + 1}`,
        seatNumber:
          passenger.seatNumber ||
          (parsedTicketNumbers.length > index
            ? parsedTicketNumbers[index].toString()
            : (index + 1).toString()),
        baseAmount: passenger.baseAmount || baseAmount,
        // Utiliser les paramètres de route si les données du passager sont manquantes
        name: passenger.name || (index === 0 && name ? name : `Passager ${index + 1}`),
        phoneNumber: passenger.phoneNumber || phoneNumber || userPhone || "77123456",
      }));
    }

    return passengersArray;
  };

  // Mettre à jour les données du ticket avec les paramètres de route
  const updateTicketData = (
    passenger: Passenger | null,
    formattedDate: string,
    formattedTime: string
  ) => {
    const updatedTicketData = {
      departure: departure || "Départ non spécifié",
      destination: destination || "Destination non spécifiée",
      departureDate: formattedDate,
      departureTime: formattedTime,
      busStop: "Liberté VI", // Pourrait être ajouté aux RouteParams
      busNumber: generateBusNumber(), // Générer si non fourni
      ticketNumber: passenger?.ticketCode || ticketCode || `TKT-${Date.now()}`,
      passengers: parseInt(seat) || 1,
      seats: passenger?.seatNumber || seat || "1",
      price: `${price || 0} FCFA`,
      transportType: transportType || "BUS",
      operatorName: operatorName || "Dakar Dem Dikk",
      operatorSlogan: operatorSlogan || "Plus qu'un patrimoine",
      tripId: tripId,
      reservationId: reservationId || temporaryReservationId,
    };

    setTicketData(updatedTicketData);

    // Générer les données QR code
    const qrData = generateQRCodeData(passenger, updatedTicketData);
    setQrCodeData(qrData);
  };

  // Récupération des données utilisateur et initialisation du ticket
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Récupérer le téléphone depuis AsyncStorage
        const storedPhone = await AsyncStorage.getItem("phone");
        if (storedPhone) {
          setPhone(storedPhone);
        }

        // Récupérer et définir le token
        const currentToken = await getToken();
        let userData = null;

        if (currentToken) {
          setToken(currentToken);
          try {
            userData = await getUser(currentToken);
            if (userData) {
              setUser(userData);
            }
          } catch (userError) {
            console.log("Erreur récupération utilisateur:", userError);
          }
        }

        // Formater la date et l'heure
        const formattedDate = formatDate(date);
        const formattedTime = formatTime(departureTime);

        // Créer la liste des passagers avec les paramètres de route
        const passengersArray = createPassengersList(userData, storedPhone || "");

        setPassengersList(passengersArray);

        // Vérifier s'il y a plusieurs sièges
        const seatCount = parseInt(seat) || 1;
        setMultipleSeats(seatCount > 1);
        setShowTicketList(seatCount > 1);

        // Si un seul siège, sélectionner le passager par défaut
        if (seatCount === 1 && passengersArray.length > 0) {
          setSelectedPassenger(passengersArray[0]);
        }

        // Mettre à jour les données du ticket
        updateTicketData(
          passengersArray.length > 0 ? passengersArray[0] : null,
          formattedDate,
          formattedTime
        );

        setLoading(false);
      } catch (err) {
        console.error("Erreur lors de la récupération des données:", err);
        setError(err instanceof Error ? err.message : "Une erreur est survenue");
        setLoading(false);
      }
    };

    fetchUserData();
  }, [
    departure,
    destination,
    date,
    seat,
    departureTime,
    ticketCode,
    ticketNumbers,
    passengers,
    name,
    phoneNumber,
    price,
    operatorName,
    transportType,
    tripId,
    reservationId,
  ]);

  useEffect(() => {
    // Lancer l'effet de paillettes après un court délai
    const timer = setTimeout(() => {
      confettiRef.current?.start();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Fonction pour sélectionner un passager et afficher son ticket
  const selectPassenger = (passenger: Passenger) => {
    setSelectedPassenger(passenger);
    setShowTicketList(false);

    const formattedDate = formatDate(date);
    const formattedTime = formatTime(departureTime);

    updateTicketData(passenger, formattedDate, formattedTime);
  };

  // Fonction pour retourner à la liste des passagers
  const backToPassengersList = () => {
    setShowTicketList(true);
  };

  // Fonction pour télécharger le ticket
  const handleDownloadTicket = async () => {
    try {
      setDownloadLoading(true);

      if (!ticketRef.current) {
        Alert.alert("Erreur", "Impossible de capturer le ticket.");
        return;
      }

      const uri = await captureRef(ticketRef, {
        format: "png",
        quality: 1,
      });

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission requise", "Autorisez l'accès à la galerie.");
        return;
      }

      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync("Tickets", asset, false);

      Alert.alert("Succès", "Ticket téléchargé avec succès !");

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("download-channel", {
          name: "Téléchargements",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "📥 Ticket téléchargé !",
          body: "Appuyez ici pour voir l'image.",
          data: { imageUri: asset.uri },
          sound: true,
        },
        trigger: null,
      });
    } catch (error) {
      Alert.alert("Erreur", "Échec du téléchargement du ticket.");
    } finally {
      setDownloadLoading(false);
    }
  };

  // Fonction pour partager le ticket
  const handleShareTicket = async () => {
    try {
      setShareLoading(true);

      if (!ticketRef.current) {
        Alert.alert("Erreur", "Impossible de capturer le ticket.");
        return;
      }

      const uri = await captureRef(ticketRef, {
        format: "png",
        quality: 1,
      });
      const isAvailable = await Sharing.isAvailableAsync();

      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "Partager votre billet",
          UTI: "public.png",
        });
      } else {
        const { status } = await MediaLibrary.requestPermissionsAsync();

        if (status === "granted") {
          const asset = await MediaLibrary.createAssetAsync(uri);
          await MediaLibrary.createAlbumAsync("Billets", asset, false);
          Alert.alert("Succès", "Billet enregistré dans votre galerie");
        } else {
          Alert.alert("Erreur", "Permission de stockage refusée");
        }
      }
    } catch (error) {
      Alert.alert("Erreur", "Impossible de partager le billet");
    } finally {
      setShareLoading(false);
    }
  };

  // Afficher un écran de chargement pendant la récupération des données
  if (loading) {
    return (
      <TicketHeader
        operator={{
          name: operatorName || "DefaultOperator",
          logoUrl: operatorLogoUrl || "",
          transportType: transportType || "BUS",
        }}
      >
        <View style={tw`flex-1 items-center justify-center py-20 bg-gray-100 px-4`}>
          <ActivityIndicator size="large" color="#38B2AC" />
          <Text style={tw`mt-4 text-lg text-gray-700`}>Chargement de votre ticket...</Text>
        </View>
      </TicketHeader>
    );
  }

  // Afficher un message d'erreur si nécessaire
  if (error) {
    return (
      <TicketHeader
        operator={{
          name: operatorName || "DefaultOperator",
          logoUrl: operatorLogoUrl || "",
          transportType: transportType || "BUS",
        }}
      >
        <View style={tw`flex-1 items-center justify-center py-20 bg-gray-100 px-4`}>
          <Text style={tw`text-red-500 text-lg`}>Erreur: {error}</Text>
          <TouchableOpacity
            style={tw`mt-4 bg-teal-800 py-3 px-6 rounded-xl`}
            onPress={() => router.back()}
          >
            <Text style={tw`text-white font-bold`}>Retour</Text>
          </TouchableOpacity>
        </View>
      </TicketHeader>
    );
  }

  // Afficher la liste des passagers si plusieurs sièges
  if (showTicketList && multipleSeats) {
    return (
      <TicketHeader
        operator={{
          name: operatorName || "DefaultOperator",
          logoUrl: operatorLogoUrl || "",
          transportType: transportType || "BUS",
        }}
      >
        <FlatList
          data={passengersList}
          keyExtractor={(item, index) => index.toString()}
          ListHeaderComponent={() => (
            <View style={tw`mb-8`}>
              <Text style={tw`text-2xl font-semibold text-gray-900 text-center`}>Vos billets</Text>
              <Text style={tw`text-sm text-gray-500 text-center mt-1`}>
                {operatorName} - {operatorSlogan}
              </Text>
              <Text style={tw`text-sm text-gray-500 text-center mt-1`}>
                Touchez un passager pour voir son billet
              </Text>
            </View>
          )}
          contentContainerStyle={tw`py-6 px-4 bg-white`}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={tw`bg-white mb-3 rounded-2xl shadow-sm border border-gray-100 overflow-hidden`}
              onPress={() => selectPassenger(item)}
            >
              <View style={tw`p-4 flex-row items-center`}>
                <View
                  style={tw`h-12 w-12 rounded-full bg-teal-50 items-center justify-center mr-4`}
                >
                  <Text style={tw`text-lg font-semibold text-teal-700`}>{item.name.charAt(0)}</Text>
                </View>

                <View style={tw`flex-1`}>
                  <Text style={tw`text-base font-medium text-gray-900`}>{item.name}</Text>
                  <View style={tw`flex-row items-center mt-1`}>
                    <Text style={tw`text-sm text-gray-500`}>Siège {item.seatNumber || "N/A"}</Text>
                    <Text style={tw`text-gray-400 mx-2`}>•</Text>
                    <Text style={tw`text-sm text-gray-500`}>{item.phoneNumber}</Text>
                  </View>
                  {item.baseAmount && (
                    <Text style={tw`text-sm text-teal-600 mt-1`}>
                      Montant: {item.baseAmount} FCFA
                    </Text>
                  )}
                </View>

                <View style={tw`ml-4 p-2 rounded-full bg-gray-50`}>
                  <Ionicons name="chevron-forward" size={20} color="#64748B" />
                </View>
              </View>
            </TouchableOpacity>
          )}
          style={tw`w-full bg-white`}
        />
      </TicketHeader>
    );
  }

  // Afficher le ticket
  return (
    <TicketHeader
      operator={{
        name: operatorName || "DefaultOperator",
        logoUrl: operatorLogoUrl || "",
        transportType: transportType || "BUS",
      }}
    >
      <View style={tw`flex-1`}>
        <ScrollView contentContainerStyle={tw`flex-1 items-center py-10 bg-white px-4`}>
          <View style={tw`px-4 py-2`}>
            {multipleSeats && (
              <TouchableOpacity
                style={tw`flex-row items-center py-2`}
                onPress={backToPassengersList}
              >
                <View style={tw`flex-row items-center bg-teal-50 px-4 py-2.5 rounded-xl shadow-sm`}>
                  <Ionicons name="chevron-back-circle" size={20} color="#0F766E" />
                  <Text style={tw`ml-2 text-teal-700 font-semibold`}>
                    Voir tous les billets ({passengersList.length})
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          <ConfettiCannon
            ref={confettiRef}
            count={200}
            origin={{ x: -10, y: 0 }}
            autoStart={false}
            fadeOut={true}
            colors={["#10B981", "#059669", "#065F46", "#064E3B"]}
            explosionSpeed={350}
            fallSpeed={3000}
          />

          <ViewShot ref={ticketRef} style={tw`w-full max-w-[340px] mx-auto`}>
            <View style={tw`bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm`}>
              {/* Header with Logo */}
              <View style={tw`px-4 pt-4 pb-2 border-b border-gray-100`}>
                <Text style={tw`text-lg font-bold text-center text-gray-800`}>PassBi</Text>
                <Text style={tw`text-xs text-center text-gray-500 mt-1`}>
                  {ticketData.operatorName} - {ticketData.operatorSlogan}
                </Text>
              </View>

              {/* Passenger Info */}
              <View style={tw`px-4 py-2 flex-row justify-between items-start`}>
                <View>
                  <Text style={tw`text-base font-bold text-gray-800`}>
                    {passengerName || "Nom à afficher"}
                  </Text>
                  <Text style={tw`text-sm text-gray-500`}>
                    {passengerPhone || selectedPassenger?.phoneNumber || "Téléphone à afficher"}
                  </Text>
                </View>
                <View>
                  <Text style={tw`text-xs text-gray-500`}>N° SIEGE</Text>
                  <Text style={tw`text-base font-bold text-gray-800 text-right`}>
                    {seatNumber ? seatNumber.toString() : selectedPassenger?.seatNumber || "1"}
                  </Text>
                </View>
              </View>

              {/* From/To Section */}
              <View style={tw`px-4 py-1 flex-row justify-between`}>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-xs text-gray-500`}>From</Text>
                  <Text style={tw`text-sm font-semibold text-gray-800`}>
                    {ticketData.departure}
                  </Text>
                </View>

                <View style={tw`mx-10 justify-center`}>
                  <Ionicons name="arrow-forward" size={16} color="#374151" />
                </View>

                <View style={tw`flex-1`}>
                  <Text style={tw`text-xs text-gray-500`}>Destination</Text>
                  <Text style={tw`text-sm font-semibold text-gray-800`}>
                    {ticketData.destination}
                  </Text>
                </View>
              </View>

              {/* Date & Time */}
              <View style={tw`px-4 py-3`}>
                <View style={tw`flex-row justify-between bg-gray-50 rounded-xl p-3`}>
                  <View style={tw`flex-row items-center`}>
                    <View
                      style={tw`w-8 h-8 bg-teal-100 rounded-full items-center justify-center mr-2`}
                    >
                      <Ionicons name="calendar-outline" size={16} color="#0D9488" />
                    </View>
                    <View>
                      <Text style={tw`text-xs text-gray-500`}>Date de départ</Text>
                      <Text style={tw`text-sm font-medium text-gray-800`}>
                        {ticketData.departureDate}
                      </Text>
                    </View>
                  </View>

                  <View style={tw`flex-row items-center`}>
                    <View
                      style={tw`w-8 h-8 bg-teal-100 rounded-full items-center justify-center mr-2`}
                    >
                      <Ionicons name="time-outline" size={16} color="#0D9488" />
                    </View>
                    <View>
                      <Text style={tw`text-xs text-gray-500`}>Heure</Text>
                      <Text style={tw`text-sm font-medium text-gray-800`}>
                        {ticketData.departureTime}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Ticket Details & QR Code */}
              <View
                style={tw`px-4 py-3 flex-row justify-between items-start border-t border-gray-100`}
              >
                <View style={tw`flex-1`}>
                  <Text style={tw`text-sm font-semibold text-gray-800`}>
                    <Text style={tw`text-sm text-gray-500`}>Matricule Bus : </Text>
                    <Text>{vehicleNumber || "Non spécifié"}</Text>
                  </Text>
                  <Text style={tw`text-sm font-semibold text-gray-800`}>
                    <Text style={tw`text-sm text-gray-500`}>Prix du Tickets : </Text>
                    <Text>{ticketData.price}</Text>
                  </Text>
                  <Text style={tw`text-sm font-semibold text-gray-800`}>
                    <Text style={tw`text-sm text-gray-500`}>Station de Départ : </Text>
                    <Text>{station_depart || "Non spécifiée"}</Text>
                  </Text>
                  <Text style={tw`text-sm font-semibold text-gray-800`}>
                    <Text style={tw`text-sm text-gray-500`}>Station d'arrivée : </Text>
                    {station_arrivee}
                  </Text>
                </View>

                <View style={tw`items-end`}>
                  {qrCodeData ? (
                    <QRCode
                      value={qrCodeData}
                      size={100}
                      color="#000000"
                      backgroundColor="#ffffff"
                      logoBackgroundColor="#ffffff"
                      getRef={(c) => (qrCodeRef.current = c)}
                    />
                  ) : (
                    <ActivityIndicator size="small" color="#374151" />
                  )}
                </View>
              </View>
            </View>
          </ViewShot>

          {/* Boutons d'action */}
          <View style={tw`w-full max-w-[340px] mt-6 mx-auto px-2`}>
            <View style={tw`flex-row justify-between gap-4`}>
              <TouchableOpacity
                style={tw`flex-1 flex-row items-center justify-center bg-teal-600 py-3 px-4 rounded-xl`}
                onPress={handleShareTicket}
                disabled={shareLoading}
              >
                <Ionicons name="share-outline" size={20} color="white" style={tw`mr-2`} />
                <Text style={tw`text-white font-semibold`}>
                  {shareLoading ? "Partage..." : "Partager"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={tw`flex-1 flex-row items-center justify-center bg-teal-700 py-3 px-4 rounded-xl`}
                onPress={handleDownloadTicket}
                disabled={downloadLoading}
              >
                <Ionicons name="download-outline" size={20} color="white" style={tw`mr-2`} />
                <Text style={tw`text-white font-semibold`}>
                  {downloadLoading ? "Téléchargement..." : "Télécharger"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </TicketHeader>
  );
}
