function Block({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-foreground/[0.06] ${className}`} />;
}

export default function WeeklyPublicLoading() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-8 sm:py-8 lg:py-12">
        <div className="mb-6 flex items-center justify-between gap-3 sm:mb-8">
          <Block className="h-4 w-32" />
          <Block className="h-6 w-20 rounded-full" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-8">
          <div>
            <Block className="h-7 w-48 rounded-full" />
            <Block className="mt-4 h-12 w-3/4" />
            <Block className="mt-3 h-12 w-1/2" />
            <Block className="mt-6 h-16 w-full max-w-md" />
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Block className="h-12 w-full sm:w-44" />
              <Block className="h-12 w-full sm:w-32" />
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5">
              <Block className="h-5 w-28" />
              <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                <Block className="h-16" />
                <Block className="h-16" />
                <Block className="h-16" />
              </div>
              <Block className="mt-4 h-2.5 w-full rounded-full" />
            </div>
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5">
              <Block className="h-5 w-24" />
              <Block className="mt-4 h-2 w-full rounded-full" />
              <Block className="mt-3 h-2 w-full rounded-full" />
              <Block className="mt-3 h-2 w-full rounded-full" />
            </div>
          </div>

          <div className="mt-6 lg:col-span-2 lg:mt-8">
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4 sm:p-5">
              <Block className="h-5 w-32" />
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Block key={index} className="h-[92px]" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
