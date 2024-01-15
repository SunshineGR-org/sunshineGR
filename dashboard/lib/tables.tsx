'use client';

import { AnatheseisDecisionsWithAI, VendorAssignments, SpendingDecisions as SpendingDecisions, Organization, Decisions } from "./types";
import { usePathname, useSearchParams } from 'next/navigation';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { moneyFormatter, smallMoneyFormatter, numberFormatter } from "./utils";
import { ValueFormatterParams } from "ag-grid-community";
import Link from 'next/link';

function standardTable(columns: any, rows: any) {
  return (
    <div
      className="ag-theme-alpine"
      style={{ height: '600px' }}
    >
      <AgGridReact
        columnDefs={columns}
        rowData={rows}
        // style={{ height: '100%', width: '100%' }}
        defaultColDef={{ flex: 1, resizable: true }}
      />
    </div >

  )
}

export function BudgetApprovalsDecisionTable({ decisions }: { decisions: Decisions[] }) {
  const columnDefs = [
    {
      headerName: 'ΑΔΑ', valueGetter: function (params: any) {
        return { ada: params.data.ada, url: `${params.data.documentUrl}?inline=true` }
      }, cellRenderer: function (params: any) {
        return (<a 
        // onClick={(e => {
        //   e.preventDefault();
        //   setCurrentPdfUrl(params.value.url);
        //   setIsOpen(true);
        // })} 
        href={params.value.url} target="_blank">{params.value.ada}
      </a>);
      },
      cellStyle: {
        color: "blue",
        "text-decoration": "underline",
        cursor: "pointer"
      }
    },
    { headerName: 'Ημερομηνία', field: 'date.value', sortable: true },
    { headerName: 'Οργανισμός', field: 'organizationLabel', sortable: true, tooltipField: 'organizationLabel' },
    { headerName: 'Τίτλος', field: 'subject', tooltipField: 'subject', minWidth: 400, filter: true },
  ];
  return standardTable(columnDefs, decisions);
}



export function SpendingDecisionsTable({ decisions }: { decisions: SpendingDecisions[] }) {
  const columnDefs = [
    {
      headerName: 'ΑΔΑ', valueGetter: function (params: any) {
        return { ada: params.data.ada, url: `${params.data.documentUrl}?inline=true` }
      }, cellRenderer: function (params: any) {
        return (<a 
        // onClick={(e => {
        //   e.preventDefault();
        //   setCurrentPdfUrl(params.value.url);
        //   setIsOpen(true);
        // })} 
        href={params.value.url} target="_blank">{params.value.ada}
      </a>);
      },
      cellStyle: {
        color: "blue",
        "text-decoration": "underline",
        cursor: "pointer"
      }
    },
    { headerName: 'Ημερομηνία', field: 'date.value', sortable: true },
    { headerName: 'Τίτλος', field: 'subject', tooltipField: 'subject', minWidth: 400 },
    { headerName: 'Ποσό', field: 'amount', sortable: true, filter: 'agNumberColumnFilter', valueFormatter: function (params: any) { return smallMoneyFormatter(params.value) } },
    // {headerName: 'Ανάδοχος', field: 'vendor_name', sortable: true, filter: true, tooltipField: 'vendor_name', minWidth: 200 },
    // {headerName: 'ΑΦΜ Αναδόχου', field: 'vendor_afm' },
    { headerName: 'Τύπος', field: 'decisionTypeId' },
  ];
  return (
  <>
      <div
        className="ag-theme-alpine"
        style={{ height: '600px' }}
      >
        <AgGridReact
          columnDefs={columnDefs}
          rowData={decisions}
          defaultColDef={{ flex: 1, resizable: true }}
        />
      </div>
    </>
  );
}

