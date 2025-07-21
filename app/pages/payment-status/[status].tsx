import HeaderComponent from "@/constants/HeaderComponent";
import tw from "@/tailwind";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import PaymentStatusInit from "./partials/init";
import PaymentStatusSuccess from "./partials/success";
import PaymentStatusError from "./partials/error";
import { useSecurePaymentNavigation } from "@/hooks/useSecurePaymentNavigation";

const PaymentStatus = () => {
  const { status } = useLocalSearchParams<{ status: string }>();

  // Hook de navigation sécurisée pour empêcher le retour pendant le traitement du statut
  const { disableProtection, redirectToHome } = useSecurePaymentNavigation({
    isPaymentInProgress: status === "init",
    customMessage: "Le traitement du paiement est en cours. Vous ne pouvez pas revenir en arrière. Voulez-vous aller à l'accueil ?"
  });

  return (
    <HeaderComponent bg={status === "error" ? "bg-red-300" : "bg-white"}>
      <View style={tw`mt-10 gap-5 flex items-center justify-center flex-col`}>
        {status === "init" ? (
          <PaymentStatusInit />
        ) : status === "success" ? (
          <PaymentStatusSuccess />
        ) : status === "error" ? (
          <PaymentStatusError />
        ) : (
          <ActivityIndicator size={50} color="green" />
        )}
      </View>
    </HeaderComponent>
  );
};

export default PaymentStatus;
