import { useEffect, useState, useCallback, useContext } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity, Alert, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import tw from "../../../tailwind";
import { getToken } from "../../../../services/api/api";
import { useSecurePaymentNavigation } from "../../../../hooks/useSecurePaymentNavigation";

// Types
interface PaymentStatusResponse {
  status: "PENDING" | "PAID" | "FAILED";
  transactionCode?: string;
  reservationId?: string;
  message?: string;
}

interface PaymentParams {
  status: string;
  orderId?: string;
  transactionCode?: string;
  reservationId?: string;
  departure?: string;
  destination?: string;
  date?: string;
  seat?: string;
  departureTime?: string;
  price?: string;
  tripId?: string;
  operatorName?: string;
  passengers?: string;
  error?: string;
  transactionId?: string;
  amount?: string;
  currency?: string;
  paymentMethod?: string;
}

interface PassengerData {
  name: string;
  phoneNumber: string;
}

interface PaymentData {
  tripId: string;
  amount: string;
  methodePay: string;
  passengers: PassengerData[];
  redirectUrls: {
    successUrl: string;
    failureUrl: string;
    cancelUrl: string;
  };
}

// Constants
const PAYMENT_METHODS = {
  OM: "OM",
  WAVE: "wave",
} as const;

const PAYMENT_STATUS_MESSAGES = {
  PENDING: "Paiement en cours...",
  PAID: "Paiement réussi !",
  FAILED: "Paiement échoué",
};

// Utility functions
const parsePassengers = (passengersString?: string): PassengerData[] => {
  if (!passengersString) return [];
  try {
    return JSON.parse(passengersString);
  } catch {
    return [];
  }
};

const createDeepLinkUrl = (
  scheme: string,
  path: string,
  params: Record<string, string>
): string => {
  const queryString = Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
  return `${scheme}://${path}?${queryString}`;
};

