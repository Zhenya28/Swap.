import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Colors, Spacing, BorderRadius, Typography } from "../constants/theme";
import { walletAPI } from "../services/api";

export default function DepositScreen({ navigation }: any) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const quickAmounts = [100, 500, 1000, 5000];

  const handleDeposit = async (depositAmount: number) => {
    if (depositAmount <= 0) {
      Alert.alert("Błąd", "Kwota musi być większa od 0");
      return;
    }

    if (depositAmount > 100000) {
      Alert.alert("Błąd", "Maksymalna kwota to 100,000 PLN");
      return;
    }

    setLoading(true);
    try {
      const response = await walletAPI.deposit(depositAmount);

      Alert.alert(
        "Sukces!",
        `Zasilono konto kwotą ${depositAmount} PLN\nNowe saldo: ${response.newBalance} PLN`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert("Błąd", error.response?.data?.error || "Spróbuj ponownie");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomDeposit = () => {
    const depositAmount = parseFloat(amount);

    if (isNaN(depositAmount)) {
      Alert.alert("Błąd", "Wprowadź poprawną kwotę");
      return;
    }

    handleDeposit(depositAmount);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>← Powrót</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Zasil konto</Text>
          <Text style={styles.subtitle}>Dodaj środki do portfela</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Szybkie kwoty</Text>
          <View style={styles.quickAmountsGrid}>
            {quickAmounts.map((quickAmount) => (
              <TouchableOpacity
                key={quickAmount}
                style={styles.quickAmountButton}
                onPress={() => handleDeposit(quickAmount)}
                disabled={loading}
              >
                <Text style={styles.quickAmountText}>{quickAmount} PLN</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lub wpisz kwotę</Text>
          <TextInput
            style={styles.input}
            placeholder="Kwota w PLN"
            placeholderTextColor={Colors.textLight}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCustomDeposit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Przetwarzanie..." : "Zasil konto"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>ℹ️ Symulowany przelew wirtualny</Text>
          <Text style={styles.infoSubtext}>
            Środki zostaną natychmiast dodane do Twojego portfela
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  header: {
    marginTop: 60,
    marginBottom: Spacing.xl,
  },
  backButton: {
    marginBottom: Spacing.md,
  },
  backText: {
    fontSize: Typography.body,
    color: Colors.primary,
    fontWeight: "600",
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
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.h3,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  quickAmountsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  quickAmountButton: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    width: "47%",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  quickAmountText: {
    fontSize: Typography.body,
    color: Colors.primary,
    fontWeight: "bold",
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
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.white,
    fontSize: Typography.body,
    fontWeight: "600",
  },
  infoBox: {
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: "auto",
  },
  infoText: {
    fontSize: Typography.body,
    color: Colors.text,
    fontWeight: "600",
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: Typography.small,
    color: Colors.textLight,
  },
});
