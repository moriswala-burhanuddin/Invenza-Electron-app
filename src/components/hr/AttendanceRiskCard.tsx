import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, TrendingDown } from "lucide-react";

export interface RiskEmployee {
    employeeId: string;
    name: string;
    riskLevel: 'High' | 'Medium' | 'Low';
    insight: string;
    consistencyScore: number;
}

interface AttendanceRiskCardProps {
    employees: RiskEmployee[];
    summary: string;
}

export const AttendanceRiskCard = ({ employees, summary }: AttendanceRiskCardProps) => {
    const highRisk = employees.filter(e => e.riskLevel === 'High');

    return (
        <Card className="border-red-200 bg-red-50/10">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        AI Risk Detection
                    </CardTitle>
                    <Badge variant="destructive">{highRisk.length} High Risk</Badge>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-gray-600 mb-4 italic">
                    "{summary}"
                </p>
                <div className="space-y-4">
                    {highRisk.map(emp => (
                        <div key={emp.employeeId} className="p-3 bg-white rounded-lg border border-red-100 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-semibold text-gray-800">{emp.name}</h4>
                                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                        <TrendingDown className="h-3 w-3" />
                                        {emp.insight}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-red-600">{emp.consistencyScore}%</div>
                                    <span className="text-[10px] text-gray-400 uppercase">Consistency</span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {highRisk.length === 0 && (
                        <div className="text-center text-gray-500 py-4">
                            <Clock className="h-8 w-8 mx-auto mb-2 opacity-20" />
                            <p>No high risk attendance patterns detected.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
