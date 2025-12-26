import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

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
    const { amount } = body as { amount: number };

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Nieprawidłowa kwota" },
        { status: 400 }
      );
    }

    const wallet = await prisma.wallet.update({
      where: { userId: decoded.userId },
      data: {
        pln: {
          increment: amount,
        },
      },
    });

    await prisma.transaction.create({
      data: {
        userId: decoded.userId,
        type: "DEPOSIT",
        currency: "PLN",
        amount: amount,
        valuePln: amount,
        exchangeRate: null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Zasilono konto kwotą ${amount} PLN`,
        balance: Number(wallet.pln),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Deposit error:", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
