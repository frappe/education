import { useParams } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, Phone, Calendar, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import studentsData from "@/mockData/students.json";
import { getInitials, formatDate } from "@/utils/helpers";

export default function StudentProfile() {
  const params = useParams();
  const student = studentsData.find((s) => s.id === params?.id);

  if (!student) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold">Student not found</h2>
          <Link href="/students">
            <Button className="mt-4">Back to Students</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/students">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold" data-testid="text-student-name">
              Student Profile
            </h1>
            <p className="text-muted-foreground">View and manage student details</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Student Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <Avatar className="w-24 h-24">
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {getInitials(student.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{student.name}</h3>
                  <p className="text-muted-foreground">{student.id}</p>
                </div>
                <Badge>{student.class}</Badge>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-start gap-3 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{student.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">{student.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">Date of Birth</p>
                    <p className="font-medium">{formatDate(student.dateOfBirth)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">Address</p>
                    <p className="font-medium">{student.address}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="md:col-span-2">
            <Tabs defaultValue="overview">
              <TabsList className="bg-[#7880872e]">
                <TabsTrigger value="overview" data-testid="tab-overview">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="academic" data-testid="tab-academic">
                  Academic
                </TabsTrigger>
                <TabsTrigger value="attendance" data-testid="tab-attendance">
                  Attendance
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Roll Number</p>
                        <p className="font-medium">{student.rollNo}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Gender</p>
                        <p className="font-medium">{student.gender}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Blood Group</p>
                        <p className="font-medium">{student.bloodGroup}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Admission Date</p>
                        <p className="font-medium">{formatDate(student.admissionDate)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Guardian Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Father's Name</p>
                        <p className="font-medium">{student.fatherName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Mother's Name</p>
                        <p className="font-medium">{student.motherName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Guardian Contact</p>
                        <p className="font-medium">{student.guardianPhone}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="academic">
                <Card>
                  <CardHeader>
                    <CardTitle>Academic Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Academic records will be displayed here
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="attendance">
                <Card>
                  <CardHeader>
                    <CardTitle>Attendance Record</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Overall Attendance</span>
                        <Badge
                          variant={student.attendance >= 90 ? "default" : "secondary"}
                        >
                          {student.attendance}%
                        </Badge>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${student.attendance}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
