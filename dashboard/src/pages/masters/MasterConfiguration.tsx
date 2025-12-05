import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  IndianRupee, 
  GraduationCap, 
  Settings2, 
  FileText, 
  Percent, 
  Layers,
  Calendar,
  BookOpen,
  Home,
  Clock,
  Users,
  ChevronRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { Breadcrumb } from "@/components/Breadcrumb";

interface MasterItem {
  name: string;
  description: string;
  icon: React.ElementType;
  path: string;
  status: "active" | "coming-soon";
}

interface MasterCategory {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  items: MasterItem[];
}

const masterCategories: MasterCategory[] = [
  {
    title: "Fee Masters",
    description: "Configure fee schemes, structures, and discount rules",
    icon: IndianRupee,
    color: "text-green-600",
    items: [
      {
        name: "Fee Schemes",
        description: "Manage fee schemes like Day Scholar, Hostel, RTE, MDY",
        icon: FileText,
        path: "/masters/fee/schemes",
        status: "active"
      },
      {
        name: "Fee Structure",
        description: "Configure class-wise fee amounts for all fee heads",
        icon: Layers,
        path: "/masters/fee/structure",
        status: "active"
      },
      {
        name: "Discount Management",
        description: "Setup discount rules - Sibling, Merit, Staff Children",
        icon: Percent,
        path: "/masters/fee/discounts",
        status: "active"
      }
    ]
  },
  {
    title: "Academic Masters",
    description: "Manage academic year, classes, sections, and subjects",
    icon: GraduationCap,
    color: "text-blue-600",
    items: [
      {
        name: "Academic Year",
        description: "Configure academic years and roll-over settings",
        icon: Calendar,
        path: "/masters/academic/academic-year",
        status: "active"
      },
      {
        name: "Classes",
        description: "Manage class levels, streams, and intake capacity",
        icon: BookOpen,
        path: "/masters/academic/classes",
        status: "active"
      },
      {
        name: "Sections",
        description: "Configure sections and class teacher assignments",
        icon: Layers,
        path: "/masters/academic/sections",
        status: "active"
      },
      {
        name: "Houses",
        description: "Configure student houses for activities",
        icon: Home,
        path: "/masters/academic/houses",
        status: "coming-soon"
      }
    ]
  },
  {
    title: "General Masters",
    description: "System-wide configuration settings",
    icon: Settings2,
    color: "text-purple-600",
    items: [
      {
        name: "Shift Timings",
        description: "Define school shift schedules",
        icon: Clock,
        path: "/masters/general/shifts",
        status: "coming-soon"
      },
      {
        name: "Staff Designations",
        description: "Manage staff roles and departments",
        icon: Users,
        path: "/masters/general/designations",
        status: "coming-soon"
      }
    ]
  }
];

export default function MasterConfiguration() {
  const navigate = useNavigate();

  const handleNavigate = (item: MasterItem) => {
    if (item.status === "active") {
      navigate(item.path);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Breadcrumb items={[
        { label: "Masters" },
        { label: "Configuration" }
      ]} />
      
      <PageHeader
        title="Master Configuration"
        description="Manage all system master data and configuration settings"
      />

        <div className="grid gap-6">
          {masterCategories.map((category, categoryIndex) => (
            <Card key={categoryIndex} data-testid={`card-category-${categoryIndex}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted ${category.color}`}>
                    <category.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{category.title}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {category.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                        item.status === "active" 
                          ? "hover-elevate cursor-pointer" 
                          : "opacity-60 cursor-not-allowed"
                      }`}
                      onClick={() => handleNavigate(item)}
                      data-testid={`master-item-${category.title.toLowerCase().replace(/\s+/g, '-')}-${itemIndex}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-muted">
                          <item.icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{item.name}</span>
                            {item.status === "coming-soon" && (
                              <Badge variant="secondary" className="text-xs">
                                Coming Soon
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      {item.status === "active" && (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
  );
}
