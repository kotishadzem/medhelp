import { prisma } from "./prisma";

/** Documents (and any owner-scoped resource) can be reached either by the
 * owner themselves or by another user who has an ACCEPTED outgoing family
 * link to the owner. Centralised so every route applies the same rule. */
export async function canAccessOwner(
  currentUserId: string,
  ownerUserId: string
): Promise<boolean> {
  if (currentUserId === ownerUserId) return true;
  const link = await prisma.familyLink.findUnique({
    where: {
      requesterId_targetId: {
        requesterId: currentUserId,
        targetId: ownerUserId,
      },
    },
  });
  return !!link && link.status === "ACCEPTED";
}
