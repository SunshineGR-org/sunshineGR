'use client';
import { Button, Title, Card } from "@tremor/react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default async function LoginPage() {
  const callbackUrl = useSearchParams()?.get('callbackUrl') ?? undefined;
  console.log(callbackUrl);
  return (
    <main className="grid grid-cols-1 place-content-center h-screen">
      <Card className="max-w-md mx-auto place-content-center text-center">
        <Title className="place-content-center mt-10">Καλώς ήρθες στο SunshineGR.</Title>
        <Button className="mt-10 mb-10" onClick={() => signIn("google", { callbackUrl: callbackUrl })}>Σύνδεση με Google</Button>
      </Card >
    </main >
  );
}
