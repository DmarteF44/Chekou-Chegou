import "@/src/lib/polyfills";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import React from "react";
import { ErrorBoundaryProps, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors, spacing } from "@/src/theme/colors";

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, backgroundColor: colors.background }}>
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: "700", textAlign: "center" }}>
            Não foi possível carregar o app.
          </Text>
          <Text style={{ color: colors.textSecondary, marginTop: spacing.sm, textAlign: "center" }}>
            {error.message || "Tente abrir novamente."}
          </Text>
          <TouchableOpacity
            onPress={retry}
            style={{ marginTop: spacing.lg, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 8 }}
          >
            <Text style={{ color: colors.white, fontWeight: "700" }}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: "slide_from_right",
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
