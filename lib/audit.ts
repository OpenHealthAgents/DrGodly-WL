import prisma from "./prisma";

export async function logAudit({
  userId,
  action,
  resource,
  resourceId,
  details,
}: {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        details,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
    // In a production system, you might want to fail the request or use a reliable queue
  }
}
