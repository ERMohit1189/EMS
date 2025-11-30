/**
 * Performance Monitoring Utility
 * Tracks and displays page load metrics after login
 */

export interface PerformanceMetrics {
  pageLoadTime: number;
  domInteractive: number;
  domComplete: number;
  networkLatency: number;
  resourceCount: number;
  totalResourceSize: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  cumulativeLayoutShift?: number;
}

export const performanceMonitor = {
  /**
   * Get comprehensive performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paintEntries = performance.getEntriesByType('paint');
    
    const pageLoadTime = navigation?.loadEventEnd - navigation?.fetchStart || 0;
    const domInteractive = navigation?.domInteractive - navigation?.fetchStart || 0;
    const domComplete = navigation?.domComplete - navigation?.fetchStart || 0;
    const networkLatency = navigation?.responseEnd - navigation?.fetchStart || 0;
    
    // Get Web Vitals if available
    let fcp: number | undefined;
    let lcp: number | undefined;
    let cls: number | undefined;
    
    paintEntries.forEach((entry) => {
      if (entry.name === 'first-contentful-paint') {
        fcp = Math.round(entry.startTime);
      }
    });
    
    // Count resources
    const resources = performance.getEntriesByType('resource');
    const resourceCount = resources.length;
    const totalResourceSize = resources.reduce((sum, resource) => {
      const perfResource = resource as PerformanceResourceTiming;
      return sum + (perfResource.transferSize || 0);
    }, 0);
    
    return {
      pageLoadTime: Math.round(pageLoadTime),
      domInteractive: Math.round(domInteractive),
      domComplete: Math.round(domComplete),
      networkLatency: Math.round(networkLatency),
      resourceCount,
      totalResourceSize: Math.round(totalResourceSize / 1024), // Convert to KB
      firstContentfulPaint: fcp,
    };
  },

  /**
   * Log performance metrics to console
   */
  logMetrics(label: string = 'Page Load Performance'): PerformanceMetrics {
    const metrics = this.getMetrics();
    
    console.log(`
╔════════════════════════════════════════╗
║  ${label.padEnd(38)}║
╠════════════════════════════════════════╣
║ Page Load Time:        ${String(metrics.pageLoadTime + 'ms').padEnd(24)}║
║ DOM Interactive:       ${String(metrics.domInteractive + 'ms').padEnd(24)}║
║ DOM Complete:          ${String(metrics.domComplete + 'ms').padEnd(24)}║
║ Network Latency:       ${String(metrics.networkLatency + 'ms').padEnd(24)}║
║ Resources Loaded:      ${String(metrics.resourceCount).padEnd(24)}║
║ Total Resource Size:   ${String(metrics.totalResourceSize + 'KB').padEnd(24)}║
${metrics.firstContentfulPaint ? `║ First Contentful Paint: ${String(metrics.firstContentfulPaint + 'ms').padEnd(24)}║` : ''}
╚════════════════════════════════════════╝
    `);
    
    return metrics;
  },

  /**
   * Get human-readable performance assessment
   */
  getAssessment(metrics: PerformanceMetrics): {
    score: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    color: string;
    message: string;
  } {
    const { pageLoadTime } = metrics;
    
    if (pageLoadTime < 1000) {
      return {
        score: 'Excellent',
        color: 'text-green-600',
        message: '⚡ Outstanding performance! Page loaded very quickly.'
      };
    } else if (pageLoadTime < 2000) {
      return {
        score: 'Good',
        color: 'text-blue-600',
        message: '✓ Good performance. Page load time is acceptable.'
      };
    } else if (pageLoadTime < 3500) {
      return {
        score: 'Fair',
        color: 'text-yellow-600',
        message: '⚠ Fair performance. Page took a bit longer to load.'
      };
    } else {
      return {
        score: 'Poor',
        color: 'text-red-600',
        message: '✗ Poor performance. Page load time is slow.'
      };
    }
  }
};
