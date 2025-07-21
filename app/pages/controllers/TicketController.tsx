import { TicketModel } from '../models/TicketModel';
import { UserModel } from '../models/UserModel';
import { OperatorModel } from '../models/OperatorModel';
import { TicketData, RouteParams } from '../models/typesTicket';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';
import { captureRef } from 'react-native-view-shot';

export class TicketController {
  private ticketModel: TicketModel;
  private userModel: UserModel;
  private operatorModel: OperatorModel;
  private operatorType: string = "";
  private qrCodeData: string = "";

  constructor() {
    this.ticketModel = new TicketModel();
    this.userModel = new UserModel();
    this.operatorModel = new OperatorModel();
  }

  async initializeTicket(params: RouteParams): Promise<{
    loading: boolean;
    error: string | null;
    ticketData: TicketData;
    qrCodeData: string;
    operatorType: string;
  }> {
    try {
      // Récupérer les données utilisateur
      await this.userModel.fetchUserData();

      // Déterminer le type d'opérateur
      this.operatorType = params.operatorType || "";
      
      // Traiter les données du ticket en fonction du type d'opérateur
      if (this.operatorType === "BRT") {
        this.processBRTTicket(params);
      } else if (this.operatorType === "TER") {
        this.processTERTicket(params);
      } else if (this.operatorType === "DemDikk") {
        this.processDemDikkTicket(params);
      } else {
        throw new Error("Type d'opérateur non reconnu");
      }

      // Générer les données du QR code
      this.qrCodeData = this.ticketModel.generateQRCodeData();

      return {
        loading: false,
        error: null,
        ticketData: this.ticketModel.getTicketData(),
        qrCodeData: this.qrCodeData,
        operatorType: this.operatorType
      };
    } catch (err: any) {
      return {
        loading: false,
        error: err?.message || "Erreur lors de l'initialisation du ticket",
        ticketData: this.ticketModel.getTicketData(),
        qrCodeData: "",
        operatorType: ""
      };
    }
  }

  getOperatorColors() {
    return this.operatorModel.getOperatorColors(this.operatorType);
  }

  private processBRTTicket(params: RouteParams): void {
    // Simuler la réponse de paiement
    const paymentResponse = {
      data: {
        amount: parseInt(params.amount || "500"),
        destinationStation: params.destinationStation || params.destination || "",
        code: params.code || "92e29c92-1c99-436b-ba8c-706cef26e78a",
        createdAt: new Date().toISOString(),
        departureStation: params.departureStation || params.departure || "",
        expiresAt: params.expiresAt || new Date(Date.now() + 3600000).toISOString(),
        feeDetails: {
          baseAmount: parseInt(params.amount || "500"),
          finalAmount: (parseInt(params.amount || "500")) * 0.95,
          operatorCommission: 5,
          operatorCommissionAmount: (parseInt(params.amount || "500")) * 0.05,
          passengerCommission: 0,
          passengerCommissionAmount: 0,
          totalAmount: parseInt(params.amount || "500"),
          totalFees: (parseInt(params.amount || "500")) * 0.05
        },
        fees: (parseInt(params.amount || "500")) * 0.05,
        finalAmount: (parseInt(params.amount || "520")) * 0.95,
        id: params.id || "eddcbd48-9255-4971-a94b-04bf5b7bea83",
        nbZones: 0,
        operatorName: params.operatorName || "Bus Rapid Transit",
        pendingExpiresAt: null,
        status: "Valid",
        ticketCount: parseInt(params.ticketCount || "1"),
        totalAmount: parseInt(params.amount || "520"),
        validatedAt: new Date().toISOString(),
        zone: params.zoneName,
        zoneType: params.zoneName || "DIFFERENT_ZONES"
      },
      message: "Ticket confirmé et payé avec succès",
      status: 200
    };

    const formattedDateStr = this.ticketModel.formatDate(paymentResponse.data.createdAt);
    const formattedTimeStr = this.ticketModel.formatTime(paymentResponse.data.createdAt);
    const expiresTimeStr = this.ticketModel.formatTime(paymentResponse.data.expiresAt);

    // Mettre à jour les données du ticket
    this.ticketModel.setTicketData({
      departure: paymentResponse.data.departureStation,
      destination: paymentResponse.data.destinationStation,
      departureDate: formattedDateStr,
      departureTime: formattedTimeStr,
      ticketCode: paymentResponse.data.code,
      price: `${paymentResponse.data.amount} FCFA`,
      expiresAt: expiresTimeStr,
      validatedAt: paymentResponse.data.validatedAt,
      operatorName: paymentResponse.data.operatorName,
      transportType: "BRT",
      zone: paymentResponse.data.zone || "",
      classeType: ""
    });
  }

