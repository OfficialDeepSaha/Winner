import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDashboard, useWorkloadAnalysis } from '../hooks/useTasks';
import { useAI, useAIInsights } from '../hooks/useAI';
// Use a more specific import with empty params to avoid dependency issues
import { useContextEntries } from '../hooks/useContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import LoadingSpinner from './LoadingSpinner';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  TrendingUp,
  Brain,
  Plus,
  Calendar,
  Target,
  Zap,
  RefreshCw,
} from 'lucide-react';

const StatCard = ({ title, value, description, icon: Icon, trend, color = 'default' }) => {
  const colorClasses = {
    default: 'text-foreground',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    danger: 'text-red-600 dark:text-red-400',
    info: 'text-blue-600 dark:text-blue-400',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${colorClasses[color]}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <div className="flex items-center pt-1">
            <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
            <span className="text-xs text-green-500">{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const TaskItem = ({ task, onMarkComplete }) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'outline';
      default: return 'outline';
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'overdue': return 'text-red-600 dark:text-red-400';
      case 'urgent': return 'text-orange-600 dark:text-orange-400';
      case 'high': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium truncate">{task.title}</h4>
          <Badge variant={getPriorityColor(task.priority)} className="text-xs">
            {task.priority}
          </Badge>
          {task.ai_priority_score && (
            <Badge variant="outline" className="text-xs">
              AI: {task.ai_priority_score.toFixed(1)}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {task.deadline && (
            <span className={getUrgencyColor(task.urgency_level)}>
              <Calendar className="h-3 w-3 inline mr-1" />
              {new Date(task.deadline).toLocaleDateString()}
            </span>
          )}
          {task.category_name && (
            <span>• {task.category_name}</span>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => onMarkComplete(task.id)}
        className="ml-2"
      >
        <CheckSquare className="h-3 w-3" />
      </Button>
    </div>
  );
};

// border-b border-gray-200 dark:border-gray-700   bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700

const AIInsightCard = ({ title, content, icon: Icon, action }) => (
  <Card className="">
    <CardHeader className="pb-3 ">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </div>
    </CardHeader>
    <CardContent className="pt-0">
      {Array.isArray(content) ? (
        <ul className="list-disc list-inside text-sm text-muted-foreground mb-3 space-y-1">
          {content.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-muted-foreground mb-3">{content}</div>
      )}
      {action && <div className="mt-2">{action}</div>}
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const { dashboardData, loading: dashboardLoading, error: dashboardError, refresh: refreshDashboard } = useDashboard();
  const { workloadData, loading: workloadLoading, error: workloadError, refresh: refreshWorkload } = useWorkloadAnalysis();
  
  // Use an empty object for params to avoid changing references
  const contextParams = useMemo(() => ({}), []);
  const { contextEntries, loading: contextLoading, error: contextError } = useContextEntries(contextParams);
  
  // Add AI insights hook
  const { insights: aiInsights, loading: aiInsightsLoading, error: aiInsightsError, refresh: refreshAIInsights } = useAIInsights(7);

  // Function to refresh all dashboard data
  const refreshAllData = () => {
    refreshDashboard();
    refreshWorkload();
    refreshAIInsights();
    console.log('Dashboard data refresh triggered');
  };

  const handleMarkComplete = async (taskId) => {
    try {
      // This would typically call the API to mark the task complete
      // For now, we'll just refresh the dashboard
      await refresh();
    } catch (err) {
      console.error('Failed to mark task complete:', err);
    }
  };

  const isLoading = dashboardLoading || workloadLoading || contextLoading || aiInsightsLoading;
  const hasError = dashboardError || workloadError || contextError || aiInsightsError;
  
  if (isLoading && (!dashboardData && !workloadData)) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (hasError && (!dashboardData && !workloadData)) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load dashboard data: {dashboardError || workloadError}
        </AlertDescription>
      </Alert>
    );
  }

  const stats = dashboardData?.stats || {};
  const recentTasks = dashboardData?.recent_tasks || [];
  const overdueTasks = dashboardData?.overdue_tasks || [];
  const upcomingTasks = dashboardData?.upcoming_tasks || [];
  const highPriorityTasks = dashboardData?.high_priority_tasks || [];

  const completionRate = stats.total_tasks > 0 
    ? ((stats.total_tasks - stats.pending_tasks) / stats.total_tasks) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your tasks.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={refreshAllData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button asChild>
            <Link to="/tasks/new">
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Tasks"
          value={stats.total_tasks || 0}
          description="All tasks in your list"
          icon={CheckSquare}
          color="info"
        />
        <StatCard
          title="Pending"
          value={stats.pending_tasks || 0}
          description="Tasks waiting to be done"
          icon={Clock}
          color="warning"
        />
        <StatCard
          title="Overdue"
          value={stats.overdue_tasks || 0}
          description="Tasks past their deadline"
          icon={AlertTriangle}
          color="danger"
        />
        <StatCard
          title="Completed Today"
          value={stats.completed_today || 0}
          description="Tasks finished today"
          icon={Target}
          color="success"
        />
      </div>

      {/* Progress and AI Insights */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Progress Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Progress Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboardLoading ? (
              <div className="flex items-center justify-center py-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : dashboardError ? (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription>Error loading progress data</AlertDescription>
              </Alert>
            ) : (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Overall Completion</span>
                  <span>{completionRate.toFixed(1)}%</span>
                </div>
                <Progress value={completionRate} className="h-2" />
              </div>
            )}
            
            {workloadLoading ? (
              <div className="flex items-center justify-center py-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : workloadError ? (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription>Error loading workload data</AlertDescription>
              </Alert>
            ) : workloadData ? (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Workload Level</span>
                  <Badge variant={
                    workloadData.workload_level === 'high' ? 'destructive' :
                    workloadData.workload_level === 'medium' ? 'secondary' : 'outline'
                  }>
                    {workloadData.workload_level}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {workloadData.total_estimated_hours?.toFixed(1)} hours estimated
                </p>
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground py-2">
                No workload data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Insights */}
        <div className="space-y-4">
        <AIInsightCard
            title="AI Analysis"
            content={
              aiInsightsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Generating AI insights...</span>
                </div>
              ) : aiInsightsError ? (
                <div className="text-center text-red-500">
                  <div className="mb-2">Error loading AI insights.</div>
                  <Button variant="outline" size="sm" onClick={refreshAIInsights} className="mx-auto">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Try Again
                  </Button>
                </div>
              ) : aiInsights?.insights && Array.isArray(aiInsights.insights) && aiInsights.insights.length > 0 ? (
                <div>
                  {aiInsights.insights.map((insight, index) => (
                    <li key={index} className="flex items-start gap-2 bg-muted/30 p-2 rounded-md">
                      <Zap className="h-4 w-4 mt-0.5 text-primary" />
                      {insight}
                    </li>
                  ))}
                </div>
              ) : (
                <div className="text-center">
                  <div className="mb-2">Refresh to generate AI insights based on your context entries.</div>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" size="sm" onClick={refreshAIInsights} className="mx-auto">
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Refresh Analysis
                    </Button>
                    
                  </div>
                </div>
              )
            }
            icon={Brain}
            action={
              !aiInsightsLoading && !aiInsightsError && aiInsights?.insights && Array.isArray(aiInsights.insights) && aiInsights.insights.length > 0 ? (
                <div className="flex items-center justify-between w-full">
                  <Button variant="outline" size="sm" onClick={refreshAIInsights}>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/analytics">
                      <Zap className="h-3 w-3 mr-1" />
                      View All Insights
                    </Link>
                  </Button>
                </div>
              ) : null
            }
          />
        </div>
      </div>

      {/* Task Lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Overdue Tasks */}
        {overdueTasks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                Overdue Tasks
              </CardTitle>
              <CardDescription>
                These tasks need immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {overdueTasks.slice(0, 3).map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onMarkComplete={handleMarkComplete}
                />
              ))}
              {overdueTasks.length > 3 && (
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link to="/tasks?filter=overdue">
                    View All {overdueTasks.length} Overdue Tasks
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* High Priority Tasks */}
        {highPriorityTasks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                High Priority
              </CardTitle>
              <CardDescription>
                Important tasks to focus on
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {highPriorityTasks.slice(0, 3).map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onMarkComplete={handleMarkComplete}
                />
              ))}
              {highPriorityTasks.length > 3 && (
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link to="/tasks?filter=high_priority">
                    View All High Priority Tasks
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Upcoming Tasks */}
        {upcomingTasks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Upcoming
              </CardTitle>
              <CardDescription>
                Tasks due in the next 7 days
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingTasks.slice(0, 3).map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onMarkComplete={handleMarkComplete}
                />
              ))}
              {upcomingTasks.length > 3 && (
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link to="/tasks?filter=upcoming">
                    View All Upcoming Tasks
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Tasks */}
        {recentTasks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Tasks
              </CardTitle>
              <CardDescription>
                Your latest tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentTasks.slice(0, 3).map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onMarkComplete={handleMarkComplete}
                />
              ))}
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link to="/tasks">
                  View All Tasks
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Empty State */}
      {stats.total_tasks === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
            <p className="text-muted-foreground mb-4">
              Get started by creating your first task or adding some context for AI insights.
            </p>
            <div className="flex gap-2 justify-center">
              <Button asChild>
                <Link to="/tasks/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/context">
                  <Brain className="h-4 w-4 mr-2" />
                  Add Context
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;

