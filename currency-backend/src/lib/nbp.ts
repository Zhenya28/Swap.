import axios from "axios";

const NBP_API_URL = "http://api.nbp.pl/api/exchangerates/rates/c";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF"];

interface NBPRate {
  currency: string;
  code: string;
  bid: number;
  ask: number;
}

interface ExchangeRates {
  [key: string]: {
    bid: number;
    ask: number;
  };
}

export async function fetchExchangeRates(): Promise<ExchangeRates> {
  try {
    const promises = CURRENCIES.map((currency) =>
      axios.get(`${NBP_API_URL}/${currency}/`)
    );

    const responses = await Promise.all(promises);

    const rates: ExchangeRates = {};

    responses.forEach((response) => {
      const data = response.data;
      const rate = data.rates[0];
      rates[data.code] = {
        bid: rate.bid,
        ask: rate.ask,
      };
    });

    return rates;
  } catch (error) {
    console.error("Error fetching exchange rates from NBP:", error);
    throw new Error("Failed to fetch exchange rates");
  }
}
