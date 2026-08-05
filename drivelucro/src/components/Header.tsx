'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-green-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold">DriveLucro</h1>
          <nav>
            <ul className="flex gap-4">
              <li>
                <Link 
                  href="/"
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    pathname === '/' 
                      ? 'bg-green-700 text-white' 
                      : 'hover:bg-green-700'
                  }`}
                >
                  Lançar dia
                </Link>
              </li>
              <li>
                <Link 
                  href="/reports"
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    pathname === '/reports' 
                      ? 'bg-green-700 text-white' 
                      : 'hover:bg-green-700'
                  }`}
                >
                  Relatórios
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}
