import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Colors, Spacing, BorderRadius, Typography } from "../constants/theme";
import { exchangeAPI, walletAPI } from "../services/api";

const CURRENCIES = ["PLN", "EUR", "USD", "GBP", "CHF"];
const QUICK_AMOUNTS = [10, 50, 100, 500];

export default function ExchangeScreen() {
  const [fromCurrency, setFromCurrency] = useState("PLN");
  const [toCurrency, setToCurrency] = useState("EUR");
  const [amount, setAmount] = useState("");
  const [rates, setRates] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [estimatedAmount, setEstimatedAmount] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const [ratesData, walletData] = await Promise.all([
        exchangeAPI.getRates(),
        walletAPI.getBalance(),
      ]);
      setRates(ratesData.rates);
      setWallet(walletData.wallet);
    } catch (error) {
      Alert.alert("Błąd", "Nie udało się pobrać danych");
    }
  };

  // Odświeżaj dane za każdym razem gdy użytkownik wraca na ten ekran
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  useEffect(() => {
    calculateEstimate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, fromCurrency, toCurrency, rates]);

  const calculateEstimate = () => {
    if (!amount || !rates || isNaN(parseFloat(amount))) {
      setEstimatedAmount(null);
      return;
    }

    const amountNum = parseFloat(amount);

    if (fromCurrency === "PLN" && toCurrency !== "PLN") {
      const rate = rates[toCurrency]?.ask;
      if (rate) {
        setEstimatedAmount(amountNum / rate);
      }
    } else if (fromCurrency !== "PLN" && toCurrency === "PLN") {
      const rate = rates[fromCurrency]?.bid;
      if (rate) {
        setEstimatedAmount(amountNum * rate);
      }
    }
  };

  const handleExchange = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Błąd", "Wprowadź poprawną kwotę");
      return;
    }

    if (fromCurrency === toCurrency) {
      Alert.alert("Błąd", "Wybierz różne waluty");
      return;
    }

    const currentBalance = getBalance(fromCurrency);

    if (parseFloat(amount) > currentBalance) {
      Alert.alert("Błąd", `Niewystarczające środki ${fromCurrency}`);
      return;
    }

    setLoading(true);
    try {
      const response = await exchangeAPI.exchange(
        fromCurrency,
        toCurrency,
        parseFloat(amount)
      );

      Alert.alert(
        "Sukces!",
        response.message + `\nKurs: ${response.exchangeRate.toFixed(4)}`,
        [
          {
            text: "OK",
            onPress: () => {
              setAmount("");
              fetchData();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Błąd", error.response?.data?.error || "Spróbuj ponownie");
    } finally {
      setLoading(false);
    }
  };

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const getBalance = (currency: string) => {
    if (!wallet) return 0;
    const key = currency.toLowerCase() as keyof typeof wallet;
    return wallet[key] || 0;
  };

  const getRate = () => {
    if (!rates) return null;
    if (fromCurrency === "PLN" && toCurrency !== "PLN") {
      return rates[toCurrency]?.ask;
    }
    if (fromCurrency !== "PLN" && toCurrency === "PLN") {
      return rates[fromCurrency]?.bid;
    }
    return null;
  };

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Wymiana walut</Text>
          <Text style={styles.subtitle}>Kupuj i sprzedawaj waluty</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Wymieniam</Text>
          <View style={styles.currencyRow}>
            <View style={styles.currencySelector}>
              {CURRENCIES.map((currency) => (
                <TouchableOpacity
                  key={currency}
                  style={[
                    styles.currencyButton,
                    fromCurrency === currency && styles.currencyButtonActive,
                  ]}
                  onPress={() => setFromCurrency(currency)}
                >
                  <Text
                    style={[
                      styles.currencyButtonText,
                      fromCurrency === currency &&
                        styles.currencyButtonTextActive,
                    ]}
                  >
                    {currency}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Text style={styles.balanceText}>
            Dostępne: {getBalance(fromCurrency).toFixed(2)} {fromCurrency}
          </Text>
        </View>

        <View style={styles.section}>
          <TextInput
            style={styles.amountInput}
            placeholder="Kwota"
            placeholderTextColor={Colors.textLight}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
        </View>

        {/* SZYBKIE KWOTY */}
        {fromCurrency === "PLN" && (
          <View style={styles.quickAmountsSection}>
            <Text style={styles.quickAmountsLabel}>Szybkie kwoty</Text>
            <View style={styles.quickAmountsRow}>
              {QUICK_AMOUNTS.map((quickAmount) => (
                <TouchableOpacity
                  key={quickAmount}
                  style={styles.quickAmountButton}
                  onPress={() => handleQuickAmount(quickAmount)}
                >
                  <Text style={styles.quickAmountText}>{quickAmount} PLN</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.swapButton} onPress={swapCurrencies}>
          <Text style={styles.swapIcon}>⇅</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.label}>Otrzymam</Text>
          <View style={styles.currencyRow}>
            <View style={styles.currencySelector}>
              {CURRENCIES.map((currency) => (
                <TouchableOpacity
                  key={currency}
                  style={[
                    styles.currencyButton,
                    toCurrency === currency && styles.currencyButtonActive,
                  ]}
                  onPress={() => setToCurrency(currency)}
                >
                  <Text
                    style={[
                      styles.currencyButtonText,
                      toCurrency === currency &&
                        styles.currencyButtonTextActive,
                    ]}
                  >
                    {currency}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {estimatedAmount !== null && (
          <View style={styles.estimateBox}>
            <Text style={styles.estimateLabel}>Szacunkowa kwota:</Text>
            <Text style={styles.estimateAmount}>
              ≈ {estimatedAmount.toFixed(2)} {toCurrency}
            </Text>
            {getRate() && (
              <Text style={styles.rateText}>
                Kurs: 1 {fromCurrency === "PLN" ? toCurrency : fromCurrency} ={" "}
                {getRate()?.toFixed(4)}{" "}
                {fromCurrency === "PLN" ? "PLN" : toCurrency}
              </Text>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleExchange}
          disabled={loading || !amount}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.buttonText}>Wymień walutę</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
  },
  header: {
    marginTop: 60,
    marginBottom: Spacing.xl,
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
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.body,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  currencyRow: {
    marginBottom: Spacing.sm,
  },
  currencySelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  currencyButton: {
    backgroundColor: Colors.white,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  currencyButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  currencyButtonText: {
    fontSize: Typography.body,
    color: Colors.text,
    fontWeight: "600",
  },
  currencyButtonTextActive: {
    color: Colors.white,
  },
  balanceText: {
    fontSize: Typography.small,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  amountInput: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    fontSize: Typography.h2,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    textAlign: "center",
    fontWeight: "bold",
  },
  quickAmountsSection: {
    marginBottom: Spacing.lg,
  },
  quickAmountsLabel: {
    fontSize: Typography.small,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
    fontWeight: "600",
  },
  quickAmountsRow: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  quickAmountButton: {
    flex: 1,
    backgroundColor: Colors.primaryLight,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: "center",
  },
  quickAmountText: {
    fontSize: Typography.small,
    color: Colors.white,
    fontWeight: "600",
  },
  swapButton: {
    alignSelf: "center",
    backgroundColor: Colors.primary,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: Spacing.md,
  },
  swapIcon: {
    fontSize: 28,
    color: Colors.white,
    fontWeight: "bold",
  },
  estimateBox: {
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
  estimateLabel: {
    fontSize: Typography.small,
    color: Colors.white,
    marginBottom: 4,
  },
  estimateAmount: {
    fontSize: Typography.h2,
    fontWeight: "bold",
    color: Colors.white,
    marginBottom: 4,
  },
  rateText: {
    fontSize: Typography.small,
    color: Colors.textLight,
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
});
