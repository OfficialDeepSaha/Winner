import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useTheme } from './ThemeProvider';
import apiService from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  User,
  Bell,
  Brain,
  Palette,
  Shield,
  Download,
  Upload,
  Trash2,
  Save,
  Settings as SettingsIcon,
  Moon,
  Sun,
  Monitor,
  Key,
  Database,
  Zap,
} from 'lucide-react';

const SettingsSection = ({ title, description, icon: Icon, children }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {title}
      </CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
    <CardContent className="space-y-4">
      {children}
    </CardContent>
  </Card>
);

const Settings = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [settings, setSettings] = useState({
    // Profile settings - will be set by useEffect
    username: '',
    email: '',
    
    // Notification settings
    emailNotifications: true,
    pushNotifications: true,
    dailyDigest: true,
    weeklyReport: false,
    
    // AI settings
    aiSuggestions: true,
    autoAnalyzeContext: true,
    aiPrioritization: true,
    contextRetentionDays: 30,
    
    // Appearance settings
    theme: theme,
    compactMode: false,
    showAIScores: true,
    
    // Privacy settings
    dataSharing: false,
    analyticsTracking: true,
    
    // Advanced settings
    apiEndpoint: 'http://localhost:8000/api',
    debugMode: false,
  });

  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Update settings when user data changes
  useEffect(() => {
    if (user) {
      setSettings(prev => ({
        ...prev,
        username: user.username || '',
        email: user.email || ''
      }));
    }
  }, [user]);

  useEffect(() => {
    // Load settings from localStorage or API
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (err) {
        console.error('Failed to parse saved settings:', err);
      }
    }
  }, []);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Save to localStorage (in a real app, this would be an API call)
      localStorage.setItem('userSettings', JSON.stringify(settings));
      
      // Apply theme change
      if (settings.theme !== theme) {
        setTheme(settings.theme);
      }
      
      toast({
        title: 'Settings saved',
        description: 'Your preferences have been updated successfully.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      // Show initial toast
      const loadingToast = toast({
        title: 'Exporting data',
        description: 'Preparing your data for export...',
      });
      
      // Use the API endpoint to get all data
      const exportData = await apiService.exportData();
      
      // Add current settings and metadata
      exportData.settings = settings;
      exportData.exportDate = new Date().toISOString();
      exportData.version = '1.0';
      exportData.appInfo = {
        name: 'Smart Todo',
        exportedAt: new Date().toISOString(),
        userEmail: user?.email || 'unknown'
      };
      
      // Create and download the JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smart-todo-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Update toast
      toast({
        id: loadingToast.id,
        title: 'Data exported',
        description: `Successfully exported ${exportData.tasks?.length || 0} tasks, ${exportData.categories?.length || 0} categories, and all settings.`,
        variant: 'default',
      });
    } catch (err) {
      console.error('Export error:', err);
      toast({
        title: 'Export failed',
        description: err.message || 'Failed to export data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setExportLoading(false);
    }
  };

  const [importLoading, setImportLoading] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importPreview, setImportPreview] = useState(null);

  const handleImportSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Preview the file contents
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result);
        const taskCount = data.tasks?.length || 0;
        const categoryCount = data.categories?.length || 0;
        const tagCount = data.tags?.length || 0;
        
        setImportPreview({
          taskCount,
          categoryCount,
          tagCount,
          hasSettings: !!data.settings
        });
        
        setImportFile(file);
        setShowImportConfirm(true);
      } catch (err) {
        console.error('Import preview error:', err);
        toast({
          title: 'Invalid file',
          description: 'The selected file is not a valid Smart Todo backup file.',
          variant: 'destructive',
        });
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };
  
  const handleImportCancel = () => {
    setShowImportConfirm(false);
    setImportFile(null);
    setImportPreview(null);
    document.getElementById('import-file').value = '';
  };

  const handleImportData = async () => {
    if (!importFile) return;

    setImportLoading(true);
    setShowImportConfirm(false);
    
    // Show initial progress toast
    const loadingToast = toast({
      title: 'Importing data',
      description: 'Processing your data...',
    });
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target?.result);
        let successMessage = '';
        let importSuccess = false;
        
        // Import settings
        if (importedData.settings) {
          // Update local settings state
          setSettings(prev => ({ ...prev, ...importedData.settings }));
          localStorage.setItem('userSettings', JSON.stringify(importedData.settings));
          successMessage += 'Settings imported successfully. ';
          importSuccess = true;
        }
        
        // Import tasks if present
        if (importedData.tasks && Array.isArray(importedData.tasks) && importedData.tasks.length > 0) {
          try {
            // Use the API to import tasks
            const response = await apiService.importData({
              tasks: importedData.tasks,
              categories: importedData.categories || [],
              tags: importedData.tags || []
            });
            
            const importedCount = response.imported_tasks || 0;
            successMessage += `${importedCount} tasks imported. `;
            importSuccess = true;
            
            // Force refresh task list if we're on the tasks page
            if (window.location.pathname.includes('/tasks')) {
              window.dispatchEvent(new CustomEvent('refresh-tasks'));
            }
          } catch (taskErr) {
            console.error('Task import error:', taskErr);
            toast({
              id: loadingToast.id,
              title: 'Partial import',
              description: 'Settings imported successfully, but there was an error importing tasks.',
              variant: 'warning',
            });
            importSuccess = importedData.settings ? true : false;
          }
        } else if (!importedData.settings) {
          // No tasks and no settings found
          toast({
            id: loadingToast.id,
            title: 'Import failed',
            description: 'No valid data found in the import file.',
            variant: 'destructive',
          });
        } else {
          // Only settings, no tasks
          successMessage += 'No tasks were found in the import file.';
        }
        
        // Show success toast if something was imported
        if (importSuccess) {
          toast({
            id: loadingToast.id,
            title: 'Import complete',
            description: successMessage,
            variant: 'default',
          });
        }
      } catch (err) {
        console.error('Import error:', err);
        toast({
          id: loadingToast.id,
          title: 'Import failed',
          description: 'Invalid file format. Please check your file.',
          variant: 'destructive',
        });
      } finally {
        setImportLoading(false);
        setImportFile(null);
        setImportPreview(null);
        // Clear the file input
        document.getElementById('import-file').value = '';
      }
    };
    reader.readAsText(importFile);
  };

  const handleResetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings to default?')) {
      localStorage.removeItem('userSettings');
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Settings */}
        <SettingsSection
          title="Profile"
          description="Manage your account information"
          icon={User}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={settings.username}
                onChange={(e) => handleSettingChange('username', e.target.value)}
                placeholder="Enter username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={settings.email}
                onChange={(e) => handleSettingChange('email', e.target.value)}
                placeholder="Enter email"
              />
            </div>
          </div>
        </SettingsSection>

        {/* Notification Settings */}
        <SettingsSection
          title="Notifications"
          description="Configure how you receive notifications"
          icon={Bell}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive browser push notifications
                </p>
              </div>
              <Switch
                checked={settings.pushNotifications}
                onCheckedChange={(checked) => handleSettingChange('pushNotifications', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Daily Digest</Label>
                <p className="text-sm text-muted-foreground">
                  Daily summary of your tasks and progress
                </p>
              </div>
              <Switch
                checked={settings.dailyDigest}
                onCheckedChange={(checked) => handleSettingChange('dailyDigest', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Weekly Report</Label>
                <p className="text-sm text-muted-foreground">
                  Weekly productivity and analytics report
                </p>
              </div>
              <Switch
                checked={settings.weeklyReport}
                onCheckedChange={(checked) => handleSettingChange('weeklyReport', checked)}
              />
            </div>
          </div>
        </SettingsSection>

        {/* AI Settings */}
        <SettingsSection
          title="AI & Intelligence"
          description="Configure AI-powered features and behavior"
          icon={Brain}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>AI Suggestions</Label>
                <p className="text-sm text-muted-foreground">
                  Get AI-powered task suggestions and improvements
                </p>
              </div>
              <Switch
                checked={settings.aiSuggestions}
                onCheckedChange={(checked) => handleSettingChange('aiSuggestions', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Analyze Context</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically analyze new context entries
                </p>
              </div>
              <Switch
                checked={settings.autoAnalyzeContext}
                onCheckedChange={(checked) => handleSettingChange('autoAnalyzeContext', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>AI Prioritization</Label>
                <p className="text-sm text-muted-foreground">
                  Let AI help prioritize your tasks automatically
                </p>
              </div>
              <Switch
                checked={settings.aiPrioritization}
                onCheckedChange={(checked) => handleSettingChange('aiPrioritization', checked)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contextRetention">Context Retention (days)</Label>
              <Select
                value={settings.contextRetentionDays.toString()}
                onValueChange={(value) => handleSettingChange('contextRetentionDays', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                How long to keep context entries for AI analysis
              </p>
            </div>
          </div>
        </SettingsSection>

        {/* Appearance Settings */}
        <SettingsSection
          title="Appearance"
          description="Customize the look and feel of the application"
          icon={Palette}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <Select
                value={settings.theme}
                onValueChange={(value) => handleSettingChange('theme', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Light
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      Dark
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      System
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Compact Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Use a more compact layout to fit more content
                </p>
              </div>
              <Switch
                checked={settings.compactMode}
                onCheckedChange={(checked) => handleSettingChange('compactMode', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show AI Scores</Label>
                <p className="text-sm text-muted-foreground">
                  Display AI priority scores on tasks
                </p>
              </div>
              <Switch
                checked={settings.showAIScores}
                onCheckedChange={(checked) => handleSettingChange('showAIScores', checked)}
              />
            </div>
          </div>
        </SettingsSection>

        {/* Privacy Settings */}
        <SettingsSection
          title="Privacy & Security"
          description="Control your data and privacy preferences"
          icon={Shield}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Data Sharing</Label>
                <p className="text-sm text-muted-foreground">
                  Share anonymized data to improve AI models
                </p>
              </div>
              <Switch
                checked={settings.dataSharing}
                onCheckedChange={(checked) => handleSettingChange('dataSharing', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Analytics Tracking</Label>
                <p className="text-sm text-muted-foreground">
                  Allow usage analytics to improve the application
                </p>
              </div>
              <Switch
                checked={settings.analyticsTracking}
                onCheckedChange={(checked) => handleSettingChange('analyticsTracking', checked)}
              />
            </div>
            
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Your data is encrypted and stored securely. We never share personal information with third parties.
              </AlertDescription>
            </Alert>
          </div>
        </SettingsSection>

        {/* Advanced Settings */}
        <SettingsSection
          title="Advanced"
          description="Advanced configuration options"
          icon={SettingsIcon}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiEndpoint">API Endpoint</Label>
              <Input
                id="apiEndpoint"
                value={settings.apiEndpoint}
                onChange={(e) => handleSettingChange('apiEndpoint', e.target.value)}
                placeholder="http://localhost:8000/api"
              />
              <p className="text-sm text-muted-foreground">
                Backend API endpoint URL
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Debug Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Enable debug logging and developer tools
                </p>
              </div>
              <Switch
                checked={settings.debugMode}
                onCheckedChange={(checked) => handleSettingChange('debugMode', checked)}
              />
            </div>
          </div>
        </SettingsSection>

        {/* Data Management */}
        <SettingsSection
          title="Data Management"
          description="Import, export, and manage your tasks and settings"
          icon={Database}
        >
          <div className="space-y-4">
            <Alert>
              <Database className="h-4 w-4" />
              <AlertDescription>
                Export and import both your tasks and settings data. This is useful for backups, transferring data between devices, or migrating to a new account. All tasks, categories, tags, and settings will be included in the export.  
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleExportData}
                disabled={exportLoading}
              >
                {exportLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export Tasks & Settings
                  </>
                )}
              </Button>
              
              <div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportSelect}
                  className="hidden"
                  id="import-file"
                  disabled={importLoading}
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('import-file')?.click()}
                  disabled={importLoading || showImportConfirm}
                >
                  {importLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import Tasks & Settings
                    </>
                  )}
                </Button>
                
                {/* Import Confirmation Dialog */}
                {showImportConfirm && importPreview && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full">
                      <h3 className="text-lg font-semibold mb-2">Confirm Import</h3>
                      <p className="text-muted-foreground mb-4">Are you sure you want to import the following data?</p>
                      
                      <div className="space-y-2 mb-4">
                        {importPreview.taskCount > 0 && (
                          <div className="flex justify-between">
                            <span>Tasks:</span>
                            <span className="font-medium">{importPreview.taskCount}</span>
                          </div>
                        )}
                        {importPreview.categoryCount > 0 && (
                          <div className="flex justify-between">
                            <span>Categories:</span>
                            <span className="font-medium">{importPreview.categoryCount}</span>
                          </div>
                        )}
                        {importPreview.tagCount > 0 && (
                          <div className="flex justify-between">
                            <span>Tags:</span>
                            <span className="font-medium">{importPreview.tagCount}</span>
                          </div>
                        )}
                        {importPreview.hasSettings && (
                          <div className="flex justify-between">
                            <span>Settings:</span>
                            <span className="font-medium">Yes</span>
                          </div>
                        )}
                      </div>
                      
                      <Alert variant="warning" className="mb-4">
                        <AlertDescription>
                          This will add new tasks and update your settings. Existing tasks with the same title will be skipped.
                        </AlertDescription>
                      </Alert>
                      
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={handleImportCancel}>Cancel</Button>
                        <Button onClick={handleImportData}>Import</Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label className="text-destructive">Danger Zone</Label>
              <Button
                variant="destructive"
                onClick={handleResetSettings}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Reset All Settings
              </Button>
              <p className="text-sm text-muted-foreground">
                This will reset all settings to their default values. This action cannot be undone.
              </p>
            </div>
          </div>
        </SettingsSection>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;

