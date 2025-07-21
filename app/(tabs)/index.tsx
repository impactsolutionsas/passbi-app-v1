import { useEffect, useRef, useState } from "react";
import {
  View,
  Animated,
  Easing,
  Text,
  Image,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Link, useRouter } from "expo-router";
import tw from "../../tailwind";

export default function SplashComponent() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [isLoading, setIsLoading] = useState(true);

  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();

  // Fonction utilitaire pour animer et naviguer
  const animateAndNavigate = (route: any, delay: number = 1000) => {
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        router.replace(route);
      });
    }, delay);
  };

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem("authToken");
      if (token) {
        animateAndNavigate("../pages/home/accueil", 1000);
      } else {
        animateAndNavigate("../pages/auth/login", 1000);
      }
    } catch (error) {
      console.error("Erreur lors de la vérification du token:", error);
      animateAndNavigate("../pages/auth/login", 1000);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <Animated.View style={[tw`flex-1`, { opacity: fadeAnim }]}>
      <Image
        source={require("@/assets/images/splash-screen.png")}
        style={{
          maxWidth: SCREEN_WIDTH,
          width: "100%",
          maxHeight: SCREEN_HEIGHT,
          height: "100%",
        }}
      />

      <View style={tw`absolute bottom-5 w-full items-center justify-center`}>
        <View style={tw`flex-row gap-3 mb-2`}>
          <Link href="https://www.facebook.com/" target="_blank">
            <Image width={22} height={22} source={require("@/assets/images/so/fac.png")} />
          </Link>
          <Link href="https://x.com/" target="_blank">
            <Image width={22} height={22} source={require("@/assets/images/so/x.png")} />
          </Link>
          <Link href="https://www.instagram.com/" target="_blank">
            <Image width={22} height={22} source={require("@/assets/images/so/ins.png")} />
          </Link>
          <Link href="https://www.linkedin.com/" target="_blank">
            <Image width={22} height={22} source={require("@/assets/images/so/lin.png")} />
          </Link>
        </View>

        {isLoading && <ActivityIndicator size="small" color="#66686B" />}
      </View>
    </Animated.View>
  );
}
