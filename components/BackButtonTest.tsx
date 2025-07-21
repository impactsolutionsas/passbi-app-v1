import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuthState } from '../hooks/useAuthState';
import tw from '../tailwind';

export const BackButtonTest: React.FC = () => {
  const { isAuthenticated, hasLoggedOut, hasBeenAuthenticated } = useAuthState();

  return (
    <View style={tw`p-4 bg-gray-100 rounded-lg m-2`}>
      <Text style={tw`font-bold text-lg mb-2`}>État du Bouton Retour</Text>
      <Text style={tw`text-sm`}>Authentifié: {isAuthenticated ? 'Oui' : 'Non'}</Text>
      <Text style={tw`text-sm`}>Déconnecté: {hasLoggedOut ? 'Oui' : 'Non'}</Text>
      <Text style={tw`text-sm`}>A été authentifié: {hasBeenAuthenticated ? 'Oui' : 'Non'}</Text>
      <Text style={tw`text-sm mt-2`}>
        Bouton retour: {isAuthenticated ? '✅ Fonctionne' : hasLoggedOut ? '❌ Bloqué' : '✅ Fonctionne'}
      </Text>
    </View>
  );
}; 