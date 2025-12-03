import { useParams } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, Phone, Calendar, Briefcase } from "lucide-react";
import { Link } from "react-router-dom";
import teachersData from "@/mockData/teachers.json";
import { getInitials, formatDate } from "@/utils/helpers";

export default function TeacherProfile() {
  const params = useParams();
  const teacher = teachersData.find((t) => t.id === params?.id);

  if (!teacher) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold">Teacher not found</h2>
          <Link href="/teachers">
            <Button className="mt-4">Back to Teachers</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/teachers">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold" data-testid="text-teacher-name">
              Teacher Profile
            </h1>
            <p className="text-muted-foreground">View and manage teacher details</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Teacher Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <Avatar className="w-24 h-24">
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {getInitials(teacher.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{teacher.name}</h3>
                  <p className="text-muted-foreground">{teacher.id}</p>
                </div>
                <div className="flex gap-2">
                  <Badge>{teacher.subject}</Badge>
                  <Badge variant="secondary">{teacher.department}</Badge>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-start gap-3 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{teacher.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">{teacher.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">Joining Date</p>
                    <p className="font-medium">{formatDate(teacher.dateOfJoining)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Briefcase className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">Experience</p>
                    <p className="font-medium">{teacher.experience}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Professional Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Qualification</p>
                    <p className="font-medium">{teacher.qualification}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Subject</p>
                    <p className="font-medium">{teacher.subject}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-medium">{teacher.department}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Experience</p>
                    <p className="font-medium">{teacher.experience}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{teacher.address}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
