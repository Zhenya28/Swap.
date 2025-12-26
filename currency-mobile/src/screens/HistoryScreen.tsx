import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import { Colors, Spacing, BorderRadius, Typography } from "../constants/theme";
import { transactionsAPI } from "../services/api";

export default function HistoryScreen() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await transactionsAPI.getHistory(50);
      setTransactions(response.transactions);
    } catch (error) {
      Alert.alert("Błąd", "Nie udało się pobrać historii");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "DEPOSIT":
        return Colors.success;
      case "BUY":
        return Colors.primary;
      case "SELL":
        return Colors.warning;
      default:
        return Colors.gray;
    }
  };

  const getTransactionTitle = (transaction: any) => {
    switch (transaction.type) {
      case "DEPOSIT":
        return "Zasilenie konta";
      case "BUY":
        return `Zakup ${transaction.currency}`;
      case "SELL":
        return `Sprzedaż ${transaction.currency}`;
      default:
        return "Transakcja";
    }
  };

  const renderTransaction = ({ item }: any) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionLeft}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: getTransactionColor(item.type) + "20" },
          ]}
        ></View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionTitle}>
            {getTransactionTitle(item)}
          </Text>
          <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
          {item.exchangeRate && (
            <Text style={styles.transactionRate}>
              Kurs: {item.exchangeRate.toFixed(4)}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.transactionRight}>
        <Text
          style={[
            styles.transactionAmount,
            { color: getTransactionColor(item.type) },
          ]}
        >
          {item.type === "DEPOSIT" ? "+" : ""}
          {item.amount.toFixed(2)} {item.currency}
        </Text>
        <Text style={styles.transactionValue}>
          {item.valuePln.toFixed(2)} PLN
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Ładowanie...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Historia transakcji</Text>
        <Text style={styles.subtitle}>
          {transactions.length}{" "}
          {transactions.length === 1 ? "transakcja" : "transakcji"}
        </Text>
      </View>

      {transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>Brak transakcji</Text>
          <Text style={styles.emptySubtext}>
            Twoje transakcje pojawią się tutaj
          </Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingText: {
    textAlign: "center",
    marginTop: 100,
    fontSize: Typography.h3,
    color: Colors.textLight,
  },
  header: {
    padding: Spacing.md,
    paddingTop: 60,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
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
  listContainer: {
    padding: Spacing.md,
  },
  transactionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  transactionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  icon: {
    fontSize: 24,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: Typography.body,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: Typography.small,
    color: Colors.textLight,
    marginBottom: 2,
  },
  transactionRate: {
    fontSize: Typography.tiny,
    color: Colors.textLight,
  },
  transactionRight: {
    alignItems: "flex-end",
  },
  transactionAmount: {
    fontSize: Typography.body,
    fontWeight: "bold",
    marginBottom: 2,
  },
  transactionValue: {
    fontSize: Typography.small,
    color: Colors.textLight,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.md,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: Typography.h2,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    fontSize: Typography.body,
    color: Colors.textLight,
    textAlign: "center",
  },
});
