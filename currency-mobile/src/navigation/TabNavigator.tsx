import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/theme";

import DashboardScreen from "../screens/DashboardScreen";
import RatesScreen from "../screens/RatesScreen";
import ExchangeScreen from "../screens/ExchangeScreen";
import ProfileScreen from "../screens/ProfileScreen";

export type TabParamList = {
  DashboardTab: undefined;
  RatesTab: undefined;
  ExchangeTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray,
        tabBarStyle: {
          paddingBottom: 10,
          paddingTop: 4,
          height: 65,
          borderTopWidth: 1,
          borderTopColor: Colors.lightGray,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          tabBarLabel: "Główna",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="RatesTab"
        component={RatesScreen}
        options={{
          tabBarLabel: "Kursy",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trending-up" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ExchangeTab"
        component={ExchangeScreen}
        options={{
          tabBarLabel: "Wymiana",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="swap-horizontal" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
