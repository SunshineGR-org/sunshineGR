import { Card, Metric, Text, Flex, Grid, Title, BarList } from '@tremor/react';
import Chart from './chart';
import SearchBar from './search';
import { BudgetApprovalsDecisionTable } from '../../lib/tables';
import { getOrganizations, getBudgetApprovalDecisions } from '../../lib/rockset';
import { getUserData, moneyFormatter, numberFormatter, smallMoneyFormatter } from '../../lib/utils';
import { SpendingFilter } from '../../lib/types';
import { AnnualSpendingDecisionsChart } from '../../lib/charts';
import { NoOrg } from '../../lib/errors';
import Mixpanel from 'mixpanel';
import Disclaimer from '../../lib/disclaimer';

export default async function BudgetApprovalsPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: SpendingFilter;
}) {
  const userData = await getUserData();
  const mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN as string, {host: 'api-eu.mixpanel.com'});
  mixpanel.track("BudgetApprovals", { 'distinct_id': userData?.uid});

  if (typeof (searchParams?.organizations) === 'string') {
    searchParams.organizations = [searchParams.organizations];
  }
  if (typeof (searchParams?.vendors) === 'string') { 
    searchParams.vendors = [searchParams.vendors];
  }
  console.log("Rendering with search params: ", searchParams);
  const organizationsData = getOrganizations();
  const decisionsData = getBudgetApprovalDecisions(searchParams);

  const [organizations, decisions] = await Promise.all([organizationsData, decisionsData])

  if (organizations.length == 0) {
    return (
      <main className="p-4 md:p-10 mx-auto max-w-7xl">
        <NoOrg />
      </main>
    )
  }
  else {
  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl">
      {/* @ts-expect-error Server Component */}
      <Disclaimer />  
      <SearchBar organizations={organizations}/>
      <Grid className="mt-8 gap-6" numCols={1} numColsSm={2} numColsLg={3}>
        <Card>
          <Title>Αποφάσεις Εγκρίσεων Προυπολογισμού</Title>
          <Metric>{decisions.length}</Metric>
        </Card>
      </Grid>
      {/* <Card className="mt-6">
        <Title className="mb-4">Αποφάσεις Ανά Έτος</Title>
        <AnnualSpendingDecisionsChart perYear={perYear} />
      </Card> */}
      <Card className="mt-6">
        <Title className="mb-4">Πρόσφατες Αποφάσεις</Title>
        <BudgetApprovalsDecisionTable decisions={decisions} />
      </Card>
    </main>
  );
  }
}
