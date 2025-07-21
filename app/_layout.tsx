import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import { AppProviders } from "../Provider/AppProvider";
import { useColorScheme } from "@/hooks/useColorScheme";
import { AuthGuard } from "./pages/auth/AuthGuard";
import { SecureNavigation } from "../components/SecureNavigation";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Composant de protection des routes
function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Exception : toujours autoriser l'accès à l'inscription et à la vérification OTP
  const isAuthPage =
    pathname === "/pages/auth/register" ||
    pathname === "/pages/auth/verificationCode";

  // Si on n'est pas authentifié et qu'on n'est pas sur une page publique, rediriger vers login
  // (à adapter selon ta logique d'authentification globale)
  // if (!isAuthenticated && !isAuthPage) {
  //   router.replace("/pages/auth/login");
  //   return null;
  // }

  if (!loaded) {
    return null;
  }

  console.log('Layout rendu, pathname:', pathname);

  return (
    <AppProviders>
      <ThemeProvider value={DefaultTheme}>
        <SecureNavigation>
          <Stack>
            {/* Routes publiques (pas de protection) */}
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="pages/auth/login" options={{ headerShown: false }} />
            <Stack.Screen name="pages/auth/register" options={{ headerShown: false }} />
            <Stack.Screen name="pages/auth/verificationCode" options={{ headerShown: false }} />

            {/* Routes protégées (nécessitent une authentification) */}
            <Stack.Screen
              name="pages/home/accueil"
              options={{
                headerShown: false,
                gestureEnabled: false, // Désactiver le geste de retour
              }}
            />
            <Stack.Screen
              name="pages/home/TransportFilterComponent"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="pages/home/mestickets"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="pages/home/composant/types"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="pages/home/composant/help"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="pages/home/composant/utils"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="pages/home/composant/TransportUrbain"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="pages/views/TicketView"
              options={{
                headerShown: true,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="pages/views/componentsTicket/TicketQRCode"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="pages/views/componentsTicket/TicketDetails"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="pages/views/componentsTicket/ActionButtons"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="pages/models/OperatorModel"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="pages/models/TicketModel"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="pages/models/typesTicket"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="pages/models/UserModel"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="pages/controllers/TicketControllers"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="pages/home/composant/InterUrbainSearchForm"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="pages/Reservation/RechercheTrajet/types"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="pages/Reservation/RechercheTrajet/utils"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="pages/Reservation/RechercheTrajet/components"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="pages/Reservation/RechercheTrajet/resultsearch"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="pages/Reservation/infotrajet"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="pages/Reservation/detailReserve"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="pages/Reservation/reservationBRT"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="pages/Reservation/reservationDDK"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="pages/Reservation/reservationTER"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="pages/Paiement/paiement"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="pages/Paiement/paiementUrbain/paiement"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="pages/TicketPage/ticketpages"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="pages/TicketPage/TicketPageUrbain/ticketpages"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="pages/profil/Profil"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="pages/profil/formUpdateUser"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />

            <Stack.Screen
              name="pages/payment-status/[status]"
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />

            <Stack.Screen name="+not-found" />
          </Stack>
        </SecureNavigation>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AppProviders>
  );
}
