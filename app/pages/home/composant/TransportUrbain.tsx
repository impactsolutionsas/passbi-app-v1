// components/TransportUrbain.tsx - Version corrigée
import React, { memo, useMemo, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import tw from '../../../../tailwind';
import { OperatorSkeleton } from "./OperatorSkeletonUrbain"

// Types
type PropriétésOptionTransport = {
  libellé: string;
  cheminImage: any;
  couleurFond: string;
  operatorId?: string;
  onPress: (libellé: string, operatorId?: string) => void;
  isLoading?: boolean;
  showAsAvailable?: boolean; // ✅ Nouveau prop pour forcer l'affichage
};

// Composant OptionTransport mémoïsé avec comparaison personnalisée
const OptionTransport = memo<PropriétésOptionTransport>(({ 
  libellé, 
  cheminImage, 
  couleurFond, 
  operatorId, 
  onPress,
  isLoading = false,
  showAsAvailable = false // ✅ Par défaut false
}) => {
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;

  const handlePress = useCallback(() => {
    onPressRef.current(libellé, operatorId);
  }, [libellé, operatorId]);

  if (isLoading) {
      return <OperatorSkeleton />;

  }

  // ✅ Logique améliorée : afficher comme disponible si on a un operatorId OU si showAsAvailable est true
  const isAvailable = operatorId || showAsAvailable;

  return (
    <View style={tw`items-center justify-center`}>
      {isAvailable ? (
        <TouchableOpacity
          style={tw`items-center`}
          onPress={handlePress}
          activeOpacity={0.7}
        >
          <View style={tw`w-12 h-12 rounded-full bg-${couleurFond} items-center justify-center mb-1 shadow-sm`}>
            <Image
              source={cheminImage}
              style={tw`w-full h-full rounded-lg`}
              resizeMode="cover"
            />
          </View>
          <Text style={tw`text-xs font-medium text-gray-700`}>{libellé}</Text>
        </TouchableOpacity>
      ) : (
        <View style={tw`items-center opacity-50`}>
          <View style={tw`w-12 h-12 rounded-full bg-${couleurFond} items-center justify-center mb-1`}>
            <Image
              source={cheminImage}
              style={tw`w-full h-full rounded-lg`}
              resizeMode="cover"
            />
          </View>
          <Text style={tw`text-xs text-gray-500`}>{libellé}</Text>
        </View>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  // ✅ Comparaison mise à jour
  return (
    prevProps.libellé === nextProps.libellé &&
    prevProps.operatorId === nextProps.operatorId &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.couleurFond === nextProps.couleurFond &&
    prevProps.showAsAvailable === nextProps.showAsAvailable
  );
});

OptionTransport.displayName = 'OptionTransport';

// Types pour le composant principal
type Operator = {
  operator?: {
    id?: string;
    name?: string;
  };
};

type PropriétésOptionsTransportUrbain = {
  onOptionPress: (option: string, operatorId?: string) => void;
  operators?: Operator[];
  isLoading?: boolean;
  onRefresh?: () => void;
  forceShowAsAvailable?: boolean; // ✅ Nouveau prop
};

// Cache pour éviter les recalculs
const operatorsCache = new Map();

// Fonction de hachage pour les operators
const hashOperators = (operators?: Operator[]): string => {
  if (!operators || operators.length === 0) return 'empty';
  return operators.map((op: Operator) => `${op.operator?.id || 'no-id'}-${op.operator?.name || 'no-name'}`).join(',');
};

// Composant principal optimisé
const OptionsTransportUrbain = memo<PropriétésOptionsTransportUrbain>(({ 
  onOptionPress, 
  operators = [], 
  isLoading = false,
  onRefresh,
  forceShowAsAvailable = false // ✅ Nouveau prop avec valeur par défaut
}) => {
  const [refreshing, setRefreshing] = React.useState(false);
  const onOptionPressRef = useRef(onOptionPress);
  const onRefreshRef = useRef(onRefresh);
  
  // Mise à jour des refs sans déclencher de re-render
  onOptionPressRef.current = onOptionPress;
  onRefreshRef.current = onRefresh;

  // Options de base (statiques, mémoïsées une seule fois)
  const optionsBase = useMemo(() => [
    { 
      libellé: "BRT", 
      nom: "Bus Rapid Transit",
      cheminImage: require('../../../../assets/images/BRT.png'), 
      couleurFond: "blue-100" 
    },
    { 
      libellé: "TER", 
      nom: "TER Senegal",
      cheminImage: require('../../../../assets/images/TER.png'), 
      couleurFond: "yellow-100" 
    },
    { 
      libellé: "DEM DIKK", 
      nom: "DEM DIKK",
      cheminImage: require('../../../../assets/images/DD.png'), 
      couleurFond: "pink-100" 
    },
    { 
      libellé: "AFTU", 
      nom: "AFTU",
      cheminImage: require('../../../../assets/images/aftu.png'), 
      couleurFond: "gray-100" 
    },
  ], []);

  // Callback pour le rafraîchissement stable
  const handleRefresh = useCallback(() => {
    if (onRefreshRef.current) {
      setRefreshing(true);
      const refreshPromise = Promise.resolve(onRefreshRef.current());
      
      refreshPromise.finally(() => {
        setTimeout(() => {
          setRefreshing(false);
        }, 1000);
      });
    }
  }, []);

  // ✅ Association options-opérateurs avec logique améliorée
  const optionsAvecId = useMemo(() => {
    const operatorsHash = hashOperators(operators);
    
    // Vérifier le cache
    if (operatorsCache.has(operatorsHash)) {
      return operatorsCache.get(operatorsHash);
    }

    let result;
    if (!Array.isArray(operators) || operators.length === 0) {
      // ✅ Si pas d'opérateurs, créer les options de base sans operatorId
      result = optionsBase.map((option) => ({ 
        ...option, 
        operatorId: undefined,
        showAsAvailable: forceShowAsAvailable // ✅ Utiliser le prop pour forcer l'affichage
      }));
    } else {
      result = optionsBase.map((option) => {
        const operateurCorrespondant = operators.find((op: Operator) => {
          if (!op.operator || !op.operator.name) return false;
          
          const operatorName = op.operator.name.toLowerCase();
          const optionNom = option.nom.toLowerCase();
          const optionLibelle = option.libellé.toLowerCase();
          
          return operatorName.includes(optionNom) || 
                 operatorName.includes(optionLibelle) ||
                 optionNom.includes(operatorName) ||
                 optionLibelle.includes(operatorName);
        });

        return {
          ...option,
          operatorId: operateurCorrespondant?.operator?.id,
          showAsAvailable: forceShowAsAvailable || !!operateurCorrespondant?.operator?.id
        };
      });
    }

    // Mettre en cache (limiter la taille du cache)
    if (operatorsCache.size > 10) {
      const firstKey = operatorsCache.keys().next().value;
      operatorsCache.delete(firstKey);
    }
    operatorsCache.set(operatorsHash, result);
    
    return result;
  }, [optionsBase, operators, forceShowAsAvailable]);

  // Callback pour la pression d'option stable
  const handleOptionPress = useCallback((libellé: string, operatorId?: string) => {
    onOptionPressRef.current(libellé, operatorId);
  }, []);

  // Composant de titre stable
  const titre = useMemo(() => (
    <Text style={tw`text-lg font-semibold text-gray-800 tracking-wide text-center my-3`}>
      Achetez vos tickets de transport en ville
    </Text>
  ), []);

  // RefreshControl stable
  const refreshControl = useMemo(() => (
    <RefreshControl 
      refreshing={refreshing}
      onRefresh={handleRefresh}
      colors={['#094741']}
      tintColor={'#094741'}
      title="Mise à jour..."
      titleColor="#094741"
    />
  ), [refreshing, handleRefresh]);

  // ✅ Debug logging
  console.log('OptionsTransportUrbain render - operators:', operators?.length || 0, 'isLoading:', isLoading, 'forceShowAsAvailable:', forceShowAsAvailable);

  return (
    <View style={tw`mb-4`}>
      {titre}
      
      <ScrollView 
        horizontal={false} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`py-2`}
        refreshControl={refreshControl}
      >
        <View style={tw`flex-row justify-around items-center`}>
          {optionsAvecId.map((option: any) => (
            <OptionTransport
              key={option.libellé}
              libellé={option.libellé} 
              cheminImage={option.cheminImage}
              couleurFond={option.couleurFond}
              operatorId={option.operatorId}
              onPress={handleOptionPress}
              isLoading={isLoading}
              showAsAvailable={option.showAsAvailable} // ✅ Passer le nouveau prop
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}, (prevProps: Readonly<PropriétésOptionsTransportUrbain>, nextProps: Readonly<PropriétésOptionsTransportUrbain>) => {
  // ✅ Comparaison personnalisée mise à jour
  return (
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.forceShowAsAvailable === nextProps.forceShowAsAvailable &&
    hashOperators(prevProps.operators) === hashOperators(nextProps.operators)
  );
});

OptionsTransportUrbain.displayName = 'OptionsTransportUrbain';

export default OptionsTransportUrbain;