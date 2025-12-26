import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
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

    // Pobierz dane z body
    const body = await request.json();
    const { oldPassword, newPassword } = body as {
      oldPassword: string;
      newPassword: string;
    };

    // Walidacja
    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { error: "Stare i nowe hasło są wymagane" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Nowe hasło musi mieć minimum 6 znaków" },
        { status: 400 }
      );
    }

    // Pobierz użytkownika
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Użytkownik nie znaleziony" },
        { status: 404 }
      );
    }

    // Sprawdź stare hasło
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Stare hasło jest nieprawidłowe" },
        { status: 401 }
      );
    }

    // Hash nowego hasła
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Aktualizuj hasło
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { password: hashedPassword },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Hasło zostało zmienione pomyślnie",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
