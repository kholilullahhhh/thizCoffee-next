export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-black/10 dark:bg-white/10" />
        <div className="h-10 w-64 rounded-lg bg-black/10 dark:bg-white/10" />
        <div className="h-3 w-80 max-w-full rounded bg-black/[0.07] dark:bg-white/[0.07]" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-[132px] rounded-2xl bg-black/[0.06] dark:bg-white/[0.06]" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="h-[350px] rounded-2xl bg-black/[0.06] xl:col-span-2 dark:bg-white/[0.06]" />
        <div className="h-[350px] rounded-2xl bg-black/[0.06] dark:bg-white/[0.06]" />
      </div>
      <div className="h-[260px] rounded-2xl bg-black/[0.06] dark:bg-white/[0.06]" />
    </div>
  );
}
