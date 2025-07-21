import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import HeaderComponent from '../../../constants/headerpage/HeaderComponent';
import tw from '../../../tailwind';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { getToken, updateUser } from "../../../services/api/api";
import { jwtDecode, JwtPayload } from "jwt-decode";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userCache } from "../../../constants/contexte/getUserCache";
import { useFocusEffect } from '@react-navigation/native';
import { BackHandler } from 'react-native';

// Interface pour le payload du JWT décodé
interface CustomJwtPayload extends JwtPayload {
    id: string;
}

// Interface pour la réponse API
interface ApiResponse {
    ok: boolean;
    message?: string;
    status?: number;
    [key: string]: any;
}

export default function FormUpdateUser(): React.ReactElement {
    const { t } = useTranslation();
    const router = useRouter();

    // États pour gérer les données du formulaire
    const [firstName, setFirstName] = useState<string>('');
    const [name, setName] = useState<string>('');
    const [preferredPayment, setPreferredPayment] = useState<string>('WAVE');
    const [notifications, setNotifications] = useState<string>('Activer');

    // États pour gérer l'interface utilisateur
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [isReady, setIsReady] = useState<boolean>(false);

    // Chargement immédiat des données depuis le cache
    useEffect(() => {
        const loadUserData = async (): Promise<void> => {
            try {
                // Récupération immédiate depuis le cache
                const cachedUser = await userCache.getUser();
                
                if (cachedUser) {
                    // Utiliser les données du cache immédiatement
                    setFirstName(cachedUser.firstName || '');
                    setName(cachedUser.name || '');
                    setPreferredPayment(cachedUser.preferredPayment || 'WAVE');
                    setNotifications(cachedUser.notifications || 'Activer');
                    console.log("✅ FormUpdateUser: Données chargées depuis le cache");
                } else {
                    // Si pas de cache, faire un fetch rapide
                    const userData = await userCache.fetchUser();
                    if (userData) {
                        setFirstName(userData.firstName || '');
                        setName(userData.name || '');
                        setPreferredPayment(userData.preferredPayment || 'WAVE');
                        setNotifications(userData.notifications || 'Activer');
                    }
                }
                
                setIsReady(true);
            } catch (error) {
                console.error("Erreur lors du chargement des données:", error);
                // En cas d'erreur, on affiche quand même le formulaire avec des valeurs par défaut
                setIsReady(true);
            }
        };

        loadUserData();
    }, []);

    const handleSubmit = async (): Promise<void> => {
        try {
            setSubmitting(true);
            setError('');

            // Valider les données du formulaire
            if (!firstName.trim() || !name.trim()) {
                setError('Le prénom et le nom sont requis');
                return;
            }

            const currentToken = await getToken();
            if (!currentToken) {
                throw new Error(t('token_unavailable'));
            }

            // Récupérer l'ID utilisateur depuis le token
            const decodedToken = jwtDecode<CustomJwtPayload>(currentToken);
            const userId = decodedToken.id;

            if (!userId) {
                throw new Error(t('user_id_not_found'));
            }

            // Créer l'objet avec les données à mettre à jour
            const updateData = {
                userId: userId,
                firstName: firstName.trim(),
                name: name.trim(),
                notifications: notifications,
                preferredPayment: preferredPayment
            };

            // Appel API pour mettre à jour l'utilisateur
            const response = await updateUser(userId, updateData, currentToken) as ApiResponse;

            if (response && response.status === 200) {
                console.log("✅ Succès:", response.message);

                // Mettre à jour le cache avec les nouvelles données
                await userCache.updateUser({
                    firstName: firstName.trim(),
                    name: name.trim(),
                    preferredPayment: preferredPayment,
                    notifications: notifications
                });

                // Flag de succès
                await AsyncStorage.setItem('profile_update_success', 'true');

                // Retour
                router.back();
            } else {
                throw new Error(response?.message || 'Erreur de mise à jour');
            }

        } catch (error: any) {
            console.error("Erreur lors de la mise à jour:", error);
            setError(error.message || t('update_error'));
        } finally {
            setSubmitting(false);
        }
    };

    // Gestion de l'annulation
    const handleCancel = (): void => {
        router.back();
    };

    // Calcul de l'initiale pour l'avatar
    const getInitial = (): string => {
        const firstInitial = firstName && firstName.trim() ? firstName.trim().charAt(0).toUpperCase() : "";
        const lastInitial = name && name.trim() ? name.trim().charAt(0).toUpperCase() : "";
        return firstInitial + lastInitial || "?";
    };

    // Gestion du bouton retour Android pour retour fluide
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

    // Affichage immédiat du formulaire (sans écran de chargement)
    return (
        <HeaderComponent>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* En-tête */}
                <View style={tw`flex-row items-center justify-between px-4`}>
                    <TouchableOpacity onPress={handleCancel}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={tw`text-lg font-bold`}>Modifier votre Profil</Text>
                    <View style={tw`w-6`} />
                </View>

                <View style={tw`px-6 pt-8`}>
                    {/* Affichage des erreurs */}
                    {error ? <Text style={tw`text-red-500 mb-4 text-center`}>{error}</Text> : null}

                    {/* Cercle d'initiale */}
                    <View style={tw`items-center mb-2`}>
                        <View style={tw`w-24 h-24 rounded-full bg-teal-600 items-center justify-center`}>
                            <Text style={tw`text-white text-2xl font-bold`}>{getInitial()}</Text>
                        </View>
                    </View>

                    {/* Champ prénom */}
                    <View style={tw`mb-2`}>
                        <Text style={tw`text-gray-700 mb-2 font-medium`}>Prénom</Text>
                        <TextInput
                            style={tw`border border-gray-300 rounded-lg p-4 bg-white`}
                            value={firstName}
                            onChangeText={setFirstName}
                            placeholder="Entrez votre prénom"
                            editable={!submitting}
                        />
                    </View>

                    {/* Champ nom */}
                    <View style={tw`mb-2`}>
                        <Text style={tw`text-gray-700 mb-2 font-medium`}>Nom</Text>
                        <TextInput
                            style={tw`border border-gray-300 rounded-lg p-4 bg-white`}
                            value={name}
                            onChangeText={setName}
                            placeholder="Entrez votre nom"
                            editable={!submitting}
                        />
                    </View>

                    {/* Méthode de paiement préférée */}
                  {/*   <View style={tw`mb-5`}>
                        <Text style={tw`text-gray-700 mb-2 font-medium`}>Méthode de paiement</Text>
                        <View style={tw`border border-gray-300 rounded-lg bg-white overflow-hidden`}>
                            <Picker
                                selectedValue={preferredPayment}
                                onValueChange={(value: string) => setPreferredPayment(value)}
                                style={tw`h-14`}
                                enabled={!submitting}
                            >
                                <Picker.Item label="WAVE" value="WAVE" />
                                <Picker.Item label="Orange Money" value="ORANGE_MONEY" />
                                <Picker.Item label="Carte Bancaire" value="CARD" />
                                <Picker.Item label="PayPal" value="PAYPAL" />
                            </Picker>
                        </View>
                    </View> */}

                    {/* Boutons d'action */}
                    <View style={tw`flex-row justify-between mb-5`}>
                        <TouchableOpacity
                            style={[
                                tw`bg-gray-200 rounded-lg py-2 items-center flex-1 mr-2`,
                                submitting && tw`opacity-50`
                            ]}
                            onPress={handleCancel}
                            disabled={submitting}
                        >
                            <Text style={tw`text-gray-700 font-bold text-base`}>Annuler</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                tw`bg-teal-800 rounded-lg py-3 items-center flex-1 ml-2`,
                                submitting && tw`opacity-75`
                            ]}
                            onPress={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <View style={tw`flex-row items-center`}>
                                    <ActivityIndicator color="#fff" size="small" />
                                    <Text style={tw`text-white font-bold text-base ml-2`}>
                                        Sauvegarde...
                                    </Text>
                                </View>
                            ) : (
                                <Text style={tw`text-white font-bold text-base`}>Sauvegarder</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </HeaderComponent>
    );
}