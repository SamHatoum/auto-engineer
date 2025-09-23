import { Button } from '../atoms/button';

export interface QuickActionButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  className?: string;
}

export function QuickActionButton({
  label,
  onClick,
  variant = 'default',
  size = 'default',
  disabled = false,
  className = '',
}: QuickActionButtonProps) {
  return (
    <Button variant={variant} size={size} onClick={onClick} disabled={disabled} className={className}>
      {label}
    </Button>
  );
}
