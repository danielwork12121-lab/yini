import { notFound } from 'next/navigation';
import { PetAnimationPreview } from '@/components/pets/PetPreviews';

export default function Page() {
  if (process.env.NODE_ENV !== 'development' && process.env.VERCEL_ENV !== 'preview') notFound();
  return <PetAnimationPreview />;
}
