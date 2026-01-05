// src/app/person/[id]/page.tsx
import PersonClient from './PersonClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PersonPage({ params }: PageProps) {
  const { id } = await params;
  
  return <PersonClient personId={id} />;
}