// Payment Success Screen Component
export default function PaymentSuccess() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [icon, setIcon] = useState<string>("checkmark-circle");
  const [color, setColor] = useState<string>("text-green-600");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Hook de navigation sécurisée pour empêcher le retour pendant le traitement du paiement
  const { disableProtection, redirectToHome } = useSecurePaymentNavigation({
    isPaymentInProgress: isLoading || status === "PENDING",
    customMessage:
      "Le traitement du paiement est en cours. Vous ne pouvez pas revenir en arrière. Voulez-vous aller à l'accueil ?",
  });

  const {
    orderId,
    transactionCode,
    reservationId,
    departure,
    destination,
    date,
    seat,
    departureTime,
    price,
    tripId,
    operatorName,
    passengers,
    error: paymentError,
  } = params;

  const statusParam = params.status;
  if (statusParam) {
    const statusValue = Array.isArray(statusParam) ? statusParam[0] : statusParam;
    setStatus(statusValue);
  }

  const fetchPaymentStatus = useCallback(async () => {
    if (!orderId && !transactionCode && !reservationId) {
      setError("Informations de paiement manquantes");
      setStatus("FAILED");
      setIsLoading(false);
      return;
    }

    try {
      const token = await getToken();
      // Replace with your actual API call
      const response = await fetch(`/api/payment/status/${orderId || transactionCode}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: PaymentStatusResponse = await response.json();
      setStatus(data.status);

      if (data.status === "FAILED" && data.message) {
        setError(data.message);
      }
    } catch (err) {
      console.error("Erreur lors de la vérification du statut:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setStatus("FAILED");
    } finally {
      setIsLoading(false);
    }
  }, [orderId, transactionCode, reservationId, retryCount]);

  const handleRetry = useCallback(() => {
    if (retryCount < 3) {
      setIsLoading(true);
      setError(null);
      setRetryCount((prev) => prev + 1);
      fetchPaymentStatus();
    } else {
      Alert.alert("Limite de tentatives atteinte", "Veuillez contacter le support client.");
    }
  }, [retryCount, fetchPaymentStatus]);

  const navigateToTickets = useCallback(() => {
    // Désactiver la protection avant la redirection
    disableProtection();
    router.push({
      pathname: "../../pages/home/mestickets",
      params: {
        transactionCode: transactionCode || "",
        reservationId: reservationId || "",
        departure: departure || "",
        destination: destination || "",
        date: date || "",
        seat: seat || "",
        departureTime: departureTime || "",
        price: price || "",
        tripId: tripId || "",
        operatorName: operatorName || "",
        passengers: passengers || "[]",
      },
    });
  }, [
    transactionCode,
    reservationId,
    departure,
    destination,
    date,
    seat,
    departureTime,
    price,
    tripId,
    operatorName,
    passengers,
    router,
    disableProtection,
  ]);

  const navigateHome = useCallback(() => {
    // Désactiver la protection avant la redirection
    disableProtection();
    router.push("/");
  }, [router, disableProtection]);

  useEffect(() => {
    console.log("Paramètres reçus dans PaymentSuccess:", params);

    if (paymentError) {
      setStatus("FAILED");
      setError(Array.isArray(paymentError) ? paymentError[0] : paymentError);
      setIsLoading(false);
      return;
    }

    fetchPaymentStatus();
  }, [paymentError, fetchPaymentStatus]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={tw`mt-4 text-lg text-gray-600`}>Vérification du paiement...</Text>
        </View>
      );
    }

    const statusConfig = {
      PAID: {
        icon: "checkmark-circle",
        color: "text-green-600",
        bgColor: "bg-green-100",
        action: navigateToTickets,
        actionText: "Voir mes tickets",
      },
      FAILED: {
        icon: "close-circle",
        color: "text-red-600",
        bgColor: "bg-red-100",
        action: retryCount < 3 ? handleRetry : navigateHome,
        actionText: retryCount < 3 ? "Réessayer" : "Retour à l&apos;accueil",
      },
      PENDING: {
        icon: "time",
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
        action: handleRetry,
        actionText: "Actualiser",
      },
    };

    const config = status ? statusConfig[status] : statusConfig.FAILED;

    return (
      <View style={tw`flex-1 justify-center items-center px-6`}>
        <View style={tw`${config.bgColor} p-6 rounded-full mb-6`}>
          <Ionicons name={config.icon} size={64} color={config.color.replace("text-", "#")} />
        </View>

        <Text style={tw`text-2xl font-bold ${config.color} mb-4 text-center`}>
          {status ? PAYMENT_STATUS_MESSAGES[status] : "Erreur"}
        </Text>

        {error && <Text style={tw`text-red-500 text-center mb-6 px-4`}>{error}</Text>}

        {status === "FAILED" && retryCount > 0 && (
          <Text style={tw`text-gray-500 text-sm mb-4`}>Tentative {retryCount}/3</Text>
        )}

        <TouchableOpacity style={tw`bg-blue-600 px-8 py-3 rounded-lg mb-4`} onPress={config.action}>
          <Text style={tw`text-white font-semibold text-lg`}>{config.actionText}</Text>
        </TouchableOpacity>

        {status !== "PAID" && (
          <TouchableOpacity style={tw`px-8 py-3`} onPress={navigateHome}>
            <Text style={tw`text-gray-600 text-lg`}>Retour à l&apos;accueil</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return <View style={tw`flex-1 bg-white`}>{renderContent()}</View>;
}

// Enhanced Payment Form Component
export const usePaymentHandler = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentResultData, setPaymentResultData] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const router = useRouter();

  const createPaymentData = useCallback(
    (
      tripId: string,
      reservationId: string,
      price: number,
      seat: string,
      selectedPayment: string,
      passengersList: PassengerData[],
      user: any
    ): PaymentData => {
      const amount = (price * parseInt(seat, 10)).toString();
      const passengers =
        passengersList.length > 0
          ? passengersList
          : [
              {
                name: user?.data?.user
                  ? `${user.data.user.firstName} ${user.data.user.name}`
                  : "Passager",
                phoneNumber: user?.data?.user?.phoneNumber || "77123456",
              },
            ];

      return {
        tripId,
        amount,
        methodePay: selectedPayment.toUpperCase(),
        passengers,
        redirectUrls: {
          successUrl: createDeepLinkUrl("passbi", "payment-success", {
            reservationId,
            transactionCode: "{transactionCode}",
            orderId: "{orderId}",
          }),
          failureUrl: createDeepLinkUrl("passbi", "payment-failure", {
            reservationId,
            error: "{error}",
          }),
          cancelUrl: createDeepLinkUrl("passbi", "payment-cancel", {
            reservationId,
          }),
        },
      };
    },
    []
  );

  const handlePaymentSubmit = useCallback(
    async (
      tripId: string,
      reservationId: string,
      price: number,
      seat: string,
      selectedPayment: string,
      passengersList: PassengerData[],
      user: any,
      additionalParams: Record<string, any> = {}
    ) => {
      try {
        setIsLoading(true);

        if (!tripId || !reservationId) {
          Alert.alert("Erreur", "Données manquantes pour le paiement");
          return;
        }

        const paymentData = createPaymentData(
          tripId,
          reservationId,
          price,
          seat,
          selectedPayment,
          passengersList,
          user
        );

        const token = await getToken();

        // Replace with your actual payment API call
        const paymentResult = await fetch("/api/payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            reservationId,
            ...paymentData,
          }),
        });

        if (!paymentResult.ok) {
          throw new Error(`Payment failed: ${paymentResult.statusText}`);
        }

        const result = await paymentResult.json();

        setPaymentResultData({
          ...result,
          paymentData,
          selectedPayment,
        });

        if (selectedPayment === PAYMENT_METHODS.OM) {
          setShowPaymentModal(true);
        } else if (selectedPayment === PAYMENT_METHODS.WAVE) {
          router.push({
            pathname: "../../pages/home/mestickets",
            params: {
              transactionCode: result.transactionCode || "",
              reservationId: result.reservationId || reservationId,
              ...additionalParams,
              passengers: JSON.stringify(paymentData.passengers),
              qrCode: result.qrCode || "",
              paymentMethod: "WAVE",
              paymentStatus: "PENDING",
            },
          });
        }
      } catch (error) {
        console.error("Erreur paiement:", error);
        Alert.alert(
          "Erreur de paiement",
          error instanceof Error ? error.message : "Problème lors du paiement"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [createPaymentData, router]
  );

  const handlePaymentRedirect = useCallback(async (paymentLink: string, appName: string) => {
    try {
      const canOpen = await Linking.canOpenURL(paymentLink);

      if (canOpen) {
        await Linking.openURL(paymentLink);
      } else {
        Alert.alert("Application manquante", `Installez ${appName} pour continuer le paiement`, [
          {
            text: "Annuler",
            style: "cancel",
          },
          {
            text: "Continuer sans app",
            onPress: () => {
              // Convert deep link to web URL
              const webUrl = paymentLink.replace("orangemoney://", "https://payment.orange.sn/");
              Linking.openURL(webUrl).catch(() => {
                Alert.alert("Erreur", "Impossible d'ouvrir le lien de paiement");
              });
            },
          },
        ]);
      }
    } catch (error) {
      console.error("Erreur lien:", error);
      Alert.alert("Erreur", `Problème avec ${appName}`);
    }
  }, []);

  return {
    isLoading,
    paymentResultData,
    showPaymentModal,
    setShowPaymentModal,
    handlePaymentSubmit,
    handlePaymentRedirect,
  };
};
