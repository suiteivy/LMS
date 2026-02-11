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
          role: "admin" | "student" | "teacher" | "parent";
          status: "pending" | "approved" | "rejected";
          institution_id: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          role: "admin" | "student" | "teacher" | "parent";
          status?: "pending" | "approved" | "rejected";
          institution_id?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          role?: "admin" | "student" | "teacher" | "parent";
          status?: "pending" | "approved" | "rejected";
          institution_id?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      parents: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      book: {
        Row: {
          id: number;
          book_id: string | null;
          book_title: string | null;
          author: string | null;
          isbn: string | null;
          category: string | null;
          borrower_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          book_id?: string | null;
          book_title?: string | null;
          author?: string | null;
          isbn?: string | null;
          category?: string | null;
          borrower_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          book_id?: string | null;
          book_title?: string | null;
          author?: string | null;
          isbn?: string | null;
          category?: string | null;
          borrower_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      library: {
        Row: {
          id: string;
          book_id: number | null;
          category: string | null;
          quantity: number | null;
        };
        Insert: {
          id?: string;
          book_id?: number | null;
          category?: string | null;
          quantity?: number | null;
        };
        Update: {
          id?: string;
          book_id?: number | null;
          category?: string | null;
          quantity?: number | null;
        };
        Relationships: [];
      };
      announcements: {
        Row: {
          id: string;
          subject_id: string;
          teacher_id: string;
          title: string;
          message: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          teacher_id: string;
          title: string;
          message: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          subject_id?: string;
          teacher_id?: string;
          title?: string;
          message?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "announcements_subject_id_fkey";
            columns: ["subject_id"];
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "announcements_teacher_id_fkey";
            columns: ["teacher_id"];
            referencedRelation: "teachers";
            referencedColumns: ["id"];
          }
        ];
      };
      students: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "students_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      teachers: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teachers_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
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
          subject_id: string;
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
          subject_id: string;
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
          subject_id?: string;
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
      classes: {
        Row: {
          id: string;
          name: string;
          institution_id: string | null;
          teacher_id: string | null; // Now TEXT (Custom ID)
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          institution_id?: string | null;
          teacher_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          institution_id?: string | null;
          teacher_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "classes_teacher_id_fkey";
            columns: ["teacher_id"];
            referencedRelation: "teachers";
            referencedColumns: ["id"];
          }
        ];
      };
      enrollments: {
        Row: {
          id: string;
          student_id: string; // Now TEXT (Custom ID)
          class_id: string;
          enrolled_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          class_id: string;
          enrolled_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          class_id?: string;
          enrolled_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "enrollments_student_id_fkey";
            columns: ["student_id"];
            referencedRelation: "students";
            referencedColumns: ["id"];
          }
        ];
      };
      assignments: {
        Row: {
          id: string;
          subject_id: string;
          teacher_id: string; // Now TEXT
          title: string;
          description: string | null;
          due_date: string | null;
          total_points: number;
          status: "draft" | "active" | "closed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          teacher_id: string;
          title: string;
          description?: string | null;
          due_date?: string | null;
          total_points?: number;
          status?: "draft" | "active" | "closed";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          subject_id?: string;
          teacher_id?: string;
          title?: string;
          description?: string | null;
          due_date?: string | null;
          total_points?: number;
          status?: "draft" | "active" | "closed";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      submissions: {
        Row: {
          id: string;
          assignment_id: string;
          student_id: string; // Now TEXT
          content: string | null;
          grade: number | null;
          feedback: string | null;
          status: "submitted" | "graded" | "late" | "pending";
          submitted_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          student_id: string;
          content?: string | null;
          grade?: number | null;
          feedback?: string | null;
          status?: "submitted" | "graded" | "late" | "pending";
          submitted_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          student_id?: string;
          content?: string | null;
          grade?: number | null;
          feedback?: string | null;
          status?: "submitted" | "graded" | "late" | "pending";
          submitted_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      attendance: {
        Row: {
          id: string;
          class_id: string;
          student_id: string; // Now TEXT
          date: string;
          status: "present" | "absent" | "late" | "excused";
          notes: string | null;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          student_id: string;
          date?: string;
          status: "present" | "absent" | "late" | "excused";
          notes?: string | null;
          recorded_at?: string;
        };
        Update: {
          id?: string;
          class_id?: string;
          student_id?: string;
          date?: string;
          status?: "present" | "absent" | "late" | "excused";
          notes?: string | null;
          recorded_at?: string;
        };
        Relationships: [];
      };
      resources: {
        Row: {
          id: string;
          subject_id: string;
          title: string;
          type: "pdf" | "video" | "link" | "other";
          url: string;
          size: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          title: string;
          type?: "pdf" | "video" | "link" | "other";
          url: string;
          size?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          subject_id?: string;
          title?: string;
          type?: "pdf" | "video" | "link" | "other";
          url?: string;
          size?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      bursaries: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          amount: number;
          requirements: string | null;
          deadline: string;
          status: "open" | "closed";
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          amount: number;
          requirements?: string | null;
          deadline: string;
          status?: "open" | "closed";
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          amount?: number;
          requirements?: string | null;
          deadline?: string;
          status?: "open" | "closed";
          created_at?: string;
        };
        Relationships: [];
      };
      bursary_applications: {
        Row: {
          id: string;
          bursary_id: string;
          student_id: string;
          status: "pending" | "approved" | "rejected";
          justification: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          bursary_id: string;
          student_id: string;
          status?: "pending" | "approved" | "rejected";
          justification?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          bursary_id?: string;
          student_id?: string;
          status?: "pending" | "approved" | "rejected";
          justification?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bursary_applications_bursary_id_fkey";
            columns: ["bursary_id"];
            referencedRelation: "bursaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bursary_applications_student_id_fkey";
            columns: ["student_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      subjects: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          fee_amount: number | null;
          teacher_id: string | null; // Now TEXT
          institution_id: string | null;
          class_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          fee_amount?: number | null;
          teacher_id?: string | null;
          institution_id?: string | null;
          class_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          fee_amount?: number | null;
          teacher_id?: string | null;
          institution_id?: string | null;
          class_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subjects_teacher_id_fkey";
            columns: ["teacher_id"];
            referencedRelation: "teachers";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
