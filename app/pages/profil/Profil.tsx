// ProfilScreen.tsx - Version optimisée avec cache unifié

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Alert, RefreshControl,BackHandler } from 'react-native';
import HeaderComponent from '../../../constants/headerpage/HeaderComponent';
import tw from '../../../tailwind';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from "expo-router";
import { getToken, logout, clearUserCache } from "../../../services/api/api";
import { useTranslation } from "react-i18next";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userCache, UnifiedUser } from "../../../constants/contexte/getUserCache";
import CustomTabBar from '../../../constants/CustomTabBar';

export default function ProfilScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const [user, setUser] = useState<UnifiedUser | null>(null);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [showLanguageModal, setShowLanguageModal] = useState<boolean>(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Ref to track if component is mounted
    const isMountedRef = useRef<boolean>(true);

    // Fonction pour vérifier et afficher le message de succès
    const checkForSuccessMessage = useCallback(async () => {
        try {
            const successFlag = await AsyncStorage.getItem('profile_update_success');
            if (successFlag === 'true') {
                setShowSuccessMessage(true);
                // Supprimer le flag après l'avoir lu
                await AsyncStorage.removeItem('profile_update_success');

                // Invalider le cache pour forcer une mise à jour lors du prochain fetch
                userCache.invalidate();

                // Masquer le message après 3 secondes
                setTimeout(() => {
                    if (isMountedRef.current) {
                        setShowSuccessMessage(false);
                    }
                }, 3000);
            }
        } catch (error) {
            console.error("Erreur lors de la vérification du message de succès:", error);
        }
    }, []);

    // Fonction optimisée pour récupérer les données utilisateur
    const fetchUserData = useCallback(async (forceRefresh = false, showLoader = false) => {
        try {
            if (showLoader && isMountedRef.current) {
                setIsLoading(true);
            }

            // Vérifier d'abord si on a des données en cache valides
            if (!forceRefresh) {
                const cachedUser = await userCache.getUser();
                if (cachedUser && isMountedRef.current) {
                    setUser(cachedUser);
                    console.log("👤 ProfilScreen: Données utilisateur chargées depuis le cache");
                    return;
                }
            }

            // Vérifier le token avant de faire la requête
            const currentToken = await getToken();
            if (!currentToken) {
                router.replace('/pages/auth/login');
                return;
            }

            // Utiliser le cache unifié
            const userData = await userCache.fetchUser(forceRefresh);

            if (isMountedRef.current && userData) {
                setUser(userData);
                console.log("🌐 ProfilScreen: Données utilisateur chargées depuis l'API");
            }
        } catch (error) {
            console.error("❌ ProfilScreen: Erreur lors de la récupération de l'utilisateur:", error);

            // En cas d'erreur, vérifier si le token est encore valide
            try {
                const token = await getToken();
                if (!token) {
                    router.replace('/pages/auth/login');
                }
            } catch (tokenError) {
                router.replace('/pages/auth/login');
            }
        } finally {
            if (isMountedRef.current && showLoader) {
                setIsLoading(false);
            }
        }
    }, [router]);

    // Fonction de rafraîchissement pour pull-to-refresh
    const onRefresh = useCallback(async () => {
        if (refreshing) return; // Éviter les appels multiples

        setRefreshing(true);
        try {
            await fetchUserData(true, false);
        } finally {
            if (isMountedRef.current) {
                setRefreshing(false);
            }
        }
    }, [fetchUserData, refreshing]);

    // Chargement initial des données avec subscription
    useEffect(() => {
        const initializeData = async () => {
            // Charger d'abord les données du cache si disponibles
            const cachedUser = await userCache.getUser();
            if (cachedUser && isMountedRef.current) {
                setUser(cachedUser);
                console.log("👤 ProfilScreen: Données initiales chargées depuis le cache");
            }

            // Puis faire un fetch en arrière-plan si nécessaire
            if (!cachedUser) {
                await fetchUserData(false, true);
            } else {
                // Vérifier si le cache n'est pas trop ancien
                const isValid = await userCache.isValid();
                if (!isValid) {
                    await fetchUserData(false, false);
                }
            }
        };

        initializeData();

        // S'abonner aux changements du cache
        const unsubscribe = userCache.subscribe((updatedUser) => {
            if (isMountedRef.current) {
                setUser(updatedUser);
                console.log("🔄 ProfilScreen: Utilisateur mis à jour via subscription");
            }
        });

        // Cleanup function
        return () => {
            isMountedRef.current = false;
            unsubscribe();
        };
    }, []); // Pas de dépendances pour éviter les re-renders

    // Rafraîchissement intelligent quand l'écran devient actif
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

    // Fonction de déconnexion
    const handleLogout = async () => {
        Alert.alert(
            "Deconnexion",
            "voulez-vous Deconnecter",
            [
                { text: t('Annuler'), style: 'cancel' },
                {
                    text: "Ok",
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await logout();
                            await clearUserCache();
                            userCache.clear(); // Nettoyer le cache unifié
                            console.log('[DEBUG CLEAR USER] setUser(null) déclenché par logout manuel');
                            setUser(null);
                            router.replace('/pages/auth/login');
                        } catch (error) {
                            console.error("Erreur lors de la déconnexion :", error);
                            // Force logout même en cas d'erreur
                            await clearUserCache();
                            userCache.clear();
                            console.log('[DEBUG CLEAR USER] setUser(null) déclenché par logout manuel (erreur)');
                            setUser(null);
                            router.replace('/pages/auth/login');
                        }
                    }
                }
            ]
        );
    };

    // Configuration des éléments du menu
    const menuItems = [
        {
            id: '1',
            title: 'Modifier votre Profil',
            icon: 'person-outline' as const,
            color: '#10B981',
            onPress: () => {
                // Invalider le cache avant de naviguer vers la modification
                userCache.invalidate();
                router.push('./formUpdateUser');
            }
        },
        {
            id: '3',
            title: 'À propos de nous ',
            icon: 'information-circle-outline' as const,
            color: '#8B5CF6',
            // onPress: () => router.push('/(tabs)/profil/about')
        },
        {
            id: '4',
            title: 'Centre d\'aide',
            icon: 'help-outline' as const,
            color: '#F59E0B',
            // onPress: () => router.push('/(tabs)/profil/help')
        }
    ];

    // Fonction pour obtenir le nom complet
    const getFullName = () => {
        if (!user) return t('unknown_user');
        const firstName = user.firstName || '';
        const name = user.name || '';
        return `${firstName} ${name}`.trim() || t('unknown_user');
    };

    return (
        <>
            <HeaderComponent>
                {/* Message de succès */}
                {showSuccessMessage && (
                    <View style={tw`bg-green-100 border border-green-400 px-4 py-3 rounded-lg mx-4 mb-4`}>
                        <View style={tw`flex-row items-center`}>
                            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                            <Text style={tw`text-green-700 font-medium ml-2`}>
                                Modifications enregistrées avec succès
                            </Text>
                        </View>
                    </View>
                )}

                {/* Indicateur de chargement initial */}
                {isLoading && !user && (
                    <View style={tw`items-center justify-center py-8`}>
                        <Text style={tw`text-gray-500`}>Chargement...</Text>
                    </View>
                )}

                <ScrollView
                    style={tw`flex-1`} // ✅ Permet d'occuper tout l'espace disponible
                    contentContainerStyle={tw`pb-32`} // ✅ Ajoute de l’espace pour ne pas être caché sous le TabBar
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#10B981']}
                            tintColor="#10B981"
                        />
                    }
                >

                    {/* En-tête du profil */}
                    <View style={tw`items-center mb-6`}>
                        <View style={tw`w-24 h-24 rounded-full bg-gray-200 items-center justify-center`}>
                            <Ionicons name="person" size={40} color="#6B7280" />
                        </View>
                        <Text style={tw`text-xl font-bold text-gray-900 mt-3`}>
                            {getFullName()}
                        </Text>
                        <Text style={tw`text-sm text-gray-500`}>Profil</Text>

                        {/* Affichage des préférences utilisateur */}
                        {user && (
                            <View style={tw`mt-2 px-4`}>
                                <Text style={tw`text-xs text-gray-500 text-center`}>
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Menu des paramètres */}
                    <View style={tw`px-4`}>
                        {menuItems.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={tw`flex-row items-center justify-between p-4 mb-3 bg-white rounded-xl shadow-sm`}
                                onPress={item.onPress}
                            >
                                <View style={tw`flex-row items-center`}>
                                    <View style={[tw`w-10 h-10 rounded-full items-center justify-center`, { backgroundColor: `${item.color}20` }]}>
                                        <Ionicons name={item.icon} size={20} color={item.color} />
                                    </View>
                                    <Text style={tw`text-base font-medium text-gray-900 ml-4`}>
                                        {item.id === '2' ? t(item.title) : item.title}
                                    </Text>
                                </View>
                                <MaterialIcons name="keyboard-arrow-right" size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Bouton de déconnexion */}
                    <View style={tw`px-4 mt-4 mb-5`}>
                        <TouchableOpacity
                            style={tw`flex-row items-center justify-center p-4 bg-red-50 rounded-xl`}
                            onPress={handleLogout}
                        >
                            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                            <Text style={tw`text-red-600 font-medium ml-2`}>Déconnexion</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                {/* Modal de sélection de langue */}
                <Modal
                    transparent={true}
                    animationType="slide"
                    visible={showLanguageModal}
                    onRequestClose={() => setShowLanguageModal(false)}
                >
                    <View style={tw`flex-1 bg-black bg-opacity-60 justify-center items-center`}>
                        <View style={tw`bg-white p-6 rounded-xl w-4/5 max-w-md`}>
                            <Text style={tw`text-xl font-bold text-gray-900 mb-4 text-center`}>
                                {t('language')}
                            </Text>

                            {/* Options de langue à implémenter */}
                            <Text style={tw`text-gray-600 text-center mb-4`}>
                                Options de langue à implémenter
                            </Text>

                            <TouchableOpacity
                                style={tw`bg-gray-200 p-3 rounded-lg mt-2`}
                                onPress={() => setShowLanguageModal(false)}
                            >
                                <Text style={tw`text-gray-800 font-medium text-center`}>
                                    {t('fermer')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </HeaderComponent>
            <CustomTabBar />
        </>
    );
}