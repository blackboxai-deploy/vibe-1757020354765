'use client';

// Diagnostic report viewer and management component

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ReportGenerator } from '@/lib/report-generator';
import { DiagnosticReport, Finding } from '@/types/diagnostic';

interface ReportViewerProps {
  report: DiagnosticReport;
  onExportReport?: (report: DiagnosticReport) => void;
  onSaveReport?: (report: DiagnosticReport) => void;
}

export function ReportViewer({ report, onExportReport, onSaveReport }: ReportViewerProps) {
  const [activeTab, setActiveTab] = useState('summary');
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Group findings by severity
  const findingsBySeverity = {
    critical: report.findings.filter(f => f.severity === 'critical'),
    high: report.findings.filter(f => f.severity === 'high'),
    moderate: report.findings.filter(f => f.severity === 'moderate'),
    low: report.findings.filter(f => f.severity === 'low')
  };

  // Handle report export
  const handleExport = async () => {
    setExporting(true);
    try {
      if (onExportReport) {
        await onExportReport(report);
      } else {
        // Default export as text file
        const blob = ReportGenerator.exportAsText(report);
        const url = URL.createObjectURL(blob);
        const filename = ReportGenerator.generateReportFilename(report);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  // Handle report save
  const handleSave = async () => {
    setSaving(true);
    try {
      if (onSaveReport) {
        await onSaveReport(report);
      } else {
        // Default save via API
        await fetch('/api/reports', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ report })
        });
      }
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  // Get severity badge color
  const getSeverityColor = (severity: Finding['severity']) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'moderate': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  // Format confidence level
  const formatConfidence = (confidence: number) => {
    if (confidence >= 90) return { text: 'Very High', color: 'text-green-600' };
    if (confidence >= 75) return { text: 'High', color: 'text-blue-600' };
    if (confidence >= 60) return { text: 'Moderate', color: 'text-yellow-600' };
    return { text: 'Low', color: 'text-red-600' };
  };

  const confidenceDisplay = formatConfidence(report.confidence);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-blue-700">Diagnostic Report</CardTitle>
            <CardDescription>
              Generated on {report.generatedAt.toLocaleString()} • {report.imageCount} images analyzed
              {report.patientId && ` • Patient: ${report.patientId}`}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Report'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </div>
        
        {/* Report Metadata */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <div>
            <span className="font-medium">Report ID:</span> {report.id}
          </div>
          <div>
            <span className="font-medium">Processing Time:</span> {Math.round(report.processingTime / 1000)}s
          </div>
          <div>
            <span className="font-medium">Overall Confidence:</span>
            <span className={`ml-1 font-medium ${confidenceDisplay.color}`}>
              {report.confidence}% ({confidenceDisplay.text})
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="findings">
              Findings 
              {report.findings.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {report.findings.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="full-report">Full Report</TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Executive Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{report.summary}</p>
                
                {/* Critical Findings Alert */}
                {findingsBySeverity.critical.length > 0 && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertDescription>
                      <strong>CRITICAL:</strong> {findingsBySeverity.critical.length} critical finding(s) requiring immediate attention.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Findings Tab */}
          <TabsContent value="findings" className="space-y-4">
            {report.findings.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-gray-500">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-green-600 text-2xl">✓</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-700">No Significant Abnormalities</h3>
                    <p className="text-sm">No significant abnormalities detected in the analyzed images.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {/* Critical Findings */}
                  {findingsBySeverity.critical.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-red-600 mb-3">🚨 Critical Findings</h3>
                      {findingsBySeverity.critical.map((finding) => (
                        <Card key={finding.id} className="border-red-200">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between mb-2">
                              <Badge variant={getSeverityColor(finding.severity)}>Critical</Badge>
                              <span className="text-sm text-gray-500">{finding.confidence}% confidence</span>
                            </div>
                            <p className="text-gray-700 mb-2">{finding.description}</p>
                            {finding.location && (
                              <p className="text-sm text-gray-500">
                                <span className="font-medium">Location:</span> {finding.location}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      <Separator className="my-4" />
                    </div>
                  )}

                  {/* High Severity Findings */}
                  {findingsBySeverity.high.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-orange-600 mb-3">⚠️ High Severity Findings</h3>
                      {findingsBySeverity.high.map((finding) => (
                        <Card key={finding.id} className="border-orange-200">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between mb-2">
                              <Badge variant={getSeverityColor(finding.severity)}>High</Badge>
                              <span className="text-sm text-gray-500">{finding.confidence}% confidence</span>
                            </div>
                            <p className="text-gray-700 mb-2">{finding.description}</p>
                            {finding.location && (
                              <p className="text-sm text-gray-500">
                                <span className="font-medium">Location:</span> {finding.location}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      <Separator className="my-4" />
                    </div>
                  )}

                  {/* Moderate Findings */}
                  {findingsBySeverity.moderate.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-blue-600 mb-3">📋 Moderate Findings</h3>
                      {findingsBySeverity.moderate.map((finding) => (
                        <Card key={finding.id} className="border-blue-200">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between mb-2">
                              <Badge variant={getSeverityColor(finding.severity)}>Moderate</Badge>
                              <span className="text-sm text-gray-500">{finding.confidence}% confidence</span>
                            </div>
                            <p className="text-gray-700 mb-2">{finding.description}</p>
                            {finding.location && (
                              <p className="text-sm text-gray-500">
                                <span className="font-medium">Location:</span> {finding.location}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      <Separator className="my-4" />
                    </div>
                  )}

                  {/* Low Severity Findings */}
                  {findingsBySeverity.low.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-600 mb-3">📝 Observations</h3>
                      {findingsBySeverity.low.map((finding) => (
                        <Card key={finding.id} className="border-gray-200">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between mb-2">
                              <Badge variant={getSeverityColor(finding.severity)}>Low</Badge>
                              <span className="text-sm text-gray-500">{finding.confidence}% confidence</span>
                            </div>
                            <p className="text-gray-700 mb-2">{finding.description}</p>
                            {finding.location && (
                              <p className="text-sm text-gray-500">
                                <span className="font-medium">Location:</span> {finding.location}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Clinical Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                {report.recommendations.length === 0 ? (
                  <p className="text-gray-500">
                    No specific recommendations at this time. Continue routine follow-up as clinically indicated.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {report.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium" role="presentation">
                          {index + 1}
                        </span>
                        <p className="text-gray-700">{recommendation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Full Report Tab */}
          <TabsContent value="full-report">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Complete Diagnostic Report</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                    {ReportGenerator.formatReportForDisplay(report)}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}