  private processTERTicket(params: RouteParams): void {
    // Simuler la réponse de paiement
    const paymentResponse = {
      data: {
        amount: parseInt(params.amount || "2500"),
        destinationStation: params.destinationStation || params.destination || "Diamniadio",
        classeType: params.classe === "Classe_1" ? 1 : 2,
        code: params.code || "e87d69ba-6b1d-464b-8e72-50cbc244540b",
        createdAt: new Date().toISOString(),
        departureStation: params.departureStation || params.departure || "Dakar",
        expiresAt: params.expiresAt || new Date(Date.now() + 7200000).toISOString(),
        feeDetails: {
          baseAmount: parseInt(params.amount || "2500"),
          finalAmount: (parseInt(params.amount || "2500")) * 0.95,
          operatorCommission: 5,
          operatorCommissionAmount: (parseInt(params.amount || "2500")) * 0.05,
          passengerCommission: 5,
          passengerCommissionAmount: (parseInt(params.amount || "2500")) * 0.05,
          totalAmount: parseInt(params.amount || "2500") * 1.05,
          totalFees: (parseInt(params.amount || "2500")) * 0.1
        },
        fees: (parseInt(params.amount || "2500")) * 0.1,
        finalAmount: (parseInt(params.amount || "2500")) * 0.95,
        id: params.id || "426e9aae-7d0e-4c4c-aeff-ee9dd488b6d6",
        nbZones: 0,
        operatorName: params.operatorName || "TER Senegal",
        pendingExpiresAt: null,
        status: "Valid",
        ticketCount: parseInt(params.ticketCount || "1"),
        totalAmount: parseInt(params.amount || "2500") * 1.05,
        validatedAt: new Date().toISOString(),
        zone: params.zone,
        zoneType: params.zone || "SAME_ZONE"
      },
      message: "Ticket confirmé et payé avec succès",
      status: 200
    };

    const formattedDateStr = this.ticketModel.formatDate(paymentResponse.data.createdAt);
    const formattedTimeStr = this.ticketModel.formatTime(paymentResponse.data.createdAt);
    const expiresTimeStr = this.ticketModel.formatTime(paymentResponse.data.expiresAt);

    // Déterminer la classe
    const classeDisplay = paymentResponse.data.classeType === 1 ? "Classe 1" : "Classe 2";

    // Mettre à jour les données du ticket
    this.ticketModel.setTicketData({
      departure: paymentResponse.data.departureStation,
      destination: paymentResponse.data.destinationStation,
      departureDate: formattedDateStr,
      departureTime: formattedTimeStr,
      ticketCode: paymentResponse.data.code,
      price: `${paymentResponse.data.amount} FCFA`,
      expiresAt: expiresTimeStr,
      validatedAt: paymentResponse.data.validatedAt,
      operatorName: paymentResponse.data.operatorName,
      transportType: "TER",
      zone: paymentResponse.data.zone || "",
      classeType: classeDisplay
    });
  }

