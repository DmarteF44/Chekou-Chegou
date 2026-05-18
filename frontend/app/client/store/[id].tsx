import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, Image, KeyboardAvoidingView, Platform, TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { Header } from "@/src/components/Header";
import { Button } from "@/src/components/Button";
import { catalogService } from "@/src/services/catalogService";
import { CartItem, Product, Store } from "@/src/types/domain";

export default function StoreOrder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [items, setItems] = useState("");
  const [notes, setNotes] = useState("");
  const [estimated, setEstimated] = useState("");
  const [customName, setCustomName] = useState("");
  const [customEstimate, setCustomEstimate] = useState("");

  useEffect(() => {
    async function load() {
      const selectedStore = await catalogService.getStore(id as string);
      setStore(selectedStore);
      setProducts(await catalogService.listProducts(id as string));
    }
    load();
  }, [id]);

  const customListEstimate = Number(estimated.replace(",", ".")) || 0;
  const cartSubtotal = useMemo(() => cart.reduce((sum, item) => sum + item.totalEstimate, 0), [cart]);
  const valid = cart.length > 0 || (items.trim().length > 3 && customListEstimate > 0);

  function addProduct(product: Product) {
    setCart((current) => {
      const existing = current.find((i) => i.type === "catalog" && i.productId === product.id);
      if (existing) {
        return current.map((i) => i.id === existing.id ? { ...i, quantity: i.quantity + 1, totalEstimate: +(i.unitPriceEstimate * (i.quantity + 1)).toFixed(2) } : i);
      }
      const price = Number(product.promo_price ?? product.price ?? 0);
      return [...current, {
        id: `cart_${Date.now()}_${product.id}`,
        type: "catalog",
        name: product.name,
        quantity: 1,
        unitPriceEstimate: price,
        totalEstimate: price,
        storeId: product.establishment_id ?? product.storeId ?? store?.id ?? "",
        productId: product.id,
        allowSubstitution: true,
        notes: product.notes ?? undefined,
      }];
    });
  }

  function addCustomItem() {
    const price = Number(customEstimate.replace(",", ".")) || 0;
    if (!customName.trim() || price <= 0 || !store) return;
    setCart((current) => [...current, {
      id: `custom_${Date.now()}`,
      type: "custom",
      name: customName.trim(),
      quantity: 1,
      unitPriceEstimate: price,
      totalEstimate: price,
      storeId: store.id,
      notes,
      allowSubstitution: true,
    }]);
    setCustomName("");
    setCustomEstimate("");
  }

  function removeItem(itemId: string) {
    setCart((current) => current.filter((item) => item.id !== itemId));
  }

  function next() {
    if (!store) return;
    const checkoutCart: CartItem[] = cart.length > 0 ? cart : [{
      id: `custom_list_${Date.now()}`,
      type: "custom",
      name: items,
      quantity: 1,
      unitPriceEstimate: customListEstimate,
      totalEstimate: customListEstimate,
      storeId: store.id,
      notes,
      allowSubstitution: true,
    }];
    router.push({
      pathname: "/client/checkout",
      params: {
        storeId: store.id,
        storeName: store.name,
        items: cart.length > 0 ? cart.map((i) => `${i.quantity}x ${i.name}`).join("\n") : items,
        notes,
        estimated: String(cart.length > 0 ? cartSubtotal : customListEstimate),
        cart: JSON.stringify(checkoutCart),
      },
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header title="Criar Pedido" subtitle={store?.name ?? "Carregando"} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.storeHeader}>
            <Image source={{ uri: store?.image_url ?? "" }} style={styles.storeImg} />
            <View style={{ flex: 1 }}>
              <Text style={styles.storeName}>{store?.name}</Text>
              <Text style={styles.storeDesc}>{store?.notes}</Text>
            </View>
          </View>

          <Section title="Produtos do catálogo" hint="Toque para adicionar ao carrinho. Preços podem ser confirmados na loja.">
            {products.map((product) => (
              <TouchableOpacity key={product.id} style={styles.productRow} onPress={() => addProduct(product)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.hint}>{product.category}{product.notes ? ` • ${product.notes}` : ""}</Text>
                </View>
                <Text style={styles.productPrice}>R$ {Number(product.promo_price ?? product.price).toFixed(2)}</Text>
              </TouchableOpacity>
            ))}
          </Section>

          <Section title="Carrinho" hint="Você também pode remover itens antes de revisar.">
            {cart.map((item) => (
              <TouchableOpacity key={item.id} style={styles.cartRow} onPress={() => removeItem(item.id)}>
                <Text style={styles.cartText}>{item.quantity}x {item.name}</Text>
                <Text style={styles.cartText}>R$ {item.totalEstimate.toFixed(2)}</Text>
              </TouchableOpacity>
            ))}
            {cart.length === 0 ? <Text style={styles.hint}>Nenhum produto adicionado ainda.</Text> : <Text style={styles.subtotal}>Subtotal: R$ {cartSubtotal.toFixed(2)}</Text>}
          </Section>

          <Section title="Item personalizado" hint="Use quando o produto não estiver no catálogo.">
            <View style={styles.currencyRow}>
              <TextInput value={customName} onChangeText={setCustomName} placeholder="Nome do item" placeholderTextColor={colors.textTertiary} style={[styles.input, { flex: 1 }]} />
              <TextInput value={customEstimate} onChangeText={setCustomEstimate} placeholder="R$" placeholderTextColor={colors.textTertiary} keyboardType="decimal-pad" style={[styles.input, { width: 92 }]} />
            </View>
            <Button title="Adicionar item" variant="secondary" onPress={addCustomItem} testID="add-custom-item" />
          </Section>

          <Section title="Lista livre" hint="Fallback para pedido por texto, se preferir não usar o carrinho.">
            <TextInput
              value={items}
              onChangeText={setItems}
              placeholder={"Ex.:\n2kg de arroz tipo 1\n1L de leite integral\n5 tomates"}
              placeholderTextColor={colors.textTertiary}
              multiline
              style={[styles.input, styles.textarea]}
              testID="order-items-input"
            />
          </Section>

          <Section
            title="Observações"
            hint="Marcas preferidas, substituições aceitas, preferências."
          >
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Ex.: prefiro leite Italac. Pode substituir tomate por similar."
              placeholderTextColor={colors.textTertiary}
              multiline
              style={[styles.input, styles.textareaSm]}
              testID="order-notes-input"
            />
          </Section>

          <Section title="Valor estimado da lista livre" hint="Usado apenas se o carrinho estiver vazio.">
            <View style={styles.currencyRow}>
              <Text style={styles.currencyPrefix}>R$</Text>
              <TextInput
                value={estimated}
                onChangeText={setEstimated}
                placeholder="0,00"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
                style={[styles.input, { flex: 1, marginLeft: spacing.sm }]}
                testID="order-estimated-input"
              />
            </View>
          </Section>

          <View style={styles.tipBox}>
            <Ionicons name="information-circle" size={18} color={colors.info} />
            <Text style={styles.tipText}>
              A margem de segurança protege contra variação de preços. Sobra é devolvida.
            </Text>
          </View>

          <Button
            title="Revisar pedido"
            onPress={next}
            disabled={!valid}
            testID="order-review-button"
            icon={<Ionicons name="arrow-forward" size={18} color={colors.white} />}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  storeHeader: {
    flexDirection: "row", gap: spacing.sm, backgroundColor: colors.surface,
    padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight,
    alignItems: "center",
  },
  storeImg: { width: 56, height: 56, borderRadius: radius.md },
  storeName: { fontSize: fontSize.bodyLarge, fontWeight: "700", color: colors.textPrimary },
  storeDesc: { fontSize: fontSize.small, color: colors.textSecondary, marginTop: 2 },

  label: { fontSize: fontSize.body, fontWeight: "700", color: colors.textPrimary },
  hint: { fontSize: fontSize.small, color: colors.textTertiary },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    backgroundColor: colors.surface, padding: spacing.md, fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  textarea: { minHeight: 120, textAlignVertical: "top" },
  textareaSm: { minHeight: 80, textAlignVertical: "top" },
  currencyRow: { flexDirection: "row", alignItems: "center" },
  currencyPrefix: { fontSize: fontSize.h4, fontWeight: "700", color: colors.textSecondary },
  tipBox: {
    flexDirection: "row", gap: 8, alignItems: "center",
    backgroundColor: colors.infoSoft, padding: spacing.sm, borderRadius: radius.md,
  },
  tipText: { flex: 1, color: colors.info, fontSize: fontSize.small },
  productRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight,
    borderRadius: radius.md, padding: spacing.sm,
  },
  productName: { color: colors.textPrimary, fontWeight: "700", fontSize: fontSize.body },
  productPrice: { color: colors.primary, fontWeight: "800" },
  cartRow: {
    flexDirection: "row", justifyContent: "space-between",
    backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.sm,
  },
  cartText: { color: colors.primaryDark, fontWeight: "700" },
  subtotal: { color: colors.textPrimary, fontWeight: "800", textAlign: "right" },
});
