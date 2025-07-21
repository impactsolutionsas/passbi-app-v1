// components/InterUrbainSearchForm.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Modal, Alert } from 'react-native';
import { Picker } from "@react-native-picker/picker";
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from "react-i18next";
import tw from '../../../../tailwind';
import { getTrip } from '../../../../services/api/api';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { InterUrbainFormSkeleton } from "./InterUrbainFormSkeleton"
// Types pour les données de l'API
type Lieu = {
  id: number;
  nom: string;
  arrivees: string[];
};

type InterUrbainSearchFormProps = {
  onSearch: (formData: {
    depart: string;
    arrival: string;
    selectedDate: string;
    personCount: number;
  }) => void;
  isLoading: boolean;
};

// Cache global permanent pour éviter les rechargements
let cachedLieux: Lieu[] | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cache pour les données du formulaire
let formDataCache: {
  depart: string;
  arrival: string;
  selectedDate: string;
  personCount: number;
} | null = null;

// Flag pour éviter les rechargements multiples
let isInitialized = false;

const InterUrbainSearchForm = ({ onSearch, isLoading }: InterUrbainSearchFormProps) => {
  const [depart, setDepart] = useState('');
  const [arrival, setArrival] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [personCount, setPersonCount] = useState(1);
  
  // États pour gérer les données de l'API
  const [lieux, setLieux] = useState<Lieu[]>([]);
  const [isLoadingLieux, setIsLoadingLieux] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [results, setResults] = useState<any[]>([]); // Ajout pour le cache des résultats
  
  // Référence pour éviter les appels multiples
  const refreshTimeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  
  const { t } = useTranslation();

  // Fonction pour vérifier si le cache des lieux est valide
  const isCacheValid = useCallback(() => {
    return cachedLieux !== null && 
           cachedLieux.length > 0 && 
           (Date.now() - lastFetchTime) < CACHE_DURATION;
  }, []);

  // Fonction pour charger les données depuis l'API
  const loadLieuxFromAPI = useCallback(async (forceReload = false, showRefreshIndicator = false) => {
    // Vérifier le cache d'abord (sauf si forceReload est true)
    if (!forceReload && isCacheValid()) {
      console.log('Utilisation du cache pour les lieux');
      if (isMountedRef.current) {
        setLieux(cachedLieux!);
      }
      return;
    }

    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setIsLoadingLieux(true);
      }
      setApiError(null);
      
      const response = await getTrip();
      console.log('Réponse API complète:', response);
      
      // Transformer les données de l'API au format attendu
      if (response && response.status === 'success' && response.data && Array.isArray(response.data)) {
        // Transformer les données API vers le format attendu par le composant
        const lieuxTransformes = response.data.map((item, index) => ({
          id: index + 1,
          nom: item.departure,
          arrivees: item.destinations || []
        }));
        
        console.log('Lieux transformés:', lieuxTransformes);
        
        // Mettre à jour le cache permanent et l'état
        cachedLieux = lieuxTransformes;
        lastFetchTime = Date.now();
        
        if (isMountedRef.current) {
          setLieux(lieuxTransformes);
        }
        
        // Si c'était un refresh, afficher un message de succès
        if (showRefreshIndicator) {
          console.log('Données mises à jour avec succès');
        }
      } else {
        throw new Error("Format de données API invalide");
      }
      
    } catch (error) {
      console.error("Erreur lors du chargement des lieux:", error);
      if (isMountedRef.current) {
        setApiError("Impossible de charger les destinations");
      }
      
      // Si on a des données en cache, les utiliser
      if (cachedLieux && isMountedRef.current) {
        console.log('Utilisation du cache en cas d\'erreur');
        setLieux(cachedLieux);
      }
      
    } finally {
      if (isMountedRef.current) {
        if (showRefreshIndicator) {
          setIsRefreshing(false);
        } else {
          setIsLoadingLieux(false);
        }
      }
    }
  }, [isCacheValid]);

  // Fonction pour rafraîchir les données en arrière-plan
  const refreshDataInBackground = useCallback(() => {
    // Éviter les appels multiples
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(async () => {
      console.log('Rafraîchissement en arrière-plan des données...');
      await loadLieuxFromAPI(true, true);
    }, 1000);
  }, [loadLieuxFromAPI]);

  // Initialisation unique au montage du composant
  useEffect(() => {
    console.log('InterUrbainSearchForm - Montage du composant');
    
    // Restaurer les données du formulaire depuis le cache
    if (formDataCache) {
      console.log('Restauration des données du formulaire depuis le cache:', formDataCache);
      setDepart(formDataCache.depart);
      setArrival(formDataCache.arrival);
      setSelectedDate(formDataCache.selectedDate);
      setPersonCount(formDataCache.personCount);
    }

    // Charger les données seulement si pas encore initialisé ou si le cache est invalide
    if (!isInitialized || !isCacheValid()) {
      console.log('Chargement initial des données...');
      loadLieuxFromAPI();
      isInitialized = true;
    } else {
      console.log('Utilisation du cache existant');
      setLieux(cachedLieux!);
    }

    // Nettoyage au démontage
    return () => {
      isMountedRef.current = false;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []); // Dépendance vide pour éviter les rechargements

  // Au montage : restaurer le cache du formulaire et des résultats
  useEffect(() => {
    const loadFormAndResultsCache = async () => {
      // Formulaire
      const cachedForm = await AsyncStorage.getItem('interurbain_form');
      if (cachedForm) {
        const data = JSON.parse(cachedForm);
        setDepart(data.depart);
        setArrival(data.arrival);
        setSelectedDate(data.selectedDate);
        setPersonCount(data.personCount);
      }
      // Résultats
      const cachedResults = await AsyncStorage.getItem('interurbain_results');
      if (cachedResults) {
        const { data, timestamp } = JSON.parse(cachedResults);
        if (Date.now() - timestamp < 5 * 60 * 1000) { // 5 minutes
          setResults(data);
        }
      }
    };
    loadFormAndResultsCache();
  }, []);

  // À chaque modification du formulaire, sauvegarder dans AsyncStorage (debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      AsyncStorage.setItem('interurbain_form', JSON.stringify({
        depart, arrival, selectedDate, personCount
      }));
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [depart, arrival, selectedDate, personCount]);

  // Rafraîchissement automatique périodique (toutes les 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoadingLieux && !isRefreshing && isMountedRef.current) {
        refreshDataInBackground();
      }
    }, CACHE_DURATION);

    return () => {
      clearInterval(interval);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []); // Dépendance vide pour éviter les rechargements

  // Calculer les arrivées disponibles avec useMemo pour optimiser
  const arriveesDisponibles = useMemo(() => {
    const lieuSelectionne = lieux.find((lieu) => lieu.nom === depart);
    return lieuSelectionne ? lieuSelectionne.arrivees : [];
  }, [lieux, depart]);

  // Optimiser la fonction de changement de départ
  const handleDepartChange = useCallback((selectedDepart: string) => {
    setDepart(selectedDepart);
    setArrival(""); // Reset arrival when departure changes
  }, []);

  // Optimiser la fonction de sélection de date
  const onDayPress = useCallback((day: any) => {
    setSelectedDate(day.dateString);
    setShowCalendar(false);
  }, []);

  // Optimiser la fonction de recherche
  const handleSearchClick = useCallback(() => {
    if (!depart || !arrival || !selectedDate) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs obligatoires");
      return;
    }
    
    onSearch({
      depart,
      arrival,
      selectedDate,
      personCount
    });
  }, [depart, arrival, selectedDate, personCount, onSearch]);

  // Fonction pour relancer le chargement en cas d'erreur
  const handleRetryLoad = useCallback(() => {
    loadLieuxFromAPI(true); // Forcer le rechargement
  }, [loadLieuxFromAPI]);

  // Fonction pour rafraîchir manuellement
  const handleManualRefresh = useCallback(() => {
    loadLieuxFromAPI(true, true);
  }, [loadLieuxFromAPI]);

  // Après chaque recherche, sauvegarder les résultats dans AsyncStorage
  const handleSearch = async () => {
    if (!depart || !arrival || !selectedDate) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs obligatoires");
      return;
    }
    
    const results = await getTrip(); // ou searchTickets(...)
    setResults(results);
    await AsyncStorage.setItem('interurbain_results', JSON.stringify({
      data: results,
      timestamp: Date.now()
    }));
    
    if (onSearch) {
      onSearch({ depart, arrival, selectedDate, personCount });
    }
  };

  // Affichage du loader pendant le chargement initial
