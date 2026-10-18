import { notFound } from 'next/navigation';
import { PetSelectionPreview } from '@/components/pets/PetPreviews';

export default function Page() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <PetSelectionPreview />;
}
