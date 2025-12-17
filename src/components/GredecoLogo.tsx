interface GredecoLogoProps {
  className?: string;
  size?: number;
}

export default function GredecoLogo({ className = '', size = 80 }: GredecoLogoProps) {
  return (
    <img
      src="/logo.png"
      alt="GREDECO Logo"
      width={size}
      height={size * 1.25}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}
