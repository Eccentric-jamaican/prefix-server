"use client"

import * as React from "react"
import {
  IconChartBar,
  IconDashboard,
  IconInnerShadowTop,
  IconSearch,
  IconSettings,
} from "@tabler/icons-react"

import { authClient } from "@/lib/auth-client"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "#",
      icon: IconDashboard,
    },
    {
      title: "Analytics",
      url: "#",
      icon: IconChartBar,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
    },
    {
      title: "Search",
      url: "#",
      icon: IconSearch,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const session = authClient.useSession()
  const sessionUser = session.data?.user ?? null

  const navUser = React.useMemo(
    () => ({
      name:
        sessionUser?.name ??
        sessionUser?.email ??
        (session.isPending ? "Loading…" : "Not signed in"),
      email: sessionUser?.email ?? "",
      avatar: (sessionUser as { image?: string | null } | null)?.image ?? null,
    }),
    [sessionUser, session.isPending],
  )

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="px-1.5">
              <a href="#">
                <IconInnerShadowTop className="size-5" />
                <span className="text-base font-semibold">Prefix</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={navUser} isLoading={session.isPending} />
      </SidebarFooter>
    </Sidebar>
  )
}