export function SpendingDecisionsTableWithScore({ decisions }: { decisions: AnatheseisDecisionsWithAI[] }) {
  const columnDefs = [
    {
      headerName: 'ΑΔΑ', valueGetter: function (params: any) {
        return { ada: params.data.ada, url: `${params.data.documentUrl}?inline=true` }
      }, cellRenderer: function (params: any) {
        return (<a 
        // onClick={(e => {
        //   e.preventDefault();
        //   setCurrentPdfUrl(params.value.url);
        //   setIsOpen(true);
        // })} 
        href={params.value.url} target="_blank">{params.value.ada}
      </a>);
      },
      cellStyle: {
        color: "blue",
        "text-decoration": "underline",
        cursor: "pointer"
      }
    },
    { headerName: 'Ημερομηνία', field: 'date.value', sortable: true },
    { headerName: 'Τίτλος', field: 'subject', tooltipField: 'subject', minWidth: 400 },
    { headerName: 'Ποσό', field: 'amount', sortable: true, filter: 'agNumberColumnFilter', valueFormatter: function (params: any) { return smallMoneyFormatter(params.value) } },
    // {headerName: 'Ανάδοχος', field: 'vendor_name', sortable: true, filter: true, tooltipField: 'vendor_name', minWidth: 200 },
    // {headerName: 'ΑΦΜ Αναδόχου', field: 'vendor_afm' },
    { headerName: 'Τύπος', field: 'decisionTypeId' },
    { headerName: 'Σκορ', field: 'score', sortable: true }
  ];
  return (
  <>
      <div
        className="ag-theme-alpine"
        style={{ height: '600px' }}
      >
        <AgGridReact
          columnDefs={columnDefs}
          rowData={decisions}
          defaultColDef={{ flex: 1, resizable: true }}
        />
      </div>
    </>
  );
}

export function AnatheseisDecisionsWithAITable({ decisions }: { decisions: AnatheseisDecisionsWithAI[] }) {
  const columnDefs = [
    { headerName: 'ΑΔΑ', field: 'ada' },
    { headeName: 'Ημερομηνία', field: 'date.value', sortable: true },
    { headerName: 'Τίτλος', field: 'subject' },
    { headerName: 'Ποσό', field: 'amount', sortable: true, filter: 'agNumberColumnFilter' },
    { headerName: 'Ανάδοχος', field: 'vendor_name', sortable: true, filter: true },
    { headerName: 'ΑΦΜ Αναδόχου', field: 'vendor_afm' },
    { headerName: 'Σκορ', field: 'score', sortable: true }
  ];

  return standardTable(columnDefs, decisions);


}

export function SpendingPerVendorTable({ vendors }: { vendors: VendorAssignments[] }) {
  const pathname = usePathname();
  const currentSearchParams = useSearchParams();
  const columnDefs = [
    {
      headerName: 'Επωνυμία', sortable: true, filter: true, tooltipField: 'vendor_name', minWidth: 450, valueGetter: function (params: any) {
        return { vendor_name: params.data.vendor_name, vendor_afm: params.data.vendor_afm }
      }, cellRenderer: function (params: any) {
        const searchParams = new URLSearchParams(currentSearchParams?.toString());
        if (params.value.vendor_afm === 'ΜΗ ΔΙΑΘΕΣΙΜΟ') {
          return <span>ΜΗ ΔΙΑΘΕΣΙΜΟ</span>
        }
        searchParams.set('vendors', params.value.vendor_afm);
        const url = `${pathname}?${searchParams.toString()}`;
        // Do not use <Link> here, because it will not work with the ag-grid cellRenderer.
        // When scrolling, the row that gets selected when scroll stops would trigger
        // the Link and cause multiple page changes that would either melt Rockset
        // or direct you to an uninteded page.
        return <a href={url}>{params.value.vendor_name}</ a >;
      },
      cellStyle: {
        color: "blue",
        "text-decoration": "underline",
        cursor: "pointer"
      }
    },
    { headerName: 'ΑΦΜ', field: 'vendor_afm' },
    { headerName: 'Αριθμός Αναθέσεων', field: 'number_of_assignments', sortable: true, valueFormatter: function (params: any) { return numberFormatter(params.value) } },
    { headerName: 'Συνολικό Ποσό', field: 'totalAmount', sortable: true, valueFormatter: function (params: any) { return moneyFormatter(params.value) } }
  ];

  return standardTable(columnDefs, vendors);
}

export function OrganizationsTable({ organizations }: { organizations: Organization[] }){
  const columnDefs = [
    {headerName: 'Όνομα', field: 'label'},
    {headerName: 'Διαύγεια ID', field: 'uid'}
  ];
  return standardTable(columnDefs, organizations);

}

