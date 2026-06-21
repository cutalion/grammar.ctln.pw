import type { ButtonHTMLAttributes } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { FontAwesomeIconProps } from '@fortawesome/react-fontawesome';

export {
  faGear,
  faTrash,
  faPen,
  faXmark,
  faArrowUp,
  faCopy,
  faCheck,
  faCircleHalfStroke,
  faDesktop,
  faSun,
  faMoon,
  faRotateRight,
} from '@fortawesome/free-solid-svg-icons';

interface IconProps extends Omit<FontAwesomeIconProps, 'icon'> {
  icon: IconDefinition;
}

type IconSize = '2xs' | 'xs' | 'sm' | 'lg';

interface IconPropsWithSize extends Omit<IconProps, 'size'> {
  size?: IconSize;
}

export function Icon({ icon, className = '', size = 'sm', ...props }: IconPropsWithSize) {
  return <FontAwesomeIcon icon={icon} size={size} className={className} fixedWidth {...props} />;
}

const variants = {
  bordered:
    'rounded-md border border-neutral-200 p-1.5 text-neutral-400/80 hover:bg-neutral-50 hover:text-neutral-600 dark:border-gh-border-muted dark:text-neutral-500 dark:hover:bg-gh-overlay dark:hover:text-neutral-300',
  ghost:
    'p-0 text-neutral-400/80 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300',
  danger:
    'p-0 text-neutral-400/80 hover:text-red-500/90 dark:text-neutral-500 dark:hover:text-red-400',
} as const;

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconDefinition;
  label: string;
  variant?: keyof typeof variants;
  iconSize?: IconSize;
}

export function IconButton({
  icon,
  label,
  variant = 'bordered',
  iconSize = 'sm',
  className = '',
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center transition ${variants[variant]} ${className}`.trim()}
      {...props}
    >
      <Icon icon={icon} size={iconSize} />
    </button>
  );
}
