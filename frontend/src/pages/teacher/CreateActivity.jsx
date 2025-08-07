import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const CreateActivity = () => {
  const [formData, setFormData] = useState({
    worksheet_level: '',
    prompt: '',
    validationLogic: ''
  });
  const { toast } = useToast();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    console.log('Activity Data:', formData);
    
    toast({
      title: "Activity Created",
      description: "Your new activity has been saved successfully.",
    });

    // Reset form
    setFormData({
      worksheet_level: '',
      prompt: '',
      validationLogic: ''
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Create New Activity</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Activity Details</CardTitle>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            {/* Worksheet Level */}
            <div className="space-y-2">
              <Label htmlFor="worksheet_level" className="text-sm font-medium">
                Worksheet Level
              </Label>
              <Input
                id="worksheet_level"
                value={formData.worksheet_level}
                onChange={(e) => handleInputChange('worksheet_level', e.target.value)}
                placeholder="e.g., 16382 L1 C1 B2"
                required
              />
            </div>

            {/* Prompt */}
            <div className="space-y-2">
              <Label htmlFor="prompt" className="text-sm font-medium">
                Activity Prompt
              </Label>
              <Textarea
                id="prompt"
                value={formData.prompt}
                onChange={(e) => handleInputChange('prompt', e.target.value)}
                placeholder="Describe the activity instructions for students..."
                rows={6}
                required
              />
            </div>

            {/* Validation Logic (Read-only for now) */}
            <div className="space-y-2">
              <Label htmlFor="validation" className="text-sm font-medium">
                Validation Logic
              </Label>
              <Textarea
                id="validation"
                value="Auto-generated validation function will appear here"
                disabled
                rows={4}
                className="bg-muted text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">
                Validation logic will be automatically generated based on the activity type and requirements.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button type="submit" size="lg">
                Save Activity
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateActivity;