import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <div className="px-6 py-24 text-center">
        <p className="font-display text-3xl text-vellum">Auth not configured</p>
        <p className="mt-3 text-vellum-dim">
          Set Clerk keys in .env.local, or keep DEV_BYPASS_AUTH=true for local
          writing.
        </p>
      </div>
    );
  }

  return (
    <div className="flex justify-center px-6 py-16">
      <SignIn />
    </div>
  );
}
