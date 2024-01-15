'use client';

import { Oval, Bars } from 'react-loader-spinner';
import { Flex, Badge, Button } from '@tremor/react';
export default function Spinner() {
  return (
    <>
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    </>
  );


  // return (
  //   <Flex>
  //     <Badge>
  //       <svg className="animate-spin h-5 w-5 mr-3 ..." viewBox="0 0 24 24">
  //         <!-- ... -->
  //       </svg>
  //       Μαλάκας...
  //     </Badge>
  //     <Bars
  //       height="80"
  //       width="80"
  //       color="#4fa94d"
  //       ariaLabel="bars-loading"
  //       wrapperStyle={{}}
  //       wrapperClass=""
  //       visible={true}
  //     />
  //     <Oval
  //       height={80}
  //       width={80}
  //       color="#4fa94d"
  //       wrapperStyle={{}}
  //       wrapperClass=""
  //       visible={true}
  //       ariaLabel='oval-loading'
  //       secondaryColor="#4fa94d"
  //       strokeWidth={2}
  //       strokeWidthSecondary={2}
  //     />
  //   </Flex>
  // )
};
