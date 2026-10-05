import React, { useState, useEffect } from 'react';
import { User as UserIcon } from 'lucide-react';

interface UserAvatarProps {
  photoURL?: string | null;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<UserAvatarProps['size']>, { container: string; icon: string }> = {
  xs: { container: 'w-7 h-7', icon: 'w-3.5 h-3.5' },
  sm: { container: 'w-8 h-8', icon: 'w-4 h-4' },
  md: { container: 'w-10 h-10', icon: 'w-5 h-5' },
  lg: { container: 'w-11 h-11', icon: 'w-5 h-5' },
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  photoURL,
  alt = 'User avatar',
  size = 'sm',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [photoURL]);

  const { container, icon } = SIZE_CLASSES[size];
  const hasValidPhoto = Boolean(photoURL && photoURL.trim() !== '' && !imgError);

  return (
    <div
      className={`${container} rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden flex items-center justify-center text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 shrink-0 ${className}`}
    >
      {hasValidPhoto ? (
        <img
          src={photoURL!}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <UserIcon className={icon} aria-hidden="true" />
      )}
    </div>
  );
};
