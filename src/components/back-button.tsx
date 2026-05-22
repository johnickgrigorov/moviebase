import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function BackButton({ className }: { className?: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(-1)}
      className={
        'rounded-full bg-bg/70 backdrop-blur-md w-10 h-10 flex items-center justify-center active:scale-90 transition-transform ' +
        (className ?? '')
      }
    >
      <ChevronLeft size={22} strokeWidth={1.6} />
    </button>
  );
}
