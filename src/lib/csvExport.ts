import { CivicReport } from '../types';

/**
 * Utility to convert and export civic issues list to a properly escaped CSV file
 */
export function exportCivicIssuesToCsv(reports: CivicReport[], activeFilter: string) {
  const headers = [
    'ID',
    'Title',
    'Category',
    'Severity',
    'Status',
    'Urgency Score',
    'Department',
    'Area/Location',
    'Reported Date',
    'Upvotes'
  ];

  const escapeCsvValue = (val: any): string => {
    if (val === null || val === undefined) return '';
    let str = String(val);
    // Escape double quotes by doubling them
    str = str.replace(/"/g, '""');
    // If the string contains comma, double quote, or newlines, wrap in double quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str}"`;
    }
    return str;
  };

  const rows = reports.map(r => {
    const formattedDate = new Date(r.createdAt).toISOString();
    const locationStr = r.location.areaName || r.location.address || 'Unknown';
    const upvotesCount = r.communityVotes?.upvotes ?? 0;

    return [
      r.id,
      r.title,
      r.category,
      r.severity,
      r.status,
      r.urgencyScore,
      r.department,
      locationStr,
      formattedDate,
      upvotesCount
    ].map(escapeCsvValue);
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Trigger browser download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  link.setAttribute('href', url);
  link.setAttribute('download', `Swachhtam_Municipal_Report_${activeFilter}_${timestamp}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
