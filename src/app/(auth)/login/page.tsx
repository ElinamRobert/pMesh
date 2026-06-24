import { LoginForm } from "@/components/auth/login-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            ProductPilot AI
          </h1>
          <p className="text-sm text-muted-foreground">
            AI Workspace for Product Owners
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
