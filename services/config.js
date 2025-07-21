import Constants from "expo-constants";

export const API_URL =
  Constants.expoConfig?.extra?.API_URL ||
  "https://passbibackendv1.onrender.com/api";
