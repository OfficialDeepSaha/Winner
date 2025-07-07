import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTasks } from '../hooks/useTasks';
import { useAI } from '../hooks/useAI';
import useTaskPrioritization from '../hooks/useTaskPrioritization';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from './LoadingSpinner';
import { 
  Plus,
  Search,
  BrainCircuit,
  Filter,
  MoreHorizontal,
  CheckSquare,
  Clock,
  AlertTriangle,
  Calendar,
  Edit,
  Trash2,
  Brain,
  ArrowUpDown,
  Eye,
  Sparkles,
} from 'lucide-react';
import { RefreshCw } from 'lucide-react';
import { LineChart } from 'recharts';

const TaskItem = ({ task, isSelected, onSelect, onMarkComplete, onEdit, onDelete }) => {
  const { toast } = useToast();
  
  // Display AI priority score if available
  const hasAIPriority = task.aiPriorityScore > 0;

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'cancelled': return 'outline';
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

  const handleMarkComplete = async () => {
    try {
      await onMarkComplete(task.id);
      toast({
        title: 'Task completed',
        description: `"${task.title}" has been marked as complete.`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to mark task as complete.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await onDelete(task.id);
        toast({
          title: 'Task deleted',
          description: `"${task.title}" has been deleted.`,
        });
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Failed to delete task.',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <Card className={`transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            className="mt-1"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-medium truncate">{task.title}</h3>
              <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                {task.priority}
              </Badge>
              <Badge variant={getStatusColor(task.status)} className="text-xs">
                {task.status.replace('_', ' ')}
              </Badge>
              {hasAIPriority && (
                <Badge 
                  variant="outline" 
                  className={`text-xs flex items-center ${task.aiPriorityScore > 70 ? 'bg-blue-50 border-blue-200 text-blue-700' : ''}`}
                >
                  <BrainCircuit className="h-3 w-3 mr-1" />
                  {task.aiPriorityScore?.toFixed(0) || task.ai_priority_score?.toFixed(0)}
                  {task.aiPriorityFactors && 
                    <span className="ml-1 text-xs" title={`Context relevance: ${typeof task.aiPriorityFactors.context_relevance === 'object' ? JSON.stringify(task.aiPriorityFactors.context_relevance) : task.aiPriorityFactors.context_relevance}`}>★</span>
                  }
                </Badge>
              )}
            </div>

            {task.description && (
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {task.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {task.deadline && (
                <span className={getUrgencyColor(task.urgency_level)}>
                  <Calendar className="h-3 w-3 inline mr-1" />
                  {new Date(task.deadline).toLocaleDateString()}
                </span>
              )}
              {task.category_name && (
                <span>📁 {task.category_name}</span>
              )}
              {task.tag_names?.length > 0 && (
                <span>🏷️ {task.tag_names.join(', ')}</span>
              )}
              <span>
                <Clock className="h-3 w-3 inline mr-1" />
                {new Date(task.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {task.status !== 'completed' && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleMarkComplete}
                className="h-8 w-8 p-0"
              >
                <CheckSquare className="h-3 w-3" />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onEdit(task.id)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleDelete}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const TaskList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [isPrioritizing, setIsPrioritizing] = useState(false);
  
  const initialFilters = {
    status: searchParams.get('status') || '',
    priority: searchParams.get('priority') || '',
    search: searchParams.get('search') || '',
    ordering: searchParams.get('ordering') || '-ai_priority_score',
  };

  const {
    tasks,
    loading,
    error,
    filters,
    pagination,
    updateFilters,
    markComplete,
    deleteTask,
    bulkUpdate,
    bulkDelete,
    refresh,
  } = useTasks(initialFilters);

  const { prioritizeTasks } = useAI();
  const { 
    prioritizedTasks,
    recommendations,
    loading: priorityLoading,
    error: priorityError,
    aiPrioritizationEnabled,
    fetchPrioritizedTasks,
    applyAIPrioritization 
  } = useTaskPrioritization();
  const { toast } = useToast();

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    setSearchParams(params);
  }, [filters, setSearchParams]);
  
  // Apply AI prioritization to tasks on initial load and when prioritized tasks change
  const [prioritizedTasksData, setPrioritizedTasksData] = useState([]);
  
  useEffect(() => {
    if (tasks && tasks.length > 0 && aiPrioritizationEnabled) {
      const enhancedTasks = applyAIPrioritization(tasks);
      setPrioritizedTasksData(enhancedTasks);
    } else {
      setPrioritizedTasksData(tasks || []);
    }
  }, [tasks, prioritizedTasks, applyAIPrioritization, aiPrioritizationEnabled]);
  
  // Initial fetch of prioritized tasks
  useEffect(() => {
    fetchPrioritizedTasks();
  }, [fetchPrioritizedTasks]);

  const handleSearch = (e) => {
    e.preventDefault();
    updateFilters({ search: searchTerm, page: 1 });
  };

  const handleFilterChange = (key, value) => {
    // Convert the special "all_" values back to empty strings for the API
    const apiValue = value === 'all_status' || value === 'all_priority' ? '' : value;
    updateFilters({ [key]: apiValue, page: 1 });
  };

  const handleSelectTask = (taskId, checked) => {
    if (checked) {
      setSelectedTasks([...selectedTasks, taskId]);
    } else {
      setSelectedTasks(selectedTasks.filter(id => id !== taskId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedTasks(prioritizedTasksData.map(task => task.id));
    } else {
      setSelectedTasks([]);
    }
  };

  const handleBulkMarkComplete = async () => {
    try {
      await bulkUpdate(selectedTasks, { status: 'completed' });
      setSelectedTasks([]);
      toast({
        title: 'Tasks updated',
        description: `${selectedTasks.length} tasks marked as complete.`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update tasks.',
        variant: 'destructive',
      });
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedTasks.length} tasks?`)) {
      try {
        await bulkDelete(selectedTasks);
        setSelectedTasks([]);
        toast({
          title: 'Tasks deleted',
          description: `${selectedTasks.length} tasks deleted.`,
        });
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Failed to delete tasks.',
          variant: 'destructive',
        });
      }
    }
  };

  // Dynamic context-aware task prioritization with real-time analysis
  const reprioritizeAllTasks = async () => {
    setIsPrioritizing(true);
    try {
      // Fetch the latest AI prioritized tasks with fresh context data
      await fetchPrioritizedTasks({ refresh_context: true });
      
      // Refresh the task list to show the updated priorities
      await refresh();
      
      // Apply the AI prioritization to the current tasks
      const enhancedTasks = applyAIPrioritization(tasks);
      setPrioritizedTasksData(enhancedTasks);
      
      toast({
        title: 'Tasks dynamically reprioritized',
        description: 'AI has analyzed your latest context data and updated task priorities in real-time.',
      });
    } catch (err) {
      console.error('Reprioritization error:', err);
      toast({
        title: 'Error',
        description: 'Failed to reprioritize tasks. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsPrioritizing(false);
    }
  };
  
  // Legacy function for prioritizing selected tasks
  const handleAIPrioritize = async () => {
    try {
      await prioritizeTasks(selectedTasks);
      await refresh();
      setSelectedTasks([]);
      toast({
        title: 'Tasks prioritized',
        description: 'AI has updated the priority scores for selected tasks.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to prioritize tasks with AI.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (taskId) => {
    // Navigate to edit page
    window.location.href = `/tasks/${taskId}/edit`;
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load tasks: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">
            Manage and organize your tasks with AI-powered insights.
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={reprioritizeAllTasks} 
            disabled={isPrioritizing || priorityLoading}
            className="flex items-center"
          >
            {isPrioritizing ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Prioritizing...
              </>
            ) : (
              <>
                <BrainCircuit className="h-4 w-4 mr-2" />
                Re-prioritize All Tasks
              </>
            )}
          </Button>
          <Button asChild>
            <Link to="/tasks/new">
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Link>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit" variant="outline">
                Search
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </form>

            {/* Filters */}
            {showFilters && (
              <div className="grid gap-4 md:grid-cols-4">
                <Select
                  value={filters.status || 'all_status'}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_status">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.priority || 'all_priority'}
                  onValueChange={(value) => handleFilterChange('priority', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_priority">All Priority</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.ordering}
                  onValueChange={(value) => handleFilterChange('ordering', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-ai_priority_score">AI Priority (High to Low)</SelectItem>
                    <SelectItem value="ai_priority_score">AI Priority (Low to High)</SelectItem>
                    <SelectItem value="-created_at">Newest First</SelectItem>
                    <SelectItem value="created_at">Oldest First</SelectItem>
                    <SelectItem value="deadline">Deadline (Earliest)</SelectItem>
                    <SelectItem value="-deadline">Deadline (Latest)</SelectItem>
                    <SelectItem value="title">Title (A-Z)</SelectItem>
                    <SelectItem value="-title">Title (Z-A)</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={() => {
                    updateFilters({});
                    setSearchTerm('');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dynamic AI Task Prioritization Panel */}
     

      {/* Bulk Actions */}
      {selectedTasks.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedTasks.length} task(s) selected
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkMarkComplete}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Mark Complete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAIPrioritize}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  AI Prioritize
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkDelete}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task Prioritization Summary */}
      {/* {aiPrioritizationEnabled && prioritizedTasksData.length > 0 && (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-md flex items-center">
              <LineChart className="h-4 w-4 mr-2 text-blue-600" />
              Task Prioritization Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
              <p className="font-medium">
                {prioritizedTasksData.length} tasks have been prioritized using AI analysis
              </p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-white p-2 rounded-md border border-blue-100">
                  <p className="text-xs text-gray-500">Critical Priority</p>
                  <p className="font-medium">
                    {prioritizedTasksData.filter(t => t.ai_priority_score >= 9.0).length} tasks
                  </p>
                </div>
                <div className="bg-white p-2 rounded-md border border-blue-100">
                  <p className="text-xs text-gray-500">High Priority</p>
                  <p className="font-medium">
                    {prioritizedTasksData.filter(t => t.ai_priority_score >= 7.0 && t.ai_priority_score < 9.0).length} tasks
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Last analyzed: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </CardContent>
        </Card>
      )} */}

      {/* Task List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : prioritizedTasksData.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
            <p className="text-muted-foreground mb-4">
              {filters.search || filters.status || filters.priority
                ? 'Try adjusting your filters or search terms.'
                : 'Get started by creating your first task.'}
            </p>
            <Button asChild>
              <Link to="/tasks/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Select All */}
          <div className="flex items-center gap-2 px-1">
            <Checkbox
              checked={selectedTasks.length === prioritizedTasksData.length}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              Select all ({prioritizedTasksData.length} tasks)
            </span>
            {aiPrioritizationEnabled && (
              <Badge variant="outline" className="ml-2 text-xs flex items-center">
                <BrainCircuit className="h-3 w-3 mr-1" />
                AI Priority Enabled
              </Badge>
            )}
          </div>

          {/* Tasks with AI Priority Ranking */}
          {prioritizedTasksData.map((task, index) => (
            <div key={task.id} className="relative">
              {/* AI Priority Rank Badge */}
              {aiPrioritizationEnabled && (
                <div className="absolute -left-2 -top-2 z-10 flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold border-2 border-white shadow-sm">
                  {index + 1}
                </div>
              )}
              <TaskItem
                task={task}
                isSelected={selectedTasks.includes(task.id)}
                onSelect={(checked) => handleSelectTask(task.id, checked)}
                onMarkComplete={markComplete}
                onEdit={handleEdit}
                onDelete={deleteTask}
              />
            </div>
          ))}

          {/* Pagination */}
          {pagination.count > 20 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {tasks.length} of {pagination.count} tasks
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.previous}
                  onClick={() => handleFilterChange('page', pagination.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.next}
                  onClick={() => handleFilterChange('page', pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskList;

