import { useEffect, useRef } from 'react';

const REVIEW_URL = 'https://k-foodvelikotarnovo.com/leave-review';

// Lightweight QR code generator using canvas (no external lib needed)
// Uses a simple URL-encoded QR approach via Google Charts API
export default function QRCodeDisplay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(REVIEW_URL)}&color=065f46&bgcolor=f0fdf4&margin=10`;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>K-FOOD QR Code - Остави ревю</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Inter', sans-serif; background: #f0fdf4; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
            .card {
              background: white;
              border-radius: 24px;
              padding: 48px 40px;
              text-align: center;
              width: 380px;
              border: 3px solid #d1fae5;
            }
            .logo { font-size: 28px; font-weight: 800; color: #065f46; letter-spacing: -1px; margin-bottom: 8px; }
            .subtitle { font-size: 13px; color: #6b7280; margin-bottom: 28px; }
            .qr-wrap { background: #f0fdf4; border-radius: 16px; padding: 20px; display: inline-block; margin-bottom: 24px; }
            .qr-wrap img { width: 180px; height: 180px; display: block; }
            .cta { font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 8px; }
            .desc { font-size: 13px; color: #6b7280; line-height: 1.6; margin-bottom: 20px; }
            .url { font-size: 11px; color: #065f46; background: #d1fae5; padding: 8px 16px; border-radius: 999px; display: inline-block; }
            .stars { font-size: 28px; color: #fbbf24; margin-bottom: 20px; letter-spacing: 2px; }
            @media print {
              body { background: white; }
              .card { border: 2px solid #d1fae5; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">K-FOOD</div>
            <div class="subtitle">Корейска Храна — Велико Търново</div>
            <div class="qr-wrap">
              <img src="${qrSrc}" alt="QR Code" />
            </div>
            <div class="stars">★★★★★</div>
            <div class="cta">Хареса ли ти?</div>
            <div class="desc">Сканирай QR кода и остави ни ревю!<br/>Отнема само 1 минута и ни помага много.</div>
            <div class="url">k-foodvelikotarnovo.com/leave-review</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="bg-white rounded-2xl border border-emerald-100 p-6 text-center">
      <h3 className="font-bold text-gray-800 text-base mb-5">QR код</h3>

      <div className="flex flex-col items-center gap-5">
        <div className="bg-emerald-50 rounded-xl p-4 inline-block border border-emerald-100">
          <img
            src={qrSrc}
            alt="QR код за ревю"
            className="w-40 h-40 object-contain"
            ref={canvasRef as unknown as React.RefObject<HTMLImageElement>}
          />
        </div>

        <div className="text-xs text-gray-400 font-medium tracking-wide">
          {REVIEW_URL}
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors cursor-pointer whitespace-nowrap text-sm"
        >
          <i className="ri-printer-line text-base" />
          Разпечатай QR кода
        </button>
      </div>
    </div>
  );
}
