import { NavLink, useLocation } from "react-router-dom"
import {
  Building2,
  ShoppingCart,
  Package2,
  ShoppingBag,
  Users,
  DollarSign,
  BarChart3,
  Settings,
  LayoutDashboard,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar"
import { BrandHeader } from "./layout/sidebar/BrandHeader"
import { StartShiftButton } from "./layout/sidebar/StartShiftButton"
import { StoreSelector } from "./layout/sidebar/StoreSelector"
import { UserProfile } from "./layout/sidebar/UserProfile"

// Menu items
const items = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "POS",
    url: "/pos",
    icon: ShoppingCart,
  },
  {
    title: "Product Catalog",
    url: "/products",
    icon: Package2,
  },
  {
    title: "Inventory",
    url: "/inventory",
    icon: ShoppingBag,
  },
  {
    title: "Order Management",
    url: "/orders",
    icon: ShoppingBag,
  },
  {
    title: "Customers",
    url: "/customers",
    icon: Users,
  },
  {
    title: "Expenses",
    url: "/expenses",
    icon: DollarSign,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: BarChart3,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
]

export function AppSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const currentPath = location.pathname
  const collapsed = state === "collapsed"

  const isActive = (path: string) => {
    if (path === "/") {
      return currentPath === "/"
    }
    return currentPath.startsWith(path)
  }

  const getNavCls = (active: boolean) =>
    active
      ? "bg-croffle-accent/10 text-croffle-accent font-medium border-r-2 border-croffle-accent"
      : "text-croffle-text hover:bg-croffle-accent/5 hover:text-croffle-accent"

  return (
    <Sidebar
      className={cn(
        "border-r border-border bg-croffle-background",
        collapsed ? "w-16" : "w-64"
      )}
      collapsible="icon"
    >
      <SidebarHeader className="border-b border-border">
        <BrandHeader />
      </SidebarHeader>

      <SidebarContent>
        {/* Store & Shift Controls */}
        <div className="p-3 border-b border-border space-y-2">
          {!collapsed && <StartShiftButton />}
          {!collapsed && <StoreSelector />}
        </div>

        {/* Navigation Menu */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Main Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
                          getNavCls(isActive)
                        )
                      }
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* User Profile at bottom */}
      <div className="mt-auto border-t border-border">
        <UserProfile />
      </div>
    </Sidebar>
  )
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}