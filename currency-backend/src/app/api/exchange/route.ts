import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { fetchExchangeRates } from "@/lib/nbp";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { error: "Nieprawidłowy token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { fromCurrency, toCurrency, amount } = body as {
      fromCurrency: string;
      toCurrency: string;
      amount: number;
    };

    const fromCurr = fromCurrency.toUpperCase();
    const toCurr = toCurrency.toUpperCase();

    if (!fromCurr || !toCurr || !amount) {
      return NextResponse.json(
        { error: "Brak wymaganych danych" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Kwota musi być większa od 0" },
        { status: 400 }
      );
    }

    const rates = await fetchExchangeRates();

    let exchangeRate: number;
    let valuePln: number;

    if (fromCurr === "PLN") {
      if (!rates[toCurr]) {
        return NextResponse.json(
          { error: "Nieobsługiwana waluta" },
          { status: 400 }
        );
      }
      exchangeRate = rates[toCurr].ask;
      valuePln = amount;
    } else if (toCurr === "PLN") {
      if (!rates[fromCurr]) {
        return NextResponse.json(
          { error: "Nieobsługiwana waluta" },
          { status: 400 }
        );
      }
      exchangeRate = rates[fromCurr].bid;
      valuePln = amount * exchangeRate;
    } else {
      return NextResponse.json(
        { error: "Jedna z walut musi być PLN" },
        { status: 400 }
      );
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId: decoded.userId },
    });

    if (!wallet) {
      return NextResponse.json(
        { error: "Portfel nie został znaleziony" },
        { status: 404 }
      );
    }

    const fromKey = fromCurr.toLowerCase() as
      | "pln"
      | "eur"
      | "usd"
      | "gbp"
      | "chf";
    if (Number(wallet[fromKey]) < amount) {
      return NextResponse.json(
        { error: "Niewystarczające środki" },
        { status: 400 }
      );
    }

    const receivedAmount =
      fromCurr === "PLN" ? amount / exchangeRate : valuePln;

    const toKey = toCurr.toLowerCase() as "pln" | "eur" | "usd" | "gbp" | "chf";

    await prisma.wallet.update({
      where: { userId: decoded.userId },
      data: {
        [fromKey]: {
          decrement: amount,
        },
        [toKey]: {
          increment: receivedAmount,
        },
      },
    });

    await prisma.transaction.create({
      data: {
        userId: decoded.userId,
        type: fromCurr === "PLN" ? "BUY" : "SELL",
        currency: fromCurr === "PLN" ? toCurr : fromCurr,
        amount: fromCurr === "PLN" ? receivedAmount : amount,
        exchangeRate: exchangeRate,
        valuePln: valuePln,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Wymieniono ${amount} ${fromCurr} na ${receivedAmount.toFixed(
          2
        )} ${toCurr}`,
        exchangeRate,
        receivedAmount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Exchange error:", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
