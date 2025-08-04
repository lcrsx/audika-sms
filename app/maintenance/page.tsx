import { AlertTriangle } from 'lucide-react';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
        <AlertTriangle className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Underhåll pågår
        </h1>
        <p className="text-gray-600 mb-6">
          Systemet är för närvarande inte tillgängligt på grund av underhåll. 
          Vänligen försök igen senare.
        </p>
        <p className="text-sm text-gray-500">
          Om problemet kvarstår, kontakta systemadministratören.
        </p>
      </div>
    </div>
  );
}