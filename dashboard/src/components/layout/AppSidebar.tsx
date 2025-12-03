import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  ClipboardCheck, 
  FileText, 
  IndianRupee, 
  Settings,
  UserPlus,
  FileCheck,
  ClipboardList,
  Home,
  BarChart,
  ChevronDown,
  Award,
  Table,
  Percent,
  Calculator,
  Receipt,
  Calendar,
  CheckCircle2,
  PieChart,
  Inbox,
} from "lucide-react";
import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { AlertCircle, Coins } from "lucide-react";
import { APP_NAME } from "@/utils/constants";
import { useApp } from "@/context/AppContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    permission: null,
  },
  {
    title: "Admissions",
    icon: UserPlus,
    permission: "canManageAdmissions" as const,
    subItems: [
      {
        title: "Enquiries",
        url: "/admissions/enquiries",
        icon: FileText,
      },
      {
        title: "Registrations",
        url: "/admissions/registrations",
        icon: FileCheck,
      },
      {
        title: "Applications",
        url: "/admissions/applications",
        icon: ClipboardList,
      },
      {
        title: "Allocations",
        url: "/admissions/allocations",
        icon: Home,
      },
      {
        title: "Reports",
        url: "/admissions/reports",
        icon: BarChart,
      },
    ],
  },
  // TODO: Uncomment when module implementation is complete
  // {
  //   title: "Students",
  //   url: "/students",
  //   icon: Users,
  //   permission: "canManageStudents" as const,
  // },
  // {
  //   title: "Teachers",
  //   url: "/teachers",
  //   icon: GraduationCap,
  //   permission: "canManageTeachers" as const,
  // },
  // {
  //   title: "Attendance",
  //   url: "/attendance",
  //   icon: ClipboardCheck,
  //   permission: "canManageExams" as const,
  // },
  // {
  //   title: "Exams",
  //   url: "/exams",
  //   icon: FileText,
  //   permission: "canManageExams" as const,
  // },
  {
    title: "Fee Management",
    icon: IndianRupee,
    permission: "canManageFees" as const,
    subItems: [
      {
        title: "Dashboard",
        url: "/fees",
        icon: LayoutDashboard,
      },
      {
        title: "Collect Payment",
        url: "/fees/collection",
        icon: FileText,
      },
      {
        title: "View Receipts",
        url: "/fees/receipts",
        icon: Receipt,
      },
      {
        title: "Installments",
        url: "/fees/installments",
        icon: Calendar,
      },
      {
        title: "Bill Approval",
        url: "/fees/bill-approval",
        icon: CheckCircle2,
      },
      {
        title: "Student Fees",
        url: "/fees/students",
        icon: Users,
      },
      {
        title: "Fee Calculator",
        url: "/fees/calculator",
        icon: Calculator,
      },
      {
        title: "Fee Schemes",
        url: "/fees/schemes",
        icon: Award,
      },
      {
        title: "Fee Structure",
        url: "/fees/structure",
        icon: Table,
      },
      {
        title: "Discounts",
        url: "/fees/discounts",
        icon: Percent,
      },
      {
        title: "Reports",
        url: "/fees/reports",
        icon: PieChart,
      },
    ],
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    permission: "canManageSettings" as const,
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { hasPermission, user } = useApp();
  const [openSection, setOpenSection] = React.useState<string | null>(null);

  // Show all items if no user (allows testing without backend) or filter by permission
  const visibleItems = !user ? menuItems : menuItems.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  // Set initial open section based on current route
  React.useEffect(() => {
    const activeItem = visibleItems.find((item) => 
      item.subItems?.some(subItem => 
        location.pathname === subItem.url || location.pathname.startsWith(subItem.url + '/')
      )
    );
    if (activeItem && !openSection) {
      setOpenSection(activeItem.title);
    }
  }, [location.pathname, visibleItems, openSection]);

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-semibold">
            S
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm">{APP_NAME}</span>
            <span className="text-xs text-muted-foreground">Management</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => {
                if (item.subItems) {
                  const isOpen = openSection === item.title;
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      <Collapsible 
                        open={isOpen}
                        onOpenChange={(open) => setOpenSection(open ? item.title : null)}
                      >
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton data-testid={`link-${item.title.toLowerCase()}`}>
                            <item.icon className="w-4 h-4" />
                            <span>{item.title}</span>
                            <ChevronDown className="ml-auto h-4 w-4 transition-transform data-[state=open]:rotate-180" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.subItems.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={location.pathname === subItem.url}
                                  data-testid={`link-${subItem.title.toLowerCase()}`}
                                >
                                  <Link to={subItem.url}>
                                    <subItem.icon className="w-4 h-4" />
                                    <span>{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.url}
                      data-testid={`link-${item.title.toLowerCase().replace(" ", "-")}`}
                    >
                      <Link to={item.url!}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="text-xs text-muted-foreground">
          © 2025 Sanskar School
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
