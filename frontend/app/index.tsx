import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, TextInput, Alert,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, radius } from "@/src/theme/colors";
import { Button } from "@/src/components/Button";
import { authService } from "@/src/services/authService";
import { getSupabaseConfigStatus, isSupabaseConfigured } from "@/src/lib/supabase";
import { isBlocked } from "@/src/services/securityService";

export default function Index() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const supabaseStatus = getSupabaseConfigStatus();

  function redirectByProfile(profile: Awaited<ReturnType<typeof authService.getCurrentProfile>>) {
    if (!profile || isBlocked(profile)) {
      Alert.alert("Conta bloqueada", "Entre em contato com o suporte.");
      return;
    }
    if (profile.role === "admin" || profile.role === "super_admin") router.replace("/admin");
    else if (profile.role === "driver" && profile.driver_status === "approved") router.replace("/driver/home");
    else if (profile.role === "driver_pending" || profile.driver_status === "pending") {
      Alert.alert("Cadastro em análise", "Seu cadastro de entregador está aguardando aprovação.");
    } else router.replace("/client/home");
  }

  async function submit(mode: "login" | "signup") {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Dados incompletos", "Informe email e senha.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      Alert.alert("Dados incompletos", "Informe seu nome.");
      return;
    }
    setLoading(true);
    try {
      const result = mode === "signup"
        ? await authService.signUp({ email: email.trim(), password, name: name.trim(), phone: phone.trim() })
        : await authService.login(email.trim(), password);

      if (mode === "signup" && isSupabaseConfigured() && !(result as { session?: unknown } | null)?.session) {
        Alert.alert("Conta criada", "Confirme seu e-mail ou tente entrar novamente.");
        return;
      }

      const profile = await authService.getCurrentProfile();
      if (!profile) {
        Alert.alert(
          "Perfil não encontrado",
          "Conta criada/autenticada, mas perfil ainda não foi encontrado. Tente novamente em alguns segundos.",
        );
        return;
      }
      redirectByProfile(profile);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "object"
            ? JSON.stringify(error)
            : String(error);
      console.error("Auth submit failed", error);
      Alert.alert("Não foi possível entrar", message);
    } finally {
      setLoading(false);
    }
  }

  async function enterLocal(role: "client" | "driver" | "admin" = "client") {
    setLoading(true);
    try {
      await authService.loginMock(role);
      if (role === "driver") router.replace("/driver/home");
      else if (role === "admin") router.replace("/admin");
      else router.replace("/client/home");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Local login failed", error);
      Alert.alert("Não foi possível entrar em modo local", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroWrap}>
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1542838132-92c53300491e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjh8MHwxfHNlYXJjaHwxfHxmcmVzaCUyMGZvb2QlMjBncm9jZXJpZXN8ZW58MHx8fHwxNzc5MTEwNTMxfDA&ixlib=rb-4.1.0&q=85",
            }}
            style={styles.hero}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay} />
          <View style={styles.logoBadge}>
            <Ionicons name="bag-handle" size={28} color={colors.white} />
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.brand}>Chekou Ganhou</Text>
          <Text style={styles.tagline}>
            Peça de mercados, farmácias e lojas locais sem sair de casa.
          </Text>
          <Text style={styles.debugText}>
            Supabase: {supabaseStatus.configured ? "configurado" : "não configurado"} • URL: {supabaseStatus.url ? "ok" : "ausente"}
          </Text>

          <View style={styles.featureRow}>
            <Feature icon="flash" label="Ágil" />
            <Feature icon="shield-checkmark" label="Seguro" />
            <Feature icon="cash" label="Econômico" />
          </View>

          <View style={styles.actions}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Nome para cadastro"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
              testID="auth-name-input"
            />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Telefone"
              placeholderTextColor={colors.textTertiary}
              keyboardType="phone-pad"
              style={styles.input}
              testID="auth-phone-input"
            />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              testID="auth-email-input"
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Senha"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              style={styles.input}
              testID="auth-password-input"
            />
            <Button
              title="Entrar"
              onPress={() => submit("login")}
              loading={loading}
              testID="auth-login-button"
              icon={<Ionicons name="log-in" size={20} color={colors.white} />}
            />
            <Button
              title="Criar conta"
              variant="secondary"
              onPress={() => submit("signup")}
              loading={loading}
              testID="auth-signup-button"
              icon={<Ionicons name="person-add" size={20} color={colors.primary} />}
            />
            <Button
              title="Entrar em modo local"
              variant="secondary"
              onPress={() => enterLocal("client")}
              loading={loading}
              testID="auth-local-button"
              icon={<Ionicons name="phone-portrait" size={20} color={colors.primary} />}
            />
            <Button
              title="Entrar como Cliente"
              onPress={() => enterLocal("client")}
              loading={loading}
              testID="role-client-button"
              icon={<Ionicons name="person" size={20} color={colors.white} />}
            />
            <Button
              title="Entrar como Entregador"
              variant="secondary"
              onPress={() => enterLocal("driver")}
              loading={loading}
              testID="role-driver-button"
              icon={<Ionicons name="bicycle" size={20} color={colors.primary} />}
            />
          </View>

          <TouchableOpacity
            style={styles.adminBtn}
            onLongPress={() => enterLocal("admin")}
            delayLongPress={800}
            testID="admin-hidden-button"
          >
            <Text style={styles.adminHint}>Jataí • Goiás</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Feature({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.feature}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={styles.featureLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { flexGrow: 1, paddingBottom: 40 },
  heroWrap: { width: "100%", height: 260, position: "relative" },
  hero: { width: "100%", height: "100%" },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,150,105,0.35)",
  },
  logoBadge: {
    position: "absolute",
    bottom: -28,
    alignSelf: "center",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.white,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  body: {
    paddingTop: spacing.xl + 16,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  brand: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: fontSize.bodyLarge,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  debugText: {
    marginTop: spacing.sm,
    textAlign: "center",
    color: colors.textTertiary,
    fontSize: fontSize.small,
  },
  featureRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  feature: { alignItems: "center", gap: 6 },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  featureLabel: { fontSize: fontSize.small, color: colors.textSecondary, fontWeight: "600" },
  actions: { gap: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSize.body,
    minHeight: 48,
  },
  adminBtn: { marginTop: spacing.xl, alignItems: "center", padding: spacing.sm },
  adminHint: { fontSize: fontSize.small, color: colors.textTertiary },
});
