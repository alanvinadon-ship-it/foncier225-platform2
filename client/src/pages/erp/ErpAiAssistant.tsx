import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Bot, Send, Plus, Trash2, MessageSquare, Brain, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const AI_MODULES = [
  { value: "general", label: "Général" },
  { value: "projects", label: "Projets" },
  { value: "budget", label: "Budget" },
  { value: "finance", label: "Finance" },
  { value: "purchases", label: "Achats" },
  { value: "inventory", label: "Stock" },
  { value: "real_estate", label: "Immobilier" },
  { value: "safety", label: "Sécurité" },
  { value: "solar", label: "Solaire" },
  { value: "direction", label: "Direction" },
];

export default function ErpAiAssistant() {
  const [message, setMessage] = useState("");
  const [module, setModule] = useState("general");
  const [activeConversationId, setActiveConversationId] = useState<number | undefined>();
  const [messages, setMessages] = useState<Array<{ role: string; content: string; createdAt: number }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversationsQuery = trpc.erp.aiAssistant.conversations.list.useQuery({
    status: "active",
    page: 1,
    limit: 30,
  });

  const dashboardQuery = trpc.erp.aiAssistant.dashboard.useQuery();

  const chatMutation = trpc.erp.aiAssistant.chat.useMutation({
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.response,
        createdAt: Date.now(),
      }]);
      setActiveConversationId(data.conversationId);
      setIsLoading(false);
      conversationsQuery.refetch();
    },
    onError: (err) => {
      toast.error("Erreur IA: " + err.message);
      setIsLoading(false);
    },
  });

  const deleteConversation = trpc.erp.aiAssistant.conversations.delete.useMutation({
    onSuccess: () => {
      conversationsQuery.refetch();
      if (activeConversationId) {
        setActiveConversationId(undefined);
        setMessages([]);
      }
    },
  });

  const loadConversation = trpc.erp.aiAssistant.conversations.getById.useQuery(
    { id: activeConversationId! },
    { enabled: !!activeConversationId }
  );

  useEffect(() => {
    if (loadConversation.data) {
      setMessages(loadConversation.data.messages.map(m => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })));
      setModule(loadConversation.data.conversation.module);
    }
  }, [loadConversation.data]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim() || isLoading) return;
    setMessages(prev => [...prev, { role: "user", content: message, createdAt: Date.now() }]);
    setIsLoading(true);
    chatMutation.mutate({
      conversationId: activeConversationId,
      message: message.trim(),
      module,
    });
    setMessage("");
  };

  const handleNewConversation = () => {
    setActiveConversationId(undefined);
    setMessages([]);
  };

  return (
    <div className="flex h-[calc(100vh-80px)] gap-4 p-4">
      {/* Sidebar - Conversations */}
      <div className="w-72 flex flex-col gap-3">
        <Button onClick={handleNewConversation} className="w-full gap-2">
          <Plus className="h-4 w-4" /> Nouvelle conversation
        </Button>

        {/* Dashboard KPI */}
        <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-200">
          <CardContent className="p-3 space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Brain className="h-4 w-4 text-indigo-600" />
              <span>Statistiques IA</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Conversations</span>
                <p className="font-semibold">{dashboardQuery.data?.conversations || 0}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Recommandations</span>
                <p className="font-semibold">{dashboardQuery.data?.pendingRecommendations || 0}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Appels IA</span>
                <p className="font-semibold">{dashboardQuery.data?.totalAiCalls || 0}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Risques actifs</span>
                <p className="font-semibold text-red-600">{dashboardQuery.data?.activeRisks || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conversations list */}
        <ScrollArea className="flex-1">
          <div className="space-y-1">
            {conversationsQuery.data?.conversations.map(conv => (
              <div
                key={conv.id}
                className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-accent transition-colors ${
                  activeConversationId === conv.id ? "bg-accent" : ""
                }`}
                onClick={() => setActiveConversationId(conv.id)}
              >
                <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{conv.title || "Sans titre"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(conv.updatedAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation.mutate({ id: conv.id });
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {conversationsQuery.data?.conversations.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune conversation
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold">Assistant IA ERP</h2>
            <Badge variant="outline" className="text-xs">
              {AI_MODULES.find(m => m.value === module)?.label || "Général"}
            </Badge>
          </div>
          <Select value={module} onValueChange={setModule}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent>
              {AI_MODULES.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <Sparkles className="h-12 w-12 text-indigo-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Assistant IA ERP Foncier225</h3>
              <p className="text-muted-foreground max-w-md mb-6">
                Posez vos questions sur les projets, budgets, ventes, achats, stock, sécurité ou direction.
                L'IA analyse les données ERP en temps réel.
              </p>
              <div className="grid grid-cols-2 gap-2 max-w-lg">
                {[
                  "Quels projets sont en dépassement budgétaire ?",
                  "Résumé du dashboard Direction",
                  "Quels fournisseurs ont les meilleurs délais ?",
                  "Quels articles sont en rupture de stock ?",
                ].map((q, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    className="text-xs text-left h-auto py-2 px-3"
                    onClick={() => {
                      setMessage(q);
                    }}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-indigo-600" />
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs opacity-60 mt-1">
                      {new Date(msg.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-indigo-600 animate-spin" />
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">Analyse en cours...</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-3 border-t">
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Posez votre question à l'assistant IA..."
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              disabled={isLoading}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={!message.trim() || isLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            L'IA analyse les données ERP autorisées. Les recommandations doivent être validées par un responsable.
          </p>
        </div>
      </div>
    </div>
  );
}
