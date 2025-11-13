import DiagonalStripes from './DiagonalStripes';

export default function AngledSection({
  children,
  plane = 'left',
  className = '',
}: {
  children: React.ReactNode;
  plane?: 'left' | 'right' | 'none';
  className?: string;
}) {
  return (
    <section className={`relative overflow-hidden ${className}`}>
      {plane !== 'none' && (
        <div
          className={`absolute inset-y-0 ${
            plane === 'left'
              ? 'left-0 w-[68%] angle-clip'
              : 'right-0 w-[68%] angle-clip-r'
          } mint-plane`}
        />
      )}
      <DiagonalStripes className="opacity-50" />
      <div className="relative container py-20 md:py-28">{children}</div>
    </section>
  );
}
