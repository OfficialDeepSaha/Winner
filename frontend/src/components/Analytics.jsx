import { useState } from 'react';
import { 
  useTaskStats, 
  useTaskCompletionTrend, 
  useProductivityTrend,
  useWorkloadAnalysis,
  useAIStats,
  useContextInsights 
} from '../hooks/useAnalytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import LoadingSpinner from './LoadingSpinner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon,
  Brain,
  Calendar,
  Clock,
  RefreshCw,
  Target,
  AlertTriangle,
  CheckCircle,
  Zap,
  Activity,
} from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const StatCard = ({ title, value, change, icon: Icon, trend, color = 'default' }) => {
  const colorClasses = {
    default: 'text-foreground',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    danger: 'text-red-600 dark:text-red-400',
    info: 'text-blue-600 dark:text-blue-400',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : TrendingDown;
  const trendColor = trend === 'up' ? 'text-green-500' : 'text-red-500';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${colorClasses[color]}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <div className="flex items-center pt-1">
            <TrendIcon className={`h-3 w-3 mr-1 ${trendColor}`} />
            <span className={`text-xs ${trendColor}`}>{change}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg p-3 shadow-lg">
        <p className="font-medium">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('30');

  // Handle time range change
  const handleTimeRangeChange = (value) => {
    setTimeRange(value);
    // We don't need to manually call refreshes as the hooks will automatically
    // refresh when their timeRange dependency changes
  };
  
  // Function to refresh all AI analytics data
  const refreshAllAIData = () => {
    refreshWorkload();
    refreshAiStats();
    refreshInsights();
  };

  // Data fetching hooks
  const { stats, loading: statsLoading, error: statsError } = useTaskStats();
  const { trendData, loading: trendLoading, error: trendError } = useTaskCompletionTrend(7); // Get last 7 days
  const { productivityData, loading: prodLoading, error: prodError } = useProductivityTrend(4); // Get last 4 weeks
  
  // AI analytics hooks with refresh functions
  const { workloadData, loading: workloadLoading, error: workloadError, refresh: refreshWorkload } = useWorkloadAnalysis();
  const { aiStats, loading: aiStatsLoading, error: aiStatsError, refresh: refreshAiStats } = useAIStats(parseInt(timeRange));
  const { 
    contextInsights, 
    loading: insightsLoading, 
    error: insightsError, 
    refresh: refreshInsights,
    timeRange: insightsTimeRange,
    changeTimeRange: changeInsightsTimeRange
  } = useContextInsights(parseInt(timeRange));

  // Format the trend data for the chart
  const formatDateForChart = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };
  
  // Process the trend data from the backend
  const taskCompletionData = trendData.map(item => ({
    name: formatDateForChart(item.date),
    completed: item.completed_count,
    created: item.created_count,
    // Store the full date for tooltip
    fullDate: new Date(item.date).toLocaleDateString()
  })) || [];

  const priorityDistribution = [
    { name: 'Low', value: stats?.priority_distribution?.low || 0, color: '#00C49F' },
    { name: 'Medium', value: stats?.priority_distribution?.medium || 0, color: '#FFBB28' },
    { name: 'High', value: stats?.priority_distribution?.high || 0, color: '#FF8042' },
    { name: 'Urgent', value: stats?.priority_distribution?.urgent || 0, color: '#FF4444' },
  ];

  const categoryData = stats?.category_stats || [];

  // Use real productivity data from the backend
  const productivityTrend = productivityData || [];

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (statsError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load analytics data: {statsError}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Insights into your productivity and task management patterns.
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Tasks"
          value={stats?.total_tasks || 0}
          change="+12% from last month"
          icon={Target}
          trend="up"
          color="info"
        />
        <StatCard
          title="Completion Rate"
          value={`${stats?.completion_rate?.toFixed(1) || 0}%`}
          change="+5% from last month"
          icon={CheckCircle}
          trend="up"
          color="success"
        />
        <StatCard
          title="Avg. Completion Time"
          value={`${stats?.avg_completion_time || 0}h`}
          change="-0.5h from last month"
          icon={Clock}
          trend="up"
          color="warning"
        />
        <StatCard
          title="AI Accuracy"
          value={`${aiStats?.accuracy_score?.toFixed(1) || 0}%`}
          change="+3% from last month"
          icon={Brain}
          trend="up"
          color="info"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Task Completion Trend */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Task Completion Trend
              </CardTitle>
              {trendLoading && <LoadingSpinner size="sm" />}
            </div>
            <CardDescription>
              Daily task creation vs completion over the last week
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendError ? (
              <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription>Error loading trend data: {trendError}</AlertDescription>
              </Alert>
            ) : taskCompletionData.length === 0 && !trendLoading ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-center text-muted-foreground">
                <BarChart3 className="h-8 w-8 mb-2 opacity-50" />
                <p>No task completion data available for the last week</p>
                <p className="text-sm">Start creating and completing tasks to see your progress</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={taskCompletionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-medium">{item.fullDate}</p>
                            <p style={{ color: '#8884d8' }}>Created: {item.created}</p>
                            <p style={{ color: '#82ca9d' }}>Completed: {item.completed}</p>
                            <p className="text-xs mt-1 text-muted-foreground">
                              Success rate: {item.completed > 0 ? Math.round((item.completed / item.created) * 100) : 0}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="created" fill="#8884d8" name="Created" />
                  <Bar dataKey="completed" fill="#82ca9d" name="Completed" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              Priority Distribution
            </CardTitle>
            <CardDescription>
              Breakdown of tasks by priority level
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex items-center justify-center h-[300px]">
                <LoadingSpinner size="md" />
              </div>
            ) : statsError ? (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription>Error loading priority data: {statsError}</AlertDescription>
              </Alert>
            ) : priorityDistribution.every(item => item.value === 0) ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-center text-muted-foreground">
                <PieChartIcon className="h-8 w-8 mb-2 opacity-50" />
                <p>No priority distribution data available</p>
                <p className="text-sm">Create tasks with different priorities to see your distribution</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={priorityDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {priorityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        const totalTasks = priorityDistribution.reduce((acc, curr) => acc + curr.value, 0);
                        const percentage = totalTasks > 0 ? ((item.value / totalTasks) * 100).toFixed(1) : 0;
                        
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                              <p className="font-medium">{item.name} Priority</p>
                            </div>
                            <p>Tasks: {item.value}</p>
                            <p className="text-xs mt-1 text-muted-foreground">
                              {percentage}% of all tasks
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Productivity Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Productivity Trend
            </CardTitle>
            <CardDescription>
              Weekly productivity score based on tasks completed vs. overdue
            </CardDescription>
          </CardHeader>
          <CardContent>
            {prodLoading ? (
              <div className="flex items-center justify-center h-[300px]">
                <LoadingSpinner size="md" />
              </div>
            ) : prodError ? (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription>Error loading productivity data: {prodError}</AlertDescription>
              </Alert>
            ) : productivityTrend.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-center text-muted-foreground">
                <TrendingUp className="h-8 w-8 mb-2 opacity-50" />
                <p>No productivity data available</p>
                <p className="text-sm">Complete tasks regularly to see your productivity trend</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={productivityTrend}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-medium">{item.name}</p>
                            {item.date_range && (
                              <p className="text-sm text-muted-foreground">{item.date_range}</p>
                            )}
                            <p className="mt-2">
                              <span className="font-semibold">Productivity Score:</span> {item.productivity}/100
                            </p>
                            {item.completion_rate !== undefined && (
                              <div className="mt-1 text-sm">
                                <p>Completion Rate: {item.completion_rate}%</p>
                                <p>Tasks: {item.completed_tasks} of {item.total_tasks} completed</p>
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="productivity"
                    stroke="#8884d8"
                    strokeWidth={2}
                    activeDot={{ r: 8 }}
                    name="Productivity Score"
                  />
                  <Legend />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Category Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Category Performance
            </CardTitle>
            <CardDescription>
              Task completion by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex items-center justify-center h-[300px]">
                <LoadingSpinner size="md" />
              </div>
            ) : statsError ? (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription>Error loading category data: {statsError}</AlertDescription>
              </Alert>
            ) : categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        const completionRate = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
                        
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-medium">{item.name}</p>
                            <p style={{ color: '#8884d8' }}>Total Tasks: {item.total}</p>
                            <p style={{ color: '#82ca9d' }}>Completed: {item.completed}</p>
                            <p className="text-xs mt-1 text-muted-foreground">
                              Completion Rate: {completionRate}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="completed" fill="#82ca9d" name="Completed" />
                  <Bar dataKey="total" fill="#8884d8" name="Total" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No category data available</p>
                  <p className="text-sm">Create tasks with categories to see your distribution</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Time Range Selector */}
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-semibold">AI Insights</h2>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshAllAIData}
            disabled={workloadLoading || aiStatsLoading || insightsLoading}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <span className="text-sm font-medium">Time Range:</span>
          <Select value={timeRange} onValueChange={handleTimeRangeChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="14">Last 14 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* AI Insights */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Workload Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              AI Workload Analysis
            </CardTitle>
            <CardDescription>
              Intelligent analysis of your current workload
            </CardDescription>
          </CardHeader>
          <CardContent>
            {workloadLoading ? (
              <div className="flex items-center justify-center h-[200px]">
                <LoadingSpinner size="md" />
              </div>
            ) : workloadError ? (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription>Error loading workload analysis: {workloadError}</AlertDescription>
              </Alert>
            ) : workloadData ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Workload Level</span>
                  <Badge variant={
                    workloadData.workload_level === 'high' ? 'destructive' :
                    workloadData.workload_level === 'medium' ? 'secondary' : 'outline'
                  }>
                    {workloadData.workload_level}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Estimated Hours</span>
                    <span>{workloadData.total_estimated_hours?.toFixed(1)}h</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>High Priority Tasks</span>
                    <span>{workloadData.high_priority_count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Overdue Tasks</span>
                    <span className="text-red-600">{workloadData.overdue_count}</span>
                  </div>
                </div>

                {workloadData.recommendations?.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Recommendations:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {workloadData.recommendations.slice(0, 3).map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Zap className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-center text-muted-foreground">
                <Brain className="h-8 w-8 mb-2 opacity-50" />
                <p>No workload analysis available</p>
                <p className="text-sm">Create and complete tasks to generate AI insights</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Context Insights */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Context Insights
              </CardTitle>
              <CardDescription>
                Insights from your recent context entries
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={insightsTimeRange.toString()}
                onValueChange={(value) => changeInsightsTimeRange(parseInt(value))}
              >
                <SelectTrigger className="w-[120px] h-8">
                  <SelectValue placeholder="Time Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => refreshInsights()}
                disabled={insightsLoading}
                className="h-8 w-8"
                title="Refresh insights"
              >
                <RefreshCw className={`h-4 w-4 ${insightsLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {insightsLoading ? (
              <div className="flex items-center justify-center h-[200px]">
                <LoadingSpinner size="md" />
              </div>
            ) : insightsError ? (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription>Error loading context insights: {insightsError}</AlertDescription>
              </Alert>
            ) : contextInsights && Object.keys(contextInsights).length > 0 ? (
              <div className="space-y-6">
                {/* Debug Info - will be removed after fixing */}
              
                
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <span className="text-muted-foreground block mb-1">Total Entries</span>
                    <p className="text-2xl font-bold">{contextInsights.total_entries || 0}</p>
                    {contextInsights.entries_change && (
                      <div className="flex items-center justify-center text-xs mt-1">
                        {contextInsights.entries_change > 0 ? (
                          <><TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                          <span className="text-green-500">+{contextInsights.entries_change} from last period</span></>
                        ) : (
                          <><TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                          <span className="text-red-500">{contextInsights.entries_change} from last period</span></>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <span className="text-muted-foreground block mb-1">Avg Sentiment</span>
                    <div className="flex items-center justify-center">
                      {contextInsights.avg_sentiment > 0.3 ? (
                        <span className="text-green-500 text-2xl font-bold">Positive</span>
                      ) : contextInsights.avg_sentiment < -0.3 ? (
                        <span className="text-red-500 text-2xl font-bold">Negative</span>
                      ) : (
                        <span className="text-yellow-500 text-2xl font-bold">Neutral</span>
                      )}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className={`h-2 rounded-full ${
                          contextInsights.avg_sentiment > 0.3 ? 'bg-green-500' : 
                          contextInsights.avg_sentiment < -0.3 ? 'bg-red-500' : 'bg-yellow-500'
                        }`}
                        style={{ width: `${Math.min(Math.abs(contextInsights.avg_sentiment * 100), 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs mt-1 text-muted-foreground">
                      Score: {contextInsights.avg_sentiment?.toFixed(2) || 0}
                    </div>
                  </div>
                  
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <span className="text-muted-foreground block mb-1">Sentiment Distribution</span>
                    <div className="flex justify-between items-center h-8 mt-2">
                      <div className="text-xs text-green-500">
                        {contextInsights.sentiment_distribution?.positive || 0}%
                        <div className="w-2 h-8 bg-green-500 rounded-sm inline-block ml-1" 
                             style={{height: `${(contextInsights.sentiment_distribution?.positive || 0) / 2}px`}}></div>
                      </div>
                      <div className="text-xs text-yellow-500">
                        {contextInsights.sentiment_distribution?.neutral || 0}%
                        <div className="w-2 h-8 bg-yellow-500 rounded-sm inline-block ml-1"
                             style={{height: `${(contextInsights.sentiment_distribution?.neutral || 0) / 2}px`}}></div>
                      </div>
                      <div className="text-xs text-red-500">
                        {contextInsights.sentiment_distribution?.negative || 0}%
                        <div className="w-2 h-8 bg-red-500 rounded-sm inline-block ml-1"
                             style={{height: `${(contextInsights.sentiment_distribution?.negative || 0) / 2}px`}}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Topics */}
                {contextInsights.top_topics?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Top Topics:</h4>
                    <div className="flex flex-wrap gap-1">
                      {contextInsights.top_topics.map((topic, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Insights */}
                {contextInsights.insights?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Key Insights:</h4>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      {contextInsights.insights.map((insight, index) => (
                        <li key={index} className="flex items-start gap-2 bg-muted/30 p-2 rounded-md">
                          <Zap className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Last Updated */}
                <div className="text-xs text-muted-foreground text-center pt-2">
                  Last updated: {new Date().toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-center text-muted-foreground">
                <Zap className="h-8 w-8 mb-2 opacity-50" />
                <p>No context insights available</p>
                <p className="text-sm">Add context entries to generate AI insights</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={() => refreshInsights()}
                >
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Refresh Data
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            AI Performance Metrics
          </CardTitle>
          <CardDescription>
            How well AI is helping with your task management
          </CardDescription>
        </CardHeader>
        <CardContent>
          {aiStatsLoading ? (
            <div className="flex items-center justify-center h-[200px]">
              <LoadingSpinner size="md" />
            </div>
          ) : aiStatsError ? (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription>Error loading AI metrics: {aiStatsError}</AlertDescription>
            </Alert>
          ) : aiStats ? (
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {aiStats.total_analyses || 0}
                </div>
                <p className="text-sm text-muted-foreground">Total Analyses</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {aiStats.accuracy_score?.toFixed(1) || 0}%
                </div>
                <p className="text-sm text-muted-foreground">Accuracy Score</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {aiStats.suggestions_accepted || 0}
                </div>
                <p className="text-sm text-muted-foreground">Suggestions Accepted</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {aiStats.time_saved?.toFixed(1) || 0}h
                </div>
                <p className="text-sm text-muted-foreground">Time Saved</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] text-center text-muted-foreground">
              <Brain className="h-8 w-8 mb-2 opacity-50" />
              <p>No AI metrics available</p>
              <p className="text-sm">Use AI suggestions to generate performance metrics</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;

