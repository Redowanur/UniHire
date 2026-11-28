/* ---------------------------------- */
/* Navigation                         */
/* ---------------------------------- */

export type NavLink = { label: string; href: string };

export const navLinks: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Hiring now", href: "/hiring" },
];

/* ---------------------------------- */
/* Hero                               */
/* ---------------------------------- */

export const heroImage = {
  src: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1600&q=80",
  alt: "",
};

export const ctaImage = {
  src: "https://images.unsplash.com/photo-1529156069898-49953e1b1ac8?auto=format&fit=crop&w=1200&q=80",
  alt: "Students celebrating a successful placement season",
};

/* ---------------------------------- */
/* Footer                             */
/* ---------------------------------- */

export const footerAbout =
  "UniHire connects graduating cohorts with the recruiters worth bringing to campus — verified students, verified recruiters, no noise.";

export type FooterLink = { label: string; href: string };

export const footerPlatform: FooterLink[] = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Who's hiring", href: "/hiring" },
  { label: "Create a cohort", href: "/onboarding/cohort" },
  { label: "Developer docs", href: "/docs" },
];

export const footerAccounts: FooterLink[] = [
  { label: "Student sign up", href: "/signup" },
  { label: "Recruiter sign up", href: "/signup" },
  { label: "Log in", href: "/login" },
];
