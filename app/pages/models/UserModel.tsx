import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUser, setToken, getToken } from '../../../services/api/api';
import { UserData } from './typesTicket';

export class UserModel {
  private userData: UserData | null = null;
  private phoneNumber: string = "";

  async fetchUserData(): Promise<{ userData: UserData | null, phoneNumber: string }> {
    try {
      // Récupérer le téléphone depuis AsyncStorage
      const storedPhone = await AsyncStorage.getItem('phone');
      if (storedPhone) {
        this.phoneNumber = storedPhone;
      }

      // Récupérer et définir le token
      const currentToken = await getToken();
      if (currentToken) {
        setToken(currentToken);

        // Récupérer les informations utilisateur
        const userData = await getUser(currentToken);
        if (userData) {
          this.userData = userData;
        }
      }

      return {
        userData: this.userData,
        phoneNumber: this.phoneNumber
      };
    } catch (err: any) {
      throw new Error(err?.message || "Erreur lors de la récupération des données utilisateur");
    }
  }

  getUserData(): UserData | null {
    return this.userData;
  }

  getPhoneNumber(): string {
    return this.phoneNumber;
  }
}