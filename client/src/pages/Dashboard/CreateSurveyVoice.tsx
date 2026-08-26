import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Trash2,
  GripVertical,
  CheckCircle2,
  Copy,
  ExternalLink,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

type Question = {
  id: string;
  text: string;
  category: "opening" | "feedback" | "clarification" | "closing";
};

const CATEGORIES = [
  { value: "opening", label: "Opening" },
  { value: "feedback", label: "Feedback" },
  { value: "clarification", label: "Clarification" },
  { value: "closing", label: "Closing" },
] as const;

export default function CreateSurveyVoice() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [voiceDurationLimitSec, setVoiceDurationLimitSec] = useState(120);
  const [textFeedbackEnabled, setTextFeedbackEnabled] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([
    { id: "q1", text: "How was your recent experience with us?", category: "opening" },
    { id: "q2", text: "What did you like the most?", category: "feedback" },
    { id: "q3", text: "Was there anything that could be improved?", category: "feedback" },
    { id: "q4", text: "How likely are you to recommend us to a friend?", category: "clarification" },
    { id: "q5", text: "Anything else you'd like to share before we wrap up?", category: "closing" },
  ]);
  const [autoPublish, setAutoPublish] = useState(true);
  const [surveyCreated, setSurveyCreated] = useState<{ id: string; slug: string; title: string; link: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const addQuestion = () => {
    const newId = `q${questions.length + 1}`;
    setQuestions([...questions, { id: newId, text: "", category: "feedback" }]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof Question, value: string) => {
    setQuestions(questions.map((q, i) => (i === index ? { ...q, [field]: value } : q)));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const validQuestions = questions.filter(q => q.text.trim());
      if (validQuestions.length === 0) {
        setError("At least one question is required");
        setSubmitting(false);
        return;
      }

      const res = await api.surveys.create({
        title,
        subtitle,
        description,
        questions: validQuestions,
        voiceDurationLimitSec,
        textFeedbackEnabled,
      });

      if (autoPublish) {
        await api.surveys.publish(res.survey.id);
      }

      const link = `/s/${res.survey.slug}`;
      setSurveyCreated({
        id: res.survey.id,
        slug: res.survey.slug,
        title: res.survey.title,
        link,
      });
      toast.success("Survey created!");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create survey");
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = () => {
    if (surveyCreated) {
      const fullUrl = `${window.location.origin}${surveyCreated.link}`;
      navigator.clipboard.writeText(fullUrl);
      toast.success("Survey link copied!");
    }
  };

  if (surveyCreated) {
    const fullUrl = `${window.location.origin}${surveyCreated.link}`;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Survey Created!</h2>
            <p className="text-sm text-muted-foreground">{surveyCreated.title}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Share Your Survey</CardTitle>
            <CardDescription>Share this link with your respondents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border bg-muted px-4 py-3">
              <code className="flex-1 text-sm font-mono break-all">{fullUrl}</code>
            </div>
            <div className="flex gap-2">
              <Button onClick={copyLink} className="gap-2">
                <Copy className="h-4 w-4" />
                Copy Link
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/s/${surveyCreated.slug}`)}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Preview
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard/surveys")}
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Survey Details</CardTitle>
            <CardDescription>Basic information about your survey</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Customer Satisfaction Survey"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input
                id="subtitle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Brief subtitle"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this survey is about..."
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="voiceDurationLimitSec">Voice Duration Limit (seconds)</Label>
                <Input
                  id="voiceDurationLimitSec"
                  type="number"
                  value={voiceDurationLimitSec}
                  onChange={(e) => setVoiceDurationLimitSec(parseInt(e.target.value) || 120)}
                  min={10}
                  max={300}
                />
              </div>
              <div className="space-y-2">
                <Label>Text Feedback Enabled</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="textFeedbackEnabled"
                    checked={textFeedbackEnabled}
                    onChange={(e) => setTextFeedbackEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="textFeedbackEnabled" className="mb-0">
                    Allow text responses in addition to voice
                  </Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Auto-publish on creation</Label>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Survey goes live immediately after creation</p>
                  <Switch id="autoPublish" checked={autoPublish} onCheckedChange={setAutoPublish} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Questions</CardTitle>
              <CardDescription>Questions the voice agent will ask (in order)</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addQuestion} className="gap-1">
              <Plus className="h-4 w-4" />
              Add Question
            </Button>
          </CardHeader>
          <CardContent>
            {questions.map((q, index) => (
              <div key={q.id} className="flex items-start gap-3 p-3 border rounded-lg bg-card">
                <GripVertical className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor={`question-${index}`} className="text-xs">Question Text *</Label>
                      <Input
                        id={`question-${index}`}
                        value={q.text}
                        onChange={(e) => updateQuestion(index, "text", e.target.value)}
                        placeholder="Enter question text"
                      />
                    </div>
                    <Select value={q.category} onValueChange={(v) => updateQuestion(index, "category", v as Question["category"])}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeQuestion(index)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {questions.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No questions yet. Click "Add Question" to start.</p>
            )}
          </CardContent>
        </Card>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/dashboard/surveys")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="gap-2">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Create Survey
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}