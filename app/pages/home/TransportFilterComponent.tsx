// components/TransportFilterComponent.tsx - Version corrigée
import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from '../../../tailwind';

// Import des composants existants
import OptionsTransportUrbain from '../home/composant/TransportUrbain';
import InterUrbainSearchForm from '../home/composant/InterUrbainSearchForm';

type TransportType = 'urbain' | 'interurbain';

type Operator = {
  operator?: {
    id?: string;
    name?: string;
  };
};

type TransportFilterComponentProps = {
  // Props pour Transport Urbain
  onOptionPress: (option: string, operatorId?: string) => void;
  operators?: Operator[];
  isTransportLoading?: boolean;
  onRefresh?: () => void;
  
  // Props pour InterUrbain
  onSearch: (formData: {
    depart: string;
    arrival: string;
    selectedDate: string;
    personCount: number;
  }) => void;
  isSearchLoading: boolean;
};

const TransportFilterComponent = ({
  onOptionPress,
  operators = [],
  isTransportLoading = false,
  onRefresh,
  onSearch,
  isSearchLoading
}: TransportFilterComponentProps) => {
  const [activeFilter, setActiveFilter] = useState<TransportType>('urbain');

  // ✅ Logique améliorée pour déterminer si on doit forcer l'affichage
  const shouldForceShowAsAvailable = useMemo(() => {
    // Si les opérateurs sont en cours de chargement, ne pas forcer l'affichage
    if (isTransportLoading) {
      return false;
    }
    
    // Si on n'a pas d'opérateurs mais qu'on n'est pas en chargement,
    // on peut supposer qu'il y a eu un problème de chargement
    // Dans ce cas, afficher les options comme disponibles pour permettre à l'utilisateur d'essayer
    if (!operators || operators.length === 0) {
      console.log('Aucun opérateur trouvé, affichage forcé des options de transport');
      return true;
    }
    
    return false;
  }, [operators, isTransportLoading]);

  const renderFilterTabs = () => (
    <View style={tw`flex-row bg-gray-100 rounded-lg p-1 mx-4 mb-4`}>
      <TouchableOpacity
        style={tw`flex-1 py-3 px-4 rounded-md ${
          activeFilter === 'urbain' ? 'bg-teal-800 shadow-sm' : ''
        }`}
        onPress={() => setActiveFilter('urbain')}
        activeOpacity={0.7}
      >
        <View style={tw`flex-row items-center justify-center`}>
          <Ionicons 
            name="bus-outline" 
            size={16} 
            color={activeFilter === 'urbain' ? 'white' : '#6B7280'} 
          />
          <Text style={tw`ml-2 font-medium ${
            activeFilter === 'urbain' ? 'text-white' : 'text-gray-500'
          }`}>
            Transport Urbain
          </Text>
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={tw`flex-1 py-2 px-4 rounded-md ${
          activeFilter === 'interurbain' ? 'bg-teal-800  shadow-sm' : ''
        }`}
        onPress={() => setActiveFilter('interurbain')}
        activeOpacity={0.7}
      >
        <View style={tw`flex-row items-center justify-center`}>
          <Ionicons 
            name="car-outline" 
            size={16} 
            color={activeFilter === 'interurbain' ? 'white' : '#6B7280'} 
          />
          <Text style={tw`ml-2 font-medium ${
            activeFilter === 'interurbain' ? 'text-white' : 'text-gray-500'
          }`}>
            InterUrbain
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    if (activeFilter === 'urbain') {
      return (
        <OptionsTransportUrbain
          onOptionPress={onOptionPress}
          operators={operators}
          isLoading={isTransportLoading}
          onRefresh={onRefresh}
          forceShowAsAvailable={shouldForceShowAsAvailable} // ✅ Passer le nouveau prop
        />
      );
    } else {
      return (
        <View style={tw`px-4`}>
        
          <InterUrbainSearchForm
            onSearch={onSearch}
            isLoading={isSearchLoading}
          />
        </View>
      );
    }
  };

  // ✅ Debug logging
  console.log('TransportFilterComponent render - operators:', operators?.length || 0, 'isTransportLoading:', isTransportLoading, 'shouldForceShow:', shouldForceShowAsAvailable);

  return (
    <View>
      {renderFilterTabs()}
      {renderContent()}
    </View>
  );
};

export default TransportFilterComponent;