/** Category SVG illustrations — line-art style matching the design system */

interface IllustrationProps {
  accentColor: string;
}

/** A steaming pot with a ladle */
export function CurriesIllustration({ accentColor }: IllustrationProps) {
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20" fill="none">
      {/* Pot body */}
      <path
        d="M20 38 L20 54 Q20 62 28 62 L52 62 Q60 62 60 54 L60 38"
        stroke={accentColor} strokeWidth="2.5" strokeLinecap="round" fill="none"
      />
      {/* Pot rim */}
      <path d="M16 38 L64 38" stroke={accentColor} strokeWidth="2.5" strokeLinecap="round" />
      {/* Handles */}
      <path d="M16 42 Q12 42 12 38 Q12 34 16 34" stroke={accentColor} strokeWidth="2" fill="none" />
      <path d="M64 42 Q68 42 68 38 Q68 34 64 34" stroke={accentColor} strokeWidth="2" fill="none" />
      {/* Lid */}
      <ellipse cx="40" cy="36" rx="22" ry="4" fill={accentColor} opacity="0.15" />
      {/* Steam */}
      <path d="M32 28 Q30 22 33 16" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <path d="M40 26 Q38 20 41 14" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <path d="M48 28 Q50 22 47 16" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

/** A skewer with items on it */
export function StreetFoodIllustration({ accentColor }: IllustrationProps) {
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20" fill="none">
      {/* Skewer stick */}
      <line x1="40" y1="10" x2="40" y2="70" stroke={accentColor} strokeWidth="2" strokeLinecap="round" />
      {/* Food items on skewer */}
      <rect x="32" y="20" width="16" height="10" rx="3" stroke={accentColor} strokeWidth="2" fill={accentColor} fillOpacity="0.15" />
      <circle cx="40" cy="40" r="7" stroke={accentColor} strokeWidth="2" fill={accentColor} fillOpacity="0.2" />
      <rect x="33" y="52" width="14" height="8" rx="2" stroke={accentColor} strokeWidth="2" fill={accentColor} fillOpacity="0.15" />
      {/* Sizzle marks */}
      <path d="M22 35 Q24 33 22 31" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <path d="M58 42 Q56 40 58 38" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

/** A cup with steam — chai / cocktail glass */
export function DrinksIllustration({ accentColor }: IllustrationProps) {
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20" fill="none">
      {/* Cup body */}
      <path
        d="M24 30 L28 60 Q29 64 34 64 L46 64 Q51 64 52 60 L56 30"
        stroke={accentColor} strokeWidth="2.5" fill="none"
      />
      {/* Handle */}
      <path d="M56 36 Q66 36 66 44 Q66 52 56 52" stroke={accentColor} strokeWidth="2" fill="none" />
      {/* Liquid surface */}
      <path d="M27 38 Q40 42 53 38" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      {/* Fill */}
      <path d="M27 38 Q40 42 53 38 L52 60 Q51 64 46 64 L34 64 Q29 64 28 60 Z" fill={accentColor} opacity="0.1" />
      {/* Steam */}
      <path d="M34 24 Q32 18 35 12" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <path d="M42 22 Q40 16 43 10" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

/** A gulab jamun / ladoo on a plate */
export function SweetsIllustration({ accentColor }: IllustrationProps) {
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20" fill="none">
      {/* Plate */}
      <ellipse cx="40" cy="58" rx="28" ry="6" stroke={accentColor} strokeWidth="2" fill="none" />
      <ellipse cx="40" cy="58" rx="28" ry="6" fill={accentColor} opacity="0.08" />
      {/* Sweets arranged on plate */}
      <circle cx="30" cy="46" r="9" stroke={accentColor} strokeWidth="2" fill={accentColor} fillOpacity="0.2" />
      <circle cx="50" cy="46" r="9" stroke={accentColor} strokeWidth="2" fill={accentColor} fillOpacity="0.2" />
      <circle cx="40" cy="34" r="9" stroke={accentColor} strokeWidth="2" fill={accentColor} fillOpacity="0.25" />
      {/* Garnish dots */}
      <circle cx="40" cy="34" r="1.5" fill={accentColor} opacity="0.6" />
      <circle cx="30" cy="46" r="1.5" fill={accentColor} opacity="0.6" />
      <circle cx="50" cy="46" r="1.5" fill={accentColor} opacity="0.6" />
    </svg>
  );
}

/** A wok with chopsticks — fast cooking */
export function QuickMealsIllustration({ accentColor }: IllustrationProps) {
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20" fill="none">
      {/* Wok body */}
      <path
        d="M16 36 Q16 58 40 62 Q64 58 64 36"
        stroke={accentColor} strokeWidth="2.5" fill="none"
      />
      {/* Wok rim */}
      <ellipse cx="40" cy="36" rx="24" ry="4" stroke={accentColor} strokeWidth="2" fill={accentColor} fillOpacity="0.1" />
      {/* Handle */}
      <line x1="64" y1="40" x2="74" y2="36" stroke={accentColor} strokeWidth="2.5" strokeLinecap="round" />
      {/* Chopsticks */}
      <line x1="30" y1="14" x2="44" y2="34" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="36" y1="14" x2="48" y2="34" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      {/* Motion lines — tossing food */}
      <path d="M34 26 Q36 22 33 18" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <path d="M46 24 Q48 20 45 16" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

export function getCategoryIllustration(categorySlug: string, accentColor: string) {
  switch (categorySlug) {
    case "curries":
      return <CurriesIllustration accentColor={accentColor} />;
    case "street-food":
      return <StreetFoodIllustration accentColor={accentColor} />;
    case "drinks":
      return <DrinksIllustration accentColor={accentColor} />;
    case "sweets":
      return <SweetsIllustration accentColor={accentColor} />;
    case "quick-meals":
      return <QuickMealsIllustration accentColor={accentColor} />;
    default:
      return null;
  }
}
