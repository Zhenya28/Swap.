import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors, Spacing, BorderRadius, Typography } from "../constants/theme";
import { walletAPI, authAPI, exchangeAPI } from "../services/api";
import { CONFIG } from "../constants/config";

export default function ProfileScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [rates, setRates] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"profile" | "history">(
    "profile"
  );

  // Zmiana hasła
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [userString, walletData, transactionsData, ratesData] =
        await Promise.all([
          AsyncStorage.getItem(CONFIG.USER_KEY),
          walletAPI.getBalance(),
          walletAPI.getTransactions(),
          exchangeAPI.getRates(),
        ]);

      if (userString) {
        setUser(JSON.parse(userString));
      }

      setWallet(walletData.wallet);
      setTransactions(transactionsData.transactions || []);
      setRates(ratesData.rates);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Wyloguj się", "Czy na pewno chcesz się wylogować?", [
      { text: "Anuluj", style: "cancel" },
      {
        text: "Wyloguj",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem(CONFIG.TOKEN_KEY);
          await AsyncStorage.removeItem(CONFIG.USER_KEY);
          navigation.reset({
            index: 0,
            routes: [{ name: "Login" }],
          });
        },
      },
    ]);
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert("Błąd", "Wypełnij wszystkie pola");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Błąd", "Nowe hasło musi mieć minimum 6 znaków");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Błąd", "Nowe hasła nie są identyczne");
      return;
    }

    setPasswordLoading(true);
    try {
      await authAPI.changePassword(oldPassword, newPassword);

      Alert.alert("Sukces!", "Hasło zostało zmienione pomyślnie", [
        {
          text: "OK",
          onPress: () => {
            setChangePasswordVisible(false);
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Błąd",
        error.response?.data?.error || "Nie udało się zmienić hasła"
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const getStatistics = () => {
    const totalTransactions = transactions.length;
    const deposits = transactions.filter((t) => t.type === "DEPOSIT");
    const totalDeposited = deposits.reduce(
      (sum, t) => sum + parseFloat(t.amount),
      0
    );

    const exchanges = transactions.filter(
      (t) => t.type === "BUY" || t.type === "SELL"
    );
    const largestExchange =
      exchanges.length > 0
        ? Math.max(...exchanges.map((t) => parseFloat(t.valuePln)))
        : 0;

    // Przelicz wszystkie waluty na PLN
    let totalBalanceInPLN = 0;

    if (wallet && rates) {
      // PLN
      totalBalanceInPLN += parseFloat(wallet.pln) || 0;

      // EUR
      const eurAmount = parseFloat(wallet.eur) || 0;
      if (eurAmount > 0 && rates.EUR) {
        totalBalanceInPLN += eurAmount * rates.EUR.bid;
      }

      // USD
      const usdAmount = parseFloat(wallet.usd) || 0;
      if (usdAmount > 0 && rates.USD) {
        totalBalanceInPLN += usdAmount * rates.USD.bid;
      }

      // GBP
      const gbpAmount = parseFloat(wallet.gbp) || 0;
      if (gbpAmount > 0 && rates.GBP) {
        totalBalanceInPLN += gbpAmount * rates.GBP.bid;
      }

      // CHF
      const chfAmount = parseFloat(wallet.chf) || 0;
      if (chfAmount > 0 && rates.CHF) {
        totalBalanceInPLN += chfAmount * rates.CHF.bid;
      }
    }

    return {
      totalTransactions,
      totalDeposited,
      largestExchange,
      totalBalanceInPLN,
    };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const stats = getStatistics();

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === "profile" && styles.tabActive]}
          onPress={() => setSelectedTab("profile")}
        >
          <Text
            style={[
              styles.tabText,
              selectedTab === "profile" && styles.tabTextActive,
            ]}
          >
            Profil
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === "history" && styles.tabActive]}
          onPress={() => setSelectedTab("history")}
        >
          <Text
            style={[
              styles.tabText,
              selectedTab === "history" && styles.tabTextActive,
            ]}
          >
            Historia
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {selectedTab === "profile" ? (
          <>
            {/* STATYSTYKI */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Statystyki</Text>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Liczba transakcji:</Text>
                <Text style={styles.statValue}>{stats.totalTransactions}</Text>
              </View>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Zasilone środki:</Text>
                <Text style={styles.statValue}>
                  {stats.totalDeposited.toFixed(2)} PLN
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Największa wymiana:</Text>
                <Text style={styles.statValue}>
                  {stats.largestExchange.toFixed(2)} PLN
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Łączne saldo (w PLN):</Text>
                <Text
                  style={[
                    styles.statValue,
                    { color: Colors.success, fontWeight: "bold" },
                  ]}
                >
                  {stats.totalBalanceInPLN.toFixed(2)} PLN
                </Text>
              </View>
            </View>

            {/* USTAWIENIA */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ustawienia</Text>

              <TouchableOpacity
                style={styles.settingButton}
                onPress={() => setChangePasswordVisible(true)}
              >
                <Text style={styles.settingButtonText}>Zmień hasło</Text>
              </TouchableOpacity>
            </View>

            {/* O APLIKACJI */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>O aplikacji</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Wersja:</Text>
                <Text style={styles.infoValue}>1.0.0</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Źródło kursów:</Text>
                <Text style={styles.infoValue}>NBP API</Text>
              </View>

              <TouchableOpacity
                onPress={() => Linking.openURL("https://api.nbp.pl")}
              >
                <Text style={styles.linkText}>Więcej o NBP API →</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <Text style={styles.infoText}>
                CurrencyApp to mobilny kantor wymiany walut korzystający z
                oficjalnych kursów Narodowego Banku Polskiego.
              </Text>
            </View>

            {/* WYLOGUJ */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Text style={styles.logoutButtonText}>Wyloguj się</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </>
        ) : (
          <View style={styles.historyContainer}>
            {transactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyTitle}>Brak transakcji</Text>
                <Text style={styles.emptyText}>
                  Twoje transakcje pojawią się tutaj
                </Text>
              </View>
            ) : (
              transactions.map((transaction, index) => {
                // Wybierz kolor według typu transakcji
                const getAmountColor = () => {
                  if (transaction.type === "DEPOSIT") return "#FF9500"; // Pomarańczowy
                  if (transaction.type === "BUY") return Colors.success; // Zielony
                  if (transaction.type === "SELL") return Colors.error; // Czerwony
                  return Colors.text;
                };

                return (
                  <View key={index} style={styles.transactionCard}>
                    <View style={styles.transactionHeader}>
                      <Text style={styles.transactionType}>
                        {transaction.type === "DEPOSIT" && "Zasilenie"}
                        {transaction.type === "BUY" && "Kupno"}
                        {transaction.type === "SELL" && "Sprzedaż"}
                      </Text>
                      <Text style={styles.transactionDate}>
                        {new Date(transaction.date).toLocaleDateString("pl-PL")}
                      </Text>
                    </View>
                    <View style={styles.transactionBody}>
                      <Text style={styles.transactionCurrency}>
                        {transaction.currency}
                      </Text>
                      <Text
                        style={[
                          styles.transactionAmount,
                          { color: getAmountColor() },
                        ]}
                      >
                        {parseFloat(transaction.amount).toFixed(2)}
                      </Text>
                    </View>
                    {transaction.exchangeRate && (
                      <Text style={styles.transactionRate}>
                        Kurs: {parseFloat(transaction.exchangeRate).toFixed(4)}{" "}
                        PLN
                      </Text>
                    )}
                    <Text style={styles.transactionValue}>
                      Wartość: {parseFloat(transaction.valuePln).toFixed(2)} PLN
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* MODAL ZMIANY HASŁA */}
      <Modal
        visible={changePasswordVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setChangePasswordVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Zmień hasło</Text>
              <TouchableOpacity onPress={() => setChangePasswordVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Stare hasło"
              placeholderTextColor={Colors.textLight}
              value={oldPassword}
              onChangeText={setOldPassword}
              secureTextEntry
            />

            <TextInput
              style={styles.input}
              placeholder="Nowe hasło (min. 6 znaków)"
              placeholderTextColor={Colors.textLight}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />

            <TextInput
              style={styles.input}
              placeholder="Potwierdź nowe hasło"
              placeholderTextColor={Colors.textLight}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[
                styles.modalButton,
                passwordLoading && styles.modalButtonDisabled,
              ]}
              onPress={handleChangePassword}
              disabled={passwordLoading}
            >
              {passwordLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.modalButtonText}>Zmień hasło</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
    paddingTop: 60,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: Typography.body,
    color: Colors.textLight,
    fontWeight: "600",
  },
  tabTextActive: {
    color: Colors.primary,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.h3,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  statLabel: {
    fontSize: Typography.body,
    color: Colors.textLight,
  },
  statValue: {
    fontSize: Typography.body,
    fontWeight: "bold",
    color: Colors.text,
  },
  settingButton: {
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  settingButtonText: {
    fontSize: Typography.body,
    color: Colors.white,
    fontWeight: "600",
    textAlign: "center",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  infoLabel: {
    fontSize: Typography.body,
    color: Colors.textLight,
  },
  infoValue: {
    fontSize: Typography.body,
    fontWeight: "600",
    color: Colors.text,
  },
  linkText: {
    fontSize: Typography.small,
    color: Colors.primary,
    marginTop: Spacing.xs,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.lightGray,
    marginVertical: Spacing.md,
  },
  infoText: {
    fontSize: Typography.small,
    color: Colors.textLight,
    lineHeight: 20,
  },
  logoutButton: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  logoutButtonText: {
    fontSize: Typography.body,
    color: Colors.error,
    fontWeight: "600",
    textAlign: "center",
  },
  historyContainer: {
    padding: Spacing.md,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xxl * 2,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: Typography.h3,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    fontSize: Typography.body,
    color: Colors.textLight,
  },
  transactionCard: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  transactionType: {
    fontSize: Typography.body,
    fontWeight: "bold",
    color: Colors.text,
  },
  transactionDate: {
    fontSize: Typography.small,
    color: Colors.textLight,
  },
  transactionBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  transactionCurrency: {
    fontSize: Typography.h3,
    fontWeight: "bold",
    color: Colors.primary,
  },
  transactionAmount: {
    fontSize: Typography.h3,
    fontWeight: "bold",
  },
  transactionRate: {
    fontSize: Typography.small,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  transactionValue: {
    fontSize: Typography.small,
    color: Colors.textLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: "90%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: Typography.h2,
    fontWeight: "bold",
    color: Colors.text,
  },
  closeButton: {
    fontSize: 28,
    color: Colors.textLight,
    fontWeight: "bold",
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.body,
    color: Colors.text,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  modalButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonText: {
    color: Colors.white,
    fontSize: Typography.body,
    fontWeight: "600",
  },
});
