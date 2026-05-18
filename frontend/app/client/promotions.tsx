import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { Header } from "@/src/components/Header";
import { PROMOTIONS } from "@/src/data/mock";
import { catalogService } from "@/src/services/catalogService";
import { Ionicons } from "@expo/vector-icons";
import { getSafeImageUrl } from "@/src/utils/images";

export default function Promotions() {
  const [promotions, setPromotions] = useState<any[]>(PROMOTIONS);
  useEffect(() => {
    catalogService.listPromotions().then(setPromotions).catch(() => setPromotions(PROMOTIONS));
  }, []);
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header title="Promoções" />
      <ScrollView contentContainerStyle={styles.container}>
        {promotions.map((p) => (
          <View key={p.id} style={styles.card} testID={`promotion-${p.id}`}>
            <ImageSlot uri={p.image ?? p.image_url} />
            <View style={styles.badge}><Text style={styles.badgeText}>{p.discount ?? p.discount_label}</Text></View>
            <View style={styles.body}>
              <Text style={styles.title}>{p.title}</Text>
              <Text style={styles.store}>{p.storeName ?? p.establishments?.name}</Text>
              <Text style={styles.desc}>{p.description}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function ImageSlot({ uri }: { uri?: string | null }) {
  const safeUri = getSafeImageUrl(uri);
  if (safeUri) return <Image source={{ uri: safeUri }} style={styles.img} />;
  return (
    <View style={[styles.img, styles.imageFallback]}>
      <Ionicons name="pricetag" size={28} color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, gap: spacing.md },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, overflow: "hidden",
    borderWidth: 1, borderColor: colors.borderLight,
  },
  img: { width: "100%", height: 160 },
  imageFallback: { alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  badge: {
    position: "absolute", top: spacing.sm, right: spacing.sm,
    backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill,
  },
  badgeText: { color: colors.white, fontWeight: "800" },
  body: { padding: spacing.md, gap: 4 },
  title: { fontSize: fontSize.h4, fontWeight: "700", color: colors.textPrimary },
  store: { color: colors.primary, fontWeight: "600", fontSize: fontSize.small },
  desc: { color: colors.textSecondary, fontSize: fontSize.body, marginTop: 2 },
});
