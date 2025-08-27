// Defined Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          full_name: string
          email: string
          role: 'admin' | 'student' | 'teacher'
          institution_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          email: string
          role: 'admin' | 'student' | 'teacher'
          institution_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          role?: 'admin' | 'student' | 'teacher'
          institution_id?: string | null
          created_at?: string
        }
      }
      institutions: {
        Row: {
          id: string
          name: string
          // Add other institution fields as needed
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
      }
    }
  }
}