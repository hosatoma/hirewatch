import type {
  CandidateStateObservation,
  CandidateStateObservationStatus,
  ObserveCandidateStateInput,
} from "../candidate-state.js";

import type {
  HireWatchDatabaseClient,
} from "../client.js";


export interface CandidateStateRepository {
  observe(
    input: ObserveCandidateStateInput,
  ): Promise<CandidateStateObservation>;
}


const VALID_STATUSES:
  readonly CandidateStateObservationStatus[] = [
    "first_seen",
    "unchanged",
    "changed",
  ];


function isObservationStatus(
  value: string,
): value is CandidateStateObservationStatus {
  return VALID_STATUSES.includes(
    value as CandidateStateObservationStatus,
  );
}


function validateSha256Hex(
  value: string,
  field: string,
): void {
  if (
    !/^[0-9a-f]{64}$/.test(value)
  ) {
    throw new RangeError(
      `${field} must be a 64-character lowercase hex SHA-256 value`,
    );
  }
}


export class CandidateStateRepositoryError
  extends Error
{
  readonly code?: string;


  constructor(
    message: string,
    options?: {
      code?: string;
    },
  ) {
    super(message);

    this.name =
      "CandidateStateRepositoryError";

    this.code =
      options?.code;
  }
}


export class SupabaseCandidateStateRepository
  implements CandidateStateRepository
{
  constructor(
    private readonly db:
      HireWatchDatabaseClient,
  ) {}


  async observe(
    input: ObserveCandidateStateInput,
  ): Promise<CandidateStateObservation> {

    validateSha256Hex(
      input.candidateHmac,
      "candidateHmac",
    );

    validateSha256Hex(
      input.fingerprint,
      "fingerprint",
    );


    const {
      data,
      error,
    } = await this.db.rpc(
      "observe_candidate_state",
      {
        p_sheet_source_id:
          input.sheetSourceId,

        p_candidate_hmac:
          input.candidateHmac,

        p_fingerprint:
          input.fingerprint,

        p_observed_at:
          input.observedAt,
      },
    );


    if (error) {
      throw new CandidateStateRepositoryError(
        "Failed to observe candidate state",
        {
          code: error.code,
        },
      );
    }


    if (
      data === null ||
      data.length !== 1
    ) {
      throw new CandidateStateRepositoryError(
        "Unexpected candidate state observation result",
      );
    }


    const row = data[0];

    if (!row) {
      throw new CandidateStateRepositoryError(
        "Candidate state observation row is missing",
      );
    }

    if (
      !isObservationStatus(
        row.observation_status,
      )
    ) {
      throw new CandidateStateRepositoryError(
        "Unknown candidate state observation status",
      );
    }


    return {
      status:
        row.observation_status,

      firstSeenAt:
        row.result_first_seen_at,

      lastSeenAt:
        row.result_last_seen_at,

      lastChangedAt:
        row.result_last_changed_at,
    };
  }
}