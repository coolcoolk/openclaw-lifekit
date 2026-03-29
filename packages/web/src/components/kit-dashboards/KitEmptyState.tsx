interface KitEmptyStateProps {
  icon: string;
  example: string;
  onAdd: () => void;
}

export function KitEmptyState({ icon, example, onAdd }: KitEmptyStateProps) {
  return (
    <div className="border border-dashed border-border rounded-lg p-6 text-center space-y-3">
      <p className="text-sm text-muted-foreground">{icon} 아직 기록이 없어요</p>
      <div className="text-xs text-muted-foreground space-y-1">
        <p>아그에게 직접 말해서 기록할 수 있어요:</p>
        <p className="text-muted-foreground/70 italic">예시: "{example}"</p>
      </div>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        + 직접 추가
      </button>
    </div>
  );
}
