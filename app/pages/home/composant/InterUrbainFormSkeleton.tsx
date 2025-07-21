import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import tw from '../../../../tailwind';

export const InterUrbainFormSkeleton = () => {
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const shimmer = () => {
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnim, {
                    toValue: 0,
                    duration: 1000,
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
        marginBottom = 0,
        borderRadius = 8,
        style = {},
    }: {
        width?: number;
        height: number;
        marginBottom?: number;
        borderRadius?: number;
        style?: any;
    }) => (
        <Animated.View
            style={[
                width !== undefined ? { width } : {},
                {
                    height,
                    backgroundColor: '#E1E9EE',
                    borderRadius,
                    marginBottom,
                },
                style,
                shimmerStyle,
            ]}
        />
    );
    const styles = StyleSheet.create({
        fullWidth: { width: "100%" }
    });

    return (
        <View style={tw`flex-col items-center w-full`}>
            <SkeletonBox width={220} height={24} marginBottom={16} borderRadius={6} />

            <View style={tw`flex-row mb-1`}>
                <SkeletonBox width={32} height={32} marginBottom={0} borderRadius={16} />
                <View style={tw`w-2`} />
                <SkeletonBox width={32} height={32} marginBottom={0} borderRadius={16} />
                <View style={tw`w-2`} />
                <SkeletonBox width={32} height={32} marginBottom={0} borderRadius={16} />
                <View style={tw`w-2`} />
                <SkeletonBox width={32} height={32} marginBottom={0} borderRadius={16} />
            </View>



            <View style={tw`w-full `}>
                <SkeletonBox style={styles.fullWidth} height={55} borderRadius={8} />
            </View>

            {/* Champs date et tickets */}
            <View style={tw`w-full flex-row mb-3`}>
                <View style={tw`flex-1 mr-1`}>
                    <SkeletonBox style={styles.fullWidth} height={55} borderRadius={8} />
                </View>
                <View style={tw`flex-1`}>
                    <SkeletonBox style={styles.fullWidth} height={55} borderRadius={8} />        
                </View>
            </View>

            {/* Bouton de recherche */}
            <View style={tw`w-full`}>
                <SkeletonBox style={styles.fullWidth} height={48} borderRadius={8} />
            </View>
        </View>
    );
};