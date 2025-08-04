export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      chat: {
        Row: {
          content: string
          created_at: string
          id: number
          room_name: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: never
          room_name?: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: never
          room_name?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      config: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_recent_activity"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      forbidden_words: {
        Row: {
          phrase: string
        }
        Insert: {
          phrase: string
        }
        Update: {
          phrase?: string
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          tags: string[] | null
          updated_at: string
          use_count: number
          variables: Json | null
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          tags?: string[] | null
          updated_at?: string
          use_count?: number
          variables?: Json | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          tags?: string[] | null
          updated_at?: string
          use_count?: number
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_recent_activity"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "message_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          infobip_message_id: string | null
          patient_cnumber: string
          recipient_phone: string
          sender_display_name: string
          sender_id: string
          sender_tag: string
          sent_at: string | null
          status: Database["public"]["Enums"]["message_status"]
          template_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          infobip_message_id?: string | null
          patient_cnumber: string
          recipient_phone: string
          sender_display_name?: string
          sender_id: string
          sender_tag: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          template_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          infobip_message_id?: string | null
          patient_cnumber?: string
          recipient_phone?: string
          sender_display_name?: string
          sender_id?: string
          sender_tag?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_patient_cnumber_fkey"
            columns: ["patient_cnumber"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["cnumber"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_recent_activity"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_phones: {
        Row: {
          id: string
          label: string
          patient_id: string
          phone: string
        }
        Insert: {
          id?: string
          label: string
          patient_id: string
          phone: string
        }
        Update: {
          id?: string
          label?: string
          patient_id?: string
          phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_phones_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          city: string | null
          cnumber: string
          created_at: string
          created_by: string
          date_of_birth: string | null
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          internal_notes: string | null
          is_active: boolean
          last_contact_at: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          cnumber: string
          created_at?: string
          created_by: string
          date_of_birth?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          internal_notes?: string | null
          is_active?: boolean
          last_contact_at?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          cnumber?: string
          created_at?: string
          created_by?: string
          date_of_birth?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          internal_notes?: string | null
          is_active?: boolean
          last_contact_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_recent_activity"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "patients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          blocked_until: number | null
          count: number
          created_at: string
          id: string
          key: string
          reset_time: number
          updated_at: string
        }
        Insert: {
          blocked_until?: number | null
          count?: number
          created_at?: string
          id?: string
          key: string
          reset_time: number
          updated_at?: string
        }
        Update: {
          blocked_until?: number | null
          count?: number
          created_at?: string
          id?: string
          key?: string
          reset_time?: number
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          dark_mode: boolean | null
          display_name: string | null
          email: string
          email_notifications: boolean | null
          id: string
          is_active: boolean
          profile_visibility: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          dark_mode?: boolean | null
          display_name?: string | null
          email: string
          email_notifications?: boolean | null
          id: string
          is_active?: boolean
          profile_visibility?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          dark_mode?: boolean | null
          display_name?: string | null
          email?: string
          email_notifications?: boolean | null
          id?: string
          is_active?: boolean
          profile_visibility?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      dashboard_stats: {
        Row: {
          active_users: number | null
          generated_at: string | null
          messages_pending: number | null
          messages_today: number | null
          patients_total: number | null
        }
        Relationships: []
      }
      user_recent_activity: {
        Row: {
          created_at: string | null
          email: string | null
          is_active: boolean | null
          recent_patients: Json | null
          role: Database["public"]["Enums"]["user_role"] | null
          total_messages_sent: number | null
          updated_at: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          is_active?: boolean | null
          recent_patients?: never
          role?: Database["public"]["Enums"]["user_role"] | null
          total_messages_sent?: never
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          is_active?: boolean | null
          recent_patients?: never
          role?: Database["public"]["Enums"]["user_role"] | null
          total_messages_sent?: never
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_expired_rate_limits: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      current_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      current_uid: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      gender: "male" | "female" | "other"
      message_status: "pending" | "sent" | "delivered" | "failed"
      user_role: "user" | "moderator" | "admin"
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
      gender: ["male", "female", "other"],
      message_status: ["pending", "sent", "delivered", "failed"],
      user_role: ["user", "moderator", "admin"],
    },
  },
} as const
