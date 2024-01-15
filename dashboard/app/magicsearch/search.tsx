'use client';

import { DateRangePicker, DateRangePickerValue, TextInput, Grid, SelectBox, SelectBoxItem, MultiSelectBox, MultiSelectBoxItem, Col } from '@tremor/react';
import { Button } from "@tremor/react";
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { buildURLSearchParams, SearchParams } from '../../lib/utils';

export default function SearchBar() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  var _q: string = '';

  const handleSearchClick = async (searchProps: SearchParams) => {
    console.log(searchProps);
    const urlString = `${pathname}?${buildURLSearchParams(searchProps)}`;
    console.log(urlString);
    router.push(urlString);
  }

  return (
    <Grid className="gap-6" numCols={6} numColsSm={3} numColsLg={6}>
      <Col numColSpan={4} numColSpanSm={2} numColSpanLg={4}>
        <TextInput type="text" placeholder="περιγραψτε τι αποφασεις σας ενδιαφέρουν..." onChange={
          ((e) => _q = e.target.value)
        } />
      </Col>
      <Col numColSpan={2} numColSpanSm={1} numColSpanLg={2}>
        <Button onClick={() => handleSearchClick(
          {
            q: _q
          }
        )} >
          Αναζήτηση
        </Button>
      </Col>
    </Grid >
  );
}