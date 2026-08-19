import React, { useState, useEffect } from 'react';
import { ARKA_LOGO_URL } from '../../lib/brand';
import { ShieldCheck, Cpu, Database, Activity } from 'lucide-react';
import { User } from '../../types';

interface ErpLoadingScreenProps {
  user?: User | null;
  onFinish?: () => void;
  message?: string;
  duration?: number;
}

export const ErpLoadingScreen: React.FC<ErpLoadingScreenProps> = ({
  user,
  onFinish,
  message,
  duration = 1800
}) => {
  const [progress, setProgress] = useState(10);
  const [stepIndex, setStepIndex] = useState(0);

  const steps = [
    { text: 'Autenticando credenciais e acessos...', icon: ShieldCheck },
    { text: 'Carregando módulos de estoque, vendas e serviços...', icon: Cpu },
    { text: 'Sincronizando banco de dados em tempo real...', icon: Database },
    { text: 'Acessando painel executivo...', icon: Activity }
  ];

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (pct < 30) setStepIndex(0);
      else if (pct < 60) setStepIndex(1);
      else if (pct < 85) setStepIndex(2);
      else setStepIndex(3);

      if (elapsed >= duration) {
        clearInterval(interval);
        setTimeout(() => {
          onFinish?.();
        }, 150);
      }
    }, 35);

    return () => clearInterval(interval);
  }, [duration, onFinish]);

  const CurrentIcon = steps[stepIndex]?.icon || Activity;

  return (
    <div className="erp-loading-screen animate-fade-in" aria-live="polite" aria-busy="true">
      <div className="erp-loading-bg">
        <div className="erp-loading-radial" />
        <div className="login-blob login-blob-1" />
        <div className="login-blob login-blob-3" />
      </div>

      <div className="erp-loading-card">
        {/* Logo ARKA */}
        <div className="erp-loading-logo-wrap">
          <img src={ARKA_LOGO_URL} alt="ARKA Tecnologia" className="erp-loading-logo" />
        </div>

        {/* Informações do usuário e status */}
        <div className="erp-loading-body">
          <div className="erp-loading-icon-pulse">
            <CurrentIcon size={24} className="text-cyan-400 animate-pulse" />
          </div>

          <div className="erp-loading-text">
            <h2 className="erp-loading-title">
              {user?.name ? `Olá, ${user.name.split(' ')[0]}!` : 'Acessando Sistemas Arka ERP'}
            </h2>
            <p className="erp-loading-subtitle">
              {message || steps[stepIndex]?.text}
            </p>
          </div>
        </div>

        {/* Barra de Progresso Futurista */}
        <div className="erp-loading-bar-container">
          <div className="erp-loading-bar-track">
            <div
              className="erp-loading-bar-fill"
              style={{ width: `${progress}%` }}
            />
            <div
              className="erp-loading-bar-glow"
              style={{ left: `calc(${progress}% - 20px)` }}
            />
          </div>
        </div>

        {/* Rodapé com porcentagem e selo de segurança */}
        <div className="erp-loading-footer">
          <span className="erp-loading-pct">{progress}%</span>
          <span className="erp-loading-badge">
            <span className="erp-loading-dot" /> Sistema Online · ERP Seguro
          </span>
        </div>
      </div>
    </div>
  );
};
