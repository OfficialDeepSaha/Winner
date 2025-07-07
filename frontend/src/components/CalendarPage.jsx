import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from "@/hooks/use-toast";
import Calendar from './Calendar';
import { fetchTodayTimeBlocks, fetchTodayEvents, createTimeBlock } from '../services/calendarService';
import { getOptimizedSchedule } from '../services/aiSchedulingService';
import { useTasks } from '../hooks/useTasks';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const CalendarPage = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const { tasks, fetchTasks } = useTasks();
  const [todayEvents, setTodayEvents] = useState([]);
  const [todayTimeBlocks, setTodayTimeBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [showOptimizeDialog, setShowOptimizeDialog] = useState(false);
  const [optimizedSchedule, setOptimizedSchedule] = useState([]);
  const [applyingSchedule, setApplyingSchedule] = useState(false);
  // Counter to trigger calendar refresh
  const [calendarRefreshCounter, setCalendarRefreshCounter] = useState(0);

  // Fetch today's events and time blocks for the sidebar
  useEffect(() => {
    const fetchTodayData = async () => {
      try {
        const [events, timeBlocks] = await Promise.all([
          fetchTodayEvents(token),
          fetchTodayTimeBlocks(token)
        ]);
        
        setTodayEvents(events);
        setTodayTimeBlocks(timeBlocks);
      } catch (error) {
        console.error('Error fetching today\'s calendar data:', error);
        toast({
          title: "Error",
          description: "Failed to load today's calendar data.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchTodayData();
    // Also fetch tasks to have them available for optimization
    fetchTasks();
  }, [token, calendarRefreshCounter]);
  
  // Function to optimize schedule using AI
  const optimizeSchedule = async () => {
    try {
      setOptimizing(true);
      
      // Filter tasks that are pending or in progress
      const tasksToSchedule = tasks.filter(task => 
        (task.status === 'pending' || task.status === 'in_progress') && 
        !task.scheduled_start_time
      );
      
      if (tasksToSchedule.length === 0) {
        toast({
          title: "No Tasks to Schedule",
          description: "There are no pending tasks without scheduled times.",
        });
        return;
      }
      
      // Call the backend API for optimized scheduling
      const result = await getOptimizedSchedule(token, tasksToSchedule);
      
      // Set the optimized schedule
      setOptimizedSchedule(result.schedule);
      
      // Show the optimize dialog
      setShowOptimizeDialog(true);
      
    } catch (error) {
      console.error('Error optimizing schedule:', error);
      toast({
        title: "Error",
        description: "Failed to optimize schedule.",
        variant: "destructive",
      });
    } finally {
      setOptimizing(false);
    }
  };
  
  // Function to apply the optimized schedule
  const applyOptimizedSchedule = async () => {
    try {
      setApplyingSchedule(true);
      
      // Create time blocks for each scheduled task
      for (const item of optimizedSchedule) {
        await createTimeBlock(token, {
          task_id: item.task_id, // Changed from 'task' to 'task_id' to match backend serializer
          start_time: item.suggested_start_time,
          end_time: item.suggested_end_time,
          status: 'scheduled',
          notes: `AI-optimized schedule: ${item.reasoning}`,
        });
      }
      
      // Close the dialog
      setShowOptimizeDialog(false);
      
      // Refresh the time blocks
      const updatedTimeBlocks = await fetchTodayTimeBlocks(token);
        // Trigger calendar refresh
        setCalendarRefreshCounter(prev => prev + 1);
      setTodayTimeBlocks(updatedTimeBlocks);
      
      toast({
        title: "Schedule Applied",
        description: `Successfully created ${optimizedSchedule.length} time blocks.`,
      });
      
    } catch (error) {
      console.error('Error applying optimized schedule:', error);
      toast({
        title: "Error",
        description: "Failed to apply optimized schedule.",
        variant: "destructive",
      });
    } finally {
      setApplyingSchedule(false);
    }
  };

  return (
    <div className="container mx-auto p-4 h-full">
      <div className="flex flex-col lg:flex-row gap-4 h-full">
        {/* Main Calendar */}
        <div className="lg:w-3/4 h-full">
          <Calendar refreshFlag={calendarRefreshCounter} />
        </div>
        
        {/* Sidebar */}
        <div className="lg:w-1/4 space-y-4">
          {/* Today's Events */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Today's Events</CardTitle>
            </CardHeader>
            <CardContent>
              {todayEvents.length === 0 ? (
                <p className="text-muted-foreground">No events scheduled for today</p>
              ) : (
                <ul className="space-y-2">
                  {todayEvents.map(event => (
                    <li key={event.id} className="border-l-4 pl-3 py-1" style={{ borderColor: event.color || '#6b7280' }}>
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {' - '}
                        {new Date(event.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          
          {/* Today's Time Blocks */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Today's Time Blocks</CardTitle>
            </CardHeader>
            <CardContent>
              {todayTimeBlocks.length === 0 ? (
                <p className="text-muted-foreground">No time blocks scheduled for today</p>
              ) : (
                <ul className="space-y-2">
                  {todayTimeBlocks.map(block => {
                    // Define colors based on status
                    const statusColors = {
                      scheduled: '#3b82f6', // blue
                      in_progress: '#10b981', // green
                      completed: '#6b7280', // gray
                      cancelled: '#ef4444', // red
                    };
                    
                    return (
                      <li key={block.id} className="border-l-4 pl-3 py-1" style={{ borderColor: statusColors[block.status] || '#6b7280' }}>
                        <p className="font-medium">{block.task_title}</p>
                        <div className="flex justify-between">
                          <p className="text-sm text-muted-foreground">
                            {new Date(block.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {' - '}
                            {new Date(block.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">
                            {block.status}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
          
          {/* AI Schedule Optimization */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">AI Schedule Optimization</CardTitle>
              <CardDescription>
                Let AI optimize your schedule based on task priorities and deadlines
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={optimizeSchedule} 
                disabled={optimizing} 
                className="w-full flex items-center justify-center gap-2"
              >
                {optimizing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Optimize My Schedule
                  </>
                )}
              </Button>
            </CardContent>
            <CardFooter>
              <p className="text-xs text-muted-foreground">
                This will analyze your pending tasks and suggest the optimal time blocks based on priorities, deadlines, and your calendar.
              </p>
            </CardFooter>
          </Card>
          
          {/* Tips */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Time Blocking Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Block time for your most important tasks first</li>
                <li>Schedule similar tasks together to minimize context switching</li>
                <li>Include buffer time between blocks for breaks and transitions</li>
                <li>Be realistic about how long tasks will take</li>
                <li>Review and adjust your time blocks regularly</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Optimize Schedule Dialog */}
      <Dialog open={showOptimizeDialog} onOpenChange={setShowOptimizeDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI-Optimized Schedule</DialogTitle>
            <DialogDescription>
              Based on your tasks, priorities, and calendar, here's an optimized schedule.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {optimizedSchedule.length > 0 ? (
              <div className="space-y-4">
                <h3 className="font-medium">Suggested Time Blocks</h3>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="py-2 px-4 text-left">Task</th>
                        <th className="py-2 px-4 text-left">Start Time</th>
                        <th className="py-2 px-4 text-left">End Time</th>
                        <th className="py-2 px-4 text-left">Priority</th>
                      </tr>
                    </thead>
                    <tbody className="bg-background">
                      {optimizedSchedule.map((item, index) => (
                        <tr key={index} className="border-t border-border">
                          <td className="py-2 px-4">{item.task_title}</td>
                          <td className="py-2 px-4">
                            {new Date(item.suggested_start_time).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: true 
                            })}
                          </td>
                          <td className="py-2 px-4">
                            {new Date(item.suggested_end_time).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: true 
                            })}
                          </td>
                          <td className="py-2 px-4">
                            <span className="inline-block px-2 py-1 rounded-full text-xs bg-muted text-foreground">
                              {item.priority}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <p>This schedule is optimized to maximize your productivity based on task priorities and deadlines.</p>
                </div>
              </div>
            ) : (
              <p>No schedule suggestions available.</p>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOptimizeDialog(false)}>Cancel</Button>
            <Button 
              onClick={applyOptimizedSchedule} 
              disabled={applyingSchedule || optimizedSchedule.length === 0}
              className="flex items-center gap-2"
            >
              {applyingSchedule ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Apply to Calendar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarPage;
