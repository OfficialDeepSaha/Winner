import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '../hooks/useAuth';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '../services/calendarService';
import { fetchTasks } from '../services/taskService';
import LoadingSpinner from './LoadingSpinner';

const EventModal = ({ 
  event, 
  isOpen, 
  onClose, 
  isCreating = false, 
  onCreateTimeBlock,
  onEventChange 
}) => {
  const { token } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    start_time: new Date(),
    end_time: new Date(new Date().getTime() + 60 * 60 * 1000), // 1 hour later
    all_day: false,
    event_type: 'other',
    color: '',
    is_recurring: false,
    recurrence_pattern: '',
    recurrence_end_date: null,
    related_task_id: null
  });

  // Load tasks for the related task dropdown
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const tasksData = await fetchTasks(token, { status: 'pending' });
        setTasks(tasksData);
      } catch (error) {
        console.error('Error loading tasks:', error);
      }
    };
    
    loadTasks();
  }, [token]);

  // Initialize form with event data when available
  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || '',
        description: event.description || '',
        location: event.location || '',
        start_time: event.start_time ? new Date(event.start_time) : new Date(),
        end_time: event.end_time ? new Date(event.end_time) : new Date(new Date().getTime() + 60 * 60 * 1000),
        all_day: event.all_day || false,
        event_type: event.event_type || 'other',
        color: event.color || '',
        is_recurring: event.is_recurring || false,
        recurrence_pattern: event.recurrence_pattern || '',
        recurrence_end_date: event.recurrence_end_date ? new Date(event.recurrence_end_date) : null,
        related_task_id: event.related_task?.id || null
      });
    }
  }, [event]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name, checked) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (name, date) => {
    setFormData(prev => ({ ...prev, [name]: date }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Validate form
      if (!formData.title.trim()) {
        toast({
          title: "Error",
          description: "Event title is required",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Check if end time is after start time
      if (formData.start_time >= formData.end_time) {
        toast({
          title: "Error",
          description: "End time must be after start time",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Create or update event
        // Prepare payload for submission
        const payload = { ...formData };
        // Omit blank color to use default
        if (!payload.color) delete payload.color;
        // Omit recurrence if not recurring
        if (!payload.is_recurring) {
          delete payload.recurrence_pattern;
          delete payload.recurrence_end_date;
        }
        // Map unsupported event types to other
        if (payload.event_type === 'personal' || payload.event_type === 'deadline') {
          payload.event_type = 'other';
        }
      if (isCreating) {
        await createCalendarEvent(token, payload);
        toast({
          title: "Success",
          description: "Event created successfully",
        });
      } else {
        await updateCalendarEvent(token, event.id, payload);
        toast({
          title: "Success",
          description: "Event updated successfully",
        });
      }

      // Notify parent component of the change
      if (onEventChange) {
        onEventChange();
      }
      
      // Close the modal
      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      setLoading(true);
      try {
        await deleteCalendarEvent(token, event.id);
        toast({
          title: "Success",
          description: "Event deleted successfully",
        });
        
        // Notify parent component of the change
        if (onEventChange) {
          onEventChange();
        }
        
        // Close the modal
        onClose();
      } catch (error) {
        console.error('Error deleting event:', error);
        toast({
          title: "Error",
          description: "Failed to delete event. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isCreating ? 'Create Event' : 'Edit Event'}</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center p-4">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Event title"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Event description"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Event location"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.start_time ? (
                        format(formData.start_time, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.start_time}
                      onSelect={(date) => handleDateChange('start_time', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label>Start Time</Label>
                <div className="flex items-center">
                  <Input
                    type="time"
                    value={formData.start_time ? format(formData.start_time, "HH:mm") : ""}
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(':');
                      const newDate = new Date(formData.start_time);
                      newDate.setHours(parseInt(hours, 10));
                      newDate.setMinutes(parseInt(minutes, 10));
                      handleDateChange('start_time', newDate);
                    }}
                    disabled={formData.all_day}
                  />
                  <Clock className="ml-2 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.end_time ? (
                        format(formData.end_time, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.end_time}
                      onSelect={(date) => handleDateChange('end_time', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label>End Time</Label>
                <div className="flex items-center">
                  <Input
                    type="time"
                    value={formData.end_time ? format(formData.end_time, "HH:mm") : ""}
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(':');
                      const newDate = new Date(formData.end_time);
                      newDate.setHours(parseInt(hours, 10));
                      newDate.setMinutes(parseInt(minutes, 10));
                      handleDateChange('end_time', newDate);
                    }}
                    disabled={formData.all_day}
                  />
                  <Clock className="ml-2 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="all-day"
                checked={formData.all_day}
                onCheckedChange={(checked) => handleSwitchChange('all_day', checked)}
              />
              <Label htmlFor="all-day">All day event</Label>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="event-type">Event Type</Label>
              <Select
                value={formData.event_type}
                onValueChange={(value) => handleSelectChange('event_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="appointment">Appointment</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="deadline">Deadline</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="related-task">Related Task (Optional)</Label>
              <Select
                value={formData.related_task_id != null ? formData.related_task_id : "none"}
                onValueChange={(value) => handleSelectChange('related_task_id', value === "none" ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a task" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {tasks.map(task => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="is-recurring"
                checked={formData.is_recurring}
                onCheckedChange={(checked) => handleSwitchChange('is_recurring', checked)}
              />
              <Label htmlFor="is-recurring">Recurring event</Label>
            </div>
            
            {formData.is_recurring && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="recurrence-pattern">Recurrence Pattern</Label>
                  <Select
                    value={formData.recurrence_pattern}
                    onValueChange={(value) => handleSelectChange('recurrence_pattern', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select pattern" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Recurrence End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.recurrence_end_date ? (
                          format(formData.recurrence_end_date, "PPP")
                        ) : (
                          <span>No end date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.recurrence_end_date}
                        onSelect={(date) => handleDateChange('recurrence_end_date', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}
          </div>
        )}
        
        <DialogFooter className="flex justify-between">
          <div>
            {!isCreating && (
              <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                Delete
              </Button>
            )}
            {isCreating && (
              <Button variant="secondary" onClick={onCreateTimeBlock} disabled={loading}>
                Create as Time Block
              </Button>
            )}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {isCreating ? 'Create' : 'Update'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EventModal;
