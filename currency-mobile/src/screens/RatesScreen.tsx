import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Dimensions,
  Modal,
  ActivityIndicator,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { Colors, Spacing, BorderRadius, Typography } from "../constants/theme";
import { exchangeAPI } from "../services/api";

const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;

export default function RatesScreen() {
  const [rates, setRates] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedView, setSelectedView] = useState<"current" | "archive">(
    "current"
  );
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<any>(null);
  const [archiveRates, setArchiveRates] = useState<any[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [weekData, setWeekData] = useState<any>(null);
  const [loadingChart, setLoadingChart] = useState(false);

  useEffect(() => {
    fetchRates();
  }, []);

  useEffect(() => {
    if (selectedView === "archive" && archiveRates.length === 0) {
      fetchArchiveRates();
    }
  }, [selectedView]);

  useEffect(() => {
    if (selectedCurrency) {
      fetchWeekDataForCurrency(selectedCurrency);
    }
  }, [selectedCurrency]);

  const fetchRates = async () => {
    try {
      const response = await exchangeAPI.getRates();
      setRates(response.rates);
    } catch (error) {
      Alert.alert("Błąd", "Nie udało się pobrać kursów");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchArchiveRates = async () => {
    setArchiveLoading(true);
    try {
      // Pobierz 30 dni danych
      const [eurData, usdData, gbpData, chfData] = await Promise.all([
        exchangeAPI.getHistoricalRates("EUR", 30),
        exchangeAPI.getHistoricalRates("USD", 30),
        exchangeAPI.getHistoricalRates("GBP", 30),
        exchangeAPI.getHistoricalRates("CHF", 30),
      ]);

      // Stwórz 30 dni kalendarzowych OD 18.12 wstecz
      const today = new Date();
      const archiveDays: Date[] = [];

      for (let i = 7; i < 30; i++) {
        // Od dnia 7 wstecz (18.12) do dnia 37 wstecz
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        archiveDays.push(date);
      }

      // Dla każdego dnia kalendarzowego znajdź kursy
      const archiveArray = archiveDays.map((day) => {
        const dateStr = day.toISOString().split("T")[0]; // YYYY-MM-DD

        // Znajdź kursy dla tego dnia lub użyj ostatniego dostępnego
        const findRateForDay = (rates: any[]) => {
          let rate = rates.find((r: any) => r.effectiveDate === dateStr);
          if (!rate) {
            // Weekend/święto - użyj ostatniego dostępnego kursu PRZED tym dniem
            const previousRates = rates.filter(
              (r: any) => r.effectiveDate < dateStr
            );
            rate = previousRates[previousRates.length - 1];
          }
          return rate;
        };

        const eurRate = findRateForDay(eurData.rates);
        const usdRate = findRateForDay(usdData.rates);
        const gbpRate = findRateForDay(gbpData.rates);
        const chfRate = findRateForDay(chfData.rates);

        return {
          date: dateStr,
          isWeekend: day.getDay() === 0 || day.getDay() === 6,
          rates: {
            EUR: eurRate,
            USD: usdRate,
            GBP: gbpRate,
            CHF: chfRate,
          },
        };
      });

      setArchiveRates(archiveArray);
    } catch (error) {
      console.error("Error fetching archive rates:", error);
      Alert.alert("Błąd", "Nie udało się pobrać kursów archiwalnych");
    } finally {
      setArchiveLoading(false);
    }
  };

  const fetchWeekDataForCurrency = async (currency: string) => {
    setLoadingChart(true);
    setWeekData(null);
    setTooltipPos(null);
    try {
      // Pobierz więcej dni (14) żeby mieć pewność że obejmie 7 dni kalendarzowych
      const data = await exchangeAPI.getHistoricalRates(currency, 14);

      // Stwórz pełny zakres 7 ostatnich dni kalendarzowych
      const today = new Date();
      const last7Days: Date[] = [];

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        last7Days.push(date);
      }

      const chartData: number[] = [];
      const labels: string[] = [];
      const fullDates: string[] = [];
      const detailedData: any[] = [];

      // Dla każdego dnia z ostatnich 7 dni
      last7Days.forEach((day) => {
        const dateStr = day.toISOString().split("T")[0]; // YYYY-MM-DD

        // Znajdź kurs dla tego dnia w danych z NBP
        let rateForDay = data.rates.find(
          (r: any) => r.effectiveDate === dateStr
        );

        // Jeśli nie ma (weekend), użyj poprzedniego dostępnego kursu
        if (!rateForDay) {
          // Znajdź ostatni dostępny kurs przed tym dniem
          const previousRates = data.rates.filter(
            (r: any) => r.effectiveDate < dateStr
          );
          rateForDay = previousRates[previousRates.length - 1];
        }

        if (rateForDay) {
          chartData.push(rateForDay.ask);

          // Krótka etykieta
          labels.push(
            day.toLocaleDateString("pl-PL", {
              day: "2-digit",
              month: "2-digit",
            })
          );

          // Pełna data
          fullDates.push(
            day.toLocaleDateString("pl-PL", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          );

          detailedData.push({
            effectiveDate: dateStr,
            ask: rateForDay.ask,
            bid: rateForDay.bid,
            isWeekend: day.getDay() === 0 || day.getDay() === 6,
          });
        }
      });

      setWeekData({
        data: chartData,
        labels,
        fullDates,
        rawData: detailedData,
      });
    } catch (error) {
      console.error("Error fetching week data:", error);
      Alert.alert("Błąd", "Nie udało się pobrać danych do wykresu");
    } finally {
      setLoadingChart(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (selectedView === "current") {
      fetchRates();
    } else {
      fetchArchiveRates();
    }
  };

  const chartConfig = {
    backgroundColor: "#213448",
    backgroundGradientFrom: "#213448",
    backgroundGradientFromOpacity: 1,
    backgroundGradientTo: "#3A5F80",
    backgroundGradientToOpacity: 1,
    decimalPlaces: 4,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`, // Biała siatka
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`, // Białe etykiety
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: "#3A5F80",
      fill: "#FFFFFF",
    },
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Ładowanie...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Kursy walut</Text>
          <Text style={styles.subtitle}>Narodowy Bank Polski</Text>
        </View>

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              selectedView === "current" && styles.toggleButtonActive,
            ]}
            onPress={() => setSelectedView("current")}
          >
            <Text
              style={[
                styles.toggleText,
                selectedView === "current" && styles.toggleTextActive,
              ]}
            >
              Aktualne
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              selectedView === "archive" && styles.toggleButtonActive,
            ]}
            onPress={() => setSelectedView("archive")}
          >
            <Text
              style={[
                styles.toggleText,
                selectedView === "archive" && styles.toggleTextActive,
              ]}
            >
              Archiwalne
            </Text>
          </TouchableOpacity>
        </View>

        {selectedView === "current" && rates && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kursy bieżące</Text>
            <Text style={styles.hint}>Kliknij walutę aby zobaczyć wykres</Text>
            <DetailedRateCard
              currency="EUR"
              rate={rates.EUR}
              name="Euro"
              onPress={() => {
                setSelectedCurrency("EUR");
                setTooltipPos(null);
              }}
            />
            <DetailedRateCard
              currency="USD"
              rate={rates.USD}
              name="Dolar amerykański"
              onPress={() => {
                setSelectedCurrency("USD");
                setTooltipPos(null);
              }}
            />
            <DetailedRateCard
              currency="GBP"
              rate={rates.GBP}
              name="Funt szterling"
              onPress={() => {
                setSelectedCurrency("GBP");
                setTooltipPos(null);
              }}
            />
            <DetailedRateCard
              currency="CHF"
              rate={rates.CHF}
              name="Frank szwajcarski"
              onPress={() => {
                setSelectedCurrency("CHF");
                setTooltipPos(null);
              }}
            />
          </View>
        )}

        {selectedView === "archive" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Historia kursów</Text>
            <Text style={styles.archiveNote}>
              Dane z Narodowego Banku Polskiego
            </Text>
            {archiveLoading ? (
              <Text style={styles.loadingText}>
                Ładowanie archiwalnych kursów...
              </Text>
            ) : (
              archiveRates.map((archive, index) => (
                <View key={index} style={styles.archiveCard}>
                  <Text style={styles.archiveDate}>
                    {" "}
                    {new Date(archive.date).toLocaleDateString("pl-PL", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </Text>

                  {archive.rates.EUR && (
                    <View style={styles.archiveRow}>
                      <Text style={styles.archiveCurrency}>EUR</Text>
                      <Text style={styles.archiveValue}>
                        {archive.rates.EUR.bid.toFixed(4)} /{" "}
                        {archive.rates.EUR.ask.toFixed(4)}
                      </Text>
                    </View>
                  )}

                  {archive.rates.USD && (
                    <View style={styles.archiveRow}>
                      <Text style={styles.archiveCurrency}>USD</Text>
                      <Text style={styles.archiveValue}>
                        {archive.rates.USD.bid.toFixed(4)} /{" "}
                        {archive.rates.USD.ask.toFixed(4)}
                      </Text>
                    </View>
                  )}

                  {archive.rates.GBP && (
                    <View style={styles.archiveRow}>
                      <Text style={styles.archiveCurrency}>GBP</Text>
                      <Text style={styles.archiveValue}>
                        {archive.rates.GBP.bid.toFixed(4)} /{" "}
                        {archive.rates.GBP.ask.toFixed(4)}
                      </Text>
                    </View>
                  )}

                  {archive.rates.CHF && (
                    <View style={styles.archiveRow}>
                      <Text style={styles.archiveCurrency}>CHF</Text>
                      <Text style={styles.archiveValue}>
                        {archive.rates.CHF.bid.toFixed(4)} /{" "}
                        {archive.rates.CHF.ask.toFixed(4)}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* PEŁNOEKRANOWY MODAL Z WYKRESEM */}
      <Modal
        visible={selectedCurrency !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedCurrency(null)}
      >
        <View style={styles.fullScreenModal}>
          {/* HEADER */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setSelectedCurrency(null)}
              style={styles.closeButtonContainer}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.modalTitleContainer}>
              <View>
                <Text style={styles.modalTitle}>{selectedCurrency}</Text>
              </View>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {selectedCurrency && rates && (
            <ScrollView style={styles.modalScrollView}>
              {/* KURS AKTUALNY */}
              <View style={styles.currentRateContainer}>
                <View style={styles.rateBox}>
                  <Text style={styles.rateLabel}>Kupno (ASK)</Text>
                  <Text style={styles.rateValueLarge}>
                    {rates[selectedCurrency].ask.toFixed(4)}
                  </Text>
                  <Text style={styles.rateCurrency}>PLN</Text>
                </View>
                <View style={styles.rateBox}>
                  <Text style={styles.rateLabel}>Sprzedaż (BID)</Text>
                  <Text style={styles.rateValueLarge}>
                    {rates[selectedCurrency].bid.toFixed(4)}
                  </Text>
                  <Text style={styles.rateCurrency}>PLN</Text>
                </View>
              </View>

              {/* WYKRES */}
              <View style={styles.chartSection}>
                <Text style={styles.chartTitle}>Trend ostatnie 7 dni</Text>
                <Text style={styles.chartSubtitle}>
                  Dane z Narodowego Banku Polskiego
                </Text>

                {loadingChart ? (
                  <View style={styles.chartLoadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>
                      Ładowanie danych NBP...
                    </Text>
                  </View>
                ) : weekData ? (
                  <>
                    <View style={styles.chartWrapper}>
                      <LineChart
                        data={{
                          labels: weekData.labels,
                          datasets: [
                            {
                              data: weekData.data,
                              color: (opacity = 1) =>
                                `rgba(255, 255, 255, ${opacity})`,
                              strokeWidth: 3,
                            },
                          ],
                        }}
                        width={screenWidth - Spacing.md * 2}
                        height={320}
                        chartConfig={chartConfig}
                        bezier
                        style={styles.chart}
                        onDataPointClick={(data) => {
                          setTooltipPos({
                            x: data.x,
                            y: data.y,
                            value: data.value,
                            index: data.index,
                            date: weekData.fullDates[data.index],
                          });
                        }}
                        withVerticalLabels={true}
                        withHorizontalLabels={true}
                        withDots={true}
                        withShadow={false}
                        withInnerLines={true}
                        withOuterLines={true}
                        fromZero={false}
                        segments={4}
                      />

                      {/* TOOLTIP */}
                      {tooltipPos && (
                        <View
                          style={[
                            styles.tooltip,
                            {
                              top: tooltipPos.y - 60,
                              left: tooltipPos.x - 60,
                            },
                          ]}
                        >
                          <Text style={styles.tooltipDate}>
                            {tooltipPos.date}
                          </Text>
                          <Text style={styles.tooltipValue}>
                            {tooltipPos.value.toFixed(4)} PLN
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* STATYSTYKI */}
                    <View style={styles.statsContainer}>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Najwyższy</Text>
                        <Text style={styles.statValue}>
                          {Math.max(...weekData.data).toFixed(4)} PLN
                        </Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Najniższy</Text>
                        <Text style={styles.statValue}>
                          {Math.min(...weekData.data).toFixed(4)} PLN
                        </Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Średni</Text>
                        <Text style={styles.statValue}>
                          {(
                            weekData.data.reduce(
                              (a: number, b: number) => a + b,
                              0
                            ) / weekData.data.length
                          ).toFixed(4)}{" "}
                          PLN
                        </Text>
                      </View>
                    </View>

                    {/* SZCZEGÓŁOWA TABELA */}
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsTitle}>Szczegółowe dane</Text>
                      {weekData.rawData
                        .slice()
                        .reverse()
                        .map((rate: any, index: number) => {
                          const date = new Date(rate.effectiveDate);
                          return (
                            <View
                              key={index}
                              style={[
                                styles.detailRow,
                                rate.isWeekend && styles.detailRowWeekend,
                              ]}
                            >
                              <View style={styles.detailDateContainer}>
                                <Text style={styles.detailDate}>
                                  {date.toLocaleDateString("pl-PL", {
                                    day: "numeric",
                                    month: "short",
                                  })}
                                </Text>
                                {rate.isWeekend && (
                                  <Text style={styles.weekendBadge}>
                                    weekend
                                  </Text>
                                )}
                              </View>
                              <View style={styles.detailValues}>
                                <View style={styles.detailValueBox}>
                                  <Text style={styles.detailLabel}>ASK</Text>
                                  <Text style={styles.detailValue}>
                                    {rate.ask.toFixed(4)}
                                  </Text>
                                </View>
                                <View style={styles.detailValueBox}>
                                  <Text style={styles.detailLabel}>BID</Text>
                                  <Text style={styles.detailValue}>
                                    {rate.bid.toFixed(4)}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          );
                        })}
                    </View>
                  </>
                ) : (
                  <Text style={styles.loadingText}>Brak danych</Text>
                )}
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

function DetailedRateCard({ currency, rate, name, flag, onPress }: any) {
  const spread = (((rate.ask - rate.bid) / rate.bid) * 100).toFixed(2);

  return (
    <TouchableOpacity
      style={styles.rateCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.rateHeader}>
        <View style={styles.rateHeaderLeft}>
          <Text style={styles.rateFlag}>{flag}</Text>
          <View>
            <Text style={styles.rateCurrency}>{currency}</Text>
            <Text style={styles.rateName}>{name}</Text>
          </View>
        </View>
      </View>

      <View style={styles.rateBody}>
        <View style={styles.rateColumn}>
          <Text style={styles.rateLabel}>Kupno (ASK)</Text>
          <Text style={[styles.rateValue, { color: Colors.success }]}>
            {rate.ask.toFixed(4)} PLN
          </Text>
          <Text style={styles.rateNote}>Kantor sprzedaje</Text>
        </View>

        <View style={styles.rateDivider} />

        <View style={styles.rateColumn}>
          <Text style={styles.rateLabel}>Sprzedaż (BID)</Text>
          <Text style={[styles.rateValue, { color: Colors.warning }]}>
            {rate.bid.toFixed(4)} PLN
          </Text>
          <Text style={styles.rateNote}>Kantor kupuje</Text>
        </View>
      </View>

      <View style={styles.rateFooter}>
        <Text style={styles.spreadLabel}>Spread: {spread}%</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: Typography.body,
    color: Colors.textLight,
  },
  header: {
    padding: Spacing.md,
    paddingTop: 60,
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
  toggleContainer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  toggleText: {
    fontSize: Typography.body,
    color: Colors.text,
    fontWeight: "600",
  },
  toggleTextActive: {
    color: Colors.white,
  },
  section: {
    paddingHorizontal: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.h3,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  hint: {
    fontSize: Typography.small,
    color: Colors.textLight,
    marginBottom: Spacing.md,
  },
  rateCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  rateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  rateHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  rateFlag: {
    fontSize: 32,
    marginRight: Spacing.sm,
  },
  rateCurrency: {
    fontSize: Typography.h3,
    fontWeight: "bold",
    color: Colors.text,
  },
  rateName: {
    fontSize: Typography.small,
    color: Colors.textLight,
  },
  rateBody: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: Spacing.sm,
  },
  rateColumn: {
    flex: 1,
    alignItems: "center",
  },
  rateLabel: {
    fontSize: Typography.small,
    color: Colors.textLight,
    marginBottom: 4,
  },
  rateValue: {
    fontSize: Typography.h3,
    fontWeight: "bold",
    marginBottom: 2,
  },
  rateNote: {
    fontSize: Typography.tiny,
    color: Colors.textLight,
  },
  rateDivider: {
    width: 1,
    backgroundColor: Colors.lightGray,
    marginHorizontal: Spacing.sm,
  },
  rateFooter: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    alignItems: "center",
  },
  spreadLabel: {
    fontSize: Typography.small,
    color: Colors.textLight,
  },
  archiveNote: {
    fontSize: Typography.small,
    color: Colors.textLight,
    marginBottom: Spacing.md,
    fontWeight: "400",
  },
  archiveCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  archiveDate: {
    fontSize: Typography.body,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  archiveRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  archiveCurrency: {
    fontSize: Typography.body,
    fontWeight: "600",
    color: Colors.text,
  },
  archiveValue: {
    fontSize: Typography.body,
    color: Colors.textLight,
  },

  // PEŁNOEKRANOWY MODAL
  fullScreenModal: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  closeButtonContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.lightGray,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 24,
    color: Colors.text,
    fontWeight: "bold",
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalFlag: {
    fontSize: 36,
    marginRight: Spacing.sm,
  },
  modalTitle: {
    fontSize: Typography.h2,
    fontWeight: "bold",
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: Typography.small,
    color: Colors.textLight,
  },
  modalScrollView: {
    flex: 1,
  },
  currentRateContainer: {
    flexDirection: "row",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  rateBox: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  rateValueLarge: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.primary,
    marginVertical: Spacing.xs,
  },
  chartSection: {
    padding: Spacing.lg,
  },
  chartTitle: {
    fontSize: Typography.h3,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  chartSubtitle: {
    fontSize: Typography.small,
    color: Colors.textLight,
    marginBottom: Spacing.lg,
  },
  chartLoadingContainer: {
    height: 320,
    justifyContent: "center",
    alignItems: "center",
  },
  chartWrapper: {
    position: "relative",
    marginBottom: Spacing.lg,
    marginHorizontal: -Spacing.sm,
  },
  chart: {
    borderRadius: BorderRadius.lg,
  },
  tooltip: {
    position: "absolute",
    backgroundColor: Colors.text,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    minWidth: 120,
    alignItems: "center",
  },
  tooltipDate: {
    fontSize: Typography.tiny,
    color: Colors.white,
    marginBottom: 2,
  },
  tooltipValue: {
    fontSize: Typography.body,
    fontWeight: "bold",
    color: Colors.white,
  },
  statsContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: "center",
  },
  statLabel: {
    fontSize: Typography.small,
    color: Colors.textLight,
    marginBottom: 4,
  },
  statValue: {
    fontSize: Typography.body,
    fontWeight: "bold",
    color: Colors.text,
  },
  detailsSection: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  detailsTitle: {
    fontSize: Typography.h3,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  detailRowWeekend: {
    backgroundColor: Colors.white,
  },
  detailDateContainer: {
    width: 80,
  },
  detailDate: {
    fontSize: Typography.body,
    color: Colors.text,
    fontWeight: "600",
  },
  weekendBadge: {
    fontSize: Typography.tiny,
    color: Colors.primary,
    fontStyle: "italic",
  },
  detailValues: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  detailValueBox: {
    alignItems: "center",
    width: 80,
  },
  detailLabel: {
    fontSize: Typography.tiny,
    color: Colors.textLight,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: Typography.small,
    fontWeight: "600",
    color: Colors.text,
  },
});
