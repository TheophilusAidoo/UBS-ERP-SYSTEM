import { supabase, TABLES } from './supabase';
import { AIInsight, AIChatMessage } from '../types';
import { leaveService } from './leave.service';
import { invoiceService } from './invoice.service';
import { proposalService } from './proposal.service';
import { financialService } from './financial.service';
import { performanceService } from './performance.service';
import { attendanceService } from './attendance.service';
import { emailService } from './email.service';

export interface CreateInsightData {
  type: 'financial' | 'performance' | 'attendance' | 'risk';
  title: string;
  description: string;
  severity?: 'low' | 'medium' | 'high';
  recommendations?: string[];
  data?: Record<string, any>;
}

interface SystemContext {
  userId?: string;
  userRole?: 'admin' | 'staff';
  companyId?: string;
}

class AIService {
  private apiKey: string | undefined;
  private baseUrl = 'https://api.openai.com/v1';

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  }

  // Store insights in database
  async createInsight(data: CreateInsightData): Promise<AIInsight> {
    const { data: insight, error } = await supabase
      .from(TABLES.ai_insights)
      .insert({
        type: data.type,
        title: data.title,
        description: data.description,
        severity: data.severity,
        recommendations: data.recommendations || [],
        data: data.data || {},
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: insight.id,
      type: insight.type,
      title: insight.title,
      description: insight.description,
      severity: insight.severity,
      recommendations: insight.recommendations,
      data: insight.data,
      createdAt: insight.created_at,
    };
  }

  async getAllInsights(filters?: { type?: string; severity?: string }): Promise<AIInsight[]> {
    let query = supabase
      .from(TABLES.ai_insights)
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    if (filters?.severity) {
      query = query.eq('severity', filters.severity);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description,
      severity: item.severity,
      recommendations: item.recommendations,
      data: item.data,
      createdAt: item.created_at,
    }));
  }

  async deleteInsight(id: string): Promise<void> {
    const { error } = await supabase.from(TABLES.ai_insights).delete().eq('id', id);
    if (error) throw error;
  }

  // Generate insights based on REAL data analysis
  async generateInsight(type: 'financial' | 'performance' | 'attendance' | 'risk', context?: SystemContext): Promise<AIInsight> {
    let title = '';
    let description = '';
    let severity: 'low' | 'medium' | 'high' = 'low';
    let recommendations: string[] = [];
    let analysisData: Record<string, any> = {};

    try {
      if (type === 'financial') {
        // Analyze real financial data
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        
        // Get financial summaries for comparison
        const currentSummary = await financialService.getFinancialSummary({
          startDate: thisMonth.toISOString(),
          endDate: now.toISOString(),
          companyId: context?.companyId,
          userId: context?.userRole === 'staff' ? context?.userId : undefined,
        });
        
        const previousSummary = await financialService.getFinancialSummary({
          startDate: lastMonth.toISOString(),
          endDate: lastMonthEnd.toISOString(),
          companyId: context?.companyId,
          userId: context?.userRole === 'staff' ? context?.userId : undefined,
        });

        // Get transactions for trend analysis
        const recentTransactions = await financialService.getTransactions({
          startDate: lastMonth.toISOString(),
          companyId: context?.companyId,
          userId: context?.userRole === 'staff' ? context?.userId : undefined,
        });

        const incomeTransactions = recentTransactions.filter(t => t.type === 'income');
        const expenseTransactions = recentTransactions.filter(t => t.type === 'expense');
        
        // Calculate trends
        const revenueChange = previousSummary.totalIncome > 0 
          ? ((currentSummary.totalIncome - previousSummary.totalIncome) / previousSummary.totalIncome) * 100 
          : 0;
        const expenseChange = previousSummary.totalExpenses > 0
          ? ((currentSummary.totalExpenses - previousSummary.totalExpenses) / previousSummary.totalExpenses) * 100
          : 0;
        const profitChange = currentSummary.netProfit - previousSummary.netProfit;
        
        // Analyze expense categories
        const expenseCategories: Record<string, number> = {};
        expenseTransactions.forEach(t => {
          const category = t.category || 'Uncategorized';
          expenseCategories[category] = (expenseCategories[category] || 0) + t.amount;
        });
        
        const topExpenseCategory = Object.entries(expenseCategories)
          .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';
        const topExpenseAmount = expenseCategories[topExpenseCategory] || 0;

        analysisData = {
          currentRevenue: currentSummary.totalIncome,
          previousRevenue: previousSummary.totalIncome,
          revenueChange,
          currentExpenses: currentSummary.totalExpenses,
          previousExpenses: previousSummary.totalExpenses,
          expenseChange,
          currentProfit: currentSummary.netProfit,
          previousProfit: previousSummary.netProfit,
          profitChange,
          topExpenseCategory,
          topExpenseAmount,
          expenseBreakdown: expenseCategories,
        };

        // Generate intelligent insights
        if (revenueChange > 10) {
          title = 'Strong Revenue Growth Detected';
          description = `Revenue has increased by ${revenueChange.toFixed(1)}% compared to last month. Current revenue is $${currentSummary.totalIncome.toLocaleString()} with a profit of $${currentSummary.netProfit.toLocaleString()}.`;
          severity = 'low';
          recommendations = [
            'Continue current revenue-generating strategies',
            'Consider reinvesting profits into growth areas',
            'Monitor expense ratios to maintain profitability',
          ];
        } else if (revenueChange < -10) {
          title = 'Revenue Decline Alert';
          description = `Revenue has decreased by ${Math.abs(revenueChange).toFixed(1)}% compared to last month. Current revenue is $${currentSummary.totalIncome.toLocaleString()}.`;
          severity = 'high';
          recommendations = [
            'Review sales and marketing strategies',
            'Identify reasons for revenue decline',
            'Consider cost-cutting measures if trend continues',
            'Analyze customer retention rates',
          ];
        } else if (expenseChange > 15) {
          title = 'Expense Growth Warning';
          description = `Expenses have increased by ${expenseChange.toFixed(1)}% compared to last month. Top expense category is ${topExpenseCategory} at $${topExpenseAmount.toLocaleString()}.`;
          severity = 'medium';
          recommendations = [
            `Review ${topExpenseCategory} expenses for optimization opportunities`,
            'Implement expense approval workflows',
            'Set monthly expense budgets',
            'Monitor expense trends closely',
          ];
        } else if (currentSummary.netProfit < 0) {
          title = 'Negative Profit Alert';
          description = `Current period shows a loss of $${Math.abs(currentSummary.netProfit).toLocaleString()}. Expenses exceed revenue by ${((currentSummary.totalExpenses / currentSummary.totalIncome - 1) * 100).toFixed(1)}%.`;
          severity = 'high';
          recommendations = [
            'Immediate cost reduction review required',
            'Identify non-essential expenses to cut',
            'Focus on revenue generation strategies',
            'Consider emergency financial planning',
          ];
        } else {
          title = 'Stable Financial Performance';
          description = `Financial performance is stable. Revenue: $${currentSummary.totalIncome.toLocaleString()}, Expenses: $${currentSummary.totalExpenses.toLocaleString()}, Profit: $${currentSummary.netProfit.toLocaleString()}.`;
          severity = 'low';
          recommendations = [
            'Maintain current financial practices',
            'Look for incremental improvement opportunities',
            'Continue monitoring key financial metrics',
          ];
        }

      } else if (type === 'performance') {
        // Analyze real performance data
        const goals = await performanceService.getGoals({ userId: context?.userId });
        const reviews = await performanceService.getPerformanceReviews({ userId: context?.userId });
        
        const activeGoals = goals.filter(g => g.status === 'in-progress' || g.status === 'not-started');
        const completedGoals = goals.filter(g => g.status === 'completed');
        const overdueGoals = goals.filter(g => {
          if (g.status === 'completed' || g.status === 'cancelled') return false;
          return new Date(g.endDate) < new Date();
        });
        
        const completionRate = goals.length > 0 ? (completedGoals.length / goals.length) * 100 : 0;
        const averageRating = reviews.length > 0
          ? reviews.reduce((sum, r) => sum + (r.overallRating || 0), 0) / reviews.length
          : 0;

        analysisData = {
          totalGoals: goals.length,
          activeGoals: activeGoals.length,
          completedGoals: completedGoals.length,
          overdueGoals: overdueGoals.length,
          completionRate,
          totalReviews: reviews.length,
          averageRating,
        };

        if (overdueGoals.length > 0) {
          title = 'Overdue Goals Detected';
          description = `${overdueGoals.length} goal(s) have passed their end date without completion. Overall completion rate is ${completionRate.toFixed(1)}%.`;
          severity = 'medium';
          recommendations = [
            'Review and update overdue goals',
            'Consider extending deadlines or adjusting targets',
            'Provide additional support for goal achievement',
            'Break down large goals into smaller milestones',
          ];
        } else if (completionRate < 50 && goals.length > 0) {
          title = 'Low Goal Completion Rate';
          description = `Only ${completionRate.toFixed(1)}% of goals have been completed. ${activeGoals.length} goals are still in progress.`;
          severity = 'medium';
          recommendations = [
            'Review goal difficulty and feasibility',
            'Provide additional resources or training',
            'Set up regular check-ins for goal progress',
            'Consider breaking goals into smaller tasks',
          ];
        } else if (averageRating < 3 && reviews.length > 0) {
          title = 'Performance Improvement Needed';
          description = `Average performance rating is ${averageRating.toFixed(2)}/5. ${reviews.length} review(s) completed.`;
          severity = 'high';
          recommendations = [
            'Identify specific areas for improvement',
            'Create development plans',
            'Schedule regular feedback sessions',
            'Provide targeted training and support',
          ];
        } else {
          title = 'Strong Performance Metrics';
          description = `Performance is on track with ${completionRate.toFixed(1)}% goal completion rate. Average rating: ${averageRating.toFixed(2)}/5 from ${reviews.length} review(s).`;
          severity = 'low';
          recommendations = [
            'Continue current performance practices',
            'Set new challenging goals',
            'Recognize achievements',
            'Maintain performance momentum',
          ];
        }

      } else if (type === 'attendance') {
        // Analyze real attendance data
        if (!context?.userId) {
          throw new Error('User ID required for attendance analysis');
        }

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        // Get attendance records
        const { data: attendanceRecords, error } = await supabase
          .from(TABLES.attendance)
          .select('*')
          .eq('user_id', context.userId)
          .gte('clock_in', thirtyDaysAgo.toISOString())
          .order('clock_in', { ascending: false });

        if (error) throw error;

        // Get leave requests
        const { data: leaveRequests } = await supabase
          .from(TABLES.leave_requests)
          .select('*')
          .eq('user_id', context.userId)
          .gte('start_date', thirtyDaysAgo.toISOString().split('T')[0]);

        const totalDays = 30;
        const daysWithAttendance = attendanceRecords?.length || 0;
        const attendanceRate = (daysWithAttendance / totalDays) * 100;
        
        const totalHours = attendanceRecords?.reduce((sum, record) => {
          return sum + (record.total_hours || 0);
        }, 0) || 0;
        const averageHoursPerDay = daysWithAttendance > 0 ? totalHours / daysWithAttendance : 0;
        
        const approvedLeaves = leaveRequests?.filter(lr => lr.status === 'approved').length || 0;
        const pendingLeaves = leaveRequests?.filter(lr => lr.status === 'pending').length || 0;
        
        // Check for patterns
        const lateArrivals = attendanceRecords?.filter(record => {
          if (!record.clock_in) return false;
          const clockInHour = new Date(record.clock_in).getHours();
          return clockInHour >= 9; // Assuming 9 AM is late
        }).length || 0;

        analysisData = {
          totalDays,
          daysWithAttendance,
          attendanceRate,
          totalHours,
          averageHoursPerDay,
          approvedLeaves,
          pendingLeaves,
          lateArrivals,
        };

        if (attendanceRate < 70) {
          title = 'Low Attendance Rate Alert';
          description = `Attendance rate is ${attendanceRate.toFixed(1)}% over the last 30 days. Only ${daysWithAttendance} days with attendance recorded.`;
          severity = 'high';
          recommendations = [
            'Review attendance policies and expectations',
            'Address any barriers to regular attendance',
            'Consider flexible work arrangements if appropriate',
            'Schedule a discussion about attendance patterns',
          ];
        } else if (lateArrivals > daysWithAttendance * 0.3) {
          title = 'Frequent Late Arrivals Detected';
          description = `${lateArrivals} late arrival(s) detected out of ${daysWithAttendance} attendance days. Average hours per day: ${averageHoursPerDay.toFixed(2)}.`;
          severity = 'medium';
          recommendations = [
            'Discuss punctuality expectations',
            'Identify reasons for late arrivals',
            'Consider flexible start times if appropriate',
            'Set clear attendance guidelines',
          ];
        } else if (averageHoursPerDay < 6) {
          title = 'Low Average Working Hours';
          description = `Average working hours per day is ${averageHoursPerDay.toFixed(2)} hours. Attendance rate: ${attendanceRate.toFixed(1)}%.`;
          severity = 'medium';
          recommendations = [
            'Review work schedule and expectations',
            'Ensure proper clock-in/clock-out procedures',
            'Monitor work hours for consistency',
            'Address any time tracking issues',
          ];
        } else {
          title = 'Good Attendance Patterns';
          description = `Attendance rate is ${attendanceRate.toFixed(1)}% with an average of ${averageHoursPerDay.toFixed(2)} hours per day. ${approvedLeaves} approved leave(s) in the period.`;
          severity = 'low';
          recommendations = [
            'Maintain current attendance standards',
            'Continue monitoring attendance patterns',
            'Recognize consistent attendance',
          ];
        }

      } else if (type === 'risk') {
        // Comprehensive risk assessment
        const risks: string[] = [];
        let riskScore = 0;

        // Financial risks
        try {
          const financialSummary = await financialService.getFinancialSummary({
            companyId: context?.companyId,
            userId: context?.userRole === 'staff' ? context?.userId : undefined,
          });
          
          if (financialSummary.netProfit < 0) {
            risks.push('Negative profit margin');
            riskScore += 3;
          } else if (financialSummary.totalExpenses > financialSummary.totalIncome * 0.9) {
            risks.push('High expense ratio (>90% of revenue)');
            riskScore += 2;
          }
        } catch (err) {
          console.error('Error analyzing financial risks:', err);
        }

        // Performance risks
        try {
          if (context?.userId) {
            const goals = await performanceService.getGoals({ userId: context.userId });
            const overdueGoals = goals.filter(g => {
              if (g.status === 'completed' || g.status === 'cancelled') return false;
              return new Date(g.endDate) < new Date();
            });
            
            if (overdueGoals.length > goals.length * 0.3) {
              risks.push('High number of overdue goals');
              riskScore += 2;
            }
          }
        } catch (err) {
          console.error('Error analyzing performance risks:', err);
        }

        // Attendance risks
        try {
          if (context?.userId) {
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const { data: attendanceRecords } = await supabase
              .from(TABLES.attendance)
              .select('*')
              .eq('user_id', context.userId)
              .gte('clock_in', thirtyDaysAgo.toISOString());
            
            const attendanceRate = attendanceRecords ? (attendanceRecords.length / 30) * 100 : 0;
            if (attendanceRate < 70) {
              risks.push('Low attendance rate');
              riskScore += 2;
            }
          }
        } catch (err) {
          console.error('Error analyzing attendance risks:', err);
        }

        // Invoice risks
        try {
          const invoices = await invoiceService.getInvoices({
            createdBy: context?.userRole === 'staff' ? context?.userId : undefined,
            companyId: context?.companyId,
          });
          
          const overdueInvoices = invoices.filter(i => i.status === 'overdue');
          const overduePercentage = invoices.length > 0 ? (overdueInvoices.length / invoices.length) * 100 : 0;
          
          if (overduePercentage > 20) {
            risks.push('High percentage of overdue invoices');
            riskScore += 2;
          }
        } catch (err) {
          console.error('Error analyzing invoice risks:', err);
        }

        analysisData = {
          riskScore,
          identifiedRisks: risks,
        };

        if (riskScore >= 6) {
          title = 'High Risk Level Detected';
          description = `Multiple risk factors identified with a risk score of ${riskScore}/10. Identified risks: ${risks.join(', ')}.`;
          severity = 'high';
          recommendations = [
            'Immediate action required on identified risks',
            'Develop comprehensive risk mitigation plan',
            'Review and address each risk factor systematically',
            'Schedule emergency review meeting',
            'Implement monitoring and early warning systems',
          ];
        } else if (riskScore >= 3) {
          title = 'Moderate Risk Level';
          description = `Risk score: ${riskScore}/10. Identified risks: ${risks.length > 0 ? risks.join(', ') : 'None significant'}.`;
          severity = 'medium';
          recommendations = [
            'Monitor identified risk factors closely',
            'Develop preventive measures',
            'Review risk mitigation strategies',
            'Update risk assessment regularly',
          ];
        } else {
          title = 'Low Risk Level';
          description = `Risk score: ${riskScore}/10. System appears to be operating within acceptable risk parameters.`;
          severity = 'low';
          recommendations = [
            'Continue current risk management practices',
            'Maintain regular risk assessments',
            'Stay vigilant for emerging risks',
            'Document risk management processes',
          ];
        }
      }

      return await this.createInsight({
        type,
        title,
        description,
        severity,
        recommendations,
        data: analysisData,
      });
    } catch (error: any) {
      console.error('Error generating insight:', error);
      // Fallback to basic insight if analysis fails
      return await this.createInsight({
        type,
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Analysis`,
        description: `Unable to complete full analysis. ${error.message || 'Please try again later.'}`,
        severity: 'low',
        recommendations: ['Retry the analysis', 'Check data availability', 'Contact support if issue persists'],
        data: { error: error.message },
      });
    }
  }

  // Enhanced chat with system integration and general knowledge
  async chat(message: string, history: AIChatMessage[] = [], context?: SystemContext): Promise<string> {
    const lowerMessage = message.toLowerCase().trim();
    const userId = context?.userId;
    const userRole = context?.userRole;
    const companyId = context?.companyId;

    try {
      // Greetings and casual conversation
      if (lowerMessage.match(/^(hi|hello|hey|greetings|good morning|good afternoon|good evening|sup|what's up|howdy)/i)) {
        const greetings = [
          "Hello! 👋 Great to see you! How can I assist you today?",
          "Hi there! 😊 I'm here to help. What would you like to know?",
          "Hey! 👋 Nice to meet you! How can I be of service?",
          "Hello! I'm your UBS AI Assistant. What can I help you with today?",
          "Hi! 👋 Welcome! I'm here to help with anything you need.",
        ];
        return greetings[Math.floor(Math.random() * greetings.length)];
      }

      if (lowerMessage.match(/^(how are you|how's it going|how do you do|what's going on)/i)) {
        return "I'm doing great, thank you for asking! 😊 I'm here and ready to help you with anything you need - whether it's about the UBS ERP system, general questions, or just having a conversation. What's on your mind?";
      }

      if (lowerMessage.match(/^(thanks|thank you|thx|appreciate it)/i)) {
        return "You're very welcome! 😊 I'm glad I could help. Is there anything else you'd like to know or need assistance with?";
      }

      if (lowerMessage.match(/^(bye|goodbye|see you|farewell|later)/i)) {
        return "Goodbye! 👋 It was great chatting with you. Feel free to come back anytime if you need help. Have a wonderful day!";
      }

      // General knowledge questions
      if (lowerMessage.includes('what is') || lowerMessage.includes('what are') || lowerMessage.includes('explain') || lowerMessage.includes('tell me about')) {
        // System-related explanations
        if (lowerMessage.includes('erp') || lowerMessage.includes('system') || lowerMessage.includes('ubs')) {
          return "UBS ERP is a comprehensive Enterprise Resource Planning system designed to help manage:\n\n• Companies and staff\n• Financial transactions and reporting\n• Projects and tasks\n• Invoices and proposals\n• Attendance and leave management\n• Performance tracking\n• Internal messaging\n\nIt's built to streamline business operations and provide insights through AI-powered analytics. What specific aspect would you like to know more about?";
        }
        
        // General knowledge - provide helpful responses
        return "I'd be happy to explain! However, I'm primarily designed to help with the UBS ERP system. I can assist with:\n\n• System features and how to use them\n• Your data (leave balance, invoices, financials, etc.)\n• Creating requests and managing tasks\n• General business and productivity topics\n\nCould you be more specific about what you'd like to know?";
      }

      // System information queries
      if (lowerMessage.includes('what can you do') || lowerMessage.includes('help') || lowerMessage.includes('capabilities') || lowerMessage.includes('what do you do')) {
        const isStaff = userRole === 'staff';
        const staffOnlySection = isStaff ? `📋 **Your Tasks:**
• Create leave requests
• Send invoices to clients
• Send proposals/estimates
• Track your attendance
• View your own performance goals and reviews

💰 **Your Financial Data:**
• View your financial reports
• Analyze your revenue and expenses
• Track your financial trends
• Generate your financial summaries

⏱️ **Your Attendance & Leave:**
• Check your leave balances
• View your attendance records
• See your attendance patterns

📈 **Your Performance:**
• View your performance metrics
• Track your goals and KPIs
• See your performance reviews` : `📋 **Task Management:**
• Create leave requests
• Send invoices to clients
• Send proposals/estimates
• Track attendance

💰 **Financial Analysis:**
• View financial reports (all data)
• Analyze revenue and expenses
• Track financial trends
• Generate financial summaries

📈 **Performance Tracking:**
• View performance metrics (all staff)
• Track goals and KPIs
• Analyze team performance
• Generate performance reports

⏱️ **Attendance & Leave:**
• Check leave balances
• View attendance records (all staff)
• Analyze attendance patterns

💡 **AI Insights:**
• Generate financial insights
• Performance recommendations
• Risk assessments
• Attendance pattern analysis`;

        return `I'm UBS AI Assistant! I can help you with:

📊 **System Information:**
• Answer questions about the ERP system
• Explain features and functionality
• Guide you through processes

${staffOnlySection}

🌍 **General Knowledge:**
• Answer general questions
• Provide information on various topics
• Have friendly conversations

${isStaff ? '\n⚠️ **Privacy Note:** I can only access and discuss your own data for privacy and security reasons.' : ''}

What would you like help with?`;
      }

      // Leave-related queries
      if (lowerMessage.includes('leave') || lowerMessage.includes('vacation') || lowerMessage.includes('time off')) {
        if (lowerMessage.includes('request') || lowerMessage.includes('apply') || lowerMessage.includes('take')) {
          if (!userId) {
            return "I need to know who you are to create a leave request. Please make sure you're logged in.";
          }

          const leaveTypeMatch = lowerMessage.match(/(annual|sick|emergency)/);
          
          if (!leaveTypeMatch) {
            return "I can help you create a leave request! Please specify:\n• Leave type (annual, sick, or emergency)\n• Start date\n• End date\n• Reason (optional)\n\nExample: 'Request annual leave from 2024-12-20 to 2024-12-25 for vacation'";
          }

          try {
            const balance = await leaveService.getLeaveBalance(userId);
            const type = leaveTypeMatch[1] as 'annual' | 'sick' | 'emergency';
            const remaining = type === 'annual' 
              ? (balance.annual.total - balance.annual.used)
              : type === 'sick'
              ? (balance.sick.total - balance.sick.used)
              : (balance.emergency.total - balance.emergency.used);
            
            return `I can help you create a ${type} leave request. You have ${remaining} days remaining for ${type} leave. 

To create the request, I'll need:
• Start date (YYYY-MM-DD format)
• End date (YYYY-MM-DD format)
• Reason (optional)

Please provide these details, or you can create it manually in the Leaves section.`;
          } catch (err) {
            return "I can help you create a leave request. Please provide the start date, end date, and leave type (annual, sick, or emergency).";
          }
        }

        if (lowerMessage.includes('balance') || lowerMessage.includes('remaining') || lowerMessage.includes('how many days')) {
          if (!userId) {
            return "I need to know who you are to check your leave balance. Please make sure you're logged in.";
          }
          try {
            const balance = await leaveService.getLeaveBalance(userId);
            return `Your Leave Balance:
• Annual Leave: ${balance.annual.total - balance.annual.used} / ${balance.annual.total} days remaining
• Sick Leave: ${balance.sick.total - balance.sick.used} / ${balance.sick.total} days remaining
• Emergency Leave: ${balance.emergency.total - balance.emergency.used} / ${balance.emergency.total} days remaining`;
          } catch (err: any) {
            return `I couldn't retrieve your leave balance. ${err.message || 'Please try again later.'}`;
          }
        }

        return "I can help you with leave requests and balances. You can:\n• Check your leave balance\n• Create leave requests\n• View leave history\n\nWhat would you like to do?";
      }

      // Invoice-related queries
      if (lowerMessage.includes('invoice') || lowerMessage.includes('bill')) {
        if (lowerMessage.includes('send') || lowerMessage.includes('create') || lowerMessage.includes('generate')) {
          if (!userId || !companyId) {
            return "I need your user and company information to create an invoice. Please make sure you're logged in and assigned to a company.";
          }
          return "I can help you create and send invoices! To create an invoice, I'll need:\n• Client name\n• Client email\n• Invoice items (description, quantity, price)\n• Due date (optional)\n\nYou can also create invoices manually in the Invoices section. Would you like me to guide you through the process?";
        }

        if (lowerMessage.includes('list') || lowerMessage.includes('show') || lowerMessage.includes('view')) {
          if (!userId) {
            return "I need to know who you are to retrieve your invoices. Please make sure you're logged in.";
          }
          try {
            // For staff, ALWAYS filter by createdBy (their userId). For admin, they can see all invoices
            const invoices = await invoiceService.getInvoices({ 
              createdBy: userRole === 'staff' ? userId : undefined, // Staff: only their own invoices
              companyId: userRole === 'staff' ? companyId : undefined, // Staff: only their company
            });
            const total = invoices.length;
            const paid = invoices.filter(i => i.status === 'paid').length;
            const pending = invoices.filter(i => i.status === 'pending').length;
            const overdue = invoices.filter(i => i.status === 'overdue').length;
            
            return `Your Invoice Summary:
• Total Invoices: ${total}
• Paid: ${paid}
• Pending: ${pending}
• Overdue: ${overdue}

You can view all invoices in the Invoices section.`;
          } catch (err: any) {
            return `I couldn't retrieve your invoices. ${err.message || 'Please try again later.'}`;
          }
        }

        return "I can help you with invoices. You can:\n• Create new invoices\n• Send invoices to clients\n• View invoice status\n• Track payments\n\nWhat would you like to do?";
      }

      // Proposal-related queries
      if (lowerMessage.includes('proposal') || lowerMessage.includes('estimate') || lowerMessage.includes('quote')) {
        if (lowerMessage.includes('send') || lowerMessage.includes('create')) {
          if (!userId || !companyId) {
            return "I need your user and company information to create a proposal. Please make sure you're logged in and assigned to a company.";
          }
          return "I can help you create and send proposals! To create a proposal, I'll need:\n• Client name\n• Client email\n• Proposal items (description, quantity, price)\n• Valid until date (optional)\n\nYou can also create proposals manually in the Proposals section.";
        }

        return "I can help you with proposals/estimates. You can:\n• Create new proposals\n• Send proposals to clients\n• Track proposal status\n• Create proposal versions\n\nWhat would you like to do?";
      }

      // Financial queries
      if (lowerMessage.includes('financial') || lowerMessage.includes('revenue') || lowerMessage.includes('expense') || lowerMessage.includes('profit') || lowerMessage.includes('money')) {
        if (lowerMessage.includes('report') || lowerMessage.includes('summary') || lowerMessage.includes('overview')) {
          if (!userId) {
            return "I need to know who you are to retrieve your financial data. Please make sure you're logged in.";
          }
          try {
            // For staff, ALWAYS filter by userId. For admin, they can see all data (userId optional)
            const summary = await financialService.getFinancialSummary({ 
              companyId: userRole === 'staff' ? companyId : undefined, // Staff: only their company
              userId: userRole === 'staff' ? userId : undefined, // Staff: only their own data
            });
            return `Your Financial Summary:
• Total Income: $${summary.totalIncome.toLocaleString()}
• Total Expenses: $${summary.totalExpenses.toLocaleString()}
• Net Profit: $${summary.netProfit.toLocaleString()}
• Income Transactions: ${summary.incomeCount}
• Expense Transactions: ${summary.expenseCount}

${summary.netProfit > 0 ? '✅ You\'re profitable!' : '⚠️ Expenses exceed income. Review your spending.'}`;
          } catch (err: any) {
            return `I couldn't retrieve your financial summary. ${err.message || 'Please try again later.'}`;
          }
        }

        return "I can help you with financial analysis. You can:\n• View financial reports\n• Analyze revenue and expenses\n• Track financial trends\n• Generate financial summaries\n\nWhat specific financial information would you like?";
      }

      // Performance queries
      if (lowerMessage.includes('performance') || lowerMessage.includes('goal') || lowerMessage.includes('kpi') || lowerMessage.includes('review')) {
        // Always show only the user's own performance data (staff or admin viewing their own)
        if (!userId) {
          return "I need to know who you are to check your performance. Please make sure you're logged in.";
        }
        try {
          // ALWAYS use userId - even admins viewing their own performance data
          // For staff: only their own data. For admin: their own data (when viewing themselves)
          const goals = await performanceService.getGoals({ userId });
          const reviews = await performanceService.getPerformanceReviews({ userId });
          const activeGoals = goals.filter(g => g.status === 'in-progress' || g.status === 'not-started').length;
          const completedGoals = goals.filter(g => g.status === 'completed').length;
          
          return `Your Performance Overview:
• Active Goals: ${activeGoals}
• Completed Goals: ${completedGoals}
• Total Reviews: ${reviews.length}

You can view detailed performance data in the Performance section.`;
        } catch (err: any) {
          return `I couldn't retrieve your performance data. ${err.message || 'Please try again later.'}`;
        }
      }

      // Attendance queries
      if (lowerMessage.includes('attendance') || lowerMessage.includes('clock') || lowerMessage.includes('time in') || lowerMessage.includes('time out')) {
        if (!userId) {
          return "I need to know who you are to check attendance. Please make sure you're logged in.";
        }
        try {
          const todayAttendance = await attendanceService.getTodayAttendance(userId);
          if (todayAttendance) {
            const clockIn = todayAttendance.clockIn ? new Date(todayAttendance.clockIn).toLocaleTimeString() : 'Not clocked in';
            const clockOut = todayAttendance.clockOut ? new Date(todayAttendance.clockOut).toLocaleTimeString() : 'Not clocked out';
            const hours = todayAttendance.totalHours || 0;
            
            return `Today's Attendance:
• Clock In: ${clockIn}
• Clock Out: ${clockOut}
• Total Hours: ${hours.toFixed(2)} hours

You can clock in/out from the Attendance section or the quick action in the top bar.`;
          } else {
            return "You haven't clocked in today. You can clock in from the Attendance section or the quick action in the top bar.";
          }
        } catch (err: any) {
          return `I couldn't retrieve your attendance data. ${err.message || 'Please try again later.'}`;
        }
      }

      // System feature queries
      if (lowerMessage.includes('how to') || lowerMessage.includes('how do i')) {
        if (lowerMessage.includes('invoice')) {
          return "To create an invoice:\n1. Go to the Invoices section\n2. Click 'Create Invoice'\n3. Fill in client details\n4. Add invoice items\n5. Review and send\n\nI can also help you create invoices if you provide the details!";
        }
        if (lowerMessage.includes('leave')) {
          return "To request leave:\n1. Go to the Leaves section\n2. Click 'Request Leave'\n3. Select leave type (annual, sick, emergency)\n4. Choose start and end dates\n5. Add reason (optional)\n6. Submit for approval\n\nI can also help you create leave requests!";
        }
        if (lowerMessage.includes('proposal')) {
          return "To create a proposal:\n1. Go to the Proposals section\n2. Click 'Create Proposal'\n3. Fill in client details\n4. Add proposal items\n5. Set valid until date\n6. Send to client\n\nI can also help you create proposals!";
        }
        return "I can explain how to use various features of the UBS ERP system. What feature would you like to learn about?";
      }

      // For any other queries, use OpenAI if available
      if (this.apiKey) {
        try {
          const response = await this.callOpenAI(message, history, context);
          return response;
        } catch (err) {
          console.error('OpenAI API error:', err);
          // If OpenAI fails, provide a helpful fallback
          return "I apologize, but I'm having trouble processing your request right now. Please try asking me:\n\n• About your leave balance, invoices, or financial data\n• How to use specific features of the UBS ERP system\n• To explain something about the system\n\nOr try rephrasing your question. I'm here to help! 😊";
        }
      }

      // If no OpenAI API key, provide helpful guidance
      return "I'd love to help you, but I need more specific information about what you're looking for. Here's what I can assist with:\n\n📋 **Your Data:**\n• Check your leave balance\n• View your invoices\n• See your financial summary\n• Track your attendance\n• View your performance goals\n\n📖 **System Help:**\n• How to create invoices\n• How to request leave\n• How to create proposals\n• System features and functionality\n\nTry asking something like:\n• \"What's my leave balance?\"\n• \"Show me my invoices\"\n• \"How do I create an invoice?\"\n• \"What can you do?\"\n\nWhat would you like help with? 😊";
    } catch (error: any) {
      console.error('AI chat error:', error);
      return `I encountered an error: ${error.message || 'Please try again later.'}`;
    }
  }

  // Call OpenAI API for general knowledge with enhanced intelligence
  private async callOpenAI(message: string, history: AIChatMessage[] = [], context?: SystemContext): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const userRole = context?.userRole || 'staff';
    const isStaff = userRole === 'staff';

    // Fetch relevant context data to provide better responses
    let userContextData = '';
    try {
      if (context?.userId) {
        // Get user's recent data for context
        const [leaveBalance, financialSummary, todayAttendance] = await Promise.allSettled([
          leaveService.getLeaveBalance(context.userId).catch(() => null),
          financialService.getFinancialSummary({ 
            userId: isStaff ? context.userId : undefined,
            companyId: context.companyId,
          }).catch(() => null),
          attendanceService.getTodayAttendance(context.userId).catch(() => null),
        ]);

        const contextParts: string[] = [];
        
        if (leaveBalance.status === 'fulfilled' && leaveBalance.value) {
          const balance = leaveBalance.value;
          contextParts.push(`Leave Balance: Annual ${balance.annual.total - balance.annual.used}/${balance.annual.total}, Sick ${balance.sick.total - balance.sick.used}/${balance.sick.total}, Emergency ${balance.emergency.total - balance.emergency.used}/${balance.emergency.total}`);
        }
        
        if (financialSummary.status === 'fulfilled' && financialSummary.value) {
          const summary = financialSummary.value;
          contextParts.push(`Financial Summary: Income $${summary.totalIncome.toLocaleString()}, Expenses $${summary.totalExpenses.toLocaleString()}, Profit $${summary.netProfit.toLocaleString()}`);
        }
        
        if (todayAttendance.status === 'fulfilled' && todayAttendance.value) {
          const attendance = todayAttendance.value;
          contextParts.push(`Today's Attendance: Clocked ${attendance.clockIn ? 'in' : 'out'} at ${attendance.clockIn || attendance.clockOut || 'N/A'}`);
        }

        if (contextParts.length > 0) {
          userContextData = `\n\nCURRENT USER CONTEXT:\n${contextParts.join('\n')}\n\nUse this context to provide more personalized and accurate responses when relevant.`;
        }
      }
    } catch (err) {
      console.error('Error fetching user context:', err);
    }

    // Build enhanced system prompt with strict data boundaries
    const systemPrompt = isStaff
      ? `You are UBS AI Assistant, an advanced and intelligent AI assistant for the UBS ERP system. You are designed to be helpful, knowledgeable, and context-aware.

CRITICAL SECURITY RULES - YOU MUST FOLLOW THESE STRICTLY:
1. You are chatting with a STAFF member (not an admin)
2. You can ONLY access and discuss the CURRENT USER's own data
3. NEVER reveal, mention, or reference:
   - Other staff members' information (names, data, performance, etc.)
   - Admin information or admin-specific data
   - Company-wide statistics that include other staff
   - Any data that belongs to other users
4. When discussing data, ALWAYS refer to it as "your data", "your information", etc.
5. If asked about other staff or admin data, politely decline: "I can only access your own data for privacy and security reasons."

CAPABILITIES:
- Answer questions about UBS ERP system features and how to use them
- Help with the CURRENT USER's own data (their leave, invoices, financials, performance, attendance, etc.)
- Provide intelligent analysis and insights based on user's data
- Answer general knowledge questions when appropriate
- Have friendly, natural, and engaging conversations
- Offer business and productivity advice
- Help with problem-solving and decision-making
- Provide step-by-step guidance for complex tasks

IMPORTANT INSTRUCTIONS:
- Be concise, clear, and helpful while being conversational
- Use natural, friendly language - be approachable and professional
- If you don't know something specific about the system, guide the user on where to find it
- Never make up specific data or numbers - only reference actual system data when explicitly queried
- Always prioritize being helpful while maintaining strict data privacy
- Respond naturally without repeating the user's question back to them
- Avoid generic fallback responses - provide specific, actionable help
- Use the provided context data to give personalized responses
- Think step-by-step when helping with complex tasks
- Be proactive in suggesting helpful actions based on the user's data${userContextData}`
      : `You are UBS AI Assistant, an advanced and intelligent AI assistant for the UBS ERP system. You are designed to be helpful, knowledgeable, and provide comprehensive business insights.

You are chatting with an ADMIN user who has access to all system data and administrative functions.

CAPABILITIES:
- Answer questions about UBS ERP system features, data, and tasks
- Provide system-wide analytics and insights
- Help with administrative tasks and decision-making
- Analyze business trends and patterns
- Answer general knowledge questions
- Have friendly, natural, and professional conversations
- Offer strategic business and productivity advice
- Help with problem-solving and strategic planning
- Provide comprehensive reports and summaries

IMPORTANT INSTRUCTIONS:
- Be concise, clear, and helpful while being professional
- Use natural, engaging language appropriate for business context
- When asked about system-specific data, guide users on how to access it or provide insights
- Respond naturally without repeating the user's question back to them
- Avoid generic fallback responses - provide specific, actionable help
- Be informative, strategic, and professional
- Use the provided context data to give personalized responses
- Think strategically when helping with business decisions
- Be proactive in suggesting improvements and optimizations${userContextData}`;

    try {
      const messages = [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...history.slice(-10).map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        })),
        { role: 'user', content: message },
      ];

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Using gpt-4o-mini for better responses at lower cost
          messages,
          temperature: 0.8, // Slightly higher for more natural, creative responses
          max_tokens: 1200, // Increased for more comprehensive responses
          top_p: 0.9,
          frequency_penalty: 0.3, // Reduce repetition
          presence_penalty: 0.3, // Encourage diverse topics
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate a response. Please try again.';
    } catch (error: any) {
      console.error('OpenAI API call failed:', error);
      throw error;
    }
  }

  async generateReportSummary(data: any): Promise<string> {
    return `AI-generated summary: Based on the provided data, key trends and patterns have been identified. Recommendations include monitoring key metrics and taking proactive measures.`;
  }

  async suggestDecision(context: string): Promise<string[]> {
    return [
      'Review current metrics and trends',
      'Consider implementing suggested improvements',
      'Schedule follow-up review meetings',
    ];
  }
}

export const aiService = new AIService();
