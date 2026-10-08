export default function CustomerReadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="mx-auto my-8 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900" role="alert">
    <p className="text-base leading-relaxed">{message}</p>
    <button type="button" onClick={onRetry} className="mt-4 min-h-11 rounded-xl bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-700">Опитай отново</button>
  </div>;
}
