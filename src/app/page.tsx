"use client";

import { useState } from "react";
import { useBattlecard } from "@/hooks/useBattlecard";
import { SearchForm, BattleCardView } from "@/components/battlecard";

export default function Home() {
  const [competitor, setCompetitor] = useState("");
  const battlecard = useBattlecard();

  const handleSubmit = (value: string) => {
    setCompetitor(value);
    battlecard.mutate(value);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="flex flex-col justify-start gap-8 max-w-4xl mx-auto">
        <header>
          <h1 className="text-3xl font-semibold">CounterSignal</h1>
          <p className="text-muted-foreground">
            Real-time Competitive Sales Engine for BFSI AEs
          </p>
        </header>

        <SearchForm
          value={competitor}
          onChange={setCompetitor}
          onSubmit={handleSubmit}
          isLoading={battlecard.isPending}
        />

        <BattleCardView
          competitor={competitor}
          markdown={battlecard.data?.markdown || ""}
          data={battlecard.data?.data}
          isLoading={battlecard.isPending}
        />
      </div>
    </div>
  );
}
