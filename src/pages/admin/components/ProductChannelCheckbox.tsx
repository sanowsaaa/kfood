interface Props {
  channel: 'retail' | 'b2b';
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function ProductChannelCheckbox({ channel, checked, onChange }: Props) {
  return (
    <label className="mb-3 flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded text-teal-600 focus:ring-2 focus:ring-teal-500" />
      <span>
        <span className="block text-sm font-semibold text-gray-900">
          {channel === 'retail' ? 'Показвай в магазина на дребно' : 'Показвай в B2B каталога'}
        </span>
        <span className="mt-1 block text-xs text-gray-600">
          {channel === 'retail' ? 'Видим за всички посетители. Изключването запазва цената и данните.'
            : 'Достъпен след вход за одобрени партньори. Не променя видимостта в магазина на дребно.'}
        </span>
      </span>
    </label>
  );
}
