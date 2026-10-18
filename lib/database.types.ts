
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "clientes": {
                  Row: {
                    "administrador": string | null,"created_at": string,"direccion": string | null,"id": string,"nombre": string,"telefono": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "administrador"?: string | null,"created_at"?: string,"direccion"?: string | null,"id"?: string,"nombre": string,"telefono"?: string | null
                  }
                  Update: {
                    "administrador"?: string | null,"created_at"?: string,"direccion"?: string | null,"id"?: string,"nombre"?: string,"telefono"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"evento_personas": {
                  Row: {
                    "avisado_at": string | null,"evento_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avisado_at"?: string | null,"evento_id": string,"user_id": string
                  }
                  Update: {
                    "avisado_at"?: string | null,"evento_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "evento_personas_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "eventos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "evento_personas_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"eventos": {
                  Row: {
                    "avisar_dias": number,"created_at": string,"fecha": string,"fecha_aviso": string | null,"hora": string | null,"id": string,"notas": string | null,"obra_id": string | null,"tipo": Database["public"]['Enums']["tipo_evento"],"titulo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avisar_dias"?: number,"created_at"?: string,"fecha": string,"fecha_aviso"?: never,"hora"?: string | null,"id"?: string,"notas"?: string | null,"obra_id"?: string | null,"tipo"?: Database["public"]['Enums']["tipo_evento"],"titulo": string
                  }
                  Update: {
                    "avisar_dias"?: number,"created_at"?: string,"fecha"?: string,"fecha_aviso"?: never,"hora"?: string | null,"id"?: string,"notas"?: string | null,"obra_id"?: string | null,"tipo"?: Database["public"]['Enums']["tipo_evento"],"titulo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "eventos_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "obras"
      referencedColumns: ["id"]
    }
                  ]
                },"obra_trabajadores": {
                  Row: {
                    "obra_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "obra_id": string,"user_id": string
                  }
                  Update: {
                    "obra_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "obra_trabajadores_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "obras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "obra_trabajadores_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"obras": {
                  Row: {
                    "cliente_id": string,"created_at": string,"direccion": string,"estado": Database["public"]['Enums']["estado_obra"],"id": string,"presupuesto": number | null,"tipo_trabajo": Database["public"]['Enums']["tipo_trabajo"],"titulo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cliente_id": string,"created_at"?: string,"direccion": string,"estado"?: Database["public"]['Enums']["estado_obra"],"id"?: string,"presupuesto"?: number | null,"tipo_trabajo": Database["public"]['Enums']["tipo_trabajo"],"titulo": string
                  }
                  Update: {
                    "cliente_id"?: string,"created_at"?: string,"direccion"?: string,"estado"?: Database["public"]['Enums']["estado_obra"],"id"?: string,"presupuesto"?: number | null,"tipo_trabajo"?: Database["public"]['Enums']["tipo_trabajo"],"titulo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "obras_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "activo": boolean,"created_at": string,"id": string,"nombre": string,"rol": Database["public"]['Enums']["rol_usuario"],"username": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"created_at"?: string,"id": string,"nombre": string,"rol"?: Database["public"]['Enums']["rol_usuario"],"username": string
                  }
                  Update: {
                    "activo"?: boolean,"created_at"?: string,"id"?: string,"nombre"?: string,"rol"?: Database["public"]['Enums']["rol_usuario"],"username"?: string
                  }
                  Relationships: [
                    
                  ]
                },"push_suscripciones": {
                  Row: {
                    "auth": string,"created_at": string,"endpoint": string,"id": string,"p256dh": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"created_at"?: string,"endpoint": string,"id"?: string,"p256dh": string,"user_id": string
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"endpoint"?: string,"id"?: string,"p256dh"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_suscripciones_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "cambiar_estado_obra":
{ Args: { "p_estado": Database["public"]['Enums']["estado_obra"],"p_obra": string }; Returns: undefined
                           }
          }
          Enums: {
            "estado_obra": "pendiente"|"presupuestada"|"en_curso"|"terminada"|"cancelada","rol_usuario": "jefe"|"trabajador","tipo_evento": "cita"|"fecha_limite","tipo_trabajo": "reparacion"|"tejado"|"canalones"|"chimenea"|"pintura"|"trabajo_altura"|"otro"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "estado_obra": ["pendiente", "presupuestada", "en_curso", "terminada", "cancelada"],"rol_usuario": ["jefe", "trabajador"],"tipo_evento": ["cita", "fecha_limite"],"tipo_trabajo": ["reparacion", "tejado", "canalones", "chimenea", "pintura", "trabajo_altura", "otro"]
          }
        }
} as const
