export async function isAuthor(): Promise<boolean> {
  if (
    process.env.DEV_BYPASS_AUTH === "true" ||
    !process.env.CLERK_SECRET_KEY
  ) {
    return true;
  }

  const { auth, currentUser } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  if (!userId) return false;

  const allowedId = process.env.VERONIKA_USER_ID;
  const allowedEmail = process.env.VERONIKA_EMAIL?.toLowerCase();

  if (allowedId && userId === allowedId) return true;

  if (allowedEmail) {
    const user = await currentUser();
    const emails =
      user?.emailAddresses.map((e) => e.emailAddress.toLowerCase()) ?? [];
    if (emails.includes(allowedEmail)) return true;
  }

  if (!allowedId && !allowedEmail) return true;

  return false;
}

export async function requireAuthor() {
  const ok = await isAuthor();
  if (!ok) {
    throw new Error("Only Veronika may write in the Scriptorium.");
  }
}
