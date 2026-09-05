export type CandidateStateObservationStatus =
  | "first_seen"
  | "unchanged"
  | "changed";


export type ObserveCandidateStateInput = {
  sheetSourceId: string;

  candidateHmac: string;

  fingerprint: string;

  /**
   * ISO 8601 timestamptz
   *
   * 例:
   * 2026-09-05T10:00:00.000Z
   */
  observedAt: string;
};


export type CandidateStateObservation = {
  status:
    CandidateStateObservationStatus;

  firstSeenAt: string;

  lastSeenAt: string;

  lastChangedAt: string;
};
