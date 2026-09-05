export type CandidateStateObservationStatus = 
  | "first_seen"
  | "unchanged"
  | "changed";


export type ObserveCandidateStatePortInput = {
    sheetSourceId: string;

    candidateHmac: string;

    fingerprint: string;

    observedAt: string;
}


export type CandidateStateObservation = {
    status: CandidateStateObservationStatus;

    firstSeenAt: string;

    lastSeenAt: string;

    lastChangedAt: string;
}


export interface CandidateStateRepositoryPort {
  observe(
    input: ObserveCandidateStatePortInput,
  ): Promise<CandidateStateObservation>;
}