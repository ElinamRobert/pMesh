import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export interface AuthContext {
  supabaseUserId: string;
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  organizationId: string;
}

export async function getAuthContext(
  organizationId?: string
): Promise<AuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  if (!supabaseUser) return null;

  const user = await prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
    select: { id: true, email: true, fullName: true },
  });

  if (!user) return null;

  // If organizationId provided, verify membership
  if (organizationId) {
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId, userId: user.id },
      },
    });
    if (!membership) return null;
    return { supabaseUserId: supabaseUser.id, user, organizationId };
  }

  // Otherwise return first org the user belongs to
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    select: { organizationId: true },
  });

  if (!membership) return null;

  return {
    supabaseUserId: supabaseUser.id,
    user,
    organizationId: membership.organizationId,
  };
}
