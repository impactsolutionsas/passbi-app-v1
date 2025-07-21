import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  BackHandler,
  Modal,
  TextInput,
  Dimensions,
  Image
} from "react-native";
import tw from "../../../tailwind";
import { Ionicons } from "@expo/vector-icons";
import TicketHeader from "../../../../constants/TicketHeader/TicketHeader";
import { useRouter, useLocalSearchParams } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { getUser, setToken, getToken, activateTicket } from "../../../../services/api/api";
import ViewShot, { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import ConfettiCannon from "react-native-confetti-cannon";
import { useRoute } from "@react-navigation/native";
import { formatTime } from "../../Reservation/RechercheTrajet/utils";
import { ProtectedRouteGuard } from '../../../../components/ProtectedRouteGuard';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTickets } from "../../../../constants/contexte/TicketsContext";

// Fonction utilitaire pour décoder les URL
const decodeUrlParam = (param: string): string => {
  if (!param) return "";
  try {
    return decodeURIComponent(param);
  } catch (error) {
    return param;
  }
};

// Type definitions
type RouteParams = {
  departure?: string;
  destination?: string;
  date?: string;
  seat?: string;
  totalAvailableSeats?: string;
  departureTime?: string;
  price?: number;
  tripId?: string;
  name?: string;
  phoneNumber?: string;
  reserveId?: string;
  temporaryReservationId?: string;
  operatorName?: string;
  operatorLogoUrl?: string;
  operatorSlogan?: string;
  operatorCommission?: number;
  transportType?: string;
  passengers?: string;
  arrivalStation?: string;
  reservation?: string;
  // Paramètres BRT/TER
  id?: string;
  zoneName?: string;
  zoneType?: string;
  departureStation?: string;
  destinationStation?: string;
  amount?: string;
  ticket?: {
    code: string;
    status: string;
    ticketCount: {
      count: number;
      classeType: string;
    };
  };
  ticketCount?: string;
  code?: string;
  zone?: string;
  status?: string;
  createdAt?: string;
  expiresAt?: string;
  methodePay?: string;
  ticketId?: string;
  pendingExpiresAt?: string;
  classeType?: string;
  operatorType?: string;
  // Paramètres spécifiques Dem Dikk
  lineNumber?: string;
  lineName?: string;
  validatedAt?: string;
  expirationDate?: string;
  bookingDate?: string;
  bookingTime?: string;
  isInterZones?: boolean;
};

interface UserData {
  data?: {
    user?: {
      firstName?: string;
      name?: string;
    };
  };
}

interface TicketData {
  departure: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  ticketCode: string;
  id?: string; // Ajout du champ id (UUID)
  price: string;
  zone: string;
  zoneName: string;
  expiresAt: string;
  validatedAt: string;
  operatorName: string;
  operatorLogoUrl: string;
  matriculevehcle: string;
  transportType: string;
  classeType: string;
  // Champs spécifiques à Dem Dikk
  lineNumber?: string;
  lineName?: string;
  validityDuration?: string;
  // Champs ajoutés après activation
  bookingDate?: string;
  bookingTime?: string;
}


// Define QRCodeData interface
interface QRCodeData {
  ticketId: string;
  departure: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  price: string;
  expiresAt: string;
  validatedAt: string;
  operatorName: string;
  classeType: string;
  lineNumber?: string;
  lineName?: string;
  validityDuration?: string;
}

// Composant QR Scanner corrigé
function QRScanner({ visible, onScan, onClose }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [hasPermission, setHasPermission] = useState(false);
  const [scanned, setScanned] = useState(false);
const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    const getPermission = async () => {
      if (permission && permission.granted) {
        setHasPermission(true);
      } else {
        const { granted } = await requestPermission();
        setHasPermission(granted);
      }
    };

    if (visible) {
      getPermission();
      setScanned(false);
    }
  }, [visible, permission, requestPermission]);
