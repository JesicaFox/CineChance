// src/app/profile/invite/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { redirect } from 'next/navigation';
import InviteClient from './InviteClient';

export default async function InvitePage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gray-950 py-6 md:py-8">
      <div className="container mx-auto px-4 md:px-6 max-w-4xl">
        <InviteClient />
      </div>
    </div>
  );
}
