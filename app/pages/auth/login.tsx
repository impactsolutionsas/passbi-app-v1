import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, FlatList, BackHandler, Alert } from 'react-native';
import HeaderComponent from '../../../constants/HeaderComponent';
import tw from '../../../tailwind';
import { getCountrie, sendPhoneNumber } from '../../../services/api/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../../Provider/AppProvider';
import { useAuthState } from '../../../hooks/useAuthState';
import { LoginProtection } from '../../../components/LoginProtection';


interface Country{
  id:string,
  code:string,
  name:string,
  currency:string
  country:string,
  flag: string
}
export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [error, setError] = useState("");
  const { isAuthenticated } = useAuth();
  const { hasLoggedOut, isNewUser } = useAuthState();

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setLoading(true);
        const response = await getCountrie();
        if (response && response.data) {
          setCountries(response.data);
          // Par défaut, on sélectionne le premier pays de la liste
          if (response.data.length > 0) {
            setSelectedCountry(response.data);
            const senegal = response.data.find((country: Country) => country.name === "Sénégal");
            if (senegal) {
              setSelectedCountry(senegal);
            } 
            // Sinon, sélectionner le premier pays de la liste
            else if (response.data.length > 0) {
              setSelectedCountry(response.data[0]);
            }

          }
        }
      } catch (error) {
/*         console.error("Erreur lors de la récupération des pays:", error);
 */      } finally {
        setLoading(false);
      }
    };

    fetchCountries();
  }, []);

// Dans LoginScreen.js
const handleSubmit = async () => {
  if (!selectedCountry || !phone.trim()) {
    setError("Veuillez entrer un numéro de téléphone valide.");
    return;
  }

  try {
    setLoading(true);
    const formattedPhone = phone.startsWith('0') ? phone.substring(1) : phone;
    
    await AsyncStorage.setItem('phone', formattedPhone);
    await AsyncStorage.setItem('countryId', selectedCountry.id);
    
  
    const response = await sendPhoneNumber(formattedPhone, selectedCountry.id);
    
    // redirection vers la page otp
    router.push("/pages/auth/verificationCode");
  } catch (error) {
    setError("Veuillez vérifier le numéro de téléphone");
  } finally {
    setLoading(false);
  }
};

  const openCountryModal = () => {
    setModalVisible(true);
  };

  const selectCountry = (country:any) => {
    setSelectedCountry(country);
    setModalVisible(false);
  };

  const renderCountryItem =  ({ item }:any) => (
    <TouchableOpacity 
      style={tw`p-4 border-b border-gray-200`}
      onPress={() => selectCountry(item)}
    >
      <Text style={tw`text-base`}>
        {item.name} ({item.code})
      </Text>
    </TouchableOpacity>
  );

  return (
    <LoginProtection>
      <HeaderComponent>
        <View>
          <Text style={tw`text-lg font-bold mb-2 text-center`}>
            Connectez-vous simplement
          </Text>
          <Text style={tw`text-sm text-gray-500 mb-4 text-center`}>
            Prêt pour votre prochain voyage ?
          </Text>  
          
          {/* Champ de téléphone avec sélecteur de pays */}
          <View style={tw`flex-row border rounded-2xl border-gray-300 mb-6`}>
            {/* Indicatif pays */}
            <TouchableOpacity 
              style={tw`flex-row items-center px-3 py-3 border-r border-gray-300`}
              onPress={openCountryModal}
            >
              <View style={tw`flex-row items-center`}>
                <Text style={tw`text-base mr-1 font-medium`}>
                  {selectedCountry ? (
                    <>
                      {selectedCountry.code === "+221" ? "🇸🇳" : "🇬🇲"} {selectedCountry.code}
                    </>
                  ) : (
                    <>
                      🇸🇳+221
                    </>
                  )}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={16} color="#888" />
            </TouchableOpacity>
            
            {/* Champ numéro de téléphone */}
            <View style={tw`flex-row flex-1 items-center px-3`}>
              <Ionicons name="call-outline" size={20} color="#888" />
              <TextInput
                style={tw`flex-1 ml-2 py-3`}
                placeholder="Numéro de téléphone"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

          </View>
          {error ? <Text style={tw`text-red-500 text-sm `}>{error}</Text> : null}

          
          {/* Bouton de connexion */}
          <TouchableOpacity 
            style={tw`bg-teal-800 py-3 rounded-md items-center`}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={tw`text-white text-xl font-bold`}>
              {loading ? 'Chargement...' : 'Connexion'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Modal pour sélectionner le pays */}
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
          statusBarTranslucent
        >
          <View style={tw`flex-1 justify-end bg-black/50`}>
            <View style={tw`bg-white rounded-t-3xl shadow-xl`}>
              {/* Header */}
              <View style={tw`relative p-4 border-b border-gray-100`}>
                <Text style={tw`text-center text-xl font-bold text-gray-900`}>
                  Sélectionnez votre pays
                </Text>
                <TouchableOpacity 
                  onPress={() => setModalVisible(false)}
                  style={tw`absolute right-4 top-4 p-2 rounded-full active:bg-gray-100`}
                >
                  <Ionicons name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>

              {/* Search bar could be added here */}
              
              {/* Country list */}
              <FlatList
                data={countries}
                renderItem={renderCountryItem}
                keyExtractor={item => item.id}
                style={tw`max-h-[70vh]`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={tw`px-4 py-2`}
                bounces={false}
                initialNumToRender={12}
                maxToRenderPerBatch={10}
                windowSize={10}
              />

              {/* Bottom safe area padding */}
              <View style={tw`h-6 bg-white`} />
            </View>
          </View>
        </Modal>
      </HeaderComponent>
    </LoginProtection>
  );
}