import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, errorMessage } from '@/lib/api-client';
import { useApiMutation } from '@/lib/query';
import type { ExportedReport, RecentReport, ReportPreview, ReportRequest } from '@/types';

export const reportKeys = {
  all: ['reports'] as const,
  recent: (limit: number) => [...reportKeys.all, 'recent', limit] as const,
};

export function usePreviewReport() {
  return useApiMutation({
    mutationFn: (input: ReportRequest) => api.post<ReportPreview>('/reports/preview', input),
    error: 'Failed to build preview',
  });
}

export function useExportReport() {
  return useApiMutation({
    mutationFn: (input: ReportRequest) => api.post<ExportedReport>('/reports/export', input),
    invalidate: [reportKeys.all],
    success: (report) => `Report ready · ${report.rowCount.toLocaleString()} rows`,
    error: 'Export failed',
  });
}

export function useRecentReports(limit = 10) {
  return useQuery({
    queryKey: reportKeys.recent(limit),
    queryFn: () => api.get<{ reports: RecentReport[] }>('/reports/recent', { limit }),
    select: (res) => res.reports,
  });
}

export function downloadReport(report: { id: string; fileName: string | null }) {
  return api
    .download('GET', `/reports/${report.id}/download`, {
      fallbackName: report.fileName ?? `report-${report.id}.csv`,
    })
    .catch((err: unknown) => toast.error(errorMessage(err, 'Download failed')));
}
