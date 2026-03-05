/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Shield, 
  Clock, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  Settings2,
  User,
  MapPin,
  BookOpen,
  ChevronRight,
  Info,
  Plus,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Markdown from 'react-markdown';
import { getGuardianResponse, Phase, NotaryContext, GuardianResponse } from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  role: 'user' | 'assistant';
  content: string | GuardianResponse;
  timestamp: Date;
}

const US_STATES = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" }, 
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" }, 
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "FL", name: "Florida" }, 
  { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" }, 
  { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" }, 
  { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" }, 
  { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" }, { code: "MA", name: "Massachusetts" }, 
  { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" }, 
  { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" }, 
  { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" }, 
  { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" }, { code: "NC", name: "North Carolina" }, 
  { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" }, 
  { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" }, 
  { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" }, 
  { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" }, 
  { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" }, 
  { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" }
];

const APPOINTMENT_TYPES = [
  "Loan Signing", "Power of Attorney", "Affidavit", "Deed", "Will/Trust", "Medical Directive", "General Notarization"
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: {
        summary: "Welcome to Notaryos Guardian. I am here to support your compliance and accuracy.",
        action: "Please select your state and current phase to begin.",
        details: [
          "I provide phase-specific guidance",
          "I help verify state-specific rules",
          "I reduce liability through checklists"
        ],
        risk_level: "LOW",
        source: {
          title: "System Initialization",
          url: "",
          where_found: "App Startup",
          last_updated: "2025-01-01"
        },
        confidence: "High",
        disclaimer: "Verify with your official state source before acting.",
        clarifying_questions: [],
        next_ctas: []
      },
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<NotaryContext>({
    state: '',
    appointmentType: '',
    phase: 'BEFORE APPOINTMENT',
    journalStatus: 'not started'
  });
  const [showSettings, setShowSettings] = useState(true);
  const [showJournalDraft, setShowJournalDraft] = useState(false);
  const [journalDraft, setJournalDraft] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type: '',
    signerName: '',
    idType: '',
    fee: ''
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (overrideMessage?: string) => {
    const userMessage = overrideMessage || input.trim();
    if (!userMessage || isLoading) return;

    if (!overrideMessage) setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date() }]);
    setIsLoading(true);

    try {
      const response = await getGuardianResponse(userMessage, context);
      setMessages(prev => [...prev, { role: 'assistant', content: response, timestamp: new Date() }]);
    } catch (error) {
      console.error('Error getting response:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: {
          summary: "An error occurred while processing your request.",
          action: "Please try again or check your connection.",
          details: ["API communication failed", "Ensure environment variables are set"],
          risk_level: "HIGH",
          source: { title: "System Error", url: "", where_found: "Error Handler", last_updated: "" },
          confidence: "None",
          disclaimer: "Verify with your official state source before acting.",
          clarifying_questions: [],
          next_ctas: []
        }, 
        timestamp: new Date() 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateContext = (updates: Partial<NotaryContext>) => {
    setContext(prev => ({ ...prev, ...updates }));
  };

  const renderAssistantMessage = (res: GuardianResponse) => {
    return (
      <div className="space-y-4">
        <div>
          <div className="font-bold text-[10px] uppercase tracking-wider text-[#6B7280] mb-1">Summary</div>
          <p className="text-sm leading-relaxed">{res.summary}</p>
        </div>

        <div>
          <div className="font-bold text-[10px] uppercase tracking-wider text-[#6B7280] mb-1">Action</div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-emerald-900 text-sm font-medium">
            {res.action}
          </div>
        </div>

        <div>
          <div className="font-bold text-[10px] uppercase tracking-wider text-[#6B7280] mb-1">Details</div>
          <ul className="list-disc list-inside space-y-1">
            {res.details.map((d, i) => (
              <li key={i} className="text-sm text-[#4B5563]">{d}</li>
            ))}
          </ul>
        </div>

        {res.clarifying_questions.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
            <div className="font-bold text-[10px] uppercase tracking-wider text-amber-700 mb-2">Clarification Needed</div>
            <ul className="space-y-2">
              {res.clarifying_questions.map((q, i) => (
                <li key={i} className="flex items-center gap-2">
                  <ChevronRight size={14} className="text-amber-500" />
                  <button 
                    onClick={() => handleSend(q)}
                    className="text-xs text-amber-900 text-left hover:underline"
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB]">
          <div className="flex items-center gap-4">
            <div>
              <div className="font-bold text-[10px] uppercase tracking-wider text-[#6B7280] mb-1">Risk</div>
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                res.risk_level === 'LOW' && "bg-emerald-100 text-emerald-800",
                res.risk_level === 'MEDIUM' && "bg-amber-100 text-amber-800",
                res.risk_level === 'HIGH' && "bg-red-100 text-red-800"
              )}>
                {res.risk_level}
              </span>
            </div>
            <div>
              <div className="font-bold text-[10px] uppercase tracking-wider text-[#6B7280] mb-1">Source</div>
              <div className="text-[10px] text-[#4B5563] font-medium max-w-[120px] truncate" title={`${res.source.title} ${res.source.where_found ? `- ${res.source.where_found}` : ''}`}>
                {res.source.title}
                {res.source.where_found && <span className="block text-[8px] text-[#9CA3AF] truncate">{res.source.where_found}</span>}
                {res.source.last_updated && <span className="block text-[8px] text-[#9CA3AF]">Updated: {res.source.last_updated}</span>}
              </div>
            </div>
            <div>
              <div className="font-bold text-[10px] uppercase tracking-wider text-[#6B7280] mb-1">Confidence</div>
              <span className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                res.confidence?.toLowerCase() === 'high' ? "bg-emerald-50 text-emerald-700" :
                res.confidence?.toLowerCase() === 'partial' ? "bg-amber-50 text-amber-700" :
                "bg-red-50 text-red-700"
              )}>
                {res.confidence || 'N/A'}
              </span>
            </div>
          </div>
          
          {res.next_ctas.length > 0 && (
            <div className="flex gap-2">
              {res.next_ctas.map((cta, i) => (
                <button
                  key={i}
                  className="px-3 py-1.5 bg-[#1A1A1A] text-white text-[10px] font-bold uppercase rounded-md hover:bg-black transition-colors"
                >
                  {cta.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="text-[9px] text-[#9CA3AF] italic leading-tight">
          {res.disclaimer}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans overflow-hidden">
      {/* Sidebar - Context & Settings */}
      <motion.aside 
        initial={false}
        animate={{ width: showSettings ? 320 : 0, opacity: showSettings ? 1 : 0 }}
        className="bg-white border-r border-[#E5E7EB] flex-shrink-0 overflow-y-auto"
      >
        <div className="p-6 space-y-8 min-w-[320px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1A1A1A] rounded-xl flex items-center justify-center">
              <Shield className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-semibold text-lg tracking-tight">Notaryos Guardian</h1>
              <p className="text-xs text-[#6B7280] uppercase tracking-wider font-medium">Compliance Assistant</p>
            </div>
          </div>

          <div className="space-y-6">
            <section>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">
                <MapPin size={14} /> Jurisdiction
              </label>
              <select 
                value={context.state}
                onChange={(e) => updateContext({ state: e.target.value })}
                className="w-full bg-[#F3F4F6] border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1A1A1A] outline-none transition-all"
              >
                <option value="">Select State (Required)</option>
                {US_STATES.map(s => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}
              </select>
            </section>

            <section>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">
                <Clock size={14} /> Workflow Phase
              </label>
              <div className="grid grid-cols-1 gap-2">
                {(['BEFORE APPOINTMENT', 'DURING SIGNING', 'AFTER SIGNING'] as Phase[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => updateContext({ phase: p })}
                    className={cn(
                      "text-left px-3 py-2 rounded-lg text-sm transition-all border",
                      context.phase === p 
                        ? "bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-md" 
                        : "bg-white text-[#4B5563] border-[#E5E7EB] hover:border-[#9CA3AF]"
                    )}
                  >
                    {p.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">
                <FileText size={14} /> Appointment Type
              </label>
              <select 
                value={context.appointmentType}
                onChange={(e) => updateContext({ appointmentType: e.target.value })}
                className="w-full bg-[#F3F4F6] border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1A1A1A] outline-none transition-all"
              >
                <option value="">Select Type</option>
                {APPOINTMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </section>

            <section>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">
                <BookOpen size={14} /> Journal Status
              </label>
              <div className="flex gap-2">
                {(['not started', 'started', 'completed'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => updateContext({ journalStatus: s })}
                    className={cn(
                      "flex-1 text-[10px] uppercase font-bold py-2 rounded-md transition-all border",
                      context.journalStatus === s 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                        : "bg-white text-[#9CA3AF] border-[#E5E7EB]"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setJournalDraft(prev => ({
                    ...prev,
                    type: context.appointmentType || '',
                    signerName: context.clientInfo || ''
                  }));
                  setShowJournalDraft(true);
                }}
                className="w-full mt-3 py-2 bg-white border border-[#E5E7EB] text-[#1A1A1A] text-[10px] font-bold uppercase rounded-md hover:bg-[#F9FAFB] transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Draft Journal Entry
              </button>
            </section>

            <section>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">
                <User size={14} /> Client Info
              </label>
              <textarea 
                value={context.clientInfo}
                onChange={(e) => updateContext({ clientInfo: e.target.value })}
                placeholder="Name, ID details..."
                className="w-full bg-[#F3F4F6] border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1A1A1A] outline-none transition-all h-20 resize-none"
              />
            </section>

            <section className="bg-[#F9FAFB] rounded-xl p-4 border border-[#F3F4F6]">
              <label className="flex items-center gap-2 text-[10px] font-bold text-[#111827] uppercase tracking-widest mb-3">
                <ChevronRight size={14} className="text-[#1A1A1A]" /> Next Steps
              </label>
              <ul className="space-y-2">
                {(() => {
                  const steps = [];
                  if (context.phase === 'BEFORE APPOINTMENT') {
                    steps.push("Verify signer identity requirements");
                    steps.push("Confirm appointment location");
                    steps.push("Check state-specific fee limits");
                  } else if (context.phase === 'DURING SIGNING') {
                    steps.push("Check ID for expiration/validity");
                    steps.push("Administer oath or affirmation");
                    if (context.journalStatus !== 'completed') steps.push("Complete journal entry");
                    steps.push("Affix notary seal correctly");
                  } else if (context.phase === 'AFTER SIGNING') {
                    if (context.journalStatus !== 'completed') steps.push("Finalize journal entry");
                    steps.push("Collect and record notary fee");
                    steps.push("Provide copy to signer");
                  }
                  return steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-[#4B5563] leading-tight">
                      <div className="w-1 h-1 rounded-full bg-[#1A1A1A] mt-1.5 flex-shrink-0" />
                      {step}
                    </li>
                  ));
                })()}
              </ul>
            </section>
          </div>

          <div className="pt-6 border-t border-[#E5E7EB]">
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 flex gap-3">
              <Info className="text-amber-600 flex-shrink-0" size={18} />
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Guardian is an assistant. Always exercise your own professional judgment and verify with state statutes.
              </p>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative">
        {/* Journal Draft Modal */}
        {showJournalDraft && (
          <div className="absolute inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-[#E5E7EB]"
            >
              <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F9FAFB]">
                <h2 className="font-bold text-sm uppercase tracking-widest">Draft Journal Entry</h2>
                <button onClick={() => setShowJournalDraft(false)} className="text-[#9CA3AF] hover:text-[#1A1A1A]">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#6B7280] uppercase mb-1">Date</label>
                    <input 
                      type="date" 
                      value={journalDraft.date}
                      onChange={(e) => setJournalDraft({...journalDraft, date: e.target.value})}
                      className="w-full bg-[#F3F4F6] border-none rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#6B7280] uppercase mb-1">Time</label>
                    <input 
                      type="text" 
                      value={journalDraft.time}
                      onChange={(e) => setJournalDraft({...journalDraft, time: e.target.value})}
                      className="w-full bg-[#F3F4F6] border-none rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#6B7280] uppercase mb-1">Signer Name</label>
                  <input 
                    type="text" 
                    value={journalDraft.signerName}
                    onChange={(e) => setJournalDraft({...journalDraft, signerName: e.target.value})}
                    className="w-full bg-[#F3F4F6] border-none rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#6B7280] uppercase mb-1">Act Type</label>
                    <input 
                      type="text" 
                      value={journalDraft.type}
                      onChange={(e) => setJournalDraft({...journalDraft, type: e.target.value})}
                      className="w-full bg-[#F3F4F6] border-none rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#6B7280] uppercase mb-1">Fee</label>
                    <input 
                      type="text" 
                      value={journalDraft.fee}
                      onChange={(e) => setJournalDraft({...journalDraft, fee: e.target.value})}
                      placeholder="$0.00"
                      className="w-full bg-[#F3F4F6] border-none rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="p-6 bg-[#F9FAFB] border-t border-[#E5E7EB] flex gap-3">
                <button 
                  onClick={() => setShowJournalDraft(false)}
                  className="flex-1 py-2 text-sm font-bold text-[#4B5563] hover:text-[#1A1A1A] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    updateContext({ journalStatus: 'started' });
                    setShowJournalDraft(false);
                  }}
                  className="flex-1 py-2 bg-[#1A1A1A] text-white text-sm font-bold rounded-lg hover:bg-black transition-colors"
                >
                  Save Draft
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Header */}
        <header className="h-16 border-b border-[#E5E7EB] bg-white flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-[#F3F4F6] rounded-lg transition-colors text-[#4B5563]"
            >
              <Settings2 size={20} />
            </button>
            <div className="h-4 w-[1px] bg-[#E5E7EB]" />
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                context.state ? "bg-emerald-500" : "bg-amber-500"
              )} />
              <span className="text-sm font-medium text-[#4B5563]">
                {context.state ? `Active Session: ${US_STATES.find(s => s.code === context.state)?.name || context.state}` : "Jurisdiction Required"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#6B7280]">
            <span className="px-2 py-1 bg-[#F3F4F6] rounded-md">{context.phase}</span>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex w-full",
                  m.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div className={cn(
                  "max-w-[85%] rounded-2xl p-4 shadow-sm",
                  m.role === 'user' 
                    ? "bg-[#1A1A1A] text-white rounded-tr-none" 
                    : "bg-white border border-[#E5E7EB] text-[#1A1A1A] rounded-tl-none"
                )}>
                  {m.role === 'assistant' ? (
                    renderAssistantMessage(m.content as GuardianResponse)
                  ) : (
                    <p className="text-sm leading-relaxed">{m.content as string}</p>
                  )}
                  <div className={cn(
                    "text-[10px] mt-2 opacity-50",
                    m.role === 'user' ? "text-right" : "text-left"
                  )}>
                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-white border border-[#E5E7EB] rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#6B7280] rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-[#6B7280] rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-[#6B7280] rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white border-t border-[#E5E7EB]">
          <div className="max-w-4xl mx-auto relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={context.state ? "Ask for guidance, checklists, or templates..." : "Please select a state in the sidebar first..."}
              disabled={!context.state || isLoading}
              className="w-full bg-[#F3F4F6] border-none rounded-2xl pl-6 pr-14 py-4 text-sm focus:ring-2 focus:ring-[#1A1A1A] outline-none transition-all disabled:opacity-50"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || !context.state || isLoading}
              className="absolute right-2 top-2 bottom-2 w-10 bg-[#1A1A1A] text-white rounded-xl flex items-center justify-center hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            <button 
              onClick={() => handleSend("Generate a pre-appointment checklist")}
              disabled={!context.state || isLoading}
              className="text-[11px] font-semibold text-[#6B7280] hover:text-[#1A1A1A] flex items-center gap-1 transition-colors uppercase tracking-wider"
            >
              <CheckCircle2 size={12} /> Checklist
            </button>
            <button 
              onClick={() => handleSend("What are the ID requirements?")}
              disabled={!context.state || isLoading}
              className="text-[11px] font-semibold text-[#6B7280] hover:text-[#1A1A1A] flex items-center gap-1 transition-colors uppercase tracking-wider"
            >
              <Shield size={12} /> ID Rules
            </button>
            <button 
              onClick={() => handleSend("Draft a journal entry for this appointment")}
              disabled={!context.state || isLoading}
              className="text-[11px] font-semibold text-[#6B7280] hover:text-[#1A1A1A] flex items-center gap-1 transition-colors uppercase tracking-wider"
            >
              <BookOpen size={12} /> Journal Draft
            </button>
            <button 
              onClick={() => handleSend("Flag potential compliance risks")}
              disabled={!context.state || isLoading}
              className="text-[11px] font-semibold text-[#6B7280] hover:text-[#1A1A1A] flex items-center gap-1 transition-colors uppercase tracking-wider"
            >
              <AlertTriangle size={12} /> Risk Check
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
