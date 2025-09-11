import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth";
import { useNavigate } from "react-router-dom";
import { formatInPhilippinesTime, PHILIPPINES_TIMEZONE } from "@/utils/timezone";

// In-app realtime notifications for order-related events
export const useOrderNotifications = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only for authenticated managers/admins/owners
    if (!user || !(hasPermission("admin") || hasPermission("owner") || hasPermission("manager"))) {
      return;
    }

    const fmt = (dateStr?: string | null) => {
      if (!dateStr) return "";
      try {
        return formatInPhilippinesTime(dateStr, "MMM d, yyyy h:mm a");
      } catch {
        return dateStr;
      }
    };

    const channel = supabase
      .channel("order-events")
      // Purchase Orders
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "purchase_orders" },
        (payload: any) => {
          const po = payload.new;
          toast.info(`New purchase order ${po.order_number || ""} created`, {
            description: `Status: ${po.status || "pending"} • ${fmt(po.created_at)}`,
            action: {
              label: "View",
              onClick: () => navigate("/order-management"),
            },
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "purchase_orders" },
        (payload: any) => {
          const po = payload.new;
          const old = payload.old;
          if (old?.status !== po?.status) {
            toast.success(`PO ${po.order_number || ""} ${po.status?.replaceAll("_", " ")}`, {
              description: `Updated: ${fmt(po.updated_at)}`,
              action: {
                label: "Open",
                onClick: () => navigate("/order-management"),
              },
            });
          }
        }
      )
      // Delivery Orders
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "delivery_orders" },
        (payload: any) => {
          const d = payload.new;
          toast.info(`Delivery scheduled ${d.delivery_number || ""}`, {
            description: `Status: ${d.status} • ETA: ${fmt(d.scheduled_delivery_date)}`,
            action: { label: "View", onClick: () => navigate("/order-management") },
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "delivery_orders" },
        (payload: any) => {
          const d = payload.new;
          const old = payload.old;
          if (old?.status !== d?.status) {
            const title = d.status === "delivery_complete" ? "Delivery completed" : "Delivery updated";
            toast.success(`${title} ${d.delivery_number || ""}`.trim(), {
              description: `When: ${fmt(d.actual_delivery_date || d.updated_at)}`,
              action: { label: "Open", onClick: () => navigate("/order-management") },
            });
          }
        }
      )
      // GRN (Receiving)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "goods_received_notes" },
        (payload: any) => {
          const grn = payload.new;
          toast.success(`GRN ${grn.grn_number || ""} recorded`, {
            description: `Received: ${fmt(grn.received_at)} • PO: ${grn.purchase_order_id?.slice(0, 8)}...`,
            action: { label: "View", onClick: () => navigate("/order-management") },
          });
        }
      )
      // GRN discrepancy resolutions
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "grn_discrepancy_resolutions" },
        (payload: any) => {
          const r = payload.new;
          toast.warning(`GRN discrepancy: ${r.resolution_type}`, {
            description: `Status: ${r.resolution_status} • ${fmt(r.created_at)}`,
            action: { label: "Review", onClick: () => navigate("/order-management") },
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "grn_discrepancy_resolutions" },
        (payload: any) => {
          const r = payload.new;
          const old = payload.old;
          if (old?.resolution_status !== r?.resolution_status) {
            const title = r.resolution_status === "approved" ? "Discrepancy approved" : "Discrepancy updated";
            toast.info(title, {
              description: `${r.resolution_type} • ${fmt(r.updated_at)}`,
              action: { label: "Open", onClick: () => navigate("/order-management") },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, hasPermission, navigate]);
};
