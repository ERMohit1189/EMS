import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function truncateId(id: string | null | undefined, maxLength: number = 25): string {
  if (!id) return '—';
  return id.length > maxLength ? `${id.substring(0, maxLength)}...` : id;
}
