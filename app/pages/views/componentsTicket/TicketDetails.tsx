import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from '../../../../tailwind';
import { TicketData } from '../../models/typesTicket';

interface TicketDetailsProps {
  ticketData: TicketData;
  operatorType: string;
  departRoute: string;
  destinationRoute: string;
  ZoneType: string;
  classeROute: string;
  ticketCountRoute: string;
  price: string;
}

export const TicketDetails: React.FC<TicketDetailsProps> = ({
  ticketData,
  operatorType,
  departRoute,
  destinationRoute,
  ZoneType,
  classeROute,
  ticketCountRoute,
  price
}) => {
  return (
    <View style={tw`px-6 py-2`}>
      {/* Informations spécifiques au type d'opérateur */}
      {operatorType === "TER" ? (
        <View style={tw`flex-row justify-between mb-4`}>
          <View style={tw`mb-1 items-center`}>
            <Text style={tw`text-lg text-center font-bold text-gray-900`}>
              {ticketData.zone || ZoneType}
            </Text>
          </View>
          <View style={tw`flex-row items-center`}>
            <Text style={tw`text-base font-bold text-gray-800 px-2 bg-teal-100 text-right`}>
              {classeROute || "1er Classe"}
            </Text>
          </View>
        </View>
      ) : (
        <View style={tw`mb-4 text-center`}>
          <Text style={tw`text-lg font-bold text-center text-gray-900`}>
            Zone: {ticketData.zone || ZoneType}
          </Text>
        </View>
      )}

      {/* Section De/À */}
      <View style={tw`flex-row justify-between mb-2`}>
        <View style={tw`flex-1 w-full`}>
          <Text style={tw`text-xs text-gray-500`}>De</Text>
          <Text style={tw`text-sm font-semibold w-100 text-gray-800`}>{departRoute}</Text>
        </View>

        <View style={tw`mx-6`}>
          <Ionicons name="arrow-forward" size={16} color="#374151" />
        </View>

        <View style={tw`flex-1 w-full`}>
          <Text style={tw`text-xs text-gray-500`}>Destination</Text>
          <Text style={tw`text-sm font-semibold w-100 text-gray-800`}>{destinationRoute}</Text>
        </View>
      </View>

      {/* Date et Heure */}
      <View style={tw`bg-gray-50 rounded-xl p-4 mb-2`}>
        <View style={tw`flex-row justify-between mb-2`}>
          <View style={tw`flex-row items-center p-2`}>
            <Ionicons name="calendar-outline" size={16} color={operatorType === "TER" ? "#0D9488" : "#0D9488"} />
            <Text style={tw`text-base text-gray-800 ml-3`}>
              {ticketData.departureDate} à {ticketData.departureTime}
            </Text>

            {operatorType === "TER" && (
              <Text style={tw`text-sm text-teal-500 px-4 rounded-sm font-semibold ${ticketData.classeType === "Classe 1" ? "text-teal-600" : "text-teal-600"} mt-1`}>
                {ticketCountRoute} place(s)
              </Text>
            )}
          </View>
        </View>

        <View style={tw`flex-row items-center`}>
          <Ionicons name="time-outline" size={20} color={operatorType === "TER" ? "#0D9488" : "#0D9488"} />
          <Text style={tw`text-base text-gray-800 ml-3`}>
            Valide jusqu&apos;à {ticketData.expiresAt}
          </Text>
        </View>
      </View>

      <View style={tw`bg-gray-50 rounded-xl p-1 mb-1`}>
      </View>
      <View style={tw`flex-row justify-between items-center`}>
        <Text style={tw`text-sm text-gray-500`}>Prix du ticket</Text>
        <Text style={tw`text-xl font-bold text-teal-700`}>{price}FCFA</Text>
      </View>
    </View>
  );
};
