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

    // Pobierz portfel użytkownika
    const wallet = await prisma.wallet.findUnique({
      where: { userId: decoded.userId },
    });

    if (!wallet) {
      return NextResponse.json(
        { error: "Portfel nie został znaleziony" },
        { status: 404 }
      );
    }

    // Konwertuj Decimal na number
    const walletData = {
      pln: Number(wallet.pln),
      eur: Number(wallet.eur),
      usd: Number(wallet.usd),
      gbp: Number(wallet.gbp),
      chf: Number(wallet.chf),
    };

    return NextResponse.json({ wallet: walletData }, { status: 200 });
  } catch (error) {
    console.error("Wallet error:", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
