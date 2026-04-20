// Tiny shimmer skeleton shown while a lazy route chunk is downloading.
// Cheaper to render than the full PageLoader spinner and feels like
// real content is materializing in place.
export default function SkeletonFallback() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true">
      <div className="h-10 w-1/3 rounded-lg bg-white/10" />
      <div className="h-4 w-2/3 rounded bg-white/10" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-white/10" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-white/10" />
    </div>
  );
}
