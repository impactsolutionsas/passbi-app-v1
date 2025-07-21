import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, Dimensions, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useTranslation } from "react-i18next";

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface TabItem {
  id: string;
  label: string;
  icon: IoniconsName;
  activeIcon: IoniconsName;
  route: any;
  routePattern: string;
}

export default function CustomTabBar() {
  const router = useRouter();
  const { t } = useTranslation();
  const currentPath = usePathname();
  const [activeTab, setActiveTab] = useState('search');
  const insets = useSafeAreaInsets();

  const [screenData, setScreenData] = useState(Dimensions.get('window'));

  useEffect(() => {
    const onChange = ({ window }) => {
      setScreenData(window);
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  const isSmallScreen = screenData.width < 375;
  const isTablet = screenData.width > 768;

  const BASE_HEIGHT = isTablet ? 80 : isSmallScreen ? 60 : 70;
  const ICON_SIZE = isTablet ? 26 : isSmallScreen ? 20 : 22;
  const FONT_SIZE = isTablet ? 14 : isSmallScreen ? 10 : 12;

  const tabs: TabItem[] = [
    {
      id: 'search',
      label: 'Rechercher',
      icon: 'search-outline',
      activeIcon: 'search',
      route: '../../pages/home/accueil',
      routePattern: '/pages/home/accueil'
    },
    {
      id: 'tickets',
      label: 'Mes Tickets',
      icon: 'ticket-outline',
      activeIcon: 'ticket',
      route: '../../pages/home/mestickets',
      routePattern: '/pages/home/mestickets',
    },
    {
      id: 'profile',
      label: 'Profil',
      icon: 'person-outline',
      activeIcon: 'person',
      route: '../../pages/profil/Profil',
      routePattern: '/pages/profil/Profil'
    }
  ];

  useEffect(() => {
    const matchedTab = tabs.find(tab => currentPath.includes(tab.routePattern));
    if (matchedTab && matchedTab.id !== activeTab) {
      setActiveTab(matchedTab.id);
    }
  }, [currentPath, activeTab]);

  const handleTabPress = (tab: TabItem) => {
    setActiveTab(tab.id);
    router.push(tab.route);
  };

  return (
    <>
      <SafeAreaView
        pointerEvents="box-none"
        edges={[]} // 👈 important
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: insets.bottom,
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#e2e8f0",
          zIndex: 100,
          ...Platform.select({
            ios: {
              shadowColor: 'transparent',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0,
              shadowRadius: 0,
            },
            android: {
              elevation: 0,
            },
          }),
        }}
      >
        <View
          style={{
            height: BASE_HEIGHT,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-around",
            paddingHorizontal: isSmallScreen ? 8 : 16,
            paddingTop: isSmallScreen ? 8 : 12,
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  paddingHorizontal: isSmallScreen ? 2 : 4,
                  minHeight: 44,
                }}
                onPress={() => handleTabPress(tab)}
                activeOpacity={0.7}
              >
                <View
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  {isActive && (
                    <View
                      style={{
                        position: 'absolute',
                        top: -6,
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: '#0D9488',
                      }}
                    />
                  )}
                  <View
                    style={{
                      padding: isSmallScreen ? 6 : 8,
                      borderRadius: 12,
                      backgroundColor: isActive ? '#F0FDFA' : 'transparent',
                      marginBottom: 2,
                    }}
                  >
                    <Ionicons
                      name={isActive ? tab.activeIcon : tab.icon}
                      size={ICON_SIZE}
                      color={isActive ? "#0D9488" : "#94A3B8"}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: FONT_SIZE,
                      color: isActive ? "#0D9488" : "#94A3B8",
                      fontWeight: isActive ? '600' : '400',
                      textAlign: 'center',
                      maxWidth: isSmallScreen ? 60 : 80,
                    }}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {t(tab.label)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>

      {/* ✅ Fond blanc derrière les touches du téléphone */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: insets.bottom,
          backgroundColor: 'rgb(255, 255, 255)',
          zIndex: 99,
        }}
      />
    </>
  );
}
