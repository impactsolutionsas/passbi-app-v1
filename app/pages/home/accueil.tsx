// screens/HomeScreen.tsx - Version optimisée pour éviter les rechargements

import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { View, RefreshControl, SafeAreaView, Platform, Dimensions, BackHandler } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import tw from "../../../tailwind";
import HeaderComponent from "../../../constants/headerpage/HeaderComponent";
import DynamicCarousel from "../../../components/Carrousel";
import { searchTickets, getToken, getUser, getDemDikk } from "../../../services/api/api";
import CustomToast from "../../../components/Toast/CustomToast";
import { ToastRefType } from "../home/composant/types";
import { useTranslation } from "react-i18next";
import { useOperators } from "@/constants/contexte/OperatorContext";
import { ProtectedRouteGuard } from "../../../components/ProtectedRouteGuard";
import { useAuth } from "../../../Provider/AppProvider";
import CustomTabBar from "../../../constants/CustomTabBar";


// Import du nouveau composanta
import TransportFilterComponent from "../home/TransportFilterComponent";
import HowItWorks from "../home/composant/help";

// Define valid route types that match the expected types in your app
type AppRoutes = any; // Permettre toutes les routes pour éviter les erreurs TypeScript

// Interface pour les données utilisateur
interface UserData {
  id: string;
  firstName: string;
  name: string;
  email: string | null;
  photoUrl: string | null;
  role: string;
  createdAt: string;
  idNumber: string | null;
  pieceType: string | null;
}

interface UserResponse {
  data: {
    id: string;
    notifications: string;
    preferredPayment: string;
    user: UserData;
    userId: string;
  };
  message: string;
  status: number;
}

// Cache intelligent pour les données utilisateur partagé avec ProfileScreen
class UserCache {
  private static instance: UserCache;
  private userData: UserData | null = null;
  private userFullName: string | null = null;
  private lastFetchTime: number = 0;
  private currentToken: string | null = null; // ✅ Ajout du token actuel
  private readonly CACHE_DURATION = 2 * 60 * 1000; // 5 minutes
  private isFetching: boolean = false;
  private fetchPromise: Promise<string | null> | null = null;

  static getInstance(): UserCache {
    if (!UserCache.instance) {
      UserCache.instance = new UserCache();
    }
    return UserCache.instance;
  }

  async isValid(): Promise<boolean> {
    if (!this.userData || !this.userFullName) {
      return false;
    }

    // Vérifier si le cache n'a pas expiré
    if (Date.now() - this.lastFetchTime >= this.CACHE_DURATION) {
      return false;
    }

    // ✅ CRUCIAL: Vérifier si le token a changé
    try {
      const currentToken = await getToken();
      if (currentToken !== this.currentToken) {
        console.log("Token différent détecté, invalidation du cache");
        this.clear();
        return false;
      }
    } catch (error) {
      console.error("Erreur lors de la vérification du token:", error);
      return false;
    }

    return true;
  }

  async getUserName(): Promise<string | null> {
    const isValid = await this.isValid();
    return isValid ? this.userFullName : null;
  }

  async getUserData(): Promise<UserData | null> {
    const isValid = await this.isValid();
    return isValid ? this.userData : null;
  }

  async fetchUserName(forceRefresh: boolean = false): Promise<string | null> {
    // Si les données sont valides et qu'on ne force pas le refresh
    if (!forceRefresh && (await this.isValid())) {
      console.log("Nom utilisateur récupéré depuis le cache:", this.userFullName);
      return this.userFullName;
    }

    // Si un fetch est déjà en cours, attendre sa résolution
    if (this.isFetching && this.fetchPromise) {
      console.log("Fetch en cours, attente...");
      return this.fetchPromise;
    }

    // Commencer un nouveau fetch
    this.isFetching = true;
    this.fetchPromise = this.performFetch();

    try {
      const result = await this.fetchPromise;
      return result;
    } finally {
      this.isFetching = false;
      this.fetchPromise = null;
    }
  }

