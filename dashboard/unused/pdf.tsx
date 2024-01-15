'use client';

import WebViewer from '@pdftron/pdfjs-express-viewer';
import { useEffect, useRef } from 'react';


 
const PdfComponent = ({url} : { url: string}) => {
    const viewer = useRef(null);
  
    useEffect(() => {
      WebViewer(
        {
          path: '/webviewer/lib',
          initialDoc: url,
        },document.getElementById('viewer')).then(instance => {
            const { documentViewer } = instance.Core;
        
            documentViewer.addEventListener('documentLoaded', () => {
              // perform document operations
            })});
    //   ).then((instance:any) => {
    //       // now you can access APIs through the WebViewer instance
    //       const { documentViewer } = instance;
    //       documentViewer.on('documentLoaded', () => {
    //         console.log('document loaded');
  
    //     });
      }, []);
  
    return (
      <div className="MyComponent">
        <div className="header">React sample</div>
        <div className="webviewer" ref={viewer}></div>
      </div>
    );
  };

  export default PdfComponent;