import { useState, useRef } from 'react';
import type { FormEvent } from 'react';
import { createActionLock } from '../../../utils/admin';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const submission = useRef(createActionLock());

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !submission.current.acquire()) return;
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const formData = new URLSearchParams();
      formData.append('email', email);
      const response = await fetch('https://readdy.ai/api/form/d4iu2c2eh8g2mrj4asrg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
        signal: AbortSignal.timeout(20000),
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
      submission.current.release();
    }
  };

  return (
    <section className="brand-dark-section py-16 md:py-24 bg-gradient-to-br from-brand-primary via-brand-hover to-rose-800 section-below-fold">
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 lg:px-16">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs md:text-sm font-medium tracking-[0.2em] uppercase text-white/90 mb-3">
            Бюлетин
          </p>
          <h2 className="font-heading text-2xl md:text-4xl font-light text-white tracking-tight mb-4">
            Още вкусни открития
          </h2>
          <p className="text-sm md:text-base text-white/90 mb-9 font-light leading-relaxed max-w-lg mx-auto">
            Нови продукти, идеи за рецепти и предложения от K-FOOD — направо в пощата ти.
          </p>

          <form id="newsletter-form" data-readdy-form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                aria-label="Имейл за бюлетина"
                autoComplete="email"
                disabled={isSubmitting}
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Твоят имейл адрес"
                required
                className="flex-1 px-5 py-3.5 bg-white/10 border-2 border-white/20 text-white placeholder-white/80 text-sm rounded-lg focus:outline-none focus:border-white/50 transition-all font-light"
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
                className="px-8 py-3.5 bg-white text-brand-primary text-sm font-bold uppercase tracking-wider hover:bg-brand-blush transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
              >
                {isSubmitting ? '...' : 'Абонирай се'}
              </button>
            </div>

            {submitStatus === 'success' && (
              <p role="status" className="mt-4 text-sm text-white font-medium">Вече си част от K-FOOD. Очаквай следващите ни вкусни открития.</p>
            )}
            {submitStatus === 'error' && (
              <p role="alert" className="mt-4 text-sm text-white font-medium">Не успяхме да запишем имейла. Опитай отново.</p>
            )}
          </form>

          <p className="text-white/90 text-xs mt-6 font-light">
            Можеш да се отпишеш по всяко време.
          </p>
        </div>
      </div>
    </section>
  );
}
