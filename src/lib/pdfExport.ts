import { jsPDF } from 'jspdf';
import { CivicReport } from '../types';

/**
 * Exports a highly polished, professional PDF report of active civic reports
 * tailored for municipal executive review and department dispatch records.
 */
export const exportCivicIssuesToPdf = (
  reports: CivicReport[],
  activeFilter: string = 'reported',
  reviewerEmail: string = 'officer.review@city.gov',
  officerSignature: string = ''
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageHeight = 297;
  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin; // 180mm
  let currentY = 15;
  let pageNumber = 1;

  // Colors
  const primaryColor = [2, 44, 34]; // Emerald-950 (Dark Municipal Green)
  const secondaryColor = [16, 185, 129]; // Emerald-500
  const accentBorderColor = [20, 83, 45]; // Emerald-900 border
  const textColorDark = [17, 24, 39]; // Slate-900
  const textColorMuted = [107, 114, 128]; // Slate-500
  const ruleColor = [229, 231, 235]; // Gray-200 or border-slate-100

  // Standard line height helper
  const adjustY = (amount: number) => {
    currentY += amount;
  };

  // Helper to draw clean running header/footer on page change
  const drawPageHeaderAndFooter = (pageNum: number) => {
    // Top border accent
    doc.setFillColor(2, 44, 34); // #022c22
    doc.rect(margin, 10, contentWidth, 1.5, 'F');

    // Header Text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text('CIVICAI MUNICIPAL DISPATCH NETWORK', margin, 15);
    
    // ISO/Formal Report ID
    const today = new Date().toISOString().split('T')[0];
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.text(`REF-ID: CIVIC-${today}-${activeFilter.toUpperCase()}`, pageWidth - margin - 50, 15, { align: 'right' });

    // Header divider line
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.2);
    doc.line(margin, 17, pageWidth - margin, 17);

    // Footer - Running Page & Certification
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text('CONFIDENTIAL • FOR INTERNAL GOVERNMENT REVIEW ONLY', margin, pageHeight - 11);
    doc.setFont('courier', 'bold');
    doc.text(`PAGE ${pageNum}`, pageWidth - margin, pageHeight - 11, { align: 'right' });
  };

  // Ensure ample room exists for components, otherwise add fresh page
  const ensureSpace = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 20) {
      doc.addPage();
      pageNumber++;
      drawPageHeaderAndFooter(pageNumber);
      currentY = 24; // start below header line
    }
  };

  // --- INITIAL PAGE: FRONT MATTERS & CORPORATE HEADER ---
  // Draw primary decorative municipal block
  doc.setFillColor(2, 44, 34); // Emerald 950
  doc.rect(margin, currentY, contentWidth, 38, 'F');

  // Title inside header block
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('CIVICAI INFRASTRUCTURE ASSESSMENT REPORT', margin + 6, currentY + 12);

  // Subtitle
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9.5);
  doc.setTextColor(16, 185, 129); // emerald accent
  doc.text('Strategic Dispatch Grid, Priority Queue & Deprecating Risk Indices', margin + 6, currentY + 19);

  // Bottom row stats metadata block in header
  const reportTime = new Date().toLocaleString();
  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(209, 213, 219);
  doc.text(`GENERATED: ${reportTime}`, margin + 6, currentY + 31);
  doc.text(`MUNICIPAL PORTAL REVIEWER: ${reviewerEmail}`, margin + 6, currentY + 34);

  adjustY(44);

  // Statistics Summary panel
  const totalIssues = reports.length;
  const criticalIssues = reports.filter(r => r.severity === 'critical' || r.severity === 'high').length;
  const resolvedIssues = reports.filter(r => r.status === 'resolved').length;
  const avgPriority = totalIssues > 0 
    ? Math.round(reports.reduce((acc, curr) => acc + (curr.priorityScore || 0), 0) / totalIssues) 
    : 0;

  ensureSpace(25);
  // Drawing Stats Grid Cards
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.setFillColor(249, 250, 251); // Soft neutral background
  doc.rect(margin, currentY, contentWidth, 20, 'FD');

  // Grid vertical separator lines
  doc.line(margin + 45, currentY, margin + 45, currentY + 20);
  doc.line(margin + 90, currentY, margin + 90, currentY + 20);
  doc.line(margin + 135, currentY, margin + 135, currentY + 20);

  // Stat Card 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text('TOTAL TICKETS IN VIEW', margin + 4, currentY + 5.5);
  doc.setFont('courier', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(2, 44, 34);
  doc.text(`${totalIssues}`, margin + 4, currentY + 14);

  // Stat Card 2
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text('CRITICAL / HIGH LEVEL', margin + 45 + 4, currentY + 5.5);
  doc.setFont('courier', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(185, 28, 28); // red
  doc.text(`${criticalIssues}`, margin + 45 + 4, currentY + 14);

  // Stat Card 3
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text('RESOLVED TALLY', margin + 90 + 4, currentY + 5.5);
  doc.setFont('courier', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(5, 150, 105); // green
  doc.text(`${resolvedIssues}`, margin + 90 + 4, currentY + 14);

  // Stat Card 4
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text('AVG PRIORITY WEIGHT', margin + 135 + 4, currentY + 5.5);
  doc.setFont('courier', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(217, 119, 6); // amber/orange
  doc.text(`${avgPriority}%`, margin + 135 + 4, currentY + 14);

  adjustY(24);

  // Section: Dispatch Listing
  ensureSpace(12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(2, 44, 34);
  doc.text(`DISPATCH ISSUES QUEUE (Scope Index: ${activeFilter.toUpperCase()})`, margin, currentY);
  
  // Underline
  doc.setDrawColor(2, 44, 34);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY + 1.5, margin + 40, currentY + 1.5);
  
  adjustY(5.5);

  if (reports.length === 0) {
    ensureSpace(20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text('No active reports found in the selected category for government dispatch.', margin + 4, currentY + 10);
    adjustY(15);
  } else {
    // Process each report with clean alignment and text wrapping
    reports.forEach((report, index) => {
      // Estimate heights needed:
      // Title wrap (1-2 lines), description wrap (1-3 lines), suggestions wrap
      const textTitleLines = doc.splitTextToSize(`${index + 1}. [${report.id}] ${report.title.toUpperCase()}`, contentWidth - 30);
      const testDescLines = doc.splitTextToSize(report.description || 'No description supplied', contentWidth - 10);
      const testActionLines = doc.splitTextToSize(`Gemini Recommendation: ${report.resolutionRecommendations ? report.resolutionRecommendations.join(', ') : 'Examine on-site and delegate to specific civil field division.'}`, contentWidth - 10);
      
      const linesHeight = (textTitleLines.length * 4.5) + (testDescLines.length * 4) + (testActionLines.length * 4) + 24; // approximate height buffer of elements

      ensureSpace(linesHeight);

      // Card Container outline
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.2);
      // Soft neutral fill
      doc.setFillColor(252, 253, 254);
      doc.rect(margin, currentY, contentWidth, linesHeight - 4, 'FD');

      // Left accent column border for High/Critical priority
      if (report.severity === 'critical') {
        doc.setFillColor(185, 28, 28); // solid red bar
        doc.rect(margin, currentY, 1.8, linesHeight - 4, 'F');
      } else if (report.severity === 'high') {
        doc.setFillColor(217, 119, 6); // amber bar
        doc.rect(margin, currentY, 1.8, linesHeight - 4, 'F');
      } else {
        doc.setFillColor(16, 185, 129); // emerald bar
        doc.rect(margin, currentY, 1.8, linesHeight - 4, 'F');
      }

      // Draw Title and ID
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(2, 44, 34);
      
      let titleY = currentY + 6;
      textTitleLines.forEach((line: string) => {
        doc.text(line, margin + 4, titleY);
        titleY += 4.5;
      });

      // Priority and Severity Badge labels
      const statusText = `STATUS: ${report.status.toUpperCase()}`;
      const severityText = `SEVERITY: ${report.severity.toUpperCase()}`;
      const priorityText = `PRIORITY WEIGHT: ${report.priorityScore}%`;

      doc.setFont('courier', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(107, 114, 128);
      doc.text(`${severityText}    |    ${statusText}    |    ${priorityText}`, margin + 4, titleY + 0.5);

      titleY += 4.3;

      // Location specs
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(75, 85, 99);
      doc.text(`Location: ${report.location.address || 'District Coordinates'} (Area: ${report.location.areaName || 'Municipal Central'})`, margin + 4, titleY + 0.3);

      titleY += 4.6;

      // Separator line inside report card
      doc.setDrawColor(243, 244, 246);
      doc.line(margin + 4, titleY - 0.5, margin + contentWidth - 4, titleY - 0.5);

      // Description
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(55, 65, 81);
      
      testDescLines.forEach((line: string) => {
        doc.text(line, margin + 4, titleY + 1.2);
        titleY += 3.8;
      });

      titleY += 1.5;

      // Recommendations / Action item (Muted gray alert box background)
      doc.setFillColor(243, 244, 246);
      doc.rect(margin + 4, titleY - 1, contentWidth - 8, testActionLines.length * 3.8 + 2.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(6, 95, 70); // deep green for micro-intelligence header

      let actionY = titleY + 1.8;
      testActionLines.forEach((line: string, lineIndex: number) => {
        if (lineIndex === 0) {
          doc.text(line, margin + 5.5, actionY);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(55, 65, 81);
          doc.text(line, margin + 5.5, actionY);
        }
        actionY += 3.8;
      });

      // Advance row coordinate
      adjustY(linesHeight + 2);
    });
  }

  // --- SIGN-OFF FORM BLOCK ---
  // Ensure we have comfortable space for signatures, or force output on subsequent page
  ensureSpace(42);

  adjustY(4);
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.4);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  adjustY(6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(2, 44, 34);
  doc.text('MUNICIPAL DISPATCH REVIEW & SIGN-OFF CERTIFICATION', margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.3);
  doc.setTextColor(107, 114, 128);
  doc.text('I hereby certify that the listed municipal hazards have been inspected, triaged under cryptographic citizen consensus, and are officially assigned to responsible departments.', margin, currentY + 3.8);

  adjustY(18);

  // Custom Officer Signature & Dispatch Date overlay on the document lines
  if (officerSignature) {
    doc.setFont('courier', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(2, 44, 34); // Deep Emerald
    doc.text(officerSignature, margin + 4, currentY - 2.5);
  }

  const todayDateString = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  doc.setFont('courier', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39); // Slate-900
  doc.text(todayDateString, pageWidth - margin - 55 + 2, currentY - 2.5);

  // Line for signature
  doc.setDrawColor(156, 163, 175);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, margin + 65, currentY);
  doc.line(pageWidth - margin - 55, currentY, pageWidth - margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text('MUNICIPAL SUPERVISOR / AUDITOR SIGNATURE', margin, currentY + 3.5);
  doc.text('DATE OF OFFICIAL DISPATCH', pageWidth - margin - 55, currentY + 3.5);

  // Run initial page number headers
  for (let p = 1; p <= pageNumber; p++) {
    doc.setPage(p);
    drawPageHeaderAndFooter(p);
  }

  // Fire prompt download on the client browser
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  doc.save(`Swachhtam_Municipal_Report_${activeFilter}_${timestamp}.pdf`);
  console.log("PDF Report successfully generated and downloaded.");
};
