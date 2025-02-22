'use client';

import { Chat } from '@/components/chat';

export default function AskPage() {
  return (
    <div className="min-h-screen">
      <Chat 
        apiKey={process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''} 
      />
    </div>
  );
} 