'use client';
import { Card, Title, BarChart, Subtitle } from "@tremor/react";

type AnnualSpendingData = {
  year: number,
  number_of_anatheseis: number,
  number_of_payments: number
};

export function AnnualSpendingDecisionsChart({ perYear }: { perYear: AnnualSpendingData[] }) {
  const barChartData = perYear?.map((item: AnnualSpendingData) => ({ year: item?.year, "Αναθέσεις": item.number_of_anatheseis, "Πληρωμές": item.number_of_payments }));

  return (
    <BarChart className="mt-6"
      data={barChartData}
      index="year"
      categories={[
        "Αναθέσεις",
        "Πληρωμές"
      ]}
      colors={["green", "blue"]}
      yAxisWidth={48}
    />
  );
}