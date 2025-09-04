// AI integration for diagnostic report generation using Claude Sonnet 4

import { UploadedImage, ImageBatch, DiagnosticReport, Finding } from '@/types/diagnostic';

export class DiagnosticAI {
  private static readonly API_ENDPOINT = 'https://oi-server.onrender.com/chat/completions';
  private static readonly MODEL = 'openrouter/anthropic/claude-sonnet-4';
  private static readonly TIMEOUT = 5 * 60 * 1000; // 5 minutes

  private static readonly DEFAULT_SYSTEM_PROMPT = `You are an expert radiologist AI assistant specializing in medical image analysis and diagnostic report generation. 

Your role is to:
1. Analyze medical images with precision and clinical expertise
2. Identify abnormalities, pathologies, and significant findings
3. Provide detailed descriptions of anatomical structures and conditions
4. Assign confidence levels to your findings
5. Generate comprehensive diagnostic reports in structured format

For each batch of images, provide:
- SUMMARY: Overall assessment of the image set
- FINDINGS: Detailed list of abnormalities and significant observations
- RECOMMENDATIONS: Clinical recommendations based on findings
- CONFIDENCE: Overall confidence level (0-100%)

Format your response as structured JSON with the following schema:
{
  "summary": "Brief overall assessment",
  "findings": [
    {
      "description": "Detailed finding description",
      "severity": "low|moderate|high|critical",
      "location": "Anatomical location",
      "confidence": 85
    }
  ],
  "recommendations": ["Clinical recommendation 1", "Clinical recommendation 2"],
  "confidence": 92
}

Important guidelines:
- Be thorough but concise in your analysis
- Use proper medical terminology
- Indicate uncertainty when findings are ambiguous
- Consider differential diagnoses when appropriate
- Always recommend further evaluation when necessary`;

  /**
   * Get the current system prompt (exposed for user customization)
   */
  static getSystemPrompt(): string {
    return this.DEFAULT_SYSTEM_PROMPT;
  }

  /**
   * Process a batch of images through Claude Sonnet 4
   */
  static async processBatch(
    images: UploadedImage[],
    batchNumber: number,
    totalBatches: number,
    customPrompt?: string
  ): Promise<{ success: boolean; result?: string; error?: string }> {
    try {
      // Prepare multimodal content for the API
      const content = [
        {
          type: 'text',
          text: `Analyze this batch of medical images (Batch ${batchNumber}/${totalBatches}). Provide a comprehensive diagnostic assessment following the structured format specified in your instructions.`
        }
      ];

      // Add each image to the content array
      images.forEach((image) => {
        content.push({
          type: 'image_url',
          image_url: {
            url: `data:${image.type};base64,${image.base64}`
          }
        } as any);
      });

      const requestBody = {
        model: this.MODEL,
        messages: [
          {
            role: 'system',
            content: customPrompt || this.DEFAULT_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: content
          }
        ],
        max_tokens: 4000,
        temperature: 0.3 // Lower temperature for more consistent medical analysis
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'CustomerId': 'cus_S16jfiBUH2cc7P',
          'Content-Type': 'application/json',
          'Authorization': 'Bearer xxx'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid API response structure');
      }

      const result = data.choices[0].message.content;
      return { success: true, result };

    } catch (error) {
      console.error('Batch processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Compile individual batch results into a final diagnostic report
   */
  static compileFinalReport(
    sessionId: string,
    batches: ImageBatch[],
    patientId?: string
  ): DiagnosticReport {
    const allFindings: Finding[] = [];
    const allRecommendations: string[] = [];
    const summaries: string[] = [];
    let totalConfidence = 0;
    let validBatches = 0;

    // Process each batch result
    batches.forEach((batch, index) => {
      if (batch.status === 'completed' && batch.result) {
        try {
          const batchData = JSON.parse(batch.result);
          
          // Collect findings
          if (batchData.findings && Array.isArray(batchData.findings)) {
            batchData.findings.forEach((finding: any) => {
              allFindings.push({
                id: `finding-${index}-${allFindings.length}`,
                description: finding.description || 'No description provided',
                severity: finding.severity || 'moderate',
                location: finding.location || 'Not specified',
                confidence: finding.confidence || 50,
                relatedImages: batch.images.map(img => img.id)
              });
            });
          }

          // Collect recommendations
          if (batchData.recommendations && Array.isArray(batchData.recommendations)) {
            allRecommendations.push(...batchData.recommendations);
          }

          // Collect summaries
          if (batchData.summary) {
            summaries.push(`Batch ${index + 1}: ${batchData.summary}`);
          }

          // Track confidence
          if (batchData.confidence) {
            totalConfidence += batchData.confidence;
            validBatches++;
          }

        } catch (error) {
          console.error(`Failed to parse batch ${index + 1} result:`, error);
        }
      }
    });

    // Calculate overall metrics
    const totalImages = batches.reduce((sum, batch) => sum + batch.images.length, 0);
    const averageConfidence = validBatches > 0 ? Math.round(totalConfidence / validBatches) : 0;
    const processingStartTime = batches[0]?.processedAt || new Date();
    const processingEndTime = batches[batches.length - 1]?.processedAt || new Date();
    const processingTime = processingEndTime.getTime() - processingStartTime.getTime();

    // Generate comprehensive summary
    const comprehensiveSummary = this.generateComprehensiveSummary(
      summaries,
      allFindings,
      totalImages,
      batches.length
    );

    // Remove duplicate recommendations
    const uniqueRecommendations = [...new Set(allRecommendations)];

    return {
      id: `report-${sessionId}`,
      sessionId,
      patientId,
      summary: comprehensiveSummary,
      findings: allFindings,
      recommendations: uniqueRecommendations,
      confidence: averageConfidence,
      processingTime: processingTime,
      imageCount: totalImages,
      generatedAt: new Date()
    };
  }

  /**
   * Generate a comprehensive summary from batch summaries and findings
   */
  private static generateComprehensiveSummary(
    _summaries: string[],
    findings: Finding[],
    imageCount: number,
    batchCount: number
  ): string {
    const criticalFindings = findings.filter(f => f.severity === 'critical').length;
    const highFindings = findings.filter(f => f.severity === 'high').length;
    const moderateFindings = findings.filter(f => f.severity === 'moderate').length;
    const lowFindings = findings.filter(f => f.severity === 'low').length;

    let summary = `Comprehensive diagnostic analysis of ${imageCount} medical images processed across ${batchCount} batches. `;

    if (criticalFindings > 0) {
      summary += `CRITICAL: ${criticalFindings} critical finding(s) identified requiring immediate attention. `;
    }

    if (highFindings > 0) {
      summary += `${highFindings} high-severity finding(s) noted. `;
    }

    if (moderateFindings > 0) {
      summary += `${moderateFindings} moderate finding(s) observed. `;
    }

    if (lowFindings > 0) {
      summary += `${lowFindings} low-severity observation(s) documented. `;
    }

    if (findings.length === 0) {
      summary += 'No significant abnormalities detected in the analyzed images. ';
    }

    summary += 'Detailed findings and recommendations are provided below for clinical consideration.';

    return summary;
  }


}