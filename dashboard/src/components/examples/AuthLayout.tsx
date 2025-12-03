import { AuthLayout } from "../../layouts/AuthLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuthLayoutExample() {
  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <CardTitle>Login Example</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Auth content goes here
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
