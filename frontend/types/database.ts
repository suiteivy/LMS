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
          gender: "male" | "female" | "other" | null;
          date_of_birth: string | null;
          address: string | null;
          avatar_url: string | null;
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
          gender?: "male" | "female" | "other" | null;
          date_of_birth?: string | null;
          address?: string | null;
          avatar_url?: string | null;
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
          gender?: "male" | "female" | "other" | null;
          date_of_birth?: string | null;
          address?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      admins: {
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
        Relationships: [
          {
            foreignKeyName: "admins_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      parents: {
        Row: {
          id: string;
          user_id: string;
          occupation: string | null;
          address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          occupation?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          occupation?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
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
          grade_level: string | null;
          parent_contact: string | null;
          admission_date: string | null;
          academic_year: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          grade_level?: string | null;
          parent_contact?: string | null;
          admission_date?: string | null;
          academic_year?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          grade_level?: string | null;
          parent_contact?: string | null;
          admission_date?: string | null;
          academic_year?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          created_at?: string;
          updated_at?: string;
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
          department: string | null;
          qualification: string | null;
          specialization: string | null;
          position: "teacher" | "head_of_department" | "assistant" | "class_teacher" | "dean" | null;
          hire_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          department?: string | null;
          qualification?: string | null;
          specialization?: string | null;
          position?: "teacher" | "head_of_department" | "assistant" | "class_teacher" | "dean" | null;
          hire_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          department?: string | null;
          qualification?: string | null;
          specialization?: string | null;
          position?: "teacher" | "head_of_department" | "assistant" | "class_teacher" | "dean" | null;
          hire_date?: string | null;
          created_at?: string;
          updated_at?: string;
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
          location: string | null;
          phone: string | null;
          email: string | null;
          type: "primary" | "secondary" | "tertiary" | "vocational" | null;
          principal_name: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          location?: string | null;
          phone?: string | null;
          email?: string | null;
          type?: "primary" | "secondary" | "tertiary" | "vocational" | null;
          principal_name?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          location?: string | null;
          phone?: string | null;
          email?: string | null;
          type?: "primary" | "secondary" | "tertiary" | "vocational" | null;
          principal_name?: string | null;
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
      class_enrollments: {
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
          fee_config: Json | null;
          materials: Json | null;
          credits: number | null;
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
          fee_config?: Json | null;
          materials?: Json | null;
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
          fee_config?: Json | null;
          materials?: Json | null;
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
      enrollments: {
        Row: {
          id: string;
          student_id: string;
          subject_id: string;
          status: "enrolled" | "completed" | "dropped";
          grade: string | null;
          enrollment_date: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          subject_id: string;
          status?: "enrolled" | "completed" | "dropped";
          grade?: string | null;
          enrollment_date?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          subject_id?: string;
          status?: "enrolled" | "completed" | "dropped";
          grade?: string | null;
          enrollment_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "enrollments_student_id_fkey";
            columns: ["student_id"];
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enrollments_subject_id_fkey";
            columns: ["subject_id"];
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          }
        ];
      };
      financial_transactions: {
        Row: {
          id: string;
          institution_id: string | null;
          user_id: string | null;
          type: "fee_payment" | "salary_payout" | "expense" | "grant" | "other";
          direction: "inflow" | "outflow";
          amount: number;
          date: string | null;
          method: string | null;
          status: string | null;
          reference_id: string | null;
          meta: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id?: string | null;
          user_id?: string | null;
          type: "fee_payment" | "salary_payout" | "expense" | "grant" | "other";
          direction: "inflow" | "outflow";
          amount: number;
          date?: string | null;
          method?: string | null;
          status?: string | null;
          reference_id?: string | null;
          meta?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string | null;
          user_id?: string | null;
          type?: "fee_payment" | "salary_payout" | "expense" | "grant" | "other";
          direction?: "inflow" | "outflow";
          amount?: number;
          date?: string | null;
          method?: string | null;
          status?: string | null;
          reference_id?: string | null;
          meta?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "financial_transactions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      library_items: {
        Row: {
          id: string;
          title: string;
          author: string | null;
          isbn: string | null;
          category: string | null;
          total_quantity: number | null;
          available_quantity: number | null;
          cover_url: string | null;
          location: string | null;
          institution_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          author?: string | null;
          isbn?: string | null;
          category?: string | null;
          total_quantity?: number | null;
          available_quantity?: number | null;
          cover_url?: string | null;
          location?: string | null;
          institution_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          author?: string | null;
          isbn?: string | null;
          category?: string | null;
          total_quantity?: number | null;
          available_quantity?: number | null;
          cover_url?: string | null;
          location?: string | null;
          institution_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      library_loans: {
        Row: {
          id: string;
          item_id: string | null;
          user_id: string | null;
          borrow_date: string | null;
          due_date: string | null;
          return_date: string | null;
          status: "borrowed" | "returned" | "overdue" | "lost" | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          item_id?: string | null;
          user_id?: string | null;
          borrow_date?: string | null;
          due_date?: string | null;
          return_date?: string | null;
          status?: "borrowed" | "returned" | "overdue" | "lost" | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string | null;
          user_id?: string | null;
          borrow_date?: string | null;
          due_date?: string | null;
          return_date?: string | null;
          status?: "borrowed" | "returned" | "overdue" | "lost" | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "library_loans_item_id_fkey";
            columns: ["item_id"];
            referencedRelation: "library_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "library_loans_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      timetables: {
        Row: {
          id: string;
          class_id: string;
          subject_id: string;
          day_of_week: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
          start_time: string;
          end_time: string;
          room_number: string | null;
          institution_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          subject_id: string;
          day_of_week: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
          start_time: string;
          end_time: string;
          room_number?: string | null;
          institution_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          class_id?: string;
          subject_id?: string;
          day_of_week?: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
          start_time?: string;
          end_time?: string;
          room_number?: string | null;
          institution_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "timetables_class_id_fkey";
            columns: ["class_id"];
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "timetables_subject_id_fkey";
            columns: ["subject_id"];
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          }
        ];
      };
      funds: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          total_amount: number;
          allocated_amount: number;
          institution_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          total_amount?: number;
          allocated_amount?: number;
          institution_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          total_amount?: number;
          allocated_amount?: number;
          institution_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      fund_allocations: {
        Row: {
          id: string;
          fund_id: string;
          title: string;
          description: string | null;
          amount: number;
          category: string | null;
          allocation_date: string | null;
          status: "planned" | "active" | "closed" | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          fund_id: string;
          title: string;
          description?: string | null;
          amount: number;
          category?: string | null;
          allocation_date?: string | null;
          status?: "planned" | "active" | "closed" | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          fund_id?: string;
          title?: string;
          description?: string | null;
          amount?: number;
          category?: string | null;
          allocation_date?: string | null;
          status?: "planned" | "active" | "closed" | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fund_allocations_fund_id_fkey";
            columns: ["fund_id"];
            referencedRelation: "funds";
            referencedColumns: ["id"];
          }
        ];
      };
      attendance: {
        Row: {
          id: string;
          student_id: string;
          class_id: string;
          date: string;
          status: "present" | "absent" | "late" | "excused";
          recorded_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          class_id: string;
          date: string;
          status: "present" | "absent" | "late" | "excused";
          recorded_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          class_id?: string;
          date?: string;
          status?: "present" | "absent" | "late" | "excused";
          recorded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_student_id_fkey";
            columns: ["student_id"];
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_class_id_fkey";
            columns: ["class_id"];
            referencedRelation: "classes";
            referencedColumns: ["id"];
          }
        ];
      },
      resources: {
        Row: {
          id: string;
          subject_id: string;
          title: string;
          url: string;
          type: "link" | "video" | "pdf" | "image" | "other";
          size: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          title: string;
          url: string;
          type: "link" | "video" | "pdf" | "image" | "other";
          size?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          subject_id?: string;
          title?: string;
          url?: string;
          type?: "link" | "video" | "pdf" | "image" | "other";
          size?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "resources_subject_id_fkey";
            columns: ["subject_id"];
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          }
        ];
      },
      teacher_attendance: {
        Row: {
          id: string;
          teacher_id: string;
          date: string;
          status: "present" | "absent" | "late" | "excused";
          check_in_time: string | null;
          check_out_time: string | null;
          notes: string | null;
          institution_id: string | null;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          date?: string;
          status: "present" | "absent" | "late" | "excused";
          check_in_time?: string | null;
          check_out_time?: string | null;
          notes?: string | null;
          institution_id?: string | null;
          recorded_at?: string;
        };
        Update: {
          id?: string;
          teacher_id?: string;
          date?: string;
          status?: "present" | "absent" | "late" | "excused";
          check_in_time?: string | null;
          check_out_time?: string | null;
          notes?: string | null;
          institution_id?: string | null;
          recorded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teacher_attendance_teacher_id_fkey";
            columns: ["teacher_id"];
            referencedRelation: "teachers";
            referencedColumns: ["id"];
          }
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: "info" | "success" | "warning" | "error";
          is_read: boolean;
          data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type: "info" | "success" | "warning" | "error";
          is_read?: boolean;
          data?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: "info" | "success" | "warning" | "error";
          is_read?: boolean;
          data?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
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