const handleBarCodeScanned = ({ type, data }) => {
  if (scanned) return;
  setScanned(true);
  let matricule = data;
  try {
    const parsed = JSON.parse(data);
    if (parsed.matricule) matricule = String(parsed.matricule);
  } catch (e) {
    matricule = String(data);
  }
  
  // Fermer le scanner immédiatement
  onClose();
  
  // Déclencher l'activation
setTimeout(() => {
    onScan(matricule);
  }, 1000);
};

  if (!visible) return null;

  /*   if (!hasPermission) {
      return (
        <Modal visible={visible} animationType="slide">
          <View style={tw`flex-1 justify-center items-center bg-black`}>
            <Text style={tw`text-white text-lg mb-4`}>
              Permission caméra requise pour scanner le QR code
            </Text>
            <TouchableOpacity
              style={tw`bg-blue-500 px-6 py-3 rounded-lg mb-4`}
              onPress={requestPermission}
            >
              <Text style={tw`text-white font-semibold`}>Autoriser la caméra</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={tw`bg-red-500 px-6 py-3 rounded-lg`}
              onPress={onClose}
            >
              <Text style={tw`text-white font-semibold`}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      );
    }
   */
  return (
    <Modal visible={visible} animationType="slide">
      <View style={tw`flex-1 bg-black`}>
        {/* Header */}
        <View style={tw`absolute top-12 left-0 right-0 z-10 px-4`}>
          <View style={tw`flex-row justify-between items-center`}>
            <TouchableOpacity
              style={tw`bg-black bg-opacity-50 p-3 rounded-full`}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={tw`text-white text-lg font-semibold`}>
              Scanner le QR code du véhicule
            </Text>
            <View style={tw`w-12`} />
          </View>
        </View>

        {/* Camera View */}
        <CameraView
          style={tw`flex-1`}
          facing="back"
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "pdf417"],
          }}
        />

        {/* Overlay avec cadre de scan */}
        <View style={tw`absolute inset-0 justify-center items-center`}>
          <View style={tw`w-64 h-64 border-2 border-white rounded-lg`}>
            <View style={tw`absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500`} />
            <View style={tw`absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500`} />
            <View style={tw`absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500`} />
            <View style={tw`absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500`} />
          </View>
        </View>

        {/* Instructions */}
        <View style={tw`absolute bottom-20 left-0 right-0 px-4`}>
          <Text style={tw`text-white text-center text-base mb-4`}>
            Placez le QR code du véhicule dans le cadre
          </Text>
          {scanned && (
            <TouchableOpacity
              style={tw`bg-blue-500 py-3 px-6 rounded-lg`}
              onPress={() => setScanned(false)}
            >
              <Text style={tw`text-white text-center font-semibold`}>
                Scanner à nouveau
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function TicketScreen() {
  return (
    <ProtectedRouteGuard>
      <TicketScreenContent />
    </ProtectedRouteGuard>
  );
}

function TicketScreenContent() {
  const router = useRouter();
  const route = useRoute();
  const params = useLocalSearchParams() as any;
  console.log(params);

  const { refreshTickets } = useTickets(); 


  const [user, setUser] = useState<UserData | null>(null);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false); 
  const [error, setError] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState("");
  const qrCodeRef = useRef<any>(null);

  // Données du ticket
  const [ticketData, setTicketData] = useState<TicketData>({
    departure: "",
    destination: "",
    departureDate: "",
    departureTime: "",
    ticketCode: "",
    price: "",
    zone: "",
    zoneName: "",
    expiresAt: "",
    validatedAt: "",
    matriculevehcle: "",
    operatorName: "",
    operatorLogoUrl: "",
    transportType: "",
    classeType: "",
  });
  console.log("ticketData", ticketData);

  const [shareLoading, setShareLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [operatorType, setOperatorType] = useState("");

  const ticketRef = useRef<any>(null);
  const confettiRef = useRef<any>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);
  const [matriculeVehicle, setMatriculeVehicle] = useState('');
  useEffect(() => {
    const initialActivated = params.status === true || params.status === 'Valid';
    setActivated(initialActivated);
  }, [params.status]);

  // Générer les données pour le QR code
  const generateQRCodeData = (ticketInfo: TicketData): string => {
    if (!ticketInfo) return "";

    const qrData: QRCodeData = {
      ticketId: ticketInfo.ticketCode,
      departure: ticketInfo.departure,
      destination: ticketInfo.destination,
      departureDate: ticketInfo.departureDate,
      departureTime: ticketInfo.departureTime,
      price: ticketInfo.price,
      expiresAt: ticketInfo.expiresAt,
      validatedAt: ticketInfo.validatedAt,
      operatorName: ticketInfo.operatorName,
      classeType: ticketInfo.classeType || "",
      lineNumber: ticketInfo.lineNumber,
      lineName: ticketInfo.lineName,
      validityDuration: ticketInfo.validityDuration,
    };

    return JSON.stringify(qrData);
  };

  const destinationRoute = decodeUrlParam(params.destination || params.arrivalStation || "");
  const departRoute = decodeUrlParam(params.departure || params.departureStation || "");
  const classeROute = params.classeType || "";
  const ZoneType = params.zoneName || "";

  const price = params.price || "";
  const ticketCountRoute = params.ticketCount || params.ticket?.ticketCount.count || params.seat;
  const validatedAtFromParams = params.expirationDate || params.expiresAt || ticketData.expiresAt;
  const validatedAtFromParamsDemDikk = params.expiresAt || ticketData.expiresAt;

  const isInterZones = params.isInterZones;
  const date = params.bookingDate || params.date;
  const bookingDate = params.validatedAt || ticketData.validatedAt;

  const bookingTime = params.validatedAt || ticketData.validatedAt;
  const logoUrl = params.operatorLogoUrl;
  const departurezone = params.departurezone;

 useEffect(() => {
  const operType = params.operatorType || "";
  setOperatorType(operType);
  if (operType === "BRT") {
    processBRTTicket();
  } else if (operType === "TER") {
    processTERTicket();
  } else if (operType === "DemDikk") {
    processDemDikkTicket();
  } else {
    setError("Type d'opérateur non reconnu");
  }
}, [params.operatorType, params.amount, params.code, params.id]); // ✅ Dépendances spécifiques


  useEffect(() => {
    const onBackPress = () => {
      try {
        if (router.canGoBack && router.canGoBack()) {
          router.back();
        } else {
          router.replace("../../../pages/home/accueil");
        }
      } catch (e) {
        router.replace("../../../pages/home/accueil");
      }
      return true;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => backHandler.remove();
  }, [router]);

  // Traiter les données du ticket BRT
  const processBRTTicket = () => {
    const paymentResponse = {
      data: {
        amount: parseInt(params.amount || ""),
        destinationStation: params.destinationStation || destinationRoute,
        classeType: params.classeType,
        code: params.code || "",
        createdAt: new Date().toISOString(),
        departureStation: params.departureStation || departRoute,
        expiresAt: params.expiresAt || new Date(Date.now() + 3600000).toISOString(),
        feeDetails: {
          baseAmount: parseInt(params.amount || ""),
          finalAmount: parseInt(params.amount || "") * 0.95,
          operatorCommission: 5,
          operatorCommissionAmount: parseInt(params.amount || "500") * 0.05,
          passengerCommission: 0,
          passengerCommissionAmount: 0,
          totalAmount: parseInt(params.amount || "500"),
          totalFees: parseInt(params.amount || "500") * 0.05,
        },
        fees: parseInt(params.amount || "500") * 0.05,
        finalAmount: parseInt(params.amount || "520") * 0.95,
        id: params.id || "",
        nbZones: 0,
        operatorName: params.operatorName || "",
        pendingExpiresAt: null,
        status: "Valid",
        ticketCount: parseInt(params.ticketCount || ""),
        totalAmount: parseInt(params.amount || ""),
        validatedAt: new Date().toISOString(),
        zone: params.zoneName,
        zoneType: params.zoneName || "",
      },
      message: "Ticket confirmé et payé avec succès",
      status: 200,
    };

    const createdDate = new Date(paymentResponse.data.createdAt);
    const dateOptions: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "short",
      year: "numeric",
    };
    const formattedDateStr = createdDate.toLocaleDateString("fr-FR", dateOptions);

    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
    };
    const formattedTimeStr = createdDate.toLocaleTimeString("fr-FR", timeOptions);

    const expiresDate = new Date(paymentResponse.data.expiresAt);

    const updatedTicketData: TicketData = {
      departure: paymentResponse.data.departureStation || "",
      destination: paymentResponse.data.destinationStation || "",
      departureDate: formattedDateStr,
      departureTime: formattedTimeStr,
      id: paymentResponse.data.id,
      ticketCode: paymentResponse.data.code,
      price: `${paymentResponse.data.amount} FCFA`,
      expiresAt: paymentResponse.data.expiresAt,
      validatedAt: paymentResponse.data.validatedAt,
      operatorName: paymentResponse.data.operatorName,
      transportType: "BRT",
      zone: paymentResponse.data.zone || "",
      zoneName: paymentResponse.data.zone || "",
      operatorLogoUrl: "",
      classeType: paymentResponse.data.classeType || "", 
       matriculevehcle: "", // AJOUTER CETTE LIGNE

    };

    setTicketData(updatedTicketData);
    const qrData = generateQRCodeData(updatedTicketData);
    setQrCodeData(qrData);
  };

  // Traiter les données du ticket TER
  const processTERTicket = () => {
    const paymentResponse = {
      data: {
        amount: parseInt(params.amount || "2500"),
        destinationStation: params.destinationStation || "Diamniadio",
        classeType: params.classe === "Classe_1" ? 1 : 2,
        code: params.code || "e87d69ba-6b1d-464b-8e72-50cbc244540b",
        createdAt: new Date().toISOString(),
        departureStation: params.departureStation || "Dakar",
        expiresAt: params.expiresAt || new Date(Date.now() + 7200000).toISOString(),
        feeDetails: {
          baseAmount: parseInt(params.amount || "2500"),
          finalAmount: parseInt(params.amount || "2500") * 0.95,
          operatorCommission: 5,
          operatorCommissionAmount: parseInt(params.amount || "2500") * 0.05,
          passengerCommission: 5,
          passengerCommissionAmount: parseInt(params.amount || "2500") * 0.05,
          totalAmount: parseInt(params.amount || "2500") * 1.05,
          totalFees: parseInt(params.amount || "2500") * 0.1,
        },
        fees: parseInt(params.amount || "2500") * 0.1,
        finalAmount: parseInt(params.amount || "2500") * 0.95,
        id: params.id || "426e9aae-7d0e-4c4c-aeff-ee9dd488b6d6",
        nbZones: 0,
        operatorName: params.operatorName || "TER Senegal",
        pendingExpiresAt: null,
        status: "Valid",
        ticketCount: parseInt(params.ticketCount || "1"),
        totalAmount: parseInt(params.amount || "2500") * 1.05,
        validatedAt: validatedAtFromParams,
        zone: params.zone,
        zoneType: params.zone || "SAME_ZONE",
      },
      message: "Ticket confirmé et payé avec succès",
      status: 200,
    };

    const createdDate = new Date(paymentResponse.data.createdAt);
    const dateOptions: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "short",
      year: "numeric",
    };
    const formattedDateStr = createdDate.toLocaleDateString("fr-FR", dateOptions);

    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
    };
    const formattedTimeStr = createdDate.toLocaleTimeString("fr-FR", timeOptions);

    const expiresDate = new Date(paymentResponse.data.expiresAt);
    const expiresTimeStr = expiresDate.toLocaleTimeString("fr-FR", timeOptions);

    const classeDisplay = paymentResponse.data.classeType === 1 ? "Classe 1" : "Classe 2";

    const updatedTicketData: TicketData = {
      departure: paymentResponse.data.departureStation,
      destination: paymentResponse.data.destinationStation,
      departureDate: formattedDateStr,
      departureTime: formattedTimeStr,
      ticketCode: paymentResponse.data.code,
      price: `${paymentResponse.data.amount} FCFA`,
      expiresAt: expiresTimeStr,
      validatedAt: paymentResponse.data.validatedAt,
      operatorName: paymentResponse.data.operatorName,
      transportType: "TER",
      zone: paymentResponse.data.zone || "",
      zoneName: paymentResponse.data.zone || "",
      operatorLogoUrl: "",
      classeType: classeDisplay,
      matriculevehcle: "", // AJOUTER CETTE LIGNE

    };

    setTicketData(updatedTicketData);
    const qrData = generateQRCodeData(updatedTicketData);
    setQrCodeData(qrData);
  };

  // Traiter les données du ticket Dem Dikk
  const processDemDikkTicket = () => {
    const paymentResponse = {
      data: {
        amount: parseInt(params.amount || ""),
        destinationStation: params.destinationStation || destinationRoute || "",
        code: params.code || "",
        createdAt: new Date().toISOString(),
        departureStation: params.departureStation || departRoute || "",
        expiresAt: params.expiresAt,
        feeDetails: {
          baseAmount: parseInt(params.amount || ""),
          finalAmount: parseInt(params.amount || ""),
          operatorCommission: 5,
          operatorCommissionAmount: parseInt(params.amount || ""),
          passengerCommission: 0,
          passengerCommissionAmount: 0,
          totalAmount: parseInt(params.amount || ""),
          totalFees: parseInt(params.amount || ""),
        },
        fees: parseInt(params.amount || ""),
        finalAmount: parseInt(params.amount || ""),
        id: params.id,
        operatorName: params.operatorName || "Dem Dikk",
        pendingExpiresAt: null,
        status: "Valid",
        ticketCount: parseInt(params.ticketCount || "1"),
        totalAmount: parseInt(params.amount || ""),
        validatedAt: params.validatedAt,
        lineNumber: params.lineNumber || "",
        lineName: params.lineName || "",
        validityDuration: params.validatedAt || "",
      },
      message: "Ticket confirmé et payé avec succès",
      status: 200,
    };


    const createdDate = new Date(paymentResponse.data.createdAt);
    const dateOptions: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "short",
      year: "numeric",
    };
    const formattedDateStr = createdDate.toLocaleDateString("fr-FR", dateOptions);

    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
    };
    const formattedTimeStr = createdDate.toLocaleTimeString("fr-FR", timeOptions);

    const expiresDate = new Date(paymentResponse.data.expiresAt);
    const expiresTimeStr = expiresDate.toLocaleTimeString("fr-FR", timeOptions);

    const updatedTicketData: TicketData = {
      departure: paymentResponse.data.departureStation || "",
      destination: paymentResponse.data.destinationStation || "",
      departureDate: formattedDateStr,
      departureTime: formattedTimeStr,
      ticketCode: paymentResponse.data.code,
      id: paymentResponse.data.id, // Ajouté ici
      price: `${paymentResponse.data.amount} FCFA`,
      expiresAt: paymentResponse.data.expiresAt,
      validatedAt: paymentResponse.data.validatedAt,
      operatorName: paymentResponse.data.operatorName,
      transportType: "DemDikk",
      zone: "",
      zoneName: "",
      operatorLogoUrl: "",
      classeType: "",
      lineNumber: paymentResponse.data.lineNumber,
      lineName: paymentResponse.data.lineName,
      validityDuration: paymentResponse.data.validityDuration,
        matriculevehcle: "", // AJOUTER CETTE LIGNE

    };

    setTicketData(updatedTicketData);
    const qrData = generateQRCodeData(updatedTicketData);
    setQrCodeData(qrData);
  };

  // Afficher l'effet confetti lorsque le ticket se charge
  useEffect(() => {
    const timer = setTimeout(() => {
      if (confettiRef.current) {
        confettiRef.current.start();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Fonction pour télécharger le ticket
  const handleDownloadTicket = async () => {
    try {
      setDownloadLoading(true);

      if (!ticketRef.current) {
        Alert.alert("Erreur", "Impossible de capturer l'image du ticket.");
        return;
      }

      const uri = await captureRef(ticketRef, {
        format: "png",
        quality: 1,
      });

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission requise", "Veuillez autoriser l'accès à votre galerie.");
        return;
      }

      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync(`${ticketData.transportType} Tickets`, asset, false);

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
          body: "Touchez ici pour voir l'image.",
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
        Alert.alert("Erreur", "Impossible de capturer l'image du ticket.");
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
          dialogTitle: `Partagez votre ticket ${ticketData.transportType}`,
          UTI: "public.png",
        });
      } else {
        const { status } = await MediaLibrary.requestPermissionsAsync();

        if (status === "granted") {
          const asset = await MediaLibrary.createAssetAsync(uri);
          await MediaLibrary.createAlbumAsync(`${ticketData.transportType} Tickets`, asset, false);
          Alert.alert("Succès", "Ticket enregistré dans votre galerie");
        } else {
          Alert.alert("Erreur", "Permission de stockage refusée");
        }
      }
    } catch (error) {
      Alert.alert("Erreur", "Impossible de partager le ticket");
    } finally {
      setShareLoading(false);
    }
  };

  // Handler d'activation
const handleActivateTicket = async (matriculeVehicle) => {
  setActivating(true);
  
  try {
    if (!ticketData.id) {
      Alert.alert("Erreur", "Ce ticket ne peut pas être activé car il ne possède pas d'identifiant unique (UUID).");
      setActivating(false);
      return;
    }
    
    const result = await activateTicket(ticketData.id, matriculeVehicle);
    
    // Mise à jour locale de l'état du ticket après activation
    setTicketData({
      ...ticketData,
      ticketCode: result.code,
      price: result.amount + " FCFA",
      expiresAt: result.expiresAt,
      validatedAt: result.validatedAt,
      operatorName: ticketData.operatorName,
      transportType: ticketData.transportType,
      classeType: result.classeType,
      matriculevehcle: matriculeVehicle, // AJOUTER CETTE LIGNE
      bookingDate: result.validatedAt ? new Date(result.validatedAt).toLocaleDateString("fr-FR") : "",
      bookingTime: result.validatedAt ? new Date(result.validatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "",
    });
    
    setActivated(true);
    setShowScanner(false);
    
      // Redirection immédiate
    router.replace("/pages/home/mestickets");

    // Ces actions peuvent être faites après, sans bloquer la navigation
    refreshTickets();
    Notifications.scheduleNotificationAsync({
      content: {
        title: "✅ Ticket activé !",
        body: "Votre ticket a été activé avec succès",
        sound: true,
      },
      trigger: null,
    }); 
    
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Erreur activation';
    Alert.alert('❌ Erreur', errorMessage);
  } finally {
    setActivating(false);
  }
};

  // Afficher l'écran de chargement pendant la récupération des données
  if (loading) {
    return (
      <TicketHeader
        operator={{
          name: ticketData.operatorName || "Transport",
          transportType: ticketData.transportType || "PassBi",
          logoUrl: ticketData.operatorLogoUrl || logoUrl,
        }}
      >
        <View style={tw`flex-1 items-center justify-center py-20 bg-gray-100 px-4`}>
          <ActivityIndicator size="large" color="#38B2AC" />
          <Text style={tw`mt-4 text-lg text-gray-700`}>Chargement de votre ticket...</Text>
        </View>
      </TicketHeader>
    );
  }

  // Afficher le message d'erreur si nécessaire
  if (error) {
    return (
      <TicketHeader
        operator={{
          name: ticketData.operatorName || "Transport",
          logoUrl: ticketData.operatorLogoUrl || logoUrl,
          transportType: ticketData.transportType || "PassBi",
        }}
      >
        <View style={tw`flex-1 items-center justify-center py-20 bg-gray-100 px-4`}>
          <Text style={tw`text-red-500 text-lg`}>Erreur : {error}</Text>
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

  // Personnaliser les couleurs en fonction de l'opérateur
  const getOperatorColors = () => {
    switch (operatorType) {
      case "TER":
        return {
          primary: "#10B981",
          secondary: "#059669",
          accent: "#065F46",
          background: "#ECFDF5",
        };
      case "DemDikk":
        return {
          primary: "#10B981",
          secondary: "#059669",
          accent: "#065F46",
          background: "#EFF6FF",
        };
      case "BRT":
      default:
        return {
          primary: "#10B981",
          secondary: "#059669",
          accent: "#065F46",
          background: "#ECFDF5",
        };
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('fr-FR', options as Intl.DateTimeFormatOptions);
  };
  const formatTime = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    return date.toLocaleTimeString('fr-FR', options);
  };

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

  const operatorColors = getOperatorColors();

  // Affichage conditionnel Dem Dikk interzones
  return (
    <TicketHeader
      operator={{
        name: ticketData.operatorName,
        transportType: ticketData.transportType,
        logoUrl: ticketData.operatorLogoUrl || logoUrl,
      }}
    >
      <View style={tw`flex-1`}>
        <ScrollView style={tw`flex-1 bg-white`} contentContainerStyle={tw`items-center py-2 px-4 pb-20`}>
          {!activated ? (
            <View>
              <ViewShot ref={ticketRef} style={[tw`w-full mx-auto`, { opacity: operatorType === "DemDikk" ? 0.8 : 0.5 }]}> 
                <View style={tw`bg-white rounded-2xl   ${operatorType === "DemDikk" ? "from-teal-50 to-white" : ""}`}>
                  <View style={tw`px-6 pt-6  border-b border-gray-50`}>
                    {operatorType === "DemDikk" ? (
                      <View style={tw`items-left`}>
                        <View style={tw`bg-red-50 rounded-lg p-3 mx-4 mb-1 border border-red-200`}>
                          <View style={tw`flex-row  justify-left`}>
                            <View style={tw`h-3 w-3 rounded-full bg-red-500 mr-2`} />
                            <Text style={tw`text-sm font-medium text-red-700`}>
                              Ticket non activé
                            </Text>
                          </View>
                          <Text style={tw`text-xs text-red-600 mt-2 text-left`}>
                            Veuillez scanner le QR code du véhicule pour activer votre ticket
                          </Text>
                        </View>
                      </View>
                    ) : operatorType === "BRT" ? (
                      <View style={tw`items-center`}>
                        <Image
                          source={require("../../../../assets/images/brte.png")}
                          style={tw`w-40 h-16 mb-3`}
                          resizeMode="contain"
                        />
                        <View style={tw`bg-red-50 rounded-lg p-3 mx-4 mb-1 border border-red-200`}>
                          <View style={tw`flex-row  justify-left`}>
                            <View style={tw`h-3 w-3 rounded-full bg-red-500 mr-2`} />
                            <Text style={tw`text-sm font-medium text-red-700`}>
                              Ticket non activé
                            </Text>
                          </View>
                          <Text style={tw`text-xs text-red-600 mt-2 text-left`}>
                            Veuillez scanner le QR code du véhicule pour activer votre ticket
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <Text style={tw`text-2xl font-bold text-center text-gray-900`}>
                        {operatorType === "TER" ? "TER PassBi" : "BRT PassBi"}
                      </Text>
                    )}
                  </View>
                  <View style={tw`px-4 py-2`}>
                    {operatorType === "TER" ? (
                      <View style={tw`flex-row justify-between mb-4`}>
                        <View style={tw`mb-1 items-center`}>
                          <Text style={tw`text-lg text-center font-bold text-gray-900`}>
                            {formatZone(ticketData.zoneName || ZoneType)}
                          </Text>
                        </View>
                        <View style={tw`flex-row items-center`}>
                          <Text
                            style={tw`text-base font-bold text-gray-800 px-2 bg-teal-100 text-right`}
                          >
                            {classeROute || "1er Classe"}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View style={tw`mb-4 `}>
                        <Text style={tw`text-sm font-bold   text-gray-900`}>
                          {ticketData.zone || ZoneType}
                        </Text>
                      </View>
                    )}
                    {operatorType === "DemDikk" ? (
                      <View style={tw`flex-row justify-between mb-4`}>
                        <View style={tw`mb-1 items-center`}>
                          <Text style={tw`text-lg text-center font-bold text-gray-900`}>
                            {departurezone}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View style={tw`mb-4 `}></View>
                    )}
                    <View style={tw`flex-row justify-between mb-2`}>
                      <View style={tw`flex-1 w-full`}>
                        <Text style={tw`text-xs text-gray-500`}>De</Text>
                        <Text style={tw`text-sm font-semibold w-100 text-gray-800`}>{departRoute}</Text>
                      </View>
                      <View style={tw`mx-6`}>
                        <Ionicons name="arrow-forward" size={16} color="#374151" />
                      </View>
                      <View style={tw`flex-1 w-full`}>
                        <Text style={tw`text-xs text-gray-500`}>Destination</Text>
                        <Text style={tw`text-sm font-semibold w-100 text-gray-800`}>
                          {destinationRoute}
                        </Text>
                      </View>
                    </View>
                    <View style={tw`bg-gray-50 rounded-xl p-1 mb-1`}></View>
                    <View style={tw`flex-row justify-between items-center`}>
                      <Text style={tw`text-sm text-gray-500`}>Prix du ticket</Text>
                      <Text style={tw`text-xl font-bold text-teal-700`}>{price} FCFA</Text>
                    </View>
                  </View>
                </View>
              </ViewShot>
              <View style={tw`w-full max-w-[340px] mt-6 mx-auto px-2`}>
                <TouchableOpacity
                  style={tw`bg-blue-600 py-3 px-4 rounded-xl items-center`}
                  onPress={() => setShowScanner(true)}
                  disabled={activating}>
                  <Text style={tw`text-white font-semibold`}>{activating ? 'Activation...' : 'Scanner le ticket'}</Text>
                </TouchableOpacity>
              </View>
              <QRScanner visible={showScanner} onScan={(matricule) => { setMatriculeVehicle(matricule); handleActivateTicket(matricule); }} onClose={() => setShowScanner(false)} />
            </View>
          ) : (
            <View>
              <ViewShot ref={ticketRef} style={tw`w-full mx-auto`}>
                <View style={tw`bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-lg`}>
                  <View style={tw`px-6 pt-6  border-b border-gray-50`}>
                    <Text style={tw`text-2xl font-bold text-center text-gray-900`}>
                      {operatorType === "TER"
                        ? "TER PassBi"
                        : operatorType === "DemDikk"
                          ? "Dem Dikk PassBi"
                          : "BRT PassBi"}
                    </Text>
                  </View>
                  <View style={tw`px-6 py-3 items-center border-b border-gray-50`}>
                    {qrCodeData ? (
                      <QRCode
                        value={qrCodeData}
                        size={150}
                        color="#000000"
                        backgroundColor="#ffffff"
                        logoBackgroundColor="#ffffff"
                        getRef={(c) => (qrCodeRef.current = c)}
                      />
                    ) : (
                      <ActivityIndicator size="large" color="#374151" />
                    )}
                  </View>
                  {/* Bloc d'informations spécifiques à chaque opérateur */}
                  <View style={tw`px-4`}>
                    {operatorType === "DemDikk" && (
                      <View style={tw`w-full h-full mt-3`}>
                        <View style={tw`flex-row items-center justify-between mb-3`}>
                          <Ionicons name="location" size={16} />
                          <Text style={tw`text-sm font-medium ml-2`}>
                            {departurezone}
                          </Text>
                        </View>
                        <View style={tw`flex-row items-center mb-4`}>
                          <Ionicons name="bus" size={16} />
                          <Text style={tw`text-sm  font-medium ml-2`}>
                            Matricule: {params.matriculeVehicle}
                          </Text>
                        </View>
                        <View style={tw`flex-row items-center justify-between mb-4`}>
                          <View style={tw`flex-1`}>
                            <Text style={tw`text-xs uppercase tracking-wider text-gray-500`}>Départ</Text>
                            <View style={tw`flex-row items-center`}>
                              <Ionicons name="location-outline" size={16} color="#0D9488" />
                              <Text style={tw`text-sm font-medium text-gray-800 ml-2`}>{departRoute}</Text>
                            </View>
                          </View>
                          <View style={tw`mx-4`}>
                            <View style={tw`bg-teal-100 rounded-full p-2`}>
                              <Ionicons name="arrow-forward" size={16} color="#0D9488" />
                            </View>
                          </View>
                          <View style={tw`flex-1`}>
                            <Text style={tw`text-xs uppercase tracking-wider text-gray-500 mb-1`}>Arrivée</Text>
                            <View style={tw`flex-row items-center`}>
                              <Ionicons name="location" size={16} color="#0D9488" />
                              <Text style={tw`text-sm font-medium text-gray-800 ml-2`}>{destinationRoute}</Text>
                            </View>
                          </View>
                        </View>
                        {activated && (
                          <View style={tw`bg-gray-50 rounded-xl p-4 mb-2`}>
                            <View style={tw`flex-row justify-between mb-2`}>
                              <View style={tw`flex-row items-center p-2`}>
                                <Ionicons
                                  name="calendar-outline"
                                  size={16}
                                  color="#0D9488"
                                />
                                <Text style={tw`text-base text-gray-800 ml-3`}>
                                  Date: {bookingDate
                                    ? formatDate(bookingDate) + " à " + formatTime(bookingTime)
                                    : (params.validatedAt
                                      ? formatDate(params.validatedAt) + " à " + formatTime(params.validatedAt)
                                      : "")}
                                </Text>
                              </View>
                            </View>
                            <View style={tw`flex-row items-center`}>
                              <Ionicons
                                name="time-outline"
                                size={20}
                                color="#0D9488"
                              />
                              <Text style={tw`text-base text-gray-800 ml-5`}>
                                Valide jusqu'à{" "}
                                {ticketData.expiresAt
                                  ? formatTime(ticketData.expiresAt)
                                  : (params.expiresAt ? formatTime(params.expiresAt) : "")
                                }
                              </Text>
                            </View>
                          </View>
                        )}
                        <View style={tw`flex-row justify-between items-center mt-3 pt-3 border-t border-blue-200`}>
                          <Text style={tw`text-sm text-gray-700 font-medium`}>Prix du ticket</Text>
                          <Text style={tw`text-xl font-bold`}>{price} FCFA</Text>
                        </View>
                      </View>
                    )}
                    {operatorType === "BRT" && (
                      <View style={tw`w-full h-full`}>
                        <View style={tw`flex-row items-center justify-between bg-teal-50 rounded-lg p-3 mb-3`}>
                          <View style={tw`flex-row items-center`}>
                            <View style={tw`bg-teal-100 rounded-full p-2 mr-3`}>
                              <Ionicons name="location" size={16} color="#0D9488" />
                            </View>
                            <Text style={tw`text-sm font-semibold text-gray-800`}>
                              {departurezone}
                            </Text>
                          </View>
                          <View style={tw`bg-teal-100 rounded-full p-1`}>
                            <Ionicons name="chevron-forward" size={16} color="#0D9488" />
                          </View>
                        </View>
                        <Text style={tw`text-sm font-semibold text-gray-800`}>Itinéraire</Text>
                         <View style={tw`flex-row items-center mb-4`}>
                          <View style={tw`flex-1`}>
                            <View style={tw`flex-row items-center`}>
                              <View style={tw`mr-3`}>
                                <View style={tw`w-4 h-4 rounded-full border-2 border-teal-500 bg-white`} />
                                <View style={tw`w-0.5 h-16 bg-teal-500 ml-[7px]`} />
                                <View style={tw`w-4 h-4 rounded-full bg-teal-500`} />
                              </View>
                              <View>
                                <View style={tw`mb-8`}>
                                  <Text style={tw`text-xs uppercase tracking-wider text-gray-500`}>STATION DE DEPART</Text>
                                  <Text style={tw`text-sm font-medium text-gray-800`}>{departRoute}</Text>
                                </View>
                                <View>
                                  <Text style={tw`text-xs uppercase tracking-wider text-gray-500`}>STATION D'ARRIVEE</Text>
                                  <Text style={tw`text-sm font-medium text-gray-800`}>{destinationRoute}</Text>
                                </View>
                              </View>
                            </View>
                          </View>
                        </View>
                        
                        {activated && (
                          <View style={tw`space-y-2`}>
                            <View style={tw`flex-row items-center`}>
                              <Ionicons name="calendar-outline" size={16} color="#0D9488" />
                              <Text style={tw`text-sm text-gray-800 ml-3`}>
                                Date: {bookingDate
                                  ? formatDate(bookingDate) + " à " + formatTime(bookingTime)
                                  : (params.validatedAt
                                    ? formatDate(params.validatedAt) + " à " + formatTime(params.validatedAt)
                                    : "")}
                              </Text>
                            </View>
                            <View style={tw`flex-row items-center`}>
                              <Ionicons name="time-outline" size={16} color="#0D9488" />
                              <Text style={tw`text-sm text-gray-800 ml-3`}>
                                Valide jusqu'à{" "}
                                {ticketData.expiresAt
                                  ? formatTime(ticketData.expiresAt)
                                  : (params.expiresAt ? formatTime(params.expiresAt) : "")
                                }
                              </Text>
                            </View>
                           
                            <View style={tw`flex-row items-center`}>
                              <Ionicons name="checkmark-circle-outline" size={16} color="#0D9488" />
                              <Text style={tw`text-sm text-gray-800 ml-3`}>
                                Activé: {params.validatedAt ? formatDate(params.validatedAt) : "N/A"}
                              </Text>
                            </View>
                          
                          </View>
                        )}
                        
                        <View style={tw`flex-row justify-between items-center mt-3 pt-3 border-t border-blue-200`}>
                          <Text style={tw`text-sm text-gray-700 font-medium`}>Prix du ticket</Text>
                          <Text style={tw`text-xl font-bold`}>{price} FCFA</Text>
                        </View>
                      </View>
                    )}
                    
                    {operatorType === "TER" && (
                      <View style={tw`w-full h-full mt-3`}>
                       
                        <View style={tw`flex-row items-center justify-between mb-3`}>
                          
                          <Text style={tw`text-sm font-semibold text-gray-800`}>{departurezone}</Text>
                          <View style={tw`bg-blue-50 px-3 py-1 rounded-lg`}>
                            <Text style={tw`text-sm font-semibold text-blue-700`}>
                              {ticketData.classeType === "classe 2" ? "2ème Classe" : 
                               ticketData.classeType === "classe 1" ? "1ère Classe" : 
                               ticketData.classeType || "1ère Classe"}
                            </Text>
                          </View>
                        </View>
                        <View style={tw`flex-row items-center justify-between mb-4`}>
                          <View style={tw`flex-1`}>
                            <View style={tw`flex-row items-center`}>
                              <Ionicons name="location-outline" size={16} />
                              <Text style={tw`text-sm font-medium text-gray-800 ml-2`}>{departRoute}</Text>
                            </View>
                          </View>
                          <View style={tw`mx-4`}>
                            <View style={tw`bg-blue-100 rounded-full p-2`}>
                              <Ionicons name="arrow-forward" size={16} />
                            </View>
                          </View>
                          <View style={tw`flex-1`}>
                            <View style={tw`flex-row items-center`}>
                              <Ionicons name="location" size={16} />
                              <Text style={tw`text-sm font-medium text-gray-800`}>{destinationRoute}</Text>
                            </View>
                          </View>
                        </View>
                        
                        {activated && (
                          <View style={tw`space-y-2`}>
                            <View style={tw`flex-row items-center`}>
                              <Ionicons name="calendar-outline" size={16} />
                              <Text style={tw`text-sm text-gray-800 ml-3`}>
                                Date: {bookingDate
                                  ? formatDate(bookingDate) + " à " + formatTime(bookingTime)
                                  : (params.validatedAt
                                    ? formatDate(params.validatedAt) + " à " + formatTime(params.validatedAt)
                                    : "")}
                              </Text>
                            </View>
                            <View style={tw`flex-row items-center`}>
                              <Ionicons name="time-outline" size={16} />
                              <Text style={tw`text-sm text-gray-800 ml-3`}>
                                Valide jusqu'à{" "}
                                {ticketData.expiresAt
                                  ? formatTime(ticketData.expiresAt)
                                  : (params.expiresAt ? formatTime(params.expiresAt) : "")
                                }
                              </Text>
                            </View>
                            <View style={tw`flex-row items-center`}>
                              <Ionicons name="checkmark-circle-outline" size={16} />
                              <Text style={tw`text-sm text-gray-800 ml-3`}>
                                Activé: {params.validatedAt ? formatDate(params.validatedAt) : "N/A"}
                              </Text>
                            </View>
                          </View>
                        )}
                        
                        <View style={tw`flex-row justify-between items-center mt-3 pt-3 border-t border-gray-200`}>
                          <Text style={tw`text-sm text-gray-700 font-medium`}>Prix du ticket</Text>
                          <Text style={tw`text-xl font-bold text-gray-700`}>{price} FCFA</Text>
                        </View>
                      </View>
                    )}
                    
                    {operatorType === "TER" ? (
                      <View style={tw`flex-row justify-between items-center mb-4 bg-gray-50/50 p-4 rounded-xl`}>
                        <Text style={tw`text-lg font-bold text-gray-900`}>
                          {formatZone(ticketData.zoneName || ZoneType)}
                        </Text>
                        <View style={tw`bg-teal-50 px-3 py-1 rounded-lg`}>
                          <Text style={tw`text-base font-semibold text-teal-700`}>
                            {classeROute || "1er Classe"}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View style={tw`bg-gray-50/50 p-4 rounded-xl`}>
                        <Text style={tw`text-base font-semibold text-gray-900`}>
                          {ticketData.zone || ZoneType}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </ViewShot>
              {/* Boutons d'action normaux */}
              <View style={tw`w-full flex-row justify-between gap-4 max-w-[340px] mt-6 mx-auto px-2`}>
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
          )}
        </ScrollView>
      </View>
    </TicketHeader>
  );
}
