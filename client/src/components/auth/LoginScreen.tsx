import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail, Lock, User as UserIcon, Eye, EyeOff, AlertCircle, LogIn, UserPlus, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ARKA_LOGO_URL, B2G_LOGO_URL } from '../../lib/brand';
import { AUTH_PATHS, Mode } from '../../routes';

interface LoginScreenProps {
  mode: Mode;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ mode }) => {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Trocar entre /login e /cadastrar limpa o erro anterior.
  useEffect(() => {
    setError('');
  }, [mode]);

  const switchMode = (next: Mode) => {
    setError('');
    navigate(AUTH_PATHS[next]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'register' && !name.trim()) {
      setError('Informe seu nome.');
      return;
    }
    if (!email.trim()) {
      setError('Informe seu e-mail.');
      return;
    }
    if (password.length < 4) {
      setError('A senha deve ter ao menos 4 caracteres.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({ name, email, password });
        setPassword('');
        setSuccess('Conta criada com sucesso! Digite sua senha para entrar.');
        switchMode('login');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível continuar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      {/* Fundo dinâmico com fluxo de dados, estoque, vendas e logística */}
      <div className="login-bg" aria-hidden="true">
        <div className="login-bg-overlay" />
        <div className="login-blob login-blob-1" />
        <div className="login-blob login-blob-2" />
        <div className="login-blob login-blob-3" />
      </div>

      {/* Conteúdo */}
      <div className="login-content">
        <div className="login-logos-container">
          <img
            src={ARKA_LOGO_URL}
            alt="Sistemas Arka"
            className="login-logo-arka"
            width={640}
            height={160}
          />
          <img
            src={B2G_LOGO_URL}
            alt="B2G"
            className="login-logo-b2g"
            width={265}
            height={205}
          />
        </div>
        <p className="login-tagline">Gestão de estoque, vendas e serviços</p>

        <div className="login-card">
          <div className="login-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => switchMode('login')}
              className={`login-tab ${mode === 'login' ? 'is-active' : ''}`}
            >
              Entrar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              onClick={() => switchMode('register')}
              className={`login-tab ${mode === 'register' ? 'is-active' : ''}`}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {success && mode === 'login' && (
              <div className="login-success" role="status">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {error && (
              <div className="login-error" role="alert">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {mode === 'register' && (
              <div className="login-field">
                <label className="login-label" htmlFor="login-name">Nome</label>
                <div className="login-input-wrap">
                  <UserIcon size={16} />
                  <input
                    id="login-name"
                    className="login-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            <div className="login-field">
              <label className="login-label" htmlFor="login-email">E-mail</label>
              <div className="login-input-wrap">
                <Mail size={16} />
                <input
                  id="login-email"
                  type="email"
                  className="login-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="arka@brasil.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="login-password">Senha</label>
              <div className="login-input-wrap">
                <Lock size={16} />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className="login-toggle-pw"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? (
                'Aguarde...'
              ) : mode === 'login' ? (
                <><LogIn size={17} /> Entrar</>
              ) : (
                <><UserPlus size={17} /> Criar conta</>
              )}
            </button>
          </form>

          <p className="login-hint">
            {mode === 'login' ? (
              <>Ainda não tem conta?{' '}
                <button type="button" className="login-link" onClick={() => switchMode('register')}>Cadastre-se</button>
              </>
            ) : (
              <>Já tem conta?{' '}
                <button type="button" className="login-link" onClick={() => switchMode('login')}>Entrar</button>
              </>
            )}
          </p>
        </div>

        <p className="login-foot">© {new Date().getFullYear()} Sistemas Arka · ERP de estoque e serviços</p>
      </div>
    </div>
  );
};
