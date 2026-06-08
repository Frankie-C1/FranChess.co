export function BrandLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "h-9 w-9",
    md: "h-11 w-11",
    lg: "h-20 w-20"
  };

  return (
    <img
      src="/franchess-logo.png"
      alt="FranChess.co Logo"
      className={`${sizes[size]} shrink-0 rounded-md object-contain`}
      decoding="async"
    />
  );
}
