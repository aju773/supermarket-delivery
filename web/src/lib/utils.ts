import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Our border-width utilities (tokens.css) must not be mistaken for border colours and dropped.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "border-w": ["border-hairline"],
      "border-w-t": ["border-t-hairline"],
      "border-w-r": ["border-r-hairline"],
      "border-w-b": ["border-b-hairline"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
