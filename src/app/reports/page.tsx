'use client';

// Reports history and management page

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DiagnosticReport } from '@/types/diagnostic';
import { ReportViewer } from '@/components/ReportViewer';
import { ReportGenerator } from '@/lib/report-generator';

export default function ReportsPage() {
  const [reports, setReports] = useState<DiagnosticReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<DiagnosticReport | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load reports on page load
  useEffect(() => {
    loadReports();
  }, []);

  // Load reports from API
  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reports');
      const result = await response.json();
      
      if (result.success) {
        setReports(result.data.reports || []);
      } else {
        setError(result.error || 'Failed to load reports');
      }
    } catch (err) {
      setError('Network error loading reports');
      console.error('Load reports error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter reports based on search query
  const filteredReports = reports.filter(report => {
    const searchLower = searchQuery.toLowerCase();
    return (
      report.id.toLowerCase().includes(searchLower) ||
      (report.patientId && report.patientId.toLowerCase().includes(searchLower)) ||
      report.summary.toLowerCase().includes(searchLower)
    );
  });

  // Get reports summary statistics
  const getReportsStats = () => {
    const totalReports = reports.length;
    const criticalReports = reports.filter(report => 
      report.findings.some(finding => finding.severity === 'critical')
    ).length;
    const highSeverityReports = reports.filter(report => 
      report.findings.some(finding => finding.severity === 'high')
    ).length;
    const normalReports = reports.filter(report => 
      report.findings.length === 0
    ).length;

    return {
      total: totalReports,
      critical: criticalReports,
      high: highSeverityReports,
      normal: normalReports
    };
  };

  // Handle report selection
  const selectReport = (report: DiagnosticReport) => {
    setSelectedReport(report);
  };

  // Handle report export
  const handleReportExport = async (report: DiagnosticReport) => {
    try {
      const response = await fetch('/api/reports', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ report, format: 'text' })
      });

      if (response.ok) {
        // Download the file
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const filename = ReportGenerator.generateReportFilename(report);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        
        URL.revokeObjectURL(url);
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export report');
    }
  };



  const stats = getReportsStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-blue-900 mb-2">
              Diagnostic Reports
            </h1>
            <p className="text-gray-600">
              Manage and review generated diagnostic reports
            </p>
          </div>
          <Button onClick={() => window.location.href = '/'}>
            New Analysis
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>
              {error}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setError(null)}
                className="ml-4"
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Reports</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
                <div className="text-sm text-gray-600">Critical Findings</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
                <div className="text-sm text-gray-600">High Severity</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.normal}</div>
                <div className="text-sm text-gray-600">Normal Studies</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Reports List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Reports List</CardTitle>
                <CardDescription>
                  {reports.length} diagnostic reports
                </CardDescription>
                
                {/* Search */}
                <div className="pt-4">
                  <Label htmlFor="search">Search Reports</Label>
                  <Input
                    id="search"
                    placeholder="Search by ID, patient, or content..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-gray-500">Loading reports...</div>
                    </div>
                  ) : filteredReports.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">📋</span>
                      </div>
                      <h3 className="text-lg font-medium text-gray-700">No Reports Found</h3>
                      <p className="text-sm text-gray-500">
                        {searchQuery ? 'No reports match your search criteria.' : 'Generate your first diagnostic report.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredReports.map((report) => {
                        const criticalFindings = report.findings.filter(f => f.severity === 'critical').length;
                        const highFindings = report.findings.filter(f => f.severity === 'high').length;
                        
                        return (
                          <Card 
                            key={report.id} 
                            className={`cursor-pointer transition-colors ${
                              selectedReport?.id === report.id ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'
                            }`}
                            onClick={() => selectReport(report)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="font-medium text-sm">
                                    {report.patientId || 'No Patient ID'}
                                  </div>
                                  <div className="text-xs text-gray-500 font-mono">
                                    {report.id.substring(0, 12)}...
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {report.generatedAt.toLocaleDateString()}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 mb-2">
                                {criticalFindings > 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    {criticalFindings} Critical
                                  </Badge>
                                )}
                                {highFindings > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {highFindings} High
                                  </Badge>
                                )}
                                {report.findings.length === 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    Normal
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="text-xs text-gray-600">
                                {report.imageCount} images • {Math.round(report.processingTime / 1000)}s
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Report Viewer */}
          <div className="lg:col-span-2">
            {selectedReport ? (
              <ReportViewer 
                report={selectedReport}
                onExportReport={handleReportExport}
                onSaveReport={async (report) => {
                  console.log('Save report:', report.id);
                }}
              />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-4xl">📋</span>
                    </div>
                    <h3 className="text-xl font-medium text-gray-700 mb-2">Select a Report</h3>
                    <p className="text-gray-500">
                      Choose a report from the list to view detailed diagnostic information.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}