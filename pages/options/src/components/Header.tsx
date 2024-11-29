import React from 'react';

export default function Header() {
  return (
    <header className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/icon-48.png" alt="logo" className="h-8 w-8" />
          <h1 className="text-2xl font-bold text-gray-800">설정</h1>
        </div>
      </div>
    </header>
  );
}
