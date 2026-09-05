import {
  describe,
  expect,
  it,
} from "vitest";

import {
  normalizeInstant,
  toLocalDate,
} from "./timezone.js";


describe(
  "toLocalDate",
  () => {

    it(
      "UTCではUTCの日付になる",
      () => {
        expect(
          toLocalDate(
            "2026-09-06T15:30:00.000Z",
            "UTC",
          ),
        ).toBe(
          "2026-09-06",
        );
      },
    );


    it(
      "Asia/Tokyoでは翌日になる",
      () => {
        expect(
          toLocalDate(
            "2026-09-06T15:30:00.000Z",
            "Asia/Tokyo",
          ),
        ).toBe(
          "2026-09-07",
        );
      },
    );


    it(
      "invalid timezoneを拒否する",
      () => {
        expect(() =>
          toLocalDate(
            "2026-09-06T00:00:00.000Z",
            "Invalid/Timezone",
          ),
        ).toThrow(
          "Invalid IANA time zone",
        );
      },
    );
  },
);


describe(
  "normalizeInstant",
  () => {

    it(
      "offset付き日時をUTC ISOへ正規化する",
      () => {
        expect(
          normalizeInstant(
            "2026-09-07T00:30:00+09:00",
          ),
        ).toBe(
          "2026-09-06T15:30:00.000Z",
        );
      },
    );
  },
);