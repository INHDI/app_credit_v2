import StatsCard from "@/components/ui/StatsCard";

interface DebtorSummaryProps {
    summaryCards: any[];
}

export default function DebtorSummary({ summaryCards }: DebtorSummaryProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {summaryCards.map((card, index) => (
                <StatsCard key={`debtor-stats-${index}`} data={card} />
            ))}
        </div>
    );
}
