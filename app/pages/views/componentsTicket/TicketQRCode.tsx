import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import tw from '../../../../tailwind';

interface TicketQRCodeProps {
  qrCodeData: string;
  qrCodeRef: React.RefObject<any>;
}

export const TicketQRCode: React.FC<TicketQRCodeProps> = ({ qrCodeData, qrCodeRef }) => {
  return (
    <View style={tw`px-6 py-3 items-center border-b border-gray-50`}>
      {qrCodeData ? (
        <QRCode
          value={qrCodeData}
          size={150}
          color="#000000"
          backgroundColor="#ffffff"
          logoBackgroundColor="#ffffff"
          getRef={(c) => {
            if (qrCodeRef && typeof qrCodeRef === 'object') {
              qrCodeRef.current = c;
            }
          }}
        />
      ) : (
        <ActivityIndicator size="large" color="#374151" />
      )}
    </View>
  );
};