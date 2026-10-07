import { useState, FormEvent } from 'react';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const formData = new URLSearchParams();
      formData.append('email', email);
      const response = await fetch('https://readdy.ai/api/form/d4iu2c2eh8g2mrj4asrg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });
      if (response.ok) {
        setSubmitStatus('success');
        setEmail('');
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-red-600 via-red-700 to-rose-800 section-below-fold">
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 lg:px-16">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs md:text-sm font-medium tracking-[0.2em] uppercase text-white/60 mb-3">
            Бюлетин
          </p>
          <h2 className="font-heading text-2xl md:text-4xl font-light text-white tracking-tight mb-4">
            Абонирайте се
          </h2>
          <p className="text-sm md:text-base text-white/70 mb-9 font-light leading-relaxed max-w-lg mx-auto">
            Получавайте ексклузивни оферти, нови продукти и корейски рецепти директно във вашата поща
          </p>

          <form id="newsletter-form" data-readdy-form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Вашият имейл адрес"
                required
                className="flex-1 px-5 py-3.5 bg-white/10 border-2 border-white/20 text-white placeholder-white/40 text-sm rounded-lg focus:outline-none focus:border-white/50 transition-all font-light"
              />
              <input
                type="text"
                name="website_alt"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                readOnly
                className="opacity-0 absolute top-[-9999px] left-[-9999px] h-0 w-0"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3.5 bg-white text-red-600 text-sm font-bold uppercase tracking-wider hover:bg-red-50 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
              >
                {isSubmitting ? '...' : 'Абонирай се'}
              </button>
            </div>

            {submitStatus === 'success' && (
              <p className="mt-4 text-sm text-white/80 font-medium">Успешно се абонирахте! Благодарим ви.</p>
            )}
            {submitStatus === 'error' && (
              <p className="mt-4 text-sm text-white/50 font-light">Възникна грешка. Моля, опитайте отново.</p>
            )}
          </form>

          <p className="text-white/30 text-xs mt-6 font-light">
            Можете да се отпишете по всяко време.
          </p>
        </div>
      </div>
    </section>
  );
}