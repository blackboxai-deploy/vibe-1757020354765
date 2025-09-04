// API route for managing diagnostic reports

import { NextRequest, NextResponse } from 'next/server';
import { ReportGenerator } from '@/lib/report-generator';
import { ApiResponse, DiagnosticReport } from '@/types/diagnostic';

// Get reports (in production, this would query a database)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  const patientId = searchParams.get('patientId');

  try {
    if (sessionId) {
      // Return specific report for session
      return NextResponse.json<ApiResponse<{ report: DiagnosticReport | null }>>({
        success: true,
        data: {
          report: null // In production, query database by sessionId
        },
        message: 'Report retrieval by session ID - requires database integration'
      });
    }

    if (patientId) {
      // Return all reports for patient
      return NextResponse.json<ApiResponse<{ reports: DiagnosticReport[] }>>({
        success: true,
        data: {
          reports: [] // In production, query database by patientId
        },
        message: 'Report retrieval by patient ID - requires database integration'
      });
    }

    // Return all reports (paginated in production)
    return NextResponse.json<ApiResponse<{ reports: DiagnosticReport[] }>>({
      success: true,
      data: {
        reports: [] // In production, query database with pagination
      },
      message: 'Report listing - requires database integration'
    });

  } catch (error) {
    console.error('Reports GET error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Internal server error retrieving reports'
    }, { status: 500 });
  }
}

// Save/update a diagnostic report
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { report }: { report: DiagnosticReport } = body;

    if (!report || !report.id || !report.sessionId) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Invalid report data - missing required fields'
      }, { status: 400 });
    }

    // In production, save to database
    console.log(`Saving report ${report.id} for session ${report.sessionId}`);
    
    // Generate formatted report for logging
    const formattedReport = ReportGenerator.formatReportForDisplay(report);
    console.log('Generated Report:\n', formattedReport);

    return NextResponse.json<ApiResponse<{ report: DiagnosticReport }>>({
      success: true,
      data: { report },
      message: 'Report saved successfully (requires database integration for persistence)'
    });

  } catch (error) {
    console.error('Reports POST error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Internal server error saving report'
    }, { status: 500 });
  }
}

// Export report as downloadable file
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { report, format = 'text' }: { report: DiagnosticReport; format?: string } = body;

    if (!report || !report.id) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Invalid report data for export'
      }, { status: 400 });
    }

    if (format === 'text') {
      const textBlob = ReportGenerator.exportAsText(report);
      const textContent = await textBlob.text();
      const filename = ReportGenerator.generateReportFilename(report);

      return new NextResponse(textContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Unsupported export format'
    }, { status: 400 });

  } catch (error) {
    console.error('Reports export error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Internal server error exporting report'
    }, { status: 500 });
  }
}

// Delete a report
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const reportId = searchParams.get('reportId');

  if (!reportId) {
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Report ID is required for deletion'
    }, { status: 400 });
  }

  try {
    // In production, delete from database
    console.log(`Deleting report ${reportId}`);

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: `Report ${reportId} deleted successfully (requires database integration)`
    });

  } catch (error) {
    console.error('Reports DELETE error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Internal server error deleting report'
    }, { status: 500 });
  }
}