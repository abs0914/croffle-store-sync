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
  LogOut,
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
import { StartShiftButton } from "./layout/sidebar/StartShiftButton"
import { StoreSelector } from "./layout/sidebar/StoreSelector"
import { useStore } from "@/contexts/StoreContext"
import { useStoreDisplay } from "@/contexts/StoreDisplayContext"
import { StoreNameDisplay } from "@/components/shared/StoreNameDisplay"
import { useAuth } from "@/contexts/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// Collapsed-aware BrandHeader component
function CollapsedAwareBrandHeader({ collapsed, isMobile }: { collapsed: boolean; isMobile: boolean }) {
  const { currentStore } = useStore()
  const { config } = useStoreDisplay()
  const showStoreName = currentStore && config.sidebarMode !== "hidden"

  if (collapsed && !isMobile) {
    // Collapsed state: show only a small logo/icon with tooltip
    return (
      <div className="flex items-center justify-center py-3 px-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-8 h-8 cursor-pointer">
              <img
                src="/lovable-uploads/cb3fd8e0-b11b-485f-af2f-41b76a79fbba.png"
                alt="The Croffle Store"
                className="w-full h-full object-contain"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>The Croffle Store POS</p>
          </TooltipContent>
        </Tooltip>
      </div>
    )
  }

  // Expanded state: show full branding
  return (
    <div className="flex flex-col items-center py-6 px-4 border-b bg-gradient-to-r from-croffle-background to-croffle-light">
      <div className="w-16 h-16 mb-2">
        <img
          src="/lovable-uploads/cb3fd8e0-b11b-485f-af2f-41b76a79fbba.png"
          alt="The Croffle Store"
          className="w-full h-full object-contain"
        />
      </div>

      {showStoreName ? (
        <div className="mt-2 w-full max-w-full">
          <StoreNameDisplay
            variant="compact"
            size="sm"
            className="text-center justify-center"
          />
        </div>
      ) : (
        <h2 className="text-lg font-semibold text-croffle-primary mt-1 text-center">
          PVOSyncPOS
        </h2>
      )}
    </div>
  )
}

// Collapsed-aware UserProfile component
function CollapsedAwareUserProfile({ collapsed, isMobile }: { collapsed: boolean; isMobile: boolean }) {
  const { user, logout } = useAuth()
  const { currentStore } = useStore()

  if (collapsed && !isMobile) {
    // Collapsed state: show only avatar with dropdown
    return (
      <div className="p-2 border-t border-border">
        <div className="flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-croffle-light hover:text-croffle-primary">
                <Avatar className="h-8 w-8 border-2 border-croffle-accent">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="bg-croffle-primary text-white text-xs">
                    {user?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="right">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()}>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    )
  }

  // Expanded state: show full user profile
  return (
    <div className="p-4 border-t bg-gradient-to-r from-croffle-background to-croffle-light">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Avatar className="border-2 border-croffle-accent">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="bg-croffle-primary text-white">{user?.name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-croffle-text">{user?.name || user?.email}</p>
            <p className="text-xs text-muted-foreground">{currentStore?.name || "No store selected"}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-croffle-light hover:text-croffle-primary">
              <span className="sr-only">Open user menu</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M3 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM8.5 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM15.5 8.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="text-xs text-gray-500 text-center mt-2">
        © 2025 Powered by PhilVirtualOffice
      </div>
    </div>
  )
}

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
    url: "/order-management",
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
  const { state, isMobile } = useSidebar()
  const { logout } = useAuth()
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
      ? "bg-croffle-accent text-white font-medium"
      : "text-croffle-text hover:bg-croffle-accent/80 hover:text-white"

  return (
    <Sidebar
      className="border-r border-border bg-croffle-background"
      collapsible="icon"
      side="left"
      variant="sidebar"
    >
      <SidebarHeader className={cn("border-b border-border", (collapsed && !isMobile) ? "p-0" : "")}>
        <CollapsedAwareBrandHeader collapsed={collapsed} isMobile={isMobile} />
      </SidebarHeader>

      <SidebarContent>
        {/* Store & Shift Controls */}
        {(!collapsed || isMobile) && (
          <div className="p-3 border-b border-border space-y-2">
            <StartShiftButton />
            <StoreSelector />
          </div>
        )}

        {/* Navigation Menu */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Main Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
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
                      {(!collapsed || isMobile) && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Logout Button */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Logout">
                  <button
                    onClick={logout}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 w-full text-left",
                      "text-croffle-text hover:bg-red-500/80 hover:text-white"
                    )}
                  >
                    <LogOut className="h-5 w-5 flex-shrink-0" />
                    {(!collapsed || isMobile) && <span className="truncate">Logout</span>}
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* User Profile at bottom */}
      <div className="mt-auto">
        <CollapsedAwareUserProfile collapsed={collapsed} isMobile={isMobile} />
      </div>
    </Sidebar>
  )
}