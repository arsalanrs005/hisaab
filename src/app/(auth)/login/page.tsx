import { Suspense } from "react";
import LoginClient from "./login-client";

export default function LoginRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Loading sign in…
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
