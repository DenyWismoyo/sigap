import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkwRequest } from "@/types";
import { FileText, Clock, CheckCircle2, XCircle } from "lucide-react";

interface SkwStatsProps {
  data: SkwRequest[];
}

export default function SkwStats({ data }: SkwStatsProps) {
  const total = data.length;
  const diajukan = data.filter(item => item.status === 'Diajukan').length;
  const disetujui = data.filter(item => item.status === 'Disetujui').length;
  const ditolak = data.filter(item => item.status === 'Ditolak').length;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Permohonan</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{total}</div>
          <p className="text-xs text-muted-foreground">Seluruh permohonan masuk</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Menunggu Verifikasi</CardTitle>
          <Clock className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{diajukan}</div>
          <p className="text-xs text-muted-foreground">Permohonan status diajukan</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Disetujui</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{disetujui}</div>
          <p className="text-xs text-muted-foreground">SKW telah diterbitkan</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ditolak</CardTitle>
          <XCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{ditolak}</div>
          <p className="text-xs text-muted-foreground">Permohonan dikembalikan</p>
        </CardContent>
      </Card>
    </div>
  );
}