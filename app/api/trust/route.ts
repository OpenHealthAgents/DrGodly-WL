import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await prisma.trustContent.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
    
    return NextResponse.json(items);
  } catch (error) {
    console.error("Failed to fetch trust content:", error);
    // Return empty array or generic error to prevent UI crash
    return NextResponse.json([]);
  }
}
