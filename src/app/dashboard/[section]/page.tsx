export default function SectionPage({ params }: { params: { section: string } }) {
  const label = params.section
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-sm">
      <p className="text-foreground text-lg font-medium">{label}</p>
      <p className="text-muted-foreground text-sm mt-2">This section is coming soon.</p>
    </div>
  );
}
