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
      app_users: {
        Row: {
          contact_number: string | null
          created_at: string | null
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
      commissary_inventory: {
        Row: {
          barcode: string | null
          category: string
          created_at: string
          current_stock: number
          expiry_date: string | null
          id: string
          is_active: boolean
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
          barcode?: string | null
          category: string
          created_at?: string
          current_stock?: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean
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
          barcode?: string | null
          category?: string
          created_at?: string
          current_stock?: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean
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
      conversion_ingredients: {
        Row: {
          commissary_item_id: string
          created_at: string
          id: string
          inventory_conversion_id: string
          quantity_used: number
          unit_cost: number | null
        }
        Insert: {
          commissary_item_id: string
          created_at?: string
          id?: string
          inventory_conversion_id: string
          quantity_used: number
          unit_cost?: number | null
        }
        Update: {
          commissary_item_id?: string
          created_at?: string
          id?: string
          inventory_conversion_id?: string
          quantity_used?: number
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conversion_ingredients_commissary_item_id_fkey"
            columns: ["commissary_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_ingredients_inventory_conversion_id_fkey"
            columns: ["inventory_conversion_id"]
            isOneToOne: false
            referencedRelation: "inventory_conversions"
            referencedColumns: ["id"]
          },
        ]
      }
      conversion_recipe_ingredients: {
        Row: {
          commissary_item_id: string
          conversion_recipe_id: string
          created_at: string
          id: string
          quantity: number
        }
        Insert: {
          commissary_item_id: string
          conversion_recipe_id: string
          created_at?: string
          id?: string
          quantity: number
        }
        Update: {
          commissary_item_id?: string
          conversion_recipe_id?: string
          created_at?: string
          id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "conversion_recipe_ingredients_commissary_item_id_fkey"
            columns: ["commissary_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_recipe_ingredients_conversion_recipe_id_fkey"
            columns: ["conversion_recipe_id"]
            isOneToOne: false
            referencedRelation: "conversion_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      conversion_recipes: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          finished_item_name: string
          finished_item_unit: string
          id: string
          instructions: string | null
          is_active: boolean
          name: string
          updated_at: string
          yield_quantity: number
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          finished_item_name: string
          finished_item_unit: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          name: string
          updated_at?: string
          yield_quantity?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          finished_item_name?: string
          finished_item_unit?: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          name?: string
          updated_at?: string
          yield_quantity?: number
        }
        Relationships: []
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
      goods_received_notes: {
        Row: {
          created_at: string | null
          delivery_order_id: string
          digital_signature: string | null
          grn_number: string
          id: string
          quality_check_passed: boolean | null
          received_at: string | null
          received_by: string
          remarks: string | null
          status: Database["public"]["Enums"]["grn_status"] | null
        }
        Insert: {
          created_at?: string | null
          delivery_order_id: string
          digital_signature?: string | null
          grn_number: string
          id?: string
          quality_check_passed?: boolean | null
          received_at?: string | null
          received_by: string
          remarks?: string | null
          status?: Database["public"]["Enums"]["grn_status"] | null
        }
        Update: {
          created_at?: string | null
          delivery_order_id?: string
          digital_signature?: string | null
          grn_number?: string
          id?: string
          quality_check_passed?: boolean | null
          received_at?: string | null
          received_by?: string
          remarks?: string | null
          status?: Database["public"]["Enums"]["grn_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "goods_received_notes_delivery_order_id_fkey"
            columns: ["delivery_order_id"]
            isOneToOne: false
            referencedRelation: "delivery_orders"
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
            foreignKeyName: "inventory_conversions_conversion_recipe_id_fkey"
            columns: ["conversion_recipe_id"]
            isOneToOne: false
            referencedRelation: "conversion_recipes"
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
          item: string
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
          item: string
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
          item?: string
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
          is_active: boolean | null
          name: string
          price: number
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
          is_active?: boolean | null
          name: string
          price?: number
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
          is_active?: boolean | null
          name?: string
          price?: number
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
          id: string
          notes: string | null
          order_number: string
          requested_delivery_date: string | null
          status: Database["public"]["Enums"]["purchase_order_status"] | null
          store_id: string
          supplier_id: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          notes?: string | null
          order_number: string
          requested_delivery_date?: string | null
          status?: Database["public"]["Enums"]["purchase_order_status"] | null
          store_id: string
          supplier_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          notes?: string | null
          order_number?: string
          requested_delivery_date?: string | null
          status?: Database["public"]["Enums"]["purchase_order_status"] | null
          store_id?: string
          supplier_id?: string | null
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
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          commissary_item_id: string | null
          cost_per_unit: number | null
          created_at: string
          id: string
          inventory_stock_id: string
          quantity: number
          recipe_id: string
          unit: Database["public"]["Enums"]["inventory_unit"]
        }
        Insert: {
          commissary_item_id?: string | null
          cost_per_unit?: number | null
          created_at?: string
          id?: string
          inventory_stock_id: string
          quantity: number
          recipe_id: string
          unit: Database["public"]["Enums"]["inventory_unit"]
        }
        Update: {
          commissary_item_id?: string | null
          cost_per_unit?: number | null
          created_at?: string
          id?: string
          inventory_stock_id?: string
          quantity?: number
          recipe_id?: string
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
      recipe_template_ingredients: {
        Row: {
          commissary_item_id: string
          commissary_item_name: string
          cost_per_unit: number | null
          created_at: string | null
          id: string
          quantity: number
          recipe_template_id: string
          unit: string
        }
        Insert: {
          commissary_item_id: string
          commissary_item_name: string
          cost_per_unit?: number | null
          created_at?: string | null
          id?: string
          quantity: number
          recipe_template_id: string
          unit: string
        }
        Update: {
          commissary_item_id?: string
          commissary_item_name?: string
          cost_per_unit?: number | null
          created_at?: string | null
          id?: string
          quantity?: number
          recipe_template_id?: string
          unit?: string
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
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          instructions: string | null
          is_active: boolean | null
          name: string
          serving_size: number | null
          updated_at: string | null
          version: number | null
          yield_quantity: number
        }
        Insert: {
          category_name?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_active?: boolean | null
          name: string
          serving_size?: number | null
          updated_at?: string | null
          version?: number | null
          yield_quantity?: number
        }
        Update: {
          category_name?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_active?: boolean | null
          name?: string
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
          cost_per_serving: number | null
          created_at: string
          description: string | null
          id: string
          instructions: string | null
          is_active: boolean | null
          name: string
          product_id: string
          rejection_reason: string | null
          serving_size: number | null
          store_id: string
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
          cost_per_serving?: number | null
          created_at?: string
          description?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          name: string
          product_id: string
          rejection_reason?: string | null
          serving_size?: number | null
          store_id: string
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
          cost_per_serving?: number | null
          created_at?: string
          description?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          name?: string
          product_id?: string
          rejection_reason?: string | null
          serving_size?: number | null
          store_id?: string
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
            foreignKeyName: "recipes_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
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
          city: string | null
          country: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          phone: string | null
          state: string | null
          tax_id: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          phone?: string | null
          state?: string | null
          tax_id?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          state?: string | null
          tax_id?: string | null
          updated_at?: string | null
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
          discount_id_number: string | null
          discount_type: string | null
          estimated_completion_time: string | null
          id: string
          items: Json
          order_notes: string | null
          order_status: string | null
          payment_details: Json | null
          payment_method: string
          receipt_number: string
          shift_id: string
          status: string
          store_id: string
          subtotal: number
          tax: number
          total: number
          user_id: string
        }
        Insert: {
          amount_tendered?: number | null
          assigned_to?: string | null
          change?: number | null
          created_at?: string | null
          customer_id?: string | null
          discount?: number
          discount_id_number?: string | null
          discount_type?: string | null
          estimated_completion_time?: string | null
          id?: string
          items: Json
          order_notes?: string | null
          order_status?: string | null
          payment_details?: Json | null
          payment_method: string
          receipt_number: string
          shift_id: string
          status?: string
          store_id: string
          subtotal?: number
          tax?: number
          total?: number
          user_id: string
        }
        Update: {
          amount_tendered?: number | null
          assigned_to?: string | null
          change?: number | null
          created_at?: string | null
          customer_id?: string | null
          discount?: number
          discount_id_number?: string | null
          discount_type?: string | null
          estimated_completion_time?: string | null
          id?: string
          items?: Json
          order_notes?: string | null
          order_status?: string | null
          payment_details?: Json | null
          payment_method?: string
          receipt_number?: string
          shift_id?: string
          status?: string
          store_id?: string
          subtotal?: number
          tax?: number
          total?: number
          user_id?: string
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
      can_access_user_record: {
        Args: { target_user_id: string; target_store_ids: string[] }
        Returns: boolean
      }
      create_app_user: {
        Args: {
          user_id: string
          user_email: string
          first_name: string
          last_name: string
          user_role: string
          store_ids: string[]
          is_active: boolean
        }
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
      get_users_needing_sync: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          email: string
          user_metadata: Json
        }[]
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
    }
    Enums: {
      app_role: "admin" | "owner" | "manager" | "cashier"
      delivery_order_status:
        | "for_delivery"
        | "partial_delivery"
        | "delivery_complete"
      grn_status: "pending" | "verified" | "discrepancy_noted"
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
    Enums: {
      app_role: ["admin", "owner", "manager", "cashier"],
      delivery_order_status: [
        "for_delivery",
        "partial_delivery",
        "delivery_complete",
      ],
      grn_status: ["pending", "verified", "discrepancy_noted"],
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
      ],
    },
  },
} as const
