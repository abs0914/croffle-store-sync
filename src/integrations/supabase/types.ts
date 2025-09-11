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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      account_balance_summary: {
        Row: {
          account_id: string
          beginning_balance: number | null
          created_at: string | null
          ending_balance: number | null
          fiscal_period: string
          id: string
          is_closed: boolean | null
          store_id: string | null
          total_credits: number | null
          total_debits: number | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          beginning_balance?: number | null
          created_at?: string | null
          ending_balance?: number | null
          fiscal_period: string
          id?: string
          is_closed?: boolean | null
          store_id?: string | null
          total_credits?: number | null
          total_debits?: number | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          beginning_balance?: number | null
          created_at?: string | null
          ending_balance?: number | null
          fiscal_period?: string
          id?: string
          is_closed?: boolean | null
          store_id?: string | null
          total_credits?: number | null
          total_debits?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_balance_summary_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_balance_summary_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "account_balance_summary_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      account_balances: {
        Row: {
          account_id: string
          beginning_balance: number
          created_at: string
          credit_total: number
          debit_total: number
          ending_balance: number
          id: string
          is_closed: boolean
          period_month: number
          period_year: number
          store_id: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          beginning_balance?: number
          created_at?: string
          credit_total?: number
          debit_total?: number
          ending_balance?: number
          id?: string
          is_closed?: boolean
          period_month: number
          period_year: number
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          beginning_balance?: number
          created_at?: string
          credit_total?: number
          debit_total?: number
          ending_balance?: number
          id?: string
          is_closed?: boolean
          period_month?: number
          period_year?: number
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_balances_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_balances_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "account_balances_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      addon_categories: {
        Row: {
          category_type: string
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category_type?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category_type?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_users: {
        Row: {
          contact_number: string | null
          created_at: string | null
          custom_permissions: Json | null
          email: string | null
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string
          role: Database["public"]["Enums"]["app_role"]
          store_ids: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          contact_number?: string | null
          created_at?: string | null
          custom_permissions?: Json | null
          email?: string | null
          first_name: string
          id?: string
          is_active?: boolean | null
          last_name: string
          role: Database["public"]["Enums"]["app_role"]
          store_ids?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          contact_number?: string | null
          created_at?: string | null
          custom_permissions?: Json | null
          email?: string | null
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_name?: string
          role?: Database["public"]["Enums"]["app_role"]
          store_ids?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_users_backup_reset: {
        Row: {
          contact_number: string | null
          created_at: string | null
          custom_permissions: Json | null
          email: string | null
          first_name: string | null
          id: string | null
          is_active: boolean | null
          last_name: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          store_ids: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          contact_number?: string | null
          created_at?: string | null
          custom_permissions?: Json | null
          email?: string | null
          first_name?: string | null
          id?: string | null
          is_active?: boolean | null
          last_name?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          store_ids?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          contact_number?: string | null
          created_at?: string | null
          custom_permissions?: Json | null
          email?: string | null
          first_name?: string | null
          id?: string | null
          is_active?: boolean | null
          last_name?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          store_ids?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      auth_rate_limits: {
        Row: {
          attempt_count: number | null
          blocked_until: string | null
          created_at: string | null
          first_attempt: string | null
          id: string
          identifier: string
          identifier_type: string
          last_attempt: string | null
        }
        Insert: {
          attempt_count?: number | null
          blocked_until?: string | null
          created_at?: string | null
          first_attempt?: string | null
          id?: string
          identifier: string
          identifier_type: string
          last_attempt?: string | null
        }
        Update: {
          attempt_count?: number | null
          blocked_until?: string | null
          created_at?: string | null
          first_attempt?: string | null
          id?: string
          identifier?: string
          identifier_type?: string
          last_attempt?: string | null
        }
        Relationships: []
      }
      bir_audit_logs: {
        Row: {
          cashier_name: string | null
          created_at: string
          event_data: Json
          event_name: string
          hash_value: string
          id: string
          ip_address: unknown | null
          log_type: string
          previous_hash: string | null
          receipt_number: string | null
          sequence_number: number
          store_id: string
          terminal_id: string | null
          transaction_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          cashier_name?: string | null
          created_at?: string
          event_data: Json
          event_name: string
          hash_value: string
          id?: string
          ip_address?: unknown | null
          log_type: string
          previous_hash?: string | null
          receipt_number?: string | null
          sequence_number: number
          store_id: string
          terminal_id?: string | null
          transaction_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          cashier_name?: string | null
          created_at?: string
          event_data?: Json
          event_name?: string
          hash_value?: string
          id?: string
          ip_address?: unknown | null
          log_type?: string
          previous_hash?: string | null
          receipt_number?: string | null
          sequence_number?: number
          store_id?: string
          terminal_id?: string | null
          transaction_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bir_audit_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "bir_audit_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      bir_cumulative_sales: {
        Row: {
          created_at: string
          grand_total_sales: number
          grand_total_transactions: number
          id: string
          last_receipt_number: string | null
          last_transaction_date: string | null
          store_id: string
          terminal_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          grand_total_sales?: number
          grand_total_transactions?: number
          id?: string
          last_receipt_number?: string | null
          last_transaction_date?: string | null
          store_id: string
          terminal_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          grand_total_sales?: number
          grand_total_transactions?: number
          id?: string
          last_receipt_number?: string | null
          last_transaction_date?: string | null
          store_id?: string
          terminal_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bir_cumulative_sales_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "bir_cumulative_sales_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      bir_ejournal: {
        Row: {
          backup_date: string | null
          beginning_receipt: string | null
          created_at: string
          ending_receipt: string | null
          gross_sales: number
          id: string
          is_backed_up: boolean | null
          journal_data: Json
          journal_date: string
          net_sales: number
          store_id: string
          terminal_id: string
          transaction_count: number
          vat_amount: number
          vat_exempt_sales: number
          vat_sales: number
          zero_rated_sales: number
        }
        Insert: {
          backup_date?: string | null
          beginning_receipt?: string | null
          created_at?: string
          ending_receipt?: string | null
          gross_sales?: number
          id?: string
          is_backed_up?: boolean | null
          journal_data: Json
          journal_date: string
          net_sales?: number
          store_id: string
          terminal_id: string
          transaction_count?: number
          vat_amount?: number
          vat_exempt_sales?: number
          vat_sales?: number
          zero_rated_sales?: number
        }
        Update: {
          backup_date?: string | null
          beginning_receipt?: string | null
          created_at?: string
          ending_receipt?: string | null
          gross_sales?: number
          id?: string
          is_backed_up?: boolean | null
          journal_data?: Json
          journal_date?: string
          net_sales?: number
          store_id?: string
          terminal_id?: string
          transaction_count?: number
          vat_amount?: number
          vat_exempt_sales?: number
          vat_sales?: number
          zero_rated_sales?: number
        }
        Relationships: [
          {
            foreignKeyName: "bir_ejournal_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "bir_ejournal_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_alerts: {
        Row: {
          alert_type: string
          budget_id: string
          created_at: string
          id: string
          notification_sent: boolean
          threshold_percentage: number
          updated_at: string
        }
        Insert: {
          alert_type: string
          budget_id: string
          created_at?: string
          id?: string
          notification_sent?: boolean
          threshold_percentage: number
          updated_at?: string
        }
        Update: {
          alert_type?: string
          budget_id?: string
          created_at?: string
          id?: string
          notification_sent?: boolean
          threshold_percentage?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_alerts_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "expense_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      cashiers: {
        Row: {
          contact_number: string | null
          created_at: string | null
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string
          store_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          contact_number?: string | null
          created_at?: string | null
          first_name: string
          id?: string
          is_active?: boolean | null
          last_name: string
          store_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          contact_number?: string | null
          created_at?: string | null
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_name?: string
          store_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cashiers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "cashiers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          store_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          store_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      categories_backup_reset: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          name: string | null
          store_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          name?: string | null
          store_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          name?: string | null
          store_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chart_of_accounts: {
        Row: {
          account_code: string
          account_name: string
          account_subtype: string | null
          account_type: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_system_account: boolean
          parent_account_id: string | null
          updated_at: string
        }
        Insert: {
          account_code: string
          account_name: string
          account_subtype?: string | null
          account_type: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system_account?: boolean
          parent_account_id?: string | null
          updated_at?: string
        }
        Update: {
          account_code?: string
          account_name?: string
          account_subtype?: string | null
          account_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system_account?: boolean
          parent_account_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      cleanup_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          new_id: string | null
          old_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          new_id?: string | null
          old_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          new_id?: string | null
          old_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      combo_pricing_rules: {
        Row: {
          base_category: string
          combo_category: string
          combo_price: number
          created_at: string
          discount_amount: number | null
          id: string
          is_active: boolean
          name: string
          priority: number | null
          updated_at: string
        }
        Insert: {
          base_category: string
          combo_category: string
          combo_price: number
          created_at?: string
          discount_amount?: number | null
          id?: string
          is_active?: boolean
          name: string
          priority?: number | null
          updated_at?: string
        }
        Update: {
          base_category?: string
          combo_category?: string
          combo_price?: number
          created_at?: string
          discount_amount?: number | null
          id?: string
          is_active?: boolean
          name?: string
          priority?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      commissary_inventory: {
        Row: {
          average_cost: number | null
          barcode: string | null
          category: string
          conversion_ratio: number | null
          created_at: string
          current_stock: number
          expiry_date: string | null
          id: string
          is_active: boolean
          item_price: number | null
          item_quantity: number | null
          item_type: string
          last_purchase_cost: number | null
          last_purchase_date: string | null
          minimum_threshold: number
          name: string
          normalized_unit: string | null
          order_quantity: number | null
          order_unit: string | null
          serving_quantity: number | null
          sku: string | null
          storage_location: string | null
          supplier_id: string | null
          unit: string
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          average_cost?: number | null
          barcode?: string | null
          category: string
          conversion_ratio?: number | null
          created_at?: string
          current_stock?: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          item_price?: number | null
          item_quantity?: number | null
          item_type?: string
          last_purchase_cost?: number | null
          last_purchase_date?: string | null
          minimum_threshold?: number
          name: string
          normalized_unit?: string | null
          order_quantity?: number | null
          order_unit?: string | null
          serving_quantity?: number | null
          sku?: string | null
          storage_location?: string | null
          supplier_id?: string | null
          unit: string
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          average_cost?: number | null
          barcode?: string | null
          category?: string
          conversion_ratio?: number | null
          created_at?: string
          current_stock?: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          item_price?: number | null
          item_quantity?: number | null
          item_type?: string
          last_purchase_cost?: number | null
          last_purchase_date?: string | null
          minimum_threshold?: number
          name?: string
          normalized_unit?: string | null
          order_quantity?: number | null
          order_unit?: string | null
          serving_quantity?: number | null
          sku?: string | null
          storage_location?: string | null
          supplier_id?: string | null
          unit?: string
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      commissary_purchases: {
        Row: {
          batch_number: string | null
          commissary_item_id: string
          created_at: string
          expiry_date: string | null
          id: string
          invoice_number: string | null
          notes: string | null
          purchase_date: string
          quantity_purchased: number
          recorded_by: string
          supplier_id: string | null
          total_cost: number
          unit_cost: number
          updated_at: string
        }
        Insert: {
          batch_number?: string | null
          commissary_item_id: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          purchase_date?: string
          quantity_purchased?: number
          recorded_by: string
          supplier_id?: string | null
          total_cost?: number
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          batch_number?: string | null
          commissary_item_id?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          purchase_date?: string
          quantity_purchased?: number
          recorded_by?: string
          supplier_id?: string | null
          total_cost?: number
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissary_purchases_commissary_item_id_fkey"
            columns: ["commissary_item_id"]
            isOneToOne: false
            referencedRelation: "commissary_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissary_purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      commissary_restock_fulfillments: {
        Row: {
          commissary_item_id: string
          created_at: string
          fulfilled_by: string
          id: string
          notes: string | null
          quantity_transferred: number
          restock_request_id: string
          store_id: string
          total_cost: number
          unit_cost: number
        }
        Insert: {
          commissary_item_id: string
          created_at?: string
          fulfilled_by: string
          id?: string
          notes?: string | null
          quantity_transferred?: number
          restock_request_id: string
          store_id: string
          total_cost?: number
          unit_cost?: number
        }
        Update: {
          commissary_item_id?: string
          created_at?: string
          fulfilled_by?: string
          id?: string
          notes?: string | null
          quantity_transferred?: number
          restock_request_id?: string
          store_id?: string
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "commissary_restock_fulfillments_commissary_item_id_fkey"
            columns: ["commissary_item_id"]
            isOneToOne: false
            referencedRelation: "commissary_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissary_restock_fulfillments_fulfilled_by_fkey"
            columns: ["fulfilled_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "commissary_restock_fulfillments_restock_request_id_fkey"
            columns: ["restock_request_id"]
            isOneToOne: false
            referencedRelation: "commissary_restock_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissary_restock_fulfillments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "commissary_restock_fulfillments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      commissary_restock_requests: {
        Row: {
          approved_by: string | null
          approved_quantity: number | null
          commissary_item_id: string
          created_at: string
          fulfilled_at: string | null
          fulfilled_by: string | null
          id: string
          justification: string | null
          priority: string
          requested_by: string
          requested_quantity: number
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          approved_quantity?: number | null
          commissary_item_id: string
          created_at?: string
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          id?: string
          justification?: string | null
          priority?: string
          requested_by: string
          requested_quantity?: number
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          approved_quantity?: number | null
          commissary_item_id?: string
          created_at?: string
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          id?: string
          justification?: string | null
          priority?: string
          requested_by?: string
          requested_quantity?: number
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissary_restock_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "commissary_restock_requests_commissary_item_id_fkey"
            columns: ["commissary_item_id"]
            isOneToOne: false
            referencedRelation: "commissary_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissary_restock_requests_fulfilled_by_fkey"
            columns: ["fulfilled_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "commissary_restock_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "commissary_restock_requests_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "commissary_restock_requests_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      conversion_mappings: {
        Row: {
          conversion_factor: number
          created_at: string | null
          id: string
          inventory_stock_id: string
          is_active: boolean | null
          notes: string | null
          recipe_ingredient_name: string
          recipe_ingredient_unit: string
          updated_at: string | null
        }
        Insert: {
          conversion_factor?: number
          created_at?: string | null
          id?: string
          inventory_stock_id: string
          is_active?: boolean | null
          notes?: string | null
          recipe_ingredient_name: string
          recipe_ingredient_unit: string
          updated_at?: string | null
        }
        Update: {
          conversion_factor?: number
          created_at?: string | null
          id?: string
          inventory_stock_id?: string
          is_active?: boolean | null
          notes?: string | null
          recipe_ingredient_name?: string
          recipe_ingredient_unit?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          loyalty_points: number | null
          name: string
          phone: string
          store_id: string | null
          tin: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          loyalty_points?: number | null
          name: string
          phone: string
          store_id?: string | null
          tin?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          loyalty_points?: number | null
          name?: string
          phone?: string
          store_id?: string | null
          tin?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      damage_audit_trail: {
        Row: {
          action: string
          created_at: string
          damage_id: string
          details: string | null
          id: string
          performed_by: string
        }
        Insert: {
          action: string
          created_at?: string
          damage_id: string
          details?: string | null
          id?: string
          performed_by: string
        }
        Update: {
          action?: string
          created_at?: string
          damage_id?: string
          details?: string | null
          id?: string
          performed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "damage_audit_trail_damage_id_fkey"
            columns: ["damage_id"]
            isOneToOne: false
            referencedRelation: "damaged_goods"
            referencedColumns: ["id"]
          },
        ]
      }
      damaged_goods: {
        Row: {
          created_at: string
          damage_category: string
          damage_reason: string
          damaged_quantity: number
          disposition: string
          disposition_notes: string | null
          financial_impact: number
          grn_id: string
          id: string
          item_id: string
          item_name: string
          photos: string[] | null
          recorded_by: string
          supplier_id: string | null
          unit_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          damage_category: string
          damage_reason: string
          damaged_quantity?: number
          disposition?: string
          disposition_notes?: string | null
          financial_impact?: number
          grn_id: string
          id?: string
          item_id: string
          item_name: string
          photos?: string[] | null
          recorded_by: string
          supplier_id?: string | null
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          damage_category?: string
          damage_reason?: string
          damaged_quantity?: number
          disposition?: string
          disposition_notes?: string | null
          financial_impact?: number
          grn_id?: string
          id?: string
          item_id?: string
          item_name?: string
          photos?: string[] | null
          recorded_by?: string
          supplier_id?: string | null
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "damaged_goods_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "goods_received_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "damaged_goods_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_orders: {
        Row: {
          actual_delivery_date: string | null
          created_at: string | null
          delivery_notes: string | null
          delivery_number: string
          id: string
          purchase_order_id: string
          scheduled_delivery_date: string | null
          status: Database["public"]["Enums"]["delivery_order_status"] | null
          updated_at: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          created_at?: string | null
          delivery_notes?: string | null
          delivery_number: string
          id?: string
          purchase_order_id: string
          scheduled_delivery_date?: string | null
          status?: Database["public"]["Enums"]["delivery_order_status"] | null
          updated_at?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          created_at?: string | null
          delivery_notes?: string | null
          delivery_number?: string
          id?: string
          purchase_order_id?: string
          scheduled_delivery_date?: string | null
          status?: Database["public"]["Enums"]["delivery_order_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_orders_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_approval_limits: {
        Row: {
          created_at: string | null
          id: string
          max_amount: number
          role: string
          store_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_amount: number
          role: string
          store_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          max_amount?: number
          role?: string
          store_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_approval_limits_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "expense_approval_limits_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_approvals: {
        Row: {
          approval_level: number
          approved_at: string | null
          approver_id: string
          comments: string | null
          created_at: string | null
          expense_id: string
          id: string
          status: string
        }
        Insert: {
          approval_level: number
          approved_at?: string | null
          approver_id: string
          comments?: string | null
          created_at?: string | null
          expense_id: string
          id?: string
          status: string
        }
        Update: {
          approval_level?: number
          approved_at?: string | null
          approver_id?: string
          comments?: string | null
          created_at?: string | null
          expense_id?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_approvals_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_audit_trail: {
        Row: {
          action: string
          changed_fields: string[] | null
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          new_values: Json | null
          old_values: Json | null
          reason: string | null
          store_id: string | null
          user_id: string
          user_name: string | null
          user_role: string | null
        }
        Insert: {
          action: string
          changed_fields?: string[] | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
          store_id?: string | null
          user_id: string
          user_name?: string | null
          user_role?: string | null
        }
        Update: {
          action?: string
          changed_fields?: string[] | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
          store_id?: string | null
          user_id?: string
          user_name?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_audit_trail_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "expense_audit_trail_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_budgets: {
        Row: {
          allocated_amount: number
          budget_month: number | null
          budget_period: string
          budget_quarter: number | null
          budget_year: number
          category_id: string
          created_at: string | null
          created_by: string
          id: string
          spent_amount: number | null
          store_id: string
          updated_at: string | null
        }
        Insert: {
          allocated_amount?: number
          budget_month?: number | null
          budget_period: string
          budget_quarter?: number | null
          budget_year: number
          category_id: string
          created_at?: string | null
          created_by: string
          id?: string
          spent_amount?: number | null
          store_id: string
          updated_at?: string | null
        }
        Update: {
          allocated_amount?: number
          budget_month?: number | null
          budget_period?: string
          budget_quarter?: number | null
          budget_year?: number
          category_id?: string
          created_at?: string | null
          created_by?: string
          id?: string
          spent_amount?: number | null
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_budgets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "expense_budgets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_category_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_category_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_category_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          approval_level: number | null
          approved_at: string | null
          approved_by: string | null
          category_id: string
          created_at: string | null
          created_by: string
          description: string
          expense_date: string
          id: string
          receipt_url: string | null
          rejection_reason: string | null
          status: string | null
          store_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          approval_level?: number | null
          approved_at?: string | null
          approved_by?: string | null
          category_id: string
          created_at?: string | null
          created_by: string
          description: string
          expense_date?: string
          id?: string
          receipt_url?: string | null
          rejection_reason?: string | null
          status?: string | null
          store_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          approval_level?: number | null
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string
          created_at?: string | null
          created_by?: string
          description?: string
          expense_date?: string
          id?: string
          receipt_url?: string | null
          rejection_reason?: string | null
          status?: string | null
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "expenses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_adjustments: {
        Row: {
          adjustment_date: string
          adjustment_type: string
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          credit_account_id: string
          debit_account_id: string
          description: string
          id: string
          journal_entry_id: string | null
          store_id: string | null
          updated_at: string
        }
        Insert: {
          adjustment_date?: string
          adjustment_type: string
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by: string
          credit_account_id: string
          debit_account_id: string
          description: string
          id?: string
          journal_entry_id?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          adjustment_date?: string
          adjustment_type?: string
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          credit_account_id?: string
          debit_account_id?: string
          description?: string
          id?: string
          journal_entry_id?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_adjustments_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_adjustments_debit_account_id_fkey"
            columns: ["debit_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_adjustments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_adjustments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "financial_adjustments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          end_date: string
          id: string
          is_closed: boolean
          period_month: number
          period_name: string
          period_year: number
          start_date: string
          store_id: string | null
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          end_date: string
          id?: string
          is_closed?: boolean
          period_month: number
          period_name: string
          period_year: number
          start_date: string
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          end_date?: string
          id?: string
          is_closed?: boolean
          period_month?: number
          period_name?: string
          period_year?: number
          start_date?: string
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_periods_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "fiscal_periods_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      fulfillment_modifications: {
        Row: {
          approval_notes: string | null
          approved_by: string | null
          created_at: string
          fulfillment_id: string
          id: string
          justification: string | null
          modification_type: string
          new_data: Json
          original_data: Json | null
          processed_at: string | null
          requested_at: string
          requested_by: string
          status: string
          updated_at: string
        }
        Insert: {
          approval_notes?: string | null
          approved_by?: string | null
          created_at?: string
          fulfillment_id: string
          id?: string
          justification?: string | null
          modification_type: string
          new_data: Json
          original_data?: Json | null
          processed_at?: string | null
          requested_at?: string
          requested_by: string
          status?: string
          updated_at?: string
        }
        Update: {
          approval_notes?: string | null
          approved_by?: string | null
          created_at?: string
          fulfillment_id?: string
          id?: string
          justification?: string | null
          modification_type?: string
          new_data?: Json
          original_data?: Json | null
          processed_at?: string | null
          requested_at?: string
          requested_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fulfillment_modifications_fulfillment_id_fkey"
            columns: ["fulfillment_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_fulfillments"
            referencedColumns: ["id"]
          },
        ]
      }
      general_ledger: {
        Row: {
          account_id: string
          created_at: string | null
          credit_amount: number | null
          debit_amount: number | null
          description: string
          fiscal_period: string | null
          id: string
          journal_entry_line_id: string
          reference_number: string | null
          running_balance: number | null
          store_id: string | null
          transaction_date: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          description: string
          fiscal_period?: string | null
          id?: string
          journal_entry_line_id: string
          reference_number?: string | null
          running_balance?: number | null
          store_id?: string | null
          transaction_date: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string
          fiscal_period?: string | null
          id?: string
          journal_entry_line_id?: string
          reference_number?: string | null
          running_balance?: number | null
          store_id?: string | null
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "general_ledger_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_ledger_journal_entry_line_id_fkey"
            columns: ["journal_entry_line_id"]
            isOneToOne: false
            referencedRelation: "journal_entry_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_ledger_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "general_ledger_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_received_notes: {
        Row: {
          created_at: string | null
          digital_signature: string | null
          grn_number: string
          id: string
          purchase_order_id: string
          quality_check_passed: boolean | null
          received_at: string | null
          received_by: string
          remarks: string | null
        }
        Insert: {
          created_at?: string | null
          digital_signature?: string | null
          grn_number: string
          id?: string
          purchase_order_id: string
          quality_check_passed?: boolean | null
          received_at?: string | null
          received_by: string
          remarks?: string | null
        }
        Update: {
          created_at?: string | null
          digital_signature?: string | null
          grn_number?: string
          id?: string
          purchase_order_id?: string
          quality_check_passed?: boolean | null
          received_at?: string | null
          received_by?: string
          remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goods_received_notes_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: true
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      grn_discrepancy_resolutions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          created_at: string | null
          financial_adjustment: number | null
          grn_id: string
          id: string
          processed_by: string | null
          purchase_order_id: string
          resolution_notes: string | null
          resolution_status: string
          resolution_type: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          financial_adjustment?: number | null
          grn_id: string
          id?: string
          processed_by?: string | null
          purchase_order_id: string
          resolution_notes?: string | null
          resolution_status?: string
          resolution_type: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          financial_adjustment?: number | null
          grn_id?: string
          id?: string
          processed_by?: string | null
          purchase_order_id?: string
          resolution_notes?: string | null
          resolution_status?: string
          resolution_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grn_discrepancy_resolutions_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "goods_received_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_discrepancy_resolutions_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      grn_items: {
        Row: {
          created_at: string | null
          grn_id: string
          id: string
          item_remarks: string | null
          ordered_quantity: number
          purchase_order_item_id: string
          quality_status: string | null
          received_quantity: number
        }
        Insert: {
          created_at?: string | null
          grn_id: string
          id?: string
          item_remarks?: string | null
          ordered_quantity: number
          purchase_order_item_id: string
          quality_status?: string | null
          received_quantity: number
        }
        Update: {
          created_at?: string | null
          grn_id?: string
          id?: string
          item_remarks?: string | null
          ordered_quantity?: number
          purchase_order_item_id?: string
          quality_status?: string | null
          received_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "grn_items_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "goods_received_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_items_purchase_order_item_id_fkey"
            columns: ["purchase_order_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient_category_mappings: {
        Row: {
          created_at: string | null
          expected_categories: string[]
          id: string
          ingredient_pattern: string
          priority: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expected_categories: string[]
          id?: string
          ingredient_pattern: string
          priority?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expected_categories?: string[]
          id?: string
          ingredient_pattern?: string
          priority?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ingredient_unit_conversions: {
        Row: {
          conversion_factor: number
          created_at: string | null
          from_unit: string
          id: string
          ingredient_name: string
          notes: string | null
          to_unit: string
          updated_at: string | null
        }
        Insert: {
          conversion_factor: number
          created_at?: string | null
          from_unit: string
          id?: string
          ingredient_name: string
          notes?: string | null
          to_unit: string
          updated_at?: string | null
        }
        Update: {
          conversion_factor?: number
          created_at?: string | null
          from_unit?: string
          id?: string
          ingredient_name?: string
          notes?: string | null
          to_unit?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_audit_log: {
        Row: {
          created_at: string
          id: string
          items_processed: number
          metadata: Json | null
          operation_type: string
          status: string
          transaction_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          items_processed?: number
          metadata?: Json | null
          operation_type: string
          status: string
          transaction_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          items_processed?: number
          metadata?: Json | null
          operation_type?: string
          status?: string
          transaction_id?: string | null
        }
        Relationships: []
      }
      inventory_conversions: {
        Row: {
          commissary_item_id: string | null
          conversion_date: string
          conversion_recipe_id: string | null
          converted_by: string
          created_at: string
          finished_goods_quantity: number
          id: string
          inventory_stock_id: string
          notes: string | null
          store_id: string
        }
        Insert: {
          commissary_item_id?: string | null
          conversion_date?: string
          conversion_recipe_id?: string | null
          converted_by: string
          created_at?: string
          finished_goods_quantity: number
          id?: string
          inventory_stock_id: string
          notes?: string | null
          store_id: string
        }
        Update: {
          commissary_item_id?: string | null
          conversion_date?: string
          conversion_recipe_id?: string | null
          converted_by?: string
          created_at?: string
          finished_goods_quantity?: number
          id?: string
          inventory_stock_id?: string
          notes?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_conversions_commissary_item_id_fkey"
            columns: ["commissary_item_id"]
            isOneToOne: false
            referencedRelation: "commissary_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_conversions_inventory_stock_id_fkey"
            columns: ["inventory_stock_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_deduction_logs: {
        Row: {
          conversion_factor: number | null
          created_at: string | null
          deduction_status: string | null
          error_message: string | null
          id: string
          ingredient_name: string
          inventory_quantity_deducted: number
          inventory_stock_id: string
          new_stock: number
          previous_stock: number
          recipe_id: string
          recipe_quantity_needed: number
          transaction_id: string
        }
        Insert: {
          conversion_factor?: number | null
          created_at?: string | null
          deduction_status?: string | null
          error_message?: string | null
          id?: string
          ingredient_name: string
          inventory_quantity_deducted: number
          inventory_stock_id: string
          new_stock: number
          previous_stock: number
          recipe_id: string
          recipe_quantity_needed: number
          transaction_id: string
        }
        Update: {
          conversion_factor?: number | null
          created_at?: string | null
          deduction_status?: string | null
          error_message?: string | null
          id?: string
          ingredient_name?: string
          inventory_quantity_deducted?: number
          inventory_stock_id?: string
          new_stock?: number
          previous_stock?: number
          recipe_id?: string
          recipe_quantity_needed?: number
          transaction_id?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          barcode: string | null
          category: Database["public"]["Enums"]["inventory_category"]
          created_at: string
          current_stock: number
          expiry_date: string | null
          id: string
          is_active: boolean | null
          last_updated: string
          minimum_threshold: number
          name: string
          sku: string | null
          store_id: string
          supplier_id: string | null
          unit: Database["public"]["Enums"]["inventory_unit"]
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category: Database["public"]["Enums"]["inventory_category"]
          created_at?: string
          current_stock?: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          last_updated?: string
          minimum_threshold?: number
          name: string
          sku?: string | null
          store_id: string
          supplier_id?: string | null
          unit: Database["public"]["Enums"]["inventory_unit"]
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category?: Database["public"]["Enums"]["inventory_category"]
          created_at?: string
          current_stock?: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          last_updated?: string
          minimum_threshold?: number
          name?: string
          sku?: string | null
          store_id?: string
          supplier_id?: string | null
          unit?: Database["public"]["Enums"]["inventory_unit"]
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "inventory_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          inventory_stock_id: string
          movement_type: string
          new_quantity: number
          notes: string | null
          previous_quantity: number
          quantity_change: number
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          inventory_stock_id: string
          movement_type: string
          new_quantity: number
          notes?: string | null
          previous_quantity: number
          quantity_change: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          inventory_stock_id?: string
          movement_type?: string
          new_quantity?: number
          notes?: string | null
          previous_quantity?: number
          quantity_change?: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_inventory_stock_id_fkey"
            columns: ["inventory_stock_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_stock: {
        Row: {
          conversion_ratio: number | null
          cost: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_fractional_supported: boolean | null
          item: string
          item_category:
            | Database["public"]["Enums"]["inventory_item_category"]
            | null
          minimum_threshold: number | null
          normalized_unit: string | null
          order_quantity: number | null
          order_unit: string | null
          recipe_compatible: boolean | null
          serving_ready_quantity: number | null
          sku: string | null
          stock_quantity: number
          store_id: string
          unit: string
          updated_at: string | null
        }
        Insert: {
          conversion_ratio?: number | null
          cost?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_fractional_supported?: boolean | null
          item: string
          item_category?:
            | Database["public"]["Enums"]["inventory_item_category"]
            | null
          minimum_threshold?: number | null
          normalized_unit?: string | null
          order_quantity?: number | null
          order_unit?: string | null
          recipe_compatible?: boolean | null
          serving_ready_quantity?: number | null
          sku?: string | null
          stock_quantity?: number
          store_id: string
          unit: string
          updated_at?: string | null
        }
        Update: {
          conversion_ratio?: number | null
          cost?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_fractional_supported?: boolean | null
          item?: string
          item_category?:
            | Database["public"]["Enums"]["inventory_item_category"]
            | null
          minimum_threshold?: number | null
          normalized_unit?: string | null
          order_quantity?: number | null
          order_unit?: string | null
          recipe_compatible?: boolean | null
          serving_ready_quantity?: number | null
          sku?: string | null
          stock_quantity?: number
          store_id?: string
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_stock_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "inventory_stock_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_stock_backup: {
        Row: {
          conversion_ratio: number | null
          cost: number | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          is_fractional_supported: boolean | null
          item: string | null
          item_category:
            | Database["public"]["Enums"]["inventory_item_category"]
            | null
          minimum_threshold: number | null
          normalized_unit: string | null
          order_quantity: number | null
          order_unit: string | null
          recipe_compatible: boolean | null
          serving_ready_quantity: number | null
          sku: string | null
          stock_quantity: number | null
          store_id: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          conversion_ratio?: number | null
          cost?: number | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          is_fractional_supported?: boolean | null
          item?: string | null
          item_category?:
            | Database["public"]["Enums"]["inventory_item_category"]
            | null
          minimum_threshold?: number | null
          normalized_unit?: string | null
          order_quantity?: number | null
          order_unit?: string | null
          recipe_compatible?: boolean | null
          serving_ready_quantity?: number | null
          sku?: string | null
          stock_quantity?: number | null
          store_id?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          conversion_ratio?: number | null
          cost?: number | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          is_fractional_supported?: boolean | null
          item?: string | null
          item_category?:
            | Database["public"]["Enums"]["inventory_item_category"]
            | null
          minimum_threshold?: number | null
          normalized_unit?: string | null
          order_quantity?: number | null
          order_unit?: string | null
          recipe_compatible?: boolean | null
          serving_ready_quantity?: number | null
          sku?: string | null
          stock_quantity?: number | null
          store_id?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_sync_audit: {
        Row: {
          affected_inventory_items: Json | null
          created_at: string | null
          error_details: string | null
          id: string
          items_processed: number | null
          resolved_at: string | null
          resolved_by: string | null
          sync_duration_ms: number | null
          sync_status: string
          transaction_id: string
        }
        Insert: {
          affected_inventory_items?: Json | null
          created_at?: string | null
          error_details?: string | null
          id?: string
          items_processed?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          sync_duration_ms?: number | null
          sync_status: string
          transaction_id: string
        }
        Update: {
          affected_inventory_items?: Json | null
          created_at?: string | null
          error_details?: string | null
          id?: string
          items_processed?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          sync_duration_ms?: number | null
          sync_status?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_sync_audit_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "inventory_sync_audit_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          new_quantity: number
          notes: string | null
          previous_quantity: number
          product_id: string
          quantity: number
          reference_id: string | null
          store_id: string
          transaction_type: string
          variation_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          new_quantity: number
          notes?: string | null
          previous_quantity: number
          product_id: string
          quantity: number
          reference_id?: string | null
          store_id: string
          transaction_type: string
          variation_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          new_quantity?: number
          notes?: string | null
          previous_quantity?: number
          product_id?: string
          quantity?: number
          reference_id?: string | null
          store_id?: string
          transaction_type?: string
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "inventory_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          description: string
          entry_date: string
          entry_number: string | null
          fiscal_period: string | null
          id: string
          is_adjusting_entry: boolean | null
          is_closing_entry: boolean | null
          is_posted: boolean
          journal_number: string
          notes: string | null
          posted_at: string | null
          posted_by: string | null
          reference_id: string | null
          reference_type: string | null
          reversal_entry_id: string | null
          source_document_id: string | null
          source_document_type: string | null
          status: string | null
          store_id: string | null
          total_credit: number
          total_debit: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by: string
          description: string
          entry_date?: string
          entry_number?: string | null
          fiscal_period?: string | null
          id?: string
          is_adjusting_entry?: boolean | null
          is_closing_entry?: boolean | null
          is_posted?: boolean
          journal_number: string
          notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          reversal_entry_id?: string | null
          source_document_id?: string | null
          source_document_type?: string | null
          status?: string | null
          store_id?: string | null
          total_credit?: number
          total_debit?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          description?: string
          entry_date?: string
          entry_number?: string | null
          fiscal_period?: string | null
          id?: string
          is_adjusting_entry?: boolean | null
          is_closing_entry?: boolean | null
          is_posted?: boolean
          journal_number?: string
          notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          reversal_entry_id?: string | null
          source_document_id?: string | null
          source_document_type?: string | null
          status?: string | null
          store_id?: string | null
          total_credit?: number
          total_debit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_reversal_entry_id_fkey"
            columns: ["reversal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "journal_entries_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          created_at: string
          credit_amount: number
          debit_amount: number
          description: string | null
          id: string
          journal_entry_id: string
          line_number: number
        }
        Insert: {
          account_id: string
          created_at?: string
          credit_amount?: number
          debit_amount?: number
          description?: string | null
          id?: string
          journal_entry_id: string
          line_number: number
        }
        Update: {
          account_id?: string
          created_at?: string
          credit_amount?: number
          debit_amount?: number
          description?: string | null
          id?: string
          journal_entry_id?: string
          line_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      managers: {
        Row: {
          contact_number: string | null
          created_at: string | null
          email: string | null
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string
          store_ids: string[]
          updated_at: string | null
        }
        Insert: {
          contact_number?: string | null
          created_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          is_active?: boolean | null
          last_name: string
          store_ids?: string[]
          updated_at?: string | null
        }
        Update: {
          contact_number?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_name?: string
          store_ids?: string[]
          updated_at?: string | null
        }
        Relationships: []
      }
      order_audit_trail: {
        Row: {
          action: string
          change_reason: string | null
          changed_by: string
          created_at: string | null
          id: string
          new_status: string | null
          old_status: string | null
          order_id: string
          order_type: string
        }
        Insert: {
          action: string
          change_reason?: string | null
          changed_by: string
          created_at?: string | null
          id?: string
          new_status?: string | null
          old_status?: string | null
          order_id: string
          order_type: string
        }
        Update: {
          action?: string
          change_reason?: string | null
          changed_by?: string
          created_at?: string | null
          id?: string
          new_status?: string | null
          old_status?: string | null
          order_id?: string
          order_type?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string
          order_id: string
          quantity: number
          received_quantity: number | null
          total_cost: number | null
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id: string
          order_id: string
          quantity: number
          received_quantity?: number | null
          total_cost?: number | null
          unit_cost: number
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string
          order_id?: string
          quantity?: number
          received_quantity?: number | null
          total_cost?: number | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          change_reason: string | null
          changed_at: string | null
          changed_by: string
          id: string
          new_status: string
          old_status: string | null
          transaction_id: string
        }
        Insert: {
          change_reason?: string | null
          changed_at?: string | null
          changed_by: string
          id?: string
          new_status: string
          old_status?: string | null
          transaction_id: string
        }
        Update: {
          change_reason?: string | null
          changed_at?: string | null
          changed_by?: string
          id?: string
          new_status?: string
          old_status?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          approved_by: string | null
          created_at: string
          created_by: string
          expected_delivery_date: string | null
          id: string
          notes: string | null
          order_number: string
          ordered_date: string | null
          received_date: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          store_id: string
          supplier_id: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          created_by: string
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_number: string
          ordered_date?: string | null
          received_date?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          store_id: string
          supplier_id: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          created_by?: string
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          ordered_date?: string | null
          received_date?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          store_id?: string
          supplier_id?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_add_ons: {
        Row: {
          category: string
          cost_per_unit: number | null
          created_at: string
          display_order: number | null
          id: string
          is_available: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          category: string
          cost_per_unit?: number | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_available?: boolean
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          category?: string
          cost_per_unit?: number | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_available?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_addon_items: {
        Row: {
          addon_category_id: string | null
          category: string
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_available: boolean
          is_premium: boolean | null
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          addon_category_id?: string | null
          category: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_available?: boolean
          is_premium?: boolean | null
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          addon_category_id?: string | null
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_available?: boolean
          is_premium?: boolean | null
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_addon_items_addon_category_id_fkey"
            columns: ["addon_category_id"]
            isOneToOne: false
            referencedRelation: "addon_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_bundle_components: {
        Row: {
          bundle_id: string
          commissary_item_id: string
          created_at: string | null
          id: string
          quantity: number
          unit: string
        }
        Insert: {
          bundle_id: string
          commissary_item_id: string
          created_at?: string | null
          id?: string
          quantity?: number
          unit: string
        }
        Update: {
          bundle_id?: string
          commissary_item_id?: string
          created_at?: string | null
          id?: string
          quantity?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_bundle_components_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "product_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_bundle_components_commissary_item_id_fkey"
            columns: ["commissary_item_id"]
            isOneToOne: false
            referencedRelation: "commissary_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      product_bundles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          total_price: number
          unit_description: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          total_price?: number
          unit_description?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          total_price?: number
          unit_description?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      product_catalog: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_available: boolean
          price: number
          product_name: string
          product_status: string | null
          product_type: string | null
          recipe_id: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          price?: number
          product_name: string
          product_status?: string | null
          product_type?: string | null
          recipe_id?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          price?: number
          product_name?: string
          product_status?: string | null
          product_type?: string | null
          recipe_id?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_catalog_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_catalog_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_usage_analytics"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "product_catalog_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_catalog_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "product_catalog_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_catalog_variations: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          is_available: boolean
          is_default: boolean
          name: string
          price_modifier: number
          product_catalog_id: string
          updated_at: string
          variation_type: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_available?: boolean
          is_default?: boolean
          name: string
          price_modifier?: number
          product_catalog_id: string
          updated_at?: string
          variation_type: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_available?: boolean
          is_default?: boolean
          name?: string
          price_modifier?: number
          product_catalog_id?: string
          updated_at?: string
          variation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_catalog_variations_product_catalog_id_fkey"
            columns: ["product_catalog_id"]
            isOneToOne: false
            referencedRelation: "product_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      product_combo_rules: {
        Row: {
          base_item_category: string
          combo_item_category: string
          combo_price: number
          created_at: string
          discount_amount: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          base_item_category: string
          combo_item_category: string
          combo_price?: number
          created_at?: string
          discount_amount?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          base_item_category?: string
          combo_item_category?: string
          combo_price?: number
          created_at?: string
          discount_amount?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_ingredients: {
        Row: {
          commissary_item_id: string | null
          created_at: string
          id: string
          inventory_stock_id: string
          product_catalog_id: string
          required_quantity: number
          unit: string
        }
        Insert: {
          commissary_item_id?: string | null
          created_at?: string
          id?: string
          inventory_stock_id: string
          product_catalog_id: string
          required_quantity?: number
          unit: string
        }
        Update: {
          commissary_item_id?: string | null
          created_at?: string
          id?: string
          inventory_stock_id?: string
          product_catalog_id?: string
          required_quantity?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_ingredients_commissary_item_id_fkey"
            columns: ["commissary_item_id"]
            isOneToOne: false
            referencedRelation: "commissary_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ingredients_inventory_stock_id_fkey"
            columns: ["inventory_stock_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ingredients_product_catalog_id_fkey"
            columns: ["product_catalog_id"]
            isOneToOne: false
            referencedRelation: "product_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variations: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          product_id: string
          size: string | null
          sku: string
          stock_quantity: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number
          product_id: string
          size?: string | null
          sku: string
          stock_quantity?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          product_id?: string
          size?: string | null
          sku?: string
          stock_quantity?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category_id: string | null
          combo_add_on: string | null
          combo_main: string | null
          cost: number | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          inventory_stock_id: string | null
          is_active: boolean | null
          name: string
          price: number
          product_type: string | null
          recipe_id: string | null
          selling_quantity: number | null
          sku: string
          stock_quantity: number
          store_id: string
          updated_at: string | null
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          combo_add_on?: string | null
          combo_main?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          inventory_stock_id?: string | null
          is_active?: boolean | null
          name: string
          price?: number
          product_type?: string | null
          recipe_id?: string | null
          selling_quantity?: number | null
          sku: string
          stock_quantity?: number
          store_id: string
          updated_at?: string | null
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          combo_add_on?: string | null
          combo_main?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          inventory_stock_id?: string | null
          is_active?: boolean | null
          name?: string
          price?: number
          product_type?: string | null
          recipe_id?: string | null
          selling_quantity?: number | null
          sku?: string
          stock_quantity?: number
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_category"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_inventory_stock_id_fkey"
            columns: ["inventory_stock_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_fulfillment_items: {
        Row: {
          created_at: string
          fulfilled_quantity: number
          fulfillment_id: string
          id: string
          notes: string | null
          ordered_quantity: number
          purchase_order_item_id: string
          status: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          fulfilled_quantity?: number
          fulfillment_id: string
          id?: string
          notes?: string | null
          ordered_quantity: number
          purchase_order_item_id: string
          status?: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          fulfilled_quantity?: number
          fulfillment_id?: string
          id?: string
          notes?: string | null
          ordered_quantity?: number
          purchase_order_item_id?: string
          status?: string
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_fulfillment_items_fulfillment_id_fkey"
            columns: ["fulfillment_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_fulfillments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_fulfillment_items_purchase_order_item_id_fkey"
            columns: ["purchase_order_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_fulfillments: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          fulfillment_number: string
          id: string
          notes: string | null
          purchase_order_id: string
          started_at: string
          started_by: string
          status: string
          total_fulfilled_items: number | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          fulfillment_number: string
          id?: string
          notes?: string | null
          purchase_order_id: string
          started_at?: string
          started_by: string
          status?: string
          total_fulfilled_items?: number | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          fulfillment_number?: string
          id?: string
          notes?: string | null
          purchase_order_id?: string
          started_at?: string
          started_by?: string
          status?: string
          total_fulfilled_items?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_fulfillments_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string | null
          id: string
          inventory_stock_id: string | null
          purchase_order_id: string
          quantity: number
          specifications: string | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          inventory_stock_id?: string | null
          purchase_order_id: string
          quantity: number
          specifications?: string | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          inventory_stock_id?: string | null
          purchase_order_id?: string
          quantity?: number
          specifications?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_inventory_stock_id_fkey"
            columns: ["inventory_stock_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items_backup: {
        Row: {
          created_at: string | null
          id: string | null
          inventory_stock_id: string | null
          purchase_order_id: string | null
          quantity: number | null
          specifications: string | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          inventory_stock_id?: string | null
          purchase_order_id?: string | null
          quantity?: number | null
          specifications?: string | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          inventory_stock_id?: string | null
          purchase_order_id?: string | null
          quantity?: number | null
          specifications?: string | null
          unit_price?: number | null
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string
          delivery_notes: string | null
          delivery_scheduled_date: string | null
          fulfilled_at: string | null
          fulfilled_by: string | null
          id: string
          notes: string | null
          order_number: string
          requested_delivery_date: string | null
          status: Database["public"]["Enums"]["purchase_order_status"] | null
          store_id: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by: string
          delivery_notes?: string | null
          delivery_scheduled_date?: string | null
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          id?: string
          notes?: string | null
          order_number: string
          requested_delivery_date?: string | null
          status?: Database["public"]["Enums"]["purchase_order_status"] | null
          store_id: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string
          delivery_notes?: string | null
          delivery_scheduled_date?: string | null
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          requested_delivery_date?: string | null
          status?: Database["public"]["Enums"]["purchase_order_status"] | null
          store_id?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "purchase_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_choice_groups: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          group_name: string
          group_type: string
          id: string
          recipe_template_id: string
          selection_max: number | null
          selection_min: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          group_name: string
          group_type?: string
          id?: string
          recipe_template_id: string
          selection_max?: number | null
          selection_min?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          group_name?: string
          group_type?: string
          id?: string
          recipe_template_id?: string
          selection_max?: number | null
          selection_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_choice_groups_recipe_template_id_fkey"
            columns: ["recipe_template_id"]
            isOneToOne: false
            referencedRelation: "recipe_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_components: {
        Row: {
          component_recipe_id: string | null
          component_type: string | null
          created_at: string | null
          id: string
          is_required: boolean | null
          parent_recipe_id: string | null
          quantity: number | null
        }
        Insert: {
          component_recipe_id?: string | null
          component_type?: string | null
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          parent_recipe_id?: string | null
          quantity?: number | null
        }
        Update: {
          component_recipe_id?: string | null
          component_type?: string | null
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          parent_recipe_id?: string | null
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_components_component_recipe_id_fkey"
            columns: ["component_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_components_parent_recipe_id_fkey"
            columns: ["parent_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_deployment_errors: {
        Row: {
          created_at: string | null
          deployment_id: string | null
          error_details: Json | null
          error_message: string
          error_type: string
          id: string
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          store_id: string
          template_id: string
        }
        Insert: {
          created_at?: string | null
          deployment_id?: string | null
          error_details?: Json | null
          error_message: string
          error_type: string
          id?: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          store_id: string
          template_id: string
        }
        Update: {
          created_at?: string | null
          deployment_id?: string | null
          error_details?: Json | null
          error_message?: string
          error_type?: string
          id?: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          store_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_deployment_errors_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "recipe_deployments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_deployment_errors_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "recipe_deployment_errors_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_deployment_errors_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "recipe_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_deployment_logs: {
        Row: {
          created_at: string | null
          deployed_by: string | null
          deployment_status: string
          id: string
          product_id: string | null
          recipe_id: string | null
          step_details: Json | null
          store_id: string | null
          template_id: string | null
        }
        Insert: {
          created_at?: string | null
          deployed_by?: string | null
          deployment_status: string
          id?: string
          product_id?: string | null
          recipe_id?: string | null
          step_details?: Json | null
          store_id?: string | null
          template_id?: string | null
        }
        Update: {
          created_at?: string | null
          deployed_by?: string | null
          deployment_status?: string
          id?: string
          product_id?: string | null
          recipe_id?: string | null
          step_details?: Json | null
          store_id?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_deployment_logs_deployed_by_fkey"
            columns: ["deployed_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "recipe_deployment_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_deployment_logs_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_usage_analytics"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipe_deployment_logs_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_deployment_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "recipe_deployment_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_deployment_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "recipe_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_deployments: {
        Row: {
          cost_snapshot: number | null
          created_at: string | null
          deployed_by: string
          deployment_notes: string | null
          deployment_options: Json | null
          deployment_status: string
          id: string
          price_snapshot: number | null
          recipe_id: string
          store_id: string
          template_id: string
          updated_at: string | null
        }
        Insert: {
          cost_snapshot?: number | null
          created_at?: string | null
          deployed_by: string
          deployment_notes?: string | null
          deployment_options?: Json | null
          deployment_status?: string
          id?: string
          price_snapshot?: number | null
          recipe_id: string
          store_id: string
          template_id: string
          updated_at?: string | null
        }
        Update: {
          cost_snapshot?: number | null
          created_at?: string | null
          deployed_by?: string
          deployment_notes?: string | null
          deployment_options?: Json | null
          deployment_status?: string
          id?: string
          price_snapshot?: number | null
          recipe_id?: string
          store_id?: string
          template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_deployments_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_usage_analytics"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipe_deployments_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_deployments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "recipe_deployments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_deployments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "recipe_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_executions: {
        Row: {
          created_at: string
          executed_at: string
          executed_by: string
          id: string
          notes: string | null
          quantity_produced: number
          recipe_name: string
          recipe_template_id: string
          status: string
          store_id: string | null
          total_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          executed_at?: string
          executed_by: string
          id?: string
          notes?: string | null
          quantity_produced?: number
          recipe_name: string
          recipe_template_id: string
          status?: string
          store_id?: string | null
          total_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          executed_at?: string
          executed_by?: string
          id?: string
          notes?: string | null
          quantity_produced?: number
          recipe_name?: string
          recipe_template_id?: string
          status?: string
          store_id?: string | null
          total_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
      recipe_ingredient_categories: {
        Row: {
          created_at: string | null
          id: string
          ingredient_category: Database["public"]["Enums"]["inventory_item_category"]
          product_category: string
          required_ingredients: string[]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ingredient_category: Database["public"]["Enums"]["inventory_item_category"]
          product_category: string
          required_ingredients?: string[]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ingredient_category?: Database["public"]["Enums"]["inventory_item_category"]
          product_category?: string
          required_ingredients?: string[]
          updated_at?: string | null
        }
        Relationships: []
      }
      recipe_ingredient_groups: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          max_selections: number | null
          min_selections: number | null
          name: string
          recipe_template_id: string
          selection_type: string
          updated_at: string
          user_id: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          max_selections?: number | null
          min_selections?: number | null
          name: string
          recipe_template_id: string
          selection_type?: string
          updated_at?: string
          user_id?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          max_selections?: number | null
          min_selections?: number | null
          name?: string
          recipe_template_id?: string
          selection_type?: string
          updated_at?: string
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredient_groups_recipe_template_id_fkey"
            columns: ["recipe_template_id"]
            isOneToOne: false
            referencedRelation: "recipe_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredient_mappings: {
        Row: {
          conversion_factor: number
          created_at: string
          id: string
          ingredient_name: string
          inventory_stock_id: string
          recipe_id: string
          updated_at: string
        }
        Insert: {
          conversion_factor?: number
          created_at?: string
          id?: string
          ingredient_name: string
          inventory_stock_id: string
          recipe_id: string
          updated_at?: string
        }
        Update: {
          conversion_factor?: number
          created_at?: string
          id?: string
          ingredient_name?: string
          inventory_stock_id?: string
          recipe_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredient_mappings_inventory_stock_id_fkey"
            columns: ["inventory_stock_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredient_mappings_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_usage_analytics"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipe_ingredient_mappings_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredient_substitutions: {
        Row: {
          conversion_factor: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          original_ingredient_name: string
          store_ids: string[] | null
          substitute_ingredient_name: string
          template_id: string
          updated_at: string | null
        }
        Insert: {
          conversion_factor?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          original_ingredient_name: string
          store_ids?: string[] | null
          substitute_ingredient_name: string
          template_id: string
          updated_at?: string | null
        }
        Update: {
          conversion_factor?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          original_ingredient_name?: string
          store_ids?: string[] | null
          substitute_ingredient_name?: string
          template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredient_substitutions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "recipe_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          commissary_item_id: string | null
          cost_per_unit: number | null
          created_at: string
          display_order: number | null
          group_selection_type: string | null
          id: string
          ingredient_group_id: string | null
          ingredient_group_name: string | null
          ingredient_name: string | null
          inventory_stock_id: string | null
          is_optional: boolean | null
          notes: string | null
          purchase_unit: string | null
          quantity: number
          recipe_id: string
          recipe_unit: string | null
          unit: Database["public"]["Enums"]["inventory_unit"]
          updated_at: string | null
        }
        Insert: {
          commissary_item_id?: string | null
          cost_per_unit?: number | null
          created_at?: string
          display_order?: number | null
          group_selection_type?: string | null
          id?: string
          ingredient_group_id?: string | null
          ingredient_group_name?: string | null
          ingredient_name?: string | null
          inventory_stock_id?: string | null
          is_optional?: boolean | null
          notes?: string | null
          purchase_unit?: string | null
          quantity: number
          recipe_id: string
          recipe_unit?: string | null
          unit: Database["public"]["Enums"]["inventory_unit"]
          updated_at?: string | null
        }
        Update: {
          commissary_item_id?: string | null
          cost_per_unit?: number | null
          created_at?: string
          display_order?: number | null
          group_selection_type?: string | null
          id?: string
          ingredient_group_id?: string | null
          ingredient_group_name?: string | null
          ingredient_name?: string | null
          inventory_stock_id?: string | null
          is_optional?: boolean | null
          notes?: string | null
          purchase_unit?: string | null
          quantity?: number
          recipe_id?: string
          recipe_unit?: string | null
          unit?: Database["public"]["Enums"]["inventory_unit"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_recipe_ingredients_commissary_item"
            columns: ["commissary_item_id"]
            isOneToOne: false
            referencedRelation: "commissary_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_inventory_stock_id_fkey"
            columns: ["inventory_stock_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_usage_analytics"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients_backup: {
        Row: {
          commissary_item_id: string | null
          cost_per_unit: number | null
          created_at: string | null
          display_order: number | null
          group_selection_type: string | null
          id: string | null
          ingredient_group_id: string | null
          ingredient_group_name: string | null
          ingredient_name: string | null
          inventory_stock_id: string | null
          is_optional: boolean | null
          notes: string | null
          purchase_unit: string | null
          quantity: number | null
          recipe_id: string | null
          recipe_unit: string | null
          unit: Database["public"]["Enums"]["inventory_unit"] | null
          updated_at: string | null
        }
        Insert: {
          commissary_item_id?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          display_order?: number | null
          group_selection_type?: string | null
          id?: string | null
          ingredient_group_id?: string | null
          ingredient_group_name?: string | null
          ingredient_name?: string | null
          inventory_stock_id?: string | null
          is_optional?: boolean | null
          notes?: string | null
          purchase_unit?: string | null
          quantity?: number | null
          recipe_id?: string | null
          recipe_unit?: string | null
          unit?: Database["public"]["Enums"]["inventory_unit"] | null
          updated_at?: string | null
        }
        Update: {
          commissary_item_id?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          display_order?: number | null
          group_selection_type?: string | null
          id?: string | null
          ingredient_group_id?: string | null
          ingredient_group_name?: string | null
          ingredient_name?: string | null
          inventory_stock_id?: string | null
          is_optional?: boolean | null
          notes?: string | null
          purchase_unit?: string | null
          quantity?: number | null
          recipe_id?: string | null
          recipe_unit?: string | null
          unit?: Database["public"]["Enums"]["inventory_unit"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      recipe_pricing_matrix: {
        Row: {
          base_price: number
          created_at: string
          id: string
          is_active: boolean
          price_modifier: number | null
          recipe_template_id: string
          size_category: string | null
          temperature_category: string | null
          updated_at: string
        }
        Insert: {
          base_price?: number
          created_at?: string
          id?: string
          is_active?: boolean
          price_modifier?: number | null
          recipe_template_id: string
          size_category?: string | null
          temperature_category?: string | null
          updated_at?: string
        }
        Update: {
          base_price?: number
          created_at?: string
          id?: string
          is_active?: boolean
          price_modifier?: number | null
          recipe_template_id?: string
          size_category?: string | null
          temperature_category?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_pricing_matrix_recipe_template_id_fkey"
            columns: ["recipe_template_id"]
            isOneToOne: false
            referencedRelation: "recipe_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_template_ingredients: {
        Row: {
          choice_group_name: string | null
          choice_group_type: string | null
          choice_order: number | null
          combo_add_on: boolean | null
          combo_main: boolean | null
          commissary_item_id: string | null
          commissary_item_name: string | null
          cost_per_unit: number | null
          created_at: string | null
          display_order: number | null
          group_selection_type:
            | Database["public"]["Enums"]["ingredient_group_selection_type"]
            | null
          id: string
          ingredient_category: string | null
          ingredient_group_id: string | null
          ingredient_group_name: string | null
          ingredient_name: string
          ingredient_type: string | null
          inventory_stock_id: string | null
          is_default_selection: boolean | null
          is_optional: boolean | null
          location_type: string | null
          notes: string | null
          purchase_unit: string | null
          quantity: number
          recipe_template_id: string
          recipe_to_store_conversion_factor: number | null
          recipe_unit: string | null
          selection_max: number | null
          selection_min: number | null
          store_unit: string | null
          unit: string
          uses_store_inventory: boolean
        }
        Insert: {
          choice_group_name?: string | null
          choice_group_type?: string | null
          choice_order?: number | null
          combo_add_on?: boolean | null
          combo_main?: boolean | null
          commissary_item_id?: string | null
          commissary_item_name?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          display_order?: number | null
          group_selection_type?:
            | Database["public"]["Enums"]["ingredient_group_selection_type"]
            | null
          id?: string
          ingredient_category?: string | null
          ingredient_group_id?: string | null
          ingredient_group_name?: string | null
          ingredient_name: string
          ingredient_type?: string | null
          inventory_stock_id?: string | null
          is_default_selection?: boolean | null
          is_optional?: boolean | null
          location_type?: string | null
          notes?: string | null
          purchase_unit?: string | null
          quantity: number
          recipe_template_id: string
          recipe_to_store_conversion_factor?: number | null
          recipe_unit?: string | null
          selection_max?: number | null
          selection_min?: number | null
          store_unit?: string | null
          unit: string
          uses_store_inventory?: boolean
        }
        Update: {
          choice_group_name?: string | null
          choice_group_type?: string | null
          choice_order?: number | null
          combo_add_on?: boolean | null
          combo_main?: boolean | null
          commissary_item_id?: string | null
          commissary_item_name?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          display_order?: number | null
          group_selection_type?:
            | Database["public"]["Enums"]["ingredient_group_selection_type"]
            | null
          id?: string
          ingredient_category?: string | null
          ingredient_group_id?: string | null
          ingredient_group_name?: string | null
          ingredient_name?: string
          ingredient_type?: string | null
          inventory_stock_id?: string | null
          is_default_selection?: boolean | null
          is_optional?: boolean | null
          location_type?: string | null
          notes?: string | null
          purchase_unit?: string | null
          quantity?: number
          recipe_template_id?: string
          recipe_to_store_conversion_factor?: number | null
          recipe_unit?: string | null
          selection_max?: number | null
          selection_min?: number | null
          store_unit?: string | null
          unit?: string
          uses_store_inventory?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "recipe_template_ingredients_commissary_item_id_fkey"
            columns: ["commissary_item_id"]
            isOneToOne: false
            referencedRelation: "commissary_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_template_ingredients_inventory_stock_id_fkey"
            columns: ["inventory_stock_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_template_ingredients_recipe_template_id_fkey"
            columns: ["recipe_template_id"]
            isOneToOne: false
            referencedRelation: "recipe_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_templates: {
        Row: {
          base_price_includes: string | null
          category_name: string | null
          choice_configuration: Json | null
          combo_add_on: boolean | null
          combo_main: boolean | null
          combo_rules: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          has_choice_groups: boolean | null
          id: string
          image_url: string | null
          images: Json | null
          instructions: string | null
          is_active: boolean | null
          name: string
          preparation_time: number | null
          price: number | null
          recipe_type: string | null
          serving_size: number | null
          sku: string | null
          suggested_price: number | null
          total_cost: number | null
          updated_at: string | null
          version: number | null
          yield_quantity: number
        }
        Insert: {
          base_price_includes?: string | null
          category_name?: string | null
          choice_configuration?: Json | null
          combo_add_on?: boolean | null
          combo_main?: boolean | null
          combo_rules?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          has_choice_groups?: boolean | null
          id?: string
          image_url?: string | null
          images?: Json | null
          instructions?: string | null
          is_active?: boolean | null
          name: string
          preparation_time?: number | null
          price?: number | null
          recipe_type?: string | null
          serving_size?: number | null
          sku?: string | null
          suggested_price?: number | null
          total_cost?: number | null
          updated_at?: string | null
          version?: number | null
          yield_quantity?: number
        }
        Update: {
          base_price_includes?: string | null
          category_name?: string | null
          choice_configuration?: Json | null
          combo_add_on?: boolean | null
          combo_main?: boolean | null
          combo_rules?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          has_choice_groups?: boolean | null
          id?: string
          image_url?: string | null
          images?: Json | null
          instructions?: string | null
          is_active?: boolean | null
          name?: string
          preparation_time?: number | null
          price?: number | null
          recipe_type?: string | null
          serving_size?: number | null
          sku?: string | null
          suggested_price?: number | null
          total_cost?: number | null
          updated_at?: string | null
          version?: number | null
          yield_quantity?: number
        }
        Relationships: []
      }
      recipe_usage_log: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          quantity_used: number
          recipe_id: string
          store_id: string
          transaction_id: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          quantity_used?: number
          recipe_id: string
          store_id: string
          transaction_id?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          quantity_used?: number
          recipe_id?: string
          store_id?: string
          transaction_id?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_usage_log_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_usage_analytics"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipe_usage_log_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_usage_log_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "recipe_usage_log_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          category_name: string | null
          combo_rules: Json | null
          cost_per_serving: number | null
          created_at: string
          deployment_notes: string | null
          description: string | null
          id: string
          images: Json | null
          instructions: string | null
          is_active: boolean | null
          last_cost_update: string | null
          name: string
          preparation_time: number | null
          product_id: string | null
          recipe_type: string | null
          rejection_reason: string | null
          serving_size: number | null
          sku: string | null
          store_id: string
          suggested_price: number | null
          template_id: string | null
          total_cost: number | null
          updated_at: string
          variation_id: string | null
          version: number | null
          yield_quantity: number
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category_name?: string | null
          combo_rules?: Json | null
          cost_per_serving?: number | null
          created_at?: string
          deployment_notes?: string | null
          description?: string | null
          id?: string
          images?: Json | null
          instructions?: string | null
          is_active?: boolean | null
          last_cost_update?: string | null
          name: string
          preparation_time?: number | null
          product_id?: string | null
          recipe_type?: string | null
          rejection_reason?: string | null
          serving_size?: number | null
          sku?: string | null
          store_id: string
          suggested_price?: number | null
          template_id?: string | null
          total_cost?: number | null
          updated_at?: string
          variation_id?: string | null
          version?: number | null
          yield_quantity?: number
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category_name?: string | null
          combo_rules?: Json | null
          cost_per_serving?: number | null
          created_at?: string
          deployment_notes?: string | null
          description?: string | null
          id?: string
          images?: Json | null
          instructions?: string | null
          is_active?: boolean | null
          last_cost_update?: string | null
          name?: string
          preparation_time?: number | null
          product_id?: string | null
          recipe_type?: string | null
          rejection_reason?: string | null
          serving_size?: number | null
          sku?: string | null
          store_id?: string
          suggested_price?: number | null
          template_id?: string | null
          total_cost?: number | null
          updated_at?: string
          variation_id?: string | null
          version?: number | null
          yield_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "recipes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "recipe_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          created_at: string | null
          event_details: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_audit_logs: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          risk_level: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          risk_level?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          risk_level?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      shifts: {
        Row: {
          cashier_id: string | null
          created_at: string | null
          end_inventory_count: Json | null
          end_photo: string | null
          end_time: string | null
          ending_cash: number | null
          id: string
          start_inventory_count: Json | null
          start_photo: string | null
          start_time: string
          starting_cash: number
          status: string
          store_id: string
          user_id: string
        }
        Insert: {
          cashier_id?: string | null
          created_at?: string | null
          end_inventory_count?: Json | null
          end_photo?: string | null
          end_time?: string | null
          ending_cash?: number | null
          id?: string
          start_inventory_count?: Json | null
          start_photo?: string | null
          start_time?: string
          starting_cash?: number
          status?: string
          store_id: string
          user_id: string
        }
        Update: {
          cashier_id?: string | null
          created_at?: string | null
          end_inventory_count?: Json | null
          end_photo?: string | null
          end_time?: string | null
          ending_cash?: number | null
          id?: string
          start_inventory_count?: Json | null
          start_photo?: string | null
          start_time?: string
          starting_cash?: number
          status?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "cashiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "shifts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      sm_export_logs: {
        Row: {
          action: string
          created_at: string
          detail_count: number | null
          details: string | null
          email_sent: boolean
          error_message: string | null
          execution_time: number | null
          filename: string | null
          id: string
          store_id: string
          success: boolean
          transaction_count: number | null
          updated_at: string
          upload_sent: boolean
        }
        Insert: {
          action?: string
          created_at?: string
          detail_count?: number | null
          details?: string | null
          email_sent?: boolean
          error_message?: string | null
          execution_time?: number | null
          filename?: string | null
          id?: string
          store_id: string
          success?: boolean
          transaction_count?: number | null
          updated_at?: string
          upload_sent?: boolean
        }
        Update: {
          action?: string
          created_at?: string
          detail_count?: number | null
          details?: string | null
          email_sent?: boolean
          error_message?: string | null
          execution_time?: number | null
          filename?: string | null
          id?: string
          store_id?: string
          success?: boolean
          transaction_count?: number | null
          updated_at?: string
          upload_sent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "fk_sm_export_logs_store_id"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "fk_sm_export_logs_store_id"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      standardized_ingredients: {
        Row: {
          category: string
          created_at: string | null
          id: string
          ingredient_name: string
          standardized_name: string
          standardized_unit: Database["public"]["Enums"]["inventory_unit"]
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          ingredient_name: string
          standardized_name: string
          standardized_unit: Database["public"]["Enums"]["inventory_unit"]
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          ingredient_name?: string
          standardized_name?: string
          standardized_unit?: Database["public"]["Enums"]["inventory_unit"]
        }
        Relationships: []
      }
      stock_order_items: {
        Row: {
          approved_quantity: number | null
          created_at: string
          id: string
          inventory_stock_id: string
          notes: string | null
          requested_quantity: number
          stock_order_id: string
          unit_cost: number | null
        }
        Insert: {
          approved_quantity?: number | null
          created_at?: string
          id?: string
          inventory_stock_id: string
          notes?: string | null
          requested_quantity?: number
          stock_order_id: string
          unit_cost?: number | null
        }
        Update: {
          approved_quantity?: number | null
          created_at?: string
          id?: string
          inventory_stock_id?: string
          notes?: string | null
          requested_quantity?: number
          stock_order_id?: string
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_order_items_inventory_stock_id_fkey"
            columns: ["inventory_stock_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_order_items_stock_order_id_fkey"
            columns: ["stock_order_id"]
            isOneToOne: false
            referencedRelation: "stock_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_orders: {
        Row: {
          approved_by: string | null
          created_at: string
          fulfilled_date: string | null
          id: string
          notes: string | null
          order_date: string
          order_number: string
          requested_by: string
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          fulfilled_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number: string
          requested_by: string
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          fulfilled_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string
          requested_by?: string
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "stock_orders_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "stock_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "stock_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transactions: {
        Row: {
          created_at: string
          created_by: string
          id: string
          inventory_item_id: string
          new_stock: number
          notes: string | null
          previous_stock: number
          quantity_change: number
          reference_id: string | null
          reference_type: string | null
          transaction_type: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          inventory_item_id: string
          new_stock: number
          notes?: string | null
          previous_stock: number
          quantity_change: number
          reference_id?: string | null
          reference_type?: string | null
          transaction_type: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          inventory_item_id?: string
          new_stock?: number
          notes?: string | null
          previous_stock?: number
          quantity_change?: number
          reference_id?: string | null
          reference_type?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transactions_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      store_inventory_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string | null
          current_quantity: number
          id: string
          inventory_stock_id: string
          is_acknowledged: boolean | null
          store_id: string
          threshold_quantity: number
          updated_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string | null
          current_quantity: number
          id?: string
          inventory_stock_id: string
          is_acknowledged?: boolean | null
          store_id: string
          threshold_quantity: number
          updated_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string | null
          current_quantity?: number
          id?: string
          inventory_stock_id?: string
          is_acknowledged?: boolean | null
          store_id?: string
          threshold_quantity?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_inventory_alerts_inventory_stock_id_fkey"
            columns: ["inventory_stock_id"]
            isOneToOne: false
            referencedRelation: "inventory_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_inventory_alerts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_inventory_alerts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_metrics: {
        Row: {
          average_order_value: number | null
          created_at: string | null
          id: string
          inventory_turnover: number | null
          low_stock_items: number | null
          metric_date: string
          out_of_stock_items: number | null
          store_id: string
          total_orders: number | null
          total_sales: number | null
          updated_at: string | null
        }
        Insert: {
          average_order_value?: number | null
          created_at?: string | null
          id?: string
          inventory_turnover?: number | null
          low_stock_items?: number | null
          metric_date: string
          out_of_stock_items?: number | null
          store_id: string
          total_orders?: number | null
          total_sales?: number | null
          updated_at?: string | null
        }
        Update: {
          average_order_value?: number | null
          created_at?: string | null
          id?: string
          inventory_turnover?: number | null
          low_stock_items?: number | null
          metric_date?: string
          out_of_stock_items?: number | null
          store_id?: string
          total_orders?: number | null
          total_sales?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_metrics_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_metrics_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_pricing_profiles: {
        Row: {
          base_markup_percentage: number | null
          category_markups: Json | null
          created_at: string | null
          id: string
          ingredient_cost_adjustments: Json | null
          is_active: boolean | null
          is_default: boolean | null
          profile_name: string
          store_id: string
          updated_at: string | null
        }
        Insert: {
          base_markup_percentage?: number | null
          category_markups?: Json | null
          created_at?: string | null
          id?: string
          ingredient_cost_adjustments?: Json | null
          is_active?: boolean | null
          is_default?: boolean | null
          profile_name: string
          store_id: string
          updated_at?: string | null
        }
        Update: {
          base_markup_percentage?: number | null
          category_markups?: Json | null
          created_at?: string | null
          id?: string
          ingredient_cost_adjustments?: Json | null
          is_active?: boolean | null
          is_default?: boolean | null
          profile_name?: string
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_pricing_profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_pricing_profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          bir_compliance_config: Json | null
          created_at: string | null
          currency: string | null
          id: string
          is_tax_inclusive: boolean | null
          receipt_footer: string | null
          receipt_header: string | null
          store_id: string
          tax_percentage: number | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          bir_compliance_config?: Json | null
          created_at?: string | null
          currency?: string | null
          id?: string
          is_tax_inclusive?: boolean | null
          receipt_footer?: string | null
          receipt_header?: string | null
          store_id: string
          tax_percentage?: number | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          bir_compliance_config?: Json | null
          created_at?: string | null
          currency?: string | null
          id?: string
          is_tax_inclusive?: boolean | null
          receipt_footer?: string | null
          receipt_header?: string | null
          store_id?: string
          tax_percentage?: number | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          accreditation_date: string | null
          accreditation_number: string | null
          address: string
          bir_final_permit_number: string | null
          business_name: string | null
          business_type: string | null
          city: string | null
          country: string | null
          created_at: string | null
          date_issued: string | null
          email: string | null
          franchise_agreement_date: string | null
          franchise_fee_amount: number | null
          franchise_fee_percentage: number | null
          franchisee_contact_info: Json | null
          id: string
          is_active: boolean | null
          is_bir_accredited: boolean | null
          is_vat_registered: boolean | null
          location_type: string | null
          logistics_zone: string | null
          logo_url: string | null
          machine_accreditation_number: string | null
          machine_serial_number: string | null
          name: string
          non_vat_disclaimer: string | null
          opening_date: string | null
          owner_address: string | null
          owner_contact_number: string | null
          owner_email: string | null
          owner_name: string | null
          ownership_type: string | null
          permit_number: string | null
          phone: string | null
          pos_version: string | null
          region: string | null
          state: string | null
          store_location_photo_url: string | null
          supplier_address: string | null
          supplier_name: string | null
          supplier_tin: string | null
          tax_id: string | null
          tin: string | null
          updated_at: string | null
          valid_until: string | null
          validity_statement: string | null
          zip_code: string | null
        }
        Insert: {
          accreditation_date?: string | null
          accreditation_number?: string | null
          address: string
          bir_final_permit_number?: string | null
          business_name?: string | null
          business_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_issued?: string | null
          email?: string | null
          franchise_agreement_date?: string | null
          franchise_fee_amount?: number | null
          franchise_fee_percentage?: number | null
          franchisee_contact_info?: Json | null
          id?: string
          is_active?: boolean | null
          is_bir_accredited?: boolean | null
          is_vat_registered?: boolean | null
          location_type?: string | null
          logistics_zone?: string | null
          logo_url?: string | null
          machine_accreditation_number?: string | null
          machine_serial_number?: string | null
          name: string
          non_vat_disclaimer?: string | null
          opening_date?: string | null
          owner_address?: string | null
          owner_contact_number?: string | null
          owner_email?: string | null
          owner_name?: string | null
          ownership_type?: string | null
          permit_number?: string | null
          phone?: string | null
          pos_version?: string | null
          region?: string | null
          state?: string | null
          store_location_photo_url?: string | null
          supplier_address?: string | null
          supplier_name?: string | null
          supplier_tin?: string | null
          tax_id?: string | null
          tin?: string | null
          updated_at?: string | null
          valid_until?: string | null
          validity_statement?: string | null
          zip_code?: string | null
        }
        Update: {
          accreditation_date?: string | null
          accreditation_number?: string | null
          address?: string
          bir_final_permit_number?: string | null
          business_name?: string | null
          business_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_issued?: string | null
          email?: string | null
          franchise_agreement_date?: string | null
          franchise_fee_amount?: number | null
          franchise_fee_percentage?: number | null
          franchisee_contact_info?: Json | null
          id?: string
          is_active?: boolean | null
          is_bir_accredited?: boolean | null
          is_vat_registered?: boolean | null
          location_type?: string | null
          logistics_zone?: string | null
          logo_url?: string | null
          machine_accreditation_number?: string | null
          machine_serial_number?: string | null
          name?: string
          non_vat_disclaimer?: string | null
          opening_date?: string | null
          owner_address?: string | null
          owner_contact_number?: string | null
          owner_email?: string | null
          owner_name?: string | null
          ownership_type?: string | null
          permit_number?: string | null
          phone?: string | null
          pos_version?: string | null
          region?: string | null
          state?: string | null
          store_location_photo_url?: string | null
          supplier_address?: string | null
          supplier_name?: string | null
          supplier_tin?: string | null
          tax_id?: string | null
          tin?: string | null
          updated_at?: string | null
          valid_until?: string | null
          validity_statement?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      stores_backup_reset: {
        Row: {
          accreditation_date: string | null
          accreditation_number: string | null
          address: string | null
          bir_final_permit_number: string | null
          business_name: string | null
          business_type: string | null
          city: string | null
          country: string | null
          created_at: string | null
          date_issued: string | null
          email: string | null
          franchise_agreement_date: string | null
          franchise_fee_amount: number | null
          franchise_fee_percentage: number | null
          franchisee_contact_info: Json | null
          id: string | null
          is_active: boolean | null
          is_bir_accredited: boolean | null
          is_vat_registered: boolean | null
          location_type: string | null
          logistics_zone: string | null
          logo_url: string | null
          machine_accreditation_number: string | null
          machine_serial_number: string | null
          name: string | null
          non_vat_disclaimer: string | null
          opening_date: string | null
          owner_address: string | null
          owner_contact_number: string | null
          owner_email: string | null
          owner_name: string | null
          ownership_type: string | null
          permit_number: string | null
          phone: string | null
          pos_version: string | null
          region: string | null
          state: string | null
          store_location_photo_url: string | null
          supplier_address: string | null
          supplier_name: string | null
          supplier_tin: string | null
          tax_id: string | null
          tin: string | null
          updated_at: string | null
          valid_until: string | null
          validity_statement: string | null
          zip_code: string | null
        }
        Insert: {
          accreditation_date?: string | null
          accreditation_number?: string | null
          address?: string | null
          bir_final_permit_number?: string | null
          business_name?: string | null
          business_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_issued?: string | null
          email?: string | null
          franchise_agreement_date?: string | null
          franchise_fee_amount?: number | null
          franchise_fee_percentage?: number | null
          franchisee_contact_info?: Json | null
          id?: string | null
          is_active?: boolean | null
          is_bir_accredited?: boolean | null
          is_vat_registered?: boolean | null
          location_type?: string | null
          logistics_zone?: string | null
          logo_url?: string | null
          machine_accreditation_number?: string | null
          machine_serial_number?: string | null
          name?: string | null
          non_vat_disclaimer?: string | null
          opening_date?: string | null
          owner_address?: string | null
          owner_contact_number?: string | null
          owner_email?: string | null
          owner_name?: string | null
          ownership_type?: string | null
          permit_number?: string | null
          phone?: string | null
          pos_version?: string | null
          region?: string | null
          state?: string | null
          store_location_photo_url?: string | null
          supplier_address?: string | null
          supplier_name?: string | null
          supplier_tin?: string | null
          tax_id?: string | null
          tin?: string | null
          updated_at?: string | null
          valid_until?: string | null
          validity_statement?: string | null
          zip_code?: string | null
        }
        Update: {
          accreditation_date?: string | null
          accreditation_number?: string | null
          address?: string | null
          bir_final_permit_number?: string | null
          business_name?: string | null
          business_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_issued?: string | null
          email?: string | null
          franchise_agreement_date?: string | null
          franchise_fee_amount?: number | null
          franchise_fee_percentage?: number | null
          franchisee_contact_info?: Json | null
          id?: string | null
          is_active?: boolean | null
          is_bir_accredited?: boolean | null
          is_vat_registered?: boolean | null
          location_type?: string | null
          logistics_zone?: string | null
          logo_url?: string | null
          machine_accreditation_number?: string | null
          machine_serial_number?: string | null
          name?: string | null
          non_vat_disclaimer?: string | null
          opening_date?: string | null
          owner_address?: string | null
          owner_contact_number?: string | null
          owner_email?: string | null
          owner_name?: string | null
          ownership_type?: string | null
          permit_number?: string | null
          phone?: string | null
          pos_version?: string | null
          region?: string | null
          state?: string | null
          store_location_photo_url?: string | null
          supplier_address?: string | null
          supplier_name?: string | null
          supplier_tin?: string | null
          tax_id?: string | null
          tin?: string | null
          updated_at?: string | null
          valid_until?: string | null
          validity_statement?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          lead_time_days: number | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          lead_time_days?: number | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          lead_time_days?: number | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      system_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          is_resolved: boolean
          message: string
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          message: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          message?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
        }
        Relationships: []
      }
      system_reset_log: {
        Row: {
          created_by: string | null
          details: Json | null
          id: string
          reset_date: string | null
          reset_type: string
        }
        Insert: {
          created_by?: string | null
          details?: Json | null
          id?: string
          reset_date?: string | null
          reset_type: string
        }
        Update: {
          created_by?: string | null
          details?: Json | null
          id?: string
          reset_date?: string | null
          reset_type?: string
        }
        Relationships: []
      }
      transaction_items: {
        Row: {
          category_id: string | null
          category_name: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          product_id: string
          product_type: string | null
          quantity: number
          total_price: number
          transaction_id: string
          unit_price: number
          updated_at: string
          variation_id: string | null
        }
        Insert: {
          category_id?: string | null
          category_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          product_id: string
          product_type?: string | null
          quantity?: number
          total_price?: number
          transaction_id: string
          unit_price?: number
          updated_at?: string
          variation_id?: string | null
        }
        Update: {
          category_id?: string | null
          category_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          product_id?: string
          product_type?: string | null
          quantity?: number
          total_price?: number
          transaction_id?: string
          unit_price?: number
          updated_at?: string
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_voids: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          original_amount: number
          reason_category: string
          transaction_id: string
          void_reason: string
          voided_at: string
          voided_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          original_amount: number
          reason_category: string
          transaction_id: string
          void_reason: string
          voided_at?: string
          voided_by: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          original_amount?: number
          reason_category?: string
          transaction_id?: string
          void_reason?: string
          voided_at?: string
          voided_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_voids_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_tendered: number | null
          assigned_to: string | null
          cashier_name: string | null
          change: number | null
          created_at: string | null
          customer_id: string | null
          delivery_order_number: string | null
          delivery_platform: string | null
          discount: number
          discount_amount: number | null
          discount_details: Json | null
          discount_id: string | null
          discount_id_number: string | null
          discount_type: string | null
          estimated_completion_time: string | null
          id: string
          items: Json
          order_notes: string | null
          order_status: string | null
          order_type: string | null
          payment_details: Json | null
          payment_method: string
          promo_details: string | null
          promo_reference: string | null
          pwd_discount: number | null
          receipt_number: string
          senior_citizen_discount: number | null
          senior_discount: number | null
          senior_discounts: Json | null
          sequence_number: number | null
          shift_id: string
          status: string
          store_id: string
          subtotal: number
          tax: number
          terminal_id: string | null
          total: number
          user_id: string
          vat_amount: number | null
          vat_exempt_sales: number | null
          vat_sales: number | null
          zero_rated_sales: number | null
        }
        Insert: {
          amount_tendered?: number | null
          assigned_to?: string | null
          cashier_name?: string | null
          change?: number | null
          created_at?: string | null
          customer_id?: string | null
          delivery_order_number?: string | null
          delivery_platform?: string | null
          discount?: number
          discount_amount?: number | null
          discount_details?: Json | null
          discount_id?: string | null
          discount_id_number?: string | null
          discount_type?: string | null
          estimated_completion_time?: string | null
          id?: string
          items: Json
          order_notes?: string | null
          order_status?: string | null
          order_type?: string | null
          payment_details?: Json | null
          payment_method: string
          promo_details?: string | null
          promo_reference?: string | null
          pwd_discount?: number | null
          receipt_number: string
          senior_citizen_discount?: number | null
          senior_discount?: number | null
          senior_discounts?: Json | null
          sequence_number?: number | null
          shift_id: string
          status?: string
          store_id: string
          subtotal?: number
          tax?: number
          terminal_id?: string | null
          total?: number
          user_id: string
          vat_amount?: number | null
          vat_exempt_sales?: number | null
          vat_sales?: number | null
          zero_rated_sales?: number | null
        }
        Update: {
          amount_tendered?: number | null
          assigned_to?: string | null
          cashier_name?: string | null
          change?: number | null
          created_at?: string | null
          customer_id?: string | null
          delivery_order_number?: string | null
          delivery_platform?: string | null
          discount?: number
          discount_amount?: number | null
          discount_details?: Json | null
          discount_id?: string | null
          discount_id_number?: string | null
          discount_type?: string | null
          estimated_completion_time?: string | null
          id?: string
          items?: Json
          order_notes?: string | null
          order_status?: string | null
          order_type?: string | null
          payment_details?: Json | null
          payment_method?: string
          promo_details?: string | null
          promo_reference?: string | null
          pwd_discount?: number | null
          receipt_number?: string
          senior_citizen_discount?: number | null
          senior_discount?: number | null
          senior_discounts?: Json | null
          sequence_number?: number | null
          shift_id?: string
          status?: string
          store_id?: string
          subtotal?: number
          tax?: number
          terminal_id?: string | null
          total?: number
          user_id?: string
          vat_amount?: number | null
          vat_exempt_sales?: number | null
          vat_sales?: number | null
          zero_rated_sales?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_recipe_ingredients: {
        Row: {
          cost_per_unit: number
          created_at: string | null
          id: string
          ingredient_name: string
          inventory_stock_id: string
          quantity: number
          recipe_id: string
          total_cost: number | null
          unit: string
          updated_at: string | null
        }
        Insert: {
          cost_per_unit: number
          created_at?: string | null
          id?: string
          ingredient_name: string
          inventory_stock_id: string
          quantity: number
          recipe_id: string
          total_cost?: number | null
          unit: string
          updated_at?: string | null
        }
        Update: {
          cost_per_unit?: number
          created_at?: string | null
          id?: string
          ingredient_name?: string
          inventory_stock_id?: string
          quantity?: number
          recipe_id?: string
          total_cost?: number | null
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unified_recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "unified_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_recipes: {
        Row: {
          cost_per_serving: number | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          serving_size: number | null
          store_id: string
          total_cost: number | null
          updated_at: string | null
        }
        Insert: {
          cost_per_serving?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          serving_size?: number | null
          store_id: string
          total_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          cost_per_serving?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          serving_size?: number | null
          store_id?: string
          total_cost?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      unit_conversions: {
        Row: {
          conversion_factor: number
          created_at: string | null
          from_unit: string
          id: string
          ingredient_type: string | null
          to_unit: string
          updated_at: string | null
        }
        Insert: {
          conversion_factor: number
          created_at?: string | null
          from_unit: string
          id?: string
          ingredient_type?: string | null
          to_unit: string
          updated_at?: string | null
        }
        Update: {
          conversion_factor?: number
          created_at?: string | null
          from_unit?: string
          id?: string
          ingredient_type?: string | null
          to_unit?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_role_audit: {
        Row: {
          changed_at: string
          changed_by: string
          id: string
          ip_address: unknown | null
          new_role: Database["public"]["Enums"]["app_role"]
          old_role: Database["public"]["Enums"]["app_role"] | null
          reason: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          id?: string
          ip_address?: unknown | null
          new_role: Database["public"]["Enums"]["app_role"]
          old_role?: Database["public"]["Enums"]["app_role"] | null
          reason?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          id?: string
          ip_address?: unknown | null
          new_role?: Database["public"]["Enums"]["app_role"]
          old_role?: Database["public"]["Enums"]["app_role"] | null
          reason?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_store_access: {
        Row: {
          can_access: boolean
          created_at: string
          id: string
          role: string | null
          store_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_access?: boolean
          created_at?: string
          id?: string
          role?: string | null
          store_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_access?: boolean
          created_at?: string
          id?: string
          role?: string | null
          store_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_stores: {
        Row: {
          created_at: string | null
          id: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "user_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      recipe_management_summary: {
        Row: {
          catalog_products: number | null
          categorization_percentage: number | null
          categorized_products: number | null
          deployed_recipes: number | null
          store_id: string | null
          store_name: string | null
          total_categories: number | null
          total_templates: number | null
        }
        Relationships: []
      }
      recipe_usage_analytics: {
        Row: {
          avg_quantity_per_use: number | null
          first_used: string | null
          last_used: string | null
          recipe_id: string | null
          recipe_name: string | null
          store_id: string | null
          store_name: string | null
          total_quantity_used: number | null
          usage_count: number | null
          usage_month: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "recipe_management_summary"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "recipes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      analyze_store_deployment_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          expected_products: number
          missing_products: number
          products_with_images: number
          products_without_images: number
          store_id: string
          store_name: string
          total_products: number
        }[]
      }
      assign_admin_role_securely: {
        Args: { user_email: string }
        Returns: boolean
      }
      audit_recipe_completeness: {
        Args: Record<PropertyKey, never>
        Returns: {
          missing_ingredients: string[]
          recipe_id: string
          recipe_ingredients_count: number
          recipe_name: string
          status: string
          store_id: string
          store_name: string
          template_id: string
          template_ingredients_count: number
        }[]
      }
      audit_recipe_template_consistency: {
        Args: Record<PropertyKey, never>
        Returns: {
          deployed_quantity: number
          deployed_unit: string
          ingredient_name: string
          issue_type: string
          status: string
          store_name: string
          template_name: string
          template_quantity: number
          template_unit: string
        }[]
      }
      begin_transaction: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      bulk_update_product_categories: {
        Args: Record<PropertyKey, never>
        Returns: {
          products_failed: number
          products_updated: number
          store_name: string
        }[]
      }
      calculate_recipe_cost: {
        Args: { recipe_id: number }
        Returns: number
      }
      calculate_recipe_suggested_price: {
        Args: { recipe_id_param: string; store_id_param?: string }
        Returns: number
      }
      calculate_template_cost: {
        Args: { template_id_param: string }
        Returns: number
      }
      can_access_user_record: {
        Args: { target_store_ids: string[]; target_user_id: string }
        Returns: boolean
      }
      check_auth_rate_limit: {
        Args: {
          p_block_minutes?: number
          p_identifier: string
          p_identifier_type?: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      check_product_catalog_update_conflicts: {
        Args: { catalog_id: string; new_product_name?: string }
        Returns: {
          conflict_details: Json
          has_conflicts: boolean
        }[]
      }
      check_recipe_deployment_readiness: {
        Args: { p_store_id: string; p_template_id: string }
        Returns: {
          error_message: string
          is_valid: boolean
          missing_ingredients: string[]
        }[]
      }
      check_recipe_ingredient_availability: {
        Args: { recipe_id_param: string; store_id_param: string }
        Returns: boolean
      }
      cleanup_inactive_data: {
        Args: { days_old?: number }
        Returns: {
          records_cleaned: number
          table_name: string
        }[]
      }
      cleanup_test_data: {
        Args: { p_store_id: string; p_user_id?: string }
        Returns: boolean
      }
      clear_successful_login_rate_limit: {
        Args: { p_identifier: string; p_identifier_type?: string }
        Returns: undefined
      }
      commit_transaction: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      complete_recipe_ingredients: {
        Args: Record<PropertyKey, never>
        Returns: {
          categories_processed: string[]
          execution_details: Json
          ingredients_added: number
          recipes_updated: number
        }[]
      }
      create_advanced_inventory_mappings: {
        Args: Record<PropertyKey, never>
        Returns: {
          mapping_details: Json
          mappings_created: number
          stores_processed: number
        }[]
      }
      create_app_user: {
        Args: {
          p_first_name: string
          p_is_active: boolean
          p_last_name: string
          p_store_ids: string[]
          p_user_email: string
          p_user_id: string
          p_user_role: string
        }
        Returns: string
      }
      create_ingredient_inventory_mappings: {
        Args: Record<PropertyKey, never>
        Returns: {
          mapping_details: Json
          mappings_created: number
          stores_processed: number
        }[]
      }
      create_test_shift: {
        Args: { p_store_id: string; p_user_id?: string }
        Returns: string
      }
      deploy_all_recipe_templates_to_all_stores: {
        Args: Record<PropertyKey, never>
        Returns: {
          deployed_ingredients: number
          deployed_products: number
          deployed_recipes: number
          execution_time_ms: number
          skipped_existing: number
          total_stores: number
          total_templates: number
        }[]
      }
      deploy_and_fix_recipe_templates_to_all_stores: {
        Args: Record<PropertyKey, never>
        Returns: {
          deployed_ingredients: number
          deployed_products: number
          deployed_recipes: number
          execution_time_ms: number
          fixed_recipes: number
          skipped_existing: number
          total_stores: number
          total_templates: number
        }[]
      }
      deploy_catalog_products_only: {
        Args: Record<PropertyKey, never>
        Returns: {
          execution_time_ms: number
          products_added: number
          stores_processed: number
        }[]
      }
      deploy_missing_products_to_catalog: {
        Args: Record<PropertyKey, never>
        Returns: {
          categories_added: number
          execution_time_ms: number
          products_added: number
          stores_processed: number
        }[]
      }
      deploy_products_to_all_stores: {
        Args: Record<PropertyKey, never>
        Returns: {
          deployed_count: number
          details: string[]
          error_count: number
        }[]
      }
      deploy_recipe_template_to_all_stores: {
        Args: { template_id_param: string }
        Returns: {
          deployed_ingredients: number
          deployed_products: number
          deployed_recipes: number
          execution_time_ms: number
          skipped_existing: number
          total_stores: number
        }[]
      }
      disable_sync_triggers: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      enable_sync_triggers: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      export_transaction_details_csv: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          item_description: string
          item_discount: number
          item_sequence: number
          line_total: number
          quantity: number
          receipt_number: string
          unit_price: number
          vat_exempt_flag: boolean
        }[]
      }
      export_transaction_details_csv_recent: {
        Args: { days_back?: number; store_id_param: string }
        Returns: {
          csv_data: string
        }[]
      }
      export_transactions_csv: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          business_date: string
          discount_amount: number
          discount_id: string
          discount_type: string
          gross_amount: number
          net_amount: number
          payment_method: string
          promo_details: string
          pwd_discount: number
          receipt_number: string
          senior_discount: number
          transaction_time: string
          vat_amount: number
        }[]
      }
      export_transactions_csv_recent: {
        Args: { days_back?: number; store_id_param: string }
        Returns: {
          csv_data: string
        }[]
      }
      extract_pack_quantity: {
        Args: { order_description: string }
        Returns: number
      }
      fix_all_incomplete_recipes: {
        Args: Record<PropertyKey, never>
        Returns: {
          execution_details: Json
          ingredients_added: number
          recipes_fixed: number
        }[]
      }
      fix_missing_inventory_deduction: {
        Args: { p_store_id: string; p_transaction_id: string }
        Returns: {
          deducted_quantity: number
          ingredient_name: string
          message: string
          new_stock: number
          success: boolean
        }[]
      }
      fix_recipe_ingredients_with_proper_units: {
        Args: Record<PropertyKey, never>
        Returns: {
          execution_details: Json
          ingredients_added: number
          recipes_fixed: number
        }[]
      }
      format_promo_details: {
        Args: { promo_name: string; promo_ref: string }
        Returns: string
      }
      generate_fulfillment_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_purchase_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_recipe_sku: {
        Args: { recipe_name: string; recipe_type?: string }
        Returns: string
      }
      generate_sequential_journal_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_stock_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_store_inventory_from_recipes: {
        Args: Record<PropertyKey, never>
        Returns: {
          execution_details: Json
          items_created: number
          stores_processed: number
        }[]
      }
      get_all_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          contact_number: string
          created_at: string
          email: string
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          role: string
          store_ids: string[]
          updated_at: string
          user_id: string
        }[]
      }
      get_category_statistics: {
        Args: Record<PropertyKey, never>
        Returns: {
          category_name: string
          percentage: number
          product_count: number
          store_name: string
        }[]
      }
      get_commissary_purchase_history: {
        Args: { item_id: string; limit_count?: number }
        Returns: {
          batch_number: string
          notes: string
          purchase_date: string
          quantity_purchased: number
          supplier_name: string
          total_cost: number
          unit_cost: number
        }[]
      }
      get_current_user_info: {
        Args: Record<PropertyKey, never> | { user_email: string }
        Returns: {
          contact_number: string
          email: string
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          role: string
          store_ids: string[]
          user_id: string
        }[]
      }
      get_inventory_items_by_category: {
        Args: { store_id_param: string }
        Returns: {
          cost: number
          id: string
          item: string
          item_category: string
          stock_quantity: number
          unit: string
        }[]
      }
      get_location_suppliers: {
        Args: Record<PropertyKey, never>
        Returns: {
          supplier_id: number
          supplier_name: string
        }[]
      }
      get_low_stock_items: {
        Args: { store_id_param: string }
        Returns: {
          cost: number
          created_at: string
          id: string
          is_active: boolean
          item: string
          maximum_capacity: number
          minimum_threshold: number
          stock_quantity: number
          store_id: string
          unit: string
          updated_at: string
        }[]
      }
      get_or_create_category: {
        Args: { store_id_param: string; template_category: string }
        Returns: string
      }
      get_recipe_repair_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          orphaned_products: number
          products_missing_recipes: number
          products_with_recipes: number
          recipes_missing_templates: number
          recipes_with_templates: number
          total_products: number
        }[]
      }
      get_recipe_with_ingredients: {
        Args: { p_product_id: string }
        Returns: {
          ingredient_name: string
          quantity: number
          unit: string
        }[]
      }
      get_sm_cron_jobs: {
        Args: Record<PropertyKey, never>
        Returns: {
          active: boolean
          command: string
          database: string
          jobid: number
          jobname: string
          nodename: string
          nodeport: number
          schedule: string
          username: string
        }[]
      }
      get_store_users: {
        Args: { store_id_param: string }
        Returns: {
          contact_number: string
          created_at: string
          email: string
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          role: string
          store_ids: string[]
          updated_at: string
          user_id: string
        }[]
      }
      get_system_health: {
        Args: Record<PropertyKey, never>
        Returns: {
          metric: string
          status: string
          value: string
        }[]
      }
      get_user_role_permissions: {
        Args: { user_role: Database["public"]["Enums"]["app_role"] }
        Returns: string[]
      }
      get_users_needing_sync: {
        Args: Record<PropertyKey, never>
        Returns: {
          email: string
          id: string
          user_metadata: Json
        }[]
      }
      has_fulfillment_access: {
        Args: { user_role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      has_route_access: {
        Args: {
          required_access: string
          user_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      insert_inventory_movement_safe: {
        Args: {
          p_created_by?: string
          p_inventory_stock_id: string
          p_movement_type: string
          p_new_quantity: number
          p_notes?: string
          p_previous_quantity: number
          p_quantity_change: number
          p_reference_id: string
          p_reference_type: string
        }
        Returns: undefined
      }
      is_admin_email: {
        Args: { email_address: string }
        Returns: boolean
      }
      is_admin_or_owner: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin_or_owner_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_current_user_admin_or_owner: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_store_accessible: {
        Args: { p_store_id: string }
        Returns: boolean
      }
      is_user_admin_or_owner: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_user_rate_limited: {
        Args: { p_identifier: string; p_identifier_type?: string }
        Returns: boolean
      }
      log_bir_audit: {
        Args:
          | {
              p_cashier_name?: string
              p_event_data: Json
              p_event_name: string
              p_log_type: string
              p_receipt_number?: string
              p_store_id: string
              p_terminal_id?: string
              p_transaction_id?: string
              p_user_id?: string
            }
          | {
              p_cashier_name?: string
              p_event_data: Json
              p_event_name: string
              p_log_type: string
              p_receipt_number?: string
              p_store_id: string
              p_terminal_id?: string
              p_transaction_id?: string
              p_user_id?: string
            }
        Returns: string
      }
      log_inventory_sync_result: {
        Args: {
          p_affected_inventory_items?: Json
          p_error_details?: string
          p_items_processed?: number
          p_sync_duration_ms?: number
          p_sync_status: string
          p_transaction_id: string
        }
        Returns: undefined
      }
      log_security_event: {
        Args: {
          p_event_data?: Json
          p_event_type: string
          p_risk_level?: string
          p_user_email?: string
          p_user_id?: string
        }
        Returns: string
      }
      log_sm_export_activity: {
        Args: {
          p_action?: string
          p_detail_count?: number
          p_details?: string
          p_email_sent?: boolean
          p_error_message?: string
          p_execution_time?: number
          p_filename?: string
          p_store_id: string
          p_success?: boolean
          p_transaction_count?: number
          p_upload_sent?: boolean
        }
        Returns: string
      }
      manual_deduct_inventory: {
        Args: { p_transaction_id: string }
        Returns: {
          deducted_quantity: number
          error_message: string
          ingredient_name: string
          new_quantity: number
          previous_quantity: number
          success: boolean
        }[]
      }
      map_template_category_to_pos: {
        Args: { template_category: string }
        Returns: string
      }
      migrate_product_catalog_to_products: {
        Args: Record<PropertyKey, never>
        Returns: {
          details: string[]
          error_count: number
          migrated_count: number
          skipped_count: number
        }[]
      }
      migrate_recipes_to_product_catalog: {
        Args: Record<PropertyKey, never>
        Returns: {
          details: string[]
          error_count: number
          migrated_count: number
        }[]
      }
      monitor_inventory_system_health: {
        Args: Record<PropertyKey, never>
        Returns: {
          health_score: number
          mapped_ingredients: number
          recipes_with_ingredients: number
          recipes_without_ingredients: number
          store_id: string
          store_name: string
          total_ingredients: number
          total_recipes: number
          unmapped_ingredients: number
        }[]
      }
      normalize_unit_name: {
        Args: { unit_text: string }
        Returns: string
      }
      rebuild_performance_indexes: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      recalculate_senior_discounts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      record_failed_login_attempt: {
        Args: {
          p_block_minutes?: number
          p_identifier: string
          p_identifier_type?: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      repair_missing_product_catalog_entries: {
        Args: Record<PropertyKey, never>
        Returns: {
          errors: string[]
          repaired_count: number
        }[]
      }
      repair_recipe_template_links: {
        Args: Record<PropertyKey, never>
        Returns: {
          action_type: string
          error_message: string
          product_name: string
          recipe_id: string
          success: boolean
          template_id: string
          template_name: string
        }[]
      }
      reset_user_rate_limit: {
        Args: { user_email: string }
        Returns: undefined
      }
      resolve_duplicate_skus_for_store: {
        Args: { target_store_id: string }
        Returns: {
          details: string
          resolved_count: number
        }[]
      }
      rollback_transaction: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      run_inventory_system_health_check: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      safe_clear_recipe_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          catalog_references_cleared: number
          recipes_deactivated: number
          templates_deactivated: number
        }[]
      }
      safe_update_product_catalog: {
        Args: {
          catalog_id: string
          new_category_id?: string
          new_description?: string
          new_image_url?: string
          new_is_available?: boolean
          new_price?: number
          new_product_name?: string
        }
        Returns: {
          message: string
          success: boolean
          updated_data: Json
        }[]
      }
      simple_duplicate_cleanup: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      simple_template_fix: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      sync_auth_user_to_app_users: {
        Args: {
          contact_number?: string
          first_name: string
          last_name: string
          store_ids?: string[]
          user_email: string
          user_role?: Database["public"]["Enums"]["app_role"]
        }
        Returns: string
      }
      sync_missing_app_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          error_details: string
          synced_count: number
        }[]
      }
      sync_recipes_with_templates: {
        Args: { p_template_ids?: string[] }
        Returns: {
          ingredients_updated: number
          recipes_updated: number
          stores_affected: number
          sync_details: Json
        }[]
      }
      sync_template_images_to_products: {
        Args: Record<PropertyKey, never>
        Returns: {
          details: string[]
          error_count: number
          updated_count: number
        }[]
      }
      transfer_commissary_to_store: {
        Args: {
          p_commissary_item_id: string
          p_fulfilled_by: string
          p_notes?: string
          p_quantity: number
          p_store_id: string
          p_unit_cost: number
        }
        Returns: boolean
      }
      transfer_inventory_stock: {
        Args:
          | Record<PropertyKey, never>
          | {
              p_item: string
              p_notes?: string
              p_quantity: number
              p_source_id: string
              p_target_store_id: string
              p_unit: string
              p_user_id?: string
            }
        Returns: undefined
      }
      trigger_auto_close_shifts: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      try_cast_jsonb: {
        Args: { txt: string }
        Returns: Json
      }
      update_cumulative_sales: {
        Args: {
          p_receipt_number?: string
          p_store_id: string
          p_terminal_id?: string
          p_transaction_total: number
        }
        Returns: undefined
      }
      user_has_store_access: {
        Args: { store_id: string; user_id: string }
        Returns: boolean
      }
      validate_clean_slate_migration: {
        Args: Record<PropertyKey, never>
        Returns: {
          check_name: string
          count_items: number
          details: string
          status: string
        }[]
      }
      validate_inventory_before_transaction: {
        Args: { p_store_id: string; p_transaction_items: Json }
        Returns: {
          available_quantity: number
          ingredient_name: string
          required_quantity: number
          sufficient: boolean
        }[]
      }
      validate_password_strength: {
        Args: { password: string }
        Returns: boolean
      }
      validate_product_catalog_consistency: {
        Args: Record<PropertyKey, never>
        Returns: {
          count_affected: number
          description: string
          issue_type: string
        }[]
      }
      validate_product_has_recipe_template: {
        Args: { product_id: string }
        Returns: boolean
      }
      validate_product_ingredients_availability: {
        Args: { product_id: string; quantity?: number }
        Returns: {
          insufficient_stock: string[]
          is_available: boolean
          missing_ingredients: string[]
        }[]
      }
      validate_recipe_deployment: {
        Args: { p_store_id: string; p_template_id: string }
        Returns: {
          error_message: string
          is_valid: boolean
          missing_ingredients: string[]
        }[]
      }
      validate_recipe_integrity: {
        Args: Record<PropertyKey, never>
        Returns: {
          check_name: string
          details: string
          issue_count: number
          status: string
        }[]
      }
      validate_recipe_inventory_consistency: {
        Args: Record<PropertyKey, never>
        Returns: {
          has_inventory_mapping: boolean
          ingredient_name: string
          inventory_item_name: string
          is_consistent: boolean
          recipe_name: string
        }[]
      }
      validate_recipe_inventory_readiness: {
        Args: { recipe_id_param: string }
        Returns: {
          can_produce: boolean
          insufficient_stock: string[]
          missing_mappings: string[]
        }[]
      }
      validate_store_operational_status: {
        Args: { p_store_id?: string }
        Returns: {
          check_name: string
          details: string
          status: string
          store_id: string
          store_name: string
        }[]
      }
      validate_user_input: {
        Args: {
          p_contact_number?: string
          p_email: string
          p_first_name: string
          p_last_name: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "owner"
        | "manager"
        | "cashier"
        | "stock_user"
        | "production_user"
        | "commissary_user"
      delivery_order_status:
        | "for_delivery"
        | "partial_delivery"
        | "delivery_complete"
      grn_status: "pending" | "verified" | "discrepancy_noted"
      ingredient_group_selection_type:
        | "required_one"
        | "optional_one"
        | "multiple"
      inventory_category: "ingredients" | "packaging" | "supplies"
      inventory_item_category:
        | "base_ingredient"
        | "classic_sauce"
        | "premium_sauce"
        | "classic_topping"
        | "premium_topping"
        | "packaging"
        | "biscuit"
      inventory_unit:
        | "kg"
        | "g"
        | "pieces"
        | "liters"
        | "ml"
        | "boxes"
        | "packs"
      order_status:
        | "draft"
        | "pending"
        | "approved"
        | "ordered"
        | "delivered"
        | "received"
        | "cancelled"
      purchase_order_status:
        | "draft"
        | "pending"
        | "approved"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "fulfilled"
        | "delivered"
        | "replaced"
        | "refunded"
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
      app_role: [
        "admin",
        "owner",
        "manager",
        "cashier",
        "stock_user",
        "production_user",
        "commissary_user",
      ],
      delivery_order_status: [
        "for_delivery",
        "partial_delivery",
        "delivery_complete",
      ],
      grn_status: ["pending", "verified", "discrepancy_noted"],
      ingredient_group_selection_type: [
        "required_one",
        "optional_one",
        "multiple",
      ],
      inventory_category: ["ingredients", "packaging", "supplies"],
      inventory_item_category: [
        "base_ingredient",
        "classic_sauce",
        "premium_sauce",
        "classic_topping",
        "premium_topping",
        "packaging",
        "biscuit",
      ],
      inventory_unit: ["kg", "g", "pieces", "liters", "ml", "boxes", "packs"],
      order_status: [
        "draft",
        "pending",
        "approved",
        "ordered",
        "delivered",
        "received",
        "cancelled",
      ],
      purchase_order_status: [
        "draft",
        "pending",
        "approved",
        "in_progress",
        "completed",
        "cancelled",
        "fulfilled",
        "delivered",
        "replaced",
        "refunded",
      ],
    },
  },
} as const
