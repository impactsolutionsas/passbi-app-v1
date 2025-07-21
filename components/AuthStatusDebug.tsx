import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuthState } from '../hooks/useAuthState';
import { useAuth } from '../Provider/AppProvider';
import tw from '../tailwind';

export const AuthStatusDebug: React.FC = () => {
  const { isAuthenticated, hasLoggedOut, hasBeenAuthenticated } = useAuthState();
  const { logout } = useAuth();

  return (
    <View style={tw`p-4 bg-yellow-100 rounded-lg m-2 border border-yellow-400`}>
      <Text style={tw`font-bold text-lg mb-2 text-yellow-800`}>Debug Auth Status</Text>
      <Text style={tw`text-sm text-yellow-700`}>Authentifié: {isAuthenticated ? '✅ Oui' : '❌ Non'}</Text>
      <Text style={tw`text-sm text-yellow-700`}>Déconnecté: {hasLoggedOut ? '✅ Oui' : '❌ Non'}</Text>
      <Text style={tw`text-sm text-yellow-700`}>A été authentifié: {hasBeenAuthenticated ? '✅ Oui' : '❌ Non'}</Text>
      
      <TouchableOpacity 
        style={tw`bg-red-500 px-4 py-2 rounded mt-2`}
        onPress={() => logout()}
      >
        <Text style={tw`text-white text-center font-bold`}>Test Déconnexion</Text>
      </TouchableOpacity>
      
      <Text style={tw`text-xs text-yellow-600 mt-2`}>
        Bouton retour: {hasLoggedOut || !isAuthenticated ? '🚪 Ferme l\'app' : '✅ Normal'}
      </Text>
    </View>
  );
}; 