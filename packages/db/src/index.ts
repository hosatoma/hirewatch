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