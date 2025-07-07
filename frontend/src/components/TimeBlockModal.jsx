import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '../hooks/useAuth';
import { createTimeBlock, updateTimeBlock, deleteTimeBlock } from '../services/calendarService';
import { fetchTasks } from '../services/taskService';
import LoadingSpinner from './LoadingSpinner';

const TimeBlockModal = ({ 
  timeBlock, 
  isOpen, 
  onClose, 
  isCreating = false, 
  onTimeBlockChange 
}) => {
  const { token } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [formData, setFormData] = useState({
    task_id: '',
    start_time: new Date(),
    end_time: new Date(new Date().getTime() + 60 * 60 * 1000), // 1 hour later
    status: 'scheduled',
    notes: '',
    actual_start_time: null,
    actual_end_time: null
  });

  // Load tasks for the task dropdown
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const tasksData = await fetchTasks(token, { status: ['pending', 'in_progress'] });
        setTasks(tasksData);
      } catch (error) {
        console.error('Error loading tasks:', error);
      }
    };
    
    loadTasks();
  }, [token]);

  // Initialize form with time block data when available
  useEffect(() => {
    if (timeBlock) {
      setFormData({
        task_id: timeBlock.task?.id || '',
        start_time: timeBlock.start_time ? new Date(timeBlock.start_time) : new Date(),
        end_time: timeBlock.end_time ? new Date(timeBlock.end_time) : new Date(new Date().getTime() + 60 * 60 * 1000),
        status: timeBlock.status || 'scheduled',
        notes: timeBlock.notes || '',
        actual_start_time: timeBlock.actual_start_time ? new Date(timeBlock.actual_start_time) : null,
        actual_end_time: timeBlock.actual_end_time ? new Date(timeBlock.actual_end_time) : null
      });
    }
  }, [timeBlock]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
      if (!formData.task_id) {
        toast({
          title: "Error",
          description: "Please select a task",
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

      // Create or update time block
      if (isCreating) {
        await createTimeBlock(token, formData);
        toast({
          title: "Success",
          description: "Time block created successfully",
        });
      } else {
        await updateTimeBlock(token, timeBlock.id, formData);
        toast({
          title: "Success",
          description: "Time block updated successfully",
        });
      }

      // Notify parent component of the change
      if (onTimeBlockChange) {
        onTimeBlockChange();
      }
      
      // Close the modal
      onClose();
    } catch (error) {
      console.error('Error saving time block:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save time block. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this time block?')) {
      setLoading(true);
      try {
        await deleteTimeBlock(token, timeBlock.id);
        toast({
          title: "Success",
          description: "Time block deleted successfully",
        });
        
        // Notify parent component of the change
        if (onTimeBlockChange) {
          onTimeBlockChange();
        }
        
        // Close the modal
        onClose();
      } catch (error) {
        console.error('Error deleting time block:', error);
        toast({
          title: "Error",
          description: "Failed to delete time block. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle marking time block as started
  const handleStart = async () => {
    setLoading(true);
    try {
      await updateTimeBlock(token, timeBlock.id, {
        ...formData,
        status: 'in_progress',
        actual_start_time: new Date()
      });
      toast({
        title: "Success",
        description: "Time block started",
      });
      
      // Notify parent component of the change
      if (onTimeBlockChange) {
        onTimeBlockChange();
      }
      
      // Close the modal
      onClose();
    } catch (error) {
      console.error('Error starting time block:', error);
      toast({
        title: "Error",
        description: "Failed to start time block. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  // Handle marking time block as completed
  const handleComplete = async () => {
    setLoading(true);
    try {
      await updateTimeBlock(token, timeBlock.id, {
        ...formData,
        status: 'completed',
        actual_end_time: new Date()
      });
      toast({
        title: "Success",
        description: "Time block completed",
      });
      
      // Notify parent component of the change
      if (onTimeBlockChange) {
        onTimeBlockChange();
      }
      
      // Close the modal
      onClose();
    } catch (error) {
      console.error('Error completing time block:', error);
      toast({
        title: "Error",
        description: "Failed to complete time block. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isCreating ? 'Create Time Block' : 'Edit Time Block'}</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center p-4">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task">Task</Label>
              <Select
                value={formData.task_id}
                onValueChange={(value) => handleSelectChange('task_id', value)}
                disabled={!isCreating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a task" />
                </SelectTrigger>
                <SelectContent>
                  {tasks.map(task => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  />
                  <Clock className="ml-2 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
            
            {!isCreating && (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleSelectChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Add notes about this time block"
                rows={3}
              />
            </div>
            
            {!isCreating && formData.status !== 'scheduled' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Actual Start Time</Label>
                    <Input
                      type="datetime-local"
                      value={formData.actual_start_time ? format(formData.actual_start_time, "yyyy-MM-dd'T'HH:mm") : ""}
                      onChange={(e) => {
                        const newDate = new Date(e.target.value);
                        handleDateChange('actual_start_time', newDate);
                      }}
                    />
                  </div>
                  
                  {formData.status === 'completed' && (
                    <div className="space-y-2">
                      <Label>Actual End Time</Label>
                      <Input
                        type="datetime-local"
                        value={formData.actual_end_time ? format(formData.actual_end_time, "yyyy-MM-dd'T'HH:mm") : ""}
                        onChange={(e) => {
                          const newDate = new Date(e.target.value);
                          handleDateChange('actual_end_time', newDate);
                        }}
                      />
                    </div>
                  )}
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
          </div>
          <div className="flex space-x-2">
            {!isCreating && formData.status === 'scheduled' && (
              <Button variant="secondary" onClick={handleStart} disabled={loading}>
                Start Now
              </Button>
            )}
            {!isCreating && formData.status === 'in_progress' && (
              <Button variant="secondary" onClick={handleComplete} disabled={loading}>
                Complete
              </Button>
            )}
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

export default TimeBlockModal;
