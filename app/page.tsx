'use client'

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-4">MindFlow</h1>
        <p className="text-gray-600 mb-8 text-lg">Your AI-powered learning companion</p>
        
        <Link href="/ask">
          <Button size="lg" className="font-semibold">
            Start Learning
          </Button>
        </Link>
      </div>
    </main>
  );
}
