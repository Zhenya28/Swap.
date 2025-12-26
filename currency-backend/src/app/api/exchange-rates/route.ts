import { NextRequest, NextResponse } from "next/server";
import { fetchExchangeRates } from "@/lib/nbp";

export async function GET(request: NextRequest) {
  try {
    const rates = await fetchExchangeRates();

    return NextResponse.json({ rates }, { status: 200 });
  } catch (error) {
    console.error("Exchange rates error:", error);
    return NextResponse.json(
      { error: "Nie udało się pobrać kursów walut" },
      { status: 500 }
    );
  }
}
