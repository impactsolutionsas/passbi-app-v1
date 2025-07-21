import React from 'react'; 
import { View, Text, TouchableOpacity, ScrollView } from 'react-native'; 
import HeaderComponent from '../../../constants/headerpage/HeaderComponent'; 
import tw from '../../../tailwind'; 
import { Ionicons, MaterialIcons } from '@expo/vector-icons'; 
import { useRouter } from "expo-router";   

export default function LignesTransportScreen() {
    const router = useRouter();
    
    // Données des lignes de bus
    const busLines = [
        { number: '12', from: 'PARCELLES ASSAINIES', to: 'PLACE LECLERC' },
        { number: '43', from: 'PARCELLES ASSAINIES', to: 'PLACE LECLERC' },
        { number: '34', from: 'PARCELLES ASSAINIES', to: 'PLACE LECLERC' },
        { number: '17', from: 'PARCELLES ASSAINIES', to: 'PLACE LECLERC' },
        { number: '11', from: 'PARCELLES ASSAINIES', to: 'PLACE LECLERC' },
        { number: '44', from: 'PARCELLES ASSAINIES', to: 'PLACE LECLERC' },
        { number: '34', from: 'PARCELLES ASSAINIES', to: 'PLACE LECLERC' },
        { number: '34', from: 'PARCELLES ASSAINIES', to: 'PLACE LECLERC' },
        { number: '34', from: 'PARCELLES ASSAINIES', to: 'PLACE LECLERC' },
        { number: '34', from: 'PARCELLES ASSAINIES', to: 'PLACE LECLERC' },
        { number: '34', from: 'PARCELLES ASSAINIES', to: 'PLACE LECLERC' },
    ];
    
    const handleLinePress = (line:any) => {
        console.log(`Ligne ${line.number} sélectionnée`);
        // Naviguer vers les détails de la ligne
    };
    
    return (
        <View style={tw`flex-1 bg-white `}>
            {/* En-tête avec les types de transport */}
            <View style={tw`flex-row justify-between p-4 bg-[#094741] py-2 rounded-b-lg`}>
                <TouchableOpacity style={tw`items-center mt-10`}>
                    <Ionicons name="bus" size={20} color="white" />
                    <Text style={tw`text-white text-xs mt-1`}>BUS TATA</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={tw`items-center mt-10`}>
                    <Ionicons name="bus" size={20} color="white" />
                    <Text style={tw`text-white text-xs mt-1`}>DEM DIKK</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={tw`items-center mt-10`}>
                    <Ionicons name="bus" size={20} color="white" />
                    <Text style={tw`text-white text-xs mt-1`}>BRT</Text>
                </TouchableOpacity>
            </View>
            
            {/* Liste des lignes de bus */}
            <ScrollView style={tw`flex-1`}>
                {busLines.map((line, index) => (
                    <TouchableOpacity 
                        key={index}
                        style={tw`border-b border-gray-200 p-2`}
                        onPress={() => handleLinePress(line)}
                    >
                        <View style={tw`flex-row items-center p-3`}>
                            <View style={tw`w-8 h-8 bg-teal-500 rounded-full items-center justify-center mr-1`}>
                                <Ionicons name="bus-outline" size={16} color="white" />
                            </View>
                            <View style={tw`flex-1`}>
                                <Text style={tw`font-bold text-base`}>Ligne {line.number}</Text>
                                <View style={tw`flex-row items-center mt-1`}>
                                    <Text style={tw`text-xs text-gray-600`}>{line.from}</Text>
                                    <View style={tw`flex-row items-center mx-2`}>
                                        <View style={tw`h-px w-5 bg-teal-500`}></View>
                                        <View style={tw`h-2 w-2 rounded-full bg-teal-500 mx-px`}></View>
                                        <View style={tw`h-px w-5 bg-teal-500`}>
                                            <View>
                                                <Text>Bonjour</Text>
                                            </View>
                                        </View>
                                    </View>
                                    <Text style={tw`text-xs text-gray-600`}>{line.to}</Text>
                                </View>
                            </View>
                            <MaterialIcons name="keyboard-arrow-right" size={24} color="#999" />
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}