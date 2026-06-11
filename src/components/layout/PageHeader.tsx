import { ReactNode } from 'react';
import { ChevronLeft, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, showBack, actions }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="erp-page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-3 w-full md:w-auto">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 -ml-1 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight leading-none">{title}</h1>
          {subtitle && <p className="text-[13px] text-gray-500 font-medium mt-1">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 self-start md:self-auto w-full md:w-auto overflow-x-auto pb-1 md:pb-0">{actions}</div>}
    </header>
  );
}
