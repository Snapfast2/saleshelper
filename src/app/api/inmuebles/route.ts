// src/app/api/inmuebles/route.ts
import { NextResponse } from "next/server";
import { scrapeL2L } from "@/services/l2lService";

export const revalidate = 1800; // 30 minutos

export async function GET() {
  const data = await scrapeL2L();
  return NextResponse.json(data, { status: 200 });
}
