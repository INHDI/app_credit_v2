import { type ClassValue } from "clsx"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format number to Vietnamese currency format (rounded to thousands)
export function formatCurrency(amount: number): string {
  const rounded = Math.round(amount / 1000) * 1000;
  return new Intl.NumberFormat('vi-VN').format(rounded);
}

// Format date from YYYY-MM-DD to DD/MM/YYYY
export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

// Format date from Date object to DD-MM-YYYY for API
export function formatDateForAPI(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

// Format date from Date object to YYYY-MM-DD for input[type="date"]
export function formatDateForInput(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
}

// Format date string for chart label (short format: d/M)
export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${parseInt(day)}/${parseInt(month)}`;
}


