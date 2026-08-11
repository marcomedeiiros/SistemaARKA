import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'slate';
  trend?: { value: string; positive?: boolean };
  onClick?: () => void;
}

const colorMap = {
  blue: {
    bg: 'rgba(59, 130, 246, 0.12)',
    icon: '#3b82f6',
    text: '#3b82f6',
    border: 'rgba(59, 130, 246, 0.2)'
  },
  green: {
    bg: 'rgba(16, 185, 129, 0.12)',
    icon: '#10b981',
    text: '#10b981',
    border: 'rgba(16, 185, 129, 0.2)'
  },
  amber: {
    bg: 'rgba(245, 158, 11, 0.12)',
    icon: '#f59e0b',
    text: '#f59e0b',
    border: 'rgba(245, 158, 11, 0.2)'
  },
  red: {
    bg: 'rgba(239, 68, 68, 0.12)',
    icon: '#ef4444',
    text: '#ef4444',
    border: 'rgba(239, 68, 68, 0.2)'
  },
  purple: {
    bg: 'rgba(168, 85, 247, 0.12)',
    icon: '#a855f7',
    text: '#a855f7',
    border: 'rgba(168, 85, 247, 0.2)'
  },
  slate: {
    bg: 'rgba(148, 163, 184, 0.12)',
    icon: '#94a3b8',
    text: '#94a3b8',
    border: 'rgba(148, 163, 184, 0.2)'
  }
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color,
  trend,
  onClick
}) => {
  const c = colorMap[color];

  return (
    <div
      onClick={onClick}
      className="arka-card p-5 animate-fade-in"
      style={{
        cursor: onClick ? 'pointer' : 'default',
        borderColor: c.border
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-[var(--text-muted)] leading-tight">{title}</p>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: c.bg, color: c.icon }}
        >
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-[var(--text-main)]">{value}</p>
      {trend && (
        <p className={`text-xs mt-1 font-medium ${trend.positive !== false ? 'text-emerald-500' : 'text-red-400'}`}>
          {trend.positive !== false ? '↑' : '↓'} {trend.value}
        </p>
      )}
    </div>
  );
};
