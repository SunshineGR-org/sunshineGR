'use client';
import { Disclosure } from '@headlessui/react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';


export default async function Disclaimer() {
    return (
        <main className="p-4 md:p-10 mx-auto max-w-7xl">
      <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-2">
        <Disclosure>
          {({ open }) => (
            <>
              <Disclosure.Button className="flex w-full justify-between rounded-lg bg-purple-100 px-4 py-2 text-left text-sm font-medium text-purple-900 hover:bg-purple-200 focus:outline-none focus-visible:ring focus-visible:ring-purple-500 focus-visible:ring-opacity-75">
                <span>Σχετικά με τα δεδομένα της Διάυγειας</span>
                <ChevronDownIcon
                  className={`${
                    open ? 'rotate-180 transform' : ''
                  } h-5 w-5 text-purple-500`}
                />
              </Disclosure.Button>
              <Disclosure.Panel className="px-4 pt-4 pb-2 text-sm text-gray-500">
                <div>
                Το ekloges2023.sunshinegr.org περιέχει δεδομένα της Διαύγειας μέχρι και τον Δεκέμβριο του 2022. 
                H Διαύγεια, και ως αποτέλεσμα και το παρόν site, εμπεριέχουν λάθη, όπως παραλείψεις 
                σε ποσά, όνομα και ΑΦΜ αναδόχου. ΜΗΝ χρησιμοποιήσετε τα παρόν δεδομένα για οποιοδήποτε σκοπό, πριν
                μελετήσετε και επιβεβαιώσετε τις επιμέρους αποφάσεις. 
                </div>
                <div className='pt-2'>
                Περισσότερες πληροφορίες σχετικά με τη λειτουργεία του SunshineGR μπορείτε να 
                βρείτε <Link href={'https://docs.google.com/document/u/1/d/e/2PACX-1vQtZF5J19l5HhqAwh7-iDie3j3IkSU59u_mwEbbSyJo0QK5ZDI8_KbuPqwklkqCx1m4SFLyLU--jTVd/pub'} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">εδω</Link>.
                </div>
              </Disclosure.Panel>
            </>
          )}
        </Disclosure>
        </div>
    </main>
    )}
