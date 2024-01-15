import { Col, List, ListItem, Grid, Card, Title, Text, BarList, Metric, Flex, Badge, Callout } from '@tremor/react';
import { getAnatheseisSummary, getOrganizations, getPaymentsSummary } from '../lib/rockset';
import { getDecisionBreakdown, getDecisionsByYear } from '../lib/rockset'
import { getUserData, moneyFormatter, numberFormatter, smallMoneyFormatter } from '../lib/utils';
import { AnnualDecisionBreakdown, DecisionBreakdown, Organization } from '../lib/types';
import { Suspense } from 'react';
import { OrganizationsTable } from '../lib/tables';
import { NoOrg } from '../lib/errors';
import Mixpanel from 'mixpanel';

export const dynamic = 'force-dynamic';

const valueFormatter = (number: number) =>
  `$ ${Intl.NumberFormat("us").format(number).toString()}`;

export default async function IndexPage({
  searchParams
}: {
  searchParams: { q: string };
}) {
  const userData = await getUserData();
  const mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN as string, {host: 'api-eu.mixpanel.com'});
  mixpanel.track("Home", { 'distinct_id': userData?.uid});

  
  const organizationsData: Promise<Organization[]> = getOrganizations();
  const breakdownData: Promise<DecisionBreakdown[]> = getDecisionBreakdown();
  const anatheseisData = getAnatheseisSummary();
  const paymentsData = getPaymentsSummary();
  const annualBreakdownData: Promise<AnnualDecisionBreakdown[]> = getDecisionsByYear();

  const [organizations, breakdown, anatheseis, payments, annualBreakdown] = await Promise.all([organizationsData, breakdownData, anatheseisData, paymentsData, annualBreakdownData]);

  const annual_data = annualBreakdown.map((item: AnnualDecisionBreakdown) => ({ name: item?.year.toString(), value: item?.count }));
  const data = breakdown.map((item: DecisionBreakdown) => ({
    name: `${item.type_id}:${item.type}`,
    value: item.count
  }));


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
        <Grid numCols={4} className="mt-6">
          <Col numColSpan={4}>
            <Card>
              <Title>Οργανισμός και Εποπτευόμενοι Φορείς</Title>
              <Text>
                Έχετε πρόσβαση στις αποφάσεις των παρακάτω οργανισμών.
              </Text>
              <div className='mt-6'>
                <OrganizationsTable organizations={organizations} />
              </div>
            </Card>
          </Col>
          <Col numColSpan={2}>
            <Card className="mt-6">
              <Suspense fallback={<div>Loading...</div>}>
                <Flex>
                  <Title>Αναθέσεις</Title>
                  <Callout title="Σύνολο">{moneyFormatter(anatheseis.amount)}</Callout>
                </Flex>
                <Metric>{numberFormatter(anatheseis.count)} αποφάσεις</Metric>
                <Flex className="mt-4">
                  <Text>{anatheseis.countNoAmount} χωρίς ποσό</Text>
                  <Text>{`${anatheseis.count45k} < ${smallMoneyFormatter(45000)}`}</Text>
                </Flex>
              </Suspense>
            </Card>
          </Col>
          <Col numColSpan={2}>
            <Card className="ml-6 mt-6">
              <Flex>
                <Title>Πληρωμές</Title>
                <Callout title="Σύνολο">{moneyFormatter(payments.amount)}</Callout>
              </Flex>
              <Metric>{numberFormatter(payments.count)} αποφάσεις</Metric>
              <Flex className="mt-4">
                <Text>{payments.countNoAmount} χωρίς ποσό</Text>
                <Text>{`${payments.count45k} < ${smallMoneyFormatter(45000)}`}</Text>
              </Flex>
            </Card>
          </Col>

        </Grid>
        <Grid numCols={4} className="mt-6">
          <Col numColSpan={2}>
            <Card>
              <Title>Αποφάσεις ανά έτος</Title>
              {/* <BarChart
          className="mt-6"
          data={annualBreakdownData}
          index="year"
          categories={["number_of_decisions"]}
          colors={["blue"]}
          valueFormatter={valueFormatter}
        /> */}
              <BarList data={annual_data} />
            </Card>
          </Col>
          <Col numColSpan={2}>
            <Card className="ml-6">
              <Title>Αποφάσεις ανά τύπο</Title>
              <BarList data={data} />
            </Card>
          </Col>
        </Grid>
      </main >
    );
  }
}
