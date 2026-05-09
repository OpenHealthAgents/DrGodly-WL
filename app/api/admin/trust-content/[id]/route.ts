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

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = params;
    const body = await req.json();
    const result = TrustContentSchema.partial().safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.format() },
        { status: 400 }
      );
    }

    const item = await prisma.trustContent.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: result.data as any,
    });

    return NextResponse.json(item);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = params;
    await prisma.trustContent.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