  private processDemDikkTicket(params: RouteParams): void {
    // Simuler la réponse de paiement
    const paymentResponse = {
      data: {
        amount: parseInt(params.amount || "300"),
        destinationStation: params.destinationStation || params.destination || "Destination",
        code: params.code || "dd78b3a2-9e74-4a91-8f23-c7d5e62a0e9c",
        createdAt: new Date().toISOString(),
        departureStation: params.departureStation || params.departure || "Départ",
        expiresAt: params.expiresAt || new Date(Date.now() + 14400000).toISOString(), // 4 heures par défaut
        feeDetails: {
          baseAmount: parseInt(params.amount || "300"),
          finalAmount: (parseInt(params.amount || "300")) * 0.95,
          operatorCommission: 5,
          operatorCommissionAmount: (parseInt(params.amount || "300")) * 0.05,
          passengerCommission: 0,
          passengerCommissionAmount: 0,
          totalAmount: parseInt(params.amount || "300"),
          totalFees: (parseInt(params.amount || "300")) * 0.05
        },
        fees: (parseInt(params.amount || "300")) * 0.05,
        finalAmount: (parseInt(params.amount || "300")) * 0.95,
        id: params.id || "56bc9e12-43f5-4832-b8a1-9df76c53e8a7",
        operatorName: params.operatorName || "Dem Dikk",
        pendingExpiresAt: null,
        status: "Valid",
        ticketCount: parseInt(params.ticketCount || "1"),
        totalAmount: parseInt(params.amount || "300"),
        validatedAt: new Date().toISOString(),
        lineNumber: params.lineNumber || "13",
        lineName: params.lineName || "Parcelles Assainies - Centre Ville",
        validityDuration: params.validityDuration || "4 heures"
      },
      message: "Ticket confirmé et payé avec succès",
      status: 200
    };

    const formattedDateStr = this.ticketModel.formatDate(paymentResponse.data.createdAt);
    const formattedTimeStr = this.ticketModel.formatTime(paymentResponse.data.createdAt);
    const expiresTimeStr = this.ticketModel.formatTime(paymentResponse.data.expiresAt);

    // Mettre à jour les données du ticket
    this.ticketModel.setTicketData({
      departure: paymentResponse.data.departureStation,
      destination: paymentResponse.data.destinationStation,
      departureDate: formattedDateStr,
      departureTime: formattedTimeStr,
      ticketCode: paymentResponse.data.code,
      price: `${paymentResponse.data.amount} FCFA`,
      expiresAt: expiresTimeStr,
      validatedAt: paymentResponse.data.validatedAt,
      operatorName: paymentResponse.data.operatorName,
      transportType: "DemDikk",
      zone: "",
      classeType: "",
      lineNumber: paymentResponse.data.lineNumber,
      lineName: paymentResponse.data.lineName,
      validityDuration: paymentResponse.data.validityDuration
    });
  }

  async downloadTicket(ticketRef: any): Promise<void> {
    try {
      if (!ticketRef.current) {
        throw new Error("Impossible de capturer l'image du ticket");
      }

      const uri = await captureRef(ticketRef, {
        format: 'png',
        quality: 1,
      });

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error("Veuillez autoriser l'accès à votre galerie");
      }

      const asset = await MediaLibrary.createAssetAsync(uri);
      const transportType = this.ticketModel.getTicketData().transportType;
      await MediaLibrary.createAlbumAsync(`${transportType} Tickets`, asset, false);

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('download-channel', {
          name: 'Téléchargements',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "📥 Ticket téléchargé !",
          body: "Touchez ici pour voir l'image.",
          data: { imageUri: asset.uri },
          sound: true,
        },
        trigger: null,
      });

      Alert.alert("Succès", "Ticket téléchargé avec succès !");
    } catch (error: any) {
      Alert.alert("Erreur", error.message || "Échec du téléchargement du ticket");
      throw error;
    }
  }

  async shareTicket(ticketRef: any): Promise<void> {
    try {
      if (!ticketRef.current) {
        throw new Error("Impossible de capturer l'image du ticket");
      }

      const uri = await captureRef(ticketRef, {
        format: 'png',
        quality: 1,
      });
      const isAvailable = await Sharing.isAvailableAsync();
      const transportType = this.ticketModel.getTicketData().transportType;

      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `Partagez votre ticket ${transportType}`,
          UTI: 'public.png'
        });
      } else {
        const { status } = await MediaLibrary.requestPermissionsAsync();

        if (status === 'granted') {
          const asset = await MediaLibrary.createAssetAsync(uri);
          await MediaLibrary.createAlbumAsync(`${transportType} Tickets`, asset, false);
          Alert.alert("Succès", "Ticket enregistré dans votre galerie");
        } else {
          throw new Error("Permission de stockage refusée");
        }
      }
    } catch (error: any) {
      Alert.alert("Erreur", error.message || "Impossible de partager le ticket");
      throw error;
    }
  }
}