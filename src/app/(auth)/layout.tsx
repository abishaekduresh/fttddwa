import { Toaster } from "react-hot-toast";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <style>{`@font-face { font-family: 'NotoSansTamil'; src: url('/fonts/NotoSansTamil.ttf') format('truetype'); }`}</style>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-8">
          {children}
        </div>
        <p className="text-center text-primary-300 text-xs mt-6">
          &copy; {new Date().getFullYear()} FTTDDWA. All rights reserved.
        </p>
      </div>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
    </div>
  );
}
