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
      activity: {
        Row: {
          actor_id: string | null
          created_at: string
          field: string | null
          id: string
          kind: string
          new_value: string | null
          old_value: string | null
          project_id: string
          source: string
          task_id: string
          workspace_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          field?: string | null
          id?: string
          kind: string
          new_value?: string | null
          old_value?: string | null
          project_id: string
          source: string
          task_id: string
          workspace_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          field?: string | null
          id?: string
          kind?: string
          new_value?: string | null
          old_value?: string | null
          project_id?: string
          source?: string
          task_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          approval_wait_ms: number | null
          approver_id: string | null
          conversation_id: string | null
          cost_usd: number
          created_at: string
          error: string | null
          id: string
          latency_ms: number | null
          member_id: string
          model: string
          prompt: string
          result: string
          role: string
          tokens_in: number
          tokens_out: number
          workspace_id: string
        }
        Insert: {
          approval_wait_ms?: number | null
          approver_id?: string | null
          conversation_id?: string | null
          cost_usd?: number
          created_at?: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          member_id: string
          model: string
          prompt: string
          result?: string
          role: string
          tokens_in?: number
          tokens_out?: number
          workspace_id: string
        }
        Update: {
          approval_wait_ms?: number | null
          approver_id?: string | null
          conversation_id?: string | null
          cost_usd?: number
          created_at?: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          member_id?: string
          model?: string
          prompt?: string
          result?: string
          role?: string
          tokens_in?: number
          tokens_out?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tool_calls: {
        Row: {
          args: Json
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          kind: string
          name: string
          result: Json | null
          rows: number | null
          run_id: string
          status: string
          tool_call_id: string
        }
        Insert: {
          args?: Json
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          kind: string
          name: string
          result?: Json | null
          rows?: number | null
          run_id: string
          status: string
          tool_call_id: string
        }
        Update: {
          args?: Json
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          kind?: string
          name?: string
          result?: Json | null
          rows?: number | null
          run_id?: string
          status?: string
          tool_call_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tool_calls_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_settings: {
        Row: {
          api_key_enc: string | null
          base_url: string
          key_hint: string | null
          model: string
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          api_key_enc?: string | null
          base_url: string
          key_hint?: string | null
          model: string
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          api_key_enc?: string | null
          base_url?: string
          key_hint?: string | null
          model?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          member_id: string
          messages: Json
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          messages?: Json
          title?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          messages?: Json
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      labels: {
        Row: {
          color: number
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          color: number
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          color?: number
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "labels_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          avatar: number
          handle: string
          id: string
          inbox_seen_at: string
          initials: string
          name: string
          role: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          avatar: number
          handle: string
          id?: string
          inbox_seen_at?: string
          initials: string
          name: string
          role?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          avatar?: number
          handle?: string
          id?: string
          inbox_seen_at?: string
          initials?: string
          name?: string
          role?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_actions: {
        Row: {
          conversation_id: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          member_id: string
          payload: Json
          result: Json | null
          run_id: string
          status: string
          tool: string
          tool_call_id: string
          workspace_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          member_id: string
          payload: Json
          result?: Json | null
          run_id: string
          status?: string
          tool: string
          tool_call_id: string
          workspace_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          member_id?: string
          payload?: Json
          result?: Json | null
          run_id?: string
          status?: string
          tool?: string
          tool_call_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_actions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_actions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_actions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_actions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_actions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          member_id: string
          project_id: string
        }
        Insert: {
          member_id: string
          project_id: string
        }
        Update: {
          member_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          color: number
          id: string
          key: string
          name: string
          next_number: number
          position: number
          workspace_id: string
        }
        Insert: {
          color: number
          id?: string
          key: string
          name: string
          next_number?: number
          position?: number
          workspace_id: string
        }
        Update: {
          color?: number
          id?: string
          key?: string
          name?: string
          next_number?: number
          position?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          description: string
          due_date: string | null
          id: string
          label_id: string | null
          last_source: string
          number: number
          position: number
          priority: number
          project_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          label_id?: string | null
          last_source?: string
          number: number
          position: number
          priority?: number
          project_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          label_id?: string | null
          last_source?: string
          number?: number
          position?: number
          priority?: number
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_daily: {
        Row: {
          cost_usd: number
          day: string
          runs: number
        }
        Insert: {
          cost_usd?: number
          day: string
          runs?: number
        }
        Update: {
          cost_usd?: number
          day?: string
          runs?: number
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          is_demo: boolean
          name: string
          timezone: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_demo?: boolean
          name: string
          timezone?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_demo?: boolean
          name?: string
          timezone?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_see_project: {
        Args: { p: string }
        Returns: boolean
      }
      commit_pending_action: {
        Args: { action_id: string; edits?: Json }
        Returns: Json
      }
      demo_ensure_sandbox: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      demo_reset: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      demo_set_role: {
        Args: { new_role: string }
        Returns: undefined
      }
      is_ws_admin: {
        Args: { ws: string }
        Returns: boolean
      }
      is_ws_member: {
        Args: { ws: string }
        Returns: boolean
      }
      mark_inbox_seen: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      my_member_id: {
        Args: { ws: string }
        Returns: string
      }
      project_access: {
        Args: { project_key: string }
        Returns: string
      }
      project_counts: {
        Args: Record<PropertyKey, never>
        Returns: {
          total: number
          visible: number
        }[]
      }
      record_usage: {
        Args: { cost: number }
        Returns: undefined
      }
      seed_id: {
        Args: { ws: string; k: string; kind: string }
        Returns: string
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

