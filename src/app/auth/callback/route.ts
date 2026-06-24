import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const supabaseUser = data.user;

      // Upsert user in our DB
      const user = await prisma.user.upsert({
        where: { supabaseId: supabaseUser.id },
        update: {},
        create: {
          supabaseId: supabaseUser.id,
          email: supabaseUser.email!,
          fullName:
            supabaseUser.user_metadata?.full_name ??
            supabaseUser.email!.split("@")[0],
        },
      });

      // Create default org if none exists
      const existingMembership = await prisma.organizationMember.findFirst({
        where: { userId: user.id },
      });

      if (!existingMembership) {
        const orgName =
          supabaseUser.user_metadata?.full_name
            ? `${supabaseUser.user_metadata.full_name}'s Workspace`
            : "My Workspace";

        const org = await prisma.organization.create({
          data: {
            name: orgName,
            slug: slugify(orgName) + "-" + user.id.slice(-6),
          },
        });

        await prisma.organizationMember.create({
          data: {
            organizationId: org.id,
            userId: user.id,
            role: "OWNER",
          },
        });
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
