import { useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useApp } from "@/context/AppContext";

export default function SettingsPage() {
  const { user, theme, toggleTheme } = useApp();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);

  const handleSaveProfile = () => {
    console.log("Profile saved");
  };

  const handleSaveNotifications = () => {
    console.log("Notifications saved:", { emailNotifications, smsNotifications });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-settings-title">
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your personal information and contact details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  defaultValue={user?.name}
                  data-testid="input-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue={user?.email}
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  data-testid="input-phone"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  defaultValue={user?.role}
                  disabled
                  data-testid="input-role"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveProfile} data-testid="button-save-profile">
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Configure how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive updates via email
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
                data-testid="switch-email-notifications"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sms-notifications">SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive alerts via SMS
                </p>
              </div>
              <Switch
                id="sms-notifications"
                checked={smsNotifications}
                onCheckedChange={setSmsNotifications}
                data-testid="switch-sms-notifications"
              />
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={handleSaveNotifications} data-testid="button-save-notifications">
                Save Preferences
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize the look and feel of the application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Theme</Label>
                <p className="text-sm text-muted-foreground">
                  Current theme: {theme === "light" ? "Light" : "Dark"}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={toggleTheme}
                data-testid="button-toggle-theme"
              >
                Toggle Theme
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>School Information</CardTitle>
            <CardDescription>
              General school configuration and details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="school-name">School Name</Label>
                <Input
                  id="school-name"
                  defaultValue="Sanskar School"
                  data-testid="input-school-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-code">School Code</Label>
                <Input
                  id="school-code"
                  defaultValue="SS2024"
                  data-testid="input-school-code"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="school-address">Address</Label>
                <Input
                  id="school-address"
                  defaultValue="123 Education Street, Delhi"
                  data-testid="input-school-address"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button data-testid="button-save-school">Save Changes</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
