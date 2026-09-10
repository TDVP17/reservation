//app/page.tsx
export const dynamic = "force-dynamic";
import Hero from "@/components/Hero";
import VoyagesPopulaires from "@/components/VoyagesPopulaires";


export default function HomePage() {
  return (
    <>
      <Hero />
      <VoyagesPopulaires />
    </>
  );
}


