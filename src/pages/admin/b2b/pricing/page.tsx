import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminB2BPricingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/admin/b2b', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <i aria-hidden="true" className="ri-loader-4-line text-4xl text-emerald-600 animate-spin"></i>
        <p className="mt-4 text-gray-600">Ценообразуването е премахнато. Пренасочване...</p>
      </div>
    </div>
  );
}