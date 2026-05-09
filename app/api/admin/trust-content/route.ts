import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { TrustContentSchema } from "@/lib/trust-validation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function isAdmin() {
  const session = await auth.api.getSession({
    headers: headers(),
  });
  return session?.user.role === "admin";
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await prisma.trustContent.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = TrustContentSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.format() },
        { status: 400 }
      );
    }

    const item = await prisma.trustContent.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: result.data as any,
    });

    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
