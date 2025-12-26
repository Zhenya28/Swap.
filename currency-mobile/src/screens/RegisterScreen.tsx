import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { Colors, Spacing, BorderRadius, Typography } from "../constants/theme";
import { authAPI } from "../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CONFIG } from "../constants/config";

export default function RegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Błąd", "Wypełnij wszystkie pola");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Błąd", "Hasło musi mieć minimum 6 znaków");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Błąd", "Hasła nie są identyczne");
      return;
    }

    setLoading(true);
    try {
      // Krok 1: Zarejestruj
      await authAPI.register(email, password);

      // Krok 2: Automatycznie zaloguj
      const loginResponse = await authAPI.login(email, password);

      // Krok 3: Zapisz token i user
      await AsyncStorage.setItem(CONFIG.TOKEN_KEY, loginResponse.token);
      await AsyncStorage.setItem(
        CONFIG.USER_KEY,
        JSON.stringify(loginResponse.user)
      );

      // Krok 4: Przejdź do Dashboard
      Alert.alert("Sukces", "Konto zostało utworzone!", [
        { text: "OK", onPress: () => navigation.replace("Main") },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Błąd rejestracji",
        error.response?.data?.error || "Spróbuj ponownie"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.logoImage}
            />
            <Text style={styles.title}>Stwórz konto</Text>
            <Text style={styles.subtitle}>Dołącz do CurrencyApp</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={Colors.textLight}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />

            <TextInput
              style={styles.input}
              placeholder="Hasło (min. 6 znaków)"
              placeholderTextColor={Colors.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              textContentType="none"
              autoComplete="off"
            />

            <TextInput
              style={styles.input}
              placeholder="Potwierdź hasło"
              placeholderTextColor={Colors.textLight}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              textContentType="none"
              autoComplete="off"
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Tworzenie konta..." : "Zarejestruj się"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Masz już konto? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.link}>Zaloguj się</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: "center",
    minHeight: 600,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xxl,
  },
  logoImage: {
    width: 80,
    height: 80,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.h1,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.body,
    color: Colors.textLight,
  },
  form: {
    marginBottom: Spacing.xl,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.body,
    color: Colors.text,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.white,
    fontSize: Typography.body,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontSize: Typography.body,
    color: Colors.textLight,
  },
  link: {
    fontSize: Typography.body,
    color: Colors.primary,
    fontWeight: "600",
  },
});
