import Image from 'next/image';
import grass from './assets/welcome-grass.png';
import puppies from './assets/welcome-puppies.png';
import hearts from './assets/welcome-hearts.png';
import logo from './assets/welcome-logo.png';
import divider from './assets/welcome-divider.png';

/** Original 941 × 1672 artboard proportions, scaled fluidly to the phone column. */
export function Welcome({ onStart }: { onStart: () => void }) {
  return <div className="@container mx-auto w-full max-w-[430px] font-[family-name:var(--font-yini-welcome)]">
    <div className="relative aspect-[941/1672] overflow-hidden bg-[#FDF6EE]">
      <Image src={grass} alt="" priority className="absolute top-[38.76%] left-[4.99%] h-[11.36%] w-[89.48%]" />
      <Image src={puppies} alt="Corgi and schnauzer puppies cuddling" priority className="absolute top-[12.14%] left-[7.55%] h-[34.09%] w-[85.12%]" />
      <Image src={hearts} alt="" priority className="absolute top-[11.24%] left-[8.08%] h-[22.61%] w-[78.75%]" />
      <Image src={logo} alt="yini" priority className="absolute top-[46.41%] left-[26.89%] h-[11.78%] w-[47.29%]" />
      <h1 className="absolute top-[60.53%] w-full text-center text-[5.526cqw] leading-[1.2] font-extrabold tracking-[-0.053cqw] text-[#3A2418]">A little Yini goes a long way</h1>
      <p className="absolute top-[65.31%] w-full text-center text-[3.40cqw] leading-[1.3] font-medium text-[#6B5A50]">10 seconds a day to grow closer</p>
      <Image src={divider} alt="" className="absolute top-[70.87%] left-[41.34%] h-[3.65%] w-[17.32%]" />
      <p className="absolute top-[79.78%] w-full text-center text-[2.87cqw] leading-[1.3] font-medium text-[#7D6D63]">For couples, friends, and family</p>
      <button type="button" onClick={onStart} className="absolute top-[84.33%] left-[13.39%] flex h-[8.13%] min-h-11 w-[73.22%] cursor-pointer items-center justify-center gap-[2.98cqw] rounded-full bg-[#EC8D74] text-[4.68cqw] font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9E4A33]">
        Get started <svg className="h-[3.61cqw] w-[2.34cqw]" viewBox="0 0 22 34" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4 L17 17 L4 30" /></svg>
      </button>
    </div>
  </div>;
}
