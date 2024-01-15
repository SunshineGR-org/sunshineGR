import { Title, Text } from '@tremor/react';
import Search from './search';
import Spinner from '../../lib/spinner';

export default async function Loading() {
  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl">
      <Spinner />
    </main >
  );
}
