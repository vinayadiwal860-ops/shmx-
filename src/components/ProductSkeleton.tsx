export function ProductSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden animate-pulse">
      <div className="aspect-square w-full bg-slate-100" />
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="h-3 w-24 rounded bg-slate-200" />
        <div className="h-4 w-4/5 rounded bg-slate-200" />
        <div className="h-3 w-3/5 rounded bg-slate-100" />
        <div className="mt-2 flex items-baseline gap-2">
          <div className="h-5 w-16 rounded bg-slate-200" />
          <div className="h-3 w-12 rounded bg-slate-100" />
        </div>
        <div className="mt-auto pt-3 grid grid-cols-2 gap-2">
          <div className="h-9 rounded-lg bg-slate-200" />
          <div className="h-9 rounded-lg bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
