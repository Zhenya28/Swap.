import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CONFIG } from "../constants/config";
const API_URL = CONFIG.API_URL;

const api = axios.create({
  baseURL: CONFIG.API_URL,
  timeout: 30000, // 30 sekund (było 10s)
});

// Interceptor do dodawania tokena JWT
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(CONFIG.TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: async (email: string, password: string) => {
    const response = await axios.post(`${API_URL}/auth/register`, {
      email,
      password,
    });
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password,
    });
    return response.data;
  },

  changePassword: async (oldPassword: string, newPassword: string) => {
    const token = await AsyncStorage.getItem(CONFIG.TOKEN_KEY);
    const response = await axios.post(
      `${API_URL}/auth/change-password`,
      {
        oldPassword,
        newPassword,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },
};

export const walletAPI = {
  getBalance: async () => {
    const token = await AsyncStorage.getItem(CONFIG.TOKEN_KEY);
    const response = await axios.get(`${API_URL}/wallet`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  getTransactions: async () => {
    const token = await AsyncStorage.getItem(CONFIG.TOKEN_KEY);
    const response = await axios.get(`${API_URL}/transactions?limit=50`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  deposit: async (amount: number) => {
    const token = await AsyncStorage.getItem(CONFIG.TOKEN_KEY);
    const response = await axios.post(
      `${API_URL}/wallet/deposit`,
      { amount },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },
};

export const exchangeAPI = {
  getRates: async () => {
    const response = await api.get("/exchange-rates");
    return response.data;
  },
  exchange: async (
    fromCurrency: string,
    toCurrency: string,
    amount: number
  ) => {
    const response = await api.post("/exchange", {
      fromCurrency,
      toCurrency,
      amount,
    });
    return response.data;
  },

  // Pobieranie historycznych kursów z NBP API
  getHistoricalRates: async (currency: string, days: number = 10) => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const formatDate = (date: Date) => {
        return date.toISOString().split("T")[0];
      };

      // NBP API z timeout 30s
      const response = await axios.get(
        `http://api.nbp.pl/api/exchangerates/rates/c/${currency.toLowerCase()}/${formatDate(
          startDate
        )}/${formatDate(endDate)}/`,
        {
          timeout: 30000, // 30 sekund
        }
      );

      return response.data;
    } catch (error) {
      console.error("Error fetching historical rates:", error);
      throw error;
    }
  },
};

export const transactionsAPI = {
  getHistory: async (limit: number = 50) => {
    const response = await api.get(`/transactions?limit=${limit}`);
    return response.data;
  },
};

export default api;
