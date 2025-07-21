import tw from "@/tailwind";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

const PaymentStatusError = () => {
  const route = useRouter();

  return (
    <>
      <Ionicons name="close-circle-outline" size={60} color="red" />
      <Text style={tw`text-lg text-center font-bold mb-2 text-center`}>
        Échec de paiement, veuillez vérifier le solde de votre compte.
      </Text>
      <TouchableOpacity
        style={tw`bg-teal-800 py-3 rounded-md items-center w-full`}
        onPress={() => route.replace("/pages/home/accueil")}
      >
        <Text style={tw`text-white text-xl font-bold`}>Acheter un nouveau ticket</Text>
      </TouchableOpacity>
    </>
  );
};

export default PaymentStatusError;
