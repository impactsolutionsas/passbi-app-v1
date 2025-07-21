// views/screens/TicketView.tsx
import React, { useRef, useState, useEffect } from 'react';
import { View, ScrollView, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import tw from '../../../tailwind';
import { TicketQRCode } from './componentsTicket/TicketQRCode';
import { TicketDetails } from './componentsTicket/TicketDetails';
import { ActionButtons } from './componentsTicket/ActionButtons';
import { TicketController } from '../controllers/TicketController';
import { RouteParams, TicketData } from '../models/typesTicket';

type TicketViewRouteProp = RouteProp<{ TicketView: RouteParams }, 'TicketView'>;

export const TicketView: React.FC = () => {
  const route = useRoute<TicketViewRouteProp>();
  const navigation = useNavigation();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [operatorType, setOperatorType] = useState<string>('');
  const [shareLoading, setShareLoading] = useState<boolean>(false);
  const [downloadLoading, setDownloadLoading] = useState<boolean>(false);
  
  const ticketController = new TicketController();
  const ticketRef = useRef<View>(null);
  const qrCodeRef = useRef<any>(null);

  useEffect(() => {
    const initTicket = async () => {
      try {
        const result = await ticketController.initializeTicket(route.params);
        setTicketData(result.ticketData);
        setQrCodeData(result.qrCodeData);
        setOperatorType(result.operatorType);
        setError(result.error);
        setLoading(false);
      } catch (err: any) {
        setError(err?.message || 'Une erreur est survenue lors du chargement du ticket');
        setLoading(false);
      }
    };

    initTicket();
  }, []);

  const handleShare = async () => {
    try {
      setShareLoading(true);
      await ticketController.shareTicket(ticketRef);
    } catch (error) {
      console.error('Erreur lors du partage:', error);
    } finally {
      setShareLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setDownloadLoading(true);
      await ticketController.downloadTicket(ticketRef);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
    } finally {
      setDownloadLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white justify-center items-center`}>
        <Text style={tw`text-gray-600 mb-4`}>Chargement de votre ticket...</Text>
      </SafeAreaView>
    );
  }

  if (error || !ticketData) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white justify-center items-center`}>
        <Text style={tw`text-red-500 mb-4`}>{error || 'Impossible de charger le ticket'}</Text>
      </SafeAreaView>
    );
  }

  const colors = ticketController.getOperatorColors();

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <ScrollView>
        <View ref={ticketRef} style={tw`bg-white rounded-xl m-4 shadow-md overflow-hidden`}>
          {/* Logo et en-tête */}
          <View style={[tw`p-4 items-center border-b border-gray-100`, { backgroundColor: colors.background }]}>
            <Text style={tw`text-xl font-bold text-center text-gray-900`}>
              {ticketData.operatorName || 'Transport Ticket'}
            </Text>
            <Text style={tw`text-sm text-gray-600 text-center`}>
              Ticket de {operatorType === "TER" ? "Train" : operatorType === "BRT" ? "Bus Rapide" : "Bus"}
            </Text>
          </View>

          {/* QR Code */}
          <TicketQRCode qrCodeData={qrCodeData} qrCodeRef={qrCodeRef} />

          {/* Détails du ticket */}
          <TicketDetails 
            ticketData={ticketData}
            operatorType={operatorType}
            departRoute={ticketData.departure}
            destinationRoute={ticketData.destination}
            ZoneType={ticketData.zone || "Zone Standard"}
            classeROute={ticketData.classeType || "Standard"}
            ticketCountRoute="1"
            price={ticketData.price.replace(" FCFA", "")}
          />

          {/* Informations additionnelles */}
          <View style={tw`px-6 py-3 border-t border-gray-100`}>
            <Text style={tw`text-xs text-gray-500 text-center`}>
              Ticket ID: {ticketData.ticketCode}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Boutons d'action */}
      <ActionButtons 
        operatorType={operatorType}
        shareLoading={shareLoading}
        downloadLoading={downloadLoading}
        onShare={handleShare}
        onDownload={handleDownload}
      />
    </SafeAreaView>
  );
};