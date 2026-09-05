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
      academic_reports: {
        Row: {
          academic_year: string
          created_at: string | null
          created_by: string | null
          data: Json | null
          file_url: string | null
          id: string
          institution_id: string | null
          report_type: string
          status: string | null
          student_id: string | null
          term: string
          updated_at: string | null
        }
        Insert: {
          academic_year: string
          created_at?: string | null
          created_by?: string | null
          data?: Json | null
          file_url?: string | null
          id?: string
          institution_id?: string | null
          report_type: string
          status?: string | null
          student_id?: string | null
          term: string
          updated_at?: string | null
        }
        Update: {
          academic_year?: string
          created_at?: string | null
          created_by?: string | null
          data?: Json | null
          file_url?: string | null
          id?: string
          institution_id?: string | null
          report_type?: string
          status?: string | null
          student_id?: string | null
          term?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_reports_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_detailed"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_years: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          institution_id: string | null
          is_current: boolean | null
          name: string
          start_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          institution_id?: string | null
          is_current?: boolean | null
          name: string
          start_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          institution_id?: string | null
          is_current?: boolean | null
          name?: string
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_years_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      addon_requests: {
        Row: {
          addon_type: string
          created_at: string | null
          id: string
          institution_id: string | null
          notes: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          addon_type: string
          created_at?: string | null
          id?: string
          institution_id?: string | null
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          addon_type?: string
          created_at?: string | null
          id?: string
          institution_id?: string | null
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "addon_requests_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addon_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      admins: {
        Row: {
          created_at: string | null
          id: string
          institution_id: string | null
          is_main: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          institution_id?: string | null
          is_main?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          institution_id?: string | null
          is_main?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admins_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          institution_id: string | null
          message: string
          subject_id: string | null
          teacher_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          institution_id?: string | null
          message: string
          subject_id?: string | null
          teacher_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          institution_id?: string | null
          message?: string
          subject_id?: string | null
          teacher_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_types: {
        Row: {
          category: string
          code: string
          created_at: string | null
          default_weight: number | null
          display_order: number | null
          id: string
          institution_id: string | null
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          default_weight?: number | null
          display_order?: number | null
          id?: string
          institution_id?: string | null
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          default_weight?: number | null
          display_order?: number | null
          id?: string
          institution_id?: string | null
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_types_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          class_id: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          grades_released: boolean
          id: string
          institution_id: string | null
          is_published: boolean | null
          status: string | null
          student_id: string | null
          subject_id: string | null
          teacher_id: string | null
          term: string | null
          title: string
          total_points: number | null
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          class_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          grades_released?: boolean
          id?: string
          institution_id?: string | null
          is_published?: boolean | null
          status?: string | null
          student_id?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          term?: string | null
          title: string
          total_points?: number | null
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          class_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          grades_released?: boolean
          id?: string
          institution_id?: string | null
          is_published?: boolean | null
          status?: string | null
          student_id?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          term?: string | null
          title?: string
          total_points?: number | null
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_classes_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          class_id: string | null
          date: string
          id: string
          institution_id: string | null
          notes: string | null
          recorded_at: string | null
          status: string
          student_id: string | null
          subject_id: string | null
        }
        Insert: {
          class_id?: string | null
          date?: string
          id?: string
          institution_id?: string | null
          notes?: string | null
          recorded_at?: string | null
          status: string
          student_id?: string | null
          subject_id?: string | null
        }
        Update: {
          class_id?: string | null
          date?: string
          id?: string
          institution_id?: string | null
          notes?: string | null
          recorded_at?: string | null
          status?: string
          student_id?: string | null
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_classes_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          author: string | null
          available_quantity: number
          call_number: string | null
          category: string | null
          created_at: string | null
          description: string | null
          edition: string | null
          id: string
          institution_id: string | null
          isbn: string | null
          language: string | null
          page_count: number | null
          publication_year: number | null
          publisher: string | null
          shelf_location: string | null
          title: string
          total_quantity: number
          updated_at: string | null
        }
        Insert: {
          author?: string | null
          available_quantity?: number
          call_number?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          edition?: string | null
          id?: string
          institution_id?: string | null
          isbn?: string | null
          language?: string | null
          page_count?: number | null
          publication_year?: number | null
          publisher?: string | null
          shelf_location?: string | null
          title: string
          total_quantity?: number
          updated_at?: string | null
        }
        Update: {
          author?: string | null
          available_quantity?: number
          call_number?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          edition?: string | null
          id?: string
          institution_id?: string | null
          isbn?: string | null
          language?: string | null
          page_count?: number | null
          publication_year?: number | null
          publisher?: string | null
          shelf_location?: string | null
          title?: string
          total_quantity?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "books_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      borrowed_books: {
        Row: {
          book_id: string
          borrowed_at: string | null
          created_at: string | null
          due_date: string | null
          id: string
          institution_id: string | null
          issued_by: string | null
          notes: string | null
          return_notes: string | null
          returned_at: string | null
          returned_by: string | null
          status: string | null
          student_id: string | null
          teacher_id: string | null
        }
        Insert: {
          book_id: string
          borrowed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          institution_id?: string | null
          issued_by?: string | null
          notes?: string | null
          return_notes?: string | null
          returned_at?: string | null
          returned_by?: string | null
          status?: string | null
          student_id?: string | null
          teacher_id?: string | null
        }
        Update: {
          book_id?: string
          borrowed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          institution_id?: string | null
          issued_by?: string | null
          notes?: string | null
          return_notes?: string | null
          returned_at?: string | null
          returned_by?: string | null
          status?: string | null
          student_id?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "borrowed_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrowed_books_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrowed_books_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrowed_books_returned_by_fkey"
            columns: ["returned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrowed_books_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrowed_books_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrowed_books_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      bursaries: {
        Row: {
          amount: number
          created_at: string | null
          deadline: string | null
          description: string | null
          id: string
          institution_id: string | null
          requirements: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          institution_id?: string | null
          requirements?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          institution_id?: string | null
          requirements?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bursaries_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      bursars: {
        Row: {
          created_at: string | null
          id: string
          institution_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          institution_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          institution_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bursars_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bursars_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bursary_applications: {
        Row: {
          amount_awarded: string | null
          applied_at: string | null
          bursary_id: string | null
          id: string
          institution_id: string | null
          justification: string | null
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          student_id: string | null
        }
        Insert: {
          amount_awarded?: string | null
          applied_at?: string | null
          bursary_id?: string | null
          id?: string
          institution_id?: string | null
          justification?: string | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          student_id?: string | null
        }
        Update: {
          amount_awarded?: string | null
          applied_at?: string | null
          bursary_id?: string | null
          id?: string
          institution_id?: string | null
          justification?: string | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bursary_applications_bursary_id_fkey"
            columns: ["bursary_id"]
            isOneToOne: false
            referencedRelation: "bursaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bursary_applications_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bursary_applications_new_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bursary_applications_new_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bursary_applications_new_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_detailed"
            referencedColumns: ["id"]
          },
        ]
      }
      category_types: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      class_categories: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          institution_id: string
          is_active: boolean
          name: string
          school_category_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          institution_id: string
          is_active?: boolean
          name: string
          school_category_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          institution_id?: string
          is_active?: boolean
          name?: string
          school_category_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_categories_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_categories_school_category_id_fkey"
            columns: ["school_category_id"]
            isOneToOne: false
            referencedRelation: "school_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      class_enrollments: {
        Row: {
          class_id: string | null
          enrolled_at: string | null
          id: string
          institution_id: string | null
          student_id: string
        }
        Insert: {
          class_id?: string | null
          enrolled_at?: string | null
          id?: string
          institution_id?: string | null
          student_id: string
        }
        Update: {
          class_id?: string | null
          enrolled_at?: string | null
          id?: string
          institution_id?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_enrollments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_classes_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_new_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_new_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_detailed"
            referencedColumns: ["id"]
          },
        ]
      }
      class_levels: {
        Row: {
          category_id: string
          created_at: string
          deleted_at: string | null
          id: string
          institution_id: string
          is_active: boolean
          level_number: number
          name: string | null
          sort_order: number
          type_id: string | null
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          institution_id: string
          is_active?: boolean
          level_number: number
          name?: string | null
          sort_order?: number
          type_id?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          institution_id?: string
          is_active?: boolean
          level_number?: number
          name?: string | null
          sort_order?: number
          type_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_levels_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "class_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_levels_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_levels_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "category_types"
            referencedColumns: ["id"]
          },
        ]
      }
      class_streams: {
        Row: {
          code: string
          created_at: string
          deleted_at: string | null
          id: string
          institution_id: string
          is_active: boolean
          level_id: string
          name: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          institution_id: string
          is_active?: boolean
          level_id: string
          name?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          institution_id?: string
          is_active?: boolean
          level_id?: string
          name?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_streams_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_streams_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "class_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          capacity: number | null
          category_id: string | null
          class_type: string | null
          created_at: string | null
          deleted_at: string | null
          display_name: string | null
          form_level: number | null
          grade_level: number | null
          id: string
          institution_id: string | null
          level_id: string | null
          stream: string | null
          stream_id: string | null
          teacher_id: string | null
          updated_at: string | null
        }
        Insert: {
          capacity?: number | null
          category_id?: string | null
          class_type?: string | null
          created_at?: string | null
          deleted_at?: string | null
          display_name?: string | null
          form_level?: number | null
          grade_level?: number | null
          id?: string
          institution_id?: string | null
          level_id?: string | null
          stream?: string | null
          stream_id?: string | null
          teacher_id?: string | null
          updated_at?: string | null
        }
        Update: {
          capacity?: number | null
          category_id?: string | null
          class_type?: string | null
          created_at?: string | null
          deleted_at?: string | null
          display_name?: string | null
          form_level?: number | null
          grade_level?: number | null
          id?: string
          institution_id?: string | null
          level_id?: string | null
          stream?: string | null
          stream_id?: string | null
          teacher_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "class_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "class_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_new_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: true
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "class_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          deleted_at: string | null
          id: string
          is_typing: boolean | null
          joined_at: string | null
          last_delivered_at: string | null
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          deleted_at?: string | null
          id?: string
          is_typing?: boolean | null
          joined_at?: string | null
          last_delivered_at?: string | null
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          deleted_at?: string | null
          id?: string
          is_typing?: boolean | null
          joined_at?: string | null
          last_delivered_at?: string | null
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          direct_key: string | null
          expires_at: string | null
          id: string
          institution_id: string
          last_message_at: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          direct_key?: string | null
          expires_at?: string | null
          id?: string
          institution_id: string
          last_message_at?: string | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          direct_key?: string | null
          expires_at?: string | null
          id?: string
          institution_id?: string
          last_message_at?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      credential_delivery_tokens: {
        Row: {
          consumed_at: string | null
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          metadata: Json
          target_email: string
          target_user_id: string | null
          temporary_password: string
          token: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          metadata?: Json
          target_email: string
          target_user_id?: string | null
          temporary_password: string
          token: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          metadata?: Json
          target_email?: string
          target_user_id?: string | null
          temporary_password?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "credential_delivery_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_delivery_tokens_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          created_at: string | null
          decimal_places: number
          deleted_at: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          symbol: string
          updated_at: string | null
          usd_rate: number
        }
        Insert: {
          code: string
          created_at?: string | null
          decimal_places?: number
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          symbol: string
          updated_at?: string | null
          usd_rate?: number
        }
        Update: {
          code?: string
          created_at?: string | null
          decimal_places?: number
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          symbol?: string
          updated_at?: string | null
          usd_rate?: number
        }
        Relationships: []
      }
      daily_hours_contributions: {
        Row: {
          created_at: string
          daily_hours_log_id: string
          id: string
          minutes: number
          timetable_entry_id: string
        }
        Insert: {
          created_at?: string
          daily_hours_log_id: string
          id?: string
          minutes?: number
          timetable_entry_id: string
        }
        Update: {
          created_at?: string
          daily_hours_log_id?: string
          id?: string
          minutes?: number
          timetable_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_hours_contributions_daily_hours_log_id_fkey"
            columns: ["daily_hours_log_id"]
            isOneToOne: false
            referencedRelation: "daily_hours_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_hours_contributions_timetable_entry_id_fkey"
            columns: ["timetable_entry_id"]
            isOneToOne: false
            referencedRelation: "timetables"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_hours_logs: {
        Row: {
          computed_at: string
          created_at: string
          date: string
          id: string
          institution_id: string
          is_deleted: boolean
          person_id: string
          person_type: string
          total_minutes: number
          updated_at: string
        }
        Insert: {
          computed_at?: string
          created_at?: string
          date: string
          id?: string
          institution_id: string
          is_deleted?: boolean
          person_id: string
          person_type: string
          total_minutes?: number
          updated_at?: string
        }
        Update: {
          computed_at?: string
          created_at?: string
          date?: string
          id?: string
          institution_id?: string
          is_deleted?: boolean
          person_id?: string
          person_type?: string
          total_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_hours_logs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_feature_flags: {
        Row: {
          created_at: string
          enabled: boolean | null
          feature_key: string
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean | null
          feature_key: string
          id?: string
          role: string
        }
        Update: {
          created_at?: string
          enabled?: boolean | null
          feature_key?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      diary_entries: {
        Row: {
          assignment_id: string | null
          class_id: string | null
          content: string
          created_at: string | null
          entry_date: string
          id: string
          institution_id: string | null
          is_signed: boolean | null
          status: string | null
          student_id: string | null
          teacher_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assignment_id?: string | null
          class_id?: string | null
          content: string
          created_at?: string | null
          entry_date?: string
          id?: string
          institution_id?: string | null
          is_signed?: boolean | null
          status?: string | null
          student_id?: string | null
          teacher_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assignment_id?: string | null
          class_id?: string | null
          content?: string
          created_at?: string | null
          entry_date?: string
          id?: string
          institution_id?: string | null
          is_signed?: boolean | null
          status?: string | null
          student_id?: string | null
          teacher_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diary_entries_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diary_entries_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diary_entries_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_classes_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diary_entries_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diary_entries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diary_entries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diary_entries_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          class_id: string | null
          enrollment_date: string
          grade: string | null
          id: string
          institution_id: string | null
          status: string | null
          student_id: string
          subject_id: string
        }
        Insert: {
          class_id?: string | null
          enrollment_date?: string
          grade?: string | null
          id?: string
          institution_id?: string | null
          status?: string | null
          student_id: string
          subject_id: string
        }
        Update: {
          class_id?: string | null
          enrollment_date?: string
          grade?: string | null
          id?: string
          institution_id?: string | null
          status?: string | null
          student_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_class_id_fkey1"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_class_id_fkey1"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_classes_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_results: {
        Row: {
          created_at: string | null
          exam_id: string | null
          feedback: string | null
          graded_by: string | null
          id: string
          institution_id: string | null
          score: number | null
          student_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          exam_id?: string | null
          feedback?: string | null
          graded_by?: string | null
          id?: string
          institution_id?: string | null
          score?: number | null
          student_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          exam_id?: string | null
          feedback?: string | null
          graded_by?: string | null
          id?: string
          institution_id?: string | null
          score?: number | null
          student_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_results_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_detailed"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          class_id: string | null
          created_at: string | null
          date: string
          description: string | null
          id: string
          institution_id: string | null
          is_published: boolean | null
          max_score: number | null
          subject_id: string | null
          teacher_id: string | null
          term: string | null
          title: string
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          institution_id?: string | null
          is_published?: boolean | null
          max_score?: number | null
          subject_id?: string | null
          teacher_id?: string | null
          term?: string | null
          title: string
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          institution_id?: string | null
          is_published?: boolean | null
          max_score?: number | null
          subject_id?: string | null
          teacher_id?: string | null
          term?: string | null
          title?: string
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_classes_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structures: {
        Row: {
          academic_year: string | null
          academic_year_id: string | null
          amount: number
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          institution_id: string | null
          is_active: boolean | null
          level_from: number | null
          level_scope: string | null
          level_to: number | null
          level_value: number | null
          released_at: string | null
          status_updated_at: string | null
          term: string | null
          term_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          academic_year?: string | null
          academic_year_id?: string | null
          amount: number
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          institution_id?: string | null
          is_active?: boolean | null
          level_from?: number | null
          level_scope?: string | null
          level_to?: number | null
          level_value?: number | null
          released_at?: string | null
          status_updated_at?: string | null
          term?: string | null
          term_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          academic_year?: string | null
          academic_year_id?: string | null
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          institution_id?: string | null
          is_active?: boolean | null
          level_from?: number | null
          level_scope?: string | null
          level_to?: number | null
          level_value?: number | null
          released_at?: string | null
          status_updated_at?: string | null
          term?: string | null
          term_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_structures_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          created_at: string | null
          date: string | null
          direction: string
          id: string
          institution_id: string | null
          meta: Json | null
          method: string | null
          origin_id: string | null
          origin_label: string | null
          origin_type: string | null
          recorded_by_label: string | null
          recorded_by_user_id: string | null
          reference_id: string | null
          status: string | null
          target_id: string | null
          target_label: string | null
          target_type: string | null
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          date?: string | null
          direction: string
          id?: string
          institution_id?: string | null
          meta?: Json | null
          method?: string | null
          origin_id?: string | null
          origin_label?: string | null
          origin_type?: string | null
          recorded_by_label?: string | null
          recorded_by_user_id?: string | null
          reference_id?: string | null
          status?: string | null
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          date?: string | null
          direction?: string
          id?: string
          institution_id?: string | null
          meta?: Json | null
          method?: string | null
          origin_id?: string | null
          origin_label?: string | null
          origin_type?: string | null
          recorded_by_label?: string | null
          recorded_by_user_id?: string | null
          reference_id?: string | null
          status?: string | null
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fund_allocations: {
        Row: {
          allocation_date: string | null
          amount: number
          category: string | null
          created_at: string | null
          description: string | null
          fund_id: string | null
          id: string
          institution_id: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          allocation_date?: string | null
          amount: number
          category?: string | null
          created_at?: string | null
          description?: string | null
          fund_id?: string | null
          id?: string
          institution_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          allocation_date?: string | null
          amount?: number
          category?: string | null
          created_at?: string | null
          description?: string | null
          fund_id?: string | null
          id?: string
          institution_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fund_allocations_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fund_allocations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      funds: {
        Row: {
          allocated_amount: number
          created_at: string | null
          description: string | null
          id: string
          institution_id: string | null
          name: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          allocated_amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          institution_id?: string | null
          name: string
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          allocated_amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          institution_id?: string | null
          name?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funds_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_audit_log: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          institution_id: string | null
          new_values: Json | null
          old_values: Json | null
          performed_by: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          institution_id?: string | null
          new_values?: Json | null
          old_values?: Json | null
          performed_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          institution_id?: string | null
          new_values?: Json | null
          old_values?: Json | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grade_audit_log_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_entries: {
        Row: {
          assessment_type_id: string | null
          class_id: string | null
          created_at: string | null
          feedback: string | null
          graded_by: string | null
          id: string
          institution_id: string | null
          max_score: number | null
          percentage: number | null
          score: number | null
          source: string | null
          source_id: string | null
          status: string | null
          student_id: string | null
          subject_id: string | null
          term_id: string | null
          updated_at: string | null
          weight_applied: number | null
          weighted_score: number | null
        }
        Insert: {
          assessment_type_id?: string | null
          class_id?: string | null
          created_at?: string | null
          feedback?: string | null
          graded_by?: string | null
          id?: string
          institution_id?: string | null
          max_score?: number | null
          percentage?: number | null
          score?: number | null
          source?: string | null
          source_id?: string | null
          status?: string | null
          student_id?: string | null
          subject_id?: string | null
          term_id?: string | null
          updated_at?: string | null
          weight_applied?: number | null
          weighted_score?: number | null
        }
        Update: {
          assessment_type_id?: string | null
          class_id?: string | null
          created_at?: string | null
          feedback?: string | null
          graded_by?: string | null
          id?: string
          institution_id?: string | null
          max_score?: number | null
          percentage?: number | null
          score?: number | null
          source?: string | null
          source_id?: string | null
          status?: string | null
          student_id?: string | null
          subject_id?: string | null
          term_id?: string | null
          updated_at?: string | null
          weight_applied?: number | null
          weighted_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "grade_entries_assessment_type_id_fkey"
            columns: ["assessment_type_id"]
            isOneToOne: false
            referencedRelation: "assessment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_entries_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_entries_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_classes_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_entries_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_entries_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_entries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_entries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_entries_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_entries_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          created_at: string | null
          feedback: string | null
          graded_by: string | null
          id: string
          institution_id: string | null
          student_id: string | null
          subject_id: string | null
          total_grade: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          feedback?: string | null
          graded_by?: string | null
          id?: string
          institution_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          total_grade?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          feedback?: string | null
          graded_by?: string | null
          id?: string
          institution_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          total_grade?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grades_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_scales: {
        Row: {
          created_at: string | null
          description: string | null
          gpa_points: number
          id: string
          institution_id: string | null
          is_active: boolean | null
          letter_grade: string
          max_score: number
          min_score: number
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          gpa_points: number
          id?: string
          institution_id?: string | null
          is_active?: boolean | null
          letter_grade: string
          max_score: number
          min_score: number
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          gpa_points?: number
          id?: string
          institution_id?: string | null
          is_active?: boolean | null
          letter_grade?: string
          max_score?: number
          min_score?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grading_scales_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_categories: {
        Row: {
          category_id: string
          created_at: string
          institution_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          institution_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          institution_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "school_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_categories_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          addon_bursary: boolean
          addon_diary: boolean
          addon_library: boolean | null
          addon_messaging: boolean | null
          category_id: string | null
          created_at: string | null
          crm_api_key: string | null
          currency_id: string
          custom_student_limit: number | null
          email: string | null
          email_domain: string | null
          has_used_trial: boolean | null
          id: string
          location: string | null
          name: string
          phone: string | null
          principal_name: string | null
          subscription_cycle: string | null
          subscription_plan: string | null
          subscription_status: string | null
          subscription_tracking_start_date: string | null
          timezone: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          addon_bursary?: boolean
          addon_diary?: boolean
          addon_library?: boolean | null
          addon_messaging?: boolean | null
          category_id?: string | null
          created_at?: string | null
          crm_api_key?: string | null
          currency_id: string
          custom_student_limit?: number | null
          email?: string | null
          email_domain?: string | null
          has_used_trial?: boolean | null
          id?: string
          location?: string | null
          name: string
          phone?: string | null
          principal_name?: string | null
          subscription_cycle?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          subscription_tracking_start_date?: string | null
          timezone?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          addon_bursary?: boolean
          addon_diary?: boolean
          addon_library?: boolean | null
          addon_messaging?: boolean | null
          category_id?: string | null
          created_at?: string | null
          crm_api_key?: string | null
          currency_id?: string
          custom_student_limit?: number | null
          email?: string | null
          email_domain?: string | null
          has_used_trial?: boolean | null
          id?: string
          location?: string | null
          name?: string
          phone?: string | null
          principal_name?: string | null
          subscription_cycle?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          subscription_tracking_start_date?: string | null
          timezone?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institutions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "school_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institutions_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content: string | null
          created_at: string | null
          duration: string | null
          id: string
          institution_id: string | null
          is_locked: boolean | null
          scheduled_at: string | null
          subject_id: string | null
          title: string
          type: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          duration?: string | null
          id?: string
          institution_id?: string | null
          is_locked?: boolean | null
          scheduled_at?: string | null
          subject_id?: string | null
          title: string
          type?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          duration?: string | null
          id?: string
          institution_id?: string | null
          is_locked?: boolean | null
          scheduled_at?: string | null
          subject_id?: string | null
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      librarian_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          institution_id: string
          notes: string | null
          performed_by: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          institution_id: string
          notes?: string | null
          performed_by: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          institution_id?: string
          notes?: string | null
          performed_by?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "librarian_audit_logs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "librarian_audit_logs_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "librarian_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      librarian_designations: {
        Row: {
          assigned_at: string
          assigned_by: string
          created_at: string | null
          id: string
          institution_id: string
          is_active: boolean
          revoked_at: string | null
          revoked_by: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          created_at?: string | null
          id?: string
          institution_id: string
          is_active?: boolean
          revoked_at?: string | null
          revoked_by?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          created_at?: string | null
          id?: string
          institution_id?: string
          is_active?: boolean
          revoked_at?: string | null
          revoked_by?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "librarian_designations_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "librarian_designations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "librarian_designations_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "librarian_designations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      library_config: {
        Row: {
          active: boolean | null
          created_at: string | null
          default_borrow_limit: number | null
          effective_from: string | null
          id: string
          institution_id: string | null
          min_fee_percent_for_borrow: number | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          default_borrow_limit?: number | null
          effective_from?: string | null
          id?: string
          institution_id?: string | null
          min_fee_percent_for_borrow?: number | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          default_borrow_limit?: number | null
          effective_from?: string | null
          id?: string
          institution_id?: string | null
          min_fee_percent_for_borrow?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "library_config_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      message_edit_history: {
        Row: {
          content: string
          edited_at: string | null
          id: string
          message_id: string
        }
        Insert: {
          content: string
          edited_at?: string | null
          id?: string
          message_id: string
        }
        Update: {
          content?: string
          edited_at?: string | null
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_edit_history_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          client_request_id: string | null
          content: string
          conversation_id: string | null
          created_at: string | null
          deleted_for_everyone_at: string | null
          edited_at: string | null
          hidden_for_user_ids: string[] | null
          id: string
          institution_id: string | null
          is_read: boolean | null
          receiver_id: string
          sender_id: string
          subject: string | null
        }
        Insert: {
          client_request_id?: string | null
          content: string
          conversation_id?: string | null
          created_at?: string | null
          deleted_for_everyone_at?: string | null
          edited_at?: string | null
          hidden_for_user_ids?: string[] | null
          id?: string
          institution_id?: string | null
          is_read?: boolean | null
          receiver_id: string
          sender_id: string
          subject?: string | null
        }
        Update: {
          client_request_id?: string | null
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          deleted_for_everyone_at?: string | null
          edited_at?: string | null
          hidden_for_user_ids?: string[] | null
          id?: string
          institution_id?: string | null
          is_read?: boolean | null
          receiver_id?: string
          sender_id?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_delivery_attempts: {
        Row: {
          attempt_number: number
          channel: string
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          institution_id: string | null
          max_retries: number
          message: string
          next_retry_at: string | null
          notification_id: string | null
          payload: Json | null
          recipient_user_id: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          attempt_number?: number
          channel?: string
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          institution_id?: string | null
          max_retries?: number
          message: string
          next_retry_at?: string | null
          notification_id?: string | null
          payload?: Json | null
          recipient_user_id?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          attempt_number?: number
          channel?: string
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          institution_id?: string | null
          max_retries?: number
          message?: string
          next_retry_at?: string | null
          notification_id?: string | null
          payload?: Json | null
          recipient_user_id?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_attempts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_delivery_attempts_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_delivery_attempts_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          expires_at: string | null
          id: string
          institution_id: string | null
          is_read: boolean | null
          message: string
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          expires_at?: string | null
          id?: string
          institution_id?: string | null
          is_read?: boolean | null
          message: string
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          expires_at?: string | null
          id?: string
          institution_id?: string | null
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_students: {
        Row: {
          created_at: string
          id: string
          institution_id: string | null
          parent_id: string | null
          relationship: string | null
          student_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id?: string | null
          parent_id?: string | null
          relationship?: string | null
          student_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string | null
          parent_id?: string | null
          relationship?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_students_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_students_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_detailed"
            referencedColumns: ["id"]
          },
        ]
      }
      parents: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          institution_id: string | null
          occupation: string | null
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          institution_id?: string | null
          occupation?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          institution_id?: string | null
          occupation?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parents_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      password_audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json
          outcome: string
          reason: string | null
          target_email: string | null
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          outcome?: string
          reason?: string | null
          target_email?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          outcome?: string
          reason?: string | null
          target_email?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "password_audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "password_audit_logs_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_requests: {
        Row: {
          email: string
          id: string
          ip_address: string | null
          requested_at: string | null
        }
        Insert: {
          email: string
          id?: string
          ip_address?: string | null
          requested_at?: string | null
        }
        Update: {
          email?: string
          id?: string
          ip_address?: string | null
          requested_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          admin_notes: string | null
          amount: number
          confirmed_at: string | null
          created_at: string | null
          fee_structure_id: string | null
          fee_structure_snapshot: Json | null
          id: string
          institution_id: string | null
          is_evidence_confirmed: boolean | null
          origin_id: string | null
          origin_label: string | null
          origin_type: string | null
          payment_date: string | null
          payment_method: string | null
          proof_url: string | null
          recorded_by_label: string | null
          recorded_by_user_id: string | null
          reference_number: string | null
          retention_until: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          status_updated_at: string | null
          student_id: string | null
          target_id: string | null
          target_label: string | null
          target_type: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          confirmed_at?: string | null
          created_at?: string | null
          fee_structure_id?: string | null
          fee_structure_snapshot?: Json | null
          id?: string
          institution_id?: string | null
          is_evidence_confirmed?: boolean | null
          origin_id?: string | null
          origin_label?: string | null
          origin_type?: string | null
          payment_date?: string | null
          payment_method?: string | null
          proof_url?: string | null
          recorded_by_label?: string | null
          recorded_by_user_id?: string | null
          reference_number?: string | null
          retention_until?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          status_updated_at?: string | null
          student_id?: string | null
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          confirmed_at?: string | null
          created_at?: string | null
          fee_structure_id?: string | null
          fee_structure_snapshot?: Json | null
          id?: string
          institution_id?: string | null
          is_evidence_confirmed?: boolean | null
          origin_id?: string | null
          origin_label?: string | null
          origin_type?: string | null
          payment_date?: string | null
          payment_method?: string | null
          proof_url?: string | null
          recorded_by_label?: string | null
          recorded_by_user_id?: string | null
          reference_number?: string | null
          retention_until?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          status_updated_at?: string | null
          student_id?: string | null
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_detailed"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_cycles: {
        Row: {
          created_at: string | null
          created_by: string | null
          executed_at: string | null
          executed_by: string | null
          from_class_id: string | null
          id: string
          institution_id: string | null
          min_attendance_percentage: number | null
          min_average_percentage: number | null
          name: string
          previewed_at: string | null
          status: string
          term_id: string | null
          to_class_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          executed_at?: string | null
          executed_by?: string | null
          from_class_id?: string | null
          id?: string
          institution_id?: string | null
          min_attendance_percentage?: number | null
          min_average_percentage?: number | null
          name: string
          previewed_at?: string | null
          status?: string
          term_id?: string | null
          to_class_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          executed_at?: string | null
          executed_by?: string | null
          from_class_id?: string | null
          id?: string
          institution_id?: string | null
          min_attendance_percentage?: number | null
          min_average_percentage?: number | null
          name?: string
          previewed_at?: string | null
          status?: string
          term_id?: string | null
          to_class_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_cycles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_cycles_executed_by_fkey"
            columns: ["executed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_cycles_from_class_id_fkey"
            columns: ["from_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_cycles_from_class_id_fkey"
            columns: ["from_class_id"]
            isOneToOne: false
            referencedRelation: "v_classes_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_cycles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_cycles_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_cycles_to_class_id_fkey"
            columns: ["to_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_cycles_to_class_id_fkey"
            columns: ["to_class_id"]
            isOneToOne: false
            referencedRelation: "v_classes_detailed"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_decisions: {
        Row: {
          attendance_percentage: number | null
          average_percentage: number | null
          created_at: string | null
          cycle_id: string | null
          eligible: boolean
          from_class_id: string | null
          id: string
          institution_id: string | null
          promoted_at: string | null
          promoted_by: string | null
          reason: string | null
          report_card_id: string | null
          status: string
          student_id: string | null
          term_id: string | null
          to_class_id: string | null
          updated_at: string | null
        }
        Insert: {
          attendance_percentage?: number | null
          average_percentage?: number | null
          created_at?: string | null
          cycle_id?: string | null
          eligible?: boolean
          from_class_id?: string | null
          id?: string
          institution_id?: string | null
          promoted_at?: string | null
          promoted_by?: string | null
          reason?: string | null
          report_card_id?: string | null
          status?: string
          student_id?: string | null
          term_id?: string | null
          to_class_id?: string | null
          updated_at?: string | null
        }
        Update: {
          attendance_percentage?: number | null
          average_percentage?: number | null
          created_at?: string | null
          cycle_id?: string | null
          eligible?: boolean
          from_class_id?: string | null
          id?: string
          institution_id?: string | null
          promoted_at?: string | null
          promoted_by?: string | null
          reason?: string | null
          report_card_id?: string | null
          status?: string
          student_id?: string | null
          term_id?: string | null
          to_class_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_decisions_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "promotion_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_decisions_from_class_id_fkey"
            columns: ["from_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_decisions_from_class_id_fkey"
            columns: ["from_class_id"]
            isOneToOne: false
            referencedRelation: "v_classes_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_decisions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_decisions_promoted_by_fkey"
            columns: ["promoted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_decisions_report_card_id_fkey"
            columns: ["report_card_id"]
            isOneToOne: false
            referencedRelation: "report_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_decisions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_decisions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_decisions_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_decisions_to_class_id_fkey"
            columns: ["to_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_decisions_to_class_id_fkey"
            columns: ["to_class_id"]
            isOneToOne: false
            referencedRelation: "v_classes_detailed"
            referencedColumns: ["id"]
          },
        ]
      }
      report_card_items: {
        Row: {
          average_percentage: number | null
          class_average: number | null
          created_at: string | null
          gpa_points: number | null
          id: string
          letter_grade: string | null
          rank_in_subject: number | null
          report_card_id: string | null
          subject_id: string | null
          subject_name: string | null
          teacher_id: string | null
          teacher_remarks: string | null
          total_score: number | null
        }
        Insert: {
          average_percentage?: number | null
          class_average?: number | null
          created_at?: string | null
          gpa_points?: number | null
          id?: string
          letter_grade?: string | null
          rank_in_subject?: number | null
          report_card_id?: string | null
          subject_id?: string | null
          subject_name?: string | null
          teacher_id?: string | null
          teacher_remarks?: string | null
          total_score?: number | null
        }
        Update: {
          average_percentage?: number | null
          class_average?: number | null
          created_at?: string | null
          gpa_points?: number | null
          id?: string
          letter_grade?: string | null
          rank_in_subject?: number | null
          report_card_id?: string | null
          subject_id?: string | null
          subject_name?: string | null
          teacher_id?: string | null
          teacher_remarks?: string | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "report_card_items_report_card_id_fkey"
            columns: ["report_card_id"]
            isOneToOne: false
            referencedRelation: "report_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_card_items_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_card_items_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      report_cards: {
        Row: {
          academic_year_id: string | null
          admin_remarks: string | null
          attendance_count: number | null
          average_percentage: number | null
          class_id: string | null
          created_at: string | null
          gpa: number | null
          id: string
          institution_id: string | null
          letter_grade: string | null
          rank_in_class: number | null
          released_at: string | null
          released_by: string | null
          status: string | null
          student_id: string | null
          teacher_remarks: string | null
          term_id: string | null
          total_school_days: number | null
          total_students_in_class: number | null
          total_weighted_score: number | null
          updated_at: string | null
        }
        Insert: {
          academic_year_id?: string | null
          admin_remarks?: string | null
          attendance_count?: number | null
          average_percentage?: number | null
          class_id?: string | null
          created_at?: string | null
          gpa?: number | null
          id?: string
          institution_id?: string | null
          letter_grade?: string | null
          rank_in_class?: number | null
          released_at?: string | null
          released_by?: string | null
          status?: string | null
          student_id?: string | null
          teacher_remarks?: string | null
          term_id?: string | null
          total_school_days?: number | null
          total_students_in_class?: number | null
          total_weighted_score?: number | null
          updated_at?: string | null
        }
        Update: {
          academic_year_id?: string | null
          admin_remarks?: string | null
          attendance_count?: number | null
          average_percentage?: number | null
          class_id?: string | null
          created_at?: string | null
          gpa?: number | null
          id?: string
          institution_id?: string | null
          letter_grade?: string | null
          rank_in_class?: number | null
          released_at?: string | null
          released_by?: string | null
          status?: string | null
          student_id?: string | null
          teacher_remarks?: string | null
          term_id?: string | null
          total_school_days?: number | null
          total_students_in_class?: number | null
          total_weighted_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_cards_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cards_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cards_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_classes_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cards_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cards_released_by_fkey"
            columns: ["released_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cards_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cards_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cards_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          created_at: string | null
          id: string
          institution_id: string | null
          size: string | null
          status: string | null
          subject_id: string | null
          teacher_id: string | null
          title: string
          type: string
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          institution_id?: string | null
          size?: string | null
          status?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          title: string
          type: string
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          institution_id?: string | null
          size?: string | null
          status?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_id: string | null
          role_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_id?: string | null
          role_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_id?: string | null
          role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          institution_id: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          institution_id?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          institution_id?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      school_categories: {
        Row: {
          created_at: string | null
          id: string
          level_label: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          level_label: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          level_label?: string
          name?: string
        }
        Relationships: []
      }
      school_category_types: {
        Row: {
          category_id: string
          created_at: string
          type_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          type_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_category_types_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "school_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_category_types_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "category_types"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          academic_year: string | null
          admission_date: string | null
          class_id: string | null
          created_at: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          fee_balance: number | null
          form_level: number | null
          grade_level: number | null
          grade_level_legacy: string | null
          grading_scale_id: string | null
          id: string
          institution_id: string | null
          parent_contact: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          academic_year?: string | null
          admission_date?: string | null
          class_id?: string | null
          created_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          fee_balance?: number | null
          form_level?: number | null
          grade_level?: number | null
          grade_level_legacy?: string | null
          grading_scale_id?: string | null
          id?: string
          institution_id?: string | null
          parent_contact?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          academic_year?: string | null
          admission_date?: string | null
          class_id?: string | null
          created_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          fee_balance?: number | null
          form_level?: number | null
          grade_level?: number | null
          grade_level_legacy?: string | null
          grading_scale_id?: string | null
          id?: string
          institution_id?: string | null
          parent_contact?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_classes_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_grading_scale_id_fkey"
            columns: ["grading_scale_id"]
            isOneToOne: false
            referencedRelation: "grading_scales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_teachers: {
        Row: {
          created_at: string | null
          id: string
          institution_id: string | null
          subject_id: string | null
          teacher_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          institution_id?: string | null
          subject_id?: string | null
          teacher_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          institution_id?: string | null
          subject_id?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_teachers_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_teachers_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_teachers_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_weights: {
        Row: {
          assessment_type_id: string | null
          class_id: string | null
          created_at: string | null
          id: string
          institution_id: string | null
          subject_id: string | null
          term_id: string | null
          updated_at: string | null
          weight: number
        }
        Insert: {
          assessment_type_id?: string | null
          class_id?: string | null
          created_at?: string | null
          id?: string
          institution_id?: string | null
          subject_id?: string | null
          term_id?: string | null
          updated_at?: string | null
          weight: number
        }
        Update: {
          assessment_type_id?: string | null
          class_id?: string | null
          created_at?: string | null
          id?: string
          institution_id?: string | null
          subject_id?: string | null
          term_id?: string | null
          updated_at?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "subject_weights_assessment_type_id_fkey"
            columns: ["assessment_type_id"]
            isOneToOne: false
            referencedRelation: "assessment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_weights_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_weights_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_classes_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_weights_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_weights_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_weights_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          category: string | null
          class_id: string | null
          created_at: string | null
          credits: number | null
          description: string | null
          duration: string | null
          fee_amount: number
          fee_config: Json | null
          id: string
          image_url: string | null
          institution_id: string | null
          level: string | null
          materials: Json | null
          metadata: Json | null
          progress_percent: number | null
          rating: number | null
          reviews_count: number | null
          teacher_id: string | null
          title: string
        }
        Insert: {
          category?: string | null
          class_id?: string | null
          created_at?: string | null
          credits?: number | null
          description?: string | null
          duration?: string | null
          fee_amount?: number
          fee_config?: Json | null
          id?: string
          image_url?: string | null
          institution_id?: string | null
          level?: string | null
          materials?: Json | null
          metadata?: Json | null
          progress_percent?: number | null
          rating?: number | null
          reviews_count?: number | null
          teacher_id?: string | null
          title: string
        }
        Update: {
          category?: string | null
          class_id?: string | null
          created_at?: string | null
          credits?: number | null
          description?: string | null
          duration?: string | null
          fee_amount?: number
          fee_config?: Json | null
          id?: string
          image_url?: string | null
          institution_id?: string | null
          level?: string | null
          materials?: Json | null
          metadata?: Json | null
          progress_percent?: number | null
          rating?: number | null
          reviews_count?: number | null
          teacher_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_classes_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_new_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          assignment_id: string | null
          class_id: string | null
          content: string | null
          feedback: string | null
          file_url: string | null
          grade: number | null
          graded: boolean | null
          id: string
          institution_id: string | null
          status: string | null
          student_id: string
          subject_id: string | null
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          assignment_id?: string | null
          class_id?: string | null
          content?: string | null
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          graded?: boolean | null
          id?: string
          institution_id?: string | null
          status?: string | null
          student_id: string
          subject_id?: string | null
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          assignment_id?: string | null
          class_id?: string | null
          content?: string | null
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          graded?: boolean | null
          id?: string
          institution_id?: string | null
          status?: string | null
          student_id?: string
          subject_id?: string | null
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_new_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_new_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_detailed"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to_id: string | null
          category: string | null
          created_at: string | null
          description: string
          escalation_level: number | null
          id: string
          institution_id: string | null
          metadata: Json | null
          priority: string | null
          resolved_at: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to_id?: string | null
          category?: string | null
          created_at?: string | null
          description: string
          escalation_level?: number | null
          id?: string
          institution_id?: string | null
          metadata?: Json | null
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_to_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string
          escalation_level?: number | null
          id?: string
          institution_id?: string | null
          metadata?: Json | null
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      teacher_attendance: {
        Row: {
          check_in_time: string | null
          check_out_time: string | null
          date: string
          id: string
          institution_id: string | null
          notes: string | null
          recorded_at: string | null
          status: string
          teacher_id: string | null
        }
        Insert: {
          check_in_time?: string | null
          check_out_time?: string | null
          date?: string
          id?: string
          institution_id?: string | null
          notes?: string | null
          recorded_at?: string | null
          status: string
          teacher_id?: string | null
        }
        Update: {
          check_in_time?: string | null
          check_out_time?: string | null
          date?: string
          id?: string
          institution_id?: string | null
          notes?: string | null
          recorded_at?: string | null
          status?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_attendance_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_payouts: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          institution_id: string | null
          payout_date: string | null
          period_end: string | null
          period_start: string | null
          reference_number: string | null
          status: string | null
          teacher_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          institution_id?: string | null
          payout_date?: string | null
          period_end?: string | null
          period_start?: string | null
          reference_number?: string | null
          status?: string | null
          teacher_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          institution_id?: string | null
          payout_date?: string | null
          period_end?: string | null
          period_start?: string | null
          reference_number?: string | null
          status?: string | null
          teacher_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_payouts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_payouts_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          created_at: string | null
          department: string | null
          hire_date: string | null
          id: string
          institution_id: string | null
          position: string | null
          qualification: string | null
          specialization: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          hire_date?: string | null
          id?: string
          institution_id?: string | null
          position?: string | null
          qualification?: string | null
          specialization?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          department?: string | null
          hire_date?: string | null
          id?: string
          institution_id?: string | null
          position?: string | null
          qualification?: string | null
          specialization?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachers_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teachers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      terms: {
        Row: {
          academic_year_id: string | null
          created_at: string | null
          end_date: string
          id: string
          institution_id: string | null
          is_current: boolean | null
          locked_at: string | null
          name: string
          start_date: string
          updated_at: string | null
        }
        Insert: {
          academic_year_id?: string | null
          created_at?: string | null
          end_date: string
          id?: string
          institution_id?: string | null
          is_current?: boolean | null
          locked_at?: string | null
          name: string
          start_date: string
          updated_at?: string | null
        }
        Update: {
          academic_year_id?: string | null
          created_at?: string | null
          end_date?: string
          id?: string
          institution_id?: string | null
          is_current?: boolean | null
          locked_at?: string | null
          name?: string
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "terms_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "terms_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          created_at: string | null
          id: string
          is_internal: boolean | null
          message: string
          sender_id: string | null
          ticket_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message: string
          sender_id?: string | null
          ticket_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message?: string
          sender_id?: string | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      timetables: {
        Row: {
          class_id: string | null
          created_at: string | null
          day_of_week: string | null
          end_time: string
          id: string
          institution_id: string | null
          room_number: string | null
          start_time: string
          subject_id: string | null
          updated_at: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          day_of_week?: string | null
          end_time: string
          id?: string
          institution_id?: string | null
          room_number?: string | null
          start_time: string
          subject_id?: string | null
          updated_at?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          day_of_week?: string | null
          end_time?: string
          id?: string
          institution_id?: string | null
          room_number?: string | null
          start_time?: string
          subject_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetables_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetables_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_classes_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetables_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetables_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_sessions: {
        Row: {
          created_at: string
          demo_user_id: string | null
          expires_at: string
          id: string
          institution_id: string | null
          ip_address: string | null
          role: string
          session_token: string | null
        }
        Insert: {
          created_at?: string
          demo_user_id?: string | null
          expires_at?: string
          id?: string
          institution_id?: string | null
          ip_address?: string | null
          role: string
          session_token?: string | null
        }
        Update: {
          created_at?: string
          demo_user_id?: string | null
          expires_at?: string
          id?: string
          institution_id?: string | null
          ip_address?: string | null
          role?: string
          session_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trial_sessions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          email_notifications: boolean | null
          id: string
          institution_id: string | null
          push_notifications: boolean | null
          submission_alerts: boolean | null
          system_alerts: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          institution_id?: string | null
          push_notifications?: boolean | null
          submission_alerts?: boolean | null
          system_alerts?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          institution_id?: string | null
          push_notifications?: boolean | null
          submission_alerts?: boolean | null
          system_alerts?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          role_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          role_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_security_answers: {
        Row: {
          created_at: string
          question1_hash: string
          question1_salt: string
          question2_hash: string
          question2_salt: string
          question3_hash: string
          question3_salt: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          question1_hash: string
          question1_salt: string
          question2_hash: string
          question2_salt: string
          question3_hash: string
          question3_salt: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          question1_hash?: string
          question1_salt?: string
          question2_hash?: string
          question2_salt?: string
          question3_hash?: string
          question3_salt?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_security_answers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string | null
          device_type: string | null
          expires_at: string
          id: string
          ip_address: string | null
          is_revoked: boolean | null
          last_active_at: string | null
          location: string | null
          login_at: string | null
          os_name: string | null
          session_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_type?: string | null
          expires_at: string
          id?: string
          ip_address?: string | null
          is_revoked?: boolean | null
          last_active_at?: string | null
          location?: string | null
          login_at?: string | null
          os_name?: string | null
          session_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_type?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_revoked?: boolean | null
          last_active_at?: string | null
          location?: string | null
          login_at?: string | null
          os_name?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string
          first_name: string | null
          full_name: string
          gender: "male" | "female" | "other" | null
          id: string
          institution_id: string | null
          is_demo: boolean | null
          last_name: string | null
          must_change_password: boolean
          phone: string | null
          requires_security_questions_setup: boolean
          role: "admin" | "student" | "teacher" | "parent" | "bursary" | "master_admin"
          status: "pending" | "approved" | "rejected"
          trial_end_date: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email: string
          first_name?: string | null
          full_name: string
          gender?: "male" | "female" | "other" | null
          id: string
          institution_id?: string | null
          is_demo?: boolean | null
          last_name?: string | null
          must_change_password?: boolean
          phone?: string | null
          requires_security_questions_setup?: boolean
          role: "admin" | "student" | "teacher" | "parent" | "bursary" | "master_admin"
          status?: "pending" | "approved" | "rejected"
          trial_end_date?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string
          first_name?: string | null
          full_name?: string
          gender?: "male" | "female" | "other" | null
          id?: string
          institution_id?: string | null
          is_demo?: boolean | null
          last_name?: string | null
          must_change_password?: boolean
          phone?: string | null
          requires_security_questions_setup?: boolean
          role?: "admin" | "student" | "teacher" | "parent" | "bursary" | "master_admin"
          status?: "pending" | "approved" | "rejected"
          trial_end_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      config: {
        Row: {
          active: boolean | null
          created_at: string | null
          default_borrow_limit: number | null
          effective_from: string | null
          id: string | null
          min_fee_percent_for_borrow: number | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          default_borrow_limit?: number | null
          effective_from?: string | null
          id?: string | null
          min_fee_percent_for_borrow?: number | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          default_borrow_limit?: number | null
          effective_from?: string | null
          id?: string | null
          min_fee_percent_for_borrow?: number | null
        }
        Relationships: []
      }
      v_classes_detailed: {
        Row: {
          capacity: number | null
          created_at: string | null
          display_name: string | null
          form_level: number | null
          grade_level: number | null
          id: string | null
          institution_id: string | null
          institution_name: string | null
          level_label: string | null
          school_category_name: string | null
          stream: string | null
          teacher_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_new_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: true
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      v_students_detailed: {
        Row: {
          academic_year: string | null
          admission_date: string | null
          created_at: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          fee_balance: number | null
          form_level: number | null
          full_name: string | null
          grade_level: number | null
          grade_level_legacy: string | null
          id: string | null
          institution_id: string | null
          institution_level_label: string | null
          level_display_name: string | null
          parent_contact: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      current_user_student_id: { Args: never; Returns: string }
      current_user_teacher_id: { Args: never; Returns: string }
      generate_custom_id: { Args: { prefix: string }; Returns: string }
      get_current_user_institution_id: { Args: never; Returns: string }
      get_current_user_role: { Args: never; Returns: string }
      get_gpa_points: {
        Args: { p_institution_id: string; p_percentage: number }
        Returns: number
      }
      get_letter_grade: {
        Args: { p_institution_id: string; p_percentage: number }
        Returns: string
      }
      get_student_rank: { Args: { p_student_id: string }; Returns: Json }
      is_platform_admin: { Args: never; Returns: boolean }
      is_student_in_class: {
        Args: { p_class_id: string; p_student_id: string }
        Returns: boolean
      }
      is_subscription_active: {
        Args: { p_institution_id: string }
        Returns: boolean
      }
      is_teacher_of_subject: {
        Args: { p_subject_id: string; p_teacher_id: string }
        Returns: boolean
      }
      sync_terms_current_flags: {
        Args: { p_reference_date?: string }
        Returns: undefined
      }
      transfer_main_admin_status: {
        Args: { p_new_admin_user_id: string; p_old_admin_user_id: string }
        Returns: undefined
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
