
// import { semanticSearch } from '../../lib/rockset';
import { semanticSearch } from '../../lib/rockset';
import { MagicSearchQuery } from '../../lib/types';
import SearchBar from './search';
import { Card, Title, Text, Metric, Flex, Grid } from '@tremor/react';
import { SpendingDecisionsTable, SpendingDecisionsTableWithScore } from '../../lib/tables';

export default async function MagicSearchPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: MagicSearchQuery;
}) {
  console.log(searchParams);
  let decisions: any = [];
  if (searchParams?.q) {
    decisions = await semanticSearch(searchParams.q);
  }
  // decisions = searchParams?.q ? await semanticSearch(searchParams?.q as string) : [];
  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl">
      <SearchBar />
      <Card className="mt-6">
        <Title className="mb-4">Σχετικές Αποφάσεις</Title>
        <SpendingDecisionsTableWithScore decisions={decisions} />
      </Card>

    </main>
  );
}
