import React from "react";
import {
  View,
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import tw from "../tailwind"; // Assurez-vous que le chemin est correct

interface HeaderComponentProps {
  bg?: string;
  onNotificationPress?: () => void;
  customStyle?: object;
  customLeftComponent?: React.ReactNode;
  onEndSession?: () => void;
  children?: React.ReactNode; // Pour pouvoir insérer du contenu personnalisé
}

const HeaderComponent: React.FC<HeaderComponentProps> = ({
  bg = "bg-white",
  onNotificationPress,
  customStyle,
  customLeftComponent,
  onEndSession,
  children,
}) => {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <KeyboardAvoidingView
      style={tw`flex-1`}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView contentContainerStyle={tw`flex-grow`} bounces={false}>
        <SafeAreaView style={tw`flex-1 ${bg}`}>
          {/* Partie supérieure verte avec l'image de fond */}
          <View style={[tw`h-80 bg-teal-800 rounded-b-3xl`, customStyle]}>
            <Image
              source={require("../assets/images/logoheader.png")}
              style={tw`w-full h-full absolute rounded-b-3xl`}
              resizeMode="cover"
            />
          </View>

          {/* Carte blanche contenant le logo et le contenu */}
          <View style={tw`-mt-30 bg-white rounded-lg min-h-[800px] shadow-lg p-10`}>
            {/* Logo PASSBI */}
            <View style={tw`items-center mb-2`}>
              <Image
                source={require("../assets/images/logopassbi.png")}
                style={tw`w-full h-64  p-[50px] z-10  h-20`}
                resizeMode="contain"
              />
            </View>

            {/* Contenu variable (formulaire de connexion ou autre) */}
            {children}
          </View>
        </SafeAreaView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default HeaderComponent;
