'use client';

import { useState } from 'react';

interface TimeSlot {
  hour: number;
  label: string;
}

interface CourtReservation {
  date: string;
  hour: number;
  courtType: 'beginner' | 'intermediate' | 'advanced' | 'challenge';
  userId: string;
  type: 'court';
}

interface BayReservation {
  date: string;
  startHour: number;
  startMinute: number;
  duration: 30 | 60 | 90 | 120; // minutes
  bayNumber: number;
  userId: string;
  type: 'bay';
}

interface PrivateCourtReservation {
  date: string;
  hour: number;
  userId: string;
  type: 'private-court';
}

interface CalendarBlock {
  id: string;
  date: string;
  startHour: number;
  endHour: number;
  reason: string;
  type: 'block';
}

interface GroupTrainingEvent {
  id: string;
  date: string;
  hour: number;
  duration: number; // hours
  title: string;
  description: string;
  maxParticipants: number;
  creditsRequired: number;
  participants: string[];
  type: 'group-training';
}

type Reservation = CourtReservation | BayReservation | PrivateCourtReservation;
type CalendarItem = Reservation | CalendarBlock | GroupTrainingEvent;

interface User {
  id: string;
  email: string;
  name: string;
  role: 'member' | 'admin';
  credits: number;
}

interface CourtTypeSignups {
  beginner: string[];
  intermediate: string[];
  advanced: string[];
  challenge: string[];
}

const DAYS_OF_WEEK = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const COURTS = ['Court 1', 'Court 2', 'Court 3', 'Court 4'];
const BAYS = ['Bay 1', 'Bay 2'];
const COURT_TYPES = ['beginner', 'intermediate', 'advanced', 'challenge'] as const;
const BAY_DURATIONS = [30, 60, 90, 120] as const;
const MAX_PARTICIPANTS = 12;
const COURT_BOOKING_DURATION_HOURS = 2; // Courts are booked for 2 hours

// Generate time slots from 8 AM to 8 PM (hourly for bays)
const generateTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  for (let hour = 8; hour <= 20; hour++) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    slots.push({
      hour,
      label: `${displayHour} ${period}`,
    });
  }
  return slots;
};

// Generate time slots for courts (2-hour intervals: 8am, 10am, 12pm, 2pm, 4pm, 6pm)
const generateCourtTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  for (let hour = 8; hour <= 18; hour += 2) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    slots.push({
      hour,
      label: `${displayHour} ${period}`,
    });
  }
  return slots;
};

