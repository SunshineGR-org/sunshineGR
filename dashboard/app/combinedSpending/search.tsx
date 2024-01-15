'use client';

import { DateRangePicker, DateRangePickerValue, TextInput, Grid, SelectBox, SelectBoxItem, MultiSelectBox, MultiSelectBoxItem, Col } from '@tremor/react';
import { getOrganizations } from '../../lib/rockset';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { el } from "date-fns/locale";
import { Button } from "@tremor/react";
import { useTransition } from 'react';
import { updateSearchData } from './actions';
import { useRouter, usePathname } from 'next/navigation'
import { buildURLSearchParams } from '../../lib/utils';
import { Multiselect } from 'multiselect-react-dropdown'
import { sub, format } from 'date-fns'
import queryString from 'query-string';

export default function SearchBar({ organizations, vendors }: { organizations: any, vendors:any }) {
  const searchParams = useSearchParams();
  const [organizationSelectValue, setOrganizationSelectValue] = useState<string[] | undefined>(searchParams?.getAll("organizations"));
  const [vendorSelectValue, setVendorSelectValue] = useState<string[] | undefined>(searchParams?.getAll("vendors") ?? undefined);
  let searchDateRange: DateRangePickerValue | undefined = undefined;
  if ((searchParams?.get("startDate") ?? undefined) && (searchParams?.get("endDate") ?? undefined)) {
    // @ts-ignore: Object is possibly 'null'.
    searchDateRange = [new Date(searchParams.get("startDate")), new Date(searchParams.get("endDate"))];
  }
  const [dateRange, setDateRange] = useState<DateRangePickerValue | undefined>(searchDateRange);
  const router = useRouter();
  const pathname = usePathname();
  let searchProps = {};
  let urlString = '';

  useEffect(() => {
    searchProps = {
      organizations: organizationSelectValue,
      vendors:vendorSelectValue,
      startDate: dateRange?.[0]?.toISOString().split('T')[0],
      endDate: dateRange?.[1]?.toISOString().split('T')[0]
    };

 
    urlString = `${pathname}?${queryString.stringify(searchProps, { skipEmptyString: true })}`;
  }, [organizationSelectValue, vendorSelectValue, dateRange]);

  return (
    <Grid className="gap-6" numCols={6} numColsSm={2} numColsLg={6}>
      <Col numColSpan={2} numColSpanSm={1} numColSpanLg={2}>
        <MultiSelectBox value={organizationSelectValue} placeholder="Οργανισμοι..." onValueChange={(value) => setOrganizationSelectValue(value)}>
          {organizations.map((item: any) => (
            <MultiSelectBoxItem key={item.uid} value={item.uid} text={item.uid_label} />
          ))}
        </MultiSelectBox>
      </Col>
      <Col numColSpan={2} numColSpanSm={1} numColSpanLg={2}>
        <MultiSelectBox value={vendorSelectValue} placeholder="Ανάδοχοι..." onValueChange={(value) => setVendorSelectValue(value)}>
          {vendors.map((item: any) => (
            <MultiSelectBoxItem key={item.afm} value={item.afm} text={item.name} />
          ))}
        </MultiSelectBox>
      </Col>
      <Col numColSpan={2} numColSpanSm={1} numColSpanLg={2}>
        <DateRangePicker
          className="max-w-md mx-auto"
          locale={el}
          enableDropdown={true}
          placeholder="Ημερομηνίες..."
          dropdownPlaceholder=''
          value={dateRange}
          onValueChange={(value) => setDateRange(value)}
          options={[
            { value: 'a', text: 'Όλα', startDate: new Date(2010, 1, 1), endDate: new Date() },
            { value: 'w', text: '< 7 μέρες', startDate: sub(new Date(), { days: 7 }) },
            { value: 'm', text: '< 30 ημέρες', startDate: sub(new Date(), { days: 30 }) },
            { value: 'y', text: '< 1 χρόνος', startDate: sub(new Date(), { years: 1 }) },
            { value: '4y', text: '< 4 χρόνια', startDate: sub(new Date(), { years: 4 }) },
            { value: '8y', text: '< 8 χρόνια', startDate: sub(new Date(), { years: 8 }) }
          ]}
          minDate={new Date(2010, 1, 1)}
          maxDate={new Date()}
        />
      </Col>
      <Button onClick={() => router.push(urlString)} >
        Αναζήτηση
      </Button >
    </Grid >
  );
}
