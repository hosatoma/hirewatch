export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      candidate_states: {
        Row: {
          candidate_hmac: string
          fingerprint: string
          first_seen_at: string
          last_alerted_at: string | null
          last_changed_at: string
          last_seen_at: string
          sheet_source_id: string
        }
        Insert: {
          candidate_hmac: string
          fingerprint: string
          first_seen_at: string
          last_alerted_at?: string | null
          last_changed_at: string
          last_seen_at: string
          sheet_source_id: string
        }
        Update: {
          candidate_hmac?: string
          fingerprint?: string
          first_seen_at?: string
          last_alerted_at?: string | null
          last_changed_at?: string
          last_seen_at?: string
          sheet_source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_states_sheet_source_id_fkey"
            columns: ["sheet_source_id"]
            isOneToOne: false
            referencedRelation: "sheet_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sheet_sources: {
        Row: {
          column_mapping: Json
          created_at: string
          header_row: number
          id: string
          last_error_code: string | null
          last_sync_at: string | null
          sheet_id: number
          sheet_title: string
          spreadsheet_id: string
          spreadsheet_timezone: string | null
          spreadsheet_title: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          column_mapping?: Json
          created_at?: string
          header_row?: number
          id?: string
          last_error_code?: string | null
          last_sync_at?: string | null
          sheet_id: number
          sheet_title: string
          spreadsheet_id: string
          spreadsheet_timezone?: string | null
          spreadsheet_title?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          column_mapping?: Json
          created_at?: string
          header_row?: number
          id?: string
          last_error_code?: string | null
          last_sync_at?: string | null
          sheet_id?: number
          sheet_title?: string
          spreadsheet_id?: string
          spreadsheet_timezone?: string | null
          spreadsheet_title?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sheet_sources_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_rules: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          sla_business_days: number
          stage_value: string
          updated_at: string
          waiting_on: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          sla_business_days: number
          stage_value: string
          updated_at?: string
          waiting_on: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          sla_business_days?: number
          stage_value?: string
          updated_at?: string
          waiting_on?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_rules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          role: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          notification_enabled: boolean
          notification_time: string
          timezone: string
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          notification_enabled?: boolean
          notification_time?: string
          timezone?: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          notification_enabled?: boolean
          notification_time?: string
          timezone?: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      observe_candidate_state: {
        Args: {
          p_candidate_hmac: string
          p_fingerprint: string
          p_observed_at?: string
          p_sheet_source_id: string
        }
        Returns: {
          observation_status: string
          result_first_seen_at: string
          result_last_changed_at: string
          result_last_seen_at: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

