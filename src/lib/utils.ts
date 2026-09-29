import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("es-PE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleDateString("es-PE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function sumWeights(weights: number[]): number {
  return weights.reduce((sum, w) => sum + w, 0);
}

export function isWeightSumValid(weights: number[], tolerance = 0.001): boolean {
  return Math.abs(sumWeights(weights) - 1.0) < tolerance;
}
