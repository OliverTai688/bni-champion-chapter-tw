function Block({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-foreground/[0.06] ${className}`} />;
}

export default function VoteLoading() {
  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-8 sm:py-8">
      <section className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <Block className="h-4 w-28" />
            <Block className="mt-2 h-7 w-40" />
          </div>
          <Block className="h-9 w-24" />
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.4fr]">
          <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5">
            <Block className="h-4 w-16" />
            <Block className="mt-2 h-8 w-48" />
            <Block className="mt-3 h-12 w-full" />
            <Block className="mt-5 h-10 w-full" />
            <Block className="mt-3 h-12 w-full" />
          </div>

          <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4 sm:p-5">
            <Block className="h-5 w-32" />
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Block key={index} className="h-[92px]" />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
