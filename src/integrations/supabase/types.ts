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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
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
            isOneToOne: false
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
            referencedRelation: "stores"
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
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string
          store_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone: string
          store_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string
          store_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
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
          cost: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_fractional_supported: boolean | null
          item: string
          minimum_threshold: number | null
          serving_ready_quantity: number | null
          sku: string | null
          stock_quantity: number
          store_id: string
          unit: string
          updated_at: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_fractional_supported?: boolean | null
          item: string
          minimum_threshold?: number | null
          serving_ready_quantity?: number | null
          sku?: string | null
          stock_quantity?: number
          store_id: string
          unit: string
          updated_at?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_fractional_supported?: boolean | null
          item?: string
          minimum_threshold?: number | null
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
            referencedRelation: "stores"
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
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_available: boolean
          price: number
          product_name: string
          product_status: string | null
          recipe_id: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          price?: number
          product_name: string
          product_status?: string | null
          recipe_id?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          price?: number
          product_name?: string
          product_status?: string | null
          recipe_id?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
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
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string | null
          id: string
          inventory_stock_id: string
          purchase_order_id: string
          quantity: number
          specifications: string | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          inventory_stock_id: string
          purchase_order_id: string
          quantity: number
          specifications?: string | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          inventory_stock_id?: string
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
            referencedRelation: "stores"
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
          inventory_stock_id: string
          is_optional: boolean | null
          purchase_unit: string | null
          quantity: number
          recipe_id: string
          recipe_unit: string | null
          unit: Database["public"]["Enums"]["inventory_unit"]
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
          inventory_stock_id: string
          is_optional?: boolean | null
          purchase_unit?: string | null
          quantity: number
          recipe_id: string
          recipe_unit?: string | null
          unit: Database["public"]["Enums"]["inventory_unit"]
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
          inventory_stock_id?: string
          is_optional?: boolean | null
          purchase_unit?: string | null
          quantity?: number
          recipe_id?: string
          recipe_unit?: string | null
          unit?: Database["public"]["Enums"]["inventory_unit"]
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
          commissary_item_id: string | null
          commissary_item_name: string | null
          cost_per_unit: number | null
          created_at: string | null
          display_order: number | null
          group_selection_type:
            | Database["public"]["Enums"]["ingredient_group_selection_type"]
            | null
          id: string
          ingredient_group_id: string | null
          ingredient_group_name: string | null
          ingredient_name: string
          ingredient_type: string | null
          inventory_stock_id: string | null
          is_optional: boolean | null
          location_type: string | null
          purchase_unit: string | null
          quantity: number
          recipe_template_id: string
          recipe_to_store_conversion_factor: number | null
          recipe_unit: string | null
          store_unit: string | null
          unit: string
          uses_store_inventory: boolean
        }
        Insert: {
          commissary_item_id?: string | null
          commissary_item_name?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          display_order?: number | null
          group_selection_type?:
            | Database["public"]["Enums"]["ingredient_group_selection_type"]
            | null
          id?: string
          ingredient_group_id?: string | null
          ingredient_group_name?: string | null
          ingredient_name: string
          ingredient_type?: string | null
          inventory_stock_id?: string | null
          is_optional?: boolean | null
          location_type?: string | null
          purchase_unit?: string | null
          quantity: number
          recipe_template_id: string
          recipe_to_store_conversion_factor?: number | null
          recipe_unit?: string | null
          store_unit?: string | null
          unit: string
          uses_store_inventory?: boolean
        }
        Update: {
          commissary_item_id?: string | null
          commissary_item_name?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          display_order?: number | null
          group_selection_type?:
            | Database["public"]["Enums"]["ingredient_group_selection_type"]
            | null
          id?: string
          ingredient_group_id?: string | null
          ingredient_group_name?: string | null
          ingredient_name?: string
          ingredient_type?: string | null
          inventory_stock_id?: string | null
          is_optional?: boolean | null
          location_type?: string | null
          purchase_unit?: string | null
          quantity?: number
          recipe_template_id?: string
          recipe_to_store_conversion_factor?: number | null
          recipe_unit?: string | null
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
          category_name: string | null
          combo_rules: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          images: Json | null
          instructions: string | null
          is_active: boolean | null
          name: string
          recipe_type: string | null
          serving_size: number | null
          updated_at: string | null
          version: number | null
          yield_quantity: number
        }
        Insert: {
          category_name?: string | null
          combo_rules?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          images?: Json | null
          instructions?: string | null
          is_active?: boolean | null
          name: string
          recipe_type?: string | null
          serving_size?: number | null
          updated_at?: string | null
          version?: number | null
          yield_quantity?: number
        }
        Update: {
          category_name?: string | null
          combo_rules?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          images?: Json | null
          instructions?: string | null
          is_active?: boolean | null
          name?: string
          recipe_type?: string | null
          serving_size?: number | null
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
          description: string | null
          id: string
          images: Json | null
          instructions: string | null
          is_active: boolean | null
          name: string
          product_id: string
          recipe_type: string | null
          rejection_reason: string | null
          serving_size: number | null
          store_id: string
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
          description?: string | null
          id?: string
          images?: Json | null
          instructions?: string | null
          is_active?: boolean | null
          name: string
          product_id: string
          recipe_type?: string | null
          rejection_reason?: string | null
          serving_size?: number | null
          store_id: string
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
          description?: string | null
          id?: string
          images?: Json | null
          instructions?: string | null
          is_active?: boolean | null
          name?: string
          product_id?: string
          recipe_type?: string | null
          rejection_reason?: string | null
          serving_size?: number | null
          store_id?: string
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
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string
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
          location_type: string | null
          logistics_zone: string | null
          logo_url: string | null
          machine_accreditation_number: string | null
          machine_serial_number: string | null
          name: string
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
          tax_id: string | null
          tin: string | null
          updated_at: string | null
          valid_until: string | null
          zip_code: string | null
        }
        Insert: {
          address: string
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
          location_type?: string | null
          logistics_zone?: string | null
          logo_url?: string | null
          machine_accreditation_number?: string | null
          machine_serial_number?: string | null
          name: string
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
          tax_id?: string | null
          tin?: string | null
          updated_at?: string | null
          valid_until?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string
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
          location_type?: string | null
          logistics_zone?: string | null
          logo_url?: string | null
          machine_accreditation_number?: string | null
          machine_serial_number?: string | null
          name?: string
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
          tax_id?: string | null
          tin?: string | null
          updated_at?: string | null
          valid_until?: string | null
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
      transactions: {
        Row: {
          amount_tendered: number | null
          assigned_to: string | null
          change: number | null
          created_at: string | null
          customer_id: string | null
          discount: number
          discount_details: Json | null
          discount_id_number: string | null
          discount_type: string | null
          estimated_completion_time: string | null
          id: string
          items: Json
          order_notes: string | null
          order_status: string | null
          payment_details: Json | null
          payment_method: string
          pwd_discount: number | null
          receipt_number: string
          senior_citizen_discount: number | null
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
          vat_exempt_sales: number | null
          vat_sales: number | null
          zero_rated_sales: number | null
        }
        Insert: {
          amount_tendered?: number | null
          assigned_to?: string | null
          change?: number | null
          created_at?: string | null
          customer_id?: string | null
          discount?: number
          discount_details?: Json | null
          discount_id_number?: string | null
          discount_type?: string | null
          estimated_completion_time?: string | null
          id?: string
          items: Json
          order_notes?: string | null
          order_status?: string | null
          payment_details?: Json | null
          payment_method: string
          pwd_discount?: number | null
          receipt_number: string
          senior_citizen_discount?: number | null
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
          vat_exempt_sales?: number | null
          vat_sales?: number | null
          zero_rated_sales?: number | null
        }
        Update: {
          amount_tendered?: number | null
          assigned_to?: string | null
          change?: number | null
          created_at?: string | null
          customer_id?: string | null
          discount?: number
          discount_details?: Json | null
          discount_id_number?: string | null
          discount_type?: string | null
          estimated_completion_time?: string | null
          id?: string
          items?: Json
          order_notes?: string | null
          order_status?: string | null
          payment_details?: Json | null
          payment_method?: string
          pwd_discount?: number | null
          receipt_number?: string
          senior_citizen_discount?: number | null
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
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
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
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_recipe_cost: {
        Args: { recipe_id: number }
        Returns: number
      }
      can_access_user_record: {
        Args: { target_user_id: string; target_store_ids: string[] }
        Returns: boolean
      }
      create_app_user: {
        Args: {
          p_user_id: string
          p_user_email: string
          p_first_name: string
          p_last_name: string
          p_user_role: string
          p_store_ids: string[]
          p_is_active: boolean
        }
        Returns: string
      }
      generate_stock_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_all_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          user_id: string
          first_name: string
          last_name: string
          email: string
          contact_number: string
          role: string
          store_ids: string[]
          is_active: boolean
          created_at: string
          updated_at: string
        }[]
      }
      get_commissary_purchase_history: {
        Args: { item_id: string; limit_count?: number }
        Returns: {
          purchase_date: string
          quantity_purchased: number
          unit_cost: number
          total_cost: number
          supplier_name: string
          batch_number: string
          notes: string
        }[]
      }
      get_current_user_info: {
        Args: Record<PropertyKey, never> | { user_email: string }
        Returns: {
          id: string
          user_id: string
          first_name: string
          last_name: string
          email: string
          contact_number: string
          role: string
          store_ids: string[]
          is_active: boolean
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
          id: string
          store_id: string
          item: string
          unit: string
          stock_quantity: number
          minimum_threshold: number
          maximum_capacity: number
          cost: number
          is_active: boolean
          created_at: string
          updated_at: string
        }[]
      }
      get_store_users: {
        Args: { store_id_param: string }
        Returns: {
          id: string
          user_id: string
          first_name: string
          last_name: string
          email: string
          contact_number: string
          role: string
          store_ids: string[]
          is_active: boolean
          created_at: string
          updated_at: string
        }[]
      }
      get_user_role_permissions: {
        Args: { user_role: Database["public"]["Enums"]["app_role"] }
        Returns: string[]
      }
      get_users_needing_sync: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          email: string
          user_metadata: Json
        }[]
      }
      has_route_access: {
        Args: {
          user_role: Database["public"]["Enums"]["app_role"]
          required_access: string
        }
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
      is_user_admin_or_owner: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_bir_audit: {
        Args: {
          p_store_id: string
          p_log_type: string
          p_event_name: string
          p_event_data: Json
          p_user_id?: string
          p_cashier_name?: string
          p_terminal_id?: string
          p_transaction_id?: string
          p_receipt_number?: string
        }
        Returns: string
      }
      sync_auth_user_to_app_users: {
        Args: {
          user_email: string
          first_name: string
          last_name: string
          user_role?: Database["public"]["Enums"]["app_role"]
          store_ids?: string[]
          contact_number?: string
        }
        Returns: string
      }
      transfer_commissary_to_store: {
        Args: {
          p_commissary_item_id: string
          p_store_id: string
          p_quantity: number
          p_unit_cost: number
          p_fulfilled_by: string
          p_notes?: string
        }
        Returns: boolean
      }
      transfer_inventory_stock: {
        Args:
          | Record<PropertyKey, never>
          | {
              p_source_id: string
              p_target_store_id: string
              p_item: string
              p_unit: string
              p_quantity: number
              p_notes?: string
              p_user_id?: string
            }
        Returns: undefined
      }
      user_has_store_access: {
        Args: { user_id: string; store_id: string }
        Returns: boolean
      }
      validate_clean_slate_migration: {
        Args: Record<PropertyKey, never>
        Returns: {
          check_name: string
          status: string
          count_items: number
          details: string
        }[]
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
