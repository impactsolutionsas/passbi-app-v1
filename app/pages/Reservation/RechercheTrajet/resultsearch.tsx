// ResultatsRechercheScreen.tsx - Version optimisée sans double requête

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator,BackHandler } from 'react-native';
import HeaderComponent from '../../../../constants/HearpageReserve/HeaderComponent';
import tw from '../../../../tailwind';
import { useRouter } from "expo-router";
import { useRoute,useFocusEffect } from '@react-navigation/native';
import { searchTickets } from '../../../../services/api/api';

// Importation des types, des fonctions utilitaires et des composants
import { ApiResponse, RouteParams, Trip, TransportType } from './types';
import { getFilteredTrips } from './utils';
import { Filtres, EmptyStateMessage, TripCard, LoadingState } from './components';

// Interface étendue pour les paramètres de route
interface ExtendedRouteParams extends RouteParams {
  searchResults?: string; // JSON stringifié des résultats de recherche
}

export default function ResultatsRechercheScreen() {
  const [filtreActif, setFiltreActif] = useState<TransportType>('Bus');
  const route = useRoute();
  const router = useRouter();
  const { 
    departure, 
    destination, 
    date, 
    seat, 
    totalAvailableSeats, 
    departureTime, 
    price, 
    operator,
    searchResults // NOUVEAU : résultats passés depuis HomeScreen
  } = route.params as ExtendedRouteParams;
  
  const [loading, setLoading] = useState(false); // MODIFICATION : false par défaut
  const [allTrips, setAllTrips] = useState<ApiResponse | null>(null);
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([]);
  const [error, setError] = useState<string | null>(null);
  
   useFocusEffect(
        React.useCallback(() => {
          const onBackPress = () => {
            router.back();
            return true;
          };
          const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
          return () => backHandler.remove();
        }, [router])
      );
  // MODIFICATION : Charger les données depuis les paramètres ou faire une requête de fallback
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Si on a des résultats dans les paramètres, les utiliser directement
        if (searchResults) {
          console.log("Utilisation des données passées depuis HomeScreen");
          const parsedResults = JSON.parse(searchResults);
          
          if (parsedResults && parsedResults.data) {
            setAllTrips(parsedResults.data);
            setFilteredTrips(getFilteredTrips(parsedResults.data, filtreActif));
          } else if (parsedResults && Array.isArray(parsedResults)) {
            // Si c'est directement un tableau
            const dataStructure = { data: parsedResults };
            setAllTrips(dataStructure as any);
            setFilteredTrips(getFilteredTrips(dataStructure as any, filtreActif));
          } else {
            setError("Format de données inattendu");
          }
        } else {
          // FALLBACK : Si pas de données dans les paramètres, faire la requête
          console.log("Aucune donnée passée, requête de fallback...");
          setLoading(true);
          const result = await searchTickets(departure, destination, date, parseInt(seat));
          
          if (result && result.data) {
            setAllTrips(result.data);
            setFilteredTrips(getFilteredTrips(result.data, filtreActif));
          } else {
            setError("Aucun trajet trouvé pour cette recherche");
          }
        }
      } catch (err) {
        console.error("Erreur lors de l'initialisation des données:", err);
        setError("Erreur lors du chargement des trajets");
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [departure, destination, date, seat, searchResults]);

  // Mettre à jour les trajets filtrés quand le filtre change
  useEffect(() => {
    if (allTrips) {
      console.log("Mise à jour du filtre:", filtreActif);
      setFilteredTrips(getFilteredTrips(allTrips, filtreActif));
    }
  }, [filtreActif, allTrips]);

  const handleSubmit = async (tripId: string) => {
    const selectedTrip = filteredTrips.find(trip => trip.tripId === tripId);
    
    if (!selectedTrip || !selectedTrip.operator) return;
  
    router.push({
      pathname: "/pages/Reservation/detailReserve",
      params: {
        tripId: tripId,
        departure: departure,
        destination: destination,
        date: date,
        seat: seat,
        totalAvailableSeats: selectedTrip.totalAvailableSeats.toString(),
        departureTime: selectedTrip.departureTime,
        price: selectedTrip.price,
        operatorName: selectedTrip.operator.name,
        operatorLogoUrl: selectedTrip.operator.logoUrl || "",
        operatorSlogan: selectedTrip.operator.slogan || ""
      }
    });
  };

  // Fonction pour relancer une recherche (utile si première tentative a échoué)
  const handleRetrySearch = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Nouvelle tentative de recherche...");
      
      const result = await searchTickets(departure, destination, date, parseInt(seat));
      
      if (result && result.data) {
        setAllTrips(result.data);
        setFilteredTrips(getFilteredTrips(result.data, filtreActif));
      } else {
        setError("Aucun trajet trouvé pour cette recherche");
      }
    } catch (err) {
      console.error("Erreur lors de la nouvelle recherche:", err);
      setError("Erreur lors de la recherche des trajets");
    } finally {
      setLoading(false);
    }
  };

  return (
    <HeaderComponent 
      operator={{ name: "DefaultOperator" }} 
      requestedSeats={seat}
      showHeader={true}
    >
      <View style={tw`border bg-gray-100 rounded-lg h-full p-2 shadow-lg`}>
        {/* Filtres de type de transport */}
        <Filtres 
          filtreActif={filtreActif} 
          setFiltreActif={setFiltreActif}
          departure={departure}
          destination={destination}
          date={date}
          seat={seat}
        />

        {/* Contenu principal basé sur l'état */}
        {loading ? (
          <LoadingState />
        ) : error ? (
          <View style={tw`flex-1 justify-center items-center p-4`}>
            <EmptyStateMessage 
              filtreActif={filtreActif} 
              onBack={() => router.back()} 
            />
            {/* Bouton pour réessayer */}
           
          </View>
        ) : (
          <ScrollView style={tw`flex-1`}>
            {filteredTrips.length === 0 ? (
              <EmptyStateMessage 
                filtreActif={filtreActif} 
                onBack={() => router.back()} 
              />
            ) : (
              filteredTrips.map((trip, index) => (
                <TripCard
                  key={index}
                  trip={trip}
                  filtreActif={filtreActif}
                  onSelect={handleSubmit}
                />
              ))
            )}
          </ScrollView>
        )}

        {/* Bouton pour retourner à la recherche */}
        {!loading && (
          <View style={tw`p-4 bg-white border-t border-gray-200`}>
            <TouchableOpacity 
              style={tw`bg-gray-200 py-3 rounded-md items-center`}
              onPress={() => router.back()}
            >
              <Text style={tw`text-sm font-bold text-gray-700`}>Modifier la recherche</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </HeaderComponent>
  );
}