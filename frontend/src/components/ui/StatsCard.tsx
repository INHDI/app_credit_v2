import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StatsCard as StatsCardType } from "@/types/index";

interface StatsCardProps {
  data: StatsCardType;
}

export default function StatsCard({ data }: StatsCardProps) {
  const IconComponent = data.icon;
  
  return (
    <Card
      aria-label={data.title}
      className={`
      ${data.gradient}
      relative min-w-0 w-full overflow-hidden
      shadow-md hover:shadow-xl transition-all duration-300
      active:scale-[0.98]
      rounded-2xl border-0
    `}
    >
      {/* subtle gloss */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-white/10" />

      <CardHeader className="px-4 md:px-6 pb-2 md:pb-3">
        <div className="flex items-center justify-between gap-3 min-w-0">
          <CardTitle
            className={`
            ${data.textColor}
            text-sm md:text-base font-semibold tracking-tight
            truncate min-w-0
          `}
          >
            {data.title}
          </CardTitle>
          <div
            className={`
            w-9 h-9 md:w-10 md:h-10
            ${data.iconBg}
            rounded-xl md:rounded-2xl
            ring-1 ring-black/5
            flex items-center justify-center shrink-0
          `}
          >
            <IconComponent
              aria-hidden
              className={`h-4 w-4 md:h-5 md:w-5 ${data.textColor.replace('-700', '-600')}`}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
        <div
          className={`
          text-[20px] xs:text-[22px] md:text-[28px] font-semibold tracking-tight
          ${data.textColor.replace('-700', '-800')}
          mb-1 md:mb-2 leading-tight md:leading-snug
        `}
        >
          <div className="flex items-center gap-1 md:gap-2 justify-between min-w-0">
            <span className="truncate min-w-0 tabular-nums">{data.value}</span>
            {data.title === "Đã thu về" && data.description && (
              <span className="text-[10px] xs:text-xs md:text-xs text-black/60 dark:text-white/70 flex-shrink-0 truncate max-w-[55%]">
                {data.description}
              </span>
            )}
          </div>
        </div>

        {/* Mobile first - compact subtitle row */}
        <div className="flex items-center justify-between min-w-0 md:hidden">
          <p
            className={`
            ${data.textColor.replace('-700', '-600')} text-[11px] xs:text-xs truncate min-w-0
          `}
          >
            {data.subtitle}
          </p>
          {data.description && data.title !== "Đã thu về" && (
            <p
              className={`text-[10px] xs:text-xs ${data.textColor.replace('-700', '-500')} text-right flex-shrink-0 ml-2 truncate max-w-[50%]`}
            >
              {data.description}
            </p>
          )}
        </div>

        {/* Desktop - more breathing room */}
        <div className="hidden md:block">
          <p className={`${data.textColor.replace('-700', '-600')} text-sm`}>{data.subtitle}</p>
          {data.description && data.title !== "Đã thu về" && (
            <p className={`text-xs ${data.textColor.replace('-700', '-500')} mt-2`}>{data.description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
