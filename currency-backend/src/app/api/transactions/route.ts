import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Autoryzacja
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

    // Pobierz parametry z URL (opcjonalne)
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const type = searchParams.get("type"); // 'BUY', 'SELL', 'DEPOSIT'

    // Buduj warunki zapytania
    const where: any = { userId: decoded.userId };
    if (type) {
      where.type = type;
    }

    // Pobierz transakcje
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      take: limit,
    });

    // Formatuj dane
    const formattedTransactions = transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      currency: tx.currency,
      amount: Number(tx.amount),
      exchangeRate: tx.exchangeRate ? Number(tx.exchangeRate) : null,
      valuePln: Number(tx.valuePln),
      date: tx.date.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      transactions: formattedTransactions,
      count: formattedTransactions.length,
    });
  } catch (error) {
    console.error("Transactions error:", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
