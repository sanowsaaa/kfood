import { useState } from 'react';

interface AgeVerificationProps {
  onVerified: () => void;
  onDenied: () => void;
}

export default function AgeVerification({ onVerified, onDenied }: AgeVerificationProps) {
  const [isClosing, setIsClosing] = useState(false);

  const handleVerify = () => {
    sessionStorage.setItem('ageVerified', 'true');
    setIsClosing(true);
    setTimeout(() => {
      onVerified();
    }, 300);
  };

  const handleDeny = () => {
    setIsClosing(true);
    setTimeout(() => {
      onDenied();
    }, 300);
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
      <div className={`bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 overflow-hidden transform transition-all duration-300 ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-6 text-center">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-shield-check-line text-5xl text-white"></i>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Проверка на възраст</h2>
          <p className="text-amber-50 text-lg">Необходимо е потвърждение</p>
        </div>

        {/* Content */}
        <div className="px-8 py-8">
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 mb-6">
            <div className="flex items-start space-x-3">
              <i className="ri-information-line text-2xl text-amber-600 flex-shrink-0 mt-1"></i>
              <div>
                <p className="text-gray-900 font-semibold mb-2 text-lg">
                  За достъп до тази категория, трябва да потвърдите, че имате навършени 18 години.
                </p>
                <p className="text-gray-700 text-sm">
                  Съгласно българското законодателство, продажбата на алкохолни напитки на лица под 18 години е забранена.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleVerify}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center space-x-2 cursor-pointer whitespace-nowrap"
            >
              <i className="ri-checkbox-circle-line text-2xl"></i>
              <span>Да, имам навършени 18 години</span>
            </button>

            <button
              onClick={handleDeny}
              className="w-full bg-gray-100 text-gray-700 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-200 transition-all flex items-center justify-center space-x-2 cursor-pointer whitespace-nowrap"
            >
              <i className="ri-close-circle-line text-2xl"></i>
              <span>Не, нямам 18 години</span>
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-start space-x-3 text-sm text-gray-600">
              <i className="ri-shield-check-line text-xl text-emerald-600 flex-shrink-0 mt-0.5"></i>
              <p>
                <strong className="text-gray-900">Важно:</strong> При доставка куриерът ще провери вашата лична карта за потвърждаване на възрастта.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
