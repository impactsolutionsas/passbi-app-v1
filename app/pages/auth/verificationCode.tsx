import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  PixelRatio,
  Alert,
} from "react-native";
import HeaderComponent from "../../../constants/HeaderComponent";
import tw from "../../../tailwind";
import { useRouter } from "expo-router";
import {
  verifyOtp,
  sendPhoneNumber,
  register,
  setToken,
  getToken,
} from "../../../services/api/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../../Provider/AppProvider";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const scale = (size: number) => {
  const scaleWidth = SCREEN_WIDTH / 375;
  const scaleHeight = SCREEN_HEIGHT / 812;
  const scale = Math.min(scaleWidth, scaleHeight);
  return PixelRatio.roundToNearestPixel(size * scale);
};

export default function VerificationCodeScreen() {
  const [phone, setPhone] = useState("");
  const [countryId, setCountryId] = useState("");
  const inputRefs = useRef<TextInput[]>([]);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const router = useRouter();
  const [error, setError] = useState("");
  const { setCodeVerified, login, checkAuthStatus } = useAuth(); // Ajout de login pour les nouveaux utilisateurs

  // Récupérer les données stockées au chargement de l'écran
  useEffect(() => {
    const getStoredData = async () => {
      try {
        const storedPhone = await AsyncStorage.getItem("phone");
        const storedCountryId = await AsyncStorage.getItem("countryId");
        console.log("Téléphone récupéré:", storedPhone);
        console.log("CountryId récupéré:", storedCountryId);

        if (storedPhone) {
          setPhone(storedPhone);
        }

        if (storedCountryId) {
          setCountryId(storedCountryId);
        } else {
          console.error("CountryId non trouvé dans AsyncStorage");
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des données stockées:", error);
      }
    };

    getStoredData();
  }, []);

  // Minuteur pour le bouton de renvoi
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);

      return () => {
        if (timer) clearInterval(timer);
      };
    }
  }, [resendCooldown]);

  // Cette fonction gère la vérification du code OTP entré par l'utilisateur
  const handleSubmit = async () => {
    const fullCode = code.join("");

    // Vérifier que tous les champs sont remplis
    if (fullCode.length !== 6) {
      return;
    }

    if (!phone || !countryId) {
      setError("Informations manquantes. Veuillez retourner à l'écran précédent.");
      return;
    }

    try {
      setLoading(true);
      setError(""); // Réinitialiser les erreurs précédentes

      console.log("Envoi de la vérification OTP:", { phone, code: fullCode });

      // Appel API pour vérifier le code OTP
      const response = await verifyOtp(phone, fullCode);
      console.log("Réponse API complète:", response);

      // Vérifier si la réponse est valide
      if (!response || !response.data) {
        setError("Aucune donnée reçue du serveur");
        return;
      }

      // Vérifier si la réponse contient des données
      if (response.data.length === 0) {
        setError("Code OTP invalide. Veuillez réessayer.");
        return;
      }

      // Vérifier si l'utilisateur existe en fonction de la réponse
      const userExists = response.data[0].isExistingUser || false;

      let tokenToStore;

      if (userExists) {
        // Si l'utilisateur existe, utiliser token
        tokenToStore = response.data[0].token;
      } else {
        // Si l'utilisateur n'existe pas, utiliser tempToken
        tokenToStore = response.data[0].tempToken;
      }

      if (!tokenToStore) {
        setError("Token non trouvé dans la réponse API");
        return;
      }

      // Stocker le token approprié
      await setToken(tokenToStore);
      const check = await AsyncStorage.getItem("authToken");
      console.log("[DEBUG] Token stocké dans AsyncStorage (verificationCode):", check);
      if (typeof checkAuthStatus === 'function') {
        await checkAuthStatus();
      }

      // **CHANGEMENT PRINCIPAL** : Utiliser le contexte d'authentification
      if (userExists) {
        // Utilisateur existant : connecter ET marquer le code comme vérifié
        login(tokenToStore);
        await setCodeVerified(true);

        console.log("✅ Utilisateur existant connecté et code vérifié");
        router.replace("/pages/home/accueil"); // replace au lieu de push pour éviter le retour
      } else {
        // Nouvel utilisateur : juste connecter (le code sera vérifié après l'inscription)
        login(tokenToStore);

        console.log("📝 Nouvel utilisateur, redirection vers inscription");
        router.replace("/pages/auth/register");
      }
    } catch (err: any) {
      // Messages d'erreur plus spécifiques selon le type d'erreur
      if (err.response) {
        // La requête a été faite et le serveur a répondu avec un code d'état différent de 2xx
        if (err.response.status === 401) {
          setError("Code OTP incorrect. Veuillez réessayer.");
        } else if (err.response.status === 400) {
          setError("Requête invalide. Vérifiez vos informations.");
        } else {
          setError(`Erreur serveur: ${err.response.status}`);
        }
      } else if (err.request) {
        // La requête a été faite mais aucune réponse n'a été reçue
        setError("Aucune réponse du serveur. Vérifiez votre connexion internet.");
      } else {
        // Une erreur s'est produite lors de la configuration de la requête
        setError("Une erreur est survenue lors de la vérification du code");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    try {
      setLoading(true);

      if (!phone || !countryId) {
        setError("Informations manquantes. Veuillez retourner à l'écran précédent.");
        return;
      }

      // Formater le numero de téléphone si nécessaire
      const formattedPhone = phone.startsWith("0") ? phone.substring(1) : phone;

      const response = await sendPhoneNumber(formattedPhone, countryId);

      if (response) {
        setError("Un nouveau code a été envoyé à votre numéro.");
        setResendCooldown(60); // 60 secondes de temporisation

        // Pour le développement uniquement: pré-remplir le code si disponible dans la réponse
        if (response.otpCode) {
          const otpDigits = response.otpCode.split("");
          setCode(otpDigits.length === 6 ? otpDigits : ["", "", "", "", "", ""]);
        }
      } else {
        setError("Échec de l'envoi du code. Veuillez réessayer.");
      }
    } catch (error) {
      console.error("Erreur lors du renvoi du code:", error);
      setError("Une erreur est survenue lors de l'envoi du nouveau code. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (text: string, index: number) => {
    if (!/^\d?$/.test(text)) return;

    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    // Focus automatique sur l'entrée suivante
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Soumission automatique lorsque tous les chiffres sont saisis
    if (text && index === 5 && newCode.every((digit) => digit !== "")) {
      // Attendre un moment pour une meilleure expérience utilisateur
      setTimeout(() => {
        handleSubmit();
      }, 300);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Gérer la touche retour arrière pour revenir à l'entrée précédente
    if (e.nativeEvent.key === "Backspace" && index > 0 && !code[index]) {
      const newCode = [...code];
      newCode[index - 1] = "";
      setCode(newCode);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const renderInputBoxes = () => {
    return code.map((num, index) => (
      <TextInput
        key={index}
        style={styles.input}
        ref={(el) => (inputRefs.current[index] = el)}
        keyboardType="numeric"
        maxLength={1}
        onChangeText={(text) => handleChange(text, index)}
        onKeyPress={(e) => handleKeyPress(e, index)}
        value={num}
        selectTextOnFocus
      />
    ));
  };

  return (
    <HeaderComponent>
      <View style={tw`px-2 py-8`}>
        <Text style={tw`text-3xl font-bold text-center text-gray-800`}>Vérification</Text>
        <Text style={tw`text-base text-gray-500 text-center mt-2 mb-1`}>
          Saisissez le code envoyé par SMS
        </Text>

        {/* Champs de saisie OTP */}
        <View style={tw`flex-row justify-center items-center space-x-3 mb-5`}>
          {renderInputBoxes()}
        </View>

        {error && <Text style={tw`text-red-500 text-sm text-center mb-4`}>{error}</Text>}

        {/* Bouton de soumission */}
        <TouchableOpacity
          style={tw`
            ${loading ? "bg-gray-400" : "bg-teal-800"} 
            py-4 rounded-xl mb-8
            shadow-sm
          `}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={tw`text-white text-lg font-semibold text-center`}>
            {loading ? "Vérification en cours..." : "Confirmer"}
          </Text>
        </TouchableOpacity>

        {/* Renvoi de code */}
        <View style={tw`flex-row justify-center items-center`}>
          <Text style={tw`text-gray-600 text-base`}>Code non reçu ?</Text>
          {resendCooldown > 0 ? (
            <Text style={tw`text-teal-700 ml-2 font-medium`}>{resendCooldown}s</Text>
          ) : (
            <TouchableOpacity onPress={handleResendCode} disabled={loading} style={tw`ml-2`}>
              <Text style={tw`text-teal-700 font-semibold`}>Renvoyer</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </HeaderComponent>
  );
}

const styles = StyleSheet.create({
  input: {
    width: scale(45),
    height: scale(50),
    marginHorizontal: scale(5),
    borderWidth: 2,
    borderColor: "rgba(133, 184, 243, 0.44)",
    textAlign: "center",
    fontSize: scale(20),
    borderRadius: scale(10),
    backgroundColor: "rgba(252, 253, 255, 0.39)",
    marginTop: scale(30),
  },
});
