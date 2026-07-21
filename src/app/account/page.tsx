import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import Header from "@/components/Header";
import AccountTabs from "@/components/AccountTabs";

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-6xl mx-auto px-6 pb-16">
        <p className="text-sm text-neutral-400 mb-10">
          <Link href="/" className="hover:text-white">
            მთავარი
          </Link>{" "}
          / <span className="text-white">მენიუ</span>
        </p>
        <AccountTabs initialPhone={user.phone} />
      </main>
    </div>
  );
}
