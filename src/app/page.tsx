import Image from "next/image";
import SearchBox from "@/components/SearchBox";
import Header from "@/components/Header";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 flex flex-col items-center px-6 pt-8">
        <SearchBox />
      </main>

      <footer className="px-6 pb-10 pt-24">
        <div className="max-w-5xl mx-auto grid gap-16 sm:grid-cols-2">
          <div className="flex flex-col items-center text-center gap-4">
            <Image src="/icons/shield-star.svg" alt="" width={88} height={88} />
            <h2 className="font-bold text-lg">
              გაქირავების უსაფრთხოების გაძლიერება
            </h2>
            <p className="text-sm text-neutral-300 max-w-md">
              shavisia.ge გთავაზობთ დამოწმებულ მონაცემთა ბაზას, რომელიც ეხმარება
              ავტომობილების გაქირავების ბიზნესებს პრობლემური დამქირავებლების
              იდენტიფიცირებაში, სანამ ისინი ფინანსურ ზარალს მიაყენებენ
              გამქირავებელს.
            </p>
          </div>
          <div className="flex flex-col items-center text-center gap-4">
            <Image src="/icons/badge-medal.png" alt="" width={88} height={88} />
            <h2 className="font-bold text-lg">
              გამქირავებელზე მორგებული გადაწყვეტა
            </h2>
            <p className="text-sm text-neutral-300 max-w-md">
              შემოუერთდით გამქირავებლების მზარდ ქსელს, რომლებიც რეალურ დროში
              აზიარებენ დამქირავებლების ისტორიის ანგარიშებს, ამცირებენ
              თაღლითობის რისკებს და უზრუნველყოფენ უფრო უსაფრთხო ტრანზაქციებს.
            </p>
          </div>
        </div>
        <div className="max-w-5xl mx-auto mt-16 text-sm text-neutral-300 flex flex-col gap-2">
          <p>Support: shavisia@mail.ge</p>
          <p>Copyright © 2026 shavisia.ge</p>
        </div>
      </footer>
    </div>
  );
}
