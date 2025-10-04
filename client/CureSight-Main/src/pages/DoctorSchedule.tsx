import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Clock, Calendar, Settings, Save,
  CheckCircle, AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const days = [
  { id: 'monday', name: 'Monday' },
  { id: 'tuesday', name: 'Tuesday' },
  { id: 'wednesday', name: 'Wednesday' },
  { id: 'thursday', name: 'Thursday' },
  { id: 'friday', name: 'Friday' },
  { id: 'saturday', name: 'Saturday' },
  { id: 'sunday', name: 'Sunday' }
];

export default function DoctorSchedule() {
  const { toast } = useToast();
  const [schedule, setSchedule] = useState({
    startTime: '09:00',
    endTime: '17:00',
    breakStart: '13:00',
    breakEnd: '14:00',
    consultationDuration: 30,
    availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  });

  const [saving, setSaving] = useState(false);

  const toggleDay = (dayId: string) => {
    setSchedule(prev => ({
      ...prev,
      availableDays: prev.availableDays.includes(dayId)
        ? prev.availableDays.filter(d => d !== dayId)
        : [...prev.availableDays, dayId]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Schedule Updated! ✅",
        description: "Your availability schedule has been saved successfully."
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update schedule. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-3">
            <Clock className="h-8 w-8 text-blue-600" />
            <span>My Schedule</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your availability and appointment schedule
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Working Hours */}
        <Card>
          <CardHeader>
            <CardTitle>Working Hours</CardTitle>
            <CardDescription>
              Set your daily working hours and consultation duration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={schedule.startTime}
                  onChange={(e) => setSchedule(prev => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={schedule.endTime}
                  onChange={(e) => setSchedule(prev => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Break Start</Label>
                <Input
                  type="time"
                  value={schedule.breakStart}
                  onChange={(e) => setSchedule(prev => ({ ...prev, breakStart: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Break End</Label>
                <Input
                  type="time"
                  value={schedule.breakEnd}
                  onChange={(e) => setSchedule(prev => ({ ...prev, breakEnd: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Consultation Duration (minutes)</Label>
              <Input
                type="number"
                value={schedule.consultationDuration}
                onChange={(e) => setSchedule(prev => ({ ...prev, consultationDuration: parseInt(e.target.value) }))}
                min={15}
                max={120}
                step={15}
              />
            </div>
          </CardContent>
        </Card>

        {/* Available Days */}
        <Card>
          <CardHeader>
            <CardTitle>Available Days</CardTitle>
            <CardDescription>
              Select the days you're available for consultations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {days.map(day => (
              <div key={day.id} className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor={day.id} className="font-medium">{day.name}</Label>
                <Switch
                  id={day.id}
                  checked={schedule.availableDays.includes(day.id)}
                  onCheckedChange={() => toggleDay(day.id)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Schedule Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule Summary</CardTitle>
          <CardDescription>
            Review your current availability settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="font-semibold">Working Hours</p>
              <p className="text-sm text-muted-foreground">
                {schedule.startTime} - {schedule.endTime}
              </p>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Calendar className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="font-semibold">Available Days</p>
              <p className="text-sm text-muted-foreground">
                {schedule.availableDays.length} days/week
              </p>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Settings className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="font-semibold">Consultation</p>
              <p className="text-sm text-muted-foreground">
                {schedule.consultationDuration} minutes
              </p>
            </div>

            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="font-semibold">Status</p>
              <p className="text-sm text-muted-foreground">
                Active Schedule
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <>
              <Clock className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Schedule
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
