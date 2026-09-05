import type {
  Database,
} from "./database.types.js";

export type {
  Database,
  Json,
} from "./database.types.js";


type PublicSchema =
  Database["public"];


export type TableName =
  keyof PublicSchema["Tables"];


export type Tables<
  Name extends TableName,
> =
  PublicSchema["Tables"][Name]["Row"];


export type Inserts<
  Name extends TableName,
> =
  PublicSchema["Tables"][Name]["Insert"];


export type Updates<
  Name extends TableName,
> =
  PublicSchema["Tables"][Name]["Update"];


export {
  createServiceRoleDatabaseClient,
} from "./client.js";


export type {
  CreateServiceRoleClientInput,
  HireWatchDatabaseClient,
} from "./client.js";


export {
  CandidateStateRepositoryError,
  SupabaseCandidateStateRepository,
} from "./repositories/candidate-state-repository.js";


export type {
  CandidateStateRepository,
} from "./repositories/candidate-state-repository.js";


export type {
  CandidateStateObservation,
  CandidateStateObservationStatus,
  ObserveCandidateStateInput,
} from "./candidate-state.js";