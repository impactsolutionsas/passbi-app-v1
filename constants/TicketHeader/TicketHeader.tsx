import React from "react";
import { View, Text, TouchableOpacity, Image, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import tw from "../../tailwind";

interface TicketHeaderProps {
  operator: {
    name: string;
    logoUrl?: string;
    slogan?: string;
    transportType?: string;
  };
  children?: React.ReactNode;
}

const TicketHeader: React.FC<TicketHeaderProps> = ({ operator, children }) => {
  const router = useRouter();
  console.log(operator.name);
  
  return (
    <SafeAreaView style={tw`flex-1 bg-[#094741]`}>
      {/* En-tête avec fond dégradé */}
      <View style={tw`bg-gradient-to-b from-teal-800 to-teal-600 px-4 pt-15 pb-6`}>
        {/* Barre supérieure avec bouton de fermeture */}
        <View style={tw`flex-row items-center justify-between`}>
          {/* Informations de l'opérateur */}
          <View style={tw`flex-row items-center`}>
            <View style={tw`w-12 h-12 rounded-xl bg-white/10 items-center justify-center mr-3`}>
              <Image
                source={operator.logoUrl ? { uri: operator.logoUrl } : undefined}
                style={tw`w-10 h-10 rounded-lg`}
                resizeMode="contain"
              />
            </View>

            <View>
              <Text style={tw`text-white text-lg font-semibold`}>{operator.name}</Text>

              <View style={tw`flex-row items-center`}>
                <Ionicons
                  name={
                    operator.transportType === "BUS"
                      ? "bus"
                      : operator.transportType === "Avion"
                      ? "airplane"
                      : operator.transportType === "Bateau"
                      ? "boat"
                      : "train"
                  }
                  size={16}
                  color="white"
                  style={tw`mr-1`}
                />
                <Text style={tw`text-white/80 text-sm`}>
                  {operator.transportType || "Transport"}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/pages/home/accueil")}
            style={tw`w-10 h-10 rounded-full bg-white/10 items-center justify-center`}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Contenu principal */}
      <View style={tw`flex-1 bg-gray-50`}>{children}</View>
    </SafeAreaView>
  );
};

export default TicketHeader;
