import { TRASH_DAYS } from "@sharencare/shared";

const DAYS_MS = 24 * 60 * 60 * 1000;

export function daysLeftInTrash(deletedAt: string, now = new Date()) {
  const deleteOn = new Date(deletedAt).getTime() + TRASH_DAYS * DAYS_MS;
  return Math.max(0, Math.ceil((deleteOn - now.getTime()) / DAYS_MS));
}

export function trashCountdown(daysLeft: number) {
  if (daysLeft === 0) return "DELETED WITHIN A DAY";
  if (daysLeft === 1) return "1 DAY LEFT";
  return `${daysLeft} DAYS LEFT`;
}
