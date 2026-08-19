import React, { useState } from 'react';

import { USER_AVATAR_URL } from '../../lib/brand';

interface UserAvatarProps {
  name?: string;
  /** Foto própria do usuário. Sem ela, entra a foto padrão /user.webp. */
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
 * Utiliza user.webp por padrão ou imagem customizada, com corte circular `object-cover`.
 * Se a imagem falhar ao carregar, exibe a inicial do nome.
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
  const src = (custom && !custom.includes('arka-horizontal')) ? custom : USER_AVATAR_URL;

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
      className={`${frame} object-cover bg-[var(--bg-subtle)]`}
      style={ringStyle}
    />
  );
};
