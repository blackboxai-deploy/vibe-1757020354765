// Report generation and formatting utilities

import { DiagnosticReport, Finding, DiagnosticSession } from '@/types/diagnostic';

export class ReportGenerator {
  /**
   * Format diagnostic report for display
   */
  static formatReportForDisplay(report: DiagnosticReport): string {
    const sections = [
      this.generateReportHeader(report),
      this.generateSummarySection(report),
      this.generateFindingsSection(report),
      this.generateRecommendationsSection(report),
      this.generateFooter(report)
    ];

    return sections.join('\n\n');
  }

  /**
   * Generate report header with metadata
   */
  private static generateReportHeader(report: DiagnosticReport): string {
    const generatedDate = report.generatedAt.toLocaleString();
    const processingTime = this.formatProcessingTime(report.processingTime);

    return `DIAGNOSTIC REPORT
==================

Report ID: ${report.id}
Generated: ${generatedDate}
Images Analyzed: ${report.imageCount}
Processing Time: ${processingTime}
Overall Confidence: ${report.confidence}%
${report.patientId ? `Patient ID: ${report.patientId}` : ''}`;
  }

  /**
   * Generate summary section
   */
  private static generateSummarySection(report: DiagnosticReport): string {
    return `EXECUTIVE SUMMARY
================

${report.summary}`;
  }

  /**
   * Generate detailed findings section
   */
  private static generateFindingsSection(report: DiagnosticReport): string {
    if (report.findings.length === 0) {
      return `FINDINGS
========

No significant abnormalities detected in the analyzed images.`;
    }

    const findingsBySeverity = this.groupFindingsBySeverity(report.findings);
    const sections: string[] = ['FINDINGS', '========'];

    // Critical findings first
    if (findingsBySeverity.critical.length > 0) {
      sections.push('\n🚨 CRITICAL FINDINGS:');
      findingsBySeverity.critical.forEach((finding, index) => {
        sections.push(`${index + 1}. ${finding.description}`);
        sections.push(`   Location: ${finding.location}`);
        sections.push(`   Confidence: ${finding.confidence}%`);
      });
    }

    // High severity findings
    if (findingsBySeverity.high.length > 0) {
      sections.push('\n⚠️  HIGH SEVERITY FINDINGS:');
      findingsBySeverity.high.forEach((finding, index) => {
        sections.push(`${index + 1}. ${finding.description}`);
        sections.push(`   Location: ${finding.location}`);
        sections.push(`   Confidence: ${finding.confidence}%`);
      });
    }

    // Moderate findings
    if (findingsBySeverity.moderate.length > 0) {
      sections.push('\n📋 MODERATE FINDINGS:');
      findingsBySeverity.moderate.forEach((finding, index) => {
        sections.push(`${index + 1}. ${finding.description}`);
        sections.push(`   Location: ${finding.location}`);
        sections.push(`   Confidence: ${finding.confidence}%`);
      });
    }

    // Low severity findings
    if (findingsBySeverity.low.length > 0) {
      sections.push('\n📝 OBSERVATIONS:');
      findingsBySeverity.low.forEach((finding, index) => {
        sections.push(`${index + 1}. ${finding.description}`);
        sections.push(`   Location: ${finding.location}`);
        sections.push(`   Confidence: ${finding.confidence}%`);
      });
    }

    return sections.join('\n');
  }

  /**
   * Generate recommendations section
   */
  private static generateRecommendationsSection(report: DiagnosticReport): string {
    if (report.recommendations.length === 0) {
      return `CLINICAL RECOMMENDATIONS
========================

No specific recommendations at this time. Continue routine follow-up as clinically indicated.`;
    }

    const sections = ['CLINICAL RECOMMENDATIONS', '========================'];
    
    report.recommendations.forEach((recommendation, index) => {
      sections.push(`${index + 1}. ${recommendation}`);
    });

    return sections.join('\n');
  }

