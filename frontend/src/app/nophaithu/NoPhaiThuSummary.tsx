import StatsCard from "@/components/ui/StatsCard";
import { FileText, Clock, AlertTriangle, DollarSign } from "lucide-react";

interface NoPhaiThuSummaryProps {
  summaryCards: Array<{
    title: string;
    value: string;
    icon: string;
    color: string;
  }>;
}

export default function NoPhaiThuSummary({ summaryCards }: NoPhaiThuSummaryProps) {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "FileText": return FileText;
      case "Clock": return Clock;
      case "AlertTriangle": return AlertTriangle;
      case "DollarSign": return DollarSign;
      default: return FileText;
    }
  };

  const getCardStyle = (color: string) => {
    switch (color) {
      case "blue":
        return {
          gradient: "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200",
          iconBg: "bg-blue-100",
          textColor: "text-blue-700",
        };
      case "indigo":
        return {
          gradient: "bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200",
          iconBg: "bg-indigo-100",
          textColor: "text-indigo-700",
        };
      case "red":
        return {
          gradient: "bg-gradient-to-br from-red-50 to-rose-50 border-red-200",
          iconBg: "bg-red-100",
          textColor: "text-red-700",
        };
      case "amber":
        return {
          gradient: "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200",
          iconBg: "bg-amber-100",
          textColor: "text-amber-700",
        };
      default:
        return {
          gradient: "bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200",
          iconBg: "bg-slate-100",
          textColor: "text-slate-700",
        };
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {summaryCards.map((card, index) => {
        const IconComponent = getIcon(card.icon);
        const style = getCardStyle(card.color);
        
        return (
          <StatsCard
            key={`nophaithu-stats-${index}`}
            data={{
              title: card.title,
              value: card.value,
              subtitle: "",
              description: "",
              icon: IconComponent,
              gradient: style.gradient,
              iconBg: style.iconBg,
              textColor: style.textColor,
            }}
          />
        );
      })}
    </div>
  );
}