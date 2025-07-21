import tw from "@/tailwind";
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";

const PaymentStatusInit = () => {
  return (
    <>
      <Text style={tw`text-lg text-center font-bold mb-2 text-center`}>
        En attente de paiement du ticket.
      </Text>
      <ActivityIndicator size={50} color="green" />
    </>
  );
};

export default PaymentStatusInit;
