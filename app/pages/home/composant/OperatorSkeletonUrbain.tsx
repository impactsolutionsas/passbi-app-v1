import React, { useRef, useEffect } from 'react';
import { View, Animated } from 'react-native';
import tw from '../../../../tailwind'; // Ajustez le chemin selon votre structure

export const OperatorSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = () => {
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]).start(() => shimmer());
    };
    shimmer();
  }, [shimmerAnim]);

  const shimmerStyle = {
    opacity: shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
  };

  const SkeletonBox = ({ 
    width, 
    height, 
    borderRadius = 8, 
    marginBottom = 0,
    marginRight = 0 ,
            style = {},

  }: {
    width: number | string;
    height: number;
    borderRadius?: number;
    marginBottom?: number;
    marginRight?: number;
            style?: any;

    
  }) => (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: '#E1E9EE',
          borderRadius,
          marginBottom,
          marginRight,
        },
        style,

        shimmerStyle,
      ]}
    />
  );

  return (
   <View style={tw` `}>
      <View style={tw`flex-row items-center flex-1 justify-between`}>
          <SkeletonBox width={45} height={45} borderRadius={22} />
         
      
      </View>
    </View>
  );
};
