import Link from 'next/link';
import { buttonClass } from '@/components/dashboard/ui';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#FF5A1F]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display mt-1 text-4xl leading-none text-[#0A0A0A] sm:text-5xl dark:text-white">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 print-hidden">{actions}</div> : null}
    </div>
  );
}

export function ActionLink({
  href,
  children,
  variant = 'primary',
}: {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'outline' | 'secondary' | 'ghost';
}) {
  return (
    <Link href={href} className={buttonClass(variant, 'md')}>
      {children}
    </Link>
  );
}
