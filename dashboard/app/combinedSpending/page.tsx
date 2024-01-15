import { Card, Metric, Text, Flex, Grid, Title, BarList } from '@tremor/react';
import Chart from './chart';
import SearchBar from './search';
import { SpendingPerVendorTable, SpendingDecisionsTable } from '../../lib/tables';
import { getOrganizations, getCombinedSpendingPerVendor, getAnatheseisSummary, getPaymentsSummary, getCombinedSpendingDecisions, getSpendingDecisionsByYear, getVendors } from '../../lib/rockset';
import { getUserData, moneyFormatter, numberFormatter, smallMoneyFormatter } from '../../lib/utils';
import { SpendingFilter } from '../../lib/types';
import { AnnualSpendingDecisionsChart } from '../../lib/charts';
import { NoOrg } from '../../lib/errors';
import Mixpanel from 'mixpanel';
import Disclaimer from '../../lib/disclaimer';

export default async function AnatheseisPliromesPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: SpendingFilter;
}) {
  const userData = await getUserData();
  const mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN as string, {host: 'api-eu.mixpanel.com'});
  mixpanel.track("CombinedSpending", { 'distinct_id': userData?.uid});

  if (typeof (searchParams?.organizations) === 'string') {
    searchParams.organizations = [searchParams.organizations];
  }
  if (typeof (searchParams?.vendors) === 'string') { 
    searchParams.vendors = [searchParams.vendors];
  }
  console.log("Rendering with search params: ", searchParams);
  const anatheseisSummaryData = getAnatheseisSummary(searchParams);
  const paymentsSummaryData = getPaymentsSummary(searchParams);
  const perVendorData = getCombinedSpendingPerVendor(searchParams);
  const decisionsData = getCombinedSpendingDecisions(searchParams);
  const perYearData = getSpendingDecisionsByYear(searchParams);
  const organizationsData = getOrganizations();
  const vendorsData = getVendors();

  const [organizations, vendors, anatheseisSummary, paymentsSummary, perVendor, decisions, perYear] = await Promise.all([organizationsData, vendorsData, anatheseisSummaryData, paymentsSummaryData, perVendorData, decisionsData, perYearData]);

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
      <SearchBar organizations={organizations} vendors={vendors}/>
      <Grid className="mt-8 gap-6" numCols={1} numColsSm={2} numColsLg={3}>
        <Card>
          <Title>Αποφάσεις Αναθέσεων</Title>
          <Metric>{numberFormatter(anatheseisSummary.count)}</Metric>
          <Flex className="mt-4">
            <Text>{anatheseisSummary.countNoAmount} χωρίς ποσό</Text>
            <Text>{`${anatheseisSummary.count45k} < ${smallMoneyFormatter(45000)}`}</Text>
          </Flex>
        </Card>
        <Card>
          <Title>Αποφάσεις Πληρωμών</Title>
          <Metric>{numberFormatter(paymentsSummary.count)}</Metric>
          <Flex className="mt-4">
            <Text>{paymentsSummary.countNoAmount} χωρίς ποσό</Text>
            <Text>{`${paymentsSummary.count45k} < ${smallMoneyFormatter(45000)}`}</Text>
          </Flex>
        </Card>
        <Card>
          <Text>Ανάδοχοι</Text>
          <Metric>{numberFormatter(perVendor?.length)}</Metric>
        </Card>
        <Card>
          <Text>Συνολικό Ποσό Αναθέσεων</Text>
          <Metric>{moneyFormatter(anatheseisSummary.amount)}</Metric>
        </Card>
        <Card>
          <Text>Συνολικό Ποσό Πληρωμών</Text>
          <Metric>{moneyFormatter(paymentsSummary.amount)}</Metric>
        </Card>
      </Grid>
      <Card className="mt-6">
        <Title className="mb-4">Ανά Ανάδοχο</Title>
        <SpendingPerVendorTable vendors={perVendor} />
      </Card>
      <Card className="mt-6">
        <Title className="mb-4">Αποφάσεις Ανά Έτος</Title>
        <AnnualSpendingDecisionsChart perYear={perYear} />
      </Card>
      <Card className="mt-6">
        <Title className="mb-4">Πρόσφατες Αποφάσεις</Title>
        <SpendingDecisionsTable decisions={decisions} />
      </Card>
    </main>
  );
  }
}
