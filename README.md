System Mobilny Kantoru Wymiany Walut
Aplikacja mobilna umożliwiająca wymianę walut z wykorzystaniem rzeczywistych kursów z API Narodowego Banku Polskiego (NBP). Projekt realizuje komunikację między aplikacją mobilną (React Native), serwerem (Next.js) oraz bazą danych (PostgreSQL).
Opis projektu
System kantoru wymiany walut składa się z trzech głównych komponentów:

Aplikacja mobilna (frontend) - React Native + Expo
Serwer API (backend) - Next.js z API Routes
Baza danych - PostgreSQL z ORM Prisma

Aplikacja pobiera aktualne kursy walut z oficjalnego API NBP (Tabela C - kursy kantorowe) i umożliwia użytkownikom zarządzanie wirtualnym portfelem wielowalutowym.
Technologie
Frontend

React Native
Expo
TypeScript
React Navigation
Axios
AsyncStorage
expo-linear-gradient
react-native-chart-kit

Backend

Next.js 16
Prisma ORM
PostgreSQL
bcrypt (hashowanie haseł)
jsonwebtoken (autoryzacja JWT)

API Zewnętrzne

NBP API (api.nbp.pl) - kursy walut tabela C (bid/ask)

Wymagania systemowe

Node.js >= 16.0.0
PostgreSQL >= 13.0
npm lub yarn
Expo CLI
iOS Simulator (macOS) lub Android Emulator

Instalacja
Backend
cd currency-backend
npm install

# Konfiguracja bazy danych PostgreSQL

psql -U postgres
CREATE DATABASE currency_exchange_db;
\q

# Uruchomienie migracji

npx prisma migrate dev --name init

# (Opcjonalnie) Podgląd bazy danych

npx prisma studio
Aplikacja mobilna
cd currency-mobile
npm install
Konfiguracja API URL w pliku src/constants/config.ts:
typescriptexport const CONFIG = {
API_URL: "http://localhost:3000/api", // iOS Simulator
TOKEN_KEY: "currency_token",
USER_KEY: "currency_user",
};
Dla fizycznego urządzenia użyj adresu IP komputera zamiast localhost.
Uruchomienie Backend
cd currency-backend
npm run dev
Serwer dostępny pod adresem: http://localhost:3000
Aplikacja mobilna
bashcd currency-mobile
npm start

# Następnie:

# Naciśnij 'i' dla iOS Simulator

# Naciśnij 'a' dla Android Emulator

```

## Funkcjonalności

### Autoryzacja
- Rejestracja użytkownika (email + hasło)
- Logowanie z tokenem JWT
- Zmiana hasła
- Automatyczne wylogowanie przy błędach autoryzacji

### Zarządzanie kontem
- Wyświetlanie salda PLN
- Przegląd portfela walutowego (EUR, USD, GBP, CHF)
- Zasilenie konta (symulowany przelew wirtualny)
- Historia wszystkich transakcji

### Wymiana walut
- Wybór par walutowych
- Symulacja wymiany w czasie rzeczywistym
- Walidacja dostępnych środków
- Obsługa liczb dziesiętnych (800.32 lub 800,32)
- Szybkie kwoty (10, 50, 100, 500)

### Kursy walut
- Aktualne kursy NBP (ostatnie 7 dni)
- Kursy archiwalne (30 dni wstecz)
- Interaktywne wykresy dla każdej waluty
- Obsługa weekendów (wyświetlanie ostatniego dostępnego kursu)
- Cache kursów (10 minut) dla optymalizacji wydajności

### Profil użytkownika
- Statystyki (liczba transakcji, zasilone środki, łączne saldo w PLN)
- Historia transakcji z kolorowymi oznaczeniami
- Przeliczanie wszystkich walut na PLN

## Struktura projektu
```

currency-exchange-project/
├── currency-backend/
│ ├── src/
│ │ ├── app/api/
│ │ │ ├── auth/ # Endpointy autoryzacji
│ │ │ ├── wallet/ # Zarządzanie portfelem
│ │ │ ├── exchange/ # Wymiana walut
│ │ │ ├── exchange-rates/ # Kursy NBP z cache
│ │ │ └── transactions/ # Historia transakcji
│ │ └── lib/
│ │ ├── auth.ts # JWT, hashowanie
│ │ ├── nbp.ts # NBP API + cache
│ │ └── prisma.ts # Klient Prisma
│ └── prisma/
│ └── schema.prisma # Model bazy danych
│
└── currency-mobile/
├── src/
│ ├── screens/ # Ekrany aplikacji
│ ├── services/
│ │ └── api.ts # Komunikacja HTTP
│ ├── constants/
│ │ ├── config.ts # Konfiguracja API
│ │ ├── Colors.ts # Paleta kolorów
│ │ └── Spacing.ts # Odstępy
│ └── navigation/
│ └── AppNavigator.tsx
└── App.tsx
Model bazy danych
User
prismamodel User {
id Int @id @default(autoincrement())
email String @unique
password String
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
wallet Wallet?
transactions Transaction[]
}
Wallet
prismamodel Wallet {
id Int @id @default(autoincrement())
userId Int @unique
pln Decimal @default(0) @db.Decimal(10, 2)
eur Decimal @default(0) @db.Decimal(10, 2)
usd Decimal @default(0) @db.Decimal(10, 2)
gbp Decimal @default(0) @db.Decimal(10, 2)
chf Decimal @default(0) @db.Decimal(10, 2)
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
user User @relation(fields: [userId], references: [id])
}
Transaction
prismamodel Transaction {
id Int @id @default(autoincrement())
userId Int
type String
currency String
amount Decimal @db.Decimal(10, 2)
exchangeRate Decimal? @db.Decimal(10, 4)
valuePln Decimal @db.Decimal(10, 2)
date DateTime @default(now())
user User @relation(fields: [userId], references: [id])
}

```

Ograniczenia

NBP API publikuje kursy tylko w dni robocze
Brak trybu offline
Symulowane przelewy (brak rzeczywistych płatności)
Obsługa tylko 4 walut (EUR, USD, GBP, CHF)
Brak wielojęzyczności (tylko polski)
```
