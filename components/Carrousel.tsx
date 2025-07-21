import React, { useState, useEffect, useRef } from 'react';
import { View, Image, Dimensions, FlatList, TouchableOpacity } from 'react-native';
import tw from '../tailwind';

// Interface pour les éléments du carrousel
interface CarouselItem {
  id: string;
  image: any;
}

// Type de la référence FlatList
type FlatListType = FlatList<CarouselItem>;

// Props du composant
interface DynamicCarouselProps {
  // Images personnalisées (optionnel)
  customImages?: CarouselItem[];
  // Durée de l'auto-scroll en millisecondes (optionnel, défaut: 3000ms)
  autoScrollInterval?: number;
  // Hauteur du carrousel (optionnel, défaut: h-30)
  height?: string;
  // Activer/désactiver l'auto-scroll (optionnel, défaut: true)
  enableAutoScroll?: boolean;
  // Couleur des indicateurs actifs (optionnel, défaut: bg-green-800)
  activeDotColor?: string;
  // Couleur des indicateurs inactifs (optionnel, défaut: bg-gray-400)
  inactiveDotColor?: string;
}

// Composant de carrousel dynamique amélioré et personnalisable
const DynamicCarousel: React.FC<DynamicCarouselProps> = ({
  customImages,
  autoScrollInterval = 3000,
  height = 'h-30',
  enableAutoScroll = true,
  activeDotColor = 'bg-green-800',
  inactiveDotColor = 'bg-gray-400'
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatListType>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingRef = useRef<boolean>(false);
  const screenWidth = Dimensions.get('window').width;
  
  // Images du carrousel - utilise les images personnalisées ou les images par défaut
  const carouselItems: CarouselItem[] = customImages || [
    { id: '1', image: require('../assets/images/pub.png') },
    { id: '2', image: require('../assets/images/pub.png') },
    { id: '3', image: require('../assets/images/pub.png') },
  ];

  // Fonction pour faire défiler vers un index spécifique
  const scrollToIndex = (index: number) => {
    if (!flatListRef.current || isScrollingRef.current) return;
    
    // Gérer la logique de bouclage
    let targetIndex = index;
    if (index >= carouselItems.length) {
      targetIndex = 0;
    } else if (index < 0) {
      targetIndex = carouselItems.length - 1;
    }
    
    try {
      isScrollingRef.current = true;
      flatListRef.current.scrollToIndex({
        index: targetIndex,
        animated: true,
        viewPosition: 0,
        viewOffset: 0
      });
      
      // Sécurité pour éviter le blocage de l'état isScrolling
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 500);
    } catch (error) {
      console.log("Erreur lors du défilement:", error);
      isScrollingRef.current = false;
    }
  };

  // Démarrer le défilement automatique
  const startAutoScroll = () => {
    if (!enableAutoScroll) return;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % carouselItems.length);
    }, autoScrollInterval) as any;
  };

  // Initialiser le défilement automatique
  useEffect(() => {
    startAutoScroll();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activeIndex, enableAutoScroll, autoScrollInterval]);

  // Gérer le changement d'index lors du défilement manuel
  const handleScroll = (event: any) => {
    if (isScrollingRef.current) return;
    
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / screenWidth);
    
    if (index !== activeIndex && index >= 0 && index < carouselItems.length) {
      setActiveIndex(index);
    }
  };

  // Gérer la fin du défilement
  const handleMomentumScrollEnd = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / screenWidth);
    
    if (index >= 0 && index < carouselItems.length) {
      setActiveIndex(index);
      // Redémarrer le défilement automatique après un défilement manuel
      if (enableAutoScroll) {
        startAutoScroll();
      }
    }
  };

  // Gérer l'erreur de scrollToIndex
  const handleScrollToIndexFailed = (info: any) => {
    isScrollingRef.current = false;
    console.log("Échec du défilement vers l'index:", info);
    
    // Attendre un peu puis réessayer avec une approche différente
    setTimeout(() => {
      if (flatListRef.current) {
        try {
          // Utiliser scrollToOffset comme solution de secours
          flatListRef.current.scrollToOffset({
            offset: info.index * (screenWidth - 32),
            animated: false
          });
          
          // Puis mettre à jour l'index actif
          setActiveIndex(info.index);
        } catch (error) {
          console.error("Échec de la solution de secours:", error);
        }
      }
    }, 100);
  };

  // Rendu d'un élément du carrousel
  const renderItem = ({ item }: { item: CarouselItem }) => {
    return (
      <View style={[tw`${height}`, { width: screenWidth - 25 }]}> 
        <Image
          source={item.image}
          style={tw`w-full h-full rounded-lg`}
          resizeMode="cover"
        />
      </View>
    );
  };

  // Rendu des indicateurs de position
  const renderDots = () => {
    return (
      <View style={tw`flex-row justify-center items-center mt-2`}>
        {carouselItems.map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => {
              scrollToIndex(index);
            }}
            activeOpacity={0.7}
          >
            <View
              style={[
                tw`rounded-full mx-1.5`,
                index === activeIndex 
                  ? tw`w-2.5 h-2.5 ${activeDotColor}` 
                  : tw`w-1.5 h-1.5 ${inactiveDotColor}`
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={tw`rounded-lg mb-3`}> 
      <FlatList
        ref={flatListRef}
        data={carouselItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        snapToAlignment="start"
        decelerationRate="fast"
        snapToInterval={screenWidth - 32} // Correspond à la largeur de l'élément
        contentContainerStyle={tw`py-2`} // Espace vertical autour du carousel
        getItemLayout={(_, index) => ({
          length: screenWidth - 32,
          offset: (screenWidth - 32) * index,
          index,
        })}
        removeClippedSubviews={true} // Améliore les performances
      />
      {renderDots()}
    </View>
  );
};

export default DynamicCarousel;