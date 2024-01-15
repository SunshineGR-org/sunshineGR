'use client';

import { AnatheseisDecisionsWithAI } from "../../lib/types";
import { useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

// import 'ag-grid-community/dist/styles/ag-grid.css';
// import 'ag-grid-community/dist/styles/ag-theme-alpine.css';

export default function Table({ decisions }: { decisions: AnatheseisDecisionsWithAI[] }) {
  const columnDefs = [
    { headerName: 'ΑΔΑ', field: 'ada' },
    { headeName: 'Ημερομηνία', field: 'date.value', sortable: true },
    { headerName: 'Τίτλος', field: 'subject' },
    { headerName: 'Ποσό', field: 'amount', sortable: true, filter: 'agNumberColumnFilter' },
    { headerName: 'Ανάδοχος', field: 'vendor_name', sortable: true, filter: true },
    { headerName: 'ΑΦΜ Αναδόχου', field: 'vendor_afm' },
    { headerName: 'Σκορ', field: 'score', sortable: true }
  ];

  return (
    // <div
    //   className="ag-theme-alpine"
    //   style={{ height: '600px' }}
    // >
    <div
      className="ag-theme-alpine"
      style={{ height: '600px' }}
    >
      <AgGridReact
        columnDefs={columnDefs}
        rowData={decisions}
      // style={{ height: '100%', width: '100%' }}
      />
    </div >
  )
}