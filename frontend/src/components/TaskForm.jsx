import React, { useState, useEffect, useCallback } from 'react';
import useTaskPrioritization from '../hooks/useTaskPrioritization';
import { useNavigate, useParams } from 'react-router-dom';
import { useTasks } from '../hooks/useTasks';
import { useAI } from '../hooks/useAI';
import { Link } from 'react-router-dom';
import { createTimeBlock } from '../services/calendarService';
import { getSchedulingSuggestions, createOptimalTimeBlock } from '../services/aiSchedulingService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from './LoadingSpinner';
import apiService from '../lib/api';
import {
  Save,
  ArrowLeft,
  Brain,
  Lightbulb,
  Calendar,
  Tag,
  AlertTriangle,
  Sparkles,
  Clock,
  CalendarClock,
  CalendarDays,
} from 'lucide-react';
import { Check } from 'lucide-react';

// Keyframe animation for the green checkmark
const pulseAnimation = {
  '0%': { opacity: 0.7, transform: 'scale(0.8)' },
  '50%': { opacity: 1, transform: 'scale(1.1)' },
  '100%': { opacity: 1, transform: 'scale(1)' }
};

const AISuggestionCard = ({ title, content, details, onApply, loading, applied = false }) => (
  <Card className={`${applied ? 'border-green-500/50 bg-green-50/30 dark:bg-green-950/20' : 'border-primary/20 bg-primary/5'} transition-all duration-300`}>
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {applied ? (
            <div 
              className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center" 
              style={applied ? {
                animation: 'pulse-once 0.6s ease-out forwards',
              } : {}}
            >
              <style jsx>{`
                @keyframes pulse-once {
                  ${Object.entries(pulseAnimation).map(([key, value]) => 
                    `${key} { opacity: ${value.opacity}; transform: ${value.transform}; }`
                  ).join(' ')}
                }
              `}</style>
              <Check className="h-3 w-3 text-white" />
            </div>
          ) : (
            <Brain className="h-4 w-4 text-primary" />
          )}
          <CardTitle className={`text-sm ${applied ? 'text-green-700 dark:text-green-400' : ''}`}>{title}</CardTitle>
          {applied && <span className="text-xs font-normal text-green-600 dark:text-green-400 ml-2">Applied</span>}
        </div>
        {onApply && !applied && (
          <Button
            size="sm"
            variant="outline"
            onClick={onApply}
            disabled={loading}
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Apply'}
          </Button>
        )}
      </div>
    </CardHeader>
    <CardContent className="pt-0">
      <p className={`text-sm font-medium ${applied ? 'text-green-700 dark:text-green-400' : ''}`}>{content}</p>
      {details && (
        <p className="text-xs text-muted-foreground mt-1">{details}</p>
      )}
    </CardContent>
  </Card>
);

const TaskForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    deadline: '',
    estimated_duration: '',
    category_name: '',
    tag_names: [],
    scheduled_start_time: '',
    scheduled_end_time: '',
  });
  
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [appliedSuggestions, setAppliedSuggestions] = useState({
    priority: false,
    deadline: false,
    category: false,
    tags: false,
    description: false,
    scheduling: false
  });
  const [timeBlockCreated, setTimeBlockCreated] = useState(false);
  const [aiScheduling, setAiScheduling] = useState(false);
  const [errors, setErrors] = useState({});

  const { createTask, updateTask } = useTasks();
  const { getTaskSuggestions } = useAI();
  const { prioritizedTasks, loading: priorityLoading, getPrioritySuggestion } = useTaskPrioritization();
  const { toast } = useToast();

  // Load task data for editing
  useEffect(() => {
    if (isEditing) {
      const loadTask = async () => {
        setLoading(true);
        try {
          const task = await apiService.getTask(id);
          // Format scheduled times for datetime-local input if they exist
          let scheduled_start_time = '';
          let scheduled_end_time = '';
          
          if (task.scheduled_start_time) {
            const startDate = new Date(task.scheduled_start_time);
            scheduled_start_time = `${startDate.toISOString().split('.')[0]}`;
          }
          
          if (task.scheduled_end_time) {
            const endDate = new Date(task.scheduled_end_time);
            scheduled_end_time = `${endDate.toISOString().split('.')[0]}`;
          }
          
          setFormData({
            title: task.title || '',
            description: task.description || '',
            priority: task.priority || 'medium',
            deadline: task.deadline ? task.deadline.split('T')[0] : '',
            estimated_duration: task.estimated_duration || '',
            category_name: task.category?.name || '',
            tag_names: task.tags?.map(tag => tag.name) || [],
            scheduled_start_time,
            scheduled_end_time,
          });
        } catch (err) {
          toast({
            title: 'Error',
            description: 'Failed to load task data.',
            variant: 'destructive',
          });
          navigate('/tasks');
        } finally {
          setLoading(false);
        }
      };
      loadTask();
    }
  }, [id, isEditing, navigate, toast]);

  // Load categories and tags
  useEffect(() => {
    const loadData = async () => {
      try {
        const [categoriesRes, tagsRes] = await Promise.all([
          apiService.getCategories(),
          apiService.getTags(),
        ]);
        setCategories(categoriesRes.results || categoriesRes);
        setTags(tagsRes.results || tagsRes);
      } catch (err) {
        console.error('Failed to load categories and tags:', err);
      }
    };
    loadData();
  }, []);

  // Get AI suggestions when title or description changes
  useEffect(() => {
    const getAISuggestions = async () => {
      if (!formData.title.trim()) return;

      setAiLoading(true);
      try {
        const suggestions = await getTaskSuggestions(formData);
        
        // Enhance suggestions with priority from context
        const contextPriority = getPrioritySuggestion(formData.title, formData.description);
        
        if (contextPriority && (!suggestions.task_suggestions?.priority || 
            suggestions.task_suggestions?.priority === 'medium')) {
          // If we have a context-based priority that's different from the basic AI suggestion,
          // enhance the suggestion with our context-aware priority
          if (suggestions.task_suggestions) {
            suggestions.task_suggestions.priority = contextPriority;
            suggestions.task_suggestions.priority_source = 'context';
          }
        }
        
        setAiSuggestions(suggestions.task_suggestions);
      } catch (err) {
        console.error('Failed to get AI suggestions:', err);
      } finally {
        setAiLoading(false);
      }
    };

    const debounceTimer = setTimeout(getAISuggestions, 1000);
    return () => clearTimeout(debounceTimer);
  }, [formData.title, formData.description, getTaskSuggestions]);

  const handleInputChange = (field, value) => {
    // If description field and value appears to be JSON, extract just the description content
    if (field === 'description') {
      try {
        // Check if it looks like JSON (starts with { and ends with })
        if (value.trim().startsWith('{') && value.trim().endsWith('}')) {
          const parsedValue = JSON.parse(value);
          if (parsedValue.description) {
            value = parsedValue.description;
          }
        }
      } catch (e) {
        // If parsing fails, keep original value
        console.log('Failed to parse potential JSON in description', e);
      }
    }

    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleTagChange = (tagName) => {
    setFormData(prev => ({
      ...prev,
      tag_names: prev.tag_names.includes(tagName)
        ? prev.tag_names.filter(t => t !== tagName)
        : [...prev.tag_names, tagName]
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (formData.deadline) {
      const deadlineDate = new Date(formData.deadline);
      if (deadlineDate <= new Date()) {
        newErrors.deadline = 'Deadline must be in the future';
      }
    }
    
    if (formData.estimated_duration && formData.estimated_duration <= 0) {
      newErrors.estimated_duration = 'Duration must be positive';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const taskData = {
        ...formData,
        deadline: formData.deadline ? `${formData.deadline}T23:59:59Z` : null,
        estimated_duration: formData.estimated_duration ? parseInt(formData.estimated_duration) : null,
        scheduled_start_time: formData.scheduled_start_time || null,
        scheduled_end_time: formData.scheduled_end_time || null,
      };

      if (isEditing) {
        await updateTask(id, taskData);
        toast({
          title: 'Task updated',
          description: 'Your task has been updated successfully.',
        });
      } else {
        await createTask(taskData);
        toast({
          title: 'Task created',
          description: 'Your task has been created successfully.',
        });
      }
      
      navigate('/tasks');
    } catch (err) {
      toast({
        title: 'Error',
        description: `Failed to ${isEditing ? 'update' : 'create'} task.`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyAISuggestion = (type, value) => {
    switch (type) {
      case 'priority':
        if (value.priority) {
          setFormData(prev => ({ ...prev, priority: value.priority }));
          setAppliedSuggestions(prev => ({ ...prev, priority: true }));
          toast({
            title: 'Priority Applied',
            description: `Priority set to "${value.priority}"`
          });
        }
        break;
      case 'deadline':
        if (value.suggested_deadline) {
          const date = new Date(value.suggested_deadline);
          setFormData(prev => ({ ...prev, deadline: date.toISOString().split('T')[0] }));
          setAppliedSuggestions(prev => ({ ...prev, deadline: true }));
          toast({
            title: 'Deadline Applied',
            description: `Deadline set to ${date.toLocaleDateString()}`
          });
        }
        break;
      case 'scheduling':
        if (value.suggested_start_time && value.suggested_end_time) {
          const startTime = new Date(value.suggested_start_time);
          const endTime = new Date(value.suggested_end_time);
          
          // Format the date and time for the form fields
          const formattedStartDate = startTime.toISOString().split('T')[0];
          const formattedStartTime = startTime.toTimeString().split(' ')[0].substring(0, 5);
          const formattedEndDate = endTime.toISOString().split('T')[0];
          const formattedEndTime = endTime.toTimeString().split(' ')[0].substring(0, 5);
          
          setFormData(prev => ({
            ...prev,
            scheduled_start_time: `${formattedStartDate}T${formattedStartTime}`,
            scheduled_end_time: `${formattedEndDate}T${formattedEndTime}`
          }));
          setAppliedSuggestions(prev => ({ ...prev, scheduling: true }));
          
          const startFormatted = startTime.toLocaleString();
          const endFormatted = endTime.toLocaleString();
          
          toast({
            title: 'Schedule Applied',
            description: `Task scheduled from ${startFormatted} to ${endFormatted}`
          });
        }
        break;
      case 'category':
        if (value.suggested_categories?.[0]) {
          // Directly update the form data with the category name
          setFormData(prev => ({ ...prev, category_name: value.suggested_categories[0] }));
          setAppliedSuggestions(prev => ({ ...prev, category: true }));
          
          // Show feedback about the change
          toast({
            title: 'Category Applied',
            description: `Category "${value.suggested_categories[0]}" has been applied.`
          });
        }
        break;
      case 'tags':
        if (value.suggested_tags) {
          setFormData(prev => ({
            ...prev,
            tag_names: [...new Set([...prev.tag_names, ...value.suggested_tags])]
          }));
          setAppliedSuggestions(prev => ({ ...prev, tags: true }));
          toast({
            title: 'Tags Applied',
            description: `${value.suggested_tags.length} tags have been added`
          });
        }
        break;
      case 'description':
        if (value) {
          let descriptionText = value;
          
          // Check if the description is in JSON format
          try {
            if (typeof value === 'string' && value.trim().startsWith('{') && value.trim().endsWith('}')) {
              const parsedValue = JSON.parse(value);
              if (parsedValue.description) {
                descriptionText = parsedValue.description;
              }
            }
          } catch (e) {
            console.log('Failed to parse potential JSON in AI description', e);
          }
          
          setFormData(prev => ({ ...prev, description: descriptionText }));
          setAppliedSuggestions(prev => ({ ...prev, description: true }));
          toast({
            title: 'Description Applied',
            description: `Enhanced description has been applied`
          });
        }
        break;
    }
  };

  if (loading && isEditing) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0" style={{ marginLeft: '-202px' }}>
          <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Button>
        </div>
        <div className="flex-1 text-center">
          <h1 className="text-3xl font-bold">
            {isEditing ? 'Edit Task' : 'Create New Task'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing 
              ? 'Update your task details and get AI-powered suggestions.'
              : 'Create a new task with AI-powered suggestions and smart categorization.'}
          </p>
        </div>
        <div className="w-[100px]"></div> {/* Empty div for balance */}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Task Details</CardTitle>
              <CardDescription>
                Fill in the task information. AI suggestions will appear as you type.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter task title..."
                    className={errors.title ? 'border-destructive' : ''}
                  />
                  {errors.title && (
                    <p className="text-sm text-destructive">{errors.title}</p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe your task in detail..."
                    rows={4}
                  />
                </div>

                {/* Priority and Deadline */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="priority">Priority</Label>
                      {aiSuggestions?.priority_source === 'context' && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-xs">
                          Context-aware
                        </Badge>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="priority"
                        name="priority"
                        value={formData.priority}
                        onChange={(e) => handleInputChange('priority', e.target.value)}
                        placeholder="Priority will be suggested by AI"
                        className={aiSuggestions?.priority && formData.priority !== (typeof aiSuggestions.priority === 'string' ? aiSuggestions.priority : aiSuggestions.priority.priority_label.toLowerCase()) ? 'border-amber-500' : ''}
                      />
                      
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => handleInputChange('deadline', e.target.value)}
                      className={errors.deadline ? 'border-destructive' : ''}
                    />
                    {errors.deadline && (
                      <p className="text-sm text-destructive">{errors.deadline}</p>
                    )}
                  </div>
                </div>

                {/* Duration and Category */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Estimated Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.estimated_duration}
                      onChange={(e) => handleInputChange('estimated_duration', e.target.value)}
                      placeholder="60"
                      min="1"
                      className={errors.estimated_duration ? 'border-destructive' : ''}
                    />
                    {errors.estimated_duration && (
                      <p className="text-sm text-destructive">{errors.estimated_duration}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      name="category"
                      value={formData.category_name}
                      onChange={(e) => handleInputChange('category_name', e.target.value)}
                      placeholder="Category will be suggested by AI"
                    />
                  </div>
                </div>
                
                {/* Scheduling */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <Label className="text-base font-medium">Scheduling</Label>
                    </div>
                    <Link to="/calendar" className="text-xs text-primary flex items-center gap-1 hover:underline">
                      <CalendarDays className="h-3 w-3" /> View Calendar
                    </Link>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="scheduled_start_time">Start Time</Label>
                      <Input
                        id="scheduled_start_time"
                        type="datetime-local"
                        value={formData.scheduled_start_time}
                        onChange={(e) => handleInputChange('scheduled_start_time', e.target.value)}
                        placeholder="Will be suggested by AI"
                        className={appliedSuggestions.scheduling ? "border-green-500/50" : ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scheduled_end_time">End Time</Label>
                      <Input
                        id="scheduled_end_time"
                        type="datetime-local"
                        value={formData.scheduled_end_time}
                        onChange={(e) => handleInputChange('scheduled_end_time', e.target.value)}
                        placeholder="Will be suggested by AI"
                        className={appliedSuggestions.scheduling ? "border-green-500/50" : ""}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    {appliedSuggestions.scheduling && (
                      <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <Check className="h-3 w-3" /> AI-suggested schedule applied
                      </p>
                    )}
                    
                    {!timeBlockCreated && (
                      <div className="flex items-center gap-2">
                        {formData.scheduled_start_time && formData.scheduled_end_time && (
                          <Button 
                            type="button" 
                            size="sm" 
                            variant="outline" 
                            className="flex items-center gap-1"
                            onClick={async () => {
                              try {
                                // Only create time block if we have valid scheduling data
                                if (formData.scheduled_start_time && formData.scheduled_end_time) {
                                  // If we're editing an existing task, we need its ID
                                  const taskId = isEditing ? id : null;
                                  
                                  // Create a time block for this task scheduling
                                  await createTimeBlock({
                                    task: taskId, // Will be null for new tasks
                                    task_title: formData.title, // Use the task title for new tasks
                                    start_time: formData.scheduled_start_time,
                                    end_time: formData.scheduled_end_time,
                                    status: 'scheduled',
                                    notes: `Created from task: ${formData.title}`,
                                  });
                                  
                                  setTimeBlockCreated(true);
                                  toast({
                                    title: "Time Block Created",
                                    description: "A time block has been added to your calendar."
                                  });
                                }
                              } catch (error) {
                                console.error('Failed to create time block:', error);
                                toast({
                                  title: "Error",
                                  description: "Failed to create time block.",
                                  variant: "destructive"
                                });
                              }
                            }}
                          >
                            <CalendarClock className="h-4 w-4" />
                            Create Time Block
                          </Button>
                        )}
                        
                        <Button 
                          type="button" 
                          size="sm" 
                          variant={formData.scheduled_start_time && formData.scheduled_end_time ? "ghost" : "outline"}
                          className="flex items-center gap-1"
                          disabled={aiLoading || aiScheduling}
                          onClick={async () => {
                            try {
                              setAiScheduling(true);
                              
                              // Get AI scheduling suggestions
                              const suggestions = await getSchedulingSuggestions(
                                localStorage.getItem('authToken'),
                                {
                                  title: formData.title,
                                  description: formData.description,
                                  priority: formData.priority,
                                  deadline: formData.deadline,
                                  estimated_duration: formData.estimated_duration || 60,
                                  category_name: formData.category_name
                                }
                              );
                              
                              // Update form data with suggested times
                              if (suggestions.suggested_start_time && suggestions.suggested_end_time) {
                                const startTime = new Date(suggestions.suggested_start_time);
                                const endTime = new Date(suggestions.suggested_end_time);
                                
                                // Format the date and time for the form fields
                                const formattedStart = startTime.toISOString().slice(0, 16);
                                const formattedEnd = endTime.toISOString().slice(0, 16);
                                
                                setFormData(prev => ({
                                  ...prev,
                                  scheduled_start_time: formattedStart,
                                  scheduled_end_time: formattedEnd
                                }));
                                
                                setAppliedSuggestions(prev => ({ ...prev, scheduling: true }));
                                
                                toast({
                                  title: "AI Scheduling",
                                  description: "Optimal time slot suggested based on your calendar and task priority."
                                });
                              }
                            } catch (error) {
                              console.error('Failed to get AI scheduling suggestions:', error);
                              toast({
                                title: "Error",
                                description: "Failed to get AI scheduling suggestions.",
                                variant: "destructive"
                              });
                            } finally {
                              setAiScheduling(false);
                            }
                          }}
                        >
                          <Sparkles className="h-4 w-4" />
                          {aiScheduling ? <LoadingSpinner size="xs" /> : "AI Schedule"}
                        </Button>
                      </div>
                    )}
                    
                    {timeBlockCreated && (
                      <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Time block created
                      </p>
                    )}
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant={formData.tag_names.includes(tag.name) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => handleTagChange(tag.name)}
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                  {formData.tag_names.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Selected: {formData.tag_names.join(', ')}
                    </div>
                  )}
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={loading}>
                    {loading && <LoadingSpinner size="sm" className="mr-2" />}
                    <Save className="h-4 w-4 mr-2" />
                    {isEditing ? 'Update Task' : 'Create Task'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/tasks')}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* AI Suggestions Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Suggestions
              </CardTitle>
              <CardDescription>
                Smart recommendations based on your task details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {aiLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : aiSuggestions ? (
                <div className="space-y-4">
                  {/* Priority Suggestion */}
                  {aiSuggestions.priority && (
                    <AISuggestionCard
                      title="Priority Suggestion"
                      content={`Recommended: ${aiSuggestions.priority.priority_label || 
                        (typeof aiSuggestions.priority.score === 'number' ? 
                          (aiSuggestions.priority.score >= 7 ? 'High' : 
                           aiSuggestions.priority.score >= 4 ? 'Medium' : 'Low') : 
                          'Medium')}`}
                      details={aiSuggestions.priority.reasoning ? 
                        `${aiSuggestions.priority.reasoning.substring(0, 100)}${aiSuggestions.priority.reasoning.length > 100 ? '...' : ''}` : 
                        (aiSuggestions.priority.impact_assessment || 'Based on task complexity and context.')}
                      onApply={() => {
                        console.log('Applying priority suggestion:', aiSuggestions.priority);
                        
                        // Check if the task contains simplicity indicators for tic-tac-toe or simple HTML games
                        const taskTitle = formData.title?.toLowerCase() || '';
                        const taskDesc = formData.description?.toLowerCase() || '';
                        const taskText = `${taskTitle} ${taskDesc}`;
                        
                        const simpleTaskPatterns = [
                          'tic-tac-toe', 'tic tac toe', 'tictactoe',
                          'simple html', 'basic html', 'html game',
                          'simple game', 'basic game'
                        ];
                        
                        const isSimpleTask = simpleTaskPatterns.some(pattern => taskText.includes(pattern));
                        
                        // Force low priority for simple tasks
                        let priorityValue;
                        if (isSimpleTask) {
                          console.log('Frontend detected simple task, forcing LOW priority');
                          priorityValue = 'low';
                        } else {
                          priorityValue = aiSuggestions.priority.priority_label ? 
                            aiSuggestions.priority.priority_label.toLowerCase() : 
                            (typeof aiSuggestions.priority.score === 'number' ? 
                              (aiSuggestions.priority.score >= 7 ? 'high' : 
                               aiSuggestions.priority.score >= 4 ? 'medium' : 'low') : 
                            'medium');
                        }
                        applyAISuggestion('priority', { priority: priorityValue });
                      }}
                      applied={appliedSuggestions.priority}
                    />
                  )}

                  {/* Deadline Suggestion */}
                  {aiSuggestions.deadline && (
                    <AISuggestionCard
                      title="Deadline Suggestion"
                      content={`Recommended: ${new Date(aiSuggestions.deadline.suggested_deadline).toLocaleDateString()}`}
                      onApply={() => applyAISuggestion('deadline', aiSuggestions.deadline)}
                      applied={appliedSuggestions.deadline}
                    />
                  )}

                  {/* Category Suggestion */}
                  {aiSuggestions.categorization?.suggested_categories?.length > 0 && (
                    <AISuggestionCard
                      title="Category Suggestion"
                      content={`Suggested: ${aiSuggestions.categorization.suggested_categories[0]}`}
                      onApply={() => applyAISuggestion('category', aiSuggestions.categorization)}
                      applied={appliedSuggestions.category}
                    />
                  )}

                  {/* Tags Suggestion */}
                  {aiSuggestions.categorization?.suggested_tags?.length > 0 && (
                    <AISuggestionCard
                      title="Tag Suggestions"
                      content={`Add tags: ${aiSuggestions.categorization.suggested_tags.join(', ')}`}
                      onApply={() => applyAISuggestion('tags', aiSuggestions.categorization)}
                      applied={appliedSuggestions.tags}
                    />
                  )}

                  {/* Scheduling Suggestion */}
                  {aiSuggestions?.suggested_start_time && aiSuggestions?.suggested_end_time && (
                    <AISuggestionCard
                      title="Scheduling Suggestion"
                      content={
                        `${new Date(aiSuggestions.suggested_start_time).toLocaleString()} - ${new Date(aiSuggestions.suggested_end_time).toLocaleString()}`
                      }
                      details="Based on your task description, calendar availability, and estimated duration"
                      onApply={() => applyAISuggestion('scheduling', aiSuggestions)}
                      loading={aiLoading}
                      applied={appliedSuggestions.scheduling}
                    />
                  )}

                  {/* Enhanced Description */}
                  {aiSuggestions.enhanced_description && 
                   typeof aiSuggestions.enhanced_description === 'string' && 
                   aiSuggestions.enhanced_description.trim() !== '' &&
                   aiSuggestions.enhanced_description !== formData.description && (
                    <AISuggestionCard
                      title="Description Enhancement"
                      content="AI has enhanced your description with more details and context." 
                      details={`${aiSuggestions.enhanced_description.substring(0, 100)}${aiSuggestions.enhanced_description.length > 100 ? '...' : ''}`}
                      onApply={() => applyAISuggestion('description', aiSuggestions.enhanced_description)}
                      applied={appliedSuggestions.description}
                    />
                  )}
                </div>
              ) : formData.title ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">AI is analyzing your task...</p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Start typing to get AI suggestions</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">💡 Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• Be specific in your task title for better AI suggestions</p>
              <p>• Add context in the description to improve prioritization</p>
              <p>• Use tags to organize related tasks</p>
              <p>• Set realistic deadlines for better planning</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TaskForm;

