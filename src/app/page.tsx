import Image from "next/image";
import SearchBox from "@/components/SearchBox";
import Header from "@/components/Header";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 flex flex-col min-h-svh">
        <Header />

        <main className="flex-1 flex flex-col items-center justify-center pb-24 px-6 relative -top-10">
          <SearchBox />
        </main>
      </div>

      <footer className="px-6 pb-10 pt-30">
        <div className="max-w-5xl mx-auto grid gap-16 sm:grid-cols-2">
          <div className="flex flex-col items-center text-center gap-4">
            <Image className="opacity-80" src="/icons/shield-star.svg" alt="" width={80} height={80} />
            <h2 className="font-bold text-neutral-200 text-md sm:text-lg">
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
            <Image  className="opacity-80" src="/icons/badge-medal.svg" alt="" width={80} height={80} />
            <h2 className="font-bold text-neutral-200 text-md sm:text-lg">
              გამქირავებელზე მორგებული გადაწყვეტა
            </h2>
            <p className="text-sm text-neutral-300 max-w-md">
              შემოუერთდით გამქირავებლების მზარდ ქსელს, რომლებიც რეალურ დროში
              აზიარებენ დამქირავებლების ისტორიის ანგარიშებს, ამცირებენ
              თაღლითობის რისკებს და უზრუნველყოფენ უფრო უსაფრთხო ტრანზაქციებს.
            </p>
          </div>
        </div>
        <div className="max-w-5xl mx-auto mt-16 text-center sm:text-left text-sm text-neutral-300 flex flex-col gap-2">
          <p>Support: info@shavisia.ge</p>
          <p>Copyright © 2026 shavisia.ge</p>
        </div>
      </footer>
    </div>
  );
}
