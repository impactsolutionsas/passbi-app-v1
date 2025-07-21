// components/HowItWorks.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from '../../../../tailwind';

type InfoItemProps = {
  title: string;
  description: string;
};

const InfoItem = ({ title, description }: InfoItemProps) => (
  <View style={tw`flex-row items-start gap-4 mt-6 bg-white rounded-2xl p-5 shadow-lg border border-gray-50`}>
    <Ionicons 
      name={title === "Recherche de ticket" ? "search-circle" : 
            title === "Comparaison des prix" ? "pricetag" :
            title === "Acheter un ticket" ? "cart" : "checkmark-circle"}
      size={28}
      color="#094741" 
      style={tw`mt-0.5`}
    />
    <View style={tw`flex-1`}>
      <Text style={tw`text-gray-900 font-bold text-lg mb-2 tracking-wide`}>{title}</Text>
      <Text style={tw`text-gray-600 text-base leading-6`}>{description}</Text>
    </View>
  </View>
);

const HowItWorks = () => {
  return (
    <>
      <Text style={tw`text-lg font-semibold text-gray-800 mb-2 mt-5 tracking-wide`}>Comment ça marche ?</Text>
      
      <InfoItem 
        title="Recherche de ticket" 
        description="Entrez votre lieu de départ et d'arrivée, sélectionnez la date et le nombre de passagers pour trouver les tickets disponibles" 
      />

      <InfoItem 
        title="Comparaison des prix" 
        description="Comparez facilement les prix et les horaires des différents opérateurs de transport pour trouver la meilleure option pour votre voyage"
      />
      
      <InfoItem 
        title="Acheter un ticket" 
        description="Sélectionnez le ticket qui correspond à vos besoins et réservez en ligne"
      />
    </>
  );
};

export default HowItWorks;