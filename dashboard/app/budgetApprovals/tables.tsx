import { Text, Card, Title, Grid, Flex, Col, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@tremor/react';
import Link from 'next/link'
import { Tooltip } from 'react-tooltip'
import { moneyFormatter } from '../../lib/utils'
import { VendorAssignments } from '../../lib/types'

const columns = [
  { key: 'id', name: 'ID' },
  { key: 'title', name: 'Title' }
];

const rows = [
  { id: 0, title: 'Example' },
  { id: 1, title: 'Demo' }
];

function truncate(str: string, n: number) {
  if (str === null) return str;
  return (str.length > n) ? str.slice(0, n - 1) + '...' : str;
};
