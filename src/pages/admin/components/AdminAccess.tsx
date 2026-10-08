export default function AdminAccess({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white" role={error ? 'alert' : 'status'}>
        <i aria-hidden="true" className={`${error ? 'ri-wifi-off-line' : 'ri-loader-4-line animate-spin'} inline-block text-4xl text-emerald-300`} />
        <h1 className="mt-5 text-xl font-semibold">{error ? 'Не успяхме да проверим достъпа' : 'Проверка на достъпа'}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">{error || 'Свързваме се със сървъра...'}</p>
        {error && <button type="button" onClick={onRetry} className="mt-6 rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950">Опитай отново</button>}
      </div>
    </div>
  );
}
