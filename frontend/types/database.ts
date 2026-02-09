export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: "admin" | "student" | "teacher";
          status: "pending" | "approved" | "rejected";
          institution_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          role: "admin" | "student" | "teacher";
          status?: "pending" | "approved" | "rejected";
          institution_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          role?: "admin" | "student" | "teacher";
          status?: "pending" | "approved" | "rejected";
          institution_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      institutions: {
        Row: {
          id: string;
          name: string;
        };
        Insert: {
          id?: string;
          name: string;
        };
        Update: {
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          student_id: string;
          amount: number;
          payment_date: string;
          payment_method: string;
          status: string;
          reference_number?: string | null;
          notes?: string | null;
        };
        Insert: {
          id?: string;
          student_id: string;
          amount: number;
          payment_date: string;
          payment_method: string;
          status: string;
          reference_number?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          student_id?: string;
          amount?: number;
          payment_date?: string;
          payment_method?: string;
          status?: string;
          reference_number?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      teacher_payouts: {
        Row: {
          id: string;
          teacher_id: string;
          amount: number;
          status: string;
          payment_date: string | null;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          amount: number;
          status: string;
          payment_date?: string | null;
        };
        Update: {
          id?: string;
          teacher_id?: string;
          amount?: number;
          status?: string;
          payment_date?: string | null;
        };
        Relationships: [];
      };
      fee_structures: {
        Row: {
          id: string;
          course_id: string;
          base_fee: number;
          registration_fee: number;
          material_fee: number;
          teacher_rate: number;
          bursary_percentage: number;
          effective_date: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          course_id: string;
          base_fee: number;
          registration_fee: number;
          material_fee: number;
          teacher_rate: number;
          bursary_percentage: number;
          effective_date: string;
          is_active: boolean;
        };
        Update: {
          id?: string;
          course_id?: string;
          base_fee?: number;
          registration_fee?: number;
          material_fee?: number;
          teacher_rate?: number;
          bursary_percentage?: number;
          effective_date?: string;
          is_active?: boolean;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          fee_amount: number | null;
          teacher_id: string | null;
          institution_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          fee_amount?: number | null;
          teacher_id?: string | null;
          institution_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          fee_amount?: number | null;
          teacher_id?: string | null;
          institution_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
