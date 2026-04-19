export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <span className="text-2xl font-bold text-primary">F</span>
          </div>
          <h1 className="text-2xl font-bold text-white">FTTDDWA</h1>
          <p className="text-primary-200 text-sm mt-1">Federation of Tamil Nadu Tent Dealers & Decorators</p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-8">
          {children}
        </div>
        <p className="text-center text-primary-300 text-xs mt-6">
          &copy; {new Date().getFullYear()} FTTDDWA. All rights reserved.
        </p>
      </div>
    </div>
  );
}
