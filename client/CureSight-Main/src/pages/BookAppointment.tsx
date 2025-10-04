import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  CalendarIcon,
  Clock,
  User,
  Stethoscope,
  MapPin,
  Video,
  Building,
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Phone,
  Mail,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE = "http://localhost:5000/api";

interface Doctor {
  _id: string;
  firstName: string;
  lastName: string;
  specialization: string;
  experience: number;
  consultationFee: number;
  hospitalAffiliation: string;
  address?: string;
  city?: string;
  state?: string;
  rating?: number;
  isVerified: boolean;
  availableSlots?: string[];
}

export default function BookAppointment() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // States
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  // Form states
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [appointmentMode, setAppointmentMode] = useState<
    "online" | "clinic" | "home-visit"
  >("clinic");
  const [appointmentType, setAppointmentType] =
    useState<string>("consultation");
  const [symptoms, setSymptoms] = useState<string>("");
  const [patientNotes, setPatientNotes] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");

  // Available time slots
  const timeSlots = [
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
    "18:00",
    "18:30",
  ];

  useEffect(() => {
    if (doctorId) {
      fetchDoctorDetails();
    }
  }, [doctorId]);

  // In your BookAppointment.tsx, replace the fetchDoctorDetails function:

  const fetchDoctorDetails = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");

      console.log(`🔍 Fetching doctor profile for ID: ${doctorId}`);

      // 🔧 FIXED: Use the correct route from appointment.js
      const response = await fetch(
        `${API_BASE}/appointments/doctor/profile/${doctorId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(`📡 Response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Doctor data received:", data);

        if (data.success && data.doctor) {
          // Map the doctor data to ensure consistency
          const mappedDoctor: Doctor = {
            _id: data.doctor._id,
            firstName: data.doctor.firstName,
            lastName: data.doctor.lastName,
            specialization: data.doctor.specialization || "General Medicine",
            experience: data.doctor.experience || 5,
            consultationFee: data.doctor.consultationFee || 500,
            hospitalAffiliation: data.doctor.hospitalAffiliation || "Hospital",
            address: data.doctor.address,
            city: data.doctor.city,
            state: data.doctor.state,
            rating: data.doctor.rating || 4.5,
            isVerified: data.doctor.isVerified || false,
            availableSlots: data.doctor.availableSlots || timeSlots,
          };

          setDoctor(mappedDoctor);
          console.log(
            "✅ Doctor set successfully:",
            mappedDoctor.firstName,
            mappedDoctor.lastName
          );
        } else {
          throw new Error("Invalid response format");
        }
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Network error" }));
        throw new Error(errorData.message || "Doctor not found");
      }
    } catch (error) {
      console.error("❌ Error fetching doctor:", error);
      toast({
        title: "Error",
        description: `Failed to load doctor information: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors: string[] = [];

    if (!selectedDate) {
      errors.push("Please select an appointment date");
    }

    if (!selectedTime) {
      errors.push("Please select an appointment time");
    }

    if (!symptoms.trim()) {
      errors.push("Please describe your symptoms or reason for visit");
    }

    if (symptoms.length > 1000) {
      errors.push("Symptoms description must not exceed 1000 characters");
    }

    if (patientNotes.length > 500) {
      errors.push("Additional notes must not exceed 500 characters");
    }

    // Validate appointment date is not in the past
    if (selectedDate && selectedTime) {
      const appointmentDateTime = new Date(
        `${selectedDate.toISOString().split("T")[0]}T${selectedTime}`
      );
      if (appointmentDateTime < new Date()) {
        errors.push("Cannot book appointment in the past");
      }
    }

    return errors;
  };

  const handleBookAppointment = async () => {
    if (!doctor || !user) return;

    // Validate form
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      toast({
        title: "Validation Error",
        description: validationErrors.join(", "),
        variant: "destructive",
      });
      return;
    }

    setBooking(true);

    try {
      const token = localStorage.getItem("authToken");

      // Prepare appointment data
      const appointmentData = {
        doctorId: doctor._id,
        appointmentDate: selectedDate!.toISOString().split("T")[0], // YYYY-MM-DD format
        appointmentTime: selectedTime,
        appointmentMode,
        type: appointmentType,
        symptoms: symptoms.trim(),
        patientNotes: patientNotes.trim(),
        paymentMethod,
        clinicDetails:
          appointmentMode === "clinic"
            ? {
                address: doctor.address || "Clinic Address Not Available",
                city: doctor.city || "City Not Available",
                state: doctor.state || "State Not Available",
              }
            : undefined,
      };

      console.log("🔄 Booking appointment with data:", appointmentData);

      const response = await fetch(`${API_BASE}/appointments/book`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(appointmentData),
      });

      const data = await response.json();
      console.log("📡 Booking response:", data);

      if (response.ok && data.success) {
        toast({
          title: "Appointment Booked! ✅",
          description:
            data.message || "Your appointment has been scheduled successfully.",
        });

        // Navigate to appointments page
        navigate("/my-appointments");
      } else {
        // Handle validation errors
        if (data.error === "Validation failed" && data.details) {
          const errorMessages = data.details
            .map((error: any) => error.msg)
            .join(", ");
          throw new Error(`Validation Error: ${errorMessages}`);
        } else {
          throw new Error(data.message || data.error || "Booking failed");
        }
      }
    } catch (error: any) {
      console.error("❌ Booking failed:", error);
      console.error("❌ Error booking appointment:", error);

      toast({
        title: "Booking Failed",
        description:
          error.message || "Failed to book appointment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-16 pb-16 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading doctor information...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-16 pb-16 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Doctor Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The doctor you're looking for doesn't exist or is not available.
            </p>
            <Button onClick={() => navigate("/find-doctors")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Find Doctors
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" onClick={() => navigate("/find-doctors")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Book Appointment</h1>
          <p className="text-muted-foreground">
            Schedule a consultation with Dr. {doctor.firstName}{" "}
            {doctor.lastName}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doctor Info Sidebar */}
        <div className="space-y-6">
          {/* Doctor Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Doctor Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <User className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="font-semibold text-xl">
                  Dr. {doctor.firstName} {doctor.lastName}
                </h3>
                <p className="text-blue-600 font-medium">
                  {doctor.specialization}
                </p>
                <p className="text-sm text-muted-foreground">
                  {doctor.experience} years experience
                </p>
                {doctor.isVerified && (
                  <Badge className="mt-2">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center text-sm">
                  <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{doctor.hospitalAffiliation}</span>
                </div>

                {doctor.address && (
                  <div className="flex items-start text-sm">
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground mt-0.5" />
                    <span>
                      {doctor.address}, {doctor.city}, {doctor.state}
                    </span>
                  </div>
                )}

                <div className="flex items-center text-sm">
                  <span className="font-semibold mr-2">Consultation Fee:</span>
                  <span className="text-green-600 font-bold">
                    ₹{doctor.consultationFee}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appointment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Appointment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedDate && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Date:</span>
                  <span className="font-medium">
                    {format(selectedDate, "PPP")}
                  </span>
                </div>
              )}

              {selectedTime && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Time:</span>
                  <span className="font-medium">{selectedTime}</span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Mode:</span>
                <Badge variant="outline" className="capitalize">
                  {appointmentMode === "online" ? (
                    <>
                      <Video className="h-3 w-3 mr-1" />
                      Online
                    </>
                  ) : appointmentMode === "clinic" ? (
                    <>
                      <Building className="h-3 w-3 mr-1" />
                      Clinic Visit
                    </>
                  ) : (
                    <>
                      <MapPin className="h-3 w-3 mr-1" />
                      Home Visit
                    </>
                  )}
                </Badge>
              </div>

              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-medium">Total Fee:</span>
                <span className="text-lg font-bold text-green-600">
                  ₹{doctor.consultationFee}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Booking Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Date & Time Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Date & Time</CardTitle>
              <CardDescription>
                Choose your preferred appointment date and time
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date Picker */}
              <div className="space-y-2">
                <Label>Appointment Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate
                        ? format(selectedDate, "PPP")
                        : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) =>
                        date < new Date() || date > addDays(new Date(), 30)
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time Slots */}
              <div className="space-y-2">
                <Label>Available Time Slots *</Label>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {timeSlots.map((time) => (
                    <Button
                      key={time}
                      variant={selectedTime === time ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTime(time)}
                      className="text-sm"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {time}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appointment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Appointment Details</CardTitle>
              <CardDescription>
                Provide information about your visit
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Appointment Mode */}
              <div className="space-y-2">
                <Label>Consultation Mode *</Label>
                <Select
                  value={appointmentMode}
                  onValueChange={(value: any) => setAppointmentMode(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select consultation mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clinic">
                      <div className="flex items-center space-x-2">
                        <Building className="h-4 w-4" />
                        <span>Visit Clinic</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="online">
                      <div className="flex items-center space-x-2">
                        <Video className="h-4 w-4" />
                        <span>Online Video Call</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="home-visit">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4" />
                        <span>Home Visit</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Appointment Type */}
              <div className="space-y-2">
                <Label>Appointment Type</Label>
                <Select
                  value={appointmentType}
                  onValueChange={setAppointmentType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select appointment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultation">
                      General Consultation
                    </SelectItem>
                    <SelectItem value="follow-up">Follow-up Visit</SelectItem>
                    <SelectItem value="routine-checkup">
                      Routine Checkup
                    </SelectItem>
                    <SelectItem value="specialist-consultation">
                      Specialist Consultation
                    </SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Symptoms */}
              <div className="space-y-2">
                <Label htmlFor="symptoms">Symptoms / Reason for Visit *</Label>
                <Textarea
                  id="symptoms"
                  placeholder="Describe your symptoms, health concerns, or reason for the appointment..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  rows={4}
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground">
                  {symptoms.length}/1000 characters
                </p>
              </div>

              {/* Additional Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional information you'd like to share with the doctor..."
                  value={patientNotes}
                  onChange={(e) => setPatientNotes(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  {patientNotes.length}/500 characters
                </p>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash (Pay at clinic)</SelectItem>
                    <SelectItem value="card">Credit/Debit Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="wallet">Digital Wallet</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Book Button */}
          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={handleBookAppointment}
                disabled={
                  booking || !selectedDate || !selectedTime || !symptoms.trim()
                }
                className="w-full"
                size="lg"
              >
                {booking ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Booking Appointment...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>Book Appointment - ₹{doctor.consultationFee}</span>
                  </div>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-3">
                By booking this appointment, you agree to our terms and
                conditions. You will receive a confirmation email shortly.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