if (isLoadingLieux && lieux.length === 0) {
  return (
    <View style={tw`flex-1 justify-center items-center p-4 w-full`}>
      <InterUrbainFormSkeleton />
    </View>
  );
}

  return (
    <>
      <View style={tw`flex-col items-center justify-center mb-2`}>
        <Text style={tw`text-lg font-semibold text-gray-800 mb-2 tracking-wide`}>
          Réservez vos billets de transport
        </Text>
        <View style={tw`flex-row items-center justify-center`}>
          <Ionicons name="bus-outline" size={24} color="#094741" style={tw`mx-3`} />
          <Ionicons name="train-outline" size={24} color="#094741" style={tw`mx-3`} />
          <Ionicons name="airplane-outline" size={24} color="#094741" style={tw`mx-3`} />
          <Ionicons name="boat-outline" size={24} color="#094741" style={tw`mx-3`} />
        </View>
      </View>

      {/* Message d'erreur API */}
   {/*    {apiError && (
        <View style={tw`bg-red-100 border border-red-300 rounded-lg p-3 mb-2`}>
          <Text style={tw`text-red-700 text-sm`}>{apiError}</Text>
          <TouchableOpacity onPress={handleRetryLoad} style={tw`mt-1`}>
            <Text style={tw`text-red-600 font-semibold text-sm underline`}>
              Réessayer
            </Text>
          </TouchableOpacity>
        </View>
      )} */}

      {/* Indicateur de rechargement en arrière-plan */}
      {isRefreshing && (
        <View style={tw`bg-blue-100 border border-blue-300 rounded-lg p-2 mb-2`}>
          <View style={tw`flex-row items-center justify-between`}>
            <View style={tw`flex-row items-center`}>
              <ActivityIndicator size="small" color="#094741" />
             {/*  <Text style={tw`ml-2 text-blue-700 text-sm`}>
                Mise à jour des destinations...
              </Text> */}
            </View>
            <TouchableOpacity onPress={handleManualRefresh} style={tw`ml-2`}>
              <Ionicons name="refresh" size={16} color="#094741" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Indicateur de chargement initial */}
      {isLoadingLieux && lieux.length === 0 && (
        <View style={tw`bg-yellow-100 border border-yellow-300 rounded-lg p-2 mb-2`}>
          <View style={tw`flex-row items-center`}>
            <ActivityIndicator size="small" color="#094741" />
            <Text style={tw`ml-2 text-yellow-700 text-sm`}>
              Chargement initial des destinations...
            </Text>
          </View>
        </View>
      )}

      {/* Champ départ */}
      <View style={tw`flex-row items-center rounded-lg bg-[#F1F2F6]`}>
        <Ionicons name="radio-button-on-outline" style={tw`ml-2`} size={20} color="#888" />
        <Picker
          selectedValue={depart}
          onValueChange={handleDepartChange}
          style={[tw`flex-1 ml-2`, { height: 55 }]}
          dropdownIconColor="#f4f4f9"
          enabled={lieux.length > 0}
        >
          <Picker.Item label="Départ" value="" />
          {lieux.map((lieu) => (
            <Picker.Item key={lieu.id} label={lieu.nom} value={lieu.nom} />
          ))}
        </Picker>
      </View>

      {/* Swap Icon */}
      <View style={tw`flex-row justify-end -my-3 z-10`}>
        <View style={tw`bg-teal-800 rounded-full p-1.5 shadow-lg mr-4`}>
          <Ionicons name="swap-vertical" size={20} color="#fff" />
        </View>
      </View>

      {/* Champ destination */}
      <View style={tw`flex-row items-center rounded-lg bg-[#F1F2F6] mb-2`}>
        <Ionicons name="location-outline" style={tw`ml-2`} size={20} color="#888" />
        <Picker
          selectedValue={arrival}
          onValueChange={setArrival}
          style={[tw`flex-1 ml-2`, { height: 55 }]}
          enabled={arriveesDisponibles.length > 0}
        >
          <Picker.Item label="Arrivée" value="" />
          {arriveesDisponibles.map((destination) => (
            <Picker.Item key={destination} label={destination} value={destination} />
          ))}
        </Picker>
      </View>

      {/* Champs date et tickets */}
      <View style={tw`flex-row mb-2`}>
        <View style={tw`flex-row items-center rounded-lg bg-[#F1F2F6] mr-2 flex-1 h-[55px]`}>
          <TouchableOpacity 
            onPress={() => setShowCalendar(true)} 
            style={tw`flex-row items-center flex-1 h-full`}
          >
            <Ionicons name="calendar-outline" style={tw`ml-2`} size={20} color="#888" />
            <Text style={tw`flex-1 ml-2 text-base text-gray-600`}>
              {selectedDate ? selectedDate : "Date"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={tw`flex-row items-center rounded-lg bg-[#F1F2F6] flex-1 h-[55px]`}>
          <Ionicons name="people-outline" style={tw`ml-2`} size={20} color="#888" />
          <Picker
            selectedValue={personCount}
            onValueChange={setPersonCount}
            style={[tw`flex-1 -ml-2`, { height: 55 }]}
            dropdownIconColor="#f4f4f9"
          >
            <Picker.Item label="Places" value="" enabled={false} />
            {[...Array(5).keys()].map((index) => (
              <Picker.Item 
                key={index} 
                label={`${index + 1} place${index + 1 > 1 ? 's' : ''}`} 
                value={index + 1} 
                style={[tw`text-base`]}
              />
            ))}
          </Picker>           
        </View>
      </View>

      {/* Bouton de recherche */}
      <TouchableOpacity
        style={[
          tw`py-3 rounded-md items-center mb-2`,
          (isLoading || (isLoadingLieux && lieux.length === 0)) ? tw`bg-gray-400` : tw`bg-[#094741]`
        ]}
        onPress={handleSearchClick}
        disabled={isLoading || (isLoadingLieux && lieux.length === 0)}
      >
        {isLoading ? (
          <View style={tw`flex-row items-center`}>
            <ActivityIndicator size="small" color="#ffffff" />
            <Text style={tw`ml-2 text-base font-semibold text-white`}>Recherche en cours...</Text>
          </View>
        ) : (
          <View style={tw`flex-row items-center`}>
            <Ionicons name="search-outline" size={20} color="#ffffff" />
            <Text style={tw`ml-2 text-base font-semibold text-white`}>Rechercher</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Calendar Modal */}
      <Modal 
        transparent={true} 
        animationType="slide" 
        visible={showCalendar} 
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center`}>
          <View style={tw`bg-white p-5 rounded-lg w-4/5`}>
            <Calendar
              onDayPress={onDayPress}
              markedDates={{ [selectedDate]: { selected: true, selectedColor: '#007AFF' } }}
              theme={{
                selectedDayBackgroundColor: '#007AFF',
                todayTextColor: '#007AFF',
                arrowColor: '#007AFF',
              }}
              minDate={new Date().toISOString().split('T')[0]}
            />
            <TouchableOpacity onPress={() => setShowCalendar(false)} style={tw`mt-3 self-center`}>
              <Text style={tw`text-blue-500 font-bold`}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default InterUrbainSearchForm;