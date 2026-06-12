import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { MessageSquare, Plus, Send, Paperclip, ArrowLeft, Loader2, Clock, CheckCheck } from "lucide-react";
import { toast } from "sonner";

const DOSSIER_TYPE_LABELS: Record<string, string> = {
  land_title: "Titre foncier",
  urban_acd: "ACD Urbain",
  credit: "Crédit foncier",
  general: "Général",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: "Ouvert", color: "bg-amber-100 text-amber-700" },
  assigned: { label: "En traitement", color: "bg-blue-100 text-blue-700" },
  closed: { label: "Clôturé", color: "bg-gray-100 text-gray-600" },
};

export default function CitizenMessages() {
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newDossierType, setNewDossierType] = useState<string>("general");
  const [replyContent, setReplyContent] = useState("");

  const utils = trpc.useUtils();
  const convList = trpc.messaging.list.useQuery();
  const convMessages = trpc.messaging.getMessages.useQuery(
    { conversationId: selectedConvId! },
    { enabled: !!selectedConvId, refetchInterval: 10000 }
  );

  const createMutation = trpc.messaging.create.useMutation({
    onSuccess: (data) => {
      toast.success("Conversation créée");
      setShowNewForm(false);
      setNewSubject("");
      setNewContent("");
      setSelectedConvId(data.conversationId);
      utils.messaging.list.invalidate();
    },
    onError: () => toast.error("Erreur lors de la création"),
  });

  const sendMutation = trpc.messaging.send.useMutation({
    onSuccess: () => {
      setReplyContent("");
      utils.messaging.getMessages.invalidate({ conversationId: selectedConvId! });
      utils.messaging.list.invalidate();
    },
    onError: () => toast.error("Erreur lors de l'envoi"),
  });

  const markReadMutation = trpc.messaging.markRead.useMutation();

  const handleSelectConv = (id: number) => {
    setSelectedConvId(id);
    setShowNewForm(false);
    markReadMutation.mutate({ conversationId: id });
  };

  const handleCreate = () => {
    if (!newSubject.trim() || !newContent.trim()) return;
    createMutation.mutate({
      subject: newSubject,
      content: newContent,
      dossierType: newDossierType as any,
    });
  };

  const handleSend = () => {
    if (!replyContent.trim() || !selectedConvId) return;
    sendMutation.mutate({
      conversationId: selectedConvId,
      content: replyContent,
    });
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  };

  // Mobile: show list or chat
  const showChat = selectedConvId !== null || showNewForm;

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          {showChat && (
            <button onClick={() => { setSelectedConvId(null); setShowNewForm(false); }} className="md:hidden p-1 rounded hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <MessageSquare className="h-5 w-5 text-green-600" />
          <h1 className="text-lg font-semibold text-gray-900">Messages</h1>
        </div>
        <button
          onClick={() => { setShowNewForm(true); setSelectedConvId(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nouveau
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Conversation list */}
        <div className={`w-full md:w-80 border-r border-gray-200 bg-white overflow-y-auto ${showChat ? "hidden md:block" : ""}`}>
          {convList.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-green-600" />
            </div>
          ) : convList.data && convList.data.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {convList.data.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConv(conv.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                    selectedConvId === conv.id ? "bg-green-50 border-l-2 border-green-600" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 truncate flex-1">{conv.subject}</span>
                    {conv.unreadCount > 0 && (
                      <span className="ml-2 bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_LABELS[conv.status]?.color || ""}`}>
                      {STATUS_LABELS[conv.status]?.label || conv.status}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(conv.lastMessageAt)}</span>
                  </div>
                  {conv.agentName && (
                    <p className="text-xs text-gray-500 mt-1">Agent : {conv.agentName}</p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-4">
              <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Aucune conversation</p>
              <p className="text-xs text-gray-400 mt-1">Créez une nouvelle conversation pour contacter un agent</p>
            </div>
          )}
        </div>

        {/* Chat / New form */}
        <div className={`flex-1 flex flex-col bg-gray-50 ${!showChat ? "hidden md:flex" : "flex"}`}>
          {showNewForm ? (
            /* New conversation form */
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="w-full max-w-md space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Nouvelle conversation</h2>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Sujet</label>
                  <input
                    value={newSubject}
                    onChange={e => setNewSubject(e.target.value)}
                    placeholder="Ex: Question sur mon dossier de titre foncier"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Type de dossier</label>
                  <select
                    value={newDossierType}
                    onChange={e => setNewDossierType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    {Object.entries(DOSSIER_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Message</label>
                  <textarea
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                    placeholder="Décrivez votre demande..."
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowNewForm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={createMutation.isPending || !newSubject.trim() || !newContent.trim()}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Envoyer
                  </button>
                </div>
              </div>
            </div>
          ) : selectedConvId ? (
            /* Chat view */
            <>
              {/* Chat header */}
              {convMessages.data && (
                <div className="px-4 py-3 bg-white border-b border-gray-200">
                  <h2 className="text-sm font-semibold text-gray-900">{convMessages.data.conversation.subject}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_LABELS[convMessages.data.conversation.status]?.color || ""}`}>
                      {STATUS_LABELS[convMessages.data.conversation.status]?.label}
                    </span>
                    <span className="text-xs text-gray-400">
                      {DOSSIER_TYPE_LABELS[convMessages.data.conversation.dossierType || "general"]}
                    </span>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {convMessages.isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                  </div>
                ) : convMessages.data?.messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderRole === "citizen" ? "justify-end" : msg.senderRole === "system" ? "justify-center" : "justify-start"}`}
                  >
                    {msg.senderRole === "system" ? (
                      <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1.5 rounded-full">
                        {msg.content}
                      </div>
                    ) : (
                      <div className={`max-w-[75%] ${msg.senderRole === "citizen" ? "bg-green-600 text-white" : "bg-white border border-gray-200 text-gray-900"} rounded-2xl px-4 py-2.5`}>
                        {msg.senderRole !== "citizen" && (
                          <p className="text-xs font-medium text-green-700 mb-1">{msg.senderName || "Agent"}</p>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        {msg.attachmentUrl && (
                          <a
                            href={msg.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-1 text-xs mt-2 underline ${msg.senderRole === "citizen" ? "text-green-100" : "text-blue-600"}`}
                          >
                            <Paperclip className="h-3 w-3" />
                            {msg.attachmentName || "Pièce jointe"}
                          </a>
                        )}
                        <div className={`flex items-center gap-1 mt-1 ${msg.senderRole === "citizen" ? "justify-end" : ""}`}>
                          <span className={`text-xs ${msg.senderRole === "citizen" ? "text-green-200" : "text-gray-400"}`}>
                            {formatDate(msg.createdAt)}
                          </span>
                          {msg.senderRole === "citizen" && msg.readAt && (
                            <CheckCheck className="h-3 w-3 text-green-200" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Reply input */}
              {convMessages.data?.conversation.status !== "closed" && (
                <div className="px-4 py-3 bg-white border-t border-gray-200">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={replyContent}
                      onChange={e => setReplyContent(e.target.value)}
                      placeholder="Votre message..."
                      rows={2}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={sendMutation.isPending || !replyContent.trim()}
                      className="p-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {sendMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Sélectionnez une conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
