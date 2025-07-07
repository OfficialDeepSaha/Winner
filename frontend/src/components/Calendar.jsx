import React, { useState, useEffect } from 'react';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '../hooks/useAuth';
import { fetchCalendarEvents, fetchTimeBlocks } from '../services/calendarService';
import EventModal from './EventModal';
import TimeBlockModal from './TimeBlockModal';
import LoadingSpinner from './LoadingSpinner';

// Setup the localizer for BigCalendar
const localizer = momentLocalizer(moment);

// Define event colors based on event type
const eventTypeColors = {
  meeting: '#4338ca', // indigo
  appointment: '#0891b2', // cyan
  reminder: '#ca8a04', // yellow
  deadline: '#dc2626', // red
  task: '#059669', // emerald
  personal: '#7c3aed', // violet
  other: '#6b7280', // gray
};

// Define time block colors based on status
const timeBlockStatusColors = {
  scheduled: '#3b82f6', // blue
  in_progress: '#10b981', // green
  completed: '#6b7280', // gray
  cancelled: '#ef4444', // red
};

const Calendar = ({ refreshFlag }) => {
  const { token } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [timeBlocks, setTimeBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedTimeBlock, setSelectedTimeBlock] = useState(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isTimeBlockModalOpen, setIsTimeBlockModalOpen] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [isCreatingTimeBlock, setIsCreatingTimeBlock] = useState(false);

  // Fetch calendar events and time blocks
  const fetchData = async () => {
    setLoading(true);
    try {
      // Get the date range for the current view
      let start, end;
      
      if (view === 'month') {
        start = moment(date).startOf('month').format('YYYY-MM-DD');
        end = moment(date).endOf('month').format('YYYY-MM-DD');
      } else if (view === 'week') {
        start = moment(date).startOf('week').format('YYYY-MM-DD');
        end = moment(date).endOf('week').format('YYYY-MM-DD');
      } else {
        start = moment(date).startOf('day').format('YYYY-MM-DD');
        end = moment(date).endOf('day').format('YYYY-MM-DD');
      }
      
      // Fetch events for the date range
      const [eventsData, timeBlocksData] = await Promise.all([
        fetchCalendarEvents(token, { start_date: start, end_date: end }),
        fetchTimeBlocks(token, { start_from: start, start_to: end })
      ]);
      
      // Transform events for the calendar
      const formattedEvents = eventsData.map(event => ({
        id: event.id,
        title: event.title,
        start: new Date(event.start_time),
        end: new Date(event.end_time),
        allDay: event.all_day,
        resource: {
          type: 'event',
          eventType: event.event_type,
          color: event.color || eventTypeColors[event.event_type] || eventTypeColors.other,
          originalEvent: event
        }
      }));
      
      // Transform time blocks for the calendar
      const formattedTimeBlocks = timeBlocksData.map(block => ({
        id: block.id,
        title: `[${block.task_title}] ${block.status}`,
        start: new Date(block.start_time),
        end: new Date(block.end_time),
        allDay: false,
        resource: {
          type: 'timeBlock',
          status: block.status,
          color: timeBlockStatusColors[block.status] || timeBlockStatusColors.scheduled,
          originalBlock: block
        }
      }));
      
      setEvents(formattedEvents);
      setTimeBlocks(formattedTimeBlocks);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast({
        title: "Error",
        description: "Failed to load calendar data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, view, date, refreshFlag]);

  // Handle event selection
  const handleSelectEvent = (event) => {
    if (event.resource.type === 'event') {
      setSelectedEvent(event.resource.originalEvent);
      setIsEventModalOpen(true);
    } else {
      setSelectedTimeBlock(event.resource.originalBlock);
      setIsTimeBlockModalOpen(true);
    }
  };

  // Handle slot selection (creating new event or time block)
  const handleSelectSlot = ({ start, end }) => {
    // Default to creating an event, can be changed by the user
    setIsCreatingEvent(true);
    setSelectedEvent({
      title: '',
      description: '',
      start_time: start,
      end_time: end,
      all_day: false,
      event_type: 'other',
    });
    setIsEventModalOpen(true);
  };

  // Event styling
  const eventStyleGetter = (event) => {
    const style = {
      backgroundColor: event.resource.color,
      borderRadius: '4px',
      opacity: 0.8,
      color: 'white',
      border: '0px',
      display: 'block',
    };
    return { style };
  };

  // Handle creating a new time block instead of an event
  const handleCreateTimeBlock = () => {
    setIsCreatingEvent(false);
    setIsCreatingTimeBlock(true);
    setIsEventModalOpen(false);
    
    // Initialize with the same time range
    setSelectedTimeBlock({
      start_time: selectedEvent.start_time,
      end_time: selectedEvent.end_time,
      status: 'scheduled',
    });
    
    setIsTimeBlockModalOpen(true);
  };

  // Refresh calendar after changes
  const handleEventChange = () => {
    fetchData();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setIsCreatingEvent(true);
              setSelectedEvent({
                title: '',
                description: '',
                start_time: new Date(),
                end_time: moment().add(1, 'hour').toDate(),
                all_day: false,
                event_type: 'other',
              });
              setIsEventModalOpen(true);
            }}
          >
            New Event
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setIsCreatingTimeBlock(true);
              setSelectedTimeBlock({
                start_time: new Date(),
                end_time: moment().add(1, 'hour').toDate(),
                status: 'scheduled',
              });
              setIsTimeBlockModalOpen(true);
            }}
          >
            New Time Block
          </Button>
        </div>
      </div>
      
      <Tabs 
        defaultValue="calendar" 
        className="flex-1 flex flex-col"
        onValueChange={(value) => {
          if (value === 'timeBlocks') {
            setView('day'); // Default to day view for time blocks
          }
        }}
      >
        <TabsList className="mb-4">
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="timeBlocks">Time Blocks</TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar" className="flex-1 flex flex-col">
          <Card className="flex-1">
            <CardContent className="p-4 h-full">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <LoadingSpinner />
                </div>
              ) : (
                <BigCalendar
                  localizer={localizer}
                  events={[...events, ...timeBlocks]}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: '100%' }}
                  views={['month', 'week', 'day']}
                  view={view}
                  date={date}
                  onView={setView}
                  onNavigate={setDate}
                  onSelectEvent={handleSelectEvent}
                  onSelectSlot={handleSelectSlot}
                  selectable
                  eventPropGetter={eventStyleGetter}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="timeBlocks" className="flex-1 flex flex-col">
          <Card className="flex-1">
            <CardContent className="p-4 h-full">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <LoadingSpinner />
                </div>
              ) : (
                <BigCalendar
                  localizer={localizer}
                  events={timeBlocks}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: '100%' }}
                  views={['day', 'week']}
                  view={view}
                  date={date}
                  onView={setView}
                  onNavigate={setDate}
                  onSelectEvent={handleSelectEvent}
                  onSelectSlot={handleSelectSlot}
                  selectable
                  eventPropGetter={eventStyleGetter}
                  defaultView="day"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Event Modal */}
      {isEventModalOpen && (
        <EventModal
          event={selectedEvent}
          isOpen={isEventModalOpen}
          onClose={() => {
            setIsEventModalOpen(false);
            setSelectedEvent(null);
          }}
          isCreating={isCreatingEvent}
          onCreateTimeBlock={handleCreateTimeBlock}
          onEventChange={handleEventChange}
        />
      )}

      {/* Time Block Modal */}
      {isTimeBlockModalOpen && (
        <TimeBlockModal
          timeBlock={selectedTimeBlock}
          isOpen={isTimeBlockModalOpen}
          onClose={() => {
            setIsTimeBlockModalOpen(false);
            setSelectedTimeBlock(null);
          }}
          isCreating={isCreatingTimeBlock}
          onTimeBlockChange={handleEventChange}
        />
      )}
    </div>
  );
};

export default Calendar;
