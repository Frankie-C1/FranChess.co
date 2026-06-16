export function BrandLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "brand-logo-sm",
    md: "brand-logo-md",
    lg: "brand-logo-lg"
  };

  return (
    <span className={`brand-logo ${sizes[size]}`} role="img" aria-label="FranChess.co Logo" />
  );
}
