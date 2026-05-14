export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_log: {
        Row: {
          device_id: string
          id: string
          occurred_at: string
          payment_id: string | null
          reason: string | null
          result: Database["public"]["Enums"]["access_result"]
        }
        Insert: {
          device_id: string
          id?: string
          occurred_at?: string
          payment_id?: string | null
          reason?: string | null
          result: Database["public"]["Enums"]["access_result"]
        }
        Update: {
          device_id?: string
          id?: string
          occurred_at?: string
          payment_id?: string | null
          reason?: string | null
          result?: Database["public"]["Enums"]["access_result"]
        }
        Relationships: [
          {
            foreignKeyName: "access_log_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_log_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor: string
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          user_agent: string | null
        }
        Insert: {
          action: string
          actor: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor?: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Relationships: []
      }
      devices: {
        Row: {
          created_at: string
          device_uid: string
          firmware_version: string | null
          id: string
          last_seen_at: string | null
          location: string | null
          metadata: Json
          name: string
          public_key: string | null
          status: Database["public"]["Enums"]["device_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          device_uid: string
          firmware_version?: string | null
          id?: string
          last_seen_at?: string | null
          location?: string | null
          metadata?: Json
          name: string
          public_key?: string | null
          status?: Database["public"]["Enums"]["device_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          device_uid?: string
          firmware_version?: string | null
          id?: string
          last_seen_at?: string | null
          location?: string | null
          metadata?: Json
          name?: string
          public_key?: string | null
          status?: Database["public"]["Enums"]["device_status"]
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          cancelled_at: string | null
          created_at: string
          device_id: string
          end_to_end_id: string | null
          expires_at: string
          id: string
          metadata: Json
          paid_at: string | null
          payer_document: string | null
          payer_name: string | null
          qr_code: string
          qr_code_image: string | null
          status: Database["public"]["Enums"]["payment_status"]
          txid: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          cancelled_at?: string | null
          created_at?: string
          device_id: string
          end_to_end_id?: string | null
          expires_at: string
          id?: string
          metadata?: Json
          paid_at?: string | null
          payer_document?: string | null
          payer_name?: string | null
          qr_code: string
          qr_code_image?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          txid: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          cancelled_at?: string | null
          created_at?: string
          device_id?: string
          end_to_end_id?: string | null
          expires_at?: string
          id?: string
          metadata?: Json
          paid_at?: string | null
          payer_document?: string | null
          payer_name?: string | null
          qr_code?: string
          qr_code_image?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          txid?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_cents: number
          created_at: string
          device_id: string
          end_to_end_id: string | null
          id: string
          occurred_at: string
          payment_id: string
          psp_payload: Json
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount_cents: number
          created_at?: string
          device_id: string
          end_to_end_id?: string | null
          id?: string
          occurred_at?: string
          payment_id: string
          psp_payload?: Json
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount_cents?: number
          created_at?: string
          device_id?: string
          end_to_end_id?: string | null
          id?: string
          occurred_at?: string
          payment_id?: string
          psp_payload?: Json
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      access_result: "granted" | "denied" | "error"
      device_status: "active" | "inactive" | "maintenance"
      payment_status: "pending" | "paid" | "expired" | "cancelled" | "failed"
      transaction_type: "payment" | "refund" | "adjustment"
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
    Enums: {
      access_result: ["granted", "denied", "error"],
      device_status: ["active", "inactive", "maintenance"],
      payment_status: ["pending", "paid", "expired", "cancelled", "failed"],
      transaction_type: ["payment", "refund", "adjustment"],
    },
  },
} as const
