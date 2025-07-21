import tw from "@/tailwind";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { FC } from "react";
import { Text, TouchableOpacity, View } from "react-native";

const PaymentStatusSuccess = () => {
  const route = useRouter();

  return (
    <>
      <Feather name="check-circle" size={55} color="green" />
      <Text style={tw`text-lg text-center font-bold mb-1 text-center`}>
        Paiement effectué avec succès.
      </Text>

      <View style={tw`-mt-5 flex gap-3 items-center justify-center flex-col w-full`}>
        <TouchableOpacity
          style={tw`bg-teal-800 py-3 rounded-md items-center w-full mt-7`}
          onPress={() => route.replace("/pages/home/mestickets")}
        >
          <Text style={tw`text-white text-xl font-bold`}>Consulter mon ticket</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

export default PaymentStatusSuccess;
