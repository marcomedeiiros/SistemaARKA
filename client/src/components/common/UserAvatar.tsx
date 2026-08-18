import React, { useState } from 'react';

import { ARKA_LOGO_URL } from '../../lib/brand';

interface UserAvatarProps {
  name?: string;
  /** Foto própria do usuário. Sem ela, entra a marca da Arka. */
  avatarUrl?: string;
  /** Cor do anel e do fundo da inicial (normalmente a cor do perfil). */
  color?: string;
  /** Lado do quadro. Classes literais para o Tailwind conseguir encontrá-las. */
  size?: 'sm' | 'md' | 'lg';
  /** Desenha o anel colorido em volta. */
  ring?: boolean;
  className?: string;
}

const sizeClass: Record<NonNullable<UserAvatarProps['size']>, string> = {
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
  lg: 'w-16 h-16'
};

const textClass: Record<NonNullable<UserAvatarProps['size']>, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-xl'
};

/**
 * Foto de perfil do usuário.
 *
 * Quando o usuário não tem foto própria, mostra a logo da Arka. A marca é bem
 * mais larga que alta, então nesse caso o encaixe é `contain` sobre fundo
 * branco com `cover` (usado nas fotos reais) ela apareceria recortada no
 * meio dentro do círculo.
 *
 * Se a imagem falhar ao carregar, cai na inicial do nome, para nunca ficar um
 * quadro vazio.
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  avatarUrl,
  color = '#3b82f6',
  size = 'sm',
  ring = false,
  className = ''
}) => {
  const [failed, setFailed] = useState(false);

  const custom = avatarUrl?.trim();
  const src = custom || ARKA_LOGO_URL;
  const isLogo = !custom;

  const frame = `${sizeClass[size]} rounded-full shrink-0 ${className}`;
  const ringStyle = ring ? { boxShadow: `0 0 0 2px ${color}` } : undefined;

  if (failed) {
    return (
      <div
        className={`${frame} flex items-center justify-center font-bold text-white ${textClass[size]}`}
        style={{ background: color, ...ringStyle }}
        aria-hidden="true"
      >
        {name?.[0]?.toUpperCase() ?? '?'}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name ? `Foto de ${name}` : ''}
      onError={() => setFailed(true)}
      className={`${frame} ${isLogo ? 'object-contain bg-white p-0.5' : 'object-cover'}`}
      style={ringStyle}
    />
  );
};