  /**
   * Generate report footer
   */
  private static generateFooter(report: DiagnosticReport): string {
    return `DISCLAIMER
==========

This report was generated using AI-assisted analysis and should be reviewed by a qualified radiologist before making clinical decisions. The findings and recommendations are based on image analysis and should be correlated with clinical presentation and other diagnostic information.

Report generated on ${report.generatedAt.toLocaleString()}`;
  }

  /**
   * Group findings by severity level
   */
  private static groupFindingsBySeverity(findings: Finding[]): {
    critical: Finding[];
    high: Finding[];
    moderate: Finding[];
    low: Finding[];
  } {
    return findings.reduce(
      (groups, finding) => {
        groups[finding.severity].push(finding);
        return groups;
      },
      {
        critical: [] as Finding[],
        high: [] as Finding[],
        moderate: [] as Finding[],
        low: [] as Finding[]
      }
    );
  }

  /**
   * Format processing time for display
   */
  private static formatProcessingTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Generate session summary for dashboard
   */
  static generateSessionSummary(session: DiagnosticSession): {
    status: string;
    progress: number;
    summary: string;
    criticalFindings: number;
    totalFindings: number;
  } {
    const completedBatches = session.batches.filter(b => b.status === 'completed').length;
    const progress = session.batches.length > 0 ? (completedBatches / session.batches.length) * 100 : 0;
    
    let criticalFindings = 0;
    let totalFindings = 0;
    
    if (session.finalReport) {
      criticalFindings = session.finalReport.findings.filter(f => f.severity === 'critical').length;
      totalFindings = session.finalReport.findings.length;
    }

    const statusText = this.getStatusText(session.status, progress);
    const summaryText = this.generateSessionSummaryText(session, criticalFindings, totalFindings);

    return {
      status: statusText,
      progress: Math.round(progress),
      summary: summaryText,
      criticalFindings,
      totalFindings
    };
  }

  /**
   * Get status text for session
   */
  private static getStatusText(status: DiagnosticSession['status'], progress: number): string {
    switch (status) {
      case 'uploading':
        return 'Uploading images...';
      case 'processing':
        return `Processing... (${Math.round(progress)}%)`;
      case 'completed':
        return 'Analysis complete';
      case 'error':
        return 'Error occurred';
      default:
        return 'Unknown status';
    }
  }

  /**
   * Generate session summary text
   */
  private static generateSessionSummaryText(
    session: DiagnosticSession,
    criticalFindings: number,
    totalFindings: number
  ): string {
    if (session.status === 'completed' && session.finalReport) {
      if (criticalFindings > 0) {
        return `⚠️ ${criticalFindings} critical finding(s) detected in ${session.totalImages} images`;
      } else if (totalFindings > 0) {
        return `📋 ${totalFindings} finding(s) identified in ${session.totalImages} images`;
      } else {
        return `✅ No significant abnormalities detected in ${session.totalImages} images`;
      }
    } else if (session.status === 'processing') {
      const completedBatches = session.batches.filter(b => b.status === 'completed').length;
      return `Processing ${session.totalImages} images in ${session.batches.length} batches (${completedBatches}/${session.batches.length} complete)`;
    } else if (session.status === 'error') {
      return `Error processing ${session.totalImages} images`;
    } else {
      return `Preparing to analyze ${session.totalImages} images`;
    }
  }

  /**
   * Export report as plain text
   */
  static exportAsText(report: DiagnosticReport): Blob {
    const content = this.formatReportForDisplay(report);
    return new Blob([content], { type: 'text/plain' });
  }

  /**
   * Generate filename for report export
   */
  static generateReportFilename(report: DiagnosticReport): string {
    const date = report.generatedAt.toISOString().split('T')[0];
    const patientPrefix = report.patientId ? `${report.patientId}_` : '';
    return `${patientPrefix}diagnostic_report_${date}.txt`;
  }
}