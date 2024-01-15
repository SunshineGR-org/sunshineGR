import { kv } from "@vercel/kv";
import { getServerSession } from "next-auth";
import { authOptions } from "../pages/api/auth/[...nextauth]";
import { UserData } from "./types";

export type SearchParams = { [key: string]: string | null };

export function buildURLSearchParams(params: SearchParams): string {
  const queryParams = Object.entries(params)
    .filter(([_, value]) => (value !== null) && (value !== undefined) && (value !== ''))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value as string)}`)
    .join('&');

  return queryParams;
}

export const moneyFormatter = (number: number) =>
  Intl.NumberFormat('el', { notation: "compact", style: "currency", currency: "eur", minimumFractionDigits: 2 }).format(number);

export const smallMoneyFormatter = (number: number) =>
  Intl.NumberFormat('el', { notation: "compact", style: "currency", currency: "eur", minimumFractionDigits: 0 }).format(number).toString();

export const numberFormatter = (number: number) =>
  Intl.NumberFormat("el").format(number).toString();

export async function getUserData() { 
  const session = await getServerSession(authOptions);
  let userData : UserData | undefined;
  if (session?.user?.email) { 
   userData =  await kv.get(session.user.email) ?? undefined;
  }
  return userData;
}