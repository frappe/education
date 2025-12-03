import { StatsCard } from "../dashboard/StatsCard";
import { Users } from "lucide-react";

export default function StatsCardExample() {
  return (
    <div className="p-4">
      <StatsCard
        title="Total Students"
        value="1,234"
        icon={Users}
        trend={{ value: 12, isPositive: true }}
      />
    </div>
  );
}
