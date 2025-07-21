import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import HeaderComponent from '../../../constants/HeaderComponent';
import tw from '../../../tailwind';
import { useRouter } from "expo-router";
import { register, getToken, setToken } from '../../../services/api/api';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from '../../../Provider/AppProvider';

export default function RegisterScreen() {
  console.log('RegisterScreen rendu');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState("");
  const [firstName, setFirstName] = useState("");
  const router = useRouter();
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registrationStep, setRegistrationStep] = useState("initial");
  const [error, setError] = useState("");
  
  // Utiliser le contexte d'authentification
  const { login, setCodeVerified, codeVerified, checkAuthStatus } = useAuth(); // Correction: codeVerified au lieu de isCodeVerified

  useEffect(() => {
    const getStoredData = async () => {
      try {
        const storedPhone = await AsyncStorage.getItem('phone');
        if (storedPhone) {
          setPhone(storedPhone);
        }
  
        // Récupérer le token
        const currentToken = await getToken();
        console.log("Token récupéré dans useEffect:", currentToken);
  
        if (currentToken) {
          setTokenState(currentToken);
          setRegistrationStep("verified");
        } else {
          console.log("Aucun token trouvé, vérification requise");
        }
      } catch (error) {
/*         console.error("Erreur lors de la récupération des données:", error);
 */      }
    };
  
    getStoredData();
  }, []);

  const handleSubmit = async () => {
    // Vérifications de base
    if (!firstName.trim() || !name.trim()) {
      setError("Veuillez remplir votre nom et prénom");
      return;
    }

    // Vérifier si le token est disponible
    if (!token) {
      setError("Session expirée. Veuillez vérifier à nouveau votre numéro de téléphone.");
      // Utiliser replace au lieu de push pour éviter les problèmes de navigation
      setTimeout(() => {
        router.replace("/pages/auth/verificationCode");
      }, 100);
      return;
    }

    try {
      setLoading(true);
      setError(""); // Réinitialiser les erreurs
      
      // Effectuer l'inscription avec le nom, prénom et token
      const userData = await register(name, firstName, token);
      
      console.log("Résultat de l'inscription:", userData);
      
      if (userData.data && userData.data[0] && userData.data[0].token) {
        // Stocker le nouveau token
        const newToken = userData.data[0].token;
        await setToken(newToken); // Utiliser setToken de l'API au lieu de AsyncStorage directement
        const check = await AsyncStorage.getItem("authToken");
        console.log("[DEBUG] Token stocké dans AsyncStorage (register):", check);
        if (typeof checkAuthStatus === 'function') {
          await checkAuthStatus();
        }
        // Connecter l'utilisateur avec le nouveau token
        login(newToken);
        
        // Marquer le code comme vérifié puisque l'inscription est complète
        await setCodeVerified(true);
        
        console.log("✅ Inscription réussie, utilisateur connecté");
        
        setRegistrationStep("completed");
        
        // Navigation différée pour éviter les erreurs de montage
        setTimeout(() => {
          router.replace("/pages/home/accueil");
        }, 100);
        
      } else {
        setError("Format de réponse inattendu");
        console.error("Structure de réponse inattendue:", userData);
      }
      
    } catch (error: any) {
      console.error("Erreur lors de l'inscription:", error);
      
      // Messages d'erreur plus spécifiques
      if (error.response) {
        if (error.response.status === 400) {
          setError("Données invalides. Veuillez vérifier vos informations.");
        } else if (error.response.status === 409) {
          setError("Un compte existe déjà avec ces informations.");
        } else {
          setError(`Erreur serveur: ${error.response.status}`);
        }
      } else if (error.request) {
        setError("Aucune réponse du serveur. Vérifiez votre connexion internet.");
      } else {
        setError("Une erreur est survenue lors de l'inscription. Veuillez réessayer.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Afficher un indicateur de chargement si pas encore initialisé
  if (registrationStep === "initial" && !token) {
    return (
      <HeaderComponent>
        <View style={tw`flex-1 justify-center items-center`}>
          <Text style={tw`text-gray-600`}>Chargement...</Text>
        </View>
      </HeaderComponent>
    );
  }

  return (
    <HeaderComponent>
      <View style={tw`px-4 py-6`}>
        <Text style={tw`text-2xl font-bold mb-2`}>
          Allez-y et créez votre compte
        </Text>
        <Text style={tw`text-sm text-gray-500 mb-6`}>
          Nous partons en voyage.
        </Text>
        
        {/* Afficher le numéro de téléphone vérifié */}
       {/*  {phone && (
          <View style={tw`mb-4 p-3 bg-green-50 rounded-xl border border-green-200`}>
            <Text style={tw`text-green-800 text-sm`}>
              ✅ Numéro vérifié: {phone}
            </Text>
          </View>
        )}
         */}
        {/* Champ prénom */}
        <View style={tw`flex-row items-center border rounded-xl border-gray-300 mb-4`}>
          <TextInput
            style={tw`flex-1 text-base p-4`}
            placeholder="Prénom"
            placeholderTextColor="#999"
            value={firstName}
            onChangeText={(text) => {
              setFirstName(text);
              if (error) setError(""); // Effacer l'erreur lors de la saisie
            }}
            autoCapitalize="words"
            editable={!loading}
          />
        </View>
        
        {/* Champ nom */}
        <View style={tw`flex-row items-center border rounded-xl border-gray-300 mb-4`}>
          <TextInput
            style={tw`flex-1 text-base p-4`}
            placeholder="Nom de famille"
            placeholderTextColor="#999"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (error) setError(""); // Effacer l'erreur lors de la saisie
            }}
            autoCapitalize="words"
            editable={!loading}
          />
        </View>

        {/* Affichage des erreurs */}
        {error ? (
          <View style={tw`mb-4 p-3 bg-red-50 rounded-xl border border-red-200`}>
            <Text style={tw`text-red-600 text-sm text-center`}>{error}</Text>
          </View>
        ) : null}
      
        <TouchableOpacity 
          style={tw`${loading ? 'bg-gray-400' : 'bg-teal-800'} py-4 rounded-xl items-center`}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={tw`text-white text-xl font-bold`}>
            {loading ? 'Création en cours...' : 'Créer votre compte'}
          </Text>
        </TouchableOpacity>

        {/* Debug info (à retirer en production) */}
      {/*   {__DEV__ && (
          <View style={tw`mt-4 p-2 bg-gray-100 rounded`}>
            <Text style={tw`text-xs text-gray-600`}>
              Debug - Token: {token ? 'Présent' : 'Absent'}
            </Text>
            <Text style={tw`text-xs text-gray-600`}>
              Code vérifié: {codeVerified ? 'Oui' : 'Non'}
            </Text>
            <Text style={tw`text-xs text-gray-600`}>
              Étape: {registrationStep}
            </Text>
          </View>
        )} */}
      </View>
    </HeaderComponent>
  );
}