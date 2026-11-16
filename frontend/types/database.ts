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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      academic_reports: {
        Row: {
          academic_year: string
          archived_at: string | null
          created_at: string | null
          created_by: string | null
          data: Json | null
          file_url: string | null
          id: string
          institution_id: string | null
          report_type: string
          retention_until: string | null
          status: string | null
          student_id: string | null
          term: string
          updated_at: string | null
        }
        Insert: {
          academic_year: string
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          data?: Json | null
          file_url?: string | null
          id?: string
          institution_id?: string | null
          report_type: string
          retention_until?: string | null
          status?: string | null
          student_id?: string | null
          term: string
          updated_at?: string | null
        }
        Update: {
          academic_year?: string
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          data?: Json | null
          file_url?: string | null
          id?: string
          institution_id?: string | null
          report_type?: string
          retention_until?: string | null
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
          access_level: string | null
          can_manage_users: boolean
          created_at: string | null
          id: string
          institution_id: string | null
          is_main: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_level?: string | null
          can_manage_users?: boolean
          created_at?: string | null
          id?: string
          institution_id?: string | null
          is_main?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_level?: string | null
          can_manage_users?: boolean
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
          target_audience: string
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
          target_audience?: string
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
          target_audience?: string
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
          grading_style: string | null
          id: string
          institution_id: string | null
          is_published: boolean | null
          status: string | null
          student_id: string | null
          subject_id: string | null
          teacher_id: string | null
          term: string | null
          term_id: string | null
          title: string
          topic_area_id: string | null
          topic_id: string | null
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
          grading_style?: string | null
          id?: string
          institution_id?: string | null
          is_published?: boolean | null
          status?: string | null
          student_id?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          term?: string | null
          term_id?: string | null
          title: string
          topic_area_id?: string | null
          topic_id?: string | null
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
          grading_style?: string | null
          id?: string
          institution_id?: string | null
          is_published?: boolean | null
          status?: string | null
          student_id?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          term?: string | null
          term_id?: string | null
          title?: string
          topic_area_id?: string | null
          topic_id?: string | null
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
          {
            foreignKeyName: "assignments_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_topic_area_id_fkey"
            columns: ["topic_area_id"]
            isOneToOne: false
            referencedRelation: "subject_topic_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "subject_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          actual_end_time: string | null
          actual_start_time: string | null
          class_id: string | null
          confirmation_status: string | null
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
          actual_end_time?: string | null
          actual_start_time?: string | null
          class_id?: string | null
          confirmation_status?: string | null
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
          actual_end_time?: string | null
          actual_start_time?: string | null
          class_id?: string | null
          confirmation_status?: string | null
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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after_state: Json | null
          before_state: Json | null
          created_at: string | null
          domain: string | null
          id: string
          institution_id: string
          ip_address: string | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string | null
          domain?: string | null
          id?: string
          institution_id: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string | null
          domain?: string | null
          id?: string
          institution_id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
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
          created_at: string | null
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
          created_at?: string | null
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
          created_at?: string | null
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
      calendar_events: {
        Row: {
          announcement_id: string | null
          cancel_classes: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string
          end_time: string | null
          event_date: string
          event_type: string | null
          id: string
          institution_id: string
          metadata: Json | null
          start_date: string
          start_time: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          announcement_id?: string | null
          cancel_classes?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date: string
          end_time?: string | null
          event_date: string
          event_type?: string | null
          id?: string
          institution_id: string
          metadata?: Json | null
          start_date: string
          start_time?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          announcement_id?: string | null
          cancel_classes?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string
          end_time?: string | null
          event_date?: string
          event_type?: string | null
          id?: string
          institution_id?: string
          metadata?: Json | null
          start_date?: string
          start_time?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
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
          cbc_band: string | null
          class_type: string | null
          created_at: string | null
          deleted_at: string | null
          display_name: string | null
          education_level: string | null
          form_level: number | null
          grade_level: number | null
          id: string
          institution_id: string | null
          is_final_level: boolean
          level_id: string | null
          stream: string | null
          stream_id: string | null
          teacher_id: string | null
          updated_at: string | null
        }
        Insert: {
          capacity?: number | null
          category_id?: string | null
          cbc_band?: string | null
          class_type?: string | null
          created_at?: string | null
          deleted_at?: string | null
          display_name?: string | null
          education_level?: string | null
          form_level?: number | null
          grade_level?: number | null
          id?: string
          institution_id?: string | null
          is_final_level?: boolean
          level_id?: string | null
          stream?: string | null
          stream_id?: string | null
          teacher_id?: string | null
          updated_at?: string | null
        }
        Update: {
          capacity?: number | null
          category_id?: string | null
          cbc_band?: string | null
          class_type?: string | null
          created_at?: string | null
          deleted_at?: string | null
          display_name?: string | null
          education_level?: string | null
          form_level?: number | null
          grade_level?: number | null
          id?: string
          institution_id?: string | null
          is_final_level?: boolean
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
      clearance_processes: {
        Row: {
          admin_override: boolean
          allow_user_continuation: boolean
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          current_step: number
          finance_checked_at: string | null
          finance_cleared: boolean
          finance_notes: string | null
          id: string
          initiated_by: string
          initiator_user_id: string
          institution_id: string
          library_checked_at: string | null
          library_cleared: boolean
          library_notes: string | null
          override_reason: string | null
          property_checked_at: string | null
          property_cleared: boolean
          property_notes: string | null
          reason_category: string
          reason_details: Json | null
          status: string
          updated_at: string | null
          user_id: string
          user_role: string
        }
        Insert: {
          admin_override?: boolean
          allow_user_continuation?: boolean
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          current_step?: number
          finance_checked_at?: string | null
          finance_cleared?: boolean
          finance_notes?: string | null
          id?: string
          initiated_by: string
          initiator_user_id: string
          institution_id: string
          library_checked_at?: string | null
          library_cleared?: boolean
          library_notes?: string | null
          override_reason?: string | null
          property_checked_at?: string | null
          property_cleared?: boolean
          property_notes?: string | null
          reason_category: string
          reason_details?: Json | null
          status?: string
          updated_at?: string | null
          user_id: string
          user_role: string
        }
        Update: {
          admin_override?: boolean
          allow_user_continuation?: boolean
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          current_step?: number
          finance_checked_at?: string | null
          finance_cleared?: boolean
          finance_notes?: string | null
          id?: string
          initiated_by?: string
          initiator_user_id?: string
          institution_id?: string
          library_checked_at?: string | null
          library_cleared?: boolean
          library_notes?: string | null
          override_reason?: string | null
          property_checked_at?: string | null
          property_cleared?: boolean
          property_notes?: string | null
          reason_category?: string
          reason_details?: Json | null
          status?: string
          updated_at?: string | null
          user_id?: string
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "clearance_processes_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clearance_processes_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clearance_processes_initiator_user_id_fkey"
            columns: ["initiator_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clearance_processes_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clearance_processes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      content_evidence_entries: {
        Row: {
          assignment_id: string | null
          created_at: string | null
          descriptor: string
          evaluated_at: string | null
          evaluated_by: string | null
          evidence_type: string
          id: string
          institution_id: string
          student_id: string
          subject_id: string
          teacher_notes: string | null
          term_id: string | null
          topic_area_id: string
          topic_id: string | null
          updated_at: string | null
        }
        Insert: {
          assignment_id?: string | null
          created_at?: string | null
          descriptor: string
          evaluated_at?: string | null
          evaluated_by?: string | null
          evidence_type: string
          id?: string
          institution_id: string
          student_id: string
          subject_id: string
          teacher_notes?: string | null
          term_id?: string | null
          topic_area_id: string
          topic_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assignment_id?: string | null
          created_at?: string | null
          descriptor?: string
          evaluated_at?: string | null
          evaluated_by?: string | null
          evidence_type?: string
          id?: string
          institution_id?: string
          student_id?: string
          subject_id?: string
          teacher_notes?: string | null
          term_id?: string | null
          topic_area_id?: string
          topic_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_evidence_entries_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_evidence_entries_evaluated_by_fkey"
            columns: ["evaluated_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_evidence_entries_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_evidence_entries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_evidence_entries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_evidence_entries_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_evidence_entries_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_evidence_entries_topic_area_id_fkey"
            columns: ["topic_area_id"]
            isOneToOne: false
            referencedRelation: "subject_topic_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_evidence_entries_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "subject_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          deleted_at: string | null
          id: string
          institution_id: string | null
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
          institution_id?: string | null
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
          institution_id?: string | null
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
            foreignKeyName: "conversation_participants_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
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
      credential_change_requests: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          current_value: string
          document_url: string | null
          id: string
          institution_id: string | null
          reason: string
          request_type: string
          requested_value: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          temp_credential: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          current_value: string
          document_url?: string | null
          id?: string
          institution_id?: string | null
          reason: string
          request_type: string
          requested_value: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          temp_credential?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          current_value?: string
          document_url?: string | null
          id?: string
          institution_id?: string | null
          reason?: string
          request_type?: string
          requested_value?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          temp_credential?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credential_change_requests_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_change_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_change_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      credits: {
        Row: {
          amount: number
          applied_to_bill_id: string | null
          created_at: string
          id: string
          institution_id: string
          notes: string | null
          source_payment_id: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          applied_to_bill_id?: string | null
          created_at?: string
          id?: string
          institution_id: string
          notes?: string | null
          source_payment_id?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          applied_to_bill_id?: string | null
          created_at?: string
          id?: string
          institution_id?: string
          notes?: string | null
          source_payment_id?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credits_applied_to_bill_id_fkey"
            columns: ["applied_to_bill_id"]
            isOneToOne: false
            referencedRelation: "student_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credits_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credits_source_payment_id_fkey"
            columns: ["source_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credits_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credits_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_detailed"
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
      designations: {
        Row: {
          assigned_at: string
          assigned_by: string
          created_at: string | null
          id: string
          institution_id: string
          is_active: boolean
          metadata: Json | null
          revoked_at: string | null
          revoked_by: string | null
          type: string
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
          metadata?: Json | null
          revoked_at?: string | null
          revoked_by?: string | null
          type: string
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
          metadata?: Json | null
          revoked_at?: string | null
          revoked_by?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "designations_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designations_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
          archived_at: string | null
          competency_band: string | null
          created_at: string | null
          exam_id: string | null
          feedback: string | null
          graded_by: string | null
          id: string
          institution_id: string | null
          retention_until: string | null
          score: number | null
          student_id: string | null
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          competency_band?: string | null
          created_at?: string | null
          exam_id?: string | null
          feedback?: string | null
          graded_by?: string | null
          id?: string
          institution_id?: string | null
          retention_until?: string | null
          score?: number | null
          student_id?: string | null
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          competency_band?: string | null
          created_at?: string | null
          exam_id?: string | null
          feedback?: string | null
          graded_by?: string | null
          id?: string
          institution_id?: string | null
          retention_until?: string | null
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
          submission_deadline: string | null
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
          submission_deadline?: string | null
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
          submission_deadline?: string | null
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
      feature_registry: {
        Row: {
          action: string
          category: string | null
          created_at: string | null
          description: string | null
          domain: string
          id: string
          name: string
        }
        Insert: {
          action: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          domain: string
          id?: string
          name: string
        }
        Update: {
          action?: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          domain?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      fee_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          institution_id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          institution_id: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          institution_id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_categories_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_components: {
        Row: {
          amount: number
          category: string
          code: string | null
          created_at: string
          description: string | null
          fee_structure_id: string | null
          frequency: string
          id: string
          institution_id: string
          is_active: boolean
          is_mandatory: boolean
          name: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          code?: string | null
          created_at?: string
          description?: string | null
          fee_structure_id?: string | null
          frequency?: string
          id?: string
          institution_id: string
          is_active?: boolean
          is_mandatory?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          code?: string | null
          created_at?: string
          description?: string | null
          fee_structure_id?: string | null
          frequency?: string
          id?: string
          institution_id?: string
          is_active?: boolean
          is_mandatory?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_components_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_components_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_discounts_waivers: {
        Row: {
          academic_year_id: string | null
          approved_by: string | null
          created_at: string
          discount_type: string
          fee_component_id: string | null
          id: string
          institution_id: string
          reason: string
          status: string
          student_id: string
          term_id: string | null
          type: string
          updated_at: string
          value: number
        }
        Insert: {
          academic_year_id?: string | null
          approved_by?: string | null
          created_at?: string
          discount_type?: string
          fee_component_id?: string | null
          id?: string
          institution_id: string
          reason: string
          status?: string
          student_id: string
          term_id?: string | null
          type?: string
          updated_at?: string
          value?: number
        }
        Update: {
          academic_year_id?: string | null
          approved_by?: string | null
          created_at?: string
          discount_type?: string
          fee_component_id?: string | null
          id?: string
          institution_id?: string
          reason?: string
          status?: string
          student_id?: string
          term_id?: string | null
          type?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "fee_discounts_waivers_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_discounts_waivers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_discounts_waivers_fee_component_id_fkey"
            columns: ["fee_component_id"]
            isOneToOne: false
            referencedRelation: "fee_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_discounts_waivers_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_discounts_waivers_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_discounts_waivers_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_discounts_waivers_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structures: {
        Row: {
          academic_year: string | null
          academic_year_id: string | null
          amount: number
          class_id: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          institution_id: string | null
          is_active: boolean | null
          is_override: boolean
          level_from: number | null
          level_scope: string | null
          level_to: number | null
          level_type: string | null
          level_value: number | null
          metadata: Json | null
          released_at: string | null
          scope_type: string
          status_updated_at: string | null
          student_id: string | null
          term: string | null
          term_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          academic_year?: string | null
          academic_year_id?: string | null
          amount: number
          class_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          institution_id?: string | null
          is_active?: boolean | null
          is_override?: boolean
          level_from?: number | null
          level_scope?: string | null
          level_to?: number | null
          level_type?: string | null
          level_value?: number | null
          metadata?: Json | null
          released_at?: string | null
          scope_type?: string
          status_updated_at?: string | null
          student_id?: string | null
          term?: string | null
          term_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          academic_year?: string | null
          academic_year_id?: string | null
          amount?: number
          class_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          institution_id?: string | null
          is_active?: boolean | null
          is_override?: boolean
          level_from?: number | null
          level_scope?: string | null
          level_to?: number | null
          level_type?: string | null
          level_value?: number | null
          metadata?: Json | null
          released_at?: string | null
          scope_type?: string
          status_updated_at?: string | null
          student_id?: string | null
          term?: string | null
          term_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_structures_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_classes_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_detailed"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_type_applicability: {
        Row: {
          amount_override: number | null
          created_at: string
          fee_type_id: string
          id: string
          institution_id: string
          scope_id: string | null
          scope_type: string
          updated_at: string
        }
        Insert: {
          amount_override?: number | null
          created_at?: string
          fee_type_id: string
          id?: string
          institution_id: string
          scope_id?: string | null
          scope_type: string
          updated_at?: string
        }
        Update: {
          amount_override?: number | null
          created_at?: string
          fee_type_id?: string
          id?: string
          institution_id?: string
          scope_id?: string | null
          scope_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_type_applicability_fee_type_id_fkey"
            columns: ["fee_type_id"]
            isOneToOne: false
            referencedRelation: "fee_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_type_applicability_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_types: {
        Row: {
          academic_year_id: string | null
          amount: number
          billing_frequency: string
          category_id: string | null
          created_at: string
          description: string | null
          display_order: number
          due_date: string | null
          id: string
          institution_id: string
          is_mandatory: boolean
          min_installment_amount: number
          name: string
          parent_notes: string | null
          partial_payment_allowed: boolean
          status: string
          term_id: string | null
          updated_at: string
        }
        Insert: {
          academic_year_id?: string | null
          amount?: number
          billing_frequency?: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          due_date?: string | null
          id?: string
          institution_id: string
          is_mandatory?: boolean
          min_installment_amount?: number
          name: string
          parent_notes?: string | null
          partial_payment_allowed?: boolean
          status?: string
          term_id?: string | null
          updated_at?: string
        }
        Update: {
          academic_year_id?: string | null
          amount?: number
          billing_frequency?: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          due_date?: string | null
          id?: string
          institution_id?: string
          is_mandatory?: boolean
          min_installment_amount?: number
          name?: string
          parent_notes?: string | null
          partial_payment_allowed?: boolean
          status?: string
          term_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_types_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "fee_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_types_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_admin_audit_logs: {
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
            foreignKeyName: "finance_admin_audit_logs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_admin_audit_logs_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_admin_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_admin_designations: {
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
            foreignKeyName: "finance_admin_designations_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_admin_designations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_admin_designations_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_admin_designations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_settings: {
        Row: {
          allow_overpayment_credit: boolean
          allow_partial_payments: boolean
          auto_reminder_enabled: boolean
          created_at: string
          currency_code: string
          grace_period_days: number
          id: string
          institution_id: string
          late_penalty_percent: number
          max_upload_size_mb: number
          receipt_footer_text: string | null
          receipt_padding: number
          receipt_prefix: string
          retention_days: number
          updated_at: string
        }
        Insert: {
          allow_overpayment_credit?: boolean
          allow_partial_payments?: boolean
          auto_reminder_enabled?: boolean
          created_at?: string
          currency_code?: string
          grace_period_days?: number
          id?: string
          institution_id: string
          late_penalty_percent?: number
          max_upload_size_mb?: number
          receipt_footer_text?: string | null
          receipt_padding?: number
          receipt_prefix?: string
          retention_days?: number
          updated_at?: string
        }
        Update: {
          allow_overpayment_credit?: boolean
          allow_partial_payments?: boolean
          auto_reminder_enabled?: boolean
          created_at?: string
          currency_code?: string
          grace_period_days?: number
          id?: string
          institution_id?: string
          late_penalty_percent?: number
          max_upload_size_mb?: number
          receipt_footer_text?: string | null
          receipt_padding?: number
          receipt_prefix?: string
          retention_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_settings_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: true
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
      flag_reasons: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          institution_id: string
          is_active: boolean
          label: string
          reason_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          institution_id: string
          is_active?: boolean
          label: string
          reason_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          institution_id?: string
          is_active?: boolean
          label?: string
          reason_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flag_reasons_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
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
      help_content: {
        Row: {
          body: string
          created_at: string | null
          example: string | null
          id: string
          institution_id: string | null
          key: string
          language: string
          title: string
          updated_at: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          example?: string | null
          id?: string
          institution_id?: string | null
          key: string
          language?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          example?: string | null
          id?: string
          institution_id?: string | null
          key?: string
          language?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "help_content_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_assessment_weights: {
        Row: {
          continuous_assessment_weight: number
          created_at: string | null
          exam_weight: number
          id: string
          institution_id: string
          subject_id: string | null
          updated_at: string | null
        }
        Insert: {
          continuous_assessment_weight?: number
          created_at?: string | null
          exam_weight?: number
          id?: string
          institution_id: string
          subject_id?: string | null
          updated_at?: string | null
        }
        Update: {
          continuous_assessment_weight?: number
          created_at?: string | null
          exam_weight?: number
          id?: string
          institution_id?: string
          subject_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institution_assessment_weights_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_assessment_weights_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
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
      institution_holiday_decisions: {
        Row: {
          created_at: string | null
          decision: string
          id: string
          institution_id: string
          is_hidden: boolean | null
          national_holiday_id: string
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          decision?: string
          id?: string
          institution_id: string
          is_hidden?: boolean | null
          national_holiday_id: string
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          decision?: string
          id?: string
          institution_id?: string
          is_hidden?: boolean | null
          national_holiday_id?: string
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institution_holiday_decisions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_holiday_decisions_national_holiday_id_fkey"
            columns: ["national_holiday_id"]
            isOneToOne: false
            referencedRelation: "national_holidays"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_tracks: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          institution_id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          institution_id: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          institution_id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institution_tracks_institution_id_fkey"
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
          country: string | null
          created_at: string | null
          crm_api_key: string | null
          currency_id: string
          custom_admin_limit: number | null
          custom_student_limit: number | null
          email: string | null
          email_domain: string | null
          has_used_trial: boolean | null
          id: string
          location: string | null
          logo_url: string | null
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
          week_start_day: number | null
        }
        Insert: {
          addon_bursary?: boolean
          addon_diary?: boolean
          addon_library?: boolean | null
          addon_messaging?: boolean | null
          category_id?: string | null
          country?: string | null
          created_at?: string | null
          crm_api_key?: string | null
          currency_id: string
          custom_admin_limit?: number | null
          custom_student_limit?: number | null
          email?: string | null
          email_domain?: string | null
          has_used_trial?: boolean | null
          id?: string
          location?: string | null
          logo_url?: string | null
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
          week_start_day?: number | null
        }
        Update: {
          addon_bursary?: boolean
          addon_diary?: boolean
          addon_library?: boolean | null
          addon_messaging?: boolean | null
          category_id?: string | null
          country?: string | null
          created_at?: string | null
          crm_api_key?: string | null
          currency_id?: string
          custom_admin_limit?: number | null
          custom_student_limit?: number | null
          email?: string | null
          email_domain?: string | null
          has_used_trial?: boolean | null
          id?: string
          location?: string | null
          logo_url?: string | null
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
          week_start_day?: number | null
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
      ledger_entries: {
        Row: {
          allocation_id: string | null
          amount: number
          bill_id: string | null
          bill_item_id: string | null
          created_at: string
          description: string
          entry_type: string
          fee_type_id: string | null
          id: string
          institution_id: string
          payment_id: string | null
          receipt_id: string | null
          recorded_by: string | null
          reference_number: string | null
          running_balance: number
          student_id: string
        }
        Insert: {
          allocation_id?: string | null
          amount: number
          bill_id?: string | null
          bill_item_id?: string | null
          created_at?: string
          description: string
          entry_type: string
          fee_type_id?: string | null
          id?: string
          institution_id: string
          payment_id?: string | null
          receipt_id?: string | null
          recorded_by?: string | null
          reference_number?: string | null
          running_balance?: number
          student_id: string
        }
        Update: {
          allocation_id?: string | null
          amount?: number
          bill_id?: string | null
          bill_item_id?: string | null
          created_at?: string
          description?: string
          entry_type?: string
          fee_type_id?: string | null
          id?: string
          institution_id?: string
          payment_id?: string | null
          receipt_id?: string | null
          recorded_by?: string | null
          reference_number?: string | null
          running_balance?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "payment_allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "student_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_bill_item_id_fkey"
            columns: ["bill_item_id"]
            isOneToOne: false
            referencedRelation: "student_bill_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_fee_type_id_fkey"
            columns: ["fee_type_id"]
            isOneToOne: false
            referencedRelation: "fee_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_detailed"
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
          settings: Json | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          default_borrow_limit?: number | null
          effective_from?: string | null
          id?: string
          institution_id?: string | null
          min_fee_percent_for_borrow?: number | null
          settings?: Json | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          default_borrow_limit?: number | null
          effective_from?: string | null
          id?: string
          institution_id?: string | null
          min_fee_percent_for_borrow?: number | null
          settings?: Json | null
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
      national_assessment_records: {
        Row: {
          assessment_year: number
          checkpoint_name: string
          created_at: string | null
          id: string
          index_number: string | null
          institution_id: string
          overall_descriptor: string
          placement_notes: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          assessment_year: number
          checkpoint_name: string
          created_at?: string | null
          id?: string
          index_number?: string | null
          institution_id: string
          overall_descriptor: string
          placement_notes?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          assessment_year?: number
          checkpoint_name?: string
          created_at?: string | null
          id?: string
          index_number?: string | null
          institution_id?: string
          overall_descriptor?: string
          placement_notes?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "national_assessment_records_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "national_assessment_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "national_assessment_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_detailed"
            referencedColumns: ["id"]
          },
        ]
      }
      national_holidays: {
        Row: {
          country_code: string
          created_at: string | null
          external_key: string
          holiday_date: string
          id: string
          is_provisional: boolean | null
          name: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          country_code: string
          created_at?: string | null
          external_key: string
          holiday_date: string
          id?: string
          is_provisional?: boolean | null
          name: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          country_code?: string
          created_at?: string | null
          external_key?: string
          holiday_date?: string
          id?: string
          is_provisional?: boolean | null
          name?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
      payment_allocations: {
        Row: {
          amount: number
          bill_id: string | null
          bill_item_id: string | null
          created_at: string
          fee_type_id: string | null
          id: string
          institution_id: string
          notes: string | null
          payment_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          bill_id?: string | null
          bill_item_id?: string | null
          created_at?: string
          fee_type_id?: string | null
          id?: string
          institution_id: string
          notes?: string | null
          payment_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bill_id?: string | null
          bill_item_id?: string | null
          created_at?: string
          fee_type_id?: string | null
          id?: string
          institution_id?: string
          notes?: string | null
          payment_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "student_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_bill_item_id_fkey"
            columns: ["bill_item_id"]
            isOneToOne: false
            referencedRelation: "student_bill_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_fee_type_id_fkey"
            columns: ["fee_type_id"]
            isOneToOne: false
            referencedRelation: "fee_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_detailed"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_flags: {
        Row: {
          admin_notes: string | null
          flagged_at: string
          flagged_by: string | null
          id: string
          institution_id: string
          payment_id: string
          reason_code: string | null
          reason_id: string | null
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          admin_notes?: string | null
          flagged_at?: string
          flagged_by?: string | null
          id?: string
          institution_id: string
          payment_id: string
          reason_code?: string | null
          reason_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          admin_notes?: string | null
          flagged_at?: string
          flagged_by?: string | null
          id?: string
          institution_id?: string
          payment_id?: string
          reason_code?: string | null
          reason_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_flags_flagged_by_fkey"
            columns: ["flagged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_flags_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_flags_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_flags_reason_id_fkey"
            columns: ["reason_id"]
            isOneToOne: false
            referencedRelation: "flag_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_flags_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          code: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          institution_id: string
          instructions: string | null
          is_active: boolean
          name: string
          requires_proof: boolean
          requires_reference: boolean
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          institution_id: string
          instructions?: string | null
          is_active?: boolean
          name: string
          requires_proof?: boolean
          requires_reference?: boolean
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          institution_id?: string
          instructions?: string | null
          is_active?: boolean
          name?: string
          requires_proof?: boolean
          requires_reference?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_proofs: {
        Row: {
          created_at: string
          file_hash: string | null
          file_name: string | null
          file_size: number | null
          id: string
          institution_id: string
          mime_type: string | null
          payment_id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_hash?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          institution_id: string
          mime_type?: string | null
          payment_id: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_hash?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          institution_id?: string
          mime_type?: string | null
          payment_id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_proofs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_proofs_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_proofs_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          admin_notes: string | null
          amount: number
          confirmed_amount: number | null
          confirmed_at: string | null
          created_at: string | null
          fee_structure_id: string | null
          fee_structure_snapshot: Json | null
          flag_reason_id: string | null
          id: string
          idempotency_key: string | null
          institution_id: string | null
          is_evidence_confirmed: boolean | null
          is_split: boolean
          origin_id: string | null
          origin_label: string | null
          origin_type: string | null
          payer_name: string | null
          payer_phone: string | null
          payment_date: string | null
          payment_method: string | null
          payment_method_id: string | null
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
          submitted_by: string | null
          target_id: string | null
          target_label: string | null
          target_type: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          confirmed_amount?: number | null
          confirmed_at?: string | null
          created_at?: string | null
          fee_structure_id?: string | null
          fee_structure_snapshot?: Json | null
          flag_reason_id?: string | null
          id?: string
          idempotency_key?: string | null
          institution_id?: string | null
          is_evidence_confirmed?: boolean | null
          is_split?: boolean
          origin_id?: string | null
          origin_label?: string | null
          origin_type?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_method_id?: string | null
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
          submitted_by?: string | null
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          confirmed_amount?: number | null
          confirmed_at?: string | null
          created_at?: string | null
          fee_structure_id?: string | null
          fee_structure_snapshot?: Json | null
          flag_reason_id?: string | null
          id?: string
          idempotency_key?: string | null
          institution_id?: string | null
          is_evidence_confirmed?: boolean | null
          is_split?: boolean
          origin_id?: string | null
          origin_label?: string | null
          origin_type?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_method_id?: string | null
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
          submitted_by?: string | null
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
          total_amount?: number | null
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
            foreignKeyName: "payments_flag_reason_id_fkey"
            columns: ["flag_reason_id"]
            isOneToOne: false
            referencedRelation: "flag_reasons"
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
            foreignKeyName: "payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
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
          {
            foreignKeyName: "payments_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_versions: {
        Row: {
          institution_id: string
          updated_at: string | null
          user_id: string
          version: number
        }
        Insert: {
          institution_id: string
          updated_at?: string | null
          user_id: string
          version?: number
        }
        Update: {
          institution_id?: string
          updated_at?: string | null
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "permission_versions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_versions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
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
      receipt_sequences: {
        Row: {
          institution_id: string
          last_number: number
          padding: number
          prefix: string
          updated_at: string
        }
        Insert: {
          institution_id: string
          last_number?: number
          padding?: number
          prefix?: string
          updated_at?: string
        }
        Update: {
          institution_id?: string
          last_number?: number
          padding?: number
          prefix?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_sequences_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: true
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          institution_id: string
          issued_at: string
          issued_by: string | null
          metadata: Json
          payment_id: string
          pdf_url: string | null
          receipt_number: string
          status: string
          student_id: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          institution_id: string
          issued_at?: string
          issued_by?: string | null
          metadata?: Json
          payment_id: string
          pdf_url?: string | null
          receipt_number: string
          status?: string
          student_id?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          institution_id?: string
          issued_at?: string
          issued_by?: string | null
          metadata?: Json
          payment_id?: string
          pdf_url?: string | null
          receipt_number?: string
          status?: string
          student_id?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      record_change_log: {
        Row: {
          change_type: string
          changed_by: string
          created_at: string | null
          id: string
          institution_id: string
          new_values: Json | null
          old_values: Json | null
          reason: string | null
          record_id: string
          table_name: string
        }
        Insert: {
          change_type: string
          changed_by: string
          created_at?: string | null
          id?: string
          institution_id: string
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
          record_id: string
          table_name: string
        }
        Update: {
          change_type?: string
          changed_by?: string
          created_at?: string | null
          id?: string
          institution_id?: string
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_change_log_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      record_of_work: {
        Row: {
          activities_references: string | null
          admin_notes: string | null
          class_id: string | null
          completed_at: string | null
          coverage_plan_id: string | null
          created_at: string | null
          date: string | null
          duration_minutes: number | null
          id: string
          institution_id: string | null
          is_completed: boolean | null
          learning_objectives: string | null
          lesson_number: number | null
          remarks: string | null
          status: string | null
          sub_topic: string | null
          subject_id: string | null
          teacher_id: string | null
          topic: string
          updated_at: string | null
          week_number: number
        }
        Insert: {
          activities_references?: string | null
          admin_notes?: string | null
          class_id?: string | null
          completed_at?: string | null
          coverage_plan_id?: string | null
          created_at?: string | null
          date?: string | null
          duration_minutes?: number | null
          id?: string
          institution_id?: string | null
          is_completed?: boolean | null
          learning_objectives?: string | null
          lesson_number?: number | null
          remarks?: string | null
          status?: string | null
          sub_topic?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          topic: string
          updated_at?: string | null
          week_number: number
        }
        Update: {
          activities_references?: string | null
          admin_notes?: string | null
          class_id?: string | null
          completed_at?: string | null
          coverage_plan_id?: string | null
          created_at?: string | null
          date?: string | null
          duration_minutes?: number | null
          id?: string
          institution_id?: string | null
          is_completed?: boolean | null
          learning_objectives?: string | null
          lesson_number?: number | null
          remarks?: string | null
          status?: string | null
          sub_topic?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          topic?: string
          updated_at?: string | null
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "record_of_work_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_of_work_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_classes_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_of_work_coverage_plan_id_fkey"
            columns: ["coverage_plan_id"]
            isOneToOne: false
            referencedRelation: "subject_coverage_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_of_work_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_of_work_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_of_work_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          authorized_at: string
          authorized_by: string
          created_at: string
          credit_id: string | null
          id: string
          institution_id: string
          method: string
          payment_id: string | null
          reason: string
          reference_number: string | null
          student_id: string
        }
        Insert: {
          amount: number
          authorized_at?: string
          authorized_by: string
          created_at?: string
          credit_id?: string | null
          id?: string
          institution_id: string
          method: string
          payment_id?: string | null
          reason: string
          reference_number?: string | null
          student_id: string
        }
        Update: {
          amount?: number
          authorized_at?: string
          authorized_by?: string
          created_at?: string
          credit_id?: string | null
          id?: string
          institution_id?: string
          method?: string
          payment_id?: string | null
          reason?: string
          reference_number?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_authorized_by_fkey"
            columns: ["authorized_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "credits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_detailed"
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
          institution_id: string | null
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
          institution_id?: string | null
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
          institution_id?: string | null
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
            foreignKeyName: "report_card_items_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
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
          curriculum_type: string | null
          gpa: number | null
          id: string
          institution_id: string | null
          learner_development: Json | null
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
          curriculum_type?: string | null
          gpa?: number | null
          id?: string
          institution_id?: string | null
          learner_development?: Json | null
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
          curriculum_type?: string | null
          gpa?: number | null
          id?: string
          institution_id?: string | null
          learner_development?: Json | null
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
          class_id: string | null
          created_at: string | null
          id: string
          institution_id: string | null
          size: string | null
          status: string | null
          subject_id: string | null
          target_audience: string
          teacher_id: string | null
          title: string
          topic_area_id: string | null
          topic_id: string | null
          type: string
          updated_at: string | null
          url: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          institution_id?: string | null
          size?: string | null
          status?: string | null
          subject_id?: string | null
          target_audience?: string
          teacher_id?: string | null
          title: string
          topic_area_id?: string | null
          topic_id?: string | null
          type: string
          updated_at?: string | null
          url: string
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          institution_id?: string | null
          size?: string | null
          status?: string | null
          subject_id?: string | null
          target_audience?: string
          teacher_id?: string | null
          title?: string
          topic_area_id?: string | null
          topic_id?: string | null
          type?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_classes_detailed"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "resources_topic_area_id_fkey"
            columns: ["topic_area_id"]
            isOneToOne: false
            referencedRelation: "subject_topic_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "subject_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      reversals: {
        Row: {
          amount: number
          authorized_by: string
          created_at: string
          id: string
          institution_id: string
          payment_id: string
          reason: string
          receipt_id: string | null
        }
        Insert: {
          amount: number
          authorized_by: string
          created_at?: string
          id?: string
          institution_id: string
          payment_id: string
          reason: string
          receipt_id?: string | null
        }
        Update: {
          amount?: number
          authorized_by?: string
          created_at?: string
          id?: string
          institution_id?: string
          payment_id?: string
          reason?: string
          receipt_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reversals_authorized_by_fkey"
            columns: ["authorized_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reversals_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reversals_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reversals_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      role_change_requests: {
        Row: {
          change_type: string
          created_at: string | null
          details: Json
          id: string
          institution_id: string
          reason: string | null
          requester_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_user_id: string
        }
        Insert: {
          change_type: string
          created_at?: string | null
          details?: Json
          id?: string
          institution_id: string
          reason?: string | null
          requester_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_user_id: string
        }
        Update: {
          change_type?: string
          created_at?: string | null
          details?: Json
          id?: string
          institution_id?: string
          reason?: string | null
          requester_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_change_requests_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_change_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_change_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_change_requests_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          action: string | null
          created_at: string | null
          domain: string | null
          id: string
          institution_id: string | null
          permission_id: string | null
          role_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          domain?: string | null
          id?: string
          institution_id?: string | null
          permission_id?: string | null
          role_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          domain?: string | null
          id?: string
          institution_id?: string | null
          permission_id?: string | null
          role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
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
      role_scopes: {
        Row: {
          created_at: string | null
          domain: string
          hidden_fields: Json | null
          id: string
          institution_id: string
          role_id: string
          scope_type: string
          scope_values: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain: string
          hidden_fields?: Json | null
          id?: string
          institution_id: string
          role_id: string
          scope_type?: string
          scope_values?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string
          hidden_fields?: Json | null
          id?: string
          institution_id?: string
          role_id?: string
          scope_type?: string
          scope_values?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_scopes_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_scopes_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_templates: {
        Row: {
          best_for: string | null
          created_at: string | null
          data_scope: string
          description: string
          id: string
          institution_id: string | null
          is_system: boolean | null
          name: string
          permissions: Json
          scope_config: Json | null
          updated_at: string | null
        }
        Insert: {
          best_for?: string | null
          created_at?: string | null
          data_scope?: string
          description: string
          id?: string
          institution_id?: string | null
          is_system?: boolean | null
          name: string
          permissions?: Json
          scope_config?: Json | null
          updated_at?: string | null
        }
        Update: {
          best_for?: string | null
          created_at?: string | null
          data_scope?: string
          description?: string
          id?: string
          institution_id?: string | null
          is_system?: boolean | null
          name?: string
          permissions?: Json
          scope_config?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_templates_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          created_from_template_id: string | null
          data_scope: string | null
          description: string | null
          id: string
          institution_id: string | null
          is_template: boolean | null
          metadata: Json | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_from_template_id?: string | null
          data_scope?: string | null
          description?: string | null
          id?: string
          institution_id?: string | null
          is_template?: boolean | null
          metadata?: Json | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_from_template_id?: string | null
          data_scope?: string | null
          description?: string | null
          id?: string
          institution_id?: string | null
          is_template?: boolean | null
          metadata?: Json | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_created_from_template_id_fkey"
            columns: ["created_from_template_id"]
            isOneToOne: false
            referencedRelation: "role_templates"
            referencedColumns: ["id"]
          },
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
      student_bill_items: {
        Row: {
          amount: number
          bill_id: string
          created_at: string
          due_date: string | null
          fee_type_id: string | null
          id: string
          institution_id: string
          is_mandatory: boolean
          item_name: string
          updated_at: string
        }
        Insert: {
          amount: number
          bill_id: string
          created_at?: string
          due_date?: string | null
          fee_type_id?: string | null
          id?: string
          institution_id: string
          is_mandatory?: boolean
          item_name: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bill_id?: string
          created_at?: string
          due_date?: string | null
          fee_type_id?: string | null
          id?: string
          institution_id?: string
          is_mandatory?: boolean
          item_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_bill_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "student_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_bill_items_fee_type_id_fkey"
            columns: ["fee_type_id"]
            isOneToOne: false
            referencedRelation: "fee_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_bill_items_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      student_bills: {
        Row: {
          academic_year_id: string | null
          adjustment_amount: number
          bill_number: string
          created_at: string
          due_date: string | null
          gross_amount: number
          id: string
          institution_id: string
          issue_date: string
          net_amount: number
          notes: string | null
          status: string
          student_id: string
          term_id: string | null
          updated_at: string
        }
        Insert: {
          academic_year_id?: string | null
          adjustment_amount?: number
          bill_number: string
          created_at?: string
          due_date?: string | null
          gross_amount?: number
          id?: string
          institution_id: string
          issue_date?: string
          net_amount?: number
          notes?: string | null
          status?: string
          student_id: string
          term_id?: string | null
          updated_at?: string
        }
        Update: {
          academic_year_id?: string | null
          adjustment_amount?: number
          bill_number?: string
          created_at?: string
          due_date?: string | null
          gross_amount?: number
          id?: string
          institution_id?: string
          issue_date?: string
          net_amount?: number
          notes?: string | null
          status?: string
          student_id?: string
          term_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_bills_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_bills_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_bills_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_detailed"
            referencedColumns: ["id"]
          },
        ]
      }
      student_class_transfers: {
        Row: {
          approved_by: string | null
          created_at: string | null
          from_class_id: string | null
          id: string
          institution_id: string
          reason: string | null
          rejection_reason: string | null
          requested_by: string
          status: string
          student_id: string
          to_class_id: string
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          from_class_id?: string | null
          id?: string
          institution_id: string
          reason?: string | null
          rejection_reason?: string | null
          requested_by: string
          status?: string
          student_id: string
          to_class_id: string
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          from_class_id?: string | null
          id?: string
          institution_id?: string
          reason?: string | null
          rejection_reason?: string | null
          requested_by?: string
          status?: string
          student_id?: string
          to_class_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_class_transfers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_class_transfers_from_class_id_fkey"
            columns: ["from_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_class_transfers_from_class_id_fkey"
            columns: ["from_class_id"]
            isOneToOne: false
            referencedRelation: "v_classes_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_class_transfers_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_class_transfers_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_class_transfers_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_class_transfers_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_class_transfers_to_class_id_fkey"
            columns: ["to_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_class_transfers_to_class_id_fkey"
            columns: ["to_class_id"]
            isOneToOne: false
            referencedRelation: "v_classes_detailed"
            referencedColumns: ["id"]
          },
        ]
      }
      student_fee_invoices: {
        Row: {
          academic_year_id: string | null
          balance_due: number
          created_at: string
          discount_amount: number
          due_date: string | null
          fee_structure_id: string | null
          gross_amount: number
          id: string
          institution_id: string
          invoice_number: string
          issue_date: string
          itemized_breakdown: Json
          net_amount: number
          notes: string | null
          paid_amount: number
          status: string
          student_id: string
          term_id: string | null
          updated_at: string
        }
        Insert: {
          academic_year_id?: string | null
          balance_due?: number
          created_at?: string
          discount_amount?: number
          due_date?: string | null
          fee_structure_id?: string | null
          gross_amount?: number
          id?: string
          institution_id: string
          invoice_number: string
          issue_date?: string
          itemized_breakdown?: Json
          net_amount?: number
          notes?: string | null
          paid_amount?: number
          status?: string
          student_id: string
          term_id?: string | null
          updated_at?: string
        }
        Update: {
          academic_year_id?: string | null
          balance_due?: number
          created_at?: string
          discount_amount?: number
          due_date?: string | null
          fee_structure_id?: string | null
          gross_amount?: number
          id?: string
          institution_id?: string
          invoice_number?: string
          issue_date?: string
          itemized_breakdown?: Json
          net_amount?: number
          notes?: string | null
          paid_amount?: number
          status?: string
          student_id?: string
          term_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_fee_invoices_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fee_invoices_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fee_invoices_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fee_invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fee_invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fee_invoices_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      student_track_enrollments: {
        Row: {
          academic_year_id: string | null
          created_at: string | null
          elective_subject_ids: Json | null
          id: string
          institution_id: string
          student_id: string
          track_id: string
          updated_at: string | null
        }
        Insert: {
          academic_year_id?: string | null
          created_at?: string | null
          elective_subject_ids?: Json | null
          id?: string
          institution_id: string
          student_id: string
          track_id: string
          updated_at?: string | null
        }
        Update: {
          academic_year_id?: string | null
          created_at?: string | null
          elective_subject_ids?: Json | null
          id?: string
          institution_id?: string
          student_id?: string
          track_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_track_enrollments_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_track_enrollments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_track_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_track_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_track_enrollments_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "institution_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      student_violations: {
        Row: {
          action_taken: string | null
          created_at: string | null
          description: string
          id: string
          incident_date: string
          institution_id: string
          recorded_by: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          student_id: string
          title: string
          updated_at: string | null
          violation_type: string
        }
        Insert: {
          action_taken?: string | null
          created_at?: string | null
          description: string
          id?: string
          incident_date?: string
          institution_id: string
          recorded_by: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          student_id: string
          title: string
          updated_at?: string | null
          violation_type: string
        }
        Update: {
          action_taken?: string | null
          created_at?: string | null
          description?: string
          id?: string
          incident_date?: string
          institution_id?: string
          recorded_by?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          student_id?: string
          title?: string
          updated_at?: string | null
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_violations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_violations_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_violations_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_violations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_violations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_students_detailed"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          academic_year: string | null
          admission_date: string | null
          admission_number: string | null
          archived_at: string | null
          class_id: string | null
          created_at: string | null
          departed_at: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          enrollment_status: string
          exit_date: string | null
          exit_reason: string | null
          fee_balance: number | null
          form_level: number | null
          grade_level: number | null
          grade_level_legacy: string | null
          grading_scale_id: string | null
          id: string
          id_number: string | null
          institution_id: string | null
          parent_contact: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          academic_year?: string | null
          admission_date?: string | null
          admission_number?: string | null
          archived_at?: string | null
          class_id?: string | null
          created_at?: string | null
          departed_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          enrollment_status?: string
          exit_date?: string | null
          exit_reason?: string | null
          fee_balance?: number | null
          form_level?: number | null
          grade_level?: number | null
          grade_level_legacy?: string | null
          grading_scale_id?: string | null
          id?: string
          id_number?: string | null
          institution_id?: string | null
          parent_contact?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          academic_year?: string | null
          admission_date?: string | null
          admission_number?: string | null
          archived_at?: string | null
          class_id?: string | null
          created_at?: string | null
          departed_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          enrollment_status?: string
          exit_date?: string | null
          exit_reason?: string | null
          fee_balance?: number | null
          form_level?: number | null
          grade_level?: number | null
          grade_level_legacy?: string | null
          grading_scale_id?: string | null
          id?: string
          id_number?: string | null
          institution_id?: string | null
          parent_contact?: string | null
          status?: string | null
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
      subject_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          institution_id: string
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          institution_id: string
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          institution_id?: string
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_categories_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_classes: {
        Row: {
          class_id: string | null
          created_at: string | null
          id: string
          institution_id: string | null
          subject_id: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          institution_id?: string | null
          subject_id?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          institution_id?: string | null
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_classes_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_classes_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_classes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_coverage_plans: {
        Row: {
          academic_year: string
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_weeks: number | null
          id: string
          institution_id: string | null
          order_index: number | null
          status: string | null
          strand: string | null
          sub_strand: string | null
          subject_id: string | null
          target_completion_date: string | null
          term: string
          title: string
          updated_at: string | null
          week_end: number | null
          week_start: number | null
        }
        Insert: {
          academic_year: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_weeks?: number | null
          id?: string
          institution_id?: string | null
          order_index?: number | null
          status?: string | null
          strand?: string | null
          sub_strand?: string | null
          subject_id?: string | null
          target_completion_date?: string | null
          term: string
          title: string
          updated_at?: string | null
          week_end?: number | null
          week_start?: number | null
        }
        Update: {
          academic_year?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_weeks?: number | null
          id?: string
          institution_id?: string | null
          order_index?: number | null
          status?: string | null
          strand?: string | null
          sub_strand?: string | null
          subject_id?: string | null
          target_completion_date?: string | null
          term?: string
          title?: string
          updated_at?: string | null
          week_end?: number | null
          week_start?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_coverage_plans_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_coverage_plans_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_report_card_assessments: {
        Row: {
          assessment_id: string
          assessment_type: string
          class_id: string
          created_at: string | null
          id: string
          institution_id: string
          is_included: boolean
          selected_by: string | null
          subject_id: string
          term_id: string
          updated_at: string | null
        }
        Insert: {
          assessment_id: string
          assessment_type?: string
          class_id: string
          created_at?: string | null
          id?: string
          institution_id: string
          is_included?: boolean
          selected_by?: string | null
          subject_id: string
          term_id: string
          updated_at?: string | null
        }
        Update: {
          assessment_id?: string
          assessment_type?: string
          class_id?: string
          created_at?: string | null
          id?: string
          institution_id?: string
          is_included?: boolean
          selected_by?: string | null
          subject_id?: string
          term_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_report_card_assessments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_report_card_assessments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_classes_detailed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_report_card_assessments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_report_card_assessments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_report_card_assessments_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_teachers: {
        Row: {
          class_id: string | null
          created_at: string | null
          id: string
          institution_id: string | null
          is_hod: boolean | null
          is_migrated: boolean | null
          subject_id: string | null
          teacher_id: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          institution_id?: string | null
          is_hod?: boolean | null
          is_migrated?: boolean | null
          subject_id?: string | null
          teacher_id?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          institution_id?: string | null
          is_hod?: boolean | null
          is_migrated?: boolean | null
          subject_id?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_teachers_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_teachers_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_classes_detailed"
            referencedColumns: ["id"]
          },
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
      subject_topic_areas: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          institution_id: string
          name: string
          sort_order: number | null
          subject_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          institution_id: string
          name: string
          sort_order?: number | null
          subject_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          institution_id?: string
          name?: string
          sort_order?: number | null
          subject_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_topic_areas_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_topic_areas_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_topics: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          institution_id: string
          name: string
          sort_order: number | null
          topic_area_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          institution_id: string
          name: string
          sort_order?: number | null
          topic_area_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          institution_id?: string
          name?: string
          sort_order?: number | null
          topic_area_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_topics_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_topics_topic_area_id_fkey"
            columns: ["topic_area_id"]
            isOneToOne: false
            referencedRelation: "subject_topic_areas"
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
          category_id: string | null
          class_id: string | null
          created_at: string | null
          credits: number | null
          description: string | null
          duration: string | null
          fee_amount: number
          fee_config: Json | null
          hod_teacher_id: string | null
          id: string
          image_url: string | null
          institution_id: string | null
          level: string | null
          level_ids: string[] | null
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
          category_id?: string | null
          class_id?: string | null
          created_at?: string | null
          credits?: number | null
          description?: string | null
          duration?: string | null
          fee_amount?: number
          fee_config?: Json | null
          hod_teacher_id?: string | null
          id?: string
          image_url?: string | null
          institution_id?: string | null
          level?: string | null
          level_ids?: string[] | null
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
          category_id?: string | null
          class_id?: string | null
          created_at?: string | null
          credits?: number | null
          description?: string | null
          duration?: string | null
          fee_amount?: number
          fee_config?: Json | null
          hod_teacher_id?: string | null
          id?: string
          image_url?: string | null
          institution_id?: string | null
          level?: string | null
          level_ids?: string[] | null
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
          {
            foreignKeyName: "subjects_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "subject_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_hod_teacher_id_fkey"
            columns: ["hod_teacher_id"]
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
          confirmation_status: string | null
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
          confirmation_status?: string | null
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
          confirmation_status?: string | null
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
          archived_at: string | null
          created_at: string | null
          departed_at: string | null
          department: string | null
          employment_status: string
          exit_date: string | null
          exit_reason: string | null
          id: string
          institution_id: string | null
          position: string | null
          qualification: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          departed_at?: string | null
          department?: string | null
          employment_status?: string
          exit_date?: string | null
          exit_reason?: string | null
          id?: string
          institution_id?: string | null
          position?: string | null
          qualification?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          departed_at?: string | null
          department?: string | null
          employment_status?: string
          exit_date?: string | null
          exit_reason?: string | null
          id?: string
          institution_id?: string | null
          position?: string | null
          qualification?: string | null
          status?: string | null
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
          attendance_deadline: string | null
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
          attendance_deadline?: string | null
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
          attendance_deadline?: string | null
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
          institution_id: string | null
          is_internal: boolean | null
          message: string
          sender_id: string | null
          ticket_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          institution_id?: string | null
          is_internal?: boolean | null
          message: string
          sender_id?: string | null
          ticket_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          institution_id?: string | null
          is_internal?: boolean | null
          message?: string
          sender_id?: string | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
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
      timetable_configs: {
        Row: {
          active_days: Json
          break_periods: Json
          created_at: string | null
          days: Json | null
          id: string
          institution_id: string
          max_teacher_periods_per_day: number | null
          max_teacher_periods_per_week: number | null
          period_duration_minutes: number
          periods: Json | null
          school_end_time: string
          school_start_time: string
          settings: Json | null
          special_constraints: Json
          subject_requirements: Json
          updated_at: string | null
        }
        Insert: {
          active_days?: Json
          break_periods?: Json
          created_at?: string | null
          days?: Json | null
          id?: string
          institution_id: string
          max_teacher_periods_per_day?: number | null
          max_teacher_periods_per_week?: number | null
          period_duration_minutes?: number
          periods?: Json | null
          school_end_time?: string
          school_start_time?: string
          settings?: Json | null
          special_constraints?: Json
          subject_requirements?: Json
          updated_at?: string | null
        }
        Update: {
          active_days?: Json
          break_periods?: Json
          created_at?: string | null
          days?: Json | null
          id?: string
          institution_id?: string
          max_teacher_periods_per_day?: number | null
          max_teacher_periods_per_week?: number | null
          period_duration_minutes?: number
          periods?: Json | null
          school_end_time?: string
          school_start_time?: string
          settings?: Json | null
          special_constraints?: Json
          subject_requirements?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_configs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: true
            referencedRelation: "institutions"
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
          is_draft: boolean
          is_elective: boolean
          period_number: number | null
          room_number: string | null
          start_time: string
          subject_id: string | null
          teacher_id: string | null
          track_id: string | null
          updated_at: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          day_of_week?: string | null
          end_time: string
          id?: string
          institution_id?: string | null
          is_draft?: boolean
          is_elective?: boolean
          period_number?: number | null
          room_number?: string | null
          start_time: string
          subject_id?: string | null
          teacher_id?: string | null
          track_id?: string | null
          updated_at?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          day_of_week?: string | null
          end_time?: string
          id?: string
          institution_id?: string | null
          is_draft?: boolean
          is_elective?: boolean
          period_number?: number | null
          room_number?: string | null
          start_time?: string
          subject_id?: string | null
          teacher_id?: string | null
          track_id?: string | null
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
          {
            foreignKeyName: "timetables_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetables_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "institution_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      track_subjects: {
        Row: {
          created_at: string | null
          id: string
          institution_id: string
          is_compulsory: boolean | null
          subject_id: string
          track_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          institution_id: string
          is_compulsory?: boolean | null
          subject_id: string
          track_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          institution_id?: string
          is_compulsory?: boolean | null
          subject_id?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_subjects_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_subjects_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "institution_tracks"
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
      user_permission_overrides: {
        Row: {
          action: string
          created_at: string | null
          domain: string
          effect: string
          granted_by: string
          id: string
          institution_id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          domain: string
          effect: string
          granted_by: string
          id?: string
          institution_id: string
          reason?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          domain?: string
          effect?: string
          granted_by?: string
          id?: string
          institution_id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_overrides_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permission_overrides_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permission_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          attendance_digest: boolean | null
          created_at: string | null
          email_notifications: boolean | null
          font_size: string | null
          grade_release_alerts: boolean | null
          id: string
          institution_id: string | null
          push_notifications: boolean | null
          reduced_motion: boolean | null
          share_staff_presence: boolean | null
          submission_alerts: boolean | null
          system_alerts: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attendance_digest?: boolean | null
          created_at?: string | null
          email_notifications?: boolean | null
          font_size?: string | null
          grade_release_alerts?: boolean | null
          id?: string
          institution_id?: string | null
          push_notifications?: boolean | null
          reduced_motion?: boolean | null
          share_staff_presence?: boolean | null
          submission_alerts?: boolean | null
          system_alerts?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attendance_digest?: boolean | null
          created_at?: string | null
          email_notifications?: boolean | null
          font_size?: string | null
          grade_release_alerts?: boolean | null
          id?: string
          institution_id?: string | null
          push_notifications?: boolean | null
          reduced_motion?: boolean | null
          share_staff_presence?: boolean | null
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
          assigned_by: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          institution_id: string | null
          role_id: string | null
          starts_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          institution_id?: string | null
          role_id?: string | null
          starts_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_by?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          institution_id?: string | null
          role_id?: string | null
          starts_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
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
          disabled_reason: string | null
          email: string
          failed_login_attempts: number
          first_name: string | null
          full_name: string
          gender: string | null
          id: string
          institution_id: string | null
          is_active: boolean
          is_demo: boolean | null
          last_failed_login_at: string | null
          last_name: string | null
          must_change_password: boolean
          phone: string | null
          phone_numbers: Json | null
          requires_security_questions_setup: boolean
          retention_until: string | null
          role: string
          status: string
          trial_end_date: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          disabled_reason?: string | null
          email: string
          failed_login_attempts?: number
          first_name?: string | null
          full_name: string
          gender?: string | null
          id: string
          institution_id?: string | null
          is_active?: boolean
          is_demo?: boolean | null
          last_failed_login_at?: string | null
          last_name?: string | null
          must_change_password?: boolean
          phone?: string | null
          phone_numbers?: Json | null
          requires_security_questions_setup?: boolean
          retention_until?: string | null
          role: string
          status?: string
          trial_end_date?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          disabled_reason?: string | null
          email?: string
          failed_login_attempts?: number
          first_name?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          institution_id?: string | null
          is_active?: boolean
          is_demo?: boolean | null
          last_failed_login_at?: string | null
          last_name?: string | null
          must_change_password?: boolean
          phone?: string | null
          phone_numbers?: Json | null
          requires_security_questions_setup?: boolean
          retention_until?: string | null
          role?: string
          status?: string
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
          cbc_band: string | null
          class_type: string | null
          created_at: string | null
          display_name: string | null
          form_level: number | null
          grade_level: number | null
          id: string | null
          institution_id: string | null
          institution_name: string | null
          level_label: string | null
          name: string | null
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
      crm_lms_accounts_page: {
        Args: { after_id?: string; page_size?: number }
        Returns: Json
      }
      crm_lms_overview: { Args: never; Returns: Json }
      crm_lms_snapshot: {
        Args: { after_id?: string; page_size?: number }
        Returns: Json
      }
      current_user_student_id: { Args: never; Returns: string }
      current_user_teacher_id: { Args: never; Returns: string }
      generate_custom_id: { Args: { prefix: string }; Returns: string }
      generate_receipt_number: {
        Args: { p_institution_id: string }
        Returns: string
      }
      get_current_user_institution_id: { Args: never; Returns: string }
      get_current_user_role: { Args: never; Returns: string }
      get_effective_permissions: {
        Args: { p_institution_id: string; p_user_id: string }
        Returns: Json
      }
      get_effective_scopes: {
        Args: { p_institution_id: string; p_user_id: string }
        Returns: Json
      }
      get_gpa_points: {
        Args: { p_institution_id: string; p_percentage: number }
        Returns: number
      }
      get_letter_grade: {
        Args: { p_institution_id: string; p_percentage: number }
        Returns: string
      }
      get_my_effective_permissions: {
        Args: { p_institution_id?: string }
        Returns: Json
      }
      get_my_effective_scopes: {
        Args: { p_institution_id?: string }
        Returns: Json
      }
      get_student_finance_summary: {
        Args: { p_institution_id: string; p_student_id: string }
        Returns: Json
      }
      get_student_rank: { Args: { p_student_id: string }; Returns: Json }
      has_permission:
        | {
            Args: {
              p_action: string
              p_domain: string
              p_institution_id: string
              p_user_id: string
            }
            Returns: boolean
          }
        | {
            Args: {
              p_action: string
              p_domain: string
              p_institution_id: string
              p_user_id: string
            }
            Returns: boolean
          }
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
