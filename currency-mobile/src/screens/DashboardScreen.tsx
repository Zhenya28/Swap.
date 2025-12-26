import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Colors, Spacing, BorderRadius, Typography } from "../constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import { walletAPI, exchangeAPI } from "../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CONFIG } from "../constants/config";

export default function DashboardScreen({ navigation }: any) {
  const [wallet, setWallet] = useState<any>(null);
  const [rates, setRates] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositLoading, setDepositLoading] = useState(false);

  useEffect(() => {
    loadUserData();
    fetchData();
  }, []);

  const loadUserData = async () => {
    const userData = await AsyncStorage.getItem(CONFIG.USER_KEY);
    if (userData) {
      setUser(JSON.parse(userData));
    }
  };

  const fetchData = async () => {
    try {
      const [walletData, ratesData] = await Promise.all([
        walletAPI.getBalance(),
        exchangeAPI.getRates(),
      ]);
      setWallet(walletData.wallet);
      setRates(ratesData.rates);
    } catch (error: any) {
      Alert.alert("Błąd", "Nie udało się pobrać danych");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleDeposit = async (amount: number) => {
    if (amount <= 0) {
      Alert.alert("Błąd", "Kwota musi być większa od 0");
      return;
    }

    if (amount > 100000) {
      Alert.alert("Błąd", "Maksymalna kwota to 100,000 PLN");
      return;
    }

    setDepositLoading(true);
    try {
      await walletAPI.deposit(amount);
      Alert.alert("Sukces!", `Zasilono konto kwotą ${amount} PLN`);
      setDepositAmount("");
      setShowDeposit(false);
      fetchData();
    } catch (error: any) {
      Alert.alert("Błąd", error.response?.data?.error || "Spróbuj ponownie");
    } finally {
      setDepositLoading(false);
    }
  };

  const handleQuickDeposit = (amount: number) => {
    handleDeposit(amount);
  };

  const handleCustomDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount)) {
      Alert.alert("Błąd", "Wprowadź poprawną kwotę");
      return;
    }
    handleDeposit(amount);
  };

  const goToExchange = () => {
    navigation.navigate("ExchangeTab");
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Ładowanie...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View></View>
      </View>

      {/* Saldo główne */}
      <LinearGradient
        colors={["#213448", "#213448", "#3A5F80"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.balanceCard}
      >
        <Text style={styles.balanceLabel}>Saldo PLN</Text>
        <Text style={styles.balanceAmount}>
          {wallet?.pln ? Number(wallet.pln).toFixed(2) : "0.00"} PLN
        </Text>
      </LinearGradient>

      {/* Przyciski akcji */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButtonPrimary}
          onPress={() => setShowDeposit(!showDeposit)}
        >
          <Text style={styles.actionButtonTextPrimary}>Zasil konto</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButtonSecondary}
          onPress={goToExchange}
        >
          <Text style={styles.actionButtonTextSecondary}>Wymień walutę</Text>
        </TouchableOpacity>
      </View>

      {/* Sekcja zasilenia (rozwijana) */}
      {showDeposit && (
        <View style={styles.depositSection}>
          <Text style={styles.depositTitle}>Szybkie kwoty</Text>
          <View style={styles.quickAmountsGrid}>
            {[10, 50, 100, 500].map((amount) => (
              <TouchableOpacity
                key={amount}
                style={styles.quickAmountButton}
                onPress={() => handleQuickDeposit(amount)}
                disabled={depositLoading}
              >
                <Text style={styles.quickAmountText}>{amount} PLN</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.depositTitle}>Inna kwota</Text>
          <TextInput
            style={styles.input}
            placeholder="Wpisz kwotę"
            placeholderTextColor={Colors.textLight}
            value={depositAmount}
            onChangeText={setDepositAmount}
            keyboardType="decimal-pad"
          />
          <TouchableOpacity
            style={[
              styles.depositButton,
              depositLoading && styles.buttonDisabled,
            ]}
            onPress={handleCustomDeposit}
            disabled={depositLoading}
          >
            <Text style={styles.depositButtonText}>
              {depositLoading ? "Przetwarzanie..." : "Zasil konto"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Pozostałe waluty */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Moje waluty</Text>
        <View style={styles.currencyGrid}>
          <CurrencyCard currency="EUR" amount={wallet?.eur || 0} />
          <CurrencyCard currency="USD" amount={wallet?.usd || 0} />
          <CurrencyCard currency="GBP" amount={wallet?.gbp || 0} />
          <CurrencyCard currency="CHF" amount={wallet?.chf || 0} />
        </View>
      </View>

      {/* Aktualne kursy */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aktualne kursy NBP</Text>
        <Text style={styles.sectionSubtitle}>
          Kliknij Kursy aby zobaczyć więcej
        </Text>
        {rates && (
          <>
            <RateRow currency="EUR" rate={rates.EUR} />
            <RateRow currency="USD" rate={rates.USD} />
            <RateRow currency="GBP" rate={rates.GBP} />
            <RateRow currency="CHF" rate={rates.CHF} />
          </>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// Komponent karty waluty
function CurrencyCard({
  currency,
  amount,
}: {
  currency: string;
  amount: number;
}) {
  return (
    <View style={styles.currencyCard}>
      <Text style={styles.currencyCode}>{currency}</Text>
      <Text style={styles.currencyAmount}>{amount.toFixed(2)}</Text>
    </View>
  );
}

// Komponent wiersza kursu
function RateRow({ currency, rate }: { currency: string; rate: any }) {
  return (
    <View style={styles.rateRow}>
      <Text style={styles.rateCurrency}>{currency}</Text>
      <View style={styles.rateValues}>
        <View>
          <Text style={styles.rateLabel}>Kupno</Text>
          <Text style={styles.rateValue}>{rate.bid.toFixed(4)}</Text>
        </View>
        <View style={{ marginLeft: 20 }}>
          <Text style={styles.rateLabel}>Sprzedaż</Text>
          <Text style={styles.rateValue}>{rate.ask.toFixed(4)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingText: {
    flex: 1,
    textAlign: "center",
    marginTop: 100,
    fontSize: Typography.h3,
    color: Colors.textLight,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: Spacing.md,
    paddingTop: 60,
  },
  balanceCard: {
    backgroundColor: Colors.primary,
    margin: Spacing.md,
    marginTop: 0,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  balanceLabel: {
    color: Colors.white,
    fontSize: Typography.body,
    opacity: 0.9,
  },
  balanceAmount: {
    color: Colors.white,
    fontSize: 40,
    fontWeight: "bold",
    marginTop: Spacing.sm,
  },
  actionButtons: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  actionButtonPrimary: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  actionButtonTextPrimary: {
    fontSize: Typography.body,
    fontWeight: "600",
    color: Colors.white,
  },
  actionButtonSecondary: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  actionButtonTextSecondary: {
    fontSize: Typography.body,
    fontWeight: "600",
    color: Colors.primary,
  },
  depositSection: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  depositTitle: {
    fontSize: Typography.body,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  quickAmountsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  quickAmountButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    width: "48%",
    alignItems: "center",
  },
  quickAmountText: {
    color: Colors.white,
    fontWeight: "600",
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.body,
    color: Colors.text,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  depositButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  depositButtonText: {
    color: Colors.white,
    fontWeight: "600",
  },
  section: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: Typography.h3,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: Typography.small,
    color: Colors.textLight,
    marginBottom: Spacing.md,
  },
  currencyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  currencyCard: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    width: "47%",
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  currencyCode: {
    fontSize: Typography.small,
    color: Colors.textLight,
    fontWeight: "600",
  },
  currencyAmount: {
    fontSize: Typography.h3,
    color: Colors.text,
    fontWeight: "bold",
    marginTop: 4,
  },
  rateRow: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  rateCurrency: {
    fontSize: Typography.h3,
    fontWeight: "bold",
    color: Colors.text,
  },
  rateValues: {
    flexDirection: "row",
  },
  rateLabel: {
    fontSize: Typography.tiny,
    color: Colors.textLight,
    marginBottom: 2,
  },
  rateValue: {
    fontSize: Typography.body,
    color: Colors.text,
    fontWeight: "600",
  },
});
