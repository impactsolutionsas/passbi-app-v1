// components.tsx - Composants réutilisables pour l'écran de résultats

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import tw from 'app/tailwind';
import { searchTickets } from '../../../../services/api/api';
import { Trip, TransportType } from './types';
import { formatDate, formatTime, formatPrice } from './utils';

interface FiltresProps {
  filtreActif: TransportType;
  setFiltreActif: (filtre: TransportType) => void;
  departure: string;
  destination: string;
  date: string;
  seat: string;
}

export const Filtres: React.FC<FiltresProps> = ({ 
  filtreActif, 
  setFiltreActif,
  departure,
  destination,
  date,
  seat
}) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        setLoading(true);
        const result = await searchTickets(departure, destination, date, parseInt(seat));
        if (result && result.data) {
          setTrips(result.data);
          
          // Trouver le premier type de transport avec des résultats
          const transportTypes = ['Bus', 'Train', 'Avion', 'Bateau'];
          for (const type of transportTypes) {
            // Vérifier que result.data est un tableau avant d'appeler .some()
            if (Array.isArray(result.data)) {
              const hasResults = result.data.some((trip: Trip) => trip.transportType === type);
              if (hasResults) {
                setFiltreActif(type as TransportType);
                break;
              }
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, [departure, destination, date, seat]);

  const filtres = ['Bus', 'Train', 'Avion', 'Bateau'];

  return (
    <View style={tw`flex-row justify-between px-4 py-4 bg-white border-b border-gray-200`}>
      {filtres.map((filtre, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => setFiltreActif(filtre as TransportType)} 
          style={tw`items-center`}
        >
          <View style={tw`pb-2 items-center ${filtreActif === filtre ? 'border-b-2 border-[#094741]' : ''}`}>
            <Ionicons
              name={
                filtre === 'Bus' ? 'bus' :
                filtre === 'Avion' ? 'airplane' :
                filtre === 'Bateau' ? 'boat' : 'train'
              }
              size={25}
              color={filtreActif === filtre ? '#094741' : '#AEAEAF'}
            />
            <Text style={tw`text-xs mt-1 text-center ${filtreActif === filtre ? 'text-[#094741] font-bold' : 'text-gray-500'}`}>
              {filtre}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Composant pour le message d'erreur ou d'absence de résultats
export const EmptyStateMessage = ({ filtreActif, onBack }: { filtreActif: TransportType, onBack: () => void }) => {
    return (
      <View style={tw`flex-1 justify-center items-center p-8`}>
        <View style={tw`bg-gray-50 rounded-2xl p-8 shadow-sm items-center max-w-sm w-full`}>
          <Ionicons 
            name={
              filtreActif === 'Bus' ? 'bus-outline' :
              filtreActif === 'Avion' ? 'airplane-outline' : 
              filtreActif === 'Bateau' ? 'boat-outline' : 'train-outline'
            }
            size={80}
            color="#094741"
            style={tw`mb-6`}
          />
          
          <Text style={tw`text-xl font-semibold text-gray-900 text-center mb-3`}>
            Aucun {filtreActif === 'Avion' ? 'vol' : filtreActif.toLowerCase()} disponible
          </Text>

          <Text style={tw`text-gray-500 text-center mb-8 leading-5`}>
            Nous n&apos;avons trouvé aucun trajet correspondant à vos critères. Essayez de modifier votre recherche.
          </Text>

          <TouchableOpacity 
            style={tw`bg-[#094741] w-full py-4 px-6 rounded-xl shadow-sm active:opacity-90`}
            onPress={onBack}>
            <Text style={tw`text-white font-medium text-center`}>
              Nouvelle recherche
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

// Composant pour afficher un trajet
export const TripCard = ({ 
  trip, 
  filtreActif, 
  onSelect 
}: { 
  trip: Trip, 
  filtreActif: TransportType,
  onSelect: (tripId: string) => void 
}) => {
  console.log(trip)
  return (
    <TouchableOpacity onPress={() => onSelect(trip.tripId)}>
      <View style={tw`my-2 p-3 bg-white rounded-xl shadow border border-gray-50`}>
        {/* En-tête avec logo et infos opérateur */}
        <View style={tw`flex-row items-center justify-between mb-3`}>
          <View style={tw`flex-row items-center`}>
            <Image
              source={{ uri: trip.operator?.logoUrl }}
              style={tw`w-8 h-8 rounded-lg mr-2`}
              resizeMode="contain"
            />
            <View>
              <Text style={tw`font-bold text-sm text-gray-900`}>{trip.operator?.name || "Transport"}</Text>
              <Text style={tw`text-gray-500 text-xs`}>{trip.operator?.slogan || "Service de qualité"}</Text>
            </View>
          </View>
          <View style={tw`items-end`}>
            <Text style={tw`text-base font-bold text-teal-800`}>{formatPrice(trip.price)}</Text>
            <Text style={tw`text-xs text-gray-500`}>par personne</Text>
          </View>
        </View>

        {/* Trajet et horaires */}
        <View style={tw`bg-gray-50 p-3 rounded-lg mb-3`}>
          <View style={tw`flex-row items-center mb-2`}>
            <View style={tw`w-2 h-2 rounded-full bg-teal-600 mr-2`} />
            <View style={tw`flex-1`}>
              <Text style={tw`text-sm text-gray-800`}>{trip.departure}</Text>
              {trip.stations && trip.stations.length > 0 && (
                <Text style={tw`text-xs text-gray-500`}>{trip.stations[0].name}</Text>
              )}
            </View>
            <Text style={tw`text-sm font-medium text-teal-700`}>{formatTime(trip.departureTime)}</Text>
          </View>
          
          <View style={tw`ml-1 h-8 border-l-2 border-dashed border-gray-800`} />
          
          <View style={tw`flex-row items-center`}>
            <View style={tw`w-2 h-2 rounded-full bg-gray-400 mr-2`} />
            <View style={tw`flex-1`}>
              <Text style={tw`text-sm text-gray-800`}>{trip.destination}</Text>
              <Text style={tw`text-xs text-gray-500`}>{trip.destinationStation || 'Gare de ' + trip.destination}</Text>
            </View>
          </View>
        </View>

        {/* Infos complémentaires */}
        <View style={tw`flex-row items-center justify-between`}>
          <View style={tw`flex-row items-center`}>
            <MaterialIcons 
              name={
                filtreActif === 'Bus' ? 'directions-bus' :
                filtreActif === 'Avion' ? 'flight' :
                filtreActif === 'Bateau' ? 'directions-boat' : 'train'
              } 
              size={16} 
              color="#094741" 
              style={tw`mr-1`}
            />
            <Text style={tw`text-xs text-gray-600`}>
              {trip.totalAvailableSeats} places disponibles
            </Text>
          </View>
          
        {/*   <View style={tw`flex-row items-center`}>
            <Ionicons name="calendar-outline" size={14} color="#4B5563" style={tw`mr-1`} />
          </View> */}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Composant pour l'état de chargement
export const LoadingState = () => (
  <View style={tw`flex-1 justify-center items-center`}>
    <ActivityIndicator size="large" color="#094741" />
    <Text style={tw`mt-4 text-gray-600`}>Recherche des trajets en cours...</Text>
  </View>
);