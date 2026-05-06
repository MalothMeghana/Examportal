/**
 * Analytics Service
 * Handles all API calls for real-time analytics with fallback support
 */

import { baseUrl } from '../config';

class AnalyticsService {
  constructor() {
    this.token = () => sessionStorage.getItem('token');
  }

  // Helper to make authenticated requests
  async fetchWithAuth(endpoint) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${this.token()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error(`Analytics fetch error (${endpoint}):`, error);
      return { success: false, error: error.message, data: null };
    }
  }

  /**
   * Admin Analytics APIs
   */
  async getAdminDashboard(orgId, filters = {}) {
    // Try analytics endpoint first, fallback to regular dashboard
    const analyticsResult = await this.fetchWithAuth('/analytics/admin/dashboard');
    if (analyticsResult.success) return analyticsResult;
    
    // Fallback to admin dashboard
    return await this.fetchWithAuth('/admin/dashboard');
  }

  async getAdminSummary(orgId) {
    const result = await this.fetchWithAuth('/analytics/admin/summary');
    if (result.success) return result;
    
    // Fallback - extract from dashboard
    const dashboard = await this.fetchWithAuth('/admin/dashboard');
    if (dashboard.success && dashboard.data) {
      return {
        success: true,
        data: {
          total_exams: dashboard.data.cards?.totalExams || 0,
          active_exams: dashboard.data.cards?.activeExams || 0,
          total_users: dashboard.data.cards?.activeUsers || 0,
          avg_score: dashboard.data.cards?.avgPerformance || 0,
          completed_exams: dashboard.data.cards?.completedExams || 0
        }
      };
    }
    return { success: false, data: null };
  }

  /**
   * Invigilator Analytics APIs
   */
  async getInvigilatorLive(invigilatorId, orgId) {
    const result = await this.fetchWithAuth('/analytics/invigilator/live');
    if (result.success) return result;
    
    return await this.fetchWithAuth('/invigilator/dashboard');
  }

  async getInvigilatorDashboard(invigilatorId, orgId, filters = {}) {
    const result = await this.fetchWithAuth('/analytics/invigilator/dashboard');
    if (result.success) return result;
    
    return await this.fetchWithAuth('/invigilator/dashboard');
  }

  async getInvigilatorSummary(invigilatorId) {
    const result = await this.fetchWithAuth('/analytics/invigilator/summary');
    if (result.success) return result;
    
    const dashboard = await this.fetchWithAuth('/invigilator/dashboard');
    if (dashboard.success && dashboard.data) {
      return {
        success: true,
        data: {
          active_exams: dashboard.data.activeExams || 0,
          students_online: dashboard.data.studentsOnline || 0,
          pending_grading: dashboard.data.pendingGrading || 0,
          flagged_attempts: dashboard.data.flaggedAttempts || 0
        }
      };
    }
    return { success: false, data: null };
  }

  /**
   * User Analytics APIs
   */
  async getUserPerformance(userId, filters = {}) {
    const result = await this.fetchWithAuth('/analytics/user/performance');
    if (result.success) return result;
    
    // Fallback - try user exam results
    const examsResult = await this.fetchWithAuth('/user/my-exams');
    if (examsResult.success) {
      return {
        success: true,
        data: examsResult.data || []
      };
    }
    
    return { success: false, data: [] };
  }

  async getUserSummary(userId) {
    const result = await this.fetchWithAuth('/analytics/user/summary');
    if (result.success) return result;
    
    // Fallback to user dashboard
    const dashboard = await this.fetchWithAuth('/user/dashboard');
    if (dashboard.success && dashboard.data) {
      return {
        success: true,
        data: {
          total_exams_attempted: dashboard.data.examsTaken || 0,
          completed_count: dashboard.data.examsTaken || 0,
          average_score: dashboard.data.averageScore || 0,
          pass_rate: dashboard.data.passRate || 0,
          avg_time: dashboard.data.avgTime || 0,
          rank: dashboard.data.rank || 0
        }
      };
    }
    return { success: false, data: null };
  }

  async getUserRanking(userId, examId) {
    const result = await this.fetchWithAuth(`/analytics/user/ranking?examId=${examId}`);
    if (result.success) return result;
    
    return { success: false, data: null };
  }

  /**
   * SuperAdmin Analytics APIs
   */
  async getSuperAdminDashboard(filters = {}) {
    const result = await this.fetchWithAuth('/analytics/superadmin/dashboard');
    if (result.success) return result;
    
    return await this.fetchWithAuth('/superadmin/dashboard');
  }

  async getSuperAdminSummary() {
    const result = await this.fetchWithAuth('/analytics/superadmin/summary');
    if (result.success) return result;
    
    const dashboard = await this.fetchWithAuth('/superadmin/dashboard');
    if (dashboard.success && dashboard.data) {
      return {
        success: true,
        data: {
          total_organizations: dashboard.data.totalClients || 0,
          total_users: dashboard.data.activeSubscriptions || 0,
          monthly_revenue: dashboard.data.monthlyRevenue || 0,
          revenue_growth: dashboard.data.revenueGrowth || 0
        }
      };
    }
    return { success: false, data: null };
  }

  /**
   * Utility APIs
   */
  async getCacheStats() {
    return await this.fetchWithAuth('/analytics/cache-stats');
  }

  async invalidateCache(orgId) {
    try {
      const response = await fetch(`${baseUrl}/analytics/invalidate-cache`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${this.token()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orgId })
      });
      return { success: response.ok };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
const analyticsService = new AnalyticsService();
export default analyticsService;
