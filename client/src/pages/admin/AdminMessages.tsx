import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { MessageSquare, Send, Paperclip, ArrowLeft, Loader2, CheckCheck, UserCheck, XCircle, Filter } from "lucide-react";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: "Ouvert", color: "bg-amber-100 text-amber-700" },
  assigned: { label: "Assigné", color: "bg-blue-100 text-blue-700" },
  closed: { label: "Clôturé", color: "bg-gray-100 text-gray-600" },
};

const DOSSIER_TYPE_LABELS: Record<string, string> = {
  land_title: "Titre foncier",
  urban_acd: "ACD Urbain",
  credit: "Crédit foncier",
  general: "Général",
};

export default function AdminMessages() {
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const utils = trpc.useUtils();
  const convList = trpc.adminMessaging.list.useQuery(
    statusFilter ? { status: statusFilter as any } : undefined,
    { refetchInterval: 15000 }
  );
  const convMessages = trpc.adminMessaging.getMessages.useQuery(
    { conversationId: selectedConvId! },
    { enabled: !!selectedConvId, refetchInterval: 10000 }
  );

  const sendMutation = trpc.adminMessaging.send.useMutation({
    onSuccess: () => {
      setReplyContent("");
      utils.adminMessaging.getMessages.invalidate({ conversationId: selectedConvId! });
      utils.adminMessaging.list.invalidate();
    },
    onError: () => toast.error("Erreur lors de l'envoi"),
  });

  const assignMutation = trpc.adminMessaging.assign.useMutation({
    onSuccess: () => {
      toast.success("Conversation assignée");
      utils.adminMessaging.list.invalidate();
      utils.adminMessaging.getMessages.invalidate({ conversationId: selectedConvId! });
    },
  });

  const closeMutation = trpc.adminMessaging.close.useMutation({
    onSuccess: () => {
      toast.success("Conversation clôturée");
      utils.adminMessaging.list.invalidate();
      utils.adminMessaging.getMessages.invalidate({ conversationId: selectedConvId! });
    },
  });

  const markReadMutation = trpc.adminMessaging.markRead.useMutation();

  const handleSelectConv = (id: number) => {
    setSelectedConvId(id);
    markReadMutation.mutate({ conversationId: id });
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
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  const showChat = selectedConvId !== null;

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          {showChat && (
            <button onClick={() => setSelectedConvId(null)} className="md:hidden p-1 rounded hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <MessageSquare className="h-5 w-5 text-green-600" />
          <h1 className="text-lg font-semibold text-gray-900">Messagerie</h1>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={statusFilter || ""}
            onChange={e => setStatusFilter(e.target.value || undefined)}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-green-500"
          >
            <option value="">Tous</option>
            <option value="open">Ouverts</option>
            <option value="assigned">Assignés</option>
            <option value="closed">Clôturés</option>
          </select>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Conversation list */}
        <div className={`w-full md:w-96 border-r border-gray-200 bg-white overflow-y-auto ${showChat ? "hidden md:block" : ""}`}>
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
                      <span className="ml-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_LABELS[conv.status]?.color || ""}`}>
                      {STATUS_LABELS[conv.status]?.label}
                    </span>
                    <span className="text-xs text-gray-400">{DOSSIER_TYPE_LABELS[conv.dossierType || "general"]}</span>
                    <span className="text-xs text-gray-400">{formatDate(conv.lastMessageAt)}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Citoyen : <span className="font-medium">{conv.citizenName}</span>
                    {conv.agentName && <span className="text-gray-400"> • Agent : {conv.agentName}</span>}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-4">
              <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Aucune conversation</p>
            </div>
          )}
        </div>

        {/* Chat */}
        <div className={`flex-1 flex flex-col bg-gray-50 ${!showChat ? "hidden md:flex" : "flex"}`}>
          {selectedConvId && convMessages.data ? (
            <>
              {/* Chat header */}
              <div className="px-4 py-3 bg-white border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">{convMessages.data.conversation.subject}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Citoyen : {convMessages.data.citizen?.name || "Inconnu"}
                      {convMessages.data.citizen?.email && ` (${convMessages.data.citizen.email})`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {convMessages.data.conversation.status !== "closed" && (
                      <>
                        <button
                          onClick={() => assignMutation.mutate({ conversationId: selectedConvId })}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                          title="S'assigner"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          Assigner
                        </button>
                        <button
                          onClick={() => closeMutation.mutate({ conversationId: selectedConvId })}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100"
                          title="Clôturer"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Clôturer
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {convMessages.data.messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderRole === "agent" ? "justify-end" : msg.senderRole === "system" ? "justify-center" : "justify-start"}`}
                  >
                    {msg.senderRole === "system" ? (
                      <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1.5 rounded-full">
                        {msg.content}
                      </div>
                    ) : (
                      <div className={`max-w-[75%] ${msg.senderRole === "agent" ? "bg-green-600 text-white" : "bg-white border border-gray-200 text-gray-900"} rounded-2xl px-4 py-2.5`}>
                        <p className={`text-xs font-medium mb-1 ${msg.senderRole === "agent" ? "text-green-100" : "text-green-700"}`}>
                          {msg.senderName || (msg.senderRole === "agent" ? "Agent" : "Citoyen")}
                        </p>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        {msg.attachmentUrl && (
                          <a
                            href={msg.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-1 text-xs mt-2 underline ${msg.senderRole === "agent" ? "text-green-100" : "text-blue-600"}`}
                          >
                            <Paperclip className="h-3 w-3" />
                            {msg.attachmentName || "Pièce jointe"}
                          </a>
                        )}
                        <div className={`flex items-center gap-1 mt-1 ${msg.senderRole === "agent" ? "justify-end" : ""}`}>
                          <span className={`text-xs ${msg.senderRole === "agent" ? "text-green-200" : "text-gray-400"}`}>
                            {formatDate(msg.createdAt)}
                          </span>
                          {msg.senderRole === "agent" && msg.readAt && (
                            <CheckCheck className="h-3 w-3 text-green-200" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Reply input */}
              {convMessages.data.conversation.status !== "closed" && (
                <div className="px-4 py-3 bg-white border-t border-gray-200">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={replyContent}
                      onChange={e => setReplyContent(e.target.value)}
                      placeholder="Répondre au citoyen..."
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
