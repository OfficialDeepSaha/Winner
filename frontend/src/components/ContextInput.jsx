import React from 'react';
import { useState, useEffect } from 'react';
import { useContextAnalysis } from '../hooks/useAI';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from './LoadingSpinner';
import {
  MessageSquare,
  Mail,
  FileText,
  Calendar,
  Brain,
  Lightbulb,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  Plus,
  Sparkles,
} from 'lucide-react';

const sourceTypeIcons = {
  whatsapp: MessageSquare,
  email: Mail,
  notes: FileText,
  calendar: Calendar,
  other: FileText,
};

const sourceTypeLabels = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  notes: 'Notes',
  calendar: 'Calendar',
  other: 'Other',
};

const ContextItem = ({ context, analysis }) => {
  const Icon = sourceTypeIcons[context.source_type] || FileText;
  
  const getSentimentColor = (score) => {
    if (score > 0.1) return 'text-green-600 dark:text-green-400';
    if (score < -0.1) return 'text-red-600 dark:text-red-400';
    return 'text-muted-foreground';
  };

  const getSentimentLabel = (score) => {
    if (score > 0.1) return 'Positive';
    if (score < -0.1) return 'Negative';
    return 'Neutral';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <Badge variant="outline">
              {sourceTypeLabels[context.source_type]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(context.created_at).toLocaleDateString()}
            </span>
          </div>
          {context.is_processed && (
            <Badge variant="default" className="text-xs">
              <Brain className="h-3 w-3 mr-1" />
              Analyzed
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Original Content */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">Content:</p>
          <p className="text-sm bg-muted p-3 rounded-lg">
            {context.content.length > 200 
              ? `${context.content.substring(0, 200)}...` 
              : context.content}
          </p>
        </div>

        {/* AI Analysis Results */}
        {analysis && (
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">AI Analysis</span>
            </div>

            {/* Summary */}
            {analysis.summary && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Summary:</p>
                <p className="text-sm">{analysis.summary}</p>
              </div>
            )}

            {/* Key Topics */}
            {analysis.key_topics?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Key Topics:</p>
                <div className="flex flex-wrap gap-1">
                  {analysis.key_topics.map((topic, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Urgency Indicators */}
            {analysis.urgency_indicators?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Urgency Indicators:</p>
                <div className="flex flex-wrap gap-1">
                  {analysis.urgency_indicators.map((indicator, index) => (
                    <Badge key={index} variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {indicator}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Potential Tasks */}
            {analysis.potential_tasks?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Potential Tasks:</p>
                <div className="space-y-2">
                  {analysis.potential_tasks.slice(0, 3).map((task, index) => (
                    <div key={index} className="bg-primary/5 p-2 rounded border-l-2 border-primary">
                      <p className="text-sm font-medium">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {task.urgency}
                        </Badge>
                        {task.deadline_hint && (
                          <span className="text-xs text-muted-foreground">
                            {task.deadline_hint}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sentiment */}
            {analysis.sentiment_score !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sentiment:</span>
                <span className={getSentimentColor(analysis.sentiment_score)}>
                  {getSentimentLabel(analysis.sentiment_score)}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ContextInput = () => {
  const [formData, setFormData] = useState({
    content: '',
    source_type: 'notes',
    content_date: new Date().toISOString().split('T')[0],
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState(null);
  
  const { contexts, loading, fetchContexts, analyzeAndCreateContext } = useContextAnalysis();
  const { toast } = useToast();

  useEffect(() => {
    fetchContexts({ ordering: '-created_at', page_size: 10 });
  }, [fetchContexts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.content.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter some content to analyze.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await analyzeAndCreateContext(
        formData.content,
        formData.source_type,
        formData.content_date ? `${formData.content_date}T12:00:00Z` : null
      );
      
      setLastAnalysis(result.analysis);
      setFormData(prev => ({ ...prev, content: '' }));
      
      toast({
        title: 'Context analyzed',
        description: 'Your content has been processed and analyzed by AI.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to analyze context. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickAdd = (content, sourceType) => {
    setFormData(prev => ({
      ...prev,
      content: content,
      source_type: sourceType,
    }));
  };

  const quickExamples = [
    {
      content: "Meeting with client tomorrow at 2 PM to discuss project requirements. Need to prepare presentation slides and gather feedback from the team.",
      source_type: "email",
      label: "Email Example"
    },
    {
      content: "Reminder: Doctor appointment on Friday. Also need to pick up groceries and finish the quarterly report by end of week.",
      source_type: "notes",
      label: "Notes Example"
    },
    {
      content: "Hey, can you review the design mockups I sent? The deadline is next Tuesday and we need your feedback ASAP.",
      source_type: "whatsapp",
      label: "WhatsApp Example"
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Context Input</h1>
        <p className="text-muted-foreground">
          Add daily context like messages, emails, and notes for AI-powered task insights and recommendations.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Input Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Add Context for AI Analysis
              </CardTitle>
              <CardDescription>
                Paste messages, emails, notes, or any text content. AI will analyze it for tasks, priorities, and insights.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Source Type and Date */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="source_type">Source Type</Label>
                    <Select
                      value={formData.source_type}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, source_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            WhatsApp
                          </div>
                        </SelectItem>
                        <SelectItem value="email">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Email
                          </div>
                        </SelectItem>
                        <SelectItem value="notes">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Notes
                          </div>
                        </SelectItem>
                        <SelectItem value="calendar">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Calendar
                          </div>
                        </SelectItem>
                        <SelectItem value="other">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Other
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content_date">Content Date</Label>
                    <input
                      id="content_date"
                      type="date"
                      value={formData.content_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, content_date: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Paste your messages, emails, notes, or any text content here..."
                    rows={8}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.content.length} characters
                  </p>
                </div>

                {/* Submit Button */}
                <Button type="submit" disabled={submitting || !formData.content.trim()}>
                  {submitting && <LoadingSpinner size="sm" className="mr-2" />}
                  <Brain className="h-4 w-4 mr-2" />
                  Analyze with AI
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Quick Examples */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Examples</CardTitle>
              <CardDescription>
                Try these examples to see how AI analyzes different types of content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {quickExamples.map((example, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAdd(example.content, example.source_type)}
                    className="justify-start h-auto p-3 text-left"
                  >
                    <div className="flex items-center gap-2 w-full">
                      {React.createElement(sourceTypeIcons[example.source_type], { className: "h-4 w-4 flex-shrink-0" })}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs">{example.label}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {example.content.substring(0, 80)}...
                        </p>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Latest Analysis Result */}
          {lastAnalysis && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Sparkles className="h-4 w-4" />
                  Latest Analysis Result
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lastAnalysis.analysis?.summary && (
                    <div>
                      <p className="text-sm font-medium mb-1">Summary:</p>
                      <p className="text-sm">{lastAnalysis.analysis.summary}</p>
                    </div>
                  )}
                  
                  {lastAnalysis.analysis?.potential_tasks?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Potential Tasks Found:</p>
                      <div className="space-y-2">
                        {lastAnalysis.analysis.potential_tasks.map((task, index) => (
                          <div key={index} className="bg-background p-2 rounded border">
                            <p className="text-sm font-medium">{task.title}</p>
                            <p className="text-xs text-muted-foreground">{task.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Context Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent Context</CardTitle>
              <CardDescription>
                Your latest analyzed content
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : contexts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No context entries yet</p>
                  <p className="text-xs">Add some content to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contexts.slice(0, 3).map((context) => (
                    <div key={context.id} className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        {React.createElement(sourceTypeIcons[context.source_type], { className: "h-3 w-3" })}
                        <Badge variant="outline" className="text-xs">
                          {sourceTypeLabels[context.source_type]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(context.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {context.content.substring(0, 100)}...
                      </p>
                      {context.is_processed && (
                        <Badge variant="default" className="text-xs mt-2">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Analyzed
                        </Badge>
                      )}
                    </div>
                  ))}
                  
                  {contexts.length > 3 && (
                    <p className="text-xs text-center text-muted-foreground">
                      +{contexts.length - 3} more entries
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">💡 Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>• Include time references for better deadline suggestions</p>
              <p>• Mention urgency keywords like "ASAP", "urgent", "deadline"</p>
              <p>• Add context about people, projects, and priorities</p>
              <p>• Regular input helps AI learn your patterns</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Context History */}
      {contexts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Context History</h2>
          <div className="grid gap-4">
            {contexts.map((context) => (
              <ContextItem
                key={context.id}
                context={context}
                analysis={context.is_processed ? {
                  summary: context.processed_insights,
                  potential_tasks: context.extracted_tasks,
                  sentiment_score: context.sentiment_score,
                  urgency_indicators: context.urgency_indicators,
                  key_topics: [], // This would come from the analysis
                } : null}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContextInput;