export default function Home() {
  // Initialize with today's date
  const getInitialDate = (): Date => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  const [selectedDate, setSelectedDate] = useState<Date>(getInitialDate());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ date: string; hour: number } | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [calendarBlocks, setCalendarBlocks] = useState<CalendarBlock[]>([]);
  const [groupTrainingEvents, setGroupTrainingEvents] = useState<GroupTrainingEvent[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginMode, setLoginMode] = useState<'member' | 'admin'>('member');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showBayBookingModal, setShowBayBookingModal] = useState(false);
  const [showPrivateCourtModal, setShowPrivateCourtModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showGroupEventModal, setShowGroupEventModal] = useState(false);
  const [showMySessionsModal, setShowMySessionsModal] = useState(false);
  const [showPurchaseCreditsModal, setShowPurchaseCreditsModal] = useState(false);
  const [selectedBayDuration, setSelectedBayDuration] = useState<30 | 60 | 90 | 120 | null>(null);
  const [selectedPrivateCourtDate, setSelectedPrivateCourtDate] = useState<string>('');
  const [viewMode, setViewMode] = useState<'courts' | 'bays' | 'both'>('courts');
  const [searchDate, setSearchDate] = useState<string>('');
  const [selectedCourtLevel, setSelectedCourtLevel] = useState<'beginner' | 'intermediate' | 'advanced' | 'challenge' | 'all'>('all');

  const timeSlots = generateTimeSlots(); // For bays (hourly)
  const courtTimeSlots = generateCourtTimeSlots(); // For courts (2-hour intervals)
  
  // Get the appropriate time slots based on view mode
  const getDisplayTimeSlots = (): TimeSlot[] => {
    if (viewMode === 'courts') {
      return courtTimeSlots;
    } else if (viewMode === 'bays') {
      return timeSlots;
    } else {
      // Both mode: show all hours but indicate court availability
      return timeSlots;
    }
  };

  // Helper function to get time label for any hour
  const getTimeLabel = (hour: number): string => {
    const slot = timeSlots.find(s => s.hour === hour);
    if (slot) return slot.label;
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour} ${period}`;
  };

  // Get dates for the current week
  const getWeekDates = (): Date[] => {
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Use today as the reference point, or selectedDate if it's in the future
    const referenceDate = selectedDate >= today ? selectedDate : today;
    const startOfWeek = new Date(referenceDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  // Get week number of the year
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  // Get date from week number
  const getDateFromWeek = (year: number, week: number): Date => {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4) {
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    } else {
      ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    }
    return ISOweekStart;
  };

  // Handle date search
  const handleDateSearch = (dateString: string) => {
    if (dateString) {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);
        
        // Don't allow selecting dates in the past - use today instead
        const selectedDate = date < today ? today : date;
        setSelectedDate(selectedDate);
        setSearchDate(formatDate(selectedDate));
      }
    }
  };

  // Navigate weeks
  const navigateWeek = (direction: 'prev' | 'next') => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    
    // Don't allow navigating to weeks before today
    if (direction === 'prev' && newDate < today) {
      // Set to today instead
      setSelectedDate(today);
    } else {
      setSelectedDate(newDate);
    }
    setSearchDate('');
  };

  // Ensure selectedDate is at least today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const effectiveSelectedDate = selectedDate < today ? today : selectedDate;
  
  const weekDates = getWeekDates();
  const currentWeekNumber = getWeekNumber(effectiveSelectedDate);
  const currentYear = effectiveSelectedDate.getFullYear();

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const getDateLabel = (date: Date): string => {
    return date.getDate().toString();
  };

  // Get signups for a specific time slot (courts only)
  // Courts are booked for 2 hours, so we need to check if this hour falls within any 2-hour booking
  const getSignupsForTimeSlot = (date: Date, hour: number): CourtTypeSignups => {
    const dateStr = formatDate(date);
    const courtReservations = reservations.filter(
      (r) => r.type === 'court' && r.date === dateStr
    ) as CourtReservation[];

    const signups: CourtTypeSignups = {
      beginner: [],
      intermediate: [],
      advanced: [],
      challenge: [],
    };

    // Check if this hour falls within any 2-hour court booking
    courtReservations.forEach((res) => {
      // A booking at res.hour covers res.hour to res.hour + 2
      // So hour is covered if: res.hour <= hour < res.hour + 2
      if (hour >= res.hour && hour < res.hour + COURT_BOOKING_DURATION_HOURS) {
        signups[res.courtType].push(res.userId);
      }
    });

    return signups;
  };

  // Check if a date/time is in the past
  const isPastDateTime = (date: Date, hour: number): boolean => {
    const now = new Date();
    const bookingDateTime = new Date(date);
    bookingDateTime.setHours(hour, 0, 0, 0);
    return bookingDateTime < now;
  };

  // Check if a time slot is blocked
  const isTimeSlotBlocked = (date: Date, hour: number): boolean => {
    const dateStr = formatDate(date);
    return calendarBlocks.some((block) => {
      if (block.date !== dateStr) return false;
      return hour >= block.startHour && hour < block.endHour;
    });
  };

  // Check if a court time slot is available (considering 2-hour bookings and blocks)
  const isCourtTimeSlotAvailable = (date: Date, hour: number): boolean => {
    // Check if date/time is in the past
    if (isPastDateTime(date, hour)) {
      return false;
    }

    // Check if booking would extend past closing time (8 PM = hour 20)
    // Latest booking time is 6 PM (6 PM - 8 PM = 2 hours)
    if (hour + COURT_BOOKING_DURATION_HOURS > 20) {
      return false;
    }

    // Check if blocked
    if (isTimeSlotBlocked(date, hour) || isTimeSlotBlocked(date, hour + 1)) {
      return false;
    }

    const dateStr = formatDate(date);
    const courtReservations = reservations.filter(
      (r) => r.type === 'court' && r.date === dateStr
    ) as CourtReservation[];

    // Check if this hour conflicts with any existing 2-hour booking
    for (const reservation of courtReservations) {
      // A booking at reservation.hour covers reservation.hour to reservation.hour + 2
      // So hour conflicts if: reservation.hour <= hour < reservation.hour + 2
      if (hour >= reservation.hour && hour < reservation.hour + COURT_BOOKING_DURATION_HOURS) {
        return false;
      }
      // Also check if a booking starting at hour would conflict with this reservation
      // A booking starting at hour would cover hour to hour + 2
      // It conflicts if: hour < reservation.hour + 2 && hour + 2 > reservation.hour
      if (hour < reservation.hour + COURT_BOOKING_DURATION_HOURS && hour + COURT_BOOKING_DURATION_HOURS > reservation.hour) {
        return false;
      }
    }

    return true;
  };

  // Check if a bay time slot is available
  const isBayTimeSlotAvailable = (date: Date, hour: number, minute: number, duration: number, bayNumber: number): boolean => {
    // Check if date/time is in the past
    if (isPastDateTime(date, hour)) {
      // Also check if the end time would be in the past
      const endHour = hour + Math.floor((minute + duration) / 60);
      if (isPastDateTime(date, endHour)) {
        return false;
      }
    }

    // Check if blocked
    const dateStr = formatDate(date);
    const startTime = hour * 60 + minute;
    const endTime = startTime + duration;
    
    // Check if any part of the duration overlaps with a block
    for (let checkHour = hour; checkHour < hour + Math.ceil(duration / 60); checkHour++) {
      if (isTimeSlotBlocked(date, checkHour)) {
        return false;
      }
    }

    const bayReservations = reservations.filter(
      (r) => r.type === 'bay' && r.date === dateStr && r.bayNumber === bayNumber
    ) as BayReservation[];

    // Check for conflicts
    for (const reservation of bayReservations) {
      const resStart = reservation.startHour * 60 + reservation.startMinute;
      const resEnd = resStart + reservation.duration;

      // Check if there's any overlap
      if (!(endTime <= resStart || startTime >= resEnd)) {
        return false;
      }
    }

    return true;
  };

  // Get available bays for a time slot
  const getAvailableBays = (date: Date, hour: number, minute: number, duration: number): number[] => {
    const availableBays: number[] = [];
    for (let i = 1; i <= BAYS.length; i++) {
      if (isBayTimeSlotAvailable(date, hour, minute, duration, i)) {
        availableBays.push(i);
      }
    }
    return availableBays;
  };

  // Check if user is already signed up for this time slot (courts)
  // Courts are 2-hour bookings, so check if user has a booking that covers this hour
  const isUserSignedUp = (date: Date, hour: number): boolean => {
    const dateStr = formatDate(date);
    const userCourtReservations = reservations.filter(
      (r) => r.type === 'court' && r.date === dateStr && r.userId === currentUserId
    ) as CourtReservation[];

    // Check if this hour falls within any of the user's 2-hour bookings
    return userCourtReservations.some((res) => {
      return hour >= res.hour && hour < res.hour + COURT_BOOKING_DURATION_HOURS;
    });
  };

  // Check if user has a bay reservation at this time
  const hasUserBayReservation = (date: Date, hour: number): boolean => {
    const dateStr = formatDate(date);
    const bayReservations = reservations.filter(
      (r) => r.type === 'bay' && r.date === dateStr && r.userId === currentUserId
    ) as BayReservation[];

    const timeInMinutes = hour * 60;
    return bayReservations.some((res) => {
      const resStart = res.startHour * 60 + res.startMinute;
      const resEnd = resStart + res.duration;
      return timeInMinutes >= resStart && timeInMinutes < resEnd;
    });
  };

  // Get total signups count for a time slot (courts)
  const getTotalSignups = (date: Date, hour: number): number => {
    const signups = getSignupsForTimeSlot(date, hour);
    if (selectedCourtLevel === 'all') {
      return signups.beginner.length + signups.intermediate.length + 
             signups.advanced.length + signups.challenge.length;
    }
    return signups[selectedCourtLevel].length;
  };

  // Get signups for selected level
  const getSignupsForSelectedLevel = (date: Date, hour: number): number => {
    if (selectedCourtLevel === 'all') return getTotalSignups(date, hour);
    const signups = getSignupsForTimeSlot(date, hour);
    return signups[selectedCourtLevel].length;
  };

  // Get bay reservation count for a time slot
  const getBayReservationCount = (date: Date, hour: number): number => {
    const dateStr = formatDate(date);
    const bayReservations = reservations.filter(
      (r) => r.type === 'bay' && r.date === dateStr
    ) as BayReservation[];

    const timeInMinutes = hour * 60;
    return bayReservations.filter((res) => {
      const resStart = res.startHour * 60 + res.startMinute;
      const resEnd = resStart + res.duration;
      return timeInMinutes >= resStart && timeInMinutes < resEnd;
    }).length;
  };

  // Handle time slot click
  const handleTimeSlotClick = (date: Date, hour: number) => {
    if (!isSignedIn) {
      alert('Please sign in to book a court or bay');
      return;
    }
    setSelectedTimeSlot({ date: formatDate(date), hour });
    
    // Show appropriate modal based on view mode
    if (viewMode === 'bays') {
      setShowBayBookingModal(true);
    } else if (viewMode === 'courts') {
      setShowBookingModal(true);
    } else {
      // Both mode - show bay modal if not a valid court time (2-hour intervals)
      const isValidCourtTime = hour % 2 === 0 && hour <= 18;
      if (isValidCourtTime) {
        setShowBookingModal(true);
      } else {
        setShowBayBookingModal(true);
      }
    }
  };

  // Handle booking for a specific court type
  const handleBooking = (courtType: 'beginner' | 'intermediate' | 'advanced' | 'challenge') => {
    if (!selectedTimeSlot || !currentUser || currentUser.credits < 1) {
      alert('Insufficient credits');
      return;
    }

    const bookingDate = new Date(selectedTimeSlot.date);
    if (isPastDateTime(bookingDate, selectedTimeSlot.hour)) {
      alert('Cannot book a time slot in the past');
      return;
    }

    // Check if the time slot is available (considering 2-hour bookings)
    if (!isCourtTimeSlotAvailable(new Date(selectedTimeSlot.date), selectedTimeSlot.hour)) {
      alert('This time slot is not available (conflicts with existing 2-hour booking)');
      return;
    }

    // Check if user is already signed up
    if (isUserSignedUp(new Date(selectedTimeSlot.date), selectedTimeSlot.hour)) {
      alert('You are already signed up for this time slot');
      return;
    }

    // Check if court type is full
    const signups = getSignupsForTimeSlot(new Date(selectedTimeSlot.date), selectedTimeSlot.hour);
    if (signups[courtType].length >= MAX_PARTICIPANTS) {
      alert(`${courtType.charAt(0).toUpperCase() + courtType.slice(1)} court is full`);
      return;
    }

    setReservations([
      ...reservations,
      {
        type: 'court',
        date: selectedTimeSlot.date,
        hour: selectedTimeSlot.hour,
        courtType,
        userId: currentUserId,
      },
    ]);
    // Update user credits
    if (currentUser) {
      setCurrentUser({ ...currentUser, credits: currentUser.credits - 1 });
    }
    setShowBookingModal(false);
    setSelectedTimeSlot(null);
    alert(`Successfully signed up for ${courtType} court for 2 hours!`);
  };

  // Handle bay booking
  const handleBayBooking = (duration: 30 | 60 | 90 | 120, bayNumber: number) => {
    if (!selectedTimeSlot || !currentUser || currentUser.credits < 1) {
      alert('Insufficient credits');
      return;
    }

    const bookingDate = new Date(selectedTimeSlot.date);
    if (isPastDateTime(bookingDate, selectedTimeSlot.hour)) {
      alert('Cannot book a time slot in the past');
      return;
    }

    const date = new Date(selectedTimeSlot.date);
    const hour = selectedTimeSlot.hour;
    const minute = 0; // Start at the top of the hour

    // Check if bay is available for this duration
    if (!isBayTimeSlotAvailable(date, hour, minute, duration, bayNumber)) {
      alert(`Bay ${bayNumber} is not available for this time and duration`);
      return;
    }

    // Check if user already has a reservation that overlaps
    if (hasUserBayReservation(date, hour)) {
      alert('You already have a bay reservation that overlaps with this time');
      return;
    }

    setReservations([
      ...reservations,
      {
        type: 'bay',
        date: selectedTimeSlot.date,
        startHour: hour,
        startMinute: minute,
        duration,
        bayNumber,
        userId: currentUserId,
      },
    ]);
    // Update user credits
    if (currentUser) {
      setCurrentUser({ ...currentUser, credits: currentUser.credits - 1 });
    }
    setShowBayBookingModal(false);
    setSelectedTimeSlot(null);
    alert(`Successfully booked Bay ${bayNumber} for ${duration} minutes!`);
  };

  // Check if a private court time slot is available
  const isPrivateCourtTimeSlotAvailable = (date: Date, hour: number): boolean => {
    // Check if date/time is in the past
    if (isPastDateTime(date, hour)) {
      return false;
    }

    // Check if booking would extend past closing time (8 PM = hour 20)
    // Latest booking time is 6 PM (6 PM - 8 PM = 2 hours)
    if (hour + COURT_BOOKING_DURATION_HOURS > 20) {
      return false;
    }

    // Must be a valid 2-hour interval (even hours)
    if (hour % 2 !== 0 || hour > 18) {
      return false;
    }

    const dateStr = formatDate(date);
    
    // Check conflicts with regular court reservations
    const courtReservations = reservations.filter(
      (r) => r.type === 'court' && r.date === dateStr
    ) as CourtReservation[];

    for (const reservation of courtReservations) {
      if (hour >= reservation.hour && hour < reservation.hour + COURT_BOOKING_DURATION_HOURS) {
        return false;
      }
      if (hour < reservation.hour + COURT_BOOKING_DURATION_HOURS && hour + COURT_BOOKING_DURATION_HOURS > reservation.hour) {
        return false;
      }
    }

    // Check conflicts with other private court reservations
    const privateCourtReservations = reservations.filter(
      (r) => r.type === 'private-court' && r.date === dateStr
    ) as PrivateCourtReservation[];

    for (const reservation of privateCourtReservations) {
      if (hour >= reservation.hour && hour < reservation.hour + COURT_BOOKING_DURATION_HOURS) {
        return false;
      }
      if (hour < reservation.hour + COURT_BOOKING_DURATION_HOURS && hour + COURT_BOOKING_DURATION_HOURS > reservation.hour) {
        return false;
      }
    }

    return true;
  };

  // Admin: Create calendar block
  const handleCreateBlock = (date: string, startHour: number, endHour: number, reason: string) => {
    const newBlock: CalendarBlock = {
      id: 'block-' + Date.now(),
      date,
      startHour,
      endHour,
      reason,
      type: 'block',
    };
    setCalendarBlocks([...calendarBlocks, newBlock]);
    setShowBlockModal(false);
    alert('Calendar block created successfully!');
  };

  // Admin: Create group training event
  const handleCreateGroupEvent = (
    date: string,
    hour: number,
    duration: number,
    title: string,
    description: string,
    maxParticipants: number,
    creditsRequired: number
  ) => {
    const eventDate = new Date(date);
    if (isPastDateTime(eventDate, hour)) {
      alert('Cannot create an event for a time in the past');
      return;
    }

    const newEvent: GroupTrainingEvent = {
      id: 'event-' + Date.now(),
      date,
      hour,
      duration,
      title,
      description,
      maxParticipants,
      creditsRequired,
      participants: [],
      type: 'group-training',
    };
    setGroupTrainingEvents([...groupTrainingEvents, newEvent]);
    setShowGroupEventModal(false);
    alert('Group training event created successfully!');
  };

  // Member: Join group training event
  const handleJoinGroupEvent = (eventId: string) => {
    const event = groupTrainingEvents.find(e => e.id === eventId);
    if (!event || !currentUser) return;

    if (event.participants.length >= event.maxParticipants) {
      alert('This event is full');
      return;
    }

    if (currentUser.credits < event.creditsRequired) {
      alert(`Insufficient credits. This event requires ${event.creditsRequired} credits.`);
      return;
    }

    if (event.participants.includes(currentUser.id)) {
      alert('You are already registered for this event');
      return;
    }

    setGroupTrainingEvents(
      groupTrainingEvents.map(e =>
        e.id === eventId
          ? { ...e, participants: [...e.participants, currentUser.id] }
          : e
      )
    );
    setCurrentUser({ ...currentUser, credits: currentUser.credits - event.creditsRequired });
    alert(`Successfully joined ${event.title}!`);
  };

  // Handle private court booking
  const handlePrivateCourtBooking = (date: string, hour: number) => {
    if (!currentUser || currentUser.credits < 4) {
      alert('Insufficient credits. Private court booking requires 4 credits.');
      return;
    }

    const bookingDate = new Date(date);
    if (isPastDateTime(bookingDate, hour)) {
      alert('Cannot book a time slot in the past');
      return;
    }

    // Check if time slot is available
    if (!isPrivateCourtTimeSlotAvailable(bookingDate, hour)) {
      alert('This time slot is not available for private court booking');
      return;
    }

    // Check if user already has a private court booking at this time
    const dateStr = formatDate(bookingDate);
    const existingPrivateBooking = reservations.some(
      (r) => r.type === 'private-court' && r.date === dateStr && r.hour === hour && r.userId === currentUserId
    );

    if (existingPrivateBooking) {
      alert('You already have a private court booking for this time slot');
      return;
    }

    setReservations([
      ...reservations,
      {
        type: 'private-court',
        date: dateStr,
        hour,
        userId: currentUserId,
      },
    ]);
    // Update user credits
    if (currentUser) {
      setCurrentUser({ ...currentUser, credits: currentUser.credits - 4 });
    }
    setShowPrivateCourtModal(false);
    setSelectedPrivateCourtDate('');
    alert(`Successfully booked private court for 2 hours!`);
  };

  // Mock users database (in production, this would be a backend)
  const mockUsers: User[] = [
    { id: 'member-1', email: 'member@example.com', name: 'John Member', role: 'member', credits: 10 },
    { id: 'admin-1', email: 'admin@blazingpaddles.com', name: 'Admin User', role: 'admin', credits: 999 },
  ];

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple sign-in logic - in production, this would authenticate with a backend
    if (email && password) {
      const user = mockUsers.find(u => u.email === email);
      if (user && user.role === loginMode) {
        setCurrentUser(user);
        setEmail('');
        setPassword('');
        if (user.role === 'admin') {
          setShowAdminPanel(true);
        }
      } else {
        alert(`Invalid ${loginMode} credentials`);
      }
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setShowAdminPanel(false);
  };

  const isSignedIn = currentUser !== null;
  const isAdmin = currentUser?.role === 'admin';
  const userCredits = currentUser?.credits || 0;
  const currentUserId = currentUser?.id || '';

  const isToday = (date: Date): boolean => {
    const today = new Date();
  return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="min-h-screen tech-grid relative">
      {/* Golden hour gradient overlay - cinematic lighting */}
      <div className="fixed inset-0 pointer-events-none opacity-40" style={{
        background: 'radial-gradient(ellipse at top right, rgba(255, 199, 0, 0.12) 0%, transparent 50%), radial-gradient(ellipse at bottom left, rgba(224, 161, 0, 0.08) 0%, transparent 50%)'
      }}></div>
      
      <div className="relative z-10">
        {/* Header */}
        <header className="premium-card border-b border-[#FFC700]/20 px-6 py-5 flex justify-between items-center backdrop-blur-xl">
          <h1 className="text-4xl font-black tracking-tight text-[#FFC700] uppercase" style={{
            textShadow: '0 0 20px rgba(255, 199, 0, 0.4), 0 2px 10px rgba(0, 0, 0, 0.9)'
          }}>
            Blazing Paddles
          </h1>
          <div className="flex gap-3">
            <button 
              onClick={() => {
                if (isSignedIn) {
                  setShowPrivateCourtModal(true);
                } else {
                  alert('Please sign in to book a private court');
                }
              }}
              className="px-6 py-2.5 bg-[#FFC700] text-black font-black rounded-lg hover:bg-[#FFD400] transition-all shadow-lg hover:shadow-[#FFC700]/50 hover:scale-105 uppercase tracking-wide text-sm"
              style={{
                boxShadow: '0 4px 15px rgba(255, 199, 0, 0.5), 0 0 30px rgba(255, 199, 0, 0.2)'
              }}
            >
              Book Private Court
            </button>
            <button className="px-6 py-2.5 bg-transparent border-2 border-[#FFC700]/50 text-[#FFC700] font-bold rounded-lg hover:bg-[#FFC700]/10 hover:border-[#FFC700] hover:text-[#FFD400] transition-all uppercase tracking-wide text-sm">
              My Sessions
            </button>
          </div>
        </header>

        <div className="flex gap-6 p-6">
          {/* Main Calendar Section */}
          <div className="flex-1 premium-card rounded-xl p-6 backdrop-blur-xl">
            <div className="mb-6">
              <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight" style={{
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)'
              }}>
                Court / Bay Availability
              </h2>
            </div>
            
            {/* Filter System */}
            <div className="mt-4 p-5 rounded-xl border border-[#FFC700]/20" style={{
              background: 'linear-gradient(145deg, #1A1A1A 0%, #111111 100%)'
            }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* View Mode Filter */}
                <div>
                  <label className="block text-sm font-semibold text-[#FFC700] mb-2 uppercase tracking-wide">
                    View Type
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode('courts')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-all uppercase tracking-wide ${
                        viewMode === 'courts'
                          ? 'bg-[#FFC700] text-black shadow-lg shadow-[#FFC700]/50'
                          : 'bg-[#1A1A1A] text-[#FFC700] border border-[#FFC700]/30 hover:border-[#FFC700] hover:bg-[#FFC700]/10 hover:text-[#FFD400]'
                      }`}
                    >
                      Courts
                    </button>
                    <button
                      onClick={() => setViewMode('bays')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-all uppercase tracking-wide ${
                        viewMode === 'bays'
                          ? 'bg-[#FFC700] text-black shadow-lg shadow-[#FFC700]/50'
                          : 'bg-[#1A1A1A] text-[#FFC700] border border-[#FFC700]/30 hover:border-[#FFC700] hover:bg-[#FFC700]/10 hover:text-[#FFD400]'
                      }`}
                    >
                      Bays
                    </button>
                    <button
                      onClick={() => setViewMode('both')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-all uppercase tracking-wide ${
                        viewMode === 'both'
                          ? 'bg-[#FFC700] text-black shadow-lg shadow-[#FFC700]/50'
                          : 'bg-[#1A1A1A] text-[#FFC700] border border-[#FFC700]/30 hover:border-[#FFC700] hover:bg-[#FFC700]/10 hover:text-[#FFD400]'
                      }`}
                    >
                      Both
                    </button>
                  </div>
                </div>

                {/* Date Search */}
                <div>
                  <label className="block text-sm font-semibold text-[#FFC700] mb-2 uppercase tracking-wide">
                    Search by Date
                  </label>
                  <input
                    type="date"
                    value={searchDate}
                    onChange={(e) => {
                      setSearchDate(e.target.value);
                      handleDateSearch(e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-[#FFC700]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFC700] bg-[#1A1A1A] text-white"
                  />
                </div>

                {/* Court Level Filter - Only show for courts or both view */}
                {(viewMode === 'courts' || viewMode === 'both') && (
                  <div>
                    <label className="block text-sm font-semibold text-[#FFC700] mb-2 uppercase tracking-wide">
                      Filter by Level
                    </label>
                    <select
                      value={selectedCourtLevel}
                      onChange={(e) => setSelectedCourtLevel(e.target.value as 'beginner' | 'intermediate' | 'advanced' | 'challenge' | 'all')}
                      className="w-full px-3 py-2 border border-[#FFC700]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFC700] bg-[#1A1A1A] text-white"
                    >
                      <option value="all">All Levels</option>
                      {COURT_TYPES.map((level) => (
                        <option key={level} value={level}>
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Week Navigation */}
              <div className="flex items-center justify-between pt-4 border-t border-[#FFC700]/20">
                <button
                  onClick={() => navigateWeek('prev')}
                  className="px-4 py-2 bg-[#1A1A1A] text-[#FFC700] border border-[#FFC700]/30 rounded-lg hover:bg-[#FFC700]/10 hover:border-[#FFC700] hover:text-[#FFD400] transition-all font-bold uppercase tracking-wide text-sm"
                >
                  ← Previous Week
                </button>
                <div className="text-center">
                  <div className="text-sm text-[#B3B3B3] uppercase tracking-wide">Week of</div>
                  <div className="text-lg font-black text-white uppercase tracking-tight">
                    {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="text-xs text-[#9A9A9A] mt-1">
                    Week {currentWeekNumber} of {currentYear}
                  </div>
                </div>
                <button
                  onClick={() => navigateWeek('next')}
                  className="px-4 py-2 bg-[#1A1A1A] text-[#FFC700] border border-[#FFC700]/30 rounded-lg hover:bg-[#FFC700]/10 hover:border-[#FFC700] hover:text-[#FFD400] transition-all font-bold uppercase tracking-wide text-sm"
                >
                  Next Week →
                </button>
              </div>
            </div>

          {/* Calendar Grid */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-3 text-left text-sm font-bold text-[#FFC700] uppercase tracking-wide">Time</th>
                  {weekDates.map((date, idx) => (
                    <th key={idx} className="p-3 text-center border-l border-[#FFC700]/20">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-bold text-[#B3B3B3] uppercase tracking-wide">{DAYS_OF_WEEK[idx]}</span>
                        <span
                          className={`text-lg font-black mt-1 ${
                            isToday(date)
                              ? 'bg-[#FFC700] text-black rounded-full w-10 h-10 flex items-center justify-center shadow-lg shadow-[#FFC700]/50'
                              : 'text-white'
                          }`}
                        >
                          {getDateLabel(date)}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {getDisplayTimeSlots().map((slot, slotIdx) => {
                  // Check if this is a valid court booking time (2-hour intervals)
                  const isValidCourtTime = slot.hour % 2 === 0 && slot.hour <= 18;
                  const isCourtView = viewMode === 'courts';
                  const isBayView = viewMode === 'bays';
                  
                  return (
                    <tr key={slotIdx} className="border-t border-[#FFC700]/10">
                      <td 
                        className="p-3 text-sm font-bold text-[#FFC700] bg-[#1A1A1A] cursor-pointer hover:bg-[#FFC700]/10 transition-all uppercase"
                        onClick={() => {
                          // Default to first day of week when clicking time slot
                          handleTimeSlotClick(weekDates[0], slot.hour);
                        }}
                        title="Click to view available courts or bays"
                      >
                        {slot.label}
                        {viewMode === 'both' && !isValidCourtTime && (
                          <span className="block text-xs text-[#9A9A9A] mt-0.5 normal-case">(Bay only)</span>
                        )}
                      </td>
                      {weekDates.map((date, dateIdx) => {
                        // For courts view, only show data for valid 2-hour interval times
                        if (isCourtView && !isValidCourtTime) {
                          return (
                            <td key={dateIdx} className="p-1 border-l border-[#FFC700]/10 relative">
                              <div className="h-16 rounded bg-[#0B0B0B] border border-[#FFC700]/10 flex items-center justify-center">
                                <span className="text-xs text-[#9A9A9A]/30">—</span>
                              </div>
                            </td>
                          );
                        }
                        
                        const dateStr = formatDate(date);
                        
                        // Check for calendar blocks
                        const block = calendarBlocks.find(b => b.date === dateStr && slot.hour >= b.startHour && slot.hour < b.endHour);
                        
                        // Check for group training events
                        const groupEvent = groupTrainingEvents.find(e => e.date === dateStr && slot.hour === e.hour);
                        
                        const totalSignups = (isCourtView || viewMode === 'both') && isValidCourtTime
                          ? getSignupsForSelectedLevel(date, slot.hour) 
                          : 0;
                        const bayReservations = isBayView || viewMode === 'both'
                          ? getBayReservationCount(date, slot.hour)
                          : 0;
                        const hasSignups = totalSignups > 0 || bayReservations > 0;
                        const userSignedUp = (isCourtView || viewMode === 'both') && isValidCourtTime
                          ? isUserSignedUp(date, slot.hour)
                          : false;
                        const userHasBay = isBayView || viewMode === 'both'
                          ? hasUserBayReservation(date, slot.hour)
                          : false;
                        const isCourtBlocked = (isCourtView || viewMode === 'both') && isValidCourtTime
                          ? !isCourtTimeSlotAvailable(date, slot.hour) && !userSignedUp
                          : false;
                        const isUserInGroupEvent = groupEvent && currentUser && groupEvent.participants.includes(currentUser.id);
                        const isPastTime = isPastDateTime(date, slot.hour);
                        
                        return (
                          <td
                            key={dateIdx}
                            className="p-1 border-l border-[#FFC700]/10 relative"
                          >
                            <div
                              onClick={() => {
                                if (isPastTime) {
                                  alert('This time slot is in the past and cannot be booked');
                                  return;
                                }
                                if (block) {
                                  // Show block info
                                  alert(`Blocked: ${block.reason}`);
                                } else if (groupEvent) {
                                  // Show group event info or join
                                  if (isSignedIn && !isAdmin) {
                                    if (isUserInGroupEvent) {
                                      alert(`You're already registered for: ${groupEvent.title}`);
                                    } else {
                                      handleJoinGroupEvent(groupEvent.id);
                                    }
                                  } else {
                                    alert(`Group Event: ${groupEvent.title}\n${groupEvent.participants.length}/${groupEvent.maxParticipants} participants\n${groupEvent.creditsRequired} credits`);
                                  }
                                } else if (!isCourtBlocked) {
                                  handleTimeSlotClick(date, slot.hour);
                                }
                              }}
                              className={`
                                h-16 rounded transition-all text-xs
                                flex flex-col items-center justify-center
                                ${
                                  isPastTime
                                    ? 'bg-[#0B0B0B] border border-[#9A9A9A]/30 cursor-not-allowed opacity-30'
                                    : block
                                    ? 'bg-[#0B0B0B] border-2 border-[#ff4444]/50 cursor-pointer opacity-80'
                                    : groupEvent
                                    ? isUserInGroupEvent
                                    ? 'bg-[#FFC700] border-2 border-[#FFC700] hover:bg-[#FFD400] cursor-pointer text-black shadow-lg shadow-[#FFC700]/40'
                                    : 'bg-[#2E6B57] hover:bg-[#3A7F67] border border-[#2E6B57] cursor-pointer hover:border-[#3A7F67]'
                                    : isCourtBlocked
                                    ? 'bg-[#0B0B0B] border border-[#ff4444]/30 cursor-not-allowed opacity-40'
                                    : userSignedUp || userHasBay
                                    ? 'bg-[#FFC700] border-2 border-[#FFC700] hover:bg-[#FFD400] cursor-pointer text-black shadow-lg shadow-[#FFC700]/40'
                                    : hasSignups
                                    ? isBayView
                                    ? 'bg-[#1A1A1A] hover:bg-[#222222] border border-[#FFC700]/30 cursor-pointer hover:border-[#FFC700] hover:shadow-[#FFC700]/20'
                                    : 'bg-[#111111] hover:bg-[#1A1A1A] border border-[#FFC700]/30 cursor-pointer hover:border-[#FFC700] hover:shadow-[#FFC700]/20'
                                    : 'bg-[#0B0B0B] hover:bg-[#111111] border border-[#FFC700]/10 cursor-pointer hover:border-[#FFC700]/30'
                                }
                              `}
                              title={
                                isPastTime
                                  ? `${slot.label} - ${formatDate(date)} - Past (cannot be booked)`
                                  : block
                                  ? `${slot.label} - ${formatDate(date)} - Blocked: ${block.reason}`
                                  : groupEvent
                                  ? `${slot.label} - ${formatDate(date)} - Group Event: ${groupEvent.title} (${groupEvent.participants.length}/${groupEvent.maxParticipants})`
                                  : isCourtBlocked
                                  ? `${slot.label} - ${formatDate(date)} - Blocked (2-hour booking)`
                                  : `${slot.label} - ${formatDate(date)} - Click to ${isBayView ? 'book a bay' : 'view courts'}`
                              }
                            >
                              {isPastTime ? (
                                <span className="text-xs font-bold text-[#9A9A9A] text-center px-1">PAST</span>
                              ) : block ? (
                                <span className="text-xs font-bold text-[#ff4444] text-center px-1">BLOCKED</span>
                              ) : groupEvent ? (
                                <>
                                  <span className="text-xs font-black text-white uppercase tracking-wide text-center px-1">
                                    {groupEvent.title}
                                  </span>
                                  <span className="text-xs text-white/80 mt-0.5">
                                    {groupEvent.participants.length}/{groupEvent.maxParticipants} • {groupEvent.creditsRequired} credits
                                  </span>
                                  {isUserInGroupEvent && (
                                    <span className="text-xs font-black text-black mt-0.5 uppercase">You're in!</span>
                                  )}
                                </>
                              ) : isCourtBlocked ? (
                                <span className="text-xs font-bold text-[#ff4444]">Blocked</span>
                              ) : hasSignups ? (
                                <span className="text-xs font-bold text-[#FFC700]">
                                  {viewMode === 'both' 
                                    ? `${totalSignups} ${selectedCourtLevel !== 'all' ? selectedCourtLevel : 'court'}${totalSignups !== 1 ? 's' : ''}, ${bayReservations} bay${bayReservations !== 1 ? 's' : ''}`
                                    : isBayView
                                    ? `${bayReservations} bay${bayReservations !== 1 ? 's' : ''}`
                                    : selectedCourtLevel !== 'all'
                                    ? `${totalSignups} ${selectedCourtLevel}`
                                    : `${totalSignups} signed up`
                                  }
                                </span>
                              ) : null}
                              {(userSignedUp || userHasBay) && !isCourtBlocked && !block && !groupEvent && (
                                <span className="text-xs font-black text-black mt-1 uppercase tracking-wide">
                                  You're in!
                                </span>
                              )}
                              {!hasSignups && !userSignedUp && !userHasBay && !isCourtBlocked && !block && !groupEvent && (
                                <span className="text-xs text-[#9A9A9A]">Available</span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-sm text-[#B3B3B3] text-center uppercase tracking-wide">
            Click on any time slot to see available courts and sign up.
          </p>
        </div>

        {/* Right Side Panel - Sign In / Booking */}
        <div className="w-80 premium-card rounded-xl p-6 backdrop-blur-xl">
          {!isSignedIn ? (
            <div>
              <h3 className="text-2xl font-black text-[#FFC700] mb-4 uppercase tracking-tight">Sign In</h3>
              
              {/* Login Mode Toggle */}
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => setLoginMode('member')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-all uppercase tracking-wide ${
                    loginMode === 'member'
                      ? 'bg-[#FFC700] text-black shadow-lg shadow-[#FFC700]/50'
                      : 'bg-[#1A1A1A] text-[#FFC700] border border-[#FFC700]/30 hover:border-[#FFC700] hover:bg-[#FFC700]/10'
                  }`}
                >
                  Member
                </button>
                <button
                  onClick={() => setLoginMode('admin')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-all uppercase tracking-wide ${
                    loginMode === 'admin'
                      ? 'bg-[#FFC700] text-black shadow-lg shadow-[#FFC700]/50'
                      : 'bg-[#1A1A1A] text-[#FFC700] border border-[#FFC700]/30 hover:border-[#FFC700] hover:bg-[#FFC700]/10'
                  }`}
                >
                  Admin
                </button>
              </div>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#FFC700] mb-1 uppercase tracking-wide">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-[#FFC700]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFC700] bg-[#1A1A1A] text-white placeholder:text-[#9A9A9A]"
                    placeholder={loginMode === 'admin' ? 'admin@blazingpaddles.com' : 'member@example.com'}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#FFC700] mb-1 uppercase tracking-wide">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-[#FFC700]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFC700] bg-[#1A1A1A] text-white placeholder:text-[#9A9A9A]"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#FFC700] text-black font-black rounded-lg hover:bg-[#FFD400] transition-all shadow-lg shadow-[#FFC700]/50 uppercase tracking-wide"
                >
                  Sign In as {loginMode === 'admin' ? 'Admin' : 'Member'}
                </button>
              </form>
              <div className="mt-4 text-center">
                <a href="#" className="text-sm text-[#FFC700] hover:text-[#FFD400] hover:underline">
                  Don't have an account? Sign up
          </a>
        </div>
    </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-black text-[#FFC700] uppercase tracking-tight">Welcome!</h3>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-[#B3B3B3] hover:text-[#FFC700] uppercase tracking-wide font-semibold"
                >
                  Sign Out
                </button>
              </div>
              <div className="rounded-lg p-4 mb-4 border-2 border-[#FFC700]" style={{
                background: 'linear-gradient(135deg, rgba(255, 199, 0, 0.2) 0%, rgba(255, 212, 0, 0.15) 100%)'
              }}>
                <div className="text-sm text-[#FFC700]/90 mb-1 uppercase tracking-wide font-semibold">Available Credits</div>
                <div className="text-4xl font-black text-[#FFC700]">{userCredits}</div>
              </div>
              <div className="space-y-3">
                {isAdmin ? (
                  <>
                    <button
                      onClick={() => setShowAdminPanel(true)}
                      className="w-full py-3 bg-[#FFC700] text-black font-black rounded-lg hover:bg-[#FFD400] transition-all shadow-lg shadow-[#FFC700]/50 uppercase tracking-wide"
                    >
                      Admin Panel
                    </button>
                    <button
                      onClick={() => setShowBlockModal(true)}
                      className="w-full py-3 bg-transparent border-2 border-[#FFC700]/50 text-[#FFC700] font-bold rounded-lg hover:bg-[#FFC700]/10 hover:border-[#FFC700] hover:text-[#FFD400] transition-all uppercase tracking-wide"
                    >
                      Create Block
                    </button>
                    <button
                      onClick={() => setShowGroupEventModal(true)}
                      className="w-full py-3 bg-transparent border-2 border-[#FFC700]/50 text-[#FFC700] font-bold rounded-lg hover:bg-[#FFC700]/10 hover:border-[#FFC700] hover:text-[#FFD400] transition-all uppercase tracking-wide"
                    >
                      Create Group Event
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => setShowPrivateCourtModal(true)}
                      className="w-full py-3 bg-[#FFC700] text-black font-black rounded-lg hover:bg-[#FFD400] transition-all shadow-lg shadow-[#FFC700]/50 uppercase tracking-wide"
                    >
                      Book Private Court
                    </button>
                    <button 
                      onClick={() => setShowMySessionsModal(true)}
                      className="w-full py-3 bg-transparent border-2 border-[#FFC700]/50 text-[#FFC700] font-bold rounded-lg hover:bg-[#FFC700]/10 hover:border-[#FFC700] hover:text-[#FFD400] transition-all uppercase tracking-wide"
                    >
                      My Sessions
                    </button>
                    <button 
                      onClick={() => setShowPurchaseCreditsModal(true)}
                      className="w-full py-3 bg-transparent border-2 border-[#FFC700]/50 text-[#FFC700] font-bold rounded-lg hover:bg-[#FFC700]/10 hover:border-[#FFC700] hover:text-[#FFD400] transition-all uppercase tracking-wide"
                    >
                      Purchase Credits
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        </div>

      {/* Booking Modal */}
      {showBookingModal && selectedTimeSlot && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="premium-card rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-black text-[#FFC700] uppercase tracking-tight">Available Courts</h3>
              <button
                onClick={() => {
                  setShowBookingModal(false);
                  setSelectedTimeSlot(null);
                }}
                className="text-[#B3B3B3] hover:text-[#FFC700] text-2xl leading-none font-bold transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="mb-4 p-4 rounded-lg border border-[#FFC700]/20" style={{
              background: 'linear-gradient(145deg, #1A1A1A 0%, #111111 100%)'
            }}>
              <p className="text-sm text-[#B3B3B3]">
                <strong className="text-[#FFC700]">Date:</strong> {new Date(selectedTimeSlot.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <p className="text-sm text-[#B3B3B3]">
                <strong className="text-[#FFC700]">Time:</strong> {getTimeLabel(selectedTimeSlot.hour)} - {getTimeLabel(selectedTimeSlot.hour + COURT_BOOKING_DURATION_HOURS)} ({COURT_BOOKING_DURATION_HOURS} hours)
              </p>
              <p className="text-sm text-[#B3B3B3] mt-2">
                <strong className="text-[#FFC700]">Your Credits:</strong> {userCredits} | <strong className="text-[#FFC700]">Required:</strong> 1 per court
              </p>
            </div>

            {!isCourtTimeSlotAvailable(new Date(selectedTimeSlot.date), selectedTimeSlot.hour) ? (
              <div className="p-4 border border-[#ff4444]/30 rounded-lg mb-4" style={{
                background: 'linear-gradient(145deg, #0B0B0B 0%, #111111 100%)'
              }}>
                <p className="font-bold text-[#ff4444]">This time slot is not available for new bookings.</p>
                <p className="text-sm text-[#ff4444]/70 mt-1">It may be blocked by an existing 2-hour court booking.</p>
              </div>
            ) : isUserSignedUp(new Date(selectedTimeSlot.date), selectedTimeSlot.hour) ? (
              <div className="p-4 border-2 border-[#FFC700] rounded-lg mb-4" style={{
                background: 'linear-gradient(135deg, rgba(255, 199, 0, 0.2) 0%, rgba(255, 212, 0, 0.15) 100%)'
              }}>
                <p className="font-black text-[#FFC700] uppercase">You're already signed up for this time slot!</p>
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                {COURT_TYPES.map((courtType) => {
                  const signups = getSignupsForTimeSlot(
                    new Date(selectedTimeSlot.date),
                    selectedTimeSlot.hour
                  );
                  const count = signups[courtType].length;
                  const isFull = count >= MAX_PARTICIPANTS;
                  const userInThisCourt = signups[courtType].includes(currentUserId);

                  return (
                    <div
                      key={courtType}
                      className={`
                        p-4 rounded-lg border-2 transition-all
                        ${
                          isFull
                            ? 'border-[#ff4444]/30 opacity-40 cursor-not-allowed'
                            : userInThisCourt
                            ? 'border-[#FFD700] bg-[#FFD700]/10'
                            : 'border-[#FFD700]/30 hover:border-[#FFD700] hover:shadow-lg hover:shadow-[#FFD700]/20 cursor-pointer'
                        }
                      `}
                      style={{
                        background: isFull 
                          ? 'linear-gradient(145deg, #0B0B0B 0%, #111111 100%)'
                          : userInThisCourt
                          ? 'linear-gradient(135deg, rgba(255, 199, 0, 0.15) 0%, rgba(255, 212, 0, 0.1) 100%)'
                          : 'linear-gradient(145deg, #1A1A1A 0%, #111111 100%)'
                      }}
                      onClick={() => {
                        if (!isFull && !userInThisCourt && userCredits >= 1) {
                          handleBooking(courtType);
                        }
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <h4 className="font-black text-lg text-[#FFC700] capitalize mb-1 uppercase tracking-wide">
                            {courtType}
                          </h4>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-[#0B0B0B] rounded-full h-2 border border-[#FFC700]/20">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  isFull
                                    ? 'bg-[#ff4444]'
                                    : count > MAX_PARTICIPANTS * 0.75
                                    ? 'bg-[#FFB000]'
                                    : 'bg-[#FFC700]'
                                }`}
                                style={{ width: `${(count / MAX_PARTICIPANTS) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-bold text-[#FFC700] min-w-[50px] text-right">
                              {count}/{MAX_PARTICIPANTS}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          {isFull ? (
                            <span className="px-3 py-1 border border-[#ff4444]/50 text-[#ff4444] rounded-lg text-sm font-bold uppercase">
                              Full
                            </span>
                          ) : userInThisCourt ? (
                            <span className="px-3 py-1 bg-[#FFC700] text-black rounded-lg text-sm font-black uppercase">
                              You're In
                            </span>
                          ) : (
                            <button
                              disabled={userCredits < 1}
                              className="px-4 py-2 bg-[#FFC700] text-black rounded-lg text-sm font-black hover:bg-[#FFD400] transition-all disabled:bg-[#1A1A1A] disabled:text-[#9A9A9A] disabled:cursor-not-allowed uppercase"
                            >
                              Join
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => {
                setShowBookingModal(false);
                setSelectedTimeSlot(null);
              }}
              className="w-full py-2 bg-transparent border-2 border-[#FFC700]/50 text-[#FFC700] font-bold rounded-lg hover:bg-[#FFC700]/10 hover:border-[#FFC700] transition-all uppercase tracking-wide"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Bay Booking Modal */}
      {showBayBookingModal && selectedTimeSlot && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="premium-card rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-black text-[#FFC700] uppercase tracking-tight">Book a Bay</h3>
              <button
                onClick={() => {
                  setShowBayBookingModal(false);
                  setSelectedTimeSlot(null);
                  setSelectedBayDuration(null);
                }}
                className="text-[#B3B3B3] hover:text-[#FFC700] text-2xl leading-none font-bold transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="mb-4 p-4 rounded-lg border border-[#FFC700]/20" style={{
              background: 'linear-gradient(145deg, #1A1A1A 0%, #111111 100%)'
            }}>
              <p className="text-sm text-[#B3B3B3]">
                <strong className="text-[#FFC700]">Date:</strong> {new Date(selectedTimeSlot.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <p className="text-sm text-[#B3B3B3]">
                <strong className="text-[#FFC700]">Start Time:</strong> {getTimeLabel(selectedTimeSlot.hour)}
              </p>
              <p className="text-sm text-[#B3B3B3] mt-2">
                <strong className="text-[#FFC700]">Your Credits:</strong> {userCredits} | <strong className="text-[#FFC700]">Required:</strong> 1 per booking
              </p>
            </div>

            {hasUserBayReservation(new Date(selectedTimeSlot.date), selectedTimeSlot.hour) ? (
              <div className="p-4 border-2 border-[#FFC700] rounded-lg mb-4" style={{
                background: 'linear-gradient(135deg, rgba(255, 199, 0, 0.2) 0%, rgba(255, 212, 0, 0.15) 100%)'
              }}>
                <p className="font-black text-[#FFC700] uppercase">You already have a bay reservation for this time slot!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {!selectedBayDuration ? (
                  <div>
                    <label className="block text-sm font-semibold text-[#FFC700] mb-3 uppercase tracking-wide">
                      Select Duration
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {BAY_DURATIONS.map((duration) => {
                        const endHour = selectedTimeSlot.hour + Math.floor(duration / 60);
                        const endMinute = duration % 60;
                        const endTimeLabel = endMinute > 0 
                          ? `${endHour}:${endMinute.toString().padStart(2, '0')}`
                          : getTimeLabel(endHour);
                        
                        const date = new Date(selectedTimeSlot.date);
                        const availableBays = getAvailableBays(date, selectedTimeSlot.hour, 0, duration);
                        const hasAvailability = availableBays.length > 0;
                        
                        return (
                          <button
                            key={duration}
                            onClick={() => {
                              if (hasAvailability) {
                                setSelectedBayDuration(duration);
                              } else {
                                alert(`No bays available for ${duration} minutes at this time`);
                              }
                            }}
                            disabled={!hasAvailability}
                            className={`p-4 border-2 rounded-lg transition-all text-left ${
                              hasAvailability
                                ? 'border-[#FFC700]/30 bg-[#1A1A1A] hover:border-[#FFC700] hover:bg-[#FFC700]/10 cursor-pointer'
                                : 'border-[#FFC700]/10 bg-[#0B0B0B] opacity-40 cursor-not-allowed'
                            }`}
                          >
                            <div className="font-black text-lg text-[#FFC700]">{duration} min</div>
                            <div className="text-xs text-[#B3B3B3] mt-1">
                              Ends at {endTimeLabel}
                            </div>
                            {hasAvailability && (
                              <div className="text-xs text-[#FFC700] mt-1 font-bold">
                                {availableBays.length} bay{availableBays.length !== 1 ? 's' : ''} available
                              </div>
                            )}
                            {!hasAvailability && (
                              <div className="text-xs text-[#ff4444] mt-1">Unavailable</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={() => setSelectedBayDuration(null)}
                      className="mb-4 text-sm text-[#FFC700] hover:text-[#FFD400] hover:underline flex items-center gap-1 font-semibold"
                    >
                      ← Back to duration selection
                    </button>
                    <label className="block text-sm font-semibold text-[#FFC700] mb-3 uppercase tracking-wide">
                      Select Bay ({selectedBayDuration} minutes)
                    </label>
                    <div className="space-y-2">
                      {BAYS.map((bay, index) => {
                        const bayNumber = index + 1;
                        const isAvailable = isBayTimeSlotAvailable(
                          new Date(selectedTimeSlot.date),
                          selectedTimeSlot.hour,
                          0,
                          selectedBayDuration,
                          bayNumber
                        );

                        const endHour = selectedTimeSlot.hour + Math.floor(selectedBayDuration / 60);
                        const endMinute = selectedBayDuration % 60;
                        const endTimeLabel = endMinute > 0 
                          ? `${endHour}:${endMinute.toString().padStart(2, '0')}`
                          : getTimeLabel(endHour);

                        return (
                          <div
                            key={bayNumber}
                            className={`p-4 rounded-lg border-2 transition-all ${
                              isAvailable
                                ? 'border-[#FFC700]/30 bg-[#1A1A1A] hover:border-[#FFC700] hover:bg-[#FFC700]/10 cursor-pointer'
                                : 'border-[#FFC700]/10 bg-[#0B0B0B] opacity-40'
                            }`}
                            onClick={() => {
                              if (isAvailable && userCredits >= 1) {
                                handleBayBooking(selectedBayDuration, bayNumber);
                              }
                            }}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-black text-lg text-[#FFC700]">{bay}</div>
                                <div className="text-xs text-[#B3B3B3] mt-1">
                                  {timeSlots.find(s => s.hour === selectedTimeSlot.hour)?.label} - {endTimeLabel}
                                </div>
                              </div>
                              <div>
                                {isAvailable ? (
                                  <button
                                    disabled={userCredits < 1}
                                    className="px-4 py-2 bg-[#FFC700] text-black rounded-lg text-sm font-black hover:bg-[#FFD400] transition-all disabled:bg-[#1A1A1A] disabled:text-[#9A9A9A] disabled:cursor-not-allowed uppercase"
                                  >
                                    Book
                                  </button>
                                ) : (
                                  <span className="px-3 py-1 border border-[#ff4444]/50 text-[#ff4444] rounded-lg text-sm font-bold uppercase">
                                    Unavailable
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => {
                setShowBayBookingModal(false);
                setSelectedTimeSlot(null);
                setSelectedBayDuration(null);
              }}
              className="w-full mt-4 py-2 bg-transparent border-2 border-[#FFC700]/50 text-[#FFC700] font-bold rounded-lg hover:bg-[#FFC700]/10 hover:border-[#FFC700] transition-all uppercase tracking-wide"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Private Court Booking Modal */}
      {showPrivateCourtModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="premium-card rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-black text-[#FFC700] uppercase tracking-tight">Book a Private Court</h3>
              <button
                onClick={() => {
                  setShowPrivateCourtModal(false);
                  setSelectedPrivateCourtDate('');
                }}
                className="text-[#B3B3B3] hover:text-[#FFC700] text-2xl leading-none font-bold transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="mb-4 p-4 rounded-lg border border-[#FFC700]/20" style={{
              background: 'linear-gradient(145deg, #1A1A1A 0%, #111111 100%)'
            }}>
              <p className="text-sm text-[#B3B3B3]">
                <strong className="text-[#FFC700]">Private Court Booking:</strong> 2 hours | <strong className="text-[#FFC700]">Credits Required:</strong> 4
              </p>
              <p className="text-sm text-[#B3B3B3] mt-1">
                <strong className="text-[#FFC700]">Your Credits:</strong> {userCredits}
              </p>
            </div>

            {userCredits < 4 ? (
              <div className="p-4 border border-[#ff4444]/30 rounded-lg mb-4" style={{
                background: 'linear-gradient(145deg, #0B0B0B 0%, #111111 100%)'
              }}>
                <p className="font-bold text-[#ff4444] uppercase">Insufficient Credits</p>
                <p className="text-sm text-[#ff4444]/70 mt-1">You need 4 credits to book a private court. You currently have {userCredits} credits.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Date Selection */}
                <div>
                  <label className="block text-sm font-semibold text-[#FFC700] mb-2 uppercase tracking-wide">
                    Select Date
                  </label>
                  <input
                    type="date"
                    value={selectedPrivateCourtDate}
                    onChange={(e) => setSelectedPrivateCourtDate(e.target.value)}
                    min={formatDate(new Date())}
                    className="w-full px-3 py-2 border border-[#FFC700]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFC700] bg-[#1A1A1A] text-white"
                  />
                </div>

                {/* Time Selection */}
                {selectedPrivateCourtDate && (
                  <div>
                    <label className="block text-sm font-semibold text-[#FFC700] mb-3 uppercase tracking-wide">
                      Select Time (2-hour booking)
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {courtTimeSlots.map((slot) => {
                        const date = new Date(selectedPrivateCourtDate);
                        const isAvailable = isPrivateCourtTimeSlotAvailable(date, slot.hour);
                        const endHour = slot.hour + COURT_BOOKING_DURATION_HOURS;
                        const endTimeLabel = getTimeLabel(endHour);

                        return (
                          <button
                            key={slot.hour}
                            onClick={() => {
                              if (isAvailable) {
                                handlePrivateCourtBooking(selectedPrivateCourtDate, slot.hour);
                              }
                            }}
                            disabled={!isAvailable}
                            className={`
                              p-4 rounded-lg border-2 transition-all text-left
                              ${
                                isAvailable
                                  ? 'border-[#FFC700]/30 bg-[#1A1A1A] hover:border-[#FFC700] hover:bg-[#FFC700]/10 cursor-pointer'
                                  : 'border-[#FFC700]/10 bg-[#0B0B0B] opacity-40 cursor-not-allowed'
                              }
                            `}
                          >
                            <div className="font-black text-lg text-[#FFC700]">{slot.label}</div>
                            <div className="text-xs text-[#B3B3B3] mt-1">
                              {slot.label} - {endTimeLabel}
                            </div>
                            {isAvailable ? (
                              <div className="text-xs text-[#FFC700] mt-1 font-bold">Available</div>
                            ) : (
                              <div className="text-xs text-[#ff4444] mt-1">Unavailable</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!selectedPrivateCourtDate && (
                  <div className="p-4 border border-[#FFB000]/30 rounded-lg" style={{
                    background: 'linear-gradient(135deg, rgba(224, 161, 0, 0.1) 0%, rgba(255, 176, 0, 0.05) 100%)'
                  }}>
                    <p className="text-sm text-[#FFB000]">Please select a date to view available time slots.</p>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => {
                setShowPrivateCourtModal(false);
                setSelectedPrivateCourtDate('');
              }}
              className="w-full mt-4 py-2 bg-transparent border-2 border-[#FFC700]/50 text-[#FFC700] font-bold rounded-lg hover:bg-[#FFC700]/10 hover:border-[#FFC700] transition-all uppercase tracking-wide"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Admin Panel Modal */}
      {showAdminPanel && isAdmin && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="premium-card rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-black text-[#FFC700] uppercase tracking-tight">Admin Panel</h3>
              <button
                onClick={() => setShowAdminPanel(false)}
                className="text-[#B3B3B3] hover:text-[#FFC700] text-2xl leading-none font-bold transition-colors"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-lg border border-[#FFC700]/20" style={{
                background: 'linear-gradient(145deg, #1A1A1A 0%, #111111 100%)'
              }}>
                <h4 className="text-lg font-black text-[#FFC700] mb-2 uppercase">Calendar Blocks</h4>
                <p className="text-sm text-[#B3B3B3] mb-3">Total: {calendarBlocks.length}</p>
                <button
                  onClick={() => {
                    setShowBlockModal(true);
                    setShowAdminPanel(false);
                  }}
                  className="w-full py-2 bg-[#FFC700] text-black font-black rounded-lg hover:bg-[#FFD400] transition-all uppercase tracking-wide text-sm"
                >
                  Create Block
                </button>
              </div>

              <div className="p-4 rounded-lg border border-[#FFC700]/20" style={{
                background: 'linear-gradient(145deg, #1A1A1A 0%, #111111 100%)'
              }}>
                <h4 className="text-lg font-black text-[#FFC700] mb-2 uppercase">Group Events</h4>
                <p className="text-sm text-[#B3B3B3] mb-3">Total: {groupTrainingEvents.length}</p>
                <button
                  onClick={() => {
                    setShowGroupEventModal(true);
                    setShowAdminPanel(false);
                  }}
                  className="w-full py-2 bg-[#FFC700] text-black font-black rounded-lg hover:bg-[#FFD400] transition-all uppercase tracking-wide text-sm"
                >
                  Create Event
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xl font-black text-[#FFC700] uppercase tracking-tight">Recent Blocks</h4>
              {calendarBlocks.length === 0 ? (
                <p className="text-[#9A9A9A]">No blocks created yet</p>
              ) : (
                <div className="space-y-2">
                  {calendarBlocks.slice(-5).reverse().map((block) => (
                    <div key={block.id} className="p-3 rounded-lg border border-[#FFC700]/20 bg-[#1A1A1A]">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold text-[#FFC700]">{block.reason}</p>
                          <p className="text-sm text-[#B3B3B3]">
                            {new Date(block.date).toLocaleDateString()} • {getTimeLabel(block.startHour)} - {getTimeLabel(block.endHour)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <h4 className="text-xl font-black text-[#FFC700] uppercase tracking-tight mt-6">Group Training Events</h4>
              {groupTrainingEvents.length === 0 ? (
                <p className="text-[#9A9A9A]">No events created yet</p>
              ) : (
                <div className="space-y-2">
                  {groupTrainingEvents.slice(-5).reverse().map((event) => (
                    <div key={event.id} className="p-3 rounded-lg border border-[#FFC700]/20 bg-[#1A1A1A]">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-black text-[#FFC700] uppercase">{event.title}</p>
                          <p className="text-sm text-[#B3B3B3]">
                            {new Date(event.date).toLocaleDateString()} • {getTimeLabel(event.hour)} ({event.duration}h)
                          </p>
                          <p className="text-xs text-[#9A9A9A] mt-1">
                            {event.participants.length}/{event.maxParticipants} participants • {event.creditsRequired} credits
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowAdminPanel(false)}
              className="w-full mt-4 py-2 bg-transparent border-2 border-[#FFC700]/50 text-[#FFC700] font-bold rounded-lg hover:bg-[#FFC700]/10 hover:border-[#FFC700] transition-all uppercase tracking-wide"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Create Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="premium-card rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-black text-[#FFC700] uppercase tracking-tight">Create Calendar Block</h3>
              <button
                onClick={() => setShowBlockModal(false)}
                className="text-[#B3B3B3] hover:text-[#FFC700] text-2xl leading-none font-bold transition-colors"
              >
                ×
              </button>
            </div>

            <CreateBlockForm
              onSubmit={(date, startHour, endHour, reason) => {
                handleCreateBlock(date, startHour, endHour, reason);
              }}
              onCancel={() => setShowBlockModal(false)}
            />
          </div>
        </div>
      )}

      {/* Create Group Event Modal */}
      {showGroupEventModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="premium-card rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-black text-[#FFC700] uppercase tracking-tight">Create Group Training Event</h3>
              <button
                onClick={() => setShowGroupEventModal(false)}
                className="text-[#B3B3B3] hover:text-[#FFC700] text-2xl leading-none font-bold transition-colors"
              >
                ×
              </button>
            </div>

            <CreateGroupEventForm
              onSubmit={(date, hour, duration, title, description, maxParticipants, creditsRequired) => {
                handleCreateGroupEvent(date, hour, duration, title, description, maxParticipants, creditsRequired);
              }}
              onCancel={() => setShowGroupEventModal(false)}
            />
          </div>
        </div>
      )}

      {/* My Sessions Modal */}
      {showMySessionsModal && currentUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="premium-card rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-black text-[#FFC700] uppercase tracking-tight">My Sessions</h3>
              <button
                onClick={() => setShowMySessionsModal(false)}
                className="text-[#B3B3B3] hover:text-[#FFC700] text-2xl leading-none font-bold transition-colors"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Court Bookings */}
              <div>
                <h4 className="text-lg font-black text-[#FFC700] mb-3 uppercase tracking-tight">Court Bookings</h4>
                {reservations.filter(r => r.type === 'court' && r.userId === currentUser.id).length === 0 ? (
                  <p className="text-[#B3B3B3]">No court bookings</p>
                ) : (
                  <div className="space-y-2">
                    {reservations
                      .filter(r => r.type === 'court' && r.userId === currentUser.id)
                      .map((res, idx) => {
                        const courtRes = res as CourtReservation;
                        return (
                          <div key={idx} className="p-3 rounded-lg border border-[#FFC700]/20 bg-[#1A1A1A]">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-black text-[#FFC700] uppercase">{courtRes.courtType} Court</p>
                                <p className="text-sm text-[#B3B3B3]">
                                  {new Date(courtRes.date).toLocaleDateString('en-US', { 
                                    weekday: 'long', 
                                    month: 'long', 
                                    day: 'numeric',
                                    year: 'numeric'
                                  })} • {getTimeLabel(courtRes.hour)} - {getTimeLabel(courtRes.hour + 2)}
                                </p>
                              </div>
                              <span className="px-3 py-1 bg-[#FFC700] text-black rounded-lg text-sm font-black uppercase">
                                2 Hours
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Bay Bookings */}
              <div>
                <h4 className="text-lg font-black text-[#FFC700] mb-3 uppercase tracking-tight">Bay Bookings</h4>
                {reservations.filter(r => r.type === 'bay' && r.userId === currentUser.id).length === 0 ? (
                  <p className="text-[#B3B3B3]">No bay bookings</p>
                ) : (
                  <div className="space-y-2">
                    {reservations
                      .filter(r => r.type === 'bay' && r.userId === currentUser.id)
                      .map((res, idx) => {
                        const bayRes = res as BayReservation;
                        const endTime = bayRes.startHour * 60 + bayRes.startMinute + bayRes.duration;
                        const endHour = Math.floor(endTime / 60);
                        const endMinute = endTime % 60;
                        const endTimeLabel = endMinute > 0 
                          ? `${endHour}:${endMinute.toString().padStart(2, '0')}`
                          : getTimeLabel(endHour);
                        return (
                          <div key={idx} className="p-3 rounded-lg border border-[#FFC700]/20 bg-[#1A1A1A]">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-black text-[#FFC700] uppercase">Bay {bayRes.bayNumber}</p>
                                <p className="text-sm text-[#B3B3B3]">
                                  {new Date(bayRes.date).toLocaleDateString('en-US', { 
                                    weekday: 'long', 
                                    month: 'long', 
                                    day: 'numeric',
                                    year: 'numeric'
                                  })} • {getTimeLabel(bayRes.startHour)} - {endTimeLabel}
                                </p>
                              </div>
                              <span className="px-3 py-1 bg-[#FFC700] text-black rounded-lg text-sm font-black uppercase">
                                {bayRes.duration} min
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Private Court Bookings */}
              <div>
                <h4 className="text-lg font-black text-[#FFC700] mb-3 uppercase tracking-tight">Private Court Bookings</h4>
                {reservations.filter(r => r.type === 'private-court' && r.userId === currentUser.id).length === 0 ? (
                  <p className="text-[#B3B3B3]">No private court bookings</p>
                ) : (
                  <div className="space-y-2">
                    {reservations
                      .filter(r => r.type === 'private-court' && r.userId === currentUser.id)
                      .map((res, idx) => {
                        const privateRes = res as PrivateCourtReservation;
                        return (
                          <div key={idx} className="p-3 rounded-lg border border-[#FFC700]/20 bg-[#1A1A1A]">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-black text-[#FFC700] uppercase">Private Court</p>
                                <p className="text-sm text-[#B3B3B3]">
                                  {new Date(privateRes.date).toLocaleDateString('en-US', { 
                                    weekday: 'long', 
                                    month: 'long', 
                                    day: 'numeric',
                                    year: 'numeric'
                                  })} • {getTimeLabel(privateRes.hour)} - {getTimeLabel(privateRes.hour + 2)}
                                </p>
                              </div>
                              <span className="px-3 py-1 bg-[#FFC700] text-black rounded-lg text-sm font-black uppercase">
                                2 Hours
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Group Training Events */}
              <div>
                <h4 className="text-lg font-black text-[#FFC700] mb-3 uppercase tracking-tight">Group Training Events</h4>
                {groupTrainingEvents.filter(e => e.participants.includes(currentUser.id)).length === 0 ? (
                  <p className="text-[#B3B3B3]">No group training events</p>
                ) : (
                  <div className="space-y-2">
                    {groupTrainingEvents
                      .filter(e => e.participants.includes(currentUser.id))
                      .map((event) => (
                        <div key={event.id} className="p-3 rounded-lg border border-[#FFC700]/20 bg-[#1A1A1A]">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-black text-[#FFC700] uppercase">{event.title}</p>
                              <p className="text-sm text-[#B3B3B3]">
                                {new Date(event.date).toLocaleDateString('en-US', { 
                                  weekday: 'long', 
                                  month: 'long', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })} • {getTimeLabel(event.hour)} - {getTimeLabel(event.hour + event.duration)}
                              </p>
                              <p className="text-xs text-[#9A9A9A] mt-1">{event.description}</p>
                            </div>
                            <span className="px-3 py-1 bg-[#2E6B57] text-white rounded-lg text-sm font-black uppercase">
                              {event.duration}h
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 rounded-lg border-2 border-[#FFC700]" style={{
                background: 'linear-gradient(135deg, rgba(255, 199, 0, 0.2) 0%, rgba(255, 212, 0, 0.15) 100%)'
              }}>
                <p className="font-black text-[#FFC700] uppercase text-lg">
                  Total Sessions: {
                    reservations.filter(r => r.userId === currentUser.id).length +
                    groupTrainingEvents.filter(e => e.participants.includes(currentUser.id)).length
                  }
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowMySessionsModal(false)}
              className="w-full mt-4 py-2 bg-transparent border-2 border-[#FFC700]/50 text-[#FFC700] font-bold rounded-lg hover:bg-[#FFC700]/10 hover:border-[#FFC700] transition-all uppercase tracking-wide"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Purchase Credits Modal */}
      {showPurchaseCreditsModal && currentUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="premium-card rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-black text-[#FFC700] uppercase tracking-tight">Purchase Credits</h3>
              <button
                onClick={() => setShowPurchaseCreditsModal(false)}
                className="text-[#B3B3B3] hover:text-[#FFC700] text-2xl leading-none font-bold transition-colors"
              >
                ×
              </button>
            </div>

            <div className="mb-4 p-4 rounded-lg border border-[#FFC700]/20" style={{
              background: 'linear-gradient(145deg, #1A1A1A 0%, #111111 100%)'
            }}>
              <p className="text-sm text-[#B3B3B3] mb-2">
                <strong className="text-[#FFC700]">Current Credits:</strong> {currentUser.credits}
              </p>
              <p className="text-xs text-[#9A9A9A]">
                Each session costs 1 credit. Buy 4 sessions, get the 5th free!
              </p>
            </div>

            <div className="space-y-3">
              {[5, 10, 20, 50].map((credits) => {
                // Buy 4 get 5th free: For every 5 credits, pay for 4
                const sessionsToPayFor = Math.floor(credits / 5) * 4 + (credits % 5);
                const price = sessionsToPayFor * 14;
                const savings = (credits - sessionsToPayFor) * 14;
                const pricePerCredit = price / credits;

                return (
                  <div
                    key={credits}
                    className="p-4 rounded-lg border-2 border-[#FFC700]/30 hover:border-[#FFC700] transition-all cursor-pointer"
                    style={{
                      background: 'linear-gradient(145deg, #1A1A1A 0%, #111111 100%)'
                    }}
                    onClick={() => {
                      setCurrentUser({ ...currentUser, credits: currentUser.credits + credits });
                      setShowPurchaseCreditsModal(false);
                      alert(`Successfully purchased ${credits} credits for $${price.toFixed(2)}!`);
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black text-[#FFC700] uppercase">{credits} Credits</span>
                          {savings > 0 && (
                            <span className="px-2 py-1 bg-[#2E6B57] text-white rounded text-xs font-bold uppercase">
                              Save ${savings.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[#B3B3B3] mt-1">
                          {credits} sessions • ${pricePerCredit.toFixed(2)} per credit
                        </p>
                        {savings > 0 && (
                          <p className="text-xs text-[#9A9A9A] mt-1">
                            You pay for {sessionsToPayFor} sessions, get {credits - sessionsToPayFor} free!
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-[#FFC700]">${price.toFixed(2)}</p>
                        {savings > 0 && (
                          <p className="text-xs text-[#9A9A9A] line-through">
                            ${(credits * 14).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 p-3 rounded-lg border border-[#FFC700]/20 bg-[#0B0B0B]">
              <p className="text-xs text-[#9A9A9A] text-center">
                <strong className="text-[#FFC700]">Buy 4, Get 5th Free:</strong> For every 5 credits purchased, you only pay for 4 sessions ($14 each)
              </p>
            </div>

            <button
              onClick={() => setShowPurchaseCreditsModal(false)}
              className="w-full mt-4 py-2 bg-transparent border-2 border-[#FFC700]/50 text-[#FFC700] font-bold rounded-lg hover:bg-[#FFC700]/10 hover:border-[#FFC700] transition-all uppercase tracking-wide"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="premium-card border-t border-[#FFC700]/20 px-6 py-4 mt-8">
        <p className="text-center text-[#9A9A9A] uppercase tracking-wide text-sm">Blazing Paddles</p>
      </footer>
      </div>
    </div>
  );
}

// Helper function for time labels (used in form components)
const getTimeLabelForForm = (hour: number): string => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour} ${period}`;
};

// Create Block Form Component
function CreateBlockForm({ onSubmit, onCancel }: { 
  onSubmit: (date: string, startHour: number, endHour: number, reason: string) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState('');
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(10);
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (date && startHour < endHour && reason) {
      onSubmit(date, startHour, endHour, reason);
    } else {
      alert('Please fill in all fields correctly');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-[#FFC700] mb-2 uppercase tracking-wide">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className="w-full px-3 py-2 border border-[#FFC700]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFC700] bg-[#1A1A1A] text-white"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-[#FFC700] mb-2 uppercase tracking-wide">Start Hour</label>
          <select
            value={startHour}
            onChange={(e) => setStartHour(Number(e.target.value))}
            className="w-full px-3 py-2 border border-[#FFC700]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFC700] bg-[#1A1A1A] text-white"
            required
          >
            {Array.from({ length: 13 }, (_, i) => i + 8).map(hour => (
              <option key={hour} value={hour}>{getTimeLabelForForm(hour)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#FFC700] mb-2 uppercase tracking-wide">End Hour</label>
          <select
            value={endHour}
            onChange={(e) => setEndHour(Number(e.target.value))}
            className="w-full px-3 py-2 border border-[#FFC700]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFC700] bg-[#1A1A1A] text-white"
            required
          >
            {Array.from({ length: 13 }, (_, i) => i + 8).map(hour => (
              <option key={hour} value={hour}>{getTimeLabelForForm(hour)}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#FFC700] mb-2 uppercase tracking-wide">Reason</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-3 py-2 border border-[#FFC700]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFC700] bg-[#1A1A1A] text-white"
          placeholder="e.g., Maintenance, Private Event"
          required
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="flex-1 py-2 bg-[#FFC700] text-black font-black rounded-lg hover:bg-[#FFD400] transition-all uppercase tracking-wide"
        >
          Create Block
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 bg-transparent border-2 border-[#FFC700]/50 text-[#FFC700] font-bold rounded-lg hover:bg-[#FFC700]/10 hover:border-[#FFC700] transition-all uppercase tracking-wide"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// Create Group Event Form Component
function CreateGroupEventForm({ onSubmit, onCancel }: {
  onSubmit: (date: string, hour: number, duration: number, title: string, description: string, maxParticipants: number, creditsRequired: number) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState('');
  const [hour, setHour] = useState(8);
  const [duration, setDuration] = useState(2);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(12);
  const [creditsRequired, setCreditsRequired] = useState(2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (date && title && description) {
      onSubmit(date, hour, duration, title, description, maxParticipants, creditsRequired);
    } else {
      alert('Please fill in all required fields');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-[#FFC700] mb-2 uppercase tracking-wide">Event Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-[#FFC700]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFC700] bg-[#1A1A1A] text-white"
          placeholder="e.g., Advanced Skills Clinic"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#FFC700] mb-2 uppercase tracking-wide">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border border-[#FFC700]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFC700] bg-[#1A1A1A] text-white"
          rows={3}
          placeholder="Event description..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#FFC700] mb-2 uppercase tracking-wide">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className="w-full px-3 py-2 border border-[#FFC700]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFC700] bg-[#1A1A1A] text-white"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-[#FFC700] mb-2 uppercase tracking-wide">Start Time</label>
          <select
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
            className="w-full px-3 py-2 border border-[#FFC700]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFC700] bg-[#1A1A1A] text-white"
            required
          >
            {Array.from({ length: 13 }, (_, i) => i + 8).map(h => (
              <option key={h} value={h}>{getTimeLabelForForm(h)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#FFC700] mb-2 uppercase tracking-wide">Duration (hours)</label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full px-3 py-2 border border-[#FFC700]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFC700] bg-[#1A1A1A] text-white"
            required
          >
            <option value={1}>1 hour</option>
            <option value={2}>2 hours</option>
            <option value={3}>3 hours</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-[#FFC700] mb-2 uppercase tracking-wide">Max Participants</label>
          <input
            type="number"
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(Number(e.target.value))}
            min={1}
            max={50}
            className="w-full px-3 py-2 border border-[#FFC700]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFC700] bg-[#1A1A1A] text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#FFC700] mb-2 uppercase tracking-wide">Credits Required</label>
          <input
            type="number"
            value={creditsRequired}
            onChange={(e) => setCreditsRequired(Number(e.target.value))}
            min={1}
            className="w-full px-3 py-2 border border-[#FFC700]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFC700] bg-[#1A1A1A] text-white"
            required
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="flex-1 py-2 bg-[#FFC700] text-black font-black rounded-lg hover:bg-[#FFD400] transition-all uppercase tracking-wide"
        >
          Create Event
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 bg-transparent border-2 border-[#FFC700]/50 text-[#FFC700] font-bold rounded-lg hover:bg-[#FFC700]/10 hover:border-[#FFC700] transition-all uppercase tracking-wide"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

