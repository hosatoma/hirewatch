import type {
  LocalDate,
} from "@hirewatch/core";


function parseInstant(
  value: string,
): Date {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    throw new RangeError(
      `Invalid instant: ${value}`,
    );
  }

  return date;
}


function getDatePart(
  parts:
    readonly Intl.DateTimeFormatPart[],

  type:
    "year" |
    "month" |
    "day",
): string {
  const part =
    parts.find(
      (candidate) =>
        candidate.type === type,
    );

  if (!part) {
    throw new Error(
      `Missing date part: ${type}`,
    );
  }

  return part.value;
}


export function normalizeInstant(
  instant: string,
): string {
  return parseInstant(
    instant,
  ).toISOString();
}


export function toLocalDate(
  instant: string,
  timeZone: string,
): LocalDate {
  const date =
    parseInstant(instant);

  const normalizedTimeZone =
    timeZone.trim();

  if (
    normalizedTimeZone.length === 0
  ) {
    throw new RangeError(
      "timeZone must not be empty",
    );
  }

  let formatter:
    Intl.DateTimeFormat;

  try {
    formatter =
      new Intl.DateTimeFormat(
        "en-US",
        {
          timeZone:
            normalizedTimeZone,

          calendar:
            "gregory",

          numberingSystem:
            "latn",

          year:
            "numeric",

          month:
            "2-digit",

          day:
            "2-digit",
        },
      );
  } catch {
    throw new RangeError(
      `Invalid IANA time zone: ${timeZone}`,
    );
  }


  const parts =
    formatter.formatToParts(
      date,
    );


  const year =
    getDatePart(
      parts,
      "year",
    );

  const month =
    getDatePart(
      parts,
      "month",
    );

  const day =
    getDatePart(
      parts,
      "day",
    );


  return (
    `${year}-${month}-${day}`
  ) as LocalDate;
}