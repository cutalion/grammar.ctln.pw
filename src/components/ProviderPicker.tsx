import { Settings } from '../storage/settings';

interface Props {
  settings: Settings;
  onChange: (id: string) => void;
  onOpenSettings: () => void;
}

export function ProviderPicker({ settings, onChange, onOpenSettings }: Props) {
  if (settings.configs.length === 0) {
    return (
      <button
        onClick={onOpenSettings}
        className="rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
      >
        Add provider
      </button>
    );
  }
  return (
    <select
      value={settings.activeConfigId ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-xs dark:border-neutral-700"
    >
      {settings.configs.map((c) => (
        <option key={c.id} value={c.id}>
          {c.label}
        </option>
      ))}
    </select>
  );
}
