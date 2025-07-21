// views/components/ActionButtons.tsx
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from '../../../../tailwind';

interface ActionButtonsProps {
  operatorType: string;
  shareLoading: boolean;
  downloadLoading: boolean;
  onShare: () => void;
  onDownload: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  operatorType,
  shareLoading,
  downloadLoading,
  onShare,
  onDownload
}) => {
  return (
    <View style={tw`w-full max-w-[340px] mt-6 mx-auto px-2`}>
      <View style={tw`flex-row justify-between gap-4`}>
        <TouchableOpacity
          style={tw`flex-1 flex-row items-center justify-center ${operatorType === "TER" ? "bg-teal-600" : "bg-teal-600"} py-3 px-4 rounded-xl`}
          onPress={onShare}
          disabled={shareLoading}
        >
          {shareLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="share-outline" size={20} color="white" style={tw`mr-2`} />
              <Text style={tw`text-white font-semibold`}>Partager</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={tw`flex-1 flex-row items-center justify-center border border-teal-600 py-3 px-4 rounded-xl`}
          onPress={onDownload}
          disabled={downloadLoading}
        >
          {downloadLoading ? (
            <ActivityIndicator size="small" color="#0D9488" />
          ) : (
            <>
              <Ionicons name="download-outline" size={20} color="#0D9488" style={tw`mr-2`} />
              <Text style={tw`text-teal-600 font-semibold`}>Télécharger</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};