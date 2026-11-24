import {
  Atom,
  Award,
  Backpack,
  BookOpen,
  Briefcase,
  Calculator,
  Clock,
  FlaskConical,
  Globe,
  GraduationCap,
  Handshake,
  Lightbulb,
  Laptop,
  Library,
  Mail,
  Microscope,
  Building2,
  PenLine,
  Ruler,
  ScrollText,
  Target,
  Trophy,
  Users,
  School,
  Presentation,
  type LucideIcon,
} from "lucide-react";

const icons: LucideIcon[] = [
  GraduationCap, BookOpen, Briefcase, PenLine, Laptop,
  Trophy, Lightbulb, Atom, Calculator, Clock,
  Award, Mail, Building2, Globe, Ruler,
  Backpack, FlaskConical, Users, Target, ScrollText,
  Library, Microscope, Handshake, School, Presentation,
];

const CELL = 84;
const COLS = 5;
const SIZE = 30;
const TILE = CELL * COLS;

/** Telegram-style wallpaper: a tiled field of academic & career line icons. */
export function HeroPattern({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="hero-wallpaper" width={TILE} height={TILE} patternUnits="userSpaceOnUse">
          {icons.map((Icon, i) => {
            const row = Math.floor(i / COLS);
            const col = i % COLS;
            const x = col * CELL + (row % 2 ? CELL / 2 : 0) - SIZE / 2 + CELL / 2;
            const y = row * CELL + CELL / 2 - SIZE / 2;
            const rotate = ((i * 37) % 50) - 25;
            return (
              <g key={i} transform={`rotate(${rotate} ${x + SIZE / 2} ${y + SIZE / 2})`}>
                <Icon x={x} y={y} width={SIZE} height={SIZE} strokeWidth={1.4} />
              </g>
            );
          })}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hero-wallpaper)" stroke="none" />
    </svg>
  );
}
