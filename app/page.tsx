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

type Reservation = CourtReservation | BayReservation;

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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ date: string; hour: number } | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userCredits, setUserCredits] = useState(10);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showBayBookingModal, setShowBayBookingModal] = useState(false);
  const [selectedBayDuration, setSelectedBayDuration] = useState<30 | 60 | 90 | 120 | null>(null);
  const [viewMode, setViewMode] = useState<'courts' | 'bays' | 'both'>('courts');
  const [searchDate, setSearchDate] = useState<string>('');
  const [searchWeek, setSearchWeek] = useState<string>('');
  const [currentUserId] = useState<string>('user-' + Math.random().toString(36).substr(2, 9));

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
    const startOfWeek = new Date(selectedDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);

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
        setSelectedDate(date);
        setSearchDate(dateString);
      }
    }
  };

  // Handle week search
  const handleWeekSearch = (weekInput: string) => {
    if (weekInput) {
      const [year, week] = weekInput.split('-W').map(Number);
      if (year && week && week >= 1 && week <= 53) {
        const date = getDateFromWeek(year, week);
        setSelectedDate(date);
        setSearchWeek(weekInput);
      }
    }
  };

  // Navigate weeks
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedDate(newDate);
    setSearchDate('');
    setSearchWeek('');
  };

  const weekDates = getWeekDates();
  const currentWeekNumber = getWeekNumber(selectedDate);
  const currentYear = selectedDate.getFullYear();

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

  // Check if a court time slot is available (considering 2-hour bookings)
  const isCourtTimeSlotAvailable = (date: Date, hour: number): boolean => {
    // Check if booking would extend past closing time (8 PM = hour 20)
    // Latest booking time is 6 PM (6 PM - 8 PM = 2 hours)
    if (hour + COURT_BOOKING_DURATION_HOURS > 20) {
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
    const dateStr = formatDate(date);
    const startTime = hour * 60 + minute;
    const endTime = startTime + duration;

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
    return signups.beginner.length + signups.intermediate.length + 
           signups.advanced.length + signups.challenge.length;
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
    if (!selectedTimeSlot || userCredits < 1) {
      alert('Insufficient credits');
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
    setUserCredits(userCredits - 1);
    setShowBookingModal(false);
    setSelectedTimeSlot(null);
    alert(`Successfully signed up for ${courtType} court for 2 hours!`);
  };

  // Handle bay booking
  const handleBayBooking = (duration: 30 | 60 | 90 | 120, bayNumber: number) => {
    if (!selectedTimeSlot || userCredits < 1) {
      alert('Insufficient credits');
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
    setUserCredits(userCredits - 1);
    setShowBayBookingModal(false);
    setSelectedTimeSlot(null);
    alert(`Successfully booked Bay ${bayNumber} for ${duration} minutes!`);
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple sign-in logic - in production, this would authenticate with a backend
    if (email && password) {
      setIsSignedIn(true);
      setEmail('');
      setPassword('');
    }
  };

  const handleSignOut = () => {
    setIsSignedIn(false);
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md px-6 py-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-[#0d47a1]">Blazing Paddles</h1>
        <div className="flex gap-4">
          <button className="px-4 py-2 bg-[#ffeb3b] text-black font-semibold rounded-lg hover:bg-yellow-400 transition-colors">
            Book a Court
          </button>
          <button className="px-4 py-2 bg-[#1b5e20] text-white font-semibold rounded-lg hover:bg-green-700 transition-colors">
            My Sessions
          </button>
        </div>
      </header>

      <div className="flex gap-6 p-6">
        {/* Main Calendar Section */}
        <div className="flex-1 bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Court / Bay Availability</h2>
            
            {/* Filter System */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* View Mode Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    View Type
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode('courts')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        viewMode === 'courts'
                          ? 'bg-[#0d47a1] text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      Courts
                    </button>
                    <button
                      onClick={() => setViewMode('bays')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        viewMode === 'bays'
                          ? 'bg-[#0d47a1] text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      Bays
                    </button>
                    <button
                      onClick={() => setViewMode('both')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        viewMode === 'both'
                          ? 'bg-[#0d47a1] text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      Both
                    </button>
                  </div>
                </div>

                {/* Date Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search by Date
                  </label>
                  <input
                    type="date"
                    value={searchDate}
                    onChange={(e) => {
                      setSearchDate(e.target.value);
                      handleDateSearch(e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d47a1]"
                  />
                </div>

                {/* Week Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search by Week (YYYY-W##)
                  </label>
                  <input
                    type="text"
                    value={searchWeek}
                    onChange={(e) => {
                      setSearchWeek(e.target.value);
                      if (e.target.value.match(/^\d{4}-W\d{1,2}$/)) {
                        handleWeekSearch(e.target.value);
                      }
                    }}
                    placeholder={`${currentYear}-W${currentWeekNumber}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d47a1]"
                  />
                </div>
              </div>

              {/* Week Navigation */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <button
                  onClick={() => navigateWeek('prev')}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                >
                  ← Previous Week
                </button>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Week of</div>
                  <div className="text-lg font-bold text-gray-800">
                    {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Week {currentWeekNumber} of {currentYear}
                  </div>
                </div>
                <button
                  onClick={() => navigateWeek('next')}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                >
                  Next Week →
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-left text-sm font-semibold text-gray-700">Time</th>
                  {weekDates.map((date, idx) => (
                    <th key={idx} className="p-2 text-center border-l border-gray-300">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-semibold text-gray-600">{DAYS_OF_WEEK[idx]}</span>
                        <span
                          className={`text-lg font-bold mt-1 ${
                            isToday(date)
                              ? 'bg-[#0d47a1] text-white rounded-full w-8 h-8 flex items-center justify-center'
                              : 'text-gray-800'
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
                    <tr key={slotIdx} className="border-t border-gray-200">
                      <td 
                        className="p-3 text-sm font-medium text-gray-700 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => {
                          // Default to first day of week when clicking time slot
                          handleTimeSlotClick(weekDates[0], slot.hour);
                        }}
                        title="Click to view available courts or bays"
                      >
                        {slot.label}
                        {viewMode === 'both' && !isValidCourtTime && (
                          <span className="block text-xs text-gray-500 mt-0.5">(Bay only)</span>
                        )}
                      </td>
                      {weekDates.map((date, dateIdx) => {
                        // For courts view, only show data for valid 2-hour interval times
                        if (isCourtView && !isValidCourtTime) {
                          return (
                            <td key={dateIdx} className="p-1 border-l border-gray-200 relative">
                              <div className="h-16 rounded bg-gray-100 border border-gray-200 flex items-center justify-center">
                                <span className="text-xs text-gray-400">—</span>
                              </div>
                            </td>
                          );
                        }
                        
                        const totalSignups = (isCourtView || viewMode === 'both') && isValidCourtTime
                          ? getTotalSignups(date, slot.hour) 
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
                        
                        return (
                          <td
                            key={dateIdx}
                            className="p-1 border-l border-gray-200 relative"
                          >
                            <div
                              onClick={() => {
                                if (!isCourtBlocked) {
                                  handleTimeSlotClick(date, slot.hour);
                                }
                              }}
                              className={`
                                h-16 rounded transition-all text-xs
                                flex flex-col items-center justify-center
                                ${
                                  isCourtBlocked
                                    ? 'bg-red-100 border border-red-300 cursor-not-allowed opacity-60'
                                    : userSignedUp || userHasBay
                                    ? 'bg-[#ffeb3b] border-2 border-[#0d47a1] hover:bg-yellow-200 cursor-pointer'
                                    : hasSignups
                                    ? isBayView
                                    ? 'bg-blue-100 hover:bg-blue-200 border border-blue-300 cursor-pointer'
                                    : 'bg-green-100 hover:bg-green-200 border border-green-300 cursor-pointer'
                                    : 'bg-gray-50 hover:bg-gray-100 border border-gray-200 cursor-pointer'
                                }
                              `}
                              title={
                                isCourtBlocked
                                  ? `${slot.label} - ${formatDate(date)} - Blocked (2-hour booking)`
                                  : `${slot.label} - ${formatDate(date)} - Click to ${isBayView ? 'book a bay' : 'view courts'}`
                              }
                            >
                              {isCourtBlocked ? (
                                <span className="text-xs font-semibold text-red-700">Blocked</span>
                              ) : hasSignups ? (
                                <span className="text-xs font-semibold text-gray-700">
                                  {viewMode === 'both' 
                                    ? `${totalSignups} court${totalSignups !== 1 ? 's' : ''}, ${bayReservations} bay${bayReservations !== 1 ? 's' : ''}`
                                    : isBayView
                                    ? `${bayReservations} bay${bayReservations !== 1 ? 's' : ''}`
                                    : `${totalSignups} signed up`
                                  }
                                </span>
                              ) : null}
                              {(userSignedUp || userHasBay) && !isCourtBlocked && (
                                <span className="text-xs font-bold text-[#0d47a1] mt-1">
                                  You're in!
                                </span>
                              )}
                              {!hasSignups && !userSignedUp && !userHasBay && !isCourtBlocked && (
                                <span className="text-xs text-gray-500">Available</span>
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

          <p className="mt-6 text-sm text-gray-600 text-center">
            Click on any time slot to see available courts and sign up.
          </p>
        </div>

        {/* Right Side Panel - Sign In / Booking */}
        <div className="w-80 bg-white rounded-lg shadow-lg p-6">
          {!isSignedIn ? (
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Sign In</h3>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d47a1]"
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d47a1]"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-[#0d47a1] text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sign In
                </button>
              </form>
              <div className="mt-4 text-center">
                <a href="#" className="text-sm text-[#0d47a1] hover:underline">
                  Don't have an account? Sign up
                </a>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Welcome!</h3>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Sign Out
                </button>
              </div>
              <div className="bg-[#ffeb3b] rounded-lg p-4 mb-4">
                <div className="text-sm text-gray-700 mb-1">Available Credits</div>
                <div className="text-3xl font-bold text-gray-900">{userCredits}</div>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => setShowBookingModal(true)}
                  className="w-full py-3 bg-[#1b5e20] text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                >
                  Book a Court
                </button>
                <button className="w-full py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors">
                  My Sessions
                </button>
                <button className="w-full py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors">
                  Purchase Credits
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedTimeSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Available Courts</h3>
              <button
                onClick={() => {
                  setShowBookingModal(false);
                  setSelectedTimeSlot(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Date:</strong> {new Date(selectedTimeSlot.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Time:</strong> {getTimeLabel(selectedTimeSlot.hour)} - {getTimeLabel(selectedTimeSlot.hour + COURT_BOOKING_DURATION_HOURS)} ({COURT_BOOKING_DURATION_HOURS} hours)
              </p>
              <p className="text-sm text-gray-600 mt-2">
                <strong>Your Credits:</strong> {userCredits} | <strong>Required:</strong> 1 per court
              </p>
            </div>

            {!isCourtTimeSlotAvailable(new Date(selectedTimeSlot.date), selectedTimeSlot.hour) ? (
              <div className="p-4 bg-red-100 border border-red-300 rounded-lg mb-4">
                <p className="font-semibold text-red-800">This time slot is not available for new bookings.</p>
                <p className="text-sm text-red-700 mt-1">It may be blocked by an existing 2-hour court booking.</p>
              </div>
            ) : isUserSignedUp(new Date(selectedTimeSlot.date), selectedTimeSlot.hour) ? (
              <div className="p-4 bg-[#ffeb3b] rounded-lg mb-4">
                <p className="font-semibold text-gray-800">You're already signed up for this time slot!</p>
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
                            ? 'bg-gray-100 border-gray-300 opacity-60'
                            : userInThisCourt
                            ? 'bg-[#ffeb3b] border-[#0d47a1]'
                            : 'bg-white border-gray-300 hover:border-[#0d47a1] hover:shadow-md cursor-pointer'
                        }
                      `}
                      onClick={() => {
                        if (!isFull && !userInThisCourt && userCredits >= 1) {
                          handleBooking(courtType);
                        }
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <h4 className="font-bold text-lg text-gray-800 capitalize mb-1">
                            {courtType}
                          </h4>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  isFull
                                    ? 'bg-red-500'
                                    : count > MAX_PARTICIPANTS * 0.75
                                    ? 'bg-yellow-500'
                                    : 'bg-green-500'
                                }`}
                                style={{ width: `${(count / MAX_PARTICIPANTS) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-gray-700 min-w-[50px] text-right">
                              {count}/{MAX_PARTICIPANTS}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          {isFull ? (
                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-semibold">
                              Full
                            </span>
                          ) : userInThisCourt ? (
                            <span className="px-3 py-1 bg-[#0d47a1] text-white rounded-lg text-sm font-semibold">
                              You're In
                            </span>
                          ) : (
                            <button
                              disabled={userCredits < 1}
                              className="px-4 py-2 bg-[#1b5e20] text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
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
              className="w-full py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Bay Booking Modal */}
      {showBayBookingModal && selectedTimeSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Book a Bay</h3>
              <button
                onClick={() => {
                  setShowBayBookingModal(false);
                  setSelectedTimeSlot(null);
                  setSelectedBayDuration(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Date:</strong> {new Date(selectedTimeSlot.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Start Time:</strong> {getTimeLabel(selectedTimeSlot.hour)}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                <strong>Your Credits:</strong> {userCredits} | <strong>Required:</strong> 1 per booking
              </p>
            </div>

            {hasUserBayReservation(new Date(selectedTimeSlot.date), selectedTimeSlot.hour) ? (
              <div className="p-4 bg-[#ffeb3b] rounded-lg mb-4">
                <p className="font-semibold text-gray-800">You already have a bay reservation for this time slot!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {!selectedBayDuration ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
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
                                ? 'border-gray-300 hover:border-[#0d47a1] hover:bg-blue-50 cursor-pointer'
                                : 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                            }`}
                          >
                            <div className="font-bold text-lg text-gray-800">{duration} min</div>
                            <div className="text-xs text-gray-600 mt-1">
                              Ends at {endTimeLabel}
                            </div>
                            {hasAvailability && (
                              <div className="text-xs text-green-600 mt-1 font-semibold">
                                {availableBays.length} bay{availableBays.length !== 1 ? 's' : ''} available
                              </div>
                            )}
                            {!hasAvailability && (
                              <div className="text-xs text-red-600 mt-1">Unavailable</div>
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
                      className="mb-4 text-sm text-[#0d47a1] hover:underline flex items-center gap-1"
                    >
                      ← Back to duration selection
                    </button>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
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
                                ? 'border-gray-300 bg-white hover:border-[#0d47a1] hover:bg-blue-50 cursor-pointer'
                                : 'border-gray-200 bg-gray-100 opacity-60'
                            }`}
                            onClick={() => {
                              if (isAvailable && userCredits >= 1) {
                                handleBayBooking(selectedBayDuration, bayNumber);
                              }
                            }}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-semibold text-lg text-gray-800">{bay}</div>
                                <div className="text-xs text-gray-600 mt-1">
                                  {timeSlots.find(s => s.hour === selectedTimeSlot.hour)?.label} - {endTimeLabel}
                                </div>
                              </div>
                              <div>
                                {isAvailable ? (
                                  <button
                                    disabled={userCredits < 1}
                                    className="px-4 py-2 bg-[#1b5e20] text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                                  >
                                    Book
                                  </button>
                                ) : (
                                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-semibold">
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
              className="w-full mt-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-6 py-4 mt-8">
        <p className="text-center text-gray-600">Footer</p>
      </footer>
    </div>
  );
}
