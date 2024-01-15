import rockset from '@rockset/client';
// import { encoding_for_model } from '@dqbd/tiktoken';
// import { Configuration, OpenAIApi } from 'openai';
import { Decisions, MagicSearchQuery, Organization, SpendingDecisionSummary, SpendingFilter, UserData, Vendor } from './types'
import { CohereEmbeddings } from 'langchain/embeddings/cohere';
const { CharacterTextSplitter, RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
import { list } from 'postcss';
import { QueryParameter } from '@rockset/client/dist/codegen/api';
import { getServerSession } from "next-auth/next"
import { authOptions } from '../pages/api/auth/[...nextauth]';
import { kv } from "@vercel/kv"

const rockset_api_key = process?.env?.ROCKSET_API_KEY ?? '';
const cohere_api_key = process?.env?.COHERE_API_KEY ?? '';

export const rocksetClient = rockset(rockset_api_key, 'https://api.euc1a1.rockset.com');

function formatNumbersWithQuotes(numbers: number[]): string {
  const formattedNumbers = numbers.map(num => `'${num}'`);
  return formattedNumbers.join(',');
}

function formatNumberStringWithQuotes(numbersStr: string[]) {
  return numbersStr.map(num => `'${num}'`).join(',');
}

function buildQueryFilter(filter: SpendingFilter | undefined = undefined): string {
  var queryFilter: string = '';
  if (filter?.organizations !== undefined) {
    queryFilter += ` and array_contains(${JSON.stringify(filter?.organizations.map(x => parseInt(x)))}, d.organizationId)`;
  }
  if (filter?.vendors !== undefined) { 
    console.log(filter?.vendors);
    queryFilter += ` and array_contains(ARRAY_CREATE(${filter?.vendors.map(x=> { return '\''+ x + '\''})}), d.vendor_afm)`;
  }
  if (filter?.afm !== undefined) {
    queryFilter += ` and d.vendor_afm = \'${filter?.afm}\'`;
  }
  if (filter?.startDate !== undefined && filter?.startDate !== '') {
    queryFilter += ` and d.date >= PARSE_DATE('%Y-%m-%d','${filter?.startDate}')`;
  }
  if (filter?.endDate !== undefined && filter?.endDate !== '') {
    queryFilter += ` and d.date <= PARSE_DATE('%Y-%m-%d', '${filter?.endDate}')`;
  }
  return queryFilter;
}

async function executeQuery(query: string, name: string | undefined = "unnamed", principalOrg: number = 6323) {
  console.log(`Rockset Call: ${name}`);
  // console.log(query);
  const session = await getServerSession(authOptions);
  let userData : UserData | undefined;
  if (session?.user?.email) { 
   userData =  await kv.get(session.user.email) ?? undefined;
  }

  const restrictedOrgs = JSON.stringify(userData?.restrictOrgs ?? []);
  const parameters: Array<QueryParameter> = principalOrg ? [{type:'int',name:'org', value:principalOrg.toString()}, {type:'array', name:'orgs', value: restrictedOrgs}] : [];
   const start = new Date();
  let sql = {query: query, parameters:parameters};  
  return rocksetClient.queries.query({
    sql: sql
  })
    .then((response: any) => {
      console.log(`Rockset Call: ${name} took ${new Date().getTime() - start.getTime()}ms`);
      return response.results;
    })
    .catch((error: any) => {
      console.log(query);
      console.log(error);
    });
}

export async function getAnatheseisSummary(filter: SpendingFilter | undefined = undefined): Promise<SpendingDecisionSummary> {
  var query: string;
  const queryFilter = buildQueryFilter(filter);
  query = `
  with base as
  (SELECT 
  ARBITRARY(d.amount) as amount
  from commons.diavgeia01 d
  where array_contains(:orgs, d.organizationId)
  and d.decisionTypeId in ('Δ.1')
  ${queryFilter}
   group by d.ada
   )
  select 
  count(*) as count,
  count_if(amount <= 45000 and amount > 0) as count45k,
  count_if(amount = 0 or amount is NULL) as countNoAmount,
  sum(amount) as amount
  from base
  `;
  return executeQuery(query, getAnatheseisSummary.name)
    .then((results: any) => results[0]);
}

export async function getPaymentsSummary(filter: SpendingFilter | undefined = undefined): Promise<SpendingDecisionSummary> {
  var query: string;
  const queryFilter = buildQueryFilter(filter);
  query = `
  with base as
  (SELECT 
  sum(d.amount) as amount
  from commons.diavgeia01 d
  where array_contains(:orgs, d.organizationId)
  and d.decisionTypeId in ('Β.2.1','Β.2.2')
  ${queryFilter}
   group by d.ada
   )
  select 
  count(*) as count,
  count_if(amount <= 45000 and amount > 0) as count45k,
  count_if(amount = 0 or amount is NULL) as countNoAmount,
  sum(amount) as amount
  from base
  `;
  return executeQuery(query, getPaymentsSummary.name)
    .then((results: any) => results[0]);
}



// export async function getAnatheseisSummary(filter: SpendingFilter | undefined = undefined): Promise<SpendingDecisionSummary> {
//   var query: string;
//   query = `
//   with flattened as
//   (SELECT 
//   ada, 
//   ARBITRARY(FlatAnatheseis.amount) as amount,
//   ARBITRARY(FlatAnatheseis.organizationId) as organizationId,
//   ARBITRARY(FlatAnatheseis.vendor_afm) as vendor_afm,
//   ARBITRARY(FlatAnatheseis.decisionTypeId) as decisionTypeId,
//   ARBITRARY(FlatAnatheseis.vendor_name) as vendor_name,
//   ARBITRARY(FlatAnatheseis.date) as date
//   from commons.FlatAnatheseis
//   group by ada
//   )
//   SELECT
//   sum(amount) as amount,
//   count(*) as count,
//   count_if(amount <= 45000 and amount > 0) as count45k,
//   count_if(amount = 0 or amount is NULL) as countNoAmount
// FROM flattened
// where decisionTypeId = 'Δ.1'`
//   query += buildQueryFilter(filter);
//   return executeQuery(query, getAnatheseisSummary.name)
//     .then((results: any) => results[0]);
// }

export async function getBudgetApprovalDecisions(filter: SpendingFilter | undefined = undefined): Promise<Decisions[]> {
  var query: string;
  var queryFilter = buildQueryFilter(filter);
  query = `
  SELECT 
  d.ada,
  d.date,
  d.subject,
  d.decisionTypeId,
  d.documentUrl,
  o.label as organizationLabel
  from commons.diavgeia01 d
  join commons.organizations o on d.organizationId = o.uid
  where array_contains(:orgs, d.organizationId)
  and d.decisionTypeId = 'Β.1.1'
  ${queryFilter}
  order by date desc, ada asc
  LIMIT 10000
  `;
  return executeQuery(query, getBudgetApprovalDecisions.name)
    .then((results: any) => results);
}

export async function getCombinedSpendingDecisions(filter: SpendingFilter | undefined = undefined) {
  var query: string;
  var queryFilter = buildQueryFilter(filter);
  query = `
  SELECT 
  d.ada,
  d.date,
  case when d.decisionTypeId = 'Δ.1' then arbitrary(d.amount) else sum(d.amount) end as amount,
  d.subject,
  d.decisionTypeId,
  d.documentUrl
  from commons.diavgeia01 d
  where array_contains(:orgs, d.organizationId)
  ${queryFilter}
  group by ada, date, documentUrl, subject, decisionTypeId
  order by date desc, ada asc
  LIMIT 1000
  `;
  return executeQuery(query, getCombinedSpendingDecisions.name)
    .then((results: any) => results);
};

export async function getCombinedSpendingPerVendor(filter: SpendingFilter | undefined = undefined) {
  var query: string;
  var queryFilter = buildQueryFilter(filter);
  query = `
  with base as 
  (
    select 
    arbitrary(d.vendor_name) as vendor_name,
    d.vendor_afm,
    d.ada,
    case 
    when ARBITRARY(d.decisionTypeId) = 'Δ.1' then arbitrary(d.amount)
    when ARBITRARY(d.decisionTypeId) in ('Β.2.1', 'Β.2.2') then sum(d.amount)
    end as amount
    from commons.diavgeia01 d
    where array_contains(:orgs, d.organizationId)
    and d.decisionTypeId in ('Δ.1', 'Β.2.1', 'Β.2.2')
    ${queryFilter}
    group by vendor_afm, ada
    )
    select
    case when vendor_afm is null or vendor_afm = '' or vendor_afm like '0000%' or vendor_afm like '99999%' or vendor_afm like '0' then 'ΜΗ ΔΙΑΘΕΣΙΜΟ' else vendor_afm end as vendor_afm,
    ARBITRARY(case when vendor_afm is null or vendor_afm = '' or vendor_afm like '0000%' or vendor_afm like '99999%' or vendor_afm like '0' then 'ΜΗ ΔΙΑΘΕΣΙΜΟ' else vendor_name end) as vendor_name,
    count(*) as number_of_assignments,
    sum(amount) as totalAmount
    from base
    group by vendor_afm
    order by number_of_assignments desc, totalAmount desc
`;
  return executeQuery(query, getCombinedSpendingPerVendor.name)
    .then((results: any) => results);
}

export async function getOrganizations() {
  const query =
    `
  SELECT uid, uid_label, label 
  FROM commons.organizations
  where array_contains(:orgs, uid)
  order by label asc
  `;
  return executeQuery(query, getOrganizations.name)
    .then((results: Organization[]) => results.map((item: Organization) => { return { uid: item?.uid?.toString(), uid_label: item?.uid_label, label: item?.label }; }));
}

export async function getVendors() { 
  const query = 
  `
  select
  case 
  when vendor_afm is null or vendor_afm = '' or vendor_afm like '0000%' or vendor_afm like '99999%' or vendor_afm like '0' then 'ΜΗ ΔΙΑΘΕΣΙΜΟ' else vendor_afm end as afm,
  ARBITRARY(case when vendor_afm is null or vendor_afm = '' or vendor_afm like '0000%' or vendor_afm like '99999%' or vendor_afm like '0' then 'ΜΗ ΔΙΑΘΕΣΙΜΟ' else vendor_name end) as name
  from commons.diavgeia01 d 
  where array_contains(:orgs, organizationId)
  group by afm
  order by name asc
  `
  return executeQuery(query, getVendors.name)
  .then((results: Vendor[]) => results.map((item: Vendor) => { return { name: item?.name, afm: item?.afm }; }));

}


export async function getDecisionBreakdown() {
  const query = `with breakdown as 
  (
  select ARBITRARY(d.decisionTypeId) decisionTypeId, d.ada
  from commons.diavgeia01 d
  where array_contains(:orgs, d.organizationId)
  group by ada
  )
  select t.uid as type_id, ARBITRARY(t.label) as type, count(*) as count from breakdown
  join commons.decisiontypes t
  on breakdown.decisionTypeId = t.uid
  group by t.uid
  order by count desc
`;
  return executeQuery(query, getDecisionBreakdown.name)
    .then((results: any) => results);
}

export async function getDecisionsByYear() {
  const query = `
  select EXTRACT(YEAR FROM d.date) as year,
  count(*) as count
  from commons.diavgeia01 d
  where array_contains(:orgs, d.organizationId)
  group by year
  order by year desc`
  return executeQuery(query, getDecisionsByYear.name)
    .then((results: any) => results);
}

export async function getSpendingDecisionsByYear(filter: SpendingFilter | undefined = undefined) {
  var query: string;
  var queryFilter = buildQueryFilter(filter);
  query = `
  with base as 
  (
  select 
  arbitrary(d.date) as date,
  arbitrary(d.decisionTypeId) as decisionTypeId
  from commons.diavgeia01 d
  where array_contains(:orgs, d.organizationId)
  and d.decisionTypeId in ('Δ.1','Β.2.1','Β.2.2')
  ${queryFilter}
  group by d.ada
  )
  select 
  extract(YEAR from date) as year,
  count_if(decisionTypeId = 'Δ.1') as number_of_anatheseis,
  count_if(decisionTypeId != 'Δ.1') as number_of_payments
  from base
  group by year
  order by year asc
  `;
  return executeQuery(query, getSpendingDecisionsByYear.name)
    .then((results: any) => results);
}

export async function semanticSearch(search_query: string | undefined = undefined) {
  console.log(search_query);
  const embeddings_fetcher = new CohereEmbeddings({ verbose: true, apiKey: cohere_api_key, maxConcurrency: 3, modelName: "embed-multilingual-v2.0" });
  const embeddings = await embeddings_fetcher.embedQuery(search_query ?? "");
  console.log(embeddings);
  var query: string;
  query = `
  with relevant_decisions as
  (select ada,
    cosine_sim(embedding, [${embeddings}]) as score 
    from embeddings
    order by score desc 
    limit 10000)
  select 
  relevant_decisions.ada as ada,
  ARBITRARY(d.date) as date, 
  ARBITRARY(d.subject) as subject,
  ARBITRARY(d.documentUrl) as documentUrl,
  ARBITRARY(d.decisionTypeId) as decisionTypeId,
  ARBITRARY(d.amount) as amount,
  ARBITRARY(d.vendor_name) as vendor_name,
  ARBITRARY(d.vendor_afm) as vendor_afm,
  MAX(relevant_decisions.score) as score
  from commons.diavgeia01 d
  join relevant_decisions
  on relevant_decisions.ada = d.ada
  where d.decisionTypeId in ('Δ.1')
  and array_contains(:orgs, d.organizationId)
  group by ada
  order by score desc
`;
  return executeQuery(query, semanticSearch.name)
    .then((results: any) => results);
  // .then((embeddings: any) => { return embeddings; });
}

// export async function semanticSearch(search_query: string) {
//   const enc = encoding_for_model("text-embedding-ada-002");
//   const tokens = Array.from(enc.encode(search_query));
//   return openai.createEmbedding({ model: "text-embedding-ada-002", input: tokens })
//     .then((response: any) => {
//       const embedding = response.data.data[0].embedding
//       console.log(embedding);
//       const query =
//         `select ada, date, vendor_name, vendor_afm, documentUrl, amount, subject,
//         cosine_sim(embedding, [${embedding}]) as score
//         from FlatAnatheseis
//         where embedding is not NULL and length(embedding) > 0
//         order by score desc
//         limit 50`;
//       return executeQuery(query)
//         .then((results: any) => results);
//     });
// }