  private async performFetch(): Promise<string | null> {
    try {
      console.log("Récupération des données utilisateur depuis l'API...");

      const currentToken = await getToken();
      console.log("[DEBUG] Token récupéré avant getUser (accueil):", currentToken);
      if (!currentToken) {
        console.log("Aucun token disponible");
        return "Utilisateur";
      }

      // ✅ Stocker le token actuel
      this.currentToken = currentToken;

      const userResponse: UserResponse = await getUser(currentToken);

      if (userResponse && userResponse.data && userResponse.data.user) {
        const { firstName, name } = userResponse.data.user;

        // Stocker les données complètes
        this.userData = userResponse.data.user;

        // Calculer le nom complet
        const cleanFirstName = firstName?.trim() || "";
        const cleanLastName = name?.trim() || "";

        let fullName = "";
        if (cleanFirstName && cleanLastName) {
          fullName = `${cleanFirstName} ${cleanLastName}`;
        } else if (cleanFirstName) {
          fullName = cleanFirstName;
        } else if (cleanLastName) {
          fullName = cleanLastName;
        } else {
          fullName = "Utilisateur";
        }

        this.userFullName = fullName;
        this.lastFetchTime = Date.now();

        console.log("Données utilisateur mises à jour dans le cache:", fullName);
        return fullName;
      } else {
        console.warn("Structure de réponse utilisateur inattendue");
        this.userFullName = "Utilisateur";
        this.lastFetchTime = Date.now();
        return "Utilisateur";
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des données utilisateur:", error);
      // En cas d'erreur, retourner une valeur par défaut sans mettre à jour le cache
      return this.userFullName || "Utilisateur";
    }
  }

  clear(): void {
    this.userData = null;
    this.userFullName = null;
    this.lastFetchTime = 0;
    this.currentToken = null;
    this.isFetching = false;
    this.fetchPromise = null;
    console.log("Cache utilisateur nettoyé");
  }

  invalidate(): void {
    this.lastFetchTime = 0;
    console.log("Cache utilisateur invalidé");
  }

  // Méthode pour synchroniser avec les mises à jour du profil
  updateUserData(userData: UserData): void {
    this.userData = userData;

    const { firstName, name } = userData;
    const cleanFirstName = firstName?.trim() || "";
    const cleanLastName = name?.trim() || "";

    let fullName = "";
    if (cleanFirstName && cleanLastName) {
      fullName = `${cleanFirstName} ${cleanLastName}`;
    } else if (cleanFirstName) {
      fullName = cleanFirstName;
    } else if (cleanLastName) {
      fullName = cleanLastName;
    } else {
      fullName = "Utilisateur";
    }

    this.userFullName = fullName;
    this.lastFetchTime = Date.now();

    console.log("Données utilisateur mises à jour manuellement:", fullName);
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const toastRef = useRef<ToastRefType>(null);
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // États pour les données utilisateur - simplifiés
  const [userName, setUserName] = useState<string>("..");
  const [isLoadingUser, setIsLoadingUser] = useState(false);

  // États pour la gestion des focus - optimisés
  const [isInitialized, setIsInitialized] = useState(false);

  const { t } = useTranslation();

  // Cache utilisateur
  const userCache = useRef<UserCache>(UserCache.getInstance());

  // Utiliser le contexte des opérateurs
  const {
    operators,
    loading: operatorsLoading,
    error: operatorsError,
    refreshOperators,
    isInitialized: operatorsInitialized,
  } = useOperators();


  // ✅ Améliorez la logique de détermination de l'état de chargement
  const isTransportLoading = useMemo(() => {
    // Si les opérateurs sont explicitement en cours de chargement
    if (operatorsLoading) {
      return true;
    }

    // Si on n'est pas encore initialisé ET qu'on n'a pas d'opérateurs
    if (!operatorsInitialized && operators.length === 0) {
      return true;
    }

    return false;
  }, [operatorsLoading, operatorsInitialized, operators.length]);

  // ✅ Ajoutez un effet pour déboguer l'état des opérateurs
  useEffect(() => {
    console.log("HomeScreen - État des opérateurs:", {
      operatorsLoading,
      operatorsInitialized,
      operatorsCount: operators.length,
      isTransportLoading,
      operatorsError,
    });
  }, [
    operatorsLoading,
    operatorsInitialized,
    operators.length,
    isTransportLoading,
    operatorsError,
  ]);

useFocusEffect(
  React.useCallback(() => {
    const onBackPress = () => {
      BackHandler.exitApp();
      return true;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => backHandler.remove();
  }, [])
);

  // Gestion de la recherche de tickets InterUrbain - VERSION OPTIMISÉE
  const handleSearchTickets = async (formData: {
    depart: string;
    arrival: string;
    selectedDate: string;
    personCount: number;
  }) => {
    const { depart, arrival, selectedDate, personCount } = formData;

    if (!depart || !arrival || !selectedDate) {
      toastRef.current?.show("Erreur", "Veuillez remplir tous les champs requis", "error");
      return;
    }

    try {
      setIsLoading(true);

      const currentToken = await getToken();
      console.log("Token récupéré dans la page d'accueil:", currentToken);

      const ticketsData = await searchTickets(depart, arrival, selectedDate, personCount);
      console.log("Bus trouvés:", ticketsData);

      if (!ticketsData || ticketsData.length === 0) {
        toastRef.current?.show(
          "Aucun bus disponible",
          "Aucun bus n'a été trouvé pour ce trajet à la date sélectionnée.",
          "info"
        );
        return;
      }

      router.push({
        pathname: "/pages/Reservation/RechercheTrajet/resultsearch" as any,
        params: {
          departure: depart,
          destination: arrival,
          date: selectedDate,
          seat: personCount,
          searchResults: JSON.stringify(ticketsData),
        },
      });
    } catch (error) {
      toastRef.current?.show("Erreur", "Aucun trajet actif trouvé pour cette date", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Modifiez la gestion des options de transport pour être plus robuste
  const handleTransportOptionPress = async (option: string, operatorId?: string) => {
    console.log(`Option sélectionnée: ${option}, ID Opérateur: ${operatorId || "non disponible"}`);

    // Si pas d'operatorId, essayer de naviguer quand même avec une logique de fallback
    if (!operatorId) {
      // Essayer de trouver l'opérateur dans la liste actuelle
      const foundOperator = operators.find((op) => {
        if (!op.operator?.name) return false;
        const operatorName = op.operator.name.toLowerCase();
        return (
          operatorName.includes(option.toLowerCase()) || option.toLowerCase().includes(operatorName)
        );
      });

      if (foundOperator?.operator?.id) {
        console.log(`Opérateur trouvé pour ${option}:`, foundOperator.operator.id);
        operatorId = foundOperator.operator.id;
      } else {
        // Si toujours pas d'opérateur, permettre quand même la navigation
        // La page de destination gèrera l'absence d'operatorId
        console.log(`Pas d'opérateur trouvé pour ${option}, navigation sans operatorId`);

        // Optionnel : essayer un refresh si les opérateurs ne sont pas chargés
        if (operators.length === 0 && !operatorsLoading) {
          console.log("Tentative de rechargement des opérateurs...");
          try {
            await refreshOperators();
            // Réessayer après le refresh
            const retryOperator = operators.find((op) => {
              if (!op.operator?.name) return false;
              const operatorName = op.operator.name.toLowerCase();
              return operatorName.includes(option.toLowerCase());
            });

            if (retryOperator?.operator?.id) {
              operatorId = retryOperator.operator.id;
              console.log(`Opérateur trouvé après refresh: ${operatorId}`);
            }
          } catch (error) {
            console.error("Erreur lors du rechargement:", error);
          }
        }
      }
    }

    // Navigation vers la page appropriée
    let destinationPage: AppRoutes;

    switch (option) {
      case "BRT":
        destinationPage = "/pages/Reservation/reservationBRT";
        break;
      case "TER":
        destinationPage = "/pages/Reservation/reservationTER";
        break;
      case "DEM DIKK":
        destinationPage = "/pages/Reservation/reservationDDK";
        break;
      default:
        destinationPage = "/pages/Reservation/reservationBRT";
    }

    // Préparer les paramètres de navigation
    const navParams: any = {
      transportType: option,
    };

    if (operatorId) {
      navParams.operatorId = operatorId;

      // Trouver le nom de l'opérateur si disponible
      const operatorData = operators.find((op) => op.operator?.id === operatorId);
      if (operatorData?.operator?.name) {
        navParams.operatorName = operatorData.operator.name;
      }
    }

    console.log("Navigation vers:", destinationPage, "avec params:", navParams);

    try {
      router.push({
        pathname: destinationPage as any,
        params: navParams,
      });
    } catch (error) {
      console.error("Erreur de navigation:", error);
      toastRef.current?.show(
        "Erreur",
        "Impossible d'accéder à ce service pour le moment.",
        "error"
      );
    }
  };

  // Callback pour le rafraîchissement manuel (optimisé)
  const handleManualRefresh = useCallback(async () => {
    if (operatorsLoading) {
      console.log("Rafraîchissement déjà en cours, ignoré...");
      return;
    }

    try {
      console.log("Rafraîchissement manuel...");

      // Rafraîchir les opérateurs
      await refreshOperators();

      // Rafraîchir le nom utilisateur en arrière-plan
      userCache.current
        .fetchUserName(true)
        .then((name) => {
          if (name) {
            setUserName(name);
          }
        })
        .catch((error) => {
          console.error("Erreur lors du rafraîchissement du nom utilisateur:", error);
        });

      // Feedback utilisateur
      setTimeout(() => {
        if (operators.length > 0) {
          toastRef.current?.show("Succès", "Données mises à jour avec succès!", "success");
        }
      }, 500);
    } catch (error) {
      console.error("Erreur lors du rafraîchissement manuel:", error);
      toastRef.current?.show("Erreur", "Impossible de mettre à jour les données.", "error");
    }
  }, [operatorsLoading, refreshOperators, operators.length]);

  // Fonction pour nettoyer le cache lors de la déconnexion (à exposer si nécessaire)
  const clearUserCache = useCallback(() => {
    userCache.current.clear();
    setUserName("..");
  }, []);

  // ✅ Effet pour charger le nom utilisateur au démarrage
  useEffect(() => {
    const loadUserName = async () => {
      setIsLoadingUser(true);
      try {
        const cachedName = await userCache.current.fetchUserName();
        if (cachedName) {
          setUserName(cachedName);
        }
      } catch (error) {
        console.error("Erreur lors du chargement du nom utilisateur:", error);
      } finally {
        setIsLoadingUser(false);
      }
    };

    // Test de la fonction getDemDikk
    const testGetDemDikk = async () => {
      try {
        console.log("🔍 Test de getDemDikk dans accueil.tsx...");
        const demDikkData = await getDemDikk();
        console.log("✅ Résultat de getDemDikk:", demDikkData);
      } catch (error) {
        console.error("❌ Erreur lors de l'appel à getDemDikk:", error);
      }
    };

    loadUserName();
    testGetDemDikk(); // Appel de test
  }, []);

  // ✅ Gestion du focus de l'écran pour rafraîchir les données si nécessaire
  useFocusEffect(
    useCallback(() => {
      // Vérifier si le cache utilisateur est encore valide
      userCache.current.isValid().then((isValid) => {
        if (!isValid) {
          userCache.current.fetchUserName().then((name) => {
            if (name && name !== userName) {
              setUserName(name);
            }
          });
        }
      });
    }, [userName])
  );

  // Protection directe : rediriger vers login si pas authentifié
  // useEffect(() => {
  //   if (!isAuthenticated) {
  //     console.log("🚫 Accès refusé à la page d'accueil - redirection vers login");
  //     router.replace("/pages/auth/login" as any);
  //   }
  // }, [isAuthenticated, router]);

  // Si pas authentifié, ne rien afficher
  if (!isAuthenticated) {
    return null;
  }

  const homeImages = [
    { id: "1", image: require("../../../assets/images/pub.png") },
    { id: "2", image: require("../../../assets/images/pub.png") },
    { id: "3", image: require("../../../assets/images/TER.png") },
  ];
  return (
    <ProtectedRouteGuard>
      <SafeAreaView style={tw`flex-1 bg-white pb-20`}>
        {/* Contenu principal */}
        <View style={tw`flex-1`}>
          <HeaderComponent showGreeting={true} userName={userName}>
            <View>
              <TransportFilterComponent
                onOptionPress={handleTransportOptionPress}
                operators={operators}
                isTransportLoading={isTransportLoading}
                onRefresh={handleManualRefresh}
                onSearch={handleSearchTickets}
                isSearchLoading={isLoading}
              />

              <DynamicCarousel
                customImages={homeImages}
                autoScrollInterval={4000}
                height="h-32"
                activeDotColor="bg-green-600"
              />

              <HowItWorks />

              <CustomToast ref={toastRef} />

              {/* Ajoute un padding pour ne pas masquer le contenu */}
              <View style={tw`h-20`} />
            </View>
          </HeaderComponent>
        </View>

        {/* ✅ Barre flottante avec espace bas */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "white",
            paddingBottom: Platform.OS === "android" ? 1 : 0,
            zIndex: 999,
          }}
        >
          <CustomTabBar />
        </View>
      </SafeAreaView>
    </ProtectedRouteGuard>
  );

}