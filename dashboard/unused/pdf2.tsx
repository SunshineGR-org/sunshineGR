'use client';
import React, { useState } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import dynamic from "next/dynamic";

const PDFViewer = dynamic(() => import("./pdf-viewer"), {
  ssr: false
});

export default function PDF({url} : { url: string}) {
  return <PDFViewer url={url}/>;
}
