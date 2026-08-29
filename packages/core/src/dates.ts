// 営業日ユーティリティ

import type { LocalDate } from "./types.js";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function parseLocalDate(value: LocalDate): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    throw new RangeError(`Invalid LocalDate: ${value}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(
    Date.UTC(year, month - 1, day),
  );

  // 2026-02-31 のような値を弾く
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new RangeError(`Invalid LocalDate: ${value}`);
  }

  return date;
}

function isBusinessDay(date: Date): boolean {
  const day = date.getUTCDay();

  // 0 = Sunday
  // 6 = Saturday
  return day !== 0 && day !== 6;
}

/**
 * startDateの翌日からendDateまでに
 * 何営業日経過したかを返す。
 *
 * 例:
 *
 * Friday -> Monday = 1
 * Friday -> Tuesday = 2
 *
 * SLA = 1の場合:
 *
 * Monday:
 * elapsed = 1
 * → SLA内
 *
 * Tuesday:
 * elapsed = 2
 * → SLA超過
 */
export function countBusinessDaysAfter(
  startDate: LocalDate,
  endDate: LocalDate,
): number {
  let current = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

  if (end.getTime() <= current.getTime()) {
    return 0;
  }

  let count = 0;

  while (current.getTime() < end.getTime()) {
    current = new Date(
      current.getTime() + DAY_IN_MS,
    );

    if (isBusinessDay(current)) {
      count += 1;
    }
  }

  return count;
}

export function compareLocalDate(
  left: LocalDate,
  right: LocalDate,
): -1 | 0 | 1 {
  const leftTime = parseLocalDate(left).getTime();
  const rightTime = parseLocalDate(right).getTime();

  if (leftTime < rightTime) {
    return -1;
  }

  if (leftTime > rightTime) {
    return 1;
  }

  return 0;
